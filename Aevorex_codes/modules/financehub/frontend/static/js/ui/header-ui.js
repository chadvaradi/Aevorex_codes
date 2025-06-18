/**
 * ===================================================================
 * HEADER UI COMPONENT
 * Handles DOM manipulation and visual effects for the header
 * Extracted from HeaderManager for better separation of concerns
 * ===================================================================
 */

class HeaderUI {
    constructor(headerElement) {
        this.header = headerElement;
        this.searchInput = null;
        this.searchResults = null;
        this.themeToggle = null;
        this.mobileMenuToggle = null;
        this.mobileMenu = null;
        
        this.isScrolled = false;
        this.lastScrollY = 0;
        this.scrollThreshold = 50;
        
        this.init();
    }

    /**
     * Initialize UI components
     */
    init() {
        this.findElements();
        this.setupScrollEffects();
        this.setupMobileMenu();
        this.setupAnimations();
    }

    /**
     * Find and cache DOM elements
     */
    findElements() {
        if (!this.header) return;

        this.searchInput = this.header.querySelector('.search-input');
        this.searchResults = this.header.querySelector('.search-results');
        this.themeToggle = this.header.querySelector('.theme-toggle');
        this.mobileMenuToggle = this.header.querySelector('.mobile-menu-toggle');
        this.mobileMenu = this.header.querySelector('.mobile-menu');
    }

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = window.scrollY;
            
            // Add/remove scrolled class
            if (currentScrollY > this.scrollThreshold && !this.isScrolled) {
                this.isScrolled = true;
                this.header.classList.add('scrolled');
                this.animateHeaderScroll(true);
            } else if (currentScrollY <= this.scrollThreshold && this.isScrolled) {
                this.isScrolled = false;
                this.header.classList.remove('scrolled');
                this.animateHeaderScroll(false);
            }

            // Hide/show header on scroll direction
            if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
                // Scrolling down
                this.header.classList.add('header-hidden');
            } else {
                // Scrolling up
                this.header.classList.remove('header-hidden');
            }

            this.lastScrollY = currentScrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /**
     * Animate header scroll state
     */
    animateHeaderScroll(isScrolled) {
        const logo = this.header.querySelector('.logo');
        const nav = this.header.querySelector('.nav');

        if (isScrolled) {
            // Compact header
            if (logo) {
                logo.style.transform = 'scale(0.9)';
                logo.style.transition = 'transform 0.3s ease';
            }
            if (nav) {
                nav.style.transform = 'translateY(-2px)';
                nav.style.transition = 'transform 0.3s ease';
            }
        } else {
            // Full header
            if (logo) {
                logo.style.transform = 'scale(1)';
            }
            if (nav) {
                nav.style.transform = 'translateY(0)';
            }
        }
    }

    /**
     * Setup mobile menu
     */
    setupMobileMenu() {
        if (!this.mobileMenuToggle || !this.mobileMenu) return;

        this.mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.header.contains(e.target) && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const isActive = this.mobileMenu.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.mobileMenu.classList.add('active');
        this.mobileMenuToggle.classList.add('active');
        document.body.classList.add('mobile-menu-open');
        
        // Animate menu items
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
            item.classList.add('animate-in');
        });
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.mobileMenu.classList.remove('active');
        this.mobileMenuToggle.classList.remove('active');
        document.body.classList.remove('mobile-menu-open');
        
        // Remove animation classes
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach(item => {
            item.classList.remove('animate-in');
            item.style.animationDelay = '';
        });
    }

    /**
     * Setup animations
     */
    setupAnimations() {
        // Add hover effects to navigation items
        const navItems = this.header.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.transform = 'translateY(-2px)';
                item.style.transition = 'transform 0.2s ease';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateY(0)';
            });
        });

        // Add ripple effect to buttons
        const buttons = this.header.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            button.addEventListener('click', this.createRippleEffect.bind(this));
        });
    }

    /**
     * Create ripple effect
     */
    createRippleEffect(e) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * Show search results
     */
    showSearchResults(results) {
        if (!this.searchResults) return;

        this.searchResults.innerHTML = '';
        this.searchResults.classList.add('active');

        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        results.forEach((result, index) => {
            const resultElement = this.createSearchResultElement(result, index);
            this.searchResults.appendChild(resultElement);
        });

        // Animate results
        this.animateSearchResults();
    }

    /**
     * Create search result element
     */
    createSearchResultElement(result, index) {
        const element = document.createElement('div');
        element.className = 'search-result-item';
        element.style.animationDelay = `${index * 0.05}s`;
        
        element.innerHTML = `
            <div class="result-symbol">${result.symbol}</div>
            <div class="result-name">${result.name}</div>
            <div class="result-price">$${result.price}</div>
            <div class="result-change ${result.change >= 0 ? 'positive' : 'negative'}">
                ${result.change >= 0 ? '+' : ''}${result.change}%
            </div>
        `;

        element.addEventListener('click', () => {
            this.selectSearchResult(result);
        });

        return element;
    }

    /**
     * Animate search results
     */
    animateSearchResults() {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        items.forEach(item => {
            item.classList.add('animate-in');
        });
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        if (!this.searchResults) return;
        
        this.searchResults.classList.remove('active');
        setTimeout(() => {
            this.searchResults.innerHTML = '';
        }, 300);
    }

    /**
     * Select search result
     */
    selectSearchResult(result) {
        if (this.searchInput) {
            this.searchInput.value = result.symbol;
        }
        this.hideSearchResults();
        
        // Emit custom event
        const event = new CustomEvent('search:select', {
            detail: { result }
        });
        this.header.dispatchEvent(event);
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
        this.searchResults.classList.add('active');
    }

    /**
     * Update theme toggle
     */
    updateThemeToggle(isDark) {
        if (!this.themeToggle) return;
        
        const icon = this.themeToggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        this.themeToggle.setAttribute('aria-label', 
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
        );
    }

    /**
     * Set search input value
     */
    setSearchValue(value) {
        if (this.searchInput) {
            this.searchInput.value = value;
        }
    }

    /**
     * Get search input value
     */
    getSearchValue() {
        return this.searchInput ? this.searchInput.value : '';
    }

    /**
     * Focus search input
     */
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.hideSearchResults();
    }

    /**
     * Add event listener to search input
     */
    onSearchInput(callback) {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', callback);
        }
    }

    /**
     * Add event listener to theme toggle
     */
    onThemeToggle(callback) {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', callback);
        }
    }

    /**
     * Destroy UI component
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.onScroll);
        
        // Clear animations
        const animatedElements = this.header.querySelectorAll('[style*="animation"]');
        animatedElements.forEach(el => {
            el.style.animation = '';
        });
    }
}

// Make globally accessible
if (typeof window !== 'undefined') {
    window.HeaderUI = HeaderUI;
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        HeaderUI: HeaderUI,
        default: HeaderUI
    };
}

// ES6 Export
export { HeaderUI };
export default HeaderUI;

console.log('✅ HeaderUI class exported successfully (CommonJS + ES6 + Global)'); 