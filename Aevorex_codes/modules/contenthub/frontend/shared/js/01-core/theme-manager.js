/**
 * ContentHub Theme Manager
 * Handles dark/light theme switching and persistence
 */

class ContentHubThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('contenthub-theme') || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        console.log('🎨 Theme Manager initialized:', this.currentTheme);
    }

    applyTheme(theme) {
        // Ensure theme is valid
        if (!theme || (theme !== 'light' && theme !== 'dark')) {
            theme = 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme); // Also set on body for compatibility
        this.currentTheme = theme;
        localStorage.setItem('contenthub-theme', theme);
        
        // Update theme toggle button if exists
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.setAttribute('data-theme', theme);
        }
        
        console.log(`🎨 Theme applied: ${theme}`);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('contenthub:theme-changed', {
            detail: { theme: newTheme }
        }));
    }

    setupThemeToggle() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]') || e.target.closest('[data-theme-toggle]')) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    // Method for debug testing
    isThemeApplied() {
        const htmlTheme = document.documentElement.getAttribute('data-theme');
        const bodyTheme = document.body.getAttribute('data-theme');
        return htmlTheme === this.currentTheme || bodyTheme === this.currentTheme;
    }
}

// Initialize and export
const themeManager = new ContentHubThemeManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.ThemeManager = themeManager;

export default themeManager; 