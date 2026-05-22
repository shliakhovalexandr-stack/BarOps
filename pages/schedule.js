/* ============================================================
   BarOps — pages/schedule.js
   Графіки — тижневий розклад по підрозділах
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function tok() { return localStorage.getItem('barops_token') || ''; }
function venueId() { return state.venueId || localStorage.getItem('barops_venueId') || ''; }

/* ════════════════════════
   CONSTANTS
════════════════════════ */
const DEPTS = [
  { id: 'barman',   label: 'Бармени',   color: 'var(--purple)', bg: 'var(--purple-bg)', border: 'var(--purple-border)' },
  { id: 'waiter',   label: 'Офіціанти', color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)'  },
  { id: 'cook',     label: 'Кухарі',    color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)'  },
  { id: 'manager',  label: 'Менеджери', color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)'   },
  { id: 'hostess',  label: 'Хозяюшки', color: 'var(--teal)',   bg: 'var(--teal-bg)',   border: 'var(--teal-border)'   },
];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
const STORAGE_KEY = 'barops_schedule_v1';

/* ════════════════════════
   STATE
════════════════════════ */
let _tab        = 'barman';   // активна вкладка
let _weekOff    = 0;          // 0 = поточний тиждень
let _team       = [];         // члени команди
let _loading    = true;
let _sheet      = null;       // { empId, dayIso } — нижній лист для редагування

/* ════════════════════════
   SCHEDULE STORAGE (localStorage)
════════════════════════ */
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}
function getShift(empId, dayIso) {
  const d = loadData();
  return d[venueId()]?.[empId]?.[dayIso] || null; // { start:'10:00', end:'18:00' } | null
}
function setShift(empId, dayIso, start, end) {
  const d = loadData();
  if (!d[venueId()]) d[venueId()] = {};
  if (!d[venueId()][empId]) d[venueId()][empId] = {};
  d[venueId()][empId][dayIso] = { start, end };
  saveData(d);
}
function clearShift(empId, dayIso) {
  const d = loadData();
  if (d[venueId()]?.[empId]?.[dayIso]) {
    delete d[venueId()][empId][dayIso];
    saveData(d);
  }
}

/* ════════════════════════
   WEEK HELPERS
════════════════════════ */
function getMondayOfWeek(offset) {
  const now = new Date();
  const day = now.getDay() || 7; // 1=Mon..7=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day - 1) + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function weekDays(offset) {
  const mon = getMondayOfWeek(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}
function isoDate(d) { return d.toISOString().slice(0, 10); }
function isToday(d) { return isoDate(d) === isoDate(new Date()); }
function weekLabel(offset) {
  const days = weekDays(offset);
  const fmt  = (d) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  return `${fmt(days[0])} — ${fmt(days[6])}`;
}

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="sc-css">
.sc-wrap{display:flex;flex-direction:column;flex:1;overflow:hidden;background:var(--bg)}
.sc-scroll{overflow-y:auto;flex:1;padding-bottom:32px}.sc-scroll::-webkit-scrollbar{width:0}

/* Header */
.sc-header{display:flex;align-items:center;gap:12px;padding:10px 18px 8px;flex-shrink:0}
.sc-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sc-back:active{background:var(--bg3)}
.sc-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em;flex:1}

