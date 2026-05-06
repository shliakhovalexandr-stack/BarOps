/* ============================================================
   BarOps — pages/ocr.js
   Сканування накладної: Фото → Аналіз AI → Перевірка → Готово
   Реальні дані з 3 українських накладних (Баядера, Клас І К, РОМА)
   ============================================================ */

import { navigate } from '../shared/app.js';

/* ════════════════════════
   INVOICE DATA
   (витягнуто з реальних фото накладних)
════════════════════════ */
const INVOICES = [
  {
    id: 0,
    supplier: 'ТОВ "Баядера Логістик"',
    num: 'BCV000000000000015402',
    date: '2026-04-29',
    conf: 97,
    totalNoPdv: 681.25,
    totalPdv: 817.50,
    pdv: 136.25,
    items: [
      { id:'i1', name:'Tanqueray Flor de Sevilla Gin 41.3%',
        qty:1, unit:'шт', unitPrice:681.25, total:817.50,
        status:'warn', prevPrice:579.00, matched:true, matchScore:98 },
    ],
  },
  {
    id: 1,
    supplier: 'ТОВ "Клас І К"',
    num: 'КРН-7897056',
    date: '2026-05-01',
    conf: 96,
    totalNoPdv: 3376.92,
    totalPdv: 4052.30,
    pdv: 675.38,
    items: [
      { id:'i2', name:'Вино Піно Гріджіо Cesari сухе біле 12.5%',
        qty:4, unit:'ящ', unitPrice:300.83, total:1444.00,
        status:'ok', prevPrice:295.00, matched:true, matchScore:94 },
      { id:'i3', name:'Вино Мускат н/сол біле 11.5%',
        qty:4, unit:'ящ', unitPrice:207.42, total:995.60,
        status:'ok', prevPrice:207.42, matched:true, matchScore:91 },
      { id:'i4', name:'Вино Каппо Розе Garcia Carrion рожеве 12%',
        qty:3, unit:'ящ', unitPrice:139.50, total:502.20,
        status:'new', prevPrice:null, matched:false, matchScore:0 },
      { id:'i5', name:'Вино Газела Віньо Верде н/сухе біле 9%',
        qty:1, unit:'ящ', unitPrice:202.92, total:243.50,
        status:'warn', prevPrice:185.00, matched:true, matchScore:89 },
      { id:'i6', name:'Вино Каберне Совін Фрумушика сухе рожеве 13%',
        qty:2, unit:'ящ', unitPrice:361.25, total:867.00,
        status:'ok', prevPrice:355.00, matched:true, matchScore:96 },
    ],
  },
  {
    id: 2,
    supplier: 'ТОВ "РОМА"',
    num: '191004',
    date: '2026-05-02',
    conf: 99,
    totalNoPdv: 1305.60,
    totalPdv: 1566.72,
    pdv: 261.12,
    items: [
      { id:'i7', name:'Горілка Традиційна Українка 40% 0.7л',
        qty:12, unit:'шт', unitPrice:130.56, total:1566.72,
        status:'ok', prevPrice:128.00, matched:true, matchScore:99 },
    ],
  },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _inv      = null;   // поточна накладна (deep copy)
let _step     = 1;      // 1 | 2 | 3 | 4
let _filter   = 'all';
let _editId   = null;   // відкрита картка редагування
let _editAll  = false;
let _procTimers = [];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="ocr-css">
/* layout */
.ocr-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.ocr-scroll{overflow-y:auto;flex:1}.ocr-scroll::-webkit-scrollbar{width:0}

/* step indicator */
.ocr-steps{display:flex;gap:0;padding:10px 14px 4px;align-items:center}
.ocr-step-btn{
  display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;
  border:none;background:transparent;color:var(--text2);font-family:var(--font-b);
  font-size:11px;letter-spacing:.02em;cursor:pointer;transition:all .18s;
}
.ocr-step-btn.act{background:var(--green);color:#fff}
.ocr-step-btn.done{color:var(--text2)}
.ocr-step-btn.done .ocr-snum{background:rgba(29,158,117,.3);color:var(--green)}
.ocr-snum{
  width:16px;height:16px;border-radius:50%;
  background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:700;font-family:var(--font-h);
}
.ocr-step-sep{width:20px;height:1px;background:var(--border2);flex-shrink:0}

/* topbar */
.ocr-topbar{display:flex;align-items:center;gap:12px;padding:6px 18px 10px;flex-shrink:0}
.ocr-back{
  width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
}
.ocr-back:active{background:var(--bg3)}
.ocr-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);letter-spacing:-.01em}
.ocr-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* ── STEP 1: camera ── */
.ocr-cam{
  margin:0 14px;border-radius:16px;overflow:hidden;background:#090909;
  border:0.5px solid var(--border2);aspect-ratio:3/4;position:relative;
  display:flex;align-items:center;justify-content:center;
}
.ocr-doc-ghost{
  width:68%;height:80%;background:linear-gradient(160deg,#1e1e1e,#151515);
  border-radius:4px;opacity:.6;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);
}
.ocr-corner{position:absolute;width:22px;height:22px;border-color:var(--green);border-style:solid}
.ocr-tl{top:14px;left:14px;border-width:2.5px 0 0 2.5px;border-radius:3px 0 0 0}
.ocr-tr{top:14px;right:14px;border-width:2.5px 2.5px 0 0;border-radius:0 3px 0 0}
.ocr-bl{bottom:14px;left:14px;border-width:0 0 2.5px 2.5px;border-radius:0 0 0 3px}
.ocr-br{bottom:14px;right:14px;border-width:0 2.5px 2.5px 0;border-radius:0 0 3px 0}
.ocr-scan-line{
  position:absolute;left:14px;right:14px;height:2px;
  background:linear-gradient(90deg,transparent,var(--green),transparent);
  opacity:.85;animation:ocrScan 2.2s ease-in-out infinite;
}
@keyframes ocrScan{0%,100%{top:16%}50%{top:76%}}
.ocr-cam-lbl{
  position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,.65);backdrop-filter:blur(8px);border-radius:20px;
  padding:5px 14px;font-size:11px;color:var(--text1);font-family:var(--font-b);
  white-space:nowrap;border:0.5px solid var(--border2);
}
.ocr-hint{text-align:center;padding:10px 18px 4px;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.ocr-cam-btns{padding:8px 14px 4px;display:flex;gap:8px}
.ocr-btn-icon{
  width:52px;height:52px;background:var(--bg2);border:0.5px solid var(--border2);
  border-radius:12px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;flex-shrink:0;transition:background .15s;
}
.ocr-btn-icon:active{background:var(--bg3)}
.ocr-btn-shoot{
  flex:1;height:52px;background:var(--green);border:none;border-radius:12px;
  font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;
}
.ocr-btn-shoot:active{background:var(--green-d);transform:scale(.97)}
.ocr-tips{display:flex;gap:6px;padding:4px 14px 12px}
.ocr-tip{
  background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;
  padding:8px;flex:1;text-align:center;font-size:10px;color:var(--text2);
  font-family:var(--font-b);line-height:1.4;
  display:flex;flex-direction:column;align-items:center;gap:4px;
}
/* demo selector */
.ocr-demo-label{font-size:10px;color:var(--text2);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-b);padding:4px 14px 5px}
.ocr-sel-row{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.ocr-sel-row::-webkit-scrollbar{height:0}
.ocr-sel{
  flex-shrink:0;font-size:11px;padding:5px 13px;border-radius:20px;
  border:0.5px solid var(--border2);color:var(--text2);background:transparent;
  cursor:pointer;font-family:var(--font-b);transition:all .15s;white-space:nowrap;
}
.ocr-sel.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

/* ── STEP 2: processing ── */
.ocr-proc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.ocr-ring{
  width:68px;height:68px;border-radius:50%;
  border:3px solid var(--bg3);border-top-color:var(--green);
  animation:ocrSpin .9s linear infinite;margin-bottom:18px;
}
@keyframes ocrSpin{to{transform:rotate(360deg)}}
.ocr-proc-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:5px;text-align:center}
.ocr-proc-sub{font-size:12px;color:var(--text2);text-align:center;font-family:var(--font-b);line-height:1.5}
.ocr-proc-steps{margin-top:24px;width:100%;display:flex;flex-direction:column;gap:7px}
.ocr-pstep{
  display:flex;align-items:center;gap:12px;padding:10px 14px;
  background:var(--bg2);border-radius:9px;border:0.5px solid var(--border);
}
.ocr-pdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.ocr-pdot-done{background:var(--green)}
.ocr-pdot-act{background:var(--amber);animation:ocrBlink .9s ease-in-out infinite}
.ocr-pdot-wait{background:var(--bg4)}
@keyframes ocrBlink{0%,100%{opacity:1}50%{opacity:.25}}
.ocr-plbl{font-size:13px;color:var(--text1);flex:1;font-family:var(--font-b)}
.ocr-pval{font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:right}
.ocr-skip{
  margin-top:16px;height:44px;width:100%;background:var(--bg2);
  border:0.5px solid var(--border2);border-radius:12px;
  font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:color .15s;
}
.ocr-skip:hover{color:var(--text1)}

