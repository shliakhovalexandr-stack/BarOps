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
let _syrveStats      = null; // дані з /api/stats/syrve (виторг + накладні) — повільне довантаження
let _syrveLoading    = false;
let _loading         = true;
let _venueSheetOpen  = false;
let _notifOpen       = false;
let _pendingOrders   = [];   // заявки на закупку (для адмін/менеджер)
let _pendingDayoff   = [];   // запити на вихідні (для адмін/менеджер)
let _seenNotifs      = new Set(); // id переглянутих сповіщень (localStorage) — нові світяться, прочитані сірі
let _mini            = { digest: null, checklist: null, playlist: null, tasks: null, debts: null, excise: null }; // живі міні-показники плиток

const VENUE_COLORS = [
  'var(--green)', 'var(--amber)', 'var(--purple)',
  'var(--red)', '#4FA8E8', '#E24B4A',
];

/* ════════════════════════
   QUICK ACTIONS
════════════════════════ */
const QUICK_CASH = { route:'cash', badge:null, label:'Каса', hint:'Готівка, взята з каси за зміну', color:'var(--amber-bg)', iconColor:'var(--amber)',
  svg:`<rect x="2" y="5" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
       <circle cx="9" cy="9.5" r="2" stroke="currentColor" stroke-width="1.3"/>
       <path d="M5 8.5v2M13 8.5v2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>` };

const QUICK_DISHWARE = { route:'dishware', badge:null, label:'Інвентаризація посуд', hint:'Перерахунок посуду в залі', color:'var(--teal-bg)', iconColor:'var(--teal)',
  svg:`<circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
       <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.2" fill="none"/>` };

const QUICK_MY_SHIFT = { route:'my-shift', badge:null, label:'Моя зміна', hint:'Мої продажі, чеки та фокус-страви', color:'var(--purple-bg)', iconColor:'var(--purple)',
  svg:`<circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
       <path d="M3.5 15.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` };

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
  QUICK_CASH,
  QUICK_DISHWARE,
];

const QUICK_CURRENT_SHIFT = { route:'current-shift', badge:null, label:'Поточна зміна', hint:'Офіціанти, зони та відкриті столи з POS', color:'var(--purple-bg)', iconColor:'var(--purple)',
  svg:`<circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
       <path d="M3 16c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
       <circle cx="14.5" cy="4.5" r="1.2" fill="currentColor" opacity=".7"/>` };

const QUICK_PLAYLIST = { route:'playlist', badge:null, label:'Плей-лист', hint:'Страви на продаж + облік по офіціантах', color:'var(--green-bg)', iconColor:'var(--green)',
  svg:`<circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.3"/>
       <circle cx="9" cy="9" r="3.6" stroke="currentColor" stroke-width="1.3"/>
       <circle cx="9" cy="9" r="1" fill="currentColor"/>` };

const QUICK_PERFORMANCE = { route:'performance', badge:null, label:'Продуктивність', hint:'Виторг бару на годину-бармена', color:'var(--blue-bg)', iconColor:'var(--blue)',
  svg:`<path d="M3 15V9M7 15V4M11 15v-4M15 15V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
       <path d="M2 16h14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>` };

const QUICK_DIGEST = { route:'digest', badge:null, label:'Звіт за день', hint:'Зведення вчора: виторг, бар, персонал, дисципліна', color:'var(--amber-bg)', iconColor:'var(--amber)',
  svg:`<rect x="3" y="2" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/>
       <path d="M6 6h7M6 9h7M6 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
       <circle cx="13.5" cy="12.5" r="2" stroke="currentColor" stroke-width="1.1" fill="none"/>` };

const QUICK_DISCIPLINE = { route:'discipline', badge:null, label:'Дисципліна', hint:'Рейтинг персоналу: чек-листи, завдання, списання', color:'var(--purple-bg)', iconColor:'var(--purple)',
  svg:`<circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/>
       <path d="M3 16c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
       <path d="M13 3l1 1 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` };

