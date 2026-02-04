
// Simple constant to keep student ID in one place.
const M01031166 = "M01031166";

/**
 * jsonFetch
 * Wrapper around fetch that:
 *  - sends/receives JSON
 *  - parses response
 *  - throws on error to be caught in UI code
 */
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response" };
  }

  if (!res.ok && !data.success) {
    throw data;
  }
  return data;
}

/**
 * getValue
 * Helper to get trimmed value from an input by id.
 */
function getValue(id) {
  return document.getElementById(id).value.trim();
}

/**
 * setValue
 * Helper to set value of an input by id.
 */
function setValue(id, val) {
  document.getElementById(id).value = val ?? "";
}