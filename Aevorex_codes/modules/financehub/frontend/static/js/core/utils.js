/**
 * @file utils-unified.js - Unified Utility Functions for FinanceHub
 * @description Comprehensive utility library combining the best features from:
 *              - src/utils.js (Performance utilities)
 *              - core/utils.js (General utilities)
 * @version 3.0.0 - Unified Architecture
 * @author AEVOREX
 */

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isEnabled = true;
    }

    startTimer(label) {
        if (!this.isEnabled) return;
        this.metrics.set(label, performance.now());
    }

    endTimer(label) {
        if (!this.isEnabled) return;
        const startTime = this.metrics.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            this.metrics.delete(label);
            return duration;
        }
    }

    measureAsync(label, asyncFn) {
        return async (...args) => {
            this.startTimer(label);
            try {
                const result = await asyncFn(...args);
                this.endTimer(label);
                return result;
            } catch (error) {
                this.endTimer(label);
                throw error;
            }
        };
    }

    observeElement(element, callback) {
        if (!this.observers.has('intersection')) {
            this.observers.set('intersection', new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const callback = entry.target._observerCallback;
                    if (callback) callback(entry);
                });
            }));
        }

        element._observerCallback = callback;
        this.observers.get('intersection').observe(element);
    }

    unobserveElement(element) {
        const observer = this.observers.get('intersection');
        if (observer) {
            observer.unobserve(element);
            delete element._observerCallback;
        }
    }
}

/**
 * DOM utilities
 */
class DOMUtils {
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });

        return element;
    }

    static findElement(selector, context = document) {
        return context.querySelector(selector);
    }

    static findElements(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    static addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    }

    static hasClass(element, className) {
        return element && element.classList.contains(className);
    }

    static setAttributes(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    static removeAttributes(element, attributes) {
        attributes.forEach(attr => {
            element.removeAttribute(attr);
        });
    }

    static getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
        };
    }

    static isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    static scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Data formatting utilities
 */
class DataFormatter {
    static formatCurrency(value, currency = 'USD', locale = 'en-US') {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    static formatNumber(value, options = {}) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const defaultOptions = {
            locale: 'en-US',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };

        const formatOptions = { ...defaultOptions, ...options };
        const { locale, ...intlOptions } = formatOptions;

        return new Intl.NumberFormat(locale, intlOptions).format(value);
    }

    static formatPercentage(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        return `${(value * 100).toFixed(decimals)}%`;
    }

    static formatLargeNumber(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'N/A';
        }

        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';

        if (absValue >= 1e12) {
            return `${sign}${(absValue / 1e12).toFixed(1)}T`;
        } else if (absValue >= 1e9) {
            return `${sign}${(absValue / 1e9).toFixed(1)}B`;
        } else if (absValue >= 1e6) {
            return `${sign}${(absValue / 1e6).toFixed(1)}M`;
        } else if (absValue >= 1e3) {
            return `${sign}${(absValue / 1e3).toFixed(1)}K`;
        } else {
            return `${sign}${absValue.toFixed(0)}`;
        }
    }

    static formatDate(date, format = 'short') {
        if (!date) return 'N/A';

        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            }
        };

        return dateObj.toLocaleDateString('en-US', options[format] || options.short);
    }

    static formatTimeAgo(date) {
        if (!date) return 'N/A';

        const now = new Date();
        const dateObj = date instanceof Date ? date : new Date(date);
        const diffInSeconds = Math.floor((now - dateObj) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return this.formatDate(dateObj);
        }
    }

    static formatVolume(volume) {
        return this.formatLargeNumber(volume);
    }

    static formatMarketCap(marketCap) {
        return this.formatLargeNumber(marketCap);
    }

    static formatPriceChange(change, changePercent) {
        const sign = change >= 0 ? '+' : '';
        const formattedChange = this.formatCurrency(Math.abs(change));
        const formattedPercent = this.formatPercentage(Math.abs(changePercent / 100));
        
        return `${sign}${formattedChange} (${sign}${formattedPercent})`;
    }
}

/**
 * Validation utilities
 */
class Validator {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isValidStockSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        const symbolRegex = /^[A-Z]{1,5}$/;
        return symbolRegex.test(symbol.toUpperCase());
    }

    static isValidNumber(value) {
        return !isNaN(value) && isFinite(value);
    }

    static isValidDate(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return !isNaN(dateObj.getTime());
    }

    static sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    static validateStockData(data) {
        const required = ['symbol', 'price'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (!this.isValidStockSymbol(data.symbol)) {
            throw new Error('Invalid stock symbol format');
        }

        if (!this.isValidNumber(data.price)) {
            throw new Error('Invalid price value');
        }

        return true;
    }
}

/**
 * Storage utilities
 */
class StorageManager {
    constructor(prefix = 'financehub_') {
        this.prefix = prefix;
        this.isLocalStorageAvailable = this.checkLocalStorage();
    }

    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    getKey(key) {
        return `${this.prefix}${key}`;
    }

