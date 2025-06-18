/**
 * ContentHub Debug & Testing Utilities
 * Development tools and testing helpers
 */

class DebugTestManager {
    constructor() {
        this.isDebugMode = this.checkDebugMode();
        this.testResults = new Map();
        this.init();
        console.log('🔧 Debug & Test utilities initialized');
    }

    init() {
        if (this.isDebugMode) {
            this.setupDebugPanel();
            this.setupConsoleCommands();
            this.setupErrorTracking();
        }
        this.setupTestFramework();
    }

    checkDebugMode() {
        return (
            localStorage.getItem('contenthub-debug') === 'true' ||
            window.location.search.includes('debug=true') ||
            window.location.hostname === 'localhost'
        );
    }

    setupDebugPanel() {
        // Create floating debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'contenthub-debug-panel';
        debugPanel.innerHTML = `
            <div class="debug-header">
                <h4>ContentHub Debug</h4>
                <button class="debug-toggle">−</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h5>System Status</h5>
                    <div id="debug-system-status"></div>
                </div>
                <div class="debug-section">
                    <h5>Performance</h5>
                    <div id="debug-performance"></div>
                </div>
                <div class="debug-section">
                    <h5>API Calls</h5>
                    <div id="debug-api-calls"></div>
                </div>
                <div class="debug-section">
                    <h5>Test Results</h5>
                    <div id="debug-test-results"></div>
                    <button onclick="window.ContentHub.DebugTest.runAllTests()">Run Tests</button>
                </div>
            </div>
        `;

        // Style the debug panel
        const style = document.createElement('style');
        style.textContent = `
            #contenthub-debug-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                max-height: 80vh;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                font-family: monospace;
                font-size: 12px;
                border-radius: 8px;
                overflow: hidden;
                z-index: 10000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .debug-header {
                background: #333;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            
            .debug-content {
                padding: 10px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .debug-section {
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #444;
            }
            
            .debug-section h5 {
                margin: 0 0 5px 0;
                color: #4CAF50;
            }
            
            .debug-toggle {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
            }
            
            .debug-section button {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(debugPanel);

        // Make panel draggable
        this.makeDraggable(debugPanel);
        
        // Toggle functionality
        debugPanel.querySelector('.debug-toggle').addEventListener('click', () => {
            const content = debugPanel.querySelector('.debug-content');
            const button = debugPanel.querySelector('.debug-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                button.textContent = '−';
            } else {
                content.style.display = 'none';
                button.textContent = '+';
            }
        });

        // Start updating debug info
        this.updateDebugInfo();
        setInterval(() => this.updateDebugInfo(), 2000);
    }

    setupConsoleCommands() {
        // Add global debug commands
        window.ContentHubDebug = {
            info: () => this.getSystemInfo(),
            performance: () => this.getPerformanceInfo(),
            modules: () => this.getModuleInfo(),
            test: (testName) => this.runTest(testName),
            testAll: () => this.runAllTests(),
            clear: () => console.clear(),
            export: () => this.exportDebugData()
        };

        console.log('🔧 Debug commands available: ContentHubDebug.info(), .performance(), .modules(), .test(), .testAll()');
    }

    setupErrorTracking() {
        const originalError = console.error;
        console.error = (...args) => {
            this.trackError(args);
            originalError.apply(console, args);
        };

        window.addEventListener('error', (e) => {
            this.trackError([e.message, e.filename, e.lineno]);
        });
    }

    setupTestFramework() {
        this.tests = new Map();
        
        // Register basic tests
        this.registerTest('moduleLoad', () => this.testModuleLoading());
        this.registerTest('apiConnection', () => this.testAPIConnection());
        this.registerTest('themeManager', () => this.testThemeManager());
        this.registerTest('navigation', () => this.testNavigation());
        this.registerTest('animations', () => this.testAnimations());
    }

    registerTest(name, testFunction) {
        this.tests.set(name, testFunction);
    }

    async runTest(testName) {
        if (!this.tests.has(testName)) {
            console.error(`Test "${testName}" not found`);
            return false;
        }

        console.log(`🧪 Running test: ${testName}`);
        const startTime = performance.now();
        
        try {
            const result = await this.tests.get(testName)();
            const duration = performance.now() - startTime;
            
            this.testResults.set(testName, {
                status: 'passed',
                duration,
                result,
                timestamp: Date.now()
            });
            
            console.log(`✅ Test "${testName}" passed in ${duration.toFixed(2)}ms`);
            return true;
        } catch (error) {
            const duration = performance.now() - startTime;
            
            this.testResults.set(testName, {
                status: 'failed',
                duration,
                error: error.message,
                timestamp: Date.now()
            });
            
            console.error(`❌ Test "${testName}" failed:`, error);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Running all tests...');
        const testNames = Array.from(this.tests.keys());
        const results = [];
        
        for (const testName of testNames) {
            const result = await this.runTest(testName);
            results.push({ name: testName, passed: result });
        }
        
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        
        console.log(`🧪 Tests completed: ${passed}/${total} passed`);
        
        if (this.isDebugMode) {
            this.updateTestResults();
        }
        
        return { passed, total, results };
    }

    // Test implementations
    testModuleLoading() {
        const requiredModules = [
            'ThemeManager', 'APIClient', 'ErrorHandler',
            'PerformanceMonitor', 'RouterManager', 'Navigation'
        ];
        
        const missing = requiredModules.filter(module => !window.ContentHub?.[module]);
        
        if (missing.length > 0) {
            throw new Error(`Missing modules: ${missing.join(', ')}`);
        }
        
        return `All ${requiredModules.length} core modules loaded`;
    }

    async testAPIConnection() {
        if (!window.ContentHub?.APIClient) {
            throw new Error('APIClient not available');
        }
        
        // Skip API test if frontend-only mode or API tests disabled
        const config = window.ContentHubConfig;
        if (config?.frontendOnly || config?.disableAPITests) {
            return 'API test skipped - Frontend-only mode';
        }
        
        try {
            await window.ContentHub.APIClient.healthCheck();
            return 'API connection successful';
        } catch (error) {
            throw new Error(`API connection failed: ${error.message}`);
        }
    }

    testThemeManager() {
        if (!window.ContentHub?.ThemeManager) {
            throw new Error('ThemeManager not available');
        }
        
        const themeManager = window.ContentHub.ThemeManager;
        const currentTheme = themeManager.getCurrentTheme();
        
        if (!currentTheme) {
            throw new Error('No theme currently applied');
        }
        
        // Check if theme is actually applied to DOM
        const isApplied = themeManager.isThemeApplied ? themeManager.isThemeApplied() : 
                         document.documentElement.getAttribute('data-theme') === currentTheme;
        
        if (!isApplied) {
            throw new Error('Theme not properly applied to DOM');
        }
        
        return `Theme "${currentTheme}" active and applied`;
    }

    testNavigation() {
        if (!window.ContentHub?.Navigation) {
            throw new Error('Navigation not available');
        }
        
        const currentPage = window.ContentHub.Navigation.getCurrentPage();
        if (!currentPage) {
            throw new Error('Current page not detected');
        }
        
        return `Navigation working, current page: ${currentPage}`;
    }

    testAnimations() {
        if (!window.ContentHub?.Animations) {
            throw new Error('Animations not available');
        }
        
        // Test basic animation capability
        const testEl = document.createElement('div');
        testEl.style.position = 'absolute';
        testEl.style.left = '-1000px';
        document.body.appendChild(testEl);
        
        try {
            window.ContentHub.Animations.animateElement(testEl, { type: 'fadeIn' });
            document.body.removeChild(testEl);
            return 'Animation system functional';
        } catch (error) {
            document.body.removeChild(testEl);
            throw error;
        }
    }

    // Debug info methods
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            modules: window.ContentHub ? Object.keys(window.ContentHub) : []
        };
    }

    getPerformanceInfo() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
            loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.navigationStart) : 'N/A',
            domReady: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart) : 'N/A',
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : 'N/A'
        };
    }

    getModuleInfo() {
        if (!window.ContentHub?.SystemInit) {
            return 'SystemInit not available';
        }
        
        return window.ContentHub.SystemInit.getAllModules();
    }

    updateDebugInfo() {
        if (!document.getElementById('contenthub-debug-panel')) return;
        
        // Update system status
        const systemStatus = document.getElementById('debug-system-status');
        if (systemStatus) {
            const info = this.getSystemInfo();
            systemStatus.innerHTML = `
                Viewport: ${info.viewport}<br>
                Modules: ${info.modules.length}<br>
                Page: ${window.location.pathname}
            `;
        }
        
        // Update performance
        const performance = document.getElementById('debug-performance');
        if (performance) {
            const perfInfo = this.getPerformanceInfo();
            performance.innerHTML = `
                Load: ${perfInfo.loadTime}ms<br>
                Memory: ${perfInfo.memory?.used || 'N/A'}MB
            `;
        }
    }

    updateTestResults() {
        const testResults = document.getElementById('debug-test-results');
        if (testResults && this.testResults.size > 0) {
            const results = Array.from(this.testResults.entries());
            testResults.innerHTML = results.map(([name, result]) => 
                `${result.status === 'passed' ? '✅' : '❌'} ${name} (${result.duration.toFixed(1)}ms)`
            ).join('<br>');
        }
    }

    trackError(args) {
        console.log('🐛 Error tracked:', args);
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('.debug-header');
        
        header.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    exportDebugData() {
        const debugData = {
            timestamp: new Date().toISOString(),
            system: this.getSystemInfo(),
            performance: this.getPerformanceInfo(),
            modules: this.getModuleInfo(),
            tests: Array.from(this.testResults.entries())
        };
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `contenthub-debug-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Initialize and export
const debugTest = new DebugTestManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.DebugTest = debugTest;

export default debugTest; 