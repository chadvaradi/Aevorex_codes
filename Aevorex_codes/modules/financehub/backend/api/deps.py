# backend/api/deps.py
"""
API Függőségek és Életciklus Kezelés (Redis Cache verzió)

Ez a modul felelős a FastAPI alkalmazás életciklusa során használt megosztott
erőforrások (singletonok) inicializálásáért, leállításáért és a kérések
során történő biztonságos átadásáért (Dependency Injection).

Fő komponensek:
- `lifespan_manager`: Aszinkron kontextuskezelő, amely az alkalmazás indulásakor
  létrehozza, a leállásakor pedig bezárja a globális HTTP klienst és a Redis-alapú
  CacheService példányt.
- Függőség függvények (`get_http_client`, `get_cache_service`, stb.):
  Ezeket használják az API végpontok a megosztott erőforrások példányainak
  biztonságos lekérésére egy adott kérés kontextusában.
"""

import httpx
import asyncio
from contextlib import asynccontextmanager
from fastapi import Request, HTTPException, Depends, FastAPI, status
from typing import Optional, AsyncGenerator, Any
import sys

# --- Core Szolgáltatások Importálása ---
# A CacheService Redis-alapú implementáció
from ..core.cache_service import CacheService
from ..core.chat.context_manager import InMemoryHistoryManager, AbstractHistoryManager # Ha még használatban van

# --- Konfiguráció és Logger Import ---
try:
    from ..config import settings
    from ..utils.logger_config import get_logger
except ImportError as e:
    # Kritikus hiba, ha a config/logger nem érhető el
    print(f"FATAL ERROR [deps.py]: Could not import config/logger: {e}. Check project structure.", file=sys.stderr)
    raise RuntimeError("API Dependencies module failed to initialize due to missing config/logger.") from e

logger = get_logger("aevorex_finbot_api.deps") # Specifikus logger a modulhoz

# --- Globális Singleton Példányok (Lifespan Kezeli) ---
# Ezeket a változókat CSAK a lifespan_manager módosíthatja.
# A dependency függvények ezeket olvassák.
_http_client_instance: Optional[httpx.AsyncClient] = None
_cache_service_instance: Optional[CacheService] = None
_history_manager_instance: Optional[AbstractHistoryManager] = None # Ha szükséges

# =============================================================================
# === ALKALMAZÁS ÉLETCIKLUS KEZELŐ (LIFESPAN MANAGER) ===
# =============================================================================

