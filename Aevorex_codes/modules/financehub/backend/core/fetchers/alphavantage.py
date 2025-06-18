# backend/core/fetchers/alphavantage.py

import logging
import sys
from typing import List, Optional, Dict, Any, Union

import httpx

# --- Modul szintű állapotjelzők ---
_alphavantage_dependencies_met = True  # Optimista kezdet, az importok során változhat
_logger_initialized_successfully = False

# --- Alapvető függőségek importálása ---
try:
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from ..cache_service import CacheService
    from modules.financehub.backend.core.constants import CacheStatus

    from ._base_helpers import (
        generate_cache_key,
        make_api_request,
        get_api_key,
        FETCH_FAILURE_CACHE_TTL,
    )
    from ._fetcher_constants import (
        FETCH_FAILED_MARKER,
        ALPHA_VANTAGE_BASE_URL,
    )
except ImportError as e:
    _alphavantage_dependencies_met = False
    logging.basicConfig(
        level="CRITICAL",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    critical_logger = logging.getLogger(f"{__name__}.dependency_fallback")
    critical_logger.critical(
        f"FATAL ERROR in alphavantage.py: Failed to import core dependencies: {e}. Module will be unusable.",
        exc_info=True,
    )
except Exception as general_import_err:
    _alphavantage_dependencies_met = False
    logging.basicConfig(
        level="CRITICAL",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    critical_logger = logging.getLogger(f"{__name__}.general_import_fallback")
    critical_logger.critical(
        f"FATAL UNEXPECTED ERROR during import in alphavantage.py: {general_import_err}. Module will be unusable.",
        exc_info=True,
    )

# --- Logger Beállítása ---
LOGGER_NAME = "aevorex_finbot.core.fetchers.alphavantage"
MODULE_VERSION = "v3.1" # Verzió konzisztens az eredeti kóddal

if _alphavantage_dependencies_met:
    try:
        AV_FETCHER_LOGGER = get_logger(LOGGER_NAME)
        AV_FETCHER_LOGGER.info(
            f"--- Initializing Alpha Vantage Fetcher Module ({MODULE_VERSION}) ---"
        )
        _logger_initialized_successfully = True
    except Exception as log_init_err:
        logging.basicConfig(
            level="ERROR",
            stream=sys.stderr,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        AV_FETCHER_LOGGER = logging.getLogger(f"{__name__}.logger_init_fallback")
        AV_FETCHER_LOGGER.error(
            f"Error initializing configured logger ({LOGGER_NAME}) in alphavantage.py: {log_init_err}. Using fallback logger.",
            exc_info=True,
        )
else:
    logging.basicConfig(
        level="ERROR",
        stream=sys.stderr,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    AV_FETCHER_LOGGER = logging.getLogger(f"{__name__}.init_error_fallback")
    AV_FETCHER_LOGGER.error(
        f"Alpha Vantage Fetcher Module ({MODULE_VERSION}) core dependencies FAILED to load. Fetcher functions will be non-operational."
    )


# --- Cache TTL Konstansok ---
DEFAULT_AV_NEWS_TTL = 900  # 15 perc
DEFAULT_AV_EARNINGS_TTL = 86400  # 1 nap

AV_NEWS_TTL = DEFAULT_AV_NEWS_TTL
AV_EARNINGS_TTL = DEFAULT_AV_EARNINGS_TTL

if _alphavantage_dependencies_met and _logger_initialized_successfully:
    try:
        AV_NEWS_TTL = settings.CACHE.NEWS_RAW_FETCH_TTL_SECONDS
        AV_EARNINGS_TTL = settings.CACHE.FETCH_TTL_FINANCIALS_SECONDS
        AV_FETCHER_LOGGER.debug(
            "Alpha Vantage Cache TTLs loaded successfully from settings."
        )
    except AttributeError as ttl_e:
        AV_FETCHER_LOGGER.warning(
            f"Failed to load Alpha Vantage Cache TTLs from settings: {ttl_e}. "
            f"Using default values: NEWS_TTL={AV_NEWS_TTL}s, EARNINGS_TTL={AV_EARNINGS_TTL}s. "
            "Verify `settings.CACHE` configuration."
        )
    except Exception as e_ttl_unexpected:
        AV_FETCHER_LOGGER.error(
            f"Unexpected error loading Alpha Vantage Cache TTLs from settings: {e_ttl_unexpected}. "
            f"Using default values: NEWS_TTL={AV_NEWS_TTL}s, EARNINGS_TTL={AV_EARNINGS_TTL}s.",
            exc_info=True
        )
elif _alphavantage_dependencies_met and not _logger_initialized_successfully:
    AV_FETCHER_LOGGER.warning(
        f"Using default Alpha Vantage TTLs (NEWS_TTL={AV_NEWS_TTL}s, EARNINGS_TTL={AV_EARNINGS_TTL}s) "
        "due to logger initialization error, settings access was not attempted with configured logger."
    )
else:
    AV_FETCHER_LOGGER.warning(
        f"Using default Alpha Vantage TTLs (NEWS_TTL={AV_NEWS_TTL}s, EARNINGS_TTL={AV_EARNINGS_TTL}s) "
        "due to critical core dependency import errors. Settings are unavailable."
    )


# --- Alpha Vantage API Funkció Konstansok ---
AV_FUNCTION_NEWS_SENTIMENT = "NEWS_SENTIMENT"
AV_FUNCTION_EARNINGS = "EARNINGS"
AV_API_KEY_NAME = "ALPHAVANTAGE"

# ==============================================================================
# === Public Alpha Vantage Fetcher Functions ===
# ==============================================================================

async def fetch_alpha_vantage_news(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches raw news and sentiment data from the Alpha Vantage API (NEWS_SENTIMENT endpoint).
    Caches the raw list of news items (under the 'feed' key from the response).

    Args:
        symbol: The stock ticker symbol (Alpha Vantage expects a 'tickers' parameter).
        client: An active httpx.AsyncClient instance.
        cache: An active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.
    Returns:
        A list of dictionaries containing raw news/sentiment data, or None if an error occurs
        or no data is found.
    """
    live_fetch_attempted: bool = False

    if not _alphavantage_dependencies_met:
        AV_FETCHER_LOGGER.error(
            f"fetch_alpha_vantage_news({symbol}) cannot proceed: Missing core dependencies. Module is non-operational."
        )
        return None
    if not _logger_initialized_successfully:
        AV_FETCHER_LOGGER.warning(
            f"fetch_alpha_vantage_news({symbol}): Proceeding with potentially unconfigured/fallback logger."
        )

    source_name = "alphavantage"
    data_type = "news_sentiment"
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"

    api_key = await get_api_key(AV_API_KEY_NAME)
    if not api_key:
        AV_FETCHER_LOGGER.warning(
            f"{log_prefix} Alpha Vantage API key ('{AV_API_KEY_NAME}') not found or invalid. Skipping fetch."
        )
        return None

    cache_key: Optional[str] = None
    limit: Optional[int] = None
    try:
        limit = settings.NEWS.FETCH_LIMIT
        cache_key_params = {"limit": limit}
        cache_key = generate_cache_key(
            data_type, source_name, symbol_upper, params=cache_key_params
        )
        AV_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except AttributeError:
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Failed to access settings.NEWS.FETCH_LIMIT. This indicates a configuration issue."
            " News fetch limit cannot be determined. Aborting fetch."
        )
        return None
    except ValueError as e_key:
        AV_FETCHER_LOGGER.error(f"{log_prefix} Failed to generate cache key: {e_key}. Aborting fetch.")
        return None
    except Exception as e_settings:
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Unexpected error accessing settings for FETCH_LIMIT: {e_settings}. Aborting fetch.",
            exc_info=True
        )
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if cached_data == FETCH_FAILED_MARKER:
                    AV_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT (Previous Fetch Failure). Returning None."
                    )
                    return None
                if isinstance(cached_data, list):
                    AV_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT. Returning {len(cached_data)} raw news items from cache."
                    )
                    return cached_data
                else:
                    AV_FETCHER_LOGGER.warning(
                        f"{log_prefix} Invalid data type in cache for key '{cache_key}' "
                        f"(expected list or failure marker, got {type(cached_data)}). Deleting entry."
                    )
                    await cache.delete(cache_key)
        except Exception as e_cache_get:
            AV_FETCHER_LOGGER.error(
                f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}",
                exc_info=True,
            )
            # Proceed to live fetch on cache error
    elif force_refresh and cache_key:
        AV_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    AV_FETCHER_LOGGER.info(f"{log_prefix} Cache MISS, invalid, force_refresh, or cache error. Fetching live data...")
    live_fetch_attempted = True

    api_params = {
        "function": AV_FUNCTION_NEWS_SENTIMENT,
        "tickers": symbol_upper,
        "limit": limit, # limit is guaranteed to be set if we reach here
        "apikey": api_key,
    }
    AV_FETCHER_LOGGER.debug(
        f"{log_prefix} Preparing Alpha Vantage API request to {ALPHA_VANTAGE_BASE_URL} "
        f"with function {AV_FUNCTION_NEWS_SENTIMENT}, limit {limit}."
    )

    raw_response_json: Optional[Union[Dict, List]] = await make_api_request(
        client=client,
        method="GET",
        url=ALPHA_VANTAGE_BASE_URL,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key,
        source_name_for_log=f"{source_name}_{data_type} for {symbol_upper}",
    )

    news_feed_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} API request failed. make_api_request returned None."
        )
        # news_feed_to_return remains None
    elif not isinstance(raw_response_json, dict):
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Unexpected API response format. Expected dict, got {type(raw_response_json)}. "
            f"Response: {str(raw_response_json)[:500]}..."
        )
        # news_feed_to_return remains None
    elif "Error Message" in raw_response_json:
        error_msg = raw_response_json["Error Message"]
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Alpha Vantage API returned an error: \"{error_msg}\"."
        )
        # news_feed_to_return remains None
    elif "Information" in raw_response_json:
        info_msg = raw_response_json["Information"]
        AV_FETCHER_LOGGER.warning(
            f"{log_prefix} Alpha Vantage API returned an informational message: \"{info_msg}\". "
            "This might indicate a rate limit or other non-critical issue. "
            "Treating as fetch failure for caching purposes."
        )
        # news_feed_to_return remains None; will be cached as failure if live_fetch_attempted
    else:
        news_feed_from_response = raw_response_json.get("feed")
        if isinstance(news_feed_from_response, list):
            AV_FETCHER_LOGGER.info(
                f"{log_prefix} Successfully fetched {len(news_feed_from_response)} raw news/sentiment items."
            )
            news_feed_to_return = news_feed_from_response
        else:
            AV_FETCHER_LOGGER.error(
                f"{log_prefix} Invalid structure in successful Alpha Vantage news response: "
                f"'feed' key missing or not a list (got {type(news_feed_from_response)}). Response: {str(raw_response_json)[:500]}..."
            )
            # news_feed_to_return remains None

    # --- Unified Cache Writing Logic ---
    if live_fetch_attempted and cache and cache_key:
        if news_feed_to_return is not None: # Successful live fetch and processing
            try:
                await cache.set(cache_key, news_feed_to_return, timeout_seconds=AV_NEWS_TTL)
                AV_FETCHER_LOGGER.debug(f"{log_prefix} Successfully cached {len(news_feed_to_return)} items with TTL {AV_NEWS_TTL}s.")
            except Exception as e_cache_set:
                AV_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache successful news data: {e_cache_set}",
                    exc_info=True,
                )
        else: # Live fetch occurred, but result is None (API error, processing error, "Information" message, etc.)
            AV_FETCHER_LOGGER.info(f"{log_prefix} Caching failure marker as live fetch resulted in None or invalid data for news.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            except Exception as e_cache_set_fail:
                AV_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache FETCH_FAILED_MARKER for news: {e_cache_set_fail}",
                    exc_info=True,
                )
    
    return news_feed_to_return

async def fetch_alpha_vantage_earnings(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Fetches raw earnings data (annual and quarterly) from the Alpha Vantage API (EARNINGS endpoint).
    Caches the raw dictionary containing 'annualEarnings' and 'quarterlyEarnings' lists.

    Args:
        symbol: The stock ticker symbol.
        client: An active httpx.AsyncClient instance.
        cache: An active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        A dictionary with raw earnings data (typically includes 'symbol',
        'annualEarnings', 'quarterlyEarnings' keys), or None if an error occurs or no data.
    """
    live_fetch_attempted: bool = False

    if not _alphavantage_dependencies_met:
        AV_FETCHER_LOGGER.error(
            f"fetch_alpha_vantage_earnings({symbol}) cannot proceed: Missing core dependencies. Module is non-operational."
        )
        return None
    if not _logger_initialized_successfully:
        AV_FETCHER_LOGGER.warning(
            f"fetch_alpha_vantage_earnings({symbol}): Proceeding with potentially unconfigured/fallback logger."
        )

    source_name = "alphavantage"
    data_type = "earnings"
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"

    api_key = await get_api_key(AV_API_KEY_NAME)
    if not api_key:
        AV_FETCHER_LOGGER.warning(
            f"{log_prefix} Alpha Vantage API key ('{AV_API_KEY_NAME}') not found or invalid. Skipping fetch."
        )
        return None

    # --- Cache Key Generation ---
    cache_key: Optional[str] = None
    try:
        cache_key = generate_cache_key(data_type, source_name, symbol_upper)
        AV_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e_key:
        AV_FETCHER_LOGGER.error(f"{log_prefix} Failed to generate cache key: {e_key}. Aborting fetch.")
        return None
    except Exception as e_gen_key: # Catch any other unexpected error during key generation
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Unexpected error generating cache key: {e_gen_key}. Aborting fetch.",
            exc_info=True
        )
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if cached_data == FETCH_FAILED_MARKER:
                    AV_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT (Previous Fetch Failure). Returning None."
                    )
                    return None
                if (isinstance(cached_data, dict) and
                        "annualEarnings" in cached_data and isinstance(cached_data.get("annualEarnings"), list) and
                        "quarterlyEarnings" in cached_data and isinstance(cached_data.get("quarterlyEarnings"), list)):
                    AV_FETCHER_LOGGER.info(
                        f"{log_prefix} Cache HIT. Returning structured earnings data from cache."
                    )
                    return cached_data
                else:
                    AV_FETCHER_LOGGER.warning(
                        f"{log_prefix} Invalid or incomplete data type/structure in cache for key '{cache_key}'. Deleting entry."
                    )
                    await cache.delete(cache_key)
        except Exception as e_cache_get:
            AV_FETCHER_LOGGER.error(
                f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}",
                exc_info=True,
            )
            # Proceed to live fetch on cache error
    elif force_refresh and cache_key:
        AV_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    AV_FETCHER_LOGGER.info(f"{log_prefix} Cache MISS, invalid, force_refresh, or cache error. Fetching live earnings data...")
    live_fetch_attempted = True

    # --- API Call ---
    api_params = {
        "function": AV_FUNCTION_EARNINGS,
        "symbol": symbol_upper,
        "apikey": api_key,
    }
    AV_FETCHER_LOGGER.debug(
        f"{log_prefix} Preparing Alpha Vantage API request to {ALPHA_VANTAGE_BASE_URL} "
        f"with function {AV_FUNCTION_EARNINGS}."
    )

    raw_response_json: Optional[Union[Dict, List]] = await make_api_request(
        client=client,
        method="GET",
        url=ALPHA_VANTAGE_BASE_URL,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key,
        source_name_for_log=f"{source_name}_{data_type} for {symbol_upper}",
    )

    # --- Response Processing ---
    earnings_data_processed: Optional[Dict[str, Any]] = None

    if raw_response_json is None:
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} API request failed. make_api_request returned None."
        )
        # earnings_data_processed remains None
    elif not isinstance(raw_response_json, dict):
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Unexpected API response format. Expected dict, got {type(raw_response_json)}. "
            f"Response: {str(raw_response_json)[:500]}..."
        )
        # earnings_data_processed remains None
    elif "Error Message" in raw_response_json:
        error_msg = raw_response_json["Error Message"]
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Alpha Vantage API returned an error: \"{error_msg}\"."
        )
        # earnings_data_processed remains None
    elif "Information" in raw_response_json:
        info_msg = raw_response_json["Information"]
        AV_FETCHER_LOGGER.warning(
            f"{log_prefix} Alpha Vantage API returned an informational message: \"{info_msg}\". "
            "This might indicate a rate limit or 'no data for symbol'. "
            "Treating as fetch failure for caching purposes."
        )
        # earnings_data_processed remains None; will be cached as failure if live_fetch_attempted
    elif not raw_response_json: # Checks if the dictionary is empty {}
        AV_FETCHER_LOGGER.warning(
            f"{log_prefix} Alpha Vantage returned an empty JSON object ('{{}}'), "
            "indicating no earnings data available for the symbol."
        )
        # earnings_data_processed remains None
    elif (isinstance(raw_response_json.get("symbol"), str) and
          isinstance(raw_response_json.get("annualEarnings"), list) and
          isinstance(raw_response_json.get("quarterlyEarnings"), list)):
        
        earnings_data_processed = raw_response_json
        num_annual = len(earnings_data_processed["annualEarnings"])
        num_quarterly = len(earnings_data_processed["quarterlyEarnings"])

        AV_FETCHER_LOGGER.info(
            f"{log_prefix} Successfully fetched earnings data for '{earnings_data_processed['symbol']}' "
            f"({num_annual} annual, {num_quarterly} quarterly reports)."
        )
    else:
        AV_FETCHER_LOGGER.error(
            f"{log_prefix} Invalid structure in successful Alpha Vantage earnings response: "
            "Missing or malformed 'symbol', 'annualEarnings', or 'quarterlyEarnings' keys/types. "
            f"Response: {str(raw_response_json)[:500]}..."
        )
        # earnings_data_processed remains None

    # --- Unified Cache Writing Logic ---
    if live_fetch_attempted and cache and cache_key:
        if earnings_data_processed is not None: # Successful live fetch and valid data
            try:
                await cache.set(cache_key, earnings_data_processed, timeout_seconds=AV_EARNINGS_TTL)
                AV_FETCHER_LOGGER.debug(
                    f"{log_prefix} Successfully cached earnings data with TTL {AV_EARNINGS_TTL}s."
                )
            except Exception as e_cache_set:
                AV_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache successful earnings data: {e_cache_set}",
                    exc_info=True,
                )
        else: # Live fetch occurred, but result is None or invalid
            AV_FETCHER_LOGGER.info(f"{log_prefix} Caching failure marker as live fetch resulted in None or invalid data for earnings.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            except Exception as e_cache_set_fail:
                AV_FETCHER_LOGGER.error(
                    f"{log_prefix} Failed to cache FETCH_FAILED_MARKER for earnings: {e_cache_set_fail}",
                    exc_info=True,
                )
    
    return earnings_data_processed

# --- Modul betöltésének végső jelzése ---
if _alphavantage_dependencies_met and _logger_initialized_successfully:
    AV_FETCHER_LOGGER.info(
        f"--- Alpha Vantage Fetcher Module ({MODULE_VERSION}) loaded successfully and logger is operational. ---"
    )
elif _alphavantage_dependencies_met:
    AV_FETCHER_LOGGER.error(
        f"--- Alpha Vantage Fetcher Module ({MODULE_VERSION}) loaded, BUT WITH LOGGER INITIALIZATION ERRORS. "
        "Functionality may be impaired or logs may be incomplete. ---"
    )
else:
    AV_FETCHER_LOGGER.error(
        f"--- Alpha Vantage Fetcher Module ({MODULE_VERSION}) FAILED TO LOAD due to missing critical dependencies. "
        "All fetcher functions in this module are NON-OPERATIONAL. ---"
    )