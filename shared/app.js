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
export let ARCHIVED_VENUES = [];   // архівовані заклади (для відновлення в шухляді)

// Завантажуємо архівовані заклади (лінива підгрузка при розкритті секції)
async function loadArchivedVenues() {
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch('https://barops-backend-production.up.railway.app/api/venues/archived', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    ARCHIVED_VENUES = (data.venues || []).map(v => ({
      id:   v.id,
      name: v.name,
      pos:  v.posType === 'poster' ? 'Poster' : v.posType === 'manual' ? 'Ручний облік' : 'Syrve',
    }));
  } catch {
    ARCHIVED_VENUES = [];
  }
  _archivedLoaded = true;
  renderDrawer();
}

// Завантажуємо реальні заклади з бекенду
async function loadVenuesIntoDrawer() {
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch('https://barops-backend-production.up.railway.app/api/auth/venues', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (data.venues && data.venues.length > 0) {
      const savedId = localStorage.getItem('barops_venueId');
      MANAGER_VENUES = data.venues.map((v, i) => ({
        id:     v.id,
        name:   v.name,
        pos:    v.posType === 'poster' ? 'Poster' : v.posType === 'manual' ? 'Ручний облік' : 'Syrve',
        active: savedId ? v.id === savedId : i === 0,
      }));
      // fallback: якщо збережений ID не знайдено — перший заклад
      if (!MANAGER_VENUES.some(v => v.active)) MANAGER_VENUES[0].active = true;
      const active = MANAGER_VENUES.find(v => v.active);
      if (active) {
        state.venue   = active.name;
        state.venueId = active.id;
        localStorage.setItem('barops_venue',   active.name);
        localStorage.setItem('barops_venueId', active.id);
      }
      renderDrawer();
    }
  } catch {
    // Fallback — показуємо поточний заклад
    MANAGER_VENUES = [{ id:'current', name: state.venue || 'Заклад', pos:'Syrve', active:true }];
    renderDrawer();
  }
}

let _drawerOpen = false;
let _venueMenuId = null; // id закладу з відкритим контекстним меню
let _archivedOpen = false;   // розкрита секція «Архівовані»
let _archivedLoaded = false; // чи вже тягнули список архівованих
let _addSheetOpen = false;
let _addDraft = { name: '', posType: 'syrve' };
let _addSaving = false;
let _addError = '';

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
    route: 'dashboard', label: 'Головна',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 10.5L11 3l8 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 9.5V18a1 1 0 001 1h10a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M9 19v-5h4v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'recipe-book', label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="2" width="11" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M7 6h5M7 9h5M7 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M15 6h2a1 1 0 011 1v10a1 1 0 01-1 1H8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'ocr', label: 'Накладна', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 5v12M5 11h12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'journal', label: 'Журнал',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="3" width="14" height="16" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M8 8h6M8 12h6M8 16h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
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

// Офіціант — як у бармена, але «Накладна» → «Каса» (центр) і «Рецепти» → «Стоп-ліст»
const TAB_BAR_WAITER = TAB_BAR_BARTENDER.map(tab => {
  if (tab.route === 'ocr') return {
    route: 'cash', label: 'Каса', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="6" width="16" height="10" rx="1.6" stroke="white" stroke-width="1.8"/>
      <circle cx="11" cy="11" r="2.3" stroke="white" stroke-width="1.6"/>
      <path d="M6 9v4M16 9v4" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  };
  if (tab.route === 'recipe-book') return {
    route: 'stop-list', label: 'Стоп-ліст',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="7.5" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7.5 11h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
  };
  return tab;
});

