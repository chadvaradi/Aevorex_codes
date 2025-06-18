/**
 * FinanceHub News Bubble v3.0.0
 * ENTERPRISE-GRADE News Analysis Component
 * NO PLACEHOLDER DATA - ONLY REAL BACKEND INTEGRATION
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.0.0
 * @date 2025-06-02
 */

class NewsBubble {
    constructor(options = {}) {
        // Configuration
        this.config = {
            containerId: options.containerId || 'news-bubble',
            symbol: options.symbol || 'AAPL',
            refreshInterval: options.refreshInterval || 180000, // 3 minutes
            apiBaseUrl: options.apiBaseUrl || '/api/v1',
            maxNewsItems: options.maxNewsItems || 10,
            debug: options.debug || false
        };

        // State management
        this.state = {
            isLoading: false,
            isInitialized: false,
            currentSymbol: this.config.symbol,
            data: null,
            error: null,
            lastUpdate: null,
            selectedCategory: 'all'
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
            console.log('NewsBubble: Initializing...');
            
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
            console.log('NewsBubble: Initialized successfully');
            this.dispatchEvent('news-initialized');

        } catch (error) {
            console.error('NewsBubble: Initialization failed:', error);
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
            console.error(`NewsBubble: Container '${this.config.containerId}' not found`);
            return false;
        }
        // 🔧 Ensure base styling classes are present – avoids "unstyled" bubble if initial HTML differs
        container.classList.add('fh-analysis-bubble');
        container.classList.add('fh-analysis-bubble--news-highlights');
        return true;
    }

