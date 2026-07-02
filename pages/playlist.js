/* ============================================================
   BarOps — pages/playlist.js
   Плей-лист: страви для "протягування" в продажах.
   Продажі по офіціантах з POS (OLAP), історія 60 днів.
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

let _loading   = true;
let _error     = '';
let _data      = null;      // { items, leaderboard, live, fetchedAt, posOff }
let _venueId   = '';
let _date      = '';        // обрана дата YYYY-MM-DD
let _openDish  = null;      // розгорнута страва (id або dishName)
let _timer     = null;      // авто-оновлення today
let _rangeMode = false;     // режим «Період» (from..to)
let _rangeFrom = '';
let _rangeTo   = '';

// Додавання страви
let _addOpen      = false;
let _dishes       = [];     // [{name, qty}]
let _dishesLoaded = false;
let _dishesLoading = false;
let _dishesErr    = '';
let _query        = '';
let _busy         = false;  // додавання/видалення в процесі
let _addDish      = null;   // обрана страва (крок 2 — дати)
let _addFrom      = '';
let _addTo        = '';
// Історія (завершені страви) + звіт
let _histOpen     = false;
let _history      = [];
let _histLoading  = false;
let _report       = null;   // { loading } | { data, group? } | { error }
let _repTab       = 'dishes'; // вкладка звіту групи: 'dishes' | 'waiters' | 'days'
let _groupTab     = 'dishes'; // швидкий перемикач у розгорнутій активній групі
let _openDay      = null;     // розгорнутий день у вкладці «Дні»
// Групування
let _selectMode   = false;
let _selected     = new Set();
let _grpOpen      = false;  // лист створення групи
let _grpName      = '';
let _grpFrom      = '';
let _grpTo        = '';
let _openGroup    = null;   // розгорнута група (groupId)
// Власний date-picker
let _dpField      = null;   // 'addFrom' | 'addTo' | 'grpFrom' | 'grpTo'
let _dpMonth      = '';     // 'YYYY-MM' відображуваний місяць

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
.pl-daterow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}
.pl-rangebtn{height:30px;padding:0 12px;border-radius:9px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text2);font-size:12px;font-weight:600;font-family:var(--font-b);cursor:pointer}
.pl-rangebtn.on{background:rgba(168,139,255,.14);border-color:var(--purple);color:var(--purple)}
.pl-dinput{flex:1;min-width:0;height:34px;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;color:var(--text0);font-size:13px;font-family:var(--font-b);padding:0 10px;outline:none;color-scheme:dark}
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
    const url = (_rangeMode && _rangeFrom && _rangeTo)
      ? `${API}/api/playlist/${_venueId}/progress?from=${_rangeFrom}&to=${_rangeTo}`
      : `${API}/api/playlist/${_venueId}/progress?date=${_date}`;
    const res = await fetch(url, { headers: hdrs() });
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
  // авто-оновлення лише для сьогодні (тихо, без спінера); у режимі «Період» — ні
  if (!_rangeMode && _date === todayKyiv() && state.route === 'playlist') {
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

function selectAddDish(name) {
  _addDish = name;
  _addFrom = todayKyiv();
  _addTo   = '';
  re();
}

async function addDish(name, from, to) {
  if (_busy) return;
  _busy = true; re();
  try {
    await fetch(`${API}/api/playlist/${_venueId}`, {
      method: 'POST', headers: { ...hdrs(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishName: name, trackFrom: from || undefined, trackTo: to || undefined }),
    });
  } catch {}
  _busy = false; _addOpen = false; _addDish = null; _query = '';
  await load();
}

/* ── Історія + звіт ── */
async function loadHistory() {
  _histLoading = true; re();
  try {
    const r = await fetch(`${API}/api/playlist/${_venueId}/history`, { headers: hdrs() });
    const d = await r.json();
    _history = d.items || [];
  } catch { _history = []; }
  _histLoading = false; re();
}

async function openReport(id) {
  _report = { loading: true }; re();
  try {
    const r = await fetch(`${API}/api/playlist/item/${id}/report`, { headers: hdrs() });
    const d = await r.json();
    if (r.ok && !d.error) _report = { data: d };
    else _report = { error: d.error || 'Помилка' };
  } catch (e) { _report = { error: 'Мережева помилка' }; }
  re();
}

