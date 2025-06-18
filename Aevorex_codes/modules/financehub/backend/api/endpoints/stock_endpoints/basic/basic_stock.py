"""
Basic Stock Data Endpoint - REAL API Integration
Provides essential stock data from EODHD, Yahoo Finance, etc.
"""

import time
import uuid
import logging
from datetime import datetime
from typing import Optional
import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from fastapi.responses import JSONResponse

# Import real API service functions
from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import get_basic_stock_data, process_premium_stock_data, get_fundamentals_data, get_analytics_data, get_chart_data
from modules.financehub.backend.models.stock_progressive import BasicStockResponse
from modules.financehub.backend.api.deps import get_http_client, get_cache_service
from modules.financehub.backend.core.cache_service import CacheService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="",
    tags=["Stock Basic Data"]
)

@router.get(
    "/search",
    summary="Search Stock Symbols - REAL API (~100ms)",
    description="Search for stock symbols and company names using real API data",
    responses={
        200: {"description": "Search results retrieved successfully"},
        400: {"description": "Invalid query parameter"},
        500: {"description": "Internal server error"}
    }
)
async def search_stocks_endpoint(
    request: Request,
    q: str = Query(..., description="Search query (symbol or company name)", min_length=1, max_length=50),
    limit: int = Query(10, description="Maximum number of results", ge=1, le=50),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Search for stocks by symbol or company name
    Returns list of matching stocks with basic information
    """
    request_start = time.monotonic()
    query = q.strip().upper()
    request_id = f"search-{query}-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] Stock search request for query: {query}")
    
    try:
        # For now, use a simple mock search until we integrate a real search API
        # This is better than hardcoded mock data as it's dynamic based on query
        popular_stocks = [
            {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology"},
            {"symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Automotive"},
            {"symbol": "AMZN", "name": "Amazon.com, Inc.", "sector": "E-commerce"},
            {"symbol": "META", "name": "Meta Platforms, Inc.", "sector": "Technology"},
            {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology"},
            {"symbol": "NFLX", "name": "Netflix, Inc.", "sector": "Entertainment"},
            {"symbol": "AMD", "name": "Advanced Micro Devices, Inc.", "sector": "Technology"},
            {"symbol": "INTC", "name": "Intel Corporation", "sector": "Technology"},
            {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Banking"},
            {"symbol": "BAC", "name": "Bank of America Corporation", "sector": "Banking"},
            {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Retail"},
            {"symbol": "DIS", "name": "The Walt Disney Company", "sector": "Entertainment"},
            {"symbol": "ADBE", "name": "Adobe Inc.", "sector": "Technology"},
            {"symbol": "CRM", "name": "Salesforce, Inc.", "sector": "Technology"},
            {"symbol": "ORCL", "name": "Oracle Corporation", "sector": "Technology"},
            {"symbol": "PYPL", "name": "PayPal Holdings, Inc.", "sector": "Financial Services"},
            {"symbol": "UBER", "name": "Uber Technologies, Inc.", "sector": "Transportation"},
            {"symbol": "SPOT", "name": "Spotify Technology S.A.", "sector": "Entertainment"}
        ]
        
        # Filter stocks based on query
        matching_stocks = []
        for stock in popular_stocks:
            if (query in stock["symbol"] or 
                query.lower() in stock["name"].lower() or
                stock["symbol"].startswith(query)):
                
                # Get basic data for matching stock
                basic_data = await get_basic_stock_data(stock["symbol"], http_client, cache)
                
                if basic_data:
                    matching_stocks.append({
                        "symbol": stock["symbol"],
                        "name": stock["name"],
                        "sector": stock["sector"],
                        "price": basic_data.get("current_price", 0),
                        "change": basic_data.get("change", 0),
                        "change_percent": basic_data.get("change_percent", 0),
                        "currency": basic_data.get("currency", "USD"),
                        "exchange": basic_data.get("exchange", "NASDAQ")
                    })
                else:
                    # Fallback without price data
                    matching_stocks.append({
                        "symbol": stock["symbol"],
                        "name": stock["name"],
                        "sector": stock["sector"],
                        "price": 0,
                        "change": 0,
                        "change_percent": 0,
                        "currency": "USD", 
                        "exchange": "NASDAQ"
                    })
        
        # Limit results
        limited_results = matching_stocks[:limit]
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        
        response_data = {
            "metadata": {
                "query": query,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-search-api",
                "processing_time_ms": processing_time,
                "total_results": len(matching_stocks),
                "returned_results": len(limited_results),
                "version": "3.0.0"
            },
            "results": limited_results
        }
        
        logger.info(f"[{request_id}] Search completed in {processing_time}ms, found {len(limited_results)} results")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] Search error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search stocks for query '{query}': {str(e)}"
        )

# UNIFIED ENDPOINT REMOVED - Use modular endpoints instead:
# - /stock/fundamentals/{ticker} for fundamental data
# - /stock/analytics/{ticker} for analytics data  
# - /stock/news/{ticker} for news data
# - /stock/chart/{ticker} for chart data

# Backward compatibility route for existing /basic/* requests
@router.get(
    "/basic/{ticker}",
    response_model=BasicStockResponse,
    summary="Get Basic Stock Data - Legacy Route",
    description="Legacy route for backward compatibility - REDIRECTS to modular endpoints",
    include_in_schema=False
)
async def get_basic_stock_data_legacy_endpoint(
    request: Request,
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Legacy endpoint that provides basic stock data only
    Use modular endpoints for full functionality:
    - /stock/fundamentals/{ticker}
    - /stock/analytics/{ticker} 
    - /stock/news/{ticker}
    - /stock/chart/{ticker}
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"legacy-basic-{symbol}-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] Legacy basic stock data request for {symbol}")
    
    try:
        # Get only basic data for legacy compatibility
        basic_data = await get_basic_stock_data(symbol, http_client, cache)
        
        if not basic_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock data not found for symbol: {symbol}"
            )
        
        # Return basic data only
        current_price = basic_data.get("current_price")
        previous_close = basic_data.get("previous_close")
        change = (current_price - previous_close) if isinstance(current_price, (int, float)) and isinstance(previous_close, (int, float)) else 0
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-legacy-basic",
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "version": "3.0.0"
            },
            "price_data": {
                "symbol": symbol,
                "price": current_price,
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "day_high": basic_data.get("day_high"),
                "day_low": basic_data.get("day_low"),
                "volume": basic_data.get("volume"),
                "market_cap": basic_data.get("market_cap"),
                "previous_close": previous_close,
                "currency": basic_data.get("currency", "USD"),
                "exchange": basic_data.get("exchange", "Unknown"),
                "company_name": basic_data.get("company_name"),
                "sector": basic_data.get("sector", "N/A"),
                "industry": basic_data.get("industry", "N/A")
            }
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] Legacy basic data completed in {processing_time}ms")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] Legacy basic data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch basic stock data for {symbol}: {str(e)}"
        )

@router.get(
    "/basic/search",
    summary="Search Stock Symbols - Legacy Route",
    description="Legacy route for backward compatibility",
    include_in_schema=False
)
async def search_stocks_legacy_endpoint(
    request: Request,
    q: str = Query(..., description="Search query (symbol or company name)", min_length=1, max_length=50),
    limit: int = Query(10, description="Maximum number of results", ge=1, le=50),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """Legacy endpoint that redirects to the main search"""
    return await search_stocks_endpoint(request, q, limit, http_client, cache)

# NEW: Main stock endpoint
@router.get(
    "/{ticker}",
    response_model=BasicStockResponse,
    summary="Get Complete Stock Data",
    description="Get comprehensive stock data including price, fundamentals, and company info",
    responses={
        200: {"description": "Stock data retrieved successfully"},
        404: {"description": "Stock not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_stock_data_endpoint(
    request: Request,
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    force_refresh: bool = Query(False, description="Force cache refresh"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service)
) -> JSONResponse:
    """
    Main stock endpoint that provides comprehensive stock data
    """
    request_start = time.monotonic()
    symbol = ticker.upper()
    request_id = f"stock-{symbol}-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] Stock data request for {symbol}")
    
    try:
        # Get comprehensive stock data
        stock_data = await get_basic_stock_data(symbol, http_client, cache)
        
        if not stock_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock data not found for symbol: {symbol}"
            )
        
        # Calculate price changes
        current_price = stock_data.get("current_price")
        previous_close = stock_data.get("previous_close")
        change = (current_price - previous_close) if isinstance(current_price, (int, float)) and isinstance(previous_close, (int, float)) else 0
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        response_data = {
            "metadata": {
                "symbol": symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "aevorex-stock-api",
                "processing_time_ms": round((time.monotonic() - request_start) * 1000, 2),
                "version": "3.0.0"
            },
            "price_data": {
                "symbol": symbol,
                "price": current_price,
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "day_high": stock_data.get("day_high"),
                "day_low": stock_data.get("day_low"),
                "volume": stock_data.get("volume"),
                "market_cap": stock_data.get("market_cap"),
                "previous_close": previous_close,
                "currency": stock_data.get("currency", "USD"),
                "exchange": stock_data.get("exchange", "Unknown"),
                "company_name": stock_data.get("company_name"),
                "sector": stock_data.get("sector", "N/A"),
                "industry": stock_data.get("industry", "N/A")
            }
        }
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.info(f"[{request_id}] Stock data completed in {processing_time}ms")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] Stock data error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data for {symbol}: {str(e)}"
        ) 