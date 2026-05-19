/* ============================================================
   BarOps — pages/manager.js
   Панель менеджера: Дашборд / Аналітика / Замовлення / Постачальники
                   / Норми запасів / Налаштування / Заклади
   Мобільна адаптація desktop-дашборду
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API_URL = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   DATA
════════════════════════ */
const REV_DATA  = [28400,32100,41200,35800,48200,52100,38420];
const REV_DAYS  = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

const NORMS_DATA = [
  { emoji:'🌿', name:"Hendrick's Gin",           sup:'Баядера',  min:1.4, desired:4.2, current:0.4, unit:'л' },
  { emoji:'🍊', name:'Aperol 1л',                sup:'Клас І К', min:2.1, desired:8.0, current:3.4, unit:'л' },
  { emoji:'🍷', name:'Campari 0.7л',             sup:'Клас І К', min:1.4, desired:5.6, current:2.1, unit:'л' },
  { emoji:'🥃', name:'Johnnie Walker Black',      sup:'Баядера',  min:2.1, desired:4.9, current:1.2, unit:'л' },
  { emoji:'🌸', name:'Tanqueray Flor de Sevilla', sup:'Баядера',  min:0.7, desired:2.8, current:0.7, unit:'л' },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _section = 'dashboard';
let _revPeriod = '30';
let _venues = [];
let _editingVenue = null;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="mgr-css">
.mgr-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.mgr-scroll{overflow-y:auto;flex:1}.mgr-scroll::-webkit-scrollbar{width:0}

/* hero header */
.mgr-hero{padding:4px 20px 14px;flex-shrink:0}
.mgr-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.mgr-back:active{background:rgba(255,255,255,.08)}
.mgr-notif{position:relative;width:32px;height:32px;background:var(--bg2);border:0.5px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.mgr-ndot{position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:var(--amber);border:1.5px solid var(--bg1)}

/* bottom nav for manager sections */
.mgr-nav{display:flex;gap:2px;padding:6px 10px 10px;background:var(--bg1);border-top:0.5px solid var(--border);flex-shrink:0;overflow-x:auto}
.mgr-nav::-webkit-scrollbar{height:0}
.mgr-nav-item{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 10px;border-radius:10px;cursor:pointer;transition:background .15s;border:none;background:transparent}
.mgr-nav-item:active{background:var(--bg2)}
.mgr-nav-item.act{background:var(--bg2)}
.mgr-nav-lbl{font-size:9px;font-family:var(--font-b);white-space:nowrap}

/* sections */
.mgr-section{display:none;animation:mgrFade .25s ease both}
.mgr-section.act{display:block}
@keyframes mgrFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* sec label */
.mgr-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 20px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.mgr-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* KPI grid */
.mgr-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px 4px}
.mgr-kpi{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px}
.mgr-kpi-eye{font-size:10px;color:var(--text2);letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-b)}
.mgr-kpi-val{font-family:var(--font-h);font-size:26px;font-weight:600;color:var(--text0);line-height:1;letter-spacing:-.03em;margin-top:6px}
.mgr-kpi-unit{font-size:12px;color:var(--text2);font-weight:400}
.mgr-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:5px}
.mgr-kpi-delta{font-size:11px;font-family:var(--font-b);margin-top:4px}

/* alerts */
.mgr-alert{border-radius:12px;padding:11px 14px;display:flex;align-items:flex-start;gap:10px;font-size:12px;font-family:var(--font-b);line-height:1.5;margin:0 14px 8px;cursor:pointer;transition:filter .15s}
.mgr-alert:active{filter:brightness(.9)}
.mgr-alert.amber{background:var(--amber-bg);border:1px solid var(--amber-border);color:var(--amber)}
.mgr-alert.red{background:var(--red-bg);border:1px solid var(--red-border);color:var(--red)}
.mgr-alert-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* chart */
.mgr-chart-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px}
.mgr-cc-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.mgr-cc-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.mgr-period-tabs{display:flex;gap:2px;background:var(--bg3);border-radius:7px;padding:2px}
.mgr-pt{font-size:10px;padding:3px 8px;border-radius:6px;border:none;background:transparent;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.mgr-pt.act{background:var(--bg4);color:var(--text0)}
.mgr-bars{display:flex;align-items:flex-end;gap:4px;height:70px;margin-bottom:6px}
.mgr-bar{flex:1;border-radius:3px 3px 0 0;min-width:0;cursor:pointer;transition:opacity .15s}
.mgr-bar:hover{opacity:.8}
.mgr-bar-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);text-align:center}
.mgr-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}
.mgr-cl{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2);font-family:var(--font-b)}
.mgr-cl-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}

