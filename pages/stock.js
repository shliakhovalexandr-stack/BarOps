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
let _groupFilter     = new Set(); // top goods group ("Бар", "Кухня")
let _warehouseFilter = new Set(); // physical warehouse UUID
let _catFilter       = new Set(); // goods sub-category
const API = 'https://barops-backend-production.up.railway.app';

const CSS = `<style id="stk-css">
.stk-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.stk-scroll{overflow-y:auto;flex:1}.stk-scroll::-webkit-scrollbar{width:0}

.stk-topbar{display:flex;align-items:center;justify-content:space-between;padding:6px 20px 0;flex-shrink:0}
.stk-title{font-family:var(--font-h);font-size:26px;font-weight:600;color:var(--text0);letter-spacing:-.025em;line-height:1}
.stk-add-btn{display:flex;align-items:center;gap:5px;padding:7px 12px;background:var(--green);color:#000;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0}

.stk-search{margin:14px 20px 0;display:flex;align-items:center;gap:10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;height:44px}
.stk-search-inp{flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.stk-search-inp::placeholder{color:var(--text2)}

.stk-chips{display:flex;gap:7px;padding:12px 20px 0;overflow-x:auto}.stk-chips::-webkit-scrollbar{height:0}
.stk-chip{height:32px;padding:0 12px;border-radius:20px;border:0.5px solid var(--border);background:transparent;font-size:12px;font-weight:500;color:var(--text1);cursor:pointer;white-space:nowrap;font-family:var(--font-b);display:flex;align-items:center;gap:5px;flex-shrink:0;transition:all .15s}
.stk-chip.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}

.stk-col-hdr{display:flex;justify-content:space-between;padding:10px 20px 8px;border-top:0.5px solid var(--border);margin-top:12px;font-family:var(--font-mono);font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.10em}

.stk-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;margin:12px 20px 0}
.stk-stat{background:var(--bg1);padding:14px 12px}
.stk-stat-val{font-family:var(--font-h);font-size:24px;font-weight:500;letter-spacing:-.02em;line-height:1}
.stk-stat-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:6px;text-transform:uppercase;letter-spacing:.06em}

.stk-list{padding:0 20px;flex:1}
.stk-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:0.5px solid var(--border);cursor:pointer;user-select:none}
.stk-row:last-child{border-bottom:none}
.stk-name{font-size:14px;color:var(--text0);font-weight:500;margin-bottom:6px}
.stk-bar{height:3px;background:var(--bg3);border-radius:2px;overflow:hidden}
.stk-bar-fill{height:100%;border-radius:2px;transition:width .3s}
.stk-qty{font-family:var(--font-h);font-size:16px;font-weight:500;text-align:right;letter-spacing:-.01em;line-height:1}
.stk-unit{font-size:10px;color:var(--text3);font-family:var(--font-b);text-align:right;margin-top:1px;font-family:var(--font-mono)}

.stk-note{margin:10px 20px;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:12px;padding:10px 13px;display:flex;gap:8px;font-size:11px;color:var(--blue);font-family:var(--font-b);line-height:1.5}

/* Swipe row */
.stk-row-wrap{position:relative;overflow:hidden}
.stk-row-actions{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:stretch;opacity:0;pointer-events:none;transition:opacity .15s}
.stk-row-act-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;gap:4px;font-size:10px;font-family:var(--font-b);cursor:pointer;border:none}
.stk-row-act-btn.edit{background:var(--green);color:#000}
.stk-row-act-btn.cat{background:var(--bg3);color:var(--text1)}
.stk-row-wrap.swiped .stk-row-actions{opacity:1;pointer-events:auto}
.stk-row-wrap.swiped .stk-row{transform:translateX(-144px);transition:transform .2s}
.stk-row{transition:transform .2s}

/* Filter button */
.stk-filter-btn{height:32px;padding:0 10px;border-radius:20px;border:0.5px solid var(--border);background:transparent;font-size:12px;font-weight:500;color:var(--text1);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;transition:all .15s}
.stk-filter-btn.active{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.stk-store-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);cursor:pointer;margin-bottom:6px;transition:background .12s}
.stk-store-row:active{background:rgba(255,255,255,.08)}
.stk-store-row.sel{background:var(--green-bg);border-color:var(--green-border)}

/* Модалка редагування категорії */
.stk-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
.stk-modal{background:var(--bg1);border:0.5px solid var(--border);border-radius:20px 20px 0 0;padding:20px 16px 40px;width:100%;max-width:480px}
.stk-modal-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);margin-bottom:4px}
.stk-modal-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:16px}
.stk-modal-inp{width:100%;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);outline:none;box-sizing:border-box;margin-bottom:12px}
.stk-modal-cats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.stk-modal-cat{height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center}
.stk-modal-cat:active{background:rgba(255,255,255,.08)}
.stk-modal-btn{width:100%;height:44px;border-radius:12px;background:var(--green);border:none;font-size:15px;font-family:var(--font-h);font-weight:600;color:#000;cursor:pointer}
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
          style="flex:1;height:34px;border-radius:10px;border:0.5px solid var(--border);
                 background:var(--green);color:#000;font-size:13px;font-family:var(--font-b);cursor:pointer">
          Категорія
        </button>
        <button id="stk-tab-norm" onclick="window.__stk.switchTab('norm')"
          style="flex:1;height:34px;border-radius:10px;border:0.5px solid var(--border);
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
  let list = STOCK;
  if (_groupFilter.size > 0)     list = list.filter(s => _groupFilter.has(s.group));
  if (_warehouseFilter.size > 0) list = list.filter(s => _warehouseFilter.has(s.storeId));
  if (_catFilter.size > 0)       list = list.filter(s => _catFilter.has(s.cat));
  if (_search) list = list.filter(s => s.name.toLowerCase().includes(_search.toLowerCase()));

  const total = list.length;
  const low   = list.filter(s => s.status === 'low').length;
  const ok    = list.filter(s => s.status === 'ok').length;

  const allGroups     = [...new Set(STOCK.map(s => s.group).filter(Boolean))].sort();
  const allWarehouses = _availableStores;
  const allCats       = [...new Set(STOCK.map(s => s.cat).filter(Boolean))].sort();

  const groupLabel = _groupFilter.size === 0 ? 'Група'
    : _groupFilter.size === 1 ? [..._groupFilter][0]
    : `${_groupFilter.size} гр.`;
  const warehouseLabel = _warehouseFilter.size === 0 ? 'Склад'
    : _warehouseFilter.size === 1 ? (allWarehouses.find(s => _warehouseFilter.has(s.storeId))?.storeName || 'Склад')
    : `${_warehouseFilter.size} скл.`;
  const catLabel = _catFilter.size === 0 ? 'Категорія'
    : _catFilter.size === 1 ? [..._catFilter][0].slice(0, 10)
    : `${_catFilter.size} кат.`;

  const anyFilter = _groupFilter.size > 0 || _warehouseFilter.size > 0 || _catFilter.size > 0;

  return `
