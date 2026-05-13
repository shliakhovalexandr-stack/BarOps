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
.exc-scroll{overflow-y:auto;flex:1;padding-bottom:24px}.exc-scroll::-webkit-scrollbar{width:0}
.exc-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.exc-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.exc-back:active{background:var(--bg3)}
.exc-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.exc-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.exc-hero{margin:0 14px 16px;background:var(--bg2);border:0.5px solid var(--amber-border);border-radius:20px;padding:22px 20px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.exc-hero-icon{width:60px;height:60px;border-radius:18px;background:var(--amber-bg);border:0.5px solid var(--amber-border);display:flex;align-items:center;justify-content:center;font-size:28px}
.exc-hero-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.exc-hero-desc{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.6;max-width:260px}
.exc-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 14px 20px}
.exc-btn{height:52px;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:13px;font-family:var(--font-b);font-weight:500;color:var(--text0);transition:all .15s}
.exc-btn:active{transform:scale(.97);background:var(--bg3)}
.exc-btn.primary{background:var(--amber);border-color:transparent;color:#fff;grid-column:1/-1;height:54px;font-size:14px;font-weight:600}
.exc-btn.primary:active{background:#d08c1e}
.exc-preview{margin:0 14px 14px;border-radius:16px;overflow:hidden;border:0.5px solid var(--border2);position:relative;background:var(--bg2)}
.exc-preview img{width:100%;display:block;max-height:280px;object-fit:cover}
.exc-preview-change{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.65);border:0.5px solid rgba(255,255,255,.15);border-radius:20px;padding:5px 12px;font-size:11px;color:#fff;font-family:var(--font-b);cursor:pointer;backdrop-filter:blur(6px)}
.exc-preview-change:active{background:rgba(0,0,0,.85)}
.exc-info{margin:0 14px 16px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.exc-info-row{display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:0.5px solid var(--border)}
.exc-info-row:last-child{border-bottom:none}
.exc-info-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
.exc-info-label{font-size:11px;color:var(--text2);font-family:var(--font-b);flex:1}
.exc-info-val{font-size:13px;color:var(--text0);font-family:var(--font-b);font-weight:500;text-align:right}
.exc-send{margin:0 14px 12px;height:54px;border-radius:16px;border:none;background:var(--green);color:#fff;font-family:var(--font-h);font-size:15px;font-weight:700;letter-spacing:.01em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s;width:calc(100% - 28px)}
.exc-send:active{background:var(--green-d);transform:scale(.98)}
.exc-send:disabled{opacity:.5;cursor:not-allowed;transform:none}
.exc-sending{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;text-align:center}
.exc-spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--bg3);border-top-color:var(--amber);animation:excSpin .7s linear infinite}
@keyframes excSpin{to{transform:rotate(360deg)}}
.exc-sending-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}
.exc-sending-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.exc-done{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:14px;padding:40px 24px;text-align:center}
.exc-done-icon{width:72px;height:72px;border-radius:22px;background:var(--green-bg);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:34px;animation:excPop .4s cubic-bezier(.34,1.56,.64,1) both}
@keyframes excPop{from{transform:scale(.5);opacity:0}to{transform:none;opacity:1}}
.exc-done-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0)}
.exc-done-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6;max-width:260px}
.exc-done-again{margin-top:8px;height:48px;width:100%;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);font-size:14px;font-family:var(--font-b);font-weight:500;color:var(--text0);cursor:pointer}
.exc-done-again:active{background:var(--bg3)}
.exc-error{margin:0 14px 12px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:14px;padding:12px 14px;font-size:12px;color:var(--red);font-family:var(--font-b);line-height:1.5;text-align:center}
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
          <div class="exc-hero-icon">🏷️</div>
          <div class="exc-hero-title">Фото акцизної марки</div>
          <div class="exc-hero-desc">Сфотографуй акцизну марку — вона автоматично потрапить у Telegram-журнал закладу</div>
        </div>

        <div class="exc-btns">
          <button class="exc-btn" onclick="window.__excise.openCamera()">
            📷 Камера
          </button>
          <button class="exc-btn" onclick="window.__excise.openGallery()">
            🖼️ Галерея
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
            <span class="exc-info-icon">👤</span>
            <span class="exc-info-label">Бармен</span>
            <span class="exc-info-val">${name}</span>
          </div>
          <div class="exc-info-row">
            <span class="exc-info-icon">🏠</span>
            <span class="exc-info-label">Заклад</span>
            <span class="exc-info-val">${venueName}</span>
          </div>
          <div class="exc-info-row">
            <span class="exc-info-icon">🕐</span>
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