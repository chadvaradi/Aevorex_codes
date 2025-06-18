# backend/core/indicator_service.py
# ==============================================================================
# Aevorex FinBot - Indicator Calculation Service (v1.2.1 - Imports Fixed)
#
# Copyright © 2024-2025 Aevorex. All Rights Reserved.
# (Refer to license file for details)
# ==============================================================================
# Responsibilities:
# - Calculates various technical indicators based on OHLCV data.
# - Uses pandas_ta library for calculations.
# - Formats calculated indicator data into Pydantic models for API response.
# - Handles potential errors during calculation and formatting gracefully.
# ==============================================================================

import pandas as pd
import numpy as np # Might be implicitly used by pandas_ta, good to have if needed
import math
import time
from typing import List, Optional, Dict, Any, Tuple, Final # Add Tuple, Final
from datetime import timezone # <<<--- IMPORTED timezone


# --- Relative Imports ---
try:
    # Settings and Logger first
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
    from modules.financehub.backend.utils.helpers import (
        _ensure_datetime_index,
        parse_optional_float,
        parse_optional_int,
        _clean_value
    )
    from modules.financehub.backend.models.stock import (
        IndicatorHistory,
        SMASet,
        BBandsSet,
        RSISeries,
        VolumeSeries,
        VolumeSMASeries,
        MACDSeries,
        STOCHSeries,
        IndicatorPoint,
        VolumePoint,
        MACDHistPoint,
        STOCHPoint
    )
    from pydantic import ValidationError

    try:
        import talib
        ta_available = True
        import logging
        logging.getLogger(__name__).info("TA-Lib successfully imported for technical indicators")
    except ImportError as ta_e:
        import logging
        logging.getLogger(__name__).warning(f"TA-Lib library not found. Technical indicators will be disabled. Error: {ta_e}")
        talib = None
        ta_available = False
    except Exception as ta_e:
        import logging
        logging.getLogger(__name__).warning(f"TA-Lib import failed. Technical indicators will be disabled. Error: {ta_e}")
        talib = None
        ta_available = False

except ImportError as e:
    import logging
    logging.basicConfig(level="INFO")
    critical_logger = logging.getLogger(__name__)
    critical_logger.critical(f"FATAL ERROR: Failed to import core dependencies in IndicatorService: {e}. Check structure and installations.", exc_info=True)
    raise RuntimeError(f"IndicatorService failed to initialize due to critical import error: {e}") from e
except Exception as e_init:
    import logging
    logging.basicConfig(level="INFO")
    critical_logger = logging.getLogger(__name__)
    critical_logger.critical(f"FATAL UNEXPECTED ERROR during IndicatorService initialization: {e_init}", exc_info=True)
    raise RuntimeError(f"IndicatorService failed initialization: {e_init}") from e_init


logger = get_logger(f"aevorex_finbot.{__name__}")
logger.info(f"[{__name__}] Module imports successful.")


SERVICE_NAME: Final[str] = "IndicatorService"
__version__: Final[str] = "1.2.2" # Updated version with fixes

VOLUME_UP_COLOR: Final[str] = '#26A69A'
VOLUME_DOWN_COLOR: Final[str] = '#EF5350'
MACD_HIST_UP_COLOR: Final[str] = '#26A69A'
MACD_HIST_DOWN_COLOR: Final[str] = '#EF5350'

