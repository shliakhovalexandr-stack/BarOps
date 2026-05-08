/* ============================================================
   BarOps — pages/auth.js
   Авторизація: Welcome → Login/Register → Role → OTP
   ============================================================ */

import { navigate, setRole, state } from '../shared/app.js';

/* ── Internal sub-view state ── */
let _view = 'welcome'; // 'welcome' | 'login' | 'register' | 'role' | 'otp'
let _selectedRole = null;
let _resendTimer = null;

/* ════════════════════════════════════
   STYLES  (scoped, injected once)
   ════════════════════════════════════ */
const CSS = `
<style id="auth-styles">
/* ── Auth inner scroll ── */
.auth-inner {
  flex: 1; display: flex; flex-direction: column;
  padding: 0 28px 32px; overflow-y: auto;
}
.auth-inner::-webkit-scrollbar { display: none; }

/* ── Sub-view switching ── */
.auth-view { display: none; flex-direction: column; flex: 1; }
.auth-view.active { display: flex; animation: fadeUp 320ms ease both; }

/* ── Logo ── */
.auth-logo-wrap { display: flex; align-items: center; gap: 14px; margin-top: 56px; margin-bottom: 6px; }
.auth-logo-mark {
  width: 54px; height: 54px; border-radius: 16px; background: var(--green);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  box-shadow: 0 0 32px rgba(29,158,117,.35); position: relative; overflow: hidden;
}
.auth-logo-mark::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.18) 0%, transparent 60%);
}
.auth-logo-mark svg { position: relative; z-index: 1; }
.auth-logo-text { font-family: var(--font-h); font-size: 32px; font-weight: 800; color: var(--text0); letter-spacing: -.03em; }
.auth-logo-sub  { font-size: 12px; color: var(--text2); letter-spacing: .14em; text-transform: uppercase; font-family: var(--font-b); margin-top: -2px; }

/* ── Welcome ── */
.auth-tagline { margin-top: 40px; font-family: var(--font-h); font-size: 26px; font-weight: 700; color: var(--text0); line-height: 1.2; letter-spacing: -.02em; }
.auth-tagline span { color: var(--green); }
.auth-desc { margin-top: 14px; font-size: 14px; color: var(--text1); line-height: 1.65; font-family: var(--font-b); font-weight: 300; }
.auth-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
.auth-pill {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,.04); border: 0.5px solid var(--border);
  border-radius: 20px; padding: 6px 12px; font-size: 12px; color: var(--text1); font-family: var(--font-b);
}
.auth-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; }
.auth-spacer  { flex: 1; min-height: 40px; }
.auth-cta     { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }

/* ── Buttons (auth-local, не конфліктують з глобальними .btn) ── */
.auth-btn {
  width: 100%; height: 54px; border: none; border-radius: 16px;
  font-size: 15px; font-weight: 500; cursor: pointer;
  font-family: var(--font-h); letter-spacing: .02em;
  transition: all .18s ease; position: relative; overflow: hidden;
}
.auth-btn::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,.07); opacity: 0; transition: opacity .15s; }
.auth-btn:active::after { opacity: 1; }
.auth-btn--primary { background: var(--green); color: #fff; box-shadow: 0 4px 24px rgba(29,158,117,.28); }
.auth-btn--primary:hover { background: var(--green-l); }
.auth-btn--ghost { background: transparent; color: var(--text1); border: 0.5px solid var(--border2); }
.auth-btn--ghost:hover { background: rgba(255,255,255,.04); color: var(--text0); }

.auth-or { display: flex; align-items: center; gap: 12px; color: var(--text2); font-size: 12px; font-family: var(--font-b); }
.auth-or::before, .auth-or::after { content: ''; flex: 1; height: 0.5px; background: var(--border2); }

/* ── Screen header ── */
.auth-header { display: flex; align-items: center; gap: 14px; margin-top: 24px; margin-bottom: 28px; }
.auth-screen-title { font-family: var(--font-h); font-size: 22px; font-weight: 700; color: var(--text0); letter-spacing: -.02em; }
.auth-back {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--bg2); border: 0.5px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background .15s;
}
.auth-back:hover { background: var(--bg3); }

/* ── Form ── */
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field-group { display: flex; flex-direction: column; gap: 6px; }
.auth-field-label { font-size: 11px; color: var(--text2); font-family: var(--font-b); letter-spacing: .08em; text-transform: uppercase; }
.auth-field-wrap {
  position: relative; background: var(--bg2); border: 0.5px solid var(--border2);
  border-radius: 14px; overflow: hidden; transition: border-color .2s, box-shadow .2s;
}
.auth-field-wrap:focus-within { border-color: var(--green); box-shadow: 0 0 0 3px rgba(29,158,117,.1); }
.auth-field-wrap.error { border-color: var(--red); box-shadow: 0 0 0 3px rgba(226,75,74,.1); }
.auth-field-prefix {
  position: absolute; left: 0; top: 0; bottom: 0; width: 52px;
  display: flex; align-items: center; justify-content: center;
  border-right: 0.5px solid var(--border); pointer-events: none;
}
.auth-field-input {
  width: 100%; height: 52px; background: transparent; border: none; outline: none;
  color: var(--text0); font-size: 16px; font-family: var(--font-b); padding: 0 16px;
}
.auth-field-input.with-prefix { padding-left: 60px; }
.auth-field-input::placeholder { color: var(--text2); font-size: 15px; }
.auth-field-action {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: var(--text2); padding: 4px; line-height: 0;
}
.auth-field-error { font-size: 11px; color: var(--red); font-family: var(--font-b); display: none; }
.auth-field-error.visible { display: block; }
.auth-help-row { display: flex; justify-content: flex-end; }
.auth-link { font-size: 13px; color: var(--green); font-family: var(--font-b); cursor: pointer; background: none; border: none; padding: 0; }
.auth-link:hover { color: var(--green-l); }

/* ── Password strength ── */
.auth-strength-bars { display: flex; gap: 4px; margin-top: 6px; }
.auth-sbar { flex: 1; height: 3px; border-radius: 2px; background: var(--bg3); transition: background .3s; }
.auth-strength-lbl { font-size: 11px; margin-top: 5px; font-family: var(--font-b); color: var(--text2); }

/* ── Terms ── */
.auth-terms { display: flex; align-items: flex-start; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--text2); font-family: var(--font-b); line-height: 1.5; }
.auth-check {
  width: 18px; height: 18px; border-radius: 5px; border: 0.5px solid var(--border2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-top: 1px;
}
.auth-check.checked { background: var(--green); border-color: var(--green); }

/* ── Role cards ── */
.auth-role-cards { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
.auth-role-card {
  background: var(--bg2); border: 0.5px solid var(--border2); border-radius: 16px; padding: 18px 16px;
  cursor: pointer; display: flex; align-items: center; gap: 14px;
  transition: all .18s ease; position: relative; overflow: hidden;
}
.auth-role-card::before { content: ''; position: absolute; inset: 0; background: rgba(29,158,117,.06); opacity: 0; transition: opacity .2s; }
.auth-role-card:hover::before { opacity: 1; }
.auth-role-card.selected { border-color: var(--green); box-shadow: 0 0 0 1px var(--green); }
.auth-role-card.selected::before { opacity: 1; }
.auth-role-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; z-index: 1; }
.auth-role-icon--bar { background: rgba(29,158,117,.15); }
.auth-role-icon--mgr { background: rgba(127,119,221,.15); }
.auth-role-info { flex: 1; position: relative; z-index: 1; }
.auth-role-name { font-family: var(--font-h); font-size: 16px; font-weight: 600; color: var(--text0); }
.auth-role-desc { font-size: 12px; color: var(--text2); margin-top: 3px; font-family: var(--font-b); line-height: 1.45; }
.auth-role-check {
  width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border2);
  display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; flex-shrink: 0;
}
.auth-role-card.selected .auth-role-check { background: var(--green); border-color: var(--green); }

/* ── OTP ── */
.auth-otp-row { display: flex; gap: 7px; margin-top: 8px; justify-content: center; }
.auth-otp-cell {
  width: 44px; height: 52px; flex-shrink: 0;
  background: var(--bg2); border: 0.5px solid var(--border2);
  border-radius: 12px; text-align: center; font-size: 22px; font-family: var(--font-h);
  font-weight: 700; color: var(--text0); outline: none; caret-color: var(--green);
  transition: border-color .2s, box-shadow .2s; -webkit-appearance: none;
}
.auth-otp-cell:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(29,158,117,.1); }

/* ── Error banner ── */
.auth-error-banner {
  background: var(--red-bg); border: 0.5px solid var(--red-border);
  border-radius: 10px; padding: 10px 14px; font-size: 13px; color: var(--red); font-family: var(--font-b);
  display: none;
}
.auth-error-banner.visible { display: block; }

/* ── Small logo (login header) ── */
.auth-logo-sm { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.auth-logo-sm-mark {
  width: 36px; height: 36px; border-radius: 10px; background: var(--green);
  display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
}
.auth-logo-sm-mark::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.18) 0%, transparent 60%); }
.auth-logo-sm-mark svg { position: relative; z-index: 1; }
.auth-logo-sm-text { font-family: var(--font-h); font-size: 18px; font-weight: 700; color: var(--text0); letter-spacing: -.02em; }

/* ── OTP envelope icon ── */
.auth-otp-icon {
  width: 56px; height: 56px; border-radius: 16px; background: rgba(29,158,117,.1);
  display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
}

/* ── Demo hint ── */
.auth-demo-hint {
  background: var(--bg2); border: 0.5px solid var(--border); border-radius: 12px;
  padding: 12px 14px; margin-top: 20px; font-size: 12px; color: var(--text2); font-family: var(--font-b); line-height: 1.55;
}
</style>`;

