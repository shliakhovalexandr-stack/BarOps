/* ============================================================
   BarOps — pages/excise.js
   Акцизні марки: фото → Telegram топік закладу
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API_URL = 'https://barops-backend-production.up.railway.app';

let _step       = 'idle';
let _photoFile  = null;
let _photoUrl   = null;
let _errorMsg   = '';

const CSS = `<style id="exc-css">
.exc-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.exc-scroll{overflow-y:auto;flex:1;padding:0 20px 24px}.exc-scroll::-webkit-scrollbar{width:0}
.exc-topbar{display:flex;align-items:center;gap:12px;padding:8px 20px 12px;flex-shrink:0}
.exc-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.exc-back:active{background:rgba(255,255,255,.08)}
.exc-title{font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.exc-sub{font-size:11px;color:var(--text2);margin-top:1px}
.exc-hero{margin:0 0 18px;background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:24px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.exc-hero-icon{width:64px;height:64px;border-radius:18px;background:var(--green-bg);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center}
.exc-hero-title{font-size:17px;font-weight:600;letter-spacing:-.01em;margin-bottom:4px}
.exc-hero-desc{font-size:12px;color:var(--text2);line-height:1.5}
.exc-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 18px}
.exc-btn{padding:14px;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:500;color:var(--text0);transition:all .15s}
.exc-btn:active{transform:scale(.97);background:var(--bg3)}
.exc-preview{margin:0 0 14px;border-radius:16px;overflow:hidden;border:0.5px solid var(--border);position:relative;background:var(--bg2)}
.exc-preview img{width:100%;display:block;max-height:280px;object-fit:cover}
.exc-preview-change{position:absolute;top:10px;right:10px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:5px 12px;font-size:11px;color:var(--text1);cursor:pointer}
.exc-info{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px}
.exc-info-row{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:0.5px solid var(--border)}
.exc-info-row:last-child{border-bottom:none}
.exc-info-icon{font-size:14px;width:20px;text-align:center;color:var(--text2);flex-shrink:0}
.exc-info-label{font-size:12px;color:var(--text2);flex:1}
.exc-info-val{font-size:13px;font-weight:500;color:var(--text0);text-align:right}
.exc-send{height:54px;border-radius:14px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:12px}
.exc-send:active{opacity:.85}
.exc-send:disabled{opacity:.5;cursor:not-allowed}
.exc-sending{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;text-align:center}
.exc-spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--bg3);border-top-color:var(--amber);animation:excSpin .7s linear infinite}
@keyframes excSpin{to{transform:rotate(360deg)}}
.exc-sending-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}
.exc-sending-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.exc-done{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:14px;padding:40px 24px;text-align:center}
.exc-done-icon{width:72px;height:72px;border-radius:22px;background:var(--green-bg);border:1px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:34px;animation:excPop .4s cubic-bezier(.34,1.56,.64,1) both}
@keyframes excPop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.exc-done-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0)}
.exc-done-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6;max-width:260px}
.exc-done-again{margin-top:8px;height:48px;width:100%;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);font-size:14px;font-family:var(--font-b);font-weight:500;color:var(--text0);cursor:pointer}
.exc-done-again:active{background:rgba(255,255,255,.08)}
.exc-error{margin:0 0 12px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:14px;padding:12px 14px;font-size:12px;color:var(--red);line-height:1.5;text-align:center}
.exc-file-input{position:fixed;top:-200px;left:-200px;opacity:0;width:1px;height:1px}
</style>`;

function getToken() {
  return localStorage.getItem('barops_token') || '';
}

function getUserInfo() {
  try {
    const token = getToken();
    if (!token) return { name: 'Бармен', venueName: 'Заклад', telegramTopicId: null };
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      name:            payload.name      || 'Бармен',
      venueName:       payload.venueName || payload.venue || 'Заклад',
      // Спробуємо отримати telegramTopicId з різних джерел
      telegramTopicId: payload.telegramTopicId || localStorage.getItem('barops_telegram_topic') || null,
    };
  } catch {
    return { 
      name: 'Бармен', 
      venueName: 'Заклад', 
      telegramTopicId: localStorage.getItem('barops_telegram_topic') || null 
    };
  }
}

function fmtTime() {
  return new Date().toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function render() {
  const { name, venueName } = getUserInfo();

  if (_step === 'sending') {
    return `${CSS}
      <div class="exc-wrap">
        <div class="exc-topbar">
          <div class="exc-back" onclick="window.__excise.goBack()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </div>
          <div>
            <div class="exc-title">Акциз</div>
          </div>
        </div>
        <div class="exc-sending">
          <div class="exc-spinner"></div>
          <div class="exc-sending-title">Надсилаємо фото...</div>
          <div class="exc-sending-sub">Фото акцизної марки<br>відправляється в Telegram</div>
        </div>
      </div>`;
  }

  if (_step === 'done') {
    return `${CSS}
      <div class="exc-wrap">
        <div class="exc-topbar">
          <div class="exc-back" onclick="window.__excise.goBack()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </div>
          <div>
            <div class="exc-title">Акциз</div>
          </div>
        </div>
        <div class="exc-done">
          <div class="exc-done-icon">✅</div>
          <div class="exc-done-title">Відправлено!</div>
          <div class="exc-done-sub">Фото акцизної марки надіслано до Telegram-топіку закладу «${venueName}»</div>
          <button class="exc-done-again" onclick="window.__excise.reset()">Надіслати ще одне фото</button>
        </div>
      </div>`;
  }

  const hasPhoto = _step === 'preview' && _photoUrl;

  return `${CSS}
    <div class="exc-wrap">
      <div class="exc-topbar">
        <div class="exc-back" onclick="window.__excise.goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </div>
        <div>
          <div class="exc-title">Акцизні марки</div>
          <div class="exc-sub">${venueName}</div>
        </div>
      </div>

      <div class="exc-scroll">

        ${!hasPhoto ? `
        <div class="exc-hero">
          <div class="exc-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <path d="M3 12h18M8 6V4h8v2"/>
            </svg>
          </div>
          <div>
            <div class="exc-hero-title">Сфоткайте акцизну марку</div>
            <div class="exc-hero-desc">Фото автоматично відправляється<br>у Telegram-топік закладу</div>
          </div>
        </div>

        <div class="exc-btns">
          <button class="exc-btn" onclick="window.__excise.openCamera()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Камера
          </button>
          <button class="exc-btn" onclick="window.__excise.openGallery()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            Галерея
          </button>
        </div>
        ` : ''}

        ${hasPhoto ? `
        <div class="exc-preview">
          <img src="${_photoUrl}" alt="Акцизна марка"/>
          <div class="exc-preview-change" onclick="window.__excise.openGallery()">Змінити фото</div>
        </div>

        <div class="exc-info">
          <div class="exc-info-row">
            <span class="exc-info-icon">◉</span>
            <span class="exc-info-label">Бармен</span>
            <span class="exc-info-val">${name}</span>
          </div>
          <div class="exc-info-row">
            <span class="exc-info-icon">◉</span>
            <span class="exc-info-label">Заклад</span>
            <span class="exc-info-val">${venueName}</span>
          </div>
          <div class="exc-info-row">
            <span class="exc-info-icon">◔</span>
            <span class="exc-info-label">Час</span>
            <span class="exc-info-val">${fmtTime()}</span>
          </div>
        </div>

        ${_step === 'error' ? `<div class="exc-error">⚠️ ${_errorMsg}</div>` : ''}

        <button class="exc-send" onclick="window.__excise.send()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          Надіслати в Telegram
        </button>
        ` : ''}

      </div>

      <input class="exc-file-input" id="exc-cam-inp" type="file" accept="image/*" capture="environment"
        onchange="window.__excise.handleFile(this)"/>
      <input class="exc-file-input" id="exc-gal-inp" type="file" accept="image/*"
        onchange="window.__excise.handleFile(this)"/>
    </div>`;
}

function rerender() {
  const view = document.getElementById('app-view');
  if (view) view.innerHTML = render();
}

function goBack() {
  navigate('dashboard');
}

function reset() {
  _step      = 'idle';
  _photoFile = null;
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoUrl  = null;
  _errorMsg  = '';
  rerender();
}

function openCamera() {
  const inp = document.getElementById('exc-cam-inp');
  if (inp) inp.click();
}

function openGallery() {
  const inp = document.getElementById('exc-gal-inp');
  if (inp) inp.click();
}

function handleFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoFile = file;
  _photoUrl  = URL.createObjectURL(file);
  _step      = 'preview';
  _errorMsg  = '';
  
  // Очищаємо input ПІСЛЯ зчитування файлу, через таймаут
  setTimeout(() => {
    input.value = '';
  }, 100);
  
  rerender();
}

async function send() {
  if (!_photoFile) return;

  const { name, venueName } = getUserInfo();

  // Читаємо telegramTopicId з бекенду напряму
  // Читаємо telegramTopicId з localStorage
  const telegramTopicId = localStorage.getItem('barops_telegram_topic') || '';
  console.log('[Excise] telegramTopicId для відправки:', telegramTopicId);

  _step = 'sending';
  rerender();

  try {
    const formData = new FormData();
    formData.append('photo',           _photoFile);
    formData.append('venueName',       venueName);
    formData.append('barmanName',      name);
    formData.append('telegramTopicId', telegramTopicId);

    const token = getToken();
    const res = await fetch(`${API_URL}/api/excise/photo`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Помилка сервера');

    if (_photoUrl) URL.revokeObjectURL(_photoUrl);
    _photoUrl  = null;
    _photoFile = null;
    _step      = 'done';
    rerender();

    } catch (err) {
    _step     = 'preview'; // Повертаємось на preview, щоб показати помилку
    _errorMsg = err.message || 'Не вдалося надіслати фото. Спробуй ще раз.';
    rerender();
  }
}

export default {
  render(params) {
    _step      = 'idle';
    _photoFile = null;
    if (_photoUrl) URL.revokeObjectURL(_photoUrl);
    _photoUrl  = null;
    _errorMsg  = '';

    // Ініціалізуємо глобальний об'єкт
    window.__excise = { goBack, reset, openCamera, openGallery, handleFile, send };

    return render();
  },
  init(params) {
    // Глобальний об'єкт вже встановлено в render
  },
};