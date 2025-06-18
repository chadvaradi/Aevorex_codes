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