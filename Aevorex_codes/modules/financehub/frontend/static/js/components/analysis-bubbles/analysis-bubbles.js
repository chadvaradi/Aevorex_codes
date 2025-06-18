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
export { AnalysisBubbles };
export default AnalysisBubbles;

console.log('✅ AnalysisBubbles exported successfully (ES6 + Global)');