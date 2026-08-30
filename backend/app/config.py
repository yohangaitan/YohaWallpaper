from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str    = "YohaWallpaper API"
    app_version: str = "0.1.0"
    app_env: str     = "development"

    database_url: str      = "sqlite:///./yohawallpaper.db"
    wallhaven_api_key: str = ""
    pexels_api_key: str    = ""
    app_cors_origins: str  = "http://localhost:5173"

    # Redis — si no está disponible, se usa caché en memoria
    redis_url: str         = "redis://localhost:6379"

    # TTL de caché en segundos
    cache_ttl_wallpapers:  int = 300    # 5 min  — lista paginada
    cache_ttl_categories:  int = 3600   # 1 hora — categorías (cambian poco)
    cache_ttl_detail:      int = 600    # 10 min — detalle de wallpaper

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.app_cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()