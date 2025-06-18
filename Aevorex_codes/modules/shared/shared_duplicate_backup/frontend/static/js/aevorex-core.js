/**
 * AEVOREX Core JavaScript Framework
 * Professional shared functionality across all platform modules
 */

// Global AEVOREX namespace
window.AEVOREX = window.AEVOREX || {};

(function(AEVOREX) {
    'use strict';

    // Version and configuration
    AEVOREX.VERSION = '2.1.0';
    AEVOREX.DEBUG = false;

    // Core utilities
    AEVOREX.utils = {
        /**
         * Professional console logging with module context
         */
        log: function(message, type = 'info', module = 'CORE') {
            if (!AEVOREX.DEBUG && type === 'debug') return;
            
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const prefix = `[${timestamp}] [AEVOREX-${module}]`;
            
            switch(type) {
                case 'error':
                    console.error(`${prefix} ERROR:`, message);
                    break;
                case 'warn':
                    console.warn(`${prefix} WARNING:`, message);
                    break;
                case 'success':
                    console.log(`${prefix} SUCCESS:`, message);
                    break;
                case 'debug':
                    console.debug(`${prefix} DEBUG:`, message);
                    break;
                default:
                    console.log(`${prefix} INFO:`, message);
            }
        },

        /**
         * Debounce function for performance optimization
         */
        debounce: function(func, wait, immediate) {
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
        },

        /**
         * Throttle function for performance optimization
         */
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Professional CSS selector helper with error handling
         */
        $(selector, context = document) {
            try {
                return context.querySelector(selector);
            } catch (e) {
                AEVOREX.utils.log(`Invalid selector: ${selector}`, 'error');
                return null;
            }
        },

        /**
         * Multiple elements selector with error handling
         */
        $$(selector, context = document) {
            try {
                return context.querySelectorAll(selector);
            } catch (e) {
                AEVOREX.utils.log(`Invalid selector: ${selector}`, 'error');
                return [];
            }
        },

        /**
         * Add event listener with comprehensive error handling
         */
        on: function(element, event, handler, options = {}) {
            if (!element) {
                AEVOREX.utils.log('Cannot add event listener: element is null', 'warn');
                return;
            }
            
            try {
                element.addEventListener(event, handler, options);
                AEVOREX.utils.log(`Event listener added: ${event}`, 'debug');
            } catch (e) {
                AEVOREX.utils.log(`Failed to add event listener: ${e.message}`, 'error');
            }
        },

        /**
         * Professional fetch wrapper with comprehensive error handling
         */
        fetch: async function(url, options = {}) {
            try {
                AEVOREX.utils.log(`Initiating request: ${url}`, 'debug');
                
                const defaultOptions = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                };
                
                const response = await fetch(url, { ...defaultOptions, ...options });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                AEVOREX.utils.log(`Request completed successfully: ${url}`, 'success');
                return { success: true, data };
                
            } catch (error) {
                AEVOREX.utils.log(`Request failed: ${url} - ${error.message}`, 'error');
                return { success: false, error: error.message };
            }
        },

        /**
         * Format numbers with Hungarian locale support
         */
        formatNumber: function(number, options = {}) {
            try {
                return new Intl.NumberFormat('hu-HU', options).format(number);
            } catch (e) {
                AEVOREX.utils.log(`Number formatting failed: ${e.message}`, 'warn');
                return number.toString();
            }
        },

        /**
         * Format currency values with Hungarian locale
         */
        formatCurrency: function(amount, currency = 'HUF') {
            return this.formatNumber(amount, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0
            });
        },

        /**
         * Smooth scroll to element
         */
        scrollTo: function(target, offset = 0) {
            const element = typeof target === 'string' ? this.$(target) : target;
            if (!element) return;

            const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        },

        /**
         * Add CSS class with animation support
         */
        addClass: function(element, className, delay = 0) {
            if (!element) return;
            
            setTimeout(() => {
                element.classList.add(className);
            }, delay);
        },

        /**
         * Remove CSS class with animation support
         */
        removeClass: function(element, className, delay = 0) {
            if (!element) return;
            
            setTimeout(() => {
                element.classList.remove(className);
            }, delay);
        }
    };

    // Professional theme management
    AEVOREX.theme = {
        current: 'dark',

        init: function() {
            const saved = localStorage.getItem('aevorex-theme');
            this.current = saved || 'dark';
            this.apply(this.current);
            this.setupToggleHandlers();
            AEVOREX.utils.log(`Theme system initialized: ${this.current}`, 'info', 'THEME');
        },

        apply: function(theme) {
            document.body.setAttribute('data-theme', theme);
            this.current = theme;
            localStorage.setItem('aevorex-theme', theme);
            
            // Update theme toggle icons
            this.updateToggleIcons(theme);
            
            // Dispatch theme change event
            window.dispatchEvent(new CustomEvent('aevorex:theme-changed', {
                detail: { theme }
            }));
        },

        toggle: function() {
            const newTheme = this.current === 'dark' ? 'light' : 'dark';
            this.apply(newTheme);
            AEVOREX.utils.log(`Theme switched to: ${newTheme}`, 'info', 'THEME');
        },

        setupToggleHandlers: function() {
            const toggleButtons = AEVOREX.utils.$$('[data-theme-toggle]');
            toggleButtons.forEach(button => {
                AEVOREX.utils.on(button, 'click', () => this.toggle());
            });
        },

        updateToggleIcons: function(theme) {
            const toggleButtons = AEVOREX.utils.$$('[data-theme-toggle]');
            toggleButtons.forEach(button => {
                const icon = button.querySelector('svg');
                if (icon) {
                    // Update icon based on theme
                    if (theme === 'dark') {
                        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
                    } else {
                        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
                    }
                }
            });
        }
    };

    // Professional notification system
    AEVOREX.notify = {
        container: null,

        init: function() {
            this.createContainer();
            AEVOREX.utils.log('Notification system initialized', 'info', 'NOTIFY');
        },

        createContainer: function() {
            if (this.container) return;
            
            this.container = document.createElement('div');
            this.container.className = 'aevorex-notifications';
            this.container.style.cssText = `
                position: fixed;
                top: var(--header-height, 72px);
                right: var(--space-6, 1.5rem);
                z-index: var(--z-tooltip, 1070);
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        },

        show: function(message, type = 'info', duration = 5000) {
            this.createContainer();
            
            const notification = document.createElement('div');
            notification.className = `notification notification--${type}`;
            notification.style.cssText = `
                background: var(--bg-card);
                border: 1px solid var(--border-${type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'});
                border-radius: var(--border-radius-lg);
                padding: var(--space-4);
                margin-bottom: var(--space-2);
                box-shadow: var(--shadow-lg);
                backdrop-filter: blur(16px);
                pointer-events: auto;
                transform: translateX(100%);
                transition: var(--transition-all);
                animation: slideInRight 0.3s ease forwards;
            `;
            
            const content = document.createElement('div');
            content.className = 'notification__content';
            content.innerHTML = `
                <div class="notification__message" style="color: var(--text-primary); font-weight: var(--font-weight-medium);">
                    ${message}
                </div>
            `;
            
            notification.appendChild(content);
            this.container.appendChild(notification);
            
            // Auto remove
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
            
            AEVOREX.utils.log(`Notification displayed: ${type}`, 'debug', 'NOTIFY');
        },

        success: function(message, duration) {
            this.show(message, 'success', duration);
        },

        error: function(message, duration) {
            this.show(message, 'error', duration);
        },

        warning: function(message, duration) {
            this.show(message, 'warning', duration);
        },

        info: function(message, duration) {
            this.show(message, 'info', duration);
        }
    };

    // Performance monitoring
    AEVOREX.performance = {
        marks: new Map(),

        mark: function(name) {
            this.marks.set(name, performance.now());
            AEVOREX.utils.log(`Performance mark: ${name}`, 'debug', 'PERF');
        },

        measure: function(name, startMark) {
            const start = this.marks.get(startMark);
            if (!start) {
                AEVOREX.utils.log(`Start mark not found: ${startMark}`, 'warn', 'PERF');
                return;
            }
            
            const duration = performance.now() - start;
            AEVOREX.utils.log(`Performance measure ${name}: ${duration.toFixed(2)}ms`, 'info', 'PERF');
            return duration;
        }
    };

    // Header scroll effects
    AEVOREX.header = {
        init: function() {
            const header = AEVOREX.utils.$('.header');
            if (!header) return;

            let lastScrollTop = 0;
            const scrollThreshold = 100;

            const handleScroll = AEVOREX.utils.throttle(() => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Add scrolled class
                if (scrollTop > 50) {
                    header.classList.add('header--scrolled');
                } else {
                    header.classList.remove('header--scrolled');
                }

                // Hide/show header on scroll direction
                if (scrollTop > lastScrollTop && scrollTop > scrollThreshold) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
                
                lastScrollTop = scrollTop;
            }, 16);

            AEVOREX.utils.on(window, 'scroll', handleScroll);
            AEVOREX.utils.log('Header scroll effects initialized', 'info', 'HEADER');
        }
    };

    // Smooth scrolling for internal links
    AEVOREX.navigation = {
        init: function() {
            const internalLinks = AEVOREX.utils.$$('a[href^="#"]');
            
            internalLinks.forEach(link => {
                AEVOREX.utils.on(link, 'click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const target = AEVOREX.utils.$(`#${targetId}`);
                    
                    if (target) {
                        const headerHeight = AEVOREX.utils.$('.header')?.offsetHeight || 72;
                        AEVOREX.utils.scrollTo(target, headerHeight + 20);
                    }
                });
            });
            
            AEVOREX.utils.log(`Smooth scrolling initialized for ${internalLinks.length} links`, 'info', 'NAV');
        }
    };

    // Module loading system
    AEVOREX.modules = {
        loaded: new Set(),
        
        register: function(name, initFn) {
            if (this.loaded.has(name)) {
                AEVOREX.utils.log(`Module already loaded: ${name}`, 'warn', 'MODULE');
                return;
            }
            
            try {
                initFn();
                this.loaded.add(name);
                AEVOREX.utils.log(`Module loaded successfully: ${name}`, 'success', 'MODULE');
            } catch (error) {
                AEVOREX.utils.log(`Module loading failed: ${name} - ${error.message}`, 'error', 'MODULE');
            }
        }
    };

    // Initialize core functionality
    function initializeCore() {
        AEVOREX.performance.mark('core-init-start');
        
        AEVOREX.utils.log('Initializing AEVOREX Platform', 'info');
        
        // Initialize systems
        AEVOREX.theme.init();
        AEVOREX.notify.init();
        AEVOREX.header.init();
        AEVOREX.navigation.init();
        
        // Add global styles for animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification { font-family: var(--font-family-sans, 'Inter', sans-serif); }
        `;
        document.head.appendChild(style);
        
        AEVOREX.performance.measure('core-init', 'core-init-start');
        AEVOREX.utils.log('AEVOREX Platform initialized successfully', 'success');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('aevorex:ready'));
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCore);
    } else {
        initializeCore();
    }

    // Expose public API
    AEVOREX.init = initializeCore;

})(window.AEVOREX);

// Export for CommonJS/AMD if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AEVOREX;
} 