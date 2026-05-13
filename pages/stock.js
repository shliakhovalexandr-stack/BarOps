/* ============================================================
   BarOps — pages/stock.js
   Екран всіх залишків (демо — після підключення iiko буде реальне)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const STOCK = [
  { id:1,  emoji:'🥃', name:"Johnnie Walker Black 0.7л",  cat:'Віскі',      qty:2.8,  unit:'л', norm:2.1, status:'ok'  },
  { id:2,  emoji:'🌿', name:"Hendrick's Gin 0.7л",        cat:'Джин',       qty:0.4,  unit:'л', norm:0.7, status:'low' },
  { id:3,  emoji:'🍊', name:'Aperol 1л',                  cat:'Лікери',     qty:1.8,  unit:'л', norm:1.0, status:'ok'  },
  { id:4,  emoji:'🔴', name:'Campari 0.7л',               cat:'Лікери',     qty:0.7,  unit:'л', norm:0.7, status:'ok'  },
  { id:5,  emoji:'🍋', name:'Limoncello 0.7л',            cat:'Лікери',     qty:0.3,  unit:'л', norm:0.5, status:'low' },
  { id:6,  emoji:'🍸', name:'Martini Bianco 1л',          cat:'Вермут',     qty:2.4,  unit:'л', norm:1.0, status:'ok'  },
  { id:7,  emoji:'🫧', name:'Prosecco DOC 0.75л',         cat:'Вино',       qty:3.0,  unit:'л', norm:1.5, status:'ok'  },
  { id:8,  emoji:'🥂', name:'Moet Chandon 0.75л',         cat:'Шампанське', qty:0.75, unit:'л', norm:0.75,status:'ok'  },
  { id:9,  emoji:'🫙', name:'Angostura Bitters 0.2л',     cat:'Біттери',    qty:0.15, unit:'л', norm:0.1, status:'ok'  },
  { id:10, emoji:'🍵', name:'Сироп Монін Карамель 0.7л',  cat:'Сиропи',     qty:0.4,  unit:'л', norm:0.3, status:'ok'  },
  { id:11, emoji:'🍬', name:'Сироп Монін Ваніль 0.7л',    cat:'Сиропи',     qty:0.1,  unit:'л', norm:0.3, status:'low' },
  { id:12, emoji:'🍺', name:'Пиво Stella Artois 0.5л',    cat:'Пиво',       qty:24,   unit:'шт',norm:12,  status:'ok'  },
  { id:13, emoji:'🍺', name:'Пиво Corona 0.33л',          cat:'Пиво',       qty:18,   unit:'шт',norm:12,  status:'ok'  },
  { id:14, emoji:'💧', name:'Вода Evian 0.33л',           cat:'Безалк.',    qty:36,   unit:'шт',norm:24,  status:'ok'  },
  { id:15, emoji:'🥤', name:'Coca-Cola 0.33л',            cat:'Безалк.',    qty:24,   unit:'шт',norm:24,  status:'ok'  },
  { id:16, emoji:'🍋', name:'Сік Лимонний св/вижим',      cat:'Соки',       qty:0.8,  unit:'л', norm:0.5, status:'ok'  },
  { id:17, emoji:'🍊', name:'Сік Апельсиновий св/вижим',  cat:'Соки',       qty:0.5,  unit:'л', norm:0.5, status:'ok'  },
  { id:18, emoji:'🍹', name:'Cranberry Juice 1л',         cat:'Соки',       qty:0.3,  unit:'л', norm:0.5, status:'low' },
  { id:19, emoji:'🧊', name:'Лід кубиковий',              cat:'Інше',       qty:8,    unit:'кг',norm:5.0, status:'ok'  },
  { id:20, emoji:'🍋', name:'Лимон',                      cat:'Гарніри',    qty:12,   unit:'шт',norm:10,  status:'ok'  },
];

let CATS = ['Всі', ...new Set(STOCK.map(s => s.cat))];

let _filter = 'Всі';
let _search = '';
let _isSyrve = false;

const CSS = `<style id="stk-css">
.stk-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.stk-scroll{overflow-y:auto;flex:1}.stk-scroll::-webkit-scrollbar{width:0}

.stk-topbar{display:flex;align-items:center;gap:12px;padding:8px 16px 10px;flex-shrink:0}
.stk-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.stk-back:active{background:var(--bg3)}
.stk-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1}
.stk-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

.stk-search{margin:0 14px 8px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:12px;padding:0 12px;height:40px}
.stk-search-inp{flex:1;background:transparent;border:none;outline:none;font-size:14px;color:var(--text0);font-family:var(--font-b)}
.stk-search-inp::placeholder{color:var(--text3)}

.stk-chips{display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto}.stk-chips::-webkit-scrollbar{height:0}
.stk-chip{height:28px;padding:0 12px;border-radius:14px;border:0.5px solid var(--border2);background:var(--bg2);font-size:11px;color:var(--text2);cursor:pointer;white-space:nowrap;font-family:var(--font-b);display:flex;align-items:center;flex-shrink:0;transition:all .15s}
.stk-chip.act{background:var(--green);border-color:var(--green);color:#fff}

.stk-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 14px 10px}
.stk-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:10px;text-align:center}
.stk-stat-val{font-family:var(--font-h);font-size:20px;font-weight:700}
.stk-stat-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.05em}

.stk-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.stk-row{display:flex;align-items:center;gap:10px;background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;padding:11px 13px;transition:background .12s}
.stk-row:active{background:var(--bg3)}
.stk-emoji{font-size:18px;flex-shrink:0}
.stk-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.stk-cat{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.stk-bar-wrap{flex:1;max-width:60px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;flex-shrink:0}
.stk-bar-fill{height:100%;border-radius:2px}
.stk-qty{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right;flex-shrink:0;min-width:44px}
.stk-unit{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right;margin-top:1px}
.stk-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}

.stk-note{margin:0 14px 10px;background:var(--blue-bg);border:0.5px solid var(--blue-border);border-radius:12px;padding:10px 13px;display:flex;gap:8px;font-size:11px;color:var(--blue);font-family:var(--font-b);line-height:1.5}
</style>`;

function buildHTML() {
  const list = STOCK.filter(s => {
    const catOk = _filter === 'Всі' || s.cat === _filter;
    const srchOk = !_search || s.name.toLowerCase().includes(_search.toLowerCase());
    return catOk && srchOk;
  });

  const total  = STOCK.length;
  const low    = STOCK.filter(s => s.status === 'low').length;
  const ok     = STOCK.filter(s => s.status === 'ok').length;

  return `
${CSS}
<div class="stk-wrap">
  <div class="stk-topbar">
    <div class="stk-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="stk-title">Всі залишки</div>
      <div class="stk-sub">${state.venue} · ${_isSyrve ? 'Syrve · реальні дані' : 'демо-дані'}</div>
    </div>
    <div style="background:${low>0?'var(--red-bg)':'var(--green-bg)'};border:0.5px solid ${low>0?'var(--red-border)':'var(--green-border)'};border-radius:20px;padding:3px 10px;font-size:11px;color:${low>0?'var(--red)':'var(--green)'};font-family:var(--font-b)">${low > 0 ? `⚠ ${low} критично` : '✓ Все ок'}</div>
  </div>

  <div class="stk-scroll">
    <!-- Пошук -->
    <div class="stk-search">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="var(--text2)" stroke-width="1.2"/><path d="M9.5 9.5l3 3" stroke="var(--text2)" stroke-width="1.2" stroke-linecap="round"/></svg>
      <input class="stk-search-inp" placeholder="Знайти товар…" value="${_search}"
        oninput="window.__stk.search(this.value)"/>
    </div>

    <!-- Зведення -->
    <div class="stk-summary">
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--text0)">${total}</div>
        <div class="stk-stat-lbl">Позицій</div>
      </div>
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--green)">${ok}</div>
        <div class="stk-stat-lbl">В нормі</div>
      </div>
      <div class="stk-stat">
        <div class="stk-stat-val" style="color:var(--red)">${low}</div>
        <div class="stk-stat-lbl">Критично</div>
      </div>
    </div>

    <!-- Категорії -->
    <div class="stk-chips">
      ${CATS.map(c => `
      <div class="stk-chip ${_filter===c?'act':''}" onclick="window.__stk.setFilter('${c}')">${c}</div>
      `).join('')}
    </div>

    <!-- Плашка про POS -->
    <div class="stk-note">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0;margin-top:1px"><circle cx="7" cy="7" r="5.5" stroke="var(--blue)" stroke-width="1.2"/><path d="M7 6v4M7 4.5v.4" stroke="var(--blue)" stroke-width="1.2" stroke-linecap="round"/></svg>
      Демо-дані. Після підключення iiko тут будуть реальні залишки з вашої POS-системи в режимі реального часу.
    </div>

    <!-- Список -->
    <div class="stk-list">
      ${list.map(s => {
        const pct  = Math.min((s.qty / (s.norm * 2)) * 100, 100);
        const color= s.status === 'low' ? 'var(--red)' : pct > 60 ? 'var(--green)' : 'var(--amber)';
        return `
        <div class="stk-row">
          <div class="stk-status-dot" style="background:${color}"></div>
          <div class="stk-emoji">${s.emoji}</div>
          <div style="flex:1;min-width:0">
            <div class="stk-name">${s.name}</div>
            <div class="stk-cat">${s.cat} · Норма: ${s.norm} ${s.unit}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <div class="stk-bar-wrap">
              <div class="stk-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div class="stk-qty" style="color:${color}">${s.qty}</div>
            <div class="stk-unit">${s.unit}</div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="height:20px"></div>
  </div>
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

function setFilter(f) { _filter = f; fullRender(); }
function search(q)    { _search = q; fullRender(); }

  export default {
  render() {
    _filter = 'Всі'; _search = '';
    _isSyrve = false;
    return buildHTML();
  },
  init() {
    window.__stk = { setFilter, search };
    const venueId = localStorage.getItem('barops_venueId');
    const token   = localStorage.getItem('barops_token');
    const API     = 'https://barops-backend-production.up.railway.app';

    fetch(`${API}/api/pos/balance/${venueId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.stores?.length) {
        STOCK.length = 0;
        let id = 1;
        for (const store of data.stores) {
          for (const item of store.items) {
            STOCK.push({
              id:     id++,
              emoji:  '🍾',
              name:   item.name,
              cat:    item.category || store.storeName,
              qty:    Number(item.amount) || 0,
              unit:   item.unit || 'л',
              norm:   0,
              status: 'ok',
            });
          }
        }
        _isSyrve = true;
        CATS = ['Всі', ...new Set(STOCK.map(s => s.cat))];
        const v = document.getElementById('app-view');
        if (v) v.innerHTML = buildHTML();
      }
    })
    .catch(() => {});
  },
};
