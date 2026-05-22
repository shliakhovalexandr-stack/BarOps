/* ============================================================
   BarOps — pages/debts.js
   Борги та продажі між закладами — реальна БД
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let _tab      = 'debt';
let _filter   = 'active';
let _debts    = [];
let _venues   = [];
let _loading  = false;
let _saving   = false;
let _formOpen = false;
let _form     = { fromVenueId:'', toVenueId:'', item:'', qty:'1', unit:'пляш.', price:'', note:'' };
let _products        = [];
let _productsLoaded  = false;
let _pickerOpen      = false;
let _pickerSearch    = '';

const isAccountant = () => (state.role || '').toLowerCase() === 'accountant';

/* ════════════════════════════════════════
   CSS
════════════════════════════════════════ */
const CSS = `<style id="dbt-css">
.dbt-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.dbt-scroll{overflow-y:auto;flex:1;padding-bottom:32px}.dbt-scroll::-webkit-scrollbar{width:0}
.dbt-header{padding:10px 20px 0;display:flex;align-items:center;gap:12px;flex-shrink:0}
.dbt-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dbt-back:active{background:var(--bg3)}
.dbt-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.dbt-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.dbt-tabs{display:flex;gap:8px;padding:14px 20px 0;flex-shrink:0}
.dbt-tab{flex:1;height:36px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg2);font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
.dbt-tab.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green);font-weight:600}
.dbt-chips{display:flex;gap:7px;padding:10px 20px 0;flex-shrink:0}
.dbt-chip{height:28px;padding:0 12px;border-radius:20px;border:0.5px solid var(--border);background:transparent;font-size:11px;font-weight:500;color:var(--text2);cursor:pointer;white-space:nowrap;font-family:var(--font-b)}
.dbt-chip.act{background:var(--bg2);border-color:var(--border2);color:var(--text0)}
.dbt-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 20px 0}
.dbt-stat{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px}
.dbt-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);line-height:1}
.dbt-stat-val.red{color:var(--red)}.dbt-stat-val.green{color:var(--green)}
.dbt-stat-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px;letter-spacing:.04em;text-transform:uppercase}
.dbt-add-btn{margin:14px 20px 0;height:44px;border-radius:14px;border:none;background:var(--green);color:#000;font-size:14px;font-weight:600;font-family:var(--font-h);cursor:pointer;width:calc(100% - 40px);display:flex;align-items:center;justify-content:center;gap:8px}
.dbt-add-btn:active{filter:brightness(.9)}
.dbt-list{padding:14px 20px 0}
.dbt-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px}
.dbt-card.returned{opacity:.55}
.dbt-card-row1{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
.dbt-card-item{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.dbt-card-badge{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;flex-shrink:0}
.dbt-card-badge.debt{background:rgba(251,113,133,.12);color:var(--red);border:0.5px solid rgba(251,113,133,.25)}
.dbt-card-badge.sale{background:var(--green-bg);color:var(--green);border:0.5px solid var(--green-border)}
.dbt-card-badge.done{background:var(--bg3);color:var(--text2);border:0.5px solid var(--border)}
.dbt-card-venues{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:6px}
.dbt-card-venues b{color:var(--text1)}
.dbt-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dbt-card-qty{font-size:12px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.dbt-card-date{font-size:11px;color:var(--text3);font-family:var(--font-b)}
.dbt-card-note{margin-top:5px;font-size:11px;color:var(--text2);font-family:var(--font-b);font-style:italic}
.dbt-card-returned{margin-top:6px;padding-top:6px;border-top:0.5px solid var(--border);font-size:11px;color:var(--green);font-family:var(--font-b)}
.dbt-return-btn{margin-top:8px;width:100%;height:34px;border-radius:10px;border:0.5px solid var(--green-border);background:var(--green-bg);color:var(--green);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.dbt-return-btn:active{filter:brightness(.9)}
.dbt-sheet-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200;backdrop-filter:blur(2px)}
.dbt-sheet{position:fixed;bottom:0;left:0;right:0;background:var(--bg1);border-radius:20px 20px 0 0;z-index:201;padding:0 20px 40px;max-height:90vh;overflow-y:auto}
.dbt-sheet::-webkit-scrollbar{width:0}
.dbt-sheet-handle{width:36px;height:4px;border-radius:2px;background:var(--border2);margin:12px auto 16px}
.dbt-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:16px;letter-spacing:-.02em}
.dbt-field{margin-bottom:12px}
.dbt-label{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}
.dbt-input,.dbt-select,.dbt-textarea{width:100%;height:42px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 12px;box-sizing:border-box;outline:none}
.dbt-input:focus,.dbt-select:focus,.dbt-textarea:focus{border-color:var(--green)}
.dbt-select{appearance:none;-webkit-appearance:none}
.dbt-textarea{height:64px;padding:10px 12px;resize:none;line-height:1.4}
.dbt-row2{display:grid;grid-template-columns:2fr 1fr;gap:8px}
.dbt-save-btn{width:100%;height:46px;border-radius:14px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer;margin-top:4px}
.dbt-save-btn:active{filter:brightness(.9)}.dbt-save-btn:disabled{opacity:.5;cursor:default}
.dbt-cancel-btn{width:100%;height:38px;border-radius:12px;border:0.5px solid var(--border);background:transparent;color:var(--text2);font-size:13px;font-family:var(--font-b);cursor:pointer;margin-top:6px}
.dbt-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center}
.dbt-empty-icon{font-size:32px;opacity:.3}
.dbt-empty-title{font-size:15px;font-weight:600;color:var(--text0);font-family:var(--font-h)}
.dbt-empty-sub{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.dbt-loading{display:flex;align-items:center;justify-content:center;padding:48px 20px;gap:10px;font-size:12px;color:var(--text2);font-family:var(--font-b)}
.dbt-spin{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.08);border-top-color:var(--green);animation:dbtSpin .7s linear infinite}
@keyframes dbtSpin{to{transform:rotate(360deg)}}
.dbt-item-btn{width:100%;min-height:42px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 12px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;text-align:left}
.dbt-item-btn:active{border-color:var(--green)}
.dbt-item-btn.has-val{border-color:var(--border2)}
.dbt-item-btn span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dbt-item-btn .ph{color:var(--text3)}
.dbt-picker-ov{position:fixed;inset:0;z-index:210;background:var(--bg1);display:flex;flex-direction:column}
.dbt-picker-head{display:flex;align-items:center;gap:10px;padding:16px 20px 8px;flex-shrink:0;border-bottom:0.5px solid var(--border)}
.dbt-picker-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dbt-picker-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0)}
.dbt-picker-srch{margin:10px 16px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:0 12px;height:40px;flex-shrink:0}
.dbt-picker-srch-inp{flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.dbt-picker-srch-inp::placeholder{color:var(--text3)}
.dbt-picker-list{flex:1;overflow-y:auto;padding-bottom:32px}
.dbt-picker-list::-webkit-scrollbar{width:0}
.dbt-picker-row{padding:13px 20px;border-bottom:0.5px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:10px}
.dbt-picker-row:active{background:var(--bg2)}
.dbt-picker-name{font-size:14px;color:var(--text0);font-family:var(--font-b);flex:1}
.dbt-picker-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);white-space:nowrap}
.dbt-picker-manual{padding:12px 20px;border-bottom:0.5px solid var(--border)}
.dbt-picker-manual-inp{width:100%;height:42px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 12px;box-sizing:border-box;outline:none}
.dbt-picker-manual-inp:focus{border-color:var(--green)}
</style>`;

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function fmtDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function apiToken() { return localStorage.getItem('barops_token') || ''; }

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken()}`, ...(opts.headers||{}) },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

/* ════════════════════════════════════════
   DATA LOADING
════════════════════════════════════════ */
async function loadVenues() {
  try {
    const d = await apiFetch('/api/debts/venues');
    _venues = d.venues || [];
  } catch { _venues = []; }
}

async function loadProducts() {
  if (_productsLoaded) return;
  const venueId = localStorage.getItem('barops_venueId') || '';
  if (!venueId) return;
  try {
    const d = await apiFetch(`/api/pos/balance/${venueId}`);
    const seen = new Set();
    const flat = [];
    for (const store of (d.stores || [])) {
      for (const item of (store.items || [])) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          flat.push({ id: item.id, name: item.name, qty: Math.round((Number(item.amount)||0)*100)/100, unit: item.unit || '' });
        }
      }
    }
    _products = flat.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    _productsLoaded = true;
  } catch { _products = []; }
}

function pickerHTML() {
  const q       = _pickerSearch.toLowerCase();
  const list    = _products.filter(p => !q || p.name.toLowerCase().includes(q));
  const manVal  = _form.item;
  return `
  <div class="dbt-picker-ov">
    <div class="dbt-picker-head">
      <div class="dbt-picker-back" onclick="window.__dbt.closePicker()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="dbt-picker-title">Вибір товару</div>
    </div>
    <div class="dbt-picker-srch">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/><path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <input id="dbt-picker-inp" class="dbt-picker-srch-inp" placeholder="Знайти товар..."
        value="${_pickerSearch}" oninput="window.__dbt.pickerSearch(this.value)" autocomplete="off"/>
    </div>
    <div class="dbt-picker-list" id="dbt-picker-list">
      <div class="dbt-picker-manual">
        <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px">Або введіть вручну</div>
        <input class="dbt-picker-manual-inp" placeholder="Назва товару, напр. Aperol 1л"
          value="${manVal}" oninput="window.__dbt.f('item',this.value)"
          onkeydown="if(event.key==='Enter')window.__dbt.closePicker()"/>
      </div>
      ${_products.length === 0
        ? `<div style="padding:24px 20px;font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:center">Залишки Syrve не завантажені.<br>Введіть назву вручну вище.</div>`
        : list.length === 0
          ? `<div style="padding:24px 20px;font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:center">Нічого не знайдено</div>`
          : list.map(p => {
              const safeName = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              const safeUnit = (p.unit || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `<div class="dbt-picker-row" onclick="window.__dbt.selectItem('${safeName}','${safeUnit}')">
                <div class="dbt-picker-name">${p.name}</div>
                ${p.qty != null ? `<div class="dbt-picker-stock">${Number.isInteger(p.qty)?p.qty:p.qty.toFixed(2)} ${p.unit||''}</div>` : ''}
              </div>`;
            }).join('')
      }
    </div>
  </div>`;
}

function renderPickerOverlay() {
  const ov = document.getElementById('dbt-item-picker');
  if (ov) ov.innerHTML = _pickerOpen ? pickerHTML() : '';
  if (_pickerOpen) setTimeout(() => document.getElementById('dbt-picker-inp')?.focus(), 80);
}

async function loadDebts() {
  _loading = true; redraw();
  try {
    const p = new URLSearchParams({ type: _tab, filter: _filter });
    const d = await apiFetch(`/api/debts?${p}`);
    _debts = d.data || [];
  } catch { _debts = []; }
  _loading = false; redraw();
}

async function markReturned(id) {
  try {
    await apiFetch(`/api/debts/${id}/return`, { method: 'POST' });
    _filter = 'all';
    loadDebts();
  } catch (e) { alert(e.message); }
}

async function saveForm() {
  if (_saving) return;
  const { fromVenueId, toVenueId, item, qty, unit, price, note } = _form;
  if (!fromVenueId || !toVenueId) return alert('Оберіть заклади');
  if (!item.trim()) return alert('Вкажіть товар');
  if (fromVenueId === toVenueId) return alert('Заклади повинні бути різними');
  _saving = true; redrawSheet();
  try {
    await apiFetch('/api/debts', {
      method: 'POST',
      body: JSON.stringify({ type:_tab, fromVenueId, toVenueId, item:item.trim(), qty:parseFloat(qty)||1, unit, price:parseFloat(price)||0, note }),
    });
    _formOpen = false; _pickerOpen = false; _pickerSearch = '';
    _form = { fromVenueId:'', toVenueId:'', item:'', qty:'1', unit:'пляш.', price:'', note:'' };
    const ov = document.getElementById('dbt-overlay');
    if (ov) ov.innerHTML = '';
    const pov = document.getElementById('dbt-item-picker');
    if (pov) pov.innerHTML = '';
    loadDebts();
  } catch (e) { alert(e.message); }
  _saving = false; redrawSheet();
}

/* ════════════════════════════════════════
   CARD HTML
════════════════════════════════════════ */
function debtCard(d) {
  const done = d.returned;
  const badge = done ? 'done' : d.type;
  const badgeTxt = done ? 'Повернуто' : d.type === 'sale' ? 'Продаж' : 'Борг';
  return `
  <div class="dbt-card${done?' returned':''}">
    <div class="dbt-card-row1">
      <div class="dbt-card-item">${d.item}</div>
      <div class="dbt-card-badge ${badge}">${badgeTxt}</div>
    </div>
    <div class="dbt-card-venues"><b>${d.fromVenueName||d.fromVenueId}</b><span style="color:var(--text3)"> → </span><b>${d.toVenueName||d.toVenueId}</b></div>
    <div class="dbt-card-meta">
      <div class="dbt-card-qty">${d.qty} ${d.unit}${d.price>0?` · ${d.price} грн`:''}</div>
      <div class="dbt-card-date">${fmtDT(d.createdAt)}</div>
    </div>
    ${d.userName?`<div class="dbt-card-date" style="margin-top:2px">Вніс: ${d.userName}</div>`:''}
    ${d.note?`<div class="dbt-card-note">${d.note}</div>`:''}
    ${done?`<div class="dbt-card-returned">✓ Повернуто ${fmtDT(d.returnedAt)}${d.returnedByName?' · '+d.returnedByName:''}</div>`:''}
    ${!done?`<button class="dbt-return-btn" onclick="window.__dbt.markReturned('${d.id}')">✓ Позначити як повернуто</button>`:''}
  </div>`;
}

/* ════════════════════════════════════════
   REDRAW (часткове оновлення після init)
════════════════════════════════════════ */
function redraw() {
  const el = document.getElementById('dbt-body');
  if (!el) return;
  const shown = _debts;
  const active = shown.filter(d => !d.returned).length;
  const done   = shown.filter(d => d.returned).length;

  el.innerHTML = `
    <div class="dbt-summary">
      <div class="dbt-stat"><div class="dbt-stat-val red">${active}</div><div class="dbt-stat-lbl">${_tab==='debt'?'Активних боргів':'Активних продажів'}</div></div>
      <div class="dbt-stat"><div class="dbt-stat-val green">${done}</div><div class="dbt-stat-lbl">Повернуто / закрито</div></div>
    </div>
    <button class="dbt-add-btn" onclick="window.__dbt.openForm()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>
      ${_tab==='debt'?'Додати борг':'Зафіксувати продаж'}
    </button>
    <div class="dbt-list">
      ${_loading?`<div class="dbt-loading"><div class="dbt-spin"></div> Завантаження...</div>`:
        shown.length===0?`<div class="dbt-empty"><div class="dbt-empty-icon">${_tab==='debt'?'📋':'💰'}</div><div class="dbt-empty-title">${_filter==='active'?'Активних немає':'Записів немає'}</div><div class="dbt-empty-sub">Натисніть кнопку вище, щоб внести перший запис</div></div>`:
        shown.map(debtCard).join('')}
    </div>
  `;

  // Tabs active state
  document.querySelectorAll('.dbt-tab').forEach(b => {
    b.classList.toggle('act', b.dataset.tab === _tab);
  });
  document.querySelectorAll('.dbt-chip').forEach(b => {
    b.classList.toggle('act', b.dataset.filter === _filter);
  });
}

function redrawSheet() {
  const el = document.getElementById('dbt-sheet');
  if (!el) return;
  const isSale = _tab === 'sale';
  const vOpts  = _venues.map(v => `<option value="${v.id}"${_form.fromVenueId===v.id?' selected':''}>${v.name}</option>`).join('');
  const vOpts2 = _venues.map(v => `<option value="${v.id}"${_form.toVenueId===v.id?' selected':''}>${v.name}</option>`).join('');
  el.innerHTML = `
    <div class="dbt-sheet-handle"></div>
    <div class="dbt-sheet-title">${isSale?'Новий продаж':'Новий борг'}</div>
    <div class="dbt-field"><div class="dbt-label">З закладу</div>
      <select class="dbt-select" onchange="window.__dbt.f('fromVenueId',this.value)"><option value="">— Оберіть заклад —</option>${vOpts}</select></div>
    <div class="dbt-field"><div class="dbt-label">В заклад</div>
      <select class="dbt-select" onchange="window.__dbt.f('toVenueId',this.value)"><option value="">— Оберіть заклад —</option>${vOpts2}</select></div>
    <div class="dbt-field"><div class="dbt-label">Товар</div>
      <div class="dbt-item-btn ${_form.item?'has-val':''}" onclick="window.__dbt.openPicker()">
        <span class="${_form.item?'':'ph'}">${_form.item||'Обрати зі списку...'}</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
    <div class="dbt-row2">
      <div class="dbt-field"><div class="dbt-label">Кількість</div>
        <input class="dbt-input" type="number" min="0.01" step="0.01" value="${_form.qty}" oninput="window.__dbt.f('qty',this.value)"></div>
      <div class="dbt-field"><div class="dbt-label">Одиниця</div>
        <input class="dbt-input" type="text" placeholder="шт / л / кг..." value="${_form.unit}" oninput="window.__dbt.f('unit',this.value)"></div>
    </div>
    ${isSale?`<div class="dbt-field"><div class="dbt-label">Ціна (грн)</div>
      <input class="dbt-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_form.price}" oninput="window.__dbt.f('price',this.value)"></div>`:''}
    <div class="dbt-field"><div class="dbt-label">Примітка (необов'язково)</div>
      <textarea class="dbt-textarea" placeholder="Наприклад: термінова потреба на event" oninput="window.__dbt.f('note',this.value)">${_form.note}</textarea></div>
    <button class="dbt-save-btn" ${_saving?'disabled':''} onclick="window.__dbt.save()">${_saving?'Збереження...':'Зберегти'}</button>
    <button class="dbt-cancel-btn" onclick="window.__dbt.close()">Скасувати</button>
  `;
}

/* ════════════════════════════════════════
   PAGE MODULE
════════════════════════════════════════ */
export default {
  render() {
    return `
    ${CSS}
    <div class="dbt-wrap">
      <div class="dbt-header">
        <button class="dbt-back" onclick="window.__barops.navigate('dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div>
          <div class="dbt-title">Борги</div>
          <div class="dbt-sub">${isAccountant()?'Повна історія':'Між закладами'}</div>
        </div>
      </div>
      <div class="dbt-tabs">
        <button class="dbt-tab act" data-tab="debt" onclick="window.__dbt.setTab('debt')">Борги</button>
        <button class="dbt-tab" data-tab="sale" onclick="window.__dbt.setTab('sale')">Продажі</button>
      </div>
      <div class="dbt-chips">
        <button class="dbt-chip act" data-filter="active" onclick="window.__dbt.setFilter('active')">Активні</button>
        <button class="dbt-chip" data-filter="all" onclick="window.__dbt.setFilter('all')">Всі</button>
      </div>
      <div class="dbt-scroll"><div id="dbt-body"></div></div>
    </div>
    <div id="dbt-overlay"></div>
    <div id="dbt-item-picker"></div>`;
  },

  init() {
    _tab = 'debt'; _filter = 'active'; _debts = []; _formOpen = false;
    _form = { fromVenueId:'', toVenueId:'', item:'', qty:'1', unit:'пляш.', price:'', note:'' };

    window.__dbt = {
      setTab(t)   { _tab = t; _filter = 'active'; redraw(); loadDebts(); },
      setFilter(f){ _filter = f; loadDebts(); },
      f(k, v)     { _form[k] = v; },
      openForm()  {
        _formOpen = true;
        const ov = document.getElementById('dbt-overlay');
        if (ov) ov.innerHTML = `
          <div class="dbt-sheet-overlay" onclick="window.__dbt.close()"></div>
          <div class="dbt-sheet" id="dbt-sheet"></div>`;
        redrawSheet();
        loadProducts();
      },
      close() {
        _formOpen = false; _pickerOpen = false; _pickerSearch = '';
        const ov = document.getElementById('dbt-overlay');
        if (ov) ov.innerHTML = '';
        const pov = document.getElementById('dbt-item-picker');
        if (pov) pov.innerHTML = '';
      },
      openPicker() {
        _pickerOpen = true; _pickerSearch = '';
        renderPickerOverlay();
      },
      closePicker() {
        _pickerOpen = false;
        renderPickerOverlay();
        redrawSheet();
      },
      selectItem(name, unit) {
        _form.item = name;
        _form.unit = unit || 'шт';
        _pickerOpen = false;
        renderPickerOverlay();
        redrawSheet();
      },
      pickerSearch(q) {
        _pickerSearch = q;
        const list = document.getElementById('dbt-picker-list');
        if (!list) return;
        const filtered = _products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));
        const rows = filtered.map(p => {
          const safeName = p.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          const safeUnit = (p.unit || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `<div class="dbt-picker-row" onclick="window.__dbt.selectItem('${safeName}','${safeUnit}')">
            <div class="dbt-picker-name">${p.name}</div>
            ${p.qty != null ? `<div class="dbt-picker-stock">${Number.isInteger(p.qty)?p.qty:p.qty.toFixed(2)} ${p.unit||''}</div>` : ''}
          </div>`;
        }).join('');
        const manualEl = list.querySelector('.dbt-picker-manual');
        const manualHTML = manualEl ? manualEl.outerHTML : '';
        list.innerHTML = manualHTML + (rows || `<div style="padding:24px 20px;font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:center">Нічого не знайдено</div>`);
      },
      save:         saveForm,
      markReturned: markReturned,
    };

    loadVenues().then(() => redrawSheet());
    loadDebts();
  },
};
