/**
 * FinanceHub Market News Component v20.0.0
 * Displays market news and sentiment analysis
 */

class MarketNewsComponent {
    constructor() {
        this.container = document.getElementById('market-news');
        this.newsList = document.getElementById('news-list');
        this.currentSymbol = window.currentSymbol || 'AAPL';
        this.isLoading = false;
        
        this.init();
    }
    
    async init() {
        console.log('📰 MarketNewsComponent V20.0.0 initializing...');
        
        try {
            await this.setupContainer();
            if (this.currentSymbol) {
                await this.loadNewsData(this.currentSymbol);
            }
        } catch (error) {
            console.error('[MarketNews] Initialization failed:', error);
            this.showErrorMessage('Failed to initialize news component');
        }
        
        console.log('✅ MarketNewsComponent V20.0.0 initialized');
    }
    
    setupElements() {
        if (!this.container) {
            console.warn('⚠️ Market news container not found');
            return;
        }
        
        if (!this.newsList) {
            this.newsList = this.container.querySelector('.news-list');
        }
    }
    
    bindEvents() {
        // Listen for ticker changes
        document.addEventListener('tickerChange', (event) => {
            this.handleTickerChange(event);
        });
        
        // Refresh news every 5 minutes
        setInterval(() => {
            this.refreshNews();
        }, 300000);
    }
    
    /**
     * Handle ticker events from TickerSync
     */
    handleTickerChange(event) {
        const { symbol, stockData } = event.detail;
        
        console.log('[MarketNews] Ticker changed to:', symbol, stockData);
        
        // Always load fresh news data for the symbol
        this.loadNewsData(symbol);
    }
    
    /**
     * Load news data from API
     */
    async loadNewsData(ticker) {
        if (!ticker || this.isLoading) return;
        
        this.currentSymbol = ticker;
        this.isLoading = true;
        this.showLoading();
        
        try {
            this.log('Loading news data...');
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker });
            
            this.log(`Making API request to: ${newsURL}`);
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const newsData = await response.json();
            
            if (!newsData || (!newsData.news && !newsData.articles)) {
                throw new Error('No news data received from backend');
            }
            
