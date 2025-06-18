# -*- coding: utf-8 -*-
"""
Conversation Context (History) Management Module (v5 - Any Type Hints)

Provides mechanisms to load, save, and manage chat conversation histories.
Uses `typing.Any` for problematic type hints to bypass persistent Pylance
resolution issues, while maintaining runtime checks and robustness.
Integrates with central configuration and dependency injection.
"""

import logging
import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, Deque # Import Deque for internal type hint
from collections import deque
from .exceptions import HistoryStorageError, HistoryNotFoundError # <<< Import

# --- Central Configuration Import ---
try:
    from modules.financehub.backend.config import settings
except ImportError:
    try:
        from backend.config import settings
    except ImportError:
        logging.critical("CONTEXT_MANAGER FATAL ERROR: Cannot import central 'settings'. Halting.", exc_info=True)
        raise RuntimeError("Critical configuration import failed in context_manager.")

# --- Core Data Model Import ---
# We STILL need to import ChatMessage for runtime checks (isinstance)
try:
    from modules.financehub.backend.models.chat import ChatMessage, ChatRole
except ImportError:
    try:
        from backend.models.chat import ChatMessage, ChatRole
    except ImportError:
        logging.critical("CONTEXT_MANAGER FATAL ERROR: Cannot import ChatMessage/ChatRole model.", exc_info=True)
        # Define as Any as a last resort, critical for runtime checks
        ChatMessage = Any
        ChatRole = Any
        logging.warning("ChatMessage/ChatRole type resolved to Any due to import error. Runtime validation critical.")

# --- Logger Setup ---
logger = logging.getLogger(__name__)
logger.debug("Context Manager module initialized.")
if 'ChatMessage' not in globals() or ChatMessage is Any:
     logger.error("ChatMessage model could not be imported correctly. History management might fail or be less safe.")

# --- Custom Exceptions ---

class HistoryStorageError(Exception):
    """Base exception for errors related to history storage operations."""
    pass

class HistoryNotFoundError(HistoryStorageError):
    """Exception raised when a specific conversation history is not found (optional usage)."""
    pass

# --- Abstract Base Class for History Management (Using Any for Hints) ---

class AbstractHistoryManager(ABC):
    """
    Abstract base class defining the contract for conversation history managers.
    Uses `Any` for ChatMessage hints in signatures to avoid Pylance issues.
    """

    @abstractmethod
    async def get_history(self, conversation_id: str, limit: Optional[int] = None) -> List[Any]: # <-- JAVÍTVA: Any
        """
        Retrieves the conversation history (returns List[Any] due to type hint issues).
        Implementations should return objects structurally similar to ChatMessage.

        Args:
            conversation_id: The unique identifier for the conversation.
            limit: Optional maximum number of most recent *messages* to retrieve.

        Returns:
            A list of message objects (hinted as Any), ordered chronologically.
            Returns an empty list if the conversation is not found or has no messages.

        Raises:
            HistoryStorageError: If there's an error communicating with the backend storage.
        """
        pass

    @abstractmethod
    async def add_message(self, conversation_id: str, message: Any) -> None: # <-- JAVÍTVA: Any
        """
        Adds a new message (hinted as Any) to the specified conversation history.
        Implementations MUST perform runtime validation to ensure the message
        structure is compatible with ChatMessage.

        Args:
            conversation_id: The unique identifier for the conversation.
            message: The message object (hinted as Any, expected ChatMessage structure).

        Raises:
            HistoryStorageError: If there's an error communicating with the backend storage.
            TypeError: If the provided message object is fundamentally incompatible at runtime.
        """
        pass

    @abstractmethod
    async def clear_history(self, conversation_id: str) -> None:
        """
        Removes all messages associated with a given conversation ID.

        Args:
            conversation_id: The unique identifier for the conversation to clear.

        Raises:
            HistoryStorageError: If there's an error communicating with the backend storage.
        """
        pass

