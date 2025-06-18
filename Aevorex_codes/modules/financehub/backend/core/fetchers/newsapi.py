# backend/core/fetchers/newsapi.py

import logging
import sys
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone # Unused if 'from' date is fully removed
import httpx

_newsapi_dependencies_met = False
try:
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from ..cache_service import CacheService

     # === Helyesbített Importok (Pylance hibák alapján) ===
    from ._base_helpers import (
        generate_cache_key,
        make_api_request,
        get_api_key,
        FETCH_FAILURE_CACHE_TTL # <<< HOZZÁADVA EZ AZ IMPORT
    )
    from ._fetcher_constants import (
        FETCH_FAILED_MARKER,
        NEWSAPI_BASE_URL
    )
    # === Importok Vége ===
    _newsapi_dependencies_met = True
except ImportError as e:
    logging.basicConfig(level="CRITICAL", stream=sys.stderr)
    critical_logger = logging.getLogger(f"{__name__}.dependency_fallback")
    critical_logger.critical(
        f"FATAL ERROR in newsapi.py: Failed to import core dependencies: {e}. Module unusable.",
        exc_info=True
    )
    _newsapi_dependencies_met = False
except Exception as general_import_err: #pylint: disable=broad-except
    logging.basicConfig(level="CRITICAL", stream=sys.stderr)
    critical_logger = logging.getLogger(f"{__name__}.general_import_fallback")
    critical_logger.critical(
        f"FATAL UNEXPECTED ERROR during import in newsapi.py: {general_import_err}.",
        exc_info=True
    )
    _newsapi_dependencies_met = False

# --- Logger Beállítása ---
if _newsapi_dependencies_met:
    try:
        NEWSAPI_FETCHER_LOGGER = get_logger("aevorex_finbot.core.fetchers.newsapi")
        # Verzió frissítve a cache refaktorálás jelzésére
        NEWSAPI_FETCHER_LOGGER.info("--- Initializing NewsAPI.org Fetcher Module (v3.1 - Cache Refactor) ---")
    except Exception as log_init_err: #pylint: disable=broad-except
         _newsapi_dependencies_met = False
         logging.basicConfig(level="ERROR", stream=sys.stderr)
         NEWSAPI_FETCHER_LOGGER = logging.getLogger(f"{__name__}.logger_init_fallback")
         NEWSAPI_FETCHER_LOGGER.error(f"Error initializing configured logger in newsapi.py: {log_init_err}", exc_info=True)
else:
    logging.basicConfig(level="ERROR", stream=sys.stderr)
    NEWSAPI_FETCHER_LOGGER = logging.getLogger(f"{__name__}.init_error_fallback")
    NEWSAPI_FETCHER_LOGGER.error("newsapi.py loaded with missing core dependencies. Fetcher functions will likely fail.")

# --- Cache TTL Konstansok ---
# Default érték, ha a settings nem elérhető vagy hibás
NEWSAPI_NEWS_TTL = 900     # 15 perc

if _newsapi_dependencies_met:
    try:
        NEWSAPI_NEWS_TTL = settings.CACHE.NEWS_RAW_FETCH_TTL_SECONDS
        NEWSAPI_FETCHER_LOGGER.debug("NewsAPI Cache TTL loaded from settings.")
    except AttributeError as ttl_e:
        NEWSAPI_FETCHER_LOGGER.warning(f"Failed to load NewsAPI Cache TTL settings: {ttl_e}. Using default value. Check config.py.")
else:
    NEWSAPI_FETCHER_LOGGER.warning("Using default NewsAPI TTL value due to previous import errors.")

# ==============================================================================
# === Public NewsAPI Fetcher Function ===
# ==============================================================================

