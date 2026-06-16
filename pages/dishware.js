/* ============================================================
   BarOps — pages/dishware.js
   Інвентаризація посуду.
   - Офіціант: рахує наосліп (без залишку), бачить фото (як виглядає).
   - Менеджер: довідник (з Syrve Office), залишок Syrve, назва + фото.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _items     = [];
let _loading   = true;
let _saving    = false;
let _balance   = new Map();   // syrveProductId → { amount, unit } (лише менеджер)
let _balProds  = [];          // товари Syrve для пікера (менеджер)
let _balLoaded = false;
let _photoView = null;        // { id, url } фото у фуллскрін
let _editId    = null;        // картка редагування (менеджер)
let _editPhoto = undefined;   // нове фото (base64) у редагуванні; undefined = не міняли
let _pickerOpen = false;
let _pickerSearch = '';

const isMgr = () => ['admin', 'manager', 'director'].includes((state.role || '').toLowerCase());
function token() { return localStorage.getItem('barops_token') || state.token || ''; }
function venueId() { return state.venueId || localStorage.getItem('barops_venueId') || ''; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function num(n) { const r = Math.round((+n || 0) * 100) / 100; return r.toLocaleString('uk-UA'); }
function initials(name) { const p = String(name || '').trim().split(/\s+/); return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '🍽'; }

const CSS = `<style id="dw-css">
.dw-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.dw-scroll{overflow-y:auto;flex:1;padding-bottom:120px}.dw-scroll::-webkit-scrollbar{width:0}
.dw-header{padding:12px 20px 4px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.dw-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dw-back:active{background:var(--bg3)}
.dw-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.dw-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.dw-note{margin:10px 20px 0;font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.dw-add{margin:12px 20px 0;height:46px;border-radius:14px;border:0.5px dashed var(--purple);background:rgba(168,139,255,.08);color:var(--purple);font-size:14px;font-weight:600;font-family:var(--font-h);cursor:pointer;width:calc(100% - 40px)}
.dw-add:active{filter:brightness(.92)}
.dw-list{padding:10px 16px 0}
.dw-card{display:flex;align-items:center;gap:12px;background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:10px 12px;margin-bottom:8px}
.dw-thumb{width:46px;height:46px;border-radius:10px;flex-shrink:0;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-weight:700;font-size:13px;color:var(--text2);cursor:pointer;overflow:hidden;border:0.5px solid var(--border)}
.dw-thumb img{width:100%;height:100%;object-fit:cover}
.dw-info{flex:1;min-width:0}
.dw-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dw-syrve{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dw-bal{font-size:11px;color:var(--blue);font-family:var(--font-b);margin-top:2px}
.dw-cnt{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.dw-qty{width:74px;flex-shrink:0;height:44px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;text-align:center;font-family:var(--font-h);font-weight:700;font-size:18px;color:var(--text0);outline:none;color-scheme:dark}
.dw-qty:focus{border-color:var(--purple)}
.dw-mbtn{width:32px;height:32px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--text1)}
.dw-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.dw-savebar{position:absolute;left:0;right:0;bottom:0;padding:12px 20px 28px;background:linear-gradient(transparent,var(--bg) 26%);display:flex}
.dw-save{flex:1;height:50px;border-radius:14px;border:none;background:var(--purple);color:#fff;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.dw-save:disabled{opacity:.5}
.dw-empty{margin:24px 20px;padding:28px 20px;text-align:center;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px}
.dw-empty-txt{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.dw-spin{width:22px;height:22px;border-radius:50%;border:2px solid var(--border);border-top-color:var(--purple);animation:dwSpin .7s linear infinite;margin:48px auto}
@keyframes dwSpin{to{transform:rotate(360deg)}}
/* overlays */
.dw-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;animation:dwOv .18s ease}
@keyframes dwOv{from{opacity:0}to{opacity:1}}
.dw-sheet{width:100%;background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:18px 20px 34px;max-height:84vh;display:flex;flex-direction:column;animation:dwSl .26s cubic-bezier(.22,1,.36,1)}
@keyframes dwSl{from{transform:translateY(100%)}to{transform:none}}
.dw-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:12px}
.dw-lbl{font-size:10px;font-weight:500;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;margin:10px 0 6px}
.dw-inp{width:100%;box-sizing:border-box;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:16px;color:var(--text0);outline:none;font-family:var(--font-b);color-scheme:dark}
.dw-inp:focus{border-color:var(--purple)}
.dw-photo-box{margin-top:6px;border:0.5px dashed var(--border2);border-radius:12px;min-height:120px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg2);position:relative}
.dw-photo-box img{width:100%;max-height:240px;object-fit:contain}
.dw-photo-hint{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.dw-file{position:absolute;inset:0;opacity:0;cursor:pointer}
.dw-btns{display:flex;gap:8px;margin-top:16px}
.dw-btn-sec{flex:1;height:48px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:14px;font-weight:500;font-family:var(--font-b);cursor:pointer}
.dw-btn-cta{flex:2;height:48px;border-radius:12px;background:var(--purple);border:none;color:#fff;font-size:15px;font-weight:600;font-family:var(--font-h);cursor:pointer}
.dw-btn-del{height:48px;padding:0 16px;border-radius:12px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:14px;font-weight:600;font-family:var(--font-b);cursor:pointer}
/* picker */
.dw-pk-search{width:100%;box-sizing:border-box;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 14px;font-size:16px;color:var(--text0);outline:none;font-family:var(--font-b);color-scheme:dark;margin-bottom:8px}
.dw-pk-list{overflow-y:auto;flex:1}.dw-pk-list::-webkit-scrollbar{width:0}
.dw-pk-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 12px;border-radius:10px;cursor:pointer;border-bottom:0.5px solid var(--border)}
.dw-pk-item:active{background:var(--bg2)}
.dw-pk-name{font-size:14px;color:var(--text0);font-family:var(--font-b);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dw-pk-bal{font-size:12px;color:var(--text2);font-family:var(--font-b);flex-shrink:0}
/* photo fullscreen */
.dw-pv{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px;animation:dwOv .18s ease}
.dw-pv img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}
.dw-pv-empty{color:var(--text2);font-family:var(--font-b);font-size:14px}
</style>`;

/* ════════════ RENDER ════════════ */
const EDIT_SVG = `<svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M3 15l2.5-.6 8-8-1.9-1.9-8 8L3 15z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 3.5l1.9 1.9" stroke="currentColor" stroke-width="1.4"/></svg>`;
const PHOTO_SVG = `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="9" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.3"/><path d="M6 4l1-1.5h4L12 4" stroke="currentColor" stroke-width="1.3"/></svg>`;

function thumbHTML(it) {
  return `<div class="dw-thumb" onclick="window.__dw.viewPhoto('${it.id}')">${it.hasPhoto
    ? `<img id="dwthumb-${it.id}" alt="">`
    : initials(it.name)}</div>`;
}

function itemCardMgr(it) {
  const bal = _balance.get(it.syrveProductId);
  const balTxt = !_balLoaded ? 'залишок Syrve: …'
    : bal ? `залишок Syrve: ${num(bal.amount)}${bal.unit ? ' ' + bal.unit : ''}`
    : 'залишок Syrve: —';
  return `
  <div class="dw-card">
    ${thumbHTML(it)}
    <div class="dw-info">
      <div class="dw-name">${esc(it.name)}</div>
      ${it.syrveName && it.syrveName !== it.name ? `<div class="dw-syrve">у Syrve: ${esc(it.syrveName)}</div>` : ''}
      <div class="dw-bal">${balTxt}</div>
      ${it.count ? `<div class="dw-cnt">порахував: ${num(it.count.qty)} · ${esc(it.count.by || '—')}</div>` : ''}
    </div>
    <div class="dw-actions">
      <div class="dw-mbtn" onclick="window.__dw.openEdit('${it.id}')">${EDIT_SVG}</div>
    </div>
  </div>`;
}

function itemCardWaiter(it) {
  return `
  <div class="dw-card">
    ${thumbHTML(it)}
    <div class="dw-info">
      <div class="dw-name">${esc(it.name)}</div>
    </div>
    <input class="dw-qty" id="dwq-${it.id}" data-id="${it.id}" type="number" inputmode="decimal" step="1" min="0" placeholder="0">
  </div>`;
}

function bodyHTML() {
  if (_loading) return `<div class="dw-spin"></div>`;
  const mgr = isMgr();
  let html = '';
  if (mgr) html += `<button class="dw-add" onclick="window.__dw.openPicker()">+ Додати посуд</button>`;
  else html += `<div class="dw-note">Порахуйте кожну позицію та збережіть. Фото — як виглядає посуд.</div>`;

  if (!_items.length) {
    html += `<div class="dw-empty"><div class="dw-empty-txt">${mgr ? 'Ще немає позицій. Додайте посуд із Syrve.' : 'Менеджер ще не додав позиції посуду.'}</div></div>`;
    return html;
  }
  html += `<div class="dw-list">${_items.map(mgr ? itemCardMgr : itemCardWaiter).join('')}</div>`;
  return html;
}

function rerender() {
  if (state.route !== 'dishware') return;
  const b = document.getElementById('dw-body');
  if (b) b.innerHTML = bodyHTML();
  renderModals();
  loadThumbs();
}

function renderModals() {
  const h = document.getElementById('dw-modal-host');
  if (h) h.innerHTML = pickerHTML() + editHTML() + photoViewHTML();
}

// Підвантажити мініатюри фото (окремими запитами, як в акцизі)
function loadThumbs() {
  for (const it of _items) {
    if (!it.hasPhoto) continue;
    const img = document.getElementById(`dwthumb-${it.id}`);
    if (!img || img.dataset.loaded) continue;
    img.dataset.loaded = '1';
    fetch(`${API}/api/dishware/items/${it.id}/photo`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success && d.photoUrl) img.src = d.photoUrl; }).catch(() => {});
  }
}

