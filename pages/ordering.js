/* ============================================================
   BarOps — pages/ordering.js
   Smart Ordering: реальні постачальники + товари з Syrve
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _suppliers    = [];   // { id, name, contact, orderDays, supplierProducts:[{id,productId,productName}] }
let _balanceItems = [];   // { id, name, amount, unit, category } — з Syrve
let _barQtys      = {};   // productId → qty для заявки бармена
let _venueId      = null;
let _token        = null;
let _loading      = true;
let _loadError    = '';

let _openSuppliers = new Set();
let _submitted     = false;
let _mgrTab        = 'orders';

/* Supplier management */
let _suppSheet        = null;   // null | 'add' | suppId(string) для edit
let _suppDraft        = { name:'', contact:'', orderDays:'' };
let _prodPickerSupp   = null;   // suppId для якого відкритий пікер
let _prodSearch       = '';
let _suppSaving       = false;
let _suppError        = '';

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="ord-css">
.ord-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.ord-scroll{overflow-y:auto;flex:1}.ord-scroll::-webkit-scrollbar{width:0}

/* topbar */
.ord-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.ord-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.ord-back:active{background:rgba(255,255,255,.08)}
.ord-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.ord-sub{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}

/* sec label */
.ord-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.ord-sec-link{font-size:11px;color:var(--teal);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* ── SUBMITTED BANNER ── */
.ord-submitted{margin:0 14px 10px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px}
.ord-sb-icon{width:40px;height:40px;border-radius:12px;background:var(--green-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ord-sb-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.ord-sb-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:3px;line-height:1.4}

/* ── SUPPLIER BLOCK ── */
.ord-supp-block{margin:0 14px 8px}
.ord-supp-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px 16px 0 0;cursor:pointer;transition:background .15s}
.ord-supp-hdr.collapsed{border-radius:16px}
.ord-supp-hdr:active{background:rgba(255,255,255,.08)}
.ord-sh-icon{width:36px;height:36px;border-radius:10px;background:var(--bg3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}
.ord-sh-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0)}
.ord-sh-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-sh-total{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);text-align:right}
.ord-sh-chev{width:24px;height:24px;border-radius:6px;background:var(--bg3);display:flex;align-items:center;justify-content:center;transition:transform .2s;flex-shrink:0}
.ord-sh-chev.open{transform:rotate(180deg)}

/* product rows inside supplier */
.ord-supp-items{background:var(--bg2);border:0.5px solid var(--border);border-top:none;border-radius:0 0 16px 16px;overflow:hidden}
.ord-prod-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);transition:background .12s}
.ord-prod-row:last-child{border-bottom:none}
.ord-pbar{width:3px;height:38px;border-radius:2px;flex-shrink:0}
.ord-pemoji{width:32px;height:32px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.ord-pname{font-size:12px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ord-pstock{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
/* qty stepper */
.ord-qty{display:flex;align-items:center;gap:2px;flex-shrink:0}
.ord-qbtn{width:28px;height:28px;border-radius:7px;background:var(--bg3);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--text0);transition:background .12s;flex-shrink:0}
.ord-qbtn:active{background:var(--bg4)}
.ord-qbtn.plus{background:var(--green);color:#000;border-color:var(--green)}
.ord-qdisp{min-width:36px;height:28px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);padding:0 4px}
.ord-qunit{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-left:2px}

/* actions bar */
.ord-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.ord-btn{width:100%;height:52px;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;letter-spacing:-.01em}
.ord-btn-teal{background:var(--green);color:#000}
.ord-btn-teal:active{opacity:.85}
.ord-btn-ghost{background:var(--bg2);border:0.5px solid var(--border);color:var(--text1)}
.ord-btn-ghost:active{background:rgba(255,255,255,.08)}

/* ── MANAGER TABS ── */
.ord-mgr-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.ord-mt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.ord-mt.act{background:var(--bg3);color:var(--text0)}

/* ── SUPPLIERS TAB ── */
.ord-supp-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-ssc-row{display:flex;align-items:center;gap:10px;padding:12px 15px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s}
.ord-ssc-row:last-child{border-bottom:none}
.ord-ssc-row:active{background:rgba(255,255,255,.08)}
.ord-ssc-icon{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.ord-ssc-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.ord-ssc-items{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-ssc-day{font-family:var(--font-h);font-size:12px;font-weight:600;color:var(--teal);text-align:right}

/* ── SCHEDULE TAB ── */
.ord-sched-card{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-sched-row{display:flex;align-items:center;gap:10px;padding:12px 15px;border-bottom:1px solid var(--border)}
.ord-sched-row:last-child{border-bottom:none}
.ord-sched-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--teal-bg);border:0.5px solid var(--teal-border)}
.ord-sched-lbl{font-size:12px;color:var(--text1);font-family:var(--font-b)}
.ord-sched-dt{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}

/* ── BOTTOM SHEET ── */
.ord-sheet-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.78);display:none;flex-direction:column;justify-content:flex-end}
.ord-sheet-overlay.open{display:flex;animation:ordOvIn .2s ease}
@keyframes ordOvIn{from{opacity:0}to{opacity:1}}
.ord-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 32px;animation:ordSlideUp .3s cubic-bezier(.22,1,.36,1);max-height:88%;display:flex;flex-direction:column}
@keyframes ordSlideUp{from{transform:translateY(100%)}to{transform:none}}
.ord-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 16px;flex-shrink:0}
.ord-sheet-hdr{padding:0 18px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ord-sheet-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.ord-sheet-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer}
.ord-sheet-body{overflow-y:auto;flex:1;padding:0 18px}.ord-sheet-body::-webkit-scrollbar{width:0}
.ord-sheet-foot{padding:14px 18px 0;flex-shrink:0}

