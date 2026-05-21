/* ============================================================
   BarOps — pages/stop-list.js
   Stop List — операційний центр з реальними даними Syrve
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _loading   = false;
let _error     = '';
let _syncedAt  = null;
let _activeStops = [];
let _atRisk      = [];

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

/* At risk section */
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
.sl-risk-cat{font-size:10px;color:var(--text3);font-family:var(--font-b)}

/* Loading / empty */
.sl-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:60px 20px}
.sl-loading-ring{width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,.08);border-top-color:#A88BFF;animation:slSpin .8s linear infinite}
@keyframes slSpin{to{transform:rotate(360deg)}}
.sl-loading-text{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.sl-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;text-align:center}
.sl-empty-icon{font-size:32px;opacity:.4}
.sl-empty-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0)}
.sl-empty-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.55}
.sl-error{margin:16px 20px;background:rgba(251,113,133,.08);border:0.5px solid var(--red-border);border-radius:12px;padding:14px;font-size:12px;color:var(--red);font-family:var(--font-b);line-height:1.5}
.sl-refresh-btn{margin:12px 20px 0;height:36px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:10px;color:var(--text1);font-size:12px;font-family:var(--font-b);cursor:pointer;width:calc(100% - 40px)}
.sl-refresh-btn:active{background:var(--bg3)}

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
function fmtStock(item) {
  if (item.stock === 0) return '0 ' + item.unit;
  const v = typeof item.stock === 'number' ? item.stock : 0;
  return (v < 1 ? v.toFixed(2) : v.toFixed(1)).replace(/\.0+$/, '') + ' ' + item.unit;
}

function urgencyLabel(u) {
  if (u === 'critical') return 'КРИТИЧНО';
  if (u === 'high')     return 'ВИСОКИЙ';
  return 'СЕРЕДНІЙ';
}