def _ensure_datetime_index(df: pd.DataFrame, function_name: str = "caller") -> Optional[pd.DataFrame]:
    if not isinstance(df, pd.DataFrame):
        logger.error(f"[{function_name}] Invalid input: Expected pandas DataFrame, got {type(df).__name__}.")
        return None
    if df.empty:
        logger.warning(f"[{function_name}] Input DataFrame is empty. Returning empty DataFrame.")
        return df.copy()

    df_copy = df.copy()

    try:
        if isinstance(df_copy.index, pd.DatetimeIndex):
            logger.debug(f"[{function_name}] DataFrame already has DatetimeIndex. Checking timezone...")
            if df_copy.index.tz is None:
                logger.debug(f"[{function_name}] Localizing naive index to UTC.")
                df_copy.index = df_copy.index.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
            elif df_copy.index.tzinfo != timezone.utc:
                logger.debug(f"[{function_name}] Converting existing index timezone to UTC from {df_copy.index.tz}.")
                df_copy.index = df_copy.index.tz_convert('UTC')
            else:
                 logger.debug(f"[{function_name}] Index is already UTC.")
            return df_copy.sort_index()

        time_col = None
        possible_time_cols = ['time', 'Date', 'datetime', 'timestamp']
        for col in possible_time_cols:
             if col in df_copy.columns:
                 time_col = col
                 break
             if col.lower() in df_copy.columns:
                 time_col = col.lower()
                 break

        if time_col:
            logger.debug(f"[{function_name}] Found potential time column: '{time_col}'. Converting to DatetimeIndex (UTC)...")
            df_copy[time_col] = pd.to_datetime(df_copy[time_col], errors='coerce', utc=True, infer_datetime_format=True)
            original_rows = len(df_copy)
            df_copy.dropna(subset=[time_col], inplace=True)
            dropped_rows = original_rows - len(df_copy)
            if dropped_rows > 0:
                logger.warning(f"[{function_name}] Dropped {dropped_rows} rows with invalid values in time column '{time_col}'.")

            if df_copy.empty:
                 logger.warning(f"[{function_name}] DataFrame became empty after handling invalid time values.")
                 return df_copy

            df_copy = df_copy.set_index(time_col).sort_index()

            if not isinstance(df_copy.index, pd.DatetimeIndex):
                 raise ValueError(f"[{function_name}] Index conversion unexpectedly failed after setting '{time_col}'.")
            logger.debug(f"[{function_name}] Successfully set '{time_col}' column as DatetimeIndex (UTC).")
            return df_copy
        else:
            if not isinstance(df_copy.index, pd.DatetimeIndex):
                logger.debug(f"[{function_name}] No standard time column found. Attempting to convert existing index to DatetimeIndex (UTC)...")
                try:
                    original_index_name = df_copy.index.name
                    df_copy.index = pd.to_datetime(df_copy.index, errors='coerce', utc=True, infer_datetime_format=True)
                    df_copy.index.name = original_index_name
                    original_rows = len(df_copy)
                    df_copy.dropna(subset=[df_copy.index.name], inplace=True)
                    dropped_rows = original_rows - len(df_copy)
                    if dropped_rows > 0:
                        logger.warning(f"[{function_name}] Dropped {dropped_rows} rows with invalid index values after conversion.")

                    if df_copy.empty:
                        logger.warning(f"[{function_name}] DataFrame became empty after index conversion.")
                        return df_copy

                    if isinstance(df_copy.index, pd.DatetimeIndex):
                        logger.debug(f"[{function_name}] Successfully converted existing index to DatetimeIndex (UTC).")
                        return df_copy.sort_index()
                    else:
                        raise ValueError("Index conversion attempted but did not result in DatetimeIndex.")

                except Exception as idx_conv_e:
                    logger.error(f"[{function_name}] Failed to convert existing index to DatetimeIndex: {idx_conv_e}", exc_info=True)
                    return None
            else:
                 logger.error(f"[{function_name}] Unexpected state: Index is DatetimeIndex but wasn't handled.")
                 return None

    except Exception as e:
        logger.error(f"[{function_name}] Failed during DatetimeIndex preparation: {e}", exc_info=True)
        return None

