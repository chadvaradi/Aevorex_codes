/**
 * @file chat-ui.js - Chat UI Module
 * @description Handles DOM manipulation and user interface for chat
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat UI Module
 * Manages DOM elements, user interactions, and visual feedback
 */
class ChatUI {
    constructor(containerId, options = {}) {
        // Support legacy signature where the first argument may be the FinanceHubChat instance
        if (typeof containerId === 'object' && containerId !== null) {
            const maybeChatInstance = containerId;
            // Attempt to read containerId from known structure
            if (maybeChatInstance.config && maybeChatInstance.config.containerId) {
                containerId = maybeChatInstance.config.containerId;
            } else if (typeof maybeChatInstance.containerId === 'string') {
                containerId = maybeChatInstance.containerId;
            } else {
                // Fallback to default
                containerId = 'chat-container';
            }
        }
        
        // Configuration
        this.config = {
            containerId: containerId || 'chat-container',
            enableAnimations: options.enableAnimations !== false,
            enableTypingIndicator: options.enableTypingIndicator !== false,
            autoScroll: options.autoScroll !== false,
            maxVisibleMessages: options.maxVisibleMessages || 100,
            messageAnimationDuration: options.messageAnimationDuration || 300
        };
        
        // DOM elements cache
        this.elements = {
            container: document.getElementById(containerId),
            messagesContainer: null,
            inputContainer: null,
            input: null,
            sendButton: null,
            typingIndicator: null,
            modelButtons: [],
            attachButton: null,
            fileInput: null,
            attachmentsContainer: null,
            deepButton: null
        };
        
        // State
        this.state = {
            isInitialized: false,
            isMinimized: false,
            isTypingIndicatorVisible: false,
            messageElements: new Map(),
            lastScrollPosition: 0,
            attachments: []
        };
        
        // Event system
        this.eventListeners = new Map();
        
        console.log('🎨 ChatUI initialized');
    }
    
    /**
     * Initialize UI components
     */
    async init() {
        try {
            console.log('🔧 Initializing ChatUI...');
            
            // Find container
            this.elements.container = document.getElementById(this.config.containerId);
            if (!this.elements.container) {
                throw new Error(`Container not found: ${this.config.containerId}`);
            }
            
            // Setup DOM structure
            this.setupDOM();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Apply initial styling
            this.applyInitialStyling();
            
            this.state.isInitialized = true;
            console.log('✅ ChatUI initialized successfully');
            
            // Emit ready event
            this.emit('ui-ready', { component: 'chat-ui' });
            
        } catch (error) {
            console.error('❌ Failed to initialize ChatUI:', error);
            throw error;
        }
    }
    
    /**
     * Legacy alias expected by FinanceHubChat.initializeModules()
     * Simply forwards to init() to preserve single initialization logic.
     */
    async initialize() {
        return this.init();
    }
    
