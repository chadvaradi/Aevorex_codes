"""prometheus_exporter.py – Minimal Prometheus metrics for FinanceHub.

A cél, hogy FUTÁSIDEJŰEN mérjünk néhány kulcsmutatót a prompt-pipeline
(rapid/deep válaszidő, cache hit ráta stb.) és azokat a /metrics végponton
Prometheus formátumban kiexportáljuk.

Ez a modul NEM hoz be új kötelező függőséget: ha a `prometheus_client`
könyvtár nem érhető el, akkor érintetlenül működik a backend.  A fejlesztői
méréshez pip-pel telepíthető:

    pip install prometheus_client

Használat a FastAPI `main.py`-ban:

    from modules.financehub.backend.core.metrics.prometheus_exporter import (
        PrometheusExporter, get_metrics_router,
    )

    exporter = PrometheusExporter()
    app.include_router(get_metrics_router(exporter), tags=["Metrics"])

Ez a fájl kicsi marad (<200 LOC).  @Team: ha bővítitek, inkább osszátok
külön fájlokba.
"""

from __future__ import annotations

import logging
from typing import Optional

try:
    from prometheus_client import Counter, Histogram, CollectorRegistry, exposition  # type: ignore

    _PROM_AVAILABLE = True
except ImportError:  # pragma: no cover – optional dep
    _PROM_AVAILABLE = False

from fastapi import APIRouter, Response

logger = logging.getLogger(__name__)


class PrometheusExporter:
    """Wrapper around prometheus_client with graceful degrade."""

    def __init__(self):
        if _PROM_AVAILABLE:
            self.registry = CollectorRegistry(auto_describe=True)
            self.response_time = Histogram(
                "fh_response_time_seconds",
                "LLM token stream total response time",
                ["stage", "model"],
                registry=self.registry,
                buckets=(0.1, 0.3, 0.6, 1, 2, 5, 10),
            )
            self.first_token_ms = Histogram(
                "fh_first_token_ms",
                "First token latency in milliseconds",
                ["stage", "model"],
                registry=self.registry,
                buckets=(50, 100, 200, 300, 500, 800, 1200),
            )
            self.cache_hits = Counter(
                "fh_cache_hits_total", "Template & context cache hits", ["cache"], registry=self.registry
            )
            self.cache_misses = Counter(
                "fh_cache_misses_total", "Template & context cache misses", ["cache"], registry=self.registry
            )
            self.deep_opt_in = Counter(
                "fh_deep_opt_in_total",
                "Number of times users opted for deep analysis",
                ["ticker"],
                registry=self.registry,
            )
            self.rapid_latency_ms = Histogram(
                "fh_rapid_latency_ms",
                "Total latency of rapid pipeline (ms)",
                ["model"],
                registry=self.registry,
                buckets=(50,100,200,300,500,800,1200,2000,4000,8000),
            )
        else:
            # Dummy placeholders so calling code won't break
            self.registry = None
            self.response_time = self.first_token_ms = self.cache_hits = self.cache_misses = self.deep_opt_in = self.rapid_latency_ms = _NoOpMetric()
            logger.warning("prometheus_client not installed – metrics disabled")

    # ---------------------------------------------------------------------
    # Helper methods – these no-op automatically if prom not available
    # ---------------------------------------------------------------------

    def observe_response(self, stage: str, model: str, seconds: float):
        self.response_time.labels(stage=stage, model=model).observe(seconds)

    def observe_first_token(self, stage: str, model: str, ms: float):
        self.first_token_ms.labels(stage=stage, model=model).observe(ms)

    def inc_hit(self, cache: str):
        self.cache_hits.labels(cache=cache).inc()

    def inc_miss(self, cache: str):
        self.cache_misses.labels(cache=cache).inc()

    def observe_rapid_latency(self, model: str, ms: float):
        self.rapid_latency_ms.labels(model=model).observe(ms)

    def inc_deep_opt_in(self, ticker: str):
        self.deep_opt_in.labels(ticker=ticker.upper()).inc()

    # ------------------------------------------------------------------
    # FastAPI router
    # ------------------------------------------------------------------

    def as_fastapi_router(self) -> APIRouter:
        return get_metrics_router(self)


class _NoOpMetric:  # pylint: disable=too-few-public-methods
    """Fallback metric object doing nothing when prom not installed."""

    def labels(self, **_kwargs):
        return self

    def observe(self, *_args, **_kwargs):
        return None

    def inc(self, *_args, **_kwargs):
        return None


# -------------------------------------------------------------------------
# FastAPI router factory
# -------------------------------------------------------------------------

def get_metrics_router(exporter: PrometheusExporter) -> APIRouter:  # noqa: D401
    """Return a small APIRouter exposing `/metrics`."""

    router = APIRouter()

    @router.get("/metrics", summary="Prometheus metrics")
    async def metrics() -> Response:  # noqa: D401
        if not _PROM_AVAILABLE:
            return Response("prometheus_client not installed", media_type="text/plain", status_code=503)
        data = exposition.generate_latest(exporter.registry)
        return Response(data, media_type=exposition.CONTENT_TYPE_LATEST)

    return router 