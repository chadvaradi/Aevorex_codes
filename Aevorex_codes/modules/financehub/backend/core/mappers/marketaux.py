# backend/core/mappers/marketaux.py
# ==============================================================================
# Mappers specifically for processing data obtained from the MarketAux API.
# Handles news data mapping.
# ==============================================================================

from typing import List, Optional, Dict, Any, Set
from pydantic import HttpUrl

# --- Core Imports ---
try:
    # Utilitás függvények importálása
    from modules.financehub.backend.utils.helpers import (
        _clean_value,
        normalize_url,
        parse_timestamp_to_iso_utc,
        parse_optional_float
    )
except ImportError as e:
    # Kritikus hiba logolása és az alkalmazás leállítása, ha a helper-ek nem elérhetők
    import logging
    logging.basicConfig(level="CRITICAL")
    cl = logging.getLogger(__name__)
    cl.critical(f"CRITICAL ERROR: Failed to import core helpers in MarketAux mapper. Path: utils.helpers. Error: {e}", exc_info=True)
    raise RuntimeError(f"MarketAux mapper failed initialization due to missing helpers: {e}") from e

# --- Base Mapper Imports ---
try:
    # Logger és StandardNewsDict importálása a közös alapból
    from ._mapper_base import logger, StandardNewsDict
except ImportError as e_base:
    import logging
    logging.basicConfig(level="CRITICAL")
    cl = logging.getLogger(__name__)
    cl.critical(f"FATAL ERROR: Cannot import from _mapper_base in marketaux_mapper. Error: {e_base}", exc_info=True)
    raise RuntimeError(f"MarketAux mapper failed initialization due to missing _mapper_base: {e_base}") from e_base

# ==============================================================================
# === MarketAux Specific Mapper ===
# ==============================================================================

