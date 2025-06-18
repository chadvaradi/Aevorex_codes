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
export { CompanyOverviewBubble };
export default CompanyOverviewBubble;

console.log('✅ CompanyOverviewBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('company-overview-bubble');
    if (container && !window.companyOverview) {
        console.log('CompanyOverviewBubble: Auto-initializing...');
        window.companyOverview = new CompanyOverviewBubble();
    }
}); 