# backend/celery_app.py
# -*- coding: utf-8 -*-
"""
Celery Application Setup for Aevorex FinBot Backend (v2.1 - Config-Aware).

Initializes the Celery application instance ('celery_app'), loads configuration
directly from the central 'settings' object (provided by backend.config),
configures Redis broker/backend using derived URLs from settings,
sets up task discovery for 'backend.core.tasks', and defines the
Celery Beat schedule for periodic tasks like ticker tape updates.
"""

import sys
from datetime import timedelta
import logging # Import logging for potential setup issues

# --- Core Celery Import ---
from celery import Celery

# --- Kritikus Első Lépés: Konfiguráció és Logging ---
# Biztosítjuk, hogy a központi konfiguráció és a logger elérhető legyen.
# A Celery worker/beat külön folyamat, így itt is importálni kell őket.
try:
    # Központi, validált beállítások importálása a config modulból
    from modules.financehub.backend.config import settings # Itt már a validált 'settings' objektumot kapjuk meg
    # Projekt szintű logger lekérése
    from modules.financehub.backend.utils.logger_config import get_logger

    # Logger példányosítása ehhez a modulhoz
    # Fontos, hogy a logger már be legyen állítva (a config importálása során meg kellett történnie)
    logger = get_logger(__name__) # __name__ will be "backend.celery_app"

    logger.info(f"--- Initializing Celery Application Setup (using pre-validated settings from modules.financehub.backend.config) ---")
    logger.info(f"Environment detected from settings: {settings.ENVIRONMENT.NODE_ENV}")

except ImportError as e:
    # Ha a config vagy a logger nem importálható, az végzetes hiba.
    logging.critical(f"FATAL Celery Setup Error: Failed to import core modules (modules.financehub.backend.config / modules.financehub.backend.utils.logger_config): {e}", exc_info=True)
    sys.exit(f"Celery setup halted due to missing core modules: {e}")
except AttributeError as e:
     # Ha a settings objektum valamiért None lenne (bár a config.py ezt elvileg megakadályozza)
     logging.critical(f"FATAL Celery Setup Error: The 'settings' object from modules.financehub.backend.config is not available or invalid: {e}", exc_info=True)
     sys.exit(f"Celery setup halted because the settings object could not be accessed.")
except Exception as e:
    logging.critical(f"FATAL Celery Setup Error: Unexpected error during initial imports: {e}", exc_info=True)
    sys.exit(f"Celery setup halted due to unexpected error during initial imports: {e}")


# --- Celery Konfiguráció Lekérése a Settingsből ---
# A config.py már validálta ezeket és property-ként elérhetővé teszi.
try:
    # Közvetlenül a settings objektumból olvassuk a property-ket
    broker_url = settings.REDIS.CELERY_BROKER_URL
    backend_url = settings.REDIS.CELERY_RESULT_BACKEND

    logger.info(f"Using Celery Broker URL (from settings.REDIS): {broker_url}")
    logger.info(f"Using Celery Result Backend URL (from settings.REDIS): {backend_url}")

    # Szükséges task modul
    # Ellenőrizzük, hogy a config.py-ban a PATHS helyesen van-e beállítva,
    # hogy a Python megtalálja a 'backend.core.tasks' modult.
    # Ez általában a projekt struktúrájából adódik, ha a PYTHONPATH helyes.
    task_include_module = 'backend.core.tasks'
    logger.info(f"Celery will include tasks from: ['{task_include_module}']")

    # Ticker tape frissítési intervallum
    ticker_tape_interval = float(settings.TICKER_TAPE.UPDATE_INTERVAL_SECONDS)
    ticker_tape_task_name = 'backend.core.tasks.update_ticker_tape_cache' # Ez a név a tasks.py-ban kell legyen
    logger.info(f"Ticker tape update task '{ticker_tape_task_name}' scheduled every {ticker_tape_interval} seconds.")

except AttributeError as e:
    logger.critical(f"FATAL Celery Setup Error: Missing required configuration attribute in 'settings' object. Details: {e}", exc_info=True)
    logger.critical("Please ensure your modules.financehub.backend.config.py defines all necessary nested models and attributes (like REDIS.CELERY_BROKER_URL, TICKER_TAPE.UPDATE_INTERVAL_SECONDS, etc.).")
    sys.exit(f"Celery setup halted due to missing configuration attribute: {e}")
except Exception as e:
     logger.critical(f"FATAL Celery Setup Error: Unexpected error retrieving configuration values from 'settings': {e}", exc_info=True)
     sys.exit(f"Celery setup halted due to error retrieving configuration: {e}")

# --- Celery Alkalmazás Példányosítása ---
# A `celery_app` nevet használjuk konvenció szerint.
try:
    celery_app = Celery(
        main='aevorex_finbot_backend', # Celery alkalmazás neve
        broker=broker_url,
        backend=backend_url,
        include=[task_include_module] # Modul, ahol a taskokat keresse
    )
    logger.info(f"Celery application '{celery_app.main}' instance created successfully.")

