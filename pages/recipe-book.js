/* ============================================================
   BarOps — pages/recipe-book.js
   ============================================================ */
import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _groups   = [];
let _loading  = true;
let _error    = '';
let _venueId  = null;
let _role     = 'bartender';

let _screen      = 'groups';
let _selGroup    = null;
let _selRecipe   = null;

let _cat           = 'bar';   // активна вкладка Рецептів: 'kitchen' | 'bar' | 'wine'
let _editGroupId   = null;
let _editGroupName = '';
let _editGroupCat  = 'bar';   // категорія групи у формі створення/редагування
let _expanded      = new Set();   // id рецептів, розгорнутих карткою (режим картки)
let _editRecipeId  = null;
let _editName      = '';
let _editIngredients = [];
let _editSteps       = '';
let _editMethod      = '';
let _editGarnish     = '';

let _editPhotoUrl = '';

let _saving     = false;
let _delConfirm = null;
let _drag       = null;   // стан перетягування груп

/* ── CSS ─────────────────────────────────────────── */
const CSS = `
.rb-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg0)}
.rb-scroll{overflow-y:auto;flex:1}.rb-scroll::-webkit-scrollbar{width:0}
.rb-topbar{display:flex;align-items:center;padding:10px 16px 6px;gap:10px;flex-shrink:0}
.rb-back{background:none;border:none;color:var(--text1);cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px;font-size:14px;font-family:var(--font-b)}
.rb-title{font-family:var(--font-h);font-size:22px;font-weight:600;color:var(--text0);letter-spacing:-.02em;flex:1}
.rb-add-btn{display:flex;align-items:center;gap:4px;padding:6px 12px;background:var(--green);color:#000;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0}
.rb-list{padding:0 16px}
.rb-tabs{display:flex;gap:6px;padding:4px 16px 12px}
.rb-tab{flex:1;height:36px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg1);color:var(--text2);font-size:13px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.rb-tab.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.rb-catseg{display:flex;gap:6px;margin-bottom:14px}
.rb-catseg button{flex:1;height:40px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text2);font-size:13px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.rb-catseg button.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.rb-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:opacity .15s;user-select:none}
.rb-card:active{opacity:.7}
.rb-card-title{font-size:15px;font-weight:600;color:var(--text0);margin-bottom:3px}
.rb-card-sub{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.rb-card-arr{color:var(--text2);flex-shrink:0}
.rb-card-actions{display:flex;gap:8px;flex-shrink:0}
.rb-icon-btn{background:var(--bg2);border:0.5px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text1)}
.rb-icon-btn.danger{color:#ff5c5c}
/* Картка рецепту з розгортанням (офіціант/менеджер/керуючий/власник) */
.rb-rcard{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;margin-bottom:10px;overflow:hidden}
.rb-rcard-head{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none}
.rb-rcard-head:active{opacity:.7}
.rb-rcard-chev{color:var(--text2);flex-shrink:0;transition:transform .2s;transform:rotate(90deg)}
.rb-rcard-chev.open{transform:rotate(-90deg)}
.rb-rcard-body{padding:0 16px 14px;animation:rbfade .18s ease}
.rb-rcard-ingr{background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:0 12px;margin-top:2px}
.rb-rcard-photo{width:100%;border-radius:10px;object-fit:cover;max-height:240px;display:block;margin-top:10px}
.rb-rcard-empty{color:var(--text2);font-size:13px;font-family:var(--font-b);padding:6px 0}
@keyframes rbfade{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.rb-empty{text-align:center;padding:48px 24px;color:var(--text2);font-size:14px;font-family:var(--font-b);line-height:1.6}
.rb-empty-icon{font-size:36px;margin-bottom:12px}
.rb-recipe-detail{padding:0 16px 24px}
.rb-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text2);font-family:var(--font-mono);margin:20px 0 8px}
.rb-ingr-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid var(--border);font-size:14px}
.rb-ingr-row:last-child{border-bottom:none}
.rb-ingr-name{color:var(--text0)}
.rb-ingr-qty{color:var(--green);font-family:var(--font-mono);font-size:13px}
.rb-steps-text{font-size:14px;color:var(--text1);font-family:var(--font-b);line-height:1.7;white-space:pre-wrap;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:14px}
.rb-edit-form{padding:0 16px 32px}
.rb-field-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);font-family:var(--font-mono);margin-bottom:6px}
.rb-field-wrap{margin-bottom:18px}
.rb-input{width:100%;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);box-sizing:border-box;outline:none}
.rb-input:focus{border-color:var(--green)}
.rb-textarea{width:100%;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);box-sizing:border-box;outline:none;resize:vertical;min-height:120px;line-height:1.6}
.rb-textarea:focus{border-color:var(--green)}
.rb-ingr-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.rb-ingr-edit-row{display:flex;gap:6px;align-items:center}
.rb-ingr-edit-row .rb-input{margin:0}
.rb-ingr-inp-name{flex:3;min-width:0}
.rb-ingr-inp-qty{flex:1.4;min-width:0}
.rb-ingr-inp-unit{flex:1.4;min-width:0}
.rb-ingr-del{background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer;padding:4px;line-height:1;flex-shrink:0}
.rb-add-ingr-btn{background:none;border:0.5px dashed var(--border);border-radius:10px;padding:9px;width:100%;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;text-align:center;box-sizing:border-box}
.rb-save-btn{width:100%;padding:14px;background:var(--green);color:#000;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-b)}
.rb-save-btn:disabled{opacity:.5;cursor:default}
.rb-err{margin:0 0 14px;background:rgba(255,80,80,.08);border:0.5px solid rgba(255,80,80,.3);border-radius:10px;padding:10px 12px;font-size:12px;color:#ff5c5c;font-family:var(--font-b)}
.rb-del-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6)}
.rb-del-sheet{background:var(--bg1);border-radius:20px 20px 0 0;padding:20px 16px 32px;width:100%;max-width:430px}
.rb-del-title{font-size:16px;font-weight:600;color:var(--text0);margin-bottom:8px}
.rb-del-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:20px;line-height:1.5}
.rb-del-btns{display:flex;flex-direction:column;gap:8px}
.rb-del-btn{padding:13px;border-radius:12px;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-b)}
.rb-del-btn.danger{background:#ff3333;color:#fff}
.rb-del-btn.cancel{background:var(--bg2);color:var(--text1)}
.rb-loading-wrap{display:flex;align-items:center;justify-content:center;flex:1;color:var(--text2);font-size:14px;font-family:var(--font-b);padding:60px}
.rb-photo-preview{width:100%;border-radius:12px;object-fit:cover;max-height:220px;display:block;background:var(--bg2)}
.rb-photo-actions{display:flex;gap:8px;margin-top:8px}
.rb-photo-btn{flex:1;padding:10px;background:var(--bg2);border:0.5px dashed var(--border);border-radius:10px;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;text-align:center;display:block;box-sizing:border-box}
.rb-photo-remove{padding:10px 14px;background:rgba(255,80,80,.08);border:0.5px solid rgba(255,80,80,.3);border-radius:10px;font-size:13px;color:#ff5c5c;font-family:var(--font-b);cursor:pointer;flex-shrink:0}
.rb-recipe-photo{width:100%;border-radius:12px;object-fit:cover;max-height:320px;display:block;margin-top:8px}
.rb-crop-ov{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.92);display:flex;flex-direction:column}
.rb-crop-stage{flex:1;position:relative;margin:16px;overflow:hidden;touch-action:none}
.rb-crop-stage img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;pointer-events:none}
.rb-crop-box{position:absolute;border:1.5px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.5);box-sizing:border-box;cursor:move}
.rb-crop-h{position:absolute;width:24px;height:24px;background:var(--green);border:2px solid #fff;border-radius:50%;box-sizing:border-box;touch-action:none}
.rb-crop-h.tl{left:-12px;top:-12px}.rb-crop-h.tr{right:-12px;top:-12px}.rb-crop-h.bl{left:-12px;bottom:-12px}.rb-crop-h.br{right:-12px;bottom:-12px}
.rb-crop-btns{display:flex;gap:10px;padding:0 16px calc(20px + env(safe-area-inset-bottom))}
.rb-crop-cancel{flex:1;height:50px;background:rgba(255,255,255,.1);border:0.5px solid rgba(255,255,255,.25);border-radius:13px;color:#fff;font-size:15px;font-family:var(--font-b);cursor:pointer}
.rb-crop-apply{flex:1;height:50px;background:var(--green);border:none;border-radius:13px;color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.rb-drag-handle{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:30px;height:30px;margin:-4px 2px -4px -4px;color:var(--text2);cursor:grab;touch-action:none}
.rb-drag-handle:active{cursor:grabbing}
.rb-card.rb-dragging{opacity:.96;box-shadow:0 12px 32px rgba(0,0,0,.55);z-index:1000}
.rb-placeholder{border:1px dashed var(--green);border-radius:14px;margin-bottom:10px;background:rgba(127,90,240,.05);box-sizing:border-box}
`;

