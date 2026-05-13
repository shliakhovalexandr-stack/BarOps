/* ============================================================
   BarOps — pages/shift-log.js
   Журнал зміни:
   • Бармен  — header зміни, чеклист, нотатки, хронологія, обладнання, передача
   • Менеджер — зведення тижня, алерти, список змін, експорт
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   DATA
════════════════════════ */
const INDIGO = '#5B7FD4';
const INDIGO_BG = 'rgba(91,127,212,.08)';
const INDIGO_BORDER = 'rgba(91,127,212,.25)';
const INDIGO_LIGHT = '#8fa8e8';

const CHECKLIST_ITEMS = [
  { id:'c1', label:'Перевірити залишки перед відкриттям',          done:true,  overdue:false, meta:'Виконано о 18:10' },
  { id:'c2', label:'Прийняти накладну від Баядера',                done:true,  overdue:false, meta:'Виконано о 19:34 · 14 позицій' },
  { id:'c3', label:"Зафіксувати списання (Hendrick's Gin)",        done:true,  overdue:false, meta:'Виконано о 18:52' },
  { id:'c4', label:'Підтвердити ціновий алерт JW Black',           done:true,  overdue:false, meta:'Виконано о 19:40' },
  { id:'c5', label:'Замовити Hendrick\'s Gin у менеджера',         done:false, overdue:false, meta:'До закриття зміни' },
  { id:'c6', label:'Чистка кавомашини Jura',                       done:false, overdue:true,  meta:'⚠ Прострочено · мало бути о 20:00' },
  { id:'c7', label:'Фінальна інвентаризація перед закриттям',       done:false, overdue:false, meta:'Заплановано о 22:45' },
  { id:'c8', label:'Записати нотатки для наступної зміни',         done:true,  overdue:false, meta:'Виконано о 21:20' },
  { id:'c9', label:'Підготувати касовий звіт',                     done:true,  overdue:false, meta:'Виконано о 21:15' },
];

const TIMELINE = [
  { time:'18:00', title:'Відкриття зміни',                         sub:'Олексій Коваленко · Sky Lounge · Вечірня зміна розпочата',         color:'var(--green)', tag:null },
  { time:'18:52', title:'Списання · Hendrick\'s Gin 0.7л',         sub:'Бій · Розбита пляшка при відкритті',                               color:'var(--red)',   tag:{cls:'tag-wo',  text:'💥 Бій'} },
  { time:'19:34', title:'Накладна №2841 · Баядера Логістик',       sub:'OCR-сканування · 14 позицій · 24 320 ₴ · 97% точність',            color:'var(--green)', tag:{cls:'tag-ocr', text:'📄 OCR'} },
  { time:'19:36', title:'⚠ Ціновий алерт · Johnnie Walker Black',  sub:'681 → 816 ₴ (+18%) · Бармен підтвердив нову ціну',                 color:'var(--amber)', tag:{cls:'tag-alert',text:'💰 Алерт ціни'} },
  { time:'20:11', title:'Інвентаризація · Aperol',                  sub:'Розбіжність: −0.3л · Система 3.7л → Факт 3.4л',                   color:INDIGO_LIGHT,  tag:{cls:'tag-inv', text:'📊 Інвентар'} },
  { time:'21:20', title:'Нотатка додана',                           sub:"Hendrick's Gin — термінове замовлення. Кавомашина потребує чистки.", color:INDIGO_LIGHT,  tag:{cls:'tag-note',text:'📝 Нотатка'} },
];

const EQUIPMENT = [
  { emoji:'☕', name:'Кавомашина Jura',         due:'Чистка прострочена · мало бути 08.05', status:'due',  checked:false },
  { emoji:'🧊', name:'Льодогенератор Manitowoc', due:'Обслуговування: 01.06.2026 · 24 дні', status:'soon', checked:false },
  { emoji:'🍸', name:'Blender Vitamix Pro',       due:'Обслуговування: 15.07.2026 · 68 днів', status:'ok', checked:true  },
];

const HANDOVER_ITEMS = [
  { color:'var(--red)',   text:"Hendrick's Gin критично — лише 0.4л. Не продавати без дозволу менеджера", val:'Важливо', valColor:'var(--red)'   },
  { color:'var(--amber)', text:'Кавомашина Jura — потребує термінової чистки на початку зміни',          val:'Терміново',valColor:'var(--amber)' },
  { color:'var(--green)', text:'Накладна від Баядера прийнята та внесена · залишки оновлені',            val:'Зроблено', valColor:'var(--green)' },
  { color:INDIGO_LIGHT,  text:'Гість на VIP-столі 12 — замовлення на Negroni з 22:30',                  val:'Нотатка',  valColor:INDIGO_LIGHT   },
];

