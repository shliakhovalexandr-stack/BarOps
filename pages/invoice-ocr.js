/* ============================================================
   BarOps — pages/invoice-ocr.js
   Прихід накладних: фото → OCR → зіставлення → непроведена накладна в Syrve
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venueId, _token, _role, _venueName;
let _step    = 'idle';     // idle | scanning | review | sending | done | error
let _scanMsg = '';
let _err     = '';
let _photoUrl = null;

let _parsed        = null;
let _supplierRaw   = '';
let _invoiceNumber = '';
let _invoiceDate   = '';
let _supplier      = null;   // { id, name }
let _supplierSug   = [];
let _store         = null;   // { id, name } — склад приходу
let _conception    = null;   // { id, name } — концепція (Тераса/Хочу: «Ресторан»)
let _rows          = [];     // { rawName, qty, unitsPerPack, unit, sum, vatPercent, productId, productName, confidence, source, suggestions }
let _catalog       = { products: [], suppliers: [] };
let _search        = null;   // { type:'product'|'supplier', row, q }
let _result        = null;
let _queue         = [];     // черга фото (пакетний режим)
let _queueTotal    = 0;
let _batchLearned  = 0;      // скільки зіставлень запам'ятано за пачку
let _batchCount    = 0;      // скільки накладних опрацьовано

function money(n) { return (Math.round((+n || 0) * 100) / 100).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
// базова одиниця товару Syrve (з каталогу за productId; запасний — одиниця з OCR)
function baseUnitOf(r) { const p = _catalog.products.find(x => x.id === r.productId); return (((p && p.unit) || r.unit || '')).trim(); }
function isLiterRow(r) { return baseUnitOf(r) === 'л'; }
// об'єм однієї одиниці в літрах: з OCR (volumeL) або парсимо з назви
function parseVolL(s) {
  s = (s || '').toString().toLowerCase().replace(/,/g, '.');
  let m = s.match(/(\d{1,3}(?:\.\d{1,3})?)\s*л(?![а-яёa-z])/);   // 30л, 1.0л, 0.75 л, 24л
  if (m) return parseFloat(m[1]);
  m = s.match(/(?:^|[^.\d%])(0\.\d{2,3}|1\.0)(?![\d%])/);        // 0.75 / 0.5 / 0.33 / 0.25 / 1.0 (не %)
  if (m) return parseFloat(m[1]);
  return 0;
}
function volOf(r) { return (+r.volumeL > 0) ? +r.volumeL : parseVolL(r.rawName); }
// amount у БАЗОВІЙ одиниці: для «л» = к-сть × об'єм; інакше = к-сть (× в уп для штучних пачок)
function amountOf(r) {
  const q = +r.qty || 0;
  const f = isLiterRow(r) ? (volOf(r) || 1) : (+r.unitsPerPack || 1);
  return Math.round(q * f * 1000) / 1000;
}
function matchedCount() { return _rows.filter(r => r.productId).length; }
function totalSum() { return _rows.reduce((s, r) => s + (+r.sum || 0), 0); }

const CSS = `<style id="invoc-css">
.io-wrap{position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.io-top{display:flex;align-items:center;gap:12px;padding:10px 16px 6px;flex-shrink:0}
.io-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.io-back:active{background:var(--bg3)}
.io-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0)}
.io-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.io-scroll{overflow-y:auto;flex:1;padding:12px 16px 120px}.io-scroll::-webkit-scrollbar{width:0}
.io-file{position:fixed;top:-200px;left:-200px;opacity:0;width:1px;height:1px}

.io-hero{background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:26px 20px;text-align:center;margin-bottom:14px}
.io-hero-ic{width:62px;height:62px;border-radius:18px;background:var(--green-bg);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.io-hero-t{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);margin-bottom:4px}
.io-hero-d{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.io-btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.io-btn{padding:16px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;color:var(--text0)}
.io-btn:active{background:var(--bg3)}

.io-spin{width:42px;height:42px;border-radius:50%;border:3px solid var(--bg3);border-top-color:var(--green);animation:ioSpin .8s linear infinite;margin:60px auto 16px}
@keyframes ioSpin{to{transform:rotate(360deg)}}
.io-spin-t{text-align:center;font-family:var(--font-h);font-size:15px;color:var(--text0)}
.io-spin-s{text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:4px}

.io-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:10px}
.io-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.io-sup{display:flex;align-items:center;gap:10px;cursor:pointer}
.io-sup-name{flex:1;min-width:0;font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.io-sup-name.ph{color:var(--text2);font-weight:400;font-family:var(--font-b)}
.io-sup-raw{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.io-chev{flex-shrink:0;color:var(--text2)}

.io-meta-row{display:flex;gap:8px;margin-bottom:10px}
.io-meta{flex:1;background:var(--bg1);border:0.5px solid var(--border);border-radius:11px;padding:8px 10px}
.io-meta-l{font-size:9px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase}
.io-meta-v{font-family:var(--font-h);font-size:13px;color:var(--text0);margin-top:2px}
.io-meta input{width:100%;background:none;border:none;color:var(--text0);font-family:var(--font-h);font-size:13px;outline:none}

.io-row{background:var(--bg1);border:0.5px solid var(--border);border-radius:13px;padding:11px 12px;margin-bottom:8px}
.io-row.unm{border-color:var(--red-border,#5c2d2d)}
.io-raw{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:7px;line-height:1.35}
.io-prod{display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:9px 11px;margin-bottom:8px}
.io-prod.miss{border-color:var(--red-border,#5c2d2d);background:var(--red-bg,#2a1212)}
.io-prod-n{flex:1;min-width:0;font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.io-prod-n.ph{color:var(--red,#e85555);font-weight:500;font-family:var(--font-b)}
.io-badge{font-size:9px;font-weight:700;font-family:var(--font-b);padding:2px 6px;border-radius:6px;flex-shrink:0}
.io-badge.ai{background:var(--purple-bg,#241b3a);color:#A88BFF}
.io-badge.alias{background:var(--green-bg);color:var(--green)}
.io-badge.aprx{background:var(--amber-bg,#2e2410);color:var(--amber,#E0A93B)}
.io-badge.man{background:var(--bg3);color:var(--text1)}
.io-nums{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}
.io-num{background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:5px 8px}
.io-num-l{font-size:9px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase}
.io-num input{width:100%;background:none;border:none;color:var(--text0);font-family:var(--font-h);font-size:14px;outline:none;padding:1px 0}
.io-num .ro{font-family:var(--font-h);font-size:14px;color:var(--text0);padding:1px 0}

.io-foot{position:absolute;left:0;right:0;bottom:0;background:var(--bg1);border-top:0.5px solid var(--border);padding:10px 16px calc(12px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px}
.io-foot-sum{flex:1}
.io-foot-sum-l{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase}
.io-foot-sum-v{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0)}
.io-send{height:48px;padding:0 22px;border-radius:13px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.io-send:disabled{opacity:.45}
.io-learn{height:48px;padding:0 18px;border-radius:13px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer;flex-shrink:0}
.io-learn:disabled{opacity:.45}
.io-skip{height:48px;padding:0 14px;border-radius:13px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer;flex-shrink:0}
.io-fullbtn{width:100%;height:46px;margin-top:10px;border-radius:13px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:14px;font-family:var(--font-b);cursor:pointer}
.io-fullbtn:disabled{opacity:.4}

.io-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:950;display:flex;align-items:flex-end;justify-content:center}
.io-sheet{background:var(--bg1);border:0.5px solid var(--border);border-bottom:none;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:82vh;display:flex;flex-direction:column;padding:8px 14px calc(14px + env(safe-area-inset-bottom))}
.io-sheet-h{width:36px;height:4px;border-radius:2px;background:var(--border);margin:8px auto 10px;flex-shrink:0}
.io-sheet-srch{height:44px;background:var(--bg2);border:0.5px solid var(--border);border-radius:11px;padding:0 13px;font-size:15px;color:var(--text0);font-family:var(--font-b);outline:none;margin-bottom:8px;flex-shrink:0}
.io-sheet-srch:focus{border-color:var(--green)}
.io-res{overflow-y:auto;flex:1}
.io-res-item{padding:11px 10px;border-bottom:0.5px solid var(--border);cursor:pointer;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.io-res-item:active{background:var(--bg2)}
.io-res-art{font-size:10px;color:var(--text2);margin-left:6px}

.io-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 24px;text-align:center}
.io-c-ic{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.io-c-ic.ok{background:var(--green-bg);border:1px solid var(--green-border)}
.io-c-ic.bad{background:var(--red-bg,#2a1212);border:1px solid var(--red-border,#5c2d2d)}
.io-c-t{font-family:var(--font-h);font-size:19px;font-weight:700;color:var(--text0);margin-bottom:8px}
.io-c-s{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5;max-width:300px}
.io-c-btn{margin-top:22px;height:50px;padding:0 26px;border-radius:13px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:700;font-family:var(--font-h);cursor:pointer}
.io-c-btn2{margin-top:10px;height:44px;padding:0 20px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer}
</style>`;

function rerender() {
  if (state.route !== 'invoice-ocr') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function topbar(sub) {
  return `<div class="io-top">
    <div class="io-back" onclick="window.__io.back()"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div><div class="io-title">Прихід накладної</div><div class="io-sub">${sub || ''}</div></div>
  </div>`;
}

function buildHTML() {
  if (_step === 'scanning') return `${CSS}<div class="io-wrap">${topbar('')}<div class="io-spin"></div><div class="io-spin-t">${_scanMsg}</div><div class="io-spin-s">Claude Vision аналізує накладну</div></div>`;
  if (_step === 'sending')  return `${CSS}<div class="io-wrap">${topbar('')}<div class="io-spin"></div><div class="io-spin-t">Створюємо накладну…</div><div class="io-spin-s">Непроведена накладна в Syrve Office</div></div>`;
  if (_step === 'done')     return `${CSS}<div class="io-wrap">${topbar('')}${doneView()}</div>`;
  if (_step === 'error')    return `${CSS}<div class="io-wrap">${topbar('')}${errorView()}</div>`;
  if (_step === 'review')   return `${CSS}<div class="io-wrap">${topbar(_venueName || '')}${reviewView()}${_search ? searchSheet() : ''}</div>${fileInputs()}`;
  return `${CSS}<div class="io-wrap">${topbar(_venueName || '')}${idleView()}</div>${fileInputs()}`;
}

function fileInputs() {
  return `<input class="io-file" id="io-cam" type="file" accept="image/*" capture="environment" onchange="window.__io.file(this)"/>
    <input class="io-file" id="io-gal" type="file" accept="image/*" multiple onchange="window.__io.file(this)"/>`;
}

function idleView() {
  return `<div class="io-scroll">
    <div class="io-hero">
      <div class="io-hero-ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6"><rect x="3" y="2" width="14" height="18" rx="2"/><path d="M7 7h7M7 11h7M7 15h4" stroke-linecap="round"/></svg></div>
      <div class="io-hero-t">Сфотографуйте накладну</div>
      <div class="io-hero-d">AI розпізнає товари й зіставить із Syrve.<br>Галерея — можна обрати <b>кілька фото</b> для наповнення памʼяті (alias).</div>
    </div>
    <div class="io-btn-grid">
      <button class="io-btn" onclick="document.getElementById('io-cam').click()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Камера</button>
      <button class="io-btn" onclick="document.getElementById('io-gal').click()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Галерея</button>
    </div>
  </div>`;
}

function reviewView() {
  const supName = _supplier ? _supplier.name : 'Оберіть постачальника';
  const rows = _rows.map((r, i) => {
    const badge = r.source === 'alias' ? '<span class="io-badge alias">памʼять</span>'
      : r.source === 'alias~' ? `<span class="io-badge aprx">памʼять≈ ${r.confidence || ''}%</span>`
      : r.source === 'ai' ? `<span class="io-badge ai">AI ${r.confidence || ''}%</span>`
      : r.source === 'manual' ? '<span class="io-badge man">обрано</span>' : '';
    return `<div class="io-row${r.productId ? '' : ' unm'}">
      <div class="io-raw">${r.rawName}</div>
      <div class="io-prod${r.productId ? '' : ' miss'}" onclick="window.__io.openSearch('product',${i})">
        <div class="io-prod-n${r.productId ? '' : ' ph'}">${r.productId ? r.productName : 'Оберіть товар'}</div>
        ${r.productId ? badge : ''}
        <svg class="io-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </div>
      <div class="io-nums">
        <div class="io-num"><div class="io-num-l">К-сть</div><input type="number" inputmode="decimal" value="${r.qty}" onchange="window.__io.edit(${i},'qty',this.value)"></div>
        ${isLiterRow(r)
          ? `<div class="io-num"><div class="io-num-l">× об'єм л</div><input type="number" inputmode="decimal" value="${volOf(r) || ''}" onchange="window.__io.edit(${i},'volumeL',this.value)"></div>`
          : `<div class="io-num"><div class="io-num-l">× в уп</div><input type="number" inputmode="decimal" value="${r.unitsPerPack}" onchange="window.__io.edit(${i},'unitsPerPack',this.value)"></div>`}
        <div class="io-num"><div class="io-num-l">= ${baseUnitOf(r) || 'шт'}</div><div class="ro" id="io-amt-${i}">${amountOf(r)}</div></div>
      </div>
      <div class="io-nums" style="margin-top:6px">
        <div class="io-num" style="grid-column:span 2"><div class="io-num-l">Сума, грн</div><input type="number" inputmode="decimal" value="${r.sum}" onchange="window.__io.edit(${i},'sum',this.value)"></div>
        <div class="io-num"><div class="io-num-l">ПДВ %</div><input type="number" inputmode="decimal" value="${r.vatPercent}" onchange="window.__io.edit(${i},'vatPercent',this.value)"></div>
      </div>
    </div>`;
  }).join('');

  const isAdmin = _role === 'admin';
  const ready = _supplier && _store && _rows.length && _rows.every(r => r.productId);
  const learnReady = _supplier && matchedCount() >= 1;
  const batch = _queueTotal > 1;
  return `<div class="io-scroll">
    <div class="io-card">
      <div class="io-lbl">Постачальник</div>
      <div class="io-sup" onclick="window.__io.openSearch('supplier',-1)">
        <div style="flex:1;min-width:0">
          <div class="io-sup-name${_supplier ? '' : ' ph'}">${supName}</div>
          ${_supplierRaw ? `<div class="io-sup-raw">з накладної: ${_supplierRaw}</div>` : ''}
        </div>
        <svg class="io-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </div>
    </div>
    <div class="io-card">
      <div class="io-lbl">Склад приходу</div>
      <div class="io-sup" ${isAdmin ? `onclick="window.__io.openSearch('store',-1)"` : ''}>
        <div style="flex:1;min-width:0"><div class="io-sup-name${_store ? '' : ' ph'}">${_store ? _store.name : 'Визначається…'}</div></div>
        ${isAdmin ? `<svg class="io-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>` : ''}
      </div>
    </div>
    ${(_catalog.conceptions && _catalog.conceptions.length) ? `<div class="io-card">
      <div class="io-lbl">Концепція</div>
      <div class="io-sup" ${isAdmin ? `onclick="window.__io.openSearch('conception',-1)"` : ''}>
        <div style="flex:1;min-width:0"><div class="io-sup-name${_conception ? '' : ' ph'}">${_conception ? _conception.name : 'Без концепції'}</div></div>
        ${isAdmin ? `<svg class="io-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>` : ''}
      </div>
    </div>` : ''}
    <div class="io-meta-row">
      <div class="io-meta"><div class="io-meta-l">№ накладної</div><input value="${_invoiceNumber}" onchange="window.__io.metaNum(this.value)"></div>
      <div class="io-meta"><div class="io-meta-l">Дата</div><input value="${_invoiceDate}" placeholder="YYYY-MM-DD" onchange="window.__io.metaDate(this.value)"></div>
    </div>
    <div class="io-lbl" style="margin:4px 2px 8px">Позиції · зіставлено ${matchedCount()}/${_rows.length}</div>
    ${rows}
    <button class="io-fullbtn" ${ready ? '' : 'disabled'} onclick="window.__io.submit(false)">Створити накладну в Syrve →</button>
  </div>
  <div class="io-foot">
    <div class="io-foot-sum">
      <div class="io-foot-sum-l">${batch ? `Накладна ${_batchCount + 1}/${_queueTotal}` : 'Сума'}</div>
      <div class="io-foot-sum-v">${batch ? `🧠 ${_batchLearned} запам.` : money(totalSum()) + ' ₴'}</div>
    </div>
    ${batch ? `<button class="io-skip" onclick="window.__io.skip()">Пропустити</button>` : ''}
    <button class="io-learn" ${learnReady ? '' : 'disabled'} onclick="window.__io.submit(true)">💾 Запам'ятати</button>
  </div>`;
}

function searchSheet() {
  const title = _search.type === 'supplier' ? 'Постачальник' : _search.type === 'store' ? 'Склад' : _search.type === 'conception' ? 'Концепція' : 'Товар Syrve';
  return `<div class="io-ov" onclick="window.__io.closeSearch()">
    <div class="io-sheet" onclick="event.stopPropagation()">
      <div class="io-sheet-h"></div>
      <input class="io-sheet-srch" id="io-srch" placeholder="Пошук — ${title}…" value="${_search.q || ''}" oninput="window.__io.searchInput(this.value)" autofocus>
      <div class="io-res" id="io-res">${searchResults()}</div>
    </div>
  </div>`;
}

function searchResults() {
  const q = (_search.q || '').toLowerCase().trim();
  const list = _search.type === 'supplier' ? _catalog.suppliers : _search.type === 'store' ? _catalog.stores : _search.type === 'conception' ? _catalog.conceptions : _catalog.products;
  let arr = list;
  if (q) {
    const ts = q.split(/\s+/).filter(Boolean);
    arr = list.filter(p => { const n = (p.name || '').toLowerCase(); return ts.every(t => n.includes(t)); });
  }
  if (!arr.length) return `<div style="padding:20px;text-align:center;color:var(--text2);font-size:13px;font-family:var(--font-b)">${_catalog.products.length ? 'Нічого не знайдено' : 'Завантаження каталогу…'}</div>`;
  return arr.slice(0, 50).map(p => `<div class="io-res-item" onclick="window.__io.pick('${p.id}')">${p.name}${p.article ? `<span class="io-res-art">${p.article}</span>` : ''}</div>`).join('');
}

function doneView() {
  if (_result?.aliasesOnly) {
    return `<div class="io-center">
      <div class="io-c-ic ok"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
      <div class="io-c-t">Запам'ятано 🧠</div>
      <div class="io-c-s">Збережено зіставлень: <b>${_result.learned || 0}</b>${_result.count ? ` · накладних: ${_result.count}` : ''}. Наступного разу ці товари підставлятимуться автоматично.</div>
      <button class="io-c-btn" onclick="window.__io.reset()">Ще пачку</button>
      <button class="io-c-btn2" onclick="window.__io.back()">На головний</button>
    </div>`;
  }
  return `<div class="io-center">
    <div class="io-c-ic ok"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="io-c-t">Накладну створено</div>
    <div class="io-c-s">Непроведена прихідна накладна${_result?.syrveDocNumber ? ` №${_result.syrveDocNumber}` : ''} у Syrve Office${_result?.lineCount ? ` · ${_result.lineCount} поз.` : ''}. Бухгалтер перевірить і проведе.</div>
    <button class="io-c-btn" onclick="window.__io.reset()">Нова накладна</button>
    <button class="io-c-btn2" onclick="window.__io.back()">На головний</button>
  </div>`;
}

function errorView() {
  const batch = _queueTotal > 1;
  return `<div class="io-center">
    <div class="io-c-ic bad"><svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="var(--red,#e85555)" stroke-width="2.4" stroke-linecap="round"/></svg></div>
    <div class="io-c-t">Помилка</div>
    <div class="io-c-s">${_err || 'Не вдалося обробити накладну.'}</div>
    ${batch ? `<button class="io-c-btn" onclick="window.__io.skip()">Пропустити цю → далі</button>` : `<button class="io-c-btn" onclick="window.__io.reset()">Спробувати ще раз</button>`}
    <button class="io-c-btn2" onclick="window.__io.back()">На головний</button>
  </div>`;
}

// ── actions ──
function handleFiles(input) {
  const files = [...(input.files || [])]; input.value = '';
  if (!files.length) return;
  _queue = files; _queueTotal = files.length; _batchLearned = 0; _batchCount = 0;
  if (!_catalog.products.length) loadCatalog();
  processNext();
}

async function processNext() {
  if (!_queue.length) {
    _step = 'done';
    _result = { aliasesOnly: true, batch: _queueTotal > 1, learned: _batchLearned, count: _batchCount };
    rerender(); return;
  }
  await processFile(_queue.shift());
}

async function processFile(f) {
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoUrl = URL.createObjectURL(f);
  _supplier = null; _supplierRaw = ''; _invoiceNumber = ''; _invoiceDate = ''; _rows = []; _err = '';
  _step = 'scanning'; _scanMsg = 'Розпізнаю накладну…'; rerender();
  try {
    const fd = new FormData(); fd.append('photo', f);
    const ocrRes = await fetch(`${API}/api/invoices/ocr`, { method: 'POST', headers: { Authorization: `Bearer ${_token}` }, body: fd });
    const ocrD = await ocrRes.json();
    if (!ocrRes.ok) throw new Error(ocrD.error || 'OCR не вдалось');
    if (!ocrD.parsed || ocrD.parsed.error || !(ocrD.parsed.items || []).length) throw new Error('Не вдалося розпізнати позиції накладної');
    _parsed = ocrD.parsed;
    _supplierRaw = _parsed.supplierName || '';
    _invoiceNumber = _parsed.invoiceNumber || '';
    _invoiceDate = _parsed.date || '';

    _scanMsg = 'Зіставляю товари…'; rerender();
    const mRes = await fetch(`${API}/api/invoices/match/${_venueId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ supplierRawName: _supplierRaw, items: (_parsed.items || []).map(i => ({ rawName: i.rawName })) }),
    });
    const mD = await mRes.json();
    if (!mRes.ok) throw new Error(mD.error || 'Зіставлення не вдалось');

    _supplier = mD.supplier?.match ? { id: mD.supplier.match.id, name: mD.supplier.match.name } : null;
    _supplierSug = mD.supplier?.suggestions || [];
    if (!_supplier && _supplierSug[0] && _supplierSug[0].score >= 80) _supplier = { id: _supplierSug[0].id, name: _supplierSug[0].name };

    _rows = (_parsed.items || []).map((it, idx) => {
      const m = (mD.items || [])[idx] || {};
      const qty = Number(it.qty) || 0;
      const sum = Number(it.sum) || (Number(it.pricePerUnit) || 0) * qty || 0;
      return {
        rawName: it.rawName, qty, unitsPerPack: Number(it.unitsPerPack) || 1, unit: it.unit || '',
        volumeL: Number(it.volumeL) || 0,
        sum, vatPercent: Number(it.vatPercent) || 0,
        productId: m.match?.productId || '', productName: m.match?.name || '',
        confidence: m.match?.confidence || 0, source: m.match?.source || '',
        suggestions: m.suggestions || [],
      };
    });

    if (!_catalog.products.length) loadCatalog(); else { pickDefaultStore(); pickDefaultConception(); }
    _step = 'review'; rerender();
  } catch (e) { _err = e.message; _step = 'error'; rerender(); }
}

async function loadCatalog() {
  try {
    const res = await fetch(`${API}/api/invoices/catalog/${_venueId}`, { headers: { Authorization: `Bearer ${_token}` } });
    const d = await res.json();
    if (res.ok) {
      _catalog = { products: d.products || [], suppliers: d.suppliers || [], stores: d.stores || [], defaultStoreId: d.defaultStoreId || null, conceptions: d.conceptions || [], conceptionId: d.conceptionId || null };
      pickDefaultStore();
      pickDefaultConception();
      if (_search) updateResults();
      if (_step === 'review') rerender();
    }
  } catch {}
}

function pickDefaultStore() {
  if (_store) return;
  const stores = _catalog.stores || [];
  if (!stores.length) return;
  let s;
  if (_role === 'chef' || _role === 'cook') s = stores.find(x => /кух|kitchen/i.test(x.name));
  else if (_role === 'bartender')           s = stores.find(x => /бар|bar/i.test(x.name));
  if (!s && _catalog.defaultStoreId) s = stores.find(x => x.id === _catalog.defaultStoreId);
  if (!s) s = stores[0];
  if (s) _store = { id: s.id, name: s.name };
}

function pickDefaultConception() {
  if (_conception) return;
  const list = _catalog.conceptions || [];
  if (!list.length || !_catalog.conceptionId) return;
  const c = list.find(x => x.id === _catalog.conceptionId);
  if (c) _conception = { id: c.id, name: c.name };
}

function updateResults() {
  const el = document.getElementById('io-res');
  if (el) el.innerHTML = searchResults();
}

async function submit(aliasesOnly) {
  if (!_supplier) { alert('Оберіть постачальника'); return; }
  const items = _rows.filter(r => r.productId).map(r => ({
    rawName: r.rawName, productId: r.productId, productName: r.productName,
    amount: amountOf(r), sum: Number(r.sum) || 0, vatPercent: Number(r.vatPercent) || 0,
  }));
  if (!items.length) { alert('Жодного зіставленого товару'); return; }
  if (!aliasesOnly && !_store) { alert('Оберіть склад'); return; }
  _step = 'sending'; rerender();
  try {
    const res = await fetch(`${API}/api/invoices/submit/${_venueId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({
        supplierRawName: _supplierRaw, supplierId: _supplier.id, supplierName: _supplier.name,
        invoiceNumber: _invoiceNumber, date: _invoiceDate, storeId: _store?.id || '', conceptionId: _conception?.id || '',
        aliasesOnly: !!aliasesOnly, items,
      }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) throw new Error(d.error || (d.details ? `Syrve: ${typeof d.details === 'string' ? d.details.slice(0, 200) : ''}` : 'Не вдалося зберегти'));
    _batchCount += 1;
    if (aliasesOnly) _batchLearned += (d.learned || items.length);
    if (_queue.length) { processNext(); }
    else if (aliasesOnly) { _step = 'done'; _result = { aliasesOnly: true, batch: _queueTotal > 1, learned: _batchLearned, count: _batchCount }; rerender(); }
    else { _result = d; _step = 'done'; rerender(); }
  } catch (e) { _err = e.message; _step = 'error'; rerender(); }
}

function nextOrDone() {
  if (_queue.length) { processNext(); }
  else { _step = 'done'; _result = { aliasesOnly: true, batch: _queueTotal > 1, learned: _batchLearned, count: _batchCount }; rerender(); }
}

function reset() {
  _step = 'idle'; _err = ''; _parsed = null; _rows = []; _supplier = null; _supplierRaw = ''; _store = null; _conception = null;
  _invoiceNumber = ''; _invoiceDate = ''; _search = null; _result = null; _queue = []; _queueTotal = 0; _batchLearned = 0; _batchCount = 0;
  if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
  rerender();
}

export default {
  render() {
    _venueId   = state.venueId || localStorage.getItem('barops_venueId');
    _token     = state.token   || localStorage.getItem('barops_token');
    _role      = (state.role   || localStorage.getItem('barops_role') || '').toLowerCase();
    _venueName = state.venue   || localStorage.getItem('barops_venue') || '';
    _step = 'idle'; _err = ''; _parsed = null; _rows = []; _supplier = null; _supplierRaw = ''; _store = null; _conception = null;
    _invoiceNumber = ''; _invoiceDate = ''; _search = null; _result = null; _catalog = { products: [], suppliers: [] };
    _queue = []; _queueTotal = 0; _batchLearned = 0; _batchCount = 0;
    return buildHTML();
  },
  init() {
    window.__io = {
      back: () => navigate('dashboard'),
      file: handleFiles,
      reset,
      submit: (aliasesOnly) => submit(aliasesOnly),
      skip: nextOrDone,
      edit: (i, k, v) => {
        if (!_rows[i]) return;
        _rows[i][k] = (k === 'qty' || k === 'unitsPerPack' || k === 'volumeL' || k === 'sum' || k === 'vatPercent') ? (parseFloat(v) || 0) : v;
        if (k === 'qty' || k === 'unitsPerPack' || k === 'volumeL') { const el = document.getElementById(`io-amt-${i}`); if (el) el.textContent = amountOf(_rows[i]); }
        if (k === 'sum') { const f = document.querySelector('.io-foot-sum-v'); if (f) f.textContent = money(totalSum()) + ' ₴'; }
      },
      metaNum: (v) => { _invoiceNumber = v; },
      metaDate: (v) => { _invoiceDate = v; },
      openSearch: (type, row) => { _search = { type, row, q: '' }; rerender(); setTimeout(() => document.getElementById('io-srch')?.focus(), 50); },
      closeSearch: () => { _search = null; rerender(); },
      searchInput: (v) => { _search.q = v; updateResults(); },
      pick: (id) => {
        if (!_search) return;
        if (_search.type === 'supplier') {
          const s = _catalog.suppliers.find(x => x.id === id);
          if (s) _supplier = { id: s.id, name: s.name };
        } else if (_search.type === 'store') {
          const s = _catalog.stores.find(x => x.id === id);
          if (s) _store = { id: s.id, name: s.name };
        } else if (_search.type === 'conception') {
          const c = _catalog.conceptions.find(x => x.id === id);
          if (c) _conception = { id: c.id, name: c.name };
        } else {
          const p = _catalog.products.find(x => x.id === id);
          const r = _rows[_search.row];
          if (p && r) { r.productId = p.id; r.productName = p.name; r.source = 'manual'; r.confidence = 100; }
        }
        _search = null; rerender();
      },
    };
  },
  cleanup() { if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; } window.__io = null; },
};
