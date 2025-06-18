# backend/core/fetchers/yfinance.py
import asyncio
import time
from typing import Any, Dict, List, Optional, Union, cast, TypeAlias, TYPE_CHECKING
import pandas as pd # type: ignore
# import importlib.util # Erre már nem lesz szükség az egyszerűsített importtal
# import sys # Erre szükség lesz
# import os # Erre szükség lesz
import logging

# --- ÚJ, EGYSZERŰSÍTETT IMPORTÁLÓ FÜGGVÉNY ---
import sys
import os
import importlib
# --- VÉGE ÚJ IMPORTÁLÓ FÜGGVÉNY ---
import json
from pprint import pformat
from ..cache_service import CacheService
from modules.financehub.backend.utils.logger_config import get_logger
from modules.financehub.backend.utils.helpers import (
    generate_cache_key,
    FETCH_FAILED_MARKER,
    FETCH_FAILURE_CACHE_TTL
)

# Configuration
try:
    from modules.financehub.backend.config import settings
    # Logger will be initialized below, so we'll log success there
except ImportError as e:
    # Use basic logging for this critical error since our logger isn't set up yet
    import logging
    logging.getLogger(__name__).critical(f"Failed to import settings: {e}")
    raise ImportError("Cannot import configuration settings") from e

if TYPE_CHECKING:
    YFinanceTickerType: TypeAlias = Any
else:
    YFinanceTickerType: TypeAlias = Any

_YFINANCE_FETCHER_LOGGER_INSTANCE: Optional[logging.Logger] = None
_YFINANCE_DEPENDENCIES_MET: bool = False
_INITIALIZATION_ERRORS: List[str] = []
yf: Optional[Any] = None

def _get_yf_module_logger() -> logging.Logger:
    global _YFINANCE_FETCHER_LOGGER_INSTANCE
    if _YFINANCE_FETCHER_LOGGER_INSTANCE is None:
        try:
            _YFINANCE_FETCHER_LOGGER_INSTANCE = get_logger("yfinance_fetcher_v1.2_robust")
        except Exception as e:
            _INITIALIZATION_ERRORS.append(f"Failed to initialize logger via get_logger: {e}")
            _YFINANCE_FETCHER_LOGGER_INSTANCE = logging.getLogger("yfinance_fetcher_fallback")
            _YFINANCE_FETCHER_LOGGER_INSTANCE.error(f"CRITICAL: Failed to initialize logger via get_logger for yfinance_fetcher: {e}", exc_info=True)
    return _YFINANCE_FETCHER_LOGGER_INSTANCE

YF_FETCHER_LOGGER = _get_yf_module_logger()

# --- ÚJ, EGYSZERŰSÍTETT VALÓDI YFINANCE IMPORTÁLÓ ---
def _import_real_yfinance_simplified() -> Any:
    global _INITIALIZATION_ERRORS
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    original_sys_path = list(sys.path) # Másolat készítése

    # Ideiglenesen távolítsuk el a jelenlegi fájl könyvtárát a sys.path-ból,
    # hogy a Python a site-packages-ből importáljon.
    if current_file_dir in sys.path:
        sys.path.remove(current_file_dir)
        # YF_FETCHER_LOGGER.debug(f"Temporarily removed '{current_file_dir}' from sys.path for yfinance import.")

    yf_module = None
    try:
        # Most az importlib.import_module a standard helyekről fogja keresni a yfinance-t
        yf_module = importlib.import_module("yfinance")
        YF_FETCHER_LOGGER.info(f"Successfully imported 'yfinance' library from: {yf_module.__file__}")

        # Ellenőrizzük, hogy tényleg nem a mi fájlunkat importáltuk-e újra
        if os.path.abspath(yf_module.__file__).startswith(current_file_dir):
            err_msg = ("CRITICAL: Imported 'yfinance' is still the local fetcher file. "
                       "Name collision resolution failed. Ensure this file is not in a yfinance named directory higher up, "
                       "or check Python environment.")
            YF_FETCHER_LOGGER.critical(err_msg)
            _INITIALIZATION_ERRORS.append(err_msg)
            raise ImportError("Failed to import the true yfinance library due to name collision resolution failure.")
    except ImportError as e:
        err_msg = f"The 'yfinance' package could not be imported. Please ensure it is installed. Error: {e}"
        YF_FETCHER_LOGGER.critical(err_msg, exc_info=True) # Critical és exc_info=True
        _INITIALIZATION_ERRORS.append(err_msg)
        raise # Újra dobjuk, hogy a modul betöltése megszakadjon, ha a yfinance nem elérhető
    except Exception as e_unexpected_import:
        err_msg = f"Unexpected error during 'yfinance' import: {e_unexpected_import}"
        YF_FETCHER_LOGGER.critical(err_msg, exc_info=True) # Critical és exc_info=True
        _INITIALIZATION_ERRORS.append(err_msg)
        raise ImportError(err_msg) from e_unexpected_import # Csomagoljuk ImportError-ként, hogy a modul betöltése megszakadjon
    finally:
        sys.path = original_sys_path # Mindig állítsuk vissza a sys.path-ot!
        # YF_FETCHER_LOGGER.debug("Restored original sys.path.")

    return yf_module
# --- VÉGE ÚJ IMPORTÁLÓ FÜGGVÉNY ---

# --- yfinance modul importálása ---
try:
    # Régi hívás törlése/kommentelése:
    # yf = _import_real_yfinance()
    yf = _import_real_yfinance_simplified() # Új hívás
    _YFINANCE_DEPENDENCIES_MET = True
    YF_FETCHER_LOGGER.info("'yfinance' library dynamically imported and available.")
except ImportError as e:
    # Az _import_real_yfinance_simplified már logolja a kritikus hibát,
    # itt csak az _YFINANCE_DEPENDENCIES_MET-et állítjuk.
    # Az ImportError-t az _import_real_yfinance_simplified már dobta,
    # ami miatt a yfinance.py modul importja meg fog szakadni,
    # és a fetchers/__init__.py ezt elkapja és helyesen kezeli.
    _YFINANCE_DEPENDENCIES_MET = False
    # Nem kell itt újra `raise e`, mert a hívó _import_real_yfinance_simplified már megtette.
except Exception as e_unexpected: # Bármi más váratlan hiba
    YF_FETCHER_LOGGER.critical(f"CRITICAL: An unexpected error occurred setting up 'yfinance' import: {e_unexpected}", exc_info=True)
    _YFINANCE_DEPENDENCIES_MET = False
    # Ha ez a blokk fut le, az ImportError nem lett dobva, így a modul importja nem feltétlenül szakad meg.
    # Biztonság kedvéért itt is dobhatnánk egy ImportError-t, hogy jelezzük a súlyos hibát.
    # raise ImportError(f"Unexpected failure during yfinance setup: {e_unexpected}") from e_unexpected


# ... (A fájl többi része változatlan marad, beleértve a fetch_ohlcv definícióját és a _log_module_load_status()-t)
# YFINANCE_OHLCV_TTL = settings.CACHE.DEFAULT_TTL_SECONDS
# ... (további kód változatlanul)

# --- yfinance Specifikus Konstansok ---
YFINANCE_OHLCV_TTL = settings.CACHE.DEFAULT_TTL_SECONDS
YFINANCE_COMPANY_INFO_TTL = settings.CACHE.DEFAULT_TTL_SECONDS * 24
YFINANCE_FINANCIAL_DATA_TTL = settings.CACHE.DEFAULT_TTL_SECONDS * 24 * 7
YFINANCE_NEWS_TTL = settings.CACHE.DEFAULT_TTL_SECONDS

OHLCV_REQUIRED_COLS = ['open', 'high', 'low', 'close', 'adj_close', 'volume']


