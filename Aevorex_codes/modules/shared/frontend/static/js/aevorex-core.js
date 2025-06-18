/**
 * AEVOREX CORE JAVASCRIPT LIBRARY
 * Közös utility funkciók és komponensek minden modulhoz
 */

// ===================================================================
// 1. CORE UTILITIES
// ===================================================================

class AevorexCore {
    constructor() {
        this.theme = localStorage.getItem('aevorex-theme') || 'dark';
        this.modules = new Map();
        this.components = new Map();
        this.init();
    }

    init() {
        this.initTheme();
        this.initGlobalEventListeners();
        this.registerBuiltinComponents();
        console.log('🚀 Aevorex Core initialized');
    }

    // ===================================================================
    // THEME MANAGEMENT
    // ===================================================================

    initTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeToggle();
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('aevorex-theme', this.theme);
        this.updateThemeToggle();
        this.emit('theme-changed', { theme: this.theme });
    }

    updateThemeToggle() {
        const toggles = document.querySelectorAll('[data-theme-toggle]');
        toggles.forEach(toggle => {
            const icon = toggle.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = this.theme === 'light' ? '🌙' : '☀️';
            }
        });
    }

    // ===================================================================
    // EVENT SYSTEM
    // ===================================================================

    initGlobalEventListeners() {
        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-theme-toggle]')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Smooth scroll for anchor links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                const href = link.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    this.smoothScroll(href);
                }
            }
        });

        // Mobile menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-mobile-toggle]')) {
                e.preventDefault();
                this.toggleMobileMenu();
            }
        });

        // Escape key handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
                this.closeModals();
            }
        });
    }

    emit(eventName, data = {}) {
        const event = new CustomEvent(`aevorex:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    on(eventName, callback) {
        document.addEventListener(`aevorex:${eventName}`, callback);
    }

    // ===================================================================
    // NAVIGATION & SCROLLING
    // ===================================================================

    smoothScroll(target) {
        const element = document.querySelector(target);
        if (element) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const targetPosition = element.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }

    toggleMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const toggle = document.querySelector('[data-mobile-toggle]');
        
        if (mobileMenu) {
            const isOpen = mobileMenu.classList.contains('mobile-menu--open');
            
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                mobileMenu.classList.add('mobile-menu--open');
                toggle?.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
            }
        }
    }

    closeMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const toggle = document.querySelector('[data-mobile-toggle]');
        
        if (mobileMenu) {
            mobileMenu.classList.remove('mobile-menu--open');
            toggle?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }

    // ===================================================================
    // MODAL SYSTEM
    // ===================================================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('modal--open');
            document.body.style.overflow = 'hidden';
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus the modal
            const focusable = modal.querySelector('[autofocus], button, input, textarea, select');
            focusable?.focus();
        }
    }

    closeModal(modalId) {
        const modal = modalId ? document.getElementById(modalId) : document.querySelector('.modal--open');
        if (modal) {
            modal.classList.remove('modal--open');
            document.body.style.overflow = '';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal--open').forEach(modal => {
            this.closeModal(modal.id);
        });
    }

    // ===================================================================
    // LOADING STATES
    // ===================================================================

    showLoading(element, text = 'Loading...') {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.classList.add('loading-state');
            element.setAttribute('aria-busy', 'true');
            
            const loadingEl = document.createElement('div');
            loadingEl.className = 'loading-overlay';
            loadingEl.innerHTML = `
                <div class="loading-spinner">
                    <div class="loading"></div>
                    <span class="loading-text">${text}</span>
                </div>
            `;
            
            element.appendChild(loadingEl);
        }
    }

    hideLoading(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element) {
            element.classList.remove('loading-state');
            element.setAttribute('aria-busy', 'false');
            
            const loadingEl = element.querySelector('.loading-overlay');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    // ===================================================================
    // NOTIFICATIONS
    // ===================================================================

    notify(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification__content">
                <div class="notification__icon">${this.getNotificationIcon(type)}</div>
                <div class="notification__message">${message}</div>
                <button class="notification__close" aria-label="Close notification">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Add to container
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        // Close button
        notification.querySelector('.notification__close').addEventListener('click', () => {
            this.removeNotification(notification);
        });

        return notification;
    }

    removeNotification(notification) {
        notification.classList.add('notification--removing');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // ===================================================================
    // COMPONENT REGISTRATION
    // ===================================================================

    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`📦 Registered component: ${name}`);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    registerBuiltinComponents() {
        // Register built-in components here
        this.registerComponent('tooltip', AevorexTooltip);
        this.registerComponent('dropdown', AevorexDropdown);
        this.registerComponent('tabs', AevorexTabs);
    }

    // ===================================================================
    // MODULE SYSTEM
    // ===================================================================

    registerModule(name, module) {
        this.modules.set(name, module);
        console.log(`🔧 Registered module: ${name}`);
    }

    getModule(name) {
        return this.modules.get(name);
    }

    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    formatNumber(num, options = {}) {
        const defaults = {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };
        
        return new Intl.NumberFormat('hu-HU', { ...defaults, ...options }).format(num);
    }

    formatCurrency(amount, currency = 'HUF') {
        return new Intl.NumberFormat('hu-HU', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    formatDate(date, options = {}) {
        const defaults = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('hu-HU', { ...defaults, ...options }).format(new Date(date));
    }

    // ===================================================================
    // API HELPERS
    // ===================================================================

    async fetchJSON(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// ===================================================================
// 2. TOOLTIP COMPONENT
// ===================================================================

class AevorexTooltip {
    constructor(element) {
        this.element = element;
        this.content = element.getAttribute('data-tooltip') || element.getAttribute('title');
        this.position = element.getAttribute('data-tooltip-position') || 'top';
        this.tooltip = null;
        
        if (this.content) {
            this.init();
        }
    }

    init() {
        this.element.addEventListener('mouseenter', () => this.show());
        this.element.addEventListener('mouseleave', () => this.hide());
        this.element.addEventListener('focus', () => this.show());
        this.element.addEventListener('blur', () => this.hide());
    }

    show() {
        if (this.tooltip) return;

        this.tooltip = document.createElement('div');
        this.tooltip.className = `tooltip tooltip--${this.position}`;
        this.tooltip.textContent = this.content;
        
        document.body.appendChild(this.tooltip);
        this.position();
    }

    hide() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }

    position() {
        const rect = this.element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (this.position) {
            case 'top':
                top = rect.top - tooltipRect.height - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 8;
                break;
        }
        
        this.tooltip.style.top = `${top + window.scrollY}px`;
        this.tooltip.style.left = `${left + window.scrollX}px`;
    }
}

// ===================================================================
// 3. DROPDOWN COMPONENT
// ===================================================================

class AevorexDropdown {
    constructor(element) {
        this.element = element;
        this.trigger = element.querySelector('[data-dropdown-trigger]');
        this.menu = element.querySelector('[data-dropdown-menu]');
        this.isOpen = false;
        
        if (this.trigger && this.menu) {
            this.init();
        }
    }

    init() {
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.menu.classList.add('dropdown-menu--open');
        this.trigger.setAttribute('aria-expanded', 'true');
        this.isOpen = true;
    }

    close() {
        this.menu.classList.remove('dropdown-menu--open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.isOpen = false;
    }
}

// ===================================================================
// 4. TABS COMPONENT
// ===================================================================

class AevorexTabs {
    constructor(element) {
        this.element = element;
        this.tabList = element.querySelector('[role="tablist"]');
        this.tabs = Array.from(element.querySelectorAll('[role="tab"]'));
        this.panels = Array.from(element.querySelectorAll('[role="tabpanel"]'));
        
        if (this.tabs.length && this.panels.length) {
            this.init();
        }
    }

    init() {
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTab(index);
            });

            tab.addEventListener('keydown', (e) => {
                this.handleKeyDown(e, index);
            });
        });

        // Select first tab by default
        this.selectTab(0);
    }

    selectTab(index) {
        // Update tabs
        this.tabs.forEach((tab, i) => {
            if (i === index) {
                tab.setAttribute('aria-selected', 'true');
                tab.classList.add('tab--active');
            } else {
                tab.setAttribute('aria-selected', 'false');
                tab.classList.remove('tab--active');
            }
        });

        // Update panels
        this.panels.forEach((panel, i) => {
            if (i === index) {
                panel.removeAttribute('hidden');
                panel.classList.add('tabpanel--active');
            } else {
                panel.setAttribute('hidden', '');
                panel.classList.remove('tabpanel--active');
            }
        });
    }

    handleKeyDown(e, currentIndex) {
        let newIndex;

        switch (e.key) {
            case 'ArrowLeft':
                newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                break;
            case 'ArrowRight':
                newIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                newIndex = 0;
                break;
            case 'End':
                newIndex = this.tabs.length - 1;
                break;
            default:
                return;
        }

        e.preventDefault();
        this.selectTab(newIndex);
        this.tabs[newIndex].focus();
    }
}

// ===================================================================
// 5. INITIALIZE
// ===================================================================

// Initialize Aevorex Core when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.Aevorex = new AevorexCore();
    
    // Auto-initialize components
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        new AevorexTooltip(el);
    });
    
    document.querySelectorAll('[data-dropdown]').forEach(el => {
        new AevorexDropdown(el);
    });
    
    document.querySelectorAll('[data-tabs]').forEach(el => {
        new AevorexTabs(el);
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AevorexCore, AevorexTooltip, AevorexDropdown, AevorexTabs };
} 