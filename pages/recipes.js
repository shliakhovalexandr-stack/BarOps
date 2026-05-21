/* ============================================================
   BarOps — pages/recipes.js
   Фудкост: страви з Syrve + ТТК + розрахунок собівартості
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venueId, _token, _role;
let _dishes    = [];
let _prices    = {};
let _loading   = true;
let _syncing   = false;
let _syncMsg   = '';
let _error     = '';
let _search    = '';
let _catSet    = new Set();
let _selected  = null;
let _priceEdit = null;
let _priceDraft  = '';
let _priceSaving = false;
let _fcMin        = 0;
let _fcMax        = 25;
let _showFCSettings = false;
let _hidden      = new Set();   // сховані dish IDs
let _showHidden  = false;       // показувати сховані у списку
let _swipedId    = null;        // card зараз відкрита свайпом
let _storeSet    = new Set();   // обрані групи товарів (порожнє = всі)
let _goodsCatSet = new Set();  // обрані категорії товарів (порожнє = всі)

// ── storage ──────────────────────────────────────────────────
function catsKey()    { return `barops_fc_cats_${_venueId}`; }
function threshKey()  { return `barops_fc_thresh_${_venueId}`; }
function hiddenKey()  { return `barops_hidden_${_venueId}`; }

function storeKey()    { return `barops_fc_stores_${_venueId}`; }
function goodsCatKey() { return `barops_fc_goodscats_${_venueId}`; }
function saveCats()      { localStorage.setItem(catsKey(), JSON.stringify([..._catSet])); }
function loadCats()      { try { _catSet = new Set(JSON.parse(localStorage.getItem(catsKey()) || '[]')); } catch { _catSet = new Set(); } }
function saveHidden()    { localStorage.setItem(hiddenKey(), JSON.stringify([..._hidden])); }
function loadHidden()    { try { _hidden = new Set(JSON.parse(localStorage.getItem(hiddenKey()) || '[]')); } catch { _hidden = new Set(); } }
function saveStores()    { localStorage.setItem(storeKey(), JSON.stringify([..._storeSet])); }
function loadStores()    { try { _storeSet = new Set(JSON.parse(localStorage.getItem(storeKey()) || '[]')); } catch { _storeSet = new Set(); } }
function saveGoodsCats() { localStorage.setItem(goodsCatKey(), JSON.stringify([..._goodsCatSet])); }
function loadGoodsCats() { try { _goodsCatSet = new Set(JSON.parse(localStorage.getItem(goodsCatKey()) || '[]')); } catch { _goodsCatSet = new Set(); } }

function loadThresholds() {
  try {
    const t = JSON.parse(localStorage.getItem(threshKey()) || '{}');
    _fcMin = t.min ?? 0;
    _fcMax = t.max ?? 25;
  } catch { _fcMin = 0; _fcMax = 25; }
}
function saveThresholds() {
  localStorage.setItem(threshKey(), JSON.stringify({ min: _fcMin, max: _fcMax }));
}

// ── filtered dishes ───────────────────────────────────────────
// KPI і список рахуються тільки по видимих стравах
function filteredDishes() {
  let arr = _dishes;
  if (_storeSet.size > 0)    arr = arr.filter(d => _storeSet.has(d.store));
  if (_goodsCatSet.size > 0) arr = arr.filter(d => _goodsCatSet.has(d.goodsCategory));
  if (_catSet.size > 0)      arr = arr.filter(d => _catSet.has(d.category));
  if (!_showHidden)          arr = arr.filter(d => !_hidden.has(d.id));
  return arr;
}

// ── format helpers ────────────────────────────────────────────
function fmtFC(fc) {
  if (fc === null || fc === undefined || isNaN(fc) || !isFinite(fc)) return '—';
  return fc.toFixed(2).replace('.', ',') + '%';
}
function fmtPrice(val) {
  if (!val) return '—';
  return val.toFixed(2).replace('.', ',') + ' ₴';
}

// ── helpers ───────────────────────────────────────────────────
function hdrs() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` };
}
function fcColor(fc) {
  if (fc == null) return 'var(--text2)';
  if (fc > _fcMax) return 'var(--red)';
  if (_fcMin > 0 && fc < _fcMin) return 'var(--green)';
  return 'var(--amber)';
}
function fcBg(fc) {
  if (fc == null) return 'var(--bg3)';
  if (fc > _fcMax) return 'var(--red-bg)';
  if (_fcMin > 0 && fc < _fcMin) return 'var(--green-bg)';
  return 'var(--amber-bg)';
}
function calcCost(dish) {
  if ((dish.ingredients || []).length) {
    let cost = 0;
    for (const ing of dish.ingredients)
      cost += (ing.grossAmount || 0) * (_prices[ing.productId]?.unitPrice || 0);
    if (cost > 0) return cost;
  }
  return dish.costPrice || 0;
}
function calcFC(dish) {
  const cost  = calcCost(dish);
  const price = _prices[dish.id]?.salePrice || dish.sellingPrice || 0;
  if (!price || !cost || price <= 0) return null;
  const fc = (cost / price) * 100;
  return isFinite(fc) && fc <= 999 ? fc : null;
}

function re() {
  _swipedId = null;
  const savedScroll = document.querySelector('.rec-scroll')?.scrollTop || 0;
  const el = document.getElementById('rec-root');
  if (el) {
    el.innerHTML = buildPage();
    if (!_loading && !_error) applyFilter();
    const sc = document.querySelector('.rec-scroll');
    if (sc && savedScroll) sc.scrollTop = savedScroll;
  }
}

// ── swipe to hide ─────────────────────────────────────────────
let _tStartX = 0, _tStartY = 0, _tCardEl = null;

function initCardSwipe(root) {
  root.addEventListener('touchstart', e => {
    const card = e.target.closest('.rec-card');
    if (!card) { _closeSwipe(); return; }
    _tStartX = e.touches[0].clientX;
    _tStartY = e.touches[0].clientY;
    _tCardEl = card;
  }, { passive: true });

  root.addEventListener('touchmove', e => {
    if (!_tCardEl) return;
    const dx = e.touches[0].clientX - _tStartX;
    const dy = Math.abs(e.touches[0].clientY - _tStartY);
    if (dy > 40) { _tCardEl = null; return; }
    if (dx < 0 && !_swipedId) {
      const offset = Math.max(dx, -88);
      _tCardEl.style.transform = `translateX(${offset}px)`;
      _tCardEl.style.transition = 'none';
    } else if (dx > 20 && _swipedId === _tCardEl.dataset.id) {
      _tCardEl.style.transform = 'none';
      _tCardEl.style.transition = 'transform .2s ease';
      _swipedId = null;
      _tCardEl  = null;
    }
  }, { passive: true });

  root.addEventListener('touchend', e => {
    if (!_tCardEl) return;
    const dx = e.changedTouches[0].clientX - _tStartX;
    if (dx < -55) {
      _tCardEl.style.transform = 'translateX(-88px)';
      _tCardEl.style.transition = 'transform .2s ease';
      _swipedId = _tCardEl.dataset.id;
    } else {
      _tCardEl.style.transform = 'none';
      _tCardEl.style.transition = 'transform .2s ease';
    }
    _tCardEl = null;
  }, { passive: true });
}

function _closeSwipe() {
  if (_swipedId) {
    const el = document.querySelector(`.rec-card[data-id="${_swipedId}"]`);
    if (el) { el.style.transform = 'none'; el.style.transition = 'transform .2s ease'; }
    _swipedId = null;
  }
}

// ── data loading ──────────────────────────────────────────────
function fetchWithTimeout(url, opts, timeoutMs) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(tid));
}

const DISHES_CACHE_TTL = 12 * 60 * 60 * 1000;
function dishCacheKey() { return `barops_dishes_${_venueId}`; }
function loadDishesFromCache() {
  try {
    const raw = localStorage.getItem(dishCacheKey());
    if (!raw) return null;
    const { dishes, ts } = JSON.parse(raw);
    if (Date.now() - ts > DISHES_CACHE_TTL) return null;
    return dishes;
  } catch { return null; }
}
function saveDishesToCache(dishes) {
  try { localStorage.setItem(dishCacheKey(), JSON.stringify({ dishes, ts: Date.now() })); } catch {}
}

async function loadAll(attempt = 1) {
  const cached = loadDishesFromCache();
  if (cached && _dishes.length === 0) { _dishes = cached; }
  _loading = !cached || _dishes.length === 0;
  _error = '';
  re();

  const [dishResult, priceResult] = await Promise.allSettled([
    fetchWithTimeout(`${API}/api/pos/dishes/${_venueId}`, { headers: hdrs() }, 120000),
    fetchWithTimeout(`${API}/api/pos/syrve-prices?venueId=${_venueId}`, { headers: hdrs() }, 30000),
  ]);

  if (dishResult.status === 'fulfilled' && dishResult.value.ok) {
    const d = await dishResult.value.json().catch(() => ({}));
    if (d.dishes?.length) { _dishes = d.dishes; saveDishesToCache(_dishes); }
  } else if (dishResult.status === 'rejected') {
    const isNetwork = dishResult.reason?.name === 'AbortError' || dishResult.reason?.message?.includes('fetch');
    if (isNetwork && attempt < 4) {
      await new Promise(r => setTimeout(r, 3000 * attempt));
      return loadAll(attempt + 1);
    }
    if (_dishes.length === 0) _error = 'Немає зв\'язку. Перевірте інтернет.';
  } else if (dishResult.status === 'fulfilled' && !dishResult.value.ok) {
    const d = await dishResult.value.json().catch(() => ({}));
    if (_dishes.length === 0) _error = d.error || 'Помилка завантаження страв';
  }

  if (priceResult.status === 'fulfilled' && priceResult.value.ok) {
    const d = await priceResult.value.json().catch(() => ({}));
    _prices = {};
    for (const p of (d.prices || []))
      _prices[p.productId] = { unitPrice: p.unitPrice, salePrice: p.salePrice };
  }

  _loading = false; re();
}

async function syncPrices() {
  _syncing = true; _syncMsg = 'Запускаємо синхронізацію...'; re();
  try { localStorage.removeItem(dishCacheKey()); } catch {}
  try {
    await fetchWithTimeout(`${API}/api/pos/sync-prices/${_venueId}`, { method: 'POST', headers: hdrs() }, 10000);
    _syncMsg = 'Синхронізацію запущено (~2 хв). Дані оновляться автоматично.';
  } catch {
    _syncMsg = 'Синхронізацію запущено у фоні';
  }
  _syncing = false; re();

  setTimeout(() => {
    try { localStorage.removeItem(dishCacheKey()); } catch {}
    _dishes = [];
    loadAll();
  }, 2 * 60 * 1000);
}

async function savePrice(productId, field, value) {
  _priceSaving = true; re();
  const cur  = _prices[productId] || { unitPrice: 0, salePrice: 0 };
  const body = {
    venueId:   _venueId,
    productId,
    unitPrice: field === 'unitPrice' ? +value : cur.unitPrice,
    salePrice: field === 'salePrice' ? +value : cur.salePrice,
  };
  try {
    const res = await fetch(`${API}/api/pos/syrve-prices`, {
      method: 'POST', headers: hdrs(), body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      _prices[productId] = { unitPrice: d.price.unitPrice, salePrice: d.price.salePrice };
    }
  } catch {}
  _priceEdit = null; _priceDraft = ''; _priceSaving = false; re();
}

// ── events ────────────────────────────────────────────────────
function on(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) { _closeSwipe(); return; }
  const { act, id, pid, fld } = btn.dataset;

  if (act === 'open') {
    if (_swipedId === id) { _closeSwipe(); return; }
    _closeSwipe();
    _selected = id; _priceEdit = null; re(); return;
  }
  if (act === 'close') {
    if (e.target.closest('.rec-sheet')) return;
    _selected = null; _priceEdit = null; re(); return;
  }
  if (act === 'cat') {
    if (id === 'all') _catSet.clear();
    else { if (_catSet.has(id)) _catSet.delete(id); else _catSet.add(id); }
    saveCats();
    re();
    return;
  }
  if (act === 'store') {
    if (id === 'all') _storeSet.clear();
    else { if (_storeSet.has(id)) _storeSet.delete(id); else _storeSet.add(id); }
    saveStores();
    re();
    return;
  }
  if (act === 'goodscat') {
    if (id === 'all') _goodsCatSet.clear();
    else { if (_goodsCatSet.has(id)) _goodsCatSet.delete(id); else _goodsCatSet.add(id); }
    saveGoodsCats();
    re();
    return;
  }
  if (act === 'hide-dish') {
    _hidden.add(id);
    saveHidden();
    re();
    return;
  }
  if (act === 'unhide-dish') {
    _hidden.delete(id);
    saveHidden();
    re();
    return;
  }
  if (act === 'toggle-hidden') {
    _showHidden = !_showHidden;
    re();
    return;
  }
  if (act === 'price-edit')   { _priceEdit = { productId: pid, field: fld }; _priceDraft = String(_prices[pid]?.[fld] || ''); re(); return; }
  if (act === 'price-save')   { if (_priceEdit) savePrice(_priceEdit.productId, _priceEdit.field, _priceDraft); return; }
  if (act === 'price-cancel') { _priceEdit = null; _priceDraft = ''; re(); return; }
  if (act === 'reload')       { loadAll(); return; }
  if (act === 'sync-prices')  { if (!_syncing) syncPrices(); return; }
  if (act === 'toggle-settings') { _showFCSettings = !_showFCSettings; re(); return; }
  if (act === 'save-thresh') {
    const minEl = document.getElementById('rec-fc-min');
    const maxEl = document.getElementById('rec-fc-max');
    if (minEl) _fcMin = parseFloat(minEl.value) || 0;
    if (maxEl) _fcMax = parseFloat(maxEl.value) || 25;
    saveThresholds();
    _showFCSettings = false;
    re();
    return;
  }
}

function onInput(e) {
  const el = e.target;
  if (el.dataset.role === 'price-input') { _priceDraft = el.value; return; }
  if (el.dataset.role === 'search')      { _search = el.value; applyFilter(); }
}

// Search-only filter (categories already pre-filtered in filteredDishes())
function applyFilter() {
  const q = _search.toLowerCase();
  document.querySelectorAll('.rec-card-wrap').forEach(wrap => {
    wrap.style.display = !q || (wrap.dataset.name || '').includes(q) ? '' : 'none';
  });
}

function openSectionFilter() {
  const existing = document.getElementById('rec-section-sheet');
  if (existing) { existing.remove(); return; }
  const cats = [...new Set(_dishes.map(d => d.category).filter(Boolean))].sort();
  const isAll = _catSet.size === 0;
  const sheet = document.createElement('div');
  sheet.id = 'rec-section-sheet';
  sheet.className = 'rec-sheet-ov open';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:200';
  sheet.innerHTML = `
    <div class="rec-sheet" style="max-height:75vh;overflow-y:auto">
      <div class="rec-sheet-handle"></div>
      <div style="padding:0 16px 12px;font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">Розділ меню</div>
      <div class="rec-section-row ${isAll ? 'sel' : ''}" onclick="window.__rec.selectSection(null)">
        <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">Всі розділи</div>
        ${isAll ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      ${cats.map(c => `
      <div class="rec-section-row ${_catSet.has(c) ? 'sel' : ''}" onclick="window.__rec.toggleSection('${c.replace(/'/g,"\\'")}')">
        <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">${c}</div>
        ${_catSet.has(c) ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>`).join('')}
      <div style="height:24px"></div>
    </div>`;
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSectionFilter(); });
  document.body.appendChild(sheet);
}

function closeSectionFilter() {
  const s = document.getElementById('rec-section-sheet');
  if (s) s.remove();
}

function selectSection(cat) {
  _catSet.clear();
  if (cat) _catSet.add(cat);
  saveCats();
  closeSectionFilter();
  re();
}

function toggleSection(cat) {
  if (_catSet.has(cat)) _catSet.delete(cat);
  else _catSet.add(cat);
  saveCats();
  closeSectionFilter();
  openSectionFilter();
  re();
}

function openStoreFilter() {
  const existing = document.getElementById('rec-store-sheet');
  if (existing) { existing.remove(); return; }
  const stores = [...new Set(_dishes.map(d => d.store).filter(Boolean))].sort();
  if (stores.length === 0) return;
  const isAll = _storeSet.size === 0;
  const sheet = document.createElement('div');
  sheet.id = 'rec-store-sheet';
  sheet.className = 'rec-sheet-ov open';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:200';
  sheet.innerHTML = `
    <div class="rec-sheet" style="max-height:75vh;overflow-y:auto">
      <div class="rec-sheet-handle"></div>
      <div style="padding:0 16px 12px;font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">Склад</div>
      <div class="rec-section-row ${isAll ? 'sel' : ''}" onclick="window.__rec.selectAllStores()">
        <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">Всі склади</div>
        ${isAll ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      ${stores.map(s => {
        const dishCount = _dishes.filter(d => d.store === s).length;
        return `
      <div class="rec-section-row ${_storeSet.has(s) ? 'sel' : ''}" onclick="window.__rec.toggleStore('${s.replace(/'/g,"\\'")}')">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;color:var(--text0);font-family:var(--font-b)">${s}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${dishCount} страв</div>
        </div>
        ${_storeSet.has(s) ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>`;
      }).join('')}
      <div style="height:24px"></div>
    </div>`;
  sheet.addEventListener('click', e => { if (e.target === sheet) closeStoreFilter(); });
  document.body.appendChild(sheet);
}

function closeStoreFilter() {
  const s = document.getElementById('rec-store-sheet');
  if (s) s.remove();
}

function selectAllStores() {
  _storeSet.clear();
  saveStores();
  closeStoreFilter();
  re();
}

function toggleStore(store) {
  if (_storeSet.has(store)) _storeSet.delete(store);
  else _storeSet.add(store);
  saveStores();
  closeStoreFilter();
  openStoreFilter();
  re();
}

function openGoodsCatFilter() {
  const existing = document.getElementById('rec-goodscat-sheet');
  if (existing) { existing.remove(); return; }
  const cats = [...new Set(_dishes.map(d => d.goodsCategory).filter(Boolean))].sort();
  if (cats.length === 0) return;
  const isAll = _goodsCatSet.size === 0;
  const sheet = document.createElement('div');
  sheet.id = 'rec-goodscat-sheet';
  sheet.className = 'rec-sheet-ov open';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:200';
  sheet.innerHTML = `
    <div class="rec-sheet" style="max-height:75vh;overflow-y:auto">
      <div class="rec-sheet-handle"></div>
      <div style="padding:0 16px 12px;font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">Категорія товарів</div>
      <div class="rec-section-row ${isAll ? 'sel' : ''}" onclick="window.__rec.selectAllGoodsCats()">
        <div style="flex:1;font-size:14px;color:var(--text0);font-family:var(--font-b)">Всі категорії</div>
        ${isAll ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>
      ${cats.map(c => {
        const dishCount = _dishes.filter(d => d.goodsCategory === c).length;
        return `
      <div class="rec-section-row ${_goodsCatSet.has(c) ? 'sel' : ''}" onclick="window.__rec.toggleGoodsCat('${c.replace(/'/g,"\\'")}')">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;color:var(--text0);font-family:var(--font-b)">${c}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${dishCount} страв</div>
        </div>
        ${_goodsCatSet.has(c) ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
      </div>`;
      }).join('')}
      <div style="height:24px"></div>
    </div>`;
  sheet.addEventListener('click', e => { if (e.target === sheet) closeGoodsCatFilter(); });
  document.body.appendChild(sheet);
}

function closeGoodsCatFilter() {
  const s = document.getElementById('rec-goodscat-sheet');
  if (s) s.remove();
}

function selectAllGoodsCats() {
  _goodsCatSet.clear();
  saveGoodsCats();
  closeGoodsCatFilter();
  re();
}

function toggleGoodsCat(cat) {
  if (_goodsCatSet.has(cat)) _goodsCatSet.delete(cat);
  else _goodsCatSet.add(cat);
  saveGoodsCats();
  closeGoodsCatFilter();
  openGoodsCatFilter();
  re();
}

function clearAllFilters() {
  _storeSet.clear(); saveStores();
  _goodsCatSet.clear(); saveGoodsCats();
  _catSet.clear(); saveCats();
  re();
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `<style id="rec-css">
.rec-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.rec-scroll{overflow-y:auto;flex:1}.rec-scroll::-webkit-scrollbar{width:0}
.rec-topbar{padding:8px 16px 6px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.rec-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);flex:1}
.rec-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.rec-search-wrap{padding:0 20px 12px}
.rec-search{width:100%;box-sizing:border-box;height:42px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 14px;outline:none}
.rec-search:focus{border-color:var(--green)}
.rec-cats{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}.rec-cats::-webkit-scrollbar{display:none}
.rec-cat{flex-shrink:0;height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
.rec-cat.act{background:var(--green);border-color:var(--green);color:#000}
.rec-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border-radius:14px;overflow:hidden;margin:0 20px 14px;border:0.5px solid var(--border)}
.rec-kpi{background:var(--bg1);padding:14px 12px;text-align:center;cursor:default;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rec-kpi-val{font-family:var(--font-h);font-size:18px;font-weight:600;line-height:1;letter-spacing:-.02em}
.rec-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:6px;text-transform:uppercase;letter-spacing:.06em;line-height:1.3}
.rec-list{margin:0 20px}
.rec-card-wrap{position:relative;overflow:hidden;border-bottom:0.5px solid var(--border)}
.rec-card-wrap:last-child{border-bottom:none}
.rec-hide-action{position:absolute;right:0;top:0;bottom:0;width:80px;background:var(--red,#c0392b);border:none;color:#fff;font-size:11px;font-family:var(--font-b);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:0;z-index:0}
.rec-card{margin:0;background:var(--bg);border:none;border-radius:0;padding:12px 0;cursor:pointer;transition:opacity .12s;position:relative;z-index:1;will-change:transform;display:flex;align-items:center;gap:14px;width:100%}
.rec-card:active{opacity:.7}
.rec-card.hidden-card{opacity:.38}
.rec-name{font-family:var(--font-h);font-size:14px;font-weight:500;color:var(--text0);line-height:1.2}
.rec-cat-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.rec-skel{background:var(--bg2);border-radius:14px;animation:rSkel 1.2s ease-in-out infinite;margin:0 14px 8px}
@keyframes rSkel{0%,100%{opacity:.5}50%{opacity:1}}
.rec-sheet-ov{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.78);display:none;flex-direction:column;justify-content:flex-end}
.rec-sheet-ov.open{display:flex;animation:rsOvIn .2s ease}
@keyframes rsOvIn{from{opacity:0}to{opacity:1}}
.rec-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);max-height:88vh;display:flex;flex-direction:column;animation:rsSlide .3s cubic-bezier(.22,1,.36,1)}
@keyframes rsSlide{from{transform:translateY(100%)}to{transform:none}}
.rec-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 12px;flex-shrink:0}
.rec-sheet-scroll{overflow-y:auto;flex:1;padding:0 0 40px}.rec-sheet-scroll::-webkit-scrollbar{width:0}
.rec-ing-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)}
.rec-ing-row:last-child{border-bottom:none}
.rec-price-inp{width:70px;height:28px;background:var(--bg3);border:1px solid var(--green);border-radius:7px;color:var(--text0);font-size:12px;text-align:right;padding:0 6px;outline:none}
.rec-btn-ok{height:28px;padding:0 8px;background:var(--green);border:none;border-radius:7px;color:#000;font-size:11px;cursor:pointer;font-family:var(--font-b)}
.rec-btn-cancel{height:28px;padding:0 8px;background:var(--bg3);border:none;border-radius:7px;color:var(--text2);font-size:11px;cursor:pointer;font-family:var(--font-b)}
.rec-card-wrap.warn-low{}
.rec-card-wrap.warn-high{}
.rec-warn-icon{width:18px;height:18px;flex-shrink:0}
.rec-settings-bar{display:flex;align-items:center;gap:8px;padding:0 14px 10px;flex-wrap:wrap}
.rec-thresh-inp{width:52px;height:30px;background:var(--bg2);border:0.5px solid var(--border);border-radius:8px;color:var(--text0);font-size:13px;text-align:center;padding:0 6px;outline:none;font-family:var(--font-b)}
.rec-thresh-inp:focus{border-color:var(--green)}
.rec-filter-btn{height:32px;padding:0 10px;border-radius:16px;border:0.5px solid var(--border);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;transition:all .15s}
.rec-filter-btn.active{background:var(--green-bg,#1a3320);border-color:var(--green);color:var(--green)}
.rec-section-row{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:0.5px solid var(--border);cursor:pointer;transition:background .1s}
.rec-section-row:hover{background:var(--bg3)}
.rec-section-row.sel{background:var(--green-bg,#1a3320)}
.rec-hidden-bar{padding:0 14px 8px;display:flex;align-items:center;justify-content:space-between}
.rec-hidden-toggle{font-size:11px;color:var(--text2);font-family:var(--font-b);background:none;border:none;cursor:pointer;text-decoration:underline;padding:0}
</style>`;

// ── build HTML ────────────────────────────────────────────────
function buildPage() {
  if (_loading) return buildSkel();
  if (_error)   return buildError();
  return buildMain();
}

function buildSkel() {
  return `<div class="rec-wrap">
    <div class="rec-topbar"><div class="rec-title">Фудкост</div></div>
    <div class="rec-scroll" style="padding-top:8px">
      ${[1,2,3].map(() => `<div class="rec-skel" style="height:110px"></div>`).join('')}
    </div>
  </div>`;
}

function buildError() {
  return `<div class="rec-wrap">
    <div class="rec-topbar"><div class="rec-title">Фудкост</div></div>
    <div style="padding:40px 24px;text-align:center">
      <div style="font-size:36px;margin-bottom:14px">⚠️</div>
      <div style="font-family:var(--font-h);font-size:15px;color:var(--text0);margin-bottom:8px">${_error}</div>
      <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:20px;line-height:1.6">Перевірте налаштування POS — Syrve має бути підключено</div>
      <button data-act="reload" style="height:36px;padding:0 20px;background:var(--green);border:none;border-radius:10px;color:#000;font-size:13px;cursor:pointer;font-family:var(--font-b)">Спробувати знову</button>
    </div>
  </div>`;
}

function buildMain() {
  const visible  = filteredDishes();
  const withFC   = visible.filter(d => calcFC(d) !== null);
  const avgFCv   = withFC.length ? withFC.reduce((a, d) => a + calcFC(d), 0) / withFC.length : null;
  const alerts   = withFC.filter(d => {
    const fc = calcFC(d);
    return fc !== null && (fc > _fcMax || (_fcMin > 0 && fc < _fcMin));
  }).length;
  const detail   = _selected ? _dishes.find(d => d.id === _selected) : null;
  const activeSingle = _catSet.size === 1 ? [..._catSet][0] : null;

  const filterLabel = _catSet.size === 0 ? 'Розділ'
    : _catSet.size === 1 ? (activeSingle.slice(0, 10) + (activeSingle.length > 10 ? '…' : ''))
    : `${_catSet.size} розд.`;
  const storeLabel = _storeSet.size === 0 ? 'Група'
    : _storeSet.size === 1 ? ([..._storeSet][0].slice(0, 10) + ([..._storeSet][0].length > 10 ? '…' : ''))
    : `${_storeSet.size} гр.`;
  const goodsCatLabel = _goodsCatSet.size === 0 ? 'Категорія'
    : _goodsCatSet.size === 1 ? ([..._goodsCatSet][0].slice(0, 10) + ([..._goodsCatSet][0].length > 10 ? '…' : ''))
    : `${_goodsCatSet.size} кат.`;
  const allStores = [...new Set(_dishes.map(d => d.store).filter(Boolean))].sort();
  const allGoodsCats = [...new Set(_dishes.map(d => d.goodsCategory).filter(Boolean))].sort();

  const subtitleCount = visible.length < _dishes.length
    ? `${visible.length}/${_dishes.length} страв`
    : `${_dishes.length} страв`;

  const hiddenCount = _hidden.size;

  return `<div class="rec-wrap">
  <div class="rec-topbar">
    <div style="flex:1">
      <div class="rec-title">Фудкост</div>
      <div class="rec-sub">${subtitleCount} · Syrve${_syncMsg ? ' · ' + _syncMsg : ''}</div>
    </div>
    ${_role === 'manager' ? `
    <button data-act="sync-prices" style="height:32px;padding:0 12px;background:${_syncing ? 'var(--bg3)' : 'var(--amber,#c98a00)'};border:none;border-radius:10px;color:${_syncing ? 'var(--text2)' : '#000'};font-size:12px;font-family:var(--font-b);cursor:pointer;flex-shrink:0" ${_syncing ? 'disabled' : ''}>
      ${_syncing ? '⏳...' : '↻ Ціни'}
    </button>` : ''}
  </div>

  <div class="rec-scroll">
    <div class="rec-search-wrap">
      <input class="rec-search" placeholder="🔍 Пошук страви..." value="${_search}" data-role="search"/>
    </div>

    <div style="display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto">
      ${allStores.length > 0 ? `
      <div class="rec-filter-btn ${_storeSet.size > 0 ? 'active' : ''}" onclick="window.__rec.openStoreFilter()">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3L6.5 1l5 2V7c0 2.5-2.5 4-5 5C4 11 1.5 9.5 1.5 7z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        ${storeLabel}
      </div>` : ''}
      ${allGoodsCats.length > 0 ? `
      <div class="rec-filter-btn ${_goodsCatSet.size > 0 ? 'active' : ''}" onclick="window.__rec.openGoodsCatFilter()">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 10V5.5L6.5 2l5 3.5V10H9V7.5H4V10z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        ${goodsCatLabel}
      </div>` : ''}
      <div class="rec-filter-btn ${_catSet.size > 0 ? 'active' : ''}" onclick="window.__rec.openSectionFilter()">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        ${filterLabel}
      </div>
      ${(_storeSet.size > 0 || _goodsCatSet.size > 0 || _catSet.size > 0) ? `
      <div class="rec-filter-btn" onclick="window.__rec.clearAllFilters()" style="color:var(--red);border-color:var(--red)">
        ✕ Скинути
      </div>` : ''}
    </div>

    ${_dishes.length === 0 ? `
    <div style="padding:60px 30px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🍽️</div>
      <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:8px">Страв не знайдено</div>
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6">Переконайтеся що Syrve підключено і є страви типу DISH у номенклатурі</div>
    </div>` : `

    <div class="rec-kpi-row">
      <div class="rec-kpi">
        <div class="rec-kpi-val" style="color:${fcColor(avgFCv)}">${fmtFC(avgFCv)}</div>
        <div class="rec-kpi-lbl">Сер. FC</div>
      </div>
      <div class="rec-kpi" data-act="toggle-settings" style="cursor:pointer">
        <div class="rec-kpi-val" style="color:${alerts > 0 ? 'var(--red)' : 'var(--green)'}">${alerts}</div>
        <div class="rec-kpi-lbl" style="display:flex;align-items:center;justify-content:center;gap:3px">
          Поза межами
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1"/><path d="M5 3v2.5M5 6.5v.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="rec-kpi">
        <div class="rec-kpi-val">${withFC.length}<span style="font-size:11px;font-weight:400;color:var(--text2)">/${visible.length}</span></div>
        <div class="rec-kpi-lbl">З ціною</div>
      </div>
    </div>

    ${_showFCSettings ? `
    <div class="rec-settings-bar" style="background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;margin:0 14px 10px;padding:10px 14px">
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);flex-shrink:0">Межі FC:</div>
      <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);flex-shrink:0">мін</div>
      <input class="rec-thresh-inp" id="rec-fc-min" type="number" min="0" max="100" step="1" value="${_fcMin}"/>
      <div style="font-size:11px;color:var(--text2)">%</div>
      <div style="font-size:11px;color:var(--text3);padding:0 2px">—</div>
      <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);flex-shrink:0">макс</div>
      <input class="rec-thresh-inp" id="rec-fc-max" type="number" min="0" max="500" step="1" value="${_fcMax}"/>
      <div style="font-size:11px;color:var(--text2)">%</div>
      <button data-act="save-thresh" style="height:28px;padding:0 10px;background:var(--green);border:none;border-radius:8px;color:#000;font-size:11px;cursor:pointer;font-family:var(--font-b);margin-left:auto">Зберегти</button>
    </div>` : ''}

    ${hiddenCount > 0 ? `
    <div class="rec-hidden-bar">
      <span style="font-size:11px;color:var(--text2);font-family:var(--font-b)">
        Свайп вліво → Сховати страву зі статистики
      </span>
      <button class="rec-hidden-toggle" data-act="toggle-hidden">
        ${_showHidden ? 'Ховати приховані' : `Сховано: ${hiddenCount}`}
      </button>
    </div>` : `
    <div style="padding:0 14px 6px">
      <div style="font-size:11px;color:var(--text3);font-family:var(--font-b)">← Свайп вліво на страві → Сховати</div>
    </div>`}

    <div class="rec-list">
    ${visible.map(d => {
      const cost  = calcCost(d);
      const fc    = calcFC(d);
      const price = _prices[d.id]?.salePrice || d.sellingPrice || 0;
      const color = fcColor(fc);
      const isHigh = fc !== null && fc > _fcMax;
      const isLow  = fc !== null && _fcMin > 0 && fc < _fcMin;
      const wrapClass = isHigh ? 'warn-high' : isLow ? 'warn-low' : '';
      const isHiddenDish = _hidden.has(d.id);
      const warnIcon = isHigh
        ? `<svg class="rec-warn-icon" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="var(--red)" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 7v4M9 12.5v.5" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round"/></svg>`
        : isLow
        ? `<svg class="rec-warn-icon" viewBox="0 0 18 18" fill="none"><path d="M9 2L16.5 15H1.5L9 2Z" stroke="var(--amber)" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 7v4M9 12.5v.5" stroke="var(--amber)" stroke-width="1.3" stroke-linecap="round"/></svg>`
        : '';
      return `
    <div class="rec-card-wrap${wrapClass ? ' ' + wrapClass : ''}" data-name="${(d.name || '').toLowerCase()}" data-id="${d.id}">
      <button class="rec-hide-action" data-act="${isHiddenDish ? 'unhide-dish' : 'hide-dish'}" data-id="${d.id}">
        ${isHiddenDish
          ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="#fff" stroke-width="1.3"/><circle cx="8" cy="8" r="2.5" stroke="#fff" stroke-width="1.3"/></svg>Відновити`
          : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.4 3.5A7 7 0 0115 8s-.8 1.5-2 2.8M10 12.3A7 7 0 011 8s1-2 3-3.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>Сховати`}
      </button>
      <div class="rec-card${isHiddenDish ? ' hidden-card' : ''}" data-act="open" data-id="${d.id}">
        <div style="flex:1;min-width:0">
          <div class="rec-name" style="display:flex;align-items:center;gap:6px">
            ${d.name}${warnIcon}
          </div>
          <div class="rec-cat-lbl">${d.category || '—'} · соб. ${fmtPrice(cost || null)} · ціна ${price ? price.toFixed(0) + ' ₴' : '—'}</div>
        </div>
        <div style="text-align:right;min-width:56px;flex-shrink:0">
          <div style="font-family:var(--font-h);font-size:14px;font-weight:600;color:${color};letter-spacing:-0.02em;line-height:1">${fc !== null ? fmtFC(fc) : '—'}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;font-family:var(--font-b)">фудкост</div>
        </div>
      </div>
    </div>`;
    }).join('')}
    </div>
    `}

    <div style="height:20px"></div>
  </div>

  <!-- Detail bottom sheet -->
  <div class="rec-sheet-ov ${detail ? 'open' : ''}" data-act="close">
    <div class="rec-sheet">
      <div class="rec-sheet-handle"></div>
      ${detail ? buildDetail(detail) : ''}
    </div>
  </div>
</div>`;
}

function buildDetail(d) {
  const isMgr = _role === 'admin' || _role === 'manager';
  const cost  = calcCost(d);
  const fc    = calcFC(d);
  const price = _prices[d.id]?.salePrice || d.sellingPrice || 0;
  const color = fcColor(fc);

  return `
  <div style="padding:0 16px 12px;display:flex;align-items:center;gap:12px;flex-shrink:0;border-bottom:1px solid var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);line-height:1.2">${d.name}</div>
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${d.category || '—'}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-family:var(--font-h);font-size:18px;font-weight:700;color:${color}">${fc !== null ? 'FC ' + fmtFC(fc) : '—'}</div>
    </div>
  </div>

  ${buildPriceRow(d.id, 'salePrice', price, 'Ціна продажу', '₴', isMgr)}
  ${!(d.ingredients || []).length ? buildPriceRow(d.id, 'unitPrice', _prices[d.id]?.unitPrice || 0, 'Собівартість порції', '₴', isMgr) : ''}

  <div class="rec-sheet-scroll">
    ${(d.ingredients || []).length ? `
    <div style="padding:10px 16px 4px;font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.08em">Технологічна карта (ТТК)</div>` : ''}

    ${(d.ingredients || []).length === 0 ? `
    <div style="padding:16px 16px 4px">
      <div style="background:var(--bg3);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.6">
        ТТК в Syrve не задана. Вкажіть собівартість порції і ціну продажу вище — фудкост розрахується автоматично.
      </div>
    </div>` : (d.ingredients || []).map(ing => {
      const ingPrice = _prices[ing.productId]?.unitPrice || 0;
      const ingCost  = (ing.grossAmount || 0) * ingPrice;
      const isEditing = _priceEdit?.productId === ing.productId && _priceEdit?.field === 'unitPrice';
      return `
    <div class="rec-ing-row">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${ing.name || ing.productId}</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${ing.grossAmount} ${ing.unit || ''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        ${isMgr ? (isEditing ? `
        <div style="display:flex;align-items:center;gap:5px">
          <input class="rec-price-inp" data-role="price-input" type="number" min="0" step="0.01"
            value="${_priceDraft}" ${_priceSaving ? 'disabled' : ''}/>
          <button class="rec-btn-ok" data-act="price-save" ${_priceSaving ? 'disabled' : ''}>OK</button>
          <button class="rec-btn-cancel" data-act="price-cancel">✕</button>
        </div>` : `
        <div data-act="price-edit" data-pid="${ing.productId}" data-fld="unitPrice" style="cursor:pointer">
          <div style="font-size:13px;font-family:var(--font-h);font-weight:600;color:${ingPrice ? 'var(--text0)' : 'var(--amber)'}">
            ${ingPrice ? ingPrice.toFixed(2) + ' ₴/од' : '+ Ціна'}
          </div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${ingCost ? ingCost.toFixed(2) + ' ₴' : '—'}</div>
        </div>`) : `
        <div>
          <div style="font-size:13px;font-family:var(--font-h);font-weight:600;color:var(--text0)">${ingCost ? ingCost.toFixed(2) + ' ₴' : '—'}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${ingPrice ? ingPrice.toFixed(2) + ' ₴/од' : '—'}</div>
        </div>`}
      </div>
    </div>`;
    }).join('')}

    <div style="padding:12px 16px;background:var(--bg3);display:flex;justify-content:space-between;align-items:center;margin-top:4px;flex-shrink:0">
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Собівартість</div>
      <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">${fmtPrice(cost || null)}</div>
    </div>
    ${fc !== null ? `
    <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Фудкост</div>
      <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:${color}">${fmtFC(fc)}</div>
    </div>` : `
    <div style="padding:14px 16px;text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.6">
      ${isMgr ? 'Вкажіть ціни інгредієнтів і ціну продажу для розрахунку фудкосту' : 'Менеджер ще не вніс ціни'}
    </div>`}
  </div>`;
}

function buildPriceRow(productId, field, currentVal, label, suffix, editable) {
  if (!editable) return '';
  const isEditing = _priceEdit?.productId === productId && _priceEdit?.field === field;
  return `
  <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
    <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);flex:1">${label}</div>
    ${isEditing ? `
    <div style="display:flex;align-items:center;gap:6px">
      <input style="width:80px;height:30px;background:var(--bg3);border:1px solid var(--green);border-radius:8px;color:var(--text0);font-size:13px;text-align:right;padding:0 8px;outline:none"
        data-role="price-input" type="number" min="0" step="1" value="${_priceDraft}" ${_priceSaving ? 'disabled' : ''}/>
      <span style="font-size:12px;color:var(--text2)">${suffix}</span>
      <button class="rec-btn-ok" style="height:30px" data-act="price-save" ${_priceSaving ? 'disabled' : ''}>OK</button>
      <button class="rec-btn-cancel" style="height:30px" data-act="price-cancel">✕</button>
    </div>` : `
    <div data-act="price-edit" data-pid="${productId}" data-fld="${field}" style="cursor:pointer;display:flex;align-items:center;gap:6px">
      <span style="font-family:var(--font-h);font-size:15px;font-weight:600;color:${currentVal ? 'var(--text0)' : 'var(--amber)'}">
        ${currentVal ? currentVal + ' ' + suffix : '+ Вкажіть'}
      </span>
    </div>`}
  </div>`;
}

// ── export ────────────────────────────────────────────────────
export default {
  render() {
    _venueId    = state.venueId || localStorage.getItem('barops_venueId');
    _token      = state.token   || localStorage.getItem('barops_token');
    _role       = state.role    || localStorage.getItem('barops_role');
    _dishes     = []; _prices = {}; _loading = true;
    _error      = ''; _search = '';
    _selected   = null; _priceEdit = null; _priceDraft = '';
    _showFCSettings = false; _showHidden = false; _swipedId = null;
    loadCats();
    loadThresholds();
    loadHidden();
    loadStores();
    loadGoodsCats();
    return `${CSS}<div id="rec-root" style="flex:1;display:flex;flex-direction:column;overflow:hidden">${buildPage()}</div>`;
  },
  init() {
    window.__rec = { openSectionFilter, closeSectionFilter, selectSection, toggleSection, openStoreFilter, closeStoreFilter, selectAllStores, toggleStore, openGoodsCatFilter, closeGoodsCatFilter, selectAllGoodsCats, toggleGoodsCat, clearAllFilters };
    const root = document.getElementById('rec-root');
    if (root) {
      root.addEventListener('click', on);
      root.addEventListener('input', onInput);
      initCardSwipe(root);
    }
    loadAll();
  },
  cleanup() {
    const root = document.getElementById('rec-root');
    if (root) {
      root.removeEventListener('click', on);
      root.removeEventListener('input', onInput);
    }
  },
};
