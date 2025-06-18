"""
Ticker Tape Data Endpoint

Provides real-time ticker tape data for multiple symbols.
This endpoint aggregates basic stock data from multiple sources
to create a dynamic ticker tape feed.
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.ticker_tape_service import update_ticker_tape_data_in_cache
from modules.financehub.backend.models.ticker_tape_response import TickerTapeResponse, TickerTapeMetadata
from modules.financehub.backend.api.deps import get_http_client, get_cache_service
from modules.financehub.backend.config import settings

# Set up router
router = APIRouter(
    prefix="/ticker-tape",
    tags=["Ticker Tape"]
)

logger = logging.getLogger(__name__)

@router.get(
    "/",
    summary="Get Ticker Tape Data - REAL API (~300ms)",
    description="Returns ticker tape data for popular stocks with real-time prices",
    responses={
        200: {"description": "Ticker tape data retrieved successfully"},
        500: {"description": "Internal server error"}
    }
)
async def get_ticker_tape_data_endpoint(
    limit: int = 20,
    force_refresh: bool = False,
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    ✅ REAL TICKER TAPE DATA - Uses dedicated ticker_tape_service.py
    Returns real-time ticker data from EODHD API with cache support
    """
    try:
        logger.info(f"🎯 TickerTape REAL API request (limit={limit}, force_refresh={force_refresh})")
        
        # 1. Cache Configuration
        cache_key = settings.TICKER_TAPE.CACHE_KEY
        cache_ttl = settings.TICKER_TAPE.CACHE_TTL_SECONDS
        
        logger.debug(f"📦 Using cache key: {cache_key}, TTL: {cache_ttl}s")
        
        # 2. Try to get cached data first (if not forcing refresh)
        cached_data = None
        if not force_refresh:
            try:
                cached_data = await cache.get(cache_key)
                if cached_data and isinstance(cached_data, list):
                    logger.info(f"✅ Using cached ticker data ({len(cached_data)} items)")
                    
                    # Apply limit to cached data
                    limited_data = cached_data[:limit] if limit < len(cached_data) else cached_data
                    
                    return JSONResponse(
                        status_code=status.HTTP_200_OK,
                        content={
                            "status": "success",
                            "data": limited_data,
                            "metadata": {
                                "total_symbols": len(limited_data),
                                "requested_limit": limit,
                                "data_source": "cache",
                                "last_updated": datetime.utcnow().isoformat(),
                                "cache_hit": True
                            }
                        }
                    )
            except Exception as cache_error:
                logger.warning(f"⚠️ Cache read error: {cache_error}")
        
        # 3. No cached data or force refresh - fetch fresh data
        logger.info(f"🔄 Fetching fresh ticker tape data using dedicated service...")
        
        # Use the dedicated ticker_tape_service function
        success = await update_ticker_tape_data_in_cache(http_client, cache)
        
        if not success:
            logger.error("❌ Failed to update ticker tape data in cache")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "success",
                    "data": [],
                    "metadata": {
                        "total_symbols": 0,
                        "requested_limit": limit,
                        "data_source": "error",
                        "last_updated": datetime.utcnow().isoformat(),
                        "error": "Failed to fetch data from API providers"
                    }
                }
            )
        
        # 4. Get the freshly cached data
        try:
            fresh_data = await cache.get(cache_key)
            if fresh_data and isinstance(fresh_data, list):
                # Apply limit
                limited_data = fresh_data[:limit] if limit < len(fresh_data) else fresh_data
                
                logger.info(f"✅ Fresh ticker data retrieved ({len(limited_data)} items)")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "status": "success",
                        "data": limited_data,
                        "metadata": {
                            "total_symbols": len(limited_data),
                            "requested_limit": limit,
                            "data_source": "real_api",
                            "last_updated": datetime.utcnow().isoformat(),
                            "cache_hit": False
                        }
                    }
                )
            else:
                logger.warning("⚠️ Fresh data fetch succeeded but cache is empty")
                
        except Exception as fresh_cache_error:
            logger.error(f"❌ Error reading fresh cache data: {fresh_cache_error}")
        
        # 5. Fallback - return empty data
        logger.warning("🚨 All data fetch attempts failed, returning empty result")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "data": [],
                "metadata": {
                    "total_symbols": 0,
                    "requested_limit": limit,
                    "data_source": "empty",
                    "last_updated": datetime.utcnow().isoformat(),
                    "note": "No data available from API providers"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"🚨 Ticker tape endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch ticker tape data: {str(e)}"
        )

@router.get("", include_in_schema=False)
async def get_ticker_tape_data_endpoint_noslash(
    limit: int = 20,
    force_refresh: bool = False,
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """Alias endpoint '/ticker-tape' without trailing slash for better compatibility."""
    return await get_ticker_tape_data_endpoint(
        limit=limit,
        force_refresh=force_refresh,
        http_client=http_client,
        cache=cache,
    ) 