# backend/core/fetchers/__init__.py
"""
Aevorex FinBot - Fetchers Package Initializer (v3.5 - EODHD Integration)

Ez a modul inicializálja a `fetchers` csomagot. Dinamikusan betölti
a specifikus adatlekérő (fetcher) függvényeket az almodulokból
(pl. yfinance.py, eodhd.py), kezeli az aliasokat, és elérhetővé teszi
őket közvetlenül a `backend.core.fetchers` névtér alatt.

Naplózza a betöltési folyamatot és az esetleges hibákat.
Definiálja az `__all__` listát a sikeresen betöltött és exportált
fetcher függvények neveivel.
"""

import importlib
import sys
import logging # Használjuk alap logoláshoz, ha a konfigurált nem elérhető
from typing import List, Dict, Callable, Any, Final

# --- Alap Logger Beállítása (Fallback mechanizmussal) ---
# Próbáljuk meg a konfigurált loggert betölteni
try:
    # Relatív import a utils csomaghoz képest: fetchers -> core -> backend -> utils
    from ...utils.logger_config import get_logger
    logger = get_logger("aevorex_finbot.core.fetchers")
    logger.info("Initializing fetchers package (v3.5 - EODHD Integration)...")
except ImportError as log_import_err:
    # Fallback basic loggingra, ha a konfigurált logger nem érhető el
    logging.basicConfig(level=logging.WARNING, stream=sys.stderr)
    logger = logging.getLogger("aevorex_finbot.core.fetchers.init_fallback")
    logger.warning(f"Using basic fallback logger for fetchers package init. Configured logger import failed: {log_import_err}")
    logger.info("Initializing fetchers package (v3.5 - EODHD Integration, with fallback logger)...")
except Exception as log_setup_err:
    # Egyéb váratlan hiba a logger beállítása során
    logging.basicConfig(level=logging.CRITICAL, stream=sys.stderr)
    logger = logging.getLogger("aevorex_finbot.core.fetchers.init_critical_fallback")
    logger.critical(f"CRITICAL ERROR setting up logger in fetchers init: {log_setup_err}", exc_info=True)
    logger.info("Attempting partial fetchers package initialization (v3.5 - EODHD Integration, logging critical error)...")


# --- Modulok és Exportálandó Függvényeik Definíciója ---
# A kulcs a modul relatív neve (a '.' jelzi a relatív importot ezen a csomagon belül).
# Az érték a függvénynevek listája. Az 'eredeti_nev as alias_nev' szintaxis támogatott.
# FONTOS: Győződj meg róla, hogy a modulnevek (pl. ".yfinance") és a fájlnevek
# (pl. yfinance.py) megegyeznek (a '.' nélkül).
MODULE_MAP: Final[Dict[str, List[str]]] = {
    ".yfinance": [
        # Aliasok, ha kellenek:
        "fetch_ohlcv as fetch_yfinance_ohlcv", 
        "fetch_company_info_dict as fetch_yfinance_company_info",
        
        # Az eredeti függvény, amit a wrapperek használnak (nem kell aliasolni, ha nem hívod máshonnan ezen a néven):
        "fetch_financial_data_dfs", 
        
        # Hírek fetcher:
        "fetch_yfinance_news", 
        
        # === A KÉT SZÜKSÉGES WRAPPER EXPORTÁLÁSA ===
        # Ezeket a neveket várja a stock_data_service.py.
        # Feltételezzük, hogy ezek a függvények léteznek a fetchers/yfinance.py-ban.
    ],
    ".eodhd": [ # === FRISSÍTETT EODHD SZEKCIÓ ===
        "fetch_eodhd_ohlcv", # Nincs alias
        "fetch_eodhd_splits_and_dividends",
        "fetch_eodhd_news",
        # Placeholder függvények, aliasolva a jövőbeli "valódi" neveikre.
        # Az Orchestrator így már hivatkozhat rájuk; a placeholder implementáció
        # None-t vagy NotImplementedError-t ad vissza, amíg ki nem dolgozzuk őket.
        "fetch_eodhd_company_info_placeholder as fetch_eodhd_company_info",
        "fetch_eodhd_financial_statements_placeholder as fetch_eodhd_financials",
        "fetch_eodhd_ohlcv_and_events",
    ], # === EODHD SZEKCIÓ VÉGE ===
    ".fmp": [
        "fetch_fmp_historical_ratings",
        "fetch_fmp_stock_news",
        "fetch_fmp_press_releases",
    ],
    ".alphavantage": [
        "fetch_alpha_vantage_news",
        "fetch_alpha_vantage_earnings",
    ],
    ".marketaux": [
        "fetch_marketaux_news",
    ],
    ".newsapi": [
        "fetch_newsapi_news",
    ],
    # Ide add hozzá az új fetcher modulokat és függvényeket a jövőben
    # pl. ".another_source": ["fetch_data as fetch_another_data"],
    
}

