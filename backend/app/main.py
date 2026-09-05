from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import create_db_and_tables
import app.models.wallpaper  # noqa: F401
from app.api.v1 import wallpapers as wallpapers_router
from app.api.v1 import admin as admin_router

# ── Rate limiter global ───────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── Caché — Redis con fallback en memoria ─────────────────────────────────────
async def init_cache():
    try:
        from redis import asyncio as aioredis
        from fastapi_cache import FastAPICache
        from fastapi_cache.backends.redis import RedisBackend

        redis = aioredis.from_url(settings.redis_url, encoding="utf8")
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="yohawallpaper:")
        print("✓ Redis cache conectado")
    except Exception as exc:
        try:
            from fastapi_cache import FastAPICache
            from fastapi_cache.backends.inmemory import InMemoryBackend

            FastAPICache.init(InMemoryBackend(), prefix="yohawallpaper:")
            print(f"⚠ Redis no disponible ({exc.__class__.__name__}) — usando caché en memoria")
        except Exception:
            print("⚠ fastapi-cache2 no instalado — caché desactivado")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    await init_cache()
    print(f"✓ YohaWallpaper API lista [{settings.app_env.upper()}]")
    yield
    print("API detenida.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(wallpapers_router.router, prefix="/api/v1")
app.include_router(admin_router.router, prefix="/api/v1")


@app.get("/health", tags=["Sistema"])
async def health(request: Request):
    return {
        "status": "ok",
        "app":    settings.app_name,
        "version": settings.app_version,
    }


@app.get("/", tags=["Sistema"])
async def root():
    return {"message": f"Bienvenido a {settings.app_name}", "docs": "/docs"}