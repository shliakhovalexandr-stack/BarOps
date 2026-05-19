/* ============================================================
   BarOps — pages/venue-edit.js (FIXED v4)
   Редагування закладу: назва, Telegram Topic ID, POS
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venue = null;
let _loading = true;
let _saving = false;
let _saveSuccess = false;
let _toastTimer = null;
let _draft = { name: '', posType: 'manual', topicUrl: '', posUrl: '', posApiKey: '', posLogin: '', posPassword: '' };

function token() { return localStorage.getItem('barops_token') || ''; }

const LS_KEYS = {
  venueName:     'barops_venue_name',
  venuePos:      'barops_venue_pos',
  telegramTopic: 'barops_telegram_topic',
};

const CSS = `<style id="ve-css">
.ve-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.ve-scroll{overflow-y:auto;flex:1;padding-bottom:24px}.ve-scroll::-webkit-scrollbar{width:0}
.ve-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.ve-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ve-back:active{background:var(--bg3)}
.ve-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1;letter-spacing:-.02em}
.ve-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 18px 8px;font-family:var(--font-b)}
.ve-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;padding:16px}
.ve-label{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em}
.ve-input{width:100%;height:48px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;margin-bottom:14px;box-sizing:border-box}
.ve-input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,158,117,.1)}
.ve-input::placeholder{color:var(--text3)}
.ve-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:16px;line-height:1.5}
.ve-select{width:100%;height:48px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;margin-bottom:14px;box-sizing:border-box;appearance:none;-webkit-appearance:none}
.ve-btn{width:100%;height:52px;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.ve-btn-green{background:var(--green);color:#fff}
.ve-btn-green:active{background:var(--green-d);transform:scale(.98)}
.ve-btn-green:disabled{opacity:.5;cursor:not-allowed;transform:none}
.ve-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1);margin-top:8px}
.ve-btn-ghost:active{background:var(--bg3)}
.ve-topic-status{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;margin-bottom:14px;font-size:12px;font-family:var(--font-b)}
.ve-topic-status.ok{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.ve-topic-status.warn{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.ve-success{background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:12px;padding:12px 14px;margin:0 14px 14px;font-size:13px;color:var(--green);font-family:var(--font-b);display:flex;align-items:center;gap:8px;animation:veFadeIn .3s ease}
.ve-toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--bg3);color:var(--text0);padding:12px 24px;border-radius:12px;font-family:var(--font-b);font-size:14px;border:0.5px solid var(--border2);z-index:1000;opacity:0;transition:all .3s ease;pointer-events:none;white-space:nowrap}
.ve-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.ve-toast.error{background:var(--red-bg);border-color:var(--red-border);color:var(--red)}
</style>`;

function extractTopicId(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/[/_](\d+)(?:\?|$|#)/);
  return match ? match[1] : null;
}

function showToast(message, type = 'success') {
  const old = document.getElementById('ve-toast');
  if (old) old.remove();
  if (_toastTimer) clearTimeout(_toastTimer);

  const toast = document.createElement('div');
  toast.id = 've-toast';
  toast.className = `ve-toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  toast.offsetHeight;
  toast.classList.add('show');

  _toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function saveToLocal(name, posType, topicId) {
  localStorage.setItem(LS_KEYS.venueName, name);
  localStorage.setItem(LS_KEYS.venuePos, posType);
  if (topicId) {
    localStorage.setItem(LS_KEYS.telegramTopic, topicId);
  } else {
    localStorage.removeItem(LS_KEYS.telegramTopic);
  }
}

function loadFromLocal() {
  return {
    name: localStorage.getItem(LS_KEYS.venueName) || '',
    posType: localStorage.getItem(LS_KEYS.venuePos) || 'manual',
    telegramTopicId: localStorage.getItem(LS_KEYS.telegramTopic) || '',
  };
}

async function loadVenue(venueId) {
  _loading = true;
  _venue = null;

  try {
    const res = await fetch(`${API}/api/venues`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();

    if (data.success && data.venues) {
      const found = data.venues.find(v => v.id === venueId);
      if (found) {
        _venue = {
          id: found.id,
          name: found.name || '',
          posType: found.posType || 'manual',
          telegramTopicId: found.telegramTopicId || '',
          posUrl: found.posUrl || '',
          posLogin: found.posLogin || '',
        };
        _draft = {
          name: _venue.name,
          posType: _venue.posType,
          topicUrl: _venue.telegramTopicId,
          posUrl: _venue.posUrl || '',
          posApiKey: '',
          posLogin: _venue.posLogin || '',
          posPassword: '',
        };
        saveToLocal(_venue.name, _venue.posType, _venue.telegramTopicId);
        console.log('[VenueEdit] Loaded from API:', _venue);
      }
    }
  } catch (e) {
    console.warn('[VenueEdit] API failed:', e);
  }

  if (!_venue) {
    const local = loadFromLocal();
    if (local.name) {
      _venue = {
        id: venueId,
        name: local.name,
        posType: local.posType,
        telegramTopicId: local.telegramTopicId,
      };
      _draft = {
        name: local.name,
        posType: local.posType,
        topicUrl: local.telegramTopicId,
      };
      console.log('[VenueEdit] Loaded from localStorage:', _venue);
    }
  }

  _loading = false;
  render();

  // Ініціалізуємо POS-секцію після рендеру
  if (_venue?.id) {
    if (_draft.posType === 'syrve') {
      setTimeout(() => initIikoSection(_venue.id), 300);
    } else if (_draft.posType === 'poster') {
      setTimeout(() => initPosterSection(_venue.id), 300);
    }
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHTML() {
  if (_loading) {
    return `${CSS}
    <div class="ve-wrap">
      <div class="ve-topbar">
        <div class="ve-back" onclick="window.__barops.goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </div>
        <div class="ve-title">Редагування закладу</div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center">
        <div style="width:32px;height:32px;border-radius:50%;border:3px solid var(--bg3);border-top-color:var(--green);animation:veSpin .7s linear infinite"></div>
      </div>
    </div>
    <style>@keyframes veSpin{to{transform:rotate(360deg)}}</style>`;
  }

  const v = _venue;
  if (!v) {
    return `${CSS}
    <div class="ve-wrap">
      <div class="ve-topbar">
        <div class="ve-back" onclick="window.__barops.goBack()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </div>
        <div class="ve-title">Редагування закладу</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center">
        <div style="font-size:48px">🏪</div>
        <div style="font-family:var(--font-h);font-size:16px;color:var(--text0)">Заклад не знайдено</div>
        <button class="ve-btn ve-btn-ghost" onclick="window.__barops.goBack()" style="width:auto;padding:0 24px">Назад</button>
      </div>
    </div>`;
  }

  const displayTopic = _draft.topicUrl || '';
  const hasTopic = !!displayTopic;

  return `
${CSS}
<div class="ve-wrap">
  <div class="ve-topbar">
    <div class="ve-back" onclick="window.__barops.goBack()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    </div>
    <div class="ve-title">Редагувати заклад</div>
  </div>

  <div class="ve-scroll">
    ${_saveSuccess ? `
    <div class="ve-success">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--green)" stroke-width="1.5"/><path d="M5 8l2 2 3-3" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ✅ Зміни збережено успішно!
    </div>
    ` : ''}

    <div class="ve-sec">Основна інформація</div>
    <div class="ve-card">
      <div class="ve-label">Назва закладу</div>
      <input class="ve-input" id="ve-name" type="text" value="${escapeHtml(_draft.name)}" placeholder="Наприклад: Test Bar">

      <div class="ve-label">POS-система</div>
      <select class="ve-select" id="ve-pos">
        <option value="manual" ${_draft.posType === 'manual' ? 'selected' : ''}>Manual (ручний облік)</option>
        <option value="syrve" ${_draft.posType === 'syrve' ? 'selected' : ''}>Syrve (iiko)</option>
        <option value="poster" ${_draft.posType === 'poster' ? 'selected' : ''}>Poster</option>
        <option value="rkeeper" ${_draft.posType === 'rkeeper' ? 'selected' : ''}>R-Keeper</option>
      </select>
    </div>

    <div class="ve-sec">Telegram інтеграція</div>
    <div class="ve-card">
      ${hasTopic ? `
      <div class="ve-topic-status ok" id="ve-topic-status">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--green)" stroke-width="1.5"/><path d="M5 8l2 2 3-3" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Топік підключено · Фото акцизних марок будуть надсилатися в правильний чат
      </div>
      ` : `
      <div class="ve-topic-status warn" id="ve-topic-status">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--amber)" stroke-width="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round"/></svg>
        Топік не налаштовано · Фото будуть падати в загальний чат групи
      </div>
      `}

      <div class="ve-label">Telegram Topic</div>
      <input class="ve-input" id="ve-topic" type="text" value="${escapeHtml(displayTopic)}" placeholder="Встав посилання на топік або ID">
      <div class="ve-hint">
        📱 Можна вставити повне посилання на топік або тільки ID<br>
        Приклади:<br>
        • https://t.me/c/1234567890/<strong>1966</strong><br>
        • https://web.telegram.org/a/#-1001234567890_<strong>1966</strong><br>
        • або просто: <strong>1966</strong>
      </div>
    </div>

        <!-- POS інтеграція — динамічна секція -->
    <div id="pos-integration-section">
      ${_draft.posType === 'syrve' ? `
      <div class="ve-sec">🔗 Syrve / iiko інтеграція</div>
      <div class="ve-card" id="iiko-card">

        <!-- Заголовок + статус -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <span style="font-size:20px">🔗</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;color:var(--text0);font-family:var(--font-b)">Syrve (iiko)</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Синхронізація товарів та залишків</div>
          </div>
          <span id="iiko-status-badge" style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;font-family:var(--font-b);background:rgba(234,179,8,0.15);color:#eab308">Завантаження...</span>
        </div>

        <!-- Syrve поля -->
        <div class="ve-field" style="margin-bottom:12px">
          <label class="ve-label">URL СЕРВЕРА</label>
          <input class="ve-input" id="iiko-cloud-url" type="url" placeholder="https://terassa-chain.syrve.app">
          <div class="ve-hint">Наприклад: https://terassa-chain.syrve.app</div>
        </div>
        <div class="ve-field" style="margin-bottom:12px">
          <label class="ve-label">ЛОГІН</label>
          <input class="ve-input" id="iiko-login" type="text" placeholder="irina">
          <div class="ve-hint">Логін співробітника Syrve</div>
        </div>
        <div class="ve-field" style="margin-bottom:12px">
          <label class="ve-label">ПАРОЛЬ</label>
          <input class="ve-input" id="iiko-password" type="password" placeholder="••••••">
          <div class="ve-hint">Пароль співробітника Syrve</div>
        </div>

        <!-- Кнопки -->
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" id="btn-test-iiko" class="ve-btn"
            style="flex:1;background:transparent;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-h);height:48px;border-radius:14px">
            🔍 Перевірити з'єднання
          </button>
          <button type="button" id="btn-save-iiko" class="ve-btn ve-btn-green"
            style="flex:1;height:48px;border-radius:14px">
            💾 Зберегти
          </button>
        </div>
        <button type="button" id="btn-disconnect-iiko" class="ve-btn"
          style="width:100%;margin-top:12px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-b);height:44px;border-radius:14px;display:none">
          ❌ Відключити Syrve
        </button>
      </div>
      ` : _draft.posType === 'poster' ? `
      <div class="ve-sec">🍃 Poster інтеграція</div>
      <div class="ve-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <span style="font-size:20px">🍃</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;color:var(--text0);font-family:var(--font-b)">Poster POS</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Синхронізація товарів та замовлень</div>
          </div>
          <span id="poster-status-badge" style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;font-family:var(--font-b);background:rgba(234,179,8,0.15);color:#eab308">Завантаження...</span>
        </div>
        <div class="ve-label">API токен Poster</div>
        <input class="ve-input" id="poster-api-key" type="text" placeholder="Вставте токен з Poster">
        <div class="ve-hint">
          Як отримати токен: Poster → Налаштування → Інтеграції → API → Скопіювати токен
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" id="btn-test-poster" class="ve-btn" style="flex:1;background:transparent;border:1.5px solid var(--green);color:var(--green);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-h);height:48px;border-radius:14px">
            🔍 Перевірити з'єднання
          </button>
          <button type="button" id="btn-save-poster" class="ve-btn ve-btn-green" style="flex:1;height:48px;border-radius:14px">
            💾 Зберегти
          </button>
        </div>
        <button type="button" id="btn-disconnect-poster" class="ve-btn" style="width:100%;margin-top:12px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-b);height:44px;border-radius:14px;display:none">
          ❌ Відключити Poster
        </button>
      </div>
      ` : `
      <div class="ve-sec">🔗 POS інтеграція</div>
      <div class="ve-card">
        <div style="display:flex;align-items:center;gap:10px;padding:4px 0">
          <span style="font-size:24px">✋</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;color:var(--text0);font-family:var(--font-b)">Ручний облік</div>
            <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">Натисніть щоб підключити POS-систему</div>
          </div>
          <button onclick="window.__ve.openPosModal()"
            style="height:32px;padding:0 12px;border-radius:8px;border:0.5px solid var(--green);background:var(--green-bg);font-size:12px;color:var(--green);cursor:pointer;font-family:var(--font-b);white-space:nowrap;flex-shrink:0">
            🔗 Підключити
          </button>
        </div>
      </div>

      <!-- POS Modal -->
      <div id="pos-modal" style="display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);align-items:flex-end;justify-content:center">
        <div style="width:100%;max-width:480px;background:var(--bg1);border:0.5px solid var(--border);border-radius:20px 20px 0 0;padding:20px;max-height:85vh;overflow-y:auto">
          <div style="font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:16px">🔗 Підключити POS-систему</div>

          <div class="ve-label">Оберіть систему</div>
          <select class="ve-select" id="modal-pos-type" onchange="window.__ve.onModalPosChange(this.value)" style="margin-bottom:16px">
            <option value="">— Оберіть —</option>
            <option value="syrve">Syrve (iiko)</option>
            <option value="poster">Poster</option>
            <option value="rkeeper">R-Keeper</option>
          </select>

          <!-- Syrve fields -->
          <div id="modal-syrve" style="display:none">

            <!-- Перемикач Cloud / Self-hosted -->
            <div class="ve-label">Тип підключення</div>
            <div style="display:flex;gap:8px;margin-bottom:16px">
              <button id="modal-tab-cloud" type="button" onclick="window.__ve.setModalSyrveMode('cloud')"
                style="flex:1;height:40px;border-radius:10px;border:1.5px solid var(--green);background:var(--green);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-b)">
                ☁️ Cloud
              </button>
              <button id="modal-tab-selfhosted" type="button" onclick="window.__ve.setModalSyrveMode('selfhosted')"
                style="flex:1;height:40px;border-radius:10px;border:1.5px solid var(--border2);background:var(--bg3);color:var(--text1);font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font-b)">
                🖥️ Self-hosted
              </button>
            </div>

            <!-- Cloud поля -->
            <div id="modal-syrve-cloud">
              <div class="ve-label">URL СЕРВЕРА</div>
              <input class="ve-input" id="modal-iiko-url-cloud" type="url" placeholder="https://terassa-chain.syrve.app">
              <div class="ve-label">API KEY</div>
              <input class="ve-input" id="modal-iiko-key" type="text" placeholder="41911a8e...">
              <div class="ve-hint">Syrve → Live API Settings → скопіювати API key</div>
            </div>

            <!-- Self-hosted поля -->
            <div id="modal-syrve-selfhosted" style="display:none">
              <div class="ve-label">URL сервера</div>
              <input class="ve-input" id="modal-iiko-url" type="url" placeholder="https://la-pasta.syrve.online">
              <div class="ve-label">Логін</div>
              <input class="ve-input" id="modal-iiko-login" type="text" placeholder="shliakhov">
              <div class="ve-label">Пароль</div>
              <input class="ve-input" id="modal-iiko-password" type="password" placeholder="••••••">
              <div class="ve-hint">Пароль хешується MD5 — у відкритому вигляді не зберігається</div>
            </div>

          </div>

          <!-- Poster fields -->
          <div id="modal-poster" style="display:none">
            <div class="ve-label">API токен Poster</div>
            <input class="ve-input" id="modal-poster-key" type="text" placeholder="Вставте токен з Poster">
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:16px;line-height:1.5;text-align:center">
              Poster → Налаштування → Інтеграції → API → Скопіювати токен
            </div>
          </div>

          <!-- R-Keeper fields -->
          <div id="modal-rkeeper" style="display:none">
            <div class="ve-label">URL сервера R-Keeper</div>
            <input class="ve-input" id="modal-rkeeper-url" type="url" placeholder="https://...">
            <div class="ve-label">API ключ</div>
            <input class="ve-input" id="modal-rkeeper-key" type="text" placeholder="Вставте API ключ">
          </div>

          <div style="display:flex;gap:10px;margin-top:8px">
            <button onclick="window.__ve.closePosModal()"
              style="flex:1;height:48px;border-radius:12px;border:0.5px solid var(--border2);background:var(--bg3);font-size:14px;font-family:var(--font-h);color:var(--text1);cursor:pointer">
              Скасувати
            </button>
            <button onclick="window.__ve.savePosModal()"
              style="flex:1;height:48px;border-radius:12px;border:none;background:var(--green);font-size:14px;font-family:var(--font-h);font-weight:600;color:#fff;cursor:pointer">
              💾 Зберегти
            </button>
          </div>
        </div>
      </div>
      `}
    </div>

    <div style="padding:8px 14px 24px">
      <button class="ve-btn ve-btn-green" id="ve-save-btn" onclick="window.__ve.save()">
        💾 Зберегти зміни
      </button>
      <button class="ve-btn ve-btn-ghost" onclick="window.__barops.goBack()">Назад</button>
    </div>
  </div>
</div>`;
}

function render() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
  setupListeners();
}

function setupListeners() {
  const nameInput = document.getElementById('ve-name');
  const posSelect = document.getElementById('ve-pos');
  const topicInput = document.getElementById('ve-topic');

  if (nameInput) {
    nameInput.oninput = (e) => { _draft.name = e.target.value; };
  }
  if (posSelect) {
    posSelect.onchange = (e) => {
      _draft.posType = e.target.value;
      render();
    };
  }
  if (topicInput) {
    topicInput.oninput = (e) => { _draft.topicUrl = e.target.value; };
  }
}

function setSavingState(saving) {
  const btn = document.getElementById('ve-save-btn');
  if (!btn) return;
  if (saving) {
    btn.disabled = true;
    btn.innerHTML = '<div style="width:20px;height:20px;border-radius:50%;border:2px solid #fff;border-top-color:transparent;animation:veSpin .7s linear infinite"></div>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '💾 Зберегти зміни';
  }
}

async function save() {
  if (_saving) return;
  _saving = true;
  _saveSuccess = false;

  // НЕ перерендерюємо форму — тільки оновлюємо кнопку
  setSavingState(true);

  // Читаємо значення з DOM (форма не змінилась!)
  const nameInput = document.getElementById('ve-name');
  const posSelect = document.getElementById('ve-pos');
  const topicInput = document.getElementById('ve-topic');

  const name = (nameInput?.value || '').trim();
  const posType = posSelect?.value || 'manual';
  const topicUrl = (topicInput?.value || '').trim();
  const topicId = extractTopicId(topicUrl);

  console.log('[VenueEdit] Saving:', { name, posType, topicUrl, topicId, venueId: _venue?.id });

  if (!name) {
    showToast('❌ Вкажіть назву закладу', 'error');
    _saving = false;
    setSavingState(false);
    return;
  }

  if (!_venue || !_venue.id) {
    showToast('❌ Помилка: заклад не завантажено', 'error');
    _saving = false;
    setSavingState(false);
    return;
  }

  // Оновлюємо _venue і _draft
  _venue.name = name;
  _venue.posType = posType;
  _venue.telegramTopicId = topicId || '';

  _draft.name = name;
  _draft.posType = posType;
  _draft.topicUrl = topicUrl;

  // Зберігаємо в localStorage
  saveToLocal(name, posType, topicId);

  // Надсилаємо на backend
  try {
    const token = localStorage.getItem('barops_token');
    const url = `${API}/api/venues/${_venue.id}`;
    const body = JSON.stringify({ name, posType, telegramTopicId: topicId });

    console.log('[VenueEdit] PATCH', url, body);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body,
    });

    const data = await res.json();
    console.log('[VenueEdit] Response:', data);

    if (data.success) {
      _saveSuccess = true;
      showToast('✅ Зміни збережено');

      if (state.venueId === _venue.id) {
        state.venue = name;
        localStorage.setItem('barops_venue', name);
      }
    } else {
      showToast('⚠️ ' + (data.error || 'Помилка сервера'), 'error');
    }
  } catch (e) {
    console.error('[VenueEdit] Network error:', e);
    showToast('⚠️ Немає зв\'язку з сервером, зміни збережено локально', 'error');
  }

  _saving = false;
  // Тепер перерендерюємо — показати success banner і оновлений статус
  render();
}

/* ════════════════════════
   SYRVE / iiko SETTINGS
════════════════════════ */