# --- DataFrame Szerializálás/Deserializálás Cache-hez ---
# --- DataFrame Szerializálás/Deserializálás Cache-hez ---
def _serialize_dataframe_for_cache(df: pd.DataFrame, log_prefix: str) -> Optional[Dict[str, Any]]:
    """
    Serializes a Pandas DataFrame into a cacheable dictionary format for yfinance data.
    Ensures that pd.Timestamp objects (index, columns, and data) are converted
    to ISO 8601 strings for JSON compatibility.
    Metadata about original dtypes and timezones is preserved.
    """
    if not isinstance(df, pd.DataFrame):
        YF_FETCHER_LOGGER.error(f"{log_prefix} Serialization failed: Input is not a DataFrame (type: {type(df)}).")
        return None

    if df.empty:
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Input DataFrame is empty. Serializing structure for empty DataFrame.")
        df_for_dict = df.copy() # Üres DF másolata
        
        # Oszlopnevek kezelése, ha azok DatetimeIndex
        columns_for_split_dict = list(df_for_dict.columns)
        original_columns_names_for_meta = list(map(str, df_for_dict.columns)) # Oszlopnevek stringként a metaadathoz
        original_columns_dtype_str = str(df_for_dict.columns.dtype) if hasattr(df_for_dict.columns, 'dtype') else 'object'
        original_columns_timezone_str: Optional[str] = None
        if isinstance(df_for_dict.columns, pd.DatetimeIndex) and df_for_dict.columns.tz is not None:
            original_columns_timezone_str = str(df_for_dict.columns.tz)
            columns_for_split_dict = [ts.isoformat() if pd.notna(ts) else None for ts in df_for_dict.columns]


        data_dict = {
            "data": {
                "index": [],
                "columns": columns_for_split_dict, # Stringgé alakított oszlopnevek, ha dátumok voltak
                "data": []
            },
            "index_name": df_for_dict.index.name,
            "index_dtype": str(df_for_dict.index.dtype),
            "columns_names": original_columns_names_for_meta, # Eredeti oszlopnevek stringként
            "columns_dtype_str": original_columns_dtype_str, # Az oszlopok tömbjének/indexének típusa
            "columns_dtypes": {str(col): str(df_for_dict[col].dtype) for col in df_for_dict.columns} # Oszlopadatok típusai
        }
        if isinstance(df_for_dict.index, pd.DatetimeIndex) and df_for_dict.index.tz is not None:
            data_dict["index_timezone"] = str(df_for_dict.index.tz)
        if original_columns_timezone_str:
             data_dict["columns_timezone"] = original_columns_timezone_str
        # columns_timezones (az egyes adatoszlopok időzónáihoz) itt üres lesz
        return data_dict

    YF_FETCHER_LOGGER.debug(f"{log_prefix} Starting DataFrame serialization. Original shape: {df.shape}")
    try:
        df_copy = df.copy()

        # --- Metaadatok gyűjtése az eredeti DataFrame-ről ---
        original_index_name = df_copy.index.name
        original_index_dtype_str = str(df_copy.index.dtype)
        original_index_timezone_str: Optional[str] = None
        if isinstance(df_copy.index, pd.DatetimeIndex) and df_copy.index.tz is not None:
            original_index_timezone_str = str(df_copy.index.tz)

        # Oszlopnevek (mint tengely) metaadatai
        original_columns_axis_dtype_str = str(df_copy.columns.dtype) if hasattr(df_copy.columns, 'dtype') else 'object'
        original_columns_axis_timezone_str: Optional[str] = None
        if isinstance(df_copy.columns, pd.DatetimeIndex) and df_copy.columns.tz is not None:
            original_columns_axis_timezone_str = str(df_copy.columns.tz)

        # Az egyes oszlopokban lévő adatok típusai és időzónái
        original_column_data_dtypes_map = {str(col): str(df_copy[col].dtype) for col in df_copy.columns}
        original_column_data_timezones_map: Dict[str, str] = {}
        for col in df_copy.columns:
            col_str = str(col) # Oszlopnév stringként a map kulcsához
            if pd.api.types.is_datetime64_any_dtype(df_copy[col]) and getattr(df_copy[col].dt, 'tz', None) is not None:
                original_column_data_timezones_map[col_str] = str(df_copy[col].dt.tz)

        YF_FETCHER_LOGGER.debug(f"{log_prefix} Original index: name='{original_index_name}', dtype='{original_index_dtype_str}', tz='{original_index_timezone_str}'")
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Original columns axis: dtype='{original_columns_axis_dtype_str}', tz='{original_columns_axis_timezone_str}'")
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Original column data dtypes: {original_column_data_dtypes_map}")
        if original_column_data_timezones_map:
             YF_FETCHER_LOGGER.debug(f"{log_prefix} Original column data timezones: {original_column_data_timezones_map}")

        # --- Index konverziója stringgé, ha DatetimeIndex ---
        if isinstance(df_copy.index, pd.DatetimeIndex):
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Index is DatetimeIndex. Converting to ISO strings.")
            df_copy.index = [ts.isoformat() if pd.notna(ts) else None for ts in df_copy.index]
            df_copy.index.name = original_index_name
        
        # --- OszlopNEVEK konverziója stringgé, ha azok DatetimeIndex ---
        # Ez a `df.to_dict(orient='split')` "columns" kulcsát fogja befolyásolni
        if isinstance(df_copy.columns, pd.DatetimeIndex):
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Column names are DatetimeIndex. Converting to ISO strings for 'split' dict.")
            df_copy.columns = pd.Index([ts.isoformat() if pd.notna(ts) else None for ts in df_copy.columns])

        # --- Dátum ADATOSZLOPok konverziója stringgé ---
        for col_name_in_df in df_copy.columns: # df_copy.columns már lehetnek stringek (az előző lépés miatt)
            if pd.api.types.is_datetime64_any_dtype(df_copy[col_name_in_df]):
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Column data '{col_name_in_df}' is datetime. Converting its values to ISO strings.")
                df_copy[col_name_in_df] = df_copy[col_name_in_df].apply(lambda dt: dt.isoformat() if pd.notna(dt) else None)

        # --- DataFrame átalakítása 'split' orientációjú dictionary-vé ---
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Converting DataFrame to dictionary (orient='split'). Processed DF head:\n{df_copy.head().to_string() if not df_copy.empty else 'Empty DF'}")
        data_payload = df_copy.to_dict(orient='split')
        # data_payload["columns"] itt már a stringgé alakított oszlopneveket tartalmazza, ha azok dátumok voltak

        # --- Végső dictionary összeállítása a metaadatokkal ---
        serialized_dict = {
            "data": data_payload, # Tartalmazza: "index", "columns", "data" (mind stringekkel)
            "index_name": original_index_name,
            "index_dtype": original_index_dtype_str,
            # Az "columns_names" kulcs az eredeti oszlopneveket tartalmazza stringként (metaadatként)
            # A "data_payload["columns"]" a szerializáláshoz használt (esetleg konvertált) oszlopneveket.
            "columns_names": list(map(str, df.columns)), # Eredeti oszlopnevek stringként
            "columns_dtype_str": original_columns_axis_dtype_str, # Az oszlopok tengelyének típusa
            "columns_dtypes": original_column_data_dtypes_map, # Az egyes oszlopok adatainak típusa
        }

        if original_index_timezone_str:
            serialized_dict["index_timezone"] = original_index_timezone_str
        if original_columns_axis_timezone_str: # Az oszlopok tengelyének időzónája
            serialized_dict["columns_timezone"] = original_columns_axis_timezone_str
        if original_column_data_timezones_map: # Az egyes oszlopok adatainak időzónái
            serialized_dict["columns_content_timezones"] = original_column_data_timezones_map
        
        YF_FETCHER_LOGGER.info(f"{log_prefix} DataFrame successfully serialized for cache.")
        return serialized_dict

    except Exception as e:
        YF_FETCHER_LOGGER.error(f"{log_prefix} DataFrame serialization error: {e}", exc_info=True)
        try:
            YF_FETCHER_LOGGER.debug(f"{log_prefix} DataFrame state at error (first 5 rows):\n{df.head().to_string() if df is not None and not df.empty else 'DataFrame is None or empty'}")
        except Exception as e_log_df:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Could not log DataFrame head on error: {e_log_df}")
        return None

