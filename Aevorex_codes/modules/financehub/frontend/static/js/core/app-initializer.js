/**
 * @file app-initializer.js - Core FinanceHub Application Initializer
 * @description Handles app startup, configuration, and core service initialization
 * @version 3.1.0
 * @author AEVOREX FinanceHub Team
 */

/**
 * Core Application Initializer Class
 * Responsible for starting the app and initializing core services
 */
class AppInitializer {
    constructor() {
        console.log('🚀 AppInitializer: Starting core initialization...');
        
        // Version information
        this.VERSION = '3.1.0';
        
        // Configuration object
        this.config = {
            debug: true,
            theme: 'dark',
            defaultSymbol: 'AAPL',
            apiBaseUrl: '/api/v1',
            chartHeight: 600,
            enableAnimations: true,
            autoRefresh: true,
            refreshInterval: 30000
        };

        // Performance tracking
        this.performance = {
            startTime: performance.now(),
            componentTimes: new Map(),
            failedComponents: new Set()
        };

        console.log('✅ AppInitializer: Core initialization complete');
    }

    /**
     * Initialize the application asynchronously
     */
    async initializeApp() {
        try {
            console.log('⏳ AppInitializer: Waiting for services to be ready...');
            await this.waitForServices();
            console.log('✅ AppInitializer: Services ready, initializing app...');
            await this.init();
        } catch (error) {
            console.error('❌ AppInitializer: Failed to initialize FinanceHub:', error);
            this.handleError(error, 'app_initialization');
            this.showErrorState(error);
        }
    }
    
    /**
     * Wait for all core services to be ready before initialization
     */
    waitForServices() {
        console.log('AppInitializer: ES modules handle loading order, skipping legacy waitForServices.');
        return Promise.resolve();
    }
    
