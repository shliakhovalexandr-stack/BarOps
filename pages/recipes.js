/* ============================================================
   BarOps — pages/recipes.js
   Фудкост: страви з Syrve + ТТК + розрахунок собівартості
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venueId, _token, _role;
let _dishes    = [];          // [{id, name, category, sellingPrice, ingredients}]
let _prices    = {};          // productId → {unitPrice, salePrice}
let _loading   = true;
let _syncing   = false;
let _syncMsg   = '';
let _error     = '';
let _search    = '';
let _catSet    = new Set();   // обрані категорії (порожнє = всі)
let _selected  = null;        // dish id shown in sheet
let _priceEdit = null;        // {productId, field}
let _priceDraft  = '';
let _priceSaving = false;

function catsKey() { return `barops_fc_cats_${_venueId}`; }
function saveCats() { localStorage.setItem(catsKey(), JSON.stringify([..._catSet])); }
function loadCats() {
  try { _catSet = new Set(JSON.parse(localStorage.getItem(catsKey()) || '[]')); }
  catch (_) { _catSet = new Set(); }
}

// ── helpers ──────────────────────────────────────────────────
function hdrs() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` };
}
function fcColor(fc) {
  return fc == null ? 'var(--text2)' : fc > 25 ? 'var(--red)' : fc > 20 ? 'var(--amber)' : 'var(--green)';
}
function calcCost(dish) {
  if (!(dish.ingredients || []).length) {
    // без ТТК: unitPrice = собівартість порції напряму
    return _prices[dish.id]?.unitPrice || 0;
  }
  let cost = 0;
  for (const ing of dish.ingredients) {
    cost += (ing.grossAmount || 0) * (_prices[ing.productId]?.unitPrice || 0);
  }
  return cost;
}
function calcFC(dish) {
  const cost  = calcCost(dish);
  const price = _prices[dish.id]?.salePrice || dish.sellingPrice || 0;
  if (!price || !cost) return null;
  return cost / price * 100;
}
function re() {
  const el = document.getElementById('rec-root');
  if (el) {
    el.innerHTML = buildPage();
    if (!_loading && !_error) applyFilter();
  }
}

// ── data loading ─────────────────────────────────────────────
async function loadAll() {
  _loading = true; _error = ''; re();
  try {
    const [dRes, pRes] = await Promise.all([
      fetch(`${API}/api/pos/dishes/${_venueId}`,           { headers: hdrs() }),
      fetch(`${API}/api/pos/syrve-prices?venueId=${_venueId}`, { headers: hdrs() }),
    ]);

    if (dRes.ok) {
      const d = await dRes.json();
      _dishes = d.dishes || [];
    } else {
      const d = await dRes.json().catch(() => ({}));
      _error = d.error || 'Помилка завантаження страв';
    }

    if (pRes.ok) {
      const d = await pRes.json();
      _prices = {};
      for (const p of (d.prices || []))
        _prices[p.productId] = { unitPrice: p.unitPrice, salePrice: p.salePrice };
    }
  } catch (e) {
    _error = e.message;
  }
  _loading = false; re();
}

async function syncPrices() {
  _syncing = true; _syncMsg = ''; re();
  try {
    const res = await fetch(`${API}/api/pos/sync-prices/${_venueId}`, {
      method: 'POST', headers: hdrs(),
    });
    const d = await res.json();
    if (res.ok) {
      _syncMsg = `Синхронізовано: ${d.updated} цін`;
      // Reload prices
      const pr = await fetch(`${API}/api/pos/syrve-prices?venueId=${_venueId}`, { headers: hdrs() });
      if (pr.ok) {
        const pd = await pr.json();
        _prices = {};
        for (const p of (pd.prices || []))
          _prices[p.productId] = { unitPrice: p.unitPrice, salePrice: p.salePrice };
      }
    } else {
      _syncMsg = d.error || 'Помилка синхронізації';
    }
  } catch (e) {
    _syncMsg = e.message;
  }
  _syncing = false; re();
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
  } catch (_) {}
  _priceEdit = null; _priceDraft = ''; _priceSaving = false; re();
}

// ── events ───────────────────────────────────────────────────
function on(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { act, id, pid, fld } = btn.dataset;

  if (act === 'open')   { _selected = id; _priceEdit = null; re(); return; }
  if (act === 'close')  {
    if (e.target.closest('.rec-sheet')) return;
    _selected = null; _priceEdit = null; re(); return;
  }
  if (act === 'cat') {
    if (id === 'all') {
      _catSet.clear();
    } else {
      if (_catSet.has(id)) _catSet.delete(id); else _catSet.add(id);
    }
    saveCats();
    document.querySelectorAll('.rec-cat').forEach(c => {
      const isAll = c.dataset.id === 'all';
      c.classList.toggle('act', isAll ? _catSet.size === 0 : _catSet.has(c.dataset.id));
    });
    applyFilter();
    return;
  }
  if (act === 'price-edit')   { _priceEdit = { productId: pid, field: fld }; _priceDraft = String(_prices[pid]?.[fld] || ''); re(); return; }
  if (act === 'price-save')   { if (_priceEdit) savePrice(_priceEdit.productId, _priceEdit.field, _priceDraft); return; }
  if (act === 'price-cancel') { _priceEdit = null; _priceDraft = ''; re(); return; }
  if (act === 'reload') { loadAll(); return; }
  if (act === 'sync-prices') { if (!_syncing) syncPrices(); }
}

function onInput(e) {
  const el = e.target;
  if (el.dataset.role === 'price-input') { _priceDraft = el.value; return; }
  if (el.dataset.role === 'search')      { _search = el.value; applyFilter(); }
}

function applyFilter() {
  const q = _search.toLowerCase();
  document.querySelectorAll('.rec-card').forEach(card => {
    const nameMatch = !q || (card.dataset.name || '').includes(q);
    const catMatch  = _catSet.size === 0 || _catSet.has(card.dataset.cat);
    card.style.display = nameMatch && catMatch ? '' : 'none';
  });
}

// ── CSS ──────────────────────────────────────────────────────
const CSS = `<style id="rec-css">
.rec-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.rec-scroll{overflow-y:auto;flex:1}.rec-scroll::-webkit-scrollbar{width:0}
.rec-topbar{padding:8px 16px 6px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.rec-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1}
.rec-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.rec-search-wrap{padding:0 14px 8px}
.rec-search{width:100%;box-sizing:border-box;height:38px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:11px;color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 12px;outline:none}
.rec-search:focus{border-color:var(--green)}
.rec-cats{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}.rec-cats::-webkit-scrollbar{display:none}
.rec-cat{flex-shrink:0;height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
.rec-cat.act{background:var(--green);border-color:var(--green);color:#fff}
.rec-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.rec-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px;text-align:center}
.rec-kpi-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.rec-kpi-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.05em}
.rec-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px;cursor:pointer;transition:background .12s}
.rec-card:active{background:var(--bg3)}
.rec-card-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
.rec-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);line-height:1.2}
.rec-cat-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.rec-fc-badge{height:24px;padding:0 10px;border-radius:12px;font-size:11px;font-family:var(--font-h);font-weight:700;display:flex;align-items:center;flex-shrink:0}
.rec-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.rec-metric{background:var(--bg3);border-radius:9px;padding:8px;text-align:center}
.rec-metric-val{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.rec-metric-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.04em}
.rec-skel{background:var(--bg2);border-radius:14px;animation:rSkel 1.2s ease-in-out infinite;margin:0 14px 8px}
@keyframes rSkel{0%,100%{opacity:.5}50%{opacity:1}}
.rec-sheet-ov{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.rec-sheet-ov.open{display:flex;animation:rsOvIn .2s ease}
@keyframes rsOvIn{from{opacity:0}to{opacity:1}}
.rec-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);max-height:88vh;display:flex;flex-direction:column;animation:rsSlide .3s cubic-bezier(.22,1,.36,1)}
@keyframes rsSlide{from{transform:translateY(100%)}to{transform:none}}
.rec-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 12px;flex-shrink:0}
.rec-sheet-scroll{overflow-y:auto;flex:1;padding:0 0 40px}.rec-sheet-scroll::-webkit-scrollbar{width:0}
.rec-ing-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--border)}
.rec-ing-row:last-child{border-bottom:none}
.rec-price-inp{width:70px;height:28px;background:var(--bg3);border:1px solid var(--green);border-radius:7px;color:var(--text0);font-size:12px;text-align:right;padding:0 6px;outline:none}
.rec-btn-ok{height:28px;padding:0 8px;background:var(--green);border:none;border-radius:7px;color:#fff;font-size:11px;cursor:pointer;font-family:var(--font-b)}
.rec-btn-cancel{height:28px;padding:0 8px;background:var(--bg3);border:none;border-radius:7px;color:var(--text2);font-size:11px;cursor:pointer;font-family:var(--font-b)}
</style>`;

// ── build HTML ───────────────────────────────────────────────
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
      <button data-act="reload" style="height:36px;padding:0 20px;background:var(--green);border:none;border-radius:10px;color:#fff;font-size:13px;cursor:pointer;font-family:var(--font-b)">Спробувати знову</button>
    </div>
  </div>`;
}

function buildMain() {
  const cats    = ['all', ...new Set(_dishes.map(d => d.category).filter(Boolean))];
  const withFC  = _dishes.filter(d => calcFC(d) !== null);
  const avgFCv  = withFC.length ? withFC.reduce((a, d) => a + calcFC(d), 0) / withFC.length : null;
  const alerts  = withFC.filter(d => calcFC(d) > 25).length;
  const detail  = _selected ? _dishes.find(d => d.id === _selected) : null;

  return `<div class="rec-wrap">
  <div class="rec-topbar">
    <div style="flex:1">
      <div class="rec-title">Фудкост</div>
      <div class="rec-sub">${_dishes.length} страв · Syrve${_syncMsg ? ' · ' + _syncMsg : ''}</div>
    </div>
    ${_role === 'manager' ? `
    <button data-act="sync-prices" style="height:32px;padding:0 12px;background:${_syncing ? 'var(--bg3)' : 'var(--green)'};border:none;border-radius:10px;color:${_syncing ? 'var(--text2)' : '#fff'};font-size:12px;font-family:var(--font-b);cursor:pointer;flex-shrink:0" ${_syncing ? 'disabled' : ''}>
      ${_syncing ? '⏳ Синхронізація...' : '↻ Ціни з Syrve'}
    </button>` : ''}
  </div>

  <div class="rec-scroll">
    <div class="rec-search-wrap">
      <input class="rec-search" placeholder="🔍 Пошук страви..." value="${_search}" data-role="search"/>
    </div>

    ${_dishes.length === 0 ? `
    <div style="padding:60px 30px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🍽️</div>
      <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:8px">Страв не знайдено</div>
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6">Переконайтеся що Syrve підключено і є страви типу DISH у номенклатурі</div>
    </div>` : `

    <div class="rec-kpi-row">
      <div class="rec-kpi">
        <div class="rec-kpi-val" style="color:${fcColor(avgFCv)}">${avgFCv !== null ? avgFCv.toFixed(1) + '%' : '—'}</div>
        <div class="rec-kpi-lbl">Сер. FC</div>
      </div>
      <div class="rec-kpi">
        <div class="rec-kpi-val" style="color:${alerts > 0 ? 'var(--red)' : 'var(--green)'}">${alerts}</div>
        <div class="rec-kpi-lbl">FC > 25%</div>
      </div>
      <div class="rec-kpi">
        <div class="rec-kpi-val">${_dishes.length}</div>
        <div class="rec-kpi-lbl">Страв</div>
      </div>
    </div>

    <div class="rec-cats">
      <div class="rec-cat ${_catSet.size === 0 ? 'act' : ''}" data-act="cat" data-id="all">Всі</div>
      ${cats.filter(c => c !== 'all').map(c => `
      <div class="rec-cat ${_catSet.has(c) ? 'act' : ''}" data-act="cat" data-id="${c}">${c}</div>`).join('')}
    </div>

    ${_dishes.map(d => {
      const cost  = calcCost(d);
      const fc    = calcFC(d);
      const price = _prices[d.id]?.salePrice || d.sellingPrice || 0;
      const color = fcColor(fc);
      return `
    <div class="rec-card" data-act="open" data-id="${d.id}"
         data-name="${(d.name || '').toLowerCase()}" data-cat="${d.category || ''}">
      <div class="rec-card-top">
        <div style="flex:1;min-width:0">
          <div class="rec-name">${d.name}</div>
          <div class="rec-cat-lbl">${d.category || '—'} · ${(d.ingredients || []).length} інгр.</div>
        </div>
        <div class="rec-fc-badge" style="background:${color}22;color:${color}">
          ${fc !== null ? 'FC ' + fc.toFixed(1) + '%' : '—'}
        </div>
      </div>
      <div class="rec-metrics">
        <div class="rec-metric">
          <div class="rec-metric-val">${price ? price + ' ₴' : '—'}</div>
          <div class="rec-metric-lbl">Ціна</div>
        </div>
        <div class="rec-metric">
          <div class="rec-metric-val">${cost ? cost.toFixed(2) + ' ₴' : '—'}</div>
          <div class="rec-metric-lbl">Собівартість</div>
        </div>
        <div class="rec-metric">
          <div class="rec-metric-val" style="color:${color}">${fc !== null ? fc.toFixed(1) + '%' : '—'}</div>
          <div class="rec-metric-lbl">FC</div>
        </div>
      </div>
    </div>`;
    }).join('')}
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
  const isMgr = _role === 'manager';
  const cost  = calcCost(d);
  const fc    = calcFC(d);
  const price = _prices[d.id]?.salePrice || d.sellingPrice || 0;
  const color = fcColor(fc);

  return `
  <!-- Sheet header -->
  <div style="padding:0 16px 12px;display:flex;align-items:center;gap:12px;flex-shrink:0;border-bottom:0.5px solid var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);line-height:1.2">${d.name}</div>
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${d.category || '—'}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-family:var(--font-h);font-size:18px;font-weight:700;color:${color}">${fc !== null ? 'FC ' + fc.toFixed(1) + '%' : '—'}</div>
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

    <!-- Totals -->
    <div style="padding:12px 16px;background:var(--bg3);display:flex;justify-content:space-between;align-items:center;margin-top:4px;flex-shrink:0">
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Собівартість</div>
      <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">${cost ? cost.toFixed(2) + ' ₴' : '—'}</div>
    </div>
    ${fc !== null ? `
    <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Фудкост</div>
      <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:${color}">${fc.toFixed(1)}%</div>
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
  <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:0.5px solid var(--border);flex-shrink:0">
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

// ── export ───────────────────────────────────────────────────
export default {
  render() {
    _venueId    = state.venueId || localStorage.getItem('barops_venueId');
    _token      = state.token   || localStorage.getItem('barops_token');
    _role       = state.role    || localStorage.getItem('barops_role');
    _dishes     = []; _prices = {}; _loading = true;
    _error      = ''; _search = '';
    _selected   = null; _priceEdit = null; _priceDraft = '';
    loadCats();
    return `${CSS}<div id="rec-root" style="flex:1;display:flex;flex-direction:column;overflow:hidden">${buildPage()}</div>`;
  },
  init() {
    const root = document.getElementById('rec-root');
    if (root) {
      root.addEventListener('click', on);
      root.addEventListener('input', onInput);
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
