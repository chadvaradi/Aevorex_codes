# -*- coding: utf-8 -*-
"""
Base Helpers for Financial Data Fetchers

Common utility functions and configuration helpers shared across all fetcher modules.
Handles HTTP client setup, error management, and response processing.

Dependencies:
- Central configuration (settings)
- HTTPX for async HTTP operations
- Standard logging

File: _base_helpers.py
Version: v2.1.0 (2025-01-16)
"""

import time
import json
import sys
import logging
import hashlib # Added for generate_cache_key
from typing import List, Optional, Dict, Any, Final, Union, Callable, Awaitable
import httpx
from pydantic import SecretStr, HttpUrl
from ..cache_service import CacheService
import asyncio
import aiohttp
import pandas as pd
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

# Import configuration using correct module path
from modules.financehub.backend.config import settings

# --- Core Module Imports ---
try:
    from modules.financehub.backend.utils.logger_config import get_logger
    # --- MODIFIED: Import shared static constants ---
    from ._fetcher_constants import FETCH_FAILED_MARKER # Only import what's needed by _base_helpers
    BASE_FETCHER_LOGGER = get_logger("aevorex_finbot.core.fetchers._base_helpers")
except ImportError as e: # Keep this broad import error for critical deps
    logging.basicConfig(level="CRITICAL", stream=sys.stderr)
    critical_logger = logging.getLogger(f"{__name__}.init_fallback")
    critical_logger.critical(
        f"FATAL ERROR: Failed to import core dependencies (settings, logger, CacheService, _fetcher_constants) "
        f"in FetcherBaseHelpers: {e}. Check project structure and import paths. "
        f"Current module path: {__name__}. Application startup cannot continue reliably.",
        exc_info=True
    )
    raise RuntimeError(
        f"FetcherBaseHelpers failed initialization due to missing core dependencies: {e}"
    ) from e

# --- Logger ---
BASE_HELPER_LOGGER = get_logger("aevorex_finbot.core.fetchers._base_helpers") # Already defined, use it
BASE_HELPER_LOGGER.info("--- Initializing Fetcher Base Helpers Module (v3.0) ---")

# --- Common Constants (Derived from Settings or Specific to _base_helpers logic) ---
# --- REMOVED STATIC CONSTANTS MOVED TO _fetcher_constants.py ---
# FETCH_FAILED_MARKER -> Now imported
# DEFAULT_NA_VALUE -> Moved (if used by _base_helpers, import it)
# OHLCV_REQUIRED_COLS -> Moved
# API Base URLs -> Moved

# --- Configuration Loading (Constants dependent on settings remain here) ---
try:
    HTTP_TIMEOUT: Final[float] = settings.HTTP_CLIENT.REQUEST_TIMEOUT_SECONDS
    HTTP_USER_AGENT: Final[str] = settings.HTTP_CLIENT.USER_AGENT
    HTTP_REFERER: Final[str] = str(settings.HTTP_CLIENT.DEFAULT_REFERER)

    FETCH_FAILURE_CACHE_TTL: Final[int] = settings.CACHE.FETCH_FAILURE_TTL_SECONDS
    CACHE_ENABLED: Final[bool] = settings.CACHE.ENABLED

    BASE_HELPER_LOGGER.info("Successfully loaded required HTTP Client and Cache settings.")
    BASE_HELPER_LOGGER.debug(f"HTTP Timeout: {HTTP_TIMEOUT}s, User-Agent set, Referer set, "
                           f"Cache Failure TTL: {FETCH_FAILURE_CACHE_TTL}s, Cache Enabled: {CACHE_ENABLED}")

except AttributeError as config_e:
    BASE_HELPER_LOGGER.critical(
        f"FATAL ERROR reading essential HTTP/Cache settings in FetcherBaseHelpers: {config_e}. "
        f"Check config.py structure (settings.HTTP_CLIENT and settings.CACHE sections).",
        exc_info=False
    )
    raise RuntimeError(
        f"Failed to load required HTTP/Cache settings from config.py: {config_e}"
    ) from config_e
except Exception as general_config_e:
     BASE_HELPER_LOGGER.critical(
        f"FATAL ERROR during configuration loading in FetcherBaseHelpers: {general_config_e}.",
        exc_info=True
    )
     raise RuntimeError(
        f"Unexpected error loading configuration: {general_config_e}"
    ) from general_config_e


