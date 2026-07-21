/* ============================================================
   BarOps — pages/profile.js
   Профіль: реальні дані з /api/auth/me + /api/stats
   ============================================================ */

import { navigate, state } from '../shared/app.js';
import { pushSupported, pushPermission, subscribePush, unsubscribePush } from '../shared/push.js';
import { setTheme as applyThemeChoice, isLightActive } from '../shared/theme.js';

const POS_SYSTEMS = {
  manual:     { name: 'Вручну',     icon: '✋', color: 'var(--text2)' },
  poster:     { name: 'Poster',     icon: '📋', color: '#e85d04' },
  syrve:      { name: 'Syrve',      icon: '🔗', color: 'var(--green)' },
  skyservice: { name: 'Skyservice', icon: '☁️', color: '#3b82f6' },
  palmabox:   { name: 'PalmaBox',   icon: '🌴', color: '#10b981' },
  profit:     { name: 'Profit',     icon: '💰', color: '#f59e0b' },
};

const API = 'https://barops-backend-production.up.railway.app';

let _profile = null;
let _stats   = null;
let _team    = null;
let _plan    = null;
let _loading = true;
let _posSettings = null;
let _tgSaving    = false;
let _tgSaved     = false;

function token() { return localStorage.getItem('barops_token') || ''; }

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="prof-css">
.prof-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.prof-scroll{overflow-y:auto;flex:1}.prof-scroll::-webkit-scrollbar{width:0}
.prof-hero{padding:8px 20px 16px}
.prof-hero-card{display:flex;align-items:center;gap:16px;padding:20px 18px;background:var(--bg1);border:0.5px solid var(--border);border-radius:18px}
.prof-avatar{width:64px;height:64px;border-radius:50%;background:var(--green);color:#000;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;font-family:var(--font-h);position:relative;flex-shrink:0}
.prof-live-dot{position:absolute;bottom:1px;right:1px;width:14px;height:14px;border-radius:50%;background:var(--green);border:2.5px solid var(--bg1);background:#34D399}
.prof-name{font-family:var(--font-h);font-size:18px;font-weight:600;color:var(--text0);letter-spacing:-.01em;line-height:1}
.prof-role{font-size:12px;color:var(--green);font-family:var(--font-b);margin-top:3px}
.prof-venue{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.prof-stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:0 20px 16px}
.prof-stat{background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:12px 10px}
.prof-stat-val{font-family:var(--font-h);font-size:20px;font-weight:600;line-height:1;letter-spacing:-.02em}
.prof-stat-lbl{font-size:10px;color:var(--text2);margin-top:5px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;line-height:1.3}
.prof-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 20px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.prof-theme-seg{display:inline-flex;gap:4px;padding:4px;background:var(--bg3);border-radius:12px}
.prof-theme-opt{width:40px;height:34px;display:flex;align-items:center;justify-content:center;border:none;border-radius:9px;background:transparent;color:var(--text2);cursor:pointer}
.prof-theme-opt.on{background:var(--green);color:var(--fab-ink)}
.prof-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px}
.prof-kpi{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px}
.prof-kpi-val{font-family:var(--font-h);font-size:22px;font-weight:600;line-height:1;letter-spacing:-.02em}
.prof-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:6px;text-transform:uppercase;letter-spacing:.06em;line-height:1.3}
.prof-kpi-sub{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-top:2px}
.prof-info-card{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.prof-info-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--border)}
.prof-info-row:last-child{border-bottom:none}
.prof-info-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.prof-info-val{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.prof-shifts{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.prof-shift-row{display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:0.5px solid var(--border)}
.prof-shift-row:last-child{border-bottom:none}
.prof-settings{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.prof-setting-row{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.prof-setting-row:last-child{border-bottom:none}
.prof-setting-row:active{background:rgba(255,255,255,.05)}
.prof-setting-lbl{font-size:13px;color:var(--text0)}
.prof-toggle{width:32px;height:18px;border-radius:9px;background:var(--bg3);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.prof-toggle.on{background:var(--green)}
.prof-toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.prof-toggle.on .prof-toggle-knob{left:16px}
.prof-logout{margin:0 20px 14px;width:calc(100% - 40px);padding:14px;background:var(--red-bg);border:0.5px solid rgba(251,113,133,.25);border-radius:14px;font-size:13px;font-weight:500;color:var(--red);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.prof-logout:active{opacity:.8}
.prof-close-shift{margin:0 20px 10px;width:calc(100% - 40px);padding:14px;background:rgba(251,191,36,.08);border:0.5px solid rgba(251,191,36,.25);border-radius:14px;font-size:13px;font-weight:500;color:var(--amber);cursor:pointer;font-family:var(--font-b);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.prof-close-shift:active{opacity:.8}
.prof-close-shift:disabled{opacity:.5;cursor:not-allowed}
/* plan badge */
.prof-plan{margin:0 14px 8px;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
.prof-plan--trial{background:var(--amber-bg);border:1px solid var(--amber-border)}
.prof-plan--active{background:var(--green-bg);border:1px solid var(--green-border)}
.prof-plan--expired{background:var(--red-bg);border:1px solid var(--red-border)}
/* tg input row */
.prof-tg-row{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:0.5px solid var(--border)}
.prof-tg-row:last-child{border-bottom:none}
.prof-tg-prefix{font-size:15px;color:var(--text2);flex-shrink:0;font-family:var(--font-b)}
.prof-tg-inp{flex:1;height:36px;background:var(--bg3);border:0.5px solid var(--border);border-radius:9px;padding:0 10px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .18s}
.prof-tg-inp:focus{border-color:var(--green)}
.prof-tg-save{height:36px;padding:0 14px;background:var(--green);border:none;border-radius:9px;font-size:12px;font-weight:600;color:#000;cursor:pointer;font-family:var(--font-b);transition:all .15s;flex-shrink:0}
.prof-tg-save:active{opacity:.8}
.prof-tg-save.saved{background:var(--bg3);color:var(--green);border:0.5px solid var(--green)}
/* skel */
.prof-skel{background:var(--glass-bg);border-radius:12px;animation:pSkel 1.2s ease-in-out infinite}
@keyframes pSkel{0%,100%{opacity:.5}50%{opacity:1}}
</style>`;

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadData() {
  _loading = true;
  updateView();

  try {
    const venueId = localStorage.getItem('barops_venueId') || '';
    const [meRes, statsRes, planRes, posRes] = await Promise.all([
      fetch(`${API}/api/auth/me`,        { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/api/stats?venueId=${venueId}`,
                                          { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/api/register/plan`,   { headers: { Authorization: `Bearer ${token()}` } }),
      state.role === 'admin' ? fetch(`${API}/api/pos/settings/${venueId}`, { headers: { Authorization: `Bearer ${token()}` } }) : Promise.resolve({ ok: false }),
    ]);

    if (meRes.ok)    { const d = await meRes.json();    _profile = d.user; }
    if (statsRes.ok) { const d = await statsRes.json(); _stats   = d.today; }
    if (planRes.ok)  { const d = await planRes.json();  _plan    = d; }
    if (posRes.ok)   { const d = await posRes.json();   _posSettings = d.settings; }

    // Якщо адмін/менеджер — завантажуємо команду
    if (state.role === 'admin' || state.role === 'manager' || state.role === 'director') {
      const venueId = localStorage.getItem('barops_venueId') || '';
      const teamRes = await fetch(`${API}/api/auth/team?venueId=${venueId}`,
        { headers: { Authorization: `Bearer ${token()}` } });
      if (teamRes.ok) { const d = await teamRes.json(); _team = d.team; }
    }
  } catch (e) {
    console.error('[Profile] loadData:', e);
  }

  _loading = false;
  updateView();
}

function updateView() {
  if (state.route !== 'profile') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   PLAN BADGE
════════════════════════ */
function planBadge() {
  if (!_plan) return '';
  const { plan, expired, daysLeft } = _plan;

  if (expired) {
    return `
    <div class="prof-plan prof-plan--expired">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="var(--red)" stroke-width="1.4"/>
        <path d="M10 6v4M10 13v.5" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--font-b)">Підписка закінчилась</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Оновіть план для продовження</div>
      </div>
      <div style="font-size:12px;color:var(--red);font-family:var(--font-b);cursor:pointer">Оновити →</div>
    </div>`;
  }

  if (plan === 'trial') return '';   // тріал-банер прибрано (повний функціонал; без «null дн.»)

  return `
  <div class="prof-plan prof-plan--active">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="var(--green)" stroke-width="1.4"/>
      <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--green);font-family:var(--font-b)">${plan === 'basic' ? 'Basic' : 'Pro'} · активний</div>
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Діє ще ${daysLeft} дн.</div>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr  = state.role === 'admin' || state.role === 'manager' || state.role === 'director';
  const name   = _profile?.name  || state.user  || '—';
  const email  = _profile?.email || '—';
  const phone  = _profile?.phone || '—';
  const venue  = state.venue || '—';

  if (_loading) {
    return `${CSS}
    <div class="prof-wrap">
      <div class="prof-scroll">
        <div style="padding:20px 14px;display:flex;flex-direction:column;gap:10px">
          <div class="prof-skel" style="height:120px"></div>
          <div class="prof-skel" style="height:60px"></div>
          <div class="prof-skel" style="height:180px"></div>
        </div>
      </div>
    </div>`;
  }

  const s = _stats;
  const initials = name !== '—' ? name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?' : '?';

  return `
${CSS}
<div class="prof-wrap">
  <div class="prof-scroll">
    ${(state.role || '').toLowerCase() === 'accountant' ? `<div style="padding:8px 20px 0;display:flex"><div onclick="window.__barops.openDrawer()" aria-label="Меню" style="width:36px;height:36px;border-radius:10px;background:var(--glass-bg);border:0.5px solid var(--border);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0"><div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div><div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div><div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div></div></div>` : ''}

    <!-- Hero -->
    <div class="prof-hero">
      <div class="prof-hero-card">
        <div class="prof-avatar">
          ${initials}
          <div class="prof-live-dot"></div>
        </div>
        <div>
          <div class="prof-name">${name}</div>
          <div class="prof-role">${state.role==='admin'?'Системний менеджер':state.role==='manager'?'Менеджер':state.role==='director'?'Керуючий':state.role==='accountant'?'Бухгалтер':state.role==='chef'?'Шеф-кухар':state.role==='cook'?'Кухар':state.role==='waiter'?'Офіціант':state.role==='trainee'?'Стажер':state.role==='runner'?'Ранер':(state.role==='cleaner'||state.role==='hostess'||state.role==='housekeeper')?'Хозяюшка':(state.role==='security'||state.role==='guard')?'Охоронець':(state.role==='storekeeper'||state.role==='warehouse')?'Завгосп':'Бармен'} · ${venue}</div>
          <div class="prof-venue">${s?.shift ? 'На зміні' : 'Поза зміною'}</div>
        </div>
      </div>
    </div>

    <!-- План -->
    ${planBadge()}

    <!-- Команда (тільки менеджер) -->
    ${isMgr && _team?.length ? `
    <div class="prof-sec">Команда закладу</div>
    <div class="prof-shifts">
      ${_team.slice(0, 5).map(m => {
        const isActive = m.status === 'active';
        const _rm = (m.role||'').toLowerCase();
        const roleLbl = _rm==='admin'?'Системний менеджер':_rm==='manager'?'Менеджер':_rm==='director'?'Керуючий':_rm==='accountant'?'Бухгалтер':_rm==='chef'?'Шеф-кухар':_rm==='cook'?'Кухар':_rm==='waiter'?'Офіціант':_rm==='trainee'?'Стажер':_rm==='runner'?'Ранер':(_rm==='cleaner'||_rm==='hostess'||_rm==='housekeeper')?'Хозяюшка':(_rm==='security'||_rm==='guard')?'Охоронець':(_rm==='storekeeper'||_rm==='warehouse')?'Завгосп':'Бармен';
        const lastLogin = m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('uk-UA') : 'не входив';
        return `
        <div class="prof-shift-row">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
            background:${isActive?'var(--green)':'var(--bg4)'};
            border:1.5px solid ${isActive?'var(--green)':'var(--border3)'}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${m.name}</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${roleLbl} · ${m.phone || '—'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:${isActive?'var(--green)':'var(--text2)'};font-family:var(--font-b)">${isActive?'Активний':'Неактивний'}</div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${lastLogin}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Контакти -->
    <div class="prof-sec">Контактна інформація</div>
    <div class="prof-info-card">
      ${phone !== '—' ? `<div class="prof-info-row"><div class="prof-info-lbl">📞 Телефон</div><div class="prof-info-val">${phone}</div></div>` : ''}
      ${email !== '—' ? `<div class="prof-info-row"><div class="prof-info-lbl">✉️ Email</div><div class="prof-info-val" style="font-size:12px">${email}</div></div>` : ''}
      <div class="prof-info-row"><div class="prof-info-lbl">🏢 Заклад</div><div class="prof-info-val">${venue}</div></div>
      <div class="prof-info-row"><div class="prof-info-lbl">👤 Роль</div><div class="prof-info-val">${state.role==='admin'?'Системний менеджер':state.role==='manager'?'Менеджер':state.role==='director'?'Керуючий':state.role==='accountant'?'Бухгалтер':state.role==='chef'?'Шеф-кухар':state.role==='cook'?'Кухар':state.role==='waiter'?'Офіціант':state.role==='trainee'?'Стажер':state.role==='runner'?'Ранер':'Бармен'}</div></div>
    </div>

    <!-- POS-інтеграція (лише власник = адмін) -->
    ${state.role === 'admin' ? posIntegrationBlock() : ''}

    <!-- Telegram -->
    <div class="prof-sec">Telegram</div>
    <div class="prof-info-card">
      <div class="prof-tg-row">
        <div style="flex:1;min-width:0">
          <div class="prof-info-lbl">Ваш @username в Telegram</div>
          <div style="font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b);line-height:1.4">
            Бот буде тегати вас коли надсилає фото накладних або акцизних марок
          </div>
        </div>
      </div>
      <div class="prof-tg-row">
        <span class="prof-tg-prefix">@</span>
        <input class="prof-tg-inp" id="prof-tg-username"
          type="text" placeholder="your_telegram"
          value="${(_profile?.telegramUsername || '').replace(/^@/,'')}"
          oninput="window.__profTgChanged()"
        >
        <button class="prof-tg-save ${_tgSaved?'saved':''}" id="prof-tg-save-btn"
          onclick="window.__profSaveTg()">
          ${_tgSaved ? '✓ Збережено' : 'Зберегти'}
        </button>
      </div>
    </div>

    <!-- Вигляд (тема) -->
    <div class="prof-sec">Вигляд</div>
    <div class="prof-settings">
      <div class="prof-setting-row">
        <div class="prof-setting-lbl">Тема оформлення</div>
        <div class="prof-theme-seg">
          <button class="prof-theme-opt ${!isLightActive()?'on':''}" onclick="window.__prof.setTheme('dark')" aria-label="Темна" title="Темна">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="prof-theme-opt ${isLightActive()?'on':''}" onclick="window.__prof.setTheme('light')" aria-label="Світла" title="Світла">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Сповіщення -->
    <div class="prof-sec">Сповіщення</div>
    <div class="prof-settings">
      <!-- Робочий тумблер push -->
      <div class="prof-setting-row">
        <div>
          <div class="prof-setting-lbl">Push-сповіщення</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${pushSupported() ? 'Заявки на закупку та нові завдання' : 'Недоступно на цьому пристрої'}</div>
        </div>
        <div class="prof-toggle ${pushPermission()==='granted'?'on':''}" id="prof-push-toggle"
          onclick="window.__prof.togglePush()">
          <div class="prof-toggle-knob" style="left:${pushPermission()==='granted'?18:2}px"></div>
        </div>
      </div>
      ${[
        ['Цінові алерти', true],
        ['Списання барменів', isMgr],
        ['Закриття зміни', false],
      ].map(([lbl, on]) => `
      <div class="prof-setting-row">
        <div class="prof-setting-lbl">${lbl}</div>
        <div class="prof-toggle ${on?'on':''}"
          onclick="this.classList.toggle('on');this.querySelector('.prof-toggle-knob').style.left=this.classList.contains('on')?'18px':'2px'">
          <div class="prof-toggle-knob" style="left:${on?18:2}px"></div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Вихід -->
    <button class="prof-close-shift" id="prof-close-shift-btn" onclick="window.__prof.closeShiftAndLogout()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2v7" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M5 4.27A6 6 0 1011 4.27" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Закрити зміну і вийти
    </button>
    <button class="prof-logout" onclick="window.__barops.logout()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 11l3-3-3-3M13 8H6" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Вийти з акаунту
    </button>
    <div style="height:14px"></div>
  </div>
</div>`;
}

function posIntegrationBlock() {
  const pos = _posSettings;
  const currentType = pos?.posType || 'manual';
  const sys = POS_SYSTEMS[currentType] || POS_SYSTEMS.manual;
  const isConnected = pos?.posConnected || (pos?.posLastSyncAt && !pos?.posLastError);

  return `
  <div class="prof-sec">POS-інтеграція</div>
  <div class="prof-info-card">
    <div class="prof-info-row">
      <div class="prof-info-lbl">Система</div>
      <div class="prof-info-val" style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px">${sys.icon}</span>
        <span style="color:${sys.color}">${sys.name}</span>
        ${isConnected ? '<span style="color:var(--green);font-size:11px">● підключено</span>' : '<span style="color:var(--text2);font-size:11px">○ не підключено</span>'}
      </div>
    </div>
    ${pos?.posUrl ? `<div class="prof-info-row"><div class="prof-info-lbl">URL</div><div class="prof-info-val" style="font-size:11px">${pos.posUrl}</div></div>` : ''}
    ${pos?.posLogin ? `<div class="prof-info-row"><div class="prof-info-lbl">Логін</div><div class="prof-info-val">${pos.posLogin}</div></div>` : ''}
  </div>
  <div style="margin:0 20px 14px">
    <button onclick="window.__barops.editVenue('${state.venueId || localStorage.getItem('barops_venueId')}', '${state.venue || ''}')"
      style="width:100%;height:48px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text0);cursor:pointer;font-family:var(--font-b)">
      ${isConnected ? '⚙️ Налаштування POS' : '🔗 Підключити POS-систему'}
    </button>
  </div>`;
}

window.__profTgChanged = function() {
  _tgSaved = false;
  const btn = document.getElementById('prof-tg-save-btn');
  if (btn) { btn.textContent = 'Зберегти'; btn.classList.remove('saved'); }
};

window.__profSaveTg = async function() {
  if (_tgSaving) return;
  const input = document.getElementById('prof-tg-username');
  const val   = (input?.value || '').trim().replace(/^@/, '');
  const btn   = document.getElementById('prof-tg-save-btn');

  _tgSaving = true;
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  try {
    const res = await fetch(`${API}/api/auth/me`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ telegramUsername: val }),
    });
    const d = await res.json();
    if (d.success) {
      _tgSaved = true;
      if (_profile) _profile.telegramUsername = d.telegramUsername;
      if (btn) { btn.textContent = '✓ Збережено'; btn.classList.add('saved'); btn.disabled = false; }
    } else {
      if (btn) { btn.textContent = 'Помилка'; btn.disabled = false; }
    }
  } catch {
    if (btn) { btn.textContent = 'Помилка'; btn.disabled = false; }
  }
  _tgSaving = false;
};

async function closeShiftAndLogout() {
  const btn = document.getElementById('prof-close-shift-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:.6">Закриваємо зміну…</span>'; }
  try {
    const t = token();
    const res  = await fetch(`${API}/api/shifts/current`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    if (data.success && data.data?.id) {
      await fetch(`${API}/api/shifts/${data.data.id}/close`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body:    JSON.stringify({ notes: '' }),
      });
    }
  } catch (e) {
    console.warn('[closeShiftAndLogout]', e.message);
  }
  window.__barops.logout();
}

async function togglePush() {
  const el = document.getElementById('prof-push-toggle');
  if (!pushSupported()) {
    alert('Push-сповіщення недоступні на цьому пристрої.\n\nНа iPhone: відкрийте додаток з головного екрана (PWA), iOS 16.4+.');
    return;
  }
  const isOn = el?.classList.contains('on');
  if (isOn) {
    await unsubscribePush();
    setPushToggle(false);
  } else {
    const ok = await subscribePush();
    if (ok) setPushToggle(true);
    else {
      setPushToggle(false);
      if (pushPermission() === 'denied') {
        alert('Сповіщення заблоковані. Увімкніть їх у налаштуваннях браузера/системи для цього сайту.');
      }
    }
  }
}
function setPushToggle(on) {
  const el = document.getElementById('prof-push-toggle');
  if (!el) return;
  el.classList.toggle('on', on);
  const knob = el.querySelector('.prof-toggle-knob');
  if (knob) knob.style.left = on ? '18px' : '2px';
}

window.__prof = {
  closeShiftAndLogout, togglePush,
  setTheme(t) {
    applyThemeChoice(t);   // застосовує тему (клас + плавний transition)
    // оновлюємо лише активний стан двох кнопок — БЕЗ ре-рендера всієї сторінки (не «оновлює» профіль)
    const light = isLightActive();
    const btns = document.querySelectorAll('.prof-theme-seg .prof-theme-opt');
    if (btns[0]) btns[0].classList.toggle('on', !light);   // 🌙 темна
    if (btns[1]) btns[1].classList.toggle('on', light);    // ☀️ світла
  },
};

export default {
  render() {
    _loading     = true;
    _profile     = null;
    _stats       = null;
    _plan        = null;
    _team        = null;
    _posSettings = null;
    _tgSaved     = false;
    loadData();
    return buildHTML();
  },
};
