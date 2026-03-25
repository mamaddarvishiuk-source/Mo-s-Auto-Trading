/**
 * listings.js — Create listing, view listing details, likes, comments,
 *               save/unsave, delete, and AI price insights.
 *
 * Protected actions (like, save, comment, message) gracefully degrade
 * to a sign-in prompt for unauthenticated guests.
 */

// ── CREATE LISTING ─────────────────────────────────────────────────────────

async function createListing(body) {
  const data = await jsonFetch(`/${M01031166}/contents`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  if (!data.success) throw data;
  return data;
}

// ── IMAGE PREVIEW ──────────────────────────────────────────────────────────

function initImagePreview() {
  const preview = document.getElementById("car-image-preview");
  if (!preview) return;
  preview.innerHTML = "";

  ["car-image-1", "car-image-2", "car-image-3"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement("img");
        img.src = e.target.result;
        preview.appendChild(img);
        // Update slot label
        const label = input.closest(".image-upload-slot")?.querySelector(".upload-slot-label");
        if (label) label.textContent = "✓ Photo added";
      };
      reader.readAsDataURL(file);
    });
  });
}

// ── UPLOAD IMAGES ──────────────────────────────────────────────────────────

async function uploadCarImages() {
  const files = [];
  ["car-image-1", "car-image-2", "car-image-3"].forEach(id => {
    const input = document.getElementById(id);
    if (input?.files[0]) files.push(input.files[0]);
  });
  if (!files.length) return [];

  const fd = new FormData();
  files.forEach(f => fd.append("images", f));

  const res  = await fetch(`/${M01031166}/upload/car`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.success) throw data;
  return data.urls || [];
}

// ── COLLECT FORM ───────────────────────────────────────────────────────────

function collectListingForm() {
  return {
    registrationNumber:        getValue("create-registration"),
    title:                     getValue("create-title"),
    description:               getValue("create-description"),
    make:                      getValue("create-make"),
    model:                     getValue("create-model"),
    year:                      Number(getValue("create-year")),
    fuelType:                  getValue("create-fuel"),
    engineCapacity:            Number(getValue("create-engine") || 0),
    colour:                    getValue("create-colour"),
    co2Emissions:              Number(getValue("create-co2") || 0),
    wheelplan:                 getValue("create-wheelplan"),
    motStatus:                 getValue("create-mot-status"),
    motExpiryDate:             getValue("create-mot-expiry"),
    taxStatus:                 getValue("create-tax-status"),
    taxDueDate:                getValue("create-tax-due"),
    monthOfFirstRegistration:  getValue("create-first-reg"),
    dateOfLastV5CIssued:       getValue("create-v5c-date"),
    mileage:                   Number(getValue("create-mileage")),
    price:                     Number(getValue("create-price")),
    location:                  getValue("create-location"),
    imagePaths:                []
  };
}

// ── INIT CREATE FORM ───────────────────────────────────────────────────────

function initCreateListingForm() {
  const form = document.getElementById("create-listing-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const body = collectListingForm();

    if (!body.title || !body.price || !body.location) {
      showFlash("Please fill in title, price, and location.", "error");
      return;
    }

    const btn = form.querySelector(".publish-btn");
    if (btn) { btn.disabled = true; btn.textContent = "Publishing…"; }

    try {
      const urls = await uploadCarImages();
      body.imagePaths = urls;
      await createListing(body);

      form.reset();
      document.getElementById("cardata-summary")?.classList.add("hidden");
      document.getElementById("car-image-preview").innerHTML = "";
      document.querySelectorAll(".upload-slot-label").forEach(l => l.textContent = "+ Photo");

      showFlash("Listing published successfully!");
      showSection("feed-section");
      setActiveNav("feed-section");
      await loadFeed();
    } catch (err) {
      showFlash(err.message || "Could not publish listing.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Publish Listing"; }
    }
  });
}

// ── LISTING DETAILS ────────────────────────────────────────────────────────

