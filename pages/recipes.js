/* ============================================================
   BarOps — pages/recipes.js
   Рецепти і фудкост: реальні дані з /api/recipes
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _recipes  = [];
let _loading  = true;
let _selected = null; // обраний рецепт
let _tab      = 'ingredients'; // ingredients | tech | history
let _search   = '';
let _catFilter = 'all';

function token() { return localStorage.getItem('barops_token') || ''; }
function venueId() { return localStorage.getItem('barops_venueId') || ''; }

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="rec-css">
.rec-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.rec-scroll{overflow-y:auto;flex:1}.rec-scroll::-webkit-scrollbar{width:0}
.rec-topbar{padding:8px 16px 6px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.rec-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1}
.rec-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.rec-add-btn{height:34px;padding:0 14px;background:var(--green);border:none;border-radius:10px;font-size:12px;font-family:var(--font-h);font-weight:600;color:#fff;cursor:pointer}
/* search */
.rec-search-wrap{padding:0 14px 8px;display:flex;gap:8px}
.rec-search{flex:1;height:38px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:11px;color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 12px;outline:none}
.rec-search:focus{border-color:var(--green)}
/* cats */
.rec-cats{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}.rec-cats::-webkit-scrollbar{display:none}
.rec-cat{flex-shrink:0;height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.rec-cat.act{background:var(--green);border-color:var(--green);color:#fff}
/* kpi row */
.rec-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.rec-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px;text-align:center}
.rec-kpi-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.rec-kpi-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.05em}
/* recipe card */
.rec-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px;cursor:pointer;transition:background .12s;position:relative;overflow:hidden}
.rec-card:active{background:var(--bg3)}
.rec-card-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
.rec-emoji{font-size:28px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rec-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);line-height:1.2}
.rec-cat-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.rec-fc-badge{position:absolute;top:14px;right:14px;height:24px;padding:0 10px;border-radius:12px;font-size:11px;font-family:var(--font-h);font-weight:700;display:flex;align-items:center}
.rec-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.rec-metric{background:var(--bg3);border-radius:9px;padding:8px;text-align:center}
.rec-metric-val{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.rec-metric-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.04em}
/* alert strip */
.rec-alert{margin-top:10px;padding:8px 10px;border-radius:9px;font-size:11px;font-family:var(--font-b);line-height:1.5}
.rec-alert--amber{background:rgba(239,159,39,.08);color:var(--amber)}
/* detail sheet */
.rec-sheet-ov{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.rec-sheet-ov.open{display:flex;animation:rsOvIn .2s ease}
@keyframes rsOvIn{from{opacity:0}to{opacity:1}}
.rec-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);max-height:85vh;display:flex;flex-direction:column;animation:rsSlide .3s cubic-bezier(.22,1,.36,1)}
@keyframes rsSlide{from{transform:translateY(100%)}to{transform:none}}
.rec-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 12px;flex-shrink:0}
.rec-sheet-scroll{overflow-y:auto;flex:1;padding:0 0 32px}.rec-sheet-scroll::-webkit-scrollbar{width:0}
/* tabs */
.rec-tabs{display:flex;gap:2px;background:var(--bg3);border-radius:11px;padding:3px;margin:0 16px 14px;flex-shrink:0}
.rec-tab{flex:1;height:30px;border:none;border-radius:9px;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.rec-tab.act{background:var(--bg2);color:var(--text0)}
/* ingredient row */
.rec-ing-row{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid var(--border)}
.rec-ing-row:last-child{border-bottom:none}
/* empty */
.rec-empty{padding:60px 30px;text-align:center}
.rec-empty-icon{font-size:48px;margin-bottom:16px}
.rec-empty-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:8px}
.rec-empty-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6}
/* skel */
.rec-skel{background:var(--bg2);border-radius:14px;animation:rSkel 1.2s ease-in-out infinite;margin:0 14px 8px}
@keyframes rSkel{0%,100%{opacity:.5}50%{opacity:1}}
</style>`;

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadRecipes() {
  _loading = true;
  render();
  try {
    const res  = await fetch(`${API}/api/recipes?venueId=${venueId()}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      const data = await res.json();
      _recipes = data.recipes || [];
    } else {
      _recipes = [];
    }
  } catch (e) {
    _recipes = [];
  }
  _loading = false;
  render();
}

