// Handles switching sections + loading the right data when the user clicks around
// showSection and setActiveNav are defined in ui.js to avoid duplication.

/**
 * initNavigation
 * Sets up all the top navigation buttons.
 * Whenever a nav button is clicked, it switches to that page
 * and loads whatever data that page needs.
 */

function initNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      if (!target) return;
      // Show the selected section and highlight the correct nav button

      showSection(target);
      setActiveNav(target);
      // Load any page-specific data
      switch (target) {
        case "feed-section":
          if (typeof loadFeed === "function") loadFeed();
          break;

        case "search-section":
          if (typeof initSearchCars === "function") initSearchCars();
          break;

        case "dvla-check-section":
          // nothing extra needed – form is already wired
          break;

        case "create-section":
          // form already wired by initListings
          break;

        case "saved-section":
          if (typeof loadSavedCars === "function") loadSavedCars();
          break;

        case "messages-section":
          if (typeof loadConversations === "function") loadConversations();
          break;

        case "profile-section":
          // Refresh profile info + my listings when user opens profile
          if (typeof refreshProfileSection === "function")
            refreshProfileSection();
          if (typeof loadMyListings === "function") loadMyListings();
          break;

        default:
          break;
      }
    });
  });
}