/* Week nav */
.sc-week-row{display:flex;align-items:center;justify-content:space-between;padding:0 18px 12px;flex-shrink:0}
.sc-week-label{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sc-week-nav{display:flex;align-items:center;gap:4px}
.sc-wbtn{width:32px;height:32px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sc-wbtn:active{background:var(--bg3)}
.sc-today-btn{height:28px;padding:0 10px;border-radius:9px;background:var(--glass-bg);border:0.5px solid var(--border);
  font-size:11px;font-family:var(--font-b);color:var(--text1);cursor:pointer;white-space:nowrap}
.sc-today-btn:active{background:var(--bg3)}
.sc-today-btn.active{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}

/* Dept tabs */
.sc-tabs{display:flex;gap:6px;padding:0 18px 14px;overflow-x:auto;flex-shrink:0}.sc-tabs::-webkit-scrollbar{height:0}
.sc-tab{height:30px;padding:0 12px;border-radius:20px;font-size:12px;font-family:var(--font-b);
  cursor:pointer;white-space:nowrap;border:1px solid var(--border);background:var(--bg2);color:var(--text2);
  display:inline-flex;align-items:center;transition:all .15s}
.sc-tab:active{opacity:.7}
.sc-tab.active{border-color:transparent;font-weight:600}

/* Employee cards */
.sc-emp-list{display:flex;flex-direction:column;gap:10px;padding:0 18px}
.sc-emp-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}

/* Employee card header */
.sc-emp-head{display:flex;align-items:center;gap:10px;padding:12px 14px 10px}
.sc-emp-avatar{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;
  font-family:var(--font-h);font-size:14px;font-weight:700;flex-shrink:0;color:#fff}
.sc-emp-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sc-emp-role{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.sc-emp-total{font-size:11px;font-family:var(--font-b);color:var(--text2);margin-left:auto;text-align:right;flex-shrink:0}
.sc-emp-total-h{font-family:var(--font-h);font-size:16px;font-weight:700;line-height:1;text-align:right}

/* Days grid */
.sc-days-row{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:0 10px 12px}
.sc-day{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border-radius:10px;padding:6px 2px;transition:background .12s}
.sc-day:active{background:var(--bg3)}
.sc-day-name{font-size:9px;font-family:var(--font-b);color:var(--text3);letter-spacing:.04em;text-transform:uppercase}
.sc-day-num{font-size:10px;font-family:var(--font-b);color:var(--text2);margin-bottom:2px}
.sc-day-num.today{color:var(--green)}
.sc-day-slot{width:100%;min-height:30px;border-radius:8px;display:flex;flex-direction:column;align-items:center;
  justify-content:center;border:1px dashed var(--border)}
.sc-day-slot.filled{border-style:solid;border-color:transparent}
.sc-day-slot-time{font-size:8.5px;font-family:var(--font-b);font-weight:600;line-height:1.3;text-align:center}
.sc-day-slot-plus{font-size:14px;color:var(--text3);line-height:1}

/* Empty state */
.sc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:64px 32px;gap:12px;text-align:center}
.sc-empty-icon{width:56px;height:56px;border-radius:18px;background:var(--bg2);
  display:flex;align-items:center;justify-content:center;margin-bottom:4px}
.sc-empty-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text1)}
.sc-empty-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}

/* Bottom sheet */
.sc-sheet-ov{position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.72);display:none;
  flex-direction:column;justify-content:flex-end}
.sc-sheet-ov.open{display:flex;animation:scOvIn .2s ease}
@keyframes scOvIn{from{opacity:0}to{opacity:1}}
.sc-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);
  padding:0 0 40px;animation:scSlide .3s cubic-bezier(.22,1,.36,1)}
@keyframes scSlide{from{transform:translateY(100%)}to{transform:none}}
.sc-sheet-handle{width:36px;height:3px;background:var(--border);border-radius:2px;margin:14px auto 16px}
.sc-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);padding:0 20px 4px}
.sc-sheet-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);padding:0 20px 20px}
.sc-time-row{display:flex;gap:12px;padding:0 20px 20px;align-items:center}
.sc-time-label{font-size:12px;color:var(--text2);font-family:var(--font-b);min-width:40px}
.sc-time-input{flex:1;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;
  padding:12px 14px;font-size:16px;font-family:var(--font-b);color:var(--text0);
  appearance:none;-webkit-appearance:none;text-align:center;outline:none}
.sc-time-input:focus{border-color:var(--green)}
.sc-sheet-btns{display:flex;gap:8px;padding:0 20px}
.sc-btn{flex:1;height:48px;border-radius:14px;border:none;font-family:var(--font-h);font-size:15px;
  font-weight:600;cursor:pointer;transition:opacity .15s}
