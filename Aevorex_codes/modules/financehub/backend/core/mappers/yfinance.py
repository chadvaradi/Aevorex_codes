# backend/core/mappers/yfinance.py
# ==============================================================================
# Mappers specifically for processing data obtained from the yfinance library.
# This module is rewritten for enhanced robustness, testability, and logging.
# ==============================================================================

import pandas as pd
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date # Required for DataFrame column checks, OHLCV timestamp conversion, and EarningsPeriodData
import logging
from pydantic import ValidationError, HttpUrl

# --- Core Model Imports ---
try:
    from modules.financehub.backend.models.stock import (
        CompanyOverview,
        FinancialsData,
        EarningsData,
        EarningsPeriodData,
        NewsItem
    )
except ImportError as e_models:
    # Fallback logging if main logger isn't set up yet
    import logging as core_logging_models
    core_logging_models.basicConfig(level="CRITICAL")
    cl_models = core_logging_models.getLogger(__name__)
    cl_models.critical(f"FATAL ERROR: Failed importing Pydantic models from modules.financehub.backend.models.stock: {e_models}", exc_info=True)
    raise RuntimeError(f"YFinance mapper failed initialization due to missing Pydantic models: {e_models}") from e_models

# --- Core Utility Imports ---
try:
    from modules.financehub.backend.utils.helpers import (
        _clean_value, parse_optional_float, parse_optional_int,
        parse_timestamp_to_iso_utc, normalize_url
    )
except ImportError as e_helpers:
    import logging as core_logging_helpers
    core_logging_helpers.basicConfig(level="CRITICAL")
    cl_helpers = core_logging_helpers.getLogger(__name__)
    cl_helpers.critical(f"FATAL ERROR: Failed importing CORE helper functions from utils.helpers: {e_helpers}", exc_info=True)
    raise RuntimeError(f"YFinance mapper failed initialization due to missing helpers: {e_helpers}") from e_helpers

# --- Base Mapper Imports ---
try:
    from ._mapper_base import logger, StandardNewsDict, safe_get, YFINANCE_NEWS_DEFAULT_SOURCE_NAME
except ImportError as e_base:
    import logging as core_logging_base
    core_logging_base.basicConfig(level="INFO") # Basic config for fallback
    logger = core_logging_base.getLogger(__name__) # Fallback logger
    logger.critical(f"FATAL ERROR: Cannot import from _mapper_base in yfinance_mapper: {e_base}. Using fallback logger and definitions.", exc_info=True)
    
    # Fallback definitions for essential components if _mapper_base is unavailable
    class StandardNewsDict(Dict[str, Any]): pass # Basic fallback TypedDict
    YFINANCE_NEWS_DEFAULT_SOURCE_NAME = "yfinance (fallback)"
    
    def safe_get(data_struct: Union[Dict, pd.DataFrame], key: Any, column: Optional[Any] = None, default: Optional[Any] = None) -> Any:
        """Basic fallback for safe_get if _mapper_base is not available."""
        if data_struct is None:
            return default
        if isinstance(data_struct, dict):
            return data_struct.get(key, default)
        if isinstance(data_struct, pd.DataFrame):
            if column is not None: # Access a specific cell
                if key in data_struct.index and column in data_struct.columns:
                    try:
                        val = data_struct.loc[key, column]
                        # NaN or NaT values from pandas should be handled by parse_optional_* helpers
                        return val
                    except Exception as e_loc:
                        logger.debug(f"Fallback safe_get: Error accessing df.loc['{key}', '{column}']: {e_loc}")
                        return default
                return default
            else: # Get a whole row as Series
                 if key in data_struct.index:
                    try:
                        return data_struct.loc[key]
                    except Exception as e_loc_row:
                        logger.debug(f"Fallback safe_get: Error accessing df.loc['{key}']: {e_loc_row}")
                        return default
                 return default
        return default
    logger.warning("Using fallback definitions for _mapper_base components due to import error.")
    # No RuntimeError raised here for _mapper_base import to allow some basic functionality if only logger/minor parts are missing,
    # but critical model/helper imports above *will* raise RuntimeError.

# --- Module-level Constants ---
_YFINANCE_REVENUE_KEYS: List[str] = ['Total Revenue', 'Revenues', 'Revenue', 'Net Revenue']
_YFINANCE_NET_INCOME_KEYS: List[str] = ['Net Income', 'Net Income Common Stockholders', 'Net Income From Continuing Operations', 'Net Income Applicable To Common Shares', 'Net Income Available to Common Stockholders']
_YFINANCE_ASSETS_KEYS: List[str] = ['Total Assets']
_YFINANCE_LIABILITIES_KEYS: List[str] = ['Total Liabilities Net Minority Interest', 'Total Liabilities', 'Total Liabilities Net Minority']

_OHLCV_COLUMN_MAP: Dict[str, str] = {
    'open': 'o',
    'high': 'h',
    'low': 'l',
    'close': 'c',
    'volume': 'v',
}
# Original yfinance column names, used for initial check before normalization in map_yfinance_ohlcv_df_to_chart_list
# _EXPECTED_YFINANCE_OHLCV_COLUMNS: List[str] = ['Open', 'High', 'Low', 'Close', 'Volume'] # Not strictly needed if normalization is robust

# ==============================================================================
# === yfinance Specific Mappers ===
# ==============================================================================