/* ════════════════════════
   FC COLOR
════════════════════════ */
function fcColor(fc) {
  return fc > 25 ? 'var(--red)' : fc > 20 ? 'var(--amber)' : 'var(--green)';
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr = state.role === 'manager';

  if (_loading) {
    return `${CSS}
    <div class="rec-wrap">
      <div class="rec-topbar">
        <div><div class="rec-title">Рецепти · Фудкост</div></div>
      </div>
      <div class="rec-scroll" style="padding-top:8px">
        ${[1,2,3].map(() => `<div class="rec-skel" style="height:110px"></div>`).join('')}
      </div>
    </div>`;
  }

  // Фільтрація
  const cats = ['all', ...new Set(_recipes.map(r => r.category).filter(Boolean))];
  const filtered = _recipes.filter(r => {
    const matchSearch = !_search || r.name.toLowerCase().includes(_search.toLowerCase());
    const matchCat    = _catFilter === 'all' || r.category === _catFilter;
    return matchSearch && matchCat;
  });

  // KPI
  const avgFc     = _recipes.length ? (_recipes.reduce((a, r) => a + (r.foodCost || 0), 0) / _recipes.length).toFixed(1) : '—';
  const alerts    = _recipes.filter(r => r.foodCost > 25).length;
  const avgPrice  = _recipes.length ? Math.round(_recipes.reduce((a, r) => a + (r.sellingPrice || 0), 0) / _recipes.length) : 0;

  const detailRec = _selected ? _recipes.find(r => r.id === _selected) : null;

  return `
${CSS}
<div class="rec-wrap">
  <div class="rec-topbar">
    <div style="flex:1">
      <div class="rec-title">Рецепти · Фудкост</div>
      <div class="rec-sub">${_recipes.length} позицій · заклад ${state.venue || ''}</div>
    </div>
    ${isMgr ? `<button class="rec-add-btn" onclick="window.__rec.addRecipe()">+ Рецепт</button>` : ''}
  </div>

  <div class="rec-scroll">
    <!-- Search -->
    <div class="rec-search-wrap">
      <input class="rec-search" placeholder="🔍 Пошук рецепту..." value="${_search}"
        oninput="window.__rec.setSearch(this.value)"/>
    </div>

    ${_recipes.length === 0 ? `
    <!-- Empty state -->
    <div class="rec-empty">
      <div class="rec-empty-icon">🍸</div>
      <div class="rec-empty-title">Рецептів ще немає</div>
      <div class="rec-empty-sub">${isMgr ? 'Натисніть "+ Рецепт" щоб додати перший рецепт і розпочати відстеження фудкосту' : 'Менеджер ще не додав рецепти для цього закладу'}</div>
    </div>` : `

    <!-- KPI -->
    <div class="rec-kpi-row">
      <div class="rec-kpi">
        <div class="rec-kpi-val" style="color:${fcColor(parseFloat(avgFc))}">${avgFc}%</div>
        <div class="rec-kpi-lbl">Середній FC</div>
      </div>
      <div class="rec-kpi">
        <div class="rec-kpi-val" style="color:${alerts > 0 ? 'var(--red)' : 'var(--green)'}">${alerts}</div>
        <div class="rec-kpi-lbl">FC > 25%</div>
      </div>
      <div class="rec-kpi">
        <div class="rec-kpi-val">${avgPrice} ₴</div>
        <div class="rec-kpi-lbl">Сер. ціна</div>
      </div>
    </div>

    <!-- Categories -->
    <div class="rec-cats">
      ${cats.map(c => `
      <div class="rec-cat ${_catFilter === c ? 'act' : ''}"
        onclick="window.__rec.setCat('${c}')">
        ${c === 'all' ? `Всі (${_recipes.length})` : c}
      </div>`).join('')}
    </div>

    <!-- Recipe cards -->
    ${filtered.length === 0 ? `
    <div style="padding:40px;text-align:center;color:var(--text2);font-size:13px;font-family:var(--font-b)">
      Нічого не знайдено
    </div>` : filtered.map(r => {
      const fc      = r.foodCost || 0;
      const color   = fcColor(fc);
      const hasAlert = fc > 25;
      return `
    <div class="rec-card" onclick="window.__rec.openDetail('${r.id}')">
      <div class="rec-card-top">
        <div class="rec-emoji">${r.emoji || '🍸'}</div>
        <div style="flex:1;min-width:0">
          <div class="rec-name">${r.name}</div>
          <div class="rec-cat-lbl">${r.category || '—'}</div>
        </div>
      </div>
      <div class="rec-fc-badge" style="background:${color}22;color:${color}">FC ${fc.toFixed(1)}%</div>
      <div class="rec-metrics">
        <div class="rec-metric">
          <div class="rec-metric-val">${r.sellingPrice ? r.sellingPrice + ' ₴' : '—'}</div>
          <div class="rec-metric-lbl">Ціна</div>
        </div>
        <div class="rec-metric">
          <div class="rec-metric-val">${r.costPrice ? r.costPrice.toFixed(1) + ' ₴' : '—'}</div>
          <div class="rec-metric-lbl">Собівартість</div>
        </div>
        <div class="rec-metric">
          <div class="rec-metric-val" style="color:${color}">${fc.toFixed(1)}%</div>
          <div class="rec-metric-lbl">FC</div>
        </div>
      </div>
      ${hasAlert ? `
      <div class="rec-alert rec-alert--amber">
        ⚠ Фудкост вище норми (>25%) — перевірте ціну продажу
      </div>` : ''}
    </div>`;
    }).join('')}
    `}

    <div style="height:20px"></div>
  </div><!-- rec-scroll -->

  <!-- Detail sheet -->
  <div class="rec-sheet-ov ${_selected ? 'open' : ''}" onclick="window.__rec.closeDetail(event)">
    <div class="rec-sheet" onclick="event.stopPropagation()">
      <div class="rec-sheet-handle"></div>
      ${detailRec ? `
      <!-- Sheet header -->
      <div style="padding:0 16px 12px;display:flex;align-items:center;gap:12px;flex-shrink:0;border-bottom:0.5px solid var(--border)">
        <div style="font-size:32px">${detailRec.emoji || '🍸'}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0)">${detailRec.name}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${detailRec.category || '—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-h);font-size:18px;font-weight:700;color:${fcColor(detailRec.foodCost||0)}">FC ${(detailRec.foodCost||0).toFixed(1)}%</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${detailRec.sellingPrice || '—'} ₴</div>
        </div>
      </div>
      <!-- Tabs -->
      <div class="rec-tabs" style="margin-top:12px">
        <button class="rec-tab ${_tab==='ingredients'?'act':''}" onclick="window.__rec.setTab('ingredients')">Інгредієнти</button>
        <button class="rec-tab ${_tab==='tech'?'act':''}"        onclick="window.__rec.setTab('tech')">Технологія</button>
      </div>
      <div class="rec-sheet-scroll">
        ${_tab === 'ingredients' ? `
        <!-- Ingredients -->
        ${(detailRec.ingredients || []).length === 0 ?
          `<div style="padding:30px;text-align:center;color:var(--text2);font-size:13px;font-family:var(--font-b)">Інгредієнти не вказані</div>` :
          (detailRec.ingredients || []).map(ing => `
          <div class="rec-ing-row">
            <div style="flex:1">
              <div style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${ing.product?.name || ing.name || '—'}</div>
              <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${ing.quantity} ${ing.product?.unit || ''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-family:var(--font-h);font-weight:600;color:var(--text0)">
                ${ing.cost ? ing.cost.toFixed(2) + ' ₴' : '—'}
              </div>
            </div>
          </div>`).join('')
        }
        <!-- Total -->
        <div style="padding:12px 16px;background:var(--bg3);display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Собівартість</div>
          <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">${detailRec.costPrice?.toFixed(2) || '—'} ₴</div>
        </div>` : `
        <!-- Tech card -->
        <div style="padding:16px">
          ${detailRec.techCard ? `
          <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.7;white-space:pre-wrap">${detailRec.techCard}</div>` :
          `<div style="padding:30px;text-align:center;color:var(--text2);font-size:13px;font-family:var(--font-b)">Технологічна карта не вказана</div>`}
        </div>`}
      </div>` : ''}
    </div>
  </div>

</div>`;
}

function render() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function openDetail(id) { _selected = id; _tab = 'ingredients'; render(); }
function closeDetail(e) {
  if (!e || e.target.classList.contains('rec-sheet-ov')) { _selected = null; render(); }
}
function setTab(t) { _tab = t; render(); }
function setSearch(v) { _search = v; render(); }
function setCat(c) { _catFilter = c; render(); }
function addRecipe() {
  alert('Функція додавання рецептів — в розробці');
}

export default {
  render() {
    _loading  = true;
    _selected = null;
    _search   = '';
    _catFilter = 'all';
    return buildHTML();
  },
  init() {
    window.__rec = { openDetail, closeDetail, setTab, setSearch, setCat, addRecipe };
    loadRecipes();
  },
};