const QUICK_MANAGER = [
  QUICK_DIGEST,
  QUICK_PERFORMANCE,
  QUICK_DISCIPLINE,
  QUICK_CURRENT_SHIFT,
  QUICK_PLAYLIST,
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
  QUICK_CASH,
  QUICK_DISHWARE,
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
/* секції-сітка плиток (нова головна) */
.d-gsec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:13px 20px 7px;font-family:var(--font-b)}
.d-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px}
.d-tile{background:var(--bg1);border:0.5px solid var(--border);border-radius:15px;padding:12px;min-height:88px;
  display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;text-align:left;transition:background .12s}
.d-tile:active{background:rgba(255,255,255,.05)}
.d-tile-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center}
.d-tile-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);margin-top:9px;letter-spacing:-.01em;line-height:1.15}
.d-tile-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.25}
.d-tile-stat{font-size:11.5px;font-weight:600;font-family:var(--font-b);margin-top:2px}
.d-tile-hero{grid-column:1 / -1;min-height:auto;background:linear-gradient(160deg,rgba(45,212,191,.10),rgba(255,255,255,.005))}
.d-hero-row{display:flex;align-items:center;gap:12px}
.d-hero-prog{height:6px;border-radius:4px;background:var(--bg3);overflow:hidden;margin-top:10px}
.d-hero-prog>div{height:100%;border-radius:4px}
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
/* бармен: «Моя зміна сьогодні» — клікабельні картки */
.d-tcard-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 14px}
.d-tcard{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px 8px;text-align:center;cursor:pointer;transition:background .12s}
.d-tcard:active{background:rgba(255,255,255,.06)}
.d-tcard-val{font-family:var(--font-h);font-size:26px;font-weight:700;line-height:1}
.d-tcard-lbl{font-size:11px;color:var(--text1);font-family:var(--font-b);margin-top:7px;font-weight:500}
.d-tcard-sub{font-size:10px;font-family:var(--font-b);margin-top:2px;opacity:.85}
.d-today{margin:0 14px;background:linear-gradient(135deg,rgba(168,139,255,.12),rgba(56,189,248,.05));border:0.5px solid var(--border);border-radius:16px;padding:16px}
.d-today-lbl{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-b)}
.d-today-rev{font-family:var(--font-h);font-size:34px;font-weight:700;color:var(--purple);line-height:1;margin-top:8px;letter-spacing:-.02em}
.d-today-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:8px}
.d-today-money{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border);font-size:13px;font-family:var(--font-b);font-weight:600}
.d-today-fc{color:var(--text1)}.d-today-wo{color:var(--red)}
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

// ── Нова головна: плитки-сітка по секціях ──────────────────
function tileByRoute() {
  const m = {};
  for (const t of [...QUICK_ADMIN, ...QUICK_BARTENDER]) if (t && t.route && !m[t.route]) m[t.route] = t;
  return m;
}
// Шеф-кухар = керівник КУХНІ: кухонні операції + нагляд (продуктивність/журнал/графік кухні) + плей-лист
const CHEF_ROUTES = ['performance', 'playlist', 'journal', 'stop-list', 'schedule', 'recipes', 'ordering', 'ocr', 'stock', 'writeoff', 'inventory'];

// Розкладка секцій: менеджер (нагляд вгорі) / працівник (операції вгорі)
const SECTIONS_MGR = [
  ['Зведення',         ['digest', 'performance', 'discipline', 'playlist']],
  ['Моніторинг зміни', ['current-shift', 'journal', 'cash', 'debts', 'stop-list', 'schedule', 'recipes']],
  ['Ревізія',          ['dishware']],
  ['Операції',         ['ordering', 'inventory', 'ocr', 'writeoff', 'excise', 'stock']],
  ['Облік',            ['recipe-book']],
];
const SECTIONS_WORKER = [
  ['Аналітика', ['performance']],   // лише для тих, у кого є плитка (напр. шеф-кухар)
  ['Операції',  ['writeoff', 'inventory', 'dishware', 'ordering', 'ocr', 'excise']],
  ['Моя зміна', ['cash', 'stop-list', 'debts', 'schedule', 'current-shift']],
];

