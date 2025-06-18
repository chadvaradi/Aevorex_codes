/**
 * ContentHub Performance Monitor
 * Tracks page performance and user experience metrics
 */

class ContentHubPerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = {};
        this.init();
        console.log('📊 Performance Monitor initialized');
    }

    init() {
        this.trackPageLoad();
        this.setupPerformanceObserver();
        this.trackResourceTiming();
        
        // Report metrics after page load
        window.addEventListener('load', () => {
            setTimeout(() => this.reportMetrics(), 1000);
        });
    }

    trackPageLoad() {
        if (performance.timing) {
            const timing = performance.timing;
            this.metrics.pageLoad = {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                fullyLoaded: timing.loadEventEnd - timing.navigationStart,
                firstByte: timing.responseStart - timing.navigationStart,
                domInteractive: timing.domInteractive - timing.navigationStart
            };
        }
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // Core Web Vitals
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        this.processPerformanceEntry(entry);
                    });
                });
                
                observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
                this.observers.coreWebVitals = observer;
            } catch (error) {
                console.warn('Performance Observer not fully supported:', error);
            }
        }
    }

    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'paint':
                this.metrics[entry.name] = entry.startTime;
                break;
            case 'largest-contentful-paint':
                this.metrics.LCP = entry.startTime;
                break;
            case 'first-input':
                this.metrics.FID = entry.processingStart - entry.startTime;
                break;
            case 'layout-shift':
                if (!entry.hadRecentInput) {
                    this.metrics.CLS = (this.metrics.CLS || 0) + entry.value;
                }
                break;
        }
    }

    trackResourceTiming() {
        if (performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource');
            this.metrics.resources = {
                total: resources.length,
                js: resources.filter(r => r.name.endsWith('.js')).length,
                css: resources.filter(r => r.name.endsWith('.css')).length,
                images: resources.filter(r => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(r.name)).length
            };
        }
    }

    trackCustomMetric(name, value, unit = 'ms') {
        this.metrics.custom = this.metrics.custom || {};
        this.metrics.custom[name] = { value, unit, timestamp: Date.now() };
        
        console.log(`📈 Custom metric: ${name} = ${value}${unit}`);
    }

    startTimer(name) {
        this.metrics.timers = this.metrics.timers || {};
        this.metrics.timers[name] = { start: performance.now() };
    }

    endTimer(name) {
        if (this.metrics.timers?.[name]?.start) {
            const duration = performance.now() - this.metrics.timers[name].start;
            this.metrics.timers[name].duration = duration;
            console.log(`⏱️ Timer "${name}": ${duration.toFixed(2)}ms`);
            return duration;
        }
    }

    reportMetrics() {
        console.group('📊 ContentHub Performance Report');
        console.table(this.metrics);
        console.groupEnd();

        // Dispatch performance report event
        window.dispatchEvent(new CustomEvent('contenthub:performance-report', {
            detail: { metrics: this.getMetrics() }
        }));
    }

    getMetrics() {
        return { ...this.metrics };
    }

    // Performance warnings
    checkPerformance() {
        const warnings = [];

        if (this.metrics.LCP > 2500) {
            warnings.push('LCP (Largest Contentful Paint) exceeds 2.5s');
        }

        if (this.metrics.FID > 100) {
            warnings.push('FID (First Input Delay) exceeds 100ms');
        }

        if (this.metrics.CLS > 0.1) {
            warnings.push('CLS (Cumulative Layout Shift) exceeds 0.1');
        }

        if (warnings.length > 0) {
            console.warn('⚠️ Performance warnings:', warnings);
        }

        return warnings;
    }
}

// Initialize and export
const performanceMonitor = new ContentHubPerformanceMonitor();
window.ContentHub = window.ContentHub || {};
window.ContentHub.PerformanceMonitor = performanceMonitor;

export default performanceMonitor; 