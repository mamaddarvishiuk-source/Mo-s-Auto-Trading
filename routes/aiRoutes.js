import { Router } from "express";
import { predictPrice, scoreListing, getRecommendations } from "../services/aiService.js";
import { estimatePrice } from "../services/priceAnalysisService.js";

const router = Router();

// ── PRICE PREDICTION ──────────────────────────────────────────────────────────
// POST /api/ai/predict-price
// Body: { make, model, year, mileage, fuelType, price }
router.post("/api/ai/predict-price", async (req, res) => {
  const result = await predictPrice(req.body);
  if (!result.success) {
    // Python service is offline — use Node.js fallback so the UI always has data
    const fallback = estimatePrice(req.body);
    return res.json({ success: true, data: fallback, source: "fallback" });
  }
  res.json({ success: true, data: result.data, source: "python" });
});

// ── LISTING QUALITY SCORE ─────────────────────────────────────────────────────
// POST /api/ai/score-listing
// Body: full listing object
router.post("/api/ai/score-listing", async (req, res) => {
  const result = await scoreListing(req.body);
  if (!result.success) {
    return res.status(503).json({ success: false, message: result.error, data: null });
  }
  res.json({ success: true, data: result.data });
});

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────
// POST /api/ai/recommend
// Body: { listingId, make, model, year, priceRange }
router.post("/api/ai/recommend", async (req, res) => {
  const result = await getRecommendations(req.body);
  if (!result.success) {
    return res.status(503).json({ success: false, message: result.error, data: null });
  }
  res.json({ success: true, data: result.data });
});

export default router;
