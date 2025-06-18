# ==============================================================================
# backend/core/ai/prompt_generators.py
# Aevorex FinBot Prompt Generation Service (v1.2.3 - Config Import Fixed)
# ==============================================================================

import json
import logging
import pandas as pd
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union, Tuple, Final, Set
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Core imports with settings
from modules.financehub.backend.config import settings

# Imports with proper error handling
try:
    from modules.financehub.backend.utils.logger_config import get_logger
    from modules.financehub.backend.models.stock import (
        NewsItem, 
        CompanyOverview, 
        FinancialsData, 
        EarningsData,   
        TickerSentiment
    )
    from modules.financehub.backend.core.ai.helpers import safe_format_value, DEFAULT_NA
    logger = get_logger(__name__)
except ImportError as e:
    logging.basicConfig(level=logging.ERROR)
    logging.error(f"FATAL ERROR: Could not import dependencies in prompt_generators.py: {e}. Check structure.", exc_info=True)
    raise RuntimeError(f"Prompt Generators failed to initialize due to missing core dependencies: {e}") from e

# --- Modul Szintű Konstansok ---
PROMPT_TEMPLATE_DIR = Path(__file__).parent / "prompt_templates"
DEFAULT_PREMIUM_ANALYSIS_TEMPLATE_FILE = "premium_analysis_v1.txt" 
# Fallback üzenetek a formázókhoz
FALLBACK_PRICE_DATA: Final[str] = "{ Hiba az árfolyamadatok formázása közben }"
FALLBACK_INDICATOR_DATA: Final[str] = "Hiba a technikai indikátorok feldolgozása közben."
FALLBACK_NEWS_DATA: Final[str] = "Hiba a hírek feldolgozása közben."
FALLBACK_FUNDAMENTAL_DATA: Final[str] = "Hiba a vállalati alapadatok feldolgozása közben."
FALLBACK_FINANCIALS_DATA: Final[str] = "Hiba a pénzügyi kimutatások adatainak feldolgozása közben."
FALLBACK_EARNINGS_DATA: Final[str] = "Hiba a vállalati eredményjelentések adatainak feldolgozása közben."
UNEXPECTED_HELPER_ERROR: Final[str] = "HIBA: Adatformázó segédfüggvény nem futott le, vagy váratlan hibát adott."
DEFAULT_NA_VALUE: Final[str] = "N/A"
DEFAULT_PROMPT_NA_TEXT: Final[str] = "N/A"

# --- Konfigurálható Értékek ---
DEFAULT_RELEVANCE_THRESHOLD: Final[float] = 0.8
DEFAULT_TARGET_NEWS_COUNT: Final[int] = 5
AI_PRICE_DAYS_FOR_PROMPT_DEFAULT: Final[int] = 60

# --- Formatting Helper Functions ---

async def _format_price_data_for_prompt(symbol: str, df_recent: Optional[pd.DataFrame]) -> str:
    """
    Formats recent price data into a structured JSON string for the AI prompt.
    Handles potential errors gracefully and ALWAYS returns a string.
    Uses settings.AI.AI_PRICE_DAYS_FOR_PROMPT.
    """
    func_name = "_format_price_data_for_prompt"
    logger.debug(f"[{symbol}] Running {func_name}...")
    if df_recent is None or df_recent.empty or 'close' not in df_recent.columns:
        msg = f"[{symbol}] {func_name}: Skipping, DataFrame is None, empty, or 'close' column missing."
        logger.warning(msg)
        return "{ Nincs elérhető friss árfolyamadat }"

    try:
        # Get configuration, fallback to default if not available
        ai_settings = getattr(settings, 'AI', None)
        price_days_to_show = getattr(ai_settings, 'AI_PRICE_DAYS_FOR_PROMPT', AI_PRICE_DAYS_FOR_PROMPT_DEFAULT) if ai_settings else AI_PRICE_DAYS_FOR_PROMPT_DEFAULT
        price_days_to_show = max(min(price_days_to_show, 250), 10)  # Clamp between 10-250 days
        
        logger.debug(f"[{symbol}] {func_name}: Price days to show (from config): {price_days_to_show}")
        
        # Work on a copy to avoid modifying the original
        df_recent_copy = df_recent.copy()
        
        if 'date' in df_recent_copy.columns:
            df_recent_copy.set_index('date', inplace=True)
        elif not isinstance(df_recent_copy.index, pd.DatetimeIndex):
            logger.warning(f"[{symbol}] {func_name}: DataFrame index is not DatetimeIndex and no 'date' column found.")
            return f"{{ Hibás idősor formátum az árfolyamadatokhoz }}"

        logger.debug(f"[{symbol}] {func_name}: Extracting tail({price_days_to_show}) closing prices...")
        closing_prices_series = df_recent_copy['close'].tail(price_days_to_show)

        if closing_prices_series.empty:
             logger.warning(f"[{symbol}] {func_name}: Tail({price_days_to_show}) closing prices series is empty.")
             return f"{{ Nincs árfolyamadat az utolsó {price_days_to_show} napból }}"

        closing_prices_dict = closing_prices_series.round(2).to_dict()
        closing_prices_str_dict = {}
        processed_count = 0
        skipped_nan = 0
        skipped_invalid_date_type = 0
        skipped_date_format_error = 0

        logger.debug(f"[{symbol}] {func_name}: Iterating through {len(closing_prices_dict)} price points...")
        for dt, price in closing_prices_dict.items():
            processed_count += 1
            if pd.isna(price):
                skipped_nan += 1
                continue
            if not isinstance(dt, pd.Timestamp):
                logger.warning(f"[{symbol}] {func_name}: Skipping non-timestamp index '{dt}' (type: {type(dt)}).")
                skipped_invalid_date_type += 1
                continue
            try:
                closing_prices_str_dict[dt.strftime('%Y-%m-%d')] = price
            except ValueError as e:
                logger.warning(f"[{symbol}] {func_name}: Skipping invalid date format for timestamp '{dt}': {e}")
                skipped_date_format_error += 1

        logger.debug(f"[{symbol}] {func_name}: Iteration summary - Processed: {processed_count}, Added: {len(closing_prices_str_dict)}, Skipped NaN: {skipped_nan}, Skipped Invalid Date Type: {skipped_invalid_date_type}, Skipped Date Format Error: {skipped_date_format_error}")

        if not closing_prices_str_dict:
            logger.warning(f"[{symbol}] {func_name}: No valid price data points found after processing.")
            return "{ Nincs érvényes árfolyamadat a megadott időszakból }"

        price_data_json = json.dumps(closing_prices_str_dict, ensure_ascii=False, indent=2)
        logger.debug(f"[{symbol}] {func_name}: Successfully formatted {len(closing_prices_str_dict)} price points into JSON.")
        return price_data_json

    except Exception as e:
        logger.error(f"[{symbol}] {func_name}: CRITICAL - Unexpected error: {e}", exc_info=True)
        return FALLBACK_PRICE_DATA