/* ════════════════════════════════════
   LOGO SVG (reused)
   ════════════════════════════════════ */
const LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
  <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
  <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M11 11V8M14 11V7M17 11V9" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>
</svg>`;

const BACK_ARROW = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M10 13L5 8l5-5" stroke="#888" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
  <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* ════════════════════════════════════
   SUB-VIEW TEMPLATES
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
    <div class="auth-tagline">
      Розумний<br/>помічник<br/><span>для вашого бару</span>
    </div>
    <div class="auth-desc">
      Автоматизація інвентаризації, накладних та замовлень.<br/>Менше паперу — більше часу для гостей.
    </div>
    <div class="auth-pills">
      <div class="auth-pill"><div class="auth-pill-dot"></div>OCR накладних</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>Smart Ordering</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>Живий фудкост</div>
      <div class="auth-pill"><div class="auth-pill-dot"></div>POS-інтеграція</div>
    </div>
    <div class="auth-spacer"></div>
    <div class="auth-cta">
      <button class="auth-btn auth-btn--primary" onclick="window.__auth.goTo('register')">Почати роботу</button>
      <div class="auth-or">або</div>
      <button class="auth-btn auth-btn--ghost" onclick="window.__auth.goTo('login')">Увійти до акаунту</button>
    </div>
    <div style="text-align:center;margin-top:18px;font-size:13px;color:var(--text2);font-family:var(--font-b)">
      Маєте запрошення?
      <button class="auth-link" style="margin-left:4px" onclick="window.__auth.goTo('login')">Активувати</button>
    </div>
    <div style="height:16px"></div>
  </div>`;
}

