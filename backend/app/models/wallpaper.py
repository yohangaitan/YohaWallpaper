import enum
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Column, Index, JSON, Text
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, Relationship, SQLModel


def use_values(enum_class):
    return [e.value for e in enum_class]


class MediaType(str, enum.Enum):
    STATIC   = "static"
    ANIMATED = "animated"


class FileFormat(str, enum.Enum):
    JPG  = "jpg"
    JPEG = "jpeg"
    PNG  = "png"
    MP4  = "mp4"
    WEBM = "webm"


class Source(str, enum.Enum):
    WALLHAVEN = "wallhaven"
    PEXELS    = "pexels"
    UNSPLASH  = "unsplash"
    PIXABAY   = "pixabay"
    MANUAL    = "manual"


class WallpaperStatus(str, enum.Enum):
    ACTIVE  = "active"
    HIDDEN  = "hidden"
    PENDING = "pending"


class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id:   Optional[int] = Field(default=None, primary_key=True)
    slug: str           = Field(unique=True, max_length=64, index=True)
    name: str           = Field(max_length=128)
    icon: Optional[str] = Field(default=None, max_length=64)

    wallpapers: List["Wallpaper"] = Relationship(back_populates="category_rel")


class Wallpaper(SQLModel, table=True):
    __tablename__ = "wallpapers"

    id: Optional[int] = Field(default=None, primary_key=True)

    external_id: str = Field(max_length=128)
    source: Source   = Field(sa_column=Column(SAEnum(Source, values_callable=use_values), nullable=False))

    title: str            = Field(max_length=255)
    media_type: MediaType = Field(sa_column=Column(SAEnum(MediaType, values_callable=use_values), nullable=False))
    file_format: FileFormat = Field(sa_column=Column(SAEnum(FileFormat, values_callable=use_values), nullable=False))

    url_full:    str           = Field(sa_column=Column(Text, nullable=False))
    url_preview: str           = Field(sa_column=Column(Text, nullable=False))
    url_page:    Optional[str] = Field(default=None, sa_column=Column(Text))

    width:            int             = Field()
    height:           int             = Field()
    duration_seconds: Optional[float] = Field(default=None)

    category_id:  Optional[int]      = Field(default=None, foreign_key="categories.id", index=True)
    category_rel: Optional[Category] = Relationship(back_populates="wallpapers")
    tags: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, server_default="[]"),
    )

    status: WallpaperStatus = Field(
        default=WallpaperStatus.ACTIVE,
        sa_column=Column(SAEnum(WallpaperStatus, values_callable=use_values), nullable=False,
                         server_default=WallpaperStatus.ACTIVE.value),
    )

    view_count:     int = Field(default=0)
    download_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("uq_source_external",    "source", "external_id", unique=True),
        Index("idx_media_type_status", "media_type", "status"),
        Index("idx_category_status",   "category_id", "status"),
        Index("idx_downloads_desc",    "download_count"),
    )

    @property
    def resolution_label(self) -> str:
        if self.width >= 3840: return "4K"
        if self.width >= 2560: return "2K"
        if self.width >= 1920: return "Full HD"
        if self.width >= 1280: return "HD"
        return f"{self.width}x{self.height}"
