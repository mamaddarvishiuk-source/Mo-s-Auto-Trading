/**
 * AI Service — Node.js bridge to the Python FastAPI microservice.
 *
 * All calls go through this module. If the AI service is unavailable,
 * every function returns a graceful fallback — the main app keeps working.
 */

import axios from "axios";

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";
const TIMEOUT = 5000; // 5s — don't let a slow AI service block user requests

/**
 * Generic call wrapper with timeout + fallback.
 */
async function callAI(endpoint, payload) {
  try {
    const res = await axios.post(`${AI_BASE}${endpoint}`, payload, {
      timeout: TIMEOUT,
      headers: { "Content-Type": "application/json" }
    });
    return { success: true, data: res.data };
  } catch (err) {
    const reason = err.code === "ECONNREFUSED" ? "AI service offline" : err.message;
    console.warn(`[aiService] ${endpoint} failed: ${reason}`);
    return { success: false, error: reason };
  }
}

/**
 * Predict whether a listing price is fair, low, or high.
 * @param {object} listing - { make, model, year, mileage, fuelType, price }
 */
export async function predictPrice(listing) {
  return callAI("/predict-price", listing);
}

/**
 * Score the quality of a listing (images, description, completeness).
 * @param {object} listing - full listing document
 */
export async function scoreListing(listing) {
  return callAI("/score-listing", listing);
}

/**
 * Get similar vehicle recommendations.
 * @param {object} params - { listingId, make, model, year, priceRange }
 */
export async function getRecommendations(params) {
  return callAI("/recommend", params);
}
