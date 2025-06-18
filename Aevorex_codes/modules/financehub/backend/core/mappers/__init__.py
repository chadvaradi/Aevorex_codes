# backend/core/mappers/__init__.py
# ==============================================================================
# Public Interface for the Data Mappers Package
# Version: 3.9
# Last Modified: 2025-05-07
# Description:
#   This file constitutes the public API for the 'mappers' package.
#   It centralizes the import and export of all primary data mapping functions,
#   facilitating cleaner, more maintainable imports across other services
#   (e.g., StockDataService, StockDataOrchestrator).
#
#   Key changes in v3.9:
#     - Corrected the alias for 'map_eodhd_ohlcv_df_to_chart_list'. It now
#       correctly points to '_map_eodhd_ohlcv_df_to_frontend_list' from the
#       eodhd.py module, ensuring that the chart-compatible list of dictionaries
#       is returned as expected by consuming services (e.g., StockDataService).
#     - Maintained robust logger initialization and dynamic __all__ list generation.
#
#   Example Usage:
#     from modules.financehub.backend.core.mappers import map_yfinance_info_to_overview
# ==============================================================================

# --- Standard Library Imports ---
import logging
from typing import List, Optional, Callable, Any # For type hints with placeholders
# --- Package Specific Logger Setup ---
_PACKAGE_LOGGER_NAME = "aevorex_finbot.core.mappers"
package_logger: logging.Logger

try:
    from modules.financehub.backend.utils.logger_config import get_logger
    package_logger = get_logger(_PACKAGE_LOGGER_NAME)
except ImportError:
    package_logger = logging.getLogger(f"{_PACKAGE_LOGGER_NAME}.init_import_fallback")
    package_logger.warning(
        "Could not import 'get_logger' from 'backend.utils.logger_config'. "
        "Using a basic logging configuration for the mappers package. "
        "Full logging capabilities might be reduced."
    )
except Exception as e_logger_setup:
    package_logger = logging.getLogger(f"{_PACKAGE_LOGGER_NAME}.init_critical_fallback")
    package_logger.error(
        f"Unexpected critical error during logger setup for mappers package: {e_logger_setup}",
        exc_info=True
    )

# --- Placeholder Type Definition for Mappers ---
# This helps with type hinting when mappers might not be loaded.
# Adjust arguments and return type based on the most common signature or use Any.
MapperCallable = Optional[Callable[..., Any]]

# --- Import Public Mappers from Source-Specific Modules ---
# Flags to track successful imports
_YFINANCE_MAPPERS_IMPORTED = False
_ALPHAVANTAGE_MAPPERS_IMPORTED = False
_EODHD_MAPPERS_IMPORTED = False
_FMP_MAPPERS_IMPORTED = False
_SHARED_MAPPERS_IMPORTED = False

# --- yfinance Mappers ---
map_yfinance_info_to_overview: MapperCallable = None
map_yfinance_earnings_df_to_model: MapperCallable = None
map_financial_dataframes_to_models: MapperCallable = None
map_yfinance_ohlcv_df_to_chart_list: MapperCallable = None
try:
    from .yfinance import (
        map_yfinance_info_to_overview as _map_yfinance_info_to_overview,
        map_yfinance_financial_statement_to_earnings_periods as _map_yfinance_financial_statement_to_earnings_periods,
        map_financial_dataframes_to_financials_model as _map_financial_dataframes_to_financials_model,
        map_yfinance_ohlcv_df_to_chart_list as _map_yfinance_ohlcv_df_to_chart_list
    )
    # Értékadás a csomag szintű változóknak
    map_yfinance_info_to_overview = _map_yfinance_info_to_overview
    map_yfinance_financial_statement_to_earnings_periods = _map_yfinance_financial_statement_to_earnings_periods
    map_financial_dataframes_to_financials_model = _map_financial_dataframes_to_financials_model
    map_yfinance_ohlcv_df_to_chart_list = _map_yfinance_ohlcv_df_to_chart_list
    _YFINANCE_MAPPERS_IMPORTED = True
except ImportError as e:
    package_logger.error(f"Failed to import yfinance mappers: {e}", exc_info=True)
except AttributeError as e_attr: # Ha valamelyik függvény hiányzik a .yfinance-ból
    package_logger.error(f"AttributeError importing yfinance mappers (likely missing function in yfinance.py): {e_attr}", exc_info=True)

