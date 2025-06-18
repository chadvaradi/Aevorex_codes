/**
 * @file progressive-loader.js - Optimized Progressive Data Loading System
 * @description High-performance chunked loading with intelligent scheduling
 * @version 2.0.0 - Performance Optimized
 * @author AEVOREX
 */

class OptimizedProgressiveLoader {
    constructor() {
        this.loadingStates = new Map();
        this.dataCache = new Map();
        this.loadingQueue = [];
        this.isProcessing = false;
        
        // Performance optimization
        this.requestScheduler = new RequestScheduler();
        this.progressivePerformanceMonitor = new ProgressivePerformanceMonitor();
        
        // Priority levels for different data types
        this.PRIORITIES = {
            CRITICAL: 1,    // Basic price, symbol info
            HIGH: 2,        // Chart data, key metrics
            MEDIUM: 3,      // Financials, ratios
            LOW: 4          // News, AI analysis
        };
        
        // Loading phases with optimized timing
        this.PHASES = {
            PHASE_1: 'stock_data',        // Symbol, price, basic info
            PHASE_2: 'chart_data',        // Chart/OHLCV data
            PHASE_3: 'fundamentals',      // Financial fundamentals
            PHASE_4: 'ai_summary',        // AI analysis, news, extended data
        };
        
        // Optimized delays based on network conditions
        this.delays = {
            phase2: 25,   // Reduced from 50ms
            phase3: 100,  // Reduced from 200ms
            phase4: 300   // Reduced from 500ms
        };
        
        this.init();
    }
    
    init() {
        // Detect network conditions and adjust delays
        this.detectNetworkConditions();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        console.log('🚀 OptimizedProgressiveLoader initialized');
        
        // Auto-start demo if no session is active (disabled to prevent conflicts)
        // setTimeout(() => {
        //     this.startDemoIfNeeded();
        // }, 1500); // Reduced from 2000ms
    }
    
    detectNetworkConditions() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const effectiveType = connection.effectiveType;
            
            // Ultra-aggressive delays for maximum speed
            switch (effectiveType) {
                case '4g':
                    this.delays = { phase2: 10, phase3: 50, phase4: 150 }; // Ultra-fast
                    break;
                case '3g':
                    this.delays = { phase2: 25, phase3: 100, phase4: 300 }; // Fast
                    break;
                case '2g':
                    this.delays = { phase2: 100, phase3: 300, phase4: 800 }; // Standard
                    break;
                default:
                    // Keep optimized defaults for unknown connections
                    this.delays = { phase2: 25, phase3: 100, phase4: 300 };
                    break;
            }
            