/* mini card grids */
.mgr-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px 4px}
.mgr-mini-card{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:12px}
.mgr-mini-title{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-b);margin-bottom:8px}
.mgr-mini-val{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);line-height:1}
.mgr-mini-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px}
.mgr-mini-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:7px;overflow:hidden}
.mgr-mini-fill{height:100%;border-radius:2px}

/* table-style rows */
.mgr-table-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.mgr-tr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s}
.mgr-tr:last-child{border-bottom:none}
.mgr-tr:active{background:rgba(255,255,255,.08)}
.mgr-tr-ico{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.mgr-tr-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.mgr-tr-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.mgr-tr-val{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right;flex-shrink:0}
.mgr-tr-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}
.mgr-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:10px;font-family:var(--font-b)}

/* norms form */
.mgr-norm-row{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border)}
.mgr-norm-row:last-child{border-bottom:none}
.mgr-norm-emoji{font-size:16px;flex-shrink:0}
.mgr-norm-name{font-size:12px;color:var(--text1);font-family:var(--font-b);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mgr-norm-inp{width:52px;height:32px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:7px;padding:0 6px;font-size:12px;color:var(--text0);font-family:var(--font-b);outline:none;text-align:center}
.mgr-norm-inp:focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-bg)}
.mgr-norm-curr{font-family:var(--font-h);font-size:12px;font-weight:700;min-width:36px;text-align:right}

/* settings */
.mgr-setting-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border)}
.mgr-setting-row:last-child{border-bottom:none}
.mgr-setting-lbl{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.mgr-setting-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.mgr-toggle{width:36px;height:20px;border-radius:10px;background:var(--bg4);border:0.5px solid var(--border);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.mgr-toggle.on{background:var(--green);border-color:var(--green)}
.mgr-toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.mgr-toggle.on .mgr-toggle-knob{left:18px}

/* venues */
.mgr-venue-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px}
.mgr-venue-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.mgr-venue-icon{width:40px;height:40px;border-radius:12px;background:var(--green-bg);border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:20px}
.mgr-venue-info{flex:1}
.mgr-venue-name{font-size:15px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.mgr-venue-pos{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.mgr-venue-edit{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.mgr-venue-edit:active{background:var(--bg4)}
.mgr-venue-topic{font-size:12px;color:var(--text2);font-family:var(--font-b);padding:8px 12px;background:var(--bg3);border-radius:8px;margin-top:8px}
.mgr-venue-topic strong{color:var(--green)}
.mgr-venue-actions{display:flex;gap:8px;margin-top:10px}
.mgr-venue-btn{flex:1;height:40px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg3);font-size:12px;font-family:var(--font-b);color:var(--text1);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
.mgr-venue-btn:active{background:var(--bg4)}
.mgr-venue-btn.green{background:var(--green);border-color:var(--green);color:#000}

/* modal */
.mgr-modal-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;padding:0 14px 24px}
.mgr-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 28px);max-width:380px;background:var(--bg1);border:0.5px solid var(--border);border-radius:20px;padding:20px;z-index:301}
.mgr-modal-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:16px}
.mgr-modal-label{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}
.mgr-modal-input{width:100%;height:48px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;margin-bottom:14px;box-sizing:border-box}
.mgr-modal-input:focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-bg)}
.mgr-modal-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:16px;line-height:1.5}
.mgr-modal-actions{display:flex;gap:10px}
.mgr-modal-btn{flex:1;height:48px;border-radius:12px;border:none;font-size:14px;font-family:var(--font-h);font-weight:500;cursor:pointer}
.mgr-modal-btn.cancel{background:var(--bg3);color:var(--text1)}
.mgr-modal-btn.save{background:var(--green);color:#000}

/* action buttons */
.mgr-btn{width:100%;height:50px;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.mgr-btn-green{background:var(--green);color:#000}
.mgr-btn-green:active{opacity:.85}
.mgr-btn-ghost{background:var(--bg2);border:0.5px solid var(--border);color:var(--text1)}
.mgr-btn-ghost:active{background:rgba(255,255,255,.08)}

/* live dot */
.mgr-live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:mgrPulse 1.8s ease-in-out infinite}
@keyframes mgrPulse{0%,100%{opacity:1}50%{opacity:.3}}
</style>`;

/* ════════════════════════
   NAV BAR
════════════════════════ */
function navHTML() {
  const items = [
    { id:'dashboard', icon:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="5" height="6" rx="1" fill="currentColor" opacity=".7"/><rect x="9" y="2" width="5" height="12" rx="1" fill="currentColor"/></svg>`, lbl:'Дашборд' },
    { id:'analytics', icon:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 11l3-4 3 2 3-4 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`, lbl:'Аналіт.' },
    { id:'team',      icon:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="6" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 14c0-2.2 1.8-4 4-4M9 14c0-2.2 1.8-4 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`, lbl:'Команда' },
    { id:'venues',    icon:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 6l6-4 6 4v8H2V6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 14V9h4v5" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`, lbl:'Заклади' },
    { id:'settings',  icon:`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`, lbl:'Налашт.' },
  ];
  return `<div class="mgr-nav">
    ${items.map(item => `
    <button class="mgr-nav-item ${_section===item.id?'act':''}"
            style="color:${_section===item.id?'var(--green)':'var(--text2)'}"
            onclick="window.__mgr.setSection('${item.id}')">
      ${item.icon}
      <span class="mgr-nav-lbl">${item.lbl}</span>
    </button>`).join('')}
  </div>`;
}

