/**
 * Vehicle Enrichment Service
 *
 * Orchestrates DVLA, image, and valuation data into a single
 * enriched vehicle object. Each data source is fetched independently;
 * if one fails the others still return.
 */

import { lookupRegistration } from "./dvlaService.js";
import { getVehicleImages } from "./vehicleImageService.js";
import { getValuation } from "./vehicleValuationService.js";

/**
 * Return a fully enriched vehicle object for a registration number.
 * Any unavailable data source is replaced with null — caller must handle gracefully.
 *
 * @param {string} registration
 * @returns {Promise<object>}
 */
export async function getEnrichedVehicle(registration) {
  // Run all sources in parallel; catch individually so one failure doesn't block others
  const [dvlaResult, valuationResult] = await Promise.allSettled([
    lookupRegistration(registration),
    (async () => {
      // We need DVLA data first to get make/model/year for valuation
      // Use a lightweight pre-fetch; if it already resolved above, this is a no-op in practice
      return null; // populated below after DVLA resolves
    })()
  ]);

  const dvlaData =
    dvlaResult.status === "fulfilled" ? dvlaResult.value : null;

  // Fetch images and valuation using DVLA data if available
  const [imagesResult, valuationResult2] = await Promise.allSettled([
    getVehicleImages({
      make: dvlaData?.make,
      model: dvlaData?.model,
      year: dvlaData?.yearOfManufacture,
      colour: dvlaData?.colour
    }),
    getValuation({
      make: dvlaData?.make,
      model: dvlaData?.model,
      year: dvlaData?.yearOfManufacture,
      mileage: null, // not available from DVLA
      fuelType: dvlaData?.fuelType
    })
  ]);

  return {
    registration: registration.toUpperCase().replace(/\s+/g, ""),
    dvla: dvlaData,
    images: imagesResult.status === "fulfilled" ? imagesResult.value : [],
    valuation:
      valuationResult2.status === "fulfilled" ? valuationResult2.value : null,
    enrichedAt: new Date().toISOString()
  };
}
