/* =============================================
   LEDGER — Expense Tracker
   script.js — Modular Vanilla JS
   ============================================= */

'use strict';

/* =============================================
   MODULE: STATE
   Central application state
   ============================================= */
const State = (() => {
  let _transactions = [];
  let _budget       = 0;
  let _theme        = 'light';
  let _editingId    = null;

  return {
    get transactions() { return [..._transactions]; },
    get budget()       { return _budget; },
    get theme()        { return _theme; },
    get editingId()    { return _editingId; },

    setTransactions(arr)  { _transactions = arr; },
    setBudget(val)        { _budget = val; },
    setTheme(t)           { _theme = t; },
    setEditingId(id)      { _editingId = id; },

    addTransaction(tx) { _transactions.unshift(tx); },
    updateTransaction(id, data) {
      const idx = _transactions.findIndex(t => t.id === id);
      if (idx > -1) _transactions[idx] = { ..._transactions[idx], ...data };
    },
    deleteTransaction(id) {
      _transactions = _transactions.filter(t => t.id !== id);
    }
  };
})();


/* =============================================
   MODULE: STORAGE
   localStorage persistence
   ============================================= */
const Storage = {
  KEYS: {
    transactions: 'ledger_transactions',
    budget:       'ledger_budget',
    theme:        'ledger_theme'
  },

  load() {
    try {
      const txRaw   = localStorage.getItem(this.KEYS.transactions);
      const budget  = localStorage.getItem(this.KEYS.budget);
      const theme   = localStorage.getItem(this.KEYS.theme);

      if (txRaw)  State.setTransactions(JSON.parse(txRaw));
      if (budget) State.setBudget(parseFloat(budget));
      if (theme)  State.setTheme(theme);
    } catch (e) {
      console.warn('Storage load error:', e);
    }
  },

  saveTransactions() {
    localStorage.setItem(this.KEYS.transactions, JSON.stringify(State.transactions));
  },

  saveBudget() {
    localStorage.setItem(this.KEYS.budget, State.budget.toString());
  },

  saveTheme() {
    localStorage.setItem(this.KEYS.theme, State.theme);
  }
};


/* =============================================
   MODULE: UTILS
   Helper functions
   ============================================= */