${CSS}
<div class="stk-wrap">
  <div class="stk-topbar">
    <h1 class="stk-title">Залишки</h1>
    <button class="stk-add-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Перерахунок
    </button>
  </div>

  <div class="stk-search">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    <input class="stk-search-inp" placeholder="Пошук по бару" value="${_search}" oninput="window.__stk.search(this.value)"/>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:2px 6px;border:0.5px solid var(--border2);border-radius:4px">⌘K</span>
  </div>

  <div class="stk-chips">
    <button class="stk-chip ${!_search && _groupFilter.size===0 && _warehouseFilter.size===0 && _catFilter.size===0 ? 'act' : ''}" onclick="window.__stk.clearAllFilters()">
      Всі <span style="font-family:var(--font-mono);font-size:10px;opacity:.7">${total}</span>
    </button>
    ${low > 0 ? `<button class="stk-chip" style="color:var(--red)" onclick="window.__stk.clearAllFilters()">Критично <span style="font-family:var(--font-mono);font-size:10px;opacity:.7">${low}</span></button>` : ''}
    ${_isSyrve && allGroups.length > 0 ? `<button class="stk-filter-btn ${_groupFilter.size > 0 ? 'active' : ''}" onclick="window.__stk.openGroupFilter()">${groupLabel}</button>` : ''}
    ${_isSyrve && allWarehouses.length > 1 ? `<button class="stk-filter-btn ${_warehouseFilter.size > 0 ? 'active' : ''}" onclick="window.__stk.openWarehouseFilter()">${warehouseLabel}</button>` : ''}
    ${_isSyrve && allCats.length > 0 ? `<button class="stk-filter-btn ${_catFilter.size > 0 ? 'active' : ''}" onclick="window.__stk.openCatFilter()">${catLabel}</button>` : ''}
    ${anyFilter ? `<button class="stk-filter-btn" onclick="window.__stk.clearAllFilters()" style="color:var(--red);border-color:var(--red)">✕ Скинути</button>` : ''}
    <div style="min-width:12px;flex-shrink:0"></div>
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

  ${!_isSyrve && _balanceError ? `
  <div class="stk-note" style="background:var(--red-bg);border-color:var(--red-border)">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="var(--red)" stroke-width="1.2"/><path d="M7 4v3M7 9v.5" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/></svg>
    <span style="color:var(--red)">Помилка залишків: ${_balanceError}</span>
  </div>` : !_isSyrve ? `
  <div class="stk-note">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="var(--blue)" stroke-width="1.2"/><path d="M7 6v4M7 4.5v.4" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/></svg>
    ${_venueId ? 'Завантаження залишків з Syrve…' : 'Демо-дані. Після підключення Syrve тут будуть реальні залишки.'}
  </div>` : ''}

  <div class="stk-col-hdr">
    <span>Назва</span><span>Залишок / Норма</span>
  </div>

  <div class="stk-scroll">
    <div class="stk-list">
      ${list.map(s => {
        const pct   = s.norm > 0 ? Math.min((s.qty / s.norm) * 100, 100) : 50;
        const color = s.status === 'low' ? 'var(--red)' : pct >= 100 ? 'var(--text0)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
        const posId = s.posId ? `data-posid="${s.posId}"` : '';
        return `
        <div class="stk-row-wrap" id="wrap-${s.posId || s.id}"
          ontouchstart="window.__stk.swipeStart(event,'${s.posId || ''}')"
          ontouchmove="window.__stk.swipeMove(event)"
          ontouchend="window.__stk.swipeEnd(event,'${s.posId || ''}')"
          oncontextmenu="return false">
          <div class="stk-row" ${posId}>
            <div style="flex:1;min-width:0">
              <div class="stk-name">${s.name}</div>
              <div class="stk-bar"><div class="stk-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            </div>
            <div style="text-align:right;min-width:70px;flex-shrink:0">
              <div class="stk-qty" style="color:${color}">${Number.isInteger(s.qty) ? s.qty : s.qty.toFixed(2)}<span style="font-size:11px;color:var(--text3)">/${s.norm}</span></div>
              <div class="stk-unit">${s.unit}</div>
            </div>
          </div>
          <div class="stk-row-actions">
            <button class="stk-row-act-btn cat" onclick="window.__stk.openTab('${s.posId || ''}','cat')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              Категорія
            </button>
            <button class="stk-row-act-btn edit" onclick="window.__stk.openTab('${s.posId || ''}','norm')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
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
  const savedScroll = document.querySelector('.stk-scroll')?.scrollTop || 0;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
  const sc = document.querySelector('.stk-scroll');
  if (sc && savedScroll) sc.scrollTop = savedScroll;
}

function setFilter(f) { _filter = f; fullRender(); }
function search(q)    { _search = q; fullRender(); }

function _openFilterSheet(id, title, options, activeSet, toggleFn, clearFn) {
  const existing = document.getElementById(id);
  if (existing) { existing.remove(); return; }
  const sheet = document.createElement('div');
  sheet.id = id;
  sheet.className = 'stk-modal-overlay';
  const isAll = activeSet.size === 0;
  sheet.innerHTML = `
    <div class="stk-modal" style="max-height:75vh;overflow-y:auto">
      <div class="stk-modal-title">${title}</div>
      <div class="stk-store-row ${isAll ? 'sel' : ''}" onclick="${clearFn}">
        <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">Всі</div>
        ${isAll ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      ${options.map(o => `
        <div class="stk-store-row ${activeSet.has(o.value) ? 'sel' : ''}" onclick="${toggleFn}('${o.value.replace(/'/g,"\\'")}')">
          <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">${o.label}</div>
          ${activeSet.has(o.value) ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </div>`).join('')}
      <button class="stk-modal-cancel" onclick="document.getElementById('${id}')?.remove()">Закрити</button>
    </div>`;
  document.body.appendChild(sheet);
}

function openGroupFilter() {
  const groups = [...new Set(STOCK.map(s => s.group).filter(Boolean))].sort();
  _openFilterSheet('stk-group-sheet', 'Група товарів',
    groups.map(g => ({ value: g, label: g })),
    _groupFilter, 'window.__stk.toggleGroup', 'window.__stk.clearGroups()');
}
function toggleGroup(g) {
  if (_groupFilter.has(g)) _groupFilter.delete(g); else _groupFilter.add(g);
  document.getElementById('stk-group-sheet')?.remove();
  openGroupFilter();
  fullRender();
}
function clearGroups() {
  _groupFilter.clear();
  document.getElementById('stk-group-sheet')?.remove();
  openGroupFilter();
  fullRender();
}

function openWarehouseFilter() {
  _openFilterSheet('stk-warehouse-sheet', 'Склад',
    _availableStores.map(s => ({ value: s.storeId, label: s.storeName })),
    _warehouseFilter, 'window.__stk.toggleWarehouse', 'window.__stk.clearWarehouses()');
}
function toggleWarehouse(id) {
  if (_warehouseFilter.has(id)) _warehouseFilter.delete(id); else _warehouseFilter.add(id);
  document.getElementById('stk-warehouse-sheet')?.remove();
  openWarehouseFilter();
  fullRender();
}
function clearWarehouses() {
  _warehouseFilter.clear();
  document.getElementById('stk-warehouse-sheet')?.remove();
  openWarehouseFilter();
  fullRender();
}

function openCatFilter() {
  const cats = [...new Set(STOCK.map(s => s.cat).filter(Boolean))].sort();
  _openFilterSheet('stk-cat-sheet', 'Категорія товарів',
    cats.map(c => ({ value: c, label: c })),
    _catFilter, 'window.__stk.toggleCat', 'window.__stk.clearCats()');
}
function toggleCat(c) {
  if (_catFilter.has(c)) _catFilter.delete(c); else _catFilter.add(c);
  document.getElementById('stk-cat-sheet')?.remove();
  openCatFilter();
  fullRender();
}
function clearCats() {
  _catFilter.clear();
  document.getElementById('stk-cat-sheet')?.remove();
  openCatFilter();
  fullRender();
}

function clearAllFilters() {
  _groupFilter.clear(); _warehouseFilter.clear(); _catFilter.clear();
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
    _groupFilter = new Set(); _warehouseFilter = new Set(); _catFilter = new Set();
    STOCK.length = 0;
    CATS = ['Всі'];
    return buildHTML();
  },
  async init() {
    window.__stk = { setFilter, search, saveCategory, saveNorm, switchTab, closeModal, swipeStart, swipeMove, swipeEnd, openTab, openGroupFilter, toggleGroup, clearGroups, openWarehouseFilter, toggleWarehouse, clearWarehouses, openCatFilter, toggleCat, clearCats, clearAllFilters };
    _venueId         = state.venueId || localStorage.getItem('barops_venueId');
    _token           = localStorage.getItem('barops_token');
    _balanceError    = '';
    _groupFilter     = new Set();
    _warehouseFilter = new Set();
    _catFilter       = new Set();

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
      let id = 1;
      for (const store of balanceData.stores) {
        for (const item of store.items) {
          const defaultCat = item.category || store.storeName;
          const customCat  = _categoryMap[item.id] || defaultCat;
          STOCK.push({
            id:           id++,
            posId:        item.id,
            storeId:      store.storeId,
            group:        item.group || '',
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
