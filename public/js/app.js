
// Called once the page finishes loading. It kicks off all the front-end
// scripts so the navigation, feed, profile and other features start working.

document.addEventListener("DOMContentLoaded", async () => {

  // Setup navigation buttons and section switching

  initNavigation();

  // Setup auth (login/register forms)
  initAuth();


  // Setup DVLA auto-fill + check forms
  initDvla();

  // Setup listing creation, details view

  if (typeof initListings === "function") {
    initListings();
  }

  // Setup feed controls (filters, quick post)

  if (typeof initFeed === "function") {
    initFeed();
  }

  // Setup messaging UI

  if (typeof initMessages === "function") {
    initMessages();
  }

  // Setup user searching UI

  if (typeof initUserSearch === "function") {
    initUserSearch();
  }

  // Setup profile section (profile picture upload etc.)
  
  if (typeof initProfileSection === "function") {
    initProfileSection();
  }

  // Finally, check if user is already logged in and switch UI mode
  await checkLogin();
});