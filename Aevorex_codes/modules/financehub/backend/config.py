"""
Aevorex FinBot Backend konfigurációs modul.
Ez a modul tartalmazza az alkalmazás összes beállítását és validációját.
"""

import os
import sys
from pathlib import Path as _Path
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Union, Tuple
from pydantic import Field, BaseModel, validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic.types import SecretStr, PositiveInt, NonNegativeInt, PositiveFloat, NonNegativeFloat, DirectoryPath
from pydantic_core import ValidationError
from pydantic.networks import AnyHttpUrl

# ---------------------------------------------------------------------------
# Minimal *self-contained* PYTHONPATH bootstrap.  This file is imported very
# early (even before ``modules/__init__.py`` has a chance to execute) when
# Uvicorn loads the ASGI app via ``main.py``.  If the working directory is the
# `backend/` folder, the monorepo roots *may* be missing from ``sys.path`` and
# therefore the import below (`modules.shared.ai.model_catalogue`) would fail
# with ``ModuleNotFoundError``.
# ---------------------------------------------------------------------------
import sys
from pathlib import Path

_this_file = Path(__file__).resolve()
_aevorex_root = next((p for p in _this_file.parents if p.name == "Aevorex_codes"), None)
if _aevorex_root and str(_aevorex_root) not in sys.path:
    sys.path.insert(0, str(_aevorex_root))
    # Also insert the workspace root (parent of Aevorex_codes) for absolute
    # imports like ``import model_catalogue`` or local utilities at repo root.
    _workspace_root = _aevorex_root.parent
    if str(_workspace_root) not in sys.path:
        sys.path.insert(0, str(_workspace_root))
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Ensure project root (that contains the top-level ``modules`` folder) is on
# ``sys.path`` *before* any other intra-repo imports occur.  This avoids
# early-import errors like ``ModuleNotFoundError: modules.shared.ai`` when the
# backend is executed from a subdirectory (e.g. ``cd modules/financehub/backend``).
# ---------------------------------------------------------------------------

# The backend module path is: <...>/Aevorex_codes/modules/financehub/backend/config.py
# We need to ascend *three* levels to reach the monorepo sub-root ``Aevorex_codes``
# that contains the top-level ``modules`` package:
#   0. backend/
#   1. financehub/
#   2. modules/
#   3. Aevorex_codes/   <— desired path
# Using only two levels (``parents[2]``) would stop at ``modules`` and miss the
# repository-level utilities such as ``model_catalogue.py``. Therefore we climb
# **three** levels here.
_proj_root_candidate = _Path(__file__).resolve().parents[3]  # → Aevorex_codes
if _proj_root_candidate.is_dir() and str(_proj_root_candidate) not in sys.path:
    sys.path.insert(0, str(_proj_root_candidate))

# Ensure root of monorepo (one level above Aevorex_codes) is also on sys.path so that
# top-level modules like ``model_catalogue`` can be imported without fully-qualified
# package prefixes even when the backend is launched from a deep subdirectory.
_root_repo_candidate = _proj_root_candidate.parent  # e.g. <workspace-root>
if _root_repo_candidate.is_dir() and str(_root_repo_candidate) not in sys.path:
    sys.path.insert(0, str(_root_repo_candidate))

# Logging beállítás - az első dolog, amit el kell végezni
_LOG_LEVEL_OPTIONS = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG']

class FinBotConfigLogger:
    """Konfiguráció-specifikus logger kezelő."""
    
    def __init__(self, initial_level: str = "DEBUG"):
        self.logger = logging.getLogger("FinBotConfig")
        self._setup_initial_logging(initial_level)
        self.logger.debug(f"FinBotConfig initial logger level set to: {initial_level}")
        
    def _setup_initial_logging(self, level_str: str):
        """Kezdeti logging beállítás."""
        level = getattr(logging, level_str.upper(), logging.DEBUG)
        
        # Ellenőrizzük, hogy már van-e handler
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s:%(lineno)d - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        self.logger.setLevel(level)
        
    def get_logger(self):
        return self.logger

# Globális logger példány
_config_logger = FinBotConfigLogger()
logger = _config_logger.get_logger()

def get_project_root() -> Path:
    """
    Automatikusan meghatározza a projekt gyökérkönyvtárát.
    A backend/config.py fájl alapján dolgozik.
    """
    logger.debug("Resolving project root. Config file path: %s", __file__)
    
    current_file = Path(__file__).resolve()
    parent_dir = current_file.parent
    
    logger.debug("Parent (expected 'backend') directory: %s", parent_dir)
    
    # Két szinttel feljebb megy: backend -> financehub -> modules -> Aevorex_codes
    if parent_dir.name == 'backend':
        # backend -> financehub -> modules -> Aevorex_codes
        project_root_candidate = parent_dir.parent.parent.parent
    else:
        logger.warning("Expected to be in 'backend' directory, but found '%s'. Using parent.parent.parent anyway.", parent_dir.name)
        project_root_candidate = parent_dir.parent.parent.parent
    
    logger.debug("Deduced project root candidate: %s", project_root_candidate)
    
    # Ellenőrzés: létezik-e a gyökérkönyvtár és vannak-e benne a tipikus projekt fájlok
    env_file_exists = (project_root_candidate / '.env').exists()
    pyproject_exists = (project_root_candidate / 'pyproject.toml').exists()
    
    logger.debug("Project root checks: .env exists: %s, pyproject.toml exists: %s", env_file_exists, pyproject_exists)
    
    if not env_file_exists and not pyproject_exists:
        logger.warning("Project root structure hint: Neither '.env' nor 'pyproject.toml' found in the deduced project root: %s. Ensure this is the intended root directory.", project_root_candidate)
    
    logger.info("Project root successfully determined: %s", project_root_candidate)
    return project_root_candidate

