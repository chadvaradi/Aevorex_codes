/**
 * ContentHub Router Manager
 * Handles client-side navigation and routing
 */

class ContentHubRouterManager {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
        console.log('🗺️ Router Manager initialized');
    }

    init() {
        this.setupEventListeners();
        this.handleInitialRoute();
    }

    setupEventListeners() {
        // Handle back/forward browser navigation
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname + window.location.search);
        });

        // Handle internal link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                e.preventDefault();
                this.navigate(link.href);
            }
        });
    }

    isInternalLink(href) {
        try {
            const url = new URL(href, window.location.origin);
            return url.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    navigate(path, pushState = true) {
        if (pushState) {
            history.pushState(null, '', path);
        }
        this.handleRoute(path);
    }

    handleRoute(path) {
        const url = new URL(path, window.location.origin);
        const pathname = url.pathname;
        
        this.currentRoute = {
            path: pathname,
            search: url.search,
            hash: url.hash,
            params: this.extractParams(pathname),
            query: this.extractQuery(url.search)
        };

        // Dispatch route change event
        window.dispatchEvent(new CustomEvent('contenthub:route-changed', {
            detail: { route: this.currentRoute }
        }));

        console.log('🗺️ Route changed:', this.currentRoute);
    }

    handleInitialRoute() {
        this.handleRoute(window.location.pathname + window.location.search + window.location.hash);
    }

    extractParams(pathname) {
        // Simple parameter extraction for paths like /content/:id
        const params = {};
        // This could be extended for more complex routing
        return params;
    }

    extractQuery(search) {
        const params = new URLSearchParams(search);
        const query = {};
        for (const [key, value] of params) {
            query[key] = value;
        }
        return query;
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Initialize and export
const routerManager = new ContentHubRouterManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.RouterManager = routerManager;

export default routerManager; 