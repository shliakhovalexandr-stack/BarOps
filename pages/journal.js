/* ============================================================
   BarOps — pages/journal.js
   Журнал: статистика зміни + завдання/чек-листи
   - Менеджер/адмін: створює завдання на дату + підрозділ
   - Працівник: бачить завдання свого підрозділу на сьогодні
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _tasks     = [];      // завдання з бекенду (date >= today)
let _role      = 'bartender';
let _taskModal = false;
let _reqModal  = false;   // модалка «Запит сис. менеджеру» (бармен → адмін)
let _taskDraft = { date: '', department: 'bartenders', userId: '', userName: '', priority: 'medium', text: '' };
let _team      = [];      // склад закладу (для вибору виконавця; лише менеджер)

// Чек-листи (Фаза 4.1)
let _checklists  = [];    // сьогоднішні чек-листи зі станом (усі ролі)
let _clTemplates = [];    // шаблони (лише менеджер)
let _clView      = 'today'; // менеджер: 'today' | 'templates' | 'tasks'
let _clModal     = false;
let _clDraft     = null;  // чернетка шаблону у конструкторі

const DEPT_LABEL = { kitchen: 'Кухня', waiters: 'Офіціанти', bartenders: 'Бармени' };
const CL_DEPT_LABEL = { '': 'Всі', bartenders: 'Бармени', kitchen: 'Кухня', waiters: 'Офіціанти' };
// Дні тижня (weekday за JS getDay: 0=Нд..6=Сб), показуємо з понеділка
const WEEKDAYS = [
  { wd: 1, label: 'Пн' }, { wd: 2, label: 'Вт' }, { wd: 3, label: 'Ср' }, { wd: 4, label: 'Чт' },
  { wd: 5, label: 'Пт' }, { wd: 6, label: 'Сб' }, { wd: 0, label: 'Нд' },
];
const DEPT_ROLES = { kitchen: ['cook', 'chef'], waiters: ['waiter'], bartenders: ['bartender', 'barman'] };
const PRIORITY_LABEL = { urgent: 'Терміново', medium: 'Середнє', low: 'Не терміново' };
const PRIORITY_COLOR = { urgent: 'var(--red)', medium: 'var(--amber)', low: 'var(--text2)' };
const CHECK_SVG  = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="jrn-css">
.jrn-scroll{overflow-y:auto;flex:1}.jrn-scroll::-webkit-scrollbar{width:0}
.jrn-header{padding:16px 20px 8px;display:flex;align-items:center;justify-content:space-between}
.jrn-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.jrn-back:active{background:rgba(255,255,255,.08)}
.jrn-title{font-family:var(--font-h);font-size:19px;font-weight:700;color:var(--text0);letter-spacing:-.02em;white-space:nowrap}
.jrn-date{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.jrn-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;
  padding:14px 20px 8px;font-family:var(--font-b);display:flex;align-items:center;justify-content:space-between}
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
.jrn-cl-card.done{border:1px solid #86EFAC;background:rgba(134,239,172,.07)}
.jrn-done-badge{display:inline-block;margin-top:6px;font-size:11px;font-weight:700;color:#0A0A0A;background:#86EFAC;border-radius:6px;padding:2px 8px}
.jrn-cl-head{padding:14px 16px 10px;border-bottom:0.5px solid var(--border)}
.jrn-cl-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.jrn-cl-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.jrn-cl-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.jrn-cl-item:last-child{border-bottom:none}
.jrn-cl-item:active{background:rgba(255,255,255,.06)}
.jrn-cl-check{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;transition:all .15s}
.jrn-cl-check.done{background:var(--green);border-color:var(--green)}
.jrn-cl-item{align-items:flex-start}
.jrn-cl-check{margin-top:1px}
.jrn-cl-item-text{font-size:13px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.jrn-cl-item-text.done{color:var(--text3);text-decoration:line-through}
.jrn-cl-item-desc{font-size:11.5px;color:var(--text2);font-family:var(--font-b);margin-top:3px;line-height:1.45}
.jrn-cl-item-desc.done{color:var(--text3)}
/* manager task row */
.jrn-task-row{display:flex;align-items:center;gap:10px;padding:14px 16px}
.jrn-task-del{width:28px;height:28px;border-radius:8px;flex-shrink:0;background:rgba(255,80,80,.08);
  border:0.5px solid rgba(255,80,80,.3);color:#ff5c5c;font-size:16px;cursor:pointer;font-family:inherit;line-height:1}
.jrn-badge{display:inline-block;font-size:10px;font-weight:600;color:var(--purple);background:rgba(168,139,255,.12);
  border:0.5px solid rgba(168,139,255,.28);border-radius:6px;padding:1px 6px}
.jrn-add-btn{width:100%;height:42px;border-radius:12px;background:var(--purple);border:none;color:#fff;
  font-size:13px;font-weight:600;font-family:var(--font-h);cursor:pointer}
.jrn-add-btn:active{opacity:.85}
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
/* modal */
.jrn-modal-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.76);display:flex;align-items:flex-end;animation:jrnOv .18s ease}
@keyframes jrnOv{from{opacity:0}to{opacity:1}}
.jrn-modal{width:100%;background:var(--bg1,#0A0A0A);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);
  padding:20px 20px 36px;animation:jrnSl .26s cubic-bezier(.22,1,.36,1)}
@keyframes jrnSl{from{transform:translateY(100%)}to{transform:none}}
.jrn-modal-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:14px}
.jrn-modal-lbl{font-size:10px;font-weight:500;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;margin:10px 0 6px}
.jrn-modal-inp{width:100%;box-sizing:border-box;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);border-radius:10px;
  padding:11px 12px;font-size:14px;color:var(--text0);outline:none;font-family:var(--font-b);color-scheme:dark}
.jrn-modal-inp:focus{border-color:rgba(168,139,255,.5)}
.jrn-dept-row{display:flex;gap:6px}
.jrn-dept-chip{flex:1;height:38px;border-radius:10px;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);
  color:var(--text2);font-size:12px;font-weight:500;font-family:var(--font-b);cursor:pointer}
