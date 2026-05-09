/* ============================================================
   BarOps — pages/auth.js
   Екран 1: Телефон (системна клавіатура)
   Екран 2: PIN (4 квадратики + системна цифрова клавіатура)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _view   = 'welcome'; // welcome | phone | pin
let _phone  = '';
let _pin    = '';
let _venues = [];

/* ════════════════════════════════════
   CSS
════════════════════════════════════ */
const CSS = `<style id="auth-styles">
.auth-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.auth-inner{flex:1;display:flex;flex-direction:column;padding:0 24px 32px;overflow-y:auto}
.auth-inner::-webkit-scrollbar{display:none}
.auth-view{display:none;flex-direction:column;flex:1}
.auth-view.active{display:flex;animation:fadeUp 280ms ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* Logo */
.auth-logo-wrap{display:flex;align-items:center;gap:14px;margin-top:48px;margin-bottom:8px}
.auth-logo-mark{width:52px;height:52px;border-radius:16px;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 28px rgba(29,158,117,.35);position:relative;overflow:hidden}
.auth-logo-mark::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,transparent 60%)}
.auth-logo-text{font-family:var(--font-h);font-size:30px;font-weight:800;color:var(--text0);letter-spacing:-.03em}
.auth-logo-sub{font-size:11px;color:var(--text2);letter-spacing:.12em;text-transform:uppercase;font-family:var(--font-b)}

/* Tagline */
.auth-tagline{margin-top:32px;font-family:var(--font-h);font-size:24px;font-weight:700;color:var(--text0);line-height:1.25;letter-spacing:-.02em}
.auth-tagline span{color:var(--green)}
.auth-desc{margin-top:10px;font-size:13px;color:var(--text1);line-height:1.65;font-family:var(--font-b);font-weight:300}
.auth-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}
.auth-pill{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:20px;padding:5px 11px;font-size:11px;color:var(--text1);font-family:var(--font-b)}
.auth-pill-dot{width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0}
.auth-spacer{flex:1;min-height:24px}

/* Buttons */
.auth-btn{width:100%;height:54px;border:none;border-radius:16px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);letter-spacing:.01em;transition:all .18s}
.auth-btn-primary{background:var(--green);color:#fff;box-shadow:0 4px 20px rgba(29,158,117,.28)}
.auth-btn-primary:active{background:var(--green-d);transform:scale(.98)}
.auth-btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none}
.auth-btn-ghost{background:transparent;color:var(--text2);border:0.5px solid var(--border2);margin-top:10px}
.auth-btn-ghost:active{background:rgba(255,255,255,.04)}
.auth-cta{display:flex;flex-direction:column;gap:0;padding-bottom:4px}

/* Header */
.auth-header{display:flex;align-items:center;gap:12px;margin-top:24px;margin-bottom:32px}
.auth-back{width:38px;height:38px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.auth-back:active{background:var(--bg3)}
.auth-screen-title{font-family:var(--font-h);font-size:21px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.auth-screen-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:2px}

/* Phone field */
.auth-phone-wrap{background:var(--bg2);border:1.5px solid var(--green);border-radius:16px;display:flex;align-items:center;gap:0;overflow:hidden;margin-bottom:8px;box-shadow:0 0 0 3px rgba(29,158,117,.08)}
.auth-phone-flag{width:58px;height:58px;display:flex;align-items:center;justify-content:center;border-right:0.5px solid var(--border2);flex-shrink:0;font-size:24px}
.auth-phone-input{flex:1;height:58px;background:transparent;border:none;outline:none;color:var(--text0);font-size:20px;font-family:var(--font-h);font-weight:600;padding:0 16px;letter-spacing:.02em}
.auth-phone-input::placeholder{color:var(--text2);font-size:16px;font-weight:400;font-family:var(--font-b)}
.auth-phone-hint{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:24px;padding-left:4px}

/* PIN squares */
.auth-pin-squares{display:flex;gap:12px;justify-content:center;margin:8px 0 28px}
.auth-pin-sq{width:58px;height:68px;background:var(--bg2);border:1.5px solid var(--border2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--text0);transition:all .15s;position:relative}
.auth-pin-sq.active{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.15)}
.auth-pin-sq.filled{border-color:var(--green);background:var(--green-bg)}
.auth-pin-sq.filled::after{content:'●';color:var(--green);font-size:20px}
.auth-pin-sq.error{border-color:var(--red);background:var(--red-bg);animation:shake .3s ease}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}

/* Hidden PIN input */
.auth-pin-hidden{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}

/* Error */
.auth-error{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);font-family:var(--font-b);display:none;margin-bottom:14px;text-align:center}
.auth-error.show{display:block}

/* Spinner */
.auth-spinner{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

/* Phone display on PIN screen */
.auth-phone-badge{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px 16px;display:flex;align-items:center;gap:10px;margin-bottom:24px;cursor:pointer}
.auth-phone-badge:active{background:var(--bg3)}
.auth-phone-badge-num{font-size:16px;color:var(--text0);font-family:var(--font-h);font-weight:600}
.auth-phone-badge-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
</style>`;

const LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 28 28" fill="none">
  <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
  <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const BACK_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ════════════════════════════════════
   VIEW: WELCOME
════════════════════════════════════ */
function viewWelcome() {
  return `
  <div class="auth-view ${_view==='welcome'?'active':''}" id="auth-welcome">
    <div class="auth-inner">
      <div style="flex:1;min-height:40px"></div>
      <div class="auth-logo-wrap">
        <div class="auth-logo-mark">${LOGO_SVG}</div>
        <div>
          <div class="auth-logo-text">BarOps</div>
          <div class="auth-logo-sub">Bar Management AI</div>
        </div>
      </div>
      <div class="auth-tagline">Розумний<br/>помічник<br/><span>для вашого бару</span></div>
      <div class="auth-desc">Автоматизація інвентаризації, накладних та замовлень для HoReCa.</div>
      <div class="auth-pills">
        <div class="auth-pill"><div class="auth-pill-dot"></div>OCR накладних</div>
        <div class="auth-pill"><div class="auth-pill-dot"></div>Smart Ordering</div>
        <div class="auth-pill"><div class="auth-pill-dot"></div>Живий фудкост</div>
        <div class="auth-pill"><div class="auth-pill-dot"></div>Telegram звіти</div>
      </div>
      <div class="auth-spacer"></div>
      <div class="auth-cta">
        <button class="auth-btn auth-btn-primary" onclick="window.__auth.goTo('phone')">
          Увійти
        </button>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════════════════
   VIEW: PHONE
════════════════════════════════════ */
function viewPhone() {
  const phoneDigits = _phone ? _phone.replace('+380','') : '';

  return `
  <div class="auth-view ${_view==='phone'?'active':''}" id="auth-phone">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Номер телефону</div>
          <div class="auth-screen-sub">Введіть ваш номер для входу</div>
        </div>
      </div>

      <!-- Центр екрану як PIN -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">

        <!-- Прапор + поле в одному рядку -->
        <div style="display:flex;align-items:center;gap:0;width:100%;background:var(--bg2);border:1.5px solid ${phoneDigits.length>=9?'var(--green)':'var(--border2)'};border-radius:16px;overflow:hidden;transition:border-color .2s"
             onclick="document.getElementById('phone-inp').focus()">
          <!-- Прапор кнопка -->
          <div style="display:flex;align-items:center;gap:6px;padding:0 14px;height:58px;border-right:0.5px solid var(--border2);flex-shrink:0">
            <span style="font-size:24px">🇺🇦</span>
            <span style="font-size:14px;color:var(--text2);font-family:var(--font-b)">+380</span>
          </div>
          <!-- Поле вводу -->
          <input
            id="phone-inp"
            type="tel"
            inputmode="numeric"
            maxlength="9"
            autocomplete="tel"
            placeholder="XX XXX XX XX"
            value="${phoneDigits}"
            oninput="window.__auth.onPhoneInput(this)"
            onkeydown="if(event.key==='Enter')window.__auth.submitPhone()"
            style="flex:1;height:58px;background:transparent;border:none;outline:none;font-size:22px;font-family:var(--font-h);font-weight:600;color:var(--text0);padding:0 16px;letter-spacing:.04em"
          />
        </div>

        <div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">${phoneDigits.length}/9 цифр</div>

      </div>

      <div class="auth-error" id="phone-err">Введіть коректний номер (9 цифр)</div>

      <button class="auth-btn auth-btn-primary" id="phone-next-btn"
        onclick="window.__auth.submitPhone()"
        ${phoneDigits.length >= 9 ? '' : 'disabled'}>
        Далі →
      </button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════════════════
   VIEW: PIN
════════════════════════════════════ */
function viewPin() {
  const digits = _pin.split('');
  const squares = [0,1,2,3].map(i => {
    const filled = i < digits.length;
    const active = i === digits.length;
    return `<div class="auth-pin-sq ${filled?'filled':''} ${active?'active':''}" onclick="document.getElementById('pin-inp').focus()"></div>`;
  }).join('');

  const displayPhone = _phone || '+380';

  return `
  <div class="auth-view ${_view==='pin'?'active':''}" id="auth-pin">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('phone')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Введіть PIN</div>
          <div class="auth-screen-sub">Пін-код надає менеджер закладу</div>
        </div>
      </div>

      <!-- Показуємо номер телефону -->
      <div class="auth-phone-badge" onclick="window.__auth.goTo('phone')">
        <div style="font-size:20px">🇺🇦</div>
        <div>
          <div class="auth-phone-badge-num">${displayPhone}</div>
          <div class="auth-phone-badge-hint">Натисніть щоб змінити</div>
        </div>
        <div style="margin-left:auto">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>

      <!-- PIN квадратики -->
      <div class="auth-pin-squares" id="pin-squares" onclick="document.getElementById('pin-inp').focus()">
        ${squares}
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:-16px;margin-bottom:16px">
        Введіть свій PIN-код · Пін-код надає менеджер
      </div>

      <!-- Прихований input для PIN (відкриває системну клавіатуру) -->
      <input
        id="pin-inp"
        class="auth-pin-hidden"
        type="tel"
        inputmode="numeric"
        maxlength="4"
        autocomplete="one-time-code"
        oninput="window.__auth.onPinInput(this)"
        onkeydown="window.__auth.onPinKey(event)"
      />

      <div class="auth-error" id="pin-err"></div>

      <div class="auth-spacer"></div>

      <button class="auth-btn auth-btn-primary" id="pin-login-btn"
        onclick="window.__auth.doLogin()"
        ${_pin.length >= 4 ? '' : 'disabled'}>
        Увійти
      </button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════════════════
   NAVIGATION
════════════════════════════════════ */
function goTo(sub) {
  _view = sub;
  // Перемальовуємо
  const container = document.querySelector('.auth-views-wrap');
  if (container) {
    container.innerHTML = viewWelcome() + viewPhone() + viewPin();
  }
  // Фокус
  if (sub === 'phone') {
    setTimeout(() => document.getElementById('phone-inp')?.focus(), 100);
  }
  if (sub === 'pin') {
    _pin = '';
    updatePinSquares();
    setTimeout(() => document.getElementById('pin-inp')?.focus(), 100);
  }
}

/* ════════════════════════════════════
   PHONE LOGIC
════════════════════════════════════ */
function onPhoneInput(inp) {
  let digits = inp.value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('38')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  inp.value = digits;
  _phone = '+380' + digits;

  // Оновлюємо рамку
  const wrap = inp.parentElement;
  if (wrap) wrap.style.borderColor = digits.length >= 9 ? 'var(--green)' : 'var(--border2)';

  // Оновлюємо лічильник
  const counter = wrap?.parentElement?.nextElementSibling;
  if (counter) counter.textContent = digits.length + '/9 цифр';

  const btn = document.getElementById('phone-next-btn');
  if (btn) btn.disabled = digits.length < 9;
  document.getElementById('phone-err')?.classList.remove('show');

  if (digits.length === 9) setTimeout(() => submitPhone(), 400);
}

function submitPhone() {
  const inp = document.getElementById('phone-inp');
  const digits = (inp?.value || '').replace(/\D/g, '');
  if (digits.length < 9) {
    document.getElementById('phone-err')?.classList.add('show');
    return;
  }
  _phone = '+380' + digits;
  goTo('pin');
}

/* ════════════════════════════════════
   PIN LOGIC
════════════════════════════════════ */
function onPinInput(inp) {
  // Тільки цифри, максимум 4
  const digits = inp.value.replace(/\D/g, '').slice(0, 4);
  inp.value = digits;
  _pin = digits;
  updatePinSquares();

  // Автовхід коли 4 цифри
  if (_pin.length === 4) {
    setTimeout(() => doLogin(), 200);
  }
}

function onPinKey(e) {
  if (e.key === 'Enter' && _pin.length === 4) doLogin();
}

function updatePinSquares() {
  const container = document.getElementById('pin-squares');
  if (!container) return;
  const digits = _pin.split('');
  container.innerHTML = [0,1,2,3].map(i => {
    const filled = i < digits.length;
    const active = i === digits.length && document.getElementById('pin-inp') === document.activeElement;
    return `<div class="auth-pin-sq ${filled?'filled':''} ${active?'active':''}" onclick="document.getElementById('pin-inp').focus()"></div>`;
  }).join('');
}

/* ════════════════════════════════════
   LOGIN
════════════════════════════════════ */
async function doLogin() {
  if (_pin.length < 4) return;

  const errEl = document.getElementById('pin-err');
  const btn   = document.getElementById('pin-login-btn');

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="auth-spinner"></span>`; }
  if (errEl) errEl.classList.remove('show');

  // Показуємо помилку на квадратиках
  const showError = (msg) => {
    document.querySelectorAll('.auth-pin-sq').forEach(sq => sq.classList.add('error'));
    setTimeout(() => document.querySelectorAll('.auth-pin-sq').forEach(sq => sq.classList.remove('error')), 600);
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
    _pin = '';
    const inp = document.getElementById('pin-inp');
    if (inp) inp.value = '';
    updatePinSquares();
    if (btn) { btn.disabled = true; btn.innerHTML = 'Увійти'; }
  };

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: _phone, pin: _pin }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Помилка входу');

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
    showError(err.message || 'Невірний PIN або номер');
  }
}

