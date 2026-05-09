/* ============================================================
   BarOps — pages/excise.js
   Акцизні марки: фото камерою → надсилання в Telegram топік
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   VENUE → TELEGRAM TOPIC MAP
   (має збігатись з telegram.js на бекенді)
════════════════════════ */
const VENUE_TOPICS = {
  'La Pasta':  10,
  'Тераса':    23,
  'Дім18':     17,
  'Хочу 2.0':  447,
  'Хочу':      11,
};

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _step       = 'camera'; // 'camera' | 'preview' | 'sent'
let _photoFile  = null;     // реальний File об'єкт з камери
let _photoUrl   = null;     // ObjectURL для preview
let _scanResult = null;

/* ════════════════════════
   HISTORY (demo)
════════════════════════ */
const HISTORY = [
  { id:1, name:'Johnnie Walker Black 0.7л', code:'UA-2024-001-847291', date:'08.05.2026 · 19:41', status:'ok'   },
  { id:2, name:'Hendrick\'s Gin 0.7л',      code:'UA-2024-001-847288', date:'08.05.2026 · 18:53', status:'ok'   },
  { id:3, name:'Aperol 1л',                 code:'Не розпізнано',      date:'07.05.2026 · 20:11', status:'error'},
  { id:4, name:'Campari 0.7л',              code:'UA-2024-001-847201', date:'07.05.2026 · 19:30', status:'ok'   },
];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="exc-css">
.exc-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.exc-scroll{overflow-y:auto;flex:1}.exc-scroll::-webkit-scrollbar{width:0}

