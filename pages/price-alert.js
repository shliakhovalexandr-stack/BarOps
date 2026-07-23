/* ============================================================
   BarOps — pages/price-alert.js
   Алерт ціни (РЕАЛЬНИЙ): підняття цін з історії накладних.
   Для кожного товару порівнюємо останню ціну з попередньою
   (GET /api/invoices/price-alerts/:venueId). Демо прибрано.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function token()   { return localStorage.getItem('barops_token') || state.token || ''; }
function venueId()  { return state.venueId || localStorage.getItem('barops_venueId') || ''; }
// Зони, які бачить роль (таби):
//  шеф/кухар → лише кухня; бухгалтер → усі (бар/кухня/госп/посуд/інше); системний менеджер, керуючий → бар+кухня
function roleZones() {
  const r = (state.role || localStorage.getItem('barops_role') || '').toLowerCase();
  if (r === 'chef' || r === 'cook') return ['kitchen'];
  if (r === 'accountant')           return ['bar', 'kitchen', 'household', 'dishware', 'other'];
  return ['bar', 'kitchen', 'other'];   // системний менеджер / керуючий: бар+кухня окремо + «Інше» (некласифіковані склади)
}
const ZONE_LABEL = { kitchen: 'кухня', bar: 'бар', household: 'госп-товари', dishware: 'посуд', other: 'інше' };
const ZONE_TAB   = { kitchen: 'Кухня', bar: 'Бар', household: 'Госп', dishware: 'Посуд', other: 'Інше' };
// Належність алерта до зони (некласифіковані → 'other')
function inZone(a, z) { return (a.zone || 'other') === z; }

let _alerts  = null;    // null=ще не вантажили | масив (усі зони, кожен несе zone)
let _loading = false;
let _err     = '';
let _tracked = 0;       // скільки товарів має історію цін
let _zoneTab = roleZones()[0];   // активна зона (таб)

const CSS = `<style id="pa-css">
.pa-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.pa-topbar{display:flex;align-items:center;gap:12px;padding:10px 18px 12px;flex-shrink:0}
.pa-back{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1)}
.pa-ttl{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);flex:1}
.pa-refresh{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);cursor:pointer;color:var(--text1);font-size:15px}
.pa-scroll{flex:1;overflow-y:auto;padding:0 16px 28px}.pa-scroll::-webkit-scrollbar{width:0}
.pa-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);padding:0 2px 12px}
.pa-card{display:flex;align-items:center;gap:12px;padding:14px;border-radius:14px;background:var(--bg2);border:0.5px solid var(--border);margin-bottom:10px}
.pa-card-main{flex:1;min-width:0}
.pa-card-name{font-size:15px;font-weight:600;font-family:var(--font-b);color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-card-meta{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.pa-card-price{font-size:13px;color:var(--text1);font-family:var(--font-b);margin-top:4px}
.pa-card-price b{color:var(--text0)}
.pa-card-old{color:var(--text3);text-decoration:line-through}
.pa-pct{flex-shrink:0;text-align:center;padding:7px 11px;border-radius:11px;font-family:var(--font-h);font-weight:700;font-size:15px;min-width:62px}
.pa-pct.red{background:var(--red-bg,rgba(255,90,90,.14));color:var(--red,#ff5a5a)}
.pa-pct.amber{background:var(--amber-bg,rgba(245,158,11,.14));color:var(--amber,#f59e0b)}
.pa-empty{text-align:center;padding:48px 24px;color:var(--text2);font-family:var(--font-b)}
.pa-empty-ic{font-size:40px;margin-bottom:12px}
.pa-empty-t{font-size:15px;color:var(--text0);font-weight:600;margin-bottom:8px}
.pa-empty-s{font-size:13px;line-height:1.6}
.pa-state{text-align:center;padding:40px 24px;color:var(--text2);font-family:var(--font-b);font-size:13px}
.pa-tabs{display:flex;gap:6px;padding:0 16px 12px;flex-shrink:0;overflow-x:auto;-webkit-overflow-scrolling:touch}.pa-tabs::-webkit-scrollbar{height:0}
.pa-tab{flex-shrink:0;height:36px;padding:0 14px;border-radius:11px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-family:var(--font-h);font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.pa-tab.on{background:var(--amber-bg,rgba(245,158,11,.14));border-color:var(--amber,#f59e0b);color:var(--amber,#f59e0b)}
.pa-tab-n{font-size:11px;font-family:var(--font-b);opacity:.75}
</style>`;

function fmtPrice(v) { return (Math.round(v * 100) / 100).toLocaleString('uk-UA', { maximumFractionDigits: 2 }); }
function fmtDate(d) {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : d;
}

function cardHTML(a) {
  const cls = a.pct >= 10 ? 'red' : 'amber';
  return `
    <div class="pa-card">
      <div class="pa-card-main">
        <div class="pa-card-name">${a.name}</div>
        <div class="pa-card-meta">${a.supplier ? a.supplier + ' · ' : ''}${fmtDate(a.date)}${a.points > 2 ? ` · ${a.points} приходів` : ''}</div>
        <div class="pa-card-price"><span class="pa-card-old">${fmtPrice(a.oldPrice)}</span> → <b>${fmtPrice(a.newPrice)} ₴</b> за од.</div>
      </div>
      <div class="pa-pct ${cls}">+${a.pct}%</div>
    </div>`;
}

function activeZone() { const zs = roleZones(); return zs.includes(_zoneTab) ? _zoneTab : zs[0]; }
function zoneAlerts() { return (_alerts || []).filter(a => inZone(a, activeZone())); }

function tabsHTML() {
  const zs = roleZones();
  if (zs.length < 2) return '';
  const cur = activeZone();
  return `<div class="pa-tabs">${zs.map(z => {
    const n = (_alerts || []).filter(a => inZone(a, z)).length;
    return `<button class="pa-tab${z === cur ? ' on' : ''}" onclick="window.__pa.setZone('${z}')">${ZONE_TAB[z]}${_alerts ? ` <span class="pa-tab-n">${n}</span>` : ''}</button>`;
  }).join('')}</div>`;
}

function listHTML() {
  if (_loading && _alerts === null) return `<div class="pa-state">Аналізую історію цін…</div>`;
  if (_err) return `<div class="pa-state" style="color:var(--red)">${_err}<div style="margin-top:12px"><button class="pa-refresh" style="width:auto;padding:0 16px;height:36px" onclick="window.__pa.reload()">Спробувати ще</button></div></div>`;
  const list = zoneAlerts();
  if (!list.length) {
    const zoneNote = roleZones().length > 1 ? ` в зоні «${ZONE_TAB[activeZone()]}»` : '';
    return `
      <div class="pa-empty">
        <div class="pa-empty-ic">📉</div>
        <div class="pa-empty-t">Підняття цін не виявлено${zoneNote}</div>
        <div class="pa-empty-s">Алерти з'являться, коли той самий товар прийде в накладних щонайменше <b>двічі</b> — порівняємо нову ціну з попередньою.${_tracked ? `<br><br>Зараз із історією цін: <b>${_tracked}</b> товар(ів).` : '<br><br>Поки що немає історії цін із накладних.'}</div>
      </div>`;
  }
  return `
    <div class="pa-sub">Порівняння останньої ціни з попередньою (за історією приходів). ${list.length} товар(ів) подорожчало.</div>
    ${list.map(cardHTML).join('')}`;
}

function buildHTML() {
  return `${CSS}
    <div class="pa-wrap">
      <div class="pa-topbar">
        <div class="pa-back" onclick="window.__barops.navigate('dashboard')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="pa-ttl">Алерт цін${roleZones().length === 1 ? ` · ${ZONE_LABEL[roleZones()[0]]}` : ''}</div>
        <button class="pa-refresh" onclick="window.__pa.reload()" title="Оновити">↻</button>
      </div>
      ${tabsHTML()}
      <div class="pa-scroll">${listHTML()}</div>
    </div>`;
}

function re() { const el = document.getElementById('pa-root'); if (el) el.innerHTML = buildHTML(); }

async function load() {
  if (_loading) return;
  _loading = true; _err = ''; re();
  try {
    const vid = venueId();
    // тягнемо ВСІ зони (кожен алерт несе zone); фільтруємо табами на клієнті
    const r = await fetch(`${API}/api/invoices/price-alerts/${vid}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success) throw new Error(d.error || 'Не вдалося завантажити');
    _alerts  = d.alerts || [];
    _tracked = d.productsTracked || 0;
  } catch (e) {
    _err = e.message || 'Помилка';
    if (_alerts === null) _alerts = [];
  }
  _loading = false; re();
}

export default {
  render() {
    _alerts = null; _err = ''; _tracked = 0; _zoneTab = roleZones()[0];
    return `<div id="pa-root">${buildHTML()}</div>`;
  },
  init() {
    window.__pa = {
      reload: load,
      setZone: (z) => { _zoneTab = z; re(); },
    };
    load();
  },
};
