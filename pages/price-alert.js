/* ============================================================
   BarOps — pages/price-alert.js
   Алерт МАРЖІ страв (price-alert × фудкост).
   Страви з високим фудкостом та/або падінням маржі через
   подорожчання інгредієнтів (GET /api/invoices/dish-margin/:venueId).
   Дані: собівартість/ціна з Syrve (OLAP+ТТК) + історія цін інгредієнтів.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function token()   { return localStorage.getItem('barops_token') || state.token || ''; }
function venueId()  { return state.venueId || localStorage.getItem('barops_venueId') || ''; }

// Розподіл СТРАВ ЗА СКЛАДОМ (надійніше за ключові слова). Шеф/кухар бачить лише кухонні
// склади (zone==='kitchen'); керуючий/системний менеджер/бухгалтер — усі склади.
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function kitchenOnly() { const r = (state.role || localStorage.getItem('barops_role') || '').toLowerCase(); return r === 'chef' || r === 'cook'; }
function visibleDishes() { const all = _dishes || []; return kitchenOnly() ? all.filter(a => a.zone === 'kitchen') : all; }
function storeList() {
  const cnt = new Map();
  for (const a of visibleDishes()) cnt.set(a.store || 'Інше', (cnt.get(a.store || 'Інше') || 0) + 1);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);   // за кількістю спадаюче
}
function activeStore() { const s = storeList(); return s.includes(_storeTab) ? _storeTab : s[0]; }
function storeDishes() { return visibleDishes().filter(a => (a.store || 'Інше') === activeStore()); }

let _dishes  = null;    // null=ще не вантажили | масив алертів
let _loading = false;
let _err     = '';
let _tracked = 0;       // скільки страв проаналізовано
let _warming = false;   // холодний кеш страв — собівартість ще прогрівається
let _storeTab = '';     // активний склад (вкладка)
let _open     = new Set();   // розгорнуті картки (dishId) — історія приходів інгредієнтів

const CSS = `<style id="pa-css">
.pa-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.pa-topbar{display:flex;align-items:center;gap:12px;padding:10px 18px 12px;flex-shrink:0}
.pa-back{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1)}
.pa-ttl{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);flex:1}
.pa-refresh{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);cursor:pointer;color:var(--text1);font-size:15px}
.pa-scroll{flex:1;overflow-y:auto;padding:0 16px 28px}.pa-scroll::-webkit-scrollbar{width:0}
.pa-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);padding:0 2px 12px;line-height:1.5}
.pa-card{padding:13px 14px;border-radius:14px;background:var(--bg2);border:0.5px solid var(--border);margin-bottom:10px}
.pa-card.red{border-color:var(--red,#ff5a5a)}
.pa-card-row{display:flex;align-items:center;gap:12px}
.pa-card-main{flex:1;min-width:0}
.pa-more{opacity:.8;font-weight:600}
.pa-detail{margin-top:11px;padding-top:11px;border-top:0.5px solid var(--border)}
.pa-di{margin-bottom:10px}
.pa-di:last-child{margin-bottom:0}
.pa-di-h{font-size:12.5px;font-weight:600;font-family:var(--font-b);color:var(--text0);margin-bottom:4px}
.pa-di-row{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.8}
.pa-di-row b{color:var(--text1);font-weight:600}
.pa-di-new{color:var(--red,#ff5a5a);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
.pa-card-name{font-size:15px;font-weight:600;font-family:var(--font-b);color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-card-meta{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.pa-card-meta b{color:var(--text0)}
.pa-card-meta .old{color:var(--text3);text-decoration:line-through}
.pa-culp{font-size:11.5px;color:var(--amber,#e0a93b);font-family:var(--font-b);margin-top:5px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-fc{flex-shrink:0;text-align:center;padding:7px 10px;border-radius:11px;font-family:var(--font-h);font-weight:700;font-size:16px;min-width:58px}
.pa-fc.red{background:var(--red-bg,rgba(255,90,90,.14));color:var(--red,#ff5a5a)}
.pa-fc.amber{background:var(--amber-bg,rgba(245,158,11,.14));color:var(--amber,#f59e0b)}
.pa-fc-l{font-size:8px;font-weight:600;opacity:.7;text-transform:uppercase;letter-spacing:.04em;margin-top:1px}
.pa-empty{text-align:center;padding:48px 24px;color:var(--text2);font-family:var(--font-b)}
.pa-empty-ic{font-size:40px;margin-bottom:12px}
.pa-empty-t{font-size:15px;color:var(--text0);font-weight:600;margin-bottom:8px}
.pa-empty-s{font-size:13px;line-height:1.6}
.pa-state{text-align:center;padding:40px 24px;color:var(--text2);font-family:var(--font-b);font-size:13px}
.pa-tabs{display:flex;gap:6px;padding:0 16px 12px;flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch}.pa-tabs::-webkit-scrollbar{height:0}
.pa-tab{flex:0 0 auto;height:36px;padding:0 13px;border-radius:11px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-family:var(--font-h);font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.pa-tab.on{background:var(--amber-bg,rgba(245,158,11,.14));border-color:var(--amber,#f59e0b);color:var(--amber,#f59e0b)}
.pa-tab-n{font-size:11px;font-family:var(--font-b);opacity:.75}
</style>`;

function money(v) { return (Math.round((+v || 0) * 100) / 100).toLocaleString('uk-UA', { maximumFractionDigits: 2 }); }
function fmtDate(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : (s || ''); }
// Деталь по інгредієнту: історія приходів (дата — ціна за од.), остання = нова з подорожчанням
function detailHTML(c) {
  const hist = c.hist || [];
  if (!hist.length) return '';
  const rows = hist.map((h, i) => {
    const isNew = i === hist.length - 1;
    return `<div class="pa-di-row">${isNew ? '●' : '○'} прихід <b>${fmtDate(h.date)}</b> — ${money(h.price)} ₴/од${isNew ? ' <span class="pa-di-new">нова ▲</span>' : ''}</div>`;
  }).join('');
  return `<div class="pa-di"><div class="pa-di-h">${esc(c.name)} <span style="color:var(--amber,#e0a93b)">+${c.pct}%</span></div>${rows}</div>`;
}

function tabsHTML() {
  const stores = storeList();
  if (stores.length < 2) return '';
  const cur = activeStore();
  return `<div class="pa-tabs">${stores.map((s, i) => {
    const n = visibleDishes().filter(a => (a.store || 'Інше') === s).length;
    return `<button class="pa-tab${s === cur ? ' on' : ''}" onclick="window.__pa.setStore(${i})">${esc(s)} <span class="pa-tab-n">${n}</span></button>`;
  }).join('')}</div>`;
}

function cardHTML(a) {
  const cls = a.highFc ? 'red' : 'amber';
  const fcTxt = a.dropped ? `<span class="old">${a.fcOld}%</span> → <b>${a.fcNow}%</b>` : `<b>${a.fcNow}%</b>`;
  const culps = a.culprits || [];
  const hasDetail = culps.some(c => (c.hist || []).length);
  const open = _open.has(a.dishId);
  const culpLine = culps.length
    ? `<div class="pa-culp">▲ ${culps.map(c => `${esc(c.name)} +${c.pct}%`).join(' · ')}${hasDetail ? ` <span class="pa-more">${open ? '▲ згорнути' : '▾ приходи'}</span>` : ''}</div>` : '';
  const detail = (open && hasDetail) ? `<div class="pa-detail">${culps.map(detailHTML).join('')}</div>` : '';
  return `
    <div class="pa-card ${a.highFc ? 'red' : ''}"${hasDetail ? ` onclick="window.__pa.toggle('${a.dishId}')" style="cursor:pointer"` : ''}>
      <div class="pa-card-row">
        <div class="pa-card-main">
          <div class="pa-card-name">${esc(a.name)}${a.estimated ? ' <span style="color:var(--text3);font-weight:400" title="собівартість оцінена (без продажів)">≈</span>' : ''}</div>
          <div class="pa-card-meta">фудкост ${fcTxt} · маржа <b>${money(a.marginNow)} ₴</b> · ціна ${money(a.sellingPrice)} ₴</div>
          ${culpLine}
        </div>
        <div class="pa-fc ${cls}">${a.fcNow}%<div class="pa-fc-l">фудкост</div></div>
      </div>
      ${detail}
    </div>`;
}

function listHTML() {
  if (_loading && _dishes === null) return `<div class="pa-state">Рахую собівартість і маржу…</div>`;
  if (_err) return `<div class="pa-state" style="color:var(--red)">${_err}<div style="margin-top:12px"><button class="pa-refresh" style="width:auto;padding:0 16px;height:36px" onclick="window.__pa.reload()">Спробувати ще</button></div></div>`;
  if (_warming) return `
      <div class="pa-empty">
        <div class="pa-empty-ic">⏳</div>
        <div class="pa-empty-t">Собівартість прогрівається</div>
        <div class="pa-empty-s">Syrve підтягує собівартість страв. Оновіть екран за ~хвилину.<div style="margin-top:14px"><button class="pa-refresh" style="width:auto;padding:0 16px;height:36px" onclick="window.__pa.reload()">Оновити</button></div></div>
      </div>`;
  const list = storeDishes();
  if (!list.length) {
    const zn = storeList().length > 1 ? ` на складі «${activeStore() || ''}»` : '';
    return `
      <div class="pa-empty">
        <div class="pa-empty-ic">✅</div>
        <div class="pa-empty-t">Проблемних страв немає${zn}</div>
        <div class="pa-empty-s">Тут з'являться страви з <b>високим фудкостом</b> (кухня >30%, бар >25%) або ті, де <b>маржа впала</b> через подорожчання інгредієнтів.${_tracked ? `<br><br>Проаналізовано страв: <b>${_tracked}</b>.` : ''}</div>
      </div>`;
  }
  const nRed = list.filter(a => a.highFc).length, nDrop = list.filter(a => a.dropped && !a.highFc).length;
  const bits = [];
  if (nRed) bits.push(`${nRed} з високим фудкостом`);
  if (nDrop) bits.push(`${nDrop} із падінням маржі`);
  return `
    <div class="pa-sub">${bits.join(' · ')}. Червоне — фудкост вище норми; ▲ — інгредієнт, що підняв собівартість; «≈» — собівартість оцінена (страва без продажів у періоді).</div>
    ${list.map(cardHTML).join('')}`;
}

function buildHTML() {
  return `${CSS}
    <div class="pa-wrap">
      <div class="pa-topbar">
        <div class="pa-back" onclick="window.__barops.navigate('dashboard')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="pa-ttl">Алерт маржі</div>
        <button class="pa-refresh" onclick="window.__pa.reload()" title="Оновити">↻</button>
      </div>
      ${tabsHTML()}
      <div class="pa-scroll">${listHTML()}</div>
    </div>`;
}

function re() {
  const el = document.getElementById('pa-root'); if (!el) return;
  const sc = el.querySelector('.pa-scroll'); const top = sc ? sc.scrollTop : 0;
  el.innerHTML = buildHTML();
  const sc2 = el.querySelector('.pa-scroll'); if (sc2 && top) sc2.scrollTop = top;
}

async function load() {
  if (_loading) return;
  _loading = true; _err = ''; re();
  try {
    const vid = venueId();
    const r = await fetch(`${API}/api/invoices/dish-margin/${vid}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success) throw new Error(d.error || 'Не вдалося завантажити');
    _dishes  = d.dishes || [];
    _tracked = d.dishesTracked || 0;
    _warming = !!d.warming;
  } catch (e) {
    _err = e.message || 'Помилка';
    if (_dishes === null) _dishes = [];
  }
  _loading = false; re();
}

export default {
  render() {
    _dishes = null; _err = ''; _tracked = 0; _warming = false; _storeTab = ''; _open = new Set();
    return `<div id="pa-root">${buildHTML()}</div>`;
  },
  init() {
    window.__pa = {
      reload: load,
      setStore: (i) => { const s = storeList()[i]; if (s != null) { _storeTab = s; re(); } },
      toggle: (id) => { if (_open.has(id)) _open.delete(id); else _open.add(id); re(); },
    };
    load();
  },
};
