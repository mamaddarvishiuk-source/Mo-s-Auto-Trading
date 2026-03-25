"""
Listing Quality Analyzer
------------------------
Scores a listing on completeness, image coverage, description quality,
and pricing realism. Returns a 0–100 score with per-category breakdown.

Used by the listing detail page to show sellers how to improve their post,
and to surface high-quality listings higher in search results.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class QualityScore:
    total:       int                   # 0–100
    grade:       str                   # A / B / C / D
    breakdown:   dict = field(default_factory=dict)
    suggestions: list = field(default_factory=list)
    flags:       list = field(default_factory=list)  # serious issues


def _grade(score: int) -> str:
    if score >= 80: return "A"
    if score >= 60: return "B"
    if score >= 40: return "C"
    return "D"


def score_listing(listing: dict) -> dict:
    """
    Analyse a listing document and return a quality score.

    Scoring categories (weights add up to 100):
      - Images          (25 pts)
      - Description     (20 pts)
      - Key specs       (25 pts)
      - Pricing         (15 pts)
      - Contact info    (15 pts — seller profile completeness)
    """
    score = 0
    breakdown = {}
    suggestions = []
    flags = []

    # ── IMAGES (max 25) ───────────────────────────────────────────────────────
    images = listing.get("imagePaths") or []
    img_score = 0
    if len(images) >= 3:
        img_score = 25
    elif len(images) == 2:
        img_score = 18
        suggestions.append("Add a third image to reach the maximum score.")
    elif len(images) == 1:
        img_score = 10
        suggestions.append("Add 2–3 images to significantly improve this listing.")
    else:
        img_score = 0
        flags.append("No images uploaded — listings with photos get 5x more enquiries.")
        suggestions.append("Upload at least one clear photo of the vehicle.")

    breakdown["images"] = img_score
    score += img_score

    # ── DESCRIPTION (max 20) ─────────────────────────────────────────────────
    desc = (listing.get("description") or "").strip()
    desc_score = 0
    if len(desc) >= 200:
        desc_score = 20
    elif len(desc) >= 100:
        desc_score = 14
        suggestions.append("Expand your description to 200+ characters for a higher score.")
    elif len(desc) >= 30:
        desc_score = 8
        suggestions.append("Your description is too short. Include service history, condition notes, and reasons for sale.")
    else:
        desc_score = 0
        flags.append("Description is missing or too short.")
        suggestions.append("Write a detailed description (condition, history, features).")

    breakdown["description"] = desc_score
    score += desc_score

    # ── KEY SPECS (max 25) ────────────────────────────────────────────────────
    required_fields = ["make", "model", "year", "mileage", "fuelType", "price"]
    optional_fields = ["colour", "engineCapacity", "motStatus", "location"]

    filled_required = sum(1 for f in required_fields if listing.get(f))
    filled_optional = sum(1 for f in optional_fields if listing.get(f))

    spec_score = round((filled_required / len(required_fields)) * 18)
    spec_score += round((filled_optional / len(optional_fields)) * 7)

    missing_required = [f for f in required_fields if not listing.get(f)]
    if missing_required:
        suggestions.append(f"Fill in missing fields: {', '.join(missing_required)}.")

    breakdown["specs"] = spec_score
    score += spec_score

    # ── PRICING (max 15) ──────────────────────────────────────────────────────
    price = listing.get("price")
    price_score = 0
    if price and price > 0:
        price_score = 15
        # Flag suspiciously low prices
        if price < 200:
            flags.append("Price looks unusually low — verify before publishing.")
        # Flag very round numbers with no description (lazy listing signal)
        if price % 1000 == 0 and len(desc) < 50:
            suggestions.append("Add a description to justify the asking price.")
    else:
        flags.append("No price set.")
        suggestions.append("Set a price or mark as 'Price on enquiry'.")

    breakdown["pricing"] = price_score
    score += price_score

    # ── CONTACT / SELLER PROFILE (max 15) ────────────────────────────────────
    owner_username = listing.get("ownerUsername", "")
    contact_score = 15 if owner_username else 0
    if not owner_username:
        flags.append("Seller account not linked.")

    breakdown["contact"] = contact_score
    score += contact_score

    # ── FRAUD SIGNALS ─────────────────────────────────────────────────────────
    title = (listing.get("title") or "").lower()
    suspicious_keywords = ["urgent", "scam", "send money", "western union", "bitcoin", "gift card"]
    for kw in suspicious_keywords:
        if kw in title or kw in desc.lower():
            flags.append(f"Suspicious keyword detected: '{kw}'. Review before publishing.")

    grade = _grade(score)

    return {
        "totalScore":  min(100, score),
        "grade":       grade,
        "breakdown":   breakdown,
        "suggestions": suggestions,
        "flags":       flags
    }
