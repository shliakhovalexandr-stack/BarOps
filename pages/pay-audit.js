/* ============================================================
   BarOps — pages/pay-audit.js
   «Типи оплат» (звірка закриттів): рахунки, де товар складу «Бар ТОВ»
   закрито на ФОП-івський тип оплати (ГРН/Ощад/Glovo/Bolt/MONO…).
   Живий екран для менеджера залу — авто-оновлення кожні 45с.
   + Історія по днях: стрічка останніх днів із лічильниками (1 OLAP-запит).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let _data      = null;   // сьогодні (живе): { supported, date, violations:[...] }
let _loading   = false;
let _error     = '';
let _pollTimer = null;
let _syncedAt  = 0;
// історія
let _hist      = {};     // date → { count, sum }
let _selDate   = '';     // обраний день (YYYY-MM-DD); '' поки не завантажено сьогодні
let _dayCache  = {};     // date → { violations:[...] } для минулих днів
let _dayLoading= false;
let _dayError  = '';

const WD = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
function lastNDays(endStr, n) {          // масив YYYY-MM-DD, найновіший перший
  const [y, m, d] = endStr.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  return out;
}
function dowOf(str) { const [y, m, d] = str.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

async function load() {                  // сьогодні
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  const token   = localStorage.getItem('barops_token');
  if (!venueId || !token) { _error = 'Немає доступу'; _loading = false; rerender(); return; }
  if (!_data) { _loading = true; rerender(); }
  try {
    const r = await fetch(`${API}/api/pos/close-audit/${venueId}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.success) { _data = d; _error = ''; _syncedAt = Date.now(); if (!_selDate && d.date) _selDate = d.date; }
    else _error = d.error || 'Не вдалося завантажити';
  } catch (e) { _error = e.message; }
  _loading = false; rerender();
}

async function loadHistory() {           // лічильники по днях (1 запит)
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  const token   = localStorage.getItem('barops_token');
  if (!venueId || !token) return;
  try {
    const r = await fetch(`${API}/api/pos/close-audit-history/${venueId}?days=14`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.success && Array.isArray(d.days)) { const m = {}; for (const x of d.days) m[x.date] = { count: x.count, sum: x.sum }; _hist = m; rerender(); }
  } catch { /* тихо — стрічка просто без бейджів минулих днів */ }
}

