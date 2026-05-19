/* ============================================================
   BarOps — pages/debts.js
   Борги між закладами:
   • Продажа — форма «з якого в який» → Telegram бухгалтеру
   • Борг — список активних боргів з галочками повернення
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const VENUES = ['Sky Lounge', 'Bar Noir', 'Rooftop Bar', 'The Garden'];

let DEBTS = [
  { id:1, from:'Sky Lounge', to:'Bar Noir',    item:'Hendrick\'s Gin 0.7л', qty:2, unit:'пляш.', date:'07.05.2026', returnDate:null, returned:false, note:'Термінова потреба на event' },
  { id:2, from:'Bar Noir',   to:'Sky Lounge',  item:'Aperol 1л',            qty:3, unit:'пляш.', date:'06.05.2026', returnDate:null, returned:false, note:'' },
  { id:3, from:'Sky Lounge', to:'Rooftop Bar', item:'Campari 0.7л',         qty:1, unit:'пляш.', date:'05.05.2026', returnDate:'08.05.2026', returned:true, note:'Повернуто о 18:00' },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _mode       = null;   // null | 'sale' | 'debt'
let _filter     = 'active'; // 'active' | 'all'
let _saleFrom   = VENUES[0];
let _saleTo     = VENUES[1];
let _newDebt    = { from: VENUES[0], to: VENUES[1], item:'', qty:1, unit:'пляш.', note:'' };
let _submitted  = false;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="dbt-css">
.dbt-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.dbt-scroll{overflow-y:auto;flex:1}.dbt-scroll::-webkit-scrollbar{width:0}

/* topbar */
.dbt-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.dbt-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dbt-back:active{background:rgba(255,255,255,.08)}
.dbt-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.dbt-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* mode selector */
.dbt-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 20px 16px}
.dbt-mode-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:16px 14px;cursor:pointer;transition:all .18s;display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-align:left;width:100%}
.dbt-mode-card:active{opacity:.8}
.dbt-mode-card.sale{background:var(--green-bg);border-color:var(--green-border)}
.dbt-mode-name{font-size:14px;font-weight:600;color:var(--text0)}
.dbt-mode-name.sale{color:var(--green)}
.dbt-mode-desc{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.4}

/* summary */
.dbt-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 10px}
.dbt-stat{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px;text-align:center}
.dbt-stat-val{font-family:var(--font-h);font-size:24px;font-weight:700;line-height:1}
.dbt-stat-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:5px;text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* sec */
.dbt-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.dbt-sec-link{font-size:11px;color:var(--teal);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* filter tabs */
.dbt-filter{display:flex;gap:2px;margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.dbt-ftab{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.dbt-ftab.act{background:var(--bg3);color:var(--text0)}

/* debt cards */
.dbt-list{padding:0 20px;display:flex;flex-direction:column;gap:8px}
.dbt-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;transition:all .15s}
.dbt-card.returned{opacity:.6}
.dbt-card-main{padding:14px 16px}
.dbt-route{display:flex;align-items:center;gap:6px;margin-bottom:10px}
.dbt-venue{font-size:11px;font-family:var(--font-b);background:var(--bg3);border:0.5px solid var(--border);border-radius:18px;padding:3px 9px;color:var(--text1)}
.dbt-venue.dest{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.dbt-item-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0}
.dbt-item-name{font-size:14px;font-weight:600;color:var(--text0)}
.dbt-item-qty{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--green);letter-spacing:-.01em}
.dbt-note{font-size:11px;color:var(--text2);font-family:var(--font-b);background:var(--bg2);border-radius:8px;padding:7px 10px;margin-top:8px}
.dbt-card-footer{display:flex;gap:6px;padding:0 16px 12px}

/* form overlay */
.dbt-form-overlay{position:absolute;inset:0;z-index:50;background:var(--bg1);display:none;flex-direction:column;animation:dbtSlide .3s cubic-bezier(.22,1,.36,1)}
.dbt-form-overlay.open{display:flex}
@keyframes dbtSlide{from{transform:translateY(100%)}to{transform:none}}
.dbt-form-scroll{overflow-y:auto;flex:1;padding:0 14px}.dbt-form-scroll::-webkit-scrollbar{width:0}

/* form fields */
.dbt-grp{margin-bottom:12px}
.dbt-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.dbt-inp{width:100%;height:48px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s}
.dbt-inp:focus{border-color:var(--teal);box-shadow:0 0 0 2px rgba(20,184,166,.1)}
.dbt-sel{width:100%;height:48px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;cursor:pointer;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236A6762' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
.dbt-sel:focus{border-color:var(--teal)}
.dbt-route-row{display:flex;align-items:center;gap:8px}
.dbt-route-arrow{font-size:20px;color:var(--text3);flex-shrink:0}
.dbt-qty-row{display:flex;gap:8px}
.dbt-qty-inp{flex:1;height:48px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:22px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;text-align:center}
.dbt-qty-inp:focus{border-color:var(--teal);box-shadow:0 0 0 2px rgba(20,184,166,.1)}
.dbt-unit-sel{width:100px;height:48px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:0 10px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;cursor:pointer;-webkit-appearance:none;flex-shrink:0}
.dbt-textarea{width:100%;height:80px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);resize:none;outline:none;line-height:1.5;transition:border-color .2s}
.dbt-textarea:focus{border-color:var(--teal);box-shadow:0 0 0 2px rgba(20,184,166,.1)}
.dbt-textarea::placeholder{color:var(--text2)}

/* tg preview */
.dbt-tg-preview{background:var(--glass-bg);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:4px}
.dbt-tg-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:6px}
.dbt-tg-msg{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.7;background:var(--bg3);border-radius:8px;padding:10px 12px}

