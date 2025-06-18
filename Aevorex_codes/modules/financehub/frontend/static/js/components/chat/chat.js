/**
 * @file chat.js - Unified FinanceHub Chat Component
 * @description Premium chat interface integrating core functionality with modularity
 * @version 2.5.0 - Merged with modular architecture
 * @author AEVOREX FinanceHub Team
 */

// Import the modular components (these are loaded by the build process)
// - ChatCore from components/chat/modules/chat-core.js
// - ChatUI from components/chat/modules/chat-ui.js
// - ChatStreaming from components/chat/modules/chat-streaming.js

/**
 * Unified FinanceHub Chat Class
 * Combines the robust chat functionality with modular architecture
 */
class FinanceHubChat {
    constructor(options = {}) {
        console.log('🎯 Initializing Unified FinanceHub Chat...');

        // Merge default configuration
        this.config = {
            containerId: 'fh-chat',
            symbol: 'AAPL',
            apiBaseUrl: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1' : 'http://localhost:8084/api/v1',
            streamingEndpoint: window.FinanceHubAPI ? window.FinanceHubAPI.config.BASE_URL + '/api/v1/stock/chat' : 'http://localhost:8084/api/v1/stock/chat',
            autoSummary: true,
            fourBubbleMode: true,
            enableStreaming: true,
            enableHistory: true,
            enableAnimation: true,
            maxMessages: 100,
            animationDuration: 300,
            streamDelay: 50,
            retryAttempts: 3,
            retryDelay: 1000,
            ...options
        };

        // Initialize state
        this.isInitialized = false;
        this.messages = [];
        this.bubbleData = new Map();
        this.isStreaming = false;
        this.currentStreamController = null;
        this.streamBuffer = '';
        this.retryCount = 0;

        // DOM elements
        this.container = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.sendButton = null;
        this.streamingIndicator = null;

        // Performance tracking
        this.performance = {
            messagesSent: 0,
            averageResponseTime: 0,
            totalResponseTime: 0,
            errorsCount: 0
        };

        // Initialize modules - Use global classes if available
        this.modules = {
            core: typeof ChatCore !== 'undefined' ? new ChatCore(this) : null,
            ui: typeof ChatUI !== 'undefined' ? new ChatUI(this) : null,
            streaming: typeof ChatStreaming !== 'undefined' ? new ChatStreaming(this) : null
        };

        // Event handlers
        this.eventHandlers = new Map();

        // Auto-initialize if container exists
        if (!document.getElementById(this.config.containerId)) {
            // determine alternate id to search for
            const altId = this.config.containerId === 'fh-chat' ? 'chat-container' : 'fh-chat';
            const altEl = document.getElementById(altId);

            if (altEl) {
                console.warn(`⚠️ Chat container '${this.config.containerId}' not found, switching to '${altId}'.`);
                this.config.containerId = altId;

                // If legacy alias (#chat-container) missing, inject lightweight alias without touching original id
                if (altId === 'fh-chat' && !document.getElementById('chat-container')) {
                    const alias = document.createElement('div');
                    alias.id = 'chat-container';
                    alias.style.display = 'none';
                    altEl.parentNode.insertBefore(alias, altEl.nextSibling);
                }
                if (altId === 'chat-container' && !document.getElementById('fh-chat')) {
                    const alias = document.createElement('div');
                    alias.id = 'fh-chat';
                    alias.style.display = 'none';
                    altEl.parentNode.insertBefore(alias, altEl.nextSibling);
                }
            }
        }

        // Auto-initialize if the resolved container exists
        if (document.getElementById(this.config.containerId)) {
            this.init();
        }

        console.log('✅ Unified FinanceHub Chat initialized with config:', this.config);
    }

