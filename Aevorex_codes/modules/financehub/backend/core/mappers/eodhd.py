# backend/core/mappers/eodhd.py
# ==============================================================================
# Mappers specifically for processing data obtained from the EOD Historical Data API.
# Handles OHLCV, Splits, Dividends, News, and placeholder fundamental data mapping.
# VERSION: CORRECTED BASED ON DEBUGGING
# ==============================================================================

import pandas as pd
from typing import List, Optional, Dict, Any, Union, TYPE_CHECKING
from datetime import date, datetime, timezone
import time
import logging

# --- Core Helper Imports ---
try:
    from modules.financehub.backend.utils.helpers import (
        parse_optional_float,
        parse_optional_int,
        _clean_value
    )
    helpers_imported = True
except ImportError as e_helpers:
    helpers_imported = False
    logging.basicConfig(level="CRITICAL")
    critical_logger = logging.getLogger(__name__)
    critical_logger.critical(f"FATAL ERROR: Cannot import helpers: {e_helpers}", exc_info=True)
    raise RuntimeError(f"EODHD mapper failed initialization due to missing helpers: {e_helpers}") from e_helpers

# --- Base Mapper Imports (e.g., Logger) ---
try:
    from ._mapper_base import logger
    base_imported = True
except ImportError as e_base:
    base_imported = False
    if not helpers_imported: logging.basicConfig(level="CRITICAL")
    critical_logger = logging.getLogger(__name__)
    critical_logger.critical(f"FATAL ERROR: Cannot import logger from base: {e_base}", exc_info=True)
    raise RuntimeError(f"EODHD mapper failed initialization due to missing base: {e_base}") from e_base

# --- Pydantic Modellek Importálása típusellenőrzéshez ---
if TYPE_CHECKING:
    from modules.financehub.backend.models.stock import (
        CompanyPriceHistoryEntry,
        StockSplitData,
        DividendData,
        NewsItem,
        CompanyOverview,
        FinancialStatementDataContainer # Placeholderhez
    )

# --- Configuration Import ---
try:
    from modules.financehub.backend.config import settings
except ImportError:
    logger.warning("Could not import settings from config. Using dummy settings for NODE_ENV.")
    class DummySettings:
        class DummyEnv:
            NODE_ENV = 'production'
        ENVIRONMENT = DummyEnv()
    settings = DummySettings()

# ==============================================================================
# === EODHD Specific Mappers (CORRECTED VERSION) ===
# ==============================================================================
MODULE_VERSION = "v3.0.3-restored"

