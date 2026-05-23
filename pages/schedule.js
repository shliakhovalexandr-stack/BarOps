/* ============================================================
   BarOps — pages/schedule.js
   Графіки: Hub → Weekly view → Booking
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════════════════════
   ROLE CONFIG (статичний)
════════════════════════════════════════ */
const ROLE_CONFIG = {
  cooks:      { label: 'Кухарі',    icon: 'fork',  color: '#FBBF24', bgIcon: 'rgba(251,191,36,0.10)',   bdIcon: 'rgba(251,191,36,0.28)',   apiRoles: ['cook','chef']                    },
  bartenders: { label: 'Бармени',   icon: 'glass', color: '#A88BFF', bgIcon: 'rgba(168,139,255,0.10)',  bdIcon: 'rgba(168,139,255,0.28)',  apiRoles: ['bartender','barman']             },
  waiters:    { label: 'Офіціанти', icon: 'tray',  color: '#86EFAC', bgIcon: 'rgba(134,239,172,0.10)',  bdIcon: 'rgba(134,239,172,0.28)',  apiRoles: ['waiter']                         },
  managers:   { label: 'Менеджери', icon: 'star',  color: '#A88BFF', bgIcon: 'rgba(168,139,255,0.10)',  bdIcon: 'rgba(168,139,255,0.28)',  apiRoles: ['manager','admin']                },
  cleaners:   { label: 'Хозяюшки', icon: 'broom', color: '#86EFAC', bgIcon: 'rgba(134,239,172,0.10)',  bdIcon: 'rgba(134,239,172,0.28)',  apiRoles: ['hostess','cleaner','housekeeper'] },
};

/* ════════════════════════════════════════
   DEFAULTS — стандартні години зміни по підрозділу
════════════════════════════════════════ */
const DEFAULTS = {
  cooks:      { s: '08:00', e: '18:00' },
  bartenders: { s: '17:00', e: '02:00' },
  waiters:    { s: '11:00', e: '23:00' },
  managers:   { s: '10:00', e: '20:00' },
  cleaners:   { s: '06:00', e: '14:00' },
};

/* ════════════════════════════════════════
   WEEK HELPERS
════════════════════════════════════════ */
const DOW_SHORT    = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД'];
const MONTHS_GEN   = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];

