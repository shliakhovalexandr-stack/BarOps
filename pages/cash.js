/* ============================================================
   BarOps — pages/cash.js
   «Каса зміни» — вилучення готівки з каси (ТІЛЬКИ BarOps, не Syrve).
   Офіціант фіксує, скільки взяв з каси на потреби; менеджер бачить
   увесь список + суму при здачі каси. Дані окремі під кожен заклад.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════ STATE ════════════ */
let _items   = [];
let _total   = 0;
let _loading = false;
let _addOpen = false;
let _saving  = false;
let _waiters = [];   // офіціанти закладу для випадайки «від кого» (лише менеджер)
let _editId  = null; // id запису, що редагується (свайп → Змінити)
let _confirmId = null; // id запису, видалення якого підтверджують
let _swipeAdded = false;

const isMgr = () => ['admin', 'manager', 'director'].includes((state.role || '').toLowerCase());

/* ════════════ HELPERS ════════════ */
function token()  { return localStorage.getItem('barops_token') || state.token || ''; }
function venueId() { return state.venueId || localStorage.getItem('barops_venueId') || ''; }
function fmtMoney(n) { return Math.round(n || 0).toLocaleString('uk-UA') + ' ₴'; }
function todayLabel() { return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }); }
function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

/* ════════════ CSS ════════════ */
const CSS = `<style id="csh-css">
.csh-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.csh-scroll{overflow-y:auto;flex:1;padding-bottom:32px}.csh-scroll::-webkit-scrollbar{width:0}
.csh-header{padding:10px 20px 0;display:flex;align-items:center;gap:12px;flex-shrink:0}
.csh-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.csh-back:active{background:var(--bg3)}
.csh-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.csh-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.csh-total{margin:14px 20px 0;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:16px 18px;text-align:center}
.csh-total-val{font-family:var(--font-h);font-size:30px;font-weight:800;color:var(--amber);line-height:1}
.csh-total-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:6px;letter-spacing:.06em;text-transform:uppercase}
.csh-add{margin:14px 20px 0;height:48px;border-radius:14px;border:none;background:var(--amber);color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer;width:calc(100% - 40px);display:flex;align-items:center;justify-content:center;gap:8px}
.csh-add:active{filter:brightness(.92)}
.csh-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:18px 20px 8px;font-family:var(--font-b)}
.csh-list{padding:0 20px}
.csh-swipe-wrap{position:relative;border-radius:14px;overflow:hidden;margin-bottom:8px}
.csh-swipe-edit{position:absolute;right:76px;top:0;bottom:0;width:76px;background:var(--purple,#A88BFF);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}
.csh-swipe-del2{position:absolute;right:0;top:0;bottom:0;width:76px;background:var(--red);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;border-radius:0 14px 14px 0}
.csh-swipe-lbl{font-size:11px;color:#fff;font-family:var(--font-b);font-weight:600}
.csh-row{display:flex;align-items:center;gap:12px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px;position:relative;z-index:1;transition:transform .25s cubic-bezier(.22,1,.36,1);will-change:transform}
.csh-amt{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--red);flex-shrink:0;min-width:70px}
.csh-info{flex:1;min-width:0}
.csh-reason{font-size:13px;color:var(--text0);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.csh-reason.empty{color:var(--text2);font-style:italic}
.csh-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.csh-del{width:30px;height:30px;border-radius:8px;background:var(--red-bg);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.csh-del:active{filter:brightness(.85)}
.csh-empty{margin:0 20px;padding:28px 20px;text-align:center;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px}
.csh-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b)}
/* групи по джерелу (менеджер) */
.csh-grp{margin-bottom:14px}
.csh-grp-head{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 8px;gap:10px}
.csh-grp-name{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.csh-grp-total{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--amber);flex-shrink:0}
/* modal */
.csh-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.76);display:flex;align-items:flex-end;animation:cshOv .18s ease}
@keyframes cshOv{from{opacity:0}to{opacity:1}}
.csh-sheet{width:100%;background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:20px 20px 36px;animation:cshSl .26s cubic-bezier(.22,1,.36,1)}
@keyframes cshSl{from{transform:translateY(100%)}to{transform:none}}
.csh-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:14px}
.csh-lbl{font-size:10px;font-weight:500;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;margin:10px 0 6px}
.csh-inp{width:100%;box-sizing:border-box;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:16px;color:var(--text0);outline:none;font-family:var(--font-b);color-scheme:dark}
.csh-inp:focus{border-color:var(--amber)}
.csh-amt-inp{font-family:var(--font-h);font-weight:700;font-size:24px;text-align:center}
.csh-btns{display:flex;gap:8px;margin-top:18px}
.csh-btn-sec{flex:1;height:48px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:14px;font-weight:500;font-family:var(--font-b);cursor:pointer}
.csh-btn-cta{flex:2;height:48px;border-radius:12px;background:var(--amber);border:none;color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.csh-btn-cta:disabled{opacity:.4}
/* підтвердження видалення (по центру) */
.csh-confirm-ov{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.76);display:flex;align-items:center;justify-content:center;padding:24px;animation:cshOv .18s ease}
.csh-confirm{width:100%;max-width:340px;background:var(--bg1);border:0.5px solid var(--border);border-radius:20px;padding:22px 20px 18px;text-align:center;animation:cshPop .2s cubic-bezier(.22,1,.36,1)}
@keyframes cshPop{from{transform:scale(.94);opacity:.4}to{transform:none;opacity:1}}
.csh-confirm-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:6px}
.csh-confirm-sub{font-size:12.5px;color:var(--text2);font-family:var(--font-b);line-height:1.5;margin-bottom:18px}
.csh-btn-del{flex:1;height:48px;border-radius:12px;background:var(--red);border:none;color:#fff;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.csh-btn-del:active{filter:brightness(.9)}
</style>`;