def _preprocess_ohlcv_dataframe(
    ohlcv_df: pd.DataFrame,
    request_id: str,
    interval: str,
    log_prefix_base: str
) -> Optional[pd.DataFrame]:
    """
    Helper function to preprocess OHLCV DataFrame: validation, UTC conversion,
    DWM filtering, sorting, and deduplication.
    Returns the processed DataFrame or None if critical validation fails.
    """
    func_name = "_preprocess_ohlcv_dataframe"
    log_prefix = f"[{request_id}][{log_prefix_base}:{func_name}:{interval}]"

    if ohlcv_df is None or not isinstance(ohlcv_df, pd.DataFrame):
        logger.error(f"{log_prefix} Preprocessing failed: Input is None or not a DataFrame.")
        return None
    if ohlcv_df.empty:
        logger.info(f"{log_prefix} Input DataFrame is empty. No preprocessing needed.")
        # Return a copy with standardized columns if possible (or just empty copy)
        # This depends on whether the caller expects specific columns even on empty input
        return ohlcv_df.copy()

    logger.debug(f"{log_prefix} Initial input DF shape: {ohlcv_df.shape}")

    df_copy = ohlcv_df.copy() # Work on a copy

    # --- Index Validation and UTC Conversion ---
    # (Keeping original robust index handling logic)
    if not isinstance(df_copy.index, pd.DatetimeIndex):
        try:
            original_index_type = type(df_copy.index)
            df_copy.index = pd.to_datetime(df_copy.index, utc=True)
            if not isinstance(df_copy.index, pd.DatetimeIndex):
                raise TypeError("Conversion to DatetimeIndex failed.")
            logger.warning(f"{log_prefix} Converted DataFrame index from {original_index_type} to DatetimeIndex (UTC).")
        except Exception as e_conv:
            logger.error(f"{log_prefix} Preprocessing failed: DataFrame index is not DatetimeIndex (Type: {type(df_copy.index)}) and conversion failed: {e_conv}.")
            return None
    else:
        if df_copy.index.tz is None:
            logger.warning(f"{log_prefix} Input DatetimeIndex is timezone-naive. Assuming and localizing to UTC.")
            try:
                df_copy.index = df_copy.index.tz_localize('UTC')
            except TypeError: # Already localized or ambiguous time
                logger.warning(f"{log_prefix} Could not localize naive index to UTC, attempting tz_convert.")
                try:
                    df_copy.index = df_copy.index.tz_convert('UTC')
                except Exception as e_tz_convert:
                    logger.error(f"{log_prefix} Preprocessing failed: Failed to convert index to UTC: {e_tz_convert}")
                    return None
        elif str(df_copy.index.tz).upper() != 'UTC':
            logger.warning(f"{log_prefix} Input DatetimeIndex has timezone '{df_copy.index.tz}'. Converting to UTC.")
            try:
                df_copy.index = df_copy.index.tz_convert('UTC')
            except Exception as e_tz_convert:
                logger.error(f"{log_prefix} Preprocessing failed: Failed to convert index to UTC: {e_tz_convert}")
                return None

    # --- Column Validation ---
    # Expecting standard uppercase OHLCV columns from fetcher's processing
    required_cols = {'Open', 'High', 'Low', 'Close'}
    available_cols = set(df_copy.columns)
    missing_required = required_cols - available_cols

    if missing_required:
        logger.error(f"{log_prefix} Preprocessing failed: Missing critical UPPERCASE OHLC columns: {missing_required}. Available: {list(available_cols)}.")
        return None

    # Ensure Volume column exists, fill with 0 if missing (as int)
    if 'Volume' not in df_copy.columns:
        logger.warning(f"{log_prefix} 'Volume' column missing. Adding as 0.")
        df_copy['Volume'] = 0
    df_copy['Volume'] = pd.to_numeric(df_copy['Volume'], errors='coerce').fillna(0).astype(int)


    if settings.ENVIRONMENT.NODE_ENV == 'development':
        logger.debug(f"{log_prefix} Input DF Info (Pre-Filtering) - Index: {df_copy.index.name}, TZ: {df_copy.index.tz}, Columns: {list(df_copy.columns)}")

    pre_processing_start = time.monotonic()

    # --- Weekend Filtering (DWM) ---
    # (Keeping original robust logic)
    normalized_interval = interval.upper() if interval else ""
    is_dwm_interval = any(char in normalized_interval for char in ['D', 'W', 'M'])
    rows_before_filter = len(df_copy)
    
    if is_dwm_interval:
        logger.debug(f"{log_prefix} DEBUG WEEKEND FILTER: Checking interval '{interval}' (Is DWM: {is_dwm_interval}). Rows BEFORE: {rows_before_filter}")
        logger.debug(f"{log_prefix} DataFrame head BEFORE weekend filter:\n{df_copy.head().to_string()}")
        try:
            if df_copy.index.tz is None or str(df_copy.index.tz).upper() != 'UTC':
                 logger.warning(f"{log_prefix} Index TZ is '{df_copy.index.tz}' not UTC before DWM filter. Re-converting.")
                 df_copy.index = df_copy.index.tz_convert('UTC')
            
            logger.debug(f"{log_prefix} DEBUG WEEKEND FILTER: Index TZ CONFIRMED for filtering: {df_copy.index.tz}")
            
            original_index_name = df_copy.index.name
            df_copy = df_copy[df_copy.index.dayofweek < 5] # Monday=0, Sunday=6
            df_copy.index.name = original_index_name # Restore index name if needed
            filtered_rows_after = len(df_copy)
            logger.info(f"{log_prefix} DEBUG WEEKEND FILTER: Rows AFTER filter: {filtered_rows_after} (Removed: {rows_before_filter - filtered_rows_after})")
            logger.debug(f"{log_prefix} DataFrame head AFTER weekend filter:\n{df_copy.head().to_string()}")

            if df_copy.empty and rows_before_filter > 0:
                logger.warning(f"{log_prefix} DataFrame empty after weekend filter. Proceeding with empty DataFrame.")
            elif rows_before_filter > 0 and rows_before_filter == filtered_rows_after:
                 logger.info(f"{log_prefix} Weekend filter did not remove any rows for DWM interval.")
        except Exception as e_filter_dwm:
             logger.error(f"{log_prefix} ERROR during weekend filter: {e_filter_dwm}", exc_info=True)
             logger.warning(f"{log_prefix} Proceeding without weekend filter due to error.")

    # --- Sorting and Deduplication ---
    # (Keeping original robust logic)
    if not df_copy.index.is_monotonic_increasing:
        logger.debug(f"{log_prefix} Sorting DataFrame index chronologically...")
        df_copy.sort_index(inplace=True)
        logger.debug(f"{log_prefix} Sorting complete.")

    rows_before_dedup = len(df_copy)
    if not df_copy.index.is_unique:
        logger.warning(f"{log_prefix} Index contains duplicates. Deduplicating, keeping 'last' entry...")
        df_copy = df_copy[~df_copy.index.duplicated(keep='last')]
        dedup_rows_removed = rows_before_dedup - len(df_copy)
        logger.info(f"{log_prefix} Deduplication removed {dedup_rows_removed} duplicate rows.")
        if df_copy.empty and rows_before_dedup > 0 :
             logger.warning(f"{log_prefix} DataFrame empty after deduplication.")
    elif rows_before_dedup > 0 :
        logger.debug(f"{log_prefix} Index is unique (no deduplication needed).")

    logger.debug(f"{log_prefix} Pre-processing duration: {time.monotonic() - pre_processing_start:.4f}s. Final DF shape: {df_copy.shape}")
    return df_copy