# --- Alpha Vantage Mappers ---
map_alpha_vantage_earnings_to_model: MapperCallable = None
try:
    from .alphavantage import (
        map_alpha_vantage_earnings_to_model as _map_alpha_vantage_earnings_to_model
    )
    map_alpha_vantage_earnings_to_model = _map_alpha_vantage_earnings_to_model
    _ALPHAVANTAGE_MAPPERS_IMPORTED = True
except ImportError as e:
    package_logger.error(f"Failed to import Alpha Vantage mappers: {e}", exc_info=True)

# --- EODHD Mappers (Pydantic Model-based and Placeholders) ---
map_eodhd_data_to_chart_ready_format: MapperCallable = None
map_eodhd_ohlcv_to_price_history_entries: MapperCallable = None
map_eodhd_ohlcv_df_to_chart_list: MapperCallable = None # Crucial alias
map_eodhd_splits_data_to_models: MapperCallable = None
map_eodhd_dividends_data_to_models: MapperCallable = None
map_eodhd_news_data_to_models: MapperCallable = None
map_eodhd_company_info_placeholder_to_overview: MapperCallable = None
map_eodhd_financial_statements_placeholder_to_models: MapperCallable = None
try:
    from .eodhd import (
        map_eodhd_data_to_chart_ready_format as _map_eodhd_data_to_chart_ready_format,
        map_eodhd_ohlcv_to_price_history_entries as _map_eodhd_ohlcv_to_price_history_entries,
        # CORRECTED ALIAS: Points to the function returning List[Dict] for charts.
        map_eodhd_ohlcv_df_to_frontend_list,
        map_eodhd_splits_data_to_models as _map_eodhd_splits_data_to_models,
        map_eodhd_dividends_data_to_models as _map_eodhd_dividends_data_to_models,
        map_eodhd_news_data_to_models as _map_eodhd_news_data_to_models,
        map_eodhd_company_info_placeholder_to_overview as _map_eodhd_company_info_placeholder_to_overview,
        map_eodhd_financial_statements_placeholder_to_models as _map_eodhd_financial_statements_placeholder_to_models
    )
    map_eodhd_data_to_chart_ready_format = _map_eodhd_data_to_chart_ready_format
    map_eodhd_ohlcv_to_price_history_entries = _map_eodhd_ohlcv_to_price_history_entries
    map_eodhd_ohlcv_df_to_chart_list = map_eodhd_ohlcv_df_to_frontend_list
    map_eodhd_splits_data_to_models = _map_eodhd_splits_data_to_models
    map_eodhd_dividends_data_to_models = _map_eodhd_dividends_data_to_models
    map_eodhd_news_data_to_models = _map_eodhd_news_data_to_models
    map_eodhd_company_info_placeholder_to_overview = _map_eodhd_company_info_placeholder_to_overview
    map_eodhd_financial_statements_placeholder_to_models = _map_eodhd_financial_statements_placeholder_to_models
    _EODHD_MAPPERS_IMPORTED = True
except ImportError as e:
    package_logger.error(f"Failed to import EODHD mappers: {e}", exc_info=True)
except AttributeError as e_attr: # Catch if _map_eodhd_ohlcv_df_to_frontend_list is missing
    package_logger.error(
        f"Failed to alias EODHD mappers, possibly missing '_map_eodhd_ohlcv_df_to_frontend_list' in eodhd.py: {e_attr}",
        exc_info=True
    )


# --- FMP Mappers ---
map_fmp_raw_ratings_to_rating_points: MapperCallable = None
try:
    from .fmp import (
        _map_fmp_item_to_standard as _map_fmp_item_to_std_fmp,
        map_fmp_raw_ratings_to_rating_points as _map_fmp_raw_ratings_to_rating_points
    )
    map_fmp_raw_ratings_to_rating_points = _map_fmp_raw_ratings_to_rating_points
    _FMP_MAPPERS_IMPORTED = True
    package_logger.debug("Successfully imported FMP mappers: map_fmp_raw_ratings_to_rating_points") # <<< JAVÍTVA
except ImportError as e_fmp_imp:
    package_logger.error(f"Failed to import FMP mappers from .fmp module: {e_fmp_imp}", exc_info=True) # <<< JAVÍTVA
    _FMP_MAPPERS_IMPORTED = False

