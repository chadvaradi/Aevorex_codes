# backend/core/mappers/fmp.py
# ==============================================================================
# Mappers specifically for processing data obtained from the Financial Modeling Prep (FMP) API.
# Handles mapping for News items and historical Ratings.
# ==============================================================================

import time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, HttpUrl, ValidationError # HttpUrl needed for normalize_url return

# --- Core Imports ---
try:
    from modules.financehub.backend.utils.helpers import ( _clean_value, normalize_url, parse_timestamp_to_iso_utc )
except ImportError as e:
    import logging
    logging.basicConfig(level="CRITICAL")
    startup_logger = logging.getLogger(f"{__name__}.startup_critical")
    startup_logger.critical(f"FMP mapper FAILS INITIALIZATION (helpers): {e}", exc_info=True)
    raise RuntimeError(f"FMP mapper failed initialization (helpers): {e}") from e

# --- Base Imports ---
try:
    # FMP mappers need logger, the StandardNewsDict type for the news mapper,
    # and DEFAULT_NA_VALUE might be used.
    from ._mapper_base import logger, StandardNewsDict, DEFAULT_NA_VALUE
except ImportError as e_base:
    import logging; logging.basicConfig(level="CRITICAL"); cl = logging.getLogger(__name__); cl.critical(f"FATAL ERROR: Cannot import from _mapper_base in fmp_mapper: {e_base}", exc_info=True); raise RuntimeError(f"FMP mapper failed initialization due to missing base: {e_base}") from e_base

# --- Pydantic Model Imports (Direct Imports) ---
# These models are expected to be defined in the specified path.
# If these imports fail, it indicates a structural issue in the project.
try:
    from modules.financehub.backend.models.stock import RatingPoint, EarningsData # Using EarningsData as the target container model.
                                                          # Its definition MUST allow sparse population for ratings
                                                          # (e.g. earnings-specific fields are Optional or have defaults).
except ImportError as e_models:
    import logging
    logging.basicConfig(level="CRITICAL")
    cl = logging.getLogger(__name__)
    logger.critical(f"FATAL ERROR: Failed to import Pydantic models (RatingPoint, EarningsData) from modules.financehub.backend.models.stock: {e_models}", exc_info=True)
    raise RuntimeError(f"FMP mapper failed initialization due to missing models: {e_models}") from e_models

# Removed _dynamic_import_and_validate import and its usage for these models,
# as direct imports are preferred for known, project-internal models.
# The previous fatal error on importing _dynamic_validator suggests it was problematic or missing.

# ==============================================================================
# === FMP Specific Mappers ===
# ==============================================================================