    /**
     * Initialize the chat component
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.warn('Chat already initialized');
                return;
            }

            console.log('🔄 Initializing chat component...');

            // Find and validate container
            this.container = document.getElementById(this.config.containerId);
            if (!this.container) {
                throw new Error(`Chat container not found: ${this.config.containerId}`);
            }

            // Initialize all modules
            await this.initializeModules();

            // Setup DOM structure
            this.setupDOM();

            // Bind event listeners
            this.bindEvents();

            // Initialize chat state
            this.initializeChatState();

            // Auto-load first AI summary if enabled
            if (this.config.autoSummary && this.config.fourBubbleMode) {
                setTimeout(() => {
                    if (!this.isStreaming) {
                        this.streamFourBubbleAnalysis();
                    } else {
                        console.log('ℹ️ Chat: streamFourBubbleAnalysis skipped – already streaming');
                    }
                }, 1000);
            }

            this.isInitialized = true;
            console.log('✅ Chat component initialized successfully');

            // Dispatch initialization event
            this.dispatchEvent('chatInitialized', { 
                config: this.config,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Chat initialization failed:', error);
            this.handleError(error, 'initialization');
            throw error;
        }
    }

    /**
     * Initialize all chat modules
     */
    async initializeModules() {
        try {
            console.log('🔄 Initializing chat modules...');

            // Initialize modules in order - check if they exist
            if (this.modules.core && typeof this.modules.core.initialize === 'function') {
                await this.modules.core.initialize();
            } else {
                console.warn('⚠️ ChatCore module not available');
            }

            if (this.modules.ui && typeof this.modules.ui.initialize === 'function') {
                await this.modules.ui.initialize();
            } else {
                console.warn('⚠️ ChatUI module not available');
            }

            if (this.modules.streaming && typeof this.modules.streaming.initialize === 'function') {
                await this.modules.streaming.initialize();
        } else {
                console.warn('⚠️ ChatStreaming module not available');
            }

            // Setup inter-module communication
            this.setupModuleCommunication();

            // Catch-up: if ChatUI loaded later in bundle order, attach it now
            if (!this.modules.ui && typeof ChatUI !== 'undefined') {
                console.warn('💡 ChatUI loaded late – attaching UI module dynamically');
                this.modules.ui = new ChatUI(this);
                if (typeof this.modules.ui.initialize === 'function') {
                    await this.modules.ui.initialize();
                }

                // Re-establish inter-module communication with the newly attached UI
                this.setupModuleCommunication();
            }

            console.log('✅ All available chat modules initialized');

        } catch (error) {
            console.error('❌ Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup communication between modules
     */
    setupModuleCommunication() {
        // Core -> UI communication
        if (this.modules.core && this.modules.ui) {
            this.modules.core.on('messageAdded', (message) => {
                this.modules.ui.renderMessage(message);
            });

            this.modules.core.on('messageUpdated', (messageId, content) => {
                this.modules.ui.updateMessage(messageId, content);
            });
        }

        // Streaming -> UI communication
        if (this.modules.streaming && this.modules.ui) {
            const showIndicator = () => this.modules.ui.showStreamingIndicator();
            const hideIndicator = () => this.modules.ui.hideStreamingIndicator();

            // Primary event names (camelCase)
            this.modules.streaming.on('streamStarted', showIndicator);
            this.modules.streaming.on('streamEnded', hideIndicator);

            // Alias event names emitted by ChatStreaming (kebab-case)
            this.modules.streaming.on('streaming-started', showIndicator);
            this.modules.streaming.on('streaming-completed', (data) => {
                hideIndicator();
                // Ensure final, fully formatted content replaces streamed raw text
                if (data && this.modules.ui && typeof this.modules.ui.updateMessage === 'function') {
                    this.modules.ui.updateMessage(data.messageId, data.content);
                }
            });
            this.modules.streaming.on('streaming-stopped', hideIndicator);
            this.modules.streaming.on('streaming-error', hideIndicator);

            // Content updates
            this.modules.streaming.on('content-update', ({ messageId, content, delta }) => {
                if (delta) {
                    this.modules.ui.appendToLastMessage(delta);
                } else {
                    this.modules.ui.updateMessage(messageId, content);
                }
            });

            // Ask-deep prompt handler
            this.modules.streaming.on('ask-deep', ({ question }) => {
                if (this.modules.ui && typeof this.modules.ui.addMessage === 'function') {
                    const msgId = `askdeep_${Date.now()}`;
                    // Render bot message with buttons
                    const contentHtml = question;
                    const message = {
                        id: msgId,
                        role: 'assistant',
                        content: contentHtml,
                        timestamp: new Date().toISOString(),
                    };
                    this.modules.ui.renderMessage(message);

                    // After rendering, inject action buttons
                    setTimeout(() => {
                        const lastMsgEl = this.modules.ui?.elements?.messagesContainer?.lastElementChild;
                        if (!lastMsgEl) return;
                        const actionsWrap = document.createElement('div');
                        actionsWrap.className = 'fh-chat__quick-actions';

                        const yesBtn = document.createElement('button');
                        yesBtn.textContent = 'Igen';
                        yesBtn.className = 'fh-btn fh-btn-sm';
                        const noBtn = document.createElement('button');
                        noBtn.textContent = 'Nem';
                        noBtn.className = 'fh-btn fh-btn-sm';

                        actionsWrap.appendChild(yesBtn);
                        actionsWrap.appendChild(noBtn);
                        lastMsgEl.appendChild(actionsWrap);

                        yesBtn.addEventListener('click', () => {
                            this.requestDeepAnalysis();
                            yesBtn.disabled = true;
                            noBtn.remove();
                        });
                        noBtn.addEventListener('click', () => {
                            actionsWrap.remove();
                        });
                    }, 60);
                }
            });
        }

        // UI → FinanceHubChat (streaming) bridging
        // The ChatUI emits 'send-message' events when the user submits input.
        // We directly forward these messages to the unified handleSendMessage()
        // of this FinanceHubChat instance so that they take the streaming path
        // without involving ChatCore (which is reserved for the initial summary).
        if (this.modules.ui) {
            this.modules.ui.on('send-message', ({ message }) => {
                if (typeof message === 'string' && message.trim()) {
                    // Mirror content to the internal textarea reference so that
                    // downstream logic (e.g. clearing the field, auto-resize) works.
                    if (this.chatInput) {
                        this.chatInput.value = message.trim();
                    }
                    this.handleSendMessage();
                }
            });

            // Deep insight button
            this.modules.ui.on('deep-request', () => {
                // Prevent multiple parallel deep calls
                if (this.isStreaming) {
                    console.warn('Deep request ignored – streaming in progress');
                    return;
                }
                this.requestDeepAnalysis && this.requestDeepAnalysis();
            });
        }

        // Helper to trigger backend deep endpoint
        this.requestDeepAnalysis = async () => {
            try {
                if (!this.modules.core || !this.modules.streaming) {
                    console.warn('Chat modules not ready for deep analysis');
                    return;
                }

                const ticker = this.modules.core.state.context?.ticker || 'AAPL';
                const lastUserMsg = [...this.modules.core.state.messages].reverse().find(m => m.role === 'user');
                const question = lastUserMsg ? lastUserMsg.content : 'Please provide a detailed analysis.';

                const apiBase = (window.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
                const url = `${apiBase}/api/v1/stock/chat/${ticker}/deep`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    body: JSON.stringify({
                        question: question,
                        history: this.modules.core.state.messages
                    })
                });

                const messageId = this.modules.core.generateMessageId ? this.modules.core.generateMessageId() : `msg_${Date.now()}`;
                if (response.ok) {
                    await this.modules.streaming.startStreaming(response, messageId);
                } else {
                    console.error('Deep endpoint error:', response.status, response.statusText);
                }
            } catch (err) {
                console.error('requestDeepAnalysis failed', err);
            }
        };
    }

    /**
     * Setup DOM structure
     */
    setupDOM() {
        try {
            const existingChatContainer = this.container.querySelector('.chat-container');
            if (existingChatContainer) {
                console.log('✅ Chat DOM structure already exists');
                this.findDOMElements();
                return;
            }

            console.log('🔄 Setting up chat DOM structure...');

            // If ChatUI is available OR wrapper already exists, skip DOM injection to prevent duplicates
            if (typeof ChatUI !== 'undefined' || this.container.querySelector('.fh-chat__input-wrapper')) {
                console.log('ℹ️ Skipping DOM construction – external ChatUI or existing wrapper detected');
                if (!this.container.classList.contains('fh-chat')) {
                    this.container.classList.add('fh-chat');
                }
                // Try to capture DOM nodes generated by ChatUI. If not ready, retry on next frame once
                try {
                    this.findDOMElements();
                } catch (domErr) {
                    console.warn('⚠️ Chat DOM nodes not yet ready – deferring lookup');
                    requestAnimationFrame(() => {
                        try {
                            this.findDOMElements();
                        } catch (retryErr) {
                            console.error('❌ Deferred lookup for chat DOM nodes failed', retryErr);
                        }
                    });
                }
                return;
            }

            // Ensure unified root CSS class is present (new prefix)
            if (!this.container.classList.contains('fh-chat')) {
                this.container.classList.add('fh-chat');
            }

            this.container.innerHTML = this.getChatHTML();

            // Find DOM elements
            this.findDOMElements();

            // ----- Model Selector Injection -----
            this.initModelSelector && this.initModelSelector();

            // Enhance existing bubbles
            this.enhanceExistingBubbles();

            console.log('✅ Chat DOM structure setup complete');

        } catch (error) {
            console.error('❌ DOM setup failed:', error);
            throw error;
        }
    }

    /**
     * Find and cache DOM elements
     */
    findDOMElements() {
        this.chatMessages = this.container.querySelector('.fh-chat__messages')
            || this.container.querySelector('#chat-messages');
        this.chatInput = this.container.querySelector('.fh-chat__input')
            || this.container.querySelector('#chat-input');
        this.sendButton = this.container.querySelector('.fh-chat__send-btn')
            || this.container.querySelector('#chat-send-btn');
        this.streamingIndicator = this.container.querySelector('.fh-chat__typing-indicator');

        // Validate essential elements
        if (!this.chatMessages || !this.chatInput || !this.sendButton) {
            throw new Error('Essential chat DOM elements not found');
        }
    }

    /**
     * Get chat HTML structure - Teljes képernyős chat felület
     */
    getChatHTML() {
        return `
            <!-- Üzenetek terület - felső 2/3 -->
            <div class="fh-chat__messages" id="chat-messages">
                <!-- Messages will be populated here -->
            </div>
            
            <!-- Streaming indikátor -->
            <div class="streaming-indicator fh-chat__typing-indicator" style="display: none;">
                <div class="streaming-dots fh-chat__typing-dots">
                    <span class="fh-chat__typing-dot"></span>
                    <span class="fh-chat__typing-dot"></span>
                    <span class="fh-chat__typing-dot"></span>
                </div>
            </div>
            
            <!-- Input panel - alsó 1/3 -->
            <div class="fh-chat__input-container">
                <div class="fh-chat__input-wrapper">
                    <textarea 
                        class="fh-chat__input" 
                        placeholder="Ask about ${this.config.symbol} analysis, financials, or market trends..." 
                        rows="1"
                    ></textarea>
                    <button class="fh-chat__send-btn" title="Send Message">
                        <!-- Premium arrow-up icon -->
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__send-icon">
                            <g>
                                <path d="M12 3.59l7.457 7.45-1.414 1.42L13 7.41V21h-2V7.41l-5.043 5.05-1.414-1.42L12 3.59z"></path>
                            </g>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        try {
            console.log('🔄 Binding chat event listeners...');

            // Guard: if essential nodes are still missing (e.g., ChatUI finished after this call), defer once
            if (!this.sendButton || !this.chatInput || !this.chatMessages) {
                console.warn('⚠️ Essential chat nodes missing – rebinding deferred by 1 frame');
                requestAnimationFrame(() => {
                    this.findDOMElements();
                    this.bindEvents();
                });
                return;
            }

            // Send button click
            this.sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });

            // Enter key press
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Clear chat button
            const clearBtn = this.container.querySelector('#clear-chat');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearChat();
                });
            }

            // Refresh chat button
            const refreshBtn = this.container.querySelector('#refresh-chat');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.streamFourBubbleAnalysis();
                });
            }

            // Suggestion chips
            const suggestionChips = this.container.querySelectorAll('.suggestion-chip');
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const suggestion = chip.dataset.suggestion;
                    this.chatInput.value = suggestion;
                    this.handleSendMessage();
                });
            });

            // 🔄 Listen for global symbol change events to keep chat context updated
            document.addEventListener('symbol-changed', (e) => {
                const { symbol } = e.detail || {};
                if (symbol && symbol !== this.config.symbol) {
                    console.log(`💬 Chat: Received symbol-changed → updating symbol to ${symbol}`);
                    this.updateSymbol(symbol);
                }
            });

            // Scroll to bottom on new messages
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }
            
            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        this.scrollToBottom();
                    }
                });
            });
            
            this.mutationObserver.observe(this.chatMessages, {
                childList: true,
                subtree: true
            });

            console.log('✅ Chat event listeners bound successfully');
            
        } catch (error) {
            console.error('❌ Event binding failed:', error);
            throw error;
        }
    }

    /**
     * Initialize chat state
     */
    initializeChatState() {
        // Clear existing messages
        this.messages = [];
        this.bubbleData.clear();

        // Reset streaming state
        this.isStreaming = false;
        this.streamBuffer = '';

        // Update UI
        this.updateChatSubtitle();
    }

    /**
     * Handle send message
     */
    async handleSendMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message || this.isStreaming) {
            return;
        }

        // Reset input immediately for better UX
            this.chatInput.value = '';

        try {
            // ---------------------------------------
            // 1. Add user message to the chat UI
            // ---------------------------------------
            this.addUserMessage(message);

            // ---------------------------------------
            // 2. Create placeholder AI message that will
            //    be progressively filled while streaming
            // ---------------------------------------
            const placeholderMsg = this.addAIMessage('', {
                isStreaming: true,
                isSummary: false
            });

            // ---------------------------------------
            // 3. Prefer real-time streaming via ChatStreaming
            // ---------------------------------------
            if (this.modules.streaming && typeof this.modules.streaming.startStream === 'function') {
                // Build endpoint root – already normalised in the constructor
                const endpointRoot = this.config.streamingEndpoint || `${this.config.apiBaseUrl}/stock/chat`;

                // Mark component state (prevents parallel invokes)
                this.isStreaming = true;
                try {
                    await this.modules.streaming.startStream({
                        endpoint: endpointRoot,
                        symbol: this.config.symbol,
                        messageId: placeholderMsg.id,
                        prompt: message
                    });
                } finally {
                    this.isStreaming = false;
                }
                return; // Streaming path handled – exit early
            }

            // ---------------------------------------
            // 4. Fallback – no streaming available
            // ---------------------------------------
            let apiSvc = window.FinanceHubAPIService;
            if (!apiSvc) {
                // Lazily create if constructor exposed
                if (typeof window.FinanceHubAPIService === 'function') {
                    apiSvc = new window.FinanceHubAPIService();
                    window.FinanceHubAPIService = apiSvc;
                }
            }

            if (!apiSvc || typeof apiSvc.sendChatMessage !== 'function') {
                throw new Error('FinanceHubAPIService.sendChatMessage unavailable');
            }

            const responseData = await apiSvc.sendChatMessage(this.config.symbol, message, false, {});
            let aiContent = responseData;
            if (typeof responseData === 'object') {
                aiContent = responseData.response || responseData.ai_summary || JSON.stringify(responseData);
            }
            this.modules.ui.updateMessage(placeholderMsg.id, aiContent);
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Failed to send message or process response:', error);
            this.handleError(error, 'send_message');
            // Show error in placeholder
            this.modules.ui.updateMessage(placeholderMsg?.id || this.generateMessageId(), '⚠️ Error processing request. Please try again later.');
        }
    }

    /**
     * Add user message to chat
     */
    addUserMessage(content) {
        const message = {
            id: this.generateMessageId(),
            type: 'user',
            content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.modules.ui.renderMessage(message);
        this.scrollToBottom();

        return message;
    }

    /**
     * Add AI message to chat
     */
    addAIMessage(content = '', options = {}) {
        const message = {
            id: this.generateMessageId(),
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString(),
            isStreaming: options.isStreaming || false,
            isSummary: options.isSummary || false
        };

        this.messages.push(message);
        this.modules.ui.renderMessage(message);
        this.scrollToBottom();

        return message;
    }

    /**
     * Stream four bubble analysis
     */
    async streamFourBubbleAnalysis() {
        try {
            if (this.isStreaming) {
                console.warn('Already streaming, skipping request');
                return;
            }

            console.log('🎯 Starting four bubble analysis stream...');

            // Prefer real-time streaming via ChatStreaming if the module is available
            if (this.modules.streaming && typeof this.modules.streaming.startTickerSummaryStreaming === 'function') {
                // Add placeholder AI message that will be progressively filled
                const placeholderMsg = this.addAIMessage('', { isStreaming: true, isSummary: true });

                // Mark component as streaming (avoids duplicate calls)
                this.isStreaming = true;
                try {
                    await this.modules.streaming.startTickerSummaryStreaming(this.config.symbol, placeholderMsg.id);
                } finally {
                    this.isStreaming = false;
                }
                return; // Streaming path handled, exit early
            }

            // -----------------------------------------------------------------
            // Legacy (non-streaming) fallback – retain previous implementation
            // -----------------------------------------------------------------
            let apiSvc = null;
            if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService.getStockAISummary === 'function') {
                apiSvc = window.FinanceHubAPIService;
            } else if (typeof window.FinanceHubAPIService === 'function') {
                try {
                    apiSvc = new window.FinanceHubAPIService();
                    window.FinanceHubAPIService = apiSvc;
                } catch (err) {
                    console.warn('FinanceHubAPIService instantiation failed:', err);
                }
            } else if (window.API && typeof window.API.getStockAISummary === 'function') {
                apiSvc = window.API;
            }

            if (!apiSvc) {
                console.error('FinanceHubAPIService.getStockAISummary not available');
                throw new Error('AI summary endpoint unavailable');
            }

            const loadingMsg = this.addAIMessage('⏳ Generating AI summary…', { isStreaming: false });

            const summary = await apiSvc.getStockAISummary(this.config.symbol).catch(err => {
                console.error('AI summary fetch failed:', err);
                throw err;
            });

            let text = summary;
            if (typeof summary === 'object') {
                if (summary.ai_summary) {
                    text = summary.ai_summary;
                } else {
                    text = summary.summary || summary.content || JSON.stringify(summary);
                }
            }
            this.modules.ui.updateMessage(loadingMsg.id, text);
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Four bubble analysis failed:', error);
            this.handleError(error, 'four_bubble_analysis');
            this.addAIMessage('Sorry, I encountered an error while analyzing the stock. Please try again.');
        }
    }

    /**
     * Update stock symbol and refresh data
     */
    updateSymbol(newSymbol) {
        if (!newSymbol || newSymbol === this.config.symbol) return;

        console.log(`🔄 Updating chat symbol: ${this.config.symbol} → ${newSymbol}`);

        this.config.symbol = newSymbol;
        this.updateChatSubtitle();

        // Trigger new analysis
        if (this.config.autoSummary && this.isInitialized) {
            setTimeout(() => {
                this.streamFourBubbleAnalysis();
            }, 500);
        }

        // Dispatch symbol change event
        this.dispatchEvent('symbolChanged', {
            oldSymbol: this.config.symbol,
            newSymbol,
            timestamp: Date.now()
        });
    }

    /**
     * Update stock data
     */
    updateStockData(symbol, stockData) {
        if (symbol === this.config.symbol) {
            this.updateSymbol(symbol);
        }
    }

    /**
     * Update chat subtitle
     */
    updateChatSubtitle() {
        const subtitle = this.container.querySelector('.chat-subtitle');
        if (subtitle) {
            subtitle.textContent = `Real-time insights for ${this.config.symbol}`;
        }
    }

    /**
     * Clear chat history
     */
    clearChat() {
        try {
            this.messages = [];
            this.chatMessages.innerHTML = '';
            
            // Add welcome message
            this.addAIMessage(`Hello! I'm here to help you analyze ${this.config.symbol}. What would you like to know?`);

            console.log('✅ Chat cleared');

            // Dispatch clear event
            this.dispatchEvent('chatCleared', { timestamp: Date.now() });

        } catch (error) {
            console.error('❌ Failed to clear chat:', error);
            this.handleError(error, 'clear_chat');
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    /**
     * Enhance existing analysis bubbles
     */
    enhanceExistingBubbles() {
        try {
            const bubbles = document.querySelectorAll('.analysis-bubble');
            
            bubbles.forEach((bubble, index) => {
                // Add click handler for detailed analysis
                bubble.addEventListener('click', () => {
                    this.requestBubbleDetails(index);
                });

                // Add hover effects
                bubble.addEventListener('mouseenter', () => {
                    this.highlightBubble(bubble);
                });

                bubble.addEventListener('mouseleave', () => {
                    this.unhighlightBubble(bubble);
                });
            });

            console.log(`✅ Enhanced ${bubbles.length} analysis bubbles`);

        } catch (error) {
            console.error('❌ Bubble enhancement failed:', error);
        }
    }

    /**
     * Request detailed analysis for a bubble
     */
    async requestBubbleDetails(bubbleIndex) {
        try {
            const bubbleTypes = [
                'Company Overview',
                'Financial Metrics',
                'Technical Analysis',
                'News Highlights'
            ];

            const bubbleType = bubbleTypes[bubbleIndex] || 'Analysis';
            
            this.addUserMessage(`Tell me more about the ${bubbleType} for ${this.config.symbol}`);
            
            const aiMessage = this.addAIMessage('', { isStreaming: true });

            await this.modules.streaming.startStream({
                endpoint: this.config.streamingEndpoint,
                symbol: this.config.symbol,
                messageId: aiMessage.id,
                prompt: `Provide detailed ${bubbleType.toLowerCase()} for ${this.config.symbol}. Be comprehensive and include specific data points.`
            });

        } catch (error) {
            console.error('❌ Bubble details request failed:', error);
            this.handleError(error, 'bubble_details');
        }
    }

    /**
     * Highlight bubble on hover
     */
    highlightBubble(bubble) {
        bubble.style.transform = 'translateY(-2px)';
        bubble.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    }

    /**
     * Remove bubble highlight
     */
    unhighlightBubble(bubble) {
        bubble.style.transform = '';
        bubble.style.boxShadow = '';
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Handle errors
     */
    handleError(error, context, metadata = {}) {
        // Prevent duplicate error messages of same context within short period
        if (!this._errorTimestamps) this._errorTimestamps = {};
        const now = Date.now();
        const last = this._errorTimestamps[context] || 0;
        if (now - last < 5000) {
            console.warn(`Duplicate error suppressed [${context}]`, error);
            return;
        }
        this._errorTimestamps[context] = now;

        console.error(`FinanceHubChat Error [${context}]:`, error, metadata);
        // Show only one AI error message to the user
        this.addAIMessage('Sorry, I encountered an error while analyzing the stock. Please try again.');
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail) {
        try {
            const event = new CustomEvent(`financehub:chat:${eventName}`, {
                detail,
                bubbles: true
            });
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Failed to dispatch event:', error);
        }
    }

    /**
     * Add event listener
     */
    on(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * Remove event listener
     */
    off(eventName, handler) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit internal event
     */
    emit(eventName, ...args) {
        const handlers = this.eventHandlers.get(eventName);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`❌ Event handler error (${eventName}):`, error);
                }
            });
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performance,
            messagesTotal: this.messages.length,
            isStreaming: this.isStreaming,
            uptime: Date.now() - this.initTime
        };
    }

