/**
 * ===================================================================
 * FOOTER COMPONENT
 * Premium Footer with Dynamic Content and Interactions
 * ===================================================================
 */

class FooterManager {
    constructor() {
        this.footerElement = null;
        this.currentYear = new Date().getFullYear();
        this.isInitialized = false;
        this.observers = new Map();
        
        this.init();
    }

    /**
     * Initialize footer component
     */
    init() {
        try {
            this.footerElement = document.querySelector('.app-footer');
            
            // Retry logic: footer may not yet be in DOM when script executes (e.g., loaded dynamically)
            if (!this.footerElement) {
                // Only log once at debug level
                console.warn('Footer element not found – will retry after DOMContentLoaded');

                // If DOM still loading, wait for DOMContentLoaded then retry
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.init(), { once: true });
                } else {
                    // Fallback: small timeout to allow dynamic insertion
                    setTimeout(() => this.init(), 300);
                }
                return;
            }

            this.setupFooterContent();
            this.bindEvents();
            this.initializeAnimations();
            this.updateCopyright();
            
            this.isInitialized = true;
            console.log('✅ Footer Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Footer Manager initialization failed:', error);
        }
    }

    /**
     * Setup dynamic footer content
     */
    setupFooterContent() {
        const footerData = {
            platform: {
                title: 'Platform',
                links: [
                    { text: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
                    { text: 'Portfolio', href: '/portfolio', icon: 'portfolio' },
                    { text: 'Watchlist', href: '/watchlist', icon: 'watchlist' }
                ]
            },
            tools: {
                title: 'Tools',
                links: [
                    { text: 'Stock Screener', href: '/screener', icon: 'filter' },
                    { text: 'Market Scanner', href: '/scanner', icon: 'scan' },
                    { text: 'Risk Calculator', href: '/risk', icon: 'calculator' },
                    { text: 'API Access', href: '/api', icon: 'api' }
                ]
            },
            company: {
                title: 'Company',
                links: [
                    { text: 'About Us', href: '/about', icon: 'info' },
                    { text: 'Careers', href: '/careers', icon: 'work' },
                    { text: 'Press', href: '/press', icon: 'news' },
                    { text: 'Contact', href: '/contact', icon: 'contact' }
                ]
            },
            legal: {
                title: 'Legal',
                links: [
                    { text: 'Privacy Policy', href: '/privacy', icon: 'privacy' },
                    { text: 'Terms of Service', href: '/terms', icon: 'terms' },
                    { text: 'Cookie Policy', href: '/cookies', icon: 'cookie' },
                    { text: 'Disclaimer', href: '/disclaimer', icon: 'warning' }
                ]
            }
        };

        this.renderFooterSections(footerData);
    }

    /**
     * Render footer sections dynamically
     */
    renderFooterSections(data) {
        const footerGrid = this.footerElement.querySelector('.footer-grid');
        
        if (!footerGrid) return;

        footerGrid.innerHTML = '';

        Object.entries(data).forEach(([key, section]) => {
            const sectionElement = this.createFooterSection(section);
            footerGrid.appendChild(sectionElement);
        });
    }

    /**
     * Create individual footer section
     */
    createFooterSection(section) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'footer-section';

        const title = document.createElement('h4');
        title.className = 'footer-section-title';
        title.textContent = section.title;

        const linksList = document.createElement('ul');
        linksList.className = 'footer-links';

        section.links.forEach(link => {
            const listItem = document.createElement('li');
            const anchor = document.createElement('a');
            
            anchor.href = link.href;
            anchor.className = 'footer-link';
            anchor.textContent = link.text;
            
            // Add icon if specified
            if (link.icon) {
                const icon = document.createElement('span');
                icon.className = `footer-link-icon icon-${link.icon}`;
                anchor.prepend(icon);
            }

            listItem.appendChild(anchor);
            linksList.appendChild(listItem);
        });

        sectionDiv.appendChild(title);
        sectionDiv.appendChild(linksList);

        return sectionDiv;
    }

    /**
     * Bind footer events
     */
    bindEvents() {
        // Link hover effects
        this.footerElement.addEventListener('mouseenter', this.handleLinkHover.bind(this), true);
        this.footerElement.addEventListener('mouseleave', this.handleLinkLeave.bind(this), true);
        
        // Newsletter subscription
        const newsletterForm = this.footerElement.querySelector('.newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', this.handleNewsletterSubmit.bind(this));
        }

        // Social media links
        const socialLinks = this.footerElement.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', this.handleSocialClick.bind(this));
        });

        // Back to top button
        const backToTopBtn = this.footerElement.querySelector('.back-to-top');
        if (backToTopBtn) {
            backToTopBtn.addEventListener('click', this.scrollToTop.bind(this));
        }
    }

    /**
     * Handle link hover effects
     */
    handleLinkHover(event) {
        if (event.target.classList.contains('footer-link')) {
            event.target.style.transform = 'translateX(4px)';
            event.target.style.color = 'var(--premium-gold-accent)';
        }
    }

    /**
     * Handle link leave effects
     */
    handleLinkLeave(event) {
        if (event.target.classList.contains('footer-link')) {
            event.target.style.transform = 'translateX(0)';
            event.target.style.color = '';
        }
    }

    /**
     * Handle newsletter subscription
     */
    async handleNewsletterSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const emailInput = form.querySelector('input[type="email"]');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (!emailInput || !emailInput.value) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Subscribing...';
        submitBtn.disabled = true;

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showNotification('Successfully subscribed to newsletter!', 'success');
            emailInput.value = '';
            
        } catch (error) {
            this.showNotification('Subscription failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    /**
     * Handle social media link clicks
     */
    handleSocialClick(event) {
        const platform = event.currentTarget.dataset.platform;
        
        // Track social media engagement
        if (window.analytics) {
            window.analytics.track('social_link_clicked', {
                platform: platform,
                location: 'footer'
            });
        }
        
        console.log(`Social link clicked: ${platform}`);
    }

    /**
     * Smooth scroll to top
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Track back to top usage
        if (window.analytics) {
            window.analytics.track('back_to_top_clicked', {
                location: 'footer'
            });
        }
    }

    /**
     * Initialize footer animations
     */
    initializeAnimations() {
        // Intersection Observer for footer reveal
        const footerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('footer-visible');
                    this.animateFooterSections();
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        footerObserver.observe(this.footerElement);
        this.observers.set('footer', footerObserver);
    }

    /**
     * Animate footer sections on reveal
     */
    animateFooterSections() {
        const sections = this.footerElement.querySelectorAll('.footer-section');
        
        sections.forEach((section, index) => {
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Update copyright year
     */
    updateCopyright() {
        const copyrightElement = this.footerElement.querySelector('.copyright-year');
        if (copyrightElement) {
            copyrightElement.textContent = this.currentYear;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('notification-show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get footer statistics
     */
    getFooterStats() {
        return {
            isInitialized: this.isInitialized,
            sectionsCount: this.footerElement?.querySelectorAll('.footer-section').length || 0,
            linksCount: this.footerElement?.querySelectorAll('.footer-link').length || 0,
            observersActive: this.observers.size
        };
    }

    /**
     * Cleanup footer component
     */
    destroy() {
        // Remove event listeners
        if (this.footerElement) {
            this.footerElement.removeEventListener('mouseenter', this.handleLinkHover);
            this.footerElement.removeEventListener('mouseleave', this.handleLinkLeave);
        }

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        this.isInitialized = false;
        console.log('Footer Manager destroyed');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.FooterManager = new FooterManager();
    });
} else {
    window.FooterManager = new FooterManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FooterManager;
}

// ES6 export for modern modules (Added for structural consistency)
export { FooterManager };
export default FooterManager;

console.log('✅ FooterManager exported successfully (CommonJS + ES6 + Global)'); 