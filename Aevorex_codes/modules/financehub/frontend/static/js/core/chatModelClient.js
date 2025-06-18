/**
 * chatModelClient.js – FinanceHub Frontend helper for model‐selection endpoints
 * This file intentionally kept small (<120 LOC) to respect component size guidline.
 */

const API_BASE = "http://localhost:8084/api/v1";

/**
 * Set preferred LLM model for the current session.
 * @param {string} sessionId – opaque id stored in frontend state / cookie
 * @param {string} model – e.g. 'gemini-1.5-pro'
 * @returns {Promise<{success:boolean, ttl:number}>}
 */
export async function setSessionModel(sessionId, model) {
  const resp = await fetch(`${API_BASE}/stock/chat/model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, model })
  });
  if (!resp.ok) throw new Error(`setSessionModel failed ${resp.status}`);
  return resp.json();
}

/**
 * Toggle the deep analysis pipeline for a given chat (Rapid→Deep).
 * @param {string} chatId – Chat UUID returned by backend
 * @param {boolean} needsDeep – true if user explicitly requests deep mode
 * @returns {Promise<{success:boolean}>}
 */
export async function toggleDeep(chatId, needsDeep = true) {
  const resp = await fetch(`${API_BASE}/stock/chat/deep_toggle`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, needs_deep: needsDeep })
  });
  if (!resp.ok) throw new Error(`toggleDeep failed ${resp.status}`);
  return resp.json();
}

/**
 * Convenience wrapper for fetching the model list from backend.
 * (Already exists via modelRegistry.js, but exported here for tree-shaking.)
 */
export async function fetchModelCatalogue(forceRefresh = false) {
  if (!forceRefresh && window.FinHubModels) return window.FinHubModels;
  const resp = await fetch(`${API_BASE}/ai/models`);
  if (!resp.ok) throw new Error(`fetchModelCatalogue failed ${resp.status}`);
  const data = await resp.json();
  window.FinHubModels = data; // simple global cache
  return data;
} 