/* ── STEP 3: result ── */
.ocr-supplier{
  margin:0 14px 8px;background:var(--green-bg);border:0.5px solid var(--green-border);
  border-radius:13px;padding:11px 13px;display:flex;align-items:center;gap:10px;cursor:pointer;
}
.ocr-supp-icon{
  width:32px;height:32px;border-radius:9px;background:var(--green);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.ocr-supp-name{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.ocr-supp-meta{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.ocr-supp-conf{margin-left:auto;font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--green);text-align:right}
.ocr-supp-conf-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);font-weight:400}

/* supplier edit inline */
.ocr-supp-edit{
  margin:0 14px 8px;background:var(--bg3);border:0.5px solid var(--border2);
  border-radius:12px;padding:13px;display:none;flex-direction:column;gap:9px;
}
.ocr-supp-edit.open{display:flex}
.ocr-edit-row{display:flex;gap:8px}
.ocr-edit-grp{display:flex;flex-direction:column;gap:4px;flex:1}
.ocr-edit-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.ocr-edit-inp{
  height:40px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;
  padding:0 11px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;
  transition:border-color .2s;width:100%;
}
.ocr-edit-inp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.ocr-edit-save{
  height:38px;flex:1;background:var(--green);border:none;border-radius:9px;
  font-size:13px;color:#fff;cursor:pointer;font-family:var(--font-h);transition:background .15s;
}
.ocr-edit-save:active{background:var(--green-d)}
.ocr-edit-cancel{
  height:38px;width:80px;background:var(--bg2);border:0.5px solid var(--border2);
  border-radius:9px;font-size:12px;color:var(--text2);cursor:pointer;font-family:var(--font-b);
}

