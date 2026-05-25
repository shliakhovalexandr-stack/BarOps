/* ============================================================
   BarOps — pages/writeoff.js
   Списання: Бармен (список + 4-крокова форма) + Менеджер (аналітика + журнал)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const API  = 'https://barops-backend-production.up.railway.app';
let _prods     = [];   // завантажується з /api/pos/balance
let _writeoffs = [];   // зберігається в localStorage barops_writeoffs_v1

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
let _selUnit    = 'l';
let _selReason  = null;
let _selAccount = null; // {id, name} — рахунок Syrve для цього списання
let _sentHistory = []; // [{ts, date, accounts, itemCount}] — відправлені акти Syrve
let _swipeListenerAdded = false;
let _prodSearch = '';
let _mgrPeriod  = 'day';
let _mgrFilter  = 'all';
let _succOpen   = false;

/* ── Unit helpers ── */
function normalizeUnit(u) {
  const s = (u || '').toLowerCase().trim();
  if (['кг','kg','kilogram','kilograms','кілограм'].includes(s)) return 'kg';
  if (['г','g','gram','гр','грам'].includes(s))                  return 'g';
  if (['шт','sht','piece','pieces','порц','порция','порція','штук','штука'].includes(s)) return 'sht';
  if (['мл','ml','milliliter'].includes(s))                      return 'ml';
  return 'l';
}
function unitLabel(u) {
  return { l:'л', ml:'мл', kg:'кг', g:'г', sht:'шт' }[u || 'l'] || 'л';
}
function fmtStock(amount, u) {
  if (u === 'sht') return Math.round(amount || 0) + ' шт';
  return (amount || 0).toFixed(2) + ' ' + unitLabel(u);
}

/* Динамічний KPI з localStorage */
function getMgrKpi(period) {
  const now  = new Date();
  const ds   = (y,m,d) => new Date(y,m,d);
  const day  = ds(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(day); week.setDate(week.getDate() - ((week.getDay()||7) - 1));
  const mon  = ds(now.getFullYear(), now.getMonth(), 1);
  const since = period==='day' ? day : period==='week' ? week : period==='month' ? mon : null;
  const list  = since ? _writeoffs.filter(w => new Date(w.ts||0) >= since) : _writeoffs;
  const vol   = list.reduce((s,w) => s + (w.volNum||0), 0);
  const loss  = list.reduce((s,w) => s + (w.loss||0), 0);
  return { count: list.length.toString(), vol: vol>0 ? vol.toFixed(2)+'л' : '0л', loss: loss>0 ? loss+'₴' : '—' };
}

/* Динамічний чарт (останні 7 днів) */
function getChartData() {
  return Array.from({length:7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(s.getTime() + 86400000);
    const day = _writeoffs.filter(w => { const t=new Date(w.ts||0); return t>=s&&t<e; });
    return { biy:day.filter(w=>w.cat==='biy').length, psuv:day.filter(w=>w.cat==='psuv').length, deg:day.filter(w=>w.cat==='deg').length, insh:day.filter(w=>w.cat==='insh').length };
  });
}

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="wo-css">
.wo-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.wo-scroll{overflow-y:auto;flex:1}.wo-scroll::-webkit-scrollbar{width:0}

/* topbar */
.wo-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.wo-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.wo-back:active{background:rgba(255,255,255,.08)}
.wo-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.wo-sub{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}

/* today summary */
.wo-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.wo-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r,12px);padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.wo-stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 12px 12px}
.wo-stat-r::after{background:var(--red)}.wo-stat-a::after{background:var(--amber)}.wo-stat-p::after{background:var(--purple)}
.wo-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.wo-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;line-height:1.3}

