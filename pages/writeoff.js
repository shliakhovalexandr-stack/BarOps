/* ============================================================
   BarOps — pages/writeoff.js
   Списання: Бармен (список + 4-крокова форма) + Менеджер (аналітика + журнал)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const API  = 'https://barops-backend-production.up.railway.app';
let _prods     = [];   // завантажується з /api/pos/balance
let _writeoffs = [];   // зберігається в localStorage barops_writeoffs_v1

const REASONS = {
  biy:  ['Розбита пляшка (бій при роботі)', 'Пошкодження при транспортуванні', 'Падіння з полиці/стійки', 'Тріснула тара при відкритті'],
  psuv: ['Відкрита понад 48 годин', 'Змінився колір/запах', 'Прострочений термін придатності', 'Контакт з іншими рідинами'],
  deg:  ['Дегустація для гостя', 'Дегустація персоналом', 'Презентація нового меню', 'Навчання бармена'],
  insh: ['Помилковий налив', 'Технічні потреби (чистка обладнання)', 'Втрати при переливанні', 'Інша причина (вказати вручну)'],
};

const CAT = {
  biy:  { label:'💥 Бій',        color:'var(--red)',    bg:'var(--red-bg)',    border:'var(--red-border)',    selCls:'sel-biy'  },
  psuv: { label:'🍂 Псування',   color:'var(--amber)',  bg:'var(--amber-bg)',  border:'var(--amber-border)',  selCls:'sel-psuv' },
  deg:  { label:'🍸 Дегустація', color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)',  selCls:'sel-deg'  },
  insh: { label:'📋 Інше',       color:'var(--purple)', bg:'var(--purple-bg)', border:'var(--purple-border)', selCls:'sel-insh' },
};


/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _view       = 'bartender'; // 'bartender' | 'manager'
let _catFilter  = 'all';
let _formOpen   = false;
let _formStep   = 1;
let _selCat     = null;
let _selProd    = null;
let _selVol     = null;
let _selUnit    = 'l';
let _selReason  = null;
let _selAccount = null; // {id, name} — рахунок Syrve для цього списання
let _sentHistory = []; // [{ts, date, accounts, itemCount, acts}] — відправлені акти Syrve
let _prices      = {}; // productId → собівартість (unitPrice) з Syrve Office
let _priceSyncMsg = ''; // статус синхронізації цін
let _detailAct   = null; // (застаріле) відкритий акт для перегляду
let _detailDay   = null; // відкритий день історії (YYYY-MM-DD)
let _syrveConfirmOpen   = false;
let _syrveConfirmGroups = [];
let _syrveResult        = null; // { isError, lines:[] }
let _syrveStores        = []; // [{id, name}] — доступні склади для цього закладу
let _isPosterWo         = false; // заклад на Poster (модалка показує причину замість рахунків)
let _woReasons          = [];    // [{id, name}] — причини списання Poster
let _selReasonId        = null;  // обрана причина (Poster); null = Без причини
let _selReasonName      = '';    // назва обраної причини Poster (для відображення)
let _selStoreId         = null;
let _swipeListenerAdded = false;
let _prodSearch = '';
let _mgrPeriod  = 'day';
let _mgrFilter  = 'all';
let _mgrFrom    = ''; // YYYY-MM-DD для періоду «Обрати»
let _mgrTo      = '';
let _succOpen   = false;
let _transfers  = [];          // переміщення бар↔кухня (localStorage barops_transfers_v1)
let _formMode   = 'writeoff';  // 'writeoff' | 'transfer' — режим форми
let _editId     = null;        // id запису, що редагується (до відправки в Syrve)
let _transferDir = 'bar2kitchen'; // напрямок для admin: 'bar2kitchen' | 'kitchen2bar'
let _transferConfirmOpen = false; // стилізоване підтвердження надсилання переміщення
let _transferComment     = '';    // коментар до переміщення
let _transferResult = null;       // { sending } | { ok, msg }
let _prodTab      = 'goods';      // 'goods' | 'prep' — вкладка пікера товарів
let _preps        = [];           // напівфабрикати з /api/pos/preparations
let _prepsLoading = false;
let _prepsLoaded  = false;

// Назва POS для підписів (Poster для Poster-закладів, інакше Syrve)
function posName() { return _isPosterWo ? 'Poster' : 'Syrve'; }
// Зона ролі для складу списання: кухар→кухня, решта→бар
function roleZone() { const r = (state.role || '').toLowerCase(); return (r === 'cook' || r === 'chef') ? 'kitchen' : 'bar'; }
// Підпис звітного виду: для кухні (шеф/кухар) — «Кухня», інакше «Менеджер»
function woMgrLabel() { return roleZone() === 'kitchen' ? 'Кухня' : 'Менеджер'; }

// Дозволена зона товарів у писанні за роллю (Poster: є склади Бар/Кухня).
// bartender→бар, кухар/шеф→кухня, адмін/менеджер/керуючий/бухгалтер→усі.
function woAllowedZone() {
  const r = (state.role || '').toLowerCase();
  if (r === 'bartender' || r === 'barman') return 'bar';
  if (r === 'cook' || r === 'chef') return 'kitchen';
  return null;
}
// Зона-джерело для переміщення: показуємо товари складу, ЗВІДКИ переміщуємо
function transferSourceZone() {
  const r = (state.role || '').toLowerCase();
  if (r === 'cook' || r === 'chef') return 'kitchen';                 // кухар: кухня → бар
  if (r === 'admin') return _transferDir === 'kitchen2bar' ? 'kitchen' : 'bar';
  return 'bar';                                                       // бармен: бар → кухня
}

// Сітка причин на кроці 1: для Poster — реальні причини Poster; інакше — категорії BarOps
function catGridHTML() {
  if (_isPosterWo) {
    const opts = [{ id: null, name: 'Без причини', icon: '🚫', bg: 'var(--bg3)' },
                  ..._woReasons.map(r => ({ id: r.id, name: r.name, icon: '🍂', bg: 'var(--amber-bg)' }))];
    return `<div class="wo-cat-grid">${opts.map(r => {
      const sel = (_selCat === 'insh' && _selReasonId === r.id);
      const idArg = r.id === null ? 'null' : `'${String(r.id).replace(/'/g, "\\'")}'`;
      const nameArg = `'${String(r.name).replace(/'/g, "\\'")}'`;
      return `<div class="wo-cat-card ${sel ? 'sel-psuv' : ''}" onclick="window.__wo.selectPosterCat(${idArg}, ${nameArg})">
        <div class="wo-cat-icon" style="background:${r.bg}">${r.icon}</div>
        <div class="wo-cat-name">${r.name}</div>
      </div>`;
    }).join('')}</div>`;
  }
  return `<div class="wo-cat-grid">
    <div class="wo-cat-card ${_selCat==='biy'?'sel-biy':''}" onclick="window.__wo.selectCat('biy')"><div class="wo-cat-icon" style="background:var(--red-bg)">💥</div><div class="wo-cat-name">Бій</div><div class="wo-cat-desc">Розбита тара, механічне пошкодження</div></div>
    <div class="wo-cat-card ${_selCat==='psuv'?'sel-psuv':''}" onclick="window.__wo.selectCat('psuv')"><div class="wo-cat-icon" style="background:var(--amber-bg)">🍂</div><div class="wo-cat-name">Псування</div><div class="wo-cat-desc">Прострочення, зміна якості</div></div>
    <div class="wo-cat-card ${_selCat==='deg'?'sel-deg':''}" onclick="window.__wo.selectCat('deg')"><div class="wo-cat-icon" style="background:var(--green-bg)">🍸</div><div class="wo-cat-name">Дегустація</div><div class="wo-cat-desc">Персонал, гості, презентація</div></div>
    <div class="wo-cat-card ${_selCat==='insh'?'sel-insh':''}" onclick="window.__wo.selectCat('insh')"><div class="wo-cat-icon" style="background:var(--purple-bg)">📋</div><div class="wo-cat-name">Інше</div><div class="wo-cat-desc">Вказати вручну</div></div>
  </div>`;
}
// Які scope ПФ показувати: бармен бар+загальні, кухар кухня+загальні, менеджер усі
function prepScopesForRole() {
  const r = (state.role || '').toLowerCase();
  if (r === 'cook' || r === 'chef')                     return ['kitchen', 'general'];
  if (['admin', 'manager', 'director'].includes(r))     return ['bar', 'kitchen', 'general'];
  return ['bar', 'general'];
}

// Напрямок переміщення: кухар кухня→бар; admin обирає сам (_transferDir); решта (бармен) бар→кухня
function transferDir() {
  const r = (state.role || '').toLowerCase();
  if (r === 'admin') return _transferDir === 'kitchen2bar' ? { from: 'Кухня', to: 'Бар' } : { from: 'Бар', to: 'Кухня' };
  return (r === 'cook' || r === 'chef') ? { from: 'Кухня', to: 'Бар' } : { from: 'Бар', to: 'Кухня' };
}

/* ── Unit helpers ── */
function normalizeUnit(u) {
  const s = (u || '').toLowerCase().trim();
  if (['кг','kg','kilogram','kilograms','кілограм'].includes(s)) return 'kg';
  if (['г','g','gram','гр','грам'].includes(s))                  return 'g';
  if (['шт','sht','piece','pieces','порц','порция','порція','штук','штука'].includes(s)) return 'sht';
  if (['мл','ml','milliliter'].includes(s))                      return 'ml';
  return 'l';
}
function unitLabel(u) {
  return { l:'л', ml:'мл', kg:'кг', g:'г', sht:'шт' }[u || 'l'] || 'л';
}
function fmtStock(amount, u) {
  if (u === 'sht') return Math.round(amount || 0) + ' шт';
  return (amount || 0).toFixed(2) + ' ' + unitLabel(u);
}

/* Динамічний KPI з localStorage */
// Кількість у базовій одиниці (л / кг / шт) для множення на собівартість
function toBaseQty(volNum, unitKey) {
  if (unitKey === 'ml' || unitKey === 'g') return (volNum || 0) / 1000;
  return volNum || 0; // l, kg, sht
}
// Собівартість списаної позиції з Syrve Office (unitPrice × кількість у базовій од.)
function itemLoss(w) {
  const price = _prices[w.prodId];
  if (!price) return 0;
  return toBaseQty(w.volNum, w.unitKey) * price;
}