/* ── Utils ───────────────────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function plural(n, one, few, many) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ${one}`;
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return `${n} ${few}`;
  return `${n} ${many}`;
}
function authHeaders() {
  const token = localStorage.getItem('barops_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
function roleLc() { return (_role || '').toLowerCase(); }

// Редагувати можуть: власник, менеджер, керуючий, шеф-кухар.
function isEditable() {
  return ['admin', 'manager', 'director', 'chef'].includes(roleLc());
}

// Повний екран з описом приготування — лише виконавцям (бармен, кухар, шеф).
// Решта (офіціант, менеджер, керуючий, власник) бачать рецепт карткою з розгортанням.
function isFullView() {
  return ['bartender', 'cook', 'chef'].includes(roleLc());
}

// Дозволені розділи рецептів за роллю:
//  • бармен — лише «Бар»;  • кухар/шеф — лише «Кухня»;  • решта — усі три.
function allowedCats() {
  const r = roleLc();
  if (r === 'bartender') return ['bar'];
  if (r === 'cook' || r === 'chef') return ['kitchen'];
  return ['kitchen', 'bar', 'wine'];
}

/* ── SVG icons ───────────────────────────────────── */
const ICON_BACK = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16l-6-6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13h2.5l6-6L9 4.5l-6 6V13z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10.5 3l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l1 9h4l1-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_DRAG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6" cy="4" r="1.2" fill="currentColor"/><circle cx="12" cy="4" r="1.2" fill="currentColor"/><circle cx="6" cy="9" r="1.2" fill="currentColor"/><circle cx="12" cy="9" r="1.2" fill="currentColor"/><circle cx="6" cy="14" r="1.2" fill="currentColor"/><circle cx="12" cy="14" r="1.2" fill="currentColor"/></svg>`;

