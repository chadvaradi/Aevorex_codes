# backend/utils/logger_config.py
import logging
import sys
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Optional

# Késleltetett importálás, hogy biztosan a settings után történjen
_settings = None

def _get_settings():
    """Helper to load settings only when needed and handle potential import issues."""
    global _settings
    if _settings is None:
        try:
            from ..config import settings as imported_settings
            _settings = imported_settings
            # Log only after successful import and basic config might be available
            # Initial log might go to stderr if called too early
            logging.getLogger("LoggerConfigInit").debug("Successfully imported settings in logger_config.")
        except ImportError as e:
            print(f"ERROR: Failed to import settings in logger_config: {e}. Logging might use defaults.", file=sys.stderr)
            # Set _settings to an empty object or dict to avoid repeated import attempts?
            # Or keep it None and let subsequent calls fail? Let's keep None for now.
            # raise RuntimeError("Logger setup failed: Could not import settings.") from e
        except Exception as e:
            print(f"ERROR: Unexpected error importing settings in logger_config: {e}. Logging might use defaults.", file=sys.stderr)
            # raise RuntimeError("Logger setup failed: Unexpected error during settings import.") from e
    return _settings

# Alapértelmezett értékek, ha a settings betöltése valamiért mégsem sikerül
DEFAULT_LOG_LEVEL_STR = "INFO"
DEFAULT_LOG_FORMAT = '%(asctime)s - %(name)s:%(lineno)d - %(levelname)s - %(message)s'
DEFAULT_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
MAX_LOG_FILE_BYTES = 10 * 1024 * 1024 # 10 MB
LOG_FILE_BACKUP_COUNT = 5

# Térkép a log szint stringek és a logging konstansok között
LOG_LEVEL_MAP = {
    "CRITICAL": logging.CRITICAL,
    "ERROR": logging.ERROR,
    "WARNING": logging.WARNING,
    "INFO": logging.INFO,
    "DEBUG": logging.DEBUG,
}

# --- Fő Logger Konfiguráló Függvény ---