function viewLogin() {
  return `
  <div class="auth-view" id="auth-login">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK_ARROW}</div>
      <div class="auth-screen-title">Вхід до BarOps</div>
    </div>
    <div class="auth-logo-sm">
      <div class="auth-logo-sm-mark">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
          <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="auth-logo-sm-text">BarOps</span>
    </div>
    <div class="auth-form">
      <div class="auth-field-group">
        <div class="auth-field-label">Номер телефону</div>
        <div class="auth-field-wrap" id="lp-wrap">
          <div class="auth-field-prefix">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <rect width="18" height="4" fill="#005BBB"/>
              <rect y="4" width="18" height="4" fill="#FFD500"/>
              <rect y="8" width="18" height="4" fill="#005BBB"/>
            </svg>
          </div>
          <input class="auth-field-input with-prefix" id="login-phone" type="tel"
            placeholder="+380 XX XXX XX XX" maxlength="17"
            oninput="window.__auth.formatPhone(this)"/>
        </div>
        <div class="auth-field-error" id="lp-err">Введіть коректний номер телефону</div>
      </div>
      <div class="auth-field-group">
        <div class="auth-field-label">Пароль</div>
        <div class="auth-field-wrap" id="lpwd-wrap">
          <input class="auth-field-input" id="login-pwd" type="password"
            placeholder="Введіть пароль" style="padding-right:48px"/>
          <button class="auth-field-action" type="button"
            onclick="window.__auth.togglePwd('login-pwd',this)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.3" fill="none"/>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            </svg>
          </button>
        </div>
        <div class="auth-field-error" id="lpwd-err">Невірний пароль</div>
        <div class="auth-help-row">
          <button class="auth-link">Забули пароль?</button>
        </div>
      </div>
      <div class="auth-error-banner" id="login-err-banner">
        Номер або пароль невірні. Спробуйте ще раз.
      </div>
      <button class="auth-btn auth-btn--primary" style="margin-top:6px"
        onclick="window.__auth.doLogin()">Увійти</button>
    </div>
    <div class="auth-or" style="margin-top:24px">або</div>
    <div style="text-align:center;margin-top:20px;font-size:14px;color:var(--text1);font-family:var(--font-b)">
      Немає акаунту?
      <button class="auth-link" style="margin-left:4px" onclick="window.__auth.goTo('register')">Зареєструватись</button>
    </div>
    <div style="height:24px"></div>
  </div>`;
}

