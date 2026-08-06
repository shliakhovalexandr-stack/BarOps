/* ============================================================
   BarOps — pages/morshynska.js
   Замовлення води ЄМоршинська. Бармен набирає заявку з каталогу →
   менеджер оформлює її прямо в ЄМоршинська через їхній API (не копіює).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(n) { return (Math.round((n || 0) * 100) / 100).toLocaleString('uk-UA'); }
const isMgr = () => ['admin', 'manager', 'director'].includes((state.role || '').toLowerCase());

let _tab      = 'catalog';   // 'catalog' | 'requests'
let _catalog  = null;        // { outlet, products:[{id,name,price,unit,image}] }
let _requests = null;        // [{id,status,items,sum,note,createdByName,createdAt,submittedBy,morsh}]
let _qty      = {};          // productId → упаковок
let _search   = '';
let _note     = '';
let _loading  = false;
let _busy     = '';          // id заявки, що оформлюється
let _error    = '';

function venueId() { return state.venueId || localStorage.getItem('barops_venueId'); }
function token()   { return localStorage.getItem('barops_token'); }

async function loadCatalog() {
  _loading = true; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/catalog`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) { _catalog = d; _error = ''; } else _error = d.error || 'Не вдалося завантажити каталог';
  } catch (e) { _error = e.message; }
  _loading = false; rerender();
}

async function loadRequests() {
  try {
    const r = await fetch(`${API}/api/morshynska/requests?venueId=${venueId()}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) _requests = d.data;
  } catch {}
  rerender();
}

async function submitRequest() {
  const items = (_catalog?.products || []).filter(p => (_qty[p.id] || 0) > 0)
    .map(p => ({ productId: p.id, name: p.name, price: p.price, unit: p.unit, qty: _qty[p.id] }));
  if (!items.length) return;
  _loading = true; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/requests`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: venueId(), items, note: _note }),
    });
    const d = await r.json();
    if (d.success) { _qty = {}; _note = ''; _tab = 'requests'; await loadRequests(); }
    else _error = d.error || 'Помилка';
  } catch (e) { _error = e.message; }
  _loading = false; rerender();
}

async function sendToMorsh(id) {
  _busy = id; _error = ''; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/requests/${id}/submit`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    const d = await r.json();
    if (!d.success) _error = d.error || 'Не вдалося оформити';
  } catch (e) { _error = e.message; }
  _busy = ''; await loadRequests();
}

async function cancelReq(id) {
  try { await fetch(`${API}/api/morshynska/requests/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}' }); } catch {}
  await loadRequests();
}

const STATUS = {
  pending:   { t: 'очікує',     cls: 'mo-st-amber' },
  submitted: { t: 'оформлено',  cls: 'mo-st-green' },
  failed:    { t: 'помилка',    cls: 'mo-st-red' },
  cancelled: { t: 'скасовано',  cls: 'mo-st-grey' },
};

/* ── КАТАЛОГ (набір заявки) ── */
function catalogHTML() {
  if (_loading && !_catalog) return `<div class="mo-msg">Завантаження каталогу…</div>`;
  if (!_catalog) return `<div class="mo-msg" style="color:var(--red)">${esc(_error || 'Немає даних')}<div style="margin-top:12px"><button class="mo-btn" onclick="window.__morsh.reload()">Оновити</button></div></div>`;
  const q = _search.trim().toLowerCase();
  const prods = (_catalog.products || []).filter(p => !q || (p.name || '').toLowerCase().includes(q));
  const chosen = (_catalog.products || []).filter(p => (_qty[p.id] || 0) > 0);
  const sum = chosen.reduce((s, p) => s + (p.price || 0) * _qty[p.id], 0);
  const rows = prods.map(p => {
    const n = _qty[p.id] || 0;
    return `<div class="mo-row${n ? ' mo-row-on' : ''}">
      <div style="flex:1;min-width:0">
        <div class="mo-name">${esc(p.name)}</div>
        <div class="mo-sub">${p.price != null ? money(p.price) + ' грн' : ''}${p.unit ? ` · ${esc(p.unit)}` : ''}</div>
      </div>
      <div class="mo-step">
        <button class="mo-pm" onclick="window.__morsh.dec('${p.id}')" ${n ? '' : 'disabled'}>−</button>
        <span class="mo-q">${n || 0}</span>
        <button class="mo-pm" onclick="window.__morsh.inc('${p.id}')">+</button>
      </div>
    </div>`;
  }).join('');
  const footer = chosen.length ? `<div class="mo-foot">
    <input class="mo-note" placeholder="Коментар (необовʼязково)" value="${esc(_note)}" oninput="window.__morsh.note(this.value)"/>
    <button class="mo-submit" onclick="window.__morsh.submit()">Подати заявку · ${chosen.length} поз · ${money(sum)} грн</button>
  </div>` : '';
  return `<div class="mo-searchwrap"><input class="mo-search" placeholder="Пошук товару…" value="${esc(_search)}" oninput="window.__morsh.search(this.value)"/></div>
    <div class="mo-list">${rows || '<div class="mo-msg">Нічого не знайдено</div>'}</div>${footer}`;
}

