from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from core.config import settings
from core.routes import router

BASE_DIR = Path(__file__).parent.parent

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
    )
    app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
    app.include_router(router)
    return app