import json
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, func, col

from app.api.deps import SessionDep, SettingsDep
from app.config import settings
from app.models.wallpaper import Category, MediaType, Source, Wallpaper, WallpaperStatus
from app.schemas.wallpaper import IngestResult, PaginatedWallpapers, WallpaperIngest, WallpaperOut
from app.services.fetcher import PexelsVideoClient, WallhavenClient

# Importaciones de caché y rate limit — con fallback si no están instaladas
try:
    from fastapi_cache.decorator import cache as _cache
    _CACHE_OK = True
except ImportError:
    _CACHE_OK = False
    def _cache(**_kw):
        def decorator(fn): return fn
        return decorator

try:
    from app.main import limiter as _limiter
    _LIMIT_OK = True
except ImportError:
    _LIMIT_OK = False
    class _FakeLimiter:
        def limit(self, *a, **kw):
            def decorator(fn): return fn
            return decorator
    _limiter = _FakeLimiter()

router = APIRouter(prefix="/wallpapers", tags=["Wallpapers"])

# ── Resolución → ancho mínimo en píxeles ─────────────────────────────────────
RESOLUTION_MAP: dict[str, int] = {
    "hd":  1280,
    "fhd": 1920,
    "2k":  2560,
    "4k":  3840,
}

# ── Categorías ────────────────────────────────────────────────────────────────
@router.get("/categories")
@_cache(expire=settings.cache_ttl_categories)
@_limiter.limit("120/minute")
async def list_categories(request: Request, session: SessionDep):
    cats = session.exec(select(Category).order_by(Category.id)).all()
    return [{"id": c.id, "slug": c.slug, "name": c.name, "icon": c.icon} for c in cats]


