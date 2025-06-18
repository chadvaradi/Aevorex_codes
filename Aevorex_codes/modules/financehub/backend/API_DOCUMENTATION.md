# 🚀 AEVOREX FinHub Backend API v2.3.0 - Dokumentáció

**Frissítve:** 2025-06-10  
**Backend URL:** `http://localhost:8084`  
**Frontend URL:** `http://localhost:8083`

---

## 📋 Elérhető Endpointok

### 🏥 HEALTH & STATUS

#### `GET /api/v1/health`
**Összefoglaló:** Comprehensive API Health Check  
**Leírás:** Provides the operational status of the API and its critical dependencies  

**Válasz példa:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-10T21:35:00Z",
  "version": "2.3.0",
  "environment": "development",
  "api_prefix": "/api/v1",
  "endpoints": {
    "stock_fundamentals": "/api/v1/stock/fundamentals",
    "stock_news": "/api/v1/stock/news",
    "stock_chart": "/api/v1/stock/chart",
    "stock_ai_summary": "/api/v1/stock/ai-summary",
    "chat": "/api/v1/stock/chat",
    "ticker_tape": "/api/v1/stock/ticker-tape",
    "market_data": "/api/v1/market"
  },
  "dependencies": {
    "fastapi": "✅ operational",
    "modular_stock_router": "✅ operational"
  }
}
```

---

### 📊 STOCK DATA ENDPOINTS

#### ⚠️ REMOVED: `GET /api/v1/stock/{ticker}` 
**Státusz:** ❌ REMOVED - Use modular endpoints below instead  
**Reason:** Slow unified endpoint (300-2000ms) replaced by fast modular endpoints  

#### ⚠️ REMOVED: `GET /api/v1/stock/basic/{ticker}` 
**Státusz:** ❌ REMOVED - Use modular endpoints below instead  
**Reason:** Basic endpoint replaced by specific modular endpoints  

#### ⚠️ REMOVED: `GET /api/v1/stock/analytics/{ticker}` 
**Státusz:** ❌ REMOVED - Analytics functionality integrated into other endpoints  
**Reason:** Analytics data now provided through fundamentals and AI summary endpoints  

---

### 🚀 MODULAR ENDPOINTS (FAST)

#### `GET /api/v1/stock/chart/{ticker}` ⭐ **RECOMMENDED**
**Összefoglaló:** Get Chart Data - REAL API (OHLCV ~200ms)  
**Leírás:** Returns OHLCV data for charting from real APIs  

**Paraméterek:**
- `ticker` (path): Stock ticker symbol
- `period` (query): Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max)
- `interval` (query): Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

**Státusz:** ✅ MŰKÖDIK GYORSAN (~200ms)

#### `GET /api/v1/stock/fundamentals/{ticker}` ⭐ **RECOMMENDED**
**Összefoglaló:** Get Stock Fundamentals - REAL API (~300ms)  
**Leírás:** Returns fundamental analysis data from real APIs: company overview, financial metrics, ratios  

**Státusz:** ✅ MŰKÖDIK GYORSAN (~300ms)

#### `GET /api/v1/stock/news/{ticker}` ⭐ **RECOMMENDED**
**Összefoglaló:** Get Stock News - REAL API (~300ms)  
**Leírás:** Returns news data for specific stock from real APIs: headlines, summaries, sentiment  

**Paraméterek:**
- `limit` (query, optional): Number of news items to return (default: 10)

**Státusz:** ✅ MŰKÖDIK GYORSAN (~300ms)

#### `GET /api/v1/stock/ai-summary/{ticker}` ⭐ **RECOMMENDED**
**Összefoglaló:** Get AI Summary - REAL API (~500ms)  
**Leírás:** Returns AI-generated summary and analysis for specific stock including technical analysis insights  

**Státusz:** ✅ MŰKÖDIK GYORSAN (~500ms)

#### `GET /api/v1/stock/ticker-tape/` ⭐ **RECOMMENDED**
**Összefoglaló:** Get Ticker Tape Data - REAL API (~300ms)  
**Leírás:** Returns ticker tape data for popular stocks with real-time prices  

**Paraméterek:**
- `limit` (query, optional): Maximum number of results (default: 20)
- `force_refresh` (query, optional): Force cache refresh

**Státusz:** ✅ MŰKÖDIK TÖKÉLETES (~300ms)

#### `GET /api/v1/stock/search`
**Összefoglaló:** Search Stock Symbols  
**Leírás:** Search for stocks by symbol or company name  

**Paraméterek:**
- `q` (query): Search query (symbol or company name)
- `limit` (query, optional): Maximum number of results (1-50)

**Státusz:** ✅ MŰKÖDIK GYORSAN (~100ms)

---

### 💬 CHAT & AI ENDPOINTS

#### `POST /api/v1/stock/chat/{ticker}`
**Összefoglaló:** AI Chat Response  
**Leírás:** Get AI analysis for a specific stock  

#### `POST /api/v1/stock/chat/{ticker}/stream`
**Összefoglaló:** Streaming AI Chat Response  
**Leírás:** Get streaming AI analysis for a specific stock  

---

### 📰 MARKET DATA ENDPOINTS

#### `GET /api/v1/market/news`
**Összefoglaló:** General Market News  
**Leírás:** Returns aggregated market news from multiple sources  

---

## 🎯 ENDPOINT TELJESÍTMÉNY

| Endpoint | Átlagos válaszidő | Cache TTL | Státusz |
|----------|------------------|-----------|---------|
| `/api/v1/stock/search` | ~100ms | 5 min | ✅ Produkciós |
| `/api/v1/stock/ticker-tape/` | ~300ms | 5 min | ✅ Produkciós |
| `/api/v1/stock/chart/{ticker}` | ~200ms | 10 min | ✅ Produkciós |
| `/api/v1/stock/fundamentals/{ticker}` | ~300ms | 30 min | ✅ Produkciós |
| `/api/v1/stock/news/{ticker}` | ~300ms | 15 min | ✅ Produkciós |
| `/api/v1/stock/ai-summary/{ticker}` | ~500ms | 15 min | ✅ Produkciós |
| `/api/v1/health` | <10ms | No cache | ✅ Produkciós |

**❌ REMOVED:** 
- `/api/v1/stock/{ticker}` (was 300-2000ms - too slow)
- `/api/v1/stock/basic/{ticker}` (replaced by modular endpoints)
- `/api/v1/stock/analytics/{ticker}` (integrated into other endpoints)

---

## 🔧 HASZNÁLATI PÉLDÁK

### ⚠️ FRISSÍTVE: Komplett részvény adat lekérése (MODULAR):
```bash
# OLD (REMOVED): curl "http://localhost:8084/api/v1/stock/AAPL"
# OLD (REMOVED): curl "http://localhost:8084/api/v1/stock/basic/AAPL"
# OLD (REMOVED): curl "http://localhost:8084/api/v1/stock/analytics/AAPL"
# NEW (MODULAR):
curl "http://localhost:8084/api/v1/stock/fundamentals/AAPL"  # Company data
curl "http://localhost:8084/api/v1/stock/ai-summary/AAPL"   # AI analysis with technical insights
curl "http://localhost:8084/api/v1/stock/news/AAPL"        # News data
curl "http://localhost:8084/api/v1/stock/chart/AAPL?period=1y&interval=1d"  # Chart data
```

### Ticker szalag adatok:
```bash
curl "http://localhost:8084/api/v1/stock/ticker-tape/?limit=10"
```

### Chart adatok:
```bash
curl "http://localhost:8084/api/v1/stock/chart/AAPL?period=1y&interval=1d"
```

### Keresés:
```bash
curl "http://localhost:8084/api/v1/stock/search?q=Apple&limit=5"
```

---

## ✅ API STÁTUSZ ÖSSZEFOGLALÓ

- **Backend Működés:** ✅ TÖKÉLETES
- **Modular Architecture:** ✅ FAST & EFFICIENT
- **Valós Adatok:** ✅ EODHD + Yahoo Finance + Multiple Sources
- **Cache Rendszer:** ✅ Redis alapú optimalizált cache
- **AI Integráció:** ✅ OpenRouter + Gemini 2.0
- **Teljesítmény:** ✅ Sub-500ms átlagos válaszidő (JAVÍTVA!)
- **Hibakezelés:** ✅ Robusztus error handling
- **Dokumentáció:** ✅ Swagger UI elérhető `/api/v1/docs`

---

**🚀 Backend URL-ek:**
- API Root: `http://localhost:8084/api/v1/`
- Swagger Docs: `http://localhost:8084/api/v1/docs`
- Health Check: `http://localhost:8084/api/v1/health` 