function viewRegister() {
  return `
  <div class="auth-view" id="auth-register">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('welcome')">${BACK_ARROW}</div>
      <div class="auth-screen-title">Новий акаунт</div>
    </div>
    <div style="font-size:14px;color:var(--text1);font-family:var(--font-b);line-height:1.55;font-weight:300;margin-bottom:8px">
      Введіть ваш номер телефону та придумайте пароль для входу.
    </div>
    <div class="auth-form" style="margin-top:12px">
      <div class="auth-field-group">
        <div class="auth-field-label">Ваше ім'я</div>
        <div class="auth-field-wrap">
          <input class="auth-field-input" id="reg-name" type="text" placeholder="Олексій"/>
        </div>
      </div>
      <div class="auth-field-group">
        <div class="auth-field-label">Номер телефону</div>
        <div class="auth-field-wrap" id="rp-wrap">
          <div class="auth-field-prefix">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <rect width="18" height="4" fill="#005BBB"/>
              <rect y="4" width="18" height="4" fill="#FFD500"/>
              <rect y="8" width="18" height="4" fill="#005BBB"/>
            </svg>
          </div>
          <input class="auth-field-input with-prefix" id="reg-phone" type="tel"
            placeholder="+380 XX XXX XX XX" maxlength="17"
            oninput="window.__auth.formatPhone(this)"/>
        </div>
        <div class="auth-field-error" id="rp-err">Введіть коректний номер</div>
      </div>
      <div class="auth-field-group">
        <div class="auth-field-label">Придумайте пароль</div>
        <div class="auth-field-wrap">
          <input class="auth-field-input" id="reg-pwd" type="password"
            placeholder="Мінімум 8 символів" style="padding-right:48px"
            oninput="window.__auth.checkStrength(this.value)"/>
          <button class="auth-field-action" type="button"
            onclick="window.__auth.togglePwd('reg-pwd',this)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.3" fill="none"/>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            </svg>
          </button>
        </div>
        <div style="margin-top:-6px">
          <div class="auth-strength-bars">
            <div class="auth-sbar" id="sb1"></div>
            <div class="auth-sbar" id="sb2"></div>
            <div class="auth-sbar" id="sb3"></div>
            <div class="auth-sbar" id="sb4"></div>
          </div>
          <div class="auth-strength-lbl" id="strength-lbl">Введіть пароль</div>
        </div>
      </div>
      <div class="auth-field-group">
        <div class="auth-field-label">Повторіть пароль</div>
        <div class="auth-field-wrap" id="rcpwd-wrap">
          <input class="auth-field-input" id="reg-cpwd" type="password"
            placeholder="Ще раз" style="padding-right:48px"
            oninput="window.__auth.checkMatch()"/>
          <button class="auth-field-action" type="button"
            onclick="window.__auth.togglePwd('reg-cpwd',this)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.3" fill="none"/>
              <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.3"/>
            </svg>
          </button>
        </div>
        <div class="auth-field-error" id="rcpwd-err">Паролі не збігаються</div>
      </div>
      <div class="auth-terms">
        <div class="auth-check" id="terms-check" onclick="window.__auth.toggleCheck(this)"></div>
        <div>Я погоджуюся з <button class="auth-link">умовами використання</button> та <button class="auth-link">політикою конфіденційності</button></div>
      </div>
      <button class="auth-btn auth-btn--primary" style="margin-top:8px"
        onclick="window.__auth.doRegister()">Далі — вибір ролі</button>
    </div>
    <div style="text-align:center;margin-top:20px;font-size:14px;color:var(--text1);font-family:var(--font-b)">
      Вже є акаунт?
      <button class="auth-link" style="margin-left:4px" onclick="window.__auth.goTo('login')">Увійти</button>
    </div>
    <div style="height:24px"></div>
  </div>`;
}