async function loadListingDetails(listingId) {
  const container = document.getElementById("listing-container");
  if (!container) return;

  container.innerHTML = `<p style="color:#888;padding:40px;text-align:center;">Loading vehicle details…</p>`;
  showSection("listing-section");
  setActiveNav("");

  try {
    // Fetch listing + auth status in parallel
    const [listingData, loginData] = await Promise.all([
      jsonFetch(`/${M01031166}/listings/${listingId}`),
      jsonFetch(`/${M01031166}/login`).catch(() => ({ loggedIn: false }))
    ]);

    if (!listingData.success) throw listingData;

    const listing      = listingData.listing;
    const owner        = listingData.owner;
    const images       = listing.imagePaths || [];
    const comments     = listing.comments   || [];
    const likes        = listing.likes      || [];
    const currentUser  = loginData.loggedIn ? loginData.username : null;
    const sellerAvatar = owner?.profilePic || "/img/default-profile.png";

    // ── BUILD HTML ────────────────────────────────────────────────────────
    container.innerHTML = `
      <div class="listing-detail">

        <!-- Images -->
        <div class="listing-detail-images">
          ${images.length
            ? images.map(url => `<img src="${url}" class="listing-detail-img" loading="lazy">`).join("")
            : `<img src="/img/no-image.png" class="listing-detail-img">`
          }
        </div>

        <!-- Main info -->
        <div class="listing-detail-main">
          <h2 class="listing-detail-title">${_esc(listing.title)}</h2>
          <p class="listing-detail-price">£${Number(listing.price).toLocaleString()}</p>

          <div class="listing-detail-meta">
            ${listing.year     ? `<span>📅 ${listing.year}</span>` : ""}
            ${listing.mileage  ? `<span>🛣 ${Number(listing.mileage).toLocaleString()} miles</span>` : ""}
            ${listing.fuelType ? `<span>⛽ ${_esc(listing.fuelType)}</span>` : ""}
            ${listing.location ? `<span>📍 ${_esc(listing.location)}</span>` : ""}
          </div>

          <p class="listing-detail-description">${_esc(listing.description || "No description provided.")}</p>

          <!-- Specs grid -->
          <div class="listing-extra">
            <p><strong>Make:</strong> ${_esc(listing.make || "—")}</p>
            <p><strong>Model:</strong> ${_esc(listing.model || "—")}</p>
            <p><strong>Fuel:</strong> ${_esc(listing.fuelType || "—")}</p>
            <p><strong>Engine:</strong> ${listing.engineCapacity ? listing.engineCapacity + " cc" : "—"}</p>
            <p><strong>Colour:</strong> ${_esc(listing.colour || "—")}</p>
            <p><strong>CO₂:</strong> ${listing.co2Emissions ? listing.co2Emissions + " g/km" : "—"}</p>
            <p><strong>MOT:</strong> ${_esc(listing.motStatus || "—")}</p>
            <p><strong>MOT Expiry:</strong> ${_esc(listing.motExpiryDate || "—")}</p>
            <p><strong>Tax Status:</strong> ${_esc(listing.taxStatus || "—")}</p>
            <p><strong>Tax Due:</strong> ${_esc(listing.taxDueDate || "—")}</p>
            <p><strong>First Reg:</strong> ${_esc(listing.monthOfFirstRegistration || "—")}</p>
            <p><strong>Last V5C:</strong> ${_esc(listing.dateOfLastV5CIssued || "—")}</p>
          </div>

          <!-- Seller info -->
          <div class="listing-detail-seller">
            <h3>Seller</h3>
            <div class="listing-seller-row">
              <img class="listing-detail-seller-avatar" src="${sellerAvatar}" alt="Seller">
              <div>
                <p style="font-weight:600;">@${_esc(owner?.username || listing.ownerUsername || "Unknown")}</p>
                <p style="font-size:13px;color:#888;">${_esc(owner?.role || "")}${owner?.location ? " · " + owner.location : ""}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- AI insights placeholder (populated async below) -->
        <div id="ai-insights-container"></div>

        <!-- Social actions -->
        <div class="listing-social">
          <div id="listing-actions-row" class="listing-actions-row"></div>
          <div class="comments-section">
            <h3 class="comments-title">Comments (${comments.length})</h3>
            <div id="comments-list" class="comments-list">
              ${comments.length
                ? comments.map(c => `
                    <div class="comment-item">
                      <div class="comment-user">@${_esc(c.username)}</div>
                      <div class="comment-text">${_esc(c.text)}</div>
                    </div>`).join("")
                : "<p class='no-comments'>No comments yet. Be the first!</p>"
              }
            </div>
            <div id="comment-input-area"></div>
          </div>
        </div>

      </div>
    `;

    // ── WIRE ACTIONS (auth-aware) ─────────────────────────────────────────
    _wireListingActions(listing, owner, currentUser, likes, loginData.loggedIn);

    // ── AI INSIGHTS (non-blocking) ────────────────────────────────────────
    _loadAiInsights(listing);

  } catch (err) {
    container.innerHTML = `<p style="color:#c0392b;padding:40px;text-align:center;">Could not load listing: ${err.message || "Unknown error"}</p>`;
  }
}

// ── WIRE ACTIONS ───────────────────────────────────────────────────────────

