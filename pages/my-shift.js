/* ============================================================
   BarOps — pages/my-shift.js
   «Моя зміна» — особистий екран офіціанта:
   мої продажі за зміну (виторг/чеки/серед.чек) + топ моїх страв,
   готівка взята з каси, і фокус-страви дня з моїм прогресом.
   Дані: OLAP за WaiterName (звʼязок акаунта через posName).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _date    = '';
let _data    = null;     // { sales, topDishes, cashTaken, playlist } | { needsMapping, waiters, myName }
let _loading = false;
let _err     = '';
let _saving  = false;
let _q       = '';       // пошук у списку самозіставлення

/* ════ HELPERS ════ */
function token() { return localStorage.getItem('barops_token') || state.token || ''; }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function today() { return ymd(new Date()); }
function addDays(s, n) { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d); }
function fmtUAH(n) { return '₴' + (Math.round(+n || 0)).toLocaleString('uk-UA'); }
function fmtN(n) { return (Math.round((+n || 0) * 10) / 10).toLocaleString('uk-UA'); }
function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' });
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ════ CSS ════ */
const CSS = `<style id="ms-css">
.ms-scroll{overflow-y:auto;flex:1}.ms-scroll::-webkit-scrollbar{width:0}
.ms-header{padding:16px 20px 8px;display:flex;align-items:center;gap:12px}
.ms-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ms-back:active{background:rgba(255,255,255,.08)}
.ms-title{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ms-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ms-datebar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px 12px}
.ms-datenav{width:34px;height:34px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:15px;cursor:pointer;flex-shrink:0}
.ms-datenav:disabled{opacity:.35}
.ms-datelbl{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);text-transform:capitalize;flex:1;text-align:center}
.ms-card{margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.ms-hero{background:linear-gradient(135deg,rgba(168,139,255,.14),rgba(56,189,248,.05))}
.ms-lbl{font-size:10px;color:var(--text2);letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-b)}
.ms-big{font-family:var(--font-h);font-size:34px;font-weight:700;color:var(--purple);line-height:1;margin-top:6px;letter-spacing:-.02em}
.ms-sub2{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:8px}
.ms-cashcard{display:flex;align-items:center;gap:12px;cursor:pointer}
.ms-cash-ic{width:38px;height:38px;border-radius:11px;background:var(--amber-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ms-cash-val{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0)}
.ms-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:8px 20px 8px;font-family:var(--font-b)}
.ms-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:0.5px solid var(--border)}
.ms-row:last-child{border-bottom:none}
.ms-rank{width:24px;height:24px;border-radius:7px;background:var(--bg3,#26262b);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:12px;color:var(--text1);flex-shrink:0}
.ms-rank.top{background:rgba(168,139,255,.18);color:var(--purple)}
.ms-name{flex:1;min-width:0;font-family:var(--font-b);font-size:13px;color:var(--text0)}
.ms-qty{font-family:var(--font-h);font-weight:700;font-size:15px;color:var(--text0);flex-shrink:0}
.ms-qty span{font-size:10px;color:var(--text2);font-weight:400}
.ms-foc{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px}
.ms-foc-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.ms-foc-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);min-width:0}
.ms-foc-my{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--green);flex-shrink:0}
.ms-foc-my small{color:var(--text3);font-weight:400;font-size:11px}
.ms-prog{height:6px;border-radius:4px;background:var(--bg3,#26262b);overflow:hidden;margin-top:8px}
.ms-prog-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--green),var(--purple))}
.ms-empty{margin:0 14px;padding:26px 20px;text-align:center;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px}
.ms-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.ms-load{padding:34px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px}
/* самозіставлення */
.ms-pick-search{width:calc(100% - 28px);margin:0 14px 10px;box-sizing:border-box;height:44px;background:var(--bg2);border:0.5px solid var(--border);border-radius:11px;color:var(--text0);font-size:16px;font-family:var(--font-b);padding:0 14px;outline:none}
.ms-pick{display:flex;align-items:center;gap:10px;padding:13px 16px;cursor:pointer;border-bottom:0.5px solid var(--border)}
.ms-pick:active{background:rgba(255,255,255,.06)}
.ms-pick-n{flex:1;min-width:0;font-size:14px;color:var(--text0);font-family:var(--font-b)}
</style>`;

/* ════ RENDER ════ */
function mappingView(d) {
  const q = _q.trim().toLowerCase();
  const list = (d.waiters || []).filter(n => !q || n.toLowerCase().includes(q));
  const rows = list.length
    ? list.map(n => `<div class="ms-pick" onclick="window.__ms.pickName('${esc(n).replace(/'/g, "\\'")}')">
        <div class="ms-pick-n">${esc(n)}</div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </div>`).join('')
    : `<div class="ms-empty"><div class="ms-empty-txt">${(d.waiters||[]).length ? 'Нічого не знайдено' : 'Поки немає продажів, щоб визначити імена офіціантів.<br>Звернись до менеджера.'}</div></div>`;
  return `
    <div class="ms-card">
      <div class="ms-lbl">Хто ти в системі продажів?</div>
      <div class="ms-sub2" style="margin-top:6px;color:var(--text1)">Обери своє імʼя зі списку офіціантів POS — щоб бачити саме свої продажі. Це налаштовується один раз.</div>
    </div>
    <input class="ms-pick-search" placeholder="Пошук імені…" value="${esc(_q)}" oninput="window.__ms.search(this.value)">
    <div class="ms-card" style="padding:0;overflow:hidden">${rows}</div>
    <div style="height:24px"></div>`;
}

