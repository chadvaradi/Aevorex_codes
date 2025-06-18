/**
 * @file main_import_financehub.js - Complete FinanceHub JavaScript Import Manager
 * @description Imports ALL JavaScript files in the correct dependency order
 * @version 2.0.0 - Sequential Loading Architecture
 * @author AEVOREX FinanceHub Team
 */

/**
 * FinanceHub Global Log Deduplicator (2025-06-15)
 *  - Captures console.warn / console.error / console.debug
 *  - Suppresses duplicate messages (same text prefix) after first occurrence
 *  - Persists count in window.__FH_LOG_STATS for later inspection
 *  - Can be disabled by adding ?debug=full to URL
 */
(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const debugMode = urlParams.get('debug') === 'full';
  if (window.__FH_LOG_FILTERED || debugMode) return; // already installed or full debug requested

  window.__FH_LOG_FILTERED = true;
  const stats = { warn: {}, error: {}, debug: {} };
  const DISPLAY_LIMIT = 3; // Show each unique message max 3× (1st + 2 repeats) then silence
  window.__FH_LOG_STATS = stats;
  const original = {
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  };

  const TV_PATTERNS = [
    'data type: unknown does not match a schema',
    'Property:The state with a data type: unknown does not match a schema',
    'The state with a data type: unknown does not match a schema'
  ];

  const matchesTvPattern = (arr) => {
    try {
      return arr.some(a => {
        if (!a) return false;
        const str = typeof a === 'string' ? a : (a.message || JSON.stringify(a));
        return TV_PATTERNS.some(p => str && str.includes(p));
      });
    } catch { return false; }
  };

  const factory = (type) => (...args) => {
    // Completely swallow TradingView schema / timestamped warnings on ANY level
    if (matchesTvPattern(args)) return;

    const key = typeof args[0] === 'string' ? args[0].slice(0, 120) : JSON.stringify(args[0]).slice(0, 120);
    stats[type][key] = (stats[type][key] || 0) + 1;
    if (stats[type][key] <= DISPLAY_LIMIT) {
      original[type](...args);
    }
  };

  console.warn = factory('warn');
  console.error = factory('error');
  console.debug = factory('debug');
})();

console.log('🚀 FinanceHub Complete Import Manager Loading...');

// =============================================================================
// SEQUENTIAL LOADING ARCHITECTURE - Proper dependency management
// =============================================================================

async function safeImport(path){
    try{
        console.log(`🔄 Importing ${path} ...`);
        return await import(path);
    }catch(err){
        console.error(`❌ Import failed for ${path}:`, err);
        throw err;
    }
}