# Projekt gyökér meghatározása
_PROJECT_ROOT_PATH = get_project_root()

def _parse_env_list_str_utility(
    v: Any, field_name_for_log: str, lowercase_items: bool = False
) -> List[str]:
    """
    Segédfüggvény egy environment variable string listájának feldolgozásához.
    Támogatja a JSON formátumot és a vesszővel elválasztott stringeket is.
    """
    if v is None:
        return []
    
    if isinstance(v, list):
        processed_list = [str(item).lower().strip() if lowercase_items else str(item).strip() for item in v]
        logger.debug(f"Field '{field_name_for_log}': Already a list, processed to: {processed_list}")
        return processed_list
    
    if isinstance(v, str):
        v_stripped = v.strip()
        if not v_stripped:
            logger.debug(f"Field '{field_name_for_log}': Empty string provided, returning empty list.")
            return []
        
        # JSON formátum próbálkozás
        if v_stripped.startswith('[') and v_stripped.endswith(']'):
            try:
                parsed_json = json.loads(v_stripped)
                if isinstance(parsed_json, list):
                    processed_list = [str(item).lower().strip() if lowercase_items else str(item).strip() for item in parsed_json]
                    logger.debug(f"Field '{field_name_for_log}': Parsed as JSON list: {processed_list}")
                    return processed_list
            except json.JSONDecodeError as e:
                logger.warning(f"Field '{field_name_for_log}': JSON parsing failed: {e}. Falling back to comma-separated parsing.")
        
        # Vesszővel elválasztott lista
        split_items = [item.strip() for item in v_stripped.split(',') if item.strip()]
        processed_list = [item.lower() if lowercase_items else item for item in split_items]
        logger.debug(f"Field '{field_name_for_log}': Parsed as comma-separated list: {processed_list}")
        return processed_list
    
    # Egyéb típusokra string konverzió
    logger.warning(f"Field '{field_name_for_log}': Unexpected type {type(v)}, converting to string and treating as single item.")
    single_item = str(v).lower().strip() if lowercase_items else str(v).strip()
    return [single_item] if single_item else []

class FileProcessingSettings(BaseModel):
    """Beállítások a feltöltött fájlok feldolgozásához."""
    MAX_SIZE_BYTES: PositiveInt = Field(
        default=50 * 1024 * 1024, # 50 MB
        description="Maximális megengedett fájlméret bájtban a feltöltésekhez."
    )
    ALLOWED_MIME_TYPES: List[str] = Field(
        default_factory=lambda: [
            "text/plain", "text/markdown", "text/csv", "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # docx
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "text/x-python", "application/javascript", "text/html", "text/css",
            "application/json"
        ],
        description="Engedélyezett fájl MIME típusok listája (feldolgozáskor kisbetűsítve)."
    )
    ALLOWED_EXTENSIONS: List[str] = Field(
        default_factory=lambda: [
            "txt", "md", "csv", "pdf", "docx", "jpg", "jpeg", "png", "webp", "gif",
            "py", "js", "html", "css", "json"
        ],
        description="Engedélyezett fájlkiterjesztések listája (pont nélkül, feldolgozáskor kisbetűsítve)."
    )
    CHUNK_SIZE: PositiveInt = Field(
        default=1000,
        description="Célzott darab (chunk) méret karakterekben a szöveges fájlok feldolgozásakor."
    )
    CHUNK_OVERLAP: NonNegativeInt = Field(
        default=100,
        description="Átfedés karakterszáma a szöveges darabok között (jobb kontextus megőrzés érdekében)."
    )

    @model_validator(mode='before')
    @classmethod
    def _parse_string_list_to_lower(cls, values):
        """Környezeti változók feldolgozása a lista mezőkhöz."""
        if isinstance(values, dict):
            if 'ALLOWED_MIME_TYPES' in values:
                values['ALLOWED_MIME_TYPES'] = _parse_env_list_str_utility(
                    values['ALLOWED_MIME_TYPES'], 'ALLOWED_MIME_TYPES', lowercase_items=True
                )
            if 'ALLOWED_EXTENSIONS' in values:
                values['ALLOWED_EXTENSIONS'] = _parse_env_list_str_utility(
                    values['ALLOWED_EXTENSIONS'], 'ALLOWED_EXTENSIONS', lowercase_items=True
                )
        return values

class APIKeysSettings(BaseModel):
    """Külső szolgáltatásokhoz szükséges API kulcsok."""
    ALPHA_VANTAGE: Optional[SecretStr] = Field(default=None, description="Alpha Vantage API kulcs (SecretStr).")
    OPENROUTER: Optional[SecretStr] = Field(default=None, description="OpenRouter API kulcs (SecretStr).")
    MARKETAUX: Optional[SecretStr] = Field(default=None, description="MarketAux API kulcs (SecretStr).")
    FMP: Optional[SecretStr] = Field(default=None, description="Financial Modeling Prep (FMP) API kulcs (SecretStr).")
    NEWSAPI: Optional[SecretStr] = Field(default=None, description="NewsAPI.org API kulcs (SecretStr).")
    EODHD: Optional[SecretStr] = Field(default=None, description="EOD Historical Data API kulcs (SecretStr).")

    @validator('*', pre=True)
    @classmethod
    def _check_api_key_format_if_string(cls, v: Optional[Union[str, SecretStr]]) -> Optional[Union[str, SecretStr]]:
        """Ellenőrzi az API kulcsok formátumát, ha stringként érkeznek."""
        if v is None or v == "":
            return None
        
        if isinstance(v, str):
            v_stripped = v.strip()
            if len(v_stripped) < 10:  # Túl rövid API kulcs
                logger.warning(f"API key appears to be too short (length: {len(v_stripped)}). This might be a configuration error.")
            elif not v_stripped.replace('-', '').replace('_', '').isalnum():  # Nem alfanumerikus karakterek
                logger.warning("API key contains unexpected characters. Ensure it's copied correctly.")
        
        return v

    model_config = SettingsConfigDict(
        env_prefix='FINBOT_API_KEYS__', 
        env_file=str(_PROJECT_ROOT_PATH / '.env'),  # Use project root .env
        env_file_encoding='utf-8',
        extra='ignore'
    )

