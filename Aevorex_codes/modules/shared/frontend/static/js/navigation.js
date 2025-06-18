/**
 * AEVOREX Enterprise Navigation System
 * Központi navigációs rendszer az összes modulhoz
 */

class AevorexNavigation {
    constructor() {
        this.modules = {
            mainpage: { port: 3000, name: 'Main Platform', icon: '🏠' },
            financehub: { port: 8000, name: 'Finance HUB', icon: '📊' },
            healthhub: { port: 3001, name: 'Health HUB', icon: '🏥' },
            contenthub: { port: 3002, name: 'Content HUB', icon: '📝' },
            aihub: { port: 3003, name: 'AI HUB', icon: '🤖' }
        };
        
        this.currentModule = this.detectCurrentModule();
        this.init();
    }

    detectCurrentModule() {
        const port = window.location.port;
        for (const [key, module] of Object.entries(this.modules)) {
            if (module.port == port || (port === '' && key === 'mainpage')) {
                return key;
            }
        }
        return 'mainpage';
    }

    init() {
        this.setupThemeToggle();
        this.setupModuleNavigation();
        this.setupStatusIndicators();
        this.loadSharedComponents();
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('aevorex-theme', newTheme);
                
                // Update icon
                const icon = themeToggle.querySelector('.theme-icon');
                if (icon) {
                    icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                }
            });

            // Load saved theme
            const savedTheme = localStorage.getItem('aevorex-theme') || 'dark';
            document.body.setAttribute('data-theme', savedTheme);
            const icon = themeToggle.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
            }
        }
    }

    setupModuleNavigation() {
        // Add module status checking
        this.checkModuleStatus();
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1': this.navigateToModule('mainpage'); e.preventDefault(); break;
                    case '2': this.navigateToModule('financehub'); e.preventDefault(); break;
                    case '3': this.navigateToModule('healthhub'); e.preventDefault(); break;
                    case '4': this.navigateToModule('contenthub'); e.preventDefault(); break;
                    case '5': this.navigateToModule('aihub'); e.preventDefault(); break;
                }
            }
        });
    }

    navigateToModule(moduleName) {
        const module = this.modules[moduleName];
        if (module) {
            const url = moduleName === 'mainpage' 
                ? `http://localhost:${module.port}` 
                : `http://localhost:${module.port}`;
            window.open(url, '_blank');
        }
    }

    async checkModuleStatus() {
        const statusIndicators = document.querySelectorAll('.module-status');
        
        for (const [moduleName, module] of Object.entries(this.modules)) {
            try {
                const response = await fetch(`http://localhost:${module.port}`, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                
                // Update status indicator if exists
                const indicator = document.querySelector(`[data-module="${moduleName}"] .status-dot`);
                if (indicator) {
                    indicator.classList.add('status--online');
                    indicator.classList.remove('status--offline');
                }
            } catch (error) {
                const indicator = document.querySelector(`[data-module="${moduleName}"] .status-dot`);
                if (indicator) {
                    indicator.classList.add('status--offline');
                    indicator.classList.remove('status--online');
                }
            }
        }
    }

    setupStatusIndicators() {
        // Add status dots to navigation items
        const navLinks = document.querySelectorAll('.nav__link');
        navLinks.forEach(link => {
            if (!link.querySelector('.status-dot')) {
                const statusDot = document.createElement('span');
                statusDot.className = 'status-dot';
                link.appendChild(statusDot);
            }
        });
    }

    loadSharedComponents() {
        // Load footer if needed
        this.loadFooter();
        
        // Load common page elements
        this.loadBreadcrumbs();
    }

    loadFooter() {
        const footerContainer = document.querySelector('#shared-footer');
        if (footerContainer) {
            footerContainer.innerHTML = this.getFooterHTML();
        }
    }

    loadBreadcrumbs() {
        const breadcrumbContainer = document.querySelector('.breadcrumbs');
        if (breadcrumbContainer) {
            const currentModuleName = this.modules[this.currentModule]?.name || 'Platform';
            breadcrumbContainer.innerHTML = `
                <a href="http://localhost:3000">AEVOREX</a>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-current">${currentModuleName}</span>
            `;
        }
    }

    getFooterHTML() {
        return `
        <footer class="footer">
            <div class="container">
                <div class="footer__content">
                    <div class="footer__section">
                        <h4>Platform</h4>
                        <ul>
                            <li><a href="/modules/shared/frontend/static/pages/about.html">Rólunk</a></li>
                            <li><a href="/modules/shared/frontend/static/pages/contact.html">Kapcsolat</a></li>
                            <li><a href="/modules/shared/frontend/static/pages/data-sources.html">Adatforrások</a></li>
                        </ul>
                    </div>
                    <div class="footer__section">
                        <h4>Jogi</h4>
                        <ul>
                            <li><a href="/modules/shared/frontend/static/pages/terms.html">Felhasználási Feltételek</a></li>
                            <li><a href="/modules/shared/frontend/static/pages/privacy.html">Adatvédelmi Irányelvek</a></li>
                            <li><a href="/modules/shared/frontend/static/pages/disclaimer.html">Jogi Nyilatkozat</a></li>
                        </ul>
                    </div>
                    <div class="footer__section">
                        <h4>Támogatás</h4>
                        <ul>
                            <li><a href="#help">Súgó Központ</a></li>
                            <li><a href="#docs">Dokumentáció</a></li>
                            <li><a href="#api">API Referencia</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer__bottom">
                    <p>&copy; 2024 AEVOREX Enterprise Platform. Minden jog fenntartva.</p>
                </div>
            </div>
        </footer>
        `;
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aevorexNav = new AevorexNavigation();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AevorexNavigation;
} 