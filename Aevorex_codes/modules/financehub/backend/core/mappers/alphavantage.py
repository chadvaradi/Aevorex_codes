# backend/core/mappers/alphavantage.py
# ==============================================================================
# Mappers specifically for processing data obtained from the Alpha Vantage API.
# Handles News & Sentiment data and Earnings data.
# ==============================================================================

# --- Standard Library Imports ---
from datetime import datetime, timezone, date as DateObject
from typing import List, Optional, Dict, Any
import time # MODIFIED: For performance timing instead of Pandas

# --- Pydantic Imports ---
from pydantic import ValidationError, HttpUrl

# --- Core Imports (External) ---
try:
    # MODIFIED: Import EarningsPeriodData and EarningsData
    from modules.financehub.backend.models.stock import EarningsPeriodData, EarningsData
    from modules.financehub.backend.utils.helpers import (
        _clean_value,
        parse_optional_float,
        # parse_optional_int, # Not used in this file currently
        # parse_timestamp_to_iso_utc, # Not used in this file currently
        normalize_url,
    )
except ImportError as e:
    import logging
    logging.basicConfig(level="CRITICAL")
    # Use a specific logger for this critical startup error
    startup_logger = logging.getLogger(f"{__name__}.startup_critical")
    startup_logger.critical(f"AlphaVantage mapper FAILS INITIALIZATION (models/helpers): {e}", exc_info=True)
    raise RuntimeError(f"AlphaVantage mapper failed initialization (models/helpers): {e}") from e

# === INTERNAL IMPORTS ===
# --- 1. Import from Base ---
try:
    # AlphaVantage needs logger, StandardNewsDict type, and DEFAULT_NA_VALUE (though not directly used here, good for consistency)
    from ._mapper_base import logger, StandardNewsDict, DEFAULT_NA_VALUE
except ImportError as e_base:
    import logging
    logging.basicConfig(level="CRITICAL")
    startup_logger_base = logging.getLogger(f"{__name__}.startup_critical_base")
    startup_logger_base.critical(f"FATAL ERROR: Cannot import from _mapper_base in alphavantage_mapper: {e_base}", exc_info=True)
    raise RuntimeError(f"AlphaVantage mapper failed initialization due to missing _mapper_base: {e_base}") from e_base

# --- 2. Import from Shared Mappers (Not needed here) ---

# --- 3. Import from Dynamic Validator (NEEDED for earnings mapper) ---
try:
    from ._dynamic_validator import _dynamic_import_and_validate
except ImportError as e_validator:
    # Logger might not be fully initialized if _mapper_base failed, but attempt to use it.
    # If logger itself is the problem, the basicConfig above will handle it.
    _local_logger = logger if 'logger' in globals() else logging.getLogger(f"{__name__}.startup_critical_validator")
    _local_logger.critical(f"FATAL ERROR: Cannot import '_dynamic_import_and_validate' in alphavantage_mapper: {e_validator}", exc_info=True)
    raise RuntimeError(f"AlphaVantage mapper failed initialization due to missing _dynamic_validator: {e_validator}") from e_validator

# ==============================================================================
# === Module Version ===
# ==============================================================================
_MODULE_VERSION = "1.1.0" # Version after Earnings Refactor

# ==============================================================================
# === Alpha Vantage Specific Mappers ===
# ==============================================================================

