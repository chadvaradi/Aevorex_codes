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