# New file content
from fastapi import APIRouter, Depends, Path, HTTPException, status
from fastapi.responses import JSONResponse
import httpx
import uuid, time
from datetime import datetime

from modules.financehub.backend.core.stock_data_service import get_basic_stock_data
from modules.financehub.backend.api.deps import get_http_client, get_cache_service
from modules.financehub.backend.core.cache_service import CacheService

router = APIRouter(
    prefix="/header",
    tags=["Stock Header Data"]
)

@router.get("/{ticker}", summary="Realtime stock header snapshot", description="OHLCV-based quote + basic info, latency < 400 ms")
async def get_stock_header_data_endpoint(
    ticker: str = Path(..., description="Stock ticker symbol", example="AAPL"),
    http_client: httpx.AsyncClient = Depends(get_http_client),
    cache: CacheService = Depends(get_cache_service),
) -> JSONResponse:
    """Light-weight endpoint that returns the latest price/volume/basic fields
    required by the stock-header component. Uses the existing get_basic_stock_data
    helper (EODHD/yfinance hybrid).
    """
    req_id = f"hdr-{uuid.uuid4().hex[:6]}"
    start = time.monotonic()

    data = await get_basic_stock_data(ticker.upper(), http_client, cache)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Header data not found for {ticker.upper()}")

    payload = {
        **data,
        "metadata": {
            "symbol": ticker.upper(),
            "timestamp": datetime.utcnow().isoformat(),
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
            "data_quality": "real_api_data",
            "request_id": req_id,
        },
    }
    return JSONResponse(status_code=200, content=payload) 