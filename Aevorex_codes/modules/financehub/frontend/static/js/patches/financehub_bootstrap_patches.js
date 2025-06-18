/*
 * financehub_bootstrap_patches.js
 * Consolidated bootstrap-level patches and polyfills for FinanceHub.
 * These were previously inlined in financehub.html.
 *
 * Scope:
 *   – Runtime logging guard / __FINANCEHUB_DEBUG flag
 *   – FinanceHubState.init polyfill
 *   – Legacy pre-patches (ChartManager stub, AnalysisBubbles wrapper, etc.)
 *   – FinanceHubChat safe-render patch
 *   – UnifiedChartManager multipanel / study patch
 *   – Skeleton loader enhancer
 *   – FinanceHubAPIService#getStockHeader hot-patch
 *   – TradingView telemetry fetch suppressor
 *   – Chat container ID alias (#chat-messages) for debug tooling compatibility
 *   – Auto-initialisation retries for bubbles & app when polyfills ready
 */

// IIFE wrapper to avoid leaking vars
(() => {
  /* ------------------------------------------------------------
   * 1. Runtime logging guard
   * ---------------------------------------------------------- */
  (() => {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug') === 'true' || localStorage.getItem('fh_debug') === '1';
    window.__FINANCEHUB_DEBUG = debug;
    if (!debug) {
      const noop = () => {};
      ['log', 'info', 'debug', 'warn', 'trace'].forEach(fn => {
        if (console[fn]) {
          console[`_${fn}`] = console[fn];
          console[fn] = noop;
        }
      });
    }
  })();

  /* ------------------------------------------------------------
   * 2. FinanceHubState.init polyfill
   * ---------------------------------------------------------- */
  (() => {
    if (!window.FinanceHubState) {
      window.FinanceHubState = { state: { app: { isInitialized: false, services: { coreReady: false }, performance: { initTime: 0 } } } };
    }
    if (typeof window.FinanceHubState.init !== 'function') {
      window.FinanceHubState.init = function () {
        if (this.state?.app?.isInitialized) return;
        const t = performance.now();
        this.state.app.isInitialized = true;
        this.state.app.services.coreReady = true;
        this.state.app.performance.initTime = t;
        if (typeof this.dispatch === 'function') {
          this.dispatch({ type: 'APP_INITIALIZED', payload: { timestamp: Date.now() } });
        }
        console.log('FinanceHubState.init polyfilled');
      };
    }
  })();

  /* ------------------------------------------------------------
   * 3. Legacy pre-patches & globals
   * ---------------------------------------------------------- */
  (() => {
    // Provide lazy alias: ChartManager → UnifiedChartManager once that class is defined
    if (!window.ChartManager) {
      Object.defineProperty(window, 'ChartManager', {
        configurable: true,
        enumerable: true,
        get() {
          return window.UnifiedChartManager || undefined;
        },
        set(v) {
          // Allow overriding while keeping aliasing behaviour if UnifiedChartManager later loads
          Object.defineProperty(window, 'ChartManager', {
            value: v,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      });
    }

    // Ensure legacy TradingView container id alias
    (() => {
      const legacyId = 'tradingview-chart';
      const altId = 'tradingview_chart';
      const altEl = document.getElementById(altId);
      const legacyEl = document.getElementById(legacyId);
      if (!legacyEl && altEl) {
        altEl.id = legacyId;
        console.info('🩹 Chart container ID aliased from tradingview_chart → tradingview-chart');
      }
    })();

    // Namespace safety
    window.FinanceHub = window.FinanceHub || {};
    window.FinanceHub.components = window.FinanceHub.components || {};

    // Helper to wrap AnalysisBubbles constructor
    const wrapAnalysisBubblesCtor = Orig => {
      if (!Orig || Orig.__patched) return Orig;
      function Patched(arg1, arg2) {
        let options = {};
        if (arg1 && (arg1 instanceof HTMLElement || typeof arg1 === 'string')) {
          options = (arg2 && typeof arg2 === 'object') ? { ...arg2 } : {};
          options.containerId = arg1 instanceof HTMLElement ? (arg1.id || arg1.getAttribute('id') || 'fh-analysis-bubbles') : arg1;
        } else if (typeof arg1 === 'object') {
          options = { ...arg1 };
        }
        options.containerId = options.containerId || 'fh-analysis-bubbles';
        if (!options.apiClient) options.apiClient = window.FinanceHub.components?.api || window.FinanceHubAPIService;
        if (!options.symbol && window.FinanceHubState?.state?.stock?.symbol) {
          options.symbol = window.FinanceHubState.state.stock.symbol;
        }
        return new Orig(options);
      }
      Patched.prototype = Orig.prototype;
      Patched.__patched = true;
      return Patched;
    };

    Object.defineProperty(window, 'AnalysisBubbles', {
      configurable: true,
      enumerable: true,
      set(v) { this._AB = wrapAnalysisBubblesCtor(v); },
      get() { return this._AB; }
    });

    // Stub modules.ui/renderMessage if missing
    window.modules = window.modules || {};
    window.modules.ui = window.modules.ui || {};
    if (typeof window.modules.ui.renderMessage !== 'function') {
      window.modules.ui.renderMessage = () => { console.debug('modules.ui.renderMessage stubbed'); };
    }

    // Stub streaming module
    window.modules.streaming = window.modules.streaming || {};
    if (typeof window.modules.streaming.startStream !== 'function') {
      window.modules.streaming.startStream = () => { console.debug('modules.streaming.startStream stubbed'); return { cancel: () => {} }; };
    }
  })();

  /* ------------------------------------------------------------
   * 4. FinanceHubChat safe-render patch
   * ---------------------------------------------------------- */
  (() => {
    const safePatch = def => {
      if (!def || def.prototype.__fh_safe_render_patch) return;
      const wrap = origFn => function (content = '', options = {}) {
        let message;
        if (typeof origFn === 'function') {
          try { message = origFn.call(this, content, options); } catch (err) { console.error('[FinanceHubChat wrapper] origFn failed', err); }
        }
        try {
          const ui = this.modules?.ui;
          if (ui) {
            if (typeof ui.renderMessage === 'function') {
              // ok
            } else if (typeof ui.addMessage === 'function') {
              ui.renderMessage = (...p) => ui.addMessage(...p);
              if (message) ui.renderMessage(message);
            } else if (typeof window.modules?.ui?.renderMessage === 'function') {
              window.modules.ui.renderMessage(message);
            }
          }
        } catch (fallbackErr) { console.error('[FinanceHubChat wrapper] render fallback failed', fallbackErr); }
        return message;
      };
      if (typeof def.prototype.addAIMessage === 'function') def.prototype.addAIMessage = wrap(def.prototype.addAIMessage);
      if (typeof def.prototype.addUserMessage === 'function') def.prototype.addUserMessage = wrap(def.prototype.addUserMessage);
      def.prototype.__fh_safe_render_patch = true;
    };

    Object.defineProperty(window, 'FinanceHubChat', {
      configurable: true,
      enumerable: true,
      set(v) { safePatch(v); this._FHC = v; },
      get() { return this._FHC; }
    });
  })();

  /* ------------------------------------------------------------
   * 5. UnifiedChartManager monkey-patch
   * ---------------------------------------------------------- */
  (() => {
    Object.defineProperty(window, 'UnifiedChartManager', {
      configurable: true,
      enumerable: true,
      set(v) {
        if (!v) { this._UCM = v; return; }
        if (!v.prototype.__fh_multipanel_patched) {
          const origCreate = v.prototype.createWidgetConfig;
          v.prototype.createWidgetConfig = function () {
            const cfg = origCreate.call(this);
            // ⛔ Do NOT force-add Technical_Rating study; it causes StudyInserter errors when datafeed is custom.
            // cfg.studies = Array.isArray(cfg.studies) ? cfg.studies : [];
            // if (!cfg.studies.includes('Technical_Rating@tv-basicstudies')) cfg.studies.push('Technical_Rating@tv-basicstudies');
            if (Array.isArray(cfg.disabled_features)) cfg.disabled_features = cfg.disabled_features.filter(f => f !== 'header_indicators');
            if (parseInt(cfg.height, 10) < 600) cfg.height = '600';
            return cfg;
          };
          v.prototype.__fh_multipanel_patched = true;
        }
        this._UCM = v;
      },
      get() { return this._UCM; }
    });
  })();

  /* ------------------------------------------------------------
   * 6. Skeleton loader enhancer for placeholder values
   * ---------------------------------------------------------- */
  (() => {
    const PLACEHOLDER_TEXTS = ['N/A', '—', '-', 'N / A', 'n/a', 'na', 'NA'];
    const addSkeleton = el => {
      if (el && !el.classList.contains('skeleton')) {
        el.textContent = '';
        el.classList.add('skeleton');
        if (!el.style.height) el.style.height = '1rem';
      }
    };
    const scan = root => {
      root.querySelectorAll('.metric-value, .tech-value, .fh-value, [data-placeholder]').forEach(el => {
        const txt = (el.textContent || '').trim();
        if (PLACEHOLDER_TEXTS.includes(txt)) addSkeleton(el);
      });
    };
    const onReady = () => scan(document);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else { onReady(); }
    const mo = new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })));
    mo.observe(document.body, { childList: true, subtree: true });
  })();

  /* ------------------------------------------------------------
   * 7. FinanceHubAPIService#getStockHeader hot-patch
   * ---------------------------------------------------------- */
  (() => {
    const API = window.FinanceHubAPIService;
    if (API && API.prototype && typeof API.prototype.getStockHeader !== 'function') {
      API.prototype.getStockHeader = async function (ticker) {
        if (!ticker || typeof ticker !== 'string') throw new Error('Valid ticker symbol is required');
        const cacheKey = `header_${ticker.toUpperCase()}`;
        const cached = this.getFromCache?.(cacheKey, 'stock_header');
        if (cached) return cached;
        const response = await this.makeRequest(`/api/v1/stock/header/${ticker.toUpperCase()}`, { timeout: 10000 });
        if (typeof response.price === 'undefined') throw new Error('Invalid header data format');
        this.setCache?.(cacheKey, response, 'stock_header', 1);
        return response;
      };
      console.info('🩹 Patched FinanceHubAPIService#getStockHeader');
    }
  })();

  /* ------------------------------------------------------------
   * 8. TradingView telemetry fetch suppressor
   * ---------------------------------------------------------- */
  (() => {
    const origFetch = window.fetch;
    window.fetch = function (url, opts) {
      if (typeof url === 'string' && url.includes('telemetry.tradingview.com/widget/report')) {
        return Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' }));
      }
      return origFetch.apply(this, arguments);
    };
  })();

  /* ------------------------------------------------------------
   * 8b. TradingView schema-warning suppressor (state unknown)
   * ---------------------------------------------------------- */
  (() => {
    // Patterns covering TradingView schema-type warnings we want to silence
    const PATTERNS = [
      'data type: unknown does not match a schema',
      'Property:The state with a data type: unknown does not match a schema',
      'Property: The state with a data type: unknown does not match a schema',
      'The state with a data type: unknown does not match a schema'
    ];

    /**
     * Returns true if ANY of the console arguments include the pattern.
     * Handles diverse argument types (string, object, Error, etc.).
     */
    const matchesPattern = (args) => {
      try {
        return args.some(arg => {
          if (!arg) return false;
          if (typeof arg === 'string') {
            return PATTERNS.some(p => arg.includes(p));
          }
          // Check common shapes (Error, object with message)
          if (arg instanceof Error && arg.message) {
            return PATTERNS.some(p => arg.message.includes(p));
          }
          if (typeof arg === 'object') {
            const str = JSON.stringify(arg);
            return PATTERNS.some(p => str && str.includes(p));
          }
          return false;
        });
      } catch (e) { return false; }
    };

    const intercept = (origFn) => function (...args) {
      if (matchesPattern(args)) {
        // 🔇 Silently swallow TradingView schema warnings
        return;
      }
      return origFn.apply(this, args);
    };

    // Patch all major console levels
    console.warn  = intercept(console.warn);
    console.error = intercept(console.error);
    console.info  = intercept(console.info);
    console.debug = intercept(console.debug);
    console.log   = intercept(console.log);
  })();

  /* ------------------------------------------------------------
   * 8c. ResizeObserver loop error suppressor (Safari/Chrome)
   * ---------------------------------------------------------- */
  (() => {
    const IGNORE_REGEX = /ResizeObserver loop (?:limit exceeded|completed)/i;

    // Intercept global error events
    window.addEventListener('error', (event) => {
      if (event?.message && IGNORE_REGEX.test(event.message)) {
        event.stopImmediatePropagation();
        // ❌ Swallow the error silently
        return;
      }
    }, true);

    // Intercept unhandledrejection messages just in case
    window.addEventListener('unhandledrejection', (event) => {
      const msg = event?.reason?.message || event?.reason;
      if (typeof msg === 'string' && IGNORE_REGEX.test(msg)) {
        event.preventDefault();
      }
    });

    // Patch console.error as additional safety net
    const origError = console.error.bind(console);
    console.error = (...args) => {
      if (args.some(a => typeof a === 'string' && IGNORE_REGEX.test(a))) return;
      origError(...args);
    };
  })();

  /* ------------------------------------------------------------
   * 9. Chat messages container alias for debug tooling
   * ---------------------------------------------------------- */
  (() => {
    const ensureAlias = () => {
      const id = 'chat-messages';
      if (!document.getElementById(id)) {
        const src = document.getElementById('fh-ai-chat__messages') || document.querySelector('.fh-ai-chat__messages');
        if (src) {
          src.id = id;
          console.info('🩹 Added alias id="chat-messages" to chat messages container');
        }
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureAlias, { once: true });
    } else { ensureAlias(); }
  })();

  /* ------------------------------------------------------------
   * 10. Auto-init analysis bubbles & retry initializeFinanceHub
   * ---------------------------------------------------------- */
  (() => {
    const autoInit = (selector, globalKey, ctor) => {
      const run = () => {
        const el = document.getElementById(selector);
        if (el && !window[globalKey] && typeof ctor === 'function') {
          try { window[globalKey] = new ctor(); } catch (err) { console.error(`[AutoInit] ${globalKey} failed`, err); }
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else { run(); }
    };

    // ⛔ DISABLED: Legacy bubble auto-init conflicts with new AnalysisBubbles unified component
    // autoInit('company-overview-bubble', 'companyOverview', window.CompanyOverviewBubble);
    // autoInit('financial-metrics-bubble', 'financialMetrics', window.FinancialMetricsBubble);
    // autoInit('technical-analysis-bubble', 'technicalAnalysis', window.TechnicalAnalysisBubble);

    // Retry app init after polyfills
    if (typeof window.initializeFinanceHub === 'function' && !(window.FinanceHubState?.state?.app?.isInitialized)) {
      setTimeout(() => {
        console.log('🔄 Retrying initializeFinanceHub() after polyfills');
        try { window.initializeFinanceHub(); } catch (reErr) { console.error('Retry initializeFinanceHub failed', reErr); }
      }, 100);
    }
  })();

  /* ------------------------------------------------------------
   * 11. Global unhandled promise rejection handler
   * ---------------------------------------------------------- */
  (() => {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      
      // Suppress known TradingView errors that don't affect functionality
      if (typeof reason === 'string') {
        if (reason.includes('cannot_get_metainfo') || 
            reason.includes('metainfo') ||
            reason.includes('TradingView') ||
            reason.includes('widget')) {
          console.warn('🔇 Suppressed TradingView error:', reason);
          event.preventDefault(); // Prevent the error from being logged
          return;
        }
      }
      
      // Log other unhandled rejections for debugging
      console.error('❌ Unhandled Promise Rejection:', reason);
    });
  })();
})();