    /**
     * Load news data - VALÓS BACKEND ADATOK
     */
    async loadData() {
        if (this.state.isLoading) {
            console.log('NewsBubble: Data loading already in progress');
            return;
        }

        // 🔍 ENHANCED DEBUG LOGGING
        console.log('📰 News DEBUG: Starting data load process...');
        console.log('🔗 News DEBUG: API Client available:', !!this.apiClient);
        console.log('📈 News DEBUG: Current symbol:', this.state.currentSymbol);

        this.state.isLoading = true;
        this.updateLoadingState(true);
        
        const startTime = performance.now();

        try {
            console.log(`🔄 News DEBUG: Calling backend APIs for ${this.state.currentSymbol}...`);
            console.log('🔄 News DEBUG: Fetching news data from backend...');
            
            // Fetch news data from backend
            const newsData = await this.apiClient.getStockNews(this.state.currentSymbol);
            
            console.log('📊 News DEBUG: Raw news response:', newsData);
            console.log('📋 News DEBUG: News data type:', typeof newsData);
            console.log('📦 News DEBUG: Has news data?', !!newsData);
            console.log('📋 News DEBUG: News array length:', Array.isArray(newsData) ? newsData.length : 'not array');
            
            if (!newsData || (Array.isArray(newsData) && newsData.length === 0)) {
                console.error('❌ News CRITICAL: No news data received!');
                console.error('❌ News CRITICAL: This component requires REAL BACKEND DATA - NO MOCK FALLBACK');
                throw new Error('No news data received from backend - REAL API REQUIRED');
            }

            console.log('✅ News SUCCESS: Received data from backend');
            console.log('📋 News DEBUG: Number of news articles:', Array.isArray(newsData) ? newsData.length : 'single item');

            // Process and validate news data
            this.state.data = this.processNewsData(newsData);
            this.state.lastUpdate = Date.now();
            
            console.log('🎯 News SUCCESS: Data processed successfully');
            console.log('📋 News DEBUG: Processed articles count:', this.state.data?.articles?.length || 0);
            console.log('📋 News DEBUG: Recent articles:', this.state.data?.articles?.slice(0, 3)?.map(a => a.title) || []);
            
            // Update metrics
            this.metrics.loadTime = performance.now() - startTime;
            this.metrics.updates++;
            
            // Render the component
            this.render();
            
            console.log(`⚡ News PERFORMANCE: Load completed in ${this.metrics.loadTime.toFixed(2)}ms`);
            
            this.dispatchEvent('news-loaded', {
                symbol: this.state.currentSymbol,
                loadTime: this.metrics.loadTime,
                articlesCount: this.state.data?.articles?.length || 0
            });

        } catch (error) {
            console.error('🚨 News FATAL ERROR: Failed to load news data');
            console.error('🚨 News ERROR DETAILS:', {
                message: error.message,
                stack: error.stack,
                symbol: this.state.currentSymbol,
                apiClient: !!this.apiClient,
                timestamp: new Date().toISOString()
            });
            console.error('🚨 News NOTE: This component requires REAL BACKEND - NO MOCK FALLBACK EXISTS');
            
            this.handleError(error, 'data-loading');
            
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    /**
     * Process news data - STRICT VALIDATION
     * @param {Object} stockNews - Stock-specific news from API
     * @param {Object} marketNews - Market news from API
     * @returns {Object} Processed news data
     */
    processNewsData(stockNews, marketNews) {
        const processedData = {
            all: [],
            stock: [],
            market: [],
            categories: {
                earnings: [],
                analyst: [],
                general: [],
                market: []
            },
            sentiment: {
                positive: 0,
                negative: 0,
                neutral: 0
            }
        };

        // Process stock-specific news
        if (stockNews && stockNews.news && Array.isArray(stockNews.news)) {
            stockNews.news.forEach(item => {
                const processedItem = this.processNewsItem(item, 'stock');
                if (processedItem) {
                    processedData.stock.push(processedItem);
                    processedData.all.push(processedItem);
                    this.categorizeNews(processedItem, processedData.categories);
                    this.analyzeSentiment(processedItem, processedData.sentiment);
                }
            });
        }

        // Process market news
        if (marketNews && marketNews.news && Array.isArray(marketNews.news)) {
            marketNews.news.forEach(item => {
                const processedItem = this.processNewsItem(item, 'market');
                if (processedItem) {
                    processedData.market.push(processedItem);
                    processedData.all.push(processedItem);
                    this.categorizeNews(processedItem, processedData.categories);
                    this.analyzeSentiment(processedItem, processedData.sentiment);
                }
            });
        }

        // Sort all news by date (newest first)
        processedData.all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        
        // Limit to max items
        processedData.all = processedData.all.slice(0, this.config.maxNewsItems);

        return processedData;
    }

    /**
     * Process individual news item
     * @param {Object} item - Raw news item
     * @param {string} type - News type (stock/market)
     * @returns {Object|null} Processed news item
     */
    processNewsItem(item, type) {
        if (!item || !item.title) {
            return null;
        }

        return {
            id: item.id || this.generateNewsId(item),
            title: item.title,
            summary: item.summary || item.description || this.truncateText(item.title, 150),
            url: item.url || item.link,
            source: item.source || item.publisher || 'Unknown',
            publishedAt: item.published_at || item.publishedAt || item.date || new Date().toISOString(),
            type: type,
            category: this.determineCategory(item),
            sentiment: this.determineSentiment(item),
            relevanceScore: item.relevance_score || this.calculateRelevance(item, type),
            imageUrl: item.image_url || item.image || null,
            author: item.author || null,
            tags: item.tags || [],
            isBreaking: item.is_breaking || false
        };
    }

    /**
     * Generate unique news ID
     * @param {Object} item - News item
     * @returns {string} Generated ID
     */
    generateNewsId(item) {
        const content = (item.title + item.url + item.publishedAt).replace(/\s/g, '');
        return btoa(content).substring(0, 16);
    }

    /**
     * Determine news category
     * @param {Object} item - News item
     * @returns {string} Category
     */
    determineCategory(item) {
        const title = (item.title || '').toLowerCase();
        const summary = (item.summary || item.description || '').toLowerCase();
        const content = title + ' ' + summary;

        if (content.includes('earnings') || content.includes('quarterly') || content.includes('revenue')) {
            return 'earnings';
        }
        if (content.includes('analyst') || content.includes('rating') || content.includes('upgrade') || content.includes('downgrade')) {
            return 'analyst';
        }
        if (content.includes('market') || content.includes('index') || content.includes('economy')) {
            return 'market';
        }
        return 'general';
    }

    /**
     * Determine sentiment
     * @param {Object} item - News item
     * @returns {string} Sentiment
     */
    determineSentiment(item) {
        if (item.sentiment) {
            return item.sentiment;
        }

        const title = (item.title || '').toLowerCase();
        const summary = (item.summary || item.description || '').toLowerCase();
        const content = title + ' ' + summary;

        const positiveWords = ['up', 'rise', 'gain', 'growth', 'positive', 'strong', 'beat', 'exceed', 'upgrade'];
        const negativeWords = ['down', 'fall', 'loss', 'decline', 'negative', 'weak', 'miss', 'downgrade', 'concern'];

        const positiveCount = positiveWords.filter(word => content.includes(word)).length;
        const negativeCount = negativeWords.filter(word => content.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Calculate relevance score
     * @param {Object} item - News item
     * @param {string} type - News type
     * @returns {number} Relevance score (0-1)
     */
    calculateRelevance(item, type) {
        let score = 0.5; // Base score

        // Stock-specific news gets higher relevance
        if (type === 'stock') {
            score += 0.3;
        }

        // Recent news gets higher relevance
        const publishedAt = new Date(item.publishedAt || item.published_at || item.date);
        const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1) score += 0.2;
        else if (hoursAgo < 6) score += 0.1;
        else if (hoursAgo < 24) score += 0.05;

        // Breaking news gets higher relevance
        if (item.is_breaking) {
            score += 0.2;
        }

        return Math.min(1, score);
    }

    /**
     * Categorize news item
     * @param {Object} item - Processed news item
     * @param {Object} categories - Categories object
     */
    categorizeNews(item, categories) {
        if (categories[item.category]) {
            categories[item.category].push(item);
        }
    }

    /**
     * Analyze sentiment
     * @param {Object} item - Processed news item
     * @param {Object} sentiment - Sentiment object
     */
    analyzeSentiment(item, sentiment) {
        if (sentiment[item.sentiment] !== undefined) {
            sentiment[item.sentiment]++;
        }
    }

    /**
     * Render the news bubble
     */
    render() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.state.data) return;

        const data = this.state.data;

        container.innerHTML = `
            <div class="news-content">
                <div class="news-header">
                    <h3>News Highlights</h3>
                    <div class="news-stats">
                        <span class="news-count">${data.all.length} articles</span>
                        <div class="sentiment-indicator">
                            <span class="sentiment positive" title="Positive: ${data.sentiment.positive}">
                                ${data.sentiment.positive}
                            </span>
                            <span class="sentiment neutral" title="Neutral: ${data.sentiment.neutral}">
                                ${data.sentiment.neutral}
                            </span>
                            <span class="sentiment negative" title="Negative: ${data.sentiment.negative}">
                                ${data.sentiment.negative}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="news-filters">
                    <button class="filter-button ${this.state.selectedCategory === 'all' ? 'active' : ''}" 
                            data-category="all">All</button>
                    <button class="filter-button ${this.state.selectedCategory === 'stock' ? 'active' : ''}" 
                            data-category="stock">Stock</button>
                    <button class="filter-button ${this.state.selectedCategory === 'market' ? 'active' : ''}" 
                            data-category="market">Market</button>
                    <button class="filter-button ${this.state.selectedCategory === 'earnings' ? 'active' : ''}" 
                            data-category="earnings">Earnings</button>
                    <button class="filter-button ${this.state.selectedCategory === 'analyst' ? 'active' : ''}" 
                            data-category="analyst">Analyst</button>
                </div>

                <div class="news-list">
                    ${this.renderNewsList()}
                </div>

                <div class="data-footer">
                    <span class="last-update">Updated: ${this.formatTimestamp(this.state.lastUpdate)}</span>
                    <button class="refresh-button" onclick="window.newsBubble?.loadData()">
                        Refresh
                    </button>
                </div>
            </div>
        `;

        // Setup interaction handlers
        this.setupInteractionHandlers();
    }

    /**
     * Render news list based on selected category
     * @returns {string} HTML string
     */
    renderNewsList() {
        let newsItems = [];

        switch (this.state.selectedCategory) {
            case 'all':
                newsItems = this.state.data.all;
                break;
            case 'stock':
                newsItems = this.state.data.stock;
                break;
            case 'market':
                newsItems = this.state.data.market;
                break;
            case 'earnings':
                newsItems = this.state.data.categories.earnings;
                break;
            case 'analyst':
                newsItems = this.state.data.categories.analyst;
                break;
            default:
                newsItems = this.state.data.all;
        }

        if (newsItems.length === 0) {
            return '<div class="no-news">No news available for this category</div>';
        }

        return newsItems.map(item => this.renderNewsItem(item)).join('');
    }

    /**
     * Render individual news item
     * @param {Object} item - News item
     * @returns {string} HTML string
     */
    renderNewsItem(item) {
        const timeAgo = this.formatTimeAgo(item.publishedAt);
        const relevanceClass = this.getRelevanceClass(item.relevanceScore);
        const sentimentClass = `sentiment-${item.sentiment}`;

        return `
            <div class="news-item ${relevanceClass} ${sentimentClass}" data-news-id="${item.id}">
                ${item.isBreaking ? '<div class="breaking-badge">BREAKING</div>' : ''}
                
                <div class="news-item-content">
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span>
                        <span class="news-time">${timeAgo}</span>
                        <span class="news-type">${item.type}</span>
                        <span class="news-category">${item.category}</span>
                    </div>
                    
                    <h4 class="news-title">${item.title}</h4>
                    
                    ${item.summary ? `<p class="news-summary">${item.summary}</p>` : ''}
                    
                    <div class="news-footer">
                        <div class="news-indicators">
                            <span class="sentiment-indicator ${item.sentiment}">${item.sentiment}</span>
                            <span class="relevance-score">Relevance: ${Math.round(item.relevanceScore * 100)}%</span>
                        </div>
                        
                        ${item.url ? `
                            <a href="${item.url}" target="_blank" class="read-more-link" 
                               onclick="event.stopPropagation()">
                                Read More →
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                ${item.imageUrl ? `
                    <div class="news-image">
                        <img src="${item.imageUrl}" alt="${item.title}" loading="lazy">
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Setup interaction handlers
     */
    setupInteractionHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Filter button handlers
        const filterButtons = container.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.dataset.category;
                this.changeCategory(category);
            });
        });

        // News item click handlers
        const newsItems = container.querySelectorAll('.news-item');
        newsItems.forEach(item => {
            item.addEventListener('click', () => {
                const newsId = item.dataset.newsId;
                this.showNewsDetail(newsId);
            });
        });

        // External link handlers
        const readMoreLinks = container.querySelectorAll('.read-more-link');
        readMoreLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                this.trackNewsClick(link.href);
            });
        });
    }

    /**
     * Change news category
     * @param {string} category - New category
     */
    changeCategory(category) {
        if (category === this.state.selectedCategory) return;

        console.log(`NewsBubble: Changing category to ${category}`);
        this.state.selectedCategory = category;
        
        // Re-render with new category
        this.render();
        
        this.dispatchEvent('news-category-changed', { category });
    }

    /**
     * Show news detail
     * @param {string} newsId - News item ID
     */
    showNewsDetail(newsId) {
        const newsItem = this.findNewsItem(newsId);
        if (newsItem) {
            console.log(`NewsBubble: News detail requested for ${newsId}`);
            this.dispatchEvent('news-detail-requested', { newsItem });
        }
    }

    /**
     * Find news item by ID
     * @param {string} newsId - News item ID
     * @returns {Object|null} News item
     */
    findNewsItem(newsId) {
        return this.state.data.all.find(item => item.id === newsId) || null;
    }

    /**
     * Track news click
     * @param {string} url - News URL
     */
    trackNewsClick(url) {
        console.log(`NewsBubble: News link clicked: ${url}`);
        this.dispatchEvent('news-link-clicked', { url });
    }

    /**
     * Change symbol
     * @param {string} symbol - New symbol
     */
    async changeSymbol(symbol) {
        if (!symbol || symbol === this.state.currentSymbol) {
            return;
        }

        console.log(`NewsBubble: Changing symbol from ${this.state.currentSymbol} to ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.data = null;
        this.state.selectedCategory = 'all';
        
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
                console.log('NewsBubble: Auto-refreshing data...');
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
            <div class="news-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading news...</div>
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
        console.error(`NewsBubble Error [${context}]:`, {
            error: error.message,
            stack: error.stack,
            symbol: this.state.currentSymbol,
            timestamp: new Date().toISOString(),
            metrics: this.metrics
        });
        
        // Show error message to user
        this.showErrorMessage(error.message, context);
        
        // Dispatch error event for centralized handling
        this.dispatchEvent('news-error', {
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
            'initialization': 'Failed to initialize news component',
            'data-loading': 'Unable to load news data from server',
            'api-error': 'News API temporarily unavailable',
            'network-error': 'Network connection error - check internet connection'
        };

        const userMessage = contextMessages[context] || 'An error occurred while loading news';

        container.innerHTML = `
            <div class="news-error-state">
                <div class="error-header">
                    <div class="error-icon">⚠️</div>
                    <h3>News Unavailable</h3>
                </div>
                <div class="error-content">
                    <p class="error-message">${userMessage}</p>
                    <p class="error-details">Error: ${message}</p>
                    <div class="error-actions">
                        <button class="retry-button" onclick="window.newsBubble?.loadData()">
                            🔄 Retry Loading
                        </button>
                        <button class="refresh-page-button" onclick="window.location.reload()">
                            ↻ Refresh Page
                        </button>
                    </div>
                </div>
                <div class="error-footer">
                    <span class="error-time">Error occurred at: ${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        `;
    }

    // Utility methods
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getRelevanceClass(score) {
        if (score >= 0.8) return 'high-relevance';
        if (score >= 0.6) return 'medium-relevance';
        return 'low-relevance';
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
        console.log('NewsBubble: Destroying...');
        
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
            lastUpdate: null,
            selectedCategory: 'all'
        };
        
        console.log('NewsBubble: Destroyed');
    }
}

// Export for global use
window.NewsBubble = NewsBubble;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsBubble;
}

// ES6 export for modern modules
export { NewsBubble };
export default NewsBubble;

console.log('✅ NewsBubble exported successfully (CommonJS + ES6 + Global)');

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('news-bubble');
    if (container && !window.newsBubble) {
        console.log('NewsBubble: Auto-initializing...');
        window.newsBubble = new NewsBubble();
    }
}); 