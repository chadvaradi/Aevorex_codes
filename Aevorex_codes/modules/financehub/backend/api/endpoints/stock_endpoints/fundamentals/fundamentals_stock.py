"""
Fundamentals Stock Data Endpoint - REAL API Integration
Provides fundamental data for stocks from real APIs
"""

import time
import uuid
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

# Import real API service functions
from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import get_fundamentals_data
from modules.financehub.backend.api.deps import get_http_client, get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fundamentals",
    tags=["Stock Fundamentals Data"]
)

@router.get(
    "/{ticker}",
    summary="Get Stock Fundamentals - REAL API (~300ms)",
    description="Returns fundamental analysis data from real APIs: company overview, financial metrics, ratios",
    responses={
        200: {"description": "Fundamentals data retrieved successfully"},
        404: {"description": "Symbol not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_fundamentals_stock_data_endpoint(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Phase 3: Fundamental analysis data (PE ratio, financial metrics, company overview)
    NOW USING REAL API DATA instead of mock data
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"{symbol}-fundamentals-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] REAL API fundamentals data request for {symbol}")
    
    try:
        # Use REAL API service instead of mock data
        fundamentals_data = await get_fundamentals_data(symbol, http_client, cache)
        
        if not fundamentals_data:
            logger.warning(f"[{request_id}] No fundamentals data returned from API for {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fundamentals data not found for symbol: {symbol}"
            )
        
        # Unified response structure with REAL fundamentals data
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-real-api",
                "cache_hit": False,
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "data_quality": "real_api_data",
                "provider": "yahoo_finance_eodhd_hybrid",
                "version": "3.0.0"
            },
            "fundamentals_data": fundamentals_data
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] REAL fundamentals data completed in {processing_time}ms")
        
        # Use FastAPI's jsonable_encoder to safely convert Pydantic / complex types (e.g., HttpUrl)
        # into JSON-serialisable primitives before returning. This prevents runtime 500 errors
        # like "Object of type HttpUrl is not JSON serializable" that were crashing the fundamentals
        # endpoint and the dependent analysis bubbles on the frontend.

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(response_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] REAL API fundamentals data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch fundamentals data for {symbol}: {str(e)}"
        ) 