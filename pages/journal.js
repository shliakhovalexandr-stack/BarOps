/* ============================================================
   BarOps — pages/journal.js
   Журнал бармена: статистика зміни + чек-листи
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _stats  = null;
let _checks = [];   // чек-листи від менеджера/адміна

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="jrn-css">
.jrn-scroll{overflow-y:auto;flex:1}.jrn-scroll::-webkit-scrollbar{width:0}
.jrn-header{padding:16px 20px 8px;display:flex;align-items:center;justify-content:space-between}
.jrn-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.jrn-date{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.jrn-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;
  padding:14px 20px 8px;font-family:var(--font-b)}
/* kpi */
.jrn-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px}
.jrn-kpi{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:13px;
  padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.jrn-kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 13px 13px}
.jrn-kpi--g::after{background:var(--green)}.jrn-kpi--a::after{background:var(--amber)}.jrn-kpi--r::after{background:var(--red)}
.jrn-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1;color:var(--text0)}
.jrn-kpi-val--g{color:var(--green)}.jrn-kpi-val--a{color:var(--amber)}.jrn-kpi-val--r{color:var(--red)}
.jrn-kpi-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);
  letter-spacing:.05em;text-transform:uppercase;line-height:1.3}
/* checklist */
.jrn-cl-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.jrn-cl-head{padding:14px 16px 10px;border-bottom:0.5px solid var(--border)}
.jrn-cl-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.jrn-cl-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.jrn-cl-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.jrn-cl-item:last-child{border-bottom:none}
.jrn-cl-item:active{background:rgba(255,255,255,.06)}
.jrn-cl-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;transition:all .15s}
.jrn-cl-check.done{background:var(--green);border-color:var(--green)}
.jrn-cl-item-text{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.jrn-cl-item-text.done{color:var(--text3);text-decoration:line-through}
/* shift row */
.jrn-shift-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.jrn-shift-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid var(--border)}
.jrn-shift-row:last-child{border-bottom:none}
.jrn-shift-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.jrn-shift-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b);flex:1}
.jrn-shift-val{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
/* empty */
.jrn-empty{margin:0 14px;padding:28px 20px;text-align:center;background:var(--glass-bg);
  border:0.5px solid var(--border);border-radius:16px}
.jrn-empty-icon{font-size:28px;margin-bottom:8px}
.jrn-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b)}
/* skel */
.jrn-skel{background:var(--glass-bg);border-radius:12px;animation:jSkel 1.2s ease-in-out infinite}
@keyframes jSkel{0%,100%{opacity:.4}50%{opacity:.9}}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function token() {
  return localStorage.getItem('barops_token') || state.token || '';
}

function fmtMoney(n) {
  if (!n) return '0 ₴';
  return Math.round(n).toLocaleString('uk-UA') + ' ₴';
}

function todayStr() {
  return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const s = _stats;

  const kpi = [
    { val: s ? String(s.invoices?.count ?? '—')  : '—', lbl:'Накладних\nзміна',    cls: '' },
    { val: s ? String(s.writeoffs?.count ?? 0)   : '—', lbl:'Списань\nсьогодні',   cls: (s?.writeoffs?.count > 0) ? 'a' : 'g' },
    { val: s ? String(s.critical?.length ?? 0)   : '—', lbl:'Критичних\nзалишків', cls: (s?.critical?.length > 0) ? 'r' : 'g' },
  ];

  const checklistsHTML = _checks.length ? _checks.map(cl => {
    const done  = cl.items.filter(i => i.done).length;
    const total = cl.items.length;
    return `
    <div class="jrn-cl-card">
      <div class="jrn-cl-head">
        <div class="jrn-cl-name">${cl.title}</div>
        <div class="jrn-cl-meta">${cl.author} · ${done}/${total} виконано</div>
      </div>
      ${cl.items.map((item, idx) => `
      <div class="jrn-cl-item" onclick="window.__jrn.toggleCheck('${cl.id}',${idx})">
        <div class="jrn-cl-check ${item.done ? 'done' : ''}">
          ${item.done ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>` : ''}
        </div>
        <div class="jrn-cl-item-text ${item.done ? 'done' : ''}">${item.text}</div>
      </div>`).join('')}
    </div>`;
  }).join('') : `
  <div class="jrn-empty">
    <div class="jrn-empty-icon">✓</div>
    <div class="jrn-empty-txt">Чек-листів від менеджера немає</div>
  </div>`;

  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="jrn-scroll">

    <div class="jrn-header">
      <div>
        <div class="jrn-title">Журнал</div>
        <div class="jrn-date">${todayStr()} · ${state.venue || ''}</div>
      </div>
    </div>

    <!-- Статистика зміни -->
    <div class="jrn-sec">Зміна сьогодні</div>
    ${!s ? `
    <div style="padding:0 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      ${[1,2,3].map(() => `<div class="jrn-skel" style="height:72px"></div>`).join('')}
    </div>` : `
    <div class="jrn-kpi-row">
      ${kpi.map(k => `
      <div class="jrn-kpi${k.cls ? ' jrn-kpi--' + k.cls : ''}">
        <div class="jrn-kpi-val${k.cls ? ' jrn-kpi-val--' + k.cls : ''}">${k.val}</div>
        <div class="jrn-kpi-lbl">${k.lbl.replace('\n', '<br/>')}</div>
      </div>`).join('')}
    </div>`}

    ${s ? `
    <div class="jrn-shift-card" style="margin-top:8px">
      <div class="jrn-shift-row">
        <div class="jrn-shift-dot" style="background:var(--green)"></div>
        <div class="jrn-shift-lbl">Накладних на суму</div>
        <div class="jrn-shift-val">${fmtMoney(s.invoices?.total)}</div>
      </div>
      ${s.writeoffs?.count > 0 ? `
      <div class="jrn-shift-row">
        <div class="jrn-shift-dot" style="background:var(--red)"></div>
        <div class="jrn-shift-lbl">Списань за категоріями</div>
        <div class="jrn-shift-val" style="color:var(--red)">${Object.entries(s.writeoffs?.byCategory || {}).map(([k,v]) => `${k}: ${v}`).join(' · ') || s.writeoffs.count}</div>
      </div>` : ''}
      ${s.shift ? `
      <div class="jrn-shift-row">
        <div class="jrn-shift-dot" style="background:var(--purple)"></div>
        <div class="jrn-shift-lbl">Зміну відкрив</div>
        <div class="jrn-shift-val">${s.shift.user}</div>
      </div>` : ''}
    </div>` : ''}

    <!-- Чек-листи -->
    <div class="jrn-sec" style="padding-top:16px">Чек-листи</div>
    ${checklistsHTML}

    <div style="height:20px"></div>
  </div>
</div>`;
}

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadStats() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) return;
  try {
    const res  = await fetch(`${API}/api/stats?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) _stats = data.today;
  } catch { /* silent */ }
  rerender();
}

function rerender() {
  if (state.route !== 'journal') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   PAGE MODULE
════════════════════════ */
export default {
  render() {
    _stats  = null;
    _checks = [];
    return buildHTML();
  },
  async init() {
    window.__jrn = {
      toggleCheck(clId, idx) {
        const cl = _checks.find(c => c.id === clId);
        if (!cl) return;
        cl.items[idx].done = !cl.items[idx].done;
        rerender();
      },
    };
    loadStats();
  },
};