# --- In-Memory Implementation (Using Any for Hints) ---

class InMemoryHistoryManager(AbstractHistoryManager):
    """
    Manages conversation history entirely in memory using Python dictionaries and deques.
    Uses `Any` for ChatMessage hints in signatures and relies on runtime checks.
    """
    # Internal type hint for clarity, still uses Any in signatures
    _HistoryDeque = Deque[ChatMessage] # Requires ChatMessage import

    def __init__(self,
                 max_conversations: Optional[int] = None,
                 max_messages_per_conversation: Optional[int] = None):
        """Initializes the InMemoryHistoryManager."""
        # Internal storage still aims to hold ChatMessage objects if possible
        self.histories: Dict[str, InMemoryHistoryManager._HistoryDeque] = {}
        self.locks: Dict[str, asyncio.Lock] = {}
        self.max_messages_per_conversation: Optional[int] = max_messages_per_conversation
        self.max_conversations: Optional[int] = max_conversations # Note: Enforcement not implemented
        if self.max_conversations is not None:
             logger.warning("InMemoryHistoryManager: 'max_conversations' limit set but not actively enforced.")
        logger.info(f"InMemoryHistoryManager initialized. Max messages/convo: {self.max_messages_per_conversation or 'Unlimited'}.")

    async def _get_lock(self, conversation_id: str) -> asyncio.Lock:
        """Safely gets or creates the lock for a given conversation ID."""
        if conversation_id not in self.locks:
            # Potential race condition here is low risk for typical chat apps
            # A more robust solution might use a dedicated lock manager or db primitive
            self.locks[conversation_id] = asyncio.Lock()
            logger.debug(f"Created new lock for conversation_id: {conversation_id}")
        return self.locks[conversation_id]

    # Signature uses List[Any]
    async def get_history(self, conversation_id: str, limit: Optional[int] = None) -> List[Any]: # <-- JAVÍTVA: Any
        """Retrieves history, returning List[Any] to match abstract signature."""
        if not isinstance(conversation_id, str) or not conversation_id:
             logger.error("get_history called with invalid conversation_id.")
             return []

        lock = await self._get_lock(conversation_id)
        async with lock:
            logger.debug(f"Acquired lock for get_history: {conversation_id}")
            history_deque = self.histories.get(conversation_id)

            if history_deque is None:
                logger.info(f"No history found for conversation_id: {conversation_id}")
                return []

            # Convert deque (which might contain ChatMessage objects) to list
            history_list = list(history_deque)

            if limit is not None and limit > 0:
                limited_history = history_list[-limit:]
                logger.debug(f"Returning last {len(limited_history)} messages (limit={limit}) for {conversation_id}.")
                return limited_history # Returns List[Any] as per signature
            else:
                logger.debug(f"Returning all {len(history_list)} messages for {conversation_id}.")
                return history_list # Returns List[Any] as per signature

    # Signature uses message: Any
    async def add_message(self, conversation_id: str, message: Any) -> None: # <-- JAVÍTVA: Any
        """Adds a message (hinted as Any), performing runtime validation."""
        # --- CRITICAL RUNTIME VALIDATION ---
        # Check if it structurally resembles ChatMessage (even if ChatMessage type hint failed)
        is_valid_structure = False
        if ChatMessage is not Any and isinstance(message, ChatMessage):
             is_valid_structure = True # It's the correct Pydantic type
        elif hasattr(message, 'role') and hasattr(message, 'content'):
             # Duck typing: Check if essential attributes exist
             # Further checks on role/content types could be added here if needed
             role_val = getattr(message, 'role')
             content_val = getattr(message, 'content')
             # Basic check: role maybe enum or string, content should be string
             if (isinstance(role_val, (str, ChatRole if ChatRole is not Any else str))) and \
                isinstance(content_val, str):
                 is_valid_structure = True
                 # Log warning if it's not the exact type but structure is okay
                 if ChatMessage is not Any and not isinstance(message, ChatMessage):
                      logger.warning(f"add_message: Message for {conversation_id} has correct attributes "
                                     f"but is not a ChatMessage instance (Type: {type(message)}). Adding anyway.")
             else:
                 logger.error(f"add_message failed for {conversation_id}: Message attributes have incorrect types "
                              f"(role: {type(role_val)}, content: {type(content_val)}).")
        else:
             logger.error(f"add_message failed for {conversation_id}: Provided 'message' object (Type: {type(message)}) "
                          f"lacks 'role' or 'content' attributes.")

        if not is_valid_structure:
             # Raise TypeError if the structure is fundamentally wrong
             raise TypeError(f"Invalid message object provided. Expected object with 'role' and 'content', got {type(message)}.")
        # ------------------------------------

        if not isinstance(conversation_id, str) or not conversation_id:
            logger.error("add_message called with invalid conversation_id.")
            raise ValueError("conversation_id must be a non-empty string.")

        lock = await self._get_lock(conversation_id)
        async with lock:
            logger.debug(f"Acquired lock for add_message: {conversation_id}")

            # Get or create the deque (stores the validated message object)
            history_deque = self.histories.setdefault(
                conversation_id,
                deque(maxlen=self.max_messages_per_conversation)
            )

            history_deque.append(message) # Add the validated message
            # Log using getattr safely, as message type is Any in signature
            logger.info(f"Added message (Role: {getattr(message, 'role', 'N/A')}) to history for {conversation_id}. "
                        f"Current length: {len(history_deque)}")
            if self.max_messages_per_conversation and len(history_deque) >= self.max_messages_per_conversation:
                 logger.debug(f"Max message limit ({self.max_messages_per_conversation}) potentially reached for {conversation_id}.")

    async def clear_history(self, conversation_id: str) -> None:
        """Removes a conversation's history from memory."""
        if not isinstance(conversation_id, str) or not conversation_id:
             logger.error("clear_history called with invalid conversation_id.")
             return

        lock = await self._get_lock(conversation_id)
        async with lock:
            logger.debug(f"Acquired lock for clear_history: {conversation_id}")
            if conversation_id in self.histories:
                num_messages = len(self.histories[conversation_id])
                del self.histories[conversation_id] # Remove history
                if conversation_id in self.locks: # Remove corresponding lock
                    del self.locks[conversation_id]
                logger.info(f"Cleared history (containing {num_messages} messages) for conversation_id: {conversation_id}")
            else:
                logger.info(f"Attempted to clear history for non-existent conversation_id: {conversation_id}")
                # Ensure lock is removed if it exists somehow without history
                if conversation_id in self.locks:
                    del self.locks[conversation_id]
                    logger.warning(f"Removed orphaned lock for non-existent history: {conversation_id}")


# --- Future Database Implementation Placeholder (Using Any for Hints) ---
# class DatabaseHistoryManager(AbstractHistoryManager):
#     # ... (init) ...
#
#     async def get_history(self, conversation_id: str, limit: Optional[int] = None) -> List[Any]: # <-- JAVÍTVA: Any
#         # ... query logic ...
#         # Return list of objects loaded from DB (which might be ORM models or dicts)
#         # They should be structurally compatible with ChatMessage, but hinted as Any
#         raise NotImplementedError("Database backend not implemented.")
#
#     async def add_message(self, conversation_id: str, message: Any) -> None: # <-- JAVÍTVA: Any
#         # CRITICAL: Perform runtime validation on 'message' structure here before saving to DB
#         if not hasattr(message, 'role') or not hasattr(message, 'content'):
#              raise TypeError("Invalid message object structure for DB storage.")
#         # ... DB insertion logic ...
#         raise NotImplementedError("Database backend not implemented.")
#
#     async def clear_history(self, conversation_id: str) -> None:
#         # ... DB deletion logic ...
#         raise NotImplementedError("Database backend not implemented.")