const Utils = {
  /** Generate a unique ID */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /** Format number as currency (INR) */
  currency(val) {
    return '₹' + Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  /** Format date string to readable format */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  /** Get YYYY-MM of a date string */
  yearMonth(dateStr) {
    return dateStr ? dateStr.slice(0, 7) : '';
  },

  /** Current YYYY-MM */
  currentYM() {
    return new Date().toISOString().slice(0, 7);
  },

  /** Today's date as YYYY-MM-DD */
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  /** Category emoji map */
  categoryIcon(cat) {
    const map = {
      food: '🍜', transport: '🚌', shopping: '🛍️',
      bills: '💡', entertainment: '🎬', health: '💊',
      salary: '💼', others: '📦'
    };
    return map[cat] || '📦';
  },

  /** Category display name */
  categoryName(cat) {
    const map = {
      food: 'Food', transport: 'Transport', shopping: 'Shopping',
      bills: 'Bills', entertainment: 'Entertainment', health: 'Health',
      salary: 'Salary', others: 'Others'
    };
    return map[cat] || cat;
  }
};


/* =============================================
   MODULE: CHARTS
   Chart.js wrappers
   ============================================= */
const Charts = (() => {
  let monthlyChart  = null;
  let categoryChart = null;
  let donutChart    = null;

  const chartDefaults = () => ({
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
    gridColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
    accentColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    incomeColor: getComputedStyle(document.documentElement).getPropertyValue('--income-color').trim(),
    expenseColor: getComputedStyle(document.documentElement).getPropertyValue('--expense-color').trim(),
  });

  function destroyAll() {
    [monthlyChart, categoryChart, donutChart].forEach(c => c && c.destroy());
    monthlyChart = categoryChart = donutChart = null;
  }

  function buildMonthly() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const txs = State.transactions;
    // Last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    const incomes  = months.map(m => txs.filter(t => t.type === 'income'  && Utils.yearMonth(t.date) === m).reduce((s, t) => s + t.amount, 0));
    const expenses = months.map(m => txs.filter(t => t.type === 'expense' && Utils.yearMonth(t.date) === m).reduce((s, t) => s + t.amount, 0));

    const labels = months.map(m => {
      const d = new Date(m + '-01');
      return d.toLocaleDateString('en-IN', { month: 'short' });
    });

    const defs = chartDefaults();

    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomes,
            backgroundColor: defs.incomeColor + '88',
            borderColor: defs.incomeColor,
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Expense',
            data: expenses,
            backgroundColor: defs.expenseColor + '88',
            borderColor: defs.expenseColor,
            borderWidth: 1.5,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: defs.color, font: { family: 'DM Sans', size: 12 } } },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + Utils.currency(ctx.raw)
            }
          }
        },
        scales: {
          x: { ticks: { color: defs.color }, grid: { color: defs.gridColor } },
          y: { ticks: { color: defs.color, callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: defs.gridColor } }
        }
      }
    });
  }

  function buildCategory() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const ym   = Utils.currentYM();
    const txs  = State.transactions.filter(t => t.type === 'expense' && Utils.yearMonth(t.date) === ym);
    const cats = {};
    txs.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });

    const labels = Object.keys(cats).map(Utils.categoryName);
    const data   = Object.values(cats);
    const defs   = chartDefaults();

    const COLORS = [
      '#C4622D','#2D7D52','#C49A2D','#2D5EC4','#7D2DC4','#C42D6B','#2DC4B8','#7D7D2D'
    ];

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: COLORS.slice(0, data.length).map(c => c + 'CC'),
          borderColor: COLORS.slice(0, data.length),
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: defs.color, font: { family: 'DM Sans', size: 11 }, padding: 10 }
          },
          tooltip: {
            callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) }
          }
        }
      }
    });
  }

  function buildDonut() {
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;

    const ym  = Utils.currentYM();
    const txs = State.transactions.filter(t => Utils.yearMonth(t.date) === ym);
    const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const defs = chartDefaults();

    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expense'],
        datasets: [{
          data: [inc, exp],
          backgroundColor: [defs.incomeColor + 'CC', defs.expenseColor + 'CC'],
          borderColor: [defs.incomeColor, defs.expenseColor],
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: defs.color, font: { family: 'DM Sans', size: 12 }, padding: 14 }
          },
          tooltip: {
            callbacks: { label: ctx => ' ' + Utils.currency(ctx.raw) }
          }
        }
      }
    });
  }

  return {
    render() {
      destroyAll();
      buildMonthly();
      buildCategory();
      buildDonut();
    }
  };
})();


/* =============================================
   MODULE: UI
   DOM rendering helpers
   ============================================= */
