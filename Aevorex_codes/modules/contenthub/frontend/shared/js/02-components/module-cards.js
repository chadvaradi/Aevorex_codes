/**
 * ContentHub Module Cards Manager
 * Handles interactive module cards and their animations
 */

class ModuleCardsManager {
    constructor() {
        this.cards = [];
        this.activeCard = null;
        this.init();
        console.log('🃏 Module Cards Manager initialized');
    }

    init() {
        this.setupCards();
        this.setupInteractions();
        this.setupAnimations();
    }

    setupCards() {
        const cardElements = document.querySelectorAll('.ch-module-card, .ch-tool-card');
        cardElements.forEach((card, index) => {
            const cardData = {
                element: card,
                id: card.dataset.moduleId || `module-${index}`,
                title: card.querySelector('.ch-card__title')?.textContent || 'Module',
                description: card.querySelector('.ch-card__description')?.textContent || '',
                active: false
            };
            
            this.cards.push(cardData);
            this.enhanceCard(card, cardData);
        });

        console.log(`🃏 Initialized ${this.cards.length} module cards`);
    }

    enhanceCard(element, cardData) {
        // Add hover effects
        element.addEventListener('mouseenter', () => {
            this.onCardHover(cardData, true);
        });

        element.addEventListener('mouseleave', () => {
            this.onCardHover(cardData, false);
        });

        // Add click handling
        element.addEventListener('click', (e) => {
            e.preventDefault();
            this.onCardClick(cardData);
        });

        // Add keyboard navigation
        element.setAttribute('tabindex', '0');
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.onCardClick(cardData);
            }
        });
    }

    setupInteractions() {
        // Setup card filtering if filter controls exist
        const filterButtons = document.querySelectorAll('.ch-filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterCards(filter);
            });
        });
    }

    setupAnimations() {
        // Stagger card animations on load
        this.cards.forEach((card, index) => {
            card.element.style.animationDelay = `${index * 0.1}s`;
        });
    }

    onCardHover(cardData, isHovering) {
        if (isHovering) {
            cardData.element.classList.add('ch-card--hover');
            
            // Animate other cards
            this.cards.forEach(otherCard => {
                if (otherCard !== cardData) {
                    otherCard.element.classList.add('ch-card--dimmed');
                }
            });
        } else {
            cardData.element.classList.remove('ch-card--hover');
            
            // Remove dimming from other cards
            this.cards.forEach(otherCard => {
                otherCard.element.classList.remove('ch-card--dimmed');
            });
        }
    }

    onCardClick(cardData) {
        // Deactivate previous active card
        if (this.activeCard && this.activeCard !== cardData) {
            this.activeCard.element.classList.remove('ch-card--active');
            this.activeCard.active = false;
        }

        // Toggle current card
        cardData.active = !cardData.active;
        cardData.element.classList.toggle('ch-card--active', cardData.active);
        
        this.activeCard = cardData.active ? cardData : null;

        // Dispatch event
        window.dispatchEvent(new CustomEvent('contenthub:card-clicked', {
            detail: { card: cardData }
        }));

        console.log(`🃏 Card clicked: ${cardData.title}`);
    }

    filterCards(filter) {
        this.cards.forEach(card => {
            const shouldShow = filter === 'all' || 
                             card.element.dataset.category === filter ||
                             card.element.classList.contains(`ch-card--${filter}`);
            
            if (shouldShow) {
                card.element.classList.remove('ch-card--hidden');
                card.element.style.display = '';
            } else {
                card.element.classList.add('ch-card--hidden');
                card.element.style.display = 'none';
            }
        });

        // Update filter button states
        document.querySelectorAll('.ch-filter-btn').forEach(btn => {
            btn.classList.toggle('ch-filter-btn--active', btn.dataset.filter === filter);
        });
    }

    addCard(cardData) {
        const cardElement = this.createCardElement(cardData);
        const container = document.querySelector('.ch-module-grid, .ch-cards-container');
        
        if (container) {
            container.appendChild(cardElement);
            
            const newCardData = {
                element: cardElement,
                id: cardData.id,
                title: cardData.title,
                description: cardData.description,
                active: false
            };
            
            this.cards.push(newCardData);
            this.enhanceCard(cardElement, newCardData);
        }
    }

    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = 'ch-module-card';
        card.dataset.moduleId = cardData.id;
        
        card.innerHTML = `
            <div class="ch-card__header">
                <h3 class="ch-card__title">${cardData.title}</h3>
            </div>
            <div class="ch-card__body">
                <p class="ch-card__description">${cardData.description}</p>
            </div>
            <div class="ch-card__footer">
                <button class="ch-btn ch-btn--primary">Megnyitás</button>
            </div>
        `;
        
        return card;
    }

    getActiveCard() {
        return this.activeCard;
    }

    getAllCards() {
        return [...this.cards];
    }
}

// Initialize and export
const moduleCards = new ModuleCardsManager();
window.ContentHub = window.ContentHub || {};
window.ContentHub.ModuleCards = moduleCards;

export default moduleCards; 