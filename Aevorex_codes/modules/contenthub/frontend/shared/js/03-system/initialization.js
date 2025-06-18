/**
 * ContentHub System Initialization
 * Manages the startup sequence and module loading
 */

class SystemInitialization {
    constructor() {
        this.modules = new Map();
        this.initStartTime = performance.now();
        this.init();
        console.log('🚀 System Initialization started');
    }

    async init() {
        try {
            await this.preInit();
            await this.loadCoreModules();
            await this.loadComponents();
            await this.postInit();
            this.completeInit();
        } catch (error) {
            this.handleInitError(error);
        }
    }

    async preInit() {
        console.log('📋 Pre-initialization phase...');
        
        // Set up global error handling early
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Initialize performance monitoring
        if (window.ContentHub?.PerformanceMonitor) {
            window.ContentHub.PerformanceMonitor.startTimer('initialization');
        }
        
        // Check if DOM is ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    async loadCoreModules() {
        console.log('🔧 Loading core modules...');
        
        const coreModules = [
            'ThemeManager',
            'APIClient', 
            'ErrorHandler',
            'PerformanceMonitor',
            'RouterManager'
        ];

        for (const moduleName of coreModules) {
            await this.loadModule(moduleName);
        }
    }

    async loadComponents() {
        console.log('🧩 Loading UI components...');
        
        const componentModules = [
            'UIInteractions',
            'ModuleCards',
            'Navigation'
        ];

        for (const moduleName of componentModules) {
            await this.loadModule(moduleName);
        }
    }

    async loadModule(moduleName) {
        try {
            const module = window.ContentHub?.[moduleName];
            if (module) {
                if (typeof module.init === 'function') {
                    await module.init();
                }
                this.modules.set(moduleName, {
                    instance: module,
                    status: 'loaded',
                    loadTime: performance.now()
                });
                console.log(`✅ ${moduleName} loaded successfully`);
            } else {
                console.warn(`⚠️ ${moduleName} not found`);
                this.modules.set(moduleName, {
                    status: 'missing',
                    loadTime: performance.now()
                });
            }
        } catch (error) {
            console.error(`❌ Failed to load ${moduleName}:`, error);
            this.modules.set(moduleName, {
                status: 'error',
                error,
                loadTime: performance.now()
            });
        }
    }

    async postInit() {
        console.log('🔄 Post-initialization phase...');
        
        // Setup inter-module communication
        this.setupModuleCommunication();
        
        // Initialize theme
        if (window.ContentHub?.ThemeManager) {
            window.ContentHub.ThemeManager.applyTheme();
        }
        
        // Setup navigation
        if (window.ContentHub?.Navigation) {
            window.ContentHub.Navigation.highlightCurrentPage();
        }

        // Start system monitoring
        if (window.ContentHub?.SystemMonitor) {
            window.ContentHub.SystemMonitor.start();
        }
    }

    setupModuleCommunication() {
        // Create global event bus for modules
        window.ContentHub.EventBus = {
            listeners: new Map(),
            
            on(event, callback) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event).push(callback);
            },
            
            emit(event, data) {
                if (this.listeners.has(event)) {
                    this.listeners.get(event).forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.error(`Error in event listener for ${event}:`, error);
                        }
                    });
                }
            },
            
            off(event, callback) {
                if (this.listeners.has(event)) {
                    const callbacks = this.listeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }
        };
    }

    completeInit() {
        const initTime = performance.now() - this.initStartTime;
        
        console.log(`🎉 ContentHub initialization complete in ${initTime.toFixed(2)}ms`);
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('contenthub:ready', {
            detail: {
                initTime,
                modules: Array.from(this.modules.entries()),
                version: window.ContentHub?.version || '1.0.0'
            }
        }));

        // Remove loading states
        document.body.classList.remove('loading', 'initializing');
        document.body.classList.add('ready');

        // Performance monitoring
        if (window.ContentHub?.PerformanceMonitor) {
            window.ContentHub.PerformanceMonitor.endTimer('initialization');
            window.ContentHub.PerformanceMonitor.trackCustomMetric('modules_loaded', this.modules.size);
        }
    }

    handleInitError(error) {
        console.error('💥 System initialization failed:', error);
        
        document.body.classList.add('init-error');
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'init-error-message';
        errorDiv.innerHTML = `
            <h3>Initialization Error</h3>
            <p>ContentHub failed to initialize properly. Please refresh the page.</p>
            <button onclick="window.location.reload()">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        if (window.ContentHub?.ErrorHandler) {
            window.ContentHub.ErrorHandler.handleError(event.error);
        }
    }

    handleUnhandledRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        if (window.ContentHub?.ErrorHandler) {
            window.ContentHub.ErrorHandler.handleError(event.reason);
        }
    }

    // Public methods
    getModuleStatus(moduleName) {
        return this.modules.get(moduleName);
    }

    getAllModules() {
        return Array.from(this.modules.entries());
    }

    isReady() {
        return document.body.classList.contains('ready');
    }
}

// Initialize and export
const systemInit = new SystemInitialization();
window.ContentHub = window.ContentHub || {};
window.ContentHub.SystemInit = systemInit;

export default systemInit; 