function reportText(d, isGroup) {
  const lines = [];
  if (isGroup) {
    lines.push(`📦 ${d.groupName}`);
    lines.push(`Період: ${fmtDate(d.from)} – ${fmtDate(d.to)}`);
    lines.push(`Разом: ${Math.round(d.totalQty)} шт · ${money(d.totalSum)}`);
    if (_repTab === 'waiters') {
      lines.push(''); lines.push('Рейтинг офіціантів:');
      (d.waiters || []).forEach((w, i) => lines.push(`${i + 1}. ${w.name}: ${Math.round(w.qty)} шт · ${money(w.sum)}`));
    } else if (_repTab === 'days') {
      lines.push(''); lines.push('По днях:');
      (d.days || []).forEach(x => lines.push(`• ${fmtDate(x.date)}: ${Math.round(x.qty)} шт · ${money(x.sum)}`));
    } else {
      lines.push('');
      (d.dishes || []).forEach(x => lines.push(`• ${x.dishName}: ${Math.round(x.qty)} шт · ${money(x.sum)}`));
    }
  } else {
    lines.push(`🎯 ${d.dishName}`);
    lines.push(`Період: ${fmtDate(d.from)} – ${fmtDate(d.to)}`);
    lines.push(`Продано: ${Math.round(d.totalQty)} шт · ${money(d.totalSum)}`);
    if (d.waiters && d.waiters.length) { lines.push(''); lines.push('По офіціантах:'); for (const w of d.waiters) lines.push(`• ${w.name}: ${Math.round(w.qty)} шт · ${money(w.sum)}`); }
  }
  return lines.join('\n');
}

// ── Групування ──
function toggleSelectMode() { _selectMode = !_selectMode; _selected = new Set(); re(); }
function toggleSelect(id)   { if (_selected.has(id)) _selected.delete(id); else _selected.add(id); re(); }
function openGroupSheet()   { if (!_selected.size) return; _grpOpen = true; _grpName = ''; _grpFrom = todayKyiv(); _grpTo = ''; re(); }

async function createGroup() {
  const ids = [..._selected];
  if (!_grpName.trim() || !ids.length || _busy) return;
  _busy = true; re();
  try {
    await fetch(`${API}/api/playlist/${_venueId}/group`, {
      method: 'POST', headers: { ...hdrs(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: _grpName.trim(), itemIds: ids, trackFrom: _grpFrom || undefined, trackTo: _grpTo || undefined }),
    });
  } catch {}
  _busy = false; _grpOpen = false; _selectMode = false; _selected = new Set();
  await load();
}

async function ungroup(groupId) {
  if (_busy) return;
  _busy = true; re();
  try { await fetch(`${API}/api/playlist/${_venueId}/group/${groupId}`, { method: 'DELETE', headers: hdrs() }); } catch {}
  _busy = false; _openGroup = null;
  await load();
}

async function openGroupReport(groupId) {
  _repTab = 'dishes'; _openDay = null;
  _report = { loading: true, group: true }; re();
  try {
    const r = await fetch(`${API}/api/playlist/${_venueId}/group/${groupId}/report`, { headers: hdrs() });
    const d = await r.json();
    _report = (r.ok && !d.error) ? { data: d, group: true } : { error: d.error || 'Помилка' };
  } catch { _report = { error: 'Мережева помилка' }; }
  re();
}

async function copyReport() {
  if (!_report?.data) return;
  const txt = reportText(_report.data, !!_report.group);
  try {
    await navigator.clipboard.writeText(txt);
    const el = document.getElementById('pl-copy-btn');
    if (el) { el.textContent = '✓ Скопійовано'; setTimeout(() => { const e2 = document.getElementById('pl-copy-btn'); if (e2) e2.textContent = 'Копіювати'; }, 1800); }
  } catch {
    // fallback
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
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
  const isToday = !_rangeMode && _date === todayKyiv();
  return `
  <div class="pl-card">
    <div class="pl-row" onclick="window.__pl.toggle('${(it.id || it.dishName).replace(/'/g, "\\'")}')">
      <div style="flex:1;min-width:0">
        <div class="pl-name">${esc(it.dishName)}</div>
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
            <div class="pl-wname">${esc(w.name)}</div>
            <div class="pl-wqty">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">${qtyWord(w.qty)}</span></div>
          </div>`).join('')
        : '<div style="font-size:12px;color:var(--text2);font-family:var(--font-b);padding:6px 2px">Ще ніхто не продав цю позицію</div>'}
    </div>` : ''}
  </div>`;
}