def _format_simple_series(series: Optional[pd.Series], series_name: str) -> Optional[List[IndicatorPoint]]:
    if series is None: return None
    if not isinstance(series, pd.Series):
        logger.warning(f"Cannot format '{series_name}': Input is not a pandas Series (type: {type(series).__name__}).")
        return None
    if series.empty:
        logger.debug(f"Cannot format '{series_name}': Input Series is empty.")
        return None
    if not isinstance(series.index, pd.DatetimeIndex):
         logger.error(f"Cannot format '{series_name}': Input Series must have a DatetimeIndex.")
         return None

    # Ensure index timezone is UTC
    try:
        if series.index.tz is None:
            series = series.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
        elif str(series.index.tz) != 'UTC':
            series = series.tz_convert('UTC')
    except Exception as tz_e:
        logger.error(f"Cannot format '{series_name}': Failed to convert index to UTC. Error: {tz_e}")
        return None

    points: List[IndicatorPoint] = []
    valid_count = 0; nan_count = 0; inf_count = 0; error_count = 0
    start_time = time.monotonic()

    try:
        timestamps = series.index
        values = series.values
    except Exception as e:
        logger.error(f"Error accessing series index/values for '{series_name}': {e}", exc_info=True)
        return None

    for i in range(len(timestamps)):
        ts = timestamps[i]
        raw_value = values[i]

        try:
            value_f = float(raw_value)
            if math.isnan(value_f):
                nan_count += 1; continue
            if math.isinf(value_f):
                inf_count +=1; continue

            unix_timestamp_seconds = int(ts.timestamp()) # CORRECTED: Get Unix timestamp in seconds
            points.append(IndicatorPoint(t=unix_timestamp_seconds, value=value_f)) # CORRECTED: Use 't' and unix_timestamp_seconds
            valid_count += 1

        except (ValueError, TypeError):
            error_count += 1
        except Exception as e:
            logger.error(f"Unexpected error formatting point for '{series_name}': Time={ts}, Value={raw_value}. Error: {e}", exc_info=True)
            error_count += 1

    duration = time.monotonic() - start_time
    if not points:
        logger.warning(f"Formatted 0 valid points for indicator '{series_name}' (NaNs: {nan_count}, Infs: {inf_count}, Errors: {error_count}, Time: {duration:.4f}s). Returning None.")
        return None
    else:
        logger.info(f"Formatted {valid_count} valid points for indicator '{series_name}' (NaNs: {nan_count}, Infs: {inf_count}, Errors: {error_count}, Time: {duration:.4f}s).")
        return points


