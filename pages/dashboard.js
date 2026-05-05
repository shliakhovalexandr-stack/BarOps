/* ============================================================
   BarOps — pages/dashboard.js
   Головний дашборд: бармен + менеджер
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const QUICK_BARTENDER = [
  { route:'ocr',       primary:true,  badge:null, label:'Накладна',    sub:'OCR-сканування',
    color:'#0c2018', iconColor:'#1D9E75',
    svg:`<rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M5 7h1m2 0h1m2 0h1M5 10h1m2 0h1m2 0h1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M6 2h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'inventory', primary:false, badge:null, label:'Інвентар',    sub:'Облік залишків',
    color:'#12102a', iconColor:'#7F77DD',
    svg:`<rect x="2" y="2" width="4" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
         <rect x="8" y="5" width="4" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
         <rect x="14" y="8" width="3" height="8"  rx="1.5" stroke="currentColor" stroke-width="1.3"/>` },
  { route:'writeoff',  primary:false, badge:'3',  label:'Списання',    sub:'Псування · Бій',
    color:'#1f0808', iconColor:'#E24B4A',
    svg:`<path d="M3 14l2-2 7-7 2 2-7 7-2 2H3v-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
         <path d="M10 5l2 2" stroke="currentColor" stroke-width="1.3"/>` },
  { route:'shift-log', primary:false, badge:null, label:'Журнал',      sub:'Нотатки зміни',
    color:'#0d1a0d', iconColor:'#1D9E75',
    svg:`<circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.3"/>
         <path d="M9 6v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
];

const QUICK_MANAGER = [
  { route:'manager',   primary:true,  badge:null, label:'Аналітика',      sub:'Звіти · Тренди',
    color:'#12102a', iconColor:'#7F77DD',
    svg:`<path d="M3 13l3-4 3 2 3-5 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M3 15h13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'team',      primary:false, badge:null, label:'Команда',         sub:'Ролі · Доступ',
    color:'#0c2018', iconColor:'#1D9E75',
    svg:`<circle cx="6" cy="7" r="2.5" stroke="currentColor" stroke-width="1.3"/>
         <circle cx="12" cy="7" r="2.5" stroke="currentColor" stroke-width="1.3"/>
         <path d="M2 14c0-2.5 2-4 4-4M10 14c0-2.5 2-4 4-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'ordering',  primary:false, badge:'1',  label:'Замовлення',      sub:'Заявка бармена',
    color:'#1f0f08', iconColor:'#EF9F27',
    svg:`<path d="M3 12h3v3H3zM7 8h3v7H7zM11 5h3v10h-3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/>` },
  { route:'recipes',   primary:false, badge:null, label:'Рецепти',         sub:'Живий фудкост',
    color:'#0a0a14', iconColor:'#7F77DD',
    svg:`<rect x="2" y="3" width="13" height="11" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/>
         <path d="M5 7h7M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
         <path d="M12 10l4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
];

const KPI_BARTENDER = [
  { val:'94%',   lbl:'Точність\nOCR',      cls:'g', delta:'+2% vs вчора'   },
  { val:'3',     lbl:'Списань\nсьогодні',  cls:'a', delta:'2 бій · 1 псув.' },
  { val:'12',    lbl:'Накладних\nзміна',   cls:'',  delta:'24 320 ₴'        },
];
const KPI_MANAGER = [
  { val:'38.4k', lbl:'Виручка\n₴',        cls:'g', delta:'+12% вчора'      },
  { val:'21.4%', lbl:'Foodcost\nзміна',   cls:'a', delta:'Норма ≤22%'       },
  { val:'3',     lbl:'Алертів\nактивних', cls:'r', delta:'2 ціна · 1 запас' },
];

const INVENTORY_ITEMS = [
  { emoji:'🌿', name:"Hendrick's Gin",       norm:'≥ 0.7л', qty:'0.4', color:'var(--red)',   pct:20 },
  { emoji:'🥃', name:'Johnnie Walker Black', norm:'≥ 2.1л', qty:'1.2', color:'var(--amber)', pct:40 },
  { emoji:'🍊', name:'Aperol',               norm:'≥ 2.1л', qty:'3.4', color:'var(--green)', pct:82 },
];

const ACTIVITY = [
  { route:'price-alert', bg:'rgba(239,159,39,.1)', val:'+18%',  vcolor:'var(--amber)',
    name:'Ціна Johnnie Walker ↑ 18%',  meta:'Накладна №2841 · Campari UA', time:'19:34',
    icon:`<path d="M8 1L15 13H1L8 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/>` },
  { route:'ocr',         bg:'var(--green-bg)',     val:'+14',   vcolor:'var(--green)',
    name:'Накладна №2841 збережена',    meta:'Campari UA · 14 позицій · 24 320 ₴', time:'19:34',
    icon:`<rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--green)" stroke-width="1.2"/>
          <path d="M4 6h8M4 9h5" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round"/>` },
  { route:'writeoff',    bg:'var(--red-bg)',       val:'−0.7л', vcolor:'var(--red)',
    name:"Hendrick's Gin · Бій",        meta:'Списання · Розбита пляшка', time:'18:52',
    icon:`<path d="M3 13l2-2 6-6 2 2-6 6-2 2H3v-2z" stroke="var(--red)" stroke-width="1.2" stroke-linejoin="round"/>` },
  { route:'shift-log',   bg:'var(--purple-bg)',    val:'18:00', vcolor:'var(--purple)',
    name:'Зміна розпочата',             meta:'Олексій · Sky Lounge', time:'18:00',
    icon:`<circle cx="8" cy="8" r="5" stroke="var(--purple)" stroke-width="1.2"/>
          <path d="M8 6v2.5l1.5 1" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/>` },
];

/* ════════════════════════
   SCOPED CSS
════════════════════════ */
const CSS = `<style id="dash-css">
.d-scroll{overflow-y:auto;flex:1}.d-scroll::-webkit-scrollbar{width:0}

/* header */
.d-header{padding:8px 20px 14px}
.d-venue-row{display:flex;justify-content:space-between;align-items:flex-start}
.d-venue-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.04em;margin-bottom:3px}
.d-venue-name{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.d-notif-btn{width:38px;height:38px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;position:relative}
.d-notif-btn:active{background:var(--bg3)}
.d-notif-badge{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;
  background:var(--amber);border:1.5px solid var(--bg1)}
.d-shift-row{display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}
.d-pill{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 12px;
  font-size:11px;font-family:var(--font-b);background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.d-pill--mgr{background:var(--purple-bg);border-color:var(--purple-border);color:var(--purple)}
.d-pill-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:dpulse 2s ease-in-out infinite}
.d-pill-dot--mgr{background:var(--purple)}
@keyframes dpulse{0%,100%{opacity:1}50%{opacity:.35}}
.d-shift-time{font-size:11px;color:var(--text2);font-family:var(--font-b)}

/* alerts */
.d-alert{margin:0 14px 6px;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:filter .15s}
.d-alert:active{filter:brightness(.9)}
.d-alert--amber{background:rgba(239,159,39,.08);border:0.5px solid var(--amber-border)}
.d-alert--red{background:rgba(226,75,74,.08);border:0.5px solid var(--red-border)}
.d-alert-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-alert-icon--amber{background:rgba(239,159,39,.12)}
.d-alert-icon--red{background:rgba(226,75,74,.12)}
.d-alert-title{font-size:13px;font-weight:500;font-family:var(--font-b)}
.d-alert-title--amber{color:var(--amber)}
.d-alert-title--red{color:var(--red)}
.d-alert-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* sec label */
.d-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;
  padding:14px 20px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.d-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b);padding:0}

/* quick grid */
.d-quick{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px}
.d-qbtn{background:var(--bg2);border:0.5px solid var(--border);border-radius:18px;padding:16px 14px 14px;
  cursor:pointer;display:flex;flex-direction:column;gap:10px;min-height:92px;
  transition:all .18s;text-align:left;position:relative;overflow:hidden}
.d-qbtn::before{content:'';position:absolute;inset:0;background:rgba(255,255,255,.03);opacity:0;transition:opacity .15s}
.d-qbtn:hover::before{opacity:1}
.d-qbtn:active{transform:scale(.97)}
.d-qbtn--primary{background:rgba(29,158,117,.08);border-color:var(--green-border)}
.d-qbtn-icon{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-qbtn-label{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);line-height:1.2}
.d-qbtn-sub{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-qbtn-badge{position:absolute;top:12px;right:12px;background:var(--red);border-radius:20px;
  padding:2px 7px;font-size:10px;color:#fff;font-family:var(--font-h);font-weight:600}

/* kpi */
.d-kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px}
.d-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;
  padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.d-kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 13px 13px}
.d-kpi--g::after{background:var(--green)}.d-kpi--a::after{background:var(--amber)}.d-kpi--r::after{background:var(--red)}
.d-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.d-kpi-val--g{color:var(--green)}.d-kpi-val--a{color:var(--amber)}.d-kpi-val--r{color:var(--red)}
.d-kpi-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;line-height:1.3}
.d-kpi-delta{font-size:10px;margin-top:3px;font-family:var(--font-b)}

/* shift progress */
.d-shift-card{margin:0 14px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.d-shift-card-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.d-shift-card-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.d-shift-card-time{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.d-prog{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:6px}
.d-prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--green),var(--green-l));transition:width .6s ease}
.d-prog-lbls{display:flex;justify-content:space-between;font-size:10px;color:var(--text2);font-family:var(--font-b)}

/* mgr widgets */
.d-mgr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px}
.d-mgr-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px}
.d-mgr-card-title{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-b);margin-bottom:10px}
.d-mgr-num{font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--text0);line-height:1}
.d-mgr-sub{font-size:11px;color:var(--text2);margin-top:4px;font-family:var(--font-b)}
.d-bars{display:flex;align-items:flex-end;gap:3px;height:40px;margin-top:8px}
.d-bar{flex:1;border-radius:3px 3px 0 0;background:var(--bg3);position:relative;overflow:hidden;min-width:0}
.d-bar-fill{position:absolute;bottom:0;left:0;right:0;border-radius:3px 3px 0 0;background:var(--green);opacity:.65}
.d-bar--today .d-bar-fill{opacity:1}
.d-top-items{display:flex;flex-direction:column;gap:5px}
.d-top-item{display:flex;align-items:center;gap:6px}
.d-top-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.d-top-name{font-size:11px;color:var(--text1);flex:1;font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-top-val{font-size:11px;font-family:var(--font-h);color:var(--text2)}

/* inventory */
.d-inv-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.d-inv-row{background:var(--bg2);border-radius:12px;padding:10px 13px;
  display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .12s}
.d-inv-row:active{background:var(--bg3)}
.d-inv-bar{width:4px;height:36px;border-radius:2px;flex-shrink:0}
.d-inv-emoji{width:32px;height:32px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
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
.d-act-item:active{background:var(--bg2)}
.d-act-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.d-act-name{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-act-meta{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-act-val{font-family:var(--font-h);font-size:14px;font-weight:600;text-align:right}
.d-act-time{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.d-act-div{height:0.5px;background:var(--bg3);margin:0 20px}

/* notif panel */
.d-notif-panel{position:absolute;top:60px;right:20px;width:280px;background:var(--bg2);
  border:0.5px solid var(--border2);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.5);
  z-index:50;display:none;animation:dDrop .2s cubic-bezier(.22,1,.36,1)}
.d-notif-panel.open{display:block}
@keyframes dDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.d-notif-hdr{padding:12px 16px 10px;border-bottom:0.5px solid var(--border);
  display:flex;justify-content:space-between;align-items:center}
.d-notif-ttl{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.d-notif-clr{font-size:11px;color:var(--green);cursor:pointer;font-family:var(--font-b);background:none;border:none}
.d-notif-item{padding:10px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.d-notif-item:last-child{border-bottom:none}
.d-notif-item:active{background:var(--bg3)}
.d-notif-row{display:flex;align-items:flex-start;gap:8px}
.d-notif-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px}
.d-notif-txt{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.45}
.d-notif-time{font-size:10px;color:var(--text2);margin-top:3px;font-family:var(--font-b)}
</style>`;

