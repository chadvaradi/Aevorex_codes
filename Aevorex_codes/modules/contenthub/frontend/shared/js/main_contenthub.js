/**
 * ContentHub Main JavaScript Entry Point
 * Aevorex Premium Content Creation Platform
 * 
 * This file imports and initializes all ContentHub modules
 * Architecture: Modular ES6 imports following the original structure
 */

// Initialize ContentHub namespace FIRST - before any module imports
window.ContentHub = window.ContentHub || {};
window.ContentHub.version = '2.0.0';
window.ContentHub.loaded = false; // Will be set to true after full initialization

// ContentHub Configuration
window.ContentHubConfig = {
    frontendOnly: false, // Enable backend mode since ContentHub has a real backend
    backendPort: 8085, // ContentHub backend runs on port 8085
    debug: window.location.hostname === 'localhost',
    disableAPITests: false // Enable API health checks since we have a backend
};

// 01-CORE modules - Essential system functionality
import './01-core/theme-manager.js';
import './01-core/api-client.js';
import './01-core/error-handler.js';
import './01-core/performance-monitor.js';
import './01-core/router-manager.js';

// 02-COMPONENTS modules - UI component logic
import './02-components/ui-interactions.js';
import './02-components/module-cards.js';
import './02-components/navigation.js';

// 03-SYSTEM modules - System initialization and monitoring
import './03-system/initialization.js';
import './03-system/system-monitor-loader.js';

// 04-UTILITIES modules - Helper functions and animations
import './04-utilities/animations.js';
import './04-utilities/debug-test.js';
import './04-utilities/utils.js';

/**
 * ContentHub Ready Event Dispatcher
 * Signals when all modules are loaded and functional
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 ContentHub Main: All modules loaded');
    
    // Mark as fully loaded
    window.ContentHub.loaded = true;
    
    // Dispatch custom ready event
    const readyEvent = new CustomEvent('contenthub:ready', {
        detail: {
            timestamp: new Date().toISOString(),
            modules_loaded: [
                'theme-manager', 'api-client', 'error-handler', 'performance-monitor', 'router-manager',
                'ui-interactions', 'module-cards', 'navigation',
                'initialization', 'system-monitor-loader',
                'animations', 'debug-test', 'utils'
            ]
        }
    });
    
    window.dispatchEvent(readyEvent);
}); 