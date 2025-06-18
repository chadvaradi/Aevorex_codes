/**
 * @file api-unified.js - Consolidated API Service for FinanceHub
 * @description Unified API client consolidating functionality from:
 *              - api-client.js (simple interface)
 *              - api.js (performance optimizations)
 *              - api-service.js (state management integration)
 * @version 3.0.0 - Consolidated Architecture
 * @author AEVOREX FinanceHub Team
 */

/**
 * Custom API Error class for enhanced error handling
 */
class FinanceHubAPIError extends Error {
    constructor(message, status = 0, data = null, endpoint = null) {
        super(message);
        this.name = 'FinanceHubAPIError';
        this.status = status;
        this.data = data;
        this.endpoint = endpoint;
        this.timestamp = new Date().toISOString();
    }

    isClientError() { return this.status >= 400 && this.status < 500; }
    isServerError() { return this.status >= 500; }
    isNetworkError() { return this.status === 0; }
}

/**
 * Consolidated FinanceHub API Service
 * Combines performance optimization, caching, and state management
 */
class FinanceHubAPIService {
    static VERSION = '3.0.0';
    
    // 🎯 STATIKUS API KONFIGURÁCIÓ - Minden komponens elérheti osztály szinten is
    static API_CONFIG = {
        // Backend and frontend ports
        BACKEND_PORT: 8084,
        FRONTEND_PORT: 8083,
        REQUEST_TIMEOUT: 30000,
        MAX_RETRIES: 3,
        CACHE_TTL: 300000, // 5 minutes default
        
        // API endpoints (analytics and basic removed)
        ENDPOINTS: {
            HEALTH: '/api/v1/health',
            TICKER_TAPE: '/api/v1/stock/ticker-tape',
            FUNDAMENTALS: '/api/v1/stock/fundamentals',
            NEWS: '/api/v1/stock/news',
            AI_SUMMARY: '/api/v1/stock/ai-summary',
            CHAT: '/api/v1/stock/chat',
            CHART: '/api/v1/stock/chart',
            TECHNICAL_ANALYSIS: '/api/v1/stock/technical-analysis'
        }
    };
    
    constructor(stateManager = null) {
        this.stateManager = stateManager;
        this.BACKEND_PORT = 8084;  // ✅ Backend: 8084
        this.FRONTEND_PORT = 8083;  // ✅ Frontend: 8083 konzisztens
        
        this.baseURL = this.getBaseURL();
        this.apiPrefix = '/api/v1';
        
        // Performance & Connection Management
        this.requestQueue = new Map();
        this.activeRequests = new Set();
        this.maxConcurrentRequests = 6;
        this.requestTimeout = 15000; // 15 seconds
        
        // Enhanced Caching System
        this.cache = new Map();
        
        // Initialize cache categories
        this.cacheCategories = {
            stock_chart: 'stock_chart',
            stock_fundamentals: 'stock_fundamentals', 
            market: 'market',
            chat: 'chat',
            ai_summary: 'ai_summary',
            stock_header: 'stock_header'
        };
        
        // Request Optimization
        this.pendingRequests = new Map();
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        };
        
        // Performance Metrics
        this.metrics = {
            requests: 0,
            cacheHits: 0,
            cacheWrites: 0,
            errors: 0,
            totalResponseTime: 0
        };
        
        // 🎯 KÖZPONTI API KONFIGURÁCIÓ - Minden komponens ezt használja
        this.config = {
            // Konzisztens port konfigurációk
            BACKEND_PORT: this.BACKEND_PORT,  // ✅ Backend: 8084
            FRONTEND_PORT: this.FRONTEND_PORT, // ✅ Frontend: 8083
            
            // Dinamikus URL feloldás
            BASE_URL: this.baseURL,  // ✅ Automatikusan backend URL (8084)
            
            // API végpontok (basic endpoint eltávolítva)
            ENDPOINTS: {
                HEALTH: '/api/v1/health',
                STOCK_CHART: '/api/v1/stock/chart',
                STOCK_NEWS: '/api/v1/stock/news',
                STOCK_CHAT: '/api/v1/stock/chat/{ticker}',
                SEARCH_SYMBOLS: '/api/v1/search/symbols',
                SEARCH_COMPANIES: '/api/v1/search/companies',
                MARKET_TICKER: '/api/v1/stock/ticker-tape/',
                TECHNICAL_ANALYSIS: '/api/v1/stock/technical-analysis/{ticker}'
            },
            
            // Timeout konfigurációk
            TIMEOUTS: {
                DEFAULT: 10000,
                STREAMING: 30000,
                CHAT: 60000
            }
        };
        
        // API Endpoints - MODULÁRIS BACKEND ENDPOINTOK (analytics és basic eltávolítva)
        this.endpoints = {
            // Stock Data Endpoints - CSAK MODULÁRIS ENDPOINTOK
            stock: {
                chart: '/api/v1/stock/chart/{ticker}', 
                fundamentals: '/api/v1/stock/fundamentals/{ticker}',
                news: '/api/v1/stock/news/{ticker}',
                aiSummary: '/api/v1/stock/ai-summary/{ticker}',
                technicalAnalysis: '/api/v1/stock/technical-analysis/{ticker}'
            },
            // Market Data Endpoints
            market: {
                tickerTape: '/api/v1/stock/ticker-tape/',
                news: '/api/v1/market/news'
            },
            // Chat Endpoints - Real streaming support
            chat: {
                send: '/api/v1/stock/chat/{ticker}',
                response: '/api/v1/stock/chat/{ticker}',
                stream: '/api/v1/stock/chat/{ticker}/stream'
            },
            // Health Check
            health: '/api/v1/health'
        };
        
