# -*- coding: utf-8 -*-
"""
LLM Interface Module (v2 - Integrated with Aevorex FinBot Core)

Provides a dedicated, robust, and configurable interface for interacting
with Large Language Models (LLMs) via configured providers (e.g., OpenRouter).

Core Responsibilities:
- Reads configuration EXCLUSIVELY from the central `settings` object.
- Uses the centrally managed `httpx.AsyncClient` for API communication.
- Handles provider-specific API details (URL, headers, payload).
- Implements robust error handling and retry logic based on `settings`.
- Supports parameter overrides for specific calls.
- Uses `SecretStr` correctly for API keys.
- Provides clear, specific custom exceptions for error propagation.
"""

import logging
import json
from typing import Dict, Any, Optional

import httpx # For type hinting and specific error handling
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
    retry_if_exception_type,
    RetryError # Import RetryError to catch final tenacity failure if needed
)
from pydantic import SecretStr # For type hinting API keys from settings

# --- Central Configuration Import ---
# This module RELIES on the central settings object being initialized successfully
# before its functions are called.
try:
    from modules.financehub.backend.config import settings # Import central settings
    from modules.financehub.backend.utils.logger_config import get_logger
except ImportError:
    raise ImportError("Failed to import central settings or logger_config. Ensure the paths are correct.")

from .exceptions import ( # <<< Import az új fájlból
    LLMError, LLMConfigurationError, LLMAPIError, LLMTimeoutError, LLMInvalidResponseError
)

# Note: The http_client is NOT initialized here.
# It MUST be passed as a dependency to the generate_chat_response function.

# Get a logger instance
logger = logging.getLogger(__name__)

# --- Retry Logic Configuration (using Tenacity) ---

def is_retryable_llm_exception(exception: BaseException) -> bool:
    """
    Determines if an exception from the LLM API call (using httpx) warrants a retry.
    Focuses on transient network issues, timeouts, and server-side errors (5xx).
    """
    if isinstance(exception, (httpx.TimeoutException, httpx.NetworkError)):
        logger.warning(f"Retryable HTTPX network/timeout exception caught: {type(exception).__name__}. Retrying LLM call...")
        return True
    if isinstance(exception, httpx.HTTPStatusError):
        status_code = exception.response.status_code
        # Retry on 5xx server errors and common rate limit / temporary errors
        # 429: Too Many Requests (Rate Limit)
        # 500: Internal Server Error
        # 502: Bad Gateway
        # 503: Service Unavailable
        # 504: Gateway Timeout
        if status_code == 429 or status_code >= 500:
             logger.warning(f"Retryable HTTP Status error caught: {status_code}. Retrying LLM call...")
             return True
    # Consider adding specific LLM provider errors if they have unique retryable conditions
    # (e.g., a specific error code in the response body)
    logger.debug(f"Non-retryable exception caught: {type(exception).__name__}. No retry.")
    return False

# Configure the retry decorator using values from central settings
# Using settings.AI specific retry config if available, otherwise fallback to HTTP_CLIENT
_retry_attempts = getattr(settings.AI, 'RETRY_COUNT', settings.HTTP_CLIENT.RETRY_COUNT)
_retry_backoff = getattr(settings.AI, 'RETRY_BACKOFF_FACTOR', settings.HTTP_CLIENT.RETRY_BACKOFF_FACTOR)
# Ensure attempts is at least 1 (0 retries = 1 attempt)
_stop_after = stop_after_attempt(max(_retry_attempts + 1, 1))

retry_config = dict(
    stop=_stop_after,
    # Use exponential backoff with jitter. Max wait can also be configured.
    wait=wait_random_exponential(multiplier=_retry_backoff, max=15), # Max 15s wait between retries
    retry=retry_if_exception_type(Exception), # Check specific types inside is_retryable_llm_exception
    retry_error_callback=lambda retry_state: logger.error(
        f"LLM API call FAILED after {retry_state.attempt_number} attempts. Final exception: {retry_state.outcome.exception()}"
    ),
    # Log before sleeping only if the exception is deemed retryable
    before_sleep=lambda retry_state: logger.info(
        f"Retrying LLM call (attempt {retry_state.attempt_number}) after exception: {type(retry_state.outcome.exception()).__name__}. Waiting {retry_state.next_action.sleep:.2f}s..."
    ) if is_retryable_llm_exception(retry_state.outcome.exception()) else None
)

# --- Core LLM Interaction Function ---

