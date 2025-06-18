"""
AI Summary Service for Stock Data
Provides comprehensive AI-powered financial analysis using real market data
"""

import time
import uuid
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
import asyncio
import json

# Import AI service and dependencies
from modules.financehub.backend.core.ai.ai_service import generate_ai_summary
from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import process_premium_stock_data
from modules.financehub.backend.api.deps import get_http_client, get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/ai-summary/{ticker}")
async def get_ai_summary(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    force_refresh: bool = Query(False, description="Force cache refresh and regenerate AI analysis"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
    request: Request = None
) -> JSONResponse:
    """
    Get AI-generated comprehensive stock analysis and insights using real market data.
    
    This endpoint provides comprehensive AI-powered stock analysis by:
    1. Fetching comprehensive stock data (fundamentals, technicals, news)
    2. Processing the data through our AI analysis pipeline
    3. Returning structured AI insights and recommendations
    
    The AI analysis includes:
    - Company overview and business assessment
    - Financial metrics analysis and interpretation
    - Technical analysis and price action insights
    - News sentiment analysis and market context
    - Investment recommendations and risk assessment
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"{symbol}-ai-summary-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] AI Summary request for {symbol}, force_refresh={force_refresh}")
    
    try:
        # Check cache first if not forcing refresh
        cache_key = f"ai_summary:{symbol}"
        if not force_refresh:
            cached_summary = await cache.get(cache_key)
            if cached_summary:
                logger.info(f"[{request_id}] AI summary cache hit for {symbol}")

                accept_header = request.headers.get("accept", "") if request else ""

                # If the client expects SSE, stream cached summary sentence-by-sentence
                if "text/event-stream" in accept_header.lower():
                    words = cached_summary.split()
                    chunk = []

                    async def cached_event_generator():
                        yield "retry: 1000\n\n"
                        for word in words:
                            chunk.append(word)
                            if len(chunk) >= 40:
                                text_part = " ".join(chunk)
                                payload = json.dumps({"content": text_part, "type": "token"})
                                yield f"data: {payload}\n\n"
                                chunk.clear()
                                await asyncio.sleep(0.001)

                        if chunk:
                            text_part = " ".join(chunk)
                            payload = json.dumps({"content": text_part, "type": "token"})
                            yield f"data: {payload}\n\n"

                        yield "data: [DONE]\n\n"

                    return StreamingResponse(cached_event_generator(), media_type="text/event-stream")

                # Otherwise, return JSON immediately
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                        "metadata": {
                            "symbol": symbol,
                            "timestamp": datetime.utcnow().isoformat(),
                            "source": "aevorex-ai-cache",
                            "cache_hit": True,
                            "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                            "data_quality": "cached_ai_analysis",
                            "version": "3.0.0"
                        },
                        "ai_summary": cached_summary
                    }
                )
        
        # Fetch comprehensive stock data for AI analysis
        logger.info(f"[{request_id}] Fetching comprehensive stock data for AI analysis")
        stock_data = await process_premium_stock_data(symbol, http_client, cache, force_refresh=force_refresh)
        
        if not stock_data:
            logger.warning(f"[{request_id}] No stock data available for AI analysis: {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock data not found for AI analysis: {symbol}"
            )
        
        # Extract data components for AI analysis - stock_data is FinBotStockResponse object
        company_overview = getattr(stock_data, 'company_overview', None)
        financials = getattr(stock_data, 'financials', None)
        earnings = getattr(stock_data, 'earnings', None)
        news = getattr(stock_data, 'news', [])
        latest_indicators = getattr(stock_data, 'latest_indicators', {})
        
        logger.info(f"[{request_id}] Generating AI analysis with components: overview={company_overview is not None}, financials={financials is not None}, news={len(news) if news else 0} items")
        
        # Generate AI summary using the AI service
        ai_summary_result = await generate_ai_summary(
            symbol=symbol,
            df_with_indicators=None,  # DataFrame not available at endpoint level
            latest_indicators=latest_indicators or {},
            news_items=news or [],
            company_overview=company_overview,
            client=http_client,
            financials_data=financials,
            earnings_data=earnings
        )
        
        if not ai_summary_result or not isinstance(ai_summary_result, str) or not ai_summary_result.strip():
            logger.warning(f"[{request_id}] AI service returned empty or invalid response for {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"AI analysis could not be generated for symbol: {symbol}"
            )
        
        # Check if result is an error message
        error_indicators = ["[AI Analysis Error]", "AI analysis temporarily unavailable", "Failed to generate"]
        if any(error_indicator in ai_summary_result for error_indicator in error_indicators):
            logger.warning(f"[{request_id}] AI service returned error message: {ai_summary_result[:100]}...")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI analysis failed: {ai_summary_result}"
            )
        
        # Cache the successful result
        try:
            await cache.set(cache_key, ai_summary_result, timeout_seconds=3600)  # Cache for 1 hour
            logger.info(f"[{request_id}] AI summary cached successfully for {symbol}")
        except Exception as cache_error:
            logger.warning(f"[{request_id}] Failed to cache AI summary: {cache_error}")
        
        # If client requested Server-Sent Events streaming, stream the summary sentence-by-sentence
        accept_header = request.headers.get("accept", "") if request else ""
        if "text/event-stream" in accept_header.lower():
            # Split summary into reasonably sized chunks (max ~300 chars) to balance updates
            words = ai_summary_result.split()
            chunk = []

            async def event_generator():
                # Initial retry directive for SSE (reconnect after 1s)
                yield "retry: 1000\n\n"
                for word in words:
                    chunk.append(word)
                    # Flush every ~40 words or when chunk gets long
                    if len(chunk) >= 40:
                        text_part = " ".join(chunk)
                        payload = json.dumps({"content": text_part, "type": "token"})
                        yield f"data: {payload}\n\n"
                        chunk.clear()
                        await asyncio.sleep(0.001)

                # Flush remaining words
                if chunk:
                    text_part = " ".join(chunk)
                    payload = json.dumps({"content": text_part, "type": "token"})
                    yield f"data: {payload}\n\n"

                # Signal completion
                yield "data: [DONE]\n\n"

            return StreamingResponse(event_generator(), media_type="text/event-stream")

        # Prepare successful JSON response
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-ai-analysis",
                "cache_hit": False,
                "processing_time_ms": processing_time,
                "data_quality": "real_ai_analysis",
                "ai_model": "gpt-4-turbo",  # This should come from AI service config
                "content_length": len(ai_summary_result),
                "version": "3.0.0"
            },
            "ai_summary": ai_summary_result
        }
        
        logger.info(f"[{request_id}] AI summary generated successfully in {processing_time}ms, length: {len(ai_summary_result)} chars")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] AI summary generation error after {processing_time}ms: {e}", exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI summary for {symbol}: {str(e)}"
        ) 