function body() {
  const isToday = !_rangeMode && _date === todayKyiv();
  let inner;
  if (_loading) {
    inner = `<div class="pl-spin"></div>`;
  } else if (_error) {
    inner = `<div class="pl-err">${_error}</div>`;
  } else {
    const d = _data || { items: [], leaderboard: [] };
    const ungroupedCount = (d.items || []).filter(it => !it.groupId && it.id).length;
    const addBtn = !isToday ? '' : (_selectMode
      ? `<div style="display:flex;gap:8px;margin-bottom:10px">
           <button class="pl-add" style="flex:1;background:var(--bg2)" onclick="window.__pl.selectMode()">Скасувати</button>
           <button class="pl-add" style="flex:1;${_selected.size ? '' : 'opacity:.5'}" ${_selected.size ? '' : 'disabled'} onclick="window.__pl.openGrp()">Згрупувати (${_selected.size})</button>
         </div>`
      : `<button class="pl-add" onclick="window.__pl.openAdd()">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
           Додати страву
         </button>
         ${ungroupedCount >= 2 ? `<button class="pl-add" style="background:var(--bg2);margin-top:8px" onclick="window.__pl.selectMode()">
           <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
           Згрупувати страви
         </button>` : ''}`);

    const itemsBlock = (d.items || []).length
      ? renderItems(d.items)
      : `<div class="pl-empty">
           <div class="pl-empty-i">🎯</div>
           <div class="pl-empty-t">${isToday
              ? 'Плей-лист порожній.<br>Додайте страви, які треба протягнути в продажах.'
              : 'Цього дня не було позицій у плей-листі.'}</div>
         </div>`;

    const lb = !_selectMode && (d.items || []).length && (d.leaderboard || []).length
      ? `<div class="pl-sec">Лідери продажів плей-листа</div>
         <div class="pl-lb">
           ${d.leaderboard.map((w, i) => `<div class="pl-lbrow">
             <div class="pl-lbrank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</div>
             <div class="pl-av">${initials(w.name)}</div>
             <div style="flex:1;min-width:0"><div class="pl-name" style="font-size:14px">${esc(w.name)}</div><div class="pl-meta">${money(w.sum)}</div></div>
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
      <div class="pl-sub">${state.venue || ''}${_rangeMode ? ` · період ${_rangeFrom && _rangeTo ? fmtDate(_rangeFrom) + '–' + fmtDate(_rangeTo) : '…'}` : (_data && _data.fetchedAt ? ` · оновлено о ${fmtTime(_data.fetchedAt)}` : (isToday ? ' · продажі за сьогодні' : ''))}</div>
    </div>
    <div class="pl-refresh" onclick="window.__pl.openHist()" title="Історія" style="margin-right:8px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    </div>
    <div class="pl-refresh" onclick="window.__pl.reload()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2"><path d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"/></svg>
    </div>
  </div>
  <div class="pl-scroll">
    <div class="pl-daterow">
      ${_rangeMode ? `
        <input type="date" class="pl-dinput" value="${_rangeFrom}" min="${minDate}" max="${todayKyiv()}" onchange="window.__pl.setRange('from',this.value)">
        <span style="color:var(--text2);font-family:var(--font-b);font-size:13px;flex-shrink:0">–</span>
        <input type="date" class="pl-dinput" value="${_rangeTo}" min="${minDate}" max="${todayKyiv()}" onchange="window.__pl.setRange('to',this.value)">
        <button class="pl-rangebtn on" onclick="window.__pl.toggleRange()" title="Назад до дня">✕</button>
      ` : `
        <button class="pl-navbtn" onclick="window.__pl.prevDay()" ${canPrev ? '' : 'disabled'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="pl-datelbl" style="flex:1;text-align:center">${isToday ? 'Сьогодні' : fmtDate(_date)}${isToday ? '<span class="pl-live"></span>' : ''}</div>
        <button class="pl-navbtn" onclick="window.__pl.nextDay()" ${canNext ? '' : 'disabled'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="pl-rangebtn" onclick="window.__pl.toggleRange()">📅 Період</button>
      `}
    </div>
    ${inner}
  </div>
  ${_addOpen ? addSheet() : ''}
  ${histSheet()}
  ${grpSheet()}
  ${datePicker()}`;
}

function addSheet() {
  // Крок 2 — діапазон дат для обраної страви
  if (_addDish) {
    const inp = `width:100%;height:48px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;color:var(--text0);font-size:15px;padding:0 12px;box-sizing:border-box;font-family:var(--font-h);outline:none`;
    return `<div class="pl-ov" onclick="window.__pl.closeAdd()">
      <div class="pl-sheet" onclick="event.stopPropagation()">
        <div class="pl-sheet-h">
          <div class="pl-close" onclick="window.__pl.backAdd()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="pl-sheet-t">Період відстеження</div>
        </div>
        <div style="padding:16px 16px 24px">
          <div style="font-size:16px;font-weight:600;color:var(--text0);font-family:var(--font-h);margin-bottom:16px">${_addDish}</div>
          <div style="display:flex;gap:10px">
            <div style="flex:1">
              <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px">Відстежувати з</div>
              ${dpTrigger('addFrom', _addFrom, 'Оберіть')}
            </div>
            <div style="flex:1">
              <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px">По (необовʼязково)</div>
              ${dpTrigger('addTo', _addTo, 'Не задано')}
            </div>
          </div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);margin:8px 0 18px;line-height:1.5">Порожнє «По» = безстроково, поки не приберете вручну. Після завершення страва перейде в Історію, де можна скопіювати продажі.</div>
          <button onclick="window.__pl.confirmAdd()" ${_busy ? 'disabled' : ''} style="width:100%;height:52px;background:var(--purple);border:none;border-radius:14px;font-size:15px;font-weight:600;color:#fff;font-family:var(--font-h);cursor:pointer;opacity:${_busy ? '.6' : '1'}">${_busy ? 'Додаю…' : 'Додати в плей-лист'}</button>
        </div>
      </div>
    </div>`;
  }

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
    return `<div class="pl-dish" onclick="${added ? '' : `window.__pl.pick('${d.name.replace(/'/g, "\\'")}')`}" style="${added ? 'opacity:.45' : ''}">
      <div class="pl-dish-n">${esc(d.name)}</div>
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

function histSheet() {
  if (!_histOpen) return '';
  let listHtml;
  if (_histLoading) listHtml = `<div class="pl-spin"></div>`;
  else if (!_history.length) listHtml = `<div class="pl-empty"><div class="pl-empty-t">Історія порожня.<br>Тут зʼявляться страви, період яких завершився.</div></div>`;
  else {
    const grp = new Map(); const solo = [];
    for (const it of _history) {
      if (it.groupId) { if (!grp.has(it.groupId)) grp.set(it.groupId, { id: it.groupId, name: it.groupName || 'Група', from: it.trackFrom, to: it.trackTo, count: 0 }); grp.get(it.groupId).count++; }
      else solo.push(it);
    }
    const chev = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`;
    const dates = (f, t) => `${f ? fmtDate(f) : '—'} – ${t ? fmtDate(t) : '—'}`;
    listHtml =
      [...grp.values()].map(g => `<div class="pl-dish" onclick="window.__pl.groupReport('${g.id}')">
        <div style="flex:1;min-width:0"><div class="pl-dish-n">📦 ${g.name}</div><div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${g.count} страв · ${dates(g.from, g.to)}</div></div>${chev}
      </div>`).join('')
      + solo.map(it => `<div class="pl-dish" onclick="window.__pl.report('${it.id}')">
        <div style="flex:1;min-width:0"><div class="pl-dish-n">${esc(it.dishName)}</div><div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${dates(it.trackFrom, it.trackTo)}</div></div>${chev}
      </div>`).join('');
  }
  return `<div class="pl-ov" onclick="window.__pl.closeHist()">
    <div class="pl-sheet" onclick="event.stopPropagation()">
      <div class="pl-sheet-h">
        <div class="pl-close" onclick="window.__pl.closeHist()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <div class="pl-sheet-t">Історія плей-листів</div>
      </div>
      <div class="pl-dishlist">${listHtml}</div>
    </div>
  </div>${reportSheet()}`;
}

