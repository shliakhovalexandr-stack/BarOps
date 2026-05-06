/* ============================================================
   BarOps App Core — app.js
   Router, глобальний стан, tab bar (бармен), drawer (менеджер)
   ============================================================ */

'use strict';

/* ══════════════════════════════════════
   1. ГЛОБАЛЬНИЙ СТАН
   ══════════════════════════════════════ */
export const state = {
  role:    'bartender',
  venue:   'Sky Lounge',
  user:    'Олексій К.',
  route:   'auth',
  history: [],
};

/* Список закладів менеджера */
export const MANAGER_VENUES = [
  { id:'v1', name:'Sky Lounge',  pos:'Poster',   active:true  },
  { id:'v2', name:'Bar Noir',    pos:'iiko',     active:false },
  { id:'v3', name:'Rooftop Bar', pos:'R-Keeper', active:false },
];

let _drawerOpen = false;

/* ══════════════════════════════════════
   2. РЕЄСТР СТОРІНОК
   ══════════════════════════════════════ */
const PAGES = {};

export function registerPage(name, pageModule) {
  PAGES[name] = pageModule;
}

/* ══════════════════════════════════════
   3. TAB BAR CONFIG (тільки бармен)
   ══════════════════════════════════════ */
const TAB_BAR_BARTENDER = [
  {
    route: 'dashboard',
    label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'writeoff',
    label: 'Списання',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 16l2-2 8-8 2 2-8 8-2 2H4v-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M12 6l2 2" stroke="currentColor" stroke-width="1.4"/>
    </svg>`,
  },
  {
    route: 'ocr',
    label: 'Накладна',
    fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 5v12M5 11h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'recipes',
    label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 3h10l-2 6H8L6 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
      <path d="M8 9v8M14 9v8M6 17h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile',
    label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

/* ══════════════════════════════════════
   4. DRAWER RENDERER (менеджер)
   ══════════════════════════════════════ */
const DRAWER_NAV = [
  { route:'dashboard', label:'Дашборд',   icon:'🏠' },
  { route:'team',      label:'Команда',   icon:'👥' },
  { route:'ordering',  label:'Замовлення',icon:'📦' },
  { route:'recipes',   label:'Фудкост',   icon:'🍸' },
  { route:'analytics', label:'Аналітика', icon:'📊' },
  { route:'profile',   label:'Профіль',   icon:'👤' },
];

function renderDrawer() {
  const el = document.getElementById('app-drawer-wrap');
  if (!el) return;

  el.innerHTML = `
  <!-- Overlay -->
  <div id="app-drawer-overlay"
    style="position:fixed;inset:0;z-index:200;background:rgba(0,0,0,${_drawerOpen?'.72':'0'});
           backdrop-filter:blur(${_drawerOpen?'4px':'0'});
           pointer-events:${_drawerOpen?'all':'none'};
           transition:background .25s,backdrop-filter .25s"
    onclick="window.__barops.closeDrawer()">
  </div>

  <!-- Drawer panel -->
  <div style="position:fixed;top:0;left:0;bottom:0;z-index:201;
              width:280px;background:var(--bg1);
              border-right:0.5px solid var(--border2);
              transform:translateX(${_drawerOpen?'0':'-100%'});
              transition:transform .3s cubic-bezier(.22,1,.36,1);
              display:flex;flex-direction:column;overflow:hidden">

    <!-- Drawer header -->
    <div style="padding:52px 20px 16px;border-bottom:0.5px solid var(--border2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)">
          👨‍💼 Менеджер
        </div>
        <div onclick="window.__barops.closeDrawer()"
          style="width:28px;height:28px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);
                 display:flex;align-items:center;justify-content:center;cursor:pointer">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div style="font-family:var(--font-h);font-size:18px;font-weight:800;color:var(--text0);letter-spacing:-.02em">
        ${state.venue}
      </div>
    </div>

    <!-- Nav items -->
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

      <!-- Divider -->
      <div style="height:1px;background:var(--border2);margin:8px 20px"></div>

      <!-- Заклади -->
      <div style="padding:8px 20px 6px;font-size:10px;color:var(--text2);
                  letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b)">
        Заклади
      </div>
      ${MANAGER_VENUES.map(v => `
      <div onclick="window.__barops.switchVenue('${v.id}')"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;
               background:${v.active?'rgba(29,158,117,.06)':'transparent'};
               transition:background .12s">
        <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                    background:${v.active?'var(--green)':'var(--bg4)'};
                    border:1.5px solid ${v.active?'var(--green)':'var(--border3)'}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:${v.active?'var(--text0)':'var(--text2)'};
                      font-family:var(--font-b);font-weight:${v.active?'500':'400'}">${v.name}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${v.pos}</div>
        </div>
        ${v.active ? `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` : ''}
      </div>`).join('')}

      <!-- Додати заклад -->
      <div onclick="window.__barops.addVenuePrompt()"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;transition:background .12s">
        <div style="width:8px;height:8px;border-radius:50%;background:transparent;
                    border:1.5px dashed var(--green);flex-shrink:0"></div>
        <div style="font-size:13px;color:var(--green);font-family:var(--font-b)">+ Підключити заклад</div>
      </div>
    </div>

    <!-- Drawer footer -->
    <div style="padding:12px 20px 32px;border-top:0.5px solid var(--border2)">
      <div onclick="window.__barops.navigate('auth');window.__barops.closeDrawer()"
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

export function openDrawer() {
  _drawerOpen = true;
  renderDrawer();
}

export function closeDrawer() {
  _drawerOpen = false;
  renderDrawer();
}

export function switchVenue(id) {
  MANAGER_VENUES.forEach(v => v.active = v.id === id);
  const v = MANAGER_VENUES.find(x => x.id === id);
  if (v) state.venue = v.name;
  renderDrawer();
  // Оновити поточну сторінку
  const page = PAGES[state.route];
  if (page) {
    const view = document.getElementById('app-view');
    if (view) view.innerHTML = page.render({});
    if (typeof page.init === 'function') page.init({});
  }
}

export function addVenuePrompt() {
  const name = prompt('Назва нового закладу:');
  if (!name?.trim()) return;
  const pos = prompt('POS-система (Poster / iiko / R-Keeper):') || 'Poster';
  const id = 'v' + Date.now();
  MANAGER_VENUES.push({ id, name: name.trim(), pos, active: false });
  renderDrawer();
}

/* Глобальна функція для виклику бургер-кнопки з будь-якої сторінки */
export function BURGER_BTN() {
  return `
  <div onclick="window.__barops.openDrawer()"
    style="width:36px;height:36px;border-radius:10px;background:var(--bg2);
           border:0.5px solid var(--border2);display:flex;flex-direction:column;
           align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0;
           transition:background .12s">
    <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
    <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
    <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
  </div>`;
}

/* ══════════════════════════════════════
   5. НАВІГАЦІЯ
   ══════════════════════════════════════ */
export async function navigate(route, opts = {}) {
  const page = PAGES[route];
  if (!page) {
    console.warn(`[BarOps] Unknown route: "${route}"`);
    return;
  }

  if (!opts.replace && state.route !== route) {
    state.history.push(state.route);
  }
  state.route = route;

  const view = document.getElementById('app-view');
  if (!view) return;

  if (typeof page._ensure === 'function') {
    if (!page._loaded) {
      view.style.opacity = '0';
      await page._ensure();
      await new Promise(r => setTimeout(r, 30));
    }
  }

  view.style.transition = 'none';
  view.style.opacity = '0';
  view.style.transform = 'translateY(6px)';

  await new Promise(r => setTimeout(r, 60));

  try {
    view.innerHTML = page.render(opts.params || {});
  } catch (err) {
    console.error(`[BarOps] render error on "${route}":`, err);
    view.innerHTML = `<div class="error-screen">
      <h2>Помилка завантаження</h2><p>${err.message}</p>
      <button onclick="window.__barops.navigate('dashboard')"
        style="margin-top:16px;height:44px;padding:0 24px;background:var(--green);
               border:none;border-radius:12px;font-size:14px;font-family:var(--font-h);
               font-weight:500;color:#fff;cursor:pointer">На дашборд</button>
    </div>`;
  }

  view.style.transition = 'opacity 240ms ease, transform 240ms ease';
  view.style.opacity = '1';
  view.style.transform = 'none';

  try {
    if (typeof page.init === 'function') page.init(opts.params || {});
  } catch (err) {
    console.error(`[BarOps] init error on "${route}":`, err);
  }

  // Tab bar — бармен і менеджер
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

  // Drawer — тільки для менеджера (зверху, незалежно від Tab Bar)
  const drawerWrap = document.getElementById('app-drawer-wrap');
  if (drawerWrap) {
    _drawerOpen = false;
    if (state.role === 'manager' && !noTabBar.includes(route)) {
      renderDrawer();
    } else {
      drawerWrap.innerHTML = '';
    }
  }
}

export function goBack() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  navigate(prev, { replace: true });
}

