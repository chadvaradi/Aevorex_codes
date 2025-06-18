/**
 * @file theme-manager.js - Theme Management System for FinanceHub
 * @description Advanced theme management extracted from script.js with enhancements
 * @version 2.0.0 - Extracted and Enhanced
 * @author AEVOREX
 */

/**
 * Theme Manager for FinanceHub
 */
class ThemeManager {
    constructor(options = {}) {
        this.VERSION = '2.0.0';
        
        // Configuration
        this.config = {
            defaultTheme: options.defaultTheme || 'dark',
            storageKey: options.storageKey || 'financehub_theme',
            autoDetect: options.autoDetect !== false,
            enableTransitions: options.enableTransitions !== false,
            transitionDuration: options.transitionDuration || 300,
            ...options
        };
        
        // State
        this.state = {
            currentTheme: null,
            isInitialized: false,
            systemTheme: null,
            userPreference: null,
            mediaQuery: null
        };
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Bind methods
        this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
        
        console.log(`🎨 ThemeManager v${this.VERSION} initialized`);
    }
    
    /**
     * Initialize theme manager
     */
    async init() {
        if (this.state.isInitialized || this.initialized) {
            console.warn('ThemeManager already initialized – skipping duplicate init()');
            return Promise.resolve();
        }
        
        try {
            console.log('🚀 Initializing ThemeManager...');
            
            // Setup system theme detection
            this.setupSystemThemeDetection();
            
            // Detect and apply initial theme
            this.detectTheme();
            
            // Setup theme transitions
            if (this.config.enableTransitions) {
                this.setupThemeTransitions();
            }
            
            // Mark as initialized
            this.state.isInitialized = true;
            // Mark shorthand flag for legacy checks
            this.initialized = true;
            
            console.log(`✅ ThemeManager initialized with theme: ${this.state.currentTheme}`);
            this.emit('initialized', { theme: this.state.currentTheme });
            
            // Dispatch global theme-ready event for other components
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('theme-ready', { 
                    detail: { theme: this.state.currentTheme } 
                }));
            }
            