# --- Internal FMP News Item Mapper ---
# Note: Intended for internal use by map_raw_news_to_standard_dicts (if such a higher-level function exists)
# or direct use if processing individual FMP news items.
def _map_fmp_item_to_standard(raw_item: Dict[str, Any], api_source: str) -> Optional[StandardNewsDict]:
    """
    Maps a raw dictionary item from an FMP news endpoint (e.g., stock news, press releases)
    to the standardized StandardNewsDict format.

    Args:
        raw_item: A dictionary representing a single news article from FMP.
        api_source (str): Identifier for the specific FMP source (e.g., 'fmp_stock_news', 'fmp_press_releases').
                          Used for logging and tracking data provenance.

    Returns:
        A StandardNewsDict dictionary if mapping is successful and data is valid, otherwise None.
    """
    func_name = "_map_fmp_item_to_standard"
    # Incorporate api_source into log_prefix for better log tracing and identifying the origin of data/errors.
    log_prefix = f"[{api_source}][{func_name}]"

    if not isinstance(raw_item, dict):
        logger.warning(f"{log_prefix} Input raw_item is not a dictionary. Type: {type(raw_item)}. Skipping.")
        return None

    # For debugging, log a preview of the raw item structure being processed.
    # Be mindful of sensitive data; truncate long strings if necessary.
    raw_item_preview = {
        k: (str(v)[:75] + '...' if isinstance(v, str) and len(v) > 75 else v)
        for k, v in raw_item.items()
        if k in ['symbol', 'publishedDate', 'title', 'site', 'url', 'text'] # Key fields for identification
    }
    logger.debug(f"{log_prefix} Processing raw FMP news item preview: {raw_item_preview}")

    try:
        # --- Field Extraction and Cleaning (FMP specific field names) ---
        title = _clean_value(raw_item.get("title"))
        raw_url = _clean_value(raw_item.get("url"))
        # FMP 'publishedDate' can be "YYYY-MM-DD HH:MM:SS" or sometimes include timezone info.
        # The parse_timestamp_to_iso_utc helper is designed to handle various formats.
        published_str = _clean_value(raw_item.get("publishedDate"))
        # FMP uses 'text' for the main content/snippet.
        snippet = _clean_value(raw_item.get("text"))
        # FMP uses 'site' for the news source/publisher name.
        source_name = _clean_value(raw_item.get("site"))
        raw_image_url = _clean_value(raw_item.get("image"))
        # FMP news items typically relate to a single primary 'symbol'.
        ticker_symbol = _clean_value(raw_item.get("symbol"))

        # --- Essential Field Validation (Early Exit) ---
        if not title:
            logger.warning(f"{log_prefix} Skipping item: Missing or empty 'title'. URL: {raw_url or 'N/A'}")
            return None
        if not raw_url: # Check raw_url before normalization, as it's essential.
            logger.warning(f"{log_prefix} Skipping item: Missing or empty 'url'. Title: '{title}'")
            return None
        if not published_str:
            logger.warning(f"{log_prefix} Skipping item: Missing or empty 'publishedDate'. Title: '{title}', URL: {raw_url}")
            return None

        # --- URL Normalization ---
        # normalize_url returns Optional[HttpUrl] or raises ValueError if input is not string-like.
        url: Optional[HttpUrl]
        try:
            url = normalize_url(raw_url)
            if not url: # normalize_url might return None for fundamentally invalid URLs (e.g., non-HTTP/S schemes).
                logger.warning(f"{log_prefix} Skipping item: 'url' ('{raw_url}') could not be normalized to a valid HTTP/HTTPS URL. Title: '{title}'")
                return None
        except ValueError as e_url_norm: # Catch if normalize_url itself raises an error (e.g., due to invalid type).
             logger.warning(f"{log_prefix} Skipping item: Error normalizing 'url' ('{raw_url}'): {e_url_norm}. Title: '{title}'")
             return None

        # --- Timestamp Parsing ---
        # parse_timestamp_to_iso_utc is expected to be robust and log its own parsing failures if context is provided.
        published_utc: Optional[str] = parse_timestamp_to_iso_utc(
            timestamp_str=published_str,
            context=f"{log_prefix} Field: 'publishedDate', URL: {str(url)}" # Pass str(url) for logging
        )
        if not published_utc:
            # parse_timestamp_to_iso_utc already logs detailed errors, so we just note the skip decision here.
            logger.warning(f"{log_prefix} Skipping item: Failed to parse 'publishedDate' ('{published_str}') to ISO UTC. URL: {str(url)}")
            return None

        # --- Image URL Normalization (Optional Field) ---
        image_url: Optional[HttpUrl] = None
        if raw_image_url and raw_image_url.strip(): # Ensure raw_image_url is not just whitespace
            try:
                image_url = normalize_url(raw_image_url)
            except ValueError: # If image URL is malformed but not critical to the item.
                logger.debug(f"{log_prefix} Non-critical: Could not normalize 'image_url' ('{raw_image_url}'). Proceeding without image. URL: {str(url)}")
                image_url = None # Ensure it's None if normalization fails.

        # --- Ticker Symbol Processing ---
        tickers: List[str] = []
        if ticker_symbol and isinstance(ticker_symbol, str) and ticker_symbol.strip():
            # Standardize to uppercase and remove leading/trailing whitespace.
            tickers.append(ticker_symbol.strip().upper())
        elif ticker_symbol: # Log if ticker_symbol is present but not a valid string.
            logger.debug(f"{log_prefix} Non-critical: 'symbol' field present ('{ticker_symbol}') but not a processable string. No ticker associated. URL: {str(url)}")

        # --- Assemble Standardized News Dictionary ---
        # Ensure all fields required by StandardNewsDict TypedDict are present.
        # Convert HttpUrl objects to strings as StandardNewsDict likely expects string URLs.
        standard_dict: StandardNewsDict = {
            "title": title,
            "url": str(url),  # StandardNewsDict typically expects str, convert from HttpUrl.
            "published_utc": published_utc, # Already a string from parse_timestamp_to_iso_utc.
            "source_name": source_name if source_name else "FMP", # Default source if 'site' is missing.
            "snippet": snippet if snippet else title, # Use title as fallback for snippet if 'text' is empty.
            "image_url": str(image_url) if image_url else None, # Convert HttpUrl to str or use None.
            "tickers": tickers,
            "api_source": api_source, # Provenance: specific FMP endpoint.
            "sentiment_score": None,  # FMP news typically doesn't provide pre-computed sentiment.
            "sentiment_label": None,
            # Add any other fields required by StandardNewsDict with default/None values
            # These are examples; adjust based on the actual StandardNewsDict definition.
            "full_text": snippet, # FMP 'text' is more like a snippet/body, could map to full_text if appropriate.
            "authors": [],     # FMP doesn't typically provide authors.
            "tags_keywords": [], # FMP doesn't typically provide tags.
            "source_feed_url": None, # FMP doesn't typically provide this.
            "meta_data": {"fmp_original_symbol": raw_item.get("symbol", DEFAULT_NA_VALUE)} # Example: store original FMP symbol.
        }

        logger.debug(f"{log_prefix} Successfully mapped FMP news item to StandardNewsDict. URL: {str(url)}")
        return standard_dict

    except Exception as e:
        # Catch any unexpected errors during the mapping of a single item.
        # Log extensively for diagnosis.
        logger.error(f"{log_prefix} Unexpected error mapping FMP news item (URL: {raw_item.get('url', 'N/A')}): {e}. Raw item keys: {list(raw_item.keys())}", exc_info=True)
        return None


