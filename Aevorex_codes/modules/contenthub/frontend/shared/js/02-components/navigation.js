/**
 * ContentHub Navigation Manager
 * Handles navigation between different content modules
 */

class NavigationManager {
    constructor() {
        this.currentPage = window.location.pathname;
        this.init();
        console.log('🧭 Navigation initialized');
    }

    init() {
        this.setupNavigation();
        this.setupBreadcrumbs();
        this.setupMobileMenu();
        this.highlightCurrentPage();
    }

    setupNavigation() {
        // Handle all navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link, .nav-item a')) {
                this.handleNavClick(e);
            }
        });

        // Handle back/forward browser navigation
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });
    }

    handleNavClick(e) {
        const link = e.target;
        const href = link.getAttribute('href');
        
        // Skip external links and anchors
        if (!href || href.startsWith('http') || href.startsWith('#')) {
            return;
        }

        e.preventDefault();
        this.navigate(href);
    }

    navigate(url) {
        // Add loading state to current page
        document.body.classList.add('page-loading');

        // Update browser history
        window.history.pushState({ url }, '', url);
        
        // Update current page
        this.currentPage = url;
        
        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('contenthub:navigate', {
            detail: { url }
        }));

        // Navigate after short delay for UX
        setTimeout(() => {
            window.location.href = url;
        }, 150);
    }

    handlePopState(e) {
        if (e.state && e.state.url) {
            this.currentPage = e.state.url;
            this.highlightCurrentPage();
        }
    }

    setupBreadcrumbs() {
        const breadcrumbContainer = document.querySelector('.breadcrumbs');
        if (!breadcrumbContainer) return;

        const pathSegments = this.currentPage.split('/').filter(segment => segment);
        const breadcrumbs = this.generateBreadcrumbs(pathSegments);
        
        breadcrumbContainer.innerHTML = breadcrumbs;
    }

    generateBreadcrumbs(segments) {
        let breadcrumbsHTML = '<a href="/" class="breadcrumb-item">Home</a>';
        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += '/' + segment;
            const isLast = index === segments.length - 1;
            const displayName = this.formatSegmentName(segment);

            if (isLast) {
                breadcrumbsHTML += `<span class="breadcrumb-separator">></span>
                                  <span class="breadcrumb-current">${displayName}</span>`;
            } else {
                breadcrumbsHTML += `<span class="breadcrumb-separator">></span>
                                  <a href="${currentPath}" class="breadcrumb-item">${displayName}</a>`;
            }
        });

        return breadcrumbsHTML;
    }

    formatSegmentName(segment) {
        return segment
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-nav');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
        }
    }

    toggleMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-nav');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (mobileMenu.classList.contains('nav--open')) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-nav');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        mobileMenu.classList.add('nav--open');
        menuToggle.classList.add('toggle--active');
        document.body.classList.add('nav-open');
    }

    closeMobileMenu() {
        const mobileMenu = document.querySelector('.mobile-nav');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        mobileMenu.classList.remove('nav--open');
        menuToggle.classList.remove('toggle--active');
        document.body.classList.remove('nav-open');
    }

    highlightCurrentPage() {
        // Remove existing active states
        document.querySelectorAll('.nav-link, .nav-item a').forEach(link => {
            link.classList.remove('nav--active');
        });

        // Add active state to current page
        const currentLink = document.querySelector(`[href="${this.currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add('nav--active');
            
            // Also highlight parent menu item if exists
            const parentNav = currentLink.closest('.nav-dropdown');
            if (parentNav) {
                const parentLink = parentNav.querySelector('.dropdown-toggle');
                if (parentLink) {
                    parentLink.classList.add('nav--active');
                }
            }
        }
    }

    // Public methods
    getCurrentPage() {
        return this.currentPage;
    }

    isCurrentPage(url) {
        return this.currentPage === url;
    }

    addNavItem(item) {
        const nav = document.querySelector('.main-nav');
        if (nav) {
            const navItem = document.createElement('li');
            navItem.className = 'nav-item';
            navItem.innerHTML = `<a href="${item.url}" class="nav-link">${item.title}</a>`;
            nav.appendChild(navItem);
        }
    }
}

// Initialize and export
const navigation = new NavigationManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.Navigation = navigation;

export default navigation; 