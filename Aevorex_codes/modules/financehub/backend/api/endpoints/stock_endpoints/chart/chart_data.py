"""
Chart Data Endpoint for Stock Information
Provides stock chart data and price history
"""

import time
import uuid
import logging
import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, HTTPException, Depends, Path, Query, status
from fastapi.responses import JSONResponse

from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import get_chart_data
from modules.financehub.backend.models.stock_progressive import ChartDataResponse
from modules.financehub.backend.api.deps import get_http_client, get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chart",
    tags=["Stock Chart Data"]
)

@router.get(
    "/{ticker}",
    response_model=ChartDataResponse,
    summary="Get Chart Data - REAL API (OHLCV ~200ms)",
    description="Returns OHLCV data for charting from real APIs. Optimized for chart rendering.",
    responses={
        200: {"description": "Chart data retrieved successfully"},
        404: {"description": "Symbol not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_chart_data_endpoint(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    period: str = Query("1y", description="Time period", regex="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|max)$"),
    interval: str = Query("1d", description="Data interval", regex="^(1m|2m|5m|15m|30m|60m|90m|1h|1d|5d|1wk|1mo|3mo)$"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Phase 2: Chart OHLCV data for visualization
    NOW USING REAL API DATA from EODHD and other providers
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"{symbol}-chart-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] REAL API chart data request for {symbol} ({period}, {interval})")
    
    try:
        # Use REAL API service instead of mock data
        chart_data = await get_chart_data(symbol, period, interval, http_client, cache)
        
        if not chart_data:
            logger.warning(f"[{request_id}] No chart data returned from API for {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chart data not found for symbol: {symbol}"
            )
        
        # Process the real chart data
        ohlcv_data = chart_data.get("ohlcv", [])
        
        # Unified response structure with REAL chart data
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-real-api",
                "cache_hit": False,
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "data_quality": "real_api_data",
                "provider": "eodhd_yahoo_hybrid",
                "version": "3.0.0",
                "period": period,
                "interval": interval,
                "data_points": len(ohlcv_data)
            },
            "chart_data": {
                "symbol": symbol,
                "ohlcv": ohlcv_data,
                "period": period,
                "interval": interval,
                "currency": chart_data.get("currency", "USD"),
                "timezone": chart_data.get("timezone", "America/New_York")
            }
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] REAL chart data completed in {processing_time}ms ({len(ohlcv_data)} points)")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] REAL API chart data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chart data for {symbol}: {str(e)}"
        )