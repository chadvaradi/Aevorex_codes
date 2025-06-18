/**
 * ContentHub Error Handler
 * Centralized error handling and user notifications
 */

class ContentHubErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.init();
        console.log('🚨 Error Handler initialized');
    }

    init() {
        // Global error listeners
        window.addEventListener('error', (e) => this.handleError(e.error, 'JavaScript Error'));
        window.addEventListener('unhandledrejection', (e) => this.handleError(e.reason, 'Unhandled Promise'));
        
        // Custom ContentHub error listeners
        window.addEventListener('contenthub:api-error', (e) => this.handleAPIError(e.detail));
        window.addEventListener('contenthub:module-error', (e) => this.handleModuleError(e.detail));
    }

    handleError(error, type = 'General Error') {
        const errorInfo = {
            id: Date.now(),
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        this.errorQueue.push(errorInfo);
        this.logError(errorInfo);
        this.showUserNotification(errorInfo);
    }

    handleAPIError({ endpoint, error }) {
        const errorInfo = {
            id: Date.now(),
            type: 'API Error',
            message: `API call failed: ${endpoint} - ${error}`,
            endpoint,
            timestamp: new Date().toISOString()
        };

        this.errorQueue.push(errorInfo);
        this.logError(errorInfo);
        this.showUserNotification(errorInfo, 'warning');
    }

    handleModuleError({ module, error, context }) {
        const errorInfo = {
            id: Date.now(),
            type: 'Module Error',
            message: `${module} module error: ${error}`,
            module,
            context,
            timestamp: new Date().toISOString()
        };

        this.errorQueue.push(errorInfo);
        this.logError(errorInfo);
        this.showUserNotification(errorInfo, 'error');
    }

    logError(errorInfo) {
        console.group(`🚨 ${errorInfo.type}`);
        console.error('Message:', errorInfo.message);
        console.error('Timestamp:', errorInfo.timestamp);
        if (errorInfo.stack) console.error('Stack:', errorInfo.stack);
        if (errorInfo.endpoint) console.error('Endpoint:', errorInfo.endpoint);
        if (errorInfo.module) console.error('Module:', errorInfo.module);
        console.groupEnd();
    }

    showUserNotification(errorInfo, severity = 'error') {
        // Try to show in existing notification system first
        if (window.ContentHub?.NotificationManager) {
            window.ContentHub.NotificationManager.show({
                type: severity,
                title: errorInfo.type,
                message: this.getUserFriendlyMessage(errorInfo),
                duration: severity === 'error' ? 8000 : 5000
            });
            return;
        }

        // Fallback: Simple console notification
        console.warn('💡 User notification:', this.getUserFriendlyMessage(errorInfo));
    }

    getUserFriendlyMessage(errorInfo) {
        switch (errorInfo.type) {
            case 'API Error':
                return 'A szerver kapcsolat megszakadt. Próbáld újra néhány másodperc múlva.';
            case 'Module Error':
                return 'Egy komponens betöltési hibát tapasztalt. Frissítsd az oldalt.';
            default:
                return 'Váratlan hiba történt. Ha a probléma továbbra is fennáll, fordulj a támogatáshoz.';
        }
    }

    getErrorHistory() {
        return [...this.errorQueue];
    }

    clearErrorHistory() {
        this.errorQueue = [];
    }
}

// Initialize and export
const errorHandler = new ContentHubErrorHandler();
window.ContentHub = window.ContentHub || {};
window.ContentHub.ErrorHandler = errorHandler;

export default errorHandler; 