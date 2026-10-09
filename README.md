# 💰 Expense Tracker

A complete **Frontend SDC (Software Development Capstone) project** — a fully functional expense tracking system built with **HTML, CSS and Vanilla JavaScript**, using **Local Storage** for all data persistence. The interface uses Lucide icons loaded from its CDN; no application framework, database, build tools, or backend are required.

---

## 📌 Problem Statement

An expense tracker helps individuals or small businesses monitor their financial transactions. Users can categorize expenses, set budgets, and view insights through charts and reports. The system includes features like recurring expense reminders, multi-account tracking, and exporting data. This tool promotes financial discipline and goal setting.

## 🎯 Objective

Build a working, client-side only Expense Tracker that lets users record and manage income/expenses, set and monitor budgets, track multiple accounts, receive recurring-expense reminders, view charts/reports, and export data — while an **Admin Module** allows an administrator to manage users, monitor transactions and review overall platform statistics. All data must persist using the browser's **Local Storage**.

## 🏗️ Modules

### 1. Admin Module
- Separate Admin Login (`admin` / `admin123`)
- Admin Dashboard with platform statistics (users, income, expense, balance, transaction count)
- View all registered users and their details (with a per-user info panel)
- View all transactions across all users (with income/expense scope filter)
- Overall income vs expense chart for the platform
- Manage default expense/income categories
- Logout

### 2. User Module
- User Signup (with validation) & User Login (credentials verified against Local Storage)
- User Dashboard with financial summaries (income, expense, balance, monthly spend)
- Add / Edit / Delete / View expenses and incomes with category, amount, date, description and account
- Categorize expenses
- Set budgets per category per month, view budget usage and alerts
- Multi-account tracking (Cash, Bank, Credit Card, Wallet, Other)
- Recurring expense reminders with "post now" scheduling
- Charts & reports rendered with pure Canvas (no libraries):
  - Expense-by-category doughnut
  - Income vs expense bar chart
  - Cumulative balance trend line chart
- Export transaction data & reports as CSV
- Logout

## 🛠️ Technologies Used

| Technology  | Usage |
|-------------|-------|
| **HTML5**   | Structure of all pages |
| **CSS3**    | Complete UI styled with **CSS Grid** (layouts, dashboards, cards, tables, charts) |
| **Vanilla JavaScript** | All logic: auth, CRUD, calculations, charts, navigation, export |
| **Local Storage** | All persistent data: users, admin credentials, session, expenses, income, budgets, accounts, categories, recurring expenses |
| **Lucide** | Consistent interface icons, loaded from CDN |

> ❌ No React, Bootstrap, Tailwind, Node.js, PHP, Python, Firebase, databases, or application framework.

## ✨ Features

- ✅ Signup & Login with validation (user + separate admin login)
- ✅ Session management via Local Storage
- ✅ Module-wise navigation & redirection with protected dashboards
- ✅ Expense / Income Add, Edit, Delete, View
- ✅ Totals calculated in JavaScript (income, expense, balance)
- ✅ Budgets with usage progress bars and over-budget warnings
- ✅ Multi-account balances (opening balance + income − expenses)
- ✅ Recurring expense reminders (daily/weekly/monthly/yearly)
- ✅ Charts drawn on `<canvas>` with pure JavaScript
- ✅ CSV export of transactions and monthly reports
- ✅ Fully responsive (CSS Grid + media queries)
- ✅ Personalized user and admin dashboard colors with saved themes (teal, red, blue, dark blue, green, light green, violet, orange, pink, rose, amber)
- ✅ One user's data never appears for another user (per-user Local Storage keys)

## 📁 Folder Structure

```
expense-tracker/
├── index.html              ← Landing page (module selection)
├── login.html              ← User login
├── signup.html             ← User signup
├── admin-login.html        ← Admin login
├── user-dashboard.html     ← User dashboard
├── admin-dashboard.html    ← Admin dashboard
├── transactions.html       ← Add/edit/delete expenses & income + recurring
├── budget.html             ← Set budgets + usage status
├── accounts.html           ← Multi-account management
├── reports.html            ← Charts, monthly summary, export
├── css/
│   └── style.css           ← All styling (CSS Grid based)
├── js/
│   ├── storage.js          ← Local Storage data layer
│   ├── auth.js             ← Signup, login, logout, session & page guards
│   ├── dashboard.js        ← Shared UI helpers, calculations, canvas charts, reports
│   ├── transactions.js     ← Transactions CRUD, budgets, accounts, recurring, export
│   ├── user.js             ← User dashboard logic
│   └── admin.js            ← Admin dashboard logic
└── README.md
```

## 🔐 Default Credentials

| Role  | Username / Email | Password |
|-------|------------------|----------|
| Admin | `admin`          | `admin123` |
| User  | *(create via Signup)* | *(set at signup)* |

## 🚀 How to Run

No installation required — the project runs entirely in the browser.

1. Download / clone the repository.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox).
   - Or run a simple static server:
     - `python -m http.server 8000` *(optional)*
     - then open `http://localhost:8000`
3. **User flow:** Signup → auto-login → User Dashboard → use Transactions / Budgets / Accounts / Reports → Logout.
4. **Admin flow:** Admin Login (`admin` / `admin123`) → Admin Dashboard → manage users, transactions & categories → Logout.

> ⚠️ Data is stored in your browser's **Local Storage** — clearing browser data will remove the accounts. Each browser/device keeps its own data.

## 🧪 Tested Functionality

- Signup, user login, admin login, logout
- Add / Edit / Delete expense & income
- Budget calculation & usage display
- Account management & balances
- Reports (charts + monthly summary)
- Local Storage persistence & session restore
- Page navigation & module redirection
- Dashboard protection (redirects unauthenticated visitors to login)

---

Made with HTML, CSS and Vanilla JavaScript for an SDC (Software Development Capstone) project. © 2026