function _wireListingActions(listing, owner, currentUser, likes, isLoggedIn) {
  const actionsRow      = document.getElementById("listing-actions-row");
  const commentArea     = document.getElementById("comment-input-area");
  const listingId       = listing._id;

  if (!isLoggedIn) {
    // GUEST — show prompt instead of action buttons
    actionsRow.innerHTML = guestPromptHTML("save vehicles, like listings, or contact sellers");
    commentArea.innerHTML = guestPromptHTML("post comments");
    return;
  }

  // ── LIKE BUTTON ────────────────────────────────────────────────────────
  const alreadyLiked = likes.includes(currentUser);
  const likeBtn = document.createElement("button");
  likeBtn.className = "like-btn";
  likeBtn.innerHTML = `${alreadyLiked ? "❤️" : "🤍"} Like (${likes.length})`;

  likeBtn.onclick = async () => {
    try {
      const result = await jsonFetch(`/${M01031166}/listings/${listingId}/like`, { method: "POST" });
      likeBtn.innerHTML = `${result.liked ? "❤️" : "🤍"} Like (${result.count})`;
    } catch (err) {
      showFlash(err.message || "Could not update like.", "error");
    }
  };
  actionsRow.appendChild(likeBtn);

  // ── SAVE BUTTON ────────────────────────────────────────────────────────
  const saveBtn = document.createElement("button");
  saveBtn.className = "secondary-btn";
  saveBtn.textContent = "⭐ Save";
  let isSaved = false;

  // Check if already saved
  jsonFetch(`/${M01031166}/favourites`)
    .then(favData => {
      const favs = favData.results || [];
      isSaved = favs.some(f => f._id === listing._id || String(f._id) === String(listing._id));
      saveBtn.textContent = isSaved ? "⭐ Saved" : "⭐ Save";
    })
    .catch(() => {});

  saveBtn.onclick = async () => {
    try {
      if (!isSaved) {
        await jsonFetch(`/${M01031166}/favourites`, { method: "POST", body: JSON.stringify({ listingId }) });
        isSaved = true;
        saveBtn.textContent = "⭐ Saved";
        showFlash("Saved to your favourites!");
      } else {
        await jsonFetch(`/${M01031166}/favourites`, { method: "DELETE", body: JSON.stringify({ listingId }) });
        isSaved = false;
        saveBtn.textContent = "⭐ Save";
        showFlash("Removed from favourites.");
      }
    } catch (err) {
      showFlash(err.message || "Could not update favourites.", "error");
    }
  };
  actionsRow.appendChild(saveBtn);

  // ── MESSAGE SELLER ─────────────────────────────────────────────────────
  const sellerName = owner?.username || listing.ownerUsername;
  if (sellerName && sellerName !== currentUser) {
    const msgBtn = document.createElement("button");
    msgBtn.className = "secondary-btn";
    msgBtn.textContent = "💬 Message Seller";
    msgBtn.onclick = () => {
      if (typeof startConversationWith === "function") {
        startConversationWith(sellerName);
      } else {
        showSection("messages-section");
        setActiveNav("messages-section");
      }
    };
    actionsRow.appendChild(msgBtn);
  }

  // ── OWNER CONTROLS ─────────────────────────────────────────────────────
  if (sellerName === currentUser || listing.ownerUsername === currentUser) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "secondary-btn";
    deleteBtn.style.marginLeft = "auto";
    deleteBtn.textContent = "Delete Listing";
    let armed = false;

    deleteBtn.onclick = async () => {
      if (!armed) {
        armed = true;
        deleteBtn.textContent = "Confirm delete?";
        deleteBtn.style.borderColor = "#e74c3c";
        deleteBtn.style.color = "#e74c3c";
        setTimeout(() => {
          armed = false;
          deleteBtn.textContent = "Delete Listing";
          deleteBtn.style.borderColor = "";
          deleteBtn.style.color = "";
        }, 2500);
        return;
      }
      await jsonFetch(`/${M01031166}/listings/${listingId}`, { method: "DELETE" });
      showFlash("Listing deleted.");
      showSection("feed-section");
      setActiveNav("feed-section");
      loadFeed();
    };
    actionsRow.appendChild(deleteBtn);
  }

  // ── COMMENT INPUT ──────────────────────────────────────────────────────
  commentArea.innerHTML = `
    <textarea id="new-comment-text" class="comment-input" placeholder="Add a comment…"></textarea>
    <button id="add-comment-btn" class="comment-submit-btn">Post Comment</button>
  `;

  document.getElementById("add-comment-btn")?.addEventListener("click", async () => {
    const text = document.getElementById("new-comment-text")?.value?.trim();
    if (!text) return;

    try {
      const result = await jsonFetch(`/${M01031166}/listings/${listingId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text })
      });

      const c = result.comment;
      if (!c) return;

      const commentsList = document.getElementById("comments-list");
      const placeholder  = commentsList?.querySelector(".no-comments");
      if (placeholder) placeholder.remove();

      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <div class="comment-user">@${_esc(c.username)}</div>
        <div class="comment-text">${_esc(c.text)}</div>
      `;
      commentsList?.appendChild(item);
      document.getElementById("new-comment-text").value = "";
    } catch (err) {
      showFlash(err.message || "Could not post comment.", "error");
    }
  });
}

