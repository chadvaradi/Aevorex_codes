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
export { FinanceHubStateManager };
export default window.FinanceHubState;

console.log('✅ FinanceHubStateManager exported successfully (CommonJS + ES6 + Global)'); 