def _safe_get_int_param(params_dict: Dict[str, Any], key: str, default_value: int, symbol_for_log: str, func_name_for_log: str) -> int:
    """Safely gets and converts an integer parameter from a dictionary."""
    raw_val = params_dict.get(key, default_value)
    try:
        val_int = int(raw_val)
        if val_int <= 0: # Periods should usually be positive
            logger.warning(f"[{symbol_for_log}] {func_name_for_log}: Non-positive value '{raw_val}' for '{key}' in indicator_params. Using default: {default_value}.")
            return default_value
        return val_int
    except (ValueError, TypeError):
        logger.warning(f"[{symbol_for_log}] {func_name_for_log}: Invalid value '{raw_val}' for '{key}' in indicator_params (expected int). Using default: {default_value}.")
        return default_value

async def _format_indicator_data_for_prompt(
    symbol: str,
    latest_indicators: Optional[Dict[str, Any]],
    df_recent: Optional[pd.DataFrame]
) -> Tuple[str, bool]:
    """
    Formats latest technical indicators into a structured, interpreted string for the AI prompt.
    Uses INDICATOR_PARAMS from settings.DATA_PROCESSING.
    Handles potential errors gracefully and ALWAYS returns a (string, bool) tuple.
    """
    func_name = "_format_indicator_data_for_prompt"
    logger.debug(f"[{symbol}] Running {func_name}...")
    if not latest_indicators:
        logger.warning(f"[{symbol}] {func_name}: Skipping, no technical indicators dictionary provided.")
        return "Technikai indikátor adatok nem állnak rendelkezésre.", False

    summary_points = []
    indicator_data_found = False
    indicator_params: Dict[str, Any] = {}

    try:
        try:
            indicator_params_setting = settings.DATA_PROCESSING.INDICATOR_PARAMS
            if not isinstance(indicator_params_setting, dict):
                 raise TypeError(f"INDICATOR_PARAMS is not a dict (type: {type(indicator_params_setting).__name__})")
            indicator_params = indicator_params_setting
            logger.debug(f"[{symbol}] {func_name}: Using indicator parameters from settings.DATA_PROCESSING.INDICATOR_PARAMS: {indicator_params}")
        except AttributeError as e:
            logger.error(f"[{symbol}] {func_name}: CONFIG ERROR - Could not access 'settings.DATA_PROCESSING.INDICATOR_PARAMS'. Details: {e}", exc_info=True)
            return "Hiba az indikátor beállítások betöltésekor (elérési út).", False
        except TypeError as e:
             logger.error(f"[{symbol}] {func_name}: CONFIG ERROR - {e}. Using empty params, which will lead to defaults for periods.")
             indicator_params = {} # Ensures it's a dict for _safe_get_int_param

        rsi_period = _safe_get_int_param(indicator_params, 'RSI_PERIOD', 14, symbol, func_name)
        sma_short_period = _safe_get_int_param(indicator_params, 'SMA_SHORT_PERIOD', 9, symbol, func_name)
        sma_long_period = _safe_get_int_param(indicator_params, 'SMA_LONG_PERIOD', 20, symbol, func_name)
        bb_period = _safe_get_int_param(indicator_params, 'BBANDS_PERIOD', 20, symbol, func_name)
        logger.debug(f"[{symbol}] {func_name}: Effective indicator periods - RSI({rsi_period}), SMA({sma_short_period}/{sma_long_period}), BB({bb_period})")

        last_close: Optional[float] = None
        if df_recent is not None and not df_recent.empty and 'close' in df_recent.columns:
            try:
                last_close_val = df_recent['close'].iloc[-1]
                if pd.notna(last_close_val):
                    last_close = float(last_close_val)
                    logger.debug(f"[{symbol}] {func_name}: Last close price: {last_close:.2f}")
                else:
                    logger.warning(f"[{symbol}] {func_name}: Last close price is NaN.")
            except (IndexError, ValueError, TypeError) as e:
                logger.warning(f"[{symbol}] {func_name}: Could not retrieve/convert last close price: {e}")
        else:
             logger.warning(f"[{symbol}] {func_name}: Cannot get last close price (df_recent missing, empty, or no 'close' column).")

        indicators_to_process = ["rsi", "macd_hist", "sma", "bb_middle", "bb_bands"]
        for indicator_key_base in indicators_to_process: # Renamed to avoid conflict with dict keys
            logger.debug(f"[{symbol}] {func_name}: Processing indicator group '{indicator_key_base}'...")
            try:
                if indicator_key_base == "rsi":
                    rsi_value = latest_indicators.get("rsi")
                    if rsi_value is not None:
                        rsi_f = float(rsi_value)
                        rsi_desc = f"RSI({rsi_period}): {rsi_f:.1f}"
                        if rsi_f > 70: rsi_desc += " (Túlvett >70)"
                        elif rsi_f < 30: rsi_desc += " (Túladott <30)"
                        else: rsi_desc += " (Semleges)"
                        summary_points.append(rsi_desc)
                        indicator_data_found = True
                    else: logger.debug(f"[{symbol}] {func_name}: RSI value is None.")

                elif indicator_key_base == "macd_hist":
                    macd_hist = latest_indicators.get("macd_hist")
                    if macd_hist is not None:
                        macd_hist_f = float(macd_hist)
                        macd_desc = f"MACD Hisztogram: {macd_hist_f:.3f}"
                        if macd_hist_f > 0.001: macd_desc += " (Pozitív/Növekvő momentum)"
                        elif macd_hist_f < -0.001: macd_desc += " (Negatív/Csökkenő momentum)"
                        else: macd_desc += " (Semleges/Változás közel nulla)"
                        summary_points.append(macd_desc)
                        indicator_data_found = True
                    else: logger.debug(f"[{symbol}] {func_name}: MACD Hist value is None.")

                elif indicator_key_base == "sma":
                    sma_short = latest_indicators.get("sma_short")
                    sma_long = latest_indicators.get("sma_long")
                    if sma_short is not None and sma_long is not None:
                        sma_short_f = float(sma_short)
                        sma_long_f = float(sma_long)
                        trend_desc = f"Trend (SMA {sma_short_period} / SMA {sma_long_period}): "
                        if sma_short_f > sma_long_f * 1.002: trend_desc += f"Emelkedő ({sma_short_f:.2f} > {sma_long_f:.2f})"
                        elif sma_short_f < sma_long_f * 0.998: trend_desc += f"Csökkenő ({sma_short_f:.2f} < {sma_long_f:.2f})"
                        else: trend_desc += f"Oldalazó/Bizonytalan ({sma_short_f:.2f} ≈ {sma_long_f:.2f})"
                        summary_points.append(trend_desc)
                        indicator_data_found = True
                    else: logger.debug(f"[{symbol}] {func_name}: SMA short ({sma_short}) or long ({sma_long}) value is None.")

                elif indicator_key_base == "bb_middle":
                    bb_mid = latest_indicators.get("bb_middle")
                    if last_close is not None and bb_mid is not None:
                        bb_mid_f = float(bb_mid)
                        summary_points.append(f"Ár ({last_close:.2f}) vs BB Közép ({bb_period}, {bb_mid_f:.2f}): {'Fölötte' if last_close > bb_mid_f else ('Alatta' if last_close < bb_mid_f else 'Rajta')}")
                        indicator_data_found = True
                    elif last_close is None: logger.debug(f"[{symbol}] {func_name}: Cannot compare price vs BB Middle (last_close is None).")
                    else: logger.debug(f"[{symbol}] {func_name}: BB Middle value ({bb_mid}) is None.")

                elif indicator_key_base == "bb_bands":
                    bb_upper = latest_indicators.get("bb_upper")
                    bb_lower = latest_indicators.get("bb_lower")
                    if last_close is not None and bb_upper is not None and bb_lower is not None:
                        bb_upper_f = float(bb_upper)
                        bb_lower_f = float(bb_lower)
                        pos_vs_bands = f"Között ({bb_lower_f:.2f} - {bb_upper_f:.2f})"
                        if last_close > bb_upper_f * 1.001: pos_vs_bands = f"Szalag FÖLÖTT ({bb_upper_f:.2f})"
                        elif last_close < bb_lower_f * 0.999: pos_vs_bands = f"Szalag ALATT ({bb_lower_f:.2f})"
                        summary_points.append(f"Ár ({last_close:.2f}) vs BB Szalagok ({bb_period}): {pos_vs_bands}")
                        indicator_data_found = True
                    elif last_close is None: logger.debug(f"[{symbol}] {func_name}: Cannot compare price vs BB Bands (last_close is None).")
                    else: logger.debug(f"[{symbol}] {func_name}: BB Upper ({bb_upper}) or Lower ({bb_lower}) value is None.")

            except (ValueError, TypeError) as e:
                # Log which specific indicator value caused the error.
                faulty_value = "N/A"
                if indicator_key_base == "rsi": faulty_value = str(latest_indicators.get("rsi"))
                elif indicator_key_base == "macd_hist": faulty_value = str(latest_indicators.get("macd_hist"))
                # ... and so on for other keys if needed.
                logger.warning(f"[{symbol}] {func_name}: Error processing sub-indicator group '{indicator_key_base}' - Value(s) involved might be faulty (e.g., {faulty_value}). Error: {e}")

        if not summary_points:
            logger.warning(f"[{symbol}] {func_name}: No valid indicator values could be formatted.")
            return "Technikai indikátor adatok elérhetők, de nem sikerült feldolgozni őket.", False

        logger.debug(f"[{symbol}] {func_name}: Successfully formatted {len(summary_points)} indicator points.")
        indicator_text = "- " + "\n- ".join(summary_points)
        return indicator_text, True

    except Exception as e:
        logger.error(f"[{symbol}] {func_name}: CRITICAL - Unexpected error: {e}", exc_info=True)
        return FALLBACK_INDICATOR_DATA, False


