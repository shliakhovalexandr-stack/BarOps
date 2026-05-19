/* ============================================================
   BarOps — pages/analytics.js
   Аналітика: операційні дані + FC Cockpit
   ============================================================ */

import { state } from '../shared/app.js';

const API     = 'https://barops-backend-production.up.railway.app';
const FC_MAX  = 30;   // небезпечний FC %
const FC_WARN = 25;   // попереджувальний FC %
const FC_TARGET = 28; // цільовий FC для оптимізації ціни

let _venues      = [];
let _dishes      = [];
let _loading     = true;
let _fcLoading   = true;
let _venueId     = null;
let _groupFilter   = new Set();
let _ignoredDishes = new Set(JSON.parse(localStorage.getItem('barops_an_idish') || '[]'));
let _ignoredCats   = new Set(JSON.parse(localStorage.getItem('barops_an_icat')  || '[]'));

function tok() { return localStorage.getItem('barops_token') || ''; }
const VENUE_COLORS = ['var(--green)', 'var(--amber)', 'var(--purple)', 'var(--red)', '#4FA8E8'];

// ── FC computation ────────────────────────────────────────────
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function enrichWithFC(dishes) {
  return dishes.map(d => {
    const cost  = d.costPrice   || 0;
    const price = d.sellingPrice|| 0;
    const fc    = (cost > 0 && price > 0) ? (cost / price) * 100 : null;
    const margin = (price > 0 && cost > 0) ? price - cost : null;
    return { ...d, fc, margin };
  });
}

function computeFC(dishes) {
  const all     = enrichWithFC(dishes);
  const withFC  = all.filter(d => d.fc !== null);
  const noPrice = dishes.filter(d => !d.sellingPrice || d.sellingPrice === 0);
  const noCost  = dishes.filter(d => !d.costPrice  || d.costPrice  === 0);

  const danger  = withFC.filter(d => d.fc > FC_MAX);
  const warning = withFC.filter(d => d.fc > FC_WARN && d.fc <= FC_MAX);
  const good    = withFC.filter(d => d.fc <= FC_WARN && d.fc > 0);
  const avgFC   = avg(withFC.map(d => d.fc));

  // Category breakdown
  const byCat = {};
  for (const d of withFC) {
    const cat = d.category || 'Без категорії';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(d);
  }

  return { all, withFC, noPrice, noCost, danger, warning, good, avgFC, byCat };
}

function buildInsights(fc) {
  const { withFC, byCat, danger, noPrice, noCost, avgFC } = fc;
  const insights = [];

  const catStats = Object.entries(byCat)
    .map(([name, dishes]) => ({
      name,
      count:  dishes.length,
      avgFC:  avg(dishes.map(d => d.fc)),
      avgMrg: avg(dishes.map(d => d.margin)),
    }))
    .filter(c => c.count >= 2 && !_ignoredCats.has(c.name));

  const actionableDanger = danger.filter(d => !_ignoredDishes.has(String(d.id)));
  const actionableWithFC = withFC.filter(d => !_ignoredDishes.has(String(d.id)));

  // 1. Найнебезпечніша категорія
  const worstCat = [...catStats].sort((a, b) => b.avgFC - a.avgFC)[0];
  if (worstCat && worstCat.avgFC > FC_MAX) {
    insights.push({
      sev: 'danger', icon: '🔴',
      title: `"${worstCat.name}" — сер. FC ${worstCat.avgFC.toFixed(1)}%`,
      body: `${worstCat.count} страв перевищують норму ${FC_MAX}%.`,
      action: 'Переглянути ціни або рецептуру категорії',
      ignoreType: 'cat', ignoreId: worstCat.name,
    });
  }

  // 2. Найгірший FC — конкретна страва
  const worstDish = [...actionableDanger].sort((a, b) => b.fc - a.fc)[0];
  if (worstDish) {
    const recPrice = (worstDish.costPrice / (FC_TARGET / 100)).toFixed(0);
    insights.push({
      sev: 'danger', icon: '⚠️',
      title: `"${worstDish.name}" — FC ${worstDish.fc.toFixed(1)}%`,
      body: `Ціна ${worstDish.sellingPrice} ₴, собівартість ${worstDish.costPrice?.toFixed(2)} ₴.`,
      action: `Рекомендована ціна для FC ${FC_TARGET}%: ${recPrice} ₴`,
      ignoreType: 'dish', ignoreId: worstDish.id,
    });
  }

  // 3. Найбільша маржа — можливість
  const bestMrg = [...actionableWithFC].sort((a, b) => b.margin - a.margin)[0];
  if (bestMrg && bestMrg.margin > 0) {
    insights.push({
      sev: 'good', icon: '💚',
      title: `"${bestMrg.name}" — маржа ${bestMrg.margin.toFixed(0)} ₴`,
      body: `FC ${bestMrg.fc.toFixed(1)}% · Ціна ${bestMrg.sellingPrice} ₴.`,
      action: 'Активно просувати, виділити в меню',
      ignoreType: 'dish', ignoreId: bestMrg.id,
    });
  }

  // 4. Найкраща категорія за маржею
  const bestCat = [...catStats].sort((a, b) => b.avgMrg - a.avgMrg)[0];
  if (bestCat && bestCat.avgMrg > 0 && bestCat !== worstCat) {
    insights.push({
      sev: 'good', icon: '📈',
      title: `"${bestCat.name}" — найвища маржа`,
      body: `Сер. маржа ${bestCat.avgMrg.toFixed(0)} ₴, сер. FC ${bestCat.avgFC.toFixed(1)}%.`,
      action: 'Збільшити частку у продажах та в пропозиціях',
      ignoreType: 'cat', ignoreId: bestCat.name,
    });
  }

  // 5. Без ціни
  if (noPrice.length > 0) {
    insights.push({
      sev: 'warning', icon: '🟡',
      title: `${noPrice.length} страв без ціни`,
      body: 'Фудкост неможливо розрахувати — ціна не встановлена в Syrve.',
      action: 'Заповнити ціни у номенклатурі Syrve',
    });
  }

  // 6. Без собівартості
  if (noCost.length > withFC.length * 0.3) {
    insights.push({
      sev: 'warning', icon: '🟡',
      title: `${noCost.length} страв без собівартості`,
      body: 'ТТК відсутні або не завантажені — FC неможливо порахувати.',
      action: 'Заповнити технологічні карти у Syrve',
    });
  }

  return insights.slice(0, 5);
}

