/**
 * @file api-singleton.js - FinanceHub API Singleton
 * @description Ensures single instance of FinanceHubAPIService across the application
 * @version 1.0.0
 * @author AEVOREX
 */

/**
 * API Singleton - Centralized API client management
 * Provides a single instance of the FinanceHub API client
 */

let apiInstance = null;

/**
 * Get or create the API singleton instance
 */
function getAPIInstance() {
    if (apiInstance) {
        return apiInstance;
    }

    console.log('🔄 API Singleton: Creating new API instance...');
    
    try {
        // Try multiple approaches to get the API class
        let APIClass = null;
        
        // Method 1: Direct global reference
        if (window.FinanceHubAPIService && typeof window.FinanceHubAPIService === 'function') {
            APIClass = window.FinanceHubAPIService;
            console.log('✅ API Singleton: Using FinanceHubAPIService class');
        }
        // Method 2: Legacy class name
        else if (window.FinanceHubAPIClass && typeof window.FinanceHubAPIClass === 'function') {
            APIClass = window.FinanceHubAPIClass;
            console.log('✅ API Singleton: Using FinanceHubAPIClass (legacy)');
        }
        // Method 3: Alternative naming
        else if (window.FinanceHubAPI && typeof window.FinanceHubAPI === 'function') {
            APIClass = window.FinanceHubAPI;
            console.log('✅ API Singleton: Using FinanceHubAPI class');
        }
        
        if (!APIClass) {
            throw new Error('No FinanceHub API class found in global scope');
        }
        
        // Create instance with error handling
        apiInstance = new APIClass();
        
        if (!apiInstance) {
            throw new Error('API class constructor returned null/undefined');
            }

        // 🌐 Attach to global for legacy modules
        if (typeof window !== 'undefined') {
            window.FinanceHubAPIService = apiInstance;
            window.FinanceHubAPI = apiInstance; // back-compat alias
        }
        
        console.log('✅ API Singleton: API instance created successfully');
        
        // Validate essential methods exist
        const requiredMethods = ['getStock', 'getTickerTape'];
        const missingMethods = requiredMethods.filter(method => typeof apiInstance[method] !== 'function');
        
        if (missingMethods.length > 0) {
            console.warn(`⚠️ API Singleton: Missing methods: ${missingMethods.join(', ')}`);
        }
        
        return apiInstance;

        } catch (error) {
        console.error('❌ API Singleton: Failed to create API instance:', error);
        
        // Create minimal fallback API
        console.log('🔄 API Singleton: Creating fallback API...');
        apiInstance = createFallbackAPI();
        if (typeof window !== 'undefined') {
            window.FinanceHubAPIService = apiInstance;
            window.FinanceHubAPI = apiInstance;
        }
        return apiInstance;
        }
    }

    /**
 * Create a minimal fallback API when main API fails
 */
function createFallbackAPI() {
    return {
        getStock: async (symbol) => {
            console.warn('⚠️ Fallback API: getStock called for', symbol);
            throw new Error('API service unavailable - using fallback');
        },
        getTickerTape: async () => {
            console.warn('⚠️ Fallback API: getTickerTape called');
            return [];
        },
        // Add other essential methods as needed
        isReady: () => false,
        isFallback: true
    };
    }

    /**
 * Reset the singleton (useful for testing or reinitialization)
 */
function resetAPIInstance() {
    console.log('🔄 API Singleton: Resetting instance...');
    apiInstance = null;
}

// Export the singleton getter
window.getAPIInstance = getAPIInstance;
window.resetAPIInstance = resetAPIInstance;

// Also export for ES modules
export { getAPIInstance, resetAPIInstance };

console.log('✅ API Singleton: Module loaded successfully');

// Auto-initialize when FinanceHubAPIService is available
if (typeof window !== 'undefined') {
    // Try to initialize immediately if FinanceHubAPIService is already available
    if (typeof window.FinanceHubAPIService !== 'undefined') {
        try {
            const apiInstance = getAPIInstance();
            window.FinanceHubAPI = apiInstance; // Export the actual API service
            console.log('✅ FinanceHub API auto-initialized and exported to window.FinanceHubAPI');
        } catch (error) {
            console.warn('⚠️ Failed to auto-initialize FinanceHub API:', error);
        }
    } else {
        // Wait for FinanceHubAPIService to be available
        const checkForAPIService = () => {
            if (typeof window.FinanceHubAPIService !== 'undefined') {
                try {
                    const apiInstance = getAPIInstance();
                    window.FinanceHubAPI = apiInstance; // Export the actual API service
                    console.log('✅ FinanceHub API auto-initialized and exported to window.FinanceHubAPI');
                } catch (error) {
                    console.warn('⚠️ Failed to auto-initialize FinanceHub API:', error);
                }
            } else {
                // Keep checking every 100ms for up to 5 seconds
                setTimeout(checkForAPIService, 100);
            }
        };
        setTimeout(checkForAPIService, 100);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAPIInstance, resetAPIInstance };
} 