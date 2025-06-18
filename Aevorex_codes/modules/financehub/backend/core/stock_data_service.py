# backend/core/stock_data_service.py
# ==============================================================================
# Aevorex FinBot - Stock Data Orchestration Service (v4.1.1 - EODHD Active Integration) # MODIFIED
# Copyright © 2024-2025 Aevorex. All Rights Reserved.
# (Refer to license file for details)
# ==============================================================================
# Felelősségek:
# - Adatlekérési (fetchers), adatátalakítási (mappers), indikátor és AI
#   szolgáltatások hívásának vezénylése (orchestration).
# - Egységesített OHLCV adatfeldolgozási lánc ('chart-ready list' formátum).
# - Aggregált pénzügyi, earnings (fallbackkel) és ratings adatok kezelése.
# - Dinamikus, priorizált és deduplikált hírlekérdezés kezelése.
# - A teljes, összeállított API válasz gyorsítótárazásának kezelése (Redis lockkal).
# - A végső FinBotStockResponse objektum összeállítása és validálása.
# - Magas szintű hibakezelés és részletes, nyomonkövethető logolás.
# - EODHD integráció OHLCV, Splits/Dividends, News adatokhoz. # ADDED
# ==============================================================================
import asyncio
import time
import math
import json # For parsing settings strings
# --- Explicit Typing Imports ---
from typing import (
    List, Optional, Dict, Any, Tuple, Final, Union, Set, TypeAlias, Callable
)
# -----------------------------
import pandas as pd
import httpx
from pydantic import BaseModel, ValidationError, HttpUrl, Field # Field importálva
from datetime import datetime, timezone, timedelta, date as Date # Ensure datetime imports
import uuid
import sys

import logging # Import logging for fallback
from redis.exceptions import LockError # Redis lockhoz szükséges
from fastapi import Depends # FastAPI dependency injection
from redis.asyncio.lock import Lock as AsyncLock # Alias
from fastapi.responses import JSONResponse

# --- Fallback Definitions (Defined BEFORE potential import failures) ---
StandardNewsDict: TypeAlias = Dict[str, Any]
DEFAULT_NA_VALUE_FALLBACK: Final[str] = "N/A"
mapper_logger = logging.getLogger("mapper_base_fallback") # Initial fallback logger
DEFAULT_NA_VALUE = DEFAULT_NA_VALUE_FALLBACK # Initialize with fallback

# -----------------------------------------------------------------------

try:
    # --- Core Application Imports ---
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from modules.financehub.backend.models.stock import (
        FinBotStockResponse, IndicatorHistory, CompanyOverview, NewsItem,
        CompanyPriceHistoryEntry, LatestOHLCV, FinancialsData, EarningsData, RatingPoint, TickerSentiment, EarningsPeriodData,
        StockSplitData, DividendData
    )
    from .cache_service import CacheService
    from modules.financehub.backend.core.indicator_service import calculate_and_format_indicators
    from modules.financehub.backend.core.ai.ai_service import generate_ai_summary
    from modules.financehub.backend.core.ai import prompt_generators
    from modules.financehub.backend.core import fetchers
    from modules.financehub.backend.core import mappers
    # -----------------------------
    from modules.financehub.backend.core.ai.ai_service import (
    ERROR_MSG_CONFIG,
    ERROR_MSG_DISABLED,
    ERROR_MSG_PROVIDER_UNSUPPORTED,
    ERROR_MSG_NO_MODELS_CONFIGURED,
    ERROR_MSG_PROMPT_GENERATION_FAILED,
    ERROR_MSG_PROMPT_EMPTY,
    ERROR_MSG_PROMPT_UNEXPECTED,
    ERROR_MSG_PAYLOAD_ERROR,
    ERROR_MSG_API_CALL_UNEXPECTED,
    ERROR_MSG_API_RESPONSE_ERROR,
    ERROR_MSG_ALL_MODELS_FAILED,
    ERROR_MSG_PARSING_STRUCTURE,
    ERROR_MSG_PARSING_CONTENT_FILTER,
    ERROR_MSG_PARSING_TOO_LONG,
    ERROR_MSG_PARSING_EMPTY, ERROR_MSG_PARSING_UNEXPECTED
    )
    # --- Attempt to import from _mapper_base (might fail) ---
    try:
        from modules.financehub.backend.core.mappers._mapper_base import (
            logger as imported_mapper_logger,
            StandardNewsDict as ImportedStandardNewsDict,
            safe_get as imported_safe_get,
            DEFAULT_NA_VALUE as ImportedDefaultNA
        )
        mapper_logger = imported_mapper_logger
        StandardNewsDict = ImportedStandardNewsDict
        DEFAULT_NA_VALUE = ImportedDefaultNA
        safe_get = imported_safe_get
        mapper_logger.debug("Successfully re-assigned logger, StandardNewsDict, DEFAULT_NA_VALUE, safe_get from core.mappers._mapper_base")
    except ImportError:
        mapper_logger.critical("FATAL: Failed to import from core.mappers._mapper_base! Continuing with fallback definitions.", exc_info=False) # Less verbose fallback
        def safe_get(df, index, column, default=None): return default # Define fallback safe_get
        # DEFAULT_NA_VALUE is already set to fallback above
        mapper_logger.warning("Using fallback TypeAlias for StandardNewsDict, fallback DEFAULT_NA_VALUE, and fallback safe_get function.")
    # ---------------------------------------------------------

    # --- Attempt to import _dynamic_validator (might fail) ---
    try:
        from modules.financehub.backend.core.mappers._dynamic_validator import _dynamic_import_and_validate
        mapper_logger.debug("Successfully imported _dynamic_import_and_validate.")
    except ImportError as e_validator:
        mapper_logger.critical(f"FATAL: Cannot import '_dynamic_import_and_validate': {e_validator}", exc_info=False) # Less verbose fallback
        def _dynamic_import_and_validate(model_name, data, log_prefix):
             mapper_logger.error(f"[{log_prefix}] _dynamic_import_and_validate unavailable! Cannot validate {model_name}.")
             return None
        mapper_logger.warning("Using fallback definition for _dynamic_import_and_validate.")
    # -------------------------------------------------------

    # --- Utility and Framework Imports ---
    from modules.financehub.backend.utils.helpers import (
        parse_optional_float, parse_optional_int, parse_timestamp_to_iso_utc,
        _clean_value, normalize_url, _validate_date_string
    )
    from fastapi import HTTPException, status
    # -----------------------------------

# --- Handle Critical Initialization Import Errors ---
except ImportError as e:
    init_logger = logging.getLogger("stock_data_service_init")
    init_logger.critical(f"FATAL Import Error during service initialization: {e}. Check paths and dependencies.", exc_info=True)
    raise RuntimeError(f"Stock Service Initialization failed due to critical ImportError: {e}") from e
except Exception as e_init:
    init_logger = logging.getLogger("stock_data_service_init")
    init_logger.critical(f"FATAL UNEXPECTED ERROR during service initialization: {e_init}", exc_info=True)
    raise RuntimeError(f"Stock Service Initialization failed due to unexpected error: {e_init}") from e_init
# --------------------------------------------------

# --- Service Configuration & Logger ---
SERVICE_NAME: Final[str] = "StockDataOrchestrator"
version: Final[str] = "4.1.1" # <<< Current version
logger = get_logger(f"aevorex_finbot.{SERVICE_NAME}")
# ----------------------------------

# === CONFIG LOADING FUNCTION (No changes needed here) ===
def _load_config_value(attr_path: str, expected_type: Union[type, Tuple[type, ...]], validator: Callable, fallback: Any, description: str) -> Any:
    try:
        value = settings
        for part in attr_path.split('.'):
            value = getattr(value, part)

        valid_type = False
        # Check if expected_type is a tuple/list (for Union) or a single type
        if isinstance(expected_type, tuple):
            if isinstance(value, expected_type): # Direct check first
                valid_type = True
            elif any(isinstance(value, t) for t in expected_type): # Check against each type in tuple
                 valid_type = True
        elif isinstance(value, expected_type): # Handle single type
            valid_type = True

        if not valid_type:
            raise TypeError(f"Expected type(s) {expected_type}, got {type(value)}")
        if not validator(value):
            raise ValueError(f"Invalid value content: {value}")

        logger.debug(f"Config Loaded: {description} set to: {value} from settings.")
        return value
    except (AttributeError, ValueError, TypeError) as e:
        logger.warning(f"Config WARNING: Failed reading/validating '{attr_path}' ({type(e).__name__}: {e}). Using fallback: {fallback}.", exc_info=False)
        return fallback
    except Exception as e_cfg:
        logger.error(f"Config ERROR: Unexpected error loading '{attr_path}': {e_cfg}. Using fallback: {fallback}.", exc_info=True)
        return fallback

# === GLOBAL CONSTANTS (using _load_config_value) ===
AGGREGATED_RESPONSE_TTL: Final[int] = _load_config_value("CACHE.AGGREGATED_TTL_SECONDS", int, lambda v: v > 0, 900, "Aggregate Response TTL")
OHLCV_YEARS: Final[int] = _load_config_value("DATA_PROCESSING.OHLCV_YEARS_TO_FETCH", int, lambda v: v > 0, 5, "OHLCV Years to fetch (yfinance)")
CHART_YEARS: Final[float] = _load_config_value("DATA_PROCESSING.CHART_HISTORY_YEARS", float, lambda v: v > 0, 1.0, "Chart History Years")
LOCK_TTL_SECONDS: Final[int] = _load_config_value("CACHE.LOCK_TTL_SECONDS", int, lambda v: v > 0, 60, "Redis Lock TTL")
LOCK_BLOCKING_TIMEOUT_SECONDS: Final[Union[int, float]] = _load_config_value(
    "CACHE.LOCK_BLOCKING_TIMEOUT_SECONDS",
    (int, float),
    lambda v: isinstance(v, (int, float)) and v >= 0,
    5.0,
    "Redis Lock Blocking Timeout"
)
SECONDARY_DATA_SOURCE: Final[str] = _load_config_value("DATA_SOURCE.SECONDARY", str, lambda v: isinstance(v, str), "", "Secondary Data Source (e.g., alpha_vantage)").lower()
AI_ENABLED: Final[bool] = _load_config_value("AI.ENABLED", bool, lambda v: isinstance(v, bool), False, "AI Features Enabled")
AI_PROMPT_HISTORY_DAYS: Final[int] = _load_config_value("AI.AI_PRICE_DAYS_FOR_PROMPT", int, lambda v: v > 0, 60, "AI Price History Days for Prompt")
DATA_SOURCE_INFO_TEXT: Final[str] = _load_config_value("DATA_SOURCE.INFO_TEXT", str, lambda v: isinstance(v, str), "Data provided by multiple sources.", "Data Source Info Text")
APP_VERSION : Final[str] = _load_config_value("APP_META.VERSION", str, lambda v: isinstance(v, str) and bool(v.strip()), "0.0.0-dev", "App Version")
NODE_ENV: Final[str] = _load_config_value("ENVIRONMENT.NODE_ENV", str, lambda v: isinstance(v, str), 'production', "Node Environment")
USE_EODHD_FOR_COMPANY_INFO: Final[bool] = _load_config_value("EODHD_FEATURES.USE_FOR_COMPANY_INFO", bool, lambda v: isinstance(v, bool), False, "Use EODHD for Company Info")
USE_EODHD_FOR_FINANCIALS: Final[bool] = _load_config_value("EODHD_FEATURES.USE_FOR_FINANCIALS", bool, lambda v: isinstance(v, bool), False, "Use EODHD for Financials")


# === UTILITY FUNCTIONS ===
def _period_to_years(period: str) -> int:
    """
    Convert period string to years for data fetching.
    """
    period_lower = period.lower()
    if period_lower in ["1d", "5d"]:
        return 1
    elif period_lower in ["1mo", "3mo"]:
        return 1
    elif period_lower in ["6mo", "1y", "ytd"]:
        return 2
    elif period_lower in ["2y"]:
        return 3
    elif period_lower in ["5y"]:
        return 5
    elif period_lower in ["10y"]:
        return 10
    elif period_lower == "max":
        return 20
    else:
        logger.warning(f"Unknown period '{period}', defaulting to 2 years")
        return 2


# === NEWS PROCESSING CONSTANTS (DEFINED GLOBALLY) ===
NEWS_CONFIG_SECTION: Final[str] = "NEWS"
ENABLED_SOURCES_KEY: Final[str] = "ENABLED_SOURCES"
PRIORITY_KEY: Final[str] = "SOURCE_PRIORITY"
MIN_TARGET_KEY: Final[str] = "MIN_UNIQUE_TARGET"
DEFAULT_MIN_TARGET: Final[int] = 5

# Fetcher function mapping (using getattr for safety)
# Ensure 'fetchers' is imported correctly above
NEWS_FETCHER_MAPPING: Dict[str, Optional[Callable]] = {
    "marketaux": getattr(fetchers, "fetch_marketaux_news", None),
    "newsapi": getattr(fetchers, "fetch_newsapi_news", None),
    "yfinance": getattr(fetchers, "fetch_yfinance_news", None),
    "fmp_stock": getattr(fetchers, "fetch_fmp_stock_news", None),
    "fmp_press": getattr(fetchers, "fetch_fmp_press_releases", None),
    "alphavantage": getattr(fetchers, "fetch_alpha_vantage_news", None),
    "eodhd": getattr(fetchers, "fetch_eodhd_news", None),
}
# Filter out any fetchers that were not found (returned None)
NEWS_FETCHER_MAPPING = {k: v for k, v in NEWS_FETCHER_MAPPING.items() if v is not None and callable(v)}
logger.debug(f"Initialized NEWS_FETCHER_MAPPING with available fetchers: {list(NEWS_FETCHER_MAPPING.keys())}")
# ======================================================

# --- Függvények definíciói innen kezdődnek ---

# Például: async def _check_aggregate_cache(...)
async def _check_aggregate_cache(cache_key: str, request_id: str, cache: CacheService) -> Optional[FinBotStockResponse]:
    # ... (a függvény törzse változatlan)
    if not settings.CACHE.ENABLED: return None
    cached_data_dict = await cache.get(cache_key)
    if cached_data_dict is not None:
        logger.info(f"[{request_id}] Aggregate Cache HIT ('{cache_key}'). Validating...")
        validation_start = time.monotonic()
        try:
            if not isinstance(cached_data_dict, dict):
                raise TypeError(f"Expected dict from cache, got {type(cached_data_dict).__name__}")
            response_model = FinBotStockResponse.model_validate(cached_data_dict)
            response_model.is_data_stale = True # Mark as stale since it came from cache
            
            # === METADATA FRISSÍTÉSE CACHE HIT ESETÉN ===
            if not hasattr(response_model, 'metadata') or response_model.metadata is None:
                response_model.metadata = {}
            response_model.metadata.update({
                "cache_hit": True,
                "data_quality": response_model.metadata.get("data_quality", "cached"),
                "processing_duration_seconds": validation_duration,
                "cached_at": datetime.now(timezone.utc).isoformat()
            })
            # ============================================
            validation_duration = time.monotonic() - validation_start
            try:
                # Safely access the timestamp attribute, converting to datetime if possible
                ts_aware = getattr(response_model, 'request_timestamp_utc', None)
                if isinstance(ts_aware, datetime) and ts_aware.tzinfo:
                    age_delta = datetime.now(timezone.utc) - ts_aware
                    age_str = f"Age: {str(age_delta).split('.')[0]}"
                elif isinstance(ts_aware, str): # Fallback if it's still a string
                     ts_dt = pd.to_datetime(ts_aware).tz_convert('UTC')
                     age_delta = datetime.now(timezone.utc) - ts_dt
                     age_str = f"Age: {str(age_delta).split('.')[0]} (from str)"
                else:
                     age_str = f"Timestamp: {ts_aware or 'N/A'}"

            except Exception as e_age:
                 logger.warning(f"[{request_id}] Failed parsing cache timestamp '{getattr(response_model, 'request_timestamp_utc', 'N/A')}': {e_age}", exc_info=False)
                 age_str = f"Timestamp: {getattr(response_model, 'request_timestamp_utc', 'N/A')}"

            logger.info(f"[{request_id}] Returning VALID cached response. {age_str}. Validation took {validation_duration:.4f}s.")
            return response_model
        except (ValidationError, TypeError, AttributeError, Exception) as e_cache_val:
            validation_duration = time.monotonic() - validation_start
            logger.warning(f"[{request_id}] Cached data INVALID ({type(e_cache_val).__name__}) for '{cache_key}'. Took {validation_duration:.4f}s. Fetching fresh.", exc_info=False)
            # Log the detailed validation error at DEBUG level
            if isinstance(e_cache_val, ValidationError):
                 logger.debug(f"[{request_id}] Cache Pydantic validation error details: {e_cache_val.errors()}")
            else:
                 logger.debug(f"[{request_id}] Cache validation error details: {e_cache_val}")
            # Attempt to delete the invalid cache entry
            try:
                await cache.delete(cache_key)
                logger.info(f"[{request_id}] Deleted invalid cache entry '{cache_key}'.")
            except Exception as e_del:
                 logger.error(f"[{request_id}] Failed deleting invalid cache entry '{cache_key}': {e_del}", exc_info=True)
            return None
    else:
        logger.debug(f"[{request_id}] Aggregate Cache MISS ('{cache_key}').")
    return None

async def _cache_final_response(cache_key: str, response_model: FinBotStockResponse, request_id: str, cache: CacheService):
    log_prefix = f"[{request_id}][_cache_final_response]"
    if not settings.CACHE.ENABLED:
        logger.info(f"{log_prefix} Cache is disabled. Skipping save.")
        return

    cache_save_start = time.monotonic()
    try:
        logger.debug(f"{log_prefix} Attempting model_dump for cache (key: '{cache_key}')...")
        # Ensure model_dump uses mode='json' for proper serialization of complex types like datetime
        data_to_cache = response_model.model_dump(mode='json', exclude_none=False)
        logger.debug(f"{log_prefix} model_dump successful. Type: {type(data_to_cache)}. Attempting cache.set...")
        await cache.set(cache_key, data_to_cache, timeout_seconds=AGGREGATED_RESPONSE_TTL)
        cache_save_duration = time.monotonic() - cache_save_start
        logger.info(f"[{request_id}] Saved final response to cache '{cache_key}' (TTL: {AGGREGATED_RESPONSE_TTL}s) in {cache_save_duration:.4f}s.")
    except (ValidationError, TypeError) as e_dump:
        cache_save_duration = time.monotonic() - cache_save_start
        logger.error(f"{log_prefix} DUMP ERROR during model_dump for cache '{cache_key}' after {cache_save_duration:.4f}s: {e_dump}. Check model serialization.", exc_info=True)
    except Exception as e_cache:
        cache_save_duration = time.monotonic() - cache_save_start
        logger.error(f"{log_prefix} CACHE/OTHER ERROR saving response to cache '{cache_key}' after {cache_save_duration:.4f}s: {e_cache}", exc_info=True)

# ... (a többi függvény definíciója változatlanul következik)
def _get_eodhd_symbol(symbol: str, log_prefix: str) -> str:
    symbol_upper = symbol.upper()
    if '.' in symbol_upper:
        parts = symbol_upper.split('.')
        if len(parts) == 2 and parts[0] and parts[1]:
             logger.debug(f"{log_prefix} Symbol '{symbol_upper}' already contains exchange code, using as is for EODHD.")
             return symbol_upper
        else:
             logger.warning(f"{log_prefix} Symbol '{symbol_upper}' contains '.' but seems invalid. Falling back to US assumption.")
             base_symbol = parts[0]
             eodhd_symbol = f"{base_symbol}.US"
             logger.debug(f"{log_prefix} Assuming US stock for base '{base_symbol}', converted to EODHD symbol: '{eodhd_symbol}'")
             return eodhd_symbol
    else:
        eodhd_symbol = f"{symbol_upper}.US"
        logger.debug(f"{log_prefix} Assuming US stock for '{symbol_upper}', converting to EODHD symbol: '{eodhd_symbol}'")
        return eodhd_symbol

async def _process_and_map_company_info(
    yfinance_company_info_dict: Optional[Dict[str, Any]],
    request_id: str,
    symbol: str
) -> Optional[CompanyOverview]:
    log_prefix = f"[{request_id}][MapYFCompanyInfo:{symbol}]"
    if isinstance(yfinance_company_info_dict, Exception):
        logger.warning(f"{log_prefix} YFinance company info fetch resulted in Exception: {yfinance_company_info_dict}", exc_info=False)
        return None
    elif isinstance(yfinance_company_info_dict, dict):
        if not yfinance_company_info_dict:
             logger.info(f"{log_prefix} Received empty dictionary for YFinance company info. Cannot map.")
             return None
        logger.info(f"{log_prefix} Mapping fetched YFinance company info dictionary...")
        map_start = time.monotonic()
        try:
            mapped_overview: Optional[CompanyOverview] = mappers.map_yfinance_info_to_overview(yfinance_company_info_dict, symbol) # Pass symbol as second arg
            map_duration = time.monotonic() - map_start
            if mapped_overview and isinstance(mapped_overview, CompanyOverview):
                logger.info(f"{log_prefix} YFinance company info mapped successfully to CompanyOverview in {map_duration:.4f}s.")
                return mapped_overview
            else:
                logger.warning(f"{log_prefix} Mapping YFinance company info returned None or wrong type ({type(mapped_overview)}) after {map_duration:.4f}s.")
                return None
        except NotImplementedError:
             logger.error(f"{log_prefix} Mapping failed: 'map_yfinance_info_to_overview' not found/imported in 'mappers'.", exc_info=False)
             return None
        except ValidationError as e_val:
             map_duration = time.monotonic() - map_start
             logger.error(f"{log_prefix} Pydantic validation failed during YFinance company info mapping after {map_duration:.4f}s: {e_val.errors()}", exc_info=False)
             logger.debug(f"{log_prefix} Validation error details: {e_val}")
             return None
        except Exception as e_map:
             map_duration = time.monotonic() - map_start
             logger.error(f"{log_prefix} Unexpected error mapping YFinance company info after {map_duration:.4f}s: {e_map}", exc_info=True)
             return None
    elif yfinance_company_info_dict is None:
        logger.info(f"{log_prefix} No YFinance company info dictionary received (fetch returned None).")
        return None
    else:
        logger.warning(f"{log_prefix} Unexpected result type received for YFinance company info: {type(yfinance_company_info_dict).__name__}. Expected dict or Exception.")
        return None