// Завантажити собівартість (ціни) з Syrve Office для закладу
async function loadPrices(vId) {
  try {
    const tok = localStorage.getItem('barops_token');
    const res = await fetch(`${API}/api/pos/syrve-prices?venueId=${encodeURIComponent(vId)}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    });
    if (res.ok) {
      const d = await res.json();
      _prices = {};
      for (const p of (d.prices || [])) _prices[p.productId] = p.unitPrice || 0;
    }
  } catch {}
}

// Запустити синхронізацію цін із Syrve (для збитку), потім перезавантажити
async function syncPricesWo() {
  const vId = state.venueId || localStorage.getItem('barops_venueId') || '';
  const tok = localStorage.getItem('barops_token');
  _priceSyncMsg = 'Синхронізую ціни… (~2 хв)';
  fullRender();
  try {
    await fetch(`${API}/api/pos/sync-prices/${vId}`, { method: 'POST', headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
  } catch {}
  setTimeout(async () => {
    await loadPrices(vId);
    const has = Object.values(_prices).some(v => v > 0);
    _priceSyncMsg = has ? '' : 'Ціни не знайдено в Syrve';
    fullRender();
  }, 2 * 60 * 1000);
}

function priceCount() { return Object.values(_prices).filter(v => v > 0).length; }

// Діапазон [since, until) для періоду (календарний тиждень Пн-Нд / місяць / діапазон)
function periodRange(period) {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week')  { const w = new Date(day); w.setDate(w.getDate() - ((w.getDay()||7) - 1)); return { since: w, until: new Date(w.getTime() + 7*86400000) }; }
  if (period === 'month') { return { since: new Date(now.getFullYear(), now.getMonth(), 1), until: new Date(now.getFullYear(), now.getMonth()+1, 1) }; }
  if (period === 'custom'){ return { since: _mgrFrom ? new Date(_mgrFrom+'T00:00:00') : null, until: _mgrTo ? new Date(_mgrTo+'T23:59:59.999') : null }; }
  return { since: day, until: new Date(day.getTime() + 86400000) }; // day
}
function inPeriod(ts, period) {
  const { since, until } = periodRange(period);
  const t = new Date(ts || 0);
  if (since && t < since) return false;
  if (until && t >= until) return false;
  return true;
}

// KPI за період. sentOnly=true — лише надіслані (для менеджера)
function getMgrKpi(period, sentOnly) {
  const list  = _writeoffs.filter(w => inPeriod(w.ts, period) && (!sentOnly || w.sentAt));
  const loss  = list.reduce((s,w) => s + itemLoss(w), 0);
  const lossR = Math.round(loss);
  return { count: list.length.toString(), loss: lossR>0 ? lossR+'₴' : '—' };
}

// ── Історія: групування надісланих по даті ───────────────────
function fmtDayLabel(key) {
  if (!key) return '';
  if (key === woTodayStr('iso')) return 'Сьогодні';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === y.toISOString().slice(0, 10)) return 'Вчора';
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

// Список історії (надіслані, згруповані по даті). list — масив надісланих списань
function historyHTML(list, title) {
  const byDay = {};
  for (const w of list) { const k = (w.ts || '').slice(0, 10); if (!k) continue; (byDay[k] ||= []).push(w); }
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  const inner = days.length ? days.map(([k, items]) => {
    const loss = items.reduce((s, w) => s + itemLoss(w), 0);
    return `<div class="wo-act-card" onclick="window.__wo.openDay('${k}')">
      <div style="width:32px;height:32px;border-radius:9px;background:var(--purple-bg);border:0.5px solid var(--purple-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="1.6"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke-linecap="round"/></svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--text0);font-family:var(--font-b)">${fmtDayLabel(k)}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)">${items.length} поз.</div>
      </div>
      <div style="text-align:right;flex-shrink:0;display:flex;align-items:center;gap:8px">
        ${loss > 0 ? `<div style="font-size:13px;font-family:var(--font-h);font-weight:700;color:var(--purple)">${Math.round(loss)}₴</div>` : ''}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </div>
    </div>`;
  }).join('') : `<div style="padding:18px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;text-align:center"><div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Немає надісланих списань</div></div>`;
  return `<div class="wo-sec" style="padding-top:10px">${title || 'Історія'}</div>
    <div class="wo-list" style="margin-bottom:16px">${inner}</div>`;
}

// Деталь одного дня (повний день з причиною/коментарем/автором)
function dayDetailHTML() {
  const open  = !!_detailDay;
  const items = open
    ? _writeoffs.filter(w => w.sentAt && (w.ts || '').slice(0, 10) === _detailDay)
                .sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')))
    : [];
  const totalLoss = items.reduce((s, w) => s + itemLoss(w), 0);
  return `<div class="wo-detail-overlay ${open ? 'open' : ''}" onclick="if(event.target===this)window.__wo.closeDay()">
    <div class="wo-detail-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div style="flex:1">
          <div class="wo-sheet-title">Списання · ${open ? fmtDayLabel(_detailDay) : ''}</div>
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">${items.length} поз.${totalLoss > 0 ? ` · збиток ~${Math.round(totalLoss)}₴` : ''}</div>
        </div>
        <div class="wo-sheet-close" onclick="window.__wo.closeDay()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="wo-detail-scroll">
        ${items.map(w => {
          const loss = itemLoss(w);
          return `<div style="padding:11px 12px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:12px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div style="font-size:14px;color:var(--text0);font-family:var(--font-b);flex:1;min-width:0">${w.prod}</div>
              <div style="font-family:var(--font-h);font-weight:700;font-size:14px;color:${CAT[w.cat]?.color||'var(--text0)'};flex-shrink:0">${w.vol||'—'}</div>
            </div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:6px;line-height:1.6">
              <span style="color:${CAT[w.cat]?.color||'var(--text2)'};font-weight:600">${CAT[w.cat]?.label||''}</span>
              ${w.reason ? ` · причина: ${w.reason}` : ''}
              ${w.note ? ` · коментар: ${w.note}` : ''}
              ${w.time ? ` · ${w.time}` : ''}
              ${w.author ? ` · ${w.author}` : ''}
              ${loss > 0 ? ` · ${Math.round(loss)}₴` : ''}
            </div>
          </div>`;
        }).join('') || '<div style="padding:20px;text-align:center;color:var(--text2);font-family:var(--font-b);font-size:13px">Порожньо</div>'}
      </div>
    </div>
  </div>`;
}

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="wo-css">
.wo-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.wo-scroll{overflow-y:auto;flex:1}.wo-scroll::-webkit-scrollbar{width:0}

/* topbar */
.wo-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.wo-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.wo-back:active{background:rgba(255,255,255,.08)}
.wo-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.wo-sub{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}

/* today summary */
.wo-summary{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 10px}
.wo-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r,12px);padding:12px 10px;text-align:center;position:relative;overflow:hidden}
.wo-stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 12px 12px}
.wo-stat-r::after{background:var(--red)}.wo-stat-a::after{background:var(--amber)}.wo-stat-p::after{background:var(--purple)}
.wo-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.wo-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;line-height:1.3}

/* alert strip */
.wo-alert{margin:0 14px 10px;border-radius:12px;padding:10px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-family:var(--font-b);line-height:1.5;background:var(--amber-bg);border:1px solid var(--amber-border);color:var(--amber)}
.wo-alert-icon{width:26px;height:26px;border-radius:8px;background:rgba(251,191,36,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* sec label */
.wo-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.wo-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* cat pills */
.wo-pills{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-pills::-webkit-scrollbar{height:0}
.wo-pill{flex-shrink:0;display:flex;align-items:center;gap:5px;padding:5px 13px;border-radius:20px;border:0.5px solid var(--border);color:var(--text2);background:transparent;cursor:pointer;font-size:12px;font-family:var(--font-b);transition:all .15s}
.wo-pill-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.wo-pill.pill-all.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-biy.act{background:var(--red-bg);border-color:var(--red-border);color:var(--text0)}
.wo-pill.pill-psuv.act{background:var(--amber-bg);border-color:var(--amber-border);color:var(--text0)}
.wo-pill.pill-deg.act{background:var(--green-bg);border-color:var(--green-border);color:var(--text0)}
.wo-pill.pill-insh.act{background:var(--purple-bg);border-color:var(--purple-border);color:var(--text0)}

/* write-off list */
.wo-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.wo-swipe-wrap{position:relative;border-radius:12px;overflow:hidden}
.wo-swipe-del{position:absolute;right:0;top:0;bottom:0;width:76px;background:var(--red);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;border-radius:0 12px 12px 0;flex-shrink:0}
.wo-swipe-del-lbl{font-size:11px;color:#fff;font-family:var(--font-b);font-weight:600}
.wo-swipe-edit{position:absolute;right:76px;top:0;bottom:0;width:76px;background:var(--purple,#A88BFF);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;flex-shrink:0}
.wo-swipe-edit-lbl{font-size:11px;color:#fff;font-family:var(--font-b);font-weight:600}
.wo-card{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;display:flex;align-items:center;gap:10px;padding:11px 13px;transition:transform .25s cubic-bezier(.22,1,.36,1);position:relative;z-index:1;will-change:transform}
.wo-bar{width:3px;height:38px;border-radius:2px;flex-shrink:0}
.wo-emoji{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.wo-info{flex:1;min-width:0}
.wo-name{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wo-meta{font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.wo-right{text-align:right;flex-shrink:0}
.wo-vol{font-family:var(--font-h);font-size:15px;font-weight:700}
.wo-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}

/* add button */
.wo-add{display:flex;align-items:center;gap:10px;padding:13px;background:var(--red-bg);border:0.5px dashed var(--red-border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-add:hover{background:rgba(248,113,113,.12)}
.wo-add:active{transform:scale(.98)}
.wo-add-icon{width:34px;height:34px;border-radius:9px;background:rgba(248,113,113,.12);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wo-add-text{font-size:14px;color:var(--red);font-family:var(--font-b);font-weight:500}
.wo-add-sub{font-size:11px;color:rgba(248,113,113,.50);font-family:var(--font-b);margin-top:1px}

/* ── FORM SHEET ── */
.wo-form-overlay{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.75);display:none;flex-direction:column;justify-content:flex-end}
.wo-form-overlay.open{display:flex}
.wo-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 28px;animation:woSlide .32s cubic-bezier(.22,1,.36,1);max-height:92%;display:flex;flex-direction:column}
@keyframes woSlide{from{transform:translateY(100%)}to{transform:none}}
.wo-sheet-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 16px;flex-shrink:0}
.wo-sheet-hdr{padding:0 18px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.wo-sheet-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.wo-sheet-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer}

/* step dots */
.wo-dots{display:flex;gap:5px;justify-content:center;margin-bottom:18px;flex-shrink:0}
.wo-dot{width:8px;height:8px;border-radius:50%;background:var(--bg4);transition:all .2s}
.wo-dot.act{background:var(--red);width:20px;border-radius:4px}
.wo-dot.done{background:var(--green)}

.wo-scroll2{overflow-y:auto;flex:1;padding:0 18px}
.wo-scroll2::-webkit-scrollbar{width:0}

/* form steps */
.wo-fstep{display:none;flex-direction:column;gap:14px}
.wo-fstep.act{display:flex;animation:woFadeUp .25s ease both}
@keyframes woFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* cat grid */
.wo-cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wo-cat-card{background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:16px;padding:14px 12px;cursor:pointer;transition:all .18s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
.wo-cat-card:active{transform:scale(.96)}
.wo-cat-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px}
.wo-cat-name{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.wo-cat-desc{font-size:10px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.sel-biy{border-color:var(--red-border)!important;background:var(--red-bg)!important}
.sel-psuv{border-color:var(--amber-border)!important;background:var(--amber-bg)!important}
.sel-deg{border-color:var(--green-border)!important;background:var(--green-bg)!important}
.sel-insh{border-color:var(--purple-border)!important;background:var(--purple-bg)!important}

/* prod list */
.wo-prod-search-wrap{position:relative}
.wo-prod-search-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);pointer-events:none}
.wo-prod-inp{width:100%;height:48px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:0 14px 0 38px;font-size:16px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}/* 16px — інакше iOS зумить при фокусі */
.wo-prod-inp:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-prod-inp::placeholder{color:var(--text2)}
.wo-prod-list{display:flex;flex-direction:column;gap:5px;max-height:220px;overflow-y:auto}
.wo-prod-list::-webkit-scrollbar{width:0}
.wo-prod-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-prod-item:active{transform:scale(.98)}
.wo-prod-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-pi-emoji{width:32px;height:32px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.wo-pi-name{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-pi-stock{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-pi-check{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.wo-prod-item.sel .wo-pi-check{background:var(--red);border-color:var(--red)}

/* volume step */
.wo-vol-field{display:block;width:100%;box-sizing:border-box;height:64px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;font-size:28px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;text-align:center;transition:border-color .2s}
.wo-vol-field:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-unit-row{display:flex;justify-content:center;gap:8px;margin-top:10px}
.wo-unit-btn{height:30px;padding:0 20px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:10px;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;transition:all .15s}
.wo-unit-btn.act{background:var(--purple-bg);border-color:var(--purple-border);color:var(--purple);font-weight:600}
.wo-presets{display:flex;gap:6px;flex-wrap:wrap}
.wo-preset{flex:1;min-width:56px;height:36px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-preset:active{transform:scale(.95)}
.wo-preset.act{background:var(--red-bg);border-color:var(--red-border);color:var(--red)}
.wo-stock-preview{background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;padding:10px 13px;display:flex;justify-content:space-between;align-items:center}
.wo-sp-label{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.wo-sp-name{font-family:var(--font-h);font-size:13px;color:var(--text0);font-weight:600;margin-top:2px}
.wo-sp-before{font-size:12px;color:var(--text2);font-family:var(--font-b);text-align:right}
.wo-sp-after{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--red);text-align:right}

/* reason step */
.wo-reason-list{display:flex;flex-direction:column;gap:6px}
.wo-reason-item{display:flex;align-items:center;gap:10px;padding:10px 13px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;cursor:pointer;transition:all .15s}
.wo-reason-item:active{transform:scale(.98)}
.wo-reason-item.sel{border-color:var(--red-border);background:var(--red-bg)}
.wo-reason-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-reason-text{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-custom-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.wo-textarea{width:100%;height:78px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:11px 14px;font-size:16px;color:var(--text0);font-family:var(--font-b);resize:none;outline:none;line-height:1.5;transition:border-color .2s}/* 16px — інакше iOS зумить при фокусі */
.wo-textarea:focus{border-color:var(--red);box-shadow:0 0 0 2px rgba(248,113,113,.10)}
.wo-textarea::placeholder{color:var(--text2)}

/* summary */
.wo-summary-card{background:var(--red-bg);border:1px solid var(--red-border);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:9px}
.wo-sum-row{display:flex;justify-content:space-between;align-items:center}
.wo-sum-label{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.wo-sum-val{font-size:13px;color:var(--text1);font-family:var(--font-b);text-align:right}
.wo-sum-val-big{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--red);text-align:right}
.wo-sum-div{height:0.5px;background:var(--red-border)}

/* form nav */
.wo-fnav{display:flex;gap:8px;padding:14px 18px 0;flex-shrink:0}
.wo-fnext{flex:1;height:52px;background:var(--green);border:none;border-radius:14px;font-size:15px;font-weight:600;color:#000;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.wo-fnext:active{opacity:.85}
.wo-fnext:disabled{opacity:.35;cursor:default}
.wo-fback{width:50px;height:50px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s}
.wo-fback:active{background:var(--bg4)}

/* success overlay */
.wo-succ-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.8);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.wo-succ-overlay.open{display:flex}
.wo-succ-icon{width:72px;height:72px;border-radius:50%;background:var(--red-bg);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;margin-bottom:18px;animation:woPop .4s cubic-bezier(.22,1,.36,1)}
@keyframes woPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.wo-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px}
.wo-succ-sub{font-size:14px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:6px}
.wo-succ-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:20px;font-size:12px;color:var(--red);font-family:var(--font-b);margin-bottom:22px}
.wo-succ-btn{width:100%;max-width:280px;height:50px;background:var(--red);border:none;border-radius:12px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px}
.wo-succ-btn:active{background:var(--red-d)}
.wo-succ-ghost{width:100%;max-width:280px;height:44px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);margin-top:8px}

/* ── MANAGER VIEW ── */
.wo-period-tabs{display:flex;gap:2px;margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.wo-pt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.wo-pt.act{background:var(--bg3);color:var(--text0)}
.wo-daterange{display:flex;gap:8px;margin:0 14px 10px}
.wo-dr-field{flex:1;display:flex;flex-direction:column;gap:4px}
.wo-dr-field span{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;padding-left:2px}
.wo-dr-field input{height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;color:var(--text0);font-size:13px;font-family:var(--font-b);padding:0 10px;outline:none;color-scheme:dark}
.wo-dr-field input:focus{border-color:var(--purple)}

.wo-mgr-kpi{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 4px}
.wo-mk{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:11px 10px;text-align:center}
.wo-mk-val{font-family:var(--font-h);font-size:20px;font-weight:700;line-height:1}
.wo-mk-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}


.wo-cat-breakdown{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.wo-cb-row{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px}
.wo-cb-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.wo-cb-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.wo-cb-bar-wrap{height:4px;background:var(--bg3);border-radius:2px;margin-top:5px;overflow:hidden}
.wo-cb-fill{height:100%;border-radius:2px}
.wo-cb-count{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right}
.wo-cb-pct{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

.wo-report-card{margin:0 14px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:16px;padding:14px 16px}
.wo-rc-title{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);margin-bottom:4px}
.wo-rc-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:12px;line-height:1.5}
.wo-rc-btns{display:flex;gap:6px}
.wo-rcbtn{flex:1;height:40px;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-family:var(--font-b);font-weight:500;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
.wo-rcbtn:active{transform:scale(.96)}
.wo-rcbtn-pdf{background:var(--red);color:#fff}
.wo-rcbtn-csv{background:rgba(255,255,255,.06);border:0.5px solid var(--border);color:var(--text1)}
.wo-rcbtn-tg{background:var(--blue-bg);border:0.5px solid var(--blue-border);color:var(--blue)}

.wo-filter-row{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}
.wo-filter-row::-webkit-scrollbar{height:0}
.wo-fr-pill{flex-shrink:0;padding:5px 12px;border-radius:20px;border:0.5px solid var(--border);color:var(--text2);background:transparent;font-size:11px;font-family:var(--font-b);cursor:pointer;transition:all .15s}
.wo-fr-pill.act{background:var(--bg3);border-color:var(--border3);color:var(--text0)}

.wo-log{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-act-card{background:rgba(139,92,246,.08);border:0.5px solid var(--purple-border);border-radius:12px;display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;transition:background .15s}
.wo-act-card:hover{background:rgba(139,92,246,.14)}
.wo-act-card:active{transform:scale(.98)}
.wo-detail-overlay{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.75);display:none;flex-direction:column;justify-content:flex-end}
.wo-detail-overlay.open{display:flex}
.wo-detail-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 32px;max-height:80%;display:flex;flex-direction:column;animation:woSlide .28s cubic-bezier(.22,1,.36,1)}
.wo-detail-scroll{overflow-y:auto;flex:1;padding:0 18px 4px}
.wo-detail-scroll::-webkit-scrollbar{width:0}
.wo-ctx-menu{position:fixed;z-index:9999;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.5);min-width:140px;animation:woFadeUp .12s ease both}
.wo-ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:7px;cursor:pointer;font-size:13px;font-family:var(--font-b);color:var(--red);transition:background .12s}
.wo-ctx-item:hover{background:var(--red-bg)}
.wo-log-item{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s}
.wo-log-item:last-child{border-bottom:none}
.wo-log-item:active{background:rgba(255,255,255,.08)}
.wo-log-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wo-log-title{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.wo-log-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-log-qty{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right}
.wo-log-time{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

.wo-toplosers{margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.wo-loser-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:1px solid var(--border)}
.wo-loser-row:last-child{border-bottom:none}
.wo-loser-rank{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text3);width:18px;flex-shrink:0}
.wo-loser-name{font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1}
.wo-loser-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.wo-loser-val{font-family:var(--font-h);font-size:14px;font-weight:700}

/* ── CARD DELETE BTN ── */
.wo-card-del{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s}
.wo-card-del:active{background:var(--red-bg);border-color:var(--red-border)}
.wo-card-del:active svg path{stroke:var(--red)}

/* ── SYRVE CONFIRM MODAL ── */
.wo-syrve-conf-overlay{position:absolute;inset:0;z-index:55;background:rgba(0,0,0,.80);display:none;flex-direction:column;justify-content:flex-end}
.wo-syrve-conf-overlay.open{display:flex}
.wo-syrve-conf-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 28px;max-height:80%;display:flex;flex-direction:column;animation:woSlide .28s cubic-bezier(.22,1,.36,1)}
.wo-syrve-conf-scroll{overflow-y:auto;flex:1;padding:0 18px 8px}
.wo-syrve-conf-scroll::-webkit-scrollbar{width:0}

/* ── SYRVE RESULT MODAL ── */
.wo-syrve-res-overlay{position:absolute;inset:0;z-index:56;background:rgba(0,0,0,.80);display:none;flex-direction:column;justify-content:flex-end}
.wo-syrve-res-overlay.open{display:flex}
.wo-syrve-res-sheet{background:var(--bg1);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border);padding:0 0 28px;display:flex;flex-direction:column;animation:woSlide .28s cubic-bezier(.22,1,.36,1)}
.wo-syrve-res-body{padding:6px 18px 0;display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow-y:auto}
.wo-syrve-res-body::-webkit-scrollbar{width:0}
</style>`;

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
// Підпис під товаром: показуємо причину; категорію — лише якщо осмислена
// (дефолтне «Інше» не показуємо — воно зайве).
function woMeta(w) {
  if (w.reason) return w.reason;
  return (w.cat && w.cat !== 'insh') ? (CAT[w.cat]?.label || '') : '';
}
function woCardHTML(w) {
  return `
    <div class="wo-swipe-wrap" data-id="${w.id}">
      <div class="wo-swipe-edit" onclick="window.__wo.editWriteoff('${w.id}')">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 15l2.5-.6 8-8-1.9-1.9-8 8L3 15z" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3.5l1.9 1.9" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>
        <span class="wo-swipe-edit-lbl">Змінити</span>
      </div>
      <div class="wo-swipe-del" onclick="window.__wo.deleteWriteoff('${w.id}')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M7 5V3h4v2M7.5 8.5v5M10.5 8.5v5M4 5l1 10h8l1-10" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="wo-swipe-del-lbl">Видалити</span>
      </div>
      <div class="wo-card" data-cat="${w.cat}" data-id="${w.id}">
        <div class="wo-bar" style="background:${CAT[w.cat]?.color||'var(--text2)'}"></div>
        <div class="wo-card-del" onclick="event.stopPropagation();window.__wo.deleteWriteoff('${w.id}')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="wo-info">
          <div class="wo-name">${w.prod}</div>
          <div class="wo-meta">${woMeta(w)}</div>
        </div>
        <div class="wo-right">
          <div class="wo-vol" style="color:${w.valColor}">${w.vol}</div>
          <div class="wo-time">${w.dateStr || w.time}</div>
        </div>
      </div>
    </div>`;
}

function woList() {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const filtered = [..._writeoffs].reverse().filter(w => !w.sentAt && (_catFilter === 'all' || w.cat === _catFilter));
  const todayItems = filtered.filter(w => new Date(w.ts || 0) >= todayStart);
  const prevItems  = filtered.filter(w => new Date(w.ts || 0) < todayStart);

  if (!todayItems.length && !prevItems.length) {
    return `<div style="text-align:center;padding:32px 16px;color:var(--text2);font-family:var(--font-b);font-size:13px;line-height:1.6">Списань за зміну немає.<br>Натисніть «Додати списання» нижче.</div>`;
  }

  let html = todayItems.map(woCardHTML).join('');

  if (prevItems.length) {
    html += `<div style="margin:16px 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text2);font-family:var(--font-mono)">Попередні зміни</div>`;
    html += prevItems.map(woCardHTML).join('');
  }
  return html || `<div style="text-align:center;padding:32px 16px;color:var(--text2);font-family:var(--font-b);font-size:13px">Нічого не знайдено</div>`;
}

function woTodayStr(fmt) {
  const d = new Date();
  if (fmt === 'iso') return d.toISOString().slice(0, 10);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function renderBartender() {
  return `
  <div class="wo-topbar" style="flex-shrink:0">
    <div class="wo-back" onclick="${(state.role || '').toLowerCase() === 'accountant' ? 'window.__barops.openDrawer()' : "window.__barops.navigate('dashboard')"}">
      ${(state.role || '').toLowerCase() === 'accountant'
        ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
    </div>
    <div style="flex:1">
      <div class="wo-title">Списання</div>
      <div class="wo-sub">${state.venue} · Зміна від ${woTodayStr()}</div>
    </div>
    <div style="font-family:var(--font-h);font-size:12px;color:var(--red);font-weight:700">${_writeoffs.length} записів</div>
  </div>

  <div class="wo-scroll">
    <!-- Today stats -->
    ${(() => {
      const kpi = getMgrKpi('day');
      return `<div class="wo-summary">
        <div class="wo-stat wo-stat-r">
          <div class="wo-stat-val" style="color:var(--red)">${kpi.count}</div>
          <div class="wo-stat-lbl">Записів<br/>сьогодні</div>
        </div>
        <div class="wo-stat wo-stat-p">
          <div class="wo-stat-val" style="color:var(--purple)">${kpi.loss}</div>
          <div class="wo-stat-lbl">Збиток<br/>за зміну</div>
        </div>
      </div>`;
    })()}

    <!-- Category filter -->
    <div class="wo-sec" style="padding-top:4px">Фільтр за категорією</div>
    <div class="wo-pills">
      ${[['all','Всі','var(--red)','pill-all'],['biy','Бій','var(--red)','pill-biy'],['psuv','Псування','var(--amber)','pill-psuv'],['deg','Дегустація','var(--green)','pill-deg'],['insh','Інше','var(--purple)','pill-insh']]
        .map(([cat,label,col,cls]) => `
        <div class="wo-pill ${cls} ${_catFilter===cat?'act':''}" onclick="window.__wo.setCatFilter('${cat}')">
          <div class="wo-pill-dot" style="background:${col}"></div>${label}
        </div>`).join('')}
    </div>

    <!-- List -->
    <div class="wo-sec">Список за зміну</div>
    <div class="wo-list" id="wo-list">${woList()}</div>

    <!-- Add button -->
    <div style="padding:8px 14px 0">
      <div class="wo-add" onclick="window.__wo.openForm()">
        <div class="wo-add-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Додати списання</div>
          <div class="wo-add-sub">Бій · Псування · Дегустація · Інше</div>
        </div>
      </div>
    </div>

    <!-- Add transfer button -->
    <div style="padding:8px 14px 0">
      <div class="wo-add" style="border-color:var(--teal-border,rgba(45,212,191,.35))" onclick="window.__wo.openForm('transfer')">
        <div class="wo-add-icon" style="background:var(--teal-bg,rgba(45,212,191,.12))">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6h8M8 3l3 3-3 3M13 10H5M8 13l-3-3 3-3" stroke="var(--teal,#2DD4BF)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Зафіксувати переміщення</div>
          <div class="wo-add-sub">${transferDir().from} → ${transferDir().to} (внутрішнє)</div>
        </div>
      </div>
    </div>

    <!-- Transfers list + send -->
    ${(() => {
      const pend = _transfers.filter(t => t.prodId && !t.sentAt);
      const dir  = transferDir();
      if (!_transfers.length) return '';
      return `
      <div class="wo-sec" style="padding-top:14px">Переміщення · ${dir.from} → ${dir.to}</div>
      <div class="wo-list">${transferListHTML()}</div>
      <div style="margin:10px 14px 0;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--teal-bg,rgba(45,212,191,.12));border:0.5px solid var(--teal-border,rgba(45,212,191,.35));display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 7h9M9 4l3 3-3 3M15 11H6M9 14l-3-3 3-3" stroke="var(--teal,#2DD4BF)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-family:var(--font-b);color:var(--text0)">Переміщення на ${posName()}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${pend.length ? `${pend.length} поз. · ${dir.from} → ${dir.to}` : 'Немає нових позицій'}</div>
        </div>
        <button id="wo-transfer-btn" onclick="window.__wo.sendTransferToSyrve()" ${!pend.length ? 'disabled' : ''}
          style="padding:7px 14px;border-radius:20px;border:0.5px solid var(--teal-border,rgba(45,212,191,.35));background:${pend.length ? 'var(--teal-bg,rgba(45,212,191,.12))' : 'var(--bg2)'};color:${pend.length ? 'var(--teal,#2DD4BF)' : 'var(--text3)'};font-size:12px;font-family:var(--font-b);cursor:${pend.length ? 'pointer' : 'default'};white-space:nowrap">
          Надіслати
        </button>
      </div>`;
    })()}

    <!-- Syrve send -->
    ${(() => {
      // Ненадіслані позиції з товаром
      const sendWo = _writeoffs.filter(w => w.prodId && !w.sentAt);
      return `<div style="margin:12px 14px 0;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--purple-bg);border:0.5px solid var(--purple-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--purple)" stroke-width="1.2"/><path d="M6 7h6M6 10h4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/><path d="M2 6h14" stroke="var(--purple)" stroke-width="1.2"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-family:var(--font-b);color:var(--text0)">Акт списання</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${sendWo.length ? `${sendWo.length} поз. до надсилання` : 'Немає списань з товаром'}</div>
        </div>
        <button id="wo-syrve-btn" onclick="window.__wo.sendActToSyrve()"
          ${!sendWo.length ? 'disabled' : ''}
          style="padding:7px 14px;border-radius:20px;border:0.5px solid var(--purple-border);background:${sendWo.length ? 'var(--purple-bg)' : 'var(--bg2)'};color:${sendWo.length ? 'var(--purple)' : 'var(--text3)'};font-size:12px;font-family:var(--font-b);cursor:${sendWo.length ? 'pointer' : 'default'};white-space:nowrap">
          Надіслати
        </button>
      </div>`;
    })()}

    <!-- Історія (надіслані, по даті) -->
    ${historyHTML(_writeoffs.filter(w => w.sentAt), 'Історія')}

    <div style="height:16px"></div>
  </div>

  <!-- ── FORM SHEET ── -->
  <div class="wo-form-overlay ${_formOpen?'open':''}" id="wo-form-overlay"
       onclick="window.__wo.maybeClose(event)">
    <div class="wo-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div class="wo-sheet-title" id="wo-sheet-title">${_formMode==='transfer' ? (_editId ? 'Редагувати переміщення' : `Переміщення · ${transferDir().from} → ${transferDir().to}`) : (_editId ? 'Редагувати списання' : 'Нове списання')}</div>
        <div class="wo-sheet-close" onclick="window.__wo.closeForm()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>

      <!-- Step dots -->
      <div class="wo-dots">
        ${[1,2,3,4].map(i => `<div class="wo-dot ${_formStep===i?'act':_formStep>i?'done':''}" id="wdot${i}"></div>`).join('')}
      </div>

      <div class="wo-scroll2" id="wo-scroll2">

        <!-- Step 1: Account (if configured) or Category -->
        <div class="wo-fstep ${_formStep===1?'act':''}" id="wfstep1">
          ${(() => {
            const accounts = getWoAccounts();
            if (accounts.length) {
              return `
                <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть рахунок списання</div>
                <div class="wo-reason-list">
                  ${accounts.map(a => `
                  <div class="wo-reason-item ${_selAccount?.id===a.id?'sel':''}"
                       onclick="window.__wo.selectAccount('${a.id}','${a.name.replace(/'/g,"\\'")}')">
                    <div class="wo-reason-dot" style="background:var(--purple)"></div>
                    <div class="wo-reason-text">${a.name}</div>
                    ${_selAccount?.id===a.id?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
                  </div>`).join('')}
                </div>`;
            }
            return `
              <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть причину списання</div>
              ${catGridHTML()}`;
          })()}
        </div>

        <!-- Step 2: Product -->
        <div class="wo-fstep ${_formStep===2?'act':''}" id="wfstep2">
          <div style="display:flex;gap:6px;margin-bottom:12px">
            <button onclick="window.__wo.setProdTab('goods')" style="flex:1;height:36px;border-radius:10px;border:0.5px solid ${_prodTab!=='prep'?'var(--purple)':'var(--border)'};background:${_prodTab!=='prep'?'var(--purple-bg)':'transparent'};color:${_prodTab!=='prep'?'var(--purple)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Товари</button>
            <button onclick="window.__wo.setProdTab('prep')" style="flex:1;height:36px;border-radius:10px;border:0.5px solid ${_prodTab==='prep'?'var(--purple)':'var(--border)'};background:${_prodTab==='prep'?'var(--purple-bg)':'transparent'};color:${_prodTab==='prep'?'var(--purple)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Напівфабрикати</button>
          </div>
          <div class="wo-prod-search-wrap">
            <svg class="wo-prod-search-ico" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/>
              <path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            <input class="wo-prod-inp" id="wo-prod-search" placeholder="${_prodTab==='prep'?'Пошук напівфабрикату…':'Пошук товару…'}"
              value="${_prodSearch}" oninput="window.__wo.searchProds(this.value)"/>
          </div>
          <div class="wo-prod-list" id="wo-prod-list">${_prodTab==='prep'?prepListHTML():prodListHTML()}</div>
        </div>

        <!-- Step 3: Volume -->
        <div class="wo-fstep ${_formStep===3?'act':''}" id="wfstep3">
          <div>
            <div class="wo-custom-lbl">Об'єм списання</div>
            <input class="wo-vol-field" id="wo-vol-input" type="number" step="0.001"
              placeholder="0" value="${_selVol||''}"
              oninput="window.__wo.updateVol()"/>
            ${(() => {
              const unitOpts = _selProd?.unit==='kg'  ? [['kg','кг'],['g','г']]
                             : _selProd?.unit==='g'   ? [['g','г'],['kg','кг']]
                             : _selProd?.unit==='sht' ? [['sht','шт']]
                             : _selProd?.unit==='ml'  ? [['ml','мл'],['l','л']]
                             :                         [['l','л'],['ml','мл']];
              return `<div class="wo-unit-row">${unitOpts.map(([u,lbl])=>`<button class="wo-unit-btn ${_selUnit===u?'act':''}" data-u="${u}" onclick="window.__wo.setUnit('${u}')">${lbl}</button>`).join('')}</div>`;
            })()}
          </div>
          <div class="wo-presets">
            ${_selProd ? (() => {
              const pu = _selProd.unit || 'l';
              if (pu === 'sht') {
                return [1,2,3,5,10].map(v =>
                  `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                    onclick="window.__wo.setVol(${v})">${v} шт</button>`
                ).join('');
              }
              if (pu === 'kg' || pu === 'g') {
                return [0.1,0.25,0.5,1,2].map(v =>
                  `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                    onclick="window.__wo.setVol(${v})">${v} кг</button>`
                ).join('');
              }
              const vol = _selProd.vol || 0.7;
              const presets = [
                [parseFloat((vol*0.1).toFixed(3)), `10%`],
                [parseFloat((vol*0.25).toFixed(3)), `25%`],
                [parseFloat((vol*0.5).toFixed(3)), `½`],
                [parseFloat((vol*0.75).toFixed(3)), `75%`],
                [vol, `1 пляш.`],
              ];
              return presets.map(([v,lbl]) =>
                `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                  onclick="window.__wo.setVol(${v})">${lbl}<br/><span style="font-size:9px;opacity:.7">${v} л</span></button>`
              ).join('');
            })() : [0.05,0.1,0.35,0.7,1.0].map((v,i) =>
              `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                onclick="window.__wo.setVol(${v})">${['0.05 л','0.1 л','½ пляш.','1 пляш.','1.0 л'][i]}</button>`
            ).join('')}
          </div>
          <div class="wo-stock-preview">
            <div>
              <div class="wo-sp-label">Поточний залишок</div>
              <div class="wo-sp-name" id="wo-sp-name">${_selProd?_selProd.name:'—'}</div>
            </div>
            <div>
              <div class="wo-sp-before" id="wo-sp-before">${_selProd ? fmtStock(_selProd.stock, _selProd.unit) : '—'}</div>
              <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin:2px 0;text-align:right">після списання</div>
              <div class="wo-sp-after" id="wo-sp-after">— ${_selProd ? unitLabel(_selProd.unit) : 'л'}</div>
            </div>
          </div>
        </div>

        <!-- Step 4: Category pills (if accounts mode) + Reason -->
        <div class="wo-fstep ${_formStep===4?'act':''}" id="wfstep4">
          ${getWoAccounts().length ? `
          <div>
            <div class="wo-custom-lbl">Тип списання</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${Object.entries(CAT).map(([k,v]) => `
              <div onclick="window.__wo.selectCat('${k}')"
                style="padding:7px 14px;border-radius:20px;border:0.5px solid ${_selCat===k?v.color:'var(--border)'};background:${_selCat===k?v.bg:'transparent'};color:${_selCat===k?v.color:'var(--text2)'};font-size:12px;cursor:pointer;font-family:var(--font-b);transition:all .15s">
                ${v.label}
              </div>`).join('')}
            </div>
          </div>` : ''}
          <div>
            <div class="wo-custom-lbl">Причина списання</div>
            <textarea class="wo-textarea" id="wo-reason-custom"
              placeholder="Опишіть деталі: де, коли, хто присутній…"
              oninput="window.__wo.updateCustomReason(this.value)">${_selReason||''}</textarea>
          </div>
          ${summaryHTML()}
        </div>

      </div><!-- scroll2 -->

      <!-- Form nav -->
      <div class="wo-fnav">
        <div class="wo-fback" id="wo-fback" style="${_formStep>1?'':'display:none'}"
             onclick="window.__wo.prevStep()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <button class="wo-fnext" id="wo-fnext" onclick="window.__wo.nextStep()"
          ${((_formStep===1&&(getWoAccounts().length?!_selAccount:!_selCat))||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol))?'disabled style="opacity:.35"':''}>
          ${(_formMode==='transfer' && _formStep===3)
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Зафіксувати переміщення`
            : _formStep===4
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Зафіксувати списання`
            : `Далі <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 11l6-4-6-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
        </button>
      </div>
    </div>
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="wo-succ-overlay ${_succOpen?'open':''}" id="wo-succ-overlay">
    <div class="wo-succ-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M9 17l6 6 12-12" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="wo-succ-title" id="wo-succ-title">Списання зафіксовано</div>
    <div class="wo-succ-sub" id="wo-succ-sub">Запис збережено</div>
    <div class="wo-succ-pill" id="wo-succ-pill">—</div>
    <button class="wo-succ-btn" onclick="window.__wo.closeSuccess()">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Додати ще одне
    </button>
    <button class="wo-succ-ghost" onclick="window.__wo.closeSuccessExit()">Готово</button>
  </div>
  ${syrveConfirmHTML()}
  ${syrveResultHTML()}
  ${transferConfirmHTML()}
  ${transferResultHTML()}`;
}

function prodListHTML() {
  const q = _prodSearch.toLowerCase();
  // Poster: у переміщенні — товари складу-джерела; у писанні — за роллю
  const zoneF = _isPosterWo ? (_formMode === 'transfer' ? transferSourceZone() : woAllowedZone()) : null;
  const list = _prods.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!zoneF || p.zone === zoneF));
  if (list.length === 0) {
    return `<div style="text-align:center;padding:20px 8px;color:var(--text2);font-family:var(--font-b);font-size:12px">${_prods.length===0?'Завантаження товарів…':'Нічого не знайдено'}</div>`;
  }
  return list.map(p => `
    <div class="wo-prod-item ${_selProd?.id===p.id?'sel':''}" onclick="window.__wo.selectProd('${p.id}')">
      <div class="wo-pi-emoji">🍾</div>
      <div style="flex:1;min-width:0">
        <div class="wo-pi-name">${p.name}</div>
        ${p.stock!=null?`<div class="wo-pi-stock">Залишок: ${typeof p.stock==='number'?p.stock.toFixed(2):p.stock}</div>`:''}
      </div>
      <div class="wo-pi-check">
        ${_selProd?.id===p.id?`<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
      </div>
    </div>`).join('');
}

function reasonListHTML() {
  if (_isPosterWo) return '';   // для Poster причина обрана на кроці 1; тут лише вільний коментар
  if (!_selCat) return '';
  const rColors = ['var(--red)','var(--amber)','var(--green)','var(--purple)'];
  return (REASONS[_selCat] || []).map((r, i) => `
  <div class="wo-reason-item ${_selReason===r?'sel':''}"
       onclick="window.__wo.selectReason('${r.replace(/'/g,"\\'")}')">
    <div class="wo-reason-dot" style="background:${rColors[i%4]}"></div>
    <div class="wo-reason-text">${r}</div>
  </div>`).join('');
}

function getWoAccounts() {
  const vId = localStorage.getItem('barops_venueId') || state.venueId || '';
  if (!vId) return [];
  // Пріоритет: адмін-налаштовані > fallback з Syrve
  try {
    const saved = JSON.parse(localStorage.getItem(`barops_wo_accounts_${vId}`) || '[]');
    if (saved.length > 0) return saved;
    return JSON.parse(localStorage.getItem(`barops_syrve_accounts_${vId}`) || '[]');
  } catch { return []; }
}
function autoSelectAccount() {
  const accounts = getWoAccounts();
  if (accounts.length === 1) _selAccount = accounts[0];
}
function accountPickerHTML() {
  const accounts = getWoAccounts();
  if (!accounts.length) return '';
  return `
    <div>
      <div class="wo-custom-lbl">На рахунок</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${accounts.map(a => `
          <div class="wo-reason-item ${_selAccount?.id === a.id ? 'sel' : ''}"
               onclick="window.__wo.selectAccount('${a.id}', '${a.name.replace(/'/g,"\\'")}')">
            <div class="wo-reason-dot" style="background:var(--purple)"></div>
            <div class="wo-reason-text">${a.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
function selectAccount(id, name) {
  _selAccount = { id, name };
  if (_formStep === 1) { setTimeout(() => { _formStep = 2; fullRender(); }, 180); }
  else fullRender();
}

function syrveConfirmHTML() {
  if (!_syrveConfirmOpen || !_syrveConfirmGroups.length) return '';
  return `
  <div class="wo-syrve-conf-overlay open" onclick="if(event.target===this)window.__wo.closeSyrveConfirm()">
    <div class="wo-syrve-conf-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div>
          <div class="wo-sheet-title">${_isPosterWo ? 'Надіслати в Poster?' : 'Надіслати до Syrve?'}</div>
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">
            ${_syrveConfirmGroups.length > 1 ? _syrveConfirmGroups.length + ' акти списання' : 'Акт списання'}
          </div>
        </div>
        <div class="wo-sheet-close" onclick="window.__wo.closeSyrveConfirm()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="wo-syrve-conf-scroll">
        ${_syrveConfirmGroups.map(g => {
          const items = Object.values(g.items.reduce((acc, w) => {
            if (!acc[w.prodId]) acc[w.prodId] = { name: w.prod, amount: 0, unitKey: w.unitKey || 'l' };
            acc[w.prodId].amount += w.volNum || 0;
            return acc;
          }, {}));
          return `
          <div style="margin-bottom:16px">
            ${_isPosterWo ? '' : `<div style="font-size:11px;color:var(--purple);font-family:var(--font-b);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:6px">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--purple);flex-shrink:0"></div>
              ${g.accountName}
            </div>`}
            <div style="display:flex;flex-direction:column;gap:4px">
              ${items.map(it => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:10px">
                <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.name}</div>
                <div style="font-size:13px;font-family:var(--font-h);font-weight:700;color:var(--purple);flex-shrink:0;margin-left:10px">−${it.amount.toFixed(2)} ${unitLabel(it.unitKey)}</div>
              </div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${_syrveStores.length > 1 ? `
      <div style="padding:4px 0 12px">
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">Склад для списання</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${_syrveStores.map(s => `
          <button type="button" onclick="window.__wo.selectWriteoffStore('${s.id}')"
            style="height:34px;padding:0 14px;border-radius:10px;font-size:13px;cursor:pointer;font-family:var(--font-h);transition:all .15s;
                   border:${_selStoreId === s.id ? 'none' : '0.5px solid var(--border)'};
                   background:${_selStoreId === s.id ? 'var(--purple)' : 'rgba(255,255,255,.06)'};
                   color:${_selStoreId === s.id ? '#fff' : 'var(--text1)'}">
            ${s.name}
          </button>`).join('')}
        </div>
      </div>` : ''}
      <div class="wo-fnav" style="padding-top:8px">
        <button onclick="window.__wo.closeSyrveConfirm()"
          style="flex:1;height:52px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:14px;font-size:14px;color:var(--text1);cursor:pointer;font-family:var(--font-h)">
          Скасувати
        </button>
        <button onclick="window.__wo.doSendActToSyrve()" ${_syrveStores.length > 1 && !_selStoreId ? 'disabled' : ''}
          style="flex:2;height:52px;background:${_syrveStores.length > 1 && !_selStoreId ? 'rgba(255,255,255,.12)' : 'var(--purple)'};border:none;border-radius:14px;font-size:15px;font-weight:600;color:${_syrveStores.length > 1 && !_selStoreId ? 'var(--text2)' : '#fff'};cursor:${_syrveStores.length > 1 && !_selStoreId ? 'not-allowed' : 'pointer'};font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 7h11M7 2l5.5 5L7 12" stroke="${_syrveStores.length > 1 && !_selStoreId ? 'var(--text2)' : '#fff'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${_syrveStores.length > 1 && !_selStoreId ? 'Оберіть склад' : 'Надіслати'}
        </button>
      </div>
    </div>
  </div>`;
}

function syrveResultHTML() {
  if (!_syrveResult) return '';
  const { isError, lines } = _syrveResult;
  const accentColor  = isError ? 'var(--red)'    : 'var(--green)';
  const accentBg     = isError ? 'var(--red-bg)' : 'var(--green-bg)';
  const accentBorder = isError ? 'var(--red-border)' : 'var(--green-border)';
  const iconPath     = isError
    ? `<path d="M4 4l8 8M12 4l-8 8" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M3 9l5 5 9-9" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const title = isError ? 'Завершено з помилками' : `Відправлено до ${posName()}`;
  return `
  <div class="wo-syrve-res-overlay open" onclick="if(event.target===this)window.__wo.closeSyrveResult()">
    <div class="wo-syrve-res-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:12px;background:${accentBg};border:0.5px solid ${accentBorder};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">${iconPath}</svg>
          </div>
          <div>
            <div class="wo-sheet-title">${title}</div>
            <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${lines.length} ${isError ? 'помилок' : 'актів'}</div>
          </div>
        </div>
        <div class="wo-sheet-close" onclick="window.__wo.closeSyrveResult()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="wo-syrve-res-body">
        ${lines.map(line => {
          const isErr = line.startsWith('✗');
          const col   = isErr ? 'var(--red)' : 'var(--green)';
          const bg    = isErr ? 'var(--red-bg)' : 'rgba(255,255,255,.04)';
          const bord  = isErr ? 'var(--red-border)' : 'var(--border)';
          return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 13px;background:${bg};border:0.5px solid ${bord};border-radius:10px">
            <div style="width:6px;height:6px;border-radius:50%;background:${col};margin-top:5px;flex-shrink:0"></div>
            <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);line-height:1.5;flex:1">${line.replace(/^[✓✗]\s*/,'')}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="padding:14px 18px 0">
        <button onclick="window.__wo.closeSyrveResult()"
          style="width:100%;height:52px;background:${accentColor};border:none;border-radius:14px;font-size:15px;font-weight:600;color:${isError?'#fff':'#000'};cursor:pointer;font-family:var(--font-h)">
          Зрозуміло
        </button>
      </div>
    </div>
  </div>`;
}

function summaryHTML() {
  const vol = _selVol || 0;
  const unit = unitLabel(_selUnit || _selProd?.unit || 'l');   // була захардкоджена «л»
  const loss = _selProd ? Math.round(vol / _selProd.vol * _selProd.price) : 0;
  return `
  <div class="wo-summary-card">
    <div class="wo-sum-row"><div class="wo-sum-label">Товар</div><div class="wo-sum-val">${_selProd?_selProd.name:'—'}</div></div>
    <div class="wo-sum-div"></div>
    <div class="wo-sum-row"><div class="wo-sum-label">${_isPosterWo ? 'Причина' : 'Категорія'}</div><div class="wo-sum-val">${_isPosterWo ? (_selReasonName || 'Без причини') : (_selCat?CAT[_selCat].label:'—')}</div></div>
    <div class="wo-sum-row"><div class="wo-sum-label">Об'єм</div><div class="wo-sum-val-big">${vol} ${unit}</div></div>
    <div class="wo-sum-row"><div class="wo-sum-label">Збиток (орієнтовно)</div><div class="wo-sum-val" style="color:var(--red)">${loss>0?'~'+loss+' ₴':'—'}</div></div>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function renderManager() {
  const kpi   = getMgrKpi(_mgrPeriod, true);   // менеджер бачить лише надіслані за період
  const unsentWo = _writeoffs.filter(w => w.prodId && !w.sentAt);   // ненадіслані позиції з товаром

  return `
  <div class="wo-topbar" style="flex-shrink:0">
    <div class="wo-back" onclick="${(state.role || '').toLowerCase() === 'accountant' ? 'window.__barops.openDrawer()' : "window.__barops.navigate('dashboard')"}">
      ${(state.role || '').toLowerCase() === 'accountant'
        ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h12" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
    </div>
    <div style="flex:1">
      <div class="wo-title">Списання</div>
      <div class="wo-sub">${woMgrLabel()} · ${state.venue}</div>
    </div>
    <div style="background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--purple);font-family:var(--font-b)">Звіт</div>
  </div>

  <div class="wo-scroll">
    <!-- Period -->
    <div class="wo-period-tabs">
      ${['day','week','month','custom'].map((p,i) => `
      <button class="wo-pt ${_mgrPeriod===p?'act':''}"
              onclick="window.__wo.setPeriod('${p}')">${['Сьогодні','Тиждень','Місяць','Обрати'][i]}</button>`).join('')}
    </div>

    ${_mgrPeriod === 'custom' ? `
    <div class="wo-daterange">
      <label class="wo-dr-field"><span>Від</span>
        <input type="date" value="${_mgrFrom}" max="${woTodayStr('iso')}" onchange="window.__wo.setMgrFrom(this.value)"/>
      </label>
      <label class="wo-dr-field"><span>До</span>
        <input type="date" value="${_mgrTo}" max="${woTodayStr('iso')}" onchange="window.__wo.setMgrTo(this.value)"/>
      </label>
    </div>` : ''}

    <!-- KPI -->
    <div class="wo-mgr-kpi">
      <div class="wo-mk"><div class="wo-mk-val" style="color:var(--red)">${kpi.count}</div><div class="wo-mk-lbl">Списань<br/>за період</div></div>
      <div class="wo-mk"><div class="wo-mk-val" style="color:var(--red)">${kpi.loss}</div><div class="wo-mk-lbl">Збиток<br/>оціночно</div></div>
    </div>

    <!-- Синхронізація собівартості (для збитку) -->
    <div style="margin:0 14px 8px;display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);min-width:0">
        ${_priceSyncMsg
          ? _priceSyncMsg
          : (priceCount() > 0 ? `Собівартість: ${priceCount()} позицій із ${posName()}` : '⚠️ Собівартість не синхронізована — збиток не рахується')}
      </div>
      <button onclick="window.__wo.syncPrices()" ${_priceSyncMsg.startsWith('Синхронізую') ? 'disabled' : ''}
        style="flex-shrink:0;height:30px;padding:0 12px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);color:var(--text1);font-size:11px;font-family:var(--font-b);cursor:pointer">
        ↻ Оновити ціни
      </button>
    </div>

    <!-- Unsent -->
    ${(() => {
      const unsent = [..._writeoffs].filter(w => !w.sentAt).reverse();
      if (!unsent.length) return `
        <div class="wo-sec">Не відправлені</div>
        <div style="margin:0 14px 8px;padding:18px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;text-align:center">
          <div style="font-size:13px;color:var(--text2);font-family:var(--font-b)">Немає непроведених списань</div>
        </div>`;
      return `
        <div class="wo-sec">Не відправлені в ${posName()}</div>
        <div class="wo-list" style="margin-bottom:8px">
          ${unsent.map(w => `
          <div class="wo-swipe-wrap" data-id="${w.id}">
            <div class="wo-swipe-edit" onclick="window.__wo.editWriteoff('${w.id}')">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 15l2.5-.6 8-8-1.9-1.9-8 8L3 15z" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3.5l1.9 1.9" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>
              <span class="wo-swipe-edit-lbl">Змінити</span>
            </div>
            <div class="wo-swipe-del" onclick="window.__wo.deleteWriteoff('${w.id}')">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>
              <span class="wo-swipe-del-lbl">Видалити</span>
            </div>
            <div class="wo-card" data-id="${w.id}" style="gap:10px;position:relative">
              <div style="width:3px;height:34px;border-radius:2px;background:${CAT[w.cat]?.color||'var(--text2)'};flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.prod}</div>
                <div style="font-size:11px;color:var(--text2);margin-top:2px;font-family:var(--font-b)">${woMeta(w)}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;display:flex;align-items:center;gap:10px">
                <div>
                  <div style="font-family:var(--font-h);font-size:15px;font-weight:700;color:${CAT[w.cat]?.color||'var(--text0)'}">${w.vol||'—'}</div>
                  <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${w.time||''}</div>
                </div>
                <div onclick="event.stopPropagation();window.__wo.deleteWriteoff('${w.id}')"
                  style="width:30px;height:30px;border-radius:8px;background:var(--red-bg);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
          </div>`).join('')}
        </div>`;
    })()}

    <!-- Add (manager/kitchen) -->
    <div class="wo-sec">${roleZone() === 'kitchen' ? 'Додати списання' : 'Списання менеджера'}</div>
    <div style="padding:0 14px">
      <div class="wo-add" onclick="window.__wo.openForm()">
        <div class="wo-add-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Зафіксувати списання</div>
          <div class="wo-add-sub">${roleZone() === 'kitchen' ? 'Бій · Псування · Дегустація · Інше' : 'З облікового запису менеджера'}</div>
        </div>
      </div>
    </div>

    <!-- Переміщення бар↔кухня (менеджер/адмін) -->
    <div class="wo-sec" style="padding-top:14px">Переміщення бар↔кухня</div>
    <div style="padding:0 14px">
      ${(state.role||'').toLowerCase()==='admin' ? `
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <button onclick="window.__wo.setTransferDir('bar2kitchen')" style="flex:1;height:34px;border-radius:10px;border:0.5px solid ${_transferDir!=='kitchen2bar'?'var(--teal,#2DD4BF)':'var(--border)'};background:${_transferDir!=='kitchen2bar'?'var(--teal-bg,rgba(45,212,191,.12))':'transparent'};color:${_transferDir!=='kitchen2bar'?'var(--teal,#2DD4BF)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Бар → Кухня</button>
        <button onclick="window.__wo.setTransferDir('kitchen2bar')" style="flex:1;height:34px;border-radius:10px;border:0.5px solid ${_transferDir==='kitchen2bar'?'var(--teal,#2DD4BF)':'var(--border)'};background:${_transferDir==='kitchen2bar'?'var(--teal-bg,rgba(45,212,191,.12))':'transparent'};color:${_transferDir==='kitchen2bar'?'var(--teal,#2DD4BF)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Кухня → Бар</button>
      </div>` : ''}
      <div class="wo-add" style="border-color:var(--teal-border,rgba(45,212,191,.35))" onclick="window.__wo.openForm('transfer')">
        <div class="wo-add-icon" style="background:var(--teal-bg,rgba(45,212,191,.12))">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 6h8M8 3l3 3-3 3M13 10H5M8 13l-3-3 3-3" stroke="var(--teal,#2DD4BF)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="wo-add-text">Зафіксувати переміщення</div>
          <div class="wo-add-sub">${transferDir().from} → ${transferDir().to} (внутрішнє)</div>
        </div>
      </div>
    </div>
    ${(() => {
      const pend = _transfers.filter(t => t.prodId && !t.sentAt);
      const dir  = transferDir();
      if (!_transfers.length) return '';
      return `
      <div class="wo-list" style="margin-top:8px">${transferListHTML()}</div>
      <div style="margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--teal-bg,rgba(45,212,191,.12));border:0.5px solid var(--teal-border,rgba(45,212,191,.35));display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 7h9M9 4l3 3-3 3M15 11H6M9 14l-3-3 3-3" stroke="var(--teal,#2DD4BF)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-family:var(--font-b);color:var(--text0)">Переміщення на ${posName()}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${pend.length ? `${pend.length} поз. · ${dir.from} → ${dir.to}` : 'Немає нових позицій'}</div>
        </div>
        <button id="wo-transfer-btn" onclick="window.__wo.sendTransferToSyrve()" ${!pend.length ? 'disabled' : ''}
          style="padding:7px 14px;border-radius:20px;border:0.5px solid var(--teal-border,rgba(45,212,191,.35));background:${pend.length ? 'var(--teal-bg,rgba(45,212,191,.12))' : 'var(--bg2)'};color:${pend.length ? 'var(--teal,#2DD4BF)' : 'var(--text3)'};font-size:12px;font-family:var(--font-b);cursor:${pend.length ? 'pointer' : 'default'};white-space:nowrap">
          Надіслати
        </button>
      </div>`;
    })()}

    <!-- POS Office -->
    <div class="wo-sec" style="padding-top:14px">${_isPosterWo ? 'Облік Poster' : 'Syrve Office'}</div>
    <div style="margin:0 14px 8px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--purple-bg);border:0.5px solid var(--purple-border);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--purple)" stroke-width="1.2"/><path d="M6 7h6M6 10h4" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/><path d="M2 6h14" stroke="var(--purple)" stroke-width="1.2"/></svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-family:var(--font-b);color:var(--text0)">Акт списання</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${unsentWo.length
          ? `${unsentWo.length} поз. до надсилання · буде непроведеним`
          : 'Немає списань з товаром'}</div>
      </div>
      <button id="wo-syrve-btn"
        onclick="window.__wo.sendActToSyrve()"
        ${!unsentWo.length ? 'disabled' : ''}
        style="padding:7px 14px;border-radius:20px;border:0.5px solid var(--purple-border);background:${unsentWo.length ? 'var(--purple-bg)' : 'var(--bg2)'};color:${unsentWo.length ? 'var(--purple)' : 'var(--text3)'};font-size:12px;font-family:var(--font-b);cursor:${unsentWo.length ? 'pointer' : 'default'};white-space:nowrap">
        Надіслати
      </button>
    </div>

    <!-- Export -->
    <div class="wo-sec" style="padding-top:14px">Звіт</div>
    <div class="wo-report-card">
      <div class="wo-rc-title">Звіт по списаннях</div>
      <div class="wo-rc-sub">Деталізований звіт з розбивкою по категоріях, позиціях і барменах за обраний період.</div>
      <div class="wo-rc-btns">
        <button class="wo-rcbtn wo-rcbtn-pdf" onclick="window.__wo.exportReport('pdf')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1.5" stroke="#fff" stroke-width="1"/><path d="M4 4h4M4 6.5h4M4 9h2" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>PDF
        </button>
        <button class="wo-rcbtn wo-rcbtn-csv" onclick="window.__wo.exportReport('csv')">Excel</button>
        <button class="wo-rcbtn wo-rcbtn-tg" onclick="window.__wo.exportReport('tg')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 5.5L11 1.5 9 11 5.5 7 9.5 3.5M5.5 7L4 10.5" stroke="var(--blue)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>Telegram
        </button>
      </div>
    </div>

    <!-- Історія (надіслані, по даті) -->
    ${historyHTML(_writeoffs.filter(w => w.sentAt && inPeriod(w.ts, _mgrPeriod)), 'Історія')}

    <!-- Form overlay -->
    <div class="wo-form-overlay ${_formOpen?'open':''}" id="wo-form-overlay"
         onclick="window.__wo.maybeClose(event)">
      <div class="wo-sheet" onclick="event.stopPropagation()">
        <div class="wo-sheet-handle"></div>
        <div class="wo-sheet-hdr">
          <div class="wo-sheet-title" id="wo-sheet-title">${_formMode==='transfer' ? (_editId ? 'Редагувати переміщення' : `Переміщення · ${transferDir().from} → ${transferDir().to}`) : (_editId ? 'Редагувати списання' : 'Нове списання')}</div>
          <div class="wo-sheet-close" onclick="window.__wo.closeForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
        </div>
        <div class="wo-dots">
          ${[1,2,3,4].map(i=>`<div class="wo-dot ${_formStep===i?'act':_formStep>i?'done':''}" id="wdot${i}"></div>`).join('')}
        </div>
        <div class="wo-scroll2" id="wo-scroll2">

          <!-- Step 1: Account (if configured) or Category -->
          <div class="wo-fstep ${_formStep===1?'act':''}" id="wfstep1">
            ${(() => {
              const accounts = getWoAccounts();
              if (accounts.length) {
                return `
                  <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть рахунок списання</div>
                  <div class="wo-reason-list">
                    ${accounts.map(a => `
                    <div class="wo-reason-item ${_selAccount?.id===a.id?'sel':''}"
                         onclick="window.__wo.selectAccount('${a.id}','${a.name.replace(/'/g,"\\'")}')">
                      <div class="wo-reason-dot" style="background:var(--purple)"></div>
                      <div class="wo-reason-text">${a.name}</div>
                      ${_selAccount?.id===a.id?`<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--purple)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
                    </div>`).join('')}
                  </div>`;
              }
              return `
                <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:4px">Оберіть причину списання</div>
                ${catGridHTML()}`;
            })()}
          </div>

          <!-- Step 2: Product -->
          <div class="wo-fstep ${_formStep===2?'act':''}" id="wfstep2">
            <div style="display:flex;gap:6px;margin-bottom:12px">
              <button onclick="window.__wo.setProdTab('goods')" style="flex:1;height:36px;border-radius:10px;border:0.5px solid ${_prodTab!=='prep'?'var(--purple)':'var(--border)'};background:${_prodTab!=='prep'?'var(--purple-bg)':'transparent'};color:${_prodTab!=='prep'?'var(--purple)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Товари</button>
              <button onclick="window.__wo.setProdTab('prep')" style="flex:1;height:36px;border-radius:10px;border:0.5px solid ${_prodTab==='prep'?'var(--purple)':'var(--border)'};background:${_prodTab==='prep'?'var(--purple-bg)':'transparent'};color:${_prodTab==='prep'?'var(--purple)':'var(--text2)'};font-size:12px;font-family:var(--font-b);cursor:pointer">Напівфабрикати</button>
            </div>
            <div class="wo-prod-search-wrap">
              <svg class="wo-prod-search-ico" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/>
                <path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              <input class="wo-prod-inp" id="wo-prod-search" placeholder="${_prodTab==='prep'?'Пошук напівфабрикату…':'Пошук товару…'}"
                value="${_prodSearch}" oninput="window.__wo.searchProds(this.value)"/>
            </div>
            <div class="wo-prod-list" id="wo-prod-list">${_prodTab==='prep'?prepListHTML():prodListHTML()}</div>
          </div>

          <!-- Step 3: Volume -->
          <div class="wo-fstep ${_formStep===3?'act':''}" id="wfstep3">
            <div>
              <div class="wo-custom-lbl">Об'єм списання</div>
              <input class="wo-vol-field" id="wo-vol-input" type="number" step="0.001"
                placeholder="0" value="${_selVol||''}"
                oninput="window.__wo.updateVol()"/>
              ${(() => {
                const unitOpts = _selProd?.unit==='kg'  ? [['kg','кг'],['g','г']]
                               : _selProd?.unit==='g'   ? [['g','г'],['kg','кг']]
                               : _selProd?.unit==='sht' ? [['sht','шт']]
                               : _selProd?.unit==='ml'  ? [['ml','мл'],['l','л']]
                               :                         [['l','л'],['ml','мл']];
                return `<div class="wo-unit-row">${unitOpts.map(([u,lbl])=>`<button class="wo-unit-btn ${_selUnit===u?'act':''}" data-u="${u}" onclick="window.__wo.setUnit('${u}')">${lbl}</button>`).join('')}</div>`;
              })()}
            </div>
            <div class="wo-presets">
              ${_selProd ? (() => {
                const pu = _selProd.unit || 'l';
                if (pu === 'sht') {
                  return [1,2,3,5,10].map(v =>
                    `<button class="wo-preset ${_selVol===v?'act':''}"
                      onclick="window.__wo.setVol(${v})">${v} шт</button>`
                  ).join('');
                }
                if (pu === 'kg' || pu === 'g') {
                  return [0.1,0.25,0.5,1,2].map(v =>
                    `<button class="wo-preset ${_selVol===v?'act':''}"
                      onclick="window.__wo.setVol(${v})">${v} кг</button>`
                  ).join('');
                }
                const vol = _selProd.vol || 0.7;
                const presets = [
                  [parseFloat((vol*0.1).toFixed(3)), `10%`],
                  [parseFloat((vol*0.25).toFixed(3)), `25%`],
                  [parseFloat((vol*0.5).toFixed(3)), `½`],
                  [parseFloat((vol*0.75).toFixed(3)), `75%`],
                  [vol, `1 пляш.`],
                ];
                return presets.map(([v,lbl]) =>
                  `<button class="wo-preset ${_selVol===v?'act':''}"
                    onclick="window.__wo.setVol(${v})">${lbl}<br/><span style="font-size:9px;opacity:.7">${v} л</span></button>`
                ).join('');
              })() : [0.05,0.1,0.35,0.7,1.0].map((v,i) =>
                `<button class="wo-preset ${_selVol===v?'act':''}" data-v="${v}"
                  onclick="window.__wo.setVol(${v})">${['0.05 л','0.1 л','½ пляш.','1 пляш.','1.0 л'][i]}</button>`
              ).join('')}
            </div>
            <div class="wo-stock-preview">
              <div>
                <div class="wo-sp-label">Поточний залишок</div>
                <div class="wo-sp-name" id="wo-sp-name">${_selProd?_selProd.name:'—'}</div>
              </div>
              <div>
                <div class="wo-sp-before" id="wo-sp-before">${_selProd ? fmtStock(_selProd.stock, _selProd.unit) : '—'}</div>
                <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin:2px 0;text-align:right">після списання</div>
                <div class="wo-sp-after" id="wo-sp-after">— ${_selProd ? unitLabel(_selProd.unit) : 'л'}</div>
              </div>
            </div>
          </div>

          <!-- Step 4: Reason -->
          <div class="wo-fstep ${_formStep===4?'act':''}" id="wfstep4">
            <div>
              <div class="wo-custom-lbl">Причина списання</div>
              <textarea class="wo-textarea" id="wo-reason-custom"
                placeholder="Опишіть деталі: де, коли, хто присутній…">${_selReason||''}</textarea>
            </div>
            ${summaryHTML()}
          </div>

        </div><!-- scroll2 -->

        <!-- Form nav -->
        <div class="wo-fnav">
          <div class="wo-fback" id="wo-fback" style="${_formStep>1?'':'display:none'}"
               onclick="window.__wo.prevStep()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <button class="wo-fnext" id="wo-fnext" onclick="window.__wo.nextStep()"
            ${((_formStep===1&&(getWoAccounts().length?!_selAccount:!_selCat))||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol))?'disabled style="opacity:.35"':''}>
            ${_formStep===4
              ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Зафіксувати списання`
              : `Далі <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 11l6-4-6-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
          </button>
        </div>
      </div>
    </div>

    <!-- SUCCESS OVERLAY -->
    <div class="wo-succ-overlay ${_succOpen?'open':''}" id="wo-succ-overlay">
      <div class="wo-succ-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M9 17l6 6 12-12" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="wo-succ-title" id="wo-succ-title">Списання зафіксовано</div>
      <div class="wo-succ-sub" id="wo-succ-sub">Запис збережено</div>
      <div class="wo-succ-pill" id="wo-succ-pill">—</div>
      <button class="wo-succ-btn" onclick="window.__wo.closeSuccess()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
        Додати ще одне
      </button>
      <button class="wo-succ-ghost" onclick="window.__wo.closeSuccessExit()">Готово</button>
    </div>

    <div style="height:16px"></div>
  </div>
  ${syrveConfirmHTML()}
  ${syrveResultHTML()}
  ${transferConfirmHTML()}
  ${transferResultHTML()}`;
}

/* ════════════════════════
   FULL RENDER
════════════════════════ */
function buildHTML() {
  const body = _view === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="wo-wrap">${body}${dayDetailHTML()}</div>`;
}
function fullRender() {
  if (state.route !== 'writeoff') return;
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}
function refreshList() {
  const el = document.getElementById('wo-list');
  if (el) el.innerHTML = woList();
}
function refreshProdList() {
  const el = document.getElementById('wo-prod-list');
  if (el) el.innerHTML = (_prodTab === 'prep') ? prepListHTML() : prodListHTML();
}

/* ── Напівфабрикати (PREPARED) ── */
function prepListHTML() {
  if (_prepsLoading) {
    return `<div style="text-align:center;padding:20px 8px;color:var(--text2);font-family:var(--font-b);font-size:12px"><span class="auth-spinner" style="width:18px;height:18px;border-width:2px;vertical-align:middle"></span> Завантаження напівфабрикатів…</div>`;
  }
  const scopes = prepScopesForRole();
  const q = _prodSearch.toLowerCase();
  const list = _preps.filter(p => scopes.includes(p.scope) && (!q || (p.name || '').toLowerCase().includes(q)));
  if (!list.length) {
    return `<div style="text-align:center;padding:20px 8px;color:var(--text2);font-family:var(--font-b);font-size:12px">${_preps.length === 0 ? 'Немає напівфабрикатів' : 'Нічого не знайдено'}</div>`;
  }
  const zoneLbl = { bar: 'Бар', kitchen: 'Кухня', general: 'Загальні' };
  return list.map(p => `
    <div class="wo-prod-item ${_selProd?.id === p.id ? 'sel' : ''}" onclick="window.__wo.selectProd('${p.id}')">
      <div class="wo-pi-emoji">🧪</div>
      <div style="flex:1;min-width:0">
        <div class="wo-pi-name">${p.name} <span style="font-size:9px;color:var(--purple);border:0.5px solid var(--purple-border);border-radius:5px;padding:0 4px;vertical-align:middle">ПФ</span></div>
        <div class="wo-pi-stock">${zoneLbl[p.scope] || ''} · Залишок: ${typeof p.stock === 'number' ? p.stock : 0} ${p.unit || ''}</div>
      </div>
      <div class="wo-pi-check">
        ${_selProd?.id === p.id ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>
    </div>`).join('');
}

async function loadPreps() {
  if (_prepsLoaded || _prepsLoading) return;
  _prepsLoading = true;
  refreshProdList();
  const vId = localStorage.getItem('barops_venueId') || state.venueId || '';
  const tok = localStorage.getItem('barops_token');
  try {
    const r = await fetch(`${API}/api/pos/preparations/${vId}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    const d = await r.json();
    if (d.success) { _preps = d.preparations || []; _prepsLoaded = true; }
  } catch (e) { console.warn('[Preps]', e.message); }
  _prepsLoading = false;
  refreshProdList();
}

function setProdTab(tab) {
  _prodTab = (tab === 'prep') ? 'prep' : 'goods';
  if (_prodTab === 'prep') loadPreps();
  fullRender();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function setCatFilter(cat) { _catFilter = cat; refreshList(); fullRender(); }

/* form */
function openForm(mode)  {
  _editId = null;
  _formMode = (mode === 'transfer') ? 'transfer' : 'writeoff';
  _formOpen=true; _formStep = _formMode==='transfer' ? 2 : 1;
  _selCat=null; _selProd=null; _selVol=null; _selUnit='l'; _selReason=null; _selAccount=null; _prodSearch='';
  _selReasonId=null; _selReasonName='';
  _transferComment='';
  _prodTab='goods';
  if (_formMode !== 'transfer') autoSelectAccount();
  fullRender();
}
function closeForm() { _formOpen=false; _editId=null; fullRender(); }

// Редагування непроведеного списання: передзаповнюємо форму даними запису
function editWriteoff(id) {
  const w = _writeoffs.find(x => x.id === id);
  if (!w || w.sentAt) return;                 // відправлені в Syrve не редагуємо
  // Відновлюємо об'єкт товару зі списку (для кроку «Кількість» — одиниці/залишок)
  let p = _prods.find(x => x.id === w.prodId);
  if (!p) {
    const pr = _preps.find(x => x.id === w.prodId);
    if (pr) p = { id: pr.id, name: pr.name, unit: normalizeUnit(pr.unit), stock: pr.stock, isPrep: true, scope: pr.scope };
  }
  if (!p) p = { id: w.prodId, name: w.prod, unit: w.unitKey || 'l', stock: 0, vol: 0.7, price: 0, isPrep: !!w.isPrep, scope: w.scope };

  _editId    = id;
  _formMode  = 'writeoff';
  _formOpen  = true;
  _selProd   = p;
  _selUnit   = w.unitKey || p.unit || 'l';
  _selVol    = w.volNum || null;
  _selCat    = w.cat || null;
  _selReason = w.reason || null;
  _selAccount = w.accountId ? { id: w.accountId, name: w.accountName || '' } : null;
  if (!_selAccount) autoSelectAccount();
  _prodTab   = w.isPrep ? 'prep' : 'goods';
  _formStep  = 3;                              // одразу на «Кількість» (найчастіша правка); назад/далі доступні
  fullRender();
}
function maybeClose(e) { if (e.target===document.getElementById('wo-form-overlay')) closeForm(); }

function selectCat(cat) {
  _selCat = cat;
  // Авто-перехід на наступний крок без кнопки «Далі»
  setTimeout(() => { _formStep = 2; fullRender(); }, 180);
}
// Вибір причини Poster на кроці 1 (id=null → Без причини); _selCat='insh' як плейсхолдер для флоу
function selectPosterCat(id, name) {
  _selReasonId   = id;
  _selReasonName = name || '';
  _selCat        = 'insh';
  setTimeout(() => { _formStep = 2; fullRender(); }, 180);
}
function searchProds(q) { _prodSearch = q; refreshProdList(); }
function selectProd(id) {
  let p = _prods.find(x => x.id === id);
  if (!p) {
    const pr = _preps.find(x => x.id === id);   // напівфабрикат
    if (pr) p = { id: pr.id, name: pr.name, unit: normalizeUnit(pr.unit), stock: pr.stock, isPrep: true, scope: pr.scope };
  }
  _selProd = p;
  _selUnit = _selProd?.unit || 'l';
  refreshProdList();
  updateNextBtn();
}

function setVol(v) {
  _selVol = v;
  const inp = document.getElementById('wo-vol-input');
  if (inp) inp.value = v;
  document.querySelectorAll('.wo-preset').forEach(b=>b.classList.toggle('act', parseFloat(b.dataset?.v)===v));
  updateVol();
}
function updateVol() {
  const inp  = document.getElementById('wo-vol-input');
  const raw  = parseFloat(inp?.value);
  if (!isNaN(raw) && raw > 0) _selVol = raw;
  if (!_selProd) return;
  const nativeVal = _selUnit === 'ml' ? raw / 1000
                  : _selUnit === 'g'  ? raw / 1000
                  : raw;
  const after      = Math.max(0, _selProd.stock - (isNaN(raw) ? 0 : nativeVal));
  const nativeUnit = _selProd.unit || 'l';
  const nameEl = document.getElementById('wo-sp-name');
  const befEl  = document.getElementById('wo-sp-before');
  const aftEl  = document.getElementById('wo-sp-after');
  if (nameEl) nameEl.textContent = _selProd.name;
  if (befEl)  befEl.textContent  = fmtStock(_selProd.stock, nativeUnit);
  if (aftEl)  aftEl.textContent  = fmtStock(after, nativeUnit);
  updateNextBtn();
}
function setUnit(u) {
  _selUnit = u;
  document.querySelectorAll('.wo-unit-btn').forEach(b => b.classList.toggle('act', b.dataset.u === u));
  updateVol();
}
function updateNextBtn() {
  const btn = document.getElementById('wo-fnext');
  if (!btn) return;
  const step1invalid = getWoAccounts().length ? !_selAccount : !_selCat;
  const disabled = (_formStep===1&&step1invalid)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol);
  btn.disabled = disabled;
  btn.style.opacity = disabled ? '.35' : '1';
}

function selectReason(r) {
  _selReason = r;
  const ta = document.getElementById('wo-reason-custom');
  if (ta) ta.value = r;
  document.querySelectorAll('.wo-reason-item').forEach(el => {
    el.classList.toggle('sel', el.querySelector('.wo-reason-text')?.textContent === r);
  });
}
function updateCustomReason(v) {
  _selReason = v.trim() || null;
}

function nextStep() {
  if (_formMode==='transfer' && _formStep===3) { submitForm(); return; }  // переміщення: 2 кроки
  if (_formStep===4) { submitForm(); return; }
  const step1invalid = getWoAccounts().length ? !_selAccount : !_selCat;
  if ((_formStep===1&&step1invalid)||(_formStep===2&&!_selProd)||(_formStep===3&&!_selVol)) return;
  _formStep++;
  fullRender();
}
function prevStep() {
  if (_formMode==='transfer' && _formStep<=2) { closeForm(); return; }   // перший крок переміщення → закрити
  if (_formStep>1) { _formStep--; fullRender(); }
}

async function submitForm() {
  if (_formMode === 'transfer') return submitTransfer();
  // Читаємо причину прямо з DOM (надійніше ніж покладатися тільки на _selReason)
  const taVal = (document.getElementById('wo-reason-custom')?.value || '').trim();
  if (taVal) _selReason = taVal;

  const vol  = _selVol || 0;
  const unit = _selUnit || _selProd?.unit || 'l';
  const uLbl = {l:'л',ml:'мл',sht:'шт',kg:'кг',g:'г'}[unit] || 'л';
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dd   = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}`;

  const finalCat = _selCat || 'insh';

  // ── РЕДАГУВАННЯ наявного (непроведеного) запису ──
  if (_editId) {
    const idx = _writeoffs.findIndex(w => w.id === _editId);
    if (idx !== -1 && !_writeoffs[idx].sentAt) {
      const old = _writeoffs[idx];
      const updated = {
        ...old,
        cat:         finalCat,
        prod:        _selProd?.name ?? old.prod,
        prodId:      _selProd?.id   ?? old.prodId,
        meta:        _selReason || (finalCat !== 'insh' ? (CAT[finalCat]?.label||'') : ''),
        vol:         `−${vol}${uLbl}`,
        volNum:      vol,
        unitKey:     unit,
        isPrep:      !!_selProd?.isPrep,
        valColor:    CAT[finalCat]?.color || 'var(--text0)',
        reason:      _selReason || '',
        accountId:   _selAccount?.id   || old.accountId   || null,
        accountName: _selAccount?.name || old.accountName || null,
        // id, ts, time, dateStr, sentAt(undefined) лишаємо
      };
      _writeoffs[idx] = updated;

      const vId = localStorage.getItem('barops_venueId') || '';
      const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
      if (raw[vId]) {
        const li = raw[vId].findIndex(w => w.id === _editId);
        if (li !== -1) raw[vId][li] = updated; else raw[vId].push(updated);
        localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));
      }

      // Бекенд-журнал best-effort: видалити старий запис і створити оновлений
      const editedId = _editId;
      try {
        const token = localStorage.getItem('barops_token');
        await fetch(`${API}/api/writeoffs/${editedId}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const { writeoffsAPI } = await import('../shared/api.js');
        const saved = await writeoffsAPI.create({
          items:    [{ productName: updated.prod, productId: updated.prodId, qty: vol, unit: uLbl }],
          category: CAT[finalCat]?.label || finalCat || 'Інше',
          reason:   updated.reason || null,
          venueId:  vId,
        });
        if (saved?.data?.id) {
          updated.id = saved.data.id;
          const r2 = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
          const li2 = (r2[vId] || []).findIndex(w => w.id === editedId);
          if (li2 !== -1) { r2[vId][li2].id = saved.data.id; localStorage.setItem('barops_writeoffs_v1', JSON.stringify(r2)); }
        }
      } catch (err) {
        console.warn('[Writeoff edit] Backend недоступний:', err.message);
      }
    }
    _editId   = null;
    _formOpen = false;
    fullRender();
    setTimeout(initSwipe, 50);
    return;
  }

  const entry = {
    id:      Date.now().toString(36),
    cat:     finalCat,
    prod:    _selProd?.name || 'Товар',
    prodId:  _selProd?.id   || null,
    meta:    _isPosterWo ? (_selReasonName || 'Без причини') : (_selReason || (finalCat !== 'insh' ? (CAT[finalCat]?.label||'') : '')),
    vol:     `−${vol}${uLbl}`,
    volNum:  vol,
    unitKey: unit,
    isPrep:  !!_selProd?.isPrep,
    scope:   _selProd?.isPrep
               ? (_selProd.scope === 'kitchen' ? 'kitchen' : _selProd.scope === 'bar' ? 'bar' : roleZone())
               : (_isPosterWo ? (_selProd?.zone || 'bar') : 'bar'),   // Poster: за зоною товару (Бар/Кухня)
    valColor:    CAT[finalCat]?.color || 'var(--text0)',
    reason:      _selReason || '',
    reasonId:    _isPosterWo ? _selReasonId : undefined,    // причина Poster (reason_id)
    reasonName:  _isPosterWo ? (_selReasonName || '') : undefined,
    accountId:   _selAccount?.id   || null,
    accountName: _selAccount?.name || null,
    time:    hhmm,
    dateStr: `${dd} · ${hhmm}`,
    ts:      now.toISOString(),
  };

  _writeoffs.push(entry);

  // Зберігаємо в localStorage
  const vId = localStorage.getItem('barops_venueId') || '';
  const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
  if (!raw[vId]) raw[vId] = [];
  raw[vId].push(entry);
  localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));

  // Відправляємо на backend і зберігаємо реальний ID
  try {
    const { writeoffsAPI } = await import('../shared/api.js');
    const saved = await writeoffsAPI.create({
      items: [{ productName: entry.prod, productId: entry.prodId, qty: vol, unit: uLbl }],
      category: CAT[finalCat]?.label || finalCat || 'Інше',
      reason:   entry.reason || null,
      venueId:  vId,
    });
    if (saved?.data?.id) {
      entry.id = saved.data.id;
      // Оновлюємо ID в localStorage
      const r2 = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
      const idx = (r2[vId] || []).findIndex(w => w.ts === entry.ts && w.prod === entry.prod);
      if (idx !== -1) { r2[vId][idx].id = entry.id; localStorage.setItem('barops_writeoffs_v1', JSON.stringify(r2)); }
    }
  } catch (err) {
    console.warn('[Writeoff] Backend недоступний:', err.message);
  }

  _formOpen = false;
  _succOpen = true;
  const subEl  = document.getElementById('wo-succ-sub');
  const pillEl = document.getElementById('wo-succ-pill');
  if (subEl)  subEl.textContent  = `${entry.prod} · ${CAT[finalCat]?.label||''} · записано в журнал`;
  if (pillEl) pillEl.textContent = `${entry.prod} · −${vol}${uLbl} · ${CAT[finalCat]?.label||''}`;
  fullRender();
}
function closeSuccess()     { _succOpen=false; openForm(_formMode); }
function closeSuccessExit() { _succOpen=false; _formOpen=false; fullRender(); }

/* ── Переміщення бар↔кухня ── */
function saveTransfers() {
  const vId = localStorage.getItem('barops_venueId') || '';
  const raw = JSON.parse(localStorage.getItem('barops_transfers_v1') || '{}');
  raw[vId] = _transfers;
  localStorage.setItem('barops_transfers_v1', JSON.stringify(raw));
}

function transferCardHTML(t) {
  // Та сама механіка, що в списанні: свайп вліво → «Змінити», іконка-корзина → видалити
  return `
    <div class="wo-swipe-wrap" data-id="${t.id}">
      <div class="wo-swipe-edit" onclick="window.__wo.editTransfer('${t.id}')">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M3 15l2.5-.6 8-8-1.9-1.9-8 8L3 15z" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 3.5l1.9 1.9" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>
        <span class="wo-swipe-edit-lbl">Змінити</span>
      </div>
      <div class="wo-swipe-del" onclick="window.__wo.deleteTransfer('${t.id}')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M7 5V3h4v2M7.5 8.5v5M10.5 8.5v5M4 5l1 10h8l1-10" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="wo-swipe-del-lbl">Видалити</span>
      </div>
      <div class="wo-card" data-id="${t.id}">
        <div class="wo-bar" style="background:var(--teal,#2DD4BF)"></div>
        <div class="wo-card-del" onclick="event.stopPropagation();window.__wo.deleteTransfer('${t.id}')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--text2)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="wo-info">
          <div class="wo-name">${t.prod}</div>
          <div class="wo-meta">${t.dateStr || t.time}</div>
        </div>
        <div class="wo-right">
          <div class="wo-vol" style="color:var(--teal,#2DD4BF)">${t.vol}</div>
        </div>
      </div>
    </div>`;
}

function transferListHTML() {
  const list = _transfers.filter(t => !t.sentAt);
  if (!list.length) return `<div style="text-align:center;padding:14px 8px;color:var(--text2);font-family:var(--font-b);font-size:12px">Немає позицій</div>`;
  return list.map(transferCardHTML).join('');
}

function deleteTransfer(id) {
  const i = _transfers.findIndex(t => t.id === id);
  if (i === -1) return;
  _transfers.splice(i, 1);
  saveTransfers();
  fullRender();
}

// Редагувати ще не надіслане переміщення — відкрити форму з його даними
function editTransfer(id) {
  const t = _transfers.find(x => x.id === id);
  if (!t || t.sentAt) return;
  _formMode = 'transfer';
  _editId   = id;
  _selProd  = _prods.find(p => p.id === t.prodId) || { id: t.prodId, name: t.prod, unit: t.unitKey || 'l', stock: 0, zone: '' };
  _selVol   = t.volNum;
  _selUnit  = t.unitKey || 'l';
  _formOpen = true;
  _formStep = 2;            // з кроку вибору товару (можна змінити товар і кількість)
  fullRender();
}

function setTransferDir(d) { _transferDir = (d === 'kitchen2bar') ? 'kitchen2bar' : 'bar2kitchen'; fullRender(); }

async function submitTransfer() {
  const vol  = _selVol || 0;
  const unit = _selUnit || _selProd?.unit || 'l';
  const uLbl = {l:'л',ml:'мл',sht:'шт',kg:'кг',g:'г'}[unit] || 'л';
  if (!_selProd || !(vol > 0)) return;
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dd   = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}`;
  const dir  = transferDir();
  const entry = {
    id: _editId || ('t' + Date.now().toString(36)),
    prod: _selProd?.name || 'Товар', prodId: _selProd?.id || null,
    volNum: vol, unitKey: unit, vol: `${vol}${uLbl}`,
    time: hhmm, dateStr: `${dd} · ${hhmm}`, ts: now.toISOString(), sentAt: null,
  };
  if (_editId) {                                   // редагування — заміняємо позицію
    const i = _transfers.findIndex(t => t.id === _editId);
    if (i !== -1) _transfers[i] = entry; else _transfers.push(entry);
    _editId = null;
  } else {
    _transfers.push(entry);
  }
  saveTransfers();
  _formOpen = false; _succOpen = true;
  fullRender();
  const titleEl = document.getElementById('wo-succ-title');
  const subEl   = document.getElementById('wo-succ-sub');
  const pillEl  = document.getElementById('wo-succ-pill');
  if (titleEl) titleEl.textContent = 'Переміщення зафіксовано';
  if (subEl)   subEl.textContent   = `${entry.prod} · ${dir.from} → ${dir.to}`;
  if (pillEl)  pillEl.textContent  = `${entry.prod} · ${vol}${uLbl} · ${dir.from}→${dir.to}`;
}

function sendTransferToSyrve() {
  const pend = _transfers.filter(t => t.prodId && !t.sentAt);
  if (!pend.length) return;
  _transferConfirmOpen = true;
  fullRender();
}
function closeTransferConfirm() { _transferConfirmOpen = false; fullRender(); }
function setTransferComment(v) { _transferComment = v; }   // без re-render, щоб textarea не втрачала фокус
function closeTransferResult()  { _transferResult = null; fullRender(); }

async function doSendTransfer() {
  const vId   = localStorage.getItem('barops_venueId') || state.venueId || '';
  const token = localStorage.getItem('barops_token');
  const pend  = _transfers.filter(t => t.prodId && !t.sentAt);
  _transferConfirmOpen = false;
  if (!vId || !token || !pend.length) { _transferResult = { ok: false, msg: 'Немає авторизації або позицій' }; fullRender(); return; }
  _transferResult = { sending: true };           // показуємо спінер у стилізованому вікні
  fullRender();
  try {
    const payload = { items: pend.map(t => ({ productId: t.prodId, amount: t.volNum, unitKey: t.unitKey })) };
    if ((state.role || '').toLowerCase() === 'admin') payload.dir = _transferDir;
    if (_transferComment.trim()) payload.comment = _transferComment.trim();
    const res = await fetch(`${API}/api/pos/transfer-act/${vId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.success) {
      const ts = new Date().toISOString();
      pend.forEach(t => { t.sentAt = ts; });
      saveTransfers();
      const dir = transferDir();
      const where = _isPosterWo ? 'Створено переміщення в Poster.' : 'Чернетка — проведіть у Syrve Office.';
      _transferResult = { ok: true, msg: `${d.itemCount} поз. · ${dir.from} → ${dir.to}. ${where}` };
    } else {
      _transferResult = { ok: false, msg: d.error || ('Помилка ' + res.status) };
    }
  } catch (e) {
    _transferResult = { ok: false, msg: 'Мережева помилка: ' + e.message };
  }
  fullRender();
}

