from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select, func
from sqlalchemy.exc import IntegrityError
from typing import Optional
import httpx

from app.api.deps import SessionDep
from app.config import settings
from app.models.wallpaper import Wallpaper, WallpaperStatus, FileFormat, MediaType, Source
from app.schemas.wallpaper import WallpaperIngest

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()

MIN_WIDTH = 1280  # calidad mínima aceptada

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not settings.admin_token or credentials.credentials != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")
    return credentials.credentials

# ── Verify ────────────────────────────────────────────────────────────────────
@router.get("/verify")
async def verify(token: str = Depends(verify_token)):
    return {"status": "ok"}

# ── Delete one ────────────────────────────────────────────────────────────────
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

# ── Delete all ────────────────────────────────────────────────────────────────
@router.delete("/wallpapers")
async def delete_all_wallpapers(
    session: SessionDep,
    token: str = Depends(verify_token),
    except_ids: str = Query(default="", description="Comma-separated IDs to keep"),
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

# ── Delete selected ───────────────────────────────────────────────────────────
@router.delete("/wallpapers/bulk")
async def delete_bulk(
    session: SessionDep,
    token: str = Depends(verify_token),
    ids: str = Query(..., description="Comma-separated IDs to delete"),
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

# ── Search Wallhaven (preview antes de importar) ──────────────────────────────
@router.get("/wallhaven/search")
async def wallhaven_search(
    q: str = Query(...),
    page: int = Query(default=1, ge=1),
    token: str = Depends(verify_token),
):
    if not settings.wallhaven_api_key:
        raise HTTPException(status_code=400, detail="WALLHAVEN_API_KEY not configured.")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            "https://wallhaven.cc/api/v1/search",
            headers={"X-API-Key": settings.wallhaven_api_key},
            params={
                "q": q,
                "categories": "111",
                "purity": "100",
                "sorting": "toplist",
                "page": page,
            }
        )
        r.raise_for_status()
        data = r.json()

    results = []
    for item in data.get("data", []):
        w, h = (int(x) for x in item.get("resolution", "0x0").split("x"))
        results.append({
            "id":          item["id"],
            "url_preview": item.get("thumbs", {}).get("large", ""),
            "url_full":    item.get("path", ""),
            "url_page":    item.get("url", ""),
            "width":       w,
            "height":      h,
            "resolution":  item.get("resolution", ""),
            "meets_quality": w >= MIN_WIDTH,
        })

    return {
        "results": results,
        "total": data.get("meta", {}).get("total", 0),
        "current_page": data.get("meta", {}).get("current_page", 1),
        "last_page": data.get("meta", {}).get("last_page", 1),
    }

# ── Import selected from Wallhaven ────────────────────────────────────────────
@router.post("/wallhaven/import")
async def wallhaven_import(
    session: SessionDep,
    token: str = Depends(verify_token),
    wallpaper_ids: str = Query(..., description="Comma-separated Wallhaven IDs"),
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

            # Filtro de calidad
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
                title        = f"Wallpaper {item['id']}",
                url_full     = item.get("path", ""),
                url_preview  = item.get("thumbs", {}).get("large", ""),
                url_page     = item.get("url", ""),
                width        = w,
                height       = h,
                tags         = str(tags),
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
        "imported": imported,
        "skipped_quality": skipped_quality,
        "skipped_duplicate": skipped_duplicate,
        "message": f"{imported} imported, {skipped_quality} rejected (quality), {skipped_duplicate} already existed."
    }