// ── AI INSIGHTS ────────────────────────────────────────────────────────────

async function _loadAiInsights(listing) {
  const container = document.getElementById("ai-insights-container");
  if (!container) return;

  try {
    const result = await fetch("/api/ai/predict-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make:     listing.make,
        model:    listing.model,
        year:     listing.year,
        mileage:  listing.mileage,
        fuelType: listing.fuelType,
        price:    listing.price
      })
    });

    if (!result.ok) return; // AI service offline — skip silently

    const aiData = await result.json();
    if (!aiData.success || !aiData.data) return;

    const d = aiData.data;
    container.innerHTML = `
      <div class="ai-insights-panel">
        <div class="ai-insights-header">🤖 AI Price Analysis</div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
          <span class="ai-verdict ${d.verdict}">${d.verdict === "FAIR" ? "✓ Fair Price" : d.verdict === "LOW" ? "↓ Below Market" : "↑ Above Market"}</span>
          <span class="ai-score-badge">Market estimate: <strong>£${d.estimatedValue?.toLocaleString()}</strong></span>
          <span class="ai-score-badge">Range: £${d.lowerBound?.toLocaleString()} – £${d.upperBound?.toLocaleString()}</span>
          <span class="ai-score-badge">Confidence: <strong>${Math.round((d.confidence || 0) * 100)}%</strong></span>
        </div>
        <p style="font-size:12px;color:#666;margin-top:10px;">${d.explanation || ""}</p>
      </div>
    `;
  } catch {
    // AI service offline — no UI change, main listing still shows
  }
}

// ── SEARCH (advanced) ──────────────────────────────────────────────────────

function initSearchCars() {
  const form    = document.getElementById("search-cars-form");
  const results = document.getElementById("search-results");
  if (!form || !results) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const params = new URLSearchParams();
    const make  = getValue("search-make");
    const model = getValue("search-model");
    const year  = getValue("search-year");
    const fuel  = document.getElementById("search-fuel")?.value;
    const minP  = getValue("search-min-price");
    const maxP  = getValue("search-max-price");

    if (make)  params.set("make",     make);
    if (model) params.set("model",    model);
    if (year)  params.set("year",     year);
    if (fuel)  params.set("fuelType", fuel);
    if (minP)  params.set("minPrice", minP);
    if (maxP)  params.set("maxPrice", maxP);

    results.innerHTML = `<div class="skeleton-card"></div><div class="skeleton-card"></div>`;

    const data     = await jsonFetch(`/${M01031166}/contents?${params}`);
    const listings = data.results || [];

    results.innerHTML = "";

    if (!listings.length) {
      results.innerHTML = `<p style="color:#888;grid-column:1/-1;padding:40px;text-align:center;">No vehicles matched your search. Try adjusting your filters.</p>`;
      return;
    }

    listings.forEach(listing => {
      const div      = document.createElement("div");
      div.className  = "grid-card";
      const img      = listing.imagePaths?.[0] || "/img/no-image.png";
      const price    = listing.price ? `£${Number(listing.price).toLocaleString()}` : "POA";

      div.innerHTML = `
        <img src="${img}" class="grid-card-img" loading="lazy">
        <div class="grid-card-content">
          <div class="grid-card-price">${price}</div>
          <div class="grid-card-title">${_esc(listing.title || "Listing")}</div>
          <div class="grid-card-meta">
            ${listing.year ? listing.year + " · " : ""}
            ${listing.mileage ? Number(listing.mileage).toLocaleString() + " mi" : ""}
            ${listing.location ? " · 📍 " + _esc(listing.location) : ""}
          </div>
        </div>
      `;

      div.addEventListener("click", () => {
        if (typeof loadListingDetails === "function") loadListingDetails(listing._id);
      });

      results.appendChild(div);
    });
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────

function initListings() {
  initCreateListingForm();
  initImagePreview();
  initSearchCars();
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function _esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