async def _process_financial_dfs(result: Any, request_id: str) -> Optional[Dict[str, pd.DataFrame]]:
    log_prefix = f"[{request_id}][ProcessFinDFs]"
    if isinstance(result, Exception):
        logger.warning(f"{log_prefix} Fetch resulted in Exception: {result}", exc_info=False)
        return None
    elif isinstance(result, dict):
        if not result: logger.info(f"{log_prefix} Received empty dictionary."); return None
        valid_dfs = {}
        skipped_keys = []
        for k, df in result.items():
            if isinstance(df, pd.DataFrame) and not df.empty:
                valid_dfs[k] = df
            else:
                skipped_keys.append(f"{k} (Type: {type(df).__name__}, Empty: {getattr(df,'empty','N/A')})")
        if skipped_keys:
            logger.warning(f"{log_prefix} Invalid/empty items skipped in financial data dict: {skipped_keys}")
        if not valid_dfs:
            logger.info(f"{log_prefix} No valid DataFrames found in financial data dict.")
            return None
        else:
            df_shapes = {k: v.shape for k, v in valid_dfs.items()}
            logger.info(f"{log_prefix} Obtained valid financial DFs. Keys: {list(valid_dfs.keys())}. Shapes: {df_shapes}")
            return valid_dfs
    elif result is None:
        logger.info(f"{log_prefix} No financial data dict received (None).")
        return None
    else:
        logger.warning(f"{log_prefix} Unexpected result type ({type(result)}) for financial data dict.")
        return None

# ELSŐ _process_ratings_result (ezt meghagyjuk)
async def _process_ratings_result(result: Any, request_id: str) -> Optional[List[Dict[str, Any]]]:
    log_prefix = f"[{request_id}][ProcessRatings]"
    if isinstance(result, Exception):
        logger.warning(f"{log_prefix} Fetch resulted in Exception: {result}", exc_info=False)
        return None
    elif isinstance(result, list):
        if not result:
            logger.info(f"{log_prefix} Received empty list for historical ratings.")
            return None
        valid_items = [item for item in result if isinstance(item, dict)]
        num_invalid = len(result) - len(valid_items)
        if num_invalid > 0:
             logger.warning(f"{log_prefix} Found {num_invalid} non-dict items in ratings list, skipping them.")
        if not valid_items:
             logger.info(f"{log_prefix} No valid dictionary items found in ratings list after filtering.")
             return None
        logger.info(f"{log_prefix} Obtained list with {len(valid_items)} valid historical rating items (potential dicts).")
        return valid_items
    elif result is None:
        logger.info(f"{log_prefix} No historical ratings data received (None).")
        return None
    else:
        logger.warning(f"{log_prefix} Unexpected result type ({type(result).__name__}) for historical ratings data.")
        return None


logger = get_logger(__name__)

async def _fetch_process_and_map_financial_combined_data(
    yfinance_symbol: str,
    fmp_symbol: str,
    eodhd_symbol: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    request_id: str,
    log_prefix: str,
    eodhd_key_is_present: bool,
    company_currency: Optional[str] = None # Added for currency propagation
) -> Tuple[Optional[FinancialsData], Optional[EarningsData], Optional[List[RatingPoint]]]:
    """
    Fetches, processes, and maps financial, earnings, and ratings data from various sources.
    This version uses a single YFinance fetch for all financial statements and propagates currency.
    """
    combined_log_prefix = f"{log_prefix}[CombinedFinEarnRate]"
    logger.info(f"{combined_log_prefix} Starting combined data processing for YF:{yfinance_symbol}, FMP:{fmp_symbol}, EODHD:{eodhd_symbol}...")
    combined_start_time = time.monotonic()

    mapped_financials: Optional[FinancialsData] = None
    mapped_earnings_container: Optional[EarningsData] = None
    mapped_ratings_list: Optional[List[RatingPoint]] = None
    
    # --- EODHD Financials (Primary if configured, currently a STUB) ---
    if USE_EODHD_FOR_FINANCIALS and eodhd_key_is_present:
        logger.info(f"{combined_log_prefix} EODHD financials configured. Attempting EODHD financials fetch for {eodhd_symbol}...")
        # eodhd_fin_fetch_start = time.monotonic() # Timer for actual implementation
        try:
            # --- EODHD FINANCIALS FETCH AND MAPPING LOGIC (STUB) ---
            # 1. Call an EODHD fetcher for financial statements.
            #    raw_eodhd_financials = await fetchers.fetch_eodhd_financials(eodhd_symbol, client, cache)
            # 2. Process the raw EODHD data.
            #    processed_eodhd_financials = await _process_eodhd_financials(raw_eodhd_financials, request_id) # Assuming a new helper
            # 3. Map the processed data to `FinancialsData` model.
            #    if processed_eodhd_financials:
            #        mapped_financials = mappers.map_eodhd_financials_to_model(
            #            processed_eodhd_financials, request_id, currency=company_currency
            #        )
            #        if mapped_financials:
            #            mapped_financials.raw_data_provider = 'eodhd'
            #            logger.info(f"{combined_log_prefix} EODHD financials mapped successfully.")
            #        else:
            #            logger.warning(f"{combined_log_prefix} EODHD financials mapping returned None.")
            #    else:
            #        logger.warning(f"{combined_log_prefix} No valid EODHD financial data to map.")
            logger.warning(f"{combined_log_prefix} EODHD financials (USE_EODHD_FOR_FINANCIALS=True) is a STUB. Falling back if YFinance is available.")
        except NotImplementedError:
            logger.error(f"{combined_log_prefix} EODHD financials: Required functions not implemented.", exc_info=False)
        except Exception as e_eodhd_fin:
            logger.error(f"{combined_log_prefix} Error during EODHD financials processing: {e_eodhd_fin}", exc_info=True)

    # --- Parallel Fetching (YFinance Financials & FMP Ratings) ---
    # Prepare YFinance financial fetching task if financials not yet mapped by EODHD
    if not mapped_financials:
        logger.info(f"{combined_log_prefix} Preparing YFinance financials fetch for {yfinance_symbol}.")
        # Single fetcher for all YFinance financial statements (annual/quarterly income, balance, cashflow)
        yf_all_financial_data_task = fetchers.fetch_financial_data_dfs(yfinance_symbol, cache=cache)
    else:
        logger.info(f"{combined_log_prefix} YFinance financials fetch skipped; data already mapped (e.g., from EODHD).")
        yf_all_financial_data_task = asyncio.sleep(0, result=None) # Dummy task

    ratings_fmp_task = fetchers.fetch_fmp_historical_ratings(fmp_symbol, client=client, cache=cache)

    logger.debug(f"{combined_log_prefix} Dispatching parallel fetch tasks (YF All Financial Data, FMP Ratings)...")
    fetch_tasks_start_time = time.monotonic()
    results = await asyncio.gather(
        yf_all_financial_data_task,
        ratings_fmp_task,
        return_exceptions=True
    )
    fetch_duration = time.monotonic() - fetch_tasks_start_time
    logger.info(f"{combined_log_prefix} Parallel fetch phase finished in {fetch_duration:.4f}s.")

    # Unpack results from asyncio.gather
    # results[0] = yf_all_financial_data_task result
    # results[1] = ratings_fmp_task result
    yf_all_financials_dfs_raw: Optional[Union[Dict[str, Optional[pd.DataFrame]], Exception]] = results[0]
    ratings_fmp_raw: Optional[Union[List[Dict[str, Any]], Exception]] = results[1]


    # --- Process FinancialsData (from YFinance if not from EODHD) ---
    if not mapped_financials:
        map_fin_start = time.monotonic()
        logger.info(f"{combined_log_prefix} Attempting to process YFinance financial data for FinancialsData model...")

        financial_dfs_for_mapper: Optional[Dict[str, pd.DataFrame]] = None
        if isinstance(yf_all_financials_dfs_raw, dict):
            logger.debug(f"{combined_log_prefix} YF raw financials received as dict, proceeding to _process_financial_dfs.")
            # _process_financial_dfs handles potential None values for individual DFs within the dict
            financial_dfs_for_mapper = await _process_financial_dfs(yf_all_financials_dfs_raw, request_id)
        elif isinstance(yf_all_financials_dfs_raw, Exception):
            logger.error(f"{combined_log_prefix} YF All Financials fetch task returned an exception: {yf_all_financials_dfs_raw}", exc_info=False) # exc_info=False as exception is already an object
        elif yf_all_financials_dfs_raw is None and yf_all_financial_data_task is not None and not isinstance(yf_all_financial_data_task, asyncio.futures.Future): # if it was not a dummy task
             logger.warning(f"{combined_log_prefix} YF All Financials fetch returned None. Task was: {yf_all_financial_data_task}")
        else: # This case covers the dummy task returning None, or other unexpected types.
            if not (yf_all_financials_dfs_raw is None and isinstance(yf_all_financial_data_task, asyncio.futures.Future)): # Log only if it's not the dummy task's None
                 logger.warning(f"{combined_log_prefix} YF All Financials fetch returned unexpected data type: {type(yf_all_financials_dfs_raw)}. Data: {str(yf_all_financials_dfs_raw)[:200]}")


        if financial_dfs_for_mapper: # Check if _process_financial_dfs yielded any valid DataFrames
            logger.info(f"{combined_log_prefix} Mapping {len(financial_dfs_for_mapper)} processed YFinance financial DataFrame(s) to FinancialsData model. Currency: {company_currency}")
            try:
                mapped_financials = mappers.map_financial_dataframes_to_financials_model(
                    financial_dfs=financial_dfs_for_mapper, # Pass the dict of processed DFs
                    request_id=request_id,
                    currency=company_currency # Propagate company currency
                )
                if mapped_financials and isinstance(mapped_financials, FinancialsData):
                    mapped_financials.raw_data_provider = 'yfinance'
                    if not mapped_financials.symbol: # Csak ha még nincs beállítva (pl. a mapper nem tette meg)
                        mapped_financials.symbol = yfinance_symbol 
                    logger.info(f"{combined_log_prefix} YFinance FinancialsData mapped successfully in {time.monotonic() - map_fin_start:.4f}s. Symbol: {mapped_financials.symbol}, Currency: {mapped_financials.currency}")
                elif mapped_financials: # Mapper returned something, but not FinancialsData
                    logger.error(f"{combined_log_prefix} YF FinancialsData mapping returned UNEXPECTED TYPE: {type(mapped_financials)}. Expected FinancialsData or None.")
                    mapped_financials = None # Nullify to prevent downstream errors
                else: # Mapper explicitly returned None
                    logger.warning(f"{combined_log_prefix} YF FinancialsData mapping returned None after {time.monotonic() - map_fin_start:.4f}s (financial_dfs_for_mapper was not empty).")
            except NotImplementedError:
                logger.error(f"{combined_log_prefix} YF FinancialsData mapping failed: Mapper 'map_financial_dataframes_to_financials_model' not found/implemented.", exc_info=False)
            except ValidationError as e_val_fin:
                logger.error(f"{combined_log_prefix} Pydantic validation failed during YF FinancialsData mapping: {e_val_fin.errors()}", exc_info=False) # exc_info=False, errors() is enough
            except Exception as e_map_fin:
                logger.error(f"{combined_log_prefix} Unexpected error mapping YF FinancialsData: {e_map_fin}", exc_info=True)
        else:
            logger.warning(f"{combined_log_prefix} No valid YFinance financial DataFrames (after _process_financial_dfs) to map for FinancialsData model.")
    elif mapped_financials: # This means EODHD (or other primary source) was successful
        logger.info(f"{combined_log_prefix} Using financials previously mapped (provider: {mapped_financials.raw_data_provider}). YFinance financial processing skipped.")
    else: # This case implies YF financials fetch was skipped (dummy task) but mapped_financials is still None (e.g. EODHD stub failed)
        logger.info(f"{combined_log_prefix} YFinance financials processing was skipped (e.g. dummy task) and no prior financials were mapped.")


    # --- Process EarningsData (Container Model) ---
    # Primary: YFinance (from fetched financial statements)
    # Fallback: AlphaVantage (if configured)
    map_earn_start = time.monotonic()
    earnings_source_provider: Optional[str] = None
    
    yf_annual_income_stmt: Optional[pd.DataFrame] = None
    yf_quarterly_income_stmt: Optional[pd.DataFrame] = None

    if isinstance(yf_all_financials_dfs_raw, dict):
        # Extract income statements for earnings mapping
        yf_annual_income_stmt = yf_all_financials_dfs_raw.get("income_annual")
        yf_quarterly_income_stmt = yf_all_financials_dfs_raw.get("income_quarterly")
        logger.debug(f"{combined_log_prefix} Extracted YF income statements for earnings. Annual: {'DataFrame' if yf_annual_income_stmt is not None else 'None'}, Quarterly: {'DataFrame' if yf_quarterly_income_stmt is not None else 'None'}")
    elif yf_all_financials_dfs_raw is not None: # It was an exception or other non-dict type
        logger.warning(f"{combined_log_prefix} Cannot extract YF income statements for earnings; yf_all_financials_dfs_raw is not a dict (type: {type(yf_all_financials_dfs_raw)}).")
    # If yf_all_financials_dfs_raw is None (e.g. dummy task or fetch failure), the income stmts will remain None.

    # Attempt YFinance Earnings processing
    # Check if at least one of the DataFrames is not None and not empty
    can_process_yf_earnings = (yf_annual_income_stmt is not None and not yf_annual_income_stmt.empty) or \
                              (yf_quarterly_income_stmt is not None and not yf_quarterly_income_stmt.empty)

    if can_process_yf_earnings:
        logger.info(f"{combined_log_prefix} Processing YFinance earnings from fetched income statements. Currency: {company_currency}")
        try:
            annual_periods: List[EarningsPeriodData] = []
            if yf_annual_income_stmt is not None and not yf_annual_income_stmt.empty:
                annual_periods = mappers.map_yfinance_financial_statement_to_earnings_periods(
                    statement_df=yf_annual_income_stmt, # Corrected parameter name
                    request_id=request_id,
                    currency=company_currency, # Propagate company currency
                    report_period_type="annual"
                )
            
            quarterly_periods: List[EarningsPeriodData] = []
            if yf_quarterly_income_stmt is not None and not yf_quarterly_income_stmt.empty:
                quarterly_periods = mappers.map_yfinance_financial_statement_to_earnings_periods(
                    statement_df=yf_quarterly_income_stmt, # Corrected parameter name
                    request_id=request_id,
                    currency=company_currency, # Propagate company currency
                    report_period_type="quarterly"
                )

            if annual_periods or quarterly_periods:
                mapped_earnings_container = EarningsData(
                    symbol=yfinance_symbol, # <<< HOZZÁADVA
                    annual_reports=annual_periods,
                    quarterly_reports=quarterly_periods,
                    raw_data_provider='yfinance',
                    currency=company_currency
                )
                earnings_source_provider = 'yfinance'
                logger.info(f"{combined_log_prefix} YFinance EarningsData mapped. Symbol: {mapped_earnings_container.symbol}, Currency: {mapped_earnings_container.currency}, Annual: {len(annual_periods)}, Quarterly: {len(quarterly_periods)} reports.")
            else:
                logger.info(f"{combined_log_prefix} No earnings periods mapped from YFinance income statements (possibly empty after mapping or all mapping attempts failed).")
        except NotImplementedError:
            logger.error(f"{combined_log_prefix} YF Earnings mapping failed: 'map_yfinance_financial_statement_to_earnings_periods' not found/implemented.", exc_info=False)
        except ValidationError as e_val_yf_earn:
            logger.error(f"{combined_log_prefix} Pydantic validation for YF EarningsData container failed: {e_val_yf_earn.errors()}", exc_info=False)
        except Exception as e_map_yf_earn:
            logger.error(f"{combined_log_prefix} Unexpected error mapping YF EarningsData: {e_map_yf_earn}", exc_info=True)
    else:
        logger.info(f"{combined_log_prefix} No suitable YFinance income statements available for earnings mapping (annual empty: {yf_annual_income_stmt is None or yf_annual_income_stmt.empty}, quarterly empty: {yf_quarterly_income_stmt is None or yf_quarterly_income_stmt.empty}). yf_all_financials_dfs_raw type: {type(yf_all_financials_dfs_raw)}.")

    # Fallback to AlphaVantage for Earnings if not mapped yet and configured
    if mapped_earnings_container is None and SECONDARY_DATA_SOURCE == 'alpha_vantage':
        logger.info(f"{combined_log_prefix} Attempting fallback earnings fetch (AlphaVantage for {yfinance_symbol})...")
        av_fetch_start_ts = time.monotonic()
        av_earnings_raw: Optional[Union[Dict, Exception]] = None
        try:
            av_earnings_raw = await fetchers.fetch_alpha_vantage_earnings(yfinance_symbol, client, cache) # yfinance_symbol is often the same as AV symbol
            av_fetch_duration = time.monotonic() - av_fetch_start_ts

            if isinstance(av_earnings_raw, dict) and av_earnings_raw:
                # Check for meaningful data, not just an info/error message from AV
                is_meaningful_av_data = (av_earnings_raw.get('annualEarnings') or av_earnings_raw.get('quarterlyEarnings')) and \
                                        not all(k.lower() in ['information', 'note', 'error message'] for k in av_earnings_raw.keys() if len(av_earnings_raw.keys()) <=2 )
                if is_meaningful_av_data:
                    logger.info(f"{combined_log_prefix} Fallback AV earnings fetched successfully in {av_fetch_duration:.3f}s.")
                    try:
                        # Note: map_alpha_vantage_earnings_to_model might not need company_currency,
                        # as AV data often has its own currency indicators or implies USD.
                        mapped_earnings_container = mappers.map_alpha_vantage_earnings_to_model(
                            raw_av_earnings_data=av_earnings_raw,
                            request_id=request_id
                            # currency=company_currency # Pass if mapper supports/needs it
                        )
                        if mapped_earnings_container:
                            earnings_source_provider = 'alpha_vantage'
                            if not mapped_earnings_container.symbol: # AV mapper adhat szimbólumot, de ha nem, mi adjuk
                                mapped_earnings_container.symbol = yfinance_symbol # Vagy fmp_symbol, ha az relevánsabb AV-hez
                            if company_currency and not mapped_earnings_container.currency: # Ez már benne van
                                mapped_earnings_container.currency = company_currency
                            logger.info(f"{combined_log_prefix} AlphaVantage EarningsData mapped successfully. Symbol: {mapped_earnings_container.symbol}, Currency: {mapped_earnings_container.currency}")
                        else:
                            logger.warning(f"{combined_log_prefix} AV EarningsData mapping returned None.")
                    except NotImplementedError: 
                        logger.error(f"{combined_log_prefix} AV Earnings mapping failed: Mapper not found.", exc_info=False)
                    except ValidationError as e_val_av: 
                        logger.error(f"{combined_log_prefix} Pydantic validation for AV EarningsData: {e_val_av.errors()}", exc_info=False)
                    except Exception as e_map_av: 
                        logger.error(f"{combined_log_prefix} Unexpected error mapping AV EarningsData: {e_map_av}", exc_info=True)
                else:
                    logger.warning(f"{combined_log_prefix} Fallback AV earnings data seems empty, info-only, or error message in {av_fetch_duration:.3f}s. Data: {str(av_earnings_raw)[:200]}")
            elif isinstance(av_earnings_raw, Exception):
                 logger.error(f"{combined_log_prefix} Fallback AV earnings fetch returned an exception after {av_fetch_duration:.3f}s: {av_earnings_raw}", exc_info=False)
            else: # None or other unexpected type
                 logger.warning(f"{combined_log_prefix} Fallback AV earnings returned no data or unexpected type ({type(av_earnings_raw)}) after {av_fetch_duration:.3f}s.")
        except NotImplementedError:
            logger.error(f"{combined_log_prefix} Fallback AV earnings fetch failed: 'fetch_alpha_vantage_earnings' not implemented.", exc_info=False)
        except Exception as e_av_fetch:
            logger.error(f"{combined_log_prefix} Error during fallback AV earnings fetch: {e_av_fetch}", exc_info=True)
            
    if mapped_earnings_container:
        logger.info(f"{combined_log_prefix} EarningsData mapped from '{earnings_source_provider}' in {time.monotonic() - map_earn_start:.4f}s.")
    else:
        logger.info(f"{combined_log_prefix} No EarningsData mapped after attempting all sources ({time.monotonic() - map_earn_start:.4f}s).")

    # --- Process Ratings (FMP) ---
    map_rate_start = time.monotonic()
    processed_ratings_input_list: Optional[List[Dict]] = None

    if isinstance(ratings_fmp_raw, Exception):
        logger.error(f"{combined_log_prefix} FMP ratings fetch task returned an exception: {ratings_fmp_raw}", exc_info=False)
    elif ratings_fmp_raw is None:
        logger.info(f"{combined_log_prefix} FMP ratings fetch returned None.")
    elif not isinstance(ratings_fmp_raw, list):
        logger.warning(f"{combined_log_prefix} FMP ratings fetch returned non-list data: {type(ratings_fmp_raw)}. Data: {str(ratings_fmp_raw)[:200]}")
    else: # Should be a list of dicts if successful
        logger.debug(f"{combined_log_prefix} FMP ratings raw data received as list, proceeding to _process_ratings_result.")
        processed_ratings_input_list = await _process_ratings_result(ratings_fmp_raw, request_id)

    if processed_ratings_input_list:
        logger.info(f"{combined_log_prefix} Mapping {len(processed_ratings_input_list)} processed FMP rating items to List[RatingPoint]...")
        try:
            mapped_ratings_list = mappers.map_fmp_raw_ratings_to_rating_points(
            ratings_list=processed_ratings_input_list, # <<< JAVÍTVA ERRE
            request_id=request_id
        )
            if mapped_ratings_list is not None: # Could be an empty list, which is valid and means no errors.
                logger.info(f"{combined_log_prefix} Successfully mapped {len(mapped_ratings_list)} FMP ratings to List[RatingPoint] in {time.monotonic() - map_rate_start:.4f}s.")
            else: # Mapper explicitly returned None, indicating an issue during mapping not caught by exceptions.
                 logger.warning(f"{combined_log_prefix} FMP ratings mapping (map_fmp_raw_ratings_to_rating_points) returned None after {time.monotonic() - map_rate_start:.4f}s.")
        except NotImplementedError:
            logger.error(f"{combined_log_prefix} FMP Ratings mapping failed: 'map_fmp_raw_ratings_to_rating_points' not found/implemented.", exc_info=False)
        except ValidationError as e_val_rate:
            logger.error(f"{combined_log_prefix} Pydantic validation failed during FMP ratings mapping: {e_val_rate.errors()}", exc_info=False)
        except Exception as e_map_rat:
            logger.error(f"{combined_log_prefix} Unexpected error mapping FMP ratings: {e_map_rat}", exc_info=True)
    else:
        logger.info(f"{combined_log_prefix} No valid FMP ratings data (after _process_ratings_result or due to fetch issues) to map.")

    # --- Final Logging and Return ---
    fin_provider = getattr(mapped_financials, 'raw_data_provider', 'N/A') if mapped_financials else 'None'
    fin_currency = getattr(mapped_financials, 'currency', 'N/A') if mapped_financials else 'N/A'
    logger.info(f"{combined_log_prefix} Final FinancialsData: Provider='{fin_provider}', Currency='{fin_currency}'.")

    if mapped_earnings_container:
        earn_provider = getattr(mapped_earnings_container, 'raw_data_provider', 'N/A')
        earn_currency = getattr(mapped_earnings_container, 'currency', 'N/A')
        num_annual = len(getattr(mapped_earnings_container, 'annual_reports', []))
        num_quarterly = len(getattr(mapped_earnings_container, 'quarterly_reports', []))
        logger.info(f"{combined_log_prefix} Final EarningsData: Provider='{earn_provider}', Currency='{earn_currency}', Annual Reports={num_annual}, Quarterly Reports={num_quarterly}.")
    else:
         logger.info(f"{combined_log_prefix} Final EarningsData: None.")

    if mapped_ratings_list is not None: # An empty list is a valid result (no ratings found)
        logger.info(f"{combined_log_prefix} Final Ratings (List[RatingPoint]): Count={len(mapped_ratings_list)}.")
    else: # Mapped_ratings_list is None, indicating an error or no data processed to this stage
         logger.info(f"{combined_log_prefix} Final Ratings (List[RatingPoint]): None (mapping or processing failed).")

    total_combined_duration = time.monotonic() - combined_start_time
    logger.info(f"{combined_log_prefix} Combined financial/earnings/ratings processing finished in {total_combined_duration:.4f}s for YF:{yfinance_symbol}.")
    
    return mapped_financials, mapped_earnings_container, mapped_ratings_list