def _map_yfinance_item_to_standard(
    raw_item: Dict[str, Any],
    request_id: Optional[str] = "N/A_REQ_ID"
) -> Optional[StandardNewsDict]:
    """
    Maps a raw dictionary from yfinance Ticker.news to the StandardNewsDict format.
    Prioritizes data from the 'content' sub-dictionary, with fallbacks to root-level fields.
    Ensures 'published_on_raw_val' is defined before use to prevent UnboundLocalError.

    Args:
        raw_item: A dictionary representing a single news item from yfinance.
        request_id: An optional request identifier for logging purposes.

    Returns:
        A StandardNewsDict if mapping is successful, otherwise None.
    """
    func_name = "_map_yfinance_item_to_standard"
    item_uuid = raw_item.get('uuid', 'N/A_UUID')
    log_prefix = f"[{request_id}][{func_name}][UUID:{item_uuid}]"

    if not isinstance(raw_item, dict):
        logger.warning(f"{log_prefix} Input raw_item is not a dict (Type: {type(raw_item)}). Skipping.")
        return None

    # --- 1. Get the 'content' dictionary ---
    content_dict_raw = raw_item.get("content")
    content_dict: Dict[str, Any] 

    if isinstance(content_dict_raw, dict):
        content_dict = content_dict_raw
    else:
        if content_dict_raw is not None:
             logger.warning(f"{log_prefix} 'content' field is present but not a dict (Type: {type(content_dict_raw)}). "
                            f"Treating as empty for structured access. Raw 'content': {str(content_dict_raw)[:200]}")
        content_dict = {}

    # --- 2. Extract Published Date ---
    # CRITICAL FIX: Initialize published_on_raw_val to ensure it's always defined.
    # Priority: content.pubDate -> content.displayTime -> root.providerPublishTime
    published_on_raw_val: Any = None # <<< INITIALIZED HERE
    source_field_date: str = "unknown"

    # Try to get from content_dict first
    if "pubDate" in content_dict and content_dict.get("pubDate") is not None:
        published_on_raw_val = content_dict.get("pubDate")
        source_field_date = "content.pubDate"
    elif "displayTime" in content_dict and content_dict.get("displayTime") is not None:
        published_on_raw_val = content_dict.get("displayTime")
        source_field_date = "content.displayTime"
    
    # Fallback to root if not found in content or content_dict was empty/malformed
    if published_on_raw_val is None and raw_item.get("providerPublishTime") is not None:
        published_on_raw_val = raw_item.get("providerPublishTime")
        source_field_date = "root.providerPublishTime"
        logger.debug(f"{log_prefix} Date not in 'content', using fallback '{source_field_date}': {published_on_raw_val}")


    published_utc_str: Optional[str] = None # Initialize for the parsing block
    if published_on_raw_val is not None: # <<< NOW THIS CHECK IS SAFE
        try:
            published_utc_str = parse_timestamp_to_iso_utc(
                published_on_raw_val,
                context=f"{log_prefix}:timestamp_from_{source_field_date}"
            )
            if published_utc_str:
                logger.debug(f"{log_prefix} Parsed timestamp from '{source_field_date}': Raw='{published_on_raw_val}' -> ISO='{published_utc_str}'")
            else:
                logger.warning(f"{log_prefix} Timestamp from '{source_field_date}' (Raw='{published_on_raw_val}') parsed to None by helper. Timestamp will be None.")
        except ValueError as e_ts:
            logger.warning(f"{log_prefix} Failed to parse timestamp from '{source_field_date}': Raw='{published_on_raw_val}'. Error: {e_ts}. Timestamp will be None.")
    else:
        logger.debug(f"{log_prefix} No suitable timestamp field found or value was None ('content.pubDate', 'content.displayTime', or 'root.providerPublishTime'). Timestamp will be None.")

    # --- 3. Extract Title ---
    raw_title_value: Any = None
    source_field_title: str = "unknown"

    if content_dict.get("title"):
        raw_title_value = content_dict.get("title")
        source_field_title = "content.title"
    elif content_dict.get("headline"):
        raw_title_value = content_dict.get("headline")
        source_field_title = "content.headline"
    
    if not raw_title_value: # Fallback to root if not in content
        if raw_item.get("title"):
            raw_title_value = raw_item.get("title")
            source_field_title = "root.title"
        elif raw_item.get("headline"):
            raw_title_value = raw_item.get("headline")
            source_field_title = "root.headline"
        if raw_title_value:
            logger.debug(f"{log_prefix} Title not in 'content', using fallback '{source_field_title}'.")
            
    title = _clean_value(raw_title_value)

    if not title:
        logger.warning(f"{log_prefix} Skipping item: Missing or empty 'title' after cleaning. "
                       f"Attempted source: '{source_field_title}', Raw value: '{str(raw_title_value)[:100]}'. "
                       f"Item ID: {raw_item.get('id', 'N/A')}. Content keys: {list(content_dict.keys())}.")
        return None
    logger.debug(f"{log_prefix} Title extracted from '{source_field_title}': '{title}'")


    # --- 4. Extract URL ---
    raw_url_str: Optional[str] = None
    source_field_url: str = "unknown"

    def _get_url_from_complex_field(data_field: Any) -> Optional[str]:
        if isinstance(data_field, dict): return data_field.get("url")
        if isinstance(data_field, str): return data_field
        return None

    if "canonicalUrl" in content_dict:
        raw_url_str = _get_url_from_complex_field(content_dict.get("canonicalUrl"))
        if raw_url_str: source_field_url = "content.canonicalUrl"
    
    if not raw_url_str and "clickThroughUrl" in content_dict:
        raw_url_str = _get_url_from_complex_field(content_dict.get("clickThroughUrl"))
        if raw_url_str: source_field_url = "content.clickThroughUrl"

    if not raw_url_str: # Fallback to root if not in content
        link_val_at_root = raw_item.get("link")
        if isinstance(link_val_at_root, str):
            raw_url_str = link_val_at_root
            if raw_url_str:
                source_field_url = "root.link"
                logger.debug(f"{log_prefix} URL not in 'content', using fallback '{source_field_url}'.")
        elif link_val_at_root is not None:
            logger.debug(f"{log_prefix} Root 'link' field was not a string (Type: {type(link_val_at_root)}): '{str(link_val_at_root)[:100]}'")

    cleaned_raw_url = _clean_value(raw_url_str)
    url_normalized_str: Optional[str] = normalize_url(cleaned_raw_url) 

    if not url_normalized_str:
        logger.warning(f"{log_prefix} Skipping item: Invalid or missing URL after cleaning and normalization. "
                       f"Attempted source: '{source_field_url}', Raw URL string: '{str(raw_url_str)[:200]}', Cleaned: '{cleaned_raw_url}'. Title: '{title}'")
        return None
    logger.debug(f"{log_prefix} URL extracted from '{source_field_url}', Normalized: '{url_normalized_str}'")


    # --- 5. Extract Publisher ---
    raw_publisher_name: Optional[str] = None
    source_field_publisher: str = "unknown"

    provider_sub_dict = content_dict.get("provider")
    if isinstance(provider_sub_dict, dict):
        display_name = provider_sub_dict.get("displayName")
        if isinstance(display_name, str):
            raw_publisher_name = display_name
            if raw_publisher_name: source_field_publisher = "content.provider.displayName"
        elif display_name is not None:
             logger.debug(f"{log_prefix} 'content.provider.displayName' was not a string (Type: {type(display_name)}): '{str(display_name)[:100]}'")
    
    if not raw_publisher_name: # Fallback to root
        publisher_at_root = raw_item.get("publisher")
        if isinstance(publisher_at_root, str):
            raw_publisher_name = publisher_at_root
            if raw_publisher_name:
                source_field_publisher = "root.publisher"
                logger.debug(f"{log_prefix} Publisher not in 'content.provider', using fallback '{source_field_publisher}'.")
        elif publisher_at_root is not None:
            logger.debug(f"{log_prefix} Root 'publisher' field was not a string (Type: {type(publisher_at_root)}): '{str(publisher_at_root)[:100]}'")

    publisher = _clean_value(raw_publisher_name)
    if not publisher:
        publisher = YFINANCE_NEWS_DEFAULT_SOURCE_NAME
        source_field_publisher = "default_fallback"
        logger.debug(f"{log_prefix} Publisher name was empty/None after attempts, set to default: '{publisher}'")
    logger.debug(f"{log_prefix} Publisher identified from '{source_field_publisher}': '{publisher}'")


    # --- 6. Extract Thumbnail ---
    raw_thumbnail_container: Any = None
    source_field_thumb: str = "unknown"

    if "thumbnail" in content_dict:
        raw_thumbnail_container = content_dict.get("thumbnail")
        if raw_thumbnail_container: source_field_thumb = "content.thumbnail"
    
    if not raw_thumbnail_container: # Fallback to root
        raw_thumbnail_container = raw_item.get("thumbnail")
        if raw_thumbnail_container:
            source_field_thumb = "root.thumbnail"
            logger.debug(f"{log_prefix} Thumbnail not in 'content', using fallback '{source_field_thumb}'.")
    
    image_url_str_candidate: Optional[str] = None
    pydantic_image_url: Optional[HttpUrl] = None

    if raw_thumbnail_container:
        logger.debug(f"{log_prefix} Thumbnail data found via '{source_field_thumb}'. Processing...")
        if isinstance(raw_thumbnail_container, dict):
            resolutions = raw_thumbnail_container.get('resolutions')
            if isinstance(resolutions, list) and resolutions:
                valid_res_items = [
                    res for res in resolutions
                    if isinstance(res, dict) and isinstance(res.get('url'), str) and res.get('url')
                ]
                if valid_res_items:
                    def get_area(r_dict):
                        w = r_dict.get('width', 0); h = r_dict.get('height', 0)
                        w = w if isinstance(w, (int, float)) else 0
                        h = h if isinstance(h, (int, float)) else 0
                        return w * (h if h > 0 else w)
                    valid_res_items.sort(key=get_area, reverse=True)
                    image_url_str_candidate = _clean_value(valid_res_items[0]['url'])
                    logger.debug(f"{log_prefix} Selected thumbnail from resolutions: '{image_url_str_candidate}' (best from {len(valid_res_items)} valid options).")
                else: logger.debug(f"{log_prefix} No valid thumbnail URLs with string 'url' in 'thumbnail.resolutions': {str(resolutions)[:200]}")
            else: logger.debug(f"{log_prefix} '{source_field_thumb}.resolutions' missing, not list, or empty.")
        elif isinstance(raw_thumbnail_container, str) and raw_thumbnail_container:
            image_url_str_candidate = _clean_value(raw_thumbnail_container)
            logger.debug(f"{log_prefix} Thumbnail is direct string from '{source_field_thumb}': '{image_url_str_candidate}'.")
        else: logger.debug(f"{log_prefix} Thumbnail data from '{source_field_thumb}' not dict or usable string (Type: {type(raw_thumbnail_container)}).")
    else: logger.debug(f"{log_prefix} No thumbnail data found in 'content.thumbnail' or 'root.thumbnail'.")

    if image_url_str_candidate:
        normalized_thumb_url_str = normalize_url(image_url_str_candidate)
        if normalized_thumb_url_str:
            try: pydantic_image_url = HttpUrl(normalized_thumb_url_str)
            except ValidationError: logger.warning(f"{log_prefix} Thumbnail URL '{image_url_str_candidate}' (norm: {normalized_thumb_url_str}) invalid HttpUrl. Image URL will be None.")
        else: logger.debug(f"{log_prefix} Thumbnail URL '{image_url_str_candidate}' failed normalization. Image URL will be None.")


    # --- 7. Extract Tickers (from root.relatedTickers) ---
    tickers: List[str] = []
    related_tickers_raw_data = raw_item.get("relatedTickers") 
    if isinstance(related_tickers_raw_data, list):
        for t_item in related_tickers_raw_data:
            if t_item and isinstance(t_item, (str, int, float)): 
                cleaned_ticker = _clean_value(str(t_item))
                if cleaned_ticker: tickers.append(cleaned_ticker.upper())
    elif isinstance(related_tickers_raw_data, str):
        cleaned_ticker = _clean_value(related_tickers_raw_data)
        if cleaned_ticker: tickers.append(cleaned_ticker.upper())
    elif related_tickers_raw_data is not None:
        logger.warning(f"{log_prefix} 'relatedTickers' unhandled type {type(related_tickers_raw_data)}: '{str(related_tickers_raw_data)[:100]}'. Ignoring.")
    logger.debug(f"{log_prefix} Extracted tickers: {tickers}")

    # --- 8. Extract Summary/Snippet ---
    # Priority: content.summary -> content.description -> title (as fallback)
    raw_summary_value: Any = None
    source_field_summary: str = "unknown"

    if content_dict.get("summary"):
        raw_summary_value = content_dict.get("summary")
        source_field_summary = "content.summary"
    elif content_dict.get("description"): # Some APIs use 'description'
        raw_summary_value = content_dict.get("description")
        source_field_summary = "content.description"
    
    snippet = _clean_value(raw_summary_value)
    if not snippet: # If no summary from content, or it was empty after cleaning
        snippet = title # Fallback to the already validated and cleaned title
        source_field_summary = "title_fallback"
        logger.debug(f"{log_prefix} Snippet not found in 'content.summary' or 'content.description', using title as fallback.")
    else:
        logger.debug(f"{log_prefix} Snippet extracted from '{source_field_summary}'. Length: {len(snippet)}")


    # --- 9. Construct StandardNewsDict ---
    try:
        standard_item_data: StandardNewsDict = {
            "title": title,
            "url": url_normalized_str, # Should be string
            "published_utc": published_utc_str,
            "source_name": publisher,
            "snippet": snippet, # Using the extracted or fallback snippet
            "image_url": pydantic_image_url, # HttpUrl or None
            "tickers": tickers,
            "api_source": "yfinance",
            "sentiment_score": None,
            "sentiment_label": None,
        }
        
        logger.info(f"{log_prefix} Successfully mapped yfinance news item. Title: '{title}', URL: {url_normalized_str}")
        return standard_item_data

    except Exception as e_final:
        logger.error(f"{log_prefix} Unexpected error creating StandardNewsDict (Title: '{title}'): {e_final}", exc_info=True)
        return None