/* ── Photo compression ───────────────────────────── */
function compressToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.70));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

/* ── Обрізка фото (інтерактивний оверлей) ─────────── */
function openCropOverlay(srcUrl, onApply) {
  const ov = document.createElement('div');
  ov.className = 'rb-crop-ov';
  ov.innerHTML = `
    <div class="rb-crop-stage" id="rb-crop-stage">
      <img id="rb-crop-img" src="${srcUrl}" alt="">
      <div class="rb-crop-box" id="rb-crop-box">
        <div class="rb-crop-h tl" data-h="tl"></div><div class="rb-crop-h tr" data-h="tr"></div>
        <div class="rb-crop-h bl" data-h="bl"></div><div class="rb-crop-h br" data-h="br"></div>
      </div>
    </div>
    <div class="rb-crop-btns">
      <button class="rb-crop-cancel" id="rb-crop-cancel">Скасувати</button>
      <button class="rb-crop-apply" id="rb-crop-apply">Застосувати</button>
    </div>`;
  document.body.appendChild(ov);
  const img = ov.querySelector('#rb-crop-img');
  const stage = ov.querySelector('#rb-crop-stage');
  const box = ov.querySelector('#rb-crop-box');
  let R = null;  // габарит відображеного фото (object-fit:contain) у координатах stage

  const setBox = (x, y, w, h) => { box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px'; };
  const getBox = () => ({ x: box.offsetLeft, y: box.offsetTop, w: box.offsetWidth, h: box.offsetHeight });
  function clamp(x, y, w, h) {
    const min = 36;
    w = Math.min(Math.max(min, w), R.width); h = Math.min(Math.max(min, h), R.height);
    x = Math.min(Math.max(R.left, x), R.left + R.width - w);
    y = Math.min(Math.max(R.top, y), R.top + R.height - h);
    return { x, y, w, h };
  }
  function layout() {
    const sw = stage.clientWidth, sh = stage.clientHeight, nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw) return;
    const scale = Math.min(sw / nw, sh / nh);
    const dw = nw * scale, dh = nh * scale;
    R = { left: (sw - dw) / 2, top: (sh - dh) / 2, width: dw, height: dh, scale };
    const c = clamp(R.left + dw * 0.1, R.top + dh * 0.1, dw * 0.8, dh * 0.8);
    setBox(c.x, c.y, c.w, c.h);
  }

  let drag = null;
  const pt = (e) => { const t = e.touches ? e.touches[0] : e; const r = stage.getBoundingClientRect(); return { x: t.clientX - r.left, y: t.clientY - r.top }; };
  function down(e, handle) {
    e.preventDefault();
    drag = { handle, p: pt(e), b: getBox() };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
  }
  function move(e) {
    if (!drag) return; e.preventDefault();
    const p = pt(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y, b = drag.b;
    let x = b.x, y = b.y, w = b.w, h = b.h;
    if (drag.handle === 'move') { x = b.x + dx; y = b.y + dy; }
    else {
      if (drag.handle.includes('l')) { x = b.x + dx; w = b.w - dx; }
      if (drag.handle.includes('r')) { w = b.w + dx; }
      if (drag.handle.includes('t')) { y = b.y + dy; h = b.h - dy; }
      if (drag.handle.includes('b')) { h = b.h + dy; }
    }
    const c = clamp(x, y, w, h); setBox(c.x, c.y, c.w, c.h);
  }
  function up() {
    drag = null;
    window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
    window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
  }
  box.addEventListener('mousedown', (e) => { if (e.target === box) down(e, 'move'); });
  box.addEventListener('touchstart', (e) => { if (e.target === box) down(e, 'move'); }, { passive: false });
  ov.querySelectorAll('.rb-crop-h').forEach(h => {
    h.addEventListener('mousedown', (e) => { e.stopPropagation(); down(e, h.dataset.h); });
    h.addEventListener('touchstart', (e) => { e.stopPropagation(); down(e, h.dataset.h); }, { passive: false });
  });

  const close = () => ov.remove();
  ov.querySelector('#rb-crop-cancel').onclick = close;
  ov.querySelector('#rb-crop-apply').onclick = () => {
    const b = getBox();
    const sx = (b.x - R.left) / R.scale, sy = (b.y - R.top) / R.scale;
    const sw = b.w / R.scale, sh = b.h / R.scale;
    let ow = sw, oh = sh; const MAX = 800;
    if (ow > MAX || oh > MAX) { if (ow > oh) { oh = Math.round(oh * MAX / ow); ow = MAX; } else { ow = Math.round(ow * MAX / oh); oh = MAX; } }
    const c = document.createElement('canvas');
    c.width = Math.round(ow); c.height = Math.round(oh);
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
    close(); onApply(c.toDataURL('image/jpeg', 0.72));
  };

  if (img.complete && img.naturalWidth) layout(); else img.onload = layout;
}

/* ── HTML builders ───────────────────────────────── */
const CAT_TABS = [['kitchen', 'Кухня'], ['bar', 'Бар'], ['wine', 'Винна карта']];
function buildGroupsScreen() {
  let html = `<div class="rb-topbar">
    <span class="rb-title">Рецепти</span>
    ${isEditable() ? `<button class="rb-add-btn" onclick="window.__rb.addGroup()">+ Група</button>` : ''}
  </div>`;
  const allowed = allowedCats();
  if (allowed.length > 1) {
    html += `<div class="rb-tabs">${CAT_TABS.filter(([k]) => allowed.includes(k)).map(([k, l]) => `<button class="rb-tab${_cat === k ? ' act' : ''}" onclick="window.__rb.setCat('${k}')">${l}</button>`).join('')}</div>`;
  }
  html += `<div class="rb-list">`;
  const groups = _groups.filter(g => (g.category || 'bar') === _cat);
  const catLbl = (CAT_TABS.find(c => c[0] === _cat) || [, ''])[1];
  if (_error) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">⚠️</div>${esc(_error)}</div>`;
  } else if (!groups.length) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">📖</div>${isEditable() ? `Немає груп у «${catLbl}». Додайте першу.` : `У «${catLbl}» ще немає рецептів.`}</div>`;
  } else {
    groups.forEach(g => {
      const count = g.recipes?.length || 0;
      html += `<div class="rb-card" data-gid="${g.id}" onclick="window.__rb.openGroup('${g.id}')">
        ${isEditable() ? `<div class="rb-drag-handle" onpointerdown="window.__rb.dragStart(event,'${g.id}')" onclick="event.stopPropagation()">${ICON_DRAG}</div>` : ''}
        <div style="flex:1;min-width:0">
          <div class="rb-card-title">${esc(g.name)}</div>
          <div class="rb-card-sub">${plural(count,'рецепт','рецепти','рецептів')}</div>
        </div>
        ${isEditable() ? `<div class="rb-card-actions" onclick="event.stopPropagation()">
          <button class="rb-icon-btn" onclick="window.__rb.editGroup('${g.id}')">${ICON_EDIT}</button>
          <button class="rb-icon-btn danger" onclick="window.__rb.deleteGroup('${g.id}')">${ICON_TRASH}</button>
        </div>` : `<span class="rb-card-arr">${ICON_CHEVRON}</span>`}
      </div>`;
    });
  }
  return html + '</div>';
}