async def _validate_ohlcv_dataframe(
    chart_ready_list: List[Dict[str, Any]],
    log_prefix: str
) -> Optional[pd.DataFrame]:
    validate_log_prefix = f"{log_prefix}[ValidateOhlcvListToDf]"
    logger.debug(f"{validate_log_prefix} Starting OHLCV list validation & DF creation for indicators/AI...")

    if not chart_ready_list:
        logger.warning(f"{validate_log_prefix} Input chart_ready_list is empty/None. Skipping DF creation.")
        return None
    if not isinstance(chart_ready_list, list):
        logger.error(f"{validate_log_prefix} Input is not a list (Type: {type(chart_ready_list)}). Skipping DF creation.")
        return None

    df = pd.DataFrame()
    try:
        df = pd.DataFrame(chart_ready_list)
        if df.empty:
             logger.warning(f"{validate_log_prefix} Created DataFrame is empty from input list.")
             return None

        original_shape = df.shape
        logger.debug(f"{validate_log_prefix} Initial DF shape (from list): {original_shape}. Columns: {list(df.columns)}")

        required_input_cols = ['t', 'o', 'h', 'l', 'c']
        missing_input_cols = [col for col in required_input_cols if col not in df.columns]
        if missing_input_cols:
            logger.error(f"{validate_log_prefix} Validation failed: DataFrame missing required input columns from list: {missing_input_cols}.")
            return None
        if 'v' not in df.columns:
            logger.warning(f"{validate_log_prefix} Input list missing 'v' (volume). Volume in output DF will be NaN.")
            df['v'] = pd.NA

        df['datetime_utc'] = pd.to_datetime(df['t'], unit='ms', errors='coerce', utc=True)
        invalid_timestamps = df['datetime_utc'].isna()
        num_invalid_ts = invalid_timestamps.sum()
        if num_invalid_ts > 0:
             invalid_t_values = df.loc[invalid_timestamps, 't'].head().tolist()
             logger.warning(f"{validate_log_prefix} Found {num_invalid_ts} rows with invalid 't' timestamps. Examples: {invalid_t_values}. Dropping.")
             df = df.dropna(subset=['datetime_utc'])

        if df.empty:
            logger.warning(f"{validate_log_prefix} DataFrame empty after removing invalid timestamps.")
            return None

        df = df.set_index('datetime_utc').drop(columns=['t'])
        rename_map = {'o': 'open', 'h': 'high', 'l': 'low', 'c': 'close', 'v': 'volume'}
        df = df.rename(columns=rename_map)
        logger.debug(f"{validate_log_prefix} Renamed columns: {list(df.columns)}")

        numeric_cols_std = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_cols_std:
            if col in df.columns:
                 df[col] = pd.to_numeric(df[col], errors='coerce')
            else:
                 logger.error(f"{validate_log_prefix} Standard column '{col}' missing after rename. Critical error.")
                 return None
        logger.debug(f"{validate_log_prefix} OHLCV columns converted to numeric.")

        essential_ohlc_cols_std = ['open', 'high', 'low', 'close']
        initial_rows_numeric = len(df)
        df = df.dropna(subset=essential_ohlc_cols_std)
        dropped_nan_ohlc = initial_rows_numeric - len(df)
        if dropped_nan_ohlc > 0:
            logger.warning(f"{validate_log_prefix} Dropped {dropped_nan_ohlc} rows due to NaN in essential OHLC columns.")

        if df.empty:
            logger.warning(f"{validate_log_prefix} DataFrame empty after dropping NaN OHLC rows.")
            return None

        if not df.index.is_monotonic_increasing:
             logger.warning(f"{validate_log_prefix} Index not monotonic. Re-sorting.")
             df.sort_index(inplace=True)

        final_required_cols = ['open', 'high', 'low', 'close', 'volume']
        missing_final_cols = [col for col in final_required_cols if col not in df.columns]
        if missing_final_cols:
             logger.error(f"{validate_log_prefix} Final DF missing required standard columns: {missing_final_cols}. Has: {list(df.columns)}. Critical.")
             return None

        logger.info(f"{validate_log_prefix} OHLCV list validation & DF creation successful. Final DF shape: {df.shape}. Index: {df.index.min()} to {df.index.max()}")
        return df[final_required_cols]

    except Exception as e_validate:
        logger.error(f"{validate_log_prefix} Unexpected error during OHLCV list validation/DF creation: {e_validate}", exc_info=True)
        logger.debug(f"{validate_log_prefix} DataFrame state at error: Head:\n{df.head() if not df.empty else 'Empty DF'}")
        return None
# backend/core/stock_data_service.py

# ... (Importok és egyéb kód a fájlban) ...