# ... (rest of the file: map_yfinance_financial_statement_to_earnings_periods, etc.)

def map_yfinance_financial_statement_to_earnings_periods(
    statement_df: Optional[pd.DataFrame],
    request_id: str,
    currency: Optional[str], 
    report_period_type: str # "annual" or "quarterly"
) -> List[EarningsPeriodData]:
    """
    Maps a yfinance financial statement DataFrame to a list of EarningsPeriodData.
    Designed for Ticker.financials (annual) or Ticker.quarterly_financials.

    Args:
        statement_df: DataFrame with financial metrics as index and dates as columns.
        request_id: Logger request identifier.
        currency: Currency code (e.g., "USD").
        report_period_type: "annual" or "quarterly" for context.

    Returns:
        List of EarningsPeriodData instances, empty if no data.
    """
    func_name = "map_yfinance_financial_statement_to_earnings_periods"
    log_prefix = f"[{request_id}][{func_name}][{report_period_type.upper()}]"

    if statement_df is None:
        logger.info(f"{log_prefix} Input statement_df is None. Returning empty list.")
        return []
    if not isinstance(statement_df, pd.DataFrame):
        logger.warning(f"{log_prefix} Input statement_df is not a DataFrame (Type: {type(statement_df)}). Returning empty list.")
        return []
    if statement_df.empty:
        logger.info(f"{log_prefix} Input statement_df is empty. Returning empty list.")
        return []

    logger.debug(f"{log_prefix} Processing {report_period_type} statement. Shape: {statement_df.shape}, Index: {list(statement_df.index[:5])}..., Cols: {list(statement_df.columns)}")

    period_reports_list: List[EarningsPeriodData] = []
    processed_columns_count = 0
    skipped_columns_count = 0

    # Determine which row names to use for revenue and net income
    revenue_row_name = next((key for key in _YFINANCE_REVENUE_KEYS if key in statement_df.index), None)
    net_income_row_name = next((key for key in _YFINANCE_NET_INCOME_KEYS if key in statement_df.index), None)

    if not net_income_row_name:
        logger.warning(f"{log_prefix} Essential 'Net Income' metric not found in DataFrame index using keys: {_YFINANCE_NET_INCOME_KEYS}. Net income will be None in all reports from this statement.")
    if not revenue_row_name:
        logger.info(f"{log_prefix} 'Revenue' metric not found in DataFrame index using keys: {_YFINANCE_REVENUE_KEYS}. Revenue will be None in all reports from this statement.")
    logger.debug(f"{log_prefix} Using Revenue row: '{revenue_row_name}', Net Income row: '{net_income_row_name}'.")

    for col_header in statement_df.columns: # yfinance DFs usually have Timestamps as column headers
        period_date: Optional[date] = None
        col_log_id = str(col_header)[:30] # For concise logging

        try:
            if isinstance(col_header, (datetime, pd.Timestamp)):
                period_date = col_header.date()
            elif isinstance(col_header, str):
                try:
                    period_date = pd.to_datetime(col_header, errors='raise').date()
                except ValueError:
                    logger.warning(f"{log_prefix} Could not parse date from string column header '{col_log_id}'. Skipping column.")
                    skipped_columns_count += 1
                    continue
            else:
                logger.warning(f"{log_prefix} Column header '{col_log_id}' (Type: {type(col_header)}) is not a recognized date format. Skipping column.")
                skipped_columns_count += 1
                continue
            
            if period_date is None: # Should have been caught, but as a safeguard
                logger.warning(f"{log_prefix} Failed to determine date for column '{col_log_id}'. Skipping.")
                skipped_columns_count += 1
                continue

            raw_revenue = safe_get(statement_df, revenue_row_name, col_header) if revenue_row_name else None
            raw_net_income = safe_get(statement_df, net_income_row_name, col_header) if net_income_row_name else None
            logger.debug(f"{log_prefix} For date {period_date}: Raw Revenue='{raw_revenue}' (Type: {type(raw_revenue)}), Raw Net Income='{raw_net_income}' (Type: {type(raw_net_income)})") # <<< ÚJ DEBUG SOR
            revenue_val = parse_optional_int(raw_revenue, context=f"{log_prefix}:Revenue_{period_date}")
            net_income_val = parse_optional_int(raw_net_income, context=f"{log_prefix}:NetIncome_{period_date}")
            
            report_data_dict = {
                "date": period_date,
                "reported_revenue": revenue_val,
                "net_income": net_income_val,
                "currency": currency,
                "reported_eps": None, # Not available in yfinance income statements
                "estimated_eps": None, # Not available in yfinance income statements
                "surprise_percentage": None # Will be calculated by Pydantic model if EPS data present
            }
            
            try:
                period_report = EarningsPeriodData(**report_data_dict)
                period_reports_list.append(period_report)
                processed_columns_count +=1
                logger.debug(f"{log_prefix} Successfully created EarningsPeriodData for {period_date}: Rev={revenue_val}, NI={net_income_val}")
            except ValidationError as e_report:
                errors_summary = "; ".join([f"'{'.'.join(map(str, err['loc']))}': {err['msg']}" for err in e_report.errors()])
                logger.warning(f"{log_prefix} Pydantic validation failed for EarningsPeriodData (Date: {period_date}). Errors: {errors_summary}. Data: {report_data_dict}. Skipping this period.")
                skipped_columns_count += 1
        
        except Exception as e_col:
            logger.error(f"{log_prefix} Unexpected error processing column '{col_log_id}' for period data: {e_col}. Skipping column.", exc_info=True)
            skipped_columns_count += 1
            continue

    if skipped_columns_count > 0:
        logger.info(f"{log_prefix} Processed {processed_columns_count} columns successfully, skipped {skipped_columns_count} out of {len(statement_df.columns)} columns during mapping.")

    if not period_reports_list:
        logger.info(f"{log_prefix} No valid EarningsPeriodData objects were created from the {report_period_type} statement.")
        return []

    # Sort reports by date descending (most recent first)
    sorted_period_reports = sorted(period_reports_list, key=lambda r: r.date, reverse=True)
    logger.info(f"{log_prefix} Successfully mapped {len(sorted_period_reports)} {report_period_type} reports into List[EarningsPeriodData].")
    return sorted_period_reports


