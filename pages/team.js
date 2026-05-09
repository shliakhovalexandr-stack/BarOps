/* ============================================================
   BarOps — pages/team.js
   Команда: менеджер додає барменів у свій заклад
   Реальний API: GET/POST/PUT/DELETE /api/auth/team
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   STATE
════════════════════════ */
let _team       = [];     // реальні дані з бекенду
let _loading    = true;
let _openId     = null;   // відкритий профіль
let _sheetMode  = null;   // null | 'add' | 'edit'
let _editTarget = null;   // user obj для edit
let _addPin     = '';
let _addPinConfirm = '';
let _pinStep    = 'first'; // 'first' | 'confirm'

function token() { return localStorage.getItem('barops_token') || ''; }

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="tm-css">
.tm-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.tm-scroll{overflow-y:auto;flex:1}.tm-scroll::-webkit-scrollbar{width:0}

/* topbar */
.tm-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.tm-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.tm-back:active{background:var(--bg3)}
.tm-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.tm-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* sec */
.tm-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b)}

/* summary */
.tm-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 14px 10px}
.tm-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center}
.tm-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.tm-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* cards */
.tm-list{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.tm-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .15s}
.tm-card:active{background:var(--bg3)}
.tm-card.inactive{opacity:.5}
.tm-card-main{display:flex;align-items:center;gap:12px;padding:14px}
.tm-avatar{width:46px;height:46px;border-radius:50%;background:var(--bg3);border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.tm-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);letter-spacing:-.01em}
.tm-role-badge{display:inline-flex;align-items:center;gap:4px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:20px;padding:2px 8px;font-size:10px;color:var(--green);font-family:var(--font-b);margin-top:4px}
.tm-role-badge.mgr{background:rgba(127,119,221,.1);border-color:rgba(127,119,221,.3);color:#7F77DD}
.tm-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

/* add button */
.tm-add-btn{display:flex;align-items:center;gap:12px;padding:14px;margin:0 14px;background:var(--green-bg);border:0.5px dashed var(--green-border);border-radius:14px;cursor:pointer;transition:all .15s}
.tm-add-btn:active{background:rgba(29,158,117,.12)}
.tm-add-icon{width:38px;height:38px;border-radius:11px;background:rgba(29,158,117,.12);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tm-add-text{font-size:14px;color:var(--green);font-family:var(--font-b);font-weight:500}
.tm-add-sub{font-size:11px;color:rgba(29,158,117,.5);font-family:var(--font-b);margin-top:1px}

/* ── PROFILE OVERLAY ── */
.tm-profile{position:absolute;inset:0;z-index:50;background:var(--bg1);display:none;flex-direction:column;animation:tmSlide .3s cubic-bezier(.22,1,.36,1)}
.tm-profile.open{display:flex}
@keyframes tmSlide{from{transform:translateX(100%);opacity:.5}to{transform:none;opacity:1}}
.tm-ph-hero{padding:16px 18px;background:linear-gradient(160deg,var(--green-bg) 0%,transparent 60%);border-bottom:0.5px solid var(--border2);flex-shrink:0}
.tm-ph-back{display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer}
.tm-ph-back-arrow{width:32px;height:32px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center}
.tm-ph-back-lbl{font-size:13px;color:var(--text2);font-family:var(--font-b)}
.tm-ph-scroll{overflow-y:auto;flex:1}.tm-ph-scroll::-webkit-scrollbar{width:0}
.tm-ph-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:13px 18px 8px;font-family:var(--font-b)}
.tm-ph-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.tm-ph-row{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-bottom:0.5px solid var(--border)}
.tm-ph-row:last-child{border-bottom:none}
.tm-ph-row-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.tm-ph-row-val{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.tm-ph-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.tm-btn{width:100%;height:50px;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.tm-btn-green{background:var(--green);color:#fff}.tm-btn-green:active{background:var(--green-d)}
.tm-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1)}.tm-btn-ghost:active{background:var(--bg3)}
.tm-btn-red{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}.tm-btn-red:active{background:rgba(226,75,74,.15)}
.tm-btn:disabled{opacity:.5;cursor:not-allowed}

/* ── SHEET (add / edit) ── */
.tm-sheet-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.tm-sheet-overlay.open{display:flex;animation:tmOvFade .2s ease}
@keyframes tmOvFade{from{opacity:0}to{opacity:1}}
.tm-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);padding:0 18px 32px;animation:tmSheetUp .3s cubic-bezier(.22,1,.36,1);max-height:90vh;overflow-y:auto}
@keyframes tmSheetUp{from{transform:translateY(100%)}to{transform:none}}
.tm-sh-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 18px}
.tm-sh-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:4px;letter-spacing:-.02em}
.tm-sh-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:20px;line-height:1.5}
.tm-sh-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.tm-sh-inp{width:100%;height:48px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s;margin-bottom:12px}
.tm-sh-inp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.tm-sh-inp::placeholder{color:var(--text2)}
.tm-sh-roles{display:flex;gap:6px;margin-bottom:16px}
.tm-sh-role{flex:1;height:40px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s;display:flex;align-items:center;justify-content:center}
.tm-sh-role.sel{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}