async def _prepare_ohlcv_for_response(
    chart_ready_ohlcv_list: Optional[List[Dict[str, Any]]],
    request_id: str
) -> Tuple[List[CompanyPriceHistoryEntry], Optional[LatestOHLCV], Optional[str], Optional[float]]:
    """
    Feldolgozza a 'chart-ready' OHLCV listát a végső API válaszhoz szükséges komponensekre.

    Args:
        chart_ready_ohlcv_list: Bemeneti lista dict-ekkel, ahol 't' ms timestamp.
        request_id: A kérés azonosítója logoláshoz.

    Returns:
        Tuple:
            - List[CompanyPriceHistoryEntry]: Validált historikus adatok (másodperc ts).
            - Optional[LatestOHLCV]: Validált legutolsó adatpont (másodperc ts).
            - Optional[str]: A legutolsó adatpont dátuma 'YYYY-MM-DD' formátumban.
            - Optional[float]: Az utolsó napi záróár változása százalékban.
    """
    func_name = "_prepare_ohlcv_for_response_v4.1.2_robust" # Verziószám frissítve
    log_prefix = f"[{request_id}][{func_name}]"
    logger.info(f"{log_prefix} Starting OHLCV preparation for final response...")

    # --- Kezdeti validáció és változó inicializálás ---
    history_list_validated: List[CompanyPriceHistoryEntry] = []
    latest_point_validated: Optional[LatestOHLCV] = None
    last_date_obj: Optional[Date] = None # Date objektum a legutolsó ponthoz
    change_pct: Optional[float] = None

    if not isinstance(chart_ready_ohlcv_list, list) or not chart_ready_ohlcv_list:
        logger.warning(f"{log_prefix} Input 'chart_ready_ohlcv_list' is not a non-empty list. Returning empty results.")
        return history_list_validated, latest_point_validated, None, change_pct # Üres tuple helyett None a dátum stringnek

    prep_start = time.monotonic()
    total_input_points = len(chart_ready_ohlcv_list)
    logger.info(f"{log_prefix} Received {total_input_points} raw chart-ready points.")

    # --- 1. Historikus Adatok Feldolgozása (`history_list_validated`) ---
    history_processing_start = time.monotonic()
    try:
        chart_years = CHART_YEARS
        # Pontosabb becslés, figyelembe véve hétvégéket/ünnepeket (kb. 252 nap/év)
        # A buffer segít, ha az adatsor ritkább, de az évek száma a fő vezérlő.
        max_points_for_chart = int(chart_years * 261 * 1.1) # Approx weekdays + buffer
        if max_points_for_chart <= 0: max_points_for_chart = 280 # Minimum fallback

        start_idx = max(0, total_input_points - max_points_for_chart)
        list_for_chart_history = chart_ready_ohlcv_list[start_idx:]
        num_points_in_slice = len(list_for_chart_history)
        logger.info(f"{log_prefix} Sliced list for chart history (~{chart_years:.1f} years, max {max_points_for_chart} points). Actual slice len: {num_points_in_slice}.")

        processed_hist_count = 0
        skipped_hist_count = 0
        first_validation_errors: List[str] = []

        for i, point_dict_raw in enumerate(list_for_chart_history):
            point_index_in_original = start_idx + i
            processed_hist_count += 1
            point_log_prefix = f"{log_prefix}[HistIdx:{point_index_in_original}]"

            if not isinstance(point_dict_raw, dict):
                 logger.warning(f"{point_log_prefix} Skipping: Item not a dictionary (Type: {type(point_dict_raw)}).")
                 skipped_hist_count += 1; continue

            # Timestamp (ms -> s) és alapvető kulcsok ellenőrzése
            t_ms_raw = point_dict_raw.get('t')
            t_sec: Optional[int] = None
            try:
                if t_ms_raw is None: raise KeyError("'t' key missing")
                if not isinstance(t_ms_raw, (int, float)) or not math.isfinite(t_ms_raw): raise TypeError(f"Invalid type/value for 't': {t_ms_raw}")
                t_sec = int(float(t_ms_raw) // 1000)
            except (KeyError, TypeError, ValueError) as e_ts_hist:
                logger.warning(f"{point_log_prefix} Skipping: Invalid timestamp 't': {e_ts_hist}. Raw point: {point_dict_raw}")
                skipped_hist_count += 1; continue

            # Adatok előkészítése a CompanyPriceHistoryEntry modellhez
            try:
                data_for_cph_entry = {
                    "time": t_sec, # Már másodpercben
                    "open": point_dict_raw['o'],
                    "high": point_dict_raw['h'],
                    "low": point_dict_raw['l'],
                    "close": point_dict_raw['c'],
                    "volume": point_dict_raw.get('v'), # Volume lehet None
                }
                # Pydantic validáció
                validated_point = CompanyPriceHistoryEntry.model_validate(data_for_cph_entry)
                history_list_validated.append(validated_point)
            except KeyError as e_key:
                logger.warning(f"{point_log_prefix} Skipping: Missing required price key {e_key}. Raw point: {point_dict_raw}")
                skipped_hist_count += 1
            except ValidationError as e_val:
                skipped_hist_count += 1
                error_detail = f"Pydantic Err: {e_val.errors()[0].get('loc','?')} - {e_val.errors()[0].get('msg','?')}"
                if len(first_validation_errors) < 5: first_validation_errors.append(error_detail)
                logger.warning(f"{point_log_prefix} Skipping: {error_detail}. Raw point: {point_dict_raw}")
            except Exception as e_other_hist:
                skipped_hist_count += 1
                logger.error(f"{point_log_prefix} Skipping: UNEXPECTED error during history point validation: {e_other_hist}. Raw point: {point_dict_raw}", exc_info=True)

        logger.info(f"{log_prefix} History processing finished. Processed: {processed_hist_count}, Validated: {len(history_list_validated)}, Skipped: {skipped_hist_count}.")
        if first_validation_errors:
            logger.warning(f"{log_prefix} First few history validation errors: {'; '.join(first_validation_errors)}")

    except Exception as e_hist_outer:
        logger.error(f"{log_prefix} CRITICAL error during HISTORY list preparation: {e_hist_outer}", exc_info=True)
        # Folytatjuk a többi résszel, de a history lehet hiányos/üres

    logger.debug(f"{log_prefix} History processing took {time.monotonic() - history_processing_start:.4f}s.")

    # --- 2. Legutolsó Pont Feldolgozása (`latest_point_validated`, `last_date_obj`) ---
    latest_point_processing_start = time.monotonic()
    latest_raw_point = chart_ready_ohlcv_list[-1] # Az eredeti lista utolsó eleme
    latest_point_index = total_input_points - 1
    latest_point_log_prefix = f"{log_prefix}[LatestPtIdx:{latest_point_index}]"

    if not isinstance(latest_raw_point, dict):
        logger.error(f"{latest_point_log_prefix} Latest point data is not a dictionary (Type: {type(latest_raw_point)}). Cannot process latest point.")
    else:
        logger.debug(f"{latest_point_log_prefix} Processing raw data: {latest_raw_point}")
        t_ms_raw = latest_raw_point.get('t')
        t_sec: Optional[int] = None
        latest_dt_obj: Optional[datetime] = None

        # 2.A Timestamp kinyerése és konverziója másodpercre
        try:
            if t_ms_raw is None: raise KeyError("'t' key missing")
            if not isinstance(t_ms_raw, (int, float)) or not math.isfinite(t_ms_raw): raise TypeError(f"Invalid type/value: {t_ms_raw}")
            t_sec = int(float(t_ms_raw) // 1000)
            logger.debug(f"{latest_point_log_prefix} Converted timestamp: {t_ms_raw}ms -> {t_sec}s")
        except (KeyError, TypeError, ValueError) as e_ts_latest:
            logger.error(f"{latest_point_log_prefix} Invalid/Missing latest timestamp 't': {e_ts_latest}. Cannot determine date or validate model.", exc_info=False)
            # t_sec None marad

        # 2.B Másodperc timestamp konverziója datetime és Date objektumokká
        if t_sec is not None:
            try:
                latest_dt_obj = datetime.fromtimestamp(t_sec, tz=timezone.utc)
                last_date_obj = latest_dt_obj.date() # <<< Itt állítjuk be a Date objektumot
                logger.info(f"{latest_point_log_prefix} Successfully derived latest date: {last_date_obj}")
            except (OSError, OverflowError, ValueError) as e_ts_conv:
                logger.error(f"{latest_point_log_prefix} Error converting latest timestamp (sec: {t_sec}) to datetime: {e_ts_conv}. Cannot determine date.", exc_info=True)
                last_date_obj = None # Hiba esetén None
            except Exception as e_ts_other:
                 logger.error(f"{latest_point_log_prefix} Unexpected error converting LATEST timestamp (sec: {t_sec}) to datetime: {e_ts_other}", exc_info=True)
                 last_date_obj = None

        # 2.C LatestOHLCV modell validálása (csak ha a timestamp másodperc formátum rendben volt)
        if t_sec is not None:
            try:
                data_for_latest_model = latest_raw_point.copy()
                data_for_latest_model['t'] = t_sec # A konvertált másodperc timestamp
                # Opcionális: time_iso előállítása a modellnek, ha a validátora nem kezeli
                # data_for_latest_model['time_iso'] = latest_dt_obj.isoformat() if latest_dt_obj else None
                
                latest_point_validated = LatestOHLCV.model_validate(data_for_latest_model)
                logger.info(f"{latest_point_log_prefix} Validated LATEST OHLCV point model successfully.")
            except ValidationError as e_val_latest:
                logger.error(f"{latest_point_log_prefix} Pydantic Validation FAILED for LATEST point model: {e_val_latest.errors()}. Setting latest_point_validated to None.", exc_info=False)
                latest_point_validated = None
                # Nem nullázzuk ki a last_date_obj-t, ha az sikeres volt!
            except Exception as e_latest_other:
                logger.error(f"{latest_point_log_prefix} Unexpected error validating LATEST point model: {e_latest_other}", exc_info=True)
                latest_point_validated = None
        else:
            logger.warning(f"{latest_point_log_prefix} Cannot validate LATEST point model due to timestamp error.")
            # latest_point_validated None marad, last_date_obj is None

    logger.debug(f"{log_prefix} Latest point & date processing took {time.monotonic() - latest_point_processing_start:.4f}s.")

    # --- 3. Változás Számítása (`change_pct`) ---
    change_calc_start = time.monotonic()
    if total_input_points >= 2:
        try:
            last_close = parse_optional_float(latest_raw_point.get('c')) # Használjuk a már létező latest_raw_point-ot
            second_last_raw_point = chart_ready_ohlcv_list[-2]
            prev_close = None
            if isinstance(second_last_raw_point, dict):
                prev_close = parse_optional_float(second_last_raw_point.get('c'))

            if last_close is not None and prev_close is not None:
                if not math.isclose(prev_close, 0.0):
                    change_pct = round(((last_close - prev_close) / prev_close) * 100, 2)
                    logger.info(f"{log_prefix} Calculated day change %: {change_pct:.2f} (L: {last_close}, P: {prev_close})")
                elif math.isclose(last_close, 0.0): # Handles 0/0 case
                    change_pct = 0.0
                    logger.info(f"{log_prefix} Last & prev close are zero (or close). Change % = 0.0.")
                else: # Prev close is zero, last is not
                    change_pct = None # Infinite change is not meaningful
                    logger.warning(f"{log_prefix} Prev close zero, cannot calc finite change % (L: {last_close}). Change % = None.")
            else:
                logger.warning(f"{log_prefix} Could not calc change %: Missing valid close values (L: {last_close}, P: {prev_close}).")
                change_pct = None
        except IndexError:
            logger.error(f"{log_prefix} IndexError during change % calculation (points: {total_input_points}).", exc_info=False)
            change_pct = None
        except Exception as e_change_calc:
             logger.error(f"{log_prefix} Unexpected error during change % calculation: {e_change_calc}", exc_info=True)
             change_pct = None
    else:
        logger.info(f"{log_prefix} Not enough data points ({total_input_points} < 2) for day change %.")
        change_pct = None

    logger.debug(f"{log_prefix} Change percentage calculation took {time.monotonic() - change_calc_start:.4f}s.")

    # --- 4. Végső Visszatérési Értékek Összeállítása ---
    # A last_date_obj-ból stringet csinálunk CSAK a visszatéréshez
    final_last_date_str = last_date_obj.isoformat() if last_date_obj else None

    prep_duration = time.monotonic() - prep_start
    logger.info(f"{log_prefix} Finished OHLCV prep for response in {prep_duration:.4f}s.")
    logger.info(f"{log_prefix}   >> Results: HistoryItems={len(history_list_validated)}, LatestValid={latest_point_validated is not None}, LastDate={final_last_date_str}, ChangePct={change_pct}")

    return history_list_validated, latest_point_validated, final_last_date_str, change_pct

# ... (A fájl többi része, pl. _calculate_indicators, process_premium_stock_data stb.) ...
async def _calculate_indicators(ohlcv_df: pd.DataFrame, symbol: str, request_id: str) -> Optional[IndicatorHistory]:
    log_prefix = f"[{request_id}][CalcIndicators:{symbol}]"
    required_cols = ['open', 'high', 'low', 'close', 'volume']
    if ohlcv_df is None:
        logger.warning(f"{log_prefix} Skipping indicator calculation: Input DataFrame is None.")
        return None
    if not isinstance(ohlcv_df, pd.DataFrame):
         logger.error(f"{log_prefix} Skipping indicator calculation: Input not DataFrame (Type: {type(ohlcv_df)}).")
         return None
    if ohlcv_df.empty:
        logger.warning(f"{log_prefix} Skipping indicator calculation: Input DataFrame empty.")
        return None
    missing_cols = [col for col in required_cols if col not in ohlcv_df.columns]
    if missing_cols:
        logger.error(f"{log_prefix} Skipping indicator calculation: DF missing cols: {missing_cols}. Has: {list(ohlcv_df.columns)}")
        return None

    try:
        logger.info(f"{log_prefix} Calling indicator service with DF shape {ohlcv_df.shape}...")
        indic_start = time.monotonic()
        indicator_model = calculate_and_format_indicators(ohlcv_df=ohlcv_df, symbol=symbol)
        indic_duration = time.monotonic() - indic_start

        if indicator_model is None:
             logger.warning(f"{log_prefix} Indicator service returned None after {indic_duration:.4f}s.")
             return None
        elif isinstance(indicator_model, IndicatorHistory):
             has_data = False
             for field_name in indicator_model.model_fields:
                 field_value = getattr(indicator_model, field_name, None)
                 if isinstance(field_value, (list, dict)) and field_value: has_data = True; break
                 elif field_value is not None and not isinstance(field_value, (list, dict)): has_data = True; break
             if has_data: logger.info(f"{log_prefix} Indicator calculation successful, model has data. Time: {indic_duration:.4f}s.")
             else: logger.warning(f"{log_prefix} Indicator calculation returned model, but appears empty after {indic_duration:.4f}s.")
             return indicator_model
        else:
             logger.error(f"{log_prefix} Indicator service returned unexpected type: {type(indicator_model)}. Expected IndicatorHistory. Time: {indic_duration:.4f}s.")
             return None
    except NotImplementedError:
        logger.error(f"{log_prefix} Indicator calculation failed: Service 'calculate_and_format_indicators' not implemented.", exc_info=False)
        return None
    except Exception as e_indic_call:
        logger.error(f"{log_prefix} Unexpected error during indicator service call: {e_indic_call}", exc_info=True)
        return None

# backend/core/stock_data_service.py

def _extract_latest_indicators(indicator_model: Optional[IndicatorHistory], request_id: str) -> Dict[str, Optional[float]]:
    log_prefix = f"[{request_id}][ExtractLatestIndic]"
    latest_values: Dict[str, Optional[float]] = {}
    if not indicator_model:
        logger.debug(f"{log_prefix} Input indicator model is None, returning empty dict.")
        return latest_values
    if not isinstance(indicator_model, IndicatorHistory):
        logger.error(f"{log_prefix} Input not IndicatorHistory model (Type: {type(indicator_model)}).")
        return latest_values

    def get_last_valid_float(points: Optional[List[Any]], value_attr_name: str = 'value') -> Optional[float]:
        if not points or not isinstance(points, list): return None
        try:
            for point in reversed(points): # A legutolsó pontból indulunk visszafelé
                raw_value = None
                if isinstance(point, dict): # Ha a pont egy dictionary (pl. {"t": 123, "value": 45.6} vagy {"t": 123, "k": 10, "d": 12})
                    raw_value = point.get(value_attr_name)
                elif hasattr(point, value_attr_name): # Ha a pont egy Pydantic modell vagy más objektum attribútummal
                    raw_value = getattr(point, value_attr_name)
                else:
                    continue # Nincs ilyen attribútum ezen a ponton

                cleaned_value = _clean_value(raw_value) # _clean_value kezeli a None, NaN, inf értékeket
                if cleaned_value is None:
                    continue # Nem sikerült érvényes értéket tisztítani

                try:
                    parsed_value = float(cleaned_value)
                    if math.isfinite(parsed_value): # Csak véges float értékeket fogadunk el
                        return parsed_value
                except (ValueError, TypeError):
                    continue # Nem sikerült float-tá konvertálni
        except Exception as e_get_last:
            # Logoljuk a hibát, de ne akassza meg a teljes folyamatot
            logger.warning(f"{log_prefix} Error getting last valid float for attr '{value_attr_name}' from points list: {e_get_last}", exc_info=False)
        return None # Ha nem találtunk érvényes értéket

    # JAVÍTÁS ITT: A stoch_k és stoch_d most a helyes 'k' és 'd' attribútumneveket használja
    indicator_map_config = {
        'sma_short': ('sma', 'SMA_SHORT', 'value'), 'sma_long': ('sma', 'SMA_LONG', 'value'),
        'ema_short': ('ema', 'EMA_SHORT', 'value'), 'ema_long': ('ema', 'EMA_LONG', 'value'),
        'bb_lower': ('bbands', 'BBANDS_LOWER', 'value'), 'bb_middle': ('bbands', 'BBANDS_MIDDLE', 'value'),
        'bb_upper': ('bbands', 'BBANDS_UPPER', 'value'),
        'rsi': ('rsi', 'RSI', 'value'),
        'macd_line': ('macd', 'MACD_LINE', 'value'), 'macd_signal': ('macd', 'MACD_SIGNAL', 'value'),
        'macd_hist': ('macd', 'MACD_HIST', 'value'),
        'volume_sma': ('volume_sma', 'VOLUME_SMA', 'value'),
        # Itt a harmadik elem a 'value_attr_name' a get_last_valid_float függvényhez
        'stoch_k': ('stoch', 'STOCH', 'k'),      # <<< JAVÍTVA 'k'-ra
        'stoch_d': ('stoch', 'STOCH', 'd')       # <<< JAVÍTVA 'd'-re
    }

    extraction_start = time.monotonic(); extracted_count = 0; failed_extractions = []
    logger.debug(f"{log_prefix} Starting extraction for {len(indicator_map_config)} indicators...")

    for output_key, (group_name, series_name, value_attr) in indicator_map_config.items():
        latest_val = None
        try:
            indicator_group = getattr(indicator_model, group_name, None)
            if indicator_group is None:
                # logger.debug(f"{log_prefix} Indicator group '{group_name}' not found in model.")
                continue

            indicator_series_list = getattr(indicator_group, series_name, None)
            if indicator_series_list is None:
                # logger.debug(f"{log_prefix} Indicator series '{series_name}' not found in group '{group_name}'.")
                continue
            
            latest_val = get_last_valid_float(indicator_series_list, value_attr)

            if latest_val is not None:
                 latest_values[output_key] = latest_val
                 extracted_count += 1
            # else:
                 # logger.debug(f"{log_prefix} No valid latest value found for '{output_key}' ({group_name}.{series_name} with attr '{value_attr}').")

        except AttributeError:
            logger.warning(f"{log_prefix} AttributeError accessing '{group_name}.{series_name}' or its attribute '{value_attr}'. Check model/map config.", exc_info=False)
            failed_extractions.append(output_key)
        except Exception as e_extract_loop:
            logger.error(f"{log_prefix} Error extracting latest for '{output_key}': {e_extract_loop}", exc_info=True)
            failed_extractions.append(output_key)

    logger.debug(f"{log_prefix} Finished extraction. Extracted {extracted_count} values in {time.monotonic() - extraction_start:.4f}s.")
    if failed_extractions:
        logger.warning(f"{log_prefix} Failed to extract some latest indicator values: {failed_extractions}")
    return latest_values


async def _fetch_and_process_news_dynamically(
    symbol: str,
    client: httpx.AsyncClient,
    request_id: str,
    cache: CacheService,
    eodhd_available: bool,
    # Opcionális: explicit átadhatjuk a mappelő függvényeket, ha szükséges
    # map_to_standard_func: callable = mappers.map_raw_news_to_standard_dicts,
    # map_to_newsitem_func: callable = mappers.map_standard_dicts_to_newsitems
) -> List[NewsItem]:
    """
    Fetches news from multiple sources dynamically based on configuration,
    deduplicates, sorts, maps to standard format, and finally maps to NewsItem models.

    Handles configuration errors, API failures, and data inconsistencies gracefully.
    Specifically addresses the issue with yfinance fetcher arguments.

    Args:
        symbol: The stock symbol to fetch news for.
        client: An httpx.AsyncClient instance for making API calls.
        request_id: Unique ID for logging correlation.
        cache: CacheService instance for caching results.
        eodhd_available: Flag indicating if EODHD API key is present.

    Returns:
        A list of validated NewsItem objects, sorted by publication date (descending).
    """
    func_name = "_fetch_and_process_news_dynamically_v2.1_debug" # Verziószám növelve a debug miatt
    log_prefix = f"[{request_id}][{func_name}:{symbol}]"
    logger.info(f"{log_prefix} Starting dynamic news processing...")
    log_prefix = f"[{request_id}][{func_name}:{symbol}]"
    logger.info(f"{log_prefix} Starting dynamic news processing...")
    fetch_process_start = time.monotonic()

    # --- 1. Load and Validate Configuration ---
    enabled_sources: List[str] = []
    source_priority: List[str] = []
    min_unique_target: int = DEFAULT_MIN_TARGET
    try:
        settings_news = getattr(settings, NEWS_CONFIG_SECTION, None)
        if settings_news is None:
            raise AttributeError(f"Configuration section '{NEWS_CONFIG_SECTION}' missing in settings.")

        # Enabled Sources
        enabled_sources_raw = getattr(settings_news, ENABLED_SOURCES_KEY, '')
        if isinstance(enabled_sources_raw, str):
            enabled_sources = [s.strip().lower() for s in enabled_sources_raw.split(',') if s.strip()]
        elif isinstance(enabled_sources_raw, (list, tuple)):
            enabled_sources = [str(s).strip().lower() for s in enabled_sources_raw if isinstance(s, str) and s.strip()]
        else:
            logger.warning(f"{log_prefix} Config '{ENABLED_SOURCES_KEY}' is not a string or list/tuple, using empty list.")
            enabled_sources = []

        # Source Priority
        priority_raw = getattr(settings_news, PRIORITY_KEY, '')
        if isinstance(priority_raw, str):
            source_priority = [s.strip().lower() for s in priority_raw.split(',') if s.strip()]
        elif isinstance(priority_raw, (list, tuple)):
            source_priority = [str(s).strip().lower() for s in priority_raw if isinstance(s, str) and s.strip()]
        else:
            logger.warning(f"{log_prefix} Config '{PRIORITY_KEY}' is not a string or list/tuple, using empty list.")
            source_priority = []

        # Minimum Target
        min_target_raw = getattr(settings_news, MIN_TARGET_KEY, DEFAULT_MIN_TARGET)
        try:
            min_unique_target = int(min_target_raw)
            if min_unique_target <= 0:
                logger.warning(f"{log_prefix} Config '{MIN_TARGET_KEY}' is non-positive ({min_target_raw}), using default: {DEFAULT_MIN_TARGET}.")
                min_unique_target = DEFAULT_MIN_TARGET
        except (ValueError, TypeError):
            logger.warning(f"{log_prefix} Config '{MIN_TARGET_KEY}' ('{min_target_raw}') is not a valid integer, using default: {DEFAULT_MIN_TARGET}.")
            min_unique_target = DEFAULT_MIN_TARGET

        logger.debug(f"{log_prefix} News Config Loaded - Enabled: {enabled_sources}, Priority: {source_priority}, Target: {min_unique_target}")

    except AttributeError as e_conf_attr:
        logger.error(f"{log_prefix} Configuration Error: {e_conf_attr}. Using defaults: Enabled=[], Prio=[], Target={DEFAULT_MIN_TARGET}.")
        enabled_sources, source_priority, min_unique_target = [], [], DEFAULT_MIN_TARGET
    except Exception as e_conf_other:
        logger.error(f"{log_prefix} Unexpected Error loading news config: {e_conf_other}. Using defaults.", exc_info=True)
        enabled_sources, source_priority, min_unique_target = [], [], DEFAULT_MIN_TARGET

    # --- 2. Determine Active Fetchers in Priority Order ---
    active_fetchers: Dict[str, callable] = {}
    skipped_fetchers: List[str] = []
    available_fetcher_names = list(NEWS_FETCHER_MAPPING.keys())

    for source_name in enabled_sources:
        if source_name not in available_fetcher_names:
            logger.warning(f"{log_prefix} Skipping source '{source_name}': No fetcher function found in mapping.")
            skipped_fetchers.append(f"{source_name} (Not Implemented)")
            continue
        if source_name == "eodhd" and not eodhd_available:
            logger.info(f"{log_prefix} Skipping source 'eodhd': EODHD API key not available.")
            skipped_fetchers.append("eodhd (Key Missing)")
            continue

        fetcher_func = NEWS_FETCHER_MAPPING[source_name]
        if callable(fetcher_func):
            logger.debug(f"{log_prefix} Activating fetcher for source: '{source_name}' -> {fetcher_func.__name__}")
            active_fetchers[source_name] = fetcher_func
        else:
             # Ez az ág elvileg nem futhat le a None szűrés miatt, de biztonsági tartalék
             logger.error(f"{log_prefix} Internal Error: Fetcher for '{source_name}' is not callable despite checks. Skipping.")
             skipped_fetchers.append(f"{source_name} (Not Callable)")


    if skipped_fetchers:
        logger.warning(f"{log_prefix} News sources skipped: {skipped_fetchers}")
    if not active_fetchers:
        logger.warning(f"{log_prefix} No active news fetchers configured or available. Skipping news fetch.")
        return []

    priority_map = {name: i for i, name in enumerate(source_priority)}
    fetchers_in_priority_order = sorted(
        active_fetchers.keys(),
        key=lambda s: priority_map.get(s, float('inf')) # Unprioritized sources go last
    )
    logger.info(f"{log_prefix} Active news fetchers: {list(active_fetchers.keys())}")
    logger.info(f"{log_prefix} Fetch priority order: {fetchers_in_priority_order}")

    # --- 3. Fetch, Process, and Deduplicate News ---
    final_news_items: List[NewsItem] = []
    all_standard_news_dicts: List[StandardNewsDict] = []
    seen_urls: Set[HttpUrl] = set()
    processed_sources_count = 0
    fetch_errors: Dict[str, str] = {} # Store fetch errors per source

    for source_name in fetchers_in_priority_order:
        source_log_prefix = f"{log_prefix}[Source:{source_name}]"
        logger.debug(f"{source_log_prefix} --- Processing source ---")

        if len(all_standard_news_dicts) >= min_unique_target:
            logger.info(f"{log_prefix} Reached target of {min_unique_target} unique news items. Stopping further fetches.")
            break

        logger.info(f"{source_log_prefix} Attempting news fetch...")
        fetch_start = time.monotonic()
        fetcher_function = active_fetchers[source_name]
        fetcher_result: Any = None
        processed_sources_count += 1

        try:
            # Determine symbol and arguments for the specific fetcher
            symbol_for_fetcher = _get_eodhd_symbol(symbol, log_prefix) if source_name == "eodhd" else symbol
            args_to_pass = {"symbol": symbol_for_fetcher, "cache": cache}
            # *** JAVÍTÁS: Csak akkor adjuk át a 'client'-et, ha nem yfinance ***
            if source_name != "yfinance":
                args_to_pass["client"] = client
                logger.debug(f"{source_log_prefix} Calling fetcher: {fetcher_function.__name__} with symbol, client, cache.")
            else:
                logger.debug(f"{source_log_prefix} Calling fetcher: {fetcher_function.__name__} with symbol, cache (NO client).")

            # Call the fetcher function
            fetcher_result = await fetcher_function(**args_to_pass)

            fetch_duration = time.monotonic() - fetch_start
            logger.debug(f"{source_log_prefix} Fetcher call completed in {fetch_duration:.3f}s. Result type: {type(fetcher_result).__name__}")

            # Process the result
            processed_raw_list: Optional[List[Dict[str, Any]]] = None
            if fetcher_result is None:
                logger.info(f"{source_log_prefix} Fetcher returned None.")
                fetch_errors[source_name] = "Fetcher returned None"
                continue # Try next source

            elif isinstance(fetcher_result, pd.DataFrame):
                logger.info(f"{source_log_prefix} Fetcher returned DataFrame (Shape: {fetcher_result.shape}). Converting...")
                if not fetcher_result.empty:
                    try:
                        # Handle potential Timestamp columns before converting
                        for col in fetcher_result.select_dtypes(include=['datetime64[ns]', 'datetime64[ns, UTC]']).columns:
                            logger.debug(f"{source_log_prefix} Converting Timestamp column '{col}' to ISO string for DataFrame conversion.")
                            # Naive check for timezone, convert to UTC if naive or different
                            if fetcher_result[col].dt.tz is None:
                                fetcher_result[col] = fetcher_result[col].dt.tz_localize('UTC')
                            else:
                                fetcher_result[col] = fetcher_result[col].dt.tz_convert('UTC')
                            fetcher_result[col] = fetcher_result[col].dt.strftime('%Y-%m-%dT%H:%M:%SZ')

                        processed_raw_list = fetcher_result.to_dict(orient='records')
                        logger.debug(f"{source_log_prefix} DataFrame converted to {len(processed_raw_list)} dicts.")
                    except Exception as e_conv:
                        logger.error(f"{source_log_prefix} Failed to convert DataFrame to List[Dict]: {e_conv}", exc_info=True)
                        fetch_errors[source_name] = f"DataFrame conversion error: {e_conv}"
                        continue
                else:
                    logger.info(f"{source_log_prefix} Fetcher returned an empty DataFrame.")
                    processed_raw_list = []

            elif isinstance(fetcher_result, list):
                # Basic validation: check if list contains dictionaries
                if all(isinstance(item, dict) for item in fetcher_result):
                    logger.info(f"{source_log_prefix} Fetcher returned List with {len(fetcher_result)} items (assumed dicts).")
                    processed_raw_list = fetcher_result
                else:
                    num_non_dicts = sum(1 for item in fetcher_result if not isinstance(item, dict))
                    logger.warning(f"{source_log_prefix} Fetcher returned List, but it contains {num_non_dicts} non-dictionary items. Skipping source.")
                    fetch_errors[source_name] = "List contains non-dict items"
                    continue

            else: # Unexpected type
                logger.warning(f"{source_log_prefix} Fetcher returned unexpected type: {type(fetcher_result)}. Skipping source.")
                fetch_errors[source_name] = f"Unexpected return type: {type(fetcher_result).__name__}"
                continue

            # --- Map to Standard Dictionaries and Deduplicate ---
            if processed_raw_list is None: # Should not happen if logic above is correct, but safety check
                 logger.error(f"{source_log_prefix} Internal logic error: processed_raw_list is None after result processing. Skipping.")
                 fetch_errors[source_name] = "Internal error post-processing result"
                 continue

            if not processed_raw_list:
                 logger.info(f"{source_log_prefix} No raw items to map after fetch/conversion.")
                 continue

            map_std_start = time.monotonic()
            try:
                logger.debug(f"{source_log_prefix} Mapping {len(processed_raw_list)} raw items to standard format...")
                # Use the assumed imported mapper function
                standard_dicts_from_source: List[StandardNewsDict] = mappers.map_raw_news_to_standard_dicts(
                    processed_raw_list, source_name # Pass source_name for context
                )
                map_std_duration = time.monotonic() - map_std_start
                logger.debug(f"{source_log_prefix} Mapping to standard format took {map_std_duration:.4f}s.")

                if not standard_dicts_from_source:
                    logger.info(f"{source_log_prefix} Mapping resulted in an empty list of standard dicts.")
                    continue
                if not isinstance(standard_dicts_from_source, list):
                     logger.error(f"{source_log_prefix} Mapper 'map_raw_news_to_standard_dicts' returned non-list type: {type(standard_dicts_from_source)}. Skipping source.")
                     fetch_errors[source_name] = f"Standard mapper returned wrong type: {type(standard_dicts_from_source).__name__}"
                     continue


                added_count = 0
                skipped_dedup_count = 0
                logger.debug(f"{source_log_prefix} Deduplicating {len(standard_dicts_from_source)} standard items...")
                for news_dict_idx, news_dict in enumerate(standard_dicts_from_source):
                    item_title_for_log = news_dict.get('title', 'N/A_TITLE')
                    
                    if not isinstance(news_dict, dict):
                        logger.warning(f"{source_log_prefix} Skipping item #{news_dict_idx} during deduplication: Not a dictionary. Type: {type(news_dict)}")
                        skipped_dedup_count += 1
                        continue

                    raw_url_obj_or_str = news_dict.get('url') # Ez lehet HttpUrl vagy str
                    
                    logger.debug(f"{source_log_prefix} Item #{news_dict_idx}: "
                                 f"Raw URL Obj/Str='{str(raw_url_obj_or_str)}' (Type: {type(raw_url_obj_or_str)}), "
                                 f"Title='{item_title_for_log}' for normalization/deduplication.")
                    
                    # --- JAVÍTOTT URL ELLENŐRZÉS ÉS NORMALIZÁLÁS ---
                    current_normalized_url: Optional[HttpUrl] = None
                    
                    if isinstance(raw_url_obj_or_str, HttpUrl):
                        current_normalized_url = raw_url_obj_or_str # Már HttpUrl, nem kell újra normalizálni
                        logger.debug(f"{source_log_prefix} Item #{news_dict_idx}: URL is already HttpUrl: '{str(current_normalized_url)}'")
                    elif isinstance(raw_url_obj_or_str, str) and raw_url_obj_or_str.strip():
                        try:
                            normalization_context = f"NewsDeduplication:{symbol}:{source_name}:Item{news_dict_idx}"
                            current_normalized_url = normalize_url(raw_url_obj_or_str, context=normalization_context)
                            if not current_normalized_url:
                                logger.warning(f"{source_log_prefix} Skipping item #{news_dict_idx} because normalize_url returned None for string URL. Original URL: '{raw_url_obj_or_str}', Title: '{item_title_for_log}'. See normalize_url logs for context '{normalization_context}'.")
                        except Exception as e_norm_url: # Ha maga a normalize_url dob kivételt
                            logger.error(f"{source_log_prefix} Error normalizing URL '{raw_url_obj_or_str}' for item #{news_dict_idx}: {e_norm_url}", exc_info=True)
                    else: # Ha None, üres string, vagy nem string/HttpUrl
                        logger.debug(f"{source_log_prefix} Skipping item #{news_dict_idx}: Missing, empty, or invalid type for URL. Raw URL data: '{raw_url_obj_or_str}', Title: '{item_title_for_log}'")

                    if not current_normalized_url: # Ha a normalizálás sikertelen volt, vagy eleve nem volt URL
                        skipped_dedup_count += 1
                        continue

                    if current_normalized_url not in seen_urls:
                        seen_urls.add(current_normalized_url)
                        all_standard_news_dicts.append(news_dict)
                        added_count += 1
                        if len(all_standard_news_dicts) >= min_unique_target:
                            logger.debug(f"{source_log_prefix} Reached target of {min_unique_target} for source, breaking inner loop. Total unique after this source: {len(all_standard_news_dicts)}.")
                            break 
                    else: 
                        logger.debug(f"{source_log_prefix} Item #{news_dict_idx}: URL '{str(current_normalized_url)}' already seen (duplication). Title: '{item_title_for_log}'")
                        skipped_dedup_count +=1 # Ezt is számolni kell a skippedhez
                

                logger.info(f"{source_log_prefix} Finished processing. Added {added_count} unique items. Skipped (dedup/invalid URL): {skipped_dedup_count}. Total unique: {len(all_standard_news_dicts)}.")
                if len(all_standard_news_dicts) >= min_unique_target:
                    break # Exit outer loop (sources)

            except NotImplementedError:
                logger.error(f"{source_log_prefix} Standard news mapping failed: 'map_raw_news_to_standard_dicts' not implemented.", exc_info=False)
                fetch_errors[source_name] = "Standard mapper not implemented"
                continue
            except Exception as e_map_std:
                logger.error(f"{source_log_prefix} Unexpected error during standard mapping or deduplication: {e_map_std}", exc_info=True)
                fetch_errors[source_name] = f"Standard map/dedup error: {e_map_std}"
                continue

        # --- Catch Fetcher-Specific Errors ---
        except TypeError as e_type:
            fetch_duration = time.monotonic() - fetch_start
            logger.error(f"{source_log_prefix} Fetch failed due to TypeError (likely wrong arguments) after {fetch_duration:.3f}s: {e_type}", exc_info=False)
            fetch_errors[source_name] = f"TypeError: {e_type}"
            # Log the arguments that were attempted if possible/safe
            # logger.debug(f"{source_log_prefix} Arguments attempted: {args_to_pass.keys()}") # Be careful logging sensitive args like API keys
            continue
        except NotImplementedError: # If the fetcher itself is missing/not implemented
            logger.error(f"{source_log_prefix} Fetch failed: Fetcher function '{fetcher_function.__name__}' not implemented correctly.", exc_info=False)
            fetch_errors[source_name] = "Fetcher not implemented"
            continue
        except httpx.RequestError as e_http:
            fetch_duration = time.monotonic() - fetch_start
            logger.error(f"{source_log_prefix} Fetch failed due to HTTP request error after {fetch_duration:.3f}s: {e_http}", exc_info=True)
            fetch_errors[source_name] = f"HTTP RequestError: {e_http}"
            continue
        except Exception as e_fetch_general: # Catch other potential exceptions during fetch
            fetch_duration = time.monotonic() - fetch_start
            logger.error(f"{source_log_prefix} Unexpected fetch error after {fetch_duration:.3f}s: {e_fetch_general}", exc_info=True)
            fetch_errors[source_name] = f"Unexpected fetch error: {e_fetch_general}"
            continue

    logger.info(f"{log_prefix} Finished fetching attempts from {processed_sources_count} sources.")
    if fetch_errors:
         logger.warning(f"{log_prefix} Errors encountered during fetch phase: {fetch_errors}")

    # --- 4. Sort Standardized News Items ---
    if not all_standard_news_dicts:
        logger.info(f"{log_prefix} No unique news items collected from any source.")
        return []

    logger.debug(f"{log_prefix} Sorting {len(all_standard_news_dicts)} unique standard news items by published_utc (desc)...")
    sort_start = time.monotonic()
    try:
        def sort_key(item: StandardNewsDict) -> datetime:
            dt_val = item.get('published_utc')
            fallback_dt = datetime.min.replace(tzinfo=timezone.utc) # Timezone aware fallback

            if isinstance(dt_val, datetime):
                # Ensure timezone awareness
                return dt_val if dt_val.tzinfo else dt_val.replace(tzinfo=timezone.utc)
            elif isinstance(dt_val, str):
                try:
                    # pd.to_datetime is robust for various formats
                    parsed_dt = pd.to_datetime(dt_val, errors='coerce', utc=True)
                    if pd.isna(parsed_dt): return fallback_dt
                    # Convert pandas Timestamp to standard datetime
                    return parsed_dt.to_pydatetime()
                except Exception as e_parse_str:
                     # Log the specific error and the problematic string
                     logger.debug(f"{log_prefix} Sort key parsing failed for string '{dt_val}': {e_parse_str}", exc_info=False)
                     return fallback_dt
            # Handle other potential types like int/float timestamps if necessary
            # elif isinstance(dt_val, (int, float)): ...
            return fallback_dt

        all_standard_news_dicts.sort(key=sort_key, reverse=True)
        sort_duration = time.monotonic() - sort_start
        logger.debug(f"{log_prefix} Sorting completed in {sort_duration:.4f}s.")
        # Optional: Log the date range of the sorted news
        if all_standard_news_dicts:
             first_date = all_standard_news_dicts[0].get('published_utc')
             last_date = all_standard_news_dicts[-1].get('published_utc')
             logger.debug(f"{log_prefix} News date range after sorting: {last_date} to {first_date}")

    except Exception as e_sort:
        sort_duration = time.monotonic() - sort_start
        logger.warning(f"{log_prefix} Could not sort news items after {sort_duration:.4f}s: {e_sort}. Proceeding with potentially unsorted items.", exc_info=False)

    # --- 5. Final Mapping to NewsItem Model ---
    logger.info(f"{log_prefix} Mapping {len(all_standard_news_dicts)} sorted standard news items to final NewsItem models...")
    map_final_start = time.monotonic()
    final_valid_news_items: List[NewsItem] = []
    final_mapping_errors = 0

    try:
        # Use the assumed imported mapper function
        mapped_items_intermediate: Optional[List[Any]] = mappers.map_standard_dicts_to_newsitems(
            all_standard_news_dicts, symbol
        )
        map_final_duration = time.monotonic() - map_final_start
        logger.debug(f"{log_prefix} Final mapping function ('map_standard_dicts_to_newsitems') returned in {map_final_duration:.4f}s.")

        if mapped_items_intermediate is None:
            logger.error(f"{log_prefix} Final mapping function returned None. Cannot proceed.")
        elif not isinstance(mapped_items_intermediate, list):
            logger.error(f"{log_prefix} Final mapping function returned non-list type: {type(mapped_items_intermediate)}. Cannot proceed.")
        else:
            # Post-validation: Ensure all items are indeed NewsItem instances
            # FIX: Use dynamic import for consistency with mapper validation
            try:
                from modules.financehub.backend.models.stock import NewsItem as DirectNewsItem
                NewsItemClass = DirectNewsItem
            except ImportError:
                # Fallback to string-based type checking
                NewsItemClass = None
                
            for item in mapped_items_intermediate:
                # Check both direct type and string-based type name for compatibility
                is_valid_newsitem = (
                    (NewsItemClass and isinstance(item, NewsItemClass)) or
                    (hasattr(item, '__class__') and 'NewsItem' in item.__class__.__name__)
                )
                
                if is_valid_newsitem:
                    final_valid_news_items.append(item)
                else:
                    logger.warning(f"{log_prefix} Item after final mapping is not a valid NewsItem instance (Type: {type(item)}). Skipping item.")
                    final_mapping_errors += 1
            logger.info(f"{log_prefix} Successfully validated {len(final_valid_news_items)} NewsItem models. Encountered {final_mapping_errors} invalid items after final map.")

    except NotImplementedError:
        logger.error(f"{log_prefix} Final news mapping failed: 'map_standard_dicts_to_newsitems' not implemented.", exc_info=False)
    except ValidationError as e_val_final:
        # This might occur if the mapper tries to create NewsItem with invalid data
        map_final_duration = time.monotonic() - map_final_start
        logger.error(f"{log_prefix} Pydantic validation failed during final NewsItem mapping after {map_final_duration:.4f}s: {e_val_final.errors()}", exc_info=False)
    except Exception as e_map_final:
        map_final_duration = time.monotonic() - map_final_start
        logger.error(f"{log_prefix} Unexpected error during final mapping to NewsItem after {map_final_duration:.4f}s: {e_map_final}", exc_info=True)

    # --- 6. Return Final Result ---
    total_duration = time.monotonic() - fetch_process_start
    logger.info(f"{log_prefix} Dynamic news processing finished in {total_duration:.3f}s. Returning {len(final_valid_news_items)} valid NewsItems.")
    return final_valid_news_items

async def _generate_ai_analysis(
    symbol: str, 
    ohlcv_df: Optional[pd.DataFrame], # Ez a `df_with_indicators` lehet a hívó oldalon
    latest_indicators: Dict[str, Any],
    news_items: Optional[List[NewsItem]], 
    company_overview: Optional[CompanyOverview],
    financials_data: Optional[FinancialsData], # Új paraméter
    earnings_data: Optional[EarningsData],   # Új paraméter
    http_client: httpx.AsyncClient, 
    request_id: str
) -> Optional[str]:
    func_name = f"_generate_ai_analysis ({symbol})" # Maradhat, vagy verziózhatod (pl. v2)
    log_prefix = f"[{request_id}][{func_name}]"
    logger.info(f"{log_prefix} Starting AI analysis generation...")

    if not AI_ENABLED: # Ez a globális AI_ENABLED konstans, amit a settingsből töltesz
        logger.info(f"{log_prefix} Skipping AI: AI features disabled (AI_ENABLED=False).")
        return None

    # --- OHLCV DataFrame előkészítése a prompt generátorhoz ---
    ohlcv_df_for_prompt: Optional[pd.DataFrame] = None
    if ohlcv_df is not None and not ohlcv_df.empty:
        logger.debug(f"{log_prefix} Preparing recent OHLCV slice for AI prompt...")
        try:
            if not pd.api.types.is_datetime64_any_dtype(ohlcv_df.index):
                 logger.error(f"{log_prefix} OHLCV index not datetime ({ohlcv_df.index.dtype}). Cannot slice by date.")
            else:
                 # AI_PROMPT_HISTORY_DAYS a settings-ből jön és globális konstansként definiáltad
                 cutoff_date = datetime.now(timezone.utc) - timedelta(days=AI_PROMPT_HISTORY_DAYS)
                 ohlcv_df_for_prompt = ohlcv_df[ohlcv_df.index >= cutoff_date]
            
            if ohlcv_df_for_prompt is not None and not ohlcv_df_for_prompt.empty:
                logger.debug(f"{log_prefix} Sliced OHLCV for AI ({AI_PROMPT_HISTORY_DAYS} days). Shape: {ohlcv_df_for_prompt.shape}. Range: {ohlcv_df_for_prompt.index.min()} to {ohlcv_df_for_prompt.index.max()}")
            else: # Vagy a slice-olás nem adott eredményt, vagy eleve hiba volt
                logger.warning(f"{log_prefix} OHLCV slice for AI empty or failed. Original DF shape: {ohlcv_df.shape if ohlcv_df is not None else 'None'}.")
                ohlcv_df_for_prompt = None # Biztosítjuk, hogy None legyen
        except Exception as e_slice:
            logger.error(f"{log_prefix} Failed slicing OHLCV for AI prompt: {e_slice}", exc_info=True)
            ohlcv_df_for_prompt = None
    else:
        logger.warning(f"{log_prefix} No valid OHLCV DF (ohlcv_df) provided for AI prompt.")

    # --- Adatok meglétének ellenőrzése a prompt generáláshoz ---
    # (Ez a logikád már jó és részletes)
    has_ohlcv_hist = ohlcv_df_for_prompt is not None and not ohlcv_df_for_prompt.empty
    has_indicators = bool(latest_indicators); has_news = bool(news_items); has_overview = company_overview is not None
    has_financials = financials_data is not None; has_earnings = earnings_data is not None 
    can_generate_prompt = has_ohlcv_hist or has_indicators or has_news or has_overview or has_financials or has_earnings
    if not can_generate_prompt:
        logger.warning(f"{log_prefix} Skipping AI: Insufficient data for meaningful prompt.")
        return "[AI Analysis Skipped: Insufficient input data]"
    logger.debug(f"{log_prefix} Data for prompt: OHLCV={has_ohlcv_hist}, Indic={has_indicators}, News={has_news}, Overview={has_overview}, Fin={has_financials}, Earn/Rate={has_earnings}")


    # === Prompt Generálás Hívása (Javított Névvel) ===
    generated_prompt_str: Optional[str] = None # Átnevezve a jobb olvashatóságért
    prompt_gen_start = time.monotonic()
    logger.info(f"{log_prefix} Generating AI analysis prompt...")
    try:
        generated_prompt_str = await prompt_generators.generate_ai_prompt_premium( # <<< JAVÍTÁS ITT (nincs alulvonás)
             symbol=symbol, 
             df_recent=ohlcv_df_for_prompt, # Ez a levágott DataFrame
             latest_indicators=latest_indicators,
             news_items=news_items, 
             company_overview=company_overview,
             # --- ÚJ PARAMÉTEREK ÁTADÁSA A PROMPT GENERÁTORNAK ---
             # Győződj meg róla, hogy a generate_ai_prompt_premium függvény
             # a prompt_generators.py-ban elfogadja ezeket és használja őket!
             financials_data=financials_data,
             earnings_data=earnings_data
        )
        prompt_gen_duration = time.monotonic() - prompt_gen_start
        if not generated_prompt_str or not isinstance(generated_prompt_str, str) or not generated_prompt_str.strip():
            logger.error(f"{log_prefix} AI prompt generation failed/returned empty after {prompt_gen_duration:.3f}s.")
            return "[AI Analysis Error: Failed to generate valid prompt]"
        else:
             logger.info(f"{log_prefix} AI prompt generated in {prompt_gen_duration:.3f}s. Length: {len(generated_prompt_str)} chars.")
             # A teljes prompt logolása DEBUG szinten nagyon hosszú lehet, óvatosan vele élesben.
             # logger.debug(f"{log_prefix} Generated Prompt: {generated_prompt_str}") 
    except AttributeError as e_attr: # Specifikusan az AttributeError elkapása
        logger.error(f"{log_prefix} AI prompt gen failed: AttributeError - likely function name mismatch in 'prompt_generators'. Error: {e_attr}", exc_info=True)
        return "[AI Analysis Error: Prompt generator function misconfigured]"
    except NotImplementedError: # Ha a prompt_generators-ban ez a hiba jön
        logger.error(f"{log_prefix} AI prompt gen failed: 'generate_ai_prompt_premium' not implemented in 'prompt_generators'.", exc_info=False)
        return "[AI Analysis Error: Prompt generator missing]"
    except Exception as e_prompt: # Minden más váratlan hiba a prompt generálásnál
        logger.error(f"{log_prefix} Unexpected error during AI prompt generation: {e_prompt}", exc_info=True)
        return "[AI Analysis Error: Prompt generation unexpected issue]"

    # === AI Service Hívása (az ai_service.py-ben lévő orchestratorral) ===
    ai_summary_result: Optional[str] = None # Átnevezve, hogy jelezze, ez már a feldolgozott eredmény
    ai_service_call_start = time.monotonic()
    logger.info(f"{log_prefix} Calling AI service orchestrator (ai_service.generate_ai_summary)...")
    try:
        # Itt a generate_ai_summary-t hívjuk, ami már tartalmazza a fallback és retry logikát,
        # és a promptot stringként várja (vagy messages listaként, ahogy az ai_service.py-ban van).
        # A TE ai_service.py v3.0.0-s verziód a `generate_ai_summary` függvényben
        # maga hívja a `generate_ai_prompt_premium`-ot.
        # EZÉRT: Itt NEM a prompt stringet kell átadni, hanem azokat az adatokat,
        # amikből az ai_service.py-ban lévő generate_ai_summary újra tudja generálni a promptot,
        # VAGY az ai_service.py-ban a generate_ai_summary-t úgy kell módosítani,
        # hogy fogadjon egy előre generált prompt stringet is.

        # JELENLEGI LEGJOBB MEGOLDÁS:
        # A stock_data_service felelős az adatok összegyűjtéséért.
        # Az ai_service.generate_ai_summary felelős a prompt generálásáért (a prompt_generators segítségével)
        # ÉS az API hívásért (az api_callers segítségével), beleértve a fallback/retry-t.
        # Tehát a stock_data_service-nek csak az adatokat kell átadnia az ai_service-nek.

        ai_summary_result = await generate_ai_summary( # Ez a v3.0.0-s függvény az ai_service.py-ból
            symbol=symbol, 
            df_with_indicators=ohlcv_df, # Az eredeti, teljes (nem csak a prompt szelet) DF indikátorokkal
            latest_indicators=latest_indicators,
            news_items=news_items, 
            company_overview=company_overview,
            financials_data=financials_data, 
            earnings_data=earnings_data, # Átadva az earnings_data
            client=http_client # Nagyon fontos az httpx kliens átadása!
        )
        # A `generate_ai_summary` visszatérési értéke már a kész summary vagy egy hibaüzenet.

        ai_service_call_duration = time.monotonic() - ai_service_call_start
        
        # Az ai_service.py-ben lévő generate_ai_summary már felhasználóbarát hibaüzenetet ad,
        # vagy a sikeres választ.
        if ai_summary_result and isinstance(ai_summary_result, str) and ai_summary_result.strip():
            # Ellenőrizzük, hogy a visszakapott string nem a mi standard hibaüzenetünk-e
            # (az ai_service.py-ben definiált ERROR_MSG_ konstansok)
            is_error_message = any(error_const_val in ai_summary_result for error_const_val in [
                ERROR_MSG_CONFIG, ERROR_MSG_DISABLED, ERROR_MSG_PROVIDER_UNSUPPORTED, # Ezeket már itt is ellenőrizted, de dupla csekk
                ERROR_MSG_NO_MODELS_CONFIGURED, ERROR_MSG_PROMPT_GENERATION_FAILED,
                ERROR_MSG_PROMPT_EMPTY, ERROR_MSG_PROMPT_UNEXPECTED, ERROR_MSG_PAYLOAD_ERROR,
                ERROR_MSG_API_CALL_UNEXPECTED, ERROR_MSG_API_RESPONSE_ERROR,
                ERROR_MSG_ALL_MODELS_FAILED, ERROR_MSG_PARSING_STRUCTURE,
                ERROR_MSG_PARSING_CONTENT_FILTER, ERROR_MSG_PARSING_TOO_LONG,
                ERROR_MSG_PARSING_EMPTY, ERROR_MSG_PARSING_UNEXPECTED
            ] if isinstance(error_const_val, str)) # Biztosítjuk, hogy stringekkel hasonlítunk

            if is_error_message:
                  logger.warning(f"{log_prefix} AI service returned a known error message: '{ai_summary_result}'. Time: {ai_service_call_duration:.3f}s.")
                  # Itt a hibaüzenetet adjuk vissza, amit az endpoint majd kezelhet
                  return ai_summary_result 
            else: # Sikeresnek tűnő válasz
                 logger.info(f"{log_prefix} AI service call successful, summary received in {ai_service_call_duration:.3f}s. Length: {len(ai_summary_result)} chars.")
                 # logger.debug(f"{log_prefix} AI Summary (truncated): {ai_summary_result[:200]}...") # Ezt már az ai_service is logolhatja
                 return ai_summary_result.strip() # A .strip() már az ai_service-ben is megtörténhetett
        else: # None, üres string, vagy nem string jött vissza az ai_service-től (nem lenne szabad)
             logger.error(f"{log_prefix} AI service call returned None/empty/invalid type ({type(ai_summary_result)}) after {ai_service_call_duration:.3f}s. This indicates an issue within ai_service logic.")
             return "[AI Analysis Error: Unexpected empty response from AI Service component]"
             
    # Az ai_service.py-ben lévő generate_ai_summary már kezeli a legtöbb kivételt
    # (HttpException, TimeoutError, RetryError, stb.) és vagy None-t, vagy hibaüzenetet ad vissza.
    # Itt csak a legváratlanabb, ai_service-en kívüli hibákat kellene elkapni.
    except NotImplementedError: # Ha maga az ai_service.generate_ai_summary hiányzik
        logger.error(f"{log_prefix} AI service call failed: 'generate_ai_summary' not implemented in ai_service.", exc_info=False)
        return "[AI Analysis Error: AI service orchestrator component missing]"
    except Exception as e_ai_orch: # Bármilyen más váratlan hiba a generate_ai_summary HÍVÁSAKOR
        logger.critical(f"{log_prefix} CRITICAL UNEXPECTED error calling AI service orchestrator: {e_ai_orch}", exc_info=True)
        return f"[AI Analysis Error: Critical unexpected issue calling AI orchestrator ({type(e_ai_orch).__name__})]"


async def process_premium_stock_data(
    symbol: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    force_refresh: bool = False,
) -> FinBotStockResponse:
    orchestration_start_time = time.monotonic()
    if not symbol or not isinstance(symbol, str) or not symbol.strip():
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "Symbol cannot be empty."})
    symbol_upper = symbol.strip().upper()

    request_id = f"{symbol_upper}-{uuid.uuid4().hex[:8]}"
    log_prefix = f"[{request_id}:{symbol_upper}]"
    lock_acquired = False
    e_orchestration_unexpected: Optional[Exception] = None
    logger.info(f"{log_prefix} === Orchestration START (Version: {version}) | ForceRefresh={force_refresh} ===")

    try:
        # _get_eodhd_symbol egy feltételezett segédfüggvény
        eodhd_symbol_for_keys = _get_eodhd_symbol(symbol_upper, log_prefix) # type: ignore
        yfinance_symbol = symbol_upper
        fmp_symbol = symbol_upper
        eodhd_key_present = bool(settings.API_KEYS and settings.API_KEYS.EODHD and settings.API_KEYS.EODHD.get_secret_value())
        
        logger.debug(f"{log_prefix} Determining OHLCV source... EODHD Key Present: {eodhd_key_present}")
        
        use_eodhd_for_ohlcv = settings.EODHD_FEATURES.USE_FOR_OHLCV_DAILY
        primary_source_config = settings.DATA_SOURCE.PRIMARY.lower()

        if use_eodhd_for_ohlcv and eodhd_key_present:
            ohlcv_source = "eodhd"
            logger.info(f"{log_prefix} Configured to use EODHD for OHLCV and key is present. OHLCV source: 'eodhd'.")
        elif use_eodhd_for_ohlcv and not eodhd_key_present:
            logger.warning(f"{log_prefix} Configured to use EODHD for OHLCV, but key MISSING!")
            if primary_source_config != "eodhd":
                 ohlcv_source = primary_source_config
                 logger.info(f"{log_prefix} Falling back to primary source from config: '{ohlcv_source}'.")
            else:
                 ohlcv_source = "yfinance" 
                 logger.info(f"{log_prefix} Primary source was also EODHD. Falling back to hardcoded '{ohlcv_source}'.")
        else: 
            ohlcv_source = primary_source_config
            logger.info(f"{log_prefix} EODHD for OHLCV is disabled via config. Using primary source: '{ohlcv_source}'.")
            if ohlcv_source == "eodhd" and not eodhd_key_present:
                logger.warning(f"{log_prefix} Primary source is EODHD, but key MISSING!")
                ohlcv_source = "yfinance" 
                logger.info(f"{log_prefix} Primary source EODHD failed due to missing key. Falling back to hardcoded '{ohlcv_source}'.")
            elif ohlcv_source == "eodhd":
                 logger.info(f"{log_prefix} Primary source is EODHD (and key is present). OHLCV source: 'eodhd'.")
                 
        if ohlcv_source == "eodhd" and not eodhd_key_present:
             logger.error(f"{log_prefix} LOGIC ERROR: OHLCV source set to 'eodhd' but key is missing. Forcing fallback to 'yfinance'.")
             ohlcv_source = "yfinance"

        logger.info(f"{log_prefix} FINAL Determined OHLCV source for this run: '{ohlcv_source}'")
        logger.debug(f"{log_prefix} Symbols | Input='{symbol}', Base='{symbol_upper}', EODHDKey='{eodhd_symbol_for_keys}', YF='{yfinance_symbol}', FMP='{fmp_symbol}', OHLCV Src='{ohlcv_source}'")

    except Exception as e_norm:
        logger.critical(f"{log_prefix} CRITICAL: Symbol normalization failed: {e_norm}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "Internal error during symbol processing.", "request_id": request_id}) from e_norm

    aggregate_cache_key = f"stock_premium_v{APP_VERSION}:{eodhd_symbol_for_keys}"
    lock_name = f"lock:orchestration:{eodhd_symbol_for_keys}"
    logger.debug(f"{log_prefix} Resources | CacheKey='{aggregate_cache_key}', LockName='{lock_name}'")

    # <<< VÁLTOZÓK INICIALIZÁLÁSA FRISSÍTETT NEVEKKEL >>>
    chart_ready_ohlcv_list: Optional[List[Dict[str, Any]]] = None
    ohlcv_df_for_indicators: Optional[pd.DataFrame] = None
    final_company_overview: Optional[CompanyOverview] = None
    final_financials: Optional[FinancialsData] = None
    final_earnings_data: Optional[EarningsData] = None # Korábban final_earnings_with_ratings része volt
    final_ratings_list: Optional[List[RatingPoint]] = None # Külön kezelve a ratingek
    final_news: List[NewsItem] = []
    indicator_history_model: Optional[IndicatorHistory] = None
    latest_indicators_dict: Dict[str, Optional[float]] = {}
    final_ai_summary: Optional[str] = None
    history_ohlcv_list: List[CompanyPriceHistoryEntry] = []
    latest_ohlcv_point: Optional[LatestOHLCV] = None
    last_refreshed_date_str: Optional[str] = None
    change_percent: Optional[float] = None
    eodhd_splits_data: Optional[List[StockSplitData]] = None
    eodhd_dividends_data: Optional[List[DividendData]] = None
    
    try:
        logger.debug(f"{log_prefix} Acquiring lock: '{lock_name}' (TTL: {LOCK_TTL_SECONDS}s, Timeout: {LOCK_BLOCKING_TIMEOUT_SECONDS}s)")
        lock_acquire_start = time.monotonic()
        lock: AsyncLock = cache.get_lock(lock_name, timeout=LOCK_TTL_SECONDS, blocking_timeout=LOCK_BLOCKING_TIMEOUT_SECONDS)

        async with lock:
            lock_acquired = True
            logger.info(f"{log_prefix} Lock acquired ('{lock_name}') in {time.monotonic() - lock_acquire_start:.4f}s.")

            if not force_refresh:
                cached_response = await _check_aggregate_cache(aggregate_cache_key, request_id, cache) # type: ignore
                if cached_response:
                    cached_response.is_data_stale = False # Ensure stale flag is correctly set for fresh cache hits
                    logger.info(f"{log_prefix} === Orchestration END (Cache Hit AFTER lock). Total: {time.monotonic() - orchestration_start_time:.4f}s ===")
                    return cached_response
                else:
                    logger.info(f"{log_prefix} Aggregate cache miss/invalid after lock. Fresh fetch.")
            else:
                logger.info(f"{log_prefix} Force refresh. Skipping cache check after lock.")

            fetch_phase_start_time = time.monotonic()
            logger.info(f"{log_prefix} $$$ Checkpoint 1: Core Data Fetching (OHLCV, YF Company Info, EODHD Events) $$$")
            core_fetch_tasks = {}

            if ohlcv_source == "eodhd" and eodhd_key_present:
                logger.debug(f"{log_prefix} Adding EODHD OHLCV & Events combined fetch task for '{eodhd_symbol_for_keys}'.")
                core_fetch_tasks["eodhd_combined_data"] = fetchers.fetch_eodhd_ohlcv_and_events(
                    symbol_with_exchange=eodhd_symbol_for_keys,
                    client=client,
                    cache=cache,
                    years=OHLCV_YEARS
                )
            elif ohlcv_source == "yfinance" or (ohlcv_source == "eodhd" and not eodhd_key_present):
                if ohlcv_source == "eodhd":
                    logger.warning(f"{log_prefix} EODHD was the source, but key is missing. Falling back to YFinance for OHLCV.")
                logger.debug(f"{log_prefix} Adding YFinance OHLCV fetch task for '{yfinance_symbol}' (years={OHLCV_YEARS}).")
                core_fetch_tasks["ohlcv_raw_df_yf"] = fetchers.fetch_yfinance_ohlcv(yfinance_symbol, years=OHLCV_YEARS, cache=cache)

            logger.debug(f"{log_prefix} Adding YFinance Company Info fetch task for '{yfinance_symbol}'.")
            core_fetch_tasks["yfinance_company_info_dict"] = fetchers.fetch_yfinance_company_info(yfinance_symbol, cache=cache)

            logger.debug(f"{log_prefix} Dispatching {len(core_fetch_tasks)} core fetch tasks...")
            fetch_results_list = await asyncio.gather(*core_fetch_tasks.values(), return_exceptions=True)
            core_fetch_duration = time.monotonic() - fetch_phase_start_time

            logger.info(f"{log_prefix} asyncio.gather (core fetch tasks) completed. Results types and errors:")
            task_keys_in_order = list(core_fetch_tasks.keys())
            for i, res in enumerate(fetch_results_list):
                task_key_name = task_keys_in_order[i] if i < len(task_keys_in_order) else f"UnknownTaskAtIndex_{i}"
                logger.info(f"  - Result for '{task_key_name}': Type={type(res).__name__}")
                if isinstance(res, Exception):
                     logger.error(f"{log_prefix} Task '{task_key_name}' returned an EXCEPTION:", exc_info=res)

            logger.info(f"{log_prefix} Core fetch phase completed in {core_fetch_duration:.4f}s.")

            fetch_results: Dict[str, Any] = {}
            fetch_errors: Dict[str, Exception] = {}
            for key, result in zip(core_fetch_tasks.keys(), fetch_results_list):
                if isinstance(result, Exception):
                    logger.warning(f"{log_prefix} Fetch task '{key}' stored as failed due to exception. Type: {type(result).__name__}")
                    fetch_errors[key] = result
                    fetch_results[key] = None
                else:
                    fetch_results[key] = result
            
            # --- OHLCV, Splits, Dividends adatok kinyerése ---
            ohlcv_raw_df_from_fetch: Optional[pd.DataFrame] = None
            eodhd_splits_df: Optional[pd.DataFrame] = None
            eodhd_dividends_df: Optional[pd.DataFrame] = None

            if "eodhd_combined_data" in fetch_results and fetch_results["eodhd_combined_data"] is not None:
                ohlcv_df, splits_df, divs_df = fetch_results["eodhd_combined_data"]
                ohlcv_raw_df_from_fetch = ohlcv_df
                eodhd_splits_df = splits_df
                eodhd_dividends_df = divs_df
                logger.info(f"{log_prefix} Unpacked EODHD combined data. OHLCV Shape: {ohlcv_df.shape if ohlcv_df is not None else 'None'}")
            elif "ohlcv_raw_df_yf" in fetch_results:
                ohlcv_raw_df_from_fetch = fetch_results["ohlcv_raw_df_yf"]
                logger.info(f"{log_prefix} Using YFinance OHLCV data. Shape: {ohlcv_raw_df_from_fetch.shape if ohlcv_raw_df_from_fetch is not None else 'None'}")

            processing_start_time = time.monotonic()
            logger.info(f"{log_prefix} $$$ Checkpoint 2: Processing Core Data (OHLCV, Company Info, Splits/Divs) $$$")
            
            # OHLCV feldolgozása
            map_ohlcv_start = time.monotonic()
            ohlcv_raw_df_to_map = ohlcv_raw_df_from_fetch
            current_ohlcv_mapper_source = ""
            
            if ohlcv_source == "eodhd" and "eodhd_combined_data" in fetch_results:
                 current_ohlcv_mapper_source = "eodhd"
            elif ohlcv_source == "yfinance" or "ohlcv_raw_df_yf" in fetch_results:
                 current_ohlcv_mapper_source = "yfinance"

            if ohlcv_raw_df_to_map is None and current_ohlcv_mapper_source == "eodhd":
                logger.error(f"{log_prefix} EODHD OHLCV fetch failed or returned None from combined fetch. Attempting YFinance fallback for OHLCV...")
                try:
                    ohlcv_raw_df_to_map = await fetchers.fetch_yfinance_ohlcv(yfinance_symbol, years=OHLCV_YEARS, cache=cache)
                    current_ohlcv_mapper_source = "yfinance_fallback"
                    if ohlcv_raw_df_to_map is None:
                        logger.error(f"{log_prefix} YFinance OHLCV fallback also returned None.")
                    else:
                        logger.info(f"{log_prefix} YFinance OHLCV fallback successful. Shape: {ohlcv_raw_df_to_map.shape}")
                except Exception as e_yf_fallback:
                    logger.error(f"{log_prefix} YFinance OHLCV fallback fetch encountered an exception: {e_yf_fallback}", exc_info=True)
                    ohlcv_raw_df_to_map = None
            
            if ohlcv_raw_df_to_map is None:
                err_key_to_check = f"ohlcv_raw_df_{ohlcv_source}" # Alapértelmezett hibakulcs
                if current_ohlcv_mapper_source == "yfinance_fallback": err_key_to_check = "ohlcv_raw_df_yf_fallback_explicit_error" # Külön hibakezelés, ha a fallback is hibát dob
                
                error_detail_msg = "Unknown error"
                if err_key_to_check in fetch_errors:
                    error_detail_msg = str(fetch_errors[err_key_to_check])
                    logger.error(f"{log_prefix} CRITICAL: OHLCV fetch failed from source '{current_ohlcv_mapper_source}' and any fallbacks. Error: {error_detail_msg}")
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"error": f"Failed to fetch price data from '{current_ohlcv_mapper_source}'. Details: {error_detail_msg}", "request_id": request_id}) from fetch_errors[err_key_to_check]
                else:
                    logger.error(f"{log_prefix} CRITICAL: OHLCV raw DataFrame is None from source '{current_ohlcv_mapper_source}' without a recorded fetch error.")
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"error": f"Price data source '{current_ohlcv_mapper_source}' returned no data.", "request_id": request_id})

            if not isinstance(ohlcv_raw_df_to_map, pd.DataFrame):
                logger.error(f"{log_prefix} CRITICAL: OHLCV data from '{current_ohlcv_mapper_source}' is not a DataFrame (type: {type(ohlcv_raw_df_to_map)}). Cannot map.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": f"Internal error: Unexpected data type for OHLCV from {current_ohlcv_mapper_source}.", "request_id": request_id})

            logger.info(f"{log_prefix} Mapping OHLCV DataFrame from '{current_ohlcv_mapper_source}' using 'mappers' module...")
            if current_ohlcv_mapper_source.startswith("eodhd"):
                chart_ready_ohlcv_list = mappers.map_eodhd_data_to_chart_ready_format(
                    ohlcv_df=ohlcv_raw_df_to_map,
                    splits_df=eodhd_splits_df,
                    dividends_df=eodhd_dividends_df,
                    request_id=request_id,
                    interval="d"
                )
            else: # yfinance or yfinance_fallback
                chart_ready_ohlcv_list = mappers.map_yfinance_ohlcv_df_to_chart_list(ohlcv_raw_df_to_map, request_id)
            
            map_ohlcv_duration = time.monotonic() - map_ohlcv_start
            logger.debug(f"{log_prefix} OHLCV mapping from '{current_ohlcv_mapper_source}' took {map_ohlcv_duration:.4f}s.")

            if chart_ready_ohlcv_list is None:
                logger.critical(f"{log_prefix} OHLCV mapping (source: {current_ohlcv_mapper_source}) via 'mappers' returned None. Critical internal error.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "Internal server error processing price data via mappers.", "request_id": request_id})
            elif not chart_ready_ohlcv_list: # Üres lista
                logger.warning(f"{log_prefix} OHLCV mapping (source: {current_ohlcv_mapper_source}) resulted in EMPTY list. Indicators/AI might be skipped.")
            else:
                logger.info(f"{log_prefix} OHLCV data from '{current_ohlcv_mapper_source}' mapped to chart-ready list. Length: {len(chart_ready_ohlcv_list)}.")

            # Company Info feldolgozása (YFinance)
            yf_company_info_raw = fetch_results.get("yfinance_company_info_dict")
            if "yfinance_company_info_dict" in fetch_errors:
                 logger.warning(f"{log_prefix} YF Company info fetch failed. Overview (YF part) unavailable. Error: {fetch_errors['yfinance_company_info_dict']}")
                 final_company_overview = None
            elif yf_company_info_raw is None:
                 logger.warning(f"{log_prefix} YF Company info fetch returned None. Overview (YF part) unavailable.")
                 final_company_overview = None
            else:
                 final_company_overview = await _process_and_map_company_info(yf_company_info_raw, request_id, symbol_upper) # type: ignore
                 if final_company_overview: logger.info(f"{log_prefix} YF Company overview processed and mapped.")
                 else: logger.warning(f"{log_prefix} YF Company overview could not be processed/mapped from fetched data.")

            # EODHD Splits & Dividends modellekbe mappelése (de még nem merge-elve az overview-ba)
            eodhd_splits_dividends_raw = fetch_results.get("eodhd_splits_dividends_raw")
            if eodhd_key_present and "eodhd_splits_dividends_raw" not in fetch_errors and eodhd_splits_dividends_raw:
                logger.info(f"{log_prefix} Processing EODHD Splits & Dividends data...")
                map_sd_start = time.monotonic()
                try:
                    raw_splits_df = eodhd_splits_dividends_raw.get('splits')
                    raw_dividends_df = eodhd_splits_dividends_raw.get('dividends')

                    if raw_splits_df is not None and not raw_splits_df.empty:
                        eodhd_splits_data = mappers.map_eodhd_splits_data_to_models(raw_splits_df, request_id)
                        logger.info(f"{log_prefix} EODHD splits mapped to {len(eodhd_splits_data) if eodhd_splits_data else 0} models.")
                    else: logger.info(f"{log_prefix} No EODHD splits data to map.")
                    
                    if raw_dividends_df is not None and not raw_dividends_df.empty:
                        eodhd_dividends_data = mappers.map_eodhd_dividends_data_to_models(raw_dividends_df, request_id)
                        logger.info(f"{log_prefix} EODHD dividends mapped to {len(eodhd_dividends_data) if eodhd_dividends_data else 0} models.")
                    else: logger.info(f"{log_prefix} No EODHD dividends data to map.")
                    logger.debug(f"{log_prefix} EODHD splits/dividends mapping took {time.monotonic() - map_sd_start:.4f}s")
                except NotImplementedError as e_ni_sd: # Kevesebb log zaj, ha a mapper nincs implementálva
                    logger.error(f"{log_prefix} EODHD splits/dividends mapping failed: Required mapper not found in 'mappers'.", exc_info=False)
                except ValidationError as e_val_sd:
                    logger.error(f"{log_prefix} Pydantic validation failed during EODHD splits/dividends mapping: {e_val_sd.errors()}", exc_info=False) # exc_info=False, az errors() elég
                except Exception as e_map_sd:
                    logger.error(f"{log_prefix} Unexpected error mapping EODHD splits/dividends: {e_map_sd}", exc_info=True)
            elif eodhd_key_present and "eodhd_splits_dividends_raw" in fetch_errors:
                 logger.warning(f"{log_prefix} EODHD Splits/Dividends fetch failed. Data unavailable. Error: {fetch_errors['eodhd_splits_dividends_raw']}")
            elif eodhd_key_present and not eodhd_splits_dividends_raw :
                 logger.info(f"{log_prefix} No data returned from EODHD Splits/Dividends fetcher (result was None or empty).")

            # EODHD Full Company Info (ha konfigurálva) - STUB
            if USE_EODHD_FOR_COMPANY_INFO and eodhd_key_present and False: # A 'False' itt szándékos, mert ez egy STUB
                logger.info(f"{log_prefix} STUB: Attempting EODHD full company info fetch for {eodhd_symbol_for_keys} (USE_EODHD_FOR_COMPANY_INFO=True)...")
                logger.warning(f"{log_prefix} EODHD full company info fetch/map is a STUB and not yet active.")

            core_processing_duration = time.monotonic() - processing_start_time
            logger.debug(f"{log_prefix} Core data processing (OHLCV map, YF Info map, EODHD S/D map to models) took {core_processing_duration:.4f}s.")

            # <<< ÚJ LOGIKA: COMPANY CURRENCY KINYERÉSE A FINANCIAL ADATOK LEKÉRÉSE ELŐTT >>>
            company_currency_from_overview: Optional[str] = None
            if final_company_overview and isinstance(final_company_overview, CompanyOverview):
                if final_company_overview.currency: # Feltételezzük, hogy a CompanyOverview modellnek van 'currency' mezője
                    company_currency_from_overview = final_company_overview.currency
                    logger.info(f"{log_prefix} Currency determined from CompanyOverview: '{company_currency_from_overview}' for financial data processing.")
                else:
                    logger.warning(f"{log_prefix} CompanyOverview exists but its 'currency' field is None or empty. Financial data processing might use defaults or skip currency-specific logic.")
            else:
                logger.warning(f"{log_prefix} final_company_overview is None or not a CompanyOverview instance. Cannot determine currency from it. Financial data processing might use defaults or skip currency-specific logic.")
            # <<< ÚJ LOGIKA VÉGE >>>

            # Kombinált Financials / Earnings / Ratings feldolgozása
            fin_earn_rate_start = time.monotonic()
            logger.info(f"{log_prefix} Initiating combined financial/earnings/ratings processing...")
            try:
                # A _fetch_process_and_map_financial_combined_data feltételezhetően 3 értéket ad vissza
                final_financials, final_earnings_data, final_ratings_list = await _fetch_process_and_map_financial_combined_data( # type: ignore
                    yfinance_symbol=yfinance_symbol,
                    fmp_symbol=fmp_symbol,
                    eodhd_symbol=eodhd_symbol_for_keys,
                    client=client,
                    cache=cache,
                    request_id=request_id,
                    log_prefix=log_prefix,
                    eodhd_key_is_present=eodhd_key_present,
                    company_currency=company_currency_from_overview # <<< ÁTADVA A KINYERT CURRENCY
                )
                fin_earn_rate_duration = time.monotonic() - fin_earn_rate_start
                logger.info(f"{log_prefix} Combined financial/earnings/ratings processing finished in {fin_earn_rate_duration:.4f}s.")
                logger.info(f"{log_prefix}   - Financials Mapped: {final_financials is not None}")
                logger.info(f"{log_prefix}   - Earnings Reports Mapped: {final_earnings_data is not None}")
                if final_earnings_data:
                     reports_present = bool(getattr(final_earnings_data, 'annual_reports', []) or getattr(final_earnings_data, 'quarterly_reports', []))
                     logger.info(f"{log_prefix}     - Earnings Data Contains Reports: {reports_present}")
                logger.info(f"{log_prefix}   - Ratings List Mapped: {len(final_ratings_list) if final_ratings_list else 0} items")

            except Exception as e_comb_fin:
                 fin_earn_rate_duration = time.monotonic() - fin_earn_rate_start
                 logger.error(f"{log_prefix} Unexpected error during combined financial/earnings/ratings processing after {fin_earn_rate_duration:.4f}s: {e_comb_fin}", exc_info=True)
                 final_financials, final_earnings_data, final_ratings_list = None, None, None # Hiba esetén nullázzuk

            # Hírek feldolgozása
            news_start_time = time.monotonic()
            logger.info(f"{log_prefix} Initiating dynamic news fetching (EODHD integrated)...")
            final_news = await _fetch_and_process_news_dynamically( # type: ignore
                symbol_upper, client, request_id, cache, eodhd_available=eodhd_key_present
            )
            news_duration = time.monotonic() - news_start_time
            logger.info(f"{log_prefix} Dynamic news processing complete in {news_duration:.3f}s. Found {len(final_news)} NewsItems.")

            # Indikátorokhoz és AI-hoz szükséges DataFrame előkészítése
            indicator_df_prep_start = time.monotonic()
            logger.info(f"{log_prefix} Preparing OHLCV DataFrame for indicators/AI from chart-ready list...")
            ohlcv_df_for_indicators = None # Alapértelmezett
            if chart_ready_ohlcv_list and len(chart_ready_ohlcv_list) > 0: # Csak ha van adat
                ohlcv_df_for_indicators = await _validate_ohlcv_dataframe(chart_ready_ohlcv_list, log_prefix) # type: ignore
                if ohlcv_df_for_indicators is not None and not ohlcv_df_for_indicators.empty:
                     logger.info(f"{log_prefix} Validated OHLCV DataFrame for indicators/AI. Shape: {ohlcv_df_for_indicators.shape}")
                elif ohlcv_df_for_indicators is not None: # Üres DataFrame
                     logger.warning(f"{log_prefix} Validated OHLCV DataFrame is empty. Skipping indicators/AI.")
                     ohlcv_df_for_indicators = None # Biztosítjuk, hogy None legyen
                else: # Hiba történt a validálás/konverzió során
                     logger.error(f"{log_prefix} Failed to create validated OHLCV DataFrame. Skipping indicators/AI.")
            else:
                 logger.warning(f"{log_prefix} Skipping Indicator/AI DataFrame prep: No chart-ready OHLCV list or list is empty.")
            logger.debug(f"{log_prefix} Indicator DataFrame prep took {time.monotonic() - indicator_df_prep_start:.4f}s.")

            # Indikátorok számítása és AI analízis (feltételes)
            logger.info(f"{log_prefix} $$$ Checkpoint 3: Calculating Indicators & Generating AI (Conditional) $$$")
            indicators_ai_start_time = time.monotonic()
            if ohlcv_df_for_indicators is not None and not ohlcv_df_for_indicators.empty:
                logger.info(f"{log_prefix} Calculating technical indicators...")
                indic_calc_start = time.monotonic()
                indicator_history_model = await _calculate_indicators(ohlcv_df_for_indicators, symbol_upper, request_id) # type: ignore
                logger.debug(f"{log_prefix} Indicator calculation took {time.monotonic() - indic_calc_start:.4f}s.")
                if indicator_history_model:
                    logger.info(f"{log_prefix} Extracting latest indicator values...")
                    latest_indic_start = time.monotonic()
                    latest_indicators_dict = _extract_latest_indicators(indicator_history_model, request_id) # type: ignore
                    logger.debug(f"{log_prefix} Latest indicator extraction took {time.monotonic() - latest_indic_start:.4f}s. Found {len(latest_indicators_dict)} indicators.")
                else: 
                    logger.warning(f"{log_prefix} Indicator calculation did not produce a valid model. Skipping latest indicator extraction."); latest_indicators_dict = {}
                
                if AI_ENABLED:
                     logger.info(f"{log_prefix} Generating AI analysis summary...")
                     ai_gen_start = time.monotonic()
                     final_ai_summary = await _generate_ai_analysis( # type: ignore
                          symbol=symbol_upper, ohlcv_df=ohlcv_df_for_indicators, latest_indicators=latest_indicators_dict,
                          news_items=final_news, company_overview=final_company_overview,
                          financials_data=final_financials, earnings_data=final_earnings_data, # <<< FRISSÍTETT PARAMÉTEREK
                          http_client=client, request_id=request_id
                     )
                     logger.debug(f"{log_prefix} AI analysis generation took {time.monotonic() - ai_gen_start:.4f}s.")
                     if final_ai_summary and not final_ai_summary.startswith("[AI"): # Feltételezve, hogy a hibajelzés [AI-val kezdődik
                        logger.info(f"{log_prefix} AI summary generated successfully.")
                     elif final_ai_summary: # Hibajelzés vagy speciális eset
                        logger.warning(f"{log_prefix} AI analysis generation result: {final_ai_summary}")
                     else: # Váratlanul None
                        logger.error(f"{log_prefix} AI analysis generation returned None unexpectedly.")
                else: 
                    logger.info(f"{log_prefix} AI analysis skipped (AI_ENABLED=False)."); final_ai_summary = None
            else:
                logger.warning(f"{log_prefix} Skipping indicators and AI analysis: Validated OHLCV DataFrame is missing or empty.")
                indicator_history_model = None; latest_indicators_dict = {}; final_ai_summary = None
            logger.debug(f"{log_prefix} Indicators & AI phase took {time.monotonic() - indicators_ai_start_time:.4f}s.")

            # Végső OHLCV válaszkomponensek előkészítése
            ohlcv_prep_start = time.monotonic()
            logger.info(f"{log_prefix} Preparing final OHLCV response components...")
            history_ohlcv_list, latest_ohlcv_point, last_refreshed_date_str, change_percent = await _prepare_ohlcv_for_response( # type: ignore
                chart_ready_ohlcv_list=chart_ready_ohlcv_list, request_id=request_id
            )
            logger.debug(f"{log_prefix} Final OHLCV response prep took {time.monotonic() - ohlcv_prep_start:.4f}s.")
            logger.info(f"{log_prefix}   - History Points Prepared: {len(history_ohlcv_list)}")
            logger.info(f"{log_prefix}   - Latest Point Prepared: {latest_ohlcv_point is not None}")
            logger.info(f"{log_prefix}   - Last Refreshed Date: {last_refreshed_date_str}, Change Percent: {change_percent}")

            # Válasz összeállítása, validálása és cache-elése
            logger.info(f"{log_prefix} $$$ Checkpoint 4: Assembling, Validating & Caching Final Response $$$")
            assembly_start_time = time.monotonic()
            response_timestamp = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

            # EODHD Splits/Dividends merge-elése a final_company_overview-ba (ha van)
            if final_company_overview: # Ha YF overview létezik
                if eodhd_splits_data:
                    logger.debug(f"{log_prefix} Merging {len(eodhd_splits_data)} EODHD splits into CompanyOverview.")
                    final_company_overview.splits = eodhd_splits_data
                if eodhd_dividends_data:
                    logger.debug(f"{log_prefix} Merging {len(eodhd_dividends_data)} EODHD dividends into CompanyOverview.")
                    final_company_overview.dividends = eodhd_dividends_data
            elif eodhd_splits_data or eodhd_dividends_data: # Ha YF overview Nincs, de EODHD S/D adatok vannak
                logger.warning(f"{log_prefix} YF CompanyOverview was None, but EODHD splits/dividends exist. Creating minimal CompanyOverview for them.")
                try:
                    # Currency itt nem lesz beállítva, hacsak a CompanyOverview modellnek nincs defaultja vagy logikája erre
                    final_company_overview = CompanyOverview(symbol=symbol_upper) 
                    if eodhd_splits_data: final_company_overview.splits = eodhd_splits_data
                    if eodhd_dividends_data: final_company_overview.dividends = eodhd_dividends_data
                    logger.info(f"{log_prefix} Minimal CompanyOverview created for EODHD splits/dividends.")
                except Exception as e_create_co: # Pl. Pydantic validációs hiba
                    logger.error(f"{log_prefix} Failed to create minimal CompanyOverview for EODHD S/D: {e_create_co}", exc_info=True)
                    final_company_overview = None # Biztosítjuk, hogy None maradjon hiba esetén

            # <<< JAVÍTOTT LOGOLÁS AZ ÚJ VÁLTOZÓNEVEKKEL >>>
            logger.debug(f"{log_prefix} Pre-assembly data summary: "
                         f"HistOHLCV={len(history_ohlcv_list)}, LatestOHLCV={latest_ohlcv_point is not None}, "
                         f"IndicHist={indicator_history_model is not None}, LatestIndic={len(latest_indicators_dict)}, "
                         f"CompanyOverview={final_company_overview is not None} "
                         f"(S:{len(final_company_overview.splits) if final_company_overview and final_company_overview.splits else 'N/A'}, "
                         f"D:{len(final_company_overview.dividends) if final_company_overview and final_company_overview.dividends else 'N/A'}), "
                         f"Financials={final_financials is not None}, Earnings={final_earnings_data is not None}, " # JAVÍTVA
                         f"Ratings={final_ratings_list is not None and bool(final_ratings_list)}, " # JAVÍTVA
                         f"News={len(final_news)}, AISummary={final_ai_summary is not None}")
            # === ITT ELLENŐRIZD ÚJRA, MIELŐTT A VÉGSŐ DICTIONARY-BA KERÜL ===
            logger.debug(f"{log_prefix} [NEWS CHECKPOINT] Before final_response_data assembly - final_news type: {type(final_news)}, length: {len(final_news) if isinstance(final_news, list) else 'N/A'}")
            if isinstance(final_news, list) and len(final_news) > 0:
                logger.debug(f"{log_prefix} [NEWS CHECKPOINT] First news item title (if any): {getattr(final_news[0], 'title', 'N/A')}")
            # =================================================================
            try:
                final_response_data = {
                    "symbol": symbol_upper,
                    "request_timestamp_utc": response_timestamp,
                    "data_source_info": DATA_SOURCE_INFO_TEXT,
                    "is_data_stale": False, # Friss adatok, mert idáig eljutottunk
                    "last_ohlcv_refreshed_date": last_refreshed_date_str,
                    "latest_ohlcv": latest_ohlcv_point,
                    "change_percent_day": change_percent,
                    "history_ohlcv": history_ohlcv_list,
                    "indicator_history": indicator_history_model,
                    "latest_indicators": latest_indicators_dict,
                    "company_overview": final_company_overview,
                    # <<< FRISSÍTETT VÁLTOZÓNEVEK A PYDANTIC MODELLHEZ IGAZODVA >>>
                    "financials": final_financials,
                    "earnings": final_earnings_data,       
                    "ratings_history": final_ratings_list, 
                    # === METADATA MEZŐ HOZZÁADÁSA ===
                    "metadata": {
                        "cache_hit": False,  # Friss adatok
                        "data_quality": "premium" if indicator_history_model and latest_ohlcv_point else "standard",
                        "request_id": request_id,
                        "processing_duration_seconds": time.monotonic() - orchestration_start_time,
                        "data_sources_used": [
                            "yfinance" if final_company_overview else None,
                            "eodhd" if eodhd_key_present and ohlcv_source == "eodhd" else None,
                            "alpha_vantage" if final_news and any(hasattr(n, 'source_api') and n.source_api == 'alphavantage' for n in final_news) else None
                        ]
                    },
                    # ================================
                    "news": final_news,
                    "ai_summary_hu": final_ai_summary,
                    "profile": final_company_overview,  # Legacy compatibility for frontend expecting `profile` block
                }
                logger.debug(f"[{log_prefix}] Value for 'last_ohlcv_refreshed_date' in final_response_data BEFORE model_validate: '{final_response_data.get('last_ohlcv_refreshed_date')}' (Type: {type(final_response_data.get('last_ohlcv_refreshed_date'))})")                
                logger.debug(f"{log_prefix} Attempting final Pydantic validation: FinBotStockResponse.model_validate...")
                final_response = FinBotStockResponse.model_validate(final_response_data)
                logger.info(f"{log_prefix} Final response data validated against FinBotStockResponse model.")

                await _cache_final_response(aggregate_cache_key, final_response, request_id, cache) # type: ignore

                assembly_duration = time.monotonic() - assembly_start_time
                total_orchestration_duration = time.monotonic() - orchestration_start_time
                logger.info(f"{log_prefix} Final assembly, validation, caching took {assembly_duration:.4f}s.")
                logger.info(f"{log_prefix} === Orchestration END (Success - Fresh Data). Total: {total_orchestration_duration:.4f}s ===")
                return final_response
            
            except ValidationError as e_validate:
                 assembly_duration = time.monotonic() - assembly_start_time
                 logger.critical(f"{log_prefix} !!! FINAL Pydantic Validation FAILED after {assembly_duration:.4f}s. Caching skipped.", exc_info=False)
                 try: 
                     errors_summary = "; ".join([f"Field: {'->'.join(map(str, e.get('loc',[])))}, Err: {e.get('msg', 'N/A')}, Input: {str(e.get('input','N/A'))[:100]}" for e in e_validate.errors()])
                 except: 
                     errors_summary = str(e_validate.errors()) # Fallback
                 logger.error(f"{log_prefix} Pydantic Validation Error Summary: {errors_summary}")
                 # Részletesebb logolás debug szinten, ha szükséges
                 # logger.debug(f"{log_prefix} Raw Pydantic validation error details: {e_validate.errors(include_input=True, include_url=False)}") # Vigyázat, érzékeny adatokat tartalmazhat az input!
                 
                 # Speciális ellenőrzés a company_overview.splits/dividends hibára
                 if any(isinstance(loc_part, str) and 'company_overview' in loc_part and ('splits' in loc_part or 'dividends' in loc_part)
                        for e_item in e_validate.errors() for loc_part in e_item.get('loc', [])):
                     logger.error(f"{log_prefix} Validation failed possibly at 'company_overview.splits/dividends'. Ensure CompanyOverview model and its sub-models (StockSplitData, DividendData) are correctly defined and data matches.")

                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "Internal Server Error: Failed final data validation.", "details": errors_summary, "request_id": request_id}) from e_validate
            except Exception as e_assemble_cache: # Bármilyen más hiba az összeállítás/cachelés során
                 assembly_duration = time.monotonic() - assembly_start_time
                 logger.critical(f"{log_prefix} !!! UNEXPECTED ERROR during final assembly/validation/caching after {assembly_duration:.4f}s: {e_assemble_cache}", exc_info=True)
                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "Unexpected internal error during final response assembly or caching.", "request_id": request_id}) from e_assemble_cache

    except LockError: # Lock megszerzése sikertelen
        lock_acquire_fail_duration = time.monotonic() - orchestration_start_time # Az orchestráció kezdete óta eltelt idő
        logger.warning(f"{log_prefix} Failed to acquire lock '{lock_name}' (timeout: {LOCK_BLOCKING_TIMEOUT_SECONDS}s) after {lock_acquire_fail_duration:.4f}s. Attempting to serve stale cache...")
        cached_response = await _check_aggregate_cache(aggregate_cache_key, request_id, cache) # type: ignore
        if cached_response:
            cached_response.is_data_stale = True # Jelöljük, hogy az adat elavult
            total_duration_stale = time.monotonic() - orchestration_start_time
            logger.warning(f"{log_prefix} === Orchestration END (Lock Contention - STALE Cached Data Served). Total: {total_duration_stale:.4f}s ===")
            return cached_response
        else:
            total_duration_fail = time.monotonic() - orchestration_start_time
            logger.error(f"{log_prefix} === Orchestration END (Lock Contention - Lock FAILED & NO Cache Available). Total: {total_duration_fail:.4f}s ===")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail={"error": "Service temporarily unavailable due to high load and no cached data. Please try again shortly.", "request_id": request_id})
    except HTTPException as http_err: # Már kezelt és továbbadott HTTP hiba
        e_orchestration_unexpected = http_err # Rögzítjük a finally blokkhoz
        total_duration_http_err = time.monotonic() - orchestration_start_time
        # Biztosítjuk, hogy a request_id benne legyen a detail-ben
        if isinstance(http_err.detail, dict) and "request_id" not in http_err.detail: 
            http_err.detail["request_id"] = request_id
        elif isinstance(http_err.detail, str) and f"(Request ID: {request_id})" not in http_err.detail : 
            http_err.detail = f"{http_err.detail} (Request ID: {request_id})"
        
        logger.warning(f"{log_prefix} Propagating HTTPException after {total_duration_http_err:.4f}s: Status={http_err.status_code}, Detail={http_err.detail}", exc_info=False) # exc_info=False, mert a hibát már logolták ahol keletkezett
        raise http_err # Változatlanul továbbadjuk
    except Exception as ex_orch: # Váratlan, nem kezelt hiba az orchestráció során
        e_orchestration_unexpected = ex_orch # Rögzítjük a finally blokkhoz
        total_duration_uncaught = time.monotonic() - orchestration_start_time
        logger.critical(f"{log_prefix} !!! CRITICAL UNHANDLED Orchestration Error after {total_duration_uncaught:.4f}s: {e_orchestration_unexpected}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": "An unexpected internal server error occurred during data orchestration.", "request_id": request_id}) from e_orchestration_unexpected
    finally:
        final_duration = time.monotonic() - orchestration_start_time
        error_occurred = isinstance(e_orchestration_unexpected, Exception)
        status_summary = "EndedWithError" if error_occurred else ("CacheHit" if not lock_acquired and not error_occurred else "Success") # Egyszerűsített státusz
        if not lock_acquired and not error_occurred: status_summary = "LockFail_StaleCacheOrNoCache"


        logger.info(f"{log_prefix} --- Orchestration Finalizing ({status_summary}). Lock Acquired: {lock_acquired}. Total exec time: {final_duration:.4f}s ---")
        # Itt lehetne metrikákat küldeni vagy egyéb lezáró tevékenységeket végezni

    # --- Multi-resolution OHLCV fetch (EODHD only) ---
    ohlcv_multi: Optional[Dict[str, List[Dict[str, Any]]]] = None
    if ohlcv_source == "eodhd" and eodhd_key_present:
        logger.info(f"{log_prefix} Starting multi-resolution OHLCV fetch from EODHD...")
        intervals = [
            ("1m", "1m"), ("2m", "2m"), ("5m", "5m"), ("15m", "15m"), ("30m", "30m"),
            ("1h", "1h"), ("2h", "2h"), ("4h", "4h"), ("1d", "d"), ("1w", "w"), ("1mo", "m")
        ]
        ohlcv_multi = {}
        successful_intervals = []
        failed_intervals = []

        for key, interval in intervals:
            try:
                logger.info(f"{log_prefix} Fetching OHLCV data for interval '{interval}'...")
                period = "2y" if interval in ["1m", "2m", "5m", "15m", "30m", "1h", "2h", "4h"] else f"{OHLCV_YEARS}y"
                df = await fetchers.fetch_eodhd_ohlcv(eodhd_symbol_for_keys, client, cache, interval=interval, period_or_start_date=period)
                
                if df is not None and not df.empty:
                    mapped_data = mappers.map_eodhd_ohlcv_df_to_frontend_list(df, request_id, interval=interval)
                    if mapped_data and len(mapped_data) > 0:
                        ohlcv_multi[key] = mapped_data
                        successful_intervals.append(f"{key}({len(mapped_data)} bars)")
                        logger.info(f"{log_prefix} Successfully mapped {len(mapped_data)} bars for interval '{interval}'")
                    else:
                        failed_intervals.append(f"{key}(mapped empty)")
                        logger.warning(f"{log_prefix} Mapping returned empty result for interval '{interval}'")
                else:
                    failed_intervals.append(f"{key}(no data)")
                    logger.warning(f"{log_prefix} No data returned from EODHD for interval '{interval}'")
            except Exception as e:
                failed_intervals.append(f"{key}(error)")
                logger.error(f"{log_prefix} Failed to fetch/map EODHD OHLCV for interval '{interval}': {str(e)}")

        if successful_intervals:
            logger.info(f"{log_prefix} Successfully populated intervals: {', '.join(successful_intervals)}")
        if failed_intervals:
            logger.warning(f"{log_prefix} Failed intervals: {', '.join(failed_intervals)}")
            
        if not ohlcv_multi:
            logger.error(f"{log_prefix} No intervals were successfully populated in ohlcv_multi")
            ohlcv_multi = None
        else:
            logger.info(f"{log_prefix} Final ohlcv_multi contains {len(ohlcv_multi)} intervals")

    response = FinBotStockResponse(
        # ... existing fields ...
        ohlcv_multi=ohlcv_multi,
        # ... existing fields ...
    )