function buildRecipesScreen() {
  if (!_selGroup) return '';
  const recipes = _selGroup.recipes || [];
  let html = `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} Рецепти</button>
    ${isEditable() ? `<button class="rb-add-btn" onclick="window.__rb.addRecipe()">+ Рецепт</button>` : ''}
  </div>
  <div style="padding:0 16px 8px"><span class="rb-title">${esc(_selGroup.name)}</span></div>
  <div class="rb-list">`;
  if (!recipes.length) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">🍹</div>${isEditable() ? 'Немає рецептів. Додайте перший.' : 'Рецепти ще не додано.'}</div>`;
  } else if (isFullView()) {
    // Виконавці (бармен/кухар/шеф) — клік відкриває повний екран з приготуванням
    recipes.forEach(r => {
      const ingCount = (r.ingredients || []).length;
      html += `<div class="rb-card" onclick="window.__rb.openRecipe('${r.id}')">
        <div style="flex:1;min-width:0">
          <div class="rb-card-title">${esc(r.name)}</div>
          <div class="rb-card-sub">${ingCount ? `${ingCount} інгр.` : 'Без інгредієнтів'}</div>
        </div>
        ${isEditable() ? `<div class="rb-card-actions" onclick="event.stopPropagation()">
          <button class="rb-icon-btn" onclick="window.__rb.editRecipe('${r.id}')">${ICON_EDIT}</button>
          <button class="rb-icon-btn danger" onclick="window.__rb.deleteRecipe('${r.id}')">${ICON_TRASH}</button>
        </div>` : `<span class="rb-card-arr">${ICON_CHEVRON}</span>`}
      </div>`;
    });
  } else {
    // Офіціант/менеджер/керуючий/власник — картка з розгортанням (склад + фото, без приготування)
    recipes.forEach(r => { html += buildRecipeCard(r); });
  }
  return html + '</div>';
}

// Картка рецепту з inline-розгортанням: склад + фото (без опису приготування)
function buildRecipeCard(r) {
  const ingr = r.ingredients || [];
  const open = _expanded.has(r.id);
  let h = `<div class="rb-rcard">
    <div class="rb-rcard-head" onclick="window.__rb.toggleRecipe('${r.id}')">
      <div style="flex:1;min-width:0">
        <div class="rb-card-title">${esc(r.name)}</div>
        <div class="rb-card-sub">${ingr.length ? `${ingr.length} інгр.` : 'Без інгредієнтів'}</div>
      </div>
      ${isEditable() ? `<div class="rb-card-actions" onclick="event.stopPropagation()">
        <button class="rb-icon-btn" onclick="window.__rb.editRecipe('${r.id}')">${ICON_EDIT}</button>
        <button class="rb-icon-btn danger" onclick="window.__rb.deleteRecipe('${r.id}')">${ICON_TRASH}</button>
      </div>` : ''}
      <span class="rb-rcard-chev${open ? ' open' : ''}">${ICON_CHEVRON}</span>
    </div>`;
  if (open) {
    h += `<div class="rb-rcard-body">`;
    if (ingr.length) {
      h += `<div class="rb-rcard-ingr">`;
      ingr.forEach(i => {
        h += `<div class="rb-ingr-row"><span class="rb-ingr-name">${esc(i.name)}</span><span class="rb-ingr-qty">${i.qty} ${esc(i.unit)}</span></div>`;
      });
      h += `</div>`;
    }
    if (r.photoUrl) h += `<img class="rb-rcard-photo" src="${r.photoUrl}" alt="">`;
    if (!ingr.length && !r.photoUrl) h += `<div class="rb-rcard-empty">Склад і фото ще не додано.</div>`;
    h += `</div>`;
  }
  return h + `</div>`;
}

