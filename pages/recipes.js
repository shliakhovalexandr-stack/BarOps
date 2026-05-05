/* ============================================================
   BarOps — pages/recipes.js
   Рецепти і живий фудкост:
   • Бармен — список рецептів з Live FC, детальна картка (3 вкладки)
   • Менеджер — FC-огляд меню, сортування, редагування цін
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const RECIPES = [
  {
    id:'r1', emoji:'🥃', name:'Old Fashioned',    category:'Класика · Віскі',       cat:'classic',
    sellPrice:295, cost:68.2, fc:23.1, fcAlert:true,
    alertText:'Johnnie Walker Black +18% → собівартість зросла з 57.8 ₴ до 68.2 ₴',
    prevTotalCost:57.8, recommended:380,
    tech:{
      method:'1. У склянку Old Fashioned додайте шматочок цукру та 2 дашики бітера\n2. Налийте трохи содової та розчиніть цукор\n3. Додайте великий кубик льоду\n4. Влийте 60мл Johnnie Walker Black\n5. Перемішайте 30 секунд\n6. Прикрасьте цедрою апельсину та черешнею',
      glass:'Old Fashioned 240мл', ice:'1 великий кубик',
      garnish:'Цедра апельсину + коктейльна вишня', temp:'Охолоджений',
    },
    history:[
      {date:'08.05.2026', reason:'JW Black ↑ +18%', fc:23.1, delta:'+4.9%', color:'var(--amber)'},
      {date:'01.05.2026', reason:'Aperol ↑ +18%',   fc:18.2, delta:'+1.2%', color:'var(--amber)'},
      {date:'15.03.2026', reason:"Hendrick's ↓ -5%", fc:17.0, delta:'-0.8%', color:'var(--green)'},
      {date:'10.02.2026', reason:'JW Black ↑ +9%',  fc:17.8, delta:'+2.1%', color:'var(--amber)'},
    ],
    ingredients:[
      {emoji:'🥃', name:'Johnnie Walker Black 0.7л', vol:'60 мл',     cost:70.0, prevCost:59.3, changed:true },
      {emoji:'🍬', name:'Цукровий сироп',             vol:'5 мл',      cost:0.8,  prevCost:0.8,  changed:false},
      {emoji:'🍊', name:'Бітер Angostura',            vol:'2 дашики',  cost:1.4,  prevCost:1.4,  changed:false},
      {emoji:'🍊', name:'Цедра апельсину',            vol:'1 шт',      cost:1.2,  prevCost:1.2,  changed:false},
      {emoji:'🧊', name:'Лід (великий кубик)',        vol:'1 шт',      cost:0.8,  prevCost:0.8,  changed:false},
    ],
  },
  {
    id:'r2', emoji:'🌿', name:'Aperol Spritz',    category:'Сигнатури · Аперитиви', cat:'signature',
    sellPrice:280, cost:51.5, fc:18.4, fcAlert:true,
    alertText:'Aperol +18% → фудкост зріс з 15.6% до 18.4%',
    prevTotalCost:43.6, recommended:310,
    tech:{
      method:'1. Наповніть бокал льодом\n2. Додайте 90мл Aperol\n3. Додайте 90мл Prosecco\n4. Долийте 60мл содової\n5. Прикрасьте скибочкою апельсину',
      glass:'Бокал для вина 400мл', ice:'Кубики льоду',
      garnish:'Скибочка апельсину', temp:'Охолоджений',
    },
    history:[
      {date:'01.05.2026', reason:'Aperol ↑ +18%',  fc:18.4, delta:'+2.8%', color:'var(--amber)'},
      {date:'10.03.2026', reason:'Prosecco ↑ +5%', fc:15.6, delta:'+0.5%', color:'var(--text1)'},
    ],
    ingredients:[
      {emoji:'🍊', name:'Aperol 1л',              vol:'90 мл', cost:31.3, prevCost:26.6, changed:true },
      {emoji:'🍾', name:'Prosecco DOC 0.75л',     vol:'90 мл', cost:17.2, prevCost:17.2, changed:false},
      {emoji:'💧', name:'Содова вода',            vol:'60 мл', cost:0.8,  prevCost:0.8,  changed:false},
      {emoji:'🧊', name:'Лід',                    vol:'100 г', cost:1.2,  prevCost:1.2,  changed:false},
      {emoji:'🍊', name:'Апельсин (шматок)',      vol:'1 шт',  cost:1.0,  prevCost:1.0,  changed:false},
    ],
  },
  {
    id:'r3', emoji:'🍸', name:'Negroni',          category:'Класика · Джин',        cat:'classic',
    sellPrice:310, cost:54.8, fc:17.7, fcAlert:false,
    alertText:'', prevTotalCost:54.8, recommended:310,
    tech:{
      method:"1. У склянку Old Fashioned додайте лід\n2. Влийте 30мл Hendrick's Gin\n3. Додайте 30мл Campari\n4. Додайте 30мл Martini Rosso\n5. Перемішайте 20 секунд\n6. Прикрасьте цедрою апельсину",
      glass:'Old Fashioned 240мл', ice:'Кубики або велика куля',
      garnish:'Цедра апельсину', temp:'Охолоджений',
    },
    history:[
      {date:'15.03.2026', reason:"Hendrick's ↓ -5%", fc:17.7, delta:'-0.6%', color:'var(--green)'},
    ],
    ingredients:[
      {emoji:'🌿', name:"Hendrick's Gin 0.7л",  vol:'30 мл', cost:35.0, prevCost:35.0, changed:false},
      {emoji:'🍷', name:'Campari 0.7л',          vol:'30 мл', cost:17.7, prevCost:17.7, changed:false},
      {emoji:'🍸', name:'Martini Rosso 1л',      vol:'30 мл', cost:7.9,  prevCost:7.9,  changed:false},
    ],
  },
  {
    id:'r4', emoji:'🍋', name:'Whiskey Sour',     category:'Класика · Віскі',       cat:'classic',
    sellPrice:265, cost:49.3, fc:18.6, fcAlert:true,
    alertText:'Johnnie Walker Black +18% → фудкост зріс',
    prevTotalCost:41.7, recommended:300,
    tech:{
      method:'1. У шейкер додайте лід\n2. Влийте 45мл JW Black\n3. Додайте 25мл лимонного соку\n4. Додайте 15мл цукрового сиропу\n5. Додайте яєчний білок\n6. Shake 15 секунд, процідіть у бокал',
      glass:'Whisky Sour 220мл', ice:'Один кубик у бокалі',
      garnish:'Скибочка лимону + вишня', temp:'Охолоджений',
    },
    history:[
      {date:'08.05.2026', reason:'JW Black ↑ +18%', fc:18.6, delta:'+3.2%', color:'var(--amber)'},
    ],
    ingredients:[
      {emoji:'🥃', name:'Johnnie Walker Black 0.7л', vol:'45 мл', cost:52.5, prevCost:44.5, changed:true },
      {emoji:'🍋', name:'Свіжий лимонний сік',       vol:'25 мл', cost:2.0,  prevCost:2.0,  changed:false},
      {emoji:'🍬', name:'Цукровий сироп',            vol:'15 мл', cost:2.4,  prevCost:2.4,  changed:false},
      {emoji:'🥚', name:'Яєчний білок',              vol:'1 шт',  cost:2.0,  prevCost:2.0,  changed:false},
    ],
  },
  {
    id:'r5', emoji:'🌸', name:'Tanqueray Spritz', category:'Сигнатури · Джин',      cat:'signature',
    sellPrice:320, cost:55.3, fc:17.3, fcAlert:false,
    alertText:'', prevTotalCost:55.3, recommended:320,
    tech:{
      method:'1. Наповніть бокал льодом\n2. Влийте 45мл Tanqueray Flor de Sevilla\n3. Додайте 60мл Prosecco\n4. Долийте 60мл тоніку\n5. Прикрасьте скибочкою апельсину та гілочкою м\'яти',
      glass:'Бокал для вина 500мл', ice:'Кубики льоду',
      garnish:"Апельсин + м'ята", temp:'Охолоджений',
    },
    history:[],
    ingredients:[
      {emoji:'🌸', name:'Tanqueray Flor de Sevilla', vol:'45 мл', cost:52.4, prevCost:52.4, changed:false},
      {emoji:'🍾', name:'Просекко',                  vol:'60 мл', cost:11.5, prevCost:11.5, changed:false},
      {emoji:'💧', name:'Тонік',                     vol:'60 мл', cost:1.8,  prevCost:1.8,  changed:false},
    ],
  },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _search     = '';
let _cat        = 'all';
let _openId     = null;   // recipe detail open
let _detailTab  = 'ing';  // 'ing' | 'hist' | 'tech'
let _mgrSort    = 'fc-desc';

/* ════════════════════════
   HELPERS
════════════════════════ */
function fcColor(fc) {
  return fc > 22 ? 'var(--red)' : fc > 18 ? 'var(--amber)' : 'var(--green)';
}
function fcBorderCls(fc) {
  return fc > 22 ? 'rc-critical' : fc > 18 ? 'rc-alert' : 'rc-ok';
}

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="rec-css">
.rec-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.rec-scroll{overflow-y:auto;flex:1}.rec-scroll::-webkit-scrollbar{width:0}

