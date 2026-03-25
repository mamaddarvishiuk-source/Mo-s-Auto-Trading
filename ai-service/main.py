"""
Mo's Auto Trading — AI Microservice
=====================================
FastAPI application providing AI-powered features for the main Node.js backend.

Endpoints:
  POST /predict-price    — Price fairness estimation
  POST /score-listing    — Listing quality scoring
  POST /recommend        — Similar vehicle recommendations
  GET  /health           — Health check

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

The Node.js backend calls this service via the aiService.js module.
The frontend never calls this service directly.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import logging

from services.price_estimator import estimate_price
from services.listing_analyzer import score_listing
from services.recommender import recommend
from services.fraud_detector import detect_fraud

# ── APP SETUP ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Mo's Auto Trading — AI Service",
    description="Internal AI microservice for vehicle price prediction, listing analysis, and recommendations.",
    version="1.0.0"
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# Only allow calls from the Node.js backend (localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:10000", "http://127.0.0.1:10000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"]
)


# ── REQUEST / RESPONSE MODELS ─────────────────────────────────────────────────

class PricePredictRequest(BaseModel):
    make:         Optional[str]   = None
    model:        Optional[str]   = None
    year:         Optional[int]   = None
    mileage:      Optional[int]   = None
    fuelType:     Optional[str]   = None
    price:        Optional[float] = None   # the listed price to evaluate


class ListingScoreRequest(BaseModel):
    title:               Optional[str]  = None
    description:         Optional[str]  = None
    make:                Optional[str]  = None
    model:               Optional[str]  = None
    year:                Optional[int]  = None
    mileage:             Optional[int]  = None
    price:               Optional[float] = None
    fuelType:            Optional[str]  = None
    colour:              Optional[str]  = None
    engineCapacity:      Optional[int]  = None
    motStatus:           Optional[str]  = None
    location:            Optional[str]  = None
    imagePaths:          Optional[List[str]] = None
    registrationNumber:  Optional[str]  = None
    ownerUsername:       Optional[str]  = None


class RecommendRequest(BaseModel):
    listingId:   Optional[str]  = None
    make:        Optional[str]  = None
    model:       Optional[str]  = None
    year:        Optional[int]  = None
    fuelType:    Optional[str]  = None
    priceRange:  Optional[float] = None
    # In a real deployment, pass recent listings from MongoDB here
    allListings: Optional[List[dict]] = None


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "mo-auto-trading-ai"}


@app.post("/predict-price")
def predict_price(req: PricePredictRequest):
    """
    Returns a price estimate and verdict (FAIR / LOW / HIGH)
    for the given vehicle specification.
    """
    try:
        result = estimate_price(
            make=req.make,
            model=req.model,
            year=req.year,
            mileage=req.mileage,
            fuel_type=req.fuelType,
            listed_price=req.price
        )
        logger.info(f"Price prediction: {req.make} {req.model} {req.year} → {result['verdict']}")
        return result
    except Exception as e:
        logger.error(f"predict-price error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score-listing")
def score_listing_endpoint(req: ListingScoreRequest):
    """
    Analyses listing completeness, image coverage, description quality,
    and fraud signals. Returns a 0–100 quality score with actionable feedback.
    """
    try:
        listing_dict = req.model_dump()
        quality = score_listing(listing_dict)
        fraud   = detect_fraud(listing_dict)

        result = {
            **quality,
            "fraud": fraud
        }
        logger.info(f"Listing scored: {req.title} → {quality['grade']} ({quality['totalScore']})")
        return result
    except Exception as e:
        logger.error(f"score-listing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend")
def recommend_endpoint(req: RecommendRequest):
    """
    Returns similar vehicle listings based on the reference vehicle's
    make, model, year, and price. Requires a list of candidate listings.
    """
    try:
        reference = {
            "make":      req.make,
            "model":     req.model,
            "year":      req.year,
            "fuelType":  req.fuelType,
            "price":     req.priceRange
        }
        all_listings = req.allListings or []

        if not all_listings:
            return {"recommendations": [], "note": "No listing pool provided"}

        recs = recommend(
            reference=reference,
            all_listings=all_listings,
            exclude_id=req.listingId,
            top_n=6
        )

        # Strip MongoDB ObjectId (not JSON-serialisable) before returning
        for r in recs:
            r.pop("_id", None)
            r.pop("comments", None)
            r.pop("likes", None)

        logger.info(f"Recommendations for {req.make} {req.model}: {len(recs)} found")
        return {"recommendations": recs}
    except Exception as e:
        logger.error(f"recommend error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