async def fetch_newsapi_news(
    symbol: str, client: httpx.AsyncClient, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """
    Lekéri a NYERS hírlistát a NewsAPI.org API (/everything) végpontról.
    Cache-eli a nyers hírlistát ('articles' kulcs alól).
    Mindig a legfrissebb ('publishedAt' szerint rendezett) híreket kéri le.

    Args:
        symbol: Tőzsdei szimbólum. Ezt használja a query (`q`) paraméterhez.
        client: Aktív httpx.AsyncClient példány.
        cache: Aktív FileCacheService példány.
        force_refresh: If True, bypasses cache and fetches live data.

    Returns:
        Lista szótárakkal (nyers hírek) vagy None hiba esetén.
    """
    if not _newsapi_dependencies_met:
        NEWSAPI_FETCHER_LOGGER.error(f"fetch_newsapi_news({symbol}) cannot proceed: Missing core dependencies.")
        return None

    source_name = "newsapi"
    data_type = "news"
    symbol_upper = symbol.upper()
    logger = NEWSAPI_FETCHER_LOGGER
    log_prefix = f"[{symbol_upper}][{source_name}_{data_type}]"
    live_fetch_attempted: bool = False

    api_key = await get_api_key("NEWSAPI")
    if not api_key:
        logger.warning(f"{log_prefix} NewsAPI API key missing. Skipping fetch.")
        return None

    # --- Paraméterek és Cache Kulcs Előkészítése ---
    limit_for_fetch: int
    language: str = "en" # Vagy settings.NEWS_API_CONFIG.LANGUAGE.value
    sort_by_for_api: str = "publishedAt" # Legfrissebbek elöl

    cache_key: Optional[str] = None

    try:
        limit_for_fetch = settings.NEWS.FETCH_LIMIT # Betöltjük a limitet

        # Cache kulcs paraméterek - a 'from' dátumot már nem használjuk az API hívásban,
        # így a cache kulcsból is kivettük a max_age-et a konzisztencia érdekében.
        cache_key_params: Dict[str, Union[int, str]] = {
            "limit": limit_for_fetch,
            "lang": language,
            "sort": sort_by_for_api # Használjuk ugyanazt a sort_by-t a kulcsban, mint az API-ban
        }
        cache_key = generate_cache_key(data_type, source_name, symbol_upper, params=cache_key_params)
        logger.debug(f"{log_prefix} Generated cache key: {cache_key}")

    except AttributeError as e_settings:
        logger.error(f"{log_prefix} Failed to access settings for news parameters (e.g., FETCH_LIMIT): {e_settings}. Aborting.")
        return None
    except ValueError as e_key:
        logger.error(f"{log_prefix} Failed to generate cache key: {e_key}. Aborting as cache key is crucial.")
        return None # Fontos, hogy itt None-t adjunk vissza, mert cache_key nélkül nem tudunk cache-elni

    # --- Cache Ellenőrzés ---
    if not force_refresh and cache and cache_key: # Biztosítjuk, hogy cache_key létezzen
        try:
            cached_data = await cache.get(cache_key)
            if cached_data is not None:
                if isinstance(cached_data, list): # NewsAPI 'articles' is a list
                    logger.info(f"{log_prefix} Cache HIT. Returning {len(cached_data)} raw items.")
                    return cached_data
                elif cached_data == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT indicates previous fetch failure. Returning None.")
                    return None
                else:
                    logger.warning(f"{log_prefix} Invalid data type in cache ({type(cached_data)}). Deleting entry.")
                    await cache.delete(cache_key)
        except Exception as e_cache_get: #pylint: disable=broad-except
            logger.error(f"{log_prefix} Error accessing cache during GET for key '{cache_key}': {e_cache_get}", exc_info=True)
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")
    elif not cache_key: # Should have been caught by previous return None, but as a safeguard.
        logger.error(f"{log_prefix} Cache key is None. Cannot proceed with cache operations or fetch. Aborting.")
        return None


    logger.info(f"{log_prefix} Cache MISS, invalid, or force_refresh. Fetching live data...")
    live_fetch_attempted = True

    query = f'"{symbol_upper}" OR "{symbol}"' # Try to match variations
    logger.debug(f"{log_prefix} Using query: {query}")

    # === API PARAMÉTEREK ÖSSZEÁLLÍTÁSA ITT, MIUTÁN MINDEN VÁLTOZÓ ISMERT ===
    api_params: Dict[str, Any] = {
        "q": query,
        "language": language,
        "sortBy": sort_by_for_api, # Használjuk a fent definiáltat ("publishedAt")
        "pageSize": limit_for_fetch,
        "apiKey": api_key
        # NINCS 'from' paraméter, így mindig a legfrissebbeket kéri (a NewsAPI default viselkedése a /everything végponton, ha nincs 'from'/'to')
    }
    # ===================================================================

    url = f"{NEWSAPI_BASE_URL}/everything"
    params_for_log = {k:v for k,v in api_params.items() if k != 'apiKey'}
    logger.debug(f"{log_prefix} Preparing NewsAPI request to {url} with params: {params_for_log}")

    raw_response_json: Optional[Union[Dict, List]] = await make_api_request(
        client=client,
        method="GET",
        url=url,
        params=api_params,
        cache_service=cache,
        cache_key_for_failure=cache_key, # make_api_request will cache failure on HTTP errors
        source_name_for_log=f"{source_name}_{data_type} for {symbol_upper}"
    )

    news_to_return: Optional[List[Dict[str, Any]]] = None

    if raw_response_json is None:
        logger.error(f"{log_prefix} API request failed (error logged by make_api_request helper, or it returned None).")
        # news_to_return remains None. make_api_request should have cached failure marker if it was a transport error.
    elif not isinstance(raw_response_json, dict): # NewsAPI response is a dict
        logger.error(f"{log_prefix} Unexpected response format from NewsAPI (expected dict, got {type(raw_response_json)}). Response: {str(raw_response_json)[:200]}")
        # news_to_return remains None
    else: # Is a dict, check 'status'
        response_status = raw_response_json.get("status")
        if response_status == "ok":
            articles_list = raw_response_json.get("articles")
            if isinstance(articles_list, list):
                news_to_return = articles_list
                logger.info(f"{log_prefix} Successfully fetched {len(news_to_return)} raw news articles.")
            else: # Status 'ok' but 'articles' missing or not a list
                logger.error(f"{log_prefix} Invalid structure in successful NewsAPI response: 'articles' key missing or not a list. Response: {str(raw_response_json)[:300]}...")
                # news_to_return remains None
        else: # status != "ok"
            error_code = raw_response_json.get("code")
            error_message = raw_response_json.get("message")
            logger.error(f"{log_prefix} NewsAPI returned error status '{response_status}': Code='{error_code}', Message='{error_message}'.")
            # news_to_return remains None

    # --- Egységes Cache Írási Logika ---
    # Csak akkor próbálunk cache-be írni, ha volt élő lekérdezési kísérlet ÉS van érvényes cache_key
    if live_fetch_attempted and cache and cache_key:
        if news_to_return is not None: # Successfully fetched and processed data
            if isinstance(news_to_return, list):
                try:
                    await cache.set(cache_key, news_to_return, timeout_seconds=NEWSAPI_NEWS_TTL)
                    logger.debug(f"{log_prefix} Successfully cached {len(news_to_return)} articles for key '{cache_key}'.")
                except Exception as e_cache_set: #pylint: disable=broad-except
                    logger.error(f"{log_prefix} Failed to cache successful result for key '{cache_key}': {e_cache_set}", exc_info=True)
            else:
                logger.warning(f"{log_prefix} Live fetch resulted in non-list data for news_to_return. Type: {type(news_to_return)}. Caching failure marker for key '{cache_key}'.")
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_failure_safeguard: #pylint: disable=broad-except
                    logger.error(f"{log_prefix} Failed to cache failure marker (safeguard) for key '{cache_key}': {e_cache_set_failure_safeguard}", exc_info=True)
        else: # Live fetch attempted, but result is None (API error, processing error, status not "ok", etc.)
            logger.info(f"{log_prefix} Caching failure marker as live fetch resulted in None or invalid data for news for key '{cache_key}'.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                logger.debug(f"{log_prefix} Successfully cached failure marker for key '{cache_key}'.")
            except Exception as e_cache_set_failure: #pylint: disable=broad-except
                logger.error(f"{log_prefix} Failed to cache failure marker for key '{cache_key}': {e_cache_set_failure}", exc_info=True)

    return news_to_return


# --- Modul betöltésének jelzése ---
if _newsapi_dependencies_met:
    NEWSAPI_FETCHER_LOGGER.info("--- NewsAPI.org Fetcher Module (v3.1 - Cache Refactor) loaded successfully. ---")
else:
    NEWSAPI_FETCHER_LOGGER.error("--- NewsAPI.org Fetcher Module (v3.1 - Cache Refactor) loaded WITH ERRORS due to missing dependencies. ---")