/* ════════════════════════
   SECTION: DASHBOARD
════════════════════════ */
function sectionDashboard() {
  const maxRev = Math.max(...REV_DATA);

  const ALERTS = [
    { lbl: 'Норми запасів · 5 позицій нижче норми', tag: 'критично',    col: 'var(--red)',   route: 'inventory'   },
    { lbl: 'Алерт ціни · JW Black +18%',            tag: 'ціна',        col: 'var(--amber)', route: 'price-alert' },
    { lbl: 'Інвентаризація запланована на Чт 22:00', tag: 'нагадування', col: 'var(--green)', route: 'inventory'   },
  ];

  const KPIS = [
    { lbl: 'Виручка тиждень', val: '142', unit: 'тис ₴', delta: '+18%',  dCol: 'var(--green)' },
    { lbl: 'Середній чек',    val: '485', unit: '₴',     delta: '+4%',   dCol: 'var(--green)' },
    { lbl: 'Фудкост середній',val: '18.4',unit: '%',     delta: '+0.6%', dCol: 'var(--amber)' },
    { lbl: 'Запас (днів)',    val: '12',  unit: 'днів',  delta: 'норма', dCol: 'var(--text2)' },
  ];

  const SECTIONS = [
    { lbl: 'Аналітика',      sub: 'FC · виручка', icon: '◴', section: 'analytics' },
    { lbl: 'Замовлення',     sub: '3 в роботі',   icon: '☷', route: 'ordering'    },
    { lbl: 'Норми запасів',  sub: '47 позицій',   icon: '◫', section: 'norms'     },
    { lbl: 'Заклади',        sub: '4 локації',    icon: '◉', section: 'venues'    },
  ];

  return `
  <!-- Flat alerts -->
  <div style="display:flex;flex-direction:column;gap:6px;padding:0 20px 16px">
    ${ALERTS.map(a => `
    <div onclick="window.__barops.navigate('${a.route}')" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;cursor:pointer">
      <span style="width:7px;height:7px;border-radius:50%;background:${a.col};flex-shrink:0"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--text0)">${a.lbl}</div>
        <div style="font-size:10px;color:${a.col};margin-top:2px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-b)">${a.tag}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
    </div>`).join('')}
  </div>

  <!-- KPI 2×2 -->
  <div class="mgr-kpi-grid" style="margin-bottom:16px">
    ${KPIS.map(k => `
    <div class="mgr-kpi">
      <div class="mgr-kpi-eye">${k.lbl}</div>
      <div style="display:flex;align-items:baseline;gap:5px;margin-top:6px">
        <span class="mgr-kpi-val">${k.val}</span>
        <span class="mgr-kpi-unit">${k.unit}</span>
      </div>
      <div class="mgr-kpi-delta" style="color:${k.dCol}">${k.delta}</div>
    </div>`).join('')}
  </div>

  <!-- Revenue chart -->
  <div class="mgr-sec" style="padding-top:0">Виручка · 7 днів</div>
  <div style="padding:14px 16px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;margin:0 20px 16px">
    <div class="mgr-bars">
      ${REV_DATA.map((v,i) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
        <div class="mgr-bar" style="height:${Math.round(v/maxRev*100)}%;background:${i===6?'var(--green)':'var(--bg3)'}"></div>
        <div class="mgr-bar-lbl" style="color:${i===6?'var(--green)':'var(--text3)'}">${REV_DAYS[i]}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Sections 2×2 -->
  <div class="mgr-sec" style="padding-top:0">Розділи</div>
  <div class="mgr-mini-grid" style="padding-bottom:20px">
    ${SECTIONS.map(s => `
    <div onclick="${s.route ? `window.__barops.navigate('${s.route}')` : `window.__mgr.setSection('${s.section}')`}"
         style="padding:16px 14px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;cursor:pointer">
      <div style="font-size:26px;color:var(--green);margin-bottom:8px">${s.icon}</div>
      <div style="font-size:13px;font-weight:500;color:var(--text0)">${s.lbl}</div>
      <div style="font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)">${s.sub}</div>
    </div>`).join('')}
  </div>`;
}