async def _format_news_data_for_prompt(symbol: str, news_items: Optional[List[NewsItem]]) -> Tuple[str, bool]:
    """
    Selects and formats relevant and recent news for the AI prompt (v3.1 - improved date handling).
    """
    func_name = f"_format_news_data_for_prompt_v3.1 ({symbol})" # Version bump
    logger.debug(f"[{func_name}] Starting news formatting...")

    if not news_items:
        logger.info(f"[{func_name}] No news items provided (input list is None or empty).")
        return "Friss hírek nem állnak rendelkezésre.", False

    relevant_news: List[NewsItem] = []
    formatted_news_points: List[str] = []
    added_urls: Set[str] = set()
    items_with_errors: int = 0

    # Configuration loading with fallbacks
    relevance_threshold: float = DEFAULT_RELEVANCE_THRESHOLD
    target_count: int = DEFAULT_TARGET_NEWS_COUNT
    try:
        # Prefer settings if available and valid
        cfg_relevance = getattr(settings.NEWS, 'RELEVANCE_THRESHOLD_PROMPT', DEFAULT_RELEVANCE_THRESHOLD)
        cfg_target_count = getattr(settings.NEWS, 'TARGET_COUNT_FOR_PROMPT', DEFAULT_TARGET_NEWS_COUNT)

        if isinstance(cfg_relevance, (float, int)): relevance_threshold = float(cfg_relevance)
        else: logger.warning(f"[{func_name}] Invalid type for NEWS.RELEVANCE_THRESHOLD_PROMPT: {type(cfg_relevance)}. Using default: {DEFAULT_RELEVANCE_THRESHOLD}")

        if isinstance(cfg_target_count, int): target_count = int(cfg_target_count)
        else: logger.warning(f"[{func_name}] Invalid type for NEWS.TARGET_COUNT_FOR_PROMPT: {type(cfg_target_count)}. Using default: {DEFAULT_TARGET_NEWS_COUNT}")

        logger.debug(f"[{func_name}] Using config: RelevanceThreshold={relevance_threshold:.2f}, TargetCount={target_count}")
    except AttributeError:
        logger.warning(f"[{func_name}] CONFIG WARNING: 'settings.NEWS' or its attributes not found. Using defaults for threshold/target count.", exc_info=False)
    except Exception as config_e: # Catch any other error during config load
        logger.error(f"[{func_name}] CONFIG ERROR: Unexpected error loading news config: {config_e}. Using defaults.", exc_info=True)


    filter_start = time.monotonic()
    symbol_upper = symbol.upper()
    logger.debug(f"[{func_name}] Filtering {len(news_items)} items for relevance to '{symbol_upper}' (threshold: {relevance_threshold:.2f})...")

    for i, news_item in enumerate(news_items):
        is_relevant_for_symbol = False
        try:
            ticker_sentiments = getattr(news_item, 'ticker_sentiment', None)
            if isinstance(ticker_sentiments, list):
                for sentiment_obj in ticker_sentiments:
                    if isinstance(sentiment_obj, TickerSentiment):
                        entry_ticker_raw = sentiment_obj.ticker
                        entry_score_raw = sentiment_obj.relevance_score
                        entry_ticker = str(entry_ticker_raw).strip().upper() if entry_ticker_raw and isinstance(entry_ticker_raw, str) else None
                        
                        score_float: Optional[float] = None
                        if entry_score_raw is not None:
                            try: score_float = float(entry_score_raw)
                            except (ValueError, TypeError):
                                logger.warning(f"[{func_name}] Invalid relevance_score type ({type(entry_score_raw)}) for ticker '{entry_ticker}' in item #{i+1} (Link: {getattr(news_item, 'link', DEFAULT_PROMPT_NA_TEXT)}). Skipping sentiment entry.")
                                continue
                        
                        if entry_ticker == symbol_upper and score_float is not None and score_float >= relevance_threshold:
                            is_relevant_for_symbol = True
                            logger.debug(f"  - Item #{i+1} (Link: {getattr(news_item, 'link', DEFAULT_PROMPT_NA_TEXT)}) is RELEVANT to {symbol_upper} (Score: {score_float:.2f} >= {relevance_threshold:.2f})")
                            break 
                    else:
                        logger.warning(f"[{func_name}] Unexpected item type in ticker_sentiment list: {type(sentiment_obj)} for item #{i+1}.")
            
            if is_relevant_for_symbol:
                relevant_news.append(news_item)
            # Optional: Log if not relevant but had sentiments
            # else:
            #    if ticker_sentiments: logger.debug(f"  - Item #{i+1} processed, but NOT relevant to {symbol_upper}.")
            #    else: logger.debug(f"  - Item #{i+1} has no ticker_sentiment data.")

        except Exception as filter_item_e:
            items_with_errors += 1
            logger.error(f"[{func_name}] Error checking relevance for item #{i+1} (Link: {getattr(news_item, 'link', DEFAULT_PROMPT_NA_TEXT)}): {filter_item_e}", exc_info=True)

    filter_duration = time.monotonic() - filter_start
    logger.info(f"[{func_name}] Relevance filtering complete in {filter_duration:.4f}s. Found {len(relevant_news)} relevant items (out of {len(news_items)}).")

    if not relevant_news:
        logger.info(f"[{func_name}] No relevant news items found for '{symbol_upper}' after filtering.")
        return f"Nincsenek friss, releváns hírek a(z) {symbol_upper} tickerhez.", False

    sort_start = time.monotonic()
    try:
        def get_sort_key(item: NewsItem) -> datetime:
            # Use NewsItem.published_at (AwareDatetime) for sorting
            published_dt_obj = getattr(item, 'published_at', None)
            if isinstance(published_dt_obj, datetime):
                # Ensure it's timezone-aware for consistent comparison, default to UTC if naive
                return published_dt_obj if published_dt_obj.tzinfo else published_dt_obj.replace(tzinfo=timezone.utc)
            logger.warning(f"[{func_name}] Sort key: Missing or invalid 'published_at' for item link: {getattr(item, 'link', DEFAULT_PROMPT_NA_TEXT)}. Placing at end.")
            return datetime.min.replace(tzinfo=timezone.utc) # Oldest possible date for items without proper date

        sorted_relevant_news = sorted(relevant_news, key=get_sort_key, reverse=True)
        sort_duration = time.monotonic() - sort_start
        logger.info(f"[{func_name}] Successfully sorted {len(sorted_relevant_news)} relevant news items by date (desc) in {sort_duration:.4f}s.")
    except Exception as sort_e:
         sort_duration = time.monotonic() - sort_start
         logger.error(f"[{func_name}] Sorting relevant news items failed after {sort_duration:.4f}s: {sort_e}. Proceeding with unsorted relevant list.", exc_info=True)
         sorted_relevant_news = relevant_news

    selected_news = sorted_relevant_news[:target_count]
    logger.info(f"[{func_name}] Selected top {len(selected_news)} news items for formatting (target was {target_count}).")

    format_start = time.monotonic()
    logger.debug(f"[{func_name}] Formatting selected {len(selected_news)} news items...")
    for i, news_item_to_format in enumerate(selected_news):
        item_log_prefix = f"[{func_name}][Format Item #{i+1}/{len(selected_news)}]"
        news_link_str: Optional[str] = None # Initialize for robust error logging
        try:
            news_link_obj = getattr(news_item_to_format, 'link', None)
            news_link_str = str(news_link_obj) if news_link_obj else None

            if not news_link_str:
                logger.warning(f"{item_log_prefix} Skipping: Missing or invalid link.")
                continue
            if news_link_str in added_urls:
                logger.debug(f"{item_log_prefix} Skipping: Duplicate URL '{news_link_str}'.")
                continue

            news_title_raw = getattr(news_item_to_format, 'title', None)
            news_title = str(news_title_raw).strip() if news_title_raw else 'Cím nélküli hír'
            news_publisher_raw = getattr(news_item_to_format, 'publisher_name', None) # Assuming NewsItem has publisher_name
            if not news_publisher_raw: # Fallback to 'publisher' if 'publisher_name' is not present
                news_publisher_raw = getattr(news_item_to_format, 'publisher', None)
            news_publisher = str(news_publisher_raw).strip() if news_publisher_raw else DEFAULT_PROMPT_NA_TEXT
            
            published_dt_obj = getattr(news_item_to_format, 'published_at', None)
            date_display = DEFAULT_PROMPT_NA_TEXT
            if isinstance(published_dt_obj, datetime):
                try:
                    date_display = published_dt_obj.strftime('%Y-%m-%d')
                except ValueError: # Should not happen with datetime object
                    logger.warning(f"{item_log_prefix} Could not format datetime object '{published_dt_obj}' for display. Using '{DEFAULT_PROMPT_NA_TEXT}'.")
            
            title_display = news_title if len(news_title) <= 120 else news_title[:117].strip() + "..."
            news_line = f"- \"{title_display}\" (Forrás: {news_publisher}, Dátum: {date_display})"

            formatted_news_points.append(news_line)
            added_urls.add(news_link_str)
            logger.debug(f"{item_log_prefix} Formatted and included: {news_line}")

        except Exception as format_item_e:
            items_with_errors += 1
            logger.error(f"{item_log_prefix} UNEXPECTED ERROR formatting news item (Link: {news_link_str if news_link_str else 'N/A'}): {format_item_e}", exc_info=True)

    format_duration = time.monotonic() - format_start
    logger.info(f"[{func_name}] News formatting finished in {format_duration:.4f}s. Included {len(formatted_news_points)} items.")
    if items_with_errors > 0:
        logger.warning(f"[{func_name}] Encountered {items_with_errors} errors during news item processing/formatting.")

    if not formatted_news_points:
        logger.warning(f"[{func_name}] No news items were ultimately formatted for the prompt.")
        final_text = f"Nem sikerült releváns híreket formázni a(z) {symbol_upper} tickerhez."
        return final_text, False
    else:
        final_text = "\n".join(formatted_news_points)
        logger.info(f"[{func_name}] Successfully generated formatted news string with {len(formatted_news_points)} items.")
        # logger.debug(f"[{func_name}] Final news string for prompt:\n{final_text}") # Uncomment for verbose logging
        return final_text, True


