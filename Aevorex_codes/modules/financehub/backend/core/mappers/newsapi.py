# backend/core/mappers/newsapi.py
# ==============================================================================
# Mappers specifically for processing data obtained from the NewsAPI.org API.
# Handles news data mapping.
# ==============================================================================

from typing import List, Optional, Dict, Any
from pydantic import HttpUrl # Needed for normalize_url return type

# --- Core Imports ---
try:
    # ... (Core helpers import marad) ...
    from modules.financehub.backend.utils.helpers import ( _clean_value, normalize_url, parse_timestamp_to_iso_utc )
except ImportError as e:
    # ... (Error handling marad) ...
    import logging; logging.basicConfig(level="CRITICAL"); cl=logging.getLogger(__name__); cl.critical(f"...", exc_info=True); raise RuntimeError(f"NewsAPI mapper failed initialization: {e}") from e

# === JAVÍTOTT INTERNAL IMPORTS ===
# --- 1. Import from Base ---
try:
    # NewsAPI only needs logger and the StandardNewsDict type from base
    from ._mapper_base import logger, StandardNewsDict
except ImportError as e_base:
    import logging; logging.basicConfig(level="CRITICAL"); cl = logging.getLogger(__name__); cl.critical(f"FATAL ERROR: Cannot import from _mapper_base in newsapi_mapper: {e_base}", exc_info=True); raise RuntimeError(f"NewsAPI mapper failed initialization due to missing base: {e_base}") from e_base

# --- 2. Import from Shared Mappers (Not needed here) ---
# This mapper doesn't directly use helpers like safe_get defined in _shared_mappers

# --- 3. Import from Dynamic Validator (Not needed here) ---
# This mapper doesn't perform dynamic Pydantic model validation itself

# === JAVÍTÁS VÉGE ===

# ==============================================================================
# === NewsAPI.org Specific Mappers ===
# ==============================================================================

# Note: This function is intended for internal use by map_raw_news_to_standard_dicts
#       in _shared_mappers.py, hence the leading underscore.
def _map_newsapi_item_to_standard(raw_item: Dict[str, Any]) -> Optional[StandardNewsDict]:
    """
    Maps a raw dictionary item from the NewsAPI.org API response to the
    standardized StandardNewsDict format.

    Handles NewsAPI specific fields like 'publishedAt', 'description', 'source', 'urlToImage'.

    Args:
        raw_item: A dictionary representing a single news article from NewsAPI.org.

    Returns:
        A StandardNewsDict dictionary if mapping is successful, otherwise None.
    """
    func_name = "_map_newsapi_item_to_standard"
    log_prefix = "[newsapi][_map_item]" # Consistent log prefix

    # --- Basic Input Validation ---
    if not isinstance(raw_item, dict):
        logger.warning(f"{log_prefix} Input raw_item is not a dict. Type: {type(raw_item)}. Skipping.")
        return None

    # Log raw input preview (optional)
    raw_item_preview = {k: v for k, v in raw_item.items() if k in ['title', 'url', 'publishedAt', 'source']}
    logger.debug(f"{log_prefix} Processing raw item: {raw_item_preview}")

    try:
        # --- Extract and Clean Fields ---
        # NewsAPI field names: 'title', 'url', 'publishedAt', 'description', 'source' (dict), 'urlToImage'
        title = _clean_value(raw_item.get("title"))
        raw_url = _clean_value(raw_item.get("url"))
        # 'publishedAt' is typically an ISO 8601 string (e.g., "2024-01-15T10:30:00Z")
        published_str = _clean_value(raw_item.get("publishedAt"))
        # 'description' serves as the snippet/summary
        snippet = _clean_value(raw_item.get("description"))
        # 'source' is a nested dictionary containing 'id' and 'name'
        source_info = raw_item.get("source")
        source_name: Optional[str] = None
        if isinstance(source_info, dict):
            source_name = _clean_value(source_info.get("name"))
        elif source_info: # Log if source is present but not a dict
             logger.warning(f"{log_prefix} Expected 'source' to be a dict, but got {type(source_info)}. URL: {raw_url}")

        raw_image_url = _clean_value(raw_item.get("urlToImage"))

        # Normalize URL
        url: Optional[HttpUrl] = normalize_url(raw_url)

        # --- Validation Checks (as per original logic) ---
        # Title, URL, and publishedAt are considered essential
        if not title:
            logger.warning(f"{log_prefix} Skipping item: Missing or empty 'title'. URL: {raw_url}")
            return None
        if not url:
            logger.warning(f"{log_prefix} Skipping item: Invalid or missing 'url' after normalization. Original raw_url: {raw_url}")
            return None
        if not published_str:
            logger.warning(f"{log_prefix} Skipping item: Missing 'publishedAt'. URL: {url}")
            return None # Skip if published date is missing

        # --- Parse Timestamp ---
        # NewsAPI usually provides ISO 8601 UTC format ('Z' or timezone offset)
        published_utc: Optional[str] = parse_timestamp_to_iso_utc(published_str, context=f"{log_prefix}:timestamp_newsapi")
        if not published_utc:
            # If parsing fails, skip the item (original logic)
            logger.warning(f"{log_prefix} Skipping item: Could not parse 'publishedAt' timestamp '{published_str}' to ISO UTC for URL: {url}.")
            return None

        # Normalize image URL
        image_url: Optional[HttpUrl] = normalize_url(raw_image_url) if raw_image_url else None

        # --- Assemble Standard Dictionary ---
        # NewsAPI does not provide financial tickers or sentiment analysis directly.
        standard_dict: StandardNewsDict = {
            "title": title,
            "url": url,                 # Pass HttpUrl object
            "published_utc": published_utc, # Pass ISO string (mandatory)
            "source_name": source_name if source_name else "NewsAPI.org", # Use extracted name or default
            "snippet": snippet if snippet else title, # Use description as snippet, fallback to title
            "image_url": image_url,       # Pass HttpUrl object or None
            "tickers": [],                # NewsAPI doesn't provide associated tickers
            "api_source": "newsapi",      # Indicate the origin API
            "sentiment_score": None,      # NewsAPI doesn't provide sentiment
            "sentiment_label": None,      # NewsAPI doesn't provide sentiment
        }

        # logger.debug(f"{log_prefix} Successfully mapped item. URL: {url}")
        return standard_dict

    except Exception as e:
        # Catch unexpected errors during mapping
        logger.error(f"{log_prefix} Unexpected error mapping item (URL: {raw_item.get('url', 'N/A')}): {e}", exc_info=True)
        return None

# --- Log that NewsAPI mappers are loaded ---
# logger.debug("NewsAPI specific mappers (newsapi.py) loaded.") # Optional debug log