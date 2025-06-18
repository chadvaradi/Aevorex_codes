/**
 * FinanceHub Stock Header Manager v20.0.0
 * Manages the stock header display with real-time updates
 */

class StockHeaderManager {
    constructor() {
        this.isInitialized = false;
        this.currentData = null;
        this.elements = {};
        this.animationFrameId = null;
        
        // Subscribe to ticker changes and data updates
        if (window.TickerSync) {
            window.TickerSync.subscribe('StockHeaderManager', this.handleTickerEvent.bind(this));
        }

        // Listen to global events dispatched by EventManager
        document.addEventListener('stock-data-updated', (e) => {
            try {
                const { symbol, stockData } = e.detail || {};
                if (symbol && stockData) {
                    this.updateStockData(stockData, symbol);
                }
            } catch (err) {
                console.warn('[StockHeader] Failed handling stock-data-updated', err);
            }
        });

        document.addEventListener('symbol-changed', (e) => {
            try {
                const { symbol } = e.detail || {};
                if (symbol) {
                    this.updateLoadingState(symbol);
                }
            } catch (err) {
                console.warn('[StockHeader] Failed handling symbol-changed', err);
            }
        });
    }

    /**
     * Handle ticker events from TickerSync
     */
    handleTickerEvent(event) {
        switch (event.type) {
            case 'ticker_changed':
                this.updateLoadingState(event.ticker);
                break;
            case 'data_updated':
                if (event.data.stockData) {
                    this.updateStockData(event.data.stockData.data, event.ticker);
                }
                break;
            case 'loading_start':
                this.showLoadingState();
                break;
            case 'loading_end':
                this.hideLoadingState();
                break;
            case 'error':
                this.showErrorState(event.error);
                break;
        }
    }

