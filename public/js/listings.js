
// Handles: creating listings, previewing images, showing full listing details,
// likes, comments, saving/unsaving, and deleting a listing.

//  CREATE LISTING 

/**
 * createListing
 * Sends the completed listing data to the backend.
 * Shows a flash message depending on whether it succeeds or fails.
 */

async function createListing(body) {
  try {
    const data = await jsonFetch(`/${M01031166}/contents`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!data.success) throw data;
    showFlash("Listing published successfully");
    return data;
  } catch (err) {
    showFlash(err.message || "Could not publish listing", "error");
    throw err;
  }
}


// IMAGE PREVIEW 

/**
 * initImagePreview
 * Shows a small preview of the selected images before the listing is published.
 * Each file input is watched separately.
 */

function initImagePreview() {
  const previewContainer = document.getElementById("car-image-preview");
  if (!previewContainer) return;

  previewContainer.innerHTML = "";

  function handlePreview(input) {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement("img");
        img.src = e.target.result;
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }

  ["car-image-1", "car-image-2", "car-image-3"].forEach(id => {
    const el = document.getElementById(id);
    if (el) handlePreview(el);
  });
}


// UPLOAD IMAGES
/**
 * uploadCarImages
 * Gathers all selected image files (1–3) and uploads them to the backend.
 * Returns an array of image URLs the backend responds with.
 */
 
async function uploadCarImages() {
  const files = [];
  ["car-image-1", "car-image-2", "car-image-3"].forEach(id => {
    const input = document.getElementById(id);
    if (input && input.files[0]) files.push(input.files[0]);
  });

  if (!files.length) return [];

  const fd = new FormData();
  files.forEach(f => fd.append("images", f));

  const res = await fetch(`/${M01031166}/upload/car`, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!res.ok || !data.success) throw data;

  return data.urls || [];
}


//  FORM DATA COLLECTION 


/**
 * collectListingForm
 * Reads all create-listing form fields and returns them as a single object.
 * This includes DVLA auto-filled fields plus manual fields that user types.
 */

function collectListingForm() {
  return {
    registrationNumber: getValue("create-registration"),
    title: getValue("create-title"),
    description: getValue("create-description"),
    make: getValue("create-make"),
    model: getValue("create-model"),
    year: Number(getValue("create-year")),
    fuelType: getValue("create-fuel"),
    engineCapacity: Number(getValue("create-engine") || 0),
    colour: getValue("create-colour"),
    co2Emissions: Number(getValue("create-co2") || 0),
    wheelplan: getValue("create-wheelplan"),
    motStatus: getValue("create-mot-status"),
    motExpiryDate: getValue("create-mot-expiry"),
    taxStatus: getValue("create-tax-status"),
    taxDueDate: getValue("create-tax-due"),
    monthOfFirstRegistration: getValue("create-first-reg"),
    dateOfLastV5CIssued: getValue("create-v5c-date"),
    mileage: Number(getValue("create-mileage")),
    price: Number(getValue("create-price")),
    location: getValue("create-location"),
    imagePaths: []
  };
}


// INIT CREATE LISTING FORM

/**
 * initCreateListingForm
 * Hooks up the create-listing form:
 * - Collect form values
 * - Upload images
 * - Submit everything to backend
 * - Reset the form afterwards
 */

function initCreateListingForm() {
  const form = document.getElementById("create-listing-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const body = collectListingForm();
    console.log("FORM BODY:", body);

    if (!body.title || !body.price || !body.location) {
      showFlash("Please fill in title, price, and location", "error");
      return;
    }

    try {
      const urls = await uploadCarImages();
      body.imagePaths = urls;

      await createListing(body);

      form.reset();
      const summary = document.getElementById("cardata-summary");
      if (summary) summary.classList.add("hidden");
      const preview = document.getElementById("car-image-preview");
      if (preview) preview.innerHTML = "";

      showFlash("Listing created successfully");
      await loadFeed();
    } catch {
      return;
    }
  });
}


//  LISTING DETAILS PAGE 

/**
 * loadListingDetails
 * Loads the full details for a single listing:
 * - images, seller info, description, specs
 * - likes, comments
 * - save/unsave status
 * - delete button (if you're the listings owner)
 *
 * Also handles all the interactive buttons on the detail page.
 */