logger.info(f"--- {SERVICE_NAME} (v{version}) orchestration logic for premium stock data loaded. ---")

# === PROGRESSIVE LOADING SERVICE FUNCTIONS ===

async def get_basic_stock_data(
    symbol: str, 
    client: httpx.AsyncClient,
    cache: CacheService
) -> Optional[Dict[str, Any]]:
    """
    Kifejezetten a /basic/{ticker} és a ticker-tape végpontokhoz.
    """
    request_id = f"basic-{symbol}-{uuid.uuid4().hex[:6]}"
    logger.info(f"[{request_id}] Getting basic stock data for {symbol}")
    
    try:
        # Párhuzamos lekérdezés indítása a gyorsaságért
        company_info_task = fetchers.yfinance.fetch_company_info_dict(symbol, cache)
        
        # EODHD hívás csak ha engedélyezve van és van kulcs
        ohlcv_task = None
        if settings.EODHD_FEATURES.USE_FOR_OHLCV_DAILY and settings.API_KEYS.EODHD:
            eodhd_symbol = _get_eodhd_symbol(symbol, request_id)
            ohlcv_task = fetchers.eodhd.fetch_eodhd_ohlcv(
                symbol_with_exchange=eodhd_symbol,
                client=client,
                cache=cache,
                interval="1d",
                period_or_start_date=(datetime.now() - timedelta(days=OHLCV_YEARS*365)).strftime('%Y-%m-%d'),
                force_refresh=False
            )
        
        # Várakozás a két feladat befejezésére
        ticker_info, ohlcv_df = await asyncio.gather(company_info_task, ohlcv_task)
        
        if not ticker_info:
            logger.warning(f"[{request_id}] No ticker info available for {symbol}")
            return None
            
        # Extract basic information
        current_price = ticker_info.get('currentPrice') or ticker_info.get('regularMarketPrice')
        previous_close = ticker_info.get('previousClose') or ticker_info.get('regularMarketPreviousClose')
        
        change = None
        change_percent = None
        if current_price and previous_close:
            change = current_price - previous_close
            change_percent = (change / previous_close) * 100
        
        basic_data = {
            "symbol": symbol,
            "company_name": ticker_info.get('longName') or ticker_info.get('shortName'),
            "current_price": current_price,
            "previous_close": previous_close,
            "change": change,
            "change_percent": change_percent,
            "currency": ticker_info.get('currency', 'USD'),
            "exchange": ticker_info.get('exchange'),
            "market_cap": ticker_info.get('marketCap'),
            "volume": ticker_info.get('volume') or ticker_info.get('regularMarketVolume'),
            "day_high": ticker_info.get('dayHigh') or ticker_info.get('regularMarketDayHigh'),
            "day_low": ticker_info.get('dayLow') or ticker_info.get('regularMarketDayLow'),
            "sector": ticker_info.get('sector'),
            "industry": ticker_info.get('industry'),
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id
        }
        
        logger.info(f"[{request_id}] Basic data retrieved successfully")
        return basic_data
        
    except Exception as error:
        logger.error(f"[{request_id}] Error getting basic stock data: {error}", exc_info=True)
        return None