/* ════════════════════════
   RENDER HELPERS
════════════════════════ */
function quickGrid(items) {
  return items.map(q => `
  <div class="d-qbtn${q.primary?' d-qbtn--primary':''}"
       onclick="window.__barops.navigate('${q.route}')">
    ${q.badge ? `<div class="d-qbtn-badge">${q.badge}</div>` : ''}
    <div class="d-qbtn-icon" style="background:${q.color}">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="color:${q.iconColor}">
        ${q.svg}
      </svg>
    </div>
    <div>
      <div class="d-qbtn-label">${q.label}</div>
      <div class="d-qbtn-sub">${q.sub}</div>
    </div>
  </div>`).join('');
}

function kpiRow(items) {
  return items.map(k => {
    const col = k.cls==='g'?'var(--green)':k.cls==='a'?'var(--amber)':k.cls==='r'?'var(--red)':'var(--text2)';
    return `
  <div class="d-kpi${k.cls?' d-kpi--'+k.cls:''}">
    <div class="d-kpi-val${k.cls?' d-kpi-val--'+k.cls:''}">${k.val}</div>
    <div class="d-kpi-lbl">${k.lbl.replace('\n','<br/>')}</div>
    <div class="d-kpi-delta" style="color:${col}">${k.delta}</div>
  </div>`;
  }).join('');
}