# --- OHLCV Mappers ---

# MAPPER 1: Pydantic Models (CompanyPriceHistoryEntry) - Uses 'time' (seconds), 'adj_close'
def map_eodhd_ohlcv_to_price_history_entries(
    ohlcv_df: Optional[pd.DataFrame],
    request_id: str,
    interval: str
) -> Optional[List['CompanyPriceHistoryEntry']]:
    """
    Maps an OHLCV DataFrame to a list of CompanyPriceHistoryEntry Pydantic models.
    Expected input columns: 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume'.
    Output keys: 'time', 'open', 'high', 'low', 'close', 'adj_close', 'volume'.
    Timestamp ('time') is in SECONDS.
    """
    # Actual import for runtime
    from modules.financehub.backend.models.stock import CompanyPriceHistoryEntry

    func_name = "map_eodhd_ohlcv_to_price_history_entries"
    log_prefix_base = "PriceHistoryMapper" # Shorter base for clarity
    log_prefix = f"[{request_id}][{log_prefix_base}:{interval}]"
    logger.info(f"{log_prefix} Starting mapping to Pydantic models...")

    processed_df = _preprocess_ohlcv_dataframe(ohlcv_df, request_id, interval, log_prefix_base)

    if processed_df is None:
        logger.error(f"{log_prefix} Mapping failed due to preprocessing error.")
        return None
    if processed_df.empty:
        logger.info(f"{log_prefix} DataFrame is empty after preprocessing. Returning empty list.")
        return []

    price_history_entries: List[CompanyPriceHistoryEntry] = []
    skipped_count = 0
    processed_count = 0
    map_loop_start_time = time.monotonic()

    # Ensure Adj Close exists (needed by CompanyPriceHistoryEntry)
    if 'Adj Close' not in processed_df.columns:
        logger.warning(f"{log_prefix} 'Adj Close' column missing. Adding as NaN.")
        processed_df['Adj Close'] = pd.NA
    # Volume should exist due to preprocessing, but check again
    if 'Volume' not in processed_df.columns:
        logger.warning(f"{log_prefix} 'Volume' column missing. Adding as 0.")
        processed_df['Volume'] = 0

    # Use column names directly if they match expected input from preprocessing
    for row in processed_df.itertuples(index=True, name='OHLCVRow'):
        point_log_prefix = f"{log_prefix}[Date:{row.Index.strftime('%Y-%m-%d %H:%M:%S%Z')}]"
        try:
            # Timestamp in SECONDS for CompanyPriceHistoryEntry 'time' field
            unix_ts_seconds = int(row.Index.timestamp())
            if unix_ts_seconds <= 0:
                logger.warning(f"{point_log_prefix} Skipping: Invalid UNIX timestamp {unix_ts_seconds} seconds.")
                skipped_count += 1
                continue

            # Extract data using getattr for safety, parse using helpers
            o = parse_optional_float(getattr(row, 'Open', None), context=f"{point_log_prefix}:Open")
            h = parse_optional_float(getattr(row, 'High', None), context=f"{point_log_prefix}:High")
            l = parse_optional_float(getattr(row, 'Low', None), context=f"{point_log_prefix}:Low")
            c = parse_optional_float(getattr(row, 'Close', None), context=f"{point_log_prefix}:Close")
            adj_c = parse_optional_float(getattr(row, 'Adj_Close', None), context=f"{point_log_prefix}:AdjClose") # itertuples mangles 'Adj Close'
            v = parse_optional_int(getattr(row, 'Volume', 0), context=f"{point_log_prefix}:Volume") # Already ensured Volume exists

            # Check essential OHLC
            if o is None or h is None or l is None or c is None:
                logger.warning(f"{point_log_prefix} Skipping: Missing essential OHLC float data after parsing.")
                skipped_count += 1
                continue

            # Create the dictionary for Pydantic model **CORRECTLY**
            entry_data = {
                'time': unix_ts_seconds,
                'open': o,
                'high': h,
                'low': l,
                'close': c,
                'adj_close': adj_c,
                'volume': v
            }

            # Append the Pydantic model instance
            price_history_entries.append(CompanyPriceHistoryEntry(**entry_data))
            processed_count += 1
        except AttributeError as e_attr:
            logger.error(f"{point_log_prefix} Skipping row due to AttributeError accessing row data: {e_attr}.", exc_info=False)
            skipped_count += 1
        except Exception as e_point:
            logger.error(f"{point_log_prefix} Skipping row due to unexpected error during model creation: {e_point}.", exc_info=True)
            skipped_count += 1

    map_loop_duration = time.monotonic() - map_loop_start_time
    logger.info(
        f"{log_prefix} Pydantic model mapping complete. "
        f"Duration: {map_loop_duration:.4f}s | "
        f"Input Rows (Post-Proc): {len(processed_df)} | "
        f"Mapped Entries: {processed_count} | Skipped: {skipped_count}."
    )

    # --- Development Mode Checks (Keep existing logic) ---
    if settings.ENVIRONMENT.NODE_ENV == 'development' and price_history_entries:
        preview_count = min(3, len(price_history_entries))
        logger.debug(f"{log_prefix} First {preview_count} mapped entries (showing as dicts): {[p.model_dump() if hasattr(p, 'model_dump') else p for p in price_history_entries[:preview_count]]}")
        times = [p.time for p in price_history_entries]
        if len(times) > 1 and not all(times[i] < times[i+1] for i in range(len(times)-1)):
            logger.error(f"{log_prefix} CRITICAL: Output Pydantic model list timestamps are NOT strictly monotonic!")
        else:
            logger.debug(f"{log_prefix} Output Pydantic model list timestamp monotonicity check passed.")

    return price_history_entries

