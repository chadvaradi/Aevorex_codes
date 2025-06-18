# backend/core/chat/chat_service.py
# -*- coding: utf-8 -*-
"""
Chat Service Module (v8.0 - Production Grade Robustness)

Orchestrates chat requests with enhanced validation, error handling,
logging, and clearer separation of concerns for production readiness.
"""

import logging
import traceback
from datetime import datetime, timezone
import httpx
from typing import Any, Optional, Dict, List, Union, cast

# --- Logger Setup ---
logger = logging.getLogger(__name__)
MODULE_NAME = "ChatService v8.0"

# --- Critical Imports with Startup Failure ---
# Assume application won't start if these fail. No more Any fallback here.
try:
    from modules.financehub.backend.models.stock import FinBotStockResponse
    from modules.financehub.backend.models.chat import ChatRequest, ChatResponse, ChatMessage, ChatRole
    from . import prompt_builder
    from . import llm_interface
    from .context_manager import AbstractHistoryManager, HistoryStorageError
    from .exceptions import (
        LLMInteractionError, LLMTimeoutError, LLMConfigurationError,
        LLMAPIError, LLMInvalidResponseError, ChatServiceError,
        PromptGenerationError
    )
    logger.info(f"[{MODULE_NAME}] All core dependencies imported successfully.")
except ImportError as e:
    logger.critical(f"[{MODULE_NAME}] FATAL ERROR during critical import: {e}", exc_info=True)
    # Re-raise to prevent application startup if essential components are missing
    raise ImportError(f"{MODULE_NAME} failed to import critical dependencies: {e}") from e

# --- Constants ---
DEFAULT_ERROR_RESPONSE = "(Elnézést, hiba történt a válasz feldolgozása közben.)"
MAX_DEBUG_HISTORY_ITEMS_TO_LOG = 3 # Limit how much history we log

# =============================================================================
# === MAIN CHAT REQUEST HANDLER FUNCTION ===
# =============================================================================

