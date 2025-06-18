# backend/core/fetchers/fmp.py
"""
FMP (Financial Modeling Prep) Fetcher Module

This module provides functions to fetch financial data and news from FMP API.
Handles ratings, company news, and press releases with caching.
"""

import logging
import sys
from typing import List, Optional, Dict, Any, Union
import httpx

# Globális zászló a modul függőségeinek állapotáról
_fmp_dependencies_met = False

try:
    # Core alkalmazás importok
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from ..cache_service import CacheService
    from modules.financehub.backend.core.constants import CacheStatus

    # Helyi fetcher segédfüggvények és konstansok importjai
    from ._base_helpers import (
        generate_cache_key,
        make_api_request,
        get_api_key,
        FETCH_FAILURE_CACHE_TTL # Szükséges a hibás lekérések cache-eléséhez
    )
    from ._fetcher_constants import (
        FETCH_FAILED_MARKER,
        FMP_BASE_URL
    )
    _fmp_dependencies_met = True
    # Az inicializációs logot csak a logger sikeres beállítása után helyezzük el
except ImportError as e:
    # Kritikus hiba, ha az alapvető függőségek nem importálhatók
    logging.basicConfig(level="CRITICAL", stream=sys.stderr, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    critical_logger = logging.getLogger(f"{__name__}.dependency_fallback")
    critical_logger.critical(
        f"FATAL ERROR in fmp.py: Failed to import core dependencies: {e}. Module will be non-operational.",
        exc_info=True
    )
    _fmp_dependencies_met = False
except Exception as general_import_err:
    # Váratlan hiba az importálás során
    logging.basicConfig(level="CRITICAL", stream=sys.stderr, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    critical_logger = logging.getLogger(f"{__name__}.general_import_fallback")
    critical_logger.critical(
        f"FATAL UNEXPECTED ERROR during import in fmp.py: {general_import_err}. Module may be unstable.",
        exc_info=True
    )
    _fmp_dependencies_met = False

# --- Logger Beállítása ---
# A logger példányt itt definiáljuk, hogy a fallback is ezt használja
FMP_FETCHER_LOGGER: logging.Logger

if _fmp_dependencies_met:
    try:
        FMP_FETCHER_LOGGER = get_logger("aevorex_finbot.core.fetchers.fmp")
        FMP_FETCHER_LOGGER.info("--- Initializing FMP Fetcher Module (v3.2 - Cache Logic Refined) ---")
    except Exception as log_init_err:
         _fmp_dependencies_met = False # Ha a logger sem jön össze, a modul használhatatlan
         logging.basicConfig(level="ERROR", stream=sys.stderr, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
         FMP_FETCHER_LOGGER = logging.getLogger(f"{__name__}.logger_init_fallback")
         FMP_FETCHER_LOGGER.error(
             f"CRITICAL: Error initializing configured logger in fmp.py: {log_init_err}. Further FMP operations will use a fallback logger.",
             exc_info=True
        )
else:
    # Ha már az importoknál baj volt, itt is fallback logger
    logging.basicConfig(level="ERROR", stream=sys.stderr, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    FMP_FETCHER_LOGGER = logging.getLogger(f"{__name__}.init_error_fallback")
    FMP_FETCHER_LOGGER.error("fmp.py loaded with missing core dependencies. Fetcher functions will likely fail or be unavailable.")

# --- Cache TTL Konstansok ---
# Default értékek, ha a settings nem elérhető vagy hibás
DEFAULT_FMP_RATINGS_TTL = 86400  # 1 nap (ratings ritkábban változik)
DEFAULT_FMP_NEWS_TTL = 900       # 15 perc (hírek gyakrabban)

FMP_RATINGS_TTL = DEFAULT_FMP_RATINGS_TTL
FMP_NEWS_TTL = DEFAULT_FMP_NEWS_TTL

if _fmp_dependencies_met:
    try:
        # Feltételezzük, hogy a ratings financials jellegű, a news pedig news TTL-t használ
        FMP_RATINGS_TTL = settings.CACHE.FETCH_TTL_FINANCIALS_SECONDS
        FMP_NEWS_TTL = settings.CACHE.NEWS_RAW_FETCH_TTL_SECONDS
        FMP_FETCHER_LOGGER.debug(f"FMP Cache TTLs loaded from settings: Ratings TTL={FMP_RATINGS_TTL}s, News TTL={FMP_NEWS_TTL}s.")
    except AttributeError as ttl_e:
        FMP_FETCHER_LOGGER.warning(
            f"Failed to load FMP Cache TTLs from settings: {ttl_e}. Using default values: "
            f"Ratings TTL={FMP_RATINGS_TTL}s, News TTL={FMP_NEWS_TTL}s. Check config.py."
        )
    except Exception as e_ttl_settings: # Általánosabb hiba a settings olvasásakor
        FMP_FETCHER_LOGGER.error(
            f"Unexpected error loading FMP Cache TTLs from settings: {e_ttl_settings}. Using default values. "
            f"Ratings TTL={FMP_RATINGS_TTL}s, News TTL={FMP_NEWS_TTL}s.",
            exc_info=True
        )
else:
    FMP_FETCHER_LOGGER.warning(
        f"Using default FMP TTL values (Ratings TTL={FMP_RATINGS_TTL}s, News TTL={FMP_NEWS_TTL}s) "
        "due to module initialization errors (missing dependencies or logger setup failure)."
    )


# ==============================================================================
# === Private Helper Functions ===
# ==============================================================================

async def _cache_api_response_data(
    cache_service: CacheService,
    cache_key: str,
    data_to_cache: Optional[List[Dict[str, Any]]],
    success_ttl_seconds: int,
    failure_ttl_seconds: int, # Explicitly pass FETCH_FAILURE_CACHE_TTL
    log_prefix: str,
    logger: logging.Logger
) -> None:
    """
    Helper function to cache API response data or a failure marker.
    """
    if data_to_cache is not None:
        try:
            item_count = len(data_to_cache)
            await cache_service.set(cache_key, data_to_cache, timeout_seconds=success_ttl_seconds)
            logger.debug(f"{log_prefix} Successfully cached {item_count} item(s) with TTL {success_ttl_seconds}s.")
        except Exception as e_cache_set:
            logger.error(f"{log_prefix} Failed to cache successful result (key: {cache_key}): {e_cache_set}", exc_info=True)
    else:
        logger.info(f"{log_prefix} Caching failure marker (key: {cache_key}) as live fetch resulted in None or invalid data.")
        try:
            await cache_service.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=failure_ttl_seconds)
            logger.debug(f"{log_prefix} Successfully cached failure marker with TTL {failure_ttl_seconds}s.")
        except Exception as e_cache_set_failure:
            logger.error(f"{log_prefix} Failed to cache failure marker (key: {cache_key}): {e_cache_set_failure}", exc_info=True)


# ==============================================================================
# === Public FMP Fetcher Functions ===
# ==============================================================================

async def fetch_fmp_historical_ratings(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches historical analyst ratings from the FMP API v3.
    Caches the raw list response on success, or a failure marker.

    Args:
        symbol: Stock symbol.
        client: Active httpx.AsyncClient instance.
        cache: Active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        A list of dictionaries (raw ratings) or None on error.
    """
    logger = FMP_FETCHER_LOGGER # Use module-level logger
    if not _fmp_dependencies_met:
        logger.error(f"fetch_fmp_historical_ratings({symbol}) cannot proceed: Missing core FMP module dependencies.")
        return None

    source_name = "fmp"
    data_type = "ratings_historical" # More specific
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"
    live_fetch_attempted = False

    api_key = await get_api_key("FMP")
    if not api_key:
        logger.warning(f"{log_prefix} FMP API key is not configured or accessible. Skipping fetch.")
        return None

    cache_key: Optional[str] = None
    try:
        cache_key = generate_cache_key(data_type, source_name, symbol_upper)
        logger.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e_key:
        logger.error(f"{log_prefix} Failed to generate cache key: {e_key}", exc_info=True)
        return None # Cannot proceed without a cache key for consistency

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if isinstance(cached_data, list):
                    logger.info(f"{log_prefix} Cache HIT. Returning {len(cached_data)} raw rating items from cache (key: {cache_key}).")
                    return cached_data
                elif cached_data == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT (failure marker). Previous fetch failed. Returning None (key: {cache_key}).")
                    return None
                else:
                    logger.warning(f"{log_prefix} Invalid data type {type(cached_data)} in cache for key '{cache_key}'. Deleting entry.")
                    await cache.delete(cache_key) # Invalidate corrupt cache entry
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}", exc_info=True)
            # Proceed to live fetch on cache read error, as data might be retrievable
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    logger.info(f"{log_prefix} Cache MISS, invalid, or force_refresh. Attempting live data fetch...")
    live_fetch_attempted = True

    api_params = {"apikey": api_key}
    url = f"{FMP_BASE_URL}/v3/historical-rating/{symbol_upper}"
    logger.debug(f"{log_prefix} Preparing FMP API request to URL: {url}")

    raw_response_json: Optional[Union[List, Dict]] = await make_api_request(
        client=client,
        method="GET",
        url=url,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key, # Allow helper to cache critical failures early
        source_name_for_log=f"FMP Historical Ratings for {symbol_upper}"
    )

    ratings_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        logger.error(f"{log_prefix} API request failed or returned no data (error likely logged by make_api_request helper).")
        # ratings_to_return remains None
    elif isinstance(raw_response_json, list):
        ratings_to_return = raw_response_json
        logger.info(f"{log_prefix} Successfully fetched {len(ratings_to_return)} raw rating items from API.")
    elif isinstance(raw_response_json, dict) and "Error Message" in raw_response_json:
        error_msg = raw_response_json["Error Message"]
        logger.error(f"{log_prefix} FMP API returned an error: \"{error_msg}\".")
        # ratings_to_return remains None
    else:
        logger.error(f"{log_prefix} Invalid or unexpected structure in FMP API response. Expected list or error dict, got {type(raw_response_json)}. Response sample: {str(raw_response_json)[:250]}")
        # ratings_to_return remains None

    # --- Cache Writing Logic (if live fetch was attempted) ---
    if live_fetch_attempted and cache and cache_key:
        await _cache_api_response_data(
            cache_service=cache,
            cache_key=cache_key,
            data_to_cache=ratings_to_return,
            success_ttl_seconds=FMP_RATINGS_TTL,
            failure_ttl_seconds=FETCH_FAILURE_CACHE_TTL,
            log_prefix=log_prefix,
            logger=logger
        )

    return ratings_to_return


async def fetch_fmp_stock_news(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches RAW stock-related news from the FMP API v3 (/stock_news).
    Caches the raw news list.

    Args:
        symbol: Stock symbol.
        client: Active httpx.AsyncClient instance.
        cache: Active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        A list of dictionaries (raw news items) or None on error.
    """
    logger = FMP_FETCHER_LOGGER
    if not _fmp_dependencies_met:
        logger.error(f"fetch_fmp_stock_news({symbol}) cannot proceed: Missing core FMP module dependencies.")
        return None

    source_name = "fmp"
    data_type = "news_stock"
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"
    live_fetch_attempted = False

    api_key = await get_api_key("FMP")
    if not api_key:
        logger.warning(f"{log_prefix} FMP API key is not configured or accessible. Skipping fetch.")
        return None

    cache_key: Optional[str] = None
    limit_for_fetch: int
    try:
        limit_for_fetch = settings.NEWS.FETCH_LIMIT
        cache_key_params = {"limit": str(limit_for_fetch)} # Ensure params are consistently string for cache key
        cache_key = generate_cache_key(data_type, source_name, symbol_upper, params=cache_key_params)
        logger.debug(f"{log_prefix} Generated cache key: {cache_key} (limit: {limit_for_fetch})")
    except AttributeError:
        logger.error(f"{log_prefix} Failed to access settings.NEWS.FETCH_LIMIT. Aborting news fetch for {symbol_upper}.")
        return None
    except ValueError as e_key:
        logger.error(f"{log_prefix} Failed to generate cache key: {e_key}", exc_info=True)
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if isinstance(cached_data, list):
                    logger.info(f"{log_prefix} Cache HIT. Returning {len(cached_data)} raw news items from cache (key: {cache_key}).")
                    return cached_data
                elif cached_data == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT (failure marker). Previous fetch failed. Returning None (key: {cache_key}).")
                    return None
                else:
                    logger.warning(f"{log_prefix} Invalid data type {type(cached_data)} in cache for key '{cache_key}'. Deleting entry.")
                    await cache.delete(cache_key)
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}", exc_info=True)
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    logger.info(f"{log_prefix} Cache MISS, invalid, or force_refresh. Attempting live data fetch...")
    live_fetch_attempted = True

    api_params = {
        "tickers": symbol_upper,
        "limit": limit_for_fetch,
        "apikey": api_key
    }
    url = f"{FMP_BASE_URL}/v3/stock_news"
    # Mask API key in log
    logged_params = api_params.copy()
    logged_params["apikey"] = "****"
    logger.debug(f"{log_prefix} Preparing FMP API request to URL: {url} with params: {logged_params}")

    raw_response_json: Optional[Union[List, Dict]] = await make_api_request(
        client=client,
        method="GET",
        url=url,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key,
        source_name_for_log=f"FMP Stock News for {symbol_upper}"
    )

    news_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        logger.error(f"{log_prefix} API request failed or returned no data (error likely logged by make_api_request helper).")
    elif isinstance(raw_response_json, list):
        news_to_return = raw_response_json
        logger.info(f"{log_prefix} Successfully fetched {len(news_to_return)} raw stock news items from API.")
    elif isinstance(raw_response_json, dict) and "Error Message" in raw_response_json:
        error_msg = raw_response_json["Error Message"]
        logger.error(f"{log_prefix} FMP API returned an error: \"{error_msg}\".")
    else:
        logger.error(f"{log_prefix} Invalid or unexpected structure in FMP API response. Expected list or error dict, got {type(raw_response_json)}. Response sample: {str(raw_response_json)[:250]}")

    # --- Cache Writing Logic ---
    if live_fetch_attempted and cache and cache_key:
        await _cache_api_response_data(
            cache_service=cache,
            cache_key=cache_key,
            data_to_cache=news_to_return,
            success_ttl_seconds=FMP_NEWS_TTL,
            failure_ttl_seconds=FETCH_FAILURE_CACHE_TTL,
            log_prefix=log_prefix,
            logger=logger
        )

    return news_to_return


async def fetch_fmp_press_releases(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches RAW press releases from the FMP API v3 (/press-releases/{ticker}).
    Caches the raw press release list.

    Args:
        symbol: Stock symbol.
        client: Active httpx.AsyncClient instance.
        cache: Active FileCacheService instance.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        A list of dictionaries (raw press releases) or None on error.
    """
    logger = FMP_FETCHER_LOGGER
    if not _fmp_dependencies_met:
        logger.error(f"fetch_fmp_press_releases({symbol}) cannot proceed: Missing core FMP module dependencies.")
        return None

    source_name = "fmp"
    data_type = "news_press_releases" # More specific
    symbol_upper = symbol.upper()
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"
    live_fetch_attempted = False

    api_key = await get_api_key("FMP")
    if not api_key:
        logger.warning(f"{log_prefix} FMP API key is not configured or accessible. Skipping fetch.")
        return None

    cache_key: Optional[str] = None
    try:
        # This FMP endpoint typically doesn't take a 'limit' param in the path/query itself for this specific structure.
        # If it did, it would be added to cache_key_params.
        cache_key = generate_cache_key(data_type, source_name, symbol_upper)
        logger.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e_key:
        logger.error(f"{log_prefix} Failed to generate cache key: {e_key}", exc_info=True)
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if isinstance(cached_data, list):
                    logger.info(f"{log_prefix} Cache HIT. Returning {len(cached_data)} raw press release items from cache (key: {cache_key}).")
                    return cached_data
                elif cached_data == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT (failure marker). Previous fetch failed. Returning None (key: {cache_key}).")
                    return None
                else:
                    logger.warning(f"{log_prefix} Invalid data type {type(cached_data)} in cache for key '{cache_key}'. Deleting entry.")
                    await cache.delete(cache_key)
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}", exc_info=True)
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    logger.info(f"{log_prefix} Cache MISS, invalid, or force_refresh. Attempting live data fetch...")
    live_fetch_attempted = True

    api_params = {"apikey": api_key}
    url = f"{FMP_BASE_URL}/v3/press-releases/{symbol_upper}"
    logger.debug(f"{log_prefix} Preparing FMP API request to URL: {url}")

    raw_response_json: Optional[Union[List, Dict]] = await make_api_request(
        client=client,
        method="GET",
        url=url,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key,
        source_name_for_log=f"FMP Press Releases for {symbol_upper}"
    )

    press_releases_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        logger.error(f"{log_prefix} API request failed or returned no data (error likely logged by make_api_request helper).")
    elif isinstance(raw_response_json, list):
        press_releases_to_return = raw_response_json
        logger.info(f"{log_prefix} Successfully fetched {len(press_releases_to_return)} raw press release items from API.")
    elif isinstance(raw_response_json, dict) and "Error Message" in raw_response_json:
        error_msg = raw_response_json["Error Message"]
        logger.error(f"{log_prefix} FMP API returned an error: \"{error_msg}\".")
    else:
        logger.error(f"{log_prefix} Invalid or unexpected structure in FMP API response. Expected list or error dict, got {type(raw_response_json)}. Response sample: {str(raw_response_json)[:250]}")

    # --- Cache Writing Logic ---
    if live_fetch_attempted and cache and cache_key:
        await _cache_api_response_data(
            cache_service=cache,
            cache_key=cache_key,
            data_to_cache=press_releases_to_return,
            success_ttl_seconds=FMP_NEWS_TTL, # Press releases are a form of news
            failure_ttl_seconds=FETCH_FAILURE_CACHE_TTL,
            log_prefix=log_prefix,
            logger=logger
        )

    return press_releases_to_return


# --- Modul betöltésének jelzése a logban ---
if _fmp_dependencies_met:
    FMP_FETCHER_LOGGER.info("--- FMP Fetcher Module (v3.2 - Cache Logic Refined) loaded successfully. ---")
else:
    FMP_FETCHER_LOGGER.error("--- FMP Fetcher Module (v3.2 - Cache Logic Refined) loaded WITH ERRORS due to missing dependencies or logger initialization failure. Module may not function correctly. ---")