            return Promise.resolve();
            
        } catch (error) {
            console.error('❌ ThemeManager initialization failed:', error);
            
            // 🚨 CRITICAL FIX: Dispatch global error for debugging
            window.dispatchEvent(new CustomEvent('financehub-error', {
                detail: { component: 'theme-manager', error: error.message }
            }));
            
            return Promise.reject(error);
        }
    }
    
    /**
     * Setup system theme detection
     */
    setupSystemThemeDetection() {
        if (!window.matchMedia) {
            console.warn('⚠️ matchMedia not supported, system theme detection disabled');
            return;
        }
        
        // Create media query for light theme preference
        this.state.mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        
        // Detect current system theme
        this.state.systemTheme = this.state.mediaQuery.matches ? 'light' : 'dark';
        
        // Listen for system theme changes
        this.state.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
        
        console.log(`🔍 System theme detected: ${this.state.systemTheme}`);
    }
    
    /**
     * Detect and set initial theme
     */
    detectTheme() {
        // Check for saved user preference
        const savedTheme = this.getUserPreference();
        
        if (savedTheme && this.isValidTheme(savedTheme)) {
            this.state.userPreference = savedTheme;
            this.state.currentTheme = savedTheme;
            console.log(`📱 Using saved theme preference: ${savedTheme}`);
        } else if (this.config.autoDetect && this.state.systemTheme) {
            this.state.currentTheme = this.state.systemTheme;
            console.log(`🔍 Using detected system theme: ${this.state.systemTheme}`);
        } else {
            this.state.currentTheme = this.config.defaultTheme;
            console.log(`⚙️ Using default theme: ${this.config.defaultTheme}`);
        }
        
        // Apply the detected theme
        this.applyThemeClass(this.state.currentTheme);
    }
    
    /**
     * Handle system theme changes
     */
    handleSystemThemeChange(event) {
        const newSystemTheme = event.matches ? 'light' : 'dark';
        this.state.systemTheme = newSystemTheme;
        
        console.log(`🔄 System theme changed to: ${newSystemTheme}`);
        
        // Only apply system theme if user hasn't set a manual preference
        if (!this.state.userPreference) {
            console.log('🔄 Applying system theme change (no user preference set)');
            this.setTheme(newSystemTheme, false); // Don't save as user preference
        } else {
            console.log('⏭️ Ignoring system theme change (user preference exists)');
        }
        
        this.emit('systemThemeChanged', { 
            systemTheme: newSystemTheme,
            applied: !this.state.userPreference 
        });
    }
    
    /**
     * Set theme programmatically
     */
    setTheme(theme, savePreference = true) {
        if (!this.isValidTheme(theme)) {
            console.warn(`⚠️ Invalid theme: ${theme}. Using current: ${this.state.currentTheme}`);
            return false;
        }
        
        const previousTheme = this.state.currentTheme;
        this.state.currentTheme = theme;
        
        console.log(`🎨 Setting theme: ${theme}`);
        
        // Apply theme class
        this.applyThemeClass(theme);
        
        // Save user preference if requested
        if (savePreference) {
            this.saveUserPreference(theme);
            this.state.userPreference = theme;
        }
        
        // Emit theme change event
        this.emit('themeChanged', { 
            theme, 
            previousTheme,
            isUserPreference: savePreference 
        });
        
        // ALSO broadcast as DOM CustomEvent for external listeners (e.g., TradingView Chart)
        const domEvent = new CustomEvent('theme-changed', {
            detail: { theme, previousTheme }
        });
        document.dispatchEvent(domEvent);
        
        return true;
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.state.currentTheme === 'light' ? 'dark' : 'light';
        return this.setTheme(newTheme);
    }
    
    /**
     * Apply theme class to document
     */
    applyThemeClass(theme) {
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('light-theme', 'dark-theme');
        
        // Add new theme class
        root.classList.add(`${theme}-theme`);
        
        // Set data attribute for CSS targeting
        root.setAttribute('data-theme', theme);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
        
        console.log(`✅ Applied theme class: ${theme}-theme`);
    }
    
    /**
     * Update meta theme-color for mobile browsers
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        // Set appropriate color based on theme
        const colors = {
            light: '#ffffff',
            dark: '#1e1e1e'
        };
        
        metaThemeColor.content = colors[theme] || colors.dark;
    }
    
    /**
     * Setup smooth theme transitions
     */
    setupThemeTransitions() {
        const style = document.createElement('style');
        style.textContent = `
            *, *::before, *::after {
                transition: 
                    background-color ${this.config.transitionDuration}ms ease,
                    border-color ${this.config.transitionDuration}ms ease,
                    color ${this.config.transitionDuration}ms ease,
                    fill ${this.config.transitionDuration}ms ease,
                    stroke ${this.config.transitionDuration}ms ease,
                    box-shadow ${this.config.transitionDuration}ms ease !important;
            }
        `;
        document.head.appendChild(style);
        
        // Remove transitions after theme change to prevent interference
        this.on('themeChanged', () => {
            setTimeout(() => {
                style.remove();
                setTimeout(() => {
                    document.head.appendChild(style);
                }, 50);
            }, this.config.transitionDuration);
        });
    }
    
    /**
     * Get user preference from storage
     */
    getUserPreference() {
        try {
            const raw = localStorage.getItem(this.config.storageKey);
            if (!raw) return null;

            const stored = raw.trim();

            // Handle both plain string and JSON formats for backwards compatibility
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
            
            // Try to parse as JSON (legacy format)
            try {
                const parsed = JSON.parse(stored);
                return typeof parsed === 'string' ? parsed : null;
            } catch (parseError) {
                console.warn('Failed to get stored theme:', parseError);
                // Clear invalid data
                localStorage.removeItem(this.config.storageKey);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Failed to read theme preference from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Save user preference to storage
     */
    saveUserPreference(theme) {
        try {
            localStorage.setItem(this.config.storageKey, theme);
            console.log(`💾 Saved theme preference: ${theme}`);
        } catch (error) {
            console.warn('⚠️ Failed to save theme preference to localStorage:', error);
        }
    }
    
    /**
     * Clear user preference
     */
    clearUserPreference() {
        try {
            localStorage.removeItem(this.config.storageKey);
            this.state.userPreference = null;
            console.log('🗑️ Cleared theme preference');
            
            // Revert to system theme if available
            if (this.state.systemTheme) {
                this.setTheme(this.state.systemTheme, false);
            }
        } catch (error) {
            console.warn('⚠️ Failed to clear theme preference:', error);
        }
    }
    
    /**
     * Check if theme is valid
     */
    isValidTheme(theme) {
        return theme === 'light' || theme === 'dark';
    }
    
    /**
     * Get theme colors for programmatic use
     */
    getThemeColors(theme = this.state.currentTheme) {
        const colors = {
            light: {
                primary: '#000000',
                secondary: '#666666',
                background: '#ffffff',
                surface: '#f8f9fa',
                border: '#e1e5e9',
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            },
            dark: {
                primary: '#ffffff',
                secondary: '#a1a1aa',
                background: '#1e1e1e',
                surface: '#2a2a2a',
                border: '#404040',
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            }
        };
        
        return colors[theme] || colors.dark;
    }
    
    /**
     * Get CSS custom property value
     */
    getCSSProperty(property, fallback = '') {
        try {
            return getComputedStyle(document.documentElement)
                .getPropertyValue(property).trim() || fallback;
        } catch (error) {
            console.warn(`⚠️ Failed to get CSS property ${property}:`, error);
            return fallback;
        }
    }
    
    /**
     * Set CSS custom property
     */
    setCSSProperty(property, value) {
        try {
            document.documentElement.style.setProperty(property, value);
        } catch (error) {
            console.warn(`⚠️ Failed to set CSS property ${property}:`, error);
        }
    }
    
    /**
     * Event emitter methods
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Error in theme event handler for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.state.currentTheme;
    }
    
    /**
     * Get theme state information
     */
    getState() {
        return {
            currentTheme: this.state.currentTheme,
            systemTheme: this.state.systemTheme,
            userPreference: this.state.userPreference,
            isInitialized: this.state.isInitialized,
            version: this.VERSION
        };
    }
    
    /**
     * Destroy theme manager
     */
    destroy() {
        console.log('🗑️ Destroying ThemeManager...');
        
        // Remove system theme listener
        if (this.state.mediaQuery) {
            this.state.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
        }
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        // Reset state
        this.state.isInitialized = false;
        
        console.log('✅ ThemeManager destroyed');
    }
    
    /**
     * Debug method to check theme state
     */
    debugTheme() {
        const root = document.documentElement;
        const currentTheme = this.getCurrentTheme();
        const computedBg = getComputedStyle(root).getPropertyValue('--fh-bg-primary').trim();
        const computedText = getComputedStyle(root).getPropertyValue('--fh-text-primary').trim();
        
        console.group('🔍 Theme Debug Information');
        console.log('Current Theme:', currentTheme);
        console.log('HTML data-theme:', root.getAttribute('data-theme'));
        console.log('HTML classes:', root.className);
        console.log('State:', this.state);
        console.log('Computed --fh-bg-primary:', computedBg);
        console.log('Computed --fh-text-primary:', computedText);
        console.log('LocalStorage theme:', localStorage.getItem(this.config.storageKey));
        console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);
        console.groupEnd();
        
        return {
            currentTheme,
            dataTheme: root.getAttribute('data-theme'),
            classes: root.className,
            state: this.state,
            computedBg,
            computedText,
            localStorage: localStorage.getItem(this.config.storageKey),
            systemPrefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches
        };
    }
}

// Export and initialize
if (typeof window !== 'undefined') {
    // Create a single instance
    const themeManagerInstance = new ThemeManager();
    
    // Make it available as both ThemeManager (class) and themeManager (instance)
    window.ThemeManager = ThemeManager;
    window.themeManager = themeManagerInstance;

    // BEGIN Legacy bridge – expose singleton methods on window.ThemeManager for backwards compatibility
    // Keep original class reference for modern codebases
    window.ThemeManagerClass = ThemeManager;

    const _legacyBridgeMethods = [
        'init',
        'setTheme',
        'toggleTheme',
        'clearUserPreference',
        'getCurrentTheme',
        'getThemeColors',
        'getCSSProperty',
        'setCSSProperty',
        'on',
        'off',
        'debugTheme',
        'getState'
    ];

    _legacyBridgeMethods.forEach(methodName => {
        if (typeof window.ThemeManager[methodName] === 'undefined') {
            window.ThemeManager[methodName] = (...args) => themeManagerInstance[methodName](...args);
        }
    });
    // END Legacy bridge

    console.log('✅ ThemeManager: Class, instance and legacy bridge exported to window');
    
    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            themeManagerInstance.init().catch(console.error);
        });
    } else {
        // DOM already ready, initialize immediately
        themeManagerInstance.init().catch(console.error);
    }
}

// ES6 Export
export { ThemeManager };
export default window.themeManager; 