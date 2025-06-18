/**
 * @file chat-core.js - Chat Core Logic Module
 * @description Core functionality for the chat component
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat Core Module
 * Handles core chat functionality, state management, and API communication
 */
class ChatCore {
    constructor(options = {}) {
        // Configuration
        this.config = {
            enableStreaming: options.enableStreaming !== false,
            enableAutoSummary: options.enableAutoSummary !== false,
            maxHistoryLength: options.maxHistoryLength || 50,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 2000,
            autoSummaryTrigger: options.autoSummaryTrigger || 'symbolChange'
        };
        
        // State
        this.state = {
            isInitialized: false,
            isStreaming: false,
            currentChatId: null,
            messages: [],
            context: {
                ticker: 'AAPL',
                lastUpdate: null,
                userPreferences: {}
            },
            currentModelId: (window.FINBOT_DEFAULT_MODEL_ID || 'google/gemini-2.0-flash-001'),
            retryCount: 0,
            errors: []
        };
        
        // Performance metrics
        this.metrics = {
            messageCount: 0,
            averageResponseTime: 0,
            streamingTokens: 0,
            errorCount: 0
        };
        
        // Event system
        this.eventListeners = new Map();
        
        console.log('🧠 ChatCore initialized');
    }
    
    /**
     * Initialize core functionality
     */
    async init() {
        try {
            console.log('🔧 Initializing ChatCore...');
            
            // Listen for model change events from UI
            window.addEventListener('fh-model-changed', (e) => {
                this.state.currentModelId = e.detail.modelId;
                console.log('🤖 ChatCore received model change:', this.state.currentModelId);
            });
            
            // Generate initial chat ID
            this.state.currentChatId = this.generateChatId();
            
            this.state.isInitialized = true;
            console.log('✅ ChatCore initialized successfully');
            
            // Emit ready event
            this.emit('core-ready', { component: 'chat-core' });
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatCore:', error);
            this.handleError(error, 'core-initialization');
            throw error;
        }
    }
    
    /**
     * Legacy alias to maintain compatibility with integrator code expecting initialize()
     */
    async initialize() {
        return this.init();
    }
    
    /**
     * Send message to API
     */
    async sendMessage(message) {
        if (!message?.trim()) {
            throw new Error('Message cannot be empty');
        }
        
        const startTime = performance.now();
        
        try {
            console.log('📤 Sending message to API:', message);
            
            // Add user message to state
            const userMessage = this.addMessage('user', message);
            
            // Prepare request data
            const ticker = this.state.context?.ticker || '';
            if (!ticker) {
                throw new Error('Ticker symbol missing from chat context');
            }
            const baseURL = (window.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
            const apiUrl = `${baseURL}/api/v1/stock/chat/${ticker}`;
            const requestData = {
                question: message.trim(),
                history: this.state.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
                ticker: ticker,
                config_override: { model: this.state.currentModelId },
                // attachments and future overrides can be added conditionally
            };
            
            // Send to API
            const response = await this.callAPI(requestData);
            
            // Calculate response time
            const responseTime = performance.now() - startTime;
            this.updateMetrics('responseTime', responseTime);
            
            return response;
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.handleError(error, 'message-sending');
            throw error;
        }
    }
    
    /**
     * Call API endpoint
     */
    async callAPI(requestData) {
        const ticker = this.state.context?.ticker || '';
        if (!ticker) {
            throw new Error('Ticker symbol missing from chat context');
        }
        const baseURL = (window.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
        const apiUrl = `${baseURL}/api/v1/stock/chat/${ticker}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            console.error('❌ API call failed:', error);
            throw error;
        }
    }
    
    /**
     * Add message to state
     */
    addMessage(role, content, metadata = {}) {
        const message = {
            id: this.generateMessageId(),
            role: role,
            content: content,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };
        
        this.state.messages.push(message);
        this.updateMetrics('messageCount', this.state.messages.length);
        
        // Emit message added event
        this.emit('message-added', { message });
        this.emit('messageAdded', message);
        
        return message;
    }
    
    /**
     * Update message content (for streaming)
     */
    updateMessage(messageId, content) {
        const message = this.state.messages.find(m => m.id === messageId);
        if (message) {
            message.content = content;
            message.lastUpdated = new Date().toISOString();
            
            // Emit message updated event in both naming styles for compatibility
            this.emit('message-updated', { message }); // primary kebab-case
            this.emit('messageUpdated', messageId, content); // camelCase legacy
        }
    }
    
    /**
     * Set context (ticker, user preferences, etc.)
     */
    setContext(newContext) {
        const previousContext = { ...this.state.context };
        this.state.context = { ...this.state.context, ...newContext };
        
        console.log('🔄 Context updated:', this.state.context);
        
        // Emit context changed event
        this.emit('context-changed', { 
            previous: previousContext, 
            current: this.state.context 
        });
        
        // Trigger auto-summary if ticker changed
        if (this.config.enableAutoSummary && 
            previousContext.ticker !== this.state.context.ticker) {
            this.emit('ticker-changed', { 
                previous: previousContext.ticker, 
                current: this.state.context.ticker 
            });
        }
    }
    
    /**
     * Clear chat messages
     */
    clearMessages() {
        this.state.messages = [];
        this.state.currentChatId = this.generateChatId();
        this.updateMetrics('messageCount', 0);
        
        console.log('🗑️ Chat cleared');
        
        // Emit chat cleared event
        this.emit('chat-cleared', { chatId: this.state.currentChatId });
    }
    
    /**
     * Generate unique chat ID
     */
    generateChatId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics(metric, value) {
        switch (metric) {
            case 'messageCount':
                this.metrics.messageCount = value;
                break;
            case 'responseTime':
                // Calculate rolling average
                const count = this.metrics.messageCount;
                this.metrics.averageResponseTime = 
                    (this.metrics.averageResponseTime * (count - 1) + value) / count;
                break;
            case 'streamingTokens':
                this.metrics.streamingTokens += value;
                break;
            case 'errorCount':
                this.metrics.errorCount += 1;
                break;
        }
        
        // Emit metrics updated event
        this.emit('metrics-updated', { metrics: this.metrics });
    }
    
    /**
     * Handle errors
     */
    handleError(error, context) {
        const errorInfo = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.state.errors.push(errorInfo);
        this.updateMetrics('errorCount', 1);
        
        console.error(`❌ ChatCore Error [${context}]:`, error);
        
        // Emit error event
        this.emit('error', { error: errorInfo });
    }
    
    /**
     * Event system - emit event
     */
    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Event listener error [${eventName}]:`, error);
            }
        });
    }
    
    /**
     * Event system - add listener
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }
    
    /**
     * Event system - remove listener
     */
    off(eventName, callback) {
        const listeners = this.eventListeners.get(eventName) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            isInitialized: this.state.isInitialized,
            isStreaming: this.state.isStreaming,
            messageCount: this.state.messages.length,
            currentTicker: this.state.context.ticker,
            chatId: this.state.currentChatId
        };
    }
    
    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Destroy core instance
     */
    destroy() {
        this.eventListeners.clear();
        this.state.messages = [];
        this.state.isInitialized = false;
        
        console.log('🗑️ ChatCore destroyed');
    }
}

// ✅ FIX: Global export for module communication
window.ChatCore = ChatCore;

// CommonJS export - only if module exists
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatCore,
        default: ChatCore
    };
}

// ES6 export
export { ChatCore };
export default ChatCore;

console.log('✅ ChatCore exported successfully (CommonJS + ES6 + Global)'); 