class ApplicationMetaSettings(BaseModel):
    """Általános alkalmazás meta-információk."""
    NAME: str = Field("Aevorex FinBot", description="Az alkalmazás belső neve.")
    VERSION: str = Field("2.2.0", description="Backend API verziója (Semantic Versioning).")
    TITLE: str = Field("AEVOREX FinBot Premium API", description="Publikus API cím (OpenAPI/Swagger).")
    DESCRIPTION: str = Field(
        "Advanced Financial Analytics & AI-Powered Investment Intelligence Platform",
        description="Részletes API leírás."
    )

    @model_validator(mode='after')
    def _update_title_with_version(self) -> 'ApplicationMetaSettings':
        """Dinamikusan frissíti a címet a verzióval."""
        if self.VERSION and self.VERSION != "unknown":
            self.TITLE = f"AEVOREX FinBot Premium API v{self.VERSION}"
        return self

class AISettings(BaseModel):
    """AI/LLM szolgáltatások beállításai."""
    ENABLED: bool = True
    PROVIDER: str = "openrouter"
    # These defaults are public (non-secret) and can be safely tracked in VCS.
    # They can still be overridden via .env if needed.
    MODEL_NAME_PRIMARY: Optional[str] = "google/gemini-2.0-flash-001"
    MODEL_NAME_FALLBACK: Optional[str] = "openai/gpt-4o-mini"
    MAX_TOKENS_PRIMARY: PositiveInt = Field(default=8000)
    MAX_TOKENS_FALLBACK: PositiveInt = Field(default=4000)
    TEMPERATURE: float = 0.3
    TEMPERATURE_PRIMARY: Optional[float] = 0.35  # Slightly higher creativity for Flash
    TEMPERATURE_FALLBACK: Optional[float] = 0.3
    RETRY_MAX_ATTEMPTS: int = 3
    RETRY_MIN_WAIT_SECONDS: int = 1
    RETRY_MAX_WAIT_SECONDS: int = 10
    RETRY_BACKOFF_FACTOR: float = 1.5
    TIMEOUT_SECONDS: float = 180.0
    RETRY_ON_NO_DATA_WITH_SUCCESS_STATUS: bool = Field(default=True, description="Retry AI analysis when no data returned with successful HTTP status")
    # Number of days of historical price data to include when generating AI prompts.
    AI_PRICE_DAYS_FOR_PROMPT: PositiveInt = Field(
        default=60,
        description="Number of days of historical price data to include in AI prompts. Must be positive."
    )

    @validator('PROVIDER')
    @classmethod
    def _validate_provider_identifier(cls, v: str) -> str:
        provider = v.strip().lower()
        if not provider:
            logger.warning("AI.PROVIDER is empty. If AI.ENABLED is True, this will be an issue.")
        logger.debug(f"Validated and normalized AI.PROVIDER: '{provider}'")
        return provider

    model_config = SettingsConfigDict(env_prefix='FINBOT_AI__', env_file='.env', extra='ignore')

class HttpClientSettings(BaseModel):
    """HTTP kliens beállítások."""
    REQUEST_TIMEOUT_SECONDS: PositiveFloat = Field(default=45.0)
    CONNECT_TIMEOUT_SECONDS: PositiveFloat = Field(default=10.0)
    POOL_TIMEOUT_SECONDS: PositiveFloat = Field(default=5.0)
    MAX_CONNECTIONS: Optional[PositiveInt] = Field(default=100)
    MAX_KEEPALIVE_CONNECTIONS: Optional[PositiveInt] = Field(default=20)
    USER_AGENT: str = Field(default="AevorexFinBot/UnsetVersion (Backend; +https://aevorex.com/finbot)")
    DEFAULT_REFERER: AnyHttpUrl = Field(default=AnyHttpUrl("https://aevorex.com/"))
    RETRY_COUNT: NonNegativeInt = Field(default=2)
    RETRY_BACKOFF_FACTOR: NonNegativeFloat = Field(default=0.5)

    model_config = SettingsConfigDict(env_prefix='FINBOT_HTTP_CLIENT__', env_file='.env', extra='ignore')

class EnvironmentSettings(BaseModel):
    """Futási környezet és fejlesztői beállítások."""
    NODE_ENV: str = Field(
        default='production',
        description="Futási környezet: 'development' vagy 'production'."
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description=f"Alkalmazás logolási szintje. Lehetőségek: {', '.join(_LOG_LEVEL_OPTIONS)}"
    )
    DEBUG_MODE: bool = Field(default=False, description="Általános debug mód kapcsoló.")
    RELOAD_UVICORN: bool = Field(default=False, description="Uvicorn automatikus újraindítás.")

    @validator('LOG_LEVEL')
    @classmethod
    def _validate_and_normalize_log_level(cls, v: str) -> str:
        """LOG_LEVEL validálása és normalizálása."""
        if not isinstance(v, str):
            logger.warning(f"LOG_LEVEL should be a string, got {type(v)}. Using 'INFO'.")
            return 'INFO'
        
        normalized = v.strip().upper()
        if normalized not in _LOG_LEVEL_OPTIONS:
            logger.warning(f"Invalid LOG_LEVEL '{v}'. Valid options: {_LOG_LEVEL_OPTIONS}. Using 'INFO'.")
            return 'INFO'
        
        return normalized

    @model_validator(mode='after')
    def _check_environment_consistency(self) -> 'EnvironmentSettings':
        """Környezet beállítások konzisztencia ellenőrzése."""
        if self.NODE_ENV == 'development':
            if not self.DEBUG_MODE:
                logger.info("Development environment detected but DEBUG_MODE is False. Consider enabling it.")
            if not self.RELOAD_UVICORN:
                logger.info("Development environment detected but RELOAD_UVICORN is False. Consider enabling it.")
        elif self.NODE_ENV == 'production':
            if self.DEBUG_MODE:
                logger.warning("Production environment detected but DEBUG_MODE is True. Consider disabling it for security.")
            if self.RELOAD_UVICORN:
                logger.warning("Production environment detected but RELOAD_UVICORN is True. This should be disabled in production.")
        
        return self