def _map_marketaux_item_to_standard(raw_item: Dict[str, Any]) -> Optional[StandardNewsDict]:
    """
    Maps a raw dictionary item from the MarketAux news API response (v1/news/all endpoint)
    to the standardized StandardNewsDict format.

    This function focuses on robust data extraction, cleaning, validation, and
    transformation, adhering to enterprise-level coding standards. It handles
    MarketAux specific fields and gracefully manages missing or malformed data
    for individual items by logging issues and returning None for unmappable items.

    Args:
        raw_item: A dictionary representing a single news article from MarketAux.
                  Expected keys include: 'uuid', 'title', 'snippet', 'url',
                  'image_url', 'published_on', 'source', 'entities',
                  'sentiment_score', etc.

    Returns:
        A StandardNewsDict dictionary if mapping is successful, otherwise None.
        Reasons for returning None (skipping an item) are logged.
    """
    log_prefix = "[marketaux_mapper][_map_item]"

    # --- 1. Basic Input Validation ---
    if not isinstance(raw_item, dict) or not raw_item:
        logger.warning(f"{log_prefix} Input `raw_item` is not a non-empty dictionary. Type: {type(raw_item)}. Skipping.")
        return None

    # For debugging, log a preview of the raw item
    # (e.g., uuid, url, title, source, published_on)
    item_uuid = raw_item.get('uuid', 'N/A')
    logger.debug(f"{log_prefix} Processing raw item (UUID: {item_uuid}): "
                 f"URL='{raw_item.get('url', 'N/A')}', Title='{str(raw_item.get('title', 'N/A'))[:50]}...'")
    logger.debug(f"{log_prefix} FULL RAW MARKETAUX ITEM (UUID: {item_uuid}): {raw_item}") # <<< ÚJ, RÉSZLETES LOG

    try:
        # --- 2. Extract and Validate Essential Fields ---
        # These fields are critical for a news item to be considered valid.

        # Title
        title_raw = raw_item.get("title")
        title = _clean_value(title_raw)
        if not title:
            logger.warning(f"{log_prefix} Skipping item (UUID: {item_uuid}): Missing or empty 'title'. Original: '{title_raw}'.")
            return None

        # URL
        raw_url_str = raw_item.get("url")
        cleaned_url_str = _clean_value(raw_url_str)
        url: Optional[HttpUrl] = normalize_url(cleaned_url_str)
        if not url:
            logger.warning(f"{log_prefix} Skipping item (UUID: {item_uuid}, Title: '{title}'): "
                           f"Invalid or missing 'url'. Original raw_url: '{raw_url_str}'.")
            return None

        # Published Timestamp (MarketAux: 'published_on')
        # Format example: "2023-10-27T10:00:00.000000Z"
        published_on_str_raw = raw_item.get("published_at")
        logger.debug(f"{log_prefix} (UUID: {item_uuid}) Raw 'published_on' value from API: '{published_on_str_raw}'") # <<< ÚJ LOG
        published_on_str = _clean_value(published_on_str_raw)
        logger.debug(f"{log_prefix} (UUID: {item_uuid}) 'published_at' value after _clean_value: '{published_on_str}'")
        published_utc: Optional[str] = None

        if not published_on_str:
            logger.warning(f"{log_prefix} Skipping item (UUID: {item_uuid}, URL: {raw_item.get('url', 'N/A')}): "
                        f"Missing or empty 'published_at' field after cleaning. Original raw value: '{published_on_str_raw}'.") # Logban is javítva
            return None # Skip if published date is missing

        parsed_time = parse_timestamp_to_iso_utc(
            published_on_str,
            context=f"{log_prefix} (UUID: {item_uuid}, URL: {url})"
        )
        if not parsed_time:
            logger.warning(f"{log_prefix} Skipping item (UUID: {item_uuid}, URL: {url}): "
                           f"Could not parse 'published_on' timestamp '{published_on_str}' to ISO UTC.")
            return None # Strict: Skip if timestamp parsing fails
        published_utc = parsed_time
        logger.debug(f"{log_prefix} (UUID: {item_uuid}) Successfully parsed 'published_on': '{published_on_str}' -> '{published_utc}'.")

        # --- 3. Extract and Clean Optional Fields ---

        # Snippet
        snippet_raw = raw_item.get("snippet")
        snippet = _clean_value(snippet_raw)
        if not snippet and title: # Fallback to title if snippet is empty
            snippet = title
            logger.debug(f"{log_prefix} (UUID: {item_uuid}) 'snippet' is empty, using 'title' as fallback.")

        # Source Name (MarketAux: 'source')
        source_name_raw = raw_item.get("source")
        source_name = _clean_value(source_name_raw)
        if not source_name:
            source_name = "MarketAux News" # Default source name if missing
            logger.debug(f"{log_prefix} (UUID: {item_uuid}) 'source' field (for source_name) is missing, using default: '{source_name}'.")

        # Image URL
        image_url_raw = raw_item.get("image_url")
        cleaned_image_url_str = _clean_value(image_url_raw)
        image_url: Optional[HttpUrl] = None
        if cleaned_image_url_str:
            image_url = normalize_url(cleaned_image_url_str)
            if not image_url:
                logger.warning(f"{log_prefix} (UUID: {item_uuid}, URL: {url}) Could not normalize 'image_url': '{cleaned_image_url_str}'. Will be set to None.")
        # else: logger.debug(...) No need to log if image_url is simply not provided

        # --- 4. Extract Tickers from 'entities' list ---
        tickers_set: Set[str] = set() # Use a set to store unique tickers
        entities_raw = raw_item.get("entities")

        if isinstance(entities_raw, list) and entities_raw:
            for entity_dict in entities_raw:
                if isinstance(entity_dict, dict):
                    entity_type = entity_dict.get("type")
                    raw_symbol = entity_dict.get("symbol") # Typically a stock ticker

                    if entity_type == "equity" and raw_symbol:
                        cleaned_symbol = _clean_value(raw_symbol)
                        if cleaned_symbol and isinstance(cleaned_symbol, str):
                            tickers_set.add(cleaned_symbol.upper()) # Standardize to uppercase
                        # else: logger.debug(...) No need to log if symbol is not a valid string after cleaning
                # else: logger.warning(...) Handle malformed entity items if necessary, but often ignorable
            logger.debug(f"{log_prefix} (UUID: {item_uuid}) Extracted tickers from 'entities': {tickers_set if tickers_set else 'None'}")
        elif entities_raw is not None: # entities key exists but is not a list or is an empty list
            logger.warning(f"{log_prefix} (UUID: {item_uuid}, URL: {url}) 'entities' field was present but not a non-empty list "
                           f"(type: {type(entities_raw)}). No tickers extracted.")
        # else: logger.debug(...) 'entities' key is missing, which is acceptable.

        tickers: List[str] = sorted(list(tickers_set)) # Convert set to sorted list

        # --- 5. Extract Sentiment Data ---
        # MarketAux typically provides 'sentiment_score' at the article level.
        # 'sentiment_label' is usually not provided directly.
        raw_sentiment_score = raw_item.get("sentiment_score")
        sentiment_score = parse_optional_float(
            raw_sentiment_score,
            context=f"{log_prefix} (UUID: {item_uuid}, URL: {url}): sentiment_score"
        )
        sentiment_label: Optional[str] = None # MarketAux API schema usually only provides score

        # --- 6. Assemble Standard Dictionary ---
        # Ensure all keys from StandardNewsDict are present, using None for optional fields if data is unavailable.
        standard_item: StandardNewsDict = {
            "title": title,                 # Mandatory, validated
            "url": url,                     # Mandatory, validated HttpUrl
            "published_utc": published_utc, # Mandatory, validated ISO string
            "source_name": source_name,     # Optional str, with fallback
            "snippet": snippet,             # Optional str, with fallback
            "image_url": image_url,         # Optional HttpUrl or None
            "tickers": tickers if tickers else None, # Optional List[str] or None
            "api_source": "marketaux",      # Hardcoded API source identifier
            "sentiment_score": sentiment_score, # Optional float or None
            "sentiment_label": sentiment_label, # Optional str, None for MarketAux
        }

        logger.debug(f"{log_prefix} Successfully mapped item (UUID: {item_uuid}, URL: {url}) to StandardNewsDict.")
        return standard_item

    except Exception as e:
        # Catch any unexpected errors during the mapping process for this specific item.
        # This ensures that one bad item doesn't stop the processing of others.
        logger.error(f"{log_prefix} Unexpected error mapping MarketAux item (UUID: {item_uuid}, "
                     f"URL: {raw_item.get('url', 'N/A')}): {e}", exc_info=True)
        return None # Skip item on unexpected error

# --- Log that MarketAux mappers are loaded ---
logger.debug("MarketAux specific mappers (marketaux.py) loaded successfully.")