// ── CSS ───────────────────────────────────────────────────────
const CSS = `<style id="an-css">
.an-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.an-scroll{overflow-y:auto;flex:1}.an-scroll::-webkit-scrollbar{width:0}
.an-topbar{display:flex;align-items:center;gap:10px;padding:8px 16px 12px;flex-shrink:0}
.an-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1;letter-spacing:-.01em}
.an-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.an-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b)}
.an-total{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 4px}
.an-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden}
.an-kpi-val{font-family:var(--font-h);font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.an-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.an-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.an-kpi-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.an-kpi-fill{height:100%;border-radius:2px}
.an-venue-list{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.an-venue-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.an-vc-hdr{padding:13px 14px;display:flex;align-items:center;gap:10px;border-bottom:0.5px solid var(--border)}
.an-vc-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.an-vc-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);flex:1}
.an-vc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.an-vs{padding:10px 8px;text-align:center;border-right:0.5px solid var(--border)}
.an-vs:last-child{border-right:none}
.an-vs-val{font-family:var(--font-h);font-size:15px;font-weight:700}
.an-vs-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.04em;line-height:1.3}
.an-cmp{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.an-cmp-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:10px 12px;border-bottom:0.5px solid var(--border);gap:4px}
.an-cmp-row:last-child{border-bottom:none}
.an-cmp-row.hdr{background:var(--bg3)}
.an-cmp-cell{font-size:11px;font-family:var(--font-b);color:var(--text2)}
.an-cmp-cell.name{color:var(--text1);font-weight:500}
.an-cmp-cell.val{color:var(--text0);font-family:var(--font-h);font-weight:600;text-align:right}
.an-cmp-cell.hdr{color:var(--text2);font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:right}
.an-cmp-cell.hdr:first-child{text-align:left}
.an-empty{padding:60px 30px;text-align:center}
.an-empty-icon{font-size:48px;margin-bottom:16px}
.an-empty-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:8px}
.an-empty-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6}
.an-skel{background:var(--bg2);border-radius:14px;animation:aSkel 1.2s ease-in-out infinite;margin:0 14px 8px}
@keyframes aSkel{0%,100%{opacity:.5}50%{opacity:1}}

/* FC Cockpit */
.an-fc-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 4px}
.an-fc-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;padding:12px 14px}
.an-fc-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:800;line-height:1;letter-spacing:-.02em}
.an-fc-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
.an-fc-kpi-sub{font-size:10px;font-family:var(--font-b);margin-top:2px}

/* Insights */
.an-insights{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.an-insight{border-radius:13px;padding:11px 13px;display:flex;gap:10px;align-items:flex-start}
.an-insight.danger{background:rgba(220,60,50,.1);border:0.5px solid rgba(220,60,50,.25)}
.an-insight.warning{background:rgba(200,150,30,.1);border:0.5px solid rgba(200,150,30,.25)}
.an-insight.good{background:rgba(40,180,100,.08);border:0.5px solid rgba(40,180,100,.2)}
.an-insight-icon{font-size:16px;line-height:1;flex-shrink:0;margin-top:1px}
.an-insight-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);line-height:1.3}
.an-insight-body{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.4}
.an-insight-action{font-size:10px;font-family:var(--font-b);margin-top:4px;font-style:italic}
.an-insight.danger .an-insight-action{color:var(--red)}
.an-insight.warning .an-insight-action{color:var(--amber)}
.an-insight.good .an-insight-action{color:var(--green)}

/* Category table */
.an-cat-table{margin:0 14px;border-radius:13px;overflow:hidden;border:0.5px solid var(--border)}
.an-cat-row{display:grid;grid-template-columns:1fr 54px 54px 58px;padding:9px 12px;border-bottom:0.5px solid var(--border);align-items:center;gap:4px}
.an-cat-row:last-child{border-bottom:none}
.an-cat-row.head{background:var(--bg3)}
.an-cat-name{font-size:12px;font-family:var(--font-b);color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.an-cat-row.head .an-cat-name{font-size:9px;color:var(--text2);text-transform:uppercase;letter-spacing:.06em}
.an-cat-num{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right}
.an-cat-row.head .an-cat-num{font-size:9px;font-family:var(--font-b);font-weight:400;color:var(--text2);text-transform:uppercase;letter-spacing:.06em}
.an-fc-pill{border-radius:10px;padding:2px 7px;font-size:11px;font-family:var(--font-h);font-weight:700;display:inline-block}

/* Top lists */
.an-toplist{margin:0 14px;border-radius:13px;overflow:hidden;border:0.5px solid var(--border)}
.an-tl-row{display:grid;padding:9px 12px;border-bottom:0.5px solid var(--border);gap:4px;align-items:center}
.an-tl-row.head{background:var(--bg3)}
.an-tl-row:last-child{border-bottom:none}
.an-tl-name{font-size:12px;font-family:var(--font-b);color:var(--text1);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-tl-cat{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.an-tl-val{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right;flex-shrink:0}
.an-tl-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right;margin-top:1px}

/* Optimize */
.an-opt-row{display:grid;grid-template-columns:1fr auto;padding:9px 12px;border-bottom:0.5px solid var(--border);gap:8px;align-items:center}
.an-opt-row:last-child{border-bottom:none}
.an-opt-arrow{font-size:11px;color:var(--text2);font-family:var(--font-b);margin:2px 0}
.an-opt-badge{background:var(--green-bg,#1a3320);border:0.5px solid var(--green-border);border-radius:8px;padding:3px 8px;font-size:12px;font-family:var(--font-h);font-weight:700;color:var(--green);white-space:nowrap}

/* Filter chips */
.an-filter-bar{padding:0 14px 8px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.an-filter-row{display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:2px}
.an-filter-row::-webkit-scrollbar{height:0}
.an-filter-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);white-space:nowrap;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}
.an-chip{background:var(--bg2);border:0.5px solid var(--border2);border-radius:20px;padding:5px 13px;font-size:12px;font-family:var(--font-b);color:var(--text1);cursor:pointer;white-space:nowrap;flex-shrink:0}
.an-chip.active{background:var(--green);border-color:var(--green);color:#fff}
.an-chip-clr{background:none;border:0.5px solid var(--border2);border-radius:20px;padding:5px 10px;font-size:11px;color:var(--text2);cursor:pointer;white-space:nowrap;flex-shrink:0}

/* Swipe-to-dismiss */
.an-swipe-wrap{overflow:hidden}
.an-swipe-track{display:flex;transition:transform .18s ease;will-change:transform}
.an-swipe-con{flex:1;min-width:100%}
.an-swipe-del{width:90px;flex-shrink:0;background:var(--red,#dc3c32);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-direction:column;gap:2px}
.an-swipe-del span{font-size:11px;color:#fff;font-family:var(--font-b);font-weight:600;text-align:center;line-height:1.3;padding:0 6px}
</style>`;

