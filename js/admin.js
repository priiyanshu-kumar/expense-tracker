/* ============================================================
   EXPENSE TRACKER - admin.js
   Admin Dashboard: users, transactions, stats, categories
   ============================================================ */

const AdminDash = (function () {
  // getElementById can be unreliable during early DOM init on some engines;
  // fall back to querySelector so lookups always succeed.
  const $ = (id) => {
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  };
  const esc = (s) => UI.esc(s);

  function init() {
    const session = Auth.guardAdminPage();
    if (!session) return;
    UI.initShell(session);

    const greet = $("#admin-greeting");
    if (greet) greet.textContent = "Admin Console";

    renderStats();
    renderUsers();
    renderAllTransactions();
    renderCharts();
    renderCategoryManager();

    // user modal
    $("#view-close").addEventListener("click", closeViewModal);
    $("#view-modal-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeViewModal();
    });

    // category manager
    $("#cat-add-form").addEventListener("submit", (e) => {
      e.preventDefault();
      addCategory();
    });

    // transaction scope filter
    const scope = $("#admin-scope");
    if (scope) scope.addEventListener("change", renderAllTransactions);
  }

  /* ---------- aggregate across users ---------- */
  function aggregate() {
    const users = Storage.getUsers();
    let income = 0, expense = 0, txCount = 0;
    const monthly = {}; // monthKey -> {income, expense}
    users.forEach((u) => {
      const data = Storage.getData(u.id);
      data.incomes.forEach((t) => {
        income += Number(t.amount) || 0;
        txCount++;
        const k = Storage.monthKey(t.date);
        monthly[k] = monthly[k] || { income: 0, expense: 0 };
        monthly[k].income += Number(t.amount) || 0;
      });
      data.expenses.forEach((t) => {
        expense += Number(t.amount) || 0;
        txCount++;
        const k = Storage.monthKey(t.date);
        monthly[k] = monthly[k] || { income: 0, expense: 0 };
        monthly[k].expense += Number(t.amount) || 0;
      });
    });
    return { users, income, expense, balance: income - expense, txCount, monthly };
  }

  function renderStats() {
    const agg = aggregate();
    setVal("st-users", agg.users.length);
    setVal("st-income", UI.fmtMoney(agg.income));
    setVal("st-expense", UI.fmtMoney(agg.expense));
    setVal("st-balance", UI.fmtMoney(agg.balance));
    setVal("st-txcount", agg.txCount);
  }

  function setVal(id, v) {
    const el = $(id);
    if (el) el.textContent = v;
  }

  /* ---------- users table ---------- */
  function renderUsers() {
    const tbody = $("#admin-users-body");
    const users = Storage.getUsers();
    tbody.innerHTML = "";
    if (!users.length) {
      tbody.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='user-round'></i></div><div><strong>No registered users yet</strong><br><span class='small'>Users appear here after they sign up.</span></div></div>";
      UI.createIcons(tbody);
      return;
    }
    users.forEach((u) => {
      const data = Storage.getData(u.id);
      const t = UI.calcTotals(data);
      const row = document.createElement("div");
      row.className = "grid-row users-cols";
      row.innerHTML =
        "<span class='cell'><strong>" + esc(u.name) + "</strong></span>" +
        "<span class='cell small'>" + esc(u.email) + "</span>" +
        "<span class='cell small'>" + esc(u.phone) + "</span>" +
        "<span class='cell small'>" + esc(Storage.dateFmt(u.createdAt)) + "<br><span class='muted'>" + data.expenses.length + " exp · " + data.incomes.length + " inc</span></span>" +
        "<span class='cell actions'><button class='btn btn-primary btn-sm' data-view='" + u.id + "'>View</button></span>";
      tbody.appendChild(row);
    });
    tbody.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => openViewModal(b.dataset.view)));
  }

  /* ---------- view user modal ---------- */
  function openViewModal(userId) {
    const u = Storage.getUserById(userId);
    if (!u) return;
    const data = Storage.getData(userId);
    const t = UI.calcTotals(data);
    const mt = UI.totalsForMonth(data, Storage.monthKey());

    $("#view-name").textContent = u.name;
    $("#view-email").textContent = u.email;
    $("#view-phone").textContent = u.phone;
    $("#view-joined").textContent = Storage.dateFmt(u.createdAt);
    $("#view-income").textContent = UI.fmtMoney(t.income);
    $("#view-expense").textContent = UI.fmtMoney(t.expense);
    $("#view-balance").textContent = UI.fmtMoney(t.balance);
    $("#view-month-spent").textContent = UI.fmtMoney(mt.expense);
    $("#view-tx-count").textContent = data.expenses.length + data.incomes.length;

    // recent transactions list
    const listBox = $("#view-recent");
    const all = data.expenses
      .map((x) => Object.assign({ type: "expense" }, x))
      .concat(data.incomes.map((x) => Object.assign({ type: "income" }, x)))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
    listBox.innerHTML = "";
    if (!all.length) {
      listBox.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='receipt'></i></div><div>No transactions for this user.</div></div>";
      UI.createIcons(listBox);
    }
    all.forEach((x) => {
      const isExp = x.type === "expense";
      const item = document.createElement("div");
      item.className = "grid-row";
      item.style.gridTemplateColumns = "auto 1fr auto";
      item.innerHTML =
        "<span class='badge " + (isExp ? "badge-expense" : "badge-income") + "'>" + (isExp ? "Exp" : "Inc") + "</span>" +
        "<span><span class='small'>" + esc(Storage.dateFmt(x.date)) + " • " + esc(UI.categoryName(data.categories, x.categoryId)) + "</span></span>" +
        "<span class='small amount " + (isExp ? "text-danger" : "text-success") + "'>" + (isExp ? "-" : "+") + UI.fmtMoney(x.amount) + "</span>";
      listBox.appendChild(item);
    });
    $("#view-modal-overlay").classList.remove("hidden");
  }

  function closeViewModal() {
    $("#view-modal-overlay").classList.add("hidden");
  }

  /* ---------- all transactions ---------- */
  function renderAllTransactions() {
    const tbody = $("#admin-tx-body");
    const scope = $("#admin-scope");
    const scopeVal = scope ? scope.value : "all";
    const users = Storage.getUsers();
    const rows = [];

    users.forEach((u) => {
      const data = Storage.getData(u.id);
      data.expenses.forEach((x) => rows.push({ user: u, type: "expense", tx: x }));
      data.incomes.forEach((x) => rows.push({ user: u, type: "income", tx: x }));
    });

    if (scopeVal === "expense") {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].type !== "expense") rows.splice(i, 1);
    } else if (scopeVal === "income") {
      for (let i = rows.length - 1; i >= 0; i--) if (rows[i].type !== "income") rows.splice(i, 1);
    }

    rows.sort((a, b) => (a.tx.date < b.tx.date ? 1 : -1));

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='receipt'></i></div><div><strong>No transactions found</strong><br><span class='small'>Transactions from all users appear here.</span></div></div>";
      UI.createIcons(tbody);
      return;
    }
    rows.slice(0, 30).forEach((r) => {
      const data = Storage.getData(r.user.id);
      const isExp = r.type === "expense";
      const row = document.createElement("div");
      row.className = "grid-row admin-tx-cols";
      row.innerHTML =
        "<span class='cell'><strong>" + esc(r.user.name) + "</strong><br><span class='small muted'>" + esc(r.user.email) + "</span></span>" +
        "<span class='cell'><span class='badge " + (isExp ? "badge-expense" : "badge-income") + "'>" + (isExp ? "Expense" : "Income") + "</span></span>" +
        "<span class='cell small'>" + esc(Storage.dateFmt(r.tx.date)) + "</span>" +
        "<span class='cell small'>" + esc(UI.categoryName(data.categories, r.tx.categoryId)) + "<br>" + esc(UI.accountName(data.accounts, r.tx.accountId)) + "</span>" +
        "<span class='cell small'>" + esc(r.tx.description || "-") + "</span>" +
        "<span class='cell amount " + (isExp ? "text-danger" : "text-success") + "'>" + (isExp ? "-" : "+") + UI.fmtMoney(r.tx.amount) + "</span>";
      tbody.appendChild(row);
    });
  }

  /* ---------- charts ---------- */
  function renderCharts() {
    const agg = aggregate();
    // last 6 months aggregated
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2),
        m: agg.monthly[key] || { income: 0, expense: 0 },
      });
    }
    const bar = $("#admin-chart-monthly");
    if (bar) {
      UI.drawBarChart(
        bar,
        months.map((m) => m.label),
        [
          { label: "Income", color: "#16a34a", data: months.map((m) => m.m.income) },
          { label: "Expense", color: "#dc2626", data: months.map((m) => m.m.expense) },
        ]
      );
    }
  }

  /* ---------- category manager ---------- */
  function renderCategoryManager() {
    const master = Storage.getMasterCategories();
    const box = $("#cat-list");
    box.innerHTML = "";
    if (!master.expense.length) {
      box.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='tags'></i></div><div>No categories.</div></div>";
      UI.createIcons(box);
      return;
    }
    master.expense.forEach((c) => {
      const item = document.createElement("div");
      item.className = "grid-row";
      item.style.gridTemplateColumns = "1fr auto";
      item.innerHTML =
        "<span class='cell'><strong>" + esc(c.name) + "</strong><br><span class='small muted'>expense</span></span>" +
        "<span class='cell actions'><button class='btn btn-danger btn-sm' data-delcat='" + c.id + "'>Remove</button></span>";
      box.appendChild(item);
    });
    box.querySelectorAll("[data-delcat]").forEach((b) =>
      b.addEventListener("click", () => removeCategory(b.dataset.delcat))
    );
  }

  function addCategory() {
    const name = $("#cat-name").value.trim();
    const type = $("#cat-type").value;
    if (!name) {
      alert("Enter a category name.");
      return;
    }
    const master = Storage.getMasterCategories();
    if (!master[type]) master[type] = [];
    if (master[type].some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert("That category already exists.");
      return;
    }
    master[type].push({ id: "cat-" + Storage.uid(), name });
    Storage.saveMasterCategories(master);
    $("#cat-name").value = "";
    renderCategoryManager();
  }

  function removeCategory(catId) {
    if (!confirm("Remove this default category? Existing users keep their own copy.")) return;
    const master = Storage.getMasterCategories();
    master.expense = master.expense.filter((c) => c.id !== catId);
    master.income = master.income.filter((c) => c.id !== catId);
    Storage.saveMasterCategories(master);
    renderCategoryManager();
  }

  return { init };
})();

UI.onReady(function () {
  AdminDash.init();
});