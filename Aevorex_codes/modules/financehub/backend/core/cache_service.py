# backend/core/cache_service.py
"""
Aszinkron, Redis-alapú gyorsítótár szolgáltatás osztályként implementálva.

Mechanizmusokat biztosít a gyorsítótárazott adatok hatékony tárolására,
lekérésére és kezelésére Redis háttérrel. Támogatja a kulcsonkénti TTL
(Time-To-Live) beállítást és egy Redis-alapú elosztott zárolási mechanizmust
az adatlekérési műveletek szinkronizálásához több folyamat között.

Használat:
    # Feltételezi, hogy a settings már betöltődött és a Redis fut
    # Removed circular import: from modules.financehub.backend.core.cache_service import CacheService
    cache_service = await CacheService.create() # Aszinkron inicializálás!

    await cache_service.set("my_key", {"data": 1}, timeout_seconds=60)
    data = await cache_service.get("my_key")

    # Elosztott zár használata
    lock = cache_service.get_lock("FETCH_AAPL_DATA", timeout=120) # 120s lock TTL
    async with lock:
        # Kritikus szakasz: csak egy folyamat/task futtatja ezt egyszerre
        # ... adatlekérés és cache-be írás ...
        pass # A zár automatikusan feloldódik

Megjegyzés:
    - Az adatok JSON formátumban szerializálódnak a Redisben tárolás előtt.
    - A zárolás a redis-py beépített Lock implementációját használja.
"""

import asyncio
import json
import sys
from typing import Optional, Any, Final, Union

# --- Redis és Asyncio Importok ---
try:
    import redis.asyncio as aioredis
    from redis.exceptions import RedisError, ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
except ImportError:
    print("FATAL ERROR: 'redis' library not found. Please install it: pip install redis>=4.2", file=sys.stderr)
    sys.exit(1) # Kilépés, mert a szolgáltatás nem működhet

# --- Konfiguráció és Logger Import ---
try:
    from modules.financehub.backend.config import settings # Központi konfiguráció
    from modules.financehub.backend.utils.logger_config import get_logger # Konfigurált logger lekérő
except ImportError as e:
    print(f"FATAL ERROR: Could not import config/logger in cache_service: {e}. Check project structure.", file=sys.stderr)
    raise RuntimeError("CacheService failed to initialize due to missing config/logger.") from e

logger = get_logger(__name__)
MODULE_PREFIX = "[CacheService(Redis)]"

# --- Konstansok ---
DEFAULT_TTL_FALLBACK: Final[int] = 900
DEFAULT_LOCK_TTL_FALLBACK: Final[int] = 120
DEFAULT_LOCK_RETRY_DELAY_FALLBACK: Final[float] = 0.5
# Max size itt már nem releváns, Redis kezeli a memóriát.