# --- Dinamikus Import és Export ---
# Ezek a változók tárolják a betöltés eredményét
_available_fetchers: Dict[str, Callable[..., Any]] = {}
_intended_exports: List[str] = []
_failed_modules: List[str] = []
_failed_functions: List[str] = [] # Stores "module.original_name (as alias_name) - Reason"

logger.debug(f"Starting dynamic import of fetchers based on MODULE_MAP (Package: {__name__})...")

# Végigmegyünk a modul térképen
for module_rel_path, func_spec_list in MODULE_MAP.items():
    module_name_for_logging = module_rel_path.lstrip('.') # Pl. "yfinance", naplózáshoz
    # A `package=__name__` argumentum az `import_module`-ban biztosítja,
    # hogy a relatív import (`.module_name`) a jelenlegi csomagon (`fetchers`) belül oldódjon fel.
    # `full_module_path_for_import` a Python importrendszer által használt teljes útvonal.
    # Pl. backend.core.fetchers.yfinance
    full_module_path_for_import = f"{__package__}{module_rel_path}" if __package__ else module_rel_path


    # Hozzáadjuk a tervezett export neveket a listához (az aliasolt neveket)
    for spec in func_spec_list:
        alias_name = spec.split(' as ')[-1].strip()
        _intended_exports.append(alias_name)

    try:
        # Modul dinamikus importálása. A 'package=__package__' kritikus relatív importokhoz,
        # ha __name__ nem tartalmazza a teljes csomagútvonalat (pl. szkriptként futtatva).
        # Az __init__.py-ban __name__ tipikusan a teljes csomagnév (pl. backend.core.fetchers),
        # így a package=__name__ is működne. __package__ expliciten a csomagot jelöli.
        module = importlib.import_module(module_rel_path, package=__package__)
        logger.debug(f"Successfully loaded module: '{module_rel_path}' (resolved as '{module.__name__}')")

        # Függvények importálása és aliasok kezelése a betöltött modulból
        for func_spec in func_spec_list:
            original_name: str
            alias_name: str
            try:
                # Eredeti és alias név szétválasztása
                if ' as ' in func_spec:
                    original_name, alias_name = [name.strip() for name in func_spec.split(' as ', 1)]
                else:
                    original_name = alias_name = func_spec.strip()

                # Függvény objektum lekérése a modulból
                func = getattr(module, original_name)

                if not callable(func):
                    err_msg = (f"    Attribute '{original_name}' in module '{module_rel_path}' "
                               f"is not callable. Skipping export of '{alias_name}'.")
                    logger.error(err_msg)
                    _failed_functions.append(f"{module_name_for_logging}.{original_name} (as {alias_name}) - Not Callable")
                    continue

                # Exportálás a csomag névterébe (hogy `from modules.financehub.backend.core.fetchers import alias_name` működjön)
                globals()[alias_name] = func
                _available_fetchers[alias_name] = func # Tároljuk a sikeresen betöltötteket
                logger.debug(f"  -> Exported '{alias_name}' (from {module_name_for_logging}.{original_name})")

            except AttributeError:
                err_msg = (f"    AttributeError: Function '{original_name}' not found in module "
                           f"'{module_rel_path}'. Cannot export as '{alias_name}'.")
                logger.error(err_msg)
                _failed_functions.append(f"{module_name_for_logging}.{original_name} (as {alias_name}) - AttributeError")
            except Exception as e_getattr:
                err_msg = (f"    Unexpected error getting attribute '{original_name}' from '{module_rel_path}' "
                           f"for alias '{alias_name}': {e_getattr}")
                logger.error(err_msg, exc_info=True)
                _failed_functions.append(f"{module_name_for_logging}.{original_name} (as {alias_name}) - Unexpected Error")

    except ImportError as e_import:
        print(f"\n\n!!! DEBUG PRINT: Caught ImportError trying to load {module_rel_path} !!!\n") # Adjunk hozzá printet
        import traceback                                                                       # Importáljuk a traceback modult
        traceback.print_exc()                                                                  # Írassuk ki a tracebacket stderr-re
        # Most jöhet a logger hívás:
        logger.error(
            f"Failed to import module '{module_rel_path}' (Attempted: '{full_module_path_for_import}'). "
            f"Error Type: {type(e_import).__name__}, Error: {e_import}. This module's fetchers will be unavailable.",
            exc_info=True
        )
        _failed_modules.append(module_rel_path)
        # Jelöljük az összes ehhez a modulhoz tartozó függvényt hibásként
        for spec in func_spec_list:
            alias_name_for_failed_mod = spec.split(' as ')[-1].strip()
            original_name_for_failed_mod = spec.split(' as ')[0].strip()
            _failed_functions.append(
                f"{module_name_for_logging}.{original_name_for_failed_mod} (as {alias_name_for_failed_mod}) - Module Import Failed"
            )

    except Exception as e_mod_load:
        print(f"\n\n!!! DEBUG PRINT: Caught Exception trying to load {module_rel_path} !!!\n")
        logger.error(f"Unexpected error loading module '{module_rel_path}': {e_mod_load}", exc_info=True)
        _failed_modules.append(module_rel_path)
        for spec in func_spec_list:
            alias_name_for_failed_mod = spec.split(' as ')[-1].strip()
            original_name_for_failed_mod = spec.split(' as ')[0].strip()
            _failed_functions.append(
                f"{module_name_for_logging}.{original_name_for_failed_mod} (as {alias_name_for_failed_mod}) - Module Load Error"
            )