def _deserialize_dataframe_from_cache(
    data_dict: Dict[str, Any],
    log_prefix: str,
) -> Optional[pd.DataFrame]:
    """Deserializál egy dict-et Pandas DataFrame-mé, yfinance adatokhoz optimalizálva."""
     # ====> UGYANAZ A HELYES ELLENŐRZÉS KELL IDE IS <====
    if not isinstance(data_dict, dict) or "data" not in data_dict or \
       not isinstance(data_dict["data"], dict) or \
       "index" not in data_dict["data"] or \
       "columns" not in data_dict["data"] or \
       "data" not in data_dict["data"]:
        YF_FETCHER_LOGGER.error(f"{log_prefix} Deserialization failed: Input is not a valid data_dict or 'data' key has incorrect structure.")
        # ... (többi debug log a hibás dict struktúráról) ...
        return None
    # ====> ELLENŐRZÉS VÉGE <====

    
    YF_FETCHER_LOGGER.debug(f"{log_prefix} Starting DataFrame deserialization from cache.")
    try:
        payload = data_dict["data"]
        
        # DataFrame rekonstrukciója a 'split' orientációból
        # Az index és az oszlopok a payload-ban stringként vannak (ha dátumok voltak)
        # A pd.Index() és pd.to_datetime() majd kezeli ezeket.
        df_index = pd.Index(payload["index"])
        df_columns = pd.Index(payload["columns"])

        df = pd.DataFrame(
            data=payload["data"],
            index=df_index,
            columns=df_columns
        )
        
        df.index.name = data_dict.get("index_name")
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Initial DataFrame created. Shape: {df.shape}, Index name: '{df.index.name}'.")

        # --- Index típusának és időzónájának visszaállítása ---
        stored_index_dtype = data_dict.get("index_dtype", "").lower()
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Stored index_dtype: '{stored_index_dtype}'. Current index dtype: {df.index.dtype}.")
        if "datetime" in stored_index_dtype: # Csak a metaadatra támaszkodunk
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to convert index to DatetimeIndex.")
            try:
                df.index = pd.to_datetime(df.index, errors='coerce')
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Index converted to DatetimeIndex. New dtype: {df.index.dtype}.")
                if isinstance(df.index, pd.DatetimeIndex):
                    stored_index_tz_str = data_dict.get("index_timezone")
                    if stored_index_tz_str and not df.index.empty:
                        YF_FETCHER_LOGGER.debug(f"{log_prefix} Applying stored index timezone: '{stored_index_tz_str}'. Current tz: {df.index.tz}")
                        try:
                            if df.index.tz is None: df.index = df.index.tz_localize(stored_index_tz_str)
                            elif str(df.index.tz) != stored_index_tz_str: df.index = df.index.tz_convert(stored_index_tz_str)
                        except Exception as e_tz_idx: YF_FETCHER_LOGGER.warning(f"{log_prefix} Index tz localization/conversion to '{stored_index_tz_str}' failed: {e_tz_idx}", exc_info=False)
            except Exception as e_idx_conv: YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to convert index to DatetimeIndex (original: {stored_index_dtype}): {e_idx_conv}", exc_info=False)

        # --- OszlopNEVEK (mint tengely) típusának és időzónájának visszaállítása ---
        stored_columns_axis_dtype = data_dict.get("columns_dtype_str", "").lower() # Az oszlopok tengelyének típusa
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Stored columns_axis_dtype: '{stored_columns_axis_dtype}'. Current columns dtype: {df.columns.dtype}.")
        if "datetime" in stored_columns_axis_dtype: # Csak a metaadatra támaszkodunk
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to convert column names to DatetimeIndex.")
            try:
                df.columns = pd.to_datetime(df.columns, errors='coerce')
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Columns converted to DatetimeIndex. New dtype: {df.columns.dtype}.")
                if isinstance(df.columns, pd.DatetimeIndex):
                    stored_columns_axis_tz_str = data_dict.get("columns_timezone") # Az oszlopok tengelyének tárolt TZ-je
                    if stored_columns_axis_tz_str and not df.columns.empty:
                        YF_FETCHER_LOGGER.debug(f"{log_prefix} Applying stored columns axis timezone: '{stored_columns_axis_tz_str}'. Current tz: {df.columns.tz}")
                        try:
                            if df.columns.tz is None: df.columns = df.columns.tz_localize(stored_columns_axis_tz_str)
                            elif str(df.columns.tz) != stored_columns_axis_tz_str: df.columns = df.columns.tz_convert(stored_columns_axis_tz_str)
                        except Exception as e_tz_cols_axis: YF_FETCHER_LOGGER.warning(f"{log_prefix} Columns axis tz localization/conversion to '{stored_columns_axis_tz_str}' failed: {e_tz_cols_axis}", exc_info=False)
            except Exception as e_cols_conv: YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to convert column names to DatetimeIndex (original: {stored_columns_axis_dtype}): {e_cols_conv}", exc_info=False)
        
        # --- Oszlop ADATOK típusainak és időzónáinak visszaállítása ---
        # Az oszlopnevek a df.columns-ban most már a helyes típusúak (string vagy DatetimeIndex)
        # A stored_col_data_dtypes kulcsai az eredeti (string) oszlopnevek.
        stored_col_data_dtypes = data_dict.get("columns_dtypes", {}) # {"col_name_str": "dtype_str"}
        stored_col_data_content_timezones = data_dict.get("columns_content_timezones", {}) # {"col_name_str": "tz_str"}
        
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Stored column_data_dtypes: {stored_col_data_dtypes}")
        if stored_col_data_content_timezones: YF_FETCHER_LOGGER.debug(f"{log_prefix} Stored column_data_content_timezones: {stored_col_data_content_timezones}")

        for original_col_name_str, dtype_str_stored in stored_col_data_dtypes.items():
            # Meg kell találnunk a df-ben az oszlopot. Ha az oszlopnevek DatetimeIndex-szé alakultak,
            # akkor az original_col_name_str-t (ami a szerializálás előtti string név volt)
            # esetleg vissza kell alakítani, vagy a df.columns-ban keresni.
            # Egyszerűsítés: A df.columns-t használjuk, és feltételezzük, hogy a sorrend megmaradt,
            # vagy a `str(col_in_df)` egyezni fog az `original_col_name_str`-rel.
            
            # Keressük az oszlopot a df.columns között, ami megfelel az original_col_name_str-nek
            # Mivel a df.columns elemei lehetnek pd.Timestamp-ek is, ezért a str() konverzió fontos
            target_col_in_df = None
            for col_in_df in df.columns:
                if str(col_in_df) == original_col_name_str: # Ha az oszlopnevek stringek
                    target_col_in_df = col_in_df
                    break
                # Ha az oszlopnevek pd.Timestamp-ek, és az original_col_name_str egy ISO string, akkor ez bonyolultabb.
                # A szerializáló a "columns_names"-be az eredeti string neveket menti.
                # A df.columns pedig a visszaállított (esetleg DatetimeIndex) neveket tartalmazza.
                # A `columns_dtypes` kulcsai az eredeti string nevek.

            if target_col_in_df is None and isinstance(df.columns, pd.DatetimeIndex):
                 # Ha az oszlopnevek DatetimeIndex-ek, próbáljuk meg az original_col_name_str-t (ami egy ISO string lehet)
                 # pd.Timestamp-ként értelmezni és úgy keresni.
                 try:
                     potential_ts_col = pd.Timestamp(original_col_name_str)
                     if potential_ts_col in df.columns:
                         target_col_in_df = potential_ts_col
                 except ValueError: # Nem valid dátum string
                     pass
            
            if target_col_in_df is None:
                # Ha még mindig nem találjuk, és az oszlopnevek stringek, próbáljuk meg direkten
                if original_col_name_str in df.columns: # Ez akkor működik, ha a df.columns stringeket tartalmaz
                    target_col_in_df = original_col_name_str

            if target_col_in_df is None:
                 YF_FETCHER_LOGGER.debug(f"{log_prefix}[ColData] Original column '{original_col_name_str}' not found in deserialized DataFrame columns for type conversion. Skipping.")
                 continue

            col_log_prefix = f"{log_prefix}[ColData:'{str(target_col_in_df)}'](orig_name='{original_col_name_str}')"
            try:
                if "datetime" in dtype_str_stored.lower():
                    YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting content to datetime. Current dtype: {df[target_col_in_df].dtype}.")
                    df[target_col_in_df] = pd.to_datetime(df[target_col_in_df], errors='coerce')
                    YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Converted content to datetime. New dtype: {df[target_col_in_df].dtype}.")
                    
                    if original_col_name_str in stored_col_data_content_timezones and \
                       isinstance(df[target_col_in_df].dtype, pd.DatetimeTZDtype) == False and \
                       not df[target_col_in_df].empty and \
                       df[target_col_in_df].notna().any(): # Csak ha van nem-NaT érték
                        col_content_tz_str = stored_col_data_content_timezones[original_col_name_str]
                        YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Applying stored content timezone: '{col_content_tz_str}'. Current content tz: {getattr(df[target_col_in_df].dt, 'tz', None)}")
                        try:
                            # Fontos: Ha az oszlop már tartalmaz NaT értékeket, a tz_localize hibát dobhat.
                            # Megoldás: Csak a nem-NaT értékeket lokalizáljuk, vagy használjunk egy trükköt.
                            # A pd.to_datetime(..., utc=True) majd tz_convert jobb lehet, ha az adatok UTC-ben vannak.
                            # Itt feltételezzük, hogy az adatok naivak és a tárolt TZ-vel lokalizálhatók.
                            if getattr(df[target_col_in_df].dt, 'tz', None) is None:
                                df[target_col_in_df] = df[target_col_in_df].dt.tz_localize(col_content_tz_str)
                            elif str(df[target_col_in_df].dt.tz) != col_content_tz_str:
                                df[target_col_in_df] = df[target_col_in_df].dt.tz_convert(col_content_tz_str)
                        except Exception as e_col_content_tz: YF_FETCHER_LOGGER.warning(f"{col_log_prefix} Column content tz localization/conversion to '{col_content_tz_str}' failed: {e_col_content_tz}", exc_info=False)
                
                elif "int" in dtype_str_stored.lower():
                     YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting content to Int64. Current type: {df[target_col_in_df].dtype}")
                     df[target_col_in_df] = pd.to_numeric(df[target_col_in_df], errors='coerce').astype(pd.Int64Dtype())
                elif "float" in dtype_str_stored.lower():
                     YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting content to float. Current type: {df[target_col_in_df].dtype}")
                     df[target_col_in_df] = pd.to_numeric(df[target_col_in_df], errors='coerce').astype(float)
                elif "bool" in dtype_str_stored.lower():
                     YF_FETCHER_LOGGER.debug(f"{col_log_prefix} Converting content to boolean. Current type: {df[target_col_in_df].dtype}")
                     df[target_col_in_df] = df[target_col_in_df].map({'true': True, 'false': False, True: True, False: False, 1: True, 0: False, '1': True, '0': False, 'yes': True, 'no': False}).astype(pd.BooleanDtype())
            except Exception as e_dtype_conv: YF_FETCHER_LOGGER.warning(f"{col_log_prefix} Error converting column content to stored dtype '{dtype_str_stored}': {e_dtype_conv}", exc_info=False)
        
        YF_FETCHER_LOGGER.info(f"{log_prefix} DataFrame successfully deserialized from cache. Final shape: {df.shape}")
        # Log a df.info()-ról, ha szükséges a típusok ellenőrzéséhez
        # import io
        # buffer = io.StringIO()
        # df.info(buf=buffer)
        # YF_FETCHER_LOGGER.debug(f"{log_prefix} Deserialized DataFrame info:\n{buffer.getvalue()}")
        return df
    except KeyError as ke:
        YF_FETCHER_LOGGER.error(f"{log_prefix} DataFrame deserialization KeyError: Missing key '{ke}' in cached data structure.", exc_info=True)
        return None
    except Exception as e_deserialize:
        YF_FETCHER_LOGGER.error(f"{log_prefix} DataFrame deserialization error: {e_deserialize}", exc_info=True)
        try:
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Data_dict at error (partial keys): index_name={data_dict.get('index_name')}, index_dtype={data_dict.get('index_dtype')}, columns_names={data_dict.get('columns_names')}")
            if "data" in data_dict and isinstance(data_dict["data"], dict):
                YF_FETCHER_LOGGER.debug(f"{log_prefix} data_dict['data'] keys: {list(data_dict['data'].keys())}, data_dict['data']['columns']: {data_dict['data'].get('columns')}")
        except Exception as e_log_dd: YF_FETCHER_LOGGER.error(f"{log_prefix} Could not log data_dict details on error: {e_log_dd}")
        return None