function fmtSyncedAt(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/* ════════════════════════
   CARD BUILDERS
════════════════════════ */
function stopCard(item) {
  const isSoldOut = item.stock <= 0;
  const cardClass = item.urgency === 'critical' ? 'crit' : item.urgency === 'high' ? 'high' : 'med';

  return `
  <div class="sl-card ${cardClass}">
    <div class="sl-card-top">
      <div class="sl-card-row1">
        <div>
          <div class="sl-card-name">${item.name}</div>
          <div class="sl-card-cat">${item.category || '—'} · ${item.reasonLabel}</div>
        </div>
        <div class="sl-urgency ${item.urgency}">${urgencyLabel(item.urgency)}</div>
      </div>
      <div class="sl-card-metrics">
        <div class="sl-metric">
          <div class="sl-metric-lbl">Залишок</div>
          <div class="sl-metric-val ${isSoldOut ? 'red' : 'amber'}">${fmtStock(item)}</div>
        </div>
        <div class="sl-metric">
          <div class="sl-metric-lbl">Одиниця</div>
          <div class="sl-metric-val dim">${item.unit || '—'}</div>
        </div>
        <div class="sl-metric">
          <div class="sl-metric-lbl">Статус</div>
          <div class="sl-metric-val ${isSoldOut ? 'red' : 'amber'}">${isSoldOut ? 'Стоп' : 'Критично'}</div>
        </div>
      </div>
    </div>
    <div class="sl-card-mid">
      <div class="sl-card-mid-lbl">Причина</div>
      <div style="font-size:12px;color:var(--text1);font-family:var(--font-b)">${item.reasonLabel}</div>
    </div>
  </div>`;
}

function riskCard(item) {
  const pct = item.stock > 0 ? Math.min(Math.round(item.stock * 100), 100) : 0;
  const urgency = item.urgency || 'high';
  return `
  <div class="sl-risk-item">
    <div class="sl-risk-row1">
      <div class="sl-risk-name">${item.name}</div>
      <div class="sl-risk-eta ${urgency}">Малий залишок</div>
    </div>
    <div class="sl-risk-bar-bg">
      <div class="sl-risk-bar-fill ${urgency}" style="width:${Math.max(pct, 4)}%"></div>
    </div>
    <div class="sl-risk-meta">
      <span class="sl-risk-pct">${fmtStock(item)} залишилось</span>
      <span class="sl-risk-cat">${item.category || ''}</span>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD PAGE HTML
════════════════════════ */
function buildPage() {
  const critCount = _activeStops.filter(s => s.urgency === 'critical').length;
  const syncStr   = _syncedAt ? `Синхронізовано о ${fmtSyncedAt(_syncedAt)}` : 'Оновлення...';

  const bodyContent = _loading
    ? `<div class="sl-loading">
        <div class="sl-loading-ring"></div>
        <div class="sl-loading-text">Отримуємо дані з POS...</div>
       </div>`
    : _error
    ? `<div class="sl-error">${_error}</div>
       <button class="sl-refresh-btn" onclick="window.__stopList.refresh()">Спробувати знову</button>`
    : buildDataPage(critCount);

  return CSS + `
  <div class="sl-wrap">
    <div class="sl-header">
      <button class="sl-back" onclick="navigate('dashboard')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="sl-title-block">
        <div class="sl-title">Stop List</div>
        <div class="sl-subtitle">${syncStr}</div>
      </div>
      <div class="sl-live">
        <span class="sl-live-dot"></span>
        LIVE
      </div>
    </div>
    <div class="sl-scroll" id="sl-body">
      ${bodyContent}
    </div>
  </div>`;
}

function buildDataPage(critCount) {
  const totalStops = _activeStops.length;
  const riskCount  = _atRisk.length;

  if (totalStops === 0 && riskCount === 0) {
    return `
    <div class="sl-empty">
      <div class="sl-empty-icon">✓</div>
      <div class="sl-empty-title">Стоп-листа немає</div>
      <div class="sl-empty-sub">Всі інгредієнти в наявності.<br>Дані синхронізовані з Syrve.</div>
    </div>
    ${quickActionsSection()}`;
  }

  return `
    <div style="padding:4px 20px 16px">
      <div class="sl-kpi-row">
        <div class="sl-kpi crit">
          <div class="sl-kpi-label">Активні стопи</div>
          <div class="sl-kpi-val" style="color:var(--red)">${totalStops}</div>
          <div class="sl-kpi-sub">${critCount} критичних</div>
        </div>
        <div class="sl-kpi warn">
          <div class="sl-kpi-label">Під ризиком</div>
          <div class="sl-kpi-val" style="color:var(--amber)">${riskCount}</div>
          <div class="sl-kpi-sub">малий залишок</div>
        </div>
        <div class="sl-kpi loss">
          <div class="sl-kpi-label">Sold Out</div>
          <div class="sl-kpi-val" style="color:var(--green)">${_activeStops.filter(s => s.stock <= 0).length}</div>
          <div class="sl-kpi-sub">позицій немає</div>
        </div>
        <div class="sl-kpi risk">
          <div class="sl-kpi-label">Критично мало</div>
          <div class="sl-kpi-val" style="color:var(--blue)">${_activeStops.filter(s => s.stock > 0).length}</div>
          <div class="sl-kpi-sub">залишок ≤0.5</div>
        </div>
      </div>
    </div>

    ${totalStops > 0 ? `
    <div class="sl-section">
      <div class="sl-section-hdr">
        <div class="sl-section-title">Активні зупинки</div>
        <div class="sl-section-badge red">${totalStops} позицій</div>
      </div>
      ${_activeStops.map(stopCard).join('')}
    </div>` : ''}

    ${riskCount > 0 ? `
    <div class="sl-divider"></div>
    <div class="sl-section">
      <div class="sl-section-hdr">
        <div class="sl-section-title">Під ризиком закінчення</div>
        <div class="sl-section-badge amber">${riskCount} позицій</div>
      </div>
      <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:4px 16px">
        ${_atRisk.map(riskCard).join('')}
      </div>
    </div>` : ''}

    <div class="sl-divider"></div>
    ${quickActionsSection()}`;
}

function quickActionsSection() {
  return `
  <div class="sl-section" style="padding-bottom:20px">
    <div class="sl-section-hdr">
      <div class="sl-section-title">Швидкі дії</div>
    </div>
    <div class="sl-actions-grid">
      <div class="sl-qa primary" onclick="window.__stopList.refresh()">
        <div class="sl-qa-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13 8A5 5 0 112.5 5.5" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M2 2v4h4" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="sl-qa-label">Оновити стоп-лист</div>
      </div>
      <div class="sl-qa" onclick="window.__stopList.notifyTeam()">
        <div class="sl-qa-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 11V5a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H6l-3 2v-2H2z" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
          </svg>
        </div>
        <div class="sl-qa-label">Повідомити барменів</div>
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
      <div class="sl-qa" onclick="navigate('inventory')">
        <div class="sl-qa-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3h10l-1 8H4L3 3z" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
            <path d="M1 3h14" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M6 7v3M10 7v3" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="sl-qa-label">Інвентаризація</div>
      </div>
    </div>
  </div>`;
}

function re() {
  const el = document.getElementById('sl-body');
  if (el) {
    const critCount = _activeStops.filter(s => s.urgency === 'critical').length;
    const bodyContent = _loading
      ? `<div class="sl-loading"><div class="sl-loading-ring"></div><div class="sl-loading-text">Отримуємо дані з POS...</div></div>`
      : _error
      ? `<div class="sl-error">${_error}</div><button class="sl-refresh-btn" onclick="window.__stopList.refresh()">Спробувати знову</button>`
      : buildDataPage(critCount);
    el.innerHTML = bodyContent;
  }
}

/* ════════════════════════
   API
════════════════════════ */
async function loadStopList() {
  const token   = localStorage.getItem('barops_token');
  const venueId = state.venueId || localStorage.getItem('barops_venueId');

  if (!venueId) {
    _error   = 'Заклад не обрано. Зайдіть у налаштування та оберіть заклад.';
    _loading = false;
    re();
    return;
  }

  _loading = true;
  _error   = '';
  re();

  try {
    const res = await fetch(`${API}/api/pos/stop-list/${venueId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Помилка сервера (${res.status})`);
    }

    const data = await res.json();
    _activeStops = data.activeStops || [];
    _atRisk      = data.atRisk      || [];
    _syncedAt    = data.syncedAt    || new Date().toISOString();

  } catch (err) {
    _error = err.message || 'Не вдалось отримати дані з POS';
  } finally {
    _loading = false;
    re();
  }
}

/* ════════════════════════
   RENDER
════════════════════════ */
export function render() {
  _loading     = true;
  _error       = '';
  _activeStops = [];
  _atRisk      = [];
  _syncedAt    = null;
  return buildPage();
}

/* ════════════════════════
   INIT
════════════════════════ */
export function init() {
  window.__stopList = {
    refresh() { loadStopList(); },
    notifyTeam() {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#0A0A0A;border:0.5px solid rgba(168,139,255,.3);color:#fff;font-size:12px;font-family:Geist,sans-serif;padding:10px 16px;border-radius:10px;z-index:9999;white-space:nowrap;pointer-events:none';
      toast.textContent = '✓ Стоп-лист відправлено команді';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    },
  };

  loadStopList();
}

export default { render, init };