def map_yfinance_info_to_overview(
    info_dict: Optional[Dict[str, Any]],
    request_id: str,
    symbol_override: Optional[str] = None
) -> Optional[CompanyOverview]:
    """
    Maps the yfinance Ticker.info dictionary to the CompanyOverview Pydantic model.

    Args:
        info_dict: The dictionary from yfinance Ticker.info.
        request_id: A request identifier for logging.
        symbol_override: Optional symbol if context provides a more reliable one.

    Returns:
        A CompanyOverview Pydantic model instance if successful, otherwise None.
    """
    func_name = "map_yfinance_info_to_overview"
    
    if not info_dict or not isinstance(info_dict, dict):
        logger.info(f"[{request_id}][{func_name}] Input info_dict is None or not a dict. Cannot map.")
        return None

    symbol_from_info = str(info_dict.get("symbol", "UNKNOWN_SYMBOL")).upper()
    effective_symbol = (symbol_override.upper() if symbol_override else symbol_from_info)
    log_prefix = f"[{request_id}][{effective_symbol}][{func_name}]"

    logger.debug(f"{log_prefix} Starting mapping of yfinance info_dict. Available keys (sample): {list(info_dict.keys())[:10]}...")

    # Helper to parse timestamp to YYYY-MM-DD string for specific fields
    def parse_ts_to_date_str(ts_val: Any, field_name: str, context_prefix: str) -> Optional[str]:
        if ts_val is None: return None
        iso_str = parse_timestamp_to_iso_utc(ts_val, context=f"{context_prefix}:{field_name}")
        return iso_str.split("T")[0] if iso_str else None

    try:
        address_parts = [
            _clean_value(info_dict.get("address1")),
            _clean_value(info_dict.get("address2")),
            _clean_value(info_dict.get("city")),
            _clean_value(info_dict.get("state")),
            _clean_value(info_dict.get("zip")),
            _clean_value(info_dict.get("country"))
        ]
        full_address = ", ".join(filter(None, address_parts)) or None

        # Prioritize 'longName' if available and not empty, else 'shortName'
        company_name = _clean_value(info_dict.get("longName"))
        if not company_name:
            company_name = _clean_value(info_dict.get("shortName"))

        overview_data_dict = {
            "symbol": effective_symbol,
            "asset_type": _clean_value(info_dict.get("quoteType")),
            "name": company_name,
            "description": _clean_value(info_dict.get("longBusinessSummary")),
            "exchange": _clean_value(info_dict.get("exchange")),
            "currency": _clean_value(info_dict.get("currency")),
            "country": _clean_value(info_dict.get("country")),
            "sector": _clean_value(info_dict.get("sector")),
            "industry": _clean_value(info_dict.get("industry")),
            "address": full_address,
            "website": normalize_url(info_dict.get("website")),
            "fiscal_year_end": parse_ts_to_date_str(info_dict.get("lastFiscalYearEnd"), "lastFiscalYearEnd", log_prefix),
            "latest_quarter": parse_ts_to_date_str(info_dict.get("mostRecentQuarter"), "mostRecentQuarter", log_prefix),
            "market_cap": parse_optional_int(info_dict.get("marketCap"), context=f"{log_prefix}:marketCap"),
            "ebitda": parse_optional_int(info_dict.get("ebitda"), context=f"{log_prefix}:ebitda"),
            "trailing_pe": parse_optional_float(info_dict.get("trailingPE"), context=f"{log_prefix}:trailingPE"),
            "forward_pe": parse_optional_float(info_dict.get("forwardPE"), context=f"{log_prefix}:forwardPE"),
            "peg_ratio": parse_optional_float(info_dict.get("pegRatio"), context=f"{log_prefix}:pegRatio"),
            "book_value": parse_optional_float(info_dict.get("bookValue"), context=f"{log_prefix}:bookValue"),
            "dividend_per_share": parse_optional_float(info_dict.get("dividendRate", info_dict.get("trailingAnnualDividendRate")), context=f"{log_prefix}:dividendPerShare"),
            "dividend_yield": parse_optional_float(info_dict.get("dividendYield", info_dict.get("trailingAnnualDividendYield")), context=f"{log_prefix}:dividendYield"),
            "eps": parse_optional_float(info_dict.get("trailingEps", info_dict.get("forwardEps")), context=f"{log_prefix}:eps"), # Prefer trailing, fallback to forward
            "revenue_per_share_ttm": parse_optional_float(info_dict.get("revenuePerShare"), context=f"{log_prefix}:revenuePerShareTTM"),
            "profit_margin": parse_optional_float(info_dict.get("profitMargins"), context=f"{log_prefix}:profitMargin"),
            "operating_margin_ttm": parse_optional_float(info_dict.get("operatingMargins"), context=f"{log_prefix}:operatingMarginTTM"),
            "return_on_assets_ttm": parse_optional_float(info_dict.get("returnOnAssets"), context=f"{log_prefix}:returnOnAssetsTTM"),
            "return_on_equity_ttm": parse_optional_float(info_dict.get("returnOnEquity"), context=f"{log_prefix}:returnOnEquityTTM"),
            "revenue_ttm": parse_optional_int(info_dict.get("totalRevenue"), context=f"{log_prefix}:revenueTTM"),
            "gross_profit_ttm": parse_optional_int(info_dict.get("grossProfits"), context=f"{log_prefix}:grossProfitTTM"),
            "diluted_eps_ttm": parse_optional_float(info_dict.get("trailingEps"), context=f"{log_prefix}:dilutedEpsTTM"), # yfinance often uses 'trailingEps' for this
            "quarterly_earnings_growth_yoy": parse_optional_float(info_dict.get("earningsQuarterlyGrowth"), context=f"{log_prefix}:quarterlyEarningsGrowthYOY"),
            "quarterly_revenue_growth_yoy": parse_optional_float(info_dict.get("revenueGrowth", info_dict.get("revenueQuarterlyGrowth")), context=f"{log_prefix}:quarterlyRevenueGrowthYOY"),
            "analyst_target_price": parse_optional_float(info_dict.get("targetMeanPrice", info_dict.get("targetMedianPrice")), context=f"{log_prefix}:analystTargetPrice"),
            "price_to_sales_ratio_ttm": parse_optional_float(info_dict.get("priceToSalesTrailing12Months"), context=f"{log_prefix}:priceToSalesRatioTTM"),
            "price_to_book_ratio": parse_optional_float(info_dict.get("priceToBook"), context=f"{log_prefix}:priceToBookRatio"),
            "ev_to_revenue": parse_optional_float(info_dict.get("enterpriseToRevenue"), context=f"{log_prefix}:evToRevenue"),
            "ev_to_ebitda": parse_optional_float(info_dict.get("enterpriseToEbitda"), context=f"{log_prefix}:evToEbitda"),
            "beta": parse_optional_float(info_dict.get("beta"), context=f"{log_prefix}:beta"),
            "fifty_two_week_high": parse_optional_float(info_dict.get("fiftyTwoWeekHigh"), context=f"{log_prefix}:52wHigh"),
            "fifty_two_week_low": parse_optional_float(info_dict.get("fiftyTwoWeekLow"), context=f"{log_prefix}:52wLow"),
            "fifty_day_average": parse_optional_float(info_dict.get("fiftyDayAverage"), context=f"{log_prefix}:50dAvg"),
            "two_hundred_day_average": parse_optional_float(info_dict.get("twoHundredDayAverage"), context=f"{log_prefix}:200dAvg"),
            "shares_outstanding": parse_optional_int(info_dict.get("sharesOutstanding"), context=f"{log_prefix}:sharesOutstanding"),
            "shares_float": parse_optional_int(info_dict.get("floatShares"), context=f"{log_prefix}:sharesFloat"),
            "shares_short": parse_optional_int(info_dict.get("sharesShort"), context=f"{log_prefix}:sharesShort"),
            "shares_short_prior_month": parse_optional_int(info_dict.get("sharesShortPriorMonth"), context=f"{log_prefix}:sharesShortPriorMonth"),
            "short_ratio": parse_optional_float(info_dict.get("shortRatio"), context=f"{log_prefix}:shortRatio"),
            "short_percent_outstanding": parse_optional_float(info_dict.get("sharesPercentSharesOut"), context=f"{log_prefix}:shortPercentOutstanding"),
            "short_percent_float": parse_optional_float(info_dict.get("shortPercentOfFloat"), context=f"{log_prefix}:shortPercentFloat"),
            "dividend_date": parse_ts_to_date_str(info_dict.get("dividendDate"), "dividendDate", log_prefix),
            "ex_dividend_date": parse_ts_to_date_str(info_dict.get("exDividendDate"), "exDividendDate", log_prefix),
            "last_split_factor": _clean_value(info_dict.get("lastSplitFactor")),
            "last_split_date": parse_ts_to_date_str(info_dict.get("lastSplitDate"), "lastSplitDate", log_prefix),
        }
        
        company_overview = CompanyOverview(**overview_data_dict)
        logger.info(f"{log_prefix} Successfully mapped yfinance info_dict to CompanyOverview model.")
        return company_overview

    except ValidationError as e_overview:
        errors_summary = "; ".join([f"'{'.'.join(map(str, err['loc']))}': {err['msg']}" for err in e_overview.errors()])
        logger.error(f"{log_prefix} Pydantic validation FAILED for CompanyOverview. Errors: {errors_summary}. Attempted data fields: {list(overview_data_dict.keys())}")
        return None
    except Exception as e_map:
        logger.error(f"{log_prefix} Unexpected critical error mapping info_dict: {e_map}", exc_info=True)
        return None


