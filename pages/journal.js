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
let _taskDraft = { date: '', department: 'bartenders', userId: '', userName: '', priority: 'medium', text: '' };
let _team      = [];      // склад закладу (для вибору виконавця; лише менеджер)

const DEPT_LABEL = { kitchen: 'Кухня', waiters: 'Офіціанти', bartenders: 'Бармени' };
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
.jrn-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
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
.jrn-cl-item-text{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.jrn-cl-item-text.done{color:var(--text3);text-decoration:line-through}
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
  return r === 'admin' || r === 'manager' || r === 'director';
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
  const tasks = _tasks.filter(t => t.date === today);   // бекенд уже звузив до моїх завдань
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
      <div class="jrn-cl-meta">${done}/${tasks.length} виконано</div>
    </div>
    ${tasks.map(t => `
    <div class="jrn-cl-item" onclick="window.__jrn.toggleTask('${t.id}',${t.done ? 0 : 1})">
      <div class="jrn-cl-check ${t.done ? 'done' : ''}">${t.done ? CHECK_SVG : ''}</div>
      <div class="jrn-cl-item-text ${t.done ? 'done' : ''}">${esc(t.text)}</div>
      <span class="jrn-prio-dot" style="background:${PRIORITY_COLOR[t.priority] || 'var(--text2)'}" title="${PRIORITY_LABEL[t.priority] || ''}"></span>
    </div>`).join('')}
  </div>`;
}

function buildManagerTasks() {
  const listHTML = _tasks.length ? _tasks.map(t => `
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
      <div class="jrn-dept-row">
        ${Object.entries(DEPT_LABEL).map(([k, v]) =>
          `<button class="jrn-dept-chip ${_taskDraft.department === k ? 'sel' : ''}" onclick="window.__jrn.setDept('${k}')">${v}</button>`
        ).join('')}
      </div>
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
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr = canManage();
  const checklistsHTML = isMgr ? buildManagerTasks() : buildWorkerChecklist();

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

    <!-- Завдання / Чек-листи -->
    <div class="jrn-sec" style="padding-top:8px">${isMgr ? 'Завдання на зміни' : 'Чек-листи'}</div>
    ${checklistsHTML}

    <div style="height:20px"></div>
  </div>
</div>
${buildTaskModal()}`;
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
    _tasks     = [];
    _team      = [];
    _taskModal = false;
    _role      = state.role || localStorage.getItem('barops_role') || 'bartender';
    return buildHTML();
  },
  async init() {
    _role = state.role || localStorage.getItem('barops_role') || 'bartender';
    window.__jrn = {
      async toggleTask(id, done) {
        const t = _tasks.find(x => x.id === id);
        if (t) t.done = !!done;     // оптимістично
        rerender();
        try {
          await fetch(`${API}/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ done: !!done }),
          });
        } catch { /* silent */ }
        loadTasks();
      },

      openTaskModal() {
        _taskDraft = { date: ymd(new Date()), department: 'bartenders', userId: '', userName: '', priority: 'medium', text: '' };
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
    };
    loadTasks();
    loadTeam();
  },
};
