/* ============================================================
   BarOps — pages/digest.js
   Фаза 4.2: Щоденний дайджест закладу (за вчора).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _date    = '';     // YYYY-MM-DD (день звіту)
let _digest  = null;
let _loading = false;
let _err     = '';

/* ════ HELPERS ════ */
function token() { return localStorage.getItem('barops_token') || state.token || ''; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return ymd(d); }
function addDays(s, n) { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); }
function fmtUAH(n) { return '₴' + (Math.round(+n || 0)).toLocaleString('uk-UA'); }
function fmtN(n) { return (Math.round((+n || 0) * 10) / 10).toLocaleString('uk-UA'); }
function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' });
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ════ CSS ════ */
const CSS = `<style id="dg-css">
.dg-scroll{overflow-y:auto;flex:1}.dg-scroll::-webkit-scrollbar{width:0}
.dg-header{padding:16px 20px 8px;display:flex;align-items:center;gap:12px}
.dg-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dg-back:active{background:rgba(255,255,255,.08)}
.dg-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.dg-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.dg-datebar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px 12px}
.dg-datenav{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:15px;cursor:pointer;flex-shrink:0}
.dg-datenav:disabled{opacity:.35}
.dg-datelbl{flex:1;text-align:center;font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);text-transform:capitalize}
.dg-card{margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.dg-hero{background:linear-gradient(135deg,rgba(56,189,248,.10),rgba(168,139,255,.06))}
.dg-lbl{font-size:10px;color:var(--text2);letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-b)}
.dg-big{font-family:var(--font-h);font-size:30px;font-weight:700;color:var(--text0);line-height:1;margin-top:6px}
.dg-sub2{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:6px}
.dg-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:6px 20px 8px;font-family:var(--font-b)}
.dg-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--border)}
.dg-row:last-child{border-bottom:none}
.dg-rank{width:24px;height:24px;border-radius:7px;background:var(--bg3,#26262b);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:12px;color:var(--text1);flex-shrink:0}
.dg-rank.top{background:rgba(56,189,248,.18);color:var(--blue)}
.dg-name{flex:1;min-width:0;font-family:var(--font-b);font-size:13px;color:var(--text0)}
.dg-val{font-family:var(--font-h);font-weight:600;font-size:14px;color:var(--text0)}
.dg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dg-mini-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.04em}
.dg-mini-val{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-top:4px}
.dg-prog{height:6px;border-radius:4px;background:var(--bg3,#26262b);overflow:hidden;margin-top:8px}
.dg-prog-fill{height:100%;border-radius:4px;background:var(--green)}
.dg-empty{margin:0 14px;padding:30px 20px;text-align:center;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px}
.dg-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.dg-load{padding:34px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px}
</style>`;