const TAB_BAR_MANAGER = [
  {
    route: 'dashboard',
    label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'team',
    label: 'Команда',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8"  cy="8"  r="3" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="15" cy="8"  r="3" stroke="currentColor" stroke-width="1.4"/>
      <path d="M3 19c0-3 2-5 5-5M13 19c0-3 2-5 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'analytics',
    label: 'Аналітика',
    fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 15l4-5 4 3 4-6 4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    route: 'recipes',
    label: 'Фудкост',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/>
      <path d="M11 8v3l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile',
    label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

/* ══════════════════════════════════════
   6. TAB BAR RENDERER (бармен + менеджер)
   ══════════════════════════════════════ */
function renderTabBar() {
  const el = document.getElementById('app-tab-bar');
  if (!el) return;
  const tabs = state.role === 'manager' ? TAB_BAR_MANAGER : TAB_BAR_BARTENDER;
  el.innerHTML = tabs.map(tab => {
    const isActive = state.route === tab.route;
    const color = isActive ? 'var(--green)' : 'var(--text2)';
    if (tab.fab) {
      return `
        <div class="tab-bar__fab-wrap" onclick="window.__barops.navigate('${tab.route}')">
          <div class="tab-bar__fab">${tab.icon}</div>
          <span class="tab-bar__label">${tab.label}</span>
        </div>`;
    }
    return `
      <button class="tab-bar__item ${isActive?'tab-bar__item--active':''}"
        onclick="window.__barops.navigate('${tab.route}')"
        aria-label="${tab.label}" style="--tab-color:${color}">
        <div class="tab-bar__icon" style="color:${color}">
          ${tab.icon}
          ${tab.badge?`<span class="tab-bar__badge">${tab.badge}</span>`:''}
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
  state.venue = role === 'manager' ? (MANAGER_VENUES.find(v=>v.active)?.name||'Sky Lounge') : 'Sky Lounge';
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
  };
  updateClock();
  setInterval(updateClock, 1000);
  const sb = document.getElementById('app-status-bar');
  if (sb) sb.innerHTML = STATUS_BAR_HTML;
  await navigate('auth', { replace: true });
}


/* ══════════════════════════════════════
   1. ГЛОБАЛЬНИЙ СТАН
   ══════════════════════════════════════ */
export const state = {
  role:    'bartender',   // 'bartender' | 'manager'
  venue:   'Sky Lounge',
  user:    'Олексій К.',
  route:   'auth',        // поточний маршрут
  history: [],            // стек для кнопки «назад»
};

/* ══════════════════════════════════════
   2. РЕЄСТР СТОРІНОК
   (кожна page реєструється сама через registerPage)
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
    route: 'dashboard',
    label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'writeoff',
    label: 'Списання',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 16l2-2 8-8 2 2-8 8-2 2H4v-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M12 6l2 2" stroke="currentColor" stroke-width="1.4"/>
    </svg>`,
  },
  {
    route: 'ocr',
    label: 'Накладна',
    fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 5v12M5 11h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'recipes',
    label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 3h10l-2 6H8L6 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
      <path d="M8 9v8M14 9v8M6 17h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile',
    label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

const TAB_BAR_MANAGER = [
  {
    route: 'dashboard',
    label: 'Дашборд',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="7" height="8" rx="1.5" fill="currentColor" opacity=".7"/>
      <rect x="12" y="3" width="7" height="16" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  {
    route: 'team',
    label: 'Команда',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8"  cy="8"  r="3" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="15" cy="8"  r="3" stroke="currentColor" stroke-width="1.4"/>
      <path d="M3 19c0-3 2-5 5-5M13 19c0-3 2-5 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'manager',
    label: 'Панель',
    fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="4" width="14" height="14" rx="3" stroke="white" stroke-width="1.6"/>
      <path d="M8 11h6M11 8v6" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'recipes',
    label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/>
      <path d="M11 8v3l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'profile',
    label: 'Профіль',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M4 19c0-3.9 3.1-7 7-7h.5c3.9 0 6.5 3.1 6.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
];

/* ══════════════════════════════════════
   4. НАВІГАЦІЯ
   ══════════════════════════════════════ */

/**
 * navigate(route, opts)
 * route — ключ з PAGES
 * opts.replace — не додавати в history (для auth, помилок)
 * opts.params  — об'єкт параметрів для передачі сторінці
 */
export async function navigate(route, opts = {}) {
  const page = PAGES[route];
  if (!page) {
    console.warn(`[BarOps] Unknown route: "${route}"`);
    return;
  }

  // Оновлюємо стан
  if (!opts.replace && state.route !== route) {
    state.history.push(state.route);
  }
  state.route = route;

  const view = document.getElementById('app-view');
  if (!view) return;

  // Якщо сторінка ще не завантажена — чекаємо
  if (typeof page._ensure === 'function') {
    // Показуємо лоадер тільки якщо не завантажено
    if (!page._loaded) {
      view.style.opacity = '0';
      await page._ensure();
      // Додаткова пауза щоб DOM встиг обробити
      await new Promise(r => setTimeout(r, 30));
    }
  }

  // Анімація виходу
  view.style.transition = 'none';
  view.style.opacity = '0';
  view.style.transform = 'translateY(6px)';

  await new Promise(r => setTimeout(r, 60));

  // Рендеримо контент
  try {
    view.innerHTML = page.render(opts.params || {});
  } catch (err) {
    console.error(`[BarOps] render error on "${route}":`, err);
    view.innerHTML = `<div class="error-screen">
      <h2>Помилка завантаження</h2>
      <p>${err.message}</p>
      <button onclick="window.__barops.navigate('dashboard')"
        style="margin-top:16px;height:44px;padding:0 24px;background:var(--green);
               border:none;border-radius:12px;font-size:14px;font-family:var(--font-h);
               font-weight:500;color:#fff;cursor:pointer">
        На дашборд
      </button>
    </div>`;
  }

  // Анімація входу
  view.style.transition = 'opacity 240ms ease, transform 240ms ease';
  view.style.opacity = '1';
  view.style.transform = 'none';

  // Ініціалізація сторінки
  try {
    if (typeof page.init === 'function') page.init(opts.params || {});
  } catch (err) {
    console.error(`[BarOps] init error on "${route}":`, err);
  }

  // Tab bar
  renderTabBar();
  const noTabBar = ['auth'];
  const tabBarEl = document.getElementById('app-tab-bar');
  if (tabBarEl) {
    tabBarEl.style.display = noTabBar.includes(route) ? 'none' : 'flex';
  }
}

export function goBack() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  navigate(prev, { replace: true });
}

/* ══════════════════════════════════════
   5. TAB BAR RENDERER
   ══════════════════════════════════════ */
function renderTabBar() {
  const el = document.getElementById('app-tab-bar');
  if (!el) return;

  const tabs = state.role === 'manager' ? TAB_BAR_MANAGER : TAB_BAR_BARTENDER;

  el.innerHTML = tabs.map(tab => {
    const isActive = state.route === tab.route;
    const color = isActive ? 'var(--green)' : 'var(--text2)';

    if (tab.fab) {
      return `
        <div class="tab-bar__fab-wrap" onclick="window.__barops.navigate('${tab.route}')">
          <div class="tab-bar__fab">
            ${tab.icon}
          </div>
          <span class="tab-bar__label">${tab.label}</span>
        </div>`;
    }

    return `
      <button
        class="tab-bar__item ${isActive ? 'tab-bar__item--active' : ''}"
        onclick="window.__barops.navigate('${tab.route}')"
        aria-label="${tab.label}"
        style="--tab-color:${color}"
      >
        <div class="tab-bar__icon" style="color:${color}">
          ${tab.icon}
          ${tab.badge ? `<span class="tab-bar__badge">${tab.badge}</span>` : ''}
        </div>
        <span class="tab-bar__label" style="color:${color}">${tab.label}</span>
      </button>`;
  }).join('');
}

/* ══════════════════════════════════════
   6. ROLE SWITCHER
   ══════════════════════════════════════ */
export function setRole(role) {
  state.role  = role;
  state.history = [];
  navigate('dashboard', { replace: true });
}

/* ══════════════════════════════════════
   7. CLOCK
   ══════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('app-clock');
  if (!el) return;
  const n = new Date();
  el.textContent =
    String(n.getHours()).padStart(2, '0') + ':' +
    String(n.getMinutes()).padStart(2, '0');
}

/* ══════════════════════════════════════
   8. STATUS BAR SVG ICONS
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
   9. BOOTSTRAP
   ══════════════════════════════════════ */
export async function bootstrap() {
  // Expose globally for inline onclick handlers
  window.__barops = { navigate, goBack, setRole, state };

  // Clock tick
  updateClock();
  setInterval(updateClock, 1000);

  // Inject status bar content
  const sb = document.getElementById('app-status-bar');
  if (sb) sb.innerHTML = STATUS_BAR_HTML;

  // Start at auth
  await navigate('auth', { replace: true });
}
