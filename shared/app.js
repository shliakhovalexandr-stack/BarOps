/* ============================================================
   BarOps App Core — app.js
   Router, стан, tab bar (бармен), drawer (менеджер)
   ============================================================ */

'use strict';

/* ══════════════════════════════════════
   1. ГЛОБАЛЬНИЙ СТАН
   ══════════════════════════════════════ */
export const state = {
  role:    localStorage.getItem('barops_role')  || 'bartender',
  venue:   localStorage.getItem('barops_venue') || '',
  user:    localStorage.getItem('barops_user')  || '',
  route:   'auth',
  history: [],
};

export let MANAGER_VENUES = [];

// Завантажуємо реальні заклади з бекенду
async function loadVenuesIntoDrawer() {
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch('https://barops-backend-production.up.railway.app/api/auth/venues', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data.venues && data.venues.length > 0) {
      // Визначаємо активний заклад з state
      MANAGER_VENUES = data.venues.map((v, i) => ({
        id:     v.id,
        name:   v.name,
        pos:    'Syrve',
        active: v.name === state.venue || i === 0,
      }));
      // Встановлюємо перший активний як поточний
      const active = MANAGER_VENUES.find(v => v.active);
      if (active && !state.venue) state.venue = active.name;
      renderDrawer();
    }
  } catch {
    // Fallback — показуємо поточний заклад
    MANAGER_VENUES = [{ id:'current', name: state.venue || 'Заклад', pos:'Syrve', active:true }];
    renderDrawer();
  }
}

let _drawerOpen = false;

/* ══════════════════════════════════════
   2. РЕЄСТР СТОРІНОК
   ══════════════════════════════════════ */
const PAGES = {};

export function registerPage(name, pageModule) {
  PAGES[name] = pageModule;
}

/* ══════════════════════════════════════
   3. TAB BAR CONFIG
   ══════════════════════════════════════ */
