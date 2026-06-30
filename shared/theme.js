/* ============================================================
   BarOps — shared/theme.js
   Світла/темна тема. Початкове застосування (без блимання) — інлайн-скрипт
   у <head> index.html; тут — читання/збереження вибору й перемикання.
   Значення: 'system' | 'light' | 'dark'. Дефолт — 'dark'.
   ============================================================ */

const KEY = 'barops_theme';

export function getTheme() {
  try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; }
}

export function isLightActive() {
  const t = getTheme();
  const prefersDark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  return t === 'light' || (t === 'system' && !prefersDark);
}

export function applyTheme() {
  const light = isLightActive();
  document.documentElement.classList.toggle('light', light);
  // Колір статус-бара PWA (фон системної смуги) — щоб не лишався чорним у світлій
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#F3F3F6' : '#000000');
}

export function setTheme(t) {
  if (!['system', 'light', 'dark'].includes(t)) t = 'dark';
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme();
}

// Якщо обрано «Системна» — реагувати на зміну системної теми наживо
try {
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (getTheme() === 'system') applyTheme(); };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
  }
} catch { /* ignore */ }
