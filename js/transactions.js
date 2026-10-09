/* ============================================================
   EXPENSE TRACKER - transactions.js
   Transactions CRUD, Budgets, Accounts, Recurring, Export
   ============================================================ */

const Transactions = (function () {
  // getElementById can be unreliable during early DOM init on some engines;
  // fall back to querySelector so lookups always succeed.
  const $ = (id) => {
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  };
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => UI.esc(s);

  /* ---------- shared accessors ---------- */
  function sessionUser() {
    return Auth.guardUserPage();
  }
  function getData() {
    const s = Storage.getSession();
    return Storage.getData(s.userId);
  }

  /* ============================================================
     TRANSACTIONS PAGE
     ============================================================ */
  let txType = "expense"; // active tab

  function initTransactionsPage() {
    if (!sessionUser()) return;
    UI.initShell(Storage.getSession());

    // tabs
    $$(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // add forms
    $("add-expense-form").addEventListener("submit", (e) => {
      e.preventDefault();
      addTransaction("expense");
    });
    $("add-income-form").addEventListener("submit", (e) => {
      e.preventDefault();
      addTransaction("income");
    });

    // edit modal
    $("edit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveEdit();
    });
    $("edit-modal-close").addEventListener("click", closeEditModal);
    $("edit-modal-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeEditModal();
    });

    // filters
    $("filter-search").addEventListener("input", renderTransactions);
    $("filter-category").addEventListener("change", renderTransactions);
    $("filter-month").addEventListener("change", renderTransactions);
    $("btn-export").addEventListener("click", exportCSV);

    populateSelects();
    initRecurring();
    switchTab("expense");
  }

  function switchTab(tab) {
    txType = tab === "income" ? "income" : tab === "recurring" ? "recurring" : "expense";
    $$(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
    renderTransactions();
  }

  function populateSelects() {
    const data = getData();
    const catSel = (selId, type) => {
      const el = $(selId);
      if (!el) return;
      el.innerHTML = "";
      (data.categories[type] || []).forEach((c) => el.appendChild(new Option(c.name, c.id)));
    };
    catSel("exp-category", "expense");
    catSel("inc-category", "income");
    catSel("budget-category", "expense");
    catSel("edit-category", "expense");
    catSel("rec-category", "expense");

    // filter select includes both expense + income categories
    const fil = $("filter-category");
    if (fil) {
      fil.innerHTML = "";
      fil.appendChild(new Option("All categories", "all"));
      (data.categories.expense || []).concat(data.categories.income || []).forEach((c) => fil.appendChild(new Option(c.name, c.id)));
    }

    const accSel = (selId) => {
      const el = $(selId);
      if (!el) return;
      el.innerHTML = "";
      (data.accounts || []).forEach((a) => el.appendChild(new Option(a.name, a.id)));
    };
    accSel("exp-account");
    accSel("inc-account");
    accSel("edit-account");
    accSel("rec-account");

    // defaults
    if ($("exp-date")) $("exp-date").value = Storage.todayISO();
    if ($("inc-date")) $("inc-date").value = Storage.todayISO();
  }

  function getFiltered(type) {
    const data = getData();
    const list = (type === "expense" ? data.expenses : data.incomes).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const q = ($("filter-search").value || "").toLowerCase();
    const cat = $("filter-category").value || "all";
    const month = $("filter-month").value || "all";

    return list.filter((t) => {
      if (cat !== "all" && t.categoryId !== cat) return false;
      if (month !== "all" && Storage.monthKey(t.date) !== month) return false;
      if (q) {
        const catName = UI.categoryName(data.categories, t.categoryId).toLowerCase();
        const accName = UI.accountName(data.accounts, t.accountId).toLowerCase();
        const hay = (t.description || "").toLowerCase() + " " + catName + " " + accName;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderTransactions() {
    renderTxTable("expense", "tx-table-body-expense");
    renderTxTable("income", "tx-table-body-income");

    const data = getData();
    const totals = UI.calcTotals(data);
    $("sum-expense").textContent = UI.fmtMoney(totals.expense);
    $("sum-income").textContent = UI.fmtMoney(totals.income);
    $("sum-balance").textContent = UI.fmtMoney(totals.balance);
    $("sum-count").textContent = data.expenses.length + data.incomes.length + " total records";
  }

  function renderTxTable(type, bodyId) {
    const data = getData();
    const list = getFiltered(type);
    const tbody = $(bodyId);
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML =
        '<div class="empty-state"><div class="icon"><i data-lucide="inbox"></i></div><div><strong>No ' +
        type +
        " records found</strong><br><span class='small'>Add one using the form, or adjust the filters.</span></div></div>";
      UI.createIcons(tbody);
      return;
    }

    list.forEach((t) => {
      const row = document.createElement("div");
      row.className = "grid-row tx-cols";
      row.innerHTML =
        "<span class='cell'>" +
        esc(Storage.dateFmt(t.date)) +
        "</span>" +
        "<span class='cell'><span class='badge " +
        (type === "expense" ? "badge-expense" : "badge-income") +
        "'>" +
        esc(UI.categoryName(data.categories, t.categoryId)) +
        "</span></span>" +
        "<span class='cell'>" +
        esc(UI.accountName(data.accounts, t.accountId)) +
        "</span>" +
        "<span class='cell'>" +
        esc(t.description || "-") +
        "</span>" +
        "<span class='cell amount " +
        (type === "expense" ? "text-danger" : "text-success") +
        "'>" +
        (type === "expense" ? "-" : "+") +
        UI.fmtMoney(t.amount) +
        "</span>" +
        "<span class='cell actions'>" +
        "<button class='btn btn-secondary btn-sm' data-edit='" +
        t.id +
        "' data-type='" +
        type +
        "'>Edit</button>" +
        "<button class='btn btn-danger btn-sm' data-del='" +
        t.id +
        "' data-type='" +
        type +
        "'>Delete</button>" +
        "</span>";
      tbody.appendChild(row);
    });

    tbody.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => openEditModal(b.dataset.edit, b.dataset.type))
    );
    tbody.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => delTransaction(b.dataset.del, b.dataset.type))
    );
  }

  function validateAmount(v) {
    const n = Number(v);
    return !isNaN(n) && n > 0;
  }

  function addTransaction(type) {
    const data = getData();
    const catId = $(type === "expense" ? "exp-category" : "inc-category").value;
    const amount = $(type === "expense" ? "exp-amount" : "inc-amount").value;
    const date = $(type === "expense" ? "exp-date" : "inc-date").value;
    const desc = $(type === "expense" ? "exp-description" : "inc-description").value;
    const accId = $(type === "expense" ? "exp-account" : "inc-account").value;

    const errBox = $("tx-alert");
    if (!validateAmount(amount)) {
      errBox.className = "alert alert-error";
      errBox.innerHTML = "<div class='icon'><i data-lucide='circle-x'></i></div><div>Enter a valid amount greater than 0.</div>";
      UI.createIcons(errBox);
      return;
    }
    if (!date) {
      errBox.className = "alert alert-error";
      errBox.innerHTML = "<div class='icon'><i data-lucide='circle-x'></i></div><div>Please select a date.</div>";
      UI.createIcons(errBox);
      return;
    }

    const tx = { id: Storage.uid(), categoryId: catId, amount: Number(amount), date: date, description: desc.trim(), accountId: accId, createdAt: new Date().toISOString() };
    (type === "expense" ? data.expenses : data.incomes).push(tx);
    Storage.saveData(Storage.getSession().userId, data);

    errBox.className = "alert alert-success";
    errBox.innerHTML = "<div class='icon'><i data-lucide='circle-check'></i></div><div>" + type.charAt(0).toUpperCase() + type.slice(1) + " added successfully.</div>";
    UI.createIcons(errBox);
    $("add-" + type + "-form").reset();
    $((type === "expense" ? "exp-date" : "inc-date")).value = Storage.todayISO();
    setTimeout(() => (errBox.className = "alert hidden"), 2500);
    populateSelects();
    renderTransactions();
  }

  /* ---------- edit (modal) ---------- */
  let editingId = null;
  let editingType = null;

  function openEditModal(id, type) {
    const data = getData();
    const list = type === "expense" ? data.expenses : data.incomes;
    const t = list.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    editingType = type;

    // fill the category select with the correct type
    const catSel = $("edit-category");
    catSel.innerHTML = "";
    (data.categories[type] || []).forEach((c) => catSel.appendChild(new Option(c.name, c.id)));

    $("edit-title").textContent = "Edit " + type.charAt(0).toUpperCase() + type.slice(1);
    $("edit-amount").value = t.amount;
    $("edit-date").value = t.date;
    $("edit-description").value = t.description || "";
    $("edit-category").value = t.categoryId;
    $("edit-account").value = t.accountId;
    $("edit-modal-overlay").classList.remove("hidden");
  }

  function closeEditModal() {
    $("edit-modal-overlay").classList.add("hidden");
    editingId = null;
    editingType = null;
  }

  function saveEdit() {
    const data = getData();
    const list = editingType === "expense" ? data.expenses : data.incomes;
    const t = list.find((x) => x.id === editingId);
    if (!t) return;
    const amount = $("edit-amount").value;
    const date = $("edit-date").value;
    if (!validateAmount(amount)) {
      alert("Enter a valid amount greater than 0.");
      return;
    }
    if (!date) {
      alert("Please select a date.");
      return;
    }
    t.amount = Number(amount);
    t.date = date;
    t.description = $("edit-description").value.trim();
    t.categoryId = $("edit-category").value;
    t.accountId = $("edit-account").value;
    Storage.saveData(Storage.getSession().userId, data);
    closeEditModal();
    renderTransactions();
  }

  function delTransaction(id, type) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    const data = getData();
    if (type === "expense") data.expenses = data.expenses.filter((x) => x.id !== id);
    else data.incomes = data.incomes.filter((x) => x.id !== id);
    Storage.saveData(Storage.getSession().userId, data);
    renderTransactions();
  }

  /* ---------- export CSV ---------- */
  function exportCSV() {
    const data = getData();
    const rows = [
      ["Type", "Date", "Category", "Account", "Description", "Amount"],
    ];
    data.incomes.forEach((t) => rows.push(["Income", t.date, UI.categoryName(data.categories, t.categoryId), UI.accountName(data.accounts, t.accountId), t.description || "", t.amount]));
    data.expenses.forEach((t) => rows.push(["Expense", t.date, UI.categoryName(data.categories, t.categoryId), UI.accountName(data.accounts, t.accountId), t.description || "", t.amount]));
    const csv = rows
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expense-tracker-" + Storage.todayISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ============================================================
     RECURRING EXPENSES (transactions page tab 3)
     ============================================================ */
  const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

  function initRecurring() {
    const form = $("add-recurring-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        addRecurring();
      });
      if ($("rec-nextdate")) $("rec-nextdate").value = Storage.todayISO();
    }
    renderRecurring();
  }

  function addRecurring() {
    const data = getData();
    const name = $("rec-name").value.trim();
    const amount = $("rec-amount").value;
    const catId = $("rec-category").value;
    const accId = $("rec-account").value;
    const freq = $("rec-frequency").value;
    const nextDate = $("rec-nextdate").value;

    const errBox = $("rec-alert");
    if (!name || !validateAmount(amount) || !nextDate) {
      errBox.className = "alert alert-error";
      errBox.innerHTML = "<div class='icon'><i data-lucide='circle-x'></i></div><div>Fill name, amount and next date.</div>";
      UI.createIcons(errBox);
      return;
    }
    data.recurring.push({ id: Storage.uid(), name, amount: Number(amount), categoryId: catId, accountId: accId, frequency: freq, nextDate, active: true });
    Storage.saveData(Storage.getSession().userId, data);
    errBox.className = "alert alert-success";
    errBox.innerHTML = "<div class='icon'><i data-lucide='circle-check'></i></div><div>Recurring expense added.</div>";
    UI.createIcons(errBox);
    form.reset();
    $("rec-nextdate").value = Storage.todayISO();
    setTimeout(() => (errBox.className = "alert hidden"), 2500);
    renderRecurring();
  }

  function nextOccurrenceDate(rec) {
    const today = Storage.todayISO();
    let d = rec.nextDate;
    let guard = 0;
    while (d < today && guard < 400) {
      d = Storage.addDays(d, FREQ_DAYS[rec.frequency] || 30);
      guard++;
    }
    return d;
  }

  function daysUntil(dateStr) {
    const a = new Date(dateStr + "T00:00:00");
    const b = new Date(Storage.todayISO() + "T00:00:00");
    return Math.ceil((a - b) / 86400000);
  }

  function renderRecurring() {
    const data = getData();
    const container = $("recurring-list");
    if (!container) return;
    container.innerHTML = "";
    if (!data.recurring.length) {
      container.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='repeat'></i></div><div><strong>No recurring expenses</strong><br><span class='small'>Add one on the left to get reminders.</span></div></div>";
      UI.createIcons(container);
      return;
    }
    data.recurring.forEach((rec) => {
      const next = nextOccurrenceDate(rec);
      const days = daysUntil(next);
      const cls = days < 0 ? "overdue" : days === 0 ? "today" : "";
      const label = days < 0 ? "Overdue by " + Math.abs(days) + "d" : days === 0 ? "Due today" : "in " + days + " day" + (days === 1 ? "" : "s");
      const card = document.createElement("div");
      card.className = "reminder-item " + cls;
      card.innerHTML =
        "<div class='reminder-icon'><i data-lucide='repeat'></i></div>" +
        "<div><div class='r-name'>" +
        esc(rec.name) +
        "</div><div class='r-meta'>" +
        esc(UI.categoryName(data.categories, rec.categoryId)) +
        " • " +
        esc(UI.accountName(data.accounts, rec.accountId)) +
        " • every " +
        rec.frequency +
        " • next " +
        esc(Storage.dateFmt(next)) +
        "</div></div>" +
        "<div class='r-days'>" +
        label +
        "</div>" +
        "<span class='cell actions'><button class='btn btn-success btn-sm' data-post='" +
        rec.id +
        "'>Post</button><button class='btn btn-danger btn-sm' data-delrec='" +
        rec.id +
        "'>Del</button></span>";
      container.appendChild(card);
      UI.createIcons(card);
    });
    container.querySelectorAll("[data-post]").forEach((b) => b.addEventListener("click", () => postRecurring(b.dataset.post)));
    container.querySelectorAll("[data-delrec]").forEach((b) => b.addEventListener("click", () => deleteRecurring(b.dataset.delrec)));
  }

  function postRecurring(id) {
    const data = getData();
    const rec = data.recurring.find((r) => r.id === id);
    if (!rec) return;
    if (!confirm('Post "' + rec.name + '" (' + UI.fmtMoney(rec.amount) + ") as an expense for today?")) return;
    data.expenses.push({ id: Storage.uid(), categoryId: rec.categoryId, amount: rec.amount, date: Storage.todayISO(), description: rec.name + " (recurring)", accountId: rec.accountId, createdAt: new Date().toISOString() });
    // advance next date
    const today = Storage.todayISO();
    let next = rec.nextDate;
    while (next <= today) next = Storage.addDays(next, FREQ_DAYS[rec.frequency] || 30);
    rec.nextDate = next;
    Storage.saveData(Storage.getSession().userId, data);
    renderRecurring();
  }

  function deleteRecurring(id) {
    if (!confirm("Remove this recurring expense?")) return;
    const data = getData();
    data.recurring = data.recurring.filter((r) => r.id !== id);
    Storage.saveData(Storage.getSession().userId, data);
    renderRecurring();
  }

  /* ---------- helpers for dashboard reminders ---------- */
  function upcomingReminders(data, horizonDays) {
    horizonDays = horizonDays || 7;
    return (data.recurring || [])
      .filter((r) => r.active !== false)
      .map((r) => {
        const next = nextOccurrenceDate(r);
        return { rec: r, next, days: daysUntil(next) };
      })
      .filter((x) => x.days <= horizonDays)
      .sort((a, b) => a.days - b.days);
  }

  /* ============================================================
     BUDGET PAGE
     ============================================================ */
  let budgetMonth = Storage.monthKey();

  function initBudgetPage() {
    if (!sessionUser()) return;
    UI.initShell(Storage.getSession());
    $("bud-month").value = budgetMonth;

    $("bud-month").addEventListener("change", () => {
      budgetMonth = $("bud-month").value || Storage.monthKey();
      renderBudgets();
    });
    $("add-budget-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveBudget();
    });
    populateSelects();
    renderBudgets();
  }

  function saveBudget() {
    const data = getData();
    const catId = $("budget-category").value;
    const month = budgetMonth;
    const amount = Number($("bud-amount").value);

    const errBox = $("bud-alert");
    if (!(amount > 0)) {
      errBox.className = "alert alert-error";
      errBox.innerHTML = "<div class='icon'><i data-lucide='circle-x'></i></div><div>Enter a budget amount greater than 0.</div>";
      UI.createIcons(errBox);
      return;
    }
    const existing = data.budgets.find((b) => b.categoryId === catId && b.month === month);
    if (existing) {
      existing.amount = amount; // update
    } else {
      data.budgets.push({ id: Storage.uid(), categoryId: catId, month: month, amount: amount });
    }
    Storage.saveData(Storage.getSession().userId, data);
    errBox.className = "alert alert-success";
    errBox.innerHTML = "<div class='icon'><i data-lucide='circle-check'></i></div><div>Budget saved for <strong>" + UI.categoryName(data.categories, catId) + "</strong> (" + month + ").</div>";
    UI.createIcons(errBox);
    $("add-budget-form").reset();
    setTimeout(() => (errBox.className = "alert hidden"), 2500);
    renderBudgets();
  }

  function budgetRows() {
    const data = getData();
    const spent = UI.expensesByCategory(data, budgetMonth);
    return data.budgets
      .filter((b) => b.month === budgetMonth)
      .map((b) => {
        const used = spent[b.categoryId] || 0;
        const pct = b.amount > 0 ? Math.min((used / b.amount) * 100, 100) : 0;
        return { budget: b, used, pct, remaining: b.amount - used };
      })
      .sort((a, b) => b.pct - a.pct);
  }

  function renderBudgets() {
    const data = getData();
    const rows = budgetRows();
    const totalBudget = rows.reduce((s, r) => s + r.budget.amount, 0);
    const totalSpent = rows.reduce((s, r) => s + r.used, 0);

    $("bud-total-budget").textContent = UI.fmtMoney(totalBudget);
    $("bud-total-spent").textContent = UI.fmtMoney(totalSpent);
    $("bud-total-remaining").textContent = UI.fmtMoney(totalBudget - totalSpent);
    $("bud-count").textContent = rows.length + " budget" + (rows.length === 1 ? "" : "s") + " (month " + budgetMonth + ")";

    const tbody = $("budget-table-body");
    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='target'></i></div><div><strong>No budgets set for " + budgetMonth + "</strong><br><span class='small'>Set a budget above to start tracking spending.</span></div></div>";
      UI.createIcons(tbody);
      return;
    }

    rows.forEach((r) => {
      const over = r.used > r.budget.amount;
      const near = !over && r.pct >= 80;
      const row = document.createElement("div");
      row.className = "grid-row budget-cols";
      row.innerHTML =
        "<span class='cell'><strong>" +
        esc(UI.categoryName(data.categories, r.budget.categoryId)) +
        "</strong></span>" +
        "<span class='cell amount'>" +
        UI.fmtMoney(r.budget.amount) +
        "</span>" +
        "<span class='cell amount text-danger'>" +
        UI.fmtMoney(r.used) +
        "</span>" +
        "<span class='cell amount " +
        (over ? "text-danger" : "text-success") +
        "'>" +
        UI.fmtMoney(r.remaining) +
        "</span>" +
        "<span class='cell'>" +
        "<div class='progress-track'><div class='progress-fill " +
        (over ? "over" : near ? "near" : "") +
        "' style='width:" +
        Math.min(r.pct, 100) +
        "%'></div></div>" +
        "<span class='small'>" +
        Math.round(r.pct) +
        "% used</span></span>" +
        "<span class='cell'><span class='badge " +
        (over ? "badge-expense" : near ? "badge-warn" : "badge-income") +
        "'>" +
        (over ? "Over budget" : near ? "Near limit" : "On track") +
        "</span></span>";
      tbody.appendChild(row);
    });
  }

  /* ============================================================
     ACCOUNTS PAGE
     ============================================================ */
  function initAccountsPage() {
    if (!sessionUser()) return;
    UI.initShell(Storage.getSession());
    $("add-account-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveAccount();
    });
    $("acc-edit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveAccountEdit();
    });
    $("acc-modal-close").addEventListener("click", closeAccModal);
    $("acc-modal-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeAccModal();
    });
    renderAccounts();
  }

  function accountTotals(data, accId) {
    let inAmt = 0, outAmt = 0, inCount = 0, outCount = 0;
    data.incomes.forEach((t) => { if (t.accountId === accId) { inAmt += Number(t.amount) || 0; inCount++; } });
    data.expenses.forEach((t) => { if (t.accountId === accId) { outAmt += Number(t.amount) || 0; outCount++; } });
    return { inAmt, outAmt, inCount, outCount, net: inAmt - outAmt };
  }

  function renderAccounts() {
    const data = getData();
    const grid = $("accounts-grid");
    grid.innerHTML = "";
    if (!data.accounts.length) {
      grid.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='landmark'></i></div><div><strong>No accounts yet</strong><br><span class='small'>Add your first account to begin tracking.</span></div></div>";
      UI.createIcons(grid);
    }
    data.accounts.forEach((a) => {
      const t = accountTotals(data, a.id);
      const balance = (Number(a.balance) || 0) + t.net;
      const card = document.createElement("div");
      card.className = "stat-card";
      card.style.gridTemplateColumns = "1fr";
      card.innerHTML =
        "<div style='display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center'>" +
        "<strong style='font-size:16px'>" +
        esc(a.name) +
        "</strong>" +
        "<span class='badge badge-info'>" +
        esc(a.type) +
        "</span></div>" +
        "<div style='font-size:26px;font-weight:800'>" +
        UI.fmtMoney(balance) +
        "</div>" +
        "<div class='small muted'>In: " +
        UI.fmtMoney(t.inAmt) +
        " (" +
        t.inCount +
        ") • Out: " +
        UI.fmtMoney(t.outAmt) +
        " (" +
        t.outCount +
        ") • Base: " +
        UI.fmtMoney(a.balance) +
        "</div>" +
        "<div style='display:grid;grid-auto-flow:column;justify-content:start;gap:8px'>" +
        "<button class='btn btn-secondary btn-sm' data-edacc='" +
        a.id +
        "'>Edit</button>" +
        "<button class='btn btn-danger btn-sm' data-delacc='" +
        a.id +
        "'>Delete</button></div>";
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-delacc]").forEach((b) => b.addEventListener("click", () => delAccount(b.dataset.delacc)));
    grid.querySelectorAll("[data-edacc]").forEach((b) => b.addEventListener("click", () => openAccModal(b.dataset.edacc)));

    // count badge
    const count = $("acc-count");
    if (count) count.textContent = data.accounts.length + " account" + (data.accounts.length === 1 ? "" : "s");

    // table
    const tbody = $("account-table-body");
    if (tbody) {
      tbody.innerHTML = "";
      data.accounts.forEach((a) => {
        const t = accountTotals(data, a.id);
        const balance = (Number(a.balance) || 0) + t.net;
        const row = document.createElement("div");
        row.className = "grid-row acc-cols";
        row.innerHTML =
          "<span class='cell'><strong>" + esc(a.name) + "</strong></span>" +
          "<span class='cell'><span class='badge badge-info'>" + esc(a.type) + "</span></span>" +
          "<span class='cell small muted'>+" + UI.fmtMoney(t.inAmt) + " / −" + UI.fmtMoney(t.outAmt) + "</span>" +
          "<span class='cell amount'>" + UI.fmtMoney(balance) + "</span>" +
          "<span class='cell actions'>" +
          "<button class='btn btn-secondary btn-sm' data-edacc='" + a.id + "'>Edit</button>" +
          "<button class='btn btn-danger btn-sm' data-delacc='" + a.id + "'>Delete</button></span>";
        tbody.appendChild(row);
      });
      tbody.querySelectorAll("[data-delacc]").forEach((b) => b.addEventListener("click", () => delAccount(b.dataset.delacc)));
      tbody.querySelectorAll("[data-edacc]").forEach((b) => b.addEventListener("click", () => openAccModal(b.dataset.edacc)));
    }
  }

  function saveAccount() {
    const data = getData();
    const name = $("acc-name").value.trim();
    const type = $("acc-type").value;
    const balance = Number($("acc-balance").value) || 0;
    const errBox = $("acc-alert");
    if (!name) {
      errBox.className = "alert alert-error";
      errBox.innerHTML = "<div class='icon'><i data-lucide='circle-x'></i></div><div>Please enter an account name.</div>";
      UI.createIcons(errBox);
      return;
    }
    data.accounts.push({ id: Storage.uid(), name, type, balance });
    Storage.saveData(Storage.getSession().userId, data);
    errBox.className = "alert alert-success";
    errBox.innerHTML = "<div class='icon'><i data-lucide='circle-check'></i></div><div>Account added successfully.</div>";
    UI.createIcons(errBox);
    $("add-account-form").reset();
    setTimeout(() => (errBox.className = "alert hidden"), 2500);
    populateSelects();
    renderAccounts();
  }

  let editingAccId = null;
  function openAccModal(id) {
    const data = getData();
    const a = data.accounts.find((x) => x.id === id);
    if (!a) return;
    editingAccId = id;
    $("acc-edit-name").value = a.name;
    $("acc-edit-type").value = a.type;
    $("acc-edit-balance").value = a.balance;
    $("acc-modal-overlay").classList.remove("hidden");
  }
  function closeAccModal() {
    $("acc-modal-overlay").classList.add("hidden");
    editingAccId = null;
  }
  function saveAccountEdit() {
    const data = getData();
    const a = data.accounts.find((x) => x.id === editingAccId);
    if (!a) return;
    a.name = $("acc-edit-name").value.trim();
    a.type = $("acc-edit-type").value;
    a.balance = Number($("acc-edit-balance").value) || 0;
    Storage.saveData(Storage.getSession().userId, data);
    closeAccModal();
    populateSelects();
    renderAccounts();
  }
  function delAccount(id) {
    const data = getData();
    if (!confirm("Delete this account? Transactions linked to it will keep their history.")) return;
    data.accounts = data.accounts.filter((a) => a.id !== id);
    Storage.saveData(Storage.getSession().userId, data);
    populateSelects();
    renderAccounts();
  }

  /* ---------- small element helper ---------- */

  return {
    initTransactionsPage,
    initBudgetPage,
    initAccountsPage,
    initRecurring,
    renderRecurring,
    upcomingReminders,
    nextOccurrenceDate,
  };
})();