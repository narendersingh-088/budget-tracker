// ===== STATE =====
let transactions = JSON.parse(localStorage.getItem('budget_transactions')) || [];
let currentFilter = 'all';
let currentType = 'income';

const CATEGORY_ICONS = {
  Food: '🍔', Transport: '🚌', Shopping: '🛍',
  Health: '💊', Entertainment: '🎬', Bills: '💡',
  Income: '💰', Other: '📦'
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setMonthLabel();
  setupTypeToggle();
  setupFilterButtons();
  render();
});

// ===== MONTH LABEL =====
function setMonthLabel() {
  const el = document.getElementById('current-month');
  const now = new Date();
  el.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ===== TYPE TOGGLE =====
function setupTypeToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
    });
  });
}

// ===== FILTER =====
function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });
}

// ===== ADD TRANSACTION =====
function addTransaction() {
  const desc   = document.getElementById('tx-desc').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const cat    = document.getElementById('tx-category').value;

  if (!desc) return shake('tx-desc');
  if (!amount || amount <= 0) return shake('tx-amount');

  const tx = {
    id: Date.now(),
    desc,
    amount,
    category: cat,
    type: currentType,
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  transactions.unshift(tx);
  save();
  render();

  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-amount').value = '';
}

// ===== DELETE =====
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
}

// ===== CLEAR ALL =====
function clearAll() {
  if (transactions.length === 0) return;
  if (!confirm('Clear all transactions? This cannot be undone.')) return;
  transactions = [];
  save();
  render();
}

// ===== SAVE =====
function save() {
  localStorage.setItem('budget_transactions', JSON.stringify(transactions));
}

// ===== RENDER =====
function render() {
  renderSummary();
  renderList();
  renderBreakdown();
}

// ===== SUMMARY =====
function renderSummary() {
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  document.getElementById('total-income').textContent  = formatCurrency(income);
  document.getElementById('total-expense').textContent = formatCurrency(expense);
  document.getElementById('net-balance').textContent   = formatCurrency(Math.abs(balance));

  const balCard  = document.querySelector('.card--balance .card-amount');
  const statusEl = document.getElementById('balance-status');

  if (balance > 0) {
    balCard.style.color = 'var(--income)';
    statusEl.textContent = '▲ Surplus';
    statusEl.style.color = 'var(--income)';
  } else if (balance < 0) {
    balCard.style.color = 'var(--expense)';
    statusEl.textContent = '▼ Deficit';
    statusEl.style.color = 'var(--expense)';
  } else {
    balCard.style.color = 'var(--text)';
    statusEl.textContent = '— Balanced';
    statusEl.style.color = 'var(--muted)';
  }

  const total = income + expense || 1;
  setTimeout(() => {
    document.getElementById('income-bar').style.width  = (income  / total * 100) + '%';
    document.getElementById('expense-bar').style.width = (expense / total * 100) + '%';
  }, 50);
}

// ===== LIST =====
function renderList() {
  const list     = document.getElementById('tx-list');
  const emptyEl  = document.getElementById('empty-state');
  const filtered = transactions.filter(t => currentFilter === 'all' || t.type === currentFilter);

  // Remove existing items (keep empty state)
  list.querySelectorAll('.tx-item').forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  filtered.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.dataset.id = tx.id;
    item.innerHTML = `
      <div class="tx-dot tx-dot--${tx.type}"></div>
      <div class="tx-category-icon">${CATEGORY_ICONS[tx.category] || '📦'}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(tx.desc)}</div>
        <div class="tx-meta">${tx.category} · ${tx.date}</div>
      </div>
      <div class="tx-amount tx-amount--${tx.type}">
        ${tx.type === 'expense' ? '−' : '+'}${formatCurrency(tx.amount)}
      </div>
      <button class="tx-delete" onclick="deleteTransaction(${tx.id})" title="Delete">✕</button>
    `;
    list.appendChild(item);
  });
}

// ===== BREAKDOWN =====
function renderBreakdown() {
  const container = document.getElementById('category-breakdown');
  container.innerHTML = '';

  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    container.innerHTML = '<div class="cat-empty">No expense data yet.</div>';
    return;
  }

  const totals = {};
  expenses.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const max = Math.max(...Object.values(totals));
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([cat, amt]) => {
    const pct = (amt / max * 100).toFixed(1);
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <div class="cat-label">${CATEGORY_ICONS[cat] || '📦'} ${cat}</div>
      <div class="cat-track">
        <div class="cat-fill" style="width: 0%" data-pct="${pct}"></div>
      </div>
      <div class="cat-amount">${formatCurrency(amt)}</div>
    `;
    container.appendChild(row);
  });

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('.cat-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 50);
}

// ===== HELPERS =====
function formatCurrency(val) {
  return '₹' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function shake(id) {
  const el = document.getElementById(id);
  el.style.transition = 'none';
  el.style.borderColor = 'var(--expense)';
  el.style.boxShadow = '0 0 0 3px rgba(255,79,109,0.2)';
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(0)' }
  ], { duration: 300, easing: 'ease-out' });
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1200);
  el.focus();
}