const MANAGER_SHIFTS = [
  { date:'08.05.2026 · Вечірня', who:'Олексій Коваленко', tasks:'7/9', status:'Активна',   statusColor:'var(--green)', icon:'live',    active:true },
  { date:'07.05.2026 · Денна',   who:'Марія Петренко',    tasks:'9/9', status:'Закрита',   statusColor:'var(--text2)', icon:'ok',      active:false},
  { date:'06.05.2026 · Вечірня', who:'Олексій Коваленко', tasks:'8/9', status:'Закрита',   statusColor:'var(--text2)', icon:'ok',      active:false},
  { date:'05.05.2026 · Нічна',   who:'Дмитро Іванець',   tasks:'6/9', status:'Проблеми',  statusColor:'var(--amber)', icon:'warn',    active:false},
  { date:'04.05.2026 · Вечірня', who:'Марія Петренко',    tasks:'9/9', status:'Закрита',   statusColor:'var(--text2)', icon:'ok',      active:false},
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _checklist = CHECKLIST_ITEMS.map(x => ({...x}));  // deep-ish copy
let _equipment = EQUIPMENT.map(x => ({...x}));
let _noteText  = "Hendrick's Gin майже закінчився — термінове замовлення. Hendrick's впав — бій 0.7л о 18:52.\n\nГість на столі 7 просив знижку на Spritz — відмовив ввічливо.\n\nКавомашина Jura потребує чистки — завтра обов'язково.";
let _mgrPeriod = 'week';
let _shiftClosed = false;

/* ════════════════════════
   HELPERS
════════════════════════ */
function doneCount() { return _checklist.filter(x => x.done).length; }

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="sl-css">
.sl-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.sl-scroll{overflow-y:auto;flex:1}.sl-scroll::-webkit-scrollbar{width:0}

/* topbar */
.sl-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.sl-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sl-back:active{background:var(--bg3)}
.sl-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.sl-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.sl-pill{border-radius:20px;padding:3px 10px;font-size:11px;font-family:var(--font-b)}
.sl-pill-indigo{background:${INDIGO_BG};border:0.5px solid ${INDIGO_BORDER};color:${INDIGO_LIGHT}}
.sl-pill-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}

/* sec label */
.sl-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.sl-sec-link{font-size:11px;color:${INDIGO_LIGHT};letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* ── SHIFT HEADER ── */
.sl-header{margin:0 14px 10px;background:linear-gradient(135deg,${INDIGO_BG} 0%,rgba(91,127,212,.04) 50%,var(--green-bg) 100%);border:0.5px solid ${INDIGO_BORDER};border-radius:22px;padding:16px 18px;position:relative;overflow:hidden}
.sl-header::before{content:'';position:absolute;top:-50px;right:-50px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(91,127,212,.1) 0%,transparent 70%);pointer-events:none}
.sl-h-eyebrow{font-size:10px;color:${INDIGO_LIGHT};letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:8px;display:flex;align-items:center;gap:8px}
.sl-h-eyebrow::before{content:'';width:16px;height:1px;background:${INDIGO_LIGHT};opacity:.5}
.sl-h-date{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;margin-bottom:2px}
.sl-h-who{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px}
.sl-h-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
.sl-stat{background:rgba(0,0,0,.3);border-radius:9px;padding:10px 8px;text-align:center;border:0.5px solid var(--border)}
.sl-stat-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.sl-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}
.sl-prog-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.sl-prog-lbl{font-size:11px;color:var(--text1);font-family:var(--font-b)}
.sl-prog-pct{font-family:var(--font-h);font-size:12px;font-weight:700;color:var(--text0)}
.sl-prog-bar{height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
.sl-prog-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,${INDIGO},${INDIGO_LIGHT});transition:width .6s ease}
.sl-prog-times{display:flex;justify-content:space-between;font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px}
.sl-badge{display:inline-flex;align-items:center;gap:5px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--green);font-family:var(--font-b)}
.sl-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:slPulse 1.8s ease-in-out infinite}
@keyframes slPulse{0%,100%{opacity:1}50%{opacity:.3}}