async function selDay(date) {
  _selDate = date; _dayError = '';
  if (!_data || date === _data.date || _dayCache[date]) { rerender(); return; }   // сьогодні або вже в кеші
  _dayLoading = true; rerender();
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  const token   = localStorage.getItem('barops_token');
  try {
    const r = await fetch(`${API}/api/pos/close-audit/${venueId}?date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.success) _dayCache[date] = { violations: d.violations || [] };
    else _dayError = d.error || 'Не вдалося завантажити';
  } catch (e) { _dayError = e.message; }
  _dayLoading = false; rerender();
}

function fmtMoney(n) { return (Math.round((n || 0) * 100) / 100).toLocaleString('uk-UA'); }
function syncLabel() {
  if (!_syncedAt) return '';
  const s = Math.round((Date.now() - _syncedAt) / 1000);
  return s < 20 ? 'щойно оновлено' : s < 90 ? `${s} с тому` : `${Math.round(s / 60)} хв тому`;
}

function rowHTML(v) {
  const time = (v.closeTime || '').slice(11, 16);
  return `<div class="pa-row">
    <div class="pa-row-bar"></div>
    <div style="flex:1;min-width:0">
      <div class="pa-row-top">
        <span class="pa-order">№${v.orderNum}</span>
        ${v.table != null && v.table !== '' ? `<span class="pa-chip">стіл ${esc(v.table)}</span>` : ''}
        <span class="pa-pay">${esc(v.payType)}</span>
      </div>
      <div class="pa-row-sub">${esc(v.waiter || 'офіціант ?')}${time ? ` · ${time}` : ''}</div>
      ${v.comped ? `<div class="pa-comped">🎁 знижка 100% — товар роздано на чеку ФОП</div>` : ''}
    </div>
    <div class="pa-sum">${fmtMoney(v.sum)}<span class="pa-cur">грн</span></div>
  </div>`;
}

function stripHTML() {
  if (!_data || !_data.date) return '';
  const days = lastNDays(_data.date, 14);
  return `<div class="pa-strip">${days.map(d => {
    const isToday = d === _data.date;
    const cnt = isToday ? (_data.violations || []).length : (_hist[d] ? _hist[d].count : 0);
    const [, mo, da] = d.split('-');
    const sel = d === _selDate;
    return `<button class="pa-day${sel ? ' pa-day-sel' : ''}" onclick="window.__payAudit.selDay('${d}')">
      <span class="pa-day-wd">${isToday ? 'сьогодні' : WD[dowOf(d)]}</span>
      <span class="pa-day-dm">${da}.${mo}</span>
      <span class="pa-day-b ${cnt ? 'pa-day-bad' : 'pa-day-ok'}">${cnt || '✓'}</span>
    </button>`;
  }).join('')}</div>`;
}

function dayViewHTML() {
  const isToday = _selDate === (_data && _data.date);
  if (!isToday && _dayLoading && !_dayCache[_selDate]) return `<div class="pa-msg">Завантаження…</div>`;
  if (!isToday && _dayError) return `<div class="pa-msg" style="color:var(--red)">${esc(_dayError)}<div style="margin-top:12px"><button class="pa-btn" onclick="window.__payAudit.selDay('${_selDate}')">Спробувати ще</button></div></div>`;
  const vs = isToday ? ((_data && _data.violations) || []) : ((_dayCache[_selDate] && _dayCache[_selDate].violations) || []);
  const [y, mo, da] = (_selDate || '').split('-');
  const meta = isToday ? `за сьогодні${syncLabel() ? ` · ${syncLabel()}` : ''}` : `за ${da}.${mo}.${y}`;
  const totalSum = vs.reduce((s, v) => s + (v.sum || 0), 0);
  const head = `<div class="pa-head">
    <div>
      <div class="pa-head-n" style="color:${vs.length ? 'var(--red)' : 'var(--green)'}">${vs.length}</div>
      <div class="pa-head-lbl">${vs.length ? `закрито не так · ${fmtMoney(totalSum)} грн` : 'усе коректно'}</div>
    </div>
    <div class="pa-head-meta">${meta}</div>
  </div>`;
  return head + (vs.length
    ? `<div class="pa-list">${vs.map(rowHTML).join('')}</div>
       <div class="pa-note">Показано частину чека, що припадає на товар складу «Бар ТОВ». Правильні типи для ТОВ: Наличные / Банковские карти / Expirenza.${isToday ? ' Виправлені закриття зникають самі при наступному оновленні.' : ''}</div>`
    : `<div class="pa-ok"><div class="pa-ok-ic">✓</div><div>${isToday ? 'Сьогодні всі' : 'Усі'} товари «Бар ТОВ» цього дня закриті правильним типом оплати</div></div>`);
}

function inner() {
  const back = `<div class="pa-topbar">
    <div class="pa-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="pa-title">Типи оплат</div>
      <div class="pa-subtle">Товар «Бар ТОВ» на чужому типі оплати · ${esc(state.venue || '')}</div>
    </div>
    <button class="pa-refresh" onclick="window.__payAudit.refresh()" aria-label="Оновити">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>`;

  let body;
  if (_loading && !_data) {
    body = `<div class="pa-msg">Завантаження…</div>`;
  } else if (_error) {
    body = `<div class="pa-msg" style="color:var(--red)">${esc(_error)}<div style="margin-top:12px"><button class="pa-btn" onclick="window.__payAudit.refresh()">Оновити</button></div></div>`;
  } else if (_data && _data.supported === false) {
    body = `<div class="pa-msg">Для цього закладу не застосовується<div class="pa-subtle" style="margin-top:6px">Немає розділення складу «Бар ТОВ / Бар ФОП»</div></div>`;
  } else {
    body = stripHTML() + dayViewHTML();
  }
  return back + `<div class="pa-scroll">${body}<div style="height:24px"></div></div>`;
}

function rerender() { const el = document.getElementById('pa-inner'); if (el) el.innerHTML = inner(); }

const CSS = `<style id="pa-css">
.pa-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
#pa-inner{flex:1;display:flex;flex-direction:column;overflow:hidden}
.pa-topbar{display:flex;align-items:center;gap:12px;padding:10px 18px 12px;flex-shrink:0}
.pa-back,.pa-refresh{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0}
.pa-back:active,.pa-refresh:active{background:rgba(255,255,255,.08)}
.pa-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.pa-subtle{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.35}
.pa-scroll{overflow-y:auto;flex:1;padding:0 14px}
.pa-scroll::-webkit-scrollbar{width:0}
.pa-msg{padding:40px 20px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.5}
.pa-btn{height:36px;padding:0 16px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer}
.pa-strip{display:flex;gap:8px;overflow-x:auto;padding:4px 6px 14px;scrollbar-width:none}
.pa-strip::-webkit-scrollbar{height:0}
.pa-day{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:52px;padding:8px 8px 7px;border-radius:12px;background:var(--bg1);border:0.5px solid var(--border);cursor:pointer}
.pa-day:active{background:rgba(255,255,255,.06)}
.pa-day-sel{background:var(--bg3);border-color:var(--text3)}
.pa-day-wd{font-size:10px;color:var(--text2);font-family:var(--font-b);font-weight:600}
.pa-day-dm{font-size:12px;color:var(--text1);font-family:var(--font-h);font-weight:700}
.pa-day-b{margin-top:2px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:11px;font-family:var(--font-b);font-weight:700;line-height:1}
.pa-day-bad{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}
.pa-day-ok{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.pa-head{display:flex;align-items:flex-end;justify-content:space-between;padding:6px 6px 14px}
.pa-head-n{font-family:var(--font-h);font-size:34px;font-weight:700;line-height:1;letter-spacing:-.02em}
.pa-head-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.pa-head-meta{font-size:11px;color:var(--text3);font-family:var(--font-b)}
.pa-list{display:flex;flex-direction:column;gap:8px}
.pa-row{display:flex;align-items:center;gap:10px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px 12px 0;overflow:hidden}
.pa-row-bar{width:3px;align-self:stretch;background:var(--red);border-radius:3px;flex-shrink:0}
.pa-row-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pa-order{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.pa-chip{font-size:11px;color:var(--text2);font-family:var(--font-b);background:var(--bg3);border-radius:6px;padding:1px 7px}
.pa-pay{font-size:11px;color:var(--red);font-family:var(--font-b);font-weight:600;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:6px;padding:1px 7px}
.pa-row-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.pa-comped{font-size:11px;color:var(--amber);font-family:var(--font-b);margin-top:4px}
.pa-sum{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex-shrink:0;text-align:right;white-space:nowrap}
.pa-cur{font-size:11px;color:var(--text2);font-weight:500;margin-left:3px}
.pa-note{font-size:11px;color:var(--text3);font-family:var(--font-b);line-height:1.5;padding:14px 6px 4px}
.pa-ok{display:flex;align-items:center;gap:12px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:16px;padding:18px 16px;color:var(--text0);font-family:var(--font-b);font-size:13px;line-height:1.4}
.pa-ok-ic{width:36px;height:36px;border-radius:50%;background:var(--green-bg);border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;color:var(--green);font-size:18px;font-weight:700;flex-shrink:0}
</style>`;

function buildPage() { return `${CSS}<div class="pa-wrap"><div id="pa-inner">${inner()}</div></div>`; }

export function render() {
  if (!_data) _loading = true;
  return buildPage();
}
export function init() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  window.__payAudit = { refresh() { load(); loadHistory(); }, selDay };
  load();
  loadHistory();
  _pollTimer = setInterval(() => {
    if (!document.querySelector('.pa-wrap')) { clearInterval(_pollTimer); _pollTimer = null; return; }
    load();   // оновлюємо лише «сьогодні»; минулі дні статичні
  }, 45000);
}
export default { render, init };
