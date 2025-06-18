/**
 * AEVOREX FINANCEHUB - Module Loader
 * Dynamic module loading and dependency management
 * Version: 4.0.0 - Modern Architecture Only
 */

class ModuleLoader {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || '',
            timeout: config.timeout || 10000,
            retryAttempts: config.retryAttempts || 3,
            ...config
        };
        
        this.loadedModules = new Map();
        this.pendingLoads = new Map();
        this.dependencies = new Map();
        this.initQueue = [];
        
        this.setupDependencies();
    }

    setupDependencies() {
        // Define module dependencies - Modern architecture only
        this.dependencies.set('FinanceHubChat', ['FinanceHubAPI']);
        this.dependencies.set('AnalysisBubbles', ['StockDataManager']);
        this.dependencies.set('TickerTapeUnified', ['FinanceHubAPI']);
        this.dependencies.set('AnalysisBubbles', ['FinanceHubAPI', 'StockDataManager']);
        this.dependencies.set('UnifiedChartManager', ['TradingViewWidget']);
        this.dependencies.set('HeaderManager', ['FinanceHubAPI']);
    }

    /**
     * Load a module with dependency resolution
     */
    async loadModule(moduleName, config = {}) {
        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        if (this.pendingLoads.has(moduleName)) {
            return this.pendingLoads.get(moduleName);
        }

        const loadPromise = this.createModule(moduleName, config);
        this.pendingLoads.set(moduleName, loadPromise);

        try {
            const moduleInstance = await loadPromise;
            this.loadedModules.set(moduleName, moduleInstance);
            this.pendingLoads.delete(moduleName);
            return moduleInstance;
        } catch (error) {
            this.pendingLoads.delete(moduleName);
            throw error;
        }
    }

    async createModule(moduleName, config) {
        let moduleInstance;

        switch (moduleName) {
            case 'FinanceHubAPI':
                // FinanceHubAPI is already globally available as window.FinanceHubAPI
                if (window.FinanceHubAPI) {
                    moduleInstance = window.FinanceHubAPI;
                } else {
                    throw new Error('FinanceHubAPI not available globally');
                }
                break;

            case 'FinanceHubChat':
                if (window.FinanceHubChat) {
                    moduleInstance = new window.FinanceHubChat(config);
                } else {
                    throw new Error('FinanceHubChat class not available');
                }
                break;

            case 'TickerTapeUnified':
                if (window.TickerTapeUnified) {
                    // Ensure apiClient is provided
                    if (!config.apiClient) {
                        if (window.FinanceHubAPI) {
                            config = { ...config, apiClient: window.FinanceHubAPI };
                        } else {
                            console.warn('ModuleLoader: FinanceHubAPI not available globally to inject into TickerTapeUnified');
                        }
                    }
                    moduleInstance = new window.TickerTapeUnified(config);
                } else {
                    throw new Error('TickerTapeUnified class not available');
                }
                break;

            case 'AnalysisBubbles':
                if (window.AnalysisBubbles) {
                    moduleInstance = new window.AnalysisBubbles(config);
                } else {
                    throw new Error('AnalysisBubbles class not available');
                }
                break;

            case 'UnifiedChartManager':
                if (window.UnifiedChartManager) {
                    moduleInstance = new window.UnifiedChartManager(config);
                } else {
                    throw new Error('UnifiedChartManager class not available');
                }
                break;

            case 'HeaderManager':
                if (window.HeaderManager) {
                    moduleInstance = new window.HeaderManager(config);
                } else {
                    throw new Error('HeaderManager class not available');
                }
                break;

            default:
                throw new Error(`Unknown module: ${moduleName}`);
        }

        return moduleInstance;
    }

    /**
     * Load essential modules in order
     */
    async loadCoreModules() {
        try {

            // 🚫 Avoid UI duplication: UI components are now loaded exclusively via ComponentLoader
            const coreModules = [
                'FinanceHubAPI',
                'StockDataManager'
            ];

            console.log('🚀 Loading modern FinanceHub modules...');

            for (const moduleName of coreModules) {
                try {
                    await this.loadModule(moduleName);
                    console.log(`✅ ${moduleName} loaded successfully`);
                } catch (error) {
                    console.warn(`⚠️ Failed to load ${moduleName}:`, error.message);
                }
            }

            console.log('🎉 Modern module loading completed');
            return this.loadedModules;
        } catch (error) {
            console.error('❌ Error loading core modules:', error);
            throw error;
        }
    }

    /**
     * Get loaded module
     */
    getModule(name) {
        return this.loadedModules.get(name);
    }

    /**
     * Check if module is loaded
     */
    isLoaded(name) {
        return this.loadedModules.has(name);
    }

    /**
     * Get all loaded modules
     */
    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    /**
     * Unload module
     */
    async unloadModule(name) {
        const module = this.loadedModules.get(name);
        if (module) {
            // Call destroy method if available
            if (typeof module.destroy === 'function') {
                try {
                    await module.destroy();
                } catch (error) {
                    console.warn(`Warning during module ${name} destruction:`, error);
                }
            }

            this.loadedModules.delete(name);
            console.log(`🗑️ Module unloaded: ${name}`);
        }
    }

    /**
     * Reload module
     */
    async reloadModule(name, config = {}) {
        await this.unloadModule(name);
        return this.loadModule(name, config);
    }

    /**
     * Get module loading status
     */
    getLoadingStatus() {
        return {
            loaded: Array.from(this.loadedModules.keys()),
            loading: Array.from(this.pendingLoads.keys()),
            dependencies: Object.fromEntries(this.dependencies)
        };
    }

    /**
     * Emit event
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventBus.dispatchEvent(event);
    }

    /**
     * Add event listener
     */
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    /**
     * Destroy module loader
     */
    async destroy() {
        // Unload all modules
        const moduleNames = Array.from(this.loadedModules.keys());
        for (const name of moduleNames) {
            await this.unloadModule(name);
        }

        // Clear all data
        this.loadedModules.clear();
        this.pendingLoads.clear();
        this.dependencies.clear();
    }
}

// Create singleton instance
const moduleLoader = new ModuleLoader();
moduleLoader.setupDependencies();

// Make globally available
window.ModuleLoader = moduleLoader;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModuleLoader,
        default: moduleLoader
    };
}

// ES6 Export
export { ModuleLoader };
export default moduleLoader;

console.log('✅ ModuleLoader exported successfully (CommonJS + ES6 + Global)'); 