// ── Filter bar ────────────────────────────────────────────────
function buildFilterBar() {
  const rows = [];

  if (_venues.length > 1) {
    const chips = _venues.map(v => {
      const vid   = v.id || v.venueId || v._id || '';
      const label = v.name.length > 16 ? v.name.slice(0, 16) + '…' : v.name;
      return `<button class="an-chip${vid && _venueId === vid ? ' active' : ''}" onclick="window.__an.setVenue('${vid}','${v.name.replace(/'/g, "\\'")}')">
        ${label}
      </button>`;
    }).join('');
    rows.push(`<div class="an-filter-row">${chips}</div>`);
  }

  if (!_fcLoading && _dishes.length > 0) {
    const groups = [...new Set(_dishes.map(d => d.store).filter(Boolean))].sort();
    if (groups.length > 1) {
      const chips = groups.map(g =>
        `<button class="an-chip${_groupFilter.has(g) ? ' active' : ''}" onclick="window.__an.toggleGroup('${g.replace(/'/g, "\\'")}')">
          ${g}
        </button>`
      ).join('');
      const clrBtn = _groupFilter.size > 0
        ? `<button class="an-chip-clr" onclick="window.__an.clearGroups()">✕</button>` : '';
      rows.push(`<div class="an-filter-row"><span class="an-filter-lbl">Група:</span>${chips}${clrBtn}</div>`);
    }
  }

  return rows.length ? `<div class="an-filter-bar">${rows.join('')}</div>` : '';
}

