/**
 * navigation.js — Section switching and nav button wiring.
 * Handles both the main header nav (logged-in) and guest nav buttons.
 */

function initNavigation() {
  const guestNav   = document.getElementById("guest-nav");
  const mainHeader = document.getElementById("main-header");

  // ── HAMBURGER TOGGLES ────────────────────────────────────────────────────
  document.getElementById("guest-menu-toggle")?.addEventListener("click", () => {
    guestNav?.classList.toggle("menu-open");
  });

  document.getElementById("main-menu-toggle")?.addEventListener("click", () => {
    mainHeader?.classList.toggle("menu-open");
  });

  function closeMobileMenus() {
    guestNav?.classList.remove("menu-open");
    mainHeader?.classList.remove("menu-open");
  }

  // ── MAIN NAV (logged-in header) ──────────────────────────────────────────
  document.querySelectorAll(".nav-btn[data-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      if (!target) return;
      closeMobileMenus();
      showSection(target);
      setActiveNav(target);
      _loadSectionData(target);
    });
  });

  // ── GUEST NAV BUTTONS ────────────────────────────────────────────────────
  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target   = btn.dataset.goto;
      const authMode = btn.dataset.auth; // "register" to open register tab
      if (!target) return;

      closeMobileMenus();
      showSection(target);

      if (authMode === "register") {
        document.getElementById("show-register")?.click();
      }

      _loadSectionData(target);
    });
  });

  // ── BACK BUTTON (listing detail → previous section) ───────────────────────
  const backBtn = document.getElementById("back-to-previous");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // Go back to feed if logged in, otherwise marketplace
      const loggedInHeader = document.getElementById("main-header");
      const isLoggedIn = loggedInHeader && !loggedInHeader.classList.contains("hidden");
      const target = isLoggedIn ? "feed-section" : "feed-section";
      showSection(target);
      setActiveNav(target);
      if (typeof loadFeed === "function") loadFeed();
    });
  }
}

/**
 * Load section-specific data when navigating.
 * Centralised here so nav buttons and programmatic showSection calls
 * can both trigger data loading.
 */
function _loadSectionData(sectionId) {
  switch (sectionId) {
    case "home-section":
      if (typeof loadHomepageListings === "function") loadHomepageListings();
      break;

    case "feed-section":
      if (typeof loadFeed === "function") loadFeed();
      break;

    case "search-section":
      // form is already wired by initSearchCars
      break;

    case "dvla-check-section":
      // DVLA form is already wired
      break;

    case "saved-section":
      if (typeof loadSavedCars === "function") loadSavedCars();
      break;

    case "messages-section":
      if (typeof loadConversations === "function") loadConversations();
      break;

    case "profile-section":
      if (typeof refreshProfileSection === "function") refreshProfileSection();
      if (typeof loadMyListings === "function") loadMyListings();
      break;

    default:
      break;
  }
}