# ── Lista paginada con filtros avanzados ──────────────────────────────────────
@router.get("", response_model=PaginatedWallpapers)
@_cache(expire=settings.cache_ttl_wallpapers)
@_limiter.limit("60/minute")
async def list_wallpapers(
    request:     Request,
    session:     SessionDep,
    # Filtros básicos
    media_type:  Optional[MediaType] = Query(default=None),
    category_id: Optional[int]       = Query(default=None),
    source:      Optional[Source]    = Query(default=None),
    q:           Optional[str]       = Query(default=None, min_length=1, max_length=100),
    # Filtros de resolución
    resolution:  Optional[Literal["hd", "fhd", "2k", "4k"]] = Query(
                     default=None,
                     description="hd=1280p · fhd=1080p · 2k=1440p · 4k=2160p"),
    min_width:   Optional[int] = Query(default=None, ge=1, description="Ancho mínimo en px"),
    max_width:   Optional[int] = Query(default=None, ge=1, description="Ancho máximo en px"),
    min_height:  Optional[int] = Query(default=None, ge=1, description="Alto mínimo en px"),
    # Paginación
    sort:        Optional[Literal["default", "popular", "trending"]] = Query(default="default"),
    page:        int = Query(default=1,  ge=1),
    per_page:    int = Query(default=24, ge=1, le=100),
):
    query = select(Wallpaper).where(Wallpaper.status == WallpaperStatus.ACTIVE)

    # Filtros básicos
    if media_type:  query = query.where(Wallpaper.media_type  == media_type)
    if category_id: query = query.where(Wallpaper.category_id == category_id)
    if source:      query = query.where(Wallpaper.source       == source)
    if q:
        q_clean = q.lstrip('#')
        query = query.where(
            col(Wallpaper.title).contains(q_clean) |
            col(Wallpaper.tags).contains(q_clean)
        )

    # Resolución predefinida (tiene prioridad sobre min_width manual)
    effective_min_width = min_width
    if resolution:
        effective_min_width = RESOLUTION_MAP[resolution]

    if effective_min_width:
        query = query.where(Wallpaper.width >= effective_min_width)
    if max_width:
        query = query.where(Wallpaper.width <= max_width)
    if min_height:
        query = query.where(Wallpaper.height >= min_height)

    total    = session.exec(select(func.count()).select_from(query.subquery())).one()
    if sort == "popular":
        order = col(Wallpaper.view_count).desc()
    elif sort == "trending":
        order = col(Wallpaper.id).desc()
    else:
        order = col(Wallpaper.download_count).desc()
    items_db = session.exec(
        query.order_by(order)
             .offset((page - 1) * per_page)
             .limit(per_page)
    ).all()

    return PaginatedWallpapers(
        items       = [WallpaperOut(**{**w.model_dump(), 'tags': json.loads(w.tags) if isinstance(w.tags, str) else w.tags}, resolution_label=w.resolution_label) for w in items_db],
        total       = total,
        page        = page,
        per_page    = per_page,
        total_pages = max(1, -(-total // per_page)),
    )


# ── Detalle de wallpaper ──────────────────────────────────────────────────────
@router.get("/{wallpaper_id}", response_model=WallpaperOut)
@_cache(expire=settings.cache_ttl_detail)
@_limiter.limit("120/minute")
async def get_wallpaper(request: Request, wallpaper_id: int, session: SessionDep):
    w = session.get(Wallpaper, wallpaper_id)
    if not w or w.status != WallpaperStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Wallpaper no encontrado.")
    w.view_count += 1
    session.add(w)
    session.commit()
    session.refresh(w)
    return WallpaperOut(**{**w.model_dump(), 'tags': json.loads(w.tags) if isinstance(w.tags, str) else w.tags}, resolution_label=w.resolution_label)


# ── Ingesta manual (protegida con rate limit estricto) ────────────────────────
@router.post("/ingest", response_model=IngestResult, status_code=status.HTTP_201_CREATED)
@_limiter.limit("5/minute")
async def ingest_wallpapers(
    request:     Request,
    session:     SessionDep,
    settings_d:  SettingsDep,
    query:       str    = Query(...),
    source:      Source = Query(default=Source.WALLHAVEN),
    pages:       int    = Query(default=1, ge=1, le=5),
    category_id: Optional[int] = Query(default=None),
):
    result = IngestResult()
    for page in range(1, pages + 1):
        try:
            if source == Source.WALLHAVEN:
                if not settings_d.wallhaven_api_key:
                    raise HTTPException(400, "WALLHAVEN_API_KEY no configurada.")
                with WallhavenClient(settings_d.wallhaven_api_key) as client:
                    items: list[WallpaperIngest] = client.search(query=query, page=page)
            elif source == Source.PEXELS:
                if not settings_d.pexels_api_key:
                    raise HTTPException(400, "PEXELS_API_KEY no configurada.")
                with PexelsVideoClient(settings_d.pexels_api_key) as client:
                    items = client.search(query=query, page=page)
            else:
                raise HTTPException(400, f"Fuente '{source}' no soportada.")
        except HTTPException:
            raise
        except Exception as exc:
            result.errors += 1
            result.message = str(exc)
            break

        for item in items:
            wp = Wallpaper(**item.model_dump())
            wp.category_id = category_id
            session.add(wp)
            try:
                session.commit()
                result.inserted += 1
            except IntegrityError:
                session.rollback()
                result.skipped += 1

    result.message = (
        f"{result.inserted} insertados, "
        f"{result.skipped} duplicados, "
        f"{result.errors} errores."
    )
    return result


# (después del endpoint /ingest)
import httpx
from fastapi.responses import StreamingResponse

@router.get("/{wallpaper_id}/download")
@_limiter.limit("30/minute")
async def download_wallpaper(request: Request, wallpaper_id: int, session: SessionDep):
    """
    Proxy de descarga: obtiene la imagen de Wallhaven y la sirve
    con Content-Disposition: attachment para forzar descarga real.
    También incrementa download_count.
    """
    w = session.get(Wallpaper, wallpaper_id)
    if not w or w.status != WallpaperStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Wallpaper no encontrado.")

    # Incrementar contador de descargas
    w.download_count += 1
    session.add(w)
    session.commit()

    safe_title = "".join(c if c.isalnum() or c in "._- " else "_" for c in (w.title or "wallpaper"))
    filename   = f"{safe_title}.{w.file_format.value}"

    # Determinar content-type
    ct_map = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "png": "image/png",
        "mp4": "video/mp4", "webm": "video/webm",
    }
    content_type = ct_map.get(w.file_format.value, "application/octet-stream")

    async def stream_from_source():
        async with httpx.AsyncClient(
            headers={"Referer": "https://wallhaven.cc/"},
            timeout=60,
            follow_redirects=True,
        ) as client:
            async with client.stream("GET", w.url_full) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    yield chunk

    return StreamingResponse(
        stream_from_source(),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )