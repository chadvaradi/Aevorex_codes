# backend/core/fetchers/eodhd.py

import time
import logging
import sys
from typing import List, Optional, Dict, Any, Union, cast, Final
from datetime import datetime, timedelta, timezone
import pandas as pd
import httpx
import asyncio
from decimal import Decimal


_eodhd_dependencies_met = False
try:
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from ..cache_service import CacheService
    from ..constants import CacheStatus

    from ._base_helpers import (
        generate_cache_key,
        make_api_request,
        get_api_key,
        FETCH_FAILURE_CACHE_TTL
    )
    from ._fetcher_constants import (
        FETCH_FAILED_MARKER,
        EODHD_BASE_URL_EOD,
        EODHD_BASE_URL_INTRADAY,
        EODHD_BASE_URL_FUNDAMENTALS
    )
    _eodhd_dependencies_met = True
except ImportError as e:
    logging.basicConfig(level="CRITICAL", stream=sys.stderr)
    critical_logger = logging.getLogger(f"{__name__}.dependency_fallback")
    critical_logger.critical(
        f"FATAL ERROR in eodhd.py: Failed to import core dependencies: {e}. Module unusable.",
        exc_info=True
    )
    _eodhd_dependencies_met = False
except Exception as general_import_err:
    logging.basicConfig(level="CRITICAL", stream=sys.stderr)
    critical_logger = logging.getLogger(f"{__name__}.general_import_fallback")
    critical_logger.critical(
        f"FATAL UNEXPECTED ERROR during import in eodhd.py: {general_import_err}.",
        exc_info=True
    )
    _eodhd_dependencies_met = False

# --- Logger Beállítása ---
if _eodhd_dependencies_met:
    try:
        EODHD_FETCHER_LOGGER = get_logger("aevorex_finbot.core.fetchers.eodhd")
        EODHD_FETCHER_LOGGER.info("--- Initializing EODHD Fetcher Module (v3.4 - Enterprise Robust) ---")
    except Exception as log_init_err:
         _eodhd_dependencies_met = False
         logging.basicConfig(level="ERROR", stream=sys.stderr)
         EODHD_FETCHER_LOGGER = logging.getLogger(f"{__name__}.logger_init_fallback")
         EODHD_FETCHER_LOGGER.error(f"Error initializing configured logger in eodhd.py: {log_init_err}", exc_info=True)
else:
    logging.basicConfig(level="ERROR", stream=sys.stderr)
    EODHD_FETCHER_LOGGER = logging.getLogger(f"{__name__}.init_error_fallback")
    EODHD_FETCHER_LOGGER.error("eodhd.py loaded with missing core dependencies. Fetcher functions will likely fail.")


# --- Cache TTL Konstansok ---
_DEFAULT_EODHD_DAILY_TTL = 86400
_DEFAULT_EODHD_INTRADAY_TTL = 3600
_DEFAULT_EODHD_SPLITS_DIVIDENDS_TTL = 86400 * 7
_DEFAULT_EODHD_NEWS_TTL = 3600 * 4
_DEFAULT_EODHD_FUNDAMENTALS_TTL = 86400 * 30

EODHD_DAILY_TTL = _DEFAULT_EODHD_DAILY_TTL
EODHD_INTRADAY_TTL = _DEFAULT_EODHD_INTRADAY_TTL
EODHD_SPLITS_DIVIDENDS_TTL = _DEFAULT_EODHD_SPLITS_DIVIDENDS_TTL
EODHD_NEWS_TTL = _DEFAULT_EODHD_NEWS_TTL
EODHD_FUNDAMENTALS_TTL = _DEFAULT_EODHD_FUNDAMENTALS_TTL
EODHD_BASE_URL_NEWS: Final[str] = "https://eodhistoricaldata.com/api/news"

if _eodhd_dependencies_met and hasattr(settings, 'CACHE'):
    try:
        if settings.CACHE is not None:
            EODHD_DAILY_TTL = getattr(settings.CACHE, 'EODHD_DAILY_OHLCV_TTL', _DEFAULT_EODHD_DAILY_TTL)
            EODHD_INTRADAY_TTL = getattr(settings.CACHE, 'EODHD_INTRADAY_OHLCV_TTL', _DEFAULT_EODHD_INTRADAY_TTL)
            EODHD_SPLITS_DIVIDENDS_TTL = getattr(settings.CACHE, 'EODHD_SPLITS_DIVIDENDS_TTL', _DEFAULT_EODHD_SPLITS_DIVIDENDS_TTL)
            EODHD_NEWS_TTL = getattr(settings.CACHE, 'EODHD_NEWS_TTL', _DEFAULT_EODHD_NEWS_TTL)
            EODHD_FUNDAMENTALS_TTL = getattr(settings.CACHE, 'EODHD_FUNDAMENTALS_TTL', _DEFAULT_EODHD_FUNDAMENTALS_TTL)
            EODHD_FETCHER_LOGGER.debug("EODHD Cache TTLs initialized (from settings or defaults).")
        else:
            EODHD_FETCHER_LOGGER.warning("settings.CACHE is None. Using default EODHD TTL values.")
    except Exception as e_ttl_settings:
        EODHD_FETCHER_LOGGER.error(f"Unexpected error loading EODHD TTLs from settings: {e_ttl_settings}. Using defaults.", exc_info=True)
elif _eodhd_dependencies_met and not hasattr(settings, 'CACHE'):
    EODHD_FETCHER_LOGGER.warning("settings.CACHE attribute not found. Using default EODHD TTL values.")
else:
    EODHD_FETCHER_LOGGER.warning("Using default EODHD TTL values due to missing core dependencies or settings.")