/* ── ЗАЯВКИ ── */
function requestsHTML() {
  if (!_requests) return `<div class="mo-msg">Завантаження…</div>`;
  if (!_requests.length) return `<div class="mo-ok"><div>Заявок поки немає</div><div class="mo-sub" style="margin-top:4px">Набери воду в каталозі й подай заявку</div></div>`;
  const mgr = isMgr();
  return `<div class="mo-list">` + _requests.map(o => {
    const st = STATUS[o.status] || STATUS.pending;
    const when = new Date(o.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const items = (o.items || []).map(i => `<div class="mo-li"><span>${esc(i.name)}</span><span class="mo-li-q">×${i.qty}</span></div>`).join('');
    const errMsg = o.status === 'failed' && o.morsh?.error ? `<div class="mo-err">${esc(o.morsh.error)}</div>` : '';
    const actions = [];
    if (mgr && (o.status === 'pending' || o.status === 'failed'))
      actions.push(`<button class="mo-send${_busy === o.id ? ' mo-send-busy' : ''}" onclick="window.__morsh.send('${o.id}')" ${_busy === o.id ? 'disabled' : ''}>${_busy === o.id ? 'Оформлюю…' : '💧 Оформити в ЄМоршинська'}</button>`);
    if (o.status === 'pending')
      actions.push(`<button class="mo-cancel" onclick="window.__morsh.cancel('${o.id}')">Прибрати</button>`);
    return `<div class="mo-card">
      <div class="mo-card-top">
        <div><span class="mo-who">${esc(o.createdByName || 'заявка')}</span><span class="mo-when"> · ${when}</span></div>
        <span class="mo-st ${st.cls}">${st.t}</span>
      </div>
      <div class="mo-items">${items}</div>
      ${o.note ? `<div class="mo-cmt">💬 ${esc(o.note)}</div>` : ''}
      ${errMsg}
      <div class="mo-card-bot">
        <span class="mo-total">${money(o.sum)} грн</span>
        <div class="mo-acts">${actions.join('')}</div>
      </div>
    </div>`;
  }).join('') + `</div>`;
}

function inner() {
  const outlet = _catalog?.outlet;
  const back = `<div class="mo-topbar">
    <div class="mo-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="mo-title">💧 Замовлення води</div>
      <div class="mo-subtle">${outlet ? esc(outlet.name) + (outlet.custName ? ` · ${esc(outlet.custName)}` : '') : esc(state.venue || 'ЄМоршинська')}</div>
    </div>
  </div>`;
  const tabs = `<div class="mo-tabs">
    <button class="mo-tab${_tab === 'catalog' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('catalog')">Каталог</button>
    <button class="mo-tab${_tab === 'requests' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('requests')">Заявки${_requests?.length ? ` · ${_requests.length}` : ''}</button>
  </div>`;
  const err = _error ? `<div class="mo-banner">${esc(_error)}</div>` : '';
  const body = _tab === 'catalog' ? catalogHTML() : requestsHTML();
  return back + tabs + err + `<div class="mo-scroll">${body}<div style="height:28px"></div></div>`;
}

function rerender() { const el = document.getElementById('mo-inner'); if (el) el.innerHTML = inner(); }

const CSS = `<style id="mo-css">
.mo-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
#mo-inner{flex:1;display:flex;flex-direction:column;overflow:hidden}
.mo-topbar{display:flex;align-items:center;gap:12px;padding:10px 18px 10px;flex-shrink:0}
.mo-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.mo-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.mo-subtle{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.3}
.mo-tabs{display:flex;gap:8px;padding:2px 14px 10px;flex-shrink:0}
.mo-tab{flex:1;height:34px;border-radius:10px;background:var(--bg1);border:0.5px solid var(--border);color:var(--text2);font-size:13px;font-family:var(--font-b);font-weight:600;cursor:pointer}
.mo-tab-on{background:var(--blue-bg);border-color:var(--blue-border);color:var(--blue)}
.mo-banner{margin:0 14px 8px;padding:9px 12px;border-radius:10px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:12px;font-family:var(--font-b);line-height:1.4}
.mo-scroll{overflow-y:auto;flex:1;padding:0 14px}
.mo-scroll::-webkit-scrollbar{width:0}
.mo-msg{padding:36px 20px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.5}
.mo-btn{height:34px;padding:0 16px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer}
.mo-searchwrap{padding:2px 0 10px}
.mo-search,.mo-note{width:100%;height:38px;border-radius:10px;background:var(--bg1);border:0.5px solid var(--border);color:var(--text0);font-size:13px;font-family:var(--font-b);padding:0 12px;outline:none}
.mo-list{display:flex;flex-direction:column;gap:7px}
.mo-row{display:flex;align-items:center;gap:10px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:10px 12px}
.mo-row-on{border-color:var(--blue-border);background:var(--blue-bg)}
.mo-name{font-size:13px;color:var(--text0);font-family:var(--font-b);line-height:1.3}
.mo-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.mo-step{display:flex;align-items:center;gap:8px;flex-shrink:0}
.mo-pm{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border);color:var(--text0);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
.mo-pm:disabled{opacity:.4}
.mo-q{min-width:20px;text-align:center;font-family:var(--font-h);font-weight:700;font-size:15px;color:var(--text0)}
.mo-foot{position:sticky;bottom:0;background:var(--bg);padding:10px 0 12px;display:flex;flex-direction:column;gap:8px;border-top:0.5px solid var(--border);margin-top:6px}
.mo-submit{height:46px;border-radius:12px;background:var(--blue);border:0;color:#08131f;font-size:14px;font-family:var(--font-h);font-weight:700;cursor:pointer}
.mo-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 13px}
.mo-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.mo-who{font-size:13px;font-family:var(--font-h);font-weight:700;color:var(--text0)}
.mo-when{font-size:11px;color:var(--text3);font-family:var(--font-b)}
.mo-st{font-size:11px;font-family:var(--font-b);font-weight:600;border-radius:6px;padding:2px 8px}
.mo-st-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.mo-st-green{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.mo-st-red{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}
.mo-st-grey{background:var(--bg3);border:0.5px solid var(--border);color:var(--text2)}
.mo-items{margin-top:8px;display:flex;flex-direction:column;gap:3px}
.mo-li{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--text1);font-family:var(--font-b)}
.mo-li-q{color:var(--text2);flex-shrink:0}
.mo-cmt{margin-top:7px;font-size:12px;color:var(--text2);font-family:var(--font-b)}
.mo-err{margin-top:7px;font-size:11px;color:var(--red);font-family:var(--font-b);line-height:1.4;background:var(--red-bg);border-radius:8px;padding:6px 9px}
.mo-card-bot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
.mo-total{font-family:var(--font-h);font-weight:700;font-size:15px;color:var(--text0)}
.mo-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.mo-send{height:36px;padding:0 14px;border-radius:10px;background:var(--blue);border:0;color:#08131f;font-size:12.5px;font-family:var(--font-b);font-weight:700;cursor:pointer}
.mo-send-busy{opacity:.6}
.mo-cancel{height:36px;padding:0 12px;border-radius:10px;background:var(--bg3);border:0.5px solid var(--border);color:var(--text2);font-size:12.5px;font-family:var(--font-b);cursor:pointer}
.mo-ok{padding:34px 20px;text-align:center;color:var(--text1);font-family:var(--font-b);font-size:13px}
</style>`;

function buildPage() { return `${CSS}<div class="mo-wrap"><div id="mo-inner">${inner()}</div></div>`; }

export function render() { _loading = !_catalog; return buildPage(); }

export function init() {
  _tab = isMgr() ? 'requests' : 'catalog';
  window.__morsh = {
    tab(t) { _tab = t; rerender(); if (t === 'requests') loadRequests(); if (t === 'catalog' && !_catalog) loadCatalog(); },
    inc(id) { _qty[id] = (_qty[id] || 0) + 1; rerender(); },
    dec(id) { _qty[id] = Math.max(0, (_qty[id] || 0) - 1); if (!_qty[id]) delete _qty[id]; rerender(); },
    search(v) { _search = v; rerender(); },
    note(v) { _note = v; },
    submit() { submitRequest(); },
    send(id) { sendToMorsh(id); },
    cancel(id) { cancelReq(id); },
    reload() { loadCatalog(); },
  };
  loadCatalog();
  loadRequests();
}
export default { render, init };
