/**
 * ContentHub General Utilities
 * Common helper functions and utilities
 */

class UtilitiesManager {
    constructor() {
        this.init();
        console.log('🛠️ Utilities initialized');
    }

    init() {
        this.setupDateFormatters();
        this.setupValidators();
        this.setupHelpers();
    }

    setupDateFormatters() {
        this.dateFormatters = {
            short: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
            long: new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }),
            datetime: new Intl.DateTimeFormat('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            })
        };
    }

    setupValidators() {
        this.validators = {
            email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            url: (url) => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            },
            phone: (phone) => /^\+?[\d\s\-\(\)]{10,}$/.test(phone),
            strongPassword: (password) => {
                return password.length >= 8 &&
                       /[A-Z]/.test(password) &&
                       /[a-z]/.test(password) &&
                       /\d/.test(password) &&
                       /[^A-Za-z0-9]/.test(password);
            }
        };
    }

    setupHelpers() {
        // DOM helpers
        this.dom = {
            query: (selector, context = document) => context.querySelector(selector),
            queryAll: (selector, context = document) => Array.from(context.querySelectorAll(selector)),
            create: (tag, attributes = {}, content = '') => {
                const element = document.createElement(tag);
                Object.assign(element, attributes);
                if (content) element.innerHTML = content;
                return element;
            },
            addClass: (element, className) => element.classList.add(className),
            removeClass: (element, className) => element.classList.remove(className),
            toggleClass: (element, className) => element.classList.toggle(className),
            hasClass: (element, className) => element.classList.contains(className)
        };

        // String helpers
        this.string = {
            capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
            camelCase: (str) => str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : ''),
            kebabCase: (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[\s_]+/g, '-'),
            truncate: (str, length, suffix = '...') => 
                str.length > length ? str.substring(0, length) + suffix : str,
            slugify: (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            stripHtml: (str) => str.replace(/<[^>]*>/g, ''),
            escapeHtml: (str) => str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            })[m])
        };

        // Array helpers
        this.array = {
            unique: (arr) => [...new Set(arr)],
            chunk: (arr, size) => {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            },
            shuffle: (arr) => {
                const shuffled = [...arr];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            },
            groupBy: (arr, key) => {
                return arr.reduce((groups, item) => {
                    const group = typeof key === 'function' ? key(item) : item[key];
                    groups[group] = groups[group] || [];
                    groups[group].push(item);
                    return groups;
                }, {});
            }
        };

        // Object helpers
        this.object = {
            deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
            merge: (target, ...sources) => {
                if (!sources.length) return target;
                const source = sources.shift();
                
                if (this.isObject(target) && this.isObject(source)) {
                    for (const key in source) {
                        if (this.isObject(source[key])) {
                            if (!target[key]) Object.assign(target, { [key]: {} });
                            this.object.merge(target[key], source[key]);
                        } else {
                            Object.assign(target, { [key]: source[key] });
                        }
                    }
                }
                
                return this.object.merge(target, ...sources);
            },
            pick: (obj, keys) => {
                return keys.reduce((result, key) => {
                    if (key in obj) result[key] = obj[key];
                    return result;
                }, {});
            },
            omit: (obj, keys) => {
                const result = { ...obj };
                keys.forEach(key => delete result[key]);
                return result;
            }
        };
    }

    // Date utilities
    formatDate(date, format = 'short') {
        const d = new Date(date);
        return this.dateFormatters[format]?.format(d) || d.toLocaleDateString();
    }

    timeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    isValidDate(date) {
        return date instanceof Date && !isNaN(date);
    }

    // Number utilities
    formatNumber(number, options = {}) {
        const defaults = { notation: 'standard', maximumFractionDigits: 2 };
        return new Intl.NumberFormat('en-US', { ...defaults, ...options }).format(number);
    }

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    // Validation utilities
    validate(value, type) {
        return this.validators[type]?.(value) || false;
    }

    validateForm(form) {
        const errors = {};
        const formData = new FormData(form);
        
        for (const [name, value] of formData.entries()) {
            const field = form.querySelector(`[name="${name}"]`);
            const validationType = field?.dataset.validate;
            
            if (validationType && !this.validate(value, validationType)) {
                errors[name] = `Invalid ${validationType}`;
            }
            
            if (field?.required && !value.trim()) {
                errors[name] = 'This field is required';
            }
        }
        
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // Storage utilities
    storage = {
        set: (key, value, expiry = null) => {
            const data = { value, expiry: expiry ? Date.now() + expiry : null };
            localStorage.setItem(key, JSON.stringify(data));
        },
        
        get: (key) => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (!data) return null;
                
                if (data.expiry && Date.now() > data.expiry) {
                    localStorage.removeItem(key);
                    return null;
                }
                
                return data.value;
            } catch {
                return null;
            }
        },
        
        remove: (key) => localStorage.removeItem(key),
        clear: () => localStorage.clear(),
        
        // Session storage variants
        sessionSet: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
        sessionGet: (key) => {
            try {
                return JSON.parse(sessionStorage.getItem(key));
            } catch {
                return null;
            }
        },
        sessionRemove: (key) => sessionStorage.removeItem(key)
    };

    // URL utilities
    getQueryParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    }

    setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url);
    }

    removeQueryParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.replaceState({}, '', url);
    }

    // Event utilities
    debounce(func, wait, immediate = false) {
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

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Type checking utilities
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    isFunction(item) {
        return typeof item === 'function';
    }

    isString(item) {
        return typeof item === 'string';
    }

    isNumber(item) {
        return typeof item === 'number' && !isNaN(item);
    }

    isArray(item) {
        return Array.isArray(item);
    }

    isEmpty(item) {
        if (item == null) return true;
        if (this.isArray(item) || this.isString(item)) return item.length === 0;
        if (this.isObject(item)) return Object.keys(item).length === 0;
        return false;
    }

    // Async utilities
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0) {
                await this.delay(delay);
                return this.retry(fn, retries - 1, delay);
            }
            throw error;
        }
    }

    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Random utilities
    randomId(length = 8) {
        return Math.random().toString(36).substring(2, 2 + length);
    }

    randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // Device detection
    getDeviceInfo() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isTablet: /iPad|Tablet/i.test(ua),
            isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            browser: this.getBrowserName(),
            os: this.getOSName()
        };
    }

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
    }

    getOSName() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return 'Unknown';
    }
}

// Initialize and export
const utils = new UtilitiesManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.Utils = utils;

// Export individual utilities for convenience
window.$ = utils.dom.query;
window.$$ = utils.dom.queryAll;

export default utils; 