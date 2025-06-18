# -*- coding: utf-8 -*-
"""
Pydantic models for the Chat feature.

This module defines the data structures used for communication
between the frontend and the backend's chat endpoint,
ensuring data validation, clear structure, and type safety.
It includes models for individual messages, chat requests,
chat responses, and future features like source attribution (RAG).
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl

# ==============================================================================
# Core Chat Enums and Models
# ==============================================================================


class ChatRole(str, Enum):
    """
    Enumeration defining the possible roles of a participant in a chat conversation.
    Using an Enum enhances robustness and readability compared to raw strings.
    """
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"  # Optional: For system-level instructions influencing the assistant


class ChatMessage(BaseModel):
    """
    Represents a single message within a chat conversation history.
    This is the fundamental building block for chat interactions.
    """
    role: ChatRole = Field(
        ...,  # Ellipsis (...) indicates this field is required
        description="The role of the message sender (user, assistant, or system)."
    )
    content: str = Field(
        ...,
        min_length=1,
        description="The textual content of the message."
    )
    timestamp: Optional[datetime] = Field(
        default=None,
        description="The UTC timestamp when the message was created or recorded. "
                    "Can be set by the frontend or backend."
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional dictionary for storing arbitrary metadata related to the message. "
                    "Examples: message ID, processing time, tokens used, "
                    "file associations, AI tool usage flags, etc."
    )

    class Config:
        """Pydantic configuration settings."""
        # Use the enum's value (e.g., "user") during serialization
        use_enum_values = True
        # Example for generating JSON schema documentation
        schema_extra = {
            "example": {
                "role": "user",
                "content": "What are the latest news about $AAPL?",
                "timestamp": "2023-10-27T10:30:00Z",
                "metadata": {"client_message_id": "msg_12345"}
            }
        }


class ChatRequest(BaseModel):
    """
    Defines the structure of the request body sent by the frontend
    to the POST /api/v1/stock/{ticker}/chat endpoint.
    """
    question: str = Field(
        ...,
        min_length=1,
        description="The current question or message input by the user."
    )
    history: List[ChatMessage] = Field(
        ...,
        description="The conversation history preceding the current question. "
                    "Ordered from oldest to newest message. Can be an empty list for the first turn."
    )
    ticker: Optional[str] = Field(
        default=None,
        description="The stock ticker symbol relevant to the chat context. "
                    "Primarily obtained from the URL path, but included here for "
                    "potential debugging or more complex backend logic."
    )
    config_override: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional dictionary to override specific backend chat configurations "
                    "for this request (e.g., LLM model name, temperature). "
                    "Use with caution and ensure backend validation."
    )
    uploaded_file_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of unique identifiers for files previously uploaded "
                    "by the user and potentially relevant to this message. "
                    "Used for future file-based RAG or analysis features."
    )

    class Config:
        """Pydantic configuration settings."""
        schema_extra = {
            "example": {
                "question": "How does its P/E ratio compare to competitors?",
                "history": [
                    {
                        "role": "user",
                        "content": "Tell me about $MSFT stock.",
                        "timestamp": "2023-10-27T11:00:00Z"
                    },
                    {
                        "role": "assistant",
                        "content": "Microsoft (MSFT) closed at $329.81 yesterday. Key indicators are...",
                        "timestamp": "2023-10-27T11:00:05Z"
                    }
                ],
                "ticker": "MSFT",
                "config_override": {"temperature": 0.6},
                "uploaded_file_ids": None
            }
        }

# ==============================================================================
# Models for Future RAG / Source Attribution Features
# ==============================================================================


class SourceType(str, Enum):
    """
    Enumeration categorizing the type of information source used
    by the assistant to generate its response. Crucial for RAG and transparency.
    """
    NEWS = "news"
    PRICE_DATA = "price_data"
    INDICATOR = "indicator"
    FUNDAMENTALS = "fundamentals"
    USER_DOCUMENT = "user_document" # Refers to a file uploaded by the user
    WEB_SEARCH = "web_search"
    INTERNAL_KNOWLEDGE = "internal_knowledge" # If the model answers from its base training
    UNKNOWN = "unknown"


class SourceInfo(BaseModel):
    """
    Represents structured information about a single source
    used to formulate the assistant's response. Enables citation and verification.
    """
    type: SourceType = Field(
        ...,
        description="The category of the information source."
    )
    identifier: str = Field(
        ...,
        description="A unique identifier for the source (e.g., news article UUID, "
                    "indicator name, file name, web URL, specific data point ID)."
    )
    details: Optional[str] = Field(
        default=None,
        description="A brief excerpt, summary, or relevant detail from the source "
                    "that directly contributed to the answer."
    )
    relevance_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="An estimated score (0.0 to 1.0) indicating the relevance "
                    "of this source to the generated response."
    )
    link: Optional[HttpUrl] = Field(
        default=None,
        description="A direct URL link to the source, if available (e.g., news article, "
                    "web page, documentation)."
    )

    class Config:
        """Pydantic configuration settings."""
        use_enum_values = True
        schema_extra = {
            "example": {
                "type": "news",
                "identifier": "uuid-123-abc-456",
                "details": "CEO commented on strong quarterly earnings...",
                "relevance_score": 0.85,
                "link": "https://example.com/news/msft-earnings-q3-2023"
            }
        }

# ==============================================================================
# Chat Response Model
# ==============================================================================


class ChatResponse(BaseModel):
    """
    Defines the structure of the response sent back by the backend
    from the chat endpoint.
    """
    assistant_message: ChatMessage = Field(
        ...,
        description="The complete message generated by the AI assistant, "
                    "including its content, role, and any metadata/timestamps added by the backend."
    )
    sources: Optional[List[SourceInfo]] = Field(
        default=None,
        description="Optional list of information sources used by the assistant to generate the response. "
                    "Populated when RAG or source attribution is active."
    )
    request_id: Optional[str] = Field(
        default=None,
        description="An optional unique identifier for the specific chat request/response pair, "
                    "useful for logging, tracing, and debugging purposes (can be generated by the backend)."
    )
    debug_info: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional dictionary containing debugging information. "
                    "Examples: prompt length, LLM call duration, model name used. "
                    "Should ideally only be populated in development/staging environments."
    )

    class Config:
        """Pydantic configuration settings."""
        schema_extra = {
            "example": {
                "assistant_message": {
                    "role": "assistant",
                    "content": "Based on recent news, MSFT's P/E ratio is slightly above its main competitors like GOOGL, but analysts see potential for growth.",
                    "timestamp": "2023-10-27T11:00:15Z",
                    "metadata": {"llm_model": "gpt-4-turbo", "processing_ms": 1250}
                },
                "sources": [
                    {
                        "type": "news",
                        "identifier": "uuid-123-abc-456",
                        "details": "CEO commented on strong quarterly earnings...",
                        "relevance_score": 0.85,
                        "link": "https://example.com/news/msft-earnings-q3-2023"
                    },
                    {
                        "type": "fundamentals",
                        "identifier": "MSFT:PE_RATIO",
                        "details": "Current P/E: 34.5",
                        "relevance_score": 0.9,
                        "link": None
                    }
                ],
                "request_id": "req_abcdef123456",
                "debug_info": {
                    "prompt_tokens": 512,
                    "completion_tokens": 128,
                    "llm_api_time_ms": 1100
                }
            }
        }