class CorsSettings(BaseSettings):
    """CORS beállítások."""
    ENABLED: bool = Field(True, env="FINBOT_CORS__ENABLED")
    ALLOWED_ORIGINS_STR: Optional[str] = Field(None, alias="FINBOT_CORS__ALLOWED_ORIGINS")
    ALLOWED_ORIGINS: List[AnyHttpUrl] = [] 
    ALLOW_CREDENTIALS: bool = Field(True, env="FINBOT_CORS__ALLOW_CREDENTIALS")
    ALLOWED_METHODS_STR: Optional[str] = Field(default='["GET","POST","OPTIONS","PUT","DELETE","PATCH"]', alias="FINBOT_CORS__ALLOWED_METHODS")
    ALLOWED_METHODS: List[str] = []
    ALLOWED_HEADERS_STR: Optional[str] = Field(default='["*"]', alias="FINBOT_CORS__ALLOWED_HEADERS")
    ALLOWED_HEADERS: List[str] = ["*"]
    MAX_AGE: int = Field(600, env="FINBOT_CORS__MAX_AGE")

    @model_validator(mode='after')
    def process_env_strings(self):
        """Környezeti változók feldolgozása."""
        # ALLOWED_ORIGINS feldolgozása
        if self.ALLOWED_ORIGINS_STR:
            try:
                origins_list = json.loads(self.ALLOWED_ORIGINS_STR)
                self.ALLOWED_ORIGINS = [AnyHttpUrl(origin) for origin in origins_list]
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Invalid CORS ALLOWED_ORIGINS format: {e}. Using defaults.")
                self.ALLOWED_ORIGINS = [
                    AnyHttpUrl("http://localhost:3000"),
                    AnyHttpUrl("http://127.0.0.1:3000"),
                    AnyHttpUrl("https://aevorex.com"),
                    AnyHttpUrl("https://www.aevorex.com")
                ]
        else:
            # Alapértelmezett origins
            self.ALLOWED_ORIGINS = [
                AnyHttpUrl("http://localhost:3000"),
                AnyHttpUrl("http://127.0.0.1:3000"),
                AnyHttpUrl("https://aevorex.com"),
                AnyHttpUrl("https://www.aevorex.com")
            ]

        # ALLOWED_METHODS feldolgozása
        if self.ALLOWED_METHODS_STR:
            try:
                self.ALLOWED_METHODS = json.loads(self.ALLOWED_METHODS_STR)
            except json.JSONDecodeError:
                logger.warning("Invalid CORS ALLOWED_METHODS format. Using defaults.")
                self.ALLOWED_METHODS = ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"]
        else:
            self.ALLOWED_METHODS = ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"]

        # ALLOWED_HEADERS feldolgozása
        if self.ALLOWED_HEADERS_STR:
            try:
                self.ALLOWED_HEADERS = json.loads(self.ALLOWED_HEADERS_STR)
            except json.JSONDecodeError:
                logger.warning("Invalid CORS ALLOWED_HEADERS format. Using defaults.")
                self.ALLOWED_HEADERS = ["*"]

        return self

class CacheSettings(BaseModel):
    """Gyorsítótárazási beállítások."""
    ENABLED: bool = Field(default=True, description="Globális gyorsítótár engedélyezése/letiltása.")
    DEFAULT_TTL_SECONDS: PositiveInt = Field(default=15 * 60, description="Alapértelmezett cache TTL másodpercben (15 perc).")
    LOCK_TTL_SECONDS: PositiveInt = Field(default=2 * 60, description="Cache lock TTL másodpercben (2 perc).")
    LOCK_BLOCKING_TIMEOUT_SECONDS: NonNegativeFloat = Field(default=6.0, description="Cache lock várakozási idő (megnövelve a lock contention hibák elkerülésére).")
    LOCK_RETRY_DELAY_SECONDS: PositiveFloat = Field(default=0.5, description="Cache lock retry delay.")
    MAX_SIZE: Optional[PositiveInt] = Field(default=1024, description="Maximális elemek száma az in-memory cache-ben.")
    
    # Specifikus TTL-ek
    FETCH_TTL_COMPANY_INFO_SECONDS: PositiveInt = Field(default=24 * 3600, description="Céginformációk cache TTL (24 óra).")
    FETCH_TTL_FINANCIALS_SECONDS: PositiveInt = Field(default=12 * 3600, description="Pénzügyi adatok cache TTL (12 óra).")
    FETCH_TTL_NEWS_SECONDS: PositiveInt = Field(default=1 * 3600, description="Hírek cache TTL (1 óra).")
    FETCH_TTL_OHLCV_SECONDS: PositiveInt = Field(default=1 * 3600, description="OHLCV adatok cache TTL (1 óra).")
    NEWS_RAW_FETCH_TTL_SECONDS: PositiveInt = Field(default=15 * 60, description="Nyers hírek cache TTL (15 perc).")
    EODHD_DAILY_OHLCV_TTL: PositiveInt = Field(default=4 * 3600, description="EODHD napi OHLCV cache TTL (4 óra).")
    EODHD_INTRADAY_OHLCV_TTL: PositiveInt = Field(default=5 * 60, description="EODHD intraday OHLCV cache TTL (5 perc).")
    AGGREGATED_TTL_SECONDS: PositiveInt = Field(default=15 * 60, description="Aggregált adatok cache TTL (15 perc).")
    FETCH_FAILURE_TTL_SECONDS: PositiveInt = Field(default=10 * 60, description="Sikertelen lekérdezések cache TTL (10 perc).")

