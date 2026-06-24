/* ============================================================
   BarOps — pages/open-tables.js
   Відкриті столи / неоплачені чеки з POS (зовнішнє API колеги).
   Для менеджера: живий список залів, столів, сум, офіціантів.
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════ STATE ════════ */
let _loading    = false;
let _error      = '';
let _configured = true;
let _checks     = [];
let _count      = 0;
let _fetchedAt  = null;
let _openKeys   = new Set();   // розгорнуті чеки (склад)
let _pollTimer  = null;

/* ════════ CSS ════════ */
const CSS = `<style id="ot-styles">
.ot-wrap{display:flex;flex-direction:column;flex:1;overflow:hidden;background:var(--bg)}
.ot-scroll{overflow-y:auto;flex:1;padding-bottom:28px}.ot-scroll::-webkit-scrollbar{width:0}
.ot-header{padding:12px 20px 8px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.ot-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ot-back:active{background:var(--bg3)}
.ot-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.ot-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.04em;margin-top:3px;display:flex;align-items:center;gap:6px}
.ot-live{width:6px;height:6px;border-radius:50%;background:var(--green);animation:otPulse 1.4s ease-in-out infinite}
@keyframes otPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
.ot-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:4px 20px 6px}
.ot-kpi{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 12px;display:flex;flex-direction:column;gap:2px}
.ot-kpi.warn{border-color:var(--amber-border);background:var(--amber-bg)}
.ot-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase}
.ot-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1;margin-top:4px;color:var(--text0)}
.ot-kpi.warn .ot-kpi-val{color:var(--amber)}
.ot-sec{padding:14px 20px 2px;font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);display:flex;align-items:center;justify-content:space-between}
.ot-sec-cnt{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.ot-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;margin:0 20px 8px;overflow:hidden}
.ot-card.warn{border-color:var(--amber-border)}
.ot-card.crit{border-color:var(--red-border)}
.ot-card-top{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer}
.ot-tbl{min-width:42px;height:40px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);flex-shrink:0;padding:0 6px}
.ot-mid{flex:1;min-width:0}
.ot-waiter{font-size:13px;color:var(--text0);font-family:var(--font-b);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ot-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap}
.ot-dur.warn{color:var(--amber)}.ot-dur.crit{color:var(--red)}
.ot-right{text-align:right;flex-shrink:0}
.ot-sum{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ot-bill{font-size:9px;color:var(--green);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
.ot-items{border-top:0.5px solid var(--border);padding:8px 13px 11px;display:flex;flex-direction:column;gap:4px}
.ot-item{display:flex;justify-content:space-between;gap:10px;font-size:12px;font-family:var(--font-b)}
.ot-item-n{color:var(--text1);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ot-item-r{color:var(--text2);flex-shrink:0}
.ot-empty{text-align:center;padding:48px 24px;color:var(--text2);font-family:var(--font-b);font-size:14px}
.ot-alert{margin:10px 20px;padding:12px 14px;border-radius:12px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:13px;font-family:var(--font-b)}
.ot-spin{width:26px;height:26px;border:2.5px solid var(--bg3);border-top-color:var(--green);border-radius:50%;animation:otSpin .7s linear infinite;margin:60px auto}
@keyframes otSpin{to{transform:rotate(360deg)}}
</style>`;

/* ════════ HELPERS ════════ */
function venueId() { return state.venueId || localStorage.getItem('barops_venueId'); }
function token()   { return state.token || localStorage.getItem('barops_token'); }
function money(n)  { return Math.round(+n || 0).toLocaleString('uk-UA'); }
function checkKey(c, i) { return `${c.section || ''}|${c.table || ''}|${c.opened_at || ''}|${i}`; }

function durMins(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return -1;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}
function durLabel(iso) {
  let m = durMins(iso);
  if (m < 0) return '—';
  const d = Math.floor(m / 1440); m -= d * 1440;
  const h = Math.floor(m / 60); const mm = m % 60;
  if (d > 0) return `${d}д ${h}г`;
  if (h > 0) return `${h}г ${mm}хв`;
  return `${mm}хв`;
}
function staleLevel(iso) {
  const m = durMins(iso);
  if (m < 0) return 0;
  if (m >= 12 * 60) return 2;   // ≥12 год — підозріло (червоний)
  if (m >= 3 * 60)  return 1;   // ≥3 год — довго (бурштин)
  return 0;
}

