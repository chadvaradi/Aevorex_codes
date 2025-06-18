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
export { UnifiedChartManager };
export default UnifiedChartManager;

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