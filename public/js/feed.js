/**
 * feed.js — Feed loading, sorting, quick post, and saved cars.
 * Works for both guests (all listings, no composer) and logged-in users.
 */

let feedMode = "all"; // "all" | "following"

// ── LOAD FEED ──────────────────────────────────────────────────────────────

async function loadFeed(makeFilter) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;

  grid.innerHTML = `<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>`;

  try {
    let listings = [];

    if (feedMode === "following") {
      try {
        const feedData = await jsonFetch(`/${M01031166}/feed`);
        listings = feedData.results || [];
      } catch {
        // Not logged in — fall through to all
        feedMode = "all";
      }
    }

    if (feedMode === "all" || !listings.length) {
      const params = new URLSearchParams();
      if (makeFilter) params.set("make", makeFilter);
      const all = await jsonFetch(`/${M01031166}/contents?${params}`);
      listings = all.results || [];
    }

    listings = applyFeedFilters(listings);
    renderFeedGrid(listings);

  } catch (err) {
    if (grid) grid.innerHTML = `<p style="color:#888;padding:20px;grid-column:1/-1;">Could not load listings. Please try again.</p>`;
  }
}

// ── RENDER GRID ────────────────────────────────────────────────────────────

function renderFeedGrid(listings) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!listings.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
        <p style="color:#888;font-size:1rem;margin-bottom:16px;">No vehicles found matching your search.</p>
        <button class="secondary-btn" onclick="document.getElementById('search-make').value='';loadFeed()">Clear filters</button>
      </div>`;
    return;
  }

  listings.forEach(listing => {
    const div = document.createElement("div");
    div.className = "grid-card";

    const title    = listing.title || `${listing.make || ""} ${listing.model || ""}`.trim() || "Listing";
    const price    = listing.price ? `£${Number(listing.price).toLocaleString()}` : "POA";
    const year     = listing.year     ? `${listing.year}` : "";
    const mileage  = listing.mileage  ? `${Number(listing.mileage).toLocaleString()} mi` : "";
    const fuel     = listing.fuelType ? listing.fuelType : "";
    const location = listing.location || "";
    const metaParts = [year, mileage, fuel].filter(Boolean);

    const imageUrl = listing.fromQuickFeed
      ? "/img/car-default.png"
      : (listing.imagePaths?.[0] || "/img/car-default.png");

    const wantedBadge = listing.fromQuickFeed
      ? `<span class="grid-card-badge">Wanted</span>`
      : "";

    div.innerHTML = `
      <img src="${imageUrl}" class="grid-card-img" alt="${_escFeed(title)}" loading="lazy">
      <div class="grid-card-content">
        <div class="grid-card-price">${price}</div>
        <div class="grid-card-title">${_escFeed(title)}</div>
        <div class="grid-card-meta">
          ${metaParts.join(" · ")}
          ${location ? `<span>📍 ${_escFeed(location)}</span>` : ""}
        </div>
        ${wantedBadge}
      </div>
    `;

    div.addEventListener("click", () => {
      if (typeof loadListingDetails === "function") {
        loadListingDetails(listing._id);
      }
    });

    grid.appendChild(div);
  });
}

// ── SORT / FILTER ──────────────────────────────────────────────────────────

function applyFeedFilters(list) {
  const sortEl = document.getElementById("feed-sort");
  const sort   = sortEl ? sortEl.value : "newest";
  const results = [...list];

  switch (sort) {
    case "newest":   results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case "oldest":   results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case "pricelow": results.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case "pricehigh":results.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
  }
  return results;
}

// ── QUICK POST COMPOSER ────────────────────────────────────────────────────

function initFeedComposer() {
  const btn = document.getElementById("feed-quick-post-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const title    = getValue("feed-quick-title");
    const price    = getValue("feed-quick-price");
    const location = getValue("feed-quick-location");

    if (!title) { showFlash("Please enter a title.", "error"); return; }

    try {
      const data = await jsonFetch(`/${M01031166}/contents`, {
        method: "POST",
        body: JSON.stringify({ title, price: price ? Number(price) : null, location, fromQuickFeed: true })
      });
      if (!data.success) throw data;

      showFlash("Post published!");
      setValue("feed-quick-title", "");
      setValue("feed-quick-price", "");
      setValue("feed-quick-location", "");
      await loadFeed();
    } catch (err) {
      showFlash(err.message || "Could not publish post.", "error");
    }
  });
}

// ── SAVED CARS ─────────────────────────────────────────────────────────────

async function loadSavedCars() {
  const container = document.getElementById("saved-cars-list");
  if (!container) return;

  container.innerHTML = `<div class="skeleton-card"></div><div class="skeleton-card"></div>`;

  try {
    const data = await jsonFetch(`/${M01031166}/favourites`);
    const listings = data.results || [];

    container.innerHTML = "";

    if (!listings.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
          <p style="color:#888;margin-bottom:16px;">No saved vehicles yet.</p>
          <button class="primary-btn" onclick="showSection('feed-section');setActiveNav('feed-section');loadFeed()">Browse Vehicles</button>
        </div>`;
      return;
    }

    listings.forEach(listing => {
      const div = document.createElement("div");
      div.className = "grid-card";

      const title    = listing.title || `${listing.make || ""} ${listing.model || ""}`.trim() || "Listing";
      const price    = listing.price ? `£${Number(listing.price).toLocaleString()}` : "POA";
      const imageUrl = listing.imagePaths?.[0] || "/img/no-image.png";

      div.innerHTML = `
        <img src="${imageUrl}" class="grid-card-img" alt="${_escFeed(title)}" loading="lazy">
        <div class="grid-card-content">
          <div class="grid-card-price">${price}</div>
          <div class="grid-card-title">${_escFeed(title)}</div>
          <div class="grid-card-meta">${listing.location ? `📍 ${_escFeed(listing.location)}` : ""}</div>
        </div>
      `;

      div.addEventListener("click", () => {
        if (typeof loadListingDetails === "function") loadListingDetails(listing._id);
      });
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = `<p style="color:#888;padding:20px;grid-column:1/-1;">Could not load saved vehicles.</p>`;
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────

function initFeed() {
  // Sort dropdown
  document.getElementById("feed-sort")?.addEventListener("change", () => loadFeed());

  // Refresh button
  document.getElementById("refresh-feed-btn")?.addEventListener("click", () => loadFeed());

  // All / Following toggles
  document.getElementById("feed-show-all")?.addEventListener("click", () => {
    feedMode = "all";
    loadFeed();
  });

  document.getElementById("feed-show-following")?.addEventListener("click", () => {
    feedMode = "following";
    loadFeed();
  });

  // Quick post composer
  initFeedComposer();

  // Sync composer avatar with profile pic when available
  _syncComposerAvatar();
}

function _syncComposerAvatar() {
  const composerAvatar = document.getElementById("composer-avatar");
  const headerAvatar   = document.getElementById("header-profile-image");
  if (composerAvatar && headerAvatar) {
    const observer = new MutationObserver(() => {
      composerAvatar.src = headerAvatar.src;
    });
    observer.observe(headerAvatar, { attributes: true, attributeFilter: ["src"] });
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function _escFeed(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