/* topbar */
.rec-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.rec-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.rec-back:active{background:var(--bg3)}
.rec-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.rec-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* live badge */
.rec-live{display:inline-flex;align-items:center;gap:5px;background:var(--teal-bg);border:0.5px solid var(--teal-border);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--teal);font-family:var(--font-b)}
.rec-live-dot{width:5px;height:5px;border-radius:50%;background:var(--teal);animation:recLive 1.6s ease-in-out infinite}
@keyframes recLive{0%,100%{opacity:1}50%{opacity:.25}}

/* search */
.rec-search{position:relative;margin:0 14px 8px}
.rec-search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none}
.rec-search-inp{width:100%;height:40px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;padding:0 14px 0 36px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}
.rec-search-inp:focus{border-color:var(--teal);box-shadow:0 0 0 2px rgba(20,184,166,.1)}
.rec-search-inp::placeholder{color:var(--text2)}

/* cat chips */
.rec-chips{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.rec-chips::-webkit-scrollbar{height:0}
.rec-chip{flex-shrink:0;font-size:11px;padding:5px 13px;border-radius:20px;border:0.5px solid var(--border2);color:var(--text2);background:transparent;cursor:pointer;font-family:var(--font-b);transition:all .15s}
.rec-chip.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

/* fc alert strip */
.rec-fc-alert{margin:0 14px 10px;background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber);font-family:var(--font-b)}