async def get_chart_data(
    symbol: str, 
    period: str, 
    interval: str, 
    client: httpx.AsyncClient,
    cache: CacheService
) -> Optional[Dict[str, Any]]:
    """
    Fetch chart data for progressive loading (Phase 2)
    Returns: OHLCV data for charting
    """
    log_prefix = f"chart-{symbol[:5]}-{str(uuid.uuid4())[:6]}"
    logger.info(f"[{log_prefix}] Initiating chart data fetch for '{symbol}'")

    years = _period_to_years(period)

    try:
        # Use the correct fetcher based on EODHD settings
        if settings.EODHD_FEATURES.USE_FOR_OHLCV_DAILY and settings.API_KEYS.EODHD:
            eodhd_symbol = _get_eodhd_symbol(symbol, log_prefix)
            
            # 🔧 FIX: EODHD interval conversion and endpoint selection
            use_eod_endpoint = False
            eodhd_interval = interval
            
            if interval == "1d":
                # For daily data, use the end-of-day endpoint (not intraday)
                use_eod_endpoint = True
                eodhd_interval = "d"
            elif interval in ["1w", "1wk"]:
                use_eod_endpoint = True
                eodhd_interval = "w"
            elif interval in ["1mo", "1M"]:
                use_eod_endpoint = True
                eodhd_interval = "m"
            # For intraday intervals (5m, 15m, 30m, 1h), keep as-is and use intraday endpoint
            
            if use_eod_endpoint:
                # 🔧 FIX: Use yfinance for daily data since fetch_eodhd_eod doesn't exist
                logger.info(f"[{log_prefix}] Using yfinance for daily data (interval={interval})")
                ohlcv_df = await fetchers.yfinance.fetch_ohlcv(symbol, years=years, cache=cache, interval=interval)
            else:
                # Use intraday endpoint for intraday intervals
                ohlcv_df = await fetchers.eodhd.fetch_eodhd_ohlcv_intraday(
                    symbol_with_exchange=eodhd_symbol,
                    client=client,
                    cache=cache,
                    interval=eodhd_interval,
                    period_or_start_date=(datetime.now() - timedelta(days=years*365)).strftime('%Y-%m-%d'),
                    force_refresh=False
                )
        else:
            ohlcv_df = await fetchers.yfinance.fetch_ohlcv(symbol, years=years, cache=cache, interval=interval)

        if ohlcv_df is None or ohlcv_df.empty:
            logger.warning(f"[{log_prefix}] OHLCV data frame is missing or empty for {symbol}.")
            return None
        
        # Convert to chart-ready format
        chart_data = []
        for index, row in ohlcv_df.iterrows():
            # 🔧 FIX: Handle different column name cases (EODHD uses Title Case)
            open_val = row.get('open') or row.get('Open')
            high_val = row.get('high') or row.get('High') 
            low_val = row.get('low') or row.get('Low')
            close_val = row.get('close') or row.get('Close')
            volume_val = row.get('volume') or row.get('Volume')
            
            chart_data.append({
                "date": index.strftime('%Y-%m-%d'),
                "timestamp": int(index.timestamp()),
                "open": float(open_val) if pd.notna(open_val) else None,
                "high": float(high_val) if pd.notna(high_val) else None,
                "low": float(low_val) if pd.notna(low_val) else None,
                "close": float(close_val) if pd.notna(close_val) else None,
                "volume": int(volume_val) if pd.notna(volume_val) else None
            })
        
        # Get latest OHLCV for current price
        latest_row = ohlcv_df.iloc[-1] if not ohlcv_df.empty else None
        latest_ohlcv = None
        if latest_row is not None:
            # 🔧 FIX: Handle different column name cases for latest data too
            open_val = latest_row.get('open') or latest_row.get('Open')
            high_val = latest_row.get('high') or latest_row.get('High')
            low_val = latest_row.get('low') or latest_row.get('Low')
            close_val = latest_row.get('close') or latest_row.get('Close')
            volume_val = latest_row.get('volume') or latest_row.get('Volume')
            
            latest_ohlcv = {
                "date": latest_row.name.strftime('%Y-%m-%d'),
                "open": float(open_val) if pd.notna(open_val) else None,
                "high": float(high_val) if pd.notna(high_val) else None,
                "low": float(low_val) if pd.notna(low_val) else None,
                "close": float(close_val) if pd.notna(close_val) else None,
                "volume": int(volume_val) if pd.notna(volume_val) else None
            }
        
        result = {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "ohlcv": chart_data,  # Changed from chart_data to ohlcv to match response structure
            "latest_ohlcv": latest_ohlcv,
            "data_points": len(chart_data),
            "currency": "USD",  # Default currency
            "timezone": "America/New_York",  # Default timezone
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": log_prefix
        }
        
        logger.info(f"[{log_prefix}] Chart data retrieved successfully ({len(chart_data)} points)")
        return result
        
    except Exception as error:
        logger.error(f"[{log_prefix}] Error getting chart data: {error}", exc_info=True)
        return None

