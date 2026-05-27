/* ============================================================
   BarOps — pages/auth.js  v4
   Стани: pin | setup | admin-login | reg-1 | reg-2 | reg-3
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _view       = 'pin';
let _phone      = '';
let _pin        = '';
let _pinLoading = false;

let _mgr        = { email: '', password: '' };
let _mgrLoading = false;
let _mgrError   = '';

let _reg        = { name: '', email: '', phone: '', password: '', venueName: '' };
let _regLoading = false;
let _otpUserId  = '';
let _otpCode    = '';
let _otpLoading = false;
let _otpError   = '';


const BOTTLE_SVG = `<svg width="44" height="76" viewBox="0 0 52 90" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="18" y="1" width="16" height="9" rx="1.5" stroke="white" stroke-width="2" fill="none"/>
  <line x1="21" y1="4.5" x2="33" y2="4.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="21" y1="7.5" x2="33" y2="7.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M18 10 h16 v10 c0 0 8 8 8 20 v40 a6 6 0 01-6 6 h-20 a6 6 0 01-6-6 V40 c0-12 8-20 8-20 V10" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
  <rect x="12" y="52" width="28" height="22" rx="4" fill="#A88BFF"/>
  <text x="26" y="68" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif" font-size="14" font-weight="800" fill="#0A0A0A">B</text>
</svg>`;

const BACK_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ════════════════════════════════════════
   CSS
════════════════════════════════════════ */
const CSS = `<style id="auth-styles">
.auth-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.auth-views-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.auth-view{display:none;flex-direction:column;flex:1;overflow:hidden}
.auth-view.active{display:flex;animation:authFade 260ms ease both}
@keyframes authFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ── PIN NUMPAD SCREEN ── */
.apin-full{flex:1;display:flex;flex-direction:column;align-items:stretch;padding-bottom:12px}
.apin-logo{display:flex;flex-direction:column;align-items:center;padding-top:32px;gap:8px;flex-shrink:0}
.apin-wordmark{font-family:'Geist',system-ui,sans-serif;font-size:28px;font-weight:600;color:#fff;letter-spacing:-.045em;line-height:1}
.apin-wordmark span{color:#A88BFF}
.apin-dots-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;margin:24px 0 8px}
.apin-dots{display:flex;gap:14px;justify-content:center}
.apin-dot{width:14px;height:14px;border-radius:50%;background:transparent;border:2px solid var(--border2);transition:background .12s,border-color .12s,transform .12s}
.apin-dot.filled{background:var(--green);border-color:var(--green);transform:scale(1.1)}
.apin-dot.error{background:var(--red);border-color:var(--red);animation:dotShake .32s ease}
@keyframes dotShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.apin-err{min-height:20px;text-align:center;font-size:12px;color:var(--red);font-family:var(--font-b);padding:4px 20px 0;flex-shrink:0}
.apin-numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 20px;flex:1;max-height:252px;min-height:200px;width:100%;box-sizing:border-box}
.apin-key{border-radius:14px;background:var(--bg2);border:0.5px solid var(--border);font-family:var(--font-h);font-size:22px;font-weight:500;color:var(--text0);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .1s,transform .1s;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.apin-key:active{background:var(--bg3);transform:scale(.90)}
.apin-key.empty{background:transparent;border:none;pointer-events:none}
.apin-footer{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 20px 0;flex-shrink:0}
.apin-phone-hint{font-size:11px;color:var(--text3);font-family:var(--font-b);display:flex;align-items:center;gap:8px}
.apin-change{color:var(--text2);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.apin-change:active{color:var(--text0)}
.apin-links{display:flex;gap:4px;align-items:center}
.apin-link{font-size:13px;color:var(--text2);font-family:var(--font-b);cursor:pointer;padding:6px 12px;border-radius:8px;transition:background .12s}
.apin-link:active{background:var(--bg2)}
.apin-link-sep{color:var(--border2);font-size:14px;line-height:1}

/* ── SETUP & INNER SCREENS ── */
.auth-inner{flex:1;display:flex;flex-direction:column;padding:0 24px 32px;overflow-y:auto}
.auth-inner::-webkit-scrollbar{display:none}
.auth-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;margin-top:16px}
.auth-inp{width:100%;height:54px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;color:var(--text0);font-size:16px;font-family:var(--font-h);font-weight:500;padding:0 16px;box-sizing:border-box;outline:none;transition:border-color .2s,box-shadow .2s;-webkit-text-fill-color:var(--text0)}
.auth-inp:focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-bg)}
.auth-inp::placeholder{color:var(--text3);-webkit-text-fill-color:var(--text3);font-size:14px;font-weight:400;font-family:var(--font-b)}
.auth-inp:-webkit-autofill,.auth-inp:-webkit-autofill:hover,.auth-inp:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px var(--glass-bg) inset!important;-webkit-text-fill-color:var(--text0)!important;caret-color:var(--text0)}
.auth-phone-wrap{background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;display:flex;align-items:center;padding:0 14px;height:56px;margin-bottom:14px;transition:border-color .2s,box-shadow .2s}
.auth-phone-wrap:focus-within{border-color:var(--green);box-shadow:0 0 0 3px var(--green-bg)}
.auth-btn{width:100%;height:56px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);transition:all .18s}
.auth-btn-primary{background:var(--green);color:#000}
.auth-btn-primary:active{filter:brightness(.90);transform:scale(.98)}
.auth-btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;filter:none}
.auth-spacer{flex:1;min-height:16px}
.auth-error{background:var(--red-bg);border:1px solid var(--red-border);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);font-family:var(--font-b);display:none;margin-bottom:14px;text-align:center}
.auth-error.show{display:block;animation:authFade .2s ease}
.auth-spinner{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:authSpin .8s linear infinite;display:inline-block;vertical-align:middle}
@keyframes authSpin{to{transform:rotate(360deg)}}
.auth-header{display:flex;align-items:center;gap:12px;margin-top:24px;margin-bottom:28px}
.auth-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.auth-back:active{background:rgba(255,255,255,.10)}
.auth-screen-title{font-family:var(--font-h);font-size:21px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.auth-screen-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.auth-steps{display:flex;gap:6px;justify-content:center;margin-bottom:28px}
.auth-step{height:3px;border-radius:2px;flex:1;background:var(--border);transition:background .3s}
.auth-step.done{background:var(--green)}
.auth-step.active{background:var(--green);opacity:.6}
.auth-trial-badge{background:var(--green-bg);border:1px solid var(--green-border);border-radius:14px;padding:16px;margin-bottom:20px;text-align:center}
.auth-trial-num{font-family:var(--font-h);font-size:48px;font-weight:800;color:var(--green);line-height:1}
.auth-trial-lbl{font-size:13px;color:var(--green);font-family:var(--font-b);margin-top:4px}
#setup-phone-inp::placeholder{color:var(--text3);-webkit-text-fill-color:var(--text3);font-weight:400;font-size:15px}
.venue-pick-list{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.venue-pick-item{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:16px 18px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:background .12s,border-color .12s}
.venue-pick-item:active{background:var(--bg3);border-color:var(--green)}
.venue-pick-name{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0)}
</style>`;

