/**
 * Vehicle Valuation Service
 *
 * Provider-agnostic module for retrieving market value estimates.
 * Falls back to a rule-based estimate if no API key is configured.
 *
 * Suggested providers:
 *   - cap-hpi.com (industry standard)
 *   - motorway.co.uk API
 *   - autotrader.co.uk data feed
 *
 * Usage:
 *   const valuation = await getValuation({ make, model, year, mileage, fuelType });
 */

const API_KEY = process.env.VEHICLE_VALUATION_API_KEY || "";

/**
 * Base price table (rough UK market averages by make tier).
 * Used as a fallback when no valuation API is configured.
 */
const BASE_PRICE_BY_TIER = {
  premium: ["BMW", "MERCEDES", "AUDI", "PORSCHE", "LEXUS", "VOLVO", "JAGUAR", "LAND ROVER"],
  mid: ["VOLKSWAGEN", "TOYOTA", "HONDA", "FORD", "VAUXHALL", "NISSAN", "HYUNDAI", "KIA", "MAZDA", "SKODA", "SEAT"],
  budget: [] // everything else
};

function getTier(make = "") {
  const m = make.toUpperCase();
  if (BASE_PRICE_BY_TIER.premium.includes(m)) return "premium";
  if (BASE_PRICE_BY_TIER.mid.includes(m)) return "mid";
  return "budget";
}

/**
 * Rule-based fallback valuation used when no API key is configured.
 * Not accurate — for demonstration / UI purposes only.
 */
function ruleBasedEstimate({ make, year, mileage } = {}) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - (Number(year) || currentYear);
  const tier = getTier(make);

  const baseValues = { premium: 28000, mid: 14000, budget: 7000 };
  let base = baseValues[tier];

  // Depreciation: ~15% per year, compounding
  base = base * Math.pow(0.85, age);

  // Mileage adjustment: -£0.05 per mile above 10k average/year
  const expectedMileage = age * 10000;
  const mileageDelta = (Number(mileage) || 0) - expectedMileage;
  base -= mileageDelta * 0.05;

  const estimate = Math.max(500, Math.round(base / 100) * 100);

  return {
    estimatedValue: estimate,
    lowerBound: Math.round(estimate * 0.88 / 100) * 100,
    upperBound: Math.round(estimate * 1.12 / 100) * 100,
    currency: "GBP",
    source: "rule-based-estimate",
    disclaimer: "This is an approximate estimate only. For an accurate valuation, consult a professional."
  };
}

/**
 * Get a market valuation for a vehicle.
 * @param {object} params - { make, model, year, mileage, fuelType }
 * @returns {Promise<object>} Valuation object
 */
export async function getValuation({ make, model, year, mileage, fuelType } = {}) {
  if (!API_KEY) {
    // Return rule-based estimate as fallback
    return ruleBasedEstimate({ make, year, mileage });
  }

  // ── PROVIDER IMPLEMENTATION SLOT ──────────────────────────────────────────
  // Replace this block with the actual provider API call.
  // ──────────────────────────────────────────────────────────────────────────

  return ruleBasedEstimate({ make, year, mileage });
}