    /**
     * Initialize the application with proper dependency loading
     */
    async init() {
        try {
            console.log('🚀 [AppInitializer] Step 1: Starting initialization...');
            
            // Setup global error handling first
            this.setupGlobalErrorHandling();
            console.log('✅ [AppInitializer] Step 1.5: Global error handling setup');
            
            // Initialize core services first
            await this.initializeCoreServices();
            console.log('✅ [AppInitializer] Step 2: Core services initialized');
            
            // Setup error handling
            this.setupErrorHandling();
            console.log('✅ [AppInitializer] Step 3: Error handling setup complete');
            
            // Setup state subscriptions
            this.setupStateSubscriptions();
            console.log('✅ [AppInitializer] Step 4: State subscriptions setup complete');
            
            // Initialize component loader
            if (window.ComponentLoader) {
                await window.ComponentLoader.initialize();
                console.log('✅ [AppInitializer] Step 5: ComponentLoader initialized');
            }
            
            // Initialize event manager
            if (window.EventManager) {
                await window.EventManager.initialize();
                console.log('✅ [AppInitializer] Step 6: EventManager initialized');
            }
            
            // Show the application
            console.log('🎯 [AppInitializer] Step 7: Showing application...');
            this.showApplication();
            console.log('✅ [AppInitializer] Step 7: Application visible');
            
            // Complete initialization
            const initTime = performance.now() - this.performance.startTime;
            
            if (window.FinanceHubState) {
                window.FinanceHubState.dispatch({
                    type: 'APP_INIT_COMPLETE',
                    payload: { 
                        initTime,
                        version: this.VERSION
                    }
                });
            }
            
            console.log(`✅ FinanceHub v${this.VERSION} initialized in ${initTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ [AppInitializer] Initialization failed:', error);
            this.handleError(error, 'initialization');
        }
    }

    /**
     * Initialize core services
     */
    async initializeCoreServices() {
        console.log('🔧 AppInitializer: Initializing core services...');
        
        // Validate required services are available
        const requiredServices = ['FinanceHubAPIService', 'FinanceHubState'];
        const missingServices = requiredServices.filter(service => !window[service]);
        
        if (missingServices.length > 0) {
            throw new Error(`Missing required services: ${missingServices.join(', ')}`);
        }
        
        // Initialize API service
        if (window.FinanceHubAPIService && !window.FinanceHubAPIService.initialized) {
            await window.FinanceHubAPIService.init();
            console.log('✅ AppInitializer: API service initialized');
        }
        
        // Initialize state manager
        if (window.FinanceHubState && !window.FinanceHubState.initialized) {
            window.FinanceHubState.init();
            console.log('✅ AppInitializer: State manager initialized');
        }
        
        // Initialize theme manager
        if (window.themeManager) {
            // Instance available
            if (!window.themeManager.state?.isInitialized) {
                await window.themeManager.init();
                console.log('✅ AppInitializer: Theme manager initialized (instance)');
            } else {
                console.log('ℹ️ AppInitializer: Theme manager already initialized (instance)');
            }
        } else if (window.ThemeManager) {
            // Class available but no instance – create one
            console.warn('⚠️ AppInitializer: themeManager instance missing – creating new instance');
            try {
                window.themeManager = new window.ThemeManager();
                await window.themeManager.init();
                console.log('✅ AppInitializer: Theme manager initialized (new instance)');
            } catch (tmErr) {
                console.error('❌ AppInitializer: Failed to create/init ThemeManager instance:', tmErr);
            }
        } else {
            console.warn('⚠️ AppInitializer: ThemeManager not found on window object');
        }
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        console.log('🛡️ AppInitializer: Setting up error handling...');
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'global_error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandled_promise', {
                promise: event.promise
            });
        });
    }

    /**
     * Setup state subscriptions
     */
    setupStateSubscriptions() {
        console.log('🔗 AppInitializer: Setting up state subscriptions...');
        
        if (window.FinanceHubState) {
            // Subscribe to theme changes
            window.FinanceHubState.subscribe('theme', (theme) => {
                this.applyTheme(theme);
            });
            
            // Subscribe to loading states
            window.FinanceHubState.subscribe('loading', (isLoading) => {
                this.updateLoadingState(isLoading);
            });
        }
    }

    /**
     * Show the application
     */
    showApplication() {
        console.log('🎯 AppInitializer: Showing application...');
        
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app-container');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000);
        }
        
        if (appContainer) {
            setTimeout(() => {
                appContainer.style.opacity = '1';
                appContainer.classList.add('app-loaded');
            }, 1200);
        }
    }

    /**
     * Apply theme to the application
     */
    applyTheme(theme) {
        console.log(`🎨 AppInitializer: Applying theme: ${theme}`);
        
        // Use theme manager if available
        if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
            window.themeManager.setTheme(theme);
            console.log(`✅ AppInitializer: Theme applied via themeManager: ${theme}`);
        } else {
            // Fallback to manual application
            const root = document.documentElement;
            
            // Remove existing theme classes
            root.classList.remove('light-theme', 'dark-theme');
            
            // Add new theme class
            root.classList.add(`${theme}-theme`);
            
            // Set data attribute for CSS targeting
            root.setAttribute('data-theme', theme);
            
            // Update meta theme-color for mobile browsers
            const themeMetaTag = document.getElementById('theme-color-meta');
            if (themeMetaTag) {
                themeMetaTag.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
            }
            
            console.log(`✅ AppInitializer: Theme applied manually: ${theme}`);
        }
    }

    /**
     * Update loading state
     */
    updateLoadingState(isLoading) {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Handle errors
     */
    handleError(error, context, metadata = {}) {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            context,
            metadata,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error(`❌ [AppInitializer] Error in ${context}:`, errorInfo);
        
        // Store error for debugging
        if (!window.financeHubErrors) {
            window.financeHubErrors = [];
        }
        window.financeHubErrors.push(errorInfo);
        
        // Keep only last 20 errors
        if (window.financeHubErrors.length > 20) {
            window.financeHubErrors = window.financeHubErrors.slice(-20);
        }
    }

    /**
     * Show error state
     */
    showErrorState(error) {
        const errorOverlay = document.getElementById('error-overlay');
        const errorMessage = document.getElementById('error-message');
        
        if (errorOverlay && errorMessage) {
            errorMessage.textContent = `Initialization failed: ${error.message}`;
            errorOverlay.style.display = 'flex';
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performance,
            totalTime: performance.now() - this.performance.startTime
        };
    }

    /**
     * Setup global error handling and overlay
     */
    setupGlobalErrorHandling() {
        // Global error overlay for debugging
        const errorOverlay = document.createElement('div');
        errorOverlay.id = 'financehub-error-overlay';
        errorOverlay.className = 'fh-error-overlay hidden';
        errorOverlay.innerHTML = `
            <div class="fh-error-overlay__content">
                <div class="fh-error-overlay__header">
                    <h3>🚨 FinanceHub Debug Error</h3>
                    <button class="fh-error-overlay__close" onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')">×</button>
                </div>
                <div class="fh-error-overlay__body">
                    <div id="fh-error-list"></div>
                </div>
                <div class="fh-error-overlay__footer">
                    <button onclick="window.location.reload()" class="fh-error-overlay__reload">Reload Page</button>
                    <button onclick="console.clear(); document.getElementById('fh-error-list').innerHTML = ''" class="fh-error-overlay__clear">Clear Errors</button>
                </div>
            </div>
        `;
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .fh-error-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .fh-error-overlay.hidden {
                display: none;
            }
            .fh-error-overlay__content {
                background: #1a1a1a;
                border: 2px solid #ff4444;
                border-radius: 8px;
                max-width: 80%;
                max-height: 80%;
                overflow: auto;
                color: white;
            }
            .fh-error-overlay__header {
                padding: 16px;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .fh-error-overlay__close {
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 12px;
                cursor: pointer;
            }
            .fh-error-overlay__body {
                padding: 16px;
                max-height: 400px;
                overflow-y: auto;
            }
            .fh-error-overlay__footer {
                padding: 16px;
                border-top: 1px solid #333;
                display: flex;
                gap: 8px;
            }
            .fh-error-overlay__reload, .fh-error-overlay__clear {
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
            }
            .fh-error-item {
                background: #2a2a2a;
                border-left: 4px solid #ff4444;
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 4px;
            }
            .fh-error-item__component {
                color: #ffaa00;
                font-weight: bold;
            }
            .fh-error-item__message {
                color: #ff6666;
                margin: 4px 0;
            }
            .fh-error-item__time {
                color: #888;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(errorOverlay);
        
        // Listen for financehub-error events
        window.addEventListener('financehub-error', (event) => {
            const { component, error, ...details } = event.detail;
            const timestamp = new Date().toLocaleTimeString();
            
            console.error(`🚨 FinanceHub Error [${component}]:`, error, details);
            
            // Show in overlay if debug mode or URL contains debug=true
            const isDebugMode = window.location.search.includes('debug=true') || 
                               localStorage.getItem('financehub_debug') === 'true';
            
            if (isDebugMode) {
                const errorList = document.getElementById('fh-error-list');
                const errorItem = document.createElement('div');
                errorItem.className = 'fh-error-item';
                errorItem.innerHTML = `
                    <div class="fh-error-item__component">${component}</div>
                    <div class="fh-error-item__message">${error}</div>
                    <div class="fh-error-item__time">${timestamp}</div>
                    ${Object.keys(details).length > 0 ? `<pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
                `;
                
                errorList.appendChild(errorItem);
                errorOverlay.classList.remove('hidden');
                
                // Auto-hide after 10 seconds unless there are multiple errors
                if (errorList.children.length === 1) {
                    setTimeout(() => {
                        if (errorList.children.length === 1) {
                            errorOverlay.classList.add('hidden');
                        }
                    }, 10000);
                }
            }
        });
        
        console.log('✅ Global error handling setup complete');
    }
}

// Export to global scope
window.AppInitializer = AppInitializer;

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.financeHubInitializer = new AppInitializer();
    });
} else {
    window.financeHubInitializer = new AppInitializer();
}

console.log('✅ AppInitializer module loaded successfully');

// Provide legacy global initializer expected by financehub.html
if (typeof window !== 'undefined') {
    window.initializeFinanceHub = function() {
        try {
            if (!window.financeHubInitializer) {
                window.financeHubInitializer = new AppInitializer();
            }
            if (typeof window.financeHubInitializer.initializeApp === 'function') {
                window.financeHubInitializer.initializeApp();
            } else {
                console.error('FinanceHubInitializer instance missing initializeApp()');
            }
        } catch(err) {
            console.error('initializeFinanceHub failed', err);
        }
    };
} 