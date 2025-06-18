from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class TickerTapeItem(BaseModel):
    """Egyetlen ticker tape elem adatmodellje."""
    symbol: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    volume: Optional[int] = None
    market_cap: Optional[str] = None
    currency: Optional[str] = "USD"
    exchange: Optional[str] = None
    last_updated: Optional[datetime] = None


class TickerTapeMetadata(BaseModel):
    """Ticker tape metaadat modellje."""
    total_symbols: int
    requested_limit: int
    data_source: str
    last_updated: datetime
    response_time_ms: Optional[float] = None


class TickerTapeResponse(BaseModel):
    """Ticker tape API válasz modellje."""
    status: str = "success"
    data: List[TickerTapeItem]
    metadata: TickerTapeMetadata
    errors: Optional[List[str]] = None 