// Живий міні-показник плитки (інакше — звичайна підказка)
function tileSub(route, hint) {
  const d = _mini.digest, cl = _mini.checklist;
  const stat = (txt, color) => `<div class="d-tile-stat" style="color:${color || 'var(--text2)'}">${txt}</div>`;
  if (route === 'digest'      && d && d.profit != null)                  return stat(`Прибуток ${fmtMoney(d.profit)}`, 'var(--green)');
  if (route === 'performance' && d && d.bar && d.bar.revPerHour != null) return stat(`${fmtMoney(d.bar.revPerHour)}/год`, 'var(--blue)');
  if (route === 'playlist'    && _mini.playlist != null)                 return stat(`${_mini.playlist} страв`, 'var(--text1)');
  if (route === 'journal'     && cl && cl.total)                         return stat(`Чек-листи ${cl.done}/${cl.total}`, cl.done >= cl.total ? 'var(--green)' : 'var(--amber)');
  if (route === 'stock'       && _stats && _stats.critical) { const n = _stats.critical.length; return stat(n ? `${n} критичних` : 'все норм', n ? 'var(--red)' : 'var(--green)'); }
  return hint ? `<div class="d-tile-hint">${hint}</div>` : '';
}

function tileGrid(items) {
  return `<div class="d-grid">` + items.map(q => `
    <div class="d-tile" onclick="window.__barops.navigate('${q.route}')">
      <div class="d-tile-ic" style="background:${q.color}">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none" style="color:${q.iconColor}">${q.svg}</svg>
      </div>
      <div>
        <div class="d-tile-name">${q.label}</div>
        ${tileSub(q.route, q.hint)}
      </div>
    </div>`).join('') + `</div>`;
}

// Чек-лист — герой нагорі (для працівників): велика плитка → Журнал
function heroChecklistTile() {
  const j = tileByRoute()['journal'];
  const svg = j?.svg || `<rect x="3" y="2" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M6 6h7M6 9h7M6 12h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`;
  const cl = _mini.checklist;
  const pct = cl && cl.total ? Math.round(cl.done / cl.total * 100) : null;
  const col = pct == null ? 'var(--text2)' : pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
  const sub = cl && cl.total ? `${cl.done}/${cl.total} виконано · ${pct}%` : 'Завдання та чек-листи на сьогодні';
  return `<div class="d-gsec">Чек-лист зміни</div>
  <div class="d-grid">
    <div class="d-tile d-tile-hero" onclick="window.__barops.navigate('journal')">
      <div class="d-hero-row">
        <div class="d-tile-ic" style="background:var(--teal-bg)">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="color:var(--teal)">${svg}</svg>
        </div>
        <div style="flex:1;min-width:0">
          <div class="d-tile-name" style="margin-top:0">Чек-листи зміни</div>
          <div class="d-tile-stat" style="color:${col}">${sub}</div>
        </div>
        ${pct != null ? `<div style="font-family:var(--font-h);font-size:20px;font-weight:700;color:${col}">${pct}%</div>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`}
      </div>
      ${pct != null ? `<div class="d-hero-prog"><div style="width:${pct}%;background:${col}"></div></div>` : ''}
    </div>
  </div>`;
}

