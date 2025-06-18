/**
 * ===================================================================
 * HEADER MANAGER
 * Manages main header functionality and interactions
 * ===================================================================
 */

class HeaderManager {
    constructor() {
        this.header = null;
        this.searchInput = null;
        this.searchResults = null;
        this.themeToggle = null;
        this.isSearchActive = false;
        this.searchTimeout = null;
        this.observers = new Map();
        
        this.config = {
            searchDelay: 300,
            maxSearchResults: 8,
            enableScrollEffect: true
        };
    }

    /**
     * Initialize header manager
     */
    async init() {
        try {
            console.log('🔄 Initializing HeaderManager...');
            
            // Find header elements
            this.findHeaderElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize search functionality
            this.initializeSearch();
            
            // Setup scroll effects
            if (this.config.enableScrollEffect) {
                this.setupScrollEffects();
            }
            
            console.log('✅ HeaderManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize HeaderManager:', error);
            return false;
        }
    }

    /**
     * Find header DOM elements
     */
    findHeaderElements() {
        this.header = document.querySelector('header') || 
                     document.querySelector('.header') ||
                     document.querySelector('.main-header');
        
        if (!this.header) {
            throw new Error('Header element not found');
        }

        this.searchInput = this.header.querySelector('.search-input') ||
                          this.header.querySelector('input[type="search"]') ||
                          this.header.querySelector('.header-search input');
        
        this.themeToggle = this.header.querySelector('.theme-toggle') ||
                          this.header.querySelector('.dark-mode-toggle');
        
        // Create search results container if it doesn't exist
        this.createSearchResults();
    }

    /**
     * Create search results container
     */
    createSearchResults() {
        this.searchResults = this.header.querySelector('.search-results');
        
        if (!this.searchResults && this.searchInput) {
            this.searchResults = document.createElement('div');
            this.searchResults.className = 'search-results';
            this.searchResults.style.display = 'none';
            
            // Insert after search input
            this.searchInput.parentNode.insertBefore(
                this.searchResults, 
                this.searchInput.nextSibling
            );
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input events
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            this.searchInput.addEventListener('focus', () => {
                this.showSearchResults();
            });

            this.searchInput.addEventListener('blur', () => {
                // Delay hiding to allow for result clicks
                setTimeout(() => this.hideSearchResults(), 200);
            });

            this.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });

            // Submit via parent form (magnifier button or Enter)
            const parentForm = this.searchInput.closest('.header-search-form');
            if (parentForm) {
                parentForm.addEventListener('submit', (evt) => {
                    evt.preventDefault();
                    const symbolRaw = this.searchInput.value.trim();
                    if (symbolRaw) {
                        this.selectStock(symbolRaw.toUpperCase());
                    }
                });
            }
        }

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Click outside to close search
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target)) {
                this.hideSearchResults();
            }
        });

        // Logo click - go to home
        const logo = this.header.querySelector('.logo, .brand');
        if (logo) {
            logo.addEventListener('click', () => {
                this.goToHome();
            });
        }
    }

    /**
     * Initialize search functionality
     */
    initializeSearch() {
        if (!this.searchInput) return;

        // Set placeholder
        this.searchInput.placeholder = 'Search stocks (e.g., AAPL, Tesla)...';
        
        // Initialize search state
        this.isSearchActive = false;
    }

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }

            // Hide/show header on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                this.header.classList.add('hidden');
            } else {
                this.header.classList.remove('hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick);
    }

    /**
     * Handle search input
     */
    handleSearchInput(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, this.config.searchDelay);
    }

    /**
     * Perform search
     */
    async performSearch(query) {
        if (!query || query.length < 1) {
            this.hideSearchResults();
            return;
        }

        try {
            console.log(`🔍 Searching for: ${query}`);
            
            // Show loading state
            this.showSearchLoading();
            
            // Use FinanceHubAPIService to get search results
            const data = await window.FinanceHubAPI.searchStocks(query, 20);
            
            // Display results
            this.displaySearchResults(data, query);
            
        } catch (error) {
            console.error('Search failed:', error);
            this.showSearchError('Search failed. Please try again.');
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results, query) {
        if (!this.searchResults) return;

        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No results found for "${query}"</div>
                </div>
            `;
        } else {
            this.searchResults.innerHTML = results.map(stock => `
                <div class="search-result-item" data-symbol="${stock.symbol}">
                    <div class="result-main">
                        <div class="result-symbol">${stock.symbol}</div>
                        <div class="result-name">${stock.name}</div>
                        <div class="result-metadata">
                            ${stock.sector ? `<span class="result-sector">${stock.sector}</span>` : ''}
                            ${stock.exchange ? `<span class="result-exchange">${stock.exchange}</span>` : ''}
                        </div>
                    </div>
                    <div class="result-price">
                        <span class="price">${stock.currency || '$'}${stock.price.toFixed(2)}</span>
                        <span class="change ${stock.change >= 0 ? 'positive' : 'negative'}">
                            ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                        </span>
                    </div>
                </div>
            `).join('');

            // Add click handlers to results
            this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    this.selectStock(symbol);
                });
            });
        }

        this.showSearchResults();
    }

    /**
     * Show search loading state
     */
    showSearchLoading() {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = `
            <div class="search-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Searching...</div>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Show search error
     */
    showSearchError(message) {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = `
            <div class="search-error">
                <div class="error-icon">⚠️</div>
                <div class="error-text">${message}</div>
            </div>
        `;
        
        this.showSearchResults();
    }

    /**
     * Show search results
     */
    showSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'block';
            this.isSearchActive = true;
        }
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
            this.isSearchActive = false;
        }
    }

    /**
     * Handle search keydown events
     */
    handleSearchKeydown(e) {
        if (e.key === 'Escape') {
            this.hideSearchResults();
            this.searchInput.blur();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const firstResult = this.searchResults?.querySelector('.search-result-item');
            if (firstResult) {
                const symbol = firstResult.dataset.symbol;
                this.selectStock(symbol);
            }
        }
    }

    /**
     * Select stock from search results
     */
    selectStock(symbol) {
        console.log(`📈 Stock selected: ${symbol}`);
        
        // Clear search
        this.searchInput.value = '';
        this.hideSearchResults();
        
        // Dispatch stock change event
        const event = new CustomEvent('stockSymbolChange', {
            detail: { symbol: symbol, source: 'header-search' }
        });
        document.dispatchEvent(event);
        
        // 🔄 NEW: Dispatch unified symbol change event used across modules (Rule #008 data-parity)
        const unifiedEvent = new CustomEvent('symbol-changed', {
            detail: { symbol: symbol, source: 'header-search' }
        });
        document.dispatchEvent(unifiedEvent);
        
        // Also dispatch ticker change for compatibility
        const tickerEvent = new CustomEvent('tickerChange', {
            detail: { symbol: symbol }
        });
        document.dispatchEvent(tickerEvent);
        
        // Notify observers
        this.notifyObservers('stock:selected', { symbol });
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        if (window.ThemeManager && typeof window.ThemeManager.toggleTheme === 'function') {
            // Prefer central ThemeManager (ensures class + data-attr harmony)
            const before = document.documentElement.getAttribute('data-theme') || 'light';
            window.ThemeManager.toggleTheme();
            const after = document.documentElement.getAttribute('data-theme') || 'light';
            console.log(`🎨 Theme toggled via ThemeManager: ${before} → ${after}`);
            this.notifyObservers('theme:changed', { theme: after });
        } else {
            console.warn('⚠️ ThemeManager not available, falling back to local toggle');
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.notifyObservers('theme:changed', { theme: newTheme });
        }
    }

    /**
     * Go to home
     */
    goToHome() {
        // Reset to default stock
        this.selectStock('AAPL');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('🏠 Navigated to home');
    }

    /**
     * Update search placeholder
     */
    updateSearchPlaceholder(text) {
        if (this.searchInput) {
            this.searchInput.placeholder = text;
        }
    }

    /**
     * Get header state
     */
    getHeaderState() {
        return {
            isSearchActive: this.isSearchActive,
            currentTheme: document.documentElement.getAttribute('data-theme') || 'light',
            searchQuery: this.searchInput?.value || ''
        };
    }

    /**
     * Add observer for header events
     */
    addObserver(name, callback) {
        this.observers.set(name, callback);
    }

    /**
     * Remove observer
     */
    removeObserver(name) {
        this.observers.delete(name);
    }

    /**
     * Notify observers
     */
    notifyObservers(event, data) {
        this.observers.forEach((callback, name) => {
            try {
                callback(event, data);
            } catch (error) {
                console.error(`Header observer ${name} failed:`, error);
            }
        });
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        try {
            // Clear timeouts
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // Clear observers
            this.observers.clear();
            
            // Reset state
            this.isSearchActive = false;
            
            console.log('HeaderManager destroyed');
            
        } catch (error) {
            console.error('Error destroying HeaderManager:', error);
        }
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 HeaderManager ready for initialization');
    });
} else {
    console.log('📱 HeaderManager ready for initialization');
}

// Make HeaderManager globally available
window.HeaderManager = HeaderManager;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderManager;
}

// ES6 Export
export { HeaderManager };
export default HeaderManager;

console.log('✅ HeaderManager exported successfully (CommonJS + ES6 + Global)'); 