/* sec label */
.rec-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.rec-sec-link{font-size:11px;color:var(--teal);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* recipe cards */
.rec-grid{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.rec-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .18s}
.rec-card:active{transform:scale(.98);background:var(--bg3)}
.rec-card.rc-alert{border-color:var(--amber-border)}
.rec-card.rc-critical{border-color:var(--red-border)}
.rec-card.rc-ok{border-color:var(--green-border)}
.rc-color-bar{height:3px;width:100%}
.rc-main{display:flex;align-items:center;gap:12px;padding:13px 14px}
.rc-emoji-box{width:48px;height:48px;border-radius:14px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.rc-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);letter-spacing:-.01em}
.rc-cat{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.rc-sell{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);text-align:right}
.rc-sell-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:1px;text-align:right}
.rc-fc-row{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 12px;border-top:0.5px solid var(--border)}
.rc-fc-bar-wrap{flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-right:10px}
.rc-fc-fill{height:100%;border-radius:3px;transition:width .5s ease}
.rc-fc-pct{font-family:var(--font-h);font-size:14px;font-weight:700;min-width:42px;text-align:right}
.rc-fc-cost{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-left:10px}
.rc-fc-badge{font-size:10px;padding:2px 7px;border-radius:10px;flex-shrink:0;margin-left:6px}
.rc-badge-up{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.rc-badge-ok{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}

/* ── DETAIL OVERLAY ── */
.rec-detail{position:absolute;inset:0;z-index:50;background:var(--bg1);display:none;flex-direction:column;animation:recSlide .3s cubic-bezier(.22,1,.36,1)}
.rec-detail.open{display:flex}
@keyframes recSlide{from{transform:translateX(100%);opacity:.5}to{transform:none;opacity:1}}

/* hero */
.rh-hero{padding:16px 18px;background:linear-gradient(160deg,rgba(20,184,166,.1) 0%,rgba(20,184,166,.03) 40%,transparent 70%);border-bottom:0.5px solid var(--border2);flex-shrink:0}
.rh-back{display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer}
.rh-back-arrow{width:32px;height:32px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center}
.rh-back-lbl{font-size:13px;color:var(--text2);font-family:var(--font-b)}
.rh-emoji-name{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.rh-big-emoji{width:58px;height:58px;border-radius:18px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:0.5px solid var(--border2)}
.rh-name{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;line-height:1}
.rh-cat{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:4px}
.rh-fc-blocks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
.rh-fc-blk{background:rgba(0,0,0,.35);border-radius:9px;padding:10px 8px;text-align:center;border:0.5px solid var(--border)}
.rh-fc-val{font-family:var(--font-h);font-size:20px;font-weight:800;line-height:1}
.rh-fc-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}
.rh-gauge-row{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.rh-gauge-bar{flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden}
.rh-gauge-fill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.22,1,.36,1)}
.rh-gauge-lbl{font-size:11px;font-family:var(--font-b);white-space:nowrap}
.rh-gauge-limits{display:flex;justify-content:space-between;font-size:9px;color:var(--text3);font-family:var(--font-b);padding:0 0 10px}
.rh-price-alert{background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:9px;padding:9px 12px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber);font-family:var(--font-b);line-height:1.4;margin-top:4px}

