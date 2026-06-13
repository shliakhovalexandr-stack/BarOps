/* ============================================================
   BarOps — pages/performance.js
   Фаза 4.3: Продуктивність бару (командна).
   Виторг барних місць приготування ÷ години барменів із графіка.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _tab     = 'venue';   // 'venue' | 'top' | 'compare'
let _period  = 14;        // днів
let _venueData = null;    // { days, totals, ... }
let _topItems  = null;    // [{ name, qty, revenue }]
let _hours     = null;    // { hours:[{hour,revenue,items,checks}], days }
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
// Бейдж тренду vs попередній період. lowerBetter=true для фудкосту (менше = краще → зелений вниз)
function trendBadge(cur, prev, lowerBetter) {
  if (cur == null || prev == null || prev === 0) return '';
  const d = Math.round((cur - prev) / prev * 100);
  if (d === 0) return `<span class="pf-trend flat">→ 0%</span>`;
  const good = lowerBetter ? d < 0 : d > 0;
  const arrow = d > 0 ? '↑' : '↓';
  return `<span class="pf-trend ${good ? 'up' : 'down'}">${arrow} ${Math.abs(d)}%</span>`;
}

/* ════════════════════════  CSS  ════════════════════════ */
const CSS = `<style id="perf-css">
.pf-scroll{overflow-y:auto;flex:1}.pf-scroll::-webkit-scrollbar{width:0}
.pf-header{padding:16px 20px 8px;display:flex;align-items:center;gap:12px}
.pf-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.pf-back:active{background:rgba(255,255,255,.08)}
.pf-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.pf-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.pf-tabs{display:flex;gap:6px;padding:6px 14px 6px}
.pf-tab{flex:1;height:36px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-size:11px;font-weight:600;font-family:var(--font-b);cursor:pointer;white-space:nowrap;padding:0 2px}
.pf-tab.sel{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
.pf-chips{display:flex;gap:6px;padding:2px 14px 10px}
.pf-chip{flex:1;height:32px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.pf-chip.sel{background:rgba(56,189,248,.14);border-color:var(--blue);color:var(--blue)}
/* KPI cards */
.pf-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 6px}
.pf-kpi{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:15px;padding:13px 14px;position:relative;overflow:hidden}
.pf-kpi.hero{grid-column:1 / -1;background:linear-gradient(135deg,rgba(56,189,248,.10),rgba(168,139,255,.06))}
.pf-kpi.wide{grid-column:1 / -1}
.pf-kpi.drink{background:linear-gradient(135deg,rgba(134,239,172,.09),rgba(56,189,248,.04))}
.pf-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase}
.pf-kpi-val{font-family:var(--font-h);font-weight:700;color:var(--text0);margin-top:5px;line-height:1}
.pf-kpi-val.big{font-size:30px;color:var(--blue)}
.pf-kpi-val.mid{font-size:20px}
.pf-kpi-hint{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-top:4px}
.pf-trend{display:inline-flex;align-items:center;gap:1px;font-size:11px;font-weight:700;font-family:var(--font-b);margin-left:8px;vertical-align:middle}
.pf-trend.up{color:var(--green)}
.pf-trend.down{color:#ff6b6b}
.pf-trend.flat{color:var(--text3)}
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
.pf-bar-track{height:4px;border-radius:3px;background:var(--bg3,#26262b);margin-top:6px;overflow:hidden}
.pf-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--blue),var(--purple))}
/* hours */
.pf-hour{display:flex;align-items:center;gap:10px;padding:5px 12px}
.pf-hour-lbl{width:46px;font-size:12px;font-family:var(--font-b);color:var(--text2);flex-shrink:0}
.pf-hour-track{flex:1;height:18px;border-radius:5px;background:var(--bg3,#26262b);overflow:hidden}
.pf-hour-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,rgba(56,189,248,.45),var(--blue))}
.pf-hour.peak .pf-hour-fill{background:linear-gradient(90deg,var(--blue),var(--purple))}
.pf-hour-val{width:98px;text-align:right;flex-shrink:0;font-size:12px;font-family:var(--font-h);font-weight:600;color:var(--text0)}
.pf-hour-val span{display:block;font-size:9px;color:var(--text3);font-family:var(--font-b);font-weight:400}
.pf-empty{margin:0 14px;padding:28px 20px;text-align:center;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px}
.pf-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.pf-load{padding:34px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px}
.pf-note{font-size:11px;color:var(--text3);font-family:var(--font-b);padding:8px 20px 0;line-height:1.5}
</style>`;