// Кухар — кухонний працівник: лише списання/переміщення, графік, інвентаризація кухні
const TAB_BAR_COOK = [
  {
    route: 'dashboard', label: 'Головна',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 10.5L11 3l8 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 9.5V18a1 1 0 001 1h10a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M9 19v-5h4v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'schedule', label: 'Графік',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/>
      <path d="M3 8h16M7 2v4M15 2v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'writeoff', label: 'Списання', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M5 17l2-2 7-7 2 2-7 7-2 2H5v-2z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M12 6l2 2" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'inventory', label: 'Інвентар.',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/>
      <path d="M7 8h8M7 12h6M7 16h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
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

const TAB_BAR_ACCOUNTANT = [
  {
    route: 'dashboard', label: 'Головна',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 10.5L11 3l8 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 9.5V18a1 1 0 001 1h10a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M9 19v-5h4v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'debts', label: 'Борги',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 6h14M4 10h10M4 14h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="16" cy="15" r="4" stroke="currentColor" stroke-width="1.4"/>
      <path d="M16 13.5v1.5l1 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'inventory', label: 'Інвентар.',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/>
      <path d="M7 8h8M7 12h6M7 16h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    route: 'writeoff', label: 'Списання',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M5 17l2-2 7-7 2 2-7 7-2 2H5v-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M12 6l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
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
    route: 'dashboard', label: 'Головна',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 10.5L11 3l8 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5 9.5V18a1 1 0 001 1h10a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M9 19v-5h4v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
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
    route: 'performance', label: 'Продуктивність', fab: true,
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 15l4-5 4 3 4-6 4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    route: 'recipe-book', label: 'Рецепти',
    icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="2" width="11" height="15" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
      <path d="M7 6h5M7 9h5M7 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M15 6h2a1 1 0 011 1v10a1 1 0 01-1 1H8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
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

// Менеджер і Керуючий — як адмінський таб-бар, але «Рецепти» замінено на «Журнал»
const TAB_BAR_MGR_JOURNAL = TAB_BAR_MANAGER.map(tab =>
  tab.route === 'recipe-book'
    ? { route: 'journal', label: 'Журнал',
        icon: `<svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="3" width="14" height="16" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M8 8h6M8 12h6M8 16h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>` }
    : tab
);

/* ══════════════════════════════════════
   4. DRAWER (менеджер)
   ══════════════════════════════════════ */
// Бічне меню: базове + операційні (Замовлення/Списання/Акцизні) + Рецепти.
const DRAWER_NAV = [
  { route:'dashboard',   label:'Головна',     svg:`<path d="M2 8L9 2l7 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7v9a.5.5 0 00.5.5h4V13h1v3.5h4a.5.5 0 00.5-.5V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>` },
  { route:'team',        label:'Команда',     svg:`<circle cx="6" cy="5" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-2.2 1.8-4 4-4h2M9 14c0-2.2 1.8-4 4-4h0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>` },
  { route:'ordering',    label:'Замовлення',  svg:`<rect x="3" y="2" width="11" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 6h5M6 9h5M6 12h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'writeoff',    label:'Списання',    svg:`<path d="M4 15l2-2 6-6 2 2-6 6-2 2H4v-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 5l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>` },
  { route:'excise',      label:'Акцизні',     svg:`<rect x="2" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M4 8h8M4 11h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="13" cy="11" r="1.5" fill="currentColor" opacity=".7"/>` },
  { route:'recipe-book', label:'Рецепти',     svg:`<rect x="2" y="1" width="10" height="14" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 5h4M5 8h4M5 11h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 4h2a1 1 0 011 1v9a1 1 0 01-1 1H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` },
  { route:'profile',     label:'Профіль',     svg:`<circle cx="9" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>` },
];

function renderDrawer() {
  const el = document.getElementById('app-drawer-wrap');
  if (!el) return;
  if ((state.role || '').toLowerCase() === 'accountant') { renderAccountantDrawer(el); return; }
  // Керувати закладами (додати/редагувати/архівувати/видалити/відновити) може лише власник (admin),
  // не звичайний менеджер/керуючий.
  const canManageVenues = (state.role || '').toLowerCase() === 'admin';
  const prevScroll = el.querySelector('[data-drawer-scroll]')?.scrollTop || 0;
  el.innerHTML = `
  <div id="app-drawer-overlay"
    style="position:fixed;inset:0;z-index:200;
           background:rgba(0,0,0,${_drawerOpen?'.72':'0'});
           pointer-events:${_drawerOpen?'all':'none'};
           transition:background .25s"
    onclick="window.__barops.closeDrawer()"></div>
  <div style="position:fixed;top:0;left:0;bottom:0;z-index:201;width:280px;
              background:var(--bg1);border-right:0.5px solid var(--border);
              transform:translateX(${_drawerOpen?'0':'-100%'});
              transition:transform .3s cubic-bezier(.22,1,.36,1);
              display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:52px 20px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--font-b);font-size:12px;color:var(--text2);letter-spacing:.06em;text-transform:uppercase">Менеджер</div>
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
    <div data-drawer-scroll style="flex:1;overflow-y:auto;padding:8px 0">
      ${(() => {
        const r = (state.role || '').toLowerCase();
        if (r === 'manager') return DRAWER_NAV.filter(i => !['ordering', 'writeoff', 'excise'].includes(i.route));
        if (r === 'chef')    return DRAWER_NAV.filter(i => i.route !== 'excise');   // шеф: кухня без акцизу (бар/алкоголь)
        return DRAWER_NAV;
      })().map(item => {
        const isActive = state.route === item.route;
        return `
        <div data-drawer-route="${item.route}"
          onclick="window.__barops.navigate('${item.route}');window.__barops.closeDrawer()"
          style="display:flex;align-items:center;gap:12px;padding:12px 20px;cursor:pointer;
                 background:${isActive?'rgba(168,139,255,.10)':'transparent'};
                 border-right:${isActive?'3px solid var(--green)':'3px solid transparent'};
                 transition:background .12s">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0;color:${isActive?'var(--green)':'var(--text2)'}">${item.svg}</svg>
          <span style="font-family:var(--font-b);font-size:14px;
                       color:${isActive?'var(--green)':'var(--text1)'};
                       font-weight:${isActive?'600':'400'}">${item.label}</span>
        </div>`;
      }).join('')}
      <div style="height:1px;background:var(--border);margin:8px 20px"></div>
      <div style="padding:8px 20px 6px;font-size:10px;color:var(--text2);
                  letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b)">Заклади</div>
      ${MANAGER_VENUES.map(v => `
      <div style="position:relative">
        <div
          onclick="window.__barops.switchVenue('${v.id}')"
          ${canManageVenues ? `oncontextmenu="event.preventDefault();event.stopPropagation();window.__barops.openVenueMenu('${v.id}');return false"
          data-long-press-id="${v.id}"
          ontouchstart="window.__barops.startVenueHold(event,'${v.id}')"
          ontouchend="window.__barops.endVenueHold(event,'${v.id}')"
          ontouchmove="window.__barops.moveVenueHold()"` : ''}
          style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;
                 background:${v.id===_venueMenuId?'rgba(255,255,255,.04)':v.active?'rgba(168,139,255,.08)':'transparent'};
                 transition:background .12s">
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
          </svg>`: (canManageVenues ? `
          <div onclick="event.stopPropagation();window.__barops.openVenueMenu('${v.id}')"
            style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;
                   border-radius:6px;cursor:pointer;opacity:.4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3" r="1" fill="var(--text2)"/>
              <circle cx="7" cy="7" r="1" fill="var(--text2)"/>
              <circle cx="7" cy="11" r="1" fill="var(--text2)"/>
            </svg>
          </div>` : '')}
        </div>
        ${(canManageVenues && v.id===_venueMenuId)?`
        <div style="margin:0 12px 8px;border-radius:12px;background:var(--bg3);
                    border:0.5px solid var(--border2);overflow:hidden">
          <div onclick="window.__barops.editVenue('${v.id}','${v.name}')"
            style="display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;
                   border-bottom:1px solid var(--border)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 14l2-2 8-8 2 2-8 8-2 2H2v-2z" stroke="var(--green)" stroke-width="1.3" stroke-linejoin="round"/>
              <path d="M10 4l2 2" stroke="var(--green)" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span style="font-size:13px;color:var(--green);font-family:var(--font-b)">Редагувати заклад</span>
          </div>
          <div onclick="window.__barops.archiveVenue('${v.id}')"
            style="display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;
                   border-bottom:1px solid var(--border)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="var(--amber)" stroke-width="1.3"/>
              <path d="M2 5h12M6 2h4" stroke="var(--amber)" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M6 8.5h4" stroke="var(--amber)" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            <span style="font-size:13px;color:var(--amber);font-family:var(--font-b)">Архівувати заклад</span>
          </div>
          <div onclick="window.__barops.deleteVenue('${v.id}','${v.name}')"
            style="display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M6 4V2h4v2M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size:13px;color:var(--red);font-family:var(--font-b)">Видалити заклад</span>
          </div>
        </div>`:``}
      </div>`).join('')}
      ${(canManageVenues && (_archivedOpen || ARCHIVED_VENUES.length > 0)) ? `
      <div onclick="window.__barops.toggleArchived()"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
          <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="var(--text2)" stroke-width="1.3"/>
          <path d="M2 5h12M6 2h4" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M6 8.5h4" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <div style="flex:1;font-size:13px;color:var(--text2);font-family:var(--font-b)">Архівовані${_archivedLoaded ? ` (${ARCHIVED_VENUES.length})` : ''}</div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"
          style="transform:rotate(${_archivedOpen?180:0}deg);transition:transform .2s;flex-shrink:0">
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${_archivedOpen ? (
        !_archivedLoaded
          ? `<div style="padding:4px 20px 10px;font-size:12px;color:var(--text3);font-family:var(--font-b)">Завантаження…</div>`
          : ARCHIVED_VENUES.length === 0
          ? `<div style="padding:4px 20px 10px;font-size:12px;color:var(--text3);font-family:var(--font-b)">Немає архівованих закладів</div>`
          : ARCHIVED_VENUES.map(v => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 20px">
              <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--bg4);border:1.5px solid var(--border3)"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.name}</div>
                <div style="font-size:10px;color:var(--text3);font-family:var(--font-b)">${v.pos}</div>
              </div>
              <div onclick="event.stopPropagation();window.__barops.unarchiveVenue('${v.id}')"
                style="height:30px;padding:0 12px;border-radius:9px;border:0.5px solid var(--green);background:transparent;color:var(--green);font-size:12px;font-family:var(--font-b);display:flex;align-items:center;cursor:pointer;flex-shrink:0">Відновити</div>
            </div>`).join('')
      ) : ''}
      ` : ''}
      ${canManageVenues ? `
      <div onclick="window.__barops.addVenuePrompt()"
        style="display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer">
        <div style="width:8px;height:8px;border-radius:50%;border:1.5px dashed var(--green)"></div>
        <div style="font-size:13px;color:var(--green);font-family:var(--font-b)">+ Підключити заклад</div>
      </div>` : ''}
    </div>
    <div style="padding:12px 20px 32px;border-top:1px solid var(--border)">
      <div onclick="localStorage.clear();window.__barops.navigate('auth');window.__barops.closeDrawer()"
        style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M10 11l3-3-3-3M13 8H6" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-size:13px;color:var(--red);font-family:var(--font-b)">Вийти з акаунту</span>
      </div>
    </div>

    ${_addSheetOpen ? `
    <div onclick="window.__barops.closeAddSheet()"
      style="position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.5)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;z-index:11;
                background:var(--bg1);border-radius:20px 20px 0 0;
                border-top:0.5px solid var(--border2);padding:20px 20px 44px">
      <div style="width:36px;height:3px;background:var(--border);border-radius:2px;margin:0 auto 20px"></div>
      <div style="font-family:var(--font-h);font-size:18px;font-weight:700;
                  color:var(--text0);margin-bottom:20px">Новий заклад</div>

      <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);
                  letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Назва закладу</div>
      <input id="add-venue-name" type="text" placeholder="Наприклад: Bar Noir"
        value="${_addDraft.name}"
        oninput="window.__barops.addDraftChange('name', this.value)"
        style="width:100%;height:48px;background:var(--bg2);border:0.5px solid ${_addError&&!_addDraft.name?'var(--red)':'var(--border2)'};
               border-radius:12px;padding:0 14px;font-size:15px;color:var(--text0);
               font-family:var(--font-b);outline:none;box-sizing:border-box;margin-bottom:14px"/>

      <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);
                  letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">POS-система</div>
      <select id="add-venue-pos"
        onchange="window.__barops.addDraftChange('posType', this.value)"
        style="width:100%;height:48px;background:var(--bg2);border:0.5px solid var(--border2);
               border-radius:12px;padding:0 14px;font-size:15px;color:var(--text0);
               font-family:var(--font-b);outline:none;box-sizing:border-box;margin-bottom:${_addError?'8px':'20px'};
               appearance:none;-webkit-appearance:none;cursor:pointer">
        <option value="syrve" ${_addDraft.posType==='syrve'?'selected':''}>Syrve (iiko)</option>
        <option value="poster" ${_addDraft.posType==='poster'?'selected':''}>Poster</option>
        <option value="manual" ${_addDraft.posType==='manual'?'selected':''}>Ручний облік</option>
      </select>

      ${_addError ? `<div style="font-size:12px;color:var(--red);font-family:var(--font-b);margin-bottom:12px">${_addError}</div>` : ''}

      <button onclick="window.__barops.saveNewVenue()" ${_addSaving?'disabled':''}
        style="width:100%;height:52px;background:${_addSaving?'rgba(255,255,255,.06)':'var(--grad-primary)'};
               border:none;border-radius:14px;font-size:15px;font-weight:600;
               color:${_addSaving?'var(--text2)':'#fff'};cursor:${_addSaving?'not-allowed':'pointer'};
               font-family:var(--font-h);transition:background .2s">
        ${_addSaving ? '⏳ Збереження...' : '+ Додати заклад'}
      </button>
      <button onclick="window.__barops.closeAddSheet()"
        style="width:100%;height:44px;background:none;border:none;color:var(--text2);
               font-size:13px;font-family:var(--font-b);cursor:pointer;margin-top:8px">
        Скасувати
      </button>
    </div>` : ''}
  </div>`;
  // Відновлюємо позицію скролу після ре-рендеру
  const newScroll = el.querySelector('[data-drawer-scroll]');
  if (newScroll && prevScroll) newScroll.scrollTop = prevScroll;
}

