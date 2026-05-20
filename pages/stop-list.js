/* ============================================================
   BarOps — pages/stop-list.js
   Stop List — operational control center для бар-менеджера
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   MOCK DATA
   У продакшні — дані з POS API
════════════════════════ */
const ACTIVE_STOPS = [
  {
    id: 1, name: "Hendrick's Gin", category: 'Джин',
    reason: 'sold_out', reasonLabel: 'Закінчився',
    stoppedAt: '21:02', minutesAgo: 104,
    stockLeft: 0, stockUnit: 'пл.',
    lostRevenue: 3840, lostPerHour: 2210,
    urgency: 'critical',
    substitutes: ['Tanqueray', 'Beefeater'],
    action: 'Терміновий виклик постачальника',
    affectedDrinks: ['Hendricks G&T', 'Cucumber Collins', 'Bramble'],
  },
  {
    id: 2, name: 'Fever-Tree Tonic', category: 'Міксери',
    reason: 'sold_out', reasonLabel: 'Закінчився',
    stoppedAt: '21:49', minutesAgo: 57,
    stockLeft: 0, stockUnit: 'пл.',
    lostRevenue: 1920, lostPerHour: 2025,
    urgency: 'critical',
    substitutes: ['Schweppes Tonic', 'Thomas Henry'],
    action: 'Замінити на Schweppes — повідомити барменів',
    affectedDrinks: ['Gin & Tonic', 'Vodka Tonic'],
  },
  {
    id: 3, name: 'Aperol', category: 'Аперитиви',
    reason: 'low_stock', reasonLabel: 'Залишок критичний',
    stoppedAt: null, minutesAgo: null,
    stockLeft: 0.3, stockUnit: 'л',
    lostRevenue: 0, lostPerHour: 1540,
    urgency: 'high',
    substitutes: ['Campari (менш солодкий)', 'Select Aperitivo'],
    action: 'Зупинити продаж Aperol Spritz до поповнення',
    affectedDrinks: ['Aperol Spritz', 'Veneziano'],
  },
  {
    id: 4, name: 'Lillet Blanc', category: 'Вермути',
    reason: 'low_stock', reasonLabel: 'Залишок малий',
    stoppedAt: null, minutesAgo: null,
    stockLeft: 0.15, stockUnit: 'л',
    lostRevenue: 0, lostPerHour: 420,
    urgency: 'medium',
    substitutes: ['Dolin Blanc', 'Martini Bianco'],
    action: 'Попередити барменів — підготувати заміну',
    affectedDrinks: ['Vesper Martini', 'Corpse Reviver #2'],
  },
];

const INGREDIENT_RISKS = [
  { name: 'Лимонний сік', pct: 12, eta: '23:10', consumption: '180мл/год', urgency: 'critical' },
  { name: 'Campari', pct: 18, eta: '23:45', consumption: '220мл/год', urgency: 'high' },
  { name: 'Simple Syrup', pct: 24, eta: '00:20', consumption: '150мл/год', urgency: 'high' },
  { name: 'Grenadine', pct: 31, eta: '01:15', consumption: '90мл/год', urgency: 'medium' },
  { name: 'Blue Curaçao', pct: 38, eta: '01:50', consumption: '70мл/год', urgency: 'medium' },
];

const PREDICTED_STOPS = [
  { name: 'Campari', predictedAt: '23:45', confidence: 94, reason: 'Поточний темп споживання' },
  { name: 'Лимонний сік', predictedAt: '23:10', confidence: 98, reason: 'Пік попиту о 23:00' },
  { name: 'Simple Syrup', predictedAt: '00:20', confidence: 87, reason: 'Середній темп останніх 2 год' },
  { name: 'Grenadine', predictedAt: '01:15', confidence: 71, reason: 'Сезонний патерн п\'ятниці' },
];

const SMART_INSIGHTS = [
  { icon: '◉', color: 'var(--red)', text: "Hendrick's зупинявся щоп'ятниці 3 тижні поспіль — замовлення на четвер" },
  { icon: '◈', color: 'var(--amber)', text: 'Пікове навантаження о 23:00–00:30 — підготуйте заміни для топ-5 позицій' },
  { icon: '◎', color: 'var(--green)', text: 'Fever-Tree можна замінити Schweppes — втрата маржі лише 8%' },
  { icon: '◇', color: 'var(--blue)', text: 'Лимонний сік закінчується щовечора — збільшити запас вдвічі' },
];