# MAPPER 2: Frontend/Chart List (t, o, h, l, c, v) - Uses 't' (milliseconds)
def map_eodhd_ohlcv_df_to_frontend_list( # Renamed for clarity, underscore prefix removed if called externally
    ohlcv_df: Optional[pd.DataFrame],
    request_id: str,
    interval: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Maps an OHLCV DataFrame to a list of standardized dictionaries for frontend/charting.
    Expected input columns: 'Open', 'High', 'Low', 'Close', 'Volume'.
    Output keys: 't', 'o', 'h', 'l', 'c', 'v'.
    Timestamp ('t') is in MILLISECONDS.
    """
    func_name = "map_eodhd_ohlcv_df_to_frontend_list" # Use full name if potentially called externally
    log_prefix_base = "FrontendListMapper" # Shorter base for clarity
    log_prefix = f"[{request_id}][{log_prefix_base}:{interval}]"
    logger.info(f"{log_prefix} Starting mapping to frontend list format...")

    processed_df = _preprocess_ohlcv_dataframe(ohlcv_df, request_id, interval, log_prefix_base)

    if processed_df is None:
        logger.error(f"{log_prefix} Mapping failed due to preprocessing error.")
        return None
    if processed_df.empty:
        logger.info(f"{log_prefix} DataFrame is empty after preprocessing. Returning empty list.")
        return []

    mapped_list: List[Dict[str, Any]] = []
    skipped_count = 0
    processed_count = 0
    map_loop_start_time = time.monotonic()

    # Volume should exist due to preprocessing
    if 'Volume' not in processed_df.columns:
        logger.error(f"{log_prefix} CRITICAL PREPROCESSING ERROR: 'Volume' column missing unexpectedly after preprocessing!")
        # Handle this case - maybe return None or empty list depending on requirements
        return [] # Return empty list for safety

    # Iterate and create the dictionary in the TARGET format
    for row in processed_df.itertuples(index=True, name='OHLCVRow'):
        point_log_prefix = f"{log_prefix}[Date:{row.Index.strftime('%Y-%m-%d %H:%M:%S%Z')}]"
        try:
            # Timestamp in MILLISECONDS for 't' field
            unix_ts_milliseconds = int(row.Index.timestamp() * 1000)
            if unix_ts_milliseconds <= 0:
                logger.warning(f"{point_log_prefix} Skipping: Invalid UNIX timestamp {unix_ts_milliseconds} ms.")
                skipped_count += 1
                continue

            # Extract data using getattr for safety, parse using helpers
            o = parse_optional_float(getattr(row, 'Open', None), context=f"{point_log_prefix}:Open")
            h = parse_optional_float(getattr(row, 'High', None), context=f"{point_log_prefix}:High")
            l = parse_optional_float(getattr(row, 'Low', None), context=f"{point_log_prefix}:Low")
            c = parse_optional_float(getattr(row, 'Close', None), context=f"{point_log_prefix}:Close")
            v = parse_optional_int(getattr(row, 'Volume', 0), context=f"{point_log_prefix}:Volume")

            # Check essential OHLC
            if o is None or h is None or l is None or c is None:
                logger.warning(f"{point_log_prefix} Skipping: Missing essential OHLC float data after parsing.")
                skipped_count += 1
                continue

            # Create the dictionary in the frontend format ('t', 'o', 'h', 'l', 'c', 'v')
            mapped_point = {
                't': unix_ts_milliseconds,
                'o': o,
                'h': h,
                'l': l,
                'c': c,
                'v': v
            }
            mapped_list.append(mapped_point)
            processed_count += 1
        except AttributeError as e_attr:
            logger.error(f"{point_log_prefix} Skipping row due to AttributeError accessing row data: {e_attr}.", exc_info=False)
            skipped_count += 1
        except Exception as e_point:
            logger.error(f"{point_log_prefix} Skipping row due to unexpected error during dict creation: {e_point}.", exc_info=True)
            skipped_count += 1

    map_loop_duration = time.monotonic() - map_loop_start_time
    logger.info(
        f"{log_prefix} Frontend list mapping complete. "
        f"Duration: {map_loop_duration:.4f}s | "
        f"Input Rows (Post-Proc): {len(processed_df)} | "
        f"Mapped Points: {processed_count} | Skipped: {skipped_count}."
    )

    # --- Development Mode Checks (Keep existing logic) ---
    if settings.ENVIRONMENT.NODE_ENV == 'development' and mapped_list:
        preview_count = min(3, len(mapped_list))
        logger.debug(f"{log_prefix} First {preview_count} mapped points: {mapped_list[:preview_count]}")
        times = [p['t'] for p in mapped_list] # Use 't' key now
        if len(times) > 1 and not all(times[i] < times[i+1] for i in range(len(times)-1)):
             logger.error(f"{log_prefix} CRITICAL: Output frontend list timestamps are NOT strictly monotonic!")
        else:
            logger.debug(f"{log_prefix} Output frontend list timestamp monotonicity check passed.")

    return mapped_list


# --- Splits Mapper ---
def map_eodhd_splits_data_to_models(
    splits_df: Optional[pd.DataFrame],
    request_id: str
) -> Optional[List['StockSplitData']]:
    from modules.financehub.backend.models.stock import StockSplitData

    func_name = "map_eodhd_splits_data_to_models"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.info(f"{log_prefix} Starting mapping...")

    if splits_df is None or not isinstance(splits_df, pd.DataFrame):
        logger.error(f"{log_prefix} Mapping failed: Input is None or not a DataFrame.")
        return None
    if splits_df.empty:
        logger.info(f"{log_prefix} Input DataFrame is empty. Returning empty list.")
        return []

    df_copy = splits_df.copy()

    # Index check and conversion (assuming EODHD gives date string as index)
    if not isinstance(df_copy.index, pd.DatetimeIndex):
        try:
            df_copy.index = pd.to_datetime(df_copy.index)
            logger.warning(f"{log_prefix} Converted splits DataFrame index to DatetimeIndex.")
        except Exception as e_conv:
            logger.error(f"{log_prefix} Mapping failed: Splits index not DatetimeIndex and conversion failed: {e_conv}")
            return None

    if 'split_ratio_str' not in df_copy.columns:
        logger.error(f"{log_prefix} Mapping failed: Missing 'split_ratio_str' column.")
        return None

    split_data_list: List[StockSplitData] = []
    skipped_count = 0
    processed_count = 0

    for idx_date, row in df_copy.iterrows():
        point_log_prefix = f"{log_prefix}[Date:{idx_date.strftime('%Y-%m-%d')}]"
        try:
            # Ensure idx_date is a Timestamp object before calling .date()
            split_date: Optional[date] = None
            if isinstance(idx_date, pd.Timestamp):
                 split_date = idx_date.date()
            elif isinstance(idx_date, datetime):
                 split_date = idx_date.date()
            else:
                 try:
                      split_date = pd.to_datetime(idx_date).date()
                 except Exception:
                     logger.warning(f"{point_log_prefix} Skipping: Could not convert index '{idx_date}' to date.")
                     skipped_count += 1
                     continue
            
            if split_date is None: # Should not happen if logic above works
                 logger.warning(f"{point_log_prefix} Skipping: Failed to determine split date from index '{idx_date}'.")
                 skipped_count += 1
                 continue

            ratio_str = row['split_ratio_str']

            if not isinstance(ratio_str, str) or ':' not in ratio_str:
                logger.warning(f"{point_log_prefix} Skipping: Invalid split_ratio_str format: '{ratio_str}'.")
                skipped_count += 1
                continue

            parts = ratio_str.split(':', 1)
            if len(parts) != 2:
                logger.warning(f"{point_log_prefix} Skipping: Malformed split_ratio_str: '{ratio_str}'.")
                skipped_count += 1
                continue

            split_to_val, split_from_val = None, None
            try:
                split_to_raw = parts[0].strip()
                split_from_raw = parts[1].strip()
                split_to_val = parse_optional_float(split_to_raw, f"{point_log_prefix}:SplitTo")
                split_from_val = parse_optional_float(split_from_raw, f"{point_log_prefix}:SplitFrom")

                if split_to_val is None or split_from_val is None or split_from_val == 0:
                    raise ValueError("Parsed split factors are invalid or from_val is zero.")
            except Exception as e_parse_ratio:
                logger.warning(f"{point_log_prefix} Skipping: Could not parse split ratio '{ratio_str}': {e_parse_ratio}")
                skipped_count += 1
                continue

            entry_data = {
                'date': split_date,
                'split_ratio_str': ratio_str,
                'split_to': split_to_val,
                'split_from': split_from_val
            }
            split_data_list.append(StockSplitData(**entry_data))
            processed_count +=1
        except Exception as e_point:
            logger.error(f"{point_log_prefix} Skipping row due to unexpected error: {e_point}.", exc_info=True)
            skipped_count += 1

    logger.info(f"{log_prefix} Mapping complete. Mapped: {processed_count}, Skipped: {skipped_count}.")
    return split_data_list


# --- Dividends Mapper ---
def map_eodhd_dividends_data_to_models(
    dividends_df: Optional[pd.DataFrame],
    request_id: str
) -> Optional[List['DividendData']]:
    from modules.financehub.backend.models.stock import DividendData

    func_name = "map_eodhd_dividends_data_to_models"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.info(f"{log_prefix} Starting mapping...")

    if dividends_df is None or not isinstance(dividends_df, pd.DataFrame):
        logger.error(f"{log_prefix} Mapping failed: Input is None or not a DataFrame.")
        return None
    if dividends_df.empty:
        logger.info(f"{log_prefix} Input DataFrame is empty. Returning empty list.")
        return []

    df_copy = dividends_df.copy()

    # Expecting 'date' as the Ex-Dividend Date from the fetcher's transformation
    required_cols = {'date', 'dividend_amount'}
    missing_cols = required_cols - set(df_copy.columns)
    if missing_cols:
        logger.error(f"{log_prefix} Mapping failed: Missing required columns: {missing_cols}. Available: {list(df_copy.columns)}")
        return None

    dividend_data_list: List[DividendData] = []
    skipped_count = 0
    processed_count = 0
    optional_date_cols = {'declarationDate', 'recordDate', 'paymentDate'} # From EODHD raw response

    for index, row in df_copy.iterrows(): # Iterate using index
        point_log_prefix = f"{log_prefix}[Row:{index}]"
        try:
            ex_div_date_raw = row['date'] # 'date' column should contain the ex-dividend date
            ex_div_date: Optional[date] = None
            try:
                ex_div_date = pd.to_datetime(ex_div_date_raw).date()
            except Exception as e_ex_date:
                 logger.warning(f"{point_log_prefix} Skipping: Invalid ex-dividend date ('{ex_div_date_raw}'): {e_ex_date}")
                 skipped_count += 1
                 continue

            amount = parse_optional_float(row['dividend_amount'], f"{point_log_prefix}:Amount")
            if amount is None:
                logger.warning(f"{point_log_prefix} Skipping: Invalid or missing dividend amount: '{row['dividend_amount']}'.")
                skipped_count += 1
                continue

            currency_val = str(row['currency']) if 'currency' in row and pd.notna(row.get('currency')) else None
            unadj_value = parse_optional_float(row.get('unadjustedValue'), f"{point_log_prefix}:UnadjValue")

            entry_data = {
                'date': ex_div_date, # Ex-dividend date
                'dividend': amount,
                'currency': currency_val,
                'unadjusted_value': unadj_value,
                'declaration_date': None,
                'record_date': None,
                'payment_date': None
            }

            # Process optional dates if they exist in the row
            for col_name in optional_date_cols:
                pydantic_col_name = col_name.replace("Date", "_date") # Convert to snake_case for Pydantic model
                if col_name in row and pd.notna(row[col_name]):
                    try:
                        dt_val = pd.to_datetime(row[col_name]).date()
                        entry_data[pydantic_col_name] = dt_val
                    except Exception as e_opt_date:
                        logger.warning(f"{point_log_prefix} Could not parse optional date for {col_name}: {row[col_name]} - Error: {e_opt_date}")

            dividend_data_list.append(DividendData(**entry_data))
            processed_count +=1
        except Exception as e_point:
            logger.error(f"{point_log_prefix} Skipping row due to unexpected error: {e_point}.", exc_info=True)
            skipped_count += 1

    logger.info(f"{log_prefix} Mapping complete. Mapped: {processed_count}, Skipped: {skipped_count}.")
    return dividend_data_list


# --- News Mapper ---
# (Keeping original robust logic, seems generally correct)
def map_eodhd_news_data_to_models(
    news_df: Optional[pd.DataFrame],
    request_id: str
) -> Optional[List['NewsItem']]:
    from modules.financehub.backend.models.stock import NewsItem

    func_name = "map_eodhd_news_data_to_models"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.info(f"{log_prefix} Starting mapping...")

    if news_df is None or not isinstance(news_df, pd.DataFrame):
        logger.error(f"{log_prefix} Mapping failed: Input is None or not a DataFrame.")
        return None
    if news_df.empty:
        logger.info(f"{log_prefix} Input DataFrame is empty. Returning empty list.")
        return []

    df_copy = news_df.copy()

    # Assuming fetcher provides these columns after processing EODHD raw news
    required_cols = {'published_at', 'title', 'content', 'link'}
    missing_cols = required_cols - set(df_copy.columns)
    if missing_cols:
        logger.error(f"{log_prefix} Mapping failed: Missing required columns: {missing_cols}. Available: {list(df_copy.columns)}")
        return None

    news_item_list: List[NewsItem] = []
    skipped_count = 0
    processed_count = 0

    for index, row in df_copy.iterrows():
        point_log_prefix = f"{log_prefix}[Row:{index}]"
        try:
            pub_at_raw = row['published_at']
            published_at_dt: Optional[datetime] = None
            try: # Robust date parsing
                if isinstance(pub_at_raw, str):
                    # Try ISO format first, then let pandas handle others
                    try:
                         published_at_dt = datetime.fromisoformat(pub_at_raw.replace('Z', '+00:00'))
                         if published_at_dt.tzinfo is None: # Ensure timezone aware
                              published_at_dt = published_at_dt.replace(tzinfo=timezone.utc)
                    except ValueError:
                         published_at_dt = pd.to_datetime(pub_at_raw, utc=True, errors='coerce').to_pydatetime()
                elif isinstance(pub_at_raw, datetime):
                     published_at_dt = pub_at_raw if pub_at_raw.tzinfo else pub_at_raw.replace(tzinfo=timezone.utc)
                elif isinstance(pub_at_raw, pd.Timestamp):
                     published_at_dt = pub_at_raw.tz_convert('UTC').to_pydatetime() # Ensure UTC conversion for Timestamp
                elif isinstance(pub_at_raw, date): # Handle date objects
                     published_at_dt = datetime.combine(pub_at_raw, datetime.min.time()).replace(tzinfo=timezone.utc)
                else:
                    raise ValueError(f"Unhandled published_at type: {type(pub_at_raw)}")

                if published_at_dt is None or pd.isna(published_at_dt): # Check for NaT from pd.to_datetime
                    raise ValueError("Date parsing resulted in None or NaT")

                # Ensure it's UTC at the end
                if published_at_dt.tzinfo is None:
                    published_at_dt = published_at_dt.replace(tzinfo=timezone.utc)
                elif str(published_at_dt.tzinfo).upper() != 'UTC':
                    published_at_dt = published_at_dt.astimezone(timezone.utc)

            except Exception as e_date:
                logger.warning(f"{point_log_prefix} Skipping: Invalid 'published_at' ('{row['published_at']}'): {e_date}")
                skipped_count += 1
                continue

            title = str(row['title']).strip() if pd.notna(row['title']) else ""
            content = str(row['content']).strip() if pd.notna(row['content']) else ""
            link = str(row['link']).strip() if pd.notna(row['link']) else ""

            if not title or not link:
                 logger.warning(f"{point_log_prefix} Skipping: Missing title or link.")
                 skipped_count += 1
                 continue

            # Handle symbols/tickers mentioned
            symbols_raw = row.get('symbols', row.get('tickers_mentioned', [])) # Check both keys
            symbols_list = []
            if isinstance(symbols_raw, list):
                symbols_list = [str(s).strip().upper() for s in symbols_raw if pd.notna(s) and str(s).strip()]
            elif isinstance(symbols_raw, str) and symbols_raw.strip():
                symbols_list = [s.strip().upper() for s in symbols_raw.split(',') if s.strip()]
            symbols_list = sorted(list(set(symbols_list))) # Unique, sorted

            source = "EODHD" # Explicitly set source

            entry_data = {
                'published_at': published_at_dt,
                'title': title,
                'content': content,
                'link': link,
                'symbols': symbols_list,
                'source': source
            }
            news_item_list.append(NewsItem(**entry_data))
            processed_count +=1
        except Exception as e_point:
            logger.error(f"{point_log_prefix} Skipping row due to unexpected error: {e_point}.", exc_info=True)
            skipped_count += 1

    logger.info(f"{log_prefix} Mapping complete. Mapped: {processed_count}, Skipped: {skipped_count}.")
    return news_item_list

# --- Placeholder Mappers for Fundamental Data ---
# (Keep these as they are, clearly marked as placeholders)
def map_eodhd_company_info_placeholder_to_overview(
    raw_data: Optional[Dict[str, Any]],
    request_id: str,
) -> Optional['CompanyOverview']:
    from modules.financehub.backend.models.stock import CompanyOverview # Actual import for runtime

    func_name = "map_eodhd_company_info_placeholder_to_overview"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.warning(f"{log_prefix} This mapper is a placeholder. EODHD fundamentals might require separate mapping. Raw data type: {type(raw_data)}. Returning None.")
    return None

def map_eodhd_financial_statements_placeholder_to_models(
    raw_data: Optional[Dict[str, Any]],
    request_id: str,
) -> Optional[Any]: # Should be Optional['FinancialStatementDataContainer']
    from modules.financehub.backend.models.stock import FinancialStatementDataContainer # Actual import

    func_name = "map_eodhd_financial_statements_placeholder_to_models"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.warning(f"{log_prefix} This mapper is a placeholder. EODHD financials might require separate mapping. Raw data type: {type(raw_data)}. Returning None.")
    return None

# --- Module Load Confirmation ---
logger.info(f"EODHD specific mappers (eodhd.py {MODULE_VERSION}) loaded successfully.")

def map_eodhd_data_to_chart_ready_format(
    ohlcv_df: pd.DataFrame,
    splits_df: Optional[pd.DataFrame],
    dividends_df: Optional[pd.DataFrame],
    request_id: str,
    interval: str = 'd'
) -> List[Dict[str, Any]]:
    """
    Combines OHLCV, splits, and dividends data into a single, chart-ready list of dictionaries.
    This function orchestrates the merging of different data types onto the OHLCV timeline.
    """
    log_prefix = f"[{request_id}][map_eodhd_data_to_chart_ready_format]"
    logger.info(f"{log_prefix} Starting combined mapping for chart-ready format.")

    if not isinstance(ohlcv_df, pd.DataFrame) or ohlcv_df.empty:
        logger.warning(f"{log_prefix} OHLCV DataFrame is missing or empty. Returning empty list.")
        return []

    # 1. Preprocess the main OHLCV dataframe
    processed_ohlcv_df = _preprocess_ohlcv_dataframe(ohlcv_df, request_id, interval, log_prefix)
    if processed_ohlcv_df is None or processed_ohlcv_df.empty:
        logger.error(f"{log_prefix} OHLCV DataFrame is empty or invalid after preprocessing.")
        return []

    # Create the base list of dicts from the processed OHLCV data
    # Using 'split' orientation is often faster for this conversion
    chart_list = processed_ohlcv_df.reset_index().to_dict('records')

    # This loop is kept for its explicit key renaming and None value initialization,
    # which is clear and robust.
    for item in chart_list:
        item['timestamp'] = item.pop('Date').isoformat() # Assumes 'Date' is the index name after reset
        item['open'] = item.pop('Open', None)
        item['high'] = item.pop('High', None)
        item['low'] = item.pop('Low', None)
        item['close'] = item.pop('Close', None)
        item['volume'] = item.pop('Volume', None)
        item['adjClose'] = item.pop('Adj Close', item.get('close')) # Fallback adjClose to close
        item['split'] = None
        item['dividend'] = None


    # 2. Map splits and create a lookup dictionary
    splits_map = {}
    if splits_df is not None and not splits_df.empty:
        # Pass the correct request_id to the sub-mapper
        mapped_splits = map_eodhd_splits_data_to_models(splits_df, request_id)
        if mapped_splits:
            for split in mapped_splits:
                if split and split.date:
                    splits_map[split.date.date()] = f"{split.stock_to}:{split.stock_from}"

    # 3. Map dividends and create a lookup dictionary
    dividends_map = {}
    if dividends_df is not None and not dividends_df.empty:
        # Pass the correct request_id to the sub-mapper
        mapped_dividends = map_eodhd_dividends_data_to_models(dividends_df, request_id)
        if mapped_dividends:
            for dividend in mapped_dividends:
                 if dividend and dividend.date:
                    dividends_map[dividend.date.date()] = dividend.dividend

    # 4. Merge splits and dividends into the chart list
    # This approach is O(N) where N is the number of chart items, which is efficient.
    for item in chart_list:
        # Using .get() on the dict is safer than direct access
        timestamp_str = item.get('timestamp')
        if timestamp_str:
            try:
                item_date = datetime.fromisoformat(timestamp_str).date()
                if item_date in splits_map:
                    item['split'] = splits_map[item_date]
                if item_date in dividends_map:
                    item['dividend'] = dividends_map[item_date]
            except (TypeError, ValueError) as e:
                logger.warning(f"{log_prefix} Could not parse timestamp '{timestamp_str}': {e}")


    logger.info(f"{log_prefix} Finished mapping {len(chart_list)} data points with events.")
    return chart_list