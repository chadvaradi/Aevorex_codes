# backend/core/constants.py
"""
Aevorex FinBot - Core Constants (v1.0)

Ez a modul központi konstansokat, Enumokat és alapvető konfigurációs
függvényeket definiál, amelyeket a `backend.core` csomag és más részei
a projektnek használhatnak.
"""

import logging
from enum import Enum, auto
from typing import Final, Dict, List

logger = logging.getLogger("aevorex_finbot.constants")

# --- Projekt Verzió (Lehet, hogy jobb a config.py-ban, de itt is lehet default) ---
# Próbáljuk meg a configból, ha van, különben használjunk defaultot
try:
    from ..config import settings
    APP_VERSION_FOR_CACHE: Final[str] = settings.APP_META.VERSION
    logger.debug(f"Using APP_VERSION '{APP_VERSION_FOR_CACHE}' from settings for cache keys.")
except (ImportError, AttributeError):
    APP_VERSION_FOR_CACHE: Final[str] = "unknown_v0.0" # Fallback verzió
    logger.warning(f"Could not get APP_VERSION from settings. Using fallback '{APP_VERSION_FOR_CACHE}' for cache keys.")

# --- Cache Konfiguráció (Példa, ha nem csak a settings-ből jön) ---
STOCK_DATA_CACHE_VERSION: Final[str] = "v3.6.2" # Ez specifikusan az adatstruktúra verziója lehet

# --- Cache Kulcs Generátor ---
# Ez a függvény inkább a _base_helpers.py-ba való, mert specifikusan a fetcherekhez kapcsolódik.
# De ha itt akarod tartani, az is működhet, csak a hivatkozásokat kell módosítani.
# Én javaslom ennek áthelyezését a _base_helpers.py-ba (ha még nincs ott valami hasonló).
# def get_stock_cache_key(symbol: str) -> str: ...

# === Cache Status Enum (EZT KELL HOZZÁADNI!) ===
class CacheStatus(Enum):
    """A cache műveletek lehetséges kimeneteleit reprezentáló Enum."""
    HIT_VALID = auto()      # Sikeres találat, érvényes adat
    HIT_FAILED = auto()     # Találat, de hibajelzőt tartalmaz
    HIT_INVALID = auto()    # Találat, de az adat érvénytelen/sérült
    MISS = auto()           # Nincs találat a cache-ben
    INIT_ERROR = auto()     # Hiba a cache státusz meghatározása során
    DISABLED = auto()       # Cache funkció ki van kapcsolva
# ================================================

# --- Egyéb Konstansok (ha vannak) ---
DEFAULT_NA_VALUE: Final[str] = "N/A"
OHLCV_REQUIRED_COLS_YF: Final[List[str]] = ['open', 'high', 'low', 'close', 'volume'] # yfinance specifikus

# --- Modul Betöltési Log ---
logger.info(f"--- Core Constants Module (v1.0 with CacheStatus) loaded successfully. ---")