/* topbar */
.exc-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.exc-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.exc-back:active{background:var(--bg3)}
.exc-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.exc-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* camera zone */
.exc-cam{margin:0 14px 10px;border-radius:18px;overflow:hidden;background:#090909;border:0.5px solid var(--border2);aspect-ratio:4/3;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer}
.exc-cam:active{opacity:.85}
.exc-scan-line{position:absolute;left:12%;right:12%;height:2px;background:linear-gradient(90deg,transparent,var(--green),transparent);animation:excScan 2s ease-in-out infinite}
@keyframes excScan{0%,100%{top:20%}50%{top:75%}}
.exc-corner{position:absolute;width:20px;height:20px;border-color:var(--green);border-style:solid}
.exc-tl{top:12px;left:12px;border-width:2px 0 0 2px;border-radius:2px 0 0 0}
.exc-tr{top:12px;right:12px;border-width:2px 2px 0 0;border-radius:0 2px 0 0}
.exc-bl{bottom:12px;left:12px;border-width:0 0 2px 2px;border-radius:0 0 0 2px}
.exc-br{bottom:12px;right:12px;border-width:0 2px 2px 0;border-radius:0 0 2px 0}
.exc-stamp-frame{width:75%;height:60%;border:2px dashed rgba(29,158,117,.6);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px}
.exc-stamp-hint{font-size:11px;color:rgba(29,158,117,.8);font-family:var(--font-b);text-align:center;padding:0 12px}

/* buttons */
.exc-cam-btns{display:flex;gap:8px;padding:0 14px 10px}
.exc-icon-btn{width:52px;height:52px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.exc-icon-btn:active{background:var(--bg3)}
.exc-shoot-btn{flex:1;height:52px;background:var(--green);border:none;border-radius:12px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.exc-shoot-btn:active{background:var(--green-d);transform:scale(.97)}

/* info */
.exc-info{margin:0 14px 10px;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;color:var(--blue);font-family:var(--font-b);line-height:1.5}

/* venue badge */
.exc-venue-badge{margin:0 14px 10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:9px;font-size:13px;color:var(--text1);font-family:var(--font-b)}
.exc-venue-dot{width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0}

/* sec */
.exc-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b)}

/* history */
.exc-hist{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.exc-hist-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:0.5px solid var(--border)}
.exc-hist-row:last-child{border-bottom:none}
.exc-hist-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.exc-hist-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.exc-hist-code{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.exc-hist-date{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right}
.exc-hist-status{font-size:10px;font-family:var(--font-b);text-align:right;margin-top:2px}

/* preview overlay */
.exc-preview-overlay{position:absolute;inset:0;z-index:50;background:var(--bg1);display:none;flex-direction:column;animation:excSlide .3s cubic-bezier(.22,1,.36,1)}
.exc-preview-overlay.open{display:flex}
@keyframes excSlide{from{transform:translateY(100%)}to{transform:none}}
.exc-preview-img{margin:0 14px 12px;border-radius:16px;overflow:hidden;background:var(--bg2);border:0.5px solid var(--border2);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center}
.exc-preview-img img{width:100%;height:100%;object-fit:cover}
.exc-result-card{margin:0 14px 10px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:14px;padding:14px}
.exc-result-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--green);margin-bottom:10px}
.exc-result-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.exc-result-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.exc-result-val{font-size:12px;color:var(--text0);font-family:var(--font-b);text-align:right;max-width:60%}
.exc-preview-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.exc-btn-blue{width:100%;height:52px;background:var(--blue);border:none;border-radius:13px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.exc-btn-blue:active{background:#3a8fd0}
.exc-btn-blue:disabled{opacity:.5;cursor:not-allowed}
.exc-btn-ghost{width:100%;height:44px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:13px;font-size:13px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.exc-btn-ghost:active{background:var(--bg3)}

/* loading spinner */
.exc-spinner{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* sent overlay */
.exc-sent{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.exc-sent.open{display:flex;animation:excFade .3s ease}
@keyframes excFade{from{opacity:0}to{opacity:1}}
.exc-sent-icon{width:72px;height:72px;border-radius:50%;background:var(--blue-bg);border:0.5px solid var(--blue-border);display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.exc-sent-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.exc-sent-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:24px;max-width:280px}
.exc-sent-pill{background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:20px;padding:6px 16px;font-size:12px;color:var(--blue);font-family:var(--font-b);margin-bottom:22px}
</style>`;

/* ════════════════════════
   MANAGER VIEW
════════════════════════ */
const MGR_HISTORY = [
  { barman:'Олексій К.', venue:'La Pasta',  name:'Johnnie Walker Black', code:'UA-2024-847291', time:'19:41', status:'ok'    },
  { barman:'Олексій К.', venue:'La Pasta',  name:"Hendrick's Gin",       code:'UA-2024-847288', time:'18:53', status:'ok'    },
  { barman:'Марія П.',   venue:'Тераса',     name:'Aperol 1л',            code:'Не розпізнано',  time:'20:11', status:'error' },
  { barman:'Марія П.',   venue:'Тераса',     name:'Campari 0.7л',         code:'UA-2024-847201', time:'19:30', status:'ok'    },
  { barman:'Дмитро І.',  venue:'Дім18',      name:'Prosecco DOC',         code:'UA-2024-847155', time:'18:05', status:'ok'    },
];

function mgrExciseHTML() {
  const sent  = MGR_HISTORY.filter(h => h.status === 'ok').length;
  const error = MGR_HISTORY.filter(h => h.status === 'error').length;
  return `
  <div class="exc-topbar" style="flex-shrink:0">
    <div class="exc-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="exc-title">Акцизні марки</div>
      <div class="exc-sub">Менеджер · Журнал команди</div>
    </div>
  </div>
  <div class="exc-scroll">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px">
      <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center">
        <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--green)">${sent}</div>
        <div style="font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Надіслано</div>
      </div>
      <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center">
        <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--red)">${error}</div>
        <div style="font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Помилок</div>
      </div>
      <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center">
        <div style="font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0)">${MGR_HISTORY.length}</div>
        <div style="font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Всього</div>
      </div>
    </div>
    <div class="exc-sec">Журнал команди · сьогодні</div>
    <div class="exc-hist">
      ${MGR_HISTORY.map(h => `
      <div class="exc-hist-row">
        <div class="exc-hist-icon" style="background:${h.status==='ok'?'var(--green-bg)':'var(--red-bg)'}">
          ${h.status==='ok'
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round"/></svg>`}
        </div>
        <div style="flex:1;min-width:0">
          <div class="exc-hist-name">${h.name}</div>
          <div class="exc-hist-code">${h.barman} · ${h.venue}</div>
          <div class="exc-hist-code" style="color:var(--text3)">${h.code}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="exc-hist-date">${h.time}</div>
          <div class="exc-hist-status" style="color:${h.status==='ok'?'var(--green)':'var(--red)'}">
            ${h.status==='ok'?'✓ Надіслано':'✗ Помилка'}
          </div>
        </div>
      </div>`).join('')}
    </div>
    <div style="height:14px"></div>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  if (state.role === 'manager') return `${CSS}<div class="exc-wrap">${mgrExciseHTML()}</div>`;

  const venueName  = state.venue || 'Оберіть заклад';
  const topicId    = VENUE_TOPICS[venueName];
  const topicLabel = topicId ? `Топік #${topicId}` : 'Заклад не обрано';
  const previewSrc = _photoUrl || '';

  return `
${CSS}
<div class="exc-wrap" style="position:relative">

  <!-- TOPBAR -->
  <div class="exc-topbar" style="flex-shrink:0">
    <div class="exc-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="exc-title">Акцизні марки</div>
      <div class="exc-sub">Сканування → Telegram</div>
    </div>
    <div style="background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--blue);font-family:var(--font-b)">${HISTORY.length} сьогодні</div>
  </div>

  <div class="exc-scroll">

    <!-- Venue badge -->
    <div class="exc-venue-badge">
      <div class="exc-venue-dot"></div>
      <div>
        <div style="font-weight:500;color:var(--text0)">${venueName}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:1px">Telegram · ${topicLabel}</div>
      </div>
    </div>

    <!-- Camera zone — клік відкриває камеру через hidden input -->
    <label for="exc-cam-input" style="display:block;cursor:pointer">
      <div class="exc-cam">
        <div class="exc-corner exc-tl"></div>
        <div class="exc-corner exc-tr"></div>
        <div class="exc-corner exc-bl"></div>
        <div class="exc-corner exc-br"></div>
        <div class="exc-scan-line"></div>
        <div class="exc-stamp-frame">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="8" width="20" height="14" rx="2" stroke="rgba(29,158,117,.7)" stroke-width="1.5" fill="none"/>
            <path d="M8 12h12M8 16h8" stroke="rgba(29,158,117,.7)" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="20" cy="16" r="2" stroke="rgba(29,158,117,.7)" stroke-width="1.5"/>
          </svg>
          <div class="exc-stamp-hint">Натисніть щоб сфотографувати марку</div>
        </div>
      </div>
    </label>

    <!-- Buttons -->
    <div class="exc-cam-btns">
      <label for="exc-gallery-input" class="exc-icon-btn" title="Галерея" style="cursor:pointer">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="13" rx="2.5" stroke="var(--text1)" stroke-width="1.2"/>
          <circle cx="7" cy="9.5" r="2" stroke="var(--text1)" stroke-width="1.2"/>
          <path d="M2 16l4-4.5 3.5 3.5 3-3.5 5.5 4.5" stroke="var(--text1)" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
      </label>
      <label for="exc-cam-input" class="exc-shoot-btn" style="cursor:pointer">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="4" width="14" height="10" rx="2" stroke="#fff" stroke-width="1.2"/>
          <circle cx="9" cy="9" r="3" stroke="#fff" stroke-width="1.2"/>
        </svg>
        Сфотографувати
      </label>
    </div>

    <!-- Hidden file inputs (реальне відкриття камери) -->
    <input type="file" id="exc-cam-input"     accept="image/*" capture="environment"
      style="position:fixed;top:-200px;left:-200px;opacity:0;width:1px;height:1px"
      onchange="window.__exc.handleFile(this)"/>
    <input type="file" id="exc-gallery-input" accept="image/*"
      style="position:fixed;top:-200px;left:-200px;opacity:0;width:1px;height:1px"
      onchange="window.__exc.handleFile(this)"/>

    <!-- Info -->
    <div class="exc-info">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--blue)" stroke-width="1.2"/><path d="M7 6v4M7 4.5v.4" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/></svg>
      Фото надсилається в Telegram топік вашого закладу
    </div>

    <!-- History -->
    <div class="exc-sec">Відскановані сьогодні</div>
    <div class="exc-hist">
      ${HISTORY.map(h => `
      <div class="exc-hist-row">
        <div class="exc-hist-icon" style="background:${h.status==='ok'?'var(--green-bg)':'var(--red-bg)'}">
          ${h.status==='ok'
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="var(--red)" stroke-width="1.5" stroke-linecap="round"/></svg>`}
        </div>
        <div style="flex:1;min-width:0">
          <div class="exc-hist-name">${h.name}</div>
          <div class="exc-hist-code">${h.code}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="exc-hist-date">${h.date.split(' · ')[1]}</div>
          <div class="exc-hist-status" style="color:${h.status==='ok'?'var(--green)':'var(--red)'}">
            ${h.status==='ok'?'✓ Надіслано':'✗ Помилка'}
          </div>
        </div>
      </div>`).join('')}
    </div>
    <div style="height:14px"></div>
  </div>

  <!-- PREVIEW OVERLAY -->
  <div class="exc-preview-overlay ${_step==='preview'?'open':''}" id="exc-preview">
    <div class="exc-topbar" style="flex-shrink:0">
      <div class="exc-back" onclick="window.__exc.retake()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="exc-title">Перевірка фото</div>
        <div class="exc-sub">Перевірте і надішліть у Telegram</div>
      </div>
    </div>
    <div style="overflow-y:auto;flex:1">
      <div class="exc-preview-img">
        ${previewSrc
          ? `<img src="${previewSrc}" alt="Фото марки"/>`
          : `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
               <rect x="8" y="14" width="32" height="22" rx="3" stroke="var(--green)" stroke-width="1.5" fill="none"/>
               <path d="M14 22h20M14 28h14" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round"/>
               <circle cx="34" cy="28" r="4" stroke="var(--green)" stroke-width="1.5"/>
             </svg>
             <div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">Фото акцизної марки</div>`}
      </div>
      <div class="exc-result-card">
        <div class="exc-result-title">📷 Готово до надсилання</div>
        <div class="exc-result-row">
          <div class="exc-result-lbl">Заклад</div>
          <div class="exc-result-val" style="color:var(--green);font-family:var(--font-h)">${venueName}</div>
        </div>
        <div class="exc-result-row">
          <div class="exc-result-lbl">Telegram топік</div>
          <div class="exc-result-val" style="color:var(--blue)">${topicLabel}</div>
        </div>
        <div class="exc-result-row">
          <div class="exc-result-lbl">Бармен</div>
          <div class="exc-result-val">${state.user || 'Бармен'}</div>
        </div>
        <div class="exc-result-row">
          <div class="exc-result-lbl">Час</div>
          <div class="exc-result-val">${new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>
    </div>
    <div class="exc-preview-actions">
      <button class="exc-btn-blue" id="exc-send-btn" onclick="window.__exc.sendToTelegram()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 7.5L14.5 2 11 14 7.5 9.5 13 4M7.5 9.5L6 13" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Надіслати в Telegram
      </button>
      <button class="exc-btn-ghost" onclick="window.__exc.retake()">Сфотографувати ще раз</button>
    </div>
  </div>

  <!-- SENT OVERLAY -->
  <div class="exc-sent ${_step==='sent'?'open':''}" id="exc-sent">
    <div class="exc-sent-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M3 16L29 5 22 28 14 19 29 8M14 19L11 26" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="exc-sent-title">Надіслано!</div>
    <div class="exc-sent-sub">Фото акцизної марки надіслано в Telegram топік закладу <strong>${venueName}</strong></div>
    <div class="exc-sent-pill">${topicLabel}</div>
    <button class="exc-btn-blue" style="max-width:280px" onclick="window.__exc.scanNext()">
      Сканувати наступну
    </button>
    <button class="exc-btn-ghost" style="max-width:280px;margin-top:8px" onclick="window.__barops.navigate('dashboard')">
      На головний
    </button>
  </div>

</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
  // Після рендеру повторно прив'язуємо обробник файлів
  ['exc-cam-input','exc-gallery-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => window.__exc.handleFile(el);
  });
}

/* ════════════════════════
   ACTIONS
════════════════════════ */

// Обробка вибраного файлу з камери/галереї
function handleFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  _photoFile = file;
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoUrl = URL.createObjectURL(file);
  _step = 'preview';
  fullRender();
  // Скидаємо input щоб можна було вибрати той самий файл знову
  input.value = '';
}

function retake() {
  if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
  _photoFile = null;
  _step = 'camera';
  fullRender();
}

async function sendToTelegram() {
  if (!_photoFile) return;

  const btn = document.getElementById('exc-send-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="exc-spinner"></div> Надсилання...`;
  }

  try {
    const token = localStorage.getItem('barops_token');
    const venueName = state.venue || '';

    // Надсилаємо фото як multipart/form-data
    const formData = new FormData();
    formData.append('photo',      _photoFile);
    formData.append('venueName',  venueName);
    formData.append('barmanName', state.user || 'Бармен');

    const res = await fetch('https://barops-backend-production.up.railway.app/api/excise/photo', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body:    formData,
    });

    const data = await res.json();
    console.log('[Excise] Відповідь:', data);

  } catch (err) {
    console.warn('[Excise] Помилка надсилання:', err.message);
  }

  _step = 'sent';
  fullRender();
}

function scanNext() {
  if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
  _photoFile = null;
  _step = 'camera';
  fullRender();
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _step     = 'camera';
    _photoFile = null;
    if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
    return buildHTML();
  },
  init() {
    window.__exc = { handleFile, retake, sendToTelegram, scanNext };
    // Прив'язуємо обробники до прихованих inputs
    ['exc-cam-input','exc-gallery-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.onchange = () => window.__exc.handleFile(el);
    });
  },
};