/* detail tabs */
.rh-tabs{display:flex;gap:2px;margin:10px 14px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px;flex-shrink:0}
.rh-tab{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.rh-tab.act{background:var(--bg3);color:var(--text0)}

/* ingredients tab */
.rh-ing-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.rh-ing-row{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px}
.rh-ing-row.changed{border-left:2.5px solid var(--amber)}
.rh-ing-row.unchanged{border-left:2.5px solid var(--green)}
.rh-ing-emoji{font-size:16px;flex-shrink:0;width:24px;text-align:center}
.rh-ing-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.rh-ing-vol{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.rh-ing-cost{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right}
.rh-ing-prev{font-size:10px;font-family:var(--font-b);margin-top:2px;text-align:right}

/* subtotal */
.rh-subtotal{display:flex;justify-content:space-between;align-items:center;margin:8px 14px 0;padding:11px 14px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px}
.rh-sub-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.rh-sub-note{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.rh-sub-val{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}

/* price suggestion */
.rh-price-sug{margin:8px 14px 0;background:var(--teal-bg);border:0.5px solid var(--teal-border);border-radius:12px;padding:12px 14px}
.rh-ps-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--teal);margin-bottom:8px}
.rh-ps-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.rh-ps-lbl{font-size:12px;color:var(--text1);font-family:var(--font-b)}
.rh-ps-val{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.rh-ps-val.rec{color:var(--teal)}
.rh-ps-note{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:7px;line-height:1.5}

/* history tab */
.rh-hist-chart{margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px}
.rh-hist-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);margin-bottom:12px}
.rh-hist-list{padding:0 14px;display:flex;flex-direction:column;gap:5px}
.rh-hist-row{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px}
.rh-hist-date{font-size:12px;color:var(--text2);font-family:var(--font-b);flex:1;min-width:80px}
.rh-hist-reason{font-size:11px;color:var(--text1);font-family:var(--font-b);flex:2}
.rh-hist-fc{font-family:var(--font-h);font-size:13px;font-weight:700;flex-shrink:0;min-width:44px;text-align:right}
.rh-hist-delta{font-size:10px;font-family:var(--font-b);flex-shrink:0;min-width:44px;text-align:right}

/* tech tab */
.rh-tech-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:16px}
.rh-tech-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);margin-bottom:10px}
.rh-tech-text{font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.75;white-space:pre-line}
.rh-tech-row{display:flex;justify-content:space-between;font-size:12px;font-family:var(--font-b);margin-bottom:6px}
.rh-tech-row:last-child{margin-bottom:0}

/* ── MANAGER VIEW ── */
.mgr-fc-overview{margin:0 14px 10px;background:linear-gradient(135deg,rgba(201,168,76,.1) 0%,rgba(201,168,76,.04) 50%,transparent 80%);border:0.5px solid var(--gold-border);border-radius:22px;padding:16px 18px}
.mfo-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.mfo-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.mfo-live{font-family:var(--font-h);font-size:24px;font-weight:800;color:var(--text0);line-height:1}
.mfo-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.mfo-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}
.mfo-stat{background:rgba(0,0,0,.3);border-radius:9px;padding:9px 8px;text-align:center;border:0.5px solid var(--border)}
.mfo-stat-val{font-family:var(--font-h);font-size:16px;font-weight:700;line-height:1}
.mfo-stat-lbl{font-size:9px;color:var(--text2);margin-top:3px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.04em;line-height:1.3}