# --- Internal News Item Mapper ---
def _map_alphavantage_item_to_standard(raw_item: Dict[str, Any]) -> Optional[StandardNewsDict]:
    """
    Maps a single raw news item from Alpha Vantage to the StandardNewsDict format.
    Performs data cleaning, validation, and type conversion.
    """
    # func_name = "_map_alphavantage_item_to_standard" # Less critical for internal helper
    log_prefix = "[alphavantage_news_item_mapper]" # Consistent prefix

    if not isinstance(raw_item, dict):
        logger.warning(f"{log_prefix} Input raw_item is not a dict. Type: {type(raw_item)}. Skipping.")
        return None

    # Preview raw item for easier debugging if needed (consider log level for this)
    # raw_item_preview = {k: v for k, v in raw_item.items() if k in ['url', 'time_published', 'title', 'source']}
    # logger.debug(f"{log_prefix} Processing raw item: {raw_item_preview}")

    try:
        # --- Extract and clean mandatory fields ---
        title = _clean_value(raw_item.get("title"))
        raw_url = _clean_value(raw_item.get("url"))
        published_str = _clean_value(raw_item.get("time_published")) # AV format: YYYYMMDDTHHMMSS

        # Normalize and validate URL
        url: Optional[HttpUrl] = normalize_url(raw_url, log_prefix=log_prefix)

        # --- Detailed checks before skipping ---
        if not title:
            logger.warning(f"{log_prefix} Skipping item: Missing or empty 'title'. Raw URL: {raw_url}")
            return None
        if not url:
            # normalize_url already logs, this is a fallback log
            logger.warning(f"{log_prefix} Skipping item: Invalid or missing 'url' after normalization. Original raw_url: {raw_url}")
            return None
        if not published_str:
            logger.warning(f"{log_prefix} Skipping item: Missing 'time_published' field. URL: {url}")
            return None # Timestamp is crucial

        # --- Parse Alpha Vantage specific timestamp ---
        published_utc: Optional[str] = None
        try:
            # Explicitly define the expected format
            dt_naive = datetime.strptime(published_str, "%Y%m%dT%H%M%S")
            # Assume UTC as per general practice for financial APIs without explicit timezone
            dt_aware = dt_naive.replace(tzinfo=timezone.utc)
            # Format to ISO 8601 with 'Z' for UTC
            published_utc = dt_aware.isoformat(timespec='seconds').replace('+00:00', 'Z')
        except (ValueError, TypeError) as e_time:
            logger.warning(f"{log_prefix} Skipping item: Could not parse 'time_published' string '{published_str}'. Error: {e_time}. URL: {url}")
            return None

        # --- Optional fields ---
        snippet = _clean_value(raw_item.get("summary"))
        source_name = _clean_value(raw_item.get("source"))
        source_domain = _clean_value(raw_item.get("source_domain"))
        raw_image_url = _clean_value(raw_item.get("banner_image"))
        image_url: Optional[HttpUrl] = normalize_url(raw_image_url, log_prefix=log_prefix) if raw_image_url else None

        # --- Extract tickers and sentiment ---
        tickers: List[str] = []
        overall_sentiment_score: Optional[float] = None
        overall_sentiment_label: Optional[str] = None

        ticker_sentiment_list = raw_item.get("ticker_sentiment", [])
        if isinstance(ticker_sentiment_list, list):
            for ts_item in ticker_sentiment_list:
                if isinstance(ts_item, dict):
                    ticker = _clean_value(ts_item.get("ticker"))
                    if ticker and isinstance(ticker, str): # Ensure ticker is string after cleaning
                        tickers.append(ticker.upper()) # Standardize to uppercase

            # Extract overall sentiment (AV provides this separately)
            overall_sentiment_score_raw = raw_item.get("overall_sentiment_score")
            overall_sentiment_score = parse_optional_float(overall_sentiment_score_raw, context=f"{log_prefix}:overall_sentiment_score for URL {url}")
            overall_sentiment_label = _clean_value(raw_item.get("overall_sentiment_label"))

            # Standardize 'Neutral' label if needed (sometimes comes as lowercase or other variations)
            if overall_sentiment_label and overall_sentiment_label.lower() == "neutral":
                overall_sentiment_label = "Neutral"
        elif ticker_sentiment_list: # If it exists but isn't a list
            logger.warning(f"{log_prefix} Expected 'ticker_sentiment' to be a list, but got {type(ticker_sentiment_list)}. Cannot extract tickers/sentiment. URL: {url}")

        # --- Assemble standard dictionary ---
        standard_dict: StandardNewsDict = {
            "title": title,
            "url": url,
            "published_utc": published_utc,
            "source_name": source_name if source_name else source_domain if source_domain else "Alpha Vantage",
            "snippet": snippet if snippet else title, # Use title if summary is missing
            "image_url": image_url,
            "tickers": tickers,
            "api_source": "alphavantage", # Hardcoded API source
            "sentiment_score": overall_sentiment_score,
            "sentiment_label": overall_sentiment_label,
        }
        # logger.debug(f"{log_prefix} Successfully mapped item. URL: {url}")
        return standard_dict

    except Exception as e:
        logger.error(f"{log_prefix} Unexpected error mapping news item (URL: {raw_item.get('url', 'N/A')}): {e}", exc_info=True)
        return None

