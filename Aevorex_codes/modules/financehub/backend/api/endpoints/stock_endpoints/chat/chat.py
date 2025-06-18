"""
AI Chat Conversations with Stock Context - REAL DATA Integration
Now powers FinBot with real-time stock analytics
"""

import logging
import json
import asyncio
import time
import uuid
from typing import AsyncGenerator
from datetime import datetime, timezone
from pathlib import Path as FsPath

from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    Path, 
    Body,
    status,
    Request as FastAPIRequest
)
from fastapi.responses import StreamingResponse, JSONResponse
import httpx
import jinja2

# Import models and services
from modules.financehub.backend.models.chat import ChatRequest, ChatResponse, ChatMessage, ChatRole
from modules.financehub.backend.api.deps import get_http_client, get_cache_service, get_history_manager
from modules.financehub.backend.core.cache_service import CacheService
from modules.financehub.backend.core.stock_data_service import process_premium_stock_data
from modules.financehub.backend.core.chat.context_manager import AbstractHistoryManager
from modules.financehub.backend.core.chat import prompt_builder
from modules.financehub.backend.models.stock import FinBotStockResponse
from modules.financehub.backend.core.chat.query_classifier import QueryClassifier, QueryType
from modules.financehub.backend.core.chat.template_router import TemplateRouter
from modules.financehub.backend.core.chat.rapid_renderer import RapidRenderer
from modules.financehub.backend.core.chat.model_selector import ModelSelector

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Stock Chat"]
)

MODEL_CACHE_KEY = "sessmodel:"  # Redis kulcs prefix a felhasználó által választott modellhez

# ---------------------------------------------------------------------------
# Pydantic payload modellek az új endpointokhoz
# ---------------------------------------------------------------------------

class ChatModelRequest(BaseModel):
    session_id: str = Field(..., min_length=4, description="Frontend generált session/cookie azonosító")
    model: str = Field(..., min_length=3, description="Pl. 'gemini-1.5-flash' vagy 'mistral-large'")

class DeepToggleRequest(BaseModel):
    chat_id: str = Field(..., min_length=4, description="UID a teljes chat szálhoz")
    needs_deep: bool = Field(..., description="True ha a felhasználó mély elemzést kért")

# ---------------------------------------------------------------------------
# Compatibility alias: /chat/finance
# This endpoint exists only to support legacy frontend code paths that are being
# phased out. It forwards the request to the canonical /stock/chat/{ticker}
# endpoint after extracting the ticker symbol from the payload.
# ---------------------------------------------------------------------------

@router.post("/finance", summary="[DEPRECATED] Generic finance chat – forwards to /stock/chat/{ticker}")
async def legacy_finance_chat_endpoint(
    payload: dict = Body(...),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
) -> JSONResponse:
    """Legacy compatibility wrapper around the stock-specific chat endpoint.

    Expected payload shape from legacy frontend:
    {
        "message": "<user prompt>",
        "symbol": "AAPL",
        "context": "financial_analysis"
    }
    """
    symbol = (payload.get("symbol") or payload.get("ticker") or "").upper().strip()
    if not symbol:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="'symbol' field is required")

    chat_request = ChatRequest(
        question=payload.get("message", ""),
        history=[]
    )

    # Delegate to canonical handler
    return await chat_response(symbol, chat_request, http_client, cache)