function buildRecipeScreen() {
  if (!_selRecipe) return '';
  const ingr    = _selRecipe.ingredients || [];
  const steps   = _selRecipe.steps   || '';
  const method  = _selRecipe.method  || '';
  const garnish = _selRecipe.garnish || '';
  let html = `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${esc(_selGroup?.name || 'Назад')}</button>
    ${isEditable() ? `<div style="display:flex;gap:8px">
      <button class="rb-icon-btn" onclick="window.__rb.editRecipe('${_selRecipe.id}')">${ICON_EDIT}</button>
      <button class="rb-icon-btn danger" onclick="window.__rb.deleteRecipe('${_selRecipe.id}')">${ICON_TRASH}</button>
    </div>` : ''}
  </div>
  <div class="rb-recipe-detail">
    <div class="rb-title">${esc(_selRecipe.name)}</div>`;

  if (method || garnish) {
    html += `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">`;
    if (method)  html += `<span style="background:var(--bg2);border:0.5px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;color:var(--text1);font-family:var(--font-b)">⚗️ ${esc(method)}</span>`;
    if (garnish) html += `<span style="background:var(--bg2);border:0.5px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;color:var(--text1);font-family:var(--font-b)">🌿 ${esc(garnish)}</span>`;
    html += `</div>`;
  }

  if (ingr.length) {
    html += `<div class="rb-section-title">Інгредієнти</div>
    <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:0 14px">`;
    ingr.forEach(i => {
      html += `<div class="rb-ingr-row"><span class="rb-ingr-name">${esc(i.name)}</span><span class="rb-ingr-qty">${i.qty} ${esc(i.unit)}</span></div>`;
    });
    html += `</div>`;
  }
  if (steps) {
    html += `<div class="rb-section-title">Приготування</div><div class="rb-steps-text">${esc(steps)}</div>`;
  }
  if (_selRecipe.photoUrl) {
    html += `<img class="rb-recipe-photo" src="${_selRecipe.photoUrl}" alt="Фото рецепту">`;
  }
  if (!ingr.length && !steps && !method && !garnish && !_selRecipe.photoUrl) {
    html += `<div class="rb-empty" style="padding:32px 0">Опис рецепту ще не додано.</div>`;
  }
  return html + '</div>';
}

function buildEditGroupScreen() {
  const isNew = !_editGroupId;
  return `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${isNew ? 'Нова група' : 'Редагування'}</button>
  </div>
  <div class="rb-edit-form">
    <div class="rb-title" style="margin-bottom:20px">${isNew ? 'Нова група' : 'Редагувати групу'}</div>
    ${_error ? `<div class="rb-err">${esc(_error)}</div>` : ''}
    ${allowedCats().length > 1 ? `<div class="rb-field-wrap">
      <div class="rb-field-label">Розділ</div>
      <div class="rb-catseg">${CAT_TABS.filter(([k]) => allowedCats().includes(k)).map(([k, l]) => `<button class="${_editGroupCat === k ? 'act' : ''}" onclick="window.__rb.onGroupCat('${k}')">${l}</button>`).join('')}</div>
    </div>` : ''}
    <div class="rb-field-wrap">
      <div class="rb-field-label">Назва групи</div>
      <input class="rb-input" id="rb-g-name" type="text" placeholder="Коктейлі, Лимонади…" value="${esc(_editGroupName)}" oninput="window.__rb.onGroupName(this.value)">
    </div>
    <button class="rb-save-btn" onclick="window.__rb.saveGroup()" ${_saving?'disabled':''}>
      ${_saving ? 'Збереження…' : 'Зберегти'}
    </button>
  </div>`;
}

