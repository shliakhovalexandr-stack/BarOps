/* ============================================================
   BarOps — pages/stock.js
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const STOCK = [
  { id:1,  emoji:'🥃', name:"Johnnie Walker Black 0.7л",  cat:'Віскі',      qty:2.8,  unit:'л', norm:2.1, status:'ok'  },
  { id:2,  emoji:'🌿', name:"Hendrick's Gin 0.7л",        cat:'Джин',       qty:0.4,  unit:'л', norm:0.7, status:'low' },
  { id:3,  emoji:'🍊', name:'Aperol 1л',                  cat:'Лікери',     qty:1.8,  unit:'л', norm:1.0, status:'ok'  },
  { id:4,  emoji:'🔴', name:'Campari 0.7л',               cat:'Лікери',     qty:0.7,  unit:'л', norm:0.7, status:'ok'  },
  { id:5,  emoji:'🍋', name:'Limoncello 0.7л',            cat:'Лікери',     qty:0.3,  unit:'л', norm:0.5, status:'low' },
  { id:6,  emoji:'🍸', name:'Martini Bianco 1л',          cat:'Вермут',     qty:2.4,  unit:'л', norm:1.0, status:'ok'  },
  { id:7,  emoji:'🫧', name:'Prosecco DOC 0.75л',         cat:'Вино',       qty:3.0,  unit:'л', norm:1.5, status:'ok'  },
  { id:8,  emoji:'🥂', name:'Moet Chandon 0.75л',         cat:'Шампанське', qty:0.75, unit:'л', norm:0.75,status:'ok'  },
  { id:9,  emoji:'🫙', name:'Angostura Bitters 0.2л',     cat:'Біттери',    qty:0.15, unit:'л', norm:0.1, status:'ok'  },
  { id:10, emoji:'🍵', name:'Сироп Монін Карамель 0.7л',  cat:'Сиропи',     qty:0.4,  unit:'л', norm:0.3, status:'ok'  },
];

let CATS = ['Всі', ...new Set(STOCK.map(s => s.cat))];
let _filter = 'Всі';
let _search = '';
let _isSyrve = false;
let _balanceError = '';
let _categoryMap = {}; // productId → customCategory
let _normsMap = {};    // productId → { reorderPoint, desiredStock }
let _venueId = null;
let _token = null;
let _availableStores = []; // [{storeId, storeName}]
let _storeFilter = null;   // UUID or null = all stores
const API = 'https://barops-backend-production.up.railway.app';

const CSS = `<style id="stk-css">
.stk-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.stk-scroll{overflow-y:auto;flex:1}.stk-scroll::-webkit-scrollbar{width:0}

.stk-topbar{display:flex;align-items:center;gap:12px;padding:8px 16px 10px;flex-shrink:0}
.stk-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.stk-back:active{background:var(--bg3)}
.stk-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1}
.stk-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

.stk-search{margin:0 14px 8px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;padding:0 12px;height:40px}
.stk-search-inp{flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.stk-search-inp::placeholder{color:var(--text3)}

.stk-chips{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}.stk-chips::-webkit-scrollbar{height:0}
.stk-chip{height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;white-space:nowrap;font-family:var(--font-b);display:flex;align-items:center;flex-shrink:0;transition:all .15s}
.stk-chip.act{background:var(--green);border-color:var(--green);color:#fff}

.stk-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.stk-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px;text-align:center}
.stk-stat-val{font-family:var(--font-h);font-size:20px;font-weight:700}
.stk-stat-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.05em}

.stk-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.stk-row{display:flex;align-items:center;gap:10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;padding:11px 13px;transition:background .12s;user-select:none}
.stk-row:active{background:var(--bg3)}
.stk-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.stk-cat{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.stk-qty{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right;flex-shrink:0;min-width:44px}
.stk-unit{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right;margin-top:1px}
.stk-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

.stk-note{margin:0 14px 10px;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:12px;padding:10px 13px;display:flex;gap:8px;font-size:11px;color:var(--blue);font-family:var(--font-b);line-height:1.5}

/* Swipe row */
.stk-row-wrap{position:relative;overflow:hidden;border-radius:13px;margin-bottom:0}
.stk-row-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:stretch;opacity:0;pointer-events:none;transition:opacity .15s}
.stk-row-act-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;gap:4px;font-size:10px;font-family:var(--font-b);cursor:pointer;border:none}
.stk-row-act-btn.edit{background:var(--green);color:#fff}
.stk-row-act-btn.cat{background:var(--blue, #5B8DEF);color:#fff}
.stk-row-wrap.swiped .stk-row-actions{opacity:1;pointer-events:auto}
.stk-row-wrap.swiped .stk-row{transform:translateX(-144px);transition:transform .2s}
.stk-row{transition:transform .2s}

/* Filter button */
.stk-filter-btn{height:32px;padding:0 10px;border-radius:16px;border:0.5px solid var(--border2);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;transition:all .15s}
.stk-filter-btn.active{background:var(--green-bg,#1a3320);border-color:var(--green);color:var(--green)}
.stk-store-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border2);cursor:pointer;margin-bottom:6px;transition:background .12s}
.stk-store-row:active{background:var(--bg3)}
.stk-store-row.sel{background:var(--green-bg,#1a3320);border-color:var(--green)}

/* Модалка редагування категорії */
.stk-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
.stk-modal{background:var(--bg1);border-radius:20px 20px 0 0;padding:20px 16px 40px;width:100%;max-width:480px}
.stk-modal-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);margin-bottom:4px}
.stk-modal-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:16px}
.stk-modal-inp{width:100%;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);outline:none;box-sizing:border-box;margin-bottom:12px}
.stk-modal-cats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.stk-modal-cat{height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center}
.stk-modal-cat:active{background:var(--bg3)}
.stk-modal-btn{width:100%;height:44px;border-radius:12px;background:var(--green);border:none;font-size:15px;font-family:var(--font-h);font-weight:700;color:#fff;cursor:pointer}
.stk-modal-cancel{width:100%;height:40px;border-radius:12px;background:transparent;border:none;font-size:14px;font-family:var(--font-b);color:var(--text2);cursor:pointer;margin-top:6px}
</style>`;

let _editItem = null;

function showEditModal(item) {
  _editItem = item;
  const existingCats = [...new Set(STOCK.map(s => s.cat))].filter(c => c && c !== item.cat);
  const norm = _normsMap[item.posId] || { reorderPoint: 0, desiredStock: 0 };

  const overlay = document.createElement('div');
  overlay.className = 'stk-modal-overlay';
  overlay.id = 'stk-modal';
  overlay.innerHTML = `
    <div class="stk-modal">
      <div class="stk-modal-title">${item.name}</div>

      <div style="display:flex;gap:6px;margin-bottom:16px">
        <button id="stk-tab-cat" onclick="window.__stk.switchTab('cat')"
          style="flex:1;height:34px;border-radius:10px;border:0.5px solid var(--border2);
                 background:var(--green);color:#fff;font-size:13px;font-family:var(--font-b);cursor:pointer">
          Категорія
        </button>
        <button id="stk-tab-norm" onclick="window.__stk.switchTab('norm')"
          style="flex:1;height:34px;border-radius:10px;border:0.5px solid var(--border2);
                 background:var(--bg3);color:var(--text2);font-size:13px;font-family:var(--font-b);cursor:pointer">
          Норми
        </button>
      </div>

      <div id="stk-panel-cat">
        <input class="stk-modal-inp" id="stk-cat-inp" value="${item.cat}" placeholder="Назва категорії"/>
        ${existingCats.length ? `
        <div class="stk-modal-cats">
          ${existingCats.map(c => `<div class="stk-modal-cat" onclick="document.getElementById('stk-cat-inp').value='${c}'">${c}</div>`).join('')}
        </div>` : ''}
        <button class="stk-modal-btn" onclick="window.__stk.saveCategory()">Зберегти</button>
      </div>

      <div id="stk-panel-norm" style="display:none">
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Мінімальний залишок</div>
        <input class="stk-modal-inp" id="stk-reorder-inp" type="number" min="0" step="0.1"
          value="${norm.reorderPoint}" placeholder="0"/>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Бажаний залишок</div>
        <input class="stk-modal-inp" id="stk-desired-inp" type="number" min="0" step="0.1"
          value="${norm.desiredStock}" placeholder="0"/>
        <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);margin-bottom:14px">
          Одиниця: ${item.unit}
        </div>
        <button class="stk-modal-btn" onclick="window.__stk.saveNorm()">Зберегти</button>
      </div>

      <button class="stk-modal-cancel" onclick="window.__stk.closeModal()">Скасувати</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('stk-modal');
  if (m) m.remove();
  _editItem = null;
}

