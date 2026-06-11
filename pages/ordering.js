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
let _barComments  = {};   // productId → comment string
let _barUnits     = {};   // productId → обрана одиниця (Ящ/пл/л/шт/кг)
let _openCards    = new Set(); // productId для яких розгорнуто картку

let _orders           = [];   // менеджерський список заявок
let _ordersLoading    = false;
let _expandedOrders   = new Set(); // id виконаних заявок які розгорнуті
let _venueId      = null;
let _token        = null;
let _loading      = true;
let _loadError    = '';

let _openSuppliers = new Set();
let _submitted     = false;
let _mgrTab        = 'orders';
let _suggest        = null;   // підказки закупівлі (рух за 7 днів + залишок) з /ordering-suggestions
let _suggestLoading = false;
let _suggestOnlyLow = false;  // фільтр «лише те, що треба замовити»

/* Supplier management */
let _suppSheet        = null;   // null | 'add' | suppId(string) для edit
let _suppDraft        = { name:'', contact:'', orderDays:'', fop:'', paymentForm:'' };
let _confirm          = null;   // { title, message, confirmLabel, danger, action }
let _rename           = null;   // { id, syrve, value } — модалка перейменування товару
let _customProd       = null;   // { suppId, name } — модалка створення власного товару (тільки BarOps)
let _copiedSupp       = new Set(); // ключі orderId:suppIdx — постачальники, яких уже копіювали (localStorage)
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
.ord-prod-wrap{border-bottom:1px solid var(--border)}
.ord-prod-wrap:last-child{border-bottom:none}
.ord-prod-row{display:flex;align-items:center;gap:10px;padding:11px 14px;transition:background .12s}
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
.ord-qinput{width:52px;height:36px;background:rgba(255,255,255,.08);border:0.5px solid var(--border);border-radius:9px;text-align:center;font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);outline:none;-moz-appearance:textfield;padding:0}
.ord-qinput::-webkit-inner-spin-button,.ord-qinput::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.ord-qinput:focus{border-color:var(--green)}
/* expandable product card */
.ord-prod-row{cursor:pointer;user-select:none}
.ord-qty-badge{padding:3px 10px;border-radius:20px;background:rgba(74,222,128,.12);border:1px solid var(--green-border);color:var(--green);font-size:12px;font-family:var(--font-h);font-weight:700;flex-shrink:0;white-space:nowrap}
.ord-chev{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .2s}
.ord-chev.open{transform:rotate(180deg)}
.ord-prod-card-body{padding:12px 14px 14px;background:rgba(255,255,255,.03);border-top:0.5px solid var(--border)}
.ord-unit-pills{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.ord-unit-pill{height:32px;padding:0 14px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg3);font-size:13px;font-family:var(--font-b);color:var(--text1);cursor:pointer;display:flex;align-items:center;transition:all .15s}
.ord-unit-pill.sel{background:rgba(167,139,250,.18);border-color:var(--purple);color:var(--purple);font-weight:600}
.ord-card-stepper{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ord-qbtn-lg{width:36px;height:36px;border-radius:10px;background:var(--bg3);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;color:var(--text0);transition:background .12s;flex-shrink:0}
.ord-qbtn-lg:active{background:var(--bg4)}
.ord-qbtn-lg.plus{background:var(--green);color:#000;border-color:var(--green)}
.ord-note-input{width:100%;height:34px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;padding:0 10px;font-size:12px;color:var(--text0);font-family:var(--font-b);outline:none;box-sizing:border-box}
.ord-note-input:focus{border-color:var(--purple)}
.ord-note-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
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
.ord-confirm-ov{position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:24px}
.ord-confirm-ov.open{display:flex;animation:ordOvIn .2s ease}
.ord-confirm{background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:20px;width:100%;max-width:340px;box-shadow:0 20px 50px rgba(0,0,0,.5);animation:ordPop .22s cubic-bezier(.22,1,.36,1)}
@keyframes ordPop{from{transform:scale(.94);opacity:.5}to{transform:none;opacity:1}}
.ord-confirm-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);margin-bottom:8px}
.ord-confirm-msg{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.55;margin-bottom:18px}
.ord-confirm-btns{display:flex;gap:10px}
.ord-confirm-btns button{flex:1;height:44px;border-radius:12px;font-size:14px;font-family:var(--font-h);font-weight:600;cursor:pointer}
.ord-confirm-cancel{background:var(--bg2);color:var(--text1);border:0.5px solid var(--border)}
.ord-confirm-cancel:active{background:var(--bg3)}
.ord-confirm-ok{background:var(--bg2);color:var(--text0);border:none}
.ord-confirm-ok.danger{background:var(--red,#e85555);color:#fff}
.ord-confirm-ok.danger:active{filter:brightness(.92)}
.ord-confirm-ok.primary{background:var(--purple);color:#fff}
.ord-confirm-ok.primary:active{filter:brightness(.92)}
.ord-confirm-inp{width:100%;box-sizing:border-box;height:46px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;color:var(--text0);font-size:15px;font-family:var(--font-b);padding:0 14px;outline:none;margin-bottom:8px}
.ord-confirm-inp:focus{border-color:var(--purple)}
.ord-confirm-hint{font-size:11px;color:var(--text3);font-family:var(--font-b);margin-bottom:16px}
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
/* order cards */
.ord-req-card{margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.ord-req-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:0.5px solid var(--border)}
.ord-req-who{flex:1;min-width:0}
.ord-req-name{font-size:13px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.ord-req-time{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.ord-req-badge{padding:3px 10px;border-radius:20px;font-size:11px;font-family:var(--font-b);font-weight:600;flex-shrink:0}
.ord-req-badge.pending{background:rgba(234,179,8,.15);color:#eab308}
.ord-req-badge.done{background:var(--green-bg);color:var(--green)}
.ord-req-supp{padding:8px 14px;border-bottom:0.5px solid var(--border)}
.ord-req-supp:last-child{border-bottom:none}
.ord-req-sname{font-size:11px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.ord-req-item{display:flex;align-items:baseline;gap:6px;padding:2px 0;font-family:var(--font-b)}
.ord-req-iname{font-size:12px;color:var(--text1);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ord-req-iqty{font-size:13px;font-weight:700;color:var(--teal);flex-shrink:0}
.ord-req-icomment{font-size:11px;color:var(--text2);margin-top:1px;font-style:italic}
.ord-req-done-btn{display:block;width:calc(100% - 28px);margin:10px 14px 12px;height:40px;border-radius:12px;background:var(--green-bg);border:1px solid var(--green-border);color:var(--green);font-size:13px;font-family:var(--font-b);font-weight:600;cursor:pointer}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function getBalance(productId) {
  return _balanceItems.find(b => b.id === productId) || null;
}
function getSuggest(productId) {
  return (_suggest || []).find(s => s.id === productId) || null;
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
async function fetchBalanceRetry(maxAttempts = 3) {
  const h = { Authorization: `Bearer ${_token}` };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, 2500));
    if (state.route !== 'ordering') return null;
    try {
      const res  = await fetch(`${API}/api/pos/balance/${_venueId}`, { headers: h });
      const data = await res.json();
      if (data.success && data.stores?.length) return data;
      console.warn(`[Ordering] balance attempt ${attempt}/${maxAttempts}: empty`);
    } catch (e) {
      console.warn(`[Ordering] balance attempt ${attempt}/${maxAttempts}:`, e.message);
    }
  }
  return null;
}

async function loadData() {
  _loading = true;
  _loadError = '';
  try {
    const h = { Authorization: `Bearer ${_token}` };

    // Постачальники — швидко з DB, без ретраю
    const sRes  = await fetch(`${API}/api/suppliers?venueId=${_venueId}`, { headers: h });
    const sData = await sRes.json();
    if (sData.success) {
      _suppliers     = sData.suppliers || [];
      _openSuppliers = new Set(_suppliers.map(s => s.id));
    }
    _loading = false;
    fullRender(); // відразу показуємо постачальників

    // Баланс — ретрай у фоні (Railway cold start + Syrve latency)
    const bData = await fetchBalanceRetry(3);
    if (bData?.stores) {
      _balanceItems = [];
      for (const store of bData.stores) {
        for (const item of store.items) {
          if (item.name && !item.name.match(/^[0-9a-f-]{36}$/i)) {
            _balanceItems.push(item);
          }
        }
      }
      partialRefreshSupps(); // оновлюємо тільки рядки товарів
    }
  } catch (err) {
    _loadError = err.message;
    _loading = false;
    fullRender();
  }
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
      const hasCustom = sp.customName && sp.customName !== sp.productName;
      return {
        productId:   sp.productId,
        name:        sp.customName || sp.productName,
        syrve:       hasCustom ? sp.productName : '',
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
        inner = `<div class="ord-supp-items">` + prods.map(p => {
          const isOpen = _openCards.has(p.productId);
          const unit   = _barUnits[p.productId] || '';
          const UNITS  = ['Ящ','пл','л','шт','кг'];
          const sug    = getSuggest(p.productId);
          return `
          <div class="ord-prod-wrap">
            <div class="ord-prod-row" onclick="window.__ord.toggleProdCard('${p.productId}')">
              <div class="ord-pbar" style="background:${p.col}"></div>
              <div class="ord-pemoji">📦</div>
              <div style="flex:1;min-width:0">
                <div class="ord-pname">${p.name}</div>
                ${p.syrve ? `<div class="ord-pstock" style="color:var(--text3)">Syrve: ${p.syrve}</div>` : ''}
                <div class="ord-pstock">${p.stock !== null ? `Залишок: ${p.stock.toFixed(2)} ${p.unit}` : 'Залишок: —'}</div>
                ${sug && fmtN(sug.sold7days) > 0 ? `<div class="ord-pstock" style="color:var(--text3)">За тиждень: ${fmtN(sug.sold7days)} ${p.unit || sug.unit || ''}</div>` : ''}
              </div>
              ${p.qty > 0 ? `<div class="ord-qty-badge">${p.qty} ${unit || 'од.'}</div>` : ''}
              <div class="ord-chev ${isOpen ? 'open' : ''}">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            ${isOpen ? `
            <div class="ord-prod-card-body">
              <div class="ord-unit-pills">
                ${UNITS.map(u => `<div class="ord-unit-pill ${unit===u?'sel':''}" onclick="event.stopPropagation();window.__ord.setUnit('${p.productId}','${u}')">${u}</div>`).join('')}
              </div>
              <div class="ord-card-stepper">
                <div class="ord-qbtn-lg" onclick="event.stopPropagation();window.__ord.changeQty('${p.productId}',-1)">−</div>
                <input class="ord-qinput" id="bq-${p.productId}" type="number" min="0" inputmode="numeric"
                  value="${p.qty}"
                  onchange="event.stopPropagation();window.__ord.setQty('${p.productId}',this.value)"
                  onclick="event.stopPropagation()"
                  onfocus="this.select()"
                  ${_submitted ? 'disabled' : ''}>
                <div class="ord-qbtn-lg plus" onclick="event.stopPropagation();window.__ord.changeQty('${p.productId}',1)">+</div>
                ${unit ? `<div style="font-size:14px;color:var(--purple);font-family:var(--font-b);font-weight:600;margin-left:2px">${unit}</div>` : ''}
              </div>
              <div class="ord-note-lbl">Коментар</div>
              <input class="ord-note-input" type="text" placeholder="Напр. смак, сорт, бренд..."
                value="${(_barComments[p.productId]||'').replace(/"/g,'&quot;')}"
                oninput="event.stopPropagation();window.__ord.setComment('${p.productId}',this.value)"
                onclick="event.stopPropagation()">
            </div>` : ''}
          </div>`;
        }).join('') + `</div>`;
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
      <div class="ord-title">Замовлення</div>
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
        </button>
        ${totalItems > 0 ? `<button class="ord-btn ord-btn-ghost" style="margin-top:8px" onclick="window.__ord.clearOrderConfirm()">Очистити заявку</button>` : ''}`}
  </div>`;
}

/* ════════════════════════
   MANAGER: orders tab
════════════════════════ */
function mgrOrdersHTML() {
  if (_ordersLoading) return `<div style="padding:30px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px">Завантаження…</div>`;

  const active = _orders.filter(o => o.status !== 'done' && o.status !== 'cancelled');
  const done   = _orders.filter(o => o.status === 'done');

  if (!_orders.length) return `
    <div class="ord-empty" style="margin-top:4px">
      <div class="ord-empty-icon">📋</div>
      <div class="ord-empty-title">Поданих заявок ще немає</div>
      <div class="ord-empty-sub">Як бармен подасть заявку — вона з'явиться тут</div>
    </div>
    <div style="margin:0 14px">
      <button onclick="window.__ord.loadOrders()" style="width:100%;height:40px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer">Оновити</button>
    </div>`;

  function suppliersHTML(o) {
    return (o.suppliers || []).map((s, si) => {
      const items  = (s.items || []).filter(i => (i.qty || 0) > 0);
      const copyId = `copy-${o.id}-${si}`;
      return `
      <div class="ord-req-supp">
        <div class="ord-req-sname" style="margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.supplierName || 'Постачальник'}</span>
          <span id="copied-${o.id}-${si}" style="font-size:10px;color:var(--green);font-family:var(--font-b);font-weight:500;flex-shrink:0">${_copiedSupp.has(copiedKey(o.id, si)) ? '✓ вже копіювали' : ''}</span>
        </div>
        <button id="${copyId}" onclick="window.__ord.copySupplier('${o.id}',${si},'${copyId}')"
          style="width:100%;height:38px;border-radius:10px;background:var(--purple-bg);border:0.5px solid var(--purple-border);color:var(--purple);font-size:13px;font-weight:600;font-family:var(--font-b);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:8px">
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 4V2.5A1.5 1.5 0 006.5 1h-4A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Копіювати замовлення
        </button>
        ${items.map(i => `
          <div class="ord-req-item">
            <span class="ord-req-iname">${i.productName}</span>
            <span class="ord-req-iqty">${i.qty} ${i.unit || 'од.'}</span>
          </div>
          ${i.comment ? `<div class="ord-req-icomment">${i.comment}</div>` : ''}
        `).join('')}
      </div>`;
    }).join('');
  }

  function activeCard(o) {
    const t = new Date(o.createdAt);
    const timeStr = t.toLocaleDateString('uk-UA', { day:'numeric', month:'short' }) + ' · ' +
                    t.toLocaleTimeString('uk-UA', { hour:'2-digit', minute:'2-digit' });
    return `
    <div class="ord-req-card">
      <div class="ord-req-hdr">
        <div class="ord-req-who">
          <div class="ord-req-name">${o.submittedBy || '—'}</div>
          <div class="ord-req-time">${timeStr}</div>
        </div>
        <div class="ord-req-badge pending">Очікує</div>
      </div>
      ${suppliersHTML(o)}
      <button class="ord-req-done-btn" onclick="window.__ord.markOrderDone('${o.id}')">✓ Позначити виконаним</button>
    </div>`;
  }

  function doneCard(o) {
    const t = new Date(o.createdAt);
    const timeStr = t.toLocaleDateString('uk-UA', { day:'numeric', month:'short' }) + ' · ' +
                    t.toLocaleTimeString('uk-UA', { hour:'2-digit', minute:'2-digit' });
    const isExpanded = _expandedOrders.has(o.id);
    const totalItems = (o.suppliers||[]).reduce((a,s)=>a+(s.items||[]).filter(i=>i.qty>0).length, 0);
    return `
    <div class="ord-req-card" style="opacity:.75">
      <div class="ord-req-hdr" style="cursor:pointer" onclick="window.__ord.toggleDoneOrder('${o.id}')">
        <div class="ord-req-who">
          <div class="ord-req-name" style="font-size:12px">${o.submittedBy || '—'} · ${totalItems} поз.</div>
          <div class="ord-req-time">${timeStr}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="ord-req-badge done">Виконано</div>
          <div style="color:var(--text2);transition:transform .2s;transform:${isExpanded?'rotate(180deg)':'none'}">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        </div>
      </div>
      ${isExpanded ? suppliersHTML(o) : ''}
    </div>`;
  }

  return `
    <div style="margin:4px 14px 8px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.08em">Нові заявки (${active.length})</div>
      <button onclick="window.__ord.loadOrders()" style="height:28px;padding:0 12px;border-radius:8px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:11px;font-family:var(--font-b);cursor:pointer">Оновити</button>
    </div>
    ${active.length ? active.map(activeCard).join('') : `<div style="padding:14px 14px 0;font-size:12px;color:var(--text2);font-family:var(--font-b)">Нових заявок немає</div>`}
    ${done.length ? `
      <div style="margin:14px 14px 8px;font-size:11px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.08em">Виконані (${done.length})</div>
      ${done.slice(0, 10).map(doneCard).join('')}` : ''}`;
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

        <div class="ord-inp-lbl">ФОП (для тексту)</div>
        <input class="ord-inp" type="text" placeholder="Напр.: ФОП Іваненко І.І."
          value="${(_suppDraft.fop||'').replace(/"/g,'&quot;')}"
          oninput="window.__ord.suppDraft('fop',this.value)"/>

        <div class="ord-inp-lbl">Форма оплати</div>
        <input class="ord-inp" type="text" placeholder="Напр.: безготівка / ФОП на ФОП"
          value="${(_suppDraft.paymentForm||'').replace(/"/g,'&quot;')}"
          oninput="window.__ord.suppDraft('paymentForm',this.value)"/>

        ${isEdit ? `
        <div id="supp-prods">${suppProdsHTML(supp)}</div>

        <div onclick="window.__ord.deleteSuppConfirm('${supp.id}')"
          style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;cursor:pointer;border-radius:10px;border:1px solid var(--red-border);color:var(--red);font-size:13px;font-family:var(--font-b);margin-bottom:8px">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M4.5 3.5v7a1 1 0 001 1h3a1 1 0 001-1v-7" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Видалити постачальника
        </div>` : ''}
      </div>
      <div class="ord-sheet-foot">
        <button id="supp-save-btn" class="ord-btn ord-btn-teal" onclick="window.__ord.saveSuppEdit()" ${_suppSaving ? 'disabled' : ''}>
          ${_suppSaving ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Додати постачальника'}
        </button>
      </div>
    </div>
  </div>`;
}

// Секція товарів у панелі постачальника (для точкового оновлення)
function suppProdsHTML(supp) {
  const prods = supp ? (supp.supplierProducts || []) : [];
  return `
    <div style="margin:6px 0 10px">
      <div style="font-size:12px;font-weight:600;color:var(--text0);font-family:var(--font-b);margin-bottom:8px">Товари (${prods.length})</div>
      <div style="display:flex;gap:8px">
        <div onclick="window.__ord.openProdPicker('${supp.id}')"
          style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;color:var(--teal);cursor:pointer;padding:8px 12px;background:var(--teal-bg);border:0.5px solid var(--teal-border);border-radius:8px;font-family:var(--font-b)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="var(--teal)" stroke-width="1.5" stroke-linecap="round"/></svg>
          Із Syrve
        </div>
        <div onclick="window.__ord.openCustomProd('${supp.id}')"
          style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;color:var(--purple);cursor:pointer;padding:8px 12px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:8px;font-family:var(--font-b)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="var(--purple)" stroke-width="1.5" stroke-linecap="round"/></svg>
          Власний
        </div>
      </div>
    </div>
    ${prods.length > 0
      ? `<div style="background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px">
          ${prods.map((sp, i) => {
            const isCustom = (sp.productId || '').startsWith('custom-');
            const hasCustom = !isCustom && sp.customName && sp.customName !== sp.productName;
            return `
          <div style="display:flex;align-items:center;gap:8px;padding:10px 13px;${i < prods.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:var(--text0);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sp.customName || sp.productName}${isCustom ? ' <span style="font-size:9px;color:var(--purple);border:0.5px solid var(--purple-border);border-radius:5px;padding:0 4px;vertical-align:middle">власний</span>' : ''}</div>
              ${hasCustom ? `<div style="font-size:11px;color:var(--text3);font-family:var(--font-b);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Syrve: ${sp.productName}</div>` : ''}
            </div>
            <div onclick="window.__ord.renameProduct('${sp.id}')" title="Перейменувати для відправки"
              style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:7px;background:var(--bg4);flex-shrink:0;color:var(--teal)">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 13h2.5l6-6L9 4.5l-6 6V13z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10.5 3l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </div>
            <div onclick="window.__ord.removeProduct('${sp.id}')"
              style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:7px;background:var(--bg4);flex-shrink:0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text2)" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
          </div>`;
          }).join('')}
        </div>`
      : `<div style="padding:14px;text-align:center;font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px">Товари не додані — натисніть "Додати товар"</div>`}`;
}

/* ════════════════════════
   PRODUCT PICKER SHEET
════════════════════════ */
function pickerRowHTML(supp, b) {
  const sp = (supp.supplierProducts || []).find(x => x.productId === b.id);
  const assignedId = sp?.id || '';
  const isOn = !!assignedId;
  const custom = sp?.customName && sp.customName !== b.name ? sp.customName : '';
  return `<div class="ord-pp-row" data-pid="${b.id}" onclick="window.__ord.toggleProduct('${supp.id}','${b.id}','${assignedId}',event)">
    <div class="ord-pp-check ${isOn ? 'on' : ''}">
      ${isOn ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
    </div>
    <div style="flex:1;min-width:0">
      <div class="ord-pp-name" style="${custom ? '' : 'color:var(--text2)'}">${custom || b.name}</div>
      ${custom ? `<div class="ord-pp-stock" style="color:var(--text3)">Syrve: ${b.name}</div>` : ''}
      ${b.amount !== undefined ? `<div class="ord-pp-stock">Залишок: ${(b.amount || 0).toFixed(2)} ${b.unit || ''}</div>` : ''}
    </div>
  </div>`;
}

function prodPickerHTML() {
  if (!_prodPickerSupp) return '';
  const supp     = _suppliers.find(s => s.id === _prodPickerSupp);
  if (!supp) return '';

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

        <div id="ord-pp-list">
        ${filtered.length === 0
          ? `<div style="padding:24px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:12px">${_balanceItems.length === 0 ? 'Залишки Syrve не завантажені' : 'Нічого не знайдено'}</div>`
          : filtered.map(b => pickerRowHTML(supp, b)).join('')}
        </div>
        <div style="height:8px"></div>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
/* ── Підказки закупівлі (рух за 7 днів + залишок) ── */
function fmtN(n) { return Math.round((+n || 0) * 10) / 10; }

async function loadSuggest(force = false, attempt = 1) {
  if (_suggestLoading) return;
  _suggestLoading = true;
  if (_mgrTab === 'suggest') fullRender();
  let ok = false;
  try {
    const tok = _token || localStorage.getItem('barops_token') || '';
    const r = await fetch(`${API}/api/pos/ordering-suggestions/${_venueId}${force ? '?fresh=1' : ''}`, { headers: { Authorization: `Bearer ${tok}` } });
    const d = await r.json();
    ok = r.ok && d.success;
    _suggest = ok ? (d.suggestions || []) : [];
  } catch { _suggest = []; }
  _suggestLoading = false;
  // Syrve має один REST-слот — запит міг програти гонку іншому. Ретраїмо до 3 разів.
  if (!ok && attempt < 3 && state.route === 'ordering') {
    setTimeout(() => loadSuggest(false, attempt + 1), 5000);
  }
  // Оновлюємо без скидання скролу: бармен — лише рядки товарів; менеджер — повний рендер вкладки
  if (_mgrTab === 'suggest') fullRender(); else partialRefreshSupps();
}

function toggleSuggestLow() { _suggestOnlyLow = !_suggestOnlyLow; fullRender(); }

function suggestHTML() {
  if (_suggestLoading) return `<div style="padding:30px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px">Аналізую рух за 7 днів…</div>`;
  const all = (_suggest || []).filter(s => (s.sold7days || 0) > 0);
  if (!all.length) {
    return `<div style="padding:24px 16px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.6">Немає даних про рух за тиждень.<br>Перевір, що для закладу налаштовано Syrve (department + склад).
      <div style="margin-top:12px"><button onclick="window.__ord.loadSuggest(true)" style="height:36px;padding:0 16px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:13px;font-family:var(--font-b);cursor:pointer">Оновити</button></div></div>`;
  }
  const rank = { critical: 0, low: 1, ok: 2 };
  all.sort((a, b) => (rank[a.status] - rank[b.status]) || ((a.stock - a.weeklyAvg) - (b.stock - b.weeklyAvg)));
  const lowCount = all.filter(s => s.status !== 'ok').length;
  const list = _suggestOnlyLow ? all.filter(s => s.status !== 'ok') : all;
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 10px">
      <div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">Рух за 7 днів · <b style="color:${lowCount ? 'var(--amber)' : 'var(--green)'}">${lowCount}</b> треба замовити</div>
      <div style="display:flex;gap:6px">
        <button onclick="window.__ord.toggleSuggestLow()" style="height:30px;padding:0 11px;border-radius:9px;border:0.5px solid var(--border);background:${_suggestOnlyLow ? 'var(--purple-bg)' : 'var(--bg2)'};color:${_suggestOnlyLow ? 'var(--purple)' : 'var(--text1)'};font-size:12px;font-family:var(--font-b);cursor:pointer">${_suggestOnlyLow ? 'Усі' : 'Лише замовити'}</button>
        <button onclick="window.__ord.loadSuggest(true)" style="width:30px;height:30px;border-radius:9px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text1);font-size:14px;cursor:pointer">↻</button>
      </div>
    </div>
    ${list.map(s => {
      const c = s.status === 'critical' ? 'var(--red)' : s.status === 'low' ? 'var(--amber)' : 'var(--text3)';
      const u = s.unit || 'од.';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;margin-bottom:6px">
        <div style="width:7px;height:7px;border-radius:50%;background:${c};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--text0);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">за тиждень ${fmtN(s.sold7days)} ${u} · залишок ${fmtN(s.stock)} ${u}</div>
        </div>
        ${s.suggestedQty > 0
          ? `<div style="text-align:right;flex-shrink:0"><div style="font-size:15px;font-weight:600;color:var(--green);line-height:1">+${fmtN(s.suggestedQty)}</div><div style="font-size:10px;color:var(--text3);margin-top:1px">${u}</div></div>`
          : `<div style="font-size:11px;color:var(--text3);flex-shrink:0">досить</div>`}
      </div>`;
    }).join('')}
    <div style="height:24px"></div>
  `;
}

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
      <button class="ord-mt ${_mgrTab==='suggest'?'act':''}"    onclick="window.__ord.setMgrTab('suggest')">Підказки</button>
      <button class="ord-mt ${_mgrTab==='suppliers'?'act':''}"  onclick="window.__ord.setMgrTab('suppliers')">Постачальники</button>
      <button class="ord-mt ${_mgrTab==='schedule'?'act':''}"   onclick="window.__ord.setMgrTab('schedule')">Розклад</button>
    </div>

    ${_mgrTab === 'orders' ? mgrOrdersHTML() : ''}
    ${_mgrTab === 'suggest' ? suggestHTML() : ''}

    ${_mgrTab === 'suppliers' ? `
      <div class="ord-sec">Постачальники
        <button class="ord-sec-link" onclick="window.__ord.openSuppAdd()">+ Додати</button>
      </div>
      <div id="ord-mgr-supps">${mgrSuppliersHTML()}</div>
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

  <div id="ord-sheet-host">${suppSheetHTML()}</div>
  <div id="ord-picker-host">${prodPickerHTML()}</div>
  <div id="ord-confirm-host">${confirmHTML()}${renameHTML()}${customHTML()}</div>`;
}

/* ════════════════════════
   CONFIRM MODAL (у стилі додатку)
════════════════════════ */
function confirmHTML() {
  if (!_confirm) return '';
  const c = _confirm;
  return `
  <div class="ord-confirm-ov open" onclick="window.__ord.closeConfirm()">
    <div class="ord-confirm" onclick="event.stopPropagation()">
      <div class="ord-confirm-title">${c.title || 'Підтвердження'}</div>
      <div class="ord-confirm-msg">${c.message || ''}</div>
      <div class="ord-confirm-btns">
        <button class="ord-confirm-cancel" onclick="window.__ord.closeConfirm()">Скасувати</button>
        <button class="ord-confirm-ok ${c.danger ? 'danger' : ''}" onclick="window.__ord.confirmYes()">${c.confirmLabel || 'OK'}</button>
      </div>
    </div>
  </div>`;
}

// Модалка перейменування товару (стиль додатку)
function renameHTML() {
  if (!_rename) return '';
  const r = _rename;
  return `
  <div class="ord-confirm-ov open" onclick="window.__ord.renameCancel()">
    <div class="ord-confirm" onclick="event.stopPropagation()">
      <div class="ord-confirm-title">Назва для відправки</div>
      <input class="ord-confirm-inp" id="ord-rename-inp" type="text" maxlength="120"
        value="${(r.value || '').replace(/"/g, '&quot;')}" placeholder="Назва товару"
        oninput="window.__ord.renameInput(this.value)"
        onkeydown="if(event.key==='Enter')window.__ord.renameSave()"/>
      <div class="ord-confirm-hint">Syrve: ${r.syrve || '—'}</div>
      <div class="ord-confirm-btns">
        <button class="ord-confirm-cancel" onclick="window.__ord.renameCancel()">Скасувати</button>
        <button class="ord-confirm-ok primary" onclick="window.__ord.renameSave()">Зберегти</button>
      </div>
    </div>
  </div>`;
}

// Модалка створення власного товару (тільки BarOps — для розхідки, якої в Syrve нема як товар)
function customHTML() {
  if (!_customProd) return '';
  const c = _customProd;
  return `
  <div class="ord-confirm-ov open" onclick="window.__ord.customCancel()">
    <div class="ord-confirm" onclick="event.stopPropagation()">
      <div class="ord-confirm-title">Власний товар</div>
      <input class="ord-confirm-inp" id="ord-custom-inp" type="text" maxlength="120"
        value="${(c.name || '').replace(/"/g, '&quot;')}" placeholder="Назва (напр. Серветки, Зубочистки)"
        oninput="window.__ord.customInput(this.value)"
        onkeydown="if(event.key==='Enter')window.__ord.saveCustomProd()"/>
      <div class="ord-confirm-hint">Тільки в BarOps для замовлення (у Syrve товару нема). Одиницю бармен обере при замовленні.</div>
      <div class="ord-confirm-btns">
        <button class="ord-confirm-cancel" onclick="window.__ord.customCancel()">Скасувати</button>
        <button class="ord-confirm-ok primary" onclick="window.__ord.saveCustomProd()">Додати</button>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD + RENDER