def _format_volume_series(df: pd.DataFrame, vol_col: str, open_col: str, close_col: str) -> Optional[List[VolumePoint]]:
    func_name = "_format_volume_series"
    required_cols = {vol_col, open_col, close_col}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        logger.warning(f"[{func_name}] Missing columns for volume formatting: {missing}. Found: {df.columns.tolist()}. Cannot proceed.")
        return None
    if not isinstance(df.index, pd.DatetimeIndex):
         logger.error(f"[{func_name}] Cannot format volume: Index must have a DatetimeIndex. Found type: {type(df.index)}")
         return None
    try:
         if df.index.tz is None:
             df = df.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
         elif str(df.index.tz) != 'UTC':
             df = df.tz_convert('UTC')
    except Exception as tz_e:
         logger.error(f"[{func_name}] Cannot format volume: Failed to ensure UTC timezone. Error: {tz_e}")
         return None
    if df.empty:
        logger.warning(f"[{func_name}] Input DataFrame is empty. Returning None.")
        return None

    points: List[VolumePoint] = []
    valid_count = 0; conversion_errors = 0; validation_errors = 0; nan_inf_count = 0; other_errors = 0
    start_time = time.monotonic()
    logger.debug(f"[{func_name}] Starting formatting for {len(df)} rows...")

    try:
        for timestamp, row in df[[vol_col, open_col, close_col]].iterrows():
            row_processed = False
            try:
                volume_f = parse_optional_float(row[vol_col], context=f"{func_name}:volume")
                open_f = parse_optional_float(row[open_col], context=f"{func_name}:open")
                close_f = parse_optional_float(row[close_col], context=f"{func_name}:close")

                if volume_f is None or open_f is None or close_f is None:
                    nan_inf_count += 1; row_processed = True; continue

                try:
                    volume_int = int(round(volume_f))
                    if volume_int < 0:
                         logger.warning(f"[{func_name}] Skipping point at {timestamp}: Negative volume encountered ({volume_int}).")
                         conversion_errors += 1; row_processed = True; continue
                except (ValueError, TypeError, OverflowError) as e_int:
                    logger.warning(f"[{func_name}] Skipping point at {timestamp}: Could not convert volume float {volume_f} to int. Error: {e_int}")
                    conversion_errors += 1; row_processed = True; continue

                color = VOLUME_UP_COLOR if close_f >= open_f else VOLUME_DOWN_COLOR
                unix_timestamp_seconds = int(timestamp.timestamp()) # CORRECTED: Get Unix timestamp in seconds

                try:
                    volume_point = VolumePoint(t=unix_timestamp_seconds, value=volume_int, color=color) # CORRECTED: Use 't'
                    points.append(volume_point)
                    valid_count += 1; row_processed = True
                except ValidationError as e_val:
                    errors_summary = "; ".join([f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in e_val.errors()])
                    logger.warning(f"[{func_name}] Skipping point at {timestamp}: VolumePoint validation failed. Error: {errors_summary}. Data: t={unix_timestamp_seconds}, value={volume_int}, color={color}", exc_info=False)
                    validation_errors += 1; row_processed = True
                except Exception as e_create:
                     logger.error(f"[{func_name}] Skipping point at {timestamp}: Unexpected error creating VolumePoint. Error: {e_create}. Data: t={unix_timestamp_seconds}, value={volume_int}, color={color}", exc_info=True)
                     other_errors += 1; row_processed = True

            except (ValueError, TypeError) as e_conv:
                if not row_processed:
                    logger.debug(f"[{func_name}] Error converting values at {timestamp}: {e_conv}. Skipping.")
                    conversion_errors += 1; row_processed = True
            except Exception as e_inner_loop:
                 if not row_processed:
                    logger.error(f"[{func_name}] Unexpected error processing row at {timestamp}: {e_inner_loop}", exc_info=True)
                    other_errors += 1; row_processed = True
    except KeyError as e_key:
         logger.error(f"[{func_name}] Error accessing required columns during iteration: {e_key}. Cannot continue.", exc_info=True)
         return None
    except Exception as e_outer_loop:
         logger.error(f"[{func_name}] Unexpected error during Volume series formatting loop: {e_outer_loop}", exc_info=True)
         return None

    duration = time.monotonic() - start_time
    total_errors = conversion_errors + validation_errors + nan_inf_count + other_errors
    if not points:
        logger.warning(f"[{func_name}] Formatted 0 valid points for volume (NaN/Inf: {nan_inf_count}, Conv Errors: {conversion_errors}, Valid Errors: {validation_errors}, Other Errors: {other_errors}, Total Errors/Skipped: {total_errors}, Time: {duration:.4f}s). Returning None.")
        return None
    else:
        logger.info(f"[{func_name}] Formatted {valid_count} valid points for volume (NaN/Inf: {nan_inf_count}, Conv Errors: {conversion_errors}, Valid Errors: {validation_errors}, Other Errors: {other_errors}, Total Errors/Skipped: {total_errors}, Time: {duration:.4f}s).")
        if total_errors > 0:
             logger.debug(f"[{func_name}] Check previous warnings/errors for details on skipped volume points.")
        return points

def _format_macd_hist_series(series: Optional[pd.Series], series_name: str) -> Optional[List[MACDHistPoint]]:
    if series is None: return None
    if not isinstance(series, pd.Series):
        logger.warning(f"Cannot format '{series_name}': Input is not a pandas Series.")
        return None
    if series.empty:
        logger.debug(f"Cannot format '{series_name}': Input Series is empty.")
        return None
    if not isinstance(series.index, pd.DatetimeIndex):
         logger.error(f"Cannot format '{series_name}': Series must have a DatetimeIndex.")
         return None
    try:
         if series.index.tz is None:
             series = series.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
         elif str(series.index.tz) != 'UTC':
             series = series.tz_convert('UTC')
    except Exception as tz_e:
         logger.error(f"Cannot format '{series_name}': Failed to convert index to UTC. Error: {tz_e}")
         return None

    points: List[MACDHistPoint] = []
    valid_count = 0; nan_inf_error_count = 0
    start_time = time.monotonic()

    try:
        timestamps = series.index
        values = series.values
    except Exception as e:
        logger.error(f"Error accessing series index/values for '{series_name}': {e}", exc_info=True)
        return None

    for i in range(len(timestamps)):
        ts = timestamps[i]
        raw_value = values[i]
        try:
            value_f = float(raw_value)
            if math.isnan(value_f) or math.isinf(value_f):
                nan_inf_error_count += 1; continue

            color = MACD_HIST_UP_COLOR if value_f >= 0 else MACD_HIST_DOWN_COLOR
            unix_timestamp_seconds = int(ts.timestamp()) # CORRECTED
            points.append(MACDHistPoint(t=unix_timestamp_seconds, value=value_f, color=color)) # CORRECTED
            valid_count += 1
        except (ValueError, TypeError):
            nan_inf_error_count += 1
        except Exception as e:
            logger.error(f"Unexpected error formatting MACD Hist point: Time={ts}, Value={raw_value}. Error: {e}", exc_info=True)
            nan_inf_error_count += 1

    duration = time.monotonic() - start_time
    if not points:
        logger.warning(f"Formatted 0 valid points for MACD histogram '{series_name}' (Invalid/NaN/Inf/Errors: {nan_inf_error_count}, Time: {duration:.4f}s). Returning None.")
        return None
    else:
        logger.info(f"Formatted {valid_count} valid points for MACD histogram '{series_name}' (Invalid/NaN/Inf/Errors: {nan_inf_error_count}, Time: {duration:.4f}s).")
        return points