/* bulk alert */
.mgr-bulk-alert{margin:0 14px 8px;background:var(--amber-bg);border:0.5px solid var(--amber-border);border-radius:16px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px}
.mba-icon{width:28px;height:28px;border-radius:8px;background:rgba(239,159,39,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mba-text{flex:1;font-size:12px;color:var(--amber);font-family:var(--font-b);line-height:1.5}
.mba-btn{font-size:11px;padding:4px 10px;border-radius:20px;cursor:pointer;border:none;background:var(--amber);color:#fff;font-family:var(--font-b);margin-top:4px;display:inline-block}

/* sort row */
.mgr-sort-row{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.mgr-sort-row::-webkit-scrollbar{height:0}
.mgr-sort-pill{flex-shrink:0;font-size:11px;padding:5px 12px;border-radius:20px;border:0.5px solid var(--border2);color:var(--text2);background:transparent;cursor:pointer;font-family:var(--font-b);transition:all .15s}
.mgr-sort-pill.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

/* manager recipe rows */
.mgr-rec-list{padding:0 14px}
.mgr-rec-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s;position:relative;padding-left:12px}
.mgr-rec-row:last-child{border-bottom:none}
.mgr-rec-row:active{background:var(--bg3)}
.mgr-rec-row::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:36px;border-radius:2px}
.mgr-rec-row.fc-ok::before{background:var(--green)}
.mgr-rec-row.fc-alert::before{background:var(--amber)}
.mgr-rec-row.fc-critical::before{background:var(--red)}
.mgr-rec-emoji{font-size:18px;flex-shrink:0}
.mgr-rec-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.mgr-rec-meta{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.mgr-rec-fc-bar{width:40px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden}
.mgr-rec-fc-fill{height:100%;border-radius:2px}
.mgr-rec-fc-val{font-family:var(--font-h);font-size:14px;font-weight:700;min-width:40px;text-align:right}
.mgr-rec-sell{font-size:12px;color:var(--text2);font-family:var(--font-b);min-width:48px;text-align:right}
.mgr-rec-edit{width:28px;height:28px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .12s}
.mgr-rec-edit:active{background:var(--bg4)}

/* add recipe */
.mgr-add-rec{display:flex;align-items:center;gap:10px;padding:12px 14px;margin:4px 14px 0;background:var(--gold-bg);border:0.5px dashed var(--gold-border);border-radius:12px;cursor:pointer;transition:all .15s}
.mgr-add-rec:hover{background:rgba(201,168,76,.12)}
.mar-icon{width:32px;height:32px;border-radius:8px;background:rgba(201,168,76,.12);border:0.5px solid var(--gold-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mar-text{font-size:13px;color:var(--gold);font-family:var(--font-b);font-weight:500}
.mar-sub{font-size:11px;color:rgba(201,168,76,.5);font-family:var(--font-b);margin-top:1px}

/* actions bar */
.rec-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.rec-btn{width:100%;height:52px;border:none;border-radius:13px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;letter-spacing:.02em}
.rec-btn-gold{background:var(--gold);color:#0b0d10;box-shadow:0 4px 20px rgba(201,168,76,.2)}
.rec-btn-gold:active{background:#b8963e}
.rec-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1)}
.rec-btn-ghost:active{background:var(--bg3)}
</style>`;

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
function recipeListHTML() {
  const q = _search.toLowerCase();
  let list = RECIPES.filter(r => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (_cat !== 'all' && r.cat !== _cat) return false;
    return true;
  });

  return list.map(r => {
    return `
    <div class="rec-card" style="border-color:var(--border)" onclick="window.__rec.openDetail('${r.id}')">
      <div class="rc-main">
        <div class="rc-emoji-box">${r.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="rc-name">${r.name}</div>
          <div class="rc-cat">${r.category}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 11l6-4-6-4" stroke="var(--text3)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderBartender() {
  const alertCount = RECIPES.filter(r => r.fcAlert).length;
  return `
  <div class="rec-topbar" style="flex-shrink:0">
    <div class="rec-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="rec-title">Рецепти</div>
      <div class="rec-sub">Живий фудкост · ${state.venue}</div>
    </div>
    <div class="rec-live"><div class="rec-live-dot"></div>Live</div>
  </div>

  <div class="rec-scroll">
    <!-- Search -->
    <div class="rec-search">
      <svg class="rec-search-ico" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/>
        <path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <input class="rec-search-inp" placeholder="Знайти рецепт…"
        value="${_search}" oninput="window.__rec.doSearch(this.value)"/>
    </div>

    <!-- Category chips -->
    <div class="rec-chips">
      ${[['all','Всі'],['classic','Класика'],['signature','Сигнатури'],['mocktail','Мокейлі'],['shot','Шоти']]
        .map(([id,lbl]) => `<div class="rec-chip ${_cat===id?'act':''}" onclick="window.__rec.setCat('${id}')">${lbl}</div>`).join('')}
    </div>

    <!-- FC alert strip -->
    ${alertCount > 0 ? `
    <div class="rec-fc-alert">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v3M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${alertCount} рецепти — фудкост зріс через зміну цін у накладних
    </div>` : ''}

    <!-- Recipe list -->
    <div class="rec-grid" id="rec-grid">${recipeListHTML()}</div>

    <div style="height:14px"></div>
  </div>

  <!-- DETAIL OVERLAY -->
  <div class="rec-detail ${_openId?'open':''}" id="rec-detail">
    ${_openId ? detailHTML(RECIPES.find(r=>r.id===_openId)) : ''}
  </div>`;
}

function detailHTML(r) {
  if (!r) return '';
  const col    = fcColor(r.fc);
  const margin = (r.sellPrice - r.cost).toFixed(1);
  const isMgr  = state.role === 'manager';

  /* Ingredients tab */
  const ingTab = `
  <div class="rh-ing-list">
    ${r.ingredients.map(ing => `
    <div class="rh-ing-row ${isMgr&&ing.changed?'changed':'unchanged'}">
      <div class="rh-ing-emoji">${ing.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="rh-ing-name">${ing.name}</div>
        <div class="rh-ing-vol">${ing.vol}</div>
      </div>
      ${isMgr ? `<div>
        <div class="rh-ing-cost" style="color:${ing.changed?'var(--amber)':'var(--text0)'}">${ing.cost.toFixed(1)} ₴</div>
        <div class="rh-ing-prev" style="color:${ing.changed?'var(--amber)':'var(--text2)'}">
          ${ing.changed ? `↑ було ${ing.prevCost.toFixed(1)} ₴` : '= без змін'}
        </div>
      </div>` : ''}
    </div>`).join('')}
  </div>
  ${isMgr ? `
  <div class="rh-subtotal">
    <div>
      <div class="rh-sub-lbl">Загальна собівартість</div>
      <div class="rh-sub-note">з актуальних цін накладних</div>
    </div>
    <div class="rh-sub-val">${r.cost.toFixed(1)} ₴</div>
  </div>
  <div class="rh-price-sug">
    <div class="rh-ps-title">AI-рекомендація по ціні</div>
    <div class="rh-ps-row"><div class="rh-ps-lbl">Поточна ціна</div><div class="rh-ps-val">${r.sellPrice} ₴</div></div>
    <div class="rh-ps-row"><div class="rh-ps-lbl">FC з поточною ціною</div><div class="rh-ps-val" style="color:${col}">${r.fc}%</div></div>
    <div class="rh-ps-row"><div class="rh-ps-lbl">Рекомендована ціна (FC 18%)</div><div class="rh-ps-val rec">${r.recommended} ₴</div></div>
    <div class="rh-ps-note">Підняти ціну до ${r.recommended} ₴ (+${r.recommended-r.sellPrice} ₴) або скоригувати об'єм інгредієнтів</div>
  </div>` : ''}
  <div style="height:14px"></div>`;

  /* History tab */
  const histTab = `
  <div class="rh-hist-chart">
    <div class="rh-hist-title">Динаміка фудкосту — 6 місяців</div>
    <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(239,159,39,.22)"/>
          <stop offset="100%" stop-color="rgba(239,159,39,.0)"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="24" x2="300" y2="24" stroke="rgba(29,158,117,.2)" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="2" y="22" font-size="7" fill="rgba(29,158,117,.6)" font-family="DM Sans">18%</text>
      <line x1="0" y1="44" x2="300" y2="44" stroke="rgba(239,159,39,.2)" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="2" y="42" font-size="7" fill="rgba(239,159,39,.6)" font-family="DM Sans">22%</text>
      <path d="M20,50 L70,48 L120,46 L170,44 L220,42 L270,40 L300,30 L300,80 L20,80 Z" fill="url(#recGrad)"/>
      <path d="M20,50 L70,48 L120,46 L170,44 L220,42 L270,40 L300,30" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="300" cy="30" r="4" fill="var(--amber)" stroke="var(--bg2)" stroke-width="2"/>
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:6px">
      <span>Жов</span><span>Лис</span><span>Гру</span><span>Січ</span><span>Лют</span><span>Бер</span><span>Тра</span>
    </div>
  </div>
  <div class="rh-hist-list">
    ${r.history.length ? r.history.map(h => `
    <div class="rh-hist-row">
      <div class="rh-hist-date">${h.date}</div>
      <div class="rh-hist-reason" style="color:${h.color}">${h.reason}</div>
      <div class="rh-hist-fc" style="color:${h.color}">${h.fc}%</div>
      <div class="rh-hist-delta" style="color:${h.color}">${h.delta.startsWith('-')?'↓':'↑'}${h.delta}</div>
    </div>`).join('') : `<div style="text-align:center;padding:16px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Змін цін не зафіксовано</div>`}
  </div>
  <div style="height:14px"></div>`;

  /* Tech tab */
  const techTab = `
  <div class="rh-tech-card">
    <div class="rh-tech-title">Метод приготування</div>
    <div class="rh-tech-text">${r.tech.method}</div>
  </div>
  <div class="rh-tech-card">
    <div class="rh-tech-title">Подача</div>
    ${[['Склянка',r.tech.glass],['Лід',r.tech.ice],['Гарнір',r.tech.garnish],['Температура',r.tech.temp]]
      .map(([k,v]) => `<div class="rh-tech-row"><span style="color:var(--text2)">${k}</span><span style="color:var(--text1)">${v}</span></div>`).join('')}
  </div>
  <div style="height:14px"></div>`;

  const tabs = { ing: ingTab, hist: histTab, tech: techTab };

  return `
  <div class="rec-scroll" style="flex:1">
    <!-- Hero -->
    <div class="rh-hero">
      <div class="rh-back" onclick="window.__rec.closeDetail()">
        <div class="rh-back-arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="rh-back-lbl">Назад до рецептів</div>
      </div>
      <div class="rh-emoji-name">
        <div class="rh-big-emoji">${r.emoji}</div>
        <div>
          <div class="rh-name">${r.name}</div>
          <div class="rh-cat">${r.category}</div>
        </div>
      </div>
      ${isMgr ? `
      <div class="rh-fc-blocks">
        <div class="rh-fc-blk">
          <div class="rh-fc-val" style="color:var(--teal)">${r.cost.toFixed(1)} ₴</div>
          <div class="rh-fc-lbl">Собівартість</div>
        </div>
        <div class="rh-fc-blk">
          <div class="rh-fc-val" style="color:var(--text0)">${r.sellPrice} ₴</div>
          <div class="rh-fc-lbl">Ціна продажу</div>
        </div>
        <div class="rh-fc-blk">
          <div class="rh-fc-val" style="color:var(--green)">${margin} ₴</div>
          <div class="rh-fc-lbl">Маржа</div>
        </div>
      </div>
      <div class="rh-gauge-row">
        <div class="rh-gauge-bar">
          <div class="rh-gauge-fill" style="width:${Math.min(r.fc/30*100,100)}%;background:${col}"></div>
        </div>
        <div class="rh-gauge-lbl" style="color:${col}">FC: ${r.fc}%</div>
      </div>
      <div class="rh-gauge-limits">
        <span>0%</span>
        <span style="color:var(--green)">≤18% (норма)</span>
        <span style="color:var(--amber)">≤22% (ліміт)</span>
        <span>30%</span>
      </div>
      ${r.fcAlert ? `
      <div class="rh-price-alert">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 12H1L7 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 5v3M7 10v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
        ${r.alertText}
      </div>` : ''}` : ''}
    </div>

    <!-- Tabs -->
    <div class="rh-tabs" style="flex-shrink:0">
      <button class="rh-tab ${_detailTab==='ing' ?'act':''}" onclick="window.__rec.setDetailTab('ing')">Інгредієнти</button>
      ${isMgr ? `<button class="rh-tab ${_detailTab==='hist'?'act':''}" onclick="window.__rec.setDetailTab('hist')">Динаміка FC</button>` : ''}
      <button class="rh-tab ${_detailTab==='tech'?'act':''}" onclick="window.__rec.setDetailTab('tech')">Техкарта</button>
    </div>

    ${tabs[_detailTab]}
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function mgrRecListHTML() {
  let list = [...RECIPES];
  if      (_mgrSort === 'fc-desc') list.sort((a,b) => b.fc - a.fc);
  else if (_mgrSort === 'fc-asc')  list.sort((a,b) => a.fc - b.fc);
  else if (_mgrSort === 'margin')  list.sort((a,b) => (b.sellPrice-b.cost) - (a.sellPrice-a.cost));
  else                             list.sort((a,b) => a.name.localeCompare(b.name));

  return list.map(r => {
    const col  = fcColor(r.fc);
    const barW = Math.min(r.fc / 30 * 100, 100);
    const cls  = r.fc > 22 ? 'fc-critical' : r.fc > 18 ? 'fc-alert' : 'fc-ok';
    return `
    <div class="mgr-rec-row ${cls}" onclick="window.__rec.openDetail('${r.id}')">
      <div class="mgr-rec-emoji">${r.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="mgr-rec-name">${r.name}</div>
        <div class="mgr-rec-meta">${r.category} · соб. ${r.cost.toFixed(1)} ₴</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <div class="mgr-rec-fc-bar"><div class="mgr-rec-fc-fill" style="width:${barW}%;background:${col}"></div></div>
        <div class="mgr-rec-fc-val" style="color:${col}">${r.fc}%</div>
      </div>
      <div class="mgr-rec-sell">${r.sellPrice} ₴</div>
      <div class="mgr-rec-edit" onclick="event.stopPropagation();alert('Редагування рецепту ${r.name}')">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9l1.5-1.5 5-5 1.5 1.5-5 5L2 11V9z" stroke="var(--text1)" stroke-width="1.2" stroke-linejoin="round"/></svg>
      </div>
    </div>`;
  }).join('');
}

function renderManager() {
  return `
  <div class="rec-topbar" style="flex-shrink:0">
    <div class="rec-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="rec-title">Фудкост меню</div>
      <div class="rec-sub">Менеджер · Живий перерахунок</div>
    </div>
    <div class="rec-live" style="background:var(--gold-bg);border-color:var(--gold-border);color:var(--gold)">
      <div class="rec-live-dot" style="background:var(--gold)"></div>Live
    </div>
  </div>

  <div class="rec-scroll">
    <!-- FC Overview -->
    <div class="mgr-fc-overview">
      <div class="mfo-hdr">
        <div>
          <div class="mfo-title">Середній FC меню</div>
          <div style="font-size:11px;color:rgba(201,168,76,.6);font-family:var(--font-b);margin-top:2px">Актуально з останніх накладних</div>
        </div>
        <div style="text-align:right">
          <div class="mfo-live">19.4%</div>
          <div class="mfo-sub" style="color:var(--amber)">↑ +2.1% vs місяць тому</div>
        </div>
      </div>
      <div class="mfo-stats">
        <div class="mfo-stat"><div class="mfo-stat-val" style="color:var(--red)">2</div><div class="mfo-stat-lbl">Над<br/>лімітом</div></div>
        <div class="mfo-stat"><div class="mfo-stat-val" style="color:var(--amber)">2</div><div class="mfo-stat-lbl">В зоні<br/>ризику</div></div>
        <div class="mfo-stat"><div class="mfo-stat-val" style="color:var(--green)">1</div><div class="mfo-stat-lbl">В нормі</div></div>
      </div>
    </div>

    <!-- Bulk alert -->
    <div class="mgr-bulk-alert">
      <div class="mba-icon">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v3M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <div class="mba-text">
        Johnnie Walker Black +18% спричинив перевищення FC у 3 рецептах.
        <button class="mba-btn" onclick="alert('Перерахунок цін меню...')">Перерахувати ціни</button>
      </div>
    </div>

    <!-- Sort -->
    <div class="rec-sec">Всі рецепти (${RECIPES.length})</div>
    <div class="mgr-sort-row">
      ${[['fc-desc','FC ↓ (критичні)'],['fc-asc','FC ↑'],['margin','Маржа ↓'],['name','A–Я']]
        .map(([id,lbl]) => `<div class="mgr-sort-pill ${_mgrSort===id?'act':''}" onclick="window.__rec.setSort('${id}')">${lbl}</div>`).join('')}
    </div>

    <!-- Recipe list -->
    <div class="mgr-rec-list" id="mgr-rec-list">${mgrRecListHTML()}</div>

    <!-- Add recipe -->
    <div class="mgr-add-rec" onclick="alert('Форма додавання рецепту...')">
      <div class="mar-icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="var(--gold)" stroke-width="1.6" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="mar-text">Додати новий рецепт</div>
        <div class="mar-sub">Фудкост розрахується автоматично</div>
      </div>
    </div>

    <div style="height:14px"></div>
  </div>

  <div class="rec-actions">
    <button class="rec-btn rec-btn-gold" onclick="alert('Перерахунок цін меню...')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l5 5 5-10" stroke="#0b0d10" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Перерахувати ціни меню
    </button>
    <button class="rec-btn rec-btn-ghost" onclick="alert('Звіт по фудкосту...')">Згенерувати звіт FC</button>
  </div>

  <!-- DETAIL (manager can also open) -->
  <div class="rec-detail ${_openId?'open':''}" id="rec-detail-mgr">
    ${_openId ? detailHTML(RECIPES.find(r=>r.id===_openId)) : ''}
  </div>`;
}

/* ════════════════════════
   MAIN BUILD
════════════════════════ */
function buildHTML() {
  const body = state.role === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="rec-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function refreshList() {
  const el = document.getElementById('rec-grid');
  if (el) el.innerHTML = recipeListHTML();
  const mel = document.getElementById('mgr-rec-list');
  if (mel) mel.innerHTML = mgrRecListHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function doSearch(q)  { _search = q; refreshList(); }
function setCat(cat)  { _cat = cat; refreshList(); }
function setSort(s)   { _mgrSort = s; fullRender(); }

function openDetail(id) {
  _openId    = id;
  _detailTab = 'ing';
  fullRender();
}
function closeDetail() {
  _openId = null;
  fullRender();
}
function setDetailTab(tab) {
  _detailTab = tab;
  // partial re-render of detail content only
  const detailEl = document.getElementById('rec-detail') || document.getElementById('rec-detail-mgr');
  if (detailEl) {
    const r = RECIPES.find(x => x.id === _openId);
    if (r) detailEl.innerHTML = detailHTML(r);
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _search    = '';
    _cat       = 'all';
    _openId    = null;
    _detailTab = 'ing';
    _mgrSort   = 'fc-desc';
    return buildHTML();
  },
  init() {
    window.__rec = {
      doSearch, setCat, setSort,
      openDetail, closeDetail, setDetailTab,
    };
  },
};


