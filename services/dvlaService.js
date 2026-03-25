import axios from "axios";

const DVLA_URL =
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

/**
 * Look up a UK vehicle registration using the DVLA API.
 * Returns the raw DVLA response object on success.
 * Throws with a clear message on failure.
 */
export async function lookupRegistration(rawReg) {
  if (!rawReg) throw new Error("Registration number is required");

  const registrationNumber = rawReg.toUpperCase().replace(/\s+/g, "");

  const response = await axios.post(
    DVLA_URL,
    { registrationNumber },
    {
      headers: {
        "x-api-key": process.env.DVLA_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      timeout: 8000
    }
  );

  return response.data;
}
