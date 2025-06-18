"""
Stock Endpoints Module
Modular structure for stock-related API endpoints
"""

from fastapi import APIRouter

# Import only the required stock endpoint routers (analytics and basic removed)
from .chart.chart_data import router as chart_router
from .chat.chat import router as chat_router
from .fundamentals.fundamentals_stock import router as fundamentals_router
from .ai_summary.ai_summary import router as ai_summary_router
from .news.news_stock import router as news_router
# NEW Stock Header endpoint
from .stock_header.stock_header import router as stock_header_router
# Existing ticker-tape router
from .ticker_tape.ticker_tape import router as ticker_tape_router
# NOTE: Migrated from obsolete 'analytics' to 'technical-analysis'
from .analytics.analytics_stock import technical_analysis_router
from .search.search_stock import router as search_router

# Create main stock router
stock_router = APIRouter(
    prefix="/stock",
    tags=["Stock Data"]
)

# Include only the required sub-routers (basic/unified/analytics removed)
stock_router.include_router(chart_router)
stock_router.include_router(chat_router)
stock_router.include_router(fundamentals_router)
stock_router.include_router(ai_summary_router)
stock_router.include_router(news_router)
stock_router.include_router(stock_header_router)
stock_router.include_router(ticker_tape_router)
stock_router.include_router(technical_analysis_router)
stock_router.include_router(search_router)

__all__ = ["stock_router"] 