function getWeekDates(offset = 0) {
  const today = new Date();
  const dow   = today.getDay();
  const diff  = dow === 0 ? -6 : 1 - dow;
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

function weekLabel(wd) {
  const f = wd[0], l = wd[6];
  if (f.m === l.m) return `${MONTHS_GEN[f.m]}  ${f.n}–${l.n}`;
  return `${f.n} ${MONTHS_GEN[f.m]} – ${l.n} ${MONTHS_GEN[l.m]}`;
}

function isToday(d) {
  const t = new Date();
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let _view          = 'hub';
let _role          = 'cooks';
let _mode          = 'view';
let _selDays       = new Set();
let _editSheet     = null;
let _sheetMode     = 'shift';
let _defaultsSheet = null;
let _weekOffset    = 0;
let _rosters       = {};
let _venueId       = '';

/* ════════════════════════════════════════
   LOAD ROSTERS (API + localStorage)
════════════════════════════════════════ */
async function loadRosters() {
  _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
  const token = localStorage.getItem('barops_token');
  const weekDates = getWeekDates(_weekOffset);

  let teamMembers = [];
  try {
    const url = _venueId
      ? `${API}/api/auth/team?venueId=${_venueId}`
      : `${API}/api/auth/team`;
    const res  = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await res.json();
    if (Array.isArray(data.team)) teamMembers = data.team;
    console.log('[Schedule] team loaded:', teamMembers.length, 'venueId:', _venueId,
      teamMembers.map(m => `${m.name}(${m.role})`).join(', '));
  } catch (err) {
    console.warn('[Schedule] team load error:', err);
  }

  const stored   = JSON.parse(localStorage.getItem('barops_schedule_v1') || '{}');
  const vData    = stored[_venueId] || {};

  _rosters = {};
  for (const [key, cfg] of Object.entries(ROLE_CONFIG)) {
    const people = teamMembers
      .filter(m => cfg.apiRoles.includes((m.role || '').toLowerCase()))
      .map(m => ({ id: m.id, i: ini(m.name || '?'), n: m.name || 'Невідомо', role: (m.role || '').toLowerCase() }));

    const grid = people.map(p => {
      const emp = vData[p.id] || {};
      return weekDates.map(w => {
        const slot = emp[dateKey(w.date)];
        return slot ? { s: slot.start, e: slot.end } : null;
      });
    });

    _rosters[key] = { ...cfg, sub: `${cfg.label} · ${people.length} люд`, people, grid, requests: [] };
  }
}

function saveShiftToStorage(roleKey, pi, di, value) {
  const weekDates = getWeekDates(_weekOffset);
  const dk   = dateKey(weekDates[di].date);
  const empId = _rosters[roleKey]?.people[pi]?.id;
  if (!empId || !_venueId) return;

  const raw = JSON.parse(localStorage.getItem('barops_schedule_v1') || '{}');
  if (!raw[_venueId]) raw[_venueId] = {};
  if (!raw[_venueId][empId]) raw[_venueId][empId] = {};

  if (value === null) {
    delete raw[_venueId][empId][dk];
  } else {
    raw[_venueId][empId][dk] = { start: value.s, end: value.e };
  }
  localStorage.setItem('barops_schedule_v1', JSON.stringify(raw));
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
.sch-sum-meta{margin-top:10px;font-size:11px;color:#52525B;display:flex;align-items:center;gap:5px}
.sch-seg{display:flex;margin:0 18px 14px;background:#141416;border-radius:10px;border:0.5px solid rgba(255,255,255,0.08);padding:3px;gap:3px}
.sch-seg-btn{flex:1;height:30px;border-radius:7px;border:none;font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:#71717A;transition:all .15s}
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
.sch-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px}
.sch-qcard{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;cursor:pointer;display:flex;align-items:center;gap:10px}
.sch-qcard:active{background:#141416}
.sch-qicon{width:36px;height:36px;border-radius:10px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-qlbl{font-size:12px;font-weight:500;color:#A1A1AA;line-height:1.4}
.sch-kpi{display:flex;margin:0 18px 16px;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:14px}
.sch-kpi-cell{flex:1;padding:14px 0;text-align:center;position:relative}
.sch-kpi-cell+.sch-kpi-cell::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:0.5px;background:rgba(255,255,255,0.08)}
.sch-kpi-val{font-size:20px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;line-height:1}
.sch-kpi-lbl{font-size:9px;font-weight:500;color:#52525B;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}
.sch-grid-wrap{margin:0 18px 16px;overflow-x:auto}.sch-grid-wrap::-webkit-scrollbar{height:0}
.sch-table{border-collapse:collapse;width:100%;min-width:300px}
.sch-table th{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.04em;text-align:center;padding:0 2px 8px;vertical-align:bottom}
.sch-table th.wk{color:#A88BFF}
.sch-table th.td{color:#A88BFF}
.sch-table td{padding:3px 2px;vertical-align:middle}
.sch-gname{font-size:11px;font-weight:500;color:#A1A1AA;white-space:nowrap;padding-right:6px;display:flex;align-items:center;gap:5px}
.sch-gini{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#000;flex-shrink:0}
.sch-tag{display:flex;align-items:center;justify-content:center;width:30px;height:28px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;transition:transform .1s;user-select:none}
.sch-tag:active{transform:scale(.9)}
.sch-off{width:30px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.3}
.sch-off:hover{opacity:.6;background:#141416}
.sch-empty-state{text-align:center;padding:40px 20px;color:#52525B;font-size:13px;line-height:1.6}
.sch-cov{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:0 18px 16px}
.sch-cov-cell{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 4px;text-align:center}
.sch-cov-cell.lo{border-color:rgba(251,113,133,0.28)}
.sch-cov-cell.td{border-color:rgba(168,139,255,0.30)}
.sch-cov-d{font-size:9px;color:#52525B;letter-spacing:.04em;margin-bottom:4px;text-transform:uppercase}
.sch-cov-n{font-size:15px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
.sch-cov-n.lo{color:#FB7185}
.sch-req-list{display:flex;flex-direction:column;gap:6px;padding:0 18px 16px}
.sch-req{border-radius:12px;padding:12px 14px;border:0.5px solid transparent;display:flex;align-items:center;gap:10px}
.sch-req.pending{background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.22)}
.sch-req.approved{background:rgba(134,239,172,0.06);border-color:rgba(134,239,172,0.18)}
.sch-req-who{font-size:13px;font-weight:600;color:#fff}
.sch-req-day{font-size:11px;color:#71717A;margin-top:2px}
.sch-rbtn{width:30px;height:30px;border-radius:9px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-rbtn.ap{background:#A88BFF}.sch-rbtn.rj{background:#1F1F22;border:0.5px solid rgba(255,255,255,0.08)}
.sch-bar{position:sticky;bottom:0;background:#000;border-top:0.5px solid rgba(255,255,255,0.08);padding:12px 18px 28px;display:flex;gap:10px;flex-shrink:0}
.sch-bar-icon{width:52px;height:52px;border-radius:13px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sch-bar-icon:active{background:#1F1F22}
.sch-cta{flex:1;height:52px;border-radius:14px;background:#A88BFF;border:none;font-size:15px;font-weight:600;color:#000;cursor:pointer;letter-spacing:-.01em}
.sch-cta:active{opacity:.85}.sch-cta:disabled{opacity:.35;cursor:not-allowed}
.sch-cta-sec{flex:1;height:52px;border-radius:14px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);font-size:14px;font-weight:500;color:#A1A1AA;cursor:pointer}
.sch-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.76);display:flex;flex-direction:column;justify-content:flex-end;animation:schOvIn .18s ease}
@keyframes schOvIn{from{opacity:0}to{opacity:1}}
.sch-sheet{background:#0A0A0A;border-radius:22px 22px 0 0;border-top:0.5px solid rgba(255,255,255,0.08);padding:0 0 40px;animation:schSl .26s cubic-bezier(.22,1,.36,1);max-height:80vh;overflow-y:auto}
@keyframes schSl{from{transform:translateY(100%)}to{transform:none}}
.sch-sh-handle{width:36px;height:3px;background:rgba(255,255,255,0.12);border-radius:2px;margin:14px auto 18px}
.sch-sh-title{font-size:17px;font-weight:700;color:#fff;padding:0 20px 4px}
.sch-sh-sub{font-size:12px;color:#71717A;padding:0 20px 16px}
.sch-sh-opts{display:flex;flex-direction:column;gap:5px;padding:0 20px 18px}
.sch-sh-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:#141416;border:0.5px solid rgba(255,255,255,0.08);cursor:pointer}
.sch-sh-opt:active{background:#1F1F22}
.sch-sh-opt.sel{border-color:rgba(168,139,255,0.40);background:rgba(168,139,255,0.08)}
.sch-sh-tag{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.sch-sh-name{font-size:13px;font-weight:600;color:#fff}
.sch-sh-time{font-size:11px;color:#71717A;margin-top:2px}
.sch-sh-btns{display:flex;gap:8px;padding:0 20px}
.sch-sbt{flex:1;height:48px;border-radius:13px;border:none;font-size:14px;font-weight:600;cursor:pointer}
.sch-sbt-cta{background:#A88BFF;color:#000}.sch-sbt-sec{background:#141416;color:#A1A1AA;border:0.5px solid rgba(255,255,255,0.08)}
.sch-popup{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;animation:schOvIn .15s ease}
.sch-popup-box{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 24px;min-width:240px}
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
.sch-cell.preq{background:rgba(168,139,255,0.10);color:#A88BFF;border-color:rgba(168,139,255,0.30);pointer-events:none}
.sch-cell.wknd:not(.sel):not(.past){color:#A88BFF}
.sch-bsum{margin:0 18px 16px;background:rgba(168,139,255,0.07);border:0.5px solid rgba(168,139,255,0.22);border-radius:14px;padding:14px}
.sch-bsum-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.sch-bsum-title{font-size:10px;font-weight:500;color:#A88BFF;letter-spacing:.07em;text-transform:uppercase}
.sch-bsum-count{font-size:20px;font-weight:700;color:#A88BFF;font-variant-numeric:tabular-nums}
.sch-bchips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.sch-bchip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:6px;background:rgba(168,139,255,0.12);border:0.5px solid rgba(168,139,255,0.28);font-size:11px;font-weight:500;color:#A88BFF;cursor:pointer}
.sch-bquota{font-size:11px;color:#71717A;line-height:1.5}
.sch-plist{display:flex;flex-direction:column;gap:6px;padding:0 18px 16px}
.sch-pcard{background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px}
.sch-picon{width:28px;height:28px;border-radius:8px;background:rgba(251,191,36,0.10);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sch-pday{font-size:13px;font-weight:600;color:#fff}
.sch-plbl{font-size:11px;color:#71717A;margin-top:2px}
.sch-pcancel{height:28px;padding:0 10px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.10);background:transparent;font-size:11px;color:#71717A;cursor:pointer;flex-shrink:0}
.sch-cmnt{padding:0 18px 16px}
.sch-cmnt-lbl{font-size:10px;font-weight:500;color:#52525B;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px}
.sch-cmnt-inp{width:100%;background:#0A0A0A;border:0.5px solid rgba(255,255,255,0.10);border-radius:12px;padding:12px 14px;font-size:13px;color:#fff;resize:none;outline:none;font-family:inherit}
.sch-cmnt-inp:focus{border-color:rgba(168,139,255,0.40)}.sch-cmnt-inp::placeholder{color:#52525B}
</style>`;

/* ════════════════════════════════════════
   SCREEN 1 — HUB
════════════════════════════════════════ */
function renderHub() {
  const stats     = summaryStats();
  const venueName = state.venue || localStorage.getItem('barops_venue') || 'Bar Noir';
  const weekDates = getWeekDates(_weekOffset);
  const wLabel    = weekLabel(weekDates);

  const cards = Object.entries(_rosters).map(([key, r]) => {
    const onShift = r.grid.filter(row => row.some(c => c !== null)).length;
    return `
    <div class="sch-dc" onclick="window.__sch.goRole('${key}')">
      <div class="sch-dc-icon" style="background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color}">
        ${roleIcon(r.icon)}
      </div>
      <div class="sch-dc-body">
        <div class="sch-dc-name">${r.label}</div>
        <div class="sch-dc-sub">
          ${r.people.length > 0 ? `<span class="sch-live"></span>` : ''}
          ${r.people.length} люд · ${onShift} на зміні
        </div>
        <div class="sch-dc-chips">${statusChips(r)}</div>
      </div>
      <div class="sch-dc-right">
        ${avatarStack(r.people)}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>`;
  }).join('');

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
      <div class="sch-sum">
        <div class="sch-sum-row">
          <div class="sch-sum-cell"><div class="sch-sum-val">${stats.total}</div><div class="sch-sum-lbl">Людей</div></div>
          <div class="sch-sum-div"></div>
          <div class="sch-sum-cell"><div class="sch-sum-val" style="color:#86EFAC">${stats.onShift}</div><div class="sch-sum-lbl">На зміні</div></div>
          <div class="sch-sum-div"></div>
          <div class="sch-sum-cell"><div class="sch-sum-val"${stats.gaps?` style="color:#FB7185"`:''}>${stats.gaps}</div><div class="sch-sum-lbl">Дірок</div></div>
          <div class="sch-sum-div"></div>
          <div class="sch-sum-cell"><div class="sch-sum-val"${stats.pending?` style="color:#FBBF24"`:''}>${stats.pending}</div><div class="sch-sum-lbl">Запитів</div></div>
        </div>
      </div>
      <div class="sch-seg">
        <button class="sch-seg-btn${_mode==='view'?' on':''}" onclick="window.__sch.setMode('view')">Переглянути</button>
        <button class="sch-seg-btn${_mode==='edit'?' on':''}" onclick="window.__sch.setMode('edit')">Редагувати</button>
      </div>
      <div class="sch-sec"><div class="sch-sec-lbl">Підрозділи</div><div class="sch-sec-val">${Object.keys(_rosters).length}</div></div>
      <div class="sch-dept-list">${cards}</div>
      <div class="sch-sec" style="margin-top:20px"><div class="sch-sec-lbl">Швидкі дії</div></div>
      <div class="sch-quick">
        <div class="sch-qcard" onclick="window.__sch.goRole('bartenders')">
          <div class="sch-qicon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></div>
          <div class="sch-qlbl">Усі<br>зведений</div>
        </div>
        <div class="sch-qcard">
          <div class="sch-qicon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>
          <div class="sch-qlbl">Шаблон<br>застосувати</div>
        </div>
      </div>
    </div>
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
  const totalShifts = r.grid.reduce((a, row) => a + row.filter(c => c !== null).length, 0);
  const totalOff    = r.grid.reduce((a, row) => a + row.filter(c => c === null).length, 0);
  const pendCnt     = r.requests.filter(x => x.status === 'pending').length;

  const thCells = weekDates.map(w => {
    const cls = [w.weekend ? 'wk' : '', isToday(w.date) ? 'td' : ''].filter(Boolean).join(' ');
    return `<th class="${cls}">${w.d}<br><span style="font-size:11px;font-weight:400">${w.n}</span></th>`;
  }).join('');

  const bodyRows = r.people.length === 0
    ? `<tr><td colspan="8"><div class="sch-empty-state">Немає співробітників.<br>Додайте у розділі «Команда».</div></td></tr>`
    : r.people.map((p, pi) => {
        const cells = r.grid[pi].map((cell, di) => {
          if (!cell) {
            const onclick = _mode === 'edit'
              ? `onclick="window.__sch.openEditSheet('${roleKey}',${pi},${di})"`
              : '';
            return `<td><div class="sch-off" ${onclick}><svg width="10" height="10" viewBox="0 0 16 2" fill="none"><path d="M0 1h16" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/></svg></div></td>`;
          }
          const compact = cell.s.slice(0,2) + '–' + cell.e.slice(0,2);
          const onclick = _mode === 'edit'
            ? `onclick="window.__sch.openEditSheet('${roleKey}',${pi},${di})"`
            : `onclick="window.__sch.showShiftInfo('${p.n.split(' ')[0]}','${cell.s}','${cell.e}')"`;
          return `<td><div class="sch-tag" style="background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color};font-size:9px;letter-spacing:-.02em" ${onclick}>${compact}</div></td>`;
        }).join('');
        return `<tr>
          <td><div class="sch-gname"><div class="sch-gini" style="background:${r.bgIcon};color:${r.color}">${p.i}</div>${p.n.split(' ')[0]}</div></td>
          ${cells}
        </tr>`;
      }).join('');

  const covCells = weekDates.map((w, di) => {
    const cnt   = r.grid.filter(row => row[di] !== null).length;
    const isLo  = r.people.length > 0 && cnt < 2;
    const isTd  = isToday(w.date);
    return `<div class="sch-cov-cell${isLo?' lo':''}${isTd?' td':''}">
      <div class="sch-cov-d">${w.d}</div>
      <div class="sch-cov-n${isLo?' lo':''}">${cnt}</div>
    </div>`;
  }).join('');

  const reqHtml = r.requests.map((req, ri) => `
    <div class="sch-req ${req.status}" id="sch-req-${roleKey}-${ri}">
      <div style="flex:1">
        <div class="sch-req-who">${req.who}</div>
        <div class="sch-req-day">${req.day}${req.note ? ` · ${req.note}` : ''}</div>
      </div>
      ${req.status === 'pending'
        ? `<button class="sch-rbtn ap" onclick="window.__sch.approveReq('${roleKey}',${ri})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
           <button class="sch-rbtn rj" onclick="window.__sch.rejectReq('${roleKey}',${ri})" style="margin-left:4px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
      }
    </div>`
  ).join('');

  const bar = _mode === 'edit'
    ? `<div class="sch-bar"><button class="sch-cta-sec" onclick="window.__sch.setMode('view')">Скасувати</button><button class="sch-cta" style="flex:2" onclick="window.__sch.setMode('view')">Зберегти зміни</button></div>`
    : `<div class="sch-bar"><div class="sch-bar-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div><button class="sch-cta">Опублікувати графік</button></div>`;

  return CSS + `
  <div class="sch-wrap">
    <div class="sch-hdr">
      <div class="sch-back" onclick="window.__sch.goHub()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sch-hdr-body">
        <div class="sch-hdr-venue">Графік</div>
        <div class="sch-hdr-title">${r.label}</div>
        <div class="sch-hdr-sub">${r.sub}</div>
      </div>
      <div class="sch-hdr-icon" style="background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color}">${roleIcon(r.icon)}</div>
    </div>
    <div class="sch-week">
      <div class="sch-week-lbl">${wLabel}</div>
      <div class="sch-week-nav">
        <div class="sch-wbtn" onclick="window.__sch.prevWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="sch-wbtn" onclick="window.__sch.nextWeek()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
    </div>
    <div class="sch-scroll">
      <div class="sch-kpi">
        <div class="sch-kpi-cell"><div class="sch-kpi-val">${totalShifts}</div><div class="sch-kpi-lbl">Змін</div></div>
        <div class="sch-kpi-cell"><div class="sch-kpi-val">${totalOff}</div><div class="sch-kpi-lbl">Вихід</div></div>
        <div class="sch-kpi-cell"><div class="sch-kpi-val"${pendCnt?` style="color:#FBBF24"`:''}>${pendCnt}</div><div class="sch-kpi-lbl">Запит</div></div>
      </div>
      ${_mode === 'edit' ? `
      <div style="margin:0 18px 12px;padding:12px 14px;background:#0A0A0A;border:0.5px solid rgba(168,139,255,0.22);border-radius:12px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;font-weight:500;color:#71717A;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Стандартна зміна</div>
          <div style="font-size:15px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums">${DEFAULTS[roleKey].s} – ${DEFAULTS[roleKey].e}</div>
        </div>
        <button onclick="window.__sch.openDefaultsSheet('${roleKey}')" style="height:30px;padding:0 12px;border-radius:8px;background:rgba(168,139,255,0.10);border:0.5px solid rgba(168,139,255,0.28);font-size:12px;color:#A88BFF;cursor:pointer;font-family:inherit">Змінити</button>
      </div>` : ''}
      <div class="sch-sec">
        <div class="sch-sec-lbl">Тиждень</div>
        <div class="sch-sec-val" style="color:${_mode==='edit'?'#A88BFF':'#71717A'};cursor:pointer" onclick="window.__sch.setMode('${_mode==='edit'?'view':'edit'}')">
          ${_mode === 'edit' ? '● Режим редагування' : 'Редагувати →'}
        </div>
      </div>
      <div class="sch-grid-wrap">
        <table class="sch-table">
          <thead><tr><th style="text-align:left;padding-right:6px;color:#52525B">Хто</th>${thCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      <div class="sch-sec"><div class="sch-sec-lbl">Покриття днів</div><div class="sch-sec-val">${r.people.length} людей</div></div>
      <div class="sch-cov">${covCells}</div>
      ${r.requests.length ? `
      <div class="sch-sec"><div class="sch-sec-lbl">Запити на вихідні</div><div class="sch-sec-val">${r.requests.length}</div></div>
      <div class="sch-req-list" id="sch-reqs">${reqHtml}</div>` : ''}
    </div>
    ${bar}
  </div>`;
}

/* ════════════════════════════════════════
   SCREEN 3 — BOOKING
════════════════════════════════════════ */
function renderBooking() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const MONTHS_NOM = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];

  const firstDow = new Date(year, month, 1).getDay();
  const offset   = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = today.getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(`<div class="sch-cell empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const dowIdx  = (offset + d - 1) % 7;
    const isWeekend = dowIdx >= 5;
    const isPast  = d < todayNum;
    const isTodayCell = d === todayNum;
    const isSel   = _selDays.has(d);
    let cls = 'sch-cell';
    if (isPast)    cls += ' past';
    else if (isSel) cls += ' sel';
    else if (isWeekend) cls += ' wknd';
    if (isTodayCell) cls += ' today';
    const onclick = !isPast ? `onclick="window.__sch.toggleDay(${d})"` : '';
    cells.push(`<div class="${cls}" ${onclick}>${d}</div>`);
  }

  const selArr = [..._selDays].sort((a, b) => a - b);
  const chips = selArr.map(d =>
    `<div class="sch-bchip" onclick="window.__sch.toggleDay(${d})">${d}&nbsp;${MONTHS_GEN[month]}&nbsp;<span style="opacity:.6">×</span></div>`
  ).join('');

  return CSS + `
  <div class="sch-wrap">
    <div class="sch-hdr">
      <div class="sch-back" onclick="window.__sch.goRole('${_role}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </div>
      <div class="sch-hdr-body">
        <div class="sch-hdr-venue">Графік</div>
        <div class="sch-hdr-title">Бронювання вихідних</div>
      </div>
    </div>
    <div class="sch-scroll">
      <div class="sch-cal-nav">
        <div class="sch-wbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div class="sch-cal-month">${MONTHS_NOM[month]} ${year}</div>
        <div class="sch-wbtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div class="sch-cal-wrap">
        <div class="sch-cal-dow">
          ${DOW_SHORT.map(d => `<div class="${d==='СБ'||d==='НД'?'vio':''}">${d}</div>`).join('')}
        </div>
        <div class="sch-cal-grid">${cells.join('')}</div>
      </div>
      <div class="sch-bsum">
        <div class="sch-bsum-head">
          <div class="sch-bsum-title">Обрано вихідних</div>
          <div class="sch-bsum-count">${selArr.length}</div>
        </div>
        ${selArr.length ? `<div class="sch-bchips">${chips}</div>` : ''}
        <div class="sch-bquota">Обрані дні будуть надіслані на підтвердження адміністратору.</div>
      </div>
      <div class="sch-cmnt">
        <div class="sch-cmnt-lbl">Коментар (опційно)</div>
        <textarea class="sch-cmnt-inp" placeholder="Причина запиту..." rows="3"></textarea>
      </div>
    </div>
    <div class="sch-bar">
      <button class="sch-cta" ${selArr.length===0?'disabled':''}>
        Надіслати запит · ${selArr.length} ${selArr.length===1?'день':selArr.length<5?'дні':'днів'}
      </button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   OVERLAY: edit sheet
════════════════════════════════════════ */
function renderEditSheet() {
  if (!_editSheet) return '';
  const { roleKey, pi, di } = _editSheet;
  const r    = _rosters[roleKey];
  const p    = r.people[pi];
  const cell = r.grid[pi][di];
  const w    = getWeekDates(_weekOffset)[di];

  const isShift  = _sheetMode === 'shift';
  const def      = DEFAULTS[roleKey];
  const startDef = cell ? cell.s : def.s;
  const endDef   = cell ? cell.e : def.e;

  return `
  <div class="sch-ov" id="sch-edit-ov" onclick="window.__sch.closeEditOv(event)">
    <div class="sch-sheet">
      <div class="sch-sh-handle"></div>
      <div class="sch-sh-title">Зміна — ${p.n.split(' ')[0]}</div>
      <div class="sch-sh-sub">${w.d} ${w.n} ${MONTHS_GEN[w.m]}</div>

      <div class="sch-sh-opts">

        <div class="sch-sh-opt${isShift?' sel':''}" onclick="window.__sch.selectSheetMode('shift')" id="sch-opt-shift">
          <div class="sch-sh-tag" style="background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style="flex:1">
            <div class="sch-sh-name">Зміна</div>
            <div class="sch-sh-time" id="sch-shift-preview">${isShift ? startDef + ' – ' + endDef : 'Вказати години'}</div>
          </div>
          ${isShift ? `<svg style="flex-shrink:0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A88BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>

        <div id="sch-time-block" style="display:${isShift?'flex':'none'};flex-direction:column;gap:8px;padding:4px 0 6px">
          <div style="display:flex;align-items:center;gap:10px;padding:0 2px">
            <div style="font-size:12px;color:#71717A;min-width:72px">Початок</div>
            <input id="sch-t-start" type="time" value="${startDef}"
              oninput="window.__sch.updatePreview()"
              style="flex:1;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;
                     padding:10px 12px;font-size:16px;color:#fff;outline:none;font-family:inherit;text-align:center;
                     -webkit-appearance:none;color-scheme:dark">
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:0 2px">
            <div style="font-size:12px;color:#71717A;min-width:72px">Кінець</div>
            <input id="sch-t-end" type="time" value="${endDef}"
              oninput="window.__sch.updatePreview()"
              style="flex:1;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;
                     padding:10px 12px;font-size:16px;color:#fff;outline:none;font-family:inherit;text-align:center;
                     -webkit-appearance:none;color-scheme:dark">
          </div>
          <div style="text-align:right;padding:0 2px">
            <button onclick="window.__sch.resetToDefault()" style="background:transparent;border:none;font-size:11px;color:#71717A;cursor:pointer;padding:4px 0;font-family:inherit">↺ Стандарт (${def.s}–${def.e})</button>
          </div>
        </div>

        <div class="sch-sh-opt${!isShift?' sel':''}" onclick="window.__sch.selectSheetMode('off')" id="sch-opt-off">
          <div class="sch-sh-tag" style="background:#1F1F22;border:0.5px solid rgba(255,255,255,0.08);color:#52525B">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <div style="flex:1">
            <div class="sch-sh-name">Вихідний</div>
            <div class="sch-sh-time">День відпочинку</div>
          </div>
          ${!isShift ? `<svg style="flex-shrink:0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A88BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>` : ''}
        </div>

      </div>

      <div class="sch-sh-btns">
        <button class="sch-sbt sch-sbt-sec" onclick="window.__sch.closeEditSheet()">Скасувати</button>
        <button class="sch-sbt sch-sbt-cta" onclick="window.__sch.saveShift()">Зберегти</button>
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
      <div style="display:flex;flex-direction:column;gap:8px;padding:0 20px 20px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:12px;color:#71717A;min-width:72px">Початок</div>
          <input id="sch-def-start" type="time" value="${def.s}"
            style="flex:1;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;
                   padding:10px 12px;font-size:16px;color:#fff;outline:none;font-family:inherit;text-align:center;
                   -webkit-appearance:none;color-scheme:dark">
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:12px;color:#71717A;min-width:72px">Кінець</div>
          <input id="sch-def-end" type="time" value="${def.e}"
            style="flex:1;background:#1F1F22;border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;
                   padding:10px 12px;font-size:16px;color:#fff;outline:none;font-family:inherit;text-align:center;
                   -webkit-appearance:none;color-scheme:dark">
        </div>
        <div style="font-size:11px;color:#52525B;margin-top:4px;line-height:1.5">Стандарт підставляється у нові клітинки. Кожну клітинку можна змінити індивідуально.</div>
      </div>
      <div class="sch-sh-btns">
        <button class="sch-sbt sch-sbt-sec" onclick="window.__sch.closeDefaultsSheet()">Скасувати</button>
        <button class="sch-sbt sch-sbt-cta" onclick="window.__sch.saveDefaults()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   OVERLAY: shift info popup (view mode)
════════════════════════════════════════ */
function renderShiftPopup(name, start, end) {
  const r = _rosters[_role];
  return `
  <div class="sch-popup" id="sch-popup" onclick="window.__sch.closePopup()">
    <div class="sch-popup-box">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;border-radius:10px;background:${r.bgIcon};border:0.5px solid ${r.bdIcon};color:${r.color};display:flex;align-items:center;justify-content:center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#fff">Зміна</div>
          <div style="font-size:13px;color:#A88BFF;font-variant-numeric:tabular-nums">${start} – ${end}</div>
        </div>
      </div>
      <div style="font-size:12px;color:#71717A">${name}</div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   RE-RENDER
════════════════════════════════════════ */
function re() {
  const v = document.getElementById('app-view');
  if (!v) return;
  if (_view === 'hub')          v.innerHTML = renderHub();
  else if (_view === 'role')    v.innerHTML = renderRoleView(_role);
  else if (_view === 'booking') v.innerHTML = renderBooking();
}

/* ════════════════════════════════════════
   EXPORTS
════════════════════════════════════════ */
export async function render() {
  _view      = 'hub';
  _role      = 'cooks';
  _mode      = localStorage.getItem('barops_sch_mode') || 'view';
  _selDays   = new Set();
  _editSheet = null;
  _weekOffset = 0;
  await loadRosters();
  return renderHub();
}

export function init() {
  window.__sch = {
    goHub()     { _view = 'hub';     re(); },
    goRole(key) { _role = key; _view = 'role'; re(); },
    goBooking() { _view = 'booking'; re(); },

    async prevWeek() { _weekOffset--; await loadRosters(); re(); },
    async nextWeek() { _weekOffset++; await loadRosters(); re(); },

    setMode(m) {
      _mode = m;
      localStorage.setItem('barops_sch_mode', m);
      re();
    },

    showShiftInfo(name, start, end) {
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-popup')?.remove();
      wrap.insertAdjacentHTML('beforeend', renderShiftPopup(name, start, end));
    },
    closePopup() { document.getElementById('sch-popup')?.remove(); },

    openEditSheet(roleKey, pi, di) {
      _editSheet = { roleKey, pi: +pi, di: +di };
      const cell = _rosters[roleKey].grid[+pi][+di];
      _sheetMode = cell ? 'shift' : 'shift'; // default to shift for new cells
      const wrap = document.querySelector('.sch-wrap');
      if (!wrap) return;
      document.getElementById('sch-edit-ov')?.remove();
      wrap.insertAdjacentHTML('beforeend', renderEditSheet());
    },
    closeEditOv(e) { if (e?.target?.id === 'sch-edit-ov') this.closeEditSheet(); },
    closeEditSheet() { _editSheet = null; document.getElementById('sch-edit-ov')?.remove(); },

    selectSheetMode(mode) {
      _sheetMode = mode;
      const optShift  = document.getElementById('sch-opt-shift');
      const optOff    = document.getElementById('sch-opt-off');
      const timeBlock = document.getElementById('sch-time-block');
      if (!optShift) return;
      const isShift = mode === 'shift';
      optShift.className  = 'sch-sh-opt' + (isShift ? ' sel' : '');
      optOff.className    = 'sch-sh-opt' + (!isShift ? ' sel' : '');
      timeBlock.style.display = isShift ? 'flex' : 'none';
      optShift.querySelector('svg:last-child')?.remove();
      optOff.querySelector('svg:last-child')?.remove();
      const check = `<svg style="flex-shrink:0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A88BFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      if (isShift) optShift.insertAdjacentHTML('beforeend', check);
      else optOff.insertAdjacentHTML('beforeend', check);
    },

    updatePreview() {
      const s    = document.getElementById('sch-t-start')?.value;
      const e    = document.getElementById('sch-t-end')?.value;
      const prev = document.getElementById('sch-shift-preview');
      if (prev && s && e) prev.textContent = s + ' – ' + e;
    },

    saveShift() {
      if (!_editSheet) return;
      const { roleKey, pi, di } = _editSheet;
      const value = _sheetMode === 'off' ? null : {
        s: document.getElementById('sch-t-start')?.value || DEFAULTS[roleKey].s,
        e: document.getElementById('sch-t-end')?.value   || DEFAULTS[roleKey].e,
      };
      _rosters[roleKey].grid[pi][di] = value;
      saveShiftToStorage(roleKey, pi, di, value);
      _editSheet = null;
      document.getElementById('sch-edit-ov')?.remove();
      re();
    },

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

    resetToDefault() {
      if (!_editSheet) return;
      const def = DEFAULTS[_editSheet.roleKey];
      const s   = document.getElementById('sch-t-start');
      const e   = document.getElementById('sch-t-end');
      if (s) s.value = def.s;
      if (e) e.value = def.e;
      window.__sch.updatePreview();
    },

    approveReq(roleKey, ri) {
      _rosters[roleKey].requests[ri].status = 'approved';
      const el  = document.getElementById(`sch-req-${roleKey}-${ri}`);
      const req = _rosters[roleKey].requests[ri];
      if (el) {
        el.className = 'sch-req approved';
        el.innerHTML = `<div style="flex:1"><div class="sch-req-who">${req.who}</div><div class="sch-req-day">${req.day}</div></div><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      }
    },
    rejectReq(roleKey, ri) {
      _rosters[roleKey].requests.splice(+ri, 1);
      re();
    },

    toggleDay(d) {
      if (_selDays.has(d)) _selDays.delete(d); else _selDays.add(d);
      re();
    },
  };
}

export default { render, init };
