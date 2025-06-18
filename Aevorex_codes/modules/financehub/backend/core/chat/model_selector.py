# -*- coding: utf-8 -*-
"""ModelSelector – picks an LLM from the central catalogue.

Phase-1 implementation: very thin wrapper that (1) validates a requested
model against ``MODEL_CATALOGUE`` and (2) exposes a `select()` method which
returns the preferred model (override > default mapping).
"""

from __future__ import annotations

from typing import Optional, Dict
import random

from modules.shared.ai.model_catalogue import MODEL_CATALOGUE  # type: ignore

__all__ = ["ModelSelector"]


class ModelSelector:
    """Simple selector with fallback chain.

    The logic will later incorporate cost/latency profiles and automatic
    A/B-testing, but for now it supports:

    1. *override_model* – exact model ID requested by frontend or endpoint.
    2. *preferred_family* – e.g. "gemini" or "openai-gpt".
    3. Default – the first enabled model in the catalogue.
    """

    def __init__(self, *, override_model: Optional[str] = None, preferred_family: Optional[str] = None) -> None:
        self.override_model = override_model
        self.preferred_family = preferred_family
        self._catalogue_by_id: Dict[str, dict] = {m["id"]: m for m in MODEL_CATALOGUE}

    # ------------------------------------------------------------------
    # Public helper
    # ------------------------------------------------------------------
    def is_valid(self, model_id: str) -> bool:
        return model_id in self._catalogue_by_id and self._catalogue_by_id[model_id].get("enabled", True)

    # ------------------------------------------------------------------
    def select(self) -> str:
        """Return a *valid* model ID according to preference chain."""
        if self.override_model and self.is_valid(self.override_model):
            return self.override_model

        if self.preferred_family:
            family_candidates = [m["id"] for m in MODEL_CATALOGUE if m["id"].startswith(self.preferred_family) and m.get("enabled", True)]
            if family_candidates:
                return random.choice(family_candidates)

        # Fallback: first enabled model
        for m in MODEL_CATALOGUE:
            if m.get("enabled", True):
                return m["id"]

        # Theoretically unreachable – but keep mypy happy
        raise RuntimeError("MODEL_CATALOGUE contains no enabled models") 