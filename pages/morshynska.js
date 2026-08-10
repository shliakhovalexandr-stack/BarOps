/* ============================================================
   BarOps — pages/morshynska.js
   Замовлення води ЄМоршинська. Бармен набирає заявку з каталогу →
   менеджер оформлює її прямо в ЄМоршинська через їхній API (не копіює).
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(n) { return (Math.round((n || 0) * 100) / 100).toLocaleString('uk-UA'); }
const isMgr = () => ['admin', 'manager', 'director'].includes((state.role || '').toLowerCase());

let _tab      = 'catalog';   // 'catalog' | 'requests'
let _catalog  = null;        // { outlet, products:[{id,name,price,unit,image}] }
let _requests = null;        // [{id,status,items,sum,note,createdByName,createdAt,submittedBy,morsh}]
let _qty      = {};          // productId → упаковок
let _search   = '';
let _note     = '';
let _loading  = false;
let _busy     = '';          // id заявки, що оформлюється
let _error    = '';
let _assort   = null;        // [{id,name,price,hidden}] — для адмін-налаштування асортименту
let _hidDirty = false;
let _saving   = false;
// вкладка «Акаунт»
let _account   = null;       // { connected, login, base }
let _accLogin  = '';
let _accPass   = '';
let _accBase   = 'https://e.morshynska.com';
let _accResult = null;       // { outlets, productsCount, withPrice } після успішного тесту
let _accBusy   = false;
let _accErr    = '';
let _dryResult = null;       // результат «перевірки без замовлення»
let _dryBusy   = false;
let _accEdit   = false;      // показати поля логіна/пароля (коли акаунт уже підключений — сховані)
// адреса доставки ЦЬОГО закладу (=торгова точка Моршинської; від неї залежать ціни та юр.особа)
let _vOutlets  = [];
let _vSel      = null;
let _vBusy     = false;
let _vErr      = '';

const isAdmin = () => (state.role || '').toLowerCase() === 'admin';

function venueId() { return state.venueId || localStorage.getItem('barops_venueId'); }
function token()   { return localStorage.getItem('barops_token'); }

async function loadCatalog() {
  _loading = true; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/catalog`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) { _catalog = d; _error = ''; } else _error = d.error || 'Не вдалося завантажити каталог';
  } catch (e) { _error = e.message; }
  _loading = false; rerender();
}

async function loadRequests() {
  try {
    const r = await fetch(`${API}/api/morshynska/requests?venueId=${venueId()}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) _requests = d.data;
  } catch {}
  rerender();
}

async function submitRequest() {
  const items = (_catalog?.products || []).filter(p => (_qty[p.id] || 0) > 0)
    .map(p => ({ productId: p.id, name: p.name, price: p.price, unit: p.unit, qty: _qty[p.id] }));
  if (!items.length) return;
  _loading = true; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/requests`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: venueId(), items, note: _note }),
    });
    const d = await r.json();
    if (d.success) { _qty = {}; _note = ''; _tab = 'requests'; await loadRequests(); }
    else _error = d.error || 'Помилка';
  } catch (e) { _error = e.message; }
  _loading = false; rerender();
}

async function sendToMorsh(id) {
  _busy = id; _error = ''; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/requests/${id}/submit`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    const d = await r.json();
    if (!d.success) _error = d.error || 'Не вдалося оформити';
  } catch (e) { _error = e.message; }
  _busy = ''; await loadRequests();
}

async function cancelReq(id) {
  try { await fetch(`${API}/api/morshynska/requests/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: venueId() }) }); } catch {}
  await loadRequests();
}

async function loadAssort() {
  try {
    const r = await fetch(`${API}/api/morshynska/catalog?all=1`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) { _assort = d.products; _hidDirty = false; }
  } catch (e) { _error = e.message; }
  rerender();
}

async function saveHidden() {
  _saving = true; rerender();
  const hiddenIds = (_assort || []).filter(p => p.hidden).map(p => String(p.id));
  try {
    const r = await fetch(`${API}/api/morshynska/hidden`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: venueId(), hiddenIds }) });
    const d = await r.json();
    if (d.success) { _hidDirty = false; _catalog = null; } else _error = d.error || 'Не збережено';
  } catch (e) { _error = e.message; }
  _saving = false; rerender();
}

function assortListHTML() {
  const q = _search.trim().toLowerCase();
  const prods = _assort
    .filter(p => !q || (p.name || '').toLowerCase().includes(q))
    .slice()
    .sort((a, b) => (a.hidden === b.hidden) ? 0 : (a.hidden ? 1 : -1));   // приховані — вниз, відкриті — вгорі
  return prods.map(p => `<div class="mo-row">
    <div style="flex:1;min-width:0"><div class="mo-name"${p.hidden ? ' style="opacity:.45"' : ''}>${esc(p.name)}</div><div class="mo-sub">${p.price != null ? money(p.price) + ' грн' : ''}</div></div>
    <button class="mo-hide ${p.hidden ? 'off' : 'on'}" onclick="window.__morsh.toggle('${p.id}')">${p.hidden ? 'Приховано' : 'Показ'}</button>
  </div>`).join('') || '<div class="mo-msg">Нічого не знайдено</div>';
}
async function loadAccount() {
  try {
    const r = await fetch(`${API}/api/morshynska/account`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) { _account = d; if (d.login && !_accLogin) _accLogin = d.login; if (d.base) _accBase = d.base; }
  } catch {}
  rerender();
}
async function saveAccount() {
  if (!_accLogin || (!_accPass && !(_account && _account.connected))) { _accErr = 'Введи логін і пароль'; rerender(); return; }
  _accBusy = true; _accErr = ''; _accResult = null; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/account`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: venueId(), login: _accLogin, password: _accPass || undefined, base: _accBase }) });
    const d = await r.json();
    if (d.success) { _accResult = d; _accPass = ''; _catalog = null; await loadAccount(); }
    else _accErr = d.error || 'Не вдалось підключитись';
  } catch (e) { _accErr = e.message; }
  _accBusy = false; rerender();
}
// Адреса доставки закладу. Список адрес — з акаунта Моршинської, привʼязка — на заклад.
async function loadVenueOutlet() {
  try {
    const r = await fetch(`${API}/api/morshynska/venue-outlet?venueId=${venueId()}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await r.json();
    if (d.success) { _vOutlets = d.outlets || []; _vSel = d.selected || null; }
  } catch {}
  rerender();
}

async function pickVenueOutlet(olId) {
  const o = _vOutlets.find(x => String(x.id) === String(olId));
  if (!o || _vBusy) return;
  _vBusy = true; _vErr = ''; _dryResult = null; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/venue-outlet`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: venueId(), olId: o.id, name: o.name, address: o.address }),
    });
    const d = await r.json();
    if (!r.ok || !d.success) throw new Error(d.error || 'Не вдалось зберегти');
    _vSel = d.selected || null;
    _catalog = null;   // ціни контрактні для точки — каталог перечитати
  } catch (e) { _vErr = e.message; }
  _vBusy = false; rerender();
}
async function dryRun() {
  _dryBusy = true; _dryResult = null; rerender();
  try {
    const r = await fetch(`${API}/api/morshynska/dry-run`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: '{}' });
    _dryResult = await r.json();
  } catch (e) { _dryResult = { error: e.message }; }
  _dryBusy = false; rerender();
}
function accountHTML() {
  const a = _account, connected = a && a.connected, admin = isAdmin();

  // 1. Адреса доставки цього закладу — вона ж визначає ціни й юр.особу
  const addrHTML = `
    <div class="mo-lbl">Адреса доставки · ${esc(state.venue || 'цей заклад')}</div>
    <div class="mo-hint" style="margin-bottom:8px">Заявки цього закладу поїдуть на цю адресу. Від неї ж залежать ціни в каталозі та юр.особа в рахунку.</div>
    ${_vOutlets.length ? _vOutlets.map(o => {
      const sel = _vSel && String(_vSel.olId) === String(o.id);
      return `<div class="mo-row${sel ? ' mo-row-on' : ''}" style="cursor:pointer" onclick="window.__morsh.pickOutlet('${esc(String(o.id))}')">
        <div style="flex:1;min-width:0">
          <div class="mo-name">${esc(o.address || o.name)}</div>
          <div class="mo-sub">${esc(o.name)}${o.custName ? ' · ' + esc(o.custName) : ''}</div>
        </div>
        <div style="flex-shrink:0;font-size:12px;font-weight:700;color:${sel ? 'var(--green)' : 'var(--text3)'}">${sel ? '✓ обрано' : 'обрати'}</div>
      </div>`;
    }).join('') : `<div class="mo-msg">${connected === false ? 'Спершу підключи акаунт' : 'Адрес не знайдено'}</div>`}
    ${_vBusy ? `<div class="mo-sub" style="margin-top:8px">Збереження…</div>` : ''}
    ${_vErr ? `<div class="mo-banner" style="margin:10px 0 0">${esc(_vErr)}</div>` : ''}
    ${_vSel ? `<div class="mo-acc-res">
      <div class="mo-sub">🧾 Юр.особа: <b>${esc(_vSel.legalPerson ? _vSel.legalPerson.name : '—')}</b></div>
      ${_vSel.legalPersonCount > 1 ? `<div class="mo-sub" style="margin-top:3px;color:var(--amber)">У цієї адреси ${_vSel.legalPersonCount} юр.осіб — рахунок піде на першу</div>` : ''}
    </div>` : ''}`;

  // 2. Акаунт: коли підключений — показуємо, а не питаємо заново
  const credsHTML = !admin ? '' : `
    <div class="mo-lbl" style="margin-top:20px">Акаунт ЄМоршинська</div>
    ${connected && !_accEdit ? `
      <div class="mo-acc-ok">✓ Підключено: <b>${esc(a.login)}</b>
        <div class="mo-sub" style="margin-top:3px">Пароль: ${a.hasPassword ? '•••••••• збережено' : 'не збережено'}</div>
        <div class="mo-sub">${esc(a.base)}</div>
      </div>
      <div class="mo-hint" style="margin-bottom:10px">Пароль зберігається лише на сервері і в браузер не повертається — показати його не можемо, лише замінити.</div>
      <button class="mo-submit" style="background:var(--bg3);color:var(--text0)" onclick="window.__morsh.accEdit(1)">Змінити логін або пароль</button>
    ` : `
      ${connected ? '' : `<div class="mo-hint">Введи акаунт ЄМоршинська. Пароль зберігається лише на сервері.</div>`}
      <div class="mo-lbl" style="margin-top:10px">Логін (телефон)</div>
      <input class="mo-search" style="margin-bottom:10px" placeholder="+380..." value="${esc(_accLogin)}" oninput="window.__morsh.accField('login',this.value)">
      <div class="mo-lbl">Пароль</div>
      <input class="mo-search" style="margin-bottom:10px" type="password" placeholder="${connected ? 'залиш порожнім щоб не міняти' : 'пароль'}" value="${esc(_accPass)}" oninput="window.__morsh.accField('pass',this.value)">
      ${_accErr ? `<div class="mo-banner" style="margin:10px 0 0">${esc(_accErr)}</div>` : ''}
      ${_accResult ? `<div class="mo-acc-res">
        <div style="color:var(--green);font-weight:700;margin-bottom:6px">✓ Підключення успішне</div>
        <div class="mo-sub">Каталог: <b>${_accResult.productsCount}</b> товарів (${_accResult.withPrice} з цінами)</div>
        <div class="mo-sub" style="margin:8px 0 4px">Адрес у акаунті: <b>${(_accResult.outlets || []).length}</b></div>
      </div>` : ''}
      <button class="mo-submit" style="margin-top:8px" onclick="window.__morsh.saveAccount()" ${_accBusy ? 'disabled' : ''}>${_accBusy ? 'Підключення…' : 'Підключитись і зберегти'}</button>
      ${connected ? `<button class="mo-submit" style="margin-top:8px;background:var(--bg3);color:var(--text0)" onclick="window.__morsh.accEdit(0)">Скасувати</button>` : ''}
    `}`;

  // 3. Перевірка без замовлення (admin)
  const dryHTML = !admin || !_vSel ? '' : `
    <button class="mo-submit" style="margin-top:16px;background:var(--bg3);color:var(--text0)" onclick="window.__morsh.dryRun()" ${_dryBusy ? 'disabled' : ''}>${_dryBusy ? 'Перевірка…' : '🧪 Перевірити без замовлення'}</button>
    ${_dryResult ? `<div class="mo-acc-res">${(_dryResult.error || !_dryResult.outlet)
      ? `<div style="color:var(--red)">❌ ${esc(_dryResult.error || 'не вдалось визначити точку')}</div>`
      : `<div style="color:var(--green);font-weight:700">✓ Перевірка ОК — замовлення піде на:</div>
         <div class="mo-sub" style="margin-top:4px"><b>${esc(_dryResult.outlet.name || '?')}</b>${_dryResult.outlet.custName ? ' · ' + esc(_dryResult.outlet.custName) : ''}</div>
         ${_dryResult.minError ? `<div class="mo-sub" style="color:var(--amber);margin-top:4px">ℹ ${esc([].concat(_dryResult.minError).join(' · '))}</div>` : ''}`}</div>` : ''}`;

  return `<div style="padding:2px 2px 0">${addrHTML}${credsHTML}${dryHTML}</div>`;
}
function assortHTML() {
  if (!_assort) return `<div class="mo-msg">Завантаження асортименту…</div>`;
  const hiddenN = _assort.filter(p => p.hidden).length;
  return `<div class="mo-searchwrap"><input class="mo-search" placeholder="Пошук товару…" value="${esc(_search)}" oninput="window.__morsh.search(this.value)"/></div>
    <div class="mo-hint">Приховані товари бармен не бачить у заявці. Зараз сховано: <b>${hiddenN}</b>.</div>
    <div class="mo-list" id="mo-listhost">${assortListHTML()}</div>
    ${_hidDirty ? `<div class="mo-foot"><button class="mo-submit" onclick="window.__morsh.saveHidden()" ${_saving ? 'disabled' : ''}>${_saving ? 'Збереження…' : 'Зберегти асортимент'}</button></div>` : ''}`;
}

const STATUS = {
  pending:   { t: 'очікує',     cls: 'mo-st-amber' },
  submitted: { t: 'оформлено',  cls: 'mo-st-green' },
  failed:    { t: 'помилка',    cls: 'mo-st-red' },
  cancelled: { t: 'скасовано',  cls: 'mo-st-grey' },
};

/* ── КАТАЛОГ (набір заявки) ── */
function catalogListHTML() {
  const q = _search.trim().toLowerCase();
  const prods = (_catalog.products || []).filter(p => !q || (p.name || '').toLowerCase().includes(q));
  const rows = prods.map(p => {
    const n = _qty[p.id] || 0;
    return `<div class="mo-row${n ? ' mo-row-on' : ''}">
      <div style="flex:1;min-width:0">
        <div class="mo-name">${esc(p.name)}</div>
        <div class="mo-sub">${p.price != null ? money(p.price) + ' грн' : ''}${p.unit ? ` · ${esc(p.unit)}` : ''}</div>
      </div>
      <div class="mo-step">
        <button class="mo-pm" onclick="window.__morsh.dec('${p.id}')" ${n ? '' : 'disabled'}>−</button>
        <span class="mo-q">${n || 0}</span>
        <button class="mo-pm" onclick="window.__morsh.inc('${p.id}')">+</button>
      </div>
    </div>`;
  }).join('');
  return rows || '<div class="mo-msg">Нічого не знайдено</div>';
}
function catalogHTML() {
  if (_loading && !_catalog) return `<div class="mo-msg">Завантаження каталогу…</div>`;
  if (!_catalog) return `<div class="mo-msg" style="color:var(--red)">${esc(_error || 'Немає даних')}<div style="margin-top:12px"><button class="mo-btn" onclick="window.__morsh.reload()">Оновити</button></div></div>`;
  const chosen = (_catalog.products || []).filter(p => (_qty[p.id] || 0) > 0);
  const sum = chosen.reduce((s, p) => s + (p.price || 0) * _qty[p.id], 0);
  const footer = chosen.length ? `<div class="mo-foot">
    <input class="mo-note" placeholder="Коментар (необовʼязково)" value="${esc(_note)}" oninput="window.__morsh.note(this.value)"/>
    <button class="mo-submit" onclick="window.__morsh.submit()">Подати заявку · ${chosen.length} поз · ${money(sum)} грн</button>
  </div>` : '';
  return `<div class="mo-searchwrap"><input class="mo-search" placeholder="Пошук товару…" value="${esc(_search)}" oninput="window.__morsh.search(this.value)"/></div>
    <div class="mo-list" id="mo-listhost">${catalogListHTML()}</div>${footer}`;
}