let _syrveMode = 'cloud';

function setSyrveMode(mode) {
  _syrveMode = mode;
  const cloudFields      = document.getElementById('syrve-cloud-fields');
  const selfhostedFields = document.getElementById('syrve-selfhosted-fields');
  const tabCloud         = document.getElementById('tab-cloud');
  const tabSelf          = document.getElementById('tab-selfhosted');
  if (!cloudFields || !selfhostedFields) return;

  if (mode === 'cloud') {
    cloudFields.style.display      = 'block';
    selfhostedFields.style.display = 'none';
    tabCloud.style.background  = 'var(--green)';
    tabCloud.style.color       = '#fff';
    tabCloud.style.borderColor = 'var(--green)';
    tabSelf.style.background   = 'var(--bg3)';
    tabSelf.style.color        = 'var(--text1)';
    tabSelf.style.borderColor  = 'var(--border2)';
  } else {
    cloudFields.style.display      = 'none';
    selfhostedFields.style.display = 'block';
    tabSelf.style.background   = 'var(--green)';
    tabSelf.style.color        = '#fff';
    tabSelf.style.borderColor  = 'var(--green)';
    tabCloud.style.background  = 'var(--bg3)';
    tabCloud.style.color       = 'var(--text1)';
    tabCloud.style.borderColor = 'var(--border2)';
  }
}

