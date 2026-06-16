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
.csh-row{display:flex;align-items:center;gap:12px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px}
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
</style>`;

/* ════════════ RENDER PARTS ════════════ */
const DEL_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function rowHTML(w) {
  return `
    <div class="csh-row">
      <div class="csh-amt">−${fmtMoney(w.amount)}</div>
      <div class="csh-info">
        <div class="csh-reason ${w.reason ? '' : 'empty'}">${w.reason ? esc(w.reason) : 'без причини'}</div>
        <div class="csh-meta">${fmtTime(w.createdAt)}</div>
      </div>
      <div class="csh-del" onclick="window.__cash.del('${w.id}')" aria-label="Видалити">${DEL_SVG}</div>
    </div>`;
}

// Менеджеру — групуємо по джерелу (від кого взяли гроші)
function groupedHTML() {
  const groups = new Map();
  for (const w of _items) {
    const key = w.sourceId || ('n:' + (w.sourceName || '—'));
    const g = groups.get(key) || { label: w.sourceName || '—', total: 0, items: [] };
    g.total += w.amount || 0; g.items.push(w);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total).map(g => `
    <div class="csh-grp">
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
    <button class="csh-add" onclick="window.__cash.openAdd()">− Взяв з каси</button>`;

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
      <div class="csh-sheet-title">Взяв готівку з каси</div>
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
        <button class="csh-btn-cta" id="csh-save" onclick="window.__cash.save()">Записати</button>
      </div>
    </div>
  </div>`;
}

function rerender() {
  if (state.route !== 'cash') return;
  const b = document.getElementById('csh-body');
  if (b) b.innerHTML = bodyHTML();
  const h = document.getElementById('csh-modal-host');
  if (h) h.innerHTML = addModalHTML();
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
    _items = []; _total = 0; _loading = true; _addOpen = false; _saving = false; _waiters = [];
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
      openAdd() { _addOpen = true; rerender(); setTimeout(() => document.getElementById('csh-amt')?.focus(), 60); },
      closeAdd() { _addOpen = false; rerender(); },
      closeAddOv(e) { if (e?.target?.classList?.contains('csh-ov')) { _addOpen = false; rerender(); } },

      async save() {
        if (_saving) return;
        const amount = parseFloat(document.getElementById('csh-amt')?.value);
        const reason = (document.getElementById('csh-reason')?.value || '').trim();
        if (!amount || amount <= 0) { document.getElementById('csh-amt')?.focus(); return; }
        // Джерело (лише менеджер обирає; інакше бекенд проставить самого реєстратора)
        let source = {};
        if (isMgr()) {
          const val = document.getElementById('csh-source')?.value || 'cash';
          if (val === 'cash') source = { sourceId: null, sourceName: 'Вчорашня каса' };
          else { const w = _waiters.find(x => x.id === val); source = { sourceId: val, sourceName: w ? w.name : '' }; }
        }
        _saving = true;
        const btn = document.getElementById('csh-save');
        if (btn) { btn.disabled = true; btn.textContent = 'Запис…'; }
        try {
          const res = await fetch(`${API}/api/cash/withdrawals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ venueId: venueId(), amount, reason, ...source }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Помилка');
          _addOpen = false;
          await load();
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Записати'; }
          alert('Не вдалося записати: ' + e.message);
        } finally {
          _saving = false;
        }
      },

      async del(id) {
        if (!confirm('Видалити цей запис?')) return;
        _items = _items.filter(w => w.id !== id);
        _total = _items.reduce((s, w) => s + (w.amount || 0), 0);
        rerender();
        try {
          await fetch(`${API}/api/cash/withdrawals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        } catch { /* silent */ }
        load();
      },
    };
    loadWaiters();
    load();
  },
};