# --- yfinance Szinkron Hívás Wrapperek ---
def _get_yfinance_ticker_sync(symbol: str) -> Optional[YFinanceTickerType]:
    if not _YFINANCE_DEPENDENCIES_MET or yf is None:
        YF_FETCHER_LOGGER.error(f"Cannot get yf.Ticker for {symbol}: yfinance library not available.")
        return None
    try:
        # A yf itt a dinamikusan importált modul.
        # A cast segít a type checkernek, hogy tudja, mit várunk.
        ticker_obj = yf.Ticker(symbol)
        return cast(YFinanceTickerType, ticker_obj)
    except Exception as e:
        YF_FETCHER_LOGGER.error(f"Failed to get yf.Ticker for {symbol}: {e}", exc_info=False) # exc_info=False lehet itt ok, ha gyakori hiba
        return None

def _get_yf_history_sync(ticker: YFinanceTickerType, period: str, interval: str) -> Optional[pd.DataFrame]:
    ticker_name = getattr(ticker, 'ticker', 'unknown_ticker_object')
    if ticker is None:
        YF_FETCHER_LOGGER.error(f"Cannot get history for {ticker_name}: ticker object is None.")
        return None
    if not _YFINANCE_DEPENDENCIES_MET: # Bár ha idáig eljut, valószínűleg rendben van
        YF_FETCHER_LOGGER.error(f"Cannot get history for {ticker_name}: yfinance dependency not met.")
        return None
    try:
        df = ticker.history(period=period, interval=interval)
        if not isinstance(df, pd.DataFrame):
            YF_FETCHER_LOGGER.error(f"ticker.history for {ticker_name} did not return DataFrame (got {type(df)}).")
            return None
        return df
    except Exception as e:
        YF_FETCHER_LOGGER.error(f"Exception in ticker.history for {ticker_name} ({period}, {interval}): {e}", exc_info=True)
        return None

def _get_yf_info_sync(ticker: YFinanceTickerType) -> Optional[Dict[str, Any]]:
    ticker_name = getattr(ticker, 'ticker', 'unknown_ticker_object')
    if ticker is None:
        YF_FETCHER_LOGGER.error(f"Cannot get info for {ticker_name}: ticker object is None.")
        return None
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"Cannot get info for {ticker_name}: yfinance dependency not met.")
        return None
    try:
        info_dict = ticker.info
        if not isinstance(info_dict, dict):
            YF_FETCHER_LOGGER.error(f"ticker.info for {ticker_name} did not return dict (got {type(info_dict)}).")
            return None
        if not info_dict: # Üres dict is lehet valid válasz, de érdemes logolni
            YF_FETCHER_LOGGER.warning(f"ticker.info for {ticker_name} returned an empty dictionary.")
        return info_dict
    except Exception as e:
        YF_FETCHER_LOGGER.error(f"Exception in ticker.info for {ticker_name}: {e}", exc_info=True)
        return None

def _get_yf_financial_statement_sync(ticker: YFinanceTickerType, statement_type: str) -> Optional[pd.DataFrame]:
    ticker_name = getattr(ticker, 'ticker', 'unknown_ticker_object')
    if ticker is None:
        YF_FETCHER_LOGGER.error(f"Cannot get financial statement '{statement_type}' for {ticker_name}: ticker object is None.")
        return None
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"Cannot get financial statement '{statement_type}' for {ticker_name}: yfinance dependency not met.")
        return None

    df: Optional[pd.DataFrame] = None
    try:
        if statement_type == "income_stmt": df = ticker.financials
        elif statement_type == "balance_sheet": df = ticker.balance_sheet
        elif statement_type == "cashflow": df = ticker.cashflow
        elif statement_type == "quarterly_income_stmt": df = ticker.quarterly_financials
        elif statement_type == "quarterly_balance_sheet": df = ticker.quarterly_balance_sheet
        elif statement_type == "quarterly_cashflow": df = ticker.quarterly_cashflow
        else:
            YF_FETCHER_LOGGER.error(f"Unknown financial statement type '{statement_type}' for {ticker_name}.")
            return None

        if df is None: # Ha a yfinance property maga None-t ad vissza
            YF_FETCHER_LOGGER.warning(f"Financial statement '{statement_type}' for {ticker_name} resulted in None directly from yfinance property.")
            return None
        if not isinstance(df, pd.DataFrame):
            YF_FETCHER_LOGGER.error(f"Financial statement '{statement_type}' for {ticker_name} was not a DataFrame (got {type(df)}).")
            return None
        # Az üres DataFrame valid lehet, ha nincs adat. Ezt a hívó kezeli.
        return df
    except Exception as e:
        YF_FETCHER_LOGGER.error(f"Exception fetching financial statement '{statement_type}' for {ticker_name}: {e}", exc_info=True)
        return None

def _get_yf_news_sync(ticker: YFinanceTickerType) -> Optional[List[Dict[str, Any]]]:
    ticker_name = getattr(ticker, 'ticker', 'unknown_ticker_object')
    if ticker is None:
        YF_FETCHER_LOGGER.error(f"Cannot get news for {ticker_name}: ticker object is None.")
        return None
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"Cannot get news for {ticker_name}: yfinance dependency not met.")
        return None
    try:
        news_list = ticker.news
        if not isinstance(news_list, list):
            YF_FETCHER_LOGGER.error(f"ticker.news for {ticker_name} did not return list (got {type(news_list)}).")
            return None
        # Ellenőrizzük a lista tartalmát is, ha nem üres
        if news_list and not all(isinstance(item, dict) for item in news_list):
            YF_FETCHER_LOGGER.error(f"ticker.news for {ticker_name} list contains non-dictionary items.")
            # Dönthetünk úgy, hogy visszaadjuk a részleges/hibás listát, vagy None-t.
            # A biztonság kedvéért None, ha a struktúra nem várt.
            return None
        return news_list # Üres lista is valid válasz
    except Exception as e:
        YF_FETCHER_LOGGER.error(f"Exception in ticker.news for {ticker_name}: {e}", exc_info=False)
        return None

# --- Helper a DatetimeIndex konzisztenciájának biztosítására ---
def _ensure_datetime_index(df: pd.DataFrame, log_prefix: str) -> Optional[pd.DataFrame]:
    """
    Ensures the DataFrame's index is a timezone-aware (UTC) DatetimeIndex.
    Returns a new DataFrame copy or None on failure.
    """
    if df is None: # Extra védelem
        YF_FETCHER_LOGGER.warning(f"{log_prefix} _ensure_datetime_index received None DataFrame.")
        return None

    df_copy = df.copy() # Mindig másolaton dolgozunk

    if not isinstance(df_copy.index, pd.DatetimeIndex):
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Index is not DatetimeIndex (type: {type(df_copy.index)}). Attempting conversion.")
        try:
            df_copy.index = pd.to_datetime(df_copy.index, errors='raise') # 'raise' hogy észrevegyük a hibát
        except Exception as e:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to convert index to DatetimeIndex: {e}. Original index: {df_copy.index[:5]}")
            return None # Sikertelen konverzió

    # Időzóna kezelése
    if df_copy.index.tz is None:
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Index is timezone-naive. Localizing to UTC.")
        try:
            df_copy.index = df_copy.index.tz_localize('UTC')
        except Exception as e_loc: # Pl. AmbiguousTimeError, NonExistentTimeError
             YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to localize naive index to UTC: {e_loc}. This can happen with DST transitions if data is not truly UTC.")
             # Fallback: feltételezzük, hogy UTC-szerű, és megpróbáljuk erőltetni. Ez adatvesztéssel járhat, óvatosan!
             # Alternatíva: visszatérés None-nal, ha a lokalizálás nem sikerül. Most maradjunk a None-nál.
             return None
    elif str(df_copy.index.tz).upper() != 'UTC': # Már van időzóna, de nem UTC
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Index is timezone-aware ({df_copy.index.tz}) but not UTC. Converting to UTC.")
        try:
            df_copy.index = df_copy.index.tz_convert('UTC')
        except Exception as e_conv:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to convert index from {df_copy.index.tz} to UTC: {e_conv}")
            return None
    # Ha már UTC, akkor nincs teendő
    return df_copy

# --- Fetcher Függvények ---