/* ── ЗАЯВКИ ── */
function requestsHTML() {
  if (!_requests) return `<div class="mo-msg">Завантаження…</div>`;
  if (!_requests.length) return `<div class="mo-ok"><div>Заявок поки немає</div><div class="mo-sub" style="margin-top:4px">Набери воду в каталозі й подай заявку</div></div>`;
  const mgr = isMgr();
  return `<div class="mo-list">` + _requests.map(o => {
    const st = STATUS[o.status] || STATUS.pending;
    const when = new Date(o.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const items = (o.items || []).map(i => `<div class="mo-li"><span>${esc(i.name)}</span><span class="mo-li-q">×${i.qty}</span></div>`).join('');
    const errMsg = o.status === 'failed' && o.morsh?.error ? `<div class="mo-err">${esc(o.morsh.error)}</div>` : '';
    const actions = [];
    if (mgr && (o.status === 'pending' || o.status === 'failed'))
      actions.push(`<button class="mo-send${_busy === o.id ? ' mo-send-busy' : ''}" onclick="window.__morsh.send('${o.id}')" ${_busy === o.id ? 'disabled' : ''}>${_busy === o.id ? 'Оформлюю…' : '💧 Оформити в ЄМоршинська'}</button>`);
    if (o.status === 'pending')
      actions.push(`<button class="mo-cancel" onclick="window.__morsh.cancel('${o.id}')">Прибрати</button>`);
    return `<div class="mo-card">
      <div class="mo-card-top">
        <div><span class="mo-who">${esc(o.createdByName || 'заявка')}</span><span class="mo-when"> · ${when}</span></div>
        <span class="mo-st ${st.cls}">${st.t}</span>
      </div>
      <div class="mo-items">${items}</div>
      ${o.note ? `<div class="mo-cmt">💬 ${esc(o.note)}</div>` : ''}
      ${errMsg}
      <div class="mo-card-bot">
        <span class="mo-total">${money(o.sum)} грн</span>
        <div class="mo-acts">${actions.join('')}</div>
      </div>
    </div>`;
  }).join('') + `</div>`;
}

function inner() {
  const outlet = _catalog?.outlet;
  const back = `<div class="mo-topbar">
    <div class="mo-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="mo-title">💧 Замовлення води</div>
      <div class="mo-subtle">${outlet ? esc(outlet.name) + (outlet.custName ? ` · ${esc(outlet.custName)}` : '') : esc(state.venue || 'ЄМоршинська')}</div>
    </div>
  </div>`;
  const tabs = `<div class="mo-tabs">
    <button class="mo-tab${_tab === 'catalog' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('catalog')">Каталог</button>
    <button class="mo-tab${_tab === 'requests' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('requests')">Заявки${_requests?.length ? ` · ${_requests.length}` : ''}</button>
    ${isAdmin() ? `<button class="mo-tab${_tab === 'assort' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('assort')">Асортимент</button>` : ''}
    ${isMgr() ? `<button class="mo-tab${_tab === 'account' ? ' mo-tab-on' : ''}" onclick="window.__morsh.tab('account')">Акаунт</button>` : ''}
  </div>`;
  const err = _error ? `<div class="mo-banner">${esc(_error)}</div>` : '';
  const body = _tab === 'catalog' ? catalogHTML() : _tab === 'assort' ? assortHTML() : _tab === 'account' ? accountHTML() : requestsHTML();
  return back + tabs + err + `<div class="mo-scroll">${body}<div style="height:28px"></div></div>`;
}

function rerender() {
  const el = document.getElementById('mo-inner');
  if (!el) return;
  const sc = el.querySelector('.mo-scroll');
  const top = sc ? sc.scrollTop : 0;      // зберегти позицію прокрутки, щоб список не стрибав на початок
  el.innerHTML = inner();
  const sc2 = el.querySelector('.mo-scroll');
  if (sc2 && top) sc2.scrollTop = top;
}

const CSS = `<style id="mo-css">
.mo-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
#mo-inner{flex:1;display:flex;flex-direction:column;overflow:hidden}
.mo-topbar{display:flex;align-items:center;gap:12px;padding:10px 18px 10px;flex-shrink:0}
.mo-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.mo-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.mo-subtle{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.3}
.mo-tabs{display:flex;gap:8px;padding:2px 14px 10px;flex-shrink:0}
.mo-tab{flex:1;height:34px;border-radius:10px;background:var(--bg1);border:0.5px solid var(--border);color:var(--text2);font-size:13px;font-family:var(--font-b);font-weight:600;cursor:pointer}
.mo-tab-on{background:var(--blue-bg);border-color:var(--blue-border);color:var(--blue)}
.mo-banner{margin:0 14px 8px;padding:9px 12px;border-radius:10px;background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red);font-size:12px;font-family:var(--font-b);line-height:1.4}
.mo-scroll{overflow-y:auto;flex:1;padding:0 14px}
.mo-scroll::-webkit-scrollbar{width:0}
.mo-msg{padding:36px 20px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.5}
.mo-btn{height:34px;padding:0 16px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer}
.mo-searchwrap{padding:2px 0 10px}
.mo-search,.mo-note{width:100%;height:38px;border-radius:10px;background:var(--bg1);border:0.5px solid var(--border);color:var(--text0);font-size:13px;font-family:var(--font-b);padding:0 12px;outline:none}
.mo-list{display:flex;flex-direction:column;gap:7px}
.mo-row{display:flex;align-items:center;gap:10px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:10px 12px}
.mo-row-on{border-color:var(--blue-border);background:var(--blue-bg)}
.mo-name{font-size:13px;color:var(--text0);font-family:var(--font-b);line-height:1.3}
.mo-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.mo-step{display:flex;align-items:center;gap:8px;flex-shrink:0}
.mo-pm{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border);color:var(--text0);font-size:18px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
.mo-pm:disabled{opacity:.4}
.mo-q{min-width:20px;text-align:center;font-family:var(--font-h);font-weight:700;font-size:15px;color:var(--text0)}
.mo-foot{position:sticky;bottom:0;background:var(--bg);padding:10px 0 12px;display:flex;flex-direction:column;gap:8px;border-top:0.5px solid var(--border);margin-top:6px}
.mo-submit{display:block;width:100%;height:46px;padding:0 16px;border-radius:12px;background:var(--blue);border:0;color:#08131f;font-size:14px;font-family:var(--font-h);font-weight:700;cursor:pointer;text-align:center}
.mo-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 13px}
.mo-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.mo-who{font-size:13px;font-family:var(--font-h);font-weight:700;color:var(--text0)}
.mo-when{font-size:11px;color:var(--text3);font-family:var(--font-b)}
.mo-st{font-size:11px;font-family:var(--font-b);font-weight:600;border-radius:6px;padding:2px 8px}
.mo-st-amber{background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}
.mo-st-green{background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green)}
.mo-st-red{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}
.mo-st-grey{background:var(--bg3);border:0.5px solid var(--border);color:var(--text2)}
.mo-items{margin-top:8px;display:flex;flex-direction:column;gap:3px}
.mo-li{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--text1);font-family:var(--font-b)}
.mo-li-q{color:var(--text2);flex-shrink:0}
.mo-cmt{margin-top:7px;font-size:12px;color:var(--text2);font-family:var(--font-b)}
.mo-err{margin-top:7px;font-size:11px;color:var(--red);font-family:var(--font-b);line-height:1.4;background:var(--red-bg);border-radius:8px;padding:6px 9px}
.mo-card-bot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}
.mo-total{font-family:var(--font-h);font-weight:700;font-size:15px;color:var(--text0)}
.mo-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.mo-send{height:36px;padding:0 14px;border-radius:10px;background:var(--blue);border:0;color:#08131f;font-size:12.5px;font-family:var(--font-b);font-weight:700;cursor:pointer}
.mo-send-busy{opacity:.6}
.mo-cancel{height:36px;padding:0 12px;border-radius:10px;background:var(--bg3);border:0.5px solid var(--border);color:var(--text2);font-size:12.5px;font-family:var(--font-b);cursor:pointer}
.mo-ok{padding:34px 20px;text-align:center;color:var(--text1);font-family:var(--font-b);font-size:13px}
.mo-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);padding:4px 2px 10px;line-height:1.4}
.mo-hide{height:32px;padding:0 12px;border-radius:9px;font-size:12px;font-family:var(--font-b);font-weight:600;cursor:pointer;flex-shrink:0;border:0.5px solid}
.mo-hide.on{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.mo-hide.off{background:var(--bg3);border-color:var(--border);color:var(--text3)}
.mo-lbl{font-size:11px;color:var(--text2);font-family:var(--font-b);font-weight:600;margin:0 2px 5px}
.mo-envrow{display:flex;gap:8px;margin-bottom:2px}
.mo-env{flex:1;height:36px;border-radius:10px;background:var(--bg1);border:0.5px solid var(--border);color:var(--text2);font-size:12px;font-family:var(--font-b);font-weight:600;cursor:pointer}
.mo-env.on{background:var(--blue-bg);border-color:var(--blue-border);color:var(--blue)}
.mo-acc-ok{background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:10px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--text0);font-family:var(--font-b)}
.mo-acc-res{margin-top:12px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;font-family:var(--font-b)}
</style>`;

function buildPage() { return `${CSS}<div class="mo-wrap"><div id="mo-inner">${inner()}</div></div>`; }

export function render() { _loading = !_catalog; return buildPage(); }

export function init() {
  _tab = isMgr() ? 'requests' : 'catalog';
  // вхід з картки постачальника у «Замовленнях» — одразу в налаштування
  if (localStorage.getItem('barops_morsh_tab') === 'account' && isMgr()) {
    localStorage.removeItem('barops_morsh_tab');
    _tab = 'account';
    if (isAdmin()) loadAccount();
    loadVenueOutlet();
  }
  window.__morsh = {
    tab(t) { _tab = t; _search = ''; rerender(); if (t === 'requests') loadRequests(); if (t === 'catalog' && !_catalog) loadCatalog(); if (t === 'assort' && !_assort) loadAssort(); if (t === 'account') { if (isAdmin() && !_account) loadAccount(); loadVenueOutlet(); } },
    accField(f, v) { if (f === 'login') _accLogin = v; else if (f === 'pass') _accPass = v; else if (f === 'base') { _accBase = v; rerender(); } },
    saveAccount() { saveAccount(); },
    pickOutlet(id) { pickVenueOutlet(id); },
    accEdit(on) { _accEdit = !!on; _accErr = ''; _accPass = ''; rerender(); },
    dryRun() { dryRun(); },
    inc(id) { _qty[id] = (_qty[id] || 0) + 1; rerender(); },
    dec(id) { _qty[id] = Math.max(0, (_qty[id] || 0) - 1); if (!_qty[id]) delete _qty[id]; rerender(); },
    search(v) { _search = v; const el = document.getElementById('mo-listhost'); if (el) el.innerHTML = (_tab === 'assort' ? assortListHTML() : catalogListHTML()); },
    note(v) { _note = v; },
    submit() { submitRequest(); },
    send(id) { sendToMorsh(id); },
    cancel(id) { cancelReq(id); },
    toggle(id) { const p = (_assort || []).find(x => String(x.id) === String(id)); if (p) { p.hidden = !p.hidden; _hidDirty = true; rerender(); } },
    saveHidden() { saveHidden(); },
    reload() { loadCatalog(); },
  };
  loadCatalog();
  loadRequests();
}
export default { render, init };