function buildEditRecipeScreen() {
  const isNew = !_editRecipeId;
  let ingrHtml = _editIngredients.map((ing, idx) => `
    <div class="rb-ingr-edit-row">
      <input class="rb-input rb-ingr-inp-name" type="text" placeholder="Назва" value="${esc(ing.name)}" oninput="window.__rb.onIngr(${idx},'name',this.value)">
      <input class="rb-input rb-ingr-inp-qty" type="number" placeholder="К-сть" value="${ing.qty||''}" oninput="window.__rb.onIngr(${idx},'qty',this.value)" min="0" step="0.1">
      <input class="rb-input rb-ingr-inp-unit" type="text" placeholder="мл/шт" value="${esc(ing.unit)}" oninput="window.__rb.onIngr(${idx},'unit',this.value)">
      <button class="rb-ingr-del" onclick="window.__rb.removeIngr(${idx})">×</button>
    </div>`).join('');
  return `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${esc(_selGroup?.name || 'Назад')}</button>
  </div>
  <div class="rb-edit-form">
    <div class="rb-title" style="margin-bottom:20px">${isNew ? 'Новий рецепт' : 'Редагувати рецепт'}</div>
    ${_error ? `<div class="rb-err">${esc(_error)}</div>` : ''}
    <div class="rb-field-wrap">
      <div class="rb-field-label">Назва рецепту</div>
      <input class="rb-input" id="rb-r-name" type="text" placeholder="Mojito, Lemonade…" value="${esc(_editName)}" oninput="window.__rb.onRecipeName(this.value)">
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Інгредієнти</div>
      <div class="rb-ingr-list" id="rb-ingr-list">${ingrHtml}</div>
      <button class="rb-add-ingr-btn" onclick="window.__rb.addIngr()">+ Інгредієнт</button>
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Метод приготування <span style="color:var(--text2);font-size:10px;text-transform:none;letter-spacing:0">(необов'язково)</span></div>
      <input class="rb-input" type="text" placeholder="Shaken, Stirred, Blended…" value="${esc(_editMethod)}" oninput="window.__rb.onMethod(this.value)">
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Прикраса <span style="color:var(--text2);font-size:10px;text-transform:none;letter-spacing:0">(необов'язково)</span></div>
      <input class="rb-input" type="text" placeholder="Лайм, м'ята, сіль…" value="${esc(_editGarnish)}" oninput="window.__rb.onGarnish(this.value)">
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Кроки приготування <span style="color:var(--text2);font-size:10px;text-transform:none;letter-spacing:0">(необов'язково)</span></div>
      <textarea class="rb-textarea" placeholder="Опишіть кроки…" oninput="window.__rb.onSteps(this.value)">${esc(_editSteps)}</textarea>
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Фото <span style="color:var(--text2);font-size:10px;text-transform:none;letter-spacing:0">(необов'язково)</span></div>
      ${_editPhotoUrl ? `
        <img class="rb-photo-preview" src="${_editPhotoUrl}" alt="">
        <div class="rb-photo-actions">
          <button class="rb-photo-btn" onclick="window.__rb.cropPhoto()">✂ Обрізати</button>
          <label class="rb-photo-btn" for="rb-photo-inp">Замінити</label>
          <button class="rb-photo-remove" onclick="window.__rb.removePhoto()">Видалити</button>
        </div>
      ` : `<label class="rb-photo-btn" for="rb-photo-inp">📷 Додати фото</label>`}
      <input type="file" id="rb-photo-inp" accept="image/*" style="display:none" onchange="window.__rb.handlePhoto(this)">
    </div>
    <button class="rb-save-btn" onclick="window.__rb.saveRecipe()" ${_saving?'disabled':''}>
      ${_saving ? 'Збереження…' : 'Зберегти'}
    </button>
  </div>`;
}

function buildDelConfirm() {
  if (!_delConfirm) return '';
  const isGroup = _delConfirm === 'group';
  const name = isGroup ? _selGroup?.name : _selRecipe?.name;
  return `<div class="rb-del-overlay" onclick="event.target===this&&window.__rb.cancelDel()">
    <div class="rb-del-sheet">
      <div class="rb-del-title">Видалити ${isGroup ? 'групу' : 'рецепт'}?</div>
      <div class="rb-del-sub">${isGroup ? `«${esc(name)}» та всі рецепти в ній буде видалено назавжди.` : `«${esc(name)}» буде видалено назавжди.`}</div>
      <div class="rb-del-btns">
        <button class="rb-del-btn danger" onclick="window.__rb.confirmDel()">Видалити</button>
        <button class="rb-del-btn cancel" onclick="window.__rb.cancelDel()">Скасувати</button>
      </div>
    </div>
  </div>`;
}

function buildScreen() {
  if (_loading) return `<div class="rb-loading-wrap">Завантаження…</div>`;
  switch (_screen) {
    case 'recipes':     return buildRecipesScreen();
    case 'recipe':      return buildRecipeScreen();
    case 'edit-group':  return buildEditGroupScreen();
    case 'edit-recipe': return buildEditRecipeScreen();
    default:            return buildGroupsScreen();
  }
}

function fullRender() {
  const root = document.getElementById('rb-root');
  if (!root) return;
  root.innerHTML = `<div class="rb-wrap"><div class="rb-scroll">${buildScreen()}</div></div>${buildDelConfirm()}`;
}

/* ── Data ────────────────────────────────────────── */
async function loadGroups() {
  _loading = true; _error = ''; fullRender();
  try {
    const res  = await fetch(`${API}/api/recipe-book/groups?venueId=${_venueId}`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) { _groups = data.groups; }
    else { _error = data.error || 'Помилка завантаження'; }
  } catch { _error = 'Немає зʼєднання'; }
  _loading = false; fullRender();
}

