/* ============================================================
   BarOps — shared/push.js
   Web Push: запит дозволу, підписка/відписка, синхронізація з бекендом
   ============================================================ */

const API = 'https://barops-backend-production.up.railway.app';

function token() { return localStorage.getItem('barops_token') || ''; }

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
  return (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getReady() {
  // Гарантуємо, що SW зареєстрований і активний
  if (!navigator.serviceWorker.controller) {
    try { await navigator.serviceWorker.register('/sw.js'); } catch {}
  }
  return navigator.serviceWorker.ready;
}

async function getPublicKey() {
  const res = await fetch(`${API}/api/push/public-key`);
  const data = await res.json();
  if (!data.enabled || !data.publicKey) throw new Error('Push вимкнено на сервері');
  return data.publicKey;
}

// Підписати поточний пристрій (запитує дозвіл за потреби). Повертає true/false.
export async function subscribePush() {
  if (!pushSupported() || !token()) return false;
  try {
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const reg = await getReady();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = await getPublicKey();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = sub.toJSON();
    await fetch(`${API}/api/push/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent }),
    });
    return true;
  } catch (e) {
    console.warn('[push] subscribe failed:', e.message);
    return false;
  }
}

// Відписати пристрій
export async function unsubscribePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      if (token()) {
        await fetch(`${API}/api/push/unsubscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body:    JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
    }
  } catch {}
}

// Тихо оновити підписку після логіну (тільки якщо дозвіл уже надано)
export async function ensurePushIfGranted() {
  if (!pushSupported() || !token()) return;
  if (Notification.permission === 'granted') {
    subscribePush();   // оновлює endpoint під поточного користувача
  }
}