def map_financial_dataframes_to_financials_model(
    financial_dfs: Dict[str, Optional[pd.DataFrame]],
    request_id: str,
    currency: Optional[str],
    symbol: Optional[str] = "N/A_SYMBOL"
) -> Optional[FinancialsData]:
    """
    Maps latest data from yfinance financial statement DataFrames to FinancialsData.
    Extracts data from the most recent column of annual and quarterly statements.

    Args:
        financial_dfs: Dict of DFs, e.g., {"income_annual": df_ia, "balance_annual": df_ba, ...}.
        request_id: Logger request identifier.
        currency: Currency code for financial figures.
        symbol: Stock symbol for logging context.

    Returns:
        A FinancialsData Pydantic model instance or None.
    """
    func_name = "map_financial_dataframes_to_financials_model"
    log_prefix = f"[{request_id}][{symbol}][{func_name}]"

    if not financial_dfs or not isinstance(financial_dfs, dict):
        logger.info(f"{log_prefix} Input 'financial_dfs' is None, empty, or not a dictionary. Aborting.")
        return None

    # --- Helper to extract latest financial values from a single DataFrame ---
    def get_latest_financial_values(df: Optional[pd.DataFrame], df_name: str, df_type_log: str) -> Dict[str, Any]:
        default_latest_values = {
            "revenue": None, "net_income": None, "assets": None, 
            "liabilities": None, "report_date": None
        }
        if df is None or not isinstance(df, pd.DataFrame) or df.empty:
            logger.debug(f"{log_prefix} DataFrame '{df_name}' ({df_type_log}) is missing or empty. Values will be None.")
            return default_latest_values

        latest_values = default_latest_values.copy()
        try:
            if df.columns.empty:
                logger.warning(f"{log_prefix} DataFrame '{df_name}' ({df_type_log}) has no columns. Cannot extract data.")
                return latest_values

            latest_col_header = df.columns[0] # yfinance usually has most recent data first
            logger.debug(f"{log_prefix} Using latest column '{str(latest_col_header)[:30]}' from '{df_name}' for {df_type_log} data.")

            report_date_val: Optional[date] = None
            if isinstance(latest_col_header, (datetime, pd.Timestamp)):
                report_date_val = latest_col_header.date()
            elif isinstance(latest_col_header, str):
                try: report_date_val = pd.to_datetime(latest_col_header, errors='raise').date()
                except ValueError: logger.warning(f"{log_prefix} Could not parse date from {df_type_log} column header '{str(latest_col_header)[:30]}' in '{df_name}'.")
            
            if report_date_val:
                latest_values["report_date"] = report_date_val.strftime('%Y-%m-%d')
                logger.debug(f"{log_prefix} Determined {df_type_log} report date for '{df_name}' as: {latest_values['report_date']}")

            # Extract relevant metrics if they exist in this DataFrame type
            if "income" in df_name.lower(): # Income statement metrics
                revenue_row = next((k for k in _YFINANCE_REVENUE_KEYS if k in df.index), None)
                net_income_row = next((k for k in _YFINANCE_NET_INCOME_KEYS if k in df.index), None)
                if revenue_row: latest_values["revenue"] = parse_optional_int(safe_get(df, revenue_row, latest_col_header), context=f"{log_prefix}:{df_type_log}_revenue({df_name})")
                if net_income_row: latest_values["net_income"] = parse_optional_int(safe_get(df, net_income_row, latest_col_header), context=f"{log_prefix}:{df_type_log}_net_income({df_name})")
            
            if "balance" in df_name.lower(): # Balance sheet metrics
                assets_row = next((k for k in _YFINANCE_ASSETS_KEYS if k in df.index), None)
                liabilities_row = next((k for k in _YFINANCE_LIABILITIES_KEYS if k in df.index), None)
                if assets_row: latest_values["assets"] = parse_optional_int(safe_get(df, assets_row, latest_col_header), context=f"{log_prefix}:{df_type_log}_assets({df_name})")
                if liabilities_row: latest_values["liabilities"] = parse_optional_int(safe_get(df, liabilities_row, latest_col_header), context=f"{log_prefix}:{df_type_log}_liabilities({df_name})")
            
            logger.debug(f"{log_prefix} Extracted {df_type_log} values from '{df_name}': Rev={latest_values['revenue']}, NI={latest_values['net_income']}, Assets={latest_values['assets']}, Liab={latest_values['liabilities']}")

        except IndexError:
            logger.error(f"{log_prefix} DataFrame '{df_name}' ({df_type_log}) column access error (IndexError). Malformed or empty columns? Values will be None.")
        except Exception as e_extract:
            logger.error(f"{log_prefix} Error extracting latest {df_type_log} values from '{df_name}': {e_extract}", exc_info=True)
        
        return latest_values

    # --- Process Annual Data ---
    income_annual_df = financial_dfs.get("income_annual")
    balance_annual_df = financial_dfs.get("balance_annual")
    
    annual_income_data = get_latest_financial_values(income_annual_df, "income_annual", "annual")
    annual_balance_data = get_latest_financial_values(balance_annual_df, "balance_annual", "annual")
    
    # --- Process Quarterly Data ---
    income_quarterly_df = financial_dfs.get("income_quarterly")
    balance_quarterly_df = financial_dfs.get("balance_quarterly") # Less common to use quarterly balance for "total_assets/liabilities" in summary models

    quarterly_income_data = get_latest_financial_values(income_quarterly_df, "income_quarterly", "quarterly")
    # Quarterly balance data could be extracted if needed, e.g., if latest assets/liabilities should come from latest available balance sheet.
    # quarterly_balance_data = get_latest_financial_values(balance_quarterly_df, "balance_quarterly", "quarterly")

    # Determine the primary report date. Prioritize annual income, then annual balance, then quarterly income.
    final_report_date = annual_income_data["report_date"] or \
                        annual_balance_data["report_date"] or \
                        quarterly_income_data["report_date"]
    
    # Consolidate assets and liabilities: Typically, latest annual balance sheet figures are used.
    # If a more complex logic is needed (e.g., latest from *any* balance sheet), it can be added here.
    total_assets_final = annual_balance_data["assets"]
    total_liabilities_final = annual_balance_data["liabilities"]

    if total_assets_final is None and balance_quarterly_df is not None and not balance_quarterly_df.empty:
        logger.debug(f"{log_prefix} Annual assets are None, checking latest quarterly balance sheet for assets.")
        q_balance_data = get_latest_financial_values(balance_quarterly_df, "balance_quarterly", "quarterly_fallback_assets")
        if q_balance_data["assets"] is not None:
            total_assets_final = q_balance_data["assets"]
            logger.info(f"{log_prefix} Using assets from latest quarterly balance sheet as annual was unavailable: {total_assets_final}")


    if total_liabilities_final is None and balance_quarterly_df is not None and not balance_quarterly_df.empty:
        logger.debug(f"{log_prefix} Annual liabilities are None, checking latest quarterly balance sheet for liabilities.")
        q_balance_data = get_latest_financial_values(balance_quarterly_df, "balance_quarterly", "quarterly_fallback_liabilities") # Can re-use previous call if stored
        if q_balance_data["liabilities"] is not None:
            total_liabilities_final = q_balance_data["liabilities"]
            logger.info(f"{log_prefix} Using liabilities from latest quarterly balance sheet as annual was unavailable: {total_liabilities_final}")


    try:
        financials_payload = {
            "latest_annual_revenue": annual_income_data["revenue"],
            "latest_annual_net_income": annual_income_data["net_income"],
            "latest_quarterly_revenue": quarterly_income_data["revenue"],
            "latest_quarterly_net_income": quarterly_income_data["net_income"],
            "total_assets": total_assets_final,
            "total_liabilities": total_liabilities_final,
            "report_date": final_report_date,
            "currency": currency
        }

        financials_data = FinancialsData(**financials_payload)
        logger.info(f"{log_prefix} Successfully mapped financial DataFrames to FinancialsData model. Report Date: {final_report_date}, Currency: {currency}")
        return financials_data

    except ValidationError as e_financials:
        errors_summary = "; ".join([f"'{'.'.join(map(str, err['loc']))}': {err['msg']}" for err in e_financials.errors()])
        logger.error(f"{log_prefix} Pydantic validation FAILED for FinancialsData. Errors: {errors_summary}. Payload data: {financials_payload}")
        return None
    except Exception as e_map:
        logger.error(f"{log_prefix} Unexpected critical error mapping financial DataFrames to FinancialsData: {e_map}", exc_info=True)
        return None


