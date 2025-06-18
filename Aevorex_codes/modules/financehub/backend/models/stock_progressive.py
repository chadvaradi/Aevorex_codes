# backend/models/stock_progressive.py - Progressive Loading Response Models
# =============================================================================
# Pydantic models for progressive stock data responses
#
# Models for each loading phase:
# - BasicStockResponse: Phase 1 basic data
# - ChartDataResponse: Phase 2 chart data  
# - FundamentalsResponse: Phase 3 fundamentals
# - AnalyticsResponse: Phase 4 analytics
#
# Version: 1.0.0
# =============================================================================

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

# === BASE MODELS ===

class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MetadataModel(BaseModel):
    """Response metadata"""
    symbol: str = Field(..., description="Stock symbol")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = Field(default="aevorex", description="Data source")
    cache_hit: bool = Field(default=False, description="Whether data came from cache")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")

# === PHASE 1: BASIC STOCK DATA ===

class BasicPriceData(BaseModel):
    """Basic price information"""
    symbol: str = Field(..., description="Stock symbol")
    price: Optional[float] = Field(None, description="Current price")
    change: Optional[float] = Field(None, description="Price change")
    change_percent: Optional[float] = Field(None, description="Percentage change")
    day_high: Optional[float] = Field(None, description="Day's high")
    day_low: Optional[float] = Field(None, description="Day's low")
    volume: Optional[int] = Field(None, description="Trading volume")
    market_cap: Optional[int] = Field(None, description="Market capitalization")

class BasicCompanyInfo(BaseModel):
    """Basic company information"""
    name: Optional[str] = Field(None, description="Company name")
    exchange: Optional[str] = Field(None, description="Stock exchange")
    currency: Optional[str] = Field(None, description="Trading currency")
    sector: Optional[str] = Field(None, description="Company sector")
    industry: Optional[str] = Field(None, description="Company industry")

class BasicStockResponse(BaseModel):
    """Phase 1: Basic stock data response"""
    metadata: MetadataModel
    price_data: BasicPriceData
    company_info: BasicCompanyInfo
    
    class Config:
        schema_extra = {
            "example": {
                "metadata": {
                    "symbol": "AAPL",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "source": "aevorex",
                    "cache_hit": False,
                    "processing_time_ms": 85.4
                },
                "price_data": {
                    "symbol": "AAPL",
                    "price": 185.92,
                    "change": 2.45,
                    "change_percent": 1.34,
                    "day_high": 187.50,
                    "day_low": 183.20,
                    "volume": 45890123,
                    "market_cap": 2890000000000
                },
                "company_info": {
                    "name": "Apple Inc.",
                    "exchange": "NASDAQ",
                    "currency": "USD",
                    "sector": "Technology",
                    "industry": "Consumer Electronics"
                }
            }
        }

# === PHASE 2: CHART DATA ===

class OHLCVDataPoint(BaseModel):
    """Single OHLCV data point"""
    timestamp: datetime = Field(..., description="Data point timestamp")
    open: float = Field(..., description="Opening price")
    high: float = Field(..., description="High price")
    low: float = Field(..., description="Low price")
    close: float = Field(..., description="Closing price")
    volume: int = Field(..., description="Trading volume")

class TechnicalIndicators(BaseModel):
    """Technical indicators data"""
    sma_20: Optional[List[float]] = Field(None, description="20-day Simple Moving Average")
    sma_50: Optional[List[float]] = Field(None, description="50-day Simple Moving Average")
    rsi: Optional[List[float]] = Field(None, description="Relative Strength Index")
    macd: Optional[Dict[str, List[float]]] = Field(None, description="MACD indicators")
    bollinger_bands: Optional[Dict[str, List[float]]] = Field(None, description="Bollinger Bands")

class ChartDataResponse(BaseModel):
    """Phase 2: Chart data response"""
    metadata: MetadataModel
    ohlcv_data: List[OHLCVDataPoint] = Field(..., description="OHLCV historical data")
    technical_indicators: Optional[TechnicalIndicators] = Field(None, description="Technical indicators")
    period: str = Field(..., description="Data period (1d, 1mo, 1y, etc.)")
    interval: str = Field(..., description="Data interval (1m, 1h, 1d, etc.)")
    
    class Config:
        schema_extra = {
            "example": {
                "metadata": {
                    "symbol": "AAPL",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "source": "aevorex",
                    "cache_hit": True,
                    "processing_time_ms": 156.8
                },
                "ohlcv_data": [
                    {
                        "timestamp": "2024-01-14T09:30:00Z",
                        "open": 183.50,
                        "high": 187.50,
                        "low": 183.20,
                        "close": 185.92,
                        "volume": 45890123
                    }
                ],
                "technical_indicators": {
                    "sma_20": [184.25, 184.50, 185.12],
                    "rsi": [65.4, 66.1, 64.8]
                },
                "period": "1y",
                "interval": "1d"
            }
        }

