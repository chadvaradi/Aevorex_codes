/**
 * ===================================================================
 * AEVOREX FINANCEHUB - UNIFIED UX ENHANCEMENTS v8.0.0
 * Premium User Experience Enhancement System
 * Merged from 4 versions: components/ux-enhancements.js + ux-enhancements/ files
 * ===================================================================
 * 
 * FEATURES:
 * - Premium animations (60fps)
 * - Responsive design system
 * - Chat interface enhancements
 * - Scroll optimization
 * - Loading states & skeleton loaders
 * - Dark/Light theme support
 * - Performance monitoring
 * - Accessibility improvements
 */

class AdvancedUXEnhancementsUnified {
    constructor(options = {}) {
        this.config = {
            VERSION: "8.0.0-unified",
            enableAnimations: true,
            enableScrollOptimization: true,
            enableChatEnhancements: true,
            enableThemeSystem: true,
            enablePerformanceMonitoring: true,
            enableAccessibility: true,
            animationDuration: 300,
            scrollThreshold: 100,
            debounceDelay: 150,
            ...options
        };
        
        this.state = {
            isInitialized: false,
            currentTheme: 'dark',
            isScrolling: false,
            scrollPosition: 0,
            lastScrollTime: 0,
            performanceMetrics: {
                fps: 60,
                loadTime: 0,
                renderTime: 0
            },
            animations: new Map(),
            observers: new Map()
        };
        
        this.elements = {
            body: null,
            main: null,
            header: null,
            chatContainer: null,
            scrollIndicator: null,
            loadingOverlay: null,
            themeToggle: null
        };
        
        this.timers = {
            scroll: null,
            resize: null,
            performance: null
        };
        
        // Bind methods BEFORE using them
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleThemeToggle = this.handleThemeToggle.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);
        this.handleChatInput = this.handleChatInput.bind(this);
        this.handleChatSend = this.handleChatSend.bind(this);
        this.handleChatFocus = this.handleChatFocus.bind(this);
        this.handleChatBlur = this.handleChatBlur.bind(this);
        
