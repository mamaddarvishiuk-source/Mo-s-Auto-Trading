/**
 * showFlash
 * Displays a short message at the top of the page.
 * Used for success/error notifications so the user actually knows what just happened.
 */

function showFlash(message, type = "success") {
  const container = document.getElementById("flash-container");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `flash-message ${
    type === "error" ? "flash-error" : "flash-success"
  }`;
  div.textContent = message;
  container.appendChild(div);

  setTimeout(() => div.remove(), 4000);
}

/**
 * showSection
 * Hides every section and makes only the requested one visible.
 * Used whenever the user switches pages inside the app.
 */

function showSection(sectionId) {
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });

  const sec = document.getElementById(sectionId);
  if (sec) {
    sec.classList.add("active");
  }
}

/**
 * setActiveNav
 * Highlights the correct button in the top navigation bar.
 * Makes it clear which page the user is currently on.
 */

function setActiveNav(sectionId) {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    if (btn.dataset.section === sectionId) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

/**
 * setAuthMode
 * Switches between logged-out mode and logged-in mode.
 * Logged out: - Only login/register section is visible.
 * Logged in: - Header appears
 *   - User is taken straight to the feed.
 */

function setAuthMode(loggedIn, username = "") {
  const header = document.getElementById("main-header");
  const authSection = document.getElementById("auth-section");
  const headerUser = document.getElementById("header-username");
  const headerImg = document.getElementById("header-profile-image");

  if (loggedIn) {
    //show header + username 
    if (header) header.classList.remove("hidden");
    if (headerUser) headerUser.textContent = username;

    // hide login and register , feed comes up
    if (authSection) authSection.classList.remove("active");
    showSection("feed-section");
    setActiveNav("feed-section");
  } else {
    //hide header and reset name + avatar
    if (header) header.classList.add("hidden");
    if (headerUser) headerUser.textContent = "";
    if (headerImg) headerImg.src = "/img/default-profile.png";

    //show login and register section 
    showSection("auth-section");
  }
}