function viewRole() {
  return `
  <div class="auth-view" id="auth-role">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('register')">${BACK_ARROW}</div>
      <div class="auth-screen-title">Хто ви?</div>
    </div>
    <div style="font-size:14px;color:var(--text1);font-family:var(--font-b);line-height:1.6;margin-bottom:24px;font-weight:300">
      Оберіть роль. Від цього залежить, які функції будуть доступні.
    </div>
    <div class="auth-role-cards">
      <div class="auth-role-card" id="role-bartender" onclick="window.__auth.selectRole('bartender')">
        <div class="auth-role-icon auth-role-icon--bar">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 4h12l-3 8H8L5 4z" stroke="#1D9E75" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
            <path d="M8 12v5M14 12v5M6 17h10" stroke="#1D9E75" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="auth-role-info">
          <div class="auth-role-name">Бармен</div>
          <div class="auth-role-desc">Сканування накладних, інвентар, списання, журнал зміни</div>
        </div>
        <div class="auth-role-check" id="rc-bartender"></div>
      </div>
      <div class="auth-role-card" id="role-manager" onclick="window.__auth.selectRole('manager')">
        <div class="auth-role-icon auth-role-icon--mgr">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="3" y="5" width="16" height="12" rx="2" stroke="#7F77DD" stroke-width="1.4" fill="none"/>
            <path d="M3 9h16M7 13h3M14 13h1" stroke="#7F77DD" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="auth-role-info">
          <div class="auth-role-name">Менеджер</div>
          <div class="auth-role-desc">Аналітика, звіти, управління командою, налаштування норм</div>
        </div>
        <div class="auth-role-check" id="rc-manager"></div>
      </div>
    </div>
    <div class="auth-field-group" style="margin-top:20px">
      <div class="auth-field-label">Заклад</div>
      <div class="auth-field-wrap" style="position:relative">
        <select class="auth-field-input" id="venue-select"
          style="appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:36px">
          <option value="">Оберіть заклад...</option>
          <option value="La Pasta">La Pasta</option>
          <option value="Тераса">Тераса</option>
          <option value="Дім18">Дім18</option>
          <option value="Хочу 2.0">Хочу 2.0</option>
          <option value="Хочу">Хочу</option>
        </select>
        <svg style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none"
          width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5l4 4 4-4" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <button class="auth-btn auth-btn--primary" style="margin-top:24px"
      onclick="window.__auth.goToOtp()">Підтвердити та далі</button>
    <div style="height:24px"></div>
  </div>`;
}

