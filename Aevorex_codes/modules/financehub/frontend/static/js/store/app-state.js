/**
 * ===================================================================
 * APP STATE STORE
 * Centralized state management for FinanceHub
 * Extracted from AppCoordinator for better separation of concerns
 * ===================================================================
 */

class AppState {
    constructor() {
        this.state = {
            currentSymbol: 'AAPL',
            isInitialized: false,
            theme: this.getStoredTheme() || 'dark',
            activeView: 'welcome',
            isLoading: false,
            error: null,
            modules: new Map(),
            user: null,
            preferences: this.getStoredPreferences()
        };

        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 50;
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get specific state property
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set state property
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Add to history
        this.addToHistory(key, oldValue, value);
        
        // Notify subscribers
        this.notifySubscribers(key, value, oldValue);
        
        // Persist certain state changes
        this.persistState(key, value);
    }

    /**
     * Update multiple state properties
     */
    update(updates) {
        const changes = {};
        
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.state[key];
            this.state[key] = value;
            changes[key] = { oldValue, newValue: value };
            
            // Add to history
            this.addToHistory(key, oldValue, value);
            
            // Persist certain state changes
            this.persistState(key, value);
        });
        
        // Notify subscribers of batch update
        this.notifySubscribers('batch_update', changes);
    }

    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            const keySubscribers = this.subscribers.get(key);
            if (keySubscribers) {
                keySubscribers.delete(callback);
                if (keySubscribers.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(key, newValue, oldValue = null) {
        const keySubscribers = this.subscribers.get(key);
        if (keySubscribers) {
            keySubscribers.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in state subscriber for ${key}:`, error);
                }
            });
        }

        // Also notify global subscribers
        const globalSubscribers = this.subscribers.get('*');
        if (globalSubscribers) {
            globalSubscribers.forEach(callback => {
                try {
                    callback(key, newValue, oldValue);
                } catch (error) {
                    console.error('Error in global state subscriber:', error);
                }
            });
        }
    }

    /**
     * Add state change to history
     */
    addToHistory(key, oldValue, newValue) {
        this.history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue
        });

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Get state change history
     */
    getHistory(key = null) {
        if (key) {
            return this.history.filter(entry => entry.key === key);
        }
        return [...this.history];
    }

    /**
     * Persist certain state changes to localStorage
     */
    persistState(key, value) {
        const persistableKeys = ['theme', 'preferences', 'currentSymbol'];
        
        if (persistableKeys.includes(key)) {
            try {
                localStorage.setItem(`financehub_${key}`, JSON.stringify(value));
            } catch (error) {
                console.warn(`Failed to persist state for ${key}:`, error);
            }
        }
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            const stored = localStorage.getItem('financehub_theme');
            if (!stored) return null;

            // Attempt standard JSON parse first (current format = "\"light\"")
            try {
                return JSON.parse(stored);
            } catch (parseErr) {
                // Legacy format support: raw string without quotes (e.g., light / dark)
                console.warn('Theme value was stored in legacy format. Performing one-time migration.');
                // Persist back using the modern quoted JSON format
                localStorage.setItem('financehub_theme', JSON.stringify(stored));
                return stored;
            }
        } catch (error) {
            console.warn('Failed to get stored theme:', error);
            return null;
        }
    }

    /**
     * Get stored preferences from localStorage
     */
    getStoredPreferences() {
        try {
            const stored = localStorage.getItem('financehub_preferences');
            return stored ? JSON.parse(stored) : {
                autoRefresh: true,
                refreshInterval: 30000,
                enableNotifications: false,
                compactMode: false,
                enableAnimations: true
            };
        } catch (error) {
            console.warn('Failed to get stored preferences:', error);
            return {
                autoRefresh: true,
                refreshInterval: 30000,
                enableNotifications: false,
                compactMode: false,
                enableAnimations: true
            };
        }
    }

    /**
     * Reset state to initial values
     */
    reset() {
        const initialState = {
            currentSymbol: 'AAPL',
            isInitialized: false,
            theme: 'dark',
            activeView: 'welcome',
            isLoading: false,
            error: null,
            modules: new Map(),
            user: null,
            preferences: this.getStoredPreferences()
        };

        this.update(initialState);
        this.history = [];
    }

    /**
     * Clear persisted state
     */
    clearPersistedState() {
        const keys = ['theme', 'preferences', 'currentSymbol'];
        keys.forEach(key => {
            try {
                localStorage.removeItem(`financehub_${key}`);
            } catch (error) {
                console.warn(`Failed to clear persisted state for ${key}:`, error);
            }
        });
    }

    /**
     * Get state summary for debugging
     */
    getStateSummary() {
        return {
            stateKeys: Object.keys(this.state),
            subscriberCount: Array.from(this.subscribers.values())
                .reduce((total, set) => total + set.size, 0),
            historySize: this.history.length,
            lastChange: this.history[this.history.length - 1] || null
        };
    }
}

// Create singleton instance
const appState = new AppState();

// Make class and instance globally available
window.AppState = appState;
window.AppStateClass = AppState;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppState,
        appState,
        default: appState
    };
}

// ES6 Export
export { AppState, appState };
export default appState;

console.log('✅ AppState class and singleton exported successfully (CommonJS + ES6 + Global)'); 