.jrn-dept-chip.sel{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
.jrn-prio-chip{flex:1;height:38px;border-radius:10px;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);color:var(--text2);font-size:11px;font-weight:500;font-family:var(--font-b);cursor:pointer}
.jrn-prio-chip.sel.urgent{background:rgba(255,80,80,.14);border-color:var(--red);color:var(--red)}
.jrn-prio-chip.sel.medium{background:rgba(251,191,36,.14);border-color:var(--amber);color:var(--amber)}
.jrn-prio-chip.sel.low{background:rgba(134,239,172,.12);border-color:#86EFAC;color:var(--text1)}
.jrn-prio-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.jrn-modal-btns{display:flex;gap:8px;margin-top:18px}
.jrn-btn-sec{flex:1;height:48px;border-radius:12px;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);
  color:var(--text1);font-size:14px;font-weight:500;font-family:var(--font-b);cursor:pointer}
.jrn-btn-cta{flex:2;height:48px;border-radius:12px;background:var(--purple);border:none;color:#fff;
  font-size:15px;font-weight:600;font-family:var(--font-h);cursor:pointer}
.jrn-btn-cta:disabled{opacity:.4}
/* skel */
.jrn-skel{background:var(--glass-bg);border-radius:12px;animation:jSkel 1.2s ease-in-out infinite}
@keyframes jSkel{0%,100%{opacity:.4}50%{opacity:.9}}
/* manager tabs */
.jrn-tabs{display:flex;gap:6px;padding:4px 14px 10px}
.jrn-tab{flex:1;height:36px;border-radius:10px;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);
  color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.jrn-tab.sel{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
/* checklist meta badges */
.jrn-cl-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
.jrn-tag{font-size:10px;font-weight:600;font-family:var(--font-b);border-radius:6px;padding:2px 7px;
  background:var(--bg2,#1F1F22);border:0.5px solid var(--border);color:var(--text2)}
.jrn-tag.late{background:rgba(255,80,80,.12);border-color:rgba(255,80,80,.3);color:#ff6b6b}
.jrn-tag.ok{background:rgba(134,239,172,.12);border-color:rgba(134,239,172,.35);color:#86EFAC}
.jrn-cl-photo{font-size:12px;flex-shrink:0;opacity:.7}
.jrn-cl-by{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-left:auto;flex-shrink:0}
/* builder */
.jrn-bld-item-card{background:rgba(255,255,255,.02);border:0.5px solid var(--border);border-radius:12px;padding:10px;margin-bottom:10px}
.jrn-bld-item{display:flex;align-items:center;gap:8px}
.jrn-bld-desc{width:100%;box-sizing:border-box;margin-top:8px;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);border-radius:10px;
  padding:9px 12px;font-size:13px;color:var(--text1);outline:none;font-family:var(--font-b);resize:none;line-height:1.4}
.jrn-bld-desc:focus{border-color:rgba(168,139,255,.5)}
.jrn-bld-inp{flex:1;box-sizing:border-box;background:var(--bg2,#1F1F22);border:0.5px solid var(--border);border-radius:10px;
  padding:10px 12px;font-size:14px;color:var(--text0);outline:none;font-family:var(--font-b)}
.jrn-bld-inp:focus{border-color:rgba(168,139,255,.5)}
.jrn-bld-photo{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:var(--bg2,#1F1F22);
  border:0.5px solid var(--border);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.jrn-bld-photo.on{background:rgba(168,139,255,.16);border-color:var(--purple)}
.jrn-bld-del{width:34px;height:38px;border-radius:10px;flex-shrink:0;background:rgba(255,80,80,.08);
  border:0.5px solid rgba(255,80,80,.3);color:#ff5c5c;font-size:16px;cursor:pointer;line-height:1}
.jrn-bld-add{width:100%;height:38px;border-radius:10px;background:var(--bg2,#1F1F22);border:0.5px dashed var(--border);
  color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer;margin-top:2px}
.jrn-bld-day{margin-top:12px}
.jrn-bld-day-lbl{font-size:11px;font-weight:700;color:var(--purple);font-family:var(--font-b);margin-bottom:7px;letter-spacing:.04em}
.jrn-bld-scroll{max-height:60vh;overflow-y:auto;margin:0 -4px;padding:0 4px}
.jrn-tpl-edit{width:28px;height:28px;border-radius:8px;flex-shrink:0;background:var(--bg2,#1F1F22);
  border:0.5px solid var(--border);color:var(--text1);font-size:13px;cursor:pointer}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function token() {
  return localStorage.getItem('barops_token') || state.token || '';
}
function todayStr() {
  return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}
function canManage() {
  const r = (_role || '').toLowerCase();
  return r === 'admin' || r === 'manager' || r === 'director' || r === 'chef';   // шеф = керівник кухні (вид скоупиться до кухні через isFloorMgr/mgrDept)
}
// Менеджер залу: його журнал стосується ЛИШЕ офіціантів (шаблони/чек-листи/завдання).
// Адмін і керуючий бачать усі підрозділи.
// Керівник, обмежений департаментом: менеджер → зал (офіціанти), шеф → кухня
function isFloorMgr() { return ['manager', 'chef'].includes((_role || '').toLowerCase()); }
function mgrDept()  { return (_role || '').toLowerCase() === 'chef' ? 'kitchen' : 'waiters'; }
function mgrWhom()  { return mgrDept() === 'kitchen' ? 'кухні' : 'офіціантів'; }
// Заголовок журналу за роллю: кухня (кухар/шеф), зал (менеджер/керуючий/офіціант/хозяюшка), бар (бармен)
function jrnTitle() {
  const r = (_role || '').toLowerCase();
  if (r === 'cook' || r === 'chef')                       return 'Щоденний журнал кухні';
  if (r === 'bartender' || r === 'barman')                return 'Щоденний журнал бару';
  if (['manager', 'director', 'waiter', 'hostess'].includes(r)) return 'Щоденний журнал залу';
  return 'Щоденний журнал';   // адмін/бухгалтер — загальний
}
function myDepartment(role) {
  const r = (role || '').toLowerCase();
  if (r === 'cook' || r === 'chef') return 'kitchen';
  if (r === 'waiter') return 'waiters';
  if (r === 'bartender' || r === 'barman') return 'bartenders';
  return null;
}
function teamForDept(dept) {
  const roles = DEPT_ROLES[dept] || [];
  return _team.filter(m => roles.includes((m.role || '').toLowerCase()));
}
// Зчитати поточні значення полів форми у чернетку (перед перемальовуванням модалки)
function captureDraft() {
  _taskDraft.date = document.getElementById('jrn-task-date')?.value || _taskDraft.date;
  _taskDraft.text = document.getElementById('jrn-task-text')?.value ?? _taskDraft.text;
  const sel = document.getElementById('jrn-task-assignee');
  if (sel) {
    _taskDraft.userId = sel.value || '';
    const m = _team.find(x => x.id === _taskDraft.userId);
    _taskDraft.userName = m ? m.name : '';
  }
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

/* ════════════════════════
   TASKS — per role
════════════════════════ */
function buildWorkerChecklist() {
  const today = ymd(new Date());
  // без запитів адміну (department='admin') — вони в окремій секції «Запити сис. менеджеру»
  const tasks = _tasks.filter(t => t.date === today && (t.department || '') !== 'admin');
  if (!tasks.length) return `
  <div class="jrn-empty">
    <div class="jrn-empty-icon">✓</div>
    <div class="jrn-empty-txt">Чек-листів від менеджера немає</div>
  </div>`;
  const done = tasks.filter(t => t.done).length;
  return `
  <div class="jrn-cl-card">
    <div class="jrn-cl-head">
      <div class="jrn-cl-name">Завдання на сьогодні</div>
      <div class="jrn-cl-meta"><span data-task-count>${done}</span>/${tasks.length} виконано</div>
    </div>
    ${tasks.map(t => `
    <div class="jrn-cl-item" id="task-${t.id}" onclick="window.__jrn.toggleTask('${t.id}')">
      <div class="jrn-cl-check ${t.done ? 'done' : ''}">${t.done ? CHECK_SVG : ''}</div>
      <div class="jrn-cl-item-text ${t.done ? 'done' : ''}">${esc(t.text)}</div>
      <span class="jrn-prio-dot" style="background:${PRIORITY_COLOR[t.priority] || 'var(--text2)'}" title="${PRIORITY_LABEL[t.priority] || ''}"></span>
    </div>`).join('')}
  </div>`;
}

/* Запити працівника системному менеджеру (бармен → адмін): вільний текст, статус, видалення свого */
function buildMyRequests() {
  const reqs = _tasks
    .filter(t => (t.department || '') === 'admin')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const list = reqs.length ? reqs.map(t => `
    <div class="jrn-cl-card${t.done ? ' done' : ''}">
      <div class="jrn-task-row">
        <div style="flex:1;min-width:0">
          <div class="jrn-cl-name">${esc(t.text)}</div>
          <div class="jrn-cl-meta">${fmtDateShort(t.date)}</div>
          ${t.done
            ? `<div class="jrn-done-badge">✓ Виконано${t.doneBy ? ` · ${esc(t.doneBy)}` : ''}</div>`
            : `<div class="jrn-cl-meta" style="color:var(--amber,#e0a23a)">⏳ Очікує на сис. менеджера</div>`}
        </div>
        ${!t.done ? `<button class="jrn-task-del" onclick="window.__jrn.deleteTask('${t.id}')">×</button>` : ''}
      </div>
    </div>`).join('') : `
    <div class="jrn-empty"><div class="jrn-empty-txt">Запитів ще немає</div></div>`;
  return `
    <div style="padding:0 14px 8px"><button class="jrn-add-btn" onclick="window.__jrn.openReqModal()">+ Запит сис. менеджеру</button></div>
    ${list}`;
}

function buildReqModal() {
  if (!_reqModal) return '';
  return `
  <div class="jrn-modal-ov" onclick="window.__jrn.closeReqModalOv(event)">
    <div class="jrn-modal" onclick="event.stopPropagation()">
      <div class="jrn-modal-title">Запит системному менеджеру</div>
      <div class="jrn-modal-lbl">Що треба зробити?</div>
      <textarea id="jrn-req-text" class="jrn-modal-inp" rows="4" maxlength="500"
        placeholder="Напр.: змінити ТТК коктейлю «Апероль Шприц» — тепер 60 мл апероля" style="resize:none;height:auto"></textarea>
      <div class="jrn-modal-btns">
        <button class="jrn-btn-ghost" onclick="window.__jrn.closeReqModal()">Скасувати</button>
        <button class="jrn-btn-cta" onclick="window.__jrn.sendRequest()">Надіслати</button>
      </div>
    </div>
  </div>`;
}

function buildManagerTasks() {
  const all = isFloorMgr() ? _tasks.filter(t => (t.department || '') === mgrDept()) : _tasks;
  // Запити від персоналу (department='admin') — окремим блоком зверху (лише адмін/керуючий їх бачить)
  const reqs  = all.filter(t => (t.department || '') === 'admin')
                   .sort((a, b) => (a.done - b.done) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const reqsHTML = reqs.length ? `
    <div class="jrn-sec" style="padding-top:0">🛠 Запити від персоналу</div>
    ${reqs.map(t => `
    <div class="jrn-cl-card${t.done ? ' done' : ''}">
      <div class="jrn-task-row">
        <div class="jrn-cl-check ${t.done ? 'done' : ''}" onclick="window.__jrn.toggleReq('${t.id}')" style="cursor:pointer;flex-shrink:0;margin-top:2px">${t.done ? CHECK_SVG : ''}</div>
        <div style="flex:1;min-width:0">
          <div class="jrn-cl-name">${esc(t.text)}</div>
          <div class="jrn-cl-meta">від ${esc(t.author || '—')} · ${fmtDateShort(t.date)}</div>
          ${t.done ? `<div class="jrn-done-badge">✓ Виконано${t.doneBy ? ` · ${esc(t.doneBy)}` : ''}</div>` : ''}
        </div>
        <button class="jrn-task-del" onclick="window.__jrn.deleteTask('${t.id}')">×</button>
      </div>
    </div>`).join('')}` : '';

  const tasks = all.filter(t => (t.department || '') !== 'admin');
  const listHTML = tasks.length ? tasks.map(t => `
    <div class="jrn-cl-card${t.done ? ' done' : ''}">
      <div class="jrn-task-row">
        <div style="flex:1;min-width:0">
          <div class="jrn-cl-name">${esc(t.text)}</div>
          <div class="jrn-cl-meta">
            <span style="color:${PRIORITY_COLOR[t.priority] || 'var(--text2)'};font-weight:600">${PRIORITY_LABEL[t.priority] || ''}</span>
            · ${esc(t.userName || '—')} · ${fmtDateShort(t.date)}
          </div>
          ${t.done ? `<div class="jrn-done-badge">✓ Виконано${t.doneBy ? ` · ${esc(t.doneBy)}` : ''}</div>` : ''}
        </div>
        <button class="jrn-task-del" onclick="window.__jrn.deleteTask('${t.id}')">×</button>
      </div>
    </div>`).join('') : `
    <div class="jrn-empty"><div class="jrn-empty-txt">Завдань ще немає. Створіть перше.</div></div>`;
  return `
    ${reqsHTML}
    ${reqsHTML ? '<div class="jrn-sec" style="padding-top:6px">Завдання</div>' : ''}
    <div style="padding:0 14px 8px"><button class="jrn-add-btn" onclick="window.__jrn.openTaskModal()">+ Завдання</button></div>
    ${listHTML}`;
}

function buildTaskModal() {
  if (!_taskModal) return '';
  return `
  <div class="jrn-modal-ov" onclick="window.__jrn.closeTaskModalOv(event)">
    <div class="jrn-modal" onclick="event.stopPropagation()">
      <div class="jrn-modal-title">Нове завдання</div>
      <div class="jrn-modal-lbl">Дата виконання</div>
      <input type="date" id="jrn-task-date" class="jrn-modal-inp" value="${_taskDraft.date}">
      <div class="jrn-modal-lbl">Підрозділ</div>
      ${isFloorMgr() ? `
      <div class="jrn-dept-row"><button class="jrn-dept-chip sel" disabled>${DEPT_LABEL[mgrDept()]}</button></div>
      ` : `
      <div class="jrn-dept-row">
        ${Object.entries(DEPT_LABEL).map(([k, v]) =>
          `<button class="jrn-dept-chip ${_taskDraft.department === k ? 'sel' : ''}" onclick="window.__jrn.setDept('${k}')">${v}</button>`
        ).join('')}
      </div>`}
      <div class="jrn-modal-lbl">Виконавець</div>
      <select id="jrn-task-assignee" class="jrn-modal-inp" onchange="window.__jrn.setAssignee(this.value)">
        <option value="">— Оберіть людину —</option>
        ${teamForDept(_taskDraft.department).map(m =>
          `<option value="${m.id}" ${_taskDraft.userId === m.id ? 'selected' : ''}>${esc(m.name)}</option>`
        ).join('')}
      </select>
      <div class="jrn-modal-lbl">Важливість</div>
      <div class="jrn-dept-row">
        ${Object.entries(PRIORITY_LABEL).map(([k, v]) =>
          `<button class="jrn-prio-chip ${_taskDraft.priority === k ? 'sel ' + k : ''}" onclick="window.__jrn.setPriority('${k}')">${v}</button>`
        ).join('')}
      </div>
      <div class="jrn-modal-lbl">Завдання</div>
      <textarea id="jrn-task-text" class="jrn-modal-inp" rows="3" placeholder="Що потрібно зробити на зміні…">${esc(_taskDraft.text)}</textarea>
      <div class="jrn-modal-btns">
        <button class="jrn-btn-sec" onclick="window.__jrn.closeTaskModal()">Скасувати</button>
        <button class="jrn-btn-cta" onclick="window.__jrn.saveTask()">Створити</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   CHECKLISTS (Фаза 4.1)
════════════════════════ */
// Чи прострочено: дедлайн минув, а не всі пункти зроблені
function clIsLate(cl) {
  if (!cl.deadline || cl.doneCount >= cl.total) return false;
  const [h, m] = cl.deadline.split(':').map(Number);
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() > (m || 0));
}

// Сьогоднішні чек-листи (працівник тапає; менеджер бачить хто/коли)
function buildTodayChecklists() {
  const lists = isFloorMgr() ? _checklists.filter(cl => (cl.department || '') === mgrDept()) : _checklists;
  if (!lists.length) {
    return `<div class="jrn-empty"><div class="jrn-empty-icon">✓</div>
      <div class="jrn-empty-txt">${isFloorMgr() ? `Чек-листів для ${mgrWhom()} на сьогодні немає` : 'Чек-листів на сьогодні немає'}</div></div>`;
  }
  return lists.map(cl => {
    const allDone = cl.total > 0 && cl.doneCount >= cl.total;
    const late = clIsLate(cl);
    return `
    <div class="jrn-cl-card${allDone ? ' done' : ''}" id="clcard-${cl.templateId}">
      <div class="jrn-cl-head">
        <div class="jrn-cl-name">${esc(cl.title)}</div>
        <div class="jrn-cl-tags">
          <span class="jrn-tag ${allDone ? 'ok' : ''}" data-cl-count>${cl.doneCount}/${cl.total}</span>
          ${cl.kind === 'weekly' ? `<span class="jrn-tag">дія дня</span>` : ''}
          ${cl.department ? `<span class="jrn-tag">${CL_DEPT_LABEL[cl.department]}</span>` : ''}
          ${cl.deadline ? `<span class="jrn-tag ${late ? 'late' : (allDone ? 'ok' : '')}" data-cl-deadline>до ${cl.deadline}</span>` : ''}
        </div>
      </div>
      ${cl.items.map(it => `
      <div class="jrn-cl-item" id="clrun-${cl.templateId}-${it.id}" onclick="window.__jrn.toggleClItem('${cl.templateId}','${it.id}')">
        <div class="jrn-cl-check ${it.done ? 'done' : ''}">${it.done ? CHECK_SVG : ''}</div>
        <div style="flex:1;min-width:0">
          <div class="jrn-cl-item-text ${it.done ? 'done' : ''}">${esc(it.text)}</div>
          ${it.desc ? `<div class="jrn-cl-item-desc ${it.done ? 'done' : ''}">${esc(it.desc)}</div>` : ''}
        </div>
        ${it.photo ? `<span class="jrn-cl-photo" title="Потрібне фото">📷</span>` : ''}
        ${it.done && it.doneBy ? `<span class="jrn-cl-by">${esc(it.doneBy)}</span>` : ''}
      </div>`).join('')}
    </div>`;
  }).join('');
}

// Менеджер: список шаблонів + кнопка створення
function buildManagerTemplates() {
  const tpls = isFloorMgr() ? _clTemplates.filter(t => (t.department || '') === mgrDept()) : _clTemplates;
  const list = tpls.length ? tpls.map(t => {
    const count = (t.items || []).length;
    return `
    <div class="jrn-cl-card">
      <div class="jrn-task-row">
        <div style="flex:1;min-width:0">
          <div class="jrn-cl-name">${esc(t.title)}${t.active ? '' : ` <span style="color:var(--text3);font-size:11px">(вимкнено)</span>`}</div>
          <div class="jrn-cl-tags">
            <span class="jrn-tag">${t.kind === 'weekly' ? 'Щотижневий' : 'Щоденний'}</span>
            <span class="jrn-tag">${CL_DEPT_LABEL[t.department] || 'Всі'}</span>
            ${t.deadline ? `<span class="jrn-tag">до ${t.deadline}</span>` : ''}
            ${t.remindAt ? `<span class="jrn-tag">🔔 ${t.remindAt}</span>` : ''}
            <span class="jrn-tag">${count} пункт.</span>
          </div>
        </div>
        <button class="jrn-tpl-edit" onclick="window.__jrn.editTemplate('${t.id}')">✎</button>
        <button class="jrn-task-del" onclick="window.__jrn.deleteTemplate('${t.id}')">×</button>
      </div>
    </div>`;
  }).join('') : `<div class="jrn-empty"><div class="jrn-empty-txt">${isFloorMgr() ? `Шаблонів для ${mgrWhom()} ще немає. Створіть перший.` : 'Шаблонів ще немає. Створіть перший.'}</div></div>`;
  return `
    <div style="padding:0 14px 8px"><button class="jrn-add-btn" onclick="window.__jrn.openClModal()">+ Шаблон чек-листа</button></div>
    ${list}`;
}

// Рядок пункту у конструкторі: Дія (коротко) + Опис (що робити). listKey: 'daily' або номер дня тижня
function bldItemRow(it, listKey) {
  return `
  <div class="jrn-bld-item-card">
    <div class="jrn-bld-item">
      <input class="jrn-bld-inp" id="clitem-${it.id}" value="${esc(it.text)}" placeholder="Дія (коротко)">
      <button class="jrn-bld-photo ${it.photo ? 'on' : ''}" onclick="window.__jrn.clTogglePhoto('${listKey}','${it.id}')" title="Потрібне фото">📷</button>
      <button class="jrn-bld-del" onclick="window.__jrn.clDelItem('${listKey}','${it.id}')">×</button>
    </div>
    <textarea class="jrn-bld-desc" id="cldesc-${it.id}" rows="2" placeholder="Опис: що саме зробити…">${esc(it.desc || '')}</textarea>
  </div>`;
}

// Область пунктів (daily-список або 7 днів) — окремо, щоб оновлювати точково без перебудови модалки
function clItemsAreaHTML(d) {
  return d.kind === 'daily'
    ? `${d.daily.map(it => bldItemRow(it, 'daily')).join('')}
       <button class="jrn-bld-add" onclick="window.__jrn.clAddItem('daily')">+ Пункт</button>`
    : WEEKDAYS.map(w => `
       <div class="jrn-bld-day">
         <div class="jrn-bld-day-lbl">${w.label}</div>
         ${(d.weekly[w.wd] || []).map(it => bldItemRow(it, String(w.wd))).join('')}
         <button class="jrn-bld-add" onclick="window.__jrn.clAddItem('${w.wd}')">+ Пункт</button>
       </div>`).join('');
}

function buildClModal() {
  if (!_clModal || !_clDraft) return '';
  const d = _clDraft;
  return `
  <div class="jrn-modal-ov" onclick="window.__jrn.closeClModalOv(event)">
    <div class="jrn-modal" onclick="event.stopPropagation()">
      <div class="jrn-modal-title">${d.id ? 'Редагувати чек-лист' : 'Новий чек-лист'}</div>
      <div class="jrn-bld-scroll">
        <div class="jrn-modal-lbl">Назва</div>
        <input id="cl-title" class="jrn-modal-inp" value="${esc(d.title)}" placeholder="Відкриття бару">
        <div class="jrn-modal-lbl">Тип</div>
        <div class="jrn-dept-row" id="cl-kind-row">
          <button class="jrn-dept-chip ${d.kind === 'daily' ? 'sel' : ''}" onclick="window.__jrn.clSetKind('daily')">Щоденний</button>
          <button class="jrn-dept-chip ${d.kind === 'weekly' ? 'sel' : ''}" onclick="window.__jrn.clSetKind('weekly')">Щотижневий</button>
        </div>
        ${isFloorMgr() ? `
        <div class="jrn-modal-lbl">Для кого</div>
        <div class="jrn-dept-row"><button class="jrn-dept-chip sel" disabled>${DEPT_LABEL[mgrDept()]}</button></div>
        ` : `
        <div class="jrn-modal-lbl">Для кого</div>
        <div class="jrn-dept-row" id="cl-dept-row">
          ${Object.entries(CL_DEPT_LABEL).map(([k, v]) =>
            `<button class="jrn-dept-chip ${d.department === k ? 'sel' : ''}" onclick="window.__jrn.clSetDept('${k}')">${v}</button>`).join('')}
        </div>`}
        <div class="jrn-modal-lbl">Дедлайн (необовʼязково)</div>
        <input id="cl-deadline" type="time" class="jrn-modal-inp" value="${d.deadline || ''}">
        <div class="jrn-modal-lbl">Нагадати пушем о — зміні в графіку (необовʼязково)</div>
        <input id="cl-remind" type="time" class="jrn-modal-inp" value="${d.remindAt || ''}">
        <div class="jrn-modal-lbl" id="cl-items-lbl">Пункти${d.kind === 'weekly' ? ' — своя дія на кожен день' : ''}</div>
        <div id="cl-items-area">${clItemsAreaHTML(d)}</div>
      </div>
      <div class="jrn-modal-btns">
        <button class="jrn-btn-sec" onclick="window.__jrn.closeClModal()">Скасувати</button>
        <button class="jrn-btn-cta" onclick="window.__jrn.saveTemplate()">${d.id ? 'Зберегти' : 'Створити'}</button>
      </div>
    </div>
  </div>`;
}

// Оновити лише область пунктів (без перебудови всієї модалки → без миготіння)
function refreshClItems() {
  const area = document.getElementById('cl-items-area');
  if (area) area.innerHTML = clItemsAreaHTML(_clDraft); else rerenderModals();
}

// Зчитати значення інпутів конструктора у чернетку (перед структурним перемальовуванням)
function captureClDraft() {
  if (!_clDraft) return;
  const t = document.getElementById('cl-title');    if (t) _clDraft.title = t.value;
  const dl = document.getElementById('cl-deadline'); if (dl) _clDraft.deadline = dl.value;
  const rm = document.getElementById('cl-remind');   if (rm) _clDraft.remindAt = rm.value;
  const cap = arr => arr.forEach(it => {
    const el = document.getElementById('clitem-' + it.id); if (el) it.text = el.value;
    const de = document.getElementById('cldesc-' + it.id); if (de) it.desc = de.value;
  });
  cap(_clDraft.daily);
  Object.values(_clDraft.weekly).forEach(cap);
}

function newClItem() {
  return { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, text: '', desc: '', photo: false };
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr = canManage();

  let body;
  if (isMgr) {
    const tabBody = _clView === 'templates' ? buildManagerTemplates()
                  : _clView === 'tasks'     ? buildManagerTasks()
                  :                           buildTodayChecklists();
    body = `
      <div class="jrn-tabs">
        <button class="jrn-tab ${_clView === 'today' ? 'sel' : ''}" onclick="window.__jrn.setClView('today')">Сьогодні</button>
        <button class="jrn-tab ${_clView === 'templates' ? 'sel' : ''}" onclick="window.__jrn.setClView('templates')">Шаблони</button>
        <button class="jrn-tab ${_clView === 'tasks' ? 'sel' : ''}" onclick="window.__jrn.setClView('tasks')">Завдання</button>
      </div>
      ${tabBody}`;
  } else {
    // Бармен може ставити задачі системному менеджеру (вільний текст: «змінити ТТК…»)
    const r = (_role || '').toLowerCase();
    const reqsSection = (r === 'bartender' || r === 'barman')
      ? `<div class="jrn-sec">Запити сис. менеджеру</div>${buildMyRequests()}`
      : '';
    body = `
      <div class="jrn-sec" style="padding-top:8px">Чек-листи</div>
      ${buildTodayChecklists()}
      <div class="jrn-sec">Завдання на сьогодні</div>
      ${buildWorkerChecklist()}
      ${reqsSection}`;
  }

  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="jrn-scroll">

    <div class="jrn-header">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="jrn-back" onclick="window.__barops.navigate('dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="jrn-title">${jrnTitle()}</div>
          <div class="jrn-date">${todayStr()} · ${state.venue || ''}</div>
        </div>
      </div>
    </div>

    ${body}

    <div style="height:20px"></div>
  </div>
</div>
<div id="jrn-modal-host">${buildTaskModal()}${buildClModal()}${buildReqModal()}</div>`;
}

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadTasks() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) return;
  try {
    const from = ymd(new Date());
    const res  = await fetch(`${API}/api/tasks?venueId=${venueId}&from=${from}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) _tasks = data.tasks || [];
  } catch { /* silent */ }
  rerender();
}

async function loadTeam() {
  if (!canManage()) return;
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) return;
  try {
    const res  = await fetch(`${API}/api/auth/team?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.team)) _team = data.team;
  } catch { /* silent */ }
  rerender();
}

async function loadChecklists() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) return;
  try {
    const res  = await fetch(`${API}/api/checklists/today?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) _checklists = data.checklists || [];
  } catch { /* silent */ }
  rerender();
}

async function loadTemplates() {
  if (!canManage()) return;
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) return;
  try {
    const res  = await fetch(`${API}/api/checklists/templates?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) _clTemplates = data.templates || [];
  } catch { /* silent */ }
  rerender();
}

function rerender() {
  if (state.route !== 'journal') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

// Перемальовуємо лише модалки (без скидання скролу сторінки), зберігаючи скрол конструктора
function rerenderModals() {
  const sc  = document.querySelector('.jrn-bld-scroll');
  const top = sc ? sc.scrollTop : 0;
  const h = document.getElementById('jrn-modal-host');
  if (!h) { rerender(); return; }
  h.innerHTML = buildTaskModal() + buildClModal();
  const sc2 = document.querySelector('.jrn-bld-scroll');
  if (sc2) sc2.scrollTop = top;
}

// Точкове оновлення одного пункту чек-листа (без перебудови сторінки → без стрибка скролу)
function updateClItemDOM(cl, it) {
  const el = document.getElementById(`clrun-${cl.templateId}-${it.id}`);
  if (el) {
    const check = el.querySelector('.jrn-cl-check');
    if (check) { check.classList.toggle('done', it.done); check.innerHTML = it.done ? CHECK_SVG : ''; }
    const txt = el.querySelector('.jrn-cl-item-text');
    if (txt) txt.classList.toggle('done', it.done);
    const desc = el.querySelector('.jrn-cl-item-desc');
    if (desc) desc.classList.toggle('done', it.done);
    let by = el.querySelector('.jrn-cl-by');
    if (it.done && it.doneBy) {
      if (!by) { by = document.createElement('span'); by.className = 'jrn-cl-by'; el.appendChild(by); }
      by.textContent = it.doneBy;
    } else if (by) { by.remove(); }
  }
  const card = document.getElementById(`clcard-${cl.templateId}`);
  if (card) {
    const allDone = cl.total > 0 && cl.doneCount >= cl.total;
    card.classList.toggle('done', allDone);
    const cnt = card.querySelector('[data-cl-count]');
    if (cnt) { cnt.textContent = `${cl.doneCount}/${cl.total}`; cnt.classList.toggle('ok', allDone); }
    const dl = card.querySelector('[data-cl-deadline]');
    if (dl) { const late = clIsLate(cl); dl.classList.toggle('late', late); dl.classList.toggle('ok', !late && allDone); }
  }
}

// Точкове оновлення одного завдання (воркер) + лічильника картки
function updateTaskDOM(t) {
  const el = document.getElementById(`task-${t.id}`);
  if (el) {
    const check = el.querySelector('.jrn-cl-check');
    if (check) { check.classList.toggle('done', t.done); check.innerHTML = t.done ? CHECK_SVG : ''; }
    const txt = el.querySelector('.jrn-cl-item-text');
    if (txt) txt.classList.toggle('done', t.done);
  }
  const today = ymd(new Date());
  const done = _tasks.filter(x => x.date === today && x.done && (x.department || '') !== 'admin').length;
  const cnt = document.querySelector('[data-task-count]');
  if (cnt) cnt.textContent = String(done);
}

/* ════════════════════════
   PAGE MODULE
════════════════════════ */
export default {
  render() {
    _tasks       = [];
    _team        = [];
    _taskModal   = false;
    _reqModal    = false;
    _checklists  = [];
    _clTemplates = [];
    _clView      = 'today';
    _clModal     = false;
    _clDraft     = null;
    _role        = state.role || localStorage.getItem('barops_role') || 'bartender';
    return buildHTML();
  },
  async init() {
    _role = state.role || localStorage.getItem('barops_role') || 'bartender';
    window.__jrn = {
      async toggleTask(id) {
        const t = _tasks.find(x => x.id === id);
        if (!t) return;
        const newDone = !t.done;
        t.done = newDone;            // оптимістично
        updateTaskDOM(t);            // точково, без перебудови сторінки
        try {
          await fetch(`${API}/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ done: newDone }),
          });
        } catch {
          t.done = !newDone;         // відкат при помилці
          updateTaskDOM(t);
        }
      },

      openTaskModal() {
        _taskDraft = { date: ymd(new Date()), department: isFloorMgr() ? mgrDept() : 'bartenders', userId: '', userName: '', priority: 'medium', text: '' };
        _taskModal = true;
        rerender();
      },
      closeTaskModal() { _taskModal = false; rerender(); },
      closeTaskModalOv(e) { if (e?.target?.classList?.contains('jrn-modal-ov')) { _taskModal = false; rerender(); } },
      setDept(k) {
        captureDraft();
        _taskDraft.department = k;
        _taskDraft.userId = '';        // інший підрозділ — скидаємо виконавця
        _taskDraft.userName = '';
        // Точкове оновлення модалки — без перемальовування всієї сторінки
        const deptKeys = Object.keys(DEPT_LABEL);
        document.querySelectorAll('.jrn-dept-chip').forEach((b, i) => {
          b.className = 'jrn-dept-chip' + (deptKeys[i] === k ? ' sel' : '');
        });
        const sel = document.getElementById('jrn-task-assignee');
        if (sel) sel.innerHTML = `<option value="">— Оберіть людину —</option>`
          + teamForDept(k).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
      },
      setPriority(p) {
        captureDraft();
        _taskDraft.priority = p;
        // Точкове оновлення кнопок важливості — без перемальовування
        const prioKeys = Object.keys(PRIORITY_LABEL);
        document.querySelectorAll('.jrn-prio-chip').forEach((b, i) => {
          b.className = 'jrn-prio-chip' + (prioKeys[i] === p ? ' sel ' + p : '');
        });
      },
      setAssignee(userId) {
        _taskDraft.userId = userId || '';
        const m = _team.find(x => x.id === userId);
        _taskDraft.userName = m ? m.name : '';
      },
      async saveTask() {
        const date = document.getElementById('jrn-task-date')?.value || '';
        const text = (document.getElementById('jrn-task-text')?.value || '').trim();
        const department = _taskDraft.department;
        const userId = document.getElementById('jrn-task-assignee')?.value || '';
        const m = _team.find(x => x.id === userId);
        const userName = m ? m.name : '';
        const venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
        const priority = _taskDraft.priority || 'medium';
        if (!date || !text || !userId) return;
        const btn = document.querySelector('.jrn-btn-cta');
        if (btn) { btn.disabled = true; btn.textContent = 'Створення…'; }
        try {
          const res = await fetch(`${API}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ venueId, date, department, text, userId, userName, priority }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Помилка');
          _taskModal = false;
          await loadTasks();
        } catch (e) {
          console.error('[tasks] save:', e);
          if (btn) { btn.disabled = false; btn.textContent = 'Створити'; }
        }
      },
      async deleteTask(id) {
        try {
          await fetch(`${API}/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token()}` },
          });
        } catch { /* silent */ }
        loadTasks();
      },

      /* ── ЗАПИТИ СИС. МЕНЕДЖЕРУ (бармен → адмін) ── */
      openReqModal()  { _reqModal = true; rerender(); },
      closeReqModal() { _reqModal = false; rerender(); },
      closeReqModalOv(e) { if (e?.target?.classList?.contains('jrn-modal-ov')) { _reqModal = false; rerender(); } },
      async sendRequest() {
        const text = (document.getElementById('jrn-req-text')?.value || '').trim();
        if (!text) return;
        const venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
        const btn = document.querySelector('.jrn-btn-cta');
        if (btn) { btn.disabled = true; btn.textContent = 'Надсилаю…'; }
        try {
          const res = await fetch(`${API}/api/tasks/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ venueId, text }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Помилка');
          _reqModal = false;
          await loadTasks();
        } catch (e) {
          console.error('[tasks] request:', e);
          if (btn) { btn.disabled = false; btn.textContent = 'Надіслати'; }
        }
      },
      // Чекбокс на запиті в адміна: toggle + повне перемалювання (картка міняє вигляд)
      async toggleReq(id) {
        await window.__jrn.toggleTask(id);
        rerender();
      },

      /* ── ЧЕК-ЛИСТИ ── */
      setClView(v) { _clView = v; rerender(); if (v === 'templates') loadTemplates(); },

      async toggleClItem(templateId, itemId) {
        const cl = _checklists.find(c => c.templateId === templateId);
        const it = cl && cl.items.find(i => i.id === itemId);
        if (!it) return;
        const newDone = !it.done;
        it.done = newDone;           // оптимістично
        it.doneBy = newDone ? (state.user || localStorage.getItem('barops_user') || '') : '';
        cl.doneCount = cl.items.filter(x => x.done).length;
        updateClItemDOM(cl, it);     // точково, без перебудови сторінки
        try {
          await fetch(`${API}/api/checklists/run/${templateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ itemId, done: newDone }),
          });
        } catch {
          it.done = !newDone;        // відкат при помилці
          it.doneBy = it.done ? (state.user || localStorage.getItem('barops_user') || '') : '';
          cl.doneCount = cl.items.filter(x => x.done).length;
          updateClItemDOM(cl, it);
        }
      },

      openClModal() {
        _clDraft = {
          id: null, title: '', kind: 'daily', department: isFloorMgr() ? mgrDept() : '', deadline: '', remindAt: '',
          daily: [newClItem()],
          weekly: { 0: [], 1: [newClItem()], 2: [], 3: [], 4: [], 5: [], 6: [] },
        };
        _clModal = true;
        rerender();
      },
      editTemplate(id) {
        const t = _clTemplates.find(x => x.id === id);
        if (!t) return;
        const draft = {
          id: t.id, title: t.title, kind: t.kind, department: t.department || '', deadline: t.deadline || '', remindAt: t.remindAt || '',
          daily: [], weekly: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
        };
        (t.items || []).forEach(it => {
          const item = { id: it.id || newClItem().id, text: it.text || '', desc: it.desc || '', photo: !!it.photo };
          if (t.kind === 'weekly') { const wd = Number(it.weekday); draft.weekly[wd >= 0 && wd <= 6 ? wd : 1].push(item); }
          else draft.daily.push(item);
        });
        if (t.kind === 'daily' && !draft.daily.length) draft.daily.push(newClItem());
        _clDraft = draft; _clModal = true; rerender();
      },
      closeClModal() { _clModal = false; _clDraft = null; rerenderModals(); },
      closeClModalOv(e) { if (e?.target?.classList?.contains('jrn-modal-ov')) { _clModal = false; _clDraft = null; rerenderModals(); } },
      // Тип: оновлюємо чипи + лише область пунктів (daily↔weekly структурно різні)
      clSetKind(k) {
        if (_clDraft.kind === k) return;
        captureClDraft();
        _clDraft.kind = k;
        const row = document.getElementById('cl-kind-row');
        if (row) [...row.children].forEach((b, i) => b.className = 'jrn-dept-chip' + ((i === 0 ? 'daily' : 'weekly') === k ? ' sel' : ''));
        const lbl = document.getElementById('cl-items-lbl');
        if (lbl) lbl.textContent = 'Пункти' + (k === 'weekly' ? ' — своя дія на кожен день' : '');
        refreshClItems();
      },
      // Підрозділ: лише підсвічуємо чипи (нічого не перебудовуємо)
      clSetDept(k) {
        _clDraft.department = k;
        const keys = Object.keys(CL_DEPT_LABEL);
        const row = document.getElementById('cl-dept-row');
        if (row) [...row.children].forEach((b, i) => b.className = 'jrn-dept-chip' + (keys[i] === k ? ' sel' : ''));
      },
      clAddItem(listKey) {
        captureClDraft();
        if (listKey === 'daily') _clDraft.daily.push(newClItem());
        else _clDraft.weekly[Number(listKey)].push(newClItem());
        refreshClItems();
      },
      clDelItem(listKey, itemId) {
        captureClDraft();
        if (listKey === 'daily') _clDraft.daily = _clDraft.daily.filter(i => i.id !== itemId);
        else _clDraft.weekly[Number(listKey)] = _clDraft.weekly[Number(listKey)].filter(i => i.id !== itemId);
        refreshClItems();
      },
      // Фото: лише перемикаємо клас цієї кнопки (без перебудови)
      clTogglePhoto(listKey, itemId) {
        const arr = listKey === 'daily' ? _clDraft.daily : _clDraft.weekly[Number(listKey)];
        const it = arr.find(i => i.id === itemId);
        if (!it) return;
        it.photo = !it.photo;
        const inp = document.getElementById('clitem-' + itemId);
        const btn = inp && inp.parentElement && inp.parentElement.querySelector('.jrn-bld-photo');
        if (btn) btn.className = 'jrn-bld-photo' + (it.photo ? ' on' : '');
      },
      async saveTemplate() {
        captureClDraft();
        const d = _clDraft;
        const title = (d.title || '').trim();
        if (!title) { alert('Вкажіть назву'); return; }
        let items;
        if (d.kind === 'daily') {
          items = d.daily.filter(i => i.text.trim()).map(i => ({ id: i.id, text: i.text.trim(), desc: (i.desc || '').trim(), photo: i.photo }));
        } else {
          items = [];
          for (const w of WEEKDAYS) {
            (d.weekly[w.wd] || []).filter(i => i.text.trim()).forEach(i =>
              items.push({ id: i.id, text: i.text.trim(), desc: (i.desc || '').trim(), photo: i.photo, weekday: w.wd }));
          }
        }
        if (!items.length) { alert('Додайте хоча б один пункт'); return; }
        const venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
        const payload = { venueId, title, kind: d.kind, department: d.department, deadline: d.deadline, remindAt: d.remindAt, items };
        const btn = document.querySelector('.jrn-btn-cta');
        if (btn) { btn.disabled = true; btn.textContent = 'Збереження…'; }
        try {
          const url = d.id ? `${API}/api/checklists/templates/${d.id}` : `${API}/api/checklists/templates`;
          const res = await fetch(url, {
            method: d.id ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Помилка');
          _clModal = false; _clDraft = null;
          await loadTemplates();
          loadChecklists();
        } catch (e) {
          console.error('[checklists] save:', e);
          if (btn) { btn.disabled = false; btn.textContent = d.id ? 'Зберегти' : 'Створити'; }
          alert('Не вдалося зберегти: ' + e.message);
        }
      },
      async deleteTemplate(id) {
        if (!confirm('Видалити цей чек-лист?')) return;
        try {
          await fetch(`${API}/api/checklists/templates/${id}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
          });
        } catch { /* silent */ }
        loadTemplates();
        loadChecklists();
      },
    };
    loadTasks();
    loadTeam();
    loadChecklists();
    if (canManage()) loadTemplates();
  },
};
