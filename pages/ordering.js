/* ============================================================
   BarOps — pages/ordering.js
   Smart Ordering:
   • Бармен — розклад поставок, AI-аналіз, кількість по постачальниках, відправка заявки
   • Менеджер — перегляд заявки, редагування, відправка постачальнику + вкладки Постачальники / Розклад
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const SUPPLIERS = [
  {
    id:'s1', name:'Баядера Логістик', emoji:'🍶',
    orderDay:'Вт, Чт', nextDate:'12.05.2026', contact:'Ігор В. · +380 50 912 01 21',
    products:[
      { id:'p1',  emoji:'🌿', name:"Hendrick's Gin",              vol:0.7,  stock:0.4, aiQty:4, barQty:3, mgrQty:4, unit:'пляш.', price:817, status:'critical',
        aiReason:'Залишок критичний (0.4л), наступна поставка через 7 днів, темп — 2 пляш./тиждень' },
      { id:'p2',  emoji:'🌸', name:'Tanqueray Flor de Sevilla Gin', vol:0.7, stock:0.7, aiQty:3, barQty:3, mgrQty:3, unit:'пляш.', price:817, status:'low',
        aiReason:'Залишок мінімальний, стандартне поповнення' },
      { id:'p3',  emoji:'🍸', name:'Martini Bianco 1л',            vol:1.0,  stock:4.0, aiQty:0, barQty:2, mgrQty:0, unit:'пляш.', price:265, status:'ok',
        aiReason:'Залишку вистачить на 3 тижні за поточним темпом — замовляти недоцільно' },
    ],
  },
  {
    id:'s2', name:'Клас І К', emoji:'🍷',
    orderDay:'Пт', nextDate:'15.05.2026', contact:'Марина С. · +380 67 344 22 11',
    products:[
      { id:'p4',  emoji:'🍊', name:'Aperol 1л',            vol:1.0, stock:3.4, aiQty:6,  barQty:4,  mgrQty:6,  unit:'пляш.', price:348, status:'low',
        aiReason:'Підвищений попит Spritz, запас на 10 днів — потрібне надійне поповнення' },
      { id:'p5',  emoji:'🍷', name:'Campari 0.7л',          vol:0.7, stock:2.1, aiQty:12, barQty:12, mgrQty:12, unit:'пляш.', price:412, status:'ok',
        aiReason:'Стабільний попит, стандартне поповнення' },
      { id:'p6',  emoji:'🍾', name:'Prosecco DOC 0.75л',    vol:0.75,stock:4.5, aiQty:6,  barQty:6,  mgrQty:6,  unit:'пляш.', price:287, status:'ok',
        aiReason:'Заплановано корпоратив 15.05 — збільшено запас' },
      { id:'p7',  emoji:'☕', name:'Kahlúa 0.7л',           vol:0.7, stock:0.5, aiQty:3,  barQty:2,  mgrQty:3,  unit:'пляш.', price:620, status:'low',
        aiReason:'Залишок низький, попит стабільний' },
    ],
  },
  {
    id:'s3', name:'РОМА', emoji:'🥃',
    orderDay:'Ср', nextDate:'13.05.2026', contact:'Василь К. · +380 98 201 44 55',
    products:[
      { id:'p8',  emoji:'🥃', name:'Johnnie Walker Black 0.7л',        vol:0.7, stock:1.2, aiQty:6,  barQty:6,  mgrQty:6,  unit:'пляш.', price:680, status:'low',
        aiReason:'Залишок нижче норми, темп продажів стабільний' },
      { id:'p9',  emoji:'🇺🇦', name:'Горілка Традиційна Українка 0.7л', vol:0.7, stock:8.4, aiQty:12, barQty:12, mgrQty:12, unit:'пляш.', price:130, status:'ok',
        aiReason:'Регулярне замовлення, висока ротація' },
      { id:'p10', emoji:'🍫', name:'Baileys Irish Cream 0.7л',          vol:0.7, stock:0.8, aiQty:4,  barQty:4,  mgrQty:4,  unit:'пляш.', price:510, status:'low',
        aiReason:'Залишок нижче норми' },
    ],
  },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _openSuppliers  = new Set(['s1','s2','s3']);
let _submitted      = false;
let _mgrTab         = 'orders';  // 'orders' | 'suppliers' | 'schedule'
let _editProd       = null;      // product being edited in sheet
let _editMode       = 'bar';     // 'bar' | 'mgr'
let _sheetQty       = 0;
let _suppSheetName  = '';

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="ord-css">
.ord-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.ord-scroll{overflow-y:auto;flex:1}.ord-scroll::-webkit-scrollbar{width:0}

/* topbar */
.ord-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.ord-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ord-back:active{background:var(--bg3)}
.ord-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ord-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* sec label */
.ord-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.ord-sec-link{font-size:11px;color:var(--teal);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* ── DATES CARD ── */
.ord-dates-card{margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.odc-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.odc-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0)}
.odc-badge{display:inline-flex;align-items:center;gap:5px;background:var(--teal-bg);border:0.5px solid var(--teal-border);border-radius:20px;padding:3px 10px;font-size:10px;color:var(--teal);font-family:var(--font-b)}
.odc-dot{width:5px;height:5px;border-radius:50%;background:var(--teal);animation:ordPulse 1.8s ease-in-out infinite}
@keyframes ordPulse{0%,100%{opacity:1}50%{opacity:.3}}
.odc-dates-row{display:flex;gap:8px;overflow-x:auto}.odc-dates-row::-webkit-scrollbar{height:0}
.odc-chip{flex-shrink:0;display:flex;flex-direction:column;align-items:center;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:10px 14px;min-width:72px;cursor:pointer;transition:all .15s}
.odc-chip.urgent{background:var(--amber-bg);border-color:var(--amber-border)}
.odc-chip.next{background:var(--teal-bg);border-color:var(--teal-border)}
.odc-chip:active{transform:scale(.96)}
.odc-day{font-size:9px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.odc-date{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-top:2px}
.odc-month{font-size:10px;font-family:var(--font-b);margin-top:3px}

/* ── AI INSIGHT ── */
.ord-ai{margin:0 14px 10px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:16px;padding:13px 15px;display:flex;gap:11px;align-items:flex-start}
.ord-ai-icon{width:32px;height:32px;border-radius:9px;background:rgba(127,119,221,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.ord-ai-text{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.55}
.ord-ai-text strong{color:var(--text0);font-weight:500}

/* ── SUBMITTED BANNER ── */
.ord-submitted{margin:0 14px 10px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px}
.ord-sb-icon{width:40px;height:40px;border-radius:12px;background:rgba(29,158,117,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ord-sb-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.ord-sb-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px;line-height:1.4}

/* ── SUPPLIER BLOCK ── */
.ord-supp-block{margin:0 14px 8px}
.ord-supp-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:16px 16px 0 0;cursor:pointer;transition:background .15s}
.ord-supp-hdr.collapsed{border-radius:16px}
.ord-supp-hdr:active{background:var(--bg3)}
.ord-sh-icon{width:36px;height:36px;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
.ord-sh-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.ord-sh-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-sh-total{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);text-align:right}
.ord-sh-count{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}
.ord-sh-chev{width:24px;height:24px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;transition:transform .2s;flex-shrink:0}
.ord-sh-chev.open{transform:rotate(180deg)}

/* product rows inside supplier */
.ord-supp-items{background:var(--bg2);border:0.5px solid var(--border2);border-top:none;border-radius:0 0 16px 16px;overflow:hidden}
.ord-prod-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:0.5px solid var(--border);transition:background .12s;cursor:pointer}
.ord-prod-row:last-child{border-bottom:none}
.ord-prod-row:active{background:var(--bg3)}
.ord-prod-row.edited{background:rgba(0,200,180,.03)}
.ord-pbar{width:3px;height:38px;border-radius:2px;flex-shrink:0}
.ord-pemoji{width:32px;height:32px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.ord-pname{font-size:12px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ord-pstock{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.ord-pai-tag{font-size:10px;font-family:var(--font-b);margin-top:2px}
/* qty stepper */
.ord-qty{display:flex;align-items:center;gap:2px;flex-shrink:0}
.ord-qbtn{width:28px;height:28px;border-radius:7px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--text0);transition:background .12s;flex-shrink:0}
.ord-qbtn:active{background:var(--bg4)}
.ord-qdisp{min-width:36px;height:28px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);padding:0 4px}
.ord-qunit{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-left:2px}

/* actions bar */
.ord-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.ord-btn{width:100%;height:52px;border:none;border-radius:13px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;letter-spacing:.02em}
.ord-btn-teal{background:var(--teal);color:#fff;box-shadow:0 4px 20px rgba(0,200,180,.2)}
.ord-btn-teal:active{background:#00a898}
.ord-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1)}
.ord-btn-ghost:active{background:var(--bg3)}

/* ── MANAGER TOPBAR NOTIF ── */
.ord-mgr-notif-btn{position:relative;width:36px;height:36px;background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.ord-mgr-notif-badge{position:absolute;top:-3px;right:-3px;width:16px;height:16px;background:var(--amber);border-radius:50%;border:2px solid var(--bg1);display:flex;align-items:center;justify-content:center;font-size:9px;font-family:var(--font-h);font-weight:700;color:#fff}

/* ── NOTIF BANNER ── */
.ord-notif-banner{margin:0 14px 10px;border-radius:16px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;background:rgba(239,159,39,.08);border:0.5px solid var(--amber-border);transition:filter .15s}
.ord-notif-banner:active{filter:brightness(.9)}
.ord-nb-dot{width:8px;height:8px;border-radius:50%;background:var(--amber);flex-shrink:0;margin-top:3px;animation:ordPulse 1.5s ease-in-out infinite}
.ord-nb-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--amber)}
.ord-nb-sub{font-size:12px;color:rgba(239,159,39,.7);margin-top:3px;font-family:var(--font-b);line-height:1.4}
.ord-nb-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:6px}

/* ── MANAGER TABS ── */
.ord-mgr-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.ord-mt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.ord-mt.act{background:var(--bg3);color:var(--text0)}

/* ── MGR KPI ── */
.ord-mgr-kpi{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.ord-mk{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 10px;text-align:center}
.ord-mk-val{font-family:var(--font-h);font-size:20px;font-weight:700;line-height:1}
.ord-mk-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* alert strip */
.ord-alert{margin:0 14px 8px;border-radius:12px;padding:10px 13px;display:flex;align-items:flex-start;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5}
.ord-alert-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.ord-alert-purple{background:var(--purple-bg);border:0.5px solid var(--purple-border);color:var(--purple)}
.ord-alert-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* ── ORDER REVIEW CARD (manager) ── */
.ord-review-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-rc-hdr{padding:13px 15px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.ord-rc-supplier{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.ord-rc-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-rc-status{font-size:11px;padding:3px 10px;border-radius:20px;font-family:var(--font-b);flex-shrink:0}
.ord-st-pending{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.ord-st-sent{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.ord-rc-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:0.5px solid var(--border)}
.ord-rc-row:last-of-type{border-bottom:none}
.ord-rc-emoji{font-size:16px;flex-shrink:0}
.ord-rc-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.ord-rc-detail{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-rc-qty{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);text-align:right}
.ord-rc-bartag{font-size:10px;font-family:var(--font-b);margin-top:2px;text-align:right}
.ord-rc-aitag{font-size:10px;font-family:var(--font-b);margin-top:1px;text-align:right}
.ord-rc-edit{width:28px;height:28px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.ord-rc-edit:active{background:var(--bg4)}
.ord-rc-total-row{padding:11px 15px;background:var(--bg3);display:flex;justify-content:space-between;align-items:center;border-top:0.5px solid var(--border2)}
.ord-rc-total-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.ord-rc-total-val{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}
.ord-rc-btns{display:flex;gap:8px;padding:12px 15px;border-top:0.5px solid var(--border)}
.ord-rcbtn{flex:1;height:40px;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-family:var(--font-b);font-weight:500;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.ord-rcbtn:active{transform:scale(.97)}
.ord-rcbtn-send{background:var(--teal);color:#fff}
.ord-rcbtn-send.sent{background:var(--green)}
.ord-rcbtn-edit{background:var(--bg3);border:0.5px solid var(--border2);color:var(--text1)}
.ord-rcbtn-reject{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}

/* ── SUPPLIERS TAB ── */
.ord-supp-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-ssc-row{display:flex;align-items:center;gap:10px;padding:12px 15px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.ord-ssc-row:last-child{border-bottom:none}
.ord-ssc-row:active{background:var(--bg3)}
.ord-ssc-icon{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.ord-ssc-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.ord-ssc-items{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-ssc-day{font-family:var(--font-h);font-size:12px;font-weight:600;color:var(--teal);text-align:right}
.ord-ssc-date{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

/* ── SCHEDULE TAB ── */
.ord-sched-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-sched-row{display:flex;align-items:center;gap:10px;padding:12px 15px;border-bottom:0.5px solid var(--border)}
.ord-sched-row:last-child{border-bottom:none}
.ord-sched-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--teal-bg);border:0.5px solid var(--teal-border)}
.ord-sched-lbl{font-size:12px;color:var(--text1);font-family:var(--font-b)}
.ord-sched-dt{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.ord-sched-edit{font-size:11px;color:var(--teal);cursor:pointer;font-family:var(--font-b);flex-shrink:0}

/* ── BOTTOM SHEET (qty edit) ── */
.ord-sheet-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.ord-sheet-overlay.open{display:flex;animation:ordOvIn .2s ease}
@keyframes ordOvIn{from{opacity:0}to{opacity:1}}
.ord-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);padding:0 0 32px;animation:ordSlideUp .3s cubic-bezier(.22,1,.36,1);max-height:85%;display:flex;flex-direction:column}
@keyframes ordSlideUp{from{transform:translateY(100%)}to{transform:none}}
.ord-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 16px;flex-shrink:0}
.ord-sheet-hdr{padding:0 18px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ord-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ord-sheet-close{width:30px;height:30px;border-radius:50%;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer}
.ord-sheet-body{overflow-y:auto;flex:1;padding:0 18px}.ord-sheet-body::-webkit-scrollbar{width:0}
.ord-sheet-foot{padding:14px 18px 0;flex-shrink:0}

/* qty edit inside sheet */
.ord-eq-prod{display:flex;align-items:center;gap:10px;padding:14px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;margin-bottom:16px}
.ord-eq-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.ord-eq-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.ord-eq-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}
.ord-eq-row{display:flex;gap:8px;align-items:center;margin-bottom:12px}
.ord-eq-btn{width:52px;height:58px;border-radius:12px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;color:var(--text0);flex-shrink:0;transition:background .12s}
.ord-eq-btn:active{background:var(--bg4)}
.ord-eq-disp{flex:1;height:58px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;display:flex;align-items:center;justify-content:center;gap:6px}
.ord-eq-num{font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--text0)}
.ord-eq-unit{font-size:13px;color:var(--text2);font-family:var(--font-b)}
.ord-compare{display:flex;justify-content:space-between;background:var(--bg3);border:0.5px solid var(--border);border-radius:12px;padding:10px 13px;margin-bottom:12px}
.ord-cr-blk{text-align:center}
.ord-cr-val{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.ord-cr-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
.ord-cr-sep{font-size:18px;color:var(--text3);align-self:center}
.ord-ai-reason{margin-bottom:4px;padding:10px 13px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:12px;display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.5}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function fmt(n) { return Number(n).toLocaleString('uk-UA', { maximumFractionDigits:0 }); }
function findProd(id) {
  for (const s of SUPPLIERS) {
    const p = s.products.find(x => x.id === id);
    if (p) return p;
  }
  return null;
}
function statusColor(s) {
  return s === 'critical' ? 'var(--red)' : s === 'low' ? 'var(--amber)' : 'var(--green)';
}

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
function barSuppliersHTML() {
  return SUPPLIERS.map(s => {
    const isOpen = _openSuppliers.has(s.id);
    const qty    = s.products.reduce((a, p) => a + p.barQty, 0);
    const amt    = s.products.reduce((a, p) => a + p.barQty * p.price, 0);

    let inner = '';
    if (isOpen) {
      inner = `<div class="ord-supp-items">` +
        s.products.map(p => {
          const col    = statusColor(p.status);
          const aiDiff = p.barQty !== p.aiQty;
          const aiTag  = p.barQty === 0 && p.aiQty === 0
            ? `<div class="ord-pai-tag" style="color:var(--text2)">AI: не замовляти</div>`
            : aiDiff
            ? `<div class="ord-pai-tag" style="color:var(--purple)">AI рекомендує: ${p.aiQty} ${p.unit}</div>`
            : `<div class="ord-pai-tag" style="color:var(--text2)">AI: збігається ✓</div>`;

          const disabled = _submitted;
          return `
          <div class="ord-prod-row ${p.barQty !== p.aiQty && p.barQty > 0 ? 'edited' : ''}">
            <div class="ord-pbar" style="background:${col}"></div>
            <div class="ord-pemoji">${p.emoji}</div>
            <div style="flex:1;min-width:0">
              <div class="ord-pname">${p.name}</div>
              <div class="ord-pstock">Залишок: ${p.stock.toFixed(1)}л</div>
              ${aiTag}
            </div>
            <div class="ord-qty">
              <div class="ord-qbtn" onclick="window.__ord.changeBarQty('${p.id}',-1)" style="opacity:${disabled?.4:1}">−</div>
              <div class="ord-qdisp" id="bq-${p.id}">${p.barQty}<span class="ord-qunit">${p.unit}</span></div>
              <div class="ord-qbtn" onclick="window.__ord.changeBarQty('${p.id}',1)" style="opacity:${disabled?.4:1}">+</div>
            </div>
          </div>`;
        }).join('') +
      `</div>`;
    }

    return `
    <div class="ord-supp-block">
      <div class="ord-supp-hdr ${isOpen?'':'collapsed'}" onclick="window.__ord.toggleSupp('${s.id}')">
        <div class="ord-sh-icon">${s.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="ord-sh-name">${s.name}</div>
          <div class="ord-sh-meta">${s.products.length} позицій · ${s.nextDate}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-right:6px">
          <div class="ord-sh-total">${qty} шт</div>
          <div class="ord-sh-count">~${fmt(amt)} ₴</div>
        </div>
        <div class="ord-sh-chev ${isOpen?'open':''}">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      ${inner}
    </div>`;
  }).join('');
}

function renderBartender() {
  const totalItems = SUPPLIERS.reduce((a,s) => a + s.products.filter(p=>p.barQty>0).length, 0);
  const today = new Date();
  const todayDay = today.toLocaleDateString('uk-UA',{weekday:'short'}).replace('.','');

  // Find which supplier has order today
  const todaySupplier = SUPPLIERS.find(s =>
    s.orderDay.split(', ').some(d => d === 'Вт' || d === 'Ср' || d === 'Чт')
  );

  return `
  <div class="ord-topbar" style="flex-shrink:0">
    <div class="ord-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="ord-title">Закупка</div>
      <div class="ord-sub">${state.venue} · Наступна 12.05 (Вт)</div>
    </div>
    <div style="font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--teal)">${totalItems} поз.</div>
  </div>

  <div class="ord-scroll">

    ${_submitted ? `
    <div class="ord-submitted">
      <div class="ord-sb-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l5 5 7-8" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="ord-sb-title">Заявку подано ✓</div>
        <div class="ord-sb-sub">Менеджер отримав сповіщення і перевірить замовлення перед відправкою постачальнику</div>
      </div>
    </div>` : ''}

    <!-- Інформаційна плашка -->
    <div style="margin:0 14px 10px;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;margin-top:1px">
        <circle cx="8" cy="8" r="6" stroke="var(--blue)" stroke-width="1.2"/>
        <path d="M8 7v5M8 5v.5" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div style="font-size:12px;color:var(--blue);font-family:var(--font-b);line-height:1.5">
        Менеджер налаштував дати і товари. Заповніть потрібну кількість і відправте заявку.
      </div>
    </div>

    <!-- Розклад поставок -->
    <div class="ord-sec">Розклад закупок (від менеджера)</div>
    <div class="ord-dates-card">
      <div class="odc-hdr">
        <div class="odc-title">Дати поставок</div>
        <div class="odc-badge"><div class="odc-dot"></div>Найближча: 12.05</div>
      </div>
      <div class="odc-dates-row">
        ${SUPPLIERS.map((s,i) => `
        <div class="odc-chip ${i===0?'urgent':''}">
          <div class="odc-day">${s.orderDay.split(',')[0]}</div>
          <div class="odc-date" style="color:${i===0?'var(--amber)':'var(--text0)'}">${s.nextDate.split('.')[0]}</div>
          <div class="odc-month" style="color:${i===0?'var(--amber)':'var(--text2)'};">${s.name.split(' ')[0]}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- AI insight -->
    <div class="ord-ai">
      <div class="ord-ai-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="var(--purple)" stroke-width="1.2"/>
          <path d="M8 5a2 2 0 011.7 3c-.3.5-.7.8-.7 1.5v.5" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="8" cy="12" r=".6" fill="var(--purple)"/>
        </svg>
      </div>
      <div class="ord-ai-text">
        AI проаналізував продажі за 14 днів та залишки. <strong>Hendrick's Gin</strong> і <strong>Aperol</strong> — критично низькі, рекомендую збільшити кількість. <strong>Martini Bianco</strong> — достатньо на 3 тижні, можна не замовляти.
      </div>
    </div>

    <!-- Листи закупки по постачальниках -->
    <div class="ord-sec">Листи закупки по постачальниках</div>
    <div id="ord-bar-supps">${barSuppliersHTML()}</div>
    <div style="height:14px"></div>
  </div>

  <div class="ord-actions">
    ${_submitted
      ? `<button class="ord-btn ord-btn-ghost" onclick="window.__ord.resetOrder()">Редагувати заявку</button>`
      : `<button class="ord-btn ord-btn-teal" onclick="window.__ord.submitOrder()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h10M8 4l4 4-4 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Відправити заявку менеджеру
        </button>`}
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function mgrOrdersHTML() {
  return SUPPLIERS.map(s => {
    const total = s.products.reduce((a,p) => a + p.mgrQty * p.price, 0);
    return `
    <div class="ord-review-card">
      <div class="ord-rc-hdr">
        <div>
          <div class="ord-rc-supplier">${s.emoji} ${s.name}</div>
          <div class="ord-rc-meta">Поставка: ${s.orderDay} · ${s.nextDate}</div>
        </div>
        <div class="ord-rc-status ord-st-pending">На розгляді</div>
      </div>
      ${s.products.map(p => {
        const barDiff = p.barQty !== p.mgrQty;
        const aiDiff  = p.aiQty  !== p.mgrQty;
        return `
        <div class="ord-rc-row">
          <div class="ord-rc-emoji">${p.emoji}</div>
          <div style="flex:1;min-width:0">
            <div class="ord-rc-name">${p.name}</div>
            <div class="ord-rc-detail">Залишок: ${p.stock.toFixed(1)}л · ${p.price}₴/пляш.</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-right:8px">
            <div class="ord-rc-qty">${p.mgrQty} ${p.unit}</div>
            <div class="ord-rc-bartag" style="color:${barDiff?'var(--amber)':'var(--text2)'}">Бармен: ${p.barQty}</div>
            <div class="ord-rc-aitag" style="color:${aiDiff?'var(--purple)':'var(--text2)'}">AI: ${p.aiQty}</div>
          </div>
          <div class="ord-rc-edit" onclick="window.__ord.openQtySheet('${p.id}','mgr')">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9l1.5-1.5 5-5 1.5 1.5-5 5L2 11V9z" stroke="var(--text1)" stroke-width="1.2" stroke-linejoin="round"/></svg>
          </div>
        </div>`;
      }).join('')}
      <div class="ord-rc-total-row">
        <div class="ord-rc-total-lbl">Загальна сума</div>
        <div class="ord-rc-total-val">${fmt(total)} ₴</div>
      </div>
      <div class="ord-rc-btns">
        <button class="ord-rcbtn ord-rcbtn-send" onclick="window.__ord.sendOrder('${s.id}')">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 6.5l10-5L7 11.5 6 7 1.5 6.5z" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" fill="none"/></svg>
          Відправити
        </button>
        <button class="ord-rcbtn ord-rcbtn-edit">Редагувати</button>
        <button class="ord-rcbtn ord-rcbtn-reject">Відхилити</button>
      </div>
    </div>`;
  }).join('');
}

function mgrSuppliersHTML() {
  return `<div class="ord-supp-card">
    ${SUPPLIERS.map(s => `
    <div class="ord-ssc-row" onclick="window.__ord.openSuppSheet('${s.name}')">
      <div class="ord-ssc-icon">${s.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="ord-ssc-name">${s.name}</div>
        <div class="ord-ssc-items">${s.products.length} позицій · ${s.contact}</div>
      </div>
      <div>
        <div class="ord-ssc-day">${s.orderDay}</div>
        <div class="ord-ssc-date">${s.nextDate}</div>
      </div>
    </div>`).join('')}
  </div>
  <div class="ord-alert ord-alert-purple" style="margin-top:4px">
    <div class="ord-alert-icon" style="background:var(--purple-bg)">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--purple)" stroke-width="1.2"/><path d="M6.5 4v3.5M6.5 9.5v.4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/></svg>
    </div>
    Менеджер призначає постачальника для кожного товару — бармен бачить товар у потрібному блоці автоматично
  </div>`;
}

function mgrScheduleHTML() {
  return `<div class="ord-sched-card">
    ${SUPPLIERS.map(s => `
    <div class="ord-sched-row">
      <div class="ord-sched-icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="var(--teal)" stroke-width="1.2" fill="none"/><path d="M2 6h10M5 1.5v2M9 1.5v2" stroke="var(--teal)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <div style="flex:1">
        <div class="ord-sched-lbl">${s.name}</div>
        <div class="ord-sched-dt">Кожного ${s.orderDay} · Наступне ${s.nextDate}</div>
      </div>
      <div class="ord-sched-edit">Змінити</div>
    </div>`).join('')}
  </div>
  <div class="ord-sec" style="padding-top:10px">Нагадування барменам</div>
  <div class="ord-sched-card">
    <div class="ord-sched-row">
      <div class="ord-sched-icon" style="background:var(--amber-bg);border-color:var(--amber-border)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a5 5 0 100 10 5 5 0 000-10z" stroke="var(--amber)" stroke-width="1.2"/><path d="M7 4v3l2 1.5" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <div style="flex:1">
        <div class="ord-sched-lbl">Push-сповіщення</div>
        <div class="ord-sched-dt">За 2 дні до замовлення · о 10:00</div>
      </div>
      <div class="ord-sched-edit">Змінити</div>
    </div>
  </div>`;
}

function renderManager() {
  const tabs = {
    orders:    mgrOrdersHTML(),
    suppliers: mgrSuppliersHTML(),
    schedule:  mgrScheduleHTML(),
  };
  return `
  <div class="ord-topbar" style="flex-shrink:0">
    <div class="ord-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="ord-title">Замовлення</div>
      <div class="ord-sub">Менеджер · ${state.venue}</div>
    </div>
    <div class="ord-mgr-notif-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a5 5 0 00-5 5c0 5.5-2 7-2 7h14s-2-1.5-2-7a5 5 0 00-5-5z" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/><path d="M9.7 13a2 2 0 01-3.4 0" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <div class="ord-mgr-notif-badge">1</div>
    </div>
  </div>

  <div class="ord-scroll">

    <!-- New order notification -->
    <div class="ord-notif-banner" onclick="window.__ord.setMgrTab('orders')">
      <div class="ord-nb-dot"></div>
      <div style="flex:1">
        <div class="ord-nb-title">Нова заявка від бармена</div>
        <div class="ord-nb-sub">Олексій К. подав заявку · 14 позицій по 3 постачальниках</div>
        <div class="ord-nb-time">Сьогодні о 21:18 · 16 хвилин тому</div>
      </div>
      <div style="font-size:18px;color:var(--amber);opacity:.6;flex-shrink:0">›</div>
    </div>

    <!-- Tabs -->
    <div class="ord-mgr-tabs">
      <button class="ord-mt ${_mgrTab==='orders'?'act':''}"     onclick="window.__ord.setMgrTab('orders')">Замовлення</button>
      <button class="ord-mt ${_mgrTab==='suppliers'?'act':''}"  onclick="window.__ord.setMgrTab('suppliers')">Постачальники</button>
      <button class="ord-mt ${_mgrTab==='schedule'?'act':''}"   onclick="window.__ord.setMgrTab('schedule')">Розклад</button>
    </div>

    ${_mgrTab === 'orders' ? `
    <!-- KPI -->
    <div class="ord-mgr-kpi">
      <div class="ord-mk"><div class="ord-mk-val" style="color:var(--amber)">1</div><div class="ord-mk-lbl">Заявок<br/>на розгляді</div></div>
      <div class="ord-mk"><div class="ord-mk-val" style="color:var(--green)">14</div><div class="ord-mk-lbl">Позицій<br/>у заявці</div></div>
      <div class="ord-mk"><div class="ord-mk-val" style="color:var(--text0)">3</div><div class="ord-mk-lbl">Постачаль-<br/>ники</div></div>
    </div>
    <div class="ord-alert ord-alert-amber">
      <div class="ord-alert-icon" style="background:var(--amber-bg)">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v3M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <span>Перевірте заявку та відправте замовлення постачальникам до <strong style="color:var(--amber)">12 травня</strong></span>
    </div>
    ${mgrOrdersHTML()}` : ''}

    ${_mgrTab === 'suppliers' ? `
    <div class="ord-sec">Постачальники <button class="ord-sec-link">+ Додати</button></div>
    ${mgrSuppliersHTML()}` : ''}

    ${_mgrTab === 'schedule' ? `
    <div class="ord-sec">Дати замовлень</div>
    ${mgrScheduleHTML()}` : ''}

    <div style="height:16px"></div>
  </div>

  <!-- QTY EDIT SHEET -->
  <div class="ord-sheet-overlay ${_editProd?'open':''}" id="ord-qty-sheet"
       onclick="window.__ord.closeQtySheet(event)">
    <div class="ord-sheet" onclick="event.stopPropagation()">
      <div class="ord-sheet-handle"></div>
      <div class="ord-sheet-hdr">
        <div class="ord-sheet-title" id="ord-qsh-title">Кількість</div>
        <div class="ord-sheet-close" onclick="window.__ord.closeQtySheet()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="ord-sheet-body">
        <div class="ord-eq-prod">
          <div style="font-size:22px;flex-shrink:0" id="ord-qsh-emoji">—</div>
          <div>
            <div class="ord-eq-name" id="ord-qsh-name">—</div>
            <div class="ord-eq-stock" id="ord-qsh-stock">—</div>
          </div>
        </div>
        <div class="ord-eq-lbl">Кількість для замовлення</div>
        <div class="ord-eq-row">
          <div class="ord-eq-btn" onclick="window.__ord.changeSheetQty(-1)">−</div>
          <div class="ord-eq-disp">
            <div class="ord-eq-num" id="ord-qsh-num">0</div>
            <div class="ord-eq-unit" id="ord-qsh-unit">пляш.</div>
          </div>
          <div class="ord-eq-btn" onclick="window.__ord.changeSheetQty(1)">+</div>
        </div>
        <div class="ord-compare">
          <div class="ord-cr-blk"><div class="ord-cr-val" style="color:var(--teal)" id="ord-cr-bar">0</div><div class="ord-cr-lbl">Бармен</div></div>
          <div class="ord-cr-sep">·</div>
          <div class="ord-cr-blk"><div class="ord-cr-val" style="color:var(--purple)" id="ord-cr-ai">0</div><div class="ord-cr-lbl">AI</div></div>
          <div class="ord-cr-sep">·</div>
          <div class="ord-cr-blk"><div class="ord-cr-val" style="color:var(--text0)" id="ord-cr-mgr">0</div><div class="ord-cr-lbl">Менеджер</div></div>
        </div>
        <div class="ord-ai-reason">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--purple)" stroke-width="1.2"/><path d="M7 4.5a1.5 1.5 0 011.3 2.2c-.3.4-.5.6-.5 1v.3" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="9.5" r=".5" fill="var(--purple)"/></svg>
          <span id="ord-qsh-reason">—</span>
        </div>
      </div>
      <div class="ord-sheet-foot">
        <button class="ord-btn ord-btn-teal" onclick="window.__ord.saveSheetQty()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Зберегти
        </button>
      </div>
    </div>
  </div>

  <!-- SUPPLIER SHEET -->
  <div class="ord-sheet-overlay ${_suppSheetName?'open':''}" id="ord-supp-sheet"
       onclick="window.__ord.closeSuppSheet(event)">
    <div class="ord-sheet" onclick="event.stopPropagation()">
      <div class="ord-sheet-handle"></div>
      <div class="ord-sheet-hdr">
        <div class="ord-sheet-title" id="ord-ss-title">${_suppSheetName}</div>
        <div class="ord-sheet-close" onclick="window.__ord.closeSuppSheet()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="ord-sheet-body">
        ${(() => {
          const s = SUPPLIERS.find(x => x.name === _suppSheetName);
          if (!s) return '';
          return `
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px;line-height:1.5">Товари постачальника та контактна інформація</div>
          <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:16px">
            ${s.products.map(p => `
            <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px">
              <span style="font-size:16px">${p.emoji}</span>
              <div style="flex:1;font-size:13px;color:var(--text1);font-family:var(--font-b)">${p.name}</div>
              <div style="width:20px;height:20px;border-radius:6px;background:var(--teal);display:flex;align-items:center;justify-content:center">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--text2);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:8px">Контакт</div>
          <div style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.7">
            📞 ${s.contact}<br/>
            📋 Наступна поставка: ${s.nextDate}
          </div>`;
        })()}
      </div>
      <div class="ord-sheet-foot">
        <button class="ord-btn ord-btn-teal" onclick="window.__ord.closeSuppSheet()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   FULL HTML
════════════════════════ */
function buildHTML() {
  const body = state.role === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="ord-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function refreshBarSupps() {
  const el = document.getElementById('ord-bar-supps');
  if (el) el.innerHTML = barSuppliersHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function toggleSupp(id) {
  if (_openSuppliers.has(id)) _openSuppliers.delete(id);
  else _openSuppliers.add(id);
  refreshBarSupps();
}
function changeBarQty(id, delta) {
  const p = findProd(id);
  if (!p || _submitted) return;
  p.barQty = Math.max(0, p.barQty + delta);
  refreshBarSupps();
}
function submitOrder()  { _submitted = true;  fullRender(); }
function resetOrder()   { _submitted = false; fullRender(); }

function setMgrTab(tab) { _mgrTab = tab; fullRender(); }

function sendOrder(suppId) {
  const s = SUPPLIERS.find(x => x.id === suppId);
  alert(`✓ Замовлення відправлено постачальнику ${s?.name}\nEmail + Telegram сповіщення`);
}

/* qty sheet */
function openQtySheet(prodId, mode) {
  const p = findProd(prodId);
  if (!p) return;
  _editProd = p;
  _editMode = mode;
  _sheetQty = mode === 'bar' ? p.barQty : p.mgrQty;
  // update DOM if sheet already rendered
  const sheetEl = document.getElementById('ord-qty-sheet');
  if (!sheetEl) { fullRender(); return; }
  sheetEl.classList.add('open');
  const s = id => document.getElementById(id);
  if (s('ord-qsh-title'))  s('ord-qsh-title').textContent  = mode === 'bar' ? 'Кількість (заявка)' : 'Кількість (менеджер)';
  if (s('ord-qsh-emoji'))  s('ord-qsh-emoji').textContent  = p.emoji;
  if (s('ord-qsh-name'))   s('ord-qsh-name').textContent   = p.name;
  if (s('ord-qsh-stock'))  s('ord-qsh-stock').textContent  = `Залишок: ${p.stock.toFixed(2)}л · ${p.price}₴/пляш.`;
  if (s('ord-qsh-num'))    s('ord-qsh-num').textContent    = _sheetQty;
  if (s('ord-qsh-unit'))   s('ord-qsh-unit').textContent   = p.unit;
  if (s('ord-cr-bar'))     s('ord-cr-bar').textContent     = p.barQty;
  if (s('ord-cr-ai'))      s('ord-cr-ai').textContent      = p.aiQty;
  if (s('ord-cr-mgr'))     s('ord-cr-mgr').textContent     = p.mgrQty;
  if (s('ord-qsh-reason')) s('ord-qsh-reason').textContent = 'AI: ' + p.aiReason;
}
function changeSheetQty(delta) {
  _sheetQty = Math.max(0, _sheetQty + delta);
  const num = document.getElementById('ord-qsh-num');
  const mgr = document.getElementById('ord-cr-mgr');
  if (num) num.textContent = _sheetQty;
  if (mgr) mgr.textContent = _sheetQty;
}
function saveSheetQty() {
  if (!_editProd) return;
  if (_editMode === 'bar') _editProd.barQty  = _sheetQty;
  else                     _editProd.mgrQty  = _sheetQty;
  _editProd = null;
  document.getElementById('ord-qty-sheet')?.classList.remove('open');
  fullRender();
}
function closeQtySheet(e) {
  if (!e || e.target === document.getElementById('ord-qty-sheet')) {
    _editProd = null;
    document.getElementById('ord-qty-sheet')?.classList.remove('open');
  }
}

/* supplier sheet */
function openSuppSheet(name) {
  _suppSheetName = name;
  fullRender();
}
function closeSuppSheet(e) {
  if (!e || e.target === document.getElementById('ord-supp-sheet')) {
    _suppSheetName = '';
    fullRender();
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _openSuppliers = new Set(['s1','s2','s3']);
    _submitted     = false;
    _mgrTab        = 'orders';
    _editProd      = null;
    _sheetQty      = 0;
    _suppSheetName = '';
    return buildHTML();
  },
  init() {
    window.__ord = {
      toggleSupp, changeBarQty, submitOrder, resetOrder,
      setMgrTab, sendOrder,
      openQtySheet, changeSheetQty, saveSheetQty, closeQtySheet,
      openSuppSheet, closeSuppSheet,
    };
  },
};
