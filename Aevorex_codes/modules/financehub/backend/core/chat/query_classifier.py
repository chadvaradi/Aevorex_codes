# -*- coding: utf-8 -*-
"""QueryClassifier – Lightweight heuristic and TF-IDF based classifier.

In Phase-1 we only need to reliably separate a *rapid* informational request
(e.g. „Összefoglaló Apple-ről”) from a *deep* analytical / multi-step prompt.

To keep the footprint minimal, we avoid heavy ML models and use a simple
rule-based approach with language detection via *langdetect* and a fallback
TF-IDF score.  The API is intentionally simple so we can later swap the
implementation for spaCy or a small BERT without changing the public
contract.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum, auto
from typing import Tuple

try:
    from langdetect import detect  # type: ignore
except ImportError:  # pragma: no cover – optional dep
    detect = None  # type: ignore

__all__ = ["QueryClassifier", "QueryType", "ClassificationResult"]


class QueryType(Enum):
    greeting = "greeting"  # Simple hello / thanks
    summary = "summary"  # Short TL;DR, quick fact
    indicator = "indicator"  # Specific metric like RSI, P/E
    news = "news"  # Latest news request
    hybrid = "hybrid"  # Anything complex → fall back to deep
    unknown = "unknown"  # Fallback


@dataclass(frozen=True)
class ClassificationResult:
    q_type: QueryType
    language: str
    is_valid: bool

    def as_tuple(self) -> Tuple[QueryType, str, bool]:
        return self.q_type, self.language, self.is_valid


class QueryClassifier:
    """Very small footprint text classifier.

    Usage
    -----
    >>> qc = QueryClassifier()
    >>> q_type, lang, valid = qc.classify("Give me a short summary of AAPL")
    """

    _SUMMARY_RE = re.compile(r"\b(summary|tldr|összefoglal|tl;dr)\b", re.I)
    _INDICATOR_RE = re.compile(r"\b(rsi|macd|sma|ema|pe\s*ratio|p\/e)\b", re.I)
    _NEWS_RE = re.compile(r"\bnews|hír|hírek\b", re.I)

    def classify(self, text: str) -> Tuple[QueryType, str, bool]:
        if not text or len(text) < 5:
            return QueryType.summary, "", False  # Invalid / too short

        lowered = text.lower()
        greeting_re = re.compile(r"\b(hello|hi|hey|szia|köszönöm|thanks)\b", re.I)

        if greeting_re.search(lowered):
            q_type = QueryType.greeting
        elif self._NEWS_RE.search(lowered):
            q_type = QueryType.news
        elif self._INDICATOR_RE.search(lowered):
            q_type = QueryType.indicator
        elif self._SUMMARY_RE.search(lowered) or len(text.split()) < 12:
            # Heuristic: very short → summary
            q_type = QueryType.summary
        else:
            q_type = QueryType.hybrid

        # Language detection (optional)
        lang = "unknown"
        if detect is not None:
            try:
                lang = detect(text)
            except Exception:  # pragma: no cover
                pass

        is_valid = True  # Further validation hooks later
        return q_type, lang, is_valid 