# --- FMP Ratings History Mapper ---
def map_fmp_raw_ratings_to_rating_points(
    ratings_list: Optional[List[Dict[str, Any]]],
    request_id: str
) -> Optional[List[RatingPoint]]: # Return type is a list of RatingPoint objects or None.
    """
    Maps a list of historical rating dictionaries from the FMP API
    to an EarningsData Pydantic model, primarily populating its `ratings_history` field.

    Individual rating items are validated against the `RatingPoint` model.
    The final structure (containing the list of `RatingPoint`s) is validated
    against the `EarningsData` model. This mapper does NOT populate other
    earnings-specific fields in `EarningsData` (e.g., annual/quarterly reports)
    as FMP ratings data does not provide them. The success of producing a valid
    `EarningsData` instance depends on its definition allowing such sparse population
    (i.e., other fields being Optional or having default_factory).

    Args:
        ratings_list: A list of dictionaries, where each dictionary represents
                      a historical rating point from FMP's /historical-rating endpoint.
        request_id: Unique identifier for logging correlation.

    Returns:
    A list of validated RatingPoint Pydantic model instances,
    or None if input is invalid or no valid rating points could be processed.
    """
    func_name = "map_fmp_raw_ratings_to_rating_points" # Retaining original name as per request.
    log_prefix = f"[{request_id}][{func_name}]"

    # --- Input Validation ---
    if not ratings_list: # Handles both None and empty list scenarios.
        logger.info(f"{log_prefix} Input ratings_list is None or empty. No ratings to map, returning None.")
        return None
    if not isinstance(ratings_list, list):
        logger.warning(f"{log_prefix} Input ratings_list is not a list (type: {type(ratings_list)}). Cannot map, returning None.")
        return None

    logger.info(f"{log_prefix} Attempting to map {len(ratings_list)} raw FMP rating items to a list of RatingPoint models.")    
    map_start_time = time.monotonic()

    processed_rating_points: List[RatingPoint] = []
    skipped_item_count = 0
    # Store a few examples of validation errors for summary logging
    first_validation_error_examples: List[str] = []

    # --- Stage 1: Process and Validate Each Raw Rating Item against RatingPoint Model ---
    for i, raw_rating_item in enumerate(ratings_list):
        item_log_prefix = f"{log_prefix}[RatingItem #{i+1}/{len(ratings_list)}]"

        if not isinstance(raw_rating_item, dict):
            logger.warning(f"{item_log_prefix} Skipping: Item is not a dictionary (type: {type(raw_rating_item)}).")
            skipped_item_count += 1
            continue

        try:
            # Directly validate the raw dictionary against the RatingPoint model.
            # Pydantic's model_validate handles field aliasing (e.g., 'ratingScore' to 'rating_score')
            # and type conversions/validations as defined in the RatingPoint model.
            # Crucial: RatingPoint model must be defined with aliases for FMP fields like:
            # 'date', 'symbol', 'rating', 'ratingScore', 'ratingRecommendation',
            # 'ratingDetailsDCFScore', 'ratingDetailsROEScore', etc.
            logger.debug(f"{item_log_prefix} Validating raw rating data against RatingPoint model: {raw_rating_item}")

            validated_point = RatingPoint.model_validate(raw_rating_item)
            processed_rating_points.append(validated_point)
            # Log success for the item, perhaps with key fields from the validated model.
            # logger.debug(f"{item_log_prefix} Successfully validated item as RatingPoint: Symbol={validated_point.symbol}, Date={validated_point.date}, Score={validated_point.rating_score}")

        except ValidationError as e_val:
            skipped_item_count += 1
            # Log detailed Pydantic validation errors for the specific item.
            # Extract a concise summary of the first error for better readability in logs.
            first_error = e_val.errors()[0] if e_val.errors() else {}
            error_field = first_error.get('loc', ('unknown field',))[0]
            error_msg = first_error.get('msg', 'Unknown validation issue')
            
            log_message = f"{item_log_prefix} Skipping: Pydantic validation failed for RatingPoint. Field '{error_field}': {error_msg}. Raw Data Snippet: {{'symbol': '{raw_rating_item.get('symbol')}', 'date': '{raw_rating_item.get('date')}', ...}}"
            logger.warning(log_message)
            # For more detailed debugging, one might log e_val.errors() entirely at DEBUG level.
            # logger.debug(f"{item_log_prefix} Full Pydantic validation errors for RatingPoint: {e_val.errors()}", exc_info=False)


            if len(first_validation_error_examples) < 3: # Collect a few examples
                first_validation_error_examples.append(f"Item ~{i+1} (Symbol: {raw_rating_item.get('symbol', 'N/A')}, Date: {raw_rating_item.get('date', 'N/A')}) - Field '{error_field}': {error_msg}")

        except Exception as e_item_processing:
            # Catch any other unexpected errors during a single item's processing.
            logger.error(f"{item_log_prefix} Skipping: Unexpected error processing rating item: {e_item_processing}. Raw: {raw_rating_item}", exc_info=True)
            skipped_item_count += 1
            continue

    # --- Post-Processing Sanity Check for RatingPoint list ---
    if not processed_rating_points:
        logger.warning(f"{log_prefix} No valid RatingPoint objects were created after processing all {len(ratings_list)} items (all skipped or invalid).")
        if first_validation_error_examples:
            logger.warning(f"{log_prefix} Examples of RatingPoint validation errors encountered: {'; '.join(first_validation_error_examples)}")
        return None

    logger.info(f"{log_prefix} Successfully validated {len(processed_rating_points)} items as RatingPoint models. Skipped {skipped_item_count} items.")
    # (a fenti logger.info sor után)

    map_duration_secs = time.monotonic() - map_start_time # Ezt a sort érdemes ide áthelyezni
    logger.info(f"{log_prefix} Mapping to List[RatingPoint] completed in {map_duration_secs:.4f}s.")
    return processed_rating_points # Simply return the list of RatingPoint objects
    # --- Stage 2: Assemble and Validate Final EarningsData Model ---
    # The EarningsData model is expected to have a 'ratings_history: List[RatingPoint]' field.
    # Other fields specific to earnings reports (annual, quarterly) will be defaulted
    # (e.g., to empty lists via default_factory or made Optional[List[...]] = None)
    # in the EarningsData model definition for this to succeed.
    
    # Attempt to derive a common ticker if all ratings are for the same symbol,
    # which might be useful if EarningsData model has a 'ticker' field.
    # This is an assumption; FMP /historical-rating is usually per-symbol.
    #common_ticker: Optional[str] = None
   # if processed_rating_points:
    #    unique_symbols = {rp.symbol for rp in processed_rating_points if rp.symbol}
     #   if len(unique_symbols) == 1:
      #      common_ticker = unique_symbols.pop()

   # earnings_data_payload: Dict[str, Any] = {
   #     "ratings_history": processed_rating_points,
        # Ensure other fields required by EarningsData are either:
        # 1. Optional (and thus can be omitted or set to None if not applicable for ratings)
        # 2. Have default_factory=list (for list fields like annual_reports)
        # 3. Can be logically defaulted here (e.g., ticker if consistently available)
        # Example: If EarningsData has these fields and they are optional or have defaults:
        # "ticker": common_ticker,
        # "annual_reports": [], # Or rely on default_factory in model
        # "quarterly_reports": [], # Or rely on default_factory in model
   # }
    # If EarningsData expects a 'ticker' and it's required, provide it if available:
    #if common_ticker and "ticker" not in earnings_data_payload: # Check if EarningsData might expect 'ticker'
         # earnings_data_payload["ticker"] = common_ticker # Uncomment if 'ticker' is a field in EarningsData
    #     pass


   # try:
    #    logger.debug(f"{log_prefix} Attempting to validate final EarningsData model with {len(processed_rating_points)} ratings. Payload keys: {list(earnings_data_payload.keys())}")
        
        # This is the critical validation step for the container model.
        # Errors like "Field period_year: Field required" (from original problem) would occur here
        # if the EarningsData model has such required fields not present in earnings_data_payload.
   #     validated_earnings_data_model = EarningsData.model_validate(earnings_data_payload)