function viewOtp() {
  const phoneVal = (() => {
    try { return document.getElementById('reg-phone')?.value || '+380 67 123 45 67'; } catch { return '+380 67 123 45 67'; }
  })();
  return `
  <div class="auth-view" id="auth-otp">
    <div class="auth-header">
      <div class="auth-back" onclick="window.__auth.goTo('role')">${BACK_ARROW}</div>
      <div class="auth-screen-title">Підтвердження</div>
    </div>
    <div class="auth-otp-icon">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect x="2" y="4" width="22" height="16" rx="3" stroke="#1D9E75" stroke-width="1.4" fill="none"/>
        <path d="M2 9l11 7 11-7" stroke="#1D9E75" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div style="font-size:14px;color:var(--text1);font-family:var(--font-b);line-height:1.6;font-weight:300">
      Ми надіслали 6-значний код на номер
      <span style="color:var(--text0);font-weight:500">${phoneVal}</span>.
    </div>
    <div class="auth-otp-row" style="margin-top:20px">
      <input class="auth-otp-cell" id="otp1" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpNext(this,'otp2')"
        onkeydown="window.__auth.otpBack(event,this,null)"/>
      <input class="auth-otp-cell" id="otp2" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpNext(this,'otp3')"
        onkeydown="window.__auth.otpBack(event,this,'otp1')"/>
      <input class="auth-otp-cell" id="otp3" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpNext(this,'otp4')"
        onkeydown="window.__auth.otpBack(event,this,'otp2')"/>
      <input class="auth-otp-cell" id="otp4" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpNext(this,'otp5')"
        onkeydown="window.__auth.otpBack(event,this,'otp3')"/>
      <input class="auth-otp-cell" id="otp5" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpNext(this,'otp6')"
        onkeydown="window.__auth.otpBack(event,this,'otp4')"/>
      <input class="auth-otp-cell" id="otp6" type="tel" maxlength="1" inputmode="numeric"
        oninput="window.__auth.otpDone(this)"
        onkeydown="window.__auth.otpBack(event,this,'otp5')"/>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text2);font-family:var(--font-b)">
      Не прийшов код?
      <button class="auth-link" style="margin-left:4px" id="resend-btn"
        onclick="window.__auth.startResend()">Надіслати ще раз</button>
      <span id="resend-timer" style="display:none">через <span id="timer-val">60</span>с</span>
    </div>
    <button class="auth-btn auth-btn--primary" style="margin-top:20px"
      onclick="window.__auth.doVerify()">Підтвердити →</button>
    <div class="auth-demo-hint">
      Демо-код: <strong style="color:var(--text0)">1 2 3 4 5 6</strong>
    </div>
    <div style="text-align:center;margin-top:20px;font-size:13px;color:var(--text2);font-family:var(--font-b)">
      <button class="auth-link" style="color:var(--text2)"
        onclick="window.__auth.goTo('welcome')">Повернутись на початок</button>
    </div>
    <div style="height:24px"></div>
  </div>`;
}

/* ════════════════════════════════════
   SUB-NAVIGATION (всередині auth)
   ════════════════════════════════════ */
function goTo(subView) {
  const views = ['welcome','login','register','role','otp'];
  views.forEach(v => {
    const el = document.getElementById('auth-' + v);
    if (el) {
      el.classList.remove('active');
      el.style.animation = 'none';
    }
  });
  const target = document.getElementById('auth-' + subView);
  if (target) {
    // re-trigger animation
    requestAnimationFrame(() => {
      target.style.animation = '';
      target.classList.add('active');
    });
  }
  _view = subView;
}

