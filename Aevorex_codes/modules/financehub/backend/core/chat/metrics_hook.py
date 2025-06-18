"""metrics_hook.py – lightweight Prometheus wrapper.

Usage:
    from .metrics_hook import record_first_token
    record_first_token("rapid", model_id, latency_ms)

If `prometheus_client` vagy a fő exporter nincs telepítve, a függvény no-op.
"""
from __future__ import annotations

import logging
from typing import Optional

try:
    from modules.financehub.backend.core.metrics.prometheus_exporter import (
        PrometheusExporter,
    )

    _EXPORTER: Optional[PrometheusExporter] = PrometheusExporter()
except Exception:  # pragma: no cover – prom optional
    _EXPORTER = None  # type: ignore

logger = logging.getLogger(__name__)


def record_first_token(stage: str, model: str, ms: float) -> None:  # noqa: D401
    """Safe helper – observe latency if metrics available."""
    if _EXPORTER is None:
        return
    try:
        _EXPORTER.observe_first_token(stage=stage, model=model, ms=ms)
    except Exception as exc:  # pragma: no cover
        logger.debug("Prometheus observe_first_token error: %s", exc)


def record_rapid_latency(model: str, ms: float) -> None:
    """Record total latency of the rapid pipeline in milliseconds."""
    if _EXPORTER is None:
        return
    try:
        _EXPORTER.observe_rapid_latency(model=model, ms=ms)
    except Exception as exc:  # pragma: no cover
        logger.debug("Prometheus observe_rapid_latency error: %s", exc)


def inc_deep_opt_in(ticker: str) -> None:  # noqa: D401
    """Increment counter when user explicitly requests deep analysis."""
    if _EXPORTER is None:
        return
    try:
        _EXPORTER.inc_deep_opt_in(ticker=ticker)
    except Exception as exc:  # pragma: no cover
        logger.debug("Prometheus inc_deep_opt_in error: %s", exc) 