# -*- coding: utf-8 -*-
"""rapid_renderer.py – FinanceHub Prompt-Pipeline Fázis 2

Innen streameljük vissza a "Rapid" TL;DR blokkot Gemini Flash modellen keresztül.
Vékony réteg az LLM client köré, hogy kompatibilis legyen a ChatService-szel.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import AsyncGenerator, Dict, Any
import httpx

from modules.financehub.backend.config import settings
from modules.financehub.backend.core.chat.model_selector import ModelSelector

logger = logging.getLogger(__name__)

__all__ = ["RapidRenderer"]

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class RapidRenderer:
    """Stream a short answer (~600 tokens budget)."""

    def __init__(self, model_selector: ModelSelector) -> None:
        self.model_selector = model_selector
        self.model_id = model_selector.select()
        self._api_key = getattr(settings.API_KEYS, "OPENROUTER", None)

    # ------------------------------------------------------------------
    async def stream(self, prompt: str, metadata: Dict[str, Any] | None = None) -> AsyncGenerator[str, None]:  # noqa: D401
        """Stream the rapid LLM response token-by-token and record total latency.

        The function fetches the full response (non-stream mode for now) to keep
        the transport simple, then splits it into whitespace-separated tokens so
        the upstream SSE generator can yield them incrementally.  End-to-end
        latency (from request send to last token ready) is measured and pushed
        to Prometheus via ``record_rapid_latency``.
        """

        import time

        start_ts = time.perf_counter()

        if not self._api_key:
            # Offline / dev fallback – do *not* record latency (would skew data)
            fallback = "Sajnálom, az AI összefoglaló jelenleg nem elérhető fejlesztői módban."
            for tok in re.findall(r"\S+\s*", fallback):
                yield tok
            return

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "HTTP-Referer": "https://stocks.aevorex.com",
            "X-Title": "Aevorex-FinBot-FastAPI",
        }
        payload = {
            "model": self.model_id,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 600,
            "temperature": 0.7,
            "stream": False,  # Simpler: fetch full then split for now
        }
        async with httpx.AsyncClient(http2=True, timeout=30) as client:
            resp = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                fallback = "Az AI szolgáltatás nem elérhető (Rapid mód)."
                for tok in re.findall(r"\S+\s*", fallback):
                    yield tok
                return
            data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"].strip()
        except Exception:
            content = "[Hiba]"  # minimal
        for tok in re.findall(r"\S+\s*", content):
            yield tok

        # --- Metrics -----------------------------------------------------
        try:
            elapsed_ms = (time.perf_counter() - start_ts) * 1000
            from .metrics_hook import record_rapid_latency

            record_rapid_latency(model=self.model_id, ms=elapsed_ms)
        except Exception:  # pragma: no cover – metrics are best-effort
            pass

    async def stream_token(self, prompt: str, metadata: Dict[str, Any] | None = None) -> AsyncGenerator[str, None]:
        """Wrapper that yields the token text (string). Later we may wrap into SSE JSON here."""
        client = await self.model_selector.get_client("rapid", self.model_id)
        first_at = None
        async for tok in client.stream(prompt, metadata or {}):
            if first_at is None:
                import time, math
                first_at = time.perf_counter()
                from .metrics_hook import record_first_token
                record_first_token("rapid", self.model_id, ms=0)  # placeholder, set later
            yield tok
        # after stream end, record full latency
        if first_at is not None:
            import time
            latency_ms = (time.perf_counter() - first_at) * 1000
            from .metrics_hook import record_first_token
            record_first_token("rapid", self.model_id, latency_ms)
        await asyncio.sleep(0) 