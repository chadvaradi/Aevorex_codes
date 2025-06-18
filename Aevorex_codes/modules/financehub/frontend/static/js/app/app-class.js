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