/* ════════════════════════
   SECTION: ANALYTICS
════════════════════════ */
function sectionAnalytics() {
  return `
  <div class="mgr-kpi-grid" style="padding-top:14px">
    <div class="mgr-kpi g"><div class="mgr-kpi-eye">Виручка · місяць</div><div class="mgr-kpi-val">812k ₴</div><div class="mgr-kpi-delta" style="color:var(--green)">↑ +8.2%</div></div>
    <div class="mgr-kpi a"><div class="mgr-kpi-eye">Середній чек</div><div class="mgr-kpi-val">348 ₴</div><div class="mgr-kpi-delta" style="color:var(--green)">↑ +14 ₴</div></div>
    <div class="mgr-kpi p"><div class="mgr-kpi-eye">Кількість продажів</div><div class="mgr-kpi-val">2 334</div><div class="mgr-kpi-delta" style="color:var(--green)">↑ +127</div></div>
    <div class="mgr-kpi t"><div class="mgr-kpi-eye">Оборотність запасів</div><div class="mgr-kpi-val">14.2</div><div class="mgr-kpi-sub">дні · норма ≤18</div></div>
  </div>

  <div class="mgr-sec" style="padding-top:14px">ABC-аналіз запасів</div>
  <div class="mgr-table-card">
    ${[['A','8','70%','var(--green)','Постійний моніторинг'],['B','12','20%','var(--amber)','Тижневий огляд'],['C','18','10%','var(--text2)','Місячний огляд']].map(([cat,cnt,pct,col,str]) => `
    <div class="mgr-tr">
      <div style="width:24px;height:24px;border-radius:7px;background:${col}22;border:0.5px solid ${col}44;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:12px;font-weight:700;color:${col};flex-shrink:0">${cat}</div>
      <div style="flex:1;min-width:0">
        <div class="mgr-tr-name">${cnt} позицій</div>
        <div class="mgr-tr-meta">${str}</div>
      </div>
      <div class="mgr-tr-val" style="color:${col}">${pct}</div>
    </div>`).join('')}
  </div>

  <div class="mgr-sec">Виручка по днях тижня</div>
  <div class="mgr-chart-card">
    <div class="mgr-bars">
      ${[62,48,71,55,83,90,20].map((h,i) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
        <div class="mgr-bar" style="height:${h}%;background:var(--green);opacity:${i===5?1:.6}"></div>
        <div class="mgr-bar-lbl">${REV_DAYS[i]}</div>
      </div>`).join('')}
    </div>
  </div>
  <div style="height:14px"></div>`;
}

/* ════════════════════════
   SECTION: TEAM
════════════════════════ */
function sectionTeam() {
  const team = [
    { name:'Олексій Коваленко', role:'Бармен · Вечірня', emoji:'🧑', pct:94, badge:'Топ перформер', badgeColor:'var(--green)', live:true  },
    { name:'Марія Петренко',    role:'Бармен · Денна',   emoji:'👩', pct:100,badge:'Акуратність',    badgeColor:'var(--purple)',live:false },
    { name:'Дмитро Іванець',    role:'Бармен · Нічна',   emoji:'🧔', pct:67, badge:'Потребує уваги', badgeColor:'var(--amber)', live:false },
  ];
  return `
  <div style="height:14px"></div>
  ${team.map(t => `
  <div class="mgr-table-card" style="margin-bottom:8px">
    <div class="mgr-tr" style="cursor:default">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--bg3);border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${t.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="mgr-tr-name" style="font-size:14px;font-weight:600">${t.name}</div>
        <div class="mgr-tr-meta">
          ${t.live ? `<span style="color:var(--green);display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);animation:mgrPulse 1.8s ease-in-out infinite"></span>Активна зміна</span>` : t.role}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:${t.pct===100?'var(--green)':t.pct>=80?'var(--text0)':'var(--amber)'}">${t.pct}%</div>
        <div style="font-size:10px;color:var(--text2);font-family:var(--font-b)">задач</div>
      </div>
    </div>
    <div style="padding:10px 14px;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div class="mgr-badge" style="background:${t.badgeColor}22;border:0.5px solid ${t.badgeColor}44;color:${t.badgeColor}">${t.badge}</div>
      <div style="height:4px;width:120px;background:var(--bg3);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${t.pct}%;border-radius:2px;background:${t.pct===100?'var(--green)':t.pct>=80?'var(--green)':'var(--amber)'}"></div>
      </div>
    </div>
  </div>`).join('')}
  <div style="padding:0 14px 14px">
    <button class="mgr-btn mgr-btn-green" onclick="navigate('team')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Запросити бармена
    </button>
  </div>`;
}

/* ════════════════════════
   SECTION: NORMS
════════════════════════ */
function sectionNorms() {
  return `
  <div class="mgr-sec" style="padding-top:14px">Норми запасів</div>
  <div class="mgr-table-card">
    ${NORMS_DATA.map(p => {
      const col = p.current < p.min ? 'var(--red)' : p.current < p.desired * 0.5 ? 'var(--amber)' : 'var(--green)';
      return `
      <div class="mgr-norm-row">
        <div class="mgr-norm-emoji">${p.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="mgr-norm-name">${p.name}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${p.sup}</div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <input class="mgr-norm-inp" type="number" step="0.1" value="${p.min}" title="Мін."/>
          <span style="font-size:10px;color:var(--text2)">/</span>
          <input class="mgr-norm-inp" type="number" step="0.1" value="${p.desired}" title="Бажаний"/>
          <div class="mgr-norm-curr" style="color:${col}">${p.current}л</div>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div style="padding:8px 14px 0;display:flex;flex-direction:column;gap:8px">
    <button class="mgr-btn mgr-btn-green" onclick="alert('Норми збережено!')">Зберегти всі норми</button>
    <button class="mgr-btn mgr-btn-ghost">+ Додати товар</button>
  </div>
  <div style="height:14px"></div>`;
}

/* ════════════════════════
   SECTION: VENUES (НОВЕ)
════════════════════════ */
async function loadVenues() {
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`${API_URL}/api/venues`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data.success) {
      _venues = data.venues || [];
    }
  } catch (err) {
    console.error('[Manager] loadVenues error:', err);
  }
}