function dataView(d) {
  const s = d.sales || {};
  const dishes = (d.topDishes || []).map((it, i) => `
    <div class="ms-row">
      <div class="ms-rank ${i < 3 ? 'top' : ''}">${i + 1}</div>
      <div class="ms-name">${esc(it.name)}</div>
      <div class="ms-qty">${fmtN(it.qty)} <span>шт · ${fmtUAH(it.sum)}</span></div>
    </div>`).join('') || `<div class="ms-sub2">Сьогодні ще нічого не продано</div>`;

  const focus = (d.playlist || []).length ? (d.playlist || []).map(p => {
    const pct = p.totalQty > 0 ? Math.min(100, Math.round(p.myQty / p.totalQty * 100)) : 0;
    return `
    <div class="ms-foc">
      <div class="ms-foc-top">
        <div class="ms-foc-name">${esc(p.dishName)}</div>
        <div class="ms-foc-my">${fmtN(p.myQty)} <small>/ ${fmtN(p.totalQty)} всього</small></div>
      </div>
      <div class="ms-prog"><div class="ms-prog-fill" style="width:${Math.max(3, pct)}%"></div></div>
    </div>`;
  }).join('') : `<div class="ms-empty"><div class="ms-empty-txt">Фокус-страв на сьогодні немає.<br>Менеджер додає їх у Плей-лист.</div></div>`;

  return `
    <!-- Мій виторг -->
    <div class="ms-card ms-hero">
      <div class="ms-lbl">Мій виторг · зміна</div>
      <div class="ms-big">${fmtUAH(s.revenue)}</div>
      <div class="ms-sub2">${(s.checks || 0).toLocaleString('uk-UA')} чеків · середній чек ${s.avgCheck != null ? fmtUAH(s.avgCheck) : '—'}</div>
    </div>

    <!-- Взято з каси -->
    <div class="ms-card ms-cashcard" onclick="window.__barops.navigate('cash')">
      <div class="ms-cash-ic">
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" style="color:var(--amber)">
          <rect x="2" y="5" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="9" cy="9.5" r="2" stroke="currentColor" stroke-width="1.3"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="ms-lbl">Взято з каси сьогодні</div>
        <div class="ms-cash-val">${fmtUAH(d.cashTaken)}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
    </div>

    <!-- Топ моїх страв -->
    <div class="ms-sec">Топ моїх страв</div>
    <div class="ms-card">${dishes}</div>

    <!-- Фокус-страви дня -->
    <div class="ms-sec">🎯 Фокус-страви дня · мій прогрес</div>
    ${focus}
    <div style="height:24px"></div>`;
}

function bodyHTML() {
  if (_loading) return `<div class="ms-load">Рахую мою зміну…</div>`;
  if (_err)     return `<div class="ms-empty"><div class="ms-empty-txt">${esc(_err)}</div></div>`;
  const d = _data;
  if (!d) return `<div class="ms-empty"><div class="ms-empty-txt">Немає даних.</div></div>`;
  return d.needsMapping ? mappingView(d) : dataView(d);
}

function buildHTML() {
  return `
${CSS}
<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div class="ms-scroll">
    <div class="ms-header">
      <div class="ms-back" onclick="window.__barops.navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="ms-title">Моя зміна</div>
        <div class="ms-sub">${esc(state.venue || '')}</div>
      </div>
    </div>
    <div class="ms-datebar">
      <button class="ms-datenav" onclick="window.__ms.shift(-1)">‹</button>
      <div class="ms-datelbl">${_date === today() ? 'Сьогодні' : fmtDate(_date)}</div>
      <button class="ms-datenav" onclick="window.__ms.shift(1)" ${_date >= today() ? 'disabled' : ''}>›</button>
    </div>
    ${bodyHTML()}
  </div>
</div>`;
}

function rerender() {
  if (state.route !== 'my-shift') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════ DATA ════ */
async function load() {
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  if (!venueId) { _err = 'Не обрано заклад'; rerender(); return; }
  _loading = true; _err = ''; rerender();
  try {
    const r = await fetch(`${API}/api/performance/my-shift?venueId=${venueId}&date=${_date}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Помилка');
    _data = d;
  } catch (e) { _err = 'Не вдалося завантажити: ' + e.message; _data = null; }
  _loading = false; rerender();
}

async function saveName(name) {
  if (_saving) return;
  _saving = true;
  const venueId = state.venueId || localStorage.getItem('barops_venueId');
  try {
    await fetch(`${API}/api/performance/my-pos-name`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ posName: name }),
    });
  } catch {}
  _saving = false; _q = '';
  await load();
}

/* ════ MODULE ════ */
export default {
  render() {
    _date = today(); _data = null; _loading = false; _err = ''; _q = '';
    return buildHTML();
  },
  init() {
    window.__ms = {
      shift(n) { const next = addDays(_date, n); if (next > today()) return; _date = next; _data = null; load(); },
      pickName(name) { saveName(name); },
      search(v) { _q = v; rerender(); },
    };
    load();
  },
};
