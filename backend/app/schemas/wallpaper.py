from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.wallpaper import FileFormat, MediaType, Source, WallpaperStatus


class WallpaperOut(BaseModel):
    id:               int
    external_id:      str
    source:           Source
    media_type:       MediaType
    file_format:      FileFormat
    title:            str
    url_full:         str
    url_preview:      str
    url_page:         Optional[str] = None
    width:            int
    height:           int
    resolution_label: str
    duration_seconds: Optional[float] = None
    tags:             list[str]
    category_id:      Optional[int]  = None
    status:           WallpaperStatus
    view_count:       int
    download_count:   int
    created_at:       datetime

    model_config = {"from_attributes": True}


class PaginatedWallpapers(BaseModel):
    items:       list[WallpaperOut]
    total:       int
    page:        int
    per_page:    int
    total_pages: int


class WallpaperIngest(BaseModel):
    external_id:      str            = Field(max_length=128)
    source:           Source
    media_type:       MediaType
    file_format:      FileFormat
    title:            str            = Field(max_length=255)
    url_full:         str
    url_preview:      str
    url_page:         Optional[str]  = None
    width:            int            = Field(gt=0)
    height:           int            = Field(gt=0)
    duration_seconds: Optional[float] = Field(default=None, ge=0)
    tags:             list[str]      = []
    category_id:      Optional[int]  = None


class IngestResult(BaseModel):
    inserted: int = 0
    skipped:  int = 0
    errors:   int = 0
    message:  str = ""
