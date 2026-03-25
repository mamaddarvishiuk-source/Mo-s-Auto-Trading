/**
 * auth.js — Login, register, logout, and session check.
 */

// ── SESSION CHECK ──────────────────────────────────────────────────────────

async function checkLogin() {
  try {
    const data = await jsonFetch(`/${M01031166}/login`);
    if (data.loggedIn) {
      setAuthMode(true, data.username);

      // Load profile picture into header
      if (typeof refreshProfileSection === "function") {
        await refreshProfileSection();
      }

      if (typeof loadFeed === "function") {
        await loadFeed();
      }
    } else {
      setAuthMode(false);

      // Load homepage listings for guests
      if (typeof loadHomepageListings === "function") {
        loadHomepageListings();
      }
    }
  } catch {
    setAuthMode(false);
  }
}

// ── AUTH FORMS INIT ────────────────────────────────────────────────────────

function initAuth() {
  const loginForm       = document.getElementById("login-form");
  const registerForm    = document.getElementById("register-form");
  const showLoginBtn    = document.getElementById("show-login");
  const showRegisterBtn = document.getElementById("show-register");

  // ── Toggle between login and register tabs ──────────────────────────────
  showLoginBtn?.addEventListener("click", () => _showLoginTab());
  showRegisterBtn?.addEventListener("click", () => _showRegisterTab());

  // Cross-links inside forms
  document.getElementById("login-to-register")?.addEventListener("click", () => _showRegisterTab());
  document.getElementById("register-to-login")?.addEventListener("click", () => _showLoginTab());

  // Back to browsing from auth page
  document.getElementById("auth-back-btn")?.addEventListener("click", () => {
    showSection("home-section");
  });

  // ── LOGIN ───────────────────────────────────────────────────────────────
  loginForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const username = getValue("login-username");
    const password = getValue("login-password");

    try {
      const data = await jsonFetch(`/${M01031166}/login`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (!data.success) throw data;

      showFlash("Welcome back, " + username + "!");
      await checkLogin();
    } catch (err) {
      showFlash(err.message || "Sign in failed. Check your credentials.", "error");
    }
  });

  // ── REGISTER ────────────────────────────────────────────────────────────
  registerForm?.addEventListener("submit", async e => {
    e.preventDefault();

    const password = getValue("register-password");
    const confirm  = getValue("register-password-confirm");

    if (password !== confirm) {
      showFlash("Passwords do not match.", "error");
      return;
    }

    if (password.length < 6) {
      showFlash("Password must be at least 6 characters.", "error");
      return;
    }

    const body = {
      username: getValue("register-username"),
      email:    getValue("register-email"),
      password,
      location: getValue("register-location"),
      role:     document.getElementById("register-role").value,
      dob:      getValue("register-dob")
    };

    try {
      const data = await jsonFetch(`/${M01031166}/users`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!data.success) throw data;

      showFlash("Account created! Please sign in.");
      _showLoginTab();
    } catch (err) {
      showFlash(err.message || "Registration failed.", "error");
    }
  });

  // ── LOGOUT ──────────────────────────────────────────────────────────────
  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    try {
      await jsonFetch(`/${M01031166}/login`, { method: "DELETE" });
      showFlash("You have been signed out.");
      setAuthMode(false);
      if (typeof loadHomepageListings === "function") loadHomepageListings();
    } catch {
      showFlash("Logout failed.", "error");
    }
  });
}

// ── TAB HELPERS ────────────────────────────────────────────────────────────

function _showLoginTab() {
  document.getElementById("login-form")?.classList.remove("hidden");
  document.getElementById("register-form")?.classList.add("hidden");
  document.getElementById("show-login")?.classList.add("active");
  document.getElementById("show-register")?.classList.remove("active");
}

function _showRegisterTab() {
  document.getElementById("login-form")?.classList.add("hidden");
  document.getElementById("register-form")?.classList.remove("hidden");
  document.getElementById("show-login")?.classList.remove("active");
  document.getElementById("show-register")?.classList.add("active");
}
