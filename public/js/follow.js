/**
 * followUser
 * Sends a request to the server to follow the given user.
 * If it works, the profile section gets refreshed so the changes show instantly.
 */

async function followUser(username) {
  try {
    const data = await jsonFetch(`/${M01031166}/follow`, {
      method: "POST",
      body: JSON.stringify({ targetUsername: username })
    });

    if (!data.success) throw data;

    showFlash(`You are now following @${username}`);
    await refreshProfileSection();
  } catch (err) {
    showFlash(err.message || "Could not follow user", "error");
  }
}

/**
 * unfollowUser
 * Tells the server to remove the follow for the given user.
 * Refreshes the profile panel so the updated counts show right away.
 */

async function unfollowUser(username) {
  try {
    const data = await jsonFetch(`/${M01031166}/follow`, {
      method: "DELETE",
      body: JSON.stringify({ targetUsername: username })
    });

    if (!data.success) throw data;

    showFlash(`Unfollowed @${username}`);
    await refreshProfileSection();
  } catch (err) {
    showFlash(err.message || "Could not unfollow user", "error");
  }
}

/**
 * attachFollowButtons
 * Adds click events to the follow/unfollow buttons created in the user search results.
 * Each button knows the username it belongs to through its dataset.
 */

function attachFollowButtons() {
  document.querySelectorAll(".follow-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      followUser(username);
    });
  });

  document.querySelectorAll(".unfollow-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      unfollowUser(username);
    });
  });
}

/**
 * refreshProfileSection
 * Pulls the latest data for the logged-in user's profile.
 * Updates username, role, location, picture, and the counts for followers/following/listings.
 * Also updates the small avatar and name in the header.
 */

async function refreshProfileSection() {
  try {
    const login = await jsonFetch(`/${M01031166}/login`);
    if (!login.loggedIn) return;

    const data = await jsonFetch(
      `/${M01031166}/profile/${encodeURIComponent(login.username)}`
    );
    if (!data.success) throw data;

    const { user, followersCount, followingCount, listingsCount } = data;

    const usernameEl = document.getElementById("profile-username-display");
    const roleLocEl = document.getElementById("profile-role-location");
    const imgEl = document.getElementById("profile-image");
    const followersEl = document.getElementById("profile-followers-count");
    const followingEl = document.getElementById("profile-following-count");
    const listingsEl = document.getElementById("profile-listings-count");

    if (usernameEl) usernameEl.textContent = user.username;
    if (roleLocEl) {
      roleLocEl.textContent = [user.role, user.location]
        .filter(Boolean)
        .join(" · ");
    }
    if (imgEl) {
      imgEl.src = user.profilePic || "/img/default-profile.png";
    }
    if (followersEl) followersEl.textContent = followersCount;
    if (followingEl) followingEl.textContent = followingCount;
    if (listingsEl) listingsEl.textContent = listingsCount;

    // Update header username + avatar too
    const headerUser = document.getElementById("header-username");
    const headerImg = document.getElementById("header-profile-image");
    if (headerUser) headerUser.textContent = user.username;
    if (headerImg) headerImg.src = user.profilePic || "/img/default-profile.png";
  } catch {
    // If this fails it's not fatal — the rest of the web still works
  }
}

/**
 * initProfileSection
 * Handles uploading a new profile picture.
 * When a user picks a file and clicks upload, it sends it to the server.
 * After a successful upload, the profile image and header image get updated.
 */

function initProfileSection() {
  const input = document.getElementById("profile-image-input");
  const btn = document.getElementById("profile-image-upload-btn");
  if (!input || !btn) return;

  btn.addEventListener("click", async () => {
    if (!input.files[0]) {
      showFlash("Choose an image first", "error");
      return;
    }

    const fd = new FormData();
    fd.append("image", input.files[0]);

    try {
      const res = await fetch(`/${M01031166}/upload/profile`, {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw data;

      const imgEl = document.getElementById("profile-image");
      if (imgEl) imgEl.src = data.url;

      showFlash("Profile picture updated");
      await refreshProfileSection();
    } catch (err) {
      showFlash(err.message || "Could not upload profile image", "error");
    }
  });
}