// Згрупувати дозволені плитки ролі у секції-сітку
function dashTiles(quick, isMgr, showHero, compactOps = isMgr) {
  const inQuick = new Set(quick.map(q => q.route));
  const byR = tileByRoute();
  const defs = isMgr ? SECTIONS_MGR : SECTIONS_WORKER;
  let html = showHero ? heroChecklistTile() : '';
  const used = new Set();
  for (const [label, routes] of defs) {
    const tiles = routes.filter(r => inQuick.has(r)).map(r => { used.add(r); return byR[r]; }).filter(Boolean);
    if (!tiles.length) continue;
    // Операції для менеджера/адміна — компактним списком (він їх не виконує щодня); шеф виконує → повні плитки
    if (compactOps && label === 'Операції') html += `<div class="d-gsec">${label}</div><div class="d-quick">${quickGrid(tiles)}</div>`;
    else html += `<div class="d-gsec">${label}</div>` + tileGrid(tiles);
  }
  const rest = quick.filter(q => !used.has(q.route));   // нерозкладені — окремо, щоб нічого не загубити
  if (rest.length) html += `<div class="d-gsec">Інше</div>` + tileGrid(rest);
  return html;
}

// Офіціант: чек-лист-герой + усі плитки одним блоком без заголовків секцій
function waiterTiles(quick) {
  const byR = {};
  for (const q of quick) byR[q.route] = q;   // лукап із власних плиток офіціанта
  const order = ['my-shift', 'dishware', 'cash', 'stop-list', 'schedule'];
  const seen = new Set();
  const tiles = [];
  for (const r of order) if (byR[r]) { tiles.push(byR[r]); seen.add(r); }
  for (const q of quick) if (!seen.has(q.route)) tiles.push(q);   // нічого не загубити
  // 8px-проміжок між героєм і плитками (раніше відступ давав заголовок секції)
  return heroChecklistTile() + `<div style="height:8px"></div>` + tileGrid(tiles);
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

/* ── Сповіщення: стан «бачив» ── */
function notifSeenKey() { return 'barops_notif_seen'; }
function loadSeenNotifs() { try { _seenNotifs = new Set(JSON.parse(localStorage.getItem(notifSeenKey()) || '[]')); } catch { _seenNotifs = new Set(); } }
function notifList() {
  const list = [];
  (_pendingOrders || []).forEach(o => list.push('o-' + o.id));
  (_pendingDayoff || []).forEach(r => list.push('d-' + r.id));
  ((_stats && _stats.critical) || []).forEach(p => list.push('c-' + (p.productId || p.name)));
  return list;
}
function unseenNotifCount() { return notifList().filter(id => !_seenNotifs.has(id)).length; }
function clearNotifs() {
  notifList().forEach(id => _seenNotifs.add(id));
  // лишаємо тільки актуальні id, щоб набір не розростався
  _seenNotifs = new Set([..._seenNotifs].filter(id => notifList().includes(id)));
  try { localStorage.setItem(notifSeenKey(), JSON.stringify([..._seenNotifs])); } catch {}
  fullRender();
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

function isMgrRole() {
  return ['admin', 'manager', 'director'].includes(state.role);
}

// Живі міні-показники для плиток (дешеві/кешовані джерела, без важкого Syrve)
async function loadMiniStats() {
  const venueId = _activeVenueId || state.venueId || localStorage.getItem('barops_venueId');
  const tok = token();
  if (!venueId || !tok) return;
  const H = { Authorization: `Bearer ${tok}` };
  const mgr = isMgrRole();
  const tasks = [];
  if (mgr) tasks.push(fetch(`${API}/api/performance/digest?venueId=${venueId}&cachedOnly=1`, { headers: H })
    .then(r => r.json()).then(d => { if (d.success) _mini.digest = d.digest; }).catch(() => {}));
  tasks.push(fetch(`${API}/api/checklists/today?venueId=${venueId}`, { headers: H })
    .then(r => r.json()).then(d => {
      if (d.success) {
        const cs = d.checklists || [];
        _mini.checklist = { done: cs.reduce((a, c) => a + (c.doneCount || 0), 0), total: cs.reduce((a, c) => a + (c.total || 0), 0) };
      }
    }).catch(() => {}));
  // Завдання на сьогодні (для блоку «Моя зміна» бармена; бекенд віддає лише свої для працівника)
  const ymdToday = new Date(); const ydt = `${ymdToday.getFullYear()}-${String(ymdToday.getMonth()+1).padStart(2,'0')}-${String(ymdToday.getDate()).padStart(2,'0')}`;
  tasks.push(fetch(`${API}/api/tasks?venueId=${venueId}&from=${ydt}`, { headers: H })
    .then(r => r.json()).then(d => {
      if (d.success) {
        const ts = (d.tasks || []).filter(t => t.date === ydt);
        _mini.tasks = { done: ts.filter(t => t.done).length, total: ts.length };
      }
    }).catch(() => {}));
  // Борги (незакриті) + акцизні марки на досканування — для блоку «Моя зміна» бармена
  if (!mgr) {
    tasks.push(fetch(`${API}/api/debts?type=debt&filter=active&venueId=${venueId}`, { headers: H })
      .then(r => r.json()).then(d => { if (d.success && Array.isArray(d.data)) _mini.debts = d.data.length; }).catch(() => {}));
    tasks.push(fetch(`${API}/api/excise/rescan?venueId=${venueId}`, { headers: H })
      .then(r => r.json()).then(d => { if (Array.isArray(d.marks)) _mini.excise = d.marks.length; }).catch(() => {}));
  }
  if (mgr) tasks.push(fetch(`${API}/api/playlist/${venueId}`, { headers: H })
    .then(r => r.json()).then(d => { if (Array.isArray(d.items)) _mini.playlist = d.items.length; }).catch(() => {}));
  await Promise.allSettled(tasks);
  fullRender();
}

// Повільні метрики з Syrve (виторг + накладні) — окремий запит зі скелетоном
async function loadSyrveStats() {
  if (!isMgrRole() || !_activeVenueId) return;
  _syrveLoading = true;
  fullRender();
  try {
    const res  = await fetch(`${API}/api/stats/syrve/${_activeVenueId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    _syrveStats = data.success ? data : null;
  } catch (e) {
    console.error('[Dash] loadSyrveStats:', e);
    _syrveStats = null;
  }
  _syrveLoading = false;
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
              : state.role === 'manager' ? [...QUICK_MANAGER.filter(q => !['excise', 'ordering', 'writeoff', 'inventory', 'stock', 'debts'].includes(q.route)), ...(scheduleAction ? [scheduleAction] : [])]
              : isAcc ? QUICK_BARTENDER.filter(q => !['excise', 'ordering', 'schedule', 'cash'].includes(q.route))
              : state.role === 'chef' ? (() => { const m = tileByRoute(); return CHEF_ROUTES.map(r => m[r]).filter(Boolean); })()
              : state.role === 'waiter' ? [QUICK_MY_SHIFT, ...QUICK_BARTENDER.filter(q => !['writeoff', 'inventory', 'ordering', 'excise', 'debts'].includes(q.route))]
              : QUICK_BARTENDER;
  const s     = _stats;
  const unseen = unseenNotifCount();

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
      <span style="display:flex;gap:14px;align-items:center">
        ${unseen > 0 ? `<button class="d-notif-clr" onclick="window.__dash.clearNotifs()">Очистити</button>` : ''}
        <button class="d-notif-clr" style="color:var(--text2)" onclick="window.__dash.closeNotif()">Закрити</button>
      </span>
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
        <div style="width:7px;height:7px;border-radius:50%;background:${_seenNotifs.has('o-'+o.id) ? 'var(--text3)' : 'var(--amber)'};flex-shrink:0;margin-top:4px"></div>
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
        <div style="width:7px;height:7px;border-radius:50%;background:${_seenNotifs.has('d-'+r.id) ? 'var(--text3)' : 'var(--purple)'};flex-shrink:0;margin-top:4px"></div>
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
        <div style="width:7px;height:7px;border-radius:50%;background:${_seenNotifs.has('c-'+(p.productId||p.name)) ? 'var(--text3)' : 'var(--red)'};flex-shrink:0;margin-top:4px"></div>
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
            ${isMgr && _venues.length > 1 ? `
            <div class="d-venue-btn" onclick="window.__dash.toggleVenueSheet()">
              <div class="d-venue-name">${_activeVenueName || state.venue || '...'}</div>
              <div class="d-venue-chev">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 3l2 2 2-2" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>` : isMgr ? `
            <div class="d-venue-name">${_activeVenueName || state.venue || '...'}</div>` : `
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
          ${unseen > 0 ? '<div class="d-notif-badge"></div>' : ''}
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

    <!-- Швидкі дії — секції-сітка (нагляд/операції за роллю); офіціант — одним блоком без назв -->
    ${state.role === 'waiter' ? waiterTiles(quick)
      : state.role === 'chef' ? dashTiles(quick, true, false, false)
      : dashTiles(quick, isMgr, !isMgr && !isAcc)}

    <!-- Моя зміна сьогодні — дієві показники для бармена (клікабельні; офіціанту не показуємо: борги/списання/акциз йому не потрібні) -->
    ${(!isAcc && !isMgr && state.role !== 'waiter') ? (() => {
      const dbt = _mini.debts, ex = _mini.excise, wo = s?.writeoffs?.count ?? 0;
      const cell = (route, big, lbl, sub, col) => `
        <div class="d-tcard" onclick="window.__barops.navigate('${route}')">
          <div class="d-tcard-val" style="color:${col}">${big}</div>
          <div class="d-tcard-lbl">${lbl}</div>
          <div class="d-tcard-sub" style="color:${col}">${sub}</div>
        </div>`;
      return `
    <div class="d-sec" style="padding-top:16px">Моя зміна сьогодні</div>
    ${_loading ? `<div class="d-tcard-row">${[1,2,3].map(()=>'<div class="d-skel" style="height:88px;border-radius:14px"></div>').join('')}</div>` : `
    <div class="d-tcard-row">
      ${cell('debts',    dbt != null ? String(dbt) : '—', 'Борги',    dbt != null ? (dbt > 0 ? 'відкритих' : 'немає') : '—', dbt > 0 ? 'var(--amber)' : 'var(--green)')}
      ${cell('writeoff', String(wo),                      'Списання', wo > 0 ? 'сьогодні' : 'чисто',                      wo > 0 ? 'var(--amber)' : 'var(--text3)')}
      ${cell('excise',   ex != null ? String(ex) : '—',  'Акциз',    ex != null ? (ex > 0 ? 'досканувати' : 'немає') : '—', ex > 0 ? 'var(--red)' : 'var(--green)')}
    </div>`}`;
    })() : ''}

    <!-- Сьогодні · грошовий пульс усього закладу -->
    ${isMgr && s ? (() => {
      const syr      = _syrveStats;
      const syrReady = !!syr;
      const revReady = syrReady && syr.revenue != null;
      const skel     = `<div class="d-skel" style="height:34px;width:60%;border-radius:8px;margin:6px 0 2px"></div>`;
      const posNote  = syr?.posBusy ? 'POS зайнятий · оновіть' : syr?.posOff ? 'POS не підключено' : 'продажі за день';
      const woCount  = s.writeoffs?.count ?? 0;
      const sub = revReady
        ? [syr.checks != null ? `${syr.checks} чеків` : '', syr.avgCheck != null ? `середній ${fmtMoney(syr.avgCheck)}` : ''].filter(Boolean).join(' · ') || 'продажі за день'
        : posNote;
      return `
    <div class="d-sec" style="padding-top:16px">Сьогодні</div>
    <div class="d-today">
      <div class="d-today-lbl">Виторг закладу · сьогодні</div>
      ${revReady ? `<div class="d-today-rev">${fmtMoney(syr.revenue)}</div>`
        : syrReady ? `<div class="d-today-rev" style="color:var(--text2);font-size:24px">—</div>` : skel}
      <div class="d-today-sub">${sub}</div>
      ${revReady && syr.profit != null ? `
      <div class="d-today-money">
        <span style="color:var(--green)">Прибуток ${fmtMoney(syr.profit)}</span>
        ${syr.foodcostPct != null ? `<span class="d-today-fc">Фудкост ${syr.foodcostPct}%</span>` : ''}
        ${woCount > 0 ? `<span class="d-today-wo">Списання ${fmtMoney(s.writeoffs?.total)}</span>` : ''}
      </div>` : ''}
    </div>`;
    })() : ''}

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
          <div class="d-vo-pos">${v.posType === 'syrve' ? '✓ Syrve підключено' : v.posType === 'poster' ? '✓ Poster підключено' : v.posType === 'manual' ? 'Ручний режим' : v.posType}</div>
          ${v.posType === 'manual' ? `
          <div class="d-vo-connect" onclick="event.stopPropagation();window.__dash.editVenue('${v.id}')">
            + Налаштувати POS
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
  // Поки відкрита модалка вибору закладу — не перемальовуємо весь дашборд,
  // інакше фонові завантаження (stats/mini/syrve/заявки) «блимають» модалкою.
  if (_venueSheetOpen) return;
  const v = document.getElementById('app-view');
  if (!v) return;
  // Зберігаємо позицію скролу, щоб фонові оновлення (stats/заявки) не кидали на верх
  const prev = v.querySelector('.d-scroll');
  const top  = prev ? prev.scrollTop : 0;
  v.innerHTML = buildHTML();
  if (top) {
    const next = v.querySelector('.d-scroll');
    if (next) next.scrollTop = top;
  }
}

function partialRender() { fullRender(); }

// Відкриття/закриття — через CSS-клас на наявному оверлеї (без перебудови дашборду = без блимання)
function toggleVenueSheet() {
  _venueSheetOpen = !_venueSheetOpen;
  const ov = document.querySelector('.d-vsheet-ov');
  if (ov) ov.classList.toggle('open', _venueSheetOpen);
  else fullRender();                 // оверлея ще нема в DOM — побудувати
  if (!_venueSheetOpen) fullRender(); // закрили — підтягнути фонові дані, що прийшли поки було відкрито
}
function closeVenueSheet(e) {
  if (!e || e.target.classList.contains('d-vsheet-ov')) {
    _venueSheetOpen = false;
    const ov = document.querySelector('.d-vsheet-ov');
    if (ov) ov.classList.remove('open');
    fullRender();
  }
}

function selectVenue(id, name) {
  _activeVenueId   = id;
  _activeVenueName = name;
  _venueSheetOpen  = false;
  document.querySelector('.d-vsheet-ov')?.classList.remove('open');   // одразу сховати модалку
  state.venue      = name;
  state.venueId    = id;
  localStorage.setItem('barops_venue',   name);
  localStorage.setItem('barops_venueId', id);
  // Скидаємо ВСІ дані попереднього закладу й перезавантажуємо
  _syrveStats = null;
  _mini = { digest: null, checklist: null, playlist: null, tasks: null, debts: null, excise: null };
  _pendingOrders = [];
  _pendingDayoff = [];
  loadStats();
  loadMiniStats();             // міні-показники плиток нового закладу
  loadSyrveStats();            // виторг/прибуток/фудкост нового закладу
  if (isMgrRole()) { loadPendingOrders(); loadPendingDayoff(); }
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
    _syrveStats     = null;
    _mini           = { digest: null, checklist: null, playlist: null, tasks: null, debts: null, excise: null };
    loadSeenNotifs();
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
      clearNotifs,
      toggleVenueSheet,
      closeVenueSheet,
      selectVenue,
      editVenue(id) {
        const v = _venues.find(x => x.id === id);
        _venueSheetOpen = false;
        navigate('venue-edit', { params: { venueId: id, venueName: v ? v.name : '' } });
      },
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
    loadMiniStats();
    if (isMgrRole()) { loadSyrveStats(); loadPendingOrders(); loadPendingDayoff(); }
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
