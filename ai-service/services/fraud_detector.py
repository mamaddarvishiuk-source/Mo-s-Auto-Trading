"""
Fraud / Suspicious Listing Detector
-------------------------------------
Rule-based analysis of a listing for common fraud patterns and
data anomalies. Returns a risk level and list of specific flags.

This module is intentionally transparent (rule-based, not a black-box model)
so that flagged sellers can understand and correct their listings.
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class FraudResult:
    risk_level: str           # "LOW" | "MEDIUM" | "HIGH"
    risk_score: int           # 0–100
    flags:      List[str] = field(default_factory=list)
    passed:     List[str] = field(default_factory=list)


SUSPICIOUS_WORDS = [
    "western union", "money gram", "bitcoin", "crypto", "gift card",
    "wire transfer", "send deposit", "advance fee", "too good to be true",
    "act now", "urgent sale", "leaving country", "overseas"
]

URGENCY_WORDS = [
    "urgent", "must sell today", "sell asap", "emergency sale", "quick sale"
]


def detect_fraud(listing: dict) -> dict:
    """
    Analyse a listing for fraud signals.

    Risk scoring:
      0–20  → LOW    (normal listing)
      21–49 → MEDIUM (worth reviewing)
      50+   → HIGH   (strong fraud signals)
    """
    risk_score = 0
    flags  = []
    passed = []

    title = (listing.get("title") or "").lower()
    desc  = (listing.get("description") or "").lower()
    text  = title + " " + desc
    price = listing.get("price") or 0
    year  = listing.get("year")
    images = listing.get("imagePaths") or []
    owner  = listing.get("ownerUsername") or ""

    # ── CONTENT CHECKS ────────────────────────────────────────────────────────
    for word in SUSPICIOUS_WORDS:
        if word in text:
            flags.append(f"Suspicious phrase detected: '{word}'")
            risk_score += 25
            break

    for word in URGENCY_WORDS:
        if word in text:
            flags.append(f"High-pressure sales language: '{word}'")
            risk_score += 10
            break

    # ── PRICE CHECKS ──────────────────────────────────────────────────────────
    if price > 0:
        if price < 100:
            flags.append("Price is unrealistically low (< £100).")
            risk_score += 30
        elif price < 500 and year and int(year) > 2015:
            flags.append("Price is unusually low for a recent vehicle.")
            risk_score += 15
        else:
            passed.append("Price is within a plausible range.")
    else:
        flags.append("No price provided.")
        risk_score += 5

    # ── IMAGE CHECKS ──────────────────────────────────────────────────────────
    if not images:
        flags.append("No images — legitimate sellers almost always include photos.")
        risk_score += 15
    elif len(images) >= 2:
        passed.append("Multiple images provided.")

    # ── COMPLETENESS CHECKS ───────────────────────────────────────────────────
    if not listing.get("make"):
        flags.append("Vehicle make is missing.")
        risk_score += 5

    if not listing.get("registrationNumber"):
        flags.append("No registration number — can't verify via DVLA.")
        risk_score += 10
    else:
        passed.append("Registration number provided (DVLA-verifiable).")

    if not owner:
        flags.append("No seller account linked.")
        risk_score += 20

    # ── DESCRIPTION LENGTH ────────────────────────────────────────────────────
    if len(desc) < 20:
        flags.append("Very short description — genuine sellers usually provide details.")
        risk_score += 8
    else:
        passed.append("Description present.")

    # ── RISK LEVEL ────────────────────────────────────────────────────────────
    risk_score = min(100, risk_score)
    if risk_score >= 50:
        risk_level = "HIGH"
    elif risk_score >= 21:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "riskLevel":  risk_level,
        "riskScore":  risk_score,
        "flags":      flags,
        "passed":     passed
    }