/* alert strip */
.wo-alert{margin:0 14px 10px;border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5;background:var(--amber-bg);border:1px solid var(--amber-border);color:var(--amber)}
.wo-alert-icon{width:26px;height:26px;border-radius:8px;background:rgba(251,191,36,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* sec label */
.wo-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.wo-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* cat pills */
.wo-pills{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-pills::-webkit-scrollbar{height:0}
.wo-pill{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:5px 13px;border-radius:20px;border:0.5px solid var(--border);color:var(--text2);background:transparent;cursor:pointer;font-size:12px;font-family:var(--font-b);transition:all .15s}
.wo-pill-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.wo-pill.pill-all.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-biy.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-psuv.act{background:var(--amber-bg);border-color:var(--amber-border);color:var(--text0)}
.wo-pill.pill-deg.act{background:var(--green-bg);border-color:var(--green-border);color:var(--text0)}
.wo-pill.pill-insh.act{background:var(--purple-bg);border-color:var(--purple-border);color:var(--text0)}

/* write-off list */
.wo-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.wo-swipe-wrap{position:relative;border-radius:12px;overflow:hidden}
.wo-swipe-del{position:absolute;right:0;top:0;bottom:0;width:76px;background:var(--red);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;border-radius:0 12px 12px 0;flex-shrink:0}
.wo-swipe-del-lbl{font-size:11px;color:#fff;font-family:var(--font-b);font-weight:600}
.wo-card{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;display:flex;align-items:center;gap:10px;padding:11px 13px;transition:transform .25s cubic-bezier(.22,1,.36,1);position:relative;z-index:1;will-change:transform}
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
.wo-add:hover{background:rgba(248,113,113,.12)}
.wo-add:active{transform:scale(.98)}
.wo-add-icon{width:34px;height:34px;border-radius:9px;background:rgba(248,113,113,.12);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wo-add-text{font-size:14px;color:var(--red);font-family:var(--font-b);font-weight:500}
.wo-add-sub{font-size:11px;color:rgba(248,113,113,.50);font-family:var(--font-b);margin-top:1px}

/* ── FORM SHEET ── */
.wo-form-overlay{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.75);display:none;flex-direction:column;justify-content:flex-end}
.wo-form-overlay.open{display:flex}
.wo-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 28px;animation:woSlide .32s cubic-bezier(.22,1,.36,1);max-height:92%;display:flex;flex-direction:column}
@keyframes woSlide{from{transform:translateY(100%)}to{transform:none}}
.wo-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 16px;flex-shrink:0}
.wo-sheet-hdr{padding:0 18px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wo-sheet-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.wo-sheet-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer}

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
.wo-cat-card{background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:16px;padding:14px 12px;cursor:pointer;transition:all .18s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
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
.wo-prod-inp{width:100%;height:48px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:0 14px 0 38px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}
.wo-prod-inp:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-prod-inp::placeholder{color:var(--text2)}
.wo-prod-list{display:flex;flex-direction:column;gap:5px;max-height:220px;overflow-y:auto}
.wo-prod-list::-webkit-scrollbar{width:0}
.wo-prod-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-prod-item:active{transform:scale(.98)}
.wo-prod-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-pi-emoji{width:32px;height:32px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.wo-pi-name{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-pi-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-pi-check{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wo-prod-item.sel .wo-pi-check{background:var(--red);border-color:var(--red)}

/* volume step */
.wo-vol-field{display:block;width:100%;box-sizing:border-box;height:64px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;font-size:28px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;text-align:center;transition:border-color .2s}
.wo-vol-field:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-unit-row{display:flex;justify-content:center;gap:8px;margin-top:10px}
.wo-unit-btn{height:30px;padding:0 20px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:10px;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;transition:all .15s}
.wo-unit-btn.act{background:var(--purple-bg);border-color:var(--purple-border);color:var(--purple);font-weight:600}
.wo-presets{display:flex;gap:6px;flex-wrap:wrap}
.wo-preset{flex:1;min-width:56px;height:36px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-preset:active{transform:scale(.95)}
.wo-preset.act{background:var(--red-bg);border-color:var(--red-border);color:var(--red)}
.wo-stock-preview{background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:center}
.wo-sp-label{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.wo-sp-name{font-family:var(--font-h);font-size:13px;color:var(--text0);font-weight:600;margin-top:2px}
.wo-sp-before{font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:right}
.wo-sp-after{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--red);text-align:right}

/* reason step */
.wo-reason-list{display:flex;flex-direction:column;gap:6px}
.wo-reason-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-reason-item:active{transform:scale(.98)}
.wo-reason-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-reason-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-reason-text{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-custom-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.wo-textarea{width:100%;height:78px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:11px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);resize:none;outline:none;line-height:1.5;transition:border-color .2s}
.wo-textarea:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-textarea::placeholder{color:var(--text2)}

/* summary */
.wo-summary-card{background:var(--red-bg);border:1px solid var(--red-border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:9px}
.wo-sum-row{display:flex;justify-content:space-between;align-items:center}
.wo-sum-label{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.wo-sum-val{font-size:13px;color:var(--text1);font-family:var(--font-b);text-align:right}
.wo-sum-val-big{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--red);text-align:right}
.wo-sum-div{height:0.5px;background:var(--red-border)}

/* form nav */
.wo-fnav{display:flex;gap:8px;padding:14px 18px 0;flex-shrink:0}
.wo-fnext{flex:1;height:52px;background:var(--green);border:none;border-radius:14px;font-size:15px;font-weight:600;color:#000;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.wo-fnext:active{opacity:.85}
.wo-fnext:disabled{opacity:.35;cursor:default}
.wo-fback{width:50px;height:50px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.wo-fback:active{background:var(--bg4)}

/* success overlay */
.wo-succ-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.8);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.wo-succ-overlay.open{display:flex}
.wo-succ-icon{width:72px;height:72px;border-radius:50%;background:var(--red-bg);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;margin-bottom:18px;animation:woPop .4s cubic-bezier(.22,1,.36,1)}
@keyframes woPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.wo-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.wo-succ-sub{font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:6px}
.wo-succ-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:20px;font-size:12px;color:var(--red);font-family:var(--font-b);margin-bottom:22px}
.wo-succ-btn{width:100%;max-width:280px;height:50px;background:var(--red);border:none;border-radius:12px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px}
.wo-succ-btn:active{background:var(--red-d)}
.wo-succ-ghost{width:100%;max-width:280px;height:44px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);margin-top:8px}

/* ── MANAGER VIEW ── */
.wo-period-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.wo-pt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-pt.act{background:var(--bg3);color:var(--text0)}

.wo-mgr-kpi{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 4px}
.wo-mk{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:11px 10px;text-align:center}
.wo-mk-val{font-family:var(--font-h);font-size:20px;font-weight:700;line-height:1}
.wo-mk-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

.wo-chart-card{margin:0 14px 4px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:16px}
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
.wo-cb-row{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px}
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
.wo-rcbtn-csv{background:rgba(255,255,255,.06);border:0.5px solid var(--border);color:var(--text1)}
.wo-rcbtn-tg{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}

.wo-filter-row{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-filter-row::-webkit-scrollbar{height:0}
.wo-fr-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;border:0.5px solid var(--border);color:var(--text2);background:transparent;font-size:11px;font-family:var(--font-b);cursor:pointer;transition:all .15s}
.wo-fr-pill.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

.wo-log{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-ctx-menu{position:fixed;z-index:9999;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:140px;animation:woFadeUp .12s ease both}
.wo-ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:7px;cursor:pointer;font-size:13px;font-family:var(--font-b);color:var(--red);transition:background .12s}
.wo-ctx-item:hover{background:var(--red-bg)}
.wo-log-item{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s}
.wo-log-item:last-child{border-bottom:none}
.wo-log-item:active{background:rgba(255,255,255,.08)}
.wo-log-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-log-title{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.wo-log-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-log-qty{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right}
.wo-log-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

.wo-toplosers{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-loser-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border)}
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
  return _writeoffs.length === 0
    ? `<div style="text-align:center;padding:32px 16px;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.6">Списань за зміну немає.<br>Натисніть «Додати списання» нижче.</div>`
    : [..._writeoffs].reverse()
    .filter(w => _catFilter === 'all' || w.cat === _catFilter)
    .map(w => `
    <div class="wo-swipe-wrap" data-id="${w.id}">
      <div class="wo-swipe-del" onclick="window.__wo.deleteWriteoff('${w.id}')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M7 5V3h4v2M7.5 8.5v5M10.5 8.5v5M4 5l1 10h8l1-10" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="wo-swipe-del-lbl">Видалити</span>
      </div>
      <div class="wo-card" data-cat="${w.cat}" data-id="${w.id}">
        <div class="wo-bar" style="background:${CAT[w.cat]?.color||'var(--text2)'}"></div>
        <div class="wo-emoji">${w.emoji||''}</div>
        <div class="wo-info">
          <div class="wo-name">${w.prod}</div>
          <div class="wo-meta">${w.meta}</div>
        </div>
        <div class="wo-right">
          <div class="wo-vol" style="color:${w.valColor}">${w.vol}</div>
          <div class="wo-time">${w.time}</div>
        </div>
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
    <div style="font-family:var(--font-h);font-size:12px;color:var(--red);font-weight:700">${_writeoffs.length} записів</div>
  </div>

  <div class="wo-scroll">
    <!-- Today stats -->
    ${(() => {
      const kpi = getMgrKpi('day');
      return `<div class="wo-summary">
        <div class="wo-stat wo-stat-r">
          <div class="wo-stat-val" style="color:var(--red)">${kpi.count}</div>
          <div class="wo-stat-lbl">Записів<br/>сьогодні</div>
        </div>
        <div class="wo-stat wo-stat-a">
          <div class="wo-stat-val" style="color:var(--amber)">${kpi.vol}</div>
          <div class="wo-stat-lbl">Загальний<br/>об'єм</div>
        </div>
        <div class="wo-stat wo-stat-p">
          <div class="wo-stat-val" style="color:var(--purple)">${kpi.loss}</div>
          <div class="wo-stat-lbl">Збиток<br/>за зміну</div>
        </div>
      </div>`;
    })()}

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

        <!-- Step 1: Account (if configured) or Category -->
        <div class="wo-fstep ${_formStep===1?'act':''}" id="wfstep1">
          ${(() => {
            const accounts = getWoAccounts();
            if (accounts.length) {
              return `
                <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть рахунок списання</div>
                <div class="wo-reason-list">
                  ${accounts.map(a => `
                  <div class="wo-reason-item ${_selAccount?.id===a.id?'sel':''}"
                       onclick="window.__wo.selectAccount('${a.id}','${a.name.replace(/'/g,"\\'")}')">
                    <div class="wo-reason-dot" style="background:var(--purple)"></div>
                    <div class="wo-reason-text">${a.name}</div>
                    ${_selAccount?.id===a.id?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
                  </div>`).join('')}
                </div>`;
            }
            return `
              <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть причину списання</div>
              <div class="wo-cat-grid">
                <div class="wo-cat-card ${_selCat==='biy'?'sel-biy':''}" onclick="window.__wo.selectCat('biy')">
                  <div class="wo-cat-icon" style="background:var(--red-bg)">💥</div>
                  <div class="wo-cat-name">Бій</div>
                  <div class="wo-cat-desc">Розбита тара, механічне пошкодження</div>
                </div>
                <div class="wo-cat-card ${_selCat==='psuv'?'sel-psuv':''}" onclick="window.__wo.selectCat('psuv')">
                  <div class="wo-cat-icon" style="background:var(--amber-bg)">🍂</div>
                  <div class="wo-cat-name">Псування</div>
                  <div class="wo-cat-desc">Прострочення, зміна якості</div>
                </div>
                <div class="wo-cat-card ${_selCat==='deg'?'sel-deg':''}" onclick="window.__wo.selectCat('deg')">
                  <div class="wo-cat-icon" style="background:var(--green-bg)">🍸</div>
                  <div class="wo-cat-name">Дегустація</div>
                  <div class="wo-cat-desc">Персонал, гості, презентація</div>
                </div>
                <div class="wo-cat-card ${_selCat==='insh'?'sel-insh':''}" onclick="window.__wo.selectCat('insh')">
                  <div class="wo-cat-icon" style="background:var(--purple-bg)">📋</div>
                  <div class="wo-cat-name">Інше</div>
                  <div class="wo-cat-desc">Вказати вручну</div>
                </div>
              </div>`;
          })()}
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
            <input class="wo-vol-field" id="wo-vol-input" type="number" step="0.001"
              placeholder="0" value="${_selVol||''}"
              oninput="window.__wo.updateVol()"/>
            ${(() => {
              const unitOpts = _selProd?.unit==='kg'  ? [['kg','кг'],['g','г']]
                             : _selProd?.unit==='g'   ? [['g','г'],['kg','кг']]
                             : _selProd?.unit==='sht' ? [['sht','шт']]
                             : _selProd?.unit==='ml'  ? [['ml','мл'],['l','л']]
                             :                         [['l','л'],['ml','мл']];
              return `<div class="wo-unit-row">${unitOpts.map(([u,lbl])=>`<button class="wo-unit-btn ${_selUnit===u?'act':''}" data-u="${u}" onclick="window.__wo.setUnit('${u}')">${lbl}</button>`).join('')}</div>`;
            })()}
          </div>
          <div class="wo-presets">
            ${_selProd ? (() => {
              const pu = _selProd.unit || 'l';
              if (pu === 'sht') {
                return [1,2,3,5,10].map(v =>
                  `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                    onclick="window.__wo.setVol(${v})">${v} шт</button>`
                ).join('');
              }
              if (pu === 'kg' || pu === 'g') {
                return [0.1,0.25,0.5,1,2].map(v =>
                  `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                    onclick="window.__wo.setVol(${v})">${v} кг</button>`
                ).join('');
              }
              const vol = _selProd.vol || 0.7;
              const presets = [
                [parseFloat((vol*0.1).toFixed(3)), `10%`],
                [parseFloat((vol*0.25).toFixed(3)), `25%`],
                [parseFloat((vol*0.5).toFixed(3)), `½`],
                [parseFloat((vol*0.75).toFixed(3)), `75%`],
                [vol, `1 пляш.`],
              ];
              return presets.map(([v,lbl]) =>
                `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                  onclick="window.__wo.setVol(${v})">${lbl}<br/><span style="font-size:9px;opacity:.7">${v} л</span></button>`
              ).join('');
            })() : [0.05,0.1,0.35,0.7,1.0].map((v,i) =>
              `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                onclick="window.__wo.setVol(${v})">${['0.05 л','0.1 л','½ пляш.','1 пляш.','1.0 л'][i]}</button>`
            ).join('')}
          </div>
          <div class="wo-stock-preview">
            <div>
              <div class="wo-sp-label">Поточний залишок</div>
              <div class="wo-sp-name" id="wo-sp-name">${_selProd?_selProd.name:'—'}</div>
            </div>
            <div>
              <div class="wo-sp-before" id="wo-sp-before">${_selProd ? fmtStock(_selProd.stock, _selProd.unit) : '—'}</div>
              <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin:2px 0;text-align:right">після списання</div>
              <div class="wo-sp-after" id="wo-sp-after">— ${_selProd ? unitLabel(_selProd.unit) : 'л'}</div>
            </div>
          </div>
        </div>

        <!-- Step 4: Category pills (if accounts mode) + Reason -->
        <div class="wo-fstep ${_formStep===4?'act':''}" id="wfstep4">
          ${getWoAccounts().length ? `
          <div>
            <div class="wo-custom-lbl">Тип списання</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${Object.entries(CAT).map(([k,v]) => `
              <div onclick="window.__wo.selectCat('${k}')"
                style="padding:7px 14px;border-radius:20px;border:0.5px solid ${_selCat===k?v.color:'var(--border)'};background:${_selCat===k?v.bg:'transparent'};color:${_selCat===k?v.color:'var(--text2)'};font-size:12px;cursor:pointer;font-family:var(--font-b);transition:all .15s">
                ${v.label}
              </div>`).join('')}
            </div>
          </div>` : ''}
          <div>
            <div class="wo-custom-lbl">Причина списання</div>
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
          ${((_formStep===1&&(getWoAccounts().length?!_selAccount:!_selCat))||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol))?'disabled style="opacity:.35"':''}>
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
  const list = _prods.filter(p => !q || p.name.toLowerCase().includes(q));
  if (list.length === 0) {
    return `<div style="text-align:center;padding:20px 8px;color:var(--text2);font-family:var(--font-b);font-size:12px">${_prods.length===0?'Завантаження товарів…':'Нічого не знайдено'}</div>`;
  }
  return list.map(p => `
    <div class="wo-prod-item ${_selProd?.id===p.id?'sel':''}" onclick="window.__wo.selectProd('${p.id}')">
      <div class="wo-pi-emoji">🍾</div>
      <div style="flex:1;min-width:0">
        <div class="wo-pi-name">${p.name}</div>
        ${p.stock!=null?`<div class="wo-pi-stock">Залишок: ${typeof p.stock==='number'?p.stock.toFixed(2):p.stock}</div>`:''}
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

function getWoAccounts() {
  const vId = localStorage.getItem('barops_venueId') || state.venueId || '';
  console.log('[WO] getWoAccounts vId=', vId, 'key=', `barops_wo_accounts_${vId}`, 'raw=', localStorage.getItem(`barops_wo_accounts_${vId}`));
  if (!vId) return [];
  try { return JSON.parse(localStorage.getItem(`barops_wo_accounts_${vId}`) || '[]'); } catch { return []; }
}
function autoSelectAccount() {
  const accounts = getWoAccounts();
  if (accounts.length === 1) _selAccount = accounts[0];
}
function accountPickerHTML() {
  const accounts = getWoAccounts();
  if (!accounts.length) return '';
  return `
    <div>
      <div class="wo-custom-lbl">На рахунок</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${accounts.map(a => `
          <div class="wo-reason-item ${_selAccount?.id === a.id ? 'sel' : ''}"
               onclick="window.__wo.selectAccount('${a.id}', '${a.name.replace(/'/g,"\\'")}')">
            <div class="wo-reason-dot" style="background:var(--purple)"></div>
            <div class="wo-reason-text">${a.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
function selectAccount(id, name) {
  _selAccount = { id, name };
  if (_formStep === 1) { setTimeout(() => { _formStep = 2; fullRender(); }, 180); }
  else fullRender();
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
  const kpi   = getMgrKpi(_mgrPeriod);
  const CHART_DATA = getChartData();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayWo = _writeoffs.filter(w => w.prodId && new Date(w.ts || 0) >= today);
  const max   = Math.max(...CHART_DATA.map(d=>d.biy+d.psuv+d.deg+d.insh), 1);
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
    ${(() => {
      const total = _writeoffs.length;
      if (!total) return '';
      const cats = [['biy','💥','Бій','var(--red)'],['psuv','🍂','Псування','var(--amber)'],['deg','🍸','Дегустація','var(--green)'],['insh','📋','Інше','var(--purple)']];
      const rows = cats.filter(([k]) => _writeoffs.some(w=>w.cat===k)).map(([k,icon,name,col]) => {
        const cnt = _writeoffs.filter(w=>w.cat===k).length;
        const w = Math.round(cnt/total*100);
        return `<div class="wo-cb-row">
          <div class="wo-cb-icon" style="background:${col}22">${icon}</div>
          <div style="flex:1;min-width:0">
            <div class="wo-cb-name">${name}</div>
            <div class="wo-cb-bar-wrap"><div class="wo-cb-fill" style="width:${w}%;background:${col}"></div></div>
          </div>
          <div>
            <div class="wo-cb-count" style="color:${col}">${cnt}</div>
            <div class="wo-cb-pct">${w}%</div>
          </div>
        </div>`;
      }).join('');
      return rows ? `<div class="wo-sec">Розбивка за категоріями</div><div class="wo-cat-breakdown">${rows}</div>` : '';
    })()}

    <!-- Today unsent -->
    ${(() => {
      const allToday = _writeoffs.filter(w => new Date(w.ts || 0) >= today);
      if (!allToday.length) return `
        <div class="wo-sec">Списання сьогодні</div>
        <div style="margin:0 14px 8px;padding:18px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;text-align:center">
          <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Списань за сьогодні немає</div>
        </div>`;
      return `
        <div class="wo-sec">Списання сьогодні <span style="color:var(--text3);font-weight:400;font-size:10px;letter-spacing:0;text-transform:none">(не відправлені в Syrve)</span></div>
        <div class="wo-list" style="margin-bottom:8px">
          ${allToday.map(w => `
          <div class="wo-swipe-wrap" data-id="${w.id}">
            <div class="wo-swipe-del" onclick="window.__wo.deleteWriteoff('${w.id}')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
              <span class="wo-swipe-del-lbl">Видалити</span>
            </div>
            <div class="wo-card" data-id="${w.id}" style="gap:10px">
              <div style="width:3px;height:34px;border-radius:2px;background:${CAT[w.cat]?.color||'var(--text2)'};flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.prod}</div>
                <div style="font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)">${CAT[w.cat]?.label||''} · ${w.reason||'Без причини'}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-family:var(--font-h);font-size:15px;font-weight:700;color:${CAT[w.cat]?.color||'var(--text0)'}">${w.vol||'—'}</div>
                <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${w.time||''}</div>
              </div>
            </div>
          </div>`).join('')}
        </div>`;
    })()}

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

    <!-- Syrve Office -->
    <div class="wo-sec" style="padding-top:14px">Syrve Office</div>
    <div style="margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--purple-bg);border:0.5px solid var(--purple-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--purple)" stroke-width="1.2"/><path d="M6 7h6M6 10h4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/><path d="M2 6h14" stroke="var(--purple)" stroke-width="1.2"/></svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-family:var(--font-b);color:var(--text0)">Акт списання</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${todayWo.length
          ? `${todayWo.length} поз. за сьогодні · буде непроведеним`
          : 'Немає списань з productId за сьогодні'}</div>
      </div>
      <button id="wo-syrve-btn"
        onclick="window.__wo.sendActToSyrve()"
        ${!todayWo.length ? 'disabled' : ''}
        style="padding:7px 14px;border-radius:20px;border:0.5px solid var(--purple-border);background:${todayWo.length ? 'var(--purple-bg)' : 'var(--bg2)'};color:${todayWo.length ? 'var(--purple)' : 'var(--text3)'};font-size:12px;font-family:var(--font-b);cursor:${todayWo.length ? 'pointer' : 'default'};white-space:nowrap">
        Надіслати
      </button>
    </div>
    ${_sentHistory.length ? `
    <div style="margin:0 14px 14px;display:flex;flex-direction:column;gap:4px">
      ${_sentHistory.map(h => `
      <div style="background:rgba(139,92,246,.07);border:0.5px solid var(--purple-border);border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text0);font-family:var(--font-b)">Надіслано · ${h.date}</div>
          <div style="font-size:10px;color:var(--text2);margin-top:1px">${h.accounts.join(' · ')}</div>
        </div>
        <div style="font-size:11px;color:var(--purple);font-family:var(--font-h);font-weight:700;flex-shrink:0">${h.itemCount} поз.</div>
      </div>`).join('')}
    </div>` : ''}

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

    <!-- History grouped by date -->
    <div class="wo-sec" style="padding-top:10px">Історія списань</div>
    <div id="wo-list" style="padding:0 14px;display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${(() => {
        const MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        const yesterKey = (() => { const y = new Date(now); y.setDate(y.getDate()-1); return `${y.getFullYear()}-${y.getMonth()}-${y.getDate()}`; })();
        const groups = {};
        const sorted = [..._writeoffs].sort((a,b) => new Date(b.ts||0) - new Date(a.ts||0));
        for (const w of sorted) {
          const d = new Date(w.ts || 0);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (!groups[key]) {
            let label;
            if (key === todayKey) label = 'Сьогодні';
            else if (key === yesterKey) label = 'Вчора';
            else label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
            groups[key] = { label, items: [] };
          }
          groups[key].items.push(w);
        }
        if (!Object.keys(groups).length) return `
          <div style="padding:18px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;text-align:center">
            <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Списань немає</div>
          </div>`;
        return Object.entries(groups).map(([, g]) => `
          <div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;padding-left:2px">${g.label}</div>
            <div style="display:flex;flex-direction:column;gap:5px">
              ${g.items.map(w => `
              <div class="wo-swipe-wrap" data-id="${w.id}">
                <div class="wo-swipe-del" onclick="window.__wo.deleteWriteoff('${w.id}')">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
                  <span class="wo-swipe-del-lbl">Видалити</span>
                </div>
                <div class="wo-card" data-id="${w.id}" style="gap:10px">
                  <div style="width:3px;height:34px;border-radius:2px;background:${CAT[w.cat]?.color||'var(--text2)'};flex-shrink:0"></div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.prod}</div>
                    <div style="font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)">${CAT[w.cat]?.label||''} · ${w.reason||'Без причини'}</div>
                  </div>
                  <div style="text-align:right;flex-shrink:0">
                    <div style="font-family:var(--font-h);font-size:15px;font-weight:700;color:${CAT[w.cat]?.color||'var(--text0)'}">${w.vol||'—'}</div>
                    <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${w.time||''}</div>
                  </div>
                </div>
              </div>`).join('')}
            </div>
          </div>`).join('');
      })()}
    </div>

    <!-- Form overlay -->
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
        <div class="wo-dots">
          ${[1,2,3,4].map(i=>`<div class="wo-dot ${_formStep===i?'act':_formStep>i?'done':''}" id="wdot${i}"></div>`).join('')}
        </div>
        <div class="wo-scroll2" id="wo-scroll2">

          <!-- Step 1: Account (if configured) or Category -->
          <div class="wo-fstep ${_formStep===1?'act':''}" id="wfstep1">
            ${(() => {
              const accounts = getWoAccounts();
              if (accounts.length) {
                return `
                  <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть рахунок списання</div>
                  <div class="wo-reason-list">
                    ${accounts.map(a => `
                    <div class="wo-reason-item ${_selAccount?.id===a.id?'sel':''}"
                         onclick="window.__wo.selectAccount('${a.id}','${a.name.replace(/'/g,"\\'")}')">
                      <div class="wo-reason-dot" style="background:var(--purple)"></div>
                      <div class="wo-reason-text">${a.name}</div>
                      ${_selAccount?.id===a.id?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
                    </div>`).join('')}
                  </div>`;
              }
              return `
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
                </div>`;
            })()}
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
              <input class="wo-vol-field" id="wo-vol-input" type="number" step="0.001"
                placeholder="0" value="${_selVol||''}"
                oninput="window.__wo.updateVol()"/>
              ${(() => {
                const unitOpts = _selProd?.unit==='kg'  ? [['kg','кг'],['g','г']]
                               : _selProd?.unit==='g'   ? [['g','г'],['kg','кг']]
                               : _selProd?.unit==='sht' ? [['sht','шт']]
                               : _selProd?.unit==='ml'  ? [['ml','мл'],['l','л']]
                               :                         [['l','л'],['ml','мл']];
                return `<div class="wo-unit-row">${unitOpts.map(([u,lbl])=>`<button class="wo-unit-btn ${_selUnit===u?'act':''}" data-u="${u}" onclick="window.__wo.setUnit('${u}')">${lbl}</button>`).join('')}</div>`;
              })()}
            </div>
            <div class="wo-presets">
              ${_selProd ? (() => {
                const pu = _selProd.unit || 'l';
                if (pu === 'sht') {
                  return [1,2,3,5,10].map(v =>
                    `<button class="wo-preset ${_selVol===v?'act':''}"
                      onclick="window.__wo.setVol(${v})">${v} шт</button>`
                  ).join('');
                }
                if (pu === 'kg' || pu === 'g') {
                  return [0.1,0.25,0.5,1,2].map(v =>
                    `<button class="wo-preset ${_selVol===v?'act':''}"
                      onclick="window.__wo.setVol(${v})">${v} кг</button>`
                  ).join('');
                }
                const vol = _selProd.vol || 0.7;
                const presets = [
                  [parseFloat((vol*0.1).toFixed(3)), `10%`],
                  [parseFloat((vol*0.25).toFixed(3)), `25%`],
                  [parseFloat((vol*0.5).toFixed(3)), `½`],
                  [parseFloat((vol*0.75).toFixed(3)), `75%`],
                  [vol, `1 пляш.`],
                ];
                return presets.map(([v,lbl]) =>
                  `<button class="wo-preset ${_selVol===v?'act':''}"
                    onclick="window.__wo.setVol(${v})">${lbl}<br/><span style="font-size:9px;opacity:.7">${v} л</span></button>`
                ).join('');
              })() : [0.05,0.1,0.35,0.7,1.0].map((v,i) =>
                `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                  onclick="window.__wo.setVol(${v})">${['0.05 л','0.1 л','½ пляш.','1 пляш.','1.0 л'][i]}</button>`
              ).join('')}
            </div>
            <div class="wo-stock-preview">
              <div>
                <div class="wo-sp-label">Поточний залишок</div>
                <div class="wo-sp-name" id="wo-sp-name">${_selProd?_selProd.name:'—'}</div>
              </div>
              <div>
                <div class="wo-sp-before" id="wo-sp-before">${_selProd ? fmtStock(_selProd.stock, _selProd.unit) : '—'}</div>
                <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin:2px 0;text-align:right">після списання</div>
                <div class="wo-sp-after" id="wo-sp-after">— ${_selProd ? unitLabel(_selProd.unit) : 'л'}</div>
              </div>
            </div>
          </div>

          <!-- Step 4: Reason -->
          <div class="wo-fstep ${_formStep===4?'act':''}" id="wfstep4">
            <div>
              <div class="wo-custom-lbl">Причина списання</div>
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
            ${((_formStep===1&&(getWoAccounts().length?!_selAccount:!_selCat))||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol))?'disabled style="opacity:.35"':''}>
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
function openForm()  { _formOpen=true; _formStep=1; _selCat=null; _selProd=null; _selVol=null; _selUnit='l'; _selReason=null; _selAccount=null; _prodSearch=''; autoSelectAccount(); fullRender(); }
function closeForm() { _formOpen=false; fullRender(); }
function maybeClose(e) { if (e.target===document.getElementById('wo-form-overlay')) closeForm(); }

function selectCat(cat) {
  _selCat = cat;
  // Авто-перехід на наступний крок без кнопки «Далі»
  setTimeout(() => { _formStep = 2; fullRender(); }, 180);
}
function searchProds(q) { _prodSearch = q; refreshProdList(); }
function selectProd(id) { _selProd = _prods.find(p=>p.id===id); _selUnit = _selProd?.unit || 'l'; refreshProdList(); updateNextBtn(); }

function setVol(v) {
  _selVol = v;
  const inp = document.getElementById('wo-vol-input');
  if (inp) inp.value = v;
  document.querySelectorAll('.wo-preset').forEach(b=>b.classList.toggle('act', parseFloat(b.dataset?.v)===v));
  updateVol();
}
function updateVol() {
  const inp  = document.getElementById('wo-vol-input');
  const raw  = parseFloat(inp?.value);
  if (!isNaN(raw) && raw > 0) _selVol = raw;
  if (!_selProd) return;
  const nativeVal = _selUnit === 'ml' ? raw / 1000
                  : _selUnit === 'g'  ? raw / 1000
                  : raw;
  const after      = Math.max(0, _selProd.stock - (isNaN(raw) ? 0 : nativeVal));
  const nativeUnit = _selProd.unit || 'l';
  const nameEl = document.getElementById('wo-sp-name');
  const befEl  = document.getElementById('wo-sp-before');
  const aftEl  = document.getElementById('wo-sp-after');
  if (nameEl) nameEl.textContent = _selProd.name;
  if (befEl)  befEl.textContent  = fmtStock(_selProd.stock, nativeUnit);
  if (aftEl)  aftEl.textContent  = fmtStock(after, nativeUnit);
  updateNextBtn();
}
function setUnit(u) {
  _selUnit = u;
  document.querySelectorAll('.wo-unit-btn').forEach(b => b.classList.toggle('act', b.dataset.u === u));
  updateVol();
}
function updateNextBtn() {
  const btn = document.getElementById('wo-fnext');
  if (!btn) return;
  const step1invalid = getWoAccounts().length ? !_selAccount : !_selCat;
  const disabled = (_formStep===1&&step1invalid)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol);
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
  const step1invalid = getWoAccounts().length ? !_selAccount : !_selCat;
  if ((_formStep===1&&step1invalid)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol)) return;
  _formStep++;
  fullRender();
}
function prevStep() { if (_formStep>1) { _formStep--; fullRender(); } }

async function submitForm() {
  const vol  = _selVol || 0;
  const unit = _selUnit || _selProd?.unit || 'l';
  const uLbl = {l:'л',ml:'мл',sht:'шт',kg:'кг',g:'г'}[unit] || 'л';
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dd   = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}`;

  const finalCat = _selCat || 'insh';
  const entry = {
    id:      Date.now().toString(36),
    cat:     finalCat,
    prod:    _selProd?.name || 'Товар',
    prodId:  _selProd?.id   || null,
    meta:    `${CAT[finalCat]?.label||''} · ${_selReason||'Без причини'}`,
    vol:     `−${vol}${uLbl}`,
    volNum:  vol,
    unitKey: unit,
    valColor:    CAT[finalCat]?.color || 'var(--text0)',
    reason:      _selReason || '',
    accountId:   _selAccount?.id   || null,
    accountName: _selAccount?.name || null,
    time:    hhmm,
    dateStr: `${dd} · ${hhmm}`,
    ts:      now.toISOString(),
  };

  _writeoffs.push(entry);

  // Зберігаємо в localStorage
  const vId = localStorage.getItem('barops_venueId') || '';
  const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
  if (!raw[vId]) raw[vId] = [];
  raw[vId].push(entry);
  localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));

  // Відправляємо на backend
  try {
    const { writeoffsAPI } = await import('../shared/api.js');
    await writeoffsAPI.create({
      items: [{ productName: entry.prod, productId: entry.prodId, qty: vol, unit: uLbl }],
      category: CAT[finalCat]?.label || finalCat || 'Інше',
      reason:   entry.reason || null,
    });
  } catch (err) {
    console.warn('[Writeoff] Backend недоступний:', err.message);
  }

  _formOpen = false;
  _succOpen = true;
  const subEl  = document.getElementById('wo-succ-sub');
  const pillEl = document.getElementById('wo-succ-pill');
  if (subEl)  subEl.textContent  = `${entry.prod} · ${CAT[finalCat]?.label||''} · записано в журнал`;
  if (pillEl) pillEl.textContent = `${entry.prod} · −${vol}${uLbl} · ${CAT[finalCat]?.label||''}`;
  fullRender();
}
function closeSuccess()     { _succOpen=false; openForm(); }
function closeSuccessExit() { _succOpen=false; _formOpen=false; fullRender(); }

/* manager */
function setPeriod(p) { _mgrPeriod=p; fullRender(); }
function setMgrFilter(f) { _mgrFilter=f; fullRender(); }

async function sendActToSyrve() {
  const vId   = localStorage.getItem('barops_venueId') || state.venueId || '';
  const token = localStorage.getItem('barops_token');
  if (!vId || !token) { alert('Немає авторизації або venueId'); return; }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayItems = _writeoffs.filter(w => w.prodId && new Date(w.ts || 0) >= today);
  if (!todayItems.length) { alert('Немає списань з productId за сьогодні'); return; }

  // Групуємо по рахунку (accountId) — кожна група = окремий акт
  const byAccount = {};
  for (const w of todayItems) {
    const key = w.accountId || '__auto__';
    if (!byAccount[key]) byAccount[key] = { accountId: w.accountId || null, accountName: w.accountName || 'авто', items: [] };
    byAccount[key].items.push(w);
  }

  const groups = Object.values(byAccount);
  const summary = groups.map(g => {
    const lines = Object.values(
      g.items.reduce((acc, w) => {
        if (!acc[w.prodId]) acc[w.prodId] = { name: w.prod, amount: 0, unitKey: w.unitKey || 'l' };
        acc[w.prodId].amount += w.volNum || 0;
        return acc;
      }, {})
    ).map(i => `  • ${i.name}: ${i.amount.toFixed(2)} ${unitLabel(i.unitKey)}`).join('\n');
    return `Рахунок: ${g.accountName}\n${lines}`;
  }).join('\n\n');

  if (!confirm(`Надіслати ${groups.length > 1 ? groups.length + ' акти' : 'акт'} списання до Syrve?\n\n${summary}`)) return;

  const btn = document.getElementById('wo-syrve-btn');
  if (btn) { btn.textContent = 'Надсилаю…'; btn.disabled = true; }

  const results = [];
  const errors  = [];
  for (const g of groups) {
    const grouped = {};
    for (const w of g.items) {
      if (!grouped[w.prodId]) grouped[w.prodId] = { productId: w.prodId, amount: 0, unitKey: w.unitKey || 'l', productName: w.prod };
      grouped[w.prodId].amount += w.volNum || 0;
    }
    const items = Object.values(grouped);
    try {
      const body = { items, comment: `BarOps · ${g.accountName} · ${new Date().toLocaleDateString('uk-UA')}` };
      if (g.accountId) body.accountId = g.accountId;
      const resp = await fetch(`${API}/api/pos/writeoff-act/${vId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || JSON.stringify(data.details));
      results.push(`✓ ${g.accountName}: ${data.itemCount} позицій`);
    } catch (err) {
      errors.push(`✗ ${g.accountName}: ${err.message}`);
    }
  }

  if (btn) { btn.textContent = 'Надіслати'; btn.disabled = false; }

  if (errors.length === 0 && results.length > 0) {
    // Зберегти в history і очистити поточний список
    const now = new Date();
    const histEntry = {
      ts:        now.toISOString(),
      date:      `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      accounts:  results,
      itemCount: todayItems.length,
    };
    _sentHistory.unshift(histEntry);
    const histKey = `barops_wo_history_${vId}`;
    try { localStorage.setItem(histKey, JSON.stringify(_sentHistory.slice(0, 20))); } catch {}

    // Очистити список (залишаємо тільки не відправлені — ті що без prodId)
    _writeoffs = _writeoffs.filter(w => !w.prodId || new Date(w.ts || 0) < today);
    const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
    raw[vId] = _writeoffs;
    localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));

    fullRender();
    initSwipe();
  } else {
    const msg = [...results, ...errors].join('\n');
    alert(errors.length ? `Завершено з помилками:\n\n${msg}` : `Акти списання створено в Syrve!\n\n${msg}`);
  }
}
function exportReport(t) {
  const m = { pdf:'📄 PDF-звіт сформовано', csv:'📊 Excel готовий', tg:'✈️ Відправлено в Telegram' };
  alert(m[t]||'Готово');
}
function addCustomReason() {
  const cat = prompt('Категорія (biy/psuv/deg/insh):');
  if (!REASONS[cat]) { alert('Невірна категорія'); return; }
  const text = prompt('Текст причини:');
  if (text?.trim()) { REASONS[cat].push(text.trim()); refreshReasons(); }
}
function refreshReasons() {
  const el = document.getElementById('wo-reasons-wrap');
  if (!el) { fullRender(); return; }
  el.innerHTML = Object.entries(REASONS).map(([cat, reasons]) => `
  <div style="padding:10px 14px;border-bottom:1px solid var(--border)">
    <div style="font-size:11px;color:${CAT[cat].color};font-family:var(--font-b);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      ${CAT[cat].label}
    </div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${reasons.map((r,i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border-radius:8px">
        <span style="flex:1;font-size:12px;color:var(--text1);font-family:var(--font-b)">${r}</span>
        <div onclick="window.__wo.removeReason('${cat}',${i})"
          style="width:20px;height:20px;border-radius:6px;background:var(--red-bg);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/></svg>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('');
}
function removeReason(cat, idx) {
  if (REASONS[cat]) { REASONS[cat].splice(idx, 1); refreshReasons(); }
}

let _ctxMenuEl = null;
function removeCtxMenu() {
  if (_ctxMenuEl) { _ctxMenuEl.remove(); _ctxMenuEl = null; }
}
function initContextMenu() {
  document.addEventListener('contextmenu', e => {
    const card = e.target.closest('.wo-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    e.preventDefault();
    removeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'wo-ctx-menu';
    menu.innerHTML = `
      <div class="wo-ctx-item" id="wo-ctx-del">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Видалити
      </div>`;
    const x = Math.min(e.clientX, window.innerWidth  - 160);
    const y = Math.min(e.clientY, window.innerHeight - 60);
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    document.body.appendChild(menu);
    _ctxMenuEl = menu;
    menu.querySelector('#wo-ctx-del').addEventListener('click', () => {
      removeCtxMenu();
      deleteWriteoff(id);
    });
  });
  document.addEventListener('click',   removeCtxMenu);
  document.addEventListener('keydown',  e => { if (e.key === 'Escape') removeCtxMenu(); });
}

function initSwipe() {
  if (_swipeListenerAdded) return;
  _swipeListenerAdded = true;
  let sx = 0, sy = 0, activeCard = null;
  document.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.wo-swipe-wrap');
    const card = wrap?.querySelector('.wo-card');
    if (activeCard && activeCard !== card) {
      activeCard.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)';
      activeCard.style.transform = 'translateX(0)';
      activeCard = null;
    }
    if (!card) return;
    activeCard = card;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    card.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!activeCard) return;
    const dx = e.touches[0].clientX - sx;
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dy > 12 && dy > Math.abs(dx)) { activeCard = null; return; }
    if (dx < 0) activeCard.style.transform = `translateX(${Math.max(dx, -76)}px)`;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!activeCard) return;
    const dx = e.changedTouches[0].clientX - sx;
    activeCard.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)';
    if (dx < -38) {
      activeCard.style.transform = 'translateX(-76px)';
    } else {
      activeCard.style.transform = 'translateX(0)';
      activeCard = null;
    }
  });
}

