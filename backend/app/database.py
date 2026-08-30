import os
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings

def _build_engine():
    db_url = settings.database_url
    connect_args = {}
    if "sqlite" in db_url:
        # Convierte ruta relativa a absoluta desde la carpeta del archivo
        if "///./" in db_url:
            db_name = db_url.split("///./")[-1]
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            abs_path = os.path.join(base_dir, db_name)
            db_url = f"sqlite:///{abs_path}"
        connect_args["check_same_thread"] = False
    return create_engine(db_url, connect_args=connect_args, echo=not settings.is_production)

engine = _build_engine()

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