# --- __all__ Definiálása a Sikeresen Betöltött Fetcherek Alapján ---
# Ez határozza meg, mit importál a `from . import *`
__all__ = sorted(list(_available_fetchers.keys()))

# --- Összegző Log Üzenetek ---
logger.info(f"Fetchers package initialization (v3.5) finished.")
total_intended = len(set(_intended_exports)) # Use set to count unique intended exports
total_loaded = len(__all__)
# Using set for _failed_functions to count unique failures, as one function might fail for multiple reasons if retried or module fails.
# However, the _failed_functions list is built to be quite specific.
total_failed_funcs_count = len(set(f.split(' - ')[0] for f in _failed_functions)) # Count unique function specs that failed
total_failed_mods_count = len(_failed_modules)

logger.info(f"  Total fetcher functions/aliases intended for export: {total_intended}")
logger.info(f"  Successfully loaded & exported fetchers ({total_loaded}): {', '.join(__all__) if __all__ else 'None'}")

if total_failed_mods_count > 0:
    logger.warning(f"  Failed to load modules ({total_failed_mods_count}): {', '.join(sorted(list(set(_failed_modules))))}")

# Filter out function failures that are due to module load failures
# to avoid redundant reporting.
truly_failed_functions_in_loaded_modules = sorted(list(set(
    f_spec for f_spec in _failed_functions
    if not any(module_rel_path in f_spec for module_rel_path in _failed_modules)
)))

if truly_failed_functions_in_loaded_modules:
    logger.warning(
        f"  Unavailable functions due to errors within successfully loaded modules "
        f"({len(truly_failed_functions_in_loaded_modules)}): "
        f"{', '.join(truly_failed_functions_in_loaded_modules)}"
    )
elif total_failed_funcs_count > 0 and total_failed_mods_count > 0 :
     logger.info(f"  All function failures are likely due to the module import/load errors listed above.")
elif total_failed_funcs_count == 0 and total_failed_mods_count == 0:
    logger.info("  All intended fetchers loaded successfully.")


# --- Opcionális Tisztítás ---
# Törölhetjük a belső használatú változókat, hogy ne szennyezzék a névteret,
# bár ez egy __init__.py-ban kevésbé szokványos/szükséges, mivel a modul
# importálásakor ezek nem kerülnek automatikusan az importáló névterébe,
# csak az __all__ által meghatározott nevek (vagy ha expliciten importálják őket).
# Az `_` prefixű változók konvenció szerint belső használatra vannak.
#
# del importlib, sys, logging, MODULE_MAP, _available_fetchers, _intended_exports
# del _failed_modules, _failed_functions, module_rel_path, func_spec_list
# del module_name_for_logging, full_module_path_for_import, module, func_spec
# del original_name, alias_name, func, log_import_err, log_setup_err
# del e_import, e_getattr, e_mod_load, total_intended, total_loaded
# del total_failed_funcs_count, total_failed_mods_count, truly_failed_functions_in_loaded_modules