════════════════════════ */
function buildHTML() {
  const body = (state.role === 'admin' || state.role === 'manager' || state.role === 'director') ? renderManager() : renderBartender();
  return `${CSS}<div class="ord-wrap">${body}</div>`;
}
function fullRender() {
  if (state.route !== 'ordering') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function partialRefreshSupps() {
  const el = document.getElementById('ord-bar-supps');
  if (el) el.innerHTML = barSuppliersHTML();
}
// Точкові оновлення — щоб не перебудовувати всю сторінку (без «скоку» й повторних анімацій)
function refreshSheetHost() {
  const el = document.getElementById('ord-sheet-host');
  if (el) el.innerHTML = suppSheetHTML();
  else fullRender();
}
function refreshPickerHost() {
  const el = document.getElementById('ord-picker-host');
  if (el) el.innerHTML = prodPickerHTML();
  else fullRender();
}
function refreshConfirmHost() {
  const el = document.getElementById('ord-confirm-host');
  if (!el) { fullRender(); return; }
  el.innerHTML = confirmHTML() + renameHTML() + customHTML();
  if (_rename) {
    const inp = document.getElementById('ord-rename-inp');
    if (inp) { inp.focus(); inp.select(); }
  }
  if (_customProd) {
    const inp = document.getElementById('ord-custom-inp');
    if (inp) { inp.focus(); }
  }
}
function refreshMgrSupps() {
  const el = document.getElementById('ord-mgr-supps');
  if (el) el.innerHTML = mgrSuppliersHTML();
  else fullRender();
}
// Оновити лише секцію товарів у відкритій панелі постачальника (без анімації панелі)
function refreshSuppProds() {
  if (!_suppSheet || _suppSheet === 'add') return;
  const supp = _suppliers.find(s => s.id === _suppSheet);
  const el = document.getElementById('supp-prods');
  if (supp && el) el.innerHTML = suppProdsHTML(supp);
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

function toggleProdCard(productId) {
  if (_submitted) return;
  if (_openCards.has(productId)) {
    _openCards.delete(productId);
  } else {
    _openCards.add(productId);
  }
  partialRefreshSupps();
}

function setUnit(productId, unit) {
  _barUnits[productId] = unit;
  saveDraft();
  // Оновлюємо пілюлі без повного ре-рендеру
  const wrap = document.querySelector(`.ord-prod-wrap [onclick*="toggleProdCard('${productId}')"]`)
               ?.closest('.ord-prod-wrap');
  if (wrap) {
    wrap.querySelectorAll('.ord-unit-pill').forEach(el => {
      el.classList.toggle('sel', el.textContent.trim() === unit);
    });
    // Оновлюємо бейдж у compact рядку
    const badge = wrap.querySelector('.ord-qty-badge');
    if (badge) badge.textContent = `${_barQtys[productId] || 0} ${unit}`;
    // Оновлюємо підпис одиниці біля степера
    const unitLabel = wrap.querySelector('.ord-card-stepper > div:last-child');
    if (unitLabel && !unitLabel.classList.contains('ord-qbtn-lg')) {
      unitLabel.textContent = unit;
    }
  } else {
    partialRefreshSupps();
  }
}

function changeQty(productId, delta) {
  if (_submitted) return;
  _barQtys[productId] = Math.max(0, (_barQtys[productId] || 0) + delta);
  saveDraft();
  const el = document.getElementById(`bq-${productId}`);
  if (el) el.value = _barQtys[productId];
  // Оновлюємо бейдж
  const badge = document.querySelector(`.ord-prod-wrap [onclick*="toggleProdCard('${productId}')"] .ord-qty-badge`);
  if (badge) badge.textContent = `${_barQtys[productId]} ${_barUnits[productId] || 'од.'}`;
  else if (!el) partialRefreshSupps();
}

function setQty(productId, value) {
  if (_submitted) return;
  const n = Math.max(0, parseInt(value, 10) || 0);
  _barQtys[productId] = n;
  saveDraft();
  const el = document.getElementById(`bq-${productId}`);
  if (el) el.value = n;
}

function setComment(productId, value) {
  _barComments[productId] = value.trim() ? value : '';
  saveDraft();
}

/* ── Чернетка заявки: зберігається локально, переживає вихід/закриття ── */
// Памʼять «вже копіювали» постачальника (щоб не плутатись при копіюванні не по порядку)
function copiedKey(orderId, si) { return `${orderId}:${si}`; }
function copiedStoreKey() { return `barops_ord_copied_${_venueId || localStorage.getItem('barops_venueId') || ''}`; }
function loadCopied() { try { _copiedSupp = new Set(JSON.parse(localStorage.getItem(copiedStoreKey()) || '[]')); } catch { _copiedSupp = new Set(); } }
function saveCopied() { try { localStorage.setItem(copiedStoreKey(), JSON.stringify([..._copiedSupp])); } catch {} }

function draftKey() { return `barops_order_draft_${_venueId || localStorage.getItem('barops_venueId') || ''}`; }
function saveDraft() {
  try {
    const hasData = Object.values(_barQtys).some(q => q > 0) || Object.values(_barComments).some(c => c);
    if (hasData) localStorage.setItem(draftKey(), JSON.stringify({ qtys: _barQtys, comments: _barComments, units: _barUnits }));
    else localStorage.removeItem(draftKey());
  } catch {}
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return;
    const d = JSON.parse(raw) || {};
    _barQtys     = d.qtys     || {};
    _barComments = d.comments || {};
    _barUnits    = d.units    || {};
  } catch {}
}
function clearDraftStorage() { try { localStorage.removeItem(draftKey()); } catch {} }
function clearDraft() { _barQtys = {}; _barComments = {}; _barUnits = {}; clearDraftStorage(); }
function clearOrderConfirm() {
  openConfirm({
    title:        'Очистити заявку?',
    message:      'Усі введені кількості та коментарі буде видалено.',
    confirmLabel: 'Очистити',
    danger:       true,
    action:       () => { clearDraft(); fullRender(); },
  });
}

async function submitOrder() {
  // Збираємо дані по постачальниках
  const suppliers = _suppliers.map(s => {
    const items = (s.supplierProducts || [])
      .map(sp => ({
        productId:   sp.productId,
        productName: sp.customName || sp.productName,   // наша назва для відправки
        qty:         _barQtys[sp.productId] || 0,
        unit:        _barUnits[sp.productId] || (_balanceItems.find(b => b.id === sp.productId)?.unit) || 'од.',
        comment:     _barComments[sp.productId] || '',
      }))
      .filter(i => i.qty > 0);
    return { supplierId: s.id, supplierName: s.name, items };
  }).filter(s => s.items.length > 0);

  if (!suppliers.length) return;

  try {
    const res = await fetch(`${API}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body:    JSON.stringify({ venueId: _venueId, suppliers }),
    });
    const data = await res.json();
    if (!data.success) { alert(data.error || 'Помилка'); return; }
    _submitted = true;
    clearDraftStorage();   // після відправки чернетка більше не відновлюється
    fullRender();
  } catch (e) {
    alert('Мережева помилка: ' + e.message);
  }
}

function resetOrder() { _submitted = false; fullRender(); }

async function loadOrders() {
  _ordersLoading = true;
  fullRender();
  try {
    const res  = await fetch(`${API}/api/orders?venueId=${_venueId}`, {
      headers: { Authorization: `Bearer ${_token}` },
    });
    const data = await res.json();
    if (data.success) _orders = data.data || [];
  } catch (e) { /* silent */ }
  _ordersLoading = false;
  fullRender();
}

async function copySupplier(orderId, suppIdx, btnId) {
  const order = _orders.find(o => o.id === orderId);
  if (!order) return;
  const s = (order.suppliers || [])[suppIdx];
  if (!s) return;
  const items = (s.items || []).filter(i => (i.qty || 0) > 0);
  if (!items.length) return;

  // Повний готовий текст із супровідним (Доброго дня / ФОП / Заклад / оплата + перелік)
  const { text } = buildSupplierMessage(s);

  // Позначаємо «вже копіювали» (памʼять у localStorage — щоб не плутатись при копіюванні не по порядку)
  _copiedSupp.add(copiedKey(orderId, suppIdx)); saveCopied();
  const cb = document.getElementById(`copied-${orderId}-${suppIdx}`);
  if (cb) cb.textContent = '✓ вже копіювали';

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById(btnId);
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Скопійовано';
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green-border)';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
    }
  } catch {
    prompt('Скопіюйте вручну:', text);
  }
}

function toggleDoneOrder(id) {
  if (_expandedOrders.has(id)) _expandedOrders.delete(id);
  else _expandedOrders.add(id);
  fullRender();
}

// ── Супровідний текст замовлення для постачальника ──
function buildSupplierMessage(s) {
  const supp  = _suppliers.find(x => x.id === s.supplierId) || {};
  const items = (s.items || []).filter(i => (i.qty || 0) > 0);
  const lines = items.map(i => `• ${i.productName}${i.comment ? ` (${i.comment})` : ''} — ${i.qty} ${i.unit || 'од.'}`);
  const head  = ['Доброго дня!'];
  if (supp.fop)         head.push(`ФОП: ${supp.fop}`);
  if (state.venue)      head.push(`Заклад: ${state.venue}`);
  if (supp.paymentForm) head.push(`Форма оплати: ${supp.paymentForm}`);
  return { supp, text: `${head.join('\n')}\n\n${lines.join('\n')}` };
}

async function markOrderDone(id) {
  try {
    await fetch(`${API}/api/orders/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body:    JSON.stringify({ status: 'done' }),
    });
    const o = _orders.find(x => x.id === id);
    if (o) o.status = 'done';
    fullRender();
  } catch (e) { alert('Помилка: ' + e.message); }
}

