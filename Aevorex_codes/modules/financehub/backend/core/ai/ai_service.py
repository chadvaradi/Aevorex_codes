# backend/core/ai/ai_service.py
# ============================================================================
# Aevorex FinBot AI Service (v2.1.0)
# ============================================================================
# 
# Responsibilities:
# - Orchestrates AI analysis for stock data using configured LLM providers
# - Manages prompt generation, API calling, response processing, and error handling
# - Provides streaming and non-streaming analysis capabilities
# - Integrates with external AI services (OpenAI, Claude, etc.)
# - Supports multiple AI providers with fallback mechanisms
# ============================================================================

import asyncio
import logging
from typing import Optional, Dict, Any, AsyncGenerator, List, Tuple

# Core imports with settings
from modules.financehub.backend.config import settings

import httpx
import time
import pandas as pd
import json
import logging # Alap logging, ha a sajátunk még nem elérhető
from typing import Dict, Any, List, Optional, Tuple, Final, TypedDict

from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type, before_sleep_log

# --- Külső importok (szülő könyvtárakból) ---
try:
    from modules.financehub.backend.utils.logger_config import get_logger
    from modules.financehub.backend.models.stock import NewsItem, CompanyOverview, FinancialsData, EarningsData
except ImportError as e:
    logging.basicConfig(level=logging.ERROR)
    logging.error(f"FATAL ERROR [ai_service_v3]: Could not import external dependencies: {e}. Check project structure.", exc_info=True)
    raise RuntimeError(f"AI Service failed initialization due to missing core dependencies: {e}") from e

# --- Belső importok (az 'ai' csomagon belül) ---
try:
    from .prompt_generators import generate_ai_prompt_premium
    from .api_callers import _call_openrouter_api # Feltételezzük, hogy ez a függvény létezik és a specifikáció szerint működik
except ImportError as e:
    try:
        # Ha get_logger már betöltődött, használjuk azt
        internal_logger = get_logger(__name__ + "_init_internal") # Egyedi név, hogy ne ütközzön
        internal_logger.error(f"FATAL ERROR [ai_service_v3]: Could not import internal AI modules: {e}. Check 'ai' package structure.", exc_info=True)
    except NameError:
        logging.error(f"FATAL ERROR [ai_service_v3]: Could not import internal AI modules: {e}. Check 'ai' package structure.", exc_info=True)
    raise RuntimeError(f"AI Service failed initialization due to missing internal AI dependencies: {e}") from e

# --- Logger és Konstansok ---
logger = get_logger(__name__) # Logger inicializálása a modulhoz
SERVICE_FUNC_NAME: Final[str] = "generate_ai_summary_v3" # Verziózott név a logokban

# --- Egyedi Kivétel az Újrapróbálkozáshoz ---
class AIServiceRetryableError(Exception):
    """Custom exception to signal tenacity to retry the main orchestration function."""
    pass

# --- Típusdefiníciók ---
class ModelConfig(TypedDict):
    id: str
    name: str
    max_tokens: int
    temperature: float

# Hibakezelési üzenetek (felhasználóbarát)
ERROR_MSG_CONFIG: Final[str] = "AI elemzés nem elérhető (Konfigurációs hiba)"
ERROR_MSG_DISABLED: Final[str] = "AI elemzés kikapcsolva."
ERROR_MSG_PROVIDER_UNSUPPORTED: Final[str] = "AI elemzés nem támogatott a konfigurált szolgáltatóval."
ERROR_MSG_NO_MODELS_CONFIGURED: Final[str] = "AI elemzés nem elérhető (Nincs AI modell konfigurálva)."
ERROR_MSG_PROMPT_GENERATION_FAILED: Final[str] = "AI elemzés hiba (Prompt generálás sikertelen)"
ERROR_MSG_PROMPT_EMPTY: Final[str] = "AI elemzés hiba (Üres prompt)"
ERROR_MSG_PROMPT_UNEXPECTED: Final[str] = "AI elemzés hiba (Váratlan prompt generálási hiba)"
ERROR_MSG_PAYLOAD_ERROR: Final[str] = "AI elemzés hiba (Payload előkészítés sikertelen)"
ERROR_MSG_API_CALL_UNEXPECTED: Final[str] = "AI elemzés hiba (Váratlan API hívási hiba)"
ERROR_MSG_API_RESPONSE_ERROR: Final[str] = "AI elemzés hiba (API hiba vagy üres válasz)" # Összevont hiba API oldalról
ERROR_MSG_ALL_MODELS_FAILED: Final[str] = "AI elemzés jelenleg nem elérhető (Minden konfigurált AI modell sikertelen volt)."

