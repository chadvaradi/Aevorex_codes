/**
 * AEVOREX Research Platform - Professional Equity Analysis
 * AI-Powered Research Platform with Real Backend Data
 * Integrated from stockanalysis for modular architecture
 * @version 6.1.0
 * @author AEVOREX Team
 */

class AevorexResearchPlatform {
    constructor(config = {}) {
        this.config = {
            API_BASE: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1' : 'http://localhost:8084/api/v1',
            WEBSOCKET_URL: config.WEBSOCKET_URL || 'ws://localhost:8001/ws',
            AUTO_REFRESH_INTERVAL: config.AUTO_REFRESH_INTERVAL || 30000, // 30 seconds
            CHART_UPDATE_INTERVAL: config.CHART_UPDATE_INTERVAL || 10000,  // 10 seconds
            DEBUG: config.DEBUG || false,
            ANIMATION_DURATION: config.ANIMATION_DURATION || 300,
            UPDATE_INTERVALS: {
                ticker: 15000,
                chat: 5000,
                bubbles: 10000
            },
            CACHE_TTL: 300000
        };

        this.state = {
            currentSymbol: null,
            currentData: null,
            isLoading: false,
            error: null,
            currentNewsIndex: 0,
            newsItems: [],
            marketData: [],
            isTyping: false,
            searchTimeout: null,
            userInteracted: false,
            chartWidget: null,
            intervals: {
                ticker: null,
                chart: null
            }
        };

        this.elements = {};
        this.eventBus = new EventTarget();
    }

    // === ENHANCED DEBOUNCE UTILITY ===
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // === INITIALIZATION ===
    async initialize() {
        try {
            console.log("🚀 Initializing Aevorex Research Platform v6.1.0");
            
            // DOM Elements
            this.cacheElements();
            
            // Event Listeners  
            this.setupEventListeners();
            
            // Initialize UI Components
            this.initializeChatInterface();
            
            // Start background services
            this.startBackgroundServices();
            
            // Hide loading screen
            setTimeout(() => this.hideLoadingScreen(), 2000);
            
            console.log("✅ Platform initialization complete");
            this.eventBus.dispatchEvent(new CustomEvent('platform:ready'));
            
        } catch (error) {
            console.error("❌ Platform initialization failed:", error);
            this.showError("Failed to initialize platform: " + error.message);
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    startBackgroundServices() {
        // Start market ticker updates
        this.startMarketTicker();
        
        // Auto-update intervals
        this.state.intervals.ticker = setInterval(() => {
            this.loadMarketTickerData();
        }, this.config.UPDATE_INTERVALS.ticker);
    }

    cacheElements() {
        console.log("📦 Caching DOM elements...");
        
        const safeCache = (id, description) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`⚠️ Element not found: ${id} (${description})`);
            }
            return element;
        };

