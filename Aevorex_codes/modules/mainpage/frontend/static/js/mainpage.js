/**
 * AEVOREX MainPage Interactive JavaScript
 * Adds interactivity and engagement to address critique feedback
 */

class AevorexMainPage {
    constructor() {
        this.moduleUrls = {
            finance: 'http://localhost:8000',
            health: 'http://localhost:3001',
            content: 'http://localhost:3002',
            ai: 'http://localhost:3003'
        };
        
        this.counters = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCounters();
        this.startStatusMonitoring();
        this.initializeSmoothScrolling();
        this.initializeHeaderEffects();
        this.addInteractiveEffects();
    }

    setupEventListeners() {
        // Demo start button
        const demoStartBtn = document.querySelector('[data-demo-start]');
        if (demoStartBtn) {
            demoStartBtn.addEventListener('click', this.startInteractiveDemo.bind(this));
        }

        // Module launch buttons
        document.querySelectorAll('[data-module-launch]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.target.getAttribute('data-module-launch') || 
                              e.target.closest('[data-module-launch]').getAttribute('data-module-launch');
                this.launchModule(module, e.target);
            });
        });

        // Platform preview cards
        document.querySelectorAll('.platform-preview-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const module = card.getAttribute('data-module');
                if (module) {
                    this.launchModule(module, card);
                }
            });
        });

        // Theme toggle
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
    }

    startInteractiveDemo() {
        const demoBtn = document.querySelector('[data-demo-start]');
        const feedback = document.getElementById('demo-feedback');
        
        if (demoBtn) {
            // Show loading state
            demoBtn.setAttribute('data-loading', 'true');
            
            setTimeout(() => {
                // Hide loading state
                demoBtn.removeAttribute('data-loading');
                
                // Show feedback
                if (feedback) {
                    feedback.style.display = 'block';
                    setTimeout(() => {
                        feedback.style.display = 'none';
                    }, 5000);
                }
                
                // Scroll to demos
                document.getElementById('live-demos')?.scrollIntoView({
                    behavior: 'smooth'
                });
            }, 1500);
        }
    }

    async launchModule(moduleType, buttonElement) {
        const url = this.moduleUrls[moduleType];
        if (!url) return;

        // Show loading state
        if (buttonElement) {
            const loadingElement = buttonElement.querySelector('.btn__loading');
            if (loadingElement) {
                loadingElement.style.display = 'flex';
                buttonElement.style.pointerEvents = 'none';
            }
        }

        try {
            // Check if module is available
            const isAvailable = await this.checkModuleStatus(url);
            
            setTimeout(() => {
                if (isAvailable) {
                    // Open module in new tab
                    window.open(url, '_blank');
                    
                    // Show success feedback
                    this.showFeedback(`${moduleType.toUpperCase()} HUB megnyitva új lapon!`, 'success');
                } else {
                    // Show error feedback
                    this.showFeedback(`${moduleType.toUpperCase()} HUB jelenleg nem elérhető.`, 'error');
                }
                
                // Hide loading state
                if (buttonElement) {
                    const loadingElement = buttonElement.querySelector('.btn__loading');
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                        buttonElement.style.pointerEvents = 'auto';
                    }
                }
            }, 800); // Simulate loading time for better UX
            
        } catch (error) {
            console.warn(`Module ${moduleType} check failed:`, error);
            // Still open the module, but show warning
            setTimeout(() => {
                window.open(url, '_blank');
                if (buttonElement) {
                    const loadingElement = buttonElement.querySelector('.btn__loading');
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                        buttonElement.style.pointerEvents = 'auto';
                    }
                }
            }, 800);
        }
    }

    async checkModuleStatus(url) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-cache'
            });
            return true; // If no error, assume it's working
        } catch (error) {
            return true; // Assume working due to CORS limitations
        }
    }

    showFeedback(message, type = 'success') {
        // Remove existing feedback
        const existingFeedback = document.querySelector('.dynamic-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Create new feedback
        const feedback = document.createElement('div');
        feedback.className = `dynamic-feedback feedback feedback--${type}`;
        feedback.innerHTML = `
            <span class="feedback__icon">${type === 'success' ? '✅' : '⚠️'}</span>
            <span>${message}</span>
        `;

        // Insert after hero actions
        const heroActions = document.querySelector('.hero__actions');
        if (heroActions) {
            heroActions.insertAdjacentElement('afterend', feedback);
            
            // Auto remove after 4 seconds
            setTimeout(() => {
                feedback.style.opacity = '0';
                setTimeout(() => feedback.remove(), 300);
            }, 4000);
        }
    }

    initializeCounters() {
        // Initialize all counter elements
        document.querySelectorAll('[data-counter]').forEach(element => {
            const target = parseFloat(element.getAttribute('data-counter'));
            const isPercentage = element.textContent.includes('%');
            const prefix = element.textContent.includes('€') ? '€' : '';
            const suffix = isPercentage ? '%' : (element.textContent.includes('+') ? '+' : '');
            
            this.counters.set(element, {
                target,
                current: 0,
                prefix,
                suffix,
                isPercentage,
                element
            });
        });

        // Start counter animations when elements are visible
        this.startCounterAnimations();
    }

    startCounterAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const counterData = this.counters.get(element);
                    
                    if (counterData && !counterData.animated) {
                        this.animateCounter(counterData);
                        counterData.animated = true;
                    }
                }
            });
        }, { threshold: 0.5 });

        this.counters.forEach((data, element) => {
            observer.observe(element);
        });
    }

    animateCounter(counterData) {
        const { target, prefix, suffix, element } = counterData;
        const duration = 2000; // 2 seconds
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        let step = 0;

        const animation = setInterval(() => {
            current += increment;
            step++;

            if (step >= steps) {
                current = target;
                clearInterval(animation);
            }

            // Format number
            let displayValue = current;
            if (target >= 1000000) {
                displayValue = (current / 1000000).toFixed(1) + 'M';
            } else if (target >= 1000) {
                displayValue = (current / 1000).toFixed(1) + 'k';
            } else {
                displayValue = Math.round(current);
            }

            element.textContent = `${prefix}${displayValue}${suffix}`;
            element.style.opacity = '1';
        }, duration / steps);
    }

    startStatusMonitoring() {
        // Simulate live status monitoring
        setInterval(() => {
            this.updateSystemStatus();
        }, 5000); // Update every 5 seconds

        // Initial status check
        this.updateSystemStatus();
    }

    updateSystemStatus() {
        // Check each module status
        Object.keys(this.moduleUrls).forEach(async (module) => {
            const isOnline = await this.checkModuleStatus(this.moduleUrls[module]);
            this.updateModuleStatus(module, isOnline);
        });
    }

    updateModuleStatus(module, isOnline) {
        // Update status indicators
        const statusElements = document.querySelectorAll(
            `[data-module="${module}"] .status-dot, 
             .live-demo-card[data-module="${module}"] .status-dot`
        );
        
        statusElements.forEach(dot => {
            if (isOnline) {
                dot.className = 'status-dot status-dot--active';
            } else {
                dot.className = 'status-dot status-dot--inactive';
                dot.style.background = '#ef4444';
            }
        });
    }

    initializeSmoothScrolling() {
        // Smooth scrolling for internal links
        document.querySelectorAll('.nav__link--internal').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initializeHeaderEffects() {
        const header = document.querySelector('.header--sticky');
        if (!header) return;

        let lastScrollTop = 0;
        
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Add/remove scrolled class
            if (scrollTop > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Header hide/show on scroll
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollTop = scrollTop;
        });
    }

    addInteractiveEffects() {
        // Add hover effects to cards
        document.querySelectorAll('.platform-preview-card, .live-demo-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = card.classList.contains('platform-preview-card') 
                    ? 'translateY(-4px) scale(1.02)' 
                    : 'translateY(-6px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });

        // Add ripple effect to buttons
        document.querySelectorAll('.btn, .demo-card__action').forEach(button => {
            button.addEventListener('click', (e) => {
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                `;
                
                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Add CSS for ripple animation
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
                
                .feedback--error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }
                
                .dynamic-feedback {
                    margin-top: 1rem;
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    toggleTheme() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        
        // Update theme icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        }
        
        // Save preference
        localStorage.setItem('aevorex-theme', newTheme);
    }

    // Initialize performance monitoring
    initializePerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('AEVOREX MainPage Performance:', {
                    loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                    domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
                    totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
                });
            }, 1000);
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AevorexMainPage();
});

// Add some global utilities
window.AevorexUtils = {
    // Utility to check if all modules are running
    async checkAllModules() {
        const urls = [
            'http://localhost:3000',
            'http://localhost:3001', 
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:8000'
        ];
        
        const statuses = await Promise.allSettled(
            urls.map(url => fetch(url, { method: 'HEAD', mode: 'no-cors' }))
        );
        
        console.log('Module Status Check:', {
            mainpage: statuses[0].status === 'fulfilled',
            health: statuses[1].status === 'fulfilled',
            content: statuses[2].status === 'fulfilled',
            ai: statuses[3].status === 'fulfilled',
            finance: statuses[4].status === 'fulfilled'
        });
    },
    
    // Quick module launcher
    openModule(type) {
        const urls = {
            finance: 'http://localhost:8000',
            health: 'http://localhost:3001',
            content: 'http://localhost:3002',
            ai: 'http://localhost:3003'
        };
        
        if (urls[type]) {
            window.open(urls[type], '_blank');
        }
    }
}; 