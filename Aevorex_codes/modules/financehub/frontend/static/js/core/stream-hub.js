/**
 * @file stream-hub.js - FinanceHub Stream Management Singleton
 * @description Centralized streaming service for chat, real-time data, and SSE connections
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * StreamHub Singleton - Centralized streaming management
 * Handles chat streaming, real-time data feeds, and SSE connections
 */

let streamHubInstance = null;

class StreamHub {
    constructor() {
        if (streamHubInstance) {
            return streamHubInstance;
        }

        this.activeStreams = new Map();
        this.eventListeners = new Map();
        this.config = {
            baseURL: 'http://localhost:8084',
            reconnectAttempts: 5,
            reconnectDelay: 500,
            heartbeatInterval: 30000
        };
        
        console.log('✅ StreamHub: Singleton instance created');
        streamHubInstance = this;
        return this;
    }

    /**
     * Start chat streaming for a specific ticker
     * @param {string} ticker - Stock ticker symbol
     * @param {string} message - User message
     * @param {Function} onMessage - Callback for streaming messages
     * @param {Function} onError - Error callback
     * @param {Function} onComplete - Completion callback
     */
    async startChatStream(ticker, message, onMessage, onError, onComplete) {
        const streamId = `chat-${ticker}-${Date.now()}`;
        
        try {
            console.log(`🔄 StreamHub: Starting chat stream for ${ticker}`);
            
            /**
             * Exponenciális visszatérési logika (0.5s, 1s, 2s, 4s …)
             */
            const maxAttempts = this.config.reconnectAttempts ?? 4;
            let attempt = 0;
            let response;

            while (attempt < maxAttempts) {
                try {
                    response = await fetch(`${this.config.baseURL}/api/v1/stock/${ticker}/chat/stream`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'text/event-stream'
                        },
                        body: JSON.stringify({
                            message: message,
                            stream: true,
                            ticker: ticker
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    // siker
                    break;
                } catch (err) {
                    attempt += 1;
                    if (attempt >= maxAttempts) {
                        throw err;
                    }
                    const backoffMs = this.config.reconnectDelay * Math.pow(2, attempt - 1);
                    console.warn(`⚠️  StreamHub: attempt ${attempt} failed (${err}). Retrying in ${backoffMs} ms…`);
                    await new Promise(res => setTimeout(res, backoffMs));
                }
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            this.activeStreams.set(streamId, {
                reader,
                ticker,
                startTime: Date.now(),
                status: 'active'
            });

            // Process streaming data
            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log(`✅ StreamHub: Chat stream completed for ${ticker}`);
                            this.activeStreams.delete(streamId);
                            if (onComplete) onComplete();
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (onMessage) onMessage(data);
                                } catch (parseError) {
                                    // Handle plain text streaming
                                    const text = line.slice(6);
                                    if (text.trim() && onMessage) {
                                        onMessage({ content: text, type: 'text' });
                                    }
                                }
                            }
                        }
                    }
                } catch (streamError) {
                    console.error(`❌ StreamHub: Stream error for ${ticker}:`, streamError);
                    this.activeStreams.delete(streamId);
                    if (onError) onError(streamError);
                }
            };

            processStream();
            return streamId;

        } catch (error) {
            console.error(`❌ StreamHub: Failed to start chat stream for ${ticker}:`, error);
            if (onError) onError(error);
            return null;
        }
    }

    /**
     * Stop a specific stream
     * @param {string} streamId - Stream identifier
     */
    stopStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (stream && stream.reader) {
            try {
                stream.reader.cancel();
                this.activeStreams.delete(streamId);
                console.log(`✅ StreamHub: Stream ${streamId} stopped`);
            } catch (error) {
                console.error(`❌ StreamHub: Error stopping stream ${streamId}:`, error);
            }
        }
    }

    /**
     * Stop all active streams
     */
    stopAllStreams() {
        console.log(`🔄 StreamHub: Stopping ${this.activeStreams.size} active streams`);
        
        for (const [streamId, stream] of this.activeStreams) {
            if (stream.reader) {
                try {
                    stream.reader.cancel();
                } catch (error) {
                    console.error(`❌ StreamHub: Error stopping stream ${streamId}:`, error);
                }
            }
        }
        
        this.activeStreams.clear();
        console.log('✅ StreamHub: All streams stopped');
    }

    /**
     * Get active stream information
     */
    getActiveStreams() {
        return Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
            id,
            ticker: stream.ticker,
            status: stream.status,
            duration: Date.now() - stream.startTime
        }));
    }

    /**
     * Add event listener for stream events
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ StreamHub: Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Update configuration
     * @param {Object} newConfig - Configuration updates
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('✅ StreamHub: Configuration updated', this.config);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            activeStreams: this.activeStreams.size,
            config: this.config,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }
}

/**
 * Get or create the StreamHub singleton instance
 */
function getStreamHub() {
    if (!streamHubInstance) {
        new StreamHub();
    }
    return streamHubInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
function resetStreamHub() {
    if (streamHubInstance) {
        streamHubInstance.stopAllStreams();
        streamHubInstance = null;
    }
    console.log('🔄 StreamHub: Instance reset');
}

// Global exports
if (typeof window !== 'undefined') {
    window.getStreamHub = getStreamHub;
    window.resetStreamHub = resetStreamHub;
    window.StreamHub = StreamHub;
}

// ES module exports
export { getStreamHub, resetStreamHub, StreamHub };

// CommonJS exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreamHub, resetStreamHub, StreamHub };
}

console.log('✅ StreamHub: Module loaded successfully'); 
 
 