async def handle_chat_request(
    stock_data: Optional[FinBotStockResponse], # Expect specific type
    request_data: ChatRequest,                 # Expect specific type
    http_client: httpx.AsyncClient,           # Expect specific type
    history_manager: AbstractHistoryManager    # Expect specific (abstract) type
) -> str:                                     # Returns only the response string content
    """
    Handles a single chat request with enhanced robustness.

    Orchestrates:
    1. Input Validation (Relying on Pydantic at boundary, minimal checks here).
    2. Conversation Context Identification.
    3. History Loading and Validation.
    4. Prompt Generation with Context.
    5. LLM Interaction with Error Handling.
    6. Response Validation.
    7. History Saving (non-blocking for user response).
    8. Returning the final assistant content string.

    Args:
        stock_data: Pre-fetched stock data context (FinBotStockResponse or None).
        request_data: The incoming ChatRequest object.
        http_client: The shared httpx.AsyncClient instance.
        history_manager: The conversation history management instance.

    Returns:
        The validated content string of the assistant's response.

    Raises:
        PromptGenerationError: If prompt building fails critically.
        LLMInteractionError: If LLM communication fails critically.
        HistoryStorageError: If loading history fails critically.
        ChatServiceError: For other unrecoverable internal errors.
        TypeError/ValueError: For fundamentally invalid arguments (should be caught earlier).
    """
    request_received_time = datetime.now(timezone.utc)
    request_id = f"req_{request_received_time.timestamp():.0f}"
    log_prefix = f"[{MODULE_NAME} Req-{request_id}]"
    logger.info(f"{log_prefix} Starting chat request processing...")

    # --- 1. Argument Validation (Minimal, Pydantic handles most) ---
    # Check dependencies that might not be obvious from type hints alone
    if not isinstance(http_client, httpx.AsyncClient):
         logger.critical(f"{log_prefix} Invalid http_client type provided: {type(http_client)}")
         raise TypeError("Internal error: Invalid http_client dependency.")
    if not isinstance(history_manager, AbstractHistoryManager):
         logger.critical(f"{log_prefix} Invalid history_manager type provided: {type(history_manager)}")
         raise TypeError("Internal error: Invalid history_manager dependency.")
    # Message validation (redundant if Pydantic enforces min_length=1)
   # Message validation (redundant if Pydantic enforces min_length=1)
    if not request_data.question or not request_data.question.strip(): # <<< JAVÍTVA
     logger.error(f"{log_prefix} Invalid ChatRequest: question is empty.") # Javított log üzenet is
     raise ValueError("Internal error: Empty question received by chat service.") # Javított hibaüzenet is

    # --- 2. Determine Conversation Context ---
    ticker_symbol: Optional[str] = None
    if stock_data and stock_data.symbol:
        ticker_symbol = stock_data.symbol
    elif request_data.ticker:
        ticker_symbol = request_data.ticker

    if not ticker_symbol:
        logger.error(f"{log_prefix} Failed to determine ticker symbol for context.")
        raise ChatServiceError("Internal error: Ticker context missing for stock chat.")

    conversation_id = f"ticker:{ticker_symbol.upper()}"
    log_prefix = f"[{MODULE_NAME} Req-{request_id} Ticker-{ticker_symbol.upper()}]" # Update prefix
    logger.info(f"{log_prefix} Determined Conversation ID: {conversation_id}")
    logger.debug(f"{log_prefix} User message: '{request_data.question[:100]}...'") # <<< JAVÍTVA

    # --- 3. Load & Prepare History ---
    loaded_history: List[ChatMessage] = []
    try:
        logger.debug(f"{log_prefix} Loading history...")
        raw_history = await history_manager.get_history(conversation_id)
        if isinstance(raw_history, list):
            # Filter for valid ChatMessage instances (defensive)
            loaded_history = [msg for msg in raw_history if isinstance(msg, ChatMessage)]
            if len(loaded_history) != len(raw_history):
                logger.warning(f"{log_prefix} History manager returned {len(raw_history)} items, "
                               f"filtered down to {len(loaded_history)} valid ChatMessage instances.")
            logger.info(f"{log_prefix} Loaded {len(loaded_history)} valid history messages.")
            # Log only the last few messages for debugging privacy/brevity
            if loaded_history:
                 history_snippet = [f"{msg.role}: {msg.content[:80]}..." for msg in loaded_history[-MAX_DEBUG_HISTORY_ITEMS_TO_LOG:]]
                 logger.debug(f"{log_prefix} Last {len(history_snippet)} history messages: {history_snippet}")
        else:
            logger.error(f"{log_prefix} History manager returned invalid type ({type(raw_history)}). Proceeding with empty history.")
            loaded_history = [] # Ensure it's a list

    except HistoryStorageError as e:
        logger.error(f"{log_prefix} CRITICAL: Failed to load history: {e}. Cannot proceed reliably without history.", exc_info=False)
        raise # Re-raise specific error for endpoint to handle
    except Exception as e:
        logger.exception(f"{log_prefix} CRITICAL: Unexpected error loading history: {e}")
        raise ChatServiceError("Unexpected internal error loading conversation history.") from e

    # Combine provided history from request with loaded history if needed (policy decision)
    # For now, assume request_data.history is the definitive history for this turn's prompt
    # This prevents re-processing history the client already knows about.
    prompt_build_history = request_data.history
    logger.debug(f"{log_prefix} Using history from request body for prompt building ({len(prompt_build_history)} messages).")


    # --- 4. Build Prompt ---
    final_prompt: str = ""
    try:
        logger.info(f"{log_prefix} Building prompt...")
        # Validate prompt builder existence
        if not hasattr(prompt_builder, 'build_chat_prompt') or not callable(prompt_builder.build_chat_prompt):
            logger.critical(f"{log_prefix} prompt_builder.build_chat_prompt is not available or not callable!")
            raise PromptGenerationError("Internal configuration error: Prompt builder function missing.")

        final_prompt = prompt_builder.build_chat_prompt(
        stock_data=stock_data,
        history=prompt_build_history,
        question=request_data.question # <<< JAVÍTVA
        )
        if not final_prompt or not final_prompt.strip():
            logger.error(f"{log_prefix} Prompt builder returned an empty prompt.")
            raise PromptGenerationError("Generated prompt is empty.")

        logger.info(f"{log_prefix} Prompt built successfully (Length: {len(final_prompt)}).")
        logger.debug(f"{log_prefix} Generated Prompt starts with: '{final_prompt[:200]}...'") # Log beginning

    except PromptGenerationError as pge:
        logger.error(f"{log_prefix} Prompt generation failed: {pge}", exc_info=True)
        raise # Re-raise specific error
    except Exception as e:
        logger.exception(f"{log_prefix} Unexpected error during prompt building: {e}")
        raise PromptGenerationError("Unexpected error while building the prompt.") from e

    # --- 5. Generate LLM Response ---
    llm_response_content: str = ""
    llm_duration: float = -1.0
    try:
        # Validate LLM interface existence
        if not hasattr(llm_interface, 'generate_chat_response') or not callable(llm_interface.generate_chat_response):
             logger.critical(f"{log_prefix} llm_interface.generate_chat_response is not available or not callable!")
             raise LLMInteractionError("Internal configuration error: LLM interface function missing.")

        logger.info(f"{log_prefix} Calling LLM interface to generate response...")
        start_time = datetime.now(timezone.utc)
        config_override = request_data.config_override # Already validated as part of ChatRequest

        llm_response_content = await llm_interface.generate_chat_response(
            prompt=final_prompt,
            http_client=http_client,
            config_override=config_override # Pass validated override
        )
        end_time = datetime.now(timezone.utc)
        llm_duration = (end_time - start_time).total_seconds()

        if not llm_response_content or not llm_response_content.strip():
            logger.warning(f"{log_prefix} LLM returned empty or whitespace content after {llm_duration:.3f}s. Returning default error message.")
            # Return a user-friendly error message instead of raising an exception here
            # The endpoint will wrap this in ChatResponse
            return DEFAULT_ERROR_RESPONSE
        else:
             logger.info(f"{log_prefix} LLM response received successfully in {llm_duration:.3f}s.")
             logger.debug(f"{log_prefix} LLM Response starts with: '{llm_response_content[:200]}...'")

    except ImportError as e: # Should not happen if initial checks pass
         logger.critical(f"{log_prefix} Missing LLM interface dependency: {e}")
         raise LLMInteractionError("Internal configuration error: LLM interface not available.") from e
    except (LLMTimeoutError, LLMAPIError, LLMConfigurationError, LLMInvalidResponseError, LLMInteractionError) as llm_err:
        logger.error(f"{log_prefix} LLM interaction failed: {type(llm_err).__name__}: {llm_err}", exc_info=False)
        # Re-raise the specific error for the endpoint to handle appropriately
        raise llm_err from llm_err
    except Exception as e:
        logger.exception(f"{log_prefix} Unexpected error during LLM interaction: {e}")
        raise LLMInteractionError("Unexpected error communicating with the LLM.") from e

    # --- 6. Save Interaction to History (Non-blocking for response) ---
    # We attempt to save history even if LLM returned empty (but we returned default)
    try:
        logger.debug(f"{log_prefix} Attempting to save interaction to history for {conversation_id}...")
        # Validate history_manager methods defensively
        if not hasattr(history_manager, 'add_message') or not callable(history_manager.add_message):
             logger.error(f"{log_prefix} History manager is missing 'add_message' method. Cannot save history.")
        else:
            user_msg_obj = ChatMessage(
                role=ChatRole.USER,
                content=request_data.question.strip(), # <<< JAVÍTVA erre
                timestamp=request_received_time
            )
            assistant_msg_obj = ChatMessage(
                role=ChatRole.ASSISTANT,
                content=llm_response_content, # Save the actual (or default) response
                timestamp=datetime.now(timezone.utc)
            )
            # Fire and forget (or use asyncio.create_task if more complex post-processing needed)
            # Using await here might slightly delay the response to the user if saving is slow,
            # but ensures logging order and catches immediate saving errors.
            # If saving is slow or unreliable, consider asyncio.create_task.
            await history_manager.add_message(conversation_id, user_msg_obj)
            await history_manager.add_message(conversation_id, assistant_msg_obj)
            logger.info(f"{log_prefix} User and assistant messages added to history storage.")

    except HistoryStorageError as e:
         logger.error(f"{log_prefix} Failed to save conversation history: {e}", exc_info=False)
         # Do not re-raise, allow response to proceed
    except Exception as e:
         logger.exception(f"{log_prefix} Unexpected error saving history: {e}")
         # Do not re-raise

    # --- 7. Return Assistant's Content String ---
    logger.info(f"{log_prefix} Chat request processing finished successfully. Returning content.")
    # Ensure we return a string
    return llm_response_content if isinstance(llm_response_content, str) else str(llm_response_content)