/* form actions */
.dbt-form-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.dbt-btn{width:100%;height:52px;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.dbt-btn-teal{background:var(--green);color:#000}
.dbt-btn-teal:active{opacity:.85}
.dbt-btn-amber{background:var(--amber);color:#fff;box-shadow:0 4px 20px rgba(251,191,36,.20)}
.dbt-btn-amber:active{background:#d48c20}
.dbt-btn-ghost{background:var(--bg2);border:0.5px solid var(--border);color:var(--text1)}
.dbt-btn-ghost:active{background:rgba(255,255,255,.08)}

/* success overlay */
.dbt-success{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.85);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.dbt-success.open{display:flex;animation:dbtFade .3s ease}
@keyframes dbtFade{from{opacity:0}to{opacity:1}}
</style>`;

let _mgrVenueEdit = false; // показати форму редагування закладів
let _venues = [...VENUES]; // копія для редагування менеджером

/* ════════════════════════
   MANAGER HOME
════════════════════════ */
function mgrHomeHTML() {
  const active = DEBTS.filter(d => !d.returned);
  const myVenue = state.venue || VENUES[0];

  // Зведення по закладах
  const summary = _venues.map(v => {
    const owes  = DEBTS.filter(d => d.from === v && !d.returned).length;
    const owed  = DEBTS.filter(d => d.to   === v && !d.returned).length;
    return { v, owes, owed };
  }).filter(x => x.owes > 0 || x.owed > 0);

  return `
  <div class="dbt-topbar" style="flex-shrink:0">
    <div class="dbt-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="dbt-title">Борги — Менеджер</div>
      <div class="dbt-sub">Всі заклади · ${active.length} активних</div>
    </div>
    <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--amber);font-family:var(--font-b)">${active.length} активних</div>
  </div>

  <div class="dbt-scroll">
    <!-- Зведення по закладах -->
    <div class="dbt-sec" style="padding-top:4px">
      Зведення по закладах
      <button class="dbt-sec-link" onclick="window.__dbt.toggleVenueEdit()">⚙ Заклади</button>
    </div>

    ${_mgrVenueEdit ? `
    <div style="margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;padding:14px">
      <div style="font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);margin-bottom:10px">Налаштування закладів</div>
      ${_venues.map((v,i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
        <input style="flex:1;height:40px;background:rgba(255,255,255,.06);border:0.5px solid var(--border);border-radius:9px;padding:0 12px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none" value="${v}" onchange="window.__dbt.renameVenue(${i},this.value)"/>
        <div onclick="window.__dbt.removeVenue(${i})" style="width:32px;height:32px;background:var(--red-bg);border:1px solid var(--red-border);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
      </div>`).join('')}
      <button onclick="window.__dbt.addVenue()" style="width:100%;height:38px;background:var(--green-bg);border:0.5px dashed var(--green-border);border-radius:9px;font-size:13px;color:var(--green);cursor:pointer;font-family:var(--font-b);margin-top:4px">+ Додати заклад</button>
      <button onclick="window.__dbt.toggleVenueEdit()" style="width:100%;height:38px;background:var(--green);border:none;border-radius:9px;font-size:13px;color:#000;cursor:pointer;font-family:var(--font-b);margin-top:8px">Зберегти</button>
    </div>` : `
    <div style="margin:0 14px 10px;background:var(--glass-bg);border:0.5px solid var(--border);border-radius:14px;overflow:hidden">
      ${summary.length ? summary.map(s => `
      <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border)">
        <div style="flex:1;font-size:13px;color:var(--text1);font-family:var(--font-b);font-weight:500">${s.v}</div>
        ${s.owes > 0 ? `<div style="font-size:11px;color:var(--red);font-family:var(--font-b)">Винен: ${s.owes}</div>` : ''}
        ${s.owed > 0 ? `<div style="font-size:11px;color:var(--green);font-family:var(--font-b)">Йому: ${s.owed}</div>` : ''}
      </div>`).join('') : `
      <div style="padding:16px;text-align:center;font-size:13px;color:var(--text2);font-family:var(--font-b)">Активних боргів немає</div>`}
    </div>`}

    <!-- Нова операція -->
    <div class="dbt-sec">Нова операція</div>
    <div class="dbt-mode-grid">
      <button class="dbt-mode-card sale" onclick="window.__dbt.openMode('sale')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div>
          <div class="dbt-mode-name sale">Передати товар</div>
          <div class="dbt-mode-desc">З одного закладу в інший</div>
        </div>
      </button>
      <button class="dbt-mode-card" onclick="window.__dbt.openMode('debt')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.5"/></svg>
        <div>
          <div class="dbt-mode-name">Записати борг</div>
          <div class="dbt-mode-desc">Хто кому винен</div>
        </div>
      </button>
    </div>

    <!-- Всі борги -->
    <div class="dbt-sec">
      Всі борги
      <div style="display:flex;gap:2px;background:var(--bg2);border:0.5px solid var(--border);border-radius:7px;padding:2px">
        <button class="dbt-ftab ${_filter==='active'?'act':''}" onclick="window.__dbt.setFilter('active')" style="height:24px;min-width:64px">Активні (${active.length})</button>
        <button class="dbt-ftab ${_filter==='all'?'act':''}"    onclick="window.__dbt.setFilter('all')"    style="height:24px;min-width:48px">Всі (${DEBTS.length})</button>
      </div>
    </div>
    <div class="dbt-list" id="dbt-list">${debtListHTML()}</div>
    <div style="height:14px"></div>
  </div>`;
}
function homeHTML() {
  const active  = DEBTS.filter(d => !d.returned).length;
  const total   = DEBTS.length;
  const myVenue = state.venue || 'Sky Lounge';
  const owedToMe = DEBTS.filter(d => d.to === myVenue && !d.returned).length;
  const iOwe    = DEBTS.filter(d => d.from === myVenue && !d.returned).length;

  return `
  <div class="dbt-topbar" style="flex-shrink:0">
    <div class="dbt-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="dbt-title">Борги між закладами</div>
      <div class="dbt-sub">${state.venue}</div>
    </div>
    <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--amber);font-family:var(--font-b)">${active} активних</div>
  </div>

  <div class="dbt-scroll">
    <!-- Summary -->
    <div class="dbt-summary">
      <div class="dbt-stat">
        <div class="dbt-stat-val" style="color:var(--amber)">${iOwe}</div>
        <div class="dbt-stat-lbl">Ми повинні<br/>повернути</div>
      </div>
      <div class="dbt-stat">
        <div class="dbt-stat-val" style="color:var(--green)">${owedToMe}</div>
        <div class="dbt-stat-lbl">Повинні<br/>нам</div>
      </div>
    </div>

    <!-- Mode selector -->
    <div class="dbt-sec">Нова операція</div>
    <div class="dbt-mode-grid">
      <button class="dbt-mode-card sale" onclick="window.__dbt.openMode('sale')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div>
          <div class="dbt-mode-name sale">Передати товар</div>
          <div class="dbt-mode-desc">З одного закладу в інший</div>
        </div>
      </button>
      <button class="dbt-mode-card" onclick="window.__dbt.openMode('debt')">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.5"/></svg>
        <div>
          <div class="dbt-mode-name">Записати борг</div>
          <div class="dbt-mode-desc">Хто кому винен</div>
        </div>
      </button>
    </div>

    <!-- Debt list -->
    <div class="dbt-sec">
      Активні борги
      <div style="display:flex;gap:2px;background:var(--bg2);border:0.5px solid var(--border);border-radius:7px;padding:2px">
        <button class="dbt-ftab ${_filter==='active'?'act':''}" onclick="window.__dbt.setFilter('active')" style="height:24px;min-width:64px">Активні (${active})</button>
        <button class="dbt-ftab ${_filter==='all'?'act':''}"    onclick="window.__dbt.setFilter('all')"    style="height:24px;min-width:48px">Всі (${total})</button>
      </div>
    </div>
    <div class="dbt-list" id="dbt-list">
      ${debtListHTML()}
    </div>
    <div style="height:14px"></div>
  </div>`;
}

function debtListHTML() {
  const list = _filter === 'active' ? DEBTS.filter(d => !d.returned) : DEBTS;
  if (!list.length)
    return `<div style="text-align:center;padding:20px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Немає записів</div>`;

  return list.map(d => `
  <div class="dbt-card${d.returned ? ' returned' : ''}">
    <div class="dbt-card-main">
      <div class="dbt-route">
        <span class="dbt-venue">${d.from}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <span class="dbt-venue dest">${d.to}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--text3);font-family:var(--font-b)">${d.date}</span>
      </div>
      <div class="dbt-item-row">
        <div class="dbt-item-name">${d.item}</div>
        <div class="dbt-item-qty">${d.qty} ${d.unit}</div>
      </div>
      ${d.note ? `<div class="dbt-note">${d.note}</div>` : ''}
    </div>
    ${!d.returned ? `
    <div class="dbt-card-footer">
      <button onclick="window.__dbt.toggleReturn(${d.id})"
        style="flex:1;height:34px;border-radius:9px;background:var(--green);border:none;font-size:12px;font-weight:600;color:#000;cursor:pointer;font-family:var(--font-b)">Повернути</button>
      <button style="height:34px;padding:0 14px;border-radius:9px;background:var(--bg2);border:0.5px solid var(--border);font-size:12px;color:var(--text2);cursor:pointer;font-family:var(--font-b)">Деталі</button>
    </div>` : `
    <div style="display:flex;align-items:center;gap:8px;padding:0 16px 12px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
      <span style="font-size:12px;color:var(--text2);font-family:var(--font-b)">${d.returnDate ? `Повернуто ${d.returnDate}` : 'Повернуто'}</span>
    </div>`}
  </div>`).join('');
}

function saleFormHTML() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('uk-UA', {hour:'2-digit',minute:'2-digit'});
  const dateStr = now.toLocaleDateString('uk-UA');

  return `
  <div class="dbt-topbar" style="flex-shrink:0">
    <div class="dbt-back" onclick="window.__dbt.closeForm()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="dbt-title">Продажа між закладами</div>
      <div class="dbt-sub">Надішле у Telegram бухгалтеру</div>
    </div>
  </div>
  <div class="dbt-form-scroll">
    <div class="dbt-grp">
      <div class="dbt-lbl">З якого закладу → В який</div>
      <div class="dbt-route-row">
        <select class="dbt-sel" id="sale-from" onchange="window.__dbt.updateSalePreview()" style="flex:1">
          ${VENUES.map(v => `<option ${v===_saleFrom?'selected':''}>${v}</option>`).join('')}
        </select>
        <div class="dbt-route-arrow">→</div>
        <select class="dbt-sel" id="sale-to" onchange="window.__dbt.updateSalePreview()" style="flex:1">
          ${VENUES.map(v => `<option ${v===_saleTo?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Товар</div>
      <input class="dbt-inp" id="sale-item" type="text" placeholder="Назва товару, марка, об'єм…" oninput="window.__dbt.updateSalePreview()"/>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Кількість та одиниця</div>
      <div class="dbt-qty-row">
        <input class="dbt-qty-inp" id="sale-qty" type="number" min="1" value="1" oninput="window.__dbt.updateSalePreview()"/>
        <select class="dbt-unit-sel" id="sale-unit" onchange="window.__dbt.updateSalePreview()">
          ${['пляш.','л','кг','шт','ящ'].map(u => `<option>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Ціна за одиницю (₴)</div>
      <input class="dbt-inp" id="sale-price" type="number" placeholder="0.00" oninput="window.__dbt.updateSalePreview()"/>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Примітка</div>
      <textarea class="dbt-textarea" id="sale-note" placeholder="Додаткова інформація…" oninput="window.__dbt.updateSalePreview()"></textarea>
    </div>
    <div class="dbt-tg-preview">
      <div class="dbt-tg-lbl">Повідомлення в Telegram</div>
      <div class="dbt-tg-msg" id="sale-preview">
        💸 Продажа між закладами<br/>
        З: ${_saleFrom} → В: ${_saleTo}<br/>
        Товар: —<br/>
        Кількість: 1 пляш.<br/>
        Бармен: ${state.user || 'Бармен'}<br/>
        Дата: ${dateStr} · ${timeStr}
      </div>
    </div>
    <div style="height:8px"></div>
  </div>
  <div class="dbt-form-actions">
    <button class="dbt-btn dbt-btn-teal" onclick="window.__dbt.submitSale()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 7.5L14.5 2 11 14 7.5 9.5 13 4M7.5 9.5L6 13" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Надіслати бухгалтеру
    </button>
    <button class="dbt-btn dbt-btn-ghost" onclick="window.__dbt.closeForm()">Скасувати</button>
  </div>`;
}

function debtFormHTML() {
  return `
  <div class="dbt-topbar" style="flex-shrink:0">
    <div class="dbt-back" onclick="window.__dbt.closeForm()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div>
      <div class="dbt-title">Зафіксувати борг</div>
      <div class="dbt-sub">Залишиться в журналі до повернення</div>
    </div>
  </div>
  <div class="dbt-form-scroll">
    <div style="margin-bottom:12px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:12px;padding:10px 13px;font-size:12px;color:var(--amber);font-family:var(--font-b);line-height:1.5">
      ⚠ Борг висітиме в журналі обох закладів допоки не поставлять галочку «Повернуто»
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Хто позичив кому</div>
      <div class="dbt-route-row">
        <select class="dbt-sel" id="debt-from" style="flex:1">
          ${VENUES.map(v => `<option ${v===_newDebt.from?'selected':''}>${v}</option>`).join('')}
        </select>
        <div class="dbt-route-arrow">→</div>
        <select class="dbt-sel" id="debt-to" style="flex:1">
          ${VENUES.map(v => `<option ${v===_newDebt.to?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Що позичили</div>
      <input class="dbt-inp" id="debt-item" type="text" placeholder="Назва товару…" value="${_newDebt.item}"/>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Кількість</div>
      <div class="dbt-qty-row">
        <input class="dbt-qty-inp" id="debt-qty" type="number" min="1" value="${_newDebt.qty}"/>
        <select class="dbt-unit-sel" id="debt-unit">
          ${['пляш.','л','кг','шт','ящ'].map(u => `<option ${u===_newDebt.unit?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dbt-grp">
      <div class="dbt-lbl">Примітка</div>
      <textarea class="dbt-textarea" id="debt-note" placeholder="Причина, деталі…">${_newDebt.note}</textarea>
    </div>
    <div style="height:8px"></div>
  </div>
  <div class="dbt-form-actions">
    <button class="dbt-btn dbt-btn-amber" onclick="window.__dbt.submitDebt()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="#fff" stroke-width="1.4" fill="none"/>
        <path d="M5 8l3 3 3-3M8 5v6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Зафіксувати борг
    </button>
    <button class="dbt-btn dbt-btn-ghost" onclick="window.__dbt.closeForm()">Скасувати</button>
  </div>`;
}

/* ════════════════════════
   MAIN BUILD
════════════════════════ */
function buildHTML() {
  const isMgr    = state.role === 'manager';
  const formOpen = _mode !== null && !_submitted;

  return `
${CSS}
<div class="dbt-wrap">
  ${isMgr ? mgrHomeHTML() : homeHTML()}

  <!-- FORM OVERLAY -->
  <div class="dbt-form-overlay ${formOpen?'open':''}" id="dbt-form">
    ${_mode === 'sale' ? saleFormHTML() : _mode === 'debt' ? debtFormHTML() : ''}
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="dbt-success ${_submitted?'open':''}" id="dbt-success">
    <div style="width:72px;height:72px;border-radius:50%;background:${_mode==='sale'?'var(--teal-bg)':'var(--amber-bg)'};border:0.5px solid ${_mode==='sale'?'var(--teal-border)':'var(--amber-border)'};display:flex;align-items:center;justify-content:center;margin-bottom:18px;font-size:28px">
      ${_mode==='sale'?'💸':'📋'}
    </div>
    <div style="font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px">
      ${_mode==='sale'?'Надіслано бухгалтеру!':'Борг зафіксовано!'}
    </div>
    <div style="font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6;margin-bottom:24px;max-width:280px">
      ${_mode==='sale'
        ? 'Повідомлення про продажу надіслано в Telegram'
        : 'Борг додано в журнал. Зʼявиться галочка «Повернуто» коли погасять.'}
    </div>
    <button onclick="window.__dbt.closeSuccess()" style="width:100%;max-width:280px;height:50px;background:var(--green);border:none;border-radius:12px;font-size:14px;font-weight:500;color:#000;cursor:pointer;font-family:var(--font-h);margin-bottom:10px">
      Готово
    </button>
    <button onclick="window.__dbt.addAnother()" style="width:100%;max-width:280px;height:44px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b)">
      Додати ще
    </button>
  </div>
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function refreshList() {
  const el = document.getElementById('dbt-list');
  if (el) el.innerHTML = debtListHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function setFilter(f) { _filter = f; refreshList(); fullRender(); }
function openMode(m)  { _mode = m; _submitted = false; fullRender(); }
function closeForm()  { _mode = null; _submitted = false; fullRender(); }

function updateSalePreview() {
  const from  = document.getElementById('sale-from')?.value  || _saleFrom;
  const to    = document.getElementById('sale-to')?.value    || _saleTo;
  const item  = document.getElementById('sale-item')?.value  || '—';
  const qty   = document.getElementById('sale-qty')?.value   || '1';
  const unit  = document.getElementById('sale-unit')?.value  || 'пляш.';
  const price = document.getElementById('sale-price')?.value;
  const note  = document.getElementById('sale-note')?.value;
  const now   = new Date();
  const timeStr = now.toLocaleTimeString('uk-UA', {hour:'2-digit',minute:'2-digit'});
  const dateStr = now.toLocaleDateString('uk-UA');

  const el = document.getElementById('sale-preview');
  if (el) el.innerHTML = `
    💸 Продажа між закладами<br/>
    З: <strong>${from}</strong> → В: <strong>${to}</strong><br/>
    Товар: ${item}<br/>
    Кількість: ${qty} ${unit}${price ? `<br/>Ціна: ${price} ₴/од. · Сума: ${(qty*price).toFixed(0)} ₴` : ''}<br/>
    Бармен: ${state.user || 'Бармен'}<br/>
    Дата: ${dateStr} · ${timeStr}${note ? `<br/>Примітка: ${note}` : ''}
  `;
}

function submitSale() {
  const item = document.getElementById('sale-item')?.value?.trim();
  if (!item) {
    document.getElementById('sale-item')?.focus();
    return;
  }
  _submitted = true;
  fullRender();
}

function submitDebt() {
  const item = document.getElementById('debt-item')?.value?.trim();
  if (!item) {
    document.getElementById('debt-item')?.focus();
    return;
  }
  const from = document.getElementById('debt-from')?.value;
  const to   = document.getElementById('debt-to')?.value;
  const qty  = parseInt(document.getElementById('debt-qty')?.value) || 1;
  const unit = document.getElementById('debt-unit')?.value;
  const note = document.getElementById('debt-note')?.value?.trim() || '';

  DEBTS.unshift({
    id: Date.now(), from, to, item, qty, unit,
    date: new Date().toLocaleDateString('uk-UA'),
    returnDate: null, returned: false, note,
  });
  _submitted = true;
  fullRender();
}

function closeSuccess() { _mode = null; _submitted = false; fullRender(); }
function addAnother()   { _submitted = false; fullRender(); }

function toggleReturn(id) {
  const d = DEBTS.find(x => x.id === id);
  if (!d) return;
  d.returned    = !d.returned;
  d.returnDate  = d.returned ? new Date().toLocaleDateString('uk-UA') : null;
  refreshList();
}

function toggleVenueEdit() { _mgrVenueEdit = !_mgrVenueEdit; fullRender(); }
function addVenue()        { _venues.push('Новий заклад'); fullRender(); }
function removeVenue(i)    { _venues.splice(i, 1); fullRender(); }
function renameVenue(i, v) { _venues[i] = v; }

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _mode         = null;
    _submitted    = false;
    _filter       = 'active';
    _mgrVenueEdit = false;
    _venues       = [...VENUES];
    return buildHTML();
  },
  init() {
    window.__dbt = {
      setFilter, openMode, closeForm,
      updateSalePreview, submitSale, submitDebt,
      closeSuccess, addAnother, toggleReturn,
      toggleVenueEdit, addVenue, removeVenue, renameVenue,
    };
  },
};
