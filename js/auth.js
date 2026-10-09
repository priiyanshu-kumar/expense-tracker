/* ============================================================
   EXPENSE TRACKER - auth.js
   Signup, Login (user + admin), Logout, Session, Page guards
   ============================================================ */

const Auth = (function () {
  /* ---------- helpers ---------- */
  function $(id) {
    // getElementById can be unreliable during early DOM init on some engines;
    // fall back to querySelector so lookups always succeed.
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  }

  function showError(id, message) {
    const el = $(id);
    if (el) el.textContent = message || "";
  }

  function clearErrors(prefix) {
    document.querySelectorAll("[data-error]").forEach((el) => (el.textContent = ""));
    if (prefix) {
      document.querySelectorAll(".field-group").forEach((el) => el.classList.remove("invalid"));
    }
  }

  function markInvalid(id, msg) {
    const field = $(id);
    if (!field) return;
    const group = field.closest(".field-group");
    if (group) group.classList.add("invalid");
    showError(id + "-err", msg);
  }

  function showAlert(boxId, type, message) {
    const box = $(boxId);
    if (!box) return;
    const icons = { success: "circle-check", error: "circle-x", info: "info", warning: "triangle-alert" };
    box.innerHTML =
      '<div class="icon"><i data-lucide="' + (icons[type] || "info") + '"></i></div><div>' + message + "</div>";
    box.className = "alert alert-" + type;
    box.classList.remove("hidden");
    UI.createIcons(box);
  }

  function hideAlert(boxId) {
    const box = $(boxId);
    if (box) box.classList.add("hidden");
  }

  /* ---------- validation ---------- */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^\+?\d{7,15}$/.test(phone.replace(/[\s-]/g, ""));
  }

  /* ---------- signup ---------- */
  function handleSignup() {
    clearErrors();
    hideAlert("alert-box");

    const name = ($("name") || {}).value || "";
    const email = ($("email") || {}).value || "";
    const phone = ($("phone") || {}).value || "";
    const password = ($("password") || {}).value || "";
    const confirm = ($("confirm") || {}).value || "";

    let ok = true;

    if (name.trim().length < 3) {
      markInvalid("name", "Full name must be at least 3 characters.");
      ok = false;
    }
    if (!validateEmail(email)) {
      markInvalid("email", "Enter a valid email address.");
      ok = false;
    }
    if (!validatePhone(phone)) {
      markInvalid("phone", "Enter a valid phone number (7-15 digits).");
      ok = false;
    }
    if (password.length < 6) {
      markInvalid("password", "Password must be at least 6 characters.");
      ok = false;
    }
    if (confirm !== password) {
      markInvalid("confirm", "Passwords do not match.");
      ok = false;
    }

    if (!ok) return;

    if (Storage.findUserByEmail(email)) {
      showAlert("alert-box", "error", "An account with this email already exists. Please login.");
      return;
    }

    const user = {
      id: Storage.uid(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password,
      createdAt: Storage.todayISO(),
    };

    const users = Storage.getUsers();
    users.push(user);
    Storage.saveUsers(users);

    // create fresh data set for the new user
    Storage.saveData(user.id, Storage.createDefaultData());

    // auto-login
    Storage.setSession({ userId: user.id, name: user.name, email: user.email, role: "user", loggedInAt: new Date().toISOString() });

    showAlert("alert-box", "success", "Account created successfully! Redirecting to your dashboard...");
    setTimeout(() => {
      window.location.href = "user-dashboard.html";
    }, 800);
  }

  /* ---------- user login ---------- */
  function handleUserLogin() {
    clearErrors();
    hideAlert("alert-box");

    const email = ($("email") || {}).value || "";
    const password = ($("password") || {}).value || "";

    let ok = true;
    if (!validateEmail(email)) {
      markInvalid("email", "Enter a valid email address.");
      ok = false;
    }
    if (!password) {
      markInvalid("password", "Password is required.");
      ok = false;
    }
    if (!ok) return;

    const user = Storage.findUserByEmail(email);
    if (!user || user.password !== password) {
      showAlert("alert-box", "error", "Invalid email or password. Please try again.");
      return;
    }

    Storage.setSession({ userId: user.id, name: user.name, email: user.email, role: "user", loggedInAt: new Date().toISOString() });
    showAlert("alert-box", "success", "Login successful! Redirecting to your dashboard...");
    setTimeout(() => {
      window.location.href = "user-dashboard.html";
    }, 700);
  }

  /* ---------- admin login ---------- */
  function handleAdminLogin() {
    clearErrors();
    hideAlert("alert-box");

    const username = ($("username") || {}).value || "";
    const password = ($("password") || {}).value || "";

    const admin = Storage.getAdmin();

    if (username.trim() !== admin.username || password !== admin.password) {
      showAlert("alert-box", "error", "Invalid admin credentials. Access denied.");
      return;
    }

    Storage.setSession({ userId: "admin", name: "Administrator", email: "admin@expensetracker.local", role: "admin", loggedInAt: new Date().toISOString() });
    showAlert("alert-box", "success", "Admin login successful! Redirecting...");
    setTimeout(() => {
      window.location.href = "admin-dashboard.html";
    }, 700);
  }

  /* ---------- logout ---------- */
  function logout() {
    Storage.clearSession();
    window.location.href = "index.html";
  }

  /* ---------- page guards ---------- */
  function guardUserPage() {
    const session = Storage.getSession();
    if (!session || session.role !== "user") {
      window.location.href = "login.html";
      return null;
    }
    const user = Storage.getUserById(session.userId);
    if (!user) {
      Storage.clearSession();
      window.location.href = "login.html";
      return null;
    }
    return user;
  }

  function guardAdminPage() {
    const session = Storage.getSession();
    if (!session || session.role !== "admin") {
      window.location.href = "admin-login.html";
      return null;
    }
    return session;
  }

  function guardVisitPages() {
    // On login/signup/admin-login pages: redirect logged-in users away
    const session = Storage.getSession();
    if (!session) return;
    if (session.role === "admin") window.location.href = "admin-dashboard.html";
    else if (session.role === "user") window.location.href = "user-dashboard.html";
  }

  return {
    handleSignup,
    handleUserLogin,
    handleAdminLogin,
    logout,
    guardUserPage,
    guardAdminPage,
    guardVisitPages,
    clearErrors,
    showError,
    showAlert,
    hideAlert,
    validateEmail,
    validatePhone,
  };
})();