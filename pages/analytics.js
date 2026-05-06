/* ============================================================
   BarOps — pages/analytics.js
   Зведена аналітика по всіх закладах менеджера
   ============================================================ */

import { navigate, state, MANAGER_VENUES } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const VENUE_DATA = {
  v1: { name:'Sky Lounge',  pos:'Poster',   color:'var(--green)',
        rev:38420, revMonth:812000, fc:21.4, staff:2, orders:12, writeoffs:8,  debts:2, alerts:3 },
  v2: { name:'Bar Noir',    pos:'iiko',     color:'var(--amber)',
        rev:22180, revMonth:476000, fc:19.8, staff:1, orders:7,  writeoffs:3,  debts:1, alerts:1 },
  v3: { name:'Rooftop Bar', pos:'R-Keeper', color:'var(--purple)',
        rev:14350, revMonth:312000, fc:23.1, staff:1, orders:5,  writeoffs:5,  debts:3, alerts:2 },
};

const WEEK_DATA = {
  v1: [32100,41200,35800,48200,52100,38420,0],
  v2: [18400,22100,19800,25300,28600,22180,0],
  v3: [12300,15600,11200,18900,16400,14350,0],
};

const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

let _period = 'week'; // 'week' | 'month'

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="an-css">
.an-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.an-scroll{overflow-y:auto;flex:1}.an-scroll::-webkit-scrollbar{width:0}

/* topbar */
.an-topbar{display:flex;align-items:center;gap:10px;padding:8px 16px 12px;flex-shrink:0}
.an-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);flex:1;letter-spacing:-.01em}
.an-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* period tabs */
.an-period{display:flex;gap:2px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px;margin:0 14px 12px}
.an-pt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.an-pt.act{background:var(--bg3);color:var(--text0)}

/* sec */
.an-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:10px 18px 8px;font-family:var(--font-b)}

/* total kpi */
.an-total{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px 4px}
.an-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden}
.an-kpi-val{font-family:var(--font-h);font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.an-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.an-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.an-kpi-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.an-kpi-fill{height:100%;border-radius:2px}

/* stacked bar chart */
.an-chart-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px}
.an-chart-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.an-chart-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.an-bars{display:flex;align-items:flex-end;gap:4px;height:80px;margin-bottom:6px}
.an-bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px}
.an-bar-seg{width:100%;border-radius:1px;min-height:2px;transition:height .4s ease}
.an-bar-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.an-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.an-cl{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2);font-family:var(--font-b)}
.an-cl-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0}

/* venue cards */
.an-venue-list{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.an-venue-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.an-vc-hdr{padding:13px 14px;display:flex;align-items:center;gap:10px;border-bottom:0.5px solid var(--border)}
.an-vc-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.an-vc-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);flex:1}
.an-vc-pos{font-size:10px;font-family:var(--font-b);padding:2px 8px;border-radius:10px}
.an-vc-rev{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0)}
.an-vc-rev-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:1px;text-align:right}
.an-vc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
.an-vs{padding:10px 8px;text-align:center;border-right:0.5px solid var(--border)}
.an-vs:last-child{border-right:none}
.an-vs-val{font-family:var(--font-h);font-size:15px;font-weight:700}
.an-vs-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:3px;text-transform:uppercase;letter-spacing:.04em;line-height:1.3}

