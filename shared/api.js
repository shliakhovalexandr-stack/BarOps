/* ============================================================
   BarOps — shared/api.js
   API клієнт для з'єднання з backend
   ============================================================ */

const API_URL = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   ТОКЕН
════════════════════════ */
function getToken()         { return localStorage.getItem('barops_token'); }
function setToken(t)        { localStorage.setItem('barops_token', t); }
function setRefresh(t)      { localStorage.setItem('barops_refresh', t); }
function getRefresh()       { return localStorage.getItem('barops_refresh'); }
function clearAuth()        { localStorage.removeItem('barops_token'); localStorage.removeItem('barops_refresh'); }

/* ════════════════════════
   BASE FETCH
════════════════════════ */
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  // Якщо токен прострочений — оновлюємо
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Повторюємо запит з новим токеном
      return apiFetch(path, opts);
    } else {
      clearAuth();
      window.__barops?.navigate('auth');
      throw new Error('Сесія завершена');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

async function tryRefresh() {
  const refresh = getRefresh();
  if (!refresh) return false;
  try {
    const res  = await fetch(`${API_URL}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json();
    if (data.token) { setToken(data.token); return true; }
    return false;
  } catch { return false; }
}

/* ════════════════════════
   AUTH API
════════════════════════ */
export const authAPI = {
  async sendOtp(phone) {
    return apiFetch('/api/auth/send-otp', { method: 'POST', body: { phone } });
  },

  async verifyOtp(phone, code) {
    const data = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: { phone, code },
    });
    if (data.token) {
      setToken(data.token);
      setRefresh(data.refreshToken);
    }
    return data;
  },

  logout() { clearAuth(); },

  isLoggedIn() { return !!getToken(); },
};

/* ════════════════════════
   PRODUCTS API
════════════════════════ */
export const productsAPI = {
  async getAll(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/products${q ? '?' + q : ''}`);
  },

  async getById(id) {
    return apiFetch(`/api/products/${id}`);
  },

  async update(id, data) {
    return apiFetch(`/api/products/${id}`, { method: 'PUT', body: data });
  },

  async search(query) {
    return apiFetch(`/api/products/search/${encodeURIComponent(query)}`);
  },
};

/* ════════════════════════
   INVOICES API
════════════════════════ */
export const invoicesAPI = {
  async getAll() {
    return apiFetch('/api/invoices');
  },

  async create(invoice) {
    return apiFetch('/api/invoices', { method: 'POST', body: invoice });
  },

  async confirm(id) {
    return apiFetch(`/api/invoices/${id}/confirm`, { method: 'POST' });
  },
};

/* ════════════════════════
   WRITEOFFS API
════════════════════════ */
export const writeoffsAPI = {
  async getAll(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/api/writeoffs${q ? '?' + q : ''}`);
  },

  async create(writeoff) {
    return apiFetch('/api/writeoffs', { method: 'POST', body: writeoff });
  },

  async getReport() {
    return apiFetch('/api/writeoffs/report');
  },
};

/* ════════════════════════
   SHIFTS API
════════════════════════ */
export const shiftsAPI = {
  async getAll()         { return apiFetch('/api/shifts'); },
  async getCurrent()     { return apiFetch('/api/shifts/current'); },
  async open()           { return apiFetch('/api/shifts', { method: 'POST' }); },
  async close(id, notes) { return apiFetch(`/api/shifts/${id}/close`, { method: 'POST', body: { notes } }); },
  async updateChecklist(id, checklist) {
    return apiFetch(`/api/shifts/${id}/checklist`, { method: 'PUT', body: { checklist } });
  },
};

/* ════════════════════════
   ORDERS API
════════════════════════ */
export const ordersAPI = {
  async getAll()          { return apiFetch('/api/orders'); },
  async create(order)     { return apiFetch('/api/orders', { method: 'POST', body: order }); },
  async update(id, data)  { return apiFetch(`/api/orders/${id}`, { method: 'PUT', body: data }); },
};

/* ════════════════════════
   DEBTS API
════════════════════════ */
export const debtsAPI = {
  async getAll()       { return apiFetch('/api/debts'); },
  async create(debt)   { return apiFetch('/api/debts', { method: 'POST', body: debt }); },
  async return_(id)    { return apiFetch(`/api/debts/${id}/return`, { method: 'POST' }); },
};

/* ════════════════════════
   HEALTH CHECK
════════════════════════ */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch { return false; }
}

export default { authAPI, productsAPI, invoicesAPI, writeoffsAPI, shiftsAPI, ordersAPI, debtsAPI, checkHealth };