function sectionVenues() {
  if (_venues.length === 0) {
    loadVenues().then(() => {
      if (_section === 'venues') {
        const view = document.getElementById('app-view');
        if (view) view.innerHTML = buildHTML();
      }
    });
  }

  return `
  <div style="height:14px"></div>
  
  ${!_editingVenue ? `
  <!-- Список закладів -->
  ${_venues.map(v => `
  <div class="mgr-venue-card">
    <div class="mgr-venue-header">
      <div class="mgr-venue-icon">🏪</div>
      <div class="mgr-venue-info">
        <div class="mgr-venue-name">${v.name}</div>
        <div class="mgr-venue-pos">${v.posType || 'Manual'} · ${v.id.slice(0,8)}</div>
      </div>
      <div class="mgr-venue-edit" onclick="window.__mgr.editVenue('${v.id}')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 14l2-2 8-8 2 2-8 8-2 2H2v-2z" stroke="var(--text1)" stroke-width="1.3" stroke-linejoin="round"/>
          <path d="M10 4l2 2" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
    ${v.telegramTopicId ? `
    <div class="mgr-venue-topic">
      📱 Telegram: <strong>Топік #${v.telegramTopicId} підключено</strong> · Акцизні фото → правильний чат
    </div>
    ` : `
    <div class="mgr-venue-topic" style="color:var(--amber)">
      ⚠️ Telegram топік не налаштовано — фото будуть в загальний чат
    </div>
    `}
  </div>
  `).join('')}
  
  <div style="padding:8px 14px 14px">
    <button class="mgr-btn mgr-btn-green" onclick="window.__mgr.createVenue()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Додати заклад
    </button>
  </div>
  ` : `
  <!-- Форма редагування/створення -->
  <div style="padding:0 14px 14px">
    <div class="mgr-modal-title">${_editingVenue.id ? 'Редагувати заклад' : 'Новий заклад'}</div>
    
    <div class="mgr-modal-label">Назва закладу</div>
    <input class="mgr-modal-input" id="venue-name" type="text" value="${_editingVenue.name || ''}" placeholder="Наприклад: Test Bar">
    
    <div class="mgr-modal-label">Telegram Topic ID</div>
    <input class="mgr-modal-input" id="venue-topic" type="text" value="${_editingVenue.telegramTopicId || ''}" placeholder="Наприклад: 1966">
    <div class="mgr-modal-hint">
      Відкрий топік у Telegram Web → скопіюй число з URL після _<br>
      Приклад: https://t.me/c/1234567890/<strong>1966</strong>
    </div>
    
    <div class="mgr-modal-actions">
      <button class="mgr-modal-btn cancel" onclick="window.__mgr.cancelEdit()">Скасувати</button>
      <button class="mgr-modal-btn save" onclick="window.__mgr.saveVenue()">Зберегти</button>
    </div>
  </div>
  `}
  
  <div style="height:14px"></div>`;
}