# --- EODHD Specifikus Konstansok ---
TARGET_OHLCV_COLS_LOWER = ['open', 'high', 'low', 'close', 'adj_close', 'volume']
TARGET_OHLCV_COLS_INTRADAY_LOWER = ['open', 'high', 'low', 'close', 'volume']
TARGET_OHLCV_COLS = ['Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
TARGET_OHLCV_COLS_INTRADAY = ['Open', 'High', 'Low', 'Close', 'Volume']

TARGET_SPLITS_COLS = ['date', 'split_ratio_str']
TARGET_DIVIDENDS_COLS = ['date', 'dividend_amount', 'currency']
TARGET_NEWS_COLS = ['published_at', 'title', 'content', 'url', 'tickers_mentioned']


# --- HTTP Client Timeout (Settingsből) ---
HTTP_TIMEOUT = 15.0 # Default
if _eodhd_dependencies_met and hasattr(settings, 'HTTP_CLIENT'):
    try:
        if settings.HTTP_CLIENT is not None:
            HTTP_TIMEOUT = settings.HTTP_CLIENT.REQUEST_TIMEOUT_SECONDS
            EODHD_FETCHER_LOGGER.debug(f"HTTP Timeout set to {HTTP_TIMEOUT} seconds from settings.")
        else:
            EODHD_FETCHER_LOGGER.warning(f"settings.HTTP_CLIENT is None. Using default HTTP Timeout: {HTTP_TIMEOUT}s.")
    except AttributeError:
        EODHD_FETCHER_LOGGER.warning(f"Could not load HTTP_CLIENT.REQUEST_TIMEOUT_SECONDS from settings. Using default: {HTTP_TIMEOUT}s.")
    except Exception as e_http_timeout_settings:
        EODHD_FETCHER_LOGGER.error(f"Unexpected error loading HTTP_TIMEOUT from settings: {e_http_timeout_settings}. Using default.", exc_info=True)
elif _eodhd_dependencies_met and not hasattr(settings, 'HTTP_CLIENT'):
    EODHD_FETCHER_LOGGER.warning("settings.HTTP_CLIENT attribute not found. Using default HTTP Timeout.")
else:
    EODHD_FETCHER_LOGGER.warning(f"Using default HTTP_TIMEOUT: {HTTP_TIMEOUT}s due to missing dependencies or settings.")


# ==============================================================================
# === Helper Function for DataFrame Reconstruction from Cache ===
# ==============================================================================
def _serialize_dataframe_for_cache(df: pd.DataFrame, log_prefix: str) -> Optional[Dict[str, Any]]:
    """
    Serializes a Pandas DataFrame into a cacheable dictionary format,
    ensuring that pd.Timestamp objects (index and columns) are converted
    to ISO 8601 strings for JSON compatibility.
    Metadata about original dtypes and timezones is preserved.
    """
    if not isinstance(df, pd.DataFrame):
        EODHD_FETCHER_LOGGER.error(f"{log_prefix} Serialization failed: Input is not a DataFrame (type: {type(df)}).")
        return None

    if df.empty:
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Input DataFrame is empty. Serializing structure for empty DataFrame.")
        # Üres DataFrame esetén is fontos a struktúra, hogy a deszerializáló tudjon vele mit kezdeni
        # Az index és az adatok üresek lesznek, de az oszlopnevek és a dtypes megmaradnak.
        df_for_dict = df.copy() # Másolaton dolgozunk, bár itt nem feltétlenül szükséges
        # Az üres df.index.name lehet None, a .name property rendben van ezzel.
        data_dict = {
            "data": { # A to_dict(orient='split') struktúráját követjük
                "index": [],
                "columns": list(df_for_dict.columns), # Oszlopnevek
                "data": []
            },
            "index_name": df_for_dict.index.name,
            "index_dtype": str(df_for_dict.index.dtype),
            "columns_names": list(df_for_dict.columns), # Duplikáltnak tűnhet, de a deszerializáló ezt várhatja
            "columns_dtypes": {str(col): str(df_for_dict[col].dtype) for col in df_for_dict.columns}
        }
        if isinstance(df_for_dict.index, pd.DatetimeIndex) and df_for_dict.index.tz is not None:
            data_dict["index_timezone"] = str(df_for_dict.index.tz)
        # Üres DF esetén a datetime_cols_tz üres lesz
        return data_dict

    EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Starting DataFrame serialization. Original shape: {df.shape}")
    try:
        df_copy = df.copy() # Mindig másolaton dolgozzunk a módosítások előtt

        # --- Metaadatok gyűjtése az eredeti DataFrame-ről ---
        original_index_name = df_copy.index.name
        original_index_dtype_str = str(df_copy.index.dtype)
        original_index_timezone_str: Optional[str] = None
        if isinstance(df_copy.index, pd.DatetimeIndex) and df_copy.index.tz is not None:
            original_index_timezone_str = str(df_copy.index.tz)

        original_columns_names = list(df_copy.columns) # Eredeti oszlopnevek sorrendben
        original_columns_dtypes_map = {str(col): str(df_copy[col].dtype) for col in df_copy.columns}
        
        original_columns_timezones_map: Dict[str, str] = {}
        for col in df_copy.columns:
            if pd.api.types.is_datetime64_any_dtype(df_copy[col]) and getattr(df_copy[col].dt, 'tz', None) is not None:
                original_columns_timezones_map[str(col)] = str(df_copy[col].dt.tz)

        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Original index dtype: {original_index_dtype_str}, tz: {original_index_timezone_str}")
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Original column dtypes: {original_columns_dtypes_map}")
        if original_columns_timezones_map:
             EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Original column timezones: {original_columns_timezones_map}")

        # --- Index konverziója stringgé, ha DatetimeIndex ---
        if isinstance(df_copy.index, pd.DatetimeIndex):
            EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Index is DatetimeIndex. Converting to ISO 8601 strings.")
            # A NaT értékeket a list comprehension kezeli, None lesz belőlük az isoformat() előtt
            df_copy.index = [timestamp.isoformat() if pd.notna(timestamp) else None for timestamp in df_copy.index]
            # Az index neve megmarad, mivel csak az értékeket cseréltük
            df_copy.index.name = original_index_name
        
        # --- Dátum oszlopok konverziója stringgé ---
        for col_name in df_copy.columns:
            if pd.api.types.is_datetime64_any_dtype(df_copy[col_name]):
                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Column '{col_name}' is datetime type. Converting to ISO 8601 strings.")
                # Alkalmazzuk a konverziót
                converted_series = df_copy[col_name].apply(lambda dt: dt.isoformat() if pd.notna(dt) else None)
                # ==> ÚJ SOR: Explicit object dtype beállítása <==
                df_copy[col_name] = converted_series.astype(object)
            # Egyéb speciális típusok (pl. pd.Period) kezelése itt adható hozzá, ha szükséges

        # --- DataFrame átalakítása 'split' orientációjú dictionary-vé ---
        # Most már object dtype oszlopokkal hívjuk a to_dict-et
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Converting DataFrame to dictionary (orient='split'). Processed DF head:\n{df_copy.head().to_string()}")
        data_payload = df_copy.to_dict(orient='split')

        # --- Végső dictionary összeállítása a metaadatokkal ---
        serialized_dict = {
            "data": data_payload, # Ez tartalmazza: "index", "columns", "data"
            "index_name": original_index_name,
            "index_dtype": original_index_dtype_str, # Eredeti dtype-ot tároljuk
            "columns_names": original_columns_names, # Eredeti oszlopneveket
            "columns_dtypes": original_columns_dtypes_map # Eredeti oszlop dtype-okat
        }

        if original_index_timezone_str:
            serialized_dict["index_timezone"] = original_index_timezone_str
        if original_columns_timezones_map:
            serialized_dict["columns_timezones"] = original_columns_timezones_map
        
        EODHD_FETCHER_LOGGER.info(f"{log_prefix} DataFrame successfully serialized for cache.")
        return serialized_dict

    except Exception as e:
        EODHD_FETCHER_LOGGER.error(f"{log_prefix} DataFrame serialization error: {e}", exc_info=True)
        # Logoljuk a DataFrame első néhány sorát hiba esetén a diagnosztikához
        try:
            EODHD_FETCHER_LOGGER.debug(f"{log_prefix} DataFrame state at error (first 5 rows):\n{df.head().to_string() if df is not None and not df.empty else 'DataFrame is None or empty'}")
        except Exception as e_log_df:
            EODHD_FETCHER_LOGGER.error(f"{log_prefix} Could not log DataFrame head on error: {e_log_df}")
        return None

# A _deserialize_dataframe_from_cache függvény maradjon változatlan egyelőre,
# mivel az a stringként kapott index/oszlop értékeket már próbálja pd.to_datetime-mal
# visszaalakítani, és a tárolt dtype és timezone információkat felhasználja.
# A fenti szerializálóval együtt tesztelve kiderül, hogy szükség van-e ott finomításra.

def _deserialize_dataframe_from_cache(
    data_dict: Dict[str, Any], 
    log_prefix: str,
    index_is_datetime: bool = False, # Ez a "hint" most kevésbé lesz fontos, mert a "index_dtype" pontosabb
) -> Optional[pd.DataFrame]:
    # ====> HELYESÍTETT ELLENŐRZÉS <====
    if not isinstance(data_dict, dict) or "data" not in data_dict or \
       not isinstance(data_dict["data"], dict) or \
       "index" not in data_dict["data"] or \
       "columns" not in data_dict["data"] or \
       "data" not in data_dict["data"]:
        EODHD_FETCHER_LOGGER.error(f"{log_prefix} Deserialization failed: Input is not a valid data_dict or 'data' key has incorrect structure.")
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Received data_dict keys: {list(data_dict.keys()) if isinstance(data_dict, dict) else 'Not a dict'}")
        if isinstance(data_dict, dict) and "data" in data_dict and isinstance(data_dict["data"], dict):
             EODHD_FETCHER_LOGGER.debug(f"{log_prefix} data_dict['data'] keys: {list(data_dict['data'].keys())}")
        return None
    # ====> ELLENŐRZÉS VÉGE <====

    
    EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Starting DataFrame deserialization from cache.")
    try:
        # DataFrame rekonstrukciója a 'split' orientációból
        # A 'columns' a data_dict["data"]["columns"]-ban van a szerializáló szerint
        df = pd.DataFrame(
            data=data_dict["data"]["data"],
            index=pd.Index(data_dict["data"]["index"]), # Explicit pd.Index létrehozás
            columns=data_dict["data"]["columns"]
        )
        
        # Index nevének visszaállítása
        df.index.name = data_dict.get("index_name")
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Initial DataFrame created. Shape: {df.shape}, Index name: '{df.index.name}'.")

        # Index típusának és időzónájának visszaállítása
        stored_index_dtype = data_dict.get("index_dtype", "").lower()
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Stored index_dtype: '{stored_index_dtype}'. Current index dtype: {df.index.dtype}.")

        if "datetime" in stored_index_dtype:
            EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to convert index to DatetimeIndex.")
            try:
                # A pd.to_datetime megpróbálja kitalálni a formátumot, ami az ISO 8601-gyel jól működik
                # A None értékek (eredetileg NaT) NaT-ként lesznek visszaállítva.
                df.index = pd.to_datetime(df.index, errors='coerce') 
                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Index converted to DatetimeIndex. New dtype: {df.index.dtype}.")

                if isinstance(df.index, pd.DatetimeIndex): # Sikeres konverzió után
                    stored_index_tz_str = data_dict.get("index_timezone")
                    if stored_index_tz_str:
                        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to apply stored index timezone: '{stored_index_tz_str}'. Current tz: {df.index.tz}")
                        try:
                            if df.index.tz is None:
                                df.index = df.index.tz_localize(stored_index_tz_str)
                                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Index localized to '{stored_index_tz_str}'.")
                            elif str(df.index.tz) != stored_index_tz_str:
                                df.index = df.index.tz_convert(stored_index_tz_str)
                                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Index converted to timezone '{stored_index_tz_str}'.")
                            else:
                                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Index already has correct timezone '{stored_index_tz_str}'.")
                        except Exception as e_tz_idx:
                            EODHD_FETCHER_LOGGER.warning(f"{log_prefix} Index timezone localization/conversion to '{stored_index_tz_str}' failed: {e_tz_idx}", exc_info=False)
            except Exception as e_idx_conv:
                EODHD_FETCHER_LOGGER.warning(f"{log_prefix} Failed to convert index to DatetimeIndex (original type was {stored_index_dtype}): {e_idx_conv}", exc_info=False)
        
        # Oszlopok típusainak és időzónáinak visszaállítása
        stored_col_dtypes = data_dict.get("columns_dtypes", {})
        stored_col_timezones = data_dict.get("columns_timezones", {})
        EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Stored column_dtypes: {stored_col_dtypes}")
        if stored_col_timezones: EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Stored column_timezones: {stored_col_timezones}")

        for col_name_str, dtype_str_stored in stored_col_dtypes.items():
            # A DataFrame oszlopnevei már a helyesek kell legyenek a pd.DataFrame konstrukció után
            if col_name_str in df.columns:
                col_log_prefix = f"{log_prefix}[Col:'{col_name_str}']"
                try:
                    if "datetime" in dtype_str_stored.lower():
                        EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting to datetime. Current dtype: {df[col_name_str].dtype}.")
                        # A pd.to_datetime az ISO stringeket és a None-okat (NaT) helyesen kezeli
                        df[col_name_str] = pd.to_datetime(df[col_name_str], errors='coerce')
                        EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Converted to datetime. New dtype: {df[col_name_str].dtype}.")
                        
                        if col_name_str in stored_col_timezones and isinstance(df[col_name_str].dtype, pd.DatetimeTZDtype) == False and not df[col_name_str].empty:
                            # Csak akkor próbálkozzunk időzóna beállítással, ha az oszlopnak van valós dátumértéke
                            # és még nincs időzónája (vagy ha a pd.to_datetime nem tette tz-aware-re)
                            col_tz_str_stored = stored_col_timezones[col_name_str]
                            EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Applying stored column timezone: '{col_tz_str_stored}'. Current tz: {getattr(df[col_name_str].dt, 'tz', None)}")
                            try:
                                if getattr(df[col_name_str].dt, 'tz', None) is None:
                                    df[col_name_str] = df[col_name_str].dt.tz_localize(col_tz_str_stored)
                                    EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Column localized to '{col_tz_str_stored}'.")
                                elif str(df[col_name_str].dt.tz) != col_tz_str_stored:
                                    df[col_name_str] = df[col_name_str].dt.tz_convert(col_tz_str_stored)
                                    EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Column converted to timezone '{col_tz_str_stored}'.")
                            except Exception as e_col_tz:
                                EODHD_FETCHER_LOGGER.warning(f"{col_log_prefix} Column tz localization/conversion to '{col_tz_str_stored}' failed: {e_col_tz}", exc_info=False)
                    
                    elif "int" in dtype_str_stored.lower():
                         # Használjuk a pd.Int64Dtype() típust, hogy a NaN értékeket is kezelni tudja integer oszlopokban
                         EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting to Int64. Current type: {df[col_name_str].dtype}")
                         df[col_name_str] = pd.to_numeric(df[col_name_str], errors='coerce').astype(pd.Int64Dtype())
                    elif "float" in dtype_str_stored.lower():
                         EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting to float. Current type: {df[col_name_str].dtype}")
                         df[col_name_str] = pd.to_numeric(df[col_name_str], errors='coerce').astype(float)
                    elif "bool" in dtype_str_stored.lower():
                         EODHD_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting to boolean. Current type: {df[col_name_str].dtype}")
                         # Óvatos konverzió bool-ra, figyelembe véve a stringeket és None-okat
                         df[col_name_str] = df[col_name_str].map({'true': True, 'false': False, True: True, False: False, 1: True, 0: False, '1': True, '0': False, 'yes': True, 'no': False}).astype(pd.BooleanDtype())
                    # Egyéb típuskonverziók (pl. category) itt adhatók hozzá, ha szükséges
                except Exception as e_dtype_conv:
                    EODHD_FETCHER_LOGGER.warning(f"{col_log_prefix} Error converting column to stored dtype '{dtype_str_stored}': {e_dtype_conv}", exc_info=False)
            # else:
                # EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Column '{col_name_str}' from stored_col_dtypes not found in current DataFrame columns. Skipping type conversion.")
        
        EODHD_FETCHER_LOGGER.info(f"{log_prefix} DataFrame successfully deserialized from cache. Final shape: {df.shape}")
        return df
    except KeyError as ke: # Ha a data_dict['data']-ból hiányzik pl. 'index' vagy 'columns'
        EODHD_FETCHER_LOGGER.error(f"{log_prefix} DataFrame deserialization KeyError: Missing key '{ke}' in cached data structure.", exc_info=True)
        return None
    except Exception as e_deserialize:
        EODHD_FETCHER_LOGGER.error(f"{log_prefix} DataFrame deserialization error: {e_deserialize}", exc_info=True)
        try:
            EODHD_FETCHER_LOGGER.debug(f"{log_prefix} Data_dict at error (partial keys): index_name={data_dict.get('index_name')}, index_dtype={data_dict.get('index_dtype')}, columns_names={data_dict.get('columns_names')}")
            if "data" in data_dict and isinstance(data_dict["data"], dict):
                EODHD_FETCHER_LOGGER.debug(f"{log_prefix} data_dict['data'] keys: {list(data_dict['data'].keys())}, data_dict['data']['columns']: {data_dict['data'].get('columns')}")
        except Exception as e_log_dd:
            EODHD_FETCHER_LOGGER.error(f"{log_prefix} Could not log data_dict details on error: {e_log_dd}")
        return None
# ==============================================================================
# === EODHD OHLCV Fetcher Function ===
# ==============================================================================
async def fetch_eodhd_ohlcv(
    symbol_with_exchange: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    interval: str = "d",
    period_or_start_date: str = "1y",
    force_refresh: bool = False
) -> Optional[pd.DataFrame]:

    final_processed_df: Optional[pd.DataFrame] = None
    live_fetch_attempted: bool = False
    cache_hit_status_enum: CacheStatus = CacheStatus.MISS
    logger = EODHD_FETCHER_LOGGER # Use module-level logger
    log_prefix = f"[{symbol_with_exchange}][OHLCV({interval},{period_or_start_date})]"
    
    if not _eodhd_dependencies_met:
        logger.error(f"{log_prefix} Core dependencies not met. Aborting.")
        return None

    logger.debug(f"{log_prefix} === Starting fetch (force_refresh={force_refresh}) ===")
    
    api_key: Optional[str] = None
    cache_key: Optional[str] = None
    cache_ttl: int = EODHD_DAILY_TTL 
    data_type_for_cache: str = ""
    base_url: str = ""
    api_params: Dict[str, Any] = {}
    
    try:
        api_key = await get_api_key("EODHD") 
        if not api_key:
            logger.error(f"{log_prefix} API key for EODHD NOT FOUND. Cannot proceed.")
            return None 
        
        is_daily_or_longer = interval.lower() in ['d', 'w', 'm']
        api_params = {"api_token": api_key, "fmt": "json"}
        cache_key_params: Dict[str, str] = {"interval": interval.lower()} # Add interval to params

        if is_daily_or_longer:
            base_url = f"{EODHD_BASE_URL_EOD}/{symbol_with_exchange}"
            api_params["period"] = interval.lower()
            data_type_for_cache = f"ohlcv_daily_like" # Simplified for daily/weekly/monthly
            cache_ttl = EODHD_DAILY_TTL
            
            end_date_dt = datetime.now(timezone.utc)
            start_date_str: Optional[str] = None
            request_range_norm = period_or_start_date.lower()
            cache_key_params["range_request"] = request_range_norm

            if request_range_norm == "max": start_date_str = "1900-01-01"
            elif request_range_norm.endswith('y'):
                try: years = int(request_range_norm[:-1]); start_date_dt = end_date_dt - timedelta(days=int(years * 365.25))
                except ValueError: years = 1; logger.warning(f"{log_prefix} Invalid year format '{request_range_norm}', using {years}y."); start_date_dt = end_date_dt - timedelta(days=int(years * 365.25))
                start_date_str = start_date_dt.strftime('%Y-%m-%d')
            elif request_range_norm.endswith('m') and not request_range_norm == "m": # Avoid conflict with 'm' interval
                try: months = int(request_range_norm[:-1]); start_date_dt = end_date_dt - timedelta(days=int(months * 30.4375))
                except ValueError: months = 3; logger.warning(f"{log_prefix} Invalid month format '{request_range_norm}', using {months}m."); start_date_dt = end_date_dt - timedelta(days=int(months * 30.4375))
                start_date_str = start_date_dt.strftime('%Y-%m-%d')
            elif request_range_norm == "ytd": start_date_str = datetime(end_date_dt.year, 1, 1, tzinfo=timezone.utc).strftime('%Y-%m-%d')
            else:
                try: datetime.strptime(request_range_norm, '%Y-%m-%d'); start_date_str = request_range_norm
                except ValueError: start_date_dt = end_date_dt - timedelta(days=365); start_date_str = start_date_dt.strftime('%Y-%m-%d'); logger.warning(f"{log_prefix} Invalid date format '{request_range_norm}', using 1 year ago: {start_date_str}."); cache_key_params["range_request"] = "1y_fallback"
            
            if start_date_str: api_params["from"] = start_date_str; cache_key_params["from_date_resolved"] = start_date_str
            # `to` for daily is implicit (latest) or can be added if needed
        
        else: # Intraday
            if not any(char.isdigit() for char in interval) or not any(char.isalpha() for char in interval): 
                logger.error(f"{log_prefix} Invalid intraday interval: '{interval}'. Must contain number and unit (e.g., 5m, 1h)."); return None
            base_url = f"{EODHD_BASE_URL_INTRADAY}/{symbol_with_exchange}"
            api_params["interval"] = interval # e.g., "5m", "1h"
            data_type_for_cache = f"ohlcv_intraday" # Simplified
            cache_ttl = EODHD_INTRADAY_TTL
            
            to_timestamp = int(datetime.now(timezone.utc).timestamp())
            api_params["to"] = to_timestamp
            cache_key_params["to_ts_resolved"] = str(to_timestamp)
            
            from_timestamp: Optional[int] = None
            request_range_intraday = period_or_start_date.lower()
            cache_key_params["range_request_intraday"] = request_range_intraday
            try:
                if request_range_intraday.endswith('d'): days = int(request_range_intraday[:-1]); from_datetime = datetime.now(timezone.utc) - timedelta(days=days)
                elif request_range_intraday.endswith('w'): weeks = int(request_range_intraday[:-1]); from_datetime = datetime.now(timezone.utc) - timedelta(weeks=weeks)
                elif request_range_intraday.endswith('h'): hours = int(request_range_intraday[:-1]); from_datetime = datetime.now(timezone.utc) - timedelta(hours=hours)
                else: # Assume YYYY-MM-DD if not a relative period
                    from_datetime = datetime.strptime(request_range_intraday, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                    from_datetime = from_datetime.replace(hour=0, minute=0, second=0, microsecond=0) # Start of day
                from_timestamp = int(from_datetime.timestamp())
            except ValueError: 
                logger.info(f"{log_prefix} Could not parse '{period_or_start_date}' for intraday. EODHD API will use its default recent range."); 
                cache_key_params["range_request_intraday"] = "api_default_recent"
            
            if from_timestamp: api_params["from"] = from_timestamp; cache_key_params["from_ts_resolved"] = str(from_timestamp)

        cache_key = generate_cache_key(data_type=data_type_for_cache, source="eodhd", identifier=symbol_with_exchange, params=cache_key_params)
        logger.info(f"{log_prefix} Successfully generated cache key: {cache_key}")
    
    except Exception as e_init_params:
        logger.critical(f"{log_prefix} CRITICAL ERROR during API/Cache param setup: {e_init_params}", exc_info=True)
        return None 

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_item = await cache.get(cache_key)
            if cached_item is not None:
                if cached_item == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT: Failure marker found. Returning None.")
                    cache_hit_status_enum = CacheStatus.HIT_FAILED
                    return None # Explicitly return, no further processing
                else: 
                    reconstructed_df = _deserialize_dataframe_from_cache(cached_item, f"{log_prefix}[CacheRec]", index_is_datetime=True)
                    if reconstructed_df is not None:
                        logger.info(f"{log_prefix} Cache HIT: DataFrame successfully reconstructed. Shape: {reconstructed_df.shape}")
                        cache_hit_status_enum = CacheStatus.HIT_VALID
                        final_processed_df = reconstructed_df 
                        # Fall through to final return, skipping live fetch and cache write
                    else: 
                        logger.warning(f"{log_prefix} Cache HIT: Invalid data structure. Deleting and treating as MISS.")
                        await cache.delete(cache_key)
                        cache_hit_status_enum = CacheStatus.HIT_INVALID 
            else: # cached_item is None
                cache_hit_status_enum = CacheStatus.MISS
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} ERROR during cache.get: {e_cache_get}", exc_info=True)
            cache_hit_status_enum = CacheStatus.ERROR 
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")
        cache_hit_status_enum = CacheStatus.MISS # Treat as MISS to trigger live fetch

    # --- Live Data Fetch (if needed) ---
    if final_processed_df is None and cache_hit_status_enum not in [CacheStatus.HIT_VALID, CacheStatus.HIT_FAILED]:
        logger.info(f"{log_prefix} Cache status: {cache_hit_status_enum.name}. Attempting LIVE data fetch...")
        live_fetch_attempted = True
        
        raw_response_json: Optional[Union[List, Dict]] = None
        fetch_succeeded_for_cache_write = False

        try:
            params_for_log = api_params.copy()
            if 'api_token' in params_for_log: params_for_log['api_token'] = "***MASKED***"
            logger.info(f"{log_prefix} EODHD API Request: URL='{base_url}', Params={params_for_log}")

            raw_response_json = await make_api_request(
                client=client, method="GET", url=base_url, params=api_params,
                cache_service=cache, 
                cache_key_for_failure=cache_key, # make_api_request handles caching failure marker
                source_name_for_log=f"eodhd_{data_type_for_cache} for {symbol_with_exchange}"
            )

            if raw_response_json is None:
                logger.error(f"{log_prefix} Live fetch: API request failed (make_api_request returned None, failure marker should be cached).")
                # final_processed_df remains None
            elif not isinstance(raw_response_json, list): 
                logger.error(f"{log_prefix} Live fetch: Invalid API response format. Expected list, got {type(raw_response_json)}. Response: {str(raw_response_json)[:200]}")
                # final_processed_df remains None; explicitly cache failure if make_api_request didn't
                if cache and cache_key:
                    # Check if make_api_request already cached it (it should have if it returned None)
                    # This is a safeguard if make_api_request had an issue but didn't return None AND didn't cache.
                    # However, current make_api_request logic should handle this.
                    # For robustness, we can ensure it here if response is bad but not None.
                    logger.warning(f"{log_prefix} Caching failure marker due to unexpected response format after live fetch.")
                    await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            else: 
                logger.debug(f"{log_prefix} Live fetch: Received {len(raw_response_json)} records from API. Processing...")
                df_from_api = pd.DataFrame(raw_response_json)
                
                if df_from_api.empty:
                    logger.info(f"{log_prefix} Live fetch: API returned empty list. Creating empty DataFrame with standard schema.")
                    target_cols_for_empty = TARGET_OHLCV_COLS if is_daily_or_longer else TARGET_OHLCV_COLS_INTRADAY
                    processed_df_temp = pd.DataFrame(columns=target_cols_for_empty)
                    empty_idx = pd.to_datetime([])
                    if not is_daily_or_longer: empty_idx = empty_idx.tz_localize('UTC') # Intraday is UTC
                    processed_df_temp.index = empty_idx
                    processed_df_temp.index.name = 'Date'
                    final_processed_df = processed_df_temp
                    fetch_succeeded_for_cache_write = True # Empty DF is a valid result to cache
                else: 
                    datetime_col_src: str
                    target_cols_map_lower: List[str]
                    required_src_cols_map: Dict[str, str]
                    
                    is_daily_like_for_proc = interval.lower() in ['d', 'w', 'm']

                    if is_daily_like_for_proc:
                        datetime_col_src = 'date'
                        required_src_cols_map = {'date': 'date', 'open': 'open', 'high': 'high', 'low': 'low', 'close': 'close', 'adjusted_close': 'adj_close', 'volume': 'volume'}
                        target_cols_map_lower = TARGET_OHLCV_COLS_LOWER
                        if 'adjusted_close' not in df_from_api.columns and 'close' in df_from_api.columns:
                            df_from_api['adjusted_close'] = df_from_api['close']
                            logger.debug(f"{log_prefix} 'adjusted_close' not in API response, using 'close' as fallback.")
                    else: # Intraday
                        datetime_col_src = 'timestamp' if 'timestamp' in df_from_api.columns else ('datetime' if 'datetime' in df_from_api.columns else '')
                        if not datetime_col_src: 
                            raise ValueError(f"{log_prefix} Intraday response missing 'timestamp' or 'datetime' column. Columns: {list(df_from_api.columns)}")
                        required_src_cols_map = {datetime_col_src: 'datetime_temp', 'gmtoffset':'gmtoffset', 'open': 'open', 'high': 'high', 'low': 'low', 'close': 'close', 'volume': 'volume'}
                        target_cols_map_lower = TARGET_OHLCV_COLS_INTRADAY_LOWER

                    missing_src_api_cols = [api_col for api_col in required_src_cols_map.keys() if api_col not in df_from_api.columns and api_col != 'gmtoffset'] # gmtoffset is optional
                    if missing_src_api_cols:
                        raise ValueError(f"{log_prefix} Missing critical source columns from API: {missing_src_api_cols}. Available: {list(df_from_api.columns)}")

                    df_renamed = df_from_api.rename(columns=required_src_cols_map)

                    if is_daily_like_for_proc:
                        df_renamed['datetime_index'] = pd.to_datetime(df_renamed['date'], errors='coerce')
                    else: # Intraday - timestamp is UTC seconds
                        df_renamed['datetime_index'] = pd.to_datetime(df_renamed['datetime_temp'], unit='s', utc=True, errors='coerce')
                    
                    df_renamed.dropna(subset=['datetime_index'], inplace=True)
                    df_renamed = df_renamed.set_index('datetime_index')
                    df_renamed.index.name = 'Date'
                    
                    actual_cols_present_lower = [std_col for std_col in target_cols_map_lower if std_col in df_renamed.columns]
                    df_processed_lower = df_renamed[actual_cols_present_lower].copy()

                    for col_name_lower in df_processed_lower.columns:
                        if col_name_lower == 'volume': 
                            df_processed_lower[col_name_lower] = pd.to_numeric(df_processed_lower[col_name_lower], errors='coerce').fillna(0).astype(int)
                        elif col_name_lower in ['open', 'high', 'low', 'close', 'adj_close']: 
                            df_processed_lower[col_name_lower] = pd.to_numeric(df_processed_lower[col_name_lower], errors='coerce')
                    
                    df_processed_lower = df_processed_lower.sort_index()
                    
                    final_rename_map_upper = {'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'adj_close': 'Adj Close', 'volume': 'Volume'}
                    processed_df_temp = df_processed_lower.rename(columns={k_lower: v_upper for k_lower,v_upper in final_rename_map_upper.items() if k_lower in df_processed_lower.columns})
                    
                    final_target_cols_title = TARGET_OHLCV_COLS if is_daily_like_for_proc else TARGET_OHLCV_COLS_INTRADAY
                    for col_title in final_target_cols_title:
                        if col_title not in processed_df_temp.columns:
                            logger.warning(f"{log_prefix} Target column '{col_title}' missing after processing. Adding as NA.")
                            processed_df_temp[col_title] = pd.NA 
                    
                    final_processed_df = processed_df_temp[final_target_cols_title].copy() 
                    if final_processed_df.isnull().values.any(): logger.warning(f"{log_prefix} Final DataFrame contains NaN/NA values.")
                    logger.info(f"{log_prefix} Live fetch: Data processing SUCCEEDED. Final Shape: {final_processed_df.shape}.")
                    fetch_succeeded_for_cache_write = True

        except Exception as e_fetch_or_proc:
            logger.error(f"{log_prefix} Live fetch or processing FAILED: {e_fetch_or_proc}. Raw data sample: {str(raw_response_json)[:300] if raw_response_json else 'N/A'}", exc_info=True)
            final_processed_df = None # Ensure None on error
            fetch_succeeded_for_cache_write = False
            # No need to cache failure marker here if make_api_request handled it or if error is post-API call
            # Cache write block below will handle it based on fetch_succeeded_for_cache_write

    # --- Cache Write (if live fetch was attempted) ---
    if live_fetch_attempted and cache and cache_key:
        if fetch_succeeded_for_cache_write and final_processed_df is not None:
            log_msg_suffix = "empty DataFrame" if final_processed_df.empty else f"DataFrame with shape {final_processed_df.shape}"
            logger.info(f"{log_prefix} Live fetch resulted in a {log_msg_suffix}. Caching this result...")
            try:
                serialized_data = _serialize_dataframe_for_cache(final_processed_df, log_prefix)
                if serialized_data:
                    await cache.set(cache_key, serialized_data, timeout_seconds=cache_ttl)
                    logger.info(f"{log_prefix} Cache SET successful for {log_msg_suffix}.")
                else:
                    logger.error(f"{log_prefix} Failed to serialize DataFrame for cache. Not caching valid data.")
            except Exception as e_cache_set:
                logger.error(f"{log_prefix} Cache SET FAILED for live data. Error: {e_cache_set}", exc_info=True)
        elif not fetch_succeeded_for_cache_write: # Live fetch attempted but failed or resulted in None
            # This implies an error occurred during fetch/processing, or make_api_request returned None
            # If make_api_request already cached FETCH_FAILED_MARKER, this might be redundant but harmless.
            # If the error was *after* make_api_request (e.g., in processing), this is crucial.
            logger.info(f"{log_prefix} Live fetch was unsuccessful or processing failed. Ensuring failure marker is cached.")
            await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            final_processed_df = None # Ensure consistency
            
    # --- Final Return ---
    final_return_type = type(final_processed_df).__name__
    final_shape_cols = f"Shape: {final_processed_df.shape}, Columns: {list(final_processed_df.columns)}" if final_processed_df is not None else "Result is None"
    logger.info(f"{log_prefix} === Finished. Returning: {final_return_type}, {final_shape_cols}. Cache: {cache_hit_status_enum.name}, LiveFetch: {live_fetch_attempted} ===")
    return final_processed_df


# ==============================================================================
# === EODHD Splits & Dividends Fetcher Function ===
# ==============================================================================
async def fetch_eodhd_splits_and_dividends(
    symbol_with_exchange: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    start_date_str: Optional[str] = None,
    force_refresh: bool = False
) -> Optional[Dict[str, pd.DataFrame]]:

    processed_result: Optional[Dict[str, pd.DataFrame]] = None
    live_fetch_attempted: bool = False
    cache_hit_status_enum: CacheStatus = CacheStatus.MISS
    logger = EODHD_FETCHER_LOGGER
    log_prefix = f"[{symbol_with_exchange}][SplitsDivs(from={start_date_str or 'all'})]"

    if not _eodhd_dependencies_met:
        logger.error(f"{log_prefix} Core dependencies not met. Aborting.")
        return None

    logger.debug(f"{log_prefix} === Starting fetch (force_refresh={force_refresh}) ===")

    api_key: Optional[str] = None
    cache_key: Optional[str] = None
    cache_ttl: int = EODHD_SPLITS_DIVIDENDS_TTL
    source_name = "eodhd"
    data_type = "splits_dividends"

    try:
        api_key = await get_api_key("EODHD")
        if not api_key:
            logger.error(f"{log_prefix} API key for EODHD NOT FOUND. Cannot proceed.")
            return None

        cache_key_params = {"from": start_date_str if start_date_str else "all_available"}
        cache_key = generate_cache_key(data_type=data_type, source=source_name, identifier=symbol_with_exchange, params=cache_key_params)
        logger.info(f"{log_prefix} Generated cache key: {cache_key}")

    except Exception as e_init_params:
        logger.critical(f"{log_prefix} CRITICAL ERROR during API/Cache param setup: {e_init_params}", exc_info=True)
        return None

    # --- Cache Check ---
    if not force_refresh and cache and cache_key:
        try:
            cached_item = await cache.get(cache_key)
            if cached_item is not None:
                if cached_item == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT: Failure marker found. Returning None.")
                    cache_hit_status_enum = CacheStatus.HIT_FAILED
                    return None
                elif isinstance(cached_item, dict) and 'splits' in cached_item and 'dividends' in cached_item:
                    logger.debug(f"{log_prefix} Cache HIT: Data dict found. Reconstructing DataFrames...")
                    splits_df_c = _deserialize_dataframe_from_cache(cached_item['splits'], f"{log_prefix}[SplitsCacheRec]", index_is_datetime=True)
                    divs_df_c = _deserialize_dataframe_from_cache(cached_item['dividends'], f"{log_prefix}[DividendsCacheRec]", index_is_datetime=True)

                    if splits_df_c is not None and divs_df_c is not None:
                        processed_result = {"splits": splits_df_c, "dividends": divs_df_c}
                        cache_hit_status_enum = CacheStatus.HIT_VALID
                        # Fall through to final return
                    else:
                        logger.warning(f"{log_prefix} Cache HIT: Reconstruction failed for one/both DFs. Deleting, treating as MISS.")
                        await cache.delete(cache_key)
                        cache_hit_status_enum = CacheStatus.HIT_INVALID
                else:
                    logger.warning(f"{log_prefix} Cache HIT: Invalid data structure. Deleting, treating as MISS.")
                    await cache.delete(cache_key)
                    cache_hit_status_enum = CacheStatus.HIT_INVALID
            else: # cached_item is None
                cache_hit_status_enum = CacheStatus.MISS
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} ERROR during cache.get: {e_cache_get}", exc_info=True)
            cache_hit_status_enum = CacheStatus.ERROR
    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")
        cache_hit_status_enum = CacheStatus.MISS

    # --- Live Data Fetch (if needed) ---
    if processed_result is None and cache_hit_status_enum not in [CacheStatus.HIT_VALID, CacheStatus.HIT_FAILED]:
        logger.info(f"{log_prefix} Cache status: {cache_hit_status_enum.name}. Attempting LIVE data fetch...")
        live_fetch_attempted = True
        
        fetch_succeeded_for_cache_write = False
        dividends_raw: Optional[List] = None
        splits_raw: Optional[List] = None

        try:
            common_params = {"api_token": api_key, "fmt": "json"}
            if start_date_str: common_params["from"] = start_date_str
            
            params_for_log = common_params.copy()
            if 'api_token' in params_for_log: params_for_log['api_token'] = "***MASKED***"

            # Dividends Fetch
            dividends_url = f"{EODHD_BASE_URL_FUNDAMENTALS}/{symbol_with_exchange}/div"
            logger.info(f"{log_prefix} EODHD Dividends API Request: URL='{dividends_url}', Params={params_for_log}")
            api_response_dividends = await make_api_request(
                client=client, method="GET", url=dividends_url, params=common_params,
                cache_service=cache, cache_key_for_failure=cache_key, # Failure on this sub-request marks the main key
                source_name_for_log=f"{source_name}_dividends for {symbol_with_exchange}"
            )

            if api_response_dividends is None:
                logger.error(f"{log_prefix} Live fetch: Dividends API request failed (marker should be cached).")
                # processed_result remains None, fetch_succeeded_for_cache_write remains False
            elif not isinstance(api_response_dividends, list):
                logger.error(f"{log_prefix} Live fetch: Invalid Dividends API response format: {type(api_response_dividends)}. Data: {str(api_response_dividends)[:200]}")
                if cache and cache_key: await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            else:
                dividends_raw = api_response_dividends
                logger.info(f"{log_prefix} Dividends API call successful, received {len(dividends_raw)} items.")

                # Splits Fetch (only if dividends were successful or at least didn't cause immediate failure marker)
                splits_url = f"{EODHD_BASE_URL_FUNDAMENTALS}/{symbol_with_exchange}/splits"
                logger.info(f"{log_prefix} EODHD Splits API Request: URL='{splits_url}', Params={params_for_log}")
                api_response_splits = await make_api_request(
                    client=client, method="GET", url=splits_url, params=common_params,
                    cache_service=cache, cache_key_for_failure=cache_key,
                    source_name_for_log=f"{source_name}_splits for {symbol_with_exchange}"
                )

                if api_response_splits is None:
                    logger.error(f"{log_prefix} Live fetch: Splits API request failed (marker should be cached).")
                elif not isinstance(api_response_splits, list):
                    logger.error(f"{log_prefix} Live fetch: Invalid Splits API response format: {type(api_response_splits)}. Data: {str(api_response_splits)[:200]}")
                    if cache and cache_key: await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                else:
                    splits_raw = api_response_splits
                    logger.info(f"{log_prefix} Splits API call successful, received {len(splits_raw)} items.")
                    
                    # Both API calls (or at least their attempts) are done. Now process.
                    # Dividends processing
                    dividends_df = pd.DataFrame(dividends_raw if dividends_raw is not None else [])
                    if not dividends_df.empty:
                        if not all(c in dividends_df.columns for c in ['date', 'value']): 
                            raise ValueError(f"{log_prefix} Dividends missing 'date' or 'value'. Cols: {dividends_df.columns}")
                        dividends_df = dividends_df.rename(columns={'value': 'dividend_amount', 'date': 'temp_date'}) # Avoid EODHD 'Date' vs our 'date'
                        dividends_df['date'] = pd.to_datetime(dividends_df['temp_date'], errors='coerce')
                        if 'currency' not in dividends_df.columns: dividends_df['currency'] = 'N/A'
                        dividends_df['dividend_amount'] = pd.to_numeric(dividends_df['dividend_amount'], errors='coerce')
                        dividends_df.dropna(subset=['date', 'dividend_amount'], inplace=True)
                        dividends_df = dividends_df.set_index('date').sort_index()
                        # Ensure correct columns using TARGET_DIVIDENDS_COLS
                        final_div_cols = [col for col in TARGET_DIVIDENDS_COLS if col != 'date'] # date is index
                        dividends_df = dividends_df.reindex(columns=final_div_cols) # Add missing, reorder
                        dividends_df.index.name = TARGET_DIVIDENDS_COLS[0]
                    else:
                        dividends_df = pd.DataFrame(columns=[col for col in TARGET_DIVIDENDS_COLS if col != 'date'])
                        dividends_df.index = pd.to_datetime([])
                        dividends_df.index.name = TARGET_DIVIDENDS_COLS[0]
                        logger.info(f"{log_prefix} No dividend data from API or API call failed.")

                    # Splits processing
                    splits_df = pd.DataFrame(splits_raw if splits_raw is not None else [])
                    if not splits_df.empty:
                        # EODHD uses 'Date' (capital D) for splits date
                        if not all(c in splits_df.columns for c in ['Date', 'StockSplit']): 
                             raise ValueError(f"{log_prefix} Splits missing 'Date' or 'StockSplit'. Cols: {splits_df.columns}")
                        splits_df = splits_df.rename(columns={'Date': 'date', 'StockSplit': 'split_ratio_str'})
                        splits_df['date'] = pd.to_datetime(splits_df['date'], errors='coerce')
                        splits_df.dropna(subset=['date'], inplace=True) # split_ratio_str can be various formats
                        splits_df = splits_df.set_index('date').sort_index()
                        final_split_cols = [col for col in TARGET_SPLITS_COLS if col != 'date']
                        splits_df = splits_df.reindex(columns=final_split_cols)
                        splits_df.index.name = TARGET_SPLITS_COLS[0]
                    else:
                        splits_df = pd.DataFrame(columns=[col for col in TARGET_SPLITS_COLS if col != 'date'])
                        splits_df.index = pd.to_datetime([])
                        splits_df.index.name = TARGET_SPLITS_COLS[0]
                        logger.info(f"{log_prefix} No split data from API or API call failed.")

                    processed_result = {"splits": splits_df, "dividends": dividends_df}
                    logger.info(f"{log_prefix} Live fetch: Data processing SUCCEEDED. Splits: {len(splits_df)}, Divs: {len(dividends_df)}.")
                    fetch_succeeded_for_cache_write = True
        
        except Exception as e_fetch_or_proc:
            logger.error(f"{log_prefix} Live fetch or processing FAILED: {e_fetch_or_proc}", exc_info=True)
            processed_result = None
            fetch_succeeded_for_cache_write = False
            # Cache write block will handle failure marker

    # --- Cache Write (if live fetch was attempted) ---
    if live_fetch_attempted and cache and cache_key:
        if fetch_succeeded_for_cache_write and processed_result is not None:
            logger.info(f"{log_prefix} Live fetch successful. Caching the result dict...")
            try:
                data_to_cache: Dict[str, Optional[Dict[str, Any]]] = {}
                all_serialized_ok = True
                for key_item, df_item in processed_result.items():
                    if isinstance(df_item, pd.DataFrame):
                        serialized_df = _serialize_dataframe_for_cache(df_item, f"{log_prefix}[{key_item}]")
                        if serialized_df:
                            data_to_cache[key_item] = serialized_df
                        else:
                            logger.error(f"{log_prefix} Failed to serialize '{key_item}' DataFrame. Storing as None representation for this key.")
                            data_to_cache[key_item] = _serialize_dataframe_for_cache(pd.DataFrame(), f"{log_prefix}[{key_item}_empty_placeholder]") # Cache empty DF rep
                            all_serialized_ok = False # Mark that not all DFs were perfectly serialized
                    else: # Should not happen if fetch_succeeded_for_cache_write is True
                        logger.error(f"{log_prefix} Item '{key_item}' in processed_result is not a DataFrame. Type: {type(df_item)}")
                        data_to_cache[key_item] = _serialize_dataframe_for_cache(pd.DataFrame(), f"{log_prefix}[{key_item}_unexpected_empty]")
                        all_serialized_ok = False
                
                if data_to_cache and 'splits' in data_to_cache and 'dividends' in data_to_cache : # Ensure both keys are present
                    await cache.set(cache_key, data_to_cache, timeout_seconds=cache_ttl)
                    logger.info(f"{log_prefix} Cache SET successful for live data (all_serialized_ok: {all_serialized_ok}).")
                else:
                     logger.error(f"{log_prefix} Failed to prepare complete data_to_cache dict. Not Caching.")
                     # This implies a severe issue, potentially cache failure marker if not already set
                     await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                     processed_result = None # Ensure failure is propagated

            except Exception as e_cache_set:
                logger.error(f"{log_prefix} Cache SET FAILED for live data. Error: {e_cache_set}", exc_info=True)
        elif not fetch_succeeded_for_cache_write:
            logger.info(f"{log_prefix} Live fetch was unsuccessful or processing failed. Ensuring failure marker is cached for splits/dividends.")
            await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
            processed_result = None

    # --- Final Return ---
    result_type = "Dict[str, pd.DataFrame]" if processed_result is not None else "None"
    s_count = len(processed_result['splits']) if processed_result and 'splits' in processed_result and isinstance(processed_result['splits'], pd.DataFrame) else "N/A"
    d_count = len(processed_result['dividends']) if processed_result and 'dividends' in processed_result and isinstance(processed_result['dividends'], pd.DataFrame) else "N/A"
    logger.info(f"{log_prefix} === Finished. Returning: {result_type}. Splits: {s_count}, Divs: {d_count}. Cache: {cache_hit_status_enum.name}, LiveFetch: {live_fetch_attempted} ===")
    return processed_result


# ==============================================================================
# === EODHD News Fetcher Function (Javított Verzió) ===
# ==============================================================================
async def fetch_eodhd_news(
    symbol: str,                 # A ticker szimbólum (pl. "NVDA.US") - Kötelezővé tettük
    client: httpx.AsyncClient,   # HTTP kliens
    cache: CacheService,         # Cache szolgáltatás
    from_date_str: Optional[str] = None, # Kezdő dátum (YYYY-MM-DD)
    to_date_str: Optional[str] = None,   # Végdátum (YYYY-MM-DD)
    limit: Optional[int] = 30,           # Max hírek száma (API limit figyelembe vétele)
    force_refresh: bool = False          # Cache figyelmen kívül hagyása
) -> Optional[pd.DataFrame]:             # DataFrame-et ad vissza a következetességért
    """
    Fetches financial news for a given symbol from EOD Historical Data, utilizing cache.

    Args:
        symbol: The stock ticker symbol (e.g., "NVDA.US").
        client: An httpx.AsyncClient instance.
        cache: The CacheService instance.
        from_date_str: Optional start date string (YYYY-MM-DD).
        to_date_str: Optional end date string (YYYY-MM-DD).
        limit: Optional maximum number of news items to fetch.
        force_refresh: If True, bypass cache read and fetch live data.

    Returns:
        A Pandas DataFrame containing the news items with standardized columns
        (TARGET_NEWS_COLS) or None if fetching/processing fails or no data found.
        Returns an empty DataFrame if the API returns an empty list successfully.
    """
    final_processed_df: Optional[pd.DataFrame] = None
    live_fetch_attempted: bool = False
    cache_hit_status_enum: CacheStatus = CacheStatus.MISS
    logger = EODHD_FETCHER_LOGGER

    # Log prefix a jobb követhetőségért
    log_prefix = f"[{symbol.replace('.', '_')}][News(eodhd,f={from_date_str},t={to_date_str},l={limit})]"

    if not _eodhd_dependencies_met: # Ezt a flaget a modul elején kellene beállítani
        logger.error(f"{log_prefix} Core dependencies not met. Aborting.")
        return None

    logger.debug(f"{log_prefix} === Starting fetch (force_refresh={force_refresh}) ===")

    # --- Paraméterek és Cache Kulcs Előkészítése ---
    api_key: Optional[str] = None
    cache_key: Optional[str] = None
    cache_ttl: int = EODHD_NEWS_TTL
    api_params: Dict[str, Any] = {}
    news_url: str = EODHD_BASE_URL_NEWS # Használjuk a definiált konstanst

    try:
        api_key = await get_api_key("EODHD")
        if not api_key:
            logger.error(f"{log_prefix} API key for EODHD NOT FOUND. Cannot proceed.")
            return None

        # API paraméterek összeállítása
        api_params = {"api_token": api_key, "fmt": "json"}
        # TODO: Ellenőrizd az EODHD API dokumentációt! Melyik paraméter a ticker? 's' vagy 't'?
        # Feltételezzük, hogy 't' a /api/news végponton.
        api_params["t"] = symbol.upper() # Használjuk a kapott szimbólumot!

        # Cache kulcs paraméterek összeállítása
        cache_key_params: Dict[str, Union[str, int]] = {"symbol": symbol.upper()}

        if from_date_str:
            api_params["from"] = from_date_str
            cache_key_params["from"] = from_date_str
        if to_date_str:
            api_params["to"] = to_date_str
            cache_key_params["to"] = to_date_str
        if limit is not None and limit > 0:
            api_params["limit"] = limit
            cache_key_params["limit"] = limit
        else:
             api_params["limit"] = 30 # Adjunk meg egy alapértelmezett limitet az API-nak, ha nincs
             cache_key_params["limit"] = 30


        # Cache kulcs generálása a standardizált segédfüggvénnyel
        cache_key = generate_cache_key(
            data_type="news",
            source="eodhd",
            identifier=symbol.upper(), # Azonosító a szimbólum
            params=cache_key_params    # Paraméterek a cache kulcshoz
        )
        logger.info(f"{log_prefix} Generated cache key: {cache_key}")

    except Exception as e_init_params:
        logger.critical(f"{log_prefix} CRITICAL ERROR during API/Cache param setup: {e_init_params}", exc_info=True)
        return None # Nem tudunk folytatni cache kulcs vagy API paraméterek nélkül

    # --- Cache Olvasás ---
    if not force_refresh and cache and cache_key:
        try:
            logger.debug(f"{log_prefix} Attempting cache read for key: {cache_key}")
            cached_item = await cache.get(cache_key)
            if cached_item is not None:
                if cached_item == FETCH_FAILED_MARKER:
                    logger.info(f"{log_prefix} Cache HIT: Failure marker found. Returning None.")
                    cache_hit_status_enum = CacheStatus.HIT_FAILED
                    return None # Nincs értelme folytatni, ha korábban már sikertelen volt
                elif isinstance(cached_item, dict): # Feltételezzük, hogy a _serialize... dict-et ad vissza
                    reconstructed_df = _deserialize_dataframe_from_cache(
                        cached_item,
                        f"{log_prefix}[CacheRec]",
                        index_is_datetime=False # Híreknél általában nincs értelmes datetime index
                    )
                    if reconstructed_df is not None:
                        logger.info(f"{log_prefix} Cache HIT: DataFrame successfully reconstructed. Shape: {reconstructed_df.shape}")
                        cache_hit_status_enum = CacheStatus.HIT_VALID
                        final_processed_df = reconstructed_df # Megvan az eredmény a cache-ből
                    else:
                        logger.warning(f"{log_prefix} Cache HIT: Invalid data structure for news DataFrame. Deleting, treating as MISS.")
                        await cache.delete(cache_key)
                        cache_hit_status_enum = CacheStatus.HIT_INVALID
                else: # Váratlan típus a cache-ben
                    logger.warning(f"{log_prefix} Cache HIT: Unexpected data type ({type(cached_item)}) found. Deleting, treating as MISS.")
                    await cache.delete(cache_key)
                    cache_hit_status_enum = CacheStatus.HIT_INVALID
            else: # cached_item is None
                logger.info(f"{log_prefix} Cache MISS for key: {cache_key}")
                cache_hit_status_enum = CacheStatus.MISS
        except Exception as e_cache_get:
            logger.error(f"{log_prefix} ERROR during cache.get: {e_cache_get}", exc_info=True)
            cache_hit_status_enum = CacheStatus.ERROR # Hiba történt, próbáljunk élő lekérést

    elif force_refresh and cache_key:
        logger.info(f"{log_prefix} Force refresh requested. Skipping cache read.")
        cache_hit_status_enum = CacheStatus.MISS

    # --- Élő Adatlekérés (ha szükséges) ---
    if final_processed_df is None and cache_hit_status_enum not in [CacheStatus.HIT_VALID, CacheStatus.HIT_FAILED]:
        logger.info(f"{log_prefix} Cache status: {cache_hit_status_enum.name}. Attempting LIVE news data fetch from EODHD...")
        live_fetch_attempted = True

        raw_response_json: Optional[List[Dict[str, Any]]] = None # Az API várhatóan listát ad
        fetch_succeeded_for_cache_write = False

        try:
            # API hívás a make_api_request segédfüggvénnyel
            # A segédfüggvénynek kell kezelnie a 4xx/5xx hibákat és None-t visszaadni, ha hiba van
            # és a failure marker cache-elését is elvégezheti hiba esetén
            params_for_log = api_params.copy()
            if 'api_token' in params_for_log: params_for_log['api_token'] = "***MASKED***"
            logger.debug(f"{log_prefix} EODHD News API Request Details: URL='{news_url}', Params={params_for_log}")

            # A make_api_request feltételezett szignatúrája
            api_response_raw = await make_api_request(
                client=client,
                method="GET",
                url=news_url,
                params=api_params,
                cache_service=cache, # Átadjuk a cache service-t
                cache_key_for_failure=cache_key, # Megadjuk a kulcsot a failure markerhez
                source_name_for_log=f"eodhd_news for {symbol}"
            )

            # make_api_request sikeres volt és adatot adott vissza?
            if api_response_raw is not None:
                if isinstance(api_response_raw, list):
                    raw_response_json = cast(List[Dict[str, Any]], api_response_raw) # Típus ellenőrzés után cast
                    logger.info(f"{log_prefix} Live fetch SUCCEEDED (API returned 200 OK). Received {len(raw_response_json)} news items raw.")
                    fetch_succeeded_for_cache_write = True # Sikeres volt, cache-elhetünk

                    # --- DataFrame Feldolgozás ---
                    df_from_api = pd.DataFrame(raw_response_json)

                    if df_from_api.empty:
                        logger.info(f"{log_prefix} Live fetch: API returned no news. Creating empty DataFrame.")
                        # Üres DataFrame létrehozása a standard oszlopokkal
                        processed_df_temp = pd.DataFrame(columns=TARGET_NEWS_COLS)
                        # Típusok beállítása az üres DataFrame-en (fontos lehet a későbbi feldolgozáshoz)
                        if 'published_at' in TARGET_NEWS_COLS:
                            processed_df_temp['published_at'] = pd.to_datetime([], utc=True)
                        if 'tickers_mentioned' in TARGET_NEWS_COLS:
                            processed_df_temp['tickers_mentioned'] = processed_df_temp['tickers_mentioned'].astype('object')
                        final_processed_df = processed_df_temp
                    else:
                        # Oszlopok átnevezése és feldolgozása
                        rename_map = {'date': 'published_at', 'link': 'url', 'symbols': 'tickers_mentioned', 'content':'description'} # 'content' -> 'description', ha az a cél oszlop
                        df_renamed = df_from_api.rename(columns=rename_map)

                        # Dátum feldolgozása
                        if 'published_at' in df_renamed.columns:
                            df_renamed['published_at'] = pd.to_datetime(df_renamed['published_at'], utc=True, errors='coerce')
                            initial_count = len(df_renamed)
                            df_renamed.dropna(subset=['published_at'], inplace=True) # Dobjuk el azokat, ahol a dátum nem valid
                            if len(df_renamed) < initial_count:
                                logger.warning(f"{log_prefix} Dropped {initial_count - len(df_renamed)} news items due to invalid date format.")
                        else:
                            logger.warning(f"{log_prefix} 'published_at' (from 'date') column missing. Adding as NaT.")
                            df_renamed['published_at'] = pd.NaT

                        # Ticker lista biztosítása
                        if 'tickers_mentioned' in df_renamed.columns:
                            df_renamed['tickers_mentioned'] = df_renamed['tickers_mentioned'].apply(
                                lambda x: [str(s).strip().upper() for s in x if str(s).strip()] if isinstance(x, list) else ([str(x).strip().upper()] if pd.notna(x) and str(x).strip() else [])
                            )
                        else:
                            df_renamed['tickers_mentioned'] = [[] for _ in range(len(df_renamed))]

                        # Cél oszlopok biztosítása
                        for col in TARGET_NEWS_COLS:
                            if col not in df_renamed.columns:
                                logger.debug(f"{log_prefix} Target news column '{col}' missing. Adding default.")
                                if col == 'tickers_mentioned': df_renamed[col] = [[] for _ in range(len(df_renamed))]
                                elif col == 'published_at': df_renamed[col] = pd.NaT
                                elif col == 'description': df_renamed[col] = df_renamed.get('title', "") # Leíráshoz a címet használjuk, ha nincs
                                elif col == 'sentiment_score': df_renamed[col] = 0.0 # Alapértelmezett sentiment
                                elif col == 'relevance_score': df_renamed[col] = 0.0 # Alapértelmezett relevancia
                                else: df_renamed[col] = "" # Üres string egyébként

                        # Csak a cél oszlopokat tartjuk meg a helyes sorrendben
                        final_processed_df = df_renamed[TARGET_NEWS_COLS].copy()

                        # Rendezés dátum szerint (ha van érvényes dátum)
                        if not final_processed_df['published_at'].isnull().all():
                            final_processed_df = final_processed_df.sort_values(by='published_at', ascending=False).reset_index(drop=True)

                        logger.info(f"{log_prefix} Live fetch: News processing SUCCEEDED. Final Shape: {final_processed_df.shape}.")

                # else: # Ha az api_response_raw nem None, de nem is lista
                #     logger.error(f"{log_prefix} Live fetch: Invalid API response format. Expected list, got {type(api_response_raw)}. Response: {str(api_response_raw)[:200]}")
                #     # A make_api_request már cache-elte a failure markert ebben az esetben (ha None-t adott vissza)
                #     fetch_succeeded_for_cache_write = False # Ne cache-eljünk hibás adatot
            else: # api_response_raw is None (make_api_request hibát jelzett és már cache-elte a failure markert)
                 logger.error(f"{log_prefix} Live fetch: News API request failed (make_api_request returned None, failure marker should be cached).")
                 fetch_succeeded_for_cache_write = False # A hiba már cache-elve van

        except Exception as e_fetch_or_proc:
            logger.error(f"{log_prefix} Live fetch or news processing FAILED with unexpected error: {e_fetch_or_proc}", exc_info=True)
            final_processed_df = None
            fetch_succeeded_for_cache_write = False
            # Itt is érdemes lehet explicit failure markert cache-elni, ha a make_api_request nem tette meg
            if cache and cache_key:
                 try: await cache.set(cache_key, FETCH_FAILED_MARKER, timeout_seconds=FETCH_FAILURE_CACHE_TTL)
                 except Exception as e_cache_fail_write: logger.error(f"{log_prefix} Failed to write failure marker to cache after error: {e_cache_fail_write}", exc_info=True)


    # --- Cache Írás (ha élő lekérés történt és sikeres volt) ---
    if live_fetch_attempted and fetch_succeeded_for_cache_write and final_processed_df is not None and cache and cache_key:
        log_msg_suffix = "empty DataFrame" if final_processed_df.empty else f"DataFrame with shape {final_processed_df.shape}"
        logger.info(f"{log_prefix} Live fetch succeeded. Caching {log_msg_suffix}...")
        try:
            # Itt szerializáljuk a DataFrame-et a cache-elés előtt
            serialized_data = _serialize_dataframe_for_cache(final_processed_df, f"{log_prefix}[CacheWrite]")
            if serialized_data:
                await cache.set(cache_key, serialized_data, timeout_seconds=cache_ttl)
                logger.info(f"{log_prefix} Cache SET successful for {log_msg_suffix} with TTL {cache_ttl}s.")
            else:
                logger.error(f"{log_prefix} Failed to serialize news DataFrame for cache. Not caching.")
        except Exception as e_cache_set:
            logger.error(f"{log_prefix} Cache SET FAILED for live news data. Error: {e_cache_set}", exc_info=True)

    # --- Végső Visszatérés ---
    final_return_type = type(final_processed_df).__name__
    final_shape_cols = f"Shape: {final_processed_df.shape}, Columns: {list(final_processed_df.columns)}" if final_processed_df is not None else "Result is None"
    logger.info(f"{log_prefix} === Finished. Returning: {final_return_type}, {final_shape_cols}. Cache: {cache_hit_status_enum.name}, LiveFetch: {live_fetch_attempted} ===")
    return final_processed_df

# ==============================================================================
# === Meglévő Placeholder Funkciók (Változatlanul) ===
# ==============================================================================
async def fetch_eodhd_company_info_placeholder(
    symbol_with_exchange: str, cache: CacheService, client: httpx.AsyncClient, force_refresh: bool = False
) -> Optional[Dict]:
    logger = EODHD_FETCHER_LOGGER
    log_prefix = f"[{symbol_with_exchange}][CompanyInfoPlaceholder]"
    logger.warning(f"{log_prefix} Function is a PLACEHOLDER and not implemented. Returning None. force_refresh={force_refresh}")
    return None

async def fetch_eodhd_financial_statements_placeholder(
    symbol_with_exchange: str, cache: CacheService, client: httpx.AsyncClient,
    statement_type: str, frequency: str = 'Annual', force_refresh: bool = False
) -> Optional[pd.DataFrame]:
    logger = EODHD_FETCHER_LOGGER
    log_prefix = f"[{symbol_with_exchange}][FinancialsPlaceholder({statement_type},{frequency})]"
    logger.warning(f"{log_prefix} Function is a PLACEHOLDER and not implemented. Returning None. force_refresh={force_refresh}")
    return None

async def fetch_eodhd_ohlcv_and_events(
    symbol_with_exchange: str,
    client: httpx.AsyncClient,
    cache: CacheService,
    years: int = 5,
    force_refresh: bool = False
) -> tuple[Optional[pd.DataFrame], Optional[pd.DataFrame], Optional[pd.DataFrame]]:
    """
    Fetches OHLCV, splits, and dividends data concurrently for a given symbol.
    This replaces separate calls in the service layer, simplifying orchestration.

    Args:
        symbol_with_exchange: The ticker symbol with exchange (e.g., 'AAPL.US').
        client: An httpx.AsyncClient for making API requests.
        cache: The cache service instance.
        years: The number of years of historical data to fetch.
        force_refresh: If True, bypasses the cache.

    Returns:
        A tuple containing:
        - DataFrame with OHLCV data or None on failure.
        - DataFrame with splits data or None on failure.
        - DataFrame with dividends data or None on failure.
    """
    log_prefix = f"[Fetch Orchestrator({symbol_with_exchange})]"
    EODHD_FETCHER_LOGGER.info(f"{log_prefix} Starting combined fetch for OHLCV and events for {years} years.")

    start_date = datetime.now(timezone.utc) - timedelta(days=years * 365.25)
    start_date_str = start_date.strftime('%Y-%m-%d')

    # Create concurrent tasks for fetching OHLCV and events (splits/dividends)
    ohlcv_task = asyncio.create_task(
        fetch_eodhd_ohlcv(
            symbol_with_exchange=symbol_with_exchange,
            client=client,
            cache=cache,
            period_or_start_date=start_date_str,
            force_refresh=force_refresh
        ),
        name=f"ohlcv-fetch-{symbol_with_exchange}"
    )

    events_task = asyncio.create_task(
        fetch_eodhd_splits_and_dividends(
            symbol_with_exchange=symbol_with_exchange,
            client=client,
            cache=cache,
            start_date_str=start_date_str,
            force_refresh=force_refresh
        ),
        name=f"events-fetch-{symbol_with_exchange}"
    )

    try:
        # Await both tasks concurrently
        results = await asyncio.gather(ohlcv_task, events_task, return_exceptions=True)

        # Process OHLCV results
        ohlcv_result = results[0]
        if isinstance(ohlcv_result, Exception):
            EODHD_FETCHER_LOGGER.error(f"{log_prefix} OHLCV fetch task failed with an exception: {ohlcv_result}", exc_info=ohlcv_result)
            ohlcv_df = None
        else:
            ohlcv_df = ohlcv_result
            if ohlcv_df is not None:
                EODHD_FETCHER_LOGGER.info(f"{log_prefix} Successfully fetched OHLCV data. Shape: {ohlcv_df.shape}")
            else:
                EODHD_FETCHER_LOGGER.warning(f"{log_prefix} OHLCV fetch task returned None.")

        # Process Events (Splits/Dividends) results
        events_result = results[1]
        splits_df, dividends_df = None, None
        if isinstance(events_result, Exception):
            EODHD_FETCHER_LOGGER.error(f"{log_prefix} Events fetch task failed with an exception: {events_result}", exc_info=events_result)
        elif isinstance(events_result, dict):
            splits_df = events_result.get('splits')
            dividends_df = events_result.get('dividends')
            if splits_df is not None:
                EODHD_FETCHER_LOGGER.info(f"{log_prefix} Successfully fetched splits data. Shape: {splits_df.shape}")
            else:
                 EODHD_FETCHER_LOGGER.warning(f"{log_prefix} Splits data was None.")
            if dividends_df is not None:
                EODHD_FETCHER_LOGGER.info(f"{log_prefix} Successfully fetched dividends data. Shape: {dividends_df.shape}")
            else:
                EODHD_FETCHER_LOGGER.warning(f"{log_prefix} Dividends data was None.")
        else:
            EODHD_FETCHER_LOGGER.error(f"{log_prefix} Events fetch task returned an unexpected type: {type(events_result)}. Expected dict.")

        return ohlcv_df, splits_df, dividends_df

    except Exception as e:
        EODHD_FETCHER_LOGGER.critical(
            f"{log_prefix} An unexpected critical error occurred in fetch_eodhd_ohlcv_and_events: {e}",
            exc_info=True
        )
        return None, None, None

# --- Modul betöltésének jelzése ---
if _eodhd_dependencies_met:
    EODHD_FETCHER_LOGGER.info("--- EODHD Fetcher Module (v3.4 - Enterprise Robust) loaded successfully. ---")
else:
    EODHD_FETCHER_LOGGER.error("--- EODHD Fetcher Module (v3.4 - Enterprise Robust) loaded WITH ERRORS due to missing dependencies. ---")