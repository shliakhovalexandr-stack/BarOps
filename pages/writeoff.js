/* ============================================================
   BarOps — pages/writeoff.js
   Списання: Бармен (список + 4-крокова форма) + Менеджер (аналітика + журнал)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const PRODS = [
  { id:'p1',  name:"Hendrick's Gin",              emoji:'🌿', vol:0.7,  stock:0.4,  price:817  },
  { id:'p2',  name:'Aperol',                       emoji:'🍊', vol:1.0,  stock:3.4,  price:348  },
  { id:'p3',  name:'Campari',                      emoji:'🍷', vol:0.7,  stock:2.1,  price:412  },
  { id:'p4',  name:'Johnnie Walker Black',         emoji:'🥃', vol:0.7,  stock:1.2,  price:680  },
  { id:'p5',  name:'Martini Bianco',               emoji:'🍸', vol:1.0,  stock:2.0,  price:265  },
  { id:'p6',  name:'Tanqueray Flor de Sevilla Gin',emoji:'🌸', vol:0.7,  stock:0.7,  price:817  },
  { id:'p7',  name:'Baileys Irish Cream',          emoji:'🍫', vol:0.7,  stock:0.8,  price:510  },
  { id:'p8',  name:'Prosecco DOC',                 emoji:'🍾', vol:0.75, stock:4.5,  price:287  },
  { id:'p9',  name:'Kahlúa',                       emoji:'☕', vol:0.7,  stock:0.5,  price:620  },
  { id:'p10', name:'Горілка Традиційна Українка',  emoji:'🇺🇦', vol:0.7, stock:8.4,  price:130  },
];

const REASONS = {
  biy:  ['Розбита пляшка (бій при роботі)', 'Пошкодження при транспортуванні', 'Падіння з полиці/стійки', 'Тріснула тара при відкритті'],
  psuv: ['Відкрита понад 48 годин', 'Змінився колір/запах', 'Прострочений термін придатності', 'Контакт з іншими рідинами'],
  deg:  ['Дегустація для гостя', 'Дегустація персоналом', 'Презентація нового меню', 'Навчання бармена'],
  insh: ['Помилковий налив', 'Технічні потреби (чистка обладнання)', 'Втрати при переливанні', 'Інша причина (вказати вручну)'],
};

const CAT = {
  biy:  { label:'💥 Бій',        color:'var(--red)',    bg:'var(--red-bg)',    border:'var(--red-border)',    selCls:'sel-biy'  },
  psuv: { label:'🍂 Псування',   color:'var(--amber)',  bg:'var(--amber-bg)',  border:'var(--amber-border)',  selCls:'sel-psuv' },
  deg:  { label:'🍸 Дегустація', color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)',  selCls:'sel-deg'  },
  insh: { label:'📋 Інше',       color:'var(--purple)', bg:'var(--purple-bg)', border:'var(--purple-border)', selCls:'sel-insh' },
};

// Demo write-offs already in the log
const EXISTING_WRITEOFFS = [
  { cat:'biy',  prod:"Hendrick's Gin 0.7л",         emoji:'🌿', meta:'💥 Бій · Розбита пляшка при відкритті зміни', vol:'−0.7л', valColor:'var(--red)',   time:'18:05' },
  { cat:'psuv', prod:'Aperol 1л',                   emoji:'🍊', meta:'🍂 Псування · Відкрита пляшка понад 48год',  vol:'−0.3л', valColor:'var(--amber)', time:'17:20' },
  { cat:'deg',  prod:'Tanqueray Flor de Sevilla Gin',emoji:'🌸', meta:'🍸 Дегустація · Погодила менеджер',         vol:'−0.05л',valColor:'var(--green)', time:'16:40' },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _view       = 'bartender'; // 'bartender' | 'manager'
let _catFilter  = 'all';
let _formOpen   = false;
let _formStep   = 1;
let _selCat     = null;
let _selProd    = null;
let _selVol     = null;
let _selReason  = null;
let _prodSearch = '';
let _mgrPeriod  = 'day';
let _mgrFilter  = 'all';
let _succOpen   = false;

/* KPI data by period */
const MGR_KPI = {
  day:    { count:'3',  vol:'1.05л', loss:'612₴'    },
  week:   { count:'12', vol:'5.8л',  loss:'3 240₴'  },
  month:  { count:'38', vol:'18.2л', loss:'10 450₴' },
  custom: { count:'—',  vol:'—',     loss:'—'        },
};

/* Chart data */
const CHART_DATA = [
  {biy:1,psuv:0,deg:1,insh:0},
  {biy:0,psuv:1,deg:0,insh:1},
  {biy:2,psuv:1,deg:1,insh:0},
  {biy:0,psuv:0,deg:2,insh:0},
  {biy:1,psuv:2,deg:0,insh:1},
  {biy:3,psuv:1,deg:1,insh:0},
  {biy:1,psuv:1,deg:1,insh:0},
];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="wo-css">
.wo-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.wo-scroll{overflow-y:auto;flex:1}.wo-scroll::-webkit-scrollbar{width:0}

/* topbar */
.wo-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.wo-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.wo-back:active{background:var(--bg3)}
.wo-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.wo-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* today summary */
.wo-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.wo-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r,12px);padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.wo-stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 12px 12px}
.wo-stat-r::after{background:var(--red)}.wo-stat-a::after{background:var(--amber)}.wo-stat-p::after{background:var(--purple)}
.wo-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.wo-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;line-height:1.3}