// Стилізоване підтвердження надсилання переміщення
function transferConfirmHTML() {
  if (!_transferConfirmOpen) return '';
  const pend = _transfers.filter(t => t.prodId && !t.sentAt);
  const dir  = transferDir();
  return `
  <div class="wo-syrve-conf-overlay open" onclick="if(event.target===this)window.__wo.closeTransferConfirm()">
    <div class="wo-syrve-conf-sheet" onclick="event.stopPropagation()">
      <div class="wo-sheet-handle"></div>
      <div class="wo-sheet-hdr">
        <div>
          <div class="wo-sheet-title">Надіслати переміщення?</div>
          <div style="font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:3px">${dir.from} → ${dir.to} · ${pend.length} поз.</div>
        </div>
        <div class="wo-sheet-close" onclick="window.__wo.closeTransferConfirm()">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>
      <div class="wo-syrve-conf-scroll">
        <div style="display:flex;flex-direction:column;gap:4px">
          ${pend.map(t => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:rgba(255,255,255,.04);border:0.5px solid var(--border);border-radius:10px">
            <div style="font-size:13px;color:var(--text1);font-family:var(--font-b);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.prod}</div>
            <div style="font-size:13px;font-family:var(--font-h);font-weight:700;color:#2DD4BF;flex-shrink:0;margin-left:10px">${t.vol}</div>
          </div>`).join('')}
        </div>
        <div style="margin-top:12px">
          <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Коментар (необов'язково)</div>
          <textarea oninput="window.__wo.setTransferComment(this.value)" placeholder="Напр. підготовка до банкету…"
            style="width:100%;box-sizing:border-box;min-height:56px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:12px;padding:10px 12px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;resize:vertical">${_transferComment.replace(/</g,'&lt;')}</textarea>
        </div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:12px;line-height:1.5">${_isPosterWo ? 'Документ переміщення створиться в <b style="color:var(--text1)">Poster</b>.' : 'Документ створиться як <b style="color:var(--text1)">чернетка</b> — бухгалтер проведе в Syrve Office.'}</div>
      </div>
      <div class="wo-fnav" style="padding-top:8px">
        <button onclick="window.__wo.closeTransferConfirm()"
          style="flex:1;height:52px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:14px;font-size:14px;color:var(--text1);cursor:pointer;font-family:var(--font-h)">Скасувати</button>
        <button onclick="window.__wo.doSendTransfer()"
          style="flex:2;height:52px;background:#2DD4BF;border:none;border-radius:14px;font-size:15px;font-weight:600;color:#04221e;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 7h11M7 2l5.5 5L7 12" stroke="#04221e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Надіслати
        </button>
      </div>
    </div>
  </div>`;
}

// Стилізований результат (спінер → успіх/помилка)
function transferResultHTML() {
  if (!_transferResult) return '';
  if (_transferResult.sending) {
    return `
    <div class="wo-succ-overlay open" style="z-index:62">
      <div class="wo-succ-icon" style="background:var(--bg2);border-color:var(--border)">
        <span class="auth-spinner" style="width:28px;height:28px;border-width:3px"></span>
      </div>
      <div class="wo-succ-title">Надсилаю у ${posName()}…</div>
      <div class="wo-succ-sub">Створюю документ переміщення</div>
    </div>`;
  }
  const ok = _transferResult.ok;
  return `
  <div class="wo-succ-overlay open" style="z-index:62">
    <div class="wo-succ-icon" style="background:${ok ? 'rgba(45,212,191,.12)' : 'var(--red-bg)'};border-color:${ok ? 'rgba(45,212,191,.4)' : 'var(--red-border)'}">
      ${ok
        ? `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M9 17l6 6 12-12" stroke="#2DD4BF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M10 10l12 12M22 10L10 22" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/></svg>`}
    </div>
    <div class="wo-succ-title">${ok ? 'Переміщення надіслано' : 'Не вдалося надіслати'}</div>
    <div class="wo-succ-sub">${_transferResult.msg}</div>
    <button class="wo-succ-btn" style="background:${ok ? '#2DD4BF' : 'var(--red)'};color:${ok ? '#04221e' : '#fff'};max-width:280px;margin-top:14px" onclick="window.__wo.closeTransferResult()">OK</button>
  </div>`;
}

/* manager */
function setPeriod(p) {
  _mgrPeriod = p;
  if (p === 'custom' && !_mgrFrom) {
    const e = new Date(), s = new Date(); s.setDate(s.getDate() - 7);
    _mgrFrom = s.toISOString().slice(0, 10);
    _mgrTo   = e.toISOString().slice(0, 10);
  }
  fullRender();
}
function setMgrFrom(v) { _mgrFrom = v; fullRender(); }
function setMgrTo(v)   { _mgrTo = v; fullRender(); }
function setMgrFilter(f) { _mgrFilter=f; fullRender(); }

async function sendActToSyrve() {
  const vId   = localStorage.getItem('barops_venueId') || state.venueId || '';
  const token = localStorage.getItem('barops_token');
  if (!vId || !token) { alert('Немає авторизації або venueId'); return; }

  // Ненадіслані позиції з товаром
  const sendItems = _writeoffs.filter(w => w.prodId && !w.sentAt);
  if (!sendItems.length) { alert('Немає списань з товаром для надсилання'); return; }

  // Завантажуємо збережені склади з бекенду
  try {
    const r = await fetch(`${API}/api/pos/saved-stores/${vId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const d = await r.json();
      _syrveStores = d.stores || [];
    }
  } catch { /* ігноруємо, продовжуємо без вибору складу */ }

  // Авто-вибір якщо склад тільки один
  _selStoreId = _syrveStores.length === 1 ? _syrveStores[0].id : null;
  // _isPosterWo / _woReasons завантажені при відкритті сторінки (для кроку 1 форми)

  const byAccount = {};
  for (const w of sendItems) {
    const key = w.accountId || '__auto__';
    if (!byAccount[key]) byAccount[key] = { accountId: w.accountId || null, accountName: w.accountName || 'авто', items: [] };
    byAccount[key].items.push(w);
  }

  _syrveConfirmGroups = Object.values(byAccount);
  _syrveConfirmOpen   = true;
  fullRender();
}

