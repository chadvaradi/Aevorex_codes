/**
 * ContentHub Animations Utilities
 * Smooth animations and transitions for premium UX
 */

class AnimationsManager {
    constructor() {
        this.defaultDuration = 300;
        this.defaultEasing = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Material Design easing
        this.init();
        console.log('✨ Animations initialized');
    }

    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
        this.setupHoverEffects();
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateIn(entry.target);
                }
            });
        }, options);

        // Observe all animation targets
        document.querySelectorAll('[data-animate]').forEach(el => {
            this.observer.observe(el);
        });
    }

    setupScrollAnimations() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    setupHoverEffects() {
        document.addEventListener('mouseenter', (e) => {
            if (e.target && e.target.nodeType === Node.ELEMENT_NODE && e.target.hasAttribute && e.target.hasAttribute('data-hover-effect')) {
                this.applyHoverEffect(e.target, true);
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            if (e.target && e.target.nodeType === Node.ELEMENT_NODE && e.target.hasAttribute && e.target.hasAttribute('data-hover-effect')) {
                this.applyHoverEffect(e.target, false);
            }
        }, true);
    }

    animateIn(element) {
        const animationType = element.getAttribute('data-animate') || 'fadeIn';
        const delay = parseInt(element.getAttribute('data-delay')) || 0;
        const duration = parseInt(element.getAttribute('data-duration')) || this.defaultDuration;

        setTimeout(() => {
            this.performAnimation(element, animationType, duration);
        }, delay);
    }

    performAnimation(element, type, duration) {
        element.style.transition = `all ${duration}ms ${this.defaultEasing}`;
        
        switch (type) {
            case 'fadeIn':
                this.fadeIn(element);
                break;
            case 'slideUp':
                this.slideUp(element);
                break;
            case 'slideDown':
                this.slideDown(element);
                break;
            case 'slideLeft':
                this.slideLeft(element);
                break;
            case 'slideRight':
                this.slideRight(element);
                break;
            case 'scaleIn':
                this.scaleIn(element);
                break;
            case 'bounceIn':
                this.bounceIn(element);
                break;
            default:
                this.fadeIn(element);
        }
    }

    fadeIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    slideUp(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(50px)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    slideDown(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-50px)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    slideLeft(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(50px)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    slideRight(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(-50px)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    scaleIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
        });
    }

    bounceIn(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.3)';
        element.style.transition = `all ${this.defaultDuration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
        });
    }

    applyHoverEffect(element, isHover) {
        const effect = element.getAttribute('data-hover-effect');
        
        switch (effect) {
            case 'lift':
                this.liftEffect(element, isHover);
                break;
            case 'glow':
                this.glowEffect(element, isHover);
                break;
            case 'scale':
                this.scaleEffect(element, isHover);
                break;
            case 'rotate':
                this.rotateEffect(element, isHover);
                break;
            case 'shake':
                if (isHover) this.shakeEffect(element);
                break;
        }
    }

    liftEffect(element, isHover) {
        if (isHover) {
            element.style.transform = 'translateY(-4px)';
            element.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        } else {
            element.style.transform = 'translateY(0)';
            element.style.boxShadow = '';
        }
    }

    glowEffect(element, isHover) {
        if (isHover) {
            element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
        } else {
            element.style.boxShadow = '';
        }
    }

    scaleEffect(element, isHover) {
        if (isHover) {
            element.style.transform = 'scale(1.05)';
        } else {
            element.style.transform = 'scale(1)';
        }
    }

    rotateEffect(element, isHover) {
        if (isHover) {
            element.style.transform = 'rotate(2deg)';
        } else {
            element.style.transform = 'rotate(0deg)';
        }
    }

    shakeEffect(element) {
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    handleScroll() {
        const scrollTop = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        parallaxElements.forEach(element => {
            const speed = parseFloat(element.getAttribute('data-parallax')) || 0.5;
            const yPos = -(scrollTop * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    }

    // Public animation methods
    animateElement(element, options = {}) {
        const {
            type = 'fadeIn',
            duration = this.defaultDuration,
            delay = 0,
            easing = this.defaultEasing
        } = options;

        return new Promise(resolve => {
            setTimeout(() => {
                element.style.transition = `all ${duration}ms ${easing}`;
                this.performAnimation(element, type, duration);
                
                setTimeout(resolve, duration);
            }, delay);
        });
    }

    pulse(element, color = 'rgba(59, 130, 246, 0.3)') {
        const pulseKeyframes = [
            { boxShadow: `0 0 0 0 ${color}` },
            { boxShadow: `0 0 0 10px transparent` }
        ];

        element.animate(pulseKeyframes, {
            duration: 1000,
            iterations: 1
        });
    }

    ripple(element, event) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            background-color: rgba(255, 255, 255, 0.6);
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
        `;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Utility methods
    addAnimation(element, animationType, options = {}) {
        element.setAttribute('data-animate', animationType);
        if (options.delay) element.setAttribute('data-delay', options.delay);
        if (options.duration) element.setAttribute('data-duration', options.duration);
        
        this.observer.observe(element);
    }

    removeAnimation(element) {
        element.removeAttribute('data-animate');
        element.removeAttribute('data-delay');
        element.removeAttribute('data-duration');
        this.observer.unobserve(element);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple-animation {
        to { transform: scale(4); opacity: 0; }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    [data-animate] {
        opacity: 0;
        transform: translateY(20px);
    }
`;
document.head.appendChild(style);

// Initialize and export
const animations = new AnimationsManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.Animations = animations;

export default animations; 