const UI = {
  /** Render a single transaction item HTML */
  txItemHTML(tx) {
    const isIncome = tx.type === 'income';
    const sign     = isIncome ? '+' : '-';
    return `
      <div class="tx-item" data-id="${tx.id}">
        <div class="tx-icon ${isIncome ? 'income-icon' : 'expense-icon'}">
          ${Utils.categoryIcon(tx.category)}
        </div>
        <div class="tx-info">
          <div class="tx-category">${Utils.categoryName(tx.category)}</div>
          ${tx.notes ? `<div class="tx-notes">${tx.notes}</div>` : ''}
        </div>
        <div class="tx-date">${Utils.formatDate(tx.date)}</div>
        <div class="tx-amount ${isIncome ? 'income' : 'expense'}">
          ${sign}${Utils.currency(tx.amount)}
        </div>
        <div class="tx-actions">
          <button class="tx-btn edit" data-id="${tx.id}" title="Edit">✎</button>
          <button class="tx-btn del"  data-id="${tx.id}" title="Delete">✕</button>
        </div>
      </div>
    `;
  },

  /** Update summary cards */
  updateSummary() {
    const ym  = Utils.currentYM();
    const txs = State.transactions.filter(t => Utils.yearMonth(t.date) === ym);

    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    document.getElementById('totalBalance').textContent = Utils.currency(balance);
    document.getElementById('totalIncome').textContent  = Utils.currency(income);
    document.getElementById('totalExpense').textContent = Utils.currency(expense);

    const balanceCard = document.getElementById('totalBalance');
    balanceCard.style.color = balance >= 0
      ? 'var(--text-primary)'
      : 'var(--expense-color)';

    document.getElementById('balanceSub').textContent =
      State.transactions.length === 0 ? 'No transactions yet' : `${txs.length} transactions this month`;
  },

  /** Render recent transactions on dashboard (up to 5) */
  renderRecent() {
    const list  = document.getElementById('recentList');
    const empty = document.getElementById('dashEmptyState');
    const txs   = State.transactions.slice(0, 5);

    if (txs.length === 0) {
      list.innerHTML = '';
      list.appendChild(empty);
      return;
    }

    empty.remove();
    list.innerHTML = txs.map(t => this.txItemHTML(t)).join('');
  },

  /** Render filtered full transaction list */
  renderFull(filtered) {
    const list  = document.getElementById('fullList');
    const empty = document.getElementById('txEmptyState');

    if (!filtered || filtered.length === 0) {
      list.innerHTML = '';
      list.appendChild(empty);
      return;
    }

    empty.remove();
    list.innerHTML = filtered.map(t => this.txItemHTML(t)).join('');
  },

  /** Update budget widget on dashboard */
  updateBudgetWidget() {
    const budget  = State.budget;
    const ym      = Utils.currentYM();
    const spent   = State.transactions
      .filter(t => t.type === 'expense' && Utils.yearMonth(t.date) === ym)
      .reduce((s, t) => s + t.amount, 0);

    const bwBar    = document.getElementById('bwBar');
    const bwStatus = document.getElementById('bwStatus');
    const bwAmts   = document.getElementById('bwAmounts');

    if (!budget) {
      bwBar.style.width      = '0%';
      bwBar.className        = 'bw-bar';
      bwStatus.textContent   = 'Set a budget in the Budget tab';
      bwAmts.textContent     = '—';
      return;
    }

    const pct = Math.min((spent / budget) * 100, 100);
    bwBar.style.width = pct + '%';
    bwAmts.textContent = `${Utils.currency(spent)} / ${Utils.currency(budget)}`;

    if (pct >= 100) {
      bwBar.className = 'bw-bar danger';
      bwStatus.textContent = '⚠️ Budget exceeded!';
    } else if (pct >= 80) {
      bwBar.className = 'bw-bar warning';
      bwStatus.textContent = `Warning: ${pct.toFixed(0)}% of budget used`;
    } else {
      bwBar.className = 'bw-bar';
      bwStatus.textContent = `${pct.toFixed(0)}% of budget used · ${Utils.currency(budget - spent)} remaining`;
    }
  },

  /** Render full budget view */
  renderBudget() {
    const budget = State.budget;
    const ym     = Utils.currentYM();
    const txs    = State.transactions.filter(t => t.type === 'expense' && Utils.yearMonth(t.date) === ym);
    const spent  = txs.reduce((s, t) => s + t.amount, 0);
    const rem    = budget - spent;
    const pct    = budget ? Math.min((spent / budget) * 100, 100) : 0;

    // Budget input pre-fill
    if (budget) document.getElementById('budgetInput').value = budget;

    // Status card
    document.getElementById('bsBudget').textContent    = budget ? Utils.currency(budget) : '—';
    document.getElementById('bsSpent').textContent     = Utils.currency(spent);
    document.getElementById('bsRemaining').textContent = budget ? Utils.currency(rem) : '—';

    const bar   = document.getElementById('budgetProgressBar');
    const label = document.getElementById('budgetProgressLabel');
    const alert = document.getElementById('budgetAlert');

    bar.style.width = pct + '%';
    bar.className   = 'budget-progress-bar' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
    label.textContent = budget ? `${pct.toFixed(1)}% used` : '';

    alert.className = 'budget-alert';
    if (budget && pct >= 100) {
      alert.className    += ' danger';
      alert.textContent   = '⛔ You have exceeded your monthly budget!';
    } else if (budget && pct >= 80) {
      alert.className    += ' warning';
      alert.textContent   = `⚠️ You've used ${pct.toFixed(0)}% of your budget. Only ${Utils.currency(budget - spent)} left.`;
    }

    // Category breakdown
    const cats = {};
    txs.forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    const maxAmt = Math.max(...Object.values(cats), 1);

    const bd = document.getElementById('categoryBreakdown');
    if (Object.keys(cats).length === 0) {
      bd.innerHTML = `<div class="empty-state"><div class="empty-icon">◐</div><p>No expenses this month.</p></div>`;
      return;
    }

    bd.innerHTML = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <div class="cat-row">
          <div class="cat-row-top">
            <span class="cat-name">${Utils.categoryIcon(cat)} ${Utils.categoryName(cat)}</span>
            <span class="cat-amount">${Utils.currency(amt)}</span>
          </div>
          <div class="cat-bar-wrap">
            <div class="cat-bar" style="width:${(amt / maxAmt * 100).toFixed(1)}%"></div>
          </div>
        </div>
      `).join('');
  },

  /** Apply filters and return filtered transactions */
  applyFilters() {
    const search  = document.getElementById('searchInput').value.toLowerCase().trim();
    const cat     = document.getElementById('filterCategory').value;
    const type    = document.getElementById('filterType').value;
    const from    = document.getElementById('filterFrom').value;
    const to      = document.getElementById('filterTo').value;

    return State.transactions.filter(t => {
      if (cat    && t.category !== cat)            return false;
      if (type   && t.type !== type)               return false;
      if (from   && t.date < from)                 return false;
      if (to     && t.date > to)                   return false;
      if (search) {
        const haystack = [t.category, t.notes || '', t.amount.toString()].join(' ').toLowerCase();
        if (!haystack.includes(search))             return false;
      }
      return true;
    });
  },

  /** Show toast notification */
  toast(msg, duration = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  },

  /** Full re-render of all components */
  refresh() {
    this.updateSummary();
    this.renderRecent();
    this.renderFull(this.applyFilters());
    this.updateBudgetWidget();
    this.renderBudget();
  }
};


/* =============================================
   MODULE: MODAL
   Add / Edit transaction modal
   ============================================= */
const Modal = {
  backdrop: null,
  isOpen:   false,

  init() {
    this.backdrop = document.getElementById('modalBackdrop');
  },

  open(editTx = null) {
    State.setEditingId(editTx ? editTx.id : null);
    this.isOpen = true;

    const title   = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('modalSave');

    if (editTx) {
      title.textContent   = 'Edit Transaction';
      saveBtn.textContent = 'Update Transaction';

      // Pre-fill form
      document.getElementById('txAmount').value   = editTx.amount;
      document.getElementById('txCategory').value = editTx.category;
      document.getElementById('txDate').value      = editTx.date;
      document.getElementById('txNotes').value     = editTx.notes || '';

      // Set type toggle
      this.setType(editTx.type);
    } else {
      title.textContent   = 'Add Transaction';
      saveBtn.textContent = 'Add Transaction';
      this.resetForm();
    }

    this.clearErrors();
    this.backdrop.classList.add('open');
    document.getElementById('txAmount').focus();
  },

  close() {
    this.isOpen = false;
    this.backdrop.classList.remove('open');
    State.setEditingId(null);
  },

  resetForm() {
    document.getElementById('txAmount').value   = '';
    document.getElementById('txCategory').value = '';
    document.getElementById('txDate').value      = Utils.today();
    document.getElementById('txNotes').value     = '';
    this.setType('expense');
  },

  setType(type) {
    const expBtn = document.getElementById('toggleExpense');
    const incBtn = document.getElementById('toggleIncome');
    expBtn.classList.toggle('active', type === 'expense');
    incBtn.classList.toggle('active', type === 'income');
    expBtn.dataset.active = type === 'expense' ? 'true' : 'false';
    incBtn.dataset.active = type === 'income'  ? 'true' : 'false';
    Modal._currentType = type;
  },

  getType() {
    return Modal._currentType || 'expense';
  },

  clearErrors() {
    ['amountError','categoryError','dateError'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
    ['txAmount','txCategory','txDate'].forEach(id => {
      document.getElementById(id).classList.remove('error');
    });
  },

  validate() {
    let valid = true;
    this.clearErrors();

    const amount = parseFloat(document.getElementById('txAmount').value);
    if (!amount || amount <= 0) {
      document.getElementById('amountError').textContent  = 'Please enter a valid amount';
      document.getElementById('txAmount').classList.add('error');
      valid = false;
    }

    const category = document.getElementById('txCategory').value;
    if (!category) {
      document.getElementById('categoryError').textContent = 'Please select a category';
      document.getElementById('txCategory').classList.add('error');
      valid = false;
    }

    const date = document.getElementById('txDate').value;
    if (!date) {
      document.getElementById('dateError').textContent = 'Please select a date';
      document.getElementById('txDate').classList.add('error');
      valid = false;
    }

    return valid;
  },

  save() {
    if (!this.validate()) return;

    const data = {
      amount:   parseFloat(parseFloat(document.getElementById('txAmount').value).toFixed(2)),
      category: document.getElementById('txCategory').value,
      date:     document.getElementById('txDate').value,
      notes:    document.getElementById('txNotes').value.trim(),
      type:     this.getType()
    };

    if (State.editingId) {
      // Update existing
      State.updateTransaction(State.editingId, data);
      UI.toast('✓ Transaction updated');
    } else {
      // Add new
      State.addTransaction({ id: Utils.uid(), createdAt: Date.now(), ...data });
      UI.toast('✓ Transaction added');
    }

    Storage.saveTransactions();
    this.close();
    UI.refresh();
    Charts.render();
  },

  _currentType: 'expense'
};


/* =============================================
   MODULE: DELETE CONFIRM
   ============================================= */
const DeleteModal = {
  backdrop: null,
  targetId: null,

  init() {
    this.backdrop = document.getElementById('deleteBackdrop');
  },

  open(id) {
    this.targetId = id;
    this.backdrop.classList.add('open');
  },

  close() {
    this.targetId = null;
    this.backdrop.classList.remove('open');
  },

  confirm() {
    if (!this.targetId) return;
    State.deleteTransaction(this.targetId);
    Storage.saveTransactions();
    UI.toast('✓ Transaction deleted');
    this.close();
    UI.refresh();
    Charts.render();
  }
};


/* =============================================
   MODULE: EXPORT
   Export transactions as CSV
   ============================================= */
const Exporter = {
  toCSV() {
    const txs = State.transactions;
    if (!txs.length) {
      UI.toast('No transactions to export');
      return;
    }

    const header = ['Date', 'Category', 'Type', 'Amount', 'Notes'];
    const rows   = txs.map(t => [
      t.date,
      Utils.categoryName(t.category),
      t.type,
      t.amount.toFixed(2),
      (t.notes || '').replace(/,/g, ';')  // escape commas
    ]);

    const csv     = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `ledger_export_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('✓ CSV exported');
  }
};