async def fetch_ohlcv(
    symbol: str, years: int, cache: CacheService, interval: str = "1d", force_refresh: bool = False
) -> Optional[pd.DataFrame]:
    """Fetches and preprocesses OHLCV data from yfinance."""
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"fetch_ohlcv({symbol}): Aborting, yfinance core dependencies not met.")
        return None

    live_fetch_attempted: bool = False
    df_to_return: Optional[pd.DataFrame] = None # Alapértelmezett visszatérési érték hiba esetén

    symbol_upper = symbol.upper()
    # `years` legyen legalább 1, de yfinance a `period` stringet várja
    period_str = f"{max(1, int(years))}y"
    source, data_type_name = "yfinance", "ohlcv_v2" # v2 a jobb szerializálás/deszerializálás miatt
    log_prefix = f"[{symbol_upper}][{source}_{data_type_name}][{period_str}:{interval}]"
    cache_key: Optional[str] = None

    try:
        cache_key_params = {"years": years, "interval": interval, "v": "2.0"} # Verziózás a cache key-ben
        cache_key = generate_cache_key(data_type_name, source, symbol_upper, params=cache_key_params)
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e: # generate_cache_key dobhatja ezt
        YF_FETCHER_LOGGER.error(f"{log_prefix} Cache key generation error: {e}", exc_info=True)
        return None # Cache kulcs nélkül nem tudunk továbbmenni

    # 1. Cache olvasási kísérlet
    if not force_refresh and cache_key: # Csak ha van cache és nem kényszerített a frissítés
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to read from cache.")
        try:
            cached_val = await cache.get(cache_key)
            if cached_val is not None:
                if cached_val == FETCH_FAILED_MARKER:
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (failure marker). Returning None.")
                    return None
                if isinstance(cached_val, dict): # Feltételezzük, hogy a szerializált DataFrame dict
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (data). Deserializing DataFrame.")
                    df_from_cache = _deserialize_dataframe_from_cache(cached_val, log_prefix, index_is_datetime=True)
                    if df_from_cache is not None:
                        # Itt már a _deserialize_dataframe_from_cache kezeli az indexet, de egy _ensure_datetime_index
                        # még egy utolsó ellenőrzést és UTC konverziót végezhet, ha szükséges.
                        df_processed = _ensure_datetime_index(df_from_cache, f"{log_prefix}[cache_reprocess]")
                        if df_processed is not None:
                            YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully deserialized and processed OHLCV from cache. Shape: {df_processed.shape}. Returning cached data.")
                            return df_processed
                        else:
                            YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to ensure DatetimeIndex for cached OHLCV. Invalidating cache entry.")
                            await cache.delete(cache_key) # Hibás adat, töröljük
                    else:
                        YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to deserialize OHLCV from cache. Invalidating cache entry.")
                        await cache.delete(cache_key) # Hibás adat, töröljük
                else: # Váratlan típus a cache-ben
                    YF_FETCHER_LOGGER.warning(f"{log_prefix} Invalid data type found in cache for OHLCV (expected dict, got {type(cached_val)}). Invalidating.")
                    await cache.delete(cache_key)
        except Exception as e: # Bármilyen hiba a cache olvasásakor
            YF_FETCHER_LOGGER.error(f"{log_prefix} Cache GET error: {e}", exc_info=True)
            # Hiba esetén folytatjuk a live fetch-csel, mintha cache miss lenne
    elif force_refresh and cache_key:
        YF_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested. Skipping cache read for key '{cache_key}'.")

    # 2. Live adatlekérés (ha cache miss, invalid cache, vagy force_refresh)
    YF_FETCHER_LOGGER.info(f"{log_prefix} Proceeding with LIVE data fetch attempt.")
    live_fetch_attempted = True
    fetch_start_time = time.monotonic()

    try:
        yf_ticker_obj = await asyncio.to_thread(_get_yfinance_ticker_sync, symbol_upper)
        if not yf_ticker_obj: # Ha a _get_yfinance_ticker_sync None-t ad vissza
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to obtain yfinance ticker object for '{symbol_upper}'.")
            # df_to_return marad None
        else:
            history_df_raw = await asyncio.to_thread(_get_yf_history_sync, yf_ticker_obj, period_str, interval)
            fetch_duration = time.monotonic() - fetch_start_time
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch attempt completed in {fetch_duration:.4f}s.")

            if history_df_raw is None: # Ha a _get_yf_history_sync None-t ad vissza
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to fetch live OHLCV data (history_df_raw is None).")
                # df_to_return marad None
            elif history_df_raw.empty:
                YF_FETCHER_LOGGER.info(f"{log_prefix} Fetched EMPTY OHLCV DataFrame live.")
                empty_df_processed = _ensure_datetime_index(history_df_raw, f"{log_prefix}[empty_df_process]")
                if empty_df_processed is None:
                     YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to process index for empty live DataFrame. This is unexpected.")
                     # df_to_return marad None # Marad None, mert a hibaüzenet erre utal
                else:
                    df_to_return = empty_df_processed
            else: # Van adat a history_df_raw-ban
                YF_FETCHER_LOGGER.info(f"{log_prefix} Fetched {len(history_df_raw)} raw data points live. Processing...")
                
                cleaned_df = history_df_raw.copy() # Másolaton dolgozunk

                            # === JAVÍTOTT OSZLOPNÉV NORMALIZÁLÁS ===
            original_columns = list(cleaned_df.columns)
            cleaned_df.columns = [str(col).lower().replace(' ', '_') for col in cleaned_df.columns]
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Normalized column names from {original_columns} to {list(cleaned_df.columns)}.")

            if 'adj_close' not in cleaned_df.columns:
                potential_adj_names = ['adjusted_close', 'adjclose', 'adj close'] # Az 'adj close' hozzáadva
                found_and_renamed = False
                for potential_name in potential_adj_names:
                    if potential_name in cleaned_df.columns: # Itt is a normalizált oszlopnevek között kell keresni
                        cleaned_df.rename(columns={potential_name: 'adj_close'}, inplace=True)
                        YF_FETCHER_LOGGER.info(f"{log_prefix} Renamed column '{potential_name}' to 'adj_close'.")
                        found_and_renamed = True
                        break
                if not found_and_renamed:
                    YF_FETCHER_LOGGER.warning(f"{log_prefix} 'adj_close' column not found and could not be renamed from potential alternatives. Available after normalization: {list(cleaned_df.columns)}")
            # === VÉGE JAVÍTOTT OSZLOPNÉV NORMALIZÁLÁS ===

                # Kötelező oszlopok ellenőrzése (OHLCV_REQUIRED_COLS-t feltételezve)
               # Ez az if blokk már megvolt az átnevezéshez...
                    if not found_and_renamed: # Ez a feltétel fontos! Csak akkor fussunk le, ha az átnevezés nem sikerült.
                        # Ha továbbra sincs 'adj_close', de van 'close', akkor használjuk azt 'adj_close'-ként
                        # Ez feltételezi, hogy a yfinance auto_adjust=True (alapértelmezett)
                        if 'close' in cleaned_df.columns:
                            YF_FETCHER_LOGGER.info(f"{log_prefix} 'adj_close' column not found after attempting rename. Using 'close' column as 'adj_close'. (Assumes yfinance auto_adjust=True)")
                            cleaned_df['adj_close'] = cleaned_df['close'] # << A LÉNYEG!
                        else:
                            # Ha 'close' sincs, akkor tényleg baj van, de ez ritka.
                            YF_FETCHER_LOGGER.warning(f"{log_prefix} 'adj_close' column not found and 'close' column also missing. Cannot create 'adj_close'. Available: {list(cleaned_df.columns)}")
                    # Az if not found_and_renamed blokk vége
                    # Itt jön a KÖVETKEZŐ lépés, a missing_cols ellenőrzése:
                    missing_cols = [col for col in OHLCV_REQUIRED_COLS if col not in cleaned_df.columns]
                    if missing_cols:
                        YF_FETCHER_LOGGER.error(f"{log_prefix} Live data MIssiNG required OHLCV columns: {missing_cols} even after normalization. Available columns: {list(cleaned_df.columns)}. Cannot proceed with this data.")
                        # df_to_return marad None
                    else:
                        # Index biztosítása (DatetimeIndex, UTC)
                        processed_df = _ensure_datetime_index(cleaned_df, f"{log_prefix}[live_df_process]")
                        if processed_df is None:
                            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to ensure DatetimeIndex for live OHLCV data.")
                            # df_to_return marad None
                        else:
                            # Csak a szükséges oszlopok kiválasztása és típuskonverzió
                            final_df = processed_df[OHLCV_REQUIRED_COLS].copy()
                            
                            # Volume explicit int konverzió, NaN -> 0 (és egyéb numerikus oszlopok float-ra)
                            for col in OHLCV_REQUIRED_COLS:
                                if col == 'volume':
                                    final_df[col] = pd.to_numeric(final_df[col], errors='coerce').fillna(0).astype(int)
                                else: # open, high, low, close, adj_close
                                    final_df[col] = pd.to_numeric(final_df[col], errors='coerce').astype(float) # Legyen float

                            # Ellenőrizzük a NaN értékeket az OHLC és adj_close oszlopokban
                            # A volume már kezelt (fillna(0))
                            cols_to_check_for_nan = ['open', 'high', 'low', 'close', 'adj_close']
                            if final_df[cols_to_check_for_nan].isnull().values.any():
                                nan_counts = final_df[cols_to_check_for_nan].isnull().sum()
                                YF_FETCHER_LOGGER.warning(f"{log_prefix} NaN values found in critical OHLC/adj_close data after processing. Counts: {nan_counts[nan_counts > 0].to_dict()}. This may indicate data quality issues from source or conversion problems.")
                                # Itt dönthetsz úgy, hogy hibát dobsz, vagy folytatod NaN értékekkel
                                # Jelenleg a kód folytatódik. Ha nem akarod, hogy folytatódjon:
                                # df_to_return = None # És a log üzenet is kritikusabb lehet
                            
                            df_to_return = final_df
                            YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully processed live OHLCV data. Shape: {df_to_return.shape}.")
    except Exception as e: # Váratlan hiba a live fetch vagy feldolgozás során
        YF_FETCHER_LOGGER.critical(f"{log_prefix} Unexpected critical error during live OHLCV fetch or processing: {e}", exc_info=True)
        df_to_return = None # Biztosítjuk, hogy None legyen a visszatérési érték

    # 3. Cache írása (ha történt live fetch kísérlet és van cache)
    if live_fetch_attempted and cache_key: # cache_key itt már biztosan nem None
        if df_to_return is not None and not df_to_return.empty and df_to_return[OHLCV_REQUIRED_COLS[:-1]].notna().values.any(): # Legalább egy érték nem NaN a fő oszlopokban (volume kivételével)
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to serialize and cache successful OHLCV data (shape: {df_to_return.shape}).")
            serialized_df = _serialize_dataframe_for_cache(df_to_return, log_prefix)
            if serialized_df:
                try:
                    await cache.set(cache_key, serialized_df, YFINANCE_OHLCV_TTL)
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully cached live OHLCV data.")
                except Exception as e_cache_set:
                    YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache successfully fetched/processed OHLCV data: {e_cache_set}", exc_info=True)
                    # Opcionális: itt is cache-elhetnénk FETCH_FAILED_MARKER-t, de ez azt jelentené, hogy a következő kérés is sikertelen lesz,
                    # pedig az adat megvolt, csak a cache-elés nem sikerült. Ez üzleti döntés kérdése.
            else: # Szerializálás nem sikerült
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to serialize processed OHLCV data for caching. Caching failure marker instead.")
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_marker:
                    YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker after serialization error: {e_cache_set_marker}", exc_info=True)
        else: # df_to_return is None, azaz a live fetch/process sikertelen volt
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live OHLCV fetch/processing resulted in None. Caching failure marker.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Successfully cached failure marker for OHLCV.")
            except Exception as e_cache_set_failure:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for OHLCV: {e_cache_set_failure}", exc_info=True)

    return df_to_return