/* PIN dots in sheet */
.tm-pin-row{display:flex;gap:10px;justify-content:center;margin:12px 0}
.tm-pin-dot{width:16px;height:16px;border-radius:50%;background:var(--bg3);border:1.5px solid var(--border2);transition:all .2s}
.tm-pin-dot.filled{background:var(--green);border-color:var(--green)}
.tm-pin-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.tm-pin-key{height:52px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;font-family:var(--font-h);font-size:20px;font-weight:600;color:var(--text0);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;user-select:none}
.tm-pin-key:active{background:var(--bg4);transform:scale(.95)}
.tm-pin-key.del{font-size:14px;color:var(--text2)}

.tm-sh-send{width:100%;height:52px;background:var(--green);border:none;border-radius:12px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}
.tm-sh-send:active{background:var(--green-d)}
.tm-sh-send:disabled{opacity:.5;cursor:not-allowed}
.tm-sh-cancel{width:100%;height:40px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
.tm-sh-err{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);font-family:var(--font-b);display:none;margin-bottom:12px}
.tm-sh-err.show{display:block}

/* Loading */
.tm-loading{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}
.tm-spinner{width:24px;height:24px;border-radius:50%;border:2.5px solid var(--bg3);border-top-color:var(--green);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function roleLabel(role) {
  return role === 'manager' || role === 'MANAGER' ? 'Менеджер' : 'Бармен';
}
function roleClass(role) {
  return role === 'manager' || role === 'MANAGER' ? 'mgr' : '';
}
function avatarEmoji(name) {
  const emojis = ['🧑','👩','🧔','👨','👱','🧕'];
  return emojis[(name || '').charCodeAt(0) % emojis.length];
}
function lastLoginStr(d) {
  if (!d) return 'Ніколи';
  const dt = new Date(d);
  return dt.toLocaleString('uk-UA', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ════════════════════════
   LIST HTML
════════════════════════ */
function teamListHTML() {
  const active   = _team.filter(t => t.status === 'active').length;
  const inactive = _team.filter(t => t.status === 'inactive').length;

  return `
  <div class="tm-summary">
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:var(--green)">${_team.length}</div>
      <div class="tm-stat-lbl">Всього<br/>у закладі</div>
    </div>
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:var(--green)">${active}</div>
      <div class="tm-stat-lbl">Активних<br/>акаунтів</div>
    </div>
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:${inactive > 0 ? 'var(--amber)' : 'var(--text0)'}">${inactive}</div>
      <div class="tm-stat-lbl">Деактиво-<br/>ваних</div>
    </div>
  </div>

  <div class="tm-list">
    ${_team.map(t => `
    <div class="tm-card ${t.status === 'inactive' ? 'inactive' : ''}"
         onclick="window.__tm.openProfile('${t.id}')">
      <div class="tm-card-main">
        <div class="tm-avatar">${avatarEmoji(t.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="tm-name">${t.name}</div>
          <div class="tm-role-badge ${roleClass(t.role)}">${roleLabel(t.role)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:5px;justify-content:flex-end">
            <div class="tm-status-dot" style="background:${t.status === 'active' ? 'var(--green)' : 'var(--text2)'}"></div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${t.status === 'active' ? 'Активний' : 'Деактивовано'}</div>
          </div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px">${t.phone}</div>
        </div>
      </div>
    </div>`).join('')}

    <div class="tm-add-btn" onclick="window.__tm.openAdd()">
      <div class="tm-add-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="tm-add-text">Додати бармена</div>
        <div class="tm-add-sub">Ім'я, телефон та PIN для входу</div>
      </div>
    </div>
  </div>
  <div style="height:16px"></div>`;
}

/* ════════════════════════
   PROFILE HTML
════════════════════════ */
function profileHTML(t) {
  if (!t) return '';
  return `
  <div class="tm-ph-scroll">
    <div class="tm-ph-hero">
      <div class="tm-ph-back" onclick="window.__tm.closeProfile()">
        <div class="tm-ph-back-arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="tm-ph-back-lbl">Назад до команди</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:60px;height:60px;border-radius:50%;background:var(--bg2);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:26px">${avatarEmoji(t.name)}</div>
        <div>
          <div style="font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0)">${t.name}</div>
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">${roleLabel(t.role)} · ${t.venue?.name || state.venue}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:4px">
            <div style="width:6px;height:6px;border-radius:50%;background:${t.status==='active'?'var(--green)':'var(--text2)'}"></div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${t.status==='active'?'Активний':'Деактивовано'}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="tm-ph-sec">Дані акаунту</div>
    <div class="tm-ph-card">
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">📞 Телефон</div>
        <div class="tm-ph-row-val">${t.phone}</div>
      </div>
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">🔐 PIN</div>
        <div class="tm-ph-row-val" style="color:var(--text2)">● ● ● ●</div>
      </div>
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">📅 Останній вхід</div>
        <div class="tm-ph-row-val" style="font-size:11px">${lastLoginStr(t.lastLogin)}</div>
      </div>
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">📋 Доданий</div>
        <div class="tm-ph-row-val" style="font-size:11px">${lastLoginStr(t.createdAt)}</div>
      </div>
    </div>
    <div style="height:8px"></div>
  </div>

  <div class="tm-ph-actions">
    <button class="tm-btn tm-btn-green" onclick="window.__tm.openEdit('${t.id}')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2l3 3-7 7H2V9l7-7z" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Редагувати / Змінити PIN
    </button>
    ${t.status === 'active'
      ? `<button class="tm-btn tm-btn-red" onclick="window.__tm.deactivate('${t.id}')">Деактивувати акаунт</button>`
      : `<button class="tm-btn tm-btn-ghost" onclick="window.__tm.activate('${t.id}')">Відновити акаунт</button>`}
  </div>`;
}

/* ════════════════════════
   PIN KEYPAD HTML
════════════════════════ */
function pinKeypadHTML(prefix, currentPin, label) {
  const dots = [1,2,3,4].map(i =>
    `<div class="tm-pin-dot ${currentPin.length >= i ? 'filled' : ''}" id="${prefix}-dot-${i}"></div>`
  ).join('');
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => {
    if (k === '') return `<div></div>`;
    if (k === '⌫') return `<div class="tm-pin-key del" onclick="window.__tm.pinDel('${prefix}')">⌫</div>`;
    return `<div class="tm-pin-key" onclick="window.__tm.pinAdd('${prefix}','${k}')">${k}</div>`;
  }).join('');
  return `
    <div class="tm-sh-lbl">${label}</div>
    <div class="tm-pin-row">${dots}</div>
    <div class="tm-pin-keypad">${keys}</div>`;
}

/* ════════════════════════
   ADD SHEET HTML
════════════════════════ */
function addSheetHTML() {
  const pinLabel = _pinStep === 'first'
    ? 'Встановіть PIN (4 цифри)'
    : `Підтвердіть PIN (введіть ще раз)`;
  const currentPin = _pinStep === 'first' ? _addPin : _addPinConfirm;

  return `
  <div class="tm-sheet-overlay ${_sheetMode === 'add' ? 'open' : ''}" id="tm-sheet-overlay"
       onclick="window.__tm.closeSheetOverlay(event)">
    <div class="tm-sheet" onclick="event.stopPropagation()">
      <div class="tm-sh-handle"></div>
      <div class="tm-sh-title">Додати бармена</div>
      <div class="tm-sh-sub">Бармен входить в систему з телефоном та PIN-кодом</div>

      <div class="tm-sh-lbl">Ім'я та прізвище</div>
      <input class="tm-sh-inp" id="add-name" type="text" placeholder="Олексій Коваленко"/>

      <div class="tm-sh-lbl" style="display:flex;align-items:center;justify-content:space-between">
        <span>Номер телефону</span>
        <span onclick="window.__tm.pastePhone()" style="font-size:10px;color:var(--green);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;gap:4px">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="8" height="8" rx="1.5" stroke="var(--green)" stroke-width="1.2"/><path d="M3 3V2a1 1 0 011-1h5a1 1 0 011 1v6a1 1 0 01-1 1H8" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round"/></svg>
          Вставити
        </span>
      </div>
      <div style="position:relative">
        <input class="tm-sh-inp" id="add-phone" type="tel" placeholder="+380 67 XXX XX XX"
          style="padding-right:48px"
          oninput="window.__tm.formatAddPhone(this)"
          onpaste="setTimeout(()=>window.__tm.formatAddPhone(document.getElementById('add-phone')),10)"/>
      </div>

      <div class="tm-sh-lbl">Роль</div>
      <div class="tm-sh-roles">
        <div class="tm-sh-role sel" id="role-bartender" onclick="window.__tm.selectRole('bartender')">🍸 Бармен</div>
        <div class="tm-sh-role" id="role-manager" onclick="window.__tm.selectRole('manager')">👨‍💼 Менеджер</div>
      </div>

      ${pinKeypadHTML('add', currentPin, pinLabel)}

      <div class="tm-sh-err" id="add-err"></div>
      <button class="tm-sh-send" id="add-send-btn" onclick="window.__tm.submitAdd()">
        ✓ Додати в команду
      </button>
      <button class="tm-sh-cancel" onclick="window.__tm.closeSheet()">Скасувати</button>
    </div>
  </div>`;
}

/* ════════════════════════
   EDIT SHEET HTML
════════════════════════ */
function editSheetHTML() {
  const t = _editTarget;
  if (!t) return '';
  const currentPin = _addPin;

  return `
  <div class="tm-sheet-overlay ${_sheetMode === 'edit' ? 'open' : ''}" id="tm-sheet-overlay"
       onclick="window.__tm.closeSheetOverlay(event)">
    <div class="tm-sheet" onclick="event.stopPropagation()">
      <div class="tm-sh-handle"></div>
      <div class="tm-sh-title">Редагувати бармена</div>
      <div class="tm-sh-sub">${t.name} · ${t.phone}</div>

      <div class="tm-sh-lbl">Ім'я (залиште для зміни)</div>
      <input class="tm-sh-inp" id="edit-name" type="text" placeholder="${t.name}" value="${t.name}"/>

      <div class="tm-sh-lbl">Новий PIN (залиште порожнім щоб не змінювати)</div>
      ${pinKeypadHTML('add', currentPin, _pinStep === 'confirm' ? 'Підтвердіть новий PIN' : 'Новий PIN (4 цифри)')}

      <div class="tm-sh-err" id="edit-err"></div>
      <button class="tm-sh-send" id="edit-send-btn" onclick="window.__tm.submitEdit()">
        Зберегти зміни
      </button>
      <button class="tm-sh-cancel" onclick="window.__tm.closeSheet()">Скасувати</button>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const openMember = _openId ? _team.find(t => t.id === _openId) : null;

  return `
${CSS}
<div class="tm-wrap">
  <!-- Topbar -->
  <div class="tm-topbar">
    <div class="tm-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="tm-title">Команда</div>
      <div class="tm-sub">${state.venue} · ${_team.length} учасників</div>
    </div>
    <button onclick="window.__tm.openAdd()"
      style="height:34px;padding:0 14px;background:var(--green);border:none;border-radius:20px;font-size:12px;font-family:var(--font-b);color:#fff;cursor:pointer;font-weight:500;display:flex;align-items:center;gap:5px">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Додати
    </button>
  </div>

  <!-- List -->
  <div class="tm-scroll">
    ${_loading
      ? `<div class="tm-loading"><div class="tm-spinner"></div><div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Завантаження команди...</div></div>`
      : _team.length === 0
        ? `<div class="tm-loading" style="flex-direction:column;gap:16px;padding:32px">
             <div style="font-size:40px">👥</div>
             <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);text-align:center">Команда порожня</div>
             <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);text-align:center;line-height:1.6">Додайте першого бармена
натиснувши кнопку вище</div>
             <div class="tm-add-btn" onclick="window.__tm.openAdd()" style="margin:0;width:100%">
               <div class="tm-add-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round"/></svg></div>
               <div><div class="tm-add-text">Додати першого бармена</div><div class="tm-add-sub">Ім'я, телефон та PIN для входу</div></div>
             </div>
           </div>`
        : teamListHTML()}
  </div>

  <!-- Profile overlay -->
  <div class="tm-profile ${_openId ? 'open' : ''}" id="tm-profile">
    ${openMember ? profileHTML(openMember) : ''}
  </div>

  <!-- Sheet -->
  ${_sheetMode === 'add' ? addSheetHTML() : ''}
  ${_sheetMode === 'edit' ? editSheetHTML() : ''}
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function openProfile(id)  { _openId = id; fullRender(); }
function closeProfile()   { _openId = null; fullRender(); }

function openAdd() {
  _sheetMode = 'add';
  _addPin = '';
  _addPinConfirm = '';
  _pinStep = 'first';
  _editTarget = null;
  fullRender();
}

function openEdit(id) {
  const t = _team.find(m => m.id === id);
  if (!t) return;
  _sheetMode = 'edit';
  _editTarget = t;
  _addPin = '';
  _addPinConfirm = '';
  _pinStep = 'first';
  fullRender();
}

function closeSheet() { _sheetMode = null; _editTarget = null; fullRender(); }
function closeSheetOverlay(e) {
  if (e.target === document.getElementById('tm-sheet-overlay')) closeSheet();
}

let _selectedRole = 'BARTENDER';
function selectRole(r) {
  _selectedRole = r.toUpperCase();
  document.querySelectorAll('.tm-sh-role').forEach(el => el.classList.remove('sel'));
  document.getElementById('role-' + r)?.classList.add('sel');
}

/* PIN */
function pinAdd(prefix, digit) {
  const isConfirm = _pinStep === 'confirm';
  if (!isConfirm && _addPin.length >= 4) return;
  if (isConfirm && _addPinConfirm.length >= 4) return;

  if (!isConfirm) _addPin += digit;
  else            _addPinConfirm += digit;

  updatePinDots(prefix);

  // Автоперехід до підтвердження
  if (_sheetMode === 'add' && !isConfirm && _addPin.length === 4) {
    setTimeout(() => {
      _pinStep = 'confirm';
      fullRender();
    }, 200);
  }
}

function pinDel(prefix) {
  const isConfirm = _pinStep === 'confirm';
  if (!isConfirm) _addPin = _addPin.slice(0, -1);
  else            _addPinConfirm = _addPinConfirm.slice(0, -1);
  updatePinDots(prefix);
}

function updatePinDots(prefix) {
  const pin = _pinStep === 'confirm' ? _addPinConfirm : _addPin;
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`${prefix}-dot-${i}`)?.classList.toggle('filled', pin.length >= i);
  }
}

/* ════════════════════════
   PHONE FORMAT IN SHEET
════════════════════════ */
function formatAddPhone(inp) {
  let digits = inp.value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('38')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  let fmt = '+380';
  if (digits.length > 0) fmt += ' ' + digits.slice(0, 2);
  if (digits.length > 2) fmt += ' ' + digits.slice(2, 5);
  if (digits.length > 5) fmt += ' ' + digits.slice(5, 7);
  if (digits.length > 7) fmt += ' ' + digits.slice(7, 9);
  inp.value = fmt.trim();
}

async function pastePhone() {
  try {
    const text = await navigator.clipboard.readText();
    const inp  = document.getElementById('add-phone');
    if (inp) {
      inp.value = text;
      formatAddPhone(inp);
    }
  } catch {
    // Якщо clipboard недоступний — фокусуємо поле
    document.getElementById('add-phone')?.focus();
  }
}

/* ════════════════════════
   SUBMIT ADD
════════════════════════ */
async function submitAdd() {
  const name  = document.getElementById('add-name')?.value.trim();
  const phone = document.getElementById('add-phone')?.value.replace(/\s/g,'');
  const errEl = document.getElementById('add-err');
  const btn   = document.getElementById('add-send-btn');

  if (!name || !phone || phone.replace(/\D/g,'').length < 11) {
    if (errEl) { errEl.textContent = 'Вкажіть ім\'я і коректний телефон'; errEl.classList.add('show'); }
    return;
  }
  if (_addPin.length < 4) {
    if (errEl) { errEl.textContent = 'Введіть PIN (4 цифри)'; errEl.classList.add('show'); }
    return;
  }
  if (_pinStep === 'first') {
    _pinStep = 'confirm';
    fullRender();
    return;
  }
  if (_addPin !== _addPinConfirm) {
    if (errEl) { errEl.textContent = 'PIN-коди не збігаються. Спробуйте ще раз'; errEl.classList.add('show'); }
    _addPinConfirm = '';
    _pinStep = 'first';
    fullRender();
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API}/api/auth/add-bartender`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ name, phone, pin: _addPin, role: _selectedRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка');

    _team.push(data.user);
    _sheetMode = null;
    fullRender();
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.classList.add('show'); }
    if (btn) btn.disabled = false;
  }
}

/* ════════════════════════
   SUBMIT EDIT
════════════════════════ */
async function submitEdit() {
  const t     = _editTarget;
  const name  = document.getElementById('edit-name')?.value.trim();
  const errEl = document.getElementById('edit-err');
  const btn   = document.getElementById('edit-send-btn');
  const body  = {};

  if (name && name !== t.name) body.name = name;
  if (_addPin.length === 4) {
    if (_pinStep === 'first') {
      _pinStep = 'confirm';
      fullRender();
      return;
    }
    if (_addPin !== _addPinConfirm) {
      if (errEl) { errEl.textContent = 'PIN-коди не збігаються'; errEl.classList.add('show'); }
      _addPinConfirm = '';
      _pinStep = 'first';
      fullRender();
      return;
    }
    body.pin = _addPin;
  }

  if (Object.keys(body).length === 0) {
    closeSheet();
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API}/api/auth/team/${t.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка');

    const idx = _team.findIndex(m => m.id === t.id);
    if (idx !== -1) _team[idx] = { ..._team[idx], ...data.user };
    _sheetMode = null;
    _editTarget = null;
    fullRender();
  } catch (err) {
    if (errEl) { errEl.textContent = err.message; errEl.classList.add('show'); }
    if (btn) btn.disabled = false;
  }
}

/* ════════════════════════
   DEACTIVATE / ACTIVATE
════════════════════════ */
async function deactivate(id) {
  if (!confirm('Деактивувати цей акаунт? Бармен не зможе увійти.')) return;
  try {
    await fetch(`${API}/api/auth/team/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    const idx = _team.findIndex(m => m.id === id);
    if (idx !== -1) _team[idx].status = 'inactive';
    _openId = null;
    fullRender();
  } catch (err) { alert('Помилка: ' + err.message); }
}

async function activate(id) {
  try {
    await fetch(`${API}/api/auth/team/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ status: 'active' }),
    });
    const idx = _team.findIndex(m => m.id === id);
    if (idx !== -1) _team[idx].status = 'active';
    _openId = null;
    fullRender();
  } catch (err) { alert('Помилка: ' + err.message); }
}

/* ════════════════════════
   LOAD TEAM FROM API
════════════════════════ */
async function loadTeam() {
  _loading = true;
  fullRender();
  try {
    const res  = await fetch(`${API}/api/auth/team`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.team) _team = data.team;
  } catch {
    // Показуємо демо-дані якщо API недоступне
    // Команда порожня — менеджер ще не додав барменів
    _team = [];
  }
  _loading = false;
  fullRender();
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _openId    = null;
    _sheetMode = null;
    _loading   = true;
    return buildHTML();
  },
  init() {
    window.__tm = {
      openProfile, closeProfile,
      openAdd, openEdit, closeSheet, closeSheetOverlay,
      selectRole, pinAdd, pinDel,
      submitAdd, submitEdit,
      deactivate, activate,
      formatAddPhone, pastePhone,
    };
    loadTeam();
  },
};