function getSyrveFormData() {
  const url      = document.getElementById('iiko-cloud-url')?.value.trim()  || null;
  const login    = document.getElementById('iiko-login')?.value.trim()       || null;
  const password = document.getElementById('iiko-password')?.value           || null;
  return { url, apiKey: null, login, password };
}

async function initIikoSection(venueId) {
  await new Promise(r => setTimeout(r, 500));

  const badge         = document.getElementById('iiko-status-badge');
  if (!badge) { console.warn('[Syrve] DOM not ready'); return; }

  const disconnectBtn = document.getElementById('btn-disconnect-iiko');
  const authToken     = localStorage.getItem('barops_token');

  // ── Завантажити поточні налаштування ──
  try {
    const res = await fetch(`${API}/api/pos/settings/${venueId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (res.status === 401) {
      badge.textContent      = '❌ Помилка авторизації';
      badge.style.background = 'rgba(239,68,68,.15)';
      badge.style.color      = '#ef4444';
      return;
    }

    const data     = await res.json();
    const settings = data.settings || {};

    // Визначити режим по збереженому url
    const savedUrl = settings.posUrl || '';
    const isCloud  = !savedUrl || savedUrl.includes('iiko.services') || savedUrl.includes('iiko.biz') || savedUrl.includes('syrve.app');
    setSyrveMode(isCloud ? 'cloud' : 'selfhosted');

    // Підставити збережені значення
    const urlEl   = document.getElementById('iiko-cloud-url');
    const loginEl = document.getElementById('iiko-login');
    if (urlEl   && settings.posUrl)   urlEl.value   = settings.posUrl;
    if (loginEl && settings.posLogin) loginEl.value = settings.posLogin;
    // Пароль не підставляємо з міркувань безпеки

    // Статус badge
    if (settings.posConnected) {
      badge.textContent      = '✅ Підключено';
      badge.style.background = 'rgba(34,197,94,.15)';
      badge.style.color      = '#22c55e';
      if (disconnectBtn) disconnectBtn.style.display = 'block';
    } else {
      badge.textContent      = settings.posLastError ? '❌ Помилка' : '⚠️ Не підключено';
      badge.style.background = settings.posLastError ? 'rgba(239,68,68,.15)' : 'rgba(234,179,8,.15)';
      badge.style.color      = settings.posLastError ? '#ef4444' : '#eab308';
      badge.title            = settings.posLastError || '';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
  } catch (err) {
    badge.textContent      = '⚠️ Не підключено';
    badge.style.background = 'rgba(234,179,8,.15)';
    badge.style.color      = '#eab308';
    console.error('[Syrve] Load settings error:', err);
  }

  // ── Перевірити з'єднання ──
  document.getElementById('btn-test-iiko')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-iiko');
    btn.disabled  = true;
    btn.innerHTML = '⏳ Перевірка...';

    const { url, apiKey, login, password } = getSyrveFormData();

    if (!login || !password) {
      showToast('Введіть логін і пароль', 'error');
      btn.disabled = false; btn.innerHTML = "🔍 Перевірити з'єднання"; return;
    }

    try {
      const testRes  = await fetch(`${API}/api/pos/test`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body:    JSON.stringify({ venueId, posType: 'syrve', url, apiKey, login, password }),
      });
      const testData = await testRes.json();

      if (testData.success) {
        badge.textContent      = '✅ З\'єднання є';
        badge.style.background = 'rgba(34,197,94,.15)';
        badge.style.color      = '#22c55e';

        const d = testData.details;
        let msg = testData.message || 'З\'єднання успішне';
        if (d?.organizations?.length) msg += ': ' + d.organizations.map(o => o.name).join(', ');
        if (d?.stores?.length)        msg += ': ' + d.stores.map(s => s.name).join(', ');
        showToast('✅ ' + msg);
      } else {
        throw new Error(testData.error || "Помилка з'єднання");
      }
    } catch (err) {
      badge.textContent      = '❌ Помилка';
      badge.style.background = 'rgba(239,68,68,.15)';
      badge.style.color      = '#ef4444';
      showToast(err.message || 'Помилка', 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = "🔍 Перевірити з'єднання";
    }
  });

  // ── Зберегти ──
  document.getElementById('btn-save-iiko')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-iiko');
    btn.disabled  = true;
    btn.innerHTML = '⏳ Збереження...';

    const { url, apiKey, login, password } = getSyrveFormData();

    if (!login || !password) {
      showToast('Введіть логін і пароль', 'error');
      btn.disabled = false; btn.innerHTML = '💾 Зберегти'; return;
    }

    try {
      const res  = await fetch(`${API}/api/pos/save`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body:    JSON.stringify({ venueId, posType: 'syrve', url, apiKey, login, password }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('Налаштування збережено!');
        badge.textContent      = '⚠️ Збережено — натисніть "Перевірити з\'єднання"';
        badge.style.background = 'rgba(234,179,8,.15)';
        badge.style.color      = '#eab308';
        if (disconnectBtn) disconnectBtn.style.display = 'none';
      } else {
        showToast(data.error || 'Помилка збереження', 'error');
      }
    } catch (err) {
      showToast('Помилка мережі', 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '💾 Зберегти';
    }
  });

  // ── Відключити ──
  disconnectBtn?.addEventListener('click', async () => {
    if (!confirm('Відключити Syrve? Всі налаштування будуть видалені.')) return;
    try {
      const res = await fetch(`${API}/api/pos/disconnect`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body:    JSON.stringify({ venueId }),
      });
      if (res.ok) {
        const urlEl    = document.getElementById('iiko-cloud-url');
        const secretEl = document.getElementById('iiko-api-secret');
        if (urlEl)    urlEl.value    = '';
        if (secretEl) secretEl.value = '';
        badge.textContent      = '⚠️ Не підключено';
        badge.style.background = 'rgba(234,179,8,.15)';
        badge.style.color      = '#eab308';
        disconnectBtn.style.display = 'none';
        setSyrveMode('cloud');
        showToast('Syrve відключено');
      }
    } catch (err) {
      showToast('Помилка відключення', 'error');
    }
  });
}


function setModalSyrveMode(mode) {
  const cloudEl = document.getElementById('modal-syrve-cloud');
  const selfEl  = document.getElementById('modal-syrve-selfhosted');
  const tabC    = document.getElementById('modal-tab-cloud');
  const tabS    = document.getElementById('modal-tab-selfhosted');
  if (!cloudEl || !selfEl) return;

  if (mode === 'cloud') {
    cloudEl.style.display = 'block';
    selfEl.style.display  = 'none';
    tabC.style.background = 'var(--green)'; tabC.style.color = '#fff'; tabC.style.borderColor = 'var(--green)';
    tabS.style.background = 'var(--bg3)';  tabS.style.color = 'var(--text1)'; tabS.style.borderColor = 'var(--border2)';
  } else {
    cloudEl.style.display = 'none';
    selfEl.style.display  = 'block';
    tabS.style.background = 'var(--green)'; tabS.style.color = '#fff'; tabS.style.borderColor = 'var(--green)';
    tabC.style.background = 'var(--bg3)';  tabC.style.color = 'var(--text1)'; tabC.style.borderColor = 'var(--border2)';
  }
}

function openPosModal() {
  const modal = document.getElementById('pos-modal');
  if (modal) { modal.style.display = 'flex'; }
}

function closePosModal() {
  const modal = document.getElementById('pos-modal');
  if (modal) { modal.style.display = 'none'; }
}

function onModalPosChange(val) {
  document.getElementById('modal-syrve').style.display   = val === 'syrve'   ? 'block' : 'none';
  document.getElementById('modal-poster').style.display  = val === 'poster'  ? 'block' : 'none';
  document.getElementById('modal-rkeeper').style.display = val === 'rkeeper' ? 'block' : 'none';
}

async function savePosModal() {
  const posType = document.getElementById('modal-pos-type').value;
  if (!posType) { showToast('Оберіть POS-систему', 'error'); return; }

  const venueId = _venue?.id;
  if (!venueId) { showToast('Заклад не завантажено', 'error'); return; }

  let url = '', apiKey = '', login = '', password = '';

  if (posType === 'syrve') {
    const mode = document.getElementById('modal-syrve-selfhosted')?.style.display === 'none' ? 'cloud' : 'selfhosted';
    if (mode === 'cloud') {
      url    = document.getElementById('modal-iiko-url-cloud')?.value.trim();
      apiKey = document.getElementById('modal-iiko-key')?.value.trim();
      if (!url || !apiKey) { showToast('Введіть URL та API Key', 'error'); return; }
    } else {
      url      = document.getElementById('modal-iiko-url')?.value.trim();
      login    = document.getElementById('modal-iiko-login')?.value.trim();
      password = document.getElementById('modal-iiko-password')?.value;
      if (!url || !login || !password) { showToast('Введіть URL, логін та пароль', 'error'); return; }
    }
  } else if (posType === 'poster') {
    url    = 'https://joinposter.com/api';
    apiKey = document.getElementById('modal-poster-key').value.trim();
    if (!apiKey) { showToast('Введіть API токен', 'error'); return; }
  } else if (posType === 'rkeeper') {
    url    = document.getElementById('modal-rkeeper-url').value.trim();
    apiKey = document.getElementById('modal-rkeeper-key').value.trim();
    if (!url || !apiKey) { showToast('Введіть URL та API ключ', 'error'); return; }
  }

  const authToken = localStorage.getItem('barops_token');

  try {
    const res = await fetch(`${API}/api/pos/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ venueId, posType, url, apiKey, login, password })
    });
    const data = await res.json();
    if (data.success) {
      _draft.posType  = posType;
      _venue.posType  = posType;
      _draft.posUrl   = url;
      _draft.posLogin = login;
      localStorage.setItem('barops_venue_pos', posType);
      closePosModal();
      showToast('✅ POS підключено!');
      render();
    } else {
      showToast(data.error || 'Помилка збереження', 'error');
    }
  } catch (err) {
    showToast('Помилка мережі', 'error');
  }
}

