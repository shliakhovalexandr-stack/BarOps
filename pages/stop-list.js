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
let _pollTimer   = null;

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

.sl-card-top{padding:9px 14px 9px}
.sl-card-row1{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
.sl-card-name{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sl-card-cat{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.sl-urgency{padding:4px 9px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;flex-shrink:0}
.sl-urgency.critical{background:var(--red);color:#000}
.sl-urgency.high{background:var(--amber);color:#000}
.sl-urgency.medium{background:var(--blue-bg);color:var(--blue);border:0.5px solid var(--blue-border)}

.sl-card-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.sl-metric{display:flex;flex-direction:column;gap:1px}
.sl-metric-lbl{font-size:9px;color:var(--text3);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.sl-metric-val{font-family:var(--font-h);font-size:12px;font-weight:600;color:var(--text0);letter-spacing:-.01em}
.sl-metric-val.red{color:var(--red)}
.sl-metric-val.amber{color:var(--amber)}
.sl-metric-val.dim{color:var(--text2)}

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

/* Diagnostic modal */
.sl-diag-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:flex-end}
.sl-diag-sheet{background:var(--bg1);border-radius:20px 20px 0 0;width:100%;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;border-top:0.5px solid var(--border)}
.sl-diag-header{padding:16px 20px 12px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:0.5px solid var(--border)}
.sl-diag-title{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0)}
.sl-diag-close{width:28px;height:28px;border-radius:8px;background:var(--bg2);border:none;color:var(--text1);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.sl-diag-scroll{overflow-y:auto;flex:1;padding:16px 20px 24px}
.sl-diag-scroll::-webkit-scrollbar{width:0}
.sl-diag-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;padding:10px 12px;background:var(--bg2);border-radius:10px;border:0.5px solid var(--border)}
.sl-diag-row.ok{border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.05)}
.sl-diag-row.fail{border-color:rgba(251,113,133,.25);background:rgba(251,113,133,.05)}
.sl-diag-row.warn{border-color:rgba(251,191,36,.22);background:rgba(251,191,36,.05)}
.sl-diag-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
.sl-diag-dot.ok{background:var(--green)}
.sl-diag-dot.fail{background:var(--red)}
.sl-diag-dot.warn{background:var(--amber)}
.sl-diag-dot.info{background:var(--blue)}
.sl-diag-label{font-size:12px;font-weight:700;color:var(--text0);font-family:var(--font-b);margin-bottom:2px}
.sl-diag-val{font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.5;word-break:break-all}
.sl-diag-tg{margin-top:8px;background:var(--bg3);border-radius:8px;padding:8px 10px}
.sl-diag-tg-row{display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-b);padding:3px 0;border-bottom:0.5px solid var(--border)}
.sl-diag-tg-row:last-child{border-bottom:none}
.sl-diag-tg-id{color:var(--text1);font-weight:600}
.sl-diag-tg-cnt{color:var(--text2)}
.sl-diag-hint{margin-top:12px;padding:12px;background:rgba(168,139,255,.07);border:0.5px solid rgba(168,139,255,.25);border-radius:10px;font-size:11px;color:var(--text1);font-family:var(--font-b);line-height:1.6}
.sl-diag-spin{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.08);border-top-color:#A88BFF;animation:slSpin .8s linear infinite;margin:30px auto;display:block}
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
  if (u === 'critical') return 'СТОП';
  if (u === 'high')     return 'СТОП';
  return 'СТОП';
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
          <div class="sl-card-cat">${item.topStore ? `<span style="font-weight:700;color:var(--text1)">${item.topStore}</span> · ` : ''}${item.category || '—'} · ${item.reasonLabel}</div>
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
   DIAGNOSTIC HTML
════════════════════════ */
function buildDiagHtml(d) {
  if (d.error) {
    return `<div class="sl-diag-row fail">
      <div class="sl-diag-dot fail"></div>
      <div><div class="sl-diag-label">Помилка</div><div class="sl-diag-val">${d.error}</div></div>
    </div>`;
  }

  const rows = [];

  // API key source
  rows.push(`<div class="sl-diag-row ok">
    <div class="sl-diag-dot info"></div>
    <div>
      <div class="sl-diag-label">Джерело API ключа</div>
      <div class="sl-diag-val">${d.apiKeySource || '—'}<br><span style="opacity:.7">${d.base || ''}</span></div>
    </div>
  </div>`);

  // Auth
  if (d.auth) {
    const ok = d.auth.hasToken;
    rows.push(`<div class="sl-diag-row ${ok ? 'ok' : 'fail'}">
      <div class="sl-diag-dot ${ok ? 'ok' : 'fail'}"></div>
      <div>
        <div class="sl-diag-label">Авторизація (access_token)</div>
        <div class="sl-diag-val">${ok ? 'Токен отримано' : 'Токен НЕ отримано'}${d.auth.error ? ' · ' + d.auth.error : ''}</div>
      </div>
    </div>`);
  }

  if (!d.auth?.hasToken) return rows.join('');

  // Organizations
  const orgs = d.organizations || [];
  rows.push(`<div class="sl-diag-row ${orgs.length ? 'ok' : 'fail'}">
    <div class="sl-diag-dot ${orgs.length ? 'ok' : 'fail'}"></div>
    <div>
      <div class="sl-diag-label">Організації (${orgs.length})</div>
      <div class="sl-diag-val">${orgs.map(o => `${o.name}<br><span style="opacity:.5;font-size:10px">${o.id}</span>`).join('<br>') || 'Немає'}</div>
    </div>
  </div>`);

  if (!orgs.length) return rows.join('');

  // Stop lists — terminal groups
  const sl   = d.stopLists || {};
  const tgs  = sl.terminalGroups || [];
  const totalItems = tgs.reduce((s, t) => s + (t.itemCount || 0), 0);

  if (tgs.length === 0) {
    rows.push(`<div class="sl-diag-row fail">
      <div class="sl-diag-dot fail"></div>
      <div>
        <div class="sl-diag-label">Stop Lists: термінальні групи</div>
        <div class="sl-diag-val">Не знайдено жодної термінальної групи у відповіді.<br>Можливо в Syrve ще не налаштовано Terminal Groups або stoplists порожні.</div>
      </div>
    </div>`);
  } else {
    const tgTable = `<div class="sl-diag-tg">
      <div style="font-size:10px;font-weight:700;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px">Термінальні групи у стоп-листі</div>
      ${tgs.map(t => `<div class="sl-diag-tg-row">
        <span class="sl-diag-tg-id">${t.terminalGroupId}</span>
        <span class="sl-diag-tg-cnt">${t.itemCount} позицій</span>
      </div>`).join('')}
    </div>`;
    rows.push(`<div class="sl-diag-row ${totalItems > 0 ? 'ok' : 'warn'}">
      <div class="sl-diag-dot ${totalItems > 0 ? 'ok' : 'warn'}"></div>
      <div style="width:100%">
        <div class="sl-diag-label">Stop Lists: ${tgs.length} груп, ${totalItems} позицій</div>
        ${tgTable}
      </div>
    </div>`);
  }

  // Hint
  if (tgs.length > 0) {
    rows.push(`<div class="sl-diag-hint">
      Щоб фільтрувати стоп-лист по конкретному терміналу — вкажіть <strong>terminalGroupId</strong> у полі <strong>Syrve Department ID</strong> в налаштуваннях закладу.<br>
      Якщо у закладі немає окремих терміналів — залиште поле порожнім: буде показано всі позиції з усіх груп.
    </div>`);
  } else {
    rows.push(`<div class="sl-diag-hint">
      Перевірте в Syrve: <strong>Ресторани → Термінальні групи</strong>. Якщо їх немає — стоп-лист порожній по API. Переконайтеся, що POS-термінал активний і пов'язаний з організацією.
    </div>`);
  }

  // Terminal groups
  const tg = d.terminalGroups;
  if (tg) {
    const hasGroups = tg.items && tg.items.length > 0;
    rows.push(`<div class="sl-diag-row ${hasGroups ? 'ok' : 'fail'}">
      <div class="sl-diag-dot ${hasGroups ? 'ok' : 'fail'}"></div>
      <div style="width:100%">
        <div class="sl-diag-label">Термінальні групи (terminal_groups) · ${tg.items?.length ?? 0}</div>
        ${hasGroups
          ? `<div class="sl-diag-tg">${tg.items.map(t => `<div class="sl-diag-tg-row"><span class="sl-diag-tg-id">${t.name}</span><span class="sl-diag-tg-cnt" style="font-size:9px;opacity:.6">${t.id}</span></div>`).join('')}</div>
             <div class="sl-diag-val" style="margin-top:6px;color:var(--amber)">Вкажи один з цих ID у полі <strong>Syrve Department ID</strong> закладу</div>`
          : `<div class="sl-diag-val">Syrve не повертає жодної термінальної групи для цієї організації.<br>Стоп-ліст через API неможливий без Terminal Group.</div>
             <pre style="margin-top:6px;font-size:10px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.4">${(tg.rawPreview||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`}
      </div>
    </div>`);
  }

  // stop_lists/check results
  const checks = d.stopListsCheck || [];
  if (checks.length > 0) {
    for (const c of checks) {
      const cnt      = c.itemCount;
      const hasItems = typeof cnt === 'number' && cnt > 0;
      const rowCls   = c.error ? 'fail' : hasItems ? 'ok' : 'warn';
      rows.push(`<div class="sl-diag-row ${rowCls}">
        <div class="sl-diag-dot ${rowCls}"></div>
        <div style="width:100%">
          <div class="sl-diag-label">stop_lists/check${c.terminalGroupName ? ' · ' + c.terminalGroupName : ''}</div>
          <div class="sl-diag-val">${c.error ? c.error : `HTTP ${c.status} · ${cnt !== null ? cnt + ' страв у стопі' : 'невідомий формат'}`}</div>
          ${hasItems && c.items?.length ? `<div class="sl-diag-tg" style="margin-top:6px">${c.items.map(i => `<div class="sl-diag-tg-row"><span class="sl-diag-tg-id" style="font-size:10px;opacity:.7">${i.productId?.slice(0,8)}…</span><span class="sl-diag-tg-cnt">balance: ${i.balance ?? 'стоп'}</span></div>`).join('')}</div>` : ''}
          ${!hasItems && c.rawPreview ? `<pre style="margin-top:6px;font-size:10px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.4">${c.rawPreview.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>` : ''}
        </div>
      </div>`);
    }
  }

  // Raw preview /stop_lists
  if (sl.rawPreview) {
    rows.push(`<div style="margin-top:4px">
      <div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">stop_lists — сира відповідь</div>
      <pre style="font-size:10px;color:var(--text2);background:var(--bg3);border-radius:8px;padding:10px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.5">${sl.rawPreview.slice(0, 800).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    </div>`);
  }

  // Self-hosted server section
  if (d.selfhosted) {
    const sh = d.selfhosted;
    rows.push(`<div style="margin-top:16px;padding-top:12px;border-top:0.5px solid var(--border)">
      <div style="font-size:10px;font-weight:700;color:var(--purple,#a855f7);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">SELF-HOSTED: ${sh.base}</div>
    </div>`);
    if (sh.error) {
      rows.push(`<div class="sl-diag-row fail"><div class="sl-diag-dot fail"></div><div><div class="sl-diag-label">Помилка</div><div class="sl-diag-val">${sh.error}</div></div></div>`);
    } else if (sh.auth) {
      const authOk = sh.auth.hasToken;
      rows.push(`<div class="sl-diag-row ${authOk ? 'ok' : 'fail'}">
        <div class="sl-diag-dot ${authOk ? 'ok' : 'fail'}"></div>
        <div><div class="sl-diag-label">Self-hosted авторизація (/api/1/access_token + password)</div>
        <div class="sl-diag-val">HTTP ${sh.auth.status} · ${authOk ? 'Токен отримано' : 'Помилка авторизації'}</div></div>
      </div>`);
      if (authOk) {
        if (sh.stopLists) {
          const shGroups = sh.stopLists.groups || [];
          const hasShItems = shGroups.some(g => g.itemCount > 0);
          rows.push(`<div class="sl-diag-row ${hasShItems ? 'ok' : 'warn'}">
            <div class="sl-diag-dot ${hasShItems ? 'ok' : 'warn'}"></div>
            <div style="width:100%">
              <div class="sl-diag-label">Self-hosted stop_lists</div>
              <div class="sl-diag-val">${hasShItems ? shGroups.map(g => `${g.terminalGroupId}: ${g.itemCount} позицій`).join(', ') : 'Порожньо'}</div>
              ${sh.stopLists.rawPreview ? `<pre style="margin-top:6px;font-size:9px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.4">${sh.stopLists.rawPreview.slice(0,400).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>` : ''}
            </div>
          </div>`);
        }
        if (sh.checks && sh.checks.length > 0) {
          for (const c of sh.checks) {
            const cnt = c.rejectedCount ?? null;
            const hasStop = cnt !== null && cnt > 0;
            rows.push(`<div class="sl-diag-row ${hasStop ? 'ok' : 'warn'}">
              <div class="sl-diag-dot ${hasStop ? 'ok' : 'warn'}"></div>
              <div style="width:100%">
                <div class="sl-diag-label">Self-hosted stop_lists/check · ${c.terminalGroupName || c.terminalGroupId}</div>
                <div class="sl-diag-val">${c.error || `HTTP ${c.status} · ${cnt !== null ? cnt + ' страв у стопі' : 'невідомий формат'}`}</div>
                ${c.rawPreview ? `<pre style="margin-top:6px;font-size:9px;color:var(--text2);background:var(--bg3);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.4">${c.rawPreview.slice(0,300).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>` : ''}
              </div>
            </div>`);
          }
        }
        if (sh.nomenclatureCount !== undefined) {
          rows.push(`<div class="sl-diag-row"><div class="sl-diag-dot info"></div><div><div class="sl-diag-label">Self-hosted номенклатура</div><div class="sl-diag-val">${sh.nomenclatureCount} позицій передано до stop_lists/check</div></div></div>`);
        }
      }
    }
  }

  return rows.join('');
}

/* ════════════════════════
   BUILD PAGE HTML
════════════════════════ */
function buildPage() {
  const critCount = _activeStops.filter(s => s.urgency === 'critical').length;
  const syncStr   = _syncedAt
    ? (_loading ? `Оновлення… · ${fmtSyncedAt(_syncedAt)}` : `Синхронізовано о ${fmtSyncedAt(_syncedAt)}`)
    : 'Завантаження...';

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
      <button class="sl-back" onclick="window.__barops.navigate('dashboard')">
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

    ${totalStops > 0 ? (() => {
      const byStore = {};
      for (const s of _activeStops) {
        const key = s.topStore || 'Інше';
        if (!byStore[key]) byStore[key] = [];
        byStore[key].push(s);
      }
      const order = ['Бар', 'Кухня', ...Object.keys(byStore).filter(k => k !== 'Бар' && k !== 'Кухня')];
      return `<div class="sl-section">
        <div class="sl-section-hdr">
          <div class="sl-section-title">Активні зупинки</div>
          <div class="sl-section-badge red">${totalStops} позицій</div>
        </div>
        ${order.filter(k => byStore[k]).map(k => `
          <div style="margin-bottom:4px">
            <div style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;padding:8px 4px 4px">${k} · ${byStore[k].length}</div>
            ${byStore[k].map(stopCard).join('')}
          </div>`).join('')}
      </div>`;
    })() : ''}

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
  const isAdmin = state.role === 'admin';
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
      <div class="sl-qa" onclick="window.__barops.navigate('ordering')">
        <div class="sl-qa-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--text1)" stroke-width="1.4" fill="none"/>
            <path d="M5 5h6M5 8h4M5 11h3" stroke="var(--text1)" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="sl-qa-label">Відкрити замовлення</div>
      </div>
      <div class="sl-qa" onclick="window.__barops.navigate('inventory')">
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
    ${isAdmin ? `
    <div style="margin-top:8px">
      <div class="sl-qa" style="grid-column:1/-1" onclick="window.__stopList.diagnose()">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="sl-qa-icon" style="background:rgba(168,139,255,.12);border:0.5px solid rgba(168,139,255,.25)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#A88BFF" stroke-width="1.4"/>
              <path d="M8 5v3.5M8 11v.5" stroke="#A88BFF" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="sl-qa-label" style="color:#A88BFF">Діагностика Syrve API</div>
        </div>
      </div>
    </div>` : ''}
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

  const hasData = _activeStops.length > 0 || _atRisk.length > 0 || _syncedAt;
  _loading = true;
  _error   = '';
  if (!hasData) re(); // спінер тільки якщо немає жодних попередніх даних

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
  _error   = '';
  // Якщо є попередні дані — показуємо їх одразу, оновлення відбудеться у фоні в init()
  if (!_syncedAt) _loading = true;
  return buildPage();
}

/* ════════════════════════
   INIT
════════════════════════ */
export function init() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }

  window.__stopList = {
    refresh() { loadStopList(); },
    notifyTeam() {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#0A0A0A;border:0.5px solid rgba(168,139,255,.3);color:#fff;font-size:12px;font-family:Geist,sans-serif;padding:10px 16px;border-radius:10px;z-index:9999;white-space:nowrap;pointer-events:none';
      toast.textContent = '✓ Стоп-лист відправлено команді';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    },
    async diagnose() {
      const token   = localStorage.getItem('barops_token');
      const venueId = state.venueId || localStorage.getItem('barops_venueId');
      if (!venueId) return;

      // Show modal with spinner
      const overlay = document.createElement('div');
      overlay.className = 'sl-diag-overlay';
      overlay.id = 'sl-diag-overlay';
      overlay.innerHTML = `
        <div class="sl-diag-sheet">
          <div class="sl-diag-header">
            <div class="sl-diag-title">Діагностика Syrve API</div>
            <button class="sl-diag-close" onclick="document.getElementById('sl-diag-overlay')?.remove()">✕</button>
          </div>
          <div class="sl-diag-scroll" id="sl-diag-content">
            <div class="sl-diag-spin"></div>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      try {
        const res  = await fetch(`${API}/api/pos/debug-cloud-stoplist/${venueId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const el   = document.getElementById('sl-diag-content');
        if (!el) return;
        el.innerHTML = buildDiagHtml(data);
      } catch (err) {
        const el = document.getElementById('sl-diag-content');
        if (el) el.innerHTML = `<div class="sl-diag-row fail"><div class="sl-diag-dot fail"></div><div><div class="sl-diag-label">Помилка запиту</div><div class="sl-diag-val">${err.message}</div></div></div>`;
      }
    },
  };

  loadStopList();

  _pollTimer = setInterval(() => {
    if (!document.querySelector('.sl-wrap')) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      return;
    }
    loadStopList();
  }, 30000);
}

export default { render, init };