def setup_logging():
    """
    Konfigurálja az alkalmazás naplózási rendszerét a központi 'settings' alapján.

    Ez a függvény felelős a következőkért:
    - Megfelelő log szint beállítása (settings.ENVIRONMENT.LOG_LEVEL).
    - Konzolra történő logolás beállítása (StreamHandler).
    - Fájlba történő rotáló logolás beállítása (RotatingFileHandler)
      a settings.PATHS.LOG_DIR könyvtárba.
    - Egységes log formátum alkalmazása.
    - Meglévő handlerek eltávolítása a dupla logolás elkerülése érdekében
      (különösen hasznos Uvicorn reload módban).
    - Zajongó külső könyvtárak loggereinek lehalkítása.
    """
    internal_logger = logging.getLogger("LoggerSetup") # Dedikált logger a setup folyamathoz

    # 1. Settings betöltése (biztonságosan)
    settings = _get_settings()
    if settings is None:
        internal_logger.critical("Cannot configure logging: Settings object could not be loaded.")
        # Lehetne itt egy alap basicConfig hívás fallbackként, de az elrejtheti a problémát
        # Inkább hagyjuk, hogy a hiányzó settings problémája máshol is előjöjjön.
        print("FATAL: Logger setup failed because settings could not be loaded.", file=sys.stderr)
        return # Ne folytassuk a konfigurációt settings nélkül

    # 2. Log szint meghatározása a settings-ből (fallbackkel)
    log_level_str = getattr(getattr(settings, 'ENVIRONMENT', None), 'LOG_LEVEL', DEFAULT_LOG_LEVEL_STR).upper()
    log_level = LOG_LEVEL_MAP.get(log_level_str, LOG_LEVEL_MAP[DEFAULT_LOG_LEVEL_STR])
    internal_logger.info(f"Configuring logging with level: {logging.getLevelName(log_level)} ({log_level_str})")

    # 3. Formatter létrehozása
    log_formatter = logging.Formatter(DEFAULT_LOG_FORMAT, datefmt=DEFAULT_DATE_FORMAT)

    # 4. Root logger lekérése és handlerek törlése
    root_logger = logging.getLogger()
    internal_logger.debug(f"Root logger current level: {logging.getLevelName(root_logger.level)}")
    internal_logger.debug(f"Root logger current handlers: {root_logger.handlers}")
    if root_logger.hasHandlers():
        internal_logger.info("Removing existing handlers from root logger to prevent duplicates.")
        for handler in root_logger.handlers[:]: # Másolaton iterálunk
            try:
                 handler.close() # Próbáljuk meg bezárni, mielőtt eltávolítjuk
                 root_logger.removeHandler(handler)
            except Exception as e:
                 internal_logger.warning(f"Could not close/remove handler {handler}: {e}")
    else:
         internal_logger.debug("No existing handlers found on root logger.")

    # 5. Root logger szintjének beállítása
    root_logger.setLevel(log_level)
    internal_logger.debug(f"Set root logger level to: {logging.getLevelName(root_logger.level)}")


    # 6. Konzol Handler (StreamHandler) hozzáadása
    console_handler = logging.StreamHandler(sys.stdout) # stdout helyett stderr is lehetne
    console_handler.setFormatter(log_formatter)
    # Opcionális: A konzol handlernek lehet más szintje, pl. csak INFO felett
    # console_handler.setLevel(logging.INFO) # Ha csak INFO-t akarunk a konzolra
    console_handler.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    internal_logger.info("Added StreamHandler to root logger for console output.")

    # 7. Fájl Handler (RotatingFileHandler) hozzáadása
    log_dir = getattr(getattr(settings, 'PATHS', None), 'LOG_DIR', None)
    if log_dir and isinstance(log_dir, Path):
        if not log_dir.is_dir():
             internal_logger.error(f"Log directory specified but is not a valid directory: {log_dir}. Skipping file logging.")
        else:
            log_file_path = log_dir / "aevorex_finbot_backend.log"
            try:
                # Rotáló handler méret alapján
                file_handler = RotatingFileHandler(
                    filename=log_file_path,
                    maxBytes=MAX_LOG_FILE_BYTES,
                    backupCount=LOG_FILE_BACKUP_COUNT,
                    encoding='utf-8'
                )
                # Vagy idő alapján rotáló handler (pl. naponta):
                # file_handler = TimedRotatingFileHandler(
                #     filename=log_file_path,
                #     when="midnight", # Naponta éjfélkor rotál
                #     interval=1,
                #     backupCount=7, # 7 napot tart meg
                #     encoding='utf-8'
                # )
                file_handler.setFormatter(log_formatter)
                file_handler.setLevel(logging.DEBUG)
                root_logger.addHandler(file_handler)
                internal_logger.info(f"Added RotatingFileHandler to root logger. Log file: {log_file_path}")
            except PermissionError:
                internal_logger.error(f"Permission denied to write log file at: {log_file_path}. Check permissions for directory: {log_dir}", exc_info=True)
                print(f"ERROR: Permission denied for log file: {log_file_path}", file=sys.stderr)
            except Exception as e:
                internal_logger.error(f"Failed to create file handler for {log_file_path}: {e}", exc_info=True)
                print(f"ERROR: Could not create log file handler: {e}", file=sys.stderr)
    else:
        internal_logger.warning("Log directory not configured in settings (settings.PATHS.LOG_DIR). Skipping file logging.")

    # 8. Zajongó könyvtárak lehalkítása (Warning szintre)
    noisy_loggers = ["httpx", "asyncio", "pandas_ta", "yfinance", "urllib3", "watchfiles"]
    for logger_name in noisy_loggers:
        try:
            logging.getLogger(logger_name).setLevel(logging.WARNING)
            internal_logger.debug(f"Set '{logger_name}' logger level to WARNING.")
        except Exception as e:
             internal_logger.warning(f"Could not set level for logger '{logger_name}': {e}")


    internal_logger.info(f"Logging setup complete. Root logger level: {logging.getLevelName(root_logger.level)}. Handlers: {root_logger.handlers}")


# --- Logger Példány Lekérő Függvény (Változatlan) ---
def get_logger(name: str) -> logging.Logger:
    """
    Lekér egy logger példányt a megadott névvel.
    A példány örökli a root logger beállításait (szint, handlerek, formátum).
    """
    return logging.getLogger(name)