    /**
     * Initialize stock header
     */
    initialize() {
        this.findElements();
        this.setupAnimations();
        this.setupInteractions();
        
        this.isInitialized = true;
        
        // Clean up any existing placeholder/mock values
        this.clearPlaceholderValues();
        
        console.log('✅ StockHeaderManager initialized');

        // --- INITIAL PRIME FETCH (2025-06-15) ---
        try {
            const defaultSymbol = (window.FinanceHubState?.state?.currentSymbol) || 'AAPL';
            if (defaultSymbol && typeof defaultSymbol === 'string') {
                this.updateLoadingState(defaultSymbol);
            }
        } catch (primeErr) {
            console.debug('[StockHeader] Prime fetch skipped', primeErr);
        }
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        this.elements = {
            container: document.getElementById('stock-header-section'),
            symbol: document.getElementById('fh-stock-symbol') || document.getElementById('stock-symbol-display'),
            companyName: document.getElementById('fh-stock-company-name') || document.getElementById('stock-company-name'),
            currentPrice: document.getElementById('fh-stock-current-price') || document.getElementById('stock-current-price'),
            change: document.getElementById('fh-stock-change') || document.getElementById('stock-change'),

            // Metrics
            previousClose: document.getElementById('fh-previous-close') || null,
            marketCap: document.getElementById('fh-market-cap') || null,
            volume: document.getElementById('fh-volume') || document.getElementById('stock-volume'),
            dayRange: document.getElementById('stock-day-range'),

            // Misc
            exchange: document.getElementById('stock-exchange'),
            marketStatus: document.getElementById('stock-market-status')
        };

        // Check if all required elements exist
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn('[StockHeader] Missing elements:', missingElements);
        }
    }

    /**
     * Update loading state with new ticker
     */
    updateLoadingState(ticker) {
        // Validate ticker symbol; ignore placeholders
        if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0 || ticker === '—') {
            console.warn('[StockHeader] updateLoadingState called with invalid ticker:', ticker);
            return;
        }
        if (this.elements.symbol) {
            this.elements.symbol.textContent = ticker;
        }
        
        if (this.elements.companyName) {
            this.elements.companyName.textContent = 'Loading...';
            this.elements.companyName.classList.add('loading');
        }

        // Ensure content container becomes visible
        try{
            const contentEl = this.elements.container?.querySelector('#fh-stock-header-content');
            if(contentEl){ contentEl.style.display='block'; contentEl.classList.remove('hidden'); }
        }catch(e){ console.warn('[StockHeader] failed to unhide content', e); }

        // 🔄 Immediately fetch latest header snapshot from backend
        if (window.API && typeof window.API.getStockHeader === 'function') {
            // Fire-and-forget; UI will update when data arrives
            window.API.getStockHeader(ticker)
                .then(data => this.updateStockData(data, ticker))
                .catch(err => {
                    console.warn('[StockHeader] Failed to fetch header data', err);
                    this.showErrorState(err);
                });
        } else if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService.getStockHeader === 'function') {
            window.FinanceHubAPIService.getStockHeader(ticker)
                .then(data => this.updateStockData(data, ticker))
                .catch(err => {
                    console.warn('[StockHeader] Failed to fetch header data', err);
                    this.showErrorState(err);
                });
        } else {
            console.warn('[StockHeader] No API service available for header fetch');
        }
    }

    /**
     * (Deprecated) external components should call updateLoadingState which internally triggers fetch
     * Kept for backward compat to force refresh header from outside
     */
    async fetchHeaderData(ticker) {
        if (!ticker) return;
        try {
            const data = await window.FinanceHubAPIService.getStockHeader(ticker);
            this.updateStockData(data, ticker);
        } catch (error) {
            console.error('[StockHeader] fetchHeaderData error', error);
            this.showErrorState(error);
        }
    }

    /**
     * Update stock data display
     */
    updateStockData(data, ticker) {
        if (!data || !this.isInitialized) return;

        // Handle different data formats - check if data has price_data wrapper
        const stockData = data.price_data || data;
        this.currentData = stockData;
        
        // Update symbol and company name
        this.updateBasicInfo(stockData, ticker);
        
        // Update price information
        this.updatePriceInfo(stockData);
        
        // Update additional metrics
        this.updateAdditionalInfo(stockData);
        
        // Update market status
        this.updateMarketStatus(stockData);
        
        // Trigger animations
        this.animateUpdate();

        // Reveal content area & hide placeholder
        try {
            if (this.elements.container) {
                const placeholderEl = this.elements.container.querySelector('.stock-header-placeholder');
                const contentEl = this.elements.container.querySelector('#fh-stock-header-content');
                if (placeholderEl) placeholderEl.style.display = 'none';
                if (contentEl) {
                    contentEl.style.display = 'block';
                    contentEl.classList.remove('hidden');
                }
            }
        } catch(err) { console.warn('[StockHeader] Failed to toggle placeholder/content', err);}

        // Clean up duplicate nodes (keep first occurrence)
        this.deduplicateIds(['fh-previous-close','fh-market-cap','fh-volume']);
    }

    /**
     * Update basic stock information
     */
    updateBasicInfo(data, ticker) {
        if (this.elements.symbol) {
            this.elements.symbol.textContent = ticker;
        }
        
        if (this.elements.companyName) {
            const companyName = data.company_overview?.company_name || 
                              data.company_name || 
                              `${ticker} Inc.`;
            this.elements.companyName.textContent = companyName;
            this.elements.companyName.classList.remove('loading');
        }
        
        if (this.elements.exchange) {
            this.elements.exchange.textContent = data.exchange || 'NASDAQ';
        }
    }

    /**
     * Update price information
     */
    updatePriceInfo(data) {
        // Handle both API formats: price or current_price
        const price = data.price || data.current_price;
        if (this.elements.currentPrice && price) {
            const priceValue = parseFloat(price);
            this.elements.currentPrice.textContent = window.FinanceUtils ? 
                window.FinanceUtils.formatCurrency(priceValue) : 
                `$${priceValue.toFixed(2)}`;
        }
        
        if (this.elements.change) {
            const change = parseFloat(data.change || 0);
            const changePercent = parseFloat(data.change_percent || 0);
            
            // Update change display
            const changeText = window.FinanceUtils ? 
                `${window.FinanceUtils.formatCurrency(change)} (${window.FinanceUtils.formatPercentage(changePercent)})` :
                `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            
            this.elements.change.textContent = changeText;
            
            // Update change class
            this.elements.change.className = `stock-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    }

    /**
     * Update additional information
     */
    updateAdditionalInfo(data) {
        // Helper to update all duplicates (due to earlier markup duplication)
        const updateAll = (idSelector, valueFormatter) => {
            document.querySelectorAll(`[id='${idSelector}']`).forEach(el => {
                el.textContent = valueFormatter();
                el.classList.remove('skeleton');
            });
        };

        // Previous Close
        if (data.previous_close) {
            const prevClose = parseFloat(data.previous_close);
            updateAll('fh-previous-close', () => window.FinanceUtils ? window.FinanceUtils.formatCurrency(prevClose) : `$${prevClose.toFixed(2)}`);
        } else {
            updateAll('fh-previous-close', () => '—');
        }

        // Market Cap
        if (data.market_cap) {
            const mcap = parseFloat(data.market_cap);
            const mcapText = window.FinanceUtils ? window.FinanceUtils.formatLargeNumber(mcap) : (
                mcap >= 1e12 ? `$${(mcap/1e12).toFixed(2)}T` :
                mcap >= 1e9 ? `$${(mcap/1e9).toFixed(2)}B` :
                mcap >= 1e6 ? `$${(mcap/1e6).toFixed(2)}M` : `$${mcap.toFixed(2)}`
            );
            updateAll('fh-market-cap', () => mcapText);
        } else {
            updateAll('fh-market-cap', () => '—');
        }

        // Volume
        if (data.volume) {
            const vol = parseInt(data.volume);
            const volText = window.FinanceUtils ? window.FinanceUtils.formatLargeNumber(vol) : vol.toLocaleString();
            updateAll('fh-volume', () => volText);
        } else {
            updateAll('fh-volume', () => '—');
        }

        if (this.elements.dayRange) {
            const dayLow = parseFloat(data.day_low || 0);
            const dayHigh = parseFloat(data.day_high || 0);
            if (dayLow && dayHigh) {
                this.elements.dayRange.textContent = window.FinanceUtils ?
                    `${window.FinanceUtils.formatCurrency(dayLow)} - ${window.FinanceUtils.formatCurrency(dayHigh)}` :
                    `$${dayLow.toFixed(2)} - $${dayHigh.toFixed(2)}`;
            }
        }
    }

    /**
     * Update market status
     */
    updateMarketStatus(data) {
        if (this.elements.marketStatus) {
            const isOpen = data.market_open !== false; // Default to open if not specified
            this.elements.marketStatus.textContent = isOpen ? 'Market Open' : 'Market Closed';
            this.elements.marketStatus.className = `stock-market-status ${isOpen ? 'open' : 'closed'}`;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.elements.container) {
            this.elements.container.classList.add('loading');
        }
        
        Object.values(this.elements).forEach(element => {
            if (element && element !== this.elements.container) {
                element.classList.add('loading-shimmer');
            }
        });
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.elements.container) {
            this.elements.container.classList.remove('loading');
        }
        
        Object.values(this.elements).forEach(element => {
            if (element && element !== this.elements.container) {
                element.classList.remove('loading-shimmer');
            }
        });
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        console.error('[StockHeader] Error:', error);
        
        if (this.elements.companyName) {
            this.elements.companyName.textContent = 'Error loading data';
            this.elements.companyName.classList.add('error');
        }
        
        if (this.elements.currentPrice) {
            this.elements.currentPrice.textContent = '--';
        }
        
        if (this.elements.change) {
            this.elements.change.textContent = '--';
            this.elements.change.className = 'stock-change';
        }
    }

    /**
     * Setup animations for smooth updates
     */
    setupAnimations() {
        // Price pulse animation for significant changes
        this.priceChangeThreshold = 1; // 1% change threshold for animation
    }

    /**
     * Animate update
     */
    animateUpdate() {
        if (!this.elements.container) return;

        // Add update animation class
        this.elements.container.classList.add('updating');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            if (this.elements.container) {
                this.elements.container.classList.remove('updating');
            }
        }, 300);

        // Animate price change if significant
        if (this.currentData && this.elements.currentPrice) {
            const changePercent = Math.abs(parseFloat(this.currentData.change_percent || 0));
            
            if (changePercent >= this.priceChangeThreshold) {
                this.elements.currentPrice.classList.add('significant-change');
                
                setTimeout(() => {
                    if (this.elements.currentPrice) {
                        this.elements.currentPrice.classList.remove('significant-change');
                    }
                }, 1000);
            }
        }
    }

    /**
     * Setup interactions
     */
    setupInteractions() {
        if (this.elements.container) {
            // Click to refresh data
            this.elements.container.addEventListener('click', () => {
                if (window.TickerSync) {
                    window.TickerSync.refreshCurrentTicker();
                }
            });
            
            // Add tooltip or hover effects
            this.elements.container.addEventListener('mouseenter', () => {
                if (this.elements.container) {
                    this.elements.container.classList.add('hovered');
                }
            });
            
            this.elements.container.addEventListener('mouseleave', () => {
                if (this.elements.container) {
                    this.elements.container.classList.remove('hovered');
                }
            });
        }
    }

    /**
     * Get current stock data
     */
    getCurrentData() {
        return this.currentData;
    }

    /**
     * Get component state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasData: !!this.currentData,
            currentTicker: this.elements.symbol?.textContent || '',
            isLoading: this.elements.container?.classList.contains('loading') || false
        };
    }

    /**
     * Force refresh display
     */
    refresh() {
        if (this.currentData && window.TickerSync) {
            const currentTicker = window.TickerSync.getCurrentTicker();
            this.updateStockData(this.currentData, currentTicker);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (window.TickerSync) {
            window.TickerSync.unsubscribe('StockHeaderManager');
        }
        
        // Remove event listeners
        if (this.elements.container) {
            this.elements.container.removeEventListener('click', () => {});
            this.elements.container.removeEventListener('mouseenter', () => {});
            this.elements.container.removeEventListener('mouseleave', () => {});
        }
        
        this.isInitialized = false;
        console.log('[StockHeader] Stock Header Manager destroyed');
    }

    /**
     * Remove duplicate DOM nodes with the same IDs, keep the first element encountered
     */
    deduplicateIds(idList) {
        idList.forEach(id => {
            const elements = document.querySelectorAll(`[id='${id}']`);
            if (elements.length > 1) {
                // Keep first, remove rest
                for (let i = 1; i < elements.length; i++) {
                    elements[i].remove();
                }
                console.log(`[StockHeader] Removed ${elements.length - 1} duplicate(s) for ID: ${id}`);
            }
        });
    }

    /**
     * Clear any existing placeholder/mock values
     */
    clearPlaceholderValues() {
        const clearElement = (selector, defaultText = '—') => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent.includes('$199.20') || 
                    el.textContent.includes('$2.94T') || 
                    el.textContent.includes('11.19M') ||
                    el.textContent.includes('N/A')) {
                    el.textContent = defaultText;
                    el.classList.remove('skeleton');
                }
            });
        };

        // Clear known mock values
        clearElement('[id="fh-stock-current-price"]', '$0.00');
        clearElement('[id="fh-previous-close"]');
        clearElement('[id="fh-market-cap"]');
        clearElement('[id="fh-volume"]');
        clearElement('[id="fh-change-amount"]', '+$0.00');
        clearElement('[id="fh-change-percent"]', '(+0.00%)');
    }
}

// Auto-create singleton instance when DOM ready
if (typeof window !== 'undefined') {
    const createInstance = () => {
        if (!window.__stockHeaderManager) {
            window.__stockHeaderManager = new StockHeaderManager();
            window.__stockHeaderManager.initialize();
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createInstance, { once: true });
    } else { createInstance(); }
}

// CommonJS export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockHeaderManager;
}

// ES6 export for modern modules
export { StockHeaderManager };
export default StockHeaderManager;

console.log('✅ StockHeaderManager exported successfully (CommonJS + ES6 + Global)'); 