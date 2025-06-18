/**
 * ==========================================================================
 * CONTENTHUB API CLIENT v1.3 - CORRECTED FOR PORT 8085
 * ==========================================================================
 */

class ContentHubAPIClient {
    constructor() {
        this.isReady = false;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        // CORRECTED: Enable backend by default, since ContentHub has a real backend on 8085
        this.frontendOnly = window.ContentHubConfig?.frontendOnly === true;
        
        if (this.frontendOnly) {
            console.log('📋 ContentHub API Client - Frontend-only mode enabled');
            this.isReady = true;
        } else {
            this.initialize();
        }
    }

    getBaseURL() {
        if (this.frontendOnly) {
            return null; // No backend required
        }
        
        const config = window.ContentHubConfig;
        
        // Frontend-only mode check
        if (config?.frontendOnly || config?.backendPort === null) {
            return null;
        }
        
        // Development environment detection
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // CORRECTED: Use port 8085 for ContentHub backend (not 8083)
            const port = config?.backendPort || '8085';
            return `http://localhost:${port}/api/v1`;
        }
        
        // Production environment
        return 'https://api.aevorex.com/contenthub/v1';
    }

    async request(endpoint, options = {}) {
        // Frontend-only mode: return mock data immediately
        if (this.frontendOnly) {
            console.log(`🎭 Mock API call: ${endpoint}`);
            return this.getMockResponse(endpoint, options);
        }
        
        // Regular API request logic - only if NOT in frontend-only mode
        const baseURL = this.getBaseURL();
        
        // Double-check: if baseURL is null, switch to frontend-only mode
        if (!baseURL) {
            console.log(`🎭 No backend URL available, using mock for: ${endpoint}`);
            return this.getMockResponse(endpoint, options);
        }
        
        const url = `${baseURL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Version': '1.1',
                'X-Platform': 'ContentHub'
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`❌ API Request failed: ${endpoint}`, error);
            
            // Fallback to mock data if API fails
            return this.getMockResponse(endpoint, options);
        }
    }

    // Mock response generator for frontend-only mode
    getMockResponse(endpoint, options = {}) {
        const mockData = {
            '/health': { status: 'frontend-only', mode: 'mock' },
            '/content': { 
                data: [], 
                message: 'Frontend-only mode - No backend required',
                timestamp: new Date().toISOString()
            },
            '/ai/generate': {
                content: 'This is mock AI-generated content for demonstration purposes.',
                status: 'success',
                mode: 'frontend-only'
            }
        };
        
        // Return appropriate mock data
        return Promise.resolve(mockData[endpoint] || { 
            success: true, 
            message: 'Frontend-only mock response',
            endpoint: endpoint 
        });
    }

    // Content management methods
    async getContent(contentId) {
        return this.request(`/content/${contentId}`);
    }

    async createContent(contentData) {
        return this.request('/content', {
            method: 'POST',
            body: JSON.stringify(contentData)
        });
    }

    async updateContent(contentId, contentData) {
        return this.request(`/content/${contentId}`, {
            method: 'PUT',
            body: JSON.stringify(contentData)
        });
    }

    // AI generation endpoints
    async generateContent(prompt, options = {}) {
        return this.request('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt, ...options })
        });
    }

    // Health check
    async healthCheck() {
        if (this.frontendOnly) {
            return Promise.resolve({ 
                status: 'frontend-only', 
                message: 'ContentHub running in frontend-only mode',
                timestamp: new Date().toISOString()
            });
        }
        
        return this.request('/health').catch(() => ({ status: 'offline' }));
    }

    // Initialize for backend mode
    async initialize() {
        try {
            const health = await this.healthCheck();
            this.isReady = true;
            console.log('✅ ContentHub API Client ready:', health);
        } catch (error) {
            console.warn('⚠️ Backend unavailable, switching to frontend-only mode');
            this.frontendOnly = true;
            this.isReady = true;
        }
    }
}

// Initialize and export
const apiClient = new ContentHubAPIClient();
window.ContentHub = window.ContentHub || {};
window.ContentHub.APIClient = apiClient;

export default apiClient; 