/* alert strip */
.wo-alert{margin:0 14px 10px;border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5;background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.wo-alert-icon{width:26px;height:26px;border-radius:8px;background:rgba(239,159,39,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* sec label */
.wo-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.wo-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* cat pills */
.wo-pills{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-pills::-webkit-scrollbar{height:0}
.wo-pill{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:5px 13px;border-radius:20px;border:0.5px solid var(--border2);color:var(--text2);background:transparent;cursor:pointer;font-size:12px;font-family:var(--font-b);transition:all .15s}
.wo-pill-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.wo-pill.pill-all.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-biy.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-psuv.act{background:var(--amber-bg);border-color:var(--amber-border);color:var(--text0)}
.wo-pill.pill-deg.act{background:var(--green-bg);border-color:var(--green-border);color:var(--text0)}
.wo-pill.pill-insh.act{background:var(--purple-bg);border-color:var(--purple-border);color:var(--text0)}

/* write-off list */
.wo-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.wo-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;display:flex;align-items:center;gap:10px;padding:11px 13px;transition:background .12s}
.wo-bar{width:3px;height:38px;border-radius:2px;flex-shrink:0}
.wo-emoji{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.wo-info{flex:1;min-width:0}
.wo-name{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-meta{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.wo-right{text-align:right;flex-shrink:0}
.wo-vol{font-family:var(--font-h);font-size:15px;font-weight:700}
.wo-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}

/* add button */
.wo-add{display:flex;align-items:center;gap:10px;padding:13px;background:var(--red-bg);border:0.5px dashed var(--red-border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-add:hover{background:rgba(226,75,74,.12)}
.wo-add:active{transform:scale(.98)}
.wo-add-icon{width:34px;height:34px;border-radius:9px;background:rgba(226,75,74,.12);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wo-add-text{font-size:14px;color:var(--red);font-family:var(--font-b);font-weight:500}
.wo-add-sub{font-size:11px;color:rgba(226,75,74,.5);font-family:var(--font-b);margin-top:1px}

/* ── FORM SHEET ── */
.wo-form-overlay{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.wo-form-overlay.open{display:flex}
.wo-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);padding:0 0 28px;animation:woSlide .32s cubic-bezier(.22,1,.36,1);max-height:92%;display:flex;flex-direction:column}
@keyframes woSlide{from{transform:translateY(100%)}to{transform:none}}
.wo-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 16px;flex-shrink:0}
.wo-sheet-hdr{padding:0 18px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wo-sheet-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.wo-sheet-close{width:30px;height:30px;border-radius:50%;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer}

/* step dots */
.wo-dots{display:flex;gap:5px;justify-content:center;margin-bottom:18px;flex-shrink:0}
.wo-dot{width:8px;height:8px;border-radius:50%;background:var(--bg4);transition:all .2s}
.wo-dot.act{background:var(--red);width:20px;border-radius:4px}
.wo-dot.done{background:var(--green)}

.wo-scroll2{overflow-y:auto;flex:1;padding:0 18px}
.wo-scroll2::-webkit-scrollbar{width:0}

/* form steps */
.wo-fstep{display:none;flex-direction:column;gap:14px}
.wo-fstep.act{display:flex;animation:woFadeUp .25s ease both}
@keyframes woFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* cat grid */
.wo-cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wo-cat-card{background:var(--bg3);border:0.5px solid var(--border2);border-radius:16px;padding:14px 12px;cursor:pointer;transition:all .18s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
.wo-cat-card:active{transform:scale(.96)}
.wo-cat-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.wo-cat-name{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.wo-cat-desc{font-size:10px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.sel-biy{border-color:var(--red-border)!important;background:var(--red-bg)!important}
.sel-psuv{border-color:var(--amber-border)!important;background:var(--amber-bg)!important}
.sel-deg{border-color:var(--green-border)!important;background:var(--green-bg)!important}
.sel-insh{border-color:var(--purple-border)!important;background:var(--purple-bg)!important}

/* prod list */
.wo-prod-search-wrap{position:relative}
.wo-prod-search-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);pointer-events:none}
.wo-prod-inp{width:100%;height:48px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:0 14px 0 38px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}
.wo-prod-inp:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(226,75,74,.1)}
.wo-prod-inp::placeholder{color:var(--text2)}
.wo-prod-list{display:flex;flex-direction:column;gap:5px;max-height:220px;overflow-y:auto}
.wo-prod-list::-webkit-scrollbar{width:0}
.wo-prod-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-prod-item:active{transform:scale(.98)}
.wo-prod-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-pi-emoji{width:32px;height:32px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.wo-pi-name{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-pi-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-pi-check{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wo-prod-item.sel .wo-pi-check{background:var(--red);border-color:var(--red)}

/* volume step */
.wo-vol-row{display:flex;gap:8px;align-items:stretch}
.wo-vol-field{flex:1;height:64px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;font-size:28px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;text-align:center;transition:border-color .2s}
.wo-vol-field:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(226,75,74,.1)}
.wo-vol-unit{width:72px;height:64px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;cursor:pointer;flex-shrink:0;-webkit-appearance:none;appearance:none;text-align:center}
.wo-presets{display:flex;gap:6px;flex-wrap:wrap}
.wo-preset{flex:1;min-width:56px;height:36px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-preset:active{transform:scale(.95)}
.wo-preset.act{background:var(--red-bg);border-color:var(--red-border);color:var(--red)}
.wo-stock-preview{background:var(--bg3);border:0.5px solid var(--border);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:center}
.wo-sp-label{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.wo-sp-name{font-family:var(--font-h);font-size:13px;color:var(--text0);font-weight:600;margin-top:2px}
.wo-sp-before{font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:right}
.wo-sp-after{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--red);text-align:right}

/* reason step */
.wo-reason-list{display:flex;flex-direction:column;gap:6px}
.wo-reason-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-reason-item:active{transform:scale(.98)}
.wo-reason-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-reason-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-reason-text{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-custom-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.wo-textarea{width:100%;height:78px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:11px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);resize:none;outline:none;line-height:1.5;transition:border-color .2s}
.wo-textarea:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(226,75,74,.1)}
.wo-textarea::placeholder{color:var(--text2)}

/* summary */
.wo-summary-card{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:9px}
.wo-sum-row{display:flex;justify-content:space-between;align-items:center}
.wo-sum-label{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.wo-sum-val{font-size:13px;color:var(--text1);font-family:var(--font-b);text-align:right}
.wo-sum-val-big{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--red);text-align:right}
.wo-sum-div{height:0.5px;background:var(--red-border)}

/* form nav */
.wo-fnav{display:flex;gap:8px;padding:14px 18px 0;flex-shrink:0}
.wo-fnext{flex:1;height:50px;background:var(--red);border:none;border-radius:12px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.wo-fnext:active{background:var(--red-d)}
.wo-fnext:disabled{opacity:.35;cursor:default}
.wo-fback{width:50px;height:50px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.wo-fback:active{background:var(--bg4)}

/* success overlay */
.wo-succ-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.wo-succ-overlay.open{display:flex}
.wo-succ-icon{width:72px;height:72px;border-radius:50%;background:var(--red-bg);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;margin-bottom:18px;animation:woPop .4s cubic-bezier(.22,1,.36,1)}
@keyframes woPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.wo-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.wo-succ-sub{font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:6px}
.wo-succ-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:20px;font-size:12px;color:var(--red);font-family:var(--font-b);margin-bottom:22px}
.wo-succ-btn{width:100%;max-width:280px;height:50px;background:var(--red);border:none;border-radius:12px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px}
.wo-succ-btn:active{background:var(--red-d)}
.wo-succ-ghost{width:100%;max-width:280px;height:44px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);margin-top:8px}

/* ── MANAGER VIEW ── */
.wo-period-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.wo-pt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-pt.act{background:var(--bg3);color:var(--text0)}

.wo-mgr-kpi{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 4px}
.wo-mk{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 10px;text-align:center}
.wo-mk-val{font-family:var(--font-h);font-size:20px;font-weight:700;line-height:1}
.wo-mk-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

.wo-chart-card{margin:0 14px 4px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:16px}
.wo-chart-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);margin-bottom:12px}
.wo-chart-bars{display:flex;align-items:flex-end;gap:4px;height:60px;margin-bottom:6px}
.wo-cbar{flex:1;display:flex;flex-direction:column;justify-content:flex-end}
.wo-cbar-inner{border-radius:4px 4px 0 0;overflow:hidden;display:flex;flex-direction:column}
.wo-cbar-seg{flex:1}
.wo-chart-labels{display:flex;justify-content:space-between;font-size:9px;color:var(--text2);font-family:var(--font-b)}
.wo-chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}
.wo-cl{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2);font-family:var(--font-b)}
.wo-cl-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}

.wo-cat-breakdown{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.wo-cb-row{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px}
.wo-cb-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.wo-cb-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.wo-cb-bar-wrap{height:4px;background:var(--bg3);border-radius:2px;margin-top:5px;overflow:hidden}
.wo-cb-fill{height:100%;border-radius:2px}
.wo-cb-count{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right}
.wo-cb-pct{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

.wo-report-card{margin:0 14px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:16px;padding:14px 16px}
.wo-rc-title{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);margin-bottom:4px}
.wo-rc-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:12px;line-height:1.5}
.wo-rc-btns{display:flex;gap:6px}
.wo-rcbtn{flex:1;height:40px;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-family:var(--font-b);font-weight:500;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.wo-rcbtn:active{transform:scale(.96)}
.wo-rcbtn-pdf{background:var(--red);color:#fff}
.wo-rcbtn-csv{background:var(--bg3);border:0.5px solid var(--border2);color:var(--text1)}
.wo-rcbtn-tg{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}

.wo-filter-row{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-filter-row::-webkit-scrollbar{height:0}
.wo-fr-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;border:0.5px solid var(--border2);color:var(--text2);background:transparent;font-size:11px;font-family:var(--font-b);cursor:pointer;transition:all .15s}
.wo-fr-pill.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

.wo-log{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-log-item{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.wo-log-item:last-child{border-bottom:none}
.wo-log-item:active{background:var(--bg3)}
.wo-log-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-log-title{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.wo-log-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-log-qty{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right}
.wo-log-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

.wo-toplosers{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-loser-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:0.5px solid var(--border)}
.wo-loser-row:last-child{border-bottom:none}
.wo-loser-rank{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text3);width:18px;flex-shrink:0}
.wo-loser-name{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-loser-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-loser-val{font-family:var(--font-h);font-size:14px;font-weight:700}
</style>`;

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
function woList() {
  return EXISTING_WRITEOFFS
    .filter(w => _catFilter === 'all' || w.cat === _catFilter)
    .map(w => `
    <div class="wo-card" data-cat="${w.cat}">
      <div class="wo-bar" style="background:${CAT[w.cat]?.color||'var(--text2)'}"></div>
      <div class="wo-emoji">${w.emoji}</div>
      <div class="wo-info">
        <div class="wo-name">${w.prod}</div>
        <div class="wo-meta">${w.meta}</div>
      </div>
      <div class="wo-right">
        <div class="wo-vol" style="color:${w.valColor}">${w.vol}</div>
        <div class="wo-time">${w.time}</div>
      </div>
    </div>`).join('');
}

function renderBartender() {
  return `
  <div class="wo-topbar" style="flex-shrink:0">
    <div class="wo-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="wo-title">Списання</div>
      <div class="wo-sub">${state.venue} · Зміна від 08.05.2026</div>
    </div>
    <div style="font-family:var(--font-h);font-size:12px;color:var(--red);font-weight:700">${EXISTING_WRITEOFFS.length} записи</div>
  </div>

  <div class="wo-scroll">
    <!-- Today stats -->
    <div class="wo-summary">
      <div class="wo-stat wo-stat-r">
        <div class="wo-stat-val" style="color:var(--red)">${EXISTING_WRITEOFFS.length}</div>
        <div class="wo-stat-lbl">Записів<br/>сьогодні</div>
      </div>
      <div class="wo-stat wo-stat-a">
        <div class="wo-stat-val" style="color:var(--amber)">1.05л</div>
        <div class="wo-stat-lbl">Загальний<br/>об'єм</div>
      </div>
      <div class="wo-stat wo-stat-p">
        <div class="wo-stat-val" style="color:var(--purple)">612₴</div>
        <div class="wo-stat-lbl">Збиток<br/>за зміну</div>
      </div>
    </div>

    <!-- Alert -->
    <div class="wo-alert">
      <div class="wo-alert-icon">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v3M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      Hendrick's Gin — 3 бої за останній місяць. Менеджер отримає сповіщення.
    </div>

    <!-- Category filter -->
    <div class="wo-sec" style="padding-top:4px">Фільтр за категорією</div>
    <div class="wo-pills">
      ${[['all','Всі','var(--red)','pill-all'],['biy','Бій','var(--red)','pill-biy'],['psuv','Псування','var(--amber)','pill-psuv'],['deg','Дегустація','var(--green)','pill-deg'],['insh','Інше','var(--purple)','pill-insh']]
        .map(([cat,label,col,cls]) => `
        <div class="wo-pill ${cls} ${_catFilter===cat?'act':''}" onclick="window.__wo.setCatFilter('${cat}')">
          <div class="wo-pill-dot" style="background:${col}"></div>${label}
        </div>`).join('')}
    </div>

    <!-- List -->
    <div class="wo-sec">
      Список за зміну
      <button class="wo-sec-link">Звіт →</button>
    </div>
    <div class="wo-list" id="wo-list">${woList()}</div>

    <!-- Add button -->
    <div style="padding:8px 14px 0">
      <div class="wo-add" onclick="window.__wo.openForm()">
        <div class="wo-add-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Додати списання</div>
          <div class="wo-add-sub">Бій · Псування · Дегустація · Інше</div>
        </div>
      </div>
    </div>

    <div style="height:16px"></div>
  </div>

  <!-- ── FORM SHEET ── -->
  <div class="wo-form-overlay ${_formOpen?'open':''}" id="wo-form-overlay"
       onclick="window.__wo.maybeClose(event)">
    <div class="wo-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div class="wo-sheet-title" id="wo-sheet-title">Нове списання</div>
        <div class="wo-sheet-close" onclick="window.__wo.closeForm()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>

      <!-- Step dots -->
      <div class="wo-dots">
        ${[1,2,3,4].map(i => `<div class="wo-dot ${_formStep===i?'act':_formStep>i?'done':''}" id="wdot${i}"></div>`).join('')}
      </div>

      <div class="wo-scroll2" id="wo-scroll2">

        <!-- Step 1: Category -->
        <div class="wo-fstep ${_formStep===1?'act':''}" id="wfstep1">
          <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть причину списання</div>
          <div class="wo-cat-grid">
            <div class="wo-cat-card ${_selCat==='biy'?'sel-biy':''}" id="wcat-biy" onclick="window.__wo.selectCat('biy')">
              <div class="wo-cat-icon" style="background:var(--red-bg)">💥</div>
              <div class="wo-cat-name">Бій</div>
              <div class="wo-cat-desc">Розбита тара, механічне пошкодження</div>
            </div>
            <div class="wo-cat-card ${_selCat==='psuv'?'sel-psuv':''}" id="wcat-psuv" onclick="window.__wo.selectCat('psuv')">
              <div class="wo-cat-icon" style="background:var(--amber-bg)">🍂</div>
              <div class="wo-cat-name">Псування</div>
              <div class="wo-cat-desc">Прострочення, зміна якості</div>
            </div>
            <div class="wo-cat-card ${_selCat==='deg'?'sel-deg':''}" id="wcat-deg" onclick="window.__wo.selectCat('deg')">
              <div class="wo-cat-icon" style="background:var(--green-bg)">🍸</div>
              <div class="wo-cat-name">Дегустація</div>
              <div class="wo-cat-desc">Персонал, гості, презентація</div>
            </div>
            <div class="wo-cat-card ${_selCat==='insh'?'sel-insh':''}" id="wcat-insh" onclick="window.__wo.selectCat('insh')">
              <div class="wo-cat-icon" style="background:var(--purple-bg)">📋</div>
              <div class="wo-cat-name">Інше</div>
              <div class="wo-cat-desc">Вказати вручну</div>
            </div>
          </div>
        </div>

        <!-- Step 2: Product -->
        <div class="wo-fstep ${_formStep===2?'act':''}" id="wfstep2">
          <div class="wo-prod-search-wrap">
            <svg class="wo-prod-search-ico" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/>
              <path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            <input class="wo-prod-inp" id="wo-prod-search" placeholder="Пошук товару…"
              value="${_prodSearch}" oninput="window.__wo.searchProds(this.value)"/>
          </div>
          <div class="wo-prod-list" id="wo-prod-list">${prodListHTML()}</div>
        </div>

        <!-- Step 3: Volume -->
        <div class="wo-fstep ${_formStep===3?'act':''}" id="wfstep3">
          <div>
            <div class="wo-custom-lbl">Об'єм списання</div>
            <div class="wo-vol-row">
              <input class="wo-vol-field" id="wo-vol-input" type="number" step="0.01"
                placeholder="0.00" value="${_selVol||''}"
                oninput="window.__wo.updateVol()"/>
              <select class="wo-vol-unit" id="wo-vol-unit" onchange="window.__wo.updateVol()">
                <option value="l">л</option>
                <option value="ml">мл</option>
                <option value="sht">шт</option>
                <option value="kg">кг</option>
              </select>
            </div>
          </div>
          <div class="wo-presets">
            ${[0.05,0.1,0.35,0.7,1.0].map((v,i) =>
              `<button class="wo-preset ${_selVol===v?'act':''}"
                onclick="window.__wo.setVol(${v})">${['0.05 л','0.1 л','½ пляш.','1 пляш.','1.0 л'][i]}</button>`
            ).join('')}
          </div>
          <div class="wo-stock-preview">
            <div>
              <div class="wo-sp-label">Поточний залишок</div>
              <div class="wo-sp-name" id="wo-sp-name">${_selProd?_selProd.name:'—'}</div>
            </div>
            <div>
              <div class="wo-sp-before" id="wo-sp-before">${_selProd?_selProd.stock.toFixed(2)+' л':'—'}</div>
              <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin:2px 0;text-align:right">після списання</div>
              <div class="wo-sp-after" id="wo-sp-after">— л</div>
            </div>
          </div>
        </div>

        <!-- Step 4: Reason + Confirm -->
        <div class="wo-fstep ${_formStep===4?'act':''}" id="wfstep4">
          <div>
            <div class="wo-custom-lbl">Причина (швидкий вибір)</div>
            <div class="wo-reason-list" id="wo-reason-list">${reasonListHTML()}</div>
          </div>
          <div>
            <div class="wo-custom-lbl">Або введіть вручну</div>
            <textarea class="wo-textarea" id="wo-reason-custom"
              placeholder="Опишіть деталі: де, коли, хто присутній…">${_selReason||''}</textarea>
          </div>
          ${summaryHTML()}
        </div>

      </div><!-- scroll2 -->

      <!-- Form nav -->
      <div class="wo-fnav">
        <div class="wo-fback" id="wo-fback" style="${_formStep>1?'':'display:none'}"
             onclick="window.__wo.prevStep()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <button class="wo-fnext" id="wo-fnext" onclick="window.__wo.nextStep()"
          ${(_formStep===1&&!_selCat)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol)?'disabled style="opacity:.35"':''}>
          ${_formStep===4
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Зафіксувати списання`
            : `Далі <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 11l6-4-6-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
        </button>
      </div>
    </div>
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="wo-succ-overlay ${_succOpen?'open':''}" id="wo-succ-overlay">
    <div class="wo-succ-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M9 17l6 6 12-12" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="wo-succ-title">Списання зафіксовано</div>
    <div class="wo-succ-sub" id="wo-succ-sub">Запис збережено</div>
    <div class="wo-succ-pill" id="wo-succ-pill">—</div>
    <button class="wo-succ-btn" onclick="window.__wo.closeSuccess()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Додати ще одне
    </button>
    <button class="wo-succ-ghost" onclick="window.__wo.closeSuccessExit()">Готово</button>
  </div>`;
}

function prodListHTML() {
  const q = _prodSearch.toLowerCase();
  return PRODS
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .map(p => `
    <div class="wo-prod-item ${_selProd?.id===p.id?'sel':''}" onclick="window.__wo.selectProd('${p.id}')">
      <div class="wo-pi-emoji">${p.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="wo-pi-name">${p.name}</div>
        <div class="wo-pi-stock">Залишок: ${p.stock.toFixed(2)} л · ${p.vol}л/пляш.</div>
      </div>
      <div class="wo-pi-check">
        ${_selProd?.id===p.id?`<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
      </div>
    </div>`).join('');
}

function reasonListHTML() {
  if (!_selCat) return '';
  const rColors = ['var(--red)','var(--amber)','var(--green)','var(--purple)'];
  return (REASONS[_selCat] || []).map((r, i) => `
  <div class="wo-reason-item ${_selReason===r?'sel':''}"
       onclick="window.__wo.selectReason('${r.replace(/'/g,"\\'")}')">
    <div class="wo-reason-dot" style="background:${rColors[i%4]}"></div>
    <div class="wo-reason-text">${r}</div>
  </div>`).join('');
}

function summaryHTML() {
  const vol = _selVol || 0;
  const unit = 'л';
  const loss = _selProd ? Math.round(vol / _selProd.vol * _selProd.price) : 0;
  return `
  <div class="wo-summary-card">
    <div class="wo-sum-row"><div class="wo-sum-label">Товар</div><div class="wo-sum-val">${_selProd?_selProd.name:'—'}</div></div>
    <div class="wo-sum-div"></div>
    <div class="wo-sum-row"><div class="wo-sum-label">Категорія</div><div class="wo-sum-val">${_selCat?CAT[_selCat].label:'—'}</div></div>
    <div class="wo-sum-row"><div class="wo-sum-label">Об'єм</div><div class="wo-sum-val-big">${vol} ${unit}</div></div>
    <div class="wo-sum-row"><div class="wo-sum-label">Збиток (орієнтовно)</div><div class="wo-sum-val" style="color:var(--red)">${loss>0?'~'+loss+' ₴':'—'}</div></div>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function renderManager() {
  const kpi   = MGR_KPI[_mgrPeriod];
  const max   = Math.max(...CHART_DATA.map(d=>d.biy+d.psuv+d.deg+d.insh));
  const days  = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const colors = { biy:'var(--red)', psuv:'var(--amber)', deg:'var(--green)', insh:'var(--purple)' };

  const chartBars = CHART_DATA.map((d,i) => {
    const total = d.biy+d.psuv+d.deg+d.insh;
    const pct   = max > 0 ? total/max*100 : 0;
    const segs  = ['biy','psuv','deg','insh'].filter(k=>d[k]>0)
      .map(k=>`<div class="wo-cbar-seg" style="flex:${d[k]};background:${colors[k]};opacity:${i===5?1:.65}"></div>`)
      .join('');
    return `<div class="wo-cbar">
      <div class="wo-cbar-inner" style="height:${pct}%;min-height:${pct>0?'4px':'0'}">${segs}</div>
    </div>`;
  }).join('');

  const LOG_ITEMS = [
    { dot:'var(--red)',    title:"Hendrick's Gin 0.7л · Бій",          meta:'Олексій К. · Розбита пляшка при відкритті', qty:'−0.7л', qColor:'var(--red)',    time:'08.05 · 18:05' },
    { dot:'var(--amber)',  title:'Aperol 1л · Псування',               meta:'Олексій К. · Відкрита понад 48год',         qty:'−0.3л', qColor:'var(--amber)',  time:'08.05 · 17:20' },
    { dot:'var(--green)',  title:'Tanqueray Flor de Sevilla · Дегустація',meta:'Олексій К. · Погодила менеджер',          qty:'−0.05л',qColor:'var(--green)',  time:'08.05 · 16:40' },
    { dot:'var(--red)',    title:"Hendrick's Gin 0.7л · Бій",          meta:'Марія П. · Пошкодження при транспортуванні',qty:'−0.7л', qColor:'var(--red)',    time:'05.05 · 20:12' },
    { dot:'var(--purple)', title:'Baileys Irish Cream · Інше',         meta:'Марія П. · Помилковий налив, вилито',       qty:'−0.05л',qColor:'var(--purple)', time:'03.05 · 19:55' },
  ];

  const logVisible = LOG_ITEMS.filter(l =>
    _mgrFilter === 'all' ||
    (l.title.toLowerCase().includes(_mgrFilter === 'biy' ? 'бій' : _mgrFilter === 'psuv' ? 'псування' : _mgrFilter === 'deg' ? 'дегустація' : 'інше'))
  );

  return `
  <div class="wo-topbar" style="flex-shrink:0">
    <div class="wo-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="wo-title">Списання</div>
      <div class="wo-sub">Менеджер · ${state.venue}</div>
    </div>
    <div style="background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--purple);font-family:var(--font-b)">Звіт</div>
  </div>

  <div class="wo-scroll">
    <!-- Period -->
    <div class="wo-period-tabs">
      ${['day','week','month','custom'].map((p,i) => `
      <button class="wo-pt ${_mgrPeriod===p?'act':''}"
              onclick="window.__wo.setPeriod('${p}')">${['Сьогодні','Тиждень','Місяць','Обрати'][i]}</button>`).join('')}
    </div>

    <!-- KPI -->
    <div class="wo-mgr-kpi">
      <div class="wo-mk"><div class="wo-mk-val" style="color:var(--red)">${kpi.count}</div><div class="wo-mk-lbl">Списань<br/>за день</div></div>
      <div class="wo-mk"><div class="wo-mk-val" style="color:var(--amber)">${kpi.vol}</div><div class="wo-mk-lbl">Загальний<br/>об'єм</div></div>
      <div class="wo-mk"><div class="wo-mk-val" style="color:var(--red)">${kpi.loss}</div><div class="wo-mk-lbl">Збиток<br/>оціночно</div></div>
    </div>

    <!-- Chart -->
    <div class="wo-sec" style="padding-top:10px">Динаміка за тиждень</div>
    <div class="wo-chart-card">
      <div class="wo-chart-title">Списання по категоріях</div>
      <div class="wo-chart-bars">${chartBars}</div>
      <div class="wo-chart-labels">${days.map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="wo-chart-legend">
        ${[['var(--red)','Бій'],['var(--amber)','Псування'],['var(--green)','Дегустація'],['var(--purple)','Інше']]
          .map(([c,l]) => `<div class="wo-cl"><div class="wo-cl-dot" style="background:${c}"></div>${l}</div>`).join('')}
      </div>
    </div>

    <!-- Category breakdown -->
    <div class="wo-sec">Розбивка за категоріями</div>
    <div class="wo-cat-breakdown">
      ${[['💥','Бій','var(--red)','60','60%',2],['🍂','Псування','var(--amber)','27','27%',1],['🍸','Дегустація','var(--green)','13','13%',1]]
        .map(([icon,name,col,w,pct,cnt]) => `
        <div class="wo-cb-row">
          <div class="wo-cb-icon" style="background:${col}22">${icon}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-cb-name">${name}</div>
            <div class="wo-cb-bar-wrap"><div class="wo-cb-fill" style="width:${w}%;background:${col}"></div></div>
          </div>
          <div>
            <div class="wo-cb-count" style="color:${col}">${cnt}</div>
            <div class="wo-cb-pct">${pct}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- Top losers -->
    <div class="wo-sec">Топ позицій за місяць</div>
    <div class="wo-toplosers">
      ${[["Hendrick's Gin",'🌿','3 бої · 2 псування','−3.5л','var(--red)'],
         ['Aperol','🍊','1 бій · 3 псування','−2.1л','var(--amber)'],
         ['Johnnie Walker Black','🥃','0 боїв · 2 псування','−1.4л','var(--amber)']].map(([name,emoji,meta,vol,col],i) => `
        <div class="wo-loser-row" ${i>0?'style="border-top:0.5px solid var(--border)"':''}>
          <div class="wo-loser-rank">#${i+1}</div>
          <div style="font-size:18px;flex-shrink:0">${emoji}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-loser-name">${name}</div>
            <div class="wo-loser-meta">${meta}</div>
          </div>
          <div class="wo-loser-val" style="color:${col}">${vol}</div>
        </div>`).join('')}
    </div>

    <!-- Add (manager can too) -->
    <div class="wo-sec">Списання менеджера</div>
    <div style="padding:0 14px">
      <div class="wo-add" onclick="window.__wo.openForm()">
        <div class="wo-add-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Зафіксувати списання</div>
          <div class="wo-add-sub">З облікового запису менеджера</div>
        </div>
      </div>
    </div>

    <!-- Export -->
    <div class="wo-sec" style="padding-top:14px">Звіт</div>
    <div class="wo-report-card">
      <div class="wo-rc-title">Звіт по списаннях</div>
      <div class="wo-rc-sub">Деталізований звіт з розбивкою по категоріях, позиціях і барменах за обраний період.</div>
      <div class="wo-rc-btns">
        <button class="wo-rcbtn wo-rcbtn-pdf" onclick="window.__wo.exportReport('pdf')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1.5" stroke="#fff" stroke-width="1"/><path d="M4 4h4M4 6.5h4M4 9h2" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>PDF
        </button>
        <button class="wo-rcbtn wo-rcbtn-csv" onclick="window.__wo.exportReport('csv')">Excel</button>
        <button class="wo-rcbtn wo-rcbtn-tg" onclick="window.__wo.exportReport('tg')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 5.5L11 1.5 9 11 5.5 7 9.5 3.5M5.5 7L4 10.5" stroke="var(--blue)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>Telegram
        </button>
      </div>
    </div>

    <!-- Journal -->
    <div class="wo-sec" style="padding-top:10px">Журнал</div>
    <div class="wo-filter-row">
      ${[['all','Всі'],['biy','💥 Бій'],['psuv','🍂 Псування'],['deg','🍸 Дегустація'],['insh','📋 Інше']]
        .map(([f,l]) => `<div class="wo-fr-pill ${_mgrFilter===f?'act':''}" onclick="window.__wo.setMgrFilter('${f}')">${l}</div>`).join('')}
    </div>
    <div class="wo-log">
      ${logVisible.map(l => `
      <div class="wo-log-item">
        <div class="wo-log-dot" style="background:${l.dot}"></div>
        <div style="flex:1;min-width:0">
          <div class="wo-log-title">${l.title}</div>
          <div class="wo-log-meta">${l.meta}</div>
        </div>
        <div>
          <div class="wo-log-qty" style="color:${l.qColor}">${l.qty}</div>
          <div class="wo-log-time">${l.time}</div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Form overlay (same as bartender) -->
    <div class="wo-form-overlay ${_formOpen?'open':''}" id="wo-form-overlay"
         onclick="window.__wo.maybeClose(event)">
      <div class="wo-sheet" onclick="event.stopPropagation()">
        <div class="wo-sheet-handle"></div>
        <div class="wo-sheet-hdr">
          <div class="wo-sheet-title">Нове списання</div>
          <div class="wo-sheet-close" onclick="window.__wo.closeForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
        </div>
        <div class="wo-dots">
          ${[1,2,3,4].map(i=>`<div class="wo-dot ${_formStep===i?'act':_formStep>i?'done':''}"></div>`).join('')}
        </div>
        <div class="wo-scroll2">
          <div class="wo-fstep act">
            <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Оберіть причину списання</div>
            <div class="wo-cat-grid">
              <div class="wo-cat-card" onclick="window.__wo.selectCat('biy')"><div class="wo-cat-icon" style="background:var(--red-bg)">💥</div><div class="wo-cat-name">Бій</div></div>
              <div class="wo-cat-card" onclick="window.__wo.selectCat('psuv')"><div class="wo-cat-icon" style="background:var(--amber-bg)">🍂</div><div class="wo-cat-name">Псування</div></div>
              <div class="wo-cat-card" onclick="window.__wo.selectCat('deg')"><div class="wo-cat-icon" style="background:var(--green-bg)">🍸</div><div class="wo-cat-name">Дегустація</div></div>
              <div class="wo-cat-card" onclick="window.__wo.selectCat('insh')"><div class="wo-cat-icon" style="background:var(--purple-bg)">📋</div><div class="wo-cat-name">Інше</div></div>
            </div>
          </div>
        </div>
        <div class="wo-fnav">
          <button class="wo-fnext" disabled style="opacity:.35">Далі</button>
        </div>
      </div>
    </div>

    <div style="height:16px"></div>
  </div>`;
}

/* ════════════════════════
   FULL RENDER
════════════════════════ */
function buildHTML() {
  const body = _view === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="wo-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function refreshList() {
  const el = document.getElementById('wo-list');
  if (el) el.innerHTML = woList();
}
function refreshProdList() {
  const el = document.getElementById('wo-prod-list');
  if (el) el.innerHTML = prodListHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function setCatFilter(cat) { _catFilter = cat; refreshList(); fullRender(); }

/* form */
function openForm()  { _formOpen=true; _formStep=1; _selCat=null; _selProd=null; _selVol=null; _selReason=null; _prodSearch=''; fullRender(); }
function closeForm() { _formOpen=false; fullRender(); }
function maybeClose(e) { if (e.target===document.getElementById('wo-form-overlay')) closeForm(); }

function selectCat(cat) {
  _selCat = cat;
  fullRender();
}
function searchProds(q) { _prodSearch = q; refreshProdList(); }
function selectProd(id) { _selProd = PRODS.find(p=>p.id===id); refreshProdList(); updateNextBtn(); }

function setVol(v) {
  _selVol = v;
  const inp = document.getElementById('wo-vol-input');
  if (inp) inp.value = v;
  document.querySelectorAll('.wo-preset').forEach((b,i)=>b.classList.toggle('act',[0.05,0.1,0.35,0.7,1.0][i]===v));
  updateVol();
}
function updateVol() {
  const inp  = document.getElementById('wo-vol-input');
  const unit = document.getElementById('wo-vol-unit')?.value || 'l';
  const raw  = parseFloat(inp?.value);
  if (!isNaN(raw) && raw > 0) _selVol = raw;
  if (!_selProd) return;
  const lv = unit==='ml' ? raw/1000 : raw;
  const after = Math.max(0, _selProd.stock - (isNaN(raw)?0:lv));
  const nameEl  = document.getElementById('wo-sp-name');
  const befEl   = document.getElementById('wo-sp-before');
  const aftEl   = document.getElementById('wo-sp-after');
  if (nameEl) nameEl.textContent = _selProd.name;
  if (befEl)  befEl.textContent  = _selProd.stock.toFixed(2)+' л';
  if (aftEl)  aftEl.textContent  = after.toFixed(2)+' л';
  updateNextBtn();
}
function updateNextBtn() {
  const btn = document.getElementById('wo-fnext');
  if (!btn) return;
  const disabled = (_formStep===1&&!_selCat)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol);
  btn.disabled = disabled;
  btn.style.opacity = disabled ? '.35' : '1';
}

function selectReason(r) {
  _selReason = r;
  const ta = document.getElementById('wo-reason-custom');
  if (ta) ta.value = r;
  document.querySelectorAll('.wo-reason-item').forEach(el => {
    el.classList.toggle('sel', el.querySelector('.wo-reason-text')?.textContent === r);
  });
}

function nextStep() {
  if (_formStep===4) { submitForm(); return; }
  if ((_formStep===1&&!_selCat)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol)) return;
  _formStep++;
  fullRender();
}
function prevStep() { if (_formStep>1) { _formStep--; fullRender(); } }

function submitForm() {
  const vol  = _selVol || 0;
  const unit = document.getElementById('wo-vol-unit')?.value || 'l';
  const uLbl = {l:'л',ml:'мл',sht:'шт',kg:'кг'}[unit]||'л';
  _formOpen = false;
  _succOpen = true;
  // inject success into overlay directly
  const subEl  = document.getElementById('wo-succ-sub');
  const pillEl = document.getElementById('wo-succ-pill');
  if (subEl)  subEl.textContent  = `${_selProd?.name||'Товар'} · ${CAT[_selCat]?.label||''} · записано в журнал`;
  if (pillEl) pillEl.textContent = `${_selProd?.emoji||''} ${_selProd?.name||''} · −${vol}${uLbl} · ${CAT[_selCat]?.label||''}`;
  fullRender();
}
function closeSuccess()     { _succOpen=false; openForm(); }
function closeSuccessExit() { _succOpen=false; _formOpen=false; fullRender(); }

/* manager */
function setPeriod(p) { _mgrPeriod=p; fullRender(); }
function setMgrFilter(f) { _mgrFilter=f; fullRender(); }
function exportReport(t) {
  const m = { pdf:'📄 PDF-звіт сформовано', csv:'📊 Excel готовий', tg:'✈️ Відправлено в Telegram' };
  alert(m[t]||'Готово');
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _view       = state.role === 'manager' ? 'manager' : 'bartender';
    _catFilter  = 'all';
    _formOpen   = false;
    _formStep   = 1;
    _selCat     = null;
    _selProd    = null;
    _selVol     = null;
    _selReason  = null;
    _prodSearch = '';
    _mgrPeriod  = 'day';
    _mgrFilter  = 'all';
    _succOpen   = false;
    return buildHTML();
  },

  init() {
    window.__wo = {
      setCatFilter, openForm, closeForm, maybeClose,
      selectCat, searchProds, selectProd,
      setVol, updateVol, selectReason,
      nextStep, prevStep, submitForm, closeSuccess, closeSuccessExit,
      setPeriod, setMgrFilter, exportReport,
    };
  },
};