# === PHASE 3: FUNDAMENTALS ===

class FinancialRatios(BaseModel):
    """Key financial ratios"""
    pe_ratio: Optional[float] = Field(None, description="Price-to-Earnings ratio")
    pb_ratio: Optional[float] = Field(None, description="Price-to-Book ratio")
    ps_ratio: Optional[float] = Field(None, description="Price-to-Sales ratio")
    peg_ratio: Optional[float] = Field(None, description="Price/Earnings to Growth ratio")
    debt_to_equity: Optional[float] = Field(None, description="Debt-to-Equity ratio")
    current_ratio: Optional[float] = Field(None, description="Current ratio")
    quick_ratio: Optional[float] = Field(None, description="Quick ratio")
    roe: Optional[float] = Field(None, description="Return on Equity")
    roa: Optional[float] = Field(None, description="Return on Assets")
    gross_margin: Optional[float] = Field(None, description="Gross profit margin")
    operating_margin: Optional[float] = Field(None, description="Operating margin")
    net_margin: Optional[float] = Field(None, description="Net profit margin")

class KeyMetrics(BaseModel):
    """Key financial metrics"""
    market_cap: Optional[int] = Field(None, description="Market capitalization")
    enterprise_value: Optional[int] = Field(None, description="Enterprise value")
    shares_outstanding: Optional[int] = Field(None, description="Shares outstanding")
    float_shares: Optional[int] = Field(None, description="Float shares")
    beta: Optional[float] = Field(None, description="Beta coefficient")
    eps_ttm: Optional[float] = Field(None, description="Earnings per share (TTM)")
    revenue_ttm: Optional[int] = Field(None, description="Revenue (TTM)")
    dividend_yield: Optional[float] = Field(None, description="Dividend yield")
    payout_ratio: Optional[float] = Field(None, description="Dividend payout ratio")
    week_52_high: Optional[float] = Field(None, description="52-week high")
    week_52_low: Optional[float] = Field(None, description="52-week low")

class CompanyProfile(BaseModel):
    """Detailed company profile"""
    name: Optional[str] = Field(None, description="Company name")
    description: Optional[str] = Field(None, description="Company description")
    sector: Optional[str] = Field(None, description="Business sector")
    industry: Optional[str] = Field(None, description="Industry classification")
    country: Optional[str] = Field(None, description="Headquarters country")
    website: Optional[str] = Field(None, description="Company website")
    employees: Optional[int] = Field(None, description="Number of employees")
    founded: Optional[int] = Field(None, description="Year founded")
    ceo: Optional[str] = Field(None, description="Chief Executive Officer")

class FundamentalsResponse(BaseModel):
    """Phase 3: Fundamentals data response"""
    metadata: MetadataModel
    company_profile: CompanyProfile
    financial_ratios: FinancialRatios
    key_metrics: KeyMetrics
    last_earnings_date: Optional[datetime] = Field(None, description="Last earnings report date")
    next_earnings_date: Optional[datetime] = Field(None, description="Next earnings report date")
    
    class Config:
        schema_extra = {
            "example": {
                "metadata": {
                    "symbol": "AAPL",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "source": "aevorex",
                    "cache_hit": False,
                    "processing_time_ms": 412.6
                },
                "company_profile": {
                    "name": "Apple Inc.",
                    "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
                    "sector": "Technology",
                    "industry": "Consumer Electronics",
                    "country": "United States",
                    "website": "https://www.apple.com",
                    "employees": 154000,
                    "founded": 1976,
                    "ceo": "Tim Cook"
                },
                "financial_ratios": {
                    "pe_ratio": 28.5,
                    "pb_ratio": 8.2,
                    "debt_to_equity": 1.73,
                    "roe": 0.285,
                    "gross_margin": 0.38
                },
                "key_metrics": {
                    "market_cap": 2890000000000,
                    "beta": 1.25,
                    "eps_ttm": 6.52,
                    "dividend_yield": 0.0047
                }
            }
        }

# === PHASE 4: ANALYTICS ===

