"""
api/v1/animated.py
------------------
Endpoints para subir y eliminar wallpapers animados (MP4/WebM).
Los archivos se almacenan en Cloudflare R2.
"""

import json
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import select

from app.api.deps import SessionDep
from app.api.v1.admin import verify_token
from app.models.wallpaper import (
    FileFormat, MediaType, Source, Wallpaper, WallpaperStatus,
)
from app.services.r2 import delete_video, upload_video

router = APIRouter(prefix="/admin/animated", tags=["Animated"])

ALLOWED_TYPES = {
    "video/mp4":  FileFormat.MP4,
    "video/webm": FileFormat.WEBM,
}
MAX_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload")
async def upload_animated(
    session:     SessionDep,
    token:       str         = Depends(verify_token),
    file:        UploadFile  = File(...),
    title:       str         = Form(...),
    category_id: Optional[int] = Form(default=None),
    width:       int         = Form(...),
    height:      int         = Form(...),
    tags:        str         = Form(default=""),   # CSV: "cyberpunk,neon,city"
):
    # Validar tipo
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Allowed: {list(ALLOWED_TYPES.keys())}"
        )

    # Leer y validar tamaño
    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {MAX_SIZE_BYTES // 1024 // 1024}MB"
        )

    fmt       = ALLOWED_TYPES[file.content_type]
    unique_id = secrets.token_hex(8)
    ext       = fmt.value
    key       = f"animated/{unique_id}.{ext}"

    # Subir a R2
    try:
        url_full = upload_video(file_bytes, key, file.content_type)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Procesar tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # Guardar en DB
    wp = Wallpaper(
        external_id  = unique_id,
        source       = Source.MANUAL,
        media_type   = MediaType.ANIMATED,
        file_format  = fmt,
        title        = title.strip(),
        url_full     = url_full,
        url_preview  = url_full,   # mismo archivo como preview
        url_page     = "",
        width        = width,
        height       = height,
        tags         = json.dumps(tag_list),
        status       = WallpaperStatus.ACTIVE,
        category_id  = category_id,
    )
    session.add(wp)
    session.commit()
    session.refresh(wp)

    return {
        "id":       wp.id,
        "title":    wp.title,
        "url_full": wp.url_full,
        "message":  "Animated wallpaper uploaded successfully."
    }


@router.delete("/{wallpaper_id}")
async def delete_animated(
    wallpaper_id: int,
    session:      SessionDep,
    token:        str = Depends(verify_token),
):
    wp = session.get(Wallpaper, wallpaper_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Wallpaper not found.")
    if wp.media_type != MediaType.ANIMATED or wp.source != Source.MANUAL:
        raise HTTPException(status_code=400, detail="Not a manually uploaded animated wallpaper.")

    # Extraer key de R2 de la URL
    # url_full = "https://pub-xxx.r2.dev/animated/abc123.mp4"
    key = "/".join(wp.url_full.split("/")[-2:])
    try:
        delete_video(key)
    except RuntimeError:
        pass  # si ya no existe en R2, igual borramos de DB

    session.delete(wp)
    session.commit()
    return {"status": "deleted", "id": wallpaper_id}