/**
 * @file chat-streaming.js - Chat Streaming Module
 * @description Handles real-time streaming responses from AI
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * Chat Streaming Module
 * Manages Server-Sent Events (SSE) for real-time AI responses
 */
class ChatStreaming {
    constructor(options = {}) {
        // Configuration
        this.config = {
            streamingDelay: options.streamingDelay || 8, // ms between tokens
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 2000,
            backoffFactor: options.backoffFactor || 2, // Exponential back-off factor
            maxRetryDelay: options.maxRetryDelay || 30000, // Cap delay at 30s
            enableTypingIndicator: options.enableTypingIndicator !== false,
            chunkSize: options.chunkSize || 1024
        };
        
        // State
        this.state = {
            isStreaming: false,
            currentStreamId: null,
            streamingMessage: null,
            retryCount: 0,
            abortController: null
        };
        
        // Event system
        this.eventListeners = new Map();
        
        // Performance tracking
        this.metrics = {
            tokensReceived: 0,
            streamingTime: 0,
            averageTokenRate: 0
        };
        
        console.log('🌊 ChatStreaming initialized');
    }
    
    /**
     * Start streaming response from API
     */
    async startStreaming(response, messageId) {
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }
        
        const startTime = performance.now();
        
        try {
            console.log('🌊 Starting stream for message:', messageId);
            
            this.state.isStreaming = true;
            this.state.currentStreamId = messageId;
            this.state.streamingMessage = {
                id: messageId,
                content: '',
                startTime: startTime
            };
            
            // Create abort controller for cancellation
            this.state.abortController = new AbortController();
            
            // Emit streaming started event
            this.emit('streaming-started', { messageId });
            
            // Handle different response types
            if (response.headers.get('content-type')?.includes('text/event-stream')) {
                await this.handleSSEStream(response);
            } else {
                await this.handleJSONStream(response);
            }
            
        } catch (error) {
            console.error('❌ Streaming error:', error);
            this.handleStreamingError(error);
        } finally {
            this.finalizeStreaming(startTime);
        }
    }
    
    /**
     * Start ticker summary streaming (for 0th message)
     * This directly calls the backend stream endpoint for automatic analysis
     */
    async startTickerSummaryStreaming(ticker, messageId) {
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }

        const startTime = performance.now();

        try {
            console.log(`🤖 Starting ticker summary stream for ${ticker}:`, messageId);
            
            this.state.isStreaming = true;
            this.state.currentStreamId = messageId;
            this.state.streamingMessage = {
                id: messageId,
                content: '',
                startTime: startTime,
                isSummary: true,
                ticker: ticker
            };
            
            // Create abort controller for cancellation
            this.state.abortController = new AbortController();
            
            // Emit streaming started event
            this.emit('streaming-started', { messageId, type: 'summary', ticker });
            
            // Get API instance – tolerate legacy global instance vs. class
            let api;
            if (typeof FinanceHubAPIService === 'function') {
                // Modern: FinanceHubAPIService is a constructor
                api = new FinanceHubAPIService();
            } else if (FinanceHubAPIService && typeof FinanceHubAPIService === 'object') {
                // Legacy: global already holds a singleton instance
                api = FinanceHubAPIService;
            } else if (window.FinanceHubAPIClass && typeof window.FinanceHubAPIClass === 'function') {
                api = new window.FinanceHubAPIClass();
            } else {
                throw new Error('FinanceHub API Service unavailable – cannot start ticker summary streaming');
            }
            
            // ---------------------------------------------
            // Primary path → AI summary SSE endpoint
            // ---------------------------------------------
            const summaryUrl = `${api.baseURL || 'http://localhost:8084'}/api/v1/stock/ai-summary/${ticker}?force_refresh=true`;

            console.log(`[ChatStreaming] SSE summary fetch → ${summaryUrl}`);

            const response = await fetch(summaryUrl, {
                method: 'GET',
                headers: {
                    Accept: 'text/event-stream'
                },
                signal: this.state.abortController.signal
            }).catch(err => {
                console.error('AI summary SSE fetch failed, falling back to chat stream:', err);
                return null;
            });

            if (response && response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
                // Stream via SSE handler
                await this.handleSSEStream(response);
            } else {
                // Fallback → non-stream JSON summary
                const jsonFallback = await (response ? response.json().catch(()=>null) : null);
                if (jsonFallback && jsonFallback.ai_summary) {
                    // Revert: push full summary in one update to avoid endless scroll jitter
                    await this.processStreamChunk({
                        content: jsonFallback.ai_summary,
                        delta: jsonFallback.ai_summary,
                        type: 'done'
                    });
                } else {
                    // Last resort → original chat stream call
                    console.warn('AI summary SSE unavailable, using chat stream fallback');
                    if (typeof api.streamChatResponse === 'function') {
            const streamGenerator = api.streamChatResponse(
                "Provide a comprehensive market analysis of this stock including current valuation, recent performance trends, key financial metrics, competitive position, and investment outlook.",
                ticker,
                { messageHistory: [] }
            );
            
            for await (const chunk of streamGenerator) {
                if (!this.state.isStreaming) break;
                if (chunk.type === 'token') {
                    await this.processStreamChunk({
                        content: chunk.content,
                        delta: chunk.content,
                        type: 'token'
                    });
                } else if (chunk.type === 'done') {
                                console.log('✅ Ticker summary chat stream completed');
                    break;
                }
                            if (this.state.abortController?.signal.aborted) break;
                        }
                    } else {
                        throw new Error('No streaming method available for AI summary');
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Ticker summary streaming error:', error);
            this.handleStreamingError(error);
        } finally {
            this.finalizeStreaming(startTime);
        }
    }
    
    /**
     * Handle Server-Sent Events stream
     */
    async handleSSEStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (this.state.isStreaming) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('✅ SSE stream completed');
                    break;
                }
                
                // Decode chunk
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    await this.processSSELine(line);
                }
                
                // Check for abort signal
                if (this.state.abortController?.signal.aborted) {
                    break;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
    
    /**
     * Process individual SSE line
     */
    async processSSELine(line) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine.startsWith(':')) {
            return; // Skip empty lines and comments
        }
        
        if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
                console.log('✅ Stream completed with [DONE] signal');
                this.stopStreaming();
                return;
            }
            
            try {
                const parsed = JSON.parse(data);
                await this.processStreamChunk(parsed);
            } catch (error) {
                console.warn('⚠️ Failed to parse SSE data:', data, error);
            }
        }
    }
    
    /**
     * Handle JSON stream (fallback)
     */
    async handleJSONStream(response) {
        try {
            const data = await response.json();
            
            if (data.content) {
                // Simulate streaming for non-streaming responses
                await this.simulateStreaming(data.content);
            } else {
                throw new Error('No content in response');
            }
            
        } catch (error) {
            console.error('❌ JSON stream error:', error);
            throw error;
        }
    }
    
    /**
     * Simulate streaming for non-streaming responses
     */
    async simulateStreaming(content) {
        const words = content.split(' ');
        let currentContent = '';
        
        for (let i = 0; i < words.length; i++) {
            if (!this.state.isStreaming) break;
            
            currentContent += (i > 0 ? ' ' : '') + words[i];
            
            await this.processStreamChunk({
                content: currentContent,
                delta: words[i],
                isSimulated: true
            });
            
            // Add delay between words
            await this.delay(this.config.streamingDelay);
        }
    }
    
    /**
     * Process individual stream chunk
     */
    async processStreamChunk(chunk) {
        if (!this.state.streamingMessage) return;
        
        try {
            // Extract content from different chunk formats
            let content = '';
            let delta = '';
            
            if (chunk.type === 'ask_deep') {
                // Emit dedicated ask-deep event and early-return (no content update)
                this.emit('ask-deep', {
                    messageId: this.state.currentStreamId,
                    question: chunk.content || 'Szeretnél részletesebb elemzést erről a témáról?'
                });
                return;
            } else if (chunk.type === 'token') {
                // FinanceHub SSE format → each chunk is a new delta slice
                delta = chunk.content || '';
                content = this.state.streamingMessage.content + delta;

            } else if (chunk.choices && chunk.choices[0]) {
                // OpenAI format (full cumulative)
                const choice = chunk.choices[0];
                if (choice.delta?.content) {
                    delta = choice.delta.content;
                    content = this.state.streamingMessage.content + delta;
                }

            } else if (chunk.content) {
                /*
                 * Generic fallback – treat incoming as either cumulative or delta.
                 * If it starts with the already stored content, strip the prefix;
                 * otherwise, assume it's an incremental piece.
                 */
                const incoming = chunk.content;
                const prev = this.state.streamingMessage.content;
                delta = incoming.startsWith(prev) ? incoming.slice(prev.length) : incoming;
                content = prev + delta;

            } else if (typeof chunk === 'string') {
                // Plain text fallback
                delta = chunk;
                content = this.state.streamingMessage.content + delta;
            }
            
            if (content) {
                // Update streaming message
                this.state.streamingMessage.content = content;
                this.metrics.tokensReceived += delta.length;
                
                // Emit content update event
                this.emit('content-update', {
                    messageId: this.state.currentStreamId,
                    content: content,
                    delta: delta,
                    isComplete: false
                });
                
                // Add visual delay for better UX
                if (!chunk.isSimulated) {
                    await this.delay(this.config.streamingDelay);
                }
            }
            
        } catch (error) {
            console.error('❌ Error processing stream chunk:', error);
        }
    }
    
    /**
     * Stop streaming
     */
    stopStreaming() {
        if (!this.state.isStreaming) return;
        
        console.log('🛑 Stopping stream');
        
        this.state.isStreaming = false;
        
        // Abort ongoing request
        if (this.state.abortController) {
            this.state.abortController.abort();
            this.state.abortController = null;
        }
        
        // Emit streaming stopped event
        this.emit('streaming-stopped', { 
            messageId: this.state.currentStreamId 
        });
    }
    
    /**
     * Finalize streaming process
     */
    finalizeStreaming(startTime) {
        const endTime = performance.now();
        const streamingTime = endTime - startTime;
        
        // Update metrics
        this.metrics.streamingTime = streamingTime;
        if (this.metrics.tokensReceived > 0) {
            this.metrics.averageTokenRate = this.metrics.tokensReceived / (streamingTime / 1000);
        }
        
        /*
         * The UI already received every token via appendToLastMessage().
         * If we now emit the full concatenated content, we would duplicate
         * all words (token-stream + final replacement). Therefore we skip
         * the final content-update and only emit the completion event.
         */
        
        // Emit streaming completed event
        this.emit('streaming-completed', {
            messageId: this.state.currentStreamId,
            content: this.state.streamingMessage?.content || '',
            metrics: {
                tokensReceived: this.metrics.tokensReceived,
                streamingTime: streamingTime,
                tokenRate: this.metrics.averageTokenRate
            }
        });
        
        // Reset state
        this.state.isStreaming = false;
        this.state.currentStreamId = null;
        this.state.streamingMessage = null;
        this.state.retryCount = 0;
        
        console.log('✅ Streaming finalized');
    }
    
    /**
     * Handle streaming errors
     */
    handleStreamingError(error) {
        console.error('❌ Streaming error:', error);
        
        // Emit error event
        this.emit('streaming-error', {
            messageId: this.state.currentStreamId,
            error: error.message,
            retryCount: this.state.retryCount
        });
        
        // Attempt retry if configured
        if (this.state.retryCount < this.config.retryAttempts) {
            this.state.retryCount++;
            const delay = Math.min(
                this.config.retryDelay * Math.pow(this.config.backoffFactor, this.state.retryCount - 1),
                this.config.maxRetryDelay
            );
            console.log(
                `🔄 Retrying stream in ${delay}ms (attempt ${this.state.retryCount}/${this.config.retryAttempts})`
            );

            setTimeout(() => {
                this.emit('retry-requested', {
                    messageId: this.state.currentStreamId,
                    retryCount: this.state.retryCount
                });
            }, delay);
        } else {
            console.error('❌ Max retry attempts reached');
            this.emit('streaming-failed', {
                messageId: this.state.currentStreamId,
                error: error.message
            });
        }
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
     * Get current streaming state
     */
    getState() {
        return {
            isStreaming: this.state.isStreaming,
            currentStreamId: this.state.currentStreamId,
            retryCount: this.state.retryCount,
            metrics: { ...this.metrics }
        };
    }
    
    /**
     * Destroy streaming instance
     */
    destroy() {
        this.stopStreaming();
        this.eventListeners.clear();
        
        console.log('🗑️ ChatStreaming destroyed');
    }
    
    /**
     * Compatibility alias – FinanceHubChat expects an initialize() async method.
     * Currently ChatStreaming requires no asynchronous setup, so this simply resolves immediately.
     */
    async initialize() {
        // No-op initialization
        console.log('⚡ ChatStreaming.initialize() noop');
        return Promise.resolve();
    }
    
    /**
     * Modern streaming implementation – delegates to FinanceHubAPIService.streamChatResponse()
     * which returns an async generator yielding {type, content} objects.
     * Falls back to legacy POST /stream if the API class is unavailable.
     */
    async startStream({ endpoint, symbol, messageId, prompt }) {
        // Guard against parallel streams
        if (this.state.isStreaming) {
            console.warn('⚠️ Already streaming, stopping previous stream');
            this.stopStreaming();
        }

        const startTime = performance.now();

        // Mark streaming state
        this.state.isStreaming = true;
        this.state.currentStreamId = messageId;
        this.state.streamingMessage = {
            id: messageId,
            content: '',
            startTime
        };

        // Create abort controller for cancellation
        this.state.abortController = new AbortController();

        // Emit streaming started event
        this.emit('streaming-started', { messageId, type: 'chat', ticker: symbol });

        // Diagnostic: log endpoint & mode resolution
        console.log(`[ChatStreaming] startStream → ${endpoint}?symbol=${symbol}`);
        // Attempt modern API first
        try {
            let api;
            if (typeof FinanceHubAPIService === 'function') {
                api = new FinanceHubAPIService();
            } else if (FinanceHubAPIService && typeof FinanceHubAPIService === 'object') {
                api = FinanceHubAPIService; // singleton instance
            }

            if (api && typeof api.streamChatResponse === 'function') {
                // Use async generator streaming
                const stream = api.streamChatResponse(prompt, symbol, { messageId });
                for await (const chunk of stream) {
                    if (!this.state.isStreaming) break;

                    if (chunk.type === 'token') {
                        await this.processStreamChunk({
                            content: chunk.content,
                            delta: chunk.content,
                            type: 'token'
                        });
                    } else if (chunk.type === 'done') {
                        console.log('✅ Chat stream completed');
                        break;
                    }

                    // Abort check
                    if (this.state.abortController?.signal.aborted) {
                        break;
                    }
                }
                this.finalizeStreaming(startTime);
                return; // ✅ streaming handled
            }
        } catch (modernErr) {
            console.warn('Modern streamChatResponse failed, falling back to legacy POST /stream:', modernErr);
            // Continue to legacy fallback below
        }

        // Legacy fallback – POST to /stream endpoint (may be unsupported)
        console.log('%c[ChatStreaming] Falling back to legacy fetch URL', 'color:#f80');
        try {
            // Build correct legacy URL: <endpointRoot>/<symbol>/chat/stream
            // Where endpointRoot defaults to `${apiBaseUrl}/stock`.
            const response = await fetch(`${endpoint}/${symbol}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ message: prompt, chat_id: messageId })
            });
            await this.startStreaming(response, messageId);

            // finalize handled by startStreaming but ensure fallback
            if (this.state.isStreaming) {
                this.finalizeStreaming(startTime);
            }
        } catch (error) {
            console.error('❌ ChatStreaming.startStream legacy fallback error:', error);
            throw error;
        }
    }
}

// Make globally available
window.ChatStreaming = ChatStreaming;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatStreaming,
        default: ChatStreaming
    };
}

// ES6 Export
export { ChatStreaming };
export default ChatStreaming;

console.log('✅ ChatStreaming exported successfully (CommonJS + ES6 + Global)'); 