            this.renderNews(newsData.news || newsData.articles || []);
            
        } catch (error) {
            console.error('❌ Failed to load news from API - backend integration required:', error);
            this.showErrorMessage('Unable to load market news. Backend API integration is required.');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadNews() {
        if (!this.currentSymbol || this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            console.log(`📰 Loading news for ${this.currentSymbol}...`);
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker: this.currentSymbol });
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const newsData = await response.json();
                // Handle the response format from working_endpoints.py
                this.renderNews(newsData.news || newsData.articles || []);
            } else {
                throw new Error('API request failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load news from API - backend integration required:', error);
            this.showErrorMessage('Unable to load market news. Backend API integration is required.');
        } finally {
            this.isLoading = false;
        }
    }
    
    async refreshNews() {
        if (!this.isLoading) {
            console.log('🔄 Refreshing market news...');
            await this.loadNews();
        }
    }
    
    renderNews(articles) {
        try {
            console.log('📰 Rendering news with articles:', articles);
            
            if (!articles || !Array.isArray(articles) || articles.length === 0) {
                this.showErrorMessage('No recent news available for this stock');
                return;
            }

            // Clear loading state
            this.newsContainer.classList.remove('loading');
            
            // Create news HTML
            const newsHTML = articles.slice(0, 5).map(article => this.createNewsItem(article)).join('');
            
            this.newsContainer.innerHTML = `
                <div class="news-header">
                    <h3>Latest News</h3>
                    <div class="news-meta">
                        <span class="news-count">${articles.length} articles</span>
                        <button class="refresh-btn" onclick="window.financeApp?.components?.marketNews?.refreshNews()">
                            <i class="icon-refresh"></i>
                        </button>
                    </div>
                </div>
                <div class="news-list">
                    ${newsHTML}
                </div>
            `;
            
            this.addNewsInteractivity();
            this.updateBubbleStatus('loaded');
            
        } catch (error) {
            console.error('❌ Error rendering news:', error);
            this.showErrorMessage('Failed to display news articles');
        }
    }
    
    createNewsItem(article) {
        try {
            // Handle different API response formats
            const title = article.title || article.headline || 'Untitled';
            const summary = article.summary || article.description || 'No summary available';
            const source = article.publisher || article.source?.name || article.source || 'Unknown Source';
            const publishedAt = article.published_at || article.datetime || article.pubDate || new Date().toISOString();
            const url = article.url || article.link || '#';
            const imageUrl = article.image_url || article.thumbnail || null;
            
            const timeAgo = this.formatTime(publishedAt);
            const escapedTitle = this.escapeHtml(title);
            const escapedSummary = this.escapeHtml(summary);
            const escapedSource = this.escapeHtml(source);
            
            return `
                <div class="news-item" data-url="${url}">
                    ${imageUrl ? `<div class="news-image"><img src="${imageUrl}" alt="${escapedTitle}" loading="lazy" /></div>` : ''}
                    <div class="news-content">
                        <h4 class="news-title">${escapedTitle}</h4>
                        <p class="news-summary">${escapedSummary}</p>
                        <div class="news-meta">
                            <span class="news-source">${escapedSource}</span>
                            <span class="news-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Error creating news item:', error);
            return `
                <div class="news-item error">
                    <div class="news-content">
                        <h4 class="news-title">Error loading article</h4>
                        <p class="news-summary">Failed to display this news item</p>
                    </div>
                </div>
            `;
        }
    }
    
    addNewsInteractivity() {
        try {
            // Remove existing listeners
            this.newsContainer.removeEventListener('click', this.newsClickHandler);
            
            // Add click handler for news items
            this.newsClickHandler = (event) => {
                const newsItem = event.target.closest('.news-item');
                if (newsItem && newsItem.dataset.url && newsItem.dataset.url !== '#') {
                    event.preventDefault();
                    window.open(newsItem.dataset.url, '_blank', 'noopener,noreferrer');
                }
            };
            
            this.newsContainer.addEventListener('click', this.newsClickHandler);
            
            console.log('✅ News interactivity added');
        } catch (error) {
            console.error('❌ Error adding news interactivity:', error);
        }
    }
    
    showLoading() {
        this.newsContainer.innerHTML = `
            <div class="news-loading">
                <div class="loading-spinner"></div>
                <span>Loading latest news...</span>
            </div>
        `;
        this.newsContainer.classList.add('loading');
    }
    
    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInMilliseconds = now - date;
            const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);

            if (diffInMinutes < 1) return 'Just now';
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            if (diffInHours < 24) return `${diffInHours}h ago`;
            if (diffInDays < 7) return `${diffInDays}d ago`;
            
            // For older articles, show the actual date
            return date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting time:', error);
            return 'Unknown time';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateBubbleStatus(status) {
        const statusIndicator = this.container?.querySelector('.bubble-status');
        if (statusIndicator) {
            statusIndicator.textContent = status;
            statusIndicator.className = `bubble-status status-${status.toLowerCase()}`;
        }
    }
    
    getCurrentData() {
        return {
            symbol: this.currentSymbol,
            lastUpdate: new Date().toISOString(),
            newsCount: this.newsList?.children.length || 0
        };
    }
    
    getState() {
        return {
            isLoading: this.isLoading,
            currentSymbol: this.currentSymbol,
            hasData: this.newsList?.children.length > 0
        };
    }
    
    destroy() {
        console.log('🧹 MarketNewsComponent cleanup');
        // Cleanup if needed
    }
    
    updateNews(newsData) {
        this.renderNews(newsData);
    }
    
    showError(message) {
        if (this.newsList) {
            this.newsList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">📰</div>
                    <h4>Unable to load news</h4>
                    <p>${message}</p>
                    <button onclick="this.refreshNews()" class="retry-btn">Try Again</button>
                </div>
            `;
        }
    }
    
    /**
     * Show error message when news data cannot be loaded
     */
    showErrorMessage(message) {
        this.newsContainer.innerHTML = `
            <div class="news-error">
                <div class="error-icon">⚠️</div>
                <h4>Unable to load news</h4>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.financeApp?.components?.marketNews?.refreshNews()">
                    Try Again
                </button>
            </div>
        `;
        this.updateBubbleStatus('error');
    }
    
    async setupContainer() {
        // Initialize the news container if it doesn't exist
        if (!this.newsContainer) {
            const newsBubble = document.querySelector('.bubble-news-highlights .bubble-content') || 
                             document.querySelector('[data-bubble="news-highlights"] .bubble-content');
            if (newsBubble) {
                this.newsContainer = newsBubble;
            }
        }
    }
    
    async updateSymbol(symbol) {
        this.currentSymbol = symbol;
        console.log(`📰 MarketNews: Updating to symbol ${symbol}`);
        await this.loadNewsData(symbol);
    }

    async loadMoreNews() {
        try {
            const ticker = this.state.selectedTicker;
            if (!ticker) return;
            
            this.log('Loading more news...');
            
            // 🎯 KÖZPONTI API URL használata
            const newsURL = getAPIURL('/api/v1/stock/news/{ticker}', { ticker });
            
            const response = await fetch(newsURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const newsData = await response.json();
                this.renderNews(newsData.news || newsData.articles || []);
            } else {
                throw new Error('API request failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load more news:', error);
            this.showErrorMessage('Unable to load more news');
        }
    }
}

console.log('📰 MarketNewsComponent V20.0.0 loaded');

// Export to global window object
if (typeof window !== 'undefined') {
    window.MarketNewsComponent = MarketNewsComponent;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketNewsComponent;
}

// ES6 export for modern modules
export { MarketNewsComponent };
export default MarketNewsComponent;

console.log('✅ MarketNewsComponent exported successfully (CommonJS + ES6 + Global)'); 