const TAB_BAR_BARTENDER = [
  {
    route: 'dashboard', label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'shift-log', label: 'Журнал',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="3" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/>
      <path d="M7 8h8M7 12h8M7 16h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'ocr', label: 'Накладна', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 5v12M5 11h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'recipes', label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 3h10l-2 6H8L6 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
      <path d="M8 9v8M14 9v8M6 17h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile', label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

const TAB_BAR_MANAGER = [
  {
    route: 'dashboard', label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'team', label: 'Команда',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="15" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/>
      <path d="M3 19c0-3 2-5 5-5M13 19c0-3 2-5 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'analytics', label: 'Аналітика', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 15l4-5 4 3 4-6 4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    route: 'recipes', label: 'Фудкост',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/>
      <path d="M11 8v3l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile', label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

/* ══════════════════════════════════════
   4. DRAWER (менеджер)
   ══════════════════════════════════════ */
const DRAWER_NAV = [
  { route:'dashboard', label:'Дашборд',    icon:'🏠' },
  { route:'team',      label:'Команда',    icon:'👥' },
  { route:'ordering',  label:'Замовлення', icon:'📦' },
  { route:'recipes',   label:'Фудкост',    icon:'🍸' },
  { route:'analytics', label:'Аналітика',  icon:'📊' },
  { route:'profile',   label:'Профіль',    icon:'👤' },
];

function renderDrawer() {
  const el = document.getElementById('app-drawer-wrap');
  if (!el) return;
  el.innerHTML = `
  <div id="app-drawer-overlay"
    style="position:fixed;inset:0;z-index:200;
           background:rgba(0,0,0,${_drawerOpen?'.72':'0'});
           backdrop-filter:blur(${_drawerOpen?'4px':'0'});
           pointer-events:${_drawerOpen?'all':'none'};
           transition:background .25s,backdrop-filter .25s"
    onclick="window.__barops.closeDrawer()"></div>
  <div style="position:fixed;top:0;left:0;bottom:0;z-index:201;width:280px;
              background:var(--bg1);border-right:0.5px solid var(--border2);
              transform:translateX(${_drawerOpen?'0':'-100%'});
              transition:transform .3s cubic-bezier(.22,1,.36,1);
              display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:52px 20px 16px;border-bottom:0.5px solid var(--border2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--font-b);font-size:12px;color:var(--text2)">👨‍💼 Менеджер</div>
        <div onclick="window.__barops.closeDrawer()"
          style="width:28px;height:28px;border-radius:50%;background:var(--bg2);
                 border:0.5px solid var(--border2);display:flex;align-items:center;
                 justify-content:center;cursor:pointer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div style="font-family:var(--font-h);font-size:20px;font-weight:800;
                  color:var(--text0);letter-spacing:-.02em">${state.venue}</div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:8px 0">
      ${DRAWER_NAV.map(item => {
        const isActive = state.route === item.route;
        return `
        <div onclick="window.__barops.navigate('${item.route}');window.__barops.closeDrawer()"
          style="display:flex;align-items:center;gap:12px;padding:12px 20px;cursor:pointer;
                 background:${isActive?'rgba(29,158,117,.08)':'transparent'};
                 border-right:${isActive?'3px solid var(--green)':'3px solid transparent'};
                 transition:background .12s">
          <span style="font-size:18px;width:24px;text-align:center">${item.icon}</span>
          <span style="font-family:var(--font-b);font-size:14px;
                       color:${isActive?'var(--green)':'var(--text1)'};
                       font-weight:${isActive?'600':'400'}">${item.label}</span>
        </div>`;
      }).join('')}
      <div style="height:1px;background:var(--border2);margin:8px 20px"></div>
      <div style="padding:8px 20px 6px;font-size:10px;color:var(--text2);
                  letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b)">Заклади</div>
      ${MANAGER_VENUES.map(v => `
      <div onclick="window.__barops.switchVenue('${v.id}')"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;
               background:${v.active?'rgba(29,158,117,.06)':'transparent'};transition:background .12s">
        <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                    background:${v.active?'var(--green)':'var(--bg4)'};
                    border:1.5px solid ${v.active?'var(--green)':'var(--border3)'}"></div>
        <div style="flex:1">
          <div style="font-size:13px;color:${v.active?'var(--text0)':'var(--text2)'};
                      font-family:var(--font-b);font-weight:${v.active?'500':'400'}">${v.name}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b)">${v.pos}</div>
        </div>
        ${v.active?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`:''}
      </div>`).join('')}
      <div onclick="window.__barops.addVenuePrompt()"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer">
        <div style="width:8px;height:8px;border-radius:50%;border:1.5px dashed var(--green)"></div>
        <div style="font-size:13px;color:var(--green);font-family:var(--font-b)">+ Підключити заклад</div>
      </div>
    </div>
    <div style="padding:12px 20px 32px;border-top:0.5px solid var(--border2)">
      <div onclick="localStorage.clear();window.__barops.navigate('auth');window.__barops.closeDrawer()"
        style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M10 11l3-3-3-3M13 8H6" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-size:13px;color:var(--red);font-family:var(--font-b)">Вийти з акаунту</span>
      </div>
    </div>
  </div>`;
}

export function openDrawer()  {
  _drawerOpen = true;
  renderDrawer();
  // Оновлюємо список закладів кожного разу при відкритті
  if (MANAGER_VENUES.length === 0) loadVenuesIntoDrawer();
}
export function closeDrawer() { _drawerOpen = false; renderDrawer(); }

export function switchVenue(id) {
  MANAGER_VENUES.forEach(v => v.active = v.id === id);
  const v = MANAGER_VENUES.find(x => x.id === id);
  if (v) {
    state.venue = v.name;
    localStorage.setItem('barops_venue', v.name);
  }
  renderDrawer();
  const page = PAGES[state.route];
  if (page) {
    const view = document.getElementById('app-view');
    if (view) { view.innerHTML = page.render({}); }
    if (typeof page.init === 'function') page.init({});
  }
}

export function addVenuePrompt() {
  const name = prompt('Назва нового закладу:');
  if (!name?.trim()) return;
  const pos = prompt('POS-система (Poster / iiko / R-Keeper):') || 'Poster';
  MANAGER_VENUES.push({ id:'v'+Date.now(), name:name.trim(), pos, active:false });
  renderDrawer();
}

/* ══════════════════════════════════════
   5. НАВІГАЦІЯ
   ══════════════════════════════════════ */
export async function navigate(route, opts = {}) {
  const page = PAGES[route];
  if (!page) { console.warn(`[BarOps] Unknown route: "${route}"`); return; }

  if (!opts.replace && state.route !== route) state.history.push(state.route);
  state.route = route;

  const view = document.getElementById('app-view');
  if (!view) return;

  view.style.transition = 'none';
  view.style.opacity = '0';
  view.style.transform = 'translateY(6px)';
  await new Promise(r => setTimeout(r, 60));

  try {
    view.innerHTML = page.render(opts.params || {});
  } catch (err) {
    console.error(`[BarOps] render error on "${route}":`, err);
    view.innerHTML = `<div style="padding:40px;text-align:center">
      <p style="color:var(--red);font-family:var(--font-b)">${err.message}</p>
      <button onclick="window.__barops.navigate('dashboard')"
        style="margin-top:16px;height:44px;padding:0 24px;background:var(--green);
               border:none;border-radius:12px;font-size:14px;font-family:var(--font-h);
               font-weight:500;color:#fff;cursor:pointer">На дашборд</button>
    </div>`;
  }

  view.style.transition = 'opacity 240ms ease, transform 240ms ease';
  view.style.opacity = '1';
  view.style.transform = 'none';

  try { if (typeof page.init === 'function') page.init(opts.params || {}); }
  catch (err) { console.error(`[BarOps] init error on "${route}":`, err); }

  // Tab bar
  const noTabBar = ['auth'];
  const tabBarEl = document.getElementById('app-tab-bar');
  if (tabBarEl) {
    if (noTabBar.includes(route)) {
      tabBarEl.style.display = 'none';
    } else {
      tabBarEl.style.display = 'flex';
      renderTabBar();
    }
  }

  // Drawer (менеджер)
  const drawerWrap = document.getElementById('app-drawer-wrap');
  if (drawerWrap) {
    _drawerOpen = false;
    if (state.role === 'manager' && !noTabBar.includes(route)) renderDrawer();
    else drawerWrap.innerHTML = '';
  }
}

export function goBack() {
  if (state.history.length === 0) return;
  navigate(state.history.pop(), { replace: true });
}

/* ══════════════════════════════════════
   6. TAB BAR RENDERER
   ══════════════════════════════════════ */
function renderTabBar() {
  const el = document.getElementById('app-tab-bar');
  if (!el) return;
  const tabs = state.role === 'manager' ? TAB_BAR_MANAGER : TAB_BAR_BARTENDER;
  el.innerHTML = tabs.map(tab => {
    const isActive = state.route === tab.route;
    const color = isActive ? 'var(--green)' : 'var(--text2)';
    if (tab.fab) return `
      <div class="tab-bar__fab-wrap" onclick="window.__barops.navigate('${tab.route}')">
        <div class="tab-bar__fab">${tab.icon}</div>
        <span class="tab-bar__label">${tab.label}</span>
      </div>`;
    return `
      <button class="tab-bar__item ${isActive?'tab-bar__item--active':''}"
        onclick="window.__barops.navigate('${tab.route}')"
        aria-label="${tab.label}" style="--tab-color:${color}">
        <div class="tab-bar__icon" style="color:${color}">
          ${tab.icon}${tab.badge?`<span class="tab-bar__badge">${tab.badge}</span>`:''}
        </div>
        <span class="tab-bar__label" style="color:${color}">${tab.label}</span>
      </button>`;
  }).join('');
}

/* ══════════════════════════════════════
   7. ROLE SWITCHER
   ══════════════════════════════════════ */
export function setRole(role) {
  state.role  = role;
  state.user  = role === 'manager' ? 'Костянтин О.' : 'Олексій К.';
  state.venue = localStorage.getItem('barops_venue') || '';
  if (role === 'manager') {
    loadVenuesIntoDrawer();
  }
  state.history = [];
  navigate('dashboard', { replace: true });
}

/* ══════════════════════════════════════
   8. CLOCK
   ══════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('app-clock');
  if (!el) return;
  const n = new Date();
  el.textContent = String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}

/* ══════════════════════════════════════
   9. STATUS BAR
   ══════════════════════════════════════ */
export const STATUS_BAR_HTML = `
  <span id="app-clock">21:34</span>
  <div class="status-bar__right">
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
      <rect x="0" y="3" width="3" height="7" rx="1" fill="var(--green)"/>
      <rect x="4" y="1" width="3" height="9" rx="1" fill="var(--green)"/>
      <rect x="8" y="0" width="3" height="10" rx="1" fill="var(--green)"/>
      <rect x="12" y="2" width="3" height="8" rx="1" fill="var(--bg4)"/>
    </svg>
    <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
      <rect x=".5" y=".5" width="18" height="10" rx="2" stroke="var(--bg4)"/>
      <rect x="2" y="2" width="13" height="7" rx="1" fill="var(--green)"/>
      <rect x="20" y="3" width="2" height="5" rx="1" fill="var(--bg4)"/>
    </svg>
  </div>`;

/* ══════════════════════════════════════
   10. BOOTSTRAP
   ══════════════════════════════════════ */
export async function bootstrap() {
  window.__barops = {
    navigate, goBack, setRole, state,
    openDrawer, closeDrawer, switchVenue, addVenuePrompt,
    logout: function() {
      localStorage.removeItem('barops_token');
      localStorage.removeItem('barops_refresh');
      localStorage.removeItem('barops_venue');
      localStorage.removeItem('barops_role');
      localStorage.removeItem('barops_user');
      state.role  = 'bartender';
      state.venue = '';
      state.user  = '';
      navigate('auth', { replace: true });
    },
  };
  updateClock();
  setInterval(updateClock, 1000);
  const sb = document.getElementById('app-status-bar');
  // Приховуємо внутрішній статус-бар на мобільному
  if (sb) {
    if (window.innerWidth <= 500) {
      sb.style.display = 'none';
    } else {
      sb.innerHTML = STATUS_BAR_HTML;
    }
  }
  await navigate('auth', { replace: true });
}