async def _format_fundamental_data_for_prompt(symbol: str, company_overview: Optional[CompanyOverview]) -> Tuple[str, bool]:
    """Formats fundamental company data using safe_format_value from helpers."""
    func_name = "_format_fundamental_data_for_prompt"
    logger.debug(f"[{symbol}] Running {func_name}...")
    if not company_overview:
        logger.debug(f"[{symbol}] {func_name}: Skipping, no CompanyOverview object provided.")
        return "Céginformáció nem áll rendelkezésre.", False

    fund_points = []
    fundamental_data_found = False
    fields_with_formatting_issues = 0 # Renamed for clarity

    # Fields to extract, their display labels, and format specifiers for safe_format_value
    # Format specifier: '' for string, ',' for thousand-separated int/float, '.2f' for float 2 decimal, '.2%' for percentage
    fields_config = [
        ('sector', 'Szektor', ''), ('industry', 'Iparág', ''),
        ('market_cap', 'Piaci Kapitalizáció', ','), ('trailing_pe', 'P/E (TTM)', '.2f'),
        ('forward_pe', 'Előretekintő P/E', '.2f'), ('eps', 'EPS (TTM)', '.2f'),
        ('dividend_yield', 'Osztalékhozam', '.2%'), ('beta', 'Béta', '.2f'),
        ('shares_outstanding', 'Részvények Száma', ','),
        ('book_value', 'Könyv szerinti érték/részv.', '.2f'),
    ]

    try:
        co = company_overview
        logger.debug(f"[{symbol}] {func_name}: Processing {len(fields_config)} fundamental fields from CompanyOverview...")

        formatted_values: Dict[str, str] = {}
        for field_key, _, fmt_spec in fields_config: # Label not needed here
            raw_value = getattr(co, field_key, None)
            # Use DEFAULT_NA from helpers, which safe_format_value also uses internally
            formatted_value = safe_format_value(symbol, field_key, raw_value, fmt_spec, default_if_error=DEFAULT_NA)
            formatted_values[field_key] = formatted_value

            if formatted_value == DEFAULT_NA and raw_value is not None:
                # Check if raw_value was something potentially meaningful that failed formatting
                raw_value_str = str(raw_value).strip().lower()
                if raw_value_str not in ['none', 'na', '-', '', 'n/a', '0', '0.0']: # Exclude obviously empty or zero values
                    fields_with_formatting_issues += 1
            elif formatted_value != DEFAULT_NA:
                fundamental_data_found = True
        
        logger.debug(f"[{symbol}] {func_name}: Finished formatting fields. Data found: {fundamental_data_found}. Fields with potential formatting issues (became N/A): {fields_with_formatting_issues}.")

        # Construct output based on formatted values
        sector = formatted_values.get('sector', DEFAULT_NA)
        industry = formatted_values.get('industry', DEFAULT_NA)
        if sector != DEFAULT_NA or industry != DEFAULT_NA: # Show even if one is missing
             fund_points.append(f"Szektor / Iparág: {sector if sector != DEFAULT_NA else DEFAULT_PROMPT_NA_TEXT} / {industry if industry != DEFAULT_NA else DEFAULT_PROMPT_NA_TEXT}")

        # P/E Logic
        trailing_pe_val = formatted_values.get('trailing_pe', DEFAULT_NA)
        forward_pe_val = formatted_values.get('forward_pe', DEFAULT_NA)
        if trailing_pe_val != DEFAULT_NA:
            fund_points.append(f"P/E (TTM): {trailing_pe_val}")
        if forward_pe_val != DEFAULT_NA and forward_pe_val != trailing_pe_val: # Show forward P/E if different and valid
            fund_points.append(f"Előretekintő P/E: {forward_pe_val} (Várható)")

        # Dividend Yield Logic (show only if non-zero and valid)
        yield_val_str = formatted_values.get('dividend_yield', DEFAULT_NA)
        if yield_val_str != DEFAULT_NA:
            is_effectively_zero_yield = False
            try:
                # Assuming safe_format_value with '.2%' results in "X.YY%"
                numeric_part = yield_val_str.rstrip('%')
                if abs(float(numeric_part)) < 0.001: # Check if close to zero
                    is_effectively_zero_yield = True
            except ValueError:
                 logger.warning(f"[{symbol}] {func_name}: Could not parse formatted yield '{yield_val_str}' to check for zero. Will include as is.")

            if not is_effectively_zero_yield:
                fund_points.append(f"Osztalékhozam: {yield_val_str}")
            else:
                logger.debug(f"[{symbol}] {func_name}: Dividend yield is zero or N/A, not adding to prompt points.")
        
        # Other fields from config
        for field_key, label, _ in fields_config:
            if field_key in ['sector', 'industry', 'trailing_pe', 'forward_pe', 'dividend_yield']:
                continue # Already handled with custom logic
            
            value = formatted_values.get(field_key, DEFAULT_NA)
            if value != DEFAULT_NA:
                fund_points.append(f"{label}: {value}")

        if not fund_points:
            msg = f"[{symbol}] {func_name}: CompanyOverview provided, but no valid/displayable data points extracted."
            if fields_with_formatting_issues > 0: msg += f" ({fields_with_formatting_issues} fields encountered formatting issues)."
            logger.warning(msg)
            return "Céginformáció elérhető, de nincsenek megjeleníthető kulcsadatok.", False

        logger.debug(f"[{symbol}] {func_name}: Successfully constructed {len(fund_points)} fundamental points.")
        fundamental_text = "- " + "\n- ".join(fund_points)
        return fundamental_text, True

    except Exception as e:
        logger.error(f"[{symbol}] {func_name}: CRITICAL - Unexpected error: {e}", exc_info=True)
        return FALLBACK_FUNDAMENTAL_DATA, False


