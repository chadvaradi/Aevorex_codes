/**
 * ContentHub UI Interactions
 * Handles all UI interactions and micro-animations
 */

class UIInteractionsManager {
    constructor() {
        this.init();
        console.log('🎭 UI Interactions initialized');
    }

    init() {
        this.setupGlobalInteractions();
        this.setupScrollEffects();
        this.setupFormEnhancements();
        this.setupTooltips();
    }

    setupGlobalInteractions() {
        // Enhanced button interactions
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn')) {
                this.handleButtonClick(e.target);
            }
        });

        // Loading states for async actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-async]')) {
                this.setLoadingState(e.target, true);
            }
        });
    }

    handleButtonClick(button) {
        // Create ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    setupScrollEffects() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                } else {
                    entry.target.classList.remove('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            scrollObserver.observe(el);
        });
    }

    setupFormEnhancements() {
        // Enhanced input interactions
        document.addEventListener('focus', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.enhanceFormField(e.target);
            }
        }, true);

        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.removeFormFieldEnhancement(e.target);
            }
        }, true);
    }

    enhanceFormField(field) {
        const container = field.closest('.form-field, .input-group');
        if (container) {
            container.classList.add('field--focused');
        }
    }

    removeFormFieldEnhancement(field) {
        const container = field.closest('.form-field, .input-group');
        if (container) {
            container.classList.remove('field--focused');
            
            if (field.value) {
                container.classList.add('field--filled');
            } else {
                container.classList.remove('field--filled');
            }
        }
    }

    setupTooltips() {
        document.addEventListener('mouseenter', (e) => {
            if (e.target && e.target.nodeType === Node.ELEMENT_NODE && e.target.hasAttribute && e.target.hasAttribute('data-tooltip')) {
                this.showTooltip(e.target);
            }
        });

        document.addEventListener('mouseleave', (e) => {
            if (e.target && e.target.nodeType === Node.ELEMENT_NODE && e.target.hasAttribute && e.target.hasAttribute('data-tooltip')) {
                this.hideTooltip();
            }
        });
    }

    showTooltip(element) {
        const tooltipText = element.getAttribute('data-tooltip');
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = tooltipText;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
        
        requestAnimationFrame(() => {
            tooltip.classList.add('tooltip--visible');
        });
        
        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.classList.remove('tooltip--visible');
            setTimeout(() => {
                if (this.currentTooltip) {
                    this.currentTooltip.remove();
                    this.currentTooltip = null;
                }
            }, 200);
        }
    }

    setLoadingState(element, loading) {
        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
            const originalText = element.textContent;
            element.dataset.originalText = originalText;
            element.innerHTML = '<span class="spinner"></span> Loading...';
        } else {
            element.classList.remove('loading');
            element.disabled = false;
            if (element.dataset.originalText) {
                element.textContent = element.dataset.originalText;
                delete element.dataset.originalText;
            }
        }
    }

    // Public methods
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        
        const container = document.querySelector('.notifications') || document.body;
        container.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('notification--visible');
        });
        
        setTimeout(() => {
            notification.classList.remove('notification--visible');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    smoothScrollTo(element, offset = 0) {
        const targetPosition = element.offsetTop - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Initialize and export
const uiInteractions = new UIInteractionsManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.UIInteractions = uiInteractions;

export default uiInteractions; 