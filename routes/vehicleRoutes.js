import { Router } from "express";
import { lookupRegistration } from "../services/dvlaService.js";
import { getVehicleImages } from "../services/vehicleImageService.js";
import { getValuation } from "../services/vehicleValuationService.js";
import { getEnrichedVehicle } from "../services/vehicleEnrichmentService.js";

const router = Router();
const ID = "M01031166";

// ── DVLA LOOKUP (existing route — preserved for frontend compatibility) ────────
router.post(`/${ID}/vehicle`, async (req, res) => {
  const { registrationNumber } = req.body;
  if (!registrationNumber) {
    return res.status(400).json({ success: false, message: "registrationNumber is required" });
  }

  try {
    const data = await lookupRegistration(registrationNumber);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.response?.status || 500;
    console.error("DVLA error:", err.response?.data || err.message);
    res.status(status).json({
      success: false,
      message: "DVLA lookup failed",
      error: err.response?.data || null
    });
  }
});

// ── NEW MODULAR API ROUTES ────────────────────────────────────────────────────

// GET /api/vehicle/images/:registration
router.get("/api/vehicle/images/:registration", async (req, res) => {
  try {
    const reg = req.params.registration.toUpperCase().replace(/\s+/g, "");
    const dvlaData = await lookupRegistration(reg);
    const images = await getVehicleImages({
      make: dvlaData.make,
      model: dvlaData.model,
      year: dvlaData.yearOfManufacture,
      colour: dvlaData.colour
    });
    res.json({ success: true, registration: reg, images });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, images: [] });
  }
});

// GET /api/vehicle/valuation/:registration
router.get("/api/vehicle/valuation/:registration", async (req, res) => {
  try {
    const reg = req.params.registration.toUpperCase().replace(/\s+/g, "");
    const dvlaData = await lookupRegistration(reg);
    const valuation = await getValuation({
      make: dvlaData.make,
      model: dvlaData.model,
      year: dvlaData.yearOfManufacture,
      fuelType: dvlaData.fuelType
    });
    res.json({ success: true, registration: reg, valuation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, valuation: null });
  }
});

// GET /api/vehicle/enriched/:registration
router.get("/api/vehicle/enriched/:registration", async (req, res) => {
  try {
    const reg = req.params.registration.toUpperCase().replace(/\s+/g, "");
    const enriched = await getEnrichedVehicle(reg);
    res.json({ success: true, ...enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