@router.post("/{ticker}/stream")
async def stream_chat_response(
    ticker: str = Path(..., title="Stock Ticker Symbol", min_length=1, max_length=10),
    request_data: dict = Body(...),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
):
    """
    Stream chat response token by token for better UX – RAPID mód
    """
    ticker_upper = ticker.upper()
    user_message = request_data.get("message") or request_data.get("question", "")
    history = request_data.get("history", [])

    # 0) Session-szintű modell preferencia (Redis-ből)
    selected_model: str | None = None
    session_id = request_data.get("session_id") if isinstance(request_data, dict) else None

    if session_id:
        try:
            cache_val = await cache.get(f"{MODEL_CACHE_KEY}{session_id}")
            if cache_val:
                selected_model = cache_val
        except Exception as e:
            logger.debug("Session model fetch err: %s", e)

    # 1) Request-level override (legmagasabb prioritás)
    if isinstance(request_data, dict):
        try:
            model_from_payload = (
                request_data.get("config_override", {}) or {}
            ).get("model")
            if model_from_payload:
                selected_model = model_from_payload
        except Exception:
            pass

    async def generate_response() -> AsyncGenerator[str, None]:
        # --- Rapid pipeline (rev 2) ---
        # 1) Osztályozzuk a kérdést (ez még jól jöhet később template-választáshoz)
        classifier = QueryClassifier()
        q_type, lang, is_valid = classifier.classify(user_message)
        logger.debug(f"[stream_chat] q_type={q_type} lang={lang} valid={is_valid}")

        # 2) Valódi részvényadatok lekérése (cache-elt) – így a prompt valós számokkal
        try:
            stock_data_model = await process_premium_stock_data(
                symbol=ticker_upper,
                client=http_client,
                cache=cache,
                force_refresh=False,
            )
        except Exception as fetch_err:
            logger.error("[stream_chat] Failed to fetch stock data for %s: %s", ticker_upper, fetch_err, exc_info=True)
            stock_data_model = None  # graceful degradation – prompt builder jelezni fogja az adat hiányát

        # 3) Kiválasztjuk a kérés típusához illő sablont a TemplateRouterrel
        tpl_router = TemplateRouter(cache)
        template_name = await tpl_router.get_template(q_type)

        # Teljes elérési út felépítése; ha a sablonfájl hiányzik, visszaesünk a defaultra
        template_path = prompt_builder.PROMPT_TEMPLATE_DIR / template_name
        if not template_path.exists():
            logger.warning(
                "[stream_chat] Requested template %s not found. Falling back to default template %s",
                template_path.name,
                prompt_builder.DEFAULT_CHAT_TEMPLATE_FILE.name,
            )
            template_path = prompt_builder.DEFAULT_CHAT_TEMPLATE_FILE

        # 4) Build rich prompt a PromptBuilderrel (adatok + sablon alapján)
        prompt_text = prompt_builder.build_chat_prompt_from_model(
            stock_data_model=stock_data_model,
            history=history,
            question=user_message,
            system_template_file=template_path,
        )

        # 5) Ha a kérés angolul érkezett, prefixeljük nyelvi instrukcióval, hogy angol választ kérünk
        if lang == "en":
            prompt_text = (
                "You are a financial assistant. Answer in English.\n\n" + prompt_text
            )

        # Init model selector with preferred model (if any) and create renderer
        model_selector = ModelSelector(override_model=selected_model)
        rapid_renderer = RapidRenderer(model_selector)

        async for token in rapid_renderer.stream(prompt_text, metadata={"ticker": ticker_upper, "phase": "rapid"}):
            yield f"data: {{\"type\":\"token\",\"content\":{json.dumps(token)},\"done\":false}}\n\n"
            await asyncio.sleep(0)  # yield control

        # Rapid vége, felhasználói döntés
        ask_payload = {
            "type": "ask_deep",
            "content": "Szeretnél részletesebb elemzést erről a témáról?",
            "done": False,
        }
        yield f"data: {json.dumps(ask_payload)}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        },
    )

@router.post("/{ticker}")
async def chat_response(
    ticker: str = Path(..., title="Stock Ticker Symbol", min_length=1, max_length=10),
    request_data: ChatRequest = Body(...),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
) -> JSONResponse:
    """
    Regular chat response (non-streaming) for stock-specific queries
    """
    request_start = time.monotonic()
    ticker_upper = ticker.upper()
    request_id = f"{ticker_upper}-chat-{uuid.uuid4().hex[:6]}"
    
    logger.info(f"[{request_id}] Chat request for {ticker_upper}")
    
    try:
        # Fetch comprehensive stock data
        stock_data_model = await fetch_comprehensive_stock_data(ticker_upper, http_client, cache)
        
        # Build prompt
        # Új osztályozás a rapid pipeline előkészítéséhez
        classifier = QueryClassifier()
        q_type, lang, is_valid = classifier.classify(request_data.question)
        logger.debug(f"[{request_id}] Detected q_type={q_type} lang={lang} valid={is_valid}")

        final_prompt = prompt_builder.build_chat_prompt_from_model(
            stock_data_model=stock_data_model,
            history=request_data.history,
            question=request_data.question
        )
        
        # Generate response
        analysis_response = await generate_comprehensive_analysis_with_template(
            ticker=ticker_upper,
            question=request_data.question,
            stock_data_model=stock_data_model,
            final_prompt=final_prompt,
            history=request_data.history,
            http_client=http_client
        )
        
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        
        response_data = {
            "response": analysis_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "processing_time_ms": processing_time
        }
        
        logger.info(f"[{request_id}] Chat response completed in {processing_time}ms")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response_data
        )
        
    except Exception as e:
        processing_time = round((time.monotonic() - request_start) * 1000, 2)
        logger.error(f"[{request_id}] Chat error after {processing_time}ms: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat request for {ticker}: {str(e)}"
        )