class NewsItem(BaseModel):
    """News article item"""
    title: str = Field(..., description="Article title")
    summary: Optional[str] = Field(None, description="Article summary")
    url: Optional[str] = Field(None, description="Article URL")
    source: Optional[str] = Field(None, description="News source")
    published_at: Optional[datetime] = Field(None, description="Publication date")
    sentiment: Optional[str] = Field(None, description="Sentiment analysis (positive/negative/neutral)")
    relevance_score: Optional[float] = Field(None, description="Relevance score (0-1)")

class AnalystRating(BaseModel):
    """Analyst rating information"""
    rating: Optional[str] = Field(None, description="Rating (Buy/Hold/Sell)")
    target_price: Optional[float] = Field(None, description="Price target")
    analyst_firm: Optional[str] = Field(None, description="Analyst firm name")
    date: Optional[datetime] = Field(None, description="Rating date")

class SentimentAnalysis(BaseModel):
    """Sentiment analysis data"""
    overall_sentiment: Optional[str] = Field(None, description="Overall sentiment")
    sentiment_score: Optional[float] = Field(None, description="Sentiment score (-1 to 1)")
    bullish_mentions: Optional[int] = Field(None, description="Bullish mentions count")
    bearish_mentions: Optional[int] = Field(None, description="Bearish mentions count")
    social_volume: Optional[int] = Field(None, description="Social media mention volume")

class AIAnalysis(BaseModel):
    """AI-generated analysis"""
    summary: Optional[str] = Field(None, description="AI-generated summary")
    investment_thesis: Optional[str] = Field(None, description="Investment thesis")
    risk_factors: Optional[List[str]] = Field(None, description="Key risk factors")
    growth_drivers: Optional[List[str]] = Field(None, description="Growth drivers")
    recommendation: Optional[str] = Field(None, description="AI recommendation")
    confidence_score: Optional[float] = Field(None, description="Analysis confidence (0-1)")

class AnalyticsResponse(BaseModel):
    """Phase 4: Analytics and AI data response"""
    metadata: MetadataModel
    news: List[NewsItem] = Field(default=[], description="Recent news articles")
    analyst_ratings: List[AnalystRating] = Field(default=[], description="Analyst ratings")
    sentiment_analysis: Optional[SentimentAnalysis] = Field(None, description="Sentiment analysis")
    ai_analysis: Optional[AIAnalysis] = Field(None, description="AI-generated analysis")
    
    class Config:
        schema_extra = {
            "example": {
                "metadata": {
                    "symbol": "AAPL",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "source": "aevorex",
                    "cache_hit": False,
                    "processing_time_ms": 1245.3
                },
                "news": [
                    {
                        "title": "Apple Reports Strong Q4 Earnings",
                        "summary": "Apple Inc. reported better-than-expected quarterly earnings...",
                        "url": "https://example.com/news/1",
                        "source": "Financial Times",
                        "published_at": "2024-01-14T16:30:00Z",
                        "sentiment": "positive",
                        "relevance_score": 0.95
                    }
                ],
                "sentiment_analysis": {
                    "overall_sentiment": "positive",
                    "sentiment_score": 0.65,
                    "bullish_mentions": 234,
                    "bearish_mentions": 89
                },
                "ai_analysis": {
                    "summary": "Apple shows strong fundamentals with solid revenue growth...",
                    "recommendation": "BUY",
                    "confidence_score": 0.82
                }
            }
        }

# === PREMIUM FEATURE MODELS (Future) ===

class DeepSearchRequest(BaseModel):
    """Deep search request model"""
    symbol: str = Field(..., description="Stock symbol")
    query: str = Field(..., description="Search query or question")
    search_depth: Optional[str] = Field("standard", description="Search depth (standard/deep/comprehensive)")
    include_web_search: bool = Field(True, description="Include web search results")
    include_documents: bool = Field(True, description="Include document analysis")

class DeepSearchResponse(BaseModel):
    """Deep search response model"""
    metadata: MetadataModel
    search_results: List[Dict[str, Any]] = Field(..., description="Comprehensive search results")
    ai_insights: Optional[str] = Field(None, description="AI-generated insights")
    confidence_score: Optional[float] = Field(None, description="Result confidence score")
    sources_used: List[str] = Field(..., description="Data sources utilized")

class DocumentAnalysisResponse(BaseModel):
    """Document analysis response model"""
    metadata: MetadataModel
    document_summary: Optional[str] = Field(None, description="Document summary")
    key_findings: List[str] = Field(default=[], description="Key findings")
    financial_data_extracted: Optional[Dict[str, Any]] = Field(None, description="Extracted financial data")
    ai_analysis: Optional[str] = Field(None, description="AI analysis of document")
    relevance_score: Optional[float] = Field(None, description="Document relevance score") 