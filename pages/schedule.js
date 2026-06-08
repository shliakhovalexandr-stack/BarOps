/* ============================================================
   BarOps — pages/schedule.js
   Графіки: Hub → Weekly view → Booking
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

// Роль із JWT-токена (джерело правди від сервера на вході), бо barops_role може застаріти.
function tokenRole() {
  try {
    const part = (localStorage.getItem('barops_token') || '').split('.')[1] || '';
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json).role || '').toLowerCase();
  } catch { return ''; }
}
function resolveRole() {
  return tokenRole() || (state.role || '').toLowerCase() || (localStorage.getItem('barops_role') || '').toLowerCase() || 'bartender';
}

// Редагувати графік можуть лише менеджер/адмін; решта — перегляд + бронювання вихідних.
function canEdit() {
  const r = resolveRole();
  return r === 'manager' || r === 'admin' || r === 'director';
}

/* ════════════════════════════════════════
   ROLE CONFIG (статичний)
════════════════════════════════════════ */
const ROLE_CONFIG = {
  cooks:      { label: 'Кухарі',    icon: 'fork',  color: '#FBBF24', bgIcon: 'rgba(251,191,36,0.10)',   bdIcon: 'rgba(251,191,36,0.28)',   apiRoles: ['cook','chef']                    },
  bartenders: { label: 'Бармени',   icon: 'glass', color: '#A88BFF', bgIcon: 'rgba(168,139,255,0.10)',  bdIcon: 'rgba(168,139,255,0.28)',  apiRoles: ['bartender','barman']             },
  waiters:    { label: 'Офіціанти', icon: 'tray',  color: '#86EFAC', bgIcon: 'rgba(134,239,172,0.10)',  bdIcon: 'rgba(134,239,172,0.28)',  apiRoles: ['waiter']                         },
  cleaners:   { label: 'Хозяюшки', icon: 'broom', color: '#86EFAC', bgIcon: 'rgba(134,239,172,0.10)',  bdIcon: 'rgba(134,239,172,0.28)',  apiRoles: ['hostess','cleaner','housekeeper'] },
};

/* ════════════════════════════════════════
   STATION COLOR PALETTE (авто-призначення)
════════════════════════════════════════ */
const PALETTE = [
  { bg:'rgba(34,211,238,.18)',  bd:'rgba(34,211,238,.40)',  tx:'#22D3EE' },
  { bg:'rgba(168,139,255,.18)', bd:'rgba(168,139,255,.35)', tx:'#A88BFF' },
  { bg:'rgba(251,191,36,.18)',  bd:'rgba(251,191,36,.35)',  tx:'#FBBF24' },
  { bg:'rgba(96,165,250,.18)',  bd:'rgba(96,165,250,.35)',  tx:'#60A5FA' },
  { bg:'rgba(134,239,172,.18)', bd:'rgba(134,239,172,.35)', tx:'#86EFAC' },
  { bg:'rgba(52,211,153,.18)',  bd:'rgba(52,211,153,.35)',  tx:'#34D399' },
];
function stClr(idx) { return PALETTE[idx % PALETTE.length]; }

/* ════════════════════════════════════════
   DEFAULTS — стандартні години зміни
════════════════════════════════════════ */
const DEFAULTS = {
  cooks:      { s: '08:00', e: '18:00' },
  bartenders: { s: '09:00', e: '23:00' },
  waiters:    { s: '11:00', e: '23:00' },
  cleaners:   { s: '06:00', e: '14:00' },
};

/* ════════════════════════════════════════
   WEEK HELPERS
════════════════════════════════════════ */
const DOW_SHORT  = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД'];
const MONTHS_GEN = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];

function getWeekDates(offset = 0) {
  const today  = new Date();
  const dow    = today.getDay();
  const diff   = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { d: DOW_SHORT[i], date: d, n: d.getDate(), m: d.getMonth(), weekend: i >= 5 };
  });
}
function dateKey(d) { return d.toISOString().split('T')[0]; }
// TZ-безпечний ключ дати (локальний календарний день, без зсуву через UTC)
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function venueShort(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
function weekLabel(wd) {
  const f = wd[0], l = wd[6];
  const yr = f.date.getFullYear();
  if (f.m === l.m) return `${f.n} — ${l.n} ${MONTHS_GEN[f.m]} · ${yr}`;
  return `${f.n} ${MONTHS_GEN[f.m]} — ${l.n} ${MONTHS_GEN[l.m]} · ${yr}`;
}
function isToday(d) {
  const t = new Date();
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}
function roleKeyForRole(role) {
  const r = (role || '').toLowerCase();
  for (const [key, cfg] of Object.entries(ROLE_CONFIG)) {
    if (cfg.apiRoles.includes(r)) return key;
  }
  return null;
}
function formatReqDates(dates) {
  if (!Array.isArray(dates) || !dates.length) return '';
  return dates.map(s => {
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d) ? s : `${DOW_SHORT[(d.getDay()+6)%7]} ${d.getDate()}`;
  }).join(', ');
}

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let _view          = 'hub';
let _role          = 'cooks';
let _mode          = 'view';
let _selDays       = new Set();
let _defaultsSheet = null;
let _cellSheet     = null;   // { roleKey, pi, di }
let _extraBar      = [];     // бармени з інших закладів мережі, додані в графік (per venue)
let _networkBar    = [];     // кеш барменів мережі (для пікера)
let _barPickerLoad = false;
let _rosterOrders  = {};     // збережений порядок працівників: { roleKey: [ids] }
let _cellMode      = 'shift';
let _weekOffset    = 0;
let _bookOffset    = 0;
let _rosters       = {};
let _stations      = {};     // { roleKey: [{ id, label }] }
let _venueId       = '';
let _networkRoster = { people: [], grid: [] };  // мережевий графік барменів (для не-менеджерів)
let _myDayoff      = [];  // власні запити на вихідні (для працівника — історія)

/* ════════════════════════════════════════
   LOAD ROSTERS + STATIONS
════════════════════════════════════════ */
async function loadRosters() {
  _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
  await loadBartenderRoster();
  await loadRosterOrders();
  const token     = localStorage.getItem('barops_token');
  const weekDates = getWeekDates(_weekOffset);

  let teamMembers = [];
  try {
    const url  = _venueId ? `${API}/api/auth/team?venueId=${_venueId}` : `${API}/api/auth/team`;
    const res  = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await res.json();
    if (Array.isArray(data.team)) teamMembers = data.team;
    console.log('[Schedule] team:', teamMembers.length, '| venueId:', _venueId,
      '|', teamMembers.map(m => `${m.name}(${m.role})`).join(', '));
  } catch (err) { console.warn('[Schedule] team error:', err); }

  // Load stations
  const stRaw = JSON.parse(localStorage.getItem('barops_stations_v1') || '{}');
  for (const key of Object.keys(ROLE_CONFIG)) {
    _stations[key] = (stRaw[_venueId]?.[key]) || [];
  }

  // Load schedule
  const stored = JSON.parse(localStorage.getItem('barops_schedule_v1') || '{}');
  const vData  = stored[_venueId] || {};
  // Підтверджені вихідні (окреме сховище за ymd, щоб без зсуву дат)
  const approvedOff = (JSON.parse(localStorage.getItem('barops_dayoff_approved_v1') || '{}')[_venueId]) || {};

  // Load day-off requests (тільки manager/admin; решта отримує 403 → пропускаємо)
  const dayoffByRole = {};
  try {
    const dUrl = _venueId ? `${API}/api/dayoff?venueId=${_venueId}` : `${API}/api/dayoff`;
    const dRes = await fetch(dUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (dRes.ok) {
      const dData = await dRes.json();
      for (const rq of (dData.requests || [])) {
        const rk = roleKeyForRole(rq.role);
        if (!rk) continue;
        (dayoffByRole[rk] ||= []).push({
          id: rq.id,
          who: rq.userName || 'Співробітник',
          day: formatReqDates(rq.dates),
          note: rq.note || '',
          status: rq.status || 'pending',
          userId: rq.userId || '',
          dates: rq.dates || [],
        });
      }
    }
  } catch (err) { console.warn('[Schedule] dayoff error:', err); }

  _rosters = {};
  for (const [key, cfg] of Object.entries(ROLE_CONFIG)) {
    // Бармени: весь список формує менеджер по іменах (без авто-підтягування з Команди).
    // Решта підрозділів — зі складу команди закладу.
    const basePeople = key === 'bartenders'
      ? _extraBar.map(e => ({ id: e.id, i: ini(e.n || '?'), n: e.n || 'Бармен', role: (e.role || 'bartender'), extra: true }))
      : teamMembers
          .filter(m => cfg.apiRoles.includes((m.role || '').toLowerCase()))
          .map(m => ({ id: m.id, i: ini(m.name || '?'), n: m.name || 'Невідомо', role: (m.role || '').toLowerCase() }));
    const people = applyOrder(key, basePeople);

    const grid = people.map(p => {
      const emp = vData[p.id] || {};
      const off = approvedOff[p.id] || {};
      return weekDates.map(w => {
        const slot = emp[dateKey(w.date)];
        if (slot) return { s: slot.start, e: slot.end, station: slot.station || null };
        if (off[ymd(w.date)]) return { dayOff: true };   // підтверджений вихідний
        return null;
      });
    });

    _rosters[key] = { ...cfg, sub: `${cfg.label} · ${people.length} люд`, people, grid, requests: dayoffByRole[key] || [] };
  }
}

function saveShiftToStorage(roleKey, pi, di, value) {
  const weekDates = getWeekDates(_weekOffset);
  const dk    = dateKey(weekDates[di].date);
  const empId = _rosters[roleKey]?.people[pi]?.id;
  if (!empId || !_venueId) return;
  const raw = JSON.parse(localStorage.getItem('barops_schedule_v1') || '{}');
  if (!raw[_venueId]) raw[_venueId] = {};
  if (!raw[_venueId][empId]) raw[_venueId][empId] = {};
  if (value === null) { delete raw[_venueId][empId][dk]; }
  else { raw[_venueId][empId][dk] = { start: value.s, end: value.e, station: value.station || null }; }
  localStorage.setItem('barops_schedule_v1', JSON.stringify(raw));
}

// Вихідний (день відпочинку) — окреме сховище за ymd
function saveDayOffToStorage(roleKey, pi, di, on) {
  const weekDates = getWeekDates(_weekOffset);
  const yk    = ymd(weekDates[di].date);
  const empId = _rosters[roleKey]?.people[pi]?.id;
  if (!empId || !_venueId) return;
  const raw = JSON.parse(localStorage.getItem('barops_dayoff_approved_v1') || '{}');
  if (!raw[_venueId]) raw[_venueId] = {};
  if (!raw[_venueId][empId]) raw[_venueId][empId] = {};
  if (on) raw[_venueId][empId][yk] = true;
  else    delete raw[_venueId][empId][yk];
  localStorage.setItem('barops_dayoff_approved_v1', JSON.stringify(raw));
}

function saveStations(roleKey) {
  const raw = JSON.parse(localStorage.getItem('barops_stations_v1') || '{}');
  if (!raw[_venueId]) raw[_venueId] = {};
  raw[_venueId][roleKey] = _stations[roleKey] || [];
  localStorage.setItem('barops_stations_v1', JSON.stringify(raw));
}

// Спільний список барменів — із сервера (один на мережу, для всіх менеджерів)
async function loadBartenderRoster() {
  _extraBar = [];
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`${API}/api/schedule/bartender-roster?venueId=${_venueId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) {
      const data = await res.json();
      _extraBar = (data.bartenders || []).map(b => ({ id: b.id, n: b.name }));
    }
  } catch {}
}

// Збережений порядок працівників (drag-reorder) для всіх ролей закладу
async function loadRosterOrders() {
  _rosterOrders = {};
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`${API}/api/schedule/roster-order?venueId=${_venueId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) { const data = await res.json(); _rosterOrders = data.orders || {}; }
  } catch {}
}