async def get_fundamentals_data(
    symbol: str, 
    client: httpx.AsyncClient,
    cache: CacheService
) -> Optional[Dict[str, Any]]:
    """
    Fetch fundamental data for progressive loading (Phase 2)
    Returns: Company overview, financial metrics, valuation
    """
    log_prefix = f"funds-{symbol[:5]}-{str(uuid.uuid4())[:6]}"
    logger.info(f"[{log_prefix}] Initiating fundamentals fetch for '{symbol}'")

    try:
        # Fetching tasks in parallel
        # Note: We need company info to get currency for some mappers
        ticker_info = await fetchers.yfinance.fetch_company_info_dict(symbol, cache)
        if not ticker_info:
            logger.warning(f"[{log_prefix}] Could not retrieve company info for {symbol}, fundamentals might be incomplete.")
            # Return a minimal response or None if this is critical
            return {"error": "Company info not available, cannot fetch fundamentals."}
            
        company_currency = ticker_info.get("currency")
        
        # Use EODHD for financials if enabled and available
        if USE_EODHD_FOR_FINANCIALS and settings.API_KEYS.EODHD:
            eodhd_symbol = _get_eodhd_symbol(symbol, log_prefix)
            # TODO: Implement fetch_eodhd_financials function
            financial_dfs_task = fetchers.yfinance.fetch_financial_data_dfs(symbol, cache)
        else:
            financial_dfs_task = fetchers.yfinance.fetch_financial_data_dfs(symbol, cache)
        
        # FMP can be a source for ratings or other supplementary data  
        # TODO: Implement fetch_fmp_ratings properly
        ratings_task = None

        # Await all tasks
        if ratings_task:
            financial_dfs, ratings_raw = await asyncio.gather(financial_dfs_task, ratings_task)
        else:
            financial_dfs = await financial_dfs_task
            ratings_raw = None

        # Process and map financial data
        if financial_dfs:
            try:
                # The data source is implicitly known from the fetcher used
                financials_data = mappers.map_financial_dataframes_to_financials_model(
                    financial_dfs,
                    request_id=log_prefix, # Corrected: pass log_prefix to request_id
                    currency=company_currency
                )
                # Note: this function returns only FinancialsData, not a tuple
                earnings_data = None  # Separate earnings processing would be needed
            except Exception as e:
                logger.error(f"[{log_prefix}] Failed to map financial data: {e}", exc_info=True)
                financials_data = None
                earnings_data = None
        else:
            financials_data = None
            earnings_data = None
        
        # Process and map ratings data
        ratings = []
        if ratings_raw:
            try:
                ratings = mappers.map_fmp_raw_ratings_to_rating_points(ratings_raw, log_prefix=log_prefix)
            except Exception as e:
                logger.error(f"[{log_prefix}] Failed to map ratings data: {e}")
                ratings = []

        logger.info(f"[{log_prefix}] Successfully processed fundamentals for {symbol}")
        
        # Construct the enriched response dictionary

        # Map company information using yfinance ticker_info
        company_info: Dict[str, Any] = {
            "symbol": symbol,
            "name": ticker_info.get("longName") or ticker_info.get("shortName") or ticker_info.get("displayName") or symbol,
            "exchange": ticker_info.get("exchange") or ticker_info.get("fullExchangeName"),
            "sector": ticker_info.get("sector"),
            "industry": ticker_info.get("industry"),
            "country": ticker_info.get("country"),
            "currency": ticker_info.get("currency"),
            "market_cap": ticker_info.get("marketCap"),
            # Additional descriptive fields for richer frontend display
            "description": ticker_info.get("longBusinessSummary"),
            "website": ticker_info.get("website"),
            "employees": ticker_info.get("fullTimeEmployees"),
            "headquarters": ticker_info.get("city") or ticker_info.get("address1"),
        }

        # Ensure financials dict contains market_cap
        financials_dict: Dict[str, Any] = financials_data.model_dump(by_alias=True) if financials_data else {}
        if ticker_info.get("marketCap") and not financials_dict.get("market_cap"):
            financials_dict["market_cap"] = ticker_info["marketCap"]

        # Basic valuation/market metrics (extensible)
        metrics_dict: Dict[str, Any] = {
            "market_cap": ticker_info.get("marketCap"),
            "pe_ratio": ticker_info.get("trailingPE"),
            "pb_ratio": ticker_info.get("priceToBook"),
            "beta": ticker_info.get("beta"),
        }

        # ------------------------------------------------------------------
        # Enrich metrics_dict so that frontend financial-metrics bubble
        # no longer shows a large amount of "N/A" fields.
        # ------------------------------------------------------------------

        try:
            # Use the existing mapper to obtain a rich CompanyOverview model
            from modules.financehub.backend.core import mappers as _mappers  # local import avoids circular deps at top
            overview_model = _mappers.map_yfinance_info_to_overview(
                ticker_info,
                request_id=log_prefix,
                symbol_override=symbol,
            )
        except Exception as map_err:
            overview_model = None
            logger.warning(f"[{log_prefix}] CompanyOverview mapping failed: {map_err}")

        def _safe_div(num: Optional[Union[int, float]], den: Optional[Union[int, float]]) -> Optional[float]:
            """Return num/den or None when invalid."""
            try:
                if num is None or den in (None, 0):
                    return None
                return float(num) / float(den)
            except Exception:
                return None

        financial_assets = financials_dict.get("total_assets")
        financial_liabs = financials_dict.get("total_liabilities")

        extended_metrics: Dict[str, Any] = {}

        if overview_model:
            ov = overview_model  # alias
            # Valuation
            extended_metrics.update({
                "peg_ratio": ov.peg_ratio,
                "ps_ratio": ov.price_to_sales_ratio_ttm,
                "ev_ebitda": ov.ev_to_ebitda,
            })

            # Margins & returns
            extended_metrics.update({
                "gross_margin": _safe_div(ov.gross_profit_ttm, ov.revenue_ttm) if (ov.gross_profit_ttm and ov.revenue_ttm) else None,
                "operating_margin": ov.operating_margin_ttm,
                "net_margin": ov.profit_margin,
                "ebitda_margin": _safe_div(ov.ebitda, ov.revenue_ttm) if (ov.ebitda and ov.revenue_ttm) else None,
                "roe": ov.return_on_equity_ttm,
                "roa": ov.return_on_assets_ttm,
            })

            # Growth
            extended_metrics.update({
                "revenue_growth": ov.quarterly_revenue_growth_yoy,
                "earnings_growth": ov.quarterly_earnings_growth_yoy,
            })

            # Market / payout
            extended_metrics.update({
                "dividend_yield": ov.dividend_yield,
            })

        # Leverage & liquidity ratios derived from financials
        extended_metrics.update({
            "debt_to_equity": _safe_div(financial_liabs, (financial_assets - financial_liabs)) if (financial_assets and financial_liabs) else None,
            "debt_to_assets": _safe_div(financial_liabs, financial_assets),
            "equity_ratio": _safe_div((financial_assets - financial_liabs), financial_assets) if financial_assets else None,
        })

        # Liquidity ratios direct from yfinance keys (if present)
        extended_metrics.update({
            "current_ratio": ticker_info.get("currentRatio"),
            "quick_ratio": ticker_info.get("quickRatio"),
            "cash_ratio": ticker_info.get("cashRatio"),
        })

        # Free cash flow based metrics – requires freeCashflow key
        free_cash_flow_val = ticker_info.get("freeCashflow") or ticker_info.get("freeCashFlow")
        if free_cash_flow_val and metrics_dict.get("market_cap"):
            extended_metrics["price_to_fcf"] = _safe_div(metrics_dict["market_cap"], free_cash_flow_val)
            extended_metrics["fcf_yield"] = _safe_div(free_cash_flow_val, metrics_dict["market_cap"])

        # Earnings yield (inverse of PE)
        if metrics_dict.get("pe_ratio"):
            extended_metrics["earnings_yield"] = _safe_div(1.0, metrics_dict["pe_ratio"])

        # Merge extended metrics, preferring newly calculated values when available
        metrics_dict.update({k: v for k, v in extended_metrics.items() if v is not None})

        # --- 2025-06-15 Enhancement: include *all* numeric ticker_info fields for richer frontend ---
        for _key, _val in ticker_info.items():
            if _key not in metrics_dict:
                if isinstance(_val, (int, float)) or _val is None:
                    metrics_dict[_key] = _val

        # Ensure working capital & free cash flow added to financials_dict for frontend rendering
        if financial_assets is not None and financial_liabs is not None:
            financials_dict.setdefault("working_capital", financial_assets - financial_liabs)
        if free_cash_flow_val is not None:
            financials_dict.setdefault("free_cash_flow", free_cash_flow_val)

        # Optionally expose the full overview (non-breaking, useful for future UI)
        if overview_model:
            company_info.setdefault("additional_overview", overview_model.model_dump(by_alias=True))
         
        # --- NEW: Include real-time price snapshot so frontend header can render live data ---
        price_data: Dict[str, Any] = {
            # Using yfinance 'regularMarket*' keys for consistency
            "price": ticker_info.get("regularMarketPrice") or ticker_info.get("currentPrice"),
            "current_price": ticker_info.get("regularMarketPrice") or ticker_info.get("currentPrice"),
            "previous_close": ticker_info.get("regularMarketPreviousClose") or ticker_info.get("previousClose"),
            "day_high": ticker_info.get("regularMarketDayHigh"),
            "day_low": ticker_info.get("regularMarketDayLow"),
            "volume": ticker_info.get("regularMarketVolume"),
            "change": ticker_info.get("regularMarketChange"),
            "change_percent": ticker_info.get("regularMarketChangePercent"),
            "market_cap": ticker_info.get("marketCap"),
            "currency": ticker_info.get("currency"),
            "timestamp": datetime.utcnow().isoformat()
        }

        # If change is missing but price & prev_close exist, compute on-the-fly
        if price_data.get("price") is not None and price_data.get("previous_close") is not None and price_data.get("change") is None:
            price_data["change"] = price_data["price"] - price_data["previous_close"]
        if price_data.get("change") is not None and price_data.get("previous_close") not in (None, 0) and price_data.get("change_percent") is None:
            price_data["change_percent"] = (price_data["change"] / price_data["previous_close"]) * 100

        response_data = {
            "company_info": company_info,
            "profile": company_info,  # Legacy compatibility for older frontend expecting `profile`
            "financials": financials_dict if financials_dict else None,
            "earnings": earnings_data.model_dump(by_alias=True) if earnings_data else None,
            "ratings": [r.model_dump(by_alias=True) for r in ratings] if ratings else None,
            "metrics": metrics_dict,
            "price_data": price_data,
            "overview": overview_model.model_dump(by_alias=True) if 'overview_model' in locals() and overview_model else None,
        }
        
        return response_data

    except Exception as e:
        logger.error(f"[{log_prefix}] Failed to get fundamentals for {symbol}: {e}", exc_info=True)
        return None