# ==============================================================================
# === Helper Function for Cache Key Generation (Moved here for clarity) ===
# ==============================================================================
def generate_cache_key(
    data_type: str,
    source: str,
    identifier: str,
    params: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generál egy konzisztens cache kulcsot a megadott paraméterek alapján.
    MD5 hash-t használ a rövidség és konzisztencia érdekében, ha a paraméterek túl hosszúak.

    Args:
        data_type: Az adat típusa (pl. "ohlcv", "news", "info").
        source: Az adatforrás (pl. "yfinance", "eodhd", "fmp").
        identifier: A fő azonosító (pl. ticker szimbólum "AAPL.US", "general_news").
        params: Opcionális szótár további paraméterekkel, amik befolyásolják
                a lekérdezést (pl. {"period": "1y", "interval": "1d"}).
                A kulcsok és értékek stringgé lesznek konvertálva és rendezve.

    Returns:
        A generált cache kulcs stringként.

    Raises:
        ValueError: Ha a data_type, source vagy identifier üres string.
    """
    if not all([data_type, source, identifier]):
        raise ValueError("data_type, source, and identifier cannot be empty for cache key generation.")

    # Összeállítjuk az alap kulcsrészt
    key_parts = [data_type.lower(), source.lower(), identifier.upper()]

    # Paraméterek hozzáadása, rendezve a konzisztencia érdekében
    if params:
        # Győződjünk meg róla, hogy minden stringgé lesznek konvertálva
        # Rendezés kulcs szerint, majd érték szerint a konzisztens sorrendért
        sorted_params = sorted(
            (str(k), str(v)) for k, v in params.items() if v is not None
        )
        param_str_parts = [f"{k}={v}" for k, v in sorted_params]
        param_string = "&".join(param_str_parts)
        key_parts.append(param_string)

    raw_key = ":".join(key_parts)

    # Ha a kulcs túl hosszú, használjunk MD5 hash-t (opcionális, de ajánlott)
    # Egyébként a Redis kulcsok nagyon hosszúak lehetnek.
    # A thresholdot a saját igényeid szerint állíthatod.
    MAX_KEY_LENGTH_BEFORE_HASH = 150 # Példa érték
    if len(raw_key) > MAX_KEY_LENGTH_BEFORE_HASH:
        # A prefixet megtartjuk a könnyebb azonosíthatóság érdekében
        prefix = ":".join([data_type.lower(), source.lower(), identifier.upper()])
        hashed_suffix = hashlib.md5(raw_key.encode('utf-8')).hexdigest()
        return f"{prefix}:MD5:{hashed_suffix}"
    else:
        return raw_key

# ==============================================================================
# === Common Helper Functions ===
# ==============================================================================

async def get_api_key(key_name: str) -> Optional[str]:
    """
    Visszaadja az API kulcsot stringként, ha megtalálható és érvényes.
    None, ha a kulcs hiányzik, üres, vagy hiba történt a lekérés során.

    Args:
        key_name: A keresett API kulcs neve (pl. "EODHD", "FMP").
                 Nagybetűssé lesz alakítva a settings objektumban való kereséshez.

    Returns:
        Az API kulcs stringként, vagy None hiba/hiány esetén.
    """
    logger = BASE_FETCHER_LOGGER # Use the module-level logger instance
    log_prefix = f"[get_api_key({key_name})]"
    api_key_secret: Optional[SecretStr] = None
    key_name_upper = key_name.upper()

    try:
        if not hasattr(settings, 'API_KEYS') or settings.API_KEYS is None:
             logger.warning(f"{log_prefix} 'settings.API_KEYS' structure not found or is None.")
             return None

        api_key_secret = getattr(settings.API_KEYS, key_name_upper, None)
        
        loaded_value = api_key_secret.get_secret_value() if isinstance(api_key_secret, SecretStr) else None
        # More careful debug logging for sensitive data
        logger.debug(f"{log_prefix} Read from settings for '{key_name_upper}'. Value detected: {'Yes' if loaded_value else 'No/Empty/WrongType'}")

        if api_key_secret is None:
            logger.warning(f"{log_prefix} API Key attribute '{key_name_upper}' not found or not configured in settings.API_KEYS.")
            return None

        if not isinstance(api_key_secret, SecretStr):
            logger.error(f"{log_prefix} API Key '{key_name_upper}' is configured but is not a SecretStr type (type: {type(api_key_secret)}). Treating as invalid.")
            logger.debug(f"{log_prefix} Invalid value found for '{key_name_upper}': {str(api_key_secret)[:10]}...") # Log a preview safely
            return None

        secret_value = api_key_secret.get_secret_value()

        if not secret_value or not secret_value.strip():
            logger.warning(f"{log_prefix} API Key '{key_name_upper}' is configured but the secret value is empty or whitespace.")
            return None

        logger.debug(f"{log_prefix} Successfully retrieved and validated API key for '{key_name_upper}'.")
        return secret_value

    except AttributeError as e:
        logger.error(f"{log_prefix} Error accessing expected attribute '{key_name_upper}' within API Keys structure: {e}", exc_info=False)
        return None
    except Exception as e:
        logger.error(f"{log_prefix} Unexpected error retrieving API key for '{key_name_upper}': {e}", exc_info=True)
        return None

async def make_api_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *, 
    source_name_for_log: str,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, Any]] = None,
    cache_service: Optional[CacheService] = None,
    cache_key_for_failure: Optional[str] = None,
) -> Optional[Union[Dict, List, str]]:
    """
    Végrehajt egy aszinkron HTTP kérést robusztus hibakezeléssel és
    opcionálisan a tartós hibák cache-elésével.

    FONTOS: Ez a függvény a `FETCH_FAILED_MARKER`-t használja, amit a
    `_fetcher_constants`-ból importál (ha sikeres volt az import fentebb).
    """
    logger = BASE_HELPER_LOGGER
    log_prefix = f"[{source_name_for_log}]"

    can_check_cache_failure = CACHE_ENABLED and cache_service is not None and cache_key_for_failure is not None
    if can_check_cache_failure:
        try:
            cached_failure = await cache_service.get(cache_key_for_failure)
            if cached_failure == FETCH_FAILED_MARKER: # FETCH_FAILED_MARKER from _fetcher_constants via import
                logger.warning(f"{log_prefix} Found persistent failure marker in cache (Key: {cache_key_for_failure}). Skipping live request.")
                return None
        except Exception as e_cache_get:
             logger.error(f"{log_prefix} Error checking cache for failure marker (Key: {cache_key_for_failure}): {e_cache_get}", exc_info=False)

    #request_headers = {"User-Agent": HTTP_USER_AGENT, "Referer": HTTP_REFERER}
    # request_headers = {"User-Agent": HTTP_USER_AGENT, "Referer": HTTP_REFERER}
# if headers:
#     temp_headers = headers.copy()
#     temp_headers.pop("User-Agent", None); temp_headers.pop("user-agent", None)
#     temp_headers.pop("Referer", None); temp_headers.pop("referer", None)
#     request_headers.update(temp_headers)
    # Egyszerűsített fejlécek a teszthez:
    request_headers = {"User-Agent": "Mozilla/5.0"} # Egy általános böngésző User-Agent
    if headers: # Ha a hívó adott meg egyéb fejléceket, azokat hozzáadjuk
        temp_headers = headers.copy()
        temp_headers.pop("User-Agent", None); temp_headers.pop("user-agent", None) # Biztos ne írja felül a miénket
        request_headers.update(temp_headers)
    # === TESZT VÉGE ===
    
    logger.debug(f"{log_prefix} === FINAL REQUEST DETAILS (DEBUG) ===")
    logger.debug(f"{log_prefix} Method: {method.upper()}")
    logger.debug(f"{log_prefix} URL: {url}")
    logger.debug(f"{log_prefix} Params: {params}")
    logger.debug(f"{log_prefix} Headers: {request_headers}") # Most az egyszerűsített fejlécet logolja

    logger.info(f"{log_prefix} Making live API request. Method: {method.upper()}, URL: {url}")
    logger.debug(f"{log_prefix} Request Details - Params: {params}, Headers: {request_headers}")

    response: Optional[httpx.Response] = None
    try:
        start_time = time.monotonic()
        logger.critical(f"{log_prefix} === FINAL REQUEST DETAILS ===") # Használj CRITICAL szintet, hogy biztosan lásd
        logger.critical(f"{log_prefix} Method: {method.upper()}")
        logger.critical(f"{log_prefix} URL: {url}")
        logger.critical(f"{log_prefix} Params: {params}")
        logger.critical(f"{log_prefix} Headers: {request_headers}")
        logger.critical(f"{log_prefix} === END FINAL REQUEST DETAILS ===")
        response = await client.request(
            method=method.upper(),
            url=url,
            params=params,
            headers=request_headers,
            timeout=HTTP_TIMEOUT,
            follow_redirects=True
        )
        duration = time.monotonic() - start_time
        effective_url = str(response.url) if response else url
        logger.debug(f"{log_prefix} API request completed in {duration:.4f}s. Status: {response.status_code if response else 'N/A'}, Effective URL: {effective_url}")

        response.raise_for_status()

        try:
            parsed_json = response.json()
            logger.info(f"{log_prefix} Request successful (Status: {response.status_code}). Returning parsed JSON.")
            return parsed_json
        except json.JSONDecodeError as json_err:
            response_text_preview = str(response.text)[:250]
            logger.error(f"{log_prefix} Failed to decode JSON from successful response (Status: {response.status_code}). Invalid JSON format. Preview: '{response_text_preview}'... Error: {json_err}")
            if can_check_cache_failure:
                try:
                    await cache_service.set(cache_key_for_failure, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                    logger.info(f"{log_prefix} Cached persistent failure marker (JSON Decode Error). Key: {cache_key_for_failure}")
                except Exception as e_cache_set:
                    logger.error(f"{log_prefix} Failed to cache failure marker after JSON decode error: {e_cache_set}")
            return None
        except Exception as e_resp_proc:
            logger.error(f"{log_prefix} Unexpected error processing successful response (Status: {response.status_code}): {e_resp_proc}", exc_info=True)
            if can_check_cache_failure:
                try:
                    await cache_service.set(cache_key_for_failure, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                    logger.info(f"{log_prefix} Cached persistent failure marker (Response Processing Error). Key: {cache_key_for_failure}")
                except Exception as e_cache_set:
                    logger.error(f"{log_prefix} Failed to cache failure marker after response processing error: {e_cache_set}")
            return None

    except httpx.HTTPStatusError as status_err:
        response = status_err.response
        status_code = response.status_code
        response_text_preview = str(response.text)[:250]
        log_message = f"{log_prefix} HTTP Status Error ({status_code}). URL: {status_err.request.url}. "

        if 400 <= status_code < 500:
            log_func = BASE_HELPER_LOGGER.warning if status_code in [401, 403, 404, 429] else BASE_HELPER_LOGGER.error
            if status_code == 401: log_message += "Authentication failed (401). "
            elif status_code == 403: log_message += "Authorization failed (403). "
            elif status_code == 404: log_message += "Resource not found (404). "
            elif status_code == 429: log_message += "Rate limit hit (429). NOT caching failure. "
            else: log_message += f"Client error ({status_code}). "
            log_message += f"Preview: '{response_text_preview}'..."
            log_func(log_message)
            if status_code != 429 and can_check_cache_failure:
                 try:
                     await cache_service.set(cache_key_for_failure, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                     logger.info(f"{log_prefix} Cached persistent failure marker (HTTP {status_code}). Key: {cache_key_for_failure}")
                 except Exception as e_cache_set:
                     logger.error(f"{log_prefix} Failed to cache failure marker after HTTP {status_code} error: {e_cache_set}")
            return None
        else: 
             logger.error(f"{log_prefix} Server Error ({status_code}). Preview: '{response_text_preview}'... NOT caching failure.")
             return None
    except httpx.TimeoutException:
        logger.error(f"{log_prefix} Request timed out after {HTTP_TIMEOUT}s. URL: {url}. NOT caching failure.")
        return None
    except httpx.ConnectError as conn_err:
        logger.error(f"{log_prefix} Connection error to {url}: {conn_err}. NOT caching failure.")
        return None
    except httpx.RequestError as req_err:
        logger.error(f"{log_prefix} Generic HTTP request error for {url}: {req_err}. NOT caching failure.")
        return None
    except Exception as e:
        logger.critical(f"{log_prefix} Unexpected critical error during API request for {url}: {e}", exc_info=True)
        return None

BASE_HELPER_LOGGER.info("--- Fetcher Base Helpers Module (v3.0) initialized successfully. ---")

async def _fetch_with_cache(
    url: str,
    client: httpx.AsyncClient,
    cache: CacheService, # CORRECTED: Use the abstract CacheService
    cache_key: str,
    parser_func: Callable,
    ttl_seconds: int,
) -> Optional[Any]:
    # Implementation of _fetch_with_cache function
    pass

async def get_from_cache_or_fetch(
    cache_key: str,
    fetch_func: Callable[[], Awaitable[Any]],
    cache_service: CacheService, # CORRECTED: Use the abstract CacheService
    ttl_seconds: int,
    request_context: Optional[Dict[str, Any]] = None,
) -> Optional[Any]:
    # Implementation of get_from_cache_or_fetch function
    pass