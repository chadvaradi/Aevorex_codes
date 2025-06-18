# backend/core/fetchers/_fetcher_constants.py
"""
Aevorex FinBot - Fetcher Shared Static Constants (v1.0)

This module provides shared, static constants for the fetcher submodules
and potentially _base_helpers.py, aiming to prevent circular dependencies.
It should NOT have complex imports like `settings` or `CacheService` if those
constants are to be imported by _base_helpers.py without issues.
"""
from typing import List, Final

# --- Common Markers and Values ---
# A konstans neve, amit a többi modul (pl. _base_helpers.py) importálni fog.
# Az értéke ("FETCH_FAILED_PERSISTENTLY") az, amit a cache-be írunk.
FETCH_FAILED_MARKER: Final[str] = "FETCH_FAILED_PERSISTENTLY"

DEFAULT_NA_VALUE: Final[str] = "N/A"

# --- Column Definitions ---
# Elsősorban a yfinance és az általános OHLCV feldolgozáshoz használt oszlopnevek.
# Az EODHD fetcher saját, specifikusabb oszlopnév definíciókat használhat.
OHLCV_REQUIRED_COLS: Final[List[str]] = ['open', 'high', 'low', 'close', 'volume']

# --- API Base URLs (Static strings) ---
MARKETAUX_BASE_URL: Final[str] = "https://api.marketaux.com"
FMP_BASE_URL: Final[str] = "https://financialmodelingprep.com/api" # /v3, /v4 a konkrét URL-ben lesz
NEWSAPI_BASE_URL: Final[str] = "https://newsapi.org/v2"
ALPHA_VANTAGE_BASE_URL: Final[str] = "https://www.alphavantage.co/query"
EODHD_BASE_URL_GENERAL: Final[str] = "https://eodhistoricaldata.com/api"
EODHD_BASE_URL_EOD: Final[str] = f"{EODHD_BASE_URL_GENERAL}/eod"
EODHD_BASE_URL_INTRADAY: Final[str] = f"{EODHD_BASE_URL_GENERAL}/intraday"
EODHD_BASE_URL_FUNDAMENTALS: Final[str] = f"{EODHD_BASE_URL_GENERAL}/fundamentals"

# Add other truly static, shared constants here as needed.
# For example, if EODHD_FETCHER_LOGGER in eodhd.py needs TARGET_OHLCV_COLS and other fetchers might too,
# they could also be moved here. For now, keeping them in eodhd.py is fine if not broadly shared.