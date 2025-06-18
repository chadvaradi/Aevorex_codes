# backend/core/fetchers/marketaux.py
"""
MarketAux API Fetcher Module.
This module is responsible for fetching news data from the MarketAux API,
caching responses, and performing basic response processing.
"""
import logging
import sys
from typing import List, Optional, Dict, Any, Union

import httpx

_marketaux_dependencies_met = True
_logger_initialized_successfully = False

try:
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from ..cache_service import CacheService
    # CORRECTED: Changed to relative import for consistency
    from ._base_helpers import (
        generate_cache_key,
        make_api_request,
        get_api_key,
        FETCH_FAILURE_CACHE_TTL,
    )
    from ._fetcher_constants import (
        FETCH_FAILED_MARKER,
        MARKETAUX_BASE_URL,
    )
except ImportError as e:
    _marketaux_dependencies_met = False
    logging.basicConfig(
        level="CRITICAL",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    critical_logger = logging.getLogger(f"{__name__}.dependency_fallback")
    critical_logger.critical(
        f"FATAL ERROR in marketaux.py: Failed to import core dependencies: {e}. Module will be unusable.",
        exc_info=True,
    )
except Exception as general_import_err:
    _marketaux_dependencies_met = False
    logging.basicConfig(
        level="CRITICAL",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    critical_logger = logging.getLogger(f"{__name__}.general_import_fallback")
    critical_logger.critical(
        f"FATAL UNEXPECTED ERROR during import in marketaux.py: {general_import_err}. Module will be unusable.",
        exc_info=True,
    )

LOGGER_NAME = "aevorex_finbot.core.fetchers.marketaux"
MODULE_VERSION = "1.2" # Updated version

if _marketaux_dependencies_met:
    try:
        MARKETAUX_FETCHER_LOGGER = get_logger(LOGGER_NAME)
        MARKETAUX_FETCHER_LOGGER.info(
            f"--- Initializing MarketAux Fetcher Module ({MODULE_VERSION}) ---"
        )
        _logger_initialized_successfully = True
    except Exception as log_init_err:
        logging.basicConfig(
            level="ERROR",
            stream=sys.stderr,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        MARKETAUX_FETCHER_LOGGER = logging.getLogger(f"{__name__}.logger_init_fallback")
        MARKETAUX_FETCHER_LOGGER.error(
            f"Error initializing configured logger ({LOGGER_NAME}) in marketaux.py: {log_init_err}. Using fallback logger.",
            exc_info=True,
        )
else:
    logging.basicConfig(
        level="ERROR",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    MARKETAUX_FETCHER_LOGGER = logging.getLogger(f"{__name__}.init_error_fallback")
    MARKETAUX_FETCHER_LOGGER.error(
        f"MarketAux Fetcher Module ({MODULE_VERSION}) core dependencies FAILED to load. Fetcher functions will be non-operational."
    )

DEFAULT_NEWS_RAW_FETCH_TTL = 900
DEFAULT_NEWS_FETCH_LIMIT = 25
DEFAULT_NEWS_LANGUAGE = "en"

NEWS_RAW_FETCH_TTL = DEFAULT_NEWS_RAW_FETCH_TTL
NEWS_FETCH_LIMIT = DEFAULT_NEWS_FETCH_LIMIT
NEWS_LANGUAGE = DEFAULT_NEWS_LANGUAGE
MARKETAUX_API_KEY_NAME = "MARKETAUX"
MARKETAUX_NEWS_ALL_ENDPOINT = "/v1/news/all"

if _marketaux_dependencies_met and _logger_initialized_successfully:
    try:
        NEWS_RAW_FETCH_TTL = settings.CACHE.NEWS_RAW_FETCH_TTL_SECONDS
        MARKETAUX_FETCHER_LOGGER.debug(
            f"MarketAux news raw fetch TTL loaded from settings: {NEWS_RAW_FETCH_TTL}s"
        )
    except AttributeError:
        MARKETAUX_FETCHER_LOGGER.warning(
            f"Failed to load NEWS_RAW_FETCH_TTL_SECONDS from settings.CACHE. Using default: {NEWS_RAW_FETCH_TTL}s."
        )
    except Exception as e_ttl_load:
        MARKETAUX_FETCHER_LOGGER.error(
            f"Unexpected error loading NEWS_RAW_FETCH_TTL_SECONDS: {e_ttl_load}. Using default: {NEWS_RAW_FETCH_TTL}s.",
            exc_info=True
        )
    try:
        NEWS_FETCH_LIMIT = settings.NEWS.FETCH_LIMIT
        MARKETAUX_FETCHER_LOGGER.debug(
            f"MarketAux news fetch limit loaded from settings: {NEWS_FETCH_LIMIT}"
        )
    except AttributeError:
        MARKETAUX_FETCHER_LOGGER.warning(
            f"Failed to load NEWS_FETCH_LIMIT from settings.NEWS. Using default: {NEWS_FETCH_LIMIT}."
        )
    except Exception as e_limit_load:
        MARKETAUX_FETCHER_LOGGER.error(
            f"Unexpected error loading NEWS_FETCH_LIMIT: {e_limit_load}. Using default: {NEWS_FETCH_LIMIT}.",
            exc_info=True
        )
elif _marketaux_dependencies_met and not _logger_initialized_successfully:
    MARKETAUX_FETCHER_LOGGER.warning(
        f"Using default MarketAux config values (TTL: {NEWS_RAW_FETCH_TTL}s, Limit: {NEWS_FETCH_LIMIT}) due to logger init error."
    )
else:
    MARKETAUX_FETCHER_LOGGER.warning(
        f"Using default MarketAux config values (TTL: {NEWS_RAW_FETCH_TTL}s, Limit: {NEWS_FETCH_LIMIT}) due to core dependency import errors."
    )

async def fetch_marketaux_news(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches raw news data from MarketAux API.
    Caches the raw list of news items (under 'data' key).

    Args:
        symbol: Stock ticker symbol (MarketAux uses 'symbols' parameter).
        client: An active httpx.AsyncClient instance.
        cache: An active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        A list of dictionaries with raw news items, or None on error.
    """
    live_fetch_attempted: bool = False

    if not _marketaux_dependencies_met:
        MARKETAUX_FETCHER_LOGGER.error(
            f"fetch_marketaux_news({symbol}) cannot proceed: Missing core dependencies. Module is non-operational."
        )
        return None
    if not _logger_initialized_successfully:
        MARKETAUX_FETCHER_LOGGER.warning(
            f"fetch_marketaux_news({symbol}): Proceeding with potentially unconfigured/fallback logger."
        )

    source_name = "marketaux"
    data_type = "news"
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"
    MARKETAUX_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to fetch news.")

    api_key = await get_api_key(MARKETAUX_API_KEY_NAME)
    if not api_key:
        MARKETAUX_FETCHER_LOGGER.warning(
            f"{log_prefix} MarketAux API key ('{MARKETAUX_API_KEY_NAME}') not found. Skipping fetch."
        )
        return None
    
    current_news_fetch_limit = NEWS_FETCH_LIMIT
    current_news_language = NEWS_LANGUAGE

    cache_key_params = {"limit": current_news_fetch_limit, "lang": current_news_language}
    cache_key: Optional[str] = None
    try:
        cache_key = generate_cache_key(
            data_type, source_name, symbol_upper, params=cache_key_params
        )
        MARKETAUX_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e_key:
        MARKETAUX_FETCHER_LOGGER.error(
            f"{log_prefix} Failed to generate cache key: {e_key}", exc_info=True
        )
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                if cached_value == FETCH_FAILED_MARKER:
                    MARKETAUX_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT (Previous Fetch Failure). Returning None."
                    )
                    return None
                if isinstance(cached_value, list): # MarketAux returns a list within 'data' field
                    MARKETAUX_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT. Returning {len(cached_value)} raw news items."
                    )
                    return cached_value
                MARKETAUX_FETCHER_LOGGER.warning(
                    f"{log_prefix} Invalid data type ({type(cached_value)}) in cache for '{cache_key}'. Deleting."
                )
                await cache.delete(cache_key)
        except Exception as e_cache_get:
            MARKETAUX_FETCHER_LOGGER.error(
                f"{log_prefix} Error accessing cache during GET for '{cache_key}': {e_cache_get}. Proceeding with live fetch.",
                exc_info=True,
            )
    elif force_refresh and cache_key:
        MARKETAUX_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    MARKETAUX_FETCHER_LOGGER.info(f"{log_prefix} Cache MISS, invalid, or force_refresh. Fetching live data.")
    live_fetch_attempted = True

    api_params: Dict[str, Any] = {
        "api_token": api_key,
        "symbols": symbol_upper,
        "language": current_news_language,
        "limit": current_news_fetch_limit,
    }
    request_url = f"{MARKETAUX_BASE_URL}{MARKETAUX_NEWS_ALL_ENDPOINT}"
    params_for_log = {k:v for k,v in api_params.items() if k != "api_token"}
    MARKETAUX_FETCHER_LOGGER.debug(
        f"{log_prefix} Preparing MarketAux API request to: {request_url} with params: {params_for_log}"
    )

    raw_response_json: Optional[Union[Dict, List]] = await make_api_request(
        client=client,
        method="GET",
        url=request_url,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key, # make_api_request will use this to cache FETCH_FAILED_MARKER on direct comms failure
        source_name_for_log=f"{source_name}_{data_type} for {symbol_upper}",
    )

    news_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        MARKETAUX_FETCHER_LOGGER.error(
            f"{log_prefix} API request failed. Error details logged by make_api_request helper. 'news_to_return' remains None."
        )
        # news_to_return is already None
    elif not isinstance(raw_response_json, dict):
        MARKETAUX_FETCHER_LOGGER.error(
            f"{log_prefix} Unexpected response format. Expected dict, got {type(raw_response_json)}. "
            f"Response: {str(raw_response_json)[:500]}... 'news_to_return' set to None."
        )
        news_to_return = None
    elif "error" in raw_response_json and isinstance(raw_response_json["error"], dict):
        error_details = raw_response_json["error"]
        error_code = error_details.get("code", "N/A")
        error_message = error_details.get("message", "No message")
        MARKETAUX_FETCHER_LOGGER.error(
            f"{log_prefix} MarketAux API returned an error. Code: '{error_code}', Message: '{error_message}'. 'news_to_return' set to None."
        )
        news_to_return = None
    else: # Successful response expected to be a dict with 'data'
        news_data_list: Optional[List[Dict[str, Any]]] = raw_response_json.get("data")
        if isinstance(news_data_list, list):
            num_items = len(news_data_list)
            MARKETAUX_FETCHER_LOGGER.info(
                f"{log_prefix} Successfully fetched {num_items} raw news items. 'news_to_return' set to data list."
            )
            news_to_return = news_data_list # This is the list of news articles
        else: # 'data' key missing or not a list
            MARKETAUX_FETCHER_LOGGER.error(
                f"{log_prefix} Invalid structure in MarketAux response: 'data' key missing or not a list. "
                f"Type found: {type(news_data_list)}. Response: {str(raw_response_json)[:500]}... 'news_to_return' set to None."
            )
            news_to_return = None
    
    # --- Unified Cache Writing Logic ---
    if live_fetch_attempted and cache and cache_key:
        if news_to_return is not None:
            # Successfully fetched and processed data (which is a list of news items for MarketAux)
            try:
                num_items_to_cache = len(news_to_return)
                await cache.set(cache_key, news_to_return, timeout_seconds=NEWS_RAW_FETCH_TTL)
                MARKETAUX_FETCHER_LOGGER.debug(
                    f"{log_prefix} Successfully cached {num_items_to_cache} news items with TTL {NEWS_RAW_FETCH_TTL}s."
                )
            except Exception as e_cache_set:
                MARKETAUX_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache successful news data: {e_cache_set}",
                    exc_info=True,
                )
        else:
            # Live fetch was attempted, but news_to_return is None.
            # This could be due to:
            # 1. make_api_request returning None (network/HTTP error; helper might have already cached failure).
            # 2. API returning an error structure (e.g., {"error": ...}).
            # 3. API returning unexpected/unprocessable structure.
            # We ensure the failure marker is set (or re-set) in the cache.
            MARKETAUX_FETCHER_LOGGER.info(
                f"{log_prefix} Caching failure marker as live fetch resulted in None or unprocessable data."
            )
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            except Exception as e_cache_set_fail:
                MARKETAUX_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache FETCH_FAILED_MARKER: {e_cache_set_fail}",
                    exc_info=True,
                )
    # --- End of Unified Cache Writing Logic ---

    return news_to_return

# (The dead code block previously after this return has been removed)

if _marketaux_dependencies_met and _logger_initialized_successfully:
    MARKETAUX_FETCHER_LOGGER.info(
        f"--- MarketAux Fetcher Module ({MODULE_VERSION}) loaded successfully and logger is operational. ---"
    )
elif _marketaux_dependencies_met:
    MARKETAUX_FETCHER_LOGGER.error(
        f"--- MarketAux Fetcher Module ({MODULE_VERSION}) loaded, BUT WITH LOGGER INITIALIZATION ERRORS. ---"
    )
else:
    MARKETAUX_FETCHER_LOGGER.error(
        f"--- MarketAux Fetcher Module ({MODULE_VERSION}) FAILED TO LOAD due to CRITICAL DEPENDENCY ERRORS. ---"
    )