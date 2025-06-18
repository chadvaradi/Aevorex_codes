# backend/core/ai/api_callers.py
"""
Handles external API calls for AI services (e.g., OpenRouter).

Contains functions responsible for constructing requests, sending them,
and handling responses/errors for specific AI providers.
Version: 1.2.0 - Enhanced Robustness and Logging Consistency
"""

import httpx
import json
import traceback # For more detailed exception logging if needed (primarily used by logger's exc_info)
from typing import Dict, Any, Optional, Tuple, Final
import asyncio
import logging
from datetime import datetime, timezone
import time

# --- Central Configuration Import ---
from modules.financehub.backend.config import settings

# --- Absolute Imports (fixed from relative imports) ---
try:
    # Import using absolute paths from backend directory
    from modules.financehub.backend.config import settings
    from modules.financehub.backend.utils.logger_config import get_logger
except ImportError as e:
    # Fallback logger if core dependencies are missing
    logging.basicConfig(level=logging.ERROR)
    # Use a distinct name for this fallback logger
    fallback_logger = logging.getLogger("api_callers_fallback")
    fallback_logger.error(
        f"FATAL ERROR: Could not import dependencies in api_callers.py: {e}. "
        "Check Python path and project structure. Ensure 'backend' is on PYTHONPATH or use appropriate relative imports.",
        exc_info=True
    )
    # This error is critical for the module's operation.
    raise RuntimeError(f"API Callers failed to initialize due to missing core dependencies: {e}") from e

# Use the project-specific logger if available, otherwise a standard logger for this module
logger = get_logger(__name__) if 'get_logger' in globals() and callable(get_logger) else logging.getLogger(__name__)

logger.info(f"--- API Caller ({__name__}) module loaded. ---")

# --- Constants ---
OPENROUTER_API_URL: Final[str] = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_AI_TIMEOUT_SECONDS: Final[float] = 90.0 # Default timeout if not configured or invalid

# --- API Call Helper (Rewritten for Robustness and Clarity) ---

