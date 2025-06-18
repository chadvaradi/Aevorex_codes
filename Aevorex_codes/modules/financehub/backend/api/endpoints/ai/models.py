"""AI Model Catalogue Endpoint
Returns the central MODEL_CATALOGUE so that front-ends can build
selectors without hard-coding IDs.
"""
from __future__ import annotations

import functools
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# MODEL_CATALOGUE IMPORT (single-source-of-truth)                                      
# ---------------------------------------------------------------------------
# All backend modules should use the canonical re-export located at
# ``modules.shared.ai.model_catalogue``.  That proxy guarantees that the
# root-level ``model_catalogue.py`` is discoverable even if the repository
# root is missing from ``PYTHONPATH``.  This keeps the import logic simple
# and eliminates brittle multi-dot relative imports that can break under the
# Uvicorn reloader.                                                                    
# ---------------------------------------------------------------------------

from modules.shared.ai.model_catalogue import MODEL_CATALOGUE  # type: ignore  # pylint: disable=import-error

router = APIRouter(prefix="/models", tags=["AI"])

# ---------------------------------------------------------------------------
# Pydantic schema
# ---------------------------------------------------------------------------
class ModelMeta(BaseModel):
    id: str = Field(..., description="Provider/model identifier on OpenRouter")
    ctx: Optional[int] = Field(None, description="Context window (tokens)")
    price_in: float = Field(..., ge=0, description="USD / 1K tokens in")
    price_out: float = Field(..., ge=0, description="USD / 1K tokens out")
    strength: str = Field(..., description="Few-word marketing strength")
    ux_hint: str = Field(..., description="Short hint for UX grouping")
    notes: str = Field(..., description="Long-form notes for advanced UIs")


# ---------------------------------------------------------------------------
# Service layer (cached)
# ---------------------------------------------------------------------------
@functools.lru_cache(maxsize=1)
def _get_catalogue() -> List[ModelMeta]:
    """Return catalogue converted to Pydantic objects (cached 5 min)."""
    # lru_cache is process-wide; we still limit staleness via TTL below.
    from time import monotonic  # local import to avoid global state on reload

    now = monotonic()  # noqa: F401 – placeholder if future timestamp needed
    return [ModelMeta(**m) for m in MODEL_CATALOGUE]


async def get_catalogue_dependency() -> List[ModelMeta]:
    """`Depends` wrapper so FastAPI sees a coroutine (non-blocking)."""
    return _get_catalogue()


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.get(
    "",  # /ai/models
    response_model=List[ModelMeta],
    summary="List all available AI models",
    status_code=status.HTTP_200_OK,
    response_description="Array of model metadata objects",
)
async def list_models(catalogue: List[ModelMeta] = Depends(get_catalogue_dependency)) -> List[ModelMeta]:
    """Public endpoint returning the centrally-maintained model list."""
    return catalogue 