class CacheService:
    """
    Aszinkron, Redis-alapú gyorsítótárat kezel TTL-lel és elosztott zárolással.

    Attributes:
        default_ttl (int): Alapértelmezett TTL másodpercben.
        lock_ttl (int): Alapértelmezett TTL a záraknak másodpercben.
        lock_retry_delay (float): Várakozási időköz (másodpercben) blokkoló
                                  zár megszerzési kísérletek között.
        redis_client (aioredis.Redis): Aszinkron Redis kliens példány.
        _pool (aioredis.ConnectionPool): Redis kapcsolat pool.
    """

    # __init__ privát, a példányosításhoz használd az `async def create()` metódust
    def __init__(self, redis_client: aioredis.Redis, connection_pool: aioredis.ConnectionPool):
        """Privát inicializáló. Használd a `create` classmethod-ot."""
        self.redis_client = redis_client
        self._pool = connection_pool # Elmentjük a pool-t a későbbi bezáráshoz

        # TTL és Lock beállítások betöltése (a create már validálta)
        self.default_ttl: int = getattr(settings.CACHE, 'DEFAULT_TTL_SECONDS', DEFAULT_TTL_FALLBACK)
        self.lock_ttl: int = getattr(settings.CACHE, 'LOCK_TTL_SECONDS', DEFAULT_LOCK_TTL_FALLBACK)
        self.lock_retry_delay: float = getattr(settings.CACHE, 'LOCK_RETRY_DELAY_SECONDS', DEFAULT_LOCK_RETRY_DELAY_FALLBACK)
        # Max size itt már nem releváns
        logger.info(f"{MODULE_PREFIX} Instance configured with Default TTL: {self.default_ttl}s, Lock TTL: {self.lock_ttl}s, Lock Retry Delay: {self.lock_retry_delay}s.")

    @classmethod
    async def create(cls) -> 'CacheService':
        """
        Aszinkron factory metódus a CacheService példány létrehozására és
        a Redis kapcsolat inicializálására.

        Returns:
            Inicializált CacheService példány.

        Raises:
            RuntimeError: Ha a Redis kapcsolat nem hozható létre.
        """
        logger.info(f"{MODULE_PREFIX} Initializing Redis connection...")
        try:
            redis_host = settings.REDIS.HOST
            redis_port = settings.REDIS.PORT
            redis_db = settings.REDIS.DB_CACHE # Fontos: A Cache DB-t használjuk!
            connect_timeout = settings.REDIS.CONNECT_TIMEOUT_SECONDS # Tegyük fel, hogy ez létezik a configban (pl. 3-5 másodperc)
            socket_op_timeout = settings.REDIS.SOCKET_TIMEOUT_SECONDS # Tegyük fel, hogy ez is létezik (pl. 3-5 másodperc)

            logger.debug(f"{MODULE_PREFIX} Attempting to create ConnectionPool with connect_timeout={connect_timeout}s, socket_timeout={socket_op_timeout}s")

            # Kapcsolat Pool létrehozása
            # decode_responses=True megkönnyíti a get műveletet, stringet ad vissza
            pool = aioredis.ConnectionPool(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                max_connections=50,
                socket_connect_timeout=connect_timeout, # << ÚJ
                socket_timeout=socket_op_timeout      # << ÚJ (ez vonatkozik majd pl. a ping-re is)
            )
            redis_client = aioredis.Redis(connection_pool=pool)

            # Kapcsolat tesztelése PING paranccsal
            await redis_client.ping()
            logger.info(f"{MODULE_PREFIX} Redis connection successful to {redis_host}:{redis_port} (DB: {redis_db}).")

            # Példány létrehozása a klienssel és pool-lal
            instance = cls(redis_client, pool)
            return instance

        except RedisConnectionError as e:
            logger.critical(f"{MODULE_PREFIX} FATAL: Could not connect to Redis at {settings.REDIS.HOST}:{settings.REDIS.PORT} (DB: {settings.REDIS.DB_CACHE}). Error: {e}", exc_info=True)
            raise RuntimeError(f"Failed to connect to Redis backend: {e}") from e
        except RedisError as e:
            logger.critical(f"{MODULE_PREFIX} FATAL: Redis error during initialization (e.g., PING failed). Error: {e}", exc_info=True)
            raise RuntimeError(f"Redis backend initialization failed: {e}") from e
        except AttributeError as e:
            logger.critical(f"{MODULE_PREFIX} FATAL: Missing Redis configuration in settings (settings.REDIS.HOST/PORT/DB_CACHE). Error: {e}", exc_info=True)
            raise RuntimeError(f"Missing Redis configuration: {e}") from e
        except Exception as e:
            logger.critical(f"{MODULE_PREFIX} FATAL: Unexpected error during CacheService initialization: {e}", exc_info=True)
            raise RuntimeError(f"Unexpected error initializing CacheService: {e}") from e

    async def close(self):
        """Bezárja a Redis kapcsolat pool-t."""
        logger.info(f"{MODULE_PREFIX} Closing Redis connection pool...")
        try:
            await self._pool.disconnect()
            logger.info(f"{MODULE_PREFIX} Redis connection pool closed successfully.")
        except Exception as e:
            logger.error(f"{MODULE_PREFIX} Error closing Redis connection pool: {e}", exc_info=True)

    # --- ZÁROLÁSI MECHANIZMUS (Redis Lock) ---
    def get_lock(self, resource_id: str, timeout: Optional[Union[int, float]] = None, blocking_timeout: Optional[Union[int, float]] = None) -> aioredis.lock.Lock:
        """
        Létrehoz egy elosztott Redis zárat egy adott erőforrás azonosítóhoz.

        A hívó fél felelős a zár kontextuskezelővel (`async with`) vagy manuális
        `acquire`/`release` hívásokkal történő használatáért.

        Args:
            resource_id: Az egyedi azonosító (kulcs), amihez a zár tartozik.
                         Ez lesz a zár neve a Redisben.
            timeout: Mennyi ideig legyen érvényes a zár másodpercben, miután
                     megszerezték (automatikus feloldás ennyi idő után).
                     Ha None, a konfigurált `self.lock_ttl`-t használja.
            blocking_timeout: Mennyi ideig várjon (másodpercben) a zár megszerzésére,
                              ha az foglalt. Ha None vagy 0, nem blokkol (azonnal
                              visszatér False-szal az acquire, ha foglalt).
                              Ha pozitív szám, addig vár. Ha negatív (nem ajánlott),
                              végtelenségig várhat.

        Returns:
            Egy `redis.asyncio.lock.Lock` példány, amely használatra kész.
        """
        lock_name = f"lock:{resource_id}" # Javasolt prefix a lock kulcsokhoz
        effective_timeout = timeout if timeout is not None else self.lock_ttl
        # A redis-py Lock `blocking_timeout=None` esetén sem blokkol végtelenül,
        # a 0 jelenti a nem blokkolót. A mi retry_delay-ünket itt nem közvetlenül használjuk,
        # a Lock belső logikája kezeli a várakozást.
        # Ha None-t kap, az lehet a default viselkedés (ami lehet blokkoló),
        # ezért explicit 0-t adunk a nem blokkoló esethez, ha ez a szándék.
        effective_blocking_timeout = blocking_timeout # A hívó dönti el, várjon-e

        logger.debug(f"{MODULE_PREFIX} Creating Redis lock object for resource: '{resource_id}' (Lock name: '{lock_name}', Timeout: {effective_timeout}s, Blocking Timeout: {effective_blocking_timeout})")

        # Létrehozunk egy ÚJ lock objektumot minden híváskor. Ez a redis-py ajánlott használata.
        # A lock állapotát a Redis szerver tárolja.
        return self.redis_client.lock(
            name=lock_name,
            timeout=effective_timeout,
            blocking_timeout=effective_blocking_timeout
            # sleep=self.lock_retry_delay # Ezt a Lock belsőleg kezeli, nem kell expliciten átadni általában
        )

    # --- CACHE MŰVELETEK ---
    async def get(self, key: str) -> Optional[Any]:
        """
        Adatot kér le a Redis cache-ből. Automatikusan deszerializálja a JSON adatot.

        Args:
            key: A keresendő cache kulcs.

        Returns:
            A deszerializált adat (pl. dict, list, str, int), ha a kulcs létezik,
            egyébként None. Visszaad None-t Redis hiba vagy deszerializációs
            hiba esetén is.
        """
        log_prefix = f"{MODULE_PREFIX} [GET:{key}]"
        logger.debug(f"{log_prefix} Request received.")
        try:
            # A decode_responses=True miatt stringet kapunk vissza, vagy None-t
            result_str: Optional[str] = await self.redis_client.get(key)

            if result_str is None:
                logger.info(f"{log_prefix} Cache MISS.")
                return None
            else:
                logger.info(f"{log_prefix} Cache HIT.")
                # JSON deszerializálás
                try:
                    deserialized_value = json.loads(result_str)
                    logger.debug(f"{log_prefix} Successfully deserialized JSON data.")
                    # Nincs szükség deepcopy-ra, a json.loads új objektumot hoz létre
                    return deserialized_value
                except json.JSONDecodeError as e:
                    logger.error(f"{log_prefix} Failed to deserialize JSON data from Redis. Data might be corrupted. Error: {e}. Raw data: '{result_str[:150]}...'")
                    # Lehetne itt törölni a hibás kulcsot: await self.redis_client.delete(key)
                    return None # Hibás adatot nem adunk vissza

        except RedisTimeoutError:
            logger.warning(f"{log_prefix} Redis command timed out.")
            return None
        except RedisConnectionError as e:
            logger.error(f"{log_prefix} Redis connection error: {e}", exc_info=True)
            return None
        except RedisError as e:
            logger.error(f"{log_prefix} Redis error during GET operation: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.exception(f"{log_prefix} Unexpected error during GET operation: {e}")
            return None

    async def set(self, key: str, value: Any, timeout_seconds: Optional[int] = None) -> bool:
        """
        Adatot tárol a Redis cache-ben, JSON formátumban, megadott vagy
        alapértelmezett TTL-lel.

        Args:
            key: A cache kulcs.
            value: A gyorsítótárazandó adat (JSON szerializálhatónak kell lennie).
            timeout_seconds: Élettartam másodpercben. Ha None vagy <= 0,
                             az alapértelmezett `self.default_ttl`-t használja.

        Returns:
            True, ha a beállítás sikeres volt, False egyébként (pl. Redis hiba,
            szerializációs hiba).
        """
        log_prefix = f"{MODULE_PREFIX} [SET:{key}]"
        effective_ttl = self._resolve_ttl(timeout_seconds, key)
        logger.debug(f"{log_prefix} Request received. Effective TTL: {effective_ttl}s.")

        try:
            # JSON szerializálás
            serialized_value = json.dumps(value)
            logger.debug(f"{log_prefix} Data successfully serialized to JSON.")

        except TypeError as e:
            # Az objektum nem szerializálható JSON-ba
            logger.error(f"{log_prefix} Failed to serialize value to JSON. Caching skipped. Error: {e}. Value type: {type(value).__name__}", exc_info=False)
            return False
        except Exception as e:
            logger.error(f"{log_prefix} Unexpected error during JSON serialization for key '{key}': {e}", exc_info=True)
            return False

        try:
            # Adat beállítása Redisben TTL-lel (`ex` paraméter)
            result = await self.redis_client.set(key, serialized_value, ex=effective_ttl)
            if result: # Sikeres SET esetén általában True (vagy OK string) a válasz
                logger.info(f"{log_prefix} Cache SET successful. TTL: {effective_ttl}s.")
                return True
            else:
                # Ez ritka, de jelezhet problémát a Redis szerver oldalon
                logger.warning(f"{log_prefix} Redis SET command returned a non-successful status (result: {result}).")
                return False

        except RedisTimeoutError:
            logger.warning(f"{log_prefix} Redis command timed out.")
            return False
        except RedisConnectionError as e:
            logger.error(f"{log_prefix} Redis connection error: {e}", exc_info=True)
            return False
        except RedisError as e:
            logger.error(f"{log_prefix} Redis error during SET operation: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.exception(f"{log_prefix} Unexpected error during SET operation: {e}")
            return False

    def _resolve_ttl(self, timeout_seconds: Optional[int], key_for_log: str) -> int:
        """Belső segédfüggvény az effektív TTL meghatározására."""
        # Ez a függvény változatlan maradhat a memóriás verzióból
        if timeout_seconds is not None and isinstance(timeout_seconds, int) and timeout_seconds > 0:
            logger.debug(f"Using provided TTL {timeout_seconds}s for key '{key_for_log}'.")
            return timeout_seconds
        else:
            if timeout_seconds is not None:
                 logger.warning(f"Invalid TTL ({timeout_seconds}) provided for key '{key_for_log}'. Using default TTL: {self.default_ttl}s.")
            else:
                 logger.debug(f"No TTL provided for key '{key_for_log}'. Using default TTL: {self.default_ttl}s.")
            return self.default_ttl

    async def delete(self, key: str) -> bool:
        """Töröl egy kulcsot a Redis cache-ből."""
        log_prefix = f"{MODULE_PREFIX} [DELETE:{key}]"
        logger.debug(f"{log_prefix} Request received.")
        try:
            # A delete 0-t ad vissza, ha a kulcs nem létezett, 1-et (vagy többet, ha több kulcsot adunk meg), ha sikeresen törölt.
            deleted_count = await self.redis_client.delete(key)
            if deleted_count > 0:
                logger.info(f"{log_prefix} Successfully deleted key.")
                return True
            else:
                logger.info(f"{log_prefix} Key not found, nothing to delete.")
                return False # Vagy True, attól függően, mit tekintünk "sikernek"
        except RedisError as e:
             logger.error(f"{log_prefix} Redis error during DELETE operation: {e}", exc_info=True)
             return False
        except Exception as e:
            logger.exception(f"{log_prefix} Unexpected error during DELETE operation: {e}")
            return False

    async def clear(self) -> bool:
        """
        Törli a **teljes jelenleg kiválasztott Redis adatbázist**!
        HASZNÁLD ÓVATOSAN! Csak akkor, ha a cache dedikált DB-t használ.
        """
        db_num = self.redis_client.connection_pool.connection_kwargs.get('db', 'N/A')
        logger.warning(f"{MODULE_PREFIX} Attempting to CLEAR/FLUSH entire Redis database: {db_num}! This is irreversible.")
        try:
            result = await self.redis_client.flushdb()
            if result: # Általában True, ha sikeres
                logger.info(f"{MODULE_PREFIX} Successfully flushed Redis database: {db_num}.")
                return True
            else:
                 logger.warning(f"{MODULE_PREFIX} FLUSHDB command returned non-successful status for DB: {db_num}.")
                 return False
        except RedisError as e:
             logger.error(f"{MODULE_PREFIX} Redis error during FLUSHDB operation for DB {db_num}: {e}", exc_info=True)
             return False
        except Exception as e:
            logger.exception(f"{MODULE_PREFIX} Unexpected error during FLUSHDB operation for DB {db_num}: {e}")
            return False

    async def get_size(self) -> Optional[int]:
        """Visszaadja a kulcsok számát a jelenlegi Redis adatbázisban."""
        db_num = self.redis_client.connection_pool.connection_kwargs.get('db', 'N/A')
        logger.debug(f"{MODULE_PREFIX} Requesting size (DBSIZE) of Redis database: {db_num}.")
        try:
            size = await self.redis_client.dbsize()
            logger.debug(f"{MODULE_PREFIX} Redis DBSIZE for DB {db_num}: {size}")
            return size
        except RedisError as e:
            logger.error(f"{MODULE_PREFIX} Redis error during DBSIZE operation for DB {db_num}: {e}", exc_info=True)
            return None
        except Exception as e:
            logger.exception(f"{MODULE_PREFIX} Unexpected error during DBSIZE operation for DB {db_num}: {e}")
            return None


# =============================================================================
# Modul Betöltésének Jelzése
# =============================================================================
logger.info(f"--- Cache Service ({__name__}) loaded. Backend: Redis (pending initialization via create()) ---")