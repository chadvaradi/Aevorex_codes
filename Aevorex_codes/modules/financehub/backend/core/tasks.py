# backend/core/tasks.py

import asyncio
import httpx
import traceback
from typing import Optional

from modules.financehub.backend.celery_app import celery_app
from modules.financehub.backend.core.ticker_tape_service import update_ticker_tape_data_in_cache
from .cache_service import CacheService

from modules.financehub.backend.config import settings
from modules.financehub.backend.utils.logger_config import get_logger

logger = get_logger(__name__)
TASK_NAME = "backend.core.tasks.update_ticker_tape_cache"

@celery_app.task(name=TASK_NAME, bind=True, max_retries=2, default_retry_delay=30)
def update_ticker_tape_cache_task(self):
    log_prefix = f"[CeleryTask:{TASK_NAME}:{self.request.id}]"
    logger.info(f"{log_prefix} Starting execution...")

    try:
        async def run_update_async():
            cache_service: Optional[CacheService] = None
            # http_client_instance is managed by async with httpx.AsyncClient()

            try:
                logger.debug(f"{log_prefix} Creating task-specific CacheService instance...")
                try:
                    cache_service = await CacheService.create()
                    logger.info(f"{log_prefix} Task-specific CacheService initialized successfully.")
                except Exception as cache_init_err:
                    logger.critical(f"{log_prefix} CRITICAL FAILURE: Cannot create CacheService instance. Error: {cache_init_err}", exc_info=True)
                    raise RuntimeError("Failed to initialize Cache Service for task execution.") from cache_init_err

                logger.debug(f"{log_prefix} Creating transient HTTP client...")
                try:
                    # CORRECTED: Instantiate httpx.Timeout and httpx.Limits
                    timeout_config = httpx.Timeout(
                        timeout=settings.HTTP_CLIENT.REQUEST_TIMEOUT_SECONDS, # General timeout
                        connect=settings.HTTP_CLIENT.CONNECT_TIMEOUT_SECONDS,
                        # read and write can also be set if needed, using general timeout for them by default
                        pool=settings.HTTP_CLIENT.POOL_TIMEOUT_SECONDS
                    )
                    limits_config = httpx.Limits(
                        max_connections=settings.HTTP_CLIENT.MAX_CONNECTIONS,
                        max_keepalive_connections=settings.HTTP_CLIENT.MAX_KEEPALIVE_CONNECTIONS
                    )
                    headers = {
                        "User-Agent": settings.HTTP_CLIENT.USER_AGENT,
                        "Referer": str(settings.HTTP_CLIENT.DEFAULT_REFERER) # Ensure referer is string
                    }
                    
                    async with httpx.AsyncClient(
                        timeout=timeout_config, 
                        limits=limits_config, 
                        headers=headers, 
                        http2=True, # Assuming http2 is desired
                        follow_redirects=True
                    ) as client:
                        logger.info(f"{log_prefix} Transient HTTP client created. Proceeding with update logic...")
                        success = await update_ticker_tape_data_in_cache(
                            client=client,
                            cache=cache_service
                        )
                        logger.debug(f"{log_prefix} update_ticker_tape_data_in_cache returned: {success}")
                        return success

                except Exception as http_or_update_err:
                    logger.error(f"{log_prefix} Error during HTTP client creation or core update logic execution: {http_or_update_err}", exc_info=True)
                    raise RuntimeError("Failed during HTTP operation or core update logic.") from http_or_update_err

            finally:
                logger.debug(f"{log_prefix} Entering async finally block for resource cleanup.")
                if cache_service:
                    logger.info(f"{log_prefix} Closing task-specific CacheService connection...")
                    await cache_service.close()
                    logger.info(f"{log_prefix} CacheService cleanup completed.")
                else:
                    logger.debug(f"{log_prefix} No CacheService instance was created, skipping cleanup.")

        result = asyncio.run(run_update_async())

        if result:
            logger.info(f"{log_prefix} Task execution finished successfully.")
        else:
            logger.warning(f"{log_prefix} Task execution finished, but the update function reported failure or incomplete data (returned False).")

    except Exception as e:
        logger.error(f"{log_prefix} Unhandled exception during task execution: {e.__class__.__name__} - {e}", exc_info=True)
        try:
            logger.warning(f"{log_prefix} Task failed, attempting retry (attempt {self.request.retries + 1}/{self.max_retries})...")
            # Pylint might complain about self.default_retry_delay not being int, ensure it is
            # Celery docs suggest countdown can be float too, but int is safer if Celery version is older.
            retry_delay = int(self.default_retry_delay * (2 ** self.request.retries))
            self.retry(exc=e, countdown=retry_delay)
        except self.MaxRetriesExceededError:
            logger.critical(f"{log_prefix} Task failed after reaching max retries ({self.max_retries}). Giving up.")
        except Exception as retry_exc:
             logger.critical(f"{log_prefix} Failed to initiate retry mechanism: {retry_exc}", exc_info=True)

    logger.info(f"{log_prefix} Task function finished.")

logger.info(f"--- Celery Tasks module ({__name__}) loaded. Task '{TASK_NAME}' is registered. ---")