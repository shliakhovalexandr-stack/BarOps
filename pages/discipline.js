/* ============================================================
   BarOps — pages/discipline.js
   Фаза 4: Рейтинг персоналу за дисципліною (чек-листи / завдання / списання).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _period  = 14;
let _people  = null;
let _loading = false;
let _err     = '';
let _dept    = 'all';   // 'all' | 'waiters' | 'bartenders' | 'kitchen'

const DEPT_LABEL = { waiters: 'Офіціанти', bartenders: 'Бармени', kitchen: 'Кухарі' };
const DEPT_ORDER = ['waiters', 'bartenders', 'kitchen'];

function token() { return localStorage.getItem('barops_token') || state.token || ''; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function range() {
  const to = new Date(); const from = new Date(); from.setDate(from.getDate() - (_period - 1));
  return { from: ymd(from), to: ymd(to) };
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function initials(name) { const p = String(name || '').trim().split(/\s+/); return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'; }

const CSS = `<style id="ds-css">
.ds-scroll{overflow-y:auto;flex:1}.ds-scroll::-webkit-scrollbar{width:0}
.ds-header{padding:16px 20px 8px;display:flex;align-items:center;gap:12px}
.ds-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ds-back:active{background:rgba(255,255,255,.08)}
.ds-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ds-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ds-chips{display:flex;gap:6px;padding:4px 14px 10px}
.ds-chip{flex:1;height:32px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.ds-chip.sel{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
.ds-card{margin:0 14px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ds-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:0.5px solid var(--border)}
.ds-row:last-child{border-bottom:none}
.ds-rank{width:26px;height:26px;border-radius:8px;background:var(--bg3,#26262b);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:13px;color:var(--text1);flex-shrink:0}
.ds-rank.top{background:rgba(168,139,255,.18);color:var(--purple)}
.ds-av{width:34px;height:34px;border-radius:50%;background:var(--bg3,#26262b);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:12px;color:var(--text1);flex-shrink:0}
.ds-name{flex:1;min-width:0;font-family:var(--font-h);font-weight:600;font-size:14px;color:var(--text0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ds-stats{display:flex;gap:12px;flex-shrink:0}
.ds-stat{text-align:center;min-width:30px}
.ds-stat b{display:block;font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);line-height:1}
.ds-stat span{font-size:8px;color:var(--text3);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.03em}
.ds-legend{font-size:11px;color:var(--text3);font-family:var(--font-b);padding:10px 20px 4px;line-height:1.5}
.ds-empty{margin:0 14px;padding:30px 20px;text-align:center;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px}
.ds-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.ds-load{padding:34px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px}
</style>`;

function presentDepts() {
  const set = new Set((_people || []).map(p => p.dept).filter(Boolean));
  return DEPT_ORDER.filter(d => set.has(d));
}

function deptChipsHTML() {
  const depts = presentDepts();
  if (depts.length < 2) return '';   // нема сенсу ділити, якщо один підрозділ
  const chip = (key, label) => `<button class="ds-chip ${_dept === key ? 'sel' : ''}" onclick="window.__ds.setDept('${key}')">${label}</button>`;
  return `<div class="ds-chips" style="padding-top:0">
    ${chip('all', 'Всі')}${depts.map(d => chip(d, DEPT_LABEL[d])).join('')}
  </div>`;
}

function listView() {
  if (_loading) return `<div class="ds-load">Рахую дисципліну…</div>`;
  if (_err)     return `<div class="ds-empty"><div class="ds-empty-txt">${esc(_err)}</div></div>`;
  if (!_people || !_people.length) {
    return `<div class="ds-empty"><div class="ds-empty-txt">Немає активності за період.<br>Зʼявиться, коли працівники відмічатимуть чек-листи й завдання.</div></div>`;
  }
  const filtered = _dept === 'all' ? _people : _people.filter(p => p.dept === _dept);
  if (!filtered.length) {
    return `<div class="ds-empty"><div class="ds-empty-txt">Немає активності в цьому підрозділі за період.</div></div>`;
  }
  const rows = filtered.map((p, i) => `
    <div class="ds-row">
      <div class="ds-rank ${i < 3 ? 'top' : ''}">${i + 1}</div>
      <div class="ds-av">${esc(initials(p.name))}</div>
      <div class="ds-name">${esc(p.name)}</div>
      <div class="ds-stats">
        <div class="ds-stat"><b>${p.checklist}</b><span>чек-л.</span></div>
        <div class="ds-stat"><b>${p.tasks}</b><span>завд.</span></div>
        <div class="ds-stat"><b>${p.writeoffs}</b><span>спис.</span></div>
      </div>
    </div>`).join('');
  return `
    <div class="ds-legend">Рейтинг за активністю: відмічені пункти чек-листів + виконані завдання + зроблені списання за період.</div>
    <div class="ds-card">${rows}</div>
    <div style="height:24px"></div>`;
}

function buildHTML() {
  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="ds-scroll">
    <div class="ds-header">
      <div class="ds-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="ds-title">Дисципліна</div>
        <div class="ds-sub">Рейтинг персоналу · ${esc(state.venue || '')}</div>
      </div>
    </div>
    <div class="ds-chips">
      ${[7, 14, 30].map(p => `<button class="ds-chip ${_period === p ? 'sel' : ''}" onclick="window.__ds.setPeriod(${p})">${p} днів</button>`).join('')}
    </div>
    ${deptChipsHTML()}
    ${listView()}
  </div>
</div>`;
}

function rerender() {
  if (state.route !== 'discipline') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

async function load() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  const { from, to } = range();
  try {
    const r = await fetch(`${API}/api/performance/discipline?venueId=${venueId}&from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Помилка');
    _people = d.people || [];
    if (_dept !== 'all' && !presentDepts().includes(_dept)) _dept = 'all';
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _people = null; }
  _loading = false; rerender();
}

export default {
  render() {
    _period = 14; _people = null; _loading = false; _err = ''; _dept = 'all';
    return buildHTML();
  },
  init() {
    window.__ds = {
      setPeriod(p) { if (_period === p) return; _period = p; _people = null; load(); },
      setDept(d)   { if (_dept === d) return; _dept = d; rerender(); },
    };
    load();
  },
};