function groupTabContent(d) {
  const lbl = (t) => `<div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:8px;letter-spacing:.05em">${t}</div>`;
  if (_repTab === 'waiters') {
    const ws = d.waiters || [];
    if (!ws.length) return lbl('РЕЙТИНГ ОФІЦІАНТІВ') + `<div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">Продажів за цей період не знайдено</div>`;
    return lbl('РЕЙТИНГ ОФІЦІАНТІВ') + ws.map((w, i) => `<div class="pl-lbrow"><div class="pl-lbrank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</div><div class="pl-av">${initials(w.name)}</div><div style="flex:1;min-width:0"><div class="pl-name" style="font-size:14px">${esc(w.name)}</div><div class="pl-meta">${money(w.sum)}</div></div><div class="pl-wqty">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span></div></div>`).join('');
  }
  if (_repTab === 'days') {
    const ds = d.days || [];
    if (!ds.length) return lbl('ПО ДНЯХ') + `<div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">Немає продажів по днях</div>`;
    return lbl('ПО ДНЯХ (тап — деталі)') + ds.map(x => {
      const dop = _openDay === x.date;
      return `<div>
        <div class="pl-wrow" onclick="window.__pl.toggleDay('${x.date}')" style="cursor:pointer">
          <div class="pl-wname" style="margin-left:0">${fmtDate(x.date)}</div>
          <div class="pl-wqty">${Math.round(x.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span> · ${money(x.sum)}</div>
          <svg class="pl-chev ${dop ? 'open' : ''}" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" style="margin-left:6px"><path d="M9 6l6 6-6 6"/></svg>
        </div>
        ${dop ? `<div style="padding:2px 4px 8px;display:flex;flex-direction:column;gap:3px">${(x.waiters || []).length
          ? x.waiters.map((w, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 9px;background:var(--bg2);border-radius:8px;font-size:12px;font-family:var(--font-b)"><span style="color:var(--text1)">${i === 0 ? '🥇 ' : ''}${esc(w.name)}</span><span style="color:var(--text0);font-weight:600;font-family:var(--font-h)">${Math.round(w.qty)} шт · ${money(w.sum)}</span></div>`).join('')
          : '<div style="font-size:11px;color:var(--text2);padding:4px 9px">Без офіціанта</div>'}</div>` : ''}
      </div>`;
    }).join('');
  }
  const xs = d.dishes || [];
  return lbl('ПО СТРАВАХ') + xs.map(x => `<div class="pl-wrow"><div class="pl-wname" style="margin-left:0">${esc(x.dishName)}</div><div class="pl-wqty">${Math.round(x.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span> · ${money(x.sum)}</div></div>`).join('');
}

function reportSheet() {
  if (!_report) return '';
  let inner;
  if (_report.loading)    inner = `<div class="pl-spin"></div>`;
  else if (_report.error) inner = `<div class="pl-err" style="margin:12px 16px">${_report.error}</div>`;
  else {
    const d = _report.data;
    const isG = !!_report.group;
    inner = `<div style="padding:4px 16px 20px">
      <div style="font-size:17px;font-weight:700;color:var(--text0);font-family:var(--font-h)">${isG ? '📦 ' + d.groupName : d.dishName}</div>
      <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">${fmtDate(d.from)} – ${fmtDate(d.to)}</div>
      <div style="display:flex;gap:10px;margin:14px 0">
        <div style="flex:1;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:var(--purple);font-family:var(--font-h)">${Math.round(d.totalQty)}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">ШТ ПРОДАНО</div>
        </div>
        <div style="flex:1;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--text0);font-family:var(--font-h)">${money(d.totalSum)}</div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">СУМА</div>
        </div>
      </div>
      ${isG
        ? `<div style="display:flex;gap:4px;margin-bottom:12px;background:var(--bg2);border-radius:10px;padding:3px">
            ${[['dishes', 'Страви'], ['waiters', 'Офіціанти'], ['days', 'Дні']].map(([k, l]) => `<button onclick="window.__pl.repTab('${k}')" style="flex:1;height:32px;border-radius:8px;border:none;font-size:12px;font-family:var(--font-b);cursor:pointer;background:${_repTab === k ? 'var(--purple)' : 'transparent'};color:${_repTab === k ? '#fff' : 'var(--text2)'}">${l}</button>`).join('')}
          </div>${groupTabContent(d)}`
        : (d.waiters && d.waiters.length
            ? `<div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:8px;letter-spacing:.05em">ПО ОФІЦІАНТАХ</div>${d.waiters.map(w => `<div class="pl-wrow"><div class="pl-av">${initials(w.name)}</div><div class="pl-wname">${esc(w.name)}</div><div class="pl-wqty">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span> · ${money(w.sum)}</div></div>`).join('')}`
            : `<div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">Продажів за цей період не знайдено</div>`)}
      <button id="pl-copy-btn" onclick="window.__pl.copy()" style="width:100%;height:50px;margin-top:18px;background:var(--purple);border:none;border-radius:14px;font-size:14px;font-weight:600;color:#fff;font-family:var(--font-h);cursor:pointer">Копіювати</button>
    </div>`;
  }
  return `<div class="pl-ov" style="z-index:80" onclick="window.__pl.closeReport()">
    <div class="pl-sheet" onclick="event.stopPropagation()">
      <div class="pl-sheet-h">
        <div class="pl-close" onclick="window.__pl.closeReport()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <div class="pl-sheet-t">Звіт продажів</div>
      </div>
      ${inner}
    </div>
  </div>`;
}

function renderItems(items) {
  const isToday = !_rangeMode && _date === todayKyiv();
  const groupMap = new Map();
  const standalone = [];
  for (const it of items) {
    if (it.groupId) {
      if (!groupMap.has(it.groupId)) groupMap.set(it.groupId, { id: it.groupId, name: it.groupName || 'Група', items: [] });
      groupMap.get(it.groupId).items.push(it);
    } else standalone.push(it);
  }
  let html = '';
  for (const g of groupMap.values()) {
    const totQty = g.items.reduce((s, x) => s + (x.soldQty || 0), 0);
    const totSum = g.items.reduce((s, x) => s + (x.soldSum || 0), 0);
    const open = _openGroup === g.id;
    html += `<div class="pl-card" style="border:0.5px solid var(--purple-border);background:rgba(168,139,255,.05)">
      <div class="pl-row" onclick="window.__pl.toggleGroup('${g.id}')">
        <div style="flex:1;min-width:0">
          <div class="pl-name">📦 ${g.name}</div>
          <div class="pl-meta">${g.items.length} страв · ${money(totSum)}</div>
        </div>
        <div><div class="pl-qty">${Math.round(totQty)}</div><div class="pl-qty-lbl">шт продано</div></div>
        ${isToday ? `<div class="pl-del" onclick="event.stopPropagation();window.__pl.ungroup('${g.id}')" title="Розгрупувати"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg></div>` : ''}
        <svg class="pl-chev ${open ? 'open' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </div>
      ${open ? `<div style="padding:2px 6px 10px">
        <div style="display:flex;gap:4px;margin-bottom:8px;background:var(--bg2);border-radius:9px;padding:3px">
          <button onclick="event.stopPropagation();window.__pl.groupTab('dishes')" style="flex:1;height:30px;border-radius:7px;border:none;font-size:12px;font-family:var(--font-b);cursor:pointer;background:${_groupTab !== 'waiters' ? 'var(--purple)' : 'transparent'};color:${_groupTab !== 'waiters' ? '#fff' : 'var(--text2)'}">Страви</button>
          <button onclick="event.stopPropagation();window.__pl.groupTab('waiters')" style="flex:1;height:30px;border-radius:7px;border:none;font-size:12px;font-family:var(--font-b);cursor:pointer;background:${_groupTab === 'waiters' ? 'var(--purple)' : 'transparent'};color:${_groupTab === 'waiters' ? '#fff' : 'var(--text2)'}">Офіціанти</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${_groupTab === 'waiters'
            ? (() => {
                const wmap = {};
                for (const it of g.items) for (const w of (it.byWaiter || [])) { const e = wmap[w.name] || { name: w.name, qty: 0, sum: 0 }; e.qty += w.qty; e.sum += (w.sum || 0); wmap[w.name] = e; }
                const ws = Object.values(wmap).sort((a, b) => b.qty - a.qty);
                return ws.length
                  ? ws.map((w, i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:10px">
                      <div style="width:20px;text-align:center;font-size:13px">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</div>
                      <div style="flex:1;min-width:0;font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.name)}</div>
                      <div style="font-size:13px;font-weight:700;color:var(--text0);font-family:var(--font-h)">${Math.round(w.qty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span></div>
                    </div>`).join('')
                  : `<div style="font-size:12px;color:var(--text2);font-family:var(--font-b);padding:4px 2px">Ще ніхто не продав із набору ${isToday ? 'сьогодні' : 'цього дня'}</div>`;
              })()
            : g.items.map(it => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2);border-radius:10px">
                <div style="flex:1;min-width:0;font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.dishName)}</div>
                <div style="font-size:13px;font-weight:700;color:var(--text0);font-family:var(--font-h)">${Math.round(it.soldQty)} <span style="font-size:10px;color:var(--text2);font-weight:400">шт</span></div>
              </div>`).join('')}
          <button onclick="window.__pl.groupReport('${g.id}')" style="margin-top:6px;height:42px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:11px;color:var(--purple);font-size:13px;font-weight:600;font-family:var(--font-h);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg> Повний звіт за період
          </button>
        </div>
      </div>` : ''}
    </div>`;
  }
  if (_selectMode) {
    html += standalone.filter(it => it.id).map(it => `<div class="pl-card"><div class="pl-row" onclick="window.__pl.selRow('${it.id}')" style="cursor:pointer">
      <div style="width:22px;height:22px;border-radius:7px;border:2px solid ${_selected.has(it.id) ? 'var(--purple)' : 'var(--border2)'};background:${_selected.has(it.id) ? 'var(--purple)' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px">${_selected.has(it.id) ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>' : ''}</div>
      <div style="flex:1;min-width:0"><div class="pl-name">${esc(it.dishName)}</div></div>
      <div class="pl-qty">${Math.round(it.soldQty)}</div>
    </div></div>`).join('');
  } else {
    html += standalone.map(it => itemCard(it)).join('');
  }
  return html;
}

function grpSheet() {
  if (!_grpOpen) return '';
  const inp = `width:100%;height:48px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;color:var(--text0);font-size:15px;padding:0 12px;box-sizing:border-box;font-family:var(--font-h);outline:none`;
  return `<div class="pl-ov" style="z-index:80" onclick="window.__pl.closeGrp()">
    <div class="pl-sheet" onclick="event.stopPropagation()">
      <div class="pl-sheet-h">
        <div class="pl-close" onclick="window.__pl.closeGrp()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
        <div class="pl-sheet-t">Нова група · ${_selected.size} страв</div>
      </div>
      <div style="padding:16px 16px 24px">
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px">Назва групи</div>
        <input id="pl-grp-name" type="text" placeholder="Напр. Промо Aperol" value="${_grpName.replace(/"/g, '&quot;')}" oninput="window.__pl.grpName(this.value)" style="${inp};margin-bottom:14px"/>
        <div style="display:flex;gap:10px">
          <div style="flex:1"><div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px">Відстежувати з</div>
            ${dpTrigger('grpFrom', _grpFrom, 'Оберіть')}</div>
          <div style="flex:1"><div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:5px">По (необовʼязково)</div>
            ${dpTrigger('grpTo', _grpTo, 'Не задано')}</div>
        </div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--font-b);margin:8px 0 18px;line-height:1.5">Спільний період для всіх страв набору. Після завершення група перейде в Історію зі зведеним звітом.</div>
        <button onclick="window.__pl.createGroup()" ${(_busy || !_grpName.trim()) ? 'disabled' : ''} style="width:100%;height:52px;background:var(--purple);border:none;border-radius:14px;font-size:15px;font-weight:600;color:#fff;font-family:var(--font-h);cursor:pointer;opacity:${(_busy || !_grpName.trim()) ? '.55' : '1'}">${_busy ? 'Створюю…' : 'Створити групу'}</button>
      </div>
    </div>
  </div>`;
}

/* ── Власний date-picker ── */
const DP_MONTHS = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
function dpVal(field)        { return ({ addFrom: _addFrom, addTo: _addTo, grpFrom: _grpFrom, grpTo: _grpTo })[field] || ''; }
function dpSet(field, v) {
  if (field === 'addFrom') { _addFrom = v; if (_addTo && _addTo < v) _addTo = ''; }
  else if (field === 'addTo')  { _addTo = v; }
  else if (field === 'grpFrom'){ _grpFrom = v; if (_grpTo && _grpTo < v) _grpTo = ''; }
  else if (field === 'grpTo')  { _grpTo = v; }
}
function openDp(field) { _dpField = field; _dpMonth = (dpVal(field) || todayKyiv()).slice(0, 7); re(); }
function dpShift(delta) {
  const [y, m] = _dpMonth.split('-').map(Number);
  _dpMonth = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
  re();
}

function dpTrigger(field, value, placeholder) {
  return `<div onclick="window.__pl.openDp('${field}')" style="width:100%;height:48px;background:var(--bg2);border:0.5px solid ${value ? 'var(--purple-border)' : 'var(--border)'};border-radius:12px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;cursor:pointer;box-sizing:border-box">
    <span style="font-size:15px;font-family:var(--font-h);color:${value ? 'var(--text0)' : 'var(--text3)'}">${value ? fmtDate(value) : placeholder}</span>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>
  </div>`;
}

function datePicker() {
  if (!_dpField) return '';
  const [y, m] = _dpMonth.split('-').map(Number);
  const firstDow    = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Пн=0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today  = todayKyiv();
  const sel    = dpVal(_dpField);
  const minD   = _dpField === 'addTo' ? _addFrom : _dpField === 'grpTo' ? _grpFrom : '';
  const optional = _dpField === 'addTo' || _dpField === 'grpTo';
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div></div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isS = ds === sel, isT = ds === today, dis = minD && ds < minD;
    cells.push(`<div ${dis ? '' : `onclick="window.__pl.dpPick('${ds}')"`} style="height:38px;display:flex;align-items:center;justify-content:center;border-radius:9px;font-size:14px;font-family:var(--font-h);cursor:${dis ? 'default' : 'pointer'};
      background:${isS ? 'var(--purple)' : 'transparent'};color:${dis ? 'var(--text3)' : isS ? '#fff' : 'var(--text0)'};
      ${!isS && isT ? 'box-shadow:inset 0 0 0 1px var(--purple)' : ''}">${d}</div>`);
  }
  return `<div class="pl-ov" style="z-index:90;align-items:center;justify-content:center" onclick="window.__pl.dpClose()">
    <div onclick="event.stopPropagation()" style="background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:14px;width:300px;max-width:88vw;box-shadow:0 20px 60px rgba(0,0,0,.55)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div onclick="window.__pl.dpPrev()" style="width:34px;height:34px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg></div>
        <div style="font-size:15px;font-weight:700;color:var(--text0);font-family:var(--font-h)">${DP_MONTHS[m - 1]} ${y}</div>
        <div onclick="window.__pl.dpNext()" style="width:34px;height:34px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text1)" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
        ${['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(x => `<div style="height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text2);font-family:var(--font-b)">${x}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${cells.join('')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:0.5px solid var(--border)">
        <button onclick="window.__pl.dpToday()" style="background:none;border:none;color:var(--purple);font-size:14px;font-weight:600;font-family:var(--font-h);cursor:pointer">Сьогодні</button>
        ${optional ? `<button onclick="window.__pl.dpClear()" style="background:none;border:none;color:var(--text2);font-size:14px;font-family:var(--font-b);cursor:pointer">Очистити</button>` : ''}
      </div>
    </div>
  </div>`;
}

export default {
  render() {
    _loading = true; _error = ''; _data = null; _openDish = null;
    _date = todayKyiv();
    _rangeMode = false; _rangeFrom = ''; _rangeTo = '';
    _addOpen = false; _dishes = []; _dishesLoaded = false; _dishesLoading = false; _dishesErr = ''; _query = ''; _busy = false;
    _addDish = null; _addFrom = ''; _addTo = '';
    _histOpen = false; _history = []; _histLoading = false; _report = null;
    _selectMode = false; _selected = new Set(); _grpOpen = false; _grpName = ''; _grpFrom = ''; _grpTo = ''; _openGroup = null;
    _dpField = null; _dpMonth = '';
    _repTab = 'dishes'; _groupTab = 'dishes'; _openDay = null;
    return `${CSS}<div class="pl-wrap" id="pl-root">${body()}</div>`;
  },
  init() {
    window.__pl = {
      back:    () => navigate('dashboard'),
      reload:  () => load(),
      toggle:  (k) => { _openDish = _openDish === k ? null : k; re(); },
      prevDay: () => { const min = shiftDate(todayKyiv(), -60); if (_date > min) { _date = shiftDate(_date, -1); _openDish = null; load(); } },
      nextDay: () => { if (_date < todayKyiv()) { _date = shiftDate(_date, 1); _openDish = null; load(); } },
      toggleRange: () => {
        _rangeMode = !_rangeMode; _openDish = null;
        if (_rangeMode) {                    // вмикаємо період → дефолт: останні 7 днів
          if (!_rangeTo)   _rangeTo   = todayKyiv();
          if (!_rangeFrom) _rangeFrom = shiftDate(todayKyiv(), -6);
          load();
        } else { _date = todayKyiv(); load(); }
      },
      setRange: (which, val) => {
        if (!val) return;
        if (which === 'from') _rangeFrom = val; else _rangeTo = val;
        if (_rangeFrom && _rangeTo && _rangeFrom > _rangeTo) {   // тримаємо from ≤ to
          if (which === 'from') _rangeTo = _rangeFrom; else _rangeFrom = _rangeTo;
        }
        _openDish = null;
        if (_rangeFrom && _rangeTo) load();
      },
      openAdd: () => { _addOpen = true; _addDish = null; re(); loadDishes(); },
      closeAdd:() => { _addOpen = false; _addDish = null; _query = ''; re(); },
      search:  (v) => {
        _query = v; re();
        const inp = document.getElementById('pl-search');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      },
      pick:    (name) => selectAddDish(name),
      backAdd: () => { _addDish = null; re(); },
      setFrom: (v) => { _addFrom = v; if (_addTo && _addTo < v) _addTo = ''; },
      setTo:   (v) => { _addTo = v; },
      confirmAdd: () => addDish(_addDish, _addFrom, _addTo),
      openHist:  () => { _histOpen = true; re(); loadHistory(); },
      closeHist: () => { _histOpen = false; _report = null; re(); },
      report:    (id) => openReport(id),
      groupReport: (gid) => openGroupReport(gid),
      repTab:    (t) => { _repTab = t; _openDay = null; re(); },
      closeReport: () => { _report = null; re(); },
      copy:      () => copyReport(),
      // групування
      selectMode: () => toggleSelectMode(),
      selRow:     (id) => toggleSelect(id),
      toggleGroup:(gid) => { _openGroup = _openGroup === gid ? null : gid; _groupTab = 'dishes'; re(); },
      groupTab:   (t) => { _groupTab = t; re(); },
      toggleDay:  (ds) => { _openDay = _openDay === ds ? null : ds; re(); },
      ungroup:    (gid) => ungroup(gid),
      openGrp:    () => openGroupSheet(),
      closeGrp:   () => { _grpOpen = false; re(); },
      grpName:    (v) => { _grpName = v; },
      grpFrom:    (v) => { _grpFrom = v; if (_grpTo && _grpTo < v) _grpTo = ''; },
      grpTo:      (v) => { _grpTo = v; },
      createGroup:() => createGroup(),
      // date-picker
      openDp:    (f) => openDp(f),
      dpClose:   () => { _dpField = null; re(); },
      dpPick:    (ds) => { dpSet(_dpField, ds); _dpField = null; re(); },
      dpClear:   () => { dpSet(_dpField, ''); _dpField = null; re(); },
      dpToday:   () => { dpSet(_dpField, todayKyiv()); _dpField = null; re(); },
      dpPrev:    () => dpShift(-1),
      dpNext:    () => dpShift(1),
      add:       (name) => addDish(name),
      remove:    (id) => removeItem(id),
    };
    load();
  },
  cleanup() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    window.__pl = null;
  },
};
