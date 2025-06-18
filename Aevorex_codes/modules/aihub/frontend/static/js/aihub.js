/**
 * AIHub JavaScript - ULTRA PREMIUM VERSION
 * Artificial Intelligence Platform functionality
 * Enhanced with premium interactions, animations, and UX
 */

(function() {
    'use strict';

    // AIHub module with enhanced capabilities
    const AIHub = {
        name: 'AIHub',
        initialized: false,
        activeAnimations: new Set(),
        realTimeMetrics: {
            uptime: 99.9,
            inference: 47,
            models: 52,
            requests: 124567
        },

        init: function() {
            if (this.initialized) return;

            console.log('🤖 AIHub Ultra Premium Intelligence Platform loaded');

            this.setupEventListeners();
            this.initializeAnimations();
            this.setupModelInteractions();
            this.initializeChatInterface();
            this.setupPlayground();
            this.startRealTimeMetrics();
            this.setupPremiumEffects();
            this.initSearchAndChat();

            this.initialized = true;
            console.log('✅ AIHub ultra premium features initialized');
        },

        initSearchAndChat: function() {
            // Initialize search functionality
            const searchInput = document.getElementById('ai-search-input');
            const searchBtn = document.getElementById('ai-search-btn');
            const chatToggle = document.getElementById('ai-chat-toggle');
            const chatInterface = document.getElementById('ai-chat-interface');
            const chatInput = document.getElementById('ai-chat-input');
            const chatSendBtn = document.getElementById('ai-chat-send');

            // Search functionality
            if (searchInput && searchBtn) {
                const performSearch = () => {
                    const query = searchInput.value.trim();
                    if (query) {
                        console.log('AI Search query:', query);
                        this.handleAISearch(query);
                        searchInput.value = '';
                    }
                };

                searchBtn.addEventListener('click', performSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        performSearch();
                    }
                });

                // Auto-suggestions for AI models
                searchInput.addEventListener('input', (e) => {
                    const value = e.target.value.toLowerCase();
                    if (value.length > 0) {
                        this.showAISuggestions(value);
                    }
                });
            }

            // Chat toggle functionality
            if (chatToggle && chatInterface) {
                chatToggle.addEventListener('click', () => {
                    chatInterface.classList.toggle('hidden');
                    chatToggle.classList.toggle('active');
                    
                    if (!chatInterface.classList.contains('hidden')) {
                        // Focus on chat input when opened
                        setTimeout(() => {
                            if (chatInput) chatInput.focus();
                        }, 300);
                    }
                });
            }

            // Chat functionality
            if (chatInput && chatSendBtn) {
                const sendMessage = () => {
                    const message = chatInput.value.trim();
                    if (message) {
                        this.sendChatMessage(message);
                        chatInput.value = '';
                        chatSendBtn.disabled = true;
                    }
                };

                chatSendBtn.addEventListener('click', sendMessage);
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });

                // Enable/disable send button based on input
                chatInput.addEventListener('input', () => {
                    chatSendBtn.disabled = !chatInput.value.trim();
                });

                // Auto-resize textarea
                chatInput.addEventListener('input', () => {
                    chatInput.style.height = 'auto';
                    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
                });
            }
        },

        handleAISearch: function(query) {
            // Handle AI search queries
            console.log('Processing AI search:', query);
            
            // Show chat interface if hidden
            const chatInterface = document.getElementById('ai-chat-interface');
            const chatToggle = document.getElementById('ai-chat-toggle');
            
            if (chatInterface && chatInterface.classList.contains('hidden')) {
                chatInterface.classList.remove('hidden');
                if (chatToggle) chatToggle.classList.add('active');
            }

            // Add search query as user message
            this.addChatMessage('user', query);
            
            // Simulate AI response based on query
            setTimeout(() => {
                const response = this.generateAIResponse(query);
                this.addChatMessage('assistant', response);
            }, 1000);
        },

        generateAIResponse: function(query) {
            const lowerQuery = query.toLowerCase();
            
            // Simple AI response generation based on keywords
            if (lowerQuery.includes('model') || lowerQuery.includes('api')) {
                return `I can help you with AI models and APIs! Here are some popular options:

**Language Models:**
- GPT-4 Turbo: Best for complex reasoning and long contexts
- Claude 3: Excellent for analysis and creative tasks
- Llama 2: Open-source alternative for custom deployments

**Computer Vision:**
- YOLO v8: Real-time object detection
- ResNet: Image classification
- Stable Diffusion: Image generation

Would you like specific details about any of these models or help with implementation?`;
            }
            
            if (lowerQuery.includes('deploy') || lowerQuery.includes('production')) {
                return `For production deployment, I recommend:

**Container Strategy:**
- Use Docker for consistent environments
- Kubernetes for orchestration and scaling
- Load balancers for high availability

**Monitoring:**
- Prometheus for metrics collection
- Grafana for visualization
- Custom health checks for model performance

**Best Practices:**
- A/B testing for model updates
- Gradual rollouts to minimize risk
- Comprehensive logging for debugging

What specific deployment challenge are you facing?`;
            }
            
            if (lowerQuery.includes('performance') || lowerQuery.includes('optimize')) {
                return `Performance optimization strategies:

**Model Optimization:**
- Quantization to reduce model size
- Pruning to remove unnecessary parameters
- Knowledge distillation for smaller models

**Infrastructure:**
- GPU acceleration for inference
- Batch processing for efficiency
- Caching for repeated requests

**Monitoring:**
- Track latency and throughput
- Monitor resource utilization
- Set up alerting for performance degradation

Which aspect would you like to dive deeper into?`;
            }
            
            // Default response
            return `I'm here to help with AI development and deployment! I can assist with:

- Model selection and comparison
- API integration and documentation
- Deployment strategies and best practices
- Performance optimization
- Troubleshooting and debugging

What specific challenge are you working on? Feel free to ask about any aspect of AI development!`;
        },

        addChatMessage: function(role, content) {
            const messagesContainer = document.getElementById('ai-chat-messages');
            if (!messagesContainer) return;

            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-chat-message ${role}`;

            const avatar = document.createElement('div');
            avatar.className = 'ai-avatar';
            
            if (role === 'assistant') {
                avatar.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                `;
            } else {
                avatar.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                `;
                avatar.style.background = 'rgba(255, 255, 255, 0.1)';
            }

            const messageContent = document.createElement('div');
            messageContent.className = 'ai-message-content';
            messageContent.innerHTML = content.replace(/\n/g, '<br>');

            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);

            messagesContainer.appendChild(messageDiv);

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        sendChatMessage: function(message) {
            this.addChatMessage('user', message);
            
            // Simulate AI response
            setTimeout(() => {
                const response = this.generateAIResponse(message);
                this.addChatMessage('assistant', response);
            }, 1000);
        },

        showAISuggestions: function(query) {
            // Simple suggestion system for AI models and topics
            const suggestions = [
                'GPT-4 Turbo API',
                'Claude 3 integration',
                'Model deployment strategies',
                'Performance optimization',
                'Computer vision models',
                'Natural language processing',
                'API rate limiting',
                'Production monitoring'
            ];

            const matches = suggestions.filter(s => 
                s.toLowerCase().includes(query)
            );

            if (matches.length > 0) {
                console.log('AI Suggestions:', matches);
                // Could implement a dropdown here
            }
        },

        setupEventListeners: function() {
            // Premium model card interactions
            const modelCards = document.querySelectorAll('.model-card');
            modelCards.forEach(card => {
                this.setupModelCardEffects(card);
            });

            // Enhanced navigation
            const navLinks = document.querySelectorAll('.nav__link');
            navLinks.forEach(link => {
                link.addEventListener('click', this.handleNavigation.bind(this));
            });

            // Premium buttons with enhanced effects
            const buttons = document.querySelectorAll('.btn');
            buttons.forEach(btn => {
                this.setupButtonEffects(btn);
            });

            // Model category tabs
            const categoryTabs = document.querySelectorAll('.category-tab');
            categoryTabs.forEach(tab => {
                tab.addEventListener('click', this.handleCategoryFilter.bind(this));
            });

            // Parameter sliders with real-time feedback
            const parameterSliders = document.querySelectorAll('.parameter-slider');
            parameterSliders.forEach(slider => {
                this.setupParameterSlider(slider);
            });

            // Prompt templates
            const promptTemplates = document.querySelectorAll('.prompt-template');
            promptTemplates.forEach(template => {
                template.addEventListener('click', this.handlePromptTemplate.bind(this));
            });
        },

        setupModelCardEffects: function(card) {
            let hoverTimeout;

            card.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                this.animateModelCard(card, 'enter');
            });

            card.addEventListener('mouseleave', () => {
                hoverTimeout = setTimeout(() => {
                    this.animateModelCard(card, 'leave');
                }, 100);
            });

            // Enhanced click effects
            card.addEventListener('click', () => {
                this.triggerPremiumRipple(card);
            });
        },

        animateModelCard: function(card, type) {
            const icon = card.querySelector('.model-icon');
            const stats = card.querySelectorAll('.stat');

            if (type === 'enter') {
                // Staggered stat animations
                stats.forEach((stat, index) => {
                    setTimeout(() => {
                        stat.style.transform = 'scale(1.05) translateY(-2px)';
                        stat.style.boxShadow = '0 8px 25px rgba(0, 212, 255, 0.2)';
                    }, index * 50);
                });

                // Icon animation
                if (icon) {
                    icon.style.transform = 'scale(1.1) rotate(5deg)';
                    icon.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.4)';
                }
            } else {
                // Reset animations
                stats.forEach(stat => {
                    stat.style.transform = '';
                    stat.style.boxShadow = '';
                });

                if (icon) {
                    icon.style.transform = '';
                    icon.style.boxShadow = '';
                }
            }
        },

        setupButtonEffects: function(button) {
            button.addEventListener('click', (e) => {
                this.createRippleEffect(e, button);
            });

            // Hover magnetic effect
            button.addEventListener('mousemove', (e) => {
                if (button.classList.contains('btn--primary')) {
                    this.createMagneticEffect(e, button);
                }
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = '';
            });
        },

        createRippleEffect: function(e, element) {
            const ripple = document.createElement('span');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                animation: ripple 0.6s ease-out;
            `;

            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        },

        createMagneticEffect: function(e, element) {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const moveX = x * 0.1;
            const moveY = y * 0.1;

            element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
        },

        setupParameterSlider: function(slider) {
            const valueDisplay = slider.nextElementSibling;
            
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                    valueDisplay.style.color = 'var(--aihub-primary)';
                    valueDisplay.style.transform = 'scale(1.1)';
                    
                    setTimeout(() => {
                        valueDisplay.style.transform = 'scale(1)';
                    }, 200);
                }

                // Visual feedback on slider
                const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
                slider.style.background = `linear-gradient(to right, var(--aihub-primary) 0%, var(--aihub-primary) ${percent}%, rgba(255,255,255,0.2) ${percent}%, rgba(255,255,255,0.2) 100%)`;
            });
        },

        handleCategoryFilter: function(e) {
            const tab = e.target;
            const category = tab.dataset.category;

            // Update active tab
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('category-tab--active'));
            tab.classList.add('category-tab--active');

            // Filter model cards with animation
            const cards = document.querySelectorAll('.model-card');
            cards.forEach((card, index) => {
                const cardCategory = card.dataset.category;
                
                if (category === 'all' || cardCategory === category) {
                    setTimeout(() => {
                        card.style.display = 'block';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        
                        requestAnimationFrame(() => {
                            card.style.transition = 'all 0.4s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        });
                    }, index * 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(-20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 400);
                }
            });
        },

        initializeChatInterface: function() {
            const chatInput = document.querySelector('.playground-chat textarea');
            const sendButton = document.querySelector('.chat-input .btn--primary');
            const messagesContainer = document.querySelector('.chat-messages');

            if (chatInput && sendButton) {
                sendButton.addEventListener('click', () => {
                    this.handleChatMessage(chatInput.value, messagesContainer);
                });

                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleChatMessage(chatInput.value, messagesContainer);
                    }
                });

                // Auto-resize textarea
                chatInput.addEventListener('input', () => {
                    chatInput.style.height = 'auto';
                    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
                });
            }
        },

        handleChatMessage: function(message, container) {
            if (!message.trim()) return;

            // Add user message
            this.addChatMessage(message, 'user', container);

            // Clear input
            const chatInput = document.querySelector('.playground-chat textarea');
            if (chatInput) {
                chatInput.value = '';
                chatInput.style.height = 'auto';
            }

            // Simulate AI response
            setTimeout(() => {
                this.simulateAIResponse(message, container);
            }, 1000);
        },

        simulateAIResponse: function(userMessage, container) {
            const responses = {
                'fibonacci': `Itt egy hatékony Python implementáció a Fibonacci sorozathoz:

\`\`\`python
def fibonacci(n):
    """
    Kiszámolja a Fibonacci sorozat n-edik elemét.
    Memoization technikai a hatékonyság érdekében.
    """
    if n <= 1:
        return n
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    
    return b

# Példa használat
print(fibonacci(10))  # Output: 55
\`\`\`

Ez az implementáció O(n) időkomplexitással és O(1) tárkomplexitással működik.`,

                'default': `Érdekes kérdés! Itt egy részletes válasz a "${userMessage}" témájában:

Az AI modellek fejlesztése során számos tényezőt kell figyelembe venni:
- **Adatminőség**: A jó minőségű training data kulcsfontosságú
- **Architektúra**: A modell architektúrájának megfelelő kiválasztása
- **Optimalizáció**: Hatékony tanítási stratégiák alkalmazása

További kérdéseid vannak ezzel kapcsolatban?`
            };

            const response = userMessage.toLowerCase().includes('fibonacci') ? 
                responses.fibonacci : responses.default;

            this.addChatMessage(response, 'assistant', container);
        },

        formatAIResponse: function(content) {
            // Basic markdown-like formatting
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
                .replace(/\n/g, '<br>');
        },

        startRealTimeMetrics: function() {
            const metrics = document.querySelectorAll('.metric-value');
            
            // Animate counter on page load
            metrics.forEach(metric => {
                this.animateCounter(metric);
            });

            // Update metrics periodically
            setInterval(() => {
                this.updateMetrics();
            }, 5000);
        },

        animateCounter: function(element) {
            const target = parseFloat(element.textContent);
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }

                if (element.textContent.includes('%')) {
                    element.textContent = current.toFixed(1) + '%';
                } else if (element.textContent.includes('ms')) {
                    element.textContent = '< ' + Math.round(current) + 'ms';
                } else if (element.textContent.includes('+')) {
                    element.textContent = Math.round(current) + '+';
                } else {
                    element.textContent = Math.round(current);
                }
            }, 16);
        },

        updateMetrics: function() {
            // Simulate real-time metric updates
            this.realTimeMetrics.requests += Math.floor(Math.random() * 100);
            this.realTimeMetrics.inference = Math.max(45, Math.min(50, this.realTimeMetrics.inference + (Math.random() - 0.5) * 2));

            // Update displays with smooth animations
            const requestsElement = document.querySelector('[data-metric="requests"]');
            if (requestsElement) {
                requestsElement.style.transform = 'scale(1.1)';
                requestsElement.textContent = this.formatNumber(this.realTimeMetrics.requests) + '/day';
                setTimeout(() => {
                    requestsElement.style.transform = 'scale(1)';
                }, 200);
            }
        },

        setupPremiumEffects: function() {
            // Parallax effect for hero background
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                const parallaxElements = document.querySelectorAll('.hero::before');
                
                parallaxElements.forEach(el => {
                    el.style.transform = `translateY(${scrolled * 0.5}px)`;
                });
            });

            // Mouse follow effect for premium elements
            document.addEventListener('mousemove', (e) => {
                this.updateMouseFollowEffects(e);
            });

            // Add CSS for animations
            this.injectPremiumStyles();
        },

        updateMouseFollowEffects: function(e) {
            const premiumElements = document.querySelectorAll('.glass-card, .model-card');
            
            premiumElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (y - centerY) / 10;
                    const rotateY = (centerX - x) / 10;
                    
                    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
                } else {
                    el.style.transform = '';
                }
            });
        },

        injectPremiumStyles: function() {
            if (document.getElementById('aihub-premium-styles')) return;

            const style = document.createElement('style');
            style.id = 'aihub-premium-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                
                .message {
                    transition: all 0.4s ease;
                }
                
                .model-card {
                    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
                }
                
                .code-block {
                    background: rgba(0, 0, 0, 0.8);
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 0.5rem 0;
                    font-family: 'JetBrains Mono', monospace;
                    border-left: 3px solid var(--aihub-primary);
                }
            `;
            
            document.head.appendChild(style);
        },

        formatNumber: function(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        },

        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        handleNavigation: function(e) {
            e.preventDefault();
            const target = e.target.getAttribute('href');
            
            if (target && target.startsWith('#')) {
                const targetElement = document.querySelector(target);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        },

        handlePromptTemplate: function(e) {
            const template = e.target;
            const chatInput = document.querySelector('.playground-chat textarea');
            
            if (chatInput) {
                const prompts = {
                    'Code Generation': 'Írj egy Python függvényt, ami...',
                    'Data Analysis': 'Elemezd ezt az adathalmazt és...',
                    'Creative Writing': 'Írj egy kreatív történetet...',
                    'Problem Solving': 'Hogyan oldhatnám meg ezt a problémát...'
                };
                
                chatInput.value = prompts[template.textContent] || template.textContent;
                chatInput.focus();
                
                // Animate template selection
                template.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    template.style.transform = 'scale(1)';
                }, 150);
            }
        },

        triggerPremiumRipple: function(element) {
            const ripple = document.createElement('div');
            ripple.className = 'premium-ripple';
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%);
                transform: scale(0);
                animation: premium-ripple 0.8s ease-out;
                pointer-events: none;
                width: 100px;
                height: 100px;
                left: 50%;
                top: 50%;
                margin-left: -50px;
                margin-top: -50px;
            `;
            
            element.style.position = 'relative';
            element.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 800);
        }
    };

    // Initialize when AEVOREX core is ready
    if (window.AEVOREX && window.AEVOREX.utils) {
        AIHub.init();
    } else {
        window.addEventListener('aevorex:ready', () => {
            AIHub.init();
        });
    }

    // Register module with AEVOREX core if available
    if (window.AEVOREX && window.AEVOREX.modules) {
        AEVOREX.modules.register('AIHub', AIHub);
    }

    // Export for debugging
    window.AIHub = AIHub;

})(); 