    set(key, value, expiry = null) {
        if (!this.isLocalStorageAvailable) return false;

        try {
            const data = {
                value,
                timestamp: Date.now(),
                expiry: expiry ? Date.now() + expiry : null
            };
            localStorage.setItem(this.getKey(key), JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    }

    get(key) {
        if (!this.isLocalStorageAvailable) return null;

        try {
            const item = localStorage.getItem(this.getKey(key));
            if (!item) return null;

            const data = JSON.parse(item);
            
            // Check expiry
            if (data.expiry && Date.now() > data.expiry) {
                this.remove(key);
                return null;
            }

            return data.value;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return null;
        }
    }

    remove(key) {
        if (!this.isLocalStorageAvailable) return false;

        try {
            localStorage.removeItem(this.getKey(key));
            return true;
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
            return false;
        }
    }

    clear() {
        if (!this.isLocalStorageAvailable) return false;

        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }

    getAll() {
        if (!this.isLocalStorageAvailable) return {};

        const result = {};
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                const shortKey = key.replace(this.prefix, '');
                result[shortKey] = this.get(shortKey);
            }
        });

        return result;
    }
}

/**
 * Event utilities - DISABLED to avoid duplication with core/event-manager.js
 */
/*
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    on(element, event, handler, options = {}) {
        if (!element || !event || !handler) return;

        const key = `${element}_${event}`;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        this.listeners.get(key).push(handler);
        element.addEventListener(event, handler, options);
    }

    off(element, event, handler) {
        if (!element || !event) return;

        const key = `${element}_${event}`;
        const handlers = this.listeners.get(key);
        
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
                element.removeEventListener(event, handler);
            }
        }
    }

    once(element, event, handler, options = {}) {
        const onceHandler = (e) => {
            handler(e);
            this.off(element, event, onceHandler);
        };
        this.on(element, event, onceHandler, options);
    }

    emit(element, event, data = {}) {
        const customEvent = new CustomEvent(event, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(customEvent);
    }

    removeAllListeners(element) {
        const keys = Array.from(this.listeners.keys());
        keys.forEach(key => {
            if (key.startsWith(`${element}_`)) {
                const event = key.split('_')[1];
                const handlers = this.listeners.get(key);
                handlers.forEach(handler => {
                    element.removeEventListener(event, handler);
                });
                this.listeners.delete(key);
            }
        });
    }
}
*/

/**
 * Animation utilities
 */
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = `${targetHeight * progress}px`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideUp(element, duration = 300) {
        const startHeight = element.offsetHeight;
        const start = performance.now();
        
        element.style.overflow = 'hidden';
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = `${startHeight * (1 - progress)}px`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
}

/**
 * Color utilities
 */
class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    static getPriceChangeColor(change) {
        if (change > 0) return '#10b981'; // green
        if (change < 0) return '#ef4444'; // red
        return '#6b7280'; // gray
    }

    static lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 + (percent / 100);
        const r = Math.min(255, Math.floor(rgb.r * factor));
        const g = Math.min(255, Math.floor(rgb.g * factor));
        const b = Math.min(255, Math.floor(rgb.b * factor));
        
        return this.rgbToHex(r, g, b);
    }

    static darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 - (percent / 100);
        const r = Math.max(0, Math.floor(rgb.r * factor));
        const g = Math.max(0, Math.floor(rgb.g * factor));
        const b = Math.max(0, Math.floor(rgb.b * factor));
        
        return this.rgbToHex(r, g, b);
    }
}

// Create global instances
const performanceMonitor = new PerformanceMonitor();
const storageManager = new StorageManager();

// Export utilities
const UnifiedUtils = {
    PerformanceMonitor,
    DOMUtils,
    DataFormatter,
    Validator,
    StorageManager,
    AnimationUtils,
    ColorUtils,
    
    // Global instances
    performance: performanceMonitor,
    storage: storageManager,
    
    // Convenience methods
    $: (selector, context) => DOMUtils.findElement(selector, context),
    $$: (selector, context) => DOMUtils.findElements(selector, context),
    debounce: DOMUtils.debounce,
    throttle: DOMUtils.throttle,
    formatCurrency: DataFormatter.formatCurrency,
    formatNumber: DataFormatter.formatNumber,
    formatPercentage: DataFormatter.formatPercentage,
    formatDate: DataFormatter.formatDate,
    formatTimeAgo: DataFormatter.formatTimeAgo
};

// CommonJS compatibility with better structure
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceMonitor,
        DOMUtils,
        DataFormatter,
        Validator,
        StorageManager,
        AnimationUtils,
        ColorUtils,
        UnifiedUtils,
        default: UnifiedUtils
    };
} else {
    window.UnifiedUtils = UnifiedUtils;
}

console.log('✅ UnifiedUtils exported successfully (CommonJS + Global)'); 