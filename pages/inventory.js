/* ============================================================
   BarOps — pages/inventory.js
   Інвентаризація:
   • Бармен-Заблоковано → показує наступну сесію + зворотній відлік
   • Бармен-Активна → підрахунок з кг→л, пляшки, прямий ввід л
   • Менеджер → календар сесій + одиниці вимірювання + історія
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   PRODUCTS DATA
════════════════════════ */
const PRODUCTS = [
  { id:'p1',  name:"Hendrick's Gin",            emoji:'🌿', vol:0.7,  unit:'kg',  empty:0.38, full:1.08, category:'Джин',       sysQty:1.4, entered:null, enteredBottles:2, enteredFrac:0  },
  { id:'p2',  name:'Aperol',                     emoji:'🍊', vol:1.0,  unit:'kg',  empty:0.52, full:1.52, category:'Аперитиви',  sysQty:3.4, entered:3.2,  enteredBottles:3, enteredFrac:0.2},
  { id:'p3',  name:'Campari',                    emoji:'🍷', vol:0.7,  unit:'l',   empty:0,    full:0,    category:'Аперитиви',  sysQty:2.1, entered:2.0,  enteredBottles:2, enteredFrac:0  },
  { id:'p4',  name:'Johnnie Walker Black',       emoji:'🥃', vol:0.7,  unit:'kg',  empty:0.42, full:1.15, category:'Віскі',      sysQty:1.2, entered:null, enteredBottles:1, enteredFrac:0  },
  { id:'p5',  name:'Martini Bianco',             emoji:'🍸', vol:1.0,  unit:'sht', empty:0,    full:0,    category:'Вермут',     sysQty:2.0, entered:1.5,  enteredBottles:1, enteredFrac:0.5},
  { id:'p6',  name:'Tanqueray Flor de Sevilla',  emoji:'🌸', vol:0.7,  unit:'kg',  empty:0.38, full:1.08, category:'Джин',       sysQty:0.7, entered:null, enteredBottles:1, enteredFrac:0  },
  { id:'p7',  name:'Baileys Irish Cream',        emoji:'🍫', vol:0.7,  unit:'l',   empty:0,    full:0,    category:'Лікери',     sysQty:0.8, entered:null, enteredBottles:1, enteredFrac:0  },
  { id:'p8',  name:'Prosecco DOC',               emoji:'🍾', vol:0.75, unit:'sht', empty:0,    full:0,    category:'Ігристе',    sysQty:4.5, entered:null, enteredBottles:6, enteredFrac:0  },
  { id:'p9',  name:'Cinzano Rosso',              emoji:'🍷', vol:1.0,  unit:'l',   empty:0,    full:0,    category:'Вермут',     sysQty:1.0, entered:1.0,  enteredBottles:1, enteredFrac:0  },
  { id:'p10', name:'Kahlúa',                     emoji:'☕', vol:0.7,  unit:'l',   empty:0,    full:0,    category:'Лікери',     sysQty:0.5, entered:null, enteredBottles:0, enteredFrac:0  },
  { id:'p11', name:'Горілка Традиційна Українка',emoji:'🇺🇦', vol:0.7, unit:'sht', empty:0,    full:0,    category:'Горілка',    sysQty:8.4, entered:null, enteredBottles:12,enteredFrac:0  },
  { id:'p12', name:'Вино Піно Гріджіо Cesari',   emoji:'🍷', vol:0.75, unit:'sht', empty:0,    full:0,    category:'Вино',       sysQty:9.0, entered:null, enteredBottles:12,enteredFrac:0  },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _subView    = 'locked'; // 'locked' | 'active' | 'manager'
let _filter     = 'all';
let _search     = '';
let _openId     = null;
let _cdInterval = null;
let _mgrOverlay = null; // name of product in mgr overlay
let _syrveBalance = null; // залишки з Syrve
let _syrveLoading = false;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="inv-css">
.inv-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.inv-scroll{overflow-y:auto;flex:1}.inv-scroll::-webkit-scrollbar{width:0}

/* topbar */
.inv-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.inv-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.inv-back:active{background:var(--bg3)}
.inv-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.inv-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* ── LOCKED ── */
.inv-locked-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 28px;text-align:center}
.inv-lock-icon{width:80px;height:80px;border-radius:24px;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;margin-bottom:24px;position:relative}
.inv-lock-badge{position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:var(--amber);border:2px solid var(--bg1);display:flex;align-items:center;justify-content:center}
.inv-locked-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:8px;letter-spacing:-.02em}
.inv-locked-sub{font-size:13px;color:var(--text2);line-height:1.65;font-family:var(--font-b);font-weight:300;max-width:260px}
.inv-next-card{margin-top:22px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:16px;padding:18px 20px;text-align:left;width:100%}
.inv-next-lbl{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:8px}
.inv-next-date{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.inv-next-day{font-size:13px;color:var(--green);margin-top:3px;font-family:var(--font-b)}
.inv-next-who{font-size:11px;color:var(--text2);margin-top:8px;font-family:var(--font-b)}
.inv-countdown{display:flex;gap:8px;margin-top:14px}
.inv-cd-block{flex:1;background:var(--bg3);border-radius:9px;padding:10px 6px;text-align:center}
.inv-cd-num{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0)}
.inv-cd-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;letter-spacing:.06em;text-transform:uppercase}
.inv-info-strip{margin:14px 0 0;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;color:var(--blue);font-family:var(--font-b);line-height:1.45}
.inv-info-icon{width:26px;height:26px;border-radius:8px;background:var(--blue-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.inv-demo-btn{width:100%;height:50px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:13px;font-size:13px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.inv-demo-btn:hover{color:var(--text0)}

/* ── ACTIVE SESSION ── */
.inv-session-hdr{margin:0 14px 10px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:16px;padding:14px 16px}
.inv-sh-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.inv-sh-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.inv-sh-badge{display:inline-flex;align-items:center;gap:5px;background:var(--green);border-radius:20px;padding:3px 10px;font-size:10px;color:#fff;font-family:var(--font-b)}
.inv-sh-bdot{width:5px;height:5px;border-radius:50%;background:#fff;animation:invPulse 1.8s ease-in-out infinite}
@keyframes invPulse{0%,100%{opacity:1}50%{opacity:.35}}
.inv-prog{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:6px}
.inv-prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--green),var(--green-l));transition:width .6s ease}
.inv-sh-nums{display:flex;justify-content:space-between;font-size:10px;color:var(--text2);font-family:var(--font-b)}
.inv-alert{margin:0 14px 9px;border-radius:12px;padding:10px 13px;display:flex;align-items:flex-start;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5}
.inv-alert-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.inv-alert-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* filter tabs */
.inv-filters{display:flex;gap:2px;margin:0 14px 9px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.inv-ftab{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.inv-ftab.act{background:var(--bg3);color:var(--text0)}

/* search */
.inv-search{position:relative;margin:0 14px 9px}
.inv-search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none}
.inv-search-inp{width:100%;height:40px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;padding:0 14px 0 36px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}
.inv-search-inp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.inv-search-inp::placeholder{color:var(--text2)}

/* product cards */
.inv-prod-list{padding:0 14px;display:flex;flex-direction:column;gap:5px}
.inv-prod{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;overflow:hidden;transition:border-color .15s}
.inv-prod.entered{border-color:var(--green-border);background:var(--green-bg)}
.inv-prod.discrepancy{border-color:var(--amber-border)}
.inv-prod-row{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer}
.inv-pbar{width:3px;height:36px;border-radius:2px;flex-shrink:0}
.inv-pemoji{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.inv-pname{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inv-pmeta{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.inv-pqty{font-family:var(--font-h);font-size:15px;font-weight:700;text-align:right}
.inv-punit{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right}
.inv-pdisc{font-size:10px;font-family:var(--font-b);text-align:right}
.inv-penter{width:32px;height:32px;border-radius:9px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s}
.inv-penter:hover{background:var(--green);border-color:var(--green)}
.inv-penter.done{background:var(--green-bg);border-color:var(--green-border)}

/* input panel */
.inv-ipanel{background:var(--bg3);border-top:0.5px solid var(--border2);padding:14px 13px;display:none;flex-direction:column;gap:11px}
.inv-ipanel.open{display:flex}
.inv-mode-tabs{display:flex;gap:3px;background:var(--bg2);border-radius:9px;padding:3px;border:0.5px solid var(--border)}
.inv-mtab{flex:1;height:30px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:4px}
.inv-mtab.act{background:var(--bg3);color:var(--text0);border:0.5px solid var(--border2)}
.inv-inp-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.inv-field{height:50px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;padding:0 14px;font-size:20px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;transition:border-color .2s;width:100%;text-align:center}
.inv-field:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.inv-conv{background:var(--bg2);border:0.5px solid var(--green-border);border-radius:9px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
.inv-conv-formula{font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.inv-conv-result{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--green)}
.inv-conv-unit{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}
.inv-compare{display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:9px 12px}
.inv-cblk{text-align:center}
.inv-cval{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.inv-clbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.06em}
.inv-carr{font-size:16px;color:var(--text3)}
.inv-cdiff{font-family:var(--font-h);font-size:14px;font-weight:600}
.inv-stepper{display:flex;gap:8px;align-items:center}
.inv-stbtn{width:48px;height:48px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;font-size:22px;color:var(--text0);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .12s}
.inv-stbtn:active{background:var(--bg3)}
.inv-stdisp{flex:1;height:48px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0)}
.inv-frac-row{display:flex;gap:5px}
.inv-frac{flex:1;height:36px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.inv-frac.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.inv-frac:active{transform:scale(.95)}
.inv-save{width:100%;height:46px;background:var(--green);border:none;border-radius:9px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s}
.inv-save:active{background:var(--green-d)}
.inv-save:disabled{opacity:.4;cursor:default}
.inv-discard{width:100%;height:38px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:color .15s;margin-top:-4px}
.inv-discard:hover{color:var(--text1)}

/* actions */
.inv-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.inv-btn-green{width:100%;height:52px;background:var(--green);border:none;border-radius:13px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;box-shadow:0 4px 18px rgba(29,158,117,.22)}
.inv-btn-green:active{background:var(--green-d)}

/* ── MANAGER ── */
.inv-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.inv-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* calendar */
.inv-cal{margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.inv-cal-hdr{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:0.5px solid var(--border)}
.inv-cal-month{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.inv-cal-nav{width:30px;height:30px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
.inv-cal-nav:active{background:var(--bg4)}
.inv-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:10px 12px 13px}
.inv-cal-dn{text-align:center;font-size:9px;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-b);padding:4px 0}
.inv-cal-d{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-family:var(--font-b);color:var(--text2);border-radius:8px;cursor:pointer;transition:all .15s;position:relative}
.inv-cal-d:hover{background:var(--bg3);color:var(--text0)}
.inv-cal-d.today{color:var(--text0);font-weight:500}
.inv-cal-d.today::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--green)}
.inv-cal-d.sched{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green);font-weight:600}
.inv-cal-d.sched:hover{background:var(--green);color:#fff}
.inv-cal-d.past{color:var(--text3);cursor:default}
.inv-cal-d.past:hover{background:transparent}
.inv-cal-d.empty{cursor:default}
.inv-cal-d.sel{background:var(--green);color:#fff;box-shadow:0 2px 8px rgba(29,158,117,.3)}

/* schedule form */
.inv-sched-form{margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:11px}
.inv-sf-title{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.inv-sf-row{display:flex;gap:10px}
.inv-sf-grp{display:flex;flex-direction:column;gap:5px;flex:1}
.inv-sf-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b)}
.inv-sf-inp{height:44px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;padding:0 12px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s;width:100%}
.inv-sf-inp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.inv-sf-sel{height:44px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;padding:0 12px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;cursor:pointer;width:100%;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236A6762' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:30px}
.inv-sf-save{height:44px;background:var(--green);border:none;border-radius:9px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:background .15s;width:100%}
.inv-sf-save:active{background:var(--green-d)}
.inv-sf-cancel{height:44px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:14px;color:var(--text2);cursor:pointer;font-family:var(--font-b);min-width:88px}

/* unit setup */
.inv-unit-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.inv-urow{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.inv-urow:last-child{border-bottom:none}
.inv-urow:active{background:var(--bg3)}
.inv-uemoji{width:32px;height:32px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.inv-uname{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.inv-uformula{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.inv-ubadge{font-size:11px;font-family:var(--font-b);padding:3px 10px;border-radius:20px;flex-shrink:0}
.inv-ubadge-kg{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}
.inv-ubadge-l{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.inv-ubadge-sht{background:var(--bg3);border:0.5px solid var(--border2);color:var(--text2)}

/* history */
.inv-hist{margin:0 14px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.inv-hrow{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.inv-hrow:last-child{border-bottom:none}
.inv-hrow:active{background:var(--bg3)}
.inv-hicon{width:32px;height:32px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.inv-hdate{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.inv-hmeta{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.inv-hitems{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);text-align:right}
.inv-hdiff{font-size:11px;font-family:var(--font-b);text-align:right;margin-top:2px}

/* mgr unit overlay */
.inv-overlay{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(5px);z-index:100;display:none;align-items:flex-end}
.inv-overlay.open{display:flex;animation:invOvIn .2s ease}
@keyframes invOvIn{from{opacity:0}to{opacity:1}}
.inv-modal{width:100%;background:var(--bg2);border-radius:22px 22px 0 0;padding:0 18px 32px;border-top:0.5px solid var(--border2);animation:invSlideUp .3s cubic-bezier(.22,1,.36,1)}
@keyframes invSlideUp{from{transform:translateY(100%)}to{transform:none}}
.inv-modal-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 18px}
.inv-modal-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);margin-bottom:4px}
.inv-modal-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px;line-height:1.5}
.inv-modal-modes{display:flex;gap:6px;margin-bottom:13px}
.inv-mmode{flex:1;height:40px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.inv-mmode.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.inv-modal-row{display:flex;gap:8px;margin-bottom:10px}
.inv-mgrp{flex:1;display:flex;flex-direction:column;gap:5px}
.inv-mlbl{font-size:10px;color:var(--text2);letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-b)}
.inv-minp{height:46px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;padding:0 12px;font-size:16px;font-family:var(--font-h);font-weight:600;color:var(--text0);outline:none;transition:border-color .2s;width:100%;text-align:center}
.inv-minp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.inv-formula-box{background:var(--bg3);border:0.5px solid var(--border);border-radius:9px;padding:10px 13px;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:12px}
.inv-formula-box strong{color:var(--green);font-family:var(--font-h);font-size:13px}
.inv-modal-save{width:100%;height:48px;background:var(--green);border:none;border-radius:9px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:background .15s;margin-bottom:8px}
.inv-modal-save:active{background:var(--green-d)}
.inv-modal-close{width:100%;height:40px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
</style>`;

/* ════════════════════════
   RENDER HELPERS
════════════════════════ */
function fmt2(n) { return Number(n).toFixed(2); }

function diffColor(diff) {
  return Math.abs(diff) < 0.05 ? 'var(--green)' : 'var(--amber)';
}

/* ── LOCKED VIEW ── */
function renderLocked() {
  return `
  <div class="inv-topbar">
    <div class="inv-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="inv-title">Інвентаризація</div>
      <div class="inv-sub">${state.venue} · Бармен</div>
    </div>
  </div>

  <div class="inv-locked-center">
    <div class="inv-lock-icon">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="8" y="16" width="20" height="14" rx="4" stroke="var(--text2)" stroke-width="1.5" fill="none"/>
        <path d="M12 16v-5a6 6 0 0112 0v5" stroke="var(--text2)" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="18" cy="23" r="2" fill="var(--text2)"/>
        <path d="M18 25v3" stroke="var(--text2)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <div class="inv-lock-badge">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1l1.2 3.4H11L8.1 6.5l1.1 3.4L6 7.9l-3.2 2 1.1-3.4L1 4.4h3.8z" stroke="#fff" stroke-width="1" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
    </div>
    <div class="inv-locked-title">Інвентаризація недоступна</div>
    <div class="inv-locked-sub">Дату та час проведення призначає менеджер. Наступна запланована сесія:</div>
    <div class="inv-next-card">
      <div class="inv-next-lbl">Наступна інвентаризація</div>
      <div class="inv-next-date">08 травня 2026</div>
      <div class="inv-next-day">П'ятниця · 23:00 — закриття зміни</div>
      <div class="inv-next-who">Призначив: Костянтин О. · 30.04.2026</div>
      <div class="inv-countdown">
        <div class="inv-cd-block"><div class="inv-cd-num" id="inv-cd-d">—</div><div class="inv-cd-lbl">днів</div></div>
        <div class="inv-cd-block"><div class="inv-cd-num" id="inv-cd-h">—</div><div class="inv-cd-lbl">годин</div></div>
        <div class="inv-cd-block"><div class="inv-cd-num" id="inv-cd-m">—</div><div class="inv-cd-lbl">хвилин</div></div>
      </div>
    </div>
    <div class="inv-info-strip">
      <div class="inv-info-icon">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--blue)" stroke-width="1.2"/><path d="M6.5 6v3M6.5 4.5v.4" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      Попередня: 25.04.2026 · 47 позицій · 3 розбіжності
    </div>
  </div>

  <div style="padding:0 14px 22px">
    <button class="inv-demo-btn" onclick="window.__inv.openActive()">
      Демо: відкрити активну сесію →
    </button>
  </div>`;
}

/* ── ACTIVE SESSION VIEW ── */
function prodList() {
  let list = PRODUCTS.filter(p => {
    if (_search && !p.name.toLowerCase().includes(_search.toLowerCase())) return false;
    if (_filter === 'done') return p.entered !== null;
    if (_filter === 'todo') return p.entered === null;
    if (_filter === 'disc') return p.entered !== null && Math.abs(p.entered - p.sysQty) > 0.05;
    return true;
  });

  if (!list.length)
    return `<div style="text-align:center;padding:20px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Немає позицій</div>`;

  return list.map(p => {
    const isDone  = p.entered !== null;
    const disc    = isDone && Math.abs(p.entered - p.sysQty) > 0.05;
    const isOpen  = _openId === p.id;
    const barColor = isDone ? (disc ? 'var(--amber)' : 'var(--green)') : 'var(--bg4)';
    const qtyColor = isDone ? (disc ? 'var(--amber)' : 'var(--green)') : 'var(--text3)';
    const cardCls  = isDone ? (disc ? 'inv-prod discrepancy' : 'inv-prod entered') : 'inv-prod';

    const unitBadge = p.unit === 'kg'
      ? `<span style="color:var(--blue);font-size:10px;font-family:var(--font-b)">⚖ кг→л</span>`
      : p.unit === 'sht'
      ? `<span style="color:var(--text2);font-size:10px;font-family:var(--font-b)">🍾 пляшки</span>`
      : `<span style="color:var(--green);font-size:10px;font-family:var(--font-b)">💧 л</span>`;

    const discDisp = disc
      ? `<div class="inv-pdisc" style="color:var(--amber)">${(p.entered-p.sysQty>0?'+':'')+fmt2(p.entered-p.sysQty)}л</div>`
      : isDone
      ? `<div class="inv-pdisc" style="color:var(--green)">✓ збігається</div>`
      : `<div class="inv-pdisc" style="color:var(--text3)">не внесено</div>`;

    const panel = isOpen ? buildInputPanel(p) : '';

    return `
    <div class="${cardCls}" id="inv-card-${p.id}">
      <div class="inv-prod-row" onclick="window.__inv.toggleProd('${p.id}')">
        <div class="inv-pbar" style="background:${barColor}"></div>
        <div class="inv-pemoji">${p.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="inv-pname">${p.name}</div>
          <div class="inv-pmeta">${p.category} · ${p.vol}л · ${unitBadge}</div>
        </div>
        <div style="margin-right:8px">
          <div class="inv-pqty" style="color:${qtyColor}">${isDone ? fmt2(p.entered)+' л' : '—'}</div>
          <div class="inv-punit">факт</div>
          ${discDisp}
        </div>
        <div class="inv-penter ${isDone?'done':''}" id="inv-ebtn-${p.id}">
          ${isDone
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/></svg>`}
        </div>
      </div>
      ${panel}
    </div>`;
  }).join('');
}

function buildInputPanel(p) {
  const mode = p.unit;

  const modeTabs = `
  <div class="inv-mode-tabs">
    <button class="inv-mtab ${mode==='kg'?'act':''}" onclick="window.__inv.switchMode('${p.id}','kg')">⚖ кг</button>
    <button class="inv-mtab ${mode==='l'?'act':''}"  onclick="window.__inv.switchMode('${p.id}','l')">💧 л</button>
    <button class="inv-mtab ${mode==='sht'?'act':''}" onclick="window.__inv.switchMode('${p.id}','sht')">🍾 пляшки</button>
  </div>`;

  const sysRow = (factId, diffId) => `
  <div class="inv-compare">
    <div class="inv-cblk"><div class="inv-cval" id="${factId}">—</div><div class="inv-clbl">Факт</div></div>
    <div class="inv-carr">→</div>
    <div class="inv-cblk"><div class="inv-cval" style="color:var(--text2)">${fmt2(p.sysQty)}</div><div class="inv-clbl">Система</div></div>
    <div class="inv-carr">→</div>
    <div class="inv-cblk"><div class="inv-cval inv-cdiff" id="${diffId}">—</div><div class="inv-clbl">Різниця</div></div>
  </div>`;

  if (mode === 'kg') {
    // Нова формула: (Вага відкритої − Вага пустої) × Коеф + Повні пляшки × Об'єм
    const coef = p.full > p.empty ? (p.vol / (p.full - p.empty)) : 0;
    const openL = p._openKg > 0 ? Math.max(0, (p._openKg - p.empty) * coef) : 0;
    const totalL = (p._fullBottles || 0) * p.vol + openL;
    const totalMl = Math.round(totalL * 1000);
    const diff = totalL - p.sysQty;
    const hasData = (p._fullBottles > 0 || p._openKg > 0);

    return `<div class="inv-ipanel open">
      ${modeTabs}

      <!-- Повні пляшки -->
      <div>
        <div class="inv-inp-lbl" style="margin-bottom:5px">Повних пляшок (H)</div>
        <div class="inv-stepper">
          <div class="inv-stbtn" onclick="window.__inv.changeFullBottles('${p.id}',-1)">−</div>
          <div class="inv-stdisp">
            <span id="inv-fb-${p.id}">${p._fullBottles||0}</span>
            <span style="font-size:13px;color:var(--text2);margin-left:4px">шт</span>
          </div>
          <div class="inv-stbtn" onclick="window.__inv.changeFullBottles('${p.id}',1)">+</div>
        </div>
      </div>

      <!-- Вага відкритої пляшки -->
      <div>
        <div class="inv-inp-lbl" style="margin-bottom:5px">Вага відкритої пляшки, кг (G)</div>
        <input class="inv-field" id="inv-kg-${p.id}" type="number" step="0.001"
          placeholder="0.000" value="${p._openKg||''}"
          oninput="window.__inv.calcKg('${p.id}')"/>
        <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-align:center">
          Порожня: ${p.empty} кг · Повна: ${p.full} кг · Коеф: ${coef.toFixed(3)}
        </div>
      </div>

      <!-- Live результат -->
      <div class="inv-conv" id="inv-conv-${p.id}">
        <div>
          <div class="inv-conv-formula">
            Залишок відкритої:<br/>
            <span style="color:var(--text1)">(G − ${p.empty}) × ${coef.toFixed(3)} = <strong id="inv-open-l-${p.id}" style="color:var(--teal)">${openL.toFixed(3)} л</strong></span>
          </div>
          <div class="inv-conv-formula" style="margin-top:4px">
            Повний залишок = H×${p.vol} + відкрита
          </div>
        </div>
        <div style="text-align:right">
          <div class="inv-conv-result" id="inv-cr-${p.id}" style="color:${hasData?'var(--green)':'var(--text3)'}">${hasData?totalMl:'—'}</div>
          <div class="inv-conv-unit">мл</div>
          <div style="font-size:13px;font-family:var(--font-h);font-weight:700;color:${hasData?'var(--green)':'var(--text3)'};margin-top:2px" id="inv-cr-l-${p.id}">${hasData?totalL.toFixed(2):'—'}</div>
          <div class="inv-conv-unit">л</div>
        </div>
      </div>

      ${sysRow(`inv-cf-${p.id}`, `inv-cd-${p.id}`)}
      <button class="inv-save" id="inv-save-${p.id}"
        onclick="window.__inv.saveKg('${p.id}')"
        ${hasData?'':'disabled style="opacity:.4"'}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Зберегти
      </button>
      <button class="inv-discard" onclick="window.__inv.closeProd()">Скасувати</button>
    </div>`;
  }

  if (mode === 'sht') {
    const fracs = [0, 0.25, 0.5, 0.75];
    const fracBtns = fracs.map(f =>
      `<button class="inv-frac ${p.enteredFrac===f?'act':''}"
        onclick="window.__inv.setFrac('${p.id}',${f})">${f===0?'Повна':f*100+'%'}</button>`
    ).join('');
    const total = (p.enteredBottles + p.enteredFrac) * p.vol;
    const diff  = total - p.sysQty;
    return `<div class="inv-ipanel open">
      ${modeTabs}
      <div>
        <div class="inv-inp-lbl" style="margin-bottom:5px">Повних пляшок</div>
        <div class="inv-stepper">
          <div class="inv-stbtn" onclick="window.__inv.changeBottles('${p.id}',-1)">−</div>
          <div class="inv-stdisp">
            <span id="inv-bn-${p.id}">${p.enteredBottles}</span>
            <span style="font-size:14px;color:var(--text2);margin-left:4px" id="inv-bf-${p.id}">${p.enteredFrac>0?'+'+p.enteredFrac:'шт'}</span>
          </div>
          <div class="inv-stbtn" onclick="window.__inv.changeBottles('${p.id}',1)">+</div>
        </div>
      </div>
      <div>
        <div class="inv-inp-lbl" style="margin-bottom:5px">Відкрита пляшка — залишилось</div>
        <div class="inv-frac-row">${fracBtns}</div>
      </div>
      <div class="inv-compare">
        <div class="inv-cblk"><div class="inv-cval" id="inv-sf-${p.id}">${fmt2(total)}</div><div class="inv-clbl">Факт, л</div></div>
        <div class="inv-carr">→</div>
        <div class="inv-cblk"><div class="inv-cval" style="color:var(--text2)">${fmt2(p.sysQty)}</div><div class="inv-clbl">Система</div></div>
        <div class="inv-carr">→</div>
        <div class="inv-cblk"><div class="inv-cval inv-cdiff" id="inv-sd-${p.id}" style="color:${diffColor(diff)}">${(diff>=0?'+':'')+fmt2(diff)} л</div><div class="inv-clbl">Різниця</div></div>
      </div>
      <button class="inv-save" onclick="window.__inv.saveSht('${p.id}')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Зберегти
      </button>
      <button class="inv-discard" onclick="window.__inv.closeProd()">Скасувати</button>
    </div>`;
  }

  // mode === 'l'
  const initDiff = p.entered !== null ? p.entered - p.sysQty : null;
  return `<div class="inv-ipanel open">
    ${modeTabs}
    <div>
      <div class="inv-inp-lbl" style="margin-bottom:5px">Фактичний залишок, л</div>
      <input class="inv-field" id="inv-l-${p.id}" type="number" step="0.01"
        placeholder="0.00" value="${p.entered??''}"
        oninput="window.__inv.calcL('${p.id}')"/>
    </div>
    <div class="inv-compare">
      <div class="inv-cblk"><div class="inv-cval" id="inv-lf-${p.id}">${p.entered!==null?fmt2(p.entered):'—'}</div><div class="inv-clbl">Факт</div></div>
      <div class="inv-carr">→</div>
      <div class="inv-cblk"><div class="inv-cval" style="color:var(--text2)">${fmt2(p.sysQty)}</div><div class="inv-clbl">Система</div></div>
      <div class="inv-carr">→</div>
      <div class="inv-cblk"><div class="inv-cval inv-cdiff" id="inv-ld-${p.id}"
        style="color:${initDiff!==null?diffColor(initDiff):'var(--text3)'}">
        ${initDiff!==null?(initDiff>=0?'+':'')+fmt2(initDiff)+' л':'—'}
      </div><div class="inv-clbl">Різниця</div></div>
    </div>
    <button class="inv-save" onclick="window.__inv.saveL('${p.id}')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Зберегти
    </button>
    <button class="inv-discard" onclick="window.__inv.closeProd()">Скасувати</button>
  </div>`;
}

function renderActive() {
  const entered = PRODUCTS.filter(p => p.entered !== null).length;
  const total   = PRODUCTS.length;
  const pct     = Math.round(entered / total * 100);
  const disc    = PRODUCTS.filter(p => p.entered !== null && Math.abs(p.entered - p.sysQty) > 0.05).length;

  return `
  <div class="inv-topbar" style="flex-shrink:0">
    <div class="inv-back" onclick="window.__inv.openLocked()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="inv-title">Інвентаризація</div>
      <div class="inv-sub">08.05.2026 · Закриття зміни</div>
    </div>
    <div style="font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--amber)">${entered}/${total}</div>
  </div>

  <div class="inv-scroll">
    <div class="inv-session-hdr">
      <div class="inv-sh-row">
        <div class="inv-sh-title">Сесія відкрита</div>
        <div class="inv-sh-badge"><div class="inv-sh-bdot"></div>В процесі</div>
      </div>
      <div class="inv-prog"><div class="inv-prog-fill" style="width:${pct}%"></div></div>
      <div class="inv-sh-nums"><span>0</span><span>${pct}%</span><span>${total} позицій</span></div>
    </div>

    <div class="inv-alert inv-alert-amber">
      <div class="inv-alert-icon" style="background:var(--amber-bg)">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v3M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      Заповніть всі позиції до 23:30 — менеджер закриє сесію після
    </div>

    <div class="inv-filters">
      <button class="inv-ftab ${_filter==='all' ?'act':''}" onclick="window.__inv.setFilter('all')">Всі (${total})</button>
      <button class="inv-ftab ${_filter==='done'?'act':''}" onclick="window.__inv.setFilter('done')">Внесено (${entered})</button>
      <button class="inv-ftab ${_filter==='todo'?'act':''}" onclick="window.__inv.setFilter('todo')">Залишилось (${total-entered})</button>
      <button class="inv-ftab ${_filter==='disc'?'act':''}" onclick="window.__inv.setFilter('disc')">Розбіжн. (${disc})</button>
    </div>

    <div class="inv-search">
      <svg class="inv-search-ico" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/>
        <path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <input class="inv-search-inp" placeholder="Пошук товару…"
        value="${_search}" oninput="window.__inv.doSearch(this.value)"/>
    </div>

    <div class="inv-prod-list" id="inv-prod-list">${prodList()}</div>
    <div style="height:14px"></div>
  </div>

  <div class="inv-actions">
    <button class="inv-btn-green" onclick="window.__inv.openLocked()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Завершити інвентаризацію
    </button>
  </div>`;
}

/* ── MANAGER VIEW ── */
function renderCalendar() {
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const sched = [8,16,25];
  const today = 2;
  let html = days.map(d=>`<div class="inv-cal-dn">${d}</div>`).join('');
  for (let i=0; i<4; i++) html += `<div class="inv-cal-d empty"></div>`;
  for (let d=1; d<=31; d++) {
    const cls = ['inv-cal-d',
      d<today ? 'past' : '',
      sched.includes(d) && d>=today ? 'sched' : '',
      d===today ? 'today' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="window.__inv.selectDay(${d},this)">${d}</div>`;
  }
  return html;
}

function renderManager() {
  return `
  <div class="inv-topbar" style="flex-shrink:0">
    <div class="inv-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="inv-title">Інвентаризація</div>
      <div class="inv-sub">Менеджер · Управління</div>
    </div>
  </div>

  <div class="inv-scroll">

    <div style="margin:10px 14px 0;display:flex;gap:8px;align-items:center">
      <button id="inv-syrve-btn" onclick="window.__inv.syncSyrve()"
        style="flex:1;height:44px;background:var(--green);border:none;border-radius:12px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px">
        🔄 Завантажити залишки Syrve
      </button>
    </div>

    <div id="inv-syrve-result" style="margin:8px 14px 0"></div>

    <div class="inv-sec">Розклад сесій — Травень 2026</div>
    <div class="inv-cal">
      <div class="inv-cal-hdr">
        <div class="inv-cal-nav"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 10L4 6l4-4" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="inv-cal-month">Травень 2026</div>
        <div class="inv-cal-nav"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 10l4-4-4-4" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      </div>
      <div class="inv-cal-grid">${renderCalendar()}</div>
    </div>

    <div class="inv-sched-form" id="inv-sched-form">
      <div class="inv-sf-title" id="inv-sf-title">Запланувати сесію — 8 травня</div>
      <div class="inv-sf-row">
        <div class="inv-sf-grp">
          <div class="inv-sf-lbl">Час початку</div>
          <input class="inv-sf-inp" type="time" value="23:00"/>
        </div>
        <div class="inv-sf-grp">
          <div class="inv-sf-lbl">Тип</div>
          <select class="inv-sf-sel">
            <option>Закриття зміни</option>
            <option>Відкриття зміни</option>
            <option>Повна (вся номенклатура)</option>
            <option>Часткова (за категорією)</option>
          </select>
        </div>
      </div>
      <div class="inv-sf-grp">
        <div class="inv-sf-lbl">Відповідальний бармен</div>
        <select class="inv-sf-sel">
          <option>Олексій К. (вечірня зміна)</option>
          <option>Марія П. (денна зміна)</option>
          <option>Будь-який бармен зміни</option>
        </select>
      </div>
      <div class="inv-sf-row">
        <button class="inv-sf-save">Зберегти сесію</button>
        <button class="inv-sf-cancel">Скасувати</button>
      </div>
    </div>

    <div class="inv-sec">
      Налаштування одиниць
      <button class="inv-sec-link">+ Додати товар</button>
    </div>
    <div style="margin:0 14px 8px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;color:var(--purple);font-family:var(--font-b);line-height:1.45">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--purple)" stroke-width="1.2"/><path d="M6.5 4.5v3M6.5 9.5v.4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/></svg>
      Оберіть режим для кожного товару — бармен бачитиме тільки відповідний спосіб введення
    </div>
    <div class="inv-unit-card">
      ${[
        { emoji:'🌿', name:"Hendrick's Gin 0.7л",      formula:'⚖ (факт−0.38)÷0.70×0.70 л', badge:'kg' },
        { emoji:'🍊', name:'Aperol 1л',                 formula:'⚖ (факт−0.52)÷1.00×1.00 л', badge:'kg' },
        { emoji:'🍷', name:'Campari 0.7л',              formula:'💧 Вручну в літрах',          badge:'l'  },
        { emoji:'🥃', name:'Johnnie Walker Black 0.7л', formula:'⚖ (факт−0.42)÷0.73×0.70 л', badge:'kg' },
        { emoji:'🍸', name:'Martini Bianco 1л',         formula:'🍾 Цілі пляшки + частка',     badge:'sht'},
      ].map(u => `
      <div class="inv-urow" onclick="window.__inv.openOverlay('${u.name}')">
        <div class="inv-uemoji">${u.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="inv-uname">${u.name}</div>
          <div class="inv-uformula">${u.formula}</div>
        </div>
        <span class="inv-ubadge inv-ubadge-${u.badge}">${u.badge==='kg'?'кг → л':u.badge==='l'?'л':'пляшки'}</span>
      </div>`).join('')}
    </div>

    <div class="inv-sec">Попередні сесії</div>
    <div class="inv-hist">
      ${[
        { icon:'green', date:'25.04.2026 · Закриття', meta:'Олексій К. · 47 позицій · 23:18', items:'47 ✓', diff:'3 розбіжності', diffColor:'var(--amber)' },
        { icon:'green', date:'18.04.2026 · Повна',    meta:'Марія П. · 52 позиції · 23:41',    items:'52 ✓', diff:'0 розбіжностей', diffColor:'var(--green)' },
        { icon:'red',   date:'11.04.2026 · Закриття', meta:'Олексій К. · 47 позицій · незавершена', items:'31/47', diff:'не завершено', diffColor:'var(--red)' },
      ].map(h => `
      <div class="inv-hrow">
        <div class="inv-hicon" style="background:var(--${h.icon}-bg)">
          ${h.icon==='green'
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/></svg>`}
        </div>
        <div style="flex:1;min-width:0">
          <div class="inv-hdate">${h.date}</div>
          <div class="inv-hmeta">${h.meta}</div>
        </div>
        <div>
          <div class="inv-hitems">${h.items}</div>
          <div class="inv-hdiff" style="color:${h.diffColor}">${h.diff}</div>
        </div>
      </div>`).join('')}
    </div>

    <div style="height:16px"></div>
  </div>

  <!-- Unit settings overlay -->
  <div class="inv-overlay" id="inv-mgr-overlay" onclick="window.__inv.closeOverlay(event)">
    <div class="inv-modal" onclick="event.stopPropagation()">
      <div class="inv-modal-handle"></div>
      <div class="inv-modal-title" id="inv-ov-title">Hendrick's Gin 0.7л</div>
      <div class="inv-modal-sub">Налаштуйте формулу — бармен бачитиме тільки обраний режим</div>
      <div class="inv-modal-modes">
        <button class="inv-mmode act" id="inv-mm-kg"  onclick="window.__inv.setMgrMode('kg')">⚖ кг → л</button>
        <button class="inv-mmode"     id="inv-mm-l"   onclick="window.__inv.setMgrMode('l')">💧 Вручну л</button>
        <button class="inv-mmode"     id="inv-mm-sht" onclick="window.__inv.setMgrMode('sht')">🍾 Пляшки</button>
      </div>
      <div class="inv-modal-row">
        <div class="inv-mgrp"><div class="inv-mlbl">Тара (пуста), кг</div><input class="inv-minp" id="inv-ov-empty" type="number" step="0.001" value="0.380" oninput="window.__inv.updateFormula()"/></div>
        <div class="inv-mgrp"><div class="inv-mlbl">Повна пляшка, кг</div><input class="inv-minp" id="inv-ov-full" type="number" step="0.001" value="1.080" oninput="window.__inv.updateFormula()"/></div>
        <div class="inv-mgrp"><div class="inv-mlbl">Об'єм, л</div><input class="inv-minp" id="inv-ov-vol" type="number" step="0.01" value="0.70" oninput="window.__inv.updateFormula()"/></div>
      </div>
      <div class="inv-formula-box" id="inv-ov-formula">
        <strong id="inv-ov-fstr">(факт − 0.380) ÷ (1.080 − 0.380) × 0.70 = л</strong><br/>
        <span style="font-size:11px" id="inv-ov-fex">Приклад: 0.73кг → <strong style="color:var(--green)">0.35 л</strong></span>
      </div>
      <button class="inv-modal-save" onclick="window.__inv.closeOverlay()">Зберегти</button>
      <button class="inv-modal-close" onclick="window.__inv.closeOverlay()">Скасувати</button>
    </div>
  </div>`;
}

/* ════════════════════════
   MAIN RENDER
════════════════════════ */
function buildHTML() {
  const body = _subView === 'locked'  ? renderLocked()
    : _subView === 'active'           ? renderActive()
    :                                   renderManager();
  return `${CSS}<div class="inv-wrap">${body}</div>`;
}

function fullRender() {
  const view = document.getElementById('app-view');
  if (view) view.innerHTML = buildHTML();
  if (_subView === 'locked') startCountdown();
}

function refreshList() {
  const el = document.getElementById('inv-prod-list');
  if (el) el.innerHTML = prodList();
}

/* ════════════════════════
   COUNTDOWN
════════════════════════ */
function startCountdown() {
  if (_cdInterval) clearInterval(_cdInterval);
  function tick() {
    const target = new Date('2026-05-08T23:00:00');
    const diff = Math.max(0, target - new Date());
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const el = id => document.getElementById(id);
    if (el('inv-cd-d')) el('inv-cd-d').textContent = d;
    if (el('inv-cd-h')) el('inv-cd-h').textContent = h;
    if (el('inv-cd-m')) el('inv-cd-m').textContent = String(m).padStart(2,'0');
  }
  tick();
  _cdInterval = setInterval(tick, 60000);
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function openLocked()  { _subView='locked';  _openId=null; fullRender(); }
function openActive()  { _subView='active';  _openId=null; fullRender(); }
function openManager() { _subView='manager'; _openId=null; fullRender(); }

function setFilter(f) {
  _filter = f;
  refreshList();
  document.querySelectorAll('.inv-ftab').forEach((b,i) => {
    b.classList.toggle('act', ['all','done','todo','disc'][i] === f);
  });
}

function doSearch(q) { _search = q; refreshList(); }

function toggleProd(id) {
  _openId = _openId === id ? null : id;
  refreshList();
  if (_openId) {
    setTimeout(() => {
      document.getElementById('inv-card-'+_openId)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 80);
  }
}
function closeProd() { _openId = null; refreshList(); }

function switchMode(id, mode) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (p) { p.unit = mode; refreshList(); }
}

/* kg calc — нова формула з двома полями */
function changeFullBottles(id, delta) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  p._fullBottles = Math.max(0, (p._fullBottles||0) + delta);
  _updateKgDisplay(id);
}

function calcKg(id) {
  const p   = PRODUCTS.find(x=>x.id===id);
  const inp = document.getElementById('inv-kg-'+id);
  const kg  = parseFloat(inp?.value);
  if (p) p._openKg = isNaN(kg) ? 0 : kg;
  _updateKgDisplay(id);
}

function _updateKgDisplay(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  const coef   = p.full > p.empty ? (p.vol / (p.full - p.empty)) : 0;
  const openKg = p._openKg || 0;
  const fullB  = p._fullBottles || 0;
  const openL  = openKg > 0 ? Math.max(0, (openKg - p.empty) * coef) : 0;
  const totalL = fullB * p.vol + openL;
  const totalMl = Math.round(totalL * 1000);
  const diff   = totalL - p.sysQty;
  const hasData = fullB > 0 || openKg > 0;

  // Update full bottles display
  const fbEl = document.getElementById('inv-fb-'+id);
  if (fbEl) fbEl.textContent = fullB;

  // Update open litres display
  const olEl = document.getElementById('inv-open-l-'+id);
  if (olEl) olEl.textContent = openL.toFixed(3)+' л';

  // Update total displays
  const crEl = document.getElementById('inv-cr-'+id);
  if (crEl) { crEl.textContent = hasData ? totalMl : '—'; crEl.style.color = hasData?'var(--green)':'var(--text3)'; }
  const clEl = document.getElementById('inv-cr-l-'+id);
  if (clEl) { clEl.textContent = hasData ? totalL.toFixed(2) : '—'; clEl.style.color = hasData?'var(--green)':'var(--text3)'; }

  // Update comparison row
  const cfEl = document.getElementById('inv-cf-'+id);
  if (cfEl) cfEl.textContent = fmt2(totalL);
  const cdEl = document.getElementById('inv-cd-'+id);
  if (cdEl) { cdEl.textContent = (diff>=0?'+':'')+fmt2(diff)+' л'; cdEl.style.color = diffColor(diff); }

  // Enable/disable save button
  const save = document.getElementById('inv-save-'+id);
  if (save) { save.disabled = !hasData; save.style.opacity = hasData?'1':'.4'; }

  p._tempL = totalL;
}
function saveKg(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p || p._tempL === undefined) return;
  p.entered = parseFloat(fmt2(p._tempL));
  _openId = null;
  refreshList();
}

/* bottles */
function changeBottles(id, delta) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  p.enteredBottles = Math.max(0, p.enteredBottles + delta);
  updateShtDisplay(id);
}
function setFrac(id, frac) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  p.enteredFrac = frac;
  document.querySelectorAll(`#inv-card-${id} .inv-frac`).forEach((b,i) => {
    b.classList.toggle('act', [0,0.25,0.5,0.75][i] === frac);
  });
  updateShtDisplay(id);
}
function updateShtDisplay(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  const total = (p.enteredBottles + p.enteredFrac) * p.vol;
  const bn = document.getElementById('inv-bn-'+id);
  const bf = document.getElementById('inv-bf-'+id);
  if (bn) bn.textContent = p.enteredBottles;
  if (bf) bf.textContent = p.enteredFrac > 0 ? '+'+p.enteredFrac : 'шт';
  const sf = document.getElementById('inv-sf-'+id);
  if (sf) sf.textContent = fmt2(total);
  const sd = document.getElementById('inv-sd-'+id);
  if (sd) { const d=total-p.sysQty; sd.textContent=(d>=0?'+':'')+fmt2(d)+' л'; sd.style.color=diffColor(d); }
  p._tempL = total;
}
function saveSht(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  if (!p) return;
  p.entered = parseFloat(fmt2((p.enteredBottles + p.enteredFrac) * p.vol));
  _openId = null;
  refreshList();
}

/* litres direct */
function calcL(id) {
  const p   = PRODUCTS.find(x=>x.id===id);
  const inp = document.getElementById('inv-l-'+id);
  const val = parseFloat(inp?.value);
  if (!p || isNaN(val)) return;
  const lf = document.getElementById('inv-lf-'+id);
  if (lf) lf.textContent = fmt2(val);
  const ld = document.getElementById('inv-ld-'+id);
  if (ld) { const d=val-p.sysQty; ld.textContent=(d>=0?'+':'')+fmt2(d)+' л'; ld.style.color=diffColor(d); }
  p._tempL = val;
}
function saveL(id) {
  const p   = PRODUCTS.find(x=>x.id===id);
  const inp = document.getElementById('inv-l-'+id);
  const val = parseFloat(inp?.value);
  if (!p || isNaN(val)) return;
  p.entered = parseFloat(fmt2(val));
  _openId = null;
  refreshList();
}

/* calendar */
function selectDay(d, el) {
  document.querySelectorAll('.inv-cal-d').forEach(e => e.classList.remove('sel'));
  el.classList.add('sel');
  const t = document.getElementById('inv-sf-title');
  if (t) t.textContent = `Запланувати сесію — ${d} травня`;
}

/* mgr overlay */
function openOverlay(name) {
  _mgrOverlay = name;
  const p   = PRODUCTS.find(x => x.name === name || name.startsWith(x.name.split(' ')[0]));
  const ov  = document.getElementById('inv-mgr-overlay');
  const ttl = document.getElementById('inv-ov-title');
  if (ov)  ov.classList.add('open');
  if (ttl) ttl.textContent = name;
  // Populate fields from product data
  if (p) {
    const eEl = document.getElementById('inv-ov-empty');
    const fEl = document.getElementById('inv-ov-full');
    const vEl = document.getElementById('inv-ov-vol');
    if (eEl) eEl.value = p.empty;
    if (fEl) fEl.value = p.full;
    if (vEl) vEl.value = p.vol;
    // Set mode buttons
    ['kg','l','sht'].forEach(k => {
      document.getElementById('inv-mm-'+k)?.classList.toggle('act', k === p.unit);
    });
  }
  updateFormula();
}
function closeOverlay(e) {
  if (!e || e.target === document.getElementById('inv-mgr-overlay')) {
    // Save settings back to product
    const p = PRODUCTS.find(x => x.name === _mgrOverlay || (_mgrOverlay||'').startsWith(x.name.split(' ')[0]));
    if (p) {
      const empty = parseFloat(document.getElementById('inv-ov-empty')?.value);
      const full  = parseFloat(document.getElementById('inv-ov-full')?.value);
      const vol   = parseFloat(document.getElementById('inv-ov-vol')?.value);
      const mode  = ['kg','l','sht'].find(k => document.getElementById('inv-mm-'+k)?.classList.contains('act')) || p.unit;
      if (!isNaN(empty)) p.empty = empty;
      if (!isNaN(full))  p.full  = full;
      if (!isNaN(vol))   p.vol   = vol;
      p.unit = mode;
    }
    document.getElementById('inv-mgr-overlay')?.classList.remove('open');
  }
}
function setMgrMode(m) {
  ['kg','l','sht'].forEach(k => {
    document.getElementById('inv-mm-'+k)?.classList.toggle('act', k===m);
  });
}
function updateFormula() {
  const empty = parseFloat(document.getElementById('inv-ov-empty')?.value) || 0;
  const full  = parseFloat(document.getElementById('inv-ov-full')?.value)  || 0;
  const vol   = parseFloat(document.getElementById('inv-ov-vol')?.value)   || 0;
  const range = (full - empty) || 1;
  const exKg  = empty + range * 0.5;
  const exL   = (exKg - empty) / range * vol;
  const fstr  = document.getElementById('inv-ov-fstr');
  const fex   = document.getElementById('inv-ov-fex');
  if (fstr) fstr.textContent = `(факт − ${empty.toFixed(3)}) ÷ (${full.toFixed(3)} − ${empty.toFixed(3)}) × ${vol.toFixed(2)} = л`;
  if (fex)  fex.innerHTML   = `Приклад: ${exKg.toFixed(3)}кг → <strong style="color:var(--green)">${exL.toFixed(3)} л</strong>`;
}

/* ════════════════════════
   SYRVE SYNC
════════════════════════ */
async function syncSyrve() {
  if (_syrveLoading) return;
  _syrveLoading = true;

  const btn = document.getElementById('inv-syrve-btn');
  const out = document.getElementById('inv-syrve-result');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Завантаження...'; }
  if (out) out.innerHTML = '';

  try {
    const venueId = localStorage.getItem('barops_venueId');
    const token   = localStorage.getItem('barops_token');
    const API     = 'https://barops-backend-production.up.railway.app';

    const res  = await fetch(`${API}/api/pos/balance/${venueId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Помилка');

    _syrveBalance = data.stores;

    // Будуємо HTML таблицю залишків
    let html = '';
    for (const store of data.stores) {
      html += `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;color:var(--text2);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-b);padding:8px 0 6px">
            🏪 ${store.storeName}
          </div>
          <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;overflow:hidden">
            ${store.items.length === 0
              ? `<div style="padding:14px;font-size:13px;color:var(--text2);font-family:var(--font-b);text-align:center">Немає залишків</div>`
              : store.items.map(i => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:0.5px solid var(--border)">
                  <div style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${i.name}</div>
                  <div style="font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)">
                    ${Number(i.amount).toFixed(3)} <span style="font-size:10px;color:var(--text2);font-weight:400">${i.unit}</span>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>`;
    }

    if (out) out.innerHTML = html;
    if (btn) { btn.disabled = false; btn.innerHTML = '✅ Оновлено · Оновити знову'; }

  } catch (err) {
    if (out) out.innerHTML = `<div style="padding:12px 14px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:12px;font-size:13px;color:var(--red);font-family:var(--font-b)">❌ ${err.message}</div>`;
    if (btn) { btn.disabled = false; btn.innerHTML = '🔄 Завантажити залишки Syrve'; }
  } finally {
    _syrveLoading = false;
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    if (_cdInterval) clearInterval(_cdInterval);
    _cdInterval = null;
    _openId  = null;
    _filter  = 'all';
    _search  = '';
    // role-based starting sub-view
    _subView = state.role === 'manager' ? 'manager' : 'locked';
    return buildHTML();
  },

  init() {
    window.__inv = {
      openLocked, openActive, openManager, syncSyrve,
      setFilter, doSearch, toggleProd, closeProd, switchMode,
      calcKg, changeFullBottles, saveKg,
      changeBottles, setFrac, saveSht, calcL, saveL,
      selectDay, openOverlay, closeOverlay, setMgrMode, updateFormula,
    };
    if (_subView === 'locked') startCountdown();
  },
};
