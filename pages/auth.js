/* ============================================================
   BarOps — pages/auth.js
   welcome | login-choice | manager-login | register (3 кроки) | phone | pin
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

// Стан
let _view = 'welcome'; // welcome | login-choice | manager-login | reg-1 | reg-2 | reg-3 | phone | pin
let _phone = '';
let _pin   = '';

// Реєстрація
let _reg = { name: '', email: '', password: '', venueName: '' };
let _regLoading = false;
let _regError   = '';

// Менеджер логін
let _mgr = { email: '', password: '' };
let _mgrLoading = false;
let _mgrError   = '';

const LOGO_SVG = `<svg width="26" height="26" viewBox="0 0 28 28" fill="none">
  <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
  <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;
const BACK_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="auth-styles">
.auth-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.auth-inner{flex:1;display:flex;flex-direction:column;padding:0 24px 32px;overflow-y:auto}
.auth-inner::-webkit-scrollbar{display:none}
.auth-view{display:none;flex-direction:column;flex:1}
.auth-view.active{display:flex;animation:fadeUp 280ms ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.auth-logo-wrap{display:flex;align-items:center;gap:14px;margin-top:48px;margin-bottom:8px}
.auth-logo-mark{width:52px;height:52px;border-radius:16px;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 28px rgba(29,158,117,.35);position:relative;overflow:hidden}
.auth-logo-mark::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,transparent 60%)}
.auth-logo-text{font-family:var(--font-h);font-size:30px;font-weight:800;color:var(--text0);letter-spacing:-.03em}
.auth-logo-sub{font-size:11px;color:var(--text2);letter-spacing:.12em;text-transform:uppercase;font-family:var(--font-b)}
.auth-tagline{margin-top:32px;font-family:var(--font-h);font-size:24px;font-weight:700;color:var(--text0);line-height:1.25;letter-spacing:-.02em}
.auth-tagline span{color:var(--green)}
.auth-desc{margin-top:10px;font-size:13px;color:var(--text1);line-height:1.65;font-family:var(--font-b);font-weight:300}
.auth-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}
.auth-pill{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:20px;padding:5px 11px;font-size:11px;color:var(--text1);font-family:var(--font-b)}
.auth-pill-dot{width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0}
.auth-spacer{flex:1;min-height:24px}
.auth-btn{width:100%;height:54px;border:none;border-radius:16px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);letter-spacing:.01em;transition:all .18s}
.auth-btn-primary{background:var(--green);color:#fff;box-shadow:0 4px 20px rgba(29,158,117,.28)}
.auth-btn-primary:active{background:var(--green-d);transform:scale(.98)}
.auth-btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none}
.auth-btn-ghost{background:transparent;color:var(--text2);border:0.5px solid var(--border2);margin-top:10px}
.auth-btn-ghost:active{background:rgba(255,255,255,.04)}
.auth-btn-outline{background:transparent;color:var(--green);border:1.5px solid var(--green);margin-top:10px}
.auth-btn-outline:active{background:var(--green-bg)}
.auth-cta{display:flex;flex-direction:column;gap:0;padding-bottom:4px}
.auth-header{display:flex;align-items:center;gap:12px;margin-top:24px;margin-bottom:28px}
.auth-back{width:38px;height:38px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.auth-back:active{background:var(--bg3)}
.auth-screen-title{font-family:var(--font-h);font-size:21px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.auth-screen-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
/* inputs */
.auth-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;margin-top:16px}
.auth-inp{width:100%;height:54px;background:var(--bg2);border:1.5px solid var(--border2);border-radius:14px;color:var(--text0);font-size:16px;font-family:var(--font-h);font-weight:500;padding:0 16px;box-sizing:border-box;outline:none;transition:border-color .2s;-webkit-text-fill-color:var(--text0)}
.auth-inp:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,158,117,.08)}
.auth-inp::placeholder{color:var(--text2);font-size:14px;font-weight:400;font-family:var(--font-b)}
/* phone */
.auth-phone-wrap{background:var(--bg2);border:1.5px solid var(--border2);border-radius:16px;display:flex;align-items:center;gap:0;overflow:hidden;margin-bottom:8px;transition:border-color .2s}
.auth-phone-wrap:focus-within{border-color:var(--green);box-shadow:0 0 0 3px rgba(29,158,117,.08)}
.auth-phone-flag{width:56px;height:56px;display:flex;align-items:center;justify-content:center;border-right:0.5px solid var(--border2);flex-shrink:0;font-size:24px}
/* pin */
.auth-pin-squares{display:flex;gap:12px;justify-content:center;margin:8px 0 28px}
.auth-pin-sq{width:58px;height:68px;background:var(--bg2);border:1.5px solid var(--border2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--text0);transition:all .15s;position:relative}
.auth-pin-sq.active{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.15)}
.auth-pin-sq.filled{border-color:var(--green);background:var(--green-bg)}
.auth-pin-sq.filled::after{content:'●';color:var(--green);font-size:20px}
.auth-pin-sq.error{border-color:var(--red);background:var(--red-bg);animation:shake .3s ease}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.auth-pin-hidden{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.auth-phone-badge{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px 16px;display:flex;align-items:center;gap:10px;margin-bottom:24px;cursor:pointer}
.auth-phone-badge:active{background:var(--bg3)}
/* error */
.auth-error{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);font-family:var(--font-b);display:none;margin-bottom:14px;text-align:center}
.auth-error.show{display:block;animation:fadeUp .2s ease}
/* spinner */
.auth-spinner{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
/* steps */
.auth-steps{display:flex;gap:6px;justify-content:center;margin-bottom:28px}
.auth-step{height:3px;border-radius:2px;flex:1;background:var(--bg3);transition:background .3s}
.auth-step.done{background:var(--green)}
.auth-step.active{background:var(--green);opacity:.5}
/* trial badge */
.auth-trial-badge{background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:14px;padding:16px;margin-bottom:20px;text-align:center}
.auth-trial-num{font-family:var(--font-h);font-size:48px;font-weight:800;color:var(--green);line-height:1}
.auth-trial-lbl{font-size:13px;color:var(--green);font-family:var(--font-b);margin-top:4px}
/* login choice */
.auth-choice-btn{width:100%;height:64px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:16px;display:flex;align-items:center;gap:16px;padding:0 20px;cursor:pointer;transition:all .15s;margin-bottom:10px;text-align:left}
.auth-choice-btn:active{background:var(--bg3);transform:scale(.98)}
.auth-choice-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.auth-choice-title{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.auth-choice-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
/* expired banner */
.auth-expired{background:rgba(226,75,74,.08);border:0.5px solid var(--red-border);border-radius:14px;padding:16px;margin-bottom:20px;text-align:center}
</style>`;

/* ════════════════════════
   VIEW: WELCOME
════════════════════════ */
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
        <button class="auth-btn auth-btn-primary" onclick="window.__auth.goTo('login-choice')">
          Увійти
        </button>
        <button class="auth-btn auth-btn-outline" onclick="window.__auth.goTo('reg-1')" style="margin-top:10px">
          Зареєструватись — 7 днів безкоштовно
        </button>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: LOGIN CHOICE
════════════════════════ */
function viewLoginChoice() {
  return `
  <div class="auth-view ${_view==='login-choice'?'active':''}" id="auth-login-choice">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Увійти</div>
          <div class="auth-screen-sub">Оберіть тип акаунту</div>
        </div>
      </div>

      <button class="auth-choice-btn" onclick="window.__auth.goTo('manager-login')">
        <div class="auth-choice-icon" style="background:var(--purple-bg)">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3.5" stroke="var(--purple)" stroke-width="1.4"/>
            <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="var(--purple)" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <div class="auth-choice-title">Менеджер</div>
          <div class="auth-choice-sub">Email і пароль</div>
        </div>
        <svg style="margin-left:auto" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <button class="auth-choice-btn" onclick="window.__auth.goTo('phone')">
        <div class="auth-choice-icon" style="background:var(--green-bg)">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="2" width="12" height="16" rx="2.5" stroke="var(--green)" stroke-width="1.4"/>
            <circle cx="10" cy="15" r="1" fill="var(--green)"/>
          </svg>
        </div>
        <div>
          <div class="auth-choice-title">Бармен</div>
          <div class="auth-choice-sub">Телефон і PIN</div>
        </div>
        <svg style="margin-left:auto" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <div class="auth-spacer"></div>
      <div style="text-align:center;font-size:13px;color:var(--text2);font-family:var(--font-b)">
        Немає акаунту?
        <span onclick="window.__auth.goTo('reg-1')"
          style="color:var(--green);cursor:pointer;font-weight:600"> Зареєструватись</span>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: MANAGER LOGIN
════════════════════════ */
function viewManagerLogin() {
  return `
  <div class="auth-view ${_view==='manager-login'?'active':''}" id="auth-manager-login">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('login-choice')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Вхід менеджера</div>
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
        placeholder="••••••••" value="${_mgr.password}"
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
        <span onclick="window.__auth.goTo('reg-1')"
          style="color:var(--green);cursor:pointer;font-weight:600"> Зареєструватись</span>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: REGISTER STEP 1 — Дані
════════════════════════ */
function viewReg1() {
  return `
  <div class="auth-view ${_view==='reg-1'?'active':''}" id="auth-reg-1">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Реєстрація</div>
          <div class="auth-screen-sub">Крок 1 з 2 — Ваші дані</div>
        </div>
      </div>
      <div class="auth-steps">
        <div class="auth-step active"></div>
        <div class="auth-step"></div>
      </div>

      <div class="auth-lbl">Ім'я та прізвище</div>
      <input class="auth-inp" id="reg-name" type="text"
        placeholder="Олексій Коваленко" value="${_reg.name}"
        oninput="window.__auth.regField('name',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('reg-email').focus()"/>

      <div class="auth-lbl">Email</div>
      <input class="auth-inp" id="reg-email" type="email" inputmode="email"
        placeholder="your@email.com" value="${_reg.email}"
        oninput="window.__auth.regField('email',this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('reg-pass').focus()"/>

      <div class="auth-lbl">Пароль</div>
      <input class="auth-inp" id="reg-pass" type="password"
        placeholder="Мінімум 6 символів" value="${_reg.password}"
        oninput="window.__auth.regField('password',this.value)"
        onkeydown="if(event.key==='Enter')window.__auth.goToReg2()"/>

      <div class="auth-error" id="reg1-err"></div>

      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" onclick="window.__auth.goToReg2()">
        Далі →
      </button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2);font-family:var(--font-b)">
        Вже є акаунт?
        <span onclick="window.__auth.goTo('manager-login')"
          style="color:var(--green);cursor:pointer"> Увійти</span>
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: REGISTER STEP 2 — Заклад
════════════════════════ */
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
      <div class="auth-steps">
        <div class="auth-step done"></div>
        <div class="auth-step active"></div>
      </div>

      <div class="auth-lbl">Назва закладу</div>
      <input class="auth-inp" id="reg-venue" type="text"
        placeholder="Sky Lounge, Bar Noir..." value="${_reg.venueName}"
        oninput="window.__auth.regField('venueName',this.value)"
        onkeydown="if(event.key==='Enter')window.__auth.doRegister()"/>

      <div style="margin-top:16px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px">
        <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Що ви отримуєте</div>
        ${['Повний доступ до всіх функцій','Команда барменів','Накладні та OCR','Списання та інвентар','Аналітика та звіти'].map(f=>`
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
          <div style="width:16px;height:16px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${f}</span>
        </div>`).join('')}
      </div>

      <div class="auth-error" id="reg2-err"></div>

      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="reg-submit-btn"
        onclick="window.__auth.doRegister()"
        ${_regLoading ? 'disabled' : ''}>
        ${_regLoading ? '<span class="auth-spinner"></span>' : 'Почати 7 днів безкоштовно'}
      </button>
      <div style="text-align:center;margin-top:10px;font-size:11px;color:var(--text2);font-family:var(--font-b)">
        Без прив'язки картки · Скасувати будь-коли
      </div>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: REGISTER STEP 3 — Успіх
════════════════════════ */
function viewReg3() {
  return `
  <div class="auth-view ${_view==='reg-3'?'active':''}" id="auth-reg-3">
    <div class="auth-inner" style="align-items:center;justify-content:center;text-align:center">
      <div style="width:80px;height:80px;border-radius:24px;background:var(--green);display:flex;align-items:center;justify-content:center;margin-bottom:24px;box-shadow:0 0 40px rgba(29,158,117,.4)">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M10 20l7 7 13-13" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div style="font-family:var(--font-h);font-size:26px;font-weight:800;color:var(--text0);margin-bottom:8px">Вітаємо!</div>
      <div style="font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.6;max-width:260px">
        Заклад <strong style="color:var(--text0)">${_reg.venueName}</strong> створено.<br/>Trial активовано на 7 днів.
      </div>

      <div class="auth-trial-badge" style="margin-top:32px;width:100%">
        <div class="auth-trial-num">7</div>
        <div class="auth-trial-lbl">днів безкоштовно</div>
      </div>

      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" style="width:100%" onclick="window.__auth.enterApp()">
        Перейти до додатку →
      </button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: PHONE (бармен)
════════════════════════ */
function viewPhone() {
  const phoneDigits = _phone ? _phone.replace('+380', '') : '';
  return `
  <div class="auth-view ${_view==='phone'?'active':''}" id="auth-phone">
    <div class="auth-inner">
      <div class="auth-header">
        <div class="auth-back" onclick="window.__auth.goTo('login-choice')">${BACK_SVG}</div>
        <div>
          <div class="auth-screen-title">Номер телефону</div>
          <div class="auth-screen-sub">Введіть ваш номер для входу</div>
        </div>
      </div>
      <div class="auth-phone-wrap" id="phone-wrap" onclick="document.getElementById('phone-inp').focus()">
        <div class="auth-phone-flag">🇺🇦</div>
        <div style="display:flex;align-items:center;flex:1">
          <span style="font-size:17px;font-family:var(--font-h);font-weight:600;color:var(--text2);white-space:nowrap;padding-left:2px">+38</span>
          <input id="phone-inp" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel"
            placeholder="" value="${phoneDigits}"
            oninput="window.__auth.onPhoneInput(this)"
            onkeydown="if(event.key==='Enter')window.__auth.submitPhone()"
            style="flex:1;height:56px;background:transparent;border:none;outline:none;font-size:18px;font-family:var(--font-h);font-weight:600;color:var(--text0);padding:0 8px;-webkit-text-fill-color:var(--text0)"/>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);padding-left:4px;margin-bottom:16px">Україна · +38</div>
      <div class="auth-error" id="phone-err">Введіть коректний номер</div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="phone-next-btn"
        onclick="window.__auth.submitPhone()" ${phoneDigits.length >= 10 ? '' : 'disabled'}>
        Далі →
      </button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   VIEW: PIN (бармен)
════════════════════════ */
function viewPin() {
  const digits  = _pin.split('');
  const squares = [0,1,2,3].map(i => {
    const filled = i < digits.length;
    const active = i === digits.length;
    return `<div class="auth-pin-sq ${filled?'filled':''} ${active?'active':''}" onclick="document.getElementById('pin-inp').focus()"></div>`;
  }).join('');

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
      <div class="auth-phone-badge" onclick="window.__auth.goTo('phone')">
        <div style="font-size:20px">🇺🇦</div>
        <div>
          <div style="font-size:16px;color:var(--text0);font-family:var(--font-h);font-weight:600">${_phone || '+380'}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">Натисніть щоб змінити</div>
        </div>
        <div style="margin-left:auto">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="auth-pin-squares" id="pin-squares" onclick="document.getElementById('pin-inp').focus()">
        ${squares}
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:-16px;margin-bottom:16px">
        Введіть свій PIN-код
      </div>
      <input id="pin-inp" class="auth-pin-hidden" type="tel" inputmode="numeric" maxlength="4"
        autocomplete="one-time-code"
        oninput="window.__auth.onPinInput(this)"
        onkeydown="window.__auth.onPinKey(event)"/>
      <div class="auth-error" id="pin-err"></div>
      <div class="auth-spacer"></div>
      <button class="auth-btn auth-btn-primary" id="pin-login-btn"
        onclick="window.__auth.doLogin()" ${_pin.length >= 4 ? '' : 'disabled'}>
        Увійти
      </button>
      <div style="height:12px"></div>
    </div>
  </div>`;
}

/* ════════════════════════
   NAVIGATION
════════════════════════ */
function rerender() {
  const container = document.querySelector('.auth-views-wrap');
  if (!container) return;
  container.innerHTML =
    viewWelcome() + viewLoginChoice() + viewManagerLogin() +
    viewReg1() + viewReg2() + viewReg3() +
    viewPhone() + viewPin();
}

function goTo(sub) {
  _view = sub;
  rerender();
  if (sub === 'manager-login') setTimeout(() => document.getElementById('mgr-email')?.focus(), 100);
  if (sub === 'reg-1')         setTimeout(() => document.getElementById('reg-name')?.focus(), 100);
  if (sub === 'reg-2')         setTimeout(() => document.getElementById('reg-venue')?.focus(), 100);
  if (sub === 'phone')         setTimeout(() => document.getElementById('phone-inp')?.focus(), 100);
  if (sub === 'pin')           { _pin = ''; setTimeout(() => document.getElementById('pin-inp')?.focus(), 100); }
}

/* ════════════════════════
   MANAGER LOGIN
════════════════════════ */
function mgrField(field, value) { _mgr[field] = value; }

async function doManagerLogin() {
  const errEl = document.getElementById('mgr-err');
  const btn   = document.getElementById('mgr-login-btn');

  if (!_mgr.email || !_mgr.password) {
    if (errEl) { errEl.textContent = 'Введіть email і пароль'; errEl.classList.add('show'); }
    return;
  }

  _mgrLoading = true;
  _mgrError   = '';
  rerender();

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ 
        email: _mgr.email.toLowerCase().trim(), 
        password: _mgr.password 
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка входу');

    saveSession(data);
    navigate('dashboard');
  } catch (err) {
    _mgrLoading = false;
    _mgrError   = err.message;
    rerender();
  }
}

/* ════════════════════════
   REGISTRATION
════════════════════════ */
function regField(field, value) { _reg[field] = value; }

function goToReg2() {
  const errEl = document.getElementById('reg1-err');
  const normalizedEmail = _reg.email.toLowerCase().trim();
  
  if (!_reg.name?.trim()) {
    if (errEl) { errEl.textContent = 'Введіть ім\'я'; errEl.classList.add('show'); } return;
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    if (errEl) { errEl.textContent = 'Введіть коректний email'; errEl.classList.add('show'); } return;
  }
  if (!_reg.password || _reg.password.length < 6) {
    if (errEl) { errEl.textContent = 'Пароль мінімум 6 символів'; errEl.classList.add('show'); } return;
  }
  goTo('reg-2');
}

async function doRegister() {
  const errEl = document.getElementById('reg2-err');
  if (!_reg.venueName?.trim()) {
    if (errEl) { errEl.textContent = 'Введіть назву закладу'; errEl.classList.add('show'); } return;
  }

  _regLoading = true;
  _regError   = '';
  rerender();

  try {
    const res  = await fetch(`${API}/api/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:      _reg.name.trim(),
        email:     _reg.email.toLowerCase().trim(),
        password:  _reg.password,
        venueName: _reg.venueName.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка реєстрації');

    saveSession(data);
    goTo('reg-3'); // Екран успіху
  } catch (err) {
    _regLoading = false;
    _regError   = err.message;
    rerender();
    const e = document.getElementById('reg2-err');
    if (e) { e.textContent = err.message; e.classList.add('show'); }
  }
}

function enterApp() {
  navigate('dashboard');
}

/* ════════════════════════
   PHONE / PIN (бармен)
════════════════════════ */
function onPhoneInput(inp) {
  let digits = inp.value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(3);
  else if (digits.startsWith('38')) digits = digits.slice(2);
  digits = digits.slice(0, 10);
  inp.value = digits;
  _phone = '+38' + digits;
  const btn = document.getElementById('phone-next-btn');
  if (btn) btn.disabled = digits.length < 10;
  document.getElementById('phone-err')?.classList.remove('show');
  if (digits.length === 10) setTimeout(() => submitPhone(), 400);
}

function submitPhone() {
  const inp    = document.getElementById('phone-inp');
  const digits = (inp?.value || '').replace(/\D/g, '');
  if (digits.length < 10) { document.getElementById('phone-err')?.classList.add('show'); return; }
  _phone = '+38' + digits;
  goTo('pin');
}

function onPinInput(inp) {
  const digits = inp.value.replace(/\D/g, '').slice(0, 4);
  inp.value = digits;
  _pin = digits;
  updatePinSquares();
  if (_pin.length === 4) setTimeout(() => doLogin(), 200);
}

function onPinKey(e) { if (e.key === 'Enter' && _pin.length === 4) doLogin(); }

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

async function doLogin() {
  if (_pin.length < 4) return;
  const errEl = document.getElementById('pin-err');
  const btn   = document.getElementById('pin-login-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="auth-spinner"></span>`; }
  if (errEl) errEl.classList.remove('show');

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
    const res  = await fetch(`${API}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone: _phone, pin: _pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка входу');

    saveSession(data);
    navigate('dashboard');
  } catch (err) {
    showError(err.message || 'Невірний PIN або номер');
  }
}

/* ════════════════════════
   HELPERS
════════════════════════ */
function saveSession(data) {
  localStorage.setItem('barops_token',          data.token);
  localStorage.setItem('barops_refresh',        data.refreshToken);
  localStorage.setItem('barops_venue',          data.user.venueName);
  localStorage.setItem('barops_venueId',        data.user.venueId || '');
  localStorage.setItem('barops_role',           data.user.role);
  localStorage.setItem('barops_user',           data.user.name);
  localStorage.setItem('barops_telegram_topic', data.user.telegramTopicId || '');
  localStorage.setItem('barops_phone',          data.user.phone || '');

  state.role    = data.user.role;
  state.venue   = data.user.venueName;
  state.venueId = data.user.venueId || '';
  state.user    = data.user.name;

  // Зберігаємо план якщо є
  if (data.user.plan) {
    localStorage.setItem('barops_plan',   data.user.plan.plan || 'trial');
    localStorage.setItem('barops_expiry', data.user.planExpiry || data.user.plan.expiry || '');
  }
}

/* ════════════════════════
   PAGE MODULE
════════════════════════ */
export default {
  render() {
    _view       = 'welcome';
    _phone      = '';
    _pin        = '';
    _mgrError   = '';
    _mgrLoading = false;
    _regLoading = false;
    _regError   = '';
    return `
      ${CSS}
      <div class="auth-wrap">
        <div class="auth-views-wrap" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          ${viewWelcome()}${viewLoginChoice()}${viewManagerLogin()}
          ${viewReg1()}${viewReg2()}${viewReg3()}
          ${viewPhone()}${viewPin()}
        </div>
      </div>`;
  },

  init() {
    window.__auth = {
      goTo, mgrField, doManagerLogin,
      regField, goToReg2, doRegister, enterApp,
      onPhoneInput, submitPhone, onPinInput, onPinKey, doLogin,
    };

    // Відновлюємо сесію якщо токен є
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
              state.role    = data.user.role;
              state.venue   = data.user.venueName;
              state.venueId = data.user.venueId || '';
              state.user    = data.user.name;
            }
            navigate('dashboard');
          } else {
            // Токен протух — пробуємо refresh
            const refreshToken = localStorage.getItem('barops_refresh');
            if (refreshToken) {
              try {
                const rr = await fetch(`${API}/api/auth/refresh`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refreshToken }),
                });
                const rd = await rr.json();
                if (rr.ok && rd.token) {
                  localStorage.setItem('barops_token', rd.token);
                  navigate('dashboard');
                  return;
                }
              } catch {}
            }
            // Очищаємо тільки auth-ключі, не весь localStorage
            ['barops_token','barops_refresh','barops_role','barops_user',
             'barops_venue','barops_venueId','barops_phone','barops_telegram_topic'].forEach(k => localStorage.removeItem(k));
            navigate('auth', { replace: true });
          }
        })
        .catch(() => {
          // Мережева помилка — пускаємо з кешованими даними
          if (state.venue && state.role) navigate('dashboard');
        });
    }
  },
};