function switchTab(tab) {
  const catPanel  = document.getElementById('stk-panel-cat');
  const normPanel = document.getElementById('stk-panel-norm');
  const catBtn    = document.getElementById('stk-tab-cat');
  const normBtn   = document.getElementById('stk-tab-norm');
  if (tab === 'cat') {
    catPanel.style.display  = '';
    normPanel.style.display = 'none';
    catBtn.style.background  = 'var(--green)';  catBtn.style.color  = '#fff';
    normBtn.style.background = 'var(--bg3)';    normBtn.style.color = 'var(--text2)';
  } else {
    catPanel.style.display  = 'none';
    normPanel.style.display = '';
    normBtn.style.background = 'var(--green)'; normBtn.style.color = '#fff';
    catBtn.style.background  = 'var(--bg3)';   catBtn.style.color  = 'var(--text2)';
  }
}

async function saveNorm() {
  const reorderPoint = parseFloat(document.getElementById('stk-reorder-inp')?.value) || 0;
  const desiredStock = parseFloat(document.getElementById('stk-desired-inp')?.value) || 0;
  if (!_editItem) return;

  try {
    await fetch(`${API}/api/pos/norms`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: _venueId, productId: _editItem.posId, reorderPoint, desiredStock }),
    });
    _normsMap[_editItem.posId] = { reorderPoint, desiredStock };
    const item = STOCK.find(s => s.posId === _editItem.posId);
    if (item) {
      item.norm   = desiredStock || reorderPoint;
      item.status = item.qty < reorderPoint ? 'low' : 'ok';
    }
    closeModal();
    fullRender();
  } catch (err) {
    console.error('[Stock] saveNorm error:', err);
  }
}