/* ════════════════════════
   MANAGER ACTIONS
════════════════════════ */
function setMgrTab(tab) { _mgrTab = tab; fullRender(); if (tab === 'suggest' && _suggest === null) loadSuggest(); }

/* ── Supplier CRUD ── */
function openSuppAdd() {
  _suppDraft = { name: '', contact: '', orderDays: '', fop: '', paymentForm: '' };
  _suppError = '';
  _suppSheet = 'add';
  refreshSheetHost();
}

function openSuppEdit(suppId) {
  const s = _suppliers.find(x => x.id === suppId);
  if (!s) return;
  _suppDraft = { name: s.name, contact: s.contact || '', orderDays: s.orderDays || '', fop: s.fop || '', paymentForm: s.paymentForm || '' };
  _suppError = '';
  _suppSheet = suppId;
  refreshSheetHost();
}

function closeSuppSheet(e) {
  if (e && e.target?.id !== 'supp-sheet-ov') return;
  _suppSheet = null;
  refreshSheetHost();
}

function suppDraft(field, value) {
  _suppDraft[field] = value;
}

async function saveSuppEdit() {
  if (!_suppDraft.name.trim()) { _suppError = 'Введіть назву постачальника'; refreshSheetHost(); return; }
  _suppSaving = true;
  _suppError  = '';
  // Оновлюємо лише кнопку (без перерендеру sheet — щоб не «скакало»)
  const _btn = document.getElementById('supp-save-btn');
  if (_btn) { _btn.disabled = true; _btn.textContent = 'Збереження…'; }
  try {
    const isEdit = _suppSheet !== 'add';
    const url    = isEdit ? `${API}/api/suppliers/${_suppSheet}` : `${API}/api/suppliers`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body   = {
      name: _suppDraft.name.trim(), contact: _suppDraft.contact.trim(), orderDays: _suppDraft.orderDays.trim(),
      fop: (_suppDraft.fop||'').trim(), paymentForm: (_suppDraft.paymentForm||'').trim(),
    };
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
    // Закриваємо sheet після збереження + оновлюємо лише список (без «скоку» сторінки)
    _suppSheet  = null;
    _suppSaving = false;
    refreshSheetHost();
    refreshMgrSupps();
  } catch (err) {
    _suppError  = err.message;
    _suppSaving = false;
    refreshSheetHost();
  }
}