def _format_stoch_series(df: pd.DataFrame, k_col: str, d_col: str) -> Optional[List[STOCHPoint]]:
    required_cols = {k_col, d_col}
    if not required_cols.issubset(df.columns):
        missing = required_cols - set(df.columns)
        logger.warning(f"Missing columns for Stochastic formatting: {missing}. Found: {df.columns.tolist()}")
        return None
    if not isinstance(df.index, pd.DatetimeIndex):
         logger.error("Cannot format Stochastic: DataFrame must have a DatetimeIndex.")
         return None
    try:
         if df.index.tz is None:
             df = df.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
         elif str(df.index.tz) != 'UTC':
             df = df.tz_convert('UTC')
    except Exception as tz_e:
         logger.error(f"Cannot format Stochastic: Failed to ensure UTC timezone. Error: {tz_e}")
         return None

    points: List[STOCHPoint] = []
    valid_count = 0; nan_inf_error_count = 0
    start_time = time.monotonic()

    try:
        for timestamp, row in df[[k_col, d_col]].iterrows():
            try:
                k_f = float(row[k_col])
                d_f = float(row[d_col])

                if math.isnan(k_f) or math.isnan(d_f) or math.isinf(k_f) or math.isinf(d_f):
                    nan_inf_error_count += 1; continue

                unix_timestamp_seconds = int(timestamp.timestamp()) # CORRECTED
                points.append(STOCHPoint(t=unix_timestamp_seconds, k=k_f, d=d_f)) # CORRECTED
                valid_count += 1
            except (ValueError, TypeError):
                nan_inf_error_count += 1
            except Exception as e_inner:
                logger.error(f"Unexpected error formatting Stochastic point: Time={timestamp}. Error: {e_inner}", exc_info=True)
                nan_inf_error_count += 1
    except KeyError as e:
         logger.error(f"Error accessing columns '{k_col}' or '{d_col}' during Stochastic formatting: {e}", exc_info=True)
         return None
    except Exception as e_outer:
         logger.error(f"Error during Stochastic series formatting loop: {e_outer}", exc_info=True)
         return None

    duration = time.monotonic() - start_time
    if not points:
        logger.warning(f"Formatted 0 valid points for Stochastic (Invalid/NaN/Inf/Errors: {nan_inf_error_count}, Time: {duration:.4f}s). Returning None.")
        return None
    else:
        logger.info(f"Formatted {valid_count} valid points for Stochastic (Invalid/NaN/Inf/Errors: {nan_inf_error_count}, Time: {duration:.4f}s).")
        return points

