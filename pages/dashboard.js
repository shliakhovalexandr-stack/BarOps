/* ============================================================
   BarOps — pages/dashboard.js
   Дашборд: реальні дані з /api/stats + switcher закладів
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   STATE
════════════════════════ */
let _activeVenueId   = '';   // id активного закладу
let _activeVenueName = '';   // назва активного закладу
let _venues          = [];   // список закладів з сервера
let _stats           = null; // дані з /api/stats
let _loading         = true;
let _venueSheetOpen  = false;
let _notifOpen       = false;
let _pendingOrders   = [];   // заявки на закупку (для адмін/менеджер)
let _pendingDayoff   = [];   // запити на вихідні (для адмін/менеджер)

const VENUE_COLORS = [
  'var(--green)', 'var(--amber)', 'var(--purple)',
  'var(--red)', '#4FA8E8', '#E24B4A',
];

/* ════════════════════════
   QUICK ACTIONS
════════════════════════ */
const QUICK_BARTENDER = [
  { route:'debts',     badge:null, label:'Борги',     hint:'Відкриті рахунки та борги',  color:'var(--amber-bg)',  iconColor:'var(--amber)',
    svg:`<path d="M3 13h12M3 9h12M8 5h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <circle cx="4" cy="5" r="1.5" fill="currentColor" opacity=".7"/>` },
  { route:'stop-list', badge:null, label:'Стоп-ліст', hint:'Товари яких немає в наявності', color:'var(--red-bg)',    iconColor:'var(--red)',
    svg:`<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 9h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` },
  { route:'inventory', badge:null, label:'Інвентар',  hint:'Перерахунок інвентарю',      color:'var(--purple-bg)', iconColor:'var(--purple)',
    svg:`<rect x="2" y="2" width="4" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
         <rect x="8" y="5" width="4" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
         <rect x="14" y="8" width="3" height="8"  rx="1.5" stroke="currentColor" stroke-width="1.3"/>` },
  { route:'excise',    badge:null, label:'Акцизні',   hint:'Акцизні накладні',           color:'var(--blue-bg)',   iconColor:'var(--blue)',
    svg:`<rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M4 8h8M4 11h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <circle cx="13" cy="11" r="1.5" fill="currentColor" opacity=".7"/>` },
  { route:'writeoff',  badge:null, label:'Списання',  hint:'Списати товари зі складу',   color:'var(--red-bg)',    iconColor:'var(--red)',
    svg:`<path d="M3 14l2-2 7-7 2 2-7 7-2 2H3v-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
         <path d="M10 5l2 2" stroke="currentColor" stroke-width="1.3"/>` },
  { route:'ordering',  badge:null, label:'Замовлення', hint:'Замовлення постачальникам',   color:'var(--green-bg)',  iconColor:'var(--green)',
    svg:`<rect x="3" y="2" width="11" height="13" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 6h5M6 9h5M6 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'schedule',  badge:null, label:'Графіки',    hint:'Розклад змін по підрозділах', color:'var(--teal-bg)',   iconColor:'var(--teal)',
    svg:`<rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M2 7h14" stroke="currentColor" stroke-width="1.3"/>
         <path d="M6 2v2M12 2v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M5 10h2M8 10h2M11 10h2M5 13h2M8 13h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>` },
];

const QUICK_MANAGER = [
  { route:'debts',    badge:null, label:'Борги',            hint:'Відкриті рахунки та борги',    color:'var(--amber-bg)',  iconColor:'var(--amber)',
    svg:`<path d="M3 13h12M3 9h12M8 5h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <circle cx="4" cy="5" r="1.5" fill="currentColor" opacity=".7"/>` },
  { route:'stock',    badge:null, label:'Залишки',          hint:'Поточні залишки бару',         color:'var(--teal-bg)',   iconColor:'var(--teal)',
    svg:`<path d="M2 14h4V7H2zM7 14h4V4H7zM13 14h4V9h-4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/>` },
  { route:'excise',   badge:null, label:'Акцизні',          hint:'Акцизні накладні',             color:'var(--blue-bg)',   iconColor:'var(--blue)',
    svg:`<rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M4 8h8M4 11h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <circle cx="13" cy="11" r="1.5" fill="currentColor" opacity=".7"/>` },
  { route:'stop-list', badge:null, label:'Стоп-ліст',        hint:'Активні зупинки в закладі',   color:'var(--red-bg)',    iconColor:'var(--red)',
    svg:`<circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 9h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` },
  { route:'ordering', badge:null, label:'Замовлення',       hint:'Замовлення постачальникам',    color:'var(--green-bg)',  iconColor:'var(--green)',
    svg:`<path d="M3 12h3v3H3zM7 8h3v7H7zM11 5h3v10h-3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/>` },
  { route:'inventory', badge:null, label:'Інвентаризація',  hint:'Перерахунок інвентарю',        color:'var(--purple-bg)', iconColor:'var(--purple)',
    svg:`<rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M5 6h6M5 9h6M5 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M13 10l2 2-1 1-2-2v-.5l1-1z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>` },
  { route:'writeoff',  badge:null, label:'Списання',        hint:'Списати товари зі складу',     color:'var(--red-bg)',    iconColor:'var(--red)',
    svg:`<path d="M3 14l2-2 7-7 2 2-7 7-2 2H3v-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
         <path d="M10 5l2 2" stroke="currentColor" stroke-width="1.3"/>` },
];

const QUICK_ADMIN = [
  { route:'journal',  badge:null, label:'Журнал',          hint:'Щоденний журнал бару',           color:'var(--teal-bg)',   iconColor:'var(--teal)',
    svg:`<rect x="3" y="2" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M6 6h7M6 9h7M6 12h5M6 15h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  ...QUICK_MANAGER,
  { route:'recipes',  badge:null, label:'Фудкост',         hint:'Розрахунок собівартості страв',  color:'var(--purple-bg)', iconColor:'var(--purple)',
    svg:`<path d="M5 2v5a3 3 0 006 0V2M5 9h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M8 12v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M5 16h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'ocr',      badge:null, label:'Накладна',        hint:'Сканування товарних накладних', color:'var(--green-bg)', iconColor:'var(--green)',
    svg:`<rect x="3" y="2" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M6 6h7M6 9h7M6 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'schedule', badge:null, label:'Графіки',         hint:'Розклад змін по підрозділах',  color:'var(--teal-bg)',   iconColor:'var(--teal)',
    svg:`<rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M2 7h14" stroke="currentColor" stroke-width="1.3"/>
         <path d="M6 2v2M12 2v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M5 10h2M8 10h2M11 10h2M5 13h2M8 13h2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>` },
];

/* ════════════════════════
   SCOPED CSS
════════════════════════ */
const CSS = `<style id="dash-css">
.d-scroll{overflow-y:auto;flex:1}.d-scroll::-webkit-scrollbar{width:0}
.d-header{padding:8px 20px 14px}
.d-venue-row{display:flex;justify-content:space-between;align-items:flex-start}
.d-venue-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.04em;margin-bottom:3px}
.d-venue-name{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.d-venue-btn{display:inline-flex;align-items:center;gap:5px;cursor:pointer;transition:opacity .15s}
.d-venue-btn:active{opacity:.7}
.d-venue-chev{width:16px;height:16px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:2px}
/* venue sheet */
.d-vsheet-ov{position:absolute;inset:0;z-index:70;background:rgba(0,0,0,.72);display:none;flex-direction:column;justify-content:flex-end}
.d-vsheet-ov.open{display:flex;animation:dvOvIn .2s ease}
@keyframes dvOvIn{from{opacity:0}to{opacity:1}}
.d-vsheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 32px;animation:dvSlide .3s cubic-bezier(.22,1,.36,1)}
@keyframes dvSlide{from{transform:translateY(100%)}to{transform:none}}
.d-vsheet-handle{width:36px;height:3px;background:var(--border);border-radius:2px;margin:14px auto 16px}
.d-vsheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);padding:0 18px 14px}
.d-venue-option{display:flex;align-items:center;gap:12px;padding:12px 18px;cursor:pointer;transition:background .12s;border-bottom:1px solid var(--border)}
.d-venue-option:last-child{border-bottom:none}
.d-venue-option:active{background:rgba(255,255,255,.06)}
.d-venue-option.sel{background:var(--green-bg)}
.d-vo-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.d-vo-name{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0);flex:1}
.d-vo-pos{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.d-vo-stats{text-align:right;flex-shrink:0}
.d-vo-rev{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0)}
.d-vo-fc{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.d-vo-check{width:20px;height:20px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-vo-connect{font-size:10px;color:var(--green);font-family:var(--font-b);margin-top:2px;cursor:pointer}
/* notif */
.d-notif-btn{width:38px;height:38px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;position:relative}
.d-notif-btn:active{background:rgba(255,255,255,.10)}
.d-notif-badge{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;
  background:var(--amber);border:1.5px solid var(--bg)}
.d-shift-row{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
.d-pill{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 12px;
  font-size:11px;font-family:var(--font-b);background:var(--green-bg);border:1px solid var(--green-border);color:var(--green)}
.d-pill--mgr{background:var(--purple-bg);border-color:var(--purple-border);color:var(--purple)}
.d-pill--none{background:var(--glass-bg);border-color:var(--border);color:var(--text2)}
.d-pill-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:dpulse 2s ease-in-out infinite}
.d-pill-dot--mgr{background:var(--purple)}
@keyframes dpulse{0%,100%{opacity:1}50%{opacity:.35}}
.d-shift-time{font-size:11px;color:var(--text2);font-family:var(--font-b)}
/* alerts */
.d-alert{margin:0 14px 6px;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:filter .15s}
.d-alert:active{filter:brightness(.9)}
.d-alert--amber{background:var(--amber-bg);border:1px solid var(--amber-border)}
.d-alert--red{background:var(--red-bg);border:1px solid var(--red-border)}
.d-alert-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-alert-icon--amber{background:rgba(251,191,36,.12)}
.d-alert-icon--red{background:rgba(248,113,113,.12)}
.d-alert-title{font-size:13px;font-weight:500;font-family:var(--font-b)}
.d-alert-title--amber{color:var(--amber)}.d-alert-title--red{color:var(--red)}
.d-alert-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
/* sec label */
.d-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;
  padding:14px 20px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.d-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b);padding:0}
/* quick list */
.d-quick{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;margin:0 20px}
.d-qbtn{background:transparent;border:none;border-bottom:0.5px solid var(--border);padding:14px 16px;
  cursor:pointer;display:flex;align-items:center;gap:14px;transition:background .12s;text-align:left;width:100%}
.d-qbtn:last-child{border-bottom:none}
.d-qbtn:active{background:rgba(255,255,255,.06)}
.d-qbtn-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-qbtn-label{font-family:var(--font-h);font-size:14px;font-weight:500;color:var(--text0);line-height:1.2;flex:1}
.d-qbtn-hint{font-size:11px;color:var(--text2);margin-top:2px}
.d-qbtn-badge{background:var(--red);border-radius:20px;
  padding:2px 7px;font-size:10px;color:#fff;font-family:var(--font-h);font-weight:600;flex-shrink:0}
/* kpi */
.d-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px}
.d-kpi{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:13px;
  padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.d-kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 13px 13px}
.d-kpi--g::after{background:var(--green)}.d-kpi--a::after{background:var(--amber)}.d-kpi--r::after{background:var(--red)}
.d-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.d-kpi-val--g{color:var(--green)}.d-kpi-val--a{color:var(--amber)}.d-kpi-val--r{color:var(--red)}
.d-kpi-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;line-height:1.3}
.d-kpi-delta{font-size:10px;margin-top:3px;font-family:var(--font-b)}
/* mgr widgets */
.d-mgr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px}
.d-mgr-card{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px}
.d-mgr-card-title{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-b);margin-bottom:10px}
.d-mgr-num{font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--text0);line-height:1}
.d-mgr-sub{font-size:11px;color:var(--text2);margin-top:4px;font-family:var(--font-b)}
/* inventory */
.d-inv-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.d-inv-row{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:10px 13px;
  display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .12s}
.d-inv-row:active{background:rgba(255,255,255,.09)}
.d-inv-bar{width:4px;height:36px;border-radius:2px;flex-shrink:0}
.d-inv-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.d-inv-norm{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-inv-qty{font-family:var(--font-h);font-size:16px;font-weight:700;text-align:right}
.d-inv-unit{font-size:10px;color:var(--text2);font-family:var(--font-b)}
.d-inv-meter{width:36px;height:36px;flex-shrink:0;position:relative}
.d-inv-meter svg{transform:rotate(-90deg)}
.d-inv-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:9px;font-family:var(--font-h);font-weight:700}
/* activity */
.d-act-item{display:flex;align-items:center;gap:12px;padding:11px 20px;cursor:pointer;transition:background .12s}
.d-act-item:active{background:rgba(255,255,255,.04)}
.d-act-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-act-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.d-act-meta{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-act-val{font-family:var(--font-h);font-size:14px;font-weight:600;text-align:right}
.d-act-time{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-act-div{height:1px;background:var(--border);margin:0 20px}
/* notif panel */
.d-notif-panel{position:absolute;top:60px;right:20px;width:280px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.55);z-index:50;display:none;animation:dDrop .2s cubic-bezier(.22,1,.36,1)}
.d-notif-panel.open{display:block}
@keyframes dDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.d-notif-hdr{padding:12px 16px 10px;border-bottom:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:center}
.d-notif-ttl{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.d-notif-clr{font-size:11px;color:var(--green);cursor:pointer;font-family:var(--font-b);background:none;border:none}
/* skeleton */
.d-skel{background:var(--glass-bg);border-radius:12px;animation:dSkel 1.2s ease-in-out infinite}
@keyframes dSkel{0%,100%{opacity:.4}50%{opacity:.9}}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function quickGrid(items) {
  return items.map(q => `
  <div class="d-qbtn" onclick="window.__barops.navigate('${q.route}')">
    <div class="d-qbtn-icon" style="background:${q.color}">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="color:${q.iconColor}">
        ${q.svg}
      </svg>
    </div>
    <div style="flex:1;min-width:0">
      <div class="d-qbtn-label">${q.label}</div>
      ${q.hint ? `<div class="d-qbtn-hint">${q.hint}</div>` : ''}
    </div>
    ${q.badge ? `<div class="d-qbtn-badge">${q.badge}</div>` : ''}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
  </div>`).join('');
}

function meterSvg(pct, color) {
  const r = 14, c = 2 * Math.PI * r;
  const safeP = Math.min(100, Math.max(0, pct));
  return `
  <svg width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="3"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${color}" stroke-width="3"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c*(1-safeP/100)).toFixed(2)}"
      stroke-linecap="round"/>
  </svg>
  <div class="d-inv-pct" style="color:${color}">${safeP}%</div>`;
}

function shiftDuration(startedAt) {
  if (!startedAt) return '';
  const diff = Math.floor((Date.now() - new Date(startedAt)) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h} год ${m} хв` : `${m} хв`;
}

function fmtMoney(n) {
  if (!n) return '0 ₴';
  return Math.round(n).toLocaleString('uk-UA') + ' ₴';
}

function token() {
  return localStorage.getItem('barops_token') || state.token || '';
}

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadVenues() {
  try {
    const res  = await fetch(`${API}/api/auth/venues`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) {
      _venues = data.venues;
      if (_venues.length > 0) {
        const targetId = _activeVenueId || state.venueId || localStorage.getItem('barops_venueId');
        const myVenue = _venues.find(v => v.id === targetId);
        const def = myVenue || _venues[0];
        _activeVenueId   = def.id;
        _activeVenueName = def.name;
      }
    }
  } catch (e) {
    console.error('[Dash] loadVenues:', e);
  }
}

async function loadStats() {
  _loading = true;
  partialRender();
  try {
    const res  = await fetch(`${API}/api/stats?venueId=${_activeVenueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) _stats = data.today;
  } catch (e) {
    console.error('[Dash] loadStats:', e);
    _stats = null;
  }
  _loading = false;
  fullRender();
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr = state.role === 'admin' || state.role === 'manager' || state.role === 'director';
  const isAcc = (state.role || '').toLowerCase() === 'accountant';
  // Керуючий — менеджерські швидкі дії (без Замовлень/Інвентаризації) + «Графіки»
  const scheduleAction = QUICK_BARTENDER.find(q => q.route === 'schedule');
  const quick = state.role === 'admin' ? QUICK_ADMIN
              : state.role === 'director' ? [...QUICK_MANAGER.filter(q => !['ordering', 'inventory'].includes(q.route)), ...(scheduleAction ? [scheduleAction] : [])]
              : isMgr ? QUICK_MANAGER.filter(q => !['excise', 'ordering', 'writeoff'].includes(q.route))
              : isAcc ? QUICK_BARTENDER.filter(q => !['excise', 'ordering', 'schedule'].includes(q.route))
              : QUICK_BARTENDER;
  const s     = _stats;

  // KPI з реальних даних
  const kpi = isMgr ? [
    { val: s ? String(s.invoices?.count ?? '—')          : '—', lbl:'Накладних\nсьогодні', cls:'g',
      delta: s ? fmtMoney(s.invoices?.total)              : '...' },
    { val: s ? String(s.writeoffs?.count ?? 0)            : '—', lbl:'Списань\nсьогодні',  cls: (s?.writeoffs?.count > 0) ? 'a' : 'g',
      delta: s ? Object.entries(s.writeoffs?.byCategory || {}).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'немає' : '...' },
    { val: s ? String(s.critical?.length ?? 0)            : '—', lbl:'Алертів\nзалишки',   cls: (s?.critical?.length > 0) ? 'r' : 'g',
      delta: s?.critical?.length ? `${s.critical.length} товар(ів) низько` : 'все норм' },
  ] : [
    { val: s ? String(s.invoices?.count ?? '—')           : '—', lbl:'Накладних\nзміна',   cls:'',
      delta: s ? fmtMoney(s.invoices?.total)               : '...' },
    { val: s ? String(s.writeoffs?.count ?? 0)             : '—', lbl:'Списань\nсьогодні',  cls: (s?.writeoffs?.count > 0) ? 'a' : 'g',
      delta: s?.writeoffs?.count > 0 ? 'є списання' : 'чисто' },
    { val: s ? String(s.critical?.length ?? 0)             : '—', lbl:'Критичних\nзалишків',cls: (s?.critical?.length > 0) ? 'r' : 'g',
      delta: s?.critical?.[0]?.name || 'все норм' },
  ];

  return `
${CSS}
<div style="position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden">

  <!-- Notif panel -->
  <div class="d-notif-panel ${_notifOpen ? 'open' : ''}" id="d-notif">
    <div class="d-notif-hdr">
      <span class="d-notif-ttl">Сповіщення</span>
      <button class="d-notif-clr" onclick="window.__dash.closeNotif()">Закрити</button>
    </div>
    ${_pendingOrders.length ? _pendingOrders.map(o => {
      const t = new Date(o.createdAt);
      const timeStr = t.toLocaleDateString('uk-UA',{day:'numeric',month:'short'}) + ' ' +
                      t.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'});
      const totalItems = (o.suppliers||[]).reduce((a,s)=>a+(s.items||[]).filter(i=>i.qty>0).length,0);
      return `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer"
         onclick="window.__barops.navigate('ordering');window.__dash.closeNotif()">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="width:7px;height:7px;border-radius:50%;background:var(--amber);flex-shrink:0;margin-top:4px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text1);font-family:var(--font-b)">Нова заявка на закупку</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">${o.submittedBy} · ${totalItems} поз. · ${timeStr}</div>
        </div>
      </div>
    </div>`;
    }).join('') : ''}
    ${_pendingDayoff.length ? _pendingDayoff.map(r => {
      const dts = (r.dates || []).map(d => { const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : `${x.getDate()}.${String(x.getMonth()+1).padStart(2,'0')}`; }).join(', ');
      return `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer"
         onclick="window.__barops.navigate('schedule');window.__dash.closeNotif()">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="width:7px;height:7px;border-radius:50%;background:var(--purple);flex-shrink:0;margin-top:4px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text1);font-family:var(--font-b)">Запит на вихідні</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">${r.userName || 'Співробітник'} · ${dts}</div>
        </div>
      </div>
    </div>`;
    }).join('') : ''}
    ${s?.critical?.length ? s.critical.map(p => `
    <div style="padding:10px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <div style="width:7px;height:7px;border-radius:50%;background:var(--red);flex-shrink:0;margin-top:4px"></div>
        <div>
          <div style="font-size:12px;color:var(--text1);font-family:var(--font-b)">${p.name} — низький залишок</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px">${p.currentStock} ${p.unit} · мінімум ${p.reorderPoint} ${p.unit}</div>
        </div>
      </div>
    </div>`).join('') : ''}
    ${!_pendingOrders.length && !_pendingDayoff.length && !s?.critical?.length ? `
    <div style="padding:20px 16px;text-align:center;color:var(--text2);font-size:13px;font-family:var(--font-b)">Немає сповіщень</div>` : ''}
  </div>

  <div class="d-scroll">

    <!-- Header -->
    <div class="d-header">
      <div style="font-family:'Geist',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--text2);letter-spacing:-.02em;margin-bottom:10px">bar<span style="color:#A88BFF">ops.</span></div>
      <div class="d-venue-row">
        <div style="display:flex;align-items:center;gap:10px">
          ${(isMgr || (state.role || '').toLowerCase() === 'accountant') ? `
          <div onclick="window.__barops.openDrawer()"
            style="width:36px;height:36px;border-radius:10px;background:var(--glass-bg);
                   
                   border:0.5px solid var(--border);display:flex;flex-direction:column;
                   align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
            <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
            <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
            <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
          </div>` : ''}
          <div>
            <div class="d-venue-sub">${state.role==='admin'?'Системний менеджер':state.role==='manager'?'Менеджер':state.role==='director'?'Керуючий':state.role==='accountant'?'Бухгалтер':state.role==='chef'?'Шеф-кухар':state.role==='cook'?'Кухар':state.role==='waiter'?'Офіціант':'Бармен'} ·${new Date().toLocaleDateString('uk-UA',{day:'numeric',month:'long'})}</div>
            ${isMgr ? `
            <div class="d-venue-btn" onclick="window.__dash.toggleVenueSheet()">
              <div class="d-venue-name">${_activeVenueName || state.venue || '...'}</div>
              <div class="d-venue-chev">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 3l2 2 2-2" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>` : `
            <div class="d-venue-name">${state.venue || '...'}</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${state.user || localStorage.getItem('barops_user') || ''} - ${localStorage.getItem('barops_phone') || ''}
              </div>`}
          </div>
        </div>
        <div class="d-notif-btn" onclick="window.__dash.toggleNotif()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5 5 0 00-5 5c0 5.5-2 7-2 7h14s-2-1.5-2-7a5 5 0 00-5-5z"
              stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10.7 15a2 2 0 01-3.4 0" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          ${(s?.critical?.length || _pendingOrders.length || _pendingDayoff.length) ? '<div class="d-notif-badge"></div>' : ''}
        </div>
      </div>
      <div class="d-shift-row">
        ${(!isMgr && !isAcc) ? (s?.shift ? `
        <div class="d-pill">
          <div class="d-pill-dot"></div>
          <span>Зміна активна · ${s.shift.user}</span>
        </div>
        <span class="d-shift-time">${shiftDuration(s.shift.startedAt)}</span>` : `
        <div class="d-pill d-pill--none">Зміна не відкрита</div>
        <button onclick="window.__dash.openShift()"
          style="height:28px;padding:0 12px;border-radius:20px;border:1px solid var(--green-border);background:var(--green-bg);font-size:11px;color:var(--green);cursor:pointer;font-family:var(--font-b);white-space:nowrap">
          Відкрити зміну
        </button>`) : ''}
      </div>
    </div>

    <!-- Alerts: критичні залишки -->
    ${s?.critical?.length ? s.critical.slice(0, 2).map(p => `
    <div class="d-alert d-alert--red" onclick="window.__barops.navigate('inventory')">
      <div class="d-alert-icon d-alert-icon--red">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--red)" stroke-width="1.3"/>
          <path d="M8 5v3M8 10v.5" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </div>
      <div style="flex:1">
        <div class="d-alert-title d-alert-title--red">${p.name} — критично низько</div>
        <div class="d-alert-sub">Залишок ${p.currentStock} ${p.unit} · Мінімум ${p.reorderPoint} ${p.unit}</div>
      </div>
      <span style="color:var(--red);font-size:18px;opacity:.6">›</span>
    </div>`).join('') : ''}

    <!-- Quick actions -->
    <div class="d-sec">Швидкі дії</div>
    <div class="d-quick">${quickGrid(quick)}</div>

    <!-- KPI (приховано для бухгалтера) -->
    ${!isAcc ? `
    <div class="d-sec" style="padding-top:16px">Зміна сьогодні</div>
    ${_loading ? `
    <div style="padding:0 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      ${[1,2,3].map(()=>`<div class="d-skel" style="height:78px"></div>`).join('')}
    </div>` : `
    <div class="d-kpi-row">
      ${kpi.map(k => {
        const col = k.cls==='g'?'var(--green)':k.cls==='a'?'var(--amber)':k.cls==='r'?'var(--red)':'var(--text2)';
        return `
        <div class="d-kpi${k.cls?' d-kpi--'+k.cls:''}">
          <div class="d-kpi-val${k.cls?' d-kpi-val--'+k.cls:''}">${k.val}</div>
          <div class="d-kpi-lbl">${k.lbl.replace('\n','<br/>')}</div>
          <div class="d-kpi-delta" style="color:${col}">${k.delta}</div>
        </div>`;
      }).join('')}
    </div>`}` : ''}

    <!-- Manager analytics -->
    ${isMgr && s ? `
    <div class="d-sec" style="padding-top:16px">Аналітика зміни</div>
    <div class="d-mgr-grid">
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Накладні · сьогодні</div>
        <div class="d-mgr-num" style="color:var(--green)">${fmtMoney(s.invoices?.total)}</div>
        <div class="d-mgr-sub">${s.invoices?.count ?? 0} накладних</div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Команда закладу</div>
        <div class="d-mgr-num">${s.teamCount ?? '—'}</div>
        <div class="d-mgr-sub">активних барменів</div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Списання</div>
        <div class="d-mgr-num" style="color:${s.writeoffs?.count > 0 ? 'var(--red)' : 'var(--green)'}">${s.writeoffs?.count ?? 0}</div>
        <div class="d-mgr-sub">${Object.entries(s.writeoffs?.byCategory || {}).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'немає'}</div>
        <div style="margin-top:8px;display:flex;gap:4px">
          ${Object.entries(s.writeoffs?.byCategory || {}).map(([,v],i)=>`
          <div style="flex:${v};height:6px;border-radius:3px;background:${['var(--red)','var(--amber)','var(--purple)'][i%3]}"></div>`).join('')}
        </div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Вартість запасів</div>
        <div class="d-mgr-num" style="color:var(--amber);font-size:20px">${fmtMoney(s.stockValue)}</div>
        <div class="d-mgr-sub">поточний залишок</div>
      </div>
    </div>` : ''}

    <!-- Критичні залишки -->
    ${s?.critical?.length ? `
    <div class="d-sec" style="padding-top:16px">
      Залишки · критичні
      <button class="d-sec-link" onclick="window.__barops.navigate('stock')">Всі →</button>
    </div>
    <div class="d-inv-list">
      ${s.critical.map(p => {
        const color = p.pct < 20 ? 'var(--red)' : p.pct < 50 ? 'var(--amber)' : 'var(--green)';
        return `
        <div class="d-inv-row" onclick="window.__barops.navigate('inventory')">
          <div class="d-inv-bar" style="background:${color}"></div>
          <div style="flex:1;min-width:0">
            <div class="d-inv-name">${p.name}</div>
            <div class="d-inv-norm">Норма: ≥ ${p.reorderPoint} ${p.unit}</div>
          </div>
          <div style="text-align:right;margin-right:8px">
            <div class="d-inv-qty" style="color:${color}">${p.currentStock}</div>
            <div class="d-inv-unit">${p.unit}</div>
          </div>
          <div class="d-inv-meter">${meterSvg(p.pct, color)}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Остання активність: списання -->
    ${s?.writeoffs?.recent?.length ? `
    <div class="d-sec" style="padding-top:16px">
      Остання активність
      <button class="d-sec-link" onclick="window.__barops.navigate('writeoff')">Все →</button>
    </div>
    ${s.writeoffs.recent.map((w, i) => `
    <div class="d-act-item" onclick="window.__barops.navigate('writeoff')">
      <div class="d-act-icon" style="background:var(--red-bg)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 13l2-2 6-6 2 2-6 6-2 2H3v-2z" stroke="var(--red)" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="d-act-name">Списання · ${w.itemCount} поз.</div>
        <div class="d-act-meta">${w.user}${w.notes ? ' · ' + w.notes : ''}</div>
      </div>
      <div>
        <div class="d-act-val" style="color:var(--red)">−${w.itemCount}</div>
        <div class="d-act-time">${new Date(w.time).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>
    ${i < s.writeoffs.recent.length - 1 ? '<div class="d-act-div"></div>' : ''}`).join('')}` : ''}

    <div style="height:20px"></div>
  </div><!-- d-scroll -->

  ${isMgr ? `
  <!-- VENUE SWITCHER SHEET -->
  <div class="d-vsheet-ov ${_venueSheetOpen ? 'open' : ''}" onclick="window.__dash.closeVenueSheet(event)">
    <div class="d-vsheet" onclick="event.stopPropagation()">
      <div class="d-vsheet-handle"></div>
      <div class="d-vsheet-title">Оберіть заклад</div>

      ${_venues.map((v, i) => { const vn = v.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); return `
      <div class="d-venue-option ${_activeVenueId === v.id ? 'sel' : ''}"
           onclick="window.__dash.selectVenue('${v.id}','${vn}')">
        <div class="d-vo-dot" style="background:${VENUE_COLORS[i % VENUE_COLORS.length]}"></div>
        <div style="flex:1">
          <div class="d-vo-name">${v.name}</div>
          <div class="d-vo-pos">${v.posType === 'syrve' ? '✓ Syrve підключено' : v.posType === 'manual' ? 'Ручний режим' : v.posType}</div>
          ${v.posType !== 'syrve' ? `
          <div class="d-vo-connect" onclick="event.stopPropagation();window.__dash.openSyrveSheet('${v.id}','${vn}')">
            + Підключити Syrve
          </div>` : ''}
        </div>
        ${_activeVenueId === v.id ? `
        <div class="d-vo-check">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>` : ''}
      </div>`}).join('')}
    </div>
  </div>
  ` : ''}
</div>`;
}

/* ════════════════════════
   PAGE MODULE
════════════════════════ */
function fullRender() {
  if (state.route !== 'dashboard') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function partialRender() {
  if (state.route !== 'dashboard') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function toggleVenueSheet() { _venueSheetOpen = !_venueSheetOpen; fullRender(); }
function closeVenueSheet(e) {
  if (!e || e.target.classList.contains('d-vsheet-ov')) { _venueSheetOpen = false; fullRender(); }
}

function selectVenue(id, name) {
  _activeVenueId   = id;
  _activeVenueName = name;
  _venueSheetOpen  = false;
  state.venue      = name;
  state.venueId    = id;
  localStorage.setItem('barops_venue',   name);
  localStorage.setItem('barops_venueId', id);
  loadStats();
}

async function openShift() {
  try {
    const tok = localStorage.getItem('barops_token');
    const res = await fetch(`${API}/api/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    }).catch(() => ({ ok: false, json: async () => ({ error: 'Мережева помилка' }) }));
    const data = await res.json();
    if (data.success) {
      await loadStats();
      fullRender();
    } else {
      if (data.error === 'Зміна вже відкрита') {
        await loadStats();
        fullRender();
      } else {
        alert(data.error || 'Помилка відкриття зміни');
      }
    }
  } catch (err) {
    console.error('[Dashboard] openShift error:', err);
  }
}

export default {
  render() {
    _notifOpen      = false;
    _venueSheetOpen = false;
    _pendingOrders  = [];
    _pendingDayoff  = [];
    return buildHTML();
  },
  async init() {
    window.__dash = {
      openShift,
      toggleNotif() {
        _notifOpen = !_notifOpen;
        document.getElementById('d-notif')?.classList.toggle('open', _notifOpen);
      },
      closeNotif() {
        _notifOpen = false;
        document.getElementById('d-notif')?.classList.remove('open');
      },
      toggleVenueSheet,
      closeVenueSheet,
      selectVenue,
    };

    // Синхронізуємо активний заклад з глобального state (перемикання в drawer)
    const savedVenueId = state.venueId || localStorage.getItem('barops_venueId');
    if (savedVenueId) {
      _activeVenueId   = savedVenueId;
      _activeVenueName = state.venue || localStorage.getItem('barops_venue') || _activeVenueName;
    }

    // Завантажуємо заклади і статистику
    await loadVenues();
    await loadStats();
    if (state.role === 'admin' || state.role === 'manager' || state.role === 'director') { loadPendingOrders(); loadPendingDayoff(); }
  },
};

async function loadPendingOrders() {
  const venueId = _activeVenueId || state.venueId || localStorage.getItem('barops_venueId');
  const tok     = localStorage.getItem('barops_token');
  if (!venueId || !tok) return;
  try {
    const res  = await fetch(`${API}/api/orders?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (data.success) {
      _pendingOrders = (data.data || []).filter(o => o.status === 'pending');
      fullRender();
    }
  } catch { /* silent */ }
}

async function loadPendingDayoff() {
  const venueId = _activeVenueId || state.venueId || localStorage.getItem('barops_venueId');
  const tok     = localStorage.getItem('barops_token');
  if (!venueId || !tok) return;
  try {
    const res  = await fetch(`${API}/api/dayoff?venueId=${venueId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const data = await res.json();
    if (data.success) {
      _pendingDayoff = (data.requests || []).filter(r => r.status === 'pending');
      fullRender();
    }
  } catch { /* silent */ }
}