.sc-btn:active{opacity:.8}
.sc-btn--primary{background:var(--green);color:#000}
.sc-btn--danger{background:var(--red-bg);color:var(--red);border:0.5px solid var(--red-border)}
.sc-btn--cancel{background:var(--bg2);color:var(--text1);border:0.5px solid var(--border)}

/* Skeleton */
.sc-skel{background:var(--bg2);border-radius:12px;animation:scSkel 1.2s ease-in-out infinite}
@keyframes scSkel{0%,100%{opacity:.4}50%{opacity:.9}}
</style>`;

/* ════════════════════════
   API
════════════════════════ */
async function loadTeam() {
  const vid = venueId();
  if (!vid) { _team = []; _loading = false; return; }
  try {
    const r = await fetch(`${API}/api/auth/team?venueId=${vid}`, {
      headers: { Authorization: `Bearer ${tok()}` },
    });
    const d = await r.json();
    _team = Array.isArray(d.team) ? d.team : [];
  } catch {
    _team = [];
  }
  _loading = false;
}

/* ════════════════════════
   HELPERS
════════════════════════ */
function deptColor(deptId) { return DEPTS.find(d => d.id === deptId) || DEPTS[0]; }

function avatarColor(name) {
  const colors = ['#7C5CFC','#F59E0B','#10B981','#3B82F6','#EC4899','#EF4444','#06B6D4'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || '?')[0];
}

function roleLabel(role) {
  const map = { barman:'Бармен', waiter:'Офіціант', cook:'Кухар', chef:'Шеф-кухар',
                manager:'Менеджер', accountant:'Бухгалтер', admin:'Адмін', hostess:'Хозяюшка' };
  return map[role] || role;
}

function calcTotalHours(empId, days) {
  let total = 0;
  for (const d of days) {
    const s = getShift(empId, isoDate(d));
    if (!s) continue;
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    total += (eh * 60 + em) - (sh * 60 + sm);
  }
  return total > 0 ? (total / 60).toFixed(1) : null;
}

/* ════════════════════════
   RENDER
════════════════════════ */
function renderTabs() {
  return DEPTS.map(d => {
    const isActive = _tab === d.id;
    const cnt = _team.filter(e => (e.role || '').toLowerCase() === d.id ||
                             (d.id === 'hostess' && (e.role || '').toLowerCase() === 'hostess')).length;
    return `<div class="sc-tab${isActive ? ' active' : ''}"
         style="${isActive ? `background:${d.bg};color:${d.color};border-color:${d.border}` : ''}"
         onclick="window.__schedule.setTab('${d.id}')">
      ${d.label}${cnt ? ` <span style="opacity:.6;margin-left:4px;font-size:10px">${cnt}</span>` : ''}
    </div>`;
  }).join('');
}

function renderDaysHeader(days) {
  return days.map((d, i) => `
    <div style="text-align:center">
      <div class="sc-day-name">${DAYS_SHORT[i]}</div>
      <div class="sc-day-num${isToday(d) ? ' today' : ''}">${d.getDate()}</div>
    </div>`).join('');
}

function renderEmpCard(emp, days, dept) {
  const total = calcTotalHours(emp.id, days);
  const slots = days.map(d => {
    const iso   = isoDate(d);
    const shift = getShift(emp.id, iso);
    if (shift) {
      return `<div class="sc-day-slot filled" style="background:${dept.bg};border-color:${dept.border}"
                   onclick="window.__schedule.openSheet('${emp.id}','${iso}')">
        <div class="sc-day-slot-time" style="color:${dept.color}">${shift.start}<br>${shift.end}</div>
      </div>`;
    }
    return `<div class="sc-day-slot" onclick="window.__schedule.openSheet('${emp.id}','${iso}')">
      <div class="sc-day-slot-plus">+</div>
    </div>`;
  }).join('');

  return `
  <div class="sc-emp-card">
    <div class="sc-emp-head">
      <div class="sc-emp-avatar" style="background:${avatarColor(emp.name || emp.phone)}">${initials(emp.name || emp.phone)}</div>
      <div style="flex:1;min-width:0">
        <div class="sc-emp-name">${emp.name || emp.phone}</div>
        <div class="sc-emp-role">${roleLabel(emp.role)}</div>
      </div>
      ${total ? `<div class="sc-emp-total">
        <div class="sc-emp-total-h" style="color:${dept.color}">${total}</div>
        <div>год/тиждень</div>
      </div>` : ''}
    </div>
    <div class="sc-days-row">${slots}</div>
  </div>`;
}

function renderContent() {
  const dept = deptColor(_tab);
  const days = weekDays(_weekOff);

  if (_loading) {
    return `<div class="sc-emp-list">
      ${[1,2,3].map(() => `<div class="sc-skel" style="height:108px;border-radius:16px"></div>`).join('')}
    </div>`;
  }

  const deptEmployees = _team.filter(e => {
    const r = (e.role || '').toLowerCase();
    if (_tab === 'hostess') return r === 'hostess';
    if (_tab === 'manager') return r === 'manager' || r === 'admin';
    return r === _tab;
  });

  if (!deptEmployees.length) {
    return `<div class="sc-empty">
      <div class="sc-empty-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div class="sc-empty-title">${dept.label} не знайдені</div>
      <div class="sc-empty-sub">Додайте членів команди у розділі «Команда», щоб складати графіки.</div>
    </div>`;
  }

  return `
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:0 18px 8px;padding-left:calc(18px + 74px + 10px + 36px)">
    ${renderDaysHeader(days)}
  </div>
  <div class="sc-emp-list">${deptEmployees.map(e => renderEmpCard(e, days, dept)).join('')}</div>`;
}

function renderSheet() {
  if (!_sheet) return '';
  const { empId, dayIso } = _sheet;
  const emp   = _team.find(e => e.id === empId);
  const shift = getShift(empId, dayIso);
  const date  = new Date(dayIso + 'T00:00:00');
  const dayLabel = date.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
  const empName  = emp ? (emp.name || emp.phone) : '';

  return `
  <div class="sc-sheet-ov open" id="sc-sheet-ov" onclick="window.__schedule.closeSheetIfBg(event)">
    <div class="sc-sheet">
      <div class="sc-sheet-handle"></div>
      <div class="sc-sheet-title">Зміна — ${empName}</div>
      <div class="sc-sheet-sub">${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}</div>
      <div class="sc-time-row">
        <div class="sc-time-label">Початок</div>
        <input class="sc-time-input" type="time" id="sc-time-start" value="${shift?.start || '10:00'}">
      </div>
      <div class="sc-time-row">
        <div class="sc-time-label">Кінець</div>
        <input class="sc-time-input" type="time" id="sc-time-end" value="${shift?.end || '22:00'}">
      </div>
      <div class="sc-sheet-btns">
        ${shift ? `<button class="sc-btn sc-btn--danger" onclick="window.__schedule.removeShift()">Видалити</button>` : ''}
        <button class="sc-btn sc-btn--cancel" onclick="window.__schedule.closeSheet()">Скасувати</button>
        <button class="sc-btn sc-btn--primary" onclick="window.__schedule.saveShift()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   PARTIAL DOM UPDATE
════════════════════════ */
function re() {
  const weekLbl = document.querySelector('.sc-week-label');
  if (weekLbl) weekLbl.textContent = weekLabel(_weekOff);
  const todayBtn = document.querySelector('.sc-today-btn');
  if (todayBtn) todayBtn.classList.toggle('active', _weekOff === 0);
  const content = document.getElementById('sc-content');
  if (content) content.innerHTML = renderContent();
  const wrap = document.querySelector('.sc-wrap');
  if (wrap) {
    const old = document.getElementById('sc-sheet-ov');
    if (old) old.remove();
    if (_sheet) wrap.insertAdjacentHTML('beforeend', renderSheet());
  }
}

/* ════════════════════════
   PAGE EXPORT
════════════════════════ */
export function render() {
  _loading = true;
  _sheet   = null;
  _weekOff = 0;
  _tab     = 'barman';
  _team    = [];

  return CSS + `
  <div class="sc-wrap">
    <div class="sc-header">
      <div class="sc-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sc-title">Графіки</div>
    </div>

    <div class="sc-week-row">
      <div class="sc-week-label">${weekLabel(_weekOff)}</div>
      <div class="sc-week-nav">
        <div class="sc-today-btn active" onclick="window.__schedule.goToday()">Сьогодні</div>
        <div style="width:6px"></div>
        <div class="sc-wbtn" onclick="window.__schedule.prevWeek()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div class="sc-wbtn" onclick="window.__schedule.nextWeek()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>

    <div class="sc-tabs">${renderTabs()}</div>

    <div class="sc-scroll" id="sc-content">
      ${renderContent()}
    </div>
  </div>`;
}

export function init() {
  window.__schedule = {
    setTab(id) {
      _tab = id;
      document.querySelectorAll('.sc-tab').forEach((el, i) => {
        const d = DEPTS[i];
        const active = d.id === id;
        el.classList.toggle('active', active);
        el.style.background  = active ? d.bg : '';
        el.style.color       = active ? d.color : '';
        el.style.borderColor = active ? d.border : '';
      });
      const content = document.getElementById('sc-content');
      if (content) content.innerHTML = renderContent();
    },
    prevWeek() { _weekOff--; re(); },
    nextWeek() { _weekOff++; re(); },
    goToday()  { _weekOff = 0; re(); },

    openSheet(empId, dayIso) {
      _sheet = { empId, dayIso };
      const wrap = document.querySelector('.sc-wrap');
      if (!wrap) return;
      const old = document.getElementById('sc-sheet-ov');
      if (old) old.remove();
      wrap.insertAdjacentHTML('beforeend', renderSheet());
    },
    closeSheet() {
      _sheet = null;
      const el = document.getElementById('sc-sheet-ov');
      if (el) el.remove();
    },
    closeSheetIfBg(e) {
      if (e.target.id === 'sc-sheet-ov') window.__schedule.closeSheet();
    },
    saveShift() {
      if (!_sheet) return;
      const start = document.getElementById('sc-time-start')?.value;
      const end   = document.getElementById('sc-time-end')?.value;
      if (!start || !end) return;
      setShift(_sheet.empId, _sheet.dayIso, start, end);
      _sheet = null;
      const content = document.getElementById('sc-content');
      if (content) content.innerHTML = renderContent();
      const el = document.getElementById('sc-sheet-ov');
      if (el) el.remove();
    },
    removeShift() {
      if (!_sheet) return;
      clearShift(_sheet.empId, _sheet.dayIso);
      _sheet = null;
      const content = document.getElementById('sc-content');
      if (content) content.innerHTML = renderContent();
      const el = document.getElementById('sc-sheet-ov');
      if (el) el.remove();
    },
  };

  loadTeam().then(() => {
    _loading = false;
    const content = document.getElementById('sc-content');
    if (content) content.innerHTML = renderContent();
    // Update tab counts
    document.querySelectorAll('.sc-tab').forEach((el, i) => {
      const d = DEPTS[i];
      const cnt = _team.filter(e => {
        const r = (e.role || '').toLowerCase();
        if (d.id === 'hostess') return r === 'hostess';
        if (d.id === 'manager') return r === 'manager' || r === 'admin';
        return r === d.id;
      }).length;
      el.innerHTML = `${d.label}${cnt ? ` <span style="opacity:.6;margin-left:4px;font-size:10px">${cnt}</span>` : ''}`;
    });
  });
}

export default { render, init };