/* ── Actions ─────────────────────────────────────── */
window.__rb = {
  goBack() {
    _error = '';
    if (_screen === 'recipe')      { _screen = 'recipes'; fullRender(); return; }
    if (_screen === 'recipes')     { _screen = 'groups'; _selGroup = null; fullRender(); return; }
    if (_screen === 'edit-group')  { _screen = 'groups'; fullRender(); return; }
    if (_screen === 'edit-recipe') { _screen = 'recipes'; fullRender(); return; }
    _screen = 'groups'; fullRender();
  },

  openGroup(id) {
    _selGroup = _groups.find(g => g.id === id) || null;
    if (!_selGroup) return;
    _expanded = new Set();
    _screen = 'recipes'; fullRender();
  },

  toggleRecipe(id) {
    if (_expanded.has(id)) _expanded.delete(id); else _expanded.add(id);
    fullRender();
  },

  /* ── Перетягування груп ── */
  dragStart(e, id) {
    if (!isEditable() || _drag) return;
    e.preventDefault(); e.stopPropagation();
    const list = document.querySelector('.rb-list');
    const el   = list?.querySelector(`.rb-card[data-gid="${id}"]`);
    if (!list || !el) return;

    const rect = el.getBoundingClientRect();
    const ph   = document.createElement('div');
    ph.className = 'rb-placeholder';
    ph.style.height = rect.height + 'px';

    _drag = { id, el, ph, list, grabDY: e.clientY - rect.top };
    el.parentNode.insertBefore(ph, el);
    el.classList.add('rb-dragging');
    el.style.position = 'fixed';
    el.style.width = rect.width + 'px';
    el.style.left  = rect.left + 'px';
    el.style.top   = rect.top + 'px';
    el.style.margin = '0';
    el.style.pointerEvents = 'none';

    _drag.move = (ev) => this.dragMove(ev);
    _drag.up   = ()   => this.dragEnd();
    window.addEventListener('pointermove', _drag.move, { passive: false });
    window.addEventListener('pointerup', _drag.up);
    window.addEventListener('pointercancel', _drag.up);
  },

  dragMove(e) {
    if (!_drag) return;
    e.preventDefault();
    const y = e.clientY;
    _drag.el.style.top = (y - _drag.grabDY) + 'px';

    const cards = [..._drag.list.querySelectorAll('.rb-card[data-gid]')].filter(c => c !== _drag.el);
    let placed = false;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        if (_drag.ph.nextSibling !== c) _drag.list.insertBefore(_drag.ph, c);
        placed = true;
        break;
      }
    }
    if (!placed) _drag.list.appendChild(_drag.ph);
  },

  dragEnd() {
    if (!_drag) return;
    const { el, ph, list, move, up } = _drag;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);

    el.classList.remove('rb-dragging');
    el.style.position = el.style.width = el.style.left = el.style.top = el.style.margin = el.style.pointerEvents = '';
    list.insertBefore(el, ph);
    ph.remove();

    const order = [...list.querySelectorAll('.rb-card[data-gid]')].map(c => c.dataset.gid);
    _drag = null;

    const byId = {}; _groups.forEach(g => { byId[g.id] = g; });
    const reordered = order.map(id => byId[id]).filter(Boolean);
    if (reordered.length === _groups.length) _groups = reordered;

    this.persistGroupOrder();
  },

  async persistGroupOrder() {
    await Promise.all(_groups.map((g, i) => {
      if (g.sortOrder === i) return null;
      g.sortOrder = i;
      return fetch(`${API}/api/recipe-book/groups/${g.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ sortOrder: i }),
      }).catch(() => {});
    }));
  },

  openRecipe(id) {
    _selRecipe = (_selGroup?.recipes || []).find(r => r.id === id) || null;
    if (!_selRecipe) return;
    _screen = 'recipe'; fullRender();
  },

  setCat(k)       { if (!allowedCats().includes(k)) return; _cat = k; fullRender(); },
  onGroupCat(k)   { if (!allowedCats().includes(k)) return; _editGroupCat = k; fullRender(); },

  addGroup() {
    _editGroupId = null; _editGroupName = ''; _editGroupCat = _cat; _error = '';   // нова група в активній вкладці
    _screen = 'edit-group'; fullRender();
    setTimeout(() => document.getElementById('rb-g-name')?.focus(), 100);
  },

  editGroup(id) {
    const g = _groups.find(x => x.id === id);
    if (!g) return;
    _editGroupId = g.id; _editGroupName = g.name; _editGroupCat = g.category || 'bar'; _error = '';
    _screen = 'edit-group'; fullRender();
    setTimeout(() => document.getElementById('rb-g-name')?.focus(), 100);
  },

  deleteGroup(id) {
    _selGroup = _groups.find(g => g.id === id) || null;
    _delConfirm = 'group'; fullRender();
  },

  addRecipe() {
    _editRecipeId = null; _editName = ''; _editIngredients = []; _editSteps = ''; _editMethod = ''; _editGarnish = ''; _editPhotoUrl = ''; _error = '';
    _screen = 'edit-recipe'; fullRender();
    setTimeout(() => document.getElementById('rb-r-name')?.focus(), 100);
  },

  editRecipe(id) {
    const r = (_selGroup?.recipes || []).find(x => x.id === id);
    if (!r) return;
    _editRecipeId = r.id; _editName = r.name;
    _editIngredients = (r.ingredients || []).map(i => ({ ...i }));
    _editSteps    = r.steps    || '';
    _editMethod   = r.method   || '';
    _editGarnish  = r.garnish  || '';
    _editPhotoUrl = r.photoUrl || '';
    _error = '';
    _screen = 'edit-recipe'; fullRender();
    setTimeout(() => document.getElementById('rb-r-name')?.focus(), 100);
  },

  deleteRecipe(id) {
    _selRecipe = (_selGroup?.recipes || []).find(r => r.id === id) || null;
    _delConfirm = 'recipe'; fullRender();
  },

  cancelDel() { _delConfirm = null; fullRender(); },

  async confirmDel() {
    if (_delConfirm === 'group' && _selGroup) {
      const gid = _selGroup.id;
      _delConfirm = null;
      try {
        await fetch(`${API}/api/recipe-book/groups/${gid}`, { method: 'DELETE', headers: authHeaders() });
        _selGroup = null; _screen = 'groups';
        await loadGroups();
      } catch { _error = 'Помилка видалення'; fullRender(); }
    } else if (_delConfirm === 'recipe' && _selRecipe && _selGroup) {
      const rid = _selRecipe.id;
      const gid = _selGroup.id;
      _delConfirm = null;
      _expanded.delete(rid);
      try {
        await fetch(`${API}/api/recipe-book/recipes/${rid}`, { method: 'DELETE', headers: authHeaders() });
        _selRecipe = null; _screen = 'recipes';
        await loadGroups();
        _selGroup = _groups.find(g => g.id === gid) || null;
        fullRender();
      } catch { _error = 'Помилка видалення'; fullRender(); }
    }
  },

  async handlePhoto(input) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      _editPhotoUrl = await compressToBase64(file);
      fullRender();
    } catch (e) {
      console.error('[recipe photo]', e);
    }
  },

  removePhoto() { _editPhotoUrl = ''; fullRender(); },

  cropPhoto() { if (_editPhotoUrl) openCropOverlay(_editPhotoUrl, (url) => { _editPhotoUrl = url; fullRender(); }); },

  onGroupName(v)  { _editGroupName = v; },
  onRecipeName(v) { _editName = v; },
  onSteps(v)      { _editSteps = v; },
  onMethod(v)     { _editMethod = v; },
  onGarnish(v)    { _editGarnish = v; },

  onIngr(idx, field, v) {
    if (!_editIngredients[idx]) return;
    _editIngredients[idx][field] = field === 'qty' ? parseFloat(v) || 0 : v;
  },

  addIngr() {
    _editIngredients.push({ name: '', qty: '', unit: 'мл' });
    fullRender();
    setTimeout(() => {
      const rows = document.querySelectorAll('.rb-ingr-edit-row');
      rows[rows.length - 1]?.querySelector('input')?.focus();
    }, 50);
  },

  removeIngr(idx) {
    _editIngredients.splice(idx, 1);
    fullRender();
  },

  async saveGroup() {
    const name = _editGroupName.trim();
    if (!name) { _error = 'Введіть назву групи'; fullRender(); return; }
    _saving = true; _error = ''; fullRender();
    try {
      const isNew = !_editGroupId;
      const url = isNew ? `${API}/api/recipe-book/groups` : `${API}/api/recipe-book/groups/${_editGroupId}`;
      const res  = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify({ venueId: _venueId, name, category: _editGroupCat }) });
      const data = await res.json();
      if (data.success) { _screen = 'groups'; await loadGroups(); }
      else { _error = data.error || 'Помилка збереження'; }
    } catch { _error = 'Немає зʼєднання'; }
    _saving = false; fullRender();
  },

  async saveRecipe() {
    const name = _editName.trim();
    if (!name) { _error = 'Введіть назву рецепту'; fullRender(); return; }
    if (!_selGroup) return;
    const gid = _selGroup.id;
    _saving = true; _error = ''; fullRender();
    try {
      const isNew = !_editRecipeId;
      const url = isNew ? `${API}/api/recipe-book/recipes` : `${API}/api/recipe-book/recipes/${_editRecipeId}`;
      const body = { groupId: gid, venueId: _venueId, name, ingredients: _editIngredients.filter(i => String(i.name).trim()), steps: _editSteps, method: _editMethod, garnish: _editGarnish, photoUrl: _editPhotoUrl };
      const res  = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        _screen = 'recipes';
        await loadGroups();
        _selGroup = _groups.find(g => g.id === gid) || null;
        fullRender();
      } else { _error = data.error || 'Помилка збереження'; }
    } catch { _error = 'Немає зʼєднання'; }
    _saving = false; fullRender();
  },
};

/* ── Page API ────────────────────────────────────── */
export function render() {
  _venueId = state.venueId || localStorage.getItem('barops_venueId');
  _role    = state.role || localStorage.getItem('barops_role') || 'bartender';
  _screen  = 'groups';
  _groups  = [];
  _loading = true;
  _error   = '';
  _selGroup    = null;
  _selRecipe   = null;
  _delConfirm  = null;
  _editPhotoUrl = '';
  // Активна вкладка за роллю: «Бар» якщо доступна, інакше перша дозволена (кухар/шеф → «Кухня»)
  const _allowed = allowedCats();
  _cat = _allowed.includes('bar') ? 'bar' : _allowed[0];
  _editGroupCat = _cat;
  _expanded = new Set();

  if (!document.getElementById('rb-css')) {
    const s = document.createElement('style');
    s.id = 'rb-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  return `<div id="rb-root" style="display:flex;flex-direction:column;flex:1;height:100%">
    <div class="rb-loading-wrap">Завантаження…</div>
  </div>`;
}

export function init() {
  loadGroups();
}

export default { render, init };