function closeSyrveConfirm() {
  _syrveConfirmOpen   = false;
  _syrveConfirmGroups = [];
  _syrveStores        = [];
  _selStoreId         = null;
  fullRender();
}

function selectWriteoffStore(id) {
  _selStoreId = id;
  fullRender();
}


function closeSyrveResult() {
  _syrveResult = null;
  fullRender();
}

async function doSendActToSyrve() {
  const groups = [..._syrveConfirmGroups];
  _syrveConfirmOpen   = false;
  _syrveConfirmGroups = [];
  fullRender();

  const vId   = localStorage.getItem('barops_venueId') || state.venueId || '';
  const token = localStorage.getItem('barops_token');
  if (!vId || !token || !groups.length) return;

  // Позиції, що фактично надсилаються (усі з груп, включно з попередніми змінами)
  const sentItems = groups.flatMap(g => g.items);

  const btn = document.getElementById('wo-syrve-btn');
  if (btn) { btn.textContent = 'Надсилаю…'; btn.disabled = true; }

  const results = [];
  const errors  = [];
  for (const g of groups) {
    // розбиваємо позиції рахунку за складом (bar/kitchen) — ПФ кухні йдуть на склад кухні
    const byScope = {};
    for (const w of g.items) { const sc = w.scope || 'bar'; (byScope[sc] = byScope[sc] || []).push(w); }
    for (const [scope, witems] of Object.entries(byScope)) {
      // Poster — окремий акт на кожну причину; Syrve — один акт на scope
      const byReason = {};
      for (const w of witems) {
        const rk = _isPosterWo ? (w.reasonId == null ? '__none__' : String(w.reasonId)) : '__all__';
        (byReason[rk] = byReason[rk] || []).push(w);
      }
      for (const [rk, ritems] of Object.entries(byReason)) {
        const grouped = {};
        for (const w of ritems) {
          if (!grouped[w.prodId]) grouped[w.prodId] = { productId: w.prodId, amount: 0, unitKey: w.unitKey || 'l', productName: w.prod, _reasons: new Set() };
          grouped[w.prodId].amount += w.volNum || 0;
          if (w.reason) grouped[w.prodId]._reasons.add(w.reason);   // коментар саме цієї позиції
        }
        const items = Object.values(grouped).map(g => ({ productId: g.productId, amount: g.amount, unitKey: g.unitKey, productName: g.productName, reason: [...g._reasons].join('; ') || undefined }));
        const tag   = scope === 'kitchen' ? ' (кухня)' : '';
        const label = _isPosterWo ? (ritems[0]?.reasonName || 'Без причини') : g.accountName;
        try {
          const reasons = [...new Set(ritems.filter(w => w.reason).map(w => w.reason))].join('; ');
          const body = { items, comment: reasons || undefined, scope };
          if (g.accountId) body.accountId = g.accountId;
          if (_isPosterWo && rk !== '__none__') body.reasonId = rk;          // причина списання Poster
          if (_selStoreId && scope === 'bar') body.storeId = _selStoreId;   // ручний вибір складу — лише для бару
          const resp = await fetch(`${API}/api/pos/writeoff-act/${vId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body),
          });
          const data = await resp.json();
          if (!resp.ok) {
            const det = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : '';
            throw new Error(det || data.error || 'Помилка');
          }
          results.push(`✓ ${label}${tag}: ${data.itemCount} позицій${data.syrveDocId ? ` · ID: ${data.syrveDocId.slice(0,8)}…` : ''}`);
        } catch (err) {
          errors.push(`✗ ${label}${tag}: ${err.message}`);
        }
      }
    }
  }

  if (btn) { btn.textContent = 'Надіслати'; btn.disabled = false; }

  if (errors.length === 0 && results.length > 0) {
    const now = new Date();
    const histEntry = {
      ts:        now.toISOString(),
      date:      `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      accounts:  results,
      itemCount: sentItems.length,
      acts: groups.map(g => ({
        accountName: g.accountName,
        items: Object.values(g.items.reduce((acc, w) => {
          const k = w.prodId || w.prod;
          if (!acc[k]) acc[k] = { prod: w.prod, amount: 0, unitKey: w.unitKey || 'l' };
          acc[k].amount += w.volNum || 0;
          return acc;
        }, {})),
      })),
    };
    _sentHistory.unshift(histEntry);
    const histKey = `barops_wo_history_${vId}`;
    try { localStorage.setItem(histKey, JSON.stringify(_sentHistory.slice(0, 20))); } catch {}

    // Зберігаємо акт на сервері (історія не губиться при очищенні кешу / на іншому пристрої)
    try {
      await fetch(`${API}/api/writeoffs/acts/${vId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ payload: histEntry, itemCount: sentItems.length }),
      });
    } catch (e) { /* офлайн — лишається в localStorage */ }

    // Позначаємо надісланими (не видаляємо — лишаються в історії 90 днів)
    const sentIds = sentItems.map(w => w.id).filter(Boolean);
    if (sentIds.length) {
      try {
        await fetch(`${API}/api/writeoffs/mark-sent`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ ids: sentIds }),
        });
      } catch (e) { /* ігноруємо */ }
    }
    const nowIso = new Date().toISOString();
    for (const w of sentItems) w.sentAt = nowIso;   // зникають із «не відправлені», лишаються в історії
    const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
    raw[vId] = _writeoffs;
    localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));

    fullRender();
    initSwipe();
  } else {
    _syrveResult = {
      isError: errors.length > 0,
      lines:   [...results, ...errors],
    };
    fullRender();
  }
}
function openActDetail(idx) { _detailAct = _sentHistory[idx] || null; fullRender(); }
function closeActDetail()  { _detailAct = null; fullRender(); }
function openDay(key) { _detailDay = key; fullRender(); }
function closeDay()   { _detailDay = null; fullRender(); }

function exportReport(t) {
  const m = { pdf:'📄 PDF-звіт сформовано', csv:'📊 Excel готовий', tg:'✈️ Відправлено в Telegram' };
  alert(m[t]||'Готово');
}
function addCustomReason() {
  const cat = prompt('Категорія (biy/psuv/deg/insh):');
  if (!REASONS[cat]) { alert('Невірна категорія'); return; }
  const text = prompt('Текст причини:');
  if (text?.trim()) { REASONS[cat].push(text.trim()); refreshReasons(); }
}
function refreshReasons() {
  const el = document.getElementById('wo-reasons-wrap');
  if (!el) { fullRender(); return; }
  el.innerHTML = Object.entries(REASONS).map(([cat, reasons]) => `
  <div style="padding:10px 14px;border-bottom:1px solid var(--border)">
    <div style="font-size:11px;color:${CAT[cat].color};font-family:var(--font-b);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      ${CAT[cat].label}
    </div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${reasons.map((r,i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border-radius:8px">
        <span style="flex:1;font-size:12px;color:var(--text1);font-family:var(--font-b)">${r}</span>
        <div onclick="window.__wo.removeReason('${cat}',${i})"
          style="width:20px;height:20px;border-radius:6px;background:var(--red-bg);border:1px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="var(--red)" stroke-width="1.2" stroke-linecap="round"/></svg>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('');
}
function removeReason(cat, idx) {
  if (REASONS[cat]) { REASONS[cat].splice(idx, 1); refreshReasons(); }
}

let _ctxMenuEl = null;
function removeCtxMenu() {
  if (_ctxMenuEl) { _ctxMenuEl.remove(); _ctxMenuEl = null; }
}
function initContextMenu() {
  document.addEventListener('contextmenu', e => {
    const card = e.target.closest('.wo-card');
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;
    e.preventDefault();
    removeCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'wo-ctx-menu';
    menu.innerHTML = `
      <div class="wo-ctx-item" id="wo-ctx-del">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Видалити
      </div>`;
    const x = Math.min(e.clientX, window.innerWidth  - 160);
    const y = Math.min(e.clientY, window.innerHeight - 60);
    menu.style.left = x + 'px';
    menu.style.top  = y + 'px';
    document.body.appendChild(menu);
    _ctxMenuEl = menu;
    menu.querySelector('#wo-ctx-del').addEventListener('click', () => {
      removeCtxMenu();
      deleteWriteoff(id);
    });
  });
  document.addEventListener('click',   removeCtxMenu);
  document.addEventListener('keydown',  e => { if (e.key === 'Escape') removeCtxMenu(); });
}

function initSwipe() {
  if (_swipeListenerAdded) return;
  _swipeListenerAdded = true;
  let sx = 0, sy = 0, activeCard = null;
  document.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.wo-swipe-wrap');
    const card = wrap?.querySelector('.wo-card');
    if (activeCard && activeCard !== card) {
      activeCard.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)';
      activeCard.style.transform = 'translateX(0)';
      activeCard = null;
    }
    if (!card) return;
    activeCard = card;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    card.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!activeCard) return;
    const dx = e.touches[0].clientX - sx;
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dy > 12 && dy > Math.abs(dx)) { activeCard = null; return; }
    if (dx < 0) activeCard.style.transform = `translateX(${Math.max(dx, -152)}px)`;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!activeCard) return;
    const dx = e.changedTouches[0].clientX - sx;
    activeCard.style.transition = 'transform .25s cubic-bezier(.22,1,.36,1)';
    if (dx < -50) {
      activeCard.style.transform = 'translateX(-152px)';
    } else {
      activeCard.style.transform = 'translateX(0)';
      activeCard = null;
    }
  });
}

async function deleteWriteoff(id) {
  const idx = _writeoffs.findIndex(w => w.id === id);
  if (idx === -1) return;
  _writeoffs.splice(idx, 1);
  // Оновити localStorage
  const vId = localStorage.getItem('barops_venueId') || '';
  const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
  raw[vId] = _writeoffs;
  localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));
  fullRender();
  setTimeout(initSwipe, 50);
  // Видалити з backend
  try {
    const token = localStorage.getItem('barops_token');
    await fetch(`${API}/api/writeoffs/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (e) { console.warn('[DeleteWriteoff]', e.message); }
}


/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  async render() {
    // Звітний вид (періоди тиждень/місяць + повна історія) — менеджерам/адміну/керуючому ТА кухні (шеф/кухар).
    // Бармен лишається на операційному виді. Шеф/кухар скоупляться до кухні (переміщення кухня→бар, кухонні ПФ).
    _view       = ['admin', 'manager', 'director', 'chef', 'cook'].includes((state.role || '').toLowerCase()) ? 'manager' : 'bartender';
    _catFilter  = 'all';
    _formOpen   = false;
    _formStep   = 1;
    _selCat     = null;
    _selProd    = null;
    _selVol     = null;
    _selReason  = null;
    _prodSearch = '';
    _mgrPeriod  = 'day';
    _mgrFilter  = 'all';
    _mgrFrom    = ''; _mgrTo = '';
    _detailDay  = null;
    _priceSyncMsg = '';
    _succOpen   = false;
    _transferConfirmOpen = false;
    _transferResult      = null;
    _prodTab    = 'goods';
    _preps      = []; _prepsLoaded = false; _prepsLoading = false;

    // Завантажуємо списання: спочатку з localStorage (швидко), потім замінюємо з бекенду
    const vId = localStorage.getItem('barops_venueId') || state.venueId || '';
    try { _sentHistory = JSON.parse(localStorage.getItem(`barops_wo_history_${vId}`) || '[]'); } catch { _sentHistory = []; }
    const stored = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
    _writeoffs = stored[vId] || [];
    _formMode  = 'writeoff';
    try { const ts = JSON.parse(localStorage.getItem('barops_transfers_v1') || '{}'); _transfers = ts[vId] || []; } catch { _transfers = []; }

    // Історія актів — головне джерело сервер, localStorage лише офлайн-кеш
    try {
      const aTok = localStorage.getItem('barops_token');
      const aRes = await fetch(`${API}/api/writeoffs/acts/${vId}`, {
        headers: aTok ? { Authorization: `Bearer ${aTok}` } : {},
      });
      if (aRes.ok) {
        const ad = await aRes.json();
        const serverHist = Array.isArray(ad.acts) ? ad.acts.map(a => a.payload).filter(Boolean) : [];
        const seen = new Set(serverHist.map(h => h && h.ts));
        // сервер + локальні записи, яких ще немає на сервері (по ts)
        _sentHistory = [...serverHist, ..._sentHistory.filter(h => h && !seen.has(h.ts))]
          .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
        try { localStorage.setItem(`barops_wo_history_${vId}`, JSON.stringify(_sentHistory.slice(0, 20))); } catch {}
      }
    } catch { /* офлайн — лишаємо localStorage */ }

    // Собівартість товарів із Syrve Office — для «Збиток оціночно»
    await loadPrices(vId);

    try {
      const woToken = localStorage.getItem('barops_token');
      const woRes = await fetch(`${API}/api/writeoffs?venueId=${encodeURIComponent(vId)}`, {
        headers: woToken ? { Authorization: `Bearer ${woToken}` } : {},
      });
      if (woRes.ok) {
        const woData = await woRes.json();
        // Зберігаємо accountId/accountName з localStorage перед перезаписом
        const localAccMap = {};
        for (const w of _writeoffs) {
          if (w.accountId) localAccMap[w.id] = { accountId: w.accountId, accountName: w.accountName };
        }
        _writeoffs = (woData.data || []).reverse().map(w => {
          const catKey = Object.entries(CAT).find(([, v]) => v.label === w.category)?.[0] || 'insh';
          const item   = w.items?.[0] || {};
          const qty    = item.qty || 0;
          const uLbl   = item.unit || 'л';
          const uKey   = {'л':'l','мл':'ml','шт':'sht','кг':'kg','г':'g'}[uLbl] || 'l';
          const d      = new Date(w.createdAt);
          const hhmm   = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          const dd     = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
          const localAcc = localAccMap[w.id] || {};
          return {
            id:          w.id,
            cat:         catKey,
            prod:        item.productName || 'Товар',
            prodId:      item.productId || null,
            meta:        w.reason || (catKey !== 'insh' ? (CAT[catKey]?.label||'') : ''),
            vol:         `−${qty}${uLbl}`,
            volNum:      qty,
            unitKey:     uKey,
            valColor:    CAT[catKey]?.color || 'var(--text0)',
            reason:      w.reason || '',
            accountId:   localAcc.accountId   || null,
            accountName: localAcc.accountName || null,
            time:        hhmm,
            dateStr:     `${dd} · ${hhmm}`,
            ts:          w.createdAt,
            sentAt:      w.sentAt || null,
            note:        w.note || '',
            author:      w.user?.name || '',
          };
        });
        // Оновлюємо кеш
        const raw = JSON.parse(localStorage.getItem('barops_writeoffs_v1') || '{}');
        raw[vId] = _writeoffs;
        localStorage.setItem('barops_writeoffs_v1', JSON.stringify(raw));
      }
    } catch (e) {
      console.warn('[Writeoff] Не вдалось завантажити з backend, використовуємо localStorage:', e.message);
    }

    // Причини списання Poster (для кроку 1 форми) — визначаємо тип закладу
    try {
      const token = localStorage.getItem('barops_token');
      const rr = await fetch(`${API}/api/pos/writeoff-reasons/${vId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (rr.ok) { const rd = await rr.json(); _isPosterWo = !!rd.poster; _woReasons = rd.reasons || []; }
    } catch { /* не Poster / офлайн */ }

    // Завантажуємо рахунки списань з бекенду (доступно всім ролям)
    try {
      const token = localStorage.getItem('barops_token');
      const accRes = await fetch(`${API}/api/pos/saved-accounts/${vId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (accRes.ok) {
        const accData = await accRes.json();
        let accounts = accData.accounts || [];
        if (accounts.length > 0) {
          // Адмін зберіг рахунки в налаштуваннях — використовуємо їх і чистимо fallback
          localStorage.setItem(`barops_wo_accounts_${vId}`, JSON.stringify(accounts));
          localStorage.removeItem(`barops_syrve_accounts_${vId}`);
        } else {
          // Адмін не налаштував — очищаємо ключ адмін-рахунків щоб не було старих даних
          localStorage.removeItem(`barops_wo_accounts_${vId}`);
          // Адмін не зберіг рахунки — спробуємо підвантажити напряму з Syrve
          // Але тільки якщо в fallback-кеші ще нічого немає (щоб не спамити Syrve API)
          // Зберігаємо під окремим ключем, щоб не забруднювати адмін-налаштований список
          const fallbackCached = (() => {
            try { return JSON.parse(localStorage.getItem(`barops_syrve_accounts_${vId}`) || '[]'); } catch { return []; }
          })();
          if (fallbackCached.length === 0) {
            try {
              const syrveRes = await fetch(`${API}/api/pos/syrve-accounts/${vId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (syrveRes.ok) {
                const syrveData = await syrveRes.json();
                accounts = syrveData.accounts || [];
                if (accounts.length > 0) {
                  localStorage.setItem(`barops_syrve_accounts_${vId}`, JSON.stringify(accounts));
                }
              }
            } catch {}
          } else {
            accounts = fallbackCached;
          }
        }
      }
    } catch (e) {
      console.warn('[Writeoff] Рахунки не завантажились:', e.message);
    }

    // Завантажуємо товари: одразу з кешу, оновлення — у фоні тільки якщо кеш старіший 30 хв
    // v2 — інвалідація старого кешу (одиниці Poster тощо)
    const prodsKey = `barops_prods_v3_${vId}`;
    let prodsCacheTs = 0;
    try {
      const cached = JSON.parse(localStorage.getItem(prodsKey) || '{}');
      if (Array.isArray(cached.data) && cached.data.length) { _prods = cached.data; prodsCacheTs = cached.ts || 0; }
    } catch {}
    const PRODS_CACHE_TTL = 30 * 60 * 1000; // 30 хвилин — не відкривати Syrve-слот якщо список свіжий
    if (Date.now() - prodsCacheTs > PRODS_CACHE_TTL) {
      ;(async () => {
        try {
          const tkn = localStorage.getItem('barops_token');
          const res = await fetch(`${API}/api/pos/balance/${vId}`, {
            headers: tkn ? { Authorization: `Bearer ${tkn}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            const fresh = [];
            for (const store of (data.stores || [])) {
              const zone = /бар|bar/i.test(store.storeName || '') ? 'bar' : /кухн|kitchen/i.test(store.storeName || '') ? 'kitchen' : '';
              for (const item of (store.items || [])) {
                if (item.name && !item.name.match(/^[0-9a-f-]{36}$/i) && !fresh.find(p=>p.id===item.id)) {
                  fresh.push({ id: item.id, name: item.name, stock: item.amount ?? null, unit: normalizeUnit(item.unit), zone });
                }
              }
            }
            _prods = fresh;
            try { localStorage.setItem(prodsKey, JSON.stringify({ ts: Date.now(), data: _prods })); } catch {}
            refreshProdList();
          }
        } catch (e) {
          console.warn('[Writeoff] Товари не завантажились:', e.message);
        }
      })();
    }

    return buildHTML();
  },

  init() {
    window.__wo = {
      setCatFilter, openForm, closeForm, maybeClose,
      selectCat, selectPosterCat, searchProds, selectProd,
      setVol, updateVol, setUnit, selectReason, updateCustomReason, selectAccount,
      nextStep, prevStep, submitForm, closeSuccess, closeSuccessExit,
      setPeriod, setMgrFrom, setMgrTo, setMgrFilter, exportReport, syncPrices: syncPricesWo,
      sendActToSyrve, closeSyrveConfirm, doSendActToSyrve, closeSyrveResult, selectWriteoffStore,
      openActDetail, closeActDetail, openDay, closeDay,
      addCustomReason, removeReason,
      deleteWriteoff, editWriteoff,
      sendTransferToSyrve, deleteTransfer, editTransfer, setTransferDir,
      closeTransferConfirm, doSendTransfer, closeTransferResult, setTransferComment,
      setProdTab,
    };
    initSwipe();
    initContextMenu();
  },
};