/* ════════════════════════════════════
   FORM HANDLERS
   ════════════════════════════════════ */
function formatPhone(inp) {
  let v = inp.value.replace(/\D/g, '');
  if (v.startsWith('380'))     v = '+' + v;
  else if (v.startsWith('0'))  v = '+38' + v;
  else if (!v.startsWith('+')) v = '+380' + v;
  const digits = v.replace(/\D/g, '');
  let fmt = '+';
  if (digits.length > 0)  fmt += digits.slice(0, 3);
  if (digits.length > 3)  fmt += ' ' + digits.slice(3, 5);
  if (digits.length > 5)  fmt += ' ' + digits.slice(5, 8);
  if (digits.length > 8)  fmt += ' ' + digits.slice(8, 10);
  if (digits.length > 10) fmt += ' ' + digits.slice(10, 12);
  inp.value = fmt.trim();
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.querySelector('svg').style.opacity = inp.type === 'text' ? '.5' : '1';
}

function checkStrength(val) {
  let score = 0;
  if (val.length >= 8)                      score++;
  if (/[A-ZА-Я]/.test(val))                score++;
  if (/[0-9]/.test(val))                    score++;
  if (/[^a-zA-Z0-9а-яА-Я]/.test(val))      score++;
  const colors = ['var(--red)','var(--amber)','var(--amber)','var(--green)'];
  const labels = ['Слабкий','Середній','Добрий','Надійний'];
  const lbl = document.getElementById('strength-lbl');
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById('sb' + i);
    if (bar) bar.style.background = i <= score ? colors[score - 1] : 'var(--bg3)';
  }
  if (lbl) {
    lbl.textContent = val.length === 0 ? 'Введіть пароль' : (labels[score - 1] || 'Слабкий');
    lbl.style.color  = val.length === 0 ? 'var(--text2)' : (colors[score - 1] || colors[0]);
  }
}

function checkMatch() {
  const p    = document.getElementById('reg-pwd')?.value;
  const c    = document.getElementById('reg-cpwd')?.value;
  const err  = document.getElementById('rcpwd-err');
  const wrap = document.getElementById('rcpwd-wrap');
  if (!err || !wrap) return;
  const bad = c && p !== c;
  err.classList.toggle('visible', bad);
  wrap.classList.toggle('error', bad);
}

function toggleCheck(el) { el.classList.toggle('checked'); }

function doLogin() {
  const phone = document.getElementById('login-phone')?.value || '';
  const pwd   = document.getElementById('login-pwd')?.value   || '';
  let ok = true;

  const lpWrap = document.getElementById('lp-wrap');
  const lpErr  = document.getElementById('lp-err');
  if (phone.replace(/\D/g,'').length < 11) {
    lpErr?.classList.add('visible');
    lpWrap?.classList.add('error');
    ok = false;
  } else {
    lpErr?.classList.remove('visible');
    lpWrap?.classList.remove('error');
  }

  const pwdWrap = document.getElementById('lpwd-wrap');
  const pwdErr  = document.getElementById('lpwd-err');
  if (pwd.length < 4) {
    pwdErr?.classList.add('visible');
    pwdWrap?.classList.add('error');
    ok = false;
  } else {
    pwdErr?.classList.remove('visible');
    pwdWrap?.classList.remove('error');
  }

  if (ok) {
    // Demo: будь-який валідний → переходимо до dashboard
    _finalizeLogin();
  }
}

function doRegister() { goTo('role'); }

function selectRole(role) {
  _selectedRole = role;
  ['bartender','manager'].forEach(r => {
    const card = document.getElementById('role-' + r);
    const rc   = document.getElementById('rc-' + r);
    if (!card || !rc) return;
    card.classList.toggle('selected', r === role);
    rc.innerHTML = r === role ? CHECK_SVG : '';
  });
}

function goToOtp() {
  if (!_selectedRole) {
    // highlight both cards briefly
    document.querySelectorAll('.auth-role-card').forEach(c => {
      c.style.borderColor = 'var(--amber)';
      setTimeout(() => c.style.borderColor = '', 800);
    });
    return;
  }
  goTo('otp');
}