/* ════════════ RENDER PARTS ════════════ */
const DEL_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function rowHTML(w) {
  return `
    <div class="csh-swipe-wrap" data-id="${w.id}">
      <div class="csh-swipe-edit" onclick="window.__cash.edit('${w.id}')">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 15l2.5-.6 8-8-1.9-1.9-8 8L3 15z" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3.5l1.9 1.9" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>
        <span class="csh-swipe-lbl">Змінити</span>
      </div>
      <div class="csh-swipe-del2" onclick="window.__cash.del('${w.id}')">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M7 5V3h4v2M7.5 8.5v5M10.5 8.5v5M4 5l1 10h8l1-10" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="csh-swipe-lbl">Видалити</span>
      </div>
      <div class="csh-row">
        <div class="csh-amt">−${fmtMoney(w.amount)}</div>
        <div class="csh-info">
          <div class="csh-reason ${w.reason ? '' : 'empty'}">${w.reason ? esc(w.reason) : 'без причини'}</div>
          <div class="csh-meta">${fmtTime(w.createdAt)}</div>
        </div>
        <div class="csh-del" onclick="window.__cash.del('${w.id}')" aria-label="Видалити">${DEL_SVG}</div>
      </div>
    </div>`;
}

// Свайп вліво по рядку → відкриває «Змінити» + «Видалити»
function initSwipe() {
  if (_swipeAdded) return;
  _swipeAdded = true;
  let sx = 0, sy = 0, active = null;
  document.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.csh-swipe-wrap');
    const card = wrap?.querySelector('.csh-row');
    if (active && active !== card) { active.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)'; active.style.transform = 'translateX(0)'; active = null; }
    if (!card) return;
    active = card; sx = e.touches[0].clientX; sy = e.touches[0].clientY; card.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!active) return;
    const dx = e.touches[0].clientX - sx;
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dy > 12 && dy > Math.abs(dx)) { active = null; return; }
    if (dx < 0) active.style.transform = `translateX(${Math.max(dx, -152)}px)`;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!active) return;
    const dx = e.changedTouches[0].clientX - sx;
    active.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)';
    active.style.transform = dx < -50 ? 'translateX(-152px)' : 'translateX(0)';
    if (dx >= -50) active = null;
  });
}

function srcKey(w) { return w.sourceId || ('n:' + (w.sourceName || '—')); }

// Менеджеру — групуємо по джерелу (від кого взяли гроші)
function groupedHTML() {
  const groups = new Map();
  for (const w of _items) {
    const key = srcKey(w);
    const g = groups.get(key) || { key, label: w.sourceName || '—', total: 0, items: [] };
    g.total += w.amount || 0; g.items.push(w);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).map(g => `
    <div class="csh-grp" data-src="${esc(g.key)}">
      <div class="csh-grp-head">
        <span class="csh-grp-name">${esc(g.label)}</span>
        <span class="csh-grp-total">−${fmtMoney(g.total)}</span>
      </div>
      ${g.items.map(rowHTML).join('')}
    </div>`).join('');
}