/* ════════════════════════════════════════
   VIEW: PIN NUMPAD (головний екран)
════════════════════════════════════════ */
function viewPin() {
  const maskedPhone = _phone
    ? _phone.slice(0, 5) + '***' + _phone.slice(-2)
    : '';
  const dots = [0,1,2,3].map(i =>
    `<div class="apin-dot${_pin.length > i ? ' filled' : ''}"></div>`
  ).join('');
  return `
  <div class="auth-view ${_view==='pin'?'active':''}" id="auth-pin">
    <div class="apin-full">
      <div class="apin-logo">
        ${BOTTLE_SVG}
        <div class="apin-wordmark">bar<span>ops.</span></div>
      </div>
      <div class="apin-dots-wrap">
        <div class="apin-dots" id="apin-dots">${dots}</div>
      </div>
      <div class="apin-err" id="apin-err"></div>
      <div class="apin-numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n =>
          `<div class="apin-key" onclick="window.__auth.numPress(${n})">${n}</div>`
        ).join('')}
        <div class="apin-key empty"></div>
        <div class="apin-key" onclick="window.__auth.numPress(0)">0</div>
        <div class="apin-key" onclick="window.__auth.numDelete()">
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
            <path d="M8 1H20a1 1 0 011 1v12a1 1 0 01-1 1H8L1 8l7-7z" stroke="var(--text1)" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M14 5.5l-5 5M9 5.5l5 5" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="apin-footer">
        ${maskedPhone ? `
        <div class="apin-phone-hint">
          <span>${maskedPhone}</span>
          <span class="apin-change" onclick="window.__auth.changeAccount()">Змінити акаунт</span>
        </div>` : ''}
        <div class="apin-links">
          <span class="apin-link" onclick="window.__auth.goTo('admin-login')">ADMIN</span>
          <span class="apin-link-sep">·</span>
          <span class="apin-link" onclick="window.__auth.goTo('reg-1')">Зареєструватись</span>
        </div>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   VIEW: SETUP (перший запуск — ввести телефон)
════════════════════════════════════════ */
function viewSetup() {
  const phoneDigits = _phone ? _phone.replace('+38', '') : '';
  return `
  <div class="auth-view ${_view==='setup'?'active':''}" id="auth-setup">
    <div class="auth-inner">
      <div style="display:flex;flex-direction:column;align-items:center;margin-top:48px;margin-bottom:32px;gap:10px">
        ${BOTTLE_SVG}
        <div style="font-family:'Geist',system-ui,sans-serif;font-size:28px;font-weight:600;color:#fff;letter-spacing:-.045em">bar<span style="color:#A88BFF">ops.</span></div>
      </div>
      <div class="auth-lbl">Номер телефону</div>
      <div class="auth-phone-wrap" onclick="document.getElementById('setup-phone-inp').focus()">
        <span style="font-family:var(--font-b);font-size:15px;color:var(--text1);white-space:nowrap;flex-shrink:0">+38</span>
        <input id="setup-phone-inp" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel"
          placeholder="0671234567" value="${phoneDigits}"
          oninput="window.__auth.onSetupPhoneInput(this)"
          onkeydown="if(event.key==='Enter')window.__auth.submitSetup()"
          style="flex:1;height:100%;background:transparent;border:none;outline:none;font-size:17px;font-family:var(--font-h);font-weight:600;color:var(--text0);padding:0 0 0 10px;-webkit-text-fill-color:var(--text0)"/>
      </div>
      <div class="auth-error" id="setup-err">Введіть коректний номер</div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="setup-next-btn"
        onclick="window.__auth.submitSetup()" ${phoneDigits.length >= 10 ? '' : 'disabled'}>
        Продовжити →
      </button>
      <div style="display:flex;justify-content:center;gap:24px;margin-top:16px">
        <span onclick="window.__auth.goTo('admin-login')"
          style="font-size:13px;color:var(--text2);font-family:var(--font-b);cursor:pointer;padding:4px 0">
          ADMIN →
        </span>
        <span onclick="window.__auth.goTo('reg-1')"
          style="font-size:13px;color:var(--text2);font-family:var(--font-b);cursor:pointer;padding:4px 0">
          Зареєструватись →
        </span>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:11px;color:var(--text3);font-family:var(--font-b)">v3.2</div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   VIEW: ADMIN LOGIN
════════════════════════════════════════ */
function viewAdminLogin() {
  return `
  <div class="auth-view ${_view==='admin-login'?'active':''}" id="auth-admin-login">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goBackFromAdmin()">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Вхід адміна</div>
          <div class="auth-screen-sub">Email і пароль</div>
        </div>
      </div>
      <div class="auth-lbl">Email</div>
      <input class="auth-inp" id="mgr-email" type="email" inputmode="email"
        placeholder="your@email.com" value="${_mgr.email}"
        oninput="window.__auth.mgrField('email',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('mgr-pass').focus()"/>
      <div class="auth-lbl">Пароль</div>
      <input class="auth-inp" id="mgr-pass" type="password"
        placeholder="" value="${_mgr.password}"
        oninput="window.__auth.mgrField('password',this.value)"
        onkeydown="if(event.key==='Enter')window.__auth.doManagerLogin()"/>
      <div class="auth-error ${_mgrError?'show':''}" id="mgr-err">${_mgrError}</div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="mgr-login-btn"
        onclick="window.__auth.doManagerLogin()"
        ${_mgrLoading ? 'disabled' : ''}>
        ${_mgrLoading ? '<span class="auth-spinner"></span>' : 'Увійти'}
      </button>
      <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text2);font-family:var(--font-b)">
        Немає акаунту?
        <span onclick="window.__auth.goTo('reg-1')" style="color:var(--green);cursor:pointer;font-weight:600"> Зареєструватись</span>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   VIEW: REGISTER STEPS
════════════════════════════════════════ */
function viewReg1() {
  return `
  <div class="auth-view ${_view==='reg-1'?'active':''}" id="auth-reg-1">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('admin-login')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Реєстрація</div>
          <div class="auth-screen-sub">Крок 1 з 2 — Ваші дані</div>
        </div>
      </div>
      <div class="auth-steps"><div class="auth-step active"></div><div class="auth-step"></div></div>
      <div class="auth-lbl">Ім'я та прізвище</div>
      <input class="auth-inp" id="reg-name" type="text" placeholder="Олексій Коваленко" value="${_reg.name}"
        oninput="window.__auth.regField('name',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('reg-phone').focus()"/>
      <div class="auth-lbl">Телефон</div>
      <input class="auth-inp" id="reg-phone" type="tel" inputmode="tel" placeholder="+380 67 123 4567" value="${_reg.phone}"
        oninput="window.__auth.regField('phone',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('reg-email').focus()"/>
      <div class="auth-lbl">Email</div>
      <input class="auth-inp" id="reg-email" type="email" inputmode="email" placeholder="your@email.com" value="${_reg.email}"
        oninput="window.__auth.regField('email',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('reg-pass').focus()"/>
      <div class="auth-lbl">Пароль</div>
      <input class="auth-inp" id="reg-pass" type="password" placeholder="Мінімум 6 символів" value="${_reg.password}"
        oninput="window.__auth.regField('password',this.value)"
        onkeydown="if(event.key==='Enter')window.__auth.goToReg2()"/>
      <div class="auth-error" id="reg1-err"></div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" onclick="window.__auth.goToReg2()">Далі →</button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

function viewReg2() {
  return `
  <div class="auth-view ${_view==='reg-2'?'active':''}" id="auth-reg-2">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('reg-1')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Ваш заклад</div>
          <div class="auth-screen-sub">Крок 2 з 2 — Назва закладу</div>
        </div>
      </div>
      <div class="auth-steps"><div class="auth-step done"></div><div class="auth-step active"></div></div>
      <div class="auth-lbl">Назва закладу</div>
      <input class="auth-inp" id="reg-venue" type="text" placeholder="Sky Lounge, Bar Noir..." value="${_reg.venueName}"
        oninput="window.__auth.regField('venueName',this.value)"
        onkeydown="if(event.key==='Enter')window.__auth.doRegister()"/>
      <div class="auth-error" id="reg2-err"></div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="reg-submit-btn"
        onclick="window.__auth.doRegister()" ${_regLoading ? 'disabled' : ''}>
        ${_regLoading ? '<span class="auth-spinner"></span>' : 'Почати 7 днів безкоштовно'}
      </button>
      <div style="text-align:center;margin-top:10px;font-size:11px;color:var(--text2);font-family:var(--font-b)">
        Без прив'язки картки · Скасувати будь-коли
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

function viewRegOtp() {
  const maskedEmail = _reg.email
    ? _reg.email.replace(/(.{2}).+(@.+)/, '$1***$2')
    : '';
  return `
  <div class="auth-view ${_view==='reg-otp'?'active':''}" id="auth-reg-otp">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('reg-2')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Підтвердження</div>
          <div class="auth-screen-sub">Перевірте пошту</div>
        </div>
      </div>
      <div style="background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;text-align:center">
        <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Код надіслано на</div>
        <div style="font-size:15px;font-family:var(--font-h);font-weight:600;color:var(--text0);margin-top:4px">${maskedEmail}</div>
      </div>
      <div class="auth-lbl">6-значний код</div>
      <input class="auth-inp" id="otp-inp" type="text" inputmode="numeric" maxlength="6"
        placeholder="000000" value="${_otpCode}"
        style="font-size:28px;font-family:var(--font-h);font-weight:700;letter-spacing:8px;text-align:center"
        oninput="window.__auth.onOtpInput(this)"
        onkeydown="if(event.key==='Enter')window.__auth.doVerifyOtp()"/>
      <div class="auth-error ${_otpError?'show':''}" id="otp-err">${_otpError}</div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="otp-btn"
        onclick="window.__auth.doVerifyOtp()" ${_otpLoading?'disabled':''}>
        ${_otpLoading?'<span class="auth-spinner"></span>':'Підтвердити →'}
      </button>
      <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text2);font-family:var(--font-b)">
        Не отримали?
        <span onclick="window.__auth.resendOtp()" style="color:var(--purple);cursor:pointer;font-weight:600"> Надіслати ще раз</span>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

function viewReg3() {
  const PLANS = [
    { key:'starter', name:'Старт',      price:'990',  per:'міс', color:'var(--green)',  features:['1 заклад','До 10 співробітників','Списання, склад, звіти','Email підтримка'] },
    { key:'pro',     name:'Про',        price:'1990', per:'міс', color:'var(--purple)', features:['3 заклади','Необмежена команда','AI-закупівля','Пріоритетна підтримка'], badge:'Популярний' },
    { key:'enter',   name:'Підприємство',price:'?',   per:'',    color:'var(--amber)',  features:['10+ закладів','API-доступ','Виділений менеджер','SLA 99.9%'] },
  ];
  return `
  <div class="auth-view ${_view==='reg-3'?'active':''}" id="auth-reg-3">
    <div class="auth-inner">
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:24px;margin-bottom:28px">
        <div style="width:72px;height:72px;border-radius:20px;background:var(--green);display:flex;align-items:center;justify-content:center;margin-bottom:16px">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M9 18l6 6 12-12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div style="font-family:var(--font-h);font-size:24px;font-weight:800;color:var(--text0)">Вітаємо!</div>
        <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-top:6px;line-height:1.6">
          Заклад <strong style="color:var(--text0)">${_reg.venueName}</strong> створено.<br/>
          <span style="color:var(--green);font-weight:600">7 днів безкоштовно</span> — без картки.
        </div>
      </div>

      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px">Оберіть план після тріалу</div>
      ${PLANS.map(p => `
      <div style="background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px">
        <div style="width:38px;height:38px;border-radius:10px;background:${p.color}22;border:0.5px solid ${p.color}44;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:16px;font-family:var(--font-h);font-weight:800;color:${p.color}">${p.price==='?'?'?':''}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:14px;font-family:var(--font-h);font-weight:700;color:var(--text0)">${p.name}</span>
            ${p.badge?`<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:${p.color}22;color:${p.color};font-family:var(--font-b);font-weight:600">${p.badge}</span>`:''}
            <span style="margin-left:auto;font-size:15px;font-family:var(--font-h);font-weight:700;color:${p.color}">${p.price==='?'?'Запит':'₴'+p.price}<span style="font-size:11px;color:var(--text2);font-family:var(--font-b)"> /${p.per}</span></span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${p.features.map(f=>`<span style="font-size:11px;color:var(--text2);font-family:var(--font-b)">${f}</span>`).join('<span style="color:var(--border2);font-size:11px"> · </span>')}
          </div>
        </div>
      </div>`).join('')}

      <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);text-align:center;margin:8px 0 16px">
        Обираєте пізніше — оплата лише після закінчення тріалу
      </div>
      <button class="auth-btn auth-btn-primary" onclick="window.__auth.enterApp()">
        Перейти до додатку →
      </button>
      <div style="height:16px"></div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
function rerender() {
  const c = document.querySelector('.auth-views-wrap');
  if (!c) return;
  c.innerHTML = viewPin() + viewSetup() + viewAdminLogin() + viewReg1() + viewReg2() + viewRegOtp() + viewReg3();
}

function goTo(sub) {
  _view = sub;
  rerender();
  if (sub === 'admin-login') setTimeout(() => document.getElementById('mgr-email')?.focus(), 100);
  if (sub === 'reg-1')       setTimeout(() => document.getElementById('reg-name')?.focus(), 100);
  if (sub === 'reg-2')       setTimeout(() => document.getElementById('reg-venue')?.focus(), 100);
  if (sub === 'reg-otp')     { _otpCode = ''; _otpError = ''; setTimeout(() => document.getElementById('otp-inp')?.focus(), 100); }
  if (sub === 'setup')       setTimeout(() => document.getElementById('setup-phone-inp')?.focus(), 100);
  if (sub === 'pin')         { _pin = ''; }
}

function goBackFromAdmin() {
  goTo(localStorage.getItem('barops_phone') ? 'pin' : 'setup');
}

function showComingSoon() {
  alert('Реєстрація буде доступна незабаром.');
}

/* ════════════════════════════════════════
   PIN NUMPAD
════════════════════════════════════════ */
function updatePinDots() {
  const c = document.getElementById('apin-dots');
  if (!c) return;
  c.innerHTML = [0,1,2,3].map(i =>
    `<div class="apin-dot${_pin.length > i ? ' filled' : ''}"></div>`
  ).join('');
}

function numPress(n) {
  if (_pinLoading || _pin.length >= 4) return;
  _pin += String(n);
  updatePinDots();
  const errEl = document.getElementById('apin-err');
  if (errEl) errEl.textContent = '';
  if (_pin.length === 4) setTimeout(doLogin, 120);
}

function numDelete() {
  if (_pinLoading) return;
  _pin = _pin.slice(0, -1);
  updatePinDots();
}

async function doLogin() {
  if (_pin.length < 4) return;
  _pinLoading = true;

  const showError = (msg) => {
    _pinLoading = false;
    _pin = '';
    updatePinDots();
    document.querySelectorAll('.apin-dot').forEach(d => {
      d.classList.add('error');
      setTimeout(() => d.classList.remove('error'), 400);
    });
    const errEl = document.getElementById('apin-err');
    if (errEl) errEl.textContent = msg;
  };

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: _phone, pin: _pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка входу');
    saveSession(data);
    navigate(data.user.role === 'accountant' ? 'debts' : 'dashboard');
  } catch (err) {
    showError(err.message || 'Невірний PIN');
  }
}

/* ════════════════════════════════════════
   SETUP (one-time phone)
════════════════════════════════════════ */
function onSetupPhoneInput(inp) {
  let digits = inp.value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(2); // +380... → 0...
  digits = digits.slice(0, 10);
  inp.value = digits;
  _phone = '+38' + digits;
  const btn = document.getElementById('setup-next-btn');
  if (btn) btn.disabled = digits.length < 10;
  document.getElementById('setup-err')?.classList.remove('show');
  if (digits.length === 10) setTimeout(() => submitSetup(), 400);
}

function submitSetup() {
  const inp    = document.getElementById('setup-phone-inp');
  const digits = (inp?.value || '').replace(/\D/g, '');
  if (digits.length < 10) { document.getElementById('setup-err')?.classList.add('show'); return; }
  _phone = '+38' + digits;
  localStorage.setItem('barops_phone', _phone);
  _pin = '';
  goTo('pin');
}

function changeAccount() {
  localStorage.removeItem('barops_phone');
  _phone = '';
  _pin   = '';
  goTo('setup');
}

/* ════════════════════════════════════════
   ADMIN LOGIN
════════════════════════════════════════ */
function mgrField(field, value) { _mgr[field] = value; }

async function doManagerLogin() {
  const errEl = document.getElementById('mgr-err');
  if (!_mgr.email || !_mgr.password) {
    if (errEl) { errEl.textContent = 'Введіть email і пароль'; errEl.classList.add('show'); }
    return;
  }
  _mgrLoading = true; _mgrError = ''; rerender();
  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: _mgr.email.toLowerCase().trim(), password: _mgr.password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка входу');
    saveSession(data);
    navigate(data.user.role === 'accountant' ? 'debts' : 'dashboard');
  } catch (err) {
    _mgrLoading = false; _mgrError = err.message; rerender();
  }
}

/* ════════════════════════════════════════
   REGISTRATION
════════════════════════════════════════ */
function regField(field, value) { _reg[field] = value; }

function goToReg2() {
  const errEl = document.getElementById('reg1-err');
  if (!_reg.name?.trim()) {
    if (errEl) { errEl.textContent = 'Введіть ім\'я'; errEl.classList.add('show'); } return;
  }
  const em = _reg.email.toLowerCase().trim();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    if (errEl) { errEl.textContent = 'Введіть коректний email'; errEl.classList.add('show'); } return;
  }
  if (!_reg.password || _reg.password.length < 6) {
    if (errEl) { errEl.textContent = 'Пароль мінімум 6 символів'; errEl.classList.add('show'); } return;
  }
  goTo('reg-2');
}

async function doRegister() {
  if (!_reg.venueName?.trim()) {
    const errEl = document.getElementById('reg2-err');
    if (errEl) { errEl.style.cssText = 'display:block;color:var(--red);font-size:13px;margin-top:8px'; errEl.textContent = 'Введіть назву закладу'; }
    return;
  }
  _regLoading = true; rerender();

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method:  'POST',
      signal:  ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:      _reg.name.trim(),
        email:     _reg.email.toLowerCase().trim(),
        phone:     _reg.phone.trim() || undefined,
        password:  _reg.password,
        venueName: _reg.venueName.trim(),
      }),
    });
    clearTimeout(timer);
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
    _otpUserId = data.userId;
    _regLoading = false;
    goTo('reg-otp');
  } catch (err) {
    clearTimeout(timer);
    _regLoading = false; rerender();
    const msg = err.name === 'AbortError' ? 'Час очікування (15с). Перевірте інтернет.' : err.message;
    const e = document.getElementById('reg2-err');
    if (e) { e.style.cssText = 'display:block;color:var(--red);font-size:13px;margin-top:8px'; e.textContent = msg; }
    console.error('[doRegister]', err.name, err.message);
  }
}

function onOtpInput(inp) {
  _otpCode = inp.value.replace(/\D/g, '').slice(0, 6);
  inp.value = _otpCode;
  const errEl = document.getElementById('otp-err');
  if (errEl) errEl.classList.remove('show');
  if (_otpCode.length === 6) setTimeout(() => doVerifyOtp(), 120);
}

async function doVerifyOtp() {
  if (_otpCode.length < 6) {
    const e = document.getElementById('otp-err');
    if (e) { e.textContent = 'Введіть 6-значний код'; e.classList.add('show'); }
    return;
  }
  _otpLoading = true; _otpError = ''; rerender();
  try {
    const res  = await fetch(`${API}/api/auth/verify-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: _otpUserId, otp: _otpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Невірний код');
    saveSession(data);
    _otpLoading = false;
    goTo('reg-3');
  } catch (err) {
    _otpLoading = false;
    _otpError   = err.message;
    rerender();
  }
}

async function resendOtp() {
  if (!_otpUserId) return;
  try {
    const res = await fetch(`${API}/api/auth/resend-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: _otpUserId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка');
    const e = document.getElementById('otp-err');
    if (e) { e.textContent = 'Новий код надіслано на пошту'; e.classList.add('show'); }
  } catch (err) {
    const e = document.getElementById('otp-err');
    if (e) { e.textContent = err.message; e.classList.add('show'); }
  }
}

function enterApp() {
  navigate(state.role === 'accountant' ? 'debts' : 'dashboard');
}

/* ════════════════════════════════════════
   SESSION HELPERS
════════════════════════════════════════ */
function saveSession(data) {
  localStorage.setItem('barops_token',          data.token);
  localStorage.setItem('barops_refresh',        data.refreshToken || '');
  localStorage.setItem('barops_role',           data.user.role);
  localStorage.setItem('barops_user',           data.user.name);
  localStorage.setItem('barops_telegram_topic', data.user.telegramTopicId || '');
  if (data.user.phone) {
    localStorage.setItem('barops_phone', data.user.phone);
    _phone = data.user.phone;
  }
  state.role = data.user.role;
  state.user = data.user.name;

  // Для адміна/менеджера зберігаємо їх вибраний заклад, не перезаписуємо JWT-значенням
  const isMulti  = ['admin', 'ADMIN', 'manager', 'MANAGER'].includes(data.user.role);
  const savedId  = localStorage.getItem('barops_venueId');
  if (isMulti && savedId) {
    state.venue   = localStorage.getItem('barops_venue') || data.user.venueName || '';
    state.venueId = savedId;
  } else {
    localStorage.setItem('barops_venue',   data.user.venueName || '');
    localStorage.setItem('barops_venueId', data.user.venueId   || '');
    state.venue   = data.user.venueName || '';
    state.venueId = data.user.venueId   || '';
  }
  state.user    = data.user.name;
  if (data.user.plan) {
    localStorage.setItem('barops_plan',   data.user.plan.plan   || 'trial');
    localStorage.setItem('barops_expiry', data.user.plan.expiry || '');
  }
}

/* ════════════════════════════════════════
   PAGE MODULE
════════════════════════════════════════ */
export default {
  render() {
    const storedPhone = localStorage.getItem('barops_phone');
    _view       = storedPhone ? 'pin' : 'setup';
    _phone      = storedPhone || '';
    _pin        = '';
    _pinLoading = false;
    _mgrError   = '';
    _mgrLoading = false;
    _regLoading = false;
    _otpUserId  = '';
    _otpCode    = '';
    _otpLoading = false;
    _otpError   = '';
    return `
      ${CSS}
      <div class="auth-wrap">
        <div class="auth-views-wrap" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          ${viewPin()}${viewSetup()}${viewAdminLogin()}${viewReg1()}${viewReg2()}${viewRegOtp()}${viewReg3()}
        </div>
      </div>`;
  },

  init() {
    window.__auth = {
      goTo, goBackFromAdmin, showComingSoon,
      numPress, numDelete,
      onSetupPhoneInput, submitSetup, changeAccount,
      mgrField, doManagerLogin,
      regField, goToReg2, doRegister, enterApp,
      onOtpInput, doVerifyOtp, resendOtp,
    };

    const token = localStorage.getItem('barops_token');
    if (token) {
      state.role    = localStorage.getItem('barops_role')    || 'bartender';
      state.venue   = localStorage.getItem('barops_venue')   || '';
      state.venueId = localStorage.getItem('barops_venueId') || '';
      state.user    = localStorage.getItem('barops_user')    || '';
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
          if (r.ok) {
            const data = await r.json();
            if (data.user) {
              state.role = data.user.role;
              state.user = data.user.name;
              const isMulti2 = ['admin', 'ADMIN', 'manager', 'MANAGER'].includes(data.user.role);
              const savedId2 = localStorage.getItem('barops_venueId');
              if (isMulti2 && savedId2) {
                state.venue   = localStorage.getItem('barops_venue') || data.user.venueName || '';
                state.venueId = savedId2;
              } else {
                state.venue   = data.user.venueName || '';
                state.venueId = data.user.venueId   || '';
              }
            }
            navigate(state.role === 'accountant' ? 'debts' : 'dashboard');
          } else {
            const refreshToken = localStorage.getItem('barops_refresh');
            if (refreshToken) {
              try {
                const rr = await fetch(`${API}/api/auth/refresh`, {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ refreshToken }),
                });
                const rd = await rr.json();
                if (rr.ok && rd.token) {
                  localStorage.setItem('barops_token', rd.token);
                  if (rd.role) { state.role = rd.role; localStorage.setItem('barops_role', rd.role); }
                  navigate(state.role === 'accountant' ? 'debts' : 'dashboard');
                  return;
                }
              } catch {}
            }
            ['barops_token','barops_refresh','barops_role','barops_user',
             'barops_venue','barops_venueId','barops_telegram_topic'].forEach(k => localStorage.removeItem(k));
            navigate('auth', { replace: true });
          }
        })
        .catch(() => {
          if (state.venue && state.role) navigate(state.role === 'accountant' ? 'debts' : 'dashboard');
        });
    }
  },
};
