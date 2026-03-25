"""
Vehicle Price Estimator
-----------------------
Estimates whether a listing price is FAIR, LOW, or HIGH relative to
a market baseline, and returns a confidence score.

Architecture notes:
- Currently uses a rule-based regression model as a realistic baseline.
- The `PriceModel` class is designed to be swapped for a trained
  scikit-learn model (e.g. RandomForestRegressor) once training data
  is available. The interface stays the same.
- Training data slot is clearly marked below.
"""

from dataclasses import dataclass
from typing import Optional
import math


# ── MAKE TIER BASELINE (rough UK market averages) ────────────────────────────
PREMIUM_MAKES = {"BMW", "MERCEDES", "MERCEDES-BENZ", "AUDI", "PORSCHE",
                 "LEXUS", "VOLVO", "JAGUAR", "LAND ROVER", "RANGE ROVER", "TESLA"}
MID_MAKES     = {"VOLKSWAGEN", "VW", "TOYOTA", "HONDA", "FORD", "VAUXHALL",
                 "NISSAN", "HYUNDAI", "KIA", "MAZDA", "SKODA", "SEAT", "PEUGEOT",
                 "RENAULT", "CITROEN", "FIAT", "MINI", "ALFA ROMEO"}

# UK market new-car equivalent prices (typical well-spec'd example per tier)
BASE_VALUES = {"premium": 45_000, "mid": 27_000, "budget": 15_000}

# Tiered annual depreciation bands: (from_year, to_year_exclusive, annual_rate)
# Matches typical UK used-car market curves
DEPRECIATION_BANDS = [
    (0,  1,   0.20),   # Year 1: −20% off the forecourt
    (1,  2,   0.15),   # Year 2: −15%
    (2,  3,   0.12),   # Year 3: −12%
    (3,  6,   0.10),   # Years 4-6: −10% per year
    (6,  10,  0.08),   # Years 7-10: −8% per year
    (10, 999, 0.06),   # 11+ years: −6% per year (value floor)
]

MILEAGE_RATE = 0.08   # £0.08 per excess mile above 10k/year average


def _tier(make: str) -> str:
    m = (make or "").upper().strip()
    if m in PREMIUM_MAKES:
        return "premium"
    if m in MID_MAKES:
        return "mid"
    return "budget"


def _fuel_adjustment(fuel_type: str) -> float:
    """Electric/hybrid vehicles hold value better."""
    f = (fuel_type or "").upper()
    if "ELECTRIC" in f:
        return 1.15
    if "HYBRID" in f:
        return 1.12
    if "DIESEL" in f:
        return 0.97
    return 1.0


@dataclass
class PriceEstimate:
    estimated_value:  int
    lower_bound:      int
    upper_bound:      int
    verdict:          str   # "FAIR" | "LOW" | "HIGH"
    deviation_pct:    float
    confidence:       float  # 0.0 – 1.0
    explanation:      str


class PriceModel:
    """
    Rule-based price model.

    ── FUTURE ML UPGRADE SLOT ───────────────────────────────────────────────
    To replace with a trained model:

        from sklearn.ensemble import RandomForestRegressor
        import joblib

        class PriceModel:
            def __init__(self):
                self.model = joblib.load("models/price_model.pkl")
                self.encoder = joblib.load("models/encoder.pkl")

            def estimate(self, make, model, year, mileage, fuel_type):
                features = self.encoder.transform([[make, model, year, mileage, fuel_type]])
                pred = self.model.predict(features)[0]
                return PriceEstimate(estimated_value=int(pred), ...)

    Training data can come from listing history in MongoDB — export
    contents collection and train offline.
    ─────────────────────────────────────────────────────────────────────────
    """

    def estimate(
        self,
        make:       str,
        model:      str,
        year:       Optional[int],
        mileage:    Optional[int],
        fuel_type:  Optional[str],
        listed_price: Optional[float] = None
    ) -> PriceEstimate:
        from datetime import date
        current_year = date.today().year
        age = max(0, current_year - (year or current_year))
        tier = _tier(make)
        base = BASE_VALUES[tier]

        # Tiered depreciation — walk through each age band
        for (band_from, band_to, rate) in DEPRECIATION_BANDS:
            if age <= band_from:
                break
            years_in_band = min(age, band_to) - band_from
            base *= (1 - rate) ** years_in_band

        # Mileage adjustment
        expected_miles = age * 10_000
        excess_miles   = max(0, (mileage or 0) - expected_miles)
        base -= excess_miles * MILEAGE_RATE

        # Fuel adjustment
        base *= _fuel_adjustment(fuel_type)

        # Round to nearest £100
        estimate = max(500, round(base / 100) * 100)
        lower = round(estimate * 0.88 / 100) * 100
        upper = round(estimate * 1.12 / 100) * 100

        # Verdict against listed price
        verdict = "FAIR"
        deviation_pct = 0.0
        if listed_price and listed_price > 0:
            deviation_pct = round((listed_price - estimate) / estimate * 100, 1)
            if deviation_pct > 20:
                verdict = "HIGH"
            elif deviation_pct < -20:
                verdict = "LOW"

        # Confidence: lower for very old/new vehicles or missing data
        confidence = 0.75
        if not year or not mileage:
            confidence = 0.50
        if age > 15:
            confidence = max(0.4, confidence - 0.1)

        explanation = (
            f"Based on a {age}-year-old {tier}-tier vehicle with "
            f"{mileage or 'unknown'} miles, the estimated market value is "
            f"£{estimate:,} (range £{lower:,}–£{upper:,})."
        )

        return PriceEstimate(
            estimated_value=estimate,
            lower_bound=lower,
            upper_bound=upper,
            verdict=verdict,
            deviation_pct=deviation_pct,
            confidence=confidence,
            explanation=explanation
        )


# Module-level singleton
_model = PriceModel()


def estimate_price(
    make: str,
    model: str,
    year: Optional[int],
    mileage: Optional[int],
    fuel_type: Optional[str],
    listed_price: Optional[float] = None
) -> dict:
    result = _model.estimate(make, model, year, mileage, fuel_type, listed_price)
    return {
        "estimatedValue":  result.estimated_value,
        "lowerBound":      result.lower_bound,
        "upperBound":      result.upper_bound,
        "verdict":         result.verdict,
        "deviationPct":    result.deviation_pct,
        "confidence":      result.confidence,
        "explanation":     result.explanation,
        "currency":        "GBP",
        "modelType":       "rule-based"
    }
