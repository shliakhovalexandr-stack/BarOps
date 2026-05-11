/* ============================================================
   BarOps — pages/analytics.js
   Аналітика: реальні дані з /api/stats/all-venues
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _venues  = [];
let _loading = true;
let _period  = 'week';

function token() { return localStorage.getItem('barops_token') || ''; }

const VENUE_COLORS = ['var(--green)', 'var(--amber)', 'var(--purple)', 'var(--red)', '#4FA8E8'];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="an-css">
.an-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.an-scroll{overflow-y:auto;flex:1}.an-scroll::-webkit-scrollbar{width:0}
.an-topbar{display:flex;align-items:center;gap:10px;padding:8px 16px 12px;flex-shrink:0}
.an-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1;letter-spacing:-.01em}
.an-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.an-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b)}
.an-total{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 4px}
.an-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden}
.an-kpi-val{font-family:var(--font-h);font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.an-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.an-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.an-kpi-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.an-kpi-fill{height:100%;border-radius:2px}
.an-venue-list{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.an-venue-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.an-vc-hdr{padding:13px 14px;display:flex;align-items:center;gap:10px;border-bottom:0.5px solid var(--border)}
.an-vc-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.an-vc-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);flex:1}
.an-vc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.an-vs{padding:10px 8px;text-align:center;border-right:0.5px solid var(--border)}
.an-vs:last-child{border-right:none}
.an-vs-val{font-family:var(--font-h);font-size:15px;font-weight:700}
.an-vs-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.04em;line-height:1.3}
.an-cmp{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.an-cmp-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:10px 12px;border-bottom:0.5px solid var(--border);gap:4px}
.an-cmp-row:last-child{border-bottom:none}
.an-cmp-row.hdr{background:var(--bg3)}
.an-cmp-cell{font-size:11px;font-family:var(--font-b);color:var(--text2)}
.an-cmp-cell.name{color:var(--text1);font-weight:500}
.an-cmp-cell.val{color:var(--text0);font-family:var(--font-h);font-weight:600;text-align:right}
.an-cmp-cell.hdr{color:var(--text2);font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:right}
.an-cmp-cell.hdr:first-child{text-align:left}
/* empty */
.an-empty{padding:60px 30px;text-align:center}
.an-empty-icon{font-size:48px;margin-bottom:16px}
.an-empty-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:8px}
.an-empty-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6}
/* skel */
.an-skel{background:var(--bg2);border-radius:14px;animation:aSkel 1.2s ease-in-out infinite;margin:0 14px 8px}
@keyframes aSkel{0%,100%{opacity:.5}50%{opacity:1}}
</style>`;

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadData() {
  _loading = true;
  render();
  try {
    const res  = await fetch(`${API}/api/stats/all-venues`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) {
      const data = await res.json();
      _venues = data.venues || [];
    }
  } catch (e) {
    console.error('[Analytics]', e);
    _venues = [];
  }
  _loading = false;
  render();
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  if (_loading) {
    return `${CSS}
    <div class="an-wrap">
      <div class="an-topbar">
        <div><div class="an-title">Аналітика</div></div>
      </div>
      <div class="an-scroll" style="padding-top:8px">
        ${[1,2,3].map(()=>`<div class="an-skel" style="height:120px"></div>`).join('')}
      </div>
    </div>`;
  }

  if (_venues.length === 0) {
    return `${CSS}
    <div class="an-wrap">
      <div class="an-topbar">
        <div onclick="window.__barops.openDrawer()" style="width:36px;height:36px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
          <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
          <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
          <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
        </div>
        <div><div class="an-title">Аналітика</div></div>
      </div>
      <div class="an-empty">
        <div class="an-empty-icon">📊</div>
        <div class="an-empty-title">Немає даних</div>
        <div class="an-empty-sub">Додайте заклад та почніть роботу — статистика з'явиться тут автоматично</div>
      </div>
    </div>`;
  }

  // Зведені KPI
  const totalWriteoffs  = _venues.reduce((a, v) => a + (v.writeoffs || 0), 0);
  const totalInvoices   = _venues.reduce((a, v) => a + (v.invoiceCount || 0), 0);
  const totalInvAmount  = _venues.reduce((a, v) => a + (v.invoiceTotal || 0), 0);
  const totalTeam       = _venues.reduce((a, v) => a + (v.teamCount || 0), 0);
  const totalCritical   = _venues.reduce((a, v) => a + (v.criticalCount || 0), 0);

  return `