/* ════════════════════════  RENDER  ════════════════════════ */
function kpiCards(t, prev) {
  if (!t) return '';
  const p = prev || {};
  return `
  <div class="pf-kpis">
    <div class="pf-kpi hero">
      <div class="pf-kpi-lbl">Виторг бару / годину-бармена</div>
      <div class="pf-kpi-val big">${t.revPerHour != null ? fmtUAH(t.revPerHour) : '—'}${trendBadge(t.revPerHour, p.revPerHour)}</div>
      <div class="pf-kpi-hint">за ${t.daysWithShift} повних днів зі зміною · ${fmtN(t.bartenderHours)} год</div>
    </div>
    <div class="pf-kpi" style="background:linear-gradient(135deg,rgba(134,239,172,.10),rgba(56,189,248,.04))">
      <div class="pf-kpi-lbl">💵 Прибуток / год</div>
      <div class="pf-kpi-val mid" style="color:var(--green)">${t.profitPerHour != null ? fmtUAH(t.profitPerHour) : '—'}${trendBadge(t.profitPerHour, p.profitPerHour)}</div>
      <div class="pf-kpi-hint">виторг − собівартість</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Фудкост</div>
      <div class="pf-kpi-val mid">${t.foodcostPct != null ? t.foodcostPct + '%' : '—'}${trendBadge(t.foodcostPct, p.foodcostPct, true)}</div>
      <div class="pf-kpi-hint">собівартість від виторгу</div>
    </div>
    <div class="pf-kpi drink">
      <div class="pf-kpi-lbl">🍸 Напоїв / год</div>
      <div class="pf-kpi-val mid">${t.itemsPerHour != null ? fmtN(t.itemsPerHour) : '—'}${trendBadge(t.itemsPerHour, p.itemsPerHour)}</div>
      <div class="pf-kpi-hint">барних позицій на бармена-годину</div>
    </div>
    <div class="pf-kpi drink">
      <div class="pf-kpi-lbl">🧾 Чеків / год</div>
      <div class="pf-kpi-val mid">${t.checksPerHour != null ? fmtN(t.checksPerHour) : '—'}${trendBadge(t.checksPerHour, p.checksPerHour)}</div>
      <div class="pf-kpi-hint">замовлень на бармена-годину</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Середній чек</div>
      <div class="pf-kpi-val mid">${t.avgCheck != null ? fmtUAH(t.avgCheck) : '—'}${trendBadge(t.avgCheck, p.avgCheck)}</div>
    </div>
    <div class="pf-kpi">
      <div class="pf-kpi-lbl">Виторг / зміну</div>
      <div class="pf-kpi-val mid">${t.revPerDay != null ? fmtUAH(t.revPerDay) : '—'}${trendBadge(t.revPerDay, p.revPerDay)}</div>
    </div>
    <div class="pf-kpi wide">
      <div class="pf-kpi-lbl">Усього за період</div>
      <div class="pf-kpi-val mid">${fmtUAH(t.barRevenue)} <span style="font-size:13px;color:var(--green)">· прибуток ${fmtUAH(t.barProfit)}</span>${trendBadge(t.barRevenue, p.barRevenue)}</div>
      <div class="pf-kpi-hint">собівартість ${fmtUAH(t.barCost)} · фудкост ${t.foodcostPct != null ? t.foodcostPct + '%' : '—'} · ${fmtN(t.barItems)} напоїв · vs попередні ${_period} дн.</div>
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
    ${kpiCards(_venueData.totals, _venueData.prev)}
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

function topView() {
  if (_loading) return `<div class="pf-load">Рахую топ напоїв…</div>`;
  if (_err)     return `<div class="pf-empty"><div class="pf-empty-txt">${esc(_err)}</div></div>`;
  if (!_topItems || !_topItems.length) {
    return `<div class="pf-empty"><div class="pf-empty-txt">Немає продажів бару за період.</div></div>`;
  }
  const maxQty = _topItems[0].qty || 1;
  const rows = _topItems.map((it, i) => `
    <div class="pf-cmp">
      <div class="pf-cmp-rank ${i < 3 ? 'top' : ''}">${i + 1}</div>
      <div class="pf-cmp-name">${esc(it.name)}
        <div class="pf-bar-track"><div class="pf-bar-fill" style="width:${Math.max(4, Math.round(it.qty / maxQty * 100))}%"></div></div>
      </div>
      <div class="pf-cmp-val"><b>${fmtN(it.qty)}</b><span>${fmtUAH(it.revenue)}</span></div>
    </div>`).join('');
  return `
    <div class="pf-note">Найпопулярніші барні позиції за період — орієнтир для заготовок і стоп-листа.</div>
    <div class="pf-card" style="margin-top:8px">${rows}</div>
    <div style="height:24px"></div>`;
}

function hoursView() {
  if (_loading) return `<div class="pf-load">Рахую виторг по годинах…</div>`;
  if (_err)     return `<div class="pf-empty"><div class="pf-empty-txt">${esc(_err)}</div></div>`;
  const hrs = _hours && _hours.hours;
  if (!hrs || !hrs.length) {
    return `<div class="pf-empty"><div class="pf-empty-txt">Немає продажів бару по годинах за період.</div></div>`;
  }
  const maxRev = Math.max(...hrs.map(h => h.revenue));
  const peak = hrs.reduce((a, h) => h.revenue > a.revenue ? h : a, hrs[0]);
  const hh = n => String(n).padStart(2, '0');
  const rows = hrs.map(h => `
    <div class="pf-hour${h.hour === peak.hour ? ' peak' : ''}">
      <div class="pf-hour-lbl">${hh(h.hour)}:00</div>
      <div class="pf-hour-track"><div class="pf-hour-fill" style="width:${Math.max(3, Math.round(h.revenue / maxRev * 100))}%"></div></div>
      <div class="pf-hour-val">${fmtUAH(h.revenue)}<span>${fmtN(h.items)} напоїв</span></div>
    </div>`).join('');
  return `
    <div class="pf-note">Пік о <b style="color:var(--blue)">${hh(peak.hour)}:00</b> — найбільше виторгу. Орієнтир, коли підсилювати бар. Суми за весь період.</div>
    <div class="pf-card" style="margin-top:8px;padding:6px 2px">${rows}</div>
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
        <div class="pf-cmp-sub">${v.error ? '⚠ ' + esc(v.error) : (t.daysWithShift ? `🍸 ${t.itemsPerHour != null ? fmtN(t.itemsPerHour) : '—'}/год · серед.чек ${t.avgCheck != null ? fmtUAH(t.avgCheck) : '—'} · ${fmtUAH(t.barRevenue)}` : `${fmtUAH(t.barRevenue)} · ⚠ графік змін не заповнено`)}</div>
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
      <button class="pf-tab ${_tab === 'venue' ? 'sel' : ''}" onclick="window.__perf.setTab('venue')">Заклад</button>
      <button class="pf-tab ${_tab === 'top' ? 'sel' : ''}" onclick="window.__perf.setTab('top')">Напої</button>
      <button class="pf-tab ${_tab === 'hours' ? 'sel' : ''}" onclick="window.__perf.setTab('hours')">Години</button>
      <button class="pf-tab ${_tab === 'compare' ? 'sel' : ''}" onclick="window.__perf.setTab('compare')">Мережа</button>
    </div>

    <div class="pf-chips">
      ${[7, 14, 30].map(p => `<button class="pf-chip ${_period === p ? 'sel' : ''}" onclick="window.__perf.setPeriod(${p})">${p} днів</button>`).join('')}
    </div>

    ${_tab === 'venue' ? venueView() : _tab === 'top' ? topView() : _tab === 'hours' ? hoursView() : compareView()}
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

async function loadTopItems() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  const { from, to } = range();
  try {
    const r = await fetch(`${API}/api/performance/bar-items?venueId=${venueId}&from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _topItems = d.items || [];
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _topItems = null; }
  _loading = false; rerender();
}

async function loadHours() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  const { from, to } = range();
  try {
    const r = await fetch(`${API}/api/performance/bar-hours?venueId=${venueId}&from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _hours = d;
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _hours = null; }
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

function loadCurrent() { _tab === 'venue' ? loadVenue() : _tab === 'top' ? loadTopItems() : _tab === 'hours' ? loadHours() : loadCompare(); }

/* ════════════════════════  MODULE  ════════════════════════ */
export default {
  render() {
    _tab = 'venue'; _period = 14; _venueData = null; _topItems = null; _hours = null; _compare = null; _loading = false; _err = '';
    return buildHTML();
  },
  init() {
    window.__perf = {
      setTab(t) {
        if (_tab === t) return;
        _tab = t;
        if (t === 'venue')      _venueData ? rerender() : loadVenue();
        else if (t === 'top')   _topItems  ? rerender() : loadTopItems();
        else if (t === 'hours') _hours     ? rerender() : loadHours();
        else                    _compare   ? rerender() : loadCompare();
      },
      setPeriod(p) { if (_period === p) return; _period = p; _venueData = null; _topItems = null; _hours = null; _compare = null; loadCurrent(); },
    };
    loadVenue();
  },
};