/* ── overlays ── */
function pickerHTML() {
  if (!_pickerOpen) return '';
  return `
  <div class="dw-ov" onclick="window.__dw.closePicker(event)">
    <div class="dw-sheet" onclick="event.stopPropagation()" style="height:80vh">
      <div class="dw-sheet-title">Додати посуд зі складу «Посуд»</div>
      <input class="dw-pk-search" id="dw-pk-search" placeholder="Пошук: тарілка, келих…" value="${esc(_pickerSearch)}" oninput="window.__dw.pickerSearch(this.value)">
      <div class="dw-pk-list">${pickerListInner()}</div>
    </div>
  </div>`;
}

function editHTML() {
  if (!_editId) return '';
  const it = _items.find(x => x.id === _editId);
  if (!it) return '';
  const previewUrl = _editPhoto !== undefined ? _editPhoto : (it.hasPhoto ? `__existing__` : '');
  return `
  <div class="dw-ov" onclick="window.__dw.closeEdit(event)">
    <div class="dw-sheet" onclick="event.stopPropagation()">
      <div class="dw-sheet-title">Редагувати посуд</div>
      <div class="dw-lbl">Назва (як у закупці)</div>
      <input class="dw-inp" id="dw-edit-name" value="${esc(it.customName || it.syrveName)}" placeholder="Назва посуду">
      ${it.syrveName ? `<div class="dw-syrve" style="margin-top:6px">у Syrve: ${esc(it.syrveName)}</div>` : ''}
      <div class="dw-lbl">Фото</div>
      <div class="dw-photo-box" id="dw-photo-box">
        ${previewUrl === '__existing__'
          ? `<img id="dw-edit-img" alt="">`
          : previewUrl ? `<img src="${previewUrl}" alt="">`
          : `<span class="dw-photo-hint">Натисніть, щоб додати фото</span>`}
        <input class="dw-file" type="file" accept="image/*" onchange="window.__dw.onPhoto(this)">
      </div>
      <div class="dw-btns">
        <button class="dw-btn-del" onclick="window.__dw.del('${it.id}')">Видалити</button>
        <button class="dw-btn-cta" id="dw-edit-save" onclick="window.__dw.saveEdit()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

function photoViewHTML() {
  if (!_photoView) return '';
  return `
  <div class="dw-pv" onclick="window.__dw.closePhoto()">
    ${_photoView.url ? `<img src="${_photoView.url}" alt="">` : `<div class="dw-pv-empty">Фото завантажується…</div>`}
  </div>`;
}

/* ════════════ DATA ════════════ */
async function loadItems() {
  const vId = venueId();
  if (!vId) { _loading = false; rerender(); return; }
  try {
    const r = await fetch(`${API}/api/dishware/items?venueId=${vId}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) _items = d.items || [];
  } catch { /* silent */ }
  _loading = false; rerender();
}

