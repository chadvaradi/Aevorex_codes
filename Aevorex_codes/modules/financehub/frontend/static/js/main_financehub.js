/**
 * @file main_financehub.js - FinanceHub Module Import Coordinator
 * @description Import coordinator for all FinanceHub JavaScript modules
 * @version 3.2.0 - Simplified Import-Only Architecture
 * @author AEVOREX FinanceHub Team
 */

console.log('FinanceHub Import Coordinator Loading...');

// -----------------------------------------------------------------------------
// GLOBAL ALIASES ▸ Step-4  (remove legacy "Unified" prefix dependencies)
// -----------------------------------------------------------------------------
(() => {
    // Ticker Tape
    if (window.TickerTapeUnified && !window.TickerTape) {
        window.TickerTape = window.TickerTapeUnified;
        console.log('Alias set: TickerTape -> TickerTapeUnified');
    }

    // Chart Manager
    if (window.UnifiedChartManager && !window.ChartManager) {
        window.ChartManager = window.UnifiedChartManager;
        console.log('Alias set: ChartManager -> UnifiedChartManager');
    }

    // UX Enhancements
    if (window.AdvancedUXEnhancementsUnified && !window.AdvancedUXEnhancements) {
        window.AdvancedUXEnhancements = window.AdvancedUXEnhancementsUnified;
        console.log('Alias set: AdvancedUXEnhancements -> AdvancedUXEnhancementsUnified');
    }

    // Component Loader already handles unified names, but expose generic when missing
    if (window.FinanceHubChat && !window.ChatInterface) {
        window.ChatInterface = window.FinanceHubChat;
        console.log('Alias set: ChatInterface -> FinanceHubChat');
    }
    
    // API Compatibility Layer - Handle transition from analytics to specialized endpoints
    if (window.FinanceHubAPI) {
        // Create compatibility methods for legacy code expecting old endpoints
        const api = window.FinanceHubAPI;
        
        // Add analytics endpoint compatibility
        if (!api.getStockAnalytics) {
            api.getStockAnalytics = function(ticker) {
                console.warn(`Legacy getStockAnalytics(${ticker}) called - using getFundamentals instead`);
                return api.getFundamentals(ticker);
            };
        }
        
        // Add unified endpoint compatibility
        if (!api.getUnifiedStockData) {
            api.getUnifiedStockData = function(ticker) {
                console.warn(`Legacy getUnifiedStockData(${ticker}) called - using getFundamentals instead`);
                return api.getFundamentals(ticker);
            };
        }
        
        // Ensure search endpoint works correctly
        if (api.searchStocks && typeof api.searchStocks === 'function') {
            // Wrap original method to ensure consistent response format
            const originalSearch = api.searchStocks;
            api.searchStocks = async function(query, limit = 10) {
                try {
                    const results = await originalSearch.call(api, query, limit);
                    // Normalize response format for consumers
                    if (Array.isArray(results)) {
                        return { results };
                    } else if (results && results.results) {
                        return results;
                    } else {
                        return { results: [] };
                    }
                } catch (error) {
                    console.error(`Search error: ${error.message}`);
                    return { results: [], error: error.message };
                }
            };
        }
        
        console.log('API compatibility layer initialized for legacy endpoints');
    }
})();

// =============================================================================
// CORE MODULES - Foundation Layer
// =============================================================================

// Core utilities and helpers
// File: core/utils.js - Utility functions and helpers

// API service layer
// File: core/api.js - Core API communication service

// State management system
// File: core/state-manager.js - Application state management

// Theme management
// File: core/theme-manager.js - Dark/Light theme system

// Progressive loading system
// File: core/progressive-loader.js - Component loading with fallbacks

// Application initializer
// File: core/app-initializer.js - Core app initialization logic

// Component loader
// File: core/component-loader.js - Dynamic component loading system

// Event management
// File: core/event-manager.js - Global event coordination

// =============================================================================
// SERVICES & LOGIC - Business Layer
// =============================================================================

// Module loader service
// File: services/module-loader.js - Dynamic module loading

// Search logic
// File: logic/search-logic.js - Stock symbol search logic

// Application state store
// File: store/app-state.js - Centralized state store

// Header UI management
// File: ui/header-ui.js - Header interface management

// =============================================================================
// COMPONENTS - UI Layer
// =============================================================================

// Ticker tape component
// File: components/ticker-tape/ticker-tape.js - Market ticker display

// Analysis bubbles container
// File: components/analysis-bubbles/analysis-bubbles.js - Analysis container

// Company overview bubble
// File: components/analysis-bubbles/company-overview/company-overview.js

// Financial metrics bubble
// File: components/analysis-bubbles/financial-metrics/financial-metrics.js

// Technical analysis bubble
// File: components/analysis-bubbles/technical-analysis/technical-analysis.js