@retry(**retry_config)
async def generate_chat_response(
    prompt: str,
    http_client: httpx.AsyncClient, # <<< Central HTTP client is REQUIRED
    config_override: Optional[Dict[str, Any]] = None
) -> str:
    """
    Calls the configured LLM provider API (e.g., OpenRouter) to generate a chat response.

    Uses the central application configuration (`settings`) and the provided shared
    `httpx.AsyncClient`. Handles API interaction, parameter merging, robust error
    handling, and automatic retries for transient issues.

    Args:
        prompt: The fully constructed prompt string to send to the LLM.
        http_client: The shared `httpx.AsyncClient` instance from FastAPI dependencies.
        config_override: Optional dictionary to override default LLM parameters
                         (e.g., {'temperature': 0.5, 'model': 'openai/gpt-4o'}).

    Returns:
        The text content of the LLM's response.

    Raises:
        LLMConfigurationError: If the API key is missing or the provider is unsupported/misconfigured.
        LLMTimeoutError: If the API call times out after configured retries.
        LLMInvalidResponseError: If the API returns an unexpected or unparseable response.
        LLMAPIError: If a non-retryable API error occurs (e.g., 4xx) or retries are exhausted for 5xx errors.
        LLMError: For other unexpected errors during the process.
    """
    if not settings.AI.ENABLED:
        logger.warning("LLM interface called but AI is disabled in settings (FINBOT_AI__ENABLED=False). Returning empty.")
        # Depending on desired behavior, could raise an error or return specific message
        return "AI features are currently disabled."

    provider = settings.AI.PROVIDER.lower()
    api_key_secret: Optional[SecretStr] = None
    base_url: Optional[str] = None

    # --- Provider Specific Setup ---
    logger.debug(f"Configuring LLM call for provider: '{provider}'")
    if provider == 'openrouter':
        api_key_secret = settings.API_KEYS.OPENROUTER
        base_url = "https://openrouter.ai/api/v1" # Standard OpenRouter base URL
        if not api_key_secret:
            # Critical config error checked at startup by config.py, but double-check here
            raise LLMConfigurationError("OpenRouter provider selected, but API key (FINBOT_API_KEYS__OPENROUTER) is missing.")
    # --- Add other providers here as needed ---
    # elif provider == 'openai' and hasattr(settings.API_KEYS, 'OPENAI'):
    #     api_key_secret = settings.API_KEYS.OPENAI
    #     base_url = "https://api.openai.com/v1" # Standard OpenAI base URL
    #     if not api_key_secret:
    #         raise LLMConfigurationError("OpenAI provider selected, but API key (FINBOT_API_KEYS__OPENAI) is missing.")
    # elif provider == 'anthropic' and hasattr(settings.API_KEYS, 'ANTHROPIC'):
        # ... Anthropic setup ...
    else:
        # Provider is configured but not explicitly supported by this interface logic
        raise LLMConfigurationError(f"Unsupported or misconfigured AI provider in settings: '{provider}'")

    # --- Check Prompt ---
    if not prompt or not prompt.strip():
        logger.warning("generate_chat_response called with an empty or whitespace-only prompt.")
        # Decide behavior: return empty, raise error, or return specific message
        return "Cannot process an empty request."

    # --- Get Actual API Key Safely ---
    try:
        api_key = api_key_secret.get_secret_value()
    except AttributeError: # Should not happen if config validation passed, but defensive check
         raise LLMConfigurationError(f"API key for provider '{provider}' is not set or is invalid.")

    # --- Merge Parameters (using central settings as defaults) ---
    # Start with defaults from the central config
    default_params = {
        "model": settings.AI.MODEL_NAME_PRIMARY,
        "temperature": settings.AI.TEMPERATURE,
        "max_tokens": settings.AI.MAX_TOKENS_PRIMARY,
        # Add other common parameters if needed: "top_p", "frequency_penalty", etc.
    }
    # Create a mutable copy and apply overrides
    llm_params = default_params.copy()
    if config_override:
        logger.debug(f"Applying config overrides to LLM call: {config_override}")
        llm_params.update(config_override) # Override defaults with provided values

    # Ensure model_name reflects the final choice after potential override for logging/payload
    effective_model_name = llm_params["model"]

    # --- Prepare API Call (Example for OpenAI-compatible APIs like OpenRouter) ---
    # This structure works for OpenRouter and potentially direct OpenAI calls via HTTPX
    request_url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # Include Referer and App Name headers as good practice for OpenRouter
        "HTTP-Referer": str(settings.HTTP_CLIENT.DEFAULT_REFERER), # Use central setting
        "X-Title": settings.APP_META.NAME, # Identify your application
    }
    payload = {
        "model": effective_model_name,
        "messages": [{"role": "user", "content": prompt}], # Simple user message for now
        "temperature": llm_params["temperature"],
        "max_tokens": llm_params["max_tokens"],
        # Pass other merged parameters if the API supports them
        # "top_p": llm_params.get("top_p"),
        # "stream": False, # Explicitly disable streaming if not handled
    }
    # Remove params with None values if API doesn't like them
    payload = {k: v for k, v in payload.items() if v is not None}

    # Log sanitized payload for debugging if needed (careful in production)
    # sanitized_payload = payload.copy()
    # sanitized_payload['messages'] = "[REDACTED]" # Don't log full prompt in info/prod logs
    # logger.debug(f"LLM API Request Payload (sanitized): {json.dumps(sanitized_payload)}")

    try:
        logger.info(f"Calling {provider} API endpoint: {request_url}. Model: {effective_model_name}")
        response = await http_client.post(
            request_url,
            headers=headers,
            json=payload,
            timeout=settings.AI.TIMEOUT_SECONDS # Use AI-specific timeout from central settings
        )

        # Check for HTTP errors (4xx or 5xx) - raise_for_status() does this
        # This exception will be caught by the handlers below or retried by tenacity
        response.raise_for_status()

        # --- Parse Successful Response ---
        try:
            response_data = response.json()
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON response from {provider}. Status: {response.status_code}. Response text: {response.text[:500]}...", exc_info=False)
            raise LLMInvalidResponseError(f"Invalid JSON response received from {provider}.", original_exception=e) from e

        # Extract content based on OpenAI-compatible structure
        if response_data.get("choices") and \
           isinstance(response_data["choices"], list) and \
           len(response_data["choices"]) > 0 and \
           isinstance(response_data["choices"][0], dict) and \
           response_data["choices"][0].get("message") and \
           isinstance(response_data["choices"][0]["message"], dict):

            content = response_data["choices"][0]["message"].get("content")
            finish_reason = response_data["choices"][0].get("finish_reason", "N/A")
            usage = response_data.get("usage") # Optional token usage info

            logger.info(f"LLM response received successfully from {provider}. Finish reason: {finish_reason}.")
            if usage: logger.debug(f"Token usage ({provider}): {usage}")

            # Return the content, ensuring it's a string and stripped
            return str(content).strip() if content is not None else ""
        else:
            # Response structure is valid JSON but missing expected fields
            logger.error(f"Invalid or incomplete response structure received from {provider}. Keys: {response_data.keys()}")
            raise LLMInvalidResponseError(f"Incomplete response structure from {provider}.")

    # --- Exception Handling (inside the @retry context) ---
    except httpx.TimeoutException as e:
        # This exception type is caught by is_retryable_llm_exception, tenacity will handle retry
        logger.warning(f"{provider} API call timed out: {e}. Retrying if attempts remain...")
        # If tenacity exhausts retries, it will re-raise the *last* exception caught.
        # We add a specific catch block *outside* the retry for the final timeout if needed,
        # but usually the LLMTimeoutError raised *here* will be the one propagated after retries.
        raise LLMTimeoutError(original_exception=e) from e # Re-raise specific type

    except httpx.HTTPStatusError as e:
        # This is caught after raise_for_status()
        status_code = e.response.status_code
        response_text = e.response.text[:500] # Limit log size
        # Let tenacity decide if it's retryable (is_retryable_llm_exception checks 429/5xx)
        if is_retryable_llm_exception(e):
            logger.warning(f"{provider} API Status Error {status_code}: {response_text}. Retrying if attempts remain...")
        else:
            # If not retryable (e.g., 400, 401, 403), log as error and raise immediately
            logger.error(f"{provider} API Non-Retryable Status Error {status_code}: {response_text}")
        # Re-raise the original exception for tenacity to handle or for final error propagation
        # Map to LLMAPIError for the final raise *if* tenacity gives up or it wasn't retryable
        # Tenacity's retry_error_callback logs the final failure.
        # We just re-raise the original httpx error here for tenacity's logic.
        raise # Re-raise the original httpx.HTTPStatusError

    except httpx.RequestError as e:
        # Network errors (DNS issues, connection refused, etc.) - generally retryable
        logger.warning(f"{provider} Request Error: {e}. Retrying if attempts remain...")
        # Re-raise original exception for tenacity
        raise # Re-raise the original httpx.RequestError

    except RetryError as e:
        # This exception is raised by Tenacity if all retry attempts fail.
        # The original exception that caused the retries is available in e.cause
        final_exception = e.cause if e.cause else e
        logger.critical(f"LLM call failed after all retry attempts for provider {provider}. Final exception: {type(final_exception).__name__}")
        # Map the final exception to a specific LLM error type for the caller
        if isinstance(final_exception, httpx.TimeoutException):
             raise LLMTimeoutError(original_exception=final_exception) from final_exception
        elif isinstance(final_exception, httpx.HTTPStatusError):
             raise LLMAPIError(f"API Error after retries: {final_exception.response.status_code}", status_code=final_exception.response.status_code, original_exception=final_exception) from final_exception
        elif isinstance(final_exception, httpx.RequestError):
             raise LLMAPIError(f"Network/Request Error after retries: {final_exception}", original_exception=final_exception) from final_exception
        else: # Catch-all for unexpected final exceptions
             raise LLMAPIError(f"LLM call failed after retries due to an unexpected error: {final_exception}", original_exception=final_exception) from final_exception

    except Exception as e:
        # Catch any other unexpected errors during the process
        logger.critical(f"Unexpected error during LLM interaction with {provider}: {e}", exc_info=True)
        # Raise a generic LLMError, wrapping the original exception
        raise LLMError(f"An unexpected error occurred interacting with {provider}: {e}") from e