async function loadFinanceHubModules() {
    try {
        console.log('📦 Starting sequential module loading...');

        // PHASE 1: CORE UTILITIES & FOUNDATION
        await safeImport('./core/utils.js');
    console.log('✅ Core utilities loaded');

// PHASE 2: API & STATE MANAGEMENT
        await safeImport('./core/api.js');
    console.log('✅ Core API loaded');
        
        await safeImport('./core/api-singleton.js');
    console.log('✅ API Singleton loaded');

        await safeImport('./core/state-manager.js');
    console.log('✅ State Manager loaded');

        await safeImport('./store/app-state.js');
    console.log('✅ App State loaded');

        // PHASE 4: THEME MANAGER
        console.log('📦 PHASE 4: Loading Theme Manager...');
        await safeImport('/static/js/core/theme-manager.js');
    console.log('✅ Theme Manager loaded');
        
        // Initialize theme manager if not yet initialized
        if (window.themeManager && typeof window.themeManager.init === 'function' && !window.themeManager.state?.isInitialized) {
            await window.themeManager.init();
            console.log('✅ Theme Manager initialized (import phase)');
        } else if (!window.themeManager) {
            console.warn('⚠️ Theme Manager not available after import');
        } else {
            console.log('ℹ️ Theme Manager already initialized');
        }

        // ---------------------------------------------------------------------
        // CHAT SYSTEM MODULES (needs to be available BEFORE ComponentLoader)
        // ---------------------------------------------------------------------
        await safeImport('./components/chat/modules/chat-core.js');
        console.log('✅ Chat Core loaded');

        await safeImport('./components/chat/modules/chat-ui.js');
        console.log('✅ Chat UI loaded');

        await safeImport('./components/chat/modules/chat-streaming.js');
        console.log('✅ Chat Streaming loaded');

        await safeImport('./components/chat/modules/chatScroll.logic.js');
        console.log('✅ Chat Scroll Logic loaded');

        await safeImport('./components/chat/chat.js');
        console.log('✅ Main Chat Component loaded');

        // EARLY LOAD UnifiedChartManager so ComponentLoader can find ChartManager class
        await safeImport('./components/chart/chart.js');
        console.log('✅ Chart Component preloaded');

        // Now that FinanceHubChat is guaranteed on window, we can safely load ComponentLoader

        await safeImport('./core/event-manager.js');
    console.log('✅ Event Manager loaded');

        await safeImport('./core/progressive-loader.js');
    console.log('✅ Progressive Loader loaded');

        await safeImport('./core/component-loader.js');
    console.log('✅ Component Loader loaded');

// PHASE 4: SERVICES & LOGIC
        await safeImport('./services/module-loader.js');
    console.log('✅ Module Loader Service loaded');

        await safeImport('./logic/search-logic.js');
    console.log('✅ Search Logic loaded');

        await safeImport('./ui/header-ui.js');
    console.log('✅ Header UI loaded');

// PHASE 5: CORE COMPONENTS
        await safeImport('./components/ticker-tape/ticker-tape.js');
    console.log('✅ Ticker Tape loaded');

        await safeImport('./components/stock-header/stock-header-manager.js');
    console.log('✅ Stock Header Manager loaded');

        await safeImport('./components/header/header-manager.js');
    console.log('✅ Header Manager loaded');

        // Chart already preloaded above; skip duplicate import if class exists
        if (!window.UnifiedChartManager) {
            await safeImport('./components/chart/chart.js');
            console.log('✅ Chart Component loaded (late)');
        } else {
            console.log('ℹ️ Chart preloaded earlier, skipping duplicate import');
        }

// PHASE 6: ANALYSIS BUBBLES
        await safeImport('./components/analysis-bubbles/analysis-bubbles.js');
    console.log('✅ Analysis Bubbles Container loaded');

        await safeImport('./components/analysis-bubbles/company-overview/company-overview.js');
    console.log('✅ Company Overview Bubble loaded');

        await safeImport('./components/analysis-bubbles/financial-metrics/financial-metrics.js');
    console.log('✅ Financial Metrics Bubble loaded');

        await safeImport('./components/analysis-bubbles/technical-analysis/technical-analysis.js');
    console.log('✅ Technical Analysis Bubble loaded');

        await safeImport('./components/analysis-bubbles/market-news/market-news.js');
    console.log('✅ Market News Bubble loaded');

        await safeImport('./components/analysis-bubbles/news/news.js');
    console.log('✅ News Bubble loaded');

// PHASE 8: ADDITIONAL COMPONENTS
        await safeImport('./components/ux/ux-enhancements.js');
    console.log('✅ UX Enhancements loaded');

        await safeImport('./components/research/research-platform.js');
    console.log('✅ Research Platform loaded');

        await safeImport('./components/footer/footer.js');
    console.log('✅ Footer Component loaded');

// PHASE 9: APPLICATION LAYER
        await safeImport('./app/app-class.js');
    console.log('✅ App Class loaded');

        await safeImport('./patches/financehub_bootstrap_patches.js');
    console.log('✅ Bootstrap Patches loaded');

// PHASE 10: INITIALIZATION
        await safeImport('./core/app-initializer.js');
    console.log('✅ App Initializer loaded');
    
        console.log('🎯 All modules loaded successfully, starting initialization...');

        // Wait for DOM and all modules to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
        
        // Initialize the application
        if (window.AppInitializer) {
            console.log('🚀 Initializing FinanceHub via AppInitializer...');
            const appInit = new window.AppInitializer();
            await appInit.initializeApp();
            console.log('🎉 FinanceHub fully initialized!');
        } else if (typeof initializeFinanceHub === 'function') {
            console.log('🚀 Initializing FinanceHub via global function...');
            await initializeFinanceHub();
            console.log('🎉 FinanceHub fully initialized!');
        } else {
            console.warn('⚠️ No initialization function found, trying ComponentLoader...');
            if (window.ComponentLoader) {
                await window.ComponentLoader.initialize();
                console.log('🎉 FinanceHub components initialized!');
            }
        }

    } catch (error) {
        console.error('❌ Failed to load FinanceHub modules:', error);
        throw error;
    }
}

// Start the loading process
loadFinanceHubModules().catch(error => {
    console.error('💥 Critical error during FinanceHub initialization:', error);
});

console.log('📦 FinanceHub sequential loading initiated');

window.__printFHLogs = () => {
  const flatten = [];
  const allStats = window.__FH_LOG_STATS || {};
  Object.entries(allStats).forEach(([level, obj]) => {
    Object.entries(obj).forEach(([msg, count]) => {
      flatten.push({ level, count, msg });
    });
  });
  console.group('📊 FinanceHub Log Stats');
  console.table(flatten.sort((a,b)=>b.count-a.count));
  console.groupEnd();
};

// Auto-print summary after 5 s (once)
setTimeout(() => {
  if (typeof window.__printFHLogs === 'function') window.__printFHLogs();
}, 5000); 