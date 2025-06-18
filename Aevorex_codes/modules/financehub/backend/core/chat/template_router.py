# -*- coding: utf-8 -*-
"""template_router.py – FinanceHub Prompt-Pipeline Fázis 1

Feladat: kérés‐típus (QueryType) → sablonfájl nevének meghatározása, 
 + Redis alapú 60 s TTL gyorsítótár.
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Optional

from modules.financehub.backend.core.chat.query_classifier import QueryType

logger = logging.getLogger(__name__)

# --- Alapértelmezett map ----------------------------------------------------
_TEMPLATE_MAP = {
    QueryType.greeting: "greeting_rapid.j2",
    QueryType.indicator: "indicator_rapid.j2",
    QueryType.summary: "summary_rapid.j2",
    QueryType.news: "news_rapid.j2",
    QueryType.hybrid: "summary_rapid.j2",
    QueryType.unknown: "summary_rapid.j2",
}

CACHE_KEY_PREFIX = "tpl:"  # Redis kulcs prefix
CACHE_TTL = 60  # másodperc

class TemplateRouter:
    """Vékony absztrakció sablon‐névkéréshez."""

    def __init__(self, cache):
        """cache: CacheService példány (get/set/exists) interface"""
        self.cache = cache

    async def get_template(self, q_type: QueryType) -> str:
        cache_key = f"{CACHE_KEY_PREFIX}{q_type.value}"
        try:
            cached: Optional[str] = await self.cache.get(cache_key)
            if cached:
                logger.debug("TemplateRouter cache hit -> %s", cached)
                return cached
        except Exception as e:  # noqa
            logger.debug("TemplateRouter cache read err: %s", e)

        tpl = _TEMPLATE_MAP.get(q_type, "summary_rapid.j2")

        try:
            await self.cache.set(cache_key, tpl, timeout_seconds=CACHE_TTL)
        except Exception as e:  # noqa
            logger.debug("TemplateRouter cache write err: %s", e)
        return tpl 