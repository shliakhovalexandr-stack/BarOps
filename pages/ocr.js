/* ============================================================
   BarOps — pages/ocr.js
   Фото накладної → Telegram
   OCR буде додано пізніше після оновлення назв товарів у Syrve
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _state    = 'idle'; // 'idle' | 'sending' | 'done' | 'error'
let _errorMsg = '';
let _ocrTgChatId  = '';
let _ocrTgTopicId = '';
let _ocrTgSaving  = false;
let _ocrTgSaved   = false;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="ocr-css">
.ocr-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.ocr-scroll{overflow-y:auto;flex:1}.ocr-scroll::-webkit-scrollbar{width:0}

/* topbar */
.ocr-topbar{display:flex;align-items:center;gap:12px;padding:12px 20px 10px;flex-shrink:0}
.ocr-back{
  width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);
  display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
}
.ocr-back:active{background:rgba(255,255,255,.08)}
.ocr-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.ocr-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* camera area */
.ocr-cam{
  margin:0 20px 16px;border-radius:18px;overflow:hidden;background:var(--bg2);
  border:0.5px solid var(--border);aspect-ratio:3/4;position:relative;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.ocr-cam-center{text-align:center;position:relative;z-index:1;padding:0 20px}
.ocr-cam-icon{width:64px;height:64px;border-radius:18px;background:var(--green-bg);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.ocr-cam-label{font-size:15px;font-weight:500;color:var(--text0);margin-bottom:4px}
.ocr-cam-sub{font-size:12px;color:var(--text2);line-height:1.4}
.ocr-corner{position:absolute;width:32px;height:32px;overflow:hidden}
.ocr-tl{top:14px;left:14px}
.ocr-tr{top:14px;right:14px}
.ocr-bl{bottom:14px;left:14px}
.ocr-br{bottom:14px;right:14px}
.ocr-scan-line{
  position:absolute;left:14px;right:14px;height:1px;
  background:var(--green);opacity:.7;
  box-shadow:0 0 12px var(--green);
  animation:ocrScan 2.2s ease-in-out infinite;
}
@keyframes ocrScan{0%,100%{top:16%}50%{top:76%}}

/* buttons */
.ocr-cam-btns{padding:0 20px 14px;display:flex;gap:10px}
.ocr-btn-icon{
  width:56px;height:56px;background:var(--bg2);border:0.5px solid var(--border2);
  border-radius:14px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;flex-shrink:0;transition:background .15s;
}
.ocr-btn-icon:active{background:rgba(255,255,255,.08)}
.ocr-btn-shoot{
  flex:1;height:56px;background:var(--green);border:none;border-radius:14px;
  font-size:15px;font-weight:600;color:#000;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;
}
.ocr-btn-shoot:active{opacity:.85;transform:scale(.97)}

/* tips */
.ocr-tips{display:flex;gap:6px;padding:4px 20px 12px}
.ocr-tip{
  background:var(--bg1);border:0.5px solid var(--border);border-radius:9px;
  padding:8px;flex:1;text-align:center;font-size:10px;color:var(--text2);
  line-height:1.4;display:flex;flex-direction:column;align-items:center;gap:4px;
}

/* sending spinner */
.ocr-proc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.ocr-ring{
  width:68px;height:68px;border-radius:50%;
  border:3px solid var(--bg3);border-top-color:var(--green);
  animation:ocrSpin .9s linear infinite;margin-bottom:18px;
}
@keyframes ocrSpin{to{transform:rotate(360deg)}}
.ocr-proc-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:5px;text-align:center}
.ocr-proc-sub{font-size:12px;color:var(--text2);text-align:center;font-family:var(--font-b);line-height:1.5}

/* success */
.ocr-success{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;text-align:center}
.ocr-succ-icon{
  width:72px;height:72px;border-radius:50%;background:var(--green-bg);
  border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;
  margin-bottom:20px;animation:ocrPop .4s cubic-bezier(.22,1,.36,1);
}
@keyframes ocrPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.ocr-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.ocr-succ-sub{font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.55}

/* error */
.ocr-error{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px;text-align:center}
.ocr-err-icon{
  width:72px;height:72px;border-radius:50%;background:var(--red-bg);
  border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;
  margin-bottom:20px;
}
.ocr-err-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.ocr-err-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.55;max-width:280px}

/* action buttons */
.ocr-btn-confirm{
  width:100%;height:52px;background:var(--green);border:none;border-radius:14px;
  font-size:15px;font-weight:600;color:#000;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;
}
.ocr-btn-confirm:active{opacity:.85}
.ocr-btn-secondary{
  width:100%;height:44px;background:var(--bg2);border:0.5px solid var(--border);
  border-radius:13px;font-size:13px;color:var(--text1);cursor:pointer;font-family:var(--font-b);
  display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;
}