async def _call_openrouter_api(
    symbol: str,
    payload: Dict[str, Any],
    client: httpx.AsyncClient
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]:
    """
    Helper function to call the OpenRouter API with robust error handling and detailed logging.

    Args:
        symbol: Stock symbol or identifier (for logging context).
        payload: The request payload for the API.
        client: An active httpx.AsyncClient instance.

    Returns:
        Tuple: (response_json, error_message, status_code)
               - response_json (dict | None): Parsed JSON response if successful, else None.
               - error_message (str | None): A descriptive error message if failed, else None.
               - status_code (int | None): HTTP status code if a response was received, else None.
    """
    func_name = "_call_openrouter_api" # For consistent logging
    log_prefix = f"[{symbol}] [{func_name}]"

    logger.debug(f"{log_prefix}: Initiating API call.")

    api_key_value: Optional[str] = None
    headers: Dict[str, str] = {}
    timeout_seconds: float = DEFAULT_AI_TIMEOUT_SECONDS
    response_text: str = "" # To store response text for error logging

    # --- 1. Configuration Retrieval (API Key, Timeout, Headers) ---
    try:
        # API Key
        try:
            api_key_secret = settings.API_KEYS.OPENROUTER
            if not api_key_secret:
                err_msg = "CONFIG ERROR - OpenRouter API key (settings.API_KEYS.OPENROUTER) is not configured."
                logger.error(f"{log_prefix}: {err_msg}")
                logger.critical(f"{log_prefix}: CRITICAL - Returning due to missing API Key. Values: (None, '{err_msg}', None)")
                return None, err_msg, None # Cannot proceed without key
            
            api_key_value = api_key_secret.get_secret_value()
            if not api_key_value: # Should not happen if SecretStr is not empty, but good to check
                err_msg = "CONFIG ERROR - OpenRouter API key value is empty after retrieval. Ensure it's set in the environment/config."
                logger.error(f"{log_prefix}: {err_msg}")
                logger.critical(f"{log_prefix}: CRITICAL - Returning due to empty API Key value. Values: (None, '{err_msg}', None)")
                return None, err_msg, None
            logger.debug(f"{log_prefix}: OpenRouter API Key retrieved successfully.")
        except AttributeError as e_key:
            err_msg = f"CONFIG ERROR - Failed to access API key setting (settings.API_KEYS.OPENROUTER): {e_key}."
            logger.error(f"{log_prefix}: {err_msg}", exc_info=True)
            logger.critical(f"{log_prefix}: CRITICAL - Returning due to API Key AttributeError. Values: (None, '{err_msg}', None)")
            return None, err_msg, None

        # Headers
        try:
            # Ensure referer and title are accessed correctly and converted to string
            # These might be Pydantic specific types (e.g. HttpUrl) initially
            referer = str(settings.HTTP_CLIENT.DEFAULT_REFERER) if hasattr(settings.HTTP_CLIENT, 'DEFAULT_REFERER') else "N/A"
            app_title = str(settings.APP_META.TITLE) if hasattr(settings.APP_META, 'TITLE') else "N/A"

            headers = {
                "Authorization": f"Bearer {api_key_value}",
                "Content-Type": "application/json",
                "HTTP-Referer": referer, # OpenRouter specific recommended header
                "X-Title": app_title,     # OpenRouter specific recommended header
            }
            logger.debug(f"{log_prefix}: Headers constructed: Referer='{referer}', X-Title='{app_title}'")
        except AttributeError as e_headers:
            err_msg = f"CONFIG ERROR - Failed to access Header settings (Referer/Title): {e_headers}."
            logger.error(f"{log_prefix}: {err_msg}", exc_info=True)
            logger.critical(f"{log_prefix}: CRITICAL - Returning due to Header AttributeError. Values: (None, '{err_msg}', None)")
            return None, err_msg, None

        # Timeout
        try:
            timeout_val = settings.AI.TIMEOUT_SECONDS
            if isinstance(timeout_val, (int, float)) and timeout_val > 0:
                timeout_seconds = float(timeout_val)
            else:
                logger.warning(
                    f"{log_prefix}: AI timeout (settings.AI.TIMEOUT_SECONDS: {timeout_val}) is not a positive number. "
                    f"Using default: {DEFAULT_AI_TIMEOUT_SECONDS}s."
                )
                timeout_seconds = DEFAULT_AI_TIMEOUT_SECONDS
            logger.debug(f"{log_prefix}: AI Timeout set to {timeout_seconds}s.")
        except (AttributeError, ValueError, TypeError) as e_timeout:
            logger.warning(
                f"{log_prefix}: CONFIG WARNING - Failed to get/parse AI timeout setting: {e_timeout}. "
                f"Using default: {DEFAULT_AI_TIMEOUT_SECONDS}s."
            )
            timeout_seconds = DEFAULT_AI_TIMEOUT_SECONDS

    except Exception as e_config: # Catch-all for unexpected errors during configuration
        err_msg = f"UNEXPECTED CONFIGURATION-PHASE ERROR: {e_config.__class__.__name__} - {e_config}"
        logger.error(f"{log_prefix}: {err_msg}", exc_info=True)
        logger.critical(f"{log_prefix}: CRITICAL - Returning due to unexpected configuration error. Values: (None, '{err_msg}', None)")
        return None, err_msg, None

    # --- 2. Log Request Details ---
    model_name = payload.get('model', 'N/A')
    logger.info(f"{log_prefix}: Sending request to OpenRouter. Model: {model_name}, Timeout: {timeout_seconds}s.")
    # Log non-sensitive payload parts for debugging
    debug_payload = {k: v for k, v in payload.items() if k != 'messages'} # Exclude potentially large/sensitive messages
    logger.debug(f"{log_prefix}: Payload (excluding messages): {debug_payload}")


    # --- 3. Make API Call ---
    response_text: Optional[str] = None
    status_code: Optional[int] = None # Itt inicializáljuk, hogy mindig legyen értéke

    try:
        logger.debug(f"{log_prefix}: Sending request to OpenRouter. URL: {OPENROUTER_API_URL}, Model in Payload: {payload.get('model')}")
        response: httpx.Response = await client.post( # Explicit típus a response-nak
            OPENROUTER_API_URL,
            headers=headers, # Győződj meg róla, hogy ez a helyes változónév
            json=payload,
            timeout=timeout_seconds # Győződj meg róla, hogy ez a helyes változónév
        )
        status_code = response.status_code

        # Olvassuk ki a válasz szövegét. A httpx.Response.text property
        # szinkron módon adja vissza a dekódolt szöveget.
        # Nem szükséges 'await' itt, ha a válasz már teljesen megérkezett.
        try:
            response_text = response.text
            if response_text is None: # Ritka eset, de előfordulhat
                if response.content: # Ha van nyers tartalom
                    try:
                        response_text = response.content.decode('utf-8', errors='replace')
                        logger.debug(f"{log_prefix}: Response body was None, decoded from raw content.")
                    except Exception as decode_err:
                        logger.warning(f"{log_prefix}: Response body was None, failed to decode raw content (Status: {status_code}): {decode_err}")
                        response_text = f"[Failed to decode raw response content for status {status_code}]"
                else:
                    response_text = f"[No response body received for status {status_code}]"
                    logger.warning(f"{log_prefix}: {response_text}")
        except Exception as e_read_text:
            # Ez a blokk kevésbé valószínű, hogy lefut a .text property-vel,
            # de biztonsági hálónak jó.
            logger.warning(f"{log_prefix}: Exception while accessing response.text (Status: {status_code}): {e_read_text}", exc_info=True)
            response_text = f"[Error accessing response.text: {e_read_text}]"

        logger.debug(f"{log_prefix}: Received response. Status: {status_code}, Body Length: {len(response_text) if response_text else 0} chars.")
        # Ha nagyon részletes log kell a válaszról (pl. hibakereséshez):
        # if status_code != 200 or logger.isEnabledFor(logging.TRACE): # TRACE egyéni log szint
        #     logger.trace(f"{log_prefix}: Raw Response Body (Status {status_code}): {response_text}")

        # --- 4. Handle HTTP Status Codes ---
        # Specific error handling before raise_for_status for more tailored messages/logging
        if status_code == 401:
            err_msg = "OpenRouter API Error 401: Unauthorized. Check API Key validity and permissions."
            logger.error(f"{log_prefix}: {err_msg} Response: {response_text[:500]}")
            logger.critical(f"{log_prefix}: CRITICAL - Returning from 401 Unauthorized. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code
        if status_code == 402:
            err_msg = "OpenRouter API Error 402: Payment Required or Quota Exceeded. Check your OpenRouter account balance/limits."
            logger.warning(f"{log_prefix}: {err_msg} Response: {response_text[:500]}") # Warning, as it might be temporary or user-fixable
            logger.critical(f"{log_prefix}: CRITICAL - Returning from 402 Payment Required. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code
        if status_code == 403:
            err_msg = f"OpenRouter API Error 403: Forbidden. You might not have access to the model '{model_name}' or other permission issues."
            logger.error(f"{log_prefix}: {err_msg} Response: {response_text[:500]}")
            logger.critical(f"{log_prefix}: CRITICAL - Returning from 403 Forbidden. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code
        if status_code == 429:
            err_msg = "OpenRouter API Error 429: Rate Limit Exceeded. Too many requests. Try again later."
            logger.warning(f"{log_prefix}: {err_msg} Response: {response_text[:500]}") # Warning, as it's retryable
            logger.critical(f"{log_prefix}: CRITICAL - Returning from 429 Rate Limit. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code
        if status_code == 400:
            error_detail = "Invalid request structure or parameters."
            try:
                json_body = json.loads(response_text)
                # OpenRouter error format can be: {"error": {"message": "...", "type": "..."}}
                # or sometimes just {"error": "message string"}
                api_error_info = json_body.get("error")
                if isinstance(api_error_info, dict):
                    error_detail = api_error_info.get("message", error_detail)
                elif isinstance(api_error_info, str):
                    error_detail = api_error_info
            except json.JSONDecodeError:
                error_detail += f" (Non-JSON error response: {response_text[:200]})"
            except Exception as e_parse_400: # Catch any other parsing error
                 error_detail += f" (Error parsing 400 response body: {e_parse_400})"
            err_msg = f"OpenRouter API Error 400: Bad Request. Detail: {error_detail}"
            logger.error(f"{log_prefix}: {err_msg}. Sent Payload (Messages Excluded): {debug_payload}")
            logger.critical(f"{log_prefix}: CRITICAL - Returning from 400 Bad Request. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code
        if status_code >= 500: # 500, 502, 503, 504 etc.
            err_msg = f"OpenRouter Server Error {status_code}: The API provider encountered an issue. Try again later."
            logger.error(f"{log_prefix}: {err_msg} Response (first 500 chars): {response_text[:500]}")
            logger.critical(f"{log_prefix}: CRITICAL - Returning from {status_code} Server Error. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code

        # If status code wasn't handled above, check for other client/server errors (e.g., 404, 405, etc.)
        response.raise_for_status() # Raises HTTPStatusError for other 4xx/5xx not explicitly handled

        # --- 5. Process Successful Response (2xx) ---
        logger.debug(f"{log_prefix}: Status code {status_code} indicates success. Attempting JSON parsing...")
        try:
            result_data = json.loads(response_text) # Use json.loads on the read text
            if not isinstance(result_data, dict):
                err_msg = (f"OpenRouter returned a non-dictionary JSON response (Type: {type(result_data).__name__}) "
                           f"despite a {status_code} status. This is unexpected.")
                logger.error(f"{log_prefix}: {err_msg}. Response text: {response_text[:500]}")
                logger.critical(f"{log_prefix}: CRITICAL - Returning from Non-Dict JSON Success. Values: (None, '{err_msg}', {status_code})")
                return None, err_msg, status_code

            logger.info(f"{log_prefix}: OpenRouter request successful (Status: {status_code}). JSON parsed.")
            # Explicitly set error to None on success for clarity in the tuple
            logger.debug(f"{log_prefix}: SUCCESS - Returning with data. Values: ({'Not None' if result_data is not None else 'None'}, None, {status_code})")
            return result_data, None, status_code

        except json.JSONDecodeError as e_json:
            err_msg = f"Invalid JSON received from OpenRouter despite a {status_code} (success) status."
            logger.error(f"{log_prefix}: {err_msg} Error: {e_json}. Response text (first 500 chars): {response_text[:500]}", exc_info=False) # exc_info False as e_json is in msg
            logger.critical(f"{log_prefix}: CRITICAL - Returning from JSONDecodeError on Success Status. Values: (None, '{err_msg}', {status_code})")
            return None, err_msg, status_code

    # --- 6. Handle Exceptions During Request/Processing ---
    except httpx.TimeoutException:
        err_msg = f"OpenRouter request timed out after {timeout_seconds}s. The server did not respond in time."
        # Timeouts are often retryable, so warning level might be appropriate.
        logger.warning(f"{log_prefix}: {err_msg}")
        logger.critical(f"{log_prefix}: CRITICAL - Returning from TimeoutException. Values: (None, '{err_msg}', None)") # status_code is None
        return None, err_msg, None
    except httpx.HTTPStatusError as e_http: # Catches errors from raise_for_status() for unhandled 4xx/5xx
        # This should ideally be caught by specific status code checks above, but acts as a safety net.
        err_msg = f"Unhandled OpenRouter HTTP error: {e_http.response.status_code}. Message: {e_http.response.text[:200]}"
        logger.error(f"{log_prefix}: {err_msg}", exc_info=False) # exc_info False as details are in msg
        current_status_code = e_http.response.status_code
        logger.critical(f"{log_prefix}: CRITICAL - Returning from HTTPStatusError Exception. Values: (None, '{err_msg}', {current_status_code})")
        return None, err_msg, current_status_code
    except httpx.RequestError as e_req:
        # Network errors (DNS, connection refused, SSL errors, etc.) - More critical
        err_msg = f"OpenRouter network/request error: {e_req.__class__.__name__} - {e_req}. Check connectivity and API endpoint."
        logger.error(f"{log_prefix}: {err_msg}", exc_info=True) # Include traceback for network issues
        logger.critical(f"{log_prefix}: CRITICAL - Returning from RequestError Exception. Values: (None, '{err_msg}', None)") # status_code is None
        return None, err_msg, None
    except AttributeError as e_attr_runtime:
         # Catch potential AttributeErrors if settings are accessed in an unexpected way later, though primary checks are at the top
         err_msg = f"RUNTIME CONFIG ERROR during API call (AttributeError): {e_attr_runtime}. This might indicate a settings structure issue."
         logger.error(f"{log_prefix}: {err_msg}", exc_info=True)
         logger.critical(f"{log_prefix}: CRITICAL - Returning from RuntimeError AttributeError. Values: (None, '{err_msg}', None)")
         return None, err_msg, None
    except Exception as e_unhandled:
        # Catch-all for truly unexpected errors during the API call or response processing phase
        err_msg = f"Unexpected internal error during API call/processing: {e_unhandled.__class__.__name__} - {e_unhandled}."
        # Log with full traceback for unexpected errors
        logger.error(f"{log_prefix}: {err_msg}", exc_info=True)
        logger.critical(f"{log_prefix}: CRITICAL - Returning from Unhandled Exception. Values: (None, '{err_msg}', status_code if status_code is not None else None)") # Use status_code if available
        return None, err_msg, status_code # Return status_code if it was set before the unhandled exception