    /**
     * Setup DOM structure
     */
    setupDOM() {
        // Apply unified chat container styling classes
        this.elements.container.className = 'fh-chat chat-animated';

        // Unified DOM template with SVG-based send icon and hidden error banner placeholder
        this.elements.container.innerHTML = `
            <div id="fh-chat-fallback-notice" class="fh-chat__error-banner" hidden>
                <div class="fh-chat__error-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L22 8V16L12 22L2 16V8L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
                        <path d="M12 11V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                        <circle cx="12" cy="8" r="1" fill="currentColor"></circle>
                    </svg>
                </div>
                <span class="fh-chat__error-text"></span>
            </div>

            <div class="fh-chat__messages" id="chat-messages"></div>
            
            <div class="fh-chat__input-container fh-sticky-bottom chat-ribbon">
                <div class="fh-chat__input-wrapper">
                    <!-- Attachment button -->
                    <button id="chat-attach-btn" class="fh-chat__icon-btn" title="Attach file" aria-label="Attach file">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__icon">
                            <g>
                                <path d="M14 4c-1.66 0-3 1.34-3 3v8c0 .55.45 1 1 1s1-.45 1-1V8h2v7c0 1.66-1.34 3-3 3s-3-1.34-3-3V7c0-2.76 2.24-5 5-5s5 2.24 5 5v8c0 3.87-3.13 7-7 7s-7-3.13-7-7V8h2v7c0 2.76 2.24 5 5 5s5-2.24 5-5V7c0-1.66-1.34-3-3-3z"></path>
                            </g>
                        </svg>
                    </button>

                    <!-- Search button -->
                    <button id="chat-search-btn" class="fh-chat__icon-btn" title="Search the web" aria-label="Search the web">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="fh-chat__icon">
                            <path d="M10 2.125C14.3492 2.125 17.875 5.65076 17.875 10C17.875 14.3492 14.3492 17.875 10 17.875C5.65076 17.875 2.125 14.3492 2.125 10C2.125 5.65076 5.65076 2.125 10 2.125ZM7.88672 10.625C7.94334 12.3161 8.22547 13.8134 8.63965 14.9053C8.87263 15.5194 9.1351 15.9733 9.39453 16.2627C9.65437 16.5524 9.86039 16.625 10 16.625C10.1396 16.625 10.3456 16.5524 10.6055 16.2627C10.8649 15.9733 11.1274 15.5194 11.3604 14.9053C11.7745 13.8134 12.0567 12.3161 12.1133 10.625H7.88672ZM3.40527 10.625C3.65313 13.2734 5.45957 15.4667 7.89844 16.2822C7.7409 15.997 7.5977 15.6834 7.4707 15.3486C6.99415 14.0923 6.69362 12.439 6.63672 10.625H3.40527ZM13.3633 10.625C13.3064 12.439 13.0059 14.0923 12.5293 15.3486C12.4022 15.6836 12.2582 15.9969 12.1006 16.2822C14.5399 15.467 16.3468 13.2737 16.5947 10.625H13.3633ZM12.1006 3.7168C12.2584 4.00235 12.4021 4.31613 12.5293 4.65137C13.0059 5.90775 13.3064 7.56102 13.3633 9.375H16.5947C16.3468 6.72615 14.54 4.53199 12.1006 3.7168ZM10 3.375C9.86039 3.375 9.65437 3.44756 9.39453 3.7373C9.1351 4.02672 8.87263 4.48057 8.63965 5.09473C8.22547 6.18664 7.94334 7.68388 7.88672 9.375H12.1133C12.0567 7.68388 11.7745 6.18664 11.3604 5.09473C11.1274 4.48057 10.8649 4.02672 10.6055 3.7373C10.3456 3.44756 10.1396 3.375 10 3.375ZM7.89844 3.7168C5.45942 4.53222 3.65314 6.72647 3.40527 9.375H6.63672C6.69362 7.56102 6.99415 5.90775 7.4707 4.65137C7.59781 4.31629 7.74073 4.00224 7.89844 3.7168Z"></path>
                        </svg>
                    </button>

                    <!-- Model switch button -->
                    <button id="chat-model-btn" class="fh-chat__icon-btn" title="Switch AI model" aria-label="Switch AI model">
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="fh-chat__icon">
                            <g>
                                <path d="M14 6V3h2v8h-2V8H3V6h11zm7 2h-3.5V6H21v2zM8 16v-3h2v8H8v-3H3v-2h5zm13 2h-9.5v-2H21v2z"></path>
                            </g>
                        </svg>
                    </button>

                    <!-- Main input -->
                    <textarea 
                        id="chat-input" 
                        class="fh-chat__input" 
                        placeholder="Ask about this stock..."
                        rows="1"
                    ></textarea>

                    <!-- Hidden file input -->
                    <input id="chat-file-input" type="file" accept="image/*,.pdf,.txt,.csv,.xlsx,.docx" multiple hidden />

                    <!-- Attachments preview -->
                    <div id="chat-attachments" class="fh-chat__attachments"></div>

                    <!-- Need deeper insight button -->
                    <button id="chat-deep-btn" class="fh-btn fh-btn-sm fh-chat__deep-btn" title="Need deeper insight?" aria-label="Need deeper insight?">
                        Need deeper insight?
                    </button>

                    <!-- Send button -->
                    <button id="chat-send-btn" class="fh-chat__send-btn" disabled>
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
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.messagesContainer = this.elements.container.querySelector('#chat-messages');
        this.elements.inputContainer = this.elements.container.querySelector('.fh-chat__input-container');
        this.elements.input = this.elements.container.querySelector('#chat-input');
        this.elements.sendButton = this.elements.container.querySelector('#chat-send-btn');
        this.elements.typingIndicator = this.elements.container.querySelector('#chat-typing');
        this.elements.modelButtons = Array.from(this.elements.container.querySelectorAll('#chat-model-btn, .model-btn'));
        
        // File attachment elements
        this.elements.attachButton = this.elements.container.querySelector('#chat-attach-btn');
        this.elements.fileInput = this.elements.container.querySelector('#chat-file-input');
        this.elements.attachmentsContainer = this.elements.container.querySelector('#chat-attachments');
        
        // Deep insight button
        this.elements.deepButton = this.elements.container.querySelector('#chat-deep-btn');
        
        // Initialize attachments array
        this.state.attachments = [];
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Attachment button
        if (this.elements.attachButton && this.elements.fileInput) {
            this.elements.attachButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.fileInput.click();
            });

            this.elements.fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                this.handleFileSelect(files);
                // reset so same file can be selected again
                this.elements.fileInput.value = '';
            });
        }
        
        // Input events
        this.elements.input.addEventListener('input', () => {
            this.autoResizeInput();
            this.updateSendButtonState();
        });
        
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.emit('send-message', { message: this.elements.input.value.trim() });
            }
        });
        
        // Button events
        this.elements.sendButton.addEventListener('click', () => {
            this.emit('send-message', { message: this.elements.input.value.trim() });
        });
        
        // Deep insight button click
        if (this.elements.deepButton) {
            this.elements.deepButton.addEventListener('click', () => {
                this.emit('deep-request', {});
            });
        }
        
        // Model selector buttons - support multiple instances
        if (this.elements.modelButtons.length) {
            console.log('🎯 Setting up model selector for buttons:', this.elements.modelButtons.length);

            this.elements.modelButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔄 Model button clicked');

                    // If selector already exists, just update anchor and toggle
                    if (this.modelSelector) {
                        this.modelSelector.anchorEl = btn;
                        this.modelSelector.toggle();
                    } else {
                        // Create selector with current anchor
                        this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                            console.log('🎯 Model selected:', modelId, modelName);
                            this.emit('model-selected', { modelId, modelName });
                            // Global event for other modules (ChatCore)
                            window.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: modelId, modelName: modelName } }));
                        });
                        this.modelSelector.open();
                    }
                });
            });
        } else {
            console.warn('⚠️ No model buttons found in DOM');
        }
        
        // 🔧 Delegated click-handler to support dynamically added model buttons
        this.elements.container.addEventListener('click', (evt) => {
            const btn = evt.target.closest('#chat-model-btn, .model-btn');
            if (!btn) {
                // Not a model button click ➜ early exit (still useful to log once for debugging noise)
                // console.debug('Model-selector delegate: non-target click ignored');
                return;
            }

            console.log('✅ Delegate caught model-button click');

            evt.preventDefault();
            evt.stopPropagation();

            if (this.modelSelector) {
                this.modelSelector.anchorEl = btn;
                this.modelSelector.toggle();
                console.log('🔁 Existing selector toggled');
            } else {
                this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                    console.log('📌 Model selected via delegate:', modelId, modelName);
                    this.emit('model-selected', { modelId, modelName });
                    // Global event for other modules (ChatCore)
                    window.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: modelId, modelName: modelName } }));
                });
                this.modelSelector.open();
                console.log('🌟 New selector instantiated & opened');
            }
        });
        
        // 🌍 Global capture-phase listener – fallback when container delegation fails
        document.addEventListener('click', (evt) => {
            const btn = evt.target.closest('#chat-model-btn, .model-btn');
            if (!btn) return; // Ignore non-target clicks

            console.log('🌍 Global capture detected model-button click');

            evt.preventDefault();
            evt.stopPropagation();

            if (this.modelSelector) {
                this.modelSelector.anchorEl = btn;
                this.modelSelector.toggle();
                console.log('🔁 Existing selector toggled (global)');
            } else {
                this.modelSelector = new ChatModelSelector(btn, (modelId, modelName) => {
                    console.log('�� Model selected via global capture:', modelId, modelName);
                    this.emit('model-selected', { modelId, modelName });
                    // Global event for other modules (ChatCore)
                    window.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: modelId, modelName: modelName } }));
                });
                this.modelSelector.open();
                console.log('🌟 New selector instantiated & opened (global)');
            }
        }, true);
        
        // Scroll events
        this.elements.messagesContainer.addEventListener('scroll', () => {
            this.state.lastScrollPosition = this.elements.messagesContainer.scrollTop;
        });
    }
    
    /**
     * Apply initial styling
     */
    applyInitialStyling() {
        // Add CSS classes for animations if enabled
        if (this.config.enableAnimations) {
            this.elements.container.classList.add('chat-animated');
        }
        
        // Set initial input state
        this.updateSendButtonState();
    }
    
    /**
     * Add message to UI
     */
    addMessage(message) {
        // 🩹 Hotfix: re-acquire messagesContainer in case DOM was reconstructed after initial cache
        if (!this.elements.messagesContainer || !this.elements.messagesContainer.isConnected) {
            // Try primary selector
            this.elements.messagesContainer = this.elements.container && this.elements.container.querySelector('#chat-messages');
            // Fallback: legacy / alt selector used in financehub.html
            if (!this.elements.messagesContainer) {
                this.elements.messagesContainer = this.elements.container && this.elements.container.querySelector('#fh-ai-chat__messages');
            }
            if (!this.elements.messagesContainer) {
                console.error('❌ ChatUI.addMessage: messages container not found');
                return null; // Prevent further errors
            }
        }
        const messageElement = this.createMessageElement(message);
        
        // Remove welcome message if this is the first real message
        const welcomeMessage = this.elements.messagesContainer.querySelector('.chat-welcome');
        if (welcomeMessage && this.state.messageElements.size === 0) {
            welcomeMessage.remove();
        }
        
        // Add to container
        this.elements.messagesContainer.appendChild(messageElement);
        
        // Cache element
        this.state.messageElements.set(message.id, messageElement);
        
        // Animate in if enabled
        if (this.config.enableAnimations) {
            this.animateMessageIn(messageElement);
        }
        
        // Auto scroll
        if (this.config.autoScroll) {
            this.scrollToBottom();
        }
        
        // Update message count
        this.updateMessageCount();
        
        return messageElement;
    }
    
    /**
     * Create message DOM element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        // Summary messages reuse premium AI summary card styles
        if (message.isSummary) {
            messageDiv.className = 'ai-summary';
            messageDiv.dataset.messageId = message.id;
            messageDiv.innerHTML = `
                <div class="summary-content" id="message-text-${message.id}">
                    ${this.formatMessageContent(message.content)}
                </div>`;
        } else {
            messageDiv.className = `chat-message chat-message--${message.type || message.role}`;
            messageDiv.dataset.messageId = message.id;
            messageDiv.innerHTML = `
                <div class="chat-message__bubble">
                    <div class="chat-message__content" id="message-text-${message.id}">
                        ${this.formatMessageContent(message.content)}
                    </div>
                </div>`;
        }
        
        return messageDiv;
    }
    
    /**
     * Update message content (for streaming)
     */
    updateMessage(messageId, content) {
        const messageElement = this.state.messageElements.get(messageId);
        if (messageElement) {
            const textElement = messageElement.querySelector(`#message-text-${messageId}`);
            if (textElement) {
                textElement.innerHTML = this.formatMessageContent(content);
                
                // Auto scroll during streaming
                if (this.config.autoScroll) {
                    this.scrollToBottom();
                }
            }
        }
    }
    
    /**
     * Format message content
     */
    formatMessageContent(content) {
        if (content === null || typeof content === 'undefined') return '';
        // If content is an object coming from backend, extract useful field
        if (typeof content !== 'string') {
            // Common FinanceHub backend format => { metadata: {...}, ai_summary: "..." }
            if (content && typeof content === 'object' && 'ai_summary' in content) {
                content = content.ai_summary || '';
            } else {
                try {
                    content = JSON.stringify(content, null, 2);
                } catch {
                    content = String(content);
                }
            }
        }
        
        // ---- Enhanced formatting & sanitization ----
        // 1) Strip leading / trailing code fences  ``` or ```text
        let txt = content
            .replace(/^\s*```[\s]*[a-zA-Z0-9]*[\s]*\n?/m, '') // allow leading whitespace
            .replace(/```[\s]*$/m, '');

        // 1.b) Convert literal "\n" sequences (backend marks line breaks) to real newline characters
        txt = txt.replace(/\\n/g, '\n');

        // 1.c) Remove stray language hints (e.g., "text", "tex") that may remain after code fence stripping
        txt = txt.replace(/^\s*(text|tex)\s*/i, '');

        // 1.d) Remove lone inline-code marker `text` that sometimes prefixes the payload
        txt = txt.replace(/^`text`\s*/i, '');

        // 2) Collapse duplicated consecutive words (e.g. "vezető vezető" → "vezető")
        //    Works with any non-space sequence (handles accents) and reduces 2+ repeats.
        txt = txt.replace(/\b([^\s]+)(?:\s+\1\b)+/giu, '$1');

        // 3) Trim excessive whitespace (keep line breaks for paragraphs)
        //    • collapse multiple spaces / tabs → single space
        //    • collapse 3+ consecutive newlines → double newline (paragraph break)
        txt = txt
            .replace(/[ \t]{2,}/g, ' ')     // shrink repeated spaces / tabs
            .replace(/\n{3,}/g, '\n\n')   // limit empty lines to max two (paragraph)
            .trim();

        // 4) Headings – Roman numeral section titles (e.g. "I. VEZETŐI …") → <h2>
        txt = txt.replace(/^(?:\s*)([IVX]+\.)\s+([^\n]+)/gmu, (m, numeral, heading) => {
            return `\n\n<h2>${numeral} ${heading}</h2>\n\n`;
        });

        // 5) Markdown → HTML (bold, italic, code)
        txt = txt
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        // 6) Convert bullet lines to <ul><li>
        if (/^[-*+•]\s+/m.test(txt)) {
            const lines = txt.split(/\n+/);
            const items = lines.filter(l => /^[-*+•]\s+/.test(l)).map(l => l.replace(/^[-*+•]\s+/, '').trim());
            if (items.length > 0) {
                const listHtml = '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
                // Remove bullet lines from original and append list
                txt = lines.filter(l => !/^[-*+•]\s+/.test(l)).join('\n').trim();
                txt += (txt ? '<br>' : '') + listHtml;
            }
        }

        // 7) Convert paragraphs & line breaks → HTML – hagyjuk érintetlenül a már HTML blokkot (<h2>, <ul>)
        txt = txt
            .replace(/\n{3,}/g, '\n\n')
            .split(/\n{2,}/)
            // Inside paragraph, single newline -> <br>
            .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`) // wrap each block in <p>
            .join('');

        // 8) Hard truncate extremely long messages (10k chars) to avoid UI lock
        if (txt.length > 10000) {
            txt = txt.slice(0, 10000) + '…';
        }

        return txt;
    }
    
    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Animate message in
     */
    animateMessageIn(messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            messageElement.style.transition = `opacity ${this.config.messageAnimationDuration}ms ease, transform ${this.config.messageAnimationDuration}ms ease`;
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });
    }
    
    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        if (this.config.enableTypingIndicator && !this.state.isTypingIndicatorVisible) {
            this.elements.typingIndicator.style.display = 'flex';
            this.state.isTypingIndicatorVisible = true;
            if (this.config.autoScroll) this.scrollToBottom();
        }
    }
    
    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        if (this.state.isTypingIndicatorVisible) {
            this.elements.typingIndicator.style.display = 'none';
            this.state.isTypingIndicatorVisible = false;
        }
    }
    
    /**
     * -----------------------------------------------------------------
     * Legacy compatibility helpers expected by FinanceHubChat
     * -----------------------------------------------------------------
     */
    showStreamingIndicator() {
        // Utilize typing indicator for streaming feedback
        this.showTypingIndicator();
    }

    hideStreamingIndicator() {
        this.hideTypingIndicator();
    }

    appendToLastMessage(delta) {
        if (!delta) return;
        
        // Get the last message element (chat bubble or ai-summary)
        const lastMessageEl = this.elements.messagesContainer?.lastElementChild;
        if (!lastMessageEl) return;
        
        // Get the message ID from the dataset
        const messageId = lastMessageEl.dataset.messageId;
        if (!messageId) return;
        
        // Find the content element using the correct ID selector
        const contentEl = lastMessageEl.querySelector(`#message-text-${messageId}`);
        if (contentEl) {
            // Stream-friendly: append raw sanitized delta without extra block wrappers to avoid
            // line-break after every single token. Final formatting will be applied once the
            // complete message arrives through the standard updateMessage path.

            // Basic HTML entity escaping to prevent injection while preserving spaces/newlines.
            const sanitized = delta
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, ' ') // treat inline newlines as spaces during streaming
                .replace(/\\n/g, ' '); // also ignore escaped newline markers during streaming

            contentEl.insertAdjacentHTML('beforeend', sanitized);

            if (this.config.autoScroll) {
                this.scrollToBottom();
            }
        }
    }
    
    /**
     * Clear all messages
     */
    clearMessages() {
        // Remove all message elements
        this.state.messageElements.clear();
        
        // Clear container and add welcome message
        this.elements.messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">👋</div>
                <div class="welcome-message">
                    <h4>Welcome to FinanceHub AI</h4>
                    <p>I'm here to help you analyze stocks, understand market trends, and provide financial insights.</p>
                </div>
            </div>
        `;
        
        // Update message count
        this.updateMessageCount();
        
        // Hide typing indicator
        this.hideTypingIndicator();
    }
    
    /**
     * Update send button state
     */
    updateSendButtonState() {
        const hasText = this.elements.input.value.trim().length > 0;
        this.elements.sendButton.disabled = !hasText;
        
        if (hasText) {
            this.elements.sendButton.classList.add('chat-send-btn-active');
        } else {
            this.elements.sendButton.classList.remove('chat-send-btn-active');
        }
    }
    
    /**
     * Auto resize input textarea
     */
    autoResizeInput() {
        this.elements.input.style.height = 'auto';
        this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
    }
    
    /**
     * Update message count display
     */
    updateMessageCount() {
        const count = this.state.messageElements.size;
        if (this.elements.messageCount) {
            this.elements.messageCount.textContent = `${count} message${count !== 1 ? 's' : ''}`;
        }
    }
    
    /**
     * Update context display
     */
    updateContext(context) {
        if (context.ticker) {
            this.elements.contextInfo.textContent = `Analyzing: ${context.ticker}`;
        }
    }
    
    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        });
    }
    
    /**
     * Clear input
     */
    clearInput() {
        this.elements.input.value = '';
        this.autoResizeInput();
        this.updateSendButtonState();
    }
    
    /**
     * Focus input
     */
    focusInput() {
        this.elements.input.focus();
    }
    
    /**
     * Show/hide suggestions
     */
    showSuggestions() {
        if (this.elements.suggestionsContainer) {
            this.elements.suggestionsContainer.style.display = 'flex';
        }
    }
    
    hideSuggestions() {
        if (this.elements.suggestionsContainer) {
            this.elements.suggestionsContainer.style.display = 'none';
        }
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
     * Get current UI state
     */
    getState() {
        return {
            isInitialized: this.state.isInitialized,
            isMinimized: this.state.isMinimized,
            isTypingIndicatorVisible: this.state.isTypingIndicatorVisible,
            messageCount: this.state.messageElements.size,
            scrollPosition: this.state.lastScrollPosition
        };
    }
    
    /**
     * Destroy UI instance
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.clear();
        
        // Clear DOM
        if (this.elements.container) {
            this.elements.container.innerHTML = '';
        }
        
        // Reset state
        this.state.messageElements.clear();
        this.state.isInitialized = false;
        
        console.log('🗑️ ChatUI destroyed');
    }
    
    /**
     * Render message (alias for addMessage) – required by FinanceHubChat
     * @param {Object} message - message object from ChatCore
     * @returns {HTMLElement|null}
     */
    renderMessage(message) {
        return this.addMessage(message);
    }
    
    /**
     * Handle user-selected files, create previews & store to state
     * @param {File[]} files
     */
    handleFileSelect(files) {
        if (!files.length) return;
        files.forEach(file => {
            // Limit to 5 attachments
            if (this.state.attachments.length >= 5) return;
            const attachment = { file, previewSrc: null };

            if (file.type.startsWith('image/')) {
                // Create compressed preview using canvas (max 96px)
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => {
                        const maxDim = 96;
                        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        attachment.previewSrc = canvas.toDataURL('image/jpeg', 0.7);
                        this.renderAttachmentPreview(attachment);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Non-image: use a generic icon preview
                attachment.previewSrc = null;
                this.renderAttachmentPreview(attachment);
            }

            this.state.attachments.push(attachment);
        });
    }
    
    /**
     * Render tiny preview chip inside attachments container
     */
    renderAttachmentPreview(attachment) {
        if (!this.elements.attachmentsContainer) return;
        const chip = document.createElement('div');
        chip.className = 'fh-chat__attachment-chip';

        if (attachment.previewSrc) {
            const img = document.createElement('img');
            img.src = attachment.previewSrc;
            img.alt = attachment.file.name;
            chip.appendChild(img);
        } else {
            // Use simple file icon
            chip.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path fill="currentColor" d="M14 2v6h6"/></svg>';
        }

        // Remove chip on click
        chip.addEventListener('click', () => {
            this.elements.attachmentsContainer.removeChild(chip);
            this.state.attachments = this.state.attachments.filter(a => a !== attachment);
        });

        this.elements.attachmentsContainer.appendChild(chip);
        this.updateSendButtonState();
    }
}

// End of ChatUI module

// Make globally accessible for ComponentLoader bundling
if (typeof window !== 'undefined') {
    window.ChatUI = ChatUI;
}

// Support CommonJS/ES module importing if build system uses it
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatUI;
}

export default ChatUI;

console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)');

// ADD ChatModelSelector micro-component (≤120 lines)
class ChatModelSelector {
    constructor(anchorEl, onSelect) {
        if (!anchorEl) {
            console.error('❌ ChatModelSelector: anchorEl is required');
            return;
        }
        
        this.anchorEl = anchorEl;
        this.onSelect = onSelect;
        this.models = [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro' },
            { id: 'mistral-large',    name: 'Mistral Large' }
        ];
        this.currentModel = this.models[0].id;
        this.isOpen = false;
        this.dropdown = null;
        
        console.log('🎯 ChatModelSelector initialized with anchor:', anchorEl);
        this.buildDropdown();
    }

    buildDropdown() {
        try {
            // Container
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'fh-chat__model-dropdown';
            this.dropdown.style.display = 'none';
            this.dropdown.style.position = 'fixed';
            
            // Append markup
            this.dropdown.innerHTML = `
                <ul class="fh-chat__model-list">
                    ${this.models.map(m => `<li data-model="${m.id}" class="fh-chat__model-item">${m.name}</li>`).join('')}
                </ul>`;
            
            // Attach dropdown at document.body level ⇒ sosem vágja le parent overflow, stack order mindig magas
            document.body.appendChild(this.dropdown);
            console.log('✅ Dropdown appended to <body>');
            
            // Click-outside handler
            this.clickOutsideHandler = (e) => {
                if (this.isOpen && !this.dropdown.contains(e.target) && !this.anchorEl.contains(e.target)) {
                    this.close();
                }
            };
            document.addEventListener('click', this.clickOutsideHandler);
            
            // Item selection handler
            this.dropdown.querySelectorAll('.fh-chat__model-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = item.dataset.model;
                    const name = item.textContent;
                    console.log('🎯 Model item clicked:', id, name);
                    this.currentModel = id;
                    this.highlightActive();
                    this.close();
                    if (typeof this.onSelect === 'function') {
                        this.onSelect(id, name);
                    }
                    // Global event for other modules (ChatCore)
                    window.dispatchEvent(new CustomEvent('fh-model-changed', { detail: { modelId: id, modelName: name } }));
                });
            });
            
            this.highlightActive();
            
            // Reposition on window scroll/resize while open
            this.repositionHandler = () => {
                if (this.isOpen) this.positionDropdown();
            };
            window.addEventListener('scroll', this.repositionHandler, { passive: true });
            window.addEventListener('resize', this.repositionHandler);
        } catch (error) {
            console.error('❌ Error building dropdown:', error);
        }
    }

    highlightActive() {
        if (!this.dropdown) return;
        
        this.dropdown.querySelectorAll('.fh-chat__model-item').forEach(li => {
            if (li.dataset.model === this.currentModel) {
                li.classList.add('fh-active');
            } else {
                li.classList.remove('fh-active');
            }
        });
    }

    open() {
        if (!this.dropdown) {
            console.warn('⚠️ Dropdown not initialized');
            return;
        }

        console.log('🔄 Opening dropdown');

        // First, make it visible but transparent for accurate measurement
        this.dropdown.style.display = 'block';
        this.dropdown.style.opacity = '0';

        // Wait for next frame to ensure DOM has painted and height is measurable
        requestAnimationFrame(() => {
            // Position now that we know dropdown height
            this.positionDropdown();

            // Animate to visible state
            this.dropdown.style.opacity = '1';
            this.dropdown.style.transform = 'scale(1) translateY(0)';
            this.isOpen = true;
        });
    }

    positionDropdown() {
        if (!this.dropdown || !this.anchorEl) return;

        try {
            // Viewport-relative coordinates (position: fixed)
            const buttonRect = this.anchorEl.getBoundingClientRect();

            const left = buttonRect.left;

            // Temporarily hide visually but keep layout for accurate height
            const prevVisibility = this.dropdown.style.visibility;
            const prevOpacity = this.dropdown.style.opacity;
            this.dropdown.style.visibility = 'hidden';
            this.dropdown.style.opacity = '0';
            const dropdownRect = this.dropdown.getBoundingClientRect();
            const dropdownHeight = dropdownRect.height || 160; // fallback heuristic
            // Restore initial styles before final placement
            this.dropdown.style.visibility = prevVisibility;
            this.dropdown.style.opacity = prevOpacity;

            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const gap = 8; // px

            let top;
            if (spaceBelow < dropdownHeight + gap) {
                // Not enough space below – render above the button
                top = buttonRect.top - dropdownHeight - gap;
                this.dropdown.classList.add('fh-dropup');
            } else {
                // Default: render below
                top = buttonRect.bottom + gap;
                this.dropdown.classList.remove('fh-dropup');
            }

            this.dropdown.style.left = `${left}px`;
            this.dropdown.style.top = `${top}px`;

            console.log('📍 Dropdown positioned at:', { left, top, dropdownHeight, spaceBelow });
        } catch (error) {
            console.error('❌ Error positioning dropdown:', error);
        }
    }

    close() {
        if (!this.dropdown) return;
        
        console.log('🔄 Closing dropdown');
        this.dropdown.style.display = 'none';
        this.dropdown.style.opacity = '0';
        this.dropdown.style.transform = 'scale(0.95) translateY(-4px)';
        this.isOpen = false;
    }

    toggle() {
        console.log('🔄 Toggling dropdown, current state:', this.isOpen);
        this.isOpen ? this.close() : this.open();
    }
    
    destroy() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
        if (this.repositionHandler) {
            window.removeEventListener('scroll', this.repositionHandler);
            window.removeEventListener('resize', this.repositionHandler);
        }
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
    }
}

// Expose globally for other modules if needed
if (typeof window !== 'undefined') {
    window.ChatModelSelector = ChatModelSelector;
}

console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 
console.log('✅ ChatUI exported successfully (CommonJS + ES6 + Global)'); 