/* OTP */
function otpNext(inp, nextId) {
  if (inp.value.length >= 1 && nextId) {
    document.getElementById(nextId)?.focus();
  }
}
function otpBack(e, inp, prevId) {
  if (e.key === 'Backspace' && inp.value === '' && prevId) {
    document.getElementById(prevId)?.focus();
  }
}
function otpDone(inp) { if (inp.value.length >= 1) inp.blur(); }

async function doVerify() {
  const code = ['otp1','otp2','otp3','otp4','otp5','otp6']
    .map(id => document.getElementById(id)?.value || '')
    .join('');

  const cells = document.querySelectorAll('.auth-otp-cell');
  if (code.length < 6) return;

  // Показуємо завантаження
  cells.forEach(c => { c.style.borderColor = 'var(--amber)'; });

  try {
    // Спробуємо реальний backend
    const { authAPI } = await import('./api.js');
    const data = await authAPI.verifyOtp(_phone, code);

    cells.forEach(c => { c.style.borderColor = 'var(--green)'; c.style.color = 'var(--green)'; });

    // Зберігаємо дані користувача
    if (data.user) {
      state.user    = data.user.name;
      state.role    = data.user.role;
      state.venue   = 'Sky Lounge';
    }
    setTimeout(() => _finalizeLogin(data.user?.role), 500);

  } catch (err) {
    // Fallback — демо-режим якщо backend недоступний
    if (code === '123456') {
      cells.forEach(c => { c.style.borderColor = 'var(--green)'; c.style.color = 'var(--green)'; });
      setTimeout(() => _finalizeLogin(), 500);
    } else {
      cells.forEach(c => { c.style.borderColor = 'var(--red)'; });
      setTimeout(() => {
        cells.forEach(c => { c.style.borderColor = ''; c.style.color = ''; c.value = ''; });
        document.getElementById('otp1')?.focus();
      }, 900);
    }
  }
}

function startResend() {
  const btn   = document.getElementById('resend-btn');
  const timer = document.getElementById('resend-timer');
  const val   = document.getElementById('timer-val');
  if (!btn || !timer || !val) return;
  btn.style.display   = 'none';
  timer.style.display = 'inline';
  let t = 60;
  val.textContent = t;
  if (_resendTimer) clearInterval(_resendTimer);
  _resendTimer = setInterval(() => {
    t--;
    val.textContent = t;
    if (t <= 0) {
      clearInterval(_resendTimer);
      _resendTimer = null;
      btn.style.display   = 'inline';
      timer.style.display = 'none';
    }
  }, 1000);
}

function _finalizeLogin(role) {
  const r = role || _selectedRole || 'bartender';
  state.role = r;
  // Зберігаємо обраний заклад
  const venueSelect = document.getElementById('venue-select');
  if (venueSelect?.value) {
    state.venue = venueSelect.value;
  }
  navigate('dashboard');
}

/* ════════════════════════════════════
   PAGE MODULE EXPORT
   ════════════════════════════════════ */
let _stylesInjected = false;

export default {
  render() {
    _view = 'welcome';
    _selectedRole = null;

    return `
      ${CSS}
      <div class="auth-inner">
        ${viewWelcome()}
        ${viewLogin()}
        ${viewRegister()}
        ${viewRole()}
        ${viewOtp()}
      </div>`;
  },

  init() {
    /* Expose handlers globally so inline onclick can reach them */
    window.__auth = {
      goTo, formatPhone, togglePwd, checkStrength, checkMatch,
      toggleCheck, doLogin, doRegister, selectRole, goToOtp,
      otpNext, otpBack, otpDone, doVerify, startResend,
    };

    /* Inject styles once */
    if (!_stylesInjected && !document.getElementById('auth-styles')) {
      _stylesInjected = false; // CSS is inline in render(), nothing extra needed
    }

    /* Activate the correct sub-view */
    goTo(_view);
  },
};