/* ── SUPPLIER SHEET INPUTS ── */
.ord-inp-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.ord-inp{width:100%;height:48px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);outline:none;box-sizing:border-box;margin-bottom:14px}
.ord-inp:focus{border-color:var(--teal)}
.ord-inp.err{border-color:var(--red)}

/* ── PRODUCT PICKER ── */
.ord-pp-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:opacity .12s}
.ord-pp-row:last-child{border-bottom:none}
.ord-pp-row:active{opacity:.6}
.ord-pp-check{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.ord-pp-check.on{background:var(--green);border-color:var(--green)}
.ord-pp-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.ord-pp-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}

/* ── EMPTY STATE ── */
.ord-empty{margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:28px 20px;text-align:center}
.ord-empty-icon{font-size:32px;margin-bottom:10px}
.ord-empty-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0);margin-bottom:6px}
.ord-empty-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}

/* alert */
.ord-alert{margin:0 14px 8px;border-radius:12px;padding:10px 13px;display:flex;align-items:flex-start;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5}
.ord-alert-purple{background:var(--purple-bg);border:0.5px solid var(--purple-border);color:var(--purple)}
.ord-alert-icon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* search in sheet */
.ord-sheet-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:0 12px;height:40px;margin-bottom:12px}
.ord-sheet-search-inp{flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.ord-sheet-search-inp::placeholder{color:var(--text3)}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function getBalance(productId) {
  return _balanceItems.find(b => b.id === productId) || null;
}
function stockStatus(amount) {
  if (amount <= 0) return 'critical';
  return 'ok';
}
function statusColor(s) {
  return s === 'critical' ? 'var(--red)' : s === 'low' ? 'var(--amber)' : 'var(--green)';
}
function nProds(n) {
  if (n === 1) return '1 товар';
  if (n < 5)  return `${n} товари`;
  return `${n} товарів`;
}

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadData() {
  _loading = true;
  _loadError = '';
  try {
    const h = { Authorization: `Bearer ${_token}` };
    const [sRes, bRes] = await Promise.all([
      fetch(`${API}/api/suppliers?venueId=${_venueId}`, { headers: h }),
      fetch(`${API}/api/pos/balance/${_venueId}`,       { headers: h }),
    ]);
    const sData = await sRes.json();
    const bData = await bRes.json();

    if (sData.success) {
      _suppliers = sData.suppliers || [];
      _openSuppliers = new Set(_suppliers.map(s => s.id));
    }
    if (bData.success && bData.stores) {
      _balanceItems = [];
      for (const store of bData.stores) {
        for (const item of store.items) {
          if (item.name && !item.name.match(/^[0-9a-f-]{36}$/i)) {
            _balanceItems.push(item);
          }
        }
      }
    }
  } catch (err) {
    _loadError = err.message;
  }
  _loading = false;
  fullRender();
}

/* ════════════════════════
   BARTENDER: supplier blocks
════════════════════════ */
function barSuppliersHTML() {
  if (_loading) return `<div style="padding:30px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px">Завантаження…</div>`;
  if (_suppliers.length === 0) {
    return `<div class="ord-empty"><div class="ord-empty-icon">📦</div>
      <div class="ord-empty-title">Постачальників ще немає</div>
      <div class="ord-empty-sub">Менеджер повинен спочатку додати постачальників та призначити їм товари</div>
    </div>`;
  }

  return _suppliers.map(s => {
    const prods = (s.supplierProducts || []).map(sp => {
      const bal = getBalance(sp.productId);
      return {
        productId:   sp.productId,
        name:        sp.productName,
        stock:       bal ? (bal.amount || 0) : null,
        unit:        bal?.unit || '',
        qty:         _barQtys[sp.productId] || 0,
        col:         statusColor(bal ? stockStatus(bal.amount || 0) : 'ok'),
      };
    });

    const isOpen   = _openSuppliers.has(s.id);
    const totalQty = prods.reduce((a, p) => a + p.qty, 0);

    let inner = '';
    if (isOpen) {
      if (prods.length === 0) {
        inner = `<div class="ord-supp-items"><div style="padding:14px 16px;font-size:12px;color:var(--text2);font-family:var(--font-b)">Товари не призначені</div></div>`;
      } else {
        inner = `<div class="ord-supp-items">` + prods.map(p => `
          <div class="ord-prod-row">
            <div class="ord-pbar" style="background:${p.col}"></div>
            <div class="ord-pemoji">📦</div>
            <div style="flex:1;min-width:0">
              <div class="ord-pname">${p.name}</div>
              <div class="ord-pstock">${p.stock !== null ? `Залишок: ${p.stock.toFixed(2)} ${p.unit}` : 'Залишок: —'}</div>
            </div>
            <div class="ord-qty">
              <div class="ord-qbtn" onclick="window.__ord.changeQty('${p.productId}',-1)">−</div>
              <div class="ord-qdisp" id="bq-${p.productId}">${p.qty}<span class="ord-qunit">од.</span></div>
              <div class="ord-qbtn plus" onclick="window.__ord.changeQty('${p.productId}',1)">+</div>
            </div>
          </div>`).join('') + `</div>`;
      }
    }

    return `
    <div class="ord-supp-block">
      <div class="ord-supp-hdr ${isOpen ? '' : 'collapsed'}" onclick="window.__ord.toggleSupp('${s.id}')">
        <div class="ord-sh-icon">🏭</div>
        <div style="flex:1;min-width:0">
          <div class="ord-sh-name">${s.name}</div>
          <div class="ord-sh-meta">${nProds(prods.length)}${s.orderDays ? ' · ' + s.orderDays : ''}</div>
        </div>
        ${totalQty > 0 ? `<div style="margin-right:6px"><div class="ord-sh-total" style="color:var(--teal)">${totalQty} шт</div></div>` : ''}
        <div class="ord-sh-chev ${isOpen ? 'open' : ''}">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      ${inner}
    </div>`;
  }).join('');
}

function renderBartender() {
  const totalItems = Object.values(_barQtys).filter(q => q > 0).length;
  return `
  <div class="ord-topbar" style="flex-shrink:0">
    <div class="ord-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="ord-title">Закупка</div>
      <div class="ord-sub">${state.venue}</div>
    </div>
    ${totalItems > 0 ? `<div style="font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--teal)">${totalItems} поз.</div>` : ''}
  </div>

  <div class="ord-scroll">
    ${_submitted ? `
    <div class="ord-submitted">
      <div class="ord-sb-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l5 5 7-8" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div>
        <div class="ord-sb-title">Заявку подано ✓</div>
        <div class="ord-sb-sub">Менеджер отримав сповіщення і перевірить замовлення перед відправкою</div>
      </div>
    </div>` : ''}

    <div class="ord-sec">По постачальниках</div>
    <div id="ord-bar-supps">${barSuppliersHTML()}</div>
    <div style="height:14px"></div>
  </div>

  <div class="ord-actions">
    ${_submitted
      ? `<button class="ord-btn ord-btn-ghost" onclick="window.__ord.resetOrder()">Редагувати заявку</button>`
      : `<button class="ord-btn ord-btn-teal" onclick="window.__ord.submitOrder()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h10M8 4l4 4-4 4" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Відправити заявку менеджеру
        </button>`}
  </div>`;
}

/* ════════════════════════
   MANAGER: orders tab (placeholder)
════════════════════════ */
function mgrOrdersHTML() {
  return `<div class="ord-empty" style="margin-top:4px">
    <div class="ord-empty-icon">📋</div>
    <div class="ord-empty-title">Поданих заявок ще немає</div>
    <div class="ord-empty-sub">Як бармен подасть заявку — вона з'явиться тут для перегляду та затвердження</div>
  </div>`;
}

/* ════════════════════════
   MANAGER: suppliers tab
════════════════════════ */
function mgrSuppliersHTML() {
  if (_loading) return `<div style="padding:30px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px">Завантаження…</div>`;
  if (_suppliers.length === 0) {
    return `<div class="ord-empty"><div class="ord-empty-icon">🏭</div>
      <div class="ord-empty-title">Постачальників ще немає</div>
      <div class="ord-empty-sub">Натисніть "+ Додати" щоб додати першого постачальника</div>
    </div>`;
  }
  return `<div class="ord-supp-card">
    ${_suppliers.map(s => {
      const n = (s.supplierProducts || []).length;
      return `
      <div class="ord-ssc-row" onclick="window.__ord.openSuppEdit('${s.id}')">
        <div class="ord-ssc-icon">🏭</div>
        <div style="flex:1;min-width:0">
          <div class="ord-ssc-name">${s.name}</div>
          <div class="ord-ssc-items">${nProds(n)}${s.contact ? ' · ' + s.contact : ''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${s.orderDays ? `<div class="ord-ssc-day">${s.orderDays}</div>` : ''}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="color:var(--text3);display:block;margin-top:4px"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ════════════════════════
   MANAGER: schedule tab
════════════════════════ */
function mgrScheduleHTML() {
  const withDays = _suppliers.filter(s => s.orderDays);
  if (withDays.length === 0) {
    return `<div class="ord-empty"><div class="ord-empty-icon">📅</div>
      <div class="ord-empty-title">Розклад не налаштовано</div>
      <div class="ord-empty-sub">Додайте постачальників з вказанням днів доставки</div>
    </div>`;
  }
  return `<div class="ord-sched-card">
    ${withDays.map(s => `
    <div class="ord-sched-row">
      <div class="ord-sched-icon">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="9" rx="1.5" stroke="var(--teal)" stroke-width="1.2" fill="none"/><path d="M2 6h10M5 1.5v2M9 1.5v2" stroke="var(--teal)" stroke-width="1.2" stroke-linecap="round"/></svg>
      </div>
      <div style="flex:1">
        <div class="ord-sched-lbl">${s.name}</div>
        <div class="ord-sched-dt">Кожного ${s.orderDays}</div>
      </div>
    </div>`).join('')}
  </div>`;
}

/* ════════════════════════
   SUPPLIER EDIT/ADD SHEET
════════════════════════ */
function suppSheetHTML() {
  if (!_suppSheet) return '';
  const isEdit = _suppSheet !== 'add';
  const supp   = isEdit ? _suppliers.find(s => s.id === _suppSheet) : null;
  const prods  = supp ? (supp.supplierProducts || []) : [];

  return `
  <div class="ord-sheet-overlay open" onclick="window.__ord.closeSuppSheet(event)" id="supp-sheet-ov">
    <div class="ord-sheet" onclick="event.stopPropagation()">
      <div class="ord-sheet-handle"></div>
      <div class="ord-sheet-hdr">
        <div class="ord-sheet-title">${isEdit ? 'Постачальник' : 'Новий постачальник'}</div>
        <div class="ord-sheet-close" onclick="window.__ord.closeSuppSheet()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="ord-sheet-body">
        ${_suppError ? `<div style="padding:10px 12px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:10px;color:var(--red);font-size:12px;font-family:var(--font-b);margin-bottom:14px">${_suppError}</div>` : ''}

        <div class="ord-inp-lbl">Назва *</div>
        <input class="ord-inp ${_suppError && !_suppDraft.name ? 'err' : ''}"
          type="text" placeholder="Напр.: Баядера Логістик"
          value="${_suppDraft.name}"
          oninput="window.__ord.suppDraft('name',this.value)"/>

        <div class="ord-inp-lbl">Контакт</div>
        <input class="ord-inp" type="text" placeholder="Ім'я · +380..."
          value="${_suppDraft.contact}"
          oninput="window.__ord.suppDraft('contact',this.value)"/>

        <div class="ord-inp-lbl">Дні доставки</div>
        <input class="ord-inp" type="text" placeholder="Напр.: Вт, Чт"
          value="${_suppDraft.orderDays}"
          oninput="window.__ord.suppDraft('orderDays',this.value)"/>

        ${isEdit ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0 10px">
          <div style="font-size:12px;font-weight:600;color:var(--text0);font-family:var(--font-b)">Товари (${prods.length})</div>
          <div onclick="window.__ord.openProdPicker('${supp.id}')"
            style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--teal);cursor:pointer;padding:6px 12px;background:var(--teal-bg);border:0.5px solid var(--teal-border);border-radius:8px;font-family:var(--font-b)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round"/></svg>
            Додати товар
          </div>
        </div>
        ${prods.length > 0
          ? `<div style="background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px">
              ${prods.map((sp, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 13px;${i < prods.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
                <div style="flex:1;font-size:13px;color:var(--text1);font-family:var(--font-b)">${sp.productName}</div>
                <div onclick="window.__ord.removeProduct('${sp.id}')"
                  style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:7px;background:var(--bg4);flex-shrink:0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text2)" stroke-width="1.5" stroke-linecap="round"/></svg>
                </div>
              </div>`).join('')}
            </div>`
          : `<div style="padding:14px;text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px">Товари не додані — натисніть "Додати товар"</div>`}

        <div onclick="window.__ord.deleteSuppConfirm('${supp.id}')"
          style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;cursor:pointer;border-radius:10px;border:1px solid var(--red-border);color:var(--red);font-size:13px;font-family:var(--font-b);margin-bottom:8px">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M4.5 3.5v7a1 1 0 001 1h3a1 1 0 001-1v-7" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Видалити постачальника
        </div>` : ''}
      </div>
      <div class="ord-sheet-foot">
        <button class="ord-btn ord-btn-teal" onclick="window.__ord.saveSuppEdit()" ${_suppSaving ? 'disabled' : ''}>
          ${_suppSaving ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Додати постачальника'}
        </button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   PRODUCT PICKER SHEET
════════════════════════ */
function prodPickerHTML() {
  if (!_prodPickerSupp) return '';
  const supp     = _suppliers.find(s => s.id === _prodPickerSupp);
  if (!supp) return '';
  const assigned = new Map((supp.supplierProducts || []).map(sp => [sp.productId, sp.id]));

  const q        = _prodSearch.toLowerCase();
  const filtered = _balanceItems.filter(b => !q || b.name.toLowerCase().includes(q));

  return `
  <div class="ord-sheet-overlay open" onclick="window.__ord.closeProdPicker(event)" id="prod-picker-ov">
    <div class="ord-sheet" onclick="event.stopPropagation()">
      <div class="ord-sheet-handle"></div>
      <div class="ord-sheet-hdr">
        <div class="ord-sheet-title">Вибір товарів</div>
        <div class="ord-sheet-close" onclick="window.__ord.closeProdPicker()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="ord-sheet-body">
        <div class="ord-sheet-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/><path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/></svg>
          <input class="ord-sheet-search-inp" placeholder="Знайти товар…"
            value="${_prodSearch}"
            oninput="window.__ord.prodSearchChange(this.value)"/>
        </div>

        ${filtered.length === 0
          ? `<div style="padding:24px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:12px">${_balanceItems.length === 0 ? 'Залишки Syrve не завантажені' : 'Нічого не знайдено'}</div>`
          : filtered.map(b => {
              const isOn = assigned.has(b.id);
              const spId = assigned.get(b.id) || '';
              const name = b.name.replace(/'/g, '&#39;');
              return `
              <div class="ord-pp-row" onclick="window.__ord.toggleProduct('${supp.id}','${b.id}','${name}','${spId}')">
                <div class="ord-pp-check ${isOn ? 'on' : ''}">
                  ${isOn ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
                </div>
                <div style="flex:1;min-width:0">
                  <div class="ord-pp-name">${b.name}</div>
                  ${b.amount !== undefined ? `<div class="ord-pp-stock">Залишок: ${(b.amount || 0).toFixed(2)} ${b.unit || ''}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
        <div style="height:8px"></div>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function renderManager() {
  return `
  <div class="ord-topbar" style="flex-shrink:0">
    <div class="ord-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="ord-title">Замовлення</div>
      <div class="ord-sub">Менеджер · ${state.venue}</div>
    </div>
  </div>

  <div class="ord-scroll">
    <div class="ord-mgr-tabs">
      <button class="ord-mt ${_mgrTab==='orders'?'act':''}"     onclick="window.__ord.setMgrTab('orders')">Замовлення</button>
      <button class="ord-mt ${_mgrTab==='suppliers'?'act':''}"  onclick="window.__ord.setMgrTab('suppliers')">Постачальники</button>
      <button class="ord-mt ${_mgrTab==='schedule'?'act':''}"   onclick="window.__ord.setMgrTab('schedule')">Розклад</button>
    </div>

    ${_mgrTab === 'orders' ? mgrOrdersHTML() : ''}

    ${_mgrTab === 'suppliers' ? `
      <div class="ord-sec">Постачальники
        <button class="ord-sec-link" onclick="window.__ord.openSuppAdd()">+ Додати</button>
      </div>
      ${mgrSuppliersHTML()}
      <div class="ord-alert ord-alert-purple" style="margin-top:4px">
        <div class="ord-alert-icon" style="background:var(--purple-bg)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="var(--purple)" stroke-width="1.2"/><path d="M6.5 4v3.5M6.5 9.5v.4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/></svg>
        </div>
        Натисніть на постачальника щоб редагувати та призначати товари зі списку залишків
      </div>` : ''}

    ${_mgrTab === 'schedule' ? `
      <div class="ord-sec">Графік поставок</div>
      ${mgrScheduleHTML()}` : ''}

    <div style="height:20px"></div>
  </div>

  ${suppSheetHTML()}
  ${prodPickerHTML()}`;
}

/* ════════════════════════
   BUILD + RENDER
════════════════════════ */
function buildHTML() {
  const body = (state.role === 'admin' || state.role === 'manager') ? renderManager() : renderBartender();
  return `${CSS}<div class="ord-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function partialRefreshSupps() {
  const el = document.getElementById('ord-bar-supps');
  if (el) el.innerHTML = barSuppliersHTML();
}

/* ════════════════════════
   BARTENDER ACTIONS
════════════════════════ */
function toggleSupp(id) {
  if (_openSuppliers.has(id)) _openSuppliers.delete(id);
  else _openSuppliers.add(id);
  // Rebuild just the supplier blocks without full re-render
  const el = document.getElementById('ord-bar-supps');
  if (el) el.innerHTML = barSuppliersHTML();
  else fullRender();
}

function changeQty(productId, delta) {
  if (_submitted) return;
  _barQtys[productId] = Math.max(0, (_barQtys[productId] || 0) + delta);
  const el = document.getElementById(`bq-${productId}`);
  if (el) el.innerHTML = _barQtys[productId] + `<span class="ord-qunit">од.</span>`;
  else partialRefreshSupps();
}

function submitOrder()  { _submitted = true;  fullRender(); }
function resetOrder()   { _submitted = false; fullRender(); }

/* ════════════════════════
   MANAGER ACTIONS
════════════════════════ */
function setMgrTab(tab) { _mgrTab = tab; fullRender(); }

/* ── Supplier CRUD ── */
function openSuppAdd() {
  _suppDraft = { name: '', contact: '', orderDays: '' };
  _suppError = '';
  _suppSheet = 'add';
  fullRender();
}

function openSuppEdit(suppId) {
  const s = _suppliers.find(x => x.id === suppId);
  if (!s) return;
  _suppDraft = { name: s.name, contact: s.contact || '', orderDays: s.orderDays || '' };
  _suppError = '';
  _suppSheet = suppId;
  fullRender();
}

function closeSuppSheet(e) {
  if (e && e.target?.id !== 'supp-sheet-ov') return;
  _suppSheet = null;
  fullRender();
}

function suppDraft(field, value) {
  _suppDraft[field] = value;
}

async function saveSuppEdit() {
  if (!_suppDraft.name.trim()) { _suppError = 'Введіть назву постачальника'; fullRender(); return; }
  _suppSaving = true;
  _suppError  = '';
  fullRender();
  try {
    const isEdit = _suppSheet !== 'add';
    const url    = isEdit ? `${API}/api/suppliers/${_suppSheet}` : `${API}/api/suppliers`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body   = { name: _suppDraft.name.trim(), contact: _suppDraft.contact.trim(), orderDays: _suppDraft.orderDays.trim() };
    if (!isEdit) body.venueId = _venueId;

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Помилка збереження');

    // Оновлюємо локально
    if (isEdit) {
      const idx = _suppliers.findIndex(s => s.id === _suppSheet);
      if (idx >= 0) _suppliers[idx] = { ..._suppliers[idx], ...data.supplier };
    } else {
      _suppliers.push(data.supplier);
      _openSuppliers.add(data.supplier.id);
    }
    _suppSheet  = isEdit ? _suppSheet : data.supplier.id; // залишаємось в edit після create
    _suppSaving = false;
    fullRender();
  } catch (err) {
    _suppError  = err.message;
    _suppSaving = false;
    fullRender();
  }
}

async function deleteSuppConfirm(suppId) {
  const s = _suppliers.find(x => x.id === suppId);
  if (!s || !confirm(`Видалити постачальника "${s.name}"? Всі прив'язки товарів також будуть видалені.`)) return;
  try {
    await fetch(`${API}/api/suppliers/${suppId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${_token}` },
    });
    _suppliers     = _suppliers.filter(x => x.id !== suppId);
    _suppSheet     = null;
    fullRender();
  } catch (err) {
    alert('Помилка: ' + err.message);
  }
}

/* ── Product assignment ── */
function openProdPicker(suppId) {
  _prodPickerSupp = suppId;
  _prodSearch     = '';
  fullRender();
}

function closeProdPicker(e) {
  if (e && e.target?.id !== 'prod-picker-ov') return;
  _prodPickerSupp = null;
  fullRender();
}

function prodSearchChange(q) {
  _prodSearch = q;
  const el = document.getElementById('prod-picker-ov');
  if (el) {
    const body = el.querySelector('.ord-sheet-body');
    if (body) {
      const tmpPicker = _prodPickerSupp;
      // re-render just the items
      body.innerHTML = prodPickerHTML().match(/<div class="ord-sheet-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>$/)?.[1] || '';
    }
  }
  fullRender();
}

async function toggleProduct(suppId, productId, productName, spId) {
  const supp = _suppliers.find(s => s.id === suppId);
  if (!supp) return;
  const isAssigned = (supp.supplierProducts || []).some(sp => sp.productId === productId);

  if (isAssigned && spId) {
    // Знімаємо
    try {
      await fetch(`${API}/api/suppliers/products/${spId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${_token}` },
      });
      supp.supplierProducts = (supp.supplierProducts || []).filter(sp => sp.id !== spId);
    } catch { return; }
  } else {
    // Призначаємо
    try {
      const res  = await fetch(`${API}/api/suppliers/products`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
        body:    JSON.stringify({ supplierId: suppId, venueId: _venueId, productId, productName }),
      });
      const data = await res.json();
      if (!data.success) return;
      if (!supp.supplierProducts) supp.supplierProducts = [];
      supp.supplierProducts.push(data.supplierProduct);
    } catch { return; }
  }
  fullRender();
}

async function removeProduct(spId) {
  try {
    await fetch(`${API}/api/suppliers/products/${spId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${_token}` },
    });
    for (const s of _suppliers) {
      s.supplierProducts = (s.supplierProducts || []).filter(sp => sp.id !== spId);
    }
    fullRender();
  } catch (err) {
    alert('Помилка: ' + err.message);
  }
}

/* ════════════════════════
   EXPORT
════════════════════════ */
export default {
  render() {
    _barQtys       = {};
    _submitted     = false;
    _mgrTab        = 'orders';
    _suppSheet     = null;
    _prodPickerSupp = null;
    _prodSearch    = '';
    _suppError     = '';
    _suppSaving    = false;
    _loading       = true;
    return buildHTML();
  },
  init() {
    window.__ord = {
      toggleSupp, changeQty, submitOrder, resetOrder,
      setMgrTab,
      openSuppAdd, openSuppEdit, closeSuppSheet, suppDraft, saveSuppEdit, deleteSuppConfirm,
      openProdPicker, closeProdPicker, prodSearchChange, toggleProduct, removeProduct,
    };
    _venueId = state.venueId || localStorage.getItem('barops_venueId');
    _token   = localStorage.getItem('barops_token');
    if (!_venueId || !_token) { _loading = false; fullRender(); return; }
    loadData();
  },
};