function bodyHTML() {
  if (_loading && !_items.length) {
    return `<div class="csh-empty"><div class="csh-empty-txt">Завантаження…</div></div>`;
  }
  const totalLbl = isMgr() ? 'Вилучено з каси сьогодні' : 'Я взяв з каси сьогодні';
  let html = `
    <div class="csh-total">
      <div class="csh-total-val">−${fmtMoney(_total)}</div>
      <div class="csh-total-lbl">${totalLbl}</div>
    </div>
    <button class="csh-add" onclick="window.__cash.openAdd()">Взяв з каси</button>`;

  if (!_items.length) {
    html += `<div class="csh-sec">Сьогодні</div>
      <div class="csh-empty"><div class="csh-empty-txt">${isMgr() ? 'Сьогодні вилучень з каси не було' : 'Ви ще нічого не брали з каси сьогодні'}</div></div>`;
    return html;
  }

  html += `<div class="csh-sec">${isMgr() ? 'Сьогодні · по кому' : 'Сьогодні'}</div>`;
  html += `<div class="csh-list">${isMgr() ? groupedHTML() : _items.map(rowHTML).join('')}</div>`;
  return html;
}

function addModalHTML() {
  if (!_addOpen) return '';
  return `
  <div class="csh-ov" onclick="window.__cash.closeAddOv(event)">
    <div class="csh-sheet" onclick="event.stopPropagation()">
      <div class="csh-sheet-title">${_editId ? 'Редагувати запис' : 'Взяв готівку з каси'}</div>
      <div class="csh-lbl">Сума, ₴</div>
      <input id="csh-amt" class="csh-inp csh-amt-inp" type="number" inputmode="decimal" step="1" min="0" placeholder="0">
      ${isMgr() ? `
      <div class="csh-lbl">Від кого (чиї гроші)</div>
      <select id="csh-source" class="csh-inp">
        <option value="cash">З вчорашньої каси</option>
        ${_waiters.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}
      </select>` : ''}
      <div class="csh-lbl">На що (коротко)</div>
      <input id="csh-reason" class="csh-inp" type="text" placeholder="Напр.: оплата доставки, дрібна закупівля…">
      <div class="csh-btns">
        <button class="csh-btn-sec" onclick="window.__cash.closeAdd()">Скасувати</button>
        <button class="csh-btn-cta" id="csh-save" onclick="window.__cash.save()">${_editId ? 'Зберегти' : 'Записати'}</button>
      </div>
    </div>
  </div>`;
}

// Підтвердження видалення в стилі додатку
function confirmHTML() {
  if (!_confirmId) return '';
  return `
  <div class="csh-confirm-ov" onclick="window.__cash.cancelDel(event)">
    <div class="csh-confirm" onclick="event.stopPropagation()">
      <div class="csh-confirm-title">Видалити запис?</div>
      <div class="csh-confirm-sub">Цю дію не можна скасувати.</div>
      <div class="csh-btns">
        <button class="csh-btn-sec" onclick="window.__cash.cancelDel()">Скасувати</button>
        <button class="csh-btn-del" onclick="window.__cash.confirmDel()">Видалити</button>
      </div>
    </div>
  </div>`;
}

// Оновити лише шар модалок (без перебудови списку → без «стрибка»)
function renderModalHost() {
  const h = document.getElementById('csh-modal-host');
  if (h) h.innerHTML = addModalHTML() + confirmHTML();
}

function rerender() {
  if (state.route !== 'cash') return;
  const b = document.getElementById('csh-body');
  if (b) b.innerHTML = bodyHTML();
  renderModalHost();
}

/* ════════════ DATA ════════════ */
// Офіціанти закладу для випадайки «від кого» (лише менеджер/адмін має доступ до /team)
async function loadWaiters() {
  if (!isMgr()) return;
  const vId = venueId();
  if (!vId) return;
  try {
    const res  = await fetch(`${API}/api/auth/team?venueId=${vId}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success && Array.isArray(data.team)) {
      _waiters = data.team
        .filter(m => (m.role || '').toLowerCase() === 'waiter')
        .map(m => ({ id: m.id, name: m.name }));
    }
  } catch { /* silent — лишиться лише «з каси» */ }
}

async function load() {
  const vId = venueId();
  if (!vId) return;
  _loading = true; rerender();
  try {
    const res  = await fetch(`${API}/api/cash/withdrawals?venueId=${vId}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) { _items = data.withdrawals || []; _total = data.total || 0; }
  } catch { /* silent */ }
  _loading = false; rerender();
}