        // Core elements
        this.elements = {
            // Search elements
            symbolSearch: safeCache('symbol-search', 'Header search'),
            heroSearch: safeCache('hero-search', 'Hero search'),
            analyzeBtn: safeCache('analyze-btn', 'Analyze button'),
            searchSuggestions: safeCache('search-suggestions', 'Search suggestions'),
            
            // State containers
            welcomeState: safeCache('welcome-state', 'Welcome state'),
            analysisDashboard: safeCache('analysis-dashboard', 'Analysis dashboard'),
            
            // Market ticker
            marketBanner: safeCache('market-banner', 'Market banner'),
            marketTickerContent: safeCache('market-ticker-content', 'Market ticker content'),
            
            // Company header
            companySymbolDisplay: safeCache('company-symbol-display', 'Company symbol'),
            companyNameDisplay: safeCache('company-name-display', 'Company name'),
            companyDescription: safeCache('company-description', 'Company description'),
            currentPriceValue: safeCache('current-price-value', 'Current price'),
            priceChangeValue: safeCache('price-change-value', 'Price change'),
            priceChangePercent: safeCache('price-change-percent', 'Price change percent'),
            
            // Market metrics
            volumeValue: safeCache('volume-value', 'Volume'),
            marketCapValue: safeCache('market-cap-value', 'Market cap'),
            peRatio: safeCache('pe-ratio', 'P/E ratio'),
            weekHigh: safeCache('week-high', '52W high'),
            
            // Chart elements
            priceChart: safeCache('price-chart', 'Price chart'),
            tradingviewChart: safeCache('tradingview_chart', 'TradingView chart'),
            chartLoading: safeCache('chart-loading', 'Chart loading'),
            chartPlaceholder: safeCache('chart-placeholder', 'Chart placeholder'),
            chartError: safeCache('chart-error', 'Chart error'),
            
            // Chat elements
            chatMessagesMain: safeCache('chat-messages-main', 'Chat messages'),
            chatInputMain: safeCache('chat-input-main', 'Chat input'),
            sendChatMain: safeCache('send-chat-main', 'Send chat button'),
            clearChatMain: safeCache('clear-chat-main', 'Clear chat button'),
            
            // Company overview
            companyOverviewContent: safeCache('company-overview-content', 'Company overview content')
        };
    }

    setupEventListeners() {
        console.log("🔗 Setting up event listeners...");
        
        const safeAddListener = (element, event, handler, description) => {
            if (element) {
                element.addEventListener(event, handler);
                console.log(`✅ Event listener added: ${description}`);
            } else {
                console.warn(`⚠️ Cannot add listener: ${description} - element not found`);
            }
        };

        // Search functionality
        safeAddListener(this.elements.symbolSearch, 'input', 
            this.debounce(() => this.handleSymbolSearch(), 300), 'Symbol search input');
        
        safeAddListener(this.elements.heroSearch, 'input', 
            this.debounce(() => this.handleSymbolSearch(), 300), 'Hero search input');
        
        safeAddListener(this.elements.analyzeBtn, 'click', 
            () => this.handleSymbolSearch(), 'Analyze button click');

        // Chat functionality
        safeAddListener(this.elements.sendChatMain, 'click', 
            () => this.sendMainChatMessage(), 'Send chat button');
        
        safeAddListener(this.elements.chatInputMain, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMainChatMessage();
            }
        }, 'Chat input enter key');

        safeAddListener(this.elements.clearChatMain, 'click', 
            () => this.clearMainChat(), 'Clear chat button');

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case '/':
                        e.preventDefault();
                        this.focusChat();
                        break;
                }
            }
        });
    }

    // === MARKET TICKER FUNCTIONALITY ===
    async startMarketTicker() {
        console.log("📊 Starting market ticker...");
        await this.loadMarketTickerData();
    }

    async loadMarketTickerData() {
        try {
            const api = window.FinanceHubAPIService;
            if (!api || typeof api.getTickerTapeData !== 'function') {
                throw new Error('FinanceHubAPIService unavailable');
            }

            const data = await api.getTickerTapeData(30, false);
            if (Array.isArray(data) && data.length) {
                this.updateMarketTicker(data);
            } else {
                this.initializeFallbackTicker();
            }
        } catch (error) {
            console.warn("⚠️ Market ticker data failed, using fallback:", error);
            this.initializeFallbackTicker();
        }
    }

    initializeFallbackTicker() {
        console.warn("⚠️ Market ticker API failed - showing empty state instead of fallback data");
        this.showEmptyMarketTicker();
    }

    showEmptyMarketTicker() {
        if (!this.elements.marketTickerContent) return;
        
        this.elements.marketTickerContent.innerHTML = `
            <div class="ticker-empty-state">
                <div class="ticker-empty-icon">📡</div>
                <div class="ticker-empty-text">Market data unavailable</div>
                <button class="ticker-retry-btn" onclick="this.loadMarketTickerData()">
                    Retry
                </button>
            </div>
        `;
    }

    updateMarketTicker(data) {
        if (!this.elements.marketTickerContent) return;
        
        const tickerHTML = data.map(item => `
            <div class="ticker-item" data-symbol="${item.symbol}">
                <span class="ticker-symbol">${item.symbol}</span>
                <span class="ticker-price">$${item.price.toFixed(2)}</span>
                <span class="ticker-change ${item.change >= 0 ? 'positive' : 'negative'}">
                    ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} 
                    (${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%)
                </span>
            </div>
        `).join('');
        
        this.elements.marketTickerContent.innerHTML = tickerHTML;
        this.startTickerAnimation();
        
        // Add click handlers for ticker items
        this.elements.marketTickerContent.querySelectorAll('.ticker-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                this.startAnalysis(symbol);
            });
        });
    }

    startTickerAnimation() {
        if (!this.elements.marketTickerContent) return;
        
        const content = this.elements.marketTickerContent;
        content.style.animation = 'none';
        content.offsetHeight; // Trigger reflow
        content.style.animation = 'scroll-ticker 60s linear infinite';
    }

    // === CHAT INTERFACE ===
    initializeChatInterface() {
        console.log("💬 Initializing chat interface...");
        this.setupMainChatEventListeners();
        this.initializeMainChatWelcome();
    }

    setupMainChatEventListeners() {
        // Auto-resize textarea
        if (this.elements.chatInputMain) {
            this.elements.chatInputMain.addEventListener('input', () => {
                this.autoResizeMainTextarea();
                this.updateMainChatSendButton();
            });
        }
    }

    initializeMainChatWelcome() {
        if (!this.elements.chatMessagesMain) return;
        
        const welcomeMessage = `
            <div class="chat-message assistant" data-message-id="welcome">
                <div class="chat-message-avatar">
                    <div class="ai-icon">🤖</div>
                </div>
                <div class="chat-message-content">
                    <p>Üdvözöllek az AEVOREX AI Elemzőben! 👋</p>
                    <p>Kérdezz bármit a részvényekről, piacokról vagy befektetésekről. Segítek elemezni a pénzügyi adatokat és trendeket.</p>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.innerHTML = welcomeMessage;
    }

    async sendMainChatMessage() {
        const input = this.elements.chatInputMain;
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';
        this.updateMainChatSendButton();
        this.autoResizeMainTextarea();

        // Add user message
        this.addMainChatMessage('user', message);

        // Add typing indicator
        const typingId = this.addMainChatTypingIndicator();

        try {
            // Send to backend with streaming
            const currentTicker = this.state.currentSymbol || (this.elements && this.elements.companySymbolDisplay ? this.elements.companySymbolDisplay.textContent.trim() : '');
            const response = await this.sendChatMessageToBackend(message);
            
            // Remove typing indicator
            this.removeMainChatTypingIndicator(typingId);
            
            // Add AI response with streaming effect
            this.addMainChatMessage('assistant', response, true);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.removeMainChatTypingIndicator(typingId);
            this.addMainChatMessage('assistant', 'Sajnálom, hiba történt. Kérlek próbáld újra később.');
        }
    }

    addMainChatMessage(role, content, useStreaming = false) {
        if (!this.elements.chatMessagesMain) return;

        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const avatarIcon = role === 'user' ? '👤' : '🤖';
        
        const messageHTML = `
            <div class="chat-message ${role}" data-message-id="${messageId}">
                <div class="chat-message-avatar">
                    <div class="ai-icon">${avatarIcon}</div>
                </div>
                <div class="chat-message-content">
                    <div class="message-text" id="content-${messageId}">
                        ${useStreaming ? '' : this.formatMainChatContent(content)}
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.insertAdjacentHTML('beforeend', messageHTML);
        
        if (useStreaming) {
            this.simulateTyping(messageId, content);
        }
        
        this.scrollMainChatToBottom();
    }

    async simulateTyping(messageId, finalContent) {
        const contentElement = document.getElementById(`content-${messageId}`);
        if (!contentElement) return;

        const words = finalContent.split(' ');
        let currentText = '';
        
        for (let i = 0; i < words.length; i++) {
            currentText += (i > 0 ? ' ' : '') + words[i];
            contentElement.innerHTML = this.formatMainChatContent(currentText) + 
                '<span class="typing-cursor">|</span>';
            
            await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
        
        // Remove cursor and finalize
        contentElement.innerHTML = this.formatMainChatContent(finalContent);
    }

    formatMainChatContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    addMainChatTypingIndicator() {
        const typingId = `typing-${Date.now()}`;
        const typingHTML = `
            <div class="chat-message assistant typing-indicator" data-typing-id="${typingId}">
                <div class="chat-message-avatar">
                    <div class="ai-icon">🤖</div>
                </div>
                <div class="chat-message-content">
                    <div class="typing-animation">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        this.elements.chatMessagesMain.insertAdjacentHTML('beforeend', typingHTML);
        this.scrollMainChatToBottom();
        
        return typingId;
    }

    removeMainChatTypingIndicator(typingId) {
        const typingElement = document.querySelector(`[data-typing-id="${typingId}"]`);
        if (typingElement) {
            typingElement.remove();
        }
    }

    scrollMainChatToBottom() {
        if (this.elements.chatMessagesMain) {
            this.elements.chatMessagesMain.scrollTop = this.elements.chatMessagesMain.scrollHeight;
        }
    }

    updateMainChatSendButton() {
        if (!this.elements.sendChatMain || !this.elements.chatInputMain) return;
        
        const hasContent = this.elements.chatInputMain.value.trim().length > 0;
        this.elements.sendChatMain.disabled = !hasContent;
        this.elements.sendChatMain.classList.toggle('enabled', hasContent);
    }

    autoResizeMainTextarea() {
        const textarea = this.elements.chatInputMain;
        if (!textarea) return;
        
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    clearMainChat() {
        if (this.elements.chatMessagesMain) {
            this.elements.chatMessagesMain.innerHTML = '';
            this.initializeMainChatWelcome();
        }
    }

    async sendChatMessageToBackend(message) {
        const currentTicker = this.state.currentSymbol || (this.elements && this.elements.companySymbolDisplay ? this.elements.companySymbolDisplay.textContent.trim() : '');
        const response = await fetch(`${this.config.API_BASE}/stock/chat/${currentTicker}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                symbol: this.state.currentSymbol,
                context: 'financial_analysis'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.response || 'Sajnálom, nem tudok válaszolni erre a kérdésre.';
    }

    // === SYMBOL SEARCH & ANALYSIS ===
    async handleSymbolSearch() {
        const searchInput = this.elements.symbolSearch || this.elements.heroSearch;
        if (!searchInput) return;

        const query = searchInput.value.trim().toUpperCase();
        if (!query) return;

        await this.startAnalysis(query);
    }

    async startAnalysis(symbol) {
        console.log(`🔍 Starting analysis for ${symbol}`);
        
        this.state.currentSymbol = symbol;
        this.state.isLoading = true;
        
        // Show analysis view
        this.showAnalysisView();
        
        try {
            // Load data in parallel
            const [companyData, priceData, newsData] = await Promise.allSettled([
                this.loadCompanyData(symbol),
                this.loadPriceData(symbol),
                this.loadNewsData(symbol)
            ]);

            // Update UI with loaded data
            if (companyData.status === 'fulfilled') {
                this.updateCompanyHeader(companyData.value);
            }
            
            if (priceData.status === 'fulfilled') {
                this.updatePriceData(priceData.value);
            }
            
            if (newsData.status === 'fulfilled') {
                this.renderNews(newsData.value);
            }

            // Load AI analysis
            await this.loadAIAnalysis(symbol);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showAnalysisError(error);
        } finally {
            this.state.isLoading = false;
        }
    }

    showAnalysisView() {
        if (this.elements.welcomeState) {
            this.elements.welcomeState.style.display = 'none';
        }
        if (this.elements.analysisDashboard) {
            this.elements.analysisDashboard.style.display = 'block';
        }
    }

    async loadCompanyData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}`);
        if (!response.ok) throw new Error(`Failed to load company data: ${response.status}`);
        return await response.json();
    }

    async loadPriceData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}/price`);
        if (!response.ok) throw new Error(`Failed to load price data: ${response.status}`);
        return await response.json();
    }

    async loadNewsData(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/${symbol}/news`);
        if (!response.ok) throw new Error(`Failed to load news data: ${response.status}`);
        return await response.json();
    }

    async loadAIAnalysis(symbol) {
        const response = await fetch(`${this.config.API_BASE}/stock/chat/${symbol}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: "Give me a comprehensive analysis of this stock",
                history: []
            })
        });
        if (!response.ok) throw new Error(`Failed to load AI analysis: ${response.status}`);
        const data = await response.json();
        this.renderAIAnalysis(data);
    }

    // === UI UPDATE METHODS ===
    updateCompanyHeader(data) {
        if (this.elements.companySymbolDisplay) {
            this.elements.companySymbolDisplay.textContent = data.symbol || '';
        }
        if (this.elements.companyNameDisplay) {
            this.elements.companyNameDisplay.textContent = data.name || '';
        }
        if (this.elements.companyDescription) {
            this.elements.companyDescription.textContent = data.description || '';
        }
    }

    updatePriceData(data) {
        if (this.elements.currentPriceValue) {
            this.elements.currentPriceValue.textContent = `$${data.price?.toFixed(2) || '0.00'}`;
        }
        if (this.elements.priceChangeValue) {
            const change = data.change || 0;
            this.elements.priceChangeValue.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)}`;
            this.elements.priceChangeValue.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
        if (this.elements.priceChangePercent) {
            const changePercent = data.changePercent || 0;
            this.elements.priceChangePercent.textContent = `(${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
        }
    }

    renderNews(newsItems) {
        // Implementation for news rendering
        console.log('📰 Rendering news:', newsItems);
    }

    renderAIAnalysis(data) {
        // Implementation for AI analysis rendering
        console.log('🤖 Rendering AI analysis:', data);
    }

    showAnalysisError(error) {
        console.error('Analysis error:', error);
        this.showError('Failed to load analysis data. Please try again.');
    }

    // === UTILITY METHODS ===
    focusSearch() {
        const searchInput = this.elements.symbolSearch || this.elements.heroSearch;
        if (searchInput) {
            searchInput.focus();
        }
    }

    focusChat() {
        if (this.elements.chatInputMain) {
            this.elements.chatInputMain.focus();
        }
    }

    showError(message) {
        // Create or update error notification
        console.error('Error:', message);
        
        // You can implement a toast notification system here
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // === PUBLIC API ===
    getState() {
        return { ...this.state };
    }

    getCurrentSymbol() {
        return this.state.currentSymbol;
    }

    addEventListener(event, callback) {
        this.eventBus.addEventListener(event, callback);
    }

    removeEventListener(event, callback) {
        this.eventBus.removeEventListener(event, callback);
    }

    destroy() {
        // Clear intervals
        Object.values(this.state.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        
        // Remove event listeners
        // Implementation depends on how you track them
        
        console.log('🧹 Research platform destroyed');
    }
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AevorexResearchPlatform;
}

// Global availability
window.AevorexResearchPlatform = AevorexResearchPlatform;

// ES6 export for modern modules (Added for structural consistency)
export { AevorexResearchPlatform };
export default AevorexResearchPlatform;

console.log('✅ AevorexResearchPlatform exported successfully (CommonJS + ES6 + Global)'); 