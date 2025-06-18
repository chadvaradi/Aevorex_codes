"""
Analytics Stock Data Endpoint - REAL API Integration
Provides technical analysis data for stocks from real APIs
"""

import time
import uuid
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse

# Import real API service functions
from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import get_technical_analysis_data
from modules.financehub.backend.api.deps import get_http_client, get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/technical-analysis",
    tags=["Stock Technical Analysis"]
)

@router.get(
    "/{ticker}",
    summary="Get Technical Indicators (no AI) - fast (~300ms)",
    description="Returns lightweight technical indicator snapshot (MA, RSI, MACD etc.) computed from cached OHLCV data. No LLM or news involved.",
    responses={
        200: {"description": "Analytics data retrieved successfully"},
        404: {"description": "Symbol not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_technical_analysis_stock_data_endpoint(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Phase 4: Technical analysis data (indicators, signals, trend analysis)
    NOW USING REAL API DATA instead of mock data
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"{symbol}-techana-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] REAL API analytics data request for {symbol}")
    
    try:
        # Use REAL API service instead of mock data
        analytics_data = await get_technical_analysis_data(symbol, http_client, cache)
        
        if not analytics_data:
            logger.warning(f"[{request_id}] No analytics data returned; sending empty payload with 200.")
            analytics_data = {
                "symbol": symbol,
                "latest_indicators": {},
                "note": "No data available"
            }
        
        # Unified response structure with REAL analytics data
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-real-api",
                "cache_hit": False,
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "data_type": "technical_analysis",
                "provider": "yahoo_finance_eodhd_hybrid",
                "version": "3.1.0"
            },
            "technical_analysis": analytics_data
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] Technical analysis completed in {processing_time}ms")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] REAL API analytics data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch technical analysis data for {symbol}: {str(e)}"
        )

# Export router under a new, semantic name to avoid any 'analytics' reference.
technical_analysis_router = router 