async def _format_financials_data_for_prompt(symbol: str, financials_data: Optional[FinancialsData]) -> str:
    """Formats financial statements data for the AI prompt."""
    func_name = "_format_financials_data_for_prompt"
    logger.debug(f"[{symbol}] Running {func_name}...")
    
    if not financials_data:
        logger.debug(f"[{symbol}] {func_name}: Skipping, no FinancialsData provided.")
        return "Pénzügyi kimutatások nem állnak rendelkezésre."

    try:
        financial_points = []
        
        # Currency info
        currency = getattr(financials_data, 'currency', 'USD')
        curr_prefix = f"{currency} " if currency else ""
        
        # Latest financial data
        latest_annual_revenue = getattr(financials_data, 'latest_annual_revenue', None)
        latest_annual_net_income = getattr(financials_data, 'latest_annual_net_income', None)
        latest_quarterly_revenue = getattr(financials_data, 'latest_quarterly_revenue', None)
        latest_quarterly_net_income = getattr(financials_data, 'latest_quarterly_net_income', None)
        
        # Assets and liabilities
        total_assets = getattr(financials_data, 'total_assets', None)
        total_liabilities = getattr(financials_data, 'total_liabilities', None)
        
        # Report date
        report_date = getattr(financials_data, 'report_date', None)
        
        if latest_annual_revenue is not None:
            revenue_formatted = safe_format_value(symbol, 'annual_revenue', latest_annual_revenue, ',', default_if_error=DEFAULT_NA)
            if revenue_formatted != DEFAULT_NA:
                financial_points.append(f"Legutóbbi éves bevétel: {curr_prefix}{revenue_formatted}")
        
        if latest_annual_net_income is not None:
            income_formatted = safe_format_value(symbol, 'annual_net_income', latest_annual_net_income, ',', default_if_error=DEFAULT_NA)
            if income_formatted != DEFAULT_NA:
                financial_points.append(f"Legutóbbi éves nettó jövedelem: {curr_prefix}{income_formatted}")
        
        if latest_quarterly_revenue is not None and latest_quarterly_revenue != latest_annual_revenue:
            q_revenue_formatted = safe_format_value(symbol, 'quarterly_revenue', latest_quarterly_revenue, ',', default_if_error=DEFAULT_NA)
            if q_revenue_formatted != DEFAULT_NA:
                financial_points.append(f"Legutóbbi negyedéves bevétel: {curr_prefix}{q_revenue_formatted}")
        
        if latest_quarterly_net_income is not None and latest_quarterly_net_income != latest_annual_net_income:
            q_income_formatted = safe_format_value(symbol, 'quarterly_net_income', latest_quarterly_net_income, ',', default_if_error=DEFAULT_NA)
            if q_income_formatted != DEFAULT_NA:
                financial_points.append(f"Legutóbbi negyedéves nettó jövedelem: {curr_prefix}{q_income_formatted}")
        
        if total_assets is not None:
            assets_formatted = safe_format_value(symbol, 'total_assets', total_assets, ',', default_if_error=DEFAULT_NA)
            if assets_formatted != DEFAULT_NA:
                financial_points.append(f"Összes eszköz: {curr_prefix}{assets_formatted}")
        
        if total_liabilities is not None:
            liabilities_formatted = safe_format_value(symbol, 'total_liabilities', total_liabilities, ',', default_if_error=DEFAULT_NA)
            if liabilities_formatted != DEFAULT_NA:
                financial_points.append(f"Összes kötelezettség: {curr_prefix}{liabilities_formatted}")
        
        if report_date:
            try:
                if isinstance(report_date, str):
                    report_dt = datetime.fromisoformat(report_date.replace('Z', '+00:00'))
                elif hasattr(report_date, 'strftime'):
                    report_dt = report_date
                else:
                    report_dt = datetime.fromisoformat(str(report_date))
                financial_points.append(f"Legutóbbi jelentés dátuma: {report_dt.strftime('%Y-%m-%d')}")
            except Exception as e:
                logger.warning(f"[{symbol}] {func_name}: Could not format report_date '{report_date}': {e}")
        
        if not financial_points:
            logger.warning(f"[{symbol}] {func_name}: FinancialsData provided but no displayable data points extracted.")
            return "Pénzügyi kimutatások elérhetők, de nincsenek megjeleníthető adatok."
        
        financials_text = "- " + "\n- ".join(financial_points)
        logger.debug(f"[{symbol}] {func_name}: Successfully formatted {len(financial_points)} financial points.")
        return financials_text

    except Exception as e:
        logger.error(f"[{symbol}] {func_name}: CRITICAL - Unexpected error: {e}", exc_info=True)
        return FALLBACK_FINANCIALS_DATA