@asynccontextmanager
async def lifespan_manager(app: FastAPI):
    """
    Aszinkron kontextuskezelő a FastAPI alkalmazás életciklusához.

    Induláskor:
        1. Inicializálja a globális HTTP klienst.
        2. Inicializálja a Redis cache szolgáltatást és a CacheService példányt.
        3. Opcionálisan inicializál más globális erőforrásokat (pl. HistoryManager).
    Leállításkor:
        1. Lezárja a CacheService kapcsolatát.
        2. Lezárja a globális HTTP klienst.
        3. Opcionálisan lezár más globális erőforrásokat.
    """
    global _http_client_instance, _cache_service_instance, _history_manager_instance
    logger.info("[Lifespan] Startup sequence initiated: Initializing global resources...")
    # Initialize app.state if it doesn't exist (though FastAPI usually does)
    if not hasattr(app, 'state'):
        app.state = type('AppState', (), {})() # Create a simple namespace object for app.state

    resources_initialized = {"http_client": False, "cache_service": False, "history_manager": False}
    # Initialize attributes on app.state to None or a default value
    # This ensures they exist even if initialization fails later
    app.state.http_client = None
    app.state.cache_service = None
    app.state.history_manager = None

    try:
        # --- 1. HTTP Kliens Inicializálása ---
        logger.debug("[Lifespan] Initializing global HTTP client...")
        try:
            timeout = httpx.Timeout(
                settings.HTTP_CLIENT.REQUEST_TIMEOUT_SECONDS,
                connect=settings.HTTP_CLIENT.CONNECT_TIMEOUT_SECONDS,
                pool=settings.HTTP_CLIENT.POOL_TIMEOUT_SECONDS
            )
            limits = httpx.Limits(
                max_connections=settings.HTTP_CLIENT.MAX_CONNECTIONS,
                max_keepalive_connections=settings.HTTP_CLIENT.MAX_KEEPALIVE_CONNECTIONS
            )
            headers = {
                "User-Agent": settings.HTTP_CLIENT.USER_AGENT,
                "Referer": str(settings.HTTP_CLIENT.DEFAULT_REFERER)
            }
            _http_client_instance = httpx.AsyncClient(timeout=timeout, limits=limits, headers=headers, http2=True, follow_redirects=True)
            app.state.http_client = _http_client_instance # ASSIGN TO APP.STATE
            logger.info("[Lifespan] Global httpx.AsyncClient initialized and assigned to app.state.http_client.")
            resources_initialized["http_client"] = True
        except Exception as e:
            logger.critical(f"[Lifespan] CRITICAL FAILURE: HTTP Client initialization failed: {e}", exc_info=True)
            _http_client_instance = None # Hiba esetén None
            app.state.http_client = None # Ensure it's None on failure

        # --- 2. Redis-based CacheService Inicializálása ---
        if resources_initialized["http_client"]: # Csak ha az előző sikeres volt
             logger.debug("[Lifespan] Initializing global Redis-based CacheService...")
             try:
                 # Az aszinkron create metódus hívása Redis-alapú cache-hez
                 _cache_service_instance = await CacheService.create()
                 app.state.cache_service = _cache_service_instance # ASSIGN TO APP.STATE
                 logger.info("[Lifespan] Global Redis-based CacheService initialized and assigned to app.state.cache_service.")
                 resources_initialized["cache_service"] = True
             except Exception as e:
                 logger.critical(f"[Lifespan] CRITICAL FAILURE: CacheService initialization failed: {e}")
                 _cache_service_instance = None # Hiba esetén None
                 app.state.cache_service = None # Ensure it's None on failure

        # --- 3. History Manager Inicializálása (ha kell) ---
        if resources_initialized["cache_service"]: # Csak ha az előzőek sikeresek
             logger.debug("[Lifespan] Initializing global HistoryManager...")
             try:
                 _history_manager_instance = InMemoryHistoryManager() # Vagy más implementáció
                 app.state.history_manager = _history_manager_instance # ASSIGN TO APP.STATE
                 logger.info(f"[Lifespan] Global {_history_manager_instance.__class__.__name__} instance created and assigned to app.state.history_manager.")
                 resources_initialized["history_manager"] = True
             except Exception as e:
                 logger.critical(f"[Lifespan] CRITICAL FAILURE initializing History Manager: {e}", exc_info=True)
                 _history_manager_instance = None
                 app.state.history_manager = None # Ensure it's None on failure

        # --- Vezérlés átadása az alkalmazásnak ---
        # Csak akkor yield-elünk, ha a legfontosabbak (HTTP, Cache) sikeresek
        if resources_initialized["http_client"] and resources_initialized["cache_service"]:
            logger.info("[Lifespan] Core resources initialized. Yielding control to application.")
            yield # Alkalmazás futása
            logger.info("[Lifespan] Shutdown sequence initiated: Cleaning up global resources...")
        else:
            logger.critical("[Lifespan] CRITICAL FAILURE during startup resource initialization. Application might not function correctly.")
            # Hibás indulás esetén is futtatni kell a cleanup-ot arra, ami elindult!
            yield # Vagy dobhatnánk kivételt, de a cleanup így is lefut
            logger.warning("[Lifespan] Shutdown sequence initiated after failed startup.")

    finally:
        # --- Leállítási Logika (Fordított Sorrendben) ---
        # Ez a blokk HIBÁS INDULÁS UTÁN IS LEFUT!

        # 3. History Manager
        if hasattr(app.state, 'history_manager') and app.state.history_manager: # Check app.state first
             logger.debug(f"[Lifespan] Clearing app.state.history_manager reference.")
             app.state.history_manager = None
        if _history_manager_instance: # Also clear the global, though app.state is primary for access
             _history_manager_instance = None


        # 2. Cache Service Lezárása (Redis-based cache cleanup)
        if hasattr(app.state, 'cache_service') and app.state.cache_service: # Check app.state first
             logger.info("[Lifespan] Cleaning up CacheService (from app.state)...")
             try:
                 # CacheService cleanup
                 await app.state.cache_service.close()
                 logger.info("[Lifespan] CacheService cleanup completed.")
             except Exception as e:
                 logger.error(f"[Lifespan] Error during CacheService cleanup: {e}")
             finally:
                 app.state.cache_service = None # Reset app.state reference
        if _cache_service_instance: # Also clear the global
             _cache_service_instance = None

        # 1. HTTP Kliens Lezárása
        if hasattr(app.state, 'http_client') and app.state.http_client: # Check app.state first
             logger.info("[Lifespan] Closing HTTP Client (from app.state)...")
             try:
                 await app.state.http_client.aclose()
                 logger.info("[Lifespan] HTTP Client (from app.state) closed successfully.")
             except Exception as e:
                 logger.error(f"[Lifespan] Error closing HTTP Client (from app.state) during shutdown: {e}", exc_info=True)
             finally:
                 app.state.http_client = None # Reset app.state reference
        if _http_client_instance: # Also clear the global
             _http_client_instance = None

        logger.info("[Lifespan] Resource cleanup finished.")

