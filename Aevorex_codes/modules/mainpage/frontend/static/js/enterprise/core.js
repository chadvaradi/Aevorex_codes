// Enterprise Core JavaScript
// Core functionality for the AEVOREX Enterprise Platform

class AevorexCore {
    constructor() {
        this.initialized = false;
        this.components = new Map();
        this.eventBus = new EventTarget();
        this.config = {
            theme: 'dark',
            animations: true,
            debug: false
        };
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        console.log('🚀 AEVOREX Enterprise Platform - Initializing...');
        
        // Set up DOM ready listener
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        console.log('📱 DOM Ready - Setting up core functionality');
        
        // Remove no-js class
        document.body.classList.remove('no-js');
        
        // Initialize theme
        this.initializeTheme();
        
        // Initialize components
        this.initializeComponents();
        
        // Set up global event listeners
        this.setupGlobalEvents();
        
        // Mark as initialized
        this.initialized = true;
        
        // Dispatch ready event
        this.eventBus.dispatchEvent(new CustomEvent('core:ready'));
        
        console.log('✅ AEVOREX Core initialized successfully');
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('aevorex-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.config.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('aevorex-theme', theme);
        
        this.eventBus.dispatchEvent(new CustomEvent('theme:changed', {
            detail: { theme }
        }));
    }

    toggleTheme() {
        const newTheme = this.config.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    initializeComponents() {
        // Initialize Loading Overlay
        this.registerComponent('loading', new LoadingOverlay());
        
        // Initialize Search
        this.registerComponent('search', new GlobalSearch());
        
        // Initialize Navigation
        this.registerComponent('navigation', new Navigation());
        
        // Initialize Hero Animations
        this.registerComponent('hero', new HeroAnimations());
        
        // Initialize Hub Cards
        this.registerComponent('hubCards', new HubCards());
    }

    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`📦 Component registered: ${name}`);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    setupGlobalEvents() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
        });

        // Visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.eventBus.dispatchEvent(new CustomEvent('app:hidden'));
            } else {
                this.eventBus.dispatchEvent(new CustomEvent('app:visible'));
            }
        });
    }

    handleError(error) {
        // In a production environment, you might want to send errors to a logging service
        console.error('Application error:', error);
        
        // Show user-friendly error message
        this.showNotification('Hiba történt. Kérjük, próbálja újra.', 'error');
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-primary);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: var(--shadow-lg);
        `;
        
        if (type === 'error') {
            notification.style.borderColor = 'var(--error)';
        } else if (type === 'success') {
            notification.style.borderColor = 'var(--success)';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Utility methods
    animate(element, animation, duration = 300) {
        if (!this.config.animations) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ease-out`;
            
            const onAnimationEnd = () => {
                element.style.animation = '';
                element.removeEventListener('animationend', onAnimationEnd);
                resolve();
            };
            
            element.addEventListener('animationend', onAnimationEnd);
        });
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    debounce(func, wait, immediate) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
}

// Component Classes
class LoadingOverlay {
    constructor() {
        this.overlay = document.getElementById('loading-overlay');
        this.isVisible = false;
    }

    show(message = 'Loading...') {
        if (!this.overlay) return;
        
        const loadingText = this.overlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        this.overlay.setAttribute('aria-hidden', 'false');
        this.isVisible = true;
    }

    hide() {
        if (!this.overlay) return;
        
        this.overlay.setAttribute('aria-hidden', 'true');
        this.isVisible = false;
    }
}

class GlobalSearch {
    constructor() {
        this.searchToggle = document.getElementById('search-toggle');
        this.searchOverlay = document.getElementById('search-overlay');
        this.searchInput = document.getElementById('global-search-input');
        this.searchClose = document.getElementById('search-close');
        this.searchForm = document.getElementById('global-search-form');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.searchToggle) {
            this.searchToggle.addEventListener('click', () => this.show());
        }
        
        if (this.searchClose) {
            this.searchClose.addEventListener('click', () => this.hide());
        }
        
        if (this.searchOverlay) {
            this.searchOverlay.addEventListener('click', (e) => {
                if (e.target === this.searchOverlay) {
                    this.hide();
                }
            });
        }
        
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.show();
            } else if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });
    }

    show() {
        if (!this.searchOverlay) return;
        
        this.searchOverlay.setAttribute('aria-hidden', 'false');
        
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
            }
        }, 100);
    }

    hide() {
        if (!this.searchOverlay) return;
        
        this.searchOverlay.setAttribute('aria-hidden', 'true');
    }

    isVisible() {
        return this.searchOverlay && this.searchOverlay.getAttribute('aria-hidden') === 'false';
    }

    performSearch() {
        const query = this.searchInput?.value?.trim();
        if (!query) return;
        
        console.log('Searching for:', query);
        
        // Here you would implement actual search functionality
        // For now, just show a notification
        window.aevorex.showNotification(`Keresés: "${query}" - Hamarosan elérhető!`, 'info');
    }
}

class Navigation {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link[data-hub]');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const hub = link.getAttribute('data-hub');
                this.navigateToHub(hub);
            });
        });
    }

    navigateToHub(hub) {
        console.log(`Navigating to ${hub} hub`);
        
        // Update URL
        window.history.pushState({ hub }, '', `#/${hub}`);
        
        // Show loading for demo
        const loading = window.aevorex.getComponent('loading');
        loading?.show(`Loading ${hub.toUpperCase()} HUB...`);
        
        setTimeout(() => {
            loading?.hide();
            this.showHubView(hub);
        }, 1500);
    }

    showHubView(hub) {
        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(`${hub}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Update navigation state
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-hub') === hub) {
                link.classList.add('active');
            }
        });
        
        window.aevorex.showNotification(`${hub.toUpperCase()} HUB betöltve!`, 'success');
    }
}

class HeroAnimations {
    constructor() {
        this.heroElements = document.querySelectorAll('.hero-title, .hero-subtitle, .stat-item');
        this.setupAnimations();
    }

    setupAnimations() {
        if (!window.aevorex?.config?.animations) return;
        
        // Animate hero elements on load
        this.heroElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }
}

class HubCards {
    constructor() {
        this.cards = document.querySelectorAll('.hub-card');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.cards.forEach(card => {
            const link = card.querySelector('.hub-link');
            
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href) {
                        const hub = href.replace('#/', '');
                        window.aevorex.getComponent('navigation')?.navigateToHub(hub);
                    }
                });
            }
        });
    }
}

// Initialize the application
window.aevorex = new AevorexCore();

// Export for module usage
export default AevorexCore; 