async def get_analytics_data(
    symbol: str, 
    client: httpx.AsyncClient,
    cache: CacheService
) -> Optional[Dict[str, Any]]:
    """
    Fetch analytics and AI data for progressive loading (Phase 4)
    Returns: AI analysis, news, sentiment, advanced metrics
    """
    log_prefix = f"analytics-{symbol[:5]}-{str(uuid.uuid4())[:6]}"
    logger.info(f"[{log_prefix}] Initiating analytics fetch for '{symbol}'")
    
    try:
        # Initialize cache service for news fetching
        
        # Get news data
        news_items = []
        try:
            news_items = await _fetch_and_process_news_dynamically(
                symbol=symbol,
                client=client,
                request_id=log_prefix,
                cache=cache,
                eodhd_available=True  # Assuming EODHD is available
            )
            logger.info(f"[{log_prefix}] Retrieved {len(news_items)} news items")
        except Exception as news_error:
            logger.warning(f"[{log_prefix}] Error fetching news: {news_error}")
        
        # Get basic company info for AI analysis
        ticker_info = await fetchers.yfinance.fetch_company_info_dict(symbol, cache)
        company_overview = None
        if ticker_info:
            try:
                company_overview = await _process_and_map_company_info(
                    ticker_info, log_prefix, symbol
                )
            except Exception as company_error:
                logger.warning(f"[{log_prefix}] Error processing company info: {company_error}")
        
        # Generate AI analysis
        ai_analysis = None
        try:
            ai_analysis = await _generate_ai_analysis(
                symbol=symbol,
                ohlcv_df=None,  # Not needed for basic analysis
                latest_indicators={},
                news_items=news_items,
                company_overview=company_overview,
                financials_data=None,  # Not needed for basic analysis
                earnings_data=None,    # Not needed for basic analysis
                http_client=client,
                request_id=log_prefix
            )
        except Exception as ai_error:
            logger.warning(f"[{log_prefix}] Error generating AI analysis: {ai_error}")
        
        # Prepare news data for response
        news_data = []
        for news_item in news_items[:10]:  # Limit to 10 recent news
            try:
                news_data.append({
                    "title": news_item.title,
                    "summary": news_item.summary or news_item.content or news_item.title,
                    "url": str(news_item.link) if news_item.link else None,
                    "published_date": news_item.published_at.strftime('%Y-%m-%d %H:%M:%S') if news_item.published_at else None,
                    "source": news_item.publisher,
                    "sentiment": getattr(news_item, 'overall_sentiment_label', 'neutral')
                })
            except Exception as news_parse_error:
                logger.warning(f"[{log_prefix}] Error parsing news item: {news_parse_error}")
                continue
        
        analytics_data = {
            "symbol": symbol,
            "ai_analysis": ai_analysis,
            "news": news_data,
            "indicators": {},
            "sentiment_summary": {
                "overall": "neutral",  # Could be calculated from news sentiment
                "news_count": len(news_items),
                "analysis_confidence": "medium" if ai_analysis else "low"
            },
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": log_prefix
        }
        
        logger.info(f"[{log_prefix}] Analytics data retrieved successfully")
        return analytics_data
        
    except Exception as error:
        logger.error(f"[{log_prefix}] Error getting analytics data: {error}", exc_info=True)
        return None

# End of progressive loading service functions

# === Lightweight Technical Analysis (No LLM, No News) ===

async def get_technical_analysis_data(
    symbol: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    period: str = "6mo",
    interval: str = "1d",
) -> Optional[Dict[str, Any]]:
    """Return fast technical-indicator snapshot for a stock.

    The function fetches (cached) OHLCV data, computes a standard indicator
    set via the already-existing `_calculate_indicators` helper and extracts
    the latest values with `_extract_latest_indicators`.  No LLM or external
    news calls are invoked, so the expected latency is in the 100–400 ms
    range (chart fetch + indicator calc).
    """
    request_id = f"tech-{symbol[:5]}-{uuid.uuid4().hex[:6]}"
    log_prefix = f"[{request_id}]"

    symbol_upper = symbol.upper()
    logger.info(f"{log_prefix} Technical analysis (light) started for {symbol_upper} …")

    try:
        # 1) Pull (cached) price history – re-use existing chart service
        chart_json = None
        # Try intraday intervals first (EODHD premium), then daily fallback
        candidate_intervals = [
            ("15m", "10d"),  # Highest-resolution (≈ 15 days @ 15m)
            ("30m", "30d"),  # Mid-resolution (≈ 30 days)
            (interval, period)  # Original args – typically 1d/6mo
        ]

        for cand_interval, cand_period in candidate_intervals:
            try:
                tmp_json = await get_chart_data(
                    symbol=symbol_upper,
                    period=cand_period,
                    interval=cand_interval,
                    client=client,
                    cache=cache,
                )
                if tmp_json and tmp_json.get("ohlcv"):
                    chart_json = tmp_json
                    # Overwrite period/interval so metadata reports the actual dataset used
                    period = cand_period
                    interval = cand_interval
                    logger.info(f"{log_prefix} Using dataset period={cand_period} interval={cand_interval} (provider={tmp_json.get('metadata', {}).get('provider', 'unknown')}).")
                    break
            except Exception as cand_err:
                logger.debug(f"{log_prefix} Interval {cand_interval} fetch failed: {cand_err}")

        if not chart_json:
            logger.warning(f"{log_prefix} All chart fetch attempts failed → aborting TA.")
            return None

        # The helper get_chart_data() returns a JSONResponse; if so, load its JSON payload.
        if isinstance(chart_json, JSONResponse):
            try:
                chart_payload = chart_json.body
                if isinstance(chart_payload, (bytes, bytearray)):
                    chart_json = json.loads(chart_payload)
                else:
                    chart_json = chart_payload  # already a dict
            except Exception:
                logger.error(f"{log_prefix} Failed to parse JSONResponse body from get_chart_data.")
                return None
        if not isinstance(chart_json, dict):
            logger.error(f"{log_prefix} Unexpected type from get_chart_data: {type(chart_json)}")
            return None

        raw_list = chart_json.get("chart_data", {}).get("ohlcv", []) or chart_json.get("ohlcv", [])

        # Convert chart JSON format (date/open/high/…) to indicator-ready list with
        # keys expected by _validate_ohlcv_dataframe: t (ms), o, h, l, c, v
        ohlcv_raw: List[Dict[str, Any]] = []
        for p in raw_list:
            try:
                ts_ms: int
                if "timestamp" in p and p["timestamp"]:
                    ts_ms = int(float(p["timestamp"])) * 1000
                elif "date" in p and p["date"]:
                    ts_ms = int(datetime.fromisoformat(str(p["date"])).timestamp()) * 1000
                else:
                    continue  # skip invalid row

                ohlcv_raw.append({
                    "t": ts_ms,
                    "o": p.get("open"),
                    "h": p.get("high"),
                    "l": p.get("low"),
                    "c": p.get("close"),
                    "v": p.get("volume"),
                })
            except Exception:
                continue

        if not ohlcv_raw:
            logger.warning(f"{log_prefix} Empty OHLCV list.")
            return None

        # 2) Convert list→DataFrame for indicator calc
        ohlcv_df = await _validate_ohlcv_dataframe(ohlcv_raw, log_prefix)  # type: ignore
        if ohlcv_df is None or ohlcv_df.empty:
            logger.error(f"{log_prefix} Failed to build valid DataFrame for indicators.")
            return None

        # 3) Calculate full indicator history, then extract latest snapshot
        indicator_history = await _calculate_indicators(ohlcv_df, symbol_upper, request_id)  # type: ignore
        latest_indic_dict = _extract_latest_indicators(indicator_history, request_id) if indicator_history else {}

        # 4) Basic day change % from last two closes
        change_pct = None
        if len(ohlcv_raw) >= 2:
            try:
                last_close = float(ohlcv_raw[-1]["close"])
                prev_close = float(ohlcv_raw[-2]["close"])
                if prev_close != 0:
                    change_pct = round(((last_close - prev_close) / prev_close) * 100, 4)
            except Exception:
                change_pct = None

        latest_point = ohlcv_raw[-1] if ohlcv_raw else None

        response_payload = {
            "symbol": symbol_upper,
            "timestamp": datetime.utcnow().isoformat(),
            "latest_ohlcv": latest_point,
            "change_percent_day": change_pct,
            "latest_indicators": latest_indic_dict,
            "metadata": {
                "cache_hit": chart_json.get("metadata", {}).get("cache_hit", False),
                "source": chart_json.get("metadata", {}).get("provider", "unknown"),
                "period": period,
                "interval": interval,
            },
        }

        logger.info(f"{log_prefix} Technical analysis ready (keys: {list(response_payload.keys())}).")
        return response_payload

    except Exception as tech_err:
        logger.error(f"{log_prefix} Error during lightweight technical analysis: {tech_err}", exc_info=True)
        return None

# ---------------------------------------------------------------------------
# Lightweight News-only data fetcher (NO LLM) – for /news endpoint           
# ---------------------------------------------------------------------------

async def get_news_data(
    symbol: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    limit: int = 10,
) -> Optional[Dict[str, Any]]:
    """Return latest stock-specific news articles and a naïve sentiment summary.

    Unlike get_analytics_data this helper deliberately *avoids* any LLM-based
    sentiment or summary generation to keep response latency low (<1 s typical).

    Parameters
    ----------
    symbol : str
        Stock ticker symbol (e.g. "AAPL").
    client : httpx.AsyncClient
        Shared async HTTP client injected by FastAPI dependency.
    cache : CacheService
        Redis-based caching layer for third-party API calls.
    limit : int, optional
        Max number of news items to return (defaults to 10).
    """
    request_id = f"news-{symbol[:5]}-{uuid.uuid4().hex[:6]}"
    log_prefix = f"[{request_id}]"
    start_ts = time.monotonic()

    try:
        news_items: List[NewsItem] = await _fetch_and_process_news_dynamically(
            symbol=symbol,
            client=client,
            request_id=request_id,
            cache=cache,
            eodhd_available=True,
        )

        if not news_items:
            logger.warning(f"{log_prefix} No news returned for {symbol}")
            return None

        # Basic sentiment aggregation (count positive / negative labels if present)
        pos = neg = neu = 0
        for n in news_items:
            sentiment = getattr(n, "overall_sentiment_label", "neutral") or "neutral"
            if sentiment == "positive":
                pos += 1
            elif sentiment == "negative":
                neg += 1
            else:
                neu += 1

        total_articles = len(news_items)
        overall_sentiment = (
            "positive" if pos > neg and pos > neu else
            "negative" if neg > pos and neg > neu else
            "neutral"
        )

        duration_ms = round((time.monotonic() - start_ts) * 1000, 2)
        logger.info(f"{log_prefix} Collected {total_articles} news articles in {duration_ms} ms")

        # Trim to requested limit and map to serialisable dicts
        limited_news_dicts = [
            {
                "title": n.title,
                "summary": n.summary or n.content or n.title,
                "url": str(n.link) if n.link else None,
                "published_date": n.published_at.strftime('%Y-%m-%d %H:%M:%S') if n.published_at else None,
                "source": n.publisher,
                "sentiment": getattr(n, "overall_sentiment_label", "neutral"),
            }
            for n in news_items[:limit] if n is not None
        ]

        return {
            "news": limited_news_dicts,
            "sentiment_summary": {
                "overall": overall_sentiment,
                "news_count": total_articles,
            },
        }

    except Exception as exc:
        duration_ms = round((time.monotonic() - start_ts) * 1000, 2)
        logger.error(f"{log_prefix} Failed to fetch news for {symbol} after {duration_ms} ms: {exc}", exc_info=True)
        return None

    # If primary dynamic fetchers fail to deliver, attempt Yahoo Finance RSS fallback
    if not news_items:
        logger.warning(f"{log_prefix} Primary news fetchers returned 0 items – attempting Yahoo RSS fallback…")
        try:
            rss_items: List[NewsItem] = await _fetch_yahoo_finance_rss(symbol, client, request_id)
            if rss_items:
                logger.info(f"{log_prefix} Yahoo RSS provided {len(rss_items)} fallback articles")
                news_items = rss_items
            else:
                logger.warning(f"{log_prefix} Yahoo RSS fallback also empty – returning None")
                return None
        except Exception as rss_exc:
            logger.error(f"{log_prefix} Yahoo RSS fallback error: {rss_exc}")
            return None

# ---------------------------------------------------------------------------
# Fallback: Yahoo Finance RSS fetcher (no API key)                             
# ---------------------------------------------------------------------------

async def _fetch_yahoo_finance_rss(symbol: str, client: httpx.AsyncClient, request_id: str) -> List[NewsItem]:
    """Simple fallback to fetch RSS feed from Yahoo Finance if other sources fail."""
    feed_url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}&region=US&lang=en-US"
    log_prefix = f"[{request_id}][YahooRSS:{symbol}]"
    logger.info(f"{log_prefix} Requesting feed {feed_url}")

    try:
        resp = await client.get(feed_url, timeout=10)
        resp.raise_for_status()
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.text)
        channel = root.find('channel')
        if channel is None:
            logger.warning(f"{log_prefix} RSS feed missing channel element")
            return []
        items_el = channel.findall('item')
        news_items: List[NewsItem] = []
        for item in items_el[:20]:  # limit 20
            title = item.findtext('title') or 'Untitled'
            link = item.findtext('link')
            pub_date_str = item.findtext('pubDate')
            try:
                pub_dt = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S %Z') if pub_date_str else None
            except Exception:
                pub_dt = None
            description = item.findtext('description')

            news_items.append(NewsItem(
                title=title,
                summary=description,
                publisher='Yahoo Finance',
                published_at=pub_dt or datetime.utcnow(),
                link=link,
            ))

        logger.info(f"{log_prefix} Parsed {len(news_items)} RSS items")
        return news_items
    except Exception as e:
        logger.error(f"{log_prefix} RSS fetch/parse error: {e}")
        return []