ERROR_MSG_PARSING_STRUCTURE: Final[str] = "AI Hiba: Válasz feldolgozása sikertelen (Struktúra hiba)"
ERROR_MSG_PARSING_CONTENT_FILTER: Final[str] = "AI Hiba: Tartalom szűrve a szolgáltató által"
ERROR_MSG_PARSING_TOO_LONG: Final[str] = "AI Hiba: Válasz túl hosszú (max token limit)"
ERROR_MSG_PARSING_EMPTY: Final[str] = "AI Hiba: Üres válasz érkezett"
ERROR_MSG_PARSING_UNEXPECTED: Final[str] = "AI Hiba: Váratlan belső hiba (Válasz feldolgozás)"


# --- Fő Orchestrátor Függvény ---
@retry(
    wait=wait_exponential(multiplier=1, min=settings.AI.RETRY_MIN_WAIT_SECONDS, max=settings.AI.RETRY_MAX_WAIT_SECONDS),
    stop=stop_after_attempt(settings.AI.RETRY_MAX_ATTEMPTS),
    retry=retry_if_exception_type(AIServiceRetryableError),
    before_sleep=before_sleep_log(logger, logging.WARNING), # Logolás figyelmeztetésként újrapróbálkozás előtt
    reraise=True # Fontos, hogy az utolsó kivételt tovább dobja, ha minden kísérlet sikertelen
)
async def generate_ai_summary(
    symbol: str,
    df_with_indicators: Optional[pd.DataFrame],
    latest_indicators: Optional[Dict[str, Any]],
    news_items: Optional[List[NewsItem]],
    company_overview: Optional[CompanyOverview],
    client: httpx.AsyncClient,
    financials_data: Optional[FinancialsData] = None,
    earnings_data: Optional[EarningsData] = None
) -> str:
    """
    Generates an AI-powered stock summary using configured primary and fallback providers (robust v3).

    Orchestrates prompt generation, API calls with model fallback, response parsing,
    error handling, and retry mechanisms. Relies on centralized settings and provides detailed logging.

    Args:
        symbol: Stock symbol.
        df_with_indicators: DataFrame with price data and indicators.
        latest_indicators: Dictionary of the most recent indicator values.
        news_items: List of recent NewsItem objects.
        company_overview: CompanyOverview object with fundamental data.
        client: An active httpx.AsyncClient instance.
        financials_data: Optional financial data.
        earnings_data: Optional earnings data.

    Returns:
        A string containing the AI-generated summary or a user-friendly error message.

    Raises:
        AIServiceRetryableError: If a transient API error occurs that warrants a retry of the entire process.
        RuntimeError: For critical unrecoverable errors during initialization.
    """
    log_prefix = f"[{symbol}] [{SERVICE_FUNC_NAME}]"
    logger.info(f"{log_prefix} Orchestration started. Attempt: {generate_ai_summary.retry.statistics.get('attempt_number', 1)}")
    overall_start_time = time.monotonic()

    # === 1. Előzetes Ellenőrzések (Globális Konfiguráció) ===
    try:
        if not settings.AI.ENABLED:
            logger.info(f"{log_prefix} Skipping: AI features globally disabled (settings.AI.ENABLED=False).")
            return ERROR_MSG_DISABLED
        if settings.AI.PROVIDER != "openrouter": # Jelenleg csak openrouter támogatott
            logger.warning(f"{log_prefix} Skipping: Unsupported AI provider '{settings.AI.PROVIDER}'. Only 'openrouter' is supported.")
            return ERROR_MSG_PROVIDER_UNSUPPORTED.replace("konfigurált", f"'{settings.AI.PROVIDER}'")
    except AttributeError as config_err:
        logger.error(f"{log_prefix} CONFIGURATION ERROR accessing global AI settings: {config_err}", exc_info=True)
        return ERROR_MSG_CONFIG

    # === 2. Modell Konfigurációk Előkészítése (Primary & Fallback) ===
    models_to_try: List[ModelConfig] = []
    try:
        # Elsődleges modell
        if settings.AI.MODEL_NAME_PRIMARY and settings.AI.MAX_TOKENS_PRIMARY:
            models_to_try.append({
                "id": "primary",
                "name": settings.AI.MODEL_NAME_PRIMARY,
                "max_tokens": settings.AI.MAX_TOKENS_PRIMARY,
                "temperature": getattr(settings.AI, 'TEMPERATURE_PRIMARY', settings.AI.TEMPERATURE)
            })
        else:
            logger.warning(f"{log_prefix} Primary AI model (MODEL_NAME_PRIMARY) is not fully configured. Skipping.")

        # Fallback modell
        if settings.AI.MODEL_NAME_FALLBACK and settings.AI.MAX_TOKENS_FALLBACK:
            models_to_try.append({
                "id": "fallback",
                "name": settings.AI.MODEL_NAME_FALLBACK,
                "max_tokens": settings.AI.MAX_TOKENS_FALLBACK,
                "temperature": getattr(settings.AI, 'TEMPERATURE_FALLBACK', settings.AI.TEMPERATURE)
            })
        else:
            logger.warning(f"{log_prefix} Fallback AI model (MODEL_NAME_FALLBACK) is not fully configured. Skipping.")

    except AttributeError as e:
        logger.error(f"{log_prefix} CONFIGURATION ERROR: Missing AI model settings (primary/fallback/temperature): {e}", exc_info=True)
        return ERROR_MSG_CONFIG

    if not models_to_try:
        logger.error(f"{log_prefix} CONFIGURATION ERROR: No AI models (primary or fallback) are configured for use.")
        return ERROR_MSG_NO_MODELS_CONFIGURED

    # === 3. Prompt Generálása ===
    prompt: Optional[str] = None
    try:
        logger.debug(f"{log_prefix} Generating prompt...")
        prompt_start_time = time.monotonic()
        prompt = await generate_ai_prompt_premium(
            symbol=symbol,
            df_recent=df_with_indicators,
            latest_indicators=latest_indicators,
            news_items=news_items,
            company_overview=company_overview,
            financials_data=financials_data, # Átadva
            earnings_data=earnings_data      # Átadva
        )
        prompt_duration = time.monotonic() - prompt_start_time
        logger.debug(f"{log_prefix} Prompt generation finished in {prompt_duration:.3f}s.")

        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            logger.error(f"{log_prefix} Prompt generation returned None, not a string, or empty/whitespace.")
            return ERROR_MSG_PROMPT_EMPTY
        logger.info(f"{log_prefix} Prompt generated successfully (length: {len(prompt)}).")
    except ValueError as ve:
        logger.error(f"{log_prefix} Prompt generation failed with ValueError: {ve}", exc_info=False) # exc_info=False, ha a ve már tartalmazza a lényeget
        return ERROR_MSG_PROMPT_GENERATION_FAILED
    except Exception as e_prompt:
        logger.error(f"{log_prefix} UNEXPECTED error during prompt generation: {e_prompt}", exc_info=True)
        return ERROR_MSG_PROMPT_UNEXPECTED

    # === 4. Modell Ciklus (Próbálkozás az API hívással Primary, majd Fallback modellel) ===
    last_api_error_details: str = "No API call attempted or error details not captured."

    for model_config in models_to_try:
        model_id_str = model_config["id"]
        model_name = model_config["name"]
        log_prefix_model = f"{log_prefix} [{model_id_str.upper()} Model: {model_name}]"

        logger.info(f"{log_prefix_model} Attempting API call.")

        # === 4.1 API Payload Előkészítése (Modell-specifikus) ===
        payload: Dict[str, Any]
        try:
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}], # Prompt már ellenőrzötten string
                "temperature": model_config["temperature"],
                "max_tokens": model_config["max_tokens"],
                "stream": False, # Streamelés jelenleg nem támogatott ebben a logikában
            }
            logger.debug(f"{log_prefix_model} Payload prepared. Max_tokens={payload['max_tokens']}, Temp={payload['temperature']}.")
        except Exception as e_payload: # Általános hiba itt is lehet, bár a config már ellenőrzött
            logger.error(f"{log_prefix_model} UNEXPECTED error preparing API payload: {e_payload}", exc_info=True)
            last_api_error_details = f"Payload preparation failed for {model_id_str} model. Error: {e_payload}"
            continue # Következő modell

        # === 4.2 AI API Hívása ===
        api_result: Optional[Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]] = None
        result_data: Optional[Dict[str, Any]] = None
        error_message_from_api: Optional[str] = None
        status_code_from_api: Optional[int] = None

        try:
            api_call_start_time = time.monotonic()
            api_result = await _call_openrouter_api(symbol, payload, client)
            api_call_duration = time.monotonic() - api_call_start_time

            if api_result:
                result_data, error_message_from_api, status_code_from_api = api_result
                logger.info(f"{log_prefix_model} API call completed in {api_call_duration:.3f}s. Status: {status_code_from_api}. Error msg: '{error_message_from_api}'. Data received: {result_data is not None}.")
            else:
                # Ez nem lenne szabad, hogy előforduljon, ha _call_openrouter_api mindig Tuple-t ad vissza
                logger.error(f"{log_prefix_model} API caller (_call_openrouter_api) returned None unexpectedly after {api_call_duration:.3f}s.")
                last_api_error_details = f"API caller returned None for {model_id_str} model."
                # Ezt tekinthetjük újrapróbálható hibának, ha pl. hálózati anomália okozta a hívóban
                if settings.AI.RETRY_ON_CALLER_UNEXPECTED_NONE:
                    raise AIServiceRetryableError(last_api_error_details)
                continue # Következő modell

        except httpx.TimeoutException as e_timeout:
            api_call_duration = time.monotonic() - api_call_start_time
            logger.warning(f"{log_prefix_model} API call TIMEOUT after {api_call_duration:.3f}s: {e_timeout}", exc_info=False)
            last_api_error_details = f"API call timeout for {model_id_str} model. Error: {e_timeout}"
            raise AIServiceRetryableError(last_api_error_details) from e_timeout # Újrapróbálható
        except httpx.RequestError as e_req_err: # Pl. NetworkError, ConnectError
            api_call_duration = time.monotonic() - api_call_start_time
            logger.warning(f"{log_prefix_model} API call REQUEST ERROR after {api_call_duration:.3f}s: {e_req_err}", exc_info=False)
            last_api_error_details = f"API call request error for {model_id_str} model. Error: {e_req_err}"
            raise AIServiceRetryableError(last_api_error_details) from e_req_err # Újrapróbálható
        except Exception as e_api_call:
            api_call_duration = time.monotonic() - (api_call_start_time if 'api_call_start_time' in locals() else overall_start_time)
            logger.error(f"{log_prefix_model} UNEXPECTED error during API call execution or result unpacking after {api_call_duration:.3f}s: {e_api_call}", exc_info=True)
            last_api_error_details = f"Unexpected API call error for {model_id_str} model. Error: {e_api_call}"
            # Dönthetünk úgy, hogy ez is újrapróbálható, de óvatosan
            if settings.AI.RETRY_ON_CALLER_UNEXPECTED_EXCEPTION:
                 raise AIServiceRetryableError(last_api_error_details) from e_api_call
            continue # Következő modell

        # === 4.3 API Válasz Kezdeti Ellenőrzése (Modell-specifikus) ===
        # Kezeljük a státuszkódokat
        if status_code_from_api:
            if 500 <= status_code_from_api < 600: # Szerver oldali hibák (5xx)
                logger.warning(f"{log_prefix_model} API returned server error (Status: {status_code_from_api}). Error: {error_message_from_api}.")
                last_api_error_details = f"Server error ({status_code_from_api}) from {model_id_str} model. Msg: {error_message_from_api}"
                raise AIServiceRetryableError(last_api_error_details) # Újrapróbálható
            if status_code_from_api == 429: # Rate limit
                logger.warning(f"{log_prefix_model} API rate limit hit (Status: 429). Error: {error_message_from_api}.")
                last_api_error_details = f"Rate limit (429) with {model_id_str} model. Msg: {error_message_from_api}"
                raise AIServiceRetryableError(last_api_error_details) # Újrapróbálható
            # Egyéb nem 2xx hibák (pl. 400, 401, 403, 404) - ezek általában nem újrapróbálhatók a teljes folyamat szintjén
            if not (200 <= status_code_from_api < 300):
                logger.warning(f"{log_prefix_model} API call failed with client-side or unhandled status (Status: {status_code_from_api}). Error: {error_message_from_api}.")
                last_api_error_details = f"Client-side/unhandled error ({status_code_from_api}) from {model_id_str} model. Msg: {error_message_from_api}"
                # Itt nem dobunk AIServiceRetryableError-t, hanem a fallback modellre lépünk (ha van)
                continue # Következő modell

        # Ha volt error_message_from_api, de a status_code rendben volt (furcsa, de kezeljük)
        if error_message_from_api and (200 <= (status_code_from_api or 0) < 300):
            logger.warning(f"{log_prefix_model} API reported an error message despite a 2xx status. Msg: '{error_message_from_api}'. Status: {status_code_from_api}. Treating as failure.")
            last_api_error_details = f"API error message ('{error_message_from_api}') with 2xx status from {model_id_str} model."
            continue # Következő modell

        # Ha nincs adat
        if result_data is None:
            logger.warning(f"{log_prefix_model} API call returned no data (result_data is None) despite successful status ({status_code_from_api}).")
            last_api_error_details = f"No data received from {model_id_str} model (status: {status_code_from_api})."
            # Esetleg ez is lehet újrapróbálható, ha gyanúsan átmeneti
            if settings.AI.RETRY_ON_NO_DATA_WITH_SUCCESS_STATUS:
                 raise AIServiceRetryableError(last_api_error_details)
            continue # Következő modell


        # === 4.4 Sikeres Válasz Feldolgozása (Tartalom Kinyerése) ===
        parsing_start_time = time.monotonic()
        try:
            logger.debug(f"{log_prefix_model} Parsing successful API response...")
            content_raw: Optional[str] = None
            content: str = ""
            finish_reason: str = "unknown"

            if not isinstance(result_data, dict):
                logger.error(f"{log_prefix_model} Invalid response structure: result_data is not a dict (Type: {type(result_data)}).")
                last_api_error_details = f"Response structure error (not dict) from {model_id_str} model."
                # Nem retryable, valószínűleg a _call_openrouter_api rosszul adja vissza
                continue

            choices = result_data.get("choices")
            if not isinstance(choices, list) or not choices:
                api_error_obj = result_data.get("error")
                if api_error_obj and isinstance(api_error_obj, dict):
                    err_msg = api_error_obj.get('message', 'Unknown API error object')
                    logger.error(f"{log_prefix_model} API returned error object instead of 'choices': {err_msg}. Full error: {api_error_obj}")
                    last_api_error_details = f"API error object from {model_id_str}: {err_msg}"
                else:
                    logger.error(f"{log_prefix_model} Invalid response: 'choices' missing, not a list, or empty. Value: {choices}")
                    last_api_error_details = f"Missing/invalid 'choices' from {model_id_str} model."
                # Ez lehet modell-specifikus hiba (pl. túlterhelés, rossz kérés), nem feltétlenül újrapróbálható globálisan
                # de a fallback miatt folytatjuk
                continue

            first_choice = choices[0]
            if not isinstance(first_choice, dict):
                logger.error(f"{log_prefix_model} Invalid response: First choice item not a dict. Value: {first_choice}")
                last_api_error_details = f"Invalid first choice item from {model_id_str} model."
                continue

            finish_reason = first_choice.get("finish_reason", "unknown")
            logger.debug(f"{log_prefix_model} API Finish Reason: '{finish_reason}'")

            ai_message = first_choice.get("message")
            if not isinstance(ai_message, dict):
                logger.error(f"{log_prefix_model} Invalid response: 'message' object missing or not a dict. Value: {ai_message}. Finish: '{finish_reason}'")
                last_api_error_details = f"Missing/invalid 'message' object from {model_id_str} (finish: {finish_reason})."
                if finish_reason == 'length': return ERROR_MSG_PARSING_TOO_LONG # Végleges hiba
                elif finish_reason == 'content_filter': return ERROR_MSG_PARSING_CONTENT_FILTER # Végleges hiba
                continue

            content_raw = ai_message.get("content")
            if not isinstance(content_raw, str):
                logger.warning(f"{log_prefix_model} 'content' field missing or not a string (Type: {type(content_raw)}). Finish: '{finish_reason}'.")
                last_api_error_details = f"Missing/invalid 'content' (type: {type(content_raw)}) from {model_id_str} (finish: {finish_reason})."
                if finish_reason == 'length': return ERROR_MSG_PARSING_TOO_LONG
                elif finish_reason == 'content_filter': return ERROR_MSG_PARSING_CONTENT_FILTER
                continue

            content = content_raw.strip()
            if not content:
                logger.warning(f"{log_prefix_model} AI summary content is empty after stripping. Finish: '{finish_reason}'.")
                if finish_reason == 'length': return ERROR_MSG_PARSING_TOO_LONG
                elif finish_reason == 'content_filter': return ERROR_MSG_PARSING_CONTENT_FILTER
                # Egyébként üres választ adott, ami lehet hiba
                last_api_error_details = f"Empty content from {model_id_str} (finish: {finish_reason})."
                user_msg = f"{ERROR_MSG_PARSING_EMPTY} (AI Modell: {model_id_str}, Leállás oka: {finish_reason})"
                # Ha az elsődleges modell ad üres választ, és van fallback, próbáljuk meg azt
                if model_id_str == "primary" and any(m['id'] == "fallback" for m in models_to_try):
                    logger.info(f"{log_prefix_model} Primary model returned empty content. Trying fallback.")
                    continue
                return user_msg # Ha ez a fallback, vagy nincs több, akkor ez a hiba

            # === SIKER: Tartalom kinyerve és nem üres ===
            parsing_duration = time.monotonic() - parsing_start_time
            total_duration = time.monotonic() - overall_start_time
            logger.info(f"{log_prefix_model} AI summary successfully extracted and processed in {parsing_duration:.3f}s. Finish Reason: '{finish_reason}'.")
            logger.info(f"{log_prefix} Total AI phase duration (successful with {model_id_str} model): {total_duration:.3f}s.")
            # logger.debug(f"{log_prefix_model} Returning content (first 150 chars): '{content[:150]}...'")
            return content

        except (KeyError, IndexError, TypeError, AttributeError, ValueError) as e_parse:
            parsing_duration = time.monotonic() - parsing_start_time
            logger.error(f"{log_prefix_model} Error parsing successful-looking AI response structure after {parsing_duration:.3f}s: {e_parse}", exc_info=False) # exc_info=False, az e_parse már tartalmazza
            try:
                response_preview = json.dumps(result_data, indent=2, ensure_ascii=False, default=str)[:1000]
                logger.error(f"{log_prefix_model} Problematic response data preview (parse error):\n{response_preview}")
            except Exception:
                logger.error(f"{log_prefix_model} Could not serialize problematic response data for logging (parse error).")
            last_api_error_details = f"Response parsing error (Key/Index/Type etc.) for {model_id_str} model. Error: {e_parse}"
            # Ez valószínűleg nem újrapróbálható, inkább a fallback-re lépünk
            continue
        except Exception as e_unhandled_parse:
            parsing_duration = time.monotonic() - parsing_start_time
            logger.error(f"{log_prefix_model} UNEXPECTED error processing AI response after {parsing_duration:.3f}s: {e_unhandled_parse}", exc_info=True)
            last_api_error_details = f"Unexpected response processing error for {model_id_str} model. Error: {e_unhandled_parse}"
            # Ez sem biztos, hogy újrapróbálható, inkább fallback
            continue

    # === 5. Ha a ciklus végére érünk, és egyik modell sem adott sikeres választ ===
    total_duration_failure = time.monotonic() - overall_start_time
    logger.error(f"{log_prefix} All configured AI models ({[m['id'] for m in models_to_try]}) failed after {generate_ai_summary.retry.statistics.get('attempt_number', 1)} attempt(s). Total duration: {total_duration_failure:.3f}s.")
    logger.error(f"{log_prefix} Last recorded API error details: {last_api_error_details}")

    # Ha a tenacity miatt futottunk újra, és még mindig itt vagyunk, akkor az utolsó AIServiceRetryableError oka is releváns lehet,
    # de a tenacity.reraise=True miatt az már továbbdobásra került volna, ha az volt az utolsó hiba.
    # Így itt az utolsó nem-retryable hiba vagy a fallback lánc végi hibaüzenetét adjuk vissza.
    return f"{ERROR_MSG_ALL_MODELS_FAILED} (Részletek a szerver naplóban. Utolsó hiba: {last_api_error_details[:100]}...)"