function openConfirm(opts) { _confirm = opts; refreshConfirmHost(); }
function closeConfirm()    { _confirm = null; refreshConfirmHost(); }
function confirmYes() {
  const act = _confirm && _confirm.action;
  _confirm = null; refreshConfirmHost();
  if (typeof act === 'function') act();
}

function deleteSuppConfirm(suppId) {
  const s = _suppliers.find(x => x.id === suppId);
  if (!s) return;
  openConfirm({
    title:        'Видалити постачальника?',
    message:      `Постачальник «${s.name}» та всі прив'язки його товарів будуть видалені. Дію не можна скасувати.`,
    confirmLabel: 'Видалити',
    danger:       true,
    action:       () => deleteSupp(suppId),
  });
}

async function deleteSupp(suppId) {
  try {
    await fetch(`${API}/api/suppliers/${suppId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${_token}` },
    });
    _suppliers = _suppliers.filter(x => x.id !== suppId);
    _suppSheet = null;
    refreshSheetHost();
    refreshMgrSupps();
  } catch (err) {
    alert('Помилка: ' + err.message);
  }
}

/* ── Product assignment ── */
function openProdPicker(suppId) {
  _prodPickerSupp = suppId;
  _prodSearch     = '';
  refreshPickerHost();
}

function closeProdPicker(e) {
  if (e && e.target?.id !== 'prod-picker-ov') return;
  _prodPickerSupp = null;
  refreshPickerHost();
}

