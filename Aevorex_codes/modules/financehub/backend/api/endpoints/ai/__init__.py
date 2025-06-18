"""AI Endpoints Package
Central place to expose AI-related routes (model catalogue, etc.)
"""
from fastapi import APIRouter

# Import sub-routers (only model catalogue for now)
from .models import router as models_router  # noqa: E402

ai_router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

ai_router.include_router(models_router)

__all__ = ["ai_router"] 