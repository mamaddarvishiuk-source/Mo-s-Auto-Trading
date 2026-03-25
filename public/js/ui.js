/**
 * ui.js — Core UI state management
 * Controls section visibility, notifications, and auth mode switching.
 */

// ── FLASH NOTIFICATIONS ────────────────────────────────────────────────────

function showFlash(message, type = "success") {
  const container = document.getElementById("flash-container");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `flash-message ${type === "error" ? "flash-error" : "flash-success"}`;
  div.textContent = message;
  container.appendChild(div);

  setTimeout(() => div.remove(), 4000);
}

// ── SECTION VISIBILITY ─────────────────────────────────────────────────────

function showSection(sectionId) {
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add("active");
}

function setActiveNav(sectionId) {
  document.querySelectorAll(".nav-btn[data-section]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === sectionId);
  });
}

// ── AUTH MODE SWITCH ───────────────────────────────────────────────────────

/**
 * Switch the UI between guest mode and logged-in mode.
 *
 * Guest (loggedIn = false):
 *   - Shows the guest nav bar
 *   - Hides the main header
 *   - Shows the homepage section
 *   - Hides auth-only UI elements
 *
 * Logged in (loggedIn = true):
 *   - Hides the guest nav
 *   - Shows the main header with username
 *   - Shows the feed section
 *   - Shows auth-only UI elements
 */
function setAuthMode(loggedIn, username = "") {
  const header     = document.getElementById("main-header");
  const guestNav   = document.getElementById("guest-nav");
  const headerUser = document.getElementById("header-username");
  const headerImg  = document.getElementById("header-profile-image");

  if (loggedIn) {
    // Show full app
    header?.classList.remove("hidden");
    guestNav?.classList.add("hidden");
    if (headerUser) headerUser.textContent = username;

    // Show auth-only elements (quick-post composer, following toggle, etc.)
    document.querySelectorAll(".auth-only").forEach(el => el.classList.remove("hidden"));
    document.querySelectorAll(".auth-only-btn").forEach(el => el.classList.remove("hidden"));

    showSection("feed-section");
    setActiveNav("feed-section");
  } else {
    // Guest mode
    header?.classList.add("hidden");
    guestNav?.classList.remove("hidden");
    if (headerUser) headerUser.textContent = "";
    if (headerImg)  headerImg.src = "/img/default-profile.png";

    // Hide auth-only elements
    document.querySelectorAll(".auth-only").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".auth-only-btn").forEach(el => el.classList.add("hidden"));

    showSection("home-section");
  }
}

// ── GUEST LOGIN PROMPT ─────────────────────────────────────────────────────

/**
 * Returns an HTML block prompting guests to sign in.
 * Used in place of like/save/comment buttons for unauthenticated users.
 */
function guestPromptHTML(actionText = "perform this action") {
  return `
    <div class="guest-gate-prompt">
      <p>Please sign in or create a free account to ${actionText}.</p>
      <button class="primary-btn" onclick="showSection('auth-section')">Sign In</button>
      <button class="secondary-btn" onclick="showSection('auth-section');document.getElementById('show-register').click()">Register Free</button>
    </div>
  `;
}
