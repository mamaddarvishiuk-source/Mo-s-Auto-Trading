/**
 * mapDvlaToForm
 * Takes DVLA API data and fills out the create-listing form fields.
 */
function mapDvlaToForm(d) {
  setValue("create-make", d.make);
  setValue("create-year", d.yearOfManufacture);
  setValue("create-fuel", d.fuelType);
  setValue("create-engine", d.engineCapacity);
  setValue("create-colour", d.colour);
  setValue("create-co2", d.co2Emissions);
  setValue("create-wheelplan", d.wheelplan);
  setValue("create-mot-status", d.motStatus);
  setValue("create-mot-expiry", d.motExpiryDate);
  setValue("create-tax-status", d.taxStatus);
  setValue("create-tax-due", d.taxDueDate);
  setValue("create-first-reg", d.monthOfFirstRegistration);
  setValue("create-v5c-date", d.dateOfLastV5CIssued);
}

/**
 * renderDvlaSummary
 * Renders a compact summary of vehicle details into the given element id.
 */
function renderDvlaSummary(targetId, d) {
  const el = document.getElementById(targetId);
  el.innerHTML = `
    <strong>${d.registrationNumber}</strong> · ${d.make} · ${d.colour}<br>
    ${d.fuelType}, ${d.yearOfManufacture} · ${d.engineCapacity}cc<br>
    MOT: ${d.motStatus} (expires ${d.motExpiryDate || "N/A"}) ·
    Tax: ${d.taxStatus} ${
      d.taxDueDate ? "(due " + d.taxDueDate + ")" : ""
    }<br>
    CO₂: ${d.co2Emissions || "N/A"} · Wheelplan: ${d.wheelplan}
  `;
  el.classList.remove("hidden");
}

/**
 * initDvla
 * Wires up the DVLA auto-fill button and the standalone DVLA check form.
 */
function initDvla() {
  // Auto-fill in create listing
  document
    .getElementById("fetch-cardata-btn")
    .addEventListener("click", async () => {
      const reg = getValue("create-registration");
      if (!reg) {
        showFlash("Enter a registration number first", "error");
        return;
      }
      try {
        const data = await jsonFetch(`/${M01031166}/vehicle`, {
          method: "POST",
          body: JSON.stringify({ registrationNumber: reg })
        });
        if (!data.success) throw data;
        const d = data.data;
        mapDvlaToForm(d);
        renderDvlaSummary("cardata-summary", d);
        showFlash("Vehicle data loaded from DVLA");
      } catch (err) {
        showFlash(err.message || "DVLA lookup failed", "error");
      }
    });

  // Standalone DVLA check section
  document
    .getElementById("dvla-check-form")
    .addEventListener("submit", async e => {
      e.preventDefault();
      const reg = getValue("dvla-check-reg");
      if (!reg) return;
      try {
        const data = await jsonFetch(`/${M01031166}/vehicle`, {
          method: "POST",
          body: JSON.stringify({ registrationNumber: reg })
        });
        if (!data.success) throw data;
        const d = data.data;
        renderDvlaSummary("dvla-check-result", d);
        showFlash("Vehicle details loaded");
      } catch (err) {
        showFlash(err.message || "DVLA lookup failed", "error");
      }
    });
}