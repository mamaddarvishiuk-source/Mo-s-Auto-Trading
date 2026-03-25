/**
 * homepage.js — Homepage section logic.
 * Loads stats, featured listings, and wires up homepage interactions.
 * Works for both guests and logged-in users.
 */

// ── FEATURED LISTINGS ──────────────────────────────────────────────────────

async function loadHomepageListings() {
  const grid = document.getElementById("home-featured-grid");
  if (!grid) return;

  try {
    const data = await jsonFetch(`/${M01031166}/contents?sort=newest&limit=8`);
    const listings = data.results || [];

    grid.innerHTML = "";

    if (!listings.length) {
      grid.innerHTML = `<p style="color:#888;grid-column:1/-1;text-align:center;padding:40px 0;">
        No listings yet. <button class="text-link" onclick="showSection('auth-section');document.getElementById('show-register').click()">Be the first to post!</button>
      </p>`;
      return;
    }

    listings.forEach(listing => {
      const card = _buildCard(listing);
      grid.appendChild(card);
    });

    // Update stats after loading
    _updateStats(listings.length);

  } catch {
    // Fail silently — homepage degrades gracefully
    const grid = document.getElementById("home-featured-grid");
    if (grid) grid.innerHTML = "";
  }
}

// ── SITE STATS ─────────────────────────────────────────────────────────────

async function _updateStats(listingsCount) {
  // Update listing count
  const statListings = document.getElementById("stat-listings");
  if (statListings && listingsCount > 0) {
    statListings.textContent = listingsCount + "+";
  }

  // Approximate seller count from user search (just show something meaningful)
  try {
    const userData = await jsonFetch(`/${M01031166}/users?q=`);
    const count = (userData.results || []).length;
    const statSellers = document.getElementById("stat-sellers");
    if (statSellers && count > 0) {
      statSellers.textContent = count + "+";
    }
  } catch { /* ignore */ }
}

// ── CARD BUILDER ───────────────────────────────────────────────────────────

function _buildCard(listing) {
  const div = document.createElement("div");
  div.className = "grid-card";

  const title    = listing.title || `${listing.make || ""} ${listing.model || ""}`.trim() || "Vehicle Listing";
  const price    = listing.price ? `£${Number(listing.price).toLocaleString()}` : "POA";
  const year     = listing.year     ? `${listing.year}` : "";
  const mileage  = listing.mileage  ? `${Number(listing.mileage).toLocaleString()} mi` : "";
  const fuel     = listing.fuelType ? _titleCase(listing.fuelType) : "";
  const location = listing.location || "";
  const imageUrl = listing.fromQuickFeed
    ? "/img/car-default.png"
    : (listing.imagePaths?.[0] || "/img/car-default.png");

  const metaParts = [year, mileage, fuel].filter(Boolean);

  div.innerHTML = `
    <img src="${imageUrl}" class="grid-card-img" alt="${_escape(title)}" loading="lazy">
    <div class="grid-card-content">
      <div class="grid-card-price">${price}</div>
      <div class="grid-card-title">${_escape(title)}</div>
      <div class="grid-card-meta">
        ${metaParts.join(" · ")}
        ${location ? `<span>📍 ${_escape(location)}</span>` : ""}
      </div>
    </div>
  `;

  div.addEventListener("click", () => {
    if (typeof loadListingDetails === "function") {
      loadListingDetails(listing._id);
    }
  });

  return div;
}

// ── HOMEPAGE INTERACTIONS ──────────────────────────────────────────────────

function initHomepage() {
  // Hero search → go to feed with query
  document.getElementById("hero-search-btn")?.addEventListener("click", _doHeroSearch);
  document.getElementById("hero-search-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") _doHeroSearch();
  });

  // Browse all cars
  document.getElementById("hero-browse-btn")?.addEventListener("click", () => {
    showSection("feed-section");
    setActiveNav("feed-section");
    if (typeof loadFeed === "function") loadFeed();
  });

  // View all listings
  document.getElementById("home-view-all-btn")?.addEventListener("click", () => {
    showSection("feed-section");
    setActiveNav("feed-section");
    if (typeof loadFeed === "function") loadFeed();
  });

  // Sell your car → auth if needed
  document.getElementById("hero-sell-btn")?.addEventListener("click", () => {
    const isLoggedIn = !document.getElementById("main-header")?.classList.contains("hidden");
    if (isLoggedIn) {
      showSection("create-section");
      setActiveNav("create-section");
    } else {
      showSection("auth-section");
      document.getElementById("show-register")?.click();
    }
  });

  // Quick filter pills (make search)
  document.querySelectorAll(".quick-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const make = btn.dataset.make;
      showSection("feed-section");
      setActiveNav("feed-section");
      // Set the make filter in search
      const makeInput = document.getElementById("search-make");
      if (makeInput) makeInput.value = make;
      if (typeof loadFeed === "function") loadFeed(make);
    });
  });
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function _doHeroSearch() {
  const query = document.getElementById("hero-search-input")?.value?.trim();
  showSection("feed-section");
  setActiveNav("feed-section");

  if (query) {
    const makeInput = document.getElementById("search-make");
    if (makeInput) makeInput.value = query;
  }

  if (typeof loadFeed === "function") loadFeed(query || "");
}

function _titleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _escape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