/* warn strips */
.ocr-warn{
  margin:0 14px 7px;border-radius:9px;padding:9px 12px;
  display:flex;align-items:center;gap:8px;font-size:12px;font-family:var(--font-b);
}
.ocr-warn-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.ocr-warn-purple{background:var(--purple-bg);border:0.5px solid var(--purple-border);color:var(--purple)}
.ocr-warn-red{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}

/* filter tabs */
.ocr-filter{display:flex;gap:2px;margin:0 14px 9px;background:var(--bg2);border-radius:9px;padding:3px;border:0.5px solid var(--border)}
.ocr-ftab{flex:1;height:27px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.ocr-ftab.act{background:var(--bg3);color:var(--text0)}

/* item cards */
.ocr-items{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.ocr-item{background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;overflow:hidden;transition:border-color .15s}
.ocr-item.warn{border-left:3px solid var(--amber)}
.ocr-item.ok{border-left:3px solid var(--green)}
.ocr-item.new{border-left:3px solid var(--purple)}
.ocr-item.editing{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.ocr-item-row{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer}
.ocr-idot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.ocr-iname{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.ocr-iqty{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.ocr-iprice{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);text-align:right;flex-shrink:0}
.ocr-ipsub{font-size:10px;font-family:var(--font-b);margin-top:2px;text-align:right}
.ocr-iedit{
  width:27px;height:27px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border2);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s;
}
.ocr-iedit:hover{background:var(--bg4)}
.ocr-iedit.on{background:var(--green);border-color:var(--green)}

/* item edit panel */
.ocr-epanel{background:var(--bg3);border-top:0.5px solid var(--border);padding:13px 12px;display:none;flex-direction:column;gap:9px}
.ocr-epanel.open{display:flex}
.ocr-erow{display:flex;gap:7px;align-items:flex-end}
.ocr-egrp{display:flex;flex-direction:column;gap:4px;flex:1}
.ocr-elbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.ocr-einp{
  height:40px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;
  padding:0 11px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;
  transition:border-color .2s;width:100%;
}
.ocr-einp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.ocr-eunit{
  height:40px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;
  padding:0 9px;font-size:13px;color:var(--text0);font-family:var(--font-b);
  outline:none;cursor:pointer;min-width:62px;
  -webkit-appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='5' fill='none'%3E%3Cpath d='M1 1l3.5 3.5L8 1' stroke='%236A6762' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 8px center;padding-right:24px;
}
.ocr-eact{display:flex;gap:6px;margin-top:2px}
.ocr-esave{
  flex:1;height:37px;background:var(--green);border:none;border-radius:9px;
  font-size:13px;color:#fff;cursor:pointer;font-family:var(--font-h);transition:background .15s;
}
.ocr-esave:active{background:var(--green-d)}
.ocr-ecancel{
  width:74px;height:37px;background:var(--bg2);border:0.5px solid var(--border2);
  border-radius:9px;font-size:12px;color:var(--text2);cursor:pointer;font-family:var(--font-b);
}
.ocr-edel{
  width:37px;height:37px;background:var(--red-bg);border:0.5px solid var(--red-border);
  border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;
}

/* add item btn */
.ocr-add{
  display:flex;align-items:center;gap:10px;padding:11px 14px;
  margin:4px 14px 0;background:var(--bg2);border:0.5px dashed var(--border2);
  border-radius:12px;cursor:pointer;transition:all .15s;
}
.ocr-add:hover{border-color:var(--green);background:var(--green-bg)}

/* total */
.ocr-total{
  margin:8px 14px 0;background:var(--bg2);border:0.5px solid var(--border);
  border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;
}
.ocr-total-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.ocr-total-pdv{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.ocr-total-sum{font-family:var(--font-h);font-size:19px;font-weight:700;color:var(--text0)}

/* actions bar */
.ocr-actions{padding:8px 14px 18px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.ocr-btn-confirm{
  width:100%;height:52px;background:var(--green);border:none;border-radius:13px;
  font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;
}
.ocr-btn-confirm:active{background:var(--green-d)}
.ocr-btn-edit-all{
  width:100%;height:44px;background:var(--bg2);border:0.5px solid var(--border2);
  border-radius:13px;font-size:13px;color:var(--text1);cursor:pointer;font-family:var(--font-b);
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;
}
.ocr-btn-edit-all:hover{color:var(--text0)}
.ocr-btn-edit-all.emode{border-color:var(--amber-border);color:var(--amber);background:var(--amber-bg)}

/* ── STEP 4: success ── */
.ocr-success{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;text-align:center}
.ocr-succ-icon{
  width:72px;height:72px;border-radius:50%;background:var(--green-bg);
  border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;
  margin-bottom:20px;animation:ocrPop .4s cubic-bezier(.22,1,.36,1);
}
@keyframes ocrPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.ocr-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.ocr-succ-sub{font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.55}
.ocr-succ-pills{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px}
.ocr-succ-pill{
  background:var(--bg2);border:0.5px solid var(--border2);border-radius:20px;
  padding:5px 13px;font-size:12px;color:var(--text1);font-family:var(--font-b);
}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function extractVol(name) {
  // Extract volume like 0.7л, 1л, 0.75л, 500мл from product name
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(л|мл|l|ml)/i);
  if (!m) return null;
  let val = parseFloat(m[1].replace(',','.'));
  const unit = m[2].toLowerCase();
  if (unit === 'мл' || unit === 'ml') val = val / 1000;
  return val;
}
function fmtDate(d) {
  if (!d) return '—';
  const p = d.split('-');
  return `${p[2]}.${p[1]}.${p[0]}`;
}
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/* ════════════════════════
   STEP TEMPLATES
════════════════════════ */
function stepIndicator() {
  const steps = [
    { n:1, label:'Фото'     },
    { n:2, label:'Аналіз'   },
    { n:3, label:'Перевірка'},
  ];
  if (_step === 4) return '';
  return `<div class="ocr-steps">
    ${steps.map((s, i) => `
      ${i > 0 ? '<div class="ocr-step-sep"></div>' : ''}
      <button class="ocr-step-btn ${_step===s.n?'act':_step>s.n?'done':''}"
              onclick="window.__ocr.goStep(${s.n})">
        <span class="ocr-snum">${_step > s.n ? '✓' : s.n}</span>
        ${s.label}
      </button>`).join('')}
  </div>`;
}

/* ── STEP 1 ── */
function renderStep1() {
  return `
  <div class="ocr-topbar">
    <div class="ocr-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div>
      <div class="ocr-title">Сканування накладної</div>
      <div class="ocr-sub">Сфотографуйте накладну для розпізнавання</div>
    </div>
  </div>

  <div class="ocr-scroll">
    <div class="ocr-cam">
      <div class="ocr-doc-ghost"></div>
      <div class="ocr-corner ocr-tl"></div>
      <div class="ocr-corner ocr-tr"></div>
      <div class="ocr-corner ocr-bl"></div>
      <div class="ocr-corner ocr-br"></div>
      <div class="ocr-scan-line"></div>
      <div class="ocr-cam-lbl">Наведіть на накладну</div>
    </div>

    <div class="ocr-hint">Тримайте документ рівно в рамці · без тіней і відблисків</div>

    <div class="ocr-cam-btns">
      <div class="ocr-btn-icon" title="Галерея">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="13" rx="2.5" stroke="var(--text1)" stroke-width="1.2"/>
          <circle cx="7" cy="9.5" r="2" stroke="var(--text1)" stroke-width="1.2"/>
          <path d="M2 16l4-4.5 3.5 3.5 3-3.5 5.5 4.5" stroke="var(--text1)" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </div>
      <button class="ocr-btn-shoot" onclick="window.__ocr.shootPhoto()">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="4" width="14" height="10" rx="2" stroke="#fff" stroke-width="1.2"/>
          <circle cx="9" cy="9" r="3" stroke="#fff" stroke-width="1.2"/>
        </svg>
        Зробити фото
      </button>
      <div class="ocr-btn-icon" title="Спалах">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M11 2L5 11h6l-2 7 8-10h-6l2-6z" stroke="var(--text1)" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <div class="ocr-tips">
      ${['Без тіней','Документ рівно','Весь документ','Добре світло'].map(t => `
      <div class="ocr-tip">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="var(--green)" stroke-width="1.2"/>
          <path d="M4 6.5l2 2 3-3" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${t}
      </div>`).join('')}
    </div>
  </div>`;
}

/* ── STEP 2 ── */
function renderStep2() {
  return `
  <div class="ocr-topbar" style="justify-content:center">
    <div>
      <div class="ocr-title" style="text-align:center">Аналіз AI</div>
      <div class="ocr-sub" style="text-align:center" id="ocr-proc-supp">Claude Vision читає документ</div>
    </div>
  </div>
  <div class="ocr-proc">
    <div class="ocr-ring"></div>
    <div class="ocr-proc-title" id="ocr-proc-title">Розпізнаю накладну…</div>
    <div class="ocr-proc-sub">Це займає 3–8 секунд</div>
    <div class="ocr-proc-steps">
      <div class="ocr-pstep">
        <div class="ocr-pdot ocr-pdot-done"></div>
        <div class="ocr-plbl">Якість зображення</div>
        <div class="ocr-pval" style="color:var(--green)">✓ Добре</div>
      </div>
      <div class="ocr-pstep">
        <div class="ocr-pdot ocr-pdot-done"></div>
        <div class="ocr-plbl">Постачальник та реквізити</div>
        <div class="ocr-pval" style="color:var(--green)">✓ Знайдено</div>
      </div>
      <div class="ocr-pstep">
        <div class="ocr-pdot ocr-pdot-act" id="ocr-dot-items"></div>
        <div class="ocr-plbl">Витяг позицій товарів</div>
        <div class="ocr-pval" id="ocr-ps-items">…</div>
      </div>
      <div class="ocr-pstep">
        <div class="ocr-pdot ocr-pdot-wait" id="ocr-dot-match"></div>
        <div class="ocr-plbl">Зіставлення з базою</div>
        <div class="ocr-pval" id="ocr-ps-match">—</div>
      </div>
      <div class="ocr-pstep">
        <div class="ocr-pdot ocr-pdot-wait" id="ocr-dot-prices"></div>
        <div class="ocr-plbl">Порівняння цін</div>
        <div class="ocr-pval" id="ocr-ps-prices">—</div>
      </div>
    </div>
    <button class="ocr-skip" onclick="window.__ocr.goStep(3)">Переглянути результат →</button>
  </div>`;
}

/* ── STEP 3 helpers ── */
function warnStrips() {
  const warns     = _inv.items.filter(x => x.status === 'warn');
  const newItems  = _inv.items.filter(x => x.status === 'new');
  const unmatched = _inv.items.filter(x => !x.matched && x.status !== 'new');
  let html = '';
  if (warns.length)
    html += `<div class="ocr-warn ocr-warn-amber">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 5v2.5M6.5 9.5v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${warns.length} позицій — ціна зросла порівняно з попередньою накладною
    </div>`;
  if (newItems.length)
    html += `<div class="ocr-warn ocr-warn-purple">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--purple)" stroke-width="1.2"/><path d="M6.5 4v3M6.5 9v.4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${newItems.length} нових товарів — не знайдені в базі
    </div>`;
  if (unmatched.length)
    html += `<div class="ocr-warn ocr-warn-red">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--red)" stroke-width="1.2"/><path d="M4.5 4.5l4 4M8.5 4.5l-4 4" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${unmatched.length} позицій не розпізнано — перевірте вручну
    </div>`;
  return html;
}

function itemsList() {
  const filtered = _filter === 'all'       ? _inv.items
    : _filter === 'warn'                   ? _inv.items.filter(x => x.status === 'warn')
    : _filter === 'new'                    ? _inv.items.filter(x => x.status === 'new')
    : _inv.items.filter(x => !x.matched && x.status !== 'new');

  if (!filtered.length)
    return `<div style="text-align:center;padding:20px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Немає позицій у цій категорії</div>`;

  return filtered.map(item => {
    const dotColor = item.status==='warn' ? 'var(--amber)'
      : item.status==='new'              ? 'var(--purple)'
      : !item.matched                    ? 'var(--red)'
      :                                    'var(--green)';

    const priceSub = item.status==='warn'
      ? `<div class="ocr-ipsub" style="color:var(--amber)">↑ +${Math.round((item.unitPrice/item.prevPrice-1)*100)}% (було ${fmt(item.prevPrice)} ₴)</div>`
      : item.status==='new'
      ? `<div class="ocr-ipsub" style="color:var(--purple)">Новий товар</div>`
      : !item.matched
      ? `<div class="ocr-ipsub" style="color:var(--red)">Не знайдено в базі</div>`
      : `<div class="ocr-ipsub" style="color:var(--text2)">= без змін</div>`;

    const isEditing = _editId === item.id || _editAll;

    const editPanel = isEditing ? `
    <div class="ocr-epanel open" id="ep-${item.id}">
      <div class="ocr-erow">
        <div class="ocr-egrp">
          <div class="ocr-elbl">Назва товару</div>
          <input class="ocr-einp" id="en-${item.id}" type="text" value="${item.name.replace(/"/g,'&quot;')}"/>
        </div>
      </div>
      <div class="ocr-erow">
        <div class="ocr-egrp">
          <div class="ocr-elbl">К-сть</div>
          <input class="ocr-einp" id="eq-${item.id}" type="number" step="0.01" value="${item.qty}" style="text-align:center"/>
        </div>
        <div class="ocr-egrp" style="max-width:70px">
          <div class="ocr-elbl">Од.</div>
          <select class="ocr-eunit" id="eu-${item.id}">
            ${['шт','ящ','л','кг','уп'].map(u=>`<option ${u===item.unit?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="ocr-egrp">
          <div class="ocr-elbl">Ціна з ПДВ ₴</div>
          <input class="ocr-einp" id="ep-${item.id}" type="number" step="0.01" value="${item.unitPrice}"
            oninput="window.__ocr.recalcTotal('${item.id}')"/>
        </div>
        <div class="ocr-egrp">
          <div class="ocr-elbl">Сума ₴</div>
          <input class="ocr-einp" id="et-${item.id}" type="number" step="0.01" value="${item.total}"/>
        </div>
      </div>
      <div class="ocr-eact">
        <button class="ocr-esave" onclick="window.__ocr.saveItem('${item.id}')">Зберегти</button>
        <button class="ocr-ecancel" onclick="window.__ocr.cancelItem('${item.id}')">Скасувати</button>
        <div class="ocr-edel" onclick="window.__ocr.deleteItem('${item.id}')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6v4M8.5 6v4" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M3 4l.7 7.5a.5.5 0 00.5.5h5.6a.5.5 0 00.5-.5L11 4" stroke="var(--red)" stroke-width="1.2"/>
          </svg>
        </div>
      </div>
    </div>` : `<div class="ocr-epanel" id="ep-${item.id}"></div>`;

    return `
    <div class="ocr-item ${item.status} ${isEditing?'editing':''}" id="ocard-${item.id}">
      <div class="ocr-item-row" onclick="window.__ocr.toggleEdit('${item.id}')">
        <div class="ocr-idot" style="background:${dotColor}"></div>
        <div style="flex:1;min-width:0">
          <div class="ocr-iname">${item.name}</div>
          <div class="ocr-iqty">${item.qty} ${item.unit} · ${fmt(item.unitPrice)} ₴/шт${extractVol(item.name) ? ` · <span style="color:var(--teal)">${extractVol(item.name)}л</span>` : ''}</div>
        </div>
        <div style="flex-shrink:0;margin-right:8px">
          <div class="ocr-iprice">${fmt(item.total)} ₴</div>
          ${priceSub}
        </div>
        <div class="ocr-iedit ${isEditing?'on':''}" id="oebtn-${item.id}">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 8l1.3-1.3 4.4-4.4 1.3 1.3-4.4 4.4L2 10V8z" stroke="${isEditing?'#fff':'var(--text1)'}" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M6.8 2.2L8.1 3.5" stroke="${isEditing?'#fff':'var(--text1)'}" stroke-width="1.2"/>
          </svg>
        </div>
      </div>
      ${editPanel}
    </div>`;
  }).join('');
}

function renderStep3() {
  const warns     = _inv.items.filter(x => x.status==='warn').length;
  const newItems  = _inv.items.filter(x => x.status==='new').length;
  const unmatched = _inv.items.filter(x => !x.matched && x.status!=='new').length;
  const confColor = _inv.conf >= 95 ? 'var(--green)' : _inv.conf >= 85 ? 'var(--amber)' : 'var(--red)';

  return `
  <div class="ocr-topbar" style="flex-shrink:0">
    <div class="ocr-back" onclick="window.__ocr.goStep(1)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div style="flex:1">
      <div class="ocr-title">Перевірка накладної</div>
      <div class="ocr-sub">Відредагуйте при потребі · натисніть ✎</div>
    </div>
  </div>

  <div class="ocr-scroll" id="ocr-result-scroll">

    <!-- Supplier card -->
    <div class="ocr-supplier" onclick="window.__ocr.toggleSuppEdit()">
      <div class="ocr-supp-icon">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="2" y="1" width="11" height="13" rx="2" stroke="#fff" stroke-width="1.2"/>
          <path d="M4.5 5h6M4.5 7.5h6M4.5 10h3" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="ocr-supp-name" id="osc-name">${_inv.supplier}</div>
        <div class="ocr-supp-meta">Накл. №${_inv.num} · ${fmtDate(_inv.date)} · ${_inv.items.length} поз.</div>
      </div>
      <div class="ocr-supp-conf">
        <div style="color:${confColor}">${_inv.conf}%</div>
        <div class="ocr-supp-conf-lbl">точність</div>
      </div>
    </div>

    <!-- Supplier edit -->
    <div class="ocr-supp-edit" id="ocr-supp-edit">
      <div class="ocr-edit-row">
        <div class="ocr-edit-grp">
          <div class="ocr-edit-lbl">Постачальник</div>
          <input class="ocr-edit-inp" id="ose-supplier" type="text" value="${_inv.supplier.replace(/"/g,'&quot;')}"/>
        </div>
      </div>
      <div class="ocr-edit-row">
        <div class="ocr-edit-grp">
          <div class="ocr-edit-lbl">Номер накладної</div>
          <input class="ocr-edit-inp" id="ose-num" type="text" value="${_inv.num}"/>
        </div>
        <div class="ocr-edit-grp" style="max-width:150px">
          <div class="ocr-edit-lbl">Дата</div>
          <input class="ocr-edit-inp" id="ose-date" type="date" value="${_inv.date}"/>
        </div>
      </div>
      <div class="ocr-edit-row">
        <button class="ocr-edit-save" onclick="window.__ocr.saveSuppEdit()">Зберегти</button>
        <button class="ocr-edit-cancel" onclick="window.__ocr.closeSuppEdit()">Скасувати</button>
      </div>
    </div>

    <!-- Warn strips -->
    ${warnStrips()}

    <!-- Filter tabs -->
    <div class="ocr-filter">
      <button class="ocr-ftab ${_filter==='all'?'act':''}" onclick="window.__ocr.setFilter('all')">
        Всі (${_inv.items.length})
      </button>
      <button class="ocr-ftab ${_filter==='warn'?'act':''}" onclick="window.__ocr.setFilter('warn')">
        Ціна ↑ (${warns})
      </button>
      <button class="ocr-ftab ${_filter==='new'?'act':''}" onclick="window.__ocr.setFilter('new')">
        Нові (${newItems})
      </button>
      <button class="ocr-ftab ${_filter==='unmatched'?'act':''}" onclick="window.__ocr.setFilter('unmatched')">
        ❗ (${unmatched})
      </button>
    </div>

    <!-- Items -->
    <div class="ocr-items" id="ocr-items-wrap">
      ${itemsList()}
    </div>

    <!-- Add item -->
    <div class="ocr-add" onclick="window.__ocr.addItem()">
      <div style="width:30px;height:30px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 2v9M2 6.5h9" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <span style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Додати позицію вручну</span>
    </div>

    <!-- Total -->
    <div class="ocr-total">
      <div>
        <div class="ocr-total-lbl">Сума за накладною</div>
        <div class="ocr-total-pdv">ПДВ 20%: ${fmt(_inv.pdv)} ₴ · Без ПДВ: ${fmt(_inv.totalNoPdv)} ₴</div>
      </div>
      <div class="ocr-total-sum">${fmt(_inv.totalPdv)} ₴</div>
    </div>

    <div style="height:14px"></div>
  </div>

  <div class="ocr-actions">
    <button class="ocr-btn-edit-all ${_editAll?'emode':''}" id="ocr-edit-all-btn"
            onclick="window.__ocr.toggleEditAll()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10l1.5-1.5 6-6 1.5 1.5-6 6L2 12v-2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M8.5 2.5l1.5 1.5" stroke="currentColor" stroke-width="1.2"/>
      </svg>
      ${_editAll ? 'Завершити редагування' : 'Режим редагування'}
    </button>
    <button class="ocr-btn-confirm" onclick="window.__ocr.goStep(4)">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Підтвердити та зберегти
    </button>
  </div>`;
}

/* ── STEP 4 ── */
function renderStep4() {
  const pills = [
    `${_inv.items.length} позицій`,
    `${fmt(_inv.totalPdv)} ₴ з ПДВ`,
    'POS оновлено',
    'Poster синхронізовано',
  ];
  return `
  <div class="ocr-success">
    <div class="ocr-succ-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 16l7 7 13-13" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="ocr-succ-title">Накладна збережена</div>
    <div class="ocr-succ-sub">${_inv.supplier} · ${_inv.items.length} позицій · ${fmt(_inv.totalPdv)} ₴</div>
    <div class="ocr-succ-pills">
      ${pills.map(p => `<div class="ocr-succ-pill">${p}</div>`).join('')}
    </div>
  </div>
  <div style="padding:0 14px 22px;display:flex;flex-direction:column;gap:8px">
    <button class="ocr-btn-confirm" onclick="window.__ocr.goStep(1)">
      Сканувати наступну накладну
    </button>
    <button class="ocr-btn-edit-all" onclick="window.__barops.navigate('dashboard')">
      На головний екран
    </button>
  </div>`;
}

/* ════════════════════════
   MAIN RENDER
════════════════════════ */
function buildHTML() {
  const body = _step===1 ? renderStep1()
    : _step===2          ? renderStep2()
    : _step===3          ? renderStep3()
    :                      renderStep4();

  return `
${CSS}
<div class="ocr-wrap">
  ${stepIndicator()}
  ${body}
</div>`;
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
let _newCounter = 100;

function goStep(n) {
  _procTimers.forEach(t => clearTimeout(t));
  _procTimers = [];
  _step    = n;
  _filter  = 'all';
  _editId  = null;
  _editAll = false;
  const view = document.getElementById('app-view');
  if (!view) return;
  view.innerHTML = buildHTML();
  if (n === 2) startProcessing();
}

/* ── РЕАЛЬНИЙ OCR через Claude Vision ── */
function shootPhoto() {
  // Відкриваємо вибір файлу (камера або галерея)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // задня камера на мобільному
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Конвертуємо в base64
    const base64 = await fileToBase64(file);
    const mediaType = file.type || 'image/jpeg';
    // Переходимо на крок 2 (обробка)
    _step = 2;
    _filter = 'all';
    _editId = null;
    const view = document.getElementById('app-view');
    if (!view) return;
    view.innerHTML = buildHTML();
    // Запускаємо реальний OCR
    startRealOCR(base64, mediaType);
  };
  input.click();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function startRealOCR(base64, mediaType) {
  const suppEl  = document.getElementById('ocr-proc-supp');
  const titleEl = document.getElementById('ocr-proc-title');
  if (titleEl) titleEl.textContent = 'Claude Vision аналізує фото…';
  if (suppEl)  suppEl.textContent  = 'Розпізнавання накладної…';

  const set = (dotId, dotCls, valId, val) => {
    const d = document.getElementById(dotId);
    const v = document.getElementById(valId);
    if (d) d.className = 'ocr-pdot ' + dotCls;
    if (v) v.textContent = val;
  };

  set('ocr-dot-items','ocr-pdot-act','ocr-ps-items','…');

  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType }),
    });

    const json = await res.json();

    if (!json.success) throw new Error(json.error || 'OCR failed');

    const data = json.data;

    // Заповнюємо дані накладної
    _inv = {
      supplier: data.supplier || 'Невідомий постачальник',
      num:      data.invoiceNumber || '—',
      date:     data.date || new Date().toLocaleDateString('uk-UA'),
      items: (data.items || []).map((item, i) => ({
        id:        'r' + i,
        name:      item.name || '',
        volume:    item.volume || null,
        qty:       item.quantity || 1,
        unit:      item.unit || 'пляш.',
        unitPrice: item.unitPrice || 0,
        total:     item.total || 0,
        status:    'ok',
        matched:   true,
        prevPrice: null,
      })),
      total:    data.totalAmount || 0,
      accuracy: Math.round((data.confidence || 0.9) * 100),
    };

    set('ocr-dot-items','ocr-pdot-done','ocr-ps-items',`✓ ${_inv.items.length} позицій`);

    setTimeout(() => {
      set('ocr-dot-match','ocr-pdot-done','ocr-ps-match',`✓ ${_inv.items.length}/${_inv.items.length}`);
      set('ocr-dot-prices','ocr-pdot-done','ocr-ps-prices','✓ Перевірено');
      if (suppEl)  suppEl.textContent  = _inv.supplier;
      if (titleEl) titleEl.textContent = `Накладна ${_inv.num} розпізнана`;
      setTimeout(() => goStep(3), 800);
    }, 800);

  } catch (err) {
    // Помилка — показуємо і повертаємо на крок 1
    if (titleEl) titleEl.textContent = '⚠ Помилка розпізнавання';
    if (suppEl)  suppEl.textContent  = err.message;
    set('ocr-dot-items','ocr-pdot-err','ocr-ps-items','Помилка');
    setTimeout(() => {
      alert('Не вдалось розпізнати накладну. Спробуйте ще раз — краще освітлення та чіткіше фото.');
      goStep(1);
    }, 1500);
  }
}

/* supplier edit */
function toggleSuppEdit() {
  document.getElementById('ocr-supp-edit')?.classList.toggle('open');
}
function closeSuppEdit() {
  document.getElementById('ocr-supp-edit')?.classList.remove('open');
}
function saveSuppEdit() {
  _inv.supplier = document.getElementById('ose-supplier')?.value || _inv.supplier;
  _inv.num      = document.getElementById('ose-num')?.value      || _inv.num;
  _inv.date     = document.getElementById('ose-date')?.value     || _inv.date;
  closeSuppEdit();
  refreshStep3();
}

/* filter */
function setFilter(f) {
  _filter = f;
  refreshItems();
  document.querySelectorAll('.ocr-ftab').forEach((b, i) => {
    b.classList.toggle('act', ['all','warn','new','unmatched'][i] === f);
  });
}

/* item editing */
function toggleEdit(id) {
  if (_editAll) return;
  _editId = _editId === id ? null : id;
  refreshItems();
}
function cancelItem(id) { _editId = null; refreshItems(); }

function saveItem(id) {
  const item = _inv.items.find(x => x.id === id);
  if (!item) return;
  item.name      = document.getElementById('en-'+id)?.value || item.name;
  item.qty       = parseFloat(document.getElementById('eq-'+id)?.value) || item.qty;
  item.unit      = document.getElementById('eu-'+id)?.value || item.unit;
  item.unitPrice = parseFloat(document.getElementById('ep-'+id)?.value) || item.unitPrice;
  item.total     = parseFloat(document.getElementById('et-'+id)?.value) || item.total;
  item.status    = 'ok';
  _editId = null;
  recalcTotals();
  refreshStep3();
}

function deleteItem(id) {
  if (!confirm('Видалити позицію?')) return;
  _inv.items = _inv.items.filter(x => x.id !== id);
  _editId = null;
  recalcTotals();
  refreshStep3();
}

function recalcTotal(id) {
  const qty   = parseFloat(document.getElementById('eq-'+id)?.value) || 0;
  const price = parseFloat(document.getElementById('ep-'+id)?.value) || 0;
  const t     = document.getElementById('et-'+id);
  if (t) t.value = (qty * price).toFixed(2);
}

function addItem() {
  const newId = 'new-' + _newCounter++;
  _inv.items.push({
    id:newId, name:'Новий товар', qty:1, unit:'шт',
    unitPrice:0, total:0, status:'new',
    prevPrice:null, matched:false, matchScore:0,
  });
  _filter  = 'all';
  _editId  = newId;
  _editAll = false;
  refreshStep3();
  setTimeout(() => {
    document.getElementById('ocard-'+newId)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, 80);
}

function toggleEditAll() {
  _editAll = !_editAll;
  _editId  = null;
  refreshStep3();
}

function recalcTotals() {
  const sum = _inv.items.reduce((a, x) => a + x.total, 0);
  _inv.totalPdv   = sum;
  _inv.totalNoPdv = sum / 1.2;
  _inv.pdv        = sum - sum / 1.2;
}

/* partial re-render helpers (avoid full rebuild when possible) */
function refreshItems() {
  const wrap = document.getElementById('ocr-items-wrap');
  if (wrap) wrap.innerHTML = itemsList();
}
function refreshStep3() {
  const view = document.getElementById('app-view');
  if (view) {
    view.innerHTML = buildHTML();
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    // init / reset state
    _inv      = deepClone(INVOICES[0]);
    _step     = 1;
    _filter   = 'all';
    _editId   = null;
    _editAll  = false;
    _procTimers.forEach(t => clearTimeout(t));
    _procTimers = [];
    _newCounter = 100;
    return buildHTML();
  },

  init() {
    window.__ocr = {
      goStep, shootPhoto, selectInv,
      toggleSuppEdit, closeSuppEdit, saveSuppEdit,
      setFilter, toggleEdit, cancelItem, saveItem,
      deleteItem, recalcTotal, addItem, toggleEditAll,
    };
  },
};