/* =============================================
   MODULE: NAVIGATION
   View switching
   ============================================= */
const Nav = {
  currentView: 'dashboard',

  switch(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target view
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');

    // Activate nav item
    const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (navItem) navItem.classList.add('active');

    // Update topbar title
    const titles = {
      dashboard:    'Dashboard',
      transactions: 'Transactions',
      charts:       'Analytics',
      budget:       'Budget'
    };
    document.getElementById('topbarTitle').textContent = titles[viewName] || viewName;

    this.currentView = viewName;

    // Render charts when switching to analytics
    if (viewName === 'charts') Charts.render();
    if (viewName === 'budget') UI.renderBudget();

    // Close sidebar on mobile
    this.closeSidebar();
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
  }
};


/* =============================================
   MODULE: THEME
   Dark / light mode
   ============================================= */
const Theme = {
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeIcon').textContent  = theme === 'dark' ? '◐' : '◑';
    document.getElementById('themeLabel').textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    State.setTheme(theme);
    Storage.saveTheme();
  },

  toggle() {
    this.apply(State.theme === 'dark' ? 'light' : 'dark');
    // Re-render charts with new colors
    if (Nav.currentView === 'charts') {
      setTimeout(() => Charts.render(), 100);
    }
  }
};


/* =============================================
   APP INIT
   Wire up all event listeners
   ============================================= */