const OPERATIONAL_ALERTS = [
  { type: 'critical', msg: 'Постачальник Hendricks не відповів на замовлення від 18:00', time: '2 год тому' },
  { type: 'warning',  msg: 'Пік навантаження через ~90 хв — підготуйте 8 стоп-позицій', time: '18 хв тому' },
  { type: 'warning',  msg: 'Бармен ще не підтвердив отримання стоп-ліста', time: '1 год тому' },
  { type: 'info',     msg: 'Автоматичне замовлення Fever-Tree заплановане на 09:00', time: 'щойно' },
];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="sl-styles">
.sl-wrap{display:flex;flex-direction:column;flex:1;overflow:hidden;background:var(--bg)}
.sl-scroll{overflow-y:auto;flex:1;padding-bottom:24px}.sl-scroll::-webkit-scrollbar{width:0}

/* Header */
.sl-header{padding:12px 20px 8px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.sl-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.sl-back:active{background:var(--bg3)}
.sl-title-block{flex:1}
.sl-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);letter-spacing:-.02em;line-height:1}
.sl-subtitle{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.04em;margin-top:2px}
.sl-live{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--red);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase;font-weight:600}
.sl-live-dot{width:6px;height:6px;border-radius:50%;background:var(--red);animation:slPulse 1.4s ease-in-out infinite}
@keyframes slPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}

/* KPI row */
.sl-kpi-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px;margin-bottom:4px}
.sl-kpi{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
.sl-kpi-label{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.sl-kpi-val{font-family:var(--font-h);font-size:26px;font-weight:700;letter-spacing:-.03em;line-height:1;margin-top:4px}
.sl-kpi-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.sl-kpi.crit{border-color:rgba(251,113,133,.25);background:rgba(251,113,133,.06)}
.sl-kpi.warn{border-color:rgba(251,191,36,.22);background:rgba(251,191,36,.05)}
.sl-kpi.loss{border-color:rgba(168,139,255,.20);background:rgba(168,139,255,.05)}
.sl-kpi.risk{border-color:rgba(147,197,253,.20);background:rgba(147,197,253,.05)}

/* Section header */
.sl-section{padding:20px 20px 0}
.sl-section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sl-section-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);letter-spacing:.01em}
.sl-section-badge{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:20px}
.sl-section-badge.red{background:var(--red-bg);color:var(--red);border:0.5px solid var(--red-border)}
.sl-section-badge.amber{background:var(--amber-bg);color:var(--amber);border:0.5px solid var(--amber-border)}
.sl-section-badge.blue{background:var(--blue-bg);color:var(--blue);border:0.5px solid var(--blue-border)}
.sl-section-badge.green{background:var(--green-bg);color:var(--green);border:0.5px solid var(--green-border)}

/* Stop cards */
.sl-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:10px}
.sl-card.crit{border-color:rgba(251,113,133,.30)}
.sl-card.high{border-color:rgba(251,191,36,.25)}
.sl-card.med{border-color:rgba(147,197,253,.20)}