// Сортує людей за збереженим порядком (нові — у кінець, стабільно)
function applyOrder(roleKey, people) {
  const ord = _rosterOrders[roleKey];
  if (!ord || !ord.length) return people;
  const pos = new Map(ord.map((id, i) => [id, i]));
  return people
    .map((p, i) => ({ p, k: pos.has(p.id) ? pos.get(p.id) : 1e9 + i }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.p);
}

// Мережевий графік барменів (усі заклади) — для не-менеджерів.
async function loadNetwork() {
  const token     = localStorage.getItem('barops_token');
  const weekDates = getWeekDates(_weekOffset);
  const weekStart = ymd(weekDates[0].date);
  let shifts = [];
  try {
    const res = await fetch(`${API}/api/schedule/network?weekStart=${weekStart}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      shifts = Array.isArray(data.shifts) ? data.shifts : [];
    }
  } catch (err) { console.warn('[Schedule] network error:', err); }

  _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
  const myKey       = roleKeyForRole(resolveRole());         // роль КОРИСТУВАЧА (не вкладка-підрозділ _role)
  const deptRoles   = (ROLE_CONFIG[myKey]?.apiRoles) || [];
  const networkWide = myKey === 'bartenders';                // лише бармени бачать усю мережу; решта — свій заклад
  const byUser = {};
  for (const s of shifts) {
    if (!deptRoles.includes((s.role || '').toLowerCase())) continue;
    if (!networkWide && s.venueId !== _venueId) continue;    // не-бармени — лише свій заклад
    (byUser[s.userId] ||= { id: s.userId, n: s.userName || '—', cells: {} });
    byUser[s.userId].cells[s.date] = { s: s.start, e: s.end, venueName: s.venueName || '', stationName: s.stationName || '', station: s.station || null };
  }
  const people = Object.values(byUser)
    .map(p => ({ id: p.id, n: p.n, i: ini(p.n), cells: p.cells }))
    .sort((a, b) => a.n.localeCompare(b.n));
  const grid = people.map(p => weekDates.map(w => p.cells[ymd(w.date)] || null));
  _networkRoster = { people, grid };
}

async function reloadData() {
  if (canEdit()) await loadRosters();
  else           await loadNetwork();
}

async function patchDayOff(id, status) {
  const token = localStorage.getItem('barops_token');
  try {
    await fetch(`${API}/api/dayoff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ status }),
    });
  } catch (e) { console.error('[dayoff] patch:', e); }
}

const STATUS_LABEL = { pending: 'Очікує', approved: 'Підтверджено', rejected: 'Відхилено' };
const STATUS_COLOR = { pending: '#FBBF24', approved: '#86EFAC', rejected: '#FB7185' };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function fmtSubmitted(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : 'Надіслано ' + d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}
async function loadMyDayoff() {
  const token = localStorage.getItem('barops_token');
  try {
    const res = await fetch(`${API}/api/dayoff`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) { const d = await res.json(); _myDayoff = Array.isArray(d.requests) ? d.requests : []; }
  } catch (e) { console.warn('[dayoff] mine:', e); }
}