/* ════════ DATA ════════ */
async function loadOpenTables() {
  const vid = venueId();
  if (!vid) { _error = 'Заклад не визначено'; _loading = false; re(); return; }
  if (!_fetchedAt) { _loading = true; re(); }
  try {
    const res = await fetch(`${API}/api/pos/open-tables/${vid}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await res.json().catch(() => ({}));
    if (res.status === 403) { _error = 'Доступ лише для менеджера'; _loading = false; re(); return; }
    if (d.configured === false) { _configured = false; _loading = false; _error = ''; re(); return; }
    if (!res.ok) { _error = d.error || 'Джерело недоступне'; _loading = false; re(); return; }
    _configured = true;
    _checks    = Array.isArray(d.checks) ? d.checks : [];
    _count     = d.count != null ? d.count : _checks.length;
    _fetchedAt = d.fetchedAt || new Date().toISOString();
    _error     = '';
  } catch (e) {
    _error = e.message || 'Помилка мережі';
  }
  _loading = false; re();
}

/* ════════ RENDER ════════ */
function re() {
  const root = document.getElementById('ot-root');
  if (!root) return;
  const prev = document.getElementById('ot-scroll');
  const top  = prev ? prev.scrollTop : 0;
  root.innerHTML = buildPage();
  const next = document.getElementById('ot-scroll');
  if (next) next.scrollTop = top;
}

function header() {
  const when = _fetchedAt ? new Date(_fetchedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
  return `
    <div class="ot-header">
      <div class="ot-back" onclick="window.__barops.navigate('dashboard')" aria-label="Назад">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="flex:1">
        <div class="ot-title">Відкриті столи</div>
        <div class="ot-sub">${_configured ? `<span class="ot-live"></span> наживо${when ? ` · ${when}` : ''}` : 'не підключено'}</div>
      </div>
    </div>`;
}

function buildPage() {
  if (_loading) return `<div class="ot-wrap">${CSS}${header()}<div class="ot-spin"></div></div>`;

  if (!_configured) {
    return `<div class="ot-wrap">${CSS}${header()}
      <div class="ot-empty">
        Відкриті столи для цього закладу ще не підключені.<br>
        <span style="font-size:12px;color:var(--text3)">Системний менеджер вмикає це в Налаштуваннях закладу (зовнішнє API).</span>
      </div></div>`;
  }

  const checks = _checks.slice().sort((a, b) => durMins(b.opened_at) - durMins(a.opened_at));   // найстаріші зверху
  const total  = checks.reduce((s, c) => s + (+c.total_uah || 0), 0);
  const stale  = checks.filter(c => staleLevel(c.opened_at) >= 1).length;

  const kpi = `
    <div class="ot-kpi-row">
      <div class="ot-kpi"><div class="ot-kpi-lbl">Відкритих</div><div class="ot-kpi-val">${checks.length}</div></div>
      <div class="ot-kpi"><div class="ot-kpi-lbl">Сума, ₴</div><div class="ot-kpi-val">${money(total)}</div></div>
      <div class="ot-kpi${stale ? ' warn' : ''}"><div class="ot-kpi-lbl">Висять &gt;3г</div><div class="ot-kpi-val">${stale}</div></div>
    </div>`;

  if (!checks.length) {
    return `<div class="ot-wrap">${CSS}${header()}${_error ? `<div class="ot-alert">${_error}</div>` : ''}
      <div class="ot-empty">Зараз немає відкритих столів 🎉</div></div>`;
  }

  // групування по залах (section)
  const bySec = {};
  checks.forEach((c, i) => {
    const s = c.section || 'Без залу';
    (bySec[s] = bySec[s] || []).push({ c, i });
  });

  const body = Object.entries(bySec).map(([sec, rows]) => `
    <div class="ot-sec">${sec}<span class="ot-sec-cnt">${rows.length} · ${money(rows.reduce((s, x) => s + (+x.c.total_uah || 0), 0))} ₴</span></div>
    ${rows.map(({ c, i }) => cardHTML(c, i)).join('')}
  `).join('');

  return `<div class="ot-wrap">${CSS}${header()}
    <div class="ot-scroll" id="ot-scroll">
      ${_error ? `<div class="ot-alert">${_error}</div>` : ''}
      ${kpi}
      ${body}
    </div>
  </div>`;
}

function cardHTML(c, i) {
  const key   = checkKey(c, i);
  const open  = _openKeys.has(key);
  const lvl   = staleLevel(c.opened_at);
  const cls   = lvl === 2 ? ' crit' : lvl === 1 ? ' warn' : '';
  const durCl = lvl === 2 ? ' crit' : lvl === 1 ? ' warn' : '';
  const tbl   = (c.table_name && String(c.table_name).trim()) || c.table || '—';
  const items = Array.isArray(c.items) ? c.items : [];
  return `
    <div class="ot-card${cls}">
      <div class="ot-card-top" onclick="window.__ot.toggle('${key.replace(/'/g, "\\'")}')">
        <div class="ot-tbl">${tbl}</div>
        <div class="ot-mid">
          <div class="ot-waiter">${c.waiter || '—'}</div>
          <div class="ot-meta">
            <span>${c.guests != null ? c.guests : '—'} гост.</span>
            <span class="ot-dur${durCl}">висить ${durLabel(c.opened_at)}</span>
          </div>
        </div>
        <div class="ot-right">
          <div class="ot-sum">${money(c.total_uah)} ₴</div>
          ${c.bill_printed_at ? `<div class="ot-bill">рахунок</div>` : ''}
        </div>
      </div>
      ${open ? `<div class="ot-items">
        ${items.length ? items.map(it => `
          <div class="ot-item"><span class="ot-item-n">${it.name || '—'}</span><span class="ot-item-r">${(+it.qty || 0)} × ${money(it.price_uah)} ₴</span></div>
        `).join('') : `<div class="ot-item" style="color:var(--text3)">Без позицій</div>`}
      </div>` : ''}
    </div>`;
}

/* ════════ EXPORT ════════ */
export function render() {
  _error = '';
  if (!_fetchedAt) _loading = true;
  return `<div id="ot-root" style="flex:1;display:flex;flex-direction:column;overflow:hidden">${buildPage()}</div>`;
}

export function init() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  window.__ot = {
    toggle(key) { if (_openKeys.has(key)) _openKeys.delete(key); else _openKeys.add(key); re(); },
  };
  loadOpenTables();
  _pollTimer = setInterval(() => {
    if (!document.getElementById('ot-root')) { clearInterval(_pollTimer); _pollTimer = null; return; }
    loadOpenTables();
  }, 45000);
}

export function cleanup() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

export default { render, init, cleanup };