def calculate_and_format_indicators(
    ohlcv_df: pd.DataFrame,
    symbol: str
) -> Optional[IndicatorHistory]:
    function_name = "calculate_and_format_indicators_talib"
    symbol_upper = symbol.upper()
    logger.info(f"[{symbol_upper}] [{function_name}] Received request. Version: {__version__}")

    # Fallback: if TA-Lib unavailable try pandas_ta (pure-python) else return empty
    if not ta_available:
        try:
            logger.warning(f"[{symbol_upper}] [{function_name}] pandas_ta not installed. Falling back to basic numpy/pandas calc.")

            df_indexed = _ensure_datetime_index(ohlcv_df, function_name)
            if df_indexed is None or df_indexed.empty:
                return IndicatorHistory(
                    sma=SMASet(SMA_SHORT=None, SMA_LONG=None),
                    bbands=BBandsSet(BBANDS_LOWER=None, BBANDS_MIDDLE=None, BBANDS_UPPER=None),
                    rsi=RSISeries(RSI=None),
                    volume=VolumeSeries(VOLUME=None),
                    volume_sma=VolumeSMASeries(VOLUME_SMA=None),
                    macd=MACDSeries(MACD_LINE=None, MACD_SIGNAL=None, MACD_HIST=None),
                    stoch=STOCHSeries(STOCH=None)
                )

            df_indexed.columns = [c.lower() for c in df_indexed.columns]
            close = df_indexed['close']
            high = df_indexed['high']; low=df_indexed['low']; volume=df_indexed['volume']

            sma_short = close.rolling(window=9, min_periods=1).mean()
            sma_long = close.rolling(window=20, min_periods=1).mean()
            rsi = 100 - (100/(1 + close.diff().clip(lower=0).rolling(14).mean() / close.diff().abs().rolling(14).mean()))
            # Simple MACD
            ema12 = close.ewm(span=12, adjust=False).mean()
            ema26 = close.ewm(span=26, adjust=False).mean()
            macd_line = ema12 - ema26
            macd_signal = macd_line.ewm(span=9, adjust=False).mean()
            macd_hist = macd_line - macd_signal

            bb_middle = close.rolling(window=20, min_periods=1).mean()
            bb_std = close.rolling(window=20, min_periods=1).std()
            bb_upper = bb_middle + 2*bb_std
            bb_lower = bb_middle - 2*bb_std

            vol_sma = volume.rolling(window=20, min_periods=1).mean()

            indicator_history = IndicatorHistory(
                sma=SMASet(SMA_SHORT=_format_simple_series(sma_short, "SMA_SHORT"), SMA_LONG=_format_simple_series(sma_long, "SMA_LONG")),
                bbands=BBandsSet(
                    BBANDS_LOWER=_format_simple_series(bb_lower, "BBANDS_LOWER"),
                    BBANDS_MIDDLE=_format_simple_series(bb_middle, "BBANDS_MIDDLE"),
                    BBANDS_UPPER=_format_simple_series(bb_upper, "BBANDS_UPPER")
                ),
                rsi=RSISeries(RSI=_format_simple_series(rsi, "RSI")),
                volume=VolumeSeries(VOLUME=_format_volume_series(df_indexed, 'volume', 'open', 'close')),
                volume_sma=VolumeSMASeries(VOLUME_SMA=_format_simple_series(vol_sma, "VOLUME_SMA")),
                macd=MACDSeries(MACD_LINE=_format_simple_series(macd_line, "MACD_LINE"), MACD_SIGNAL=_format_simple_series(macd_signal, "MACD_SIGNAL"), MACD_HIST=_format_macd_hist_series(macd_hist, "MACD_HIST")),
                stoch=STOCHSeries(STOCH=None)
            )
            return indicator_history
        except Exception as e_fallback:
            logger.error(f"[{symbol_upper}] [{function_name}] pandas_ta fallback failed: {e_fallback}")

        # If fallback failed, return empty
        return IndicatorHistory(
            sma=SMASet(SMA_SHORT=None, SMA_LONG=None),
            bbands=BBandsSet(BBANDS_LOWER=None, BBANDS_MIDDLE=None, BBANDS_UPPER=None),
            rsi=RSISeries(RSI=None),
            volume=VolumeSeries(VOLUME=None),
            volume_sma=VolumeSMASeries(VOLUME_SMA=None),
            macd=MACDSeries(MACD_LINE=None, MACD_SIGNAL=None, MACD_HIST=None),
            stoch=STOCHSeries(STOCH=None)
        )

    prep_start_time = time.monotonic()
    df_indexed = _ensure_datetime_index(ohlcv_df, function_name)
    if df_indexed is None or df_indexed.empty:
        logger.error(f"[{symbol_upper}] [{function_name}] Input DataFrame preparation failed or resulted in empty DF. Cannot proceed.")
        return None

    df_indexed.columns = [col.lower() for col in df_indexed.columns]
    required_cols = {'open', 'high', 'low', 'close', 'volume'}
    if not required_cols.issubset(df_indexed.columns):
        missing_cols = required_cols - set(df_indexed.columns)
        logger.error(f"[{symbol_upper}] [{function_name}] Missing required OHLCV columns (lowercase): {missing_cols}. Found: {df_indexed.columns.tolist()}")
        return None

    df_ta = df_indexed[list(required_cols)].copy()
    prep_duration = time.monotonic() - prep_start_time
    logger.info(f"[{symbol_upper}] [{function_name}] Prepared DataFrame shape {df_ta.shape} in {prep_duration:.4f}s.")

    logger.debug(f"[{symbol_upper}] [{function_name}] Loading indicator parameters from settings...")
    try:
        indicator_params: Dict[str, Any] = settings.DATA_PROCESSING.INDICATOR_PARAMS
        if not isinstance(indicator_params, dict):
             logger.error(f"[{symbol_upper}] [{function_name}] Settings error: INDICATOR_PARAMS is not a dict. Using empty params.")
             indicator_params = {}
        logger.debug(f"[{symbol_upper}] [{function_name}] Using indicator parameters: {indicator_params}")
    except AttributeError as ae:
         logger.error(f"[{symbol_upper}] [{function_name}] Settings error accessing INDICATOR_PARAMS: {ae}. Calculation might use defaults or fail.", exc_info=False)
         indicator_params = {}
    except Exception as e_params:
        logger.error(f"[{symbol_upper}] [{function_name}] Unexpected error loading indicator parameters: {e_params}. Using empty params.", exc_info=True)
        indicator_params = {}

    logger.debug(f"[{symbol_upper}] [{function_name}] Extracting specific parameters...")
    try:
        sma_s_len = int(indicator_params.get("SMA_SHORT_PERIOD", 9))
        sma_l_len = int(indicator_params.get("SMA_LONG_PERIOD", 20))
        bb_len = int(indicator_params.get("BBANDS_PERIOD", 20))
        bb_std = float(indicator_params.get("BBANDS_STDDEV", 2.0))
        rsi_len = int(indicator_params.get("RSI_PERIOD", 14))
        vol_sma_len = int(indicator_params.get("VOLUME_SMA_PERIOD", 20))
        macd_f = int(indicator_params.get("MACD_FAST_PERIOD", 12))
        macd_s = int(indicator_params.get("MACD_SLOW_PERIOD", 26))
        macd_sig = int(indicator_params.get("MACD_SIGNAL_PERIOD", 9))
        stoch_k = int(indicator_params.get("STOCH_K", 14))
        stoch_d = int(indicator_params.get("STOCH_D", 3))

        logger.debug(f"[{symbol_upper}] [{function_name}] Effective params: SMA({sma_s_len},{sma_l_len}), BB({bb_len},{bb_std}), RSI({rsi_len}), VOL_SMA({vol_sma_len}), MACD({macd_f},{macd_s},{macd_sig}), STOCH({stoch_k},{stoch_d})")

    except (ValueError, TypeError) as e_parse:
        logger.error(f"[{symbol_upper}] [{function_name}] Invalid indicator parameter format in settings: {e_parse}. Using hardcoded defaults.", exc_info=True)
        sma_s_len, sma_l_len, bb_len, bb_std, rsi_len, vol_sma_len = 9, 20, 20, 2.0, 14, 20
        macd_f, macd_s, macd_sig = 12, 26, 9
        stoch_k, stoch_d = 14, 3

    logger.info(f"[{symbol_upper}] [{function_name}] Starting TA-Lib calculations...")
    calc_start_time = time.monotonic()

    # Convert to numpy arrays for TA-Lib
    high = df_ta['high'].values.astype(np.float64)
    low = df_ta['low'].values.astype(np.float64)
    close = df_ta['close'].values.astype(np.float64)
    volume = df_ta['volume'].values.astype(np.float64)

    try:
        # Calculate indicators using TA-Lib
        sma_short = talib.SMA(close, timeperiod=sma_s_len)
        sma_long = talib.SMA(close, timeperiod=sma_l_len)
        
        bb_upper, bb_middle, bb_lower = talib.BBANDS(close, timeperiod=bb_len, nbdevup=bb_std, nbdevdn=bb_std)
        
        rsi = talib.RSI(close, timeperiod=rsi_len)
        
        volume_sma = talib.SMA(volume, timeperiod=vol_sma_len)
        
        macd_line, macd_signal, macd_hist = talib.MACD(close, fastperiod=macd_f, slowperiod=macd_s, signalperiod=macd_sig)
        
        stoch_k_vals, stoch_d_vals = talib.STOCH(high, low, close, fastk_period=stoch_k, slowk_period=stoch_d, slowd_period=stoch_d)
        
        calc_duration = time.monotonic() - calc_start_time
        logger.info(f"[{symbol_upper}] [{function_name}] TA-Lib calculations finished in {calc_duration:.4f}s.")
        
        # Convert back to pandas Series with original index
        sma_short_series = pd.Series(sma_short, index=df_ta.index)
        sma_long_series = pd.Series(sma_long, index=df_ta.index)
        bb_upper_series = pd.Series(bb_upper, index=df_ta.index)
        bb_middle_series = pd.Series(bb_middle, index=df_ta.index)
        bb_lower_series = pd.Series(bb_lower, index=df_ta.index)
        rsi_series = pd.Series(rsi, index=df_ta.index)
        volume_sma_series = pd.Series(volume_sma, index=df_ta.index)
        macd_line_series = pd.Series(macd_line, index=df_ta.index)
        macd_signal_series = pd.Series(macd_signal, index=df_ta.index)
        macd_hist_series = pd.Series(macd_hist, index=df_ta.index)
        stoch_k_series = pd.Series(stoch_k_vals, index=df_ta.index)
        stoch_d_series = pd.Series(stoch_d_vals, index=df_ta.index)

        # Format into Pydantic models
        logger.info(f"[{symbol_upper}] [{function_name}] Formatting calculated indicators into Pydantic models...")
        format_start_time = time.monotonic()
        
        indicator_history = IndicatorHistory(
            sma=SMASet(
                SMA_SHORT=_format_simple_series(sma_short_series, "SMA_SHORT"),
                SMA_LONG=_format_simple_series(sma_long_series, "SMA_LONG")
            ),
            bbands=BBandsSet(
                BBANDS_LOWER=_format_simple_series(bb_lower_series, "BBANDS_LOWER"),
                BBANDS_MIDDLE=_format_simple_series(bb_middle_series, "BBANDS_MIDDLE"),
                BBANDS_UPPER=_format_simple_series(bb_upper_series, "BBANDS_UPPER")
            ),
            rsi=RSISeries(
                RSI=_format_simple_series(rsi_series, f"RSI_{rsi_len}")
            ),
            volume=VolumeSeries(
                VOLUME=_format_volume_series(df_ta, 'volume', 'open', 'close')
            ),
            volume_sma=VolumeSMASeries(
                VOLUME_SMA=_format_simple_series(volume_sma_series, "VOLUME_SMA")
            ),
            macd=MACDSeries(
                MACD_LINE=_format_simple_series(macd_line_series, "MACD_LINE"),
                MACD_SIGNAL=_format_simple_series(macd_signal_series, "MACD_SIGNAL"),
                MACD_HIST=_format_macd_hist_series(macd_hist_series, "MACD_HIST")
            ),
                         stoch=STOCHSeries(
                 STOCH=_format_stoch_series(pd.DataFrame({'k': stoch_k_series, 'd': stoch_d_series}), 'k', 'd')
             )
        )
        
        format_duration = time.monotonic() - format_start_time
        logger.info(f"[{symbol_upper}] [{function_name}] Indicator formatting complete in {format_duration:.4f}s. Returning IndicatorHistory.")
        return indicator_history

    except Exception as e:
        calc_duration = time.monotonic() - calc_start_time
        logger.error(f"[{symbol_upper}] [{function_name}] Error during TA-Lib calculations after {calc_duration:.4f}s: {e}", exc_info=True)
        return None

logger.info(f"--- Indicator Service ({__name__} v{__version__}) loaded. Ready to calculate and format indicators. ---")