async function initPosterSection(venueId) {
  await new Promise(r => setTimeout(r, 500));
  
  const badge = document.getElementById('poster-status-badge');
  if (!badge) return;

  const apiKeyInput = document.getElementById('poster-api-key');
  const disconnectBtn = document.getElementById('btn-disconnect-poster');
  const authToken = localStorage.getItem('barops_token');

  try {
    const res = await fetch(`${API}/api/pos/settings/${venueId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    const settings = data.settings;

    if (settings.posConnected) {
      badge.textContent = '✅ Підключено';
      badge.style.background = 'rgba(34, 197, 94, 0.15)';
      badge.style.color = '#22c55e';
      if (disconnectBtn) disconnectBtn.style.display = 'block';
    } else {
      badge.textContent = '⚠️ Не підключено';
      badge.style.background = 'rgba(234, 179, 8, 0.15)';
      badge.style.color = '#eab308';
    }
  } catch (err) {
    console.error('Load poster settings error:', err);
  }

  document.getElementById('btn-test-poster')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-test-poster');
    btn.disabled = true;
    btn.innerHTML = '⏳ Перевірка...';
    try {
      const saveRes = await fetch(`${API}/api/pos/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ venueId, posType: 'poster', url: 'https://joinposter.com/api', apiKey: apiKeyInput.value.trim(), login: '', password: '' })
      });
      if (!saveRes.ok) throw new Error('Помилка збереження');
      const testRes = await fetch(`${API}/api/pos/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ venueId })
      });
      const testData = await testRes.json();
      if (testData.success) {
        badge.textContent = '✅ Підключено';
        badge.style.background = 'rgba(34, 197, 94, 0.15)';
        badge.style.color = '#22c55e';
        if (disconnectBtn) disconnectBtn.style.display = 'block';
        localStorage.setItem('barops_pos_connected', 'true');
        showToast('З\'єднання з Poster успішне!');
      } else {
        throw new Error(testData.error || 'Помилка з\'єднання');
      }
    } catch (err) {
      badge.textContent = '❌ Помилка';
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = '#ef4444';
      showToast(err.message || 'Помилка', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Перевірити з\'єднання';
    }
  });

  document.getElementById('btn-save-poster')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-poster');
    btn.disabled = true;
    btn.innerHTML = '⏳ Збереження...';
    try {
      const res = await fetch(`${API}/api/pos/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ venueId, posType: 'poster', url: 'https://joinposter.com/api', apiKey: apiKeyInput.value.trim(), login: '', password: '' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Налаштування Poster збережено!');
      } else {
        showToast(data.error || 'Помилка збереження', 'error');
      }
    } catch (err) {
      showToast('Помилка мережі', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '💾 Зберегти';
    }
  });

  disconnectBtn?.addEventListener('click', async () => {
    if (!confirm('Відключити Poster?')) return;
    try {
      const res = await fetch(`${API}/api/pos/disconnect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ venueId })
      });
      if (res.ok) {
        if (apiKeyInput) apiKeyInput.value = '';
        badge.textContent = '⚠️ Не підключено';
        badge.style.background = 'rgba(234, 179, 8, 0.15)';
        badge.style.color = '#eab308';
        disconnectBtn.style.display = 'none';
        localStorage.removeItem('barops_pos_connected');
        showToast('Poster відключено');
      }
    } catch (err) {
      showToast('Помилка відключення', 'error');
    }
  });
}

export default {
  render(params) {
    _venue = null;
    _loading = true;
    _saving = false;
    _saveSuccess = false;
    _draft = { name: '', posType: 'manual', topicUrl: '' };
    const venueId = params?.venueId || localStorage.getItem('barops_venueId');
    console.log('[VenueEdit] Render with venueId:', venueId);
    loadVenue(venueId);
    return buildHTML();
  },
  init(params) {
    window.__ve = { save, openPosModal, closePosModal, onModalPosChange, savePosModal, setSyrveMode, setModalSyrveMode };
    setupListeners();
  },
};