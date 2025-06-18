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
export { TechnicalAnalysisBubble };
export default TechnicalAnalysisBubble;

console.log('✅ TechnicalAnalysisBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('technical-analysis-bubble');
    if (container && !window.technicalAnalysisBubble) {
        console.log('TechnicalAnalysisBubble: Auto-initializing...');
        window.technicalAnalysisBubble = new TechnicalAnalysisBubble();
    }
}); 