def map_yfinance_ohlcv_df_to_chart_list(
    ohlcv_df: Optional[pd.DataFrame],
    request_id: str,
    symbol: Optional[str] = "N/A_SYMBOL"
) -> Optional[List[Dict[str, Any]]]:
    """
    Maps a yfinance OHLCV DataFrame to a list of dictionaries for charting.
    Ensures DateTimeIndex is UTC and converts timestamps to milliseconds.

    Args:
        ohlcv_df: DataFrame with OHLCV data. Index should be DatetimeIndex.
        request_id: Logger request identifier.
        symbol: Stock symbol for logging context.

    Returns:
        List of {'t': ms_timestamp, 'o': open, ...}, or None on failure.
    """
    func_name = "map_yfinance_ohlcv_df_to_chart_list"
    log_prefix = f"[{request_id}][{symbol}][{func_name}]"

    if ohlcv_df is None:
        logger.info(f"{log_prefix} Input ohlcv_df is None. Cannot map.")
        return None
    if not isinstance(ohlcv_df, pd.DataFrame):
        logger.warning(f"{log_prefix} Input ohlcv_df is not a DataFrame (Type: {type(ohlcv_df)}). Cannot map.")
        return None
    if ohlcv_df.empty:
        logger.info(f"{log_prefix} Input ohlcv_df is empty. Cannot map.")
        return [] # Return empty list for empty input, consistent with no data

    logger.debug(f"{log_prefix} Starting mapping of yfinance OHLCV DataFrame. Shape: {ohlcv_df.shape}, Columns: {list(ohlcv_df.columns)}")

    df = ohlcv_df.copy()

    if not isinstance(df.index, pd.DatetimeIndex):
        logger.error(f"{log_prefix} DataFrame index is not a DatetimeIndex (Type: {type(df.index)}). Aborting mapping.")
        return None

    # Normalize column names (lowercase, no spaces, handle potential multi-index if any)
    if isinstance(df.columns, pd.MultiIndex):
        logger.warning(f"{log_prefix} DataFrame has a MultiIndex for columns. Flattening to level 0.")
        df.columns = df.columns.get_level_values(0) # Take the first level
    df.columns = [str(col).lower().replace(' ', '_') for col in df.columns]
    
    # Verify required columns after normalization using _OHLCV_COLUMN_MAP keys
    # These keys are already the normalized yfinance column names (e.g., 'open')
    missing_core_cols = [yf_col for yf_col in ['open', 'high', 'low', 'close'] if yf_col not in df.columns]
    if missing_core_cols:
        logger.error(f"{log_prefix} DataFrame is missing one or more core OHLC columns {missing_core_cols} after normalization. "
                     f"Available columns: {list(df.columns)}. Aborting.")
        return None
    if 'volume' not in df.columns:
        logger.info(f"{log_prefix} 'volume' column is missing. Volume data will be None or 0 in chart output.")
        df['volume'] = 0 # Add a dummy volume column with 0s if missing, so row processing doesn't fail

    # Ensure index is UTC
    try:
        if df.index.tz is None:
            logger.debug(f"{log_prefix} DataFrame index is timezone-naive. Attempting to localize to UTC.")
            df.index = df.index.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
        elif str(df.index.tz).upper() != 'UTC':
            logger.debug(f"{log_prefix} DataFrame index is localized to {df.index.tz}. Converting to UTC.")
            df.index = df.index.tz_convert('UTC')
    except Exception as e_tz: # Catches both tz_localize and tz_convert errors
        logger.error(f"{log_prefix} Failed to set DataFrame index to UTC: {e_tz}. Aborting.", exc_info=True)
        return None

    chart_data_list: List[Dict[str, Any]] = []
    processed_rows = 0
    skipped_rows = 0

    for timestamp, row_data in df.iterrows():
        # timestamp is pd.Timestamp (UTC), row_data is pd.Series
        ts_log_str = timestamp.isoformat() # For logging context

        try:
            ts_ms = int(timestamp.timestamp() * 1000)
            chart_item: Dict[str, Any] = {"t": ts_ms}
            valid_row = True

            for yf_col_lower, target_key in _OHLCV_COLUMN_MAP.items():
                raw_value = row_data.get(yf_col_lower) # Use .get() for safety, esp. for 'volume' if added manually
                
                if target_key == 'v': # Volume
                    # parse_optional_int will handle None if .get returned None
                    parsed_value = parse_optional_int(raw_value, context=f"{log_prefix}:Vol_T={ts_log_str}")
                    # Volume can be None (or 0 if we defaulted it), that's acceptable.
                    chart_item[target_key] = parsed_value if parsed_value is not None else 0 # Default to 0 if None
                else: # o, h, l, c are floats
                    parsed_value = parse_optional_float(raw_value, context=f"{log_prefix}:{target_key.upper()}_T={ts_log_str}")
                    if parsed_value is None: # Core OHLC values are mandatory
                        logger.warning(f"{log_prefix} Skipping row for T={ts_log_str}: Mandatory value '{target_key}' is None after parsing (Raw: '{raw_value}').")
                        valid_row = False
                        break
                    chart_item[target_key] = parsed_value
            
            if valid_row:
                chart_data_list.append(chart_item)
                processed_rows += 1
            else:
                skipped_rows += 1

        except Exception as e_row:
            logger.error(f"{log_prefix} Error processing OHLCV row for timestamp '{ts_log_str}': {e_row}. Skipping row.", exc_info=False) # exc_info=False to reduce log spam for many bad rows
            skipped_rows += 1
            continue

    if skipped_rows > 0:
        logger.warning(f"{log_prefix} Skipped {skipped_rows} of {len(df)} rows due to parsing errors or missing mandatory OHLC values.")
    
    if not chart_data_list and len(df) > 0 : # Input had data, but nothing was mapped
        logger.warning(f"{log_prefix} No valid chart data points could be generated from the OHLCV DataFrame, though input was not empty ({len(df)} rows).")
        return None # Or return [] depending on desired behavior for "all rows failed"
    
    if not chart_data_list and len(df) == 0: # Already handled: input was empty, returns []
        pass


    logger.info(f"{log_prefix} Successfully mapped {processed_rows} OHLCV data points. {skipped_rows} rows skipped.")
    return chart_data_list


# --- Log that yfinance mappers are loaded ---
logger.info("Yfinance specific mappers (mappers/yfinance.py) loaded and initialized with enhanced features.")