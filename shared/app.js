/* ============================================================
   BarOps App Core — app.js
   Router, глобальний стан, tab bar, навігація між екранами.
   ============================================================ */

'use strict';

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
