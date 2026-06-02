/* ============================================================
   BarOps — pages/playlist.js
   Плей-лист: страви для "протягування" в продажах.
   Продажі по офіціантах з POS (OLAP), історія 60 днів.
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _loading   = true;
let _error     = '';
let _data      = null;      // { items, leaderboard, live, fetchedAt, posOff }
let _venueId   = '';
let _date      = '';        // обрана дата YYYY-MM-DD
let _openDish  = null;      // розгорнута страва (id або dishName)
let _timer     = null;      // авто-оновлення today

// Додавання страви
let _addOpen      = false;
let _dishes       = [];     // [{name, qty}]
let _dishesLoaded = false;
let _dishesLoading = false;
let _dishesErr    = '';
let _query        = '';
let _busy         = false;  // додавання/видалення в процесі

function token() { return localStorage.getItem('barops_token') || ''; }
function hdrs()  { return { Authorization: `Bearer ${token()}` }; }
function money(n){ return (Math.round((n || 0) * 100) / 100).toLocaleString('uk-UA') + ' ₴'; }

function todayKyiv() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function fmtDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function qtyWord(n) {
  const r = Math.round(n);
  const t = r % 10, h = r % 100;
  if (t === 1 && h !== 11) return 'шт';
  return 'шт';
}

const CSS = `<style id="pl-css">
.pl-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.pl-top{display:flex;align-items:center;gap:12px;padding:10px 18px 6px;flex-shrink:0}
.pl-back,.pl-refresh{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.pl-back:active,.pl-refresh:active{background:var(--bg3)}
.pl-refresh{margin-left:auto}
.pl-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.pl-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.pl-scroll{overflow-y:auto;flex:1;padding:10px 16px 32px}.pl-scroll::-webkit-scrollbar{width:0}
.pl-daterow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pl-navbtn{width:32px;height:32px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1);flex-shrink:0}
.pl-navbtn:active{background:var(--bg3)}.pl-navbtn:disabled{opacity:.35;cursor:not-allowed}
.pl-datelbl{font-size:13px;font-weight:600;color:var(--text0);font-family:var(--font-h)}
.pl-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);margin-left:6px;vertical-align:middle;box-shadow:0 0 0 0 rgba(80,200,120,.6);animation:plPulse 1.8s infinite}
@keyframes plPulse{0%{box-shadow:0 0 0 0 rgba(80,200,120,.5)}70%{box-shadow:0 0 0 6px rgba(80,200,120,0)}100%{box-shadow:0 0 0 0 rgba(80,200,120,0)}}
.pl-add{width:100%;height:46px;border-radius:13px;border:0.5px dashed var(--border);background:var(--bg1);color:var(--text1);font-family:var(--font-h);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px}
.pl-add:active{background:var(--bg2)}
.pl-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;margin-bottom:8px;overflow:hidden}
.pl-row{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer}
.pl-row:active{background:var(--bg2)}
.pl-rank{width:26px;height:26px;border-radius:8px;background:var(--bg3);color:var(--text2);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:12px;flex-shrink:0}
.pl-name{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0);line-height:1.25}
.pl-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.pl-qty{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--green);text-align:right;flex-shrink:0;line-height:1}
.pl-qty-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);text-align:right;margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
.pl-chev{flex-shrink:0;transition:transform .2s}.pl-chev.open{transform:rotate(90deg)}
.pl-del{width:30px;height:30px;border-radius:9px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--text2)}
.pl-del:active{background:var(--red-bg);border-color:var(--red);color:var(--red)}
.pl-waiters{border-top:0.5px solid var(--border);padding:6px 16px 12px;display:flex;flex-direction:column;gap:6px}
.pl-wrow{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg2);border-radius:10px}
.pl-av{width:30px;height:30px;border-radius:50%;background:var(--purple-bg,#241b3a);color:#A88BFF;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:11px;flex-shrink:0}
.pl-wname{flex:1;min-width:0;font-size:13px;color:var(--text1);font-family:var(--font-b)}
.pl-wqty{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);flex-shrink:0}
.pl-sec{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;margin:18px 2px 8px}
.pl-lb{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.pl-lbrow{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--border)}
.pl-lbrow:last-child{border-bottom:none}
.pl-lbrank{width:24px;font-family:var(--font-h);font-weight:700;font-size:14px;color:var(--text2);text-align:center;flex-shrink:0}
.pl-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:44px 20px;text-align:center}
.pl-empty-i{font-size:34px;opacity:.4}
.pl-empty-t{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.pl-spin{width:22px;height:22px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--green);animation:plSpin .7s linear infinite;margin:48px auto}
@keyframes plSpin{to{transform:rotate(360deg)}}
.pl-err{background:var(--red-bg,#2a1212);border:0.5px solid var(--red-border,#5c2d2d);border-radius:12px;padding:14px;font-size:12px;color:var(--red);font-family:var(--font-b);margin-top:8px}
/* Add sheet */
.pl-ov{position:fixed;inset:0;z-index:950;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}
.pl-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border:0.5px solid var(--border);border-bottom:none;width:100%;max-width:480px;max-height:86vh;display:flex;flex-direction:column}
.pl-sheet-h{padding:14px 16px 10px;border-bottom:0.5px solid var(--border)}
.pl-sheet-t{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}
.pl-search{width:100%;box-sizing:border-box;height:44px;margin-top:10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:11px;color:var(--text0);font-size:14px;font-family:var(--font-b);padding:0 14px;outline:none}
.pl-search:focus{border-color:var(--green)}
.pl-dishlist{overflow-y:auto;flex:1;padding:6px 0 28px}
.pl-dish{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;border-bottom:0.5px solid var(--border)}
.pl-dish:active{background:var(--bg2)}
.pl-dish-n{flex:1;min-width:0;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.pl-dish-q{font-size:11px;color:var(--text2);font-family:var(--font-b);flex-shrink:0}
.pl-dish-plus{width:26px;height:26px;border-radius:8px;background:var(--green-bg,#1a3320);color:var(--green);border:0.5px solid var(--green-border,#2d5c3a);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;font-weight:700}
.pl-close{width:34px;height:34px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1);float:right}
</style>`;

async function load(silent) {
  if (!silent) { _loading = true; _error = ''; re(); }
  _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
  try {
    const res = await fetch(`${API}/api/playlist/${_venueId}/progress?date=${_date}`, { headers: hdrs() });
    const d = await res.json();
    if (res.ok && d.ok) { _data = d; _error = ''; }
    else if (!silent) _error = d.error || 'Не вдалося завантажити плей-лист';
  } catch {
    if (!silent) _error = 'Немає звʼязку із сервером';
  }
  _loading = false; re();
  scheduleAuto();
}

function scheduleAuto() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  // авто-оновлення лише для сьогодні (тихо, без спінера)
  if (_date === todayKyiv() && state.route === 'playlist') {
    _timer = setInterval(() => { if (state.route === 'playlist' && !_addOpen) load(true); }, 60000);
  }
}

async function loadDishes() {
  if (_dishesLoaded || _dishesLoading) return;
  _dishesLoading = true; _dishesErr = ''; re();
  try {
    const res = await fetch(`${API}/api/playlist/${_venueId}/dishes`, { headers: hdrs() });
    const d = await res.json();
    if (res.ok) { _dishes = d.dishes || []; _dishesLoaded = true; }
    else _dishesErr = d.error || 'Не вдалося отримати список страв';
  } catch {
    _dishesErr = 'Немає звʼязку із сервером';
  }
  _dishesLoading = false; re();
}

async function addDish(name) {
  if (_busy) return;
  _busy = true; re();
  try {
    await fetch(`${API}/api/playlist/${_venueId}`, {
      method: 'POST', headers: { ...hdrs(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishName: name }),
    });
  } catch {}
  _busy = false; _addOpen = false; _query = '';
  await load();
}

async function removeItem(id) {
  if (!id || _busy) return;
  _busy = true; re();
  try {
    await fetch(`${API}/api/playlist/item/${id}`, { method: 'DELETE', headers: hdrs() });
  } catch {}
  _busy = false;
  await load();
}

function re() {
  const root = document.getElementById('pl-root');
  if (root) root.innerHTML = body();
}

function itemCard(it) {
  const open = _openDish === (it.id || it.dishName);
  const isToday = _date === todayKyiv();
  return `
  <div class="pl-card">
    <div class="pl-row" onclick="window.__pl.toggle('${(it.id || it.dishName).replace(/'/g, "\\'")}')">
      <div style="flex:1;min-width:0">
        <div class="pl-name">${it.dishName}</div>
        <div class="pl-meta">${money(it.soldSum)}${it.byWaiter && it.byWaiter.length ? ` · ${it.byWaiter.length} офіц.` : ''}</div>
      </div>
      <div>
        <div class="pl-qty">${Math.round(it.soldQty)}</div>
        <div class="pl-qty-lbl">${qtyWord(it.soldQty)} продано</div>
      </div>
      ${isToday && it.id ? `<div class="pl-del" onclick="event.stopPropagation();window.__pl.remove('${it.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
      </div>` : ''}
      <svg class="pl-chev ${open ? 'open' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
    </div>
    ${open ? `<div class="pl-waiters">
      ${(it.byWaiter || []).length
        ? it.byWaiter.map(w => `<div class="pl-wrow">
            <div class="pl-av">${initials(w.name)}</div>
            <div class="pl-wname">${w.name}</div>
            <div class="pl-wqty">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">${qtyWord(w.qty)}</span></div>
          </div>`).join('')
        : '<div style="font-size:12px;color:var(--text2);font-family:var(--font-b);padding:6px 2px">Ще ніхто не продав цю позицію</div>'}
    </div>` : ''}
  </div>`;
}

function body() {
  const isToday = _date === todayKyiv();
  let inner;
  if (_loading) {
    inner = `<div class="pl-spin"></div>`;
  } else if (_error) {
    inner = `<div class="pl-err">${_error}</div>`;
  } else {
    const d = _data || { items: [], leaderboard: [] };
    const addBtn = isToday
      ? `<button class="pl-add" onclick="window.__pl.openAdd()">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
           Додати страву
         </button>` : '';

    const itemsBlock = (d.items || []).length
      ? d.items.map(itemCard).join('')
      : `<div class="pl-empty">
           <div class="pl-empty-i">🎯</div>
           <div class="pl-empty-t">${isToday
              ? 'Плей-лист порожній.<br>Додайте страви, які треба протягнути в продажах.'
              : 'Цього дня не було позицій у плей-листі.'}</div>
         </div>`;

    const lb = (d.items || []).length && (d.leaderboard || []).length
      ? `<div class="pl-sec">Лідери продажів плей-листа</div>
         <div class="pl-lb">
           ${d.leaderboard.map((w, i) => `<div class="pl-lbrow">
             <div class="pl-lbrank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</div>
             <div class="pl-av">${initials(w.name)}</div>
             <div style="flex:1;min-width:0"><div class="pl-name" style="font-size:14px">${w.name}</div><div class="pl-meta">${money(w.sum)}</div></div>
             <div class="pl-wqty">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">${qtyWord(w.qty)}</span></div>
           </div>`).join('')}
         </div>` : '';

    const posWarn = d.posOff ? `<div class="pl-err" style="margin-bottom:12px">POS не налаштовано для цього закладу — продажі не відстежуються.</div>` : '';

    inner = `${addBtn}${posWarn}${itemsBlock}${lb}`;
  }

  const minDate = shiftDate(todayKyiv(), -60);
  const canPrev = _date > minDate;
  const canNext = _date < todayKyiv();

  return `
  <div class="pl-top">
    <div class="pl-back" onclick="window.__pl.back()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="pl-title">Плей-лист</div>
      <div class="pl-sub">${state.venue || ''}${_data && _data.fetchedAt ? ` · оновлено о ${fmtTime(_data.fetchedAt)}` : (isToday ? ' · продажі за сьогодні' : '')}</div>
    </div>
    <div class="pl-refresh" onclick="window.__pl.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/></svg>
    </div>
  </div>
  <div class="pl-scroll">
    <div class="pl-daterow">
      <button class="pl-navbtn" onclick="window.__pl.prevDay()" ${canPrev ? '' : 'disabled'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="pl-datelbl">${isToday ? 'Сьогодні' : fmtDate(_date)}${isToday ? '<span class="pl-live"></span>' : ''}</div>
      <button class="pl-navbtn" onclick="window.__pl.nextDay()" ${canNext ? '' : 'disabled'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    ${inner}
  </div>
  ${_addOpen ? addSheet() : ''}`;
}

function addSheet() {
  const q = _query.trim().toLowerCase();
  const existing = new Set((_data?.items || []).map(i => (i.dishName || '').toLowerCase()));
  const list = (_dishes || [])
    .filter(d => !q || d.name.toLowerCase().includes(q))
    .slice(0, 80);

  let listHtml;
  if (_dishesLoading) listHtml = `<div class="pl-spin"></div>`;
  else if (_dishesErr) listHtml = `<div class="pl-err" style="margin:12px 16px">${_dishesErr}</div>`;
  else if (!list.length) listHtml = `<div class="pl-empty"><div class="pl-empty-t">${q ? 'Нічого не знайдено' : 'Список страв порожній'}</div></div>`;
  else listHtml = list.map(d => {
    const added = existing.has(d.name.toLowerCase());
    return `<div class="pl-dish" onclick="${added ? '' : `window.__pl.add('${d.name.replace(/'/g, "\\'")}')`}" style="${added ? 'opacity:.45' : ''}">
      <div class="pl-dish-n">${d.name}</div>
      <div class="pl-dish-q">${Math.round(d.qty)} ${qtyWord(d.qty)}/60дн</div>
      <div class="pl-dish-plus">${added ? '✓' : '+'}</div>
    </div>`;
  }).join('');

  return `<div class="pl-ov" onclick="window.__pl.closeAdd()">
    <div class="pl-sheet" onclick="event.stopPropagation()">
      <div class="pl-sheet-h">
        <div class="pl-close" onclick="window.__pl.closeAdd()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <div class="pl-sheet-t">Додати страву</div>
        <input class="pl-search" id="pl-search" type="text" placeholder="Пошук страви…" value="${_query.replace(/"/g, '&quot;')}"
          oninput="window.__pl.search(this.value)"/>
      </div>
      <div class="pl-dishlist">${listHtml}</div>
    </div>
  </div>`;
}

export default {
  render() {
    _loading = true; _error = ''; _data = null; _openDish = null;
    _date = todayKyiv();
    _addOpen = false; _dishes = []; _dishesLoaded = false; _dishesLoading = false; _dishesErr = ''; _query = ''; _busy = false;
    return `${CSS}<div class="pl-wrap" id="pl-root">${body()}</div>`;
  },
  init() {
    window.__pl = {
      back:    () => navigate('dashboard'),
      reload:  () => load(),
      toggle:  (k) => { _openDish = _openDish === k ? null : k; re(); },
      prevDay: () => { const min = shiftDate(todayKyiv(), -60); if (_date > min) { _date = shiftDate(_date, -1); _openDish = null; load(); } },
      nextDay: () => { if (_date < todayKyiv()) { _date = shiftDate(_date, 1); _openDish = null; load(); } },
      openAdd: () => { _addOpen = true; re(); loadDishes(); },
      closeAdd:() => { _addOpen = false; _query = ''; re(); },
      search:  (v) => {
        _query = v; re();
        const inp = document.getElementById('pl-search');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      },
      add:     (name) => addDish(name),
      remove:  (id) => removeItem(id),
    };
    load();
  },
  cleanup() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    window.__pl = null;
  },
};
