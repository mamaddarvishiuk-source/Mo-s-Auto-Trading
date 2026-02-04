
// Handles loading the feed, sorting stuff, and showing everything in the grid.
// Basically the part of the site that tries to keep my homepage alive.

/**
 * loadFeed
 * Gets the feed from the server.
 * If you're following people, it tries to show their posts first.
 * If you're not (or they posted nothing), it just shows every listing instead.
 */

let feedMode = "all";  // "all" or "only following"
async function loadFeed() {
  try {
    let listings = [];

    if (feedMode === "following") {
      const feedData = await jsonFetch(`/${M01031166}/feed`);
      listings = feedData.results || [];
    }

    // If user picked "all" or following feed comes back empty, just load everything

    if (feedMode === "all" || !listings.length) {
      const all = await jsonFetch(`/${M01031166}/contents`);
      listings = all.results || [];
    }

    listings = applyFeedFilters(listings);
    renderFeedGrid(listings);

  } catch (err) {
    showFlash(err.message || "Could not load feed", "error");
  }
}

/**
 * renderFeedGrid
 * Turns a bunch of listings into clickable cards and throws them into the feed grid.
 */

function renderFeedGrid(listings) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!listings.length) {
    grid.innerHTML =
      "<p>No listings to show. Follow some sellers or create your own listing.</p>";
    return;
  }

  listings.forEach(listing => {
    const div = document.createElement("div");
    div.className = "grid-card";

    const title =
      listing.title ||
      `${listing.make || ""} ${listing.model || ""}`.trim() ||
      "Listing";

    const price = listing.price ? `£${listing.price}` : "Price on enquiry";
    const mileage = listing.mileage ? `${listing.mileage} miles` : "";
    const year = listing.year || "";
    const location = listing.location || "";

    let imageUrl;

if (listing.fromQuickFeed) {
  // If it was created from the quick-post box, use the default pic 
  // Basically posting through the quick post box on the feed page is 
  // Only for the buyers who wants to tell other users what kind of car they want
  // And when they publish the post a picture of a "Car wanted" comes up as a default.

  imageUrl = "/img/car-default.png";
} else {
  imageUrl =
    listing.imagePaths && listing.imagePaths.length > 0
      ? listing.imagePaths[0]
      : "/img/car-default.png";
}

    div.innerHTML = `
      <img src="${imageUrl}" class="grid-card-img" alt="${title}" />
      <div class="grid-card-content">
        <div class="grid-card-price">${price}</div>
        <div class="grid-card-title">${title}</div>
        <div class="grid-card-meta">
          ${year ? year : ""} · ${mileage}<br>${location}
        </div>
      </div>
    `;

    div.addEventListener("click", () => {
      if (typeof loadListingDetails === "function") {
        loadListingDetails(listing._id);
      } else {
        showFlash("Listing detail view not available", "error");
      }
    });

    grid.appendChild(div);
  });
}

/**
 * applyFeedFilters
 * Applies whatever sorting option the user picked (newest, oldest, price, etc.)
 * More filtering could go here if needed later.
 */

function applyFeedFilters(list) {
  
  const sortSelectEl = document.getElementById("feed-sort");

 
  const sortOption = sortSelectEl ? sortSelectEl.value : "newest";

  let results = [...list];



  switch (sortOption) {
    case "newest":
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case "oldest":
      results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "pricelow":
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "pricehigh":
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
  }

  return results;
}

/**
 * initFeedControls
 * Hooks up the sorting dropdown and the refresh button.
 * Pretty much the “please reload this mess” part.
 */

function initFeedControls() {
  const refreshBtn = document.getElementById("refresh-feed-btn");
  
  const sortSelect = document.getElementById("feed-sort");

  if (refreshBtn) refreshBtn.addEventListener("click", loadFeed);
  
  if (sortSelect) sortSelect.addEventListener("change", loadFeed);
}

/**
 * initFeedComposer
 * Connects the quick-post bar at the top of the feed.
 * Lets you post simple wanted listings without going through the full form.
 */

function initFeedComposer() {
  const btn = document.getElementById("feed-quick-post-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const title = getValue("feed-quick-title");
    const price = getValue("feed-quick-price");
    const location = getValue("feed-quick-location");

    if (!title) {
      showFlash("Please enter a title", "error");
      return;
    }

    const body = {
      title,
      price: price ? Number(price) : null,
      location,
      fromQuickFeed: true
    };

    try {
      const data = await jsonFetch(`/${M01031166}/contents`, {
        method: "POST",
        body: JSON.stringify(body)
      });

      if (!data.success) throw data;
      showFlash("Quick post published!");

      setValue("feed-quick-title", "");
      setValue("feed-quick-price", "");
      setValue("feed-quick-location", "");

      await loadFeed();
    } catch (err) {
      showFlash(err.message || "Could not publish post", "error");
    }
  });
}

/**
 * loadSavedCars
 * Loads all your favourited cars and shows them.
 * Basically a smaller feed but only for things you saved.
 */

async function loadSavedCars() {
  try {
    const data = await jsonFetch(`/${M01031166}/favourites`);
    const listings = data.results || [];

    const container = document.getElementById("saved-cars-list");
    if (!container) return;

    container.innerHTML = "";
    if (!listings.length) {
      container.innerHTML = "<p>No saved cars yet.</p>";
      return;
    }

    listings.forEach(listing => {
      const div = document.createElement("div");
      div.className = "grid-card";

      const title =
        listing.title ||
        `${listing.make || ""} ${listing.model || ""}`.trim() ||
        "Listing";

      const price = listing.price ? `£${listing.price}` : "Price on enquiry";
      const location = listing.location || "";
      const imageUrl =
        listing.imagePaths && listing.imagePaths.length
          ? listing.imagePaths[0]
          : "/img/no-image.png";

      div.innerHTML = `
        <img src="${imageUrl}" class="grid-card-img" alt="${title}" />
        <div class="grid-card-content">
          <div class="grid-card-price">${price}</div>
          <div class="grid-card-title">${title}</div>
          <div class="grid-card-meta">${location}</div>
        </div>
      `;

      div.addEventListener("click", () => {
        if (typeof loadListingDetails === "function") {
          loadListingDetails(listing._id);
        }
      });

      container.appendChild(div);
    });
  } catch (err) {
    showFlash(err.message || "Could not load saved cars", "error");
  }
}

/**
 * initFeed
 * Sets up everything the feed needs:
 * - sorting
 * - refresh button
 * - quick-post composer
 * - toggling between “all posts” and “following users contents”
 */

function initFeed() {
  initFeedControls();
  initFeedComposer();

  const showAllBtn = document.getElementById("feed-show-all");
  const showFollowingBtn = document.getElementById("feed-show-following");

  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      feedMode = "all";
      loadFeed();
      showFlash("Showing all posts");
    });
  }

  if (showFollowingBtn) {
    showFollowingBtn.addEventListener("click", () => {
      feedMode = "following";
      loadFeed();
      showFlash("Showing posts from people you follow");
    });
  }
}