function initApp() {
  // Load persisted data
  Storage.load();

  // Apply saved theme
  Theme.apply(State.theme);

  // Set default date
  document.getElementById('txDate').value = Utils.today();

  // Initial render
  UI.refresh();

  /* ---- Navigation ---- */
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => Nav.switch(btn.dataset.view));
  });

  // Dashboard "View all" link
  document.querySelectorAll('.link-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => Nav.switch(btn.dataset.view));
  });

  /* ---- Sidebar (mobile) ---- */
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('open');
  });

  document.getElementById('sidebarClose').addEventListener('click', Nav.closeSidebar);
  document.getElementById('overlay').addEventListener('click', Nav.closeSidebar);

  /* ---- Theme ---- */
  document.getElementById('themeToggle').addEventListener('click', () => Theme.toggle());

  /* ---- Add transaction buttons ---- */
  document.getElementById('addBtnTop').addEventListener('click', () => Modal.open());

  /* ---- Modal controls ---- */
  Modal.init();
  document.getElementById('modalClose').addEventListener('click',  () => Modal.close());
  document.getElementById('modalCancel').addEventListener('click', () => Modal.close());
  document.getElementById('modalSave').addEventListener('click',   () => Modal.save());

  // Close modal on backdrop click
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) Modal.close();
  });

  // Type toggle buttons
  document.getElementById('toggleExpense').addEventListener('click', () => Modal.setType('expense'));
  document.getElementById('toggleIncome').addEventListener('click',  () => Modal.setType('income'));

  // Enter key to save modal
  document.getElementById('txModal').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) Modal.save();
    if (e.key === 'Escape') Modal.close();
  });

  /* ---- Delete modal ---- */
  DeleteModal.init();
  document.getElementById('deleteCancelBtn').addEventListener('click',  () => DeleteModal.close());
  document.getElementById('deleteConfirmBtn').addEventListener('click', () => DeleteModal.confirm());
  document.getElementById('deleteBackdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteBackdrop')) DeleteModal.close();
  });

  /* ---- Transaction list delegation (edit / delete) ---- */
  document.addEventListener('click', e => {
    // Edit button
    if (e.target.closest('.tx-btn.edit')) {
      const id = e.target.closest('.tx-btn.edit').dataset.id;
      const tx = State.transactions.find(t => t.id === id);
      if (tx) Modal.open(tx);
      return;
    }
    // Delete button
    if (e.target.closest('.tx-btn.del')) {
      const id = e.target.closest('.tx-btn.del').dataset.id;
      DeleteModal.open(id);
      return;
    }
  });

  /* ---- Filters (live) ---- */
  ['searchInput','filterCategory','filterType','filterFrom','filterTo'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      UI.renderFull(UI.applyFilters());
    });
  });

  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value    = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value     = '';
    document.getElementById('filterFrom').value     = '';
    document.getElementById('filterTo').value       = '';
    UI.renderFull(UI.applyFilters());
  });

  /* ---- Budget ---- */
  document.getElementById('saveBudgetBtn').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('budgetInput').value);
    if (!val || val <= 0) {
      UI.toast('Please enter a valid budget amount');
      return;
    }
    State.setBudget(val);
    Storage.saveBudget();
    UI.renderBudget();
    UI.updateBudgetWidget();
    UI.toast('✓ Budget saved');
  });

  /* ---- Export ---- */
  document.getElementById('exportBtn').addEventListener('click', () => Exporter.toCSV());

  /* ---- Keyboard: close modals on Escape ---- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (Modal.isOpen)        Modal.close();
      if (DeleteModal.targetId) DeleteModal.close();
    }
  });
}

// Bootstrap the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
