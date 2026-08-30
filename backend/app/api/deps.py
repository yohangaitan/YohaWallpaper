from typing import Annotated
from fastapi import Depends
from sqlmodel import Session
from app.database import get_session
from app.config import Settings, get_settings

SessionDep  = Annotated[Session,  Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
