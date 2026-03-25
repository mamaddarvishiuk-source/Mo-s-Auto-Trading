/**
 * Vehicle Image Service
 *
 * Provider-agnostic module for fetching stock vehicle photos.
 * Currently returns placeholder/fallback data — swap the provider
 * implementation below when you have an API key ready.
 *
 * Suggested providers:
 *   - imagin.studio (free tier available)
 *   - car-api.com
 *   - DVSA / external image CDNs
 *
 * Usage:
 *   const images = await getVehicleImages({ make: "BMW", model: "3 Series", year: 2020 });
 */

const API_KEY = process.env.VEHICLE_IMAGE_API_KEY || "";

/**
 * Fetch stock images for a vehicle.
 * @param {object} params - { make, model, year, colour }
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function getVehicleImages({ make, model, year, colour } = {}) {
  // If no API key is configured, return empty array — caller uses fallback image
  if (!API_KEY) {
    return [];
  }

  // ── PROVIDER IMPLEMENTATION SLOT ──────────────────────────────────────────
  // Replace this block with the actual provider SDK/HTTP call.
  // Example (imagin.studio):
  //
  // const url = `https://cdn.imagin.studio/getImage` +
  //   `?customer=${API_KEY}` +
  //   `&make=${encodeURIComponent(make)}` +
  //   `&modelFamily=${encodeURIComponent(model)}` +
  //   `&paintId=colour-${colour?.toLowerCase()}`;
  //
  // return [url];
  // ──────────────────────────────────────────────────────────────────────────

  return [];
}