        console.log(`🎨 AdvancedUXEnhancementsUnified v${this.config.VERSION} initialized`);
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing UX Enhancements...');
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize theme system
            if (this.config.enableThemeSystem) {
                this.initializeThemeSystem();
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize animations
            if (this.config.enableAnimations) {
                this.initializeAnimations();
            }
            
            // Setup scroll optimization
            if (this.config.enableScrollOptimization) {
                this.initializeScrollOptimization();
            }
            
            // Initialize chat enhancements
            if (this.config.enableChatEnhancements) {
                this.initializeChatEnhancements();
            }
            
            // Setup accessibility features
            if (this.config.enableAccessibility) {
                this.initializeAccessibility();
            }
            
            // Start performance monitoring
            if (this.config.enablePerformanceMonitoring) {
                this.startPerformanceMonitoring();
            }
            
            // Apply initial enhancements
            this.applyInitialEnhancements();
            
            this.state.isInitialized = true;
            console.log('✅ UX Enhancements initialized successfully');
            
        } catch (error) {
            console.error('❌ UX Enhancements initialization failed:', error);
            this.handleError(error);
        }
    }
    
    cacheElements() {
        this.elements.body = document.body;
        this.elements.main = document.querySelector('main') || document.querySelector('.main-content');
        this.elements.header = document.querySelector('header') || document.querySelector('.header');
        this.elements.chatContainer = document.querySelector('.chat-container') || 
                                     document.querySelector('#chat-container') ||
                                     document.querySelector('.ai-chat');
    }
    
    setupEventListeners() {
        // Scroll events with debouncing
        if (this.config.enableScrollOptimization) {
            window.addEventListener('scroll', this.debounce(this.handleScroll, this.config.debounceDelay), { passive: true });
        }
        
        // Resize events with debouncing
        window.addEventListener('resize', this.debounce(this.handleResize, this.config.debounceDelay));
        
        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyboardNavigation);
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle') || document.querySelector('#theme-toggle');
        if (themeToggle) {
            this.elements.themeToggle = themeToggle;
            themeToggle.addEventListener('click', this.handleThemeToggle);
        }
    }
    
    initializeThemeSystem() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('aevorex-theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        this.state.currentTheme = savedTheme || systemTheme;
        this.applyTheme(this.state.currentTheme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('aevorex-theme')) {
                this.state.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.state.currentTheme);
            }
        });
    }
    
    applyTheme(theme) {
        this.elements.body.classList.remove('theme-light', 'theme-dark');
        this.elements.body.classList.add(`theme-${theme}`);
        
        // Update theme toggle button
        if (this.elements.themeToggle) {
            this.elements.themeToggle.setAttribute('data-theme', theme);
            this.elements.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
        }
        
        // Emit theme change event
        document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
    }
    
    handleThemeToggle() {
        const newTheme = this.state.currentTheme === 'dark' ? 'light' : 'dark';
        this.state.currentTheme = newTheme;
        this.applyTheme(newTheme);
        localStorage.setItem('aevorex-theme', newTheme);
        
        // Add toggle animation
        if (this.elements.themeToggle) {
            this.elements.themeToggle.classList.add('theme-toggle-active');
            setTimeout(() => {
                this.elements.themeToggle.classList.remove('theme-toggle-active');
            }, this.config.animationDuration);
        }
    }
    
    initializeAnimations() {
        // Add CSS custom properties for animations
        document.documentElement.style.setProperty('--animation-duration', `${this.config.animationDuration}ms`);
        document.documentElement.style.setProperty('--animation-easing', 'cubic-bezier(0.4, 0, 0.2, 1)');
        
        // Initialize intersection observer for scroll animations
        this.setupScrollAnimations();
        
        // Initialize loading animations
        this.setupLoadingAnimations();
    }
    
    setupScrollAnimations() {
        if (!('IntersectionObserver' in window)) return;
        
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    entry.target.classList.remove('animate-out');
                } else {
                    entry.target.classList.add('animate-out');
                    entry.target.classList.remove('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        this.state.observers.set('animation', animationObserver);
        
        // Observe elements with animation classes
        document.querySelectorAll('.animate-on-scroll, .bubble-component, .ticker-item').forEach(el => {
            animationObserver.observe(el);
        });
    }
    
    setupLoadingAnimations() {
        // Create enhanced loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay-enhanced';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner-enhanced"></div>
                <div class="loading-text">Loading FinanceHub...</div>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;
        
        this.elements.loadingOverlay = loadingOverlay;
        this.elements.body.appendChild(loadingOverlay);
        
        // Hide loading overlay after initial load
        window.addEventListener('load', () => {
            setTimeout(() => this.hideLoadingOverlay(), 500);
        });
    }
    
    hideLoadingOverlay() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('loading-fade-out');
            setTimeout(() => {
                if (this.elements.loadingOverlay && this.elements.loadingOverlay.parentNode) {
                    this.elements.loadingOverlay.parentNode.removeChild(this.elements.loadingOverlay);
                }
            }, this.config.animationDuration);
        }
    }
    
    initializeScrollOptimization() {
        // Create scroll indicator
        const scrollIndicator = document.createElement('div');
        scrollIndicator.className = 'scroll-indicator';
        scrollIndicator.innerHTML = '<div class="scroll-progress"></div>';
        this.elements.scrollIndicator = scrollIndicator;
        this.elements.body.appendChild(scrollIndicator);
        
        // Initialize smooth scrolling for anchor links
        this.initializeSmoothScrolling();
    }
    
    initializeSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        this.state.scrollPosition = scrollTop;
        this.state.lastScrollTime = Date.now();
        this.state.isScrolling = true;
        
        // Update scroll indicator
        if (this.elements.scrollIndicator) {
            const progressBar = this.elements.scrollIndicator.querySelector('.scroll-progress');
            if (progressBar) {
                progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
            }
        }
        
        // Add/remove scrolling class to body
        this.elements.body.classList.add('is-scrolling');
        
        // Clear scrolling state after delay
        clearTimeout(this.timers.scroll);
        this.timers.scroll = setTimeout(() => {
            this.state.isScrolling = false;
            this.elements.body.classList.remove('is-scrolling');
        }, 150);
        
        // Emit scroll event
        document.dispatchEvent(new CustomEvent('ux:scroll', {
            detail: { scrollTop, scrollPercent, isScrolling: this.state.isScrolling }
        }));
    }
    
    handleResize() {
        // Update viewport height CSS custom property
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        
        // Emit resize event
        document.dispatchEvent(new CustomEvent('ux:resize', {
            detail: { width: window.innerWidth, height: window.innerHeight }
        }));
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            // Pause animations when tab is not visible
            this.pauseAnimations();
        } else {
            // Resume animations when tab becomes visible
            this.resumeAnimations();
        }
    }
    
    handleKeyboardNavigation(event) {
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.focusSearchInput();
                    break;
                case '/':
                    event.preventDefault();
                    this.focusChatInput();
                    break;
                case 'd':
                    event.preventDefault();
                    this.handleThemeToggle();
                    break;
            }
        }
        
        // Handle escape key
        if (event.key === 'Escape') {
            this.handleEscapeKey();
        }
    }
    
    focusSearchInput() {
        const searchInput = document.querySelector('input[type="search"]') || 
                           document.querySelector('.search-input') ||
                           document.querySelector('#search');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    focusChatInput() {
        const chatInput = document.querySelector('.chat-input') ||
                         document.querySelector('#chat-input') ||
                         document.querySelector('textarea[placeholder*="chat"]');
        if (chatInput) {
            chatInput.focus();
        }
    }
    
    handleEscapeKey() {
        // Close any open modals or overlays
        const activeModal = document.querySelector('.modal.active') ||
                           document.querySelector('.overlay.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
        
        // Blur active input
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
    
    initializeChatEnhancements() {
        if (!this.elements.chatContainer) return;
        
        // Find chat input elements
        const chatInput = this.elements.chatContainer.querySelector('textarea') ||
                         this.elements.chatContainer.querySelector('input[type="text"]');
        const chatSendButton = this.elements.chatContainer.querySelector('button[type="submit"]') ||
                              this.elements.chatContainer.querySelector('.send-button');
        
        if (chatInput) {
            chatInput.addEventListener('input', this.handleChatInput);
            chatInput.addEventListener('focus', this.handleChatFocus);
            chatInput.addEventListener('blur', this.handleChatBlur);
            
            // Add keyboard shortcuts
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.handleChatSend();
                }
            });
        }
        
        if (chatSendButton) {
            chatSendButton.addEventListener('click', this.handleChatSend);
        }
        
        // Initialize auto-resize for textarea
        this.initializeChatAutoResize(chatInput);
    }
    
    initializeChatAutoResize(textarea) {
        if (!textarea || textarea.tagName !== 'TEXTAREA') return;
        
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        };
        
        textarea.addEventListener('input', resize);
        resize(); // Initial resize
    }
    
    handleChatInput(event) {
        const input = event.target;
        const value = input.value.trim();
        
        // Update send button state
        const sendButton = this.elements.chatContainer.querySelector('button[type="submit"]') ||
                          this.elements.chatContainer.querySelector('.send-button');
        if (sendButton) {
            sendButton.disabled = !value;
            sendButton.classList.toggle('chat-send-ready', !!value);
        }
        
        // Show typing indicator
        this.showTypingIndicator();
    }
    
    handleChatFocus() {
        this.elements.chatContainer.classList.add('chat-focused');
    }
    
    handleChatBlur() {
        this.elements.chatContainer.classList.remove('chat-focused');
        this.hideTypingIndicator();
    }
    
    handleChatSend() {
        const chatInput = this.elements.chatContainer.querySelector('textarea') ||
                         this.elements.chatContainer.querySelector('input[type="text"]');
        
        if (chatInput && chatInput.value.trim()) {
            // Add sending animation
            this.elements.chatContainer.classList.add('chat-sending');
            
            // Emit chat send event
            document.dispatchEvent(new CustomEvent('chat:send', {
                detail: { message: chatInput.value.trim() }
            }));
            
            // Clear input
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // Remove sending animation after delay
            setTimeout(() => {
                this.elements.chatContainer.classList.remove('chat-sending');
            }, 1000);
        }
    }
    
    showTypingIndicator() {
        clearTimeout(this.timers.typing);
        this.elements.chatContainer.classList.add('chat-typing');
        
        this.timers.typing = setTimeout(() => {
            this.hideTypingIndicator();
        }, 2000);
    }
    
    hideTypingIndicator() {
        this.elements.chatContainer.classList.remove('chat-typing');
        clearTimeout(this.timers.typing);
    }
    
    initializeAccessibility() {
        // Add skip links
        this.addSkipLinks();
        
        // Enhance focus management
        this.enhanceFocusManagement();
        
        // Add ARIA labels where missing
        this.addAriaLabels();
        
        // Initialize keyboard navigation
        this.initializeKeyboardNavigation();
    }
    
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
            <a href="#chat" class="skip-link">Skip to chat</a>
        `;
        
        this.elements.body.insertBefore(skipLinks, this.elements.body.firstChild);
    }
    
    enhanceFocusManagement() {
        // Add focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.elements.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            this.elements.body.classList.remove('keyboard-navigation');
        });
    }
    
    addAriaLabels() {
        // Add ARIA labels to buttons without text
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
            if (!button.textContent.trim()) {
                const icon = button.querySelector('i, svg');
                if (icon) {
                    button.setAttribute('aria-label', 'Button');
                }
            }
        });
        
        // Add ARIA labels to form inputs without labels
        document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });
    }
    
    initializeKeyboardNavigation() {
        // Make non-interactive elements with click handlers focusable
        document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(textarea):not(select)').forEach(el => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
                el.setAttribute('role', 'button');
            }
        });
    }
    
    startPerformanceMonitoring() {
        // Monitor FPS
        this.monitorFPS();
        
        // Monitor load times
        this.monitorLoadTimes();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
    }
    
    monitorFPS() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.state.performanceMetrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                // Emit FPS update
                document.dispatchEvent(new CustomEvent('performance:fps', {
                    detail: { fps: this.state.performanceMetrics.fps }
                }));
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    monitorLoadTimes() {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.state.performanceMetrics.loadTime = loadTime;
            
            console.log(`📊 Page load time: ${loadTime}ms`);
        });
    }
    
    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                console.log(`💾 Memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
            }, 30000);
        }
    }
    
    applyInitialEnhancements() {
        // Add enhanced classes to body
        this.elements.body.classList.add('ux-enhanced', 'premium-experience');
        
        // Set initial viewport height
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        
        // Initialize reduced motion support
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.elements.body.classList.add('reduced-motion');
        }
        
        // Add loading complete class after initialization
        setTimeout(() => {
            this.elements.body.classList.add('ux-loaded');
        }, 100);
    }
    
    pauseAnimations() {
        this.elements.body.classList.add('animations-paused');
    }
    
    resumeAnimations() {
        this.elements.body.classList.remove('animations-paused');
    }
    
    // Utility methods
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
    
    // Public API methods
    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.state.currentTheme = theme;
            this.applyTheme(theme);
            localStorage.setItem('aevorex-theme', theme);
        }
    }
    
    getTheme() {
        return this.state.currentTheme;
    }
    
    getPerformanceMetrics() {
        return { ...this.state.performanceMetrics };
    }
    
    addCustomAnimation(name, element, keyframes, options) {
        if (element && keyframes) {
            const animation = element.animate(keyframes, options);
            this.state.animations.set(name, animation);
            return animation;
        }
    }
    
    removeCustomAnimation(name) {
        const animation = this.state.animations.get(name);
        if (animation) {
            animation.cancel();
            this.state.animations.delete(name);
        }
    }
    
    handleError(error) {
        console.error('UX Enhancements error:', error);
        
        // Fallback to basic functionality
        this.elements.body.classList.add('ux-fallback');
        
        // Disable problematic features
        this.config.enableAnimations = false;
        this.config.enablePerformanceMonitoring = false;
    }
    
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        
        if (this.elements.themeToggle) {
            this.elements.themeToggle.removeEventListener('click', this.handleThemeToggle);
        }
        
        // Clear timers
        Object.values(this.timers).forEach(timer => {
            if (timer) clearTimeout(timer);
        });
        
        // Disconnect observers
        this.state.observers.forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
        
        // Cancel animations
        this.state.animations.forEach(animation => {
            if (animation && animation.cancel) {
                animation.cancel();
            }
        });
        
        console.log('🗑️ AdvancedUXEnhancementsUnified destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedUXEnhancementsUnified;
} else if (typeof window !== 'undefined') {
    window.AdvancedUXEnhancementsUnified = AdvancedUXEnhancementsUnified;
} 

// ES6 export for modern modules (Added for structural consistency)
export { AdvancedUXEnhancementsUnified };
export default AdvancedUXEnhancementsUnified;

console.log('✅ AdvancedUXEnhancementsUnified exported successfully (CommonJS + ES6 + Global)'); 