            console.log(`📶 Network: ${effectiveType}, Ultra-optimized delays:`, this.delays);
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitor page visibility for pause/resume (less aggressive)
        let isCurrentlyHidden = false;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !isCurrentlyHidden) {
                isCurrentlyHidden = true;
                this.pauseLoading();
            } else if (!document.hidden && isCurrentlyHidden) {
                isCurrentlyHidden = false;
                this.resumeLoading();
            }
        });
        
        // Monitor memory usage
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                    console.warn('⚠️ High memory usage, clearing old cache');
                    this.cleanupOldCache();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Load symbol data progressively with intelligent scheduling
     * @param {string} symbol - Stock symbol
     * @param {Object} options - Loading options
     */
    async loadSymbolProgressive(symbol, options = {}) {
        const sessionId = this.generateSessionId(symbol);
        const startTime = performance.now();
        
        // Reset loading states for new symbol
        this.resetLoadingState(sessionId);
        
        // Start performance monitoring for this session
        this.progressivePerformanceMonitor.startSession(sessionId);
        
        try {
            // Phase 1: Critical data (immediate)
            await this.startPhase1(symbol, sessionId);
            
            // Schedule remaining phases with intelligent delays
            this.schedulePhase2(symbol, sessionId);
            this.schedulePhase3(symbol, sessionId);
            this.schedulePhase4(symbol, sessionId);
            
            // Monitor completion
            this.monitorCompletion(sessionId, startTime);
            
        } catch (error) {
            console.error('❌ Progressive loading error:', error);
            this.updateLoadingState(sessionId, 'error', 'failed');
            
            // 🚨 CRITICAL FIX: Dispatch global error for debugging
            window.dispatchEvent(new CustomEvent('financehub-error', {
                detail: { component: 'progressive-loader', error: error.message, sessionId }
            }));
            
            // Re-throw error for proper debugging
            throw error;
        }
        
        return sessionId;
    }

    /**
     * Phase 1: Critical basic data (immediate, highest priority)
     */
    async startPhase1(symbol, sessionId) {
        const phaseStart = performance.now();
        
        try {
            this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'loading');
            
            console.log(`🔄 Loading stock data for ${symbol}...`);
            const stockData = await window.API.getFundamentals(symbol);
            
            if (stockData) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'completed');
                this.notifyUIUpdate('stock_data', stockData, sessionId);
                
                const phaseTime = performance.now() - phaseStart;
                this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase1', phaseTime);
                
                console.log(`✅ Phase 1 completed in ${phaseTime.toFixed(1)}ms`);
            } else {
                // If stock data is not available, mark as error
                this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'error');
                console.warn('⚠️ Phase 1: Stock data not available');
            }
        } catch (error) {
            this.updateLoadingState(sessionId, this.PHASES.PHASE_1, 'error');
            console.error('❌ Phase 1 loading error:', error);
            throw error; // Critical phase failure should stop the process
        }
    }

    /**
     * Phase 2: Chart data (high priority)
     */
    schedulePhase2(symbol, sessionId) {
        const delay = this.delays.phase2;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'loading');
                
                // ✅ PHASE 2: Use getStockChart instead of deprecated fetchChartData
                console.log('🔄 Phase 2: Loading chart data...');
                const chartData = await window.API.getStockChart(symbol);
                
                if (chartData) {
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'completed');
                    this.notifyUIUpdate('chart_data', chartData, sessionId);
                    
                    const phaseTime = performance.now() - phaseStart;
                    this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase2', phaseTime);
                    
                    console.log(`✅ Phase 2 completed in ${phaseTime.toFixed(1)}ms`);
                } else {
                    // If chart data is not available, mark as completed anyway
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'completed');
                    console.log('⚠️ Phase 2: Chart data not available, skipping');
                }
            } catch (error) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_2, 'error');
                console.error('❌ Phase 2 loading error:', error);
            }
        }, delay);
    }

    /**
     * Phase 3: Fundamental data (medium priority)
     */
    schedulePhase3(symbol, sessionId) {
        const delay = this.delays.phase3;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'loading');
                
                // ✅ PHASE 3: Use getStockFundamentals instead of deprecated fetchFundamentals
                console.log('🔄 Phase 3: Loading fundamentals data...');
                const fundamentals = await window.API.getStockFundamentals(symbol);
                
                if (fundamentals) {
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'completed');
                    this.notifyUIUpdate('fundamentals', fundamentals, sessionId);
                    
                    const phaseTime = performance.now() - phaseStart;
                    this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase3', phaseTime);
                    
                    console.log(`✅ Phase 3 completed in ${phaseTime.toFixed(1)}ms`);
                } else {
                    // If fundamentals data is not available, mark as completed anyway
                    this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'completed');
                    console.log('⚠️ Phase 3: Fundamentals data not available, skipping');
                }
            } catch (error) {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_3, 'error');
                console.error('❌ Phase 3 loading error:', error);
            }
        }, delay);
    }

    /**
     * Phase 4: AI Summary (was Analytics)
     */
    schedulePhase4(symbol, sessionId) {
        const delay = this.delays.phase4;
        
        setTimeout(async () => {
            const phaseStart = performance.now();
            
            try {
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'loading');
                
                console.log(`🤖 Phase 4: Generating AI insights for ${symbol}...`);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'loading', 'Generating AI insights...');
                
                // ✅ PHASE 4: Use getStockAISummary instead of deprecated fetchAISummary
                const aiSummary = await window.API.getStockAISummary(symbol);
                
                console.log('✅ Phase 4: AI Summary data loaded successfully');
                this.notifyUIUpdate('ai_summary', aiSummary, sessionId);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'completed', 'AI insights generated successfully');
                
                // Record performance
                const phaseTime = performance.now() - phaseStart;
                this.progressivePerformanceMonitor.recordPhase(sessionId, 'phase4', phaseTime);
                
            } catch (error) {
                console.error('❌ Phase 4: AI Summary loading failed:', error);
                this.updateLoadingState(sessionId, this.PHASES.PHASE_4, 'error', `AI insights generation failed: ${error.message}`);
                this.notifyLoadingProgress(sessionId, this.PHASES.PHASE_4, 'error', `AI insights generation failed: ${error.message}`);
            }
        }, delay);
    }
    
    monitorCompletion(sessionId, startTime) {
        const checkCompletion = () => {
            if (this.isLoadingComplete(sessionId)) {
                const totalTime = performance.now() - startTime;
                this.progressivePerformanceMonitor.completeSession(sessionId, totalTime);
                console.log(`🎉 Progressive loading completed in ${totalTime.toFixed(1)}ms`);
                
                // Emit completion event
                this.notifyLoadingComplete(sessionId, totalTime);
            } else {
                setTimeout(checkCompletion, 100);
            }
        };
        
        setTimeout(checkCompletion, 100);
    }

    /**
     * Generate unique session ID with performance tracking
     */
    generateSessionId(symbol) {
        return `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Reset loading state for new session
     */
    resetLoadingState(sessionId) {
        this.loadingStates.set(sessionId, {
            [this.PHASES.PHASE_1]: 'pending',
            [this.PHASES.PHASE_2]: 'pending', 
            [this.PHASES.PHASE_3]: 'pending',
            [this.PHASES.PHASE_4]: 'pending',
            startTime: Date.now(),
            paused: false
        });
    }

    /**
     * Update loading state for a specific phase
     */
    updateLoadingState(sessionId, phase, status, message = '') {
        const state = this.loadingStates.get(sessionId);
        if (state && !state.paused) {
            state[phase] = status;
            state.lastUpdate = Date.now();
            state.message = message;
            
            // Notify UI of loading progress
            this.notifyLoadingProgress(sessionId, phase, status, message);
        }
    }

    /**
     * Notify UI of loading progress with performance data
     */
    notifyLoadingProgress(sessionId, phase, status, message = '') {
        const event = new CustomEvent('progressiveLoading', {
            detail: { 
                sessionId, 
                phase, 
                status, 
                message,
                timestamp: Date.now(),
                performance: this.progressivePerformanceMonitor.getSessionStats(sessionId)
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Notify UI of data updates
     */
    notifyUIUpdate(dataType, data, sessionId) {
        const event = new CustomEvent('dataUpdate', {
            detail: { 
                dataType, 
                data, 
                sessionId, 
                timestamp: Date.now(),
                cacheHit: data.metadata?.cache_hit || false
            }
        });
        document.dispatchEvent(event);
    }
    
    notifyLoadingComplete(sessionId, totalTime) {
        const event = new CustomEvent('progressiveLoadingComplete', {
            detail: { 
                sessionId, 
                totalTime,
                performance: this.progressivePerformanceMonitor.getSessionStats(sessionId)
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current loading state
     */
    getLoadingState(sessionId) {
        return this.loadingStates.get(sessionId) || null;
    }

    /**
     * Check if all phases are completed
     */
    isLoadingComplete(sessionId) {
        const state = this.loadingStates.get(sessionId);
        if (!state) return false;
        
        return Object.values(this.PHASES).every(phase => 
            state[phase] === 'completed' || state[phase] === 'error'
        );
    }
    
    // === PERFORMANCE OPTIMIZATION METHODS ===
    
    pauseLoading() {
        for (const [sessionId, state] of this.loadingStates.entries()) {
            state.paused = true;
        }
        console.log('⏸️ Progressive loading paused');
    }
    
    resumeLoading() {
        for (const [sessionId, state] of this.loadingStates.entries()) {
            state.paused = false;
        }
        console.log('▶️ Progressive loading resumed');
    }
    
    cleanupOldCache() {
        const cutoff = Date.now() - 300000; // 5 minutes
        for (const [sessionId, state] of this.loadingStates.entries()) {
            if (state.startTime < cutoff) {
                this.loadingStates.delete(sessionId);
            }
        }
    }
    
    getPerformanceStats() {
        return this.progressivePerformanceMonitor.getOverallStats();
    }

    /**
     * Start demo mode if no active session
     */
    startDemoIfNeeded() {
        if (!this.loadingStates.size && !document.querySelector('.analysis-content:not(.hidden)')) {
            console.log('🎯 Starting progressive loading demo with AAPL');
            this.loadSymbolProgressive('AAPL');
        }
    }
}

// === PERFORMANCE MONITORING CLASSES ===

class RequestScheduler {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    
    schedule(request, priority = 3) {
        this.queue.push({ request, priority, timestamp: Date.now() });
        this.queue.sort((a, b) => a.priority - b.priority);
        
        if (!this.processing) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        this.processing = true;
        
        while (this.queue.length > 0) {
            const { request } = this.queue.shift();
            try {
                await request();
            } catch (error) {
                console.error('Scheduled request failed:', error);
            }
        }
        
        this.processing = false;
    }
}

class ProgressivePerformanceMonitor {
    constructor() {
        this.sessions = new Map();
        this.overallStats = {
            totalSessions: 0,
            averageLoadTime: 0,
            successRate: 0,
            phaseStats: {}
        };
    }
    
    startSession(sessionId) {
        this.sessions.set(sessionId, {
            startTime: performance.now(),
            phases: {},
            completed: false
        });
        this.overallStats.totalSessions++;
    }
    
    recordPhase(sessionId, phase, duration) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.phases[phase] = duration;
        }
        
        // Update overall phase stats
        if (!this.overallStats.phaseStats[phase]) {
            this.overallStats.phaseStats[phase] = { total: 0, count: 0, average: 0 };
        }
        
        const phaseStats = this.overallStats.phaseStats[phase];
        phaseStats.total += duration;
        phaseStats.count++;
        phaseStats.average = phaseStats.total / phaseStats.count;
    }
    
    completeSession(sessionId, totalTime) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.completed = true;
            session.totalTime = totalTime;
            
            // Update overall average
            const completedSessions = Array.from(this.sessions.values())
                .filter(s => s.completed);
            
            this.overallStats.averageLoadTime = 
                completedSessions.reduce((sum, s) => sum + s.totalTime, 0) / completedSessions.length;
            
            this.overallStats.successRate = 
                completedSessions.length / this.overallStats.totalSessions;
        }
    }
    
    getSessionStats(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    getOverallStats() {
        return this.overallStats;
    }
}

// Global instance
window.ProgressiveLoader = new OptimizedProgressiveLoader();

// Make classes globally available
window.OptimizedProgressiveLoader = OptimizedProgressiveLoader;
window.RequestScheduler = RequestScheduler;
window.ProgressivePerformanceMonitor = ProgressivePerformanceMonitor;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        OptimizedProgressiveLoader, 
        RequestScheduler, 
        ProgressivePerformanceMonitor,
        default: OptimizedProgressiveLoader
    };
}

// ES6 Export - commented out for bundler compatibility
/* export { OptimizedProgressiveLoader, RequestScheduler, ProgressivePerformanceMonitor };
export default OptimizedProgressiveLoader; */

console.log('✅ OptimizedProgressiveLoader exported successfully (CommonJS + Global)'); 