/* ════════════════════════════════════
   LOAD VENUES
════════════════════════════════════ */
async function loadVenues() {
  try {
    const res  = await fetch(`${API}/api/auth/venues`);
    const data = await res.json();
    if (data.venues) _venues = data.venues;
  } catch { /* офлайн */ }
}

/* ════════════════════════════════════
   PAGE MODULE EXPORT
════════════════════════════════════ */
export default {
  render() {
    _view  = 'welcome';
    _phone = '';
    _pin   = '';
    return `
      ${CSS}
      <div class="auth-wrap">
        <div class="auth-views-wrap" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          ${viewWelcome()}
          ${viewPhone()}
          ${viewPin()}
        </div>
      </div>`;
  },

  init() {
    window.__auth = { goTo, onPhoneInput, submitPhone, onPinInput, onPinKey, doLogin };

    loadVenues();

    // Відновлюємо сесію якщо токен є
    const token = localStorage.getItem('barops_token');
    if (token) {
      state.role  = localStorage.getItem('barops_role')  || 'bartender';
      state.venue = localStorage.getItem('barops_venue') || '';
      state.user  = localStorage.getItem('barops_user')  || '';
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => {
        if (r.ok) {
          navigate('dashboard');
        } else {
          localStorage.removeItem('barops_token');
          localStorage.removeItem('barops_refresh');
          localStorage.removeItem('barops_venue');
          localStorage.removeItem('barops_role');
          localStorage.removeItem('barops_user');
        }
      }).catch(() => {
        if (state.venue && state.role) navigate('dashboard');
      });
    }
  },
};