# --- Earnings Dictionary Mapper ---
def map_alpha_vantage_earnings_to_model(
    av_earnings_data: Optional[Dict[str, Any]],
    request_id: str # For traceable logging
) -> Optional[EarningsData]:
    """
    Maps the raw dictionary response from Alpha Vantage EARNINGS API endpoint
    to the EarningsData Pydantic model using dynamic validation.
    Handles both annual and quarterly reports present in the AV response.
    """
    func_name = "map_alpha_vantage_earnings_to_model"
    log_prefix = f"[{request_id}][{func_name}]"
    logger.debug(f"{log_prefix} Starting mapping of Alpha Vantage earnings dict...")

    if not av_earnings_data or not isinstance(av_earnings_data, dict):
        logger.info(f"{log_prefix} Input av_earnings_data is None or not a dict. Cannot map.")
        return None

    map_start_time = time.monotonic() # MODIFIED: Use time.monotonic()

    symbol = av_earnings_data.get('symbol')
    annual_reports_raw = av_earnings_data.get('annualEarnings')
    quarterly_reports_raw = av_earnings_data.get('quarterlyEarnings')
    # Alpha Vantage API does not provide currency directly in this earnings report.
    # It might be part of a company overview endpoint or other sources.
    # For now, currency will rely on the Pydantic model's default or be None.

    if not symbol:
        logger.warning(f"{log_prefix} Missing 'symbol' key in Alpha Vantage response. API data might be incomplete.")
        # We can proceed if reports are present, but it's a sign of a potential issue.
    if not isinstance(annual_reports_raw, list):
         logger.warning(f"{log_prefix} 'annualEarnings' is missing or not a list for symbol '{symbol}'. Defaulting to empty list.")
         annual_reports_raw = [] # Ensure it's an iterable list
    if not isinstance(quarterly_reports_raw, list):
         logger.warning(f"{log_prefix} 'quarterlyEarnings' is missing or not a list for symbol '{symbol}'. Defaulting to empty list.")
         quarterly_reports_raw = [] # Ensure it's an iterable list

    if not annual_reports_raw and not quarterly_reports_raw:
        logger.warning(f"{log_prefix} Both 'annualEarnings' and 'quarterlyEarnings' are missing or empty for symbol '{symbol}'. Cannot map any earnings data.")
        return None

    logger.debug(f"{log_prefix} Processing AV earnings for symbol '{symbol}'. Annual reports raw: {len(annual_reports_raw)}, Quarterly reports raw: {len(quarterly_reports_raw)}.")

    # --- Helper function to process a list of AV report dictionaries ---
    def _process_av_report_list(raw_list: List[Dict[str, Any]], report_type: str, parent_log_prefix: str) -> List[EarningsPeriodData]:
        processed_list: List[EarningsPeriodData] = []
        skipped_count = 0
        if not raw_list: # Guard against empty list input
            return processed_list

        for i, report_dict in enumerate(raw_list):
            # Unique log prefix for each report item being processed
            report_log_prefix = f"{parent_log_prefix}[{report_type} Raw #{i+1}]"

            if not isinstance(report_dict, dict):
                 logger.warning(f"{report_log_prefix} Skipping: Item is not a dictionary (type: {type(report_dict)}).")
                 skipped_count += 1
                 continue

            try:
                fiscal_date_str = report_dict.get('fiscalDateEnding') # Expected format: YYYY-MM-DD
                reported_eps_str = report_dict.get('reportedEPS')   # AV EPS field name

                # --- Parse fiscalDateEnding to date object ---
                fiscal_date_obj: Optional[DateObject] = None
                if fiscal_date_str and isinstance(fiscal_date_str, str):
                    try:
                        fiscal_date_obj = datetime.strptime(fiscal_date_str, '%Y-%m-%d').date()
                    except ValueError:
                         logger.warning(f"{report_log_prefix} Could not parse 'fiscalDateEnding': '{fiscal_date_str}'. Invalid format.")
                elif fiscal_date_str: # It exists but not a string
                     logger.warning(f"{report_log_prefix} 'fiscalDateEnding' is not a string: '{fiscal_date_str}' (type: {type(fiscal_date_str)}).")
                else: # It's None or empty
                     logger.warning(f"{report_log_prefix} Missing 'fiscalDateEnding'.")

                # --- Parse reportedEPS to float ---
                # Handles "None" string, numeric strings, and actual None.
                reported_eps_val: Optional[float] = parse_optional_float(
                    reported_eps_str,
                    context=f"{report_log_prefix}:reportedEPS"
                )
                # Add specific logging if parsing to float failed but string was not 'None'
                if reported_eps_val is None and reported_eps_str is not None and str(reported_eps_str).strip().lower() != 'none':
                    logger.warning(f"{report_log_prefix} 'reportedEPS' ('{reported_eps_str}') could not be parsed to float and was not 'None'.")
                elif reported_eps_str is None:
                     logger.debug(f"{report_log_prefix} 'reportedEPS' field is missing (None).")
                elif str(reported_eps_str).strip().lower() == 'none':
                     logger.debug(f"{report_log_prefix} 'reportedEPS' is '{reported_eps_str}', treated as missing.")


                # --- Instantiate EarningsPeriodData if critical data is valid ---
                if fiscal_date_obj is not None and reported_eps_val is not None:
                     try:
                         # MODIFIED: Instantiate EarningsPeriodData using 'date' field name
                         report_item = EarningsPeriodData(
                             date=fiscal_date_obj, # Use the actual model field name 'date'
                             reported_eps=reported_eps_val,
                             # Alpha Vantage earnings endpoint typically doesn't provide these:
                             revenue=None,
                             net_income=None,
                             # currency field will use model default (likely None)
                         )
                         processed_list.append(report_item)
                     except ValidationError as e_val:
                         errors_summary = "; ".join([f"{'.'.join(map(str, err['loc']))}: {err['msg']}" for err in e_val.errors()])
                         logger.warning(f"{report_log_prefix} Skipping: Failed Pydantic validation for EarningsPeriodData. Errors: {errors_summary}. Data: date='{fiscal_date_obj}', eps='{reported_eps_val}'")
                         skipped_count += 1
                else:
                     # Log reason for skipping if critical fields are missing
                     reasons = []
                     if fiscal_date_obj is None: reasons.append("missing/invalid fiscal_date_ending")
                     if reported_eps_val is None: reasons.append("missing/invalid reported_eps")
                     logger.warning(f"{report_log_prefix} Skipping report due to {', '.join(reasons)}. Raw EPS: '{reported_eps_str}', Raw Date: '{fiscal_date_str}'")
                     skipped_count += 1

            except Exception as e_inner: # Catch-all for unexpected errors in the loop
                 logger.error(f"{report_log_prefix} Unexpected error processing individual report: {e_inner}. Raw data: {report_dict}", exc_info=True)
                 skipped_count += 1

        if skipped_count > 0:
            logger.warning(f"{parent_log_prefix} Skipped {skipped_count} out of {len(raw_list)} {report_type} reports during detailed mapping.")
        return processed_list

    # Process annual and quarterly reports
    mapped_annual_reports: List[EarningsPeriodData] = _process_av_report_list(annual_reports_raw, "Annual", log_prefix)
    mapped_quarterly_reports: List[EarningsPeriodData] = _process_av_report_list(quarterly_reports_raw, "Quarterly", log_prefix)

    if not mapped_annual_reports and not mapped_quarterly_reports:
         logger.warning(f"{log_prefix} No valid annual or quarterly reports could be mapped from Alpha Vantage data for symbol '{symbol}'.")
         return None

    # --- Assemble Final Model Data for Validation ---
    # MODIFIED: Sort by 'date' field of EarningsPeriodData
    earnings_data_to_validate = {
         "annual_reports": sorted(mapped_annual_reports, key=lambda r: r.date, reverse=True),
         "quarterly_reports": sorted(mapped_quarterly_reports, key=lambda r: r.date, reverse=True),
         # "currency": None, # Explicitly None if not sourced, model will handle default
         # "symbol": symbol, # If your EarningsData container expects a symbol. Not explicitly requested.
    }

    # Use the dynamic validator for the final EarningsData container model
    validated_earnings_data_container: Optional[EarningsData] = _dynamic_import_and_validate(
        model_name='EarningsData', # This refers to your ...models.stock.EarningsData
        data=earnings_data_to_validate,
        log_prefix=log_prefix
    )

    map_duration_seconds = time.monotonic() - map_start_time # MODIFIED: Use time.monotonic()

    if validated_earnings_data_container:
        logger.info(
            f"{log_prefix} Successfully mapped AV earnings to EarningsData for '{symbol}' "
            f"in {map_duration_seconds:.4f}s. "
            f"Valid Annual: {len(validated_earnings_data_container.annual_reports)}, "
            f"Valid Quarterly: {len(validated_earnings_data_container.quarterly_reports)}."
        )
        # The type: ignore is acceptable if _dynamic_import_and_validate has a generic return type
        # like Optional[BaseModel] or Any.
        return validated_earnings_data_container # type: ignore
    else:
        logger.error(
            f"{log_prefix} Final validation FAILED for EarningsData container model "
            f"for symbol '{symbol}' after Alpha Vantage mapping ({map_duration_seconds:.4f}s)."
        )
        return None

# --- Module Load Confirmation ---
# Placed at the end to ensure all definitions are processed.
logger.info(f"--- {__name__} (Alpha Vantage Mappers - v{_MODULE_VERSION} - Earnings Refactored) loaded successfully. ---")