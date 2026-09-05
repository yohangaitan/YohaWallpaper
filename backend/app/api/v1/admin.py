from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from app.api.deps import SessionDep
from app.config import settings
from app.models.wallpaper import Wallpaper, WallpaperStatus

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not settings.admin_token or credentials.credentials != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing admin token.")
    return credentials.credentials

@router.get("/verify")
async def verify(token: str = Depends(verify_token)):
    return {"status": "ok"}

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