function prodSearchChange(q) {
  _prodSearch = q;
  const supp = _suppliers.find(s => s.id === _prodPickerSupp);
  const list = document.getElementById('ord-pp-list');
  if (!supp || !list) return;
  const ql = q.toLowerCase();
  const filtered = _balanceItems.filter(b => !ql || b.name.toLowerCase().includes(ql));
  list.innerHTML = filtered.length === 0
    ? `<div style="padding:24px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:12px">${_balanceItems.length === 0 ? 'Залишки Syrve не завантажені' : 'Нічого не знайдено'}</div>`
    : filtered.map(b => pickerRowHTML(supp, b)).join('');
}

async function toggleProduct(suppId, productId, spId, ev) {
  const supp = _suppliers.find(s => s.id === suppId);
  if (!supp) return;
  // Назву беремо з балансу за productId (не передаємо через onclick, щоб не ламати лапками)
  const productName = _balanceItems.find(x => x.id === productId)?.name || '';
  // Запам'ятовуємо рядок ДО await (потім event.currentTarget стане null)
  const row = ev && ev.currentTarget ? ev.currentTarget : null;
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
  // Оновлюємо лише клікнутий рядок + лічильник товарів у панелі (без перерендеру/скоку)
  const b = _balanceItems.find(x => x.id === productId);
  if (row && b) row.outerHTML = pickerRowHTML(supp, b);
  refreshSuppProds();
}

