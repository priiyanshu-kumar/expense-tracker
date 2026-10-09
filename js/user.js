/* ============================================================
   EXPENSE TRACKER - user.js
   User Dashboard: summaries, charts, reminders, recent activity
   ============================================================ */

const UserDash = (function () {
  function $ (id) {
    // getElementById can be unreliable during early DOM init on some engines;
    // fall back to querySelector so lookups always succeed.
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  }

  function init() {
    const user = Auth.guardUserPage();
    if (!user) return;
    const session = Storage.getSession();
    UI.initShell(session);

    const data = Storage.getData(user.id);

    // greeting
    const greet = $("#greeting");
    if (greet) greet.textContent = "Welcome back, " + user.name.split(" ")[0];

    renderSummaries(data);
    renderCharts(data);
    renderRecent(data);
    renderBudgetsStatus(data);
    renderReminders(data);
    renderAccountsSummary(data);

    // bind quick-action export
    const qexp = $("#quick-export");
    if (qexp) qexp.addEventListener("click", exportQuick);
  }

  function renderSummaries(data) {
    const totals = UI.calcTotals(data);
    const month = Storage.monthKey();
    const mt = UI.totalsForMonth(data, month);

    setVal("stat-income", UI.fmtMoney(totals.income));
    setVal("stat-expense", UI.fmtMoney(totals.expense));
    setVal("stat-balance", UI.fmtMoney(totals.balance));
    setVal("stat-monthly", UI.fmtMoney(mt.expense));
    setSub("stat-income-sub", "All time");
    setSub("stat-expense-sub", "All time");
    setSub("stat-balance-sub", "Income − Expenses");
    setSub("stat-monthly-sub", "Spent in " + month);
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function setSub(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  function renderCharts(data) {
    // doughnut - expense by category (current month)
    const month = Storage.monthKey();
    const byCat = UI.expensesByCategory(data, month);
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = entries.map((e) => UI.categoryName(data.categories, e[0]));
    const values = entries.map((e) => e[1]);
    const colors = ["#0f766e", "#14b8a6", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];

    const dough = $("#chart-category");
    if (dough) {
      const totalExpense = UI.calcTotals(data).expense;
      UI.drawDoughnut(dough, labels, values, colors, totalExpense ? "Total: " + UI.fmtMoney(totalExpense) : null);
      // legend
      const legend = $("#legend-category");
      if (legend) {
        legend.innerHTML = "";
        entries.forEach((e, i) => {
          const item = document.createElement("div");
          item.className = "legend-item";
          item.innerHTML =
            "<span class='dot' style='background:" + colors[i % colors.length] + "'></span><span>" +
            UI.esc(UI.categoryName(data.categories, e[0])) + "</span><span>" + UI.fmtMoney(e[1]) + "</span>";
          legend.appendChild(item);
        });
      }
    }

    // bar - income vs expense last 6 months
    const series = UI.monthlySeries(data, 6);
    const bar = $("#chart-monthly");
    if (bar) {
      UI.drawBarChart(
        bar,
        series.map((s) => s.label),
        [
          { label: "Income", color: "#16a34a", data: series.map((s) => s.income) },
          { label: "Expense", color: "#dc2626", data: series.map((s) => s.expense) },
        ]
      );
    }
  }

  function renderRecent(data) {
    const box = $("#recent-list");
    if (!box) return;
    const all = data.expenses
      .concat(data.incomes.map((t) => Object.assign({ type: "income" }, t)))
      .map((t) => Object.assign({ type: t.type || "expense" }, t))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);

    box.innerHTML = "";
    if (!all.length) {
      box.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='receipt'></i></div><div><strong>No transactions yet</strong><br><span class='small'>Add your first expense or income.</span></div></div>";
      UI.createIcons(box);
      return;
    }
    all.forEach((t) => {
      const item = document.createElement("div");
      item.className = "grid-row";
      item.style.gridTemplateColumns = "auto 1fr auto";
      const isExp = t.type === "expense";
      item.innerHTML =
        "<span class='badge " + (isExp ? "badge-expense" : "badge-income") + "'>" + (isExp ? "Exp" : "Inc") + "</span>" +
        "<span><strong>" + UI.esc(UI.categoryName(data.categories, t.categoryId)) + "</strong><br><span class='small muted'>" + UI.esc(Storage.dateFmt(t.date)) + " • " + UI.esc(UI.accountName(data.accounts, t.accountId)) + (t.description ? " • " + UI.esc(t.description) : "") + "</span></span>" +
        "<span class='amount " + (isExp ? "text-danger" : "text-success") + "'>" + (isExp ? "-" : "+") + UI.fmtMoney(t.amount) + "</span>";
      box.appendChild(item);
    });
  }

  function renderBudgetsStatus(data) {
    const box = $("#budget-status");
    if (!box) return;
    const month = Storage.monthKey();
    const spent = UI.expensesByCategory(data, month);
    const budgets = data.budgets.filter((b) => b.month === month);
    box.innerHTML = "";
    if (!budgets.length) {
      box.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='target'></i></div><div><strong>No budgets for this month</strong><br><span class='small'><a href='budget.html'>Set budgets</a> to see status here.</span></div></div>";
      UI.createIcons(box);
      return;
    }
    budgets.slice(0, 5).forEach((b) => {
      const used = spent[b.categoryId] || 0;
      const pct = b.amount > 0 ? Math.min((used / b.amount) * 100, 100) : 0;
      const over = used > b.amount;
      const item = document.createElement("div");
      item.className = "grid-row";
      item.style.gridTemplateColumns = "1fr auto";
      item.style.padding = "8px 0";
      item.innerHTML =
        "<span><span style='font-weight:600'>" + UI.esc(UI.categoryName(data.categories, b.categoryId)) + "</span><br><span class='small muted'>" + UI.fmtMoney(used) + " of " + UI.fmtMoney(b.amount) + (over ? " — OVER" : "") + "</span></span>" +
        "<span class='" + (over ? "text-danger" : "text-success") + "' style='font-weight:800'>" + Math.round(pct) + "%</span>";
      box.appendChild(item);
    });
  }

  function renderReminders(data) {
    const box = $("#reminder-list");
    if (!box) return;
    const reminders = Transactions.upcomingReminders(data, 14);
    box.innerHTML = "";
    if (!reminders.length) {
      box.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='repeat'></i></div><div><strong>No upcoming recurring expenses</strong><br><span class='small'>Recurring reminders will appear here.</span></div></div>";
      UI.createIcons(box);
      return;
    }
    reminders.forEach((r) => {
      const days = r.days;
      const cls = days < 0 ? "overdue" : days === 0 ? "today" : "";
      const label = days < 0 ? "Overdue by " + Math.abs(days) + "d" : days === 0 ? "Due today" : "in " + days + "d";
      const item = document.createElement("div");
      item.className = "reminder-item " + cls;
      item.innerHTML =
        "<div class='reminder-icon'><i data-lucide='repeat'></i></div>" +
        "<div><div class='r-name'>" + UI.esc(r.rec.name) + "</div><div class='r-meta'>" + UI.fmtMoney(r.rec.amount) + " • " + UI.esc(Storage.dateFmt(r.next)) + "</div></div>" +
        "<div class='r-days'>" + label + "</div>";
      box.appendChild(item);
      UI.createIcons(item);
    });
  }

  function renderAccountsSummary(data) {
    const box = $("#accounts-summary");
    if (!box) return;
    if (!data.accounts.length) {
      box.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='landmark'></i></div><div><strong>No accounts</strong><br><span class='small'>Add accounts to track balances separately.</span></div></div>";
      UI.createIcons(box);
      return;
    }
    data.accounts.forEach((a) => {
      let inflow = 0, outflow = 0;
      data.incomes.forEach((t) => { if (t.accountId === a.id) inflow += Number(t.amount) || 0; });
      data.expenses.forEach((t) => { if (t.accountId === a.id) outflow += Number(t.amount) || 0; });
      const bal = (Number(a.balance) || 0) + inflow - outflow;
      const item = document.createElement("div");
      item.className = "grid-row";
      item.style.gridTemplateColumns = "1fr auto";
      item.style.padding = "8px 0";
      item.innerHTML =
        "<span><span style='font-weight:600'>" + UI.esc(a.name) + "</span> <span class='badge badge-muted'>" + UI.esc(a.type) + "</span><br><span class='small muted'>I/O: " + UI.fmtMoney(inflow) + " / " + UI.fmtMoney(outflow) + "</span></span>" +
        "<span style='font-weight:800'>" + UI.fmtMoney(bal) + "</span>";
      box.appendChild(item);
    });
  }

  function exportQuick() {
    const data = Storage.getData(Storage.getSession().userId);
    const rows = [["Type", "Date", "Category", "Account", "Description", "Amount"]];
    data.incomes.forEach((t) => rows.push(["Income", t.date, UI.categoryName(data.categories, t.categoryId), UI.accountName(data.accounts, t.accountId), t.description || "", t.amount]));
    data.expenses.forEach((t) => rows.push(["Expense", t.date, UI.categoryName(data.categories, t.categoryId), UI.accountName(data.accounts, t.accountId), t.description || "", t.amount]));
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expense-tracker-export-" + Storage.todayISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { init };
})();

UI.onReady(function () {
  UserDash.init();
});