/* ── CHECKLIST ── */
.sl-checklist{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.sl-ck{display:flex;align-items:center;gap:12px;padding:11px 13px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.sl-ck:active{background:var(--bg3)}
.sl-ck.done{background:var(--green-bg);border-color:var(--green-border)}
.sl-ck.overdue{border-color:var(--amber-border);background:var(--amber-bg)}
.sl-ck-box{width:22px;height:22px;border-radius:7px;border:1.5px solid var(--border3);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s}
.sl-ck.done .sl-ck-box{background:var(--green);border-color:var(--green)}
.sl-ck.overdue .sl-ck-box{border-color:var(--amber)}
.sl-ck-label{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.sl-ck.done .sl-ck-label{color:var(--text2);text-decoration:line-through}
.sl-ck.overdue .sl-ck-label{color:var(--amber)}
.sl-ck-meta{font-size:10px;color:var(--text2);font-family:var(--font-b)}
.sl-ck.done .sl-ck-meta{color:var(--green);opacity:.7}
.sl-ck.overdue .sl-ck-meta{color:var(--amber)}

/* ── QUICK NOTE ── */
.sl-quick-note{display:flex;align-items:center;gap:10px;padding:10px 13px;background:${INDIGO_BG};border:0.5px dashed ${INDIGO_BORDER};border-radius:12px;cursor:pointer;transition:all .15s}
.sl-quick-note:hover{background:rgba(91,127,212,.12)}
.sl-qn-icon{width:32px;height:32px;border-radius:8px;background:rgba(91,127,212,.12);border:0.5px solid ${INDIGO_BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sl-qn-text{font-size:13px;color:${INDIGO_LIGHT};font-family:var(--font-b)}

/* ── NOTES ── */
.sl-note-block{margin:0 14px 8px}
.sl-note-area{width:100%;min-height:96px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);resize:none;outline:none;transition:border-color .2s;line-height:1.55;display:block}
.sl-note-area:focus{border-color:rgba(91,127,212,.4);box-shadow:0 0 0 2px rgba(91,127,212,.1)}
.sl-note-area::placeholder{color:var(--text2)}
.sl-note-footer{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.sl-note-chars{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.sl-note-save{font-size:12px;padding:5px 14px;border-radius:20px;cursor:pointer;background:rgba(91,127,212,.15);border:0.5px solid rgba(91,127,212,.3);color:${INDIGO_LIGHT};font-family:var(--font-b);transition:all .15s}
.sl-note-save:active{background:rgba(91,127,212,.25)}

/* ── TIMELINE ── */
.sl-timeline{padding:0 18px;display:flex;flex-direction:column}
.sl-tl-item{display:flex;gap:12px;position:relative}
.sl-tl-item:not(:last-child)::before{content:'';position:absolute;left:5px;top:24px;bottom:-2px;width:1px;background:var(--border2)}
.sl-tl-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;border:2px solid var(--bg1);position:relative;z-index:1;margin-top:2px}
.sl-tl-body{flex:1;padding-bottom:16px}
.sl-tl-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-bottom:3px;letter-spacing:.03em}
.sl-tl-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px 12px}
.sl-tl-title{font-size:13px;color:var(--text1);font-family:var(--font-b);font-weight:500}
.sl-tl-sub{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b);line-height:1.45}
.sl-tl-tag{display:inline-flex;align-items:center;gap:4px;margin-top:5px;font-size:10px;padding:2px 8px;border-radius:10px;font-family:var(--font-b)}
.tag-ocr{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.tag-inv{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}
.tag-wo{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}
.tag-alert{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.tag-note{background:${INDIGO_BG};border:0.5px solid ${INDIGO_BORDER};color:${INDIGO_LIGHT}}

/* ── EQUIPMENT ── */
.sl-equip-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.sl-equip{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px 13px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s}
.sl-equip:active{background:var(--bg3)}
.sl-equip.due{border-color:var(--red-border);background:var(--red-bg)}
.sl-equip.soon{border-color:var(--amber-border);background:var(--amber-bg)}
.sl-equip.ok{border-color:var(--green-border)}
.sl-eq-icon{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.sl-eq-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.sl-eq-due{font-size:11px;font-family:var(--font-b);margin-top:2px}
.sl-eq-status{font-size:11px;padding:3px 10px;border-radius:20px;font-family:var(--font-b);flex-shrink:0}
.es-due{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}
.es-soon{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.es-ok{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.sl-eq-ck{width:22px;height:22px;border-radius:7px;border:1.5px solid var(--border3);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s}
.sl-eq-ck.checked{background:var(--green);border-color:var(--green)}

/* ── HANDOVER ── */
.sl-handover{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.sl-hc-hdr{padding:12px 15px;background:${INDIGO_BG};border-bottom:0.5px solid ${INDIGO_BORDER};display:flex;align-items:center;gap:8px}
.sl-hc-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:${INDIGO_LIGHT}}
.sl-hc-persons{display:flex;align-items:center;gap:8px;padding:12px 15px;border-bottom:0.5px solid var(--border)}
.sl-hc-person{text-align:center;flex:1}
.sl-hc-name{font-size:13px;color:var(--text0);font-family:var(--font-b);font-weight:500}
.sl-hc-role{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.sl-hc-arrow{color:var(--text3);font-size:20px;flex-shrink:0}
.sl-hc-row{display:flex;align-items:center;gap:10px;padding:9px 15px;border-bottom:0.5px solid var(--border)}
.sl-hc-row:last-child{border-bottom:none}
.sl-hc-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.sl-hc-text{flex:1;font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.4}
.sl-hc-val{font-size:11px;font-family:var(--font-b);flex-shrink:0}

/* ── ACTIONS BAR ── */
.sl-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.sl-btn{width:100%;height:52px;border:none;border-radius:13px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;letter-spacing:.02em}
.sl-btn-indigo{background:${INDIGO};color:#fff;box-shadow:0 4px 20px rgba(91,127,212,.25)}
.sl-btn-indigo:active{background:#4a6bbf}
.sl-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1)}
.sl-btn-ghost:active{background:var(--bg3)}

/* ── MANAGER VIEW ── */
.sl-period-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.sl-pt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.sl-pt.act{background:var(--bg3);color:var(--text0)}

.sl-mgr-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 4px}
.sl-ms-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;padding:14px}
.sl-ms-title{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;font-family:var(--font-b);margin-bottom:8px}
.sl-ms-val{font-family:var(--font-h);font-size:24px;font-weight:700;color:var(--text0);line-height:1}
.sl-ms-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:4px;line-height:1.4}
.sl-ms-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.sl-ms-fill{height:100%;border-radius:2px}

.sl-active-badge{margin:10px 14px 8px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:10px}
.sl-active-dot{width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;animation:slPulse 1.8s ease-in-out infinite}

.sl-alerts-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.sl-alert-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border)}
.sl-alert-row:last-child{border-bottom:none}
.sl-ar-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px}
.sl-ar-text{font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.4}
.sl-ar-meta{font-size:10px;color:var(--text2);margin-top:3px;font-family:var(--font-b)}
.sl-ar-badge{font-size:10px;padding:2px 8px;border-radius:10px;font-family:var(--font-b);flex-shrink:0;margin-top:2px}

.sl-shift-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.sl-shift-row{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .12s}
.sl-shift-row:active{background:var(--bg3)}
.sl-shift-row.active-shift{border-color:${INDIGO_BORDER};background:${INDIGO_BG}}
.sl-sr-icon{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sl-sr-date{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.sl-sr-who{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.sl-sr-tasks{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);text-align:right}
.sl-sr-status{font-size:10px;font-family:var(--font-b);margin-top:2px;text-align:right}

.sl-export-card{margin:0 14px 8px;background:${INDIGO_BG};border:0.5px solid ${INDIGO_BORDER};border-radius:16px;padding:14px 16px}
.sl-ex-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);margin-bottom:4px}
.sl-ex-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:12px;line-height:1.5}
.sl-ex-btns{display:flex;gap:6px}
.sl-ex-btn{flex:1;height:40px;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-family:var(--font-b);font-weight:500;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.sl-ex-btn:active{transform:scale(.96)}
.sl-ex-pdf{background:var(--red);color:#fff}
.sl-ex-tg{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}
.sl-ex-mail{background:var(--bg3);border:0.5px solid var(--border2);color:var(--text1)}

/* close success overlay */
.sl-success{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.sl-success.open{display:flex;animation:slFade .3s ease}
@keyframes slFade{from{opacity:0}to{opacity:1}}
.sl-succ-icon{width:72px;height:72px;border-radius:50%;background:${INDIGO_BG};border:0.5px solid ${INDIGO_BORDER};display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.sl-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.sl-succ-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.65;max-width:280px;margin-bottom:24px}
.sl-succ-btn{width:100%;max-width:280px;height:50px;background:${INDIGO};border:none;border-radius:12px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);margin-bottom:10px;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px}
.sl-succ-btn:active{background:#4a6bbf}
.sl-succ-ghost{width:100%;max-width:280px;height:44px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
</style>`;

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
function checklistHTML() {
  const done = doneCount();
  const total = _checklist.length;
  return `
  <div class="sl-sec">
    Чеклист задач
    <button class="sl-sec-link" onclick="window.__sl.addTask()">+ Додати</button>
  </div>
  <div class="sl-checklist">
    ${_checklist.map(item => `
    <div class="sl-ck ${item.done?'done':''} ${item.overdue&&!item.done?'overdue':''}"
         onclick="window.__sl.toggleCk('${item.id}')">
      <div class="sl-ck-box">
        ${item.done ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` :
          item.overdue ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v3.5M5 7v.5" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round"/></svg>` : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="sl-ck-label">${item.label}</div>
        <div class="sl-ck-meta">${item.meta}</div>
      </div>
    </div>`).join('')}
  </div>`;
}

function timelineHTML() {
  return `
  <div class="sl-sec">Хронологія подій</div>
  <div class="sl-timeline">
    ${TIMELINE.map((e, i) => `
    <div class="sl-tl-item">
      <div style="flex-shrink:0;margin-top:2px">
        <div class="sl-tl-dot" style="background:${e.color}"></div>
      </div>
      <div class="sl-tl-body">
        <div class="sl-tl-time">${e.time}</div>
        <div class="sl-tl-card">
          <div class="sl-tl-title">${e.title}</div>
          <div class="sl-tl-sub">${e.sub}</div>
          ${e.tag ? `<div class="sl-tl-tag ${e.tag.cls}">${e.tag.text}</div>` : ''}
        </div>
      </div>
    </div>`).join('')}
  </div>`;
}

function equipmentHTML() {
  return `
  <div class="sl-sec" style="padding-top:6px">Обладнання</div>
  <div class="sl-equip-list">
    ${_equipment.map((eq, i) => {
      const dueColor = eq.status==='due' ? 'var(--red)' : eq.status==='soon' ? 'var(--amber)' : 'var(--green)';
      const statusLabel = eq.status==='due' ? 'Терміново' : eq.status==='soon' ? 'Незабаром' : 'В нормі';
      const statusCls   = eq.status==='due' ? 'es-due' : eq.status==='soon' ? 'es-soon' : 'es-ok';
      return `
      <div class="sl-equip ${eq.status}">
        <div class="sl-eq-icon">${eq.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="sl-eq-name">${eq.name}</div>
          <div class="sl-eq-due" style="color:${dueColor}">${eq.due}</div>
        </div>
        <span class="sl-eq-status ${statusCls}">${statusLabel}</span>
        <div class="sl-eq-ck ${eq.checked?'checked':''}" onclick="window.__sl.toggleEquip(${i})">
          ${eq.checked ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function handoverHTML() {
  return `
  <div class="sl-sec" style="padding-top:14px">Передача зміни</div>
  <div class="sl-handover">
    <div class="sl-hc-hdr">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 3l4 4-4 4" stroke="${INDIGO_LIGHT}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="sl-hc-title">Передача наступній зміні</div>
    </div>
    <div class="sl-hc-persons">
      <div class="sl-hc-person">
        <div class="sl-hc-name">Олексій К.</div>
        <div class="sl-hc-role">Бармен · зараз</div>
      </div>
      <div class="sl-hc-arrow">→</div>
      <div class="sl-hc-person">
        <div class="sl-hc-name">Марія П.</div>
        <div class="sl-hc-role">Бармен · нічна</div>
      </div>
    </div>
    ${HANDOVER_ITEMS.map(h => `
    <div class="sl-hc-row">
      <div class="sl-hc-dot" style="background:${h.color}"></div>
      <div class="sl-hc-text">${h.text}</div>
      <div class="sl-hc-val" style="color:${h.valColor}">${h.val}</div>
    </div>`).join('')}
  </div>`;
}

function renderBartender() {
  const done  = doneCount();
  const total = _checklist.length;
  const pct   = Math.round(done / total * 100);

  return `
  <div class="sl-topbar" style="flex-shrink:0">
    <div class="sl-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="sl-title">Журнал зміни</div>
      <div class="sl-sub">${new Date().toLocaleDateString('uk-UA', { day:'numeric', month:'long', year:'numeric' })}</div>
    </div>
    <div class="sl-pill sl-pill-indigo" id="sl-tasks-pill">${done}/${total}</div>
  </div>

  <div class="sl-scroll">
    <!-- Shift header -->
    <div class="sl-header">
      <div class="sl-h-eyebrow">Вечірня зміна</div>
      <div class="sl-h-date">${new Date().toLocaleDateString('uk-UA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
      <div class="sl-h-who">${state.user || localStorage.getItem('barops_user') || ''} · ${state.venue}</div>
      <div class="sl-h-stats">
        <div class="sl-stat">
          <div class="sl-stat-val" style="color:${INDIGO_LIGHT}">${done}/${total}</div>
          <div class="sl-stat-lbl">Задачі<br/>чеклисту</div>
        </div>
        <div class="sl-stat">
          <div class="sl-stat-val" style="color:var(--amber)">3</div>
          <div class="sl-stat-lbl">Алертів<br/>за зміну</div>
        </div>
        <div class="sl-stat">
          <div class="sl-stat-val" style="color:var(--green)">3год 34хв</div>
          <div class="sl-stat-lbl">Тривалість<br/>зміни</div>
        </div>
      </div>
      <div class="sl-prog-row">
        <div class="sl-prog-lbl">Прогрес зміни</div>
        <div class="sl-prog-pct">74%</div>
      </div>
      <div class="sl-prog-bar"><div class="sl-prog-fill" style="width:74%"></div></div>
      <div class="sl-prog-times"><span>18:00</span><span>Зараз</span><span>23:00</span></div>
      <div style="margin-top:10px">
        <div class="sl-badge"><div class="sl-badge-dot"></div>Зміна активна</div>
      </div>
    </div>

    ${checklistHTML()}

    <!-- Quick note -->
    <div style="padding:8px 14px 0">
      <div class="sl-quick-note" onclick="window.__sl.focusNote()">
        <div class="sl-qn-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10l1.5-1.5 7-7 1.5 1.5-7 7L2 12v-2z" stroke="${INDIGO_LIGHT}" stroke-width="1.2" stroke-linejoin="round"/></svg>
        </div>
        <div class="sl-qn-text">Додати нотатку до журналу…</div>
      </div>
    </div>

    <!-- Notes -->
    <div class="sl-sec" style="padding-top:14px">Нотатки зміни</div>
    <div class="sl-note-block">
      <textarea class="sl-note-area" id="sl-note-area" placeholder="Що важливо передати наступній зміні…"
        maxlength="500" oninput="window.__sl.updateChars(this)">${_noteText}</textarea>
      <div class="sl-note-footer">
        <span class="sl-note-chars" id="sl-note-chars">${_noteText.length} / 500</span>
        <button class="sl-note-save" onclick="window.__sl.saveNote()">Зберегти нотатку</button>
      </div>
    </div>

    ${timelineHTML()}
    ${equipmentHTML()}
    ${handoverHTML()}

    <div style="height:14px"></div>
  </div>

  <div class="sl-actions">
    <button class="sl-btn sl-btn-indigo" onclick="window.__sl.closeShift()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Закрити зміну
    </button>
    <button class="sl-btn sl-btn-ghost" onclick="alert('Чернетку збережено')">Зберегти чернетку</button>
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="sl-success ${_shiftClosed?'open':''}" id="sl-success">
    <div class="sl-succ-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 16l7 7 13-13" stroke="${INDIGO_LIGHT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="sl-succ-title">Зміну закрито!</div>
    <div class="sl-succ-sub">Журнал збережено · Менеджер отримав звіт · Передача наступній зміні виконана</div>
    <button class="sl-succ-btn" onclick="window.__barops.navigate('dashboard')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      На головний екран
    </button>
    <button class="sl-succ-ghost" onclick="window.__sl.reopenShift()">Переглянути журнал</button>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function renderManager() {
  const kpi = {
    week:  { tasks:'91%', alerts:'8',  writeoffs:'12', issues:'3' },
    month: { tasks:'88%', alerts:'29', writeoffs:'41', issues:'9' },
    custom:{ tasks:'—',   alerts:'—',  writeoffs:'—',  issues:'—' },
  }[_mgrPeriod];

  const shiftIconHTML = (s) => {
    if (s.icon === 'live') return `<div style="width:7px;height:7px;border-radius:50%;background:${INDIGO_LIGHT};animation:slPulse 1.8s ease-in-out infinite"></div>`;
    if (s.icon === 'ok')   return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v5M7 10v.5" stroke="var(--amber)" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  };

  return `
  <div class="sl-topbar" style="flex-shrink:0">
    <div class="sl-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="sl-title">Журнали змін</div>
      <div class="sl-sub">Менеджер · ${state.venue}</div>
    </div>
    <div class="sl-pill sl-pill-amber">1 нова</div>
  </div>

  <div class="sl-scroll">
    <!-- Period -->
    <div class="sl-period-tabs">
      ${[['week','Тиждень'],['month','Місяць'],['custom','Обрати']].map(([id,lbl]) => `
      <button class="sl-pt ${_mgrPeriod===id?'act':''}" onclick="window.__sl.setPeriod('${id}')">${lbl}</button>`).join('')}
    </div>

    <!-- Summary KPI -->
    <div class="sl-mgr-summary">
      <div class="sl-ms-card">
        <div class="sl-ms-title">Середній % задач</div>
        <div class="sl-ms-val" style="color:var(--green)">${kpi.tasks}</div>
        <div class="sl-ms-sub">12 змін · 7 барменів</div>
        <div class="sl-ms-bar"><div class="sl-ms-fill" style="width:${kpi.tasks==='—'?0:kpi.tasks};background:var(--green)"></div></div>
      </div>
      <div class="sl-ms-card">
        <div class="sl-ms-title">Алертів</div>
        <div class="sl-ms-val" style="color:var(--amber)">${kpi.alerts}</div>
        <div class="sl-ms-sub">3 ціна · 4 залишок · 1 обладн.</div>
        <div class="sl-ms-bar"><div class="sl-ms-fill" style="width:65%;background:var(--amber)"></div></div>
      </div>
      <div class="sl-ms-card">
        <div class="sl-ms-title">Списань</div>
        <div class="sl-ms-val" style="color:var(--red)">${kpi.writeoffs}</div>
        <div class="sl-ms-sub">~4 820 ₴ збитків</div>
        <div class="sl-ms-bar"><div class="sl-ms-fill" style="width:40%;background:var(--red)"></div></div>
      </div>
      <div class="sl-ms-card">
        <div class="sl-ms-title">Порушень</div>
        <div class="sl-ms-val" style="color:var(--purple)">${kpi.issues}</div>
        <div class="sl-ms-sub">Кавомашина (2) · Льодоген. (1)</div>
        <div class="sl-ms-bar"><div class="sl-ms-fill" style="width:25%;background:var(--purple)"></div></div>
      </div>
    </div>

    <!-- Active shift -->
    <div class="sl-active-badge">
      <div class="sl-active-dot"></div>
      <div style="flex:1;font-size:12px;color:var(--text1);font-family:var(--font-b)">
        <strong style="color:var(--green)">Олексій К.</strong> — активна зміна · 74% · 2 задачі не виконано · закривається о 23:00
      </div>
      <div style="font-size:11px;color:var(--green);font-family:var(--font-b)">Зараз</div>
    </div>

    <!-- Manager alerts -->
    <div class="sl-sec">Важливі події · поточна зміна</div>
    <div class="sl-alerts-card">
      ${[
        { dot:'var(--amber)', text:'⚠ Ціновий алерт · JW Black +18% · Олексій підтвердив', meta:'19:36 · Потребує перегляду фудкосту', badge:'Нове', badgeBg:'var(--amber-bg)', badgeBorder:'var(--amber-border)', badgeColor:'var(--amber)' },
        { dot:'var(--red)',   text:"💥 Списання · Hendrick's Gin −0.7л · Бій",             meta:'18:52 · 3-й бій за місяць по цій позиції', badge:'⚠', badgeBg:'var(--red-bg)', badgeBorder:'var(--red-border)', badgeColor:'var(--red)' },
        { dot:'var(--purple)',text:'🔧 Кавомашина Jura — чистка прострочена',               meta:'Мало бути о 20:00 · Не виконано', badge:'Обладн.', badgeBg:'var(--purple-bg)', badgeBorder:'var(--purple-border)', badgeColor:'var(--purple)' },
      ].map(a => `
      <div class="sl-alert-row">
        <div class="sl-ar-dot" style="background:${a.dot}"></div>
        <div style="flex:1;min-width:0">
          <div class="sl-ar-text">${a.text}</div>
          <div class="sl-ar-meta">${a.meta}</div>
        </div>
        <div class="sl-ar-badge" style="background:${a.badgeBg};border:0.5px solid ${a.badgeBorder};color:${a.badgeColor}">${a.badge}</div>
      </div>`).join('')}
    </div>

    <!-- Shifts list -->
    <div class="sl-sec">
      Останні зміни
      <button class="sl-sec-link">Всі →</button>
    </div>
    <div class="sl-shift-list">
      ${MANAGER_SHIFTS.map(s => `
      <div class="sl-shift-row ${s.active?'active-shift':''}">
        <div class="sl-sr-icon" style="background:${s.icon==='live'?`rgba(91,127,212,.12)`:s.icon==='ok'?'var(--green-bg)':'var(--amber-bg)'}">
          ${shiftIconHTML(s)}
        </div>
        <div style="flex:1;min-width:0">
          <div class="sl-sr-date">${s.date}</div>
          <div class="sl-sr-who">${s.who}</div>
        </div>
        <div>
          <div class="sl-sr-tasks" style="color:${s.icon==='live'?INDIGO_LIGHT:s.icon==='ok'?'var(--green)':'var(--amber)'}">${s.tasks}</div>
          <div class="sl-sr-status" style="color:${s.statusColor}">${s.status}</div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Export -->
    <div class="sl-sec" style="padding-top:14px">Звітність</div>
    <div class="sl-export-card">
      <div class="sl-ex-title">Звіт по змінах</div>
      <div class="sl-ex-sub">Повний журнал з деталями по кожній зміні: задачі, алерти, нотатки, списання, обладнання.</div>
      <div class="sl-ex-btns">
        <button class="sl-ex-btn sl-ex-pdf" onclick="alert('PDF-звіт сформовано')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1.5" stroke="#fff" stroke-width="1"/><path d="M4 4h4M4 6.5h4M4 9h2" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>PDF
        </button>
        <button class="sl-ex-btn sl-ex-tg" onclick="alert('Звіт надіслано в Telegram')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 5.5L11 1.5 9 11 5.5 7 9.5 3.5M5.5 7L4 10.5" stroke="var(--blue)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>Telegram
        </button>
        <button class="sl-ex-btn sl-ex-mail" onclick="alert('Звіт надіслано на email')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="7" rx="1.5" stroke="var(--text1)" stroke-width="1"/><path d="M1 5l5 3.5L11 5" stroke="var(--text1)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>Email
        </button>
      </div>
    </div>

    <div style="height:14px"></div>
  </div>`;
}

/* ════════════════════════
   BUILD
════════════════════════ */
function buildHTML() {
  const body = state.role === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="sl-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function toggleCk(id) {
  const item = _checklist.find(x => x.id === id);
  if (!item) return;
  item.done = !item.done;
  if (item.done) { item.overdue = false; item.meta = `Виконано о ${new Date().toTimeString().slice(0,5)}`; }
  else           { item.meta = 'Не виконано'; }
  // fast refresh just the checklist + pill
  const cl = document.getElementById('sl-checklist-wrap');
  if (cl) cl.innerHTML = checklistHTML();
  else    fullRender();
  const pill = document.getElementById('sl-tasks-pill');
  if (pill) pill.textContent = `${doneCount()}/${_checklist.length}`;
}

function toggleEquip(i) {
  _equipment[i].checked = !_equipment[i].checked;
  // refresh equip section only if possible, else full
  fullRender();
}

function addTask() { alert('Введіть назву задачі — вона буде додана до чеклисту'); }

function focusNote() {
  const ta = document.getElementById('sl-note-area');
  if (ta) { ta.focus(); ta.scrollIntoView({ behavior:'smooth', block:'center' }); }
}

function updateChars(el) {
  _noteText = el.value;
  const chars = document.getElementById('sl-note-chars');
  if (chars) chars.textContent = `${el.value.length} / 500`;
}

function saveNote() {
  const ta = document.getElementById('sl-note-area');
  if (ta) _noteText = ta.value;
  const btn = document.querySelector('.sl-note-save');
  if (btn) { btn.textContent = '✓ Збережено'; setTimeout(() => { if(btn) btn.textContent = 'Зберегти нотатку'; }, 1500); }
}

async function closeShift() {
  const token = localStorage.getItem('barops_token');
  const btn   = document.querySelector('.sl-btn-indigo');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:.6">Закриваємо…</span>'; }

  try {
    // Знаходимо поточну відкриту зміну
    const res  = await fetch(`${API}/api/shifts/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.success && data.data) {
      const shiftId = data.data.id;
      const notes   = document.getElementById('sl-note-area')?.value || _noteText;

      await fetch(`${API}/api/shifts/${shiftId}/close`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ notes }),
      });
    }
  } catch (e) {
    console.error('[closeShift]', e);
  }

  _shiftClosed = true;
  fullRender();
}

function reopenShift() {
  _shiftClosed = false;
  fullRender();
}

function setPeriod(p) {
  _mgrPeriod = p;
  fullRender();
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _checklist   = CHECKLIST_ITEMS.map(x => ({...x}));
    _equipment   = EQUIPMENT.map(x => ({...x}));
    _noteText    = "Hendrick's Gin майже закінчився — термінове замовлення. Hendrick's впав — бій 0.7л о 18:52.\n\nГість на столі 7 просив знижку на Spritz — відмовив ввічливо.\n\nКавомашина Jura потребує чистки — завтра обов'язково.";
    _mgrPeriod   = 'week';
    _shiftClosed = false;
    return buildHTML();
  },
  init() {
    window.__sl = {
      toggleCk, toggleEquip, addTask,
      focusNote, updateChars, saveNote,
      closeShift, reopenShift, setPeriod,
    };
  },
};
