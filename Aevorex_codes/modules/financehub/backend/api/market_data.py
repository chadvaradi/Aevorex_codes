# backend/api/endpoints/market_data.py
# -*- coding: utf-8 -*-
"""
API Endpoint for Market Data related operations. (v2.1 Enterprise Refactor)

Provides access to pre-aggregated or cached market data points.
Currently includes fetching pre-cached news data.
"""

import logging
import json
from typing import List, Dict, Any, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    BackgroundTasks
)
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.concurrency import run_in_threadpool
import httpx
import uuid
import asyncio

# --- Helyi Importok ---
# Naplózás (first to ensure logger is available)
from modules.financehub.backend.utils.logger_config import get_logger # Projekt-specifikus logger

# --- Logger Inicializálása ---
MODULE_NAME = "Market Data Endpoint"
logger = get_logger(__name__) # Modul szintű logger

# Függőségek (Dependencies)
from modules.financehub.backend.api.deps import get_cache_service, get_http_client
# Core Szolgáltatások
from modules.financehub.backend.core.cache_service import CacheService
# Configuration and settings
try:
    from modules.financehub.backend.config import settings
    logger.info("Settings imported successfully from config module")
except ImportError as e:
    logger.critical(f"Failed to import settings: {e}")
    raise ImportError("Cannot import configuration settings") from e

# --- Router Inicializálása ---
router = APIRouter(
    # Prefix és Tag-ek a Swagger UI és az útvonalak szervezéséhez
    # prefix="/api/v1/market-data",  # Removed because it's added in main.py
    tags=["Market Data"]
)

# --- Konstansok ---
LOG_PREFIX_ENDPOINT = f"[{MODULE_NAME}]"

# --- API Endpoint-ok ---

@router.get(
    "/news",
    summary="Get Market News",
    description="Retrieves latest market news articles",
    response_description="A list of news articles with metadata",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK
)
async def get_market_news(
    limit: int = 10,
    cache: CacheService = Depends(get_cache_service)
) -> List[Dict[str, Any]]:
    """
    Fetches general market news (not specific to any ticker).
    """
    logger.info(f"{LOG_PREFIX_ENDPOINT} /news request received.")

    try:
        # Try to get from cache first
        cache_key = "market_news_data"
        cached_data_raw: Optional[Any] = await cache.get(cache_key)

        if cached_data_raw is None:
            # Generate mock news data (replace with real API later)
            logger.info(f"{LOG_PREFIX_ENDPOINT} Cache MISS for key: '{cache_key}'. Generating mock news data.")
            
            news_data = [
                {
                    "headline": "Market Analysis Update",
                    "summary": "Latest market trends and analysis",
                    "url": "https://example.com/news1",
                    "source": "Market News",
                    "timestamp": "2025-06-03T18:53:00Z"
                },
                {
                    "headline": "Economic Indicators Review",
                    "summary": "Key economic indicators and their impact",
                    "url": "https://example.com/news2", 
                    "source": "Economic Times",
                    "timestamp": "2025-06-03T17:30:00Z"
                }
            ]
            
            # Limit results
            news_data = news_data[:limit]
            
            # Cache the data for 5 minutes
            try:
                await cache.set(cache_key, news_data, timeout_seconds=300)
                logger.debug(f"{LOG_PREFIX_ENDPOINT} News data cached with TTL: 300s")
            except Exception as cache_err:
                logger.warning(f"{LOG_PREFIX_ENDPOINT} Failed to cache news data: {cache_err}")
            
            logger.info(f"{LOG_PREFIX_ENDPOINT} Successfully generated {len(news_data)} news items")
            return news_data

        # Process cached data
        logger.debug(f"{LOG_PREFIX_ENDPOINT} Cache HIT for key: '{cache_key}'")
        
        processed_data: List[Dict[str, Any]]
        if isinstance(cached_data_raw, str):
            try:
                processed_data = json.loads(cached_data_raw)
            except json.JSONDecodeError as json_err:
                logger.error(f"{LOG_PREFIX_ENDPOINT} Failed to decode JSON: {json_err}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Internal error: Cached news data is corrupted."
                )
        elif isinstance(cached_data_raw, list):
            processed_data = cached_data_raw
        else:
            logger.error(f"{LOG_PREFIX_ENDPOINT} Unexpected data type in cache: {type(cached_data_raw)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error: Unexpected data type in news cache."
            )

        if not isinstance(processed_data, list):
            logger.error(f"{LOG_PREFIX_ENDPOINT} Processed data is not a list: {type(processed_data)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error: Failed to process cached data correctly."
            )

        # Apply limit
        if limit:
            processed_data = processed_data[:limit]

        item_count = len(processed_data)
        logger.info(f"{LOG_PREFIX_ENDPOINT} Successfully retrieved {item_count} news items from cache.")
        return processed_data

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"{LOG_PREFIX_ENDPOINT} Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while fetching market news."
        )

# --- Modul betöltés jelzése (hasznos debuggoláshoz) ---
logger.info(f"--- {MODULE_NAME} loaded and router configured with prefix '/api/v1/market'. Endpoint '/news' is available. ---")