${CSS}
<div class="an-wrap">
  <div class="an-topbar">
    <div onclick="window.__barops.openDrawer()"
      style="width:36px;height:36px;border-radius:10px;background:var(--bg2);
             border:0.5px solid var(--border2);display:flex;flex-direction:column;
             align-items:center;justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
      <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
      <div style="width:14px;height:1.5px;background:var(--text1);border-radius:1px"></div>
      <div style="width:10px;height:1.5px;background:var(--text1);border-radius:1px;align-self:flex-start;margin-left:8px"></div>
    </div>
    <div style="flex:1">
      <div class="an-title">Аналітика</div>
      <div class="an-sub">Всі заклади · ${_venues.length} локацій · сьогодні</div>
    </div>
    <div style="background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--green);font-family:var(--font-b)">${_venues.length} заклади</div>
  </div>

  <div class="an-scroll">

    <!-- Total KPI -->
    <div class="an-sec">Зведено сьогодні</div>
    <div class="an-total">
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--green)">${totalInvoices}</div>
        <div class="an-kpi-lbl">Накладних</div>
        <div class="an-kpi-sub">${Math.round(totalInvAmount).toLocaleString('uk-UA')} ₴</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalInvoices*10)}%;background:var(--green)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${totalWriteoffs>0?'var(--amber)':'var(--green)'}">${totalWriteoffs}</div>
        <div class="an-kpi-lbl">Списань</div>
        <div class="an-kpi-sub">всі заклади</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalWriteoffs*10)}%;background:var(--amber)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--teal)">${totalTeam}</div>
        <div class="an-kpi-lbl">Команда</div>
        <div class="an-kpi-sub">активних</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalTeam*10)}%;background:var(--teal)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${totalCritical>0?'var(--red)':'var(--green)'}">${totalCritical}</div>
        <div class="an-kpi-lbl">Алертів</div>
        <div class="an-kpi-sub">критичні залишки</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${Math.min(100,totalCritical*20)}%;background:var(--red)"></div></div>
      </div>
    </div>

    <!-- Comparison table -->
    <div class="an-sec">Порівняння закладів</div>
    <div class="an-cmp">
      <div class="an-cmp-row hdr">
        <div class="an-cmp-cell hdr">Заклад</div>
        <div class="an-cmp-cell hdr">Накладні</div>
        <div class="an-cmp-cell hdr">Списання</div>
        <div class="an-cmp-cell hdr">Алерти</div>
      </div>
      ${_venues.map((v, i) => `
      <div class="an-cmp-row">
        <div class="an-cmp-cell name" style="display:flex;align-items:center;gap:5px">
          <div style="width:7px;height:7px;border-radius:50%;background:${VENUE_COLORS[i%VENUE_COLORS.length]};flex-shrink:0"></div>
          ${v.name.split(' ')[0]}
        </div>
        <div class="an-cmp-cell val">${v.invoiceCount || 0}</div>
        <div class="an-cmp-cell val" style="color:${(v.writeoffs||0)>0?'var(--amber)':'var(--green)'}">${v.writeoffs || 0}</div>
        <div class="an-cmp-cell val" style="color:${(v.criticalCount||0)>0?'var(--red)':'var(--green)'}">${v.criticalCount || 0}</div>
      </div>`).join('')}
    </div>

    <!-- Per venue cards -->
    <div class="an-sec">По кожному закладу</div>
    <div class="an-venue-list">
      ${_venues.map((v, i) => `
      <div class="an-venue-card">
        <div class="an-vc-hdr">
          <div class="an-vc-dot" style="background:${VENUE_COLORS[i%VENUE_COLORS.length]}"></div>
          <div style="flex:1">
            <div class="an-vc-name">${v.name}</div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${v.posType === 'syrve' ? '✓ Syrve' : 'Ручний режим'} · ${v.teamCount || 0} барм.</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)">${Math.round(v.invoiceTotal||0).toLocaleString('uk-UA')} ₴</div>
            <div style="font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:1px">накладні сьогодні</div>
          </div>
        </div>
        <div class="an-vc-stats">
          <div class="an-vs">
            <div class="an-vs-val" style="color:var(--green)">${v.invoiceCount || 0}</div>
            <div class="an-vs-lbl">Накладних</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val" style="color:${(v.writeoffs||0)>0?'var(--amber)':'var(--green)'}">${v.writeoffs || 0}</div>
            <div class="an-vs-lbl">Списань</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val">${v.teamCount || 0}</div>
            <div class="an-vs-lbl">Команда</div>
          </div>
          <div class="an-vs">
            <div class="an-vs-val" style="color:${(v.criticalCount||0)>0?'var(--red)':'var(--green)'}">${v.criticalCount || 0}</div>
            <div class="an-vs-lbl">Алертів</div>
          </div>
        </div>
      </div>`).join('')}
    </div>

    <div style="height:20px"></div>
  </div>
</div>`;
}

function render() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

export default {
  render() { _loading = true; _venues = []; return buildHTML(); },
  init()   { loadData(); },
};
