/* ============================================================
   EXPENSE TRACKER - storage.js
   Local Storage data layer (users, admin, session, per-user data)
   ============================================================ */

const Storage = (function () {
  const KEYS = {
    USERS: "et_users",
    ADMIN: "et_admin",
    SESSION: "et_session",
    CATEGORIES: "et_categories_master",
  };

  /* ---------- generic helpers ---------- */
  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  function monthKey(dateStr) {
    return String(dateStr || todayISO()).slice(0, 7); // "YYYY-MM"
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  function currency(n) {
    n = Number(n) || 0;
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function dateFmt(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- default categories ---------- */
  function defaultCategories() {
    return {
      expense: [
        { id: "cat-food", name: "Food & Dining" },
        { id: "cat-transport", name: "Transport" },
        { id: "cat-housing", name: "Housing / Rent" },
        { id: "cat-utilities", name: "Utilities" },
        { id: "cat-shopping", name: "Shopping" },
        { id: "cat-entertainment", name: "Entertainment" },
        { id: "cat-health", name: "Health" },
        { id: "cat-education", name: "Education" },
        { id: "cat-travel", name: "Travel" },
        { id: "cat-other", name: "Other" },
      ],
      income: [
        { id: "cat-salary", name: "Salary" },
        { id: "cat-freelance", name: "Freelance" },
        { id: "cat-business", name: "Business" },
        { id: "cat-investment", name: "Investment" },
        { id: "cat-other-income", name: "Other Income" },
      ],
    };
  }

  /* ---------- users ---------- */
  function getUsers() {
    return get(KEYS.USERS, []);
  }
  function saveUsers(users) {
    set(KEYS.USERS, users);
  }
  function findUserByEmail(email) {
    const users = getUsers();
    return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  }
  function getUserById(id) {
    return getUsers().find((u) => u.id === id) || null;
  }

  /* ---------- admin ---------- */
  function getAdmin() {
    let admin = get(KEYS.ADMIN, null);
    if (!admin) {
      admin = { username: "admin", password: "admin123", name: "Administrator" };
      saveAdmin(admin);
    }
    return admin;
  }
  function saveAdmin(admin) {
    set(KEYS.ADMIN, admin);
  }

  /* ---------- session ---------- */
  function getSession() {
    return get(KEYS.SESSION, null);
  }
  function setSession(session) {
    set(KEYS.SESSION, session);
  }
  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }

  /* ---------- per-user data ---------- */
  function dataKey(userId) {
    return "et_data_" + userId;
  }

  function getData(userId) {
    let data = get(dataKey(userId), null);
    if (!data) {
      data = { accounts: [], categories: [], expenses: [], incomes: [], budgets: [], recurring: [] };
      saveData(userId, data);
    }
    if (!data.accounts) data.accounts = [];
    if (!data.categories) data.categories = [];
    if (!data.expenses) data.expenses = [];
    if (!data.incomes) data.incomes = [];
    if (!data.budgets) data.budgets = [];
    if (!data.recurring) data.recurring = [];
    return data;
  }

  function saveData(userId, data) {
    set(dataKey(userId), data);
  }

  /* ---------- default account for a new user ---------- */
  function createDefaultData() {
    const cats = defaultCategories();
    return {
      accounts: [
        { id: uid(), name: "Cash", type: "Cash", balance: 0 },
        { id: uid(), name: "Bank Account", type: "Bank", balance: 0 },
      ],
      categories: cats,
      expenses: [],
      incomes: [],
      budgets: [],
      recurring: [],
    };
  }

  /* ---------- master categories (admin managed) ---------- */
  function getMasterCategories() {
    let cats = get(KEYS.CATEGORIES, null);
    if (!cats) {
      cats = defaultCategories();
      set(KEYS.CATEGORIES, cats);
    }
    return cats;
  }
  function saveMasterCategories(cats) {
    set(KEYS.CATEGORIES, cats);
  }

  function seed() {
    getAdmin();
    getMasterCategories();
  }

  return {
    // generic
    get,
    set,
    uid,
    todayISO,
    monthKey,
    addDays,
    currency,
    dateFmt,
    // users
    getUsers,
    saveUsers,
    findUserByEmail,
    getUserById,
    // admin
    getAdmin,
    saveAdmin,
    // session
    getSession,
    setSession,
    clearSession,
    // per-user data
    getData,
    saveData,
    createDefaultData,
    // categories
    defaultCategories,
    getMasterCategories,
    saveMasterCategories,
    // misc
    seed,
  };
})();

/* Seed admin + master categories on first load */
Storage.seed();