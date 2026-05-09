/* ============================================================
   BarOps — pages/auth.js
   Авторизація: телефон + PIN
   Менеджер: вибір/створення закладу + PIN
   Бармен: телефон + PIN (встановлений менеджером)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _view          = 'welcome';  // welcome | login | manager-setup
let _inputMode     = 'phone';    // 'phone' | 'pin'
let _selectedRole  = null;
let _selectedVenue = '';
let _phone         = '';
let _pin           = '';
let _resendTimer   = null;
let _venues        = [];         // завантажені з бекенду

/* ════════════════════════════════════
   CSS
════════════════════════════════════ */
const CSS = `<style id="auth-styles">
.auth-inner{flex:1;display:flex;flex-direction:column;padding:0 28px 32px;overflow-y:auto}
.auth-inner::-webkit-scrollbar{display:none}
.auth-view{display:none;flex-direction:column;flex:1}
.auth-view.active{display:flex;animation:fadeUp 320ms ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* Logo */
.auth-logo-wrap{display:flex;align-items:center;gap:14px;margin-top:56px;margin-bottom:6px}
.auth-logo-mark{width:54px;height:54px;border-radius:16px;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 32px rgba(29,158,117,.35);position:relative;overflow:hidden}
.auth-logo-mark::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,transparent 60%)}
.auth-logo-text{font-family:var(--font-h);font-size:32px;font-weight:800;color:var(--text0);letter-spacing:-.03em}
.auth-logo-sub{font-size:12px;color:var(--text2);letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-b);margin-top:-2px}

/* Buttons */
.auth-btn{width:100%;height:54px;border:none;border-radius:16px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-h);letter-spacing:.02em;transition:all .18s;position:relative;overflow:hidden}
.auth-btn--primary{background:var(--green);color:#fff;box-shadow:0 4px 24px rgba(29,158,117,.28)}
.auth-btn--primary:active{background:var(--green-d)}
.auth-btn--primary:disabled{opacity:.5;cursor:not-allowed}
.auth-btn--ghost{background:transparent;color:var(--text1);border:0.5px solid var(--border2)}
.auth-btn--ghost:active{background:rgba(255,255,255,.04)}
.auth-or{display:flex;align-items:center;gap:12px;color:var(--text2);font-size:12px;font-family:var(--font-b);margin:12px 0}
.auth-or::before,.auth-or::after{content:'';flex:1;height:0.5px;background:var(--border2)}

/* Back header */
.auth-header{display:flex;align-items:center;gap:14px;margin-top:24px;margin-bottom:28px}
.auth-screen-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.auth-back{width:40px;height:40px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.auth-back:active{background:var(--bg3)}

/* Form */
.auth-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.auth-field-wrap{background:var(--bg2);border:0.5px solid var(--border2);border-radius:14px;overflow:hidden;transition:border-color .2s,box-shadow .2s;margin-bottom:14px;position:relative}
.auth-field-wrap:focus-within{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,158,117,.1)}
.auth-field-wrap.error{border-color:var(--red)}
.auth-inp{width:100%;height:52px;background:transparent;border:none;outline:none;color:var(--text0);font-size:16px;font-family:var(--font-b);padding:0 16px}
.auth-inp::placeholder{color:var(--text2);font-size:15px}
.auth-field-prefix{position:absolute;left:0;top:0;bottom:0;width:52px;display:flex;align-items:center;justify-content:center;border-right:0.5px solid var(--border);pointer-events:none}
.auth-inp.with-prefix{padding-left:60px}
.auth-err{font-size:11px;color:var(--red);font-family:var(--font-b);margin-top:-10px;margin-bottom:10px;display:none}
.auth-err.show{display:block}

/* Select */
.auth-select{width:100%;height:52px;background:transparent;border:none;outline:none;color:var(--text0);font-size:15px;font-family:var(--font-b);padding:0 36px 0 16px;appearance:none;-webkit-appearance:none;cursor:pointer}
.auth-select-wrap{background:var(--bg2);border:0.5px solid var(--border2);border-radius:14px;overflow:hidden;transition:border-color .2s;margin-bottom:14px;position:relative}
.auth-select-wrap:focus-within{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,158,117,.1)}

/* Role cards */
.auth-role-cards{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.auth-role-card{background:var(--bg2);border:0.5px solid var(--border2);border-radius:16px;padding:16px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .18s}
.auth-role-card.selected{border-color:var(--green);box-shadow:0 0 0 1px var(--green);background:var(--green-bg)}
.auth-role-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.auth-role-name{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.auth-role-desc{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b);line-height:1.4}
.auth-role-check{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:auto}
.auth-role-card.selected .auth-role-check{background:var(--green);border-color:var(--green)}

/* PIN dots */
.auth-pin-row{display:flex;gap:12px;justify-content:center;margin:20px 0}
.auth-pin-dot{width:18px;height:18px;border-radius:50%;background:var(--bg3);border:1.5px solid var(--border2);transition:all .2s}
.auth-pin-dot.filled{background:var(--green);border-color:var(--green)}
.auth-pin-keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.auth-pin-key{height:60px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:14px;font-family:var(--font-h);font-size:22px;font-weight:600;color:var(--text0);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;user-select:none}
.auth-pin-key:active{background:var(--bg3);transform:scale(.95)}
.auth-pin-key.del{font-size:16px;color:var(--text2)}

/* Error banner */
.auth-error-banner{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);font-family:var(--font-b);display:none;margin-bottom:14px}
.auth-error-banner.show{display:block}

/* Demo hint */
.auth-demo-hint{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px 14px;margin-top:16px;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.55;text-align:center}
.auth-spacer{flex:1;min-height:32px}
.auth-cta{display:flex;flex-direction:column;gap:10px;padding-bottom:8px}
.auth-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.auth-pill{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:20px;padding:6px 12px;font-size:12px;color:var(--text1);font-family:var(--font-b)}
.auth-pill-dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0}
.auth-tagline{margin-top:36px;font-family:var(--font-h);font-size:26px;font-weight:700;color:var(--text0);line-height:1.2;letter-spacing:-.02em}
.auth-tagline span{color:var(--green)}
.auth-desc{margin-top:12px;font-size:14px;color:var(--text1);line-height:1.65;font-family:var(--font-b);font-weight:300}

/* Spinner */
.auth-spinner{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .8s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;

const LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
  <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
  <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const BACK = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="#888" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ════════════════════════════════════
   VIEW: WELCOME
════════════════════════════════════ */
function viewWelcome() {
  return `
  <div class="auth-view active" id="auth-welcome">
    <div style="flex:1;min-height:48px"></div>
    <div class="auth-logo-wrap">
      <div class="auth-logo-mark">${LOGO_SVG}</div>
      <div>
        <div class="auth-logo-text">BarOps</div>
        <div class="auth-logo-sub">Bar Management AI</div>
      </div>
    </div>
    <div class="auth-tagline">Розумний<br/>помічник<br/><span>для вашого бару</span></div>
    <div class="auth-desc">Автоматизація інвентаризації, накладних та замовлень.</div>
    <div class="auth-pills">
      <div class="auth-pill"><div class="auth-pill-dot"></div>OCR накладних</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>Smart Ordering</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>Живий фудкост</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>Telegram звіти</div>
    </div>
    <div class="auth-spacer"></div>
    <div class="auth-cta">
      <button class="auth-btn auth-btn--primary" onclick="window.__auth.goTo('login')">Увійти</button>
      <div class="auth-or">вперше?</div>
      <button class="auth-btn auth-btn--ghost" onclick="window.__auth.goTo('manager-setup')">Я менеджер — налаштувати заклад</button>
    </div>
    <div style="height:16px"></div>
  </div>`;
}

/* ════════════════════════════════════
   VIEW: LOGIN (телефон + PIN)
════════════════════════════════════ */
function viewLogin() {
  const dots = [1,2,3,4].map(i =>
    `<div class="auth-pin-dot ${_pin.length >= i ? 'filled' : ''}" id="pin-dot-${i}"></div>`
  ).join('');

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => {
    if (k === '') return `<div></div>`;
    if (k === '⌫') return `<div class="auth-pin-key del" onclick="window.__auth.pinDel()">⌫</div>`;
    return `<div class="auth-pin-key" onclick="window.__auth.pinAdd('${k}')">${k}</div>`;
  }).join('');

  return `
  <div class="auth-view" id="auth-login">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK}</div>
      <div class="auth-screen-title">Вхід до BarOps</div>
    </div>

    <div class="auth-lbl" style="display:flex;align-items:center;justify-content:space-between">
      <span>Номер телефону</span>
      <span id="phone-active-badge" style="font-size:10px;color:var(--green);font-family:var(--font-b);display:flex;align-items:center;gap:4px">
        <span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block"></span>
        активне поле
      </span>
    </div>
    <div class="auth-field-wrap" id="phone-wrap" style="cursor:pointer" onclick="window.__auth.setMode('phone')">
      <div class="auth-field-prefix">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect width="18" height="4" fill="#005BBB"/>
          <rect y="4" width="18" height="4" fill="#FFD500"/>
          <rect y="8" width="18" height="4" fill="#005BBB"/>
        </svg>
      </div>
      <input class="auth-inp with-prefix" id="login-phone" type="tel"
        placeholder="73 XXX XX XX" maxlength="17" readonly
        onclick="window.__auth.setMode('phone')"/>
    </div>
    <div class="auth-err" id="phone-err">Введіть коректний номер телефону</div>

    <div class="auth-lbl" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="window.__auth.setMode('pin')">
      <span>PIN-код</span>
      <span id="pin-active-badge" style="font-size:10px;color:var(--text2);font-family:var(--font-b);display:flex;align-items:center;gap:4px;display:none">
        <span style="width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block"></span>
        активне поле
      </span>
    </div>
    <div class="auth-pin-row" style="cursor:pointer" onclick="window.__auth.setMode('pin')">${dots}</div>
    <div class="auth-pin-keypad">${keys}</div>

    <div class="auth-error-banner" id="login-err"></div>

    <button class="auth-btn auth-btn--primary" id="login-btn"
      onclick="window.__auth.doLogin()" ${_pin.length < 4 ? 'disabled' : ''}>
      Увійти
    </button>

    <div class="auth-demo-hint">
      <strong style="color:var(--text0)">Демо-режим:</strong><br/>
      Будь-який номер + PIN <strong>1234</strong><br/>
      <span style="opacity:.6">або збережені дані менеджера</span>
    </div>
    <div style="height:24px"></div>
  </div>`;
}

/* ════════════════════════════════════
   VIEW: MANAGER SETUP (перший вхід)
════════════════════════════════════ */
function viewManagerSetup() {
  const venueOptions = _venues.length
    ? _venues.map(v => `<option value="${v.id}" data-name="${v.name}">${v.name}</option>`).join('')
    : `<option value="">Завантаження...</option>`;

  const dots = [1,2,3,4].map(i =>
    `<div class="auth-pin-dot ${_pin.length >= i ? 'filled' : ''}" id="mpin-dot-${i}"></div>`
  ).join('');

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => {
    if (k === '') return `<div></div>`;
    if (k === '⌫') return `<div class="auth-pin-key del" onclick="window.__auth.mpinDel()">⌫</div>`;
    return `<div class="auth-pin-key" onclick="window.__auth.mpinAdd('${k}')">${k}</div>`;
  }).join('');

  return `
  <div class="auth-view" id="auth-manager-setup">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK}</div>
      <div class="auth-screen-title">Налаштування</div>
    </div>
    <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.6;margin-bottom:20px;font-weight:300">
      Вкажіть ваші дані менеджера. Після цього зможете додавати барменів.
    </div>

    <div class="auth-lbl">Ваше ім'я</div>
    <div class="auth-field-wrap">
      <input class="auth-inp" id="mgr-name" type="text" placeholder="Ім'я Прізвище"/>
    </div>

    <div class="auth-lbl">Телефон</div>
    <div class="auth-field-wrap" id="mgr-phone-wrap">
      <div class="auth-field-prefix">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <rect width="18" height="4" fill="#005BBB"/>
          <rect y="4" width="18" height="4" fill="#FFD500"/>
          <rect y="8" width="18" height="4" fill="#005BBB"/>
        </svg>
      </div>
      <input class="auth-inp with-prefix" id="mgr-phone" type="tel"
        placeholder="+380 XX XXX XX XX" maxlength="17"
        oninput="window.__auth.formatPhone(this)"/>
    </div>

    <div class="auth-lbl">Заклад</div>
    <div class="auth-select-wrap">
      <select class="auth-select" id="mgr-venue"
        style="appearance:none;-webkit-appearance:none;padding-right:36px">
        <option value="">Оберіть заклад...</option>
        ${venueOptions}
      </select>
      <svg style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none"
        width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 5l4 4 4-4" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <div class="auth-lbl">Встановіть PIN (4 цифри)</div>
    <div class="auth-pin-row">${dots}</div>
    <div class="auth-pin-keypad">${keys}</div>

    <div class="auth-error-banner" id="mgr-err"></div>

    <button class="auth-btn auth-btn--primary" id="mgr-btn"
      onclick="window.__auth.doManagerSetup()">
      Зберегти та увійти
    </button>
    <div style="height:24px"></div>
  </div>`;
}

/* ════════════════════════════════════
   NAVIGATION
════════════════════════════════════ */
function goTo(sub) {
  ['welcome','login','manager-setup'].forEach(v => {
    const el = document.getElementById('auth-' + v);
    if (el) el.classList.remove('active');
  });
  _pin = '';
  const t = document.getElementById('auth-' + sub);
  if (t) requestAnimationFrame(() => {
    t.classList.add('active');
    // Ініціалізуємо поле телефону з +380
    if (sub === 'login') {
      const ph = document.getElementById('login-phone');
      if (ph && !ph.value) ph.value = '+380 ';
      _inputMode = 'phone';
      updatePinDots('pin-dot');
      setTimeout(() => setMode('phone'), 50);
    }
  });
  _view = sub;
}

/* ════════════════════════════════════
   PHONE FORMAT
════════════════════════════════════ */
function formatPhone(inp) {
  // Завжди тримаємо +380 як префікс
  let digits = inp.value.replace(/\D/g, '');
  // Прибираємо ведучі 380 якщо є
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('38')) digits = digits.slice(2);
  // Обмежуємо до 9 цифр після +380 (напр. 731911940)
  digits = digits.slice(0, 9);
  // Форматуємо: +380 73 XXX XX XX
  let fmt = '+380';
  if (digits.length > 0) fmt += ' ' + digits.slice(0, 2);
  if (digits.length > 2) fmt += ' ' + digits.slice(2, 5);
  if (digits.length > 5) fmt += ' ' + digits.slice(5, 7);
  if (digits.length > 7) fmt += ' ' + digits.slice(7, 9);
  inp.value = fmt.trim();
}

function onPhoneChange() {
  _phone = document.getElementById('login-phone')?.value || '';
}

/* ════════════════════════════════════
   PIN KEYPAD — Login
════════════════════════════════════ */
function pinAdd(digit) {
  if (_inputMode === 'phone') {
    const phoneInp = document.getElementById('login-phone');
    if (phoneInp) {
      const raw = phoneInp.value.replace(/\D/g, '').replace(/^380?/, '');
      if (raw.length >= 9) {
        // Телефон заповнено — автоматично перемикаємо на PIN
        setMode('pin');
        pinAdd(digit);
        return;
      }
      phoneInp.value = '+380' + raw + digit;
      formatPhone(phoneInp);
      const newDigits = phoneInp.value.replace(/\D/g, '');
      if (newDigits.length >= 12) {
        setTimeout(() => setMode('pin'), 200);
      }
    }
    return;
  }

  // PIN mode
  if (_pin.length >= 4) return;
  _pin += digit;
  updatePinDots('pin-dot');
  if (_pin.length === 4) {
    const btn = document.getElementById('login-btn');
    if (btn) btn.disabled = false;
  }
}
function pinDel() {
  if (_inputMode === 'phone') {
    const phoneInp = document.getElementById('login-phone');
    if (phoneInp) {
      const raw = phoneInp.value.replace(/\D/g, '').replace(/^380?/, '');
      if (raw.length > 0) {
        phoneInp.value = '+380' + raw.slice(0, -1);
        formatPhone(phoneInp);
      }
    }
    return;
  }

  // PIN mode
  if (_pin.length === 0) {
    // Якщо PIN порожній і натиснули backspace — повертаємось до телефону
    setMode('phone');
    return;
  }
  _pin = _pin.slice(0, -1);
  updatePinDots('pin-dot');
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = _pin.length < 4;
}

/* PIN KEYPAD — Manager Setup */
function mpinAdd(digit) {
  if (_pin.length >= 4) return;
  _pin += digit;
  updatePinDots('mpin-dot');
}
function mpinDel() {
  if (_pin.length === 0) return;
  _pin = _pin.slice(0, -1);
  updatePinDots('mpin-dot');
}

function updatePinDots(prefix) {
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`${prefix}-${i}`);
    if (dot) dot.classList.toggle('filled', _pin.length >= i);
  }
}

/* ════════════════════════════════════
   LOGIN
════════════════════════════════════ */
async function doLogin() {
  const phone = document.getElementById('login-phone')?.value || '';
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('login-btn');

  if (phone.replace(/\D/g, '').length < 11) {
    document.getElementById('phone-err')?.classList.add('show');
    return;
  }
  if (_pin.length < 4) return;

  if (btn) btn.innerHTML = `<span class="auth-spinner"></span>`;

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: phone.replace(/\s/g, ''), pin: _pin }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Помилка входу');

    // Зберігаємо токени
    localStorage.setItem('barops_token',   data.token);
    localStorage.setItem('barops_refresh', data.refreshToken);
    localStorage.setItem('barops_venue',   data.user.venueName);
    localStorage.setItem('barops_role',    data.user.role);
    localStorage.setItem('barops_user',    data.user.name);

    state.role  = data.user.role;
    state.venue = data.user.venueName;
    state.user  = data.user.name;

    navigate('dashboard');

  } catch (err) {
    // Демо-fallback: PIN 1234
    if (_pin === '1234') {
      state.role  = 'bartender';
      state.venue = 'La Pasta';
      state.user  = 'Бармен (демо)';
      navigate('dashboard');
      return;
    }
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    }
    if (btn) btn.innerHTML = 'Увійти';
    // Трясемо крапки
    _pin = '';
    updatePinDots('pin-dot');
    btn.disabled = true;
  }
}

/* ════════════════════════════════════
   MANAGER SETUP (перша реєстрація)
════════════════════════════════════ */
async function doManagerSetup() {
  const name    = document.getElementById('mgr-name')?.value.trim();
  const phone   = document.getElementById('mgr-phone')?.value || '';
  const venueEl = document.getElementById('mgr-venue');
  const venueId = venueEl?.value;
  const venueName = venueEl?.options[venueEl.selectedIndex]?.dataset?.name || '';
  const errEl   = document.getElementById('mgr-err');
  const btn     = document.getElementById('mgr-btn');

  if (!name || phone.replace(/\D/g,'').length < 11 || !venueId || _pin.length < 4) {
    if (errEl) {
      errEl.textContent = 'Заповніть всі поля і введіть PIN';
      errEl.classList.add('show');
    }
    return;
  }

  if (btn) btn.innerHTML = `<span class="auth-spinner"></span>`;

  try {
    // 1. Реєструємо менеджера
    const res = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: phone.replace(/\s/g,''), pin: _pin }),
    });

    if (res.status === 401) {
      // Користувача немає — це нормально при першому вході
      // Показуємо інструкцію
      if (errEl) {
        errEl.textContent = 'Вас ще немає в системі. Зверніться до адміністратора BarOps для першого налаштування.';
        errEl.classList.add('show');
      }
      if (btn) btn.innerHTML = 'Зберегти та увійти';
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('barops_token',   data.token);
    localStorage.setItem('barops_refresh', data.refreshToken);
    localStorage.setItem('barops_venue',   data.user.venueName || venueName);
    localStorage.setItem('barops_role',    data.user.role);
    localStorage.setItem('barops_user',    data.user.name);

    state.role  = data.user.role;
    state.venue = data.user.venueName || venueName;
    state.user  = data.user.name;

    navigate('dashboard');
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    }
    if (btn) btn.innerHTML = 'Зберегти та увійти';
  }
}

/* ════════════════════════════════════
   ЗАВАНТАЖЕННЯ ЗАКЛАДІВ
════════════════════════════════════ */
async function loadVenues() {
  try {
    const res  = await fetch(`${API}/api/auth/venues`);
    const data = await res.json();
    if (data.venues) {
      _venues = data.venues;
      // Оновлюємо select якщо він в DOM
      const sel = document.getElementById('mgr-venue');
      if (sel) {
        sel.innerHTML = '<option value="">Оберіть заклад...</option>' +
          _venues.map(v => `<option value="${v.id}" data-name="${v.name}">${v.name}</option>`).join('');
      }
    }
  } catch { /* ігноруємо — офлайн */ }
}


function setMode(mode) {
  _inputMode = mode;
  const phoneBadge = document.getElementById('phone-active-badge');
  const pinBadge   = document.getElementById('pin-active-badge');
  const phoneWrap  = document.getElementById('phone-wrap');

  if (mode === 'phone') {
    if (phoneBadge) phoneBadge.style.display = 'flex';
    if (pinBadge)   pinBadge.style.display   = 'none';
    if (phoneWrap)  phoneWrap.style.borderColor = 'var(--green)';
    if (phoneWrap)  phoneWrap.style.boxShadow  = '0 0 0 3px rgba(29,158,117,.1)';
  } else {
    if (phoneBadge) phoneBadge.style.display = 'none';
    if (pinBadge)   pinBadge.style.display   = 'flex';
    if (phoneWrap)  phoneWrap.style.borderColor = '';
    if (phoneWrap)  phoneWrap.style.boxShadow  = '';
  }
}

function checkPhoneDone(inp) {
  const digits = inp.value.replace(/\D/g, '');
  if (digits.length >= 12) {
    _phone = inp.value;
    inp.blur();
    document.getElementById('pin-dot-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* ════════════════════════════════════
   PAGE MODULE EXPORT
════════════════════════════════════ */
export default {
  render() {
    _view = 'welcome';
    _pin  = '';
    return `
      ${CSS}
      <div class="auth-inner">
        ${viewWelcome()}
        ${viewLogin()}
        ${viewManagerSetup()}
      </div>`;
  },

  init() {
    window.__auth = {
      goTo, formatPhone, onPhoneChange, checkPhoneDone, setMode,
      pinAdd, pinDel, mpinAdd, mpinDel,
      doLogin, doManagerSetup,
    };
    goTo(_view);
    loadVenues();

    // Відновлюємо сесію якщо токен є
    const token = localStorage.getItem('barops_token');
    if (token) {
      state.role  = localStorage.getItem('barops_role')  || 'bartender';
      state.venue = localStorage.getItem('barops_venue') || '';
      state.user  = localStorage.getItem('barops_user')  || 'Бармен';
      // Перевіряємо чи токен дійсний
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => {
        if (r.ok) navigate('dashboard');
      }).catch(() => {});
    }
  },
};