/* tg settings panel */
.ocr-tg-panel{margin:0 20px 14px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.ocr-tg-head{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:0.5px solid var(--border)}
.ocr-tg-head-lbl{font-size:12px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.ocr-tg-head-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.ocr-tg-body{padding:12px 14px;display:flex;flex-direction:column;gap:9px;display:none}
.ocr-tg-grp{display:flex;flex-direction:column;gap:4px}
.ocr-tg-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.07em;text-transform:uppercase}
.ocr-tg-inp{height:40px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:0 12px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .18s;width:100%}
.ocr-tg-inp:focus{border-color:var(--green)}
.ocr-tg-hint{font-size:10px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.ocr-tg-save-row{display:flex;justify-content:flex-end}
.ocr-tg-save{height:36px;padding:0 16px;background:var(--green);border:none;border-radius:9px;font-size:12px;font-weight:600;color:#000;cursor:pointer;font-family:var(--font-b);transition:all .15s}
.ocr-tg-save.saved{background:var(--bg3);color:var(--green);border:0.5px solid var(--green)}
.ocr-tg-save:active{opacity:.8}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function ocrTgPanel() {
  const role = (localStorage.getItem('barops_role') || '').toLowerCase();
  if (role !== 'admin' && role !== 'manager') return '';
  return `
  <div class="ocr-tg-panel" id="ocr-tg-panel">
    <div class="ocr-tg-head" onclick="(function(){var b=document.getElementById('ocr-tg-bdy');b.style.display=b.style.display!=='flex'?'flex':'none'})()">
      <div>
        <div class="ocr-tg-head-lbl">⚙️ Telegram для накладних</div>
        <div class="ocr-tg-head-sub">Налаштування чату для адміністратора</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div id="ocr-tg-bdy" class="ocr-tg-body">
      <div class="ocr-tg-grp">
        <div class="ocr-tg-lbl">Chat ID</div>
        <input class="ocr-tg-inp" id="ocr-tg-chat" type="text" placeholder="-100xxxxxxxxxx"
          value="${_ocrTgChatId}" oninput="window.__ocr.tgChanged()">
        <div class="ocr-tg-hint">Залиш порожнім — буде використовуватись глобальний чат бота</div>
      </div>
      <div class="ocr-tg-grp">
        <div class="ocr-tg-lbl">Topic ID (message_thread_id)</div>
        <input class="ocr-tg-inp" id="ocr-tg-topic" type="text" placeholder="123"
          value="${_ocrTgTopicId}" oninput="window.__ocr.tgChanged()">
        <div class="ocr-tg-hint">ID топіку для накладних</div>
      </div>
      <div class="ocr-tg-save-row">
        <button class="ocr-tg-save ${_ocrTgSaved?'saved':''}" id="ocr-tg-save-btn"
          onclick="window.__ocr.saveTg()">
          ${_ocrTgSaved ? '✓ Збережено' : 'Зберегти'}
        </button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   RENDER STATES
════════════════════════ */
function renderIdle() {
  return `
  <div class="ocr-topbar">
    <div class="ocr-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div>
      <div class="ocr-title">Накладна</div>
      <div class="ocr-sub">Сфотографуйте накладну — вона піде в Telegram</div>
    </div>
  </div>

  <div class="ocr-scroll">
    <div class="ocr-cam">
      <svg class="ocr-corner ocr-tl" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M2 16V4a2 2 0 012-2h12" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg class="ocr-corner ocr-tr" width="32" height="32" viewBox="0 0 32 32" fill="none" style="transform:rotate(90deg)">
        <path d="M2 16V4a2 2 0 012-2h12" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg class="ocr-corner ocr-bl" width="32" height="32" viewBox="0 0 32 32" fill="none" style="transform:rotate(270deg)">
        <path d="M2 16V4a2 2 0 012-2h12" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg class="ocr-corner ocr-br" width="32" height="32" viewBox="0 0 32 32" fill="none" style="transform:rotate(180deg)">
        <path d="M2 16V4a2 2 0 012-2h12" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="ocr-scan-line"></div>
      <div class="ocr-cam-center">
        <div class="ocr-cam-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6">
            <rect x="3" y="2" width="13" height="17" rx="2"/>
            <path d="M7 7h7M7 10h7M7 13h4" stroke="var(--green)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="ocr-cam-label">Сфоткайте накладну</div>
        <div class="ocr-cam-sub">Фото піде в Telegram одразу</div>
      </div>
    </div>

    <div class="ocr-cam-btns">
      <label for="ocr-cam-input" class="ocr-btn-shoot" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Сфотографувати
      </label>
      <label for="ocr-gallery-input" class="ocr-btn-icon" title="Галерея" style="cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="1.4">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      </label>
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

    ${ocrTgPanel()}
  </div>`;
}

function renderSending() {
  return `
  <div class="ocr-topbar" style="justify-content:center">
    <div>
      <div class="ocr-title" style="text-align:center">Надсилаємо…</div>
      <div class="ocr-sub" style="text-align:center">Відправляємо фото в Telegram</div>
    </div>
  </div>
  <div class="ocr-proc">
    <div class="ocr-ring"></div>
    <div class="ocr-proc-title">Відправка фото</div>
    <div class="ocr-proc-sub">Зачекайте кілька секунд</div>
  </div>`;
}

function renderDone() {
  return `
  <div class="ocr-success">
    <div class="ocr-succ-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 16l7 7 13-13" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="ocr-succ-title">Фото надіслано</div>
    <div class="ocr-succ-sub">Накладна відправлена в Telegram</div>
  </div>
  <div style="padding:0 20px 22px;display:flex;flex-direction:column;gap:8px">
    <button class="ocr-btn-confirm" onclick="window.__ocr.reset()">
      Надіслати ще одну
    </button>
    <button class="ocr-btn-secondary" onclick="window.__barops.navigate('dashboard')">
      На головний екран
    </button>
  </div>`;
}

function renderError() {
  return `
  <div class="ocr-error">
    <div class="ocr-err-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M10 10l12 12M22 10L10 22" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="ocr-err-title">Помилка</div>
    <div class="ocr-err-sub">${_errorMsg || 'Не вдалось надіслати фото. Перевірте налаштування Telegram.'}</div>
  </div>
  <div style="padding:0 20px 22px;display:flex;flex-direction:column;gap:8px">
    <button class="ocr-btn-confirm" onclick="window.__ocr.reset()">
      Спробувати ще раз
    </button>
    <button class="ocr-btn-secondary" onclick="window.__barops.navigate('dashboard')">
      На головний екран
    </button>
  </div>`;
}

function buildHTML() {
  const body = _state === 'sending' ? renderSending()
    : _state === 'done'             ? renderDone()
    : _state === 'error'            ? renderError()
    :                                 renderIdle();
  return `${CSS}<div class="ocr-wrap">${body}</div>`;
}

function rerender() {
  if (state.route !== 'ocr') return;
  const view = document.getElementById('app-view');
  if (view) view.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
async function handleFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';

  _state = 'sending';
  rerender();

  try {
    const token     = localStorage.getItem('barops_token') || '';
    const venueName = localStorage.getItem('barops_venue')  || '';
    if (!token) throw new Error('Не авторизований');

    const API_URL  = 'https://barops-backend-production.up.railway.app';
    const formData = new FormData();
    formData.append('photo',     file);
    formData.append('venueName', venueName);

    const res = await fetch(`${API_URL}/api/ocr/notify`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Помилка сервера');

    _state = 'done';
  } catch (err) {
    _errorMsg = err.message;
    _state    = 'error';
  }
  rerender();
}

function reset() {
  _state    = 'idle';
  _errorMsg = '';
  rerender();
}

async function loadOcrTgSettings() {
  try {
    const token   = localStorage.getItem('barops_token')   || '';
    const venueId = localStorage.getItem('barops_venueId') || '';
    if (!token || !venueId) return;

    const res = await fetch('https://barops-backend-production.up.railway.app/api/venues', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const d = await res.json();
    const venue = (d.venues || []).find(v => v.id === venueId);
    if (venue) {
      _ocrTgChatId  = venue.telegramOcrChatId  || '';
      _ocrTgTopicId = venue.telegramOcrTopicId || '';
    }
  } catch {}
}

async function saveOcrTg() {
  if (_ocrTgSaving) return;
  _ocrTgSaving = true;
  const btn = document.getElementById('ocr-tg-save-btn');
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  try {
    const token   = localStorage.getItem('barops_token')   || '';
    const venueId = localStorage.getItem('barops_venueId') || '';
    _ocrTgChatId  = document.getElementById('ocr-tg-chat')?.value.trim()  || '';
    _ocrTgTopicId = document.getElementById('ocr-tg-topic')?.value.trim() || '';

    const res = await fetch(`https://barops-backend-production.up.railway.app/api/venues/${venueId}/telegram`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        telegramOcrChatId:  _ocrTgChatId  || null,
        telegramOcrTopicId: _ocrTgTopicId || null,
      }),
    });
    const d = await res.json();
    if (d.success) {
      _ocrTgSaved = true;
      if (btn) { btn.textContent = '✓ Збережено'; btn.classList.add('saved'); btn.disabled = false; }
    } else {
      if (btn) { btn.textContent = 'Помилка'; btn.disabled = false; }
    }
  } catch {
    if (btn) { btn.textContent = 'Помилка'; btn.disabled = false; }
  }
  _ocrTgSaving = false;
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _state    = 'idle';
    _errorMsg = '';
    _ocrTgSaved = false;

    const role = (localStorage.getItem('barops_role') || '').toLowerCase();
    if (role === 'admin' || role === 'manager') {
      loadOcrTgSettings();
    }

    return buildHTML();
  },

  init() {
    window.__ocr = {
      handleFile,
      reset,
      saveTg: saveOcrTg,
      tgChanged: () => {
        _ocrTgSaved = false;
        const btn = document.getElementById('ocr-tg-save-btn');
        if (btn) { btn.textContent = 'Зберегти'; btn.classList.remove('saved'); }
      },
    };
  },
};
