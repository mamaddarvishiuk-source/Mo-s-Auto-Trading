/**
 * app.js — Application entry point.
 * Initialises all modules and checks login state on page load.
 */

document.addEventListener("DOMContentLoaded", async () => {

  // Core UI and navigation
  initNavigation();
  initAuth();

  // Feature modules
  initDvla();
  if (typeof initListings   === "function") initListings();
  if (typeof initFeed       === "function") initFeed();
  if (typeof initMessages   === "function") initMessages();
  if (typeof initUserSearch === "function") initUserSearch();
  if (typeof initProfileSection === "function") initProfileSection();
  if (typeof initHomepage   === "function") initHomepage();

  // Check session — sets guest or logged-in UI mode
  await checkLogin();
});
