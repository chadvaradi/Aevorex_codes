# backend/core/chat/exceptions.py

class LLMError(Exception):
    """Base exception for errors related to the LLM interface."""
    pass

class LLMConfigurationError(LLMError):
    """Error related to missing or invalid LLM configuration (e.g., API key, provider)."""
    pass

class LLMAPIError(LLMError):
    """General error communicating with the LLM API, often after retries."""
    def __init__(self, message="Error communicating with LLM API", status_code: int | None = None, original_exception: Exception | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.original_exception = original_exception
        full_message = f"{message}"
        if status_code: full_message += f" (Status Code: {status_code})"
        if original_exception: full_message += f" - Original Exception: {type(original_exception).__name__}"
        self.message = full_message
    def __str__(self) -> str: return self.message

class LLMTimeoutError(LLMAPIError):
    """Error specifically indicating a timeout during the LLM API call."""
    def __init__(self, message="LLM API call timed out", original_exception: Exception | None = None):
        super().__init__(message, status_code=None, original_exception=original_exception)

class LLMInvalidResponseError(LLMAPIError):
    """Error indicating an unexpected or malformed response from the LLM API."""
    def __init__(self, message="Invalid or unexpected response structure from LLM API", original_exception: Exception | None = None):
        super().__init__(message, status_code=None, original_exception=original_exception)
# --- IDE ADD HOZZÁ AZ ÚJ KIVÉTELT ---
class LLMInteractionError(LLMError): # Örökölhet az LLMError-ból vagy akár az LLMAPIError-ból is, attól függően, mennyire specifikus
    """
    Általános hiba az LLM-mel való interakció során fellépő problémákra,
    melyek nem feltétlenül API vagy konfigurációs hibák (pl. prompt előkészítés, válaszfeldolgozás).
    """
    pass
# Itt definiálhatod a ChatService és PromptBuilder specifikus kivételeket is
class ChatServiceError(Exception):
    """Base exception for chat service errors."""
    pass

class PromptGenerationError(ChatServiceError):
    """Error during prompt generation."""
    pass

# --- IDE ADD HOZZÁ AZ ÚJ KIVÉTELT ---
class StockNotFoundError(Exception): # Lehetne akár ChatServiceError-ból is, de sima Exception is jó
    """Exception raised when requested stock data cannot be found."""
    pass
# ------------------------------------


class HistoryStorageError(Exception):
    """Base exception for errors related to history storage operations."""
    pass

class HistoryNotFoundError(HistoryStorageError):
    """Exception raised when a specific conversation history is not found (optional usage)."""
    pass