class RedisSettings(BaseModel):
    """Redis szerver és adatbázis beállítások."""
    HOST: str = Field("localhost", description="Redis szerver hosztneve vagy IP címe.")
    PORT: PositiveInt = Field(6379, description="Redis szerver portja.")
    DB_CACHE: NonNegativeInt = Field(0, description="Redis adatbázis száma a cache-hez.")
    DB_CELERY_BROKER: NonNegativeInt = Field(1, description="Redis adatbázis száma a Celery brokerhez.")
    DB_CELERY_BACKEND: NonNegativeInt = Field(2, description="Redis adatbázis száma a Celery eredményekhez.")
    CONNECT_TIMEOUT_SECONDS: PositiveInt = Field(default=5, description="Redis kapcsolódási timeout.")
    SOCKET_TIMEOUT_SECONDS: PositiveInt = Field(default=10, description="Redis socket timeout.")

    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.HOST}:{self.PORT}/{self.DB_CELERY_BROKER}"

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.HOST}:{self.PORT}/{self.DB_CELERY_BACKEND}"

    model_config = SettingsConfigDict(env_prefix='FINBOT_REDIS__')

class TickerTapeSettings(BaseModel):
    """Ticker szalag beállítások."""
    SYMBOLS: List[str] = Field(
        default_factory=lambda: ["^GSPC", "^GDAXI", "AAPL", "MSFT", "GOOGL", "OTP.BD", "EURHUF=X", "BTC-USD"],
        description="Megjelenítendő ticker szimbólumok listája."
    )
    UPDATE_INTERVAL_SECONDS: PositiveInt = Field(default=60, description="Frissítési intervallum másodpercben.")
    CACHE_KEY: str = Field(default="ticker_tape_data", description="Cache kulcs.")
    CACHE_TTL_SECONDS: PositiveInt = Field(default=30, description="Cache TTL másodpercben.")

    @validator('SYMBOLS', pre=True)
    @classmethod
    def _parse_symbols_list(cls, v: Any) -> List[str]:
        return _parse_env_list_str_utility(v, 'SYMBOLS', lowercase_items=False)

