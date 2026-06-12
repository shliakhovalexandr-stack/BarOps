/* ============================================================
   BarOps — pages/performance.js
   Фаза 4.3: Продуктивність бару (командна).
   Виторг барних місць приготування ÷ години барменів із графіка.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _tab     = 'venue';   // 'venue' | 'compare'
let _period  = 14;        // днів
let _venueData = null;    // { days, totals, ... }
let _compare   = null;    // [{ venueName, totals }]
let _loading   = false;
let _err       = '';

/* ════════════════════════  HELPERS  ════════════════════════ */
function token() { return localStorage.getItem('barops_token') || state.token || ''; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function range() {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - (_period - 1));
  return { from: ymd(from), to: ymd(to) };
}
function fmtUAH(n) { return '₴' + (Math.round(+n || 0)).toLocaleString('uk-UA'); }
function fmtN(n) { return (Math.round((+n || 0) * 10) / 10).toLocaleString('uk-UA'); }
function dow(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return ['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()];
}
function dShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? iso : `${d.getDate()}.${String(d.getMonth()+1).padStart(2,'0')}`;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ════════════════════════  CSS  ════════════════════════ */
const CSS = `<style id="perf-css">
.pf-scroll{overflow-y:auto;flex:1}.pf-scroll::-webkit-scrollbar{width:0}
.pf-header{padding:16px 20px 8px;display:flex;align-items:center;gap:12px}
.pf-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.pf-back:active{background:rgba(255,255,255,.08)}
.pf-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.pf-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.pf-tabs{display:flex;gap:6px;padding:6px 14px 6px}
.pf-tab{flex:1;height:36px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.pf-tab.sel{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
.pf-chips{display:flex;gap:6px;padding:2px 14px 10px}
.pf-chip{flex:1;height:32px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.pf-chip.sel{background:rgba(56,189,248,.14);border-color:var(--blue);color:var(--blue)}
/* KPI cards */
.pf-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 6px}
.pf-kpi{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:15px;padding:13px 14px;position:relative;overflow:hidden}
.pf-kpi.hero{grid-column:1 / -1;background:linear-gradient(135deg,rgba(56,189,248,.10),rgba(168,139,255,.06))}
.pf-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase}
.pf-kpi-val{font-family:var(--font-h);font-weight:700;color:var(--text0);margin-top:5px;line-height:1}
.pf-kpi-val.big{font-size:30px;color:var(--blue)}
.pf-kpi-val.mid{font-size:20px}
.pf-kpi-hint{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-top:4px}
/* table */
.pf-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 20px 8px;font-family:var(--font-b)}
.pf-card{margin:0 14px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.pf-row{display:grid;grid-template-columns:54px 1fr 1fr 1fr;gap:6px;padding:11px 14px;border-bottom:0.5px solid var(--border);align-items:center}
.pf-row:last-child{border-bottom:none}
.pf-row.head{background:rgba(255,255,255,.02)}
.pf-row.head .pf-c{font-size:9px;color:var(--text2);letter-spacing:.04em;text-transform:uppercase}
.pf-row.best{background:rgba(56,189,248,.07)}
.pf-c{font-size:12.5px;font-family:var(--font-b);color:var(--text1);text-align:right}
.pf-c.d{text-align:left;color:var(--text2);font-size:11px}
.pf-c.v{font-weight:700;color:var(--text0);font-family:var(--font-h)}
.pf-c.muted{color:var(--text3)}
.pf-dow{color:var(--text3);font-size:10px}
/* compare */
.pf-cmp{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:0.5px solid var(--border)}
.pf-cmp:last-child{border-bottom:none}
.pf-cmp-rank{width:26px;height:26px;border-radius:8px;background:var(--bg3,#26262b);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:13px;color:var(--text1);flex-shrink:0}
.pf-cmp-rank.top{background:rgba(56,189,248,.18);color:var(--blue)}
.pf-cmp-name{flex:1;min-width:0;font-family:var(--font-h);font-weight:600;font-size:14px;color:var(--text0)}
.pf-cmp-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.pf-cmp-val{text-align:right;flex-shrink:0}
.pf-cmp-val b{font-family:var(--font-h);font-size:16px;color:var(--blue)}
.pf-cmp-val span{display:block;font-size:10px;color:var(--text3);font-family:var(--font-b)}
.pf-empty{margin:0 14px;padding:28px 20px;text-align:center;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px}
.pf-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.pf-load{padding:34px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px}
.pf-note{font-size:11px;color:var(--text3);font-family:var(--font-b);padding:8px 20px 0;line-height:1.5}
</style>`;

/* ════════════════════════  RENDER  ════════════════════════ */
function kpiCards(t) {
  if (!t) return '';
  return `
  <div class="pf-kpis">
    <div class="pf-kpi hero">
      <div class="pf-kpi-lbl">Виторг бару / годину-бармена</div>
      <div class="pf-kpi-val big">${t.revPerHour != null ? fmtUAH(t.revPerHour) : '—'}</div>
      <div class="pf-kpi-hint">за ${t.daysWithShift} повних днів зі зміною · ${fmtN(t.bartenderHours)} год</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Позицій / годину</div>
      <div class="pf-kpi-val mid">${t.itemsPerHour != null ? fmtN(t.itemsPerHour) : '—'}</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Середній бар-чек</div>
      <div class="pf-kpi-val mid">${t.avgCheck != null ? fmtUAH(t.avgCheck) : '—'}</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Виторг / зміну</div>
      <div class="pf-kpi-val mid">${t.revPerDay != null ? fmtUAH(t.revPerDay) : '—'}</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Виторг бару за період</div>
      <div class="pf-kpi-val mid">${fmtUAH(t.barRevenue)}</div>
      <div class="pf-kpi-hint">${t.barChecks.toLocaleString('uk-UA')} чеків</div>
    </div>
  </div>`;
}

function venueView() {
  if (_loading) return `<div class="pf-load">Рахую виторг бару й години…</div>`;
  if (_err)     return `<div class="pf-empty"><div class="pf-empty-txt">${esc(_err)}</div></div>`;
  if (!_venueData || !_venueData.days?.length) {
    return `<div class="pf-empty"><div class="pf-empty-txt">Немає даних за період.<br>Перевір, що заклад на Syrve і графік заповнено.</div></div>`;
  }
  const noHours = !(_venueData.totals && _venueData.totals.daysWithShift);
  const warn = noHours ? `<div class="pf-empty" style="margin-bottom:8px;border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.06)">
      <div class="pf-empty-txt">⚠ Графік змін барменів за період не заповнено, тож «виторг/год» порахувати неможливо.<br>
      Заповни графік у розділі <b style="color:var(--amber)">«Графіки»</b> — і метрика зʼявиться автоматично.</div></div>` : '';
  const days = _venueData.days.slice().reverse(); // новіші зверху
  const bestRev = Math.max(...days.map(d => d.revPerHour || 0));
  const rows = days.map(d => `
    <div class="pf-row${d.revPerHour && d.revPerHour === bestRev ? ' best' : ''}">
      <div class="pf-c d">${dShort(d.date)} <span class="pf-dow">${dow(d.date)}</span></div>
      <div class="pf-c v">${d.revPerHour != null ? fmtUAH(d.revPerHour) : '<span class="muted">—</span>'}</div>
      <div class="pf-c">${fmtUAH(d.barRevenue)}</div>
      <div class="pf-c ${d.bartenderHours ? '' : 'muted'}">${d.bartenderHours ? fmtN(d.bartenderHours)+' год' : 'нема зм.'}</div>
    </div>`).join('');
  return `
    ${warn}
    ${kpiCards(_venueData.totals)}
    <div class="pf-note">«—» у виторгу/год — день без графіка або ще не закритий. Бар = місця приготування з «бар» у назві.</div>
    <div class="pf-sec">По днях</div>
    <div class="pf-card">
      <div class="pf-row head">
        <div class="pf-c d">Дата</div><div class="pf-c">₴/год ⭐</div><div class="pf-c">Виторг</div><div class="pf-c">Години</div>
      </div>
      ${rows}
    </div>
    <div style="height:24px"></div>`;
}

function compareView() {
  if (_loading) return `<div class="pf-load">Рахую по всіх закладах (послідовно)…</div>`;
  if (_err)     return `<div class="pf-empty"><div class="pf-empty-txt">${esc(_err)}</div></div>`;
  if (!_compare || !_compare.length) {
    return `<div class="pf-empty"><div class="pf-empty-txt">Немає закладів для порівняння.</div></div>`;
  }
  const rows = _compare.map((v, i) => {
    const t = v.totals || {};
    return `
    <div class="pf-cmp">
      <div class="pf-cmp-rank ${i === 0 ? 'top' : ''}">${i + 1}</div>
      <div class="pf-cmp-name">${esc(v.venueName)}
        <div class="pf-cmp-sub">${v.error ? '⚠ ' + esc(v.error) : (t.daysWithShift ? `${fmtUAH(t.barRevenue)} · серед.чек ${t.avgCheck != null ? fmtUAH(t.avgCheck) : '—'} · ${t.daysWithShift} дн.` : `${fmtUAH(t.barRevenue)} · ⚠ графік змін не заповнено`)}</div>
      </div>
      <div class="pf-cmp-val"><b>${t.revPerHour != null ? fmtUAH(t.revPerHour) : '—'}</b><span>₴/год</span></div>
    </div>`;
  }).join('');
  return `
    <div class="pf-note">Рейтинг барів мережі за виторгом на годину-бармена. Лідер — зверху.</div>
    <div class="pf-card" style="margin-top:8px">${rows}</div>
    <div style="height:24px"></div>`;
}

function buildHTML() {
  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="pf-scroll">
    <div class="pf-header">
      <div class="pf-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="pf-title">Продуктивність</div>
        <div class="pf-sub">Бар · ${esc(state.venue || '')}</div>
      </div>
    </div>

    <div class="pf-tabs">
      <button class="pf-tab ${_tab === 'venue' ? 'sel' : ''}" onclick="window.__perf.setTab('venue')">Цей заклад</button>
      <button class="pf-tab ${_tab === 'compare' ? 'sel' : ''}" onclick="window.__perf.setTab('compare')">Порівняння мережі</button>
    </div>

    <div class="pf-chips">
      ${[7, 14, 30].map(p => `<button class="pf-chip ${_period === p ? 'sel' : ''}" onclick="window.__perf.setPeriod(${p})">${p} днів</button>`).join('')}
    </div>

    ${_tab === 'venue' ? venueView() : compareView()}
  </div>
</div>`;
}

function rerender() {
  if (state.route !== 'performance') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════  DATA  ════════════════════════ */
async function loadVenue() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  const { from, to } = range();
  try {
    const r = await fetch(`${API}/api/performance/bar?venueId=${venueId}&from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _venueData = d;
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _venueData = null; }
  _loading = false; rerender();
}

async function loadCompare() {
  _loading = true; _err = ''; rerender();
  const { from, to } = range();
  try {
    const r = await fetch(`${API}/api/performance/bar-compare?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _compare = d.venues || [];
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _compare = null; }
  _loading = false; rerender();
}

function loadCurrent() { _tab === 'venue' ? loadVenue() : loadCompare(); }

/* ════════════════════════  MODULE  ════════════════════════ */
export default {
  render() {
    _tab = 'venue'; _period = 14; _venueData = null; _compare = null; _loading = false; _err = '';
    return buildHTML();
  },
  init() {
    window.__perf = {
      setTab(t) { if (_tab === t) return; _tab = t; (t === 'venue' ? (_venueData ? rerender() : loadVenue()) : (_compare ? rerender() : loadCompare())); },
      setPeriod(p) { if (_period === p) return; _period = p; loadCurrent(); },
    };
    loadVenue();
  },
};