// ── Data loading ──────────────────────────────────────────────
async function loadData() {
  _loading = true;
  _fcLoading = true;
  _venueId = state.venueId || localStorage.getItem('barops_venueId');
  render();

  const [opsRes, dishRes] = await Promise.allSettled([
    fetch(`${API}/api/stats/all-venues`,              { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()).catch(() => ({})),
    _venueId
      ? fetch(`${API}/api/pos/dishes/${_venueId}`,    { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()).catch(() => ({}))
      : Promise.resolve({}),
  ]);

  if (opsRes.status === 'fulfilled' && opsRes.value.venues) {
    _venues = opsRes.value.venues;
  }
  _loading = false;
  render();

  if (dishRes.status === 'fulfilled' && dishRes.value.dishes?.length) {
    _dishes = dishRes.value.dishes;
  }
  _fcLoading = false;
  render();
}

// ── Build helpers ─────────────────────────────────────────────
function fcBg(fc)    { return fc > FC_MAX ? 'rgba(220,60,50,.15)' : fc > FC_WARN ? 'rgba(200,150,30,.15)' : 'rgba(40,180,100,.12)'; }
function fcColor(fc) { return fc > FC_MAX ? 'var(--red)' : fc > FC_WARN ? 'var(--amber)' : 'var(--green)'; }
function fmtFC(fc)   { return fc !== null ? fc.toFixed(1).replace('.', ',') + '%' : '—'; }
function fmtMrg(m)   { return m !== null ? m.toFixed(0) + ' ₴' : '—'; }

function buildFCCockpit() {
  if (_fcLoading) {
    return `
    <div class="an-sec">FC Аналітика</div>
    <div style="padding:0 14px 10px">${[1,2].map(()=>`<div class="an-skel" style="height:60px;margin-bottom:8px"></div>`).join('')}</div>`;
  }
  if (_dishes.length === 0) {
    return `
    <div class="an-sec">FC Аналітика</div>
    <div style="padding:0 14px 16px;text-align:center">
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">Страви не завантажені — перейдіть до Фудкост для завантаження</div>
    </div>`;
  }

  const dishes = _groupFilter.size > 0 ? _dishes.filter(d => _groupFilter.has(d.store)) : _dishes;
  const fc = computeFC(dishes);
  const { withFC, noPrice, noCost, danger, warning, good, avgFC, byCat } = fc;
  const insights = buildInsights(fc);

  // Category table — sort by avg FC desc
  const catRows = Object.entries(byCat)
    .map(([name, dishes]) => ({
      name,
      count:  dishes.length,
      avgFC:  avg(dishes.map(d => d.fc)),
      avgMrg: avg(dishes.map(d => d.margin).filter(m => m > 0)),
    }))
    .sort((a, b) => b.avgFC - a.avgFC)
    .slice(0, 8);

  // Top 5 by margin ₴
  const topMargin = [...withFC]
    .filter(d => d.margin > 0 && !_ignoredDishes.has(String(d.id)))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  // Top 5 worst FC
  const topDanger = [...danger]
    .filter(d => !_ignoredDishes.has(String(d.id)))
    .sort((a, b) => b.fc - a.fc)
    .slice(0, 5);

  // Price optimizer — dishes where current price is too low for target FC
  const optimizer = [...withFC]
    .filter(d => d.fc > FC_TARGET && !_ignoredDishes.has(String(d.id)))
    .sort((a, b) => b.fc - a.fc)
    .slice(0, 5)
    .map(d => ({
      ...d,
      recPrice: Math.ceil(d.costPrice / (FC_TARGET / 100)),
      diff:     Math.ceil(d.costPrice / (FC_TARGET / 100)) - d.sellingPrice,
    }));

  return `
  <!-- FC KPIs -->
  <div class="an-sec">FC Аналітика · ${state.venue || 'Заклад'}</div>
  <div class="an-fc-kpis">
    <div class="an-fc-kpi">
      <div class="an-fc-kpi-val" style="color:${fcColor(avgFC)}">${fmtFC(avgFC)}</div>
      <div class="an-fc-kpi-lbl">Середній FC</div>
      <div class="an-fc-kpi-sub" style="color:${fcColor(avgFC)}">${avgFC > FC_MAX ? 'Перевищення норми' : avgFC > FC_WARN ? 'Увага — близько до межі' : 'В нормі'}</div>
    </div>
    <div class="an-fc-kpi">
      <div class="an-fc-kpi-val" style="color:${danger.length > 0 ? 'var(--red)' : 'var(--green)'}">${danger.length}</div>
      <div class="an-fc-kpi-lbl">Небезпечних (>${FC_MAX}%)</div>
      <div class="an-fc-kpi-sub" style="color:var(--text2)">${warning.length} на межі · ${good.length} ок</div>
    </div>
    <div class="an-fc-kpi">
      <div class="an-fc-kpi-val">${withFC.length}</div>
      <div class="an-fc-kpi-lbl">Страв з FC</div>
      <div class="an-fc-kpi-sub" style="color:var(--text2)">з ${dishes.length}${_groupFilter.size > 0 ? ' у групі' : ' у меню'}</div>
    </div>
    <div class="an-fc-kpi">
      <div class="an-fc-kpi-val" style="color:${noPrice.length > 0 ? 'var(--amber)' : 'var(--green)'}">${noPrice.length}</div>
      <div class="an-fc-kpi-lbl">Без ціни</div>
      <div class="an-fc-kpi-sub" style="color:var(--text2)">${noCost.length} без собівартості</div>
    </div>
  </div>

  <!-- Smart Insights -->
  ${insights.length > 0 ? `
  <div class="an-sec" style="display:flex;align-items:center">
    <span style="flex:1">Інсайти менеджера</span>
    ${(_ignoredDishes.size + _ignoredCats.size) > 0 ? `<span onclick="window.__an.resetIgnored()" style="font-size:10px;color:var(--text2);font-family:var(--font-b);cursor:pointer;padding-right:18px;text-decoration:underline">Скинути ігнор (${_ignoredDishes.size + _ignoredCats.size})</span>` : ''}
  </div>
  <div class="an-insights">
    ${insights.map(ins => {
      const body = `
        <div class="an-insight-icon">${ins.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="an-insight-title">${ins.title}</div>
          <div class="an-insight-body">${ins.body}</div>
          <div class="an-insight-action">→ ${ins.action}</div>
        </div>`;
      if (!ins.ignoreType) return `<div class="an-insight ${ins.sev}">${body}</div>`;
      const sid = (ins.ignoreId + '').replace(/'/g, "\\'");
      return `
      <div class="an-swipe-wrap" style="border-radius:13px">
        <div class="an-swipe-track">
          <div class="an-swipe-con an-insight ${ins.sev}" style="border-radius:0;margin:0">${body}</div>
          <div class="an-swipe-del" onclick="window.__an.ignore('${ins.ignoreType}','${sid}')"><span>Ігно-<br>рувати</span></div>
        </div>
      </div>`;
    }).join('')}
  </div>` : ''}

  <!-- Category Performance -->
  ${catRows.length > 0 ? `
  <div class="an-sec">Категорії за FC</div>
  <div class="an-cat-table">
    <div class="an-cat-row head">
      <div class="an-cat-name">Категорія</div>
      <div class="an-cat-num" style="font-size:9px;font-family:var(--font-b);font-weight:400;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Страв</div>
      <div class="an-cat-num" style="font-size:9px;font-family:var(--font-b);font-weight:400;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Сер. FC</div>
      <div class="an-cat-num" style="font-size:9px;font-family:var(--font-b);font-weight:400;color:var(--text2);text-transform:uppercase;letter-spacing:.06em">Маржа ₴</div>
    </div>
    ${catRows.map(c => `
    <div class="an-cat-row" style="background:var(--bg2)">
      <div class="an-cat-name">${c.name}</div>
      <div class="an-cat-num" style="color:var(--text2)">${c.count}</div>
      <div class="an-cat-num" style="color:${fcColor(c.avgFC)}">${fmtFC(c.avgFC)}</div>
      <div class="an-cat-num" style="color:var(--text1)">${c.avgMrg > 0 ? c.avgMrg.toFixed(0) + ' ₴' : '—'}</div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Best Margin -->
  ${topMargin.length > 0 ? `
  <div class="an-sec">Топ — найвища маржа ₴</div>
  <div class="an-toplist">
    ${topMargin.map((d, i) => `
    <div class="an-swipe-wrap" style="border-bottom:0.5px solid var(--border)">
      <div class="an-swipe-track">
        <div class="an-swipe-con an-tl-row" style="grid-template-columns:auto 1fr auto;background:var(--bg2);border-bottom:none">
          <div style="font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text2);width:20px">${['🥇','🥈','🥉','4.','5.'][i]}</div>
          <div style="min-width:0">
            <div class="an-tl-name">${d.name}</div>
            <div class="an-tl-cat">${d.category || '—'} · FC ${fmtFC(d.fc)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="an-tl-val" style="color:var(--green)">${fmtMrg(d.margin)}</div>
            <div class="an-tl-sub">${d.sellingPrice} ₴ ціна</div>
          </div>
        </div>
        <div class="an-swipe-del" onclick="window.__an.ignore('dish','${d.id}')"><span>Ігно-<br>рувати</span></div>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Danger Zone -->
  ${topDanger.length > 0 ? `
  <div class="an-sec">Небезпечний FC — потрібна дія</div>
  <div class="an-toplist">
    ${topDanger.map(d => `
    <div class="an-swipe-wrap" style="border-bottom:0.5px solid var(--border)">
      <div class="an-swipe-track">
        <div class="an-swipe-con an-tl-row" style="grid-template-columns:1fr auto;background:var(--bg2);border-bottom:none">
          <div style="min-width:0">
            <div class="an-tl-name">${d.name}</div>
            <div class="an-tl-cat">${d.category || '—'} · Собівартість ${d.costPrice?.toFixed(2)} ₴</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="an-tl-val" style="color:var(--red)">${fmtFC(d.fc)}</div>
            <div class="an-tl-sub">${d.sellingPrice} ₴ зараз</div>
          </div>
        </div>
        <div class="an-swipe-del" onclick="window.__an.ignore('dish','${d.id}')"><span>Ігно-<br>рувати</span></div>
      </div>
    </div>`).join('')}
  </div>` : ''}

  <!-- Price Optimizer -->
  ${optimizer.length > 0 ? `
  <div class="an-sec">Оптимізатор цін — ціль FC ${FC_TARGET}%</div>
  <div class="an-toplist">
    ${optimizer.map(d => `
    <div class="an-swipe-wrap" style="border-bottom:0.5px solid var(--border)">
      <div class="an-swipe-track">
        <div class="an-swipe-con an-opt-row" style="background:var(--bg2);border-bottom:none">
          <div style="min-width:0">
            <div class="an-tl-name">${d.name}</div>
            <div class="an-opt-arrow">${d.sellingPrice} ₴ → потрібно +${d.diff} ₴</div>
          </div>
          <div class="an-opt-badge">${d.recPrice} ₴</div>
        </div>
        <div class="an-swipe-del" onclick="window.__an.ignore('dish','${d.id}')"><span>Ігно-<br>рувати</span></div>
      </div>
    </div>`).join('')}
  </div>` : ''}`;
}

// ── Main HTML ─────────────────────────────────────────────────
function buildHTML() {
  if (_loading) {
    return `${CSS}
    <div class="an-wrap">
      <div class="an-topbar"><div><div class="an-title">Аналітика</div></div></div>
      <div class="an-scroll" style="padding-top:8px">
        ${[1,2,3].map(()=>`<div class="an-skel" style="height:120px"></div>`).join('')}
      </div>
    </div>`;
  }

  if (_venues.length === 0) {
    return `${CSS}
    <div class="an-wrap">
      <div class="an-topbar">
        <div onclick="window.__barops.openDrawer()"
          style="width:36px;height:36px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
          <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
          <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
          <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
        </div>
        <div><div class="an-title">Аналітика</div></div>
      </div>
      <div class="an-empty">
        <div class="an-empty-icon">📊</div>
        <div class="an-empty-title">Немає даних</div>
        <div class="an-empty-sub">Додайте заклад та почніть роботу — статистика з'явиться тут автоматично</div>
      </div>
    </div>`;
  }

  const totalWriteoffs = _venues.reduce((a, v) => a + (v.writeoffs || 0), 0);
  const totalInvoices  = _venues.reduce((a, v) => a + (v.invoiceCount || 0), 0);
  const totalInvAmount = _venues.reduce((a, v) => a + (v.invoiceTotal || 0), 0);
  const totalTeam      = _venues.reduce((a, v) => a + (v.teamCount || 0), 0);
  const totalCritical  = _venues.reduce((a, v) => a + (v.criticalCount || 0), 0);

  return `${CSS}
<div class="an-wrap">
  <div class="an-topbar">
    <div onclick="window.__barops.openDrawer()"
      style="width:36px;height:36px;border-radius:10px;background:var(--bg2);
             border:0.5px solid var(--border2);display:flex;flex-direction:column;
             align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
      <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
      <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
      <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
    </div>
    <div style="flex:1">
      <div class="an-title">Аналітика</div>
      <div class="an-sub">Всі заклади · ${_venues.length} локацій · сьогодні</div>
    </div>
    <div style="background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--green);font-family:var(--font-b)">${_venues.length} заклади</div>
  </div>

  ${buildFilterBar()}

  <div class="an-scroll">

    <!-- Operational KPIs -->
    <div class="an-sec">Операційно · сьогодні</div>
    <div class="an-total">
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--green)">${totalInvoices}</div>
        <div class="an-kpi-lbl">Накладних</div>
        <div class="an-kpi-sub">${Math.round(totalInvAmount).toLocaleString('uk-UA')} ₴</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalInvoices*10)}%;background:var(--green)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${totalWriteoffs>0?'var(--amber)':'var(--green)'}">${totalWriteoffs}</div>
        <div class="an-kpi-lbl">Списань</div>
        <div class="an-kpi-sub">всі заклади</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalWriteoffs*10)}%;background:var(--amber)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--teal)">${totalTeam}</div>
        <div class="an-kpi-lbl">Команда</div>
        <div class="an-kpi-sub">активних</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalTeam*10)}%;background:var(--teal)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${totalCritical>0?'var(--red)':'var(--green)'}">${totalCritical}</div>
        <div class="an-kpi-lbl">Алертів</div>
        <div class="an-kpi-sub">критичні залишки</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalCritical*20)}%;background:var(--red)"></div></div>
      </div>
    </div>

    <!-- FC Cockpit -->
    ${buildFCCockpit()}

    <!-- Venue comparison -->
    <div class="an-sec">Порівняння закладів</div>
    <div class="an-cmp">
      <div class="an-cmp-row hdr">
        <div class="an-cmp-cell hdr">Заклад</div>
        <div class="an-cmp-cell hdr">Накладні</div>
        <div class="an-cmp-cell hdr">Списання</div>
        <div class="an-cmp-cell hdr">Алерти</div>
      </div>
      ${_venues.map((v, i) => `
      <div class="an-cmp-row">
        <div class="an-cmp-cell name" style="display:flex;align-items:center;gap:5px">
          <div style="width:7px;height:7px;border-radius:50%;background:${VENUE_COLORS[i%VENUE_COLORS.length]};flex-shrink:0"></div>
          ${v.name.split(' ')[0]}
        </div>
        <div class="an-cmp-cell val">${v.invoiceCount || 0}</div>
        <div class="an-cmp-cell val" style="color:${(v.writeoffs||0)>0?'var(--amber)':'var(--green)'}">${v.writeoffs || 0}</div>
        <div class="an-cmp-cell val" style="color:${(v.criticalCount||0)>0?'var(--red)':'var(--green)'}">${v.criticalCount || 0}</div>
      </div>`).join('')}
    </div>

    <!-- Per venue cards -->
    <div class="an-sec">По кожному закладу</div>
    <div class="an-venue-list">
      ${_venues.map((v, i) => `
      <div class="an-venue-card">
        <div class="an-vc-hdr">
          <div class="an-vc-dot" style="background:${VENUE_COLORS[i%VENUE_COLORS.length]}"></div>
          <div style="flex:1">
            <div class="an-vc-name">${v.name}</div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${v.posType === 'syrve' ? '✓ Syrve' : 'Ручний режим'} · ${v.teamCount || 0} барм.</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">${Math.round(v.invoiceTotal||0).toLocaleString('uk-UA')} ₴</div>
            <div style="font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:1px">накладні сьогодні</div>
          </div>
        </div>
        <div class="an-vc-stats">
          <div class="an-vs">
            <div class="an-vs-val" style="color:var(--green)">${v.invoiceCount || 0}</div>
            <div class="an-vs-lbl">Накладних</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val" style="color:${(v.writeoffs||0)>0?'var(--amber)':'var(--green)'}">${v.writeoffs || 0}</div>
            <div class="an-vs-lbl">Списань</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val">${v.teamCount || 0}</div>
            <div class="an-vs-lbl">Команда</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val" style="color:${(v.criticalCount||0)>0?'var(--red)':'var(--green)'}">${v.criticalCount || 0}</div>
            <div class="an-vs-lbl">Алертів</div>
          </div>
        </div>
      </div>`).join('')}
    </div>

    <div style="height:24px"></div>
  </div>
</div>`;
}

let _openSwipeWrap = null;

function setupSwipe() {
  document.querySelectorAll('.an-swipe-wrap').forEach(wrap => {
    const track = wrap.querySelector('.an-swipe-track');
    if (!track) return;
    let startX = 0, startY = 0, dx = 0, swiping = false, opened = false;

    const close = () => {
      track.style.transform = '';
      opened = false;
      if (_openSwipeWrap === wrap) _openSwipeWrap = null;
    };
    const open = () => {
      if (_openSwipeWrap && _openSwipeWrap !== wrap) {
        const prev = _openSwipeWrap.querySelector('.an-swipe-track');
        if (prev) prev.style.transform = '';
      }
      track.style.transform = 'translateX(-90px)';
      opened = true;
      _openSwipeWrap = wrap;
    };

    track.addEventListener('touchstart', e => {
      if (opened) { close(); return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0; swiping = false;
    }, { passive: true });

    track.addEventListener('touchmove', e => {
      if (!swiping) {
        const ax = Math.abs(e.touches[0].clientX - startX);
        const ay = Math.abs(e.touches[0].clientY - startY);
        if (ax < 6 && ay < 6) return;
        if (ay > ax) return;
        swiping = true;
      }
      dx = e.touches[0].clientX - startX;
      if (dx < 0) track.style.transform = `translateX(${Math.max(-90, dx)}px)`;
    }, { passive: true });

    track.addEventListener('touchend', () => {
      if (!swiping) return;
      if (dx < -44) open(); else close();
    });
  });
}

function render() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
  _openSwipeWrap = null;
  requestAnimationFrame(setupSwipe);
  window.__an = {
    setVenue(id) {
      if (!id || id === _venueId) return;
      _venueId = id;
      _dishes = [];
      _fcLoading = true;
      _groupFilter.clear();
      render();
      fetch(`${API}/api/pos/dishes/${id}`, { headers: { Authorization: `Bearer ${tok()}` } })
        .then(r => r.json())
        .then(data => {
          if (data.dishes?.length) _dishes = data.dishes;
          _fcLoading = false;
          render();
        })
        .catch(() => { _fcLoading = false; render(); });
    },
    toggleGroup(g) {
      if (_groupFilter.has(g)) _groupFilter.delete(g);
      else _groupFilter.add(g);
      render();
    },
    clearGroups() {
      _groupFilter.clear();
      render();
    },
    ignore(type, id) {
      const sid = String(id);
      if (type === 'dish') {
        _ignoredDishes.add(sid);
        localStorage.setItem('barops_an_idish', JSON.stringify([..._ignoredDishes]));
      } else if (type === 'cat') {
        _ignoredCats.add(sid);
        localStorage.setItem('barops_an_icat', JSON.stringify([..._ignoredCats]));
      }
      render();
    },
    resetIgnored() {
      _ignoredDishes.clear();
      _ignoredCats.clear();
      localStorage.removeItem('barops_an_idish');
      localStorage.removeItem('barops_an_icat');
      render();
    },
  };
}

export default {
  render() { _loading = true; _fcLoading = true; _venues = []; _dishes = []; _groupFilter.clear(); return buildHTML(); },
  init()   { loadData(); },
};