class DataSourceSettings(BaseModel):
    """Adatforrásokra vonatkozó beállítások."""
    PRIMARY: str = Field(default="yfinance", description="Elsődleges adatforrás.")
    SECONDARY: Optional[str] = Field(default="eodhd", description="Másodlagos adatforrás.")
    INFO_TEXT: str = Field(default="Data sources configuration", description="Információs szöveg.")

    @validator('PRIMARY', 'SECONDARY')
    @classmethod
    def _validate_and_normalize_source(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        
        normalized = v.strip().lower()
        
        known_sources = ['yfinance', 'eodhd', 'alpha_vantage', 'fmp', 'marketaux']
        if normalized not in known_sources:
            logger.warning(f"Unknown data source '{v}'. Known sources: {known_sources}")
        
        return normalized

class DataProcessingSettings(BaseModel):
    """Adatfeldolgozási beállítások."""
    OHLCV_YEARS_TO_FETCH: PositiveInt = Field(default=2, description="Lekérendő OHLCV évek száma.")
    OHLCV_YEARS_TO_PROCESS_INDICATORS: PositiveInt = Field(default=1, description="Indikátorok számításához használt évek száma.")
    CHART_HISTORY_YEARS: PositiveFloat = Field(default=2.0, description="Chart adatokhoz visszaküldött évek száma.")
    
    INDICATOR_PARAMS: Dict[str, Union[PositiveInt, PositiveFloat, bool]] = Field(
        default_factory=lambda: {
            "sma_periods": [20, 50, 200],
            "ema_periods": [12, 26],
            "rsi_period": 14,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "bollinger_period": 20,
            "bollinger_std": 2,
            "volume_sma_period": 20,
            "calculate_support_resistance": True,
            "calculate_fibonacci_levels": True
        },
        description="Technikai indikátorok paraméterei."
    )

    @validator('INDICATOR_PARAMS', pre=True)
    @classmethod
    def _parse_indicator_params_json(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse INDICATOR_PARAMS as JSON: {e}. Using defaults.")
                return {}
        return v

    @model_validator(mode='after')
    def _check_year_limits_consistency(self) -> 'DataProcessingSettings':
        if self.OHLCV_YEARS_TO_PROCESS_INDICATORS > self.OHLCV_YEARS_TO_FETCH:
            logger.warning(
                f"OHLCV_YEARS_TO_PROCESS_INDICATORS ({self.OHLCV_YEARS_TO_PROCESS_INDICATORS}) "
                f"is greater than OHLCV_YEARS_TO_FETCH ({self.OHLCV_YEARS_TO_FETCH}). "
                "This may cause insufficient data for indicator calculations."
            )
        
        if self.CHART_HISTORY_YEARS > self.OHLCV_YEARS_TO_FETCH:
            logger.warning(
                f"CHART_HISTORY_YEARS ({self.CHART_HISTORY_YEARS}) "
                f"is greater than OHLCV_YEARS_TO_FETCH ({self.OHLCV_YEARS_TO_FETCH}). "
                "This may result in incomplete chart data."
            )
        
        return self

class NewsProcessingSettings(BaseModel):
    """Hírek feldolgozásának beállításai."""
    FETCH_LIMIT: PositiveInt = Field(default=30, description="Maximálisan lekérdezendő hírek száma.")
    MAX_AGE_DAYS_FILTER: Optional[PositiveInt] = Field(default=90, description="Maximális hír kor napokban.")
    MIN_ITEMS_FOR_PROMPT: NonNegativeInt = Field(default=3, description="Minimális hírek száma az AI prompthoz.")
    TARGET_COUNT_FOR_PROMPT: PositiveInt = Field(default=7, description="Célzott hírek száma az AI promptban.")
    MAX_ITEMS_FOR_PROMPT: PositiveInt = Field(default=15, description="Maximális hírek száma az AI promptban.")
    SENTIMENT_THRESHOLD_PROMPT: NonNegativeFloat = Field(default=0.1, ge=0.0, le=1.0, description="Minimális sentiment küszöb.")
    RELEVANCE_THRESHOLD_PROMPT: NonNegativeFloat = Field(default=0.15, ge=0.0, le=1.0, description="Minimális relevancia küszöb.")

    ENABLED_SOURCES: List[str] = Field(
        default_factory=lambda: ["yfinance", "marketaux", "fmp", "alphavantage", "newsapi", "eodhd"],
        description="Engedélyezett hírforrások."
    )
    SOURCE_PRIORITY: List[str] = Field(
        default_factory=lambda: ["marketaux", "fmp", "eodhd", "yfinance", "alphavantage", "newsapi"],
        description="Hírforrások prioritási sorrendje."
    )
    MIN_UNIQUE_TARGET: PositiveInt = Field(default=5, description="Minimális egyedi hírek célszáma.")

    @validator('ENABLED_SOURCES', 'SOURCE_PRIORITY', pre=True)
    @classmethod
    def _parse_news_string_list_to_lower(cls, v: Any) -> List[str]:
        field_name = "NEWS_SOURCES"  # Általános név a loghoz
        return _parse_env_list_str_utility(v, field_name, lowercase_items=True)

    @model_validator(mode='after')
    def _check_prompt_limits_consistency(self) -> 'NewsProcessingSettings':
        if self.MIN_ITEMS_FOR_PROMPT > self.TARGET_COUNT_FOR_PROMPT:
            logger.warning(
                f"MIN_ITEMS_FOR_PROMPT ({self.MIN_ITEMS_FOR_PROMPT}) is greater than "
                f"TARGET_COUNT_FOR_PROMPT ({self.TARGET_COUNT_FOR_PROMPT}). This may cause issues."
            )
        
        if self.TARGET_COUNT_FOR_PROMPT > self.MAX_ITEMS_FOR_PROMPT:
            logger.warning(
                f"TARGET_COUNT_FOR_PROMPT ({self.TARGET_COUNT_FOR_PROMPT}) is greater than "
                f"MAX_ITEMS_FOR_PROMPT ({self.MAX_ITEMS_FOR_PROMPT}). Adjusting target to max."
            )
            self.TARGET_COUNT_FOR_PROMPT = self.MAX_ITEMS_FOR_PROMPT
        
        return self

class PathSettings(BaseModel):
    """Fájlrendszerbeli elérési utak."""
    PROJECT_ROOT: DirectoryPath = Field(
        default=_PROJECT_ROOT_PATH,
        description="Projekt gyökérkönyvtár."
    )
    STATIC_DIR: Optional[Path] = Field(default=None, description="Statikus fájlok könyvtára.")
    TEMPLATES_DIR: Optional[Path] = Field(default=None, description="HTML sablonok könyvtára.")
    LOG_DIR: Optional[Path] = Field(default=None, description="Log fájlok könyvtára.")

    @model_validator(mode='after')
    def _resolve_and_verify_paths(self) -> 'PathSettings':
        """Útvonalak feloldása és ellenőrzése."""
        # Alapértelmezett útvonalak beállítása
        if self.STATIC_DIR is None:
            self.STATIC_DIR = self._process_path_setting(None, "modules/financehub/frontend/static", "STATIC_DIR", False, False)
        
        if self.TEMPLATES_DIR is None:
            self.TEMPLATES_DIR = self._process_path_setting(None, "templates", "TEMPLATES_DIR", False, False)
        
        if self.LOG_DIR is None:
            self.LOG_DIR = self._process_path_setting(None, "logs", "LOG_DIR", True, True)
        
        return self

    def _process_path_setting(
        self, current_path_val: Optional[Path], default_subdir: Union[str, Path],
        dir_name_for_log: str, is_required: bool, check_writable: bool
    ) -> Optional[Path]:
        """Egy adott útvonal beállítás feldolgozása."""
        if current_path_val is None:
            # Alapértelmezett: PROJECT_ROOT / default_subdir
            resolved_path = self.PROJECT_ROOT / default_subdir
        else:
            resolved_path = current_path_val
            if not resolved_path.is_absolute():
                resolved_path = self.PROJECT_ROOT / resolved_path

        # Csak akkor hívjuk az _ensure_directory-t, ha kritikus könyvtár
        if is_required:
            self._ensure_directory(resolved_path, dir_name_for_log, is_required, check_writable)
        else:
            # Opcionális könyvtárak esetén csak ellenőrizzük, hogy léteznek-e
            if not resolved_path.exists():
                logger.warning(f"Optional directory '{dir_name_for_log}' does not exist at: {resolved_path}")
            elif not resolved_path.is_dir():
                logger.warning(f"Optional path '{dir_name_for_log}' exists but is not a directory: {resolved_path}")
            else:
                logger.debug(f"Optional directory '{dir_name_for_log}' is available at: {resolved_path}")
        
        return resolved_path

    def _ensure_directory(self, dir_path: Path, name: str, is_required: bool, check_writable: bool):
        """Ensure directory exists and optionally check if it's writable."""
        logger.debug(f"Ensuring directory '{name}' at: {dir_path} (Required: {is_required}, Writable Check: {check_writable})")
        
        try:
            if not dir_path.exists():
                if is_required:
                    dir_path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"Created required directory '{name}': {dir_path}")
                else:
                    logger.debug(f"Optional directory '{name}' does not exist: {dir_path}")
                    return

            if not dir_path.is_dir():
                error_msg = f"Path '{name}' exists but is not a directory: {dir_path}"
                if is_required:
                    raise ValueError(error_msg)
                else:
                    logger.warning(f"Optional path issue: {error_msg}")
                    return

            if check_writable:
                # Írhatóság tesztelése egy temp fájl létrehozásával
                test_file = dir_path / f".write_test_{os.getpid()}"
                try:
                    test_file.write_text("test")
                    test_file.unlink()
                    logger.debug(f"Directory '{name}' is writable: {dir_path}")
                except Exception as write_error:
                    error_msg = f"Directory '{name}' is not writable: {dir_path}. Error: {write_error}"
                    if is_required:
                        raise ValueError(error_msg)
                    else:
                        logger.warning(f"Optional directory write issue: {error_msg}")

        except Exception as e:
            if is_required:
                raise ValueError(f"Failed to initialize required directory '{name}': {e}") from e

class EODHDFeaturesSettings(BaseModel):
    """EODHD specifikus funkciók beállításai."""
    USE_FOR_COMPANY_INFO: bool = Field(default=False, description="EODHD használata céginformációkhoz.")
    USE_FOR_FINANCIALS: bool = Field(default=False, description="EODHD használata pénzügyi adatokhoz.")
    USE_FOR_OHLCV_DAILY: bool = Field(default=False, description="EODHD használata napi OHLCV adatokhoz.")
    USE_FOR_OHLCV_INTRADAY: bool = Field(default=False, description="EODHD használata intraday OHLCV adatokhoz.")

    @model_validator(mode='after')
    def _log_enabled_eodhd_features(self) -> 'EODHDFeaturesSettings':
        """Engedélyezett EODHD funkciók logolása."""
        enabled_features = []
        for field_name in self.model_fields:
            if field_name.startswith("USE_FOR_") and getattr(self, field_name) is True:
                feature_name = field_name.replace("USE_FOR_", "").lower().replace("_", " ")
                enabled_features.append(feature_name)
        
        if enabled_features:
            logger.info(f"EODHD Features: Enabled: {', '.join(enabled_features)}")
        else:
            logger.info("EODHD Features: All features are DISABLED.")
        
        return self

    model_config = SettingsConfigDict(env_prefix='FINBOT_EODHD_FEATURES__')

# Uvicorn beállítások - fontos hogy a Settings osztály előtt legyen definiálva
class UvicornSettings(BaseModel):
    """Uvicorn ASGI szerver beállítások."""
    # Default host set to "localhost" to align with development docs and
    # common front-end expectations (http://localhost:8084).
    HOST: str = Field(default="localhost", description="Uvicorn szerver hosztneve vagy IP címe. Használj '0.0.0.0'-t, ha konténerben fut a szolgáltatás.")
    PORT: PositiveInt = Field(default=8084, description="Uvicorn szerver portja.")
    RELOAD: bool = Field(default=True, description="Automatikus újraindítás kód változáskor.")
    LOG_LEVEL: str = Field(default="info", description="Uvicorn log szintje.")
    ACCESS_LOG: bool = Field(default=False, description="HTTP hozzáférési naplózás engedélyezése.")
    WORKERS: PositiveInt = Field(default=1, description="Worker processzek száma.")
    
    model_config = SettingsConfigDict(env_prefix='FINBOT_UVICORN__', env_file='.env', extra='ignore')

    @validator('LOG_LEVEL')
    @classmethod
    def _validate_log_level(cls, v: str) -> str:
        """Validálja és normalizálja a log szintet."""
        v_lower = v.strip().lower()
        allowed = ['critical', 'error', 'warning', 'info', 'debug', 'trace']
        if v_lower not in allowed:
            raise ValueError(f"Invalid log level '{v}'. Must be one of: {', '.join(allowed)}")
        return v_lower
    
    @model_validator(mode='after')
    def _adjust_for_environment(self) -> 'UvicornSettings':
        """Környezet-specifikus beállítások."""
        # Környezeti változóból érkező reload kérés felülbírálhatja a beállítást
        env_reload = os.getenv('FINBOT_ENVIRONMENT__RELOAD_UVICORN', '').lower() in ('true', '1', 'yes')
        if env_reload and not self.RELOAD:
            self.RELOAD = True
            logger.info("Uvicorn reload enabled via environment variable override.")
        return self

# ---------------------------------------------------------------------------
# MODEL_CATALOGUE import – robust dual-path strategy. We try the canonical
# proxy path first, then gracefully fall back to the legacy root-level module
# if needed. This prevents fatal startup errors when PYTHONPATH is mis-aligned
# (e.g. when launching the backend from a nested working directory).
# ---------------------------------------------------------------------------

try:
    from modules.shared.ai.model_catalogue import MODEL_CATALOGUE  # type: ignore  # pylint: disable=wrong-import-position
except ImportError:  # pragma: no cover
    try:
        from model_catalogue import MODEL_CATALOGUE  # type: ignore  # pylint: disable=wrong-import-position
    except ImportError as import_err:  # pragma: no cover
        raise ImportError(
            "CONFIG setup failed: Unable to import MODEL_CATALOGUE via either "
            "'modules.shared.ai.model_catalogue' or fallback 'model_catalogue'. "
            "Ensure project root is on PYTHONPATH. Original error: " + str(import_err)
        )

# FŐ KONFIGURÁCIÓS MODELL
class Settings(BaseSettings):
    """
    Aevorex FinBot Backend központi konfigurációs modellje.
    """

    API_PREFIX: str = Field(default="/api/v1", description="Globális prefix az API végpontokhoz.")

    # Beágyazott beállítási csoportok
    APP_META: ApplicationMetaSettings = Field(default_factory=ApplicationMetaSettings)
    ENVIRONMENT: EnvironmentSettings = Field(default_factory=EnvironmentSettings)
    PATHS: PathSettings = Field(default_factory=PathSettings)
    CORS: CorsSettings = Field(default_factory=CorsSettings)
    API_KEYS: APIKeysSettings = Field(default_factory=APIKeysSettings)
    REDIS: RedisSettings = Field(default_factory=RedisSettings)
    UVICORN: UvicornSettings = Field(default_factory=UvicornSettings)
    HTTP_CLIENT: HttpClientSettings = Field(default_factory=HttpClientSettings)
    CACHE: CacheSettings = Field(default_factory=CacheSettings)
    DATA_SOURCE: DataSourceSettings = Field(default_factory=DataSourceSettings)
    EODHD_FEATURES: EODHDFeaturesSettings = Field(default_factory=EODHDFeaturesSettings)
    AI: AISettings = Field(default_factory=AISettings)
    NEWS: NewsProcessingSettings = Field(default_factory=NewsProcessingSettings)
    DATA_PROCESSING: DataProcessingSettings = Field(default_factory=DataProcessingSettings)
    TICKER_TAPE: TickerTapeSettings = Field(default_factory=TickerTapeSettings)
    FILE_PROCESSING: FileProcessingSettings = Field(default_factory=FileProcessingSettings)

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT_PATH / '.env'),  # Explicitly use project root .env
        env_file_encoding='utf-8',
        env_prefix='FINBOT_',
        env_nested_delimiter='__',
        case_sensitive=False,
        extra='ignore'
    )

    @model_validator(mode='after')
    def _perform_final_cross_model_validations_and_setups(self) -> 'Settings':
        """Kereszt-modell validációk és beállítások."""
        logger.debug("Performing final cross-model validations and setups...")

        # HTTP User-Agent dinamikus beállítása
        if self.APP_META and self.HTTP_CLIENT:
            app_name_slug = self.APP_META.NAME.replace(' ', '')
            self.HTTP_CLIENT.USER_AGENT = (
                f"{app_name_slug}/{self.APP_META.VERSION} "
                f"(Backend; +https://aevorex.com/finbot)"
            )
            logger.info(f"Dynamically set HTTP_CLIENT.USER_AGENT to: {self.HTTP_CLIENT.USER_AGENT}")

        self._check_critical_api_key_dependencies()
        return self

    def _check_critical_api_key_dependencies(self) -> None:
        """API kulcs függőségek ellenőrzése."""
        logger.info("Performing critical API key dependency checks...")
        missing_keys = []

        # AI kulcs ellenőrzése
        if self.AI.ENABLED:
            provider = self.AI.PROVIDER
            if provider == 'openrouter' and not self.API_KEYS.OPENROUTER:
                missing_keys.append(f"AI is enabled with OpenRouter but FINBOT_API_KEYS__OPENROUTER is missing")

        # Adatforrás kulcsok ellenőrzése
        if self.DATA_SOURCE.PRIMARY == 'alpha_vantage' and not self.API_KEYS.ALPHA_VANTAGE:
            missing_keys.append("Primary data source is Alpha Vantage but FINBOT_API_KEYS__ALPHA_VANTAGE is missing")
        
        if self.DATA_SOURCE.PRIMARY == 'eodhd' and not self.API_KEYS.EODHD:
            missing_keys.append("Primary data source is EODHD but FINBOT_API_KEYS__EODHD is missing")

        # Hír forrás kulcsok ellenőrzése
        for news_source in self.NEWS.ENABLED_SOURCES:
            if news_source == 'marketaux' and not self.API_KEYS.MARKETAUX:
                missing_keys.append("News source MarketAux is enabled but FINBOT_API_KEYS__MARKETAUX is missing")
            elif news_source == 'fmp' and not self.API_KEYS.FMP:
                missing_keys.append("News source FMP is enabled but FINBOT_API_KEYS__FMP is missing")
            elif news_source == 'newsapi' and not self.API_KEYS.NEWSAPI:
                missing_keys.append("News source NewsAPI is enabled but FINBOT_API_KEYS__NEWSAPI is missing")

        if missing_keys:
            logger.warning("Missing API keys detected:")
            for missing in missing_keys:
                logger.warning(f"  - {missing}")
            logger.warning("Some features may not work correctly without these API keys.")
        else:
            logger.info("All critical API key dependency checks passed.")

# Settings objektum inicializálása
try:
    settings = Settings()
    logger.info(f"Settings successfully loaded. Environment: {settings.ENVIRONMENT.NODE_ENV}")
    logger.info(f"App: {settings.APP_META.NAME} v{settings.APP_META.VERSION}")
    logger.info(f"Project root: {settings.PATHS.PROJECT_ROOT}")
    logger.info(f"API prefix: {settings.API_PREFIX}")
    logger.info(f"Primary data source: {settings.DATA_SOURCE.PRIMARY}")
    logger.info(f"AI enabled: {settings.AI.ENABLED}")
    logger.info(f"Cache enabled: {settings.CACHE.ENABLED}")
    
except ValidationError as e:
    logger.critical("Configuration validation failed:")
    for error in e.errors():
        field_path = " -> ".join(str(x) for x in error.get("loc", []))
        logger.critical(f"  {field_path}: {error.get('msg', 'Unknown error')}")
    sys.exit("Application halted due to configuration validation errors.")

except Exception as e:
    logger.critical(f"Unexpected configuration error: {e}")
    sys.exit(f"Application halted: {e}")

# Export
__all__ = ["settings"] 