// Drawer бухгалтера — лише перемикання між закладами (для налаштування інвентаризацій)
function renderAccountantDrawer(el) {
  el.innerHTML = `
  <div id="app-drawer-overlay"
    style="position:fixed;inset:0;z-index:200;
           background:rgba(0,0,0,${_drawerOpen?'.72':'0'});
           pointer-events:${_drawerOpen?'all':'none'};
           transition:background .25s"
    onclick="window.__barops.closeDrawer()"></div>
  <div style="position:fixed;top:0;left:0;bottom:0;z-index:201;width:280px;
              background:var(--bg1);border-right:0.5px solid var(--border);
              transform:translateX(${_drawerOpen?'0':'-100%'});
              transition:transform .3s cubic-bezier(.22,1,.36,1);
              display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:52px 20px 16px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--font-b);font-size:12px;color:var(--text2);letter-spacing:.06em;text-transform:uppercase">Бухгалтер</div>
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
                  color:var(--text0);letter-spacing:-.02em">${state.venue || 'Заклад'}</div>
    </div>
    <div data-drawer-scroll style="flex:1;overflow-y:auto;padding:8px 0">
      <div style="padding:8px 20px 6px;font-size:10px;color:var(--text2);
                  letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b)">Заклади</div>
      ${MANAGER_VENUES.map(v => `
      <div onclick="window.__barops.switchVenue('${v.id}')"
        style="display:flex;align-items:center;gap:10px;padding:12px 20px;cursor:pointer;
               background:${v.active?'rgba(168,139,255,.08)':'transparent'};
               transition:background .12s">
        <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                    background:${v.active?'var(--green)':'var(--bg4)'};
                    border:1.5px solid ${v.active?'var(--green)':'var(--border3)'}"></div>
        <div style="flex:1">
          <div style="font-size:14px;color:${v.active?'var(--text0)':'var(--text2)'};
                      font-family:var(--font-b);font-weight:${v.active?'500':'400'}">${v.name}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b)">${v.pos}</div>
        </div>
        ${v.active?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3 3 7-7" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`:''}
      </div>`).join('')}
    </div>
  </div>`;
}

export function openDrawer()  {
  _drawerOpen = true;
  // Заклад могли змінити в шапці (не через switchVenue) → пересинхронізуємо позначку активного
  // зі state.venueId, інакше бургер підсвічує старий заклад, а заголовок — новий.
  const curId = state.venueId || localStorage.getItem('barops_venueId');
  if (curId && MANAGER_VENUES.length) MANAGER_VENUES.forEach(v => v.active = v.id === curId);
  renderDrawer();
  // Оновлюємо список закладів кожного разу при відкритті
  if (MANAGER_VENUES.length === 0) loadVenuesIntoDrawer();
  if (!_archivedLoaded) loadArchivedVenues();   // підтягнути архівовані (лічильник у шухляді)
}
export function closeDrawer() { _drawerOpen = false; renderDrawer(); }

// Розгорнути/згорнути секцію «Архівовані» (лінива підгрузка при першому відкритті)
export function toggleArchived() {
  _archivedOpen = !_archivedOpen;
  renderDrawer();
  if (_archivedOpen && !_archivedLoaded) loadArchivedVenues();
}

// Відновити архівований заклад → повертається в перемикач і стає активним
export async function unarchiveVenue(id) {
  const v = ARCHIVED_VENUES.find(x => x.id === id);
  if (!v) return;
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`https://barops-backend-production.up.railway.app/api/venues/${id}/unarchive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      ARCHIVED_VENUES = ARCHIVED_VENUES.filter(x => x.id !== id);
      if (!MANAGER_VENUES.some(x => x.id === id)) {
        MANAGER_VENUES.push({ id: v.id, name: v.name, pos: v.pos, active: false });
      }
      if (ARCHIVED_VENUES.length === 0) _archivedOpen = false;
      switchVenue(id);   // показуємо відновлений заклад одразу
    } else {
      appAlert(data.error || 'Помилка відновлення');
    }
  } catch (e) {
    appAlert('Мережева помилка');
  }
}

export function switchVenue(id) {
  MANAGER_VENUES.forEach(v => v.active = v.id === id);
  const v = MANAGER_VENUES.find(x => x.id === id);
  if (v) {
    state.venue   = v.name;
    state.venueId = v.id;
    localStorage.setItem('barops_venue',   v.name);
    localStorage.setItem('barops_venueId', v.id);
  }
  closeDrawer();
  navigate(state.route, { replace: true });
}

export function addVenuePrompt() {
  _addSheetOpen = true;
  _addDraft = { name: '', posType: 'syrve' };
  _addSaving = false;
  _addError = '';
  renderDrawer();
}

export function closeAddSheet() {
  _addSheetOpen = false;
  renderDrawer();
}

export function addDraftChange(field, value) {
  _addDraft[field] = value;
}

export async function saveNewVenue() {
  const name = _addDraft.name.trim();
  if (!name) {
    _addError = 'Введіть назву закладу';
    renderDrawer();
    return;
  }
  _addSaving = true;
  _addError = '';
  renderDrawer();

  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch('https://barops-backend-production.up.railway.app/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ name, posType: _addDraft.posType }),
    });
    const data = await res.json();
    if (data.success || data.venue || data.id) {
      _addSheetOpen = false;
      _addSaving = false;
      await loadVenuesIntoDrawer();
    } else {
      _addError = data.error || 'Помилка збереження';
      _addSaving = false;
      renderDrawer();
    }
  } catch {
    _addError = 'Мережева помилка';
    _addSaving = false;
    renderDrawer();
  }
}

export function openVenueMenu(id) {
  _venueMenuId = _venueMenuId === id ? null : id;
  renderDrawer();
}

export async function archiveVenue(id) {
  const v = MANAGER_VENUES.find(x => x.id === id);
  if (!v) return;
  if (!await appConfirm({
    title:   'Архівувати заклад',
    msg:     `Архівувати «${v.name}»? Заклад буде прихований, дані збережуться.`,
    okLabel: 'Архівувати',
    danger:  true,
  })) return;
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`https://barops-backend-production.up.railway.app/api/venues/${id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      MANAGER_VENUES = MANAGER_VENUES.filter(x => x.id !== id);
      // одразу додаємо в «Архівовані» (живий лічильник, без перезапиту)
      if (!ARCHIVED_VENUES.some(x => x.id === id)) ARCHIVED_VENUES.unshift({ id: v.id, name: v.name, pos: v.pos });
      _archivedLoaded = true;
      _venueMenuId = null;
      // Якщо архівували активний — переключаємо на перший
      if (state.venueId === id && MANAGER_VENUES.length > 0) {
        switchVenue(MANAGER_VENUES[0].id);
      } else {
        renderDrawer();
      }
    } else {
      appAlert(data.error || 'Помилка архівування');
    }
  } catch (e) {
    appAlert('Мережева помилка');
  }
}