async def fetch_comprehensive_stock_data(ticker: str, http_client: httpx.AsyncClient, cache: CacheService) -> FinBotStockResponse:
    """
    Fetch comprehensive data using the unified premium data processing service.
    This replaces the inefficient method of calling individual endpoints via HTTP.
    """
    request_id = f"chat-fetch-{ticker}-{uuid.uuid4().hex[:6]}"
    logger.info(f"[{request_id}] Fetching comprehensive stock data for {ticker} using process_premium_stock_data.")
    
    try:
        # The `process_premium_stock_data` function handles caching internally.
        # We pass force_refresh=False to leverage the cache.
        stock_data_model = await process_premium_stock_data(
            symbol=ticker,
            client=http_client,
            cache=cache,
            force_refresh=False
        )
        
        if not stock_data_model:
            logger.error(f"[{request_id}] No data returned from process_premium_stock_data for {ticker}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not retrieve any stock data for symbol: {ticker}"
            )
            
        logger.info(f"[{request_id}] Successfully fetched comprehensive data for {ticker}.")
        return stock_data_model
        
    except Exception as e:
        logger.error(f"[{request_id}] Error fetching comprehensive data for {ticker}: {e}", exc_info=True)
        # Re-raise as HTTPException to be handled by the main endpoint
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred while fetching data for {ticker}: {str(e)}"
        )

async def generate_comprehensive_analysis_with_template(
    ticker: str, 
    question: str, 
    stock_data_model: FinBotStockResponse,
    final_prompt: str,
    history: list,
    http_client: httpx.AsyncClient
) -> str:
    """
    Generate a comprehensive stock analysis response using the template system.
    This version is adapted to use the FinBotStockResponse model directly.
    """
    try:
        # Import AI service
        from modules.financehub.backend.core.ai.ai_service import generate_ai_summary

        # The prompt is already built, we just need to call the AI service
        # The data required by the AI is encapsulated within the prompt
        request_id = f"chat-ai-{ticker}-{uuid.uuid4().hex[:6]}"
        logger.info(f"[{request_id}] Generating AI summary for '{ticker}' with question: '{question}'")

        # Directly call the AI service with the correct parameters
        ai_response = await generate_ai_summary(
            symbol=ticker,
            df_with_indicators=None,  # We don't have the DataFrame here
            latest_indicators=stock_data_model.latest_indicators if stock_data_model.latest_indicators else {},
            news_items=stock_data_model.news,
            company_overview=stock_data_model.company_overview,
            client=http_client,  # Corrected parameter name from http_client to client
            financials_data=stock_data_model.financials,
            earnings_data=stock_data_model.earnings
        )
        
        if not ai_response:
            logger.warning(f"[{request_id}] AI service returned an empty response for {ticker}.")
            return "I am sorry, but I could not generate an analysis at this time. Please try again later."
            
        return ai_response

    except Exception as e:
        logger.error(f"Error during AI analysis generation for {ticker}: {e}", exc_info=True)
        return f"An unexpected error occurred while generating the AI analysis: {str(e)}"

