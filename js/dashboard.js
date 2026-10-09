/* ============================================================
   EXPENSE TRACKER - dashboard.js
   Shared UI helpers, calculations and pure-canvas charts
   ============================================================ */

const UI = (function () {
  function $(id) {
    // getElementById can be unreliable during early DOM init on some engines;
    // fall back to querySelector so lookups always succeed.
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  }
  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function fmtMoney(n) {
    return Storage.currency(n);
  }
  function categoryName(categories, id) {
    const all = (categories.expense || []).concat(categories.income || []);
    const c = all.find((x) => x.id === id);
    return c ? c.name : "Unknown";
  }
  function accountName(accounts, id) {
    const a = (accounts || []).find((x) => x.id === id);
    return a ? a.name : "Unknown";
  }
  function createIcons(root) {
    if (window.lucide) window.lucide.createIcons({ root: root || document });
  }

  /* ---------- totals & summaries ---------- */
  function calcTotals(data) {
    let income = 0;
    let expense = 0;
    (data.incomes || []).forEach((t) => (income += Number(t.amount) || 0));
    (data.expenses || []).forEach((t) => (expense += Number(t.amount) || 0));
    return { income: income, expense: expense, balance: income - expense };
  }

  function totalsForMonth(data, month) {
    let income = 0;
    let expense = 0;
    (data.incomes || []).forEach((t) => {
      if (Storage.monthKey(t.date) === month) income += Number(t.amount) || 0;
    });
    (data.expenses || []).forEach((t) => {
      if (Storage.monthKey(t.date) === month) expense += Number(t.amount) || 0;
    });
    return { income: income, expense: expense, balance: income - expense };
  }

  function expensesByCategory(data, month) {
    const map = {};
    (data.expenses || []).forEach((t) => {
      if (month && Storage.monthKey(t.date) !== month) return;
      map[t.categoryId] = (map[t.categoryId] || 0) + (Number(t.amount) || 0);
    });
    return map;
  }

  function monthlySeries(data, monthsToShow) {
    const now = new Date();
    const months = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months.push({ key: key, label: d.toLocaleDateString("en-US", { month: "short" }) + " '" + String(d.getFullYear()).slice(2) });
    }
    const out = months.map((m) => {
      const t = totalsForMonth(data, m.key);
      return { label: m.label, income: t.income, expense: t.expense };
    });
    return out;
  }

  /* ---------- shell / sidebar ---------- */
  const PAGE_TITLES = {
    "user-dashboard.html": "Dashboard",
    "transactions.html": "Transactions",
    "budget.html": "Budgets",
    "accounts.html": "Accounts",
    "reports.html": "Reports",
    "admin-dashboard.html": "Admin Dashboard",
  };

  const DASHBOARD_THEMES = {
    teal: { primary: "#0f766e", dark: "#115e59", light: "#ccfbf1", accent: "#14b8a6", shadow: "rgba(15, 118, 110, 0.35)" },
    red: { primary: "#dc2626", dark: "#b91c1c", light: "#fee2e2", accent: "#f87171", shadow: "rgba(220, 38, 38, 0.32)" },
    blue: { primary: "#2563eb", dark: "#1d4ed8", light: "#dbeafe", accent: "#60a5fa", shadow: "rgba(37, 99, 235, 0.32)" },
    navy: { primary: "#1e3a8a", dark: "#172554", light: "#dbeafe", accent: "#3b82f6", shadow: "rgba(30, 58, 138, 0.32)" },
    green: { primary: "#16a34a", dark: "#15803d", light: "#dcfce7", accent: "#4ade80", shadow: "rgba(22, 163, 74, 0.32)" },
    mint: { primary: "#059669", dark: "#047857", light: "#d1fae5", accent: "#34d399", shadow: "rgba(5, 150, 105, 0.32)" },
    violet: { primary: "#7c3aed", dark: "#6d28d9", light: "#ede9fe", accent: "#a78bfa", shadow: "rgba(124, 58, 237, 0.32)" },
    orange: { primary: "#ea580c", dark: "#c2410c", light: "#ffedd5", accent: "#fb923c", shadow: "rgba(234, 88, 12, 0.32)" },
    pink: { primary: "#db2777", dark: "#be185d", light: "#fce7f3", accent: "#f472b6", shadow: "rgba(219, 39, 119, 0.32)" },
    rose: { primary: "#e11d48", dark: "#be123c", light: "#ffe4e6", accent: "#fb7185", shadow: "rgba(225, 29, 72, 0.32)" },
    amber: { primary: "#d97706", dark: "#b45309", light: "#fef3c7", accent: "#fbbf24", shadow: "rgba(217, 119, 6, 0.32)" },
  };

  function setDashboardTheme(themeName) {
    const theme = DASHBOARD_THEMES[themeName];
    const root = document.documentElement;

    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-dark", theme.dark);
    root.style.setProperty("--primary-light", theme.light);
    root.style.setProperty("--primary-shadow", theme.shadow);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--sidebar-active", theme.primary);
  }

  function applyDashboardTheme(session) {
    if (!session || (session.role !== "user" && session.role !== "admin")) return;
    const storageKey = session.role === "admin" ? "et_theme_admin" : "et_theme_" + session.userId;
    const savedTheme = localStorage.getItem(storageKey);
    const publicTheme = localStorage.getItem("et_public_theme");
    const themeName = Object.prototype.hasOwnProperty.call(DASHBOARD_THEMES, savedTheme)
      ? savedTheme
      : Object.prototype.hasOwnProperty.call(DASHBOARD_THEMES, publicTheme) ? publicTheme : "teal";
    setDashboardTheme(themeName);

    const picker = $("dashboard-theme");
    if (picker) {
      picker.value = themeName;
      picker.addEventListener("change", () => {
        if (!Object.prototype.hasOwnProperty.call(DASHBOARD_THEMES, picker.value)) return;
        localStorage.setItem(storageKey, picker.value);
        setDashboardTheme(picker.value);
      });
    }
  }

  function initPublicTheme() {
    const picker = $("public-theme");
    if (!picker) return;

    const savedTheme = localStorage.getItem("et_public_theme");
    const themeName = Object.prototype.hasOwnProperty.call(DASHBOARD_THEMES, savedTheme) ? savedTheme : "teal";
    picker.value = themeName;
    setDashboardTheme(themeName);
    picker.addEventListener("change", () => {
      if (!Object.prototype.hasOwnProperty.call(DASHBOARD_THEMES, picker.value)) return;
      localStorage.setItem("et_public_theme", picker.value);
      setDashboardTheme(picker.value);
    });
  }

  function initShell(session) {
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const title = PAGE_TITLES[page] || "Expense Tracker";
    const h = $("page-title");
    if (h) h.textContent = title;
    applyDashboardTheme(session);

    // sidebar user block
    const avatar = $("sb-avatar");
    const uname = $("sb-name");
    const uemail = $("sb-email");
    if (avatar && session) avatar.textContent = (session.name || "?").charAt(0).toUpperCase();
    if (uname && session) uname.textContent = session.name || "";
    if (uemail && session) uemail.textContent = session.email || "";

    // highlight active nav
    $$(".sidebar-nav a, .mobile-nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0].split("#")[0];
      if (href === page) a.classList.add("active");
    });

    // bind logout buttons
    $$("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });
  }

  /* ---------- pure canvas charts ---------- */
  function prepareCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width || 300, 100);
    const h = Math.max(rect.height || 260, 100);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function drawBarChart(canvas, labels, datasets) {
    if (!canvas) return;
    const { ctx, w, h } = prepareCanvas(canvas);
    const pad = { top: 24, right: 16, bottom: 34, left: 58 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const group = datasets.length;
    const slot = chartW / Math.max(labels.length, 1);
    const barW = Math.min(34, (slot * 0.72) / group);

    let maxVal = 1;
    datasets.forEach((ds) => ds.data.forEach((v) => (maxVal = Math.max(maxVal, Number(v) || 0))));
    maxVal = Math.ceil((maxVal * 1.15) / 10) * 10 || 10;

    // grid + y labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#94a3b8";
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.top + chartH - (chartH * i) / ticks;
      const val = (maxVal * i) / ticks;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + "k" : String(Math.round(val)), pad.left - 6, y);
    }

    // bars
    labels.forEach((label, li) => {
      const gx = pad.left + slot * li + (slot - barW * group) / 2;
      datasets.forEach((ds, di) => {
        const v = Number(ds.data[li]) || 0;
        const bh = (v / maxVal) * chartH;
        const x = gx + di * barW + (group > 1 ? 3 : 0);
        const y = pad.top + chartH - bh;
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, Math.max(barW - (group > 1 ? 4 : 0), 2), bh, 4) : ctx.rect(x, y, Math.max(barW - 4, 2), bh);
        ctx.fill();
      });
      // x label
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.fillText(label, pad.left + slot * li + slot / 2, h - 12);
    });

    // legend
    ctx.textAlign = "left";
    let lx = pad.left;
    datasets.forEach((ds) => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(lx, 8, 10, 10);
      ctx.fillStyle = "#334155";
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.fillText(ds.label, lx + 14, 13);
      lx += 14 + ctx.measureText(ds.label).width + 18;
    });
  }

  function drawDoughnut(canvas, labels, values, colors, centerText) {
    if (!canvas) return;
    const { ctx, w, h } = prepareCanvas(canvas);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const inner = radius * 0.62;

    const total = values.reduce((a, b) => a + (Number(b) || 0), 0);
    if (total <= 0) {
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "13px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No data", cx, cy);
      return;
    }

    let start = -Math.PI / 2;
    values.forEach((v, i) => {
      const slice = (Number(v) || 0) / total;
      const end = start + slice * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.arc(cx, cy, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      start = end;
    });

    if (centerText) {
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(centerText, cx, cy);
    }

    // legend
    if (labels.length) {
      ctx.textAlign = "left";
      ctx.font = "11px Segoe UI, sans-serif";
      let lx = 12;
      let ly = 6;
      labels.forEach((label, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(lx, ly, 9, 9);
        ctx.fillStyle = "#334155";
        const text = label + " (" + Math.round((Number(values[i]) || 0)) + ")";
        ctx.fillText(text, lx + 13, ly + 5);
        lx += 13 + ctx.measureText(text).width + 16;
        if (lx > w - 160) {
          lx = 12;
          ly += 20;
        }
      });
    }
  }

  function drawLineChart(canvas, labels, datasets) {
    if (!canvas) return;
    const { ctx, w, h } = prepareCanvas(canvas);
    const pad = { top: 24, right: 16, bottom: 34, left: 58 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let maxVal = 1;
    datasets.forEach((ds) => ds.data.forEach((v) => (maxVal = Math.max(maxVal, Number(v) || 0))));
    maxVal = Math.ceil((maxVal * 1.15) / 10) * 10 || 10;

    ctx.font = "11px Segoe UI, sans-serif";
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#94a3b8";
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.top + chartH - (chartH * i) / ticks;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const val = (maxVal * i) / ticks;
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + "k" : String(Math.round(val)), pad.left - 6, y);
    }

    datasets.forEach((ds) => {
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ds.data.forEach((v, i) => {
        const x = pad.left + (labels.length > 1 ? (chartW * i) / (labels.length - 1) : chartW / 2);
        const y = pad.top + chartH - (Number(v) / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // points
      ds.data.forEach((v, i) => {
        const x = pad.left + (labels.length > 1 ? (chartW * i) / (labels.length - 1) : chartW / 2);
        const y = pad.top + chartH - (Number(v) / maxVal) * chartH;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#64748b";
    labels.forEach((label, i) => {
      const x = pad.left + (labels.length > 1 ? (chartW * i) / (labels.length - 1) : chartW / 2);
      ctx.fillText(label, x, h - 26);
    });
  }

  /* Robust ready helper: defer to window "load" so the DOM (including the
     browser's internal id index) is fully built before any init runs. */
  function onReady(fn) {
    const run = function () {
      try { fn(); } catch (e) { console.error("init error:", e); }
    };
    if (document.readyState === "complete") run();
    else {
      const handler = function () {
        window.removeEventListener("load", handler);
        run();
      };
      window.addEventListener("load", handler);
    }
  }

  return {
    $,
    $$,
    esc,
    fmtMoney,
    createIcons,
    categoryName,
    accountName,
    calcTotals,
    totalsForMonth,
    expensesByCategory,
    monthlySeries,
    initShell,
    initPublicTheme,
    drawBarChart,
    drawDoughnut,
    drawLineChart,
    onReady,
  };
})();

/* ============================================================
   REPORTS PAGE (reports.html)
   ============================================================ */
const Reports = (function () {
  function $ (id) {
    // getElementById can be unreliable during early DOM init on some engines
    const plain = String(id).replace(/^#/, "");
    return document.getElementById(plain) || document.querySelector("#" + plain);
  }

  function init() {
    const session = Auth.guardUserPage();
    if (!session) return;
    UI.initShell(Storage.getSession());

    const monthInput = $("report-month");
    if (monthInput) monthInput.addEventListener("change", render);
    render();
  }

  function getData() {
    return Storage.getData(Storage.getSession().userId);
  }

  function render() {
    const data = getData();
    const month = ($("report-month").value || Storage.monthKey());
    const mt = UI.totalsForMonth(data, month);

    // summary cards
    setVal("rep-income", UI.fmtMoney(mt.income));
    setVal("rep-expense", UI.fmtMoney(mt.expense));
    setVal("rep-balance", UI.fmtMoney(mt.balance));
    const all = UI.calcTotals(data);
    setVal("rep-all-income", UI.fmtMoney(all.income));
    setVal("rep-all-expense", UI.fmtMoney(all.expense));

    // 1) bar chart - income vs expense, last 6 months
    const series = UI.monthlySeries(data, 6);
    UI.drawBarChart(
      $("rep-chart-bar"),
      series.map((s) => s.label),
      [
        { label: "Income", color: "#16a34a", data: series.map((s) => s.income) },
        { label: "Expense", color: "#dc2626", data: series.map((s) => s.expense) },
      ]
    );

    // 2) doughnut - category breakdown for selected month
    const byCat = UI.expensesByCategory(data, month);
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const colors = ["#0f766e", "#14b8a6", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"];
    UI.drawDoughnut(
      $("rep-chart-doughnut"),
      entries.map((e) => UI.categoryName(data.categories, e[0])),
      entries.map((e) => e[1]),
      colors,
      mt.expense ? "Total" : null
    );
    const legendBox = $("rep-legend");
    if (legendBox) {
      legendBox.innerHTML = "";
      entries.forEach((e, i) => {
        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = "<span class='dot' style='background:" + colors[i % colors.length] + "'></span><span>" + UI.esc(UI.categoryName(data.categories, e[0])) + "</span><span>" + UI.fmtMoney(e[1]) + "</span>";
        legendBox.appendChild(item);
      });
    }

    // 3) line chart - balance trend (cumulative) per month, last 6 months
    let cum = 0;
    const trend = UI.monthlySeries(data, 6).map((s) => {
      cum += s.income - s.expense;
      return cum;
    });
    UI.drawLineChart(
      $("rep-chart-line"),
      UI.monthlySeries(data, 6).map((s) => s.label),
      [{ label: "Cumulative balance", color: "#0f766e", data: trend }]
    );

    // 4) monthly summary table
    renderMonthlyTable(data);

    // 5) export
    const btn = $("rep-export");
    if (btn) btn.onclick = () => exportReport(data, month);
  }

  function setVal(id, v) {
    const el = $(id);
    if (el) el.textContent = v;
  }

  function renderMonthlyTable(data) {
    const body = $("rep-monthly-body");
    if (!body) return;
    // collect months present in data
    const months = new Set();
    data.expenses.forEach((t) => months.add(Storage.monthKey(t.date)));
    data.incomes.forEach((t) => months.add(Storage.monthKey(t.date)));
    const list = Array.from(months).sort().reverse();
    body.innerHTML = "";
    if (!list.length) {
      body.innerHTML = "<div class='empty-state'><div class='icon'><i data-lucide='chart-no-axes-column-increasing'></i></div><div>No data yet to report on.</div></div>";
      UI.createIcons(body);
      return;
    }
    list.forEach((m) => {
      const t = UI.totalsForMonth(data, m);
      const row = document.createElement("div");
      row.className = "grid-row";
      row.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
      row.innerHTML =
        "<span class='cell'><strong>" + UI.esc(m) + "</strong></span>" +
        "<span class='cell amount text-success'>+" + UI.fmtMoney(t.income) + "</span>" +
        "<span class='cell amount text-danger'>-" + UI.fmtMoney(t.expense) + "</span>" +
        "<span class='cell amount'>" + UI.fmtMoney(t.balance) + "</span>";
      body.appendChild(row);
    });
  }

  function exportReport(data, month) {
    const rows = [["Year-Month", "Income", "Expense", "Balance"]];
    const months = new Set();
    data.expenses.forEach((t) => months.add(Storage.monthKey(t.date)));
    data.incomes.forEach((t) => months.add(Storage.monthKey(t.date)));
    Array.from(months).sort().forEach((m) => {
      const t = UI.totalsForMonth(data, m);
      rows.push([m, t.income.toFixed(2), t.expense.toFixed(2), t.balance.toFixed(2)]);
    });
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expense-report-" + month + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { init };
})();