// Залишок Syrve + товари для пікера — лише зі складу «Посуд» (той самий заклад, окремий склад)
async function loadBalance() {
  if (!isMgr()) return;
  const vId = venueId();
  if (!vId) return;
  try {
    const r = await fetch(`${API}/api/pos/balance/${vId}?allStores=1`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    const dishStore = (d.stores || []).find(s => /посуд/i.test(s.storeName || ''));
    const items = dishStore ? (dishStore.items || []) : [];
    const map = new Map(); const prods = [];
    for (const it of items) {
      if (!it.name || /^[0-9a-f-]{36}$/i.test(it.name)) continue;
      map.set(it.id, { amount: it.amount ?? 0, unit: it.unit || '' });
      if (!prods.find(p => p.id === it.id)) prods.push({ id: it.id, name: it.name, amount: it.amount ?? 0, unit: it.unit || '' });
    }
    _balance = map; _balProds = prods.sort((a, b) => a.name.localeCompare(b.name));
  } catch { /* silent */ }
  _balLoaded = true; rerender();
}

/* ════════════ MODULE ════════════ */
export default {
  render() {
    _items = []; _loading = true; _saving = false; _balance = new Map(); _balProds = []; _balLoaded = false;
    _photoView = null; _editId = null; _editPhoto = undefined; _pickerOpen = false; _pickerSearch = '';
    return `
    ${CSS}
    <div class="dw-wrap">
      <div class="dw-header">
        <button class="dw-back" onclick="window.__barops.navigate('dashboard')" aria-label="Назад">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div>
          <div class="dw-title">Інвентаризація посуд</div>
          <div class="dw-sub">${esc(state.venue || '')}</div>
        </div>
      </div>
      <div class="dw-scroll"><div id="dw-body">${bodyHTML()}</div></div>
      ${isMgr() ? '' : `<div class="dw-savebar"><button class="dw-save" id="dw-save" onclick="window.__dw.saveCounts()">Зберегти інвентаризацію</button></div>`}
    </div>
    <div id="dw-modal-host"></div>`;
  },

  init() {
    window.__dw = {
      /* фото фуллскрін */
      async viewPhoto(id) {
        const it = _items.find(x => x.id === id);
        if (!it || !it.hasPhoto) return;
        _photoView = { id, url: '' }; renderModals();
        try {
          const r = await fetch(`${API}/api/dishware/items/${id}/photo`, { headers: { Authorization: `Bearer ${token()}` } });
          const d = await r.json();
          if (_photoView && _photoView.id === id) { _photoView.url = d.photoUrl || ''; renderModals(); }
        } catch { if (_photoView) { _photoView.url = ''; renderModals(); } }
      },
      closePhoto() { _photoView = null; renderModals(); },

      /* офіціант: зберегти підрахунок */
      async saveCounts() {
        if (_saving) return;
        const counts = [];
        document.querySelectorAll('.dw-qty').forEach(inp => {
          const v = inp.value.trim();
          if (v !== '' && !isNaN(parseFloat(v))) counts.push({ itemId: inp.dataset.id, qty: parseFloat(v) });
        });
        if (!counts.length) { alert('Введіть хоча б одну кількість'); return; }
        _saving = true;
        const btn = document.getElementById('dw-save');
        if (btn) { btn.disabled = true; btn.textContent = 'Збереження…'; }
        try {
          const r = await fetch(`${API}/api/dishware/counts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ venueId: venueId(), counts }),
          });
          const d = await r.json();
          if (!d.success) throw new Error(d.error || 'Помилка');
          if (btn) { btn.textContent = '✓ Збережено'; }
          await loadItems();
          const b2 = document.getElementById('dw-save'); if (b2) { b2.disabled = false; b2.textContent = 'Зберегти інвентаризацію'; }
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Зберегти інвентаризацію'; }
          alert('Не вдалося зберегти: ' + e.message);
        } finally { _saving = false; }
      },

      /* менеджер: пікер додавання */
      openPicker() { _pickerOpen = true; _pickerSearch = ''; renderModals(); if (!_balLoaded) loadBalance(); setTimeout(() => document.getElementById('dw-pk-search')?.focus(), 80); },
      closePicker(e) { if (e && !e.target.classList.contains('dw-ov')) return; _pickerOpen = false; renderModals(); },
      pickerSearch(v) { _pickerSearch = v; const l = document.querySelector('.dw-pk-list'); if (l) l.innerHTML = pickerListInner(); },
      async addItem(productId, name) {
        _pickerOpen = false; renderModals();
        try {
          const r = await fetch(`${API}/api/dishware/items`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ venueId: venueId(), syrveProductId: productId, syrveName: name }),
          });
          const d = await r.json();
          if (!d.success) throw new Error(d.error || 'Помилка');
          await loadItems();
        } catch (e) { alert('Не вдалося додати: ' + e.message); }
      },

      /* менеджер: редагування (назва + фото) */
      openEdit(id) { _editId = id; _editPhoto = undefined; renderModals(); loadEditImg(id); },
      closeEdit(e) { if (e && !e.target.classList.contains('dw-ov')) return; _editId = null; _editPhoto = undefined; renderModals(); },
      onPhoto(input) {
        const f = input.files && input.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => { _editPhoto = String(reader.result || ''); renderModals(); };
        reader.readAsDataURL(f);
      },
      async saveEdit() {
        const it = _items.find(x => x.id === _editId);
        if (!it) return;
        const customName = (document.getElementById('dw-edit-name')?.value || '').trim();
        const body = { customName };
        if (_editPhoto !== undefined) body.photoData = _editPhoto;
        const btn = document.getElementById('dw-edit-save');
        if (btn) { btn.disabled = true; btn.textContent = 'Збереження…'; }
        try {
          const r = await fetch(`${API}/api/dishware/items/${it.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify(body),
          });
          const d = await r.json();
          if (!d.success) throw new Error(d.error || 'Помилка');
          _editId = null; _editPhoto = undefined;
          await loadItems();
        } catch (e) {
          if (btn) { btn.disabled = false; btn.textContent = 'Зберегти'; }
          alert('Не вдалося зберегти: ' + e.message);
        }
      },
      async del(id) {
        if (!confirm('Видалити цю позицію посуду?')) return;
        _editId = null; renderModals();
        _items = _items.filter(x => x.id !== id); rerender();
        try { await fetch(`${API}/api/dishware/items/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); } catch {}
        loadItems();
      },
    };
    loadItems();
    if (isMgr()) loadBalance();
  },
};

// helper для часткового оновлення списку пікера (без перебудови модалки)
function pickerListInner() {
  if (!_balLoaded) return `<div class="dw-spin"></div>`;
  const q = _pickerSearch.trim().toLowerCase();
  const list = (q ? _balProds.filter(p => p.name.toLowerCase().includes(q)) : _balProds).slice(0, 80);
  if (!list.length) return `<div class="dw-empty"><div class="dw-empty-txt">${_balProds.length ? 'Нічого не знайдено' : 'Склад «Посуд» не знайдено або порожній'}</div></div>`;
  return list.map(p => `
    <div class="dw-pk-item" onclick="window.__dw.addItem('${p.id}', '${esc(p.name).replace(/'/g,"\\'")}')">
      <span class="dw-pk-name">${esc(p.name)}</span>
      <span class="dw-pk-bal">${num(p.amount)}${p.unit ? ' ' + p.unit : ''}</span>
    </div>`).join('');
}

// підвантажити фото в картку редагування (існуюче)
function loadEditImg(id) {
  setTimeout(async () => {
    const img = document.getElementById('dw-edit-img');
    if (!img) return;
    try {
      const r = await fetch(`${API}/api/dishware/items/${id}/photo`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success && d.photoUrl && document.getElementById('dw-edit-img')) document.getElementById('dw-edit-img').src = d.photoUrl;
    } catch {}
  }, 60);
}