async function loadListingDetails(listingId) {
  const container = document.getElementById("listing-container");
  if (!container) return;

  container.innerHTML = "<p>Loading listing...</p>";

  try {
    const data = await jsonFetch(`/${M01031166}/listings/${listingId}`);
    if (!data.success) throw data;

    const listing = data.listing;
    const owner = data.owner;

    const images = listing.imagePaths || [];
    const comments = listing.comments || [];
    const likes = listing.likes || [];

    const sellerAvatar =
      owner?.profilePic || "/img/default-profile.png";
      // build listing details page
    container.innerHTML = `
      <div class="listing-detail">

        <div class="listing-detail-images">
          ${
            images.length
              ? images
                  .map(
                    url =>
                      `<img src="${url}" class="listing-detail-img">`
                  )
                  .join("")
              : `<img src="/img/no-image.png" class="listing-detail-img">`
          }
        </div>

        <div class="listing-detail-main">
          <h2 class="listing-detail-title">${listing.title}</h2>
          <p class="listing-detail-price">£${listing.price}</p>
          <p class="listing-detail-meta">
            ${listing.year || ""} · ${listing.mileage || 0} miles · ${
      listing.location || ""
    }
          </p>

          <p class="listing-detail-description">
            ${listing.description}
          </p>

          <div class="listing-extra">
            <p><strong>Make:</strong> ${listing.make}</p>
            <p><strong>Model:</strong> ${listing.model}</p>
            <p><strong>Fuel:</strong> ${listing.fuelType}</p>
            <p><strong>Engine:</strong> ${
              listing.engineCapacity || "N/A"
            } cc</p>
            <p><strong>Colour:</strong> ${listing.colour}</p>
            <p><strong>CO₂:</strong> ${listing.co2Emissions}</p>
            <p><strong>MOT:</strong> ${listing.motStatus}</p>
            <p><strong>MOT Expiry:</strong> ${
              listing.motExpiryDate
            }</p>
            <p><strong>Tax Status:</strong> ${listing.taxStatus}</p>
            <p><strong>Tax Due:</strong> ${listing.taxDueDate}</p>
            <p><strong>First Registered:</strong> ${
              listing.monthOfFirstRegistration
            }</p>
            <p><strong>Last V5C Issued:</strong> ${
              listing.dateOfLastV5CIssued
            }</p>
          </div>

          <div class="listing-detail-seller">
            <h3>Seller</h3>
            <div
              style="display:flex;align-items:center;gap:6px;"
            >
              <img
                class="listing-detail-seller-avatar"
                src="${sellerAvatar}"
              >
              <div>
                <p>@${
                  owner?.username || listing.ownerUsername
                }</p>
                <p>${
                  owner?.role || ""
                } ${owner?.location ? "· " + owner.location : ""}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="listing-social">

          <button id="like-btn" class="like-btn">
            ❤️ Like (${likes.length})
          </button>

          <button id="save-btn" class="secondary-btn">
            ⭐ Save
          </button>

          <div class="comments-section">
            <h3 class="comments-title">Comments</h3>

            <div id="comments-list" class="comments-list">
              ${
                comments.length
                  ? comments
                      .map(
                        c => `
                        <div class="comment-item">
                          <div class="comment-user">@${c.username}</div>
                          <div class="comment-text">${c.text}</div>
                        </div>
                      `
                      )
                      .join("")
                  : "<p class='no-comments'>No comments yet.</p>"
              }
            </div>

            <textarea
              id="new-comment-text"
              class="comment-input"
              placeholder="Write a comment..."
            ></textarea>
            <button
              id="add-comment-btn"
              class="comment-submit-btn"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>
    `;


    // LOGIN STATUS 
    const loginData = await jsonFetch(`/${M01031166}/login`);
    const currentUser = loginData.loggedIn
      ? loginData.username
      : null;


    //  OWNER CONTROLS 
    if (
      owner?.username === currentUser ||
      listing.ownerUsername === currentUser
    ) {
      // Delete a listing button
      const controls = document.createElement("div");
      controls.className = "listing-owner-controls";
      controls.innerHTML = `
        <button class="secondary-btn delete-listing-btn">
          Delete Listing
        </button>
      `;
      container.appendChild(controls);

      const deleteBtn =
        controls.querySelector(".delete-listing-btn");

      if (deleteBtn) {
        let armed = false;

        deleteBtn.onclick = async () => {
          if (!armed) {
            //first click --> confirmation step
            armed = true;
            const original = deleteBtn.textContent;
            deleteBtn.textContent = "Click again to confirm";

            setTimeout(() => {
              armed = false;
              deleteBtn.textContent = original;
            }, 2500);
            return;
          }
            //second click --> Post deleted
          await jsonFetch(
            `/${M01031166}/listings/${listingId}`,
            { method: "DELETE" }
          );

          showFlash("Listing deleted");
          showSection("feed-section");
          setActiveNav("feed-section");
          loadFeed();
        };
      }
    }

    //  LIKE BUTTON 
    const likeBtn = document.getElementById("like-btn");
    if (likeBtn) {
      likeBtn.onclick = async () => {
        try {
          const result = await jsonFetch(
            `/${M01031166}/listings/${listingId}/like`,
            { method: "POST" }
          );

          const count = result.count ?? 0;
          likeBtn.textContent = `❤️ Like (${count})`;
        } catch (err) {
          showFlash(
            err.message || "Could not update like",
            "error"
          );
        }
      };
    }

    // SAVE / UNSAVE a listing
    const saveBtn = document.getElementById("save-btn");
    let isSaved = false;

    if (loginData.loggedIn && saveBtn) {
      try {
        const favData = await jsonFetch(
          `/${M01031166}/favourites`
        );
        const favs = favData.results || [];
        isSaved = favs.some(f => f._id === listing._id);
      } catch {}
    }

    function updateSaveButton() {
      if (!saveBtn) return;
      saveBtn.textContent = isSaved
        ? "⭐ Saved"
        : "⭐ Save";
    }
    updateSaveButton();

    if (saveBtn) {
      saveBtn.onclick = async () => {
        try {
          if (!isSaved) {
            await jsonFetch(
              `/${M01031166}/favourites`,
              {
                method: "POST",
                body: JSON.stringify({ listingId })
              }
            );
            isSaved = true;
            showFlash("Saved to favourites!");
          } else {
            await jsonFetch(
              `/${M01031166}/favourites`,
              {
                method: "DELETE",
                body: JSON.stringify({ listingId })
              }
            );
            isSaved = false;
            showFlash("Removed from favourites");
          }
          updateSaveButton();
        } catch (err) {
          showFlash(
            err.message ||
              "Could not update favourites",
            "error"
          );
        }
      };
    }

    //  COMMENTS 
    const commentBtn =
      document.getElementById("add-comment-btn");
    const commentInput =
      document.getElementById("new-comment-text");
    const commentsList =
      document.getElementById("comments-list");

    if (commentBtn && commentInput && commentsList) {
      commentBtn.onclick = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        try {
          const result = await jsonFetch(
            `/${M01031166}/listings/${listingId}/comments`,
            {
              method: "POST",
              body: JSON.stringify({ text })
            }
          );

          const c = result.comment;
          if (!c) return;

          const placeholder =
            commentsList.querySelector(".no-comments");
          if (placeholder) placeholder.remove();

          const item = document.createElement("div");
          item.className = "comment-item";
          item.innerHTML = `
            <div class="comment-user">@${c.username}</div>
            <div class="comment-text">${c.text}</div>
          `;

          commentsList.appendChild(item);
          commentInput.value = "";
        } catch (err) {
          showFlash(
            err.message ||
              "Could not post comment",
            "error"
          );
        }
      };
    }
    // switch to the listing page
    showSection("listing-section");
    setActiveNav("");
  } catch (err) {
    showFlash(
      err.message || "Could not load listing details",
      "error"
    );
  }
}

// MODULE INITIALISATION 
/**
 * initListings
 * Sets up everything related to listings:
 * - create listing form
 * - image preview
 * - back button on the listing detail page
 */

function initListings() {
  // Connecting create-listing form
  initCreateListingForm();

  // Connecting image preview for listing creation
  initImagePreview();

  // Connecting BACK button in listing view
  const backBtn = document.getElementById("back-to-previous");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showSection("feed-section");
      setActiveNav("feed-section");
      loadFeed();
    });
  }
}



