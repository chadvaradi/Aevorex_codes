"""
Stock Search Endpoint
Provides search functionality for stock symbols and company names
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

class SearchResult(BaseModel):
    """Single search result"""
    symbol: str = Field(..., description="Stock ticker symbol")
    name: str = Field(..., description="Company name")
    exchange: Optional[str] = Field(None, description="Exchange name")
    type: str = Field(default="stock", description="Security type")

class SearchResponse(BaseModel):
    """Search response model"""
    query: str = Field(..., description="Original search query")
    results: List[SearchResult] = Field(..., description="Search results")
    total_results: int = Field(..., description="Total number of results")
    limit: int = Field(..., description="Applied limit")

# Popular stocks database for quick search
POPULAR_STOCKS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "exchange": "NASDAQ"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "exchange": "NASDAQ"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "exchange": "NASDAQ"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "exchange": "NASDAQ"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "exchange": "NASDAQ"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "exchange": "NASDAQ"},
    {"symbol": "AMD", "name": "Advanced Micro Devices Inc.", "exchange": "NASDAQ"},
    {"symbol": "INTC", "name": "Intel Corporation", "exchange": "NASDAQ"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "exchange": "NYSE"},
    {"symbol": "ORCL", "name": "Oracle Corporation", "exchange": "NYSE"},
    {"symbol": "ADBE", "name": "Adobe Inc.", "exchange": "NASDAQ"},
    {"symbol": "PYPL", "name": "PayPal Holdings Inc.", "exchange": "NASDAQ"},
    {"symbol": "DIS", "name": "The Walt Disney Company", "exchange": "NYSE"},
    {"symbol": "UBER", "name": "Uber Technologies Inc.", "exchange": "NYSE"},
    {"symbol": "SPOT", "name": "Spotify Technology S.A.", "exchange": "NYSE"},
    {"symbol": "ZOOM", "name": "Zoom Video Communications Inc.", "exchange": "NASDAQ"},
    {"symbol": "SQ", "name": "Block Inc.", "exchange": "NYSE"},
    {"symbol": "SHOP", "name": "Shopify Inc.", "exchange": "NYSE"},
]

@router.get("/search", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., description="Search query (symbol or company name)", min_length=1),
    limit: int = Query(10, description="Maximum number of results", ge=1, le=50)
):
    """
    Search for stocks by symbol or company name
    
    This endpoint provides fast search functionality for stock symbols and company names.
    It searches through a curated list of popular stocks for quick results.
    
    Args:
        q: Search query (can be symbol like 'AAPL' or company name like 'Apple')
        limit: Maximum number of results to return (1-50)
    
    Returns:
        SearchResponse with matching stocks
    """
    try:
        logger.info(f"Stock search request: query='{q}', limit={limit}")
        
        # Normalize query for search
        query_lower = q.lower().strip()
        
        # Search results
        results = []
        
        # Search by symbol (exact and partial matches)
        for stock in POPULAR_STOCKS:
            symbol_lower = stock["symbol"].lower()
            name_lower = stock["name"].lower()
            
            # Exact symbol match (highest priority)
            if symbol_lower == query_lower:
                results.insert(0, SearchResult(**stock))
                continue
            
            # Partial symbol match
            if query_lower in symbol_lower:
                results.append(SearchResult(**stock))
                continue
            
            # Company name match
            if query_lower in name_lower:
                results.append(SearchResult(**stock))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_results = []
        for result in results:
            if result.symbol not in seen:
                seen.add(result.symbol)
                unique_results.append(result)
        
        # Apply limit
        limited_results = unique_results[:limit]
        
        response = SearchResponse(
            query=q,
            results=limited_results,
            total_results=len(unique_results),
            limit=limit
        )
        
        logger.info(f"Stock search completed: found {len(limited_results)} results for '{q}'")
        return response
        
    except Exception as e:
        logger.error(f"Error in stock search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") 