"""
News Stock Data Endpoint - REAL API Integration
Provides news data for stocks extracted from analytics service
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
from modules.financehub.backend.core.stock_data_service import get_news_data
from modules.financehub.backend.api.deps import get_http_client, get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/news",
    tags=["Stock News Data"]
)

@router.get(
    "/{ticker}",
    summary="Get Stock News (no LLM) - fast (~800ms)",
    description="Returns latest news data for specific stock from real APIs without invoking AI services.",
    responses={
        200: {"description": "News data retrieved successfully"},
        404: {"description": "Symbol not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_news_stock_data_endpoint(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    limit: int = Query(10, description="Number of news items to return"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Phase 5: Stock news data (headlines, summaries, sentiment analysis)
    NOW USING REAL API DATA extracted from analytics service
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"{symbol}-news-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] REAL API news data request for {symbol}")
    
    try:
        news_payload = await get_news_data(symbol, http_client, cache, limit=limit)

        if not news_payload:
            logger.warning(f"[{request_id}] No news data returned for {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"News data not found for symbol: {symbol}"
            )

        news_items = news_payload.get("news", [])
        sentiment_summary = news_payload.get("sentiment_summary", {
            "overall": "neutral",
            "news_count": len(news_items)
        })
        
        # Unified response structure with REAL news data
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-real-api",
                "cache_hit": False,
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "data_quality": "real_api_data",
                "provider": "yahoo_finance_eodhd_hybrid",
                "version": "3.0.0",
                "total_articles": len(news_items),
                "returned_articles": len(news_items)
            },
            "news": news_items,
            "sentiment_summary": sentiment_summary
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] REAL news data completed in {processing_time}ms, returned {len(news_items)} articles")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(response_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] REAL API news data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch news data for {symbol}: {str(e)}"
        ) 