async def _format_earnings_data_for_prompt(symbol: str, earnings_data: Optional[EarningsData]) -> str:
    """Formats earnings reports data for the AI prompt."""
    func_name = "_format_earnings_data_for_prompt"
    logger.debug(f"[{symbol}] Running {func_name}...")
    
    if not earnings_data:
        logger.debug(f"[{symbol}] {func_name}: Skipping, no EarningsData provided.")
        return "Eredményjelentések nem állnak rendelkezésre."

    try:
        earnings_points = []
        
        # Currency info
        currency = getattr(earnings_data, 'currency', 'USD')
        curr_prefix = f"{currency} " if currency else ""
        
        # Annual reports
        annual_reports = getattr(earnings_data, 'annual_reports', [])
        if annual_reports and len(annual_reports) > 0:
            latest_annual = annual_reports[0]  # Assuming sorted by date desc
            
            if hasattr(latest_annual, 'date') and latest_annual.date:
                date_str = ""
                try:
                    if isinstance(latest_annual.date, str):
                        date_dt = datetime.fromisoformat(latest_annual.date.replace('Z', '+00:00'))
                    else:
                        date_dt = latest_annual.date
                    date_str = f" ({date_dt.strftime('%Y-%m-%d')})"
                except Exception:
                    date_str = ""
                
                if hasattr(latest_annual, 'reported_eps') and latest_annual.reported_eps is not None:
                    eps_formatted = safe_format_value(symbol, 'reported_eps', latest_annual.reported_eps, '.2f', default_if_error=DEFAULT_NA)
                    if eps_formatted != DEFAULT_NA:
                        earnings_points.append(f"Legutóbbi éves jelentett EPS{date_str}: {curr_prefix}{eps_formatted}")
                
                if hasattr(latest_annual, 'reported_revenue') and latest_annual.reported_revenue is not None:
                    revenue_formatted = safe_format_value(symbol, 'reported_revenue', latest_annual.reported_revenue, ',', default_if_error=DEFAULT_NA)
                    if revenue_formatted != DEFAULT_NA:
                        earnings_points.append(f"Legutóbbi éves jelentett bevétel{date_str}: {curr_prefix}{revenue_formatted}")
                
                if hasattr(latest_annual, 'net_income') and latest_annual.net_income is not None:
                    income_formatted = safe_format_value(symbol, 'net_income', latest_annual.net_income, ',', default_if_error=DEFAULT_NA)
                    if income_formatted != DEFAULT_NA:
                        earnings_points.append(f"Legutóbbi éves nettó jövedelem{date_str}: {curr_prefix}{income_formatted}")
        
        # Quarterly reports (most recent one)
        quarterly_reports = getattr(earnings_data, 'quarterly_reports', [])
        if quarterly_reports and len(quarterly_reports) > 0:
            latest_quarterly = quarterly_reports[0]  # Assuming sorted by date desc
            
            if hasattr(latest_quarterly, 'date') and latest_quarterly.date:
                date_str = ""
                try:
                    if isinstance(latest_quarterly.date, str):
                        date_dt = datetime.fromisoformat(latest_quarterly.date.replace('Z', '+00:00'))
                    else:
                        date_dt = latest_quarterly.date
                    date_str = f" ({date_dt.strftime('%Y-%m-%d')})"
                except Exception:
                    date_str = ""
                
                if hasattr(latest_quarterly, 'reported_eps') and latest_quarterly.reported_eps is not None:
                    eps_formatted = safe_format_value(symbol, 'quarterly_reported_eps', latest_quarterly.reported_eps, '.2f', default_if_error=DEFAULT_NA)
                    if eps_formatted != DEFAULT_NA:
                        earnings_points.append(f"Legutóbbi negyedéves jelentett EPS{date_str}: {curr_prefix}{eps_formatted}")
                
                if hasattr(latest_quarterly, 'surprise_percentage') and latest_quarterly.surprise_percentage is not None:
                    surprise_formatted = safe_format_value(symbol, 'surprise_percentage', latest_quarterly.surprise_percentage, '.1f', default_if_error=DEFAULT_NA)
                    if surprise_formatted != DEFAULT_NA:
                        earnings_points.append(f"Legutóbbi EPS meglepetés{date_str}: {surprise_formatted}%")
        
        # Provider info
        provider = getattr(earnings_data, 'raw_data_provider', None)
        if provider:
            earnings_points.append(f"Adatforrás: {provider}")
        
        if not earnings_points:
            logger.warning(f"[{symbol}] {func_name}: EarningsData provided but no displayable data points extracted.")
            return "Eredményjelentések elérhetők, de nincsenek megjeleníthető adatok."
        
        earnings_text = "- " + "\n- ".join(earnings_points)
        logger.debug(f"[{symbol}] {func_name}: Successfully formatted {len(earnings_points)} earnings points.")
        return earnings_text

    except Exception as e:
        logger.error(f"[{symbol}] {func_name}: CRITICAL - Unexpected error: {e}", exc_info=True)
        return FALLBACK_EARNINGS_DATA


