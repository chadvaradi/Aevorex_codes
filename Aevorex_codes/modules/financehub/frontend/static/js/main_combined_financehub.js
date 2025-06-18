/**
 * FinanceHub Combined JavaScript Bundle
 * 
 * Auto-generated file - DO NOT EDIT MANUALLY
 * 
 * Generated: 2025-06-16 13:41:54
 * Builder: FinanceHub JavaScript Builder v3.1.0
 * 
 * This file contains all JavaScript modules combined in the correct
 * dependency order for optimal loading performance.
 * 
 * Total files processed: 35
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.1.0
 */

console.log('🚀 Loading FinanceHub Combined JavaScript Bundle...');


/* ============================================================================
 * FILE: core/utils.js
 * SIZE: 22,001 bytes
 * ============================================================================ */

/**
 * @file utils-unified.js - Unified Utility Functions for FinanceHub
 * @description Comprehensive utility library combining the best features from:
 *              - src/utils.js (Performance utilities)
 *              - core/utils.js (General utilities)
 * @version 3.0.0 - Unified Architecture
 * @author AEVOREX
 */

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = true;
    }

    startTimer(label) {
        if (!this.isEnabled) return;
        this.metrics.set(label, performance.now());
    }

    endTimer(label) {
        if (!this.isEnabled) return;
        const startTime = this.metrics.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            this.metrics.delete(label);
            return duration;
        }
    }

    measureAsync(label, asyncFn) {
        return async (...args) => {
            this.startTimer(label);
            try {
                const result = await asyncFn(...args);
                this.endTimer(label);
                return result;
            } catch (error) {
                this.endTimer(label);
                throw error;
            }
        };
    }

    observeElement(element, callback) {
        if (!this.observers.has('intersection')) {
            this.observers.set('intersection', new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const callback = entry.target._observerCallback;
                    if (callback) callback(entry);
                });
            }));
        }

        element._observerCallback = callback;
        this.observers.get('intersection').observe(element);
    }

    unobserveElement(element) {
        const observer = this.observers.get('intersection');
        if (observer) {
            observer.unobserve(element);
            delete element._observerCallback;
        }
    }
}

/**
 * DOM utilities
 */
class DOMUtils {
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    }

    static findElement(selector, context = document) {
        return context.querySelector(selector);
    }

    static findElements(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    static addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    }

    static hasClass(element, className) {
        return element && element.classList.contains(className);
    }

    static setAttributes(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    static removeAttributes(element, attributes) {
        attributes.forEach(attr => {
            element.removeAttribute(attr);
        });
    }

    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
        };
    }

    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    static scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Data formatting utilities
 */
class DataFormatter {
    static formatCurrency(value, currency = 'USD', locale = 'en-US') {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    static formatNumber(value, options = {}) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const defaultOptions = {
            locale: 'en-US',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };

        const formatOptions = { ...defaultOptions, ...options };
        const { locale, ...intlOptions } = formatOptions;

        return new Intl.NumberFormat(locale, intlOptions).format(value);
    }

    static formatPercentage(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        return `${(value * 100).toFixed(decimals)}%`;
    }

    static formatLargeNumber(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';

        if (absValue >= 1e12) {
            return `${sign}${(absValue / 1e12).toFixed(1)}T`;
        } else if (absValue >= 1e9) {
            return `${sign}${(absValue / 1e9).toFixed(1)}B`;
        } else if (absValue >= 1e6) {
            return `${sign}${(absValue / 1e6).toFixed(1)}M`;
        } else if (absValue >= 1e3) {
            return `${sign}${(absValue / 1e3).toFixed(1)}K`;
        } else {
            return `${sign}${absValue.toFixed(0)}`;
        }
    }

    static formatDate(date, format = 'short') {
        if (!date) return 'N/A';

        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            }
        };

        return dateObj.toLocaleDateString('en-US', options[format] || options.short);
    }

    static formatTimeAgo(date) {
        if (!date) return 'N/A';

        const now = new Date();
        const dateObj = date instanceof Date ? date : new Date(date);
        const diffInSeconds = Math.floor((now - dateObj) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return this.formatDate(dateObj);
        }
    }

    static formatVolume(volume) {
        return this.formatLargeNumber(volume);
    }

    static formatMarketCap(marketCap) {
        return this.formatLargeNumber(marketCap);
    }

    static formatPriceChange(change, changePercent) {
        const sign = change >= 0 ? '+' : '';
        const formattedChange = this.formatCurrency(Math.abs(change));
        const formattedPercent = this.formatPercentage(Math.abs(changePercent / 100));
        
        return `${sign}${formattedChange} (${sign}${formattedPercent})`;
    }
}

/**
 * Validation utilities
 */
class Validator {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isValidStockSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        const symbolRegex = /^[A-Z]{1,5}$/;
        return symbolRegex.test(symbol.toUpperCase());
    }

    static isValidNumber(value) {
        return !isNaN(value) && isFinite(value);
    }

    static isValidDate(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return !isNaN(dateObj.getTime());
    }

    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    static validateStockData(data) {
        const required = ['symbol', 'price'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (!this.isValidStockSymbol(data.symbol)) {
            throw new Error('Invalid stock symbol format');
        }

        if (!this.isValidNumber(data.price)) {
            throw new Error('Invalid price value');
        }

        return true;
    }
}

/**
 * Storage utilities
 */
class StorageManager {
    constructor(prefix = 'financehub_') {
        this.prefix = prefix;
        this.isLocalStorageAvailable = this.checkLocalStorage();
    }

    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    getKey(key) {
        return `${this.prefix}${key}`;
    }

    set(key, value, expiry = null) {
        if (!this.isLocalStorageAvailable) return false;

        try {
            const data = {
                value,
                timestamp: Date.now(),
                expiry: expiry ? Date.now() + expiry : null
            };
            localStorage.setItem(this.getKey(key), JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }

    get(key) {
        if (!this.isLocalStorageAvailable) return null;

        try {
            const item = localStorage.getItem(this.getKey(key));
            if (!item) return null;

            const data = JSON.parse(item);
            
            // Check expiry
            if (data.expiry && Date.now() > data.expiry) {
                this.remove(key);
                return null;
            }

            return data.value;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return null;
        }
    }

    remove(key) {
        if (!this.isLocalStorageAvailable) return false;

        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }

    clear() {
        if (!this.isLocalStorageAvailable) return false;

        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }

    getAll() {
        if (!this.isLocalStorageAvailable) return {};

        const result = {};
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                const shortKey = key.replace(this.prefix, '');
                result[shortKey] = this.get(shortKey);
            }
        });

        return result;
    }
}

/**
 * Event utilities - DISABLED to avoid duplication with core/event-manager.js
 */
/*
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        const key = `${element}_${event}`;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        this.listeners.get(key).push(handler);
        element.addEventListener(event, handler, options);
    }

    off(element, event, handler) {
        if (!element || !event) return;

        const key = `${element}_${event}`;
        const handlers = this.listeners.get(key);
        
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                element.removeEventListener(event, handler);
            }
        }
    }

    once(element, event, handler, options = {}) {
        const onceHandler = (e) => {
            handler(e);
            this.off(element, event, onceHandler);
        };
        this.on(element, event, onceHandler, options);
    }

    emit(element, event, data = {}) {
        const customEvent = new CustomEvent(event, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(customEvent);
    }

    removeAllListeners(element) {
        const keys = Array.from(this.listeners.keys());
        keys.forEach(key => {
            if (key.startsWith(`${element}_`)) {
                const event = key.split('_')[1];
                const handlers = this.listeners.get(key);
                handlers.forEach(handler => {
                    element.removeEventListener(event, handler);
                });
                this.listeners.delete(key);
            }
        });
    }
}
*/

/**
 * Animation utilities
 */
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = `${targetHeight * progress}px`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideUp(element, duration = 300) {
        const startHeight = element.offsetHeight;
        const start = performance.now();
        
        element.style.overflow = 'hidden';
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = `${startHeight * (1 - progress)}px`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
}

/**
 * Color utilities
 */
class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    static getPriceChangeColor(change) {
        if (change > 0) return '#10b981'; // green
        if (change < 0) return '#ef4444'; // red
        return '#6b7280'; // gray
    }

    static lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 + (percent / 100);
        const r = Math.min(255, Math.floor(rgb.r * factor));
        const g = Math.min(255, Math.floor(rgb.g * factor));
        const b = Math.min(255, Math.floor(rgb.b * factor));
        
        return this.rgbToHex(r, g, b);
    }

    static darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 - (percent / 100);
        const r = Math.max(0, Math.floor(rgb.r * factor));
        const g = Math.max(0, Math.floor(rgb.g * factor));
        const b = Math.max(0, Math.floor(rgb.b * factor));
        
        return this.rgbToHex(r, g, b);
    }
}

// Create global instances
const performanceMonitor = new PerformanceMonitor();
const storageManager = new StorageManager();

// Export utilities
const UnifiedUtils = {
    PerformanceMonitor,
    DOMUtils,
    DataFormatter,
    Validator,
    StorageManager,
    AnimationUtils,
    ColorUtils,
    
    // Global instances
    performance: performanceMonitor,
    storage: storageManager,
    
    // Convenience methods
    $: (selector, context) => DOMUtils.findElement(selector, context),
    $$: (selector, context) => DOMUtils.findElements(selector, context),
    debounce: DOMUtils.debounce,
    throttle: DOMUtils.throttle,
    formatCurrency: DataFormatter.formatCurrency,
    formatNumber: DataFormatter.formatNumber,
    formatPercentage: DataFormatter.formatPercentage,
    formatDate: DataFormatter.formatDate,
    formatTimeAgo: DataFormatter.formatTimeAgo
};

// CommonJS compatibility with better structure
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceMonitor,
        DOMUtils,
        DataFormatter,
        Validator,
        StorageManager,
        AnimationUtils,
        ColorUtils,
        UnifiedUtils,
        default: UnifiedUtils
    };
} else {
    window.UnifiedUtils = UnifiedUtils;
}

console.log('✅ UnifiedUtils exported successfully (CommonJS + Global)'); 

/* ============================================================================
 * END OF FILE: core/utils.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/api.js
 * SIZE: 60,966 bytes
 * ============================================================================ */

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
            const requestPayload = {
                question: message.trim(),
                history: context.messageHistory || [],
                ticker: ticker.toUpperCase()
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
// REMOVED EXPORT: export default FinanceHubAPIService;

/* ============================================================================
 * END OF FILE: core/api.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/state-manager.js
 * SIZE: 29,622 bytes
 * ============================================================================ */

/**
 * @file state-manager.js - Centralized State Management for FinanceHub
 * @description Redux-inspired state management with reactive updates
 * @version 2.0.0 - Unified Architecture
 * @author AEVOREX
 */

class FinanceHubStateManager {
    constructor() {
        this.VERSION = '2.0.0';
        
        // Initial state structure
        this.state = {
            // App-level state
            app: {
                isInitialized: false,
                isLoading: false,
                theme: 'dark',
                version: '10.0.0',
                errors: [],
                performance: {
                    initTime: 0,
                    componentLoadTimes: new Map(),
                    memoryUsage: 0
                },
                services: {
                    apiService: false,
                    coreReady: false
                }
            },
            
            // Stock data state
            stock: {
                currentSymbol: 'AAPL',
                currentData: null,
                priceData: null,
                fundamentals: null,
                chartData: null,
                news: [],
                loading: false,
                error: null,
                isLoading: false,
                lastUpdated: null,
                cache: new Map()
            },
            
            // Chat state
            chat: {
                messages: [],
                isLoading: false,
                isTyping: false,
                isStreaming: false,
                currentStreamId: null,
                history: [],
                maxHistoryLength: 50,
                autoSummaryEnabled: true,
                error: null,
                lastResponse: null
            },
            
            // UI state
            ui: {
                activeView: 'welcome', // welcome, analysis, chat
                sidebarOpen: false,
                modalOpen: null,
                notifications: [],
                searchSuggestions: [],
                isLoading: false,
                error: null,
                tickerTape: {
                    isRunning: false,
                    data: [],
                    scrollSpeed: 50
                },
                windowSize: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    timestamp: Date.now()
                }
            },
            
            // User preferences
            preferences: {
                autoRefresh: true,
                refreshInterval: 30000,
                chartTheme: 'dark',
                enableAnimations: true,
                enableNotifications: true,
                defaultTimeframe: '1y'
            },
            
            // Enhanced API state with request tracking
            api: {
                loading: false,
                error: null,
                activeRequests: new Set(),
                cache: new Map(),
                lastRequestTime: null,
                requests: {}, // Track individual requests by ID
                metrics: {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    averageResponseTime: 0
                }
            }
        };
        
        // Subscribers for reactive updates
        this.subscribers = new Map();
        this.middleware = [];
        
        // Action history for debugging
        this.actionHistory = [];
        this.maxHistoryLength = 100;
        
        console.log('StateManager v' + this.VERSION + ' initialized');
    }
    
    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch (e.g., 'stock.currentSymbol')
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            const pathSubscribers = this.subscribers.get(path);
            if (pathSubscribers) {
                pathSubscribers.delete(callback);
                if (pathSubscribers.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }
    
    /**
     * Add middleware for action processing
     * @param {Function} middleware - Middleware function
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    
    /**
     * Dispatch an action to update state
     * @param {Object} action - Action object with type and payload
     */
    dispatch(action) {
        try {
            // Validate action
            if (!action || typeof action.type !== 'string') {
                throw new Error('Invalid action: must have a type property');
            }
            
            // Log action for debugging
            this.logAction(action);
            
            // Process through middleware
            let processedAction = action;
            for (const middleware of this.middleware) {
                processedAction = middleware(processedAction, this.state);
                if (!processedAction) break;
            }
            
            if (!processedAction) return;
            
            // Get previous state for comparison
            const prevState = this.deepClone(this.state);
            
            // Apply action to state
            this.applyAction(processedAction);
            
            // Notify subscribers of changes
            this.notifySubscribers(prevState, this.state);
            
        } catch (error) {
            console.error('State dispatch error:', error);
            this.dispatch({
                type: 'APP_ERROR',
                payload: {
                    error: error.message,
                    timestamp: Date.now(),
                    context: 'state_dispatch'
                }
            });
        }
    }
    
    /**
     * Apply action to state
     * @param {Object} action - Action to apply
     */
    applyAction(action) {
        switch (action.type) {
            // App actions
            case 'APP_INIT_START':
                this.state.app.isLoading = true;
                this.state.app.isInitialized = false;
                break;
                
            case 'APP_INIT_COMPLETE':
                this.state.app.isLoading = false;
                this.state.app.isInitialized = true;
                this.state.app.performance.initTime = action.payload.initTime;
                break;
                
            case 'APP_SET_THEME':
                this.state.app.theme = action.payload.theme;
                break;
                
            case 'APP_ERROR':
                this.state.app.errors.push(action.payload);
                break;
                
            // Generic loading action
            case 'SET_LOADING':
                console.log('SET_LOADING action received:', action.payload);
                this.state.app.isLoading = action.payload;
                // Also update stock loading if relevant
                if (typeof action.payload === 'boolean') {
                    this.state.stock.isLoading = action.payload;
                }
                console.log('SET_LOADING action applied successfully');
                break;
                
            // Stock actions
            case 'STOCK_SET_SYMBOL':
                this.state.stock.currentSymbol = action.payload.symbol;
                this.state.stock.isLoading = true;
                break;
                
            case 'SET_CURRENT_SYMBOL':
                // FIXED: Validate payload structure to prevent SyntaxError
                const symbolPayload = action.payload || {};
                const newSymbol = symbolPayload.symbol || (typeof action.payload === 'string' ? action.payload : null);
                
                if (!newSymbol || typeof newSymbol !== 'string') {
                    console.warn('⚠️ Invalid symbol provided to SET_CURRENT_SYMBOL:', action.payload);
                    return;
                }
                
                // Safe symbol assignment with validation
                const cleanSymbol = newSymbol.toString().trim().toUpperCase();
                if (!/^[A-Z0-9.-]{1,10}$/.test(cleanSymbol)) {
                    console.warn('⚠️ Invalid symbol format:', newSymbol);
                    return;
                }
                
                // Update state with validated data
                this.state.stock.currentSymbol = cleanSymbol;
                this.state.stock.lastSource = symbolPayload.source || 'unknown';
                this.state.stock.currentData = {
                    ...this.state.stock.currentData,
                    symbol: cleanSymbol,
                    source: symbolPayload.source || 'unknown',
                    data: symbolPayload.data || {},
                    timestamp: Date.now()
                };
                break;
                
            case 'STOCK_DATA_LOADED':
                this.state.stock.currentData = action.payload.data;
                this.state.stock.isLoading = false;
                this.state.stock.lastUpdated = Date.now();
                // Cache the data - with safety check
                if (!this.state.stock.cache || !(this.state.stock.cache instanceof Map)) {
                    console.warn('🔧 Stock cache not properly initialized, recreating...');
                    this.state.stock.cache = new Map();
                }
                this.state.stock.cache.set(action.payload.symbol, {
                    data: action.payload.data,
                    timestamp: Date.now()
                });
                break;
                
            case 'STOCK_PRICE_UPDATE':
                this.state.stock.priceData = action.payload.priceData;
                break;
                
            case 'STOCK_FUNDAMENTALS_LOADED':
                this.state.stock.fundamentals = action.payload.fundamentals;
                break;
                
            case 'STOCK_CHART_DATA_LOADED':
                this.state.stock.chartData = action.payload.chartData;
                break;
                
            case 'STOCK_NEWS_LOADED':
                this.state.stock.news = action.payload.news;
                break;
                
            case 'STOCK_LOADING_START':
                this.state.stock.isLoading = true;
                break;
                
            case 'STOCK_LOADING_END':
                this.state.stock.isLoading = false;
                break;
                
            // Chat actions
            case 'CHAT_ADD_MESSAGE':
                this.state.chat.messages.push(action.payload.message);
                // Maintain history limit
                if (this.state.chat.messages.length > this.state.chat.maxHistoryLength) {
                    this.state.chat.messages = this.state.chat.messages.slice(-this.state.chat.maxHistoryLength);
                }
                break;
                
            case 'CHAT_SET_TYPING':
                this.state.chat.isTyping = action.payload.isTyping;
                break;
                
            case 'CHAT_SET_STREAMING':
                this.state.chat.isStreaming = action.payload.isStreaming;
                this.state.chat.currentStreamId = action.payload.streamId || null;
                break;
                
            case 'CHAT_CLEAR_MESSAGES':
                this.state.chat.messages = [];
                break;
                
            case 'CHAT_UPDATE_MESSAGE':
                const messageIndex = this.state.chat.messages.findIndex(
                    msg => msg.id === action.payload.messageId
                );
                if (messageIndex !== -1) {
                    this.state.chat.messages[messageIndex] = {
                        ...this.state.chat.messages[messageIndex],
                        ...action.payload.updates
                    };
                }
                break;
                
            // UI actions
            case 'UI_SET_ACTIVE_VIEW':
                this.state.ui.activeView = action.payload.view;
                break;
                
            case 'UI_TOGGLE_SIDEBAR':
                this.state.ui.sidebarOpen = !this.state.ui.sidebarOpen;
                break;
                
            case 'UI_SET_MODAL':
                this.state.ui.modalOpen = action.payload.modal;
                break;
                
            case 'UI_ADD_NOTIFICATION':
                this.state.ui.notifications.push(action.payload.notification);
                break;
                
            case 'UI_REMOVE_NOTIFICATION':
                this.state.ui.notifications = this.state.ui.notifications.filter(
                    n => n.id !== action.payload.notificationId
                );
                break;
                
            case 'UI_SET_SEARCH_SUGGESTIONS':
                this.state.ui.searchSuggestions = action.payload.suggestions;
                break;
                
            case 'UI_TICKER_UPDATE':
                this.state.ui.tickerTape.data = action.payload.data;
                this.state.ui.tickerTape.isRunning = action.payload.isRunning;
                break;
                
            case 'TICKER_TAPE_DATA_RECEIVED':
                this.state.ui.tickerTape.data = action.payload.data || action.payload;
                this.state.ui.tickerTape.isRunning = true;
                this.state.ui.tickerTape.lastUpdated = Date.now();
                break;
                
            // Preferences actions
            case 'PREFERENCES_UPDATE':
                this.state.preferences = {
                    ...this.state.preferences,
                    ...action.payload.preferences
                };
                break;
                
            // Service initialization actions
            case 'API_SERVICE_INIT':
                this.state.app.services.apiService = true;
                break;
                
            case 'CORE_SERVICES_READY':
                this.state.app.services.coreReady = true;
                break;
                
            // API request actions
            case 'API_REQUEST_START':
                this.state.api.requests[action.payload.requestId] = {
                    endpoint: action.payload.endpoint,
                    status: 'pending',
                    startTime: Date.now()
                };
                this.state.ui.isLoading = true;
                break;
                
            case 'API_REQUEST_SUCCESS':
                if (this.state.api.requests[action.payload.requestId]) {
                    this.state.api.requests[action.payload.requestId].status = 'success';
                    this.state.api.requests[action.payload.requestId].endTime = Date.now();
                }
                this.state.ui.isLoading = false;
                break;
                
            case 'API_REQUEST_FAILURE':
                if (this.state.api.requests[action.payload.requestId]) {
                    this.state.api.requests[action.payload.requestId].status = 'failed';
                    this.state.api.requests[action.payload.requestId].error = action.payload.error;
                    this.state.api.requests[action.payload.requestId].endTime = Date.now();
                }
                this.state.ui.isLoading = false;
                this.state.ui.error = action.payload.error;
                
                // Update metrics
                this.state.api.metrics.failed++;
                break;
                
            case 'CHAT_REQUEST_START':
                this.state.chat.isLoading = true;
                this.state.chat.error = null;
                break;
                
            case 'CHAT_REQUEST_SUCCESS':
                this.state.chat.isLoading = false;
                this.state.chat.error = null;
                this.state.chat.lastResponse = action.payload.response;
                break;
                
            case 'CHAT_REQUEST_FAILURE':
                this.state.chat.isLoading = false;
                this.state.chat.error = action.payload.error;
                break;
                
            case 'CHAT_STREAM_START':
                this.state.chat.isStreaming = true;
                this.state.chat.error = null;
                break;
                
            case 'CHAT_STREAM_SUCCESS':
                this.state.chat.isStreaming = false;
                this.state.chat.error = null;
                break;
                
            case 'CHAT_STREAM_FAILURE':
                this.state.chat.isStreaming = false;
                this.state.chat.error = action.payload.error;
                break;
                
            // Stock loading actions
            case 'STOCK_LOADING_SUCCESS':
                this.state.stock.loading = false;
                this.state.stock.error = null;
                if (action.payload?.data) {
                    this.state.stock.data = action.payload.data;
                }
                break;
                
            case 'STOCK_LOADING_ERROR':
                this.state.stock.loading = false;
                this.state.stock.error = action.payload?.error || 'Failed to load stock data';
                break;
                
            case 'INIT_DEFAULT_STATE':
                // Initialize default state values if needed
                if (action.payload) {
                    this.state = {
                        ...this.state,
                        ...action.payload
                    };
                }
                break;
                
            case 'SET_STOCK_DATA':
                // FIXED: Validate stock data payload
                const stockData = action.payload || {};
                this.state.stock.data = stockData;
                this.state.stock.loading = false;
                this.state.stock.error = null;
                this.state.stock.lastUpdated = Date.now();
                break;
                
            case 'CLEAR_STOCK_DATA':
                // Clear all stock data for symbol change
                this.state.stock.data = {};
                this.state.stock.currentData = null;
                this.state.stock.priceData = null;
                this.state.stock.fundamentals = null;
                this.state.stock.chartData = null;
                this.state.stock.news = [];
                this.state.stock.error = null;
                this.state.stock.lastUpdated = null;
                break;
                
            case 'UPDATE_STOCK_DATA':
                // Update stock data with new payload
                if (action.payload) {
                    this.state.stock.data = {
                        ...this.state.stock.data,
                        ...action.payload
                    };
                    this.state.stock.loading = false;
                    this.state.stock.error = null;
                    this.state.stock.lastUpdated = Date.now();
                }
                break;
                
            case 'UPDATE_FUNDAMENTALS':
                if (action.payload) {
                    this.state.stock.fundamentals = { ...action.payload };
                    this.state.stock.lastUpdated = Date.now();
                    this.state.stock.error = null;
                }
                break;
                
            case 'SET_UI_STATE':
                // Merge provided UI state keys (shallow)
                if (action.payload && typeof action.payload === 'object') {
                    this.state.ui = { ...this.state.ui, ...action.payload };
                }
                break;
                
            case 'WINDOW_RESIZE':
                if (action.payload && typeof action.payload === 'object') {
                    this.state.ui.windowSize = {
                        width: action.payload.width || window.innerWidth,
                        height: action.payload.height || window.innerHeight,
                        timestamp: Date.now()
                    };
                }
                break;
                
            case 'APP_INITIALIZED':
            case 'KERNEL_READY':
                // No state change required, used only for signalling
                break;
                
            case 'UPDATE_TECHNICAL_ANALYSIS':
            case 'UPDATE_TICKER_TAPE':
            case 'UPDATE_HEADER_DATA':
                // Accepted but handled elsewhere; prevent warning
                break;
                
            default:
                if (this.state?.app?.debug) {
                    console.warn('Unknown action type: ' + action.type);
                } else {
                    console.debug('Unhandled action:', action.type);
                }
        }
    }
    
    /**
     * Get current state or state slice
     * @param {string} path - Optional path to specific state slice
     * @returns {*} State or state slice
     */
    getState(path = null) {
        if (!path) {
            return this.deepClone(this.state);
        }
        
        const pathParts = path.split('.');
        let current = this.state;
        
        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return this.deepClone(current);
    }
    
    /**
     * Notify subscribers of state changes
     * @param {Object} prevState - Previous state
     * @param {Object} newState - New state
     */
    notifySubscribers(prevState, newState) {
        for (const [path, subscribers] of this.subscribers) {
            const prevValue = this.getValueByPath(prevState, path);
            const newValue = this.getValueByPath(newState, path);
            
            if (!this.deepEqual(prevValue, newValue)) {
                for (const callback of subscribers) {
                    try {
                        callback(newValue, prevValue, path);
                    } catch (error) {
                        console.error(`Subscriber error for path ${path}:`, error);
                    }
                }
            }
        }
    }
    
    /**
     * Get value by path from object
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-separated path
     * @returns {*} Value at path
     */
    getValueByPath(obj, path) {
        const pathParts = path.split('.');
        let current = obj;
        
        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }
    
    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Map) {
            return new Map(obj);
        }
        
        if (obj instanceof Set) {
            return new Set(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    /**
     * Deep equality check
     * @param {*} a - First value
     * @param {*} b - Second value
     * @returns {boolean} Are values equal
     */
    deepEqual(a, b) {
        if (a === b) return true;
        
        if (a === null || b === null) return a === b;
        if (typeof a !== typeof b) return false;
        
        if (typeof a !== 'object') return a === b;
        
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        
        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.deepEqual(a[i], b[i])) return false;
            }
            return true;
        }
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this.deepEqual(a[key], b[key])) return false;
        }
        
        return true;
    }
    
    /**
     * Log action for debugging
     * @param {Object} action - Action to log
     */
    logAction(action) {
        const logEntry = {
            action,
            timestamp: Date.now(),
            state: this.deepClone(this.state)
        };
        
        this.actionHistory.push(logEntry);
        
        // Maintain history limit
        if (this.actionHistory.length > this.maxHistoryLength) {
            this.actionHistory = this.actionHistory.slice(-this.maxHistoryLength);
        }
        
        if (this.state.app.debug) {
            console.log('🔄 Action dispatched:', action);
        }
    }
    
    /**
     * Get action history for debugging
     * @returns {Array} Action history
     */
    getActionHistory() {
        return this.deepClone(this.actionHistory);
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = new FinanceHubStateManager().state;
        this.state = initialState;
        this.actionHistory = [];
        
        console.log('🔄 State reset to initial values');
    }
    
    /**
     * Initialize the state manager once per page load.
     * Sets the isInitialized flag and records performance baseline.
     */
    init() {
        if (this.state.app.isInitialized) {
            console.warn('FinanceHubStateManager already initialized – skipping duplicate init()');
            return;
        }

        const start = performance.now();

        // Example initialization logic (can be expanded later)
        this.state.app.isInitialized = true;
        this.state.app.services.coreReady = true;
        this.state.app.performance.initTime = start;

        // Notify via dispatch so subscribers can react
        this.dispatch({
            type: 'APP_INITIALIZED',
            payload: {
                timestamp: Date.now(),
            },
        });

        console.log(`🚀 FinanceHubStateManager initialization complete in ${performance.now() - start}ms`);
    }
    
    /**
     * Export state for debugging/persistence
     * @returns {Object} Serializable state
     */
    exportState() {
        return {
            state: this.deepClone(this.state),
            actionHistory: this.deepClone(this.actionHistory),
            version: this.VERSION,
            timestamp: Date.now()
        };
    }
    
    /**
     * Import state from export
     * @param {Object} exportedState - Previously exported state
     */
    importState(exportedState) {
        if (exportedState.version !== this.VERSION) {
            console.warn(`State version mismatch: ${exportedState.version} vs ${this.VERSION}`);
        }
        
        this.state = exportedState.state;
        this.actionHistory = exportedState.actionHistory || [];
        
        console.log('📥 State imported successfully');
    }
}

// Create global state manager instance
window.FinanceHubState = new FinanceHubStateManager();

// Polyfill safeguard: ensure `init()` exists even if bundler stripped it
if (typeof window.FinanceHubState.init !== 'function') {
    console.warn('⚠️ FinanceHubState.init() is missing – injecting polyfill to maintain application startup.');
    FinanceHubStateManager.prototype.init = function () {
        // Prevent double-initialization
        if (this.initialized || (this.state?.app?.isInitialized)) {
            console.warn('FinanceHubStateManager already initialized – skipping duplicate init()');
            return;
        }

        const start = performance.now();

        // Update flags
        this.state.app.isInitialized = true;
        this.state.app.services.coreReady = true;
        this.state.app.performance.initTime = start;

        // Mark shorthand flag for external checks
        this.initialized = true;

        // Broadcast initialization event for subscribed components
        this.dispatch({
            type: 'APP_INITIALIZED',
            payload: { timestamp: Date.now() }
        });

        console.log(`🚀 FinanceHubStateManager polyfill init complete in ${(
            performance.now() - start
        ).toFixed(2)}ms`);
    };
}

// Make class globally available
window.FinanceHubStateManager = FinanceHubStateManager;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FinanceHubStateManager,
        default: window.FinanceHubState
    };
}

// ES6 Export
// REMOVED EXPORT: export { FinanceHubStateManager };
// REMOVED EXPORT: export default window.FinanceHubState;

console.log('✅ FinanceHubStateManager exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: core/state-manager.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/theme-manager.js
 * SIZE: 18,021 bytes
 * ============================================================================ */

/**
 * @file theme-manager.js - Theme Management System for FinanceHub
 * @description Advanced theme management extracted from script.js with enhancements
 * @version 2.0.0 - Extracted and Enhanced
 * @author AEVOREX
 */

/**
 * Theme Manager for FinanceHub
 */
class ThemeManager {
    constructor(options = {}) {
        this.VERSION = '2.0.0';
        
        // Configuration
        this.config = {
            defaultTheme: options.defaultTheme || 'dark',
            storageKey: options.storageKey || 'financehub_theme',
            autoDetect: options.autoDetect !== false,
            enableTransitions: options.enableTransitions !== false,
            transitionDuration: options.transitionDuration || 300,
            ...options
        };
        
        // State
        this.state = {
            currentTheme: null,
            isInitialized: false,
            systemTheme: null,
            userPreference: null,
            mediaQuery: null
        };
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Bind methods
        this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
        
        console.log(`🎨 ThemeManager v${this.VERSION} initialized`);
    }
    
    /**
     * Initialize theme manager
     */
    async init() {
        if (this.state.isInitialized || this.initialized) {
            console.warn('ThemeManager already initialized – skipping duplicate init()');
            return Promise.resolve();
        }
        
        try {
            console.log('🚀 Initializing ThemeManager...');
            
            // Setup system theme detection
            this.setupSystemThemeDetection();
            
            // Detect and apply initial theme
            this.detectTheme();
            
            // Setup theme transitions
            if (this.config.enableTransitions) {
                this.setupThemeTransitions();
            }
            
            // Mark as initialized
            this.state.isInitialized = true;
            // Mark shorthand flag for legacy checks
            this.initialized = true;
            
            console.log(`✅ ThemeManager initialized with theme: ${this.state.currentTheme}`);
            this.emit('initialized', { theme: this.state.currentTheme });
            
            // Dispatch global theme-ready event for other components
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('theme-ready', { 
                    detail: { theme: this.state.currentTheme } 
                }));
            }
            
            return Promise.resolve();
            
        } catch (error) {
            console.error('❌ ThemeManager initialization failed:', error);
            
            // 🚨 CRITICAL FIX: Dispatch global error for debugging
            window.dispatchEvent(new CustomEvent('financehub-error', {
                detail: { component: 'theme-manager', error: error.message }
            }));
            
            return Promise.reject(error);
        }
    }
    
    /**
     * Setup system theme detection
     */
    setupSystemThemeDetection() {
        if (!window.matchMedia) {
            console.warn('⚠️ matchMedia not supported, system theme detection disabled');
            return;
        }
        
        // Create media query for light theme preference
        this.state.mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        
        // Detect current system theme
        this.state.systemTheme = this.state.mediaQuery.matches ? 'light' : 'dark';
        
        // Listen for system theme changes
        this.state.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
        
        console.log(`🔍 System theme detected: ${this.state.systemTheme}`);
    }
    
    /**
     * Detect and set initial theme
     */
    detectTheme() {
        // Check for saved user preference
        const savedTheme = this.getUserPreference();
        
        if (savedTheme && this.isValidTheme(savedTheme)) {
            this.state.userPreference = savedTheme;
            this.state.currentTheme = savedTheme;
            console.log(`📱 Using saved theme preference: ${savedTheme}`);
        } else if (this.config.autoDetect && this.state.systemTheme) {
            this.state.currentTheme = this.state.systemTheme;
            console.log(`🔍 Using detected system theme: ${this.state.systemTheme}`);
        } else {
            this.state.currentTheme = this.config.defaultTheme;
            console.log(`⚙️ Using default theme: ${this.config.defaultTheme}`);
        }
        
        // Apply the detected theme
        this.applyThemeClass(this.state.currentTheme);
    }
    
    /**
     * Handle system theme changes
     */
    handleSystemThemeChange(event) {
        const newSystemTheme = event.matches ? 'light' : 'dark';
        this.state.systemTheme = newSystemTheme;
        
        console.log(`🔄 System theme changed to: ${newSystemTheme}`);
        
        // Only apply system theme if user hasn't set a manual preference
        if (!this.state.userPreference) {
            console.log('🔄 Applying system theme change (no user preference set)');
            this.setTheme(newSystemTheme, false); // Don't save as user preference
        } else {
            console.log('⏭️ Ignoring system theme change (user preference exists)');
        }
        
        this.emit('systemThemeChanged', { 
            systemTheme: newSystemTheme,
            applied: !this.state.userPreference 
        });
    }
    
    /**
     * Set theme programmatically
     */
    setTheme(theme, savePreference = true) {
        if (!this.isValidTheme(theme)) {
            console.warn(`⚠️ Invalid theme: ${theme}. Using current: ${this.state.currentTheme}`);
            return false;
        }
        
        const previousTheme = this.state.currentTheme;
        this.state.currentTheme = theme;
        
        console.log(`🎨 Setting theme: ${theme}`);
        
        // Apply theme class
        this.applyThemeClass(theme);
        
        // Save user preference if requested
        if (savePreference) {
            this.saveUserPreference(theme);
            this.state.userPreference = theme;
        }
        
        // Emit theme change event
        this.emit('themeChanged', { 
            theme, 
            previousTheme,
            isUserPreference: savePreference 
        });
        
        // ALSO broadcast as DOM CustomEvent for external listeners (e.g., TradingView Chart)
        const domEvent = new CustomEvent('theme-changed', {
            detail: { theme, previousTheme }
        });
        document.dispatchEvent(domEvent);
        
        return true;
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.state.currentTheme === 'light' ? 'dark' : 'light';
        return this.setTheme(newTheme);
    }
    
    /**
     * Apply theme class to document
     */
    applyThemeClass(theme) {
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('light-theme', 'dark-theme');
        
        // Add new theme class
        root.classList.add(`${theme}-theme`);
        
        // Set data attribute for CSS targeting
        root.setAttribute('data-theme', theme);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
        
        console.log(`✅ Applied theme class: ${theme}-theme`);
    }
    
    /**
     * Update meta theme-color for mobile browsers
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        // Set appropriate color based on theme
        const colors = {
            light: '#ffffff',
            dark: '#1e1e1e'
        };
        
        metaThemeColor.content = colors[theme] || colors.dark;
    }
    
    /**
     * Setup smooth theme transitions
     */
    setupThemeTransitions() {
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                transition: 
                    background-color ${this.config.transitionDuration}ms ease,
                    border-color ${this.config.transitionDuration}ms ease,
                    color ${this.config.transitionDuration}ms ease,
                    fill ${this.config.transitionDuration}ms ease,
                    stroke ${this.config.transitionDuration}ms ease,
                    box-shadow ${this.config.transitionDuration}ms ease !important;
            }
        `;
        document.head.appendChild(style);
        
        // Remove transitions after theme change to prevent interference
        this.on('themeChanged', () => {
            setTimeout(() => {
                style.remove();
                setTimeout(() => {
                    document.head.appendChild(style);
                }, 50);
            }, this.config.transitionDuration);
        });
    }
    
    /**
     * Get user preference from storage
     */
    getUserPreference() {
        try {
            const raw = localStorage.getItem(this.config.storageKey);
            if (!raw) return null;

            const stored = raw.trim();

            // Handle both plain string and JSON formats for backwards compatibility
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
            
            // Try to parse as JSON (legacy format)
            try {
                const parsed = JSON.parse(stored);
                return typeof parsed === 'string' ? parsed : null;
            } catch (parseError) {
                console.warn('Failed to get stored theme:', parseError);
                // Clear invalid data
                localStorage.removeItem(this.config.storageKey);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Failed to read theme preference from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Save user preference to storage
     */
    saveUserPreference(theme) {
        try {
            localStorage.setItem(this.config.storageKey, theme);
            console.log(`💾 Saved theme preference: ${theme}`);
        } catch (error) {
            console.warn('⚠️ Failed to save theme preference to localStorage:', error);
        }
    }
    
    /**
     * Clear user preference
     */
    clearUserPreference() {
        try {
            localStorage.removeItem(this.config.storageKey);
            this.state.userPreference = null;
            console.log('🗑️ Cleared theme preference');
            
            // Revert to system theme if available
            if (this.state.systemTheme) {
                this.setTheme(this.state.systemTheme, false);
            }
        } catch (error) {
            console.warn('⚠️ Failed to clear theme preference:', error);
        }
    }
    
    /**
     * Check if theme is valid
     */
    isValidTheme(theme) {
        return theme === 'light' || theme === 'dark';
    }
    
    /**
     * Get theme colors for programmatic use
     */
    getThemeColors(theme = this.state.currentTheme) {
        const colors = {
            light: {
                primary: '#000000',
                secondary: '#666666',
                background: '#ffffff',
                surface: '#f8f9fa',
                border: '#e1e5e9',
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            },
            dark: {
                primary: '#ffffff',
                secondary: '#a1a1aa',
                background: '#1e1e1e',
                surface: '#2a2a2a',
                border: '#404040',
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            }
        };
        
        return colors[theme] || colors.dark;
    }
    
    /**
     * Get CSS custom property value
     */
    getCSSProperty(property, fallback = '') {
        try {
            return getComputedStyle(document.documentElement)
                .getPropertyValue(property).trim() || fallback;
        } catch (error) {
            console.warn(`⚠️ Failed to get CSS property ${property}:`, error);
            return fallback;
        }
    }
    
    /**
     * Set CSS custom property
     */
    setCSSProperty(property, value) {
        try {
            document.documentElement.style.setProperty(property, value);
        } catch (error) {
            console.warn(`⚠️ Failed to set CSS property ${property}:`, error);
        }
    }
    
    /**
     * Event emitter methods
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Error in theme event handler for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.state.currentTheme;
    }
    
    /**
     * Get theme state information
     */
    getState() {
        return {
            currentTheme: this.state.currentTheme,
            systemTheme: this.state.systemTheme,
            userPreference: this.state.userPreference,
            isInitialized: this.state.isInitialized,
            version: this.VERSION
        };
    }
    
    /**
     * Destroy theme manager
     */
    destroy() {
        console.log('🗑️ Destroying ThemeManager...');
        
        // Remove system theme listener
        if (this.state.mediaQuery) {
            this.state.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        // Reset state
        this.state.isInitialized = false;
        
        console.log('✅ ThemeManager destroyed');
    }
    
    /**
     * Debug method to check theme state
     */
    debugTheme() {
        const root = document.documentElement;
        const currentTheme = this.getCurrentTheme();
        const computedBg = getComputedStyle(root).getPropertyValue('--fh-bg-primary').trim();
        const computedText = getComputedStyle(root).getPropertyValue('--fh-text-primary').trim();
        
        console.group('🔍 Theme Debug Information');
        console.log('Current Theme:', currentTheme);
        console.log('HTML data-theme:', root.getAttribute('data-theme'));
        console.log('HTML classes:', root.className);
        console.log('State:', this.state);
        console.log('Computed --fh-bg-primary:', computedBg);
        console.log('Computed --fh-text-primary:', computedText);
        console.log('LocalStorage theme:', localStorage.getItem(this.config.storageKey));
        console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);
        console.groupEnd();
        
        return {
            currentTheme,
            dataTheme: root.getAttribute('data-theme'),
            classes: root.className,
            state: this.state,
            computedBg,
            computedText,
            localStorage: localStorage.getItem(this.config.storageKey),
            systemPrefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches
        };
    }
}

// Export and initialize
if (typeof window !== 'undefined') {
    // Create a single instance
    const themeManagerInstance = new ThemeManager();
    
    // Make it available as both ThemeManager (class) and themeManager (instance)
    window.ThemeManager = ThemeManager;
    window.themeManager = themeManagerInstance;

    // BEGIN Legacy bridge – expose singleton methods on window.ThemeManager for backwards compatibility
    // Keep original class reference for modern codebases
    window.ThemeManagerClass = ThemeManager;

    const _legacyBridgeMethods = [
        'init',
        'setTheme',
        'toggleTheme',
        'clearUserPreference',
        'getCurrentTheme',
        'getThemeColors',
        'getCSSProperty',
        'setCSSProperty',
        'on',
        'off',
        'debugTheme',
        'getState'
    ];

    _legacyBridgeMethods.forEach(methodName => {
        if (typeof window.ThemeManager[methodName] === 'undefined') {
            window.ThemeManager[methodName] = (...args) => themeManagerInstance[methodName](...args);
        }
    });
    // END Legacy bridge

    console.log('✅ ThemeManager: Class, instance and legacy bridge exported to window');
    
    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            themeManagerInstance.init().catch(console.error);
        });
    } else {
        // DOM already ready, initialize immediately
        themeManagerInstance.init().catch(console.error);
    }
}

// ES6 Export
// REMOVED EXPORT: export { ThemeManager };
// REMOVED EXPORT: export default window.themeManager;

/* ============================================================================
 * END OF FILE: core/theme-manager.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/progressive-loader.js
 * SIZE: 20,390 bytes
 * ============================================================================ */

/**
 * @file progressive-loader.js - Optimized Progressive Data Loading System
 * @description High-performance chunked loading with intelligent scheduling
 * @version 2.0.0 - Performance Optimized
 * @author AEVOREX
 */

class OptimizedProgressiveLoader {
    constructor() {
        this.loadingStates = new Map();
        this.dataCache = new Map();
        this.loadingQueue = [];
        this.isProcessing = false;
        
        // Performance optimization
        this.requestScheduler = new RequestScheduler();
        this.progressivePerformanceMonitor = new ProgressivePerformanceMonitor();
        
        // Priority levels for different data types
        this.PRIORITIES = {
            CRITICAL: 1,    // Basic price, symbol info
            HIGH: 2,        // Chart data, key metrics
            MEDIUM: 3,      // Financials, ratios
            LOW: 4          // News, AI analysis
        };
        
        // Loading phases with optimized timing
        this.PHASES = {
            PHASE_1: 'stock_data',        // Symbol, price, basic info
            PHASE_2: 'chart_data',        // Chart/OHLCV data
            PHASE_3: 'fundamentals',      // Financial fundamentals
            PHASE_4: 'ai_summary',        // AI analysis, news, extended data
        };
        
        // Optimized delays based on network conditions
        this.delays = {
            phase2: 25,   // Reduced from 50ms
            phase3: 100,  // Reduced from 200ms
            phase4: 300   // Reduced from 500ms
        };
        
        this.init();
    }
    
    init() {
        // Detect network conditions and adjust delays
        this.detectNetworkConditions();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        console.log('🚀 OptimizedProgressiveLoader initialized');
        
        // Auto-start demo if no session is active (disabled to prevent conflicts)
        // setTimeout(() => {
        //     this.startDemoIfNeeded();
        // }, 1500); // Reduced from 2000ms
    }
    
    detectNetworkConditions() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            
            // Ultra-aggressive delays for maximum speed
            switch (effectiveType) {
                case '4g':
                    this.delays = { phase2: 10, phase3: 50, phase4: 150 }; // Ultra-fast
                    break;
                case '3g':
                    this.delays = { phase2: 25, phase3: 100, phase4: 300 }; // Fast
                    break;
                case '2g':
                    this.delays = { phase2: 100, phase3: 300, phase4: 800 }; // Standard
                    break;
                default:
                    // Keep optimized defaults for unknown connections
                    this.delays = { phase2: 25, phase3: 100, phase4: 300 };
                    break;
            }
            
            console.log(`📶 Network: ${effectiveType}, Ultra-optimized delays:`, this.delays);
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitor page visibility for pause/resume (less aggressive)
        let isCurrentlyHidden = false;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !isCurrentlyHidden) {
                isCurrentlyHidden = true;
                this.pauseLoading();
            } else if (!document.hidden && isCurrentlyHidden) {
                isCurrentlyHidden = false;
                this.resumeLoading();
            }
        });
        
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                    console.warn('⚠️ High memory usage, clearing old cache');
                    this.cleanupOldCache();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Load symbol data progressively with intelligent scheduling
     * @param {string} symbol - Stock symbol
     * @param {Object} options - Loading options
     */
    async loadSymbolProgressive(symbol, options = {}) {
        const sessionId = this.generateSessionId(symbol);
        const startTime = performance.now();
        
        // Reset loading states for new symbol
        this.resetLoadingState(sessionId);
        
        // Start performance monitoring for this session
        this.progressivePerformanceMonitor.startSession(sessionId);
        
        try {
            // Phase 1: Critical data (immediate)
            await this.startPhase1(symbol, sessionId);
            
            // Schedule remaining phases with intelligent delays
            this.schedulePhase2(symbol, sessionId);
            this.schedulePhase3(symbol, sessionId);
            this.schedulePhase4(symbol, sessionId);
            
            // Monitor completion
            this.monitorCompletion(sessionId, startTime);
            
        } catch (error) {
            console.error('❌ Progressive loading error:', error);
            this.updateLoadingState(sessionId, 'error', 'failed');
            
            // 🚨 CRITICAL FIX: Dispatch global error for debugging
            window.dispatchEvent(new CustomEvent('financehub-error', {
                detail: { component: 'progressive-loader', error: error.message, sessionId }
            }));
            
            // Re-throw error for proper debugging
            throw error;
        }
        
        return sessionId;
    }

    /**
     * Phase 1: Critical basic data (immediate, highest priority)
     */
    async startPhase1(symbol, sessionId) {
        const phaseStart = performance.now();
        
        try {
            this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'loading');
            
            console.log(`🔄 Loading stock data for ${symbol}...`);
            const stockData = await window.API.getFundamentals(symbol);
            
            if (stockData) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'completed');
                this.notifyUIUpdate('stock_data', stockData, sessionId);
                
                const phaseTime = performance.now() - phaseStart;
                this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase1', phaseTime);
                
                console.log(`✅ Phase 1 completed in ${phaseTime.toFixed(1)}ms`);
            } else {
                // If stock data is not available, mark as error
                this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'error');
                console.warn('⚠️ Phase 1: Stock data not available');
            }
        } catch (error) {
            this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'error');
            console.error('❌ Phase 1 loading error:', error);
            throw error; // Critical phase failure should stop the process
        }
    }

    /**
     * Phase 2: Chart data (high priority)
     */
    schedulePhase2(symbol, sessionId) {
        const delay = this.delays.phase2;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'loading');
                
                // ✅ PHASE 2: Use getStockChart instead of deprecated fetchChartData
                console.log('🔄 Phase 2: Loading chart data...');
                const chartData = await window.API.getStockChart(symbol);
                
                if (chartData) {
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'completed');
                    this.notifyUIUpdate('chart_data', chartData, sessionId);
                    
                    const phaseTime = performance.now() - phaseStart;
                    this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase2', phaseTime);
                    
                    console.log(`✅ Phase 2 completed in ${phaseTime.toFixed(1)}ms`);
                } else {
                    // If chart data is not available, mark as completed anyway
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'completed');
                    console.log('⚠️ Phase 2: Chart data not available, skipping');
                }
            } catch (error) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'error');
                console.error('❌ Phase 2 loading error:', error);
            }
        }, delay);
    }

    /**
     * Phase 3: Fundamental data (medium priority)
     */
    schedulePhase3(symbol, sessionId) {
        const delay = this.delays.phase3;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'loading');
                
                // ✅ PHASE 3: Use getStockFundamentals instead of deprecated fetchFundamentals
                console.log('🔄 Phase 3: Loading fundamentals data...');
                const fundamentals = await window.API.getStockFundamentals(symbol);
                
                if (fundamentals) {
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'completed');
                    this.notifyUIUpdate('fundamentals', fundamentals, sessionId);
                    
                    const phaseTime = performance.now() - phaseStart;
                    this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase3', phaseTime);
                    
                    console.log(`✅ Phase 3 completed in ${phaseTime.toFixed(1)}ms`);
                } else {
                    // If fundamentals data is not available, mark as completed anyway
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'completed');
                    console.log('⚠️ Phase 3: Fundamentals data not available, skipping');
                }
            } catch (error) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'error');
                console.error('❌ Phase 3 loading error:', error);
            }
        }, delay);
    }

    /**
     * Phase 4: AI Summary (was Analytics)
     */
    schedulePhase4(symbol, sessionId) {
        const delay = this.delays.phase4;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'loading');
                
                console.log(`🤖 Phase 4: Generating AI insights for ${symbol}...`);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'loading', 'Generating AI insights...');
                
                // ✅ PHASE 4: Use getStockAISummary instead of deprecated fetchAISummary
                const aiSummary = await window.API.getStockAISummary(symbol);
                
                console.log('✅ Phase 4: AI Summary data loaded successfully');
                this.notifyUIUpdate('ai_summary', aiSummary, sessionId);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'completed', 'AI insights generated successfully');
                
                // Record performance
                const phaseTime = performance.now() - phaseStart;
                this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase4', phaseTime);
                
            } catch (error) {
                console.error('❌ Phase 4: AI Summary loading failed:', error);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'error', `AI insights generation failed: ${error.message}`);
                this.notifyLoadingProgress(sessionId, this.PHASES.PHASE_4, 'error', `AI insights generation failed: ${error.message}`);
            }
        }, delay);
    }
    
    monitorCompletion(sessionId, startTime) {
        const checkCompletion = () => {
            if (this.isLoadingComplete(sessionId)) {
                const totalTime = performance.now() - startTime;
                this.progressivePerformanceMonitor.completeSession(sessionId, totalTime);
                console.log(`🎉 Progressive loading completed in ${totalTime.toFixed(1)}ms`);
                
                // Emit completion event
                this.notifyLoadingComplete(sessionId, totalTime);
            } else {
                setTimeout(checkCompletion, 100);
            }
        };
        
        setTimeout(checkCompletion, 100);
    }

    /**
     * Generate unique session ID with performance tracking
     */
    generateSessionId(symbol) {
        return `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Reset loading state for new session
     */
    resetLoadingState(sessionId) {
        this.loadingStates.set(sessionId, {
            [this.PHASES.PHASE_1]: 'pending',
            [this.PHASES.PHASE_2]: 'pending', 
            [this.PHASES.PHASE_3]: 'pending',
            [this.PHASES.PHASE_4]: 'pending',
            startTime: Date.now(),
            paused: false
        });
    }

    /**
     * Update loading state for a specific phase
     */
    updateLoadingState(sessionId, phase, status, message = '') {
        const state = this.loadingStates.get(sessionId);
        if (state && !state.paused) {
            state[phase] = status;
            state.lastUpdate = Date.now();
            state.message = message;
            
            // Notify UI of loading progress
            this.notifyLoadingProgress(sessionId, phase, status, message);
        }
    }

    /**
     * Notify UI of loading progress with performance data
     */
    notifyLoadingProgress(sessionId, phase, status, message = '') {
        const event = new CustomEvent('progressiveLoading', {
            detail: { 
                sessionId, 
                phase, 
                status, 
                message,
                timestamp: Date.now(),
                performance: this.progressivePerformanceMonitor.getSessionStats(sessionId)
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Notify UI of data updates
     */
    notifyUIUpdate(dataType, data, sessionId) {
        const event = new CustomEvent('dataUpdate', {
            detail: { 
                dataType, 
                data, 
                sessionId, 
                timestamp: Date.now(),
                cacheHit: data.metadata?.cache_hit || false
            }
        });
        document.dispatchEvent(event);
    }
    
    notifyLoadingComplete(sessionId, totalTime) {
        const event = new CustomEvent('progressiveLoadingComplete', {
            detail: { 
                sessionId, 
                totalTime,
                performance: this.progressivePerformanceMonitor.getSessionStats(sessionId)
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current loading state
     */
    getLoadingState(sessionId) {
        return this.loadingStates.get(sessionId) || null;
    }

    /**
     * Check if all phases are completed
     */
    isLoadingComplete(sessionId) {
        const state = this.loadingStates.get(sessionId);
        if (!state) return false;
        
        return Object.values(this.PHASES).every(phase => 
            state[phase] === 'completed' || state[phase] === 'error'
        );
    }
    
    // === PERFORMANCE OPTIMIZATION METHODS ===
    
    pauseLoading() {
        for (const [sessionId, state] of this.loadingStates.entries()) {
            state.paused = true;
        }
        console.log('⏸️ Progressive loading paused');
    }
    
    resumeLoading() {
        for (const [sessionId, state] of this.loadingStates.entries()) {
            state.paused = false;
        }
        console.log('▶️ Progressive loading resumed');
    }
    
    cleanupOldCache() {
        const cutoff = Date.now() - 300000; // 5 minutes
        for (const [sessionId, state] of this.loadingStates.entries()) {
            if (state.startTime < cutoff) {
                this.loadingStates.delete(sessionId);
            }
        }
    }
    
    getPerformanceStats() {
        return this.progressivePerformanceMonitor.getOverallStats();
    }

    /**
     * Start demo mode if no active session
     */
    startDemoIfNeeded() {
        if (!this.loadingStates.size && !document.querySelector('.analysis-content:not(.hidden)')) {
            console.log('🎯 Starting progressive loading demo with AAPL');
            this.loadSymbolProgressive('AAPL');
        }
    }
}

// === PERFORMANCE MONITORING CLASSES ===

class RequestScheduler {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    schedule(request, priority = 3) {
        this.queue.push({ request, priority, timestamp: Date.now() });
        this.queue.sort((a, b) => a.priority - b.priority);
        
        if (!this.processing) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        this.processing = true;
        
        while (this.queue.length > 0) {
            const { request } = this.queue.shift();
            try {
                await request();
            } catch (error) {
                console.error('Scheduled request failed:', error);
            }
        }
        
        this.processing = false;
    }
}

class ProgressivePerformanceMonitor {
    constructor() {
        this.sessions = new Map();
        this.overallStats = {
            totalSessions: 0,
            averageLoadTime: 0,
            successRate: 0,
            phaseStats: {}
        };
    }
    
    startSession(sessionId) {
        this.sessions.set(sessionId, {
            startTime: performance.now(),
            phases: {},
            completed: false
        });
        this.overallStats.totalSessions++;
    }
    
    recordPhase(sessionId, phase, duration) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.phases[phase] = duration;
        }
        
        // Update overall phase stats
        if (!this.overallStats.phaseStats[phase]) {
            this.overallStats.phaseStats[phase] = { total: 0, count: 0, average: 0 };
        }
        
        const phaseStats = this.overallStats.phaseStats[phase];
        phaseStats.total += duration;
        phaseStats.count++;
        phaseStats.average = phaseStats.total / phaseStats.count;
    }
    
    completeSession(sessionId, totalTime) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.completed = true;
            session.totalTime = totalTime;
            
            // Update overall average
            const completedSessions = Array.from(this.sessions.values())
                .filter(s => s.completed);
            
            this.overallStats.averageLoadTime = 
                completedSessions.reduce((sum, s) => sum + s.totalTime, 0) / completedSessions.length;
            
            this.overallStats.successRate = 
                completedSessions.length / this.overallStats.totalSessions;
        }
    }
    
    getSessionStats(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    getOverallStats() {
        return this.overallStats;
    }
}

// Global instance
window.ProgressiveLoader = new OptimizedProgressiveLoader();

// Make classes globally available
window.OptimizedProgressiveLoader = OptimizedProgressiveLoader;
window.RequestScheduler = RequestScheduler;
window.ProgressivePerformanceMonitor = ProgressivePerformanceMonitor;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        OptimizedProgressiveLoader, 
        RequestScheduler, 
        ProgressivePerformanceMonitor,
        default: OptimizedProgressiveLoader
    };
}

// ES6 Export - commented out for bundler compatibility
/* export { OptimizedProgressiveLoader, RequestScheduler, ProgressivePerformanceMonitor };
// REMOVED EXPORT: export default OptimizedProgressiveLoader; */

console.log('✅ OptimizedProgressiveLoader exported successfully (CommonJS + Global)'); 

/* ============================================================================
 * END OF FILE: core/progressive-loader.js
 * ============================================================================ */


/* ============================================================================
 * FILE: patches/financehub_bootstrap_patches.js
 * SIZE: 17,578 bytes
 * ============================================================================ */

/*
 * financehub_bootstrap_patches.js
 * Consolidated bootstrap-level patches and polyfills for FinanceHub.
 * These were previously inlined in financehub.html.
 *
 * Scope:
 *   – Runtime logging guard / __FINANCEHUB_DEBUG flag
 *   – FinanceHubState.init polyfill
 *   – Legacy pre-patches (ChartManager stub, AnalysisBubbles wrapper, etc.)
 *   – FinanceHubChat safe-render patch
 *   – UnifiedChartManager multipanel / study patch
 *   – Skeleton loader enhancer
 *   – FinanceHubAPIService#getStockHeader hot-patch
 *   – TradingView telemetry fetch suppressor
 *   – Chat container ID alias (#chat-messages) for debug tooling compatibility
 *   – Auto-initialisation retries for bubbles & app when polyfills ready
 */

// IIFE wrapper to avoid leaking vars
(() => {
  /* ------------------------------------------------------------
   * 1. Runtime logging guard
   * ---------------------------------------------------------- */
  (() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug') === 'true' || localStorage.getItem('fh_debug') === '1';
    window.__FINANCEHUB_DEBUG = debug;
    if (!debug) {
      const noop = () => {};
      ['log', 'info', 'debug', 'warn', 'trace'].forEach(fn => {
        if (console[fn]) {
          console[`_${fn}`] = console[fn];
          console[fn] = noop;
        }
      });
    }
  })();

  /* ------------------------------------------------------------
   * 2. FinanceHubState.init polyfill
   * ---------------------------------------------------------- */
  (() => {
    if (!window.FinanceHubState) {
// SKIPPED DUPLICATE: window.FinanceHubState = { state: { app: { isInitialized: false, services: { coreReady: false }, performance: { initTime: 0 } } } };
    }
    if (typeof window.FinanceHubState.init !== 'function') {
      window.FinanceHubState.init = function () {
        if (this.state?.app?.isInitialized) return;
        const t = performance.now();
        this.state.app.isInitialized = true;
        this.state.app.services.coreReady = true;
        this.state.app.performance.initTime = t;
        if (typeof this.dispatch === 'function') {
          this.dispatch({ type: 'APP_INITIALIZED', payload: { timestamp: Date.now() } });
        }
        console.log('FinanceHubState.init polyfilled');
      };
    }
  })();

  /* ------------------------------------------------------------
   * 3. Legacy pre-patches & globals
   * ---------------------------------------------------------- */
  (() => {
    // Provide lazy alias: ChartManager → UnifiedChartManager once that class is defined
    if (!window.ChartManager) {
      Object.defineProperty(window, 'ChartManager', {
        configurable: true,
        enumerable: true,
        get() {
          return window.UnifiedChartManager || undefined;
        },
        set(v) {
          // Allow overriding while keeping aliasing behaviour if UnifiedChartManager later loads
          Object.defineProperty(window, 'ChartManager', {
            value: v,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      });
    }

    // Ensure legacy TradingView container id alias
    (() => {
      const legacyId = 'tradingview-chart';
      const altId = 'tradingview_chart';
      const altEl = document.getElementById(altId);
      const legacyEl = document.getElementById(legacyId);
      if (!legacyEl && altEl) {
        altEl.id = legacyId;
        console.info('🩹 Chart container ID aliased from tradingview_chart → tradingview-chart');
      }
    })();

    // Namespace safety
    window.FinanceHub = window.FinanceHub || {};
    window.FinanceHub.components = window.FinanceHub.components || {};

    // Helper to wrap AnalysisBubbles constructor
    const wrapAnalysisBubblesCtor = Orig => {
      if (!Orig || Orig.__patched) return Orig;
      function Patched(arg1, arg2) {
        let options = {};
        if (arg1 && (arg1 instanceof HTMLElement || typeof arg1 === 'string')) {
          options = (arg2 && typeof arg2 === 'object') ? { ...arg2 } : {};
          options.containerId = arg1 instanceof HTMLElement ? (arg1.id || arg1.getAttribute('id') || 'fh-analysis-bubbles') : arg1;
        } else if (typeof arg1 === 'object') {
          options = { ...arg1 };
        }
        options.containerId = options.containerId || 'fh-analysis-bubbles';
        if (!options.apiClient) options.apiClient = window.FinanceHub.components?.api || window.FinanceHubAPIService;
        if (!options.symbol && window.FinanceHubState?.state?.stock?.symbol) {
          options.symbol = window.FinanceHubState.state.stock.symbol;
        }
        return new Orig(options);
      }
      Patched.prototype = Orig.prototype;
      Patched.__patched = true;
      return Patched;
    };

    Object.defineProperty(window, 'AnalysisBubbles', {
      configurable: true,
      enumerable: true,
      set(v) { this._AB = wrapAnalysisBubblesCtor(v); },
      get() { return this._AB; }
    });

    // Stub modules.ui/renderMessage if missing
    window.modules = window.modules || {};
    window.modules.ui = window.modules.ui || {};
    if (typeof window.modules.ui.renderMessage !== 'function') {
      window.modules.ui.renderMessage = () => { console.debug('modules.ui.renderMessage stubbed'); };
    }

    // Stub streaming module
    window.modules.streaming = window.modules.streaming || {};
    if (typeof window.modules.streaming.startStream !== 'function') {
      window.modules.streaming.startStream = () => { console.debug('modules.streaming.startStream stubbed'); return { cancel: () => {} }; };
    }
  })();

  /* ------------------------------------------------------------
   * 4. FinanceHubChat safe-render patch
   * ---------------------------------------------------------- */
  (() => {
    const safePatch = def => {
      if (!def || def.prototype.__fh_safe_render_patch) return;
      const wrap = origFn => function (content = '', options = {}) {
        let message;
        if (typeof origFn === 'function') {
          try { message = origFn.call(this, content, options); } catch (err) { console.error('[FinanceHubChat wrapper] origFn failed', err); }
        }
        try {
          const ui = this.modules?.ui;
          if (ui) {
            if (typeof ui.renderMessage === 'function') {
              // ok
            } else if (typeof ui.addMessage === 'function') {
              ui.renderMessage = (...p) => ui.addMessage(...p);
              if (message) ui.renderMessage(message);
            } else if (typeof window.modules?.ui?.renderMessage === 'function') {
              window.modules.ui.renderMessage(message);
            }
          }
        } catch (fallbackErr) { console.error('[FinanceHubChat wrapper] render fallback failed', fallbackErr); }
        return message;
      };
      if (typeof def.prototype.addAIMessage === 'function') def.prototype.addAIMessage = wrap(def.prototype.addAIMessage);
      if (typeof def.prototype.addUserMessage === 'function') def.prototype.addUserMessage = wrap(def.prototype.addUserMessage);
      def.prototype.__fh_safe_render_patch = true;
    };

    Object.defineProperty(window, 'FinanceHubChat', {
      configurable: true,
      enumerable: true,
      set(v) { safePatch(v); this._FHC = v; },
      get() { return this._FHC; }
    });
  })();

  /* ------------------------------------------------------------
   * 5. UnifiedChartManager monkey-patch
   * ---------------------------------------------------------- */
  (() => {
    Object.defineProperty(window, 'UnifiedChartManager', {
      configurable: true,
      enumerable: true,
      set(v) {
        if (!v) { this._UCM = v; return; }
        if (!v.prototype.__fh_multipanel_patched) {
          const origCreate = v.prototype.createWidgetConfig;
          v.prototype.createWidgetConfig = function () {
            const cfg = origCreate.call(this);
            // ⛔ Do NOT force-add Technical_Rating study; it causes StudyInserter errors when datafeed is custom.
            // cfg.studies = Array.isArray(cfg.studies) ? cfg.studies : [];
            // if (!cfg.studies.includes('Technical_Rating@tv-basicstudies')) cfg.studies.push('Technical_Rating@tv-basicstudies');
            if (Array.isArray(cfg.disabled_features)) cfg.disabled_features = cfg.disabled_features.filter(f => f !== 'header_indicators');
            if (parseInt(cfg.height, 10) < 600) cfg.height = '600';
            return cfg;
          };
          v.prototype.__fh_multipanel_patched = true;
        }
        this._UCM = v;
      },
      get() { return this._UCM; }
    });
  })();

  /* ------------------------------------------------------------
   * 6. Skeleton loader enhancer for placeholder values
   * ---------------------------------------------------------- */
  (() => {
    const PLACEHOLDER_TEXTS = ['N/A', '—', '-', 'N / A', 'n/a', 'na', 'NA'];
    const addSkeleton = el => {
      if (el && !el.classList.contains('skeleton')) {
        el.textContent = '';
        el.classList.add('skeleton');
        if (!el.style.height) el.style.height = '1rem';
      }
    };
    const scan = root => {
      root.querySelectorAll('.metric-value, .tech-value, .fh-value, [data-placeholder]').forEach(el => {
        const txt = (el.textContent || '').trim();
        if (PLACEHOLDER_TEXTS.includes(txt)) addSkeleton(el);
      });
    };
    const onReady = () => scan(document);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else { onReady(); }
    const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })));
    mo.observe(document.body, { childList: true, subtree: true });
  })();

  /* ------------------------------------------------------------
   * 7. FinanceHubAPIService#getStockHeader hot-patch
   * ---------------------------------------------------------- */
  (() => {
    const API = window.FinanceHubAPIService;
    if (API && API.prototype && typeof API.prototype.getStockHeader !== 'function') {
      API.prototype.getStockHeader = async function (ticker) {
        if (!ticker || typeof ticker !== 'string') throw new Error('Valid ticker symbol is required');
        const cacheKey = `header_${ticker.toUpperCase()}`;
        const cached = this.getFromCache?.(cacheKey, 'stock_header');
        if (cached) return cached;
        const response = await this.makeRequest(`/api/v1/stock/header/${ticker.toUpperCase()}`, { timeout: 10000 });
        if (typeof response.price === 'undefined') throw new Error('Invalid header data format');
        this.setCache?.(cacheKey, response, 'stock_header', 1);
        return response;
      };
      console.info('🩹 Patched FinanceHubAPIService#getStockHeader');
    }
  })();

  /* ------------------------------------------------------------
   * 8. TradingView telemetry fetch suppressor
   * ---------------------------------------------------------- */
  (() => {
    const origFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.includes('telemetry.tradingview.com/widget/report')) {
        return Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' }));
      }
      return origFetch.apply(this, arguments);
    };
  })();

  /* ------------------------------------------------------------
   * 8b. TradingView schema-warning suppressor (state unknown)
   * ---------------------------------------------------------- */
  (() => {
    // Patterns covering TradingView schema-type warnings we want to silence
    const PATTERNS = [
      'data type: unknown does not match a schema',
      'Property:The state with a data type: unknown does not match a schema',
      'Property: The state with a data type: unknown does not match a schema',
      'The state with a data type: unknown does not match a schema'
    ];

    /**
     * Returns true if ANY of the console arguments include the pattern.
     * Handles diverse argument types (string, object, Error, etc.).
     */
    const matchesPattern = (args) => {
      try {
        return args.some(arg => {
          if (!arg) return false;
          if (typeof arg === 'string') {
            return PATTERNS.some(p => arg.includes(p));
          }
          // Check common shapes (Error, object with message)
          if (arg instanceof Error && arg.message) {
            return PATTERNS.some(p => arg.message.includes(p));
          }
          if (typeof arg === 'object') {
            const str = JSON.stringify(arg);
            return PATTERNS.some(p => str && str.includes(p));
          }
          return false;
        });
      } catch (e) { return false; }
    };

    const intercept = (origFn) => function (...args) {
      if (matchesPattern(args)) {
        // 🔇 Silently swallow TradingView schema warnings
        return;
      }
      return origFn.apply(this, args);
    };

    // Patch all major console levels
    console.warn  = intercept(console.warn);
    console.error = intercept(console.error);
    console.info  = intercept(console.info);
    console.debug = intercept(console.debug);
    console.log   = intercept(console.log);
  })();

  /* ------------------------------------------------------------
   * 8c. ResizeObserver loop error suppressor (Safari/Chrome)
   * ---------------------------------------------------------- */
  (() => {
    const IGNORE_REGEX = /ResizeObserver loop (?:limit exceeded|completed)/i;

    // Intercept global error events
    window.addEventListener('error', (event) => {
      if (event?.message && IGNORE_REGEX.test(event.message)) {
        event.stopImmediatePropagation();
        // ❌ Swallow the error silently
        return;
      }
    }, true);

    // Intercept unhandledrejection messages just in case
    window.addEventListener('unhandledrejection', (event) => {
      const msg = event?.reason?.message || event?.reason;
      if (typeof msg === 'string' && IGNORE_REGEX.test(msg)) {
        event.preventDefault();
      }
    });

    // Patch console.error as additional safety net
    const origError = console.error.bind(console);
    console.error = (...args) => {
      if (args.some(a => typeof a === 'string' && IGNORE_REGEX.test(a))) return;
      origError(...args);
    };
  })();

  /* ------------------------------------------------------------
   * 9. Chat messages container alias for debug tooling
   * ---------------------------------------------------------- */
  (() => {
    const ensureAlias = () => {
      const id = 'chat-messages';
      if (!document.getElementById(id)) {
        const src = document.getElementById('fh-ai-chat__messages') || document.querySelector('.fh-ai-chat__messages');
        if (src) {
          src.id = id;
          console.info('🩹 Added alias id="chat-messages" to chat messages container');
        }
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureAlias, { once: true });
    } else { ensureAlias(); }
  })();

  /* ------------------------------------------------------------
   * 10. Auto-init analysis bubbles & retry initializeFinanceHub
   * ---------------------------------------------------------- */
  (() => {
    const autoInit = (selector, globalKey, ctor) => {
      const run = () => {
        const el = document.getElementById(selector);
        if (el && !window[globalKey] && typeof ctor === 'function') {
          try { window[globalKey] = new ctor(); } catch (err) { console.error(`[AutoInit] ${globalKey} failed`, err); }
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else { run(); }
    };

    // ⛔ DISABLED: Legacy bubble auto-init conflicts with new AnalysisBubbles unified component
    // autoInit('company-overview-bubble', 'companyOverview', window.CompanyOverviewBubble);
    // autoInit('financial-metrics-bubble', 'financialMetrics', window.FinancialMetricsBubble);
    // autoInit('technical-analysis-bubble', 'technicalAnalysis', window.TechnicalAnalysisBubble);

    // Retry app init after polyfills
    if (typeof window.initializeFinanceHub === 'function' && !(window.FinanceHubState?.state?.app?.isInitialized)) {
      setTimeout(() => {
        console.log('🔄 Retrying initializeFinanceHub() after polyfills');
        try { window.initializeFinanceHub(); } catch (reErr) { console.error('Retry initializeFinanceHub failed', reErr); }
      }, 100);
    }
  })();

  /* ------------------------------------------------------------
   * 11. Global unhandled promise rejection handler
   * ---------------------------------------------------------- */
  (() => {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      
      // Suppress known TradingView errors that don't affect functionality
      if (typeof reason === 'string') {
        if (reason.includes('cannot_get_metainfo') || 
            reason.includes('metainfo') ||
            reason.includes('TradingView') ||
            reason.includes('widget')) {
          console.warn('🔇 Suppressed TradingView error:', reason);
          event.preventDefault(); // Prevent the error from being logged
          return;
        }
      }
      
      // Log other unhandled rejections for debugging
      console.error('❌ Unhandled Promise Rejection:', reason);
    });
  })();
})();


/* ============================================================================
 * END OF FILE: patches/financehub_bootstrap_patches.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/api-singleton.js
 * SIZE: 5,563 bytes
 * ============================================================================ */

/**
 * @file api-singleton.js - FinanceHub API Singleton
 * @description Ensures single instance of FinanceHubAPIService across the application
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * API Singleton - Centralized API client management
 * Provides a single instance of the FinanceHub API client
 */

let apiInstance = null;

/**
 * Get or create the API singleton instance
 */
function getAPIInstance() {
    if (apiInstance) {
        return apiInstance;
    }

    console.log('🔄 API Singleton: Creating new API instance...');
    
    try {
        // Try multiple approaches to get the API class
        let APIClass = null;
        
        // Method 1: Direct global reference
        if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService === 'function') {
            APIClass = window.FinanceHubAPIService;
            console.log('✅ API Singleton: Using FinanceHubAPIService class');
        }
        // Method 2: Legacy class name
        else if (window.FinanceHubAPIClass && typeof window.FinanceHubAPIClass === 'function') {
            APIClass = window.FinanceHubAPIClass;
            console.log('✅ API Singleton: Using FinanceHubAPIClass (legacy)');
        }
        // Method 3: Alternative naming
        else if (window.FinanceHubAPI && typeof window.FinanceHubAPI === 'function') {
            APIClass = window.FinanceHubAPI;
            console.log('✅ API Singleton: Using FinanceHubAPI class');
        }
        
        if (!APIClass) {
            throw new Error('No FinanceHub API class found in global scope');
        }
        
        // Create instance with error handling
        apiInstance = new APIClass();
        
        if (!apiInstance) {
            throw new Error('API class constructor returned null/undefined');
            }

        // 🌐 Attach to global for legacy modules
        if (typeof window !== 'undefined') {
            window.FinanceHubAPIService = apiInstance;
// SKIPPED DUPLICATE: window.FinanceHubAPI = apiInstance; // back-compat alias
        }
        
        console.log('✅ API Singleton: API instance created successfully');
        
        // Validate essential methods exist
        const requiredMethods = ['getStock', 'getTickerTape'];
        const missingMethods = requiredMethods.filter(method => typeof apiInstance[method] !== 'function');
        
        if (missingMethods.length > 0) {
            console.warn(`⚠️ API Singleton: Missing methods: ${missingMethods.join(', ')}`);
        }
        
        return apiInstance;

        } catch (error) {
        console.error('❌ API Singleton: Failed to create API instance:', error);
        
        // Create minimal fallback API
        console.log('🔄 API Singleton: Creating fallback API...');
        apiInstance = createFallbackAPI();
        if (typeof window !== 'undefined') {
            window.FinanceHubAPIService = apiInstance;
// SKIPPED DUPLICATE: window.FinanceHubAPI = apiInstance;
        }
        return apiInstance;
        }
    }

    /**
 * Create a minimal fallback API when main API fails
 */
function createFallbackAPI() {
    return {
        getStock: async (symbol) => {
            console.warn('⚠️ Fallback API: getStock called for', symbol);
            throw new Error('API service unavailable - using fallback');
        },
        getTickerTape: async () => {
            console.warn('⚠️ Fallback API: getTickerTape called');
            return [];
        },
        // Add other essential methods as needed
        isReady: () => false,
        isFallback: true
    };
    }

    /**
 * Reset the singleton (useful for testing or reinitialization)
 */
function resetAPIInstance() {
    console.log('🔄 API Singleton: Resetting instance...');
    apiInstance = null;
}

// Export the singleton getter
window.getAPIInstance = getAPIInstance;
window.resetAPIInstance = resetAPIInstance;

// Also export for ES modules
// REMOVED EXPORT: export { getAPIInstance, resetAPIInstance };

console.log('✅ API Singleton: Module loaded successfully');

// Auto-initialize when FinanceHubAPIService is available
if (typeof window !== 'undefined') {
    // Try to initialize immediately if FinanceHubAPIService is already available
    if (typeof window.FinanceHubAPIService !== 'undefined') {
        try {
            const apiInstance = getAPIInstance();
// SKIPPED DUPLICATE: window.FinanceHubAPI = apiInstance; // Export the actual API service
            console.log('✅ FinanceHub API auto-initialized and exported to window.FinanceHubAPI');
        } catch (error) {
            console.warn('⚠️ Failed to auto-initialize FinanceHub API:', error);
        }
    } else {
        // Wait for FinanceHubAPIService to be available
        const checkForAPIService = () => {
            if (typeof window.FinanceHubAPIService !== 'undefined') {
                try {
                    const apiInstance = getAPIInstance();
// SKIPPED DUPLICATE: window.FinanceHubAPI = apiInstance; // Export the actual API service
                    console.log('✅ FinanceHub API auto-initialized and exported to window.FinanceHubAPI');
                } catch (error) {
                    console.warn('⚠️ Failed to auto-initialize FinanceHub API:', error);
                }
            } else {
                // Keep checking every 100ms for up to 5 seconds
                setTimeout(checkForAPIService, 100);
            }
        };
        setTimeout(checkForAPIService, 100);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAPIInstance, resetAPIInstance };
} 

/* ============================================================================
 * END OF FILE: core/api-singleton.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/stream-hub.js
 * SIZE: 8,547 bytes
 * ============================================================================ */

/**
 * @file stream-hub.js - FinanceHub Stream Management Singleton
 * @description Centralized streaming service for chat, real-time data, and SSE connections
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * StreamHub Singleton - Centralized streaming management
 * Handles chat streaming, real-time data feeds, and SSE connections
 */

let streamHubInstance = null;

class StreamHub {
    constructor() {
        if (streamHubInstance) {
            return streamHubInstance;
        }

        this.activeStreams = new Map();
        this.eventListeners = new Map();
        this.config = {
            baseURL: 'http://localhost:8084',
            reconnectAttempts: 3,
            reconnectDelay: 1000,
            heartbeatInterval: 30000
        };
        
        console.log('✅ StreamHub: Singleton instance created');
        streamHubInstance = this;
        return this;
    }

    /**
     * Start chat streaming for a specific ticker
     * @param {string} ticker - Stock ticker symbol
     * @param {string} message - User message
     * @param {Function} onMessage - Callback for streaming messages
     * @param {Function} onError - Error callback
     * @param {Function} onComplete - Completion callback
     */
    async startChatStream(ticker, message, onMessage, onError, onComplete) {
        const streamId = `chat-${ticker}-${Date.now()}`;
        
        try {
            console.log(`🔄 StreamHub: Starting chat stream for ${ticker}`);
            
            const response = await fetch(`${this.config.baseURL}/api/v1/stock/${ticker}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    message: message,
                    stream: true,
                    ticker: ticker
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            this.activeStreams.set(streamId, {
                reader,
                ticker,
                startTime: Date.now(),
                status: 'active'
            });

            // Process streaming data
            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log(`✅ StreamHub: Chat stream completed for ${ticker}`);
                            this.activeStreams.delete(streamId);
                            if (onComplete) onComplete();
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (onMessage) onMessage(data);
                                } catch (parseError) {
                                    // Handle plain text streaming
                                    const text = line.slice(6);
                                    if (text.trim() && onMessage) {
                                        onMessage({ content: text, type: 'text' });
                                    }
                                }
                            }
                        }
                    }
                } catch (streamError) {
                    console.error(`❌ StreamHub: Stream error for ${ticker}:`, streamError);
                    this.activeStreams.delete(streamId);
                    if (onError) onError(streamError);
                }
            };

            processStream();
            return streamId;

        } catch (error) {
            console.error(`❌ StreamHub: Failed to start chat stream for ${ticker}:`, error);
            if (onError) onError(error);
            return null;
        }
    }

    /**
     * Stop a specific stream
     * @param {string} streamId - Stream identifier
     */
    stopStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (stream && stream.reader) {
            try {
                stream.reader.cancel();
                this.activeStreams.delete(streamId);
                console.log(`✅ StreamHub: Stream ${streamId} stopped`);
            } catch (error) {
                console.error(`❌ StreamHub: Error stopping stream ${streamId}:`, error);
            }
        }
    }

    /**
     * Stop all active streams
     */
    stopAllStreams() {
        console.log(`🔄 StreamHub: Stopping ${this.activeStreams.size} active streams`);
        
        for (const [streamId, stream] of this.activeStreams) {
            if (stream.reader) {
                try {
                    stream.reader.cancel();
                } catch (error) {
                    console.error(`❌ StreamHub: Error stopping stream ${streamId}:`, error);
                }
            }
        }
        
        this.activeStreams.clear();
        console.log('✅ StreamHub: All streams stopped');
    }

    /**
     * Get active stream information
     */
    getActiveStreams() {
        return Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
            id,
            ticker: stream.ticker,
            status: stream.status,
            duration: Date.now() - stream.startTime
        }));
    }

    /**
     * Add event listener for stream events
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ StreamHub: Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('✅ StreamHub: Configuration updated', this.config);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            activeStreams: this.activeStreams.size,
            config: this.config,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }
}

/**
 * Get or create the StreamHub singleton instance
 */
function getStreamHub() {
    if (!streamHubInstance) {
        new StreamHub();
    }
    return streamHubInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
function resetStreamHub() {
    if (streamHubInstance) {
        streamHubInstance.stopAllStreams();
        streamHubInstance = null;
    }
    console.log('🔄 StreamHub: Instance reset');
}

// Global exports
if (typeof window !== 'undefined') {
    window.getStreamHub = getStreamHub;
    window.resetStreamHub = resetStreamHub;
    window.StreamHub = StreamHub;
}

// ES module exports
// REMOVED EXPORT: export { getStreamHub, resetStreamHub, StreamHub };

// CommonJS exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreamHub, resetStreamHub, StreamHub };
}

console.log('✅ StreamHub: Module loaded successfully'); 
 
 

/* ============================================================================
 * END OF FILE: core/stream-hub.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/app-initializer.js
 * SIZE: 18,578 bytes
 * ============================================================================ */

/**
 * @file app-initializer.js - Core FinanceHub Application Initializer
 * @description Handles app startup, configuration, and core service initialization
 * @version 3.1.0
 * @author AEVOREX FinanceHub Team
 */

/**
 * Core Application Initializer Class
 * Responsible for starting the app and initializing core services
 */
class AppInitializer {
    constructor() {
        console.log('🚀 AppInitializer: Starting core initialization...');
        
        // Version information
        this.VERSION = '3.1.0';
        
        // Configuration object
        this.config = {
            debug: true,
            theme: 'dark',
            defaultSymbol: 'AAPL',
            apiBaseUrl: '/api/v1',
            chartHeight: 600,
            enableAnimations: true,
            autoRefresh: true,
            refreshInterval: 30000
        };

        // Performance tracking
        this.performance = {
            startTime: performance.now(),
            componentTimes: new Map(),
            failedComponents: new Set()
        };

        console.log('✅ AppInitializer: Core initialization complete');
    }

    /**
     * Initialize the application asynchronously
     */
    async initializeApp() {
        try {
            console.log('⏳ AppInitializer: Waiting for services to be ready...');
            await this.waitForServices();
            console.log('✅ AppInitializer: Services ready, initializing app...');
            await this.init();
        } catch (error) {
            console.error('❌ AppInitializer: Failed to initialize FinanceHub:', error);
            this.handleError(error, 'app_initialization');
            this.showErrorState(error);
        }
    }
    
    /**
     * Wait for all core services to be ready before initialization
     */
    waitForServices() {
        console.log('AppInitializer: ES modules handle loading order, skipping legacy waitForServices.');
        return Promise.resolve();
    }
    
    /**
     * Initialize the application with proper dependency loading
     */
    async init() {
        try {
            console.log('🚀 [AppInitializer] Step 1: Starting initialization...');
            
            // Setup global error handling first
            this.setupGlobalErrorHandling();
            console.log('✅ [AppInitializer] Step 1.5: Global error handling setup');
            
            // Initialize core services first
            await this.initializeCoreServices();
            console.log('✅ [AppInitializer] Step 2: Core services initialized');
            
            // Setup error handling
            this.setupErrorHandling();
            console.log('✅ [AppInitializer] Step 3: Error handling setup complete');
            
            // Setup state subscriptions
            this.setupStateSubscriptions();
            console.log('✅ [AppInitializer] Step 4: State subscriptions setup complete');
            
            // Initialize component loader
            if (window.ComponentLoader) {
                await window.ComponentLoader.initialize();
                console.log('✅ [AppInitializer] Step 5: ComponentLoader initialized');
            }
            
            // Initialize event manager
            if (window.EventManager) {
                await window.EventManager.initialize();
                console.log('✅ [AppInitializer] Step 6: EventManager initialized');
            }
            
            // Show the application
            console.log('🎯 [AppInitializer] Step 7: Showing application...');
            this.showApplication();
            console.log('✅ [AppInitializer] Step 7: Application visible');
            
            // Complete initialization
            const initTime = performance.now() - this.performance.startTime;
            
            if (window.FinanceHubState) {
                window.FinanceHubState.dispatch({
                    type: 'APP_INIT_COMPLETE',
                    payload: { 
                        initTime,
                        version: this.VERSION
                    }
                });
            }
            
            console.log(`✅ FinanceHub v${this.VERSION} initialized in ${initTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ [AppInitializer] Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Initialize core services
     */
    async initializeCoreServices() {
        console.log('🔧 AppInitializer: Initializing core services...');
        
        // Validate required services are available
        const requiredServices = ['FinanceHubAPIService', 'FinanceHubState'];
        const missingServices = requiredServices.filter(service => !window[service]);
        
        if (missingServices.length > 0) {
            throw new Error(`Missing required services: ${missingServices.join(', ')}`);
        }
        
        // Initialize API service
        if (window.FinanceHubAPIService && !window.FinanceHubAPIService.initialized) {
            await window.FinanceHubAPIService.init();
            console.log('✅ AppInitializer: API service initialized');
        }
        
        // Initialize state manager
        if (window.FinanceHubState && !window.FinanceHubState.initialized) {
            window.FinanceHubState.init();
            console.log('✅ AppInitializer: State manager initialized');
        }
        
        // Initialize theme manager
        if (window.themeManager) {
            // Instance available
            if (!window.themeManager.state?.isInitialized) {
                await window.themeManager.init();
                console.log('✅ AppInitializer: Theme manager initialized (instance)');
            } else {
                console.log('ℹ️ AppInitializer: Theme manager already initialized (instance)');
            }
        } else if (window.ThemeManager) {
            // Class available but no instance – create one
            console.warn('⚠️ AppInitializer: themeManager instance missing – creating new instance');
            try {
                window.themeManager = new window.ThemeManager();
                await window.themeManager.init();
                console.log('✅ AppInitializer: Theme manager initialized (new instance)');
            } catch (tmErr) {
                console.error('❌ AppInitializer: Failed to create/init ThemeManager instance:', tmErr);
            }
        } else {
            console.warn('⚠️ AppInitializer: ThemeManager not found on window object');
        }
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        console.log('🛡️ AppInitializer: Setting up error handling...');
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'global_error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled_promise', {
                promise: event.promise
            });
        });
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        console.log('🔗 AppInitializer: Setting up state subscriptions...');
        
        if (window.FinanceHubState) {
            // Subscribe to theme changes
            window.FinanceHubState.subscribe('theme', (theme) => {
                this.applyTheme(theme);
            });
            
            // Subscribe to loading states
            window.FinanceHubState.subscribe('loading', (isLoading) => {
                this.updateLoadingState(isLoading);
            });
        }
    }

    /**
     * Show the application
     */
    showApplication() {
        console.log('🎯 AppInitializer: Showing application...');
        
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app-container');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000);
        }
        
        if (appContainer) {
            setTimeout(() => {
                appContainer.style.opacity = '1';
                appContainer.classList.add('app-loaded');
            }, 1200);
        }
    }

    /**
     * Apply theme to the application
     */
    applyTheme(theme) {
        console.log(`🎨 AppInitializer: Applying theme: ${theme}`);
        
        // Use theme manager if available
        if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
            window.themeManager.setTheme(theme);
            console.log(`✅ AppInitializer: Theme applied via themeManager: ${theme}`);
        } else {
            // Fallback to manual application
            const root = document.documentElement;
            
            // Remove existing theme classes
            root.classList.remove('light-theme', 'dark-theme');
            
            // Add new theme class
            root.classList.add(`${theme}-theme`);
            
            // Set data attribute for CSS targeting
            root.setAttribute('data-theme', theme);
            
            // Update meta theme-color for mobile browsers
            const themeMetaTag = document.getElementById('theme-color-meta');
            if (themeMetaTag) {
                themeMetaTag.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
            }
            
            console.log(`✅ AppInitializer: Theme applied manually: ${theme}`);
        }
    }

    /**
     * Update loading state
     */
    updateLoadingState(isLoading) {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Handle errors
     */
    handleError(error, context, metadata = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            context,
            metadata,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error(`❌ [AppInitializer] Error in ${context}:`, errorInfo);
        
        // Store error for debugging
        if (!window.financeHubErrors) {
            window.financeHubErrors = [];
        }
        window.financeHubErrors.push(errorInfo);
        
        // Keep only last 20 errors
        if (window.financeHubErrors.length > 20) {
            window.financeHubErrors = window.financeHubErrors.slice(-20);
        }
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        const errorOverlay = document.getElementById('error-overlay');
        const errorMessage = document.getElementById('error-message');
        
        if (errorOverlay && errorMessage) {
            errorMessage.textContent = `Initialization failed: ${error.message}`;
            errorOverlay.style.display = 'flex';
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performance,
            totalTime: performance.now() - this.performance.startTime
        };
    }

    /**
     * Setup global error handling and overlay
     */
    setupGlobalErrorHandling() {
        // Global error overlay for debugging
        const errorOverlay = document.createElement('div');
        errorOverlay.id = 'financehub-error-overlay';
        errorOverlay.className = 'fh-error-overlay hidden';
        errorOverlay.innerHTML = `
            <div class="fh-error-overlay__content">
                <div class="fh-error-overlay__header">
                    <h3>🚨 FinanceHub Debug Error</h3>
                    <button class="fh-error-overlay__close" onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')">×</button>
                </div>
                <div class="fh-error-overlay__body">
                    <div id="fh-error-list"></div>
                </div>
                <div class="fh-error-overlay__footer">
                    <button onclick="window.location.reload()" class="fh-error-overlay__reload">Reload Page</button>
                    <button onclick="console.clear(); document.getElementById('fh-error-list').innerHTML = ''" class="fh-error-overlay__clear">Clear Errors</button>
                </div>
            </div>
        `;
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .fh-error-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .fh-error-overlay.hidden {
                display: none;
            }
            .fh-error-overlay__content {
                background: #1a1a1a;
                border: 2px solid #ff4444;
                border-radius: 8px;
                max-width: 80%;
                max-height: 80%;
                overflow: auto;
                color: white;
            }
            .fh-error-overlay__header {
                padding: 16px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .fh-error-overlay__close {
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
            }
            .fh-error-overlay__body {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }
            .fh-error-overlay__footer {
                padding: 16px;
                border-top: 1px solid #333;
                display: flex;
                gap: 8px;
            }
            .fh-error-overlay__reload, .fh-error-overlay__clear {
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
            }
            .fh-error-item {
                background: #2a2a2a;
                border-left: 4px solid #ff4444;
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 4px;
            }
            .fh-error-item__component {
                color: #ffaa00;
                font-weight: bold;
            }
            .fh-error-item__message {
                color: #ff6666;
                margin: 4px 0;
            }
            .fh-error-item__time {
                color: #888;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(errorOverlay);
        
        // Listen for financehub-error events
        window.addEventListener('financehub-error', (event) => {
            const { component, error, ...details } = event.detail;
            const timestamp = new Date().toLocaleTimeString();
            
            console.error(`🚨 FinanceHub Error [${component}]:`, error, details);
            
            // Show in overlay if debug mode or URL contains debug=true
            const isDebugMode = window.location.search.includes('debug=true') || 
                               localStorage.getItem('financehub_debug') === 'true';
            
            if (isDebugMode) {
                const errorList = document.getElementById('fh-error-list');
                const errorItem = document.createElement('div');
                errorItem.className = 'fh-error-item';
                errorItem.innerHTML = `
                    <div class="fh-error-item__component">${component}</div>
                    <div class="fh-error-item__message">${error}</div>
                    <div class="fh-error-item__time">${timestamp}</div>
                    ${Object.keys(details).length > 0 ? `<pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
                `;
                
                errorList.appendChild(errorItem);
                errorOverlay.classList.remove('hidden');
                
                // Auto-hide after 10 seconds unless there are multiple errors
                if (errorList.children.length === 1) {
                    setTimeout(() => {
                        if (errorList.children.length === 1) {
                            errorOverlay.classList.add('hidden');
                        }
                    }, 10000);
                }
            }
        });
        
        console.log('✅ Global error handling setup complete');
    }
}

// Export to global scope
window.AppInitializer = AppInitializer;

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.financeHubInitializer = new AppInitializer();
    });
} else {
    window.financeHubInitializer = new AppInitializer();
}

console.log('✅ AppInitializer module loaded successfully');

// Provide legacy global initializer expected by financehub.html
if (typeof window !== 'undefined') {
    window.initializeFinanceHub = function() {
        try {
            if (!window.financeHubInitializer) {
                window.financeHubInitializer = new AppInitializer();
            }
            if (typeof window.financeHubInitializer.initializeApp === 'function') {
                window.financeHubInitializer.initializeApp();
            } else {
                console.error('FinanceHubInitializer instance missing initializeApp()');
            }
        } catch(err) {
            console.error('initializeFinanceHub failed', err);
        }
    };
} 

/* ============================================================================
 * END OF FILE: core/app-initializer.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/component-loader.js
 * SIZE: 27,487 bytes
 * ============================================================================ */

/**
 * @file component-loader.js - FinanceHub Component Loader
 * @description Handles loading and initialization of all UI components
 * @version 3.1.0
 * @author AEVOREX FinanceHub Team
 */

// Initialise lightweight global registry for singleton instances (no new file)
if (typeof window !== 'undefined' && !window.FH_REG) {
    window.FH_REG = {};
}

/**
 * Component Loader Class
 * Responsible for loading and initializing all UI components in the correct order – now with singleton guard.
 */
class ComponentLoader {
    constructor() {
        console.log('🚀 ComponentLoader: Initializing...');
        
        // Component registry (Map for flexible get/set)
        this.components = new Map();

        // Define loading order - critical components first
        this.componentLoadOrder = [
            'ticker-tape',
            'analysis-bubbles', 
            'chart-widget',
            'chat-interface',
            'theme-manager'
        ];

        // Performance tracking
        this.performance = {
            componentTimes: new Map(),
            failedComponents: new Set()
        };

        // Auto-refresh settings
        this.autoRefreshEnabled = true;
        this.refreshIntervals = { ticker: 30000 };

        // AI Summary trigger config
        this.autoAISummary = {
            enabled: true,
            triggerSources: ['ticker-click', 'search', 'keyboard-shortcut'],
            delay: 1200 // ms
        };

        console.log('✅ ComponentLoader: Initialization complete');
    }

    /**
     * Initialize all components
     */
    async initialize() {
        try {
            console.log('🔄 ComponentLoader: Starting component loading...');
            await this.loadComponents();
            console.log('✅ ComponentLoader: All components loaded successfully');
        } catch (error) {
            console.error('❌ ComponentLoader: Failed to load components:', error);
            throw error;
        }
    }

    /**
     * Load and initialize components sequentially in the predefined order.
     * The previous implementation loaded components in parallel which caused
     * race-conditions (e.g. Chart widget tried to instantiate before the
     * TradingView library or UnifiedChartManager class were ready). A
     * sequential strategy is slightly slower on first paint but removes all
     * hard-to-debug timing issues and matches the behaviour of the former
     * monolith bundle where the chart rendered correctly.
     */
    async loadComponents() {
        console.log('🔄 ComponentLoader: Loading components SEQUENTIALLY →', this.componentLoadOrder);

        // Helper map to call the appropriate loader
        const loaders = {
            'ticker-tape': this.loadTickerTape.bind(this),
            'analysis-bubbles': this.loadAnalysisBubbles.bind(this),
            'chart-widget': this.loadChartWidget.bind(this),
            'chat-interface': this.loadChatInterface.bind(this),
            'theme-manager': this.loadThemeManager.bind(this)
        };

        for (const componentName of this.componentLoadOrder) {
            const loaderFn = loaders[componentName];
            if (typeof loaderFn !== 'function') {
                console.warn(`⚠️ ComponentLoader: No loader function mapped for '${componentName}' – skipping`);
                continue;
            }

            const start = performance.now();
            try {
                await loaderFn();
                console.log(`✅ ComponentLoader: ${componentName} loaded successfully`);
            } catch (err) {
                console.error(`❌ ComponentLoader: ${componentName} failed to load:`, err);
                this.performance.failedComponents.add(componentName);
            } finally {
                const duration = performance.now() - start;
                this.performance.componentTimes.set(componentName, duration);
                console.log(`⏱️ ComponentLoader: ${componentName} load time: ${duration.toFixed(2)}ms`);
            }
        }
    }

    /**
     * Load Chart Widget Component
     */
    async loadChartWidget() {
        const startTime = performance.now();
        
        try {
            // ─── Singleton guard ─────────────────────────────────────────────
            if (window.FH_REG.chart) {
                console.log('ℹ️ ComponentLoader: Re-using existing UnifiedChartManager instance');
                this.components.set('chart-widget', window.FH_REG.chart);
                return;
            }

            console.log('🔄 ComponentLoader: Loading Chart Widget...');
            
            // Determine container ID variants; if none found, create a default one (useful for test pages)
            let chartContainer = document.getElementById('tradingview-widget') ||
                                 document.getElementById('tradingview-chart') ||
                                 document.getElementById('tradingview_chart');

            if (!chartContainer) {
                console.info('ℹ️ ComponentLoader: Chart container not found – dynamically creating placeholder');

                chartContainer = document.createElement('div');
                chartContainer.id = 'tradingview-chart';
                chartContainer.className = 'fh-chart-widget auto-injected';

                // Append after ticker-tape if exists, else into main content / body
                const referenceNode = document.getElementById('ticker-tape-container');
                if (referenceNode && referenceNode.parentNode) {
                    referenceNode.parentNode.insertBefore(chartContainer, referenceNode.nextSibling);
                } else {
                    (document.getElementById('fh-main-content') || document.getElementById('app') || document.body)
                        .appendChild(chartContainer);
                }
            }

            // Ensure we have a valid id attribute for later look-ups and alias legacy underscore id
            if (!chartContainer.id) {
                chartContainer.id = 'tradingview-chart';
            } else if (chartContainer.id === 'tradingview_chart') {
                // Align with TradingView default expectations (dash variant)
                console.info('🩹 ComponentLoader: Aliasing chart container id tradingview_chart → tradingview-chart');
                chartContainer.id = 'tradingview-chart';
            }

            // 🚀 Ensure TradingView library is loaded BEFORE we instantiate managers
            if (!window.TradingView || !window.TradingView.widget) {
                await this.injectTradingViewScript();
                await this.waitForScript(() => window.TradingView && window.TradingView.widget, 20000);
            }

            // 🔄 At this point TradingView should be present – continue with manager detection
            
            // Prefer new UnifiedChartManager if present
            const ChartClass = window.UnifiedChartManager || window.ChartManager;
            if (!ChartClass) {
                console.warn('⚠️ ComponentLoader: No Chart manager class available (UnifiedChartManager / ChartManager)');
                this.showChartFallback('Chart component not loaded');
                return;
            }

            // Instantiate manager (UnifiedChartManager requires options)
            let chartInstance;
            if (window.UnifiedChartManager && ChartClass === window.UnifiedChartManager) {
                chartInstance = new window.UnifiedChartManager({
                    containerId: chartContainer.id || 'tradingview-chart',
                    symbol: (window.FinanceHubState?.state?.stock?.symbol) || 'AAPL'
                });
            } else if (ChartClass === window.ChartManager) {
                // Legacy ChartManager supports static init(chartContainer)
                await window.ChartManager.init(chartContainer);
                chartInstance = window.ChartManager;
            }

            if (chartInstance) {
                this.components.set('chart-widget', chartInstance);
                window.FH_REG.chart = chartInstance; // cache singleton
                console.log('✅ ComponentLoader: Chart Widget initialized successfully');
            } else {
                throw new Error('Failed to initialize chart widget');
            }
            
        } catch (error) {
            console.error('❌ ComponentLoader: Chart Widget loading failed:', error);
            this.showChartFallback(error.message);
            throw error;
        } finally {
            const loadTime = performance.now() - startTime;
            this.performance.componentTimes.set('chart-widget', loadTime);
            console.log(`⏱️ ComponentLoader: Chart Widget load time: ${loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Wait for a condition to be true with timeout
     */
    waitForScript(condition, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const checkCondition = () => {
                if (condition()) {
                    resolve();
                } else if (timeout <= 0) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    timeout -= 100;
                    setTimeout(checkCondition, 100);
                }
            };
            checkCondition();
        });
    }

    /**
     * Dynamically inject TradingView CDN script if it does not yet exist
     */
    injectTradingViewScript() {
        return new Promise((resolve, reject) => {
            // If already loading elsewhere, just wait for it
            if (document.getElementById('tv-cdn-script')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'tv-cdn-script';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = () => {
                console.log('✅ TradingView library injected');
                resolve();
            };
            script.onerror = (err) => {
                console.error('❌ Failed to load TradingView CDN script', err);
                reject(new Error('TradingView script load error'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Show chart fallback when loading fails
     */
    showChartFallback(message) {
        const chartContainer = document.getElementById('tradingview-chart') || document.getElementById('tradingview_chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="chart-fallback">
                    <div class="fallback-icon">📊</div>
                    <div class="fallback-title">Chart Unavailable</div>
                    <div class="fallback-message">${message}</div>
                    <button class="fallback-retry" onclick="window.ComponentLoader?.loadChartWidget()">
                        Retry Loading
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load Analysis Bubbles Component
     */
    async loadAnalysisBubbles() {
        const startTime = performance.now();
        
        try {
            // Inform listeners that loading has started (debug)
            window.dispatchEvent(new CustomEvent('financehub-loading', {
                detail: { component: 'component-loader-bubbles' }
            }));

            if (window.FH_REG.bubbles) {
                console.log('ℹ️ ComponentLoader: Re-using existing AnalysisBubbles instance');
                this.components.set('analysis-bubbles', window.FH_REG.bubbles);
                return;
            }

            console.log('🔄 ComponentLoader: Loading Analysis Bubbles...');
            
            if (!window.AnalysisBubbles) {
                console.debug('ℹ️ ComponentLoader: AnalysisBubbles class not yet loaded – attempting dynamic import');
                try {
                    // Dynamically import the module – path is relative to this script
                    const mod = await import('/static/js/components/analysis-bubbles/analysis-bubbles.js');
                    window.AnalysisBubbles = mod.AnalysisBubbles || mod.default || window.AnalysisBubbles;
                } catch(importErr){
                    console.error('❌ ComponentLoader: Dynamic import of AnalysisBubbles failed', importErr);
                }
            }
            if (!window.AnalysisBubbles) {
                console.error('❌ ComponentLoader: AnalysisBubbles still undefined after dynamic import');
                return;
            }
            
            const container = document.getElementById('fh-analysis-bubbles');
            if (container) {
                // Ensure we have an API client instance
                let apiClient = window.FinanceHubAPIService;
                // FinanceHubAPIService might already be an INSTANCE (exported by api.js)
                // But legacy code may expect to construct it. Handle both cases gracefully.
                if (!apiClient) {
                    // Prefer preserved class reference if available
                    const ServiceClass = window.FinanceHubAPIClass || (typeof window.FinanceHubAPIService === 'function' ? window.FinanceHubAPIService : null);

                    if (ServiceClass && typeof ServiceClass === 'function') {
                        apiClient = new ServiceClass();
                        // Expose back to global scope for reuse
                        window.FinanceHubAPIService = apiClient;
                    } else if (ServiceClass && typeof ServiceClass === 'object') {
                        // Already an instance – just use it
                        apiClient = ServiceClass;
                    } else {
                        console.warn('⚠️ ComponentLoader: FinanceHubAPIService class not available – AnalysisBubbles will use direct fetch');
                    }
                }
            
                const analysisBubbles = new window.AnalysisBubbles({
                    containerId: 'fh-analysis-bubbles',
                    apiClient: apiClient,
                    symbol: (window.FinanceHubState?.state?.stock?.symbol) || 'AAPL'
                });
                await analysisBubbles.init?.();
                this.components.set('analysis-bubbles', analysisBubbles);
                window.FH_REG.bubbles = analysisBubbles;
                console.log('✅ ComponentLoader: Analysis Bubbles initialized successfully');
            } else {
                throw new Error('Analysis bubbles container not found');
            }
            
        } catch (error) {
            console.error('❌ ComponentLoader: Analysis Bubbles loading failed:', error);
            
            // Inform listeners that loading has started (debug)
            window.dispatchEvent(new CustomEvent('financehub-loading', {
                detail: { component: 'component-loader-bubbles' }
            }));
            
            throw error;
        } finally {
            const loadTime = performance.now() - startTime;
            this.performance.componentTimes.set('analysis-bubbles', loadTime);
            console.log(`⏱️ ComponentLoader: Analysis Bubbles load time: ${loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Load Ticker Tape Component
     */
    async loadTickerTape() {
        const startTime = performance.now();
        
        try {
            // Inform listeners that loading has started (debug)
            window.dispatchEvent(new CustomEvent('financehub-loading', {
                detail: { component: 'component-loader-ticker' }
            }));

            if (window.FH_REG.ticker) {
                console.log('ℹ️ ComponentLoader: Re-using existing TickerTapeUnified instance');
                this.components.set('ticker-tape', window.FH_REG.ticker);
                return;
            }

            console.log('🔄 ComponentLoader: Loading Ticker Tape...');
            
            let container = document.getElementById('ticker-tape-container');

            // If container is completely missing (e.g. on test pages) create a lightweight placeholder at the top of main content
            if (!container) {
                console.info('ℹ️ ComponentLoader: Ticker tape container not found – dynamically creating placeholder');

                container = document.createElement('div');
                container.id = 'ticker-tape-container';
                container.className = 'fh-ticker-tape auto-injected';

                // Prefer to inject into an #app root or main content wrapper if present, else into <body>
                const hostParent = document.getElementById('fh-main-content') ||
                                   document.getElementById('app') ||
                                   document.body;
                hostParent.prepend(container);
            }

            // Guarantee the element has the expected id so that the TickerTapeUnified.init() lookup succeeds
            if (!container.id) {
                container.id = 'ticker-tape-container';
            }
            
            if (!window.TickerTapeUnified) {
                console.warn('⚠️ ComponentLoader: TickerTapeUnified class not found');
                this.showTickerTapeFallback('Ticker tape component not loaded');
                return;
            }

            // Ensure API client is available - use FinanceHubAPIService instead of FinanceHubAPI
            let apiClient = window.FinanceHubAPIService;
            if (!apiClient && window.FinanceHubAPI) {
                apiClient = window.FinanceHubAPI;
            }
            
            if (!apiClient) {
                console.warn('⚠️ ComponentLoader: No API client available for ticker tape (FinanceHubAPIService or FinanceHubAPI)');
                this.showTickerTapeFallback('API client not available');
                return;
            }
            
            // Pass container ID string + API client (simpler for inner init)
            const tickerTape = new window.TickerTapeUnified('ticker-tape-container', {
                apiClient: apiClient
            });
            await tickerTape.init?.();
            this.components.set('ticker-tape', tickerTape);
            window.FH_REG.ticker = tickerTape;
            console.log('✅ ComponentLoader: Ticker Tape initialized successfully');
            
        } catch (error) {
            console.error('❌ ComponentLoader: Ticker Tape loading failed:', error);
            this.showTickerTapeFallback(error.message);
            
            // Inform listeners that loading has started (debug)
            window.dispatchEvent(new CustomEvent('financehub-loading', {
                detail: { component: 'component-loader-ticker' }
            }));
            
            throw error;
        } finally {
            const loadTime = performance.now() - startTime;
            this.performance.componentTimes.set('ticker-tape', loadTime);
            console.log(`⏱️ ComponentLoader: Ticker Tape load time: ${loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Show ticker tape fallback when loading fails
     */
    showTickerTapeFallback(message) {
        const container = document.getElementById('ticker-tape-container');
        if (container) {
            container.innerHTML = `
                <div class="ticker-fallback">
                    <div class="fallback-message">Market data temporarily unavailable: ${message}</div>
                    <button class="fallback-retry" onclick="window.ComponentLoader?.loadTickerTape()">
                        Retry Loading
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load Chat Interface Component
     */
    async loadChatInterface() {
        const startTime = performance.now();
        
        try {
            // Inform listeners that loading has started (debug)
            window.dispatchEvent(new CustomEvent('financehub-loading', {
                detail: { component: 'component-loader-chat' }
            }));

            if (window.FH_REG.chat) {
                console.log('ℹ️ ComponentLoader: Re-using existing FinanceHubChat instance');
                this.components.set('chat-interface', window.FH_REG.chat);
                return;
            }

            console.log('🔄 ComponentLoader: Loading Chat Interface...');
            
            if (!window.FinanceHubChat) {
                console.debug('ℹ️ ComponentLoader: FinanceHubChat class not yet loaded – attempting dynamic import');
                try {
                    const mod = await import('/static/js/components/chat/chat.js');
                    window.FinanceHubChat = mod.FinanceHubChat || mod.default || window.FinanceHubChat;
                } catch(importErr){
                    console.error('❌ ComponentLoader: Dynamic import of FinanceHubChat failed', importErr);
                }
            }
            if (!window.FinanceHubChat) {
                console.warn('⚠️ ComponentLoader: FinanceHubChat class still undefined after dynamic import');
                this.createFallbackChatInterface('Chat component not loaded');
                return;
            }
            
            // Dynamically determine which chat container exists for legacy compatibility
            let containerId = null;
            if (document.getElementById('fh-chat')) {
                containerId = 'fh-chat';
            } else if (document.getElementById('chat-container')) {
                containerId = 'chat-container';
            }
            
            if (!containerId) {
                throw new Error('Chat container element not found (expected #fh-chat or #chat-container)');
            }
            
            const chatInterface = new window.FinanceHubChat({
                containerId,
                symbol: (window.FinanceHubState?.state?.stock?.symbol) || 'AAPL'
            });
            // ensure chat initialized (constructor may auto-init)
            if (!chatInterface.isInitialized && typeof chatInterface.init === 'function') {
                await chatInterface.init();
            }
            this.components.set('chat-interface', chatInterface);
            window.FH_REG.chat = chatInterface;
            console.log('✅ ComponentLoader: Chat Interface initialized successfully');
            
        } catch (error) {
            console.error('❌ ComponentLoader: Chat Interface loading failed:', error);
            this.createFallbackChatInterface(error.message);
            throw error;
        } finally {
            const loadTime = performance.now() - startTime;
            this.performance.componentTimes.set('chat-interface', loadTime);
            console.log(`⏱️ ComponentLoader: Chat Interface load time: ${loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Create fallback chat interface when loading fails
     */
    createFallbackChatInterface(errorMessage = 'Chat component failed to load') {
        // Premium UX: do NOT overwrite existing chat container; show unobtrusive inline notice
        console.warn('⚠️ ComponentLoader: Chat fallback invoked – minimal notice only, no emoji');
        const chatContainer = document.getElementById('fh-chat');
        if (!chatContainer) {
            console.error('❌ No #fh-chat container found – cannot display chat.');
            return;
        }
        // If chat container already has content (likely partial UI), keep it – just append notice at top
        const noticeId = 'fh-chat-fallback-notice';
        if (document.getElementById(noticeId)) return; // prevent duplicates

        const notice = document.createElement('div');
        notice.id = noticeId;
        notice.className = 'fh-chat__error-banner';
        notice.innerHTML = `
            <div class="fh-chat__error-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    <path d="M12 11V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="8" r="1" fill="currentColor"/>
                </svg>
            </div>
            <span class="fh-chat__error-text">${errorMessage}</span>
        `;
        chatContainer.prepend(notice);
    }

    /**
     * Load Theme Manager Component
     */
    async loadThemeManager() {
        const startTime = performance.now();
        
        try {
            console.log('🔄 ComponentLoader: Loading Theme Manager...');
            
            if (window.themeManager) {
                // Instance available
                if (!window.themeManager.state?.isInitialized) {
                    await window.themeManager.init();
                    console.log('✅ ComponentLoader: Theme Manager initialized (instance)');
                } else {
                    console.log('ℹ️ ComponentLoader: Theme Manager already initialized (instance)');
                }
                this.components.set('theme-manager', window.themeManager);
            } else if (window.ThemeManager) {
                // Class available, but no instance – create one
                console.warn('⚠️ ComponentLoader: themeManager instance missing – creating new instance');
                try {
                    window.themeManager = new window.ThemeManager();
                    await window.themeManager.init();
                    this.components.set('theme-manager', window.themeManager);
                    console.log('✅ ComponentLoader: Theme Manager initialized (new instance)');
                } catch (tmErr) {
                    console.error('❌ ComponentLoader: Failed to create/init ThemeManager instance:', tmErr);
                }
            } else {
                console.warn('⚠️ ComponentLoader: ThemeManager not available');
            }
            
        } catch (error) {
            console.error('❌ ComponentLoader: Theme Manager loading failed:', error);
            throw error;
        } finally {
            const loadTime = performance.now() - startTime;
            this.performance.componentTimes.set('theme-manager', loadTime);
            console.log(`⏱️ ComponentLoader: Theme Manager load time: ${loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Get loaded component by name
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Check if component is loaded
     */
    isComponentLoaded(name) {
        return this.components.has(name);
    }

    /**
     * Get all loaded components
     */
    getAllComponents() {
        return Array.from(this.components.keys());
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            componentTimes: Object.fromEntries(this.performance.componentTimes),
            failedComponents: Array.from(this.performance.failedComponents),
            totalComponents: this.components.size,
            loadedComponents: Array.from(this.components.keys())
        };
    }
}

// Export to global scope
window.ComponentLoader = new ComponentLoader();

console.log('✅ ComponentLoader module loaded successfully'); 

/* ============================================================================
 * END OF FILE: core/component-loader.js
 * ============================================================================ */


/* ============================================================================
 * FILE: core/event-manager.js
 * SIZE: 23,370 bytes
 * ============================================================================ */

/**
 * @file event-manager.js - FinanceHub Event Manager
 * @description Handles all global events, keyboard shortcuts, and component communication
 * @version 3.1.0
 * @author AEVOREX FinanceHub Team
 */

/**
 * Event Manager Class
 * Responsible for managing all application events and component communication
 */
class EventManager {
    constructor() {
        console.log('🚀 EventManager: Initializing...');
        
        // Event listeners registry
        this.eventListeners = new Map();
        
        // Component references
        this.components = new Map();
        
        // Auto-refresh settings
        this.autoRefreshEnabled = true;
        this.refreshIntervals = new Map();
        
        // AI Summary trigger config
        this.autoAISummary = {
            enabled: true,
            triggerSources: ['ticker-click', 'search', 'keyboard-shortcut', 'header-search', 'url'],
            delay: 1200 // ms
        };
        
        console.log('✅ EventManager: Initialization complete');
    }

    /**
     * Initialize event manager
     */
    async initialize() {
        try {
            console.log('🔄 EventManager: Setting up event listeners...');
            
            this.setupEventListeners();
            this.setupNavigationListeners();
            this.setupKeyboardShortcuts();
            this.setupWindowEvents();
            
            console.log('✅ EventManager: All event listeners setup complete');

            // 🔄 NEW: Load initial symbol from URL (ticker param or legacy ?=SYMBOL pattern)
            this.loadInitialSymbol();
        } catch (error) {
            console.error('❌ EventManager: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Setup main event listeners
     */
    setupEventListeners() {
        console.log('🔗 EventManager: Setting up main event listeners...');
        
        // Search functionality
        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }

        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefresh.bind(this));
        }

        // Symbol change events
        document.addEventListener('symbol-changed', this.handleGlobalSymbolChange.bind(this));
        
        // Ticker click events
        document.addEventListener('ticker-click', this.handleTickerClick.bind(this));
        
        // Chat message events
        document.addEventListener('chat-message', this.handleChatMessage.bind(this));
        
        console.log('✅ EventManager: Main event listeners setup complete');
    }

    /**
     * Setup navigation listeners
     */
    setupNavigationListeners() {
        console.log('🔗 EventManager: Setting up navigation listeners...');
        
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) {
                    this.switchView(view);
                }
            });
        });
        
        console.log('✅ EventManager: Navigation listeners setup complete');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        console.log('🔗 EventManager: Setting up keyboard shortcuts...');
        
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        console.log('✅ EventManager: Keyboard shortcuts setup complete');
    }

    /**
     * Setup window events
     */
    setupWindowEvents() {
        console.log('🔗 EventManager: Setting up window events...');
        
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        console.log('✅ EventManager: Window events setup complete');
    }

    /**
     * Handle search input
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        if (query.length > 0) {
            this.performSearch(query);
        }
    }

    /**
     * Handle search keydown
     */
    handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            if (query.length > 0) {
                this.selectSearchResult(query);
            }
        }
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        if (window.SearchLogic) {
            try {
                const results = await window.SearchLogic.search(query);
                this.displaySearchResults(results);
            } catch (error) {
                console.error('❌ EventManager: Search failed:', error);
            }
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer && results.length > 0) {
            resultsContainer.innerHTML = results.map(result => `
                <div class="search-result-item" data-symbol="${result.symbol}">
                    <span class="result-symbol">${result.symbol}</span>
                    <span class="result-name">${result.name}</span>
                </div>
            `).join('');
            
            // Add click listeners to results
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.selectSearchResult(item.dataset.symbol);
                });
            });
            
            resultsContainer.style.display = 'block';
        }
    }

    /**
     * Select search result
     */
    selectSearchResult(symbol) {
        if (symbol) {
            this.onStockSymbolChange(symbol.toUpperCase(), 'search');
            this.hideSearchResults();
        }
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    /**
     * Handle stock symbol change
     */
    async onStockSymbolChange(symbol, source = 'unknown') {
        console.log(`🎯 EventManager: Symbol changed to ${symbol} from ${source}`);
        
        try {
            // Validate symbol
            if (!this.validateSymbol(symbol)) {
                console.warn(`⚠️ EventManager: Invalid symbol: ${symbol}`);
                return;
            }

            // Update state
            if (window.FinanceHubState) {
                window.FinanceHubState.dispatch({
                    type: 'SYMBOL_CHANGED',
                    payload: { symbol, source }
                });
            }

            // Load stock data
            await this.loadStockData(symbol);
            
            // 🔔 NEW: Broadcast global symbol change for analysis bubbles & other listeners
            try {
                document.dispatchEvent(new CustomEvent('symbol-changed', {
                    detail: { symbol, source, origin: 'event-manager' }
                }));
                // 👇 Legacy / chart-specific event for backward compatibility
                document.dispatchEvent(new CustomEvent('stockSymbolChange', {
                    detail: { symbol }
                }));
            } catch (e) {
                console.warn('EventManager: Failed to dispatch symbol-changed event', e);
            }
            
            // Trigger AI summary if enabled
            if (this.autoAISummary.enabled && this.autoAISummary.triggerSources.includes(source)) {
                setTimeout(() => {
                    this.triggerAISummary({ symbol, source, auto: true });
                }, this.autoAISummary.delay);
            }
            
            // NEW: collapse the large search area after a valid symbol is chosen
            this.hidePrimarySearchSection();
            
            // 🔄 Sync URL query with current symbol
            this.updateURLWithSymbol(symbol);
            
        } catch (error) {
            console.error('❌ EventManager: Symbol change failed:', error);
        }
    }

    /**
     * Hide the primary (hero) search section once a symbol is loaded.
     * A minimal header search remains available for subsequent queries.
     */
    hidePrimarySearchSection() {
        const searchSection = document.querySelector('section.fh-search');
        if (searchSection && !searchSection.classList.contains('hidden')) {
            searchSection.classList.add('hidden');
        }
    }

    /**
     * Load stock data
     */
    async loadStockData(symbol) {
        console.log(`🔄 EventManager: Loading data for ${symbol}...`);
        
        if (!window.FinanceHubAPIService) {
            console.error('❌ EventManager: API service not available');
            return;
        }

        try {
            // Update loading state
            if (window.FinanceHubState) {
                window.FinanceHubState.dispatch({
                    type: 'SET_LOADING',
                    payload: true
                });
            }

            // ✅ FIXED: Use parallel specific endpoints with correct data sources
            console.log(`🚀 EventManager: Fetching ${symbol} data using PARALLEL OPTIMIZED endpoints...`);
            
            const [fundamentalsData, newsData] = await Promise.all([
                window.FinanceHubAPIService.getFundamentals(symbol),
                window.FinanceHubAPIService.getStockNews(symbol, 5)
                // Note: ticker tape is fetched separately by TickerTape component
            ]);

            const stockDataProcessed = {
                symbol: symbol,
                timestamp: new Date().toISOString(),
                source: 'aevorex-fundamentals-only'
            };

            // Extract price snapshot
            const priceData = fundamentalsData.price_data || {};
            const companyInfo = fundamentalsData.company_info || {};

            stockDataProcessed.company_name = companyInfo.name || companyInfo.company_name || symbol;
            stockDataProcessed.current_price = priceData.price || priceData.current_price || null;
            stockDataProcessed.change = priceData.change || 0;
            stockDataProcessed.change_percent = priceData.change_percent || 0;
            stockDataProcessed.market_cap = priceData.market_cap || fundamentalsData.financials?.market_cap || null;
            stockDataProcessed.day_high = priceData.day_high || null;
            stockDataProcessed.day_low = priceData.day_low || null;
            stockDataProcessed.volume = priceData.volume || null;
            stockDataProcessed.price_data = priceData;
            stockDataProcessed.stock_data = fundamentalsData;

            // Attach news if loaded
            stockDataProcessed.news_data = newsData || null;

            console.log(`🎯 EventManager: Data processed for ${symbol}`, stockDataProcessed);

            this.processAPIResponse(stockDataProcessed, symbol);
            
        } catch (error) {
            console.error(`❌ EventManager: Failed to load data for ${symbol}:`, error);
            this.showPlaceholderData(symbol);
        } finally {
            // Update loading state
            if (window.FinanceHubState) {
                window.FinanceHubState.dispatch({
                    type: 'SET_LOADING',
                    payload: false
                });
            }
        }
    }

    /**
     * Process API response
     */
    processAPIResponse(stockData, symbol) {
        console.log(`✅ EventManager: Processing API response for ${symbol}`);
        
        // Update components with new data
        this.updateComponentsWithStockData(symbol, stockData);
        
        // Hide placeholder data
        this.hidePlaceholderData();
    }

    /**
     * Update components with stock data
     */
    updateComponentsWithStockData(symbol, stockData) {
        console.log(`📊 EventManager: Updating components for ${symbol}`);
        
        // Use FinanceHubApp's updateStockHeader method instead of local duplicate
        if (window.financeHubApp && window.financeHubApp.updateStockHeader) {
            window.financeHubApp.updateStockHeader(symbol, stockData);
        }
        
        // Update analysis bubbles
        this.updateAnalysisBubbles(stockData);
        
        // Dispatch component update event
        document.dispatchEvent(new CustomEvent('stock-data-updated', {
            detail: { symbol, stockData }
        }));
    }

    /**
     * Update analysis bubbles
     */
    updateAnalysisBubbles(stockData) {
        const bubbleContainer = document.getElementById('fh-analysis-bubbles');
        if (!bubbleContainer) return;

        // Trigger bubble update event
        document.dispatchEvent(new CustomEvent('analysis-bubbles-update', {
            detail: { stockData }
        }));
    }

    /**
     * Show placeholder data
     */
    showPlaceholderData(symbol) {
        console.log(`📊 EventManager: Showing placeholder data for ${symbol}`);
        
        // Use FinanceHubApp's updateStockHeader method with placeholder data
        if (window.financeHubApp && window.financeHubApp.updateStockHeader) {
            window.financeHubApp.updateStockHeader(symbol, {
                company_name: 'Loading...',
                current_price: null,
                change: 0,
                change_percent: 0
            });
        }
    }

    /**
     * Hide placeholder data
     */
    hidePlaceholderData() {
        // Implementation for hiding placeholder elements
    }

    /**
     * Handle global symbol change
     */
    handleGlobalSymbolChange(event) {
        const { symbol, source, origin } = event.detail;
        // Avoid infinite loop: ignore events emitted by this instance
        if (origin === 'event-manager') return;
        this.onStockSymbolChange(symbol, source || 'global-event');
    }

    /**
     * Handle ticker click
     */
    async handleTickerClick(event) {
        const { symbol, clickData } = event.detail;
        console.log(`🎯 EventManager: Ticker clicked: ${symbol}`);
        
        await this.onStockSymbolChange(symbol, 'ticker-click');
        
        // Track ticker click for metrics
        this.trackTickerClick(symbol, clickData);
    }

    /**
     * Track ticker click
     */
    trackTickerClick(symbol, clickData) {
        console.log(`📊 EventManager: Tracking ticker click: ${symbol}`, clickData);
    }

    /**
     * Handle chat message
     */
    handleChatMessage(event) {
        const { message, type } = event.detail;
        console.log(`💬 EventManager: Chat message: ${type}`, message);
    }

    /**
     * Trigger AI summary
     */
    async triggerAISummary(options = {}) {
        const { symbol, source, auto } = options;
        console.log(`🤖 EventManager: Triggering AI summary for ${symbol} (${source}, auto: ${auto})`);
        
        // Track AI summary trigger
        this.trackAISummaryTrigger(symbol, source, auto);
        
        // Dispatch AI summary event
        document.dispatchEvent(new CustomEvent('ai-summary-trigger', {
            detail: { symbol, source, auto }
        }));
    }

    /**
     * Track AI summary trigger
     */
    trackAISummaryTrigger(symbol, source, auto) {
        console.log(`📊 EventManager: AI summary triggered: ${symbol} from ${source} (auto: ${auto})`);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K: Focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.focusSearch();
        }
        
        // Ctrl/Cmd + T: Toggle theme
        if ((event.ctrlKey || event.metaKey) && event.key === 't') {
            event.preventDefault();
            this.toggleTheme();
        }
        
        // Escape: Close modals
        if (event.key === 'Escape') {
            this.closeModals();
        }
    }

    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        if (window.ThemeManager) {
            window.ThemeManager.toggleTheme();
        }
    }

    /**
     * Close modals
     */
    closeModals() {
        this.hideSearchResults();
        // Add other modal closing logic here
    }

    /**
     * Switch view
     */
    switchView(view) {
        console.log(`🔄 EventManager: Switching to view: ${view}`);
        
        // Update active navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide view containers
        document.querySelectorAll('[data-view-container]').forEach(container => {
            const isActive = container.dataset.viewContainer === view;
            container.style.display = isActive ? 'block' : 'none';
        });
        
        // Update state
        if (window.FinanceHubState) {
            window.FinanceHubState.dispatch({
                type: 'VIEW_CHANGED',
                payload: { view }
            });
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Throttle resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            console.log('🔄 EventManager: Window resized');
            
            // Dispatch resize event
            document.dispatchEvent(new CustomEvent('window-resized', {
                detail: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }));
        }, 250);
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('⏸️ EventManager: Page hidden, pausing auto-refresh');
            this.pauseAutoRefresh();
        } else {
            console.log('▶️ EventManager: Page visible, resuming auto-refresh');
            this.resumeAutoRefresh();
        }
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload() {
        console.log('🔄 EventManager: Page unloading, cleaning up...');
        this.pauseAutoRefresh();
    }

    /**
     * Handle refresh button
     */
    async handleRefresh() {
        console.log('🔄 EventManager: Manual refresh triggered');
        
        // Get current symbol
        const currentSymbol = window.FinanceHubState?.getState().currentSymbol || 'AAPL';
        
        // Reload data
        await this.loadStockData(currentSymbol);
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (!this.autoRefreshEnabled) return;
        
        console.log('▶️ EventManager: Starting auto-refresh');
        
        // Clear existing intervals
        this.pauseAutoRefresh();
        
        // Start ticker refresh
        const tickerInterval = setInterval(() => {
            document.dispatchEvent(new CustomEvent('auto-refresh-ticker'));
        }, 30000); // 30 seconds
        
        this.refreshIntervals.set('ticker', tickerInterval);
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        console.log('⏸️ EventManager: Pausing auto-refresh');
        
        this.refreshIntervals.forEach((interval, name) => {
            clearInterval(interval);
            console.log(`⏸️ EventManager: Cleared ${name} interval`);
        });
        
        this.refreshIntervals.clear();
    }

    /**
     * Resume auto-refresh
     */
    resumeAutoRefresh() {
        console.log('▶️ EventManager: Resuming auto-refresh');
        this.startAutoRefresh();
    }

    /**
     * Validate symbol
     */
    validateSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        
        const cleanSymbol = symbol.trim().toUpperCase();
        
        // Basic validation: 1-5 characters, letters only
        return /^[A-Z]{1,5}$/.test(cleanSymbol);
    }

    /**
     * Get component reference
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Set component reference
     */
    setComponent(name, component) {
        this.components.set(name, component);
    }

    /* --------------------------------------------------------------------
     * 🔄 URL ↔ Symbol Synchronisation Helpers (Rule #008 data-parity)
     * ------------------------------------------------------------------ */

    /**
     * Parse ticker symbol from current URL (supports ?ticker=MSFT and ?=MSFT)
     */
    getSymbolFromURL() {
        try {
            const url = new URL(window.location.href);
            // Preferred param name
            let sym = url.searchParams.get('ticker');
            if (!sym) {
                // Legacy pattern like ?=MSFT
                const search = url.search;
                if (search.startsWith('?=')) {
                    sym = search.substring(2);
                }
            }
            return sym ? sym.toUpperCase() : null;
        } catch (err) {
            console.warn('EventManager: Failed to parse symbol from URL', err);
            return null;
        }
    }

    /**
     * Update browser URL (history.replaceState) to reflect current symbol.
     */
    updateURLWithSymbol(symbol) {
        if (!symbol) return;
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('ticker', symbol.toUpperCase());
            // Clean up legacy pattern if present
            if (url.search.startsWith('?=')) {
                url.searchParams.delete('');
            }
            history.replaceState({ symbol }, '', url.toString());
        } catch (err) {
            console.warn('EventManager: Failed to update URL with symbol', err);
        }
    }

    /**
     * Load initial symbol from URL and trigger data fetch
     */
    loadInitialSymbol() {
        const initial = this.getSymbolFromURL();
        if (initial && this.validateSymbol(initial)) {
            console.log(`🔄 EventManager: Detected initial symbol from URL → ${initial}`);
            this.onStockSymbolChange(initial, 'url');
        }
    }
}

// Export to global scope
window.EventManager = new EventManager();

console.log('✅ EventManager module loaded successfully'); 

/* ============================================================================
 * END OF FILE: core/event-manager.js
 * ============================================================================ */


/* ============================================================================
 * FILE: services/module-loader.js
 * SIZE: 8,242 bytes
 * ============================================================================ */

/**
 * AEVOREX FINANCEHUB - Module Loader
 * Dynamic module loading and dependency management
 * Version: 4.0.0 - Modern Architecture Only
 */

class ModuleLoader {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || '',
            timeout: config.timeout || 10000,
            retryAttempts: config.retryAttempts || 3,
            ...config
        };
        
        this.loadedModules = new Map();
        this.pendingLoads = new Map();
        this.dependencies = new Map();
        this.initQueue = [];
        
        this.setupDependencies();
    }

    setupDependencies() {
        // Define module dependencies - Modern architecture only
        this.dependencies.set('FinanceHubChat', ['FinanceHubAPI']);
        this.dependencies.set('AnalysisBubbles', ['StockDataManager']);
        this.dependencies.set('TickerTapeUnified', ['FinanceHubAPI']);
        this.dependencies.set('AnalysisBubbles', ['FinanceHubAPI', 'StockDataManager']);
        this.dependencies.set('UnifiedChartManager', ['TradingViewWidget']);
        this.dependencies.set('HeaderManager', ['FinanceHubAPI']);
    }

    /**
     * Load a module with dependency resolution
     */
    async loadModule(moduleName, config = {}) {
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        if (this.pendingLoads.has(moduleName)) {
            return this.pendingLoads.get(moduleName);
        }

        const loadPromise = this.createModule(moduleName, config);
        this.pendingLoads.set(moduleName, loadPromise);

        try {
            const moduleInstance = await loadPromise;
            this.loadedModules.set(moduleName, moduleInstance);
            this.pendingLoads.delete(moduleName);
            return moduleInstance;
        } catch (error) {
            this.pendingLoads.delete(moduleName);
            throw error;
        }
    }

    async createModule(moduleName, config) {
        let moduleInstance;

        switch (moduleName) {
            case 'FinanceHubAPI':
                // FinanceHubAPI is already globally available as window.FinanceHubAPI
                if (window.FinanceHubAPI) {
                    moduleInstance = window.FinanceHubAPI;
                } else {
                    throw new Error('FinanceHubAPI not available globally');
                }
                break;

            case 'FinanceHubChat':
                if (window.FinanceHubChat) {
                    moduleInstance = new window.FinanceHubChat(config);
                } else {
                    throw new Error('FinanceHubChat class not available');
                }
                break;

            case 'TickerTapeUnified':
                if (window.TickerTapeUnified) {
                    // Ensure apiClient is provided
                    if (!config.apiClient) {
                        if (window.FinanceHubAPI) {
                            config = { ...config, apiClient: window.FinanceHubAPI };
                        } else {
                            console.warn('ModuleLoader: FinanceHubAPI not available globally to inject into TickerTapeUnified');
                        }
                    }
                    moduleInstance = new window.TickerTapeUnified(config);
                } else {
                    throw new Error('TickerTapeUnified class not available');
                }
                break;

            case 'AnalysisBubbles':
                if (window.AnalysisBubbles) {
                    moduleInstance = new window.AnalysisBubbles(config);
                } else {
                    throw new Error('AnalysisBubbles class not available');
                }
                break;

            case 'UnifiedChartManager':
                if (window.UnifiedChartManager) {
                    moduleInstance = new window.UnifiedChartManager(config);
                } else {
                    throw new Error('UnifiedChartManager class not available');
                }
                break;

            case 'HeaderManager':
                if (window.HeaderManager) {
                    moduleInstance = new window.HeaderManager(config);
                } else {
                    throw new Error('HeaderManager class not available');
                }
                break;

            default:
                throw new Error(`Unknown module: ${moduleName}`);
        }

        return moduleInstance;
    }

    /**
     * Load essential modules in order
     */
    async loadCoreModules() {
        try {

            // 🚫 Avoid UI duplication: UI components are now loaded exclusively via ComponentLoader
            const coreModules = [
                'FinanceHubAPI',
                'StockDataManager'
            ];

            console.log('🚀 Loading modern FinanceHub modules...');

            for (const moduleName of coreModules) {
                try {
                    await this.loadModule(moduleName);
                    console.log(`✅ ${moduleName} loaded successfully`);
                } catch (error) {
                    console.warn(`⚠️ Failed to load ${moduleName}:`, error.message);
                }
            }

            console.log('🎉 Modern module loading completed');
            return this.loadedModules;
        } catch (error) {
            console.error('❌ Error loading core modules:', error);
            throw error;
        }
    }

    /**
     * Get loaded module
     */
    getModule(name) {
        return this.loadedModules.get(name);
    }

    /**
     * Check if module is loaded
     */
    isLoaded(name) {
        return this.loadedModules.has(name);
    }

    /**
     * Get all loaded modules
     */
    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    /**
     * Unload module
     */
    async unloadModule(name) {
        const module = this.loadedModules.get(name);
        if (module) {
            // Call destroy method if available
            if (typeof module.destroy === 'function') {
                try {
                    await module.destroy();
                } catch (error) {
                    console.warn(`Warning during module ${name} destruction:`, error);
                }
            }

            this.loadedModules.delete(name);
            console.log(`🗑️ Module unloaded: ${name}`);
        }
    }

    /**
     * Reload module
     */
    async reloadModule(name, config = {}) {
        await this.unloadModule(name);
        return this.loadModule(name, config);
    }

    /**
     * Get module loading status
     */
    getLoadingStatus() {
        return {
            loaded: Array.from(this.loadedModules.keys()),
            loading: Array.from(this.pendingLoads.keys()),
            dependencies: Object.fromEntries(this.dependencies)
        };
    }

    /**
     * Emit event
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventBus.dispatchEvent(event);
    }

    /**
     * Add event listener
     */
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    /**
     * Destroy module loader
     */
    async destroy() {
        // Unload all modules
        const moduleNames = Array.from(this.loadedModules.keys());
        for (const name of moduleNames) {
            await this.unloadModule(name);
        }

        // Clear all data
        this.loadedModules.clear();
        this.pendingLoads.clear();
        this.dependencies.clear();
    }
}

// Create singleton instance
const moduleLoader = new ModuleLoader();
moduleLoader.setupDependencies();

// Make globally available
window.ModuleLoader = moduleLoader;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModuleLoader,
        default: moduleLoader
    };
}

// ES6 Export
// REMOVED EXPORT: export { ModuleLoader };
// REMOVED EXPORT: export default moduleLoader;

console.log('✅ ModuleLoader exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: services/module-loader.js
 * ============================================================================ */


/* ============================================================================
 * FILE: logic/search-logic.js
 * SIZE: 12,386 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * SEARCH LOGIC COMPONENT
 * Handles search functionality and data processing
 * Extracted from HeaderManager for better separation of concerns
 * ===================================================================
 */

class SearchLogic {
    constructor(dataService) {
        // Fallback to unified FinanceHubAPI if legacy DataService is not supplied
        this.dataService = dataService 
            || window.FinanceHubAPI 
            || (window.financeHubApp?.apiService) 
            || (window.FinanceHubAPIService ? new window.FinanceHubAPIService() : null);
        this.searchCache = new Map();
        this.searchHistory = [];
        this.popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'];
        
        this.config = {
            minSearchLength: 1,
            maxResults: 10,
            searchDelay: 300,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            maxHistoryItems: 20
        };

        this.searchTimeout = null;
        this.abortController = null;
    }

    /**
     * Perform search with debouncing
     */
    async search(query, callback) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Abort previous request
        if (this.abortController) {
            this.abortController.abort();
        }

        // Validate query
        if (!query || query.length < this.config.minSearchLength) {
            callback([]);
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            try {
                const results = await this.performSearch(query);
                callback(results);
            } catch (error) {
                console.error('Search error:', error);
                callback([]);
            }
        }, this.config.searchDelay);
    }

    /**
     * Perform actual search
     */
    async performSearch(query) {
        const normalizedQuery = query.trim().toLowerCase();
        
        // Check cache first
        const cacheKey = normalizedQuery;
        const cached = this.searchCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.results;
        }

        // Create new abort controller
        this.abortController = new AbortController();

        try {
            // Search in multiple sources
            const [symbolResults, companyResults] = await Promise.all([
                this.searchBySymbol(normalizedQuery),
                this.searchByCompanyName(normalizedQuery)
            ]);

            // Combine and deduplicate results
            const combinedResults = this.combineResults(symbolResults, companyResults);
            
            // Sort by relevance
            const sortedResults = this.sortByRelevance(combinedResults, normalizedQuery);
            
            // Limit results
            const limitedResults = sortedResults.slice(0, this.config.maxResults);

            // Cache results
            this.searchCache.set(cacheKey, {
                results: limitedResults,
                timestamp: Date.now()
            });

            return limitedResults;

        } catch (error) {
            if (error.name === 'AbortError') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Search by symbol
     */
    async searchBySymbol(query) {
        try {
            console.log(`🔍 [SearchLogic] Starting symbol search for: "${query}" (centralized API)`);
            
            const data = await this.dataService.searchStocks(query, this.config.maxResults);

            // API may return { results: [...] } or raw array
            const results = Array.isArray(data) ? data : (data.results || []);

            console.log(`✅ [SearchLogic] Symbol search successful. Found ${results.length} results`);
            return results;
            
        } catch (error) {
            console.error(`❌ [SearchLogic] Symbol search failed:`, error);
            return this.fallbackSymbolSearch(query);
        }
    }

    /**
     * Search by company name
     */
    async searchByCompanyName(query) {
        try {
            console.log(`🔍 [SearchLogic] Starting company name search for: "${query}" (centralized API)`);
            
            const data = await this.dataService.searchStocks(query, this.config.maxResults);
            const results = Array.isArray(data) ? data : (data.results || []);

            console.log(`✅ [SearchLogic] Company name search successful. Found ${results.length} results`);
            return results;
            
        } catch (error) {
            console.error(`❌ [SearchLogic] Company name search failed:`, error);
            return this.fallbackCompanySearch(query);
        }
    }

    /**
     * Fallback symbol search
     */
    fallbackSymbolSearch(query) {
        const upperQuery = query.toUpperCase();
        return this.popularSymbols
            .filter(symbol => symbol.includes(upperQuery))
            .map(symbol => ({
                symbol,
                name: this.getCompanyName(symbol),
                type: 'stock',
                price: 0,
                change: 0,
                source: 'fallback'
            }));
    }

    /**
     * Fallback company search
     */
    fallbackCompanySearch(query) {
        const lowerQuery = query.toLowerCase();
        const companyMap = {
            'apple': 'AAPL',
            'google': 'GOOGL',
            'microsoft': 'MSFT',
            'tesla': 'TSLA',
            'amazon': 'AMZN',
            'meta': 'META',
            'nvidia': 'NVDA',
            'netflix': 'NFLX'
        };

        return Object.entries(companyMap)
            .filter(([name]) => name.includes(lowerQuery))
            .map(([name, symbol]) => ({
                symbol,
                name: this.getCompanyName(symbol),
                type: 'stock',
                price: 0,
                change: 0,
                source: 'fallback'
            }));
    }

    /**
     * Get company name for symbol - REQUIRES BACKEND API ONLY
     */
    getCompanyName(symbol) {
        // ❌ MOCK DATA REMOVED - BACKEND INTEGRATION REQUIRED
        console.error(`🚨 SearchLogic CRITICAL: Company name requested for ${symbol} but MOCK DATA was removed`);
        console.error('🚨 SearchLogic NOTE: Backend API integration is MANDATORY - no fallback data exists');
        
        // Return error indication instead of mock data
        return `❌ ${symbol} - API Integration Required`;
    }

    /**
     * Combine search results
     */
    combineResults(symbolResults, companyResults) {
        const resultMap = new Map();

        // Add symbol results
        symbolResults.forEach(result => {
            resultMap.set(result.symbol, result);
        });

        // Add company results (don't overwrite symbol results)
        companyResults.forEach(result => {
            if (!resultMap.has(result.symbol)) {
                resultMap.set(result.symbol, result);
            }
        });

        return Array.from(resultMap.values());
    }

    /**
     * Sort results by relevance
     */
    sortByRelevance(results, query) {
        const upperQuery = query.toUpperCase();
        
        return results.sort((a, b) => {
            // Exact symbol match gets highest priority
            if (a.symbol === upperQuery) return -1;
            if (b.symbol === upperQuery) return 1;

            // Symbol starts with query
            const aSymbolStarts = a.symbol.startsWith(upperQuery);
            const bSymbolStarts = b.symbol.startsWith(upperQuery);
            if (aSymbolStarts && !bSymbolStarts) return -1;
            if (!aSymbolStarts && bSymbolStarts) return 1;

            // Company name starts with query
            const aNameStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
            const bNameStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
            if (aNameStarts && !bNameStarts) return -1;
            if (!aNameStarts && bNameStarts) return 1;

            // Symbol contains query
            const aSymbolContains = a.symbol.includes(upperQuery);
            const bSymbolContains = b.symbol.includes(upperQuery);
            if (aSymbolContains && !bSymbolContains) return -1;
            if (!aSymbolContains && bSymbolContains) return 1;

            // Company name contains query
            const aNameContains = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameContains = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameContains && !bNameContains) return -1;
            if (!aNameContains && bNameContains) return 1;

            // Popular symbols get priority
            const aPopular = this.popularSymbols.includes(a.symbol);
            const bPopular = this.popularSymbols.includes(b.symbol);
            if (aPopular && !bPopular) return -1;
            if (!aPopular && bPopular) return 1;

            // Alphabetical order
            return a.symbol.localeCompare(b.symbol);
        });
    }

    /**
     * Add to search history
     */
    addToHistory(query, result) {
        const historyItem = {
            query: query.trim(),
            result,
            timestamp: Date.now()
        };

        // Remove existing entry for same symbol
        this.searchHistory = this.searchHistory.filter(
            item => item.result.symbol !== result.symbol
        );

        // Add to beginning
        this.searchHistory.unshift(historyItem);

        // Limit history size
        if (this.searchHistory.length > this.config.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.config.maxHistoryItems);
        }

        // Save to localStorage
        this.saveHistoryToStorage();
    }

    /**
     * Get search history
     */
    getHistory() {
        return this.searchHistory;
    }

    /**
     * Get popular searches
     */
    getPopularSearches() {
        return this.popularSymbols.map(symbol => ({
            symbol,
            name: this.getCompanyName(symbol),
            type: 'stock',
            price: 0,
            change: 0,
            source: 'popular'
        }));
    }

    /**
     * Clear search history
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveHistoryToStorage();
    }

    /**
     * Save history to localStorage
     */
    saveHistoryToStorage() {
        try {
            localStorage.setItem('financehub_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }

    /**
     * Load history from localStorage
     */
    loadHistoryFromStorage() {
        try {
            const stored = localStorage.getItem('financehub_search_history');
            if (stored) {
                this.searchHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.searchCache.size,
            entries: Array.from(this.searchCache.keys())
        };
    }

    /**
     * Destroy search logic
     */
    destroy() {
        // Clear timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Abort ongoing request
        if (this.abortController) {
            this.abortController.abort();
        }

        // Clear cache
        this.clearCache();
    }
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.SearchLogic = SearchLogic;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        SearchLogic: SearchLogic,
        default: SearchLogic
    };
}

// ES6 Export
// REMOVED EXPORT: export { SearchLogic };
// REMOVED EXPORT: export default SearchLogic;

console.log('✅ SearchLogic class exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: logic/search-logic.js
 * ============================================================================ */


/* ============================================================================
 * FILE: store/app-state.js
 * SIZE: 8,075 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * APP STATE STORE
 * Centralized state management for FinanceHub
 * Extracted from AppCoordinator for better separation of concerns
 * ===================================================================
 */

class AppState {
    constructor() {
        this.state = {
            currentSymbol: 'AAPL',
            isInitialized: false,
            theme: this.getStoredTheme() || 'dark',
            activeView: 'welcome',
            isLoading: false,
            error: null,
            modules: new Map(),
            user: null,
            preferences: this.getStoredPreferences()
        };

        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state property
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set state property
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Add to history
        this.addToHistory(key, oldValue, value);
        
        // Notify subscribers
        this.notifySubscribers(key, value, oldValue);
        
        // Persist certain state changes
        this.persistState(key, value);
    }

    /**
     * Update multiple state properties
     */
    update(updates) {
        const changes = {};
        
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.state[key];
            this.state[key] = value;
            changes[key] = { oldValue, newValue: value };
            
            // Add to history
            this.addToHistory(key, oldValue, value);
            
            // Persist certain state changes
            this.persistState(key, value);
        });
        
        // Notify subscribers of batch update
        this.notifySubscribers('batch_update', changes);
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const keySubscribers = this.subscribers.get(key);
            if (keySubscribers) {
                keySubscribers.delete(callback);
                if (keySubscribers.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(key, newValue, oldValue = null) {
        const keySubscribers = this.subscribers.get(key);
        if (keySubscribers) {
            keySubscribers.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in state subscriber for ${key}:`, error);
                }
            });
        }

        // Also notify global subscribers
        const globalSubscribers = this.subscribers.get('*');
        if (globalSubscribers) {
            globalSubscribers.forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error('Error in global state subscriber:', error);
                }
            });
        }
    }

    /**
     * Add state change to history
     */
    addToHistory(key, oldValue, newValue) {
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Get state change history
     */
    getHistory(key = null) {
        if (key) {
            return this.history.filter(entry => entry.key === key);
        }
        return [...this.history];
    }

    /**
     * Persist certain state changes to localStorage
     */
    persistState(key, value) {
        const persistableKeys = ['theme', 'preferences', 'currentSymbol'];
        
        if (persistableKeys.includes(key)) {
            try {
                localStorage.setItem(`financehub_${key}`, JSON.stringify(value));
            } catch (error) {
                console.warn(`Failed to persist state for ${key}:`, error);
            }
        }
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            const stored = localStorage.getItem('financehub_theme');
            if (!stored) return null;

            // Attempt standard JSON parse first (current format = "\"light\"")
            try {
                return JSON.parse(stored);
            } catch (parseErr) {
                // Legacy format support: raw string without quotes (e.g., light / dark)
                console.warn('Theme value was stored in legacy format. Performing one-time migration.');
                // Persist back using the modern quoted JSON format
                localStorage.setItem('financehub_theme', JSON.stringify(stored));
                return stored;
            }
        } catch (error) {
            console.warn('Failed to get stored theme:', error);
            return null;
        }
    }

    /**
     * Get stored preferences from localStorage
     */
    getStoredPreferences() {
        try {
            const stored = localStorage.getItem('financehub_preferences');
            return stored ? JSON.parse(stored) : {
                autoRefresh: true,
                refreshInterval: 30000,
                enableNotifications: false,
                compactMode: false,
                enableAnimations: true
            };
        } catch (error) {
            console.warn('Failed to get stored preferences:', error);
            return {
                autoRefresh: true,
                refreshInterval: 30000,
                enableNotifications: false,
                compactMode: false,
                enableAnimations: true
            };
        }
    }

    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = {
            currentSymbol: 'AAPL',
            isInitialized: false,
            theme: 'dark',
            activeView: 'welcome',
            isLoading: false,
            error: null,
            modules: new Map(),
            user: null,
            preferences: this.getStoredPreferences()
        };

        this.update(initialState);
        this.history = [];
    }

    /**
     * Clear persisted state
     */
    clearPersistedState() {
        const keys = ['theme', 'preferences', 'currentSymbol'];
        keys.forEach(key => {
            try {
                localStorage.removeItem(`financehub_${key}`);
            } catch (error) {
                console.warn(`Failed to clear persisted state for ${key}:`, error);
            }
        });
    }

    /**
     * Get state summary for debugging
     */
    getStateSummary() {
        return {
            stateKeys: Object.keys(this.state),
            subscriberCount: Array.from(this.subscribers.values())
                .reduce((total, set) => total + set.size, 0),
            historySize: this.history.length,
            lastChange: this.history[this.history.length - 1] || null
        };
    }
}

// Create singleton instance
const appState = new AppState();

// Make class and instance globally available
window.AppState = appState;
window.AppStateClass = AppState;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        appState,
        default: appState
    };
}

// ES6 Export
// REMOVED EXPORT: export { AppState, appState };
// REMOVED EXPORT: export default appState;

console.log('✅ AppState class and singleton exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: store/app-state.js
 * ============================================================================ */


/* ============================================================================
 * FILE: ui/header-ui.js
 * SIZE: 12,339 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * HEADER UI COMPONENT
 * Handles DOM manipulation and visual effects for the header
 * Extracted from HeaderManager for better separation of concerns
 * ===================================================================
 */

class HeaderUI {
    constructor(headerElement) {
        this.header = headerElement;
        this.searchInput = null;
        this.searchResults = null;
        this.themeToggle = null;
        this.mobileMenuToggle = null;
        this.mobileMenu = null;
        
        this.isScrolled = false;
        this.lastScrollY = 0;
        this.scrollThreshold = 50;
        
        this.init();
    }

    /**
     * Initialize UI components
     */
    init() {
        this.findElements();
        this.setupScrollEffects();
        this.setupMobileMenu();
        this.setupAnimations();
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        if (!this.header) return;

        this.searchInput = this.header.querySelector('.search-input');
        this.searchResults = this.header.querySelector('.search-results');
        this.themeToggle = this.header.querySelector('.theme-toggle');
        this.mobileMenuToggle = this.header.querySelector('.mobile-menu-toggle');
        this.mobileMenu = this.header.querySelector('.mobile-menu');
    }

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            // Add/remove scrolled class
            if (currentScrollY > this.scrollThreshold && !this.isScrolled) {
                this.isScrolled = true;
                this.header.classList.add('scrolled');
                this.animateHeaderScroll(true);
            } else if (currentScrollY <= this.scrollThreshold && this.isScrolled) {
                this.isScrolled = false;
                this.header.classList.remove('scrolled');
                this.animateHeaderScroll(false);
            }

            // Hide/show header on scroll direction
            if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
                // Scrolling down
                this.header.classList.add('header-hidden');
            } else {
                // Scrolling up
                this.header.classList.remove('header-hidden');
            }

            this.lastScrollY = currentScrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /**
     * Animate header scroll state
     */
    animateHeaderScroll(isScrolled) {
        const logo = this.header.querySelector('.logo');
        const nav = this.header.querySelector('.nav');

        if (isScrolled) {
            // Compact header
            if (logo) {
                logo.style.transform = 'scale(0.9)';
                logo.style.transition = 'transform 0.3s ease';
            }
            if (nav) {
                nav.style.transform = 'translateY(-2px)';
                nav.style.transition = 'transform 0.3s ease';
            }
        } else {
            // Full header
            if (logo) {
                logo.style.transform = 'scale(1)';
            }
            if (nav) {
                nav.style.transform = 'translateY(0)';
            }
        }
    }

    /**
     * Setup mobile menu
     */
    setupMobileMenu() {
        if (!this.mobileMenuToggle || !this.mobileMenu) return;

        this.mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target) && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const isActive = this.mobileMenu.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.mobileMenu.classList.add('active');
        this.mobileMenuToggle.classList.add('active');
        document.body.classList.add('mobile-menu-open');
        
        // Animate menu items
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
            item.classList.add('animate-in');
        });
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.mobileMenu.classList.remove('active');
        this.mobileMenuToggle.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
        
        // Remove animation classes
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach(item => {
            item.classList.remove('animate-in');
            item.style.animationDelay = '';
        });
    }

    /**
     * Setup animations
     */
    setupAnimations() {
        // Add hover effects to navigation items
        const navItems = this.header.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
                item.style.transition = 'transform 0.2s ease';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
            });
        });

        // Add ripple effect to buttons
        const buttons = this.header.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            button.addEventListener('click', this.createRippleEffect.bind(this));
        });
    }

    /**
     * Create ripple effect
     */
    createRippleEffect(e) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Show search results
     */
    showSearchResults(results) {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = '';
        this.searchResults.classList.add('active');

        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        results.forEach((result, index) => {
            const resultElement = this.createSearchResultElement(result, index);
            this.searchResults.appendChild(resultElement);
        });

        // Animate results
        this.animateSearchResults();
    }

    /**
     * Create search result element
     */
    createSearchResultElement(result, index) {
        const element = document.createElement('div');
        element.className = 'search-result-item';
        element.style.animationDelay = `${index * 0.05}s`;
        
        element.innerHTML = `
            <div class="result-symbol">${result.symbol}</div>
            <div class="result-name">${result.name}</div>
            <div class="result-price">$${result.price}</div>
            <div class="result-change ${result.change >= 0 ? 'positive' : 'negative'}">
                ${result.change >= 0 ? '+' : ''}${result.change}%
            </div>
        `;

        element.addEventListener('click', () => {
            this.selectSearchResult(result);
        });

        return element;
    }

    /**
     * Animate search results
     */
    animateSearchResults() {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        items.forEach(item => {
            item.classList.add('animate-in');
        });
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (!this.searchResults) return;
        
        this.searchResults.classList.remove('active');
        setTimeout(() => {
            this.searchResults.innerHTML = '';
        }, 300);
    }

    /**
     * Select search result
     */
    selectSearchResult(result) {
        if (this.searchInput) {
            this.searchInput.value = result.symbol;
        }
        this.hideSearchResults();
        
        // Emit custom event
        const event = new CustomEvent('search:select', {
            detail: { result }
        });
        this.header.dispatchEvent(event);
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
        this.searchResults.classList.add('active');
    }

    /**
     * Update theme toggle
     */
    updateThemeToggle(isDark) {
        if (!this.themeToggle) return;
        
        const icon = this.themeToggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        this.themeToggle.setAttribute('aria-label', 
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
        );
    }

    /**
     * Set search input value
     */
    setSearchValue(value) {
        if (this.searchInput) {
            this.searchInput.value = value;
        }
    }

    /**
     * Get search input value
     */
    getSearchValue() {
        return this.searchInput ? this.searchInput.value : '';
    }

    /**
     * Focus search input
     */
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.hideSearchResults();
    }

    /**
     * Add event listener to search input
     */
    onSearchInput(callback) {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', callback);
        }
    }

    /**
     * Add event listener to theme toggle
     */
    onThemeToggle(callback) {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', callback);
        }
    }

    /**
     * Destroy UI component
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.onScroll);
        
        // Clear animations
        const animatedElements = this.header.querySelectorAll('[style*="animation"]');
        animatedElements.forEach(el => {
            el.style.animation = '';
        });
    }
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.HeaderUI = HeaderUI;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        HeaderUI: HeaderUI,
        default: HeaderUI
    };
}

// ES6 Export
// REMOVED EXPORT: export { HeaderUI };
// REMOVED EXPORT: export default HeaderUI;

console.log('✅ HeaderUI class exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: ui/header-ui.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/ticker-tape/ticker-tape.js
 * SIZE: 36,899 bytes
 * ============================================================================ */

/**
 * @file ticker-tape-unified.js - Unified Ticker Tape Component for FinanceHub
 * @description Professional market data ticker with real-time updates and smooth animations
 * @version 10.0.0 - Unified Architecture
 * @author AEVOREX
 */

/**
 * Unified Ticker Tape Component
 * Displays real-time market data in a scrolling ticker format
 */
class TickerTapeUnified {
    constructor(arg1 = {}, arg2 = {}) {
        let options = {};

        // Allow signature (containerElement | containerId, options)
        if (typeof arg1 === 'string' || arg1 instanceof HTMLElement) {
            options = { ...arg2 };
            if (typeof arg1 === 'string') {
                options.containerId = arg1;
            } else {
                options.containerElement = arg1;
                options.containerId = arg1.id || 'ticker-tape-container';
            }
        } else {
            options = { ...arg1 };
        }

        // Auto-inject apiClient fallback
        if (!options.apiClient && window.FinanceHubAPI) {
            options.apiClient = window.FinanceHubAPI;
            console.log('TickerTapeUnified: auto-injected FinanceHubAPI as apiClient');
        }

        this.containerId = options.containerId || 'ticker-tape-container';
        this.apiClient = options.apiClient;

        if (!this.apiClient) {
            throw new Error("TickerTapeUnified: `apiClient` is a required option and was not provided.");
        }

        this.autoUpdate = options.autoUpdate !== false;
        this.updateInterval = options.updateInterval || 30000; // 30 seconds
        this.animationSpeed = options.animationSpeed || 50; // pixels per second
        this.isVisible = false;
        this.isInitialized = false;
        this.tickerData = [];
        this.observer = null;
        this.updateTimer = null;
        this.animationFrame = null;
        
        // API Configuration - use provided API client instead of hardcoded port
        this.api = {
            apiBaseUrl: options.apiBaseUrl || null // Will use API client baseURL
        };
        
        // Performance metrics
        this.performance = {
            lastLoadTime: 0,
            errorCount: 0,
            successCount: 0
        };
        
        // DOM elements (will be populated during init)
        this.container = null;
        this.content = null;
        this.items = null;
        
        // State
        this.state = {
            isInitialized: false,
            isLoading: false,
            isScrolling: false,
            isPaused: false,
            currentData: [],
            lastUpdate: null,
            scrollPosition: 0,
            animationFrame: null,
            retryCount: 0,
            errors: [],
            currentSymbol: null,
            tickerData: {}
        };
        
        // DOM elements
        this.elements = {
            container: null,
            ticker: null,
            items: [],
            pauseButton: null,
            refreshButton: null
        };
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Performance monitoring
        this.metrics = {
            updateCount: 0,
            errorCount: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0,
            totalUpdates: 0,
            symbolClicks: 0,
            lastClickedSymbol: null,
            lastClickTime: null
        };
        
        // Bind methods
        this.handleTickerClick = this.handleTickerClick.bind(this);
        this.handleTickerHover = this.handleTickerHover.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.animate = this.animate.bind(this);
        
        console.log('🎯 TickerTapeUnified initialized with apiClient:', !!this.apiClient);
    }
    
    /**
     * Initialize the ticker tape component
     */
    async init() {
        if (window.tickerDebugInfo) {
            window.tickerDebugInfo.initialized = true;
            window.tickerDebugInfo.initTimestamp = new Date().toISOString();
        }
        try {
            console.log('🔧 Initializing TickerTapeUnified...');
            
            // Find container
            this.elements.container = document.getElementById(this.containerId);
            if (!this.elements.container) {
                throw new Error(`Container not found: ${this.containerId}`);
            }
            
            // Setup DOM structure
            this.setupDOM();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup visibility change detection
            this.setupVisibilityDetection();
            
            // Load initial data
            await this.loadData();
            
            // Start auto-update
            this.startAutoUpdate();
            
            // Start animation
            if (this.autoUpdate) {
                this.startAnimation();
            }
            
            this.state.isInitialized = true;
            console.log('✅ TickerTapeUnified initialized successfully');
            
            // Emit ready event
            this.emit('ready', { component: 'tickerTape' });
            
        } catch (error) {
            console.error('❌ Failed to initialize TickerTapeUnified:', error);
            this.handleError(error, 'initialization');
            throw error;
        }
    }
    
    /**
     * Setup DOM structure
     */
    setupDOM() {
        if (window.tickerDebugInfo) window.tickerDebugInfo.domSetup = true;
        // Ensure we have the basic ticker-tape structure that matches CSS expectations
        this.elements.container.className = 'market-ticker';
        
        // JAVÍTÁS: Teljes felülírás a HTML mock tartalom helyett
        this.elements.container.innerHTML = `
            <div class="ticker-content" id="ticker-content">
                <div class="ticker-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading market data...</span>
                </div>
            </div>
        `;
        
        // Cache the ticker content element for rendering
        this.elements.ticker = this.elements.container.querySelector('.ticker-content');
        
        // Add control elements if not present
        if (!this.elements.container.querySelector('.ticker-controls')) {
            const controls = document.createElement('div');
            controls.className = 'ticker-controls';
            controls.innerHTML = `
                <button class="ticker-control-btn" id="ticker-pause-btn" title="Pause/Resume" style="display: none;">
                    <span class="control-icon">⏸️</span>
                </button>
                <button class="ticker-control-btn" id="ticker-refresh-btn" title="Refresh Data" style="display: none;">
                    <span class="control-icon">🔄</span>
                </button>
            `;
            this.elements.container.appendChild(controls);
        }
        
        // Cache control elements
        this.elements.pauseButton = this.elements.container.querySelector('#ticker-pause-btn');
        this.elements.refreshButton = this.elements.container.querySelector('#ticker-refresh-btn');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Pause/Resume button
        if (this.elements.pauseButton) {
            this.elements.pauseButton.addEventListener('click', () => {
                this.togglePause();
            });
        }
        
        // Refresh button
        if (this.elements.refreshButton) {
            this.elements.refreshButton.addEventListener('click', () => {
                this.refresh();
            });
        }
        
        // Ticker hover events
        if (this.autoUpdate) {
            this.elements.ticker.addEventListener('mouseenter', () => {
                this.pauseAnimation();
            });
            
            this.elements.ticker.addEventListener('mouseleave', () => {
                if (!this.state.isPaused) {
                    this.resumeAnimation();
                }
            });
        }
        
        // Window focus/blur for performance optimization
        window.addEventListener('focus', () => {
            if (!this.state.isPaused) {
                this.resumeAnimation();
                this.startAutoUpdate();
            }
        });
        
        window.addEventListener('blur', () => {
            this.pauseAnimation();
            this.stopAutoUpdate();
        });
    }
    
    /**
     * Setup visibility change detection
     */
    setupVisibilityDetection() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseAnimation();
            this.stopAutoUpdate();
        } else if (!this.state.isPaused) {
            this.resumeAnimation();
            this.startAutoUpdate();
        }
    }
    
    /**
     * Load data from the backend API
     */
    async loadData() {
        console.log('🎯 TickerTape DEBUG: Starting data load process...');
        this.updateLoadingState(true);

        try {
            console.log('🔗 TickerTape DEBUG: API Client available:', !!this.apiClient);
            const baseUrl = this.apiClient.getBaseUrl ? this.apiClient.getBaseUrl() : 'N/A';
            console.log('🌐 TickerTape DEBUG: Base URL:', baseUrl);
            console.log('🔄 TickerTape DEBUG: Calling backend API getTickerTape()...');
            
            const rawData = await this.apiClient.getTickerTape();

            if (!rawData || !Array.isArray(rawData)) {
                throw new Error("Invalid data format received from API");
            }

            // Store processed data into state for rendering & later access
            const processedData = this.processTickerData(rawData);

            // Persist processed data for other modules (e.g., header & bubbles) 
            this.state.currentData = processedData;
            this.state.tickerData  = processedData.reduce((acc,itm)=>{acc[itm.symbol]=itm; return acc;}, {});

            // Render onto the DOM
            this.renderTickerItems();
            this.performance.successCount++;

        } catch (error) {
            console.error('🚨 TickerTape FATAL ERROR: Critical error loading ticker data');
            console.error('🚨 TickerTape ERROR DETAILS:', error);
            console.error('🚨 TickerTape NOTE: This component requires REAL BACKEND - NO MOCK FALLBACK EXISTS');
            this.handleError(error, 'dataLoading');
        } finally {
            this.updateLoadingState(false);
        }
    }

    /**
     * Process ticker data - STRICT VALIDATION
     * @param {Array} rawData - Raw ticker data from API
     * @returns {Array} Processed ticker data
     */
    processTickerData(rawData) {
        if (!Array.isArray(rawData)) {
            console.error('TickerTape: Invalid data format - expected array');
            return [];
        }

        const processedData = rawData
            .filter(item => this.validateTickerItem(item))
            .map(item => this.formatTickerItem(item))
            .filter(item => item !== null);

        console.log(`TickerTape: Processed ${processedData.length} valid items from ${rawData.length} raw items`);
        return processedData;
    }

    /**
     * Validate ticker item - STRICT VALIDATION
     * @param {Object} item - Ticker item to validate
     * @returns {boolean} Is valid
     */
    validateTickerItem(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }

        // Required fields validation
        const requiredFields = ['symbol', 'price', 'change'];
        for (const field of requiredFields) {
            if (!(field in item)) {
                console.warn(`TickerTape: Missing required field '${field}' in ticker item:`, item);
                return false;
            }
        }

        // Type validation
        if (typeof item.symbol !== 'string' || item.symbol.length === 0) {
            console.warn('TickerTape: Invalid symbol in ticker item:', item);
            return false;
        }

        if (typeof item.price !== 'number' || isNaN(item.price) || item.price <= 0) {
            console.warn('TickerTape: Invalid price in ticker item:', item);
            return false;
        }

        if (typeof item.change !== 'number' || isNaN(item.change)) {
            console.warn('TickerTape: Invalid change in ticker item:', item);
            return false;
        }

        return true;
    }

    /**
     * Format ticker item - CONSISTENT FORMATTING
     * @param {Object} item - Raw ticker item
     * @returns {Object|null} Formatted ticker item
     */
    formatTickerItem(item) {
        try {
            const price = parseFloat(item.price);
            const change = parseFloat(item.change);
            const changePercent = parseFloat(item.change_percent || 0);

            return {
                symbol: item.symbol.toUpperCase(),
                price: this.formatPrice(price),
                change: this.formatChange(change),
                change_percent: this.formatPercentage(changePercent),
                volume: this.formatVolume(item.volume || 0),
                market_cap: this.formatMarketCap(item.market_cap || 0),
                color: change >= 0 ? 'green' : 'red',
                direction: change >= 0 ? 'up' : 'down',
                raw_price: price,
                raw_change: change,
                raw_change_percent: changePercent
            };
        } catch (error) {
            console.error('TickerTape: Error formatting ticker item:', error, item);
            return null;
        }
    }

    /**
     * Handle load error - NO FALLBACK TO MOCK
     * @param {Error} error - The error that occurred
     */
    handleLoadError(error) {
        console.error('TickerTape: Load error occurred:', error);
        
        // Clear existing data
        this.state.currentData = [];
        
        // Show error message in UI
        this.showErrorMessage(`Ticker data unavailable: ${error.message}`);
        
        // Update metrics
        this.metrics.errorCount++;
        this.metrics.lastError = {
            message: error.message,
            timestamp: Date.now()
        };
    }

    /**
     * Show error message in ticker tape
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        if (!this.elements.container) return;

        this.elements.container.innerHTML = `
            <div class="ticker-error">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${message}</span>
                <button class="retry-button" onclick="window.tickerTape?.loadData()">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Format price value
     * @param {number} price - Price value
     * @returns {string} Formatted price
     */
    formatPrice(price) {
        if (typeof price !== 'number' || isNaN(price)) return '0.00';
        return price.toFixed(2);
    }

    /**
     * Format change value
     * @param {number} change - Change value
     * @returns {string} Formatted change
     */
    formatChange(change) {
        if (typeof change !== 'number' || isNaN(change)) return '0.00';
        const formatted = Math.abs(change).toFixed(2);
        return change >= 0 ? `+${formatted}` : `-${formatted}`;
    }

    /**
     * Format percentage value
     * @param {number} percent - Percentage value
     * @returns {string} Formatted percentage
     */
    formatPercentage(percent) {
        if (typeof percent !== 'number' || isNaN(percent)) return '0.00%';
        const formatted = Math.abs(percent).toFixed(2);
        return percent >= 0 ? `+${formatted}%` : `-${formatted}%`;
    }

    /**
     * Format volume value
     * @param {number} volume - Volume value
     * @returns {string} Formatted volume
     */
    formatVolume(volume) {
        if (typeof volume !== 'number' || isNaN(volume) || volume === 0) return 'N/A';
        
        if (volume >= 1000000000) {
            return `${(volume / 1000000000).toFixed(1)}B`;
        } else if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(1)}M`;
        } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(1)}K`;
        }
        
        return volume.toLocaleString();
    }

    /**
     * Format market cap value
     * @param {number} marketCap - Market cap value
     * @returns {string} Formatted market cap
     */
    formatMarketCap(marketCap) {
        if (typeof marketCap !== 'number' || isNaN(marketCap) || marketCap === 0) return 'N/A';
        
        if (marketCap >= 1000000000000) {
            return `${(marketCap / 1000000000000).toFixed(2)}T`;
        } else if (marketCap >= 1000000000) {
            return `${(marketCap / 1000000000).toFixed(2)}B`;
        } else if (marketCap >= 1000000) {
            return `${(marketCap / 1000000).toFixed(2)}M`;
        }
        
        return marketCap.toLocaleString();
    }

    /**
     * Render ticker items
     */
    renderTickerItems() {
        if (window.tickerDebugInfo) {
            window.tickerDebugInfo.renderCalled = true;
            window.tickerDebugInfo.renderTimestamp = new Date().toISOString();
        }
        if (!this.elements.ticker) {
            console.error('❌ TickerTape CRITICAL: Render failed. Target element .ticker-content is missing.');
            this.handleError(new Error('Render target missing'), 'rendering');
            return;
        }

        if (!this.state.currentData || !this.state.currentData.length) {
            this.showEmptyState();
            return;
        }
        
        const tickerHTML = this.state.currentData.map(item => {
            const changeClass = item.raw_change >= 0 ? 'positive' : 'negative';
            const changeIcon = item.raw_change >= 0 ? '▲' : '▼';
            
            return `
                <div class="ticker-item ${changeClass}" data-symbol="${item.symbol}">
                    <div class="ticker-symbol">${item.symbol}</div>
                    <div class="ticker-price">$${item.price}</div>
                    <div class="ticker-change ${changeClass}">
                        <span class="change-icon">${changeIcon}</span>
                        <span class="change-amount">${item.change}</span>
                        <span class="change-percent">(${item.change_percent})</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Render directly into ticker-content for CSS animation compatibility
        try {
            // Initial duplicate (2x)
            this.elements.ticker.innerHTML = `${tickerHTML}${tickerHTML}`;

            // Ensure content width is at least 3× container width for smooth loop
            const containerWidth = this.elements.container.offsetWidth || 1024;
            let currentWidth = this.elements.ticker.scrollWidth;
            while (currentWidth < containerWidth * 3) {
                this.elements.ticker.innerHTML += tickerHTML;
                currentWidth = this.elements.ticker.scrollWidth;
            }
            console.log(`✅ TickerTape RENDER: Successfully rendered ${this.state.currentData.length} items.`);
        } catch (error) {
            console.error('❌ TickerTape CRITICAL: DOM update failed during renderTickerItems.', error);
            this.handleError(error, 'dom_update');
            return; // Stop execution if render fails
        }
        
        // Setup click handlers
        if (this.autoUpdate) {
            this.setupTickerClickHandlers();
        }
        
        // Reset scroll position and start animation
        this.state.scrollPosition = 0;
        this.startAnimation();
    }
    
    /**
     * Setup click handlers for ticker items
     */
    setupTickerClickHandlers() {
        if (!this.elements.ticker) {
            console.warn('TickerTape WARN: Cannot setup click handlers, ticker element not found.');
            return;
        }
        const tickerItems = this.elements.ticker.querySelectorAll('.ticker-item');
        tickerItems.forEach(item => {
            item.addEventListener('click', this.handleTickerClick);
            item.addEventListener('mouseenter', this.handleTickerHover);
        });
    }
    
    /**
     * Handle ticker item click with enhanced AI summary triggering
     * @param {Event} event - Click event
     */
    handleTickerClick(event) {
        try {
            const tickerItem = event.currentTarget;
            const symbol = tickerItem.dataset.symbol;
            
            if (!symbol || !this.isValidClick(event)) {
                return;
            }

            console.log(`TickerTape: Clicked on ${symbol}, triggering AI summary...`);

            // Visual feedback for clicked ticker
            this.addClickFeedback(tickerItem);

            // Emit symbol change event for other components
            this.emit('symbol-change', {
                symbol: symbol,
                data: this.state.tickerData[symbol] || {},
                source: 'ticker-click',
                timestamp: Date.now(),
                triggerAISummary: true // NEW: Flag for automatic AI summary
            });

            // Dispatch global symbol change event with AI trigger
            const symbolChangeEvent = new CustomEvent('symbol-changed', {
                detail: {
                    symbol: symbol,
                    previousSymbol: this.state.currentSymbol,
                    data: this.state.tickerData[symbol] || {},
                    source: 'ticker-tape',
                    triggerAISummary: true, // NEW: Enable automatic AI summary
                    fourBubbleMode: true,   // NEW: Enable four-bubble analysis
                    timestamp: Date.now()
                },
                bubbles: true
            });
            
            document.dispatchEvent(symbolChangeEvent);

            // Update current symbol
            this.state.currentSymbol = symbol;

            // Update page context
            this.updatePageContext(symbol, this.state.tickerData[symbol]);

            // Track symbol click for metrics
            this.trackSymbolClick(symbol);

            // NEW: Trigger chat interface AI summary if available
            this.triggerChatAISummary(symbol);

        } catch (error) {
            console.error('TickerTape: Error handling ticker click:', error);
            this.handleError(error, 'ticker-click');
        }
    }
    
    /**
     * NEW: Trigger AI summary in chat interface
     * @param {string} symbol - Stock symbol
     */
    triggerChatAISummary(symbol) {
        try {
            // Use the main app's chat trigger method (ChatModular system)
            if (window.FinanceHub && typeof window.FinanceHub.triggerAISummary === 'function') {
                console.log(`TickerTape: Triggering chat AI summary for ${symbol} via ChatModular`);
                
                window.FinanceHub.triggerAISummary({
                    symbol: symbol,
                    source: 'ticker-tape',
                    auto: true
                });
                
                // Dispatch event for metrics
                const chatEvent = new CustomEvent('ticker-triggered-chat-summary', {
                    detail: {
                        symbol: symbol,
                        source: 'ticker-tape',
                        timestamp: Date.now()
                    },
                    bubbles: true
                });
                
                document.dispatchEvent(chatEvent);
                
            } else {
                console.warn('TickerTape: FinanceHub app or triggerAISummary method not available');
            }
            
        } catch (error) {
            console.error('TickerTape: Error triggering chat AI summary:', error);
        }
    }

    /**
     * Add visual feedback for clicked ticker
     * @param {HTMLElement} tickerItem - Clicked ticker element
     */
    addClickFeedback(tickerItem) {
        try {
            // Add clicked class for visual feedback
            tickerItem.classList.add('ticker-clicked');
            
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'ticker-click-ripple';
            tickerItem.appendChild(ripple);
            
            // Remove feedback after animation
            setTimeout(() => {
                tickerItem.classList.remove('ticker-clicked');
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
            
        } catch (error) {
            console.error('TickerTape: Error adding click feedback:', error);
        }
    }
    
    /**
     * Update page context when symbol changes
     * @param {string} symbol - Selected symbol
     * @param {Object} symbolData - Symbol data
     */
    updatePageContext(symbol, symbolData) {
        try {
            // Update page title
            if (symbolData?.name) {
                document.title = `${symbol} - ${symbolData.name} | FinanceHub`;
            } else {
                document.title = `${symbol} | FinanceHub`;
            }
            
            // Update URL without page reload (if history API is available)
            if (window.history && window.history.pushState) {
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('symbol', symbol);
                window.history.pushState({ symbol }, '', newUrl);
            }
            
            // Update meta description for SEO
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription && symbolData) {
                const price = symbolData.price ? `$${symbolData.price}` : '';
                const change = symbolData.change ? `(${symbolData.change > 0 ? '+' : ''}${symbolData.change}%)` : '';
                metaDescription.content = `${symbol} stock analysis ${price} ${change}. Real-time financial data, AI insights, and market analysis.`;
            }
            
        } catch (error) {
            console.warn('TickerTapeUnified: Failed to update page context:', error);
        }
    }
    
    /**
     * Track symbol click for metrics
     * @param {string} symbol - Clicked symbol
     */
    trackSymbolClick(symbol) {
        try {
            // Track with internal metrics
            this.metrics.symbolClicks = (this.metrics.symbolClicks || 0) + 1;
            this.metrics.lastClickedSymbol = symbol;
            this.metrics.lastClickTime = Date.now();
            
            // External tracking (if available)
            if (typeof gtag === 'function') {
                gtag('event', 'symbol_click', {
                    'symbol': symbol,
                    'source': 'ticker_tape',
                    'value': this.state.tickerData[symbol]?.price || 0
                });
            }
            
        } catch (error) {
            console.warn('TickerTapeUnified: Metrics tracking failed:', error);
        }
    }
    
    /**
     * Handle ticker item hover
     */
    handleTickerHover(event) {
        const symbol = event.currentTarget.dataset.symbol;
        if (symbol) {
            // Emit hover event
            this.emit('tickerHover', { symbol, data: this.state.tickerData[symbol] });
        }
    }
    
    /**
     * Start animation
     */
    startAnimation() {
        if (this.state.isScrolling) return;
        
        this.state.isScrolling = true;
        this.animate();
    }
    
    /**
     * Stop animation
     */
    stopAnimation() {
        this.state.isScrolling = false;
        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
            this.state.animationFrame = null;
        }
    }
    
    /**
     * Pause animation
     */
    pauseAnimation() {
        this.stopAnimation();
    }
    
    /**
     * Resume animation
     */
    resumeAnimation() {
        if (!this.state.isPaused && this.autoUpdate) {
            this.startAnimation();
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        if (!this.state.isScrolling || !this.elements.ticker) return;
        
        // Apply CSS animation directly to ticker-content
        if (!this.elements.ticker.style.animation) {
            // Compute duration based on content width and desired speed (pixels/second)
            const contentWidth = this.elements.ticker.scrollWidth || 1000;
            const durationSeconds = Math.max(15, Math.round((contentWidth / this.animationSpeed) * 2)); // x2 slower

            // Use FinanceHub shared keyframes
            this.elements.ticker.style.animation = `fh-anim-ticker-scroll ${durationSeconds}s linear infinite`;
        }
        
        // Continue animation frame for responsiveness
        this.state.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        
        if (this.state.isPaused) {
            this.pauseAnimation();
            this.stopAutoUpdate();
            this.elements.pauseButton.querySelector('.control-icon').textContent = '▶️';
            this.updateStatus('Paused');
        } else {
            this.resumeAnimation();
            this.startAutoUpdate();
            this.elements.pauseButton.querySelector('.control-icon').textContent = '⏸️';
            this.updateStatus('Running');
        }
        
        // Emit pause state change
        this.emit('pauseStateChanged', { isPaused: this.state.isPaused });
    }
    
    /**
     * Refresh data
     */
    async refresh() {
        console.log('🔄 Refreshing ticker data...');
        
        // Add visual feedback
        this.elements.refreshButton.classList.add('spinning');
        
        try {
            await this.loadData();
        } finally {
            setTimeout(() => {
                this.elements.refreshButton.classList.remove('spinning');
            }, 1000);
        }
    }
    
    /**
     * Start auto-update
     */
    startAutoUpdate() {
        this.stopAutoUpdate(); // Clear any existing interval
        
        this.updateTimer = setInterval(() => {
            if (!this.state.isPaused && !document.hidden) {
                this.loadData();
            }
        }, this.updateInterval);
    }
    
    /**
     * Stop auto-update
     */
    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * Update status text
     */
    updateStatus(text) {
        if (this.elements.status) {
            this.elements.status.textContent = text;
        }
    }
    
    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        if (this.elements.lastUpdate && this.state.lastUpdate) {
            const timeString = this.state.lastUpdate.toLocaleTimeString();
            this.elements.lastUpdate.textContent = `Last update: ${timeString}`;
        }
    }
    
    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.ticker.innerHTML = `
            <div class="ticker-empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-message">No market data available</div>
                <button class="empty-retry-btn" onclick="this.closest('.ticker-tape-unified').tickerInstance.refresh()">
                    Retry
                </button>
            </div>
        `;
    }
    
    /**
     * Show error state
     */
    showErrorState() {
        if (!this.elements.ticker) return;
        
        this.elements.ticker.innerHTML = `
            <div class="ticker-error-state">
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span>Unable to load ticker data</span>
                    <button class="retry-btn" onclick="this.refresh()">Retry</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Handle errors
     */
    handleError(error, context) {
        this.state.errors.push({
            error: error.message,
            context,
            timestamp: new Date().toISOString()
        });
        
        this.metrics.errorCount++;
        
        console.error(`❌ TickerTapeUnified error in ${context}:`, error);
        
        // Emit error event
        this.emit('error', { error, context });
    }
    
    /**
     * Event emitter
     */
    emit(eventName, data) {
        const event = new CustomEvent(`tickerTape:${eventName}`, { detail: data });
        document.dispatchEvent(event);
        
        // Also emit on the container element
        if (this.elements.container) {
            this.elements.container.dispatchEvent(event);
        }
    }
    
    /**
     * Add event listener
     */
    on(eventName, callback) {
        const fullEventName = `tickerTape:${eventName}`;
        document.addEventListener(fullEventName, callback);
        
        // Store for cleanup
        if (!this.eventListeners.has(fullEventName)) {
            this.eventListeners.set(fullEventName, []);
        }
        this.eventListeners.get(fullEventName).push(callback);
    }
    
    /**
     * Remove event listener
     */
    off(eventName, callback) {
        const fullEventName = `tickerTape:${eventName}`;
        document.removeEventListener(fullEventName, callback);
        
        // Remove from stored listeners
        if (this.eventListeners.has(fullEventName)) {
            const listeners = this.eventListeners.get(fullEventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            ...this.state,
            config: this.api,
            metrics: this.metrics
        };
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            symbolCount: Object.keys(this.state.tickerData).length,
            isRunning: this.state.isScrolling && !this.state.isPaused,
            lastUpdate: this.state.lastUpdate
        };
    }
    
    /**
     * Destroy component
     */
    destroy() {
        console.log('🗑️ Destroying TickerTapeUnified...');
        
        // Stop animation and updates
        this.stopAnimation();
        this.stopAutoUpdate();
        
        // Remove event listeners
        this.eventListeners.forEach((listeners, eventName) => {
            listeners.forEach(callback => {
                document.removeEventListener(eventName, callback);
            });
        });
        this.eventListeners.clear();
        
        // Remove visibility change listener
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Clear DOM
        if (this.elements.container) {
            this.elements.container.innerHTML = '';
            this.elements.container.tickerInstance = null;
        }
        
        // Clear state
        this.state.isInitialized = false;
        this.elements = {};
        
        console.log('✅ TickerTapeUnified destroyed');
    }

    updateLoadingState(isLoading) {
        if (this.elements.container) {
            const loadingElement = this.elements.container.querySelector('.ticker-loading');
            if (loadingElement) {
                loadingElement.style.display = isLoading ? 'block' : 'none';
            }
        }
    }

    isValidClick(event) {
        // Implement your validation logic here
        return true; // Placeholder, actual implementation needed
    }
}

// Make globally available
window.TickerTapeUnified = TickerTapeUnified;

// CommonJS export (only if module exists)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TickerTapeUnified;
}

// ES6 module exports (only if supported)
if (typeof exports !== 'undefined') {
    try {
        exports.TickerTapeUnified = TickerTapeUnified;
        exports.default = TickerTapeUnified;
    } catch (e) {
        // ES6 exports not supported in this environment
    }
}

console.log('✅ TickerTapeUnified exported successfully (CommonJS + ES6 + Global)');

/* ============================================================================
 * END OF FILE: components/ticker-tape/ticker-tape.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/analysis-bubbles.js
 * SIZE: 41,305 bytes
 * ============================================================================ */

/**
 * FinanceHub Analysis Bubbles Manager v3.0.0
 * MAIN CONTROLLER for all 4 analysis bubbles
 * Manages: Company Overview, Financial Metrics, Technical Analysis, News Highlights
 * Features: Small/Fullscreen toggle, synchronized data updates, scrollable content
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-07
 */

class AnalysisBubbles {
    constructor(options = {}) {
        // --- AEVOREX PREMIUM DEBUG: apiClient dependency injection ---
        if (!options.apiClient) {
            throw new Error('AnalysisBubbles: `apiClient` is a required option and was not provided.');
        }
        this.apiClient = options.apiClient;

        // Configuration
        this.config = {
            // Support both old and new container IDs for compatibility
            containerId: options.containerId || 'fh-analysis-bubbles',
            legacyContainerId: 'analysis-bubbles-container',
            symbol: options.symbol || 'AAPL',
            isFullscreen: false,
            debug: options.debug || false
        };

        // State management
        this.state = {
            isInitialized: false,
            isLoading: false,
            currentSymbol: this.config.symbol,
            data: null,
            viewMode: 'compact', // compact | fullscreen
            activeTab: null // for fullscreen mode
        };

        // Bubble components
        this.bubbles = new Map();
        
        // Bubble definitions
        this.bubbleDefinitions = [
            {
                id: 'company-overview',
                title: 'Company Overview',
                icon: '',
                component: null
            },
            {
                id: 'financial-metrics', 
                title: 'Financial Metrics',
                icon: '',
                component: null
            },
            {
                id: 'technical-analysis',
                title: 'Technical Analysis', 
                icon: '',
                component: null
            },
            {
                id: 'news-highlights',
                title: 'News Highlights',
                icon: '',
                component: null
            }
        ];

        // Performance metrics
        this.metrics = {
            loadTime: 0,
            updates: 0,
            toggles: 0
        };

        // Initialize component
        this.init();
    }

    /**
     * Initialize the Analysis Bubbles system
     */
    async init() {
        try {
            console.log('🎯 AnalysisBubbles: Initializing 4-bubble system...');
            
            const startTime = performance.now();
            
            // Get container - try both new and legacy IDs
            this.container = document.getElementById(this.config.containerId);
            
            // If container not found with primary ID, try legacy ID
            if (!this.container) {
                this.container = document.getElementById(this.config.legacyContainerId);
                if (this.container) {
                    console.warn(`⚠️ Using legacy container ID: ${this.config.legacyContainerId}`);
                }
            }
            
            if (!this.container) {
                console.error(`❌ AnalysisBubbles: Container not found with ID ${this.config.containerId} or ${this.config.legacyContainerId}`);
                return;
            }

            // Create bubble container structure
            this.createBubbleStructure();

            // Initialize individual bubble components
            await this.initializeBubbleComponents();

            // Setup event listeners
            this.setupEventListeners();

            // REMOVED: Load initial data - this will be done separately after init completes
            // await this.loadData();

            this.state.isInitialized = true;
            this.metrics.loadTime = performance.now() - startTime;
            
            console.log(`✅ AnalysisBubbles: Initialized successfully in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('analysis-bubbles-initialized');

            // Load data AFTER successful initialization, in background
            setTimeout(() => {
                this.loadData().catch(error => {
                    console.warn('⚠️ AnalysisBubbles: Background data loading failed:', error);
                });
            }, 100);

        } catch (error) {
            console.error('❌ AnalysisBubbles: Initialization failed:', error);
            this.showErrorState(error);
        }
    }

    /**
     * Validate container exists
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`AnalysisBubbles: Container '${this.config.containerId}' not found`);
            return false;
        }
        return true;
    }

    /**
     * Create the HTML structure for bubble system
     */
    createBubbleStructure() {
        const container = document.getElementById(this.config.containerId);
        
        container.innerHTML = `
            <!-- Bubble Controls -->
            <div class="fh-bubble-controls bubble-controls">
                <div class="fh-bubble-controls__left bubble-controls-left">
                    <h2 class="fh-bubble-section-title bubble-section-title">Analysis</h2>
                </div>
                <div class="fh-bubble-controls__right bubble-controls-right">
                    <button class="fh-bubble-toggle-btn bubble-toggle-btn" data-action="toggle-view" title="Toggle Fullscreen">
                        <span class="fh-toggle-icon toggle-icon">${this.state.viewMode === 'compact' ? '⛶' : '⤜'}</span>
                        <span class="fh-toggle-text toggle-text">${this.state.viewMode === 'compact' ? 'Expand' : 'Compact'}</span>
                    </button>
                </div>
            </div>

            <!-- Compact View (default) -->
            <div class="fh-bubbles-compact-view bubbles-compact-view ${this.state.viewMode === 'compact' ? 'active' : 'hidden'}">
                <div class="fh-bubbles-grid bubbles-grid">
                    ${this.bubbleDefinitions.map(bubble => `
                        <div class="fh-analysis-bubble analysis-bubble fh-analysis-bubble--${bubble.id}" data-bubble-id="${bubble.id}" id="${bubble.id}-bubble">
                            <div class="fh-analysis-bubble__header bubble-header">
                                <div class="fh-analysis-bubble__icon bubble-icon">${bubble.icon}</div>
                                <h3 class="fh-analysis-bubble__title bubble-title">${bubble.title}</h3>
                                <div class="fh-analysis-bubble__loading bubble-loading hidden">⟳</div>
                            </div>
                            <div class="fh-analysis-bubble__content bubble-content scrollable" id="${bubble.id}-content">
                                <div class="fh-bubble-skeleton bubble-skeleton">
                                    ${bubble.id === 'company-overview' ? `
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--company-name company-name"></div>
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--company-stats company-stats short"></div>
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--company-desc company-desc"></div>
                                    ` : bubble.id === 'financial-metrics' ? `
                                        <div class="fh-skeleton-metrics-grid skeleton-metrics-grid">
                                            <div class="fh-skeleton-metric skeleton-metric">
                                                <div class="fh-skeleton-line skeleton-line fh-skeleton-line--metric-label metric-label short"></div>
                                                <div class="fh-skeleton-line skeleton-line fh-skeleton-line--metric-value metric-value"></div>
                                            </div>
                                            <div class="fh-skeleton-metric skeleton-metric">
                                                <div class="fh-skeleton-line skeleton-line fh-skeleton-line--metric-label metric-label short"></div>
                                                <div class="fh-skeleton-line skeleton-line fh-skeleton-line--metric-value metric-value"></div>
                                            </div>
                                        </div>
                                    ` : bubble.id === 'technical-analysis' ? `
                                        <div class="fh-skeleton-chart-placeholder skeleton-chart-placeholder"></div>
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--indicator-title indicator-title short"></div>
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--indicator-value indicator-value"></div>
                                    ` : bubble.id === 'news-highlights' ? `
                                        <div class="fh-skeleton-news-item skeleton-news-item">
                                            <div class="fh-skeleton-line skeleton-line fh-skeleton-line--news-title news-title"></div>
                                            <div class="fh-skeleton-line skeleton-line fh-skeleton-line--news-source news-source short"></div>
                                        </div>
                                        <div class="fh-skeleton-news-item skeleton-news-item">
                                            <div class="fh-skeleton-line skeleton-line fh-skeleton-line--news-title news-title"></div>
                                            <div class="fh-skeleton-line skeleton-line fh-skeleton-line--news-source news-source short"></div>
                                        </div>
                                    ` : `
                                        <div class="fh-skeleton-line skeleton-line"></div>
                                        <div class="fh-skeleton-line skeleton-line"></div>
                                        <div class="fh-skeleton-line skeleton-line fh-skeleton-line--short short"></div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Fullscreen View -->
            <div class="fh-bubbles-fullscreen-view bubbles-fullscreen-view ${this.state.viewMode === 'fullscreen' ? 'active' : 'hidden'}">
                <div class="fh-fullscreen-tabs fullscreen-tabs">
                    ${this.bubbleDefinitions.map((bubble, index) => `
                        <button class="fh-fullscreen-tab fullscreen-tab ${index === 0 ? 'active' : ''}" 
                                data-tab="${bubble.id}">
                            <span class="fh-tab-icon tab-icon">${bubble.icon}</span>
                            <span class="fh-tab-title tab-title">${bubble.title}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="fh-fullscreen-content-container fullscreen-content-container">
                    ${this.bubbleDefinitions.map((bubble, index) => `
                        <div class="fh-fullscreen-content fullscreen-content scrollable ${index === 0 ? 'active' : 'hidden'}" 
                             id="${bubble.id}-fullscreen-content" 
                             data-content="${bubble.id}">
                            <div class="fh-fullscreen-skeleton fullscreen-skeleton">
                                <div class="fh-skeleton-line skeleton-line"></div>
                                <div class="fh-skeleton-line skeleton-line"></div>
                                <div class="fh-skeleton-line skeleton-line fh-skeleton-line--short short"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        console.log('✅ AnalysisBubbles: Structure created');
    }

    /**
     * Initialize individual bubble components
     */
    async initializeBubbleComponents() {
        console.log('🔄 AnalysisBubbles: Initializing individual components...');

        // For now, we'll manage the content directly
        // Later we can integrate with specific components if needed
        this.bubbles.set('company-overview', { type: 'company-overview', initialized: true });
        this.bubbles.set('financial-metrics', { type: 'financial-metrics', initialized: true });
        this.bubbles.set('technical-analysis', { type: 'technical-analysis', initialized: true });
        this.bubbles.set('news-highlights', { type: 'news-highlights', initialized: true });

        console.log('✅ AnalysisBubbles: All bubble components initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const container = document.getElementById(this.config.containerId);

        // Toggle view mode button
        const toggleBtn = container.querySelector('[data-action="toggle-view"]');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleViewMode());
        }

        // Fullscreen tab switching
        const tabs = container.querySelectorAll('.fullscreen-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchFullscreenTab(targetTab);
            });
        });

        // Global symbol change events
        document.addEventListener('symbol-changed', (event) => {
            this.updateSymbol(event.detail.symbol);
        });

        console.log('✅ AnalysisBubbles: Event listeners setup');
    }

    /**
     * Toggle between compact and fullscreen view
     */
    toggleViewMode() {
        const newMode = this.state.viewMode === 'compact' ? 'fullscreen' : 'compact';
        this.setViewMode(newMode);
        this.metrics.toggles++;
        
        this.dispatchEvent('view-mode-changed', { 
            mode: newMode, 
            toggleCount: this.metrics.toggles 
        });
    }

    /**
     * Set view mode
     */
    setViewMode(mode) {
        this.state.viewMode = mode;
        
        const container = document.getElementById(this.config.containerId);
        const compactView = container.querySelector('.bubbles-compact-view');
        const fullscreenView = container.querySelector('.bubbles-fullscreen-view');
        const toggleBtn = container.querySelector('[data-action="toggle-view"]');

        if (mode === 'fullscreen') {
            compactView.classList.remove('active');
            compactView.classList.add('hidden');
            fullscreenView.classList.remove('hidden');
            fullscreenView.classList.add('active');
            
            if (toggleBtn) {
                toggleBtn.querySelector('.toggle-icon').textContent = '⤜';
                toggleBtn.querySelector('.toggle-text').textContent = 'Compact';
            }
            
            // Set first tab as active if none selected
            if (!this.state.activeTab) {
                this.switchFullscreenTab(this.bubbleDefinitions[0].id);
            }
        } else {
            fullscreenView.classList.remove('active');
            fullscreenView.classList.add('hidden');
            compactView.classList.remove('hidden');
            compactView.classList.add('active');
            
            if (toggleBtn) {
                toggleBtn.querySelector('.toggle-icon').textContent = '⛶';
                toggleBtn.querySelector('.toggle-text').textContent = 'Expand';
            }
        }

        console.log(`📱 AnalysisBubbles: View mode changed to ${mode}`);
    }

    /**
     * Switch active tab in fullscreen mode
     */
    switchFullscreenTab(tabId) {
        this.state.activeTab = tabId;
        
        const container = document.getElementById(this.config.containerId);
        
        // Update tab buttons
        const tabs = container.querySelectorAll('.fullscreen-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update content panels
        const contents = container.querySelectorAll('.fullscreen-content');
        contents.forEach(content => {
            if (content.dataset.content === tabId) {
                content.classList.remove('hidden');
                content.classList.add('active');
            } else {
                content.classList.add('hidden');
                content.classList.remove('active');
            }
        });

        console.log(`📱 AnalysisBubbles: Switched to tab ${tabId}`);
    }

    /**
     * Load initial data for the current symbol
     */
    async loadData() {
        console.log(`🔄 AnalysisBubbles: Loading data for ${this.state.currentSymbol}...`);
        this.updateLoadingState(true);

        // ===== AEVOREX PREMIUM UX FIX: SINGLE API CALL + DATA DISTRIBUTION =====
        // Load stock data once and distribute to all bubbles to eliminate redundancy
        try {
            // Single API call for stock data (eliminates 3x redundancy)
            const stockDataPromise = this.apiClient.getFundamentals(this.state.currentSymbol);
            
            // Separate news data call (different API endpoint)
            const newsDataPromise = this.loadNewsData();
            
            // Execute both concurrently
            const [stockData, newsResult] = await Promise.allSettled([stockDataPromise, newsDataPromise]);
            
            // Process stock data result
            if (stockData.status === 'fulfilled') {
                const data = stockData.value;
                console.log('✅ AnalysisBubbles: Stock data loaded successfully');
                
                // Distribute stock data to all three bubbles simultaneously
                await this.updateBubbleContents(data);
                
                // Only update NewsHighlights here if news is already present in the fundamentals payload
                if ((Array.isArray(data.news) && data.news.length > 0) || (data.news && Array.isArray(data.news.news) && data.news.news.length > 0)) {
                    this.updateNewsHighlights(data);
                }
                
                console.log('✅ AnalysisBubbles: Company Overview, Financial Metrics, Technical Analysis (and maybe News) updated');
            } else {
                console.error('❌ Stock data failed:', stockData.reason);
                this.showCompanyError();
                this.showFinancialError();
                this.showTechnicalError();
            }
            
            // Process news data result
            if (newsResult.status === 'fulfilled') {
                console.log('✅ AnalysisBubbles: News data loaded successfully');
            } else {
                console.warn('⚠️ AnalysisBubbles: News Highlights failed to load:', newsResult.reason);
            }
            
        } catch (error) {
            console.error('❌ AnalysisBubbles: Critical loading error:', error);
            this.showErrorInBubbles(error);
        }

        this.metrics.updates++;
        this.state.isLoading = false;
        this.updateLoadingState(false);
        
        console.log(`✅ AnalysisBubbles: All bubbles processed with optimized single API call`);
        
        this.dispatchEvent('data-loaded', { 
            symbol: this.state.currentSymbol,
            optimized: true
        });
    }

    /**
     * Load news highlights data
     */
    async loadNewsData() {
        try {
            const newsResponse = await this.apiClient.getNewsData(this.state.currentSymbol);
            console.log('📰 Raw news response:', newsResponse);
            
            // Fix: Backend returns {metadata, news_items: [], symbol}
            // Frontend expects the array directly
            let newsData = [];
            
            if (newsResponse) {
                // Try different response formats
                if (Array.isArray(newsResponse.news_items)) {
                    newsData = newsResponse.news_items;
                } else if (Array.isArray(newsResponse.news)) {
                    newsData = newsResponse.news;
                } else if (Array.isArray(newsResponse)) {
                    newsData = newsResponse;
                }
            }
            
            console.log(`📰 Processed news data: ${newsData.length} items`);
            
            this.updateNewsHighlights({ news: newsData });
            return { type: 'news', data: newsData };
        } catch (error) {
            console.error('❌ News data failed:', error);
            this.showNewsError();
            throw error;
        }
    }

    /**
     * Update all bubble contents with new data
     */
    async updateBubbleContents(stockData) {
        console.log('🔄 AnalysisBubbles: Updating bubble contents...');

        // Update Company Overview
        await this.updateCompanyOverview(stockData);
        
        // Update Financial Metrics (synchronous)
        this.updateFinancialMetrics(stockData);
        
        // Update Technical Analysis (async for chart-derived metrics)
        await this.updateTechnicalAnalysis(stockData);
        
        // Update News Highlights
        this.updateNewsHighlights(stockData);
        
        console.log('✅ AnalysisBubbles: All bubble contents updated');
    }

    /**
     * Update Company Overview bubble
     */
    async updateCompanyOverview(stockData) {
        const compactContent = document.getElementById('company-overview-content');
        const fullscreenContent = document.getElementById('company-overview-fullscreen-content');

        // Prefer nested `fundamentals_data`, but gracefully fall back to the root object when
        // the API wrapper (getFundamentals) already returns a flattened response.
        const fundamentalsData = stockData.fundamentals_data || stockData || {};
        const companyInfo = fundamentalsData.company_info || {};
        const profile = stockData.profile || companyInfo || {};
        const quote = stockData.quote || {};
        const priceData = stockData.price_data || {};

        // Extended fallback chain – covers snake_case keys and quote names
        const companyName =
            profile.companyName ||
            profile.company_name ||
            profile.name ||
            companyInfo.name ||
            priceData.company_name ||
            quote.shortName ||
            quote.longName ||
            quote.symbol ||
            stockData.symbol ||
            this.state.currentSymbol;
        let description = companyInfo.description || fundamentalsData.description || profile.description;
        if(description && description.startsWith('Financial data for')) description = '';
        const sector       = profile.sector    || companyInfo.sector   || fundamentalsData.sector   || priceData.sector;
        const industry     = profile.industry  || companyInfo.industry || fundamentalsData.industry || priceData.industry;
        const marketCapRaw = quote.marketCap   || priceData.market_cap;
        const marketCap    = this.formatMarketCap(marketCapRaw);
        const exchange     = profile.exchange  || companyInfo.exchange || priceData.exchange;
        const currency     = profile.currency  || priceData.currency;

        // If no real values yet, keep skeleton visible
        const hasMeaningfulValue = (val) => val !== undefined && val !== null && val !== '' && val !== 'N/A';
        if (!hasMeaningfulValue(companyName) && !hasMeaningfulValue(sector) && !hasMeaningfulValue(industry)) {
            return; // leave skeleton intact
        }

        const rows = [];
        if (hasMeaningfulValue(sector))    rows.push(`<div class=\"metric-row\"><span class=\"metric-label\">Sector:</span><span class=\"metric-value\">${sector}</span></div>`);
        if (hasMeaningfulValue(industry))  rows.push(`<div class=\"metric-row\"><span class=\"metric-label\">Industry:</span><span class=\"metric-value\">${industry}</span></div>`);
        if (hasMeaningfulValue(marketCap) && marketCap !== 'N/A') rows.push(`<div class=\"metric-row\"><span class=\"metric-label\">Market Cap:</span><span class=\"metric-value\">${marketCap}</span></div>`);
        if (hasMeaningfulValue(exchange))  rows.push(`<div class=\"metric-row\"><span class=\"metric-label\">Exchange:</span><span class=\"metric-value\">${exchange}</span></div>`);
        if (hasMeaningfulValue(currency))  rows.push(`<div class=\"metric-row\"><span class=\"metric-label\">Currency:</span><span class=\"metric-value\">${currency}</span></div>`);

        const descriptionHtml = hasMeaningfulValue(description) ? `<p class=\"company-description\">${description}</p>` : '';

        const content = `
            <div class=\"company-overview-data\">
                ${hasMeaningfulValue(companyName) ? `<h4>${companyName}</h4>` : ''}
                <div class=\"company-metrics\">${rows.join('')}</div>
                ${descriptionHtml}
            </div>`;

        if (compactContent) {
            compactContent.innerHTML = content;
        }
        if (fullscreenContent) {
            fullscreenContent.innerHTML = content;
        }
    }

    /**
     * Update Financial Metrics bubble
     */
    updateFinancialMetrics(stockData) {
        const compactContent = document.getElementById('financial-metrics-content');
        const fullscreenContent = document.getElementById('financial-metrics-fullscreen-content');

        const quote = stockData.quote || {};
        const priceData = stockData.price_data || {};
        const fundamentalsData = stockData.fundamentals_data || stockData || {};
        const financials = fundamentalsData.financials || stockData.financials || {};

        const rawMetrics = fundamentalsData.metrics || {};

        const hasValue = (v) => v !== undefined && v !== null && v !== '' && v !== 'N/A';

        // Helper – naive label formatter (snake_case → Title Case)
        const fmtLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Helper – value formatter
        const fmtValue = (key, val) => {
            if (!isFinite(val)) return val;
            // Currency-like (large numbers)
            if (['market_cap','revenue','net_income','total_assets','total_liabilities','total_equity','free_cash_flow'].includes(key) || Math.abs(val) > 1e8) {
                return this.formatCurrency(val);
            }
            // Percentage-like
            if (key.includes('margin') || key.includes('growth') || key.includes('yield')) {
                return (val * 100).toFixed(2) + '%';
            }
            // Ratio default
            return isFinite(val) ? Number(val).toFixed(2) : val;
        };

        const metrics = [];

        // Push high-level metrics first for prominence
        const push = (label, value) => metrics.push(`<div class=\"metric-row\"><span class=\"metric-row__label\">${label}</span><span class=\"metric-row__value\">${value}</span></div>`);

        if (hasValue(quote.marketCap || priceData.market_cap)) push('Market Cap', this.formatMarketCap(quote.marketCap || priceData.market_cap));
        if (hasValue(quote.volume    || priceData.volume))     push('Volume', this.formatVolume(quote.volume || priceData.volume));

        // Add every numeric metric from backend (~160)
        Object.entries(rawMetrics).forEach(([k,v])=>{
            if (!hasValue(v)) return;
            push(fmtLabel(k), fmtValue(k,v));
        });

        // Add fundamentals totals if not already present
        const fundPairs = {
            revenue: financials.revenue,
            'Net Income': financials.net_income,
            'Total Assets': financials.total_assets,
            'Total Liabilities': financials.total_liabilities
        };
        Object.entries(fundPairs).forEach(([label,val])=>{ if(hasValue(val)) push(label, this.formatCurrency(val));});

        if (!metrics.length) return; // still nothing → keep skeleton

        const content = `<div class="financial-metrics-data"><div class="metrics-grid">${metrics.join('')}</div></div>`;
        if (compactContent) {
            compactContent.innerHTML = content;
            const desc = compactContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
        if (fullscreenContent) {
            fullscreenContent.innerHTML = content;
            const desc = fullscreenContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
    }

    /**
     * Update Technical Analysis bubble
     */
    async updateTechnicalAnalysis(stockData) {
        const compactContent = document.getElementById('technical-analysis-content');
        const fullscreenContent = document.getElementById('technical-analysis-fullscreen-content');

        const symbolSafe = stockData.symbol || stockData.ticker || this.state?.currentSymbol || this.config.symbol || '';

        let weekHigh = stockData.week_52_high;
        let weekLow  = stockData.week_52_low;

        try {
            if ((!weekHigh || !weekLow) && window.FinanceHubAPIService) {
                if (symbolSafe) {
                    const chartResp = await window.FinanceHubAPIService.getStockChart(symbolSafe);
                    const prices = (chartResp.chart_data.ohlcv || []).map(p => p.close).filter(Boolean);
                    if (prices.length) {
                        weekHigh = Math.max(...prices);
                        weekLow  = Math.min(...prices);
                    }
                }
            }
        } catch (err) {
            console.warn('updateTechnicalAnalysis: cannot derive 52W range', err);
        }

        const beta   = stockData.beta || (stockData.fundamentals_data?.metrics?.beta);
        const volume = stockData.volume || stockData.price_data?.volume;

        const rows = [];
        const addRow = (label, value, formatterFn) => {
            if (value === undefined || value === null) return;
            const display = formatterFn ? formatterFn.call(this, value) : value;
            if (display !== undefined && display !== null && display !== 'N/A') {
                rows.push(`<div class="tech-item"><span class="tech-label">${label}</span><span class="tech-value">${display}</span></div>`);
            }
        };

        addRow('52W High', weekHigh, v => `$${v.toFixed(2)}`);
        addRow('52W Low',  weekLow,  v => `$${v.toFixed(2)}`);
        addRow('Beta',     beta,     v => (isNaN(v) ? v : v.toFixed(2)));
        addRow('Volume',   volume,   this.formatVolume);

        // 🔄 NEW: Fetch real technical indicators from backend endpoint
        let taIndicators = null;
        try {
            if (symbolSafe) {
                taIndicators = await this.apiClient.getTechnicalAnalysis(symbolSafe);
            }
        } catch(fetchErr){
            console.warn('TechnicalAnalysis: failed to fetch indicators', fetchErr);
        }

        const indicatorRows = [];
        if (taIndicators && taIndicators.technical_analysis) {
            const latest = taIndicators.technical_analysis.latest_indicators || {};
            const fmt = (v, dec = 2) => (v === null || v === undefined || isNaN(v)) ? null : Number.parseFloat(v).toFixed(dec);
            const push = (label, key, dec = 2) => {
                const val = fmt(latest[key], dec);
                if (val !== null) {
                    indicatorRows.push(`<div class=\"tech-item\"><span class=\"tech-label\">${label}</span><span class=\"tech-value\">${val}</span></div>`);
                }
            };

            // Most relevant indicators for quick view
            push('RSI',          'rsi');
            push('MACD Hist',    'macd_hist');
            push('Stoch %K',     'stoch_k');
            push('Stoch %D',     'stoch_d');
            push('SMA Short',    'sma_short');
            push('SMA Long',     'sma_long');
        }

        // Compose rows list: week high/low etc first
        const rowsCombined = [...rows, ...indicatorRows];
        if (!rowsCombined.length) return; // keep skeleton if still nothing

        const content = `<div class=\"technical-analysis-data\"><div class=\"technical-grid\">${rowsCombined.join('')}</div></div>`;
        if (compactContent) {
            compactContent.innerHTML = content;
            const desc = compactContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
        if (fullscreenContent) {
            fullscreenContent.innerHTML = content;
            const desc = fullscreenContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
    }

    /**
     * Update News Highlights bubble
     */
    updateNewsHighlights(stockData) {
        const compactContent = document.getElementById('news-highlights-content');
        const fullscreenContent = document.getElementById('news-highlights-fullscreen-content');

        let news = [];
        if (stockData.news) {
            news = Array.isArray(stockData.news) ? stockData.news : (stockData.news.news || []);
        }

        if (!Array.isArray(news) || news.length === 0) {
            // Leave skeleton; do NOT render "No recent news" placeholder
            return;
        }

        const newsHTML = news.slice(0, 5).map(item => `
            <article class="news-item">
                <h4 class="news-headline">${item.headline || item.title || 'No headline'}</h4>
                <p class="news-summary">${(item.summary || '').substring(0, 150)}${item.summary && item.summary.length > 150 ? '...' : ''}</p>
                <div class="news-meta">
                    <span class="news-date">${new Date(item.datetime || item.published_date || item.published_at).toLocaleDateString()}</span>
                    ${item.source ? `<span class="news-source">${item.source}</span>` : ''}
                </div>
            </article>
        `).join('');

        const content = `<div class="news-highlights-data">${newsHTML}</div>`;
        if (compactContent) {
            compactContent.innerHTML = content;
            const desc = compactContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
        if (fullscreenContent) {
            fullscreenContent.innerHTML = content;
            const desc = fullscreenContent.querySelector('.company-description');
            if (desc) desc.addEventListener('click', () => desc.classList.toggle('expanded'));
        }
    }

    /**
     * Update symbol for all bubbles
     */
    async updateSymbol(symbol) {
        if (symbol === this.state.currentSymbol) return;
        
        this.state.currentSymbol = symbol;
        console.log(`🔄 AnalysisBubbles: Updating symbol to ${symbol}`);
        
        await this.loadData();
    }

    /**
     * Update all bubbles with provided stock data
     * Called by the main app when new data is available
     */
    updateData(stockData) {
        console.log('🔄 AnalysisBubbles: Updating with new stock data:', stockData);
        
        if (!stockData || stockData.error) {
            this.showErrorInBubbles(stockData?.error || new Error('No data available'));
            return;
        }
        
        try {
            // Update each bubble with the new data
            this.updateCompanyOverview(stockData);
            this.updateFinancialMetrics(stockData);
            this.updateTechnicalAnalysis(stockData);
            
            // Only update news if we have actual news data to prevent empty warnings
            const hasNewsData = stockData.news && (
                (Array.isArray(stockData.news) && stockData.news.length > 0) ||
                (stockData.news.news && Array.isArray(stockData.news.news) && stockData.news.news.length > 0)
            );
            
            if (hasNewsData) {
                this.updateNewsHighlights(stockData);
                console.log('✅ AnalysisBubbles: Company Overview, Financial Metrics, Technical Analysis and News updated');
            } else {
                console.log('✅ AnalysisBubbles: Company Overview, Financial Metrics, Technical Analysis updated (News pending)');
            }
        } catch (error) {
            console.error('❌ AnalysisBubbles: Error updating bubbles:', error);
            this.showErrorInBubbles(error);
        }
    }

    /**
     * Alias method for updateData to maintain compatibility with app-class.js
     * Called by the main app when new data is available
     */
    updateWithStockData(stockData) {
        console.log('🔄 AnalysisBubbles: updateWithStockData called (compatibility alias)');
        return this.updateData(stockData);
    }

    /**
     * Update loading state for all bubbles
     */
    updateLoadingState(isLoading) {
        const container = document.getElementById(this.config.containerId);
        const loadingIndicators = container.querySelectorAll('.bubble-loading');
        
        loadingIndicators.forEach(indicator => {
            if (isLoading) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        });
    }

    /**
     * Show error state in all bubbles
     */
    showErrorInBubbles(error) {
        const errorContent = `
            <div class="bubble-error">
                <div class="error-icon">!</div>
                <div class="error-message">Failed to load data</div>
                <div class="error-details">${error.message}</div>
                <button class="error-retry" onclick="window.financeHubApp?.components?.get('analysis-bubbles')?.loadData()">
                    Retry
                </button>
            </div>
        `;

        this.bubbleDefinitions.forEach(bubble => {
            const compactContent = document.getElementById(`${bubble.id}-content`);
            const fullscreenContent = document.getElementById(`${bubble.id}-fullscreen-content`);
            
            if (compactContent) compactContent.innerHTML = errorContent;
            if (fullscreenContent) fullscreenContent.innerHTML = errorContent;
        });
    }

    /**
     * Show general error state
     */
    showErrorState(error) {
        const container = document.getElementById(this.config.containerId);
        container.innerHTML = `
            <div class="analysis-bubbles-error">
                <div class="error-icon">!</div>
                <h3>Analysis Bubbles Unavailable</h3>
                <p>Failed to initialize analysis bubbles: ${error.message}</p>
                <button onclick="location.reload()">Refresh Page</button>
            </div>
        `;
    }

    /* --------------------------------------------------
       Utility formatters (restored)
    -------------------------------------------------- */
    formatMarketCap(value){
        if(!value||value===0) return 'N/A';
        if(value>=1e12) return `$${(value/1e12).toFixed(2)}T`;
        if(value>=1e9)  return `$${(value/1e9).toFixed(2)}B`;
        if(value>=1e6)  return `$${(value/1e6).toFixed(2)}M`;
        return `$${value.toLocaleString()}`;
    }

    formatCurrency(value){
        return this.formatMarketCap(value); // same formatting rules
    }

    formatVolume(value){
        if(!value||value===0) return 'N/A';
        if(value>=1e9) return `${(value/1e9).toFixed(2)}B`;
        if(value>=1e6) return `${(value/1e6).toFixed(2)}M`;
        if(value>=1e3) return `${(value/1e3).toFixed(2)}K`;
        return value.toLocaleString();
    }

    formatAnalystRating(rating){
        if(!rating) return 'N/A';
        const n=parseFloat(rating);
        if(n<=1.5) return 'Strong Buy';
        if(n<=2.5) return 'Buy';
        if(n<=3.5) return 'Hold';
        if(n<=4.5) return 'Sell';
        return 'Strong Sell';
    }

    /** Dispatch custom events */
    dispatchEvent(eventName,detail={}){
        document.dispatchEvent(new CustomEvent(eventName,{detail:{...detail,component:'analysis-bubbles'}}));
    }

    getMetrics(){return {...this.metrics};}
    getState(){return {...this.state};}

    destroy(){
        this.bubbles?.clear?.();
        console.log('AnalysisBubbles: Destroyed');
    }
}

// Global reg & export
if(typeof window!=='undefined'){
    window.AnalysisBubbles = window.AnalysisBubbles || AnalysisBubbles;
}
// REMOVED EXPORT: export { AnalysisBubbles };
// REMOVED EXPORT: export default AnalysisBubbles;

console.log('✅ AnalysisBubbles exported successfully (ES6 + Global)');

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/analysis-bubbles.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/company-overview/company-overview.js
 * SIZE: 24,416 bytes
 * ============================================================================ */

/**
 * FinanceHub Company Overview Bubble v3.0.0
 * ENTERPRISE-GRADE Company Analysis Component
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-02
 */

class CompanyOverviewBubble {
    constructor(options = {}) {
        // Configuration
        this.config = {
            containerId: options.containerId || 'company-overview-bubble',
            symbol: options.symbol || 'AAPL',
            refreshInterval: options.refreshInterval || 300000, // 5 minutes
            apiBaseUrl: options.apiBaseUrl || '/api/v1',
            debug: options.debug || false
        };

        // State management
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            data: null,
            error: null,
            lastUpdate: null
        };

        // Performance metrics
        this.metrics = {
            loadTime: 0,
            errors: 0,
            updates: 0,
            cacheHits: 0
        };

        // API client
        this.apiClient = window.FinanceHub?.components?.api || new FinanceHubAPIService();

        // Event handlers
        this.eventHandlers = new Map();

        // Auto-refresh timer
        this.refreshTimer = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the component
     */
    async init() {
        try {
            console.log('CompanyOverviewBubble: Initializing...');
            
            // Validate container
            if (!this.validateContainer()) {
                throw new Error(`Container '${this.config.containerId}' not found`);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            this.state.isInitialized = true;
            console.log('CompanyOverviewBubble: Initialized successfully');
            this.dispatchEvent('company-overview-initialized');

        } catch (error) {
            console.error('CompanyOverviewBubble: Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Validate container exists and ensure required CSS classes for styling
     * @returns {boolean} Container is valid
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`CompanyOverviewBubble: Container '${this.config.containerId}' not found`);
            return false;
        }
        // 🔧 Ensure base styling classes are present – avoids "unstyled" bubble if initial HTML differs
        container.classList.add('fh-analysis-bubble');
        container.classList.add('fh-analysis-bubble--company-overview');
        return true;
    }

    /**
     * Load company overview data - VALÓS BACKEND ADATOK
     */
    async loadData() {
        if (this.state.isLoading) {
            console.log('CompanyOverviewBubble: Data loading already in progress');
            return;
        }

        // 🔍 ENHANCED DEBUG LOGGING
        console.log('🏢 CompanyOverview DEBUG: Starting data load process...');
        console.log('🔗 CompanyOverview DEBUG: API Client available:', !!this.apiClient);
        console.log('📈 CompanyOverview DEBUG: Current symbol:', this.state.currentSymbol);

        this.state.isLoading = true;
        this.updateLoadingState(true);
        
        const startTime = performance.now();

        try {
            console.log(`🔄 CompanyOverview DEBUG: Calling backend API getStockFundamentals(${this.state.currentSymbol})...`);
            
            // Fetch fundamentals data from backend
            const fundamentalsData = await this.apiClient.getStockFundamentals(this.state.currentSymbol);
            
            console.log('📊 CompanyOverview DEBUG: Raw API response:', fundamentalsData);
            console.log('📋 CompanyOverview DEBUG: Response type:', typeof fundamentalsData);
            console.log('📦 CompanyOverview DEBUG: Has company_info?', !!(fundamentalsData?.company_info));
            console.log('📦 CompanyOverview DEBUG: Has financials?', !!(fundamentalsData?.financials));
            console.log('📦 CompanyOverview DEBUG: Has metrics?', !!(fundamentalsData?.metrics));
            
            if (!fundamentalsData) {
                console.error('❌ CompanyOverview CRITICAL: No fundamentals data received!');
                console.error('❌ CompanyOverview CRITICAL: This component requires REAL BACKEND DATA - NO MOCK FALLBACK');
                throw new Error('No fundamentals data received from backend - REAL API REQUIRED');
            }

            console.log('✅ CompanyOverview SUCCESS: Received fundamentals data from backend');

            // Process and validate data
            this.state.data = this.processFundamentalsData(fundamentalsData);
            this.state.lastUpdate = Date.now();
            
            console.log('🎯 CompanyOverview SUCCESS: Data processed successfully');
            console.log('📋 CompanyOverview DEBUG: Processed company name:', this.state.data?.name);
            console.log('📋 CompanyOverview DEBUG: Processed sector:', this.state.data?.sector);
            
            // Update metrics
            this.metrics.loadTime = performance.now() - startTime;
            this.metrics.updates++;
            
            // Render the component
            this.render();
            
            console.log(`⚡ CompanyOverview PERFORMANCE: Load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('company-overview-loaded', {
                symbol: this.state.currentSymbol,
                loadTime: this.metrics.loadTime
            });

        } catch (error) {
            console.error('🚨 CompanyOverview FATAL ERROR: Failed to load company data');
            console.error('🚨 CompanyOverview ERROR DETAILS:', {
                message: error.message,
                stack: error.stack,
                symbol: this.state.currentSymbol,
                apiClient: !!this.apiClient,
                timestamp: new Date().toISOString()
            });
            console.error('🚨 CompanyOverview NOTE: This component requires REAL BACKEND - NO MOCK FALLBACK EXISTS');
            
            this.handleError(error, 'data-loading');
            
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Process fundamentals data - STRICT VALIDATION
     * @param {Object} rawData - Raw fundamentals data from API
     * @returns {Object} Processed company overview data
     */
    processFundamentalsData(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            throw new Error('Invalid fundamentals data format');
        }

        // Extract company information
        const companyInfo = rawData.company_info || {};
        const financials = rawData.financials || {};
        const metrics = rawData.metrics || {};
        const profile = rawData.profile || {};

        return {
            // Basic company information
            symbol: this.state.currentSymbol,
            name: companyInfo.name || companyInfo.company_name || profile.company_name || companyInfo.longName || 'N/A',
            exchange: companyInfo.exchange || companyInfo.exchangeShortName || profile.exchange || 'N/A',
            sector: companyInfo.sector || companyInfo.sectorKey || profile.sector || 'N/A',
            industry: companyInfo.industry || companyInfo.industryKey || profile.industry || 'N/A',
            
            // Company description and details
            description: companyInfo.description || companyInfo.longBusinessSummary || profile.description || 'No description available',
            website: companyInfo.website || companyInfo.websiteUrl || profile.website || null,
            headquarters: companyInfo.headquarters || companyInfo.city || companyInfo.address1 || profile.headquarters || 'N/A',
            founded: companyInfo.founded_year || companyInfo.founded || profile.founded_year || null,
            employees: companyInfo.employees || companyInfo.fullTimeEmployees || profile.employee_count || null,
            
            // Key financial metrics
            marketCap: this.formatMarketCap(metrics.market_cap || financials.market_cap),
            revenue: this.formatCurrency(financials.revenue || financials.total_revenue),
            netIncome: this.formatCurrency(financials.net_income),
            totalAssets: this.formatCurrency(financials.total_assets),
            totalDebt: this.formatCurrency(financials.total_debt),
            
            // Valuation metrics
            peRatio: this.formatRatio(metrics.pe_ratio || metrics.price_to_earnings),
            pbRatio: this.formatRatio(metrics.pb_ratio || metrics.price_to_book),
            psRatio: this.formatRatio(metrics.ps_ratio || metrics.price_to_sales),
            pegRatio: this.formatRatio(metrics.peg_ratio),
            
            // Profitability metrics
            grossMargin: this.formatPercentage(metrics.gross_margin),
            operatingMargin: this.formatPercentage(metrics.operating_margin),
            netMargin: this.formatPercentage(metrics.net_margin),
            roe: this.formatPercentage(metrics.roe || metrics.return_on_equity),
            roa: this.formatPercentage(metrics.roa || metrics.return_on_assets),
            
            // Growth metrics
            revenueGrowth: this.formatPercentage(metrics.revenue_growth),
            earningsGrowth: this.formatPercentage(metrics.earnings_growth),
            
            // Other metrics
            beta: this.formatRatio(metrics.beta),
            dividendYield: this.formatPercentage(metrics.dividend_yield),
            
            // Metadata
            lastUpdate: new Date().toISOString(),
            dataQuality: rawData.metadata?.data_quality || 'unknown'
        };
    }

    /**
     * Render the company overview bubble
     */
    render() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.state.data) return;

        const data = this.state.data;

        container.innerHTML = `
            <div class="company-overview-content">
                <div class="company-header">
                    <div class="company-title">
                        <h3 class="company-name">${data.name}</h3>
                        <div class="company-meta">
                            <span class="symbol">${data.symbol}</span>
                            <span class="exchange">${data.exchange}</span>
                        </div>
                    </div>
                    <div class="company-sector">
                        <span class="sector">${data.sector}</span>
                        <span class="industry">${data.industry}</span>
                    </div>
                </div>

                <div class="company-description">
                    <p>${this.truncateText(data.description, 200)}</p>
                    ${data.website ? `<a href="${data.website}" target="_blank" class="website-link">Visit Website</a>` : ''}
                </div>

                <div class="company-details">
                    <div class="detail-row">
                        <span class="label">Headquarters:</span>
                        <span class="value">${data.headquarters}</span>
                    </div>
                    ${data.founded ? `
                        <div class="detail-row">
                            <span class="label">Founded:</span>
                            <span class="value">${data.founded}</span>
                        </div>
                    ` : ''}
                    ${data.employees ? `
                        <div class="detail-row">
                            <span class="label">Employees:</span>
                            <span class="value">${this.formatNumber(data.employees)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="financial-highlights">
                    <h4>Financial Highlights</h4>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <span class="metric-label">Market Cap</span>
                            <span class="metric-value">${data.marketCap}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Revenue</span>
                            <span class="metric-value">${data.revenue}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Net Income</span>
                            <span class="metric-value">${data.netIncome}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">P/E Ratio</span>
                            <span class="metric-value">${data.peRatio}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">ROE</span>
                            <span class="metric-value">${data.roe}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Beta</span>
                            <span class="metric-value">${data.beta}</span>
                        </div>
                    </div>
                </div>

                <div class="data-footer">
                    <span class="last-update">Updated: ${this.formatTimestamp(data.lastUpdate)}</span>
                    <span class="data-quality">Quality: ${data.dataQuality}</span>
                </div>
            </div>
        `;

        // Add click handlers
        this.setupInteractionHandlers();
    }

    /**
     * Setup interaction handlers
     */
    setupInteractionHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Website link handler
        const websiteLink = container.querySelector('.website-link');
        if (websiteLink) {
            websiteLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(websiteLink.href, '_blank', 'noopener,noreferrer');
            });
        }

        // Metric click handlers for detailed view
        const metricItems = container.querySelectorAll('.metric-item');
        metricItems.forEach(item => {
            item.addEventListener('click', () => {
                const label = item.querySelector('.metric-label')?.textContent;
                const value = item.querySelector('.metric-value')?.textContent;
                this.showMetricDetail(label, value);
            });
        });
    }

    /**
     * Show metric detail popup
     * @param {string} label - Metric label
     * @param {string} value - Metric value
     */
    showMetricDetail(label, value) {
        // This could open a modal or tooltip with more detailed information
        console.log(`CompanyOverviewBubble: Metric detail requested - ${label}: ${value}`);
        this.dispatchEvent('metric-detail-requested', { label, value });
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        console.log(`CompanyOverviewBubble: Changing symbol from ${this.state.currentSymbol} to ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.data = null;
        
        // Clear existing content
        this.showLoadingState();
        
        // Load new data
        await this.loadData();
        
        this.dispatchEvent('symbol-changed', { symbol });
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (!this.state.isLoading) {
                console.log('CompanyOverviewBubble: Auto-refreshing data...');
                this.loadData();
            }
        }, this.config.refreshInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for symbol changes from other components
        document.addEventListener('symbol-changed', (event) => {
            if (event.detail && event.detail.symbol) {
                this.changeSymbol(event.detail.symbol);
            }
        });

        // Listen for theme changes
        document.addEventListener('theme-changed', (event) => {
            if (this.state.data) {
                this.render(); // Re-render with new theme
            }
        });
    }

    /**
     * Update loading state
     * @param {boolean} isLoading - Loading state
     */
    updateLoadingState(isLoading) {
        if (isLoading) {
            this.showLoadingState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="company-overview-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading company overview...</div>
            </div>
        `;
    }

    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        this.state.error = {
            message: error.message,
            context: context,
            timestamp: Date.now()
        };
        
        this.metrics.errors++;
        
        // Log detailed error information
        console.error(`CompanyOverviewBubble Error [${context}]:`, {
            error: error.message,
            stack: error.stack,
            symbol: this.state.currentSymbol,
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            containerId: this.config.containerId
        });
        
        // Show error message to user
        this.showErrorMessage(error.message, context);
        
        // Dispatch error event for centralized handling
        this.dispatchEvent('company-overview-error', {
            error: error.message,
            context: context,
            symbol: this.state.currentSymbol
        });
    }

    /**
     * Show error message in the bubble
     * @param {string} message - Error message
     * @param {string} context - Error context
     */
    showErrorMessage(message, context) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        const contextMessages = {
            'initialization': 'Failed to initialize company overview component',
            'data-loading': 'Unable to load company data from server',
            'api-error': 'Company data API temporarily unavailable',
            'network-error': 'Network connection error - check internet connection'
        };

        const userMessage = contextMessages[context] || 'An error occurred while loading company overview';

        container.innerHTML = `
            <div class="company-overview-error-state">
                <div class="error-header">
                    <div class="error-icon">🏢</div>
                    <h3>Company Data Unavailable</h3>
                </div>
                <div class="error-content">
                    <p class="error-message">${userMessage}</p>
                    <p class="error-details">Error: ${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="window.companyOverviewBubble?.loadData()">
                            🔄 Retry Loading
                        </button>
                        <button class="refresh-page-button" onclick="window.location.reload()">
                            ↻ Refresh Page
                        </button>
                    </div>
                </div>
                <div class="error-footer">
                    <span class="error-time">Error occurred at: ${new Date().toLocaleTimeString()}</span>
                    <span class="error-symbol">Symbol: ${this.state.currentSymbol}</span>
                </div>
            </div>
        `;
    }

    // Utility formatting methods
    formatMarketCap(value) {
        if (!value || isNaN(value)) return 'N/A';
        const num = parseFloat(value);
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toLocaleString()}`;
    }

    formatCurrency(value) {
        if (!value || isNaN(value)) return 'N/A';
        const num = parseFloat(value);
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toLocaleString()}`;
    }

    formatRatio(value) {
        if (!value || isNaN(value)) return 'N/A';
        return parseFloat(value).toFixed(2);
    }

    formatPercentage(value) {
        if (!value || isNaN(value)) return 'N/A';
        return `${(parseFloat(value) * 100).toFixed(2)}%`;
    }

    formatNumber(value) {
        if (!value || isNaN(value)) return 'N/A';
        return parseInt(value).toLocaleString();
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Get current metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Destroy component
     */
    destroy() {
        console.log('CompanyOverviewBubble: Destroying...');
        
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear container
        const container = document.getElementById(this.config.containerId);
        if (container) {
            container.innerHTML = '';
        }
        
        // Clear state
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: null,
            data: null,
            error: null,
            lastUpdate: null
        };
        
        console.log('CompanyOverviewBubble: Destroyed');
    }
}

// Export for global use
window.CompanyOverviewBubble = CompanyOverviewBubble;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompanyOverviewBubble;
}

// ES6 export for modern modules
// REMOVED EXPORT: export { CompanyOverviewBubble };
// REMOVED EXPORT: export default CompanyOverviewBubble;

console.log('✅ CompanyOverviewBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('company-overview-bubble');
    if (container && !window.companyOverview) {
        console.log('CompanyOverviewBubble: Auto-initializing...');
        window.companyOverview = new CompanyOverviewBubble();
    }
}); 

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/company-overview/company-overview.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/financial-metrics/financial-metrics.js
 * SIZE: 36,093 bytes
 * ============================================================================ */

/**
 * FinanceHub Financial Metrics Bubble v3.0.0
 * ENTERPRISE-GRADE Financial Analysis Component
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-02
 */

class FinancialMetricsBubble {
    constructor(options = {}) {
        // Configuration
        this.config = {
            containerId: options.containerId || 'financial-metrics-bubble',
            symbol: options.symbol || 'AAPL',
            refreshInterval: options.refreshInterval || 300000, // 5 minutes
            apiBaseUrl: options.apiBaseUrl || '/api/v1',
            debug: options.debug || false
        };

        // State management
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            data: null,
            error: null,
            lastUpdate: null
        };

        // Performance metrics
        this.metrics = {
            loadTime: 0,
            errors: 0,
            updates: 0,
            cacheHits: 0
        };

        // API client
        this.apiClient = window.FinanceHub?.components?.api || new FinanceHubAPIService();

        // Auto-refresh timer
        this.refreshTimer = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the component
     */
    async init() {
        try {
            console.log('FinancialMetricsBubble: Initializing...');
            
            // Validate container
            if (!this.validateContainer()) {
                throw new Error(`Container '${this.config.containerId}' not found`);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            this.state.isInitialized = true;
            console.log('FinancialMetricsBubble: Initialized successfully');
            this.dispatchEvent('financial-metrics-initialized');

        } catch (error) {
            console.error('FinancialMetricsBubble: Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Validate container exists and ensure required CSS classes for styling
     * @returns {boolean} Container is valid
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`FinancialMetricsBubble: Container '${this.config.containerId}' not found`);
            return false;
        }
        // 🔧 Ensure base styling classes are present – avoids "unstyled" bubble if initial HTML differs
        container.classList.add('fh-analysis-bubble');
        container.classList.add('fh-analysis-bubble--financial-metrics');
        return true;
    }

    /**
     * Load financial metrics data - VALÓS BACKEND ADATOK
     */
    async loadData(forceRefresh = false) {
        if (this.state.isLoading) {
            console.log('FinancialMetricsBubble: Data loading already in progress');
            return;
        }

        // 🔍 ENHANCED DEBUG LOGGING
        console.log('💰 FinancialMetrics DEBUG: Starting data load process...');
        console.log('🔗 FinancialMetrics DEBUG: API Client available:', !!this.apiClient);
        console.log('📈 FinancialMetrics DEBUG: Current symbol:', this.state.currentSymbol);

        this.state.isLoading = true;
        this.updateLoadingState(true);
        
        const startTime = performance.now();

        try {
            console.log('🔄 FinancialMetrics DEBUG: Fetching fundamentals data...');
            
            // Fetch fundamentals data from backend
            const fundamentalsData = await this.apiClient.getStockFundamentals(this.state.currentSymbol, forceRefresh);
            
            console.log('📊 FinancialMetrics DEBUG: Raw fundamentals response:', fundamentalsData);
            console.log('📋 FinancialMetrics DEBUG: Fundamentals type:', typeof fundamentalsData);
            console.log('📦 FinancialMetrics DEBUG: Has fundamentals data?', !!fundamentalsData);
            
            if (!fundamentalsData) {
                console.error('❌ FinancialMetrics CRITICAL: No fundamentals data received!');
                console.error('❌ FinancialMetrics CRITICAL: This component requires real backend data – no fallback');
                throw new Error('No fundamentals data received from backend - REAL API REQUIRED');
            }

            console.log('✅ FinancialMetrics SUCCESS: Received data from backend');

            // Process and validate data
            this.state.data = this.processFinancialData(fundamentalsData);
            this.state.lastUpdate = Date.now();
            
            console.log('🎯 FinancialMetrics SUCCESS: Data processed successfully');
            console.log('📋 FinancialMetrics DEBUG: Processed valuation metrics:', Object.keys(this.state.data?.valuation || {}));
            console.log('📋 FinancialMetrics DEBUG: Processed profitability metrics:', Object.keys(this.state.data?.profitability || {}));
            
            // Update metrics
            this.metrics.loadTime = performance.now() - startTime;
            this.metrics.updates++;
            
            // Render the component
            this.render();
            
            console.log(`⚡ FinancialMetrics PERFORMANCE: Load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('financial-metrics-loaded', {
                symbol: this.state.currentSymbol,
                loadTime: this.metrics.loadTime
            });

        } catch (error) {
            console.error('🚨 FinancialMetrics FATAL ERROR: Failed to load financial data');
            console.error('🚨 FinancialMetrics ERROR DETAILS:', {
                message: error.message,
                stack: error.stack,
                symbol: this.state.currentSymbol,
                apiClient: !!this.apiClient,
                timestamp: new Date().toISOString()
            });
            console.error('🚨 FinancialMetrics NOTE: Real backend data required – fallback path disabled');
            
            this.handleError(error, 'data-loading');
            
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Process financial data - STRICT VALIDATION
     * @param {Object} fundamentalsData - Fundamentals data from API
     * @returns {Object} Processed financial metrics data
     */
    processFinancialData(fundamentalsData) {
        if (!fundamentalsData || typeof fundamentalsData !== 'object') {
            throw new Error('Invalid fundamentals data format');
        }

        // Ensure backward-compat variable alias so legacy code referencing `ratios.*` does not break.
        // We treat `ratios` as identical to `metrics` until full refactor is done.
        const metrics = fundamentalsData.metrics || fundamentalsData.financial_metrics || {};
        const ratios = metrics; // 👈 NEW alias to eliminate ReferenceError
        const financials = fundamentalsData.financials || {};

        console.log('🔍 ProcessFinancialData DEBUG: Input data structure:', {
            fundamentalsKeys: Object.keys(fundamentalsData),
            hasFinancials: !!fundamentalsData.financials,
            hasMetrics: !!fundamentalsData.metrics,
            hasFinancialMetrics: !!fundamentalsData.financial_metrics
        });

        // 🧮 CALCULATE P/E RATIO from available data like in api.js
        let calculated_pe_ratio = null;
        const market_cap = fundamentalsData.market_cap || financials.market_cap;
        const net_income = financials.latest_annual_net_income || financials.net_income;
        
        if (market_cap && net_income && net_income > 0) {
            calculated_pe_ratio = market_cap / net_income;
            console.log(`📊 FinancialMetrics: Calculated P/E ratio: ${calculated_pe_ratio.toFixed(2)} (Market Cap: ${market_cap}, Net Income: ${net_income})`);
        }

        // 🧮 CALCULATE additional metrics from financials data
        let calculated_profit_margin = null;
        const revenue = financials.latest_annual_revenue || financials.revenue;
        if (net_income && revenue && revenue > 0) {
            calculated_profit_margin = (net_income / revenue) * 100;
            console.log(`📊 FinancialMetrics: Calculated profit margin: ${calculated_profit_margin.toFixed(2)}%`);
        }

        let calculated_debt_to_equity = null;
        const total_debt = financials.total_debt || financials.total_liabilities;
        const total_equity = financials.total_equity || (financials.total_assets - financials.total_liabilities);
        if (total_debt && total_equity && total_equity > 0) {
            calculated_debt_to_equity = total_debt / total_equity;
            console.log(`📊 FinancialMetrics: Calculated debt-to-equity: ${calculated_debt_to_equity.toFixed(2)}`);
        }

        console.log('🎯 ProcessFinancialData DEBUG: Available financial data:', {
            market_cap,
            net_income,
            revenue,
            total_debt,
            total_equity,
            calculated_pe_ratio,
            calculated_profit_margin,
            calculated_debt_to_equity
        });

        return {
            symbol: this.state.currentSymbol,
            
            // Valuation Metrics - ENHANCED WITH CALCULATED VALUES
            valuation: {
                peRatio: this.formatRatio(calculated_pe_ratio || metrics.pe_ratio || metrics.price_to_earnings),
                pegRatio: this.formatRatio(metrics.peg_ratio),
                pbRatio: this.formatRatio(metrics.pb_ratio || metrics.price_to_book),
                psRatio: this.formatRatio(metrics.ps_ratio || metrics.price_to_sales),
                evEbitda: this.formatRatio(metrics.ev_ebitda),
                priceToFcf: this.formatRatio(metrics.price_to_fcf),
            },

            // Profitability Metrics - ENHANCED WITH CALCULATED VALUES
            profitability: {
                grossMargin: this.formatPercentage(metrics.gross_margin),
                operatingMargin: this.formatPercentage(metrics.operating_margin),
                netMargin: this.formatPercentage(calculated_profit_margin || metrics.net_margin),
                ebitdaMargin: this.formatPercentage(metrics.ebitda_margin),
                roe: this.formatPercentage(metrics.roe || metrics.return_on_equity),
                roa: this.formatPercentage(metrics.roa || metrics.return_on_assets),
                roic: this.formatPercentage(metrics.roic)
            },

            // Liquidity Metrics - ENHANCED WITH FINANCIAL DATA
            liquidity: {
                currentRatio: this.formatRatio(metrics.current_ratio),
                quickRatio: this.formatRatio(metrics.quick_ratio),
                cashRatio: this.formatRatio(metrics.cash_ratio),
                workingCapital: this.formatCurrency(financials.working_capital),
                freeCashFlow: this.formatCurrency(financials.free_cash_flow || financials.fcf)
            },

            // Leverage Metrics - ENHANCED WITH CALCULATED VALUES
            leverage: {
                debtToEquity: this.formatRatio(calculated_debt_to_equity || metrics.debt_to_equity),
                debtToAssets: this.formatRatio(metrics.debt_to_assets),
                equityRatio: this.formatRatio(metrics.equity_ratio),
                interestCoverage: this.formatRatio(metrics.interest_coverage),
                debtServiceCoverage: this.formatRatio(metrics.debt_service_coverage)
            },

            // Efficiency Metrics
            efficiency: {
                assetTurnover: this.formatRatio(metrics.asset_turnover),
                inventoryTurnover: this.formatRatio(metrics.inventory_turnover),
                receivablesTurnover: this.formatRatio(metrics.receivables_turnover),
                payablesTurnover: this.formatRatio(metrics.payables_turnover),
                workingCapitalTurnover: this.formatRatio(metrics.working_capital_turnover)
            },

            // Growth Metrics
            growth: {
                revenueGrowth: this.formatPercentage(metrics.revenue_growth),
                earningsGrowth: this.formatPercentage(metrics.earnings_growth),
                epsGrowth: this.formatPercentage(metrics.eps_growth),
                dividendGrowth: this.formatPercentage(metrics.dividend_growth),
                freeCashFlowGrowth: this.formatPercentage(metrics.free_cash_flow_growth)
            },

            // === Consolidated All Metrics – build dynamically from FULL backend dataset (~160 metrics) ===
            all: (() => {
                // 1) Format every numeric metric coming from backend
                const formatted = {};
                Object.entries(metrics).forEach(([k, v]) => {
                    formatted[k] = (typeof v === 'number') ? this.formatRatio(v) : (v ?? 'N/A');
                });

                // 2) Append key fundamentals for quick access / legacy mapping
                formatted.revenue = this.formatCurrency(revenue);
                formatted.netIncome = this.formatCurrency(net_income);
                formatted.totalAssets = this.formatCurrency(financials.total_assets);
                formatted.totalLiabilities = this.formatCurrency(financials.total_liabilities);
                formatted.totalEquity = this.formatCurrency(total_equity);
                formatted.marketCap = this.formatCurrency(market_cap);

                return formatted;
            })(),

            // Market Metrics - ENHANCED WITH CALCULATED VALUES  
            market: {
                beta: this.formatRatio(metrics.beta),
                dividendYield: this.formatPercentage(metrics.dividend_yield),
                payoutRatio: this.formatPercentage(metrics.payout_ratio),
                earningsYield: this.formatPercentage(metrics.earnings_yield),
                fcfYield: this.formatPercentage(metrics.fcf_yield)
            },

            // Basic Financial Info - NEW SECTION FOR FUNDAMENTAL DATA
            fundamentals: {
                revenue: this.formatCurrency(revenue),
                netIncome: this.formatCurrency(net_income),
                totalAssets: this.formatCurrency(financials.total_assets),
                totalLiabilities: this.formatCurrency(financials.total_liabilities),
                totalEquity: this.formatCurrency(total_equity),
                marketCap: this.formatCurrency(market_cap),
                reportDate: financials.report_date
            },

            // Financial Health Score
            healthScore: this.calculateHealthScore(metrics),
            
            // Metadata
            lastUpdate: new Date().toISOString(),
            dataQuality: fundamentalsData.metadata?.data_quality || 'calculated'
        };
    }

    /**
     * Calculate overall financial health score
     * @param {Object} metrics - Financial metrics
     * @returns {Object} Health score and breakdown
     */
    calculateHealthScore(metrics) {
        const scores = {
            profitability: this.scoreProfitability(metrics),
            liquidity: this.scoreLiquidity(metrics),
            leverage: this.scoreLeverage(metrics),
            efficiency: this.scoreEfficiency(metrics),
            growth: this.scoreGrowth(metrics)
        };

        const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

        return {
            overall: Math.round(overallScore),
            breakdown: scores,
            rating: this.getHealthRating(overallScore)
        };
    }

    /**
     * Score profitability metrics
     */
    scoreProfitability(metrics) {
        const ratios = metrics; // alias for backward compatibility
        let score = 0;
        let count = 0;

        if (ratios.gross_margin) {
            score += ratios.gross_margin > 0.4 ? 100 : ratios.gross_margin > 0.2 ? 70 : 40;
            count++;
        }
        if (ratios.net_margin) {
            score += ratios.net_margin > 0.15 ? 100 : ratios.net_margin > 0.05 ? 70 : 40;
            count++;
        }
        if (ratios.roe) {
            score += ratios.roe > 0.15 ? 100 : ratios.roe > 0.1 ? 70 : 40;
            count++;
        }

        // Return neutral score when no data available
        return count > 0 ? score / count : 60;
    }

    /**
     * Score liquidity metrics
     */
    scoreLiquidity(metrics) {
        const ratios = metrics;
        let score = 0;
        let count = 0;

        if (ratios.current_ratio) {
            const ratio = ratios.current_ratio;
            score += ratio > 2 ? 100 : ratio > 1.5 ? 80 : ratio > 1 ? 60 : 30;
            count++;
        }
        if (ratios.quick_ratio) {
            const ratio = ratios.quick_ratio;
            score += ratio > 1.5 ? 100 : ratio > 1 ? 80 : ratio > 0.5 ? 60 : 30;
            count++;
        }

        // Return neutral score when no data available
        return count > 0 ? score / count : 60;
    }

    /**
     * Score leverage metrics
     */
    scoreLeverage(metrics) {
        const ratios = metrics;
        let score = 0;
        let count = 0;

        if (ratios.debt_to_equity) {
            const ratio = ratios.debt_to_equity;
            score += ratio < 0.3 ? 100 : ratio < 0.6 ? 80 : ratio < 1 ? 60 : 30;
            count++;
        }

        // Return neutral score when no data available
        return count > 0 ? score / count : 60;
    }

    /**
     * Score efficiency metrics
     */
    scoreEfficiency(metrics) {
        const ratios = metrics;
        let score = 0;
        let count = 0;

        if (ratios.asset_turnover) {
            const ratio = ratios.asset_turnover;
            score += ratio > 1.5 ? 100 : ratio > 1 ? 80 : ratio > 0.5 ? 60 : 30;
            count++;
        }

        // Return neutral score when no data available
        return count > 0 ? score / count : 60;
    }

    /**
     * Score growth metrics
     */
    scoreGrowth(metrics) {
        const ratios = metrics;
        let score = 0;
        let count = 0;

        if (ratios.revenue_growth) {
            score += ratios.revenue_growth > 0.2 ? 100 : ratios.revenue_growth > 0.1 ? 80 : ratios.revenue_growth > 0 ? 60 : 30;
            count++;
        }
        if (ratios.earnings_growth) {
            score += ratios.earnings_growth > 0.2 ? 100 : ratios.earnings_growth > 0.1 ? 80 : ratios.earnings_growth > 0 ? 60 : 30;
            count++;
        }

        // Return neutral score when no data available
        return count > 0 ? score / count : 60;
    }

    /**
     * Get health rating based on score
     */
    getHealthRating(score) {
        if (score >= 85) return 'Excellent';
        if (score >= 75) return 'Very Good';
        if (score >= 65) return 'Good';
        if (score >= 55) return 'Fair';
        if (score >= 45) return 'Below Average';
        return 'Needs Improvement';
    }

    /**
     * Render the financial metrics bubble
     */
    render() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.state.data) return;

        const data = this.state.data;

        // 🆕 Ensure consolidated "all" metrics exist – merge every category for 100+ metrics view
        if (!data.all || typeof data.all !== 'object') {
            data.all = {
                ...(data.valuation || {}),
                ...(data.profitability || {}),
                ...(data.liquidity || {}),
                ...(data.leverage || {}),
                ...(data.efficiency || {}),
                ...(data.growth || {})
            };
        }

        container.innerHTML = `
            <div class="financial-metrics-content">
                <div class="metrics-header">
                    <h3>Financial Metrics</h3>
                    <div class="health-score">
                        <div class="score-circle ${this.getScoreClass(data.healthScore.overall)}">
                            <span class="score-value">${data.healthScore.overall}</span>
                        </div>
                        <div class="score-label">${data.healthScore.rating}</div>
                    </div>
                </div>

                <div class="metrics-tabs">
                    <button class="tab-button active" data-tab="valuation">Valuation</button>
                    <button class="tab-button" data-tab="profitability">Profitability</button>
                    <button class="tab-button" data-tab="liquidity">Liquidity</button>
                    <button class="tab-button" data-tab="leverage">Leverage</button>
                    <button class="tab-button" data-tab="efficiency">Efficiency</button>
                    <button class="tab-button" data-tab="growth">Growth</button>
                    <button class="tab-button" data-tab="all">All</button>
                </div>

                <div class="metrics-content">
                    <div class="tab-content active" data-tab="valuation">
                        ${this.renderMetricsSection(data.valuation, 'Valuation Metrics')}
                    </div>
                    <div class="tab-content" data-tab="profitability">
                        ${this.renderMetricsSection(data.profitability, 'Profitability Metrics')}
                    </div>
                    <div class="tab-content" data-tab="liquidity">
                        ${this.renderMetricsSection(data.liquidity, 'Liquidity Metrics')}
                    </div>
                    <div class="tab-content" data-tab="leverage">
                        ${this.renderMetricsSection(data.leverage, 'Leverage Metrics')}
                    </div>
                    <div class="tab-content" data-tab="efficiency">
                        ${this.renderMetricsSection(data.efficiency, 'Efficiency Metrics')}
                    </div>
                    <div class="tab-content" data-tab="growth">
                        ${this.renderMetricsSection(data.growth, 'Growth Metrics')}
                    </div>
                    <div class="tab-content" data-tab="all">
                        ${this.renderMetricsSection(data.all, 'All Metrics')}
                    </div>
                </div>

                <div class="health-breakdown">
                    <h4>Health Score Breakdown</h4>
                    <div class="breakdown-grid">
                        ${Object.entries(data.healthScore.breakdown).map(([category, score]) => `
                            <div class="breakdown-item">
                                <span class="category">${this.capitalizeFirst(category)}</span>
                                <div class="score-bar">
                                    <div class="score-fill ${this.getScoreClass(score)}" style="width: ${score}%"></div>
                                </div>
                                <span class="score">${Math.round(score)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="data-footer">
                    <span class="last-update">Updated: ${this.formatTimestamp(data.lastUpdate)}</span>
                    <span class="data-quality">Quality: ${data.dataQuality}</span>
                </div>
            </div>
        `;

        // Setup tab functionality
        this.setupTabHandlers();
    }

    /**
     * Render metrics section
     * @param {Object} metrics - Metrics data
     * @param {string} title - Section title
     * @returns {string} HTML string
     */
    renderMetricsSection(metrics, title) {
        return `
            <div class="metrics-section">
                <div class="metrics-grid">
                    ${Object.entries(metrics).map(([key, value]) => `
                        <div class="metric-item" data-metric="${key}">
                            <span class="metric-label">${this.formatMetricLabel(key)}</span>
                            <span class="metric-value">${value}</span>
                            <div class="metric-trend ${this.getMetricTrend(key, value)}"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Setup tab handlers
     */
    setupTabHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        const tabButtons = container.querySelectorAll('.tab-button');
        const tabContents = container.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                const targetContent = container.querySelector(`[data-tab="${tabName}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                // Dispatch tab change event
                this.dispatchEvent('metrics-tab-changed', { tab: tabName });
            });
        });

        // Setup metric item click handlers
        const metricItems = container.querySelectorAll('.metric-item');
        metricItems.forEach(item => {
            item.addEventListener('click', () => {
                const metric = item.dataset.metric;
                const label = item.querySelector('.metric-label')?.textContent;
                const value = item.querySelector('.metric-value')?.textContent;
                this.showMetricDetail(metric, label, value);
            });
        });
    }

    /**
     * Show metric detail
     * @param {string} metric - Metric key
     * @param {string} label - Metric label
     * @param {string} value - Metric value
     */
    showMetricDetail(metric, label, value) {
        console.log(`FinancialMetricsBubble: Metric detail requested - ${metric}: ${label} = ${value}`);
        this.dispatchEvent('metric-detail-requested', { metric, label, value });
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        console.log(`FinancialMetricsBubble: Changing symbol from ${this.state.currentSymbol} to ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.data = null;
        
        // Clear existing content
        this.showLoadingState();
        
        // Load new data with force refresh to bypass any stale cache
        await this.loadData(true);
        
        // Note: Avoid redispatching symbol-changed to prevent recursive updates
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (!this.state.isLoading) {
                console.log('FinancialMetricsBubble: Auto-refreshing data...');
                this.loadData();
            }
        }, this.config.refreshInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for symbol changes from other components
        document.addEventListener('symbol-changed', (event) => {
            if (event.detail && event.detail.symbol) {
                this.changeSymbol(event.detail.symbol);
            }
        });

        // Listen for theme changes
        document.addEventListener('theme-changed', (event) => {
            if (this.state.data) {
                this.render(); // Re-render with new theme
            }
        });
    }

    /**
     * Update loading state
     * @param {boolean} isLoading - Loading state
     */
    updateLoadingState(isLoading) {
        if (isLoading) {
            this.showLoadingState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="financial-metrics-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading financial metrics...</div>
            </div>
        `;
    }

    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        this.state.error = {
            message: error.message,
            context: context,
            timestamp: Date.now()
        };
        
        this.metrics.errors++;
        
        // Log detailed error information
        console.error(`FinancialMetricsBubble Error [${context}]:`, {
            error: error.message,
            stack: error.stack,
            symbol: this.state.currentSymbol,
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            containerId: this.config.containerId
        });
        
        // Show error message to user
        this.showErrorMessage(error.message, context);
        
        // Dispatch error event for centralized handling
        this.dispatchEvent('financial-metrics-error', {
            error: error.message,
            context: context,
            symbol: this.state.currentSymbol
        });
    }

    /**
     * Show error message in the bubble
     * @param {string} message - Error message
     * @param {string} context - Error context
     */
    showErrorMessage(message, context) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        const contextMessages = {
            'initialization': 'Failed to initialize financial metrics component',
            'data-loading': 'Unable to load financial data from server',
            'api-error': 'Financial data API temporarily unavailable',
            'network-error': 'Network connection error - check internet connection'
        };

        const userMessage = contextMessages[context] || 'An error occurred while loading financial metrics';

        container.innerHTML = `
            <div class="financial-metrics-error-state">
                <div class="error-header">
                    <div class="error-icon">📊</div>
                    <h3>Financial Data Unavailable</h3>
                </div>
                <div class="error-content">
                    <p class="error-message">${userMessage}</p>
                    <p class="error-details">Error: ${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="window.financialMetricsBubble?.loadData()">
                            🔄 Retry Loading
                        </button>
                        <button class="refresh-page-button" onclick="window.location.reload()">
                            ↻ Refresh Page
                        </button>
                    </div>
                </div>
                <div class="error-footer">
                    <span class="error-time">Error occurred at: ${new Date().toLocaleTimeString()}</span>
                    <span class="error-symbol">Symbol: ${this.state.currentSymbol}</span>
                </div>
            </div>
        `;
    }

    // Utility methods
    formatCurrency(value) {
        if (!value || isNaN(value)) return 'N/A';
        const num = parseFloat(value);
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toLocaleString()}`;
    }

    formatRatio(value) {
        if (!value || isNaN(value)) return 'N/A';
        return parseFloat(value).toFixed(2);
    }

    formatPercentage(value) {
        if (!value || isNaN(value)) return 'N/A';
        return `${(parseFloat(value) * 100).toFixed(2)}%`;
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatMetricLabel(key) {
        return key.replace(/([A-Z])/g, ' $1')
                 .replace(/^./, str => str.toUpperCase())
                 .replace(/\b\w/g, l => l.toUpperCase());
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getScoreClass(score) {
        if (score >= 85) return 'excellent';
        if (score >= 75) return 'very-good';
        if (score >= 65) return 'good';
        if (score >= 55) return 'fair';
        if (score >= 45) return 'below-average';
        return 'needs-improvement';
    }

    getMetricTrend(key, value) {
        // This could be enhanced with historical data comparison
        if (value === 'N/A') return 'neutral';
        
        // Simple trend indication based on metric type
        const positiveMetrics = ['grossMargin', 'netMargin', 'roe', 'roa', 'currentRatio', 'quickRatio'];
        const negativeMetrics = ['debtToEquity', 'debtToAssets'];
        
        if (positiveMetrics.includes(key)) {
            const numValue = parseFloat(value);
            return numValue > 0.1 ? 'positive' : 'neutral';
        }
        
        if (negativeMetrics.includes(key)) {
            const numValue = parseFloat(value);
            return numValue < 0.5 ? 'positive' : 'negative';
        }
        
        return 'neutral';
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Get current metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Destroy component
     */
    destroy() {
        console.log('FinancialMetricsBubble: Destroying...');
        
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear container
        const container = document.getElementById(this.config.containerId);
        if (container) {
            container.innerHTML = '';
        }
        
        // Clear state
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: null,
            data: null,
            error: null,
            lastUpdate: null
        };
        
        console.log('FinancialMetricsBubble: Destroyed');
    }
}

// Make globally available
window.FinancialMetricsBubble = FinancialMetricsBubble;

// CommonJS export (safe check)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialMetricsBubble;
}

// ES6 module exports
// REMOVED EXPORT: export { FinancialMetricsBubble };
// REMOVED EXPORT: export default FinancialMetricsBubble;

console.log('✅ FinancialMetricsBubble exported successfully (ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('financial-metrics-bubble');
    if (container && !window.financialMetrics) {
        console.log('FinancialMetricsBubble: Auto-initializing...');
        window.financialMetrics = new FinancialMetricsBubble();
    }
}); 

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/financial-metrics/financial-metrics.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/technical-analysis/technical-analysis.js
 * SIZE: 41,198 bytes
 * ============================================================================ */

/**
 * FinanceHub Technical Analysis Bubble v3.0.0
 * ENTERPRISE-GRADE Technical Analysis Component
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-02
 */

class TechnicalAnalysisBubble {
    constructor(options = {}) {
        // Configuration
        this.config = {
            containerId: options.containerId || 'technical-analysis-bubble',
            symbol: options.symbol || 'AAPL',
            refreshInterval: options.refreshInterval || 60000, // 1 minute
            apiBaseUrl: options.apiBaseUrl || '/api/v1',
            timeframes: options.timeframes || ['1D', '1W', '1M', '3M', '1Y'],
            indicators: options.indicators || ['RSI', 'MACD', 'SMA', 'EMA', 'BB'],
            debug: options.debug || false
        };

        // State management
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            currentTimeframe: '1D',
            data: null,
            error: null,
            lastUpdate: null,
            selectedIndicators: ['RSI', 'MACD']
        };

        // Performance metrics
        this.metrics = {
            loadTime: 0,
            errors: 0,
            updates: 0,
            cacheHits: 0
        };

        // API client
        this.apiClient = window.FinanceHub?.components?.api || new FinanceHubAPIService();

        // Auto-refresh timer
        this.refreshTimer = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the component
     */
    async init() {
        try {
            console.log('TechnicalAnalysisBubble: Initializing...');
            
            // Validate container
            if (!this.validateContainer()) {
                throw new Error(`Container '${this.config.containerId}' not found`);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            this.state.isInitialized = true;
            console.log('TechnicalAnalysisBubble: Initialized successfully');
            this.dispatchEvent('technical-analysis-initialized');

        } catch (error) {
            console.error('TechnicalAnalysisBubble: Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Validate container exists and ensure required CSS classes for styling
     * @returns {boolean} Container is valid
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`TechnicalAnalysisBubble: Container '${this.config.containerId}' not found`);
            return false;
        }
        // 🔧 Ensure base styling classes are present – avoids "unstyled" bubble if initial HTML differs
        container.classList.add('fh-analysis-bubble');
        container.classList.add('fh-analysis-bubble--technical-analysis');
        return true;
    }

    /**
     * Load technical analysis data - VALÓS BACKEND ADATOK
     */
    async loadData() {
        if (this.state.isLoading) {
            console.log('TechnicalAnalysisBubble: Data loading already in progress');
            return;
        }

        // 🔍 ENHANCED DEBUG LOGGING
        console.log('📊 TechnicalAnalysis DEBUG: Starting data load process...');
        console.log('🔗 TechnicalAnalysis DEBUG: API Client available:', !!this.apiClient);
        console.log('📈 TechnicalAnalysis DEBUG: Current symbol:', this.state.currentSymbol);

        this.state.isLoading = true;
        this.updateLoadingState(true);
        
        const startTime = performance.now();

        try {
            console.log(`🔄 TechnicalAnalysis DEBUG: Calling backend APIs for ${this.state.currentSymbol}...`);
            console.log('🔄 TechnicalAnalysis DEBUG: Fetching chart data...');
            
            // Fetch chart data from backend
            const chartData = await this.apiClient.getStockChart(this.state.currentSymbol, '1y');
            
            console.log('📊 TechnicalAnalysis DEBUG: Raw chart response:', chartData);
            console.log('📋 TechnicalAnalysis DEBUG: Chart type:', typeof chartData);
            console.log('📦 TechnicalAnalysis DEBUG: Has chart data?', !!chartData);
            
            if (!chartData) {
                console.error('❌ TechnicalAnalysis CRITICAL: No chart data received!');
                console.error('❌ TechnicalAnalysis CRITICAL: This component requires REAL BACKEND DATA - NO MOCK FALLBACK');
                throw new Error('No chart data received from backend - REAL API REQUIRED');
            }

            console.log('✅ TechnicalAnalysis SUCCESS: Received data from backend');
            console.log('📋 TechnicalAnalysis DEBUG: Chart data available:', !!chartData);

            // Process technical indicators from chart data
            this.state.data = this.processTechnicalData(chartData);
            this.state.lastUpdate = Date.now();
            
            console.log('🎯 TechnicalAnalysis SUCCESS: Data processed successfully');
            console.log('📋 TechnicalAnalysis DEBUG: Processed indicators:', Object.keys(this.state.data?.indicators || {}));
            console.log('📋 TechnicalAnalysis DEBUG: Technical signals count:', this.state.data?.signals?.length || 0);
            
            // Update metrics
            this.metrics.loadTime = performance.now() - startTime;
            this.metrics.updates++;
            
            // Render the component
            this.render();
            
            console.log(`⚡ TechnicalAnalysis PERFORMANCE: Load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('technical-analysis-loaded', {
                symbol: this.state.currentSymbol,
                loadTime: this.metrics.loadTime
            });

        } catch (error) {
            console.error('🚨 TechnicalAnalysis ERROR: Failed to load backend chart data, attempting fallback');
            this.handleError(error, 'data-loading');
            
            try {
                const fallbackOk = await this.loadFallbackChart();
                if (fallbackOk) {
                    console.warn('⚠️ TechnicalAnalysis: Using TradingView fallback data');
                } else {
                    console.error('❌ TechnicalAnalysis: Fallback chart data also unavailable');
                }
            } catch (fallbackErr) {
                console.error('❌ TechnicalAnalysis: Fallback load failed:', fallbackErr);
            }
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Process technical analysis data - STRICT VALIDATION
     * @param {Object} chartData - Chart data from API
     * @returns {Object} Processed technical data
     */
    processTechnicalData(chartData) {
        const processedData = {
            indicators: {},
            signals: [],
            trend: {
                direction: 'neutral',
                strength: 0,
                confidence: 0
            },
            support: [],
            resistance: [],
            patterns: [],
            summary: {
                bullish: 0,
                bearish: 0,
                neutral: 0,
                overall: 'neutral'
            }
        };

        // Process chart data for additional analysis
        if (chartData && chartData.chart_data && chartData.chart_data.ohlcv && Array.isArray(chartData.chart_data.ohlcv)) {
            this.processChartData(chartData.chart_data.ohlcv, processedData);
        }

        // Calculate overall signals and trend
        this.calculateSignals(processedData);
        this.calculateTrend(processedData);
        this.calculateSummary(processedData);

        return processedData;
    }

    /**
     * Process technical indicators
     * @param {Object} indicators - Raw indicators data
     * @param {Object} processedData - Processed data object
     */
    processIndicators(indicators, processedData) {
        // RSI Processing
        if (indicators.rsi) {
            processedData.indicators.RSI = {
                value: indicators.rsi.value || indicators.rsi,
                signal: this.getRSISignal(indicators.rsi.value || indicators.rsi),
                overbought: 70,
                oversold: 30
            };
        }

        // MACD Processing
        if (indicators.macd) {
            processedData.indicators.MACD = {
                macd: indicators.macd.macd || indicators.macd.value,
                signal: indicators.macd.signal,
                histogram: indicators.macd.histogram,
                crossover: this.getMACDSignal(indicators.macd)
            };
        }

        // Moving Averages
        if (indicators.sma_20) {
            processedData.indicators.SMA20 = {
                value: indicators.sma_20,
                signal: this.getSMASignal(indicators.sma_20, indicators.current_price)
            };
        }

        if (indicators.ema_12) {
            processedData.indicators.EMA12 = {
                value: indicators.ema_12,
                signal: this.getEMASignal(indicators.ema_12, indicators.current_price)
            };
        }

        // Bollinger Bands
        if (indicators.bollinger_bands) {
            processedData.indicators.BB = {
                upper: indicators.bollinger_bands.upper,
                middle: indicators.bollinger_bands.middle,
                lower: indicators.bollinger_bands.lower,
                signal: this.getBollingerSignal(indicators.bollinger_bands, indicators.current_price)
            };
        }

        // Stochastic
        if (indicators.stochastic) {
            processedData.indicators.STOCH = {
                k: indicators.stochastic.k,
                d: indicators.stochastic.d,
                signal: this.getStochasticSignal(indicators.stochastic)
            };
        }

        // Volume indicators
        if (indicators.volume_sma) {
            processedData.indicators.VOLUME = {
                current: indicators.current_volume,
                average: indicators.volume_sma,
                signal: this.getVolumeSignal(indicators.current_volume, indicators.volume_sma)
            };
        }
    }

    /**
     * Process chart data for pattern recognition
     * @param {Array} chartData - Chart data points
     * @param {Object} processedData - Processed data object
     */
    processChartData(chartData, processedData) {
        if (chartData.length < 20) return; // Need sufficient data

        const prices = chartData.map(point => point.close);
        const highs = chartData.map(point => point.high);
        const lows = chartData.map(point => point.low);

        // Calculate support and resistance levels
        processedData.support = this.findSupportLevels(lows);
        processedData.resistance = this.findResistanceLevels(highs);

        // Detect chart patterns
        processedData.patterns = this.detectPatterns(prices, highs, lows);
    }

    /**
     * Calculate trading signals
     * @param {Object} processedData - Processed data object
     */
    calculateSignals(processedData) {
        const signals = [];

        // RSI signals
        if (processedData.indicators.RSI) {
            const rsi = processedData.indicators.RSI;
            if (rsi.value > 70) {
                signals.push({
                    type: 'RSI',
                    signal: 'SELL',
                    strength: 'strong',
                    message: 'RSI indicates overbought conditions'
                });
            } else if (rsi.value < 30) {
                signals.push({
                    type: 'RSI',
                    signal: 'BUY',
                    strength: 'strong',
                    message: 'RSI indicates oversold conditions'
                });
            }
        }

        // MACD signals
        if (processedData.indicators.MACD) {
            const macd = processedData.indicators.MACD;
            if (macd.crossover === 'bullish') {
                signals.push({
                    type: 'MACD',
                    signal: 'BUY',
                    strength: 'medium',
                    message: 'MACD bullish crossover detected'
                });
            } else if (macd.crossover === 'bearish') {
                signals.push({
                    type: 'MACD',
                    signal: 'SELL',
                    strength: 'medium',
                    message: 'MACD bearish crossover detected'
                });
            }
        }

        // Moving average signals
        if (processedData.indicators.SMA20) {
            const sma = processedData.indicators.SMA20;
            if (sma.signal === 'bullish') {
                signals.push({
                    type: 'SMA',
                    signal: 'BUY',
                    strength: 'weak',
                    message: 'Price above 20-day SMA'
                });
            } else if (sma.signal === 'bearish') {
                signals.push({
                    type: 'SMA',
                    signal: 'SELL',
                    strength: 'weak',
                    message: 'Price below 20-day SMA'
                });
            }
        }

        processedData.signals = signals;
    }

    /**
     * Calculate trend analysis
     * @param {Object} processedData - Processed data object
     */
    calculateTrend(processedData) {
        let bullishSignals = 0;
        let bearishSignals = 0;
        let totalSignals = 0;

        // Count signals
        processedData.signals.forEach(signal => {
            totalSignals++;
            if (signal.signal === 'BUY') bullishSignals++;
            if (signal.signal === 'SELL') bearishSignals++;
        });

        // Determine trend
        if (bullishSignals > bearishSignals) {
            processedData.trend.direction = 'bullish';
            processedData.trend.strength = (bullishSignals / totalSignals) * 100;
        } else if (bearishSignals > bullishSignals) {
            processedData.trend.direction = 'bearish';
            processedData.trend.strength = (bearishSignals / totalSignals) * 100;
        } else {
            processedData.trend.direction = 'neutral';
            processedData.trend.strength = 50;
        }

        // Calculate confidence based on signal strength
        const strongSignals = processedData.signals.filter(s => s.strength === 'strong').length;
        processedData.trend.confidence = Math.min(100, (strongSignals / Math.max(1, totalSignals)) * 100 + 30);
    }

    /**
     * Calculate summary statistics
     * @param {Object} processedData - Processed data object
     */
    calculateSummary(processedData) {
        processedData.signals.forEach(signal => {
            if (signal.signal === 'BUY') {
                processedData.summary.bullish++;
            } else if (signal.signal === 'SELL') {
                processedData.summary.bearish++;
            } else {
                processedData.summary.neutral++;
            }
        });

        // Determine overall sentiment
        if (processedData.summary.bullish > processedData.summary.bearish) {
            processedData.summary.overall = 'bullish';
        } else if (processedData.summary.bearish > processedData.summary.bullish) {
            processedData.summary.overall = 'bearish';
        } else {
            processedData.summary.overall = 'neutral';
        }
    }

    // Signal calculation methods
    getRSISignal(rsi) {
        if (rsi > 70) return 'bearish';
        if (rsi < 30) return 'bullish';
        return 'neutral';
    }

    getMACDSignal(macd) {
        if (macd.macd > macd.signal) return 'bullish';
        if (macd.macd < macd.signal) return 'bearish';
        return 'neutral';
    }

    getSMASignal(sma, currentPrice) {
        if (currentPrice > sma) return 'bullish';
        if (currentPrice < sma) return 'bearish';
        return 'neutral';
    }

    getEMASignal(ema, currentPrice) {
        if (currentPrice > ema) return 'bullish';
        if (currentPrice < ema) return 'bearish';
        return 'neutral';
    }

    getBollingerSignal(bb, currentPrice) {
        if (currentPrice > bb.upper) return 'bearish';
        if (currentPrice < bb.lower) return 'bullish';
        return 'neutral';
    }

    getStochasticSignal(stoch) {
        if (stoch.k > 80 && stoch.d > 80) return 'bearish';
        if (stoch.k < 20 && stoch.d < 20) return 'bullish';
        return 'neutral';
    }

    getVolumeSignal(current, average) {
        if (current > average * 1.5) return 'strong';
        if (current < average * 0.5) return 'weak';
        return 'normal';
    }

    /**
     * Find support levels
     * @param {Array} lows - Array of low prices
     * @returns {Array} Support levels
     */
    findSupportLevels(lows) {
        const supports = [];
        const window = 5;
        
        for (let i = window; i < lows.length - window; i++) {
            const current = lows[i];
            let isSupport = true;
            
            for (let j = i - window; j <= i + window; j++) {
                if (j !== i && lows[j] < current) {
                    isSupport = false;
                    break;
                }
            }
            
            if (isSupport) {
                supports.push({
                    level: current,
                    strength: this.calculateSupportStrength(lows, current),
                    touches: this.countTouches(lows, current, 0.01)
                });
            }
        }
        
        return supports.sort((a, b) => b.strength - a.strength).slice(0, 3);
    }

    /**
     * Find resistance levels
     * @param {Array} highs - Array of high prices
     * @returns {Array} Resistance levels
     */
    findResistanceLevels(highs) {
        const resistances = [];
        const window = 5;
        
        for (let i = window; i < highs.length - window; i++) {
            const current = highs[i];
            let isResistance = true;
            
            for (let j = i - window; j <= i + window; j++) {
                if (j !== i && highs[j] > current) {
                    isResistance = false;
                    break;
                }
            }
            
            if (isResistance) {
                resistances.push({
                    level: current,
                    strength: this.calculateResistanceStrength(highs, current),
                    touches: this.countTouches(highs, current, 0.01)
                });
            }
        }
        
        return resistances.sort((a, b) => b.strength - a.strength).slice(0, 3);
    }

    calculateSupportStrength(lows, level) {
        return this.countTouches(lows, level, 0.02) * 10;
    }

    calculateResistanceStrength(highs, level) {
        return this.countTouches(highs, level, 0.02) * 10;
    }

    countTouches(prices, level, tolerance) {
        return prices.filter(price => 
            Math.abs(price - level) / level <= tolerance
        ).length;
    }

    /**
     * Detect chart patterns
     * @param {Array} prices - Price array
     * @param {Array} highs - High prices
     * @param {Array} lows - Low prices
     * @returns {Array} Detected patterns
     */
    detectPatterns(prices, highs, lows) {
        const patterns = [];
        
        // Simple pattern detection
        if (this.isAscendingTriangle(highs, lows)) {
            patterns.push({
                type: 'Ascending Triangle',
                signal: 'bullish',
                confidence: 70
            });
        }
        
        if (this.isDescendingTriangle(highs, lows)) {
            patterns.push({
                type: 'Descending Triangle',
                signal: 'bearish',
                confidence: 70
            });
        }
        
        if (this.isDoubleTop(highs)) {
            patterns.push({
                type: 'Double Top',
                signal: 'bearish',
                confidence: 80
            });
        }
        
        if (this.isDoubleBottom(lows)) {
            patterns.push({
                type: 'Double Bottom',
                signal: 'bullish',
                confidence: 80
            });
        }
        
        return patterns;
    }

    // Pattern detection methods (simplified)
    isAscendingTriangle(highs, lows) {
        // Simplified logic - would need more sophisticated implementation
        return false;
    }

    isDescendingTriangle(highs, lows) {
        return false;
    }

    isDoubleTop(highs) {
        return false;
    }

    isDoubleBottom(lows) {
        return false;
    }

    /**
     * Render the technical analysis bubble
     */
    render() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.state.data) return;

        const data = this.state.data;

        container.innerHTML = `
            <div class="technical-analysis-content">
                <div class="technical-header">
                    <h3>Technical Analysis</h3>
                    <div class="timeframe-selector">
                        ${this.config.timeframes.map(tf => `
                            <button class="timeframe-btn ${tf === this.state.currentTimeframe ? 'active' : ''}" 
                                    data-timeframe="${tf}">${tf}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="trend-overview">
                    <div class="trend-indicator ${data.trend.direction}">
                        <div class="trend-direction">${data.trend.direction.toUpperCase()}</div>
                        <div class="trend-strength">${Math.round(data.trend.strength)}% strength</div>
                        <div class="trend-confidence">${Math.round(data.trend.confidence)}% confidence</div>
                    </div>
                </div>

                <div class="indicators-grid">
                    ${this.renderIndicators()}
                </div>

                <div class="signals-section">
                    <h4>Trading Signals</h4>
                    <div class="signals-list">
                        ${this.renderSignals()}
                    </div>
                </div>

                <div class="levels-section">
                    <div class="support-resistance">
                        <div class="support-levels">
                            <h5>Support Levels</h5>
                            ${this.renderSupportLevels()}
                        </div>
                        <div class="resistance-levels">
                            <h5>Resistance Levels</h5>
                            ${this.renderResistanceLevels()}
                        </div>
                    </div>
                </div>

                ${data.patterns.length > 0 ? `
                    <div class="patterns-section">
                        <h4>Chart Patterns</h4>
                        <div class="patterns-list">
                            ${this.renderPatterns()}
                        </div>
                    </div>
                ` : ''}

                <div class="data-footer">
                    <span class="last-update">Updated: ${this.formatTimestamp(this.state.lastUpdate)}</span>
                    <button class="refresh-button" onclick="window.technicalAnalysisBubble?.loadData()">
                        Refresh
                    </button>
                </div>
            </div>
        `;

        // Setup interaction handlers
        this.setupInteractionHandlers();
    }

    /**
     * Render indicators
     * @returns {string} HTML string
     */
    renderIndicators() {
        const indicators = this.state.data.indicators;
        let html = '';

        Object.keys(indicators).forEach(key => {
            const indicator = indicators[key];
            html += `
                <div class="indicator-card ${indicator.signal || ''}">
                    <div class="indicator-name">${key}</div>
                    <div class="indicator-value">
                        ${this.formatIndicatorValue(key, indicator)}
                    </div>
                    <div class="indicator-signal ${indicator.signal || 'neutral'}">
                        ${(indicator.signal || 'neutral').toUpperCase()}
                    </div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Format indicator value for display
     * @param {string} key - Indicator key
     * @param {Object} indicator - Indicator data
     * @returns {string} Formatted value
     */
    formatIndicatorValue(key, indicator) {
        switch (key) {
            case 'RSI':
                return `${indicator.value.toFixed(2)}`;
            case 'MACD':
                return `${indicator.macd.toFixed(4)}`;
            case 'SMA20':
            case 'EMA12':
                return `$${indicator.value.toFixed(2)}`;
            case 'BB':
                return `$${indicator.middle.toFixed(2)}`;
            case 'STOCH':
                return `${indicator.k.toFixed(2)}`;
            case 'VOLUME':
                return this.formatVolume(indicator.current);
            default:
                return indicator.value ? indicator.value.toFixed(2) : 'N/A';
        }
    }

    /**
     * Render trading signals
     * @returns {string} HTML string
     */
    renderSignals() {
        if (this.state.data.signals.length === 0) {
            return '<div class="no-signals">No active signals</div>';
        }

        return this.state.data.signals.map(signal => `
            <div class="signal-item ${signal.signal.toLowerCase()} ${signal.strength}">
                <div class="signal-header">
                    <span class="signal-type">${signal.type}</span>
                    <span class="signal-action ${signal.signal.toLowerCase()}">${signal.signal}</span>
                </div>
                <div class="signal-message">${signal.message}</div>
                <div class="signal-strength">Strength: ${signal.strength}</div>
            </div>
        `).join('');
    }

    /**
     * Render support levels
     * @returns {string} HTML string
     */
    renderSupportLevels() {
        if (this.state.data.support.length === 0) {
            return '<div class="no-levels">No support levels detected</div>';
        }

        return this.state.data.support.map(level => `
            <div class="level-item support">
                <span class="level-price">$${level.level.toFixed(2)}</span>
                <span class="level-strength">Strength: ${level.strength}</span>
            </div>
        `).join('');
    }

    /**
     * Render resistance levels
     * @returns {string} HTML string
     */
    renderResistanceLevels() {
        if (this.state.data.resistance.length === 0) {
            return '<div class="no-levels">No resistance levels detected</div>';
        }

        return this.state.data.resistance.map(level => `
            <div class="level-item resistance">
                <span class="level-price">$${level.level.toFixed(2)}</span>
                <span class="level-strength">Strength: ${level.strength}</span>
            </div>
        `).join('');
    }

    /**
     * Render chart patterns
     * @returns {string} HTML string
     */
    renderPatterns() {
        return this.state.data.patterns.map(pattern => `
            <div class="pattern-item ${pattern.signal}">
                <div class="pattern-name">${pattern.type}</div>
                <div class="pattern-signal ${pattern.signal}">${pattern.signal.toUpperCase()}</div>
                <div class="pattern-confidence">${pattern.confidence}% confidence</div>
            </div>
        `).join('');
    }

    /**
     * Setup interaction handlers
     */
    setupInteractionHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Timeframe button handlers
        const timeframeButtons = container.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const timeframe = button.dataset.timeframe;
                this.changeTimeframe(timeframe);
            });
        });

        // Indicator card click handlers
        const indicatorCards = container.querySelectorAll('.indicator-card');
        indicatorCards.forEach(card => {
            card.addEventListener('click', () => {
                const indicatorName = card.querySelector('.indicator-name').textContent;
                this.showIndicatorDetail(indicatorName);
            });
        });
    }

    /**
     * Change timeframe
     * @param {string} timeframe - New timeframe
     */
    async changeTimeframe(timeframe) {
        if (timeframe === this.state.currentTimeframe) return;

        console.log(`TechnicalAnalysisBubble: Changing timeframe to ${timeframe}`);
        this.state.currentTimeframe = timeframe;
        
        // Reload data with new timeframe
        await this.loadData();
        
        this.dispatchEvent('timeframe-changed', { timeframe });
    }

    /**
     * Show indicator detail
     * @param {string} indicatorName - Indicator name
     */
    showIndicatorDetail(indicatorName) {
        console.log(`TechnicalAnalysisBubble: Indicator detail requested for ${indicatorName}`);
        this.dispatchEvent('indicator-detail-requested', { indicator: indicatorName });
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        console.log(`TechnicalAnalysisBubble: Changing symbol from ${this.state.currentSymbol} to ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.data = null;
        
        // Clear existing content
        this.showLoadingState();
        
        // Load new data
        await this.loadData();
        
        this.dispatchEvent('symbol-changed', { symbol });
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (!this.state.isLoading) {
                console.log('TechnicalAnalysisBubble: Auto-refreshing data...');
                this.loadData();
            }
        }, this.config.refreshInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for symbol changes from other components
        document.addEventListener('symbol-changed', (event) => {
            if (event.detail && event.detail.symbol) {
                this.changeSymbol(event.detail.symbol);
            }
        });

        // Listen for theme changes
        document.addEventListener('theme-changed', (event) => {
            if (this.state.data) {
                this.render(); // Re-render with new theme
            }
        });
    }

    /**
     * Update loading state
     * @param {boolean} isLoading - Loading state
     */
    updateLoadingState(isLoading) {
        if (isLoading) {
            this.showLoadingState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="technical-analysis-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Analyzing technical indicators...</div>
            </div>
        `;
    }

    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        this.state.error = {
            message: error.message,
            context: context,
            timestamp: Date.now()
        };
        
        this.metrics.errors++;
        
        // Log detailed error information
        console.error(`TechnicalAnalysisBubble Error [${context}]:`, {
            error: error.message,
            stack: error.stack,
            symbol: this.state.currentSymbol,
            timeframe: this.state.currentTimeframe,
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            containerId: this.config.containerId
        });
        
        // Show error message to user
        this.showErrorMessage(error.message, context);
        
        // Dispatch error event for centralized handling
        this.dispatchEvent('technical-analysis-error', {
            error: error.message,
            context: context,
            symbol: this.state.currentSymbol,
            timeframe: this.state.currentTimeframe
        });
    }

    /**
     * Show error message in the bubble
     * @param {string} message - Error message
     * @param {string} context - Error context
     */
    showErrorMessage(message, context) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        const contextMessages = {
            'initialization': 'Failed to initialize technical analysis component',
            'data-loading': 'Unable to load technical analysis data from server',
            'api-error': 'Technical analysis API temporarily unavailable',
            'network-error': 'Network connection error - check internet connection'
        };

        const userMessage = contextMessages[context] || 'An error occurred while loading technical analysis';

        container.innerHTML = `
            <div class="technical-analysis-error-state">
                <div class="error-header">
                    <div class="error-icon">📈</div>
                    <h3>Technical Analysis Unavailable</h3>
                </div>
                <div class="error-content">
                    <p class="error-message">${userMessage}</p>
                    <p class="error-details">Error: ${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="window.technicalAnalysisBubble?.loadData()">
                            🔄 Retry Loading
                        </button>
                        <button class="refresh-page-button" onclick="window.location.reload()">
                            ↻ Refresh Page
                        </button>
                    </div>
                </div>
                <div class="error-footer">
                    <span class="error-time">Error occurred at: ${new Date().toLocaleTimeString()}</span>
                    <span class="error-symbol">Symbol: ${this.state.currentSymbol}</span>
                    <span class="error-timeframe">Timeframe: ${this.state.currentTimeframe}</span>
                </div>
            </div>
        `;
    }

    // Utility methods
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatVolume(volume) {
        if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
        if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
        if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
        return volume.toString();
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Get current metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Destroy component
     */
    destroy() {
        console.log('TechnicalAnalysisBubble: Destroying...');
        
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear container
        const container = document.getElementById(this.config.containerId);
        if (container) {
            container.innerHTML = '';
        }
        
        // Clear state
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: null,
            currentTimeframe: '1D',
            data: null,
            error: null,
            lastUpdate: null,
            selectedIndicators: []
        };
        
        console.log('TechnicalAnalysisBubble: Destroyed');
    }

    /**
     * Fallback: derive minimal OHLC data from TradingView widget if available
     * Returns true if fallback succeeded, false otherwise
     */
    async loadFallbackChart() {
        // Attempt to access global chartManager provided by UnifiedChartManager
        try {
            // First try to get data from chartManager
            if (window.chartManager && typeof window.chartManager.getState === 'function') {
                const chartState = window.chartManager.getState();
                const ohlc = chartState?.latestBars || [];

                if (Array.isArray(ohlc) && ohlc.length > 0) {
                    // Mimic backend response structure expected by processTechnicalData
                    const chartData = {
                        chart_data: {
                            ohlcv: ohlc
                        }
                    };

                    this.state.data = this.processTechnicalData(chartData);
                    this.state.lastUpdate = Date.now();

                    // Render with fallback note
                    this.render();
                    this.showErrorMessage('Backend chart data unavailable – showing TradingView chart snapshot', 'fallback');
                    return true;
                }
            }
            
            // Second fallback: Try to get data from TradingView widget directly
            if (window.TradingView && window.TradingView.widget) {
                console.log('🔄 TechnicalAnalysis: Attempting to use TradingView widget as fallback...');
                
                // Create minimal chart data structure
                const minimalChartData = {
                    chart_data: {
                        ohlcv: [
                            // Generate 10 days of minimal placeholder data
                            ...Array(10).fill(0).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (10 - i));
                                return {
                                    timestamp: date.getTime(),
                                    open: 100,
                                    high: 105,
                                    low: 95,
                                    close: 100 + (Math.random() * 10 - 5),
                                    volume: 1000000
                                };
                            })
                        ]
                    }
                };
                
                this.state.data = this.processTechnicalData(minimalChartData);
                this.state.lastUpdate = Date.now();
                
                // Render with fallback note
                this.render();
                this.showErrorMessage('Using limited technical analysis with placeholder data', 'fallback');
                return true;
            }
            
            // No fallback available
            console.error('❌ TechnicalAnalysis: No fallback chart data available');
            return false;
        } catch (err) {
            console.error('TechnicalAnalysis: loadFallbackChart error', err);
            return false;
        }
    }
}

// Export for global use
window.TechnicalAnalysisBubble = TechnicalAnalysisBubble;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechnicalAnalysisBubble;
}

// ES6 export for modern modules
// REMOVED EXPORT: export { TechnicalAnalysisBubble };
// REMOVED EXPORT: export default TechnicalAnalysisBubble;

console.log('✅ TechnicalAnalysisBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('technical-analysis-bubble');
    if (container && !window.technicalAnalysisBubble) {
        console.log('TechnicalAnalysisBubble: Auto-initializing...');
        window.technicalAnalysisBubble = new TechnicalAnalysisBubble();
    }
}); 

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/technical-analysis/technical-analysis.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/market-news/market-news.js
 * SIZE: 14,583 bytes
 * ============================================================================ */

/**
 * FinanceHub Market News Component v20.0.0
 * Displays market news and sentiment analysis
 */

class MarketNewsComponent {
    constructor() {
        this.container = document.getElementById('market-news');
        this.newsList = document.getElementById('news-list');
        this.currentSymbol = window.currentSymbol || 'AAPL';
        this.isLoading = false;
        
        this.init();
    }
    
    async init() {
        console.log('📰 MarketNewsComponent V20.0.0 initializing...');
        
        try {
            await this.setupContainer();
            if (this.currentSymbol) {
                await this.loadNewsData(this.currentSymbol);
            }
        } catch (error) {
            console.error('[MarketNews] Initialization failed:', error);
            this.showErrorMessage('Failed to initialize news component');
        }
        
        console.log('✅ MarketNewsComponent V20.0.0 initialized');
    }
    
    setupElements() {
        if (!this.container) {
            console.warn('⚠️ Market news container not found');
            return;
        }
        
        if (!this.newsList) {
            this.newsList = this.container.querySelector('.news-list');
        }
    }
    
    bindEvents() {
        // Listen for ticker changes
        document.addEventListener('tickerChange', (event) => {
            this.handleTickerChange(event);
        });
        
        // Refresh news every 5 minutes
        setInterval(() => {
            this.refreshNews();
        }, 300000);
    }
    
    /**
     * Handle ticker events from TickerSync
     */
    handleTickerChange(event) {
        const { symbol, stockData } = event.detail;
        
        console.log('[MarketNews] Ticker changed to:', symbol, stockData);
        
        // Always load fresh news data for the symbol
        this.loadNewsData(symbol);
    }
    
    /**
     * Load news data from API
     */
    async loadNewsData(ticker) {
        if (!ticker || this.isLoading) return;
        
        this.currentSymbol = ticker;
        this.isLoading = true;
        this.showLoading();
        
        try {
            this.log('Loading news data...');
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker });
            
            this.log(`Making API request to: ${newsURL}`);
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const newsData = await response.json();
            
            if (!newsData || (!newsData.news && !newsData.articles)) {
                throw new Error('No news data received from backend');
            }
            
            this.renderNews(newsData.news || newsData.articles || []);
            
        } catch (error) {
            console.error('❌ Failed to load news from API - backend integration required:', error);
            this.showErrorMessage('Unable to load market news. Backend API integration is required.');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadNews() {
        if (!this.currentSymbol || this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            console.log(`📰 Loading news for ${this.currentSymbol}...`);
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker: this.currentSymbol });
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const newsData = await response.json();
                // Handle the response format from working_endpoints.py
                this.renderNews(newsData.news || newsData.articles || []);
            } else {
                throw new Error('API request failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load news from API - backend integration required:', error);
            this.showErrorMessage('Unable to load market news. Backend API integration is required.');
        } finally {
            this.isLoading = false;
        }
    }
    
    async refreshNews() {
        if (!this.isLoading) {
            console.log('🔄 Refreshing market news...');
            await this.loadNews();
        }
    }
    
    renderNews(articles) {
        try {
            console.log('📰 Rendering news with articles:', articles);
            
            if (!articles || !Array.isArray(articles) || articles.length === 0) {
                this.showErrorMessage('No recent news available for this stock');
                return;
            }

            // Clear loading state
            this.newsContainer.classList.remove('loading');
            
            // Create news HTML
            const newsHTML = articles.slice(0, 5).map(article => this.createNewsItem(article)).join('');
            
            this.newsContainer.innerHTML = `
                <div class="news-header">
                    <h3>Latest News</h3>
                    <div class="news-meta">
                        <span class="news-count">${articles.length} articles</span>
                        <button class="refresh-btn" onclick="window.financeApp?.components?.marketNews?.refreshNews()">
                            <i class="icon-refresh"></i>
                        </button>
                    </div>
                </div>
                <div class="news-list">
                    ${newsHTML}
                </div>
            `;
            
            this.addNewsInteractivity();
            this.updateBubbleStatus('loaded');
            
        } catch (error) {
            console.error('❌ Error rendering news:', error);
            this.showErrorMessage('Failed to display news articles');
        }
    }
    
    createNewsItem(article) {
        try {
            // Handle different API response formats
            const title = article.title || article.headline || 'Untitled';
            const summary = article.summary || article.description || 'No summary available';
            const source = article.publisher || article.source?.name || article.source || 'Unknown Source';
            const publishedAt = article.published_at || article.datetime || article.pubDate || new Date().toISOString();
            const url = article.url || article.link || '#';
            const imageUrl = article.image_url || article.thumbnail || null;
            
            const timeAgo = this.formatTime(publishedAt);
            const escapedTitle = this.escapeHtml(title);
            const escapedSummary = this.escapeHtml(summary);
            const escapedSource = this.escapeHtml(source);
            
            return `
                <div class="news-item" data-url="${url}">
                    ${imageUrl ? `<div class="news-image"><img src="${imageUrl}" alt="${escapedTitle}" loading="lazy" /></div>` : ''}
                    <div class="news-content">
                        <h4 class="news-title">${escapedTitle}</h4>
                        <p class="news-summary">${escapedSummary}</p>
                        <div class="news-meta">
                            <span class="news-source">${escapedSource}</span>
                            <span class="news-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error creating news item:', error);
            return `
                <div class="news-item error">
                    <div class="news-content">
                        <h4 class="news-title">Error loading article</h4>
                        <p class="news-summary">Failed to display this news item</p>
                    </div>
                </div>
            `;
        }
    }
    
    addNewsInteractivity() {
        try {
            // Remove existing listeners
            this.newsContainer.removeEventListener('click', this.newsClickHandler);
            
            // Add click handler for news items
            this.newsClickHandler = (event) => {
                const newsItem = event.target.closest('.news-item');
                if (newsItem && newsItem.dataset.url && newsItem.dataset.url !== '#') {
                    event.preventDefault();
                    window.open(newsItem.dataset.url, '_blank', 'noopener,noreferrer');
                }
            };
            
            this.newsContainer.addEventListener('click', this.newsClickHandler);
            
            console.log('✅ News interactivity added');
        } catch (error) {
            console.error('❌ Error adding news interactivity:', error);
        }
    }
    
    showLoading() {
        this.newsContainer.innerHTML = `
            <div class="news-loading">
                <div class="loading-spinner"></div>
                <span>Loading latest news...</span>
            </div>
        `;
        this.newsContainer.classList.add('loading');
    }
    
    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInMilliseconds = now - date;
            const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);

            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            if (diffInHours < 24) return `${diffInHours}h ago`;
            if (diffInDays < 7) return `${diffInDays}d ago`;
            
            // For older articles, show the actual date
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Unknown time';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateBubbleStatus(status) {
        const statusIndicator = this.container?.querySelector('.bubble-status');
        if (statusIndicator) {
            statusIndicator.textContent = status;
            statusIndicator.className = `bubble-status status-${status.toLowerCase()}`;
        }
    }
    
    getCurrentData() {
        return {
            symbol: this.currentSymbol,
            lastUpdate: new Date().toISOString(),
            newsCount: this.newsList?.children.length || 0
        };
    }
    
    getState() {
        return {
            isLoading: this.isLoading,
            currentSymbol: this.currentSymbol,
            hasData: this.newsList?.children.length > 0
        };
    }
    
    destroy() {
        console.log('🧹 MarketNewsComponent cleanup');
        // Cleanup if needed
    }
    
    updateNews(newsData) {
        this.renderNews(newsData);
    }
    
    showError(message) {
        if (this.newsList) {
            this.newsList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">📰</div>
                    <h4>Unable to load news</h4>
                    <p>${message}</p>
                    <button onclick="this.refreshNews()" class="retry-btn">Try Again</button>
                </div>
            `;
        }
    }
    
    /**
     * Show error message when news data cannot be loaded
     */
    showErrorMessage(message) {
        this.newsContainer.innerHTML = `
            <div class="news-error">
                <div class="error-icon">⚠️</div>
                <h4>Unable to load news</h4>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.financeApp?.components?.marketNews?.refreshNews()">
                    Try Again
                </button>
            </div>
        `;
        this.updateBubbleStatus('error');
    }
    
    async setupContainer() {
        // Initialize the news container if it doesn't exist
        if (!this.newsContainer) {
            const newsBubble = document.querySelector('.bubble-news-highlights .bubble-content') || 
                             document.querySelector('[data-bubble="news-highlights"] .bubble-content');
            if (newsBubble) {
                this.newsContainer = newsBubble;
            }
        }
    }
    
    async updateSymbol(symbol) {
        this.currentSymbol = symbol;
        console.log(`📰 MarketNews: Updating to symbol ${symbol}`);
        await this.loadNewsData(symbol);
    }

    async loadMoreNews() {
        try {
            const ticker = this.state.selectedTicker;
            if (!ticker) return;
            
            this.log('Loading more news...');
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker });
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const newsData = await response.json();
                this.renderNews(newsData.news || newsData.articles || []);
            } else {
                throw new Error('API request failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load more news:', error);
            this.showErrorMessage('Unable to load more news');
        }
    }
}

console.log('📰 MarketNewsComponent V20.0.0 loaded');

// Export to global window object
if (typeof window !== 'undefined') {
    window.MarketNewsComponent = MarketNewsComponent;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketNewsComponent;
}

// ES6 export for modern modules
// REMOVED EXPORT: export { MarketNewsComponent };
// REMOVED EXPORT: export default MarketNewsComponent;

console.log('✅ MarketNewsComponent exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/market-news/market-news.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/analysis-bubbles/news/news.js
 * SIZE: 29,949 bytes
 * ============================================================================ */

/**
 * FinanceHub News Bubble v3.0.0
 * ENTERPRISE-GRADE News Analysis Component
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-02
 */

class NewsBubble {
    constructor(options = {}) {
        // Configuration
        this.config = {
            containerId: options.containerId || 'news-bubble',
            symbol: options.symbol || 'AAPL',
            refreshInterval: options.refreshInterval || 180000, // 3 minutes
            apiBaseUrl: options.apiBaseUrl || '/api/v1',
            maxNewsItems: options.maxNewsItems || 10,
            debug: options.debug || false
        };

        // State management
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            data: null,
            error: null,
            lastUpdate: null,
            selectedCategory: 'all'
        };

        // Performance metrics
        this.metrics = {
            loadTime: 0,
            errors: 0,
            updates: 0,
            cacheHits: 0
        };

        // API client
        this.apiClient = window.FinanceHub?.components?.api || new FinanceHubAPIService();

        // Auto-refresh timer
        this.refreshTimer = null;

        // Initialize
        this.init();
    }

    /**
     * Initialize the component
     */
    async init() {
        try {
            console.log('NewsBubble: Initializing...');
            
            // Validate container
            if (!this.validateContainer()) {
                throw new Error(`Container '${this.config.containerId}' not found`);
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadData();

            // Setup auto-refresh
            this.setupAutoRefresh();

            this.state.isInitialized = true;
            console.log('NewsBubble: Initialized successfully');
            this.dispatchEvent('news-initialized');

        } catch (error) {
            console.error('NewsBubble: Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Validate container exists and ensure required CSS classes for styling
     * @returns {boolean} Container is valid
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`NewsBubble: Container '${this.config.containerId}' not found`);
            return false;
        }
        // 🔧 Ensure base styling classes are present – avoids "unstyled" bubble if initial HTML differs
        container.classList.add('fh-analysis-bubble');
        container.classList.add('fh-analysis-bubble--news-highlights');
        return true;
    }

    /**
     * Load news data - VALÓS BACKEND ADATOK
     */
    async loadData() {
        if (this.state.isLoading) {
            console.log('NewsBubble: Data loading already in progress');
            return;
        }

        // 🔍 ENHANCED DEBUG LOGGING
        console.log('📰 News DEBUG: Starting data load process...');
        console.log('🔗 News DEBUG: API Client available:', !!this.apiClient);
        console.log('📈 News DEBUG: Current symbol:', this.state.currentSymbol);

        this.state.isLoading = true;
        this.updateLoadingState(true);
        
        const startTime = performance.now();

        try {
            console.log(`🔄 News DEBUG: Calling backend APIs for ${this.state.currentSymbol}...`);
            console.log('🔄 News DEBUG: Fetching news data from backend...');
            
            // Fetch news data from backend
            const newsData = await this.apiClient.getStockNews(this.state.currentSymbol);
            
            console.log('📊 News DEBUG: Raw news response:', newsData);
            console.log('📋 News DEBUG: News data type:', typeof newsData);
            console.log('📦 News DEBUG: Has news data?', !!newsData);
            console.log('📋 News DEBUG: News array length:', Array.isArray(newsData) ? newsData.length : 'not array');
            
            if (!newsData || (Array.isArray(newsData) && newsData.length === 0)) {
                console.error('❌ News CRITICAL: No news data received!');
                console.error('❌ News CRITICAL: This component requires REAL BACKEND DATA - NO MOCK FALLBACK');
                throw new Error('No news data received from backend - REAL API REQUIRED');
            }

            console.log('✅ News SUCCESS: Received data from backend');
            console.log('📋 News DEBUG: Number of news articles:', Array.isArray(newsData) ? newsData.length : 'single item');

            // Process and validate news data
            this.state.data = this.processNewsData(newsData);
            this.state.lastUpdate = Date.now();
            
            console.log('🎯 News SUCCESS: Data processed successfully');
            console.log('📋 News DEBUG: Processed articles count:', this.state.data?.articles?.length || 0);
            console.log('📋 News DEBUG: Recent articles:', this.state.data?.articles?.slice(0, 3)?.map(a => a.title) || []);
            
            // Update metrics
            this.metrics.loadTime = performance.now() - startTime;
            this.metrics.updates++;
            
            // Render the component
            this.render();
            
            console.log(`⚡ News PERFORMANCE: Load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('news-loaded', {
                symbol: this.state.currentSymbol,
                loadTime: this.metrics.loadTime,
                articlesCount: this.state.data?.articles?.length || 0
            });

        } catch (error) {
            console.error('🚨 News FATAL ERROR: Failed to load news data');
            console.error('🚨 News ERROR DETAILS:', {
                message: error.message,
                stack: error.stack,
                symbol: this.state.currentSymbol,
                apiClient: !!this.apiClient,
                timestamp: new Date().toISOString()
            });
            console.error('🚨 News NOTE: This component requires REAL BACKEND - NO MOCK FALLBACK EXISTS');
            
            this.handleError(error, 'data-loading');
            
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Process news data - STRICT VALIDATION
     * @param {Object} stockNews - Stock-specific news from API
     * @param {Object} marketNews - Market news from API
     * @returns {Object} Processed news data
     */
    processNewsData(stockNews, marketNews) {
        const processedData = {
            all: [],
            stock: [],
            market: [],
            categories: {
                earnings: [],
                analyst: [],
                general: [],
                market: []
            },
            sentiment: {
                positive: 0,
                negative: 0,
                neutral: 0
            }
        };

        // Process stock-specific news
        if (stockNews && stockNews.news && Array.isArray(stockNews.news)) {
            stockNews.news.forEach(item => {
                const processedItem = this.processNewsItem(item, 'stock');
                if (processedItem) {
                    processedData.stock.push(processedItem);
                    processedData.all.push(processedItem);
                    this.categorizeNews(processedItem, processedData.categories);
                    this.analyzeSentiment(processedItem, processedData.sentiment);
                }
            });
        }

        // Process market news
        if (marketNews && marketNews.news && Array.isArray(marketNews.news)) {
            marketNews.news.forEach(item => {
                const processedItem = this.processNewsItem(item, 'market');
                if (processedItem) {
                    processedData.market.push(processedItem);
                    processedData.all.push(processedItem);
                    this.categorizeNews(processedItem, processedData.categories);
                    this.analyzeSentiment(processedItem, processedData.sentiment);
                }
            });
        }

        // Sort all news by date (newest first)
        processedData.all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        // Limit to max items
        processedData.all = processedData.all.slice(0, this.config.maxNewsItems);

        return processedData;
    }

    /**
     * Process individual news item
     * @param {Object} item - Raw news item
     * @param {string} type - News type (stock/market)
     * @returns {Object|null} Processed news item
     */
    processNewsItem(item, type) {
        if (!item || !item.title) {
            return null;
        }

        return {
            id: item.id || this.generateNewsId(item),
            title: item.title,
            summary: item.summary || item.description || this.truncateText(item.title, 150),
            url: item.url || item.link,
            source: item.source || item.publisher || 'Unknown',
            publishedAt: item.published_at || item.publishedAt || item.date || new Date().toISOString(),
            type: type,
            category: this.determineCategory(item),
            sentiment: this.determineSentiment(item),
            relevanceScore: item.relevance_score || this.calculateRelevance(item, type),
            imageUrl: item.image_url || item.image || null,
            author: item.author || null,
            tags: item.tags || [],
            isBreaking: item.is_breaking || false
        };
    }

    /**
     * Generate unique news ID
     * @param {Object} item - News item
     * @returns {string} Generated ID
     */
    generateNewsId(item) {
        const content = (item.title + item.url + item.publishedAt).replace(/\s/g, '');
        return btoa(content).substring(0, 16);
    }

    /**
     * Determine news category
     * @param {Object} item - News item
     * @returns {string} Category
     */
    determineCategory(item) {
        const title = (item.title || '').toLowerCase();
        const summary = (item.summary || item.description || '').toLowerCase();
        const content = title + ' ' + summary;

        if (content.includes('earnings') || content.includes('quarterly') || content.includes('revenue')) {
            return 'earnings';
        }
        if (content.includes('analyst') || content.includes('rating') || content.includes('upgrade') || content.includes('downgrade')) {
            return 'analyst';
        }
        if (content.includes('market') || content.includes('index') || content.includes('economy')) {
            return 'market';
        }
        return 'general';
    }

    /**
     * Determine sentiment
     * @param {Object} item - News item
     * @returns {string} Sentiment
     */
    determineSentiment(item) {
        if (item.sentiment) {
            return item.sentiment;
        }

        const title = (item.title || '').toLowerCase();
        const summary = (item.summary || item.description || '').toLowerCase();
        const content = title + ' ' + summary;

        const positiveWords = ['up', 'rise', 'gain', 'growth', 'positive', 'strong', 'beat', 'exceed', 'upgrade'];
        const negativeWords = ['down', 'fall', 'loss', 'decline', 'negative', 'weak', 'miss', 'downgrade', 'concern'];

        const positiveCount = positiveWords.filter(word => content.includes(word)).length;
        const negativeCount = negativeWords.filter(word => content.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Calculate relevance score
     * @param {Object} item - News item
     * @param {string} type - News type
     * @returns {number} Relevance score (0-1)
     */
    calculateRelevance(item, type) {
        let score = 0.5; // Base score

        // Stock-specific news gets higher relevance
        if (type === 'stock') {
            score += 0.3;
        }

        // Recent news gets higher relevance
        const publishedAt = new Date(item.publishedAt || item.published_at || item.date);
        const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1) score += 0.2;
        else if (hoursAgo < 6) score += 0.1;
        else if (hoursAgo < 24) score += 0.05;

        // Breaking news gets higher relevance
        if (item.is_breaking) {
            score += 0.2;
        }

        return Math.min(1, score);
    }

    /**
     * Categorize news item
     * @param {Object} item - Processed news item
     * @param {Object} categories - Categories object
     */
    categorizeNews(item, categories) {
        if (categories[item.category]) {
            categories[item.category].push(item);
        }
    }

    /**
     * Analyze sentiment
     * @param {Object} item - Processed news item
     * @param {Object} sentiment - Sentiment object
     */
    analyzeSentiment(item, sentiment) {
        if (sentiment[item.sentiment] !== undefined) {
            sentiment[item.sentiment]++;
        }
    }

    /**
     * Render the news bubble
     */
    render() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.state.data) return;

        const data = this.state.data;

        container.innerHTML = `
            <div class="news-content">
                <div class="news-header">
                    <h3>News Highlights</h3>
                    <div class="news-stats">
                        <span class="news-count">${data.all.length} articles</span>
                        <div class="sentiment-indicator">
                            <span class="sentiment positive" title="Positive: ${data.sentiment.positive}">
                                ${data.sentiment.positive}
                            </span>
                            <span class="sentiment neutral" title="Neutral: ${data.sentiment.neutral}">
                                ${data.sentiment.neutral}
                            </span>
                            <span class="sentiment negative" title="Negative: ${data.sentiment.negative}">
                                ${data.sentiment.negative}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="news-filters">
                    <button class="filter-button ${this.state.selectedCategory === 'all' ? 'active' : ''}" 
                            data-category="all">All</button>
                    <button class="filter-button ${this.state.selectedCategory === 'stock' ? 'active' : ''}" 
                            data-category="stock">Stock</button>
                    <button class="filter-button ${this.state.selectedCategory === 'market' ? 'active' : ''}" 
                            data-category="market">Market</button>
                    <button class="filter-button ${this.state.selectedCategory === 'earnings' ? 'active' : ''}" 
                            data-category="earnings">Earnings</button>
                    <button class="filter-button ${this.state.selectedCategory === 'analyst' ? 'active' : ''}" 
                            data-category="analyst">Analyst</button>
                </div>

                <div class="news-list">
                    ${this.renderNewsList()}
                </div>

                <div class="data-footer">
                    <span class="last-update">Updated: ${this.formatTimestamp(this.state.lastUpdate)}</span>
                    <button class="refresh-button" onclick="window.newsBubble?.loadData()">
                        Refresh
                    </button>
                </div>
            </div>
        `;

        // Setup interaction handlers
        this.setupInteractionHandlers();
    }

    /**
     * Render news list based on selected category
     * @returns {string} HTML string
     */
    renderNewsList() {
        let newsItems = [];

        switch (this.state.selectedCategory) {
            case 'all':
                newsItems = this.state.data.all;
                break;
            case 'stock':
                newsItems = this.state.data.stock;
                break;
            case 'market':
                newsItems = this.state.data.market;
                break;
            case 'earnings':
                newsItems = this.state.data.categories.earnings;
                break;
            case 'analyst':
                newsItems = this.state.data.categories.analyst;
                break;
            default:
                newsItems = this.state.data.all;
        }

        if (newsItems.length === 0) {
            return '<div class="no-news">No news available for this category</div>';
        }

        return newsItems.map(item => this.renderNewsItem(item)).join('');
    }

    /**
     * Render individual news item
     * @param {Object} item - News item
     * @returns {string} HTML string
     */
    renderNewsItem(item) {
        const timeAgo = this.formatTimeAgo(item.publishedAt);
        const relevanceClass = this.getRelevanceClass(item.relevanceScore);
        const sentimentClass = `sentiment-${item.sentiment}`;

        return `
            <div class="news-item ${relevanceClass} ${sentimentClass}" data-news-id="${item.id}">
                ${item.isBreaking ? '<div class="breaking-badge">BREAKING</div>' : ''}
                
                <div class="news-item-content">
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span>
                        <span class="news-time">${timeAgo}</span>
                        <span class="news-type">${item.type}</span>
                        <span class="news-category">${item.category}</span>
                    </div>
                    
                    <h4 class="news-title">${item.title}</h4>
                    
                    ${item.summary ? `<p class="news-summary">${item.summary}</p>` : ''}
                    
                    <div class="news-footer">
                        <div class="news-indicators">
                            <span class="sentiment-indicator ${item.sentiment}">${item.sentiment}</span>
                            <span class="relevance-score">Relevance: ${Math.round(item.relevanceScore * 100)}%</span>
                        </div>
                        
                        ${item.url ? `
                            <a href="${item.url}" target="_blank" class="read-more-link" 
                               onclick="event.stopPropagation()">
                                Read More →
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                ${item.imageUrl ? `
                    <div class="news-image">
                        <img src="${item.imageUrl}" alt="${item.title}" loading="lazy">
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Setup interaction handlers
     */
    setupInteractionHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Filter button handlers
        const filterButtons = container.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                this.changeCategory(category);
            });
        });

        // News item click handlers
        const newsItems = container.querySelectorAll('.news-item');
        newsItems.forEach(item => {
            item.addEventListener('click', () => {
                const newsId = item.dataset.newsId;
                this.showNewsDetail(newsId);
            });
        });

        // External link handlers
        const readMoreLinks = container.querySelectorAll('.read-more-link');
        readMoreLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                this.trackNewsClick(link.href);
            });
        });
    }

    /**
     * Change news category
     * @param {string} category - New category
     */
    changeCategory(category) {
        if (category === this.state.selectedCategory) return;

        console.log(`NewsBubble: Changing category to ${category}`);
        this.state.selectedCategory = category;
        
        // Re-render with new category
        this.render();
        
        this.dispatchEvent('news-category-changed', { category });
    }

    /**
     * Show news detail
     * @param {string} newsId - News item ID
     */
    showNewsDetail(newsId) {
        const newsItem = this.findNewsItem(newsId);
        if (newsItem) {
            console.log(`NewsBubble: News detail requested for ${newsId}`);
            this.dispatchEvent('news-detail-requested', { newsItem });
        }
    }

    /**
     * Find news item by ID
     * @param {string} newsId - News item ID
     * @returns {Object|null} News item
     */
    findNewsItem(newsId) {
        return this.state.data.all.find(item => item.id === newsId) || null;
    }

    /**
     * Track news click
     * @param {string} url - News URL
     */
    trackNewsClick(url) {
        console.log(`NewsBubble: News link clicked: ${url}`);
        this.dispatchEvent('news-link-clicked', { url });
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        console.log(`NewsBubble: Changing symbol from ${this.state.currentSymbol} to ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.data = null;
        this.state.selectedCategory = 'all';
        
        // Clear existing content
        this.showLoadingState();
        
        // Load new data
        await this.loadData();
        
        this.dispatchEvent('symbol-changed', { symbol });
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (!this.state.isLoading) {
                console.log('NewsBubble: Auto-refreshing data...');
                this.loadData();
            }
        }, this.config.refreshInterval);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for symbol changes from other components
        document.addEventListener('symbol-changed', (event) => {
            if (event.detail && event.detail.symbol) {
                this.changeSymbol(event.detail.symbol);
            }
        });

        // Listen for theme changes
        document.addEventListener('theme-changed', (event) => {
            if (this.state.data) {
                this.render(); // Re-render with new theme
            }
        });
    }

    /**
     * Update loading state
     * @param {boolean} isLoading - Loading state
     */
    updateLoadingState(isLoading) {
        if (isLoading) {
            this.showLoadingState();
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="news-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading news...</div>
            </div>
        `;
    }

    /**
     * Handle errors with proper logging and user feedback
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        this.state.error = {
            message: error.message,
            context: context,
            timestamp: Date.now()
        };
        
        this.metrics.errors++;
        
        // Log detailed error information
        console.error(`NewsBubble Error [${context}]:`, {
            error: error.message,
            stack: error.stack,
            symbol: this.state.currentSymbol,
            timestamp: new Date().toISOString(),
            metrics: this.metrics
        });
        
        // Show error message to user
        this.showErrorMessage(error.message, context);
        
        // Dispatch error event for centralized handling
        this.dispatchEvent('news-error', {
            error: error.message,
            context: context,
            symbol: this.state.currentSymbol
        });
    }

    /**
     * Show error message in the bubble
     * @param {string} message - Error message
     * @param {string} context - Error context
     */
    showErrorMessage(message, context) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        const contextMessages = {
            'initialization': 'Failed to initialize news component',
            'data-loading': 'Unable to load news data from server',
            'api-error': 'News API temporarily unavailable',
            'network-error': 'Network connection error - check internet connection'
        };

        const userMessage = contextMessages[context] || 'An error occurred while loading news';

        container.innerHTML = `
            <div class="news-error-state">
                <div class="error-header">
                    <div class="error-icon">⚠️</div>
                    <h3>News Unavailable</h3>
                </div>
                <div class="error-content">
                    <p class="error-message">${userMessage}</p>
                    <p class="error-details">Error: ${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="window.newsBubble?.loadData()">
                            🔄 Retry Loading
                        </button>
                        <button class="refresh-page-button" onclick="window.location.reload()">
                            ↻ Refresh Page
                        </button>
                    </div>
                </div>
                <div class="error-footer">
                    <span class="error-time">Error occurred at: ${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;
    }

    // Utility methods
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getRelevanceClass(score) {
        if (score >= 0.8) return 'high-relevance';
        if (score >= 0.6) return 'medium-relevance';
        return 'low-relevance';
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Get current metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Destroy component
     */
    destroy() {
        console.log('NewsBubble: Destroying...');
        
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear container
        const container = document.getElementById(this.config.containerId);
        if (container) {
            container.innerHTML = '';
        }
        
        // Clear state
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: null,
            data: null,
            error: null,
            lastUpdate: null,
            selectedCategory: 'all'
        };
        
        console.log('NewsBubble: Destroyed');
    }
}

// Export for global use
window.NewsBubble = NewsBubble;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsBubble;
}

// ES6 export for modern modules
// REMOVED EXPORT: export { NewsBubble };
// REMOVED EXPORT: export default NewsBubble;

console.log('✅ NewsBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('news-bubble');
    if (container && !window.newsBubble) {
        console.log('NewsBubble: Auto-initializing...');
        window.newsBubble = new NewsBubble();
    }
}); 

/* ============================================================================
 * END OF FILE: components/analysis-bubbles/news/news.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chat/modules/chat-core.js
 * SIZE: 11,187 bytes
 * ============================================================================ */

/**
 * @file chat-core.js - Chat Core Logic Module
 * @description Core functionality for the chat component
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat Core Module
 * Handles core chat functionality, state management, and API communication
 */
class ChatCore {
    constructor(options = {}) {
        // Configuration
        this.config = {
            enableStreaming: options.enableStreaming !== false,
            enableAutoSummary: options.enableAutoSummary !== false,
            maxHistoryLength: options.maxHistoryLength || 50,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 2000,
            autoSummaryTrigger: options.autoSummaryTrigger || 'symbolChange'
        };
        
        // State
        this.state = {
            isInitialized: false,
            isStreaming: false,
            currentChatId: null,
            messages: [],
            context: {
                ticker: 'AAPL',
                lastUpdate: null,
                userPreferences: {}
            },
            retryCount: 0,
            errors: []
        };
        
        // Performance metrics
        this.metrics = {
            messageCount: 0,
            averageResponseTime: 0,
            streamingTokens: 0,
            errorCount: 0
        };
        
        // Event system
        this.eventListeners = new Map();
        
        console.log('🧠 ChatCore initialized');
    }
    
    /**
     * Initialize core functionality
     */
    async init() {
        try {
            console.log('🔧 Initializing ChatCore...');
            
            // Generate initial chat ID
            this.state.currentChatId = this.generateChatId();
            
            this.state.isInitialized = true;
            console.log('✅ ChatCore initialized successfully');
            
            // Emit ready event
            this.emit('core-ready', { component: 'chat-core' });
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatCore:', error);
            this.handleError(error, 'core-initialization');
            throw error;
        }
    }
    
    /**
     * Legacy alias to maintain compatibility with integrator code expecting initialize()
     */
    async initialize() {
        return this.init();
    }
    
    /**
     * Send message to API
     */
    async sendMessage(message) {
        if (!message?.trim()) {
            throw new Error('Message cannot be empty');
        }
        
        const startTime = performance.now();
        
        try {
            console.log('📤 Sending message to API:', message);
            
            // Add user message to state
            const userMessage = this.addMessage('user', message);
            
            // Prepare request data
            const ticker = this.state.context?.ticker || '';
            if (!ticker) {
                throw new Error('Ticker symbol missing from chat context');
            }
            const baseURL = (window.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
            const apiUrl = `${baseURL}/api/v1/stock/chat/${ticker}`;
            const requestData = {
                question: message.trim(),
                history: this.state.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
                ticker: ticker,
                // Future overrides or uploads can be added conditionally
            };
            
            // Send to API
            const response = await this.callAPI(requestData);
            
            // Calculate response time
            const responseTime = performance.now() - startTime;
            this.updateMetrics('responseTime', responseTime);
            
            return response;
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.handleError(error, 'message-sending');
            throw error;
        }
    }
    
    /**
     * Call API endpoint
     */
    async callAPI(requestData) {
        const ticker = this.state.context?.ticker || '';
        if (!ticker) {
            throw new Error('Ticker symbol missing from chat context');
        }
        const baseURL = (window.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
        const apiUrl = `${baseURL}/api/v1/stock/chat/${ticker}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            console.error('❌ API call failed:', error);
            throw error;
        }
    }
    
    /**
     * Add message to state
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            id: this.generateMessageId(),
            role: role,
            content: content,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };
        
        this.state.messages.push(message);
        this.updateMetrics('messageCount', this.state.messages.length);
        
        // Emit message added event
        this.emit('message-added', { message });
        this.emit('messageAdded', message);
        
        return message;
    }
    
    /**
     * Update message content (for streaming)
     */
    updateMessage(messageId, content) {
        const message = this.state.messages.find(m => m.id === messageId);
        if (message) {
            message.content = content;
            message.lastUpdated = new Date().toISOString();
            
            // Emit message updated event in both naming styles for compatibility
            this.emit('message-updated', { message }); // primary kebab-case
            this.emit('messageUpdated', messageId, content); // camelCase legacy
        }
    }
    
    /**
     * Set context (ticker, user preferences, etc.)
     */
    setContext(newContext) {
        const previousContext = { ...this.state.context };
        this.state.context = { ...this.state.context, ...newContext };
        
        console.log('🔄 Context updated:', this.state.context);
        
        // Emit context changed event
        this.emit('context-changed', { 
            previous: previousContext, 
            current: this.state.context 
        });
        
        // Trigger auto-summary if ticker changed
        if (this.config.enableAutoSummary && 
            previousContext.ticker !== this.state.context.ticker) {
            this.emit('ticker-changed', { 
                previous: previousContext.ticker, 
                current: this.state.context.ticker 
            });
        }
    }
    
    /**
     * Clear chat messages
     */
    clearMessages() {
        this.state.messages = [];
        this.state.currentChatId = this.generateChatId();
        this.updateMetrics('messageCount', 0);
        
        console.log('🗑️ Chat cleared');
        
        // Emit chat cleared event
        this.emit('chat-cleared', { chatId: this.state.currentChatId });
    }
    
    /**
     * Generate unique chat ID
     */
    generateChatId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics(metric, value) {
        switch (metric) {
            case 'messageCount':
                this.metrics.messageCount = value;
                break;
            case 'responseTime':
                // Calculate rolling average
                const count = this.metrics.messageCount;
                this.metrics.averageResponseTime = 
                    (this.metrics.averageResponseTime * (count - 1) + value) / count;
                break;
            case 'streamingTokens':
                this.metrics.streamingTokens += value;
                break;
            case 'errorCount':
                this.metrics.errorCount += 1;
                break;
        }
        
        // Emit metrics updated event
        this.emit('metrics-updated', { metrics: this.metrics });
    }
    
    /**
     * Handle errors
     */
    handleError(error, context) {
        const errorInfo = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.state.errors.push(errorInfo);
        this.updateMetrics('errorCount', 1);
        
        console.error(`❌ ChatCore Error [${context}]:`, error);
        
        // Emit error event
        this.emit('error', { error: errorInfo });
    }
    
    /**
     * Event system - emit event
     */
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Event listener error [${eventName}]:`, error);
            }
        });
    }
    
    /**
     * Event system - add listener
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }
    
    /**
     * Event system - remove listener
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            isInitialized: this.state.isInitialized,
            isStreaming: this.state.isStreaming,
            messageCount: this.state.messages.length,
            currentTicker: this.state.context.ticker,
            chatId: this.state.currentChatId
        };
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Destroy core instance
     */
    destroy() {
        this.eventListeners.clear();
        this.state.messages = [];
        this.state.isInitialized = false;
        
        console.log('🗑️ ChatCore destroyed');
    }
}

// ✅ FIX: Global export for module communication
window.ChatCore = ChatCore;

// CommonJS export - only if module exists
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatCore,
        default: ChatCore
    };
}

// ES6 export
// REMOVED EXPORT: export { ChatCore };
// REMOVED EXPORT: export default ChatCore;

console.log('✅ ChatCore exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/chat/modules/chat-core.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chat/modules/chat-ui.js
 * SIZE: 42,042 bytes
 * ============================================================================ */

/**
 * @file chat-ui.js - Chat UI Module
 * @description Handles DOM manipulation and user interface for chat
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat UI Module
 * Manages DOM elements, user interactions, and visual feedback
 */
class ChatUI {
    constructor(containerId, options = {}) {
        // Support legacy signature where the first argument may be the FinanceHubChat instance
        if (typeof containerId === 'object' && containerId !== null) {
            const maybeChatInstance = containerId;
            // Attempt to read containerId from known structure
            if (maybeChatInstance.config && maybeChatInstance.config.containerId) {
                containerId = maybeChatInstance.config.containerId;
            } else if (typeof maybeChatInstance.containerId === 'string') {
                containerId = maybeChatInstance.containerId;
            } else {
                // Fallback to default
                containerId = 'chat-container';
            }
        }
        
        // Configuration
        this.config = {
            containerId: containerId || 'chat-container',
            enableAnimations: options.enableAnimations !== false,
            enableTypingIndicator: options.enableTypingIndicator !== false,
            autoScroll: options.autoScroll !== false,
            maxVisibleMessages: options.maxVisibleMessages || 100,
            messageAnimationDuration: options.messageAnimationDuration || 300
        };
        
        // DOM elements cache
        this.elements = {
            container: document.getElementById(containerId),
            messagesContainer: null,
            inputContainer: null,
            input: null,
            sendButton: null,
            typingIndicator: null,
            modelButtons: [],
            attachButton: null,
            fileInput: null,
            attachmentsContainer: null
        };
        
        // State
        this.state = {
            isInitialized: false,
            isMinimized: false,
            isTypingIndicatorVisible: false,
            messageElements: new Map(),
            lastScrollPosition: 0,
            attachments: []
        };
        
        // Event system
        this.eventListeners = new Map();
        
        console.log('🎨 ChatUI initialized');
    }
    
    /**
     * Initialize UI components
     */
    async init() {
        try {
            console.log('🔧 Initializing ChatUI...');
            
            // Find container
            this.elements.container = document.getElementById(this.config.containerId);
            if (!this.elements.container) {
                throw new Error(`Container not found: ${this.config.containerId}`);
            }
            
            // Setup DOM structure
            this.setupDOM();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Apply initial styling
            this.applyInitialStyling();
            
            this.state.isInitialized = true;
            console.log('✅ ChatUI initialized successfully');
            
            // Emit ready event
            this.emit('ui-ready', { component: 'chat-ui' });
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatUI:', error);
            throw error;
        }
    }
    
    /**
     * Legacy alias expected by FinanceHubChat.initializeModules()
     * Simply forwards to init() to preserve single initialization logic.
     */
    async initialize() {
        return this.init();
    }
    
    /**
     * Setup DOM structure
     */
    setupDOM() {
        // Apply unified chat container styling classes
        this.elements.container.className = 'fh-chat chat-animated';

        // Unified DOM template with SVG-based send icon and hidden error banner placeholder
        this.elements.container.innerHTML = `
            <div id="fh-chat-fallback-notice" class="fh-chat__error-banner" hidden>
                <div class="fh-chat__error-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
                        <path d="M12 11V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                        <circle cx="12" cy="8" r="1" fill="currentColor"></circle>
                    </svg>
                </div>
                <span class="fh-chat__error-text"></span>
            </div>

            <div class="fh-chat__messages" id="chat-messages"></div>
            
            <div class="fh-chat__input-container fh-sticky-bottom chat-ribbon">
                <div class="fh-chat__input-wrapper">
                    <!-- Attachment button -->
                    <button id="chat-attach-btn" class="fh-chat__icon-btn" title="Attach file" aria-label="Attach file">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__icon">
                            <g>
                                <path d="M14 4c-1.66 0-3 1.34-3 3v8c0 .55.45 1 1 1s1-.45 1-1V8h2v7c0 1.66-1.34 3-3 3s-3-1.34-3-3V7c0-2.76 2.24-5 5-5s5 2.24 5 5v8c0 3.87-3.13 7-7 7s-7-3.13-7-7V8h2v7c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-1.66-1.34-3-3-3z"></path>
                            </g>
                        </svg>
                    </button>

                    <!-- Search button -->
                    <button id="chat-search-btn" class="fh-chat__icon-btn" title="Search the web" aria-label="Search the web">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="fh-chat__icon">
                            <path d="M10 2.125C14.3492 2.125 17.875 5.65076 17.875 10C17.875 14.3492 14.3492 17.875 10 17.875C5.65076 17.875 2.125 14.3492 2.125 10C2.125 5.65076 5.65076 2.125 10 2.125ZM7.88672 10.625C7.94334 12.3161 8.22547 13.8134 8.63965 14.9053C8.87263 15.5194 9.1351 15.9733 9.39453 16.2627C9.65437 16.5524 9.86039 16.625 10 16.625C10.1396 16.625 10.3456 16.5524 10.6055 16.2627C10.8649 15.9733 11.1274 15.5194 11.3604 14.9053C11.7745 13.8134 12.0567 12.3161 12.1133 10.625H7.88672ZM3.40527 10.625C3.65313 13.2734 5.45957 15.4667 7.89844 16.2822C7.7409 15.997 7.5977 15.6834 7.4707 15.3486C6.99415 14.0923 6.69362 12.439 6.63672 10.625H3.40527ZM13.3633 10.625C13.3064 12.439 13.0059 14.0923 12.5293 15.3486C12.4022 15.6836 12.2582 15.9969 12.1006 16.2822C14.5399 15.467 16.3468 13.2737 16.5947 10.625H13.3633ZM12.1006 3.7168C12.2584 4.00235 12.4021 4.31613 12.5293 4.65137C13.0059 5.90775 13.3064 7.56102 13.3633 9.375H16.5947C16.3468 6.72615 14.54 4.53199 12.1006 3.7168ZM10 3.375C9.86039 3.375 9.65437 3.44756 9.39453 3.7373C9.1351 4.02672 8.87263 4.48057 8.63965 5.09473C8.22547 6.18664 7.94334 7.68388 7.88672 9.375H12.1133C12.0567 7.68388 11.7745 6.18664 11.3604 5.09473C11.1274 4.48057 10.8649 4.02672 10.6055 3.7373C10.3456 3.44756 10.1396 3.375 10 3.375ZM7.89844 3.7168C5.45942 4.53222 3.65314 6.72647 3.40527 9.375H6.63672C6.69362 7.56102 6.99415 5.90775 7.4707 4.65137C7.59781 4.31629 7.74073 4.00224 7.89844 3.7168Z"></path>
                        </svg>
                    </button>

                    <!-- Model switch button -->
                    <button id="chat-model-btn" class="fh-chat__icon-btn" title="Switch AI model" aria-label="Switch AI model">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__icon">
                            <g>
                                <path d="M14 6V3h2v8h-2V8H3V6h11zm7 2h-3.5V6H21v2zM8 16v-3h2v8H8v-3H3v-2h5zm13 2h-9.5v-2H21v2z"></path>
                            </g>
                        </svg>
                    </button>

                    <!-- Main input -->
                    <textarea 
                        id="chat-input" 
                        class="fh-chat__input" 
                        placeholder="Ask about this stock..."
                        rows="1"
                    ></textarea>

                    <!-- Hidden file input -->
                    <input id="chat-file-input" type="file" accept="image/*,.pdf,.txt,.csv,.xlsx,.docx" multiple hidden />

                    <!-- Attachments preview -->
                    <div id="chat-attachments" class="fh-chat__attachments"></div>

                    <!-- Send button -->
                    <button id="chat-send-btn" class="fh-chat__send-btn" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__send-icon">
                            <g>
                                <path d="M12 3.59l7.457 7.45-1.414 1.42L13 7.41V21h-2V7.41l-5.043 5.05-1.414-1.42L12 3.59z"></path>
                            </g>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.messagesContainer = this.elements.container.querySelector('#chat-messages');
        this.elements.inputContainer = this.elements.container.querySelector('.fh-chat__input-container');
        this.elements.input = this.elements.container.querySelector('#chat-input');
        this.elements.sendButton = this.elements.container.querySelector('#chat-send-btn');
        this.elements.typingIndicator = this.elements.container.querySelector('#chat-typing');
        this.elements.modelButtons = Array.from(this.elements.container.querySelectorAll('#chat-model-btn, .model-btn'));
        
        // File attachment elements
        this.elements.attachButton = this.elements.container.querySelector('#chat-attach-btn');
        this.elements.fileInput = this.elements.container.querySelector('#chat-file-input');
        this.elements.attachmentsContainer = this.elements.container.querySelector('#chat-attachments');
        
        // Initialize attachments array
        this.state.attachments = [];
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Attachment button
        if (this.elements.attachButton && this.elements.fileInput) {
            this.elements.attachButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.fileInput.click();
            });

            this.elements.fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                this.handleFileSelect(files);
                // reset so same file can be selected again
                this.elements.fileInput.value = '';
            });
        }
        
        // Input events
        this.elements.input.addEventListener('input', () => {
            this.autoResizeInput();
            this.updateSendButtonState();
        });
        
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.emit('send-message', { message: this.elements.input.value.trim() });
            }
        });
        
        // Button events
        this.elements.sendButton.addEventListener('click', () => {
            this.emit('send-message', { message: this.elements.input.value.trim() });
        });
        
        // Model selector buttons - support multiple instances
        if (this.elements.modelButtons.length) {
            console.log('🎯 Setting up model selector for buttons:', this.elements.modelButtons.length);

            this.elements.modelButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔄 Model button clicked');

                    // If selector already exists, just update anchor and toggle
                    if (this.modelSelector) {
                        this.modelSelector.anchorEl = btn;
                        this.modelSelector.toggle();
                    } else {
                        // Create selector with current anchor
                        this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                            console.log('🎯 Model selected:', modelId, modelName);
                            this.emit('model-selected', { modelId, modelName });
                        });
                        this.modelSelector.open();
                    }
                });
            });
        } else {
            console.warn('⚠️ No model buttons found in DOM');
        }
        
        // 🔧 Delegated click-handler to support dynamically added model buttons
        this.elements.container.addEventListener('click', (evt) => {
            const btn = evt.target.closest('#chat-model-btn, .model-btn');
            if (!btn) {
                // Not a model button click ➜ early exit (still useful to log once for debugging noise)
                // console.debug('Model-selector delegate: non-target click ignored');
                return;
            }

            console.log('✅ Delegate caught model-button click');

            evt.preventDefault();
            evt.stopPropagation();

            if (this.modelSelector) {
                this.modelSelector.anchorEl = btn;
                this.modelSelector.toggle();
                console.log('🔁 Existing selector toggled');
            } else {
                this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                    console.log('📌 Model selected via delegate:', modelId, modelName);
                    this.emit('model-selected', { modelId, modelName });
                });
                this.modelSelector.open();
                console.log('🌟 New selector instantiated & opened');
            }
        });
        
        // 🌍 Global capture-phase listener – fallback when container delegation fails
        document.addEventListener('click', (evt) => {
            const btn = evt.target.closest('#chat-model-btn, .model-btn');
            if (!btn) return; // Ignore non-target clicks

            console.log('🌍 Global capture detected model-button click');

            evt.preventDefault();
            evt.stopPropagation();

            if (this.modelSelector) {
                this.modelSelector.anchorEl = btn;
                this.modelSelector.toggle();
                console.log('🔁 Existing selector toggled (global)');
            } else {
                this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                    console.log('�� Model selected via global capture:', modelId, modelName);
                    this.emit('model-selected', { modelId, modelName });
                });
                this.modelSelector.open();
                console.log('🌟 New selector instantiated & opened (global)');
            }
        }, true);
        
        // Scroll events
        this.elements.messagesContainer.addEventListener('scroll', () => {
            this.state.lastScrollPosition = this.elements.messagesContainer.scrollTop;
        });
    }
    
    /**
     * Apply initial styling
     */
    applyInitialStyling() {
        // Add CSS classes for animations if enabled
        if (this.config.enableAnimations) {
            this.elements.container.classList.add('chat-animated');
        }
        
        // Set initial input state
        this.updateSendButtonState();
    }
    
    /**
     * Add message to UI
     */
    addMessage(message) {
        // 🩹 Hotfix: re-acquire messagesContainer in case DOM was reconstructed after initial cache
        if (!this.elements.messagesContainer || !this.elements.messagesContainer.isConnected) {
            // Try primary selector
            this.elements.messagesContainer = this.elements.container && this.elements.container.querySelector('#chat-messages');
            // Fallback: legacy / alt selector used in financehub.html
            if (!this.elements.messagesContainer) {
                this.elements.messagesContainer = this.elements.container && this.elements.container.querySelector('#fh-ai-chat__messages');
            }
            if (!this.elements.messagesContainer) {
                console.error('❌ ChatUI.addMessage: messages container not found');
                return null; // Prevent further errors
            }
        }
        const messageElement = this.createMessageElement(message);
        
        // Remove welcome message if this is the first real message
        const welcomeMessage = this.elements.messagesContainer.querySelector('.chat-welcome');
        if (welcomeMessage && this.state.messageElements.size === 0) {
            welcomeMessage.remove();
        }
        
        // Add to container
        this.elements.messagesContainer.appendChild(messageElement);
        
        // Cache element
        this.state.messageElements.set(message.id, messageElement);
        
        // Animate in if enabled
        if (this.config.enableAnimations) {
            this.animateMessageIn(messageElement);
        }
        
        // Auto scroll
        if (this.config.autoScroll) {
            this.scrollToBottom();
        }
        
        // Update message count
        this.updateMessageCount();
        
        return messageElement;
    }
    
    /**
     * Create message DOM element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        // Summary messages reuse premium AI summary card styles
        if (message.isSummary) {
            messageDiv.className = 'ai-summary';
            messageDiv.dataset.messageId = message.id;
            messageDiv.innerHTML = `
                <div class="summary-content" id="message-text-${message.id}">
                    ${this.formatMessageContent(message.content)}
                </div>`;
        } else {
            messageDiv.className = `chat-message chat-message--${message.type || message.role}`;
            messageDiv.dataset.messageId = message.id;
            messageDiv.innerHTML = `
                <div class="chat-message__bubble">
                    <div class="chat-message__content" id="message-text-${message.id}">
                        ${this.formatMessageContent(message.content)}
                    </div>
                </div>`;
        }
        
        return messageDiv;
    }
    
    /**
     * Update message content (for streaming)
     */
    updateMessage(messageId, content) {
        const messageElement = this.state.messageElements.get(messageId);
        if (messageElement) {
            const textElement = messageElement.querySelector(`#message-text-${messageId}`);
            if (textElement) {
                textElement.innerHTML = this.formatMessageContent(content);
                
                // Auto scroll during streaming
                if (this.config.autoScroll) {
                    this.scrollToBottom();
                }
            }
        }
    }
    
    /**
     * Format message content
     */
    formatMessageContent(content) {
        if (content === null || typeof content === 'undefined') return '';
        // If content is an object coming from backend, extract useful field
        if (typeof content !== 'string') {
            // Common FinanceHub backend format => { metadata: {...}, ai_summary: "..." }
            if (content && typeof content === 'object' && 'ai_summary' in content) {
                content = content.ai_summary || '';
            } else {
                try {
                    content = JSON.stringify(content, null, 2);
                } catch {
                    content = String(content);
                }
            }
        }
        
        // ---- Enhanced formatting & sanitization ----
        // 1) Strip leading / trailing code fences  ``` or ```text
        let txt = content
            .replace(/^\s*```[\s]*[a-zA-Z0-9]*[\s]*\n?/m, '') // allow leading whitespace
            .replace(/```[\s]*$/m, '');

        // 1.b) Convert literal "\n" sequences (backend marks line breaks) to real newline characters
        txt = txt.replace(/\\n/g, '\n');

        // 1.c) Remove stray language hints (e.g., "text", "tex") that may remain after code fence stripping
        txt = txt.replace(/^\s*(text|tex)\s*/i, '');

        // 1.d) Remove lone inline-code marker `text` that sometimes prefixes the payload
        txt = txt.replace(/^`text`\s*/i, '');

        // 2) Collapse duplicated consecutive words (e.g. "vezető vezető" → "vezető")
        //    Works with any non-space sequence (handles accents) and reduces 2+ repeats.
        txt = txt.replace(/\b([^\s]+)(?:\s+\1\b)+/giu, '$1');

        // 3) Trim excessive whitespace (keep line breaks for paragraphs)
        //    • collapse multiple spaces / tabs → single space
        //    • collapse 3+ consecutive newlines → double newline (paragraph break)
        txt = txt
            .replace(/[ \t]{2,}/g, ' ')     // shrink repeated spaces / tabs
            .replace(/\n{3,}/g, '\n\n')   // limit empty lines to max two (paragraph)
            .trim();

        // 4) Headings – Roman numeral section titles (e.g. "I. VEZETŐI …") → <h2>
        txt = txt.replace(/^(?:\s*)([IVX]+\.)\s+([^\n]+)/gmu, (m, numeral, heading) => {
            return `\n\n<h2>${numeral} ${heading}</h2>\n\n`;
        });

        // 5) Markdown → HTML (bold, italic, code)
        txt = txt
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        // 6) Convert bullet lines to <ul><li>
        if (/^[-*+•]\s+/m.test(txt)) {
            const lines = txt.split(/\n+/);
            const items = lines.filter(l => /^[-*+•]\s+/.test(l)).map(l => l.replace(/^[-*+•]\s+/, '').trim());
            if (items.length > 0) {
                const listHtml = '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
                // Remove bullet lines from original and append list
                txt = lines.filter(l => !/^[-*+•]\s+/.test(l)).join('\n').trim();
                txt += (txt ? '<br>' : '') + listHtml;
            }
        }

        // 7) Convert paragraphs & line breaks → HTML – hagyjuk érintetlenül a már HTML blokkot (<h2>, <ul>)
        txt = txt
            .replace(/\n{3,}/g, '\n\n')
            .split(/\n{2,}/)
            // Inside paragraph, single newline -> <br>
            .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`) // wrap each block in <p>
            .join('');

        // 8) Hard truncate extremely long messages (10k chars) to avoid UI lock
        if (txt.length > 10000) {
            txt = txt.slice(0, 10000) + '…';
        }

        return txt;
    }
    
    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Animate message in
     */
    animateMessageIn(messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            messageElement.style.transition = `opacity ${this.config.messageAnimationDuration}ms ease, transform ${this.config.messageAnimationDuration}ms ease`;
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });
    }
    
    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        if (this.config.enableTypingIndicator && !this.state.isTypingIndicatorVisible) {
            this.elements.typingIndicator.style.display = 'flex';
            this.state.isTypingIndicatorVisible = true;
            if (this.config.autoScroll) this.scrollToBottom();
        }
    }
    
    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        if (this.state.isTypingIndicatorVisible) {
            this.elements.typingIndicator.style.display = 'none';
            this.state.isTypingIndicatorVisible = false;
        }
    }
    
    /**
     * -----------------------------------------------------------------
     * Legacy compatibility helpers expected by FinanceHubChat
     * -----------------------------------------------------------------
     */
    showStreamingIndicator() {
        // Utilize typing indicator for streaming feedback
        this.showTypingIndicator();
    }

    hideStreamingIndicator() {
        this.hideTypingIndicator();
    }

    appendToLastMessage(delta) {
        if (!delta) return;
        
        // Get the last message element (chat bubble or ai-summary)
        const lastMessageEl = this.elements.messagesContainer?.lastElementChild;
        if (!lastMessageEl) return;
        
        // Get the message ID from the dataset
        const messageId = lastMessageEl.dataset.messageId;
        if (!messageId) return;
        
        // Find the content element using the correct ID selector
        const contentEl = lastMessageEl.querySelector(`#message-text-${messageId}`);
        if (contentEl) {
            // Stream-friendly: append raw sanitized delta without extra block wrappers to avoid
            // line-break after every single token. Final formatting will be applied once the
            // complete message arrives through the standard updateMessage path.

            // Basic HTML entity escaping to prevent injection while preserving spaces/newlines.
            const sanitized = delta
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, ' ') // treat inline newlines as spaces during streaming
                .replace(/\\n/g, ' '); // also ignore escaped newline markers during streaming

            contentEl.insertAdjacentHTML('beforeend', sanitized);

            if (this.config.autoScroll) {
                this.scrollToBottom();
            }
        }
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        // Remove all message elements
        this.state.messageElements.clear();
        
        // Clear container and add welcome message
        this.elements.messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">👋</div>
                <div class="welcome-message">
                    <h4>Welcome to FinanceHub AI</h4>
                    <p>I'm here to help you analyze stocks, understand market trends, and provide financial insights.</p>
                </div>
            </div>
        `;
        
        // Update message count
        this.updateMessageCount();
        
        // Hide typing indicator
        this.hideTypingIndicator();
    }
    
    /**
     * Update send button state
     */
    updateSendButtonState() {
        const hasText = this.elements.input.value.trim().length > 0;
        this.elements.sendButton.disabled = !hasText;
        
        if (hasText) {
            this.elements.sendButton.classList.add('chat-send-btn-active');
        } else {
            this.elements.sendButton.classList.remove('chat-send-btn-active');
        }
    }
    
    /**
     * Auto resize input textarea
     */
    autoResizeInput() {
        this.elements.input.style.height = 'auto';
        this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
    }
    
    /**
     * Update message count display
     */
    updateMessageCount() {
        const count = this.state.messageElements.size;
        if (this.elements.messageCount) {
            this.elements.messageCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
        }
    }
    
    /**
     * Update context display
     */
    updateContext(context) {
        if (context.ticker) {
            this.elements.contextInfo.textContent = `Analyzing: ${context.ticker}`;
        }
    }
    
    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        });
    }
    
    /**
     * Clear input
     */
    clearInput() {
        this.elements.input.value = '';
        this.autoResizeInput();
        this.updateSendButtonState();
    }
    
    /**
     * Focus input
     */
    focusInput() {
        this.elements.input.focus();
    }
    
    /**
     * Show/hide suggestions
     */
    showSuggestions() {
        if (this.elements.suggestionsContainer) {
            this.elements.suggestionsContainer.style.display = 'flex';
        }
    }
    
    hideSuggestions() {
        if (this.elements.suggestionsContainer) {
            this.elements.suggestionsContainer.style.display = 'none';
        }
    }
    
    /**
     * Event system - emit event
     */
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Event listener error [${eventName}]:`, error);
            }
        });
    }
    
    /**
     * Event system - add listener
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }
    
    /**
     * Event system - remove listener
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Get current UI state
     */
    getState() {
        return {
            isInitialized: this.state.isInitialized,
            isMinimized: this.state.isMinimized,
            isTypingIndicatorVisible: this.state.isTypingIndicatorVisible,
            messageCount: this.state.messageElements.size,
            scrollPosition: this.state.lastScrollPosition
        };
    }
    
    /**
     * Destroy UI instance
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.clear();
        
        // Clear DOM
        if (this.elements.container) {
            this.elements.container.innerHTML = '';
        }
        
        // Reset state
        this.state.messageElements.clear();
        this.state.isInitialized = false;
        
        console.log('🗑️ ChatUI destroyed');
    }
    
    /**
     * Render message (alias for addMessage) – required by FinanceHubChat
     * @param {Object} message - message object from ChatCore
     * @returns {HTMLElement|null}
     */
    renderMessage(message) {
        return this.addMessage(message);
    }
    
    /**
     * Handle user-selected files, create previews & store to state
     * @param {File[]} files
     */
    handleFileSelect(files) {
        if (!files.length) return;
        files.forEach(file => {
            // Limit to 5 attachments
            if (this.state.attachments.length >= 5) return;
            const attachment = { file, previewSrc: null };

            if (file.type.startsWith('image/')) {
                // Create compressed preview using canvas (max 96px)
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => {
                        const maxDim = 96;
                        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        attachment.previewSrc = canvas.toDataURL('image/jpeg', 0.7);
                        this.renderAttachmentPreview(attachment);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Non-image: use a generic icon preview
                attachment.previewSrc = null;
                this.renderAttachmentPreview(attachment);
            }

            this.state.attachments.push(attachment);
        });
    }
    
    /**
     * Render tiny preview chip inside attachments container
     */
    renderAttachmentPreview(attachment) {
        if (!this.elements.attachmentsContainer) return;
        const chip = document.createElement('div');
        chip.className = 'fh-chat__attachment-chip';

        if (attachment.previewSrc) {
            const img = document.createElement('img');
            img.src = attachment.previewSrc;
            img.alt = attachment.file.name;
            chip.appendChild(img);
        } else {
            // Use simple file icon
            chip.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path fill="currentColor" d="M14 2v6h6"/></svg>';
        }

        // Remove chip on click
        chip.addEventListener('click', () => {
            this.elements.attachmentsContainer.removeChild(chip);
            this.state.attachments = this.state.attachments.filter(a => a !== attachment);
        });

        this.elements.attachmentsContainer.appendChild(chip);
        this.updateSendButtonState();
    }
}

// End of ChatUI module

// Make globally accessible for ComponentLoader bundling
if (typeof window !== 'undefined') {
    window.ChatUI = ChatUI;
}

// Support CommonJS/ES module importing if build system uses it
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatUI;
}

// REMOVED EXPORT: export default ChatUI;

console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)');

// ADD ChatModelSelector micro-component (≤120 lines)
class ChatModelSelector {
    constructor(anchorEl, onSelect) {
        if (!anchorEl) {
            console.error('❌ ChatModelSelector: anchorEl is required');
            return;
        }
        
        this.anchorEl = anchorEl;
        this.onSelect = onSelect;
        this.models = [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro' },
            { id: 'mistral-large',    name: 'Mistral Large' }
        ];
        this.currentModel = this.models[0].id;
        this.isOpen = false;
        this.dropdown = null;
        
        console.log('🎯 ChatModelSelector initialized with anchor:', anchorEl);
        this.buildDropdown();
    }

    buildDropdown() {
        try {
            // Container
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'fh-chat__model-dropdown';
            this.dropdown.style.display = 'none';
            this.dropdown.style.position = 'fixed';
            
            // Append markup
            this.dropdown.innerHTML = `
                <ul class="fh-chat__model-list">
                    ${this.models.map(m => `<li data-model="${m.id}" class="fh-chat__model-item">${m.name}</li>`).join('')}
                </ul>`;
            
            // Attach dropdown at document.body level ⇒ sosem vágja le parent overflow, stack order mindig magas
            document.body.appendChild(this.dropdown);
            console.log('✅ Dropdown appended to <body>');
            
            // Click-outside handler
            this.clickOutsideHandler = (e) => {
                if (this.isOpen && !this.dropdown.contains(e.target) && !this.anchorEl.contains(e.target)) {
                    this.close();
                }
            };
            document.addEventListener('click', this.clickOutsideHandler);
            
            // Item selection handler
            this.dropdown.querySelectorAll('.fh-chat__model-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = item.dataset.model;
                    const name = item.textContent;
                    console.log('🎯 Model item clicked:', id, name);
                    this.currentModel = id;
                    this.highlightActive();
                    this.close();
                    if (typeof this.onSelect === 'function') {
                        this.onSelect(id, name);
                    }
                });
            });
            
            this.highlightActive();
            
            // Reposition on window scroll/resize while open
            this.repositionHandler = () => {
                if (this.isOpen) this.positionDropdown();
            };
            window.addEventListener('scroll', this.repositionHandler, { passive: true });
            window.addEventListener('resize', this.repositionHandler);
        } catch (error) {
            console.error('❌ Error building dropdown:', error);
        }
    }

    highlightActive() {
        if (!this.dropdown) return;
        
        this.dropdown.querySelectorAll('.fh-chat__model-item').forEach(li => {
            if (li.dataset.model === this.currentModel) {
                li.classList.add('fh-active');
            } else {
                li.classList.remove('fh-active');
            }
        });
    }

    open() {
        if (!this.dropdown) {
            console.warn('⚠️ Dropdown not initialized');
            return;
        }

        console.log('🔄 Opening dropdown');

        // First, make it visible but transparent for accurate measurement
        this.dropdown.style.display = 'block';
        this.dropdown.style.opacity = '0';

        // Wait for next frame to ensure DOM has painted and height is measurable
        requestAnimationFrame(() => {
            // Position now that we know dropdown height
            this.positionDropdown();

            // Animate to visible state
            this.dropdown.style.opacity = '1';
            this.dropdown.style.transform = 'scale(1) translateY(0)';
            this.isOpen = true;
        });
    }

    positionDropdown() {
        if (!this.dropdown || !this.anchorEl) return;

        try {
            // Viewport-relative coordinates (position: fixed)
            const buttonRect = this.anchorEl.getBoundingClientRect();

            const left = buttonRect.left;

            // Temporarily hide visually but keep layout for accurate height
            const prevVisibility = this.dropdown.style.visibility;
            const prevOpacity = this.dropdown.style.opacity;
            this.dropdown.style.visibility = 'hidden';
            this.dropdown.style.opacity = '0';
            const dropdownRect = this.dropdown.getBoundingClientRect();
            const dropdownHeight = dropdownRect.height || 160; // fallback heuristic
            // Restore initial styles before final placement
            this.dropdown.style.visibility = prevVisibility;
            this.dropdown.style.opacity = prevOpacity;

            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const gap = 8; // px

            let top;
            if (spaceBelow < dropdownHeight + gap) {
                // Not enough space below – render above the button
                top = buttonRect.top - dropdownHeight - gap;
                this.dropdown.classList.add('fh-dropup');
            } else {
                // Default: render below
                top = buttonRect.bottom + gap;
                this.dropdown.classList.remove('fh-dropup');
            }

            this.dropdown.style.left = `${left}px`;
            this.dropdown.style.top = `${top}px`;

            console.log('📍 Dropdown positioned at:', { left, top, dropdownHeight, spaceBelow });
        } catch (error) {
            console.error('❌ Error positioning dropdown:', error);
        }
    }

    close() {
        if (!this.dropdown) return;
        
        console.log('🔄 Closing dropdown');
        this.dropdown.style.display = 'none';
        this.dropdown.style.opacity = '0';
        this.dropdown.style.transform = 'scale(0.95) translateY(-4px)';
        this.isOpen = false;
    }

    toggle() {
        console.log('🔄 Toggling dropdown, current state:', this.isOpen);
        this.isOpen ? this.close() : this.open();
    }
    
    destroy() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
        if (this.repositionHandler) {
            window.removeEventListener('scroll', this.repositionHandler);
            window.removeEventListener('resize', this.repositionHandler);
        }
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
    }
}

// Expose globally for other modules if needed
if (typeof window !== 'undefined') {
    window.ChatModelSelector = ChatModelSelector;
}

console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/chat/modules/chat-ui.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chat/modules/chat-streaming.js
 * SIZE: 22,896 bytes
 * ============================================================================ */

/**
 * @file chat-streaming.js - Chat Streaming Module
 * @description Handles real-time streaming responses from AI
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat Streaming Module
 * Manages Server-Sent Events (SSE) for real-time AI responses
 */
class ChatStreaming {
    constructor(options = {}) {
        // Configuration
        this.config = {
            streamingDelay: options.streamingDelay || 8, // ms between tokens
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 2000,
            enableTypingIndicator: options.enableTypingIndicator !== false,
            chunkSize: options.chunkSize || 1024
        };
        
        // State
        this.state = {
            isStreaming: false,
            currentStreamId: null,
            streamingMessage: null,
            retryCount: 0,
            abortController: null
        };
        
        // Event system
        this.eventListeners = new Map();
        
        // Performance tracking
        this.metrics = {
            tokensReceived: 0,
            streamingTime: 0,
            averageTokenRate: 0
        };
        
        console.log('🌊 ChatStreaming initialized');
    }
    
    /**
     * Start streaming response from API
     */
    async startStreaming(response, messageId) {
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }
        
        const startTime = performance.now();
        
        try {
            console.log('🌊 Starting stream for message:', messageId);
            
            this.state.isStreaming = true;
            this.state.currentStreamId = messageId;
            this.state.streamingMessage = {
                id: messageId,
                content: '',
                startTime: startTime
            };
            
            // Create abort controller for cancellation
            this.state.abortController = new AbortController();
            
            // Emit streaming started event
            this.emit('streaming-started', { messageId });
            
            // Handle different response types
            if (response.headers.get('content-type')?.includes('text/event-stream')) {
                await this.handleSSEStream(response);
            } else {
                await this.handleJSONStream(response);
            }
            
        } catch (error) {
            console.error('❌ Streaming error:', error);
            this.handleStreamingError(error);
        } finally {
            this.finalizeStreaming(startTime);
        }
    }
    
    /**
     * Start ticker summary streaming (for 0th message)
     * This directly calls the backend stream endpoint for automatic analysis
     */
    async startTickerSummaryStreaming(ticker, messageId) {
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }

        const startTime = performance.now();

        try {
            console.log(`🤖 Starting ticker summary stream for ${ticker}:`, messageId);
            
            this.state.isStreaming = true;
            this.state.currentStreamId = messageId;
            this.state.streamingMessage = {
                id: messageId,
                content: '',
                startTime: startTime,
                isSummary: true,
                ticker: ticker
            };
            
            // Create abort controller for cancellation
            this.state.abortController = new AbortController();
            
            // Emit streaming started event
            this.emit('streaming-started', { messageId, type: 'summary', ticker });
            
            // Get API instance – tolerate legacy global instance vs. class
            let api;
            if (typeof FinanceHubAPIService === 'function') {
                // Modern: FinanceHubAPIService is a constructor
                api = new FinanceHubAPIService();
            } else if (FinanceHubAPIService && typeof FinanceHubAPIService === 'object') {
                // Legacy: global already holds a singleton instance
                api = FinanceHubAPIService;
            } else if (window.FinanceHubAPIClass && typeof window.FinanceHubAPIClass === 'function') {
                api = new window.FinanceHubAPIClass();
            } else {
                throw new Error('FinanceHub API Service unavailable – cannot start ticker summary streaming');
            }
            
            // ---------------------------------------------
            // Primary path → AI summary SSE endpoint
            // ---------------------------------------------
            const summaryUrl = `${api.baseURL || 'http://localhost:8084'}/api/v1/stock/ai-summary/${ticker}?force_refresh=true`;

            console.log(`[ChatStreaming] SSE summary fetch → ${summaryUrl}`);

            const response = await fetch(summaryUrl, {
                method: 'GET',
                headers: {
                    Accept: 'text/event-stream'
                },
                signal: this.state.abortController.signal
            }).catch(err => {
                console.error('AI summary SSE fetch failed, falling back to chat stream:', err);
                return null;
            });

            if (response && response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
                // Stream via SSE handler
                await this.handleSSEStream(response);
            } else {
                // Fallback → non-stream JSON summary
                const jsonFallback = await (response ? response.json().catch(()=>null) : null);
                if (jsonFallback && jsonFallback.ai_summary) {
                    // Revert: push full summary in one update to avoid endless scroll jitter
                    await this.processStreamChunk({
                        content: jsonFallback.ai_summary,
                        delta: jsonFallback.ai_summary,
                        type: 'done'
                    });
                } else {
                    // Last resort → original chat stream call
                    console.warn('AI summary SSE unavailable, using chat stream fallback');
                    if (typeof api.streamChatResponse === 'function') {
            const streamGenerator = api.streamChatResponse(
                "Provide a comprehensive market analysis of this stock including current valuation, recent performance trends, key financial metrics, competitive position, and investment outlook.",
                ticker,
                { messageHistory: [] }
            );
            
            for await (const chunk of streamGenerator) {
                if (!this.state.isStreaming) break;
                if (chunk.type === 'token') {
                    await this.processStreamChunk({
                        content: chunk.content,
                        delta: chunk.content,
                        type: 'token'
                    });
                } else if (chunk.type === 'done') {
                                console.log('✅ Ticker summary chat stream completed');
                    break;
                }
                            if (this.state.abortController?.signal.aborted) break;
                        }
                    } else {
                        throw new Error('No streaming method available for AI summary');
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Ticker summary streaming error:', error);
            this.handleStreamingError(error);
        } finally {
            this.finalizeStreaming(startTime);
        }
    }
    
    /**
     * Handle Server-Sent Events stream
     */
    async handleSSEStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (this.state.isStreaming) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('✅ SSE stream completed');
                    break;
                }
                
                // Decode chunk
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    await this.processSSELine(line);
                }
                
                // Check for abort signal
                if (this.state.abortController?.signal.aborted) {
                    break;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
    
    /**
     * Process individual SSE line
     */
    async processSSELine(line) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith(':')) {
            return; // Skip empty lines and comments
        }
        
        if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
                console.log('✅ Stream completed with [DONE] signal');
                this.stopStreaming();
                return;
            }
            
            try {
                const parsed = JSON.parse(data);
                await this.processStreamChunk(parsed);
            } catch (error) {
                console.warn('⚠️ Failed to parse SSE data:', data, error);
            }
        }
    }
    
    /**
     * Handle JSON stream (fallback)
     */
    async handleJSONStream(response) {
        try {
            const data = await response.json();
            
            if (data.content) {
                // Simulate streaming for non-streaming responses
                await this.simulateStreaming(data.content);
            } else {
                throw new Error('No content in response');
            }
            
        } catch (error) {
            console.error('❌ JSON stream error:', error);
            throw error;
        }
    }
    
    /**
     * Simulate streaming for non-streaming responses
     */
    async simulateStreaming(content) {
        const words = content.split(' ');
        let currentContent = '';
        
        for (let i = 0; i < words.length; i++) {
            if (!this.state.isStreaming) break;
            
            currentContent += (i > 0 ? ' ' : '') + words[i];
            
            await this.processStreamChunk({
                content: currentContent,
                delta: words[i],
                isSimulated: true
            });
            
            // Add delay between words
            await this.delay(this.config.streamingDelay);
        }
    }
    
    /**
     * Process individual stream chunk
     */
    async processStreamChunk(chunk) {
        if (!this.state.streamingMessage) return;
        
        try {
            // Extract content from different chunk formats
            let content = '';
            let delta = '';
            
            if (chunk.type === 'token') {
                // FinanceHub SSE format → each chunk is a new delta slice
                delta = chunk.content || '';
                content = this.state.streamingMessage.content + delta;

            } else if (chunk.choices && chunk.choices[0]) {
                // OpenAI format (full cumulative)
                const choice = chunk.choices[0];
                if (choice.delta?.content) {
                    delta = choice.delta.content;
                    content = this.state.streamingMessage.content + delta;
                }

            } else if (chunk.content) {
                /*
                 * Generic fallback – treat incoming as either cumulative or delta.
                 * If it starts with the already stored content, strip the prefix;
                 * otherwise, assume it's an incremental piece.
                 */
                const incoming = chunk.content;
                const prev = this.state.streamingMessage.content;
                delta = incoming.startsWith(prev) ? incoming.slice(prev.length) : incoming;
                content = prev + delta;

            } else if (typeof chunk === 'string') {
                // Plain text fallback
                delta = chunk;
                content = this.state.streamingMessage.content + delta;
            }
            
            if (content) {
                // Update streaming message
                this.state.streamingMessage.content = content;
                this.metrics.tokensReceived += delta.length;
                
                // Emit content update event
                this.emit('content-update', {
                    messageId: this.state.currentStreamId,
                    content: content,
                    delta: delta,
                    isComplete: false
                });
                
                // Add visual delay for better UX
                if (!chunk.isSimulated) {
                    await this.delay(this.config.streamingDelay);
                }
            }
            
        } catch (error) {
            console.error('❌ Error processing stream chunk:', error);
        }
    }
    
    /**
     * Stop streaming
     */
    stopStreaming() {
        if (!this.state.isStreaming) return;
        
        console.log('🛑 Stopping stream');
        
        this.state.isStreaming = false;
        
        // Abort ongoing request
        if (this.state.abortController) {
            this.state.abortController.abort();
            this.state.abortController = null;
        }
        
        // Emit streaming stopped event
        this.emit('streaming-stopped', { 
            messageId: this.state.currentStreamId 
        });
    }
    
    /**
     * Finalize streaming process
     */
    finalizeStreaming(startTime) {
        const endTime = performance.now();
        const streamingTime = endTime - startTime;
        
        // Update metrics
        this.metrics.streamingTime = streamingTime;
        if (this.metrics.tokensReceived > 0) {
            this.metrics.averageTokenRate = this.metrics.tokensReceived / (streamingTime / 1000);
        }
        
        /*
         * The UI already received every token via appendToLastMessage().
         * If we now emit the full concatenated content, we would duplicate
         * all words (token-stream + final replacement). Therefore we skip
         * the final content-update and only emit the completion event.
         */
        
        // Emit streaming completed event
        this.emit('streaming-completed', {
            messageId: this.state.currentStreamId,
            content: this.state.streamingMessage?.content || '',
            metrics: {
                tokensReceived: this.metrics.tokensReceived,
                streamingTime: streamingTime,
                tokenRate: this.metrics.averageTokenRate
            }
        });
        
        // Reset state
        this.state.isStreaming = false;
        this.state.currentStreamId = null;
        this.state.streamingMessage = null;
        this.state.retryCount = 0;
        
        console.log('✅ Streaming finalized');
    }
    
    /**
     * Handle streaming errors
     */
    handleStreamingError(error) {
        console.error('❌ Streaming error:', error);
        
        // Emit error event
        this.emit('streaming-error', {
            messageId: this.state.currentStreamId,
            error: error.message,
            retryCount: this.state.retryCount
        });
        
        // Attempt retry if configured
        if (this.state.retryCount < this.config.retryAttempts) {
            this.state.retryCount++;
            console.log(`🔄 Retrying stream (attempt ${this.state.retryCount}/${this.config.retryAttempts})`);
            
            setTimeout(() => {
                this.emit('retry-requested', {
                    messageId: this.state.currentStreamId,
                    retryCount: this.state.retryCount
                });
            }, this.config.retryDelay);
        } else {
            console.error('❌ Max retry attempts reached');
            this.emit('streaming-failed', {
                messageId: this.state.currentStreamId,
                error: error.message
            });
        }
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Event system - emit event
     */
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Event listener error [${eventName}]:`, error);
            }
        });
    }
    
    /**
     * Event system - add listener
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }
    
    /**
     * Event system - remove listener
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Get current streaming state
     */
    getState() {
        return {
            isStreaming: this.state.isStreaming,
            currentStreamId: this.state.currentStreamId,
            retryCount: this.state.retryCount,
            metrics: { ...this.metrics }
        };
    }
    
    /**
     * Destroy streaming instance
     */
    destroy() {
        this.stopStreaming();
        this.eventListeners.clear();
        
        console.log('🗑️ ChatStreaming destroyed');
    }
    
    /**
     * Compatibility alias – FinanceHubChat expects an initialize() async method.
     * Currently ChatStreaming requires no asynchronous setup, so this simply resolves immediately.
     */
    async initialize() {
        // No-op initialization
        console.log('⚡ ChatStreaming.initialize() noop');
        return Promise.resolve();
    }
    
    /**
     * Modern streaming implementation – delegates to FinanceHubAPIService.streamChatResponse()
     * which returns an async generator yielding {type, content} objects.
     * Falls back to legacy POST /stream if the API class is unavailable.
     */
    async startStream({ endpoint, symbol, messageId, prompt }) {
        // Guard against parallel streams
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }

        const startTime = performance.now();

        // Mark streaming state
        this.state.isStreaming = true;
        this.state.currentStreamId = messageId;
        this.state.streamingMessage = {
            id: messageId,
            content: '',
            startTime
        };

        // Create abort controller for cancellation
        this.state.abortController = new AbortController();

        // Emit streaming started event
        this.emit('streaming-started', { messageId, type: 'chat', ticker: symbol });

        // Diagnostic: log endpoint & mode resolution
        console.log(`[ChatStreaming] startStream → ${endpoint}?symbol=${symbol}`);
        // Attempt modern API first
        try {
            let api;
            if (typeof FinanceHubAPIService === 'function') {
                api = new FinanceHubAPIService();
            } else if (FinanceHubAPIService && typeof FinanceHubAPIService === 'object') {
                api = FinanceHubAPIService; // singleton instance
            }

            if (api && typeof api.streamChatResponse === 'function') {
                // Use async generator streaming
                const stream = api.streamChatResponse(prompt, symbol, { messageId });
                for await (const chunk of stream) {
                    if (!this.state.isStreaming) break;

                    if (chunk.type === 'token') {
                        await this.processStreamChunk({
                            content: chunk.content,
                            delta: chunk.content,
                            type: 'token'
                        });
                    } else if (chunk.type === 'done') {
                        console.log('✅ Chat stream completed');
                        break;
                    }

                    // Abort check
                    if (this.state.abortController?.signal.aborted) {
                        break;
                    }
                }
                this.finalizeStreaming(startTime);
                return; // ✅ streaming handled
            }
        } catch (modernErr) {
            console.warn('Modern streamChatResponse failed, falling back to legacy POST /stream:', modernErr);
            // Continue to legacy fallback below
        }

        // Legacy fallback – POST to /stream endpoint (may be unsupported)
        console.log('%c[ChatStreaming] Falling back to legacy fetch URL', 'color:#f80');
        try {
            // Build correct legacy URL: <endpointRoot>/<symbol>/chat/stream
            // Where endpointRoot defaults to `${apiBaseUrl}/stock`.
            const response = await fetch(`${endpoint}/${symbol}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ message: prompt, chat_id: messageId })
            });
            await this.startStreaming(response, messageId);

            // finalize handled by startStreaming but ensure fallback
            if (this.state.isStreaming) {
                this.finalizeStreaming(startTime);
            }
        } catch (error) {
            console.error('❌ ChatStreaming.startStream legacy fallback error:', error);
            throw error;
        }
    }
}

// Make globally available
window.ChatStreaming = ChatStreaming;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatStreaming,
        default: ChatStreaming
    };
}

// ES6 Export
// REMOVED EXPORT: export { ChatStreaming };
// REMOVED EXPORT: export default ChatStreaming;

console.log('✅ ChatStreaming exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/chat/modules/chat-streaming.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chat/modules/chatScroll.logic.js
 * SIZE: 2,330 bytes
 * ============================================================================ */

/**
 * AEVOREX FINANCEHUB - Chat Scroll Logic
 * Handles smart fixed positioning for chat input panel
 * Max 60 lines - Rule #008 compliant
 */

class ChatScrollManager {
  constructor() {
    this.chatContainer = null;
    this.inputContainer = null;
    this.footer = null;
    this.chatObserver = null;
    this.footerObserver = null;
    this.isFixed = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupObservers());
    } else {
      this.setupObservers();
    }
  }

  setupObservers() {
    this.chatContainer = document.querySelector('.fh-chat');
    this.inputContainer = document.querySelector('.fh-chat__input-container');
    this.footer = document.querySelector('footer');

    if (!this.chatContainer || !this.inputContainer) return;

    // Observer for chat visibility (threshold = 1 means fully visible)
    this.chatObserver = new IntersectionObserver(
      (entries) => this.handleChatVisibility(entries),
      { threshold: 1.0, rootMargin: '0px' }
    );

    // Observer for footer detection
    if (this.footer) {
      this.footerObserver = new IntersectionObserver(
        (entries) => this.handleFooterVisibility(entries),
        { threshold: 0, rootMargin: '0px 0px -50px 0px' }
      );
      this.footerObserver.observe(this.footer);
    }

    this.chatObserver.observe(this.chatContainer);
  }

  handleChatVisibility(entries) {
    const entry = entries[0];
    
    if (entry.isIntersecting && entry.intersectionRatio === 1) {
      // Chat is fully visible - enable fixed positioning
      this.setFixed(true);
    } else if (entry.intersectionRatio < 1 && this.isFixed) {
      // Chat is partially visible and was fixed - keep fixed until footer
      // This maintains fixed state while scrolling within chat
    }
  }

  handleFooterVisibility(entries) {
    const entry = entries[0];
    
    if (entry.isIntersecting && this.isFixed) {
      // Footer is visible - disable fixed positioning
      this.setFixed(false);
    }
  }

  setFixed(fixed) {
    if (this.isFixed === fixed) return;
    
    this.isFixed = fixed;
    this.inputContainer.classList.toggle('is-fixed', fixed);
  }
}

// Initialize when module loads
new ChatScrollManager(); 

/* ============================================================================
 * END OF FILE: components/chat/modules/chatScroll.logic.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chat/chat.js
 * SIZE: 35,665 bytes
 * ============================================================================ */

/**
 * @file chat.js - Unified FinanceHub Chat Component
 * @description Premium chat interface integrating core functionality with modularity
 * @version 2.5.0 - Merged with modular architecture
 * @author AEVOREX FinanceHub Team
 */

// Import the modular components (these are loaded by the build process)
// - ChatCore from components/chat/modules/chat-core.js
// - ChatUI from components/chat/modules/chat-ui.js
// - ChatStreaming from components/chat/modules/chat-streaming.js

/**
 * Unified FinanceHub Chat Class
 * Combines the robust chat functionality with modular architecture
 */
class FinanceHubChat {
    constructor(options = {}) {
        console.log('🎯 Initializing Unified FinanceHub Chat...');

        // Merge default configuration
        this.config = {
            containerId: 'fh-chat',
            symbol: 'AAPL',
            apiBaseUrl: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1' : 'http://localhost:8084/api/v1',
            streamingEndpoint: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1/stock/chat' : 'http://localhost:8084/api/v1/stock/chat',
            autoSummary: true,
            fourBubbleMode: true,
            enableStreaming: true,
            enableHistory: true,
            enableAnimation: true,
            maxMessages: 100,
            animationDuration: 300,
            streamDelay: 50,
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };

        // Initialize state
        this.isInitialized = false;
        this.messages = [];
        this.bubbleData = new Map();
        this.isStreaming = false;
        this.currentStreamController = null;
        this.streamBuffer = '';
        this.retryCount = 0;

        // DOM elements
        this.container = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.sendButton = null;
        this.streamingIndicator = null;

        // Performance tracking
        this.performance = {
            messagesSent: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            errorsCount: 0
        };

        // Initialize modules - Use global classes if available
        this.modules = {
            core: typeof ChatCore !== 'undefined' ? new ChatCore(this) : null,
            ui: typeof ChatUI !== 'undefined' ? new ChatUI(this) : null,
            streaming: typeof ChatStreaming !== 'undefined' ? new ChatStreaming(this) : null
        };

        // Event handlers
        this.eventHandlers = new Map();

        // Auto-initialize if container exists
        if (!document.getElementById(this.config.containerId)) {
            // determine alternate id to search for
            const altId = this.config.containerId === 'fh-chat' ? 'chat-container' : 'fh-chat';
            const altEl = document.getElementById(altId);

            if (altEl) {
                console.warn(`⚠️ Chat container '${this.config.containerId}' not found, switching to '${altId}'.`);
                this.config.containerId = altId;

                // If legacy alias (#chat-container) missing, inject lightweight alias without touching original id
                if (altId === 'fh-chat' && !document.getElementById('chat-container')) {
                    const alias = document.createElement('div');
                    alias.id = 'chat-container';
                    alias.style.display = 'none';
                    altEl.parentNode.insertBefore(alias, altEl.nextSibling);
                }
                if (altId === 'chat-container' && !document.getElementById('fh-chat')) {
                    const alias = document.createElement('div');
                    alias.id = 'fh-chat';
                    alias.style.display = 'none';
                    altEl.parentNode.insertBefore(alias, altEl.nextSibling);
                }
            }
        }

        // Auto-initialize if the resolved container exists
        if (document.getElementById(this.config.containerId)) {
            this.init();
        }

        console.log('✅ Unified FinanceHub Chat initialized with config:', this.config);
    }

    /**
     * Initialize the chat component
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.warn('Chat already initialized');
                return;
            }

            console.log('🔄 Initializing chat component...');

            // Find and validate container
            this.container = document.getElementById(this.config.containerId);
            if (!this.container) {
                throw new Error(`Chat container not found: ${this.config.containerId}`);
            }

            // Initialize all modules
            await this.initializeModules();

            // Setup DOM structure
            this.setupDOM();

            // Bind event listeners
            this.bindEvents();

            // Initialize chat state
            this.initializeChatState();

            // Auto-load first AI summary if enabled
            if (this.config.autoSummary && this.config.fourBubbleMode) {
                setTimeout(() => {
                    if (!this.isStreaming) {
                        this.streamFourBubbleAnalysis();
                    } else {
                        console.log('ℹ️ Chat: streamFourBubbleAnalysis skipped – already streaming');
                    }
                }, 1000);
            }

            this.isInitialized = true;
            console.log('✅ Chat component initialized successfully');

            // Dispatch initialization event
            this.dispatchEvent('chatInitialized', { 
                config: this.config,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Chat initialization failed:', error);
            this.handleError(error, 'initialization');
            throw error;
        }
    }

    /**
     * Initialize all chat modules
     */
    async initializeModules() {
        try {
            console.log('🔄 Initializing chat modules...');

            // Initialize modules in order - check if they exist
            if (this.modules.core && typeof this.modules.core.initialize === 'function') {
                await this.modules.core.initialize();
            } else {
                console.warn('⚠️ ChatCore module not available');
            }

            if (this.modules.ui && typeof this.modules.ui.initialize === 'function') {
                await this.modules.ui.initialize();
            } else {
                console.warn('⚠️ ChatUI module not available');
            }

            if (this.modules.streaming && typeof this.modules.streaming.initialize === 'function') {
                await this.modules.streaming.initialize();
        } else {
                console.warn('⚠️ ChatStreaming module not available');
            }

            // Setup inter-module communication
            this.setupModuleCommunication();

            // Catch-up: if ChatUI loaded later in bundle order, attach it now
            if (!this.modules.ui && typeof ChatUI !== 'undefined') {
                console.warn('💡 ChatUI loaded late – attaching UI module dynamically');
                this.modules.ui = new ChatUI(this);
                if (typeof this.modules.ui.initialize === 'function') {
                    await this.modules.ui.initialize();
                }

                // Re-establish inter-module communication with the newly attached UI
                this.setupModuleCommunication();
            }

            console.log('✅ All available chat modules initialized');

        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup communication between modules
     */
    setupModuleCommunication() {
        // Core -> UI communication
        if (this.modules.core && this.modules.ui) {
            this.modules.core.on('messageAdded', (message) => {
                this.modules.ui.renderMessage(message);
            });

            this.modules.core.on('messageUpdated', (messageId, content) => {
                this.modules.ui.updateMessage(messageId, content);
            });
        }

        // Streaming -> UI communication
        if (this.modules.streaming && this.modules.ui) {
            const showIndicator = () => this.modules.ui.showStreamingIndicator();
            const hideIndicator = () => this.modules.ui.hideStreamingIndicator();

            // Primary event names (camelCase)
            this.modules.streaming.on('streamStarted', showIndicator);
            this.modules.streaming.on('streamEnded', hideIndicator);

            // Alias event names emitted by ChatStreaming (kebab-case)
            this.modules.streaming.on('streaming-started', showIndicator);
            this.modules.streaming.on('streaming-completed', (data) => {
                hideIndicator();
                // Ensure final, fully formatted content replaces streamed raw text
                if (data && this.modules.ui && typeof this.modules.ui.updateMessage === 'function') {
                    this.modules.ui.updateMessage(data.messageId, data.content);
                }
            });
            this.modules.streaming.on('streaming-stopped', hideIndicator);
            this.modules.streaming.on('streaming-error', hideIndicator);

            // Content updates
            this.modules.streaming.on('content-update', ({ messageId, content, delta }) => {
                if (delta) {
                    this.modules.ui.appendToLastMessage(delta);
                } else {
                    this.modules.ui.updateMessage(messageId, content);
                }
            });
        }

        // UI → FinanceHubChat (streaming) bridging
        // The ChatUI emits 'send-message' events when the user submits input.
        // We directly forward these messages to the unified handleSendMessage()
        // of this FinanceHubChat instance so that they take the streaming path
        // without involving ChatCore (which is reserved for the initial summary).
        if (this.modules.ui) {
            this.modules.ui.on('send-message', ({ message }) => {
                if (typeof message === 'string' && message.trim()) {
                    // Mirror content to the internal textarea reference so that
                    // downstream logic (e.g. clearing the field, auto-resize) works.
                    if (this.chatInput) {
                        this.chatInput.value = message.trim();
                    }
                    this.handleSendMessage();
                }
            });
        }
    }

    /**
     * Setup DOM structure
     */
    setupDOM() {
        try {
            const existingChatContainer = this.container.querySelector('.chat-container');
            if (existingChatContainer) {
                console.log('✅ Chat DOM structure already exists');
                this.findDOMElements();
                return;
            }

            console.log('🔄 Setting up chat DOM structure...');

            // If ChatUI is available OR wrapper already exists, skip DOM injection to prevent duplicates
            if (typeof ChatUI !== 'undefined' || this.container.querySelector('.fh-chat__input-wrapper')) {
                console.log('ℹ️ Skipping DOM construction – external ChatUI or existing wrapper detected');
                if (!this.container.classList.contains('fh-chat')) {
                    this.container.classList.add('fh-chat');
                }
                // Try to capture DOM nodes generated by ChatUI. If not ready, retry on next frame once
                try {
                    this.findDOMElements();
                } catch (domErr) {
                    console.warn('⚠️ Chat DOM nodes not yet ready – deferring lookup');
                    requestAnimationFrame(() => {
                        try {
                            this.findDOMElements();
                        } catch (retryErr) {
                            console.error('❌ Deferred lookup for chat DOM nodes failed', retryErr);
                        }
                    });
                }
                return;
            }

            // Ensure unified root CSS class is present (new prefix)
            if (!this.container.classList.contains('fh-chat')) {
                this.container.classList.add('fh-chat');
            }

            this.container.innerHTML = this.getChatHTML();

            // Find DOM elements
            this.findDOMElements();

            // Enhance existing bubbles
            this.enhanceExistingBubbles();

            console.log('✅ Chat DOM structure setup complete');

        } catch (error) {
            console.error('❌ DOM setup failed:', error);
            throw error;
        }
    }

    /**
     * Find and cache DOM elements
     */
    findDOMElements() {
        this.chatMessages = this.container.querySelector('.fh-chat__messages')
            || this.container.querySelector('#chat-messages');
        this.chatInput = this.container.querySelector('.fh-chat__input')
            || this.container.querySelector('#chat-input');
        this.sendButton = this.container.querySelector('.fh-chat__send-btn')
            || this.container.querySelector('#chat-send-btn');
        this.streamingIndicator = this.container.querySelector('.fh-chat__typing-indicator');

        // Validate essential elements
        if (!this.chatMessages || !this.chatInput || !this.sendButton) {
            throw new Error('Essential chat DOM elements not found');
        }
    }

    /**
     * Get chat HTML structure - Teljes képernyős chat felület
     */
    getChatHTML() {
        return `
            <!-- Üzenetek terület - felső 2/3 -->
            <div class="fh-chat__messages" id="chat-messages">
                <!-- Messages will be populated here -->
            </div>
            
            <!-- Streaming indikátor -->
            <div class="streaming-indicator fh-chat__typing-indicator" style="display: none;">
                <div class="streaming-dots fh-chat__typing-dots">
                    <span class="fh-chat__typing-dot"></span>
                    <span class="fh-chat__typing-dot"></span>
                    <span class="fh-chat__typing-dot"></span>
                </div>
            </div>
            
            <!-- Input panel - alsó 1/3 -->
            <div class="fh-chat__input-container">
                <div class="fh-chat__input-wrapper">
                    <textarea 
                        class="fh-chat__input" 
                        placeholder="Ask about ${this.config.symbol} analysis, financials, or market trends..." 
                        rows="1"
                    ></textarea>
                    <button class="fh-chat__send-btn" title="Send Message">
                        <!-- Premium arrow-up icon -->
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__send-icon">
                            <g>
                                <path d="M12 3.59l7.457 7.45-1.414 1.42L13 7.41V21h-2V7.41l-5.043 5.05-1.414-1.42L12 3.59z"></path>
                            </g>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        try {
            console.log('🔄 Binding chat event listeners...');

            // Guard: if essential nodes are still missing (e.g., ChatUI finished after this call), defer once
            if (!this.sendButton || !this.chatInput || !this.chatMessages) {
                console.warn('⚠️ Essential chat nodes missing – rebinding deferred by 1 frame');
                requestAnimationFrame(() => {
                    this.findDOMElements();
                    this.bindEvents();
                });
                return;
            }

            // Send button click
            this.sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });

            // Enter key press
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Clear chat button
            const clearBtn = this.container.querySelector('#clear-chat');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearChat();
                });
            }

            // Refresh chat button
            const refreshBtn = this.container.querySelector('#refresh-chat');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.streamFourBubbleAnalysis();
                });
            }

            // Suggestion chips
            const suggestionChips = this.container.querySelectorAll('.suggestion-chip');
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const suggestion = chip.dataset.suggestion;
                    this.chatInput.value = suggestion;
                    this.handleSendMessage();
                });
            });

            // 🔄 Listen for global symbol change events to keep chat context updated
            document.addEventListener('symbol-changed', (e) => {
                const { symbol } = e.detail || {};
                if (symbol && symbol !== this.config.symbol) {
                    console.log(`💬 Chat: Received symbol-changed → updating symbol to ${symbol}`);
                    this.updateSymbol(symbol);
                }
            });

            // Scroll to bottom on new messages
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }
            
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        this.scrollToBottom();
                    }
                });
            });
            
            this.mutationObserver.observe(this.chatMessages, {
                childList: true,
                subtree: true
            });

            console.log('✅ Chat event listeners bound successfully');
            
        } catch (error) {
            console.error('❌ Event binding failed:', error);
            throw error;
        }
    }

    /**
     * Initialize chat state
     */
    initializeChatState() {
        // Clear existing messages
        this.messages = [];
        this.bubbleData.clear();

        // Reset streaming state
        this.isStreaming = false;
        this.streamBuffer = '';

        // Update UI
        this.updateChatSubtitle();
    }

    /**
     * Handle send message
     */
    async handleSendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message || this.isStreaming) {
            return;
        }

        // Reset input immediately for better UX
            this.chatInput.value = '';

        try {
            // ---------------------------------------
            // 1. Add user message to the chat UI
            // ---------------------------------------
            this.addUserMessage(message);

            // ---------------------------------------
            // 2. Create placeholder AI message that will
            //    be progressively filled while streaming
            // ---------------------------------------
            const placeholderMsg = this.addAIMessage('', {
                isStreaming: true,
                isSummary: false
            });

            // ---------------------------------------
            // 3. Prefer real-time streaming via ChatStreaming
            // ---------------------------------------
            if (this.modules.streaming && typeof this.modules.streaming.startStream === 'function') {
                // Build endpoint root – already normalised in the constructor
                const endpointRoot = this.config.streamingEndpoint || `${this.config.apiBaseUrl}/stock/chat`;

                // Mark component state (prevents parallel invokes)
                this.isStreaming = true;
                try {
                    await this.modules.streaming.startStream({
                        endpoint: endpointRoot,
                        symbol: this.config.symbol,
                        messageId: placeholderMsg.id,
                        prompt: message
                    });
                } finally {
                    this.isStreaming = false;
                }
                return; // Streaming path handled – exit early
            }

            // ---------------------------------------
            // 4. Fallback – no streaming available
            // ---------------------------------------
            let apiSvc = window.FinanceHubAPIService;
            if (!apiSvc) {
                // Lazily create if constructor exposed
                if (typeof window.FinanceHubAPIService === 'function') {
                    apiSvc = new window.FinanceHubAPIService();
                    window.FinanceHubAPIService = apiSvc;
                }
            }

            if (!apiSvc || typeof apiSvc.sendChatMessage !== 'function') {
                throw new Error('FinanceHubAPIService.sendChatMessage unavailable');
            }

            const responseData = await apiSvc.sendChatMessage(this.config.symbol, message, false, {});
            let aiContent = responseData;
            if (typeof responseData === 'object') {
                aiContent = responseData.response || responseData.ai_summary || JSON.stringify(responseData);
            }
            this.modules.ui.updateMessage(placeholderMsg.id, aiContent);
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Failed to send message or process response:', error);
            this.handleError(error, 'send_message');
            // Show error in placeholder
            this.modules.ui.updateMessage(placeholderMsg?.id || this.generateMessageId(), '⚠️ Error processing request. Please try again later.');
        }
    }

    /**
     * Add user message to chat
     */
    addUserMessage(content) {
        const message = {
            id: this.generateMessageId(),
            type: 'user',
            content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.modules.ui.renderMessage(message);
        this.scrollToBottom();

        return message;
    }

    /**
     * Add AI message to chat
     */
    addAIMessage(content = '', options = {}) {
        const message = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString(),
            isStreaming: options.isStreaming || false,
            isSummary: options.isSummary || false
        };

        this.messages.push(message);
        this.modules.ui.renderMessage(message);
        this.scrollToBottom();

        return message;
    }

    /**
     * Stream four bubble analysis
     */
    async streamFourBubbleAnalysis() {
        try {
            if (this.isStreaming) {
                console.warn('Already streaming, skipping request');
                return;
            }

            console.log('🎯 Starting four bubble analysis stream...');

            // Prefer real-time streaming via ChatStreaming if the module is available
            if (this.modules.streaming && typeof this.modules.streaming.startTickerSummaryStreaming === 'function') {
                // Add placeholder AI message that will be progressively filled
                const placeholderMsg = this.addAIMessage('', { isStreaming: true, isSummary: true });

                // Mark component as streaming (avoids duplicate calls)
                this.isStreaming = true;
                try {
                    await this.modules.streaming.startTickerSummaryStreaming(this.config.symbol, placeholderMsg.id);
                } finally {
                    this.isStreaming = false;
                }
                return; // Streaming path handled, exit early
            }

            // -----------------------------------------------------------------
            // Legacy (non-streaming) fallback – retain previous implementation
            // -----------------------------------------------------------------
            let apiSvc = null;
            if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService.getStockAISummary === 'function') {
                apiSvc = window.FinanceHubAPIService;
            } else if (typeof window.FinanceHubAPIService === 'function') {
                try {
                    apiSvc = new window.FinanceHubAPIService();
                    window.FinanceHubAPIService = apiSvc;
                } catch (err) {
                    console.warn('FinanceHubAPIService instantiation failed:', err);
                }
            } else if (window.API && typeof window.API.getStockAISummary === 'function') {
                apiSvc = window.API;
            }

            if (!apiSvc) {
                console.error('FinanceHubAPIService.getStockAISummary not available');
                throw new Error('AI summary endpoint unavailable');
            }

            const loadingMsg = this.addAIMessage('⏳ Generating AI summary…', { isStreaming: false });

            const summary = await apiSvc.getStockAISummary(this.config.symbol).catch(err => {
                console.error('AI summary fetch failed:', err);
                throw err;
            });

            let text = summary;
            if (typeof summary === 'object') {
                if (summary.ai_summary) {
                    text = summary.ai_summary;
                } else {
                    text = summary.summary || summary.content || JSON.stringify(summary);
                }
            }
            this.modules.ui.updateMessage(loadingMsg.id, text);
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Four bubble analysis failed:', error);
            this.handleError(error, 'four_bubble_analysis');
            this.addAIMessage('Sorry, I encountered an error while analyzing the stock. Please try again.');
        }
    }

    /**
     * Update stock symbol and refresh data
     */
    updateSymbol(newSymbol) {
        if (!newSymbol || newSymbol === this.config.symbol) return;

        console.log(`🔄 Updating chat symbol: ${this.config.symbol} → ${newSymbol}`);

        this.config.symbol = newSymbol;
        this.updateChatSubtitle();

        // Trigger new analysis
        if (this.config.autoSummary && this.isInitialized) {
            setTimeout(() => {
                this.streamFourBubbleAnalysis();
            }, 500);
        }

        // Dispatch symbol change event
        this.dispatchEvent('symbolChanged', {
            oldSymbol: this.config.symbol,
            newSymbol,
            timestamp: Date.now()
        });
    }

    /**
     * Update stock data
     */
    updateStockData(symbol, stockData) {
        if (symbol === this.config.symbol) {
            this.updateSymbol(symbol);
        }
    }

    /**
     * Update chat subtitle
     */
    updateChatSubtitle() {
        const subtitle = this.container.querySelector('.chat-subtitle');
        if (subtitle) {
            subtitle.textContent = `Real-time insights for ${this.config.symbol}`;
        }
    }

    /**
     * Clear chat history
     */
    clearChat() {
        try {
            this.messages = [];
            this.chatMessages.innerHTML = '';
            
            // Add welcome message
            this.addAIMessage(`Hello! I'm here to help you analyze ${this.config.symbol}. What would you like to know?`);

            console.log('✅ Chat cleared');

            // Dispatch clear event
            this.dispatchEvent('chatCleared', { timestamp: Date.now() });

        } catch (error) {
            console.error('❌ Failed to clear chat:', error);
            this.handleError(error, 'clear_chat');
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    /**
     * Enhance existing analysis bubbles
     */
    enhanceExistingBubbles() {
        try {
            const bubbles = document.querySelectorAll('.analysis-bubble');
            
            bubbles.forEach((bubble, index) => {
                // Add click handler for detailed analysis
                bubble.addEventListener('click', () => {
                    this.requestBubbleDetails(index);
                });

                // Add hover effects
                bubble.addEventListener('mouseenter', () => {
                    this.highlightBubble(bubble);
                });

                bubble.addEventListener('mouseleave', () => {
                    this.unhighlightBubble(bubble);
                });
            });

            console.log(`✅ Enhanced ${bubbles.length} analysis bubbles`);

        } catch (error) {
            console.error('❌ Bubble enhancement failed:', error);
        }
    }

    /**
     * Request detailed analysis for a bubble
     */
    async requestBubbleDetails(bubbleIndex) {
        try {
            const bubbleTypes = [
                'Company Overview',
                'Financial Metrics',
                'Technical Analysis',
                'News Highlights'
            ];

            const bubbleType = bubbleTypes[bubbleIndex] || 'Analysis';
            
            this.addUserMessage(`Tell me more about the ${bubbleType} for ${this.config.symbol}`);
            
            const aiMessage = this.addAIMessage('', { isStreaming: true });

            await this.modules.streaming.startStream({
                endpoint: this.config.streamingEndpoint,
                symbol: this.config.symbol,
                messageId: aiMessage.id,
                prompt: `Provide detailed ${bubbleType.toLowerCase()} for ${this.config.symbol}. Be comprehensive and include specific data points.`
            });

        } catch (error) {
            console.error('❌ Bubble details request failed:', error);
            this.handleError(error, 'bubble_details');
        }
    }

    /**
     * Highlight bubble on hover
     */
    highlightBubble(bubble) {
        bubble.style.transform = 'translateY(-2px)';
        bubble.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    }

    /**
     * Remove bubble highlight
     */
    unhighlightBubble(bubble) {
        bubble.style.transform = '';
        bubble.style.boxShadow = '';
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle errors
     */
    handleError(error, context, metadata = {}) {
        // Prevent duplicate error messages of same context within short period
        if (!this._errorTimestamps) this._errorTimestamps = {};
        const now = Date.now();
        const last = this._errorTimestamps[context] || 0;
        if (now - last < 5000) {
            console.warn(`Duplicate error suppressed [${context}]`, error);
            return;
        }
        this._errorTimestamps[context] = now;

        console.error(`FinanceHubChat Error [${context}]:`, error, metadata);
        // Show only one AI error message to the user
        this.addAIMessage('Sorry, I encountered an error while analyzing the stock. Please try again.');
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(`financehub:chat:${eventName}`, {
                detail,
                bubbles: true
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Failed to dispatch event:', error);
        }
    }

    /**
     * Add event listener
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit internal event
     */
    emit(eventName, ...args) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`❌ Event handler error (${eventName}):`, error);
                }
            });
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performance,
            messagesTotal: this.messages.length,
            isStreaming: this.isStreaming,
            uptime: Date.now() - this.initTime
        };
    }

    /**
     * Destroy chat instance
     */
    destroy() {
        try {
            // Stop any active streaming
            if (this.currentStreamController) {
                this.currentStreamController.abort();
            }

            // Disconnect MutationObserver
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
                this.mutationObserver = null;
            }

            // Clear event handlers
            this.eventHandlers.clear();

            // Destroy modules
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });

            // Clear DOM
            if (this.container) {
                this.container.innerHTML = '';
            }

            this.isInitialized = false;
            console.log('✅ Chat instance destroyed');

        } catch (error) {
            console.error('❌ Chat destruction failed:', error);
        }
    }

    /**
     * Public helper used by FinanceHubApp to request an automatic summary
     * for the given symbol. Keeps backward-compat with earlier API.
     * @param {string} symbol – Ticker symbol to analyze (optional)
     */
    async triggerAutoSummary(symbol = null) {
        if (symbol) {
            this.updateSymbol(symbol);
        }
        return this.streamFourBubbleAnalysis();
    }
}

// DUPLIKÁLT OSZTÁLYOK KIKOMMENTÁLVA - HASZNÁLD A KÜLÖN MODULOKAT:
// - components/chat/modules/chat-core.js
// - components/chat/modules/chat-ui.js  
// - components/chat/modules/chat-streaming.js

// Export for global access
if (typeof window !== 'undefined') {
    window.FinanceHubChat = window.FinanceHubChat || FinanceHubChat;
}

// Export for ES6 module imports
// REMOVED EXPORT: export { FinanceHubChat };
// REMOVED EXPORT: export default FinanceHubChat;

console.log('✅ Unified FinanceHub Chat loaded successfully'); 

/* ============================================================================
 * END OF FILE: components/chat/chat.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/chart/chart.js
 * SIZE: 38,147 bytes
 * ============================================================================ */

/**
 * @file chart-unified.js - Unified Chart Component for FinanceHub
 * @description Advanced chart system combining the best features from:
 *              - chart-manager.js (Chart management and controls)
 *              - tradingview-chart.js (TradingView integration)
 * @version 3.0.0 - Unified Architecture
 * @author AEVOREX
 */

/**
 * FinanceHub Unified Chart Manager v4.0.0
 * ENTERPRISE-GRADE TradingView Integration
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 4.0.0
 * @date 2025-06-02
 */

class UnifiedChartManager {
    constructor(options = {}) {
        // Merge options with defaults
        this.config = {
            containerId: options.containerId || 'tradingview-chart',
            symbol: options.symbol || 'NASDAQ:AAPL',
            interval: options.interval || '15',
            theme: options.theme || 'dark',
            debug: options.debug !== undefined ? options.debug : true,
            // ===== Sidebar removal =====
            // Disable external Technical Analysis iframe panel & any TradingView sidebars by default
            disableTAPanel: options.disableTAPanel !== undefined ? options.disableTAPanel : true,
            // Remove sidebar-related options as they're not supported in full-width mode
            useCustomDatafeed: options.useCustomDatafeed !== undefined ? options.useCustomDatafeed : true,
            ...options
        };

        this.widget = null;
        this.isReady = false;
        
        // Initialize state
        this.state = {
            widget: null,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            isReady: false
        };
        
        // Initialize metrics
        this.metrics = {
            initTime: 0,
            loadTime: 0,
            errorCount: 0,
            errors: 0
        };
        
        // Initialize event handlers
        this.eventHandlers = new Map();
        
        console.log('🔧 UnifiedChartManager v4.1.0 initialized with config:', this.config);
    }

    /**
     * Initialize the chart manager
     */
    async init() {
        try {
            console.log('UnifiedChartManager: Initializing...');
            const startTime = performance.now();

            // Validate container
            if (!this.validateContainer()) {
                throw new Error(`Chart container '${this.config.containerId}' not found`);
            }

            // Load TradingView library
            await this.loadTradingViewLibrary();

            // Create datafeed
            this.createDatafeed();

            // Initialize TradingView widget
            await this.initializeTradingViewWidget();

            // Setup event listeners
            this.setupEventListeners();

            this.metrics.initTime = performance.now() - startTime;
            this.state.isInitialized = true;

            console.log(`UnifiedChartManager: Initialized successfully in ${this.metrics.initTime.toFixed(2)}ms`);
            this.dispatchEvent('chart-initialized', { initTime: this.metrics.initTime });

            // Ensure any legacy static TA panel element is hidden for full-width layout
            const legacyTAPanel = document.getElementById('tv-ta-panel');
            if (legacyTAPanel) {
                legacyTAPanel.style.display = 'none';
            }
            // Hide placeholder / loading overlays
            const ph = document.getElementById('chart-placeholder');
            if (ph) ph.style.display = 'none';
            const loader = document.getElementById('chart-loading');
            if (loader) loader.style.display = 'none';

        } catch (error) {
            console.error('UnifiedChartManager: Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Validate chart container exists
     * @returns {boolean} Container is valid
     */
    validateContainer() {
        const container = document.getElementById(this.config.containerId);
        if (!container) {
            console.error(`UnifiedChartManager: Container '${this.config.containerId}' not found`);
            return false;
        }
        return true;
    }

    /**
     * Load TradingView library dynamically
     * @returns {Promise} Library load promise
     */
    async loadTradingViewLibrary() {
        return new Promise((resolve, reject) => {
            // Check if TradingView is already loaded
            if (window.TradingView && window.TradingView.widget) {
                console.log('UnifiedChartManager: TradingView library already loaded');
                resolve();
                return;
            }

            // TradingView library should be loaded via HTML script tag
            // Wait a bit for library to initialize if not immediately available
            console.log('UnifiedChartManager: Waiting for TradingView library to initialize...');
            
            let attempts = 0;
            const maxAttempts = 20; // 2 seconds total
            
            const checkLibrary = () => {
                attempts++;
                if (window.TradingView && window.TradingView.widget) {
                    console.log('UnifiedChartManager: TradingView library is ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('UnifiedChartManager: TradingView library not available after 2s');
                    reject(new Error('TradingView library not available - check if tv.js script is loaded'));
                } else {
                    setTimeout(checkLibrary, 100);
                }
            };
            
            checkLibrary();
        });
    }

    /**
     * Create datafeed for TradingView
     */
    createDatafeed() {
        console.log('🔧 Creating simplified datafeed');
        
        return {
            onReady: (callback) => {
                console.log('🔧 Datafeed onReady called');
                setTimeout(() => {
                    callback({
                        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                        supports_marks: false,
                        supports_timescale_marks: false,
                        supports_time: true
                    });
                }, 0);
            },
            
            searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
                console.log('🔧 Datafeed searchSymbols called:', userInput);
                onResultReadyCallback([]);
            },
            
            resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
                console.log('🔧 Datafeed resolveSymbol called:', symbolName);
                
                const symbolInfo = {
                    name: symbolName,
                    ticker: symbolName,
                    description: symbolName,
                    type: 'stock',
                    session: '0930-1600',
                    timezone: 'America/New_York',
                    exchange: 'NASDAQ',
                    minmov: 1,
                    pricescale: 100,
                    has_intraday: true,
                    has_no_volume: false,
                    has_weekly_and_monthly: true,
                    supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                    volume_precision: 0,
                    data_status: 'streaming'
                };
                
                setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
            },
            
            getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
                console.log('🔧 Datafeed getBars called:', symbolInfo.name, resolution);
                
                // Return empty data to prevent errors
                onHistoryCallback([], { noData: true });
            },
            
            subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
                console.log('🔧 Datafeed subscribeBars called:', symbolInfo.name);
                // No real-time data
            },
            
            unsubscribeBars: (subscriberUID) => {
                console.log('🔧 Datafeed unsubscribeBars called:', subscriberUID);
                // No cleanup needed
            }
        };
    }

    /**
     * Initialize TradingView widget
     */
    async initializeTradingViewWidget() {
        try {
            console.log('UnifiedChartManager: Creating TradingView widget...');
            
            // CRITICAL CHECK: Ensure TradingView library is available
            if (!window.TradingView || !window.TradingView.widget) {
                throw new Error('TradingView library not available - cannot create widget');
            }
            
            // Validate container exists
            const container = document.getElementById(this.config.containerId);
            if (!container) {
                throw new Error(`Chart container '${this.config.containerId}' not found in DOM`);
            }
            
            console.log(`UnifiedChartManager: Creating widget in container '${this.config.containerId}'`);
            
            // Create widget config
            this.widgetConfig = this.createWidgetConfig();
            
            // Create TradingView widget with validated config
            this.state.widget = new window.TradingView.widget(this.widgetConfig);
            
            if (!this.state.widget) {
                throw new Error('TradingView widget creation returned null/undefined');
            }
            
            console.log('✅ UnifiedChartManager: TradingView widget created successfully');
            
            // Setup widget event handlers – robust for API differences
            const attachReadyHandler = () => {
                if (typeof this.state.widget.onChartReady === 'function') {
                    this.state.widget.onChartReady(() => {
                        console.log('✅ UnifiedChartManager: Chart is ready');
                        this.dispatchEvent('chart-ready');
                    });
                } else {
                    console.debug('ℹ️ UnifiedChartManager: widget.onChartReady not available – polling chart readiness');
                    const pollReady = () => {
                        try {
                            const chartObj = (typeof this.state.widget.chart === 'function') ? this.state.widget.chart() : null;
                            if (chartObj && typeof chartObj.onReady === 'function') {
                                chartObj.onReady(() => {
                                    console.log('✅ UnifiedChartManager: Chart is ready (fallback)');
                                    this.dispatchEvent('chart-ready');
                                });
                                return;
                            }
                        } catch(e) {/* ignore */}
                        setTimeout(pollReady, 400);
                    };
                    pollReady();
                }
            };
            attachReadyHandler();
            
            // Helper: once chart is ready, hide the side toolbar via CSS for all widget instances
            const hideSideToolbarViaCSS = () => {
                const styleId = 'tv-hide-side-toolbar-style';
                if (!document.getElementById(styleId)) {
                    const styleTag = document.createElement('style');
                    styleTag.id = styleId;
                    styleTag.textContent = `.tv-side-toolbar, .tv-chart-controls-bar { display: none !important; }`;
                    document.head.appendChild(styleTag);
                }
            };
            hideSideToolbarViaCSS();
            
        } catch (error) {
            console.error('❌ UnifiedChartManager: Widget initialization failed:', error);
            this.handleError(error, 'widget_initialization');
            // DON'T fall back silently - throw the error so ComponentLoader can handle it
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', this.handleResize.bind(this));

        // Theme change handler
        document.addEventListener('theme-changed', this.handleThemeChange.bind(this));

        // Listen to global stock symbol changes (e.g., header search, ticker tape)
        document.addEventListener('stockSymbolChange', (e) => {
            const { symbol } = e.detail || {};
            if (symbol) {
                this.changeSymbol(symbol);
            }
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.state.widget && this.state.widget.resize) {
            this.state.widget.resize();
        }
    }

    /**
     * Handle theme change
     * @param {Event} event - Theme change event
     */
    handleThemeChange(event) {
        if (event.detail && event.detail.theme) {
            console.log(`UnifiedChartManager: Theme changing to ${event.detail.theme}`);
            this.config.theme = event.detail.theme;
            
            // Update widget config colors
            this.updateWidgetConfigForTheme();
            
            // Recreate widget with new theme
            this.recreateWidget();
        }
    }

    /**
     * Update widget configuration for current theme
     */
    updateWidgetConfigForTheme() {
        const isDark = this.config.theme === 'dark';
        
        // Update basic theme settings
        this.widgetConfig.theme = this.config.theme;
        this.widgetConfig.toolbar_bg = isDark ? "#1e1e1e" : "#ffffff";
        
        // Update overrides for theme
        this.widgetConfig.overrides = {
            "paneProperties.background": isDark ? "#1e1e1e" : "#ffffff",
            "paneProperties.backgroundType": "solid",
            "paneProperties.gridProperties.color": isDark ? "#2a2a2a" : "#f0f0f0",
            "paneProperties.gridProperties.style": 0,
            "paneProperties.vertGridProperties.color": isDark ? "#2a2a2a" : "#f0f0f0",
            "paneProperties.vertGridProperties.style": 0,
            "paneProperties.horzGridProperties.color": isDark ? "#2a2a2a" : "#f0f0f0",
            "paneProperties.horzGridProperties.style": 0,
            
            // Candlestick colors
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.drawWick": true,
            "mainSeriesProperties.candleStyle.drawBorder": true,
            "mainSeriesProperties.candleStyle.borderColor": "#378658",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            
            // Volume colors
            "mainSeriesProperties.volumePaneSize": "medium",
            "mainSeriesProperties.priceAxisProperties.autoScale": true,
            "mainSeriesProperties.priceAxisProperties.autoScaleDisabled": false,
            "mainSeriesProperties.priceAxisProperties.percentage": false,
            "mainSeriesProperties.priceAxisProperties.percentageDisabled": false,
            "mainSeriesProperties.priceAxisProperties.log": false,
            "mainSeriesProperties.priceAxisProperties.logDisabled": false,
            
            // Scale and axis
            "scalesProperties.backgroundColor": isDark ? "#1e1e1e" : "#ffffff",
            "scalesProperties.lineColor": isDark ? "#454545" : "#cccccc",
            "scalesProperties.textColor": isDark ? "#cccccc" : "#333333",
            "scalesProperties.fontSize": 12,
            
            // Crosshair
            "paneProperties.crossHairProperties.color": isDark ? "#9598a1" : "#758696",
            "paneProperties.crossHairProperties.width": 1,
            "paneProperties.crossHairProperties.style": 2,
            
            // Legend
            "paneProperties.legendProperties.showLegend": true,
            "paneProperties.legendProperties.showStudyArguments": true,
            "paneProperties.legendProperties.showStudyTitles": true,
            "paneProperties.legendProperties.showStudyValues": true,
            "paneProperties.legendProperties.showSeriesTitle": true,
            "paneProperties.legendProperties.showSeriesOHLC": true
        };
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        // 👉 Always prefix with NASDAQ: if missing to avoid TradingView 'cannot_get_metainfo'
        const tvSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;

        console.log(`UnifiedChartManager: Changing symbol from ${this.state.currentSymbol} to ${tvSymbol}`);
        
        try {
            this.state.currentSymbol = tvSymbol;
            
            if (this.state.widget && this.state.widget.setSymbol) {
                this.state.widget.setSymbol(tvSymbol, () => {
                    console.log(`UnifiedChartManager: Symbol changed to ${tvSymbol}`);
                    this.dispatchEvent('symbol-changed', { symbol: tvSymbol });
                });
            }
            
            // ==== TA-PANEL-FIX START (2025-06-13) ====
            // Update TA panel for new symbol
            this.updateTAPanel(tvSymbol);
            // ==== TA-PANEL-FIX END ====
        } catch (error) {
            console.error('UnifiedChartManager: Symbol change failed:', error);
            this.handleError(error, 'symbol-change');
        }
    }

    /**
     * Recreate widget (for theme changes, etc.)
     */
    async recreateWidget() {
        try {
            console.log('UnifiedChartManager: Recreating widget...');
            
            // Remove existing widget
            if (this.state.widget && this.state.widget.remove) {
                this.state.widget.remove();
            }

            // Clear container
            const container = document.getElementById(this.config.containerId);
            if (container) {
                container.innerHTML = '';
            }

            // Reinitialize
            await this.initializeTradingViewWidget();

        } catch (error) {
            console.error('UnifiedChartManager: Widget recreation failed:', error);
            this.handleError(error, 'widget-recreation');
        }
    }

    /**
     * Handle errors
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        this.state.error = { error, context, timestamp: Date.now() };
        this.metrics.errors++;
        
        console.error(`UnifiedChartManager: Error in ${context}:`, error);
        
        // Show error in UI
        this.showErrorMessage(`Chart error: ${error.message}`);
        
        // Dispatch error event
        this.dispatchEvent('chart-error', { error: error.message, context });
        
        // 🚨 CRITICAL FIX: Dispatch global error for debugging
        window.dispatchEvent(new CustomEvent('financehub-error', {
            detail: { component: 'chart', error: error.message, context }
        }));
        
        // Re-throw error for proper debugging (don't swallow)
        throw error;
    }

    /**
     * Show error message in chart container
     * @param {string} message - Error message
     */
    showErrorMessage(message) {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-error">
                <div class="error-icon">📈</div>
                <div class="error-message">${message}</div>
                <button class="retry-button" onclick="window.chartManager?.init()">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
        
        // Call registered handlers
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).forEach(handler => {
                try {
                    handler(detail);
                } catch (error) {
                    console.error(`UnifiedChartManager: Event handler error for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Register event handler
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * Get current metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Clear real-time updates
     */
    clearRealtimeUpdates() {
        // Clear any intervals or timeouts
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Destroy chart manager
     */
    destroy() {
        console.log('UnifiedChartManager: Destroying...');
        
        // Clear real-time updates
        this.clearRealtimeUpdates();
        
        // Remove widget
        if (this.state.widget && this.state.widget.remove) {
            this.state.widget.remove();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize.bind(this));
        document.removeEventListener('theme-changed', this.handleThemeChange.bind(this));
        
        // Clear state
        this.state = {
            isInitialized: false,
            isLoading: false,
            currentSymbol: null,
            widget: null,
            datafeed: null,
            error: null,
        };
        
        console.log('UnifiedChartManager: Destroyed');
    }

    /**
     * Simplified config for Advanced Charts only
     */
    createWidgetConfig() {
        // Simplified config for Advanced Charts only
        const config = {
            container_id: this.config.containerId,
            width: '100%',
            height: '600',
            symbol: this.config.symbol.includes(':') ? this.config.symbol : `NASDAQ:${this.config.symbol}`,
            interval: '15', // Fixed 15 minute interval
            timezone: 'Etc/UTC',
            theme: this.config.theme === 'dark' ? 'dark' : 'light',
            style: 1,
            locale: 'en',
            toolbar_bg: this.config.theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
            enable_publishing: false,
            allow_symbol_change: true,
            // Keep default toolbar behaviour (some library builds fail if this flag is true)
            // We'll suppress the DOM node via CSS once the widget is ready
            hide_side_toolbar: false,
            hide_legend: false,
            hide_top_toolbar: false,
            hide_volume: false,
            studies: ['MACD@tv-basicstudies', 'RSI@tv-basicstudies'],
            disabled_features: [
                'study_templates',
                'use_localstorage_for_settings',
                'save_chart_properties_to_local_storage'
            ],
            // No extra features required – keep the widget minimal
            enabled_features: [],
            overrides: {
                'paneProperties.background': this.config.theme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                'paneProperties.vertGridProperties.color': this.config.theme === 'dark' ? '#2A2A2A' : '#E1E1E1',
                'paneProperties.horzGridProperties.color': this.config.theme === 'dark' ? '#2A2A2A' : '#E1E1E1'
            },
            autosize: true,
            debug: this.config.debug
        };

        // Add custom datafeed if enabled
        if (this.config.useCustomDatafeed) {
            config.datafeed = this.createDatafeed();
        }

        console.log('🔧 Widget config created:', config);
        return config;
    }

    /**
     * Initialise TradingView Technical Analysis side panel (external widget)
     * @param {string} symbol
     */
    initTAPanel(symbol = 'AAPL') {
        if (this.config.disableTAPanel) {
            console.log('UnifiedChartManager: TA panel integration disabled – skipping init');
            return;
        }

        console.log('TA-FIX: Initializing Technical Analysis panel for', symbol);
        
        // Find chart container and create TA panel container if needed
        const chartContainer = document.getElementById(this.config.containerId);
        if (!chartContainer) {
            console.warn('TA-FIX: Chart container not found, cannot create TA panel');
            return;
        }

        // Check if TA panel container already exists
        let taContainer = document.getElementById('fh-ta-panel');
        if (!taContainer) {
            // Create TA panel container dynamically
            taContainer = document.createElement('div');
            taContainer.id = 'fh-ta-panel';
            taContainer.className = 'fh-chart__ta-panel';
            
            // Insert TA panel after the chart container
            const chartParent = chartContainer.parentElement;
            if (chartParent) {
                // Ensure chartParent has flex layout via CSS class
                chartParent.classList.add('fh-chart__wrapper');
                const outerWrapper = chartParent.parentElement;
                if (outerWrapper && !outerWrapper.classList.contains('fh-chart__wrapper')) {
                    outerWrapper.classList.add('fh-chart__wrapper');
                }

                // 🔧 Ensure flex actually applied even if other styles override it
                const computed = window.getComputedStyle(chartParent);
                if (computed.display !== 'flex') {
                    chartParent.style.display = 'flex';
                    chartParent.style.flexDirection = 'row';
                    chartParent.style.alignItems = 'stretch';
                }

                // Remove hard-coded width on chart container that could push TA panel off-screen
                chartContainer.style.width = 'auto';

                // Dynamically inject minimal CSS if not yet present
                if (!document.getElementById('fh-ta-panel-style')) {
                    const styleEl = document.createElement('style');
                    styleEl.id = 'fh-ta-panel-style';
                    styleEl.innerHTML = `
                        .fh-chart__wrapper{display:flex;flex-direction:row;align-items:stretch;width:100%;height:100%;}
                        .fh-chart__ta-panel{width:280px;min-width:240px;max-width:320px;height:100%;overflow-y:auto;background:var(--background-primary,#ffffff);border-left:1px solid var(--border-subtle,#e1e1e1);z-index:10;display:flex;flex-direction:column;gap:8px;padding:4px 0;}
                        .fh-chart__ta-panel section{width:100%;}
                        @media (max-width: 1023px) { .fh-chart__ta-panel { display: none !important; } }
                    `;
                    document.head.appendChild(styleEl);
                }

                chartParent.appendChild(taContainer);
                console.log('TA-FIX: TA panel container created and appended');
            } else {
                console.warn('TA-FIX: Chart parent not found, cannot append TA panel');
                return;
            }
        } else {
            // 🔄 Purge all previous section content so that disabled widgets do not linger
            taContainer.innerHTML = '';
        }

        // Create widget container div
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'tradingview-ta-widget';
        widgetContainer.style.width = '100%';
        widgetContainer.style.height = '100%';
        taContainer.appendChild(widgetContainer);

        // Load TradingView widget script if not already loaded
        if (!window.TradingView || !window.TradingView.widget) {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = () => {
                console.log('TA-FIX: TradingView library loaded, creating TA widget');
                this.createTAWidget(symbol, widgetContainer.id);
            };
            document.head.appendChild(script);
        } else {
            // TradingView library already loaded
            this.createTAWidget(symbol, widgetContainer.id);
        }
    }

    /**
     * Create TradingView Technical Analysis widget
     * @param {string} symbol 
     * @param {string} containerId 
     */
    createTAWidget(symbol, containerId) {
        try {
            // Ensure symbol contains exchange prefix to avoid cannot_get_metainfo error
            const tvSymbol = symbol.includes(':') ? symbol : `NASDAQ:${symbol}`;
            const theme = this.config.theme === 'dark' ? 'dark' : 'light';
            
            console.log('TA-FIX: Creating TA widget for symbol:', tvSymbol);
            
            // Inject TradingView Technical Analysis widget (iframe) – official embed
            const scriptId = 'tv-ta-widget-script-' + containerId;
            const existingScript = document.getElementById(scriptId);
            if (existingScript) existingScript.remove();

            // Clear container before adding widget (in case of re-render)
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn('TA-FIX: Widget container not found');
                return;
            }

            container.innerHTML = '';

            const widgetScript = document.createElement('script');
            widgetScript.id = scriptId;
            widgetScript.type = 'text/javascript';
            widgetScript.async = true;

            // TradingView embed expects the configuration object as script innerHTML
            const config = {
                "interval": "1m",
                "width": "100%",
                "isTransparent": false,
                "height": "100%",
                "symbol": tvSymbol,
                "showIntervalTabs": true,
                "displayMode": "regular",
                "locale": "en",
                "colorTheme": theme
            };

            widgetScript.innerHTML = `new TradingView.widget({
                container_id: "${containerId}",
                width: "100%",
                height: "100%",
                symbol: "${tvSymbol}",
                locale: "en",
                interval: "1m",
                colorTheme: "${theme}",
                isTransparent: false,
                showIntervalTabs: true,
                displayMode: "regular",
                studies: [],
                hide_top_toolbar: true,
                hide_legend: true,
                withdateranges: true
            });`;

            container.appendChild(widgetScript);

            // Store reference for updates
            this.taWidgetContainer = containerId;
            this.taCurrentSymbol = tvSymbol;

            console.log('TA-FIX: TA widget injected');
            
        } catch (error) {
            console.error('TA-FIX: Error creating TA widget:', error);
        }
    }

    /**
     * Update TA panel for new symbol
     * @param {string} symbol - New symbol
     */
    updateTAPanel(symbol) {
        if (this.config.disableTAPanel) return;

        console.log('TA-FIX: Updating Technical Analysis panel for', symbol);
        
        // Find TA panel container
        const taContainer = document.getElementById('fh-ta-panel');
        if (!taContainer) {
            console.warn('TA-FIX: TA panel not found, cannot update');
            // Attempt to re-initialize fully if container vanished (edge-case)
            this.initTAPanel(symbol);
            return;
        }

        // Update existing widget if container exists
        if (this.taWidgetContainer) {
            this.createTAWidget(symbol, this.taWidgetContainer);
        } else {
            // Fallback: reinitialize
            this.initTAPanel(symbol);
        }
    }

    /**
     * Attempt to open the in-chart Technical Analysis pane through TradingView's widget bar API.
     * If the API is unavailable (most likely because the license level is insufficient),
     * silently fall back to the external iframe widget.
     */
    openTechnicalAnalysisPane() {
        if (this.config.disableTAPanel) return false;

        if (!this.config.useWidgetBar || !this.state.widget) {
            return false;
        }

        try {
            // The API differs slightly between library versions; check the safest combination.
            const barWidget = this.state.widget.barWidget || (this.state.widget.chart?.barWidget);
            const openPaneFn = barWidget && typeof barWidget.openPane === 'function' ? barWidget.openPane.bind(barWidget)
                                : (typeof this.state.widget.openPane === 'function' ? this.state.widget.openPane.bind(this.state.widget) : null);

            if (openPaneFn) {
                openPaneFn('technicalAnalysis');
                console.log('UnifiedChartManager: In-chart Technical Analysis pane opened via widget bar ✔');
                // Hide external iframe fallback if it exists
                const taIframePanel = document.getElementById('fh-ta-panel');
                if (taIframePanel) taIframePanel.style.display = 'none';
                return true;
            }
            console.warn('UnifiedChartManager: Widget bar API openPane not available – falling back to iframe TA widget');
            return false;
        } catch (err) {
            console.warn('UnifiedChartManager: Failed to open TA pane via widget bar –', err);
            return false;
        }

        // Fallback if widget bar not available or call failed
        this.initTAPanel(this.state.currentSymbol || this.config.symbol);
        return false;
    }
}

// Make globally available
window.UnifiedChartManager = window.UnifiedChartManager || UnifiedChartManager;

// NEW (2025-06-15): Provide immediate legacy alias for compatibility before any auto-init or DOMContentLoaded handlers run
if (typeof window !== 'undefined' && !window.ChartManager) {
    window.ChartManager = window.UnifiedChartManager;
}

// Legacy compatibility: expose static init(container) expected by old loader
if (typeof window !== 'undefined' && window.ChartManager && !window.ChartManager.init) {
    window.ChartManager.init = function(container) {
        // Accept DOM element or element id
        let containerId;
        if (typeof container === 'string') {
            containerId = container;
        } else if (container && container.id) {
            containerId = container.id;
        } else {
            // fallback generate id
            containerId = 'tradingview-chart';
            if (container && container.setAttribute) {
                container.setAttribute('id', containerId);
            }
        }
        // Prevent double creation
        if (window.chartManager && window.chartManager.getState) {
            return window.chartManager;
        }
        window.chartManager = new window.ChartManager({
            containerId,
            sidebarMode: 'custom',
            sidebarSections: { watchlist: false, info: false, overview: true, news: false, ta: false },
            customOverview: true
        });
        return window.chartManager;
    };
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedChartManager;
}

// ES6 module exports
// REMOVED EXPORT: export { UnifiedChartManager };
// REMOVED EXPORT: export default UnifiedChartManager;

console.log('✅ UnifiedChartManager exported successfully (CommonJS + ES6 + Global)');

// Robust auto-init: run immediately if DOM is already parsed, otherwise wait for DOMContentLoaded
(function autoInitChart() {
    const run = () => {
        if (window.chartManager) {
            console.log('🔧 Chart manager already exists, skipping auto-init');
            return;
        }

        const candidateIds = ['tradingview-chart', 'tradingview_chart', 'tradingview-widget', 'tradingview_widget'];
        const foundId = candidateIds.find(id => document.getElementById(id));

        if (!foundId) {
            console.log('🔧 No chart container found for auto-init');
            return;
        }

        console.log(`🔧 UnifiedChartManager: Auto-initializing for #${foundId}…`);

        window.chartManager = new UnifiedChartManager({
            containerId: foundId,
            symbol: 'NASDAQ:AAPL',
            interval: '15',
            theme: document.documentElement.getAttribute('data-theme') || 'dark',
            debug: true,
            useCustomDatafeed: true
        });

        window.chartManager.init().catch(error => {
            console.error('🔧 Chart auto-initialization failed:', error);
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // DOM already parsed
        run();
    } else {
        document.addEventListener('DOMContentLoaded', run);
    }
})(); 

/* ============================================================================
 * END OF FILE: components/chart/chart.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/stock-header/stock-header-manager.js
 * SIZE: 20,542 bytes
 * ============================================================================ */

/**
 * FinanceHub Stock Header Manager v20.0.0
 * Manages the stock header display with real-time updates
 */

class StockHeaderManager {
    constructor() {
        this.isInitialized = false;
        this.currentData = null;
        this.elements = {};
        this.animationFrameId = null;
        
        // Subscribe to ticker changes and data updates
        if (window.TickerSync) {
            window.TickerSync.subscribe('StockHeaderManager', this.handleTickerEvent.bind(this));
        }

        // Listen to global events dispatched by EventManager
        document.addEventListener('stock-data-updated', (e) => {
            try {
                const { symbol, stockData } = e.detail || {};
                if (symbol && stockData) {
                    this.updateStockData(stockData, symbol);
                }
            } catch (err) {
                console.warn('[StockHeader] Failed handling stock-data-updated', err);
            }
        });

        document.addEventListener('symbol-changed', (e) => {
            try {
                const { symbol } = e.detail || {};
                if (symbol) {
                    this.updateLoadingState(symbol);
                }
            } catch (err) {
                console.warn('[StockHeader] Failed handling symbol-changed', err);
            }
        });
    }

    /**
     * Handle ticker events from TickerSync
     */
    handleTickerEvent(event) {
        switch (event.type) {
            case 'ticker_changed':
                this.updateLoadingState(event.ticker);
                break;
            case 'data_updated':
                if (event.data.stockData) {
                    this.updateStockData(event.data.stockData.data, event.ticker);
                }
                break;
            case 'loading_start':
                this.showLoadingState();
                break;
            case 'loading_end':
                this.hideLoadingState();
                break;
            case 'error':
                this.showErrorState(event.error);
                break;
        }
    }

    /**
     * Initialize stock header
     */
    initialize() {
        this.findElements();
        this.setupAnimations();
        this.setupInteractions();
        
        this.isInitialized = true;
        
        // Clean up any existing placeholder/mock values
        this.clearPlaceholderValues();
        
        console.log('✅ StockHeaderManager initialized');

        // --- INITIAL PRIME FETCH (2025-06-15) ---
        try {
            const defaultSymbol = (window.FinanceHubState?.state?.currentSymbol) || 'AAPL';
            if (defaultSymbol && typeof defaultSymbol === 'string') {
                this.updateLoadingState(defaultSymbol);
            }
        } catch (primeErr) {
            console.debug('[StockHeader] Prime fetch skipped', primeErr);
        }
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        this.elements = {
            container: document.getElementById('stock-header-section'),
            symbol: document.getElementById('fh-stock-symbol') || document.getElementById('stock-symbol-display'),
            companyName: document.getElementById('fh-stock-company-name') || document.getElementById('stock-company-name'),
            currentPrice: document.getElementById('fh-stock-current-price') || document.getElementById('stock-current-price'),
            change: document.getElementById('fh-stock-change') || document.getElementById('stock-change'),

            // Metrics
            previousClose: document.getElementById('fh-previous-close') || null,
            marketCap: document.getElementById('fh-market-cap') || null,
            volume: document.getElementById('fh-volume') || document.getElementById('stock-volume'),
            dayRange: document.getElementById('stock-day-range'),

            // Misc
            exchange: document.getElementById('stock-exchange'),
            marketStatus: document.getElementById('stock-market-status')
        };

        // Check if all required elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn('[StockHeader] Missing elements:', missingElements);
        }
    }

    /**
     * Update loading state with new ticker
     */
    updateLoadingState(ticker) {
        // Validate ticker symbol; ignore placeholders
        if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0 || ticker === '—') {
            console.warn('[StockHeader] updateLoadingState called with invalid ticker:', ticker);
            return;
        }
        if (this.elements.symbol) {
            this.elements.symbol.textContent = ticker;
        }
        
        if (this.elements.companyName) {
            this.elements.companyName.textContent = 'Loading...';
            this.elements.companyName.classList.add('loading');
        }

        // Ensure content container becomes visible
        try{
            const contentEl = this.elements.container?.querySelector('#fh-stock-header-content');
            if(contentEl){ contentEl.style.display='block'; contentEl.classList.remove('hidden'); }
        }catch(e){ console.warn('[StockHeader] failed to unhide content', e); }

        // 🔄 Immediately fetch latest header snapshot from backend
        if (window.API && typeof window.API.getStockHeader === 'function') {
            // Fire-and-forget; UI will update when data arrives
            window.API.getStockHeader(ticker)
                .then(data => this.updateStockData(data, ticker))
                .catch(err => {
                    console.warn('[StockHeader] Failed to fetch header data', err);
                    this.showErrorState(err);
                });
        } else if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService.getStockHeader === 'function') {
            window.FinanceHubAPIService.getStockHeader(ticker)
                .then(data => this.updateStockData(data, ticker))
                .catch(err => {
                    console.warn('[StockHeader] Failed to fetch header data', err);
                    this.showErrorState(err);
                });
        } else {
            console.warn('[StockHeader] No API service available for header fetch');
        }
    }

    /**
     * (Deprecated) external components should call updateLoadingState which internally triggers fetch
     * Kept for backward compat to force refresh header from outside
     */
    async fetchHeaderData(ticker) {
        if (!ticker) return;
        try {
            const data = await window.FinanceHubAPIService.getStockHeader(ticker);
            this.updateStockData(data, ticker);
        } catch (error) {
            console.error('[StockHeader] fetchHeaderData error', error);
            this.showErrorState(error);
        }
    }

    /**
     * Update stock data display
     */
    updateStockData(data, ticker) {
        if (!data || !this.isInitialized) return;

        // Handle different data formats - check if data has price_data wrapper
        const stockData = data.price_data || data;
        this.currentData = stockData;
        
        // Update symbol and company name
        this.updateBasicInfo(stockData, ticker);
        
        // Update price information
        this.updatePriceInfo(stockData);
        
        // Update additional metrics
        this.updateAdditionalInfo(stockData);
        
        // Update market status
        this.updateMarketStatus(stockData);
        
        // Trigger animations
        this.animateUpdate();

        // Reveal content area & hide placeholder
        try {
            if (this.elements.container) {
                const placeholderEl = this.elements.container.querySelector('.stock-header-placeholder');
                const contentEl = this.elements.container.querySelector('#fh-stock-header-content');
                if (placeholderEl) placeholderEl.style.display = 'none';
                if (contentEl) {
                    contentEl.style.display = 'block';
                    contentEl.classList.remove('hidden');
                }
            }
        } catch(err) { console.warn('[StockHeader] Failed to toggle placeholder/content', err);}

        // Clean up duplicate nodes (keep first occurrence)
        this.deduplicateIds(['fh-previous-close','fh-market-cap','fh-volume']);
    }

    /**
     * Update basic stock information
     */
    updateBasicInfo(data, ticker) {
        if (this.elements.symbol) {
            this.elements.symbol.textContent = ticker;
        }
        
        if (this.elements.companyName) {
            const companyName = data.company_overview?.company_name || 
                              data.company_name || 
                              `${ticker} Inc.`;
            this.elements.companyName.textContent = companyName;
            this.elements.companyName.classList.remove('loading');
        }
        
        if (this.elements.exchange) {
            this.elements.exchange.textContent = data.exchange || 'NASDAQ';
        }
    }

    /**
     * Update price information
     */
    updatePriceInfo(data) {
        // Handle both API formats: price or current_price
        const price = data.price || data.current_price;
        if (this.elements.currentPrice && price) {
            const priceValue = parseFloat(price);
            this.elements.currentPrice.textContent = window.FinanceUtils ? 
                window.FinanceUtils.formatCurrency(priceValue) : 
                `$${priceValue.toFixed(2)}`;
        }
        
        if (this.elements.change) {
            const change = parseFloat(data.change || 0);
            const changePercent = parseFloat(data.change_percent || 0);
            
            // Update change display
            const changeText = window.FinanceUtils ? 
                `${window.FinanceUtils.formatCurrency(change)} (${window.FinanceUtils.formatPercentage(changePercent)})` :
                `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            
            this.elements.change.textContent = changeText;
            
            // Update change class
            this.elements.change.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }

    /**
     * Update additional information
     */
    updateAdditionalInfo(data) {
        // Helper to update all duplicates (due to earlier markup duplication)
        const updateAll = (idSelector, valueFormatter) => {
            document.querySelectorAll(`[id='${idSelector}']`).forEach(el => {
                el.textContent = valueFormatter();
                el.classList.remove('skeleton');
            });
        };

        // Previous Close
        if (data.previous_close) {
            const prevClose = parseFloat(data.previous_close);
            updateAll('fh-previous-close', () => window.FinanceUtils ? window.FinanceUtils.formatCurrency(prevClose) : `$${prevClose.toFixed(2)}`);
        } else {
            updateAll('fh-previous-close', () => '—');
        }

        // Market Cap
        if (data.market_cap) {
            const mcap = parseFloat(data.market_cap);
            const mcapText = window.FinanceUtils ? window.FinanceUtils.formatLargeNumber(mcap) : (
                mcap >= 1e12 ? `$${(mcap/1e12).toFixed(2)}T` :
                mcap >= 1e9 ? `$${(mcap/1e9).toFixed(2)}B` :
                mcap >= 1e6 ? `$${(mcap/1e6).toFixed(2)}M` : `$${mcap.toFixed(2)}`
            );
            updateAll('fh-market-cap', () => mcapText);
        } else {
            updateAll('fh-market-cap', () => '—');
        }

        // Volume
        if (data.volume) {
            const vol = parseInt(data.volume);
            const volText = window.FinanceUtils ? window.FinanceUtils.formatLargeNumber(vol) : vol.toLocaleString();
            updateAll('fh-volume', () => volText);
        } else {
            updateAll('fh-volume', () => '—');
        }

        if (this.elements.dayRange) {
            const dayLow = parseFloat(data.day_low || 0);
            const dayHigh = parseFloat(data.day_high || 0);
            if (dayLow && dayHigh) {
                this.elements.dayRange.textContent = window.FinanceUtils ?
                    `${window.FinanceUtils.formatCurrency(dayLow)} - ${window.FinanceUtils.formatCurrency(dayHigh)}` :
                    `$${dayLow.toFixed(2)} - $${dayHigh.toFixed(2)}`;
            }
        }
    }

    /**
     * Update market status
     */
    updateMarketStatus(data) {
        if (this.elements.marketStatus) {
            const isOpen = data.market_open !== false; // Default to open if not specified
            this.elements.marketStatus.textContent = isOpen ? 'Market Open' : 'Market Closed';
            this.elements.marketStatus.className = `stock-market-status ${isOpen ? 'open' : 'closed'}`;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.elements.container) {
            this.elements.container.classList.add('loading');
        }
        
        Object.values(this.elements).forEach(element => {
            if (element && element !== this.elements.container) {
                element.classList.add('loading-shimmer');
            }
        });
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.elements.container) {
            this.elements.container.classList.remove('loading');
        }
        
        Object.values(this.elements).forEach(element => {
            if (element && element !== this.elements.container) {
                element.classList.remove('loading-shimmer');
            }
        });
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        console.error('[StockHeader] Error:', error);
        
        if (this.elements.companyName) {
            this.elements.companyName.textContent = 'Error loading data';
            this.elements.companyName.classList.add('error');
        }
        
        if (this.elements.currentPrice) {
            this.elements.currentPrice.textContent = '--';
        }
        
        if (this.elements.change) {
            this.elements.change.textContent = '--';
            this.elements.change.className = 'stock-change';
        }
    }

    /**
     * Setup animations for smooth updates
     */
    setupAnimations() {
        // Price pulse animation for significant changes
        this.priceChangeThreshold = 1; // 1% change threshold for animation
    }

    /**
     * Animate update
     */
    animateUpdate() {
        if (!this.elements.container) return;

        // Add update animation class
        this.elements.container.classList.add('updating');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            if (this.elements.container) {
                this.elements.container.classList.remove('updating');
            }
        }, 300);

        // Animate price change if significant
        if (this.currentData && this.elements.currentPrice) {
            const changePercent = Math.abs(parseFloat(this.currentData.change_percent || 0));
            
            if (changePercent >= this.priceChangeThreshold) {
                this.elements.currentPrice.classList.add('significant-change');
                
                setTimeout(() => {
                    if (this.elements.currentPrice) {
                        this.elements.currentPrice.classList.remove('significant-change');
                    }
                }, 1000);
            }
        }
    }

    /**
     * Setup interactions
     */
    setupInteractions() {
        if (this.elements.container) {
            // Click to refresh data
            this.elements.container.addEventListener('click', () => {
                if (window.TickerSync) {
                    window.TickerSync.refreshCurrentTicker();
                }
            });
            
            // Add tooltip or hover effects
            this.elements.container.addEventListener('mouseenter', () => {
                if (this.elements.container) {
                    this.elements.container.classList.add('hovered');
                }
            });
            
            this.elements.container.addEventListener('mouseleave', () => {
                if (this.elements.container) {
                    this.elements.container.classList.remove('hovered');
                }
            });
        }
    }

    /**
     * Get current stock data
     */
    getCurrentData() {
        return this.currentData;
    }

    /**
     * Get component state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasData: !!this.currentData,
            currentTicker: this.elements.symbol?.textContent || '',
            isLoading: this.elements.container?.classList.contains('loading') || false
        };
    }

    /**
     * Force refresh display
     */
    refresh() {
        if (this.currentData && window.TickerSync) {
            const currentTicker = window.TickerSync.getCurrentTicker();
            this.updateStockData(this.currentData, currentTicker);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (window.TickerSync) {
            window.TickerSync.unsubscribe('StockHeaderManager');
        }
        
        // Remove event listeners
        if (this.elements.container) {
            this.elements.container.removeEventListener('click', () => {});
            this.elements.container.removeEventListener('mouseenter', () => {});
            this.elements.container.removeEventListener('mouseleave', () => {});
        }
        
        this.isInitialized = false;
        console.log('[StockHeader] Stock Header Manager destroyed');
    }

    /**
     * Remove duplicate DOM nodes with the same IDs, keep the first element encountered
     */
    deduplicateIds(idList) {
        idList.forEach(id => {
            const elements = document.querySelectorAll(`[id='${id}']`);
            if (elements.length > 1) {
                // Keep first, remove rest
                for (let i = 1; i < elements.length; i++) {
                    elements[i].remove();
                }
                console.log(`[StockHeader] Removed ${elements.length - 1} duplicate(s) for ID: ${id}`);
            }
        });
    }

    /**
     * Clear any existing placeholder/mock values
     */
    clearPlaceholderValues() {
        const clearElement = (selector, defaultText = '—') => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent.includes('$199.20') || 
                    el.textContent.includes('$2.94T') || 
                    el.textContent.includes('11.19M') ||
                    el.textContent.includes('N/A')) {
                    el.textContent = defaultText;
                    el.classList.remove('skeleton');
                }
            });
        };

        // Clear known mock values
        clearElement('[id="fh-stock-current-price"]', '$0.00');
        clearElement('[id="fh-previous-close"]');
        clearElement('[id="fh-market-cap"]');
        clearElement('[id="fh-volume"]');
        clearElement('[id="fh-change-amount"]', '+$0.00');
        clearElement('[id="fh-change-percent"]', '(+0.00%)');
    }
}

// Auto-create singleton instance when DOM ready
if (typeof window !== 'undefined') {
    const createInstance = () => {
        if (!window.__stockHeaderManager) {
            window.__stockHeaderManager = new StockHeaderManager();
            window.__stockHeaderManager.initialize();
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createInstance, { once: true });
    } else { createInstance(); }
}

// CommonJS export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockHeaderManager;
}

// ES6 export for modern modules
// REMOVED EXPORT: export { StockHeaderManager };
// REMOVED EXPORT: export default StockHeaderManager;

console.log('✅ StockHeaderManager exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/stock-header/stock-header-manager.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/ux/ux-enhancements.js
 * SIZE: 27,857 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * AEVOREX FINANCEHUB - UNIFIED UX ENHANCEMENTS v8.0.0
 * Premium User Experience Enhancement System
 * Merged from 4 versions: components/ux-enhancements.js + ux-enhancements/ files
 * ===================================================================
 * 
 * FEATURES:
 * - Premium animations (60fps)
 * - Responsive design system
 * - Chat interface enhancements
 * - Scroll optimization
 * - Loading states & skeleton loaders
 * - Dark/Light theme support
 * - Performance monitoring
 * - Accessibility improvements
 */

class AdvancedUXEnhancementsUnified {
    constructor(options = {}) {
        this.config = {
            VERSION: "8.0.0-unified",
            enableAnimations: true,
            enableScrollOptimization: true,
            enableChatEnhancements: true,
            enableThemeSystem: true,
            enablePerformanceMonitoring: true,
            enableAccessibility: true,
            animationDuration: 300,
            scrollThreshold: 100,
            debounceDelay: 150,
            ...options
        };
        
        this.state = {
            isInitialized: false,
            currentTheme: 'dark',
            isScrolling: false,
            scrollPosition: 0,
            lastScrollTime: 0,
            performanceMetrics: {
                fps: 60,
                loadTime: 0,
                renderTime: 0
            },
            animations: new Map(),
            observers: new Map()
        };
        
        this.elements = {
            body: null,
            main: null,
            header: null,
            chatContainer: null,
            scrollIndicator: null,
            loadingOverlay: null,
            themeToggle: null
        };
        
        this.timers = {
            scroll: null,
            resize: null,
            performance: null
        };
        
        // Bind methods BEFORE using them
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleThemeToggle = this.handleThemeToggle.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
        this.handleChatInput = this.handleChatInput.bind(this);
        this.handleChatSend = this.handleChatSend.bind(this);
        this.handleChatFocus = this.handleChatFocus.bind(this);
        this.handleChatBlur = this.handleChatBlur.bind(this);
        
        console.log(`🎨 AdvancedUXEnhancementsUnified v${this.config.VERSION} initialized`);
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing UX Enhancements...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize theme system
            if (this.config.enableThemeSystem) {
                this.initializeThemeSystem();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize animations
            if (this.config.enableAnimations) {
                this.initializeAnimations();
            }
            
            // Setup scroll optimization
            if (this.config.enableScrollOptimization) {
                this.initializeScrollOptimization();
            }
            
            // Initialize chat enhancements
            if (this.config.enableChatEnhancements) {
                this.initializeChatEnhancements();
            }
            
            // Setup accessibility features
            if (this.config.enableAccessibility) {
                this.initializeAccessibility();
            }
            
            // Start performance monitoring
            if (this.config.enablePerformanceMonitoring) {
                this.startPerformanceMonitoring();
            }
            
            // Apply initial enhancements
            this.applyInitialEnhancements();
            
            this.state.isInitialized = true;
            console.log('✅ UX Enhancements initialized successfully');
            
        } catch (error) {
            console.error('❌ UX Enhancements initialization failed:', error);
            this.handleError(error);
        }
    }
    
    cacheElements() {
        this.elements.body = document.body;
        this.elements.main = document.querySelector('main') || document.querySelector('.main-content');
        this.elements.header = document.querySelector('header') || document.querySelector('.header');
        this.elements.chatContainer = document.querySelector('.chat-container') || 
                                     document.querySelector('#chat-container') ||
                                     document.querySelector('.ai-chat');
    }
    
    setupEventListeners() {
        // Scroll events with debouncing
        if (this.config.enableScrollOptimization) {
            window.addEventListener('scroll', this.debounce(this.handleScroll, this.config.debounceDelay), { passive: true });
        }
        
        // Resize events with debouncing
        window.addEventListener('resize', this.debounce(this.handleResize, this.config.debounceDelay));
        
        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyboardNavigation);
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle') || document.querySelector('#theme-toggle');
        if (themeToggle) {
            this.elements.themeToggle = themeToggle;
            themeToggle.addEventListener('click', this.handleThemeToggle);
        }
    }
    
    initializeThemeSystem() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('aevorex-theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        this.state.currentTheme = savedTheme || systemTheme;
        this.applyTheme(this.state.currentTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('aevorex-theme')) {
                this.state.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.state.currentTheme);
            }
        });
    }
    
    applyTheme(theme) {
        this.elements.body.classList.remove('theme-light', 'theme-dark');
        this.elements.body.classList.add(`theme-${theme}`);
        
        // Update theme toggle button
        if (this.elements.themeToggle) {
            this.elements.themeToggle.setAttribute('data-theme', theme);
            this.elements.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        }
        
        // Emit theme change event
        document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
    }
    
    handleThemeToggle() {
        const newTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
        this.state.currentTheme = newTheme;
        this.applyTheme(newTheme);
        localStorage.setItem('aevorex-theme', newTheme);
        
        // Add toggle animation
        if (this.elements.themeToggle) {
            this.elements.themeToggle.classList.add('theme-toggle-active');
            setTimeout(() => {
                this.elements.themeToggle.classList.remove('theme-toggle-active');
            }, this.config.animationDuration);
        }
    }
    
    initializeAnimations() {
        // Add CSS custom properties for animations
        document.documentElement.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
        document.documentElement.style.setProperty('--animation-easing', 'cubic-bezier(0.4, 0, 0.2, 1)');
        
        // Initialize intersection observer for scroll animations
        this.setupScrollAnimations();
        
        // Initialize loading animations
        this.setupLoadingAnimations();
    }
    
    setupScrollAnimations() {
        if (!('IntersectionObserver' in window)) return;
        
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    entry.target.classList.remove('animate-out');
                } else {
                    entry.target.classList.add('animate-out');
                    entry.target.classList.remove('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        this.state.observers.set('animation', animationObserver);
        
        // Observe elements with animation classes
        document.querySelectorAll('.animate-on-scroll, .bubble-component, .ticker-item').forEach(el => {
            animationObserver.observe(el);
        });
    }
    
    setupLoadingAnimations() {
        // Create enhanced loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay-enhanced';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner-enhanced"></div>
                <div class="loading-text">Loading FinanceHub...</div>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;
        
        this.elements.loadingOverlay = loadingOverlay;
        this.elements.body.appendChild(loadingOverlay);
        
        // Hide loading overlay after initial load
        window.addEventListener('load', () => {
            setTimeout(() => this.hideLoadingOverlay(), 500);
        });
    }
    
    hideLoadingOverlay() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('loading-fade-out');
            setTimeout(() => {
                if (this.elements.loadingOverlay && this.elements.loadingOverlay.parentNode) {
                    this.elements.loadingOverlay.parentNode.removeChild(this.elements.loadingOverlay);
                }
            }, this.config.animationDuration);
        }
    }
    
    initializeScrollOptimization() {
        // Create scroll indicator
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.innerHTML = '<div class="scroll-progress"></div>';
        this.elements.scrollIndicator = scrollIndicator;
        this.elements.body.appendChild(scrollIndicator);
        
        // Initialize smooth scrolling for anchor links
        this.initializeSmoothScrolling();
    }
    
    initializeSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        this.state.scrollPosition = scrollTop;
        this.state.lastScrollTime = Date.now();
        this.state.isScrolling = true;
        
        // Update scroll indicator
        if (this.elements.scrollIndicator) {
            const progressBar = this.elements.scrollIndicator.querySelector('.scroll-progress');
            if (progressBar) {
                progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
            }
        }
        
        // Add/remove scrolling class to body
        this.elements.body.classList.add('is-scrolling');
        
        // Clear scrolling state after delay
        clearTimeout(this.timers.scroll);
        this.timers.scroll = setTimeout(() => {
            this.state.isScrolling = false;
            this.elements.body.classList.remove('is-scrolling');
        }, 150);
        
        // Emit scroll event
        document.dispatchEvent(new CustomEvent('ux:scroll', {
            detail: { scrollTop, scrollPercent, isScrolling: this.state.isScrolling }
        }));
    }
    
    handleResize() {
        // Update viewport height CSS custom property
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        
        // Emit resize event
        document.dispatchEvent(new CustomEvent('ux:resize', {
            detail: { width: window.innerWidth, height: window.innerHeight }
        }));
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // Pause animations when tab is not visible
            this.pauseAnimations();
        } else {
            // Resume animations when tab becomes visible
            this.resumeAnimations();
        }
    }
    
    handleKeyboardNavigation(event) {
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.focusSearchInput();
                    break;
                case '/':
                    event.preventDefault();
                    this.focusChatInput();
                    break;
                case 'd':
                    event.preventDefault();
                    this.handleThemeToggle();
                    break;
            }
        }
        
        // Handle escape key
        if (event.key === 'Escape') {
            this.handleEscapeKey();
        }
    }
    
    focusSearchInput() {
        const searchInput = document.querySelector('input[type="search"]') || 
                           document.querySelector('.search-input') ||
                           document.querySelector('#search');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    focusChatInput() {
        const chatInput = document.querySelector('.chat-input') ||
                         document.querySelector('#chat-input') ||
                         document.querySelector('textarea[placeholder*="chat"]');
        if (chatInput) {
            chatInput.focus();
        }
    }
    
    handleEscapeKey() {
        // Close any open modals or overlays
        const activeModal = document.querySelector('.modal.active') ||
                           document.querySelector('.overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
        
        // Blur active input
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
    
    initializeChatEnhancements() {
        if (!this.elements.chatContainer) return;
        
        // Find chat input elements
        const chatInput = this.elements.chatContainer.querySelector('textarea') ||
                         this.elements.chatContainer.querySelector('input[type="text"]');
        const chatSendButton = this.elements.chatContainer.querySelector('button[type="submit"]') ||
                              this.elements.chatContainer.querySelector('.send-button');
        
        if (chatInput) {
            chatInput.addEventListener('input', this.handleChatInput);
            chatInput.addEventListener('focus', this.handleChatFocus);
            chatInput.addEventListener('blur', this.handleChatBlur);
            
            // Add keyboard shortcuts
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.handleChatSend();
                }
            });
        }
        
        if (chatSendButton) {
            chatSendButton.addEventListener('click', this.handleChatSend);
        }
        
        // Initialize auto-resize for textarea
        this.initializeChatAutoResize(chatInput);
    }
    
    initializeChatAutoResize(textarea) {
        if (!textarea || textarea.tagName !== 'TEXTAREA') return;
        
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        };
        
        textarea.addEventListener('input', resize);
        resize(); // Initial resize
    }
    
    handleChatInput(event) {
        const input = event.target;
        const value = input.value.trim();
        
        // Update send button state
        const sendButton = this.elements.chatContainer.querySelector('button[type="submit"]') ||
                          this.elements.chatContainer.querySelector('.send-button');
        if (sendButton) {
            sendButton.disabled = !value;
            sendButton.classList.toggle('chat-send-ready', !!value);
        }
        
        // Show typing indicator
        this.showTypingIndicator();
    }
    
    handleChatFocus() {
        this.elements.chatContainer.classList.add('chat-focused');
    }
    
    handleChatBlur() {
        this.elements.chatContainer.classList.remove('chat-focused');
        this.hideTypingIndicator();
    }
    
    handleChatSend() {
        const chatInput = this.elements.chatContainer.querySelector('textarea') ||
                         this.elements.chatContainer.querySelector('input[type="text"]');
        
        if (chatInput && chatInput.value.trim()) {
            // Add sending animation
            this.elements.chatContainer.classList.add('chat-sending');
            
            // Emit chat send event
            document.dispatchEvent(new CustomEvent('chat:send', {
                detail: { message: chatInput.value.trim() }
            }));
            
            // Clear input
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // Remove sending animation after delay
            setTimeout(() => {
                this.elements.chatContainer.classList.remove('chat-sending');
            }, 1000);
        }
    }
    
    showTypingIndicator() {
        clearTimeout(this.timers.typing);
        this.elements.chatContainer.classList.add('chat-typing');
        
        this.timers.typing = setTimeout(() => {
            this.hideTypingIndicator();
        }, 2000);
    }
    
    hideTypingIndicator() {
        this.elements.chatContainer.classList.remove('chat-typing');
        clearTimeout(this.timers.typing);
    }
    
    initializeAccessibility() {
        // Add skip links
        this.addSkipLinks();
        
        // Enhance focus management
        this.enhanceFocusManagement();
        
        // Add ARIA labels where missing
        this.addAriaLabels();
        
        // Initialize keyboard navigation
        this.initializeKeyboardNavigation();
    }
    
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
            <a href="#chat" class="skip-link">Skip to chat</a>
        `;
        
        this.elements.body.insertBefore(skipLinks, this.elements.body.firstChild);
    }
    
    enhanceFocusManagement() {
        // Add focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.elements.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            this.elements.body.classList.remove('keyboard-navigation');
        });
    }
    
    addAriaLabels() {
        // Add ARIA labels to buttons without text
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
            if (!button.textContent.trim()) {
                const icon = button.querySelector('i, svg');
                if (icon) {
                    button.setAttribute('aria-label', 'Button');
                }
            }
        });
        
        // Add ARIA labels to form inputs without labels
        document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });
    }
    
    initializeKeyboardNavigation() {
        // Make non-interactive elements with click handlers focusable
        document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(textarea):not(select)').forEach(el => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
                el.setAttribute('role', 'button');
            }
        });
    }
    
    startPerformanceMonitoring() {
        // Monitor FPS
        this.monitorFPS();
        
        // Monitor load times
        this.monitorLoadTimes();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
    }
    
    monitorFPS() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.state.performanceMetrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Emit FPS update
                document.dispatchEvent(new CustomEvent('performance:fps', {
                    detail: { fps: this.state.performanceMetrics.fps }
                }));
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    monitorLoadTimes() {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.state.performanceMetrics.loadTime = loadTime;
            
            console.log(`📊 Page load time: ${loadTime}ms`);
        });
    }
    
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                console.log(`💾 Memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
            }, 30000);
        }
    }
    
    applyInitialEnhancements() {
        // Add enhanced classes to body
        this.elements.body.classList.add('ux-enhanced', 'premium-experience');
        
        // Set initial viewport height
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        
        // Initialize reduced motion support
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.elements.body.classList.add('reduced-motion');
        }
        
        // Add loading complete class after initialization
        setTimeout(() => {
            this.elements.body.classList.add('ux-loaded');
        }, 100);
    }
    
    pauseAnimations() {
        this.elements.body.classList.add('animations-paused');
    }
    
    resumeAnimations() {
        this.elements.body.classList.remove('animations-paused');
    }
    
    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Public API methods
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.state.currentTheme = theme;
            this.applyTheme(theme);
            localStorage.setItem('aevorex-theme', theme);
        }
    }
    
    getTheme() {
        return this.state.currentTheme;
    }
    
    getPerformanceMetrics() {
        return { ...this.state.performanceMetrics };
    }
    
    addCustomAnimation(name, element, keyframes, options) {
        if (element && keyframes) {
            const animation = element.animate(keyframes, options);
            this.state.animations.set(name, animation);
            return animation;
        }
    }
    
    removeCustomAnimation(name) {
        const animation = this.state.animations.get(name);
        if (animation) {
            animation.cancel();
            this.state.animations.delete(name);
        }
    }
    
    handleError(error) {
        console.error('UX Enhancements error:', error);
        
        // Fallback to basic functionality
        this.elements.body.classList.add('ux-fallback');
        
        // Disable problematic features
        this.config.enableAnimations = false;
        this.config.enablePerformanceMonitoring = false;
    }
    
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        
        if (this.elements.themeToggle) {
            this.elements.themeToggle.removeEventListener('click', this.handleThemeToggle);
        }
        
        // Clear timers
        Object.values(this.timers).forEach(timer => {
            if (timer) clearTimeout(timer);
        });
        
        // Disconnect observers
        this.state.observers.forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
        
        // Cancel animations
        this.state.animations.forEach(animation => {
            if (animation && animation.cancel) {
                animation.cancel();
            }
        });
        
        console.log('🗑️ AdvancedUXEnhancementsUnified destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedUXEnhancementsUnified;
} else if (typeof window !== 'undefined') {
    window.AdvancedUXEnhancementsUnified = AdvancedUXEnhancementsUnified;
} 

// ES6 export for modern modules (Added for structural consistency)
// REMOVED EXPORT: export { AdvancedUXEnhancementsUnified };
// REMOVED EXPORT: export default AdvancedUXEnhancementsUnified;

console.log('✅ AdvancedUXEnhancementsUnified exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/ux/ux-enhancements.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/header/header-manager.js
 * SIZE: 15,632 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * HEADER MANAGER
 * Manages main header functionality and interactions
 * ===================================================================
 */

class HeaderManager {
    constructor() {
        this.header = null;
        this.searchInput = null;
        this.searchResults = null;
        this.themeToggle = null;
        this.isSearchActive = false;
        this.searchTimeout = null;
        this.observers = new Map();
        
        this.config = {
            searchDelay: 300,
            maxSearchResults: 8,
            enableScrollEffect: true
        };
    }

    /**
     * Initialize header manager
     */
    async init() {
        try {
            console.log('🔄 Initializing HeaderManager...');
            
            // Find header elements
            this.findHeaderElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize search functionality
            this.initializeSearch();
            
            // Setup scroll effects
            if (this.config.enableScrollEffect) {
                this.setupScrollEffects();
            }
            
            console.log('✅ HeaderManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize HeaderManager:', error);
            return false;
        }
    }

    /**
     * Find header DOM elements
     */
    findHeaderElements() {
        this.header = document.querySelector('header') || 
                     document.querySelector('.header') ||
                     document.querySelector('.main-header');
        
        if (!this.header) {
            throw new Error('Header element not found');
        }

        this.searchInput = this.header.querySelector('.search-input') ||
                          this.header.querySelector('input[type="search"]') ||
                          this.header.querySelector('.header-search input');
        
        this.themeToggle = this.header.querySelector('.theme-toggle') ||
                          this.header.querySelector('.dark-mode-toggle');
        
        // Create search results container if it doesn't exist
        this.createSearchResults();
    }

    /**
     * Create search results container
     */
    createSearchResults() {
        this.searchResults = this.header.querySelector('.search-results');
        
        if (!this.searchResults && this.searchInput) {
            this.searchResults = document.createElement('div');
            this.searchResults.className = 'search-results';
            this.searchResults.style.display = 'none';
            
            // Insert after search input
            this.searchInput.parentNode.insertBefore(
                this.searchResults, 
                this.searchInput.nextSibling
            );
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            this.searchInput.addEventListener('focus', () => {
                this.showSearchResults();
            });

            this.searchInput.addEventListener('blur', () => {
                // Delay hiding to allow for result clicks
                setTimeout(() => this.hideSearchResults(), 200);
            });

            this.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });

            // Submit via parent form (magnifier button or Enter)
            const parentForm = this.searchInput.closest('.header-search-form');
            if (parentForm) {
                parentForm.addEventListener('submit', (evt) => {
                    evt.preventDefault();
                    const symbolRaw = this.searchInput.value.trim();
                    if (symbolRaw) {
                        this.selectStock(symbolRaw.toUpperCase());
                    }
                });
            }
        }

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Click outside to close search
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Logo click - go to home
        const logo = this.header.querySelector('.logo, .brand');
        if (logo) {
            logo.addEventListener('click', () => {
                this.goToHome();
            });
        }
    }

    /**
     * Initialize search functionality
     */
    initializeSearch() {
        if (!this.searchInput) return;

        // Set placeholder
        this.searchInput.placeholder = 'Search stocks (e.g., AAPL, Tesla)...';
        
        // Initialize search state
        this.isSearchActive = false;
    }

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }

            // Hide/show header on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                this.header.classList.add('hidden');
            } else {
                this.header.classList.remove('hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick);
    }

    /**
     * Handle search input
     */
    handleSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, this.config.searchDelay);
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        if (!query || query.length < 1) {
            this.hideSearchResults();
            return;
        }

        try {
            console.log(`🔍 Searching for: ${query}`);
            
            // Show loading state
            this.showSearchLoading();
            
            // Use FinanceHubAPIService to get search results
            const data = await window.FinanceHubAPI.searchStocks(query, 20);
            
            // Display results
            this.displaySearchResults(data, query);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showSearchError('Search failed. Please try again.');
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results, query) {
        if (!this.searchResults) return;

        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No results found for "${query}"</div>
                </div>
            `;
        } else {
            this.searchResults.innerHTML = results.map(stock => `
                <div class="search-result-item" data-symbol="${stock.symbol}">
                    <div class="result-main">
                        <div class="result-symbol">${stock.symbol}</div>
                        <div class="result-name">${stock.name}</div>
                        <div class="result-metadata">
                            ${stock.sector ? `<span class="result-sector">${stock.sector}</span>` : ''}
                            ${stock.exchange ? `<span class="result-exchange">${stock.exchange}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-price">
                        <span class="price">${stock.currency || '$'}${stock.price.toFixed(2)}</span>
                        <span class="change ${stock.change >= 0 ? 'positive' : 'negative'}">
                            ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                        </span>
                    </div>
                </div>
            `).join('');

            // Add click handlers to results
            this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    this.selectStock(symbol);
                });
            });
        }

        this.showSearchResults();
    }

    /**
     * Show search loading state
     */
    showSearchLoading() {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Searching...</div>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Show search error
     */
    showSearchError(message) {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = `
            <div class="search-error">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Show search results
     */
    showSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'block';
            this.isSearchActive = true;
        }
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
            this.isSearchActive = false;
        }
    }

    /**
     * Handle search keydown events
     */
    handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            this.hideSearchResults();
            this.searchInput.blur();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const firstResult = this.searchResults?.querySelector('.search-result-item');
            if (firstResult) {
                const symbol = firstResult.dataset.symbol;
                this.selectStock(symbol);
            }
        }
    }

    /**
     * Select stock from search results
     */
    selectStock(symbol) {
        console.log(`📈 Stock selected: ${symbol}`);
        
        // Clear search
        this.searchInput.value = '';
        this.hideSearchResults();
        
        // Dispatch stock change event
        const event = new CustomEvent('stockSymbolChange', {
            detail: { symbol: symbol, source: 'header-search' }
        });
        document.dispatchEvent(event);
        
        // 🔄 NEW: Dispatch unified symbol change event used across modules (Rule #008 data-parity)
        const unifiedEvent = new CustomEvent('symbol-changed', {
            detail: { symbol: symbol, source: 'header-search' }
        });
        document.dispatchEvent(unifiedEvent);
        
        // Also dispatch ticker change for compatibility
        const tickerEvent = new CustomEvent('tickerChange', {
            detail: { symbol: symbol }
        });
        document.dispatchEvent(tickerEvent);
        
        // Notify observers
        this.notifyObservers('stock:selected', { symbol });
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        if (window.ThemeManager && typeof window.ThemeManager.toggleTheme === 'function') {
            // Prefer central ThemeManager (ensures class + data-attr harmony)
            const before = document.documentElement.getAttribute('data-theme') || 'light';
            window.ThemeManager.toggleTheme();
            const after = document.documentElement.getAttribute('data-theme') || 'light';
            console.log(`🎨 Theme toggled via ThemeManager: ${before} → ${after}`);
            this.notifyObservers('theme:changed', { theme: after });
        } else {
            console.warn('⚠️ ThemeManager not available, falling back to local toggle');
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.notifyObservers('theme:changed', { theme: newTheme });
        }
    }

    /**
     * Go to home
     */
    goToHome() {
        // Reset to default stock
        this.selectStock('AAPL');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('🏠 Navigated to home');
    }

    /**
     * Update search placeholder
     */
    updateSearchPlaceholder(text) {
        if (this.searchInput) {
            this.searchInput.placeholder = text;
        }
    }

    /**
     * Get header state
     */
    getHeaderState() {
        return {
            isSearchActive: this.isSearchActive,
            currentTheme: document.documentElement.getAttribute('data-theme') || 'light',
            searchQuery: this.searchInput?.value || ''
        };
    }

    /**
     * Add observer for header events
     */
    addObserver(name, callback) {
        this.observers.set(name, callback);
    }

    /**
     * Remove observer
     */
    removeObserver(name) {
        this.observers.delete(name);
    }

    /**
     * Notify observers
     */
    notifyObservers(event, data) {
        this.observers.forEach((callback, name) => {
            try {
                callback(event, data);
            } catch (error) {
                console.error(`Header observer ${name} failed:`, error);
            }
        });
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        try {
            // Clear timeouts
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // Clear observers
            this.observers.clear();
            
            // Reset state
            this.isSearchActive = false;
            
            console.log('HeaderManager destroyed');
            
        } catch (error) {
            console.error('Error destroying HeaderManager:', error);
        }
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 HeaderManager ready for initialization');
    });
} else {
    console.log('📱 HeaderManager ready for initialization');
}

// Make HeaderManager globally available
window.HeaderManager = HeaderManager;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderManager;
}

// ES6 Export
// REMOVED EXPORT: export { HeaderManager };
// REMOVED EXPORT: export default HeaderManager;

console.log('✅ HeaderManager exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/header/header-manager.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/research/research-platform.js
 * SIZE: 25,746 bytes
 * ============================================================================ */

/**
 * AEVOREX Research Platform - Professional Equity Analysis
 * AI-Powered Research Platform with Real Backend Data
 * Integrated from stockanalysis for modular architecture
 * @version 6.1.0
 * @author AEVOREX Team
 */

class AevorexResearchPlatform {
    constructor(config = {}) {
        this.config = {
            API_BASE: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1' : 'http://localhost:8084/api/v1',
            WEBSOCKET_URL: config.WEBSOCKET_URL || 'ws://localhost:8001/ws',
            AUTO_REFRESH_INTERVAL: config.AUTO_REFRESH_INTERVAL || 30000, // 30 seconds
            CHART_UPDATE_INTERVAL: config.CHART_UPDATE_INTERVAL || 10000,  // 10 seconds
            DEBUG: config.DEBUG || false,
            ANIMATION_DURATION: config.ANIMATION_DURATION || 300,
            UPDATE_INTERVALS: {
                ticker: 15000,
                chat: 5000,
                bubbles: 10000
            },
            CACHE_TTL: 300000
        };

        this.state = {
            currentSymbol: null,
            currentData: null,
            isLoading: false,
            error: null,
            currentNewsIndex: 0,
            newsItems: [],
            marketData: [],
            isTyping: false,
            searchTimeout: null,
            userInteracted: false,
            chartWidget: null,
            intervals: {
                ticker: null,
                chart: null
            }
        };

        this.elements = {};
        this.eventBus = new EventTarget();
    }

    // === ENHANCED DEBOUNCE UTILITY ===
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // === INITIALIZATION ===
    async initialize() {
        try {
            console.log("🚀 Initializing Aevorex Research Platform v6.1.0");
            
            // DOM Elements
            this.cacheElements();
            
            // Event Listeners  
            this.setupEventListeners();
            
            // Initialize UI Components
            this.initializeChatInterface();
            
            // Start background services
            this.startBackgroundServices();
            
            // Hide loading screen
            setTimeout(() => this.hideLoadingScreen(), 2000);
            
            console.log("✅ Platform initialization complete");
            this.eventBus.dispatchEvent(new CustomEvent('platform:ready'));
            
        } catch (error) {
            console.error("❌ Platform initialization failed:", error);
            this.showError("Failed to initialize platform: " + error.message);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    startBackgroundServices() {
        // Start market ticker updates
        this.startMarketTicker();
        
        // Auto-update intervals
        this.state.intervals.ticker = setInterval(() => {
            this.loadMarketTickerData();
        }, this.config.UPDATE_INTERVALS.ticker);
    }

    cacheElements() {
        console.log("📦 Caching DOM elements...");
        
        const safeCache = (id, description) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ Element not found: ${id} (${description})`);
            }
            return element;
        };

        // Core elements
        this.elements = {
            // Search elements
            symbolSearch: safeCache('symbol-search', 'Header search'),
            heroSearch: safeCache('hero-search', 'Hero search'),
            analyzeBtn: safeCache('analyze-btn', 'Analyze button'),
            searchSuggestions: safeCache('search-suggestions', 'Search suggestions'),
            
            // State containers
            welcomeState: safeCache('welcome-state', 'Welcome state'),
            analysisDashboard: safeCache('analysis-dashboard', 'Analysis dashboard'),
            
            // Market ticker
            marketBanner: safeCache('market-banner', 'Market banner'),
            marketTickerContent: safeCache('market-ticker-content', 'Market ticker content'),
            
            // Company header
            companySymbolDisplay: safeCache('company-symbol-display', 'Company symbol'),
            companyNameDisplay: safeCache('company-name-display', 'Company name'),
            companyDescription: safeCache('company-description', 'Company description'),
            currentPriceValue: safeCache('current-price-value', 'Current price'),
            priceChangeValue: safeCache('price-change-value', 'Price change'),
            priceChangePercent: safeCache('price-change-percent', 'Price change percent'),
            
            // Market metrics
            volumeValue: safeCache('volume-value', 'Volume'),
            marketCapValue: safeCache('market-cap-value', 'Market cap'),
            peRatio: safeCache('pe-ratio', 'P/E ratio'),
            weekHigh: safeCache('week-high', '52W high'),
            
            // Chart elements
            priceChart: safeCache('price-chart', 'Price chart'),
            tradingviewChart: safeCache('tradingview_chart', 'TradingView chart'),
            chartLoading: safeCache('chart-loading', 'Chart loading'),
            chartPlaceholder: safeCache('chart-placeholder', 'Chart placeholder'),
            chartError: safeCache('chart-error', 'Chart error'),
            
            // Chat elements
            chatMessagesMain: safeCache('chat-messages-main', 'Chat messages'),
            chatInputMain: safeCache('chat-input-main', 'Chat input'),
            sendChatMain: safeCache('send-chat-main', 'Send chat button'),
            clearChatMain: safeCache('clear-chat-main', 'Clear chat button'),
            
            // Company overview
            companyOverviewContent: safeCache('company-overview-content', 'Company overview content')
        };
    }

    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");
        
        const safeAddListener = (element, event, handler, description) => {
            if (element) {
                element.addEventListener(event, handler);
                console.log(`✅ Event listener added: ${description}`);
            } else {
                console.warn(`⚠️ Cannot add listener: ${description} - element not found`);
            }
        };

        // Search functionality
        safeAddListener(this.elements.symbolSearch, 'input', 
            this.debounce(() => this.handleSymbolSearch(), 300), 'Symbol search input');
        
        safeAddListener(this.elements.heroSearch, 'input', 
            this.debounce(() => this.handleSymbolSearch(), 300), 'Hero search input');
        
        safeAddListener(this.elements.analyzeBtn, 'click', 
            () => this.handleSymbolSearch(), 'Analyze button click');

        // Chat functionality
        safeAddListener(this.elements.sendChatMain, 'click', 
            () => this.sendMainChatMessage(), 'Send chat button');
        
        safeAddListener(this.elements.chatInputMain, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMainChatMessage();
            }
        }, 'Chat input enter key');

        safeAddListener(this.elements.clearChatMain, 'click', 
            () => this.clearMainChat(), 'Clear chat button');

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case '/':
                        e.preventDefault();
                        this.focusChat();
                        break;
                }
            }
        });
    }

    // === MARKET TICKER FUNCTIONALITY ===
    async startMarketTicker() {
        console.log("📊 Starting market ticker...");
        await this.loadMarketTickerData();
    }

    async loadMarketTickerData() {
        try {
            const api = window.FinanceHubAPIService;
            if (!api || typeof api.getTickerTapeData !== 'function') {
                throw new Error('FinanceHubAPIService unavailable');
            }

            const data = await api.getTickerTapeData(30, false);
            if (Array.isArray(data) && data.length) {
                this.updateMarketTicker(data);
            } else {
                this.initializeFallbackTicker();
            }
        } catch (error) {
            console.warn("⚠️ Market ticker data failed, using fallback:", error);
            this.initializeFallbackTicker();
        }
    }

    initializeFallbackTicker() {
        console.warn("⚠️ Market ticker API failed - showing empty state instead of fallback data");
        this.showEmptyMarketTicker();
    }

    showEmptyMarketTicker() {
        if (!this.elements.marketTickerContent) return;
        
        this.elements.marketTickerContent.innerHTML = `
            <div class="ticker-empty-state">
                <div class="ticker-empty-icon">📡</div>
                <div class="ticker-empty-text">Market data unavailable</div>
                <button class="ticker-retry-btn" onclick="this.loadMarketTickerData()">
                    Retry
                </button>
            </div>
        `;
    }

    updateMarketTicker(data) {
        if (!this.elements.marketTickerContent) return;
        
        const tickerHTML = data.map(item => `
            <div class="ticker-item" data-symbol="${item.symbol}">
                <span class="ticker-symbol">${item.symbol}</span>
                <span class="ticker-price">$${item.price.toFixed(2)}</span>
                <span class="ticker-change ${item.change >= 0 ? 'positive' : 'negative'}">
                    ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} 
                    (${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%)
                </span>
            </div>
        `).join('');
        
        this.elements.marketTickerContent.innerHTML = tickerHTML;
        this.startTickerAnimation();
        
        // Add click handlers for ticker items
        this.elements.marketTickerContent.querySelectorAll('.ticker-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                this.startAnalysis(symbol);
            });
        });
    }

    startTickerAnimation() {
        if (!this.elements.marketTickerContent) return;
        
        const content = this.elements.marketTickerContent;
        content.style.animation = 'none';
        content.offsetHeight; // Trigger reflow
        content.style.animation = 'scroll-ticker 60s linear infinite';
    }

    // === CHAT INTERFACE ===
    initializeChatInterface() {
        console.log("💬 Initializing chat interface...");
        this.setupMainChatEventListeners();
        this.initializeMainChatWelcome();
    }

    setupMainChatEventListeners() {
        // Auto-resize textarea
        if (this.elements.chatInputMain) {
            this.elements.chatInputMain.addEventListener('input', () => {
                this.autoResizeMainTextarea();
                this.updateMainChatSendButton();
            });
        }
    }

    initializeMainChatWelcome() {
        if (!this.elements.chatMessagesMain) return;
        
        const welcomeMessage = `
            <div class="chat-message assistant" data-message-id="welcome">
                <div class="chat-message-avatar">
                    <div class="ai-icon">🤖</div>
                </div>
                <div class="chat-message-content">
                    <p>Üdvözöllek az AEVOREX AI Elemzőben! 👋</p>
                    <p>Kérdezz bármit a részvényekről, piacokról vagy befektetésekről. Segítek elemezni a pénzügyi adatokat és trendeket.</p>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.innerHTML = welcomeMessage;
    }

    async sendMainChatMessage() {
        const input = this.elements.chatInputMain;
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';
        this.updateMainChatSendButton();
        this.autoResizeMainTextarea();

        // Add user message
        this.addMainChatMessage('user', message);

        // Add typing indicator
        const typingId = this.addMainChatTypingIndicator();

        try {
            // Send to backend with streaming
            const currentTicker = this.state.currentSymbol || (this.elements && this.elements.companySymbolDisplay ? this.elements.companySymbolDisplay.textContent.trim() : '');
            const response = await this.sendChatMessageToBackend(message);
            
            // Remove typing indicator
            this.removeMainChatTypingIndicator(typingId);
            
            // Add AI response with streaming effect
            this.addMainChatMessage('assistant', response, true);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.removeMainChatTypingIndicator(typingId);
            this.addMainChatMessage('assistant', 'Sajnálom, hiba történt. Kérlek próbáld újra később.');
        }
    }

    addMainChatMessage(role, content, useStreaming = false) {
        if (!this.elements.chatMessagesMain) return;

        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const avatarIcon = role === 'user' ? '👤' : '🤖';
        
        const messageHTML = `
            <div class="chat-message ${role}" data-message-id="${messageId}">
                <div class="chat-message-avatar">
                    <div class="ai-icon">${avatarIcon}</div>
                </div>
                <div class="chat-message-content">
                    <div class="message-text" id="content-${messageId}">
                        ${useStreaming ? '' : this.formatMainChatContent(content)}
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.insertAdjacentHTML('beforeend', messageHTML);
        
        if (useStreaming) {
            this.simulateTyping(messageId, content);
        }
        
        this.scrollMainChatToBottom();
    }

    async simulateTyping(messageId, finalContent) {
        const contentElement = document.getElementById(`content-${messageId}`);
        if (!contentElement) return;

        const words = finalContent.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            contentElement.innerHTML = this.formatMainChatContent(currentText) + 
                '<span class="typing-cursor">|</span>';
            
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
        
        // Remove cursor and finalize
        contentElement.innerHTML = this.formatMainChatContent(finalContent);
    }

    formatMainChatContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    addMainChatTypingIndicator() {
        const typingId = `typing-${Date.now()}`;
        const typingHTML = `
            <div class="chat-message assistant typing-indicator" data-typing-id="${typingId}">
                <div class="chat-message-avatar">
                    <div class="ai-icon">🤖</div>
                </div>
                <div class="chat-message-content">
                    <div class="typing-animation">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.insertAdjacentHTML('beforeend', typingHTML);
        this.scrollMainChatToBottom();
        
        return typingId;
    }

    removeMainChatTypingIndicator(typingId) {
        const typingElement = document.querySelector(`[data-typing-id="${typingId}"]`);
        if (typingElement) {
            typingElement.remove();
        }
    }

    scrollMainChatToBottom() {
        if (this.elements.chatMessagesMain) {
            this.elements.chatMessagesMain.scrollTop = this.elements.chatMessagesMain.scrollHeight;
        }
    }

    updateMainChatSendButton() {
        if (!this.elements.sendChatMain || !this.elements.chatInputMain) return;
        
        const hasContent = this.elements.chatInputMain.value.trim().length > 0;
        this.elements.sendChatMain.disabled = !hasContent;
        this.elements.sendChatMain.classList.toggle('enabled', hasContent);
    }

    autoResizeMainTextarea() {
        const textarea = this.elements.chatInputMain;
        if (!textarea) return;
        
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    clearMainChat() {
        if (this.elements.chatMessagesMain) {
            this.elements.chatMessagesMain.innerHTML = '';
            this.initializeMainChatWelcome();
        }
    }

    async sendChatMessageToBackend(message) {
        const currentTicker = this.state.currentSymbol || (this.elements && this.elements.companySymbolDisplay ? this.elements.companySymbolDisplay.textContent.trim() : '');
        const response = await fetch(`${this.config.API_BASE}/stock/chat/${currentTicker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                symbol: this.state.currentSymbol,
                context: 'financial_analysis'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response || 'Sajnálom, nem tudok válaszolni erre a kérdésre.';
    }

    // === SYMBOL SEARCH & ANALYSIS ===
    async handleSymbolSearch() {
        const searchInput = this.elements.symbolSearch || this.elements.heroSearch;
        if (!searchInput) return;

        const query = searchInput.value.trim().toUpperCase();
        if (!query) return;

        await this.startAnalysis(query);
    }

    async startAnalysis(symbol) {
        console.log(`🔍 Starting analysis for ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.isLoading = true;
        
        // Show analysis view
        this.showAnalysisView();
        
        try {
            // Load data in parallel
            const [companyData, priceData, newsData] = await Promise.allSettled([
                this.loadCompanyData(symbol),
                this.loadPriceData(symbol),
                this.loadNewsData(symbol)
            ]);

            // Update UI with loaded data
            if (companyData.status === 'fulfilled') {
                this.updateCompanyHeader(companyData.value);
            }
            
            if (priceData.status === 'fulfilled') {
                this.updatePriceData(priceData.value);
            }
            
            if (newsData.status === 'fulfilled') {
                this.renderNews(newsData.value);
            }

            // Load AI analysis
            await this.loadAIAnalysis(symbol);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showAnalysisError(error);
        } finally {
            this.state.isLoading = false;
        }
    }

    showAnalysisView() {
        if (this.elements.welcomeState) {
            this.elements.welcomeState.style.display = 'none';
        }
        if (this.elements.analysisDashboard) {
            this.elements.analysisDashboard.style.display = 'block';
        }
    }

    async loadCompanyData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}`);
        if (!response.ok) throw new Error(`Failed to load company data: ${response.status}`);
        return await response.json();
    }

    async loadPriceData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}/price`);
        if (!response.ok) throw new Error(`Failed to load price data: ${response.status}`);
        return await response.json();
    }

    async loadNewsData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}/news`);
        if (!response.ok) throw new Error(`Failed to load news data: ${response.status}`);
        return await response.json();
    }

    async loadAIAnalysis(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/chat/${symbol}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: "Give me a comprehensive analysis of this stock",
                history: []
            })
        });
        if (!response.ok) throw new Error(`Failed to load AI analysis: ${response.status}`);
        const data = await response.json();
        this.renderAIAnalysis(data);
    }

    // === UI UPDATE METHODS ===
    updateCompanyHeader(data) {
        if (this.elements.companySymbolDisplay) {
            this.elements.companySymbolDisplay.textContent = data.symbol || '';
        }
        if (this.elements.companyNameDisplay) {
            this.elements.companyNameDisplay.textContent = data.name || '';
        }
        if (this.elements.companyDescription) {
            this.elements.companyDescription.textContent = data.description || '';
        }
    }

    updatePriceData(data) {
        if (this.elements.currentPriceValue) {
            this.elements.currentPriceValue.textContent = `$${data.price?.toFixed(2) || '0.00'}`;
        }
        if (this.elements.priceChangeValue) {
            const change = data.change || 0;
            this.elements.priceChangeValue.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)}`;
            this.elements.priceChangeValue.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
        if (this.elements.priceChangePercent) {
            const changePercent = data.changePercent || 0;
            this.elements.priceChangePercent.textContent = `(${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
        }
    }

    renderNews(newsItems) {
        // Implementation for news rendering
        console.log('📰 Rendering news:', newsItems);
    }

    renderAIAnalysis(data) {
        // Implementation for AI analysis rendering
        console.log('🤖 Rendering AI analysis:', data);
    }

    showAnalysisError(error) {
        console.error('Analysis error:', error);
        this.showError('Failed to load analysis data. Please try again.');
    }

    // === UTILITY METHODS ===
    focusSearch() {
        const searchInput = this.elements.symbolSearch || this.elements.heroSearch;
        if (searchInput) {
            searchInput.focus();
        }
    }

    focusChat() {
        if (this.elements.chatInputMain) {
            this.elements.chatInputMain.focus();
        }
    }

    showError(message) {
        // Create or update error notification
        console.error('Error:', message);
        
        // You can implement a toast notification system here
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // === PUBLIC API ===
    getState() {
        return { ...this.state };
    }

    getCurrentSymbol() {
        return this.state.currentSymbol;
    }

    addEventListener(event, callback) {
        this.eventBus.addEventListener(event, callback);
    }

    removeEventListener(event, callback) {
        this.eventBus.removeEventListener(event, callback);
    }

    destroy() {
        // Clear intervals
        Object.values(this.state.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        
        // Remove event listeners
        // Implementation depends on how you track them
        
        console.log('🧹 Research platform destroyed');
    }
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AevorexResearchPlatform;
}

// Global availability
window.AevorexResearchPlatform = AevorexResearchPlatform;

// ES6 export for modern modules (Added for structural consistency)
// REMOVED EXPORT: export { AevorexResearchPlatform };
// REMOVED EXPORT: export default AevorexResearchPlatform;

console.log('✅ AevorexResearchPlatform exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/research/research-platform.js
 * ============================================================================ */


/* ============================================================================
 * FILE: components/footer/footer.js
 * SIZE: 12,491 bytes
 * ============================================================================ */

/**
 * ===================================================================
 * FOOTER COMPONENT
 * Premium Footer with Dynamic Content and Interactions
 * ===================================================================
 */

class FooterManager {
    constructor() {
        this.footerElement = null;
        this.currentYear = new Date().getFullYear();
        this.isInitialized = false;
        this.observers = new Map();
        
        this.init();
    }

    /**
     * Initialize footer component
     */
    init() {
        try {
            this.footerElement = document.querySelector('.app-footer');
            
            // Retry logic: footer may not yet be in DOM when script executes (e.g., loaded dynamically)
            if (!this.footerElement) {
                // Only log once at debug level
                console.warn('Footer element not found – will retry after DOMContentLoaded');

                // If DOM still loading, wait for DOMContentLoaded then retry
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.init(), { once: true });
                } else {
                    // Fallback: small timeout to allow dynamic insertion
                    setTimeout(() => this.init(), 300);
                }
                return;
            }

            this.setupFooterContent();
            this.bindEvents();
            this.initializeAnimations();
            this.updateCopyright();
            
            this.isInitialized = true;
            console.log('✅ Footer Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Footer Manager initialization failed:', error);
        }
    }

    /**
     * Setup dynamic footer content
     */
    setupFooterContent() {
        const footerData = {
            platform: {
                title: 'Platform',
                links: [
                    { text: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
                    { text: 'Portfolio', href: '/portfolio', icon: 'portfolio' },
                    { text: 'Watchlist', href: '/watchlist', icon: 'watchlist' }
                ]
            },
            tools: {
                title: 'Tools',
                links: [
                    { text: 'Stock Screener', href: '/screener', icon: 'filter' },
                    { text: 'Market Scanner', href: '/scanner', icon: 'scan' },
                    { text: 'Risk Calculator', href: '/risk', icon: 'calculator' },
                    { text: 'API Access', href: '/api', icon: 'api' }
                ]
            },
            company: {
                title: 'Company',
                links: [
                    { text: 'About Us', href: '/about', icon: 'info' },
                    { text: 'Careers', href: '/careers', icon: 'work' },
                    { text: 'Press', href: '/press', icon: 'news' },
                    { text: 'Contact', href: '/contact', icon: 'contact' }
                ]
            },
            legal: {
                title: 'Legal',
                links: [
                    { text: 'Privacy Policy', href: '/privacy', icon: 'privacy' },
                    { text: 'Terms of Service', href: '/terms', icon: 'terms' },
                    { text: 'Cookie Policy', href: '/cookies', icon: 'cookie' },
                    { text: 'Disclaimer', href: '/disclaimer', icon: 'warning' }
                ]
            }
        };

        this.renderFooterSections(footerData);
    }

    /**
     * Render footer sections dynamically
     */
    renderFooterSections(data) {
        const footerGrid = this.footerElement.querySelector('.footer-grid');
        
        if (!footerGrid) return;

        footerGrid.innerHTML = '';

        Object.entries(data).forEach(([key, section]) => {
            const sectionElement = this.createFooterSection(section);
            footerGrid.appendChild(sectionElement);
        });
    }

    /**
     * Create individual footer section
     */
    createFooterSection(section) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'footer-section';

        const title = document.createElement('h4');
        title.className = 'footer-section-title';
        title.textContent = section.title;

        const linksList = document.createElement('ul');
        linksList.className = 'footer-links';

        section.links.forEach(link => {
            const listItem = document.createElement('li');
            const anchor = document.createElement('a');
            
            anchor.href = link.href;
            anchor.className = 'footer-link';
            anchor.textContent = link.text;
            
            // Add icon if specified
            if (link.icon) {
                const icon = document.createElement('span');
                icon.className = `footer-link-icon icon-${link.icon}`;
                anchor.prepend(icon);
            }

            listItem.appendChild(anchor);
            linksList.appendChild(listItem);
        });

        sectionDiv.appendChild(title);
        sectionDiv.appendChild(linksList);

        return sectionDiv;
    }

    /**
     * Bind footer events
     */
    bindEvents() {
        // Link hover effects
        this.footerElement.addEventListener('mouseenter', this.handleLinkHover.bind(this), true);
        this.footerElement.addEventListener('mouseleave', this.handleLinkLeave.bind(this), true);
        
        // Newsletter subscription
        const newsletterForm = this.footerElement.querySelector('.newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSubmit.bind(this));
        }

        // Social media links
        const socialLinks = this.footerElement.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', this.handleSocialClick.bind(this));
        });

        // Back to top button
        const backToTopBtn = this.footerElement.querySelector('.back-to-top');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', this.scrollToTop.bind(this));
        }
    }

    /**
     * Handle link hover effects
     */
    handleLinkHover(event) {
        if (event.target.classList.contains('footer-link')) {
            event.target.style.transform = 'translateX(4px)';
            event.target.style.color = 'var(--premium-gold-accent)';
        }
    }

    /**
     * Handle link leave effects
     */
    handleLinkLeave(event) {
        if (event.target.classList.contains('footer-link')) {
            event.target.style.transform = 'translateX(0)';
            event.target.style.color = '';
        }
    }

    /**
     * Handle newsletter subscription
     */
    async handleNewsletterSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const emailInput = form.querySelector('input[type="email"]');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (!emailInput || !emailInput.value) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Subscribing...';
        submitBtn.disabled = true;

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showNotification('Successfully subscribed to newsletter!', 'success');
            emailInput.value = '';
            
        } catch (error) {
            this.showNotification('Subscription failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Handle social media link clicks
     */
    handleSocialClick(event) {
        const platform = event.currentTarget.dataset.platform;
        
        // Track social media engagement
        if (window.analytics) {
            window.analytics.track('social_link_clicked', {
                platform: platform,
                location: 'footer'
            });
        }
        
        console.log(`Social link clicked: ${platform}`);
    }

    /**
     * Smooth scroll to top
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Track back to top usage
        if (window.analytics) {
            window.analytics.track('back_to_top_clicked', {
                location: 'footer'
            });
        }
    }

    /**
     * Initialize footer animations
     */
    initializeAnimations() {
        // Intersection Observer for footer reveal
        const footerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('footer-visible');
                    this.animateFooterSections();
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        footerObserver.observe(this.footerElement);
        this.observers.set('footer', footerObserver);
    }

    /**
     * Animate footer sections on reveal
     */
    animateFooterSections() {
        const sections = this.footerElement.querySelectorAll('.footer-section');
        
        sections.forEach((section, index) => {
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Update copyright year
     */
    updateCopyright() {
        const copyrightElement = this.footerElement.querySelector('.copyright-year');
        if (copyrightElement) {
            copyrightElement.textContent = this.currentYear;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get footer statistics
     */
    getFooterStats() {
        return {
            isInitialized: this.isInitialized,
            sectionsCount: this.footerElement?.querySelectorAll('.footer-section').length || 0,
            linksCount: this.footerElement?.querySelectorAll('.footer-link').length || 0,
            observersActive: this.observers.size
        };
    }

    /**
     * Cleanup footer component
     */
    destroy() {
        // Remove event listeners
        if (this.footerElement) {
            this.footerElement.removeEventListener('mouseenter', this.handleLinkHover);
            this.footerElement.removeEventListener('mouseleave', this.handleLinkLeave);
        }

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        this.isInitialized = false;
        console.log('Footer Manager destroyed');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.FooterManager = new FooterManager();
    });
} else {
    window.FooterManager = new FooterManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FooterManager;
}

// ES6 export for modern modules (Added for structural consistency)
// REMOVED EXPORT: export { FooterManager };
// REMOVED EXPORT: export default FooterManager;

console.log('✅ FooterManager exported successfully (CommonJS + ES6 + Global)'); 

/* ============================================================================
 * END OF FILE: components/footer/footer.js
 * ============================================================================ */


/* ============================================================================
 * FILE: app/app-class.js
 * SIZE: 41,372 bytes
 * ============================================================================ */

/**
 * FinanceHub Application Class
 * 
 * Main orchestrator for the FinanceHub module
 * Handles initialization, component management, and state coordination
 */

class FinanceHubApp {
    constructor() {
        console.log('🚀 Initializing FinanceHub Application...');
        
        // Version information
        this.VERSION = '3.1.0';
        
        // Configuration object
        this.config = {
            debug: true,
            theme: 'dark',
            defaultSymbol: 'AAPL',
            apiBaseUrl: '/api/v1',
            chartHeight: 600,
            enableAnimations: true,
            autoRefresh: true,
            refreshInterval: 30000
        };

        // Initialize managers and services - will be set in initializeCoreServices
        this.stateManager = null;
        this.uiManager = null;
        this.apiService = null;

        // Component registry (Map for flexible get/set)
        this.components = new Map();

        // Define loading order - critical components first
        this.componentLoadOrder = [
            'ticker-tape',
            'analysis-bubbles', 
            'chart-widget',
            'chat-interface',
            'theme-manager'
        ];

        // Error tracking
        this.errors = [];
        this.maxErrors = 20;

        // Performance tracking
        this.performance = {
            startTime: performance.now(),
            componentTimes: new Map(),
            failedComponents: new Set()
        };

        // Auto-refresh settings
        this.autoRefreshEnabled = this.config.autoRefresh;
        this.refreshIntervals = { ticker: this.config.refreshInterval || 30000 };

        // AI Summary trigger config
        this.autoAISummary = {
            enabled: true,
            triggerSources: ['ticker-click', 'search', 'keyboard-shortcut', 'header-search', 'url'],
            delay: 1200 // ms
        };

        // Bind methods
        this.loadChartWidget = this.loadChartWidget.bind(this);
        this.loadChatInterface = this.loadChatInterface.bind(this);
        this.loadAnalysisBubbles = this.loadAnalysisBubbles.bind(this);

        console.log('✅ FinanceHubApp initialized with config:', this.config);
    }
    
    /**
     * Initialize the application asynchronously
     */
    async initializeApp() {
        try {
            console.log('⏳ Starting application initialization...');
            await this.init();
        } catch (error) {
            console.error('❌ Failed to initialize FinanceHub:', error);
            this.handleError(error, 'app_initialization');
            this.showErrorState(error);
        }
    }
    
    /**
     * Initialize the application with proper dependency loading
     */
    async init() {
        try {
            console.log('🚀 [INIT] Step 1: Starting initialization...');
            
            // Initialize core services first
            await this.initializeCoreServices();
            console.log('✅ [INIT] Step 2: Core services initialized');
            
            // Setup error handling
            this.setupErrorHandling();
            console.log('✅ [INIT] Step 3: Error handling setup complete');
            
            // Setup state subscriptions
            this.setupStateSubscriptions();
            console.log('✅ [INIT] Step 4: State subscriptions setup complete');
            
            // Load and initialize components
            console.log('🔄 [INIT] Step 5: Starting loadComponents()...');
            await this.loadComponents();
            console.log('✅ [INIT] Step 6: loadComponents() completed successfully');
            
            // Setup event listeners
            this.setupEventListeners();
            console.log('✅ [INIT] Step 7: Event listeners setup complete');
            
            // Initialize default state
            this.initializeDefaultState();
            console.log('✅ [INIT] Step 8: Default state initialized');
            
            // Show the application after all components are loaded
            console.log('🎯 [INIT] Step 9: Showing application...');
            this.showApplication();
            console.log('✅ [INIT] Step 9: Application visible, loading screen hidden');
            
            // Complete initialization
            const initTime = performance.now() - this.performance.startTime;
            
            this.stateManager.dispatch({
                type: 'APP_INIT_COMPLETE',
                payload: { 
                    initTime,
                    version: this.VERSION,
                    components: Array.from(this.components.keys())
                }
            });
            console.log('✅ [INIT] Step 10: APP_INIT_COMPLETE dispatched');
            
            console.log(`✅ FinanceHub v${this.VERSION} initialized in ${initTime.toFixed(2)}ms`);
            
            // Show skeleton loaders for data sections
            console.log('🎯 [INIT] Step 11: Showing bubble skeletons...');
            this.showBubbleSkeletons();
            console.log('✅ [INIT] Step 11: Bubble skeletons shown');
            
            // Load data in background
            console.log('🎯 [INIT] Step 12: Starting background data loading...');
            this.loadDataInBackground();
            console.log('✅ [INIT] Step 12: Background data loading started');
            
        } catch (error) {
            console.error('❌ [INIT] CRITICAL ERROR during initialization:', error);
            console.error('❌ [INIT] Error stack:', error.stack);
            this.handleError(error, 'initialization');
            this.showErrorState(error);
        }
    }
    
    /**
     * Load data in background after UI is shown
     */
    async loadDataInBackground() {
        try {
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Load default stock data in background
            await this.loadDefaultStock();
            
        } catch (error) {
            console.error('❌ Background data loading failed:', error);
            this.handleError(error, 'background_loading');
        }
    }
    
    /**
     * Initialize core services (State Manager, API Service)
     */
    async initializeCoreServices() {
        try {
            // Use global State Manager instance
            if (window.FinanceHubState) {
                this.stateManager = window.FinanceHubState;
                console.log('✅ State Manager initialized');
            } else {
                throw new Error('FinanceHubStateManager not available');
            }

            // Initialize API Service
            if (window.FinanceHubAPI) {
                this.apiService = window.FinanceHubAPI;
                console.log('✅ API Service initialized');
            } else {
                throw new Error('FinanceHubAPI not available');
            }

        } catch (error) {
            console.error('❌ Error initializing core services:', error);
            throw error;
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(new Error(`Global Error: ${message}`), 'window_error', {
                source, lineno, colno, error
            });
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled_promise_rejection');
            event.preventDefault();
        });
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        this.stateManager.subscribe('stock', (data) => {
            console.log('📊 Stock data updated:', data.symbol);
            this.updateComponentsWithStockData(data.symbol, data);
        });

        this.stateManager.subscribe('ui', (data) => {
            console.log('🎨 UI state updated:', data.action);
        });
    }

    /**
     * Load all components in the correct order
     */
    async loadComponents() {
        for (const componentName of this.componentLoadOrder) {
            try {
                const startTime = performance.now();
                console.log(`🔄 Loading component: ${componentName}...`);
                
                switch (componentName) {
                    case 'ticker-tape':
                        await this.loadTickerTape();
                        break;
                    case 'analysis-bubbles':
                        await this.loadAnalysisBubbles();
                        break;
                    case 'chart-widget':
                        await this.loadChartWidget();
                        break;
                    case 'chat-interface':
                        await this.loadChatInterface();
                        break;
                    case 'theme-manager':
                        await this.loadThemeManager();
                        break;
                    default:
                        console.warn(`❌ Unknown component: ${componentName}`);
                }
                
                const loadTime = performance.now() - startTime;
                this.performance.componentTimes.set(componentName, loadTime);
                console.log(`✅ Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
                
            } catch (error) {
                console.error(`❌ Failed to load component ${componentName}:`, error);
                this.performance.failedComponents.add(componentName);
                this.handleError(error, `component_load_${componentName}`);
            }
        }
    }

    /**
     * Load chart widget component
     */
    async loadChartWidget() {
        return new Promise((resolve) => {
            if (window.UnifiedChartManager) {
                console.log('✅ Chart widget loaded successfully');
                this.components.set('chart', window.UnifiedChartManager);
                resolve();
            } else {
                console.warn('⚠️ Chart widget not available');
                this.showChartFallback('Chart widget not available');
                resolve();
            }
        });
    }

    /**
     * Wait for a script condition to be met
     */
    waitForScript(condition, timeout = 20000) {
        return new Promise((resolve) => {
            const checkCondition = () => {
                if (condition()) {
                    resolve();
                } else if (timeout > 0) {
                    timeout -= 100;
                    setTimeout(checkCondition, 100);
                } else {
                    console.warn('⚠️ Script condition timeout');
                    resolve();
                }
            };
            checkCondition();
        });
    }

    /**
     * Show chart fallback message
     */
    showChartFallback(message) {
        const chartContainer = document.getElementById('chart-widget');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="fallback-message">
                    <div class="fallback-icon">📈</div>
                    <div class="fallback-text">${message}</div>
                    <button class="fallback-retry" onclick="window.financeHubApp?.loadChartWidget()">
                        Retry Loading Chart
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load analysis bubbles component
     */
    async loadAnalysisBubbles() {
        return new Promise(async (resolve) => {
            if (window.AnalysisBubblesManager) {
                try {
                    // ✅ FIX: Ténylegesen példányosítjuk a komponenst
                    const bubbleManager = new window.AnalysisBubblesManager({
                        container: 'fh-analysis-bubbles',
                        symbol: this.config.defaultSymbol,
                        apiClient: this.apiService, // Átadjuk az API klienst
                        debug: this.config.debug
                    });
                    
                    // Inicializáljuk a komponenst
                    await bubbleManager.init();
                    
                    console.log('✅ Analysis bubbles loaded and initialized successfully');
                    this.components.set('analysis-bubbles', bubbleManager);
                    resolve();
                } catch (error) {
                    console.error('❌ Failed to initialize Analysis Bubbles:', error);
                    console.warn('⚠️ Analysis bubbles initialization failed');
                    resolve();
                }
            } else {
                console.warn('⚠️ Analysis bubbles not available');
                resolve();
            }
        });
    }

    /**
     * Load ticker tape component
     */
    async loadTickerTape() {
        return new Promise((resolve) => {
            if (window.TickerTapeUnified) {
                console.log('✅ Ticker tape loaded successfully');
                this.components.set('ticker-tape', window.TickerTapeUnified);
                resolve();
            } else {
                console.warn('⚠️ Ticker tape not available');
                this.showTickerTapeFallback('Ticker tape not available');
                resolve();
            }
        });
    }

    /**
     * Show ticker tape fallback
     */
    showTickerTapeFallback(message) {
        const tickerContainer = document.getElementById('ticker-tape');
        if (tickerContainer) {
            tickerContainer.innerHTML = `
                <div class="ticker-fallback">
                    <span class="ticker-fallback-text">${message}</span>
                </div>
            `;
        }
    }

    /**
     * Load chat interface component
     */
    async loadChatInterface() {
        return new Promise(async (resolve) => {
            // ✅ SINGLETON GUARD — respect ComponentLoader single-instance registry
            if (window.ComponentLoader && window.ComponentLoader.isComponentLoaded && window.ComponentLoader.isComponentLoaded('chat-interface')) {
                console.log('ℹ️ FinanceHubApp: Chat already loaded by ComponentLoader → linking reference');
                this.__chatInstance = window.ComponentLoader.getComponent('chat-interface');
                this.components.set('chat-interface', this.__chatInstance);
                if (!window.chatInterface) {
                    window.chatInterface = this.__chatInstance;
                }
                return resolve();
            }

            if (window.FinanceHubChat) {
                try {
                    // Instantiate chat component only once
                    if (!this.__chatInstance) {
                        this.__chatInstance = new window.FinanceHubChat({
                            containerId: 'fh-chat',
                            symbol: this.config.defaultSymbol || 'AAPL'
                        });
                        
                        // Ensure proper initialization
                        if (!this.__chatInstance.isInitialized && typeof this.__chatInstance.init === 'function') {
                            await this.__chatInstance.init();
                        }
                    }
                    
                    // Store instance, not class reference
                    this.components.set('chat-interface', this.__chatInstance);
                    
                    // Enable global access for triggerAISummary compatibility
                    if (!window.chatInterface) {
                        window.chatInterface = this.__chatInstance;
                    }
                    
                    console.log('✅ Chat interface instantiated and initialized successfully');
                } catch (err) {
                    console.error('❌ Failed to instantiate FinanceHubChat', err);
                    this.createFallbackChatInterface('Chat interface failed to initialize');
                }
                resolve();
            } else {
                console.warn('⚠️ Chat interface class not found');
                this.createFallbackChatInterface('Chat interface not available');
                resolve();
            }
        });
    }

    /**
     * Create fallback chat interface
     */
    createFallbackChatInterface(errorMessage = 'AI chat unavailable') {
        console.warn('⚠️ FinanceHubApp: Chat fallback invoked – inline notice only');
        const chatContainer = document.getElementById('fh-chat');
        if (!chatContainer) return;

        const noticeId = 'fh-chat-fallback-notice';
        if (document.getElementById(noticeId)) return;

        const notice = document.createElement('div');
        notice.id = noticeId;
        notice.className = 'fh-chat__error-banner';
        notice.innerHTML = `
            <div class="fh-chat__error-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
                    <path d="M12 11V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="12" cy="8" r="1" fill="currentColor" />
                </svg>
            </div>
            <span class="fh-chat__error-text">${errorMessage}</span>
        `;
        chatContainer.prepend(notice);
    }

    /**
     * Load theme manager
     */
    async loadThemeManager() {
        return new Promise((resolve) => {
            if (window.ThemeManager) {
                console.log('✅ Theme manager loaded successfully');
                this.components.set('theme', window.ThemeManager);
                resolve();
            } else {
                console.warn('⚠️ Theme manager not available, using default theme');
                resolve();
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global symbol change event
        document.addEventListener('stockSymbolChange', (event) => {
            this.handleGlobalSymbolChange(event.detail);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Before unload
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });
    }

    /**
     * Initialize default state
     */
    initializeDefaultState() {
        this.stateManager.dispatch({
            type: 'SET_CURRENT_SYMBOL',
            payload: { symbol: this.config.defaultSymbol }
        });

        this.stateManager.dispatch({
            type: 'SET_UI_STATE',
            payload: { 
                theme: this.config.theme,
                loading: false,
                initialized: true
            }
        });
    }

    /**
     * Load default stock data
     */
    async loadDefaultStock() {
        try {
            await this.loadStockData(this.config.defaultSymbol);
        } catch (error) {
            console.error('❌ Failed to load default stock data:', error);
            this.handleError(error, 'default_stock_load');
        }
    }

    /**
     * Load stock data for a specific symbol
     */
    async loadStockData(symbol) {
        try {
            console.log(`📊 Loading stock data for: ${symbol}`);
            this.updateLoadingState(true);
            
            const stockData = await this.apiService.getFundamentals(symbol);
            
            // ✅ FIX: Check if we have actual data instead of looking for success field
            if (stockData && (stockData.stock_data || stockData.metadata)) {
                this.processAPIResponse(stockData, symbol);
            } else {
                // If we don't have expected data structure, throw error
                throw new Error(`API returned incomplete data: ${stockData?.message || 'No valid data received'}`);
            }
            
        } catch (error) {
            console.error(`❌ Error loading stock data for ${symbol}:`, error);
            this.handleError(error, 'stock_data_load', { symbol });
            this.showPlaceholderData(symbol);
        } finally {
            this.updateLoadingState(false);
        }
    }

    /**
     * Process API response and update state
     */
    processAPIResponse(stockData, symbol) {
        console.log(`📊 Processing API response for ${symbol}:`, stockData);
        
        // Handle the modular API response structure from new endpoints
        let processedData = stockData;
        
        // Ha közvetlenül a backend struktúrát kapjuk (nem a comprehensive wrapper)
        if (stockData && stockData.price_data && !stockData.stock_data) {
            processedData = {
                symbol: symbol,
                price_data: stockData.price_data,
                fundamentals_data: stockData.fundamentals_data,
                news_data: stockData.news_data || [],
                // Add compatibility fields for the components
                company_name: stockData.price_data.company_name,
                name: stockData.price_data.company_name
            };
            
            console.log(`✅ Processed backend direct response for ${symbol}`);
        }
        // If we have the comprehensive structure, extract the stock_data
        else if (stockData && stockData.stock_data && stockData.stock_data.price_data) {
            processedData = {
                symbol: symbol,
                price_data: stockData.stock_data.price_data,
                fundamentals_data: stockData.fundamentals_data,
                news_data: stockData.news_data,
                // Add compatibility fields for the components
                company_name: stockData.stock_data.price_data.company_name,
                name: stockData.stock_data.price_data.company_name
            };
            
            console.log(`✅ Processed comprehensive data structure for ${symbol}`);
        }
        
        // Update state with processed data
        this.stateManager.dispatch({
            type: 'SET_STOCK_DATA',
            payload: {
                symbol,
                data: processedData,
                timestamp: Date.now()
            }
        });

        // Update components with processed data
        this.updateComponentsWithStockData(symbol, processedData);

        // Hide any placeholder data
        this.hidePlaceholderData();
    }

    /**
     * Show placeholder data while loading - REMOVED (StockHeaderManager handles this)
     */
    showPlaceholderData(symbol) {
        // No-op: StockHeaderManager handles loading states
        console.log(`📊 Placeholder request for ${symbol} - delegated to StockHeaderManager`);
    }

    /**
     * Hide placeholder data
     */
    hidePlaceholderData() {
        const placeholderElements = document.querySelectorAll('.placeholder-data');
        placeholderElements.forEach(el => {
            el.classList.remove('placeholder-data');
        });
    }

    /**
     * Handle stock symbol change events
     */
    async onStockSymbolChange(symbol, source = 'unknown') {
        try {
            console.log(`🔄 Stock symbol changed to: ${symbol} (source: ${source})`);
            
            if (!this.validateSymbol(symbol)) {
                throw new Error(`Invalid symbol: ${symbol}`);
            }

            // Update current symbol in state
            this.stateManager.dispatch({
                type: 'SET_CURRENT_SYMBOL',
                payload: { symbol, source }
            });

            // Load new stock data
            await this.loadStockData(symbol);

            // Trigger AI summary if enabled
            if (this.autoAISummary.enabled && this.autoAISummary.triggerSources.includes(source)) {
                setTimeout(() => {
                    this.triggerAISummary({ symbol, auto: true, source });
                }, this.autoAISummary.delay);
            }

        } catch (error) {
            console.error(`❌ Error handling symbol change to ${symbol}:`, error);
            this.handleError(error, 'symbol_change', { symbol, source });
        }
    }

    /**
     * Validate stock symbol format
     */
    validateSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        if (symbol.length < 1 || symbol.length > 10) return false;
        if (!/^[A-Z0-9.-]+$/i.test(symbol)) return false;
        return true;
    }

    /**
     * Handle ticker click events
     */
    async handleTickerClick(symbol, clickData = {}) {
        console.log(`🎯 Ticker clicked: ${symbol}`, clickData);
        await this.onStockSymbolChange(symbol, 'ticker-click');
    }

    /**
     * Handle global symbol change events
     */
    handleGlobalSymbolChange(detail) {
        const { symbol, source } = detail;
        this.onStockSymbolChange(symbol, source || 'global-event');
    }

    /**
     * Trigger AI summary for current symbol
     */
    async triggerAISummary(options = {}) {
        try {
            const { symbol, auto = false, source = 'manual' } = options;
            const currentSymbol = symbol || this.stateManager.getState().stock?.symbol;
            
            if (!currentSymbol) {
                console.warn('⚠️ No symbol available for AI summary');
                return;
            }

            console.log(`🤖 Triggering AI summary for: ${currentSymbol} (auto: ${auto}, source: ${source})`);
            
            // Track the trigger
            this.trackAISummaryTrigger(currentSymbol, source, auto);
            
            // Get chat interface (try multiple approaches for robustness)
            let chatInterface = this.components.get('chat-interface');
            if (!chatInterface && this.__chatInstance) {
                chatInterface = this.__chatInstance;
            }
            if (!chatInterface && window.chatInterface) {
                chatInterface = window.chatInterface;
            }
            
            if (chatInterface && typeof chatInterface.triggerAutoSummary === 'function') {
                await chatInterface.triggerAutoSummary(currentSymbol);
                console.log(`✅ AI summary triggered successfully for ${currentSymbol}`);
            } else {
                console.warn('⚠️ Chat interface not available for AI summary', { 
                    hasComponent: !!this.components.get('chat-interface'),
                    hasInstance: !!this.__chatInstance,
                    hasGlobal: !!window.chatInterface,
                    interface: chatInterface
                });
            }

        } catch (error) {
            console.error('❌ Error triggering AI summary:', error);
            this.handleError(error, 'ai_summary_trigger', options);
        }
    }

    /**
     * Handle chat message events
     */
    handleChatMessage(detail) {
        console.log('💬 Chat message received:', detail);
        // Additional chat message processing can be added here
    }

    /**
     * Track AI summary trigger for metrics
     */
    trackAISummaryTrigger(symbol, source, auto) {
        const event = {
            type: 'ai_summary_trigger',
            symbol,
            source,
            auto,
            timestamp: Date.now()
        };

        // Store in performance tracking
        if (!this.performance.aiSummaryTriggers) {
            this.performance.aiSummaryTriggers = [];
        }
        this.performance.aiSummaryTriggers.push(event);

        // Keep only last 100 events
        if (this.performance.aiSummaryTriggers.length > 100) {
            this.performance.aiSummaryTriggers = this.performance.aiSummaryTriggers.slice(-100);
        }

        console.log('📈 AI Summary trigger tracked:', event);
    }

    /**
     * Apply theme to the application
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        this.stateManager.dispatch({
            type: 'SET_UI_STATE',
            payload: { theme }
        });

        // Update config
        this.config.theme = theme;
        
        console.log(`🎨 Theme applied: ${theme}`);
    }

    /**
     * Update loading state
     */
    updateLoadingState(isLoading) {
        this.stateManager.dispatch({
            type: 'SET_UI_STATE',
            payload: { loading: isLoading }
        });

        // Update UI loading indicators
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(el => {
            if (isLoading) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Cmd/Ctrl + K for search
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            this.focusSearch();
        }

        // Cmd/Ctrl + D for theme toggle
        if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
            event.preventDefault();
            this.toggleTheme();
        }

        // Escape to close modals
        if (event.key === 'Escape') {
            this.closeModals();
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            console.log('📱 Window resized, updating layout...');
            
            // Dispatch resize event
            this.stateManager.dispatch({
                type: 'WINDOW_RESIZE',
                payload: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
            
        }, 250);
    }

    /**
     * Handle visibility change (tab focus/blur)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('👁️ App hidden, pausing auto-refresh...');
            this.pauseAutoRefresh();
        } else {
            console.log('👁️ App visible, resuming auto-refresh...');
            this.resumeAutoRefresh();
        }
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload() {
        console.log('👋 App unloading, cleaning up...');
        this.pauseAutoRefresh();
    }

    /**
     * Focus search input
     */
    focusSearch() {
        const searchInput = document.querySelector('.search-input, [data-search="true"], input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = this.config.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Close any open modals
     */
    closeModals() {
        const modals = document.querySelectorAll('.modal.active, .overlay.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * Start auto-refresh functionality
     */
    startAutoRefresh() {
        if (!this.autoRefreshEnabled) return;

        console.log('🔄 Starting auto-refresh...');
        
        this.refreshIntervals.stock = setInterval(async () => {
            const currentSymbol = this.stateManager.getState().stock?.symbol;
            if (currentSymbol && !document.hidden) {
                console.log(`🔄 Auto-refreshing data for: ${currentSymbol}`);
                await this.loadStockData(currentSymbol);
            }
        }, this.refreshIntervals.ticker);
    }

    /**
     * Pause auto-refresh
     */
    pauseAutoRefresh() {
        if (this.refreshIntervals.stock) {
            clearInterval(this.refreshIntervals.stock);
            console.log('⏸️ Auto-refresh paused');
        }
    }

    /**
     * Resume auto-refresh
     */
    resumeAutoRefresh() {
        if (this.autoRefreshEnabled && !this.refreshIntervals.stock) {
            this.startAutoRefresh();
            console.log('▶️ Auto-refresh resumed');
        }
    }

    /**
     * Handle errors with context and metadata
     */
    handleError(error, context, metadata = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            context,
            metadata,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Add to error collection
        this.errors.push(errorInfo);
        
        // Keep only recent errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        // Log error
        console.group(`❌ FinanceHub Error [${context}]`);
        console.error('Error:', error.message);
        console.error('Context:', context);
        console.error('Metadata:', metadata);
        console.error('Stack:', error.stack);
        console.groupEnd();

        // Update error state
        this.stateManager.dispatch({
            type: 'ADD_ERROR',
            payload: errorInfo
        });

        // Show user-friendly error if it's critical
        if (context.includes('initialization') || context.includes('critical')) {
            this.displayError(errorInfo);
        }
    }

    /**
     * Display error to user
     */
    displayError(errorInfo) {
        const errorContainer = document.getElementById('error-container') || document.body;
        const errorElement = document.createElement('div');
        errorElement.className = 'error-notification';
        errorElement.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <div class="error-message">
                    <strong>Something went wrong</strong>
                    <p>${this.getErrorMessage(errorInfo)}</p>
                </div>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        errorContainer.appendChild(errorElement);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorElement.parentElement) {
                errorElement.remove();
            }
        }, 10000);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(errorInfo) {
        const { context, message } = errorInfo;
        
        if (context.includes('network') || message.includes('fetch')) {
            return 'Network connection issue. Please check your internet connection.';
        }
        
        if (context.includes('api')) {
            return 'Unable to load data. Please try again in a moment.';
        }
        
        return 'An unexpected error occurred. Please refresh the page.';
    }

    /**
     * Show the application (remove loading screen)
     */
    showApplication() {
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }

        // Show main content
        const mainContent = document.getElementById('main-content') || document.querySelector('.finance-hub-main');
        if (mainContent) {
            mainContent.style.visibility = 'visible';
            mainContent.style.opacity = '1';
        }

        // Trigger layout recalculation
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    /**
     * Show skeleton loaders for analysis bubbles
     */
    showBubbleSkeletons() {
        const bubblesContainer = document.getElementById('analysis-bubbles-grid');
        if (!bubblesContainer) return;

        // Create 4 skeleton bubbles
        for (let i = 0; i < 4; i++) {
            const skeleton = this.createBubbleSkeleton(i);
            bubblesContainer.appendChild(skeleton);
        }
    }

    /**
     * Create a single bubble skeleton
     */
    createBubbleSkeleton(index) {
        const skeleton = document.createElement('div');
        skeleton.className = 'analysis-bubble skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-header"></div>
            <div class="skeleton-content">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
            </div>
        `;
        return skeleton;
    }

    /**
     * Show error state when initialization fails
     */
    showErrorState(error) {
        const appContainer = document.getElementById('finance-hub-app') || document.body;
        
        appContainer.innerHTML = `
            <div class="error-state">
                <div class="error-state-content">
                    <div class="error-state-icon">🚨</div>
                    <h2>FinanceHub Failed to Load</h2>
                    <p>We encountered an error while initializing the application.</p>
                    <div class="error-details">
                        <strong>Error:</strong> ${error.message}
                    </div>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="error-retry-btn">
                            Reload Application
                        </button>
                        <button onclick="console.log(window.financeHubApp?.errors)" class="error-debug-btn">
                            Show Debug Info
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update all components with new stock data
     */
    updateComponentsWithStockData(symbol, stockData) {
        try {
            console.log(`📊 Updating components with data for: ${symbol}`);
            
            // Update stock header
            this.updateStockHeader(symbol, stockData);
            
            // Update analysis bubbles
            this.updateAnalysisBubbles(stockData);
            
            console.log('✅ Components updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating components:', error);
            this.handleError(error, 'component_update', { symbol });
        }
    }

    /**
     * Update stock header with new data - DELEGATED TO StockHeaderManager
     */
    updateStockHeader(symbol, stockData) {
        // 🔄 Always delegate to StockHeaderManager if available
        if (window.__stockHeaderManager && typeof window.__stockHeaderManager.updateLoadingState === 'function') {
            if (this.validateSymbol(symbol)) {
                try {
                    window.__stockHeaderManager.updateLoadingState(symbol);
                } catch (err) {
                    console.warn('[FinanceHubApp] Delegation to StockHeaderManager failed', err);
                }
            } else {
                console.warn('[FinanceHubApp] Skipping header update; invalid symbol:', symbol);
            }
        } else {
            console.warn('[FinanceHubApp] StockHeaderManager not available, header update skipped');
        }
    }

    /**
     * Format currency values
     */
    formatCurrency(value) {
        if (!value || isNaN(value)) return 'N/A';
        return `$${parseFloat(value).toFixed(2)}`;
    }

    /**
     * Format market cap values
     */
    formatMarketCap(value) {
        if (!value || isNaN(value)) return 'N/A';
        
        const num = parseFloat(value);
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toFixed(2)}`;
    }

    /**
     * Format volume values
     */
    formatVolume(value) {
        if (!value || isNaN(value)) return 'N/A';
        
        const num = parseFloat(value);
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toString();
    }

    /**
     * Update analysis bubbles with new data
     */
    updateAnalysisBubbles(stockData) {
        const bubblesManager = this.components.get('analysis-bubbles');
        if (bubblesManager && bubblesManager.updateWithStockData) {
            bubblesManager.updateWithStockData(stockData);
        } else {
            console.warn('⚠️ Analysis bubbles manager not available');
        }
    }
}

// Make FinanceHubApp globally available
window.FinanceHubApp = FinanceHubApp; 

/* ============================================================================
 * END OF FILE: app/app-class.js
 * ============================================================================ */


/* ============================================================================
 * FILE: main_financehub.js
 * SIZE: 12,103 bytes
 * ============================================================================ */

/**
 * @file main_financehub.js - FinanceHub Module Import Coordinator
 * @description Import coordinator for all FinanceHub JavaScript modules
 * @version 3.2.0 - Simplified Import-Only Architecture
 * @author AEVOREX FinanceHub Team
 */

console.log('FinanceHub Import Coordinator Loading...');

// -----------------------------------------------------------------------------
// GLOBAL ALIASES ▸ Step-4  (remove legacy "Unified" prefix dependencies)
// -----------------------------------------------------------------------------
(() => {
    // Ticker Tape
    if (window.TickerTapeUnified && !window.TickerTape) {
        window.TickerTape = window.TickerTapeUnified;
        console.log('Alias set: TickerTape -> TickerTapeUnified');
    }

    // Chart Manager
    if (window.UnifiedChartManager && !window.ChartManager) {
        window.ChartManager = window.UnifiedChartManager;
        console.log('Alias set: ChartManager -> UnifiedChartManager');
    }

    // UX Enhancements
    if (window.AdvancedUXEnhancementsUnified && !window.AdvancedUXEnhancements) {
        window.AdvancedUXEnhancements = window.AdvancedUXEnhancementsUnified;
        console.log('Alias set: AdvancedUXEnhancements -> AdvancedUXEnhancementsUnified');
    }

    // Component Loader already handles unified names, but expose generic when missing
    if (window.FinanceHubChat && !window.ChatInterface) {
        window.ChatInterface = window.FinanceHubChat;
        console.log('Alias set: ChatInterface -> FinanceHubChat');
    }
    
    // API Compatibility Layer - Handle transition from analytics to specialized endpoints
    if (window.FinanceHubAPI) {
        // Create compatibility methods for legacy code expecting old endpoints
        const api = window.FinanceHubAPI;
        
        // Add analytics endpoint compatibility
        if (!api.getStockAnalytics) {
            api.getStockAnalytics = function(ticker) {
                console.warn(`Legacy getStockAnalytics(${ticker}) called - using getFundamentals instead`);
                return api.getFundamentals(ticker);
            };
        }
        
        // Add unified endpoint compatibility
        if (!api.getUnifiedStockData) {
            api.getUnifiedStockData = function(ticker) {
                console.warn(`Legacy getUnifiedStockData(${ticker}) called - using getFundamentals instead`);
                return api.getFundamentals(ticker);
            };
        }
        
        // Ensure search endpoint works correctly
        if (api.searchStocks && typeof api.searchStocks === 'function') {
            // Wrap original method to ensure consistent response format
            const originalSearch = api.searchStocks;
            api.searchStocks = async function(query, limit = 10) {
                try {
                    const results = await originalSearch.call(api, query, limit);
                    // Normalize response format for consumers
                    if (Array.isArray(results)) {
                        return { results };
                    } else if (results && results.results) {
                        return results;
                    } else {
                        return { results: [] };
                    }
                } catch (error) {
                    console.error(`Search error: ${error.message}`);
                    return { results: [], error: error.message };
                }
            };
        }
        
        console.log('API compatibility layer initialized for legacy endpoints');
    }
})();

// =============================================================================
// CORE MODULES - Foundation Layer
// =============================================================================

// Core utilities and helpers
// File: core/utils.js - Utility functions and helpers

// API service layer
// File: core/api.js - Core API communication service

// State management system
// File: core/state-manager.js - Application state management

// Theme management
// File: core/theme-manager.js - Dark/Light theme system

// Progressive loading system
// File: core/progressive-loader.js - Component loading with fallbacks

// Application initializer
// File: core/app-initializer.js - Core app initialization logic

// Component loader
// File: core/component-loader.js - Dynamic component loading system

// Event management
// File: core/event-manager.js - Global event coordination

// =============================================================================
// SERVICES & LOGIC - Business Layer
// =============================================================================

// Module loader service
// File: services/module-loader.js - Dynamic module loading

// Search logic
// File: logic/search-logic.js - Stock symbol search logic

// Application state store
// File: store/app-state.js - Centralized state store

// Header UI management
// File: ui/header-ui.js - Header interface management

// =============================================================================
// COMPONENTS - UI Layer
// =============================================================================

// Ticker tape component
// File: components/ticker-tape/ticker-tape.js - Market ticker display

// Analysis bubbles container
// File: components/analysis-bubbles/analysis-bubbles.js - Analysis container

// Company overview bubble
// File: components/analysis-bubbles/company-overview/company-overview.js

// Financial metrics bubble
// File: components/analysis-bubbles/financial-metrics/financial-metrics.js

// Technical analysis bubble
// File: components/analysis-bubbles/technical-analysis/technical-analysis.js

// Market news bubble
// File: components/analysis-bubbles/market-news/market-news.js

// News bubble
// File: components/analysis-bubbles/news/news.js

// Chat system components
// File: components/chat/modules/chat-core.js - Chat core functionality
// File: components/chat/modules/chat-ui.js - Chat user interface
// File: components/chat/modules/chat-streaming.js - Chat streaming system
// File: components/chat/chat.js - Main chat component

// Chart widget
// File: components/chart/chart.js - TradingView chart integration

// Stock header management
// File: components/stock-header/stock-header-manager.js - Stock header UI

// UX enhancements
// File: components/ux/ux-enhancements.js - User experience improvements

// Header management
// File: components/header/header-manager.js - Main header management

// Research platform
// File: components/research/research-platform.js - Research tools platform

// Footer component
// File: components/footer/footer.js - Application footer

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Global initialization function - called by HTML
 * This function is the main entry point for the FinanceHub application
 */
function initializeFinanceHub() {
    console.log('FinanceHub: Starting application initialization...');
    
    try {
        // Initialize FinanceHub App instance
        if (typeof FinanceHubApp !== 'undefined') {
            console.log('FinanceHub: FinanceHubApp class found, creating instance...');
            const app = new FinanceHubApp();
            
            // Start the application
            app.initializeApp().then(() => {
                console.log('FinanceHub: Application initialized successfully');
            }).catch((error) => {
                console.error('FinanceHub: Application initialization failed:', error);
            });
            
        } else {
            console.error('FinanceHub: FinanceHubApp class not found in combined bundle');
        }
        
    } catch (error) {
        console.error('FinanceHub: Critical error during initialization:', error);
    }
}

// Make initializeFinanceHub globally available
window.initializeFinanceHub = initializeFinanceHub;

// Add updateComponentsWithStockData as a global utility function
window.updateComponentsWithStockData = function(symbol, stockData) {
    if (!stockData) {
        console.warn('No stock data provided for update');
        return;
    }

    console.log(`📊 Updating components for ${symbol}:`, stockData);

    try {
        // Extract price data from various possible structures
        let priceData = stockData.price_data || stockData;
        
        // If we have a comprehensive structure with stock data
        if (stockData.stock_data && stockData.stock_data.price_data) {
            priceData = stockData.stock_data.price_data;
        }

        if (!priceData) {
            console.warn('No price data found in stock data');
            return;
        }

        console.log('📈 Price data found:', priceData);

        // Update stock header
        const currentPrice = priceData.price || priceData.current_price || priceData.regularMarketPrice;
        const companyName = priceData.company_name || priceData.longName || priceData.shortName;
        const change = priceData.change || priceData.change_amount;
        const changePercent = priceData.change_percent || priceData.regularMarketChangePercent;

        console.log(`💰 Extracted values: price=${currentPrice}, company=${companyName}, change=${change}`);

        if (currentPrice && companyName) {
            // Update stock header if element exists
            const stockHeader = document.querySelector('.fh-stock-header') || document.querySelector('#fh-stock-header');
            if (stockHeader) {
                stockHeader.innerHTML = `
                    <div class="stock-info">
                        <h2>${companyName} (${symbol})</h2>
                        <div class="price">${currentPrice}</div>
                        <div class="change ${change >= 0 ? 'positive' : 'negative'}">
                            ${change >= 0 ? '+' : ''}${change} (${changePercent >= 0 ? '+' : ''}${changePercent}%)
                        </div>
                    </div>
                `;
            }
            
            console.log('✅ Stock header updated successfully');
        } else {
            console.warn('Missing essential price data for header update');
        }

        // Dispatch custom event for components to listen to
        const updateEvent = new CustomEvent('stockDataUpdated', {
            detail: {
                symbol: symbol,
                data: stockData,
                priceData: priceData
            }
        });
        document.dispatchEvent(updateEvent);

    } catch (error) {
        console.error('❌ Error updating components with stock data:', error);
    }
};

console.log('FinanceHub Import Coordinator Ready - initializeFinanceHub() available globally');

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

/**
 * Automatic initialization when DOM is ready
 * This ensures the app starts automatically without manual HTML calls
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired - Auto-initializing FinanceHub...');
    
    // Give scripts a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now start the application
    if (typeof FinanceHubApp !== 'undefined') {
        console.log('Creating FinanceHubApp instance...');
        window.financeHubApp = new FinanceHubApp();
        await window.financeHubApp.initializeApp();
        console.log('FinanceHub application fully initialized!');
    } else {
        console.error('FinanceHubApp class not found');
        
        // Fallback: try to use the global initializeFinanceHub function
        if (typeof window.initializeFinanceHub === 'function') {
            console.log('Attempting fallback initialization...');
            window.initializeFinanceHub();
        }
    }
});

console.log('FinanceHub Auto-Initialization Setup Complete'); 

/* ============================================================================
 * END OF FILE: main_financehub.js
 * ============================================================================ */



/* ============================================================================
 * BUILD STATISTICS
 * ============================================================================ */

console.log('📊 FinanceHub Bundle Statistics:', {
    totalFiles: 35,
    processedFiles: 35,
    skippedFiles: 0,
    totalSize: '825,618 bytes',
    errors: 0
});

console.log('✅ FinanceHub Combined JavaScript Bundle loaded successfully!');

/* ============================================================================
 * END OF COMBINED BUNDLE
 * ============================================================================ */
