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
export { FinancialMetricsBubble };
export default FinancialMetricsBubble;

console.log('✅ FinancialMetricsBubble exported successfully (ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('financial-metrics-bubble');
    if (container && !window.financialMetrics) {
        console.log('FinancialMetricsBubble: Auto-initializing...');
        window.financialMetrics = new FinancialMetricsBubble();
    }
}); 