# --- MAIN Prompt Generation Function ---

async def generate_ai_prompt_premium(
    symbol: str,
    df_recent: Optional[pd.DataFrame],
    latest_indicators: Optional[Dict[str, Any]],
    news_items: Optional[List[NewsItem]],
    company_overview: Optional[CompanyOverview],
    financials_data: Optional[FinancialsData] = None, # ÚJ, alapértelmezett None
    earnings_data: Optional[EarningsData] = None,     # ÚJ, alapértelmezett None
    template_filename: str = DEFAULT_PREMIUM_ANALYSIS_TEMPLATE_FILE
) -> str:
    """
    Generates the final AI prompt string by loading a template from a file
    and populating it with robustly formatted data sections, including financials and earnings.
    Version: enterprise_v1.0.0
    """
    func_name = "generate_ai_prompt_premium_enterprise_v1.0.0"
    log_prefix = f"[{symbol}][{func_name}]"
    logger.info(f"{log_prefix} Starting using template '{template_filename}'...")

    start_time = time.monotonic()

    # --- Input Adatok Logolása (Részletesség Szükség Szerint) ---
    logger.debug(f"{log_prefix} Input df_recent type: {type(df_recent)}, empty: {df_recent.empty if isinstance(df_recent, pd.DataFrame) else 'N/A'}")
    logger.debug(f"{log_prefix} Input latest_indicators type: {type(latest_indicators)}, keys: {list(latest_indicators.keys()) if isinstance(latest_indicators, dict) else 'N/A'}")
    logger.debug(f"{log_prefix} Input news_items type: {type(news_items)}, count: {len(news_items) if isinstance(news_items, list) else 'N/A'}")
    logger.debug(f"{log_prefix} Input company_overview type: {type(company_overview)}")
    logger.debug(f"{log_prefix} Input financials_data type: {type(financials_data)}")
    logger.debug(f"{log_prefix} Input earnings_data type: {type(earnings_data)}")

    # --- Adatszekciók Formázása Aszinkron Hívásokkal ---
    # Kezdeti értékek, felülíródnak a helper hívásokkal
    price_data_text: str = UNEXPECTED_HELPER_ERROR
    indicator_text: str = UNEXPECTED_HELPER_ERROR
    news_text_from_formatter: str = UNEXPECTED_HELPER_ERROR
    fundamental_text: str = UNEXPECTED_HELPER_ERROR
    financials_text: str = UNEXPECTED_HELPER_ERROR # ÚJ
    earnings_text: str = UNEXPECTED_HELPER_ERROR   # ÚJ

    has_price: bool = False
    has_indicators: bool = False
    has_news: bool = False
    has_fundamentals: bool = False
    has_financials: bool = False # ÚJ
    has_earnings: bool = False   # ÚJ

    # Helper hívások try-except blokkban az általános hibakezeléshez
    # Az egyes helper függvényeknek saját, részletesebb hibakezelésük is van.
    try:
        logger.debug(f"{log_prefix} Formatting price data...")
        # Itt a te _format_price_data_for_prompt függvényedet kellene hívni
        # Ha az a függvény nem létezik, vagy más a neve, akkor azt kell használni.
        # Most feltételezzük, hogy létezik és async.
        # Ha a régi ai_service.py-ből másoltad át, akkor az a helyes.
        price_data_text = await _format_price_data_for_prompt(symbol, df_recent)
        has_price = FALLBACK_PRICE_DATA not in price_data_text and "{ Nincs" not in price_data_text
        logger.debug(f"{log_prefix} Price data (has={has_price}): {price_data_text[:150]}...")

        logger.debug(f"{log_prefix} Formatting indicator data...")
        indicator_text, has_indicators = await _format_indicator_data_for_prompt(symbol, latest_indicators, df_recent)
        logger.debug(f"{log_prefix} Indicator data (has={has_indicators}):\n{indicator_text}")

        logger.debug(f"{log_prefix} Formatting news data...")
        news_text_from_formatter, has_news = await _format_news_data_for_prompt(symbol, news_items)
        logger.debug(f"{log_prefix} News data (has={has_news}):\n{news_text_from_formatter}")

        logger.debug(f"{log_prefix} Formatting fundamental (company overview) data...")
        fundamental_text, has_fundamentals = await _format_fundamental_data_for_prompt(symbol, company_overview)
        logger.debug(f"{log_prefix} Fundamental data (has={has_fundamentals}):\n{fundamental_text}")

        # ÚJ SZEKCIÓK FORMÁZÁSA
        logger.debug(f"{log_prefix} Formatting financials statement data...")
        financials_text = await _format_financials_data_for_prompt(symbol, financials_data)
        has_financials = FALLBACK_FINANCIALS_DATA not in financials_text and "nem állnak rendelkezésre" not in financials_text.lower()
        logger.debug(f"{log_prefix} Financials statement data (has={has_financials}):\n{financials_text}")
        
        logger.debug(f"{log_prefix} Formatting earnings report data...")
        earnings_text = await _format_earnings_data_for_prompt(symbol, earnings_data)
        has_earnings = FALLBACK_EARNINGS_DATA not in earnings_text and "nem állnak rendelkezésre" not in earnings_text.lower()
        logger.debug(f"{log_prefix} Earnings report data (has={has_earnings}):\n{earnings_text}")

    except Exception as e_format_section:
        logger.error(f"{log_prefix} CRITICAL - Unhandled error during a data formatting section: {e_format_section}", exc_info=True)
        # Itt egy általános hibát adunk vissza, mert a prompt nem lesz teljes.
        # A hívó (ai_service) majd kezeli ezt a hibát.
        raise ValueError(f"Prompt generation failed for {symbol} due to an error in a data formatting helper.") from e_format_section

    # --- Validált Szövegek Összeállítása a Sablonhoz ---
    logger.debug(f"{log_prefix} Preparing validated texts for prompt template...")
    validated_texts: Dict[str, str] = {}
    
    # Árfolyam adatok
    validated_texts['price_data'] = price_data_text if has_price else "Árfolyam adatok nem állnak rendelkezésre, vagy hiba történt a lekérésük során."
    # Indikátor adatok
    validated_texts['indicator_data'] = indicator_text if has_indicators else "Technikai indikátor adatok nem állnak rendelkezésre, vagy nem sikerült feldolgozni őket."
    # Hírek
    validated_texts['news_data'] = news_text_from_formatter if has_news else "Releváns hírek nem állnak rendelkezésre."
    # Alapvető vállalati adatok (CompanyOverview)
    validated_texts['fundamental_data'] = fundamental_text if has_fundamentals else "Alapvető vállalati fundamentumok nem állnak rendelkezésre."
    # Pénzügyi kimutatások
    validated_texts['financial_statements_data'] = financials_text if has_financials else "Részletes pénzügyi kimutatások (mérleg, eredmény, cash flow) nem állnak rendelkezésre."
    # Eredményjelentések
    validated_texts['earnings_reports_data'] = earnings_text if has_earnings else "Vállalati eredményjelentések nem állnak rendelkezésre."

    # --- Prompt Sablon Betöltése és Kitöltése ---
    logger.debug(f"{log_prefix} Loading and populating prompt template file: '{template_filename}'")
    try:
         # JAVÍTÁS: Biztosítjuk, hogy a PROMPT_TEMPLATE_DIR helyesen van definiálva a modul tetején
        # PROMPT_TEMPLATE_DIR = Path(__file__).parent / "prompt_templates" # Ezt már a modul tetején definiáltad
        template_path = PROMPT_TEMPLATE_DIR / template_filename # template_filename itt a DEFAULT_PREMIUM_ANALYSIS_TEMPLATE_FILE értéke lesz
        logger.debug(f"{log_prefix} Attempting to load template from absolute path: {template_path.resolve()}")

        if not template_path.is_file():
            logger.error(f"{log_prefix} CRITICAL - Prompt template file NOT FOUND at resolved path: {template_path.resolve()}")
            # ... (további debug logok) ...
            raise FileNotFoundError(f"Prompt template file '{template_filename}' not found at {template_path.resolve()}")

        with open(template_path, "r", encoding="utf-8") as f:
            prompt_template_str = f.read()

        # Hírek számának meghatározása a sablonhoz (ha a settingsből jön)
        target_news_count_str = str(getattr(settings.NEWS, 'TARGET_COUNT_FOR_PROMPT', DEFAULT_TARGET_NEWS_COUNT))
        
        # Adatok a .format() metódushoz
        # Győződj meg róla, hogy minden kulcs, amit a sablonod használ, itt szerepel!
        format_data_for_template = {
            "symbol": str(symbol).upper(),
            "price_data": validated_texts['price_data'],
            "indicator_data": validated_texts['indicator_data'],
            "news_data": validated_texts['news_data'],
            "fundamental_data": validated_texts['fundamental_data'],
            "financial_statements_data": validated_texts['financial_statements_data'],
            "earnings_reports_data": validated_texts['earnings_reports_data'],
            "target_news_count": target_news_count_str
            # Ide jöhetnek további fix vagy dinamikus értékek, amiket a sablon használhat
        }

        final_prompt = prompt_template_str.format(**format_data_for_template)
        
        total_duration = time.monotonic() - start_time
        logger.info(f"{log_prefix} Successfully generated prompt from template '{template_filename}'. Total duration: {total_duration:.3f}s. Prompt length: {len(final_prompt)} chars.")
        # logger.debug(f"{log_prefix} Generated Prompt Preview (first 500 chars):\n---\n{final_prompt[:500]}\n---")
        return final_prompt

    except FileNotFoundError: # Ezt már fentebb is kezeltük, de itt újra elkapjuk a biztonság kedvéért
        # A hiba már logolva lett. Itt csak továbbdobjuk, hogy a hívó kezelje.
        raise # A hívónak (ai_service) tudnia kell, hogy a prompt generálás nem sikerült.
    except KeyError as ke:
        logger.error(f"{log_prefix} CRITICAL - KeyError during prompt template formatting. A placeholder in '{template_filename}' is likely missing from 'format_data_for_template' or 'validated_texts'. Missing key: '{ke}'", exc_info=True)
        logger.debug(f"{log_prefix} Available keys in format_data_for_template: {list(format_data_for_template.keys())}")
        raise ValueError(f"Prompt generation failed for {symbol} due to a missing key ('{ke}') during template formatting.") from ke
    except Exception as e_template:
        logger.error(f"{log_prefix} CRITICAL - Unexpected error during prompt template loading or formatting: {e_template}", exc_info=True)
        raise ValueError(f"Prompt generation failed for {symbol} due to an unexpected error in template processing.") from e_template