function findReqById(id) {
  for (const r of Object.values(_rosters)) {
    const f = (r.requests || []).find(x => x.id === id);
    if (f) return f;
  }
  return null;
}
// Підтверджений запит → позначаємо дати як вихідні у графіку (окреме сховище за ymd)
function markApprovedOff(req) {
  if (!req || !req.userId || !Array.isArray(req.dates) || !req.dates.length) return;
  const raw = JSON.parse(localStorage.getItem('barops_dayoff_approved_v1') || '{}');
  if (!raw[_venueId]) raw[_venueId] = {};
  if (!raw[_venueId][req.userId]) raw[_venueId][req.userId] = {};
  for (const d of req.dates) raw[_venueId][req.userId][d] = true;
  localStorage.setItem('barops_dayoff_approved_v1', JSON.stringify(raw));
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function ini(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length >= 2 ? p[0][0] + p[1][0] : (p[0] || '?')[0];
}
function avatarBg(name) {
  const c = ['#A88BFF','#FBBF24','#86EFAC','#FB7185','#93C5FD'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function roleIcon(icon) {
  const m = {
    fork: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.7 1.3 3 3 3s3-1.3 3-3V2"/><path d="M6 12v10"/><path d="M20 2a5 5 0 0 0-5 5c0 2.4 1.7 4.4 4 4.9V22h2V2z"/></svg>`,
    glass:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8M12 11v11M5 2l2 9h10l2-9z"/><path d="M9 7h6"/></svg>`,
    tray: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="14" width="20" height="4" rx="2"/><path d="M6 14V9a6 6 0 0 1 12 0v5"/></svg>`,
    star: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
    broom:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2L9 14"/><path d="M3 22l7-7"/><path d="M7 22c0-2.8 2.2-5 5-5"/><path d="M21 2l-5 5"/></svg>`,
  };
  return m[icon] || m.star;
}
function avatarStack(people, max = 3) {
  const show = people.slice(0, max);
  const rest = people.length - max;
  const circles = show.map((p, i) =>
    `<div style="width:22px;height:22px;border-radius:50%;background:${avatarBg(p.n)};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#000;margin-left:${i===0?'0':'-7px'};border:1.5px solid #0A0A0A;z-index:${max-i};position:relative;flex-shrink:0">${p.i}</div>`
  ).join('');
  const plus = rest > 0
    ? `<div style="width:22px;height:22px;border-radius:50%;background:#1F1F22;display:flex;align-items:center;justify-content:center;font-size:7px;color:#71717A;font-weight:600;margin-left:-7px;border:1.5px solid #0A0A0A;z-index:0;position:relative;flex-shrink:0">+${rest}</div>`
    : '';
  return `<div style="display:flex;align-items:center">${circles}${plus}</div>`;
}
function statusChips(r) {
  const gaps    = r.grid.reduce((a, row) => a + row.filter(c => c === null).length, 0);
  const pending = r.requests.filter(x => x.status === 'pending').length;
  if (!gaps && !pending && r.people.length > 0)
    return `<span style="display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;background:rgba(134,239,172,0.10);border:0.5px solid rgba(134,239,172,0.25);font-size:10px;color:#86EFAC;font-weight:500">Без зауважень</span>`;
  let out = '';
  if (gaps)    out += `<span style="display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;background:rgba(251,113,133,0.10);border:0.5px solid rgba(251,113,133,0.25);font-size:10px;color:#FB7185;font-weight:500">${gaps} дірок</span>`;
  if (pending) out += `<span style="display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;background:rgba(251,191,36,0.10);border:0.5px solid rgba(251,191,36,0.25);font-size:10px;color:#FBBF24;font-weight:500">${pending} запит${pending>1?'и':''}</span>`;
  return out;
}
function summaryStats() {
  let total = 0, onShift = 0, gaps = 0, pending = 0;
  for (const r of Object.values(_rosters)) {
    total   += r.people.length;
    onShift += r.grid.filter(row => row.some(c => c !== null)).length;
    gaps    += r.grid.reduce((a, row) => a + row.filter(c => c === null).length, 0);
    pending += r.requests.filter(x => x.status === 'pending').length;
  }
  return { total, onShift, gaps, pending };
}

/* ════════════════════════════════════════
   ROLE LABEL MAP + SHORT NAME HELPER
════════════════════════════════════════ */
const ROLE_LABEL = {
  chef: 'Шеф', cook: 'Кухар', bartender: 'Бармен', barman: 'Бармен',
  waiter: 'Офіціант', manager: 'Менеджер', admin: 'Системний менеджер',
  hostess: 'Хостес', cleaner: 'Хозяюшка', housekeeper: 'Хозяюшка',
  accountant: 'Бухгалтер',
};
function shortName(n) {
  const p = (n || '').trim().split(/\s+/);
  if (p.length >= 2) return `${p[0]} ${p[1][0]}.`;
  return p[0] || '?';
}

/* ════════════════════════════════════════
   DEPT TABLE — спільний рендер таблиці
════════════════════════════════════════ */
function renderDeptTable(roleKey) {
  const r         = _rosters[roleKey];
  const weekDates = getWeekDates(_weekOffset);
  const stns      = _stations[roleKey] || [];
  const stnColorMap = {};
  stns.forEach((s, i) => { stnColorMap[s.id] = stClr(i); });

  const thCells = weekDates.map(w => {
    const cls = [w.weekend ? 'wk' : '', isToday(w.date) ? 'td' : ''].filter(Boolean).join(' ');
    return `<th class="${cls}">${w.d}<br><span style="font-size:10px;font-weight:400">${w.n}</span></th>`;
  }).join('');

  const bodyRows = r.people.length === 0
    ? `<tr><td colspan="8"><div style="padding:10px 0 4px;color:#3F3F46;font-size:11px;text-align:center">Немає співробітників — додайте у «Команда»</div></td></tr>`
    : r.people.map((p, pi) => {
        const cells = r.grid[pi].map((cell, di) => {
          if (!cell) {
            const onclick = _mode === 'edit' ? `onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"` : '';
            return `<td><div class="sch-cell-off${_mode === 'edit' ? ' editable' : ''}" ${onclick}><svg width="10" height="10" viewBox="0 0 16 2" fill="none"><path d="M0 1h16" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/></svg></div></td>`;
          }
          if (cell.dayOff) {
            const onclick = _mode === 'edit' ? `onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"` : '';
            return `<td><div class="sch-cell-dayoff${_mode === 'edit' ? ' editable' : ''}" ${onclick}>Вих</div></td>`;
          }
          let bg = r.bgIcon, bd = r.bdIcon, tx = r.color;
          let label = cell.s.slice(0,2) + '–' + cell.e.slice(0,2);
          if (cell.station && stnColorMap[cell.station]) {
            const c = stnColorMap[cell.station];
            bg = c.bg; bd = c.bd; tx = c.tx;
            const stn = stns.find(s => s.id === cell.station);
            label = stn ? stn.label.slice(0,12) : label;
          }
          const onclick = _mode === 'edit'
            ? `onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"`
            : `onclick="window.__sch.showCellInfo('${p.n.split(' ')[0]}','${cell.s}','${cell.e}','${cell.station||''}')"`;
          return `<td><div class="sch-cell-btn" style="background:${bg};border:0.5px solid ${bd};color:${tx}" ${onclick}>${label}</div></td>`;
        }).join('');
        return `<tr>
          <td><div class="sch-gname"><div class="sch-gini" style="background:${r.bgIcon};color:${r.color}">${p.i}</div><span class="sch-gtext">${p.n.split(' ')[0]}</span></div></td>
          ${cells}
        </tr>`;
      }).join('');

  return `
    <div class="sch-grid-wrap">
      <table class="sch-table">
        <thead><tr><th style="text-align:left;color:#52525B;padding-right:6px">Хто</th>${thCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

/* ════════════════════════════════════════
   NETWORK GRID — графік барменів по всіх закладах (не-менеджер)
════════════════════════════════════════ */
function renderNetworkGrid() {
  const r         = _networkRoster;
  const weekDates = getWeekDates(_weekOffset);
  const thCells = weekDates.map(w => {
    const cls = [w.weekend ? 'wk' : '', isToday(w.date) ? 'td' : ''].filter(Boolean).join(' ');
    return `<th class="${cls}">${w.d}<br><span style="font-size:10px;font-weight:400">${w.n}</span></th>`;
  }).join('');
  const bodyRows = r.people.length === 0
    ? `<tr><td colspan="8"><div style="padding:16px 0;color:#3F3F46;font-size:12px;text-align:center">Графік на цей тиждень ще не опубліковано.</div></td></tr>`
    : r.people.map((p, pi) => {
        const cells = r.grid[pi].map(cell => {
          if (!cell) return `<td><div class="sch-cell-off"><svg width="10" height="10" viewBox="0 0 16 2" fill="none"><path d="M0 1h16" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/></svg></div></td>`;
          const place = (cell.stationName || cell.venueName || '').trim();   // де працює (станція=заклад), інакше заклад-публікатор
          const time  = `${(cell.s||'').slice(0,2)}–${(cell.e||'').slice(0,2)}`;
          return `<td><div class="sch-net-cell" title="${place}"><span class="sch-net-venue">${place.slice(0,10)}</span><span class="sch-net-time">${time}</span></div></td>`;
        }).join('');
        return `<tr>
          <td><div class="sch-gname"><div class="sch-gini" style="background:rgba(168,139,255,0.10);color:#A88BFF">${p.i}</div><span class="sch-gtext">${p.n.split(' ')[0]}</span></div></td>
          ${cells}
        </tr>`;
      }).join('');
  return `<div class="sch-grid-wrap"><table class="sch-table">
    <thead><tr><th style="text-align:left;color:#52525B;padding-right:6px">Хто</th>${thCells}</tr></thead>
    <tbody>${bodyRows}</tbody></table></div>`;
}

/* ════════════════════════════════════════
   CSS
════════════════════════════════════════ */
const CSS = `<style id="sch-css">
*{box-sizing:border-box}
.sch-wrap{display:flex;flex-direction:column;flex:1;overflow:hidden;background:#000}
.sch-scroll{overflow-y:auto;flex:1;padding-bottom:88px}.sch-scroll::-webkit-scrollbar{width:0}
.sch-hdr{display:flex;align-items:flex-start;gap:12px;padding:12px 18px 10px;flex-shrink:0}
.sch-back{width:36px;height:36px;border-radius:12px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:2px}
.sch-back:active{background:#1F1F22}
.sch-hdr-body{flex:1;min-width:0}
.sch-hdr-venue{font-size:11px;color:#71717A;font-weight:500;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
.sch-hdr-title{font-size:20px;font-weight:700;color:#fff;letter-spacing:-.02em;line-height:1.15}
.sch-hdr-sub{font-size:12px;color:#71717A;margin-top:2px}
.sch-hdr-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.sch-week{display:flex;align-items:center;justify-content:space-between;padding:0 18px 14px;flex-shrink:0}
.sch-week-lbl{font-size:13px;font-weight:600;color:#fff;letter-spacing:-.01em}
.sch-week-nav{display:flex;align-items:center;gap:6px}
.sch-wbtn{width:30px;height:30px;border-radius:9px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}.sch-wbtn:active{background:#1F1F22}
.sch-sec{display:flex;align-items:center;justify-content:space-between;padding:0 18px 8px}
.sch-sec-lbl{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.08em;text-transform:uppercase}
.sch-sec-val{font-size:11px;color:#71717A}
.sch-sum{margin:0 18px 14px;background:#0A0A0A;border:0.5px solid rgba(168,139,255,0.20);border-radius:14px;padding:16px}
.sch-sum-row{display:flex}
.sch-sum-cell{flex:1;text-align:center}
.sch-sum-val{font-size:22px;font-weight:700;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1}
.sch-sum-lbl{font-size:9px;font-weight:500;color:#52525B;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}
.sch-sum-div{width:0.5px;background:rgba(255,255,255,0.08);margin:0 2px}
.sch-seg{display:flex;margin:0 18px 14px;background:#141416;border-radius:10px;border:0.5px solid rgba(255,255,255,0.08);padding:3px;gap:3px}
.sch-seg-btn{flex:1;height:30px;border-radius:7px;border:none;font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:#71717A;transition:all .15s;font-family:inherit}
.sch-seg-btn.on{background:#1F1F22;color:#fff}
.sch-dept-list{display:flex;flex-direction:column;gap:8px;padding:0 18px}
.sch-dc{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;cursor:pointer;display:flex;align-items:center;gap:12px}
.sch-dc:active{background:#141416}
.sch-dc-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-dc-body{flex:1;min-width:0}
.sch-dc-name{font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em}
.sch-dc-sub{font-size:12px;color:#71717A;margin-top:2px;display:flex;align-items:center;gap:5px}
.sch-live{width:6px;height:6px;border-radius:50%;background:#86EFAC;display:inline-block;flex-shrink:0}
.sch-dc-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.sch-dc-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
.sch-add{margin:10px 18px 0;height:48px;border-radius:14px;border:0.5px dashed rgba(255,255,255,0.14);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:#52525B;gap:8px}
.sch-add:active{background:#0A0A0A}
.sch-bp-row{display:flex;align-items:center;gap:12px;padding:12px 8px;border-bottom:0.5px solid rgba(255,255,255,0.06);cursor:pointer}
.sch-bp-row:active{background:rgba(255,255,255,0.03)}
.sch-bp-check{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);color:#A1A1AA}
.sch-bp-check.on{background:rgba(168,139,255,0.15);border-color:rgba(168,139,255,0.40);color:#A88BFF}
.sch-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px}
.sch-qcard{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;cursor:pointer;display:flex;align-items:center;gap:10px}
.sch-qcard:active{background:#141416}
.sch-qicon{width:36px;height:36px;border-radius:10px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-qlbl{font-size:12px;font-weight:500;color:#A1A1AA;line-height:1.4}
.sch-kpi{display:flex;margin:0 18px 14px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:14px}
.sch-kpi-cell{flex:1;padding:14px 0;text-align:center;position:relative}
.sch-kpi-cell+.sch-kpi-cell::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:0.5px;background:rgba(255,255,255,0.08)}
.sch-kpi-val{font-size:20px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;line-height:1}
.sch-kpi-lbl{font-size:9px;font-weight:500;color:#52525B;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}
/* ── Grid table ── */
.sch-grid-wrap{margin:0 18px 16px;overflow-x:auto}.sch-grid-wrap::-webkit-scrollbar{height:3px;background:transparent}
.sch-grid-wrap::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
.sch-table{border-collapse:collapse;width:100%}
.sch-table th{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.04em;text-align:center;padding:0 3px 8px;vertical-align:bottom;white-space:nowrap}
.sch-table th.wk{color:#A88BFF}.sch-table th.td{color:#A88BFF;font-weight:700}
.sch-table td{padding:2px 3px;vertical-align:middle}
.sch-gname{display:flex;align-items:center;gap:6px;padding-right:8px;min-width:80px}
.sch-gini{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#000;flex-shrink:0}
.sch-gtext{font-size:11px;font-weight:500;color:#A1A1AA;white-space:nowrap;overflow:hidden;max-width:72px;text-overflow:ellipsis}
.sch-cell-btn{display:flex;align-items:center;justify-content:center;min-width:60px;height:32px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:transform .1s;user-select:none;padding:0 8px;white-space:nowrap;letter-spacing:-.01em}
.sch-cell-btn:active{transform:scale(.9)}
.sch-cell-off{min-width:60px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;opacity:.3;border:0.5px dashed transparent;transition:all .12s}
.sch-cell-off.editable{cursor:pointer}
.sch-cell-off.editable:hover{opacity:1;background:rgba(168,139,255,.14);border-color:rgba(168,139,255,.5)}
.sch-cell-off.editable:active{opacity:1;background:rgba(168,139,255,.22);border-color:rgba(168,139,255,.6)}
.sch-cell-dayoff{min-width:60px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#FB7185;background:rgba(251,113,133,.08);border:0.5px dashed rgba(251,113,133,.4);white-space:nowrap}
.sch-cell-dayoff.editable{cursor:pointer}
.sch-cell-dayoff.editable:hover{background:rgba(251,113,133,.16)}
.sch-net-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:60px;height:38px;border-radius:8px;background:rgba(168,139,255,.12);border:0.5px solid rgba(168,139,255,.28);padding:0 6px;line-height:1.2;gap:1px}
.sch-net-venue{font-size:10px;font-weight:700;color:#A88BFF;letter-spacing:.02em}
.sch-net-time{font-size:9px;font-weight:600;color:#C4B5FD;font-variant-numeric:tabular-nums}
/* секції-картки підрозділів */
.sch-dept-block{margin:0 14px 12px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden}
.sch-dept-head{display:flex;align-items:center;gap:8px;padding:13px 14px 9px}
.sch-dept-chev{width:26px;height:26px;border-radius:8px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sch-dept-block .sch-grid-wrap{margin:0 12px 12px}
.sch-hist{display:flex;align-items:center;gap:10px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px 12px}
.sch-hist-dates{font-size:13px;font-weight:600;color:#fff}
.sch-hist-note{font-size:11px;color:#71717A;margin-top:2px}
.sch-hist-when{font-size:10px;color:#52525B;margin-top:3px}
.sch-hist-badge{font-size:10px;font-weight:600;border-radius:7px;padding:3px 9px;white-space:nowrap;flex-shrink:0}
.sch-empty-state{text-align:center;padding:40px 20px;color:#52525B;font-size:13px;line-height:1.6}
.sch-cov{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:0 18px 16px}
.sch-cov-cell{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 4px;text-align:center}
.sch-cov-cell.lo{border-color:rgba(251,113,133,0.28)}.sch-cov-cell.td{border-color:rgba(168,139,255,0.30)}
.sch-cov-d{font-size:9px;color:#52525B;letter-spacing:.04em;margin-bottom:4px;text-transform:uppercase}
.sch-cov-n{font-size:15px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}.sch-cov-n.lo{color:#FB7185}
/* ── Station pills ── */
.sch-stn-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.sch-stn-chip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;user-select:none}
.sch-stn-chip:active{opacity:.75}
.sch-stn-chip.sel{outline:2px solid rgba(255,255,255,.30);outline-offset:1px}
.sch-stn-del{background:transparent;border:none;cursor:pointer;font-size:12px;padding:0;line-height:1;opacity:.55;font-family:inherit}
.sch-stn-del:hover{opacity:1}
/* ── Bottom sheets ── */
.sch-bar{position:sticky;bottom:0;background:#000;border-top:0.5px solid rgba(255,255,255,0.08);padding:12px 18px 28px;display:flex;gap:10px;flex-shrink:0}
.sch-bar-icon{width:52px;height:52px;border-radius:13px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sch-bar-icon:active{background:#1F1F22}
.sch-cta{flex:1;height:52px;border-radius:14px;background:#A88BFF;border:none;font-size:15px;font-weight:600;color:#000;cursor:pointer;letter-spacing:-.01em;font-family:inherit}
.sch-cta:active{opacity:.85}.sch-cta:disabled{opacity:.35;cursor:not-allowed}
.sch-cta-sec{flex:1;height:52px;border-radius:14px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);font-size:14px;font-weight:500;color:#A1A1AA;cursor:pointer;font-family:inherit}
.sch-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.76);display:flex;flex-direction:column;justify-content:flex-end;animation:schOvIn .18s ease}
@keyframes schOvIn{from{opacity:0}to{opacity:1}}
.sch-sheet{background:#0A0A0A;border-radius:22px 22px 0 0;border-top:0.5px solid rgba(255,255,255,0.08);padding:0 0 40px;animation:schSl .26s cubic-bezier(.22,1,.36,1);max-height:82vh;overflow-y:auto}
@keyframes schSl{from{transform:translateY(100%)}to{transform:none}}
.sch-sh-handle{width:36px;height:3px;background:rgba(255,255,255,0.12);border-radius:2px;margin:14px auto 18px}
.sch-sh-title{font-size:17px;font-weight:700;color:#fff;padding:0 20px 4px}
.sch-sh-sub{font-size:12px;color:#71717A;padding:0 20px 16px}
.sch-sh-btns{display:flex;gap:8px;padding:0 20px}
.sch-sbt{flex:1;height:48px;border-radius:13px;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.sch-sbt-cta{background:#A88BFF;color:#000}.sch-sbt-sec{background:#141416;color:#A1A1AA;border:0.5px solid rgba(255,255,255,0.08)}
.sch-sh-sec{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.07em;text-transform:uppercase;padding:0 20px 8px}
.sch-time-row{display:flex;align-items:center;gap:8px;padding:0 20px 16px}
.sch-tinp{flex:1;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 12px;font-size:16px;color:#fff;outline:none;font-family:inherit;text-align:center;-webkit-appearance:none;color-scheme:dark}
.sch-tsep{font-size:14px;color:#52525B;flex-shrink:0}
.sch-off-row{display:flex;align-items:center;gap:12px;padding:12px 20px 16px;cursor:pointer;border-top:0.5px solid rgba(255,255,255,.06)}
.sch-off-row:active{background:rgba(255,255,255,.03)}
.sch-req-list{display:flex;flex-direction:column;gap:6px;padding:0 18px 16px}
.sch-req{border-radius:12px;padding:12px 14px;border:0.5px solid transparent;display:flex;align-items:center;gap:10px}
.sch-req.pending{background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.22)}
.sch-req.approved{background:rgba(134,239,172,0.06);border-color:rgba(134,239,172,0.18)}
.sch-req-who{font-size:13px;font-weight:600;color:#fff}
.sch-req-day{font-size:11px;color:#71717A;margin-top:2px}
.sch-rbtn{width:30px;height:30px;border-radius:9px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-rbtn.ap{background:#A88BFF}.sch-rbtn.rj{background:#1F1F22;border:0.5px solid rgba(255,255,255,0.08)}
/* Booking */
.sch-cal-nav{display:flex;align-items:center;justify-content:space-between;padding:0 18px 14px}
.sch-cal-month{font-size:16px;font-weight:700;color:#fff;letter-spacing:-.01em}
.sch-cal-wrap{margin:0 18px 16px}
.sch-cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px}
.sch-cal-dow div{text-align:center;font-size:11px;font-weight:500;color:#52525B}
.sch-cal-dow .vio{color:#A88BFF}
.sch-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.sch-cell{aspect-ratio:1/1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;cursor:pointer;position:relative;background:#0A0A0A;color:#fff;border:0.5px solid rgba(255,255,255,0.08);transition:background .1s}
.sch-cell:active{background:#1F1F22}
.sch-cell.empty{background:transparent;border-color:transparent;pointer-events:none}
.sch-cell.past{opacity:.3;pointer-events:none;color:#52525B}
.sch-cell.today::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#A88BFF}
.sch-cell.sel{background:#A88BFF;color:#000;border-color:#A88BFF}
.sch-cell.sel.today::after{background:#000}
.sch-cell.wknd:not(.sel):not(.past){color:#A88BFF}
.sch-bsum{margin:0 18px 16px;background:rgba(168,139,255,0.07);border:0.5px solid rgba(168,139,255,0.22);border-radius:14px;padding:14px}
.sch-bsum-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.sch-bsum-title{font-size:10px;font-weight:500;color:#A88BFF;letter-spacing:.07em;text-transform:uppercase}
.sch-bsum-count{font-size:20px;font-weight:700;color:#A88BFF;font-variant-numeric:tabular-nums}
.sch-bchips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.sch-bchip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:6px;background:rgba(168,139,255,0.12);border:0.5px solid rgba(168,139,255,0.28);font-size:11px;font-weight:500;color:#A88BFF;cursor:pointer}
.sch-bquota{font-size:11px;color:#71717A;line-height:1.5}
.sch-cmnt{padding:0 18px 16px}
.sch-cmnt-lbl{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px}
.sch-cmnt-inp{width:100%;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.10);border-radius:12px;padding:12px 14px;font-size:13px;color:#fff;resize:none;outline:none;font-family:inherit}
.sch-cmnt-inp:focus{border-color:rgba(168,139,255,0.40)}.sch-cmnt-inp::placeholder{color:#52525B}
</style>`;

/* ════════════════════════════════════════
   SCREEN 1 — HUB (всі підрозділи разом)
════════════════════════════════════════ */
function renderHub() {
  const stats     = summaryStats();
  const venueName = state.venue || localStorage.getItem('barops_venue') || 'Bar Noir';
  const wLabel    = weekLabel(getWeekDates(_weekOffset));

  const deptSections = Object.entries(_rosters).map(([key, r]) => {
    const onShift = r.grid.filter(row => row.some(c => c !== null)).length;
    return `
      <div class="sch-dept-block">
        <div class="sch-dept-head">
          <div style="width:8px;height:8px;border-radius:3px;background:${r.color};flex-shrink:0"></div>
          <div style="font-size:12px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:.05em;flex:1">${r.label}</div>
          <div style="font-size:11px;color:#52525B">${r.people.length} · ${onShift} на зміні</div>
          <div class="sch-dept-chev" onclick="window.__sch.goRole('${key}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
        ${renderDeptTable(key)}
      </div>`;
  }).join('');

  // Зведені запити на вихідні (усі підрозділи) — щоб менеджер бачив одразу на хабі
  const allReqs = [];
  Object.values(_rosters).forEach(r => (r.requests || []).forEach(req => allReqs.push(req)));
  allReqs.sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
  const pendingCount = allReqs.filter(r => r.status === 'pending').length;
  const reqSection = allReqs.length ? `
    <div class="sch-sec"><div class="sch-sec-lbl">Запити на вихідні</div><div class="sch-sec-val">${pendingCount ? pendingCount + ' нових' : 'всі опрацьовані'}</div></div>
    <div class="sch-req-list">
      ${allReqs.map(req => `
      <div class="sch-req ${req.status}">
        <div style="flex:1;min-width:0"><div class="sch-req-who">${esc(req.who)}</div><div class="sch-req-day">${req.day}${req.note ? ` · ${esc(req.note)}` : ''}</div></div>
        ${req.status === 'pending'
          ? `<button class="sch-rbtn ap" onclick="window.__sch.hubApproveReq('${req.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
             <button class="sch-rbtn rj" onclick="window.__sch.hubRejectReq('${req.id}')" style="margin-left:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
          : `<span style="font-size:11px;font-weight:600;color:${STATUS_COLOR[req.status] || '#71717A'};white-space:nowrap">${STATUS_LABEL[req.status] || req.status}</span>`}
      </div>`).join('')}
    </div>` : '';

  const userRole = resolveRole();                 // роль КОРИСТУВАЧА (не вкладка _role)
  const netKey   = roleKeyForRole(userRole);
  const netLabel = (ROLE_CONFIG[netKey]?.label || 'Зміни').toUpperCase();
  const netScope = netKey === 'bartenders' ? 'вся мережа' : (state.venue || 'свій заклад');

  const bar = !canEdit()
    ? `<div class="sch-bar"><button class="sch-cta" onclick="window.__sch.goBooking()">Забронювати вихідні</button></div>`
    : _mode === 'edit'
    ? `<div class="sch-bar"><button class="sch-cta-sec" onclick="window.__sch.setMode('view')">Скасувати</button><button class="sch-cta" style="flex:2" onclick="window.__sch.setMode('view')">Зберегти зміни</button></div>`
    : `<div class="sch-bar"><div class="sch-bar-icon" onclick=""><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><button class="sch-cta" onclick="window.__sch.publishSchedule()">Опублікувати графік</button></div>`;

  return CSS + `
  <div class="sch-wrap">
    <div class="sch-hdr">
      <div class="sch-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sch-hdr-body">
        <div class="sch-hdr-venue">${venueName}</div>
        <div class="sch-hdr-title">Графіки</div>
      </div>
      <div class="sch-hdr-icon" style="background:#141416;border:0.5px solid rgba(255,255,255,0.08)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      </div>
    </div>
    <div class="sch-week">
      <div class="sch-week-lbl">${wLabel}</div>
      <div class="sch-week-nav">
        <div class="sch-wbtn" onclick="window.__sch.prevWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="sch-wbtn" onclick="window.__sch.nextWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
    </div>
    <div class="sch-scroll">
      ${canEdit() ? `
      <div class="sch-seg">
        <button class="sch-seg-btn${_mode==='view'?' on':''}" onclick="window.__sch.setMode('view')">Переглянути</button>
        <button class="sch-seg-btn${_mode==='edit'?' on':''}" onclick="window.__sch.setMode('edit')">Редагувати</button>
      </div>
      ${deptSections}
      ${reqSection}
      ` : (netKey ? `
      <div class="sch-dept-block">
        <div class="sch-dept-head">
          <div style="width:8px;height:8px;border-radius:3px;background:#A88BFF;flex-shrink:0"></div>
          <div style="font-size:12px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:.05em;flex:1">${netLabel} · ${netScope}</div>
        </div>
        ${renderNetworkGrid()}
      </div>
      <div style="margin:4px 14px 0;padding:12px 14px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:12px">
        <div style="font-size:12px;color:#71717A;line-height:1.5">Натисніть «Забронювати вихідні» внизу, щоб надіслати бажані вихідні менеджеру.</div>
      </div>
      ` : `
      <div style="margin:32px 18px;padding:24px 20px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;text-align:center">
        <div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:6px">Для вашої ролі графік не ведеться</div>
        <div style="font-size:12px;color:#71717A">Роль акаунта: <b style="color:#A88BFF">${ROLE_LABEL[userRole] || userRole || '—'}</b></div>
        <div style="font-size:11px;color:#52525B;margin-top:8px;line-height:1.5">Якщо ви бармен/кухар/офіціант — перевірте роль цього акаунта в «Команда».</div>
      </div>
      `)}
    </div>
    ${bar}
  </div>`;
}

/* ════════════════════════════════════════
   SCREEN 2 — ROLE VIEW
════════════════════════════════════════ */
function renderRoleView(roleKey) {
  const r = _rosters[roleKey];
  if (!r) return renderHub();

  const weekDates   = getWeekDates(_weekOffset);
  const wLabel      = weekLabel(weekDates);
  const stns        = _stations[roleKey] || [];
  const venueName   = state.venue || localStorage.getItem('barops_venue') || 'Bar Noir';
  const totalPeople = r.people.length;
  const totalShifts = r.grid.reduce((a, row) => a + row.filter(c => c !== null).length, 0);
  const totalOff    = r.grid.reduce((a, row) => a + row.filter(c => c === null).length, 0);

  // Station color map
  const stnColorMap = {};
  stns.forEach((s, i) => { stnColorMap[s.id] = stClr(i); });

  // Table header cells
  const thCells = weekDates.map(w => {
    const isWk = w.weekend, isTd = isToday(w.date);
    const clr  = (isWk || isTd) ? '#A88BFF' : '#52525B';
    const fw   = isTd ? '700' : '500';
    return `<th style="text-align:center;padding:0 2px 10px;white-space:nowrap;min-width:44px">
      <div style="font-size:10px;font-weight:${fw};color:${clr};letter-spacing:.03em">${w.d}</div>
      <div style="font-size:12px;font-weight:${fw};color:${isTd||isWk?'#A88BFF':'#A1A1AA'}">${w.n}</div>
    </th>`;
  }).join('');

  // Column header label (singularize Ukrainian plural)
  const colHdr = r.label.toUpperCase().replace(/[ІИ]$/, '');

  // Table body rows
  const bodyRows = r.people.length === 0
    ? `<tr><td colspan="8"><div style="padding:24px 0;color:#3F3F46;font-size:12px;text-align:center">${roleKey === 'bartenders' ? 'Список порожній.<br>Додайте барменів кнопкою нижче.' : 'Немає співробітників.<br>Додайте у розділі «Команда».'}</div></td></tr>`
    : r.people.map((p, pi) => {
        const subtitle = ROLE_LABEL[p.role] || 'Співробітник';
        const cells = r.grid[pi].map((cell, di) => {
          if (!cell) {
            const edt = _mode === 'edit';
            return `<td style="padding:2px"><div style="min-width:40px;height:30px;border-radius:8px;background:#141416;border:0.5px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:#3F3F46;cursor:${edt?'pointer':'default'}" ${edt?`onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"`:''}>off</div></td>`;
          }
          if (cell.dayOff) {
            const edt = _mode === 'edit';
            return `<td style="padding:2px"><div style="min-width:40px;height:30px;border-radius:8px;background:rgba(251,113,133,0.08);border:0.5px dashed rgba(251,113,133,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#FB7185;cursor:${edt?'pointer':'default'}" ${edt?`onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"`:''}>Вих</div></td>`;
          }
          let bg = r.bgIcon, bd = r.bdIcon, tx = r.color;
          let label = cell.s.slice(0,2) + '–' + cell.e.slice(0,2);
          if (cell.station && stnColorMap[cell.station]) {
            const c = stnColorMap[cell.station];
            bg = c.bg; bd = c.bd; tx = c.tx;
            const stn = stns.find(s => s.id === cell.station);
            if (stn) label = stn.label;
          }
          const onclick = _mode === 'edit'
            ? `onclick="window.__sch.openCellSheet('${roleKey}',${pi},${di})"`
            : `onclick="window.__sch.showCellInfo('${p.n.split(' ')[0]}','${cell.s}','${cell.e}','${cell.station||''}')"`;
          return `<td style="padding:2px"><div style="min-width:40px;height:30px;border-radius:8px;background:${bg};border:0.5px solid ${bd};color:${tx};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;white-space:nowrap;padding:0 7px;cursor:pointer" ${onclick}>${label}</div></td>`;
        }).join('');
        const editDrag = canEdit() && _mode === 'edit';
        return `<tr data-pid="${p.id}">
          <td style="padding:4px 10px 4px 0;min-width:84px;vertical-align:middle">
            <div style="display:flex;align-items:center;gap:7px">
              ${editDrag ? `<svg class="sch-drag-h" width="13" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:#52525B;flex-shrink:0;cursor:grab;touch-action:none"><circle cx="9" cy="5" r="1.7"/><circle cx="15" cy="5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="19" r="1.7"/><circle cx="15" cy="19" r="1.7"/></svg>` : ''}
              <div style="min-width:0">
                <div style="font-size:12px;font-weight:600;color:#fff;line-height:1.2;white-space:nowrap">${shortName(p.n)}</div>
                <div style="font-size:10px;color:#52525B;margin-top:1px">${subtitle}</div>
              </div>
            </div>
          </td>
          ${cells}
        </tr>`;
      }).join('');

  // ПРОЦЕСИ chips
  const procChips = `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 18px 16px;align-items:center">
    ${stns.map((s, i) => {
      const c = stClr(i);
      return `<div style="display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:8px;background:${c.bg};border:0.5px solid ${c.bd};font-size:11px;font-weight:500;color:${c.tx}">
        <span style="width:6px;height:6px;border-radius:50%;background:${c.tx};flex-shrink:0"></span>
        ${s.label}
        ${_mode==='edit'?`<button onclick="window.__sch.removeStation('${roleKey}','${s.id}')" style="background:none;border:none;color:${c.tx};opacity:.55;cursor:pointer;font-size:12px;padding:0;margin-left:1px;line-height:1;font-family:inherit">×</button>`:''}
      </div>`;
    }).join('')}
    ${_mode==='edit'?`<div style="display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 10px;border-radius:8px;background:rgba(168,139,255,.08);border:0.5px solid rgba(168,139,255,.25);font-size:11px;color:#A88BFF;cursor:pointer" onclick="window.__sch.showAddStationInput('${roleKey}')">+ Процес</div>`:''}
    ${stns.length===0&&_mode!=='edit'?`<span style="font-size:11px;color:#3F3F46">Немає процесів — перейдіть до «Редагувати»</span>`:''}
  </div>
  <div id="sch-stn-list" style="padding:0 18px 8px"></div>`;

  // ПОКРИТТЯ ПРОЦЕСІВ per-station table
  let coverageSection = '';
  if (stns.length > 0 && r.people.length > 0) {
    const rows = stns.map((s, si) => {
      const c = stClr(si);
      const dayCounts = weekDates.map((w, di) =>
        r.grid.filter(row => row[di]?.station === s.id).length
      );
      const cells = dayCounts.map((cnt, di) => {
        const isTd = isToday(weekDates[di].date);
        const clr  = cnt === 0 ? '#FB7185' : isTd ? '#A88BFF' : '#A1A1AA';
        return `<td style="text-align:center;padding:3px 2px;font-size:12px;font-weight:700;color:${clr};font-variant-numeric:tabular-nums;min-width:44px">${cnt}</td>`;
      }).join('');
      return `<tr>
        <td style="padding:4px 10px 4px 0;min-width:84px;vertical-align:middle">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="width:6px;height:6px;border-radius:50%;background:${c.tx};flex-shrink:0"></span>
            <span style="font-size:11px;color:#71717A;white-space:nowrap">${s.label}</span>
          </div>
        </td>${cells}
      </tr>`;
    }).join('');
    coverageSection = `
      <div style="font-size:10px;font-weight:500;color:#52525B;letter-spacing:.07em;text-transform:uppercase;padding:0 18px 10px">Покриття процесів</div>
      <div style="margin:0 18px 16px;overflow-x:auto"><table style="border-collapse:collapse;min-width:100%">${rows}</table></div>`;
  }

  // Defaults (edit mode)
  const defaultsSection = _mode === 'edit' ? `
    <div style="margin:0 18px 12px;padding:12px 14px;background:#0A0A0A;border:0.5px solid rgba(168,139,255,0.22);border-radius:12px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:500;color:#71717A;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Стандартна зміна</div>
        <div style="font-size:15px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums">${DEFAULTS[roleKey].s} – ${DEFAULTS[roleKey].e}</div>
      </div>
      <button onclick="window.__sch.openDefaultsSheet('${roleKey}')" style="height:30px;padding:0 12px;border-radius:8px;background:rgba(168,139,255,0.10);border:0.5px solid rgba(168,139,255,0.28);font-size:12px;color:#A88BFF;cursor:pointer;font-family:inherit">Змінити</button>
    </div>` : '';

  // Requests
  const reqHtml = r.requests.map((req, ri) => `
    <div class="sch-req ${req.status}" id="sch-req-${roleKey}-${ri}">
      <div style="flex:1"><div class="sch-req-who">${req.who}</div><div class="sch-req-day">${req.day}${req.note ? ` · ${req.note}` : ''}</div></div>
      ${req.status === 'pending'
        ? `<button class="sch-rbtn ap" onclick="window.__sch.approveReq('${roleKey}',${ri})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
           <button class="sch-rbtn rj" onclick="window.__sch.rejectReq('${roleKey}',${ri})" style="margin-left:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
      }
    </div>`
  ).join('');

  const bar = canEdit()
    ? `<div class="sch-bar"><div class="sch-bar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><button class="sch-cta" onclick="window.__sch.publishSchedule()">Опублікувати графік</button></div>`
    : `<div class="sch-bar"><button class="sch-cta" onclick="window.__sch.goBooking()">Забронювати вихідні</button></div>`;

  const editPill = canEdit()
    ? `<button onclick="window.__sch.setMode('${_mode==='edit'?'view':'edit'}')"
        style="height:34px;padding:0 14px;border-radius:20px;background:${_mode==='edit'?'#1F1F22':'#A88BFF'};border:${_mode==='edit'?'0.5px solid rgba(255,255,255,0.12)':'none'};font-size:13px;font-weight:600;color:${_mode==='edit'?'#A1A1AA':'#000'};cursor:pointer;font-family:inherit;flex-shrink:0;display:flex;align-items:center;gap:6px;margin-top:2px">
        ${_mode==='edit'
          ? 'Готово'
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Редагувати`}
      </button>`
    : '';

  return CSS + `
  <div class="sch-wrap">
    <div class="sch-hdr">
      <div class="sch-back" onclick="window.__sch.goHub()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sch-hdr-body">
        <div class="sch-hdr-venue">Графік · ${venueName}</div>
        <div class="sch-hdr-title">${r.label}</div>
      </div>
      ${editPill}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 18px 12px;flex-shrink:0">
      <div class="sch-wbtn" onclick="window.__sch.prevWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
      <div style="font-size:14px;font-weight:600;color:#fff;letter-spacing:-.01em">${wLabel}</div>
      <div class="sch-wbtn" onclick="window.__sch.nextWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
    </div>
    <div class="sch-scroll">
      <div class="sch-kpi" style="margin:0 18px 16px">
        <div class="sch-kpi-cell"><div class="sch-kpi-val">${totalPeople}</div><div class="sch-kpi-lbl">${colHdr}</div></div>
        <div class="sch-kpi-cell"><div class="sch-kpi-val">${totalShifts}</div><div class="sch-kpi-lbl">ЗМІН</div></div>
        <div class="sch-kpi-cell"><div class="sch-kpi-val">${totalOff}</div><div class="sch-kpi-lbl">ВИХІДНИХ</div></div>
      </div>
      ${defaultsSection}
      <div id="sch-grid-scroll" style="margin:0 18px 16px;overflow-x:auto">
        <table style="border-collapse:collapse;min-width:100%">
          <thead><tr>
            <th style="text-align:left;padding:0 10px 10px 0;font-size:10px;font-weight:500;color:#52525B;letter-spacing:.06em;min-width:84px">${colHdr}</th>
            ${thCells}
          </tr></thead>
          <tbody id="sch-tbody-${roleKey}">${bodyRows}</tbody>
        </table>
      </div>
      ${(roleKey === 'bartenders' && canEdit() && _mode === 'edit')
        ? `<button class="sch-add" style="width:calc(100% - 36px);box-sizing:border-box;margin:2px 18px 16px" onclick="window.__sch.openBarPicker()">+ Додати бармена у графік</button>` : ''}
      <div style="font-size:10px;font-weight:500;color:#52525B;letter-spacing:.07em;text-transform:uppercase;padding:0 18px 10px">Процеси</div>
      ${procChips}
      ${coverageSection}
      ${r.requests.length ? `
      <div class="sch-sec"><div class="sch-sec-lbl">Запити</div><div class="sch-sec-val">${r.requests.length}</div></div>
      <div class="sch-req-list" id="sch-reqs">${reqHtml}</div>` : ''}
    </div>
    ${bar}
  </div>`;
}

/* ════════════════════════════════════════
   SCREEN 3 — BOOKING
════════════════════════════════════════ */
function renderBooking() {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + _bookOffset);
  const year  = base.getFullYear();
  const month = base.getMonth();
  const MONTHS_NOM = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  const firstDow    = new Date(year, month, 1).getDay();
  const offset      = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = ymd(new Date());
  const mm          = String(month + 1).padStart(2, '0');
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(`<div class="sch-cell empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`;
    const dowIdx  = (offset + d - 1) % 7;
    const isPast  = dateStr < todayStr;
    const isSel   = _selDays.has(dateStr);
    let cls = 'sch-cell';
    if (isPast) cls += ' past';
    else if (isSel) cls += ' sel';
    else if (dowIdx >= 5) cls += ' wknd';
    if (dateStr === todayStr) cls += ' today';
    cells.push(`<div class="${cls}" ${!isPast?`onclick="window.__sch.toggleDay('${dateStr}')"`:''}>${d}</div>`);
  }
  const selArr = [..._selDays].sort();
  const chips  = selArr.map(ds => {
    const dt = new Date(`${ds}T00:00:00`);
    return `<div class="sch-bchip" onclick="window.__sch.toggleDay('${ds}')">${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]} <span style="opacity:.6">×</span></div>`;
  }).join('');
  return CSS + `
  <div class="sch-wrap">
    <div class="sch-hdr">
      <div class="sch-back" onclick="window.__sch.goHub()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sch-hdr-body"><div class="sch-hdr-venue">Графік</div><div class="sch-hdr-title">Бронювання вихідних</div></div>
    </div>
    <div class="sch-scroll">
      <div class="sch-cal-nav">
        <div class="sch-wbtn" onclick="window.__sch.prevMonth()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="sch-cal-month">${MONTHS_NOM[month]} ${year}</div>
        <div class="sch-wbtn" onclick="window.__sch.nextMonth()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="sch-cal-wrap">
        <div class="sch-cal-dow">${DOW_SHORT.map(d=>`<div class="${d==='СБ'||d==='НД'?'vio':''}">${d}</div>`).join('')}</div>
        <div class="sch-cal-grid">${cells.join('')}</div>
      </div>
      <div class="sch-bsum">
        <div class="sch-bsum-head"><div class="sch-bsum-title">Обрано вихідних</div><div class="sch-bsum-count">${selArr.length}</div></div>
        ${selArr.length?`<div class="sch-bchips">${chips}</div>`:''}
        <div class="sch-bquota">Обрані дні будуть надіслані на підтвердження.</div>
      </div>
      <div class="sch-cmnt"><div class="sch-cmnt-lbl">Коментар</div><textarea class="sch-cmnt-inp" placeholder="Причина запиту..." rows="3"></textarea></div>
      ${_myDayoff.length ? `
      <div class="sch-sec"><div class="sch-sec-lbl">Мої запити</div><div class="sch-sec-val">${_myDayoff.length}</div></div>
      <div style="padding:0 18px 16px;display:flex;flex-direction:column;gap:6px">
        ${_myDayoff.map(r => {
          const lbl = STATUS_LABEL[r.status] || r.status;
          const clr = STATUS_COLOR[r.status] || '#71717A';
          return `<div class="sch-hist">
            <div style="flex:1;min-width:0">
              <div class="sch-hist-dates">${formatReqDates(r.dates)}</div>
              ${r.note ? `<div class="sch-hist-note">${esc(r.note)}</div>` : ''}
              <div class="sch-hist-when">${fmtSubmitted(r.createdAt)}</div>
            </div>
            <span class="sch-hist-badge" style="color:${clr};border:0.5px solid ${clr}66;background:${clr}1f">${lbl}</span>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>
    <div class="sch-bar">
      <button class="sch-cta" ${selArr.length===0?'disabled':''} onclick="window.__sch.submitBooking()">Надіслати запит · ${selArr.length} ${selArr.length===1?'день':selArr.length<5?'дні':'днів'}</button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   OVERLAY: cell edit sheet
   Клік на клітинку → вибір локації + час
════════════════════════════════════════ */
function renderCellSheet() {
  if (!_cellSheet) return '';
  const { roleKey, pi, di } = _cellSheet;
  const r    = _rosters[roleKey];
  const p    = r.people[pi];
  const cell = r.grid[pi][di];
  const w    = getWeekDates(_weekOffset)[di];
  const stns = _stations[roleKey] || [];
  const def  = DEFAULTS[roleKey];

  const isShift  = _cellMode === 'shift';
  const startDef = cell ? cell.s : def.s;
  const endDef   = cell ? cell.e : def.e;
  const curStn   = cell?.station || null;

  // Station chips — завжди видимі, з можливістю додати нову
  const stnChips = `
    <div class="sch-sh-sec">Процес · Локація</div>
    <div class="sch-stn-row" style="padding:0 20px 12px">
      ${stns.map((s, i) => {
        const c   = stClr(i);
        const sel = curStn === s.id;
        return `<div id="sch-stn-${s.id}" class="sch-stn-chip${sel?' sel':''}"
          style="background:${c.bg};border:0.5px solid ${c.bd};color:${c.tx}"
          onclick="window.__sch.selectStation('${s.id}')">${s.label}</div>`;
      }).join('')}
      <div id="sch-stn-null" class="sch-stn-chip${!curStn?' sel':''}"
        style="background:#1F1F22;border:0.5px solid rgba(255,255,255,0.10);color:#71717A"
        onclick="window.__sch.selectStation(null)">Без</div>
      <div class="sch-stn-chip"
        style="background:rgba(168,139,255,0.08);border:0.5px solid rgba(168,139,255,0.25);color:#A88BFF"
        onclick="window.__sch.showInlineAddStation('${roleKey}')">+ Додати</div>
    </div>
    <div id="sch-inline-add" style="display:none;padding:0 20px 12px">
      <div style="display:flex;gap:6px">
        <input id="sch-inline-stn" placeholder="Піца, Паста, Гарячий цех…"
          style="flex:1;background:#1F1F22;border:0.5px solid rgba(168,139,255,0.40);border-radius:8px;padding:8px 10px;font-size:12px;color:#fff;outline:none;font-family:inherit"
          onkeydown="if(event.key==='Enter')window.__sch.addInlineStation('${roleKey}')">
        <button onclick="window.__sch.addInlineStation('${roleKey}')"
          style="height:36px;padding:0 12px;border-radius:8px;background:rgba(168,139,255,.15);border:0.5px solid rgba(168,139,255,.30);font-size:13px;color:#A88BFF;cursor:pointer;font-family:inherit">✓</button>
      </div>
    </div>`;

  return `
  <div class="sch-ov" id="sch-cell-ov" onclick="window.__sch.closeCellOv(event)">
    <div class="sch-sheet">
      <div class="sch-sh-handle"></div>
      <div class="sch-sh-title">${p.n.split(' ')[0]} · ${w.d} ${w.n}</div>
      <div class="sch-sh-sub">${MONTHS_GEN[w.m]} ${w.date.getFullYear()}</div>

      ${stnChips}

      <div class="sch-sh-sec" id="sch-time-label" style="display:${isShift?'block':'none'}">Час зміни</div>
      <div class="sch-time-row" id="sch-time-row" style="display:${isShift?'flex':'none'}">
        <input id="sch-t-start" type="time" class="sch-tinp" value="${startDef}" oninput="window.__sch.updateTimePreview()">
        <span class="sch-tsep">—</span>
        <input id="sch-t-end"   type="time" class="sch-tinp" value="${endDef}"   oninput="window.__sch.updateTimePreview()">
      </div>
      ${isShift ? `<div style="text-align:right;padding:0 20px 12px"><button onclick="window.__sch.resetToDefault()" style="background:transparent;border:none;font-size:11px;color:#71717A;cursor:pointer;font-family:inherit">↺ Стандарт (${def.s}–${def.e})</button></div>` : ''}

      <div class="sch-off-row" onclick="window.__sch.toggleCellMode()">
        <div style="width:32px;height:32px;border-radius:9px;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isShift?'#52525B':'#FB7185'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:${isShift?'#71717A':'#FB7185'}">Вихідний</div>
          <div style="font-size:11px;color:#52525B;margin-top:1px">День відпочинку</div>
        </div>
        ${!isShift?`<svg style="margin-left:auto;flex-shrink:0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A88BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`:''}
      </div>

      <div class="sch-sh-btns">
        <button class="sch-sbt sch-sbt-sec" onclick="window.__sch.closeCellSheet()">Скасувати</button>
        <button class="sch-sbt sch-sbt-cta" onclick="window.__sch.saveCell()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   OVERLAY: defaults sheet
════════════════════════════════════════ */
function renderDefaultsSheet(roleKey) {
  const r   = _rosters[roleKey];
  const def = DEFAULTS[roleKey];
  return `
  <div class="sch-ov" id="sch-def-ov" onclick="window.__sch.closeDefaultsOv(event)">
    <div class="sch-sheet">
      <div class="sch-sh-handle"></div>
      <div class="sch-sh-title">Стандартна зміна</div>
      <div class="sch-sh-sub">${r.label} · застосовується до нових клітинок</div>
      <div class="sch-sh-sec">Час зміни</div>
      <div class="sch-time-row">
        <input id="sch-def-start" type="time" class="sch-tinp" value="${def.s}">
        <span class="sch-tsep">—</span>
        <input id="sch-def-end" type="time" class="sch-tinp" value="${def.e}">
      </div>
      <div style="font-size:11px;color:#52525B;padding:0 20px 20px;line-height:1.5">Стандарт підставляється у нові клітинки. Кожну можна змінити індивідуально.</div>
      <div class="sch-sh-btns">
        <button class="sch-sbt sch-sbt-sec" onclick="window.__sch.closeDefaultsSheet()">Скасувати</button>
        <button class="sch-sbt sch-sbt-cta" onclick="window.__sch.saveDefaults()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

function renderBarPicker() {
  const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const added = _extraBar.length
    ? _extraBar.map(e => `<div class="sch-bp-row">
        <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#fff">${esc(e.n)}</div></div>
        <div class="sch-bp-check on" style="cursor:pointer" onclick="window.__sch.removeBarFromSchedule('${e.id}')">✕</div>
      </div>`).join('')
    : `<div style="padding:14px 8px;color:#52525B;font-size:12px">Ще нікого не додано</div>`;
  return `
  <div class="sch-ov" id="sch-bar-ov" onclick="window.__sch.closeBarOv(event)">
    <div class="sch-sheet">
      <div class="sch-sh-handle"></div>
      <div class="sch-sh-title">Додати бармена у графік</div>
      <div class="sch-sh-sub">Введіть ім'я — без прив'язки до акаунта</div>
      <div style="display:flex;gap:8px;padding:8px 14px 12px">
        <input id="sch-bar-name" placeholder="Ім'я бармена" autocomplete="off"
          style="flex:1;background:#1F1F22;border:0.5px solid rgba(168,139,255,0.30);border-radius:10px;padding:0 12px;height:44px;font-size:15px;color:#fff;outline:none;font-family:inherit"
          onkeydown="if(event.key==='Enter')window.__sch.addBarByName()">
        <button onclick="window.__sch.addBarByName()"
          style="height:44px;padding:0 18px;border-radius:10px;background:#A88BFF;border:none;font-size:14px;font-weight:600;color:#000;cursor:pointer;font-family:inherit">Додати</button>
      </div>
      <div style="padding:0 14px 4px;font-size:10px;color:#52525B;text-transform:uppercase;letter-spacing:.06em">Додані в графік</div>
      <div style="padding:0 14px 10px">${added}</div>
    </div>
  </div>`;
}

// Drag-reorder рядків гріда (будь-яка роль, режим редагування)
function attachRowDrag(roleKey) {
  if (!canEdit() || _mode !== 'edit') return;
  const tbody = document.getElementById(`sch-tbody-${roleKey}`);
  if (!tbody) return;
  tbody.querySelectorAll('.sch-drag-h').forEach(h => {
    const start = (e) => {
      e.preventDefault(); e.stopPropagation();
      const row = h.closest('tr');
      if (!row) return;
      row.style.opacity = '0.55';
      const move = (ev) => {
        ev.preventDefault();
        const y = (ev.touches ? ev.touches[0] : ev).clientY;
        const others = [...tbody.querySelectorAll('tr')].filter(r => r !== row);
        for (const r of others) {
          const b = r.getBoundingClientRect();
          if (y >= b.top && y <= b.bottom) {
            tbody.insertBefore(row, y < b.top + b.height / 2 ? r : r.nextSibling);
            break;
          }
        }
      };
      const end = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end);
        row.style.opacity = '';
        const ids = [...tbody.querySelectorAll('tr')].map(r => r.dataset.pid).filter(Boolean);
        persistRosterOrder(roleKey, ids);
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false }); document.addEventListener('touchend', end);
    };
    h.addEventListener('mousedown', start);
    h.addEventListener('touchstart', start, { passive: false });
  });
}

async function persistRosterOrder(roleKey, ids) {
  _rosterOrders[roleKey] = ids;
  const r = _rosters[roleKey];
  if (r) {
    const pos = new Map(ids.map((id, i) => [id, i]));
    const pairs = r.people.map((p, i) => ({ p, g: r.grid[i], k: pos.has(p.id) ? pos.get(p.id) : 1e9 + i }));
    pairs.sort((a, b) => a.k - b.k);
    r.people = pairs.map(x => x.p);
    r.grid   = pairs.map(x => x.g);
  }
  re();
  try {
    const token = localStorage.getItem('barops_token');
    await fetch(`${API}/api/schedule/roster-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ venueId: _venueId, roleKey, ids }),
    });
  } catch {}
}

/* ════════════════════════════════════════
   RE-RENDER
════════════════════════════════════════ */
function re() {
  const v = document.getElementById('app-view');
  if (!v) return;
  if (_view === 'hub')          v.innerHTML = renderHub();
  else if (_view === 'role')    {
    const sx = document.getElementById('sch-grid-scroll')?.scrollLeft || 0;
    v.innerHTML = renderRoleView(_role);
    attachRowDrag(_role);
    if (sx) {
      const el = document.getElementById('sch-grid-scroll');
      if (el) { el.scrollLeft = sx; requestAnimationFrame(() => { el.scrollLeft = sx; }); }
    }
  }
  else if (_view === 'booking') v.innerHTML = renderBooking();
}

/* ════════════════════════════════════════
   EXPORTS
════════════════════════════════════════ */
export async function render() {
  _view       = 'hub';
  _role       = 'cooks';
  _mode       = canEdit() ? (localStorage.getItem('barops_sch_mode') || 'view') : 'view';
  _selDays    = new Set();
  _cellSheet  = null;
  _weekOffset = 0;
  _bookOffset = 0;
  await reloadData();
  return renderHub();
}

export function init() {
  window.__sch = {
    goHub()     { _view = 'hub';     re(); },
    goRole(key) { _role = key; _view = 'role'; re(); },
    async goBooking() { _view = 'booking'; _bookOffset = 0; _selDays = new Set(); re(); await loadMyDayoff(); re(); },
    prevMonth() { _bookOffset--; re(); },
    nextMonth() { _bookOffset++; re(); },

    async prevWeek() { _weekOffset--; await reloadData(); re(); },
    async nextWeek() { _weekOffset++; await reloadData(); re(); },

    setMode(m) {
      if (m === 'edit' && !canEdit()) return;
      _mode = m;
      localStorage.setItem('barops_sch_mode', m);
      re();
    },

    async publishSchedule() {
      if (!canEdit()) return;
      const weekDates = getWeekDates(_weekOffset);
      const weekStart = ymd(weekDates[0].date);
      const shifts = [];
      for (const [roleKey, r] of Object.entries(_rosters)) {
        const stns = _stations[roleKey] || [];
        r.people.forEach((p, pi) => {
          (r.grid[pi] || []).forEach((cell, di) => {
            if (cell && cell.s) {   // лише реальні зміни (не вихідні)
              const stn = stns.find(x => x.id === cell.station);
              shifts.push({
                userId: p.id, userName: p.n, role: p.role,
                date: ymd(weekDates[di].date),
                start: cell.s, end: cell.e,
                station: cell.station || null,
                stationName: stn ? stn.label : '',
              });
            }
          });
        });
      }
      const token = localStorage.getItem('barops_token');
      const btn   = document.querySelector('.sch-bar .sch-cta');
      if (btn) { btn.disabled = true; btn.textContent = 'Публікація…'; }
      try {
        const res  = await fetch(`${API}/api/schedule/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ venueId: state.venueId || localStorage.getItem('barops_venueId') || '', weekStart, shifts }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Помилка');
        if (btn) btn.textContent = 'Опубліковано ✓';
      } catch (e) {
        console.error('[schedule] publish:', e);
        if (btn) { btn.disabled = false; btn.textContent = 'Опублікувати графік'; }
      }
    },

    // ── Cell sheet ──────────────────────────
    openCellSheet(roleKey, pi, di) {
      const cell = _rosters[roleKey].grid[+pi][+di];
      _cellSheet = { roleKey, pi: +pi, di: +di, station: cell?.station || null };
      _cellMode  = cell ? 'shift' : 'shift';
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-cell-ov')?.remove();
      wrap.insertAdjacentHTML('beforeend', renderCellSheet());
    },
    closeCellOv(e) { if (e?.target?.id === 'sch-cell-ov') this.closeCellSheet(); },
    closeCellSheet() { _cellSheet = null; document.getElementById('sch-cell-ov')?.remove(); },

    // ── Додати бармена у графік (з мережі) ──
    openBarPicker() {
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-bar-ov')?.remove();
      wrap.insertAdjacentHTML('beforeend', renderBarPicker());
      setTimeout(() => document.getElementById('sch-bar-name')?.focus(), 60);
    },
    closeBarOv(e) { if (e?.target?.id === 'sch-bar-ov') document.getElementById('sch-bar-ov')?.remove(); },
    async addBarByName() {
      const inp  = document.getElementById('sch-bar-name');
      const name = (inp?.value || '').trim();
      if (!name) { inp?.focus(); return; }
      document.getElementById('sch-bar-ov')?.remove();   // закрити вікно одразу після додавання
      try {
        const token = localStorage.getItem('barops_token');
        await fetch(`${API}/api/schedule/bartender-roster`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body:    JSON.stringify({ venueId: _venueId, name }),
        });
      } catch {}
      await loadRosters();
      re();
    },
    async removeBarFromSchedule(id) {
      try {
        const token = localStorage.getItem('barops_token');
        await fetch(`${API}/api/schedule/bartender-roster/${id}`, {
          method:  'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch {}
      await loadRosters();
      re();
      const wrap = document.querySelector('.sch-wrap');
      if (wrap) wrap.insertAdjacentHTML('beforeend', renderBarPicker());
    },

    toggleCellMode() {
      _cellMode = _cellMode === 'shift' ? 'off' : 'shift';
      const isShift  = _cellMode === 'shift';
      const timeRow  = document.getElementById('sch-time-row');
      const timeLbl  = document.getElementById('sch-time-label');
      if (timeRow) timeRow.style.display = isShift ? 'flex' : 'none';
      if (timeLbl) timeLbl.style.display = isShift ? 'block' : 'none';
      // Re-render just the off-row button (simpler: full overlay re-render)
      if (_cellSheet) {
        document.getElementById('sch-cell-ov')?.remove();
        const wrap = document.querySelector('.sch-wrap');
        if (wrap) wrap.insertAdjacentHTML('beforeend', renderCellSheet());
      }
    },

    selectStation(stationId) {
      if (!_cellSheet) return;
      _cellSheet.station = stationId;
      // Update chips visually
      const stns = _stations[_cellSheet.roleKey] || [];
      stns.forEach(s => {
        const el = document.getElementById(`sch-stn-${s.id}`);
        if (el) {
          el.className = 'sch-stn-chip' + (s.id === stationId ? ' sel' : '');
        }
      });
      const nullEl = document.getElementById('sch-stn-null');
      if (nullEl) nullEl.className = 'sch-stn-chip' + (!stationId ? ' sel' : '');
    },

    updateTimePreview() { /* live preview if needed */ },

    resetToDefault() {
      if (!_cellSheet) return;
      const def = DEFAULTS[_cellSheet.roleKey];
      const s = document.getElementById('sch-t-start');
      const e = document.getElementById('sch-t-end');
      if (s) s.value = def.s;
      if (e) e.value = def.e;
    },

    saveCell() {
      if (!_cellSheet) return;
      const { roleKey, pi, di, station } = _cellSheet;
      const isOff = _cellMode === 'off';
      const value = isOff
        ? { dayOff: true }
        : { s: document.getElementById('sch-t-start')?.value || DEFAULTS[roleKey].s,
            e: document.getElementById('sch-t-end')?.value   || DEFAULTS[roleKey].e,
            station: station || null };
      _rosters[roleKey].grid[pi][di] = value;
      saveShiftToStorage(roleKey, pi, di, isOff ? null : value);   // зняти зміну, якщо вихідний
      saveDayOffToStorage(roleKey, pi, di, isOff);                  // поставити/зняти вихідний
      _cellSheet = null;
      document.getElementById('sch-cell-ov')?.remove();
      re();
    },

    showCellInfo(name, start, end, stationId) {
      const r    = _rosters[_role];
      const stns = _stations[_role] || [];
      const stn  = stns.find(s => s.id === stationId);
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-cell-ov')?.remove();
      wrap.insertAdjacentHTML('beforeend', `
        <div class="sch-ov" id="sch-cell-ov" onclick="document.getElementById('sch-cell-ov').remove()">
          <div style="background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 24px;margin:auto 20px 40%">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="width:36px;height:36px;border-radius:10px;background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color};display:flex;align-items:center;justify-content:center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div>
                <div style="font-size:14px;font-weight:600;color:#fff">${stn ? stn.label : 'Зміна'}</div>
                <div style="font-size:13px;color:#A88BFF;font-variant-numeric:tabular-nums">${start} – ${end}</div>
              </div>
            </div>
            <div style="font-size:12px;color:#71717A">${name}</div>
          </div>
        </div>`);
    },

    // ── Inline station add (з cell sheet) ───
    showInlineAddStation(roleKey) {
      const div = document.getElementById('sch-inline-add');
      if (div) { div.style.display = 'block'; document.getElementById('sch-inline-stn')?.focus(); }
    },
    addInlineStation(roleKey) {
      const inp   = document.getElementById('sch-inline-stn');
      const label = (inp?.value || '').trim();
      if (!label) return;
      if (!_stations[roleKey]) _stations[roleKey] = [];
      const newStn = { id: Date.now().toString(36), label };
      _stations[roleKey].push(newStn);
      saveStations(roleKey);
      if (_cellSheet) _cellSheet.station = newStn.id;
      document.getElementById('sch-cell-ov')?.remove();
      const wrap = document.querySelector('.sch-wrap');
      if (wrap) wrap.insertAdjacentHTML('beforeend', renderCellSheet());
    },

    // ── Stations (role view) ─────────────────────────────
    showAddStationInput(roleKey) {
      const container = document.getElementById('sch-stn-list');
      if (!container) return;
      if (document.getElementById('sch-new-stn-inp')) {
        document.getElementById('sch-new-stn-inp').focus();
        return;
      }
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:6px;margin-top:8px';
      div.innerHTML = `
        <input id="sch-new-stn-inp" placeholder="Тераса, Хочу 2.0, …"
          style="flex:1;background:#1F1F22;border:0.5px solid rgba(168,139,255,0.40);border-radius:8px;padding:7px 10px;font-size:12px;color:#fff;outline:none;font-family:inherit"
          onkeydown="if(event.key==='Enter')window.__sch.confirmAddStation('${roleKey}')">
        <button onclick="window.__sch.confirmAddStation('${roleKey}')"
          style="width:30px;height:30px;border-radius:8px;background:rgba(168,139,255,.15);border:0.5px solid rgba(168,139,255,.30);color:#A88BFF;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit">✓</button>`;
      container.appendChild(div);
      document.getElementById('sch-new-stn-inp')?.focus();
    },
    confirmAddStation(roleKey) {
      const inp   = document.getElementById('sch-new-stn-inp');
      const label = (inp?.value || '').trim();
      if (!label) return;
      if (!_stations[roleKey]) _stations[roleKey] = [];
      _stations[roleKey].push({ id: Date.now().toString(36), label });
      saveStations(roleKey);
      re();
    },
    removeStation(roleKey, stationId) {
      if (!_stations[roleKey]) return;
      _stations[roleKey] = _stations[roleKey].filter(s => s.id !== stationId);
      saveStations(roleKey);
      re();
    },

    // ── Defaults sheet ───────────────────────
    openDefaultsSheet(roleKey) {
      _defaultsSheet = roleKey;
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-def-ov')?.remove();
      wrap.insertAdjacentHTML('beforeend', renderDefaultsSheet(roleKey));
    },
    closeDefaultsOv(e) { if (e?.target?.id === 'sch-def-ov') this.closeDefaultsSheet(); },
    closeDefaultsSheet() { _defaultsSheet = null; document.getElementById('sch-def-ov')?.remove(); },
    saveDefaults() {
      if (!_defaultsSheet) return;
      const s = document.getElementById('sch-def-start')?.value;
      const e = document.getElementById('sch-def-end')?.value;
      if (s && e) { DEFAULTS[_defaultsSheet].s = s; DEFAULTS[_defaultsSheet].e = e; }
      _defaultsSheet = null;
      document.getElementById('sch-def-ov')?.remove();
      re();
    },

    // ── Requests ────────────────────────────
    async approveReq(roleKey, ri) {
      const req = _rosters[roleKey]?.requests[ri];
      if (!req) return;
      markApprovedOff(req);
      await patchDayOff(req.id, 'approved');
      await reloadData(); re();
    },
    async rejectReq(roleKey, ri) {
      const req = _rosters[roleKey]?.requests[ri];
      if (!req) return;
      await patchDayOff(req.id, 'rejected');
      _rosters[roleKey].requests.splice(+ri, 1);
      re();
    },
    async hubApproveReq(id) {
      const req = findReqById(id);
      if (req) markApprovedOff(req);
      await patchDayOff(id, 'approved');
      await reloadData(); re();
    },
    async hubRejectReq(id)  { await patchDayOff(id, 'rejected'); await reloadData(); re(); },

    toggleDay(d) {
      if (_selDays.has(d)) _selDays.delete(d); else _selDays.add(d);
      re();
    },

    async submitBooking() {
      const dates = [..._selDays].sort();
      if (!dates.length) return;
      const note  = document.querySelector('.sch-cmnt-inp')?.value.trim() || '';
      const token = localStorage.getItem('barops_token');
      const btn   = document.querySelector('.sch-bar .sch-cta');
      if (btn) { btn.disabled = true; btn.textContent = 'Надсилання…'; }
      try {
        const res  = await fetch(`${API}/api/dayoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ dates, note }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Помилка');
        _selDays = new Set();
        await loadMyDayoff();   // лишаємось на екрані — показуємо оновлену історію
        re();
      } catch (e) {
        console.error('[dayoff] submit:', e);
        if (btn) { btn.disabled = false; btn.textContent = 'Спробувати ще раз'; }
      }
    },
  };
}

export default { render, init };
