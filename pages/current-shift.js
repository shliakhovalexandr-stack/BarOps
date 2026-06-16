/* ============================================================
   BarOps — pages/current-shift.js
   Поточна зміна: офіціанти з POS (зона, виторг, відкриті столи) у реальному часі
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _loading = true;
let _error   = '';
let _data    = null;        // { waiters:[], totalOpenTables, totalSum, sectionsCount }
let _openId  = null;        // розгорнутий офіціант (показ столів)
let _venueId = '';
let _cash    = [];          // вилучення з каси за сьогодні (BarOps) — матч по імені офіціанта

function token() { return localStorage.getItem('barops_token') || ''; }
function money(n) { return (Math.round((n || 0) * 100) / 100).toLocaleString('uk-UA') + ' ₴'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
// Вилучення з каси, зафіксовані на цього офіціанта (матч по імені sourceName ↔ WaiterName)
function cashFor(name) {
  const nm = (name || '').trim().toLowerCase();
  return _cash.filter(c => (c.sourceName || '').trim().toLowerCase() === nm);
}
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CSS = `<style id="cs-css">
.cs-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.cs-top{display:flex;align-items:center;gap:12px;padding:10px 18px 6px;flex-shrink:0}
.cs-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.cs-back:active{background:var(--bg3)}
.cs-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.cs-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.cs-refresh{margin-left:auto;width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.cs-scroll{overflow-y:auto;flex:1;padding:12px 16px 32px}.cs-scroll::-webkit-scrollbar{width:0}
.cs-kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px}
.cs-kpi{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 10px;text-align:center}
.cs-kpi-val{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);line-height:1}
.cs-kpi-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:5px;text-transform:uppercase;letter-spacing:.05em}
.cs-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;margin-bottom:8px;overflow:hidden}
.cs-row{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;transition:background .12s}
.cs-row:active{background:var(--bg2)}
.cs-av{width:42px;height:42px;border-radius:50%;background:var(--purple-bg,#241b3a);color:#A88BFF;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:15px;flex-shrink:0}
.cs-name{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.cs-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.cs-zone{display:inline-block;background:var(--green-bg,#1a3320);color:var(--green);border:0.5px solid var(--green-border,#2d5c3a);border-radius:6px;padding:1px 7px;font-size:10px;font-family:var(--font-b);margin-right:4px}
.cs-sum{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);text-align:right;flex-shrink:0}
.cs-sum-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);text-align:right;margin-top:1px}
.cs-chev{flex-shrink:0;transition:transform .2s}
.cs-chev.open{transform:rotate(90deg)}
.cs-tables{border-top:0.5px solid var(--border);padding:6px 16px 12px;display:flex;flex-direction:column;gap:6px}
.cs-table{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg2);border-radius:10px}
.cs-table-no{width:32px;height:32px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:13px;color:var(--text0);flex-shrink:0}
.cs-table-info{flex:1;min-width:0}
.cs-table-zone{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.cs-table-sum{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.cs-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center}
.cs-empty-icon{font-size:34px;opacity:.4}
.cs-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.cs-spin{width:22px;height:22px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--green);animation:csSpin .7s linear infinite;margin:48px auto}
@keyframes csSpin{to{transform:rotate(360deg)}}
.cs-err{background:var(--red-bg,#2a1212);border:0.5px solid var(--red-border,#5c2d2d);border-radius:12px;padding:14px;font-size:12px;color:var(--red);font-family:var(--font-b);margin-top:8px}
</style>`;

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

async function load() {
  _loading = true; _error = ''; re();
  _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
  // Вилучення з каси (швидкий запит до BarOps) — паралельно з POS
  const cashP = fetch(`${API}/api/cash/withdrawals?venueId=${_venueId}`, { headers: { Authorization: `Bearer ${token()}` } })
    .then(r => r.json()).then(d => { _cash = d && d.success ? (d.withdrawals || []) : []; })
    .catch(() => { _cash = []; });
  try {
    const res = await fetch(`${API}/api/pos/current-shift/${_venueId}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await res.json();
    if (res.ok && d.ok) _data = d;
    else _error = d.error || 'Не вдалося завантажити дані зміни';
  } catch {
    _error = 'Немає звʼязку із сервером';
  }
  await cashP;
  _loading = false; re();
}

function re() {
  const root = document.getElementById('cs-root');
  if (root) root.innerHTML = body();
}

function chequeWord(n) {
  const r = Math.round(n);
  return r === 1 ? 'чек' : (r >= 2 && r <= 4 ? 'чеки' : 'чеків');
}
function guestWord(n) {
  const r = Math.round(n);
  return r === 1 ? 'гість' : (r >= 2 && r <= 4 ? 'гості' : 'гостей');
}

function waiterCard(w) {
  const open = _openId === w.id;
  const outs = cashFor(w.name);
  const outsTotal = outs.reduce((s, c) => s + (c.amount || 0), 0);
  return `
  <div class="cs-card">
    <div class="cs-row" onclick="window.__cs.toggle('${w.id.replace(/'/g, "\\'")}')">
      <div class="cs-av">${initials(w.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="cs-name">${w.name}</div>
        <div class="cs-meta">${Math.round(w.orders)} ${chequeWord(w.orders)} · ${Math.round(w.guests)} ${guestWord(w.guests)}${outsTotal > 0 ? ` · <span style="color:var(--red)">−${money(outsTotal)} з каси</span>` : ''}</div>
      </div>
      <div>
        <div class="cs-sum">${money(w.sum)}</div>
        <div class="cs-sum-lbl">виторг</div>
      </div>
      <svg class="cs-chev ${open ? 'open' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
    </div>
    ${open ? `<div class="cs-tables">
      <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;padding:2px 2px 6px">Звіт по оплатах · ${state.venue || ''}</div>
      ${(w.payments || []).length
        ? w.payments.map(pmt => `
        <div class="cs-table">
          <div class="cs-table-info">
            <div class="cs-table-zone" style="color:var(--text1)">${pmt.label}</div>
            ${(pmt.orders > 0 || pmt.guests > 0)
              ? `<div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${Math.round(pmt.orders)} ${chequeWord(pmt.orders)} · ${Math.round(pmt.guests)} ${guestWord(pmt.guests)}</div>`
              : ''}
          </div>
          <div class="cs-table-sum">${money(pmt.sum)}</div>
        </div>`).join('')
        : '<div style="font-size:12px;color:var(--text2);font-family:var(--font-b);padding:6px 2px">Немає даних по оплатах</div>'}
      ${outs.length ? `
      <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;padding:12px 2px 6px">Вилучено з каси · <span style="color:var(--red)">−${money(outsTotal)}</span></div>
      ${outs.map(c => `
        <div class="cs-table">
          <div class="cs-table-info">
            <div class="cs-table-zone" style="color:#FBBF24">${esc(c.reason || 'без причини')}</div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${fmtTime(c.createdAt)}</div>
          </div>
          <div class="cs-table-sum" style="color:var(--red)">−${money(c.amount)}</div>
        </div>`).join('')}
      ` : ''}
    </div>` : ''}
  </div>`;
}

function body() {
  let inner;
  if (_loading) {
    inner = `<div class="cs-spin"></div>`;
  } else if (_error) {
    inner = `<div class="cs-err">${_error}</div>
      <div class="cs-empty"><div class="cs-empty-icon">📡</div><div class="cs-empty-txt">Перевірте підключення POS у налаштуваннях закладу.</div></div>`;
  } else if (!_data || !_data.waiters.length) {
    inner = `<div class="cs-empty">
      <div class="cs-empty-icon">🧑‍🍳</div>
      <div class="cs-empty-txt">Сьогодні ще немає продажів по офіціантах.<br>Дані з POS за поточний день.</div>
    </div>`;
  } else {
    const d = _data;
    inner = `
    <div class="cs-kpis">
      <div class="cs-kpi"><div class="cs-kpi-val">${d.waiters.length}</div><div class="cs-kpi-lbl">Офіціантів</div></div>
      <div class="cs-kpi"><div class="cs-kpi-val">${d.totalOrders}</div><div class="cs-kpi-lbl">Чеків</div></div>
      <div class="cs-kpi"><div class="cs-kpi-val" style="color:var(--green)">${money(d.totalSum)}</div><div class="cs-kpi-lbl">Виторг</div></div>
    </div>
    ${d.waiters.map(waiterCard).join('')}`;
  }
  return `
  <div class="cs-top">
    <div class="cs-back" onclick="window.__cs.back()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="cs-title">Поточна зміна</div>
      <div class="cs-sub">${state.venue || ''}${_data && _data.fetchedAt ? ` · оновлено о ${fmtTime(_data.fetchedAt)}` : ' · виторг офіціантів за сьогодні'}</div>
    </div>
    <div class="cs-refresh" onclick="window.__cs.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/></svg>
    </div>
  </div>
  <div class="cs-scroll">${inner}</div>`;
}

export default {
  render() {
    _loading = true; _error = ''; _data = null; _openId = null; _cash = [];
    return `${CSS}<div class="cs-wrap" id="cs-root">${body()}</div>`;
  },
  init() {
    window.__cs = {
      back:   () => navigate('dashboard'),
      reload: () => load(),
      toggle: (id) => { _openId = _openId === id ? null : id; re(); },
    };
    load();
  },
  cleanup() { window.__cs = null; },
};