/* comparison table */
.an-cmp{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.an-cmp-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:10px 12px;border-bottom:0.5px solid var(--border);gap:4px}
.an-cmp-row:last-child{border-bottom:none}
.an-cmp-row.hdr{background:var(--bg3)}
.an-cmp-cell{font-size:11px;font-family:var(--font-b);color:var(--text2)}
.an-cmp-cell.name{color:var(--text1);font-weight:500}
.an-cmp-cell.val{color:var(--text0);font-family:var(--font-h);font-weight:600;text-align:right}
.an-cmp-cell.hdr{color:var(--text2);font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:right}
.an-cmp-cell.hdr:first-child{text-align:left}
</style>`;

/* ════════════════════════
   RENDER
════════════════════════ */
function buildHTML() {
  const venues = Object.values(VENUE_DATA);
  const totalRev   = _period === 'week'
    ? venues.reduce((a,v) => a + v.rev, 0)
    : venues.reduce((a,v) => a + v.revMonth, 0);
  const avgFc      = (venues.reduce((a,v) => a + v.fc, 0) / venues.length).toFixed(1);
  const totalDebts = venues.reduce((a,v) => a + v.debts, 0);
  const totalAlerts= venues.reduce((a,v) => a + v.alerts, 0);

  // Chart data
  const maxVal = Math.max(...DAYS.map((_,i) =>
    Object.values(WEEK_DATA).reduce((a,w) => a + (w[i]||0), 0)
  ));

  const colors = ['var(--green)','var(--amber)','var(--purple)'];
  const vIds   = Object.keys(VENUE_DATA);

  const chartBars = DAYS.map((day, di) => {
    const total = vIds.reduce((a, id) => a + (WEEK_DATA[id]?.[di]||0), 0);
    const h = maxVal > 0 ? (total / maxVal * 76) : 0;
    let offset = 0;
    const segs = vIds.map((id, vi) => {
      const val = WEEK_DATA[id]?.[di] || 0;
      const sh  = maxVal > 0 ? (val / maxVal * 76) : 0;
      return `<div class="an-bar-seg" style="background:${colors[vi]};height:${sh}px;opacity:${di===6?'.3':'1'}"></div>`;
    });
    return `
    <div class="an-bar-group">
      ${segs.reverse().join('')}
      <div class="an-bar-lbl">${day}</div>
    </div>`;
  }).join('');

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
      <div class="an-sub">Всі заклади · ${venues.length} локації</div>
    </div>
    <div style="background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--green);font-family:var(--font-b)">${venues.length} заклади</div>
  </div>

  <div class="an-scroll">
    <!-- Period -->
    <div class="an-period">
      <button class="an-pt ${_period==='week'?'act':''}"  onclick="window.__an.setPeriod('week')">Тиждень</button>
      <button class="an-pt ${_period==='month'?'act':''}" onclick="window.__an.setPeriod('month')">Місяць</button>
    </div>

    <!-- Total KPI -->
    <div class="an-total">
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--green)">${_period==='week'?(totalRev/1000).toFixed(0)+'k':(totalRev/1000).toFixed(0)+'k'} ₴</div>
        <div class="an-kpi-lbl">Загальна виручка</div>
        <div class="an-kpi-sub">↑ +8.2% vs минулий ${_period==='week'?'тиждень':'місяць'}</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:82%;background:var(--green)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:${parseFloat(avgFc)>22?'var(--red)':parseFloat(avgFc)>18?'var(--amber)':'var(--green)'}">${avgFc}%</div>
        <div class="an-kpi-lbl">Середній FC</div>
        <div class="an-kpi-sub">↑ +1.4% vs минулий</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${avgFc/30*100}%;background:var(--amber)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--amber)">${totalDebts}</div>
        <div class="an-kpi-lbl">Активних боргів</div>
        <div class="an-kpi-sub">між закладами</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${totalDebts/10*100}%;background:var(--amber)"></div></div>
      </div>
      <div class="an-kpi">
        <div class="an-kpi-val" style="color:var(--red)">${totalAlerts}</div>
        <div class="an-kpi-lbl">Алертів</div>
        <div class="an-kpi-sub">ціни + залишки</div>
        <div class="an-kpi-bar"><div class="an-kpi-fill" style="width:${totalAlerts/20*100}%;background:var(--red)"></div></div>
      </div>
    </div>

    <!-- Stacked bar chart -->
    <div class="an-sec">Виручка по днях</div>
    <div class="an-chart-card">
      <div class="an-chart-hdr">
        <div class="an-chart-title">Всі заклади</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">₴ / день</div>
      </div>
      <div class="an-bars">${chartBars}</div>
      <div class="an-legend">
        ${vIds.map((id,i) => `
        <div class="an-cl">
          <div class="an-cl-dot" style="background:${colors[i]}"></div>
          ${VENUE_DATA[id].name}
        </div>`).join('')}
      </div>
    </div>

    <!-- Comparison table -->
    <div class="an-sec">Порівняння закладів</div>
    <div class="an-cmp">
      <div class="an-cmp-row hdr">
        <div class="an-cmp-cell hdr">Заклад</div>
        <div class="an-cmp-cell hdr">Виручка</div>
        <div class="an-cmp-cell hdr">FC</div>
        <div class="an-cmp-cell hdr">Алерти</div>
      </div>
      ${vIds.map(id => {
        const v = VENUE_DATA[id];
        const fcColor = v.fc > 22 ? 'var(--red)' : v.fc > 18 ? 'var(--amber)' : 'var(--green)';
        return `
        <div class="an-cmp-row">
          <div class="an-cmp-cell name" style="display:flex;align-items:center;gap:5px">
            <div style="width:7px;height:7px;border-radius:50%;background:${v.color};flex-shrink:0"></div>
            ${v.name.split(' ')[0]}
          </div>
          <div class="an-cmp-cell val">${(_period==='week'?v.rev:v.revMonth).toLocaleString('uk-UA')} ₴</div>
          <div class="an-cmp-cell val" style="color:${fcColor}">${v.fc}%</div>
          <div class="an-cmp-cell val" style="color:${v.alerts>2?'var(--red)':v.alerts>0?'var(--amber)':'var(--green)'}">${v.alerts}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Per venue cards -->
    <div class="an-sec">По кожному закладу</div>
    <div class="an-venue-list">
      ${vIds.map(id => {
        const v = VENUE_DATA[id];
        const fcColor = v.fc > 22 ? 'var(--red)' : v.fc > 18 ? 'var(--amber)' : 'var(--green)';
        return `
        <div class="an-venue-card">
          <div class="an-vc-hdr">
            <div class="an-vc-dot" style="background:${v.color}"></div>
            <div style="flex:1">
              <div class="an-vc-name">${v.name}</div>
              <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${v.pos} · ${v.staff} барм.</div>
            </div>
            <div style="text-align:right">
              <div class="an-vc-rev">${(_period==='week'?v.rev:v.revMonth).toLocaleString('uk-UA')} ₴</div>
              <div class="an-vc-rev-lbl">${_period==='week'?'тиждень':'місяць'}</div>
            </div>
          </div>
          <div class="an-vc-stats">
            <div class="an-vs">
              <div class="an-vs-val" style="color:${fcColor}">${v.fc}%</div>
              <div class="an-vs-lbl">FC</div>
            </div>
            <div class="an-vs">
              <div class="an-vs-val" style="color:var(--red)">${v.writeoffs}</div>
              <div class="an-vs-lbl">Списань</div>
            </div>
            <div class="an-vs">
              <div class="an-vs-val" style="color:var(--amber)">${v.debts}</div>
              <div class="an-vs-lbl">Боргів</div>
            </div>
            <div class="an-vs">
              <div class="an-vs-val" style="color:${v.alerts>2?'var(--red)':'var(--amber)'}">${v.alerts}</div>
              <div class="an-vs-lbl">Алертів</div>
            </div>
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

function setPeriod(p) { _period = p; fullRender(); }

export default {
  render() { _period = 'week'; return buildHTML(); },
  init()   { window.__an = { setPeriod }; },
};