async function saveCategory() {
  const inp = document.getElementById('stk-cat-inp');
  if (!inp || !_editItem) return;
  const customCategory = inp.value.trim();
  if (!customCategory) return;

  try {
    await fetch(`${API}/api/pos/category-mappings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ venueId: _venueId, productId: _editItem.posId, customCategory }),
    });

    // Оновлюємо локально
    _categoryMap[_editItem.posId] = customCategory;
    const item = STOCK.find(s => s.posId === _editItem.posId);
    if (item) item.cat = customCategory;
    CATS = ['Всі', ...new Set(STOCK.map(s => s.cat))];
    closeModal();
    fullRender();
  } catch (err) {
    console.error('[Stock] saveCategory error:', err);
  }
}

function buildHTML() {
  const storeStock = _storeFilter
    ? STOCK.filter(s => s.storeId === _storeFilter)
    : STOCK;

  const storeCats = ['Всі', ...new Set(storeStock.map(s => s.cat))];
  const activeFilter = storeCats.includes(_filter) ? _filter : 'Всі';

  const list = storeStock.filter(s => {
    const catOk = activeFilter === 'Всі' || s.cat === activeFilter;
    const srchOk = !_search || s.name.toLowerCase().includes(_search.toLowerCase());
    return catOk && srchOk;
  });

  const total = storeStock.length;
  const low   = storeStock.filter(s => s.status === 'low').length;
  const ok    = storeStock.filter(s => s.status === 'ok').length;
  const activeStoreName = _storeFilter
    ? (_availableStores.find(s => s.storeId === _storeFilter)?.storeName || 'Склад')
    : null;

  return `
${CSS}
<div class="stk-wrap">
  <div class="stk-topbar">
    <div class="stk-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="stk-title">Залишки${activeStoreName ? ` · ${activeStoreName}` : ''}</div>
      <div class="stk-sub">${state.venue} · ${_isSyrve ? 'Syrve · реальні дані' : 'демо-дані'}</div>
    </div>
    <div style="background:${low>0?'var(--red-bg)':'var(--green-bg)'};border:0.5px solid ${low>0?'var(--red-border)':'var(--green-border)'};border-radius:20px;padding:3px 10px;font-size:11px;color:${low>0?'var(--red)':'var(--green)'};font-family:var(--font-b)">${low > 0 ? `⚠ ${low} критично` : '✓ Все ок'}</div>
    ${_isSyrve && _availableStores.length > 1 ? `
    <div class="stk-filter-btn ${_storeFilter ? 'active' : ''}" onclick="window.__stk.openFilters()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      ${_storeFilter ? 'Склад ✓' : 'Фільтри'}
    </div>` : ''}
  </div>

  <div class="stk-scroll">
    <div class="stk-search">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/><path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <input class="stk-search-inp" placeholder="Знайти товар…" value="${_search}" oninput="window.__stk.search(this.value)"/>
    </div>

    <div class="stk-summary">
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--text0)">${total}</div>
        <div class="stk-stat-lbl">Позицій</div>
      </div>
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--green)">${ok}</div>
        <div class="stk-stat-lbl">В нормі</div>
      </div>
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--red)">${low}</div>
        <div class="stk-stat-lbl">Критично</div>
      </div>
    </div>

    <div class="stk-chips">
      ${storeCats.map(c => `<div class="stk-chip ${activeFilter===c?'act':''}" onclick="window.__stk.setFilter('${c}')">${c}</div>`).join('')}
    </div>

    ${!_isSyrve && _balanceError ? `
    <div class="stk-note" style="background:var(--red-bg,#2d1b1b);border-color:var(--red-border,#5c2b2b)">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="var(--red)" stroke-width="1.2"/><path d="M7 4v3M7 9v.5" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <span style="color:var(--red)">Помилка залишків: ${_balanceError}</span>
    </div>` : !_isSyrve ? `
    <div class="stk-note">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="var(--blue)" stroke-width="1.2"/><path d="M7 6v4M7 4.5v.4" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${_venueId ? 'Завантаження залишків з Syrve…' : 'Демо-дані. Після підключення iiko тут будуть реальні залишки з вашої POS-системи.'}
    </div>` : ''}

    ${_isSyrve ? `<div style="padding:0 14px 8px;font-size:10px;color:var(--text3);font-family:var(--font-b)">← Свайп вліво для редагування</div>` : ''}

    <div class="stk-list">
      ${list.map(s => {
        const pct   = s.norm > 0 ? Math.min((s.qty / (s.norm * 2)) * 100, 100) : 50;
        const color = s.status === 'low' ? 'var(--red)' : pct > 60 ? 'var(--green)' : 'var(--amber)';
        const posId = s.posId ? `data-posid="${s.posId}"` : '';
        return `
        <div class="stk-row-wrap" id="wrap-${s.posId || s.id}"
          ontouchstart="window.__stk.swipeStart(event,'${s.posId || ''}')"
          ontouchmove="window.__stk.swipeMove(event)"
          ontouchend="window.__stk.swipeEnd(event,'${s.posId || ''}')"
          oncontextmenu="return false">
          <div class="stk-row" ${posId}>
            <div class="stk-status-dot" style="background:${color}"></div>
            <div style="flex:1;min-width:0">
              <div class="stk-name">${s.name}</div>
              <div class="stk-cat">${s.cat} · Норма: ${s.norm} ${s.unit}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div class="stk-qty" style="color:${color}">${Number.isInteger(s.qty) ? s.qty : s.qty.toFixed(2)}</div>
              <div class="stk-unit">${s.unit}</div>
            </div>
          </div>
          <div class="stk-row-actions">
            <button class="stk-row-act-btn cat" onclick="window.__stk.openTab('${s.posId || ''}','cat')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h8M3 13h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
              Категорія
            </button>
            <button class="stk-row-act-btn edit" onclick="window.__stk.openTab('${s.posId || ''}','norm')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
              Норми
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="height:20px"></div>
  </div>
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function setFilter(f) { _filter = f; fullRender(); }
function search(q)    { _search = q; fullRender(); }

function openFilters() {
  const existing = document.getElementById('stk-store-sheet');
  if (existing) { existing.remove(); return; }
  const sheet = document.createElement('div');
  sheet.id = 'stk-store-sheet';
  sheet.className = 'stk-modal-overlay';
  const allOption = { storeId: null, storeName: 'Всі склади' };
  const options = [allOption, ..._availableStores];
  sheet.innerHTML = `
    <div class="stk-modal" style="max-height:70vh;overflow-y:auto">
      <div class="stk-modal-title">Вибір складу</div>
      <div class="stk-modal-sub">Оберіть склад для перегляду залишків</div>
      ${options.map(s => `
        <div class="stk-store-row ${_storeFilter === s.storeId ? 'sel' : ''}"
          onclick="window.__stk.setStoreFilter(${s.storeId ? `'${s.storeId}'` : 'null'})">
          <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">${s.storeName}</div>
          ${_storeFilter === s.storeId ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        </div>`).join('')}
      <button class="stk-modal-cancel" onclick="window.__stk.closeFilters()">Закрити</button>
    </div>`;
  document.body.appendChild(sheet);
}

function closeFilters() {
  const s = document.getElementById('stk-store-sheet');
  if (s) s.remove();
}

function setStoreFilter(storeId) {
  _storeFilter = storeId === 'null' ? null : storeId;
  if (_storeFilter && _venueId) {
    localStorage.setItem(`barops_stock_store_${_venueId}`, _storeFilter);
  } else if (_venueId) {
    localStorage.removeItem(`barops_stock_store_${_venueId}`);
  }
  _filter = 'Всі';
  closeFilters();
  fullRender();
}

let _swipeStartX = 0;
let _swipeStartY = 0;
let _swipeActive = null;
let _swipeLocked = false;

function swipeStart(e, posId) {
  if (!_isSyrve) return;
  _swipeStartX = e.touches[0].clientX;
  _swipeStartY = e.touches[0].clientY;
  _swipeActive = posId;
  _swipeLocked = false;
}

function swipeMove(e) {
  if (!_swipeActive) return;
  const dx = e.touches[0].clientX - _swipeStartX;
  const dy = e.touches[0].clientY - _swipeStartY;
  if (!_swipeLocked) {
    if (Math.abs(dy) > Math.abs(dx)) { _swipeActive = null; return; }
    _swipeLocked = true;
  }
  if (dx < -30) e.preventDefault();
}

function swipeEnd(e, posId) {
  if (!_swipeActive) return;
  const dx = e.changedTouches[0].clientX - _swipeStartX;
  const wrap = document.getElementById('wrap-' + posId);
  if (dx < -60 && wrap) {
    // Close all other open swipes
    document.querySelectorAll('.stk-row-wrap.swiped').forEach(el => {
      if (el !== wrap) el.classList.remove('swiped');
    });
    wrap.classList.toggle('swiped');
  } else if (dx > 20 && wrap) {
    wrap.classList.remove('swiped');
  }
  _swipeActive = null;
}

function openTab(posId, tab) {
  const wrap = document.getElementById('wrap-' + posId);
  if (wrap) wrap.classList.remove('swiped');
  const item = STOCK.find(s => s.posId === posId);
  if (item) { showEditModal(item); setTimeout(() => switchTab(tab), 50); }
}

export default {
  render() {
    _filter = 'Всі'; _search = '';
    _isSyrve = false;
    _availableStores = [];
    _storeFilter = null;
    STOCK.length = 0;
    CATS = ['Всі'];
    return buildHTML();
  },
  async init() {
    window.__stk = { setFilter, search, saveCategory, saveNorm, switchTab, closeModal, swipeStart, swipeMove, swipeEnd, openTab, openFilters, closeFilters, setStoreFilter };
    _venueId      = state.venueId || localStorage.getItem('barops_venueId');
    _token        = localStorage.getItem('barops_token');
    _balanceError = '';

    if (!_venueId || !_token) {
      console.warn('[Stock] venueId або token відсутні');
      return;
    }

    // Завантажуємо mappings, баланс і норми паралельно
    const [mappingsData, balanceData, normsData] = await Promise.all([
      fetch(`${API}/api/pos/category-mappings/${_venueId}`, {
        headers: { 'Authorization': `Bearer ${_token}` },
      }).then(r => r.json()).catch(() => ({ mappings: [] })),

      fetch(`${API}/api/pos/balance/${_venueId}`, {
        headers: { 'Authorization': `Bearer ${_token}` },
      }).then(r => r.json()).catch(e => ({ success: false, error: e.message })),

      fetch(`${API}/api/pos/norms/${_venueId}`, {
        headers: { 'Authorization': `Bearer ${_token}` },
      }).then(r => r.json()).catch(() => ({ norms: [] })),
    ]);

    // Категорії
    _categoryMap = {};
    for (const m of (mappingsData.mappings || []))
      _categoryMap[m.productId] = m.customCategory;

    // Норми
    _normsMap = {};
    for (const n of (normsData.norms || []))
      _normsMap[n.productId] = { reorderPoint: n.reorderPoint, desiredStock: n.desiredStock };

    // Баланс
    if (balanceData.success && balanceData.stores?.length) {
      STOCK.length = 0;
      _availableStores = balanceData.stores.map(s => ({ storeId: s.storeId, storeName: s.storeName }));
      // Restore saved store filter
      const savedFilter = localStorage.getItem(`barops_stock_store_${_venueId}`);
      if (savedFilter && _availableStores.some(s => s.storeId === savedFilter)) {
        _storeFilter = savedFilter;
      }
      let id = 1;
      for (const store of balanceData.stores) {
        for (const item of store.items) {
          const defaultCat = item.category || store.storeName;
          const customCat  = _categoryMap[item.id] || defaultCat;
          STOCK.push({
            id:           id++,
            posId:        item.id,
            storeId:      store.storeId,
            emoji:        '',
            name:         item.name,
            cat:          customCat,
            qty:          Math.round((Number(item.amount) || 0) * 100) / 100,
            unit:         item.unit || 'л',
            norm:         (_normsMap[item.id]?.desiredStock || _normsMap[item.id]?.reorderPoint || 0),
            reorderPoint: (_normsMap[item.id]?.reorderPoint || 0),
            status:       (Number(item.amount) || 0) < (_normsMap[item.id]?.reorderPoint || 0) ? 'low' : 'ok',
          });
        }
      }
      _isSyrve = true;
      CATS = ['Всі', ...new Set(STOCK.map(s => s.cat))];
    } else {
      _balanceError = balanceData.error || balanceData.warning || 'Порожня відповідь';
      console.warn('[Stock] balance failed:', _balanceError);
    }

    const v = document.getElementById('app-view');
    if (v) v.innerHTML = buildHTML();
  },
};
