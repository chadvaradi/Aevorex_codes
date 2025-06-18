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