function meterSvg(pct, color) {
  const r = 14, c = 2 * Math.PI * r;
  return `
  <svg width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="3"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${color}" stroke-width="3"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c*(1-pct/100)).toFixed(2)}"
      stroke-linecap="round"/>
  </svg>
  <div class="d-inv-pct" style="color:${color}">${pct}%</div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr = state.role === 'manager';
  const quick = isMgr ? QUICK_MANAGER : QUICK_BARTENDER;
  const kpi   = isMgr ? KPI_MANAGER   : KPI_BARTENDER;

  return `
${CSS}
<div style="position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden">

  <!-- Notif panel -->
  <div class="d-notif-panel" id="d-notif">
    <div class="d-notif-hdr">
      <span class="d-notif-ttl">Сповіщення</span>
      <button class="d-notif-clr" onclick="window.__dash.closeNotif()">Закрити</button>
    </div>
    ${[
      { color:'var(--amber)', text:'<strong style="color:var(--amber)">Ціна ↑</strong> Johnnie Walker Black +18% у накладній №2841', time:'5 хв тому' },
      { color:'var(--red)',   text:'<strong style="color:var(--red)">Критично</strong> Hendrick\'s Gin — 0.4л, мінімум 0.7л',          time:'42 хв тому' },
      { color:'var(--green)', text:'<strong style="color:var(--green)">Накладна</strong> №2841 збережено, залишки оновлено в Poster',   time:'1 год тому' },
    ].map(n => `
    <div class="d-notif-item" onclick="window.__dash.closeNotif()">
      <div class="d-notif-row">
        <div class="d-notif-dot" style="background:${n.color}"></div>
        <div>
          <div class="d-notif-txt">${n.text}</div>
          <div class="d-notif-time">${n.time}</div>
        </div>
      </div>
    </div>`).join('')}
  </div>

  <div class="d-scroll">

    <!-- Header -->
    <div class="d-header">
      <div class="d-venue-row">
        <div>
          <div class="d-venue-sub">${isMgr?'Менеджер':'Бармен'} · Вечірня зміна</div>
          <div class="d-venue-name">${state.venue}</div>
        </div>
        <div class="d-notif-btn" onclick="window.__dash.toggleNotif()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5 5 0 00-5 5c0 5.5-2 7-2 7h14s-2-1.5-2-7a5 5 0 00-5-5z"
              stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10.7 15a2 2 0 01-3.4 0" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <div class="d-notif-badge"></div>
        </div>
      </div>
      <div class="d-shift-row">
        <div class="d-pill${isMgr?' d-pill--mgr':''}">
          <div class="d-pill-dot${isMgr?' d-pill-dot--mgr':''}"></div>
          <span>Зміна активна · 18:00–23:00</span>
        </div>
        <span class="d-shift-time">3 год 34 хв</span>
      </div>
    </div>

    <!-- Alerts -->
    <div>
      <div class="d-alert d-alert--amber" onclick="window.__barops.navigate('price-alert')">
        <div class="d-alert-icon d-alert-icon--amber">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 13H1L8 1z" stroke="var(--amber)" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M8 6v3.5M8 11.5v.5" stroke="var(--amber)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="flex:1">
          <div class="d-alert-title d-alert-title--amber">Johnnie Walker Black — ціна ↑ 18%</div>
          <div class="d-alert-sub">Накладна №2841 · Campari UA · щойно</div>
        </div>
        <span style="color:var(--amber);font-size:18px;opacity:.6">›</span>
      </div>
      <div style="height:6px"></div>
      <div class="d-alert d-alert--red" onclick="window.__barops.navigate('inventory')">
        <div class="d-alert-icon d-alert-icon--red">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="var(--red)" stroke-width="1.3"/>
            <path d="M8 5v3M8 10v.5" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="flex:1">
          <div class="d-alert-title d-alert-title--red">Hendrick's Gin — критично низько</div>
          <div class="d-alert-sub">Залишок 0.4л · Мінімум 0.7л</div>
        </div>
        <span style="color:var(--red);font-size:18px;opacity:.6">›</span>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="d-sec">Швидкі дії</div>
    <div class="d-quick">${quickGrid(quick)}</div>

    <!-- KPI -->
    <div class="d-sec" style="padding-top:16px">Зміна сьогодні</div>
    <div class="d-kpi-row">${kpiRow(kpi)}</div>

    <!-- Manager analytics widgets -->
    ${isMgr ? `
    <div class="d-sec" style="padding-top:16px">Аналітика зміни</div>
    <div class="d-mgr-grid">
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Виручка · сьогодні</div>
        <div class="d-mgr-num" style="color:var(--green)">38 420 ₴</div>
        <div class="d-mgr-sub">↑ +12% vs вчора</div>
        <div class="d-bars">
          ${[60,45,75,55,80,90,20].map((h,i)=>`
          <div class="d-bar${i===5?' d-bar--today':''}" style="height:${h}%">
            <div class="d-bar-fill" style="height:${h}%"></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Топ позиції</div>
        <div class="d-top-items">
          ${[['var(--green)','Aperol Spritz','48'],['var(--amber)','Negroni','34'],
             ['var(--purple)','Martini Dry','28'],['var(--red)','Mojito','21']].map(([c,n,v])=>`
          <div class="d-top-item">
            <div class="d-top-dot" style="background:${c}"></div>
            <span class="d-top-name">${n}</span>
            <span class="d-top-val">${v}</span>
          </div>`).join('')}
        </div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Foodcost зміни</div>
        <div class="d-mgr-num" style="color:var(--amber)">21.4%</div>
        <div class="d-mgr-sub">Норма: ≤ 22%</div>
        <div style="margin-top:8px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden">
          <div style="width:97%;height:100%;background:var(--amber);border-radius:2px"></div>
        </div>
      </div>
      <div class="d-mgr-card">
        <div class="d-mgr-card-title">Списання</div>
        <div class="d-mgr-num" style="color:var(--red)">3</div>
        <div class="d-mgr-sub">Бій · Псування · Дег.</div>
        <div style="margin-top:8px;display:flex;gap:4px">
          <div style="flex:2;height:6px;border-radius:3px;background:var(--red)"></div>
          <div style="flex:1;height:6px;border-radius:3px;background:var(--amber)"></div>
          <div style="flex:1;height:6px;border-radius:3px;background:var(--purple)"></div>
        </div>
      </div>
    </div>` : ''}

    <!-- Inventory preview -->
    <div class="d-sec" style="padding-top:16px">
      Залишки · критичні
      <button class="d-sec-link" onclick="window.__barops.navigate('inventory')">Всі →</button>
    </div>
    <div class="d-inv-list">
      ${INVENTORY_ITEMS.map(r=>`
      <div class="d-inv-row" onclick="window.__barops.navigate('inventory')">
        <div class="d-inv-bar" style="background:${r.color}"></div>
        <div class="d-inv-emoji">${r.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="d-inv-name">${r.name}</div>
          <div class="d-inv-norm">Норма: ${r.norm}</div>
        </div>
        <div style="text-align:right;margin-right:8px">
          <div class="d-inv-qty" style="color:${r.color}">${r.qty}</div>
          <div class="d-inv-unit">літри</div>
        </div>
        <div class="d-inv-meter">${meterSvg(r.pct, r.color)}</div>
      </div>`).join('')}
    </div>

    <!-- Activity feed -->
    <div class="d-sec" style="padding-top:16px">
      Остання активність
      <button class="d-sec-link" onclick="window.__barops.navigate('shift-log')">Все →</button>
    </div>
    ${ACTIVITY.map((a,i)=>`
    <div class="d-act-item" onclick="window.__barops.navigate('${a.route}')">
      <div class="d-act-icon" style="background:${a.bg}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">${a.icon}</svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="d-act-name">${a.name}</div>
        <div class="d-act-meta">${a.meta}</div>
      </div>
      <div>
        <div class="d-act-val" style="color:${a.vcolor}">${a.val}</div>
        <div class="d-act-time">${a.time}</div>
      </div>
    </div>
    ${i < ACTIVITY.length-1 ? '<div class="d-act-div"></div>' : ''}`).join('')}

    <div style="height:20px"></div>
  </div><!-- d-scroll -->
</div>`;
}

/* ════════════════════════
   PAGE MODULE
════════════════════════ */
let _notifOpen = false;

export default {
  render() {
    _notifOpen = false;
    return buildHTML();
  },
  init() {
    window.__dash = {
      toggleNotif() {
        _notifOpen = !_notifOpen;
        document.getElementById('d-notif')?.classList.toggle('open', _notifOpen);
      },
      closeNotif() {
        _notifOpen = false;
        document.getElementById('d-notif')?.classList.remove('open');
      },
    };
  },
};
