# backend/core/mappers/_mapper_base.py
# ==============================================================================
# Mapper Base Module (v1.1.0)
# ==============================================================================
"""
Provides the foundational elements for the `backend.core.mappers` package,
designed specifically to break circular dependencies between shared utilities,
dynamic validators, and source-specific mappers.

This module contains:
- The shared logger instance for the mappers package.
- Core constants required by multiple mapper modules (e.g., model paths).
- Fundamental type definitions (e.g., StandardNewsDict) used across mappers.
- Essential shared utility functions (e.g., safe_get) needed early in the
  import chain or by modules that cannot import from _shared_mappers.

By centralizing these base components, other modules within the mappers package
can import them directly without causing circular import errors. This module
itself should have minimal dependencies and **must not** import sibling modules
like `_shared_mappers` or `_dynamic_validator`.
"""
# ==============================================================================

# --- Standard Library & Third-Party Imports ---
from typing import List, Optional, Dict, Any, Final, TypedDict, Union
from pydantic import HttpUrl
import pandas as pd # Required for safe_get function

# --- Core Application Imports ---
# Only import absolute necessities from outside the mappers package here.
try:
    from modules.financehub.backend.utils.logger_config import get_logger
    logger = get_logger(f"aevorex_finbot.{__name__}") # Alap név-minta
    logger.info(f"[{__name__}] _mapper_base logger initialized successfully.")
except Exception as e:
    # Critical fallback logger használata
    fallback_logger.critical(f"FATAL ERROR: Cannot import get_logger from modules.financehub.backend.utils.logger_config in _mapper_base: {e}. Check paths and dependencies.", exc_info=True)
    _logger_imported = False
    # We raise a runtime error to prevent the application from starting incorrectly
    raise RuntimeError(f"Mapper base setup failed: Cannot import logger configuration: {e}") from e

# --- Shared Constants ---
# Path to the Pydantic models module, used by the dynamic validator.
MODELS_STOCK_MODULE_PATH: Final[str] = 'modules.financehub.backend.models.stock'
# Default value for optional fields when data is unavailable.
DEFAULT_NA_VALUE: Final[str] = "N/A"
YFINANCE_NEWS_DEFAULT_SOURCE_NAME: Final[str] = "Yahoo Finance News" 

# --- Shared Type Definitions ---
class StandardNewsDict(TypedDict, total=False):
    """
    Unified dictionary format for news items from various API sources.
    Acts as an intermediate representation before final Pydantic model validation.
    `total=False` allows flexibility, but fields like title/url should generally
    be present after the initial raw mapping stage.
    """
    title: str                      # Generally expected
    url: Union[HttpUrl, str]        # Generally expected (allow str during processing)
    published_utc: Optional[str]    # ISO 8601 string or None
    source_name: Optional[str]      # Publisher/Source name
    snippet: Optional[str]          # Summary/Description
    image_url: Optional[Union[HttpUrl, str]] # URL string or HttpUrl
    sentiment_score: Optional[float] # If available
    sentiment_label: Optional[str]  # If available
    tickers: List[str]              # Associated stock tickers (uppercase)
    api_source: str                 # Identifier of the origin API (e.g., 'yfinance')

# --- Shared Helper Functions ---
def safe_get(df: Optional[pd.DataFrame], index: Any, column: str, default: Any = None) -> Any:
    """
    Safely retrieves a value from a pandas DataFrame by index and column.

    Handles potential KeyErrors if index/column doesn't exist, checks for
    None DataFrame input, and correctly handles pandas NA values (NaN, NaT),
    returning the specified default value in these cases.

    Args:
        df: The pandas DataFrame to query (can be None).
        index: The index label (row) to access.
        column: The column label to access.
        default: The value to return if access fails or the value is NA.

    Returns:
        The value from the DataFrame at the specified location, or the default value.

    Requires:
        pandas library.
    """
    if df is None:
        # logger.debug("safe_get: Input DataFrame is None.") # Optional: Debug log
        return default
    try:
        # Check existence before access for slightly more robust handling,
        # though df.loc would raise KeyError anyway.
        if index not in df.index:
            # logger.debug(f"safe_get: Index '{index}' not found in DataFrame.") # Optional: Debug log
            return default
        if column not in df.columns:
            # logger.debug(f"safe_get: Column '{column}' not found in DataFrame.") # Optional: Debug log
            return default

        value = df.loc[index, column]

        # pd.isna handles None, np.nan, pd.NaT gracefully
        if pd.isna(value):
            return default
        return value
    except KeyError:
        # This might catch cases missed by initial checks, e.g., multi-index issues
        logger.warning(f"safe_get: KeyError encountered accessing df.loc['{index}', '{column}'].")
        return default
    except Exception as e:
        # Catch any other unexpected DataFrame access errors
        logger.warning(f"safe_get: Unexpected error accessing DataFrame [{index}, {column}]: {e}", exc_info=False)
        return default

# --- Initialization Log ---
logger.info("--- Mapper Base Module (_mapper_base.py v1.1.0) initialized successfully. Provides logger, constants, types, and base helpers. ---")
logger.critical(f"🔍 DEBUG: MODELS_STOCK_MODULE_PATH constant value at runtime: '{MODELS_STOCK_MODULE_PATH}'")