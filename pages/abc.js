/* ============================================================
   BarOps — pages/abc.js
   ABC-аналіз страв (як «ABC/XYZ анализ блюд» у Syrve).
   Метрика: виторг / прибуток / к-сть (перемикач). Період 30/90.
   Поділ за департаментом Бар/Кухня. GET /api/invoices/abc/:venueId
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function token()  { return localStorage.getItem('barops_token') || state.token || ''; }
function venueId() { return state.venueId || localStorage.getItem('barops_venueId') || ''; }
function kitchenOnly() { const r = (state.role || localStorage.getItem('barops_role') || '').toLowerCase(); return r === 'chef' || r === 'cook'; }

const METRIC_LBL = { revenue: 'Виторг', profit: 'Прибуток', qty: 'К-сть' };
const ABC_CLR    = { A: 'a', B: 'b', C: 'c' };

let _dishes  = null;   // масив із abc[metric]/share[metric]
let _totals  = {};
let _loading = false;
let _err     = '';
let _tracked = 0;
let _warming = false;
let _metric  = 'revenue';
let _days    = 30;
let _deptTab = '';

const CSS = `<style id="abc-css">
.abc-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.abc-top{display:flex;align-items:center;gap:12px;padding:10px 18px 10px;flex-shrink:0}
.abc-back{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1)}
.abc-ttl{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);flex:1}
.abc-refresh{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);cursor:pointer;color:var(--text1);font-size:15px}
.abc-ctrls{display:flex;gap:8px;padding:0 16px 8px;flex-shrink:0;flex-wrap:wrap}
.abc-seg{display:inline-flex;background:var(--bg2);border:0.5px solid var(--border);border-radius:11px;overflow:hidden}
.abc-seg button{background:transparent;border:none;color:var(--text2);font-family:var(--font-h);font-size:12.5px;font-weight:600;padding:0 12px;height:34px;cursor:pointer}
.abc-seg button.on{background:var(--green-bg);color:var(--green)}
.abc-tabs{display:flex;gap:6px;padding:0 16px 10px;flex-shrink:0}
.abc-tab{flex:1;height:34px;border-radius:11px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-family:var(--font-h);font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.abc-tab.on{background:var(--green-bg);border-color:var(--green);color:var(--green)}
.abc-tab-n{font-size:11px;font-family:var(--font-b);opacity:.75}
.abc-scroll{flex:1;overflow-y:auto;padding:0 16px 28px}.abc-scroll::-webkit-scrollbar{width:0}
.abc-sum{display:flex;gap:8px;margin-bottom:12px}
.abc-sum-c{flex:1;border-radius:12px;padding:9px 6px;text-align:center;border:0.5px solid var(--border)}
.abc-sum-c.a{background:var(--green-bg)}.abc-sum-c.b{background:var(--amber-bg,rgba(245,158,11,.12))}.abc-sum-c.c{background:var(--bg2)}
.abc-sum-g{font-family:var(--font-h);font-size:16px;font-weight:800}
.abc-sum-c.a .abc-sum-g{color:var(--green)}.abc-sum-c.b .abc-sum-g{color:var(--amber,#e0a93b)}.abc-sum-c.c .abc-sum-g{color:var(--text2)}
.abc-sum-l{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.abc-row{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:13px;background:var(--bg2);border:0.5px solid var(--border);margin-bottom:8px}
.abc-badge{width:26px;height:26px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:800;font-size:14px}
.abc-badge.a{background:var(--green-bg);color:var(--green)}
.abc-badge.b{background:var(--amber-bg,rgba(245,158,11,.14));color:var(--amber,#e0a93b)}
.abc-badge.c{background:var(--bg3);color:var(--text2)}
.abc-main{flex:1;min-width:0}
.abc-name{font-size:14px;font-weight:600;font-family:var(--font-b);color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.abc-meta{font-size:11.5px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.abc-val{flex-shrink:0;text-align:right}
.abc-val-g{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.abc-val-s{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.abc-rank{font-size:11px;color:var(--text3);font-family:var(--font-b);min-width:22px;text-align:right;flex-shrink:0}
.abc-empty{text-align:center;padding:48px 24px;color:var(--text2);font-family:var(--font-b)}
.abc-empty-ic{font-size:40px;margin-bottom:12px}
.abc-empty-t{font-size:15px;color:var(--text0);font-weight:600;margin-bottom:8px}
.abc-state{text-align:center;padding:40px 24px;color:var(--text2);font-family:var(--font-b);font-size:13px}
</style>`;

function money(v) { return (Math.round((+v || 0))).toLocaleString('uk-UA'); }
function fmtVal(it) { return _metric === 'qty' ? `${it.qty} порц.` : `${money(it[_metric])} ₴`; }

function visibleDishes() { const all = _dishes || []; return kitchenOnly() ? all.filter(d => d.zone === 'kitchen') : all; }
function deptList() {
  const cnt = new Map();
  for (const d of visibleDishes()) cnt.set(d.dept, (cnt.get(d.dept) || 0) + 1);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
function activeDept() { const l = deptList(); return l.includes(_deptTab) ? _deptTab : l[0]; }
function deptDishes() {
  return visibleDishes().filter(d => d.dept === activeDept())
    .sort((a, b) => (b[_metric] || 0) - (a[_metric] || 0));
}

function segHTML() {
  const m = ['revenue', 'profit', 'qty'].map(k => `<button class="${k === _metric ? 'on' : ''}" onclick="window.__abc.metric('${k}')">${METRIC_LBL[k]}</button>`).join('');
  const p = [30, 90].map(d => `<button class="${d === _days ? 'on' : ''}" onclick="window.__abc.days(${d})">${d} дн</button>`).join('');
  return `<div class="abc-ctrls"><div class="abc-seg">${m}</div><div class="abc-seg">${p}</div></div>`;
}

function tabsHTML() {
  const l = deptList();
  if (l.length < 2) return '';
  const cur = activeDept();
  return `<div class="abc-tabs">${l.map(d => {
    const n = visibleDishes().filter(x => x.dept === d).length;
    return `<button class="abc-tab${d === cur ? ' on' : ''}" onclick="window.__abc.dept('${d}')">${d} <span class="abc-tab-n">${n}</span></button>`;
  }).join('')}</div>`;
}

function listHTML() {
  if (_loading && _dishes === null) return `<div class="abc-state">Рахую ABC із продажів…</div>`;
  if (_err) return `<div class="abc-state" style="color:var(--red)">${_err}<div style="margin-top:12px"><button class="abc-refresh" style="width:auto;padding:0 16px;height:36px" onclick="window.__abc.reload()">Спробувати ще</button></div></div>`;
  if (_warming) return `<div class="abc-empty"><div class="abc-empty-ic">⏳</div><div class="abc-empty-t">Дані прогріваються</div><div style="font-size:13px;line-height:1.6">Syrve підтягує продажі. Оновіть за ~хвилину.<div style="margin-top:14px"><button class="abc-refresh" style="width:auto;padding:0 16px;height:36px" onclick="window.__abc.reload()">Оновити</button></div></div></div>`;
  const list = deptDishes();
  if (!list.length) return `<div class="abc-empty"><div class="abc-empty-ic">📊</div><div class="abc-empty-t">Продажів немає</div><div style="font-size:13px;line-height:1.6">За обраний період у цьому департаменті немає продажів.${_tracked ? `<br><br>Проаналізовано страв: <b>${_tracked}</b>.` : ''}</div></div>`;

  const grp = { A: [], B: [], C: [] };
  for (const it of list) grp[it.abc[_metric] || 'C'].push(it);
  const tot = (_totals[activeDept()] || {})[_metric] || 0;
  const shareSum = g => Math.round(grp[g].reduce((s, x) => s + (x.share[_metric] || 0), 0));
  const sum = `<div class="abc-sum">
    ${['A', 'B', 'C'].map(g => `<div class="abc-sum-c ${ABC_CLR[g]}"><div class="abc-sum-g">${g}</div><div class="abc-sum-l">${grp[g].length} страв · ${shareSum(g)}%</div></div>`).join('')}
  </div>`;

  let rank = 0;
  const rows = list.map(it => {
    rank++;
    const g = it.abc[_metric] || 'C';
    return `<div class="abc-row">
      <div class="abc-rank">${rank}</div>
      <div class="abc-badge ${ABC_CLR[g]}">${g}</div>
      <div class="abc-main"><div class="abc-name">${it.name}</div><div class="abc-meta">${it.qty} порц. · виторг ${money(it.revenue)} ₴ · прибуток ${money(it.profit)} ₴</div></div>
      <div class="abc-val"><div class="abc-val-g">${fmtVal(it)}</div><div class="abc-val-s">${it.share[_metric] ?? 0}%</div></div>
    </div>`;
  }).join('');
  return sum + rows;
}

function buildHTML() {
  return `${CSS}
    <div class="abc-wrap">
      <div class="abc-top">
        <div class="abc-back" onclick="window.__barops.navigate('dashboard')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="abc-ttl">ABC-аналіз</div>
        <button class="abc-refresh" onclick="window.__abc.reload()" title="Оновити">↻</button>
      </div>
      ${segHTML()}
      ${tabsHTML()}
      <div class="abc-scroll">${listHTML()}</div>
    </div>`;
}

function re() {
  const el = document.getElementById('abc-root'); if (!el) return;
  const sc = el.querySelector('.abc-scroll'); const top = sc ? sc.scrollTop : 0;
  el.innerHTML = buildHTML();
  const sc2 = el.querySelector('.abc-scroll'); if (sc2 && top) sc2.scrollTop = top;
}

async function load() {
  if (_loading) return;
  _loading = true; _err = ''; re();
  try {
    const r = await fetch(`${API}/api/invoices/abc/${venueId()}?days=${_days}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success) throw new Error(d.error || 'Не вдалося завантажити');
    _dishes = d.dishes || []; _totals = d.totals || {}; _tracked = d.dishesTracked || 0;
    _warming = (d.dishesTracked > 0 && _dishes.length === 0 && !d.note);   // кеш страв ще прогрівається
  } catch (e) {
    _err = e.message || 'Помилка';
    if (_dishes === null) _dishes = [];
  }
  _loading = false; re();
}

export default {
  render() {
    _dishes = null; _err = ''; _totals = {}; _tracked = 0; _warming = false;
    _metric = 'revenue'; _days = 30; _deptTab = '';
    return `<div id="abc-root">${buildHTML()}</div>`;
  },
  init() {
    window.__abc = {
      reload: load,
      metric: (m) => { _metric = m; re(); },
      dept:   (d) => { _deptTab = d; re(); },
      days:   (n) => { if (n !== _days) { _days = n; _dishes = null; load(); } },
    };
    load();
  },
};
