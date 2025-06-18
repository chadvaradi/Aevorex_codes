/**
 * HealthHub JavaScript
 * Healthcare Intelligence Platform functionality
 */

(function() {
    'use strict';

    // HealthHub module
    const HealthHub = {
        name: 'HealthHub',
        initialized: false,

        init: function() {
            if (this.initialized) return;

            AEVOREX.utils.log('Initializing HealthHub module...', 'info', this.name);

            this.setupHealthDashboard();
            this.setupVitalSigns();
            this.setupHealthMetrics();
            this.setupActivityTracking();
            this.setupHealthAlerts();
            this.setupProgressBars();

            this.initialized = true;
            AEVOREX.utils.log('HealthHub module initialized successfully', 'success', this.name);
        },

        setupHealthDashboard: function() {
            // Initialize health dashboard
            const dashboardCards = AEVOREX.utils.$$('.health-card');
            
            dashboardCards.forEach(card => {
                AEVOREX.utils.on(card, 'click', this.handleHealthCardClick.bind(this));
            });

            AEVOREX.utils.log('Health dashboard setup complete', 'debug', this.name);
        },

        setupVitalSigns: function() {
            // Animate vital signs with real-time simulation
            const vitalCards = AEVOREX.utils.$$('.vital-card');
            
            vitalCards.forEach(card => {
                this.animateVitalSign(card);
            });

            // Start real-time updates
            setInterval(() => {
                this.updateVitalSigns();
            }, 30000); // Update every 30 seconds

            AEVOREX.utils.log('Vital signs monitoring setup complete', 'debug', this.name);
        },

        setupHealthMetrics: function() {
            const metricCards = AEVOREX.utils.$$('.metric-card');
            
            metricCards.forEach(card => {
                AEVOREX.utils.on(card, 'mouseenter', this.highlightMetric.bind(this));
                AEVOREX.utils.on(card, 'mouseleave', this.unhighlightMetric.bind(this));
            });

            AEVOREX.utils.log('Health metrics setup complete', 'debug', this.name);
        },

        setupActivityTracking: function() {
            const activityCards = AEVOREX.utils.$$('.activity-card');
            
            activityCards.forEach(card => {
                this.initializeActivityCard(card);
            });

            AEVOREX.utils.log('Activity tracking setup complete', 'debug', this.name);
        },

        setupHealthAlerts: function() {
            const alertCards = AEVOREX.utils.$$('.alert-card');
            
            alertCards.forEach(alert => {
                AEVOREX.utils.on(alert, 'click', this.handleAlertClick.bind(this));
            });

            // Check for new alerts periodically
            setInterval(() => {
                this.checkForNewAlerts();
            }, 60000); // Check every minute

            AEVOREX.utils.log('Health alerts setup complete', 'debug', this.name);
        },

        setupProgressBars: function() {
            const progressBars = AEVOREX.utils.$$('.progress-fill');
            
            // Animate progress bars when they come into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateProgressBar(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            });

            progressBars.forEach(bar => {
                observer.observe(bar);
            });

            AEVOREX.utils.log('Progress bars setup complete', 'debug', this.name);
        },

        handleHealthCardClick: function(e) {
            const card = e.currentTarget;
            const cardType = card.getAttribute('data-health-type') || 'general';
            
            AEVOREX.utils.log(`Health card clicked: ${cardType}`, 'info', this.name);
            
            // Add click animation
            card.style.transform = 'scale(0.98)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);

            this.showHealthDetails(cardType);
        },

        animateVitalSign: function(card) {
            const valueElement = card.querySelector('.vital-value');
            const statusElement = card.querySelector('.vital-status');
            
            if (!valueElement) return;

            // Simulate realistic vital sign fluctuations
            const baseValue = parseInt(valueElement.textContent) || 0;
            const fluctuation = Math.random() * 6 - 3; // ±3 variation
            const newValue = Math.max(0, Math.round(baseValue + fluctuation));
            
            // Animate value change
            valueElement.style.transition = 'all 0.3s ease';
            valueElement.textContent = newValue;
            
            // Update status based on value
            if (statusElement) {
                this.updateVitalStatus(statusElement, newValue, card.getAttribute('data-vital-type'));
            }
        },

        updateVitalSigns: function() {
            const vitalCards = AEVOREX.utils.$$('.vital-card');
            
            vitalCards.forEach(card => {
                this.animateVitalSign(card);
            });

            AEVOREX.utils.log('Vital signs updated', 'debug', this.name);
        },

        updateVitalStatus: function(statusElement, value, vitalType) {
            let status = 'good';
            let statusText = 'Normál';
            
            switch(vitalType) {
                case 'heart-rate':
                    if (value < 60 || value > 100) {
                        status = 'warning';
                        statusText = 'Figyelendő';
                    }
                    if (value < 50 || value > 120) {
                        status = 'critical';
                        statusText = 'Kritikus';
                    }
                    break;
                case 'blood-pressure':
                    if (value > 140) {
                        status = 'warning';
                        statusText = 'Magas';
                    }
                    if (value > 160) {
                        status = 'critical';
                        statusText = 'Kritikus';
                    }
                    break;
                default:
                    if (value > 80) status = 'excellent';
                    else if (value > 60) status = 'good';
                    else if (value > 40) status = 'warning';
                    else status = 'critical';
            }
            
            statusElement.className = `vital-status ${status}`;
            statusElement.textContent = statusText;
        },

        highlightMetric: function(e) {
            const card = e.currentTarget;
            const trend = card.querySelector('.metric-trend');
            
            if (trend) {
                trend.style.transform = 'scale(1.1)';
            }
        },

        unhighlightMetric: function(e) {
            const card = e.currentTarget;
            const trend = card.querySelector('.metric-trend');
            
            if (trend) {
                trend.style.transform = '';
            }
        },

        initializeActivityCard: function(card) {
            const stats = card.querySelectorAll('.stat-value');
            
            stats.forEach(stat => {
                const targetValue = parseInt(stat.textContent) || 0;
                this.animateCounter(stat, 0, targetValue, 2000);
            });
        },

        animateCounter: function(element, start, end, duration) {
            const startTime = performance.now();
            const difference = end - start;
            
            const updateCounter = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const currentValue = Math.round(start + (difference * this.easeOutQuart(progress)));
                element.textContent = currentValue.toLocaleString('hu-HU');
                
                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            };
            
            requestAnimationFrame(updateCounter);
        },

        easeOutQuart: function(t) {
            return 1 - (--t) * t * t * t;
        },

        handleAlertClick: function(e) {
            const alert = e.currentTarget;
            const alertType = alert.classList.contains('critical') ? 'critical' : 
                             alert.classList.contains('warning') ? 'warning' : 'info';
            
            AEVOREX.utils.log(`Health alert clicked: ${alertType}`, 'info', this.name);
            
            // Mark as read
            alert.style.opacity = '0.7';
            
            AEVOREX.notify.info('Értesítés megtekintve');
        },

        checkForNewAlerts: function() {
            // Simulate new health alerts
            const alertTypes = ['info', 'warning'];
            const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
            
            if (Math.random() < 0.1) { // 10% chance of new alert
                this.createNewAlert(randomType, 'Új egészségügyi értesítés érkezett.');
            }
        },

        createNewAlert: function(type, message) {
            const alertsContainer = AEVOREX.utils.$('.health-alerts');
            if (!alertsContainer) return;
            
            const alert = document.createElement('div');
            alert.className = `alert-card ${type}`;
            alert.innerHTML = `
                <div class="alert-header">
                    <span class="alert-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <h4 class="alert-title">Új értesítés</h4>
                    <span class="alert-time">Most</span>
                </div>
                <p class="alert-message">${message}</p>
            `;
            
            alertsContainer.prepend(alert);
            
            // Add click handler
            AEVOREX.utils.on(alert, 'click', this.handleAlertClick.bind(this));
            
            // Animate in
            alert.style.opacity = '0';
            alert.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                alert.style.transition = 'all 0.3s ease';
                alert.style.opacity = '1';
                alert.style.transform = 'translateX(0)';
            }, 100);
            
            AEVOREX.notify.info('Új egészségügyi értesítés!');
        },

        animateProgressBar: function(progressFill) {
            const targetWidth = progressFill.getAttribute('data-progress') || '0%';
            
            // Start from 0
            progressFill.style.width = '0%';
            
            // Animate to target
            setTimeout(() => {
                progressFill.style.width = targetWidth;
            }, 200);
        },

        showHealthDetails: function(cardType) {
            const detailsModal = this.createDetailsModal(cardType);
            document.body.appendChild(detailsModal);
            
            // Show modal
            setTimeout(() => {
                detailsModal.classList.add('show');
            }, 10);
            
            // Close on outside click
            AEVOREX.utils.on(detailsModal, 'click', (e) => {
                if (e.target === detailsModal) {
                    this.closeModal(detailsModal);
                }
            });
        },

        createDetailsModal: function(cardType) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            const content = this.getModalContent(cardType);
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${content.title}</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        ${content.body}
                    </div>
                </div>
            `;
            
            // Add close handler
            const closeBtn = modal.querySelector('.modal-close');
            AEVOREX.utils.on(closeBtn, 'click', () => {
                this.closeModal(modal);
            });
            
            return modal;
        },

        getModalContent: function(cardType) {
            const contents = {
                'vitals': {
                    title: 'Vitális Jelek Részletei',
                    body: '<p>Részletes vitális jelek elemzése hamarosan elérhető.</p>'
                },
                'activity': {
                    title: 'Aktivitás Részletei',
                    body: '<p>Részletes aktivitás tracking adatok hamarosan elérhetők.</p>'
                },
                'general': {
                    title: 'Egészségügyi Adatok',
                    body: '<p>Általános egészségügyi információk hamarosan elérhetők.</p>'
                }
            };
            
            return contents[cardType] || contents.general;
        },

        closeModal: function(modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    };

    // Initialize when AEVOREX core is ready
    if (window.AEVOREX && window.AEVOREX.utils) {
        HealthHub.init();
    } else {
        window.addEventListener('aevorex:ready', () => {
            HealthHub.init();
        });
    }

    // Register module with AEVOREX core if available
    if (window.AEVOREX && window.AEVOREX.modules) {
        AEVOREX.modules.register('HealthHub', HealthHub);
    }

    // Export for debugging
    window.HealthHub = HealthHub;

})(); 