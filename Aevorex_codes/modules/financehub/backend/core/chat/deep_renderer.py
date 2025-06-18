# -*- coding: utf-8 -*-
"""deep_renderer.py – FinanceHub Prompt-Pipeline Fázis 5

Tokenenként streameli a részletes („Deep”) választ a kiválasztott nagy modellből.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator, Dict, Any

from modules.financehub.backend.core.chat.model_selector import ModelSelector

logger = logging.getLogger(__name__)

__all__ = ["DeepRenderer"]


class DeepRenderer:
    """Stream detailed answer tokens using the model selected for deep usage."""

    def __init__(self, model_selector: ModelSelector, override_model: str | None = None):
        self.model_selector = model_selector
        self.override_model = override_model

    async def stream(self, prompt: str, metadata: Dict[str, Any] | None = None) -> AsyncGenerator[str, None]:
        client = await self.model_selector.get_client("deep", self.override_model)
        first_at = None
        async for token in client.stream(prompt, metadata or {}):
            if first_at is None:
                import time
                first_at = time.perf_counter()
                from .metrics_hook import record_first_token
                record_first_token("deep", client.model_id, ms=0)
            yield token
        if first_at is not None:
            import time
            latency_ms = (time.perf_counter() - first_at) * 1000
            from .metrics_hook import record_first_token
            record_first_token("deep", client.model_id, latency_ms) 