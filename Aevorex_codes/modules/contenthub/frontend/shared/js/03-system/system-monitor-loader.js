/**
 * ContentHub System Monitor Loader
 * Monitors system resources and module health
 */

class SystemMonitorLoader {
    constructor() {
        this.monitors = new Map();
        this.isMonitoring = false;
        this.checkInterval = 30000; // 30 seconds
        this.init();
        console.log('📊 System Monitor Loader initialized');
    }

    init() {
        this.setupResourceMonitoring();
        this.setupModuleHealthChecks();
        this.setupPerformanceTracking();
    }

    setupResourceMonitoring() {
        // Memory usage monitoring
        this.monitors.set('memory', {
            check: () => this.checkMemoryUsage(),
            threshold: 100 * 1024 * 1024, // 100MB
            status: 'good'
        });

        // Network connectivity
        this.monitors.set('network', {
            check: () => this.checkNetworkStatus(),
            threshold: 1000, // 1 second response time
            status: 'good'
        });

        // Page load performance
        this.monitors.set('performance', {
            check: () => this.checkPagePerformance(),
            threshold: 3000, // 3 seconds load time
            status: 'good'
        });
    }

    setupModuleHealthChecks() {
        // ContentHub core modules health
        this.monitors.set('modules', {
            check: () => this.checkModuleHealth(),
            threshold: 0, // All modules should be healthy
            status: 'good'
        });

        // API connectivity
        this.monitors.set('api', {
            check: () => this.checkAPIHealth(),
            threshold: 2000, // 2 seconds API response
            status: 'good'
        });
    }

    setupPerformanceTracking() {
        // Track Web Vitals if available
        if ('web-vital' in window || window.ContentHub?.PerformanceMonitor) {
            this.monitors.set('vitals', {
                check: () => this.checkWebVitals(),
                threshold: { lcp: 2500, fid: 100, cls: 0.1 },
                status: 'good'
            });
        }
    }

    async start() {
        if (this.isMonitoring) {
            console.log('📊 System Monitor already running');
            return;
        }

        console.log('📊 Starting system monitoring...');
        this.isMonitoring = true;
        
        // Initial check
        await this.runAllChecks();
        
        // Schedule regular checks
        this.monitoringInterval = setInterval(() => {
            this.runAllChecks();
        }, this.checkInterval);

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });
    }

    async runAllChecks() {
        console.log('🔍 Running system health checks...');
        
        for (const [name, monitor] of this.monitors) {
            try {
                const result = await monitor.check();
                this.updateMonitorStatus(name, result);
            } catch (error) {
                console.error(`❌ Monitor ${name} failed:`, error);
                this.updateMonitorStatus(name, { status: 'error', error });
            }
        }

        this.reportSystemStatus();
    }

    async checkMemoryUsage() {
        if ('memory' in performance) {
            const memInfo = performance.memory;
            const usage = memInfo.usedJSHeapSize;
            const limit = memInfo.jsHeapSizeLimit;
            
            return {
                status: usage > this.monitors.get('memory').threshold ? 'warning' : 'good',
                usage,
                limit,
                percentage: Math.round((usage / limit) * 100)
            };
        }
        return { status: 'unavailable' };
    }

    async checkNetworkStatus() {
        const start = performance.now();
        
        try {
            const response = await fetch('/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const responseTime = performance.now() - start;
            
            return {
                status: responseTime > this.monitors.get('network').threshold ? 'warning' : 'good',
                responseTime: Math.round(responseTime),
                online: navigator.onLine
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                online: navigator.onLine
            };
        }
    }

    async checkPagePerformance() {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.navigationStart;
            
            return {
                status: loadTime > this.monitors.get('performance').threshold ? 'warning' : 'good',
                loadTime: Math.round(loadTime),
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
                firstPaint: this.getFirstPaintTime()
            };
        }
        
        return { status: 'unavailable' };
    }

    getFirstPaintTime() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? Math.round(firstPaint.startTime) : null;
    }

    async checkModuleHealth() {
        const moduleHealth = {
            total: 0,
            healthy: 0,
            issues: []
        };

        if (window.ContentHub?.SystemInit) {
            const modules = window.ContentHub.SystemInit.getAllModules();
            
            moduleHealth.total = modules.length;
            
            modules.forEach(([name, module]) => {
                if (module.status === 'loaded') {
                    moduleHealth.healthy++;
                } else {
                    moduleHealth.issues.push({
                        name,
                        status: module.status,
                        error: module.error?.message
                    });
                }
            });
        }

        return {
            status: moduleHealth.issues.length > 0 ? 'warning' : 'good',
            ...moduleHealth
        };
    }

    async checkAPIHealth() {
        if (window.ContentHub?.APIClient) {
            const start = performance.now();
            
            try {
                await window.ContentHub.APIClient.healthCheck();
                const responseTime = performance.now() - start;
                
                return {
                    status: responseTime > this.monitors.get('api').threshold ? 'warning' : 'good',
                    responseTime: Math.round(responseTime)
                };
            } catch (error) {
                return {
                    status: 'error',
                    error: error.message
                };
            }
        }
        
        return { status: 'unavailable' };
    }

    async checkWebVitals() {
        // This would integrate with Web Vitals library if available
        // For now, return basic performance metrics
        return {
            status: 'good',
            message: 'Web Vitals monitoring available'
        };
    }

    updateMonitorStatus(name, result) {
        const monitor = this.monitors.get(name);
        if (monitor) {
            monitor.status = result.status;
            monitor.lastCheck = Date.now();
            monitor.result = result;
        }
    }

    reportSystemStatus() {
        const status = this.getOverallStatus();
        
        // Dispatch system status event
        window.dispatchEvent(new CustomEvent('contenthub:system-status', {
            detail: {
                overall: status,
                monitors: Array.from(this.monitors.entries()),
                timestamp: Date.now()
            }
        }));

        // Log status if there are issues
        if (status !== 'good') {
            console.warn('⚠️ System status:', status);
        }
    }

    getOverallStatus() {
        const statuses = Array.from(this.monitors.values()).map(m => m.status);
        
        if (statuses.includes('error')) return 'error';
        if (statuses.includes('warning')) return 'warning';
        return 'good';
    }

    pauseMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    resumeMonitoring() {
        if (!this.monitoringInterval && this.isMonitoring) {
            this.monitoringInterval = setInterval(() => {
                this.runAllChecks();
            }, this.checkInterval);
        }
    }

    stop() {
        this.isMonitoring = false;
        this.pauseMonitoring();
        console.log('📊 System monitoring stopped');
    }

    // Public methods
    getMonitorStatus(name) {
        return this.monitors.get(name);
    }

    getAllMonitors() {
        return Array.from(this.monitors.entries());
    }
}

// Initialize and export
const systemMonitor = new SystemMonitorLoader();
window.ContentHub = window.ContentHub || {};
window.ContentHub.SystemMonitor = systemMonitor;

export default systemMonitor; 