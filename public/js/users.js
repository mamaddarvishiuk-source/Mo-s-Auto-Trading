/**
 * searchUsers
 * Looks up users whose username contains the given text.
 * If something goes wrong, it just returns an empty list and shows a flash message.
 */

async function searchUsers(query) {
  try {
    const data = await jsonFetch(
      `/${M01031166}/users?q=${encodeURIComponent(query)}`
    );
    return data.results || [];
  } catch (err) {
    showFlash(err.message || "User search failed", "error");
    return [];
  }
}

// CAR SEARCH 
// Simple search for listings based on car make only.

function initSearchCars() {
  const form = document.getElementById("search-cars-form");
  const results = document.getElementById("search-results");

  if (!form || !results) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const make = getValue("search-make");

    // Ask backend for cars filtered by make.
    const data = await jsonFetch(`/${M01031166}/contents?make=${encodeURIComponent(make)}`);
    const listings = data.results || [];

    results.innerHTML = "";

    if (!listings.length) {
      results.innerHTML = "<p>No cars found.</p>";
      return;
    }

    listings.forEach(listing => {
      const img = listing.imagePaths?.[0] || "/img/no-image.png";

      const div = document.createElement("div");
      div.className = "grid-card";
      div.innerHTML = `
        <img src="${img}" class="grid-card-img">
        <div class="grid-card-content">
          <div class="grid-card-price">£${listing.price}</div>
          <div class="grid-card-title">${listing.title}</div>
          <div class="grid-card-meta">${listing.location || ""}</div>
        </div>
      `;

      div.addEventListener("click", () => {
        if (typeof loadListingDetails === "function") {
          loadListingDetails(listing._id);
        }
      });

      results.appendChild(div);
    });
  });
}

/**
 * renderUserList
 * Shows a list of user cards with avatar, follow/unfollow buttons, and message button.
 * This runs whenever the user search input finds new matches.
 */

function renderUserList(list, usersArray) {
  list.innerHTML = "";

  if (!usersArray.length) {
    list.innerHTML = `<p>No users found.</p>`;
    return;
  }

  usersArray.forEach(user => {
    const div = document.createElement("div");
    div.className = "car-card";
    const avatar = user.profilePic || "/img/default-profile.png";

    div.innerHTML = `
      <div class="car-card-header">
        <img src="${avatar}" alt="@${user.username}" class="car-card-avatar">
        <span class="car-card-title">@${user.username}</span>
      </div>
      <div class="car-card-body">
        <button class="secondary-btn follow-btn" data-username="${user.username}">
          Follow
        </button>
        <button class="secondary-btn unfollow-btn" data-username="${user.username}">
          Unfollow
        </button>
        <button class="primary-btn message-btn" data-username="${user.username}">
          Message
        </button>
      </div>
    `;
    list.appendChild(div);
  });

  attachFollowButtons();
  attachMessageButtons();
}

/**
 * attachMessageButtons
 * When you click "Message" on a user card, this opens a chat with that user.
 * It only works if the messaging system is loaded.
 */

function attachMessageButtons() {
  document.querySelectorAll(".message-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.username;
      if (typeof startConversationWith === "function") {
        startConversationWith(target);
      } else {
        showFlash("Messaging not available", "error");
      }
    });
  });
}

/**
 * initUserSearch
 * Sets up the live user search.
 * As the user types in the search box, this fetches matching usernames and displays them.
 */

function initUserSearch() {
  const userSearchInput = document.getElementById("search-user-input");
  const userResults = document.getElementById("user-search-results");

  if (!userSearchInput || !userResults) return;

  userSearchInput.addEventListener("input", async () => {
    const q = userSearchInput.value.trim();
    if (!q) {
      userResults.innerHTML = "";
      return;
    }
    const users = await searchUsers(q);
    renderUserList(userResults, users);
  });
}
// FOLLOWERS / FOLLOWING POPUP
// Shows the list of people who follow you or the people you follow

async function showFollowList(type) {
  const login = await jsonFetch(`/${M01031166}/login`);
  if (!login.loggedIn) return;

  const username = login.username;

  const endpoint =
    type === "followers"
      ? `/${M01031166}/profile/${username}/followers`
      : `/${M01031166}/profile/${username}/following`;

  const data = await jsonFetch(endpoint);
  const usersList = data.users || [];

  const modal = document.getElementById("follow-list-modal");
  const title = document.getElementById("follow-modal-title");
  const list = document.getElementById("follow-modal-list");
  const closeBtn = document.getElementById("follow-modal-close");

  title.textContent = type === "followers" ? "Followers" : "Following";
  list.innerHTML = "";

  if (!usersList.length) {
    list.innerHTML = "<p>No users found.</p>";
  } else {
    usersList.forEach(u => {
      list.innerHTML += `
        <div class="follow-user-row">
          <img src="${u.profilePic || "/img/default-profile.png"}" class="user-avatar-small">
          <span>@${u.username}</span>
        </div>
      `;
    });
  }

  modal.classList.remove("hidden");

  closeBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}

// Click listeners for opening follower/following lists

document.getElementById("open-followers")
  ?.addEventListener("click", () => showFollowList("followers"));

document.getElementById("open-following")
  ?.addEventListener("click", () => showFollowList("following"));
  
/**
 * loadMyListings
 * Loads the current user's own listings and shows them on their profile page.
 * Clicking a listing opens its full detail page.
 */

async function loadMyListings() {
  const data = await jsonFetch(`/${M01031166}/my-listings`);
  if (!data.success) return;

  const container = document.getElementById("profile-listings");
  if (!container) return;

  container.innerHTML = "";

  data.listings.forEach(listing => {
    const img = listing.imagePaths?.[0] || "/img/no-image.png";

    container.innerHTML += `
      <div class="profile-listing-card" data-id="${listing._id}">
        <img src="${img}" class="profile-listing-img">
        <div class="profile-listing-info">
          <p class="profile-listing-title">${listing.title}</p>
          <p class="profile-listing-price">£${listing.price}</p>
        </div>
      </div>
    `;
  });

  document.querySelectorAll(".profile-listing-card").forEach(card => {
    card.addEventListener("click", () => {
      loadListingDetails(card.dataset.id);
    });
  });
}