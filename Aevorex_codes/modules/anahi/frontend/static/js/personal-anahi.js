/**
 * Personal Anahí - Romantic JavaScript
 * Elegant animations and interactions for a very special page
 */

class RomanticAnahiPage {
    constructor() {
        this.particleCount = 50;
        this.particles = [];
        this.scrollListeners = [];
        this.isLoaded = false;
        
        // Intersection Observer for scroll animations
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.init();
    }

    async init() {
        console.log('💖 Initializing romantic page for Anahí...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startMagic());
        } else {
            this.startMagic();
        }
    }

    startMagic() {
        console.log('✨ Starting the magic...');
        
        // FIRST: Ensure header elements are visible immediately
        this.ensureHeaderVisibility();
        
        // Initialize all romantic features
        this.createFloatingParticles();
        this.initScrollAnimations();
        this.initRomanticInteractions();
        this.initSmoothScrolling();
        this.initTypingEffect();
        this.initPhotoHoverEffects();
        this.initQuoteAnimations();
        
        // Start the experience
        setTimeout(() => {
            this.animatePageLoad();
        }, 500);
        
        this.isLoaded = true;
        console.log('💕 Magic activated! The page is ready for Anahí');
    }

    // === ENSURE HEADER VISIBILITY ===
    ensureHeaderVisibility() {
        console.log('👁️ Ensuring header elements are visible...');
        
        const headerElements = [
            '.header-decoration',
            '.main-title',
            '.subtitle',
            '.intro-text',
            '.scroll-indicator'
        ];
        
        headerElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                // Force visibility with inline styles that override any CSS
                element.style.setProperty('opacity', '1', 'important');
                element.style.setProperty('visibility', 'visible', 'important');
                element.style.setProperty('display', 'block', 'important');
                element.style.setProperty('transform', 'translateY(0)', 'important');
            }
        });
        
        // Add a backup timer to ensure visibility
        setTimeout(() => {
            headerElements.forEach(selector => {
                const element = document.querySelector(selector);
                if (element && window.getComputedStyle(element).opacity === '0') {
                    console.warn(`⚠️ Element ${selector} still hidden, forcing visibility`);
                    element.style.setProperty('opacity', '1', 'important');
                    element.style.setProperty('visibility', 'visible', 'important');
                }
            });
        }, 1000);
    }

    // === FLOATING PARTICLES ===
    createFloatingParticles() {
        const container = document.getElementById('particles');
        if (!container) return;

        console.log('🌟 Creating romantic particles...');
        
        // Clear existing particles
        container.innerHTML = '';
        this.particles = [];

        for (let i = 0; i < this.particleCount; i++) {
            const particle = this.createParticle();
            container.appendChild(particle.element);
            this.particles.push(particle);
        }

        // Start particle animation loop
        this.animateParticles();
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random positioning and timing
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const delay = Math.random() * 8;
        const scale = 0.5 + Math.random() * 1;
        
        particle.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            animation-delay: ${delay}s;
            transform: scale(${scale});
            opacity: ${0.3 + Math.random() * 0.7};
        `;

        return {
            element: particle,
            x: x,
            y: y,
            speed: 0.5 + Math.random() * 1,
            direction: Math.random() * Math.PI * 2
        };
    }

    animateParticles() {
        this.particles.forEach(particle => {
            // Gentle floating movement
            particle.x += Math.sin(Date.now() * 0.001 + particle.direction) * particle.speed;
            particle.y += Math.cos(Date.now() * 0.001 + particle.direction) * particle.speed * 0.5;
            
            // Wrap around screen
            if (particle.x > window.innerWidth) particle.x = -10;
            if (particle.x < -10) particle.x = window.innerWidth;
            if (particle.y > window.innerHeight) particle.y = -10;
            if (particle.y < -10) particle.y = window.innerHeight;
            
            particle.element.style.left = particle.x + 'px';
            particle.element.style.top = particle.y + 'px';
        });

        requestAnimationFrame(() => this.animateParticles());
    }

    // === SCROLL ANIMATIONS ===
    initScrollAnimations() {
        console.log('📜 Setting up scroll animations...');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    this.animateQuoteOnScroll(entry.target);
                }
            });
        }, this.observerOptions);

        // Observe all photo stories
        document.querySelectorAll('.photo-story').forEach(story => {
            observer.observe(story);
        });
    }

    animateQuoteOnScroll(element) {
        const quotes = element.querySelectorAll('.spanish-quote, .hungarian-quote');
        quotes.forEach((quote, index) => {
            setTimeout(() => {
                quote.style.transform = 'translateX(0)';
                quote.style.opacity = '1';
            }, index * 200);
        });
    }

    // === ROMANTIC INTERACTIONS ===
    initRomanticInteractions() {
        console.log('💫 Adding romantic interactions...');
        
        // Heart click effects
        document.querySelectorAll('.header-decoration i, .quote-decoration i').forEach(icon => {
            icon.addEventListener('click', (e) => this.createHeartBurst(e));
        });

        // Photo hover magic
        document.querySelectorAll('.photo-container').forEach(container => {
            container.addEventListener('mouseenter', () => this.photoHoverMagic(container));
            container.addEventListener('mouseleave', () => this.photoLeaveMagic(container));
        });

        // Quote container interactions
        document.querySelectorAll('.quote-container').forEach(container => {
            container.addEventListener('mouseenter', () => this.quoteHoverEffect(container));
        });
    }

    createHeartBurst(event) {
        console.log('💖 Creating heart burst...');
        
        const burst = document.createElement('div');
        burst.innerHTML = '💖';
        burst.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            font-size: 1.5rem;
            pointer-events: none;
            z-index: 9999;
            animation: heartBurst 1s ease-out forwards;
        `;

        document.body.appendChild(burst);

        // Remove after animation
        setTimeout(() => {
            if (burst.parentNode) {
                burst.parentNode.removeChild(burst);
            }
        }, 1000);

        // Add CSS keyframe if not exists
        if (!document.getElementById('heart-burst-styles')) {
            const style = document.createElement('style');
            style.id = 'heart-burst-styles';
            style.textContent = `
                @keyframes heartBurst {
                    0% { transform: scale(1) rotate(0deg); opacity: 1; }
                    50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
                    100% { transform: scale(0) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    photoHoverMagic(container) {
        const image = container.querySelector('.story-image');
        if (image) {
            image.style.transform = 'scale(1.05) rotate(1deg)';
            image.style.filter = 'brightness(1.1) saturate(1.2)';
        }
    }

    photoLeaveMagic(container) {
        const image = container.querySelector('.story-image');
        if (image) {
            image.style.transform = 'scale(1) rotate(0deg)';
            image.style.filter = 'brightness(1) saturate(1)';
        }
    }

    quoteHoverEffect(container) {
        const accent = container.querySelector('.quote-accent');
        if (accent) {
            accent.style.transform = 'scaleX(1.2)';
            accent.style.filter = 'brightness(1.3)';
            setTimeout(() => {
                accent.style.transform = 'scaleX(1)';
                accent.style.filter = 'brightness(1)';
            }, 300);
        }
    }

    // === SMOOTH SCROLLING ===
    initSmoothScrolling() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => {
                document.querySelector('.romantic-gallery').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        }
    }

    // === TYPING EFFECTS ===
    initTypingEffect() {
        console.log('⌨️ Setting up typing effects...');
        
        const titleName = document.querySelector('.title-name');
        if (titleName) {
            const originalText = titleName.textContent;
            titleName.textContent = '';
            
            setTimeout(() => {
                this.typeText(titleName, originalText, 150);
            }, 1000);
        }
    }

    typeText(element, text, speed) {
        let i = 0;
        const timer = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                element.style.borderRight = 'none';
            }
        }, speed);

        element.style.borderRight = '2px solid var(--rose-gold)';
        element.style.animation = 'blink 1s infinite';
        
        // Add blink animation
        if (!document.getElementById('blink-styles')) {
            const style = document.createElement('style');
            style.id = 'blink-styles';
            style.textContent = `
                @keyframes blink {
                    0%, 50% { border-right-color: var(--rose-gold); }
                    51%, 100% { border-right-color: transparent; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // === PHOTO HOVER EFFECTS ===
    initPhotoHoverEffects() {
        console.log('🖼️ Setting up photo effects...');
        
        document.querySelectorAll('.story-image').forEach(image => {
            image.addEventListener('load', () => {
                image.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            });
        });
    }

    // === QUOTE ANIMATIONS ===
    initQuoteAnimations() {
        console.log('💭 Setting up quote animations...');
        
        // Initially hide quotes for animation
        document.querySelectorAll('.spanish-quote, .hungarian-quote').forEach(quote => {
            quote.style.transform = 'translateX(-50px)';
            quote.style.opacity = '0';
            quote.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }

    // === PAGE LOAD ANIMATION ===
    animatePageLoad() {
        console.log('🎭 Starting page load animation...');
        
        // Animate header elements in sequence
        const elements = [
            '.header-decoration',
            '.main-title',
            '.subtitle',
            '.intro-text',
            '.scroll-indicator'
        ];

        // Check current state of elements
        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                const computedStyle = window.getComputedStyle(element);
                console.log(`📊 Element ${selector}: opacity=${computedStyle.opacity}, visibility=${computedStyle.visibility}, display=${computedStyle.display}`);
            }
        });

        // First ensure all elements are visible and add animation class
        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                // Remove any conflicting styles first
                element.style.opacity = '';
                element.style.transform = '';
                element.style.visibility = '';
                
                // Add animation class
                element.classList.add('header-element-animated');
                
                // Force a reflow to ensure the class is applied
                element.offsetHeight;
                
                console.log(`✅ Added animation class to ${selector}`);
            }
        });

        // Small delay to ensure CSS is applied, then animate them in sequence
        setTimeout(() => {
            elements.forEach((selector, index) => {
                const element = document.querySelector(selector);
                if (element) {
                    setTimeout(() => {
                        element.classList.add('visible');
                        console.log(`🎬 Animating ${selector} (index ${index})`);
                    }, index * 300);
                }
            });
        }, 100);

        // Add subtle floating animation to photos
        setTimeout(() => {
            this.addFloatingAnimation();
        }, 2000);
    }

    addFloatingAnimation() {
        document.querySelectorAll('.photo-container').forEach((container, index) => {
            const delay = index * 0.5;
            container.style.animation = `gentleFloat 6s ease-in-out infinite`;
            container.style.animationDelay = `${delay}s`;
        });

        // Add floating keyframe
        if (!document.getElementById('floating-styles')) {
            const style = document.createElement('style');
            style.id = 'floating-styles';
            style.textContent = `
                @keyframes gentleFloat {
                    0%, 100% { transform: translateY(0px) scale(0.95); }
                    50% { transform: translateY(-10px) scale(0.98); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // === UTILITY FUNCTIONS ===
    
    // Add sparkle effect on click
    addSparkleEffect(event) {
        const sparkle = document.createElement('div');
        sparkle.innerHTML = '✨';
        sparkle.style.cssText = `
            position: fixed;
            left: ${event.clientX - 10}px;
            top: ${event.clientY - 10}px;
            font-size: 1.2rem;
            pointer-events: none;
            z-index: 9999;
            animation: sparkleEffect 1.5s ease-out forwards;
        `;

        document.body.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1500);
    }

    // Resize handler for particles
    handleResize() {
        if (this.isLoaded) {
            console.log('📐 Handling resize...');
            setTimeout(() => {
                this.createFloatingParticles();
            }, 500);
        }
    }

    // Add romantic background music controls (optional)
    initMusicControls() {
        // This could be implemented if audio is desired
        // For now, keeping it visual-only as requested
        console.log('🎵 Music controls ready (if needed)');
    }
}

// Additional CSS animations to be injected
const additionalStyles = `
    /* Additional dynamic styles */
    @keyframes sparkleEffect {
        0% { transform: scale(0) rotate(0deg); opacity: 1; }
        50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
        100% { transform: scale(0) rotate(360deg); opacity: 0; }
    }
    
    .photo-story:hover .quote-accent {
        animation: accentPulse 1s ease-in-out;
    }
    
    @keyframes accentPulse {
        0%, 100% { transform: scaleX(1); }
        50% { transform: scaleX(1.3); filter: brightness(1.4); }
    }
    
    /* Smooth hover transitions for all interactive elements */
    .photo-container, .quote-container, .header-decoration i {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Special effects for final story */
    .final-story {
        position: relative;
        overflow: hidden;
    }
    
    .final-story::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(232, 180, 184, 0.1), transparent);
        animation: shimmerFinal 4s ease-in-out infinite;
        pointer-events: none;
    }
    
    @keyframes shimmerFinal {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        50% { transform: translateX(0%) translateY(0%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }
    
    /* IMPORTANT: Override any conflicting CSS that might hide header elements */
    .romantic-header .header-decoration,
    .romantic-header .main-title,
    .romantic-header .subtitle,
    .romantic-header .intro-text,
    .romantic-header .scroll-indicator {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: block !important;
    }
    
    /* Override any universal selectors that might affect header */
    .romantic-header * {
        opacity: 1 !important;
        visibility: visible !important;
    }
    
    /* Specific overrides for each header element */
    .romantic-header .header-decoration {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: flex !important;
    }
    
    .romantic-header .main-title {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: block !important;
    }
    
    .romantic-header .subtitle {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: block !important;
    }
    
    .romantic-header .intro-text {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: block !important;
    }
    
    .romantic-header .scroll-indicator {
        opacity: 1 !important;
        transform: translateY(0) !important;
        visibility: visible !important;
        display: block !important;
    }
    
    /* Animation class for header elements */
    .header-element-animated {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .header-element-animated.visible {
        opacity: 1;
        transform: translateY(0);
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the romantic page
const romanticPage = new RomanticAnahiPage();

// Handle window resize
window.addEventListener('resize', () => {
    romanticPage.handleResize();
});

// Add global click sparkle effect
document.addEventListener('click', (e) => {
    // Only on special elements
    if (e.target.closest('.quote-decoration, .header-decoration, .footer-decoration')) {
        romanticPage.addSparkleEffect(e);
    }
});

// Console message for Anahí
console.log(`
💖✨ Esta página fue creada especialmente para ti, Anahí ✨💖

    🌹 Con todo el cariño desde Hungría 🌹
    
    💕 Cada detalle fue pensado para hacerte sonreír 💕
    
    🎨 Los colores, las animaciones, las palabras... 🎨
    
    🌸 Todo es para celebrar lo especial que eres 🌸

✨ Que disfrutes cada momento de esta pequeña sorpresa ✨
`);

console.log('🚀 Romantic page fully loaded and ready for magic!'); 