function renameProduct(spId) {
  let sp = null;
  for (const s of _suppliers) { const f = (s.supplierProducts || []).find(x => x.id === spId); if (f) { sp = f; break; } }
  if (!sp) return;
  _rename = { id: spId, syrve: sp.productName, value: sp.customName || sp.productName || '' };
  refreshConfirmHost();
}
function renameInput(v) { if (_rename) _rename.value = v; }
function renameCancel() { _rename = null; refreshConfirmHost(); }
async function renameSave() {
  if (!_rename) return;
  const spId = _rename.id;
  const customName = (_rename.value || '').trim();
  _rename = null; refreshConfirmHost();
  let sp = null;
  for (const s of _suppliers) { const f = (s.supplierProducts || []).find(x => x.id === spId); if (f) { sp = f; break; } }
  if (!sp) return;

  // Оптимістично — показуємо назву одразу, не чекаючи мережу
  const prev = sp.customName || '';
  sp.customName = customName;
  refreshSuppProds();
  if (_prodPickerSupp) refreshPickerHost();

  // Зберігаємо у фоні; при помилці — відкат
  try {
    const res = await fetch(`${API}/api/suppliers/products/${spId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body:    JSON.stringify({ customName }),
    });
    if (!res.ok) throw new Error('save failed');
  } catch (err) {
    sp.customName = prev;
    refreshSuppProds();
    if (_prodPickerSupp) refreshPickerHost();
    alert('Не вдалося зберегти назву. Спробуйте ще раз.');
  }
}

/* ── Власний товар (тільки BarOps) ── */
function openCustomProd(suppId) { _customProd = { suppId, name: '' }; refreshConfirmHost(); }
function customInput(v) { if (_customProd) _customProd.name = v; }
function customCancel() { _customProd = null; refreshConfirmHost(); }
async function saveCustomProd() {
  if (!_customProd) return;
  const name = (_customProd.name || '').trim();
  if (!name) return;                       // порожню назву ігноруємо (діалог лишається)
  const suppId = _customProd.suppId;
  _customProd = null; refreshConfirmHost();
  const supp = _suppliers.find(s => s.id === suppId);
  if (!supp) return;
  const productId = 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    const res = await fetch(`${API}/api/suppliers/products`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body:    JSON.stringify({ supplierId: suppId, venueId: _venueId, productId, productName: name, customName: name }),
    });
    const data = await res.json();
    if (!data.success) { alert('Не вдалося додати товар'); return; }
    if (!supp.supplierProducts) supp.supplierProducts = [];
    supp.supplierProducts.push(data.supplierProduct);
    refreshSuppProds();
    if (_prodPickerSupp) refreshPickerHost();
  } catch (e) { alert('Помилка: ' + e.message); }
}

async function removeProduct(spId) {
  try {
    await fetch(`${API}/api/suppliers/products/${spId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${_token}` },
    });
    for (const s of _suppliers) {
      s.supplierProducts = (s.supplierProducts || []).filter(sp => sp.id !== spId);
    }
    // Оновлюємо лише секцію товарів у панелі (і пікер, якщо відкритий) — без скоку
    refreshSuppProds();
    if (_prodPickerSupp) refreshPickerHost();
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
    _barComments   = {};
    _barUnits      = {};
    _openCards     = new Set();
    _submitted     = false;
    _mgrTab        = 'orders';
    _suggest       = null;        // перезавантажити підказки під поточний заклад
    _orders          = [];
    _ordersLoading   = false;
    _expandedOrders  = new Set();
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
      toggleSupp, toggleProdCard, setUnit, changeQty, setQty, setComment, submitOrder, resetOrder, clearOrderConfirm, loadOrders, markOrderDone, toggleDoneOrder, copySupplier,
      setMgrTab, loadSuggest, toggleSuggestLow,
      openSuppAdd, openSuppEdit, closeSuppSheet, suppDraft, saveSuppEdit, deleteSuppConfirm,
      closeConfirm, confirmYes,
      openProdPicker, closeProdPicker, prodSearchChange, toggleProduct, removeProduct,
      renameProduct, renameInput, renameCancel, renameSave,
      openCustomProd, customInput, customCancel, saveCustomProd,
    };
    _venueId = state.venueId || localStorage.getItem('barops_venueId');
    _token   = localStorage.getItem('barops_token');
    if (!_venueId || !_token) { _loading = false; fullRender(); return; }
    loadDraft();   // відновити збережену чернетку заявки
    loadCopied();  // відновити позначки «вже копіювали»
    // ПОСЛІДОВНО: обидва ходять у Syrve (один REST-слот) — паралельний loadSuggest
    // програвав гонку балансу й повертався порожнім
    loadData().then(() => loadSuggest());
    if (state.role === 'admin' || state.role === 'manager' || state.role === 'director') loadOrders();
  },
};