except Exception as celery_init_err:
    logger.critical(f"FATAL Celery Setup Error: Failed to instantiate Celery app: {celery_init_err}", exc_info=True)
    sys.exit(f"Celery setup halted during app instantiation: {celery_init_err}")


# --- Alapvető Celery Konfigurációk Alkalmazása (`.conf.update()`) ---
# Ezek a beállítások finomhangolják a Celery működését.
logger.info("Applying additional Celery configurations...")
celery_app.conf.update(
    task_serializer='json',             # Ajánlott szerializáló
    result_serializer='json',           # Ajánlott szerializáló
    accept_content=['json'],            # Csak JSON-t fogadunk el
    task_track_started=True,            # Nyomon követi a task indítását
    task_acks_late=True,                # Task csak sikeres futás után nyugtázódik (megbízhatóság)
    worker_prefetch_multiplier=1,       # Csak 1 taskot kér le előre (jó hosszú vagy I/O taskoknál)
    result_expires=timedelta(days=1),   # Eredmények megőrzési ideje (pl. 1 nap)

    timezone='UTC',                     # Ajánlott időzóna a konzisztenciáért
    enable_utc=True,                    # Kényszeríti az UTC használatát

    broker_connection_retry_on_startup=True, # Indításkor próbáljon újracsatlakozni

    # --- Beat Scheduler ---
    # Ha django-celery-beat-et használsz, akkor a settings.py-ban (vagy itt) kell beállítani:
    # beat_scheduler='django_celery_beat.schedulers:DatabaseScheduler',
    # Ha redbeat-et:
    # beat_scheduler='redbeat.RedBeatScheduler',
    # Ha a default PersistentScheduler (fájl alapú) elég, akkor ez a sor kihagyható.
    # Fontos: a `celery beat` parancsnál is meg kell adni a megfelelő `-S <scheduler_type>` kapcsolót!
    # Pl. `celery -A backend.celery_app:celery_app beat -S django`
    # VAGY `celery -A backend.celery_app:celery_app beat -S redbeat`
    # Ha nincs megadva, a default PersistentScheduler-t használja.
)
logger.info("Additional Celery configurations applied.")
logger.debug(f"Celery Conf (partial): timezone={celery_app.conf.timezone}, enable_utc={celery_app.conf.enable_utc}, task_acks_late={celery_app.conf.task_acks_late}")


# --- Periodikus Taskok Ütemezése (Celery Beat Schedule) ---
# Itt definiáljuk a rendszeresen futtatandó taskokat.
logger.info("Defining Celery Beat schedule...")
celery_app.conf.beat_schedule = {
    # A schedule bejegyzés neve (legyen egyedi és beszédes)
    'update-ticker-tape-cache-periodic': {
        # A futtatandó task azonosítója (a @task dekorátor `name` paramétere VAGY a teljes elérési út)
        'task': ticker_tape_task_name, # A fent validált név
        # Ütemezés: `timedelta` használatával az intervallum másodpercben
        'schedule': timedelta(seconds=ticker_tape_interval),
        # 'args': (arg1, arg2), # Ha a task fogad argumentumokat
        # 'kwargs': {'param': value}, # Ha keyword argumentumokat fogad
        'options': {
            # 'queue': 'periodic_tasks', # Opcionálisan külön sorba tehető
            # 'expires': ticker_tape_interval * 0.9, # Opcionálisan lejárati idő (pl. intervallum 90%-a)
        }
    },
    # --- Ide jöhetnek további ütemezett taskok ---
    # 'cleanup_job_results': {
    #     'task': 'backend.core.tasks.cleanup_old_job_results',
    #     'schedule': crontab(hour=4, minute=30), # Minden nap 4:30-kor (from celery.schedules import crontab)
    # },
}

# Logoljuk a definiált ütemezést az átláthatóság kedvéért
log_schedule_details = "\n".join([
    f"  - '{name}': runs every {entry['schedule']} -> task: {entry['task']}"
    for name, entry in celery_app.conf.beat_schedule.items()
])
if log_schedule_details:
    logger.info(f"Defined Celery Beat schedule:\n{log_schedule_details}")
else:
    logger.info("No periodic tasks defined in Celery Beat schedule.")


# --- Záró Log Üzenet ---
logger.info("--- Celery Application Setup Complete ---")
logger.info(f"Celery app '{celery_app.main}' is configured and ready.")
logger.info("Instructions:")
logger.info(f"  Start Worker: celery -A backend.celery_app:celery_app worker --loglevel=info")
logger.info(f"  Start Beat:   celery -A backend.celery_app:celery_app beat --loglevel=info [Optional: -S scheduler_type]")
logger.info("Ensure Redis is running and accessible.")

# Nincs szükség további kódra itt, a 'celery_app' példányt importálják a futtató parancsok.