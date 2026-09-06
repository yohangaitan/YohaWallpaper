from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
import httpx, json

from app.api.deps import SessionDep
from app.config import settings
from app.models.wallpaper import Wallpaper, WallpaperStatus, FileFormat, MediaType, Source

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()
MIN_WIDTH = 1280

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not settings.admin_token or credentials.credentials != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")
    return credentials.credentials

def make_title(tags: list, wh_id: str) -> str:
    if not tags:
        return f"Wallpaper {wh_id}"
    # Toma los primeros 2-3 tags significativos y forma un título
    skip = {'digital art', 'artwork', 'illustration', 'digital painting', 'fan art', 'wallpaper'}
    meaningful = [t for t in tags if t.lower() not in skip]
    parts = meaningful[:3] if meaningful else tags[:2]
    return " · ".join(p.title() for p in parts) if parts else f"Wallpaper {wh_id}"

# ── Verify ────────────────────────────────────────────────────────────────────
@router.get("/verify")
async def verify(token: str = Depends(verify_token)):
    return {"status": "ok"}

# ── Delete bulk — DEBE IR ANTES de /{wallpaper_id} ───────────────────────────
@router.delete("/wallpapers/bulk")
async def delete_bulk(
    session: SessionDep,
    token: str = Depends(verify_token),
    ids: str = Query(...),
):
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
    if not id_list:
        raise HTTPException(status_code=400, detail="No IDs provided.")
    wallpapers = session.exec(select(Wallpaper).where(Wallpaper.id.in_(id_list))).all()
    count = len(wallpapers)
    for w in wallpapers:
        session.delete(w)
    session.commit()
    return {"status": "deleted", "count": count}

# ── Delete all (con opción except) ───────────────────────────────────────────
@router.delete("/wallpapers")
async def delete_all(
    session: SessionDep,
    token: str = Depends(verify_token),
    except_ids: str = Query(default=""),
):
    keep_ids = [int(i) for i in except_ids.split(",") if i.strip().isdigit()]
    query = select(Wallpaper)
    if keep_ids:
        query = query.where(~Wallpaper.id.in_(keep_ids))
    wallpapers = session.exec(query).all()
    count = len(wallpapers)
    for w in wallpapers:
        session.delete(w)
    session.commit()
    return {"status": "deleted", "count": count}

# ── Delete one — VA DESPUÉS de /bulk y /wallpapers ───────────────────────────
@router.delete("/wallpapers/{wallpaper_id}")
async def delete_wallpaper(
    wallpaper_id: int,
    session: SessionDep,
    token: str = Depends(verify_token),
):
    w = session.get(Wallpaper, wallpaper_id)
    if not w:
        raise HTTPException(status_code=404, detail="Wallpaper not found.")
    session.delete(w)
    session.commit()
    return {"status": "deleted", "id": wallpaper_id}

# ── Search Wallhaven ──────────────────────────────────────────────────────────
@router.get("/wallhaven/search")
async def wallhaven_search(
    session: SessionDep,
    token: str = Depends(verify_token),
    q: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    sorting: str = Query(default="toplist"),
):
    if not settings.wallhaven_api_key:
        raise HTTPException(status_code=400, detail="WALLHAVEN_API_KEY not configured.")

    params = {
        "categories": "111",
        "purity": "100",
        "sorting": sorting if q.strip() else "random",
        "page": page,
    }
    if q.strip():
        params["q"] = q.strip()

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            "https://wallhaven.cc/api/v1/search",
            headers={"X-API-Key": settings.wallhaven_api_key},
            params=params,
        )
        r.raise_for_status()
        data = r.json()

    # Detectar cuáles ya están en la DB
    wh_ids = [item["id"] for item in data.get("data", [])]
    existing = set()
    if wh_ids:
        rows = session.exec(
            select(Wallpaper.external_id).where(Wallpaper.external_id.in_(wh_ids))
        ).all()
        existing = set(rows)

    results = []
    for item in data.get("data", []):
        w, h = (int(x) for x in item.get("resolution", "0x0").split("x"))
        results.append({
            "id":            item["id"],
            "url_preview":   item.get("thumbs", {}).get("large", ""),
            "width":         w,
            "height":        h,
            "resolution":    item.get("resolution", ""),
            "meets_quality": w >= MIN_WIDTH,
            "already_in_db": item["id"] in existing,
        })

    return {
        "results":      results,
        "total":        data.get("meta", {}).get("total", 0),
        "current_page": data.get("meta", {}).get("current_page", 1),
        "last_page":    data.get("meta", {}).get("last_page", 1),
    }

# ── Import selected ───────────────────────────────────────────────────────────
@router.post("/wallhaven/import")
async def wallhaven_import(
    session: SessionDep,
    token: str = Depends(verify_token),
    wallpaper_ids: str = Query(...),
    category_id: Optional[int] = Query(default=None),
):
    if not settings.wallhaven_api_key:
        raise HTTPException(status_code=400, detail="WALLHAVEN_API_KEY not configured.")

    ids = [i.strip() for i in wallpaper_ids.split(",") if i.strip()]
    imported, skipped_quality, skipped_duplicate = 0, 0, 0

    async with httpx.AsyncClient(
        headers={"X-API-Key": settings.wallhaven_api_key}, timeout=30
    ) as client:
        for wh_id in ids:
            try:
                r = await client.get(f"https://wallhaven.cc/api/v1/w/{wh_id}")
                r.raise_for_status()
                item = r.json().get("data", {})
            except Exception:
                skipped_quality += 1
                continue

            w, h = (int(x) for x in item.get("resolution", "0x0").split("x"))
            if w < MIN_WIDTH:
                skipped_quality += 1
                continue

            tags = [t["name"] for t in item.get("tags", [])[:8]]
            ext  = item.get("path", ".jpg").rsplit(".", 1)[-1].lower()
            fmt  = FileFormat(ext) if ext in FileFormat._value2member_map_ else FileFormat.JPG

            wp = Wallpaper(
                external_id  = item["id"],
                source       = Source.WALLHAVEN,
                media_type   = MediaType.STATIC,
                file_format  = fmt,
                title        = make_title(tags, item["id"]),
                url_full     = item.get("path", ""),
                url_preview  = item.get("thumbs", {}).get("large", ""),
                url_page     = item.get("url", ""),
                width        = w,
                height       = h,
                tags         = json.dumps(tags),  # JSON correcto
                status       = WallpaperStatus.ACTIVE,
                category_id  = category_id,
            )
            session.add(wp)
            try:
                session.commit()
                imported += 1
            except IntegrityError:
                session.rollback()
                skipped_duplicate += 1

    return {
        "imported":           imported,
        "skipped_quality":    skipped_quality,
        "skipped_duplicate":  skipped_duplicate,
        "message": f"{imported} imported, {skipped_quality} rejected (quality), {skipped_duplicate} already existed."
    }