.sl-card-top{padding:14px 16px 12px;border-bottom:0.5px solid var(--border)}
.sl-card-row1{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
.sl-card-name{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sl-card-cat{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.sl-urgency{padding:4px 9px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;flex-shrink:0}
.sl-urgency.critical{background:var(--red);color:#000}
.sl-urgency.high{background:var(--amber);color:#000}
.sl-urgency.medium{background:var(--blue-bg);color:var(--blue);border:0.5px solid var(--blue-border)}

.sl-card-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.sl-metric{display:flex;flex-direction:column;gap:1px}
.sl-metric-lbl{font-size:9px;color:var(--text3);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.sl-metric-val{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sl-metric-val.red{color:var(--red)}
.sl-metric-val.amber{color:var(--amber)}
.sl-metric-val.dim{color:var(--text2)}

.sl-card-mid{padding:10px 16px;border-bottom:0.5px solid var(--border);background:rgba(255,255,255,.02)}
.sl-card-mid-lbl{font-size:10px;color:var(--text3);font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px}
.sl-reason-row{display:flex;align-items:center;gap:6px}
.sl-reason-chip{font-size:11px;font-weight:500;color:var(--text1);font-family:var(--font-b)}
.sl-drinks-row{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.sl-drink-tag{font-size:10px;color:var(--text2);background:var(--bg2);border:0.5px solid var(--border);border-radius:6px;padding:2px 7px;font-family:var(--font-b)}

.sl-card-bottom{padding:10px 16px}
.sl-subs-lbl{font-size:10px;color:var(--text3);font-family:var(--font-b);letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px}
.sl-subs-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
.sl-sub{font-size:11px;color:var(--green);background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:6px;padding:3px 8px;font-family:var(--font-b)}
.sl-action-btn{width:100%;height:38px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:10px;color:var(--text1);font-size:12px;font-weight:500;font-family:var(--font-b);cursor:pointer;display:flex;align-items:center;gap:6px;padding:0 12px;text-align:left}
.sl-action-btn:active{background:var(--bg3)}
.sl-action-btn.primary{background:var(--green);color:#000;font-weight:600;border:none}
.sl-action-btn.primary:active{filter:brightness(.9)}

/* Ingredient risk */
.sl-risk-item{padding:12px 0;border-bottom:0.5px solid var(--border)}
.sl-risk-item:last-child{border-bottom:none}
.sl-risk-row1{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.sl-risk-name{font-family:var(--font-h);font-size:13px;font-weight:500;color:var(--text0)}
.sl-risk-eta{font-size:11px;font-weight:600;font-family:var(--font-b)}
.sl-risk-eta.critical{color:var(--red)}
.sl-risk-eta.high{color:var(--amber)}
.sl-risk-eta.medium{color:var(--blue)}
.sl-risk-bar-bg{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:5px}
.sl-risk-bar-fill{height:100%;border-radius:2px;transition:width .4s}
.sl-risk-bar-fill.critical{background:var(--red)}
.sl-risk-bar-fill.high{background:var(--amber)}
.sl-risk-bar-fill.medium{background:var(--blue)}
.sl-risk-meta{display:flex;justify-content:space-between}
.sl-risk-pct{font-size:10px;color:var(--text3);font-family:var(--font-b)}
.sl-risk-cons{font-size:10px;color:var(--text3);font-family:var(--font-b)}

/* Predicted stops */
.sl-pred-item{padding:10px 0;border-bottom:0.5px solid var(--border);display:flex;align-items:center;gap:12px}
.sl-pred-item:last-child{border-bottom:none}
.sl-pred-time-block{background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:8px;padding:6px 10px;text-align:center;min-width:52px;flex-shrink:0}
.sl-pred-time{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--red);letter-spacing:-.01em;line-height:1}
.sl-pred-time.amber{color:var(--amber)}
.sl-pred-time-block.amber{background:var(--amber-bg);border-color:var(--amber-border)}
.sl-pred-info{flex:1;min-width:0}
.sl-pred-name{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.sl-pred-reason{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.sl-pred-conf{font-size:10px;font-weight:700;font-family:var(--font-b);padding:2px 6px;border-radius:4px}
.sl-pred-conf.hi{color:var(--red);background:var(--red-bg)}
.sl-pred-conf.mid{color:var(--amber);background:var(--amber-bg)}

/* Revenue loss */
.sl-revenue-card{background:var(--bg1);border:0.5px solid rgba(168,139,255,.20);border-radius:14px;padding:16px;margin-bottom:0}
.sl-revenue-total-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px}
.sl-revenue-total{font-family:var(--font-h);font-size:34px;font-weight:700;color:var(--green);letter-spacing:-.04em;line-height:1}
.sl-revenue-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:4px;margin-bottom:16px}
.sl-revenue-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border)}
.sl-revenue-row:last-child{border-bottom:none}
.sl-revenue-item-name{font-size:12px;color:var(--text1);font-family:var(--font-b)}
.sl-revenue-item-val{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sl-revenue-rate{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}

/* Insights */
.sl-insight-item{padding:12px 0;border-bottom:0.5px solid var(--border);display:flex;align-items:flex-start;gap:10px}
.sl-insight-item:last-child{border-bottom:none}
.sl-insight-icon{width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;margin-top:1px}
.sl-insight-text{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.55}

/* Alerts */
.sl-alert{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:12px;margin-bottom:8px}
.sl-alert:last-child{margin-bottom:0}
.sl-alert.critical{background:rgba(251,113,133,.08);border:0.5px solid var(--red-border)}
.sl-alert.warning{background:rgba(251,191,36,.07);border:0.5px solid var(--amber-border)}
.sl-alert.info{background:rgba(168,139,255,.07);border:0.5px solid var(--green-border)}
.sl-alert-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px}
.sl-alert-dot.critical{background:var(--red)}
.sl-alert-dot.warning{background:var(--amber)}
.sl-alert-dot.info{background:var(--green)}
.sl-alert-body{flex:1;min-width:0}
.sl-alert-msg{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.45}
.sl-alert-time{font-size:10px;color:var(--text3);font-family:var(--font-b);margin-top:3px}

/* Quick actions */
.sl-actions-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sl-qa{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;cursor:pointer}
.sl-qa:active{background:var(--bg2)}
.sl-qa.primary{background:var(--green);border-color:transparent}
.sl-qa.primary:active{filter:brightness(.9)}
.sl-qa-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--bg2)}
.sl-qa.primary .sl-qa-icon{background:rgba(0,0,0,.20)}
.sl-qa-label{font-family:var(--font-h);font-size:12px;font-weight:600;color:var(--text0);letter-spacing:-.01em;line-height:1.3}
.sl-qa.primary .sl-qa-label{color:#000}
.sl-divider{height:0.5px;background:var(--border);margin:20px 20px 0}
</style>`;

/* ════════════════════════
   HELPERS
════════════════════════ */
function fmtRevenue(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'к ₴';
  return n + ' ₴';
}

function urgencyLabel(u) {
  if (u === 'critical') return 'КРИТИЧНО';
  if (u === 'high')     return 'ВИСОКИЙ';
  return 'СЕРЕДНІЙ';
}

function stopCard(item) {
  const isLive = item.stoppedAt !== null;
  const timeStr = isLive
    ? `Зупинено о ${item.stoppedAt} · ${item.minutesAgo} хв тому`
    : 'Ще не зупинено — критичний залишок';

  const cardClass = item.urgency === 'critical' ? 'crit' : item.urgency === 'high' ? 'high' : 'med';

  return `
  <div class="sl-card ${cardClass}">
    <div class="sl-card-top">
      <div class="sl-card-row1">
        <div>
          <div class="sl-card-name">${item.name}</div>
          <div class="sl-card-cat">${item.category} · ${timeStr}</div>
        </div>
        <div class="sl-urgency ${item.urgency}">${urgencyLabel(item.urgency)}</div>
      </div>
      <div class="sl-card-metrics">
        <div class="sl-metric">
          <div class="sl-metric-lbl">Залишок</div>
          <div class="sl-metric-val ${item.stockLeft === 0 ? 'red' : 'amber'}">${item.stockLeft === 0 ? '0' : item.stockLeft} ${item.stockUnit}</div>
        </div>
        <div class="sl-metric">
          <div class="sl-metric-lbl">Втрати</div>
          <div class="sl-metric-val ${item.lostRevenue > 0 ? 'red' : 'dim'}">${item.lostRevenue > 0 ? fmtRevenue(item.lostRevenue) : '—'}</div>
        </div>
        <div class="sl-metric">
          <div class="sl-metric-lbl">₴/год</div>
          <div class="sl-metric-val amber">${fmtRevenue(item.lostPerHour)}</div>
        </div>
      </div>
    </div>

    <div class="sl-card-mid">
      <div class="sl-card-mid-lbl">Причина · Зачіплені страви</div>
      <div class="sl-reason-row">
        <div class="sl-reason-chip">${item.reasonLabel}</div>
      </div>
      <div class="sl-drinks-row">
        ${item.affectedDrinks.map(d => `<span class="sl-drink-tag">${d}</span>`).join('')}
      </div>
    </div>

    <div class="sl-card-bottom">
      <div class="sl-subs-lbl">Заміни</div>
      <div class="sl-subs-row">
        ${item.substitutes.map(s => `<span class="sl-sub">${s}</span>`).join('')}
      </div>
      <button class="sl-action-btn ${item.urgency === 'critical' ? 'primary' : ''}" onclick="window.__stopList.action(${item.id})">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v6l4 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
        </svg>
        ${item.action}
      </button>
    </div>
  </div>`;
}

function riskItem(r) {
  return `
  <div class="sl-risk-item">
    <div class="sl-risk-row1">
      <div class="sl-risk-name">${r.name}</div>
      <div class="sl-risk-eta ${r.urgency}">Стоп ~${r.eta}</div>
    </div>
    <div class="sl-risk-bar-bg">
      <div class="sl-risk-bar-fill ${r.urgency}" style="width:${r.pct}%"></div>
    </div>
    <div class="sl-risk-meta">
      <span class="sl-risk-pct">${r.pct}% залишилось</span>
      <span class="sl-risk-cons">${r.consumption}</span>
    </div>
  </div>`;
}

function predItem(p) {
  const isUrgent = parseInt(p.predictedAt) < 0 || p.confidence >= 90;
  return `
  <div class="sl-pred-item">
    <div class="sl-pred-time-block ${isUrgent ? '' : 'amber'}">
      <div class="sl-pred-time ${isUrgent ? '' : 'amber'}">${p.predictedAt}</div>
    </div>
    <div class="sl-pred-info">
      <div class="sl-pred-name">${p.name}</div>
      <div class="sl-pred-reason">${p.reason}</div>
    </div>
    <div class="sl-pred-conf ${p.confidence >= 85 ? 'hi' : 'mid'}">${p.confidence}%</div>
  </div>`;
}

/* ════════════════════════
   RENDER
════════════════════════ */
export function render() {
  const critCount  = ACTIVE_STOPS.filter(s => s.urgency === 'critical').length;
  const totalLoss  = ACTIVE_STOPS.reduce((a, s) => a + s.lostRevenue, 0);
  const riskCount  = INGREDIENT_RISKS.filter(r => r.pct < 25).length;
  const hourlyLoss = ACTIVE_STOPS.reduce((a, s) => a + s.lostPerHour, 0);

  return CSS + `
  <div class="sl-wrap">
    <!-- Header -->
    <div class="sl-header">
      <button class="sl-back" onclick="navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="sl-title-block">
        <div class="sl-title">Stop List</div>
        <div class="sl-subtitle">Операційний центр · ${new Date().toLocaleDateString('uk', {day:'numeric',month:'short'})}</div>
      </div>
      <div class="sl-live">
        <span class="sl-live-dot"></span>
        LIVE
      </div>
    </div>

    <div class="sl-scroll">

      <!-- KPI Row -->
      <div style="padding:4px 20px 16px">
        <div class="sl-kpi-row">
          <div class="sl-kpi crit">
            <div class="sl-kpi-label">Активні стопи</div>
            <div class="sl-kpi-val" style="color:var(--red)">${ACTIVE_STOPS.filter(s => s.stoppedAt).length}</div>
            <div class="sl-kpi-sub">${critCount} критичних</div>
          </div>
          <div class="sl-kpi warn">
            <div class="sl-kpi-label">Під ризиком</div>
            <div class="sl-kpi-val" style="color:var(--amber)">${INGREDIENT_RISKS.length}</div>
            <div class="sl-kpi-sub">${riskCount} критично мало</div>
          </div>
          <div class="sl-kpi loss">
            <div class="sl-kpi-label">Втрати сьогодні</div>
            <div class="sl-kpi-val" style="color:var(--green)">${fmtRevenue(totalLoss)}</div>
            <div class="sl-kpi-sub">${fmtRevenue(hourlyLoss)}/год зараз</div>
          </div>
          <div class="sl-kpi risk">
            <div class="sl-kpi-label">Прогноз стопів</div>
            <div class="sl-kpi-val" style="color:var(--blue)">${PREDICTED_STOPS.length}</div>
            <div class="sl-kpi-sub">наступні 4 год</div>
          </div>
        </div>
      </div>

      <!-- Active Stops -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Активні зупинки</div>
          <div class="sl-section-badge red">${ACTIVE_STOPS.length} позицій</div>
        </div>
        ${ACTIVE_STOPS.map(stopCard).join('')}
      </div>

      <div class="sl-divider"></div>

      <!-- Ingredient Risk -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Ризик закінчення інгредієнтів</div>
          <div class="sl-section-badge amber">До стопу</div>
        </div>
        <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:4px 16px">
          ${INGREDIENT_RISKS.map(riskItem).join('')}
        </div>
      </div>

      <div class="sl-divider"></div>

      <!-- Lost Revenue -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Аналітика втрат</div>
          <div class="sl-section-badge green">Сьогодні</div>
        </div>
        <div class="sl-revenue-card">
          <div class="sl-revenue-total-lbl">Загальні втрати виручки</div>
          <div class="sl-revenue-total">${fmtRevenue(totalLoss)}</div>
          <div class="sl-revenue-sub">Через активні стопи · оновлено щойно</div>
          ${ACTIVE_STOPS.filter(s => s.lostRevenue > 0).map(s => `
          <div class="sl-revenue-row">
            <div>
              <div class="sl-revenue-item-name">${s.name}</div>
              <div class="sl-revenue-rate">${fmtRevenue(s.lostPerHour)}/год</div>
            </div>
            <div class="sl-revenue-item-val" style="color:var(--red)">−${fmtRevenue(s.lostRevenue)}</div>
          </div>`).join('')}
        </div>
      </div>

      <div class="sl-divider"></div>

      <!-- Predicted Stops -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Прогноз зупинок</div>
          <div class="sl-section-badge blue">AI · наступні 4 год</div>
        </div>
        <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:4px 16px">
          ${PREDICTED_STOPS.map(predItem).join('')}
        </div>
      </div>

      <div class="sl-divider"></div>

      <!-- Smart Insights -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Розумні рекомендації</div>
          <div class="sl-section-badge green">AI</div>
        </div>
        <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:4px 16px">
          ${SMART_INSIGHTS.map(ins => `
          <div class="sl-insight-item">
            <div class="sl-insight-icon" style="background:rgba(255,255,255,.04)">
              <span style="color:${ins.color};font-size:14px">${ins.icon}</span>
            </div>
            <div class="sl-insight-text">${ins.text}</div>
          </div>`).join('')}
        </div>
      </div>

      <div class="sl-divider"></div>

      <!-- Operational Alerts -->
      <div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Операційні алерти</div>
          <div class="sl-section-badge red">${OPERATIONAL_ALERTS.filter(a => a.type === 'critical').length} критичних</div>
        </div>
        <div>
          ${OPERATIONAL_ALERTS.map(a => `
          <div class="sl-alert ${a.type}">
            <div class="sl-alert-dot ${a.type}"></div>
            <div class="sl-alert-body">
              <div class="sl-alert-msg">${a.msg}</div>
              <div class="sl-alert-time">${a.time}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <div class="sl-divider"></div>

      <!-- Quick Actions -->
      <div class="sl-section" style="padding-bottom:20px">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Швидкі дії</div>
        </div>
        <div class="sl-actions-grid">
          <div class="sl-qa primary" onclick="window.__stopList.emergencyOrder()">
            <div class="sl-qa-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v6l3 2" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>
                <circle cx="8" cy="8" r="6" stroke="#000" stroke-width="1.4"/>
              </svg>
            </div>
            <div class="sl-qa-label">Термінове замовлення</div>
          </div>
          <div class="sl-qa" onclick="window.__stopList.notifyTeam()">
            <div class="sl-qa-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 11V5a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H6l-3 2v-2H2z" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
              </svg>
            </div>
            <div class="sl-qa-label">Повідомити барменів</div>
          </div>
          <div class="sl-qa" onclick="window.__stopList.contactSupplier()">
            <div class="sl-qa-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
                <path d="M8 6v4M6 8h4" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="sl-qa-label">Зв'язатись з постачальником</div>
          </div>
          <div class="sl-qa" onclick="navigate('ordering')">
            <div class="sl-qa-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
                <path d="M5 5h6M5 8h4M5 11h3" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="sl-qa-label">Відкрити замовлення</div>
          </div>
        </div>
      </div>

    </div>
  </div>`;
}

/* ════════════════════════
   INIT
════════════════════════ */
export function init() {
  window.__stopList = {
    action(id) {
      const item = ACTIVE_STOPS.find(s => s.id === id);
      if (!item) return;
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#0A0A0A;border:0.5px solid rgba(168,139,255,.3);color:#fff;font-size:12px;font-family:Geist,sans-serif;padding:10px 16px;border-radius:10px;z-index:9999;white-space:nowrap;pointer-events:none';
      toast.textContent = '✓ ' + item.action;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    },
    emergencyOrder() {
      navigate('ordering');
    },
    notifyTeam() {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#0A0A0A;border:0.5px solid rgba(168,139,255,.3);color:#fff;font-size:12px;font-family:Geist,sans-serif;padding:10px 16px;border-radius:10px;z-index:9999;white-space:nowrap;pointer-events:none';
      toast.textContent = '✓ Команду повідомлено';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    },
    contactSupplier() {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#0A0A0A;border:0.5px solid rgba(168,139,255,.3);color:#fff;font-size:12px;font-family:Geist,sans-serif;padding:10px 16px;border-radius:10px;z-index:9999;white-space:nowrap;pointer-events:none';
      toast.textContent = '↗ Відкриваємо Telegram постачальника...';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    },
  };
}

export default { render, init };