/* ════════════════════════
   SECTION: SETTINGS
════════════════════════ */
function sectionSettings() {
  const TOGGLES = [
    { lbl:'Poster POS', sub:'Підключено · Синхронізація активна', on:true  },
    { lbl:'iiko',        sub:'Не підключено',                      on:false },
    { lbl:'R-Keeper',    sub:'Не підключено',                      on:false },
  ];
  const posTypeMap = { manual:'✋ Вручну', poster:'🍃 Poster', syrve:'🔗 Syrve', rkeeper:'⚙️ R-Keeper' };
  const posType = localStorage.getItem('barops_venue_pos') || 'manual';
  const posConnected = localStorage.getItem('barops_iiko_connected') === 'true' || localStorage.getItem('barops_pos_connected') === 'true';
  const posInfo = {
    name: posTypeMap[posType] || '✋ Вручну',
    icon: '',
    connected: posConnected,
  };

  const NOTIF = [
    { lbl:'Ціновий алерт (накладна)',    on:true  },
    { lbl:'Низький залишок',             on:true  },
    { lbl:'Заявка на замовлення',        on:true  },
    { lbl:'Список на закриття зміни',    on:true  },
    { lbl:'Обладнання (прострочення)',   on:false },
  ];
  return `
  <div class="mgr-sec" style="padding-top:14px">POS Інтеграція</div>
  <div class="mgr-table-card" style="margin-bottom:8px">
    <div class="mgr-setting-row">
      <div>
        <div class="mgr-setting-lbl">${posInfo.icon} ${posInfo.name}</div>
        <div class="mgr-setting-sub" style="color:${posInfo.connected?'var(--green)':'var(--text2)'}">
          ${posInfo.connected ? '● Підключено · Синхронізація активна' : '○ Не підключено'}
        </div>
      </div>
      <button onclick="window.__barops.navigate('venue-edit')"
        style="height:30px;padding:0 12px;border-radius:8px;border:0.5px solid var(--border);background:var(--bg3);font-size:11px;color:var(--text1);cursor:pointer;font-family:var(--font-b);white-space:nowrap">
        ${posInfo.connected ? 'Налаштування' : 'Підключити'}
      </button>
    </div>
  </div>

  <div class="mgr-sec">Сповіщення</div>
  <div class="mgr-table-card" style="margin-bottom:8px">
    ${NOTIF.map(n => `
    <div class="mgr-setting-row">
      <div class="mgr-setting-lbl">${n.lbl}</div>
      <div class="mgr-toggle ${n.on?'on':''}" onclick="this.classList.toggle('on');this.querySelector('.mgr-toggle-knob').style.left=this.classList.contains('on')?'18px':'2px'">
        <div class="mgr-toggle-knob" style="left:${n.on?18:2}px"></div>
      </div>
    </div>`).join('')}
  </div>

  <div class="mgr-sec">FC Ліміти</div>
  <div class="mgr-table-card" style="margin-bottom:14px">
    ${[['Норма FC (зелена зона)','18'],['Ліміт FC (жовта зона)','22'],['Критичний поріг (червона)','28']].map(([lbl,val]) => `
    <div class="mgr-setting-row">
      <div class="mgr-setting-lbl">${lbl}</div>
      <input style="width:60px;height:32px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:7px;padding:0 8px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;text-align:center" type="number" value="${val}" step="0.5"/>
    </div>`).join('')}
  </div>
  <div style="padding:0 14px 14px">
    <button class="mgr-btn mgr-btn-green" onclick="alert('Налаштування збережено!')">Зберегти налаштування</button>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function sectionContent() {
  switch (_section) {
    case 'dashboard': return sectionDashboard();
    case 'analytics': return sectionAnalytics();
    case 'team':      return sectionTeam();
    case 'norms':     return sectionNorms();
    case 'venues':    return sectionVenues();
    case 'settings':  return sectionSettings();
    default:          return sectionDashboard();
  }
}

const SECTION_TITLES = {
  dashboard: 'Дашборд',
  analytics: 'Аналітика',
  team:      'Команда',
  norms:     'Норми запасів',
  venues:    'Заклади',
  settings:  'Налаштування',
};

function buildHTML() {
  const isDashboard = _section === 'dashboard';
  return `
${CSS}
<div class="mgr-wrap">
  <!-- Hero header -->
  <div class="mgr-hero">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="mgr-back" onclick="window.__barops.navigate('dashboard')" title="Назад">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="padding:7px 12px;border-radius:10px;background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green);font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px;font-family:var(--font-b)">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0"></span>
          Bar Noir
        </div>
        <div class="mgr-notif">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a4.5 4.5 0 00-4.5 4.5c0 5-2 6.5-2 6.5H13s-2-1.5-2-6.5A4.5 4.5 0 007 1.5z" stroke="var(--text1)" stroke-width="1.2" stroke-linecap="round"/><path d="M8.5 12a1.7 1.7 0 01-3 0" stroke="var(--text1)" stroke-width="1.2" stroke-linecap="round"/></svg>
          <div class="mgr-ndot"></div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Менеджер${isDashboard ? '' : ' · ' + SECTION_TITLES[_section]}</div>
    <div style="font-family:var(--font-h);font-size:22px;font-weight:600;letter-spacing:-0.025em;line-height:1.2">
      ${isDashboard ? `Усе під <span style="color:var(--green)">контролем</span>.` : SECTION_TITLES[_section]}
    </div>
  </div>

  <!-- Section content -->
  <div class="mgr-scroll" id="mgr-content">
    ${sectionContent()}
  </div>

  <!-- Bottom nav -->
  ${navHTML()}
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function setSection(id) {
  _section = id;
  if (id === 'venues') loadVenues();
  fullRender();
}
function setRevPeriod(p) {
  _revPeriod = p;
  fullRender();
}

function editVenue(id) {
  const venue = _venues.find(v => v.id === id);
  if (!venue) return;
  _editingVenue = { ...venue };
  fullRender();
}

function createVenue() {
  _editingVenue = { id: null, name: '', telegramTopicId: '' };
  fullRender();
}

function cancelEdit() {
  _editingVenue = null;
  fullRender();
}

async function saveVenue() {
  const name = document.getElementById('venue-name')?.value?.trim();
  const topicId = document.getElementById('venue-topic')?.value?.trim();
  
  if (!name) {
    alert('Вкажіть назву закладу');
    return;
  }

  try {
    const token = localStorage.getItem('barops_token');
    const url = `${API_URL}/api/venues${_editingVenue.id ? `/${_editingVenue.id}` : ''}`;
    const method = _editingVenue.id ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        telegramTopicId: topicId || null,
      }),
    });

    const data = await res.json();
    
    if (data.success) {
      _editingVenue = null;
      await loadVenues();
      fullRender();
    } else {
      alert(data.error || 'Помилка збереження');
    }
  } catch (err) {
    console.error('[Manager] saveVenue error:', err);
    alert('Мережева помилка');
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _section   = 'dashboard';
    _revPeriod = '30';
    _editingVenue = null;
    return buildHTML();
  },
  init() {
    window.__mgr = { setSection, setRevPeriod, editVenue, createVenue, cancelEdit, saveVenue };
  },
};