        this.init();
    }
    
    /**
     * Initialize the API service
     */
    init() {
        this.setupDefaultHeaders();
        this.preconnectToAPI();
        this.startCacheCleanup();
        
        // ✅ FIX: Statikus konfiguráció frissítése
        FinanceHubAPIService.API_CONFIG.BASE_URL = this.baseURL;
        
        if (this.stateManager) {
            this.dispatchAction('API_SERVICE_INIT', { version: FinanceHubAPIService.VERSION });
        }
        
        console.log(`🚀 FinanceHub API Service v${FinanceHubAPIService.VERSION} initialized`);
    }
    
    /**
     * 🎯 KÖZPONTI URL MEGHATÁROZÁS - Single Source of Truth
     */
    getBaseURL() {
        // Fejlesztési környezet: Frontend (8083) → Backend (8084)
        if (this.isDevelopment()) {
            return `http://localhost:8084`;  // ✅ Backend mindig 8084
        }
        
        // Produkciós környezet: Same origin
        return window.location.origin;
    }
    
    /**
     * Fejlesztési környezet felismerése
     */
    isDevelopment() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        return hostname === 'localhost' || 
               port === '8083' || // ✅ Frontend fejlesztési port: 8083
               port === '3000';
    }
    
    /**
     * Setup default headers for all requests
     */
    setupDefaultHeaders() {
        this.defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Client-Version': FinanceHubAPIService.VERSION
        };
    }
    
    /**
     * Get headers for API requests
     * @returns {Object} Headers object
     */
    getHeaders() {
        return { ...this.defaultHeaders };
    }
    
    /**
     * Preconnect to API for faster requests
     */
    preconnectToAPI() {
        if (typeof document !== 'undefined') {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = this.baseURL;
            document.head.appendChild(link);
        }
    }
    
    /**
     * Generate unique request ID for tracking
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Dispatch action to state manager if available
     */
    dispatchAction(type, payload = {}) {
        if (this.stateManager && typeof this.stateManager.dispatch === 'function') {
            this.stateManager.dispatch({ type, payload });
        }
    }
    
    /**
     * Enhanced request method with retry logic and caching
     */
    async makeRequest(endpoint, options = {}) {
        const requestId = this.generateRequestId();
        const startTime = performance.now();
        
        try {
            // Check cache first
            const cacheKey = this.getCacheKey(endpoint, options);
            const cacheType = this.getCacheType(endpoint);
            const cachedData = this.getFromCache(cacheKey, cacheType);
            
            if (cachedData) {
                this.metrics.cacheHits++;
                return cachedData;
            }
            
            // Coalesce identical requests
            if (this.pendingRequests.has(cacheKey)) {
                return await this.pendingRequests.get(cacheKey);
            }
            
            // Create request promise
            const requestPromise = this.executeRequest(endpoint, options, requestId);
            this.pendingRequests.set(cacheKey, requestPromise);
            
            const result = await requestPromise;
            
            // Cache successful results
            if (result && !options.skipCache) {
                this.setCache(cacheKey, result, cacheType);
            }
            
            // Record metrics
            const endTime = performance.now();
            this.recordMetrics(endTime - startTime, true);
            
            return result;
            
        } catch (error) {
            const endTime = performance.now();
            this.recordMetrics(endTime - startTime, false);
            
            // ✅ ENHANCED ERROR LOGGING
            console.error(`❌ API REQUEST FAILED:`, {
                endpoint,
                method: options.method || 'GET',
                requestId,
                error: error.message,
                status: error.status || 'UNKNOWN',
                timestamp: new Date().toISOString(),
                url: `${this.baseURL}${endpoint}`
            });
            
            // ✅ SPECIFIC ENDPOINT MISSING WARNINGS
            if (error.status === 404) {
                console.warn(`🚨 ENDPOINT NOT FOUND: ${endpoint} - Backend API missing this endpoint!`);
            } else if (error.status === 0 || error.message.includes('Failed to fetch')) {
                console.error(`🌐 NETWORK ERROR: Cannot connect to backend at ${this.baseURL}`);
            } else if (error.status >= 500) {
                console.error(`🔥 SERVER ERROR: Backend returned ${error.status} for ${endpoint}`);
            }
            
            // Dispatch error to state manager
            this.dispatchAction('API_ERROR', {
                requestId,
                endpoint,
                error: error.message,
                status: error.status
            });
            
            throw error;
        } finally {
            // Clean up pending request
            const cacheKey = this.getCacheKey(endpoint, options);
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * Execute HTTP request with retry logic
     */
    async executeRequest(endpoint, options, requestId, retryCount = 0) {
        const startTime = performance.now();
        const url = this.buildURL(endpoint, options.params);

        const headers = { ...this.defaultHeaders, ...options.headers };

        // 🎯 CLERK JWT AUTHENTICATION - CRITICAL FIX
        // Dinamikusan lekérjük a tokent minden kérésnél
        if (window.Clerk && window.Clerk.session) {
            try {
                const token = await window.Clerk.session.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.warn('Clerk session token could not be retrieved.', error);
            }
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        headers.signal = controller.signal;
        
        try {
            // Diagnostic console log for every network request
            if (typeof console !== 'undefined') {
                console.log(`%c[FinanceHub API] → ${options.method || 'GET'} ${url}`,'color:#06f');
            }

            this.dispatchAction('API_REQUEST_START', { requestId, endpoint, method: options.method || 'GET' });
            
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: headers,
                ...options
            });
            
            if (!response.ok) {
                throw new FinanceHubAPIError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    null,
                    endpoint
                );
            }
            
            const data = await response.json();
            
            this.dispatchAction('API_REQUEST_SUCCESS', { requestId, endpoint, data });
            
            return data;
            
        } catch (error) {
            // Convert all errors to FinanceHubAPIError for consistent handling
            let apiError;
            if (error instanceof FinanceHubAPIError) {
                apiError = error;
            } else {
                // Network error, timeout, or other fetch errors
                const status = error.name === 'AbortError' ? 0 : (error.status || 0);
                apiError = new FinanceHubAPIError(
                    error.message || 'Unknown network error',
                    status,
                    null,
                    endpoint
                );
            }
            
            // Retry logic for network errors
            if (retryCount < this.retryConfig.maxRetries && this.shouldRetry(apiError)) {
                const delay = Math.min(
                    this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
                    this.retryConfig.maxDelay
                );
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeRequest(endpoint, options, requestId, retryCount + 1);
            }
            
            this.dispatchAction('API_REQUEST_FAILURE', { requestId, endpoint, error: apiError.message });
            
            // 🚨 CRITICAL FIX: Dispatch global error for debugging
            window.dispatchEvent(new CustomEvent('financehub-error', {
                detail: { 
                    component: 'api', 
                    error: apiError.message, 
                    endpoint, 
                    status: apiError.status,
                    retryCount 
                }
            }));
            
            throw apiError;
        }
    }
    
    /**
     * Determine if request should be retried
     */
    shouldRetry(error) {
        // Ensure we're working with FinanceHubAPIError
        if (typeof error.isNetworkError === 'function' && typeof error.isServerError === 'function') {
            return error.isNetworkError() || 
                   (error.isServerError() && error.status !== 501);
        }
        
        // Fallback for non-FinanceHubAPIError objects
        const status = error.status || 0;
        return status === 0 || (status >= 500 && status !== 501);
    }
    
    /**
     * Cache management methods
     */
    getCacheKey(endpoint, options = {}) {
        const params = options.params ? JSON.stringify(options.params) : '';
        return `${endpoint}${params}`;
    }
    
    getCacheType(endpoint) {
        if (endpoint.includes('/stock/') && endpoint.includes('/chart')) return 'stock_chart';
        if (endpoint.includes('/stock/') && endpoint.includes('/fundamentals')) return 'stock_fundamentals';
        if (endpoint.includes('/stock/') && endpoint.includes('/news')) return 'stock_news';
        if (endpoint.includes('/stock/') && endpoint.includes('/ai-summary')) return 'ai_summary';
        if (endpoint.includes('/stock/')) return 'stock_fundamentals'; // Default to fundamentals for generic stock endpoints
        if (endpoint.includes('/news')) return 'stock_news';
        if (endpoint.includes('/ticker-tape')) return 'market';
        if (endpoint.includes('/chat')) return 'chat';
        return 'market'; // Default fallback
    }
    
    getFromCache(key, category = 'default') {
        const now = Date.now();
        const cacheData = this.cache[category]?.[key];
        
        if (cacheData && now < cacheData.expiry) {
            console.log(`Cache hit for ${key} in category ${category}`);
            return cacheData.data;
        }
        
        // Clean expired cache entry
        if (cacheData) {
            delete this.cache[category][key];
        }
        
        return null;
    }
    
    setCache(key, data, category = 'default', ttlMinutes = null) {
        if (!this.cache[category]) {
            this.cache[category] = {};
        }

        // ✅ Set TTL based on SPECIALIZED ENDPOINTS documentation
        let ttl = ttlMinutes;
        if (!ttl) {
            switch (category) {
                case 'ticker_tape':
                case 'market':
                    ttl = 0.17; // 10 seconds (high frequency updates)
                    break;
                case 'stock_chart':
                    ttl = 5; // 5 minutes (moderate update frequency)
                    break;
                case 'stock_fundamentals':
                    ttl = 1440; // 24 hours (stable financial data)
                    break;
                case 'stock_news':
                    ttl = 30; // 30 minutes (news updates)
                    break;
                case 'chat':
                    ttl = 0; // No caching for chat
                    return;
                case 'ai_summary':
                    ttl = 60; // 1 hour (cost optimization - expensive AI processing)
                    break;
                default:
                    ttl = 5; // 5 minutes default
            }
        }

        this.cache[category][key] = {
            data: data,
            expiry: Date.now() + (ttl * 60 * 1000),
            timestamp: new Date().toISOString()
        };
        
        this.metrics.cacheWrites++;
        
        if (this.config.debug) {
            console.log(`📦 Cache SET: ${category}/${key} - TTL: ${ttl}min`);
        }
    }
    
    /**
     * ✅ REFACTORED: Simplified method that uses only fundamentals
     * Replaced unified endpoint with direct call to getFundamentals
     */
    async getStockData(ticker) {
        console.log(`🔄 [API] getStockData(${ticker}) -> redirecting to getFundamentals`);
        return this.getFundamentals(ticker);
    }

    /**
     * ✅ REFACTORED: Simplified method that uses only fundamentals  
     * Replaced unified endpoint with direct call to getFundamentals
     */
    async getStock(ticker) {
        console.log(`🔄 [API] getStock(${ticker}) -> redirecting to getFundamentals`);
        return this.getFundamentals(ticker);
    }

    async getChartData(ticker, period = '1y', interval = '1d') {
        // Consolidate to modular endpoint with /api/v1 prefix
        return this.makeRequest(`/api/v1/stock/chart/${ticker}?period=${period}&interval=${interval}`);
    }
    
    async getFundamentals(ticker, forceRefresh = false) {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Valid ticker symbol required');
        }

        const cacheKey = `fundamentals_${ticker.toUpperCase()}`;
        const cachedData = this.getFromCache(cacheKey, 'stock_fundamentals');
        
        if (cachedData && !forceRefresh) {
            this.metrics.cacheHits++;
            return cachedData;
        }

        try {
            const endpoint = `/api/v1/stock/fundamentals/${ticker.toUpperCase()}${forceRefresh ? '?force_refresh=true' : ''}`;
            const response = await this.makeRequest(endpoint, { method: 'GET' });

            // ✅ Ensure backend has fundamentals_data
            if (!response || !response.fundamentals_data) {
                throw new Error('Invalid fundamentals response format');
            }

            // Preserve FULL backend payload – no trimming, so 100+ metrics remain accessible
            const backendData = response.fundamentals_data;

            const fundamentalsData = {
                ...backendData,
                metadata: response.metadata || {
                    symbol: ticker.toUpperCase(),
                    timestamp: new Date().toISOString(),
                    source: 'aevorex-backend'
                }
            };

            // Cache for 1 hour as per API documentation
            this.setCache(cacheKey, fundamentalsData, 'stock_fundamentals', 60);
            this.metrics.cacheWrites++;

            // Propagate to StateManager if available
            try {
                const stateMgr = this.stateManager || window.FinanceHubState;
                if (stateMgr && typeof stateMgr.dispatch === 'function') {
                    stateMgr.dispatch({
                        type: 'UPDATE_FUNDAMENTALS',
                        payload: fundamentalsData
                    });
                }
            } catch (e) {
                console.warn('State dispatch failed (fundamentals):', e);
            }

            return fundamentalsData;
            
        } catch (error) {
            console.error(`Failed to fetch fundamentals for ${ticker}:`, error);
            throw new FinanceHubAPIError(
                `Failed to fetch fundamentals for ${ticker}: ${error.message}`,
                error.status || 500,
                null,
                'stock/fundamentals'
            );
        }
    }

    /**
     * Get stock chart data from real backend
     */
    async getStockChart(ticker, timeframe = '1y', interval = '1d') {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Valid ticker symbol is required');
        }

        const cacheKey = `chart_${ticker.toUpperCase()}_${timeframe}_${interval}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/v1/stock/chart/${ticker.toUpperCase()}?period=${timeframe}&interval=${interval}`, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: AbortSignal.timeout(this.requestTimeout)
            });

            if (!response.ok) {
                throw new Error(`Chart API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Check if the response has the expected structure
            if (!data.chart_data || !data.chart_data.ohlcv) {
                throw new Error('Invalid chart data format received from backend');
            }

            // Structure the response to match frontend expectations
            const structuredData = {
                metadata: {
                    symbol: data.metadata?.symbol || ticker.toUpperCase(),
                    timestamp: data.metadata?.timestamp || new Date().toISOString(),
                    source: data.metadata?.source || 'aevorex-api',
                    cache_hit: data.metadata?.cache_hit || false,
                    processing_time_ms: data.metadata?.processing_time_ms || 0,
                    data_quality: data.metadata?.data_quality || 'real_api_data',
                    provider: data.metadata?.provider || 'eodhd_yahoo_hybrid',
                    version: data.metadata?.version || '3.0.0',
                    period: data.metadata?.period || timeframe,
                    interval: data.metadata?.interval || interval,
                    data_points: data.metadata?.data_points || data.chart_data.ohlcv.length
                },
                chart: {
                    symbol: data.chart_data.symbol || ticker.toUpperCase(),
                    ohlcv: data.chart_data.ohlcv || [],
                    period: data.chart_data.period || timeframe,
                    interval: data.chart_data.interval || interval,
                    currency: data.chart_data.currency || 'USD',
                    timezone: data.chart_data.timezone || 'America/New_York'
                },
                // --- BACKWARD COMPATIBILITY ALIAS (2025-06-14) ---
                // Older components expect `chart_data.ohlcv`, so create alias pointing to chart above
                chart_data: {
                    symbol: data.chart_data.symbol || ticker.toUpperCase(),
                    ohlcv: data.chart_data.ohlcv || [],
                    period: data.chart_data.period || timeframe,
                    interval: data.chart_data.interval || interval,
                    currency: data.chart_data.currency || 'USD',
                    timezone: data.chart_data.timezone || 'America/New_York'
                },
                // Include raw backend data for debugging
                _raw_backend_data: data
            };

            // Cache for 5 minutes as per API documentation
            this.cache.set(cacheKey, structuredData, 5 * 60 * 1000);
            return structuredData;

        } catch (error) {
            console.error('Chart API error:', error);
            throw error;
        }
    }

    /**
     * Get stock news
     * @param {string} ticker - Stock ticker symbol
     * @param {number} limit - Number of news items to fetch
     * @returns {Promise<Object>} Stock news data
     */
    async getStockNews(ticker, limit = 10) {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Valid ticker symbol is required');
        }

        const cacheKey = `news_${ticker.toUpperCase()}_${limit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const response = await this.makeRequest(`/api/v1/stock/news/${ticker.toUpperCase()}?limit=${limit}`, {
                timeout: 30000 // extend for slower endpoint
            });
            
            const data = response;
            
            // Check if the response has the expected structure
            if (!data.news || !Array.isArray(data.news)) {
                throw new Error('Invalid news data format received from backend');
            }

            // Structure the response to match frontend expectations
            const structuredData = {
                metadata: {
                    symbol: data.metadata?.symbol || ticker.toUpperCase(),
                    timestamp: data.metadata?.timestamp || new Date().toISOString(),
                    source: data.metadata?.source || 'aevorex-api',
                    cache_hit: data.metadata?.cache_hit || false,
                    processing_time_ms: data.metadata?.processing_time_ms || 0,
                    data_quality: data.metadata?.data_quality || 'real_api_data',
                    provider: data.metadata?.provider || 'yahoo_finance_eodhd_hybrid',
                    version: data.metadata?.version || '3.0.0',
                    total_articles: data.metadata?.total_articles || data.news.length,
                    returned_articles: data.metadata?.returned_articles || data.news.length
                },
                news: data.news.map(article => ({
                    title: article.title || 'No title',
                    summary: article.summary || 'No summary available',
                    url: article.url || '#',
                    published_date: article.published_date || new Date().toISOString(),
                    source: article.source || 'Unknown source',
                    sentiment: article.sentiment || null
                })),
                sentiment_summary: {
                    overall: data.sentiment_summary?.overall || 'neutral',
                    news_count: data.sentiment_summary?.news_count || data.news.length,
                    analysis_confidence: data.sentiment_summary?.analysis_confidence || 'medium'
                },
                // Include raw backend data for debugging
                _raw_backend_data: data
            };

            // Cache for 10 minutes as per API documentation
            this.cache.set(cacheKey, structuredData, 10 * 60 * 1000);
            return structuredData;

        } catch (error) {
            console.error('News API error:', error);
            throw error;
        }
    }
    
    /**
     * Get AI-generated stock analysis summary from real backend
     */
    async getStockAISummary(ticker) {
        try {
            console.log(`🔄 Fetching AI summary for ${ticker}...`);

        const cacheKey = `ai_summary_${ticker.toUpperCase()}`;
            const cached = this.getFromCache(cacheKey, 'ai_summary');

        if (cached) {
                console.log(`✅ Using cached AI summary for ${ticker}`);
            return cached;
        }

            // Use correct modular endpoint with /api/v1 prefix
            const response = await this.makeRequest(`/api/v1/stock/ai-summary/${ticker}`);

            console.log(`✅ AI summary for ${ticker} fetched successfully`);
            this.setCache(cacheKey, response, 'ai_summary', 15); // 15 min cache

            return response;

        } catch (error) {
            console.error(`❌ Failed to fetch AI summary for ${ticker}:`, error);
            throw new FinanceHubAPIError(`Failed to fetch AI summary for ${ticker}: ${error.message}`, 500, null, 'ai_summary');
        }
    }
    
    /**
     * Chat & AI Endpoints
     */
    async sendChatMessage(ticker, message, stream = false, context = {}) {
        if (!ticker || !message) {
            throw new Error('Both ticker and message are required');
        }

        try {
            const selectedModel = (window.FinHubModels && window.FinHubModels.selectedId) || (localStorage.getItem('fh_selected_model') || window.FINBOT_DEFAULT_MODEL_ID || 'google/gemini-2.0-flash-001');

            const requestPayload = {
                question: message.trim(),
                history: context.messageHistory || [],
                ticker: ticker.toUpperCase(),
                config_override: { model: selectedModel }
            };

            if (stream) {
                // For streaming responses, use Server-Sent Events
                return this.handleStreamingResponse(message, ticker, context);
            } else {
                // For non-streaming responses, use regular POST
                const chatUrl = `/api/v1/stock/chat/${ticker.toUpperCase()}`;
                const response = await this.makeRequest(chatUrl, {
                    method: 'POST',
                    body: JSON.stringify(requestPayload)
                });

                return response;
            }
        } catch (error) {
            console.error('Failed to send chat message:', error);
            throw new FinanceHubAPIError(
                `Failed to send chat message: ${error.message}`,
                error.status || 500,
                null,
                'chat/send'
            );
        }
    }
    
    /**
     * Stream chat response with async generator
     * @param {string} message - User message
     * @param {string} ticker - Stock ticker
     * @param {Object} context - Additional context
     * @returns {AsyncGenerator} Streaming response generator
     */
    async* streamChatResponse(message, ticker, context = {}) {
        if (!ticker || !message) {
            throw new Error('Both ticker and message are required for streaming');
        }

        try {
            const streamUrl = `${this.baseURL}/api/v1/stock/chat/${ticker.toUpperCase()}/stream`;
            
            const payload = {
                question: message.trim(),
                history: context.messageHistory || [],
            };

            const response = await fetch(streamUrl, {
                method: 'POST',
                headers: {
                    ...this.defaultHeaders,
                    'Accept': 'text/event-stream',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new FinanceHubAPIError(
                    `Stream request failed: ${response.statusText}`,
                    response.status,
                    null,
                    'chat/stream'
                );
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.type === 'token') {
                                    yield { type: 'token', content: data.content };
                                } else if (data.type === 'complete' || data.done === true) {
                                    yield { type: 'done', content: data.content || '' };
                                    return;
                                } else if (data.type === 'error') {
                                    throw new Error(data.message || 'Stream error');
                                }
                            } catch (parseError) {
                                console.warn('Failed to parse stream data:', parseError);
                                // Continue processing other lines
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            console.error('Chat streaming error:', error);
            
            // Fallback: yield error message and return
            yield { 
                type: 'token', 
                content: 'I apologize, but I encountered an error processing your request. Please try again.' 
            };
            yield { type: 'done', content: '' };
        }
    }
    
    /**
     * Handle streaming response with callbacks (legacy method)
     */
    async handleStreamingResponse(message, ticker, context = {}, onToken, onComplete, onError) {
        try {
            const streamUrl = `${this.baseURL}/api/v1/stock/chat/${ticker.toUpperCase()}/stream`;
            
            const eventSource = new EventSource(streamUrl);
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'token' && onToken) {
                        onToken(data.content);
                    } else if (data.type === 'complete' && onComplete) {
                        onComplete(data);
                        eventSource.close();
                    }
                } catch (parseError) {
                    console.error('Error parsing stream data:', parseError);
                    if (onError) onError(parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('Streaming error:', error);
                eventSource.close();
                if (onError) onError(error);
            };

            return eventSource;
            
        } catch (error) {
            console.error('Failed to setup streaming:', error);
            if (onError) onError(error);
            throw error;
        }
    }
    
    /**
     * Market Data Endpoints
     */
    async getTickerTape() {
        const cacheKey = 'ticker_tape_data';
        const cachedData = this.getFromCache(cacheKey, 'market');
        
        if (cachedData) {
            this.metrics.cacheHits++;
            console.log(`🔍 [CACHED] getTickerTape()`);
            return cachedData;
        }
        
        try {
            const endpoint = `/api/v1/stock/ticker-tape/`;
            console.log(`🚀 [API] getTickerTape() -> ${endpoint}`);
            
            const response = await this.makeRequest(endpoint, { method: 'GET' });
            
            // ✅ FIX: Validate and handle different response structures
            let tickerData = [];
            
            if (response && Array.isArray(response)) {
                // Direct array response
                tickerData = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                // Wrapped response with data property
                tickerData = response.data;
            } else if (response && response.stocks && Array.isArray(response.stocks)) {
                // Response with stocks property
                tickerData = response.stocks;
            } else {
                console.warn(`⚠️ [API] Unexpected ticker-tape response format:`, {
                    responseType: typeof response,
                    keys: response ? Object.keys(response) : 'null',
                    isArray: Array.isArray(response)
                });
                tickerData = [];
            }
            
            // ✅ FIX: Normalize ticker data format for consistent frontend usage
            const normalizedData = tickerData.map(item => ({
                symbol: item.symbol || item.ticker,
                name: item.name || item.company_name || item.symbol,
                price: item.price || item.current_price || item.last_price,
                change: item.change || item.price_change,
                changePercent: item.change_percent || item.percentage_change,
                volume: item.volume || item.total_volume,
                marketCap: item.market_cap || item.cap,
                // Keep original data for compatibility
                ...item
            }));
            
            // ✅ FIX: Cache for 1 minute (ticker tape updates frequently)
            this.setCache(cacheKey, normalizedData, 'market', 1);
            
            console.log(`✅ [API] getTickerTape() returning ${normalizedData.length} items`);
            this.dispatchAction('TICKER_TAPE_DATA_RECEIVED', { data: normalizedData, count: normalizedData.length });
            
            return normalizedData;
            
        } catch (error) {
            console.error(`❌ [API] getTickerTape() failed:`, {
                error: error.message,
                status: error.status,
                endpoint: `/api/v1/stock/ticker-tape/`,
                timestamp: new Date().toISOString()
            });
            
            this.dispatchAction('TICKER_TAPE_DATA_ERROR', { 
                error: error.message,
                status: error.status,
                timestamp: new Date().toISOString()
            });
            
            // ✅ FIX: Return empty array for graceful degradation instead of throwing
            // This allows the ticker tape to display empty state instead of breaking
            if (error.status === 404) {
                console.warn(`⚠️ Ticker tape endpoint not found, returning empty data`);
                return [];
            } else if (error.status >= 500) {
                console.warn(`⚠️ Server error for ticker tape, returning empty data`);
                return [];
            } else {
                // Re-throw for network errors and client errors that should be handled upstream
                throw new FinanceHubAPIError(
                    `Failed to fetch ticker tape data: ${error.message}`,
                    error.status || 500,
                    null,
                    'ticker-tape'
                );
            }
        }
    }
    
    async getNews(limit = 20, category = 'general') {
        if (typeof limit !== 'number' || limit < 1 || limit > 100) {
            limit = 20; // Default to 20
        }

        const validCategories = ['general', 'earnings', 'mergers', 'ipos', 'political', 'technology'];
        if (!validCategories.includes(category)) {
            category = 'general';
        }

        const cacheKey = `news_${category}_${limit}`;
        const cachedData = this.getFromCache(cacheKey, 'market');
        
        if (cachedData) {
            this.metrics.cacheHits++;
            return cachedData;
        }

        try {
            const endpoint = `/api/v1/market/news?limit=${limit}&category=${category}`;
            const response = await this.makeRequest(endpoint, {
                method: 'GET',
                params: {
                    limit: limit,
                    category: category
                }
            });

            if (!response || !Array.isArray(response.news)) {
                throw new Error('Invalid news response format');
            }

            const newsData = {
                metadata: response.metadata || {
                    timestamp: new Date().toISOString(),
                    category: category,
                    count: response.news.length,
                    source: 'aevorex-backend'
                },
                news: response.news.map(item => ({
                    id: item.id || null,
                    title: item.title || 'No title',
                    summary: item.summary || '',
                    url: item.url || '',
                    source: item.source || 'Unknown',
                    published_at: item.published_at || new Date().toISOString(),
                    category: item.category || category,
                    relevance_score: item.relevance_score || 0,
                    sentiment: item.sentiment || 'neutral'
                }))
            };

            // Cache for 10 minutes as per API documentation
            this.setCache(cacheKey, newsData, 'market');
            this.metrics.cacheWrites++;

            return newsData;
            
        } catch (error) {
            console.error(`Failed to fetch news:`, error);
            throw new FinanceHubAPIError(
                `Failed to fetch news: ${error.message}`,
                error.status || 500,
                null,
                'market/news'
            );
        }
    }
    
    async searchStocks(query, limit = 10) {
        try {
            console.log(`🔍 Searching for stocks: ${query}...`);
            const cacheKey = `search_${query}_${limit}`;

            const cached = this.getFromCache(cacheKey, 'stock_search');
            if (cached) {
                console.log(`✅ Using cached search results for ${query}`);
                return cached;
            }

            const response = await this.makeRequest(`/api/v1/stock/search?q=${encodeURIComponent(query)}&limit=${limit}`);

            console.log(`✅ Search results for ${query} fetched successfully`);
            this.setCache(cacheKey, response, 'stock_search', 5); // 5 min cache

            return response;
        } catch (error) {
            console.error(`❌ Failed to search stocks for ${query}:`, error);
            throw new FinanceHubAPIError(`Failed to search stocks for ${query}: ${error.message}`, 500, null, 'search');
        }
    }
    
    /**
     * Utility Methods
     */
    async checkHealth() {
        try {
            const response = await this.makeRequest(this.endpoints.health, {
                method: 'GET'
            });
            
            return {
                status: response.status,
                timestamp: response.timestamp,
                version: response.version,
                healthy: response.status === 'healthy'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                healthy: false,
                error: error.message
            };
        }
    }
    
    recordMetrics(responseTime, success) {
        this.metrics.requests++;
        this.metrics.totalResponseTime += responseTime;
        
        if (success) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.errors++;
        }
        
        this.metrics.cacheHitRate = this.metrics.requests > 0 ? 
            (this.metrics.cacheHits / this.metrics.requests * 100).toFixed(2) + '%' : '0%';
        this.metrics.averageResponseTime = this.metrics.requests > 0 ? 
            (this.metrics.totalResponseTime / this.metrics.requests).toFixed(0) + 'ms' : '0ms';
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            cacheHitRate: this.metrics.requests > 0 ? 
                (this.metrics.cacheHits / this.metrics.requests * 100).toFixed(2) + '%' : '0%',
            averageResponseTime: this.metrics.requests > 0 ? 
                (this.metrics.totalResponseTime / this.metrics.requests).toFixed(0) + 'ms' : '0ms',
            uptime: Date.now() - this.startTime,
            lastActivity: new Date(this.lastActivity).toISOString()
        };
    }
    
    clearCache(category = null) {
        if (category) {
            if (this.cache[category]) {
                this.cache[category] = {};
                console.log(`Cache cleared for category: ${category}`);
            }
        } else {
            this.cache = new Map();
            console.log('All cache cleared');
        }
    }
    
    startCacheCleanup() {
        // Clean expired cache entries every 5 minutes
        setInterval(() => {
            const now = Date.now();
            for (const category in this.cache) {
                for (const key in this.cache[category]) {
                    const cacheData = this.cache[category][key];
                    if (cacheData.expiry > 0 && now > cacheData.expiry) {
                        delete this.cache[category][key];
                    }
                }
            }
        }, 300000); // 5 minutes
    }
    
    updateConfig(newConfig) {
        if (newConfig.endpoints) {
            Object.assign(this.endpoints, newConfig.endpoints);
        }
        if (newConfig.cache) {
            Object.assign(this.cache, newConfig.cache);
        }
        console.log('API configuration updated', newConfig);
    }
    
    destroy() {
        this.clearCache();
        this.resetMetrics();
        console.log('FinanceHubAPI instance destroyed');
    }

    /**
     * ÚJ: Bulk stock data lekérés optimalizált cache-eléssel
     * @param {Array<string>} symbols - Stock symbols to fetch
     * @returns {Promise<Array>} Bulk stock data
     */
    async getBulkStockData(symbols) {
        if (!Array.isArray(symbols) || symbols.length === 0) {
            throw new FinanceHubAPIError('Invalid symbols array', 'INVALID_SYMBOLS');
        }

        const cacheKey = `bulk-stocks-${symbols.sort().join(',')}`;
        
        try {
            // Check cache first
            const cached = this.cache.market[cacheKey];
            if (cached && Date.now() < cached.expiry) {
                this.metrics.cacheHits++;
                return cached.data;
            }

            // Fetch from bulk endpoint
            const response = await this.makeRequest(`${this.baseURL}${this.apiPrefix}/bulk/stocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbols })
            });
            
            // Cache the response
            this.cache.market[cacheKey] = {
                data: response,
                expiry: Date.now() + (60 * 1000), // 1min TTL for bulk data
                timestamp: new Date().toISOString()
            };
            
            return response;
        } catch (error) {
            console.warn('Failed to fetch bulk stock data:', error);
            // Fallback: fetch individual stocks
            return this.fallbackIndividualStockFetch(symbols);
        }
    }

    /**
     * Fallback method for individual stock fetching when bulk fails
     * @param {Array<string>} symbols - Stock symbols to fetch
     * @returns {Promise<Array>} Individual stock data
     */
    async fallbackIndividualStockFetch(symbols) {
        const results = [];
        const maxConcurrent = 3; // Limit concurrent requests
        
        for (let i = 0; i < symbols.length; i += maxConcurrent) {
            const batch = symbols.slice(i, i + maxConcurrent);
            const promises = batch.map(async (symbol) => {
                try {
                    const data = await this.getStockData(symbol);
                    return {
                        symbol: symbol,
                        company_name: data.company_name || symbol,
                        current_price: data.current_price || 0,
                        change: data.change || 0,
                        change_percent: data.change_percent || 0,
                        volume: data.volume || 0,
                        market_cap: data.market_cap || 0
                    };
                } catch (error) {
                    console.warn(`Failed to fetch data for ${symbol}:`, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(promises);
            results.push(...batchResults.filter(result => result !== null));
        }
        
        return results;
    }

    /**
     * Create streaming connection for chat
     * @param {string} url - Streaming endpoint URL
     * @param {Object} payload - Request payload
     * @returns {EventSource} EventSource instance
     */
    createStreamingConnection(url, payload) {
        // Convert POST payload to URL parameters for EventSource
        const params = new URLSearchParams({
            message: payload.message,
            timestamp: payload.timestamp,
            session_id: payload.session_id
        });
        
        const streamUrl = `${this.baseURL}${url}?${params.toString()}`;
        
        const eventSource = new EventSource(streamUrl);
        
        eventSource.onerror = (error) => {
            console.error('FinanceHub API: Streaming connection error:', error);
            this.metrics.errors++;
        };
        
        return eventSource;
    }

    /**
     * Generate session ID for chat
     * @returns {string} Session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get API configuration and status
     */
    getAPIConfig() {
        return {
            baseURL: this.getBaseURL(),
            version: '1.0',
            environment: this.getBaseURL().includes('localhost') ? 'development' : 'production',
            endpoints: Object.keys(this.endpoints).reduce((acc, category) => {
                acc[category] = Object.keys(this.endpoints[category]);
                return acc;
            }, {}),
            cache: {
                categories: Object.keys(this.cache),
                totalEntries: Object.values(this.cache).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
            },
            metrics: this.metrics
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            requests: 0,
            cacheHits: 0,
            cacheWrites: 0,
            errors: 0,
            totalResponseTime: 0
        };
        this.startTime = Date.now();
        console.log('API metrics reset');
    }

    /**
     * Monitor API health and performance
     */
    async monitorHealth() {
        try {
            const startTime = Date.now();
            const healthStatus = await this.checkHealth();
            const responseTime = Date.now() - startTime;
            
            this.recordMetrics(responseTime, true);
            
            return {
                status: 'healthy',
                responseTime: responseTime,
                timestamp: new Date().toISOString(),
                details: healthStatus
            };
        } catch (error) {
            this.recordMetrics(0, false);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 🎯 KÖZPONTI API URL GENERÁTOR - Minden fetch()-hez használni
     */
    buildURL(endpoint, params = {}) {
        let url = `${this.baseURL}${endpoint}`;
        
        // URL paraméterek behelyettesítése {ticker} → AAPL
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    }
    
    /**
     * 🎯 KÖZPONTI FETCH WRAPPER - Egységes hiba és timeout kezelés
     */
    async fetch(endpoint, options = {}) {
        const url = this.buildURL(endpoint, options.params || {});
        const timeout = options.timeout || this.config.TIMEOUTS.DEFAULT;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Timeout kezelés
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        config.signal = controller.signal;
        
        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`API hiba (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * 🎯 GET NEWS DATA - Legacy method maintained for component compatibility
     */
    async getNewsData(ticker, limit = 10) {
        return this.getStockNews(ticker, limit);
    }

    /**
     * Get stock fundamentals data - MODULAR ENDPOINT (FAST ~300ms)
     * Replaces old comprehensive endpoint
     */
    async getStockFundamentals(ticker, forceRefresh = false) {
        // Delegate with forceRefresh flag so components can bypass cache when needed
        return this.getFundamentals(ticker, forceRefresh);
    }

    /**
     * Get ticker tape data - MODULAR ENDPOINT (FAST ~300ms)
     */
    async getTickerTapeData(limit = 20, forceRefresh = false) {
        try {
            console.log(`🔄 Fetching ticker tape data...`);
            
            const cacheKey = `ticker_tape_${limit}`;
            
            if (!forceRefresh) {
                const cached = this.getFromCache(cacheKey, 'market');
                if (cached) {
                    console.log(`✅ Using cached ticker tape data`);
                    return cached;
                }
            }
            
            // Correct endpoint with /api/v1 prefix
            const response = await this.makeRequest(`/api/v1/stock/ticker-tape?limit=${limit}&force_refresh=${forceRefresh}`);
            
            console.log(`✅ Ticker tape data fetched successfully`);
            this.setCache(cacheKey, response, 'market', 5); // 5 min cache
            
            return response;
            
        } catch (error) {
            console.error('Failed to fetch ticker tape data:', error);
            throw error;
        }
    }

    /**
     * Get technical analysis indicators for a stock
     * @param {string} ticker - Stock ticker symbol
     * @param {Object} params - Optional query params (e.g. period, interval)
     * @returns {Promise<Object>} Technical analysis data
     */
    async getTechnicalAnalysis(ticker, params = {}) {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Valid ticker symbol is required');
        }

        const cacheKey = `technical_${ticker.toUpperCase()}`;
        const cached = this.getFromCache(cacheKey, 'stock_chart');
        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        try {
            // Build query string from params
            const query = Object.keys(params).length ?
                '?' + new URLSearchParams(params).toString() : '';
            const endpoint = `/api/v1/stock/technical-analysis/${ticker.toUpperCase()}${query}`;
            const response = await this.makeRequest(endpoint, { method: 'GET' });

            if (!response || !response.technical_analysis) {
                throw new Error('Invalid technical analysis response format');
            }

            // Minimal structuring – keep backend format but ensure metadata present
            const structuredData = {
                metadata: response.metadata || {
                    symbol: ticker.toUpperCase(),
                    timestamp: new Date().toISOString(),
                    source: 'aevorex-backend'
                },
                technical_analysis: response.technical_analysis,
                _raw_backend_data: response
            };

            // Cache for 5 minutes
            this.setCache(cacheKey, structuredData, 'stock_chart', 5);
            this.metrics.cacheWrites++;

            // Dispatch to StateManager if available
            try {
                const stateMgr = this.stateManager || window.FinanceHubState;
                if (stateMgr && typeof stateMgr.dispatch === 'function') {
                    stateMgr.dispatch({
                        type: 'UPDATE_TECHNICAL_ANALYSIS',
                        payload: structuredData
                    });
                }
            } catch (e) {
                console.warn('State dispatch failed (technical analysis):', e);
            }

            return structuredData;
        } catch (error) {
            console.error(`Failed to fetch technical analysis for ${ticker}:`, error);
            throw new FinanceHubAPIError(
                `Failed to fetch technical analysis for ${ticker}: ${error.message}`,
                error.status || 500,
                null,
                'stock/technical-analysis'
            );
        }
    }

    /**
     * Get real-time stock header snapshot (price, change, volume, market cap…)
     * Uses new `/api/v1/stock/header/{ticker}` backend endpoint.
     * @param {string} ticker – Stock ticker symbol
     * @returns {Promise<Object>} Header data payload
     */
    async getStockHeader(ticker) {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Valid ticker symbol is required');
        }

        const cacheKey = `header_${ticker.toUpperCase()}`;
        const cached = this.getFromCache(cacheKey, 'stock_header');
        if (cached) {
            return cached;
        }

        try {
            const response = await this.makeRequest(`/api/v1/stock/header/${ticker.toUpperCase()}`, {
                timeout: 10000 // lightweight endpoint, 10s should be enough
            });

            // Basic validation – must contain price or current_price field
            if (typeof response.price === 'undefined' && typeof response.current_price === 'undefined') {
                throw new Error('Invalid header data format received from backend');
            }

            // Ensure unified "price" attribute exists for downstream consumers
            if (typeof response.price === 'undefined' && typeof response.current_price !== 'undefined') {
                response.price = response.current_price;
            }

            // Cache for 60s to reduce backend load while keeping UI fresh
            this.setCache(cacheKey, response, 'stock_header', 1);
            return response;
        } catch (error) {
            console.error('Header API error:', error);
            throw error;
        }
    }
}

if (typeof window !== 'undefined') {
    // Expose constructor for modules that need to instantiate their own client
    window.FinanceHubAPIClass = FinanceHubAPIService;
    // Back-compat aliases – some legacy modules expect these names
    if (!window.FinanceHubAPIServiceClass) {
        window.FinanceHubAPIServiceClass = FinanceHubAPIService;
    }

    // Ensure singleton instance is available (legacy global expectation)
    if (!window.FinanceHubAPIService || typeof window.FinanceHubAPIService !== 'object') {
        window.FinanceHubAPIService = new FinanceHubAPIService();
    }

    // Simple shorthand alias retained for ultra-legacy code
    window.FinanceHubAPI = window.FinanceHubAPIService;
}

// Provide an ESM default export for tree-shakable modern imports
export default FinanceHubAPIService;