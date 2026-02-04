

 //checkLogin
 //Asks backend for login status and updates UI mode accordingly.
 // If logged in, also loads profile info and feed.
 // This is called once on page load and also after login or logout.
 // to refresh the UI.
 

async function checkLogin() {
  try {
    const data = await jsonFetch(`/${M01031166}/login`);
    if (data.loggedIn) {
      setAuthMode(true, data.username);

      // Load profile info (including profile picture) into header + profile section
      if (typeof refreshProfileSection === "function") {
        await refreshProfileSection();
      }

      // Load feed once user is confirmed logged in
      if (typeof loadFeed === "function") {
        await loadFeed();
      }
    } else {
      setAuthMode(false);
    }
  } catch {
    setAuthMode(false);
  }
}


 // initAuth
 // Wires up login and register forms and the toggle buttons.
 
function initAuth() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const showLoginBtn = document.getElementById("show-login");
  const showRegisterBtn = document.getElementById("show-register");

  // toggle between login and register forms
  showLoginBtn.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    showLoginBtn.classList.add("active");
    showRegisterBtn.classList.remove("active");
  });

  showRegisterBtn.addEventListener("click", () => {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    showLoginBtn.classList.remove("active");
    showRegisterBtn.classList.add("active");
  });

  // login submit
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const username = getValue("login-username");
    const password = getValue("login-password");

    try {
      const data = await jsonFetch(`/${M01031166}/login`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (!data.success) throw data;
      showFlash("Login successful");
      await checkLogin();
    } catch (err) {
      showFlash(err.message || "Login failed", "error");
    }
  });

  // register submit
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();

    const password = getValue("register-password");
    const confirm = getValue("register-password-confirm");
    if (password !== confirm) {
      showFlash("Passwords do not match", "error");
      return;
    }

    const body = {
      username: getValue("register-username"),
      email: getValue("register-email"),
      password,
      location: getValue("register-location"),
      role: document.getElementById("register-role").value,
      dob: getValue("register-dob")
    };

    try {
      const data = await jsonFetch(`/${M01031166}/users`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (!data.success) throw data;
      showFlash("Registered successfully. You can now log in.");
      showLoginBtn.click();
    } catch (err) {
      showFlash(err.message || "Registration failed", "error");
    }
  });

  // logout
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn.addEventListener("click", async () => {
    try {
      await jsonFetch(`/${M01031166}/login`, { method: "DELETE" });
      showFlash("Logged out");
      setAuthMode(false);
    } catch {
      showFlash("Logout failed", "error");
    }
  });
}