async function deleteWriteoff(id) {
  const idx = _writeoffs.findIndex(w => w.id === id);
  if (idx === -1) return;
  _writeoffs.splice(idx, 1);
  // Оновити localStorage
  const vId = localStorage.getItem('barops_venueId') || '';
  const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
  raw[vId] = _writeoffs;
  localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));
  refreshList();
  setTimeout(initSwipe, 50);
  // Видалити з backend
  try {
    const token = localStorage.getItem('barops_token');
    await fetch(`${API}/api/writeoffs/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) { console.warn('[DeleteWriteoff]', e.message); }
}


/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  async render() {
    _view       = (state.role === 'admin' || state.role === 'manager') ? 'manager' : 'bartender';
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

    // Завантажуємо списання: спочатку з localStorage (швидко), потім замінюємо з бекенду
    const vId = localStorage.getItem('barops_venueId') || state.venueId || '';
    try { _sentHistory = JSON.parse(localStorage.getItem(`barops_wo_history_${vId}`) || '[]'); } catch { _sentHistory = []; }
    const stored = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
    _writeoffs = stored[vId] || [];

    try {
      const woToken = localStorage.getItem('barops_token');
      const woRes = await fetch(`${API}/api/writeoffs`, {
        headers: woToken ? { Authorization: `Bearer ${woToken}` } : {},
      });
      if (woRes.ok) {
        const woData = await woRes.json();
        _writeoffs = (woData.data || []).reverse().map(w => {
          const catKey = Object.entries(CAT).find(([, v]) => v.label === w.category)?.[0] || 'insh';
          const item   = w.items?.[0] || {};
          const qty    = item.qty || 0;
          const uLbl   = item.unit || 'л';
          const uKey   = {'л':'l','мл':'ml','шт':'sht','кг':'kg','г':'g'}[uLbl] || 'l';
          const d      = new Date(w.createdAt);
          const hhmm   = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          const dd     = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
          return {
            id:          w.id,
            cat:         catKey,
            prod:        item.productName || 'Товар',
            prodId:      item.productId || null,
            meta:        `${CAT[catKey]?.label||''} · ${w.reason||'Без причини'}`,
            vol:         `−${qty}${uLbl}`,
            volNum:      qty,
            unitKey:     uKey,
            valColor:    CAT[catKey]?.color || 'var(--text0)',
            reason:      w.reason || '',
            accountId:   null,
            accountName: null,
            time:        hhmm,
            dateStr:     `${dd} · ${hhmm}`,
            ts:          w.createdAt,
          };
        });
        // Оновлюємо кеш
        const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
        raw[vId] = _writeoffs;
        localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));
      }
    } catch (e) {
      console.warn('[Writeoff] Не вдалось завантажити з backend, використовуємо localStorage:', e.message);
    }

    // Завантажуємо товари з POS balance API
    try {
      const token = localStorage.getItem('barops_token');
      const res = await fetch(`${API}/api/pos/balance/${vId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        _prods = [];
        for (const store of (data.stores || [])) {
          for (const item of (store.items || [])) {
            if (item.name && !item.name.match(/^[0-9a-f-]{36}$/i) && !_prods.find(p=>p.id===item.id)) {
              _prods.push({ id: item.id, name: item.name, stock: item.amount ?? null, unit: normalizeUnit(item.unit) });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Writeoff] Товари не завантажились:', e.message);
      _prods = [];
    }

    return buildHTML();
  },

  init() {
    window.__wo = {
      setCatFilter, openForm, closeForm, maybeClose,
      selectCat, searchProds, selectProd,
      setVol, updateVol, setUnit, selectReason, selectAccount,
      nextStep, prevStep, submitForm, closeSuccess, closeSuccessExit,
      setPeriod, setMgrFilter, exportReport, sendActToSyrve,
      addCustomReason, removeReason,
      deleteWriteoff,
    };
    initSwipe();
    initContextMenu();
  },
};
