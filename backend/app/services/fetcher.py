"""
services/fetcher.py
--------------------
Clientes para consumir las APIs externas (Wallhaven, Pexels).
Cada cliente devuelve instancias de WallpaperIngest listas para persistir.
La lógica de guardado en DB vive en el endpoint/router, no aquí.
"""

from dataclasses import dataclass, field
from typing import Literal

import httpx

from app.models.wallpaper import FileFormat, MediaType, Source
from app.schemas.wallpaper import WallpaperIngest


# ─── Cliente HTTP Base ──────────────────────────────────────────────────────────

class BaseAPIClient:
    """Cliente HTTP reutilizable con timeout y manejo de errores base."""

    def __init__(self, base_url: str, headers: dict[str, str]):
        self._client = httpx.Client(base_url=base_url, headers=headers, timeout=60.0)

    def _get(self, endpoint: str, params: dict | None = None) -> dict:
        response = self._client.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# ─── Wallhaven (Estáticos) ──────────────────────────────────────────────────────

class WallhavenClient(BaseAPIClient):
    """API de Wallhaven — wallpapers estáticos en alta resolución."""

    def __init__(self, api_key: str):
        super().__init__(
            base_url="https://wallhaven.cc/api/v1",
            headers={"X-API-Key": api_key},
        )

    def search(
        self,
        query: str,
        categories: str = "111",   # general|anime|people (bitmask)
        purity: str     = "100",   # SFW only
        sorting: str    = "toplist",
        page: int       = 1,
        per_page: int   = 24,
    ) -> list[WallpaperIngest]:
        data = self._get("/search", params={
            "q":          query,
            "categories": categories,
            "purity":     purity,
            "sorting":    sorting,
            "page":       page,
            "atleast":    "1920x1080",
        })
        return [self._normalize(item) for item in data.get("data", [])]

    def _normalize(self, item: dict) -> WallpaperIngest:
        w, h = (int(x) for x in item.get("resolution", "1920x1080").split("x"))
        tags = [t["name"] for t in item.get("tags", [])[:8]]
        ext  = item.get("path", ".jpg").rsplit(".", 1)[-1].lower()
        fmt  = FileFormat(ext) if ext in FileFormat._value2member_map_ else FileFormat.JPG

        return WallpaperIngest(
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
            tags         = tags,
        )


# ─── Pexels Video (Animados) ────────────────────────────────────────────────────

class PexelsVideoClient(BaseAPIClient):
    """API de Pexels — videos en loop para wallpapers animados."""

    def __init__(self, api_key: str):
        super().__init__(
            base_url="https://api.pexels.com",
            headers={"Authorization": api_key},
        )

    def search(
        self,
        query: str,
        orientation: str = "landscape",
        size: str        = "large",
        page: int        = 1,
        per_page: int    = 15,
    ) -> list[WallpaperIngest]:
        data = self._get("/videos/search", params={
            "query":       query,
            "orientation": orientation,
            "size":        size,
            "page":        page,
            "per_page":    per_page,
        })
        results = []
        for item in data.get("videos", []):
            dto = self._normalize(item)
            if dto:
                results.append(dto)
        return results

    def _normalize(self, item: dict) -> WallpaperIngest | None:
        files = sorted(item.get("video_files", []),
                       key=lambda f: f.get("width", 0), reverse=True)
        if not files:
            return None

        best     = files[0]
        raw_fmt  = best.get("file_type", "video/mp4").split("/")[-1].lower()
        fmt      = FileFormat(raw_fmt) if raw_fmt in FileFormat._value2member_map_ else FileFormat.MP4
        title    = item.get("url", "").rstrip("/").split("/")[-1].replace("-", " ").title()

        return WallpaperIngest(
            external_id      = str(item["id"]),
            source           = Source.PEXELS,
            media_type       = MediaType.ANIMATED,
            file_format      = fmt,
            title            = title or f"Video {item['id']}",
            url_full         = best.get("link", ""),
            url_preview      = item.get("image", ""),
            url_page         = item.get("url", ""),
            width            = best.get("width", 0),
            height           = best.get("height", 0),
            duration_seconds = float(item.get("duration", 0)),
            tags             = [],
        )