/* ════════════ PAGE MODULE ════════════ */
export default {
  render() {
    _items = []; _total = 0; _loading = true; _addOpen = false; _saving = false; _waiters = []; _editId = null;
    return `
    ${CSS}
    <div class="csh-wrap">
      <div class="csh-header">
        <button class="csh-back" onclick="window.__barops.navigate('dashboard')" aria-label="Назад">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div>
          <div class="csh-title">Каса зміни</div>
          <div class="csh-sub">${esc(state.venue || '')} · ${todayLabel()}</div>
        </div>
      </div>
      <div class="csh-scroll"><div id="csh-body">${bodyHTML()}</div></div>
    </div>
    <div id="csh-modal-host"></div>`;
  },

  init() {
    window.__cash = {
      openAdd() { _editId = null; _addOpen = true; renderModalHost(); setTimeout(() => document.getElementById('csh-amt')?.focus(), 60); },
      closeAdd() { _addOpen = false; _editId = null; renderModalHost(); },
      closeAddOv(e) { if (e?.target?.classList?.contains('csh-ov')) { _addOpen = false; _editId = null; renderModalHost(); } },

      // Свайп → Змінити: відкриваємо модалку передзаповненою
      edit(id) {
        const w = _items.find(x => x.id === id);
        if (!w) return;
        _editId = id;
        _addOpen = true;
        renderModalHost();
        setTimeout(() => {
          const amt = document.getElementById('csh-amt'); if (amt) amt.value = w.amount;
          const rs  = document.getElementById('csh-reason'); if (rs) rs.value = w.reason || '';
          const src = document.getElementById('csh-source'); if (src) src.value = w.sourceId || 'cash';
          amt?.focus();
        }, 60);
      },

      async save() {
        if (_saving) return;
        const amount = parseFloat(document.getElementById('csh-amt')?.value);
        const reason = (document.getElementById('csh-reason')?.value || '').trim();
        if (!amount || amount <= 0) { document.getElementById('csh-amt')?.focus(); return; }
        // Джерело (лише менеджер обирає; інакше бекенд лишає як є / проставить реєстратора)
        let source = {};
        if (isMgr()) {
          const val = document.getElementById('csh-source')?.value || 'cash';
          if (val === 'cash') source = { sourceId: null, sourceName: 'Вчорашня каса' };
          else { const w = _waiters.find(x => x.id === val); source = { sourceId: val, sourceName: w ? w.name : '' }; }
        }
        _saving = true;
        const btn = document.getElementById('csh-save');
        if (btn) { btn.disabled = true; btn.textContent = _editId ? 'Збереження…' : 'Запис…'; }
        try {
          const url    = _editId ? `${API}/api/cash/withdrawals/${_editId}` : `${API}/api/cash/withdrawals`;
          const method = _editId ? 'PATCH' : 'POST';
          const body   = _editId ? { amount, reason, ...source } : { venueId: venueId(), amount, reason, ...source };
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Помилка');
          _addOpen = false; _editId = null;
          await load();
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = _editId ? 'Зберегти' : 'Записати'; }
          alert('Не вдалося зберегти: ' + e.message);
        } finally {
          _saving = false;
        }
      },

      // Видалення — через кастомне підтвердження в стилі додатку
      del(id) { _confirmId = id; renderModalHost(); },
      cancelDel(e) {
        if (e && !(e.target && e.target.classList.contains('csh-confirm-ov'))) return;
        _confirmId = null; renderModalHost();
      },
      confirmDel() {
        const id = _confirmId;
        _confirmId = null; renderModalHost();
        if (!id) return;
        // оптимістично + ТОЧКОВЕ видалення рядка (без перебудови списку → без стрибка)
        _items = _items.filter(w => w.id !== id);
        _total = _items.reduce((s, w) => s + (w.amount || 0), 0);
        const wrap   = document.querySelector(`.csh-swipe-wrap[data-id="${id}"]`);
        const grp    = wrap ? wrap.closest('.csh-grp') : null;
        const grpKey = grp ? grp.getAttribute('data-src') : null;
        if (wrap) wrap.remove();
        const tv = document.querySelector('.csh-total-val');
        if (tv) tv.textContent = '−' + fmtMoney(_total);
        if (grp && grpKey != null) {
          const remain = _items.filter(w => srcKey(w) === grpKey);
          if (!remain.length) grp.remove();
          else {
            const gt = grp.querySelector('.csh-grp-total');
            if (gt) gt.textContent = '−' + fmtMoney(remain.reduce((s, w) => s + (w.amount || 0), 0));
          }
        }
        if (!_items.length) rerender();   // показати порожній стан
        fetch(`${API}/api/cash/withdrawals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }).catch(() => {});
      },
    };
    initSwipe();
    loadWaiters();
    load();
  },
};