# =============================================================================
# === FÜGGŐSÉG INJEKTÁLÁSI FÜGGVÉNYEK ===
# =============================================================================

async def get_http_client(request: Request) -> httpx.AsyncClient:
    """
    FastAPI Függőség: Visszaadja a globálisan inicializált HTTP klienst.

    Raises:
        HTTPException(503): Ha a kliens nem érhető el (inicializálási hiba).
    """
    # Check app.state first, then fallback to global
    if hasattr(request.app.state, 'http_client') and request.app.state.http_client is not None:
        return request.app.state.http_client
    elif _http_client_instance is not None:
        return _http_client_instance
    else:
        logger.critical("[Dependency Error] HTTP Client requested but is unavailable (lifespan issue?).")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HTTP Client service is temporarily unavailable. Please try again later."
        )

async def get_cache_service() -> CacheService:
    """
    FastAPI Függőség: Visszaadja a globálisan inicializált CacheService példányt.

    Returns:
        CacheService: Az inicializált cache szolgáltatás.

    Raises:
        HTTPException(503): Ha a cache szolgáltatás nem érhető el.
    """
    if _cache_service_instance is not None:
        return _cache_service_instance
    else:
        logger.critical("[Dependency Error] CacheService requested but is unavailable (lifespan issue?).")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cache service is temporarily unavailable. Please try again later."
        )

# --- History Manager Függőség (Ha Szükséges) ---
async def get_history_manager() -> AbstractHistoryManager:
    """
    FastAPI Függőség: Visszaadja a globálisan inicializált History Manager példányt.

    Raises:
        HTTPException(503): Ha a History Manager nem érhető el (inicializálási hiba).
    """
    if _history_manager_instance is None: # This still checks the global instance for DI
         logger.critical("[Dependency Error] History Manager requested but is unavailable (lifespan issue?).")
         raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="History management service is unavailable."
        )
    return _history_manager_instance

# --- Egyéb Függőségek (Példa: Szimbólum Validálás) ---
async def validate_symbol(symbol: str) -> str:
    """FastAPI Függőség: Alapvető validáció ticker szimbólumra."""
    if not symbol or not isinstance(symbol, str) or not symbol.isalnum() or len(symbol) > 10:
        logger.warning(f"[Dependency Validation] Invalid symbol received: '{symbol}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, # 400 helyett 422 is lehetne
            detail=f"Invalid stock symbol format provided: '{symbol}'. Expected alphanumeric, max 10 chars."
        )
    return symbol.upper()

# =============================================================================
# Modul Betöltés Jelzése
# =============================================================================
logger.info(f"--- API Dependencies module ({__name__}) loaded. Lifespan and dependencies configured for Redis Cache. ---")