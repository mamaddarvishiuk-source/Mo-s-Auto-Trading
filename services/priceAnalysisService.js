/**
 * Node.js price analysis fallback.
 *
 * Mirrors the logic in ai-service/services/price_estimator.py so the AI
 * insights panel works even when the Python microservice is offline.
 * Keep the two files in sync if you adjust market values or thresholds.
 */

const PREMIUM_MAKES = new Set([
  "BMW", "MERCEDES", "MERCEDES-BENZ", "AUDI", "PORSCHE",
  "LEXUS", "VOLVO", "JAGUAR", "LAND ROVER", "RANGE ROVER", "TESLA"
]);

const MID_MAKES = new Set([
  "VOLKSWAGEN", "VW", "TOYOTA", "HONDA", "FORD", "VAUXHALL",
  "NISSAN", "HYUNDAI", "KIA", "MAZDA", "SKODA", "SEAT", "PEUGEOT",
  "RENAULT", "CITROEN", "FIAT", "MINI", "ALFA ROMEO"
]);

const BASE_VALUES = { premium: 45_000, mid: 27_000, budget: 15_000 };

// (from_year, to_year_exclusive, annual_rate)
const DEPRECIATION_BANDS = [
  [0,  1,   0.20],
  [1,  2,   0.15],
  [2,  3,   0.12],
  [3,  6,   0.10],
  [6,  10,  0.08],
  [10, 999, 0.06],
];

const MILEAGE_RATE = 0.08; // £ per excess mile

function _tier(make) {
  const m = (make || "").toUpperCase().trim();
  if (PREMIUM_MAKES.has(m)) return "premium";
  if (MID_MAKES.has(m))     return "mid";
  return "budget";
}

function _fuelAdjustment(fuelType) {
  const f = (fuelType || "").toUpperCase();
  if (f.includes("ELECTRIC")) return 1.15;
  if (f.includes("HYBRID"))   return 1.12;
  if (f.includes("DIESEL"))   return 0.97;
  return 1.0;
}

export function estimatePrice({ make, model, year, mileage, fuelType, price: listedPrice }) {
  const currentYear = new Date().getFullYear();
  const age  = Math.max(0, currentYear - (year || currentYear));
  const tier = _tier(make);
  let   base = BASE_VALUES[tier];

  // Tiered depreciation
  for (const [bandFrom, bandTo, rate] of DEPRECIATION_BANDS) {
    if (age <= bandFrom) break;
    const yearsInBand = Math.min(age, bandTo) - bandFrom;
    base *= (1 - rate) ** yearsInBand;
  }

  // Mileage adjustment
  const expectedMiles = age * 10_000;
  const excessMiles   = Math.max(0, (mileage || 0) - expectedMiles);
  base -= excessMiles * MILEAGE_RATE;

  // Fuel adjustment
  base *= _fuelAdjustment(fuelType);

  // Round to nearest £100
  const estimate = Math.max(500, Math.round(base / 100) * 100);
  const lower    = Math.round(estimate * 0.88 / 100) * 100;
  const upper    = Math.round(estimate * 1.12 / 100) * 100;

  // Verdict
  let verdict      = "FAIR";
  let deviationPct = 0;
  if (listedPrice && listedPrice > 0) {
    deviationPct = Math.round((listedPrice - estimate) / estimate * 1000) / 10;
    if (deviationPct > 20)  verdict = "HIGH";
    if (deviationPct < -20) verdict = "LOW";
  }

  const confidence = (!year || !mileage) ? 0.50 : (age > 15 ? 0.55 : 0.75);

  return {
    estimatedValue: estimate,
    lowerBound:     lower,
    upperBound:     upper,
    verdict,
    deviationPct,
    confidence,
    explanation: `Based on a ${age}-year-old ${tier}-tier vehicle with ${mileage ?? "unknown"} miles, estimated market value is £${estimate.toLocaleString("en-GB")} (range £${lower.toLocaleString("en-GB")}–£${upper.toLocaleString("en-GB")}).`,
    currency:    "GBP",
    modelType:   "rule-based-node-fallback"
  };
}