/* ════ RENDER ════ */
function body() {
  if (_loading) return `<div class="dg-load">Готую звіт…</div>`;
  if (_err)     return `<div class="dg-empty"><div class="dg-empty-txt">${esc(_err)}</div></div>`;
  const d = _digest;
  if (!d) return `<div class="dg-empty"><div class="dg-empty-txt">Звіту за цей день немає.</div></div>`;

  const waiters = (d.topWaiters || []).map((w, i) => `
    <div class="dg-row">
      <div class="dg-rank ${i === 0 ? 'top' : ''}">${i + 1}</div>
      <div class="dg-name">${esc(w.name)}</div>
      <div class="dg-val">${fmtUAH(w.revenue)}</div>
    </div>`).join('') || `<div class="dg-sub2">Немає даних</div>`;

  const bar = d.bar || {};
  const cl = d.checklists || { done: 0, total: 0 };
  const clPct = cl.total ? Math.round(cl.done / cl.total * 100) : 0;
  const wo = d.writeoffs || { count: 0, items: 0 };
  const onShift = d.bartendersOnShift || [];

  return `
    <!-- Виторг закладу -->
    <div class="dg-card dg-hero">
      <div class="dg-lbl">Виторг закладу</div>
      <div class="dg-big">${fmtUAH(d.revenue)}</div>
      <div class="dg-sub2">${(d.checks || 0).toLocaleString('uk-UA')} чеків · середній чек ${d.avgCheck != null ? fmtUAH(d.avgCheck) : '—'}</div>
      ${d.profit != null ? `<div class="dg-sub2" style="margin-top:8px;color:var(--green)">Прибуток ${fmtUAH(d.profit)} <span style="color:var(--text3)">· собівартість ${fmtUAH(d.cost)} · фудкост ${d.foodcostPct != null ? d.foodcostPct + '%' : '—'}</span></div>` : ''}
    </div>

    <!-- Бар -->
    <div class="dg-sec">Бар</div>
    <div class="dg-card">
      <div class="dg-grid">
        <div><div class="dg-mini-lbl">Виторг бару</div><div class="dg-mini-val">${fmtUAH(bar.revenue)}</div></div>
        <div><div class="dg-mini-lbl">Прибуток</div><div class="dg-mini-val" style="color:var(--green)">${bar.profit != null ? fmtUAH(bar.profit) : '—'}</div></div>
        <div><div class="dg-mini-lbl">₴ / год</div><div class="dg-mini-val">${bar.revPerHour != null ? fmtUAH(bar.revPerHour) : '—'}</div></div>
        <div><div class="dg-mini-lbl">Фудкост</div><div class="dg-mini-val">${bar.foodcostPct != null ? bar.foodcostPct + '%' : '—'}</div></div>
        <div><div class="dg-mini-lbl">Напоїв / год</div><div class="dg-mini-val">${bar.itemsPerHour != null ? fmtN(bar.itemsPerHour) : '—'}</div></div>
        <div><div class="dg-mini-lbl">Годин бару</div><div class="dg-mini-val">${fmtN(bar.hours)}<span style="font-size:11px;color:var(--text3);font-family:var(--font-b)"> · ${bar.bartenders || 0} барм.</span></div></div>
      </div>
    </div>

    <!-- Топ офіціанти -->
    <div class="dg-sec">Топ персоналу (за виторгом)</div>
    <div class="dg-card">${waiters}</div>

    <!-- Чек-листи + Списання -->
    <div class="dg-sec">Дисципліна</div>
    <div class="dg-card">
      <div class="dg-lbl">Бармени на зміні</div>
      <div class="dg-sub2" style="margin-top:4px;color:var(--text0);font-size:13px">${onShift.length ? onShift.map(esc).join(', ') : '<span style="color:var(--text3)">графік не заповнено</span>'}</div>
      <div class="dg-lbl" style="margin-top:14px">Чек-листи виконано</div>
      <div class="dg-big" style="font-size:22px">${cl.done}/${cl.total} <span style="font-size:13px;color:var(--text2)">(${clPct}%)</span></div>
      <div class="dg-prog"><div class="dg-prog-fill" style="width:${clPct}%;background:${clPct >= 100 ? 'var(--green)' : clPct >= 50 ? 'var(--amber)' : 'var(--red)'}"></div></div>
      <div class="dg-sub2" style="margin-top:12px">Списань: <b style="color:var(--text0)">${wo.count}</b>${wo.items ? ` · ${fmtN(wo.items)} позицій` : ''}</div>
    </div>

    <div style="height:24px"></div>`;
}

function buildHTML() {
  const isToday = _date >= yesterday() && _date >= ymd(new Date());
  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="dg-scroll">
    <div class="dg-header">
      <div class="dg-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="dg-title">Звіт за день</div>
        <div class="dg-sub">${esc(state.venue || '')}</div>
      </div>
    </div>
    <div class="dg-datebar">
      <button class="dg-datenav" onclick="window.__dg.shift(-1)">‹</button>
      <div class="dg-datelbl">${fmtDate(_date)}</div>
      <button class="dg-datenav" onclick="window.__dg.shift(1)" ${_date >= ymd(new Date()) ? 'disabled' : ''}>›</button>
    </div>
    ${body()}
  </div>
</div>`;
}

function rerender() {
  if (state.route !== 'digest') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════ DATA ════ */
async function load() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  try {
    const r = await fetch(`${API}/api/performance/digest?venueId=${venueId}&date=${_date}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _digest = d.digest || null;
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _digest = null; }
  _loading = false; rerender();
}

/* ════ MODULE ════ */
export default {
  render() {
    _date = yesterday(); _digest = null; _loading = false; _err = '';
    return buildHTML();
  },
  init() {
    window.__dg = {
      shift(n) {
        const next = addDays(_date, n);
        if (next > ymd(new Date())) return;     // не далі за сьогодні
        _date = next; _digest = null; load();
      },
    };
    load();
  },
};