    /**
     * Destroy chat instance
     */
    destroy() {
        try {
            // Stop any active streaming
            if (this.currentStreamController) {
                this.currentStreamController.abort();
            }

            // Disconnect MutationObserver
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
                this.mutationObserver = null;
            }

            // Clear event handlers
            this.eventHandlers.clear();

            // Destroy modules
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });

            // Clear DOM
            if (this.container) {
                this.container.innerHTML = '';
            }

            this.isInitialized = false;
            console.log('✅ Chat instance destroyed');

        } catch (error) {
            console.error('❌ Chat destruction failed:', error);
        }
    }

    /**
     * Public helper used by FinanceHubApp to request an automatic summary
     * for the given symbol. Keeps backward-compat with earlier API.
     * @param {string} symbol – Ticker symbol to analyze (optional)
     */
    async triggerAutoSummary(symbol = null) {
        if (symbol) {
            this.updateSymbol(symbol);
        }
        return this.streamFourBubbleAnalysis();
    }

    /**
     * Injects AI Model dropdown selector into the chat header
     * Requires window.FinHubModels (set by modelRegistry.js)
     */
    initModelSelector() {
        try {
            // Avoid duplicate injection
            if (this.container.querySelector('.fh-chat__model-select')) return;

            const targetParent = this.container.querySelector('.fh-chat__input-container')?.previousElementSibling || this.container;

            const selectEl = document.createElement('select');
            selectEl.className = 'fh-chat__model-select tw-absolute tw-top-2 tw-right-4 tw-max-w-[180px] tw-px-2 tw-py-1 tw-rounded tw-text-xs tw-bg-neutral-800 tw-text-white dark:tw-bg-neutral-700';

            // Default option while loading
            selectEl.innerHTML = '<option value="">Loading models…</option>';

            targetParent.appendChild(selectEl);

            // Fetch models
            if (window.FinHubModels && typeof window.FinHubModels.fetch === 'function') {
                window.FinHubModels.fetch().then(models => {
                    // Sort by ux_hint then id
                    models.sort((a,b)=> (a.ux_hint||'').localeCompare(b.ux_hint||'') || a.id.localeCompare(b.id));
                    selectEl.innerHTML = models.map(m => `<option value="${m.id}">${m.ux_hint || '–'} · ${m.id}</option>`).join('');

                    // Restore persisted choice
                    const saved = localStorage.getItem('fh_selected_model');
                    if (saved) selectEl.value = saved;

                    // Initial dispatch
                    const initModelId = selectEl.value || models[0].id;
                    window.FinHubModels.selectedId = initModelId;
                    document.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: initModelId } }));
                }).catch(err=>{
                    console.error('Model selector fetch failed', err);
                    selectEl.innerHTML = '<option>Error loading models</option>';
                });
            }

            // Change listener
            selectEl.addEventListener('change', (e)=>{
                const id = e.target.value;
                window.FinHubModels && (window.FinHubModels.selectedId = id);
                localStorage.setItem('fh_selected_model', id);
                document.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: id } }));
            });

        } catch (error) {
            console.error('initModelSelector error', error);
        }
    }
}

// DUPLIKÁLT OSZTÁLYOK KIKOMMENTÁLVA - HASZNÁLD A KÜLÖN MODULOKAT:
// - components/chat/modules/chat-core.js
// - components/chat/modules/chat-ui.js  
// - components/chat/modules/chat-streaming.js

// Export for global access
if (typeof window !== 'undefined') {
    window.FinanceHubChat = window.FinanceHubChat || FinanceHubChat;
}

// Export for ES6 module imports
export { FinanceHubChat };
export default FinanceHubChat;

console.log('✅ Unified FinanceHub Chat loaded successfully'); 