# --- News Mapping Orchestrators (From Shared Module) ---
map_raw_news_to_standard_dicts: MapperCallable = None
map_standard_dicts_to_newsitems: MapperCallable = None
try:
    from ._shared_mappers import (
        map_raw_news_to_standard_dicts as _map_raw_news_to_standard_dicts,
        map_standard_dicts_to_newsitems as _map_standard_dicts_to_newsitems
    )
    map_raw_news_to_standard_dicts = _map_raw_news_to_standard_dicts
    map_standard_dicts_to_newsitems = _map_standard_dicts_to_newsitems
    _SHARED_MAPPERS_IMPORTED = True
except ImportError as e:
    package_logger.error(f"Failed to import shared mappers: {e}", exc_info=True)


# --- Define __all__ for explicit public interface (Best Practice) ---
_public_api_symbols: List[str] = []

# Helper to add to public API if the symbol is not None (i.e., successfully imported or placeholder)
def _add_to_public_api(symbol_name: str, symbol_value: Any) -> None:
    if symbol_value is not None:
        _public_api_symbols.append(symbol_name)

# Populate based on actual imported/defined symbols (HELYES NEVEKKEL)
_add_to_public_api('map_yfinance_info_to_overview', map_yfinance_info_to_overview)
_add_to_public_api('map_yfinance_financial_statement_to_earnings_periods', map_yfinance_financial_statement_to_earnings_periods)
_add_to_public_api('map_financial_dataframes_to_financials_model', map_financial_dataframes_to_financials_model)
_add_to_public_api('map_yfinance_ohlcv_df_to_chart_list', map_yfinance_ohlcv_df_to_chart_list)


_add_to_public_api('map_alpha_vantage_earnings_to_model', map_alpha_vantage_earnings_to_model)

_add_to_public_api('map_eodhd_data_to_chart_ready_format', map_eodhd_data_to_chart_ready_format)
_add_to_public_api('map_eodhd_ohlcv_to_price_history_entries', map_eodhd_ohlcv_to_price_history_entries)
_add_to_public_api('map_eodhd_ohlcv_df_to_chart_list', map_eodhd_ohlcv_df_to_chart_list) # Key alias
_add_to_public_api('map_eodhd_splits_data_to_models', map_eodhd_splits_data_to_models)
_add_to_public_api('map_eodhd_dividends_data_to_models', map_eodhd_dividends_data_to_models)
_add_to_public_api('map_eodhd_news_data_to_models', map_eodhd_news_data_to_models)
_add_to_public_api('map_eodhd_company_info_placeholder_to_overview', map_eodhd_company_info_placeholder_to_overview)
_add_to_public_api('map_eodhd_financial_statements_placeholder_to_models', map_eodhd_financial_statements_placeholder_to_models)

_add_to_public_api('map_raw_news_to_standard_dicts', map_raw_news_to_standard_dicts)
_add_to_public_api('map_standard_dicts_to_newsitems', map_standard_dicts_to_newsitems)
_add_to_public_api('map_fmp_raw_ratings_to_rating_points', map_fmp_raw_ratings_to_rating_points)

# Ensure __all__ is sorted and contains unique, non-None symbols.
__all__ = sorted(list(set(_public_api_symbols)))


# --- Final Package Initialization Log ---
package_logger.info(
    f"Backend Core Mappers package (v3.9) initialized. "
    f"Publicly exposed mappers ({len(__all__)}): {', '.join(__all__) if __all__ else 'NONE (Check import errors)'}."
)
if not _YFINANCE_MAPPERS_IMPORTED:
    package_logger.warning("YFinance mappers failed to load. Dependent functionality will be affected.")
if not _ALPHAVANTAGE_MAPPERS_IMPORTED:
    package_logger.warning("Alpha Vantage mappers failed to load. Dependent functionality will be affected.")
if not _EODHD_MAPPERS_IMPORTED:
    package_logger.warning("EODHD mappers failed to load. Dependent functionality will be affected.")
if not _FMP_MAPPERS_IMPORTED:
    package_logger.warning("FMP mappers failed to load. Dependent functionality will be affected.")
if not _SHARED_MAPPERS_IMPORTED:
    package_logger.warning("Shared mappers (_shared_mappers.py) failed to load. Dependent functionality will be affected.")