async def fetch_company_info_dict(
    ticker_symbol: str, cache: CacheService, force_refresh: bool = False
) -> Optional[Dict[str, Any]]:
    """Fetches company information dictionary from yfinance."""
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"fetch_company_info_dict({ticker_symbol}): Aborting, yfinance core dependencies not met.")
        return None

    live_fetch_attempted: bool = False
    info_to_return: Optional[Dict[str, Any]] = None

    symbol_upper = ticker_symbol.upper()
    source, data_type_name = "yfinance", "company_info_v2" # Verziózás
    log_prefix = f"[{symbol_upper}][{source}_{data_type_name}]"
    cache_key: Optional[str] = None

    try:
        cache_key = generate_cache_key(data_type_name, source, symbol_upper, params={"v":"2.0"})
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e:
        YF_FETCHER_LOGGER.error(f"{log_prefix} Cache key generation error: {e}", exc_info=True)
        return None

    # Cache Read
    if not force_refresh and cache_key:
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to read from cache.")
        try:
            cached_val = await cache.get(cache_key)
            if cached_val is not None:
                if cached_val == FETCH_FAILED_MARKER:
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (failure marker). Returning None.")
                    return None
                if isinstance(cached_val, dict):
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (data). Returning company info from cache (keys: {len(cached_val)}).")
                    return cached_val # A dict közvetlenül cache-elhető és visszaadható
                else:
                    YF_FETCHER_LOGGER.warning(f"{log_prefix} Invalid company info cache type (expected dict, got {type(cached_val)}). Invalidating.")
                    await cache.delete(cache_key)
        except Exception as e:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Cache GET error: {e}", exc_info=True)
    elif force_refresh and cache_key:
        YF_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested. Skipping cache read.")

    # Live Fetch
    YF_FETCHER_LOGGER.info(f"{log_prefix} Proceeding with LIVE data fetch attempt.")
    live_fetch_attempted = True
    fetch_start_time = time.monotonic()

    try:
        yf_ticker_obj = await asyncio.to_thread(_get_yfinance_ticker_sync, symbol_upper)
        if not yf_ticker_obj:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to obtain yfinance ticker object for '{symbol_upper}'.")
        else:
            info_dict_raw = await asyncio.to_thread(_get_yf_info_sync, yf_ticker_obj)
            fetch_duration = time.monotonic() - fetch_start_time
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch attempt completed in {fetch_duration:.4f}s.")

            if info_dict_raw is None: # _get_yf_info_sync None-t adott vissza
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to fetch live company info (info_dict_raw is None).")
            elif not info_dict_raw: # Üres dict-et adott vissza (pl. ticker nem létezik)
                 YF_FETCHER_LOGGER.warning(f"{log_prefix} Fetched EMPTY company info dict live. This usually means no data is available for the ticker or ticker is invalid.")
                 # Kezelhetjük ezt sikeres, de üres adatként, vagy hibaként.
                 # Ha hibaként kezeljük, akkor info_to_return marad None, és failure marker kerül cache-be.
                 # Ha sikeres üres adatként, info_to_return = {} és ez kerül cache-be.
                 # Jelenlegi logika (failure marker):
                 info_to_return = None # Failure marker lesz cache-elve
            else: # Sikeresen kaptunk nem üres dict-et
                 # === JAVÍTÁS KEZDETE a 848. sor környékén ===
                # Az eredeti hibás ellenőrzés helyett, ami az AttributeErrort okozta:
                # if info_to_return is not None and any(df is not None and not df.empty for df in info_to_return.values()):
                #     info_to_return = info_dict_raw # Ez a sorrend fura volt, info_to_return itt még nincs definiálva
                # else:
                #     YF_FETCHER_LOGGER.warning(f"{log_prefix} Live company info dict is None or all its values are None/empty DataFrames. Fetch considered failed.")
                #     info_to_return = None

                # Helyesebb megközelítés:
                # Ha idáig eljutottunk, info_dict_raw egy nem None, nem üres dictionary.
                # Itt most nem kell tovább szűrni az info_dict_raw tartalmát df.empty alapján,
                # mert az info_dict_raw általában nem DataFrame-eket tartalmaz, hanem közvetlen értékeket,
                # listákat vagy más dict-eket. A df.empty ellenőrzés itt nem releváns és hibát okoz.
                # Egyszerűen elfogadjuk az info_dict_raw-t, ha nem None és nem üres.
                info_to_return = info_dict_raw
                YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully fetched live company info (keys: {len(info_to_return)}).")
                # === JAVÍTÁS VÉGE ===
    except Exception as e:
        YF_FETCHER_LOGGER.critical(f"{log_prefix} Unexpected critical error during live company info fetch: {e}", exc_info=True)
        info_to_return = None

    # Cache Write
    if live_fetch_attempted and cache_key:
        # === JAVÍTÁS a cache írás feltételében ===
        # Az eredeti: if info_to_return is not None and any(df is not None and not df.empty for df in info_to_return.values()):
        # Ez itt is hibát okozna, ha info_to_return stringeket tartalmaz.
        # Egyszerűsítsük: ha info_to_return nem None (azaz a fetch sikeres volt és adatot kaptunk), akkor cache-eljük.
        if info_to_return is not None: # Akár üres dict is lehet, ha azt tekintjük validnak
        # === JAVÍTÁS VÉGE ===
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to cache successful company info.")
            try:
                # A dict-ek általában JSON szerializálhatók, ha standard Python típusokat tartalmaznak.
                # yfinance .info néha tartalmazhat nem-JSON-szerializálható elemeket (pl. datetime).
                # A CacheService-nek ezt kezelnie kellene, vagy itt kellene egy try-except a cache.set körül.
                await cache.set(cache_key, info_to_return, YFINANCE_COMPANY_INFO_TTL)
                YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully cached live company info.")
            except TypeError as te: # Ha a cache.set dobja a nem JSON szerializálható hibát
                YF_FETCHER_LOGGER.error(f"{log_prefix} Company info dict contains non-JSON-serializable data: {te}. Caching failure marker.", exc_info=False) # exc_info=False elég lehet itt
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_te_failure:
                     YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker after TypeError: {e_cache_set_te_failure}", exc_info=True)
            except Exception as e_cache_set:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache successful company info: {e_cache_set}. Caching failure marker.", exc_info=True)
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL) # Fallback
                except Exception as e_cache_set_generic_failure:
                     YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker after generic cache set error: {e_cache_set_generic_failure}", exc_info=True)
        else: # info_to_return is None (vagy üres dict, amit hibaként kezeltünk)
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch for company info resulted in None or empty. Caching failure marker.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Successfully cached failure marker for company info.")
            except Exception as e_cache_set_failure:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for company info: {e_cache_set_failure}", exc_info=True)

    return info_to_return