export function editVenue(id, currentName) {
  _venueMenuId = null;
  renderDrawer();
  navigate('venue-edit', { params: { venueId: id, venueName: currentName } });
}

export async function deleteVenue(id, name) {
  if (!await appConfirm({
    title:   'Видалити заклад',
    msg:     `Видалити «${name}» назавжди? Всі дані закладу будуть втрачені. Це незворотна дія.`,
    okLabel: 'Видалити',
    danger:  true,
  })) return;
  // Друге підтвердження для безпеки
  if (!await appConfirm({
    title:   'Точно видалити?',
    msg:     `Ви впевнені? «${name}» буде видалено безповоротно.`,
    okLabel: 'Так, видалити',
    danger:  true,
  })) return;
  try {
    const token = localStorage.getItem('barops_token');
    const res = await fetch(`https://barops-backend-production.up.railway.app/api/venues/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      MANAGER_VENUES = MANAGER_VENUES.filter(x => x.id !== id);
      _venueMenuId = null;
      if (state.venueId === id && MANAGER_VENUES.length > 0) {
        switchVenue(MANAGER_VENUES[0].id);
      } else if (MANAGER_VENUES.length === 0) {
        closeDrawer();
        navigate('dashboard');
      } else {
        renderDrawer();
      }
    } else {
      appAlert(data.error || 'Помилка видалення');
    }
  } catch (e) {
    appAlert('Мережева помилка');
  }
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
    view.innerHTML = await page.render(opts.params || {});
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
      updateTabBarActive();
    }
  }

  // Drawer — менеджер/адмін (повна навігація) + бухгалтер (лише перемикання закладів)
  const roleLc = (state.role || '').toLowerCase();
  const hasDrawer = roleLc === 'admin' || roleLc === 'manager' || roleLc === 'director' || roleLc === 'accountant';
  const drawerWrap = document.getElementById('app-drawer-wrap');
  if (drawerWrap) {
    const wasOpen = _drawerOpen;
    _drawerOpen = false;
    if (hasDrawer && !noTabBar.includes(route)) {
      if (wasOpen) renderDrawer();
      else updateDrawerActive();
    } else {
      drawerWrap.innerHTML = '';
    }
  }

  // Плаваюча кнопка-бургер для бухгалтера — показуємо лише для accountant (поза auth)
  const acctBurger = document.getElementById('acct-burger');
  if (acctBurger) {
    // На дашборді/аналітиці бургер уже вбудований у шапку — плаваючий ховаємо
    const pageHasInlineBurger = route === 'dashboard' || route === 'analytics';
    acctBurger.style.display = (roleLc === 'accountant' && !noTabBar.includes(route) && !pageHasInlineBurger) ? 'flex' : 'none';
  }
}

export function goBack() {
  if (state.history.length === 0) return;
  navigate(state.history.pop(), { replace: true });
}

/* ══════════════════════════════════════
   6. TAB BAR RENDERER
   ══════════════════════════════════════ */

// Оновлює тільки активний стан без заміни DOM — запобігає втраті touch-події
function updateTabBarActive() {
  const el = document.getElementById('app-tab-bar');
  if (!el || !el.children.length) { renderTabBar(); return; }
  const tabs = state.role === 'manager' || state.role === 'director' ? TAB_BAR_MGR_JOURNAL
             : state.role === 'admin' ? TAB_BAR_MANAGER
             : state.role === 'accountant' ? TAB_BAR_ACCOUNTANT
             : state.role === 'cook' ? TAB_BAR_COOK
             : state.role === 'waiter' ? TAB_BAR_WAITER : TAB_BAR_BARTENDER;
  // Якщо DOM не відповідає поточному набору вкладок (зміна ролі, додана вкладка тощо) — перемалювати
  const domRoutes = [...el.children].map(c => c.dataset.route || '');
  if (domRoutes.length !== tabs.length || tabs.some((t, i) => t.route !== domRoutes[i])) {
    renderTabBar();
    return;
  }
  // Підсвічуємо за власним маршрутом кнопки, а не за позицією — щоб нічого не зміщувалось
  [...el.children].forEach(btn => {
    const isActive = btn.dataset.route === state.route;
    const color = isActive ? 'var(--green)' : 'var(--text2)';
    btn.classList.toggle('tab-bar__item--active', isActive);
    btn.style.setProperty('--tab-color', color);
    const icon  = btn.querySelector('.tab-bar__icon');
    const label = btn.querySelector('.tab-bar__label');
    if (icon)  icon.style.color  = color;
    if (label) label.style.color = color;
  });
}

// Оновлює активний пункт drawer без заміни DOM
function updateDrawerActive() {
  const el = document.getElementById('app-drawer-wrap');
  if (!el) return;
  el.querySelectorAll('[data-drawer-route]').forEach(item => {
    const isActive = state.route === item.dataset.drawerRoute;
    item.style.background      = isActive ? 'rgba(168,139,255,.10)' : 'transparent';
    item.style.borderRight     = isActive ? '3px solid var(--green)' : '3px solid transparent';
    const svg   = item.querySelector('svg');
    const span  = item.querySelector('span');
    if (svg)  svg.style.color   = isActive ? 'var(--green)' : 'var(--text2)';
    if (span) { span.style.color = isActive ? 'var(--green)' : 'var(--text1)'; span.style.fontWeight = isActive ? '600' : '400'; }
  });
}

function renderTabBar() {
  const el = document.getElementById('app-tab-bar');
  if (!el) return;
  const tabs = state.role === 'admin'       ? TAB_BAR_MANAGER
             : state.role === 'manager'     ? TAB_BAR_MGR_JOURNAL
             : state.role === 'director'    ? TAB_BAR_MGR_JOURNAL
             : state.role === 'accountant'  ? TAB_BAR_ACCOUNTANT
             : state.role === 'cook'        ? TAB_BAR_COOK
             : state.role === 'waiter'      ? TAB_BAR_WAITER
             : TAB_BAR_BARTENDER;
  el.innerHTML = tabs.map(tab => {
    const isActive = state.route === tab.route;
    const color = isActive ? 'var(--green)' : 'var(--text2)';
    if (tab.fab) return `
      <div class="tab-bar__fab-wrap" data-route="${tab.route}" onclick="window.__barops.navigate('${tab.route}')">
        <div class="tab-bar__fab">${tab.icon}</div>
        <span class="tab-bar__label">${tab.label}</span>
      </div>`;
    return `
      <button class="tab-bar__item ${isActive?'tab-bar__item--active':''}"
        data-route="${tab.route}"
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
  state.venue   = localStorage.getItem('barops_venue')   || '';
  state.venueId = localStorage.getItem('barops_venueId') || '';
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
   10. PLAN EXPIRED OVERLAY
   ══════════════════════════════════════ */
let _planExpiredShown = false;

function showPlanExpired() {
  if (_planExpiredShown) return;
  _planExpiredShown = true;

  const el = document.createElement('div');
  el.id = 'plan-expired-overlay';
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'background:rgba(0,0,0,.94)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'padding:40px 32px', 'text-align:center',
  ].join(';');

  el.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style="margin-bottom:24px">
      <rect width="56" height="56" rx="16" fill="rgba(168,139,255,.12)"/>
      <path d="M28 18a6 6 0 016 6v2H22v-2a6 6 0 016-6z" stroke="#A88BFF" stroke-width="1.6" fill="none"/>
      <rect x="18" y="26" width="20" height="14" rx="3" stroke="#A88BFF" stroke-width="1.6" fill="none"/>
      <circle cx="28" cy="33" r="1.5" fill="#A88BFF"/>
    </svg>
    <div style="font-family:'Geist',system-ui,sans-serif;font-size:22px;font-weight:700;
                color:#fff;margin-bottom:12px;letter-spacing:-.02em">
      Доступ обмежено
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,.55);
                font-family:-apple-system,system-ui,sans-serif;
                max-width:280px;line-height:1.65;margin-bottom:36px">
      Пробний період закінчився.<br>
      Зверніться до команди BarOps для поновлення доступу.
    </div>
    <button onclick="window.__barops.logout()"
      style="height:52px;padding:0 36px;background:rgba(168,139,255,.18);
             border:1px solid rgba(168,139,255,.35);border-radius:14px;
             font-size:15px;font-weight:600;color:#A88BFF;cursor:pointer;
             font-family:'Geist',system-ui,sans-serif;transition:background .15s">
      Вийти з акаунту
    </button>`;

  document.body.appendChild(el);
}

/* ══════════════════════════════════════
   10b. STYLED CONFIRM / ALERT (заміна нативних confirm()/alert())
   ══════════════════════════════════════ */
// Стильова модалка в дусі застосунку. Повертає Promise<boolean>.
// cancelLabel=null → лише кнопка OK (режим alert).
export function appConfirm({ title = 'Підтвердження', msg = '', okLabel = 'OK', cancelLabel = 'Скасувати', danger = false } = {}) {
  return new Promise(resolve => {
    document.getElementById('app-confirm-overlay')?.remove();

    const ov = document.createElement('div');
    ov.id = 'app-confirm-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:24px';

    const okStyle = danger
      ? 'background:var(--red);color:#fff;border:none'
      : 'background:var(--green);color:#000;border:none';

    ov.innerHTML = `
      <div style="width:100%;max-width:320px;background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.5)">
        <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);margin-bottom:8px">${title}</div>
        <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.55;margin-bottom:18px">${msg}</div>
        <div style="display:flex;gap:8px">
          ${cancelLabel ? `<button id="app-confirm-cancel" style="flex:1;height:44px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-h);background:var(--bg2);color:var(--text1);border:0.5px solid var(--border)">${cancelLabel}</button>` : ''}
          <button id="app-confirm-ok" style="flex:1;height:44px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-h);${okStyle}">${okLabel}</button>
        </div>
      </div>`;

    document.body.appendChild(ov);

    const done = (val) => {
      ov.remove();
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') done(false);
      else if (e.key === 'Enter') done(true);
    };

    ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });
    ov.querySelector('#app-confirm-ok').addEventListener('click', () => done(true));
    ov.querySelector('#app-confirm-cancel')?.addEventListener('click', () => done(false));
    document.addEventListener('keydown', onKey);
  });
}

// Стильовий alert (одна кнопка OK)
export function appAlert(msg, title = 'BarOps') {
  return appConfirm({ title, msg, okLabel: 'OK', cancelLabel: null });
}

// Глобальний перехоплювач — ловить 403 plan_expired з будь-якого fetch-запиту
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await _origFetch(...args);
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data.error === 'plan_expired') showPlanExpired();
    } catch {}
  }
  return res;
};

/* ══════════════════════════════════════
   11. BOOTSTRAP
   ══════════════════════════════════════ */
export async function bootstrap() {
  window.__barops = {
    navigate, goBack, setRole, state,
    openDrawer, closeDrawer, switchVenue, addVenuePrompt, closeAddSheet, addDraftChange, saveNewVenue,
    openVenueMenu, archiveVenue, deleteVenue, editVenue, toggleArchived, unarchiveVenue,
    startVenueHold(e, id) {
      // НЕ викликаємо preventDefault — інакше на мобільному скасовується click (тап не перемикає заклад)
      this._venueLongPress = false;
      this._venueHoldTimer = setTimeout(() => {
        this._venueLongPress = true;   // довге утримання → контекстне меню
        window.__barops.openVenueMenu(id);
      }, 600);
    },
    moveVenueHold() {
      // Скрол/рух пальця — скасовуємо утримання
      if (this._venueHoldTimer) { clearTimeout(this._venueHoldTimer); this._venueHoldTimer = null; }
    },
    endVenueHold(e, id) {
      if (this._venueHoldTimer) { clearTimeout(this._venueHoldTimer); this._venueHoldTimer = null; }
      // Короткий тап (не long-press) → перемикаємо заклад вручну,
      // бо синтетичний click на деяких мобільних не завжди надходить
      if (!this._venueLongPress) {
        if (e && e.cancelable) e.preventDefault();   // тут можна — щоб не було подвійного спрацювання з click
        window.__barops.switchVenue(id);
      }
      this._venueLongPress = false;
    },
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

  // Бургер вбудовано в шапку кожної сторінки бухгалтера (інлайн, як у менеджера)

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