#
   #     map_duration_secs = time.monotonic() - map_start_time
   #     logger.info(f"{log_prefix} Successfully mapped FMP ratings to EarningsData model (populating 'ratings_history') in {map_duration_secs:.4f}s.")
    #    return validated_earnings_data_model

   # except ValidationError as e_final_val:
        # This signifies that the structure prepared (even if ratings_history is correct)
        # does not meet the requirements of the EarningsData model.
        # This is a crucial log message for diagnosing model definition mismatches.
     #   error_details_summary = "; ".join([f"Field '{err['loc'][0] if err['loc'] else 'N/A'}': {err['msg']}" for err in e_final_val.errors()[:3]]) # First 3 errors
     #   logger.error(
     #       f"{log_prefix} Pydantic validation FAILED for the final EarningsData model. "
     #       f"This indicates the collected RatingPoints could not be embedded into a valid EarningsData structure. "
      #      f"This usually means the 'EarningsData' model has other *required* fields that were not (and cannot be) populated from FMP ratings data. "
      #      f"Check EarningsData model definition for required fields without defaults. Summary of errors: {error_details_summary}. "
      #      f"Payload attempted had {len(processed_rating_points)} ratings.",
       #     exc_info=False # Full exc_info can be too verbose; e_final_val.errors() is more focused.
       # )
        # Log all validation errors at DEBUG level for thorough inspection.
      #  logger.debug(f"{log_prefix} Full Pydantic validation errors for EarningsData model: {e_final_val.errors(include_url=False)}")
      #  logger.debug(f"{log_prefix} Payload that failed EarningsData validation (structure summary): {{'ratings_history_count': {len(earnings_data_payload.get('ratings_history',[]))}, 'other_payload_keys': {list(k for k in earnings_data_payload if k != 'ratings_history')}}}")

       # if first_validation_error_examples: # Remind about earlier item-level errors if any
      #      logger.warning(f"{log_prefix} Note: There were also {skipped_item_count} individual RatingPoint validation failures. Examples: {'; '.join(first_validation_error_examples)}")
      #  return None

   # except Exception as e_final_assembly:
      #  map_duration_secs = time.monotonic() - map_start_time
      #  logger.error(f"{log_prefix} Unexpected error during final assembly or validation of EarningsData model after {map_duration_secs:.4f}s: {e_final_assembly}", exc_info=True)
      #  return None

# --- Log that FMP mappers are loaded (optional, good for startup diagnostics) ---
logger.info("FMP specific mappers (backend/core/mappers/fmp.py) loaded successfully with direct model imports.")