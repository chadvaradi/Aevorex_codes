/**
 * ===================================================================
 * SEARCH LOGIC COMPONENT
 * Handles search functionality and data processing
 * Extracted from HeaderManager for better separation of concerns
 * ===================================================================
 */

class SearchLogic {
    constructor(dataService) {
        // Fallback to unified FinanceHubAPI if legacy DataService is not supplied
        this.dataService = dataService 
            || window.FinanceHubAPI 
            || (window.financeHubApp?.apiService) 
            || (window.FinanceHubAPIService ? new window.FinanceHubAPIService() : null);
        this.searchCache = new Map();
        this.searchHistory = [];
        this.popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'];
        
        this.config = {
            minSearchLength: 1,
            maxResults: 10,
            searchDelay: 300,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            maxHistoryItems: 20
        };

        this.searchTimeout = null;
        this.abortController = null;
    }

    /**
     * Perform search with debouncing
     */
    async search(query, callback) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Abort previous request
        if (this.abortController) {
            this.abortController.abort();
        }

        // Validate query
        if (!query || query.length < this.config.minSearchLength) {
            callback([]);
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            try {
                const results = await this.performSearch(query);
                callback(results);
            } catch (error) {
                console.error('Search error:', error);
                callback([]);
            }
        }, this.config.searchDelay);
    }

    /**
     * Perform actual search
     */
    async performSearch(query) {
        const normalizedQuery = query.trim().toLowerCase();
        
        // Check cache first
        const cacheKey = normalizedQuery;
        const cached = this.searchCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.results;
        }

        // Create new abort controller
        this.abortController = new AbortController();

        try {
            // Search in multiple sources
            const [symbolResults, companyResults] = await Promise.all([
                this.searchBySymbol(normalizedQuery),
                this.searchByCompanyName(normalizedQuery)
            ]);

            // Combine and deduplicate results
            const combinedResults = this.combineResults(symbolResults, companyResults);
            
            // Sort by relevance
            const sortedResults = this.sortByRelevance(combinedResults, normalizedQuery);
            
            // Limit results
            const limitedResults = sortedResults.slice(0, this.config.maxResults);

            // Cache results
            this.searchCache.set(cacheKey, {
                results: limitedResults,
                timestamp: Date.now()
            });

            return limitedResults;

        } catch (error) {
            if (error.name === 'AbortError') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Search by symbol
     */
    async searchBySymbol(query) {
        try {
            console.log(`🔍 [SearchLogic] Starting symbol search for: "${query}" (centralized API)`);
            
            const data = await this.dataService.searchStocks(query, this.config.maxResults);

            // API may return { results: [...] } or raw array
            const results = Array.isArray(data) ? data : (data.results || []);

            console.log(`✅ [SearchLogic] Symbol search successful. Found ${results.length} results`);
            return results;
            
        } catch (error) {
            console.error(`❌ [SearchLogic] Symbol search failed:`, error);
            return this.fallbackSymbolSearch(query);
        }
    }

    /**
     * Search by company name
     */
    async searchByCompanyName(query) {
        try {
            console.log(`🔍 [SearchLogic] Starting company name search for: "${query}" (centralized API)`);
            
            const data = await this.dataService.searchStocks(query, this.config.maxResults);
            const results = Array.isArray(data) ? data : (data.results || []);

            console.log(`✅ [SearchLogic] Company name search successful. Found ${results.length} results`);
            return results;
            
        } catch (error) {
            console.error(`❌ [SearchLogic] Company name search failed:`, error);
            return this.fallbackCompanySearch(query);
        }
    }

    /**
     * Fallback symbol search
     */
    fallbackSymbolSearch(query) {
        const upperQuery = query.toUpperCase();
        return this.popularSymbols
            .filter(symbol => symbol.includes(upperQuery))
            .map(symbol => ({
                symbol,
                name: this.getCompanyName(symbol),
                type: 'stock',
                price: 0,
                change: 0,
                source: 'fallback'
            }));
    }

    /**
     * Fallback company search
     */
    fallbackCompanySearch(query) {
        const lowerQuery = query.toLowerCase();
        const companyMap = {
            'apple': 'AAPL',
            'google': 'GOOGL',
            'microsoft': 'MSFT',
            'tesla': 'TSLA',
            'amazon': 'AMZN',
            'meta': 'META',
            'nvidia': 'NVDA',
            'netflix': 'NFLX'
        };

        return Object.entries(companyMap)
            .filter(([name]) => name.includes(lowerQuery))
            .map(([name, symbol]) => ({
                symbol,
                name: this.getCompanyName(symbol),
                type: 'stock',
                price: 0,
                change: 0,
                source: 'fallback'
            }));
    }

    /**
     * Get company name for symbol - REQUIRES BACKEND API ONLY
     */
    getCompanyName(symbol) {
        // ❌ MOCK DATA REMOVED - BACKEND INTEGRATION REQUIRED
        console.error(`🚨 SearchLogic CRITICAL: Company name requested for ${symbol} but MOCK DATA was removed`);
        console.error('🚨 SearchLogic NOTE: Backend API integration is MANDATORY - no fallback data exists');
        
        // Return error indication instead of mock data
        return `❌ ${symbol} - API Integration Required`;
    }

    /**
     * Combine search results
     */
    combineResults(symbolResults, companyResults) {
        const resultMap = new Map();

        // Add symbol results
        symbolResults.forEach(result => {
            resultMap.set(result.symbol, result);
        });

        // Add company results (don't overwrite symbol results)
        companyResults.forEach(result => {
            if (!resultMap.has(result.symbol)) {
                resultMap.set(result.symbol, result);
            }
        });

        return Array.from(resultMap.values());
    }

    /**
     * Sort results by relevance
     */
    sortByRelevance(results, query) {
        const upperQuery = query.toUpperCase();
        
        return results.sort((a, b) => {
            // Exact symbol match gets highest priority
            if (a.symbol === upperQuery) return -1;
            if (b.symbol === upperQuery) return 1;

            // Symbol starts with query
            const aSymbolStarts = a.symbol.startsWith(upperQuery);
            const bSymbolStarts = b.symbol.startsWith(upperQuery);
            if (aSymbolStarts && !bSymbolStarts) return -1;
            if (!aSymbolStarts && bSymbolStarts) return 1;

            // Company name starts with query
            const aNameStarts = a.name.toLowerCase().startsWith(query.toLowerCase());
            const bNameStarts = b.name.toLowerCase().startsWith(query.toLowerCase());
            if (aNameStarts && !bNameStarts) return -1;
            if (!aNameStarts && bNameStarts) return 1;

            // Symbol contains query
            const aSymbolContains = a.symbol.includes(upperQuery);
            const bSymbolContains = b.symbol.includes(upperQuery);
            if (aSymbolContains && !bSymbolContains) return -1;
            if (!aSymbolContains && bSymbolContains) return 1;

            // Company name contains query
            const aNameContains = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameContains = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameContains && !bNameContains) return -1;
            if (!aNameContains && bNameContains) return 1;

            // Popular symbols get priority
            const aPopular = this.popularSymbols.includes(a.symbol);
            const bPopular = this.popularSymbols.includes(b.symbol);
            if (aPopular && !bPopular) return -1;
            if (!aPopular && bPopular) return 1;

            // Alphabetical order
            return a.symbol.localeCompare(b.symbol);
        });
    }

    /**
     * Add to search history
     */
    addToHistory(query, result) {
        const historyItem = {
            query: query.trim(),
            result,
            timestamp: Date.now()
        };

        // Remove existing entry for same symbol
        this.searchHistory = this.searchHistory.filter(
            item => item.result.symbol !== result.symbol
        );

        // Add to beginning
        this.searchHistory.unshift(historyItem);

        // Limit history size
        if (this.searchHistory.length > this.config.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.config.maxHistoryItems);
        }

        // Save to localStorage
        this.saveHistoryToStorage();
    }

    /**
     * Get search history
     */
    getHistory() {
        return this.searchHistory;
    }

    /**
     * Get popular searches
     */
    getPopularSearches() {
        return this.popularSymbols.map(symbol => ({
            symbol,
            name: this.getCompanyName(symbol),
            type: 'stock',
            price: 0,
            change: 0,
            source: 'popular'
        }));
    }

    /**
     * Clear search history
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveHistoryToStorage();
    }

    /**
     * Save history to localStorage
     */
    saveHistoryToStorage() {
        try {
            localStorage.setItem('financehub_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }

    /**
     * Load history from localStorage
     */
    loadHistoryFromStorage() {
        try {
            const stored = localStorage.getItem('financehub_search_history');
            if (stored) {
                this.searchHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
            this.searchHistory = [];
        }
    }

    /**
     * Clear search cache
     */
    clearCache() {
        this.searchCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.searchCache.size,
            entries: Array.from(this.searchCache.keys())
        };
    }

    /**
     * Destroy search logic
     */
    destroy() {
        // Clear timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Abort ongoing request
        if (this.abortController) {
            this.abortController.abort();
        }

        // Clear cache
        this.clearCache();
    }
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.SearchLogic = SearchLogic;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        SearchLogic: SearchLogic,
        default: SearchLogic
    };
}

// ES6 Export
export { SearchLogic };
export default SearchLogic;

console.log('✅ SearchLogic class exported successfully (CommonJS + ES6 + Global)'); 