# ---------------------------------------------------------------------------
# ÚJ DEEP ENDPOINT – részletes elemzés indítása felhasználói kérésre
# ---------------------------------------------------------------------------
@router.post("/{ticker}/deep")
async def deep_chat_response(
    ticker: str = Path(..., title="Stock Ticker Symbol", min_length=1, max_length=10),
    request_data: ChatRequest = Body(...),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
):
    """Mélységi elemzés – MVP stub (még nem Rapid→Deep összefűzés)."""
    ticker_upper = ticker.upper()
    classifier = QueryClassifier()
    q_type, lang, is_valid = classifier.classify(request_data.question)

    # Session-level model
    selected_model: str | None = None
    if request_data and isinstance(request_data, dict):
        session_id = request_data.get("session_id")
        if session_id:
            try:
                cache_val = await cache.get(f"{MODEL_CACHE_KEY}{session_id}")
                if cache_val:
                    selected_model = cache_val
            except Exception:
                pass
        # request-level override still possible
        try:
            model_override = (
                request_data.get("config_override", {}) or {}
            ).get("model")
            if model_override:
                selected_model = model_override
        except Exception:
            pass

    tpl_name = f"{q_type.value}_deep.j2"
    tpl_path = FsPath(__file__).resolve().parents[4] / "prompt_templates" / "financehub" / "deep" / tpl_name
    if not tpl_path.exists():
        # fallback generic template
        tpl_path = FsPath(__file__).resolve().parents[4] / "prompt_templates" / "financehub" / "deep" / "generic_deep.j2"

    tpl_src = tpl_path.read_text(encoding="utf-8")
    template = jinja2.Template(tpl_src)

    # Prepend system prompt (lite)
    lite_prompt_path = FsPath(__file__).resolve().parents[4] / "prompt_templates" / "financehub" / "system" / "lite_system_prompt.j2"
    system_prompt = ""
    try:
        system_prompt = lite_prompt_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("Lite system prompt not found at %s", lite_prompt_path)

    prompt_body = template.render(question=request_data.question, ticker=ticker_upper)
    prompt_text = f"{system_prompt}\n\n{prompt_body}"

    model_selector = ModelSelector()
    from modules.financehub.backend.core.chat.deep_renderer import DeepRenderer
    deep_renderer = DeepRenderer(model_selector, override_model=selected_model)

    async def generate() -> AsyncGenerator[str, None]:
        async for token in deep_renderer.stream(prompt_text, metadata={"ticker": ticker_upper, "phase": "deep"}):
            yield f"data: {{\"type\":\"token\",\"content\":{json.dumps(token)},\"done\":false}}\n\n"
        # DONE
        yield "data: [DONE]\n\n"

    # ------------------------------------------------------------------
    # Metrics: track how many users opt in for deep analysis
    # ------------------------------------------------------------------
    try:
        from modules.financehub.backend.core.chat.metrics_hook import inc_deep_opt_in

        inc_deep_opt_in(ticker=ticker_upper)
    except Exception:  # pragma: no cover – metrics are optional
        pass

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        },
    )

# ---------------------------------------------------------------------------
# ÚJ ENDPOINT: /stock/chat/model – session-szintű modell kiválasztása
# ---------------------------------------------------------------------------

@router.post("/model", summary="Set preferred LLM model for chat session")
async def set_chat_model(
    payload: ChatModelRequest,
    cache: CacheService = Depends(get_cache_service),
):
    try:
        await cache.set(f"{MODEL_CACHE_KEY}{payload.session_id}", payload.model, timeout_seconds=3600)
        return {"status": "ok", "model": payload.model}
    except Exception as e:
        logger.error("Failed to store session model: %s", e)
        raise HTTPException(status_code=500, detail="Failed to persist model choice")

# ---------------------------------------------------------------------------
# ÚJ ENDPOINT: /stock/chat/deep_toggle – rapid->deep kapcsoló
# (MVP: csak cache-eli a flaget; a deep stream endpoint olvashatná.)
# ---------------------------------------------------------------------------

DEEP_FLAG_KEY = "deepflag:"

@router.patch("/deep_toggle", summary="Toggle needs_deep flag for a chat thread")
async def toggle_deep_flag(
    payload: DeepToggleRequest,
    cache: CacheService = Depends(get_cache_service),
):
    try:
        await cache.set(f"{DEEP_FLAG_KEY}{payload.chat_id}", str(payload.needs_deep).lower(), timeout_seconds=7200)
        return {"status": "ok", "needs_deep": payload.needs_deep}
    except Exception as e:
        logger.error("Failed to set deep flag: %s", e)
        raise HTTPException(status_code=500, detail="Failed to toggle deep flag") 