async def fetch_financial_data_dfs(
    ticker_symbol: str, cache: CacheService, force_refresh: bool = False
) -> Optional[Dict[str, Optional[pd.DataFrame]]]:
    """Fetches financial statements (income, balance, cashflow - annual and quarterly) as DataFrames."""
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"fetch_financial_data_dfs({ticker_symbol}): Aborting, yfinance core dependencies not met.")
        return None

    live_fetch_attempted: bool = False
    # A visszatérési dict kulcsai a statement_map kulcsai lesznek.
    # Az értékek lehetnek DataFrame-ek vagy None, ha az adott statement nem elérhető/hiba történt.
    financials_to_return: Optional[Dict[str, Optional[pd.DataFrame]]] = None

    symbol_upper = ticker_symbol.upper()
    source, data_type_name = "yfinance", "financials_dict_v3" # Verziózás
    log_prefix = f"[{symbol_upper}][{source}_{data_type_name}]"
    cache_key: Optional[str] = None

    statement_map = {
        "income_annual": "income_stmt",
        "balance_annual": "balance_sheet",
        "cashflow_annual": "cashflow",
        "income_quarterly": "quarterly_income_stmt",
        "balance_quarterly": "quarterly_balance_sheet",
        "cashflow_quarterly": "quarterly_cashflow"
    }

    try:
        cache_key = generate_cache_key(data_type_name, source, symbol_upper, params={"v":"3.0"})
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e:
        YF_FETCHER_LOGGER.error(f"{log_prefix} Cache key generation error: {e}", exc_info=True)
        return None

    # Cache Read
    if not force_refresh and cache_key:
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to read financials from cache.")
        try:
            cached_val = await cache.get(cache_key)
            if cached_val is not None:
                if cached_val == FETCH_FAILED_MARKER:
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (failure marker). Returning None for financials.")
                    return None
                if isinstance(cached_val, dict):
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (data). Deserializing financials dict.")
                    reconstructed_dict: Dict[str, Optional[pd.DataFrame]] = {}
                    valid_cache_data = True
                    for key_clean in statement_map.keys(): # Iteráljunk a várt kulcsokon
                        if key_clean not in cached_val:
                            YF_FETCHER_LOGGER.warning(f"{log_prefix} Financials cache data corrupt: missing key '{key_clean}'. Invalidating.")
                            valid_cache_data = False; break
                        
                        serialized_df_or_none = cached_val[key_clean]
                        if serialized_df_or_none is None: # Ha None volt cache-elve (pl. nem volt adat)
                            reconstructed_dict[key_clean] = None
                        elif isinstance(serialized_df_or_none, dict): # Szerializált DataFrame
                            # ====> JAVÍTOTT HÍVÁS (argumentumok törölve) <====
                            df = _deserialize_dataframe_from_cache(
                                serialized_df_or_none, f"{log_prefix}[{key_clean}]"
                                # NINCS index_is_datetime=..., NINCS columns_are_datetime=...
                            )
                            # ====> HÍVÁS VÉGE <====
                            if df is not None:
                                # yfinance a pénzügyi adatok oszlopait DatetimeIndex-ként adja vissza, normalize() szükséges lehet
                                if isinstance(df.columns, pd.DatetimeIndex):
                                    df.columns = df.columns.normalize() # 00:00:00 időpontra
                                reconstructed_dict[key_clean] = df
                            else: # Deszerializálás sikertelen
                                YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to deserialize '{key_clean}' DataFrame from cache. Invalidating.")
                                valid_cache_data = False; break
                        else: # Váratlan típus a dict-en belül
                            YF_FETCHER_LOGGER.warning(f"{log_prefix} Invalid type for '{key_clean}' in cached financials (expected dict or None, got {type(serialized_df_or_none)}). Invalidating.")
                            valid_cache_data = False; break
                    
                    if valid_cache_data and len(reconstructed_dict) == len(statement_map):
                        YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully deserialized financials dict from cache.")
                        return reconstructed_dict
                    elif not valid_cache_data: # Ha hiba volt a deszerializálás közben
                         await cache.delete(cache_key)
                else: # Váratlan típus a cache-ben
                    YF_FETCHER_LOGGER.warning(f"{log_prefix} Invalid financials cache type (expected dict, got {type(cached_val)}). Invalidating.")
                    await cache.delete(cache_key)
        except Exception as e:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Cache GET error for financials: {e}", exc_info=True)
    elif force_refresh and cache_key:
        YF_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested for financials. Skipping cache read.")

    # Live Fetch
    YF_FETCHER_LOGGER.info(f"{log_prefix} Proceeding with LIVE data fetch for all financial statements.")
    live_fetch_attempted = True
    fetch_start_time = time.monotonic()
    
    try:
        yf_ticker_obj = await asyncio.to_thread(_get_yfinance_ticker_sync, symbol_upper)
        if not yf_ticker_obj:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to obtain yfinance ticker object for '{symbol_upper}' for financials fetch.")
            # financials_to_return marad None
        else:
            # Párhuzamos lekérések asyncio.gather-rel
            tasks = {
                key_clean: asyncio.to_thread(_get_yf_financial_statement_sync, yf_ticker_obj, yf_property_name)
                for key_clean, yf_property_name in statement_map.items()
            }
            # A tasks.values() sorrendje megmarad a gather eredményében
            task_results_raw = await asyncio.gather(*tasks.values(), return_exceptions=True)
            fetch_duration = time.monotonic() - fetch_start_time
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch for all financial statements completed in {fetch_duration:.4f}s.")

            fetched_results_dict: Dict[str, Optional[pd.DataFrame]] = {}
            any_actual_data_fetched = False # Volt-e legalább egy nem üres DF?
            all_fetches_failed_or_empty = True # Minden fetch None vagy üres DF volt-e?

            clean_keys_ordered = list(tasks.keys()) # Megtartjuk a sorrendet
            for i, key_clean in enumerate(clean_keys_ordered):
                result_or_exc = task_results_raw[i]
                stmt_log_prefix = f"{log_prefix}[{key_clean}]"

                if isinstance(result_or_exc, Exception):
                    YF_FETCHER_LOGGER.error(f"{stmt_log_prefix} Exception during live fetch: {result_or_exc}", exc_info=False) # exc_info=False, mert a gather már becsomagolta
                    fetched_results_dict[key_clean] = None
                elif isinstance(result_or_exc, pd.DataFrame):
                    YF_FETCHER_LOGGER.debug(f"{stmt_log_prefix} Successfully fetched. Shape: {result_or_exc.shape if not result_or_exc.empty else 'Empty DF'}.")
                    # Oszlopok normalizálása, ha DatetimeIndex
                    if isinstance(result_or_exc.columns, pd.DatetimeIndex):
                        result_or_exc.columns = result_or_exc.columns.normalize()
                    
                    fetched_results_dict[key_clean] = result_or_exc
                    all_fetches_failed_or_empty = False # Legalább egy fetch sikeres volt (akár üres DF-fel)
                    if not result_or_exc.empty:
                        any_actual_data_fetched = True
                else: # result_or_exc is None (a _get_yf_financial_statement_sync None-t adott vissza)
                    YF_FETCHER_LOGGER.debug(f"{stmt_log_prefix} Live fetch resulted in None (likely no data available or error in sync wrapper).")
                    fetched_results_dict[key_clean] = None
            
            # Döntés a visszatérési értékről
            if all_fetches_failed_or_empty and not any_actual_data_fetched:
                # Ha minden fetch None volt (nem csak üres DF), akkor tekinthetjük teljes kudarcnak.
                # Ha pl. mindenhol üres DF jött, az technikailag sikeres, de adat nélküli.
                # A jelenlegi logika szerint, ha minden fetch None-t ad vissza, akkor financials_to_return None lesz.
                # Ha van legalább egy (akár üres) DataFrame, akkor a fetched_results_dict lesz a financials_to_return.
                # Ez a feltétel lehet, hogy finomításra szorul attól függően, hogy mit tekintünk "sikeres" fetch-nek.
                # Ha minden None, akkor a `fetched_results_dict` tele lesz None-okkal.
                # Ha az a cél, hogy ha SEMMI adat nincs, akkor None-t adjunk vissza, akkor:
                if all(value is None for value in fetched_results_dict.values()):
                     YF_FETCHER_LOGGER.warning(f"{log_prefix} All financial statement fetches resulted in None. Overall fetch considered failed.")
                     financials_to_return = None
                else:
                     financials_to_return = fetched_results_dict # Van legalább egy (akár üres) DF
                     YF_FETCHER_LOGGER.info(f"{log_prefix} Financials live fetch processing complete. Actual data fetched for at least one statement: {any_actual_data_fetched}.")

            else: # Volt legalább egy sikeres (akár üres) DF
                financials_to_return = fetched_results_dict
                YF_FETCHER_LOGGER.info(f"{log_prefix} Financials live fetch processing complete. Actual data fetched for at least one statement: {any_actual_data_fetched}.")

    except Exception as e: # Váratlan hiba a gather vagy a ticker lekérés körül
        YF_FETCHER_LOGGER.critical(f"{log_prefix} Unexpected critical error during live financials fetch setup or gathering: {e}", exc_info=True)
        financials_to_return = None

    # Cache Write
    if live_fetch_attempted and cache_key:
        if financials_to_return is not None: # Ha van mit cache-elni (akár None-okat tartalmazó dict)
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to serialize and cache financials dict.")
            data_to_cache: Dict[str, Optional[Dict]] = {} # Szerializált DataFrame-ek vagy None-ok
            all_individual_serializations_ok = True
            for key, df_or_none in financials_to_return.items():
                if df_or_none is None:
                    data_to_cache[key] = None
                else: # df_or_none egy DataFrame
                    serialized_df = _serialize_dataframe_for_cache(df_or_none, f"{log_prefix}[{key}]_serialization")
                    if serialized_df:
                        data_to_cache[key] = serialized_df
                    else: # Szerializálás sikertelen az adott DF-re
                        YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to serialize '{key}' DataFrame for cache. Storing as None for this key in cache.")
                        data_to_cache[key] = None # Hibás DF helyett None-t cache-elünk a dict-ben
                        all_individual_serializations_ok = False # Jelzi, hogy volt hiba
            
             # ====> ÚJ DEBUG LOG KEZDETE <====
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Preparing to cache financials. Checking structure of 'data_to_cache' before cache.set...")
            try:
                # Próbáljuk meg szerializálni itt is, hogy lássuk, itt dobja-e a hibát
                json.dumps(data_to_cache, indent=2) # Csak teszteléshez, az eredményt nem használjuk
                YF_FETCHER_LOGGER.debug(f"{log_prefix} json.dumps(data_to_cache) test PASSED before cache.set.")
            except TypeError as te_before_set:
                 YF_FETCHER_LOGGER.error(f"{log_prefix} json.dumps(data_to_cache) FAILED *before* cache.set! Error: {te_before_set}", exc_info=True)
                 # Írjuk ki a problémás struktúra egy részét
                 YF_FETCHER_LOGGER.debug(f"{log_prefix} Problematic data_to_cache structure (partial, using pformat):\n{pformat(data_to_cache, depth=4, width=120)}") # Mélység és szélesség korlátozása
            except Exception as e_dump:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Unexpected error during json.dumps test before cache.set: {e_dump}", exc_info=True)
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Keys in data_to_cache: {list(data_to_cache.keys())}")
            for key, inner_dict in data_to_cache.items():
                if isinstance(inner_dict, dict):
                    YF_FETCHER_LOGGER.debug(f"{log_prefix}   - Key '{key}': Type=dict, Inner Keys: {list(inner_dict.keys())}")
                else:
                     YF_FETCHER_LOGGER.debug(f"{log_prefix}   - Key '{key}': Type={type(inner_dict)}")
            # ====> ÚJ DEBUG LOG VÉGE <====

            # data_to_cache most már a cache-elendő dict, ami tartalmazhat szerializált DF-eket vagy None-okat
            try:
                await cache.set(cache_key, data_to_cache, YFINANCE_FINANCIAL_DATA_TTL)
                YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully cached live financials dict. Individual DF serializations OK: {all_individual_serializations_ok}.")
            except Exception as e_cache_set: # Hiba a teljes dict cache-elésekor
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache the financials dict: {e_cache_set}. Caching failure marker.", exc_info=True)
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_financials_failure: # Fallback cache hiba
                    YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for financials after main set error: {e_cache_set_financials_failure}", exc_info=True)
        else: # financials_to_return is None (teljes fetch kudarc)
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch for financials resulted in overall None. Caching failure marker.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Successfully cached failure marker for financials.")
            except Exception as e_cache_set_failure:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for financials: {e_cache_set_failure}", exc_info=True)
        
    return financials_to_return