// Market news bubble
// File: components/analysis-bubbles/market-news/market-news.js

// News bubble
// File: components/analysis-bubbles/news/news.js

// Chat system components
// File: components/chat/modules/chat-core.js - Chat core functionality
// File: components/chat/modules/chat-ui.js - Chat user interface
// File: components/chat/modules/chat-streaming.js - Chat streaming system
// File: components/chat/chat.js - Main chat component

// Chart widget
// File: components/chart/chart.js - TradingView chart integration

// Stock header management
// File: components/stock-header/stock-header-manager.js - Stock header UI

// UX enhancements
// File: components/ux/ux-enhancements.js - User experience improvements

// Header management
// File: components/header/header-manager.js - Main header management

// Research platform
// File: components/research/research-platform.js - Research tools platform

// Footer component
// File: components/footer/footer.js - Application footer

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Global initialization function - called by HTML
 * This function is the main entry point for the FinanceHub application
 */
function initializeFinanceHub() {
    console.log('FinanceHub: Starting application initialization...');
    
    try {
        // Initialize FinanceHub App instance
        if (typeof FinanceHubApp !== 'undefined') {
            console.log('FinanceHub: FinanceHubApp class found, creating instance...');
            const app = new FinanceHubApp();
            
            // Start the application
            app.initializeApp().then(() => {
                console.log('FinanceHub: Application initialized successfully');
            }).catch((error) => {
                console.error('FinanceHub: Application initialization failed:', error);
            });
            
        } else {
            console.error('FinanceHub: FinanceHubApp class not found in combined bundle');
        }
        
    } catch (error) {
        console.error('FinanceHub: Critical error during initialization:', error);
    }
}

// Make initializeFinanceHub globally available
window.initializeFinanceHub = initializeFinanceHub;

// Add updateComponentsWithStockData as a global utility function
window.updateComponentsWithStockData = function(symbol, stockData) {
    if (!stockData) {
        console.warn('No stock data provided for update');
        return;
    }

    console.log(`📊 Updating components for ${symbol}:`, stockData);

    try {
        // Extract price data from various possible structures
        let priceData = stockData.price_data || stockData;
        
        // If we have a comprehensive structure with stock data
        if (stockData.stock_data && stockData.stock_data.price_data) {
            priceData = stockData.stock_data.price_data;
        }

        if (!priceData) {
            console.warn('No price data found in stock data');
            return;
        }

        console.log('📈 Price data found:', priceData);

        // Update stock header
        const currentPrice = priceData.price || priceData.current_price || priceData.regularMarketPrice;
        const companyName = priceData.company_name || priceData.longName || priceData.shortName;
        const change = priceData.change || priceData.change_amount;
        const changePercent = priceData.change_percent || priceData.regularMarketChangePercent;

        console.log(`💰 Extracted values: price=${currentPrice}, company=${companyName}, change=${change}`);

        if (currentPrice && companyName) {
            // Update stock header if element exists
            const stockHeader = document.querySelector('.fh-stock-header') || document.querySelector('#fh-stock-header');
            if (stockHeader) {
                stockHeader.innerHTML = `
                    <div class="stock-info">
                        <h2>${companyName} (${symbol})</h2>
                        <div class="price">${currentPrice}</div>
                        <div class="change ${change >= 0 ? 'positive' : 'negative'}">
                            ${change >= 0 ? '+' : ''}${change} (${changePercent >= 0 ? '+' : ''}${changePercent}%)
                        </div>
                    </div>
                `;
            }
            
            console.log('✅ Stock header updated successfully');
        } else {
            console.warn('Missing essential price data for header update');
        }

        // Dispatch custom event for components to listen to
        const updateEvent = new CustomEvent('stockDataUpdated', {
            detail: {
                symbol: symbol,
                data: stockData,
                priceData: priceData
            }
        });
        document.dispatchEvent(updateEvent);

    } catch (error) {
        console.error('❌ Error updating components with stock data:', error);
    }
};

console.log('FinanceHub Import Coordinator Ready - initializeFinanceHub() available globally');

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

/**
 * Automatic initialization when DOM is ready
 * This ensures the app starts automatically without manual HTML calls
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded event fired - Auto-initializing FinanceHub...');
    
    // Give scripts a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now start the application
    if (typeof FinanceHubApp !== 'undefined') {
        console.log('Creating FinanceHubApp instance...');
        window.financeHubApp = new FinanceHubApp();
        await window.financeHubApp.initializeApp();
        console.log('FinanceHub application fully initialized!');
    } else {
        console.error('FinanceHubApp class not found');
        
        // Fallback: try to use the global initializeFinanceHub function
        if (typeof window.initializeFinanceHub === 'function') {
            console.log('Attempting fallback initialization...');
            window.initializeFinanceHub();
        }
    }
});

console.log('FinanceHub Auto-Initialization Setup Complete'); 