/* ============================================================
   BarOps — pages/venue-edit.js (FIXED v2)
   Редагування закладу: назва, Telegram Topic ID, POS
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venue = null;
let _loading = true;
let _saving = false;
let _saveSuccess = false;
let _toastTimer = null;

function token() { return localStorage.getItem('barops_token') || ''; }

/* ════════════════════════
   LOCAL STORAGE KEYS
════════════════════════ */
const LS_KEYS = {
  venueName:     'barops_venue_name',
  venuePos:      'barops_venue_pos',
  telegramTopic: 'barops_telegram_topic',
};

/* ════════════════════════
   CSS
════════════════════════ */
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

/* ════════════════════════
   HELPERS
════════════════════════ */
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

/* ════════════════════════
   LOCAL STORAGE
════════════════════════ */
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

/* ════════════════════════
   DATA LOADING
════════════════════════ */
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
        };
        saveToLocal(_venue.name, _venue.posType, _venue.telegramTopicId);
        console.log('[VenueEdit] Loaded from API:', _venue);
      }
    }
  } catch (e) {
    console.warn('[VenueEdit] API failed, using localStorage fallback:', e);
  }

  // Fallback
  if (!_venue) {
    const local = loadFromLocal();
    if (local.name) {
      _venue = {
        id: venueId,
        name: local.name,
        posType: local.posType,
        telegramTopicId: local.telegramTopicId,
      };
      console.log('[VenueEdit] Loaded from localStorage:', _venue);
    }
  }

  _loading = false;
  render();
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
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

  // ГАРАНТУЄМО, що _venue.telegramTopicId завжди string (не null/undefined)
  const safeTopicId = v.telegramTopicId || '';
  const hasTopic = !!safeTopicId;

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
      <input class="ve-input" id="ve-name" type="text" value="${escapeHtml(v.name)}" placeholder="Наприклад: Test Bar">

      <div class="ve-label">POS-система</div>
      <select class="ve-select" id="ve-pos">
        <option value="manual" ${v.posType === 'manual' ? 'selected' : ''}>Manual (ручний облік)</option>
        <option value="syrve" ${v.posType === 'syrve' ? 'selected' : ''}>Syrve (iiko)</option>
        <option value="poster" ${v.posType === 'poster' ? 'selected' : ''}>Poster</option>
        <option value="rkeeper" ${v.posType === 'rkeeper' ? 'selected' : ''}>R-Keeper</option>
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
      <input class="ve-input" id="ve-topic" type="text" value="${escapeHtml(safeTopicId)}" placeholder="Встав посилання на топік або ID">
      <div class="ve-hint">
        📱 Можна вставити повне посилання на топік або тільки ID<br>
        Приклади:<br>
        • https://t.me/c/1234567890/<strong>1966</strong><br>
        • https://web.telegram.org/a/#-1001234567890_<strong>1966</strong><br>
        • або просто: <strong>1966</strong>
      </div>
    </div>

    <div style="padding:8px 14px 24px">
      <button class="ve-btn ve-btn-green" id="ve-save-btn" onclick="window.__ve.save()" ${_saving ? 'disabled' : ''}>
        ${_saving ? '<div style="width:20px;height:20px;border-radius:50%;border:2px solid #fff;border-top-color:transparent;animation:veSpin .7s linear infinite"></div>' : '💾 Зберегти зміни'}
      </button>
      <button class="ve-btn ve-btn-ghost" onclick="window.__barops.goBack()">Назад</button>
    </div>
  </div>
</div>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
async function save() {
  if (_saving) return;
  _saving = true;
  _saveSuccess = false;
  render();

  const nameInput = document.getElementById('ve-name');
  const posSelect = document.getElementById('ve-pos');
  const topicInput = document.getElementById('ve-topic');

  const name = nameInput?.value?.trim() || '';
  const posType = posSelect?.value || 'manual';
  const topicUrl = topicInput?.value?.trim() || '';
  const topicId = extractTopicId(topicUrl);

  console.log('[VenueEdit] Saving:', { name, posType, topicUrl, topicId, venueId: _venue?.id });

  if (!name) {
    showToast('❌ Вкажіть назву закладу', 'error');
    _saving = false;
    render();
    return;
  }

  if (!_venue || !_venue.id) {
    showToast('❌ Помилка: заклад не завантажено', 'error');
    _saving = false;
    render();
    return;
  }

  // 1. Оновлюємо _venue ОДРАЗУ (до запиту на backend)
  _venue.name = name;
  _venue.posType = posType;
  _venue.telegramTopicId = topicId || '';

  // 2. Зберігаємо в localStorage
  saveToLocal(name, posType, topicId);

  // 3. Надсилаємо на backend
  let backendSuccess = false;
  try {
    const token = localStorage.getItem('barops_token');
    const url = `${API}/api/venues/${_venue.id}`;
    const body = JSON.stringify({
      name,
      posType,
      telegramTopicId: topicId,
    });

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
      backendSuccess = true;
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
  render(); // Тепер _venue вже оновлений, тому поле покаже нове значення!
}

/* ════════════════════════
   PAGE EXPORT
════════════════════════ */
export default {
  render(params) {
    _venue = null;
    _loading = true;
    _saving = false;
    _saveSuccess = false;
    const venueId = params?.venueId || localStorage.getItem('barops_venueId');
    console.log('[VenueEdit] Render with venueId:', venueId);
    loadVenue(venueId);
    return buildHTML();
  },
  init(params) {
    window.__ve = { save };
  },
};