async def fetch_yfinance_news(
    symbol: str, cache: CacheService, force_refresh: bool = False
) -> Optional[List[Dict[str, Any]]]:
    """Fetches RAW news list from yfinance .news property. Returns a list of dicts."""
    if not _YFINANCE_DEPENDENCIES_MET:
        YF_FETCHER_LOGGER.error(f"fetch_yfinance_news({symbol}): Aborting, yfinance core dependencies not met.")
        return None

    live_fetch_attempted: bool = False
    news_to_return: Optional[List[Dict[str, Any]]] = None

    symbol_upper = symbol.upper()
    source, data_type_name = "yfinance", "news_raw_v2" # Verziózás
    log_prefix = f"[{symbol_upper}][{source}_{data_type_name}]"
    cache_key: Optional[str] = None

    try:
        cache_key = generate_cache_key(data_type_name, source, symbol_upper, params={"v":"2.0"})
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Generated cache key: {cache_key}")
    except ValueError as e:
        YF_FETCHER_LOGGER.error(f"{log_prefix} Cache key generation error: {e}", exc_info=True)
        return None

    # Cache Read
    if not force_refresh and cache_key:
        YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to read news from cache.")
        try:
            cached_val = await cache.get(cache_key)
            if cached_val is not None:
                if cached_val == FETCH_FAILED_MARKER:
                    YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (failure marker). Returning None for news.")
                    return None
                if isinstance(cached_val, list):
                    # Ellenőrizzük a lista elemeit is (lehet üres lista, az valid)
                    if not cached_val or all(isinstance(item, dict) for item in cached_val):
                        YF_FETCHER_LOGGER.info(f"{log_prefix} Cache HIT (data). Returning {len(cached_val)} news items from cache.")
                        return cached_val # Lista közvetlenül cache-elhető és visszaadható
                    else: # Hibás struktúra a listán belül
                        YF_FETCHER_LOGGER.warning(f"{log_prefix} Cached news list has invalid item structure (expected list of dicts). Invalidating.")
                        await cache.delete(cache_key)
                else: # Váratlan típus
                    YF_FETCHER_LOGGER.warning(f"{log_prefix} Invalid news cache type (expected list, got {type(cached_val)}). Invalidating.")
                    await cache.delete(cache_key)
        except Exception as e:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Cache GET error for news: {e}", exc_info=True)
    elif force_refresh and cache_key:
        YF_FETCHER_LOGGER.info(f"{log_prefix} Force refresh requested for news. Skipping cache read.")

    # Live Fetch
    YF_FETCHER_LOGGER.info(f"{log_prefix} Proceeding with LIVE data fetch for news.")
    live_fetch_attempted = True
    fetch_start_time = time.monotonic()
    
    try:
        yf_ticker_obj = await asyncio.to_thread(_get_yfinance_ticker_sync, symbol_upper)
        if not yf_ticker_obj:
            YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to obtain yfinance ticker object for '{symbol_upper}' for news fetch.")
        else:
            news_list_raw = await asyncio.to_thread(_get_yf_news_sync, yf_ticker_obj)
            fetch_duration = time.monotonic() - fetch_start_time
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live news fetch attempt completed in {fetch_duration:.4f}s.")

            if news_list_raw is None: # _get_yf_news_sync None-t adott vissza (hiba vagy nincs adat)
                YF_FETCHER_LOGGER.warning(f"{log_prefix} Failed to fetch live news (news_list_raw is None or invalid type from yfinance wrapper).")
                # news_to_return marad None
            else: # news_list_raw egy lista (lehet üres is, ami valid)
                news_to_return = news_list_raw # A _get_yf_news_sync már ellenőrzi a belső struktúrát
                YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully fetched {len(news_to_return)} live news items.")
        
    except Exception as e: # Váratlan hiba
        YF_FETCHER_LOGGER.critical(f"{log_prefix} Unexpected critical error during live news fetch: {e}", exc_info=True)
        news_to_return = None

    # Cache Write
    if live_fetch_attempted and cache_key:
        if news_to_return is not None: # news_to_return lehet üres lista, ami valid és cache-elendő
            YF_FETCHER_LOGGER.debug(f"{log_prefix} Attempting to cache news list (count: {len(news_to_return)}).")
            try:
                # Lista dict-ekkel általában JSON szerializálható, ha a dict-ek tartalma az.
                await cache.set(cache_key, news_to_return, YFINANCE_NEWS_TTL)
                YF_FETCHER_LOGGER.info(f"{log_prefix} Successfully cached live news list.")
            except TypeError as te: # Ha a cache.set dobja (nem JSON szerializálható)
                YF_FETCHER_LOGGER.error(f"{log_prefix} News list contains non-JSON-serializable data: {te}. Caching failure marker.", exc_info=False)
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_te_failure_news:
                     YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for news after TypeError: {e_cache_set_te_failure_news}", exc_info=True)
            except Exception as e_cache_set: # Egyéb cache hiba
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache successful news list: {e_cache_set}. Caching failure marker.", exc_info=True)
                try:
                    await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                except Exception as e_cache_set_generic_failure_news:
                     YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for news after generic cache set error: {e_cache_set_generic_failure_news}", exc_info=True)
        else: # news_to_return is None (fetch hiba)
            YF_FETCHER_LOGGER.info(f"{log_prefix} Live fetch for news resulted in None. Caching failure marker.")
            try:
                await cache.set(cache_key, FETCH_FAILED_MARKER, FETCH_FAILURE_CACHE_TTL)
                YF_FETCHER_LOGGER.debug(f"{log_prefix} Successfully cached failure marker for news.")
            except Exception as e_cache_set_failure:
                YF_FETCHER_LOGGER.error(f"{log_prefix} Failed to cache failure marker for news: {e_cache_set_failure}", exc_info=True)

    return news_to_return


# --- Modul Betöltésének Jelzése a Naplóba ---
def _log_module_load_status():
    logger_to_use = _YFINANCE_FETCHER_LOGGER_INSTANCE if _YFINANCE_FETCHER_LOGGER_INSTANCE else logging.getLogger("yfinance_fetcher_startup")
    module_name_for_log = logger_to_use.name # Használjuk a logger nevét a konzisztenciáért

    if _YFINANCE_DEPENDENCIES_MET:
        if not _INITIALIZATION_ERRORS:
            logger_to_use.info(f"--- yfinance Fetcher Module ({module_name_for_log}) loaded successfully. yfinance library is available. ---")
        else:
            logger_to_use.warning(
                f"--- yfinance Fetcher Module ({module_name_for_log}) loaded, yfinance library IS available, "
                f"but with non-critical initialization errors: {_INITIALIZATION_ERRORS}. May be partially functional. ---"
            )
    else: # _YFINANCE_DEPENDENCIES_MET is False
        # Az _INITIALIZATION_ERRORS valószínűleg tartalmazza az yfinance import hibáját
        logger_to_use.error(
            f"--- yfinance Fetcher Module ({module_name_for_log}) FAILED TO LOAD CRITICAL DEPENDENCIES. "
            f"yfinance library is NOT available. Errors: {_INITIALIZATION_ERRORS}. Module is NON-OPERATIONAL. ---"
        )

_log_module_load_status()