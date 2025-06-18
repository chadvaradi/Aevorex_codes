/*
 * modelRegistry.js – lightweight global registry for AI model metadata
 * Keeps FinanceHub frontend decoupled from backend catalogue structure.
 * Requires no build-time import: attaches to window.FinHubModels.
 */
(function (global) {
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  let _cache = null;
  let _fetchedAt = 0;

  async function fetchModels () {
    const now = Date.now();
    if (_cache && (now - _fetchedAt) < CACHE_TTL_MS) {
      return _cache;
    }
    try {
      const baseURL = (global.FinanceHubAPI?.config?.BASE_URL) || 'http://localhost:8084';
      const res = await fetch(`${baseURL}/api/v1/ai/models`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`Catalogue HTTP ${res.status}`);
      _cache = await res.json();
      _fetchedAt = now;
      return _cache;
    } catch (err) {
      console.error('[FinHubModels] Failed to fetch model catalogue', err);
      throw err;
    }
  }

  function getById (id) {
    return _cache?.find(m => m.id === id) || null;
  }

  function cheapest (filter = () => true) {
    return (_cache || []).filter(filter).sort((a,b)=> (a.price_in||0)-(b.price_in||0))[0] || null;
  }

  function fastest () {
    const hintOrder = ['flash','fast','mini','snappy'];
    return (_cache || []).find(m => hintOrder.includes(m.ux_hint));
  }

  // Expose
  global.FinHubModels = {
    fetch: fetchModels,
    getById,
    cheapest,
    fastest,
    selectedId: null // will be set by UI
  };

})(window); 