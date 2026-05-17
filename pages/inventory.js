/* ============================================================
   BarOps — pages/inventory.js
   Інвентаризація: реальні дані з DB + Syrve
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

/* ════════════════════════ STATE ════════════════════════ */
let _venueId = null, _token = null, _role = null;
let _sessions        = [];
let _balance         = [];     // [{id,name,amount,unit,category}] з Syrve
let _configs         = {};     // productId → {mode,emptyTareKg,fullTareKg,bottleVolL}
let _counts          = {};     // productId → {full,partial,kg,sht}
let _openPid         = null;   // accordion: який продукт відкритий
let _loading         = true;
let _saving          = false;
let _error           = '';
let _view            = 'bar';  // 'bar' | 'mgr'
let _showSchedForm   = false;
let _schedDate       = '';
let _configPid       = null;   // продукт, що налаштовується
let _configDraft     = { mode: 'sht', emptyTareKg: '', fullTareKg: '', bottleVolL: '' };
let _cfgSaving       = false;
let _cfgError        = '';
let _submitted       = false;

/* ════════════════════════ CSS ════════════════════════ */
const CSS = `<style id="inv-css">
.inv-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.inv-scroll{overflow-y:auto;flex:1}.inv-scroll::-webkit-scrollbar{width:0}

/* Role tabs */
.inv-role-tabs{display:flex;gap:2px;margin:8px 14px 4px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:3px;flex-shrink:0}
.inv-rtab{flex:1;height:30px;border-radius:7px;border:none;background:transparent;font-size:12px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.inv-rtab.act{background:var(--bg3);color:var(--text0);border:0.5px solid var(--border2)}

/* Session header */
.inv-session-hdr{margin:10px 14px 8px;background:var(--green-bg);border:0.5px solid var(--green-border);border-radius:16px;padding:14px 16px}
.inv-sh-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.inv-sh-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--text0)}
.inv-sh-badge{display:inline-flex;align-items:center;gap:5px;background:var(--green);border-radius:20px;padding:3px 10px;font-size:10px;color:#fff;font-family:var(--font-b)}
.inv-sh-bdot{width:5px;height:5px;border-radius:50%;background:#fff;animation:invPulse 1.8s ease-in-out infinite}
@keyframes invPulse{0%,100%{opacity:1}50%{opacity:.35}}
.inv-prog{height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-bottom:6px}
.inv-prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--green),var(--green-l));transition:width .6s ease}
.inv-sh-nums{display:flex;justify-content:space-between;font-size:10px;color:var(--text2);font-family:var(--font-b)}

/* Locked */
.inv-locked-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 28px;text-align:center}
.inv-lock-icon{width:80px;height:80px;border-radius:24px;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;margin-bottom:24px;position:relative}
.inv-lock-badge{position:absolute;top:-8px;right:-8px;width:26px;height:26px;border-radius:50%;background:var(--amber);border:2px solid var(--bg1);display:flex;align-items:center;justify-content:center}
.inv-locked-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:8px;letter-spacing:-.02em}
.inv-locked-sub{font-size:13px;color:var(--text2);line-height:1.65;font-family:var(--font-b);font-weight:300;max-width:260px}
.inv-next-card{margin-top:22px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:16px;padding:18px 20px;text-align:left;width:100%}
.inv-next-lbl{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:8px}
.inv-next-date{font-family:var(--font-h);font-size:22px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.inv-next-day{font-size:13px;color:var(--text2);margin-top:3px;font-family:var(--font-b)}

/* Product list */
.inv-prod-list{padding:0 14px;display:flex;flex-direction:column;gap:5px}
.inv-prod{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;overflow:hidden}
.inv-prod.entered{border-color:var(--green-border);background:var(--green-bg)}
.inv-prod-row{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer}
.inv-pbar{width:3px;height:36px;border-radius:2px;flex-shrink:0}
.inv-pcat{width:34px;height:34px;border-radius:9px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:11px;font-family:var(--font-b);color:var(--text2);flex-shrink:0}
.inv-pname{font-size:13px;color:var(--text1);font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inv-pmeta{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.inv-pqty{font-family:var(--font-h);font-size:15px;font-weight:700;text-align:right}
.inv-punit{font-size:10px;color:var(--text2);font-family:var(--font-b);text-align:right}
.inv-penter{width:32px;height:32px;border-radius:9px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.inv-penter.done{background:var(--green-bg);border-color:var(--green-border)}

/* Input panel */
.inv-ipanel{background:var(--bg3);border-top:0.5px solid var(--border2);padding:14px 13px;display:flex;flex-direction:column;gap:11px}
.inv-inp-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.06em;text-transform:uppercase}
.inv-field{height:50px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;padding:0 14px;font-size:20px;font-family:var(--font-h);font-weight:700;color:var(--text0);outline:none;width:100%;text-align:center;transition:border-color .2s}
.inv-field:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.inv-stepper{display:flex;gap:8px;align-items:center}
.inv-stbtn{width:52px;height:52px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;font-size:24px;color:var(--text0);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none}
.inv-stbtn:active{background:var(--bg3)}
.inv-stdisp{flex:1;height:52px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:24px;font-weight:700;color:var(--text0)}
.inv-conv{background:var(--bg2);border:0.5px solid var(--green-border);border-radius:9px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
.inv-conv-formula{font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.inv-conv-result{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--green)}
.inv-conv-unit{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

/* Actions */
.inv-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.inv-btn-green{width:100%;height:52px;background:var(--green);border:none;border-radius:13px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 18px rgba(29,158,117,.22)}
.inv-btn-green:active{background:var(--green-d)}
.inv-btn-green:disabled{opacity:.45;cursor:default}

/* Manager sections */
.inv-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.inv-sec-link{font-size:11px;color:var(--green);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b);padding:0}

/* Session cards */
.inv-sess-list{padding:0 14px;display:flex;flex-direction:column;gap:6px}
.inv-sess-item{background:var(--bg2);border:0.5px solid var(--border);border-radius:13px;padding:13px 15px;display:flex;align-items:center;gap:10px}
.inv-sess-date{font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);flex:1}
.inv-sess-who{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.inv-badge{display:inline-flex;align-items:center;border-radius:20px;padding:3px 9px;font-size:10px;font-family:var(--font-b)}
.inv-badge-sched{background:var(--bg3);color:var(--text2);border:0.5px solid var(--border2)}
.inv-badge-open{background:var(--green-bg);color:var(--green);border:0.5px solid var(--green-border)}
.inv-badge-done{background:var(--bg3);color:var(--text3);border:0.5px solid var(--border2)}
.inv-sess-btn{height:30px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg3);font-size:11px;color:var(--text1);cursor:pointer;font-family:var(--font-b);padding:0 11px;flex-shrink:0;transition:all .15s}
.inv-sess-btn:hover{background:var(--bg4);color:var(--text0)}
.inv-sess-btn.danger{color:var(--red);border-color:var(--red-border)}

/* Schedule form */
.inv-sched-form{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--green-border);border-radius:13px;padding:14px;display:flex;flex-direction:column;gap:10px}
.inv-sf-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.07em;text-transform:uppercase}
.inv-sf-inp{height:44px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;padding:0 12px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;width:100%;transition:border-color .2s}
.inv-sf-inp:focus{border-color:var(--green)}
.inv-sf-row{display:flex;gap:8px}
.inv-sf-save{flex:1;height:40px;background:var(--green);border:none;border-radius:9px;font-size:13px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h)}
.inv-sf-cancel{height:40px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b);padding:0 16px}

/* Product config list */
.inv-cfg-list{padding:0 14px;display:flex;flex-direction:column;gap:5px}
.inv-cfg-row{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:10px}
.inv-cfg-name{flex:1;font-size:13px;color:var(--text1);font-family:var(--font-b);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-cfg-sub{font-size:10px;color:var(--text2);margin-top:2px;font-family:var(--font-b)}
.inv-mode-group{display:flex;gap:2px;flex-shrink:0}
.inv-mode-btn{height:26px;border-radius:6px;border:0.5px solid var(--border2);background:var(--bg3);font-size:10px;color:var(--text2);cursor:pointer;font-family:var(--font-b);padding:0 8px;white-space:nowrap}
.inv-mode-btn.act{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.inv-gear-btn{width:30px;height:30px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}

/* Config sheet */
.inv-cfg-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:80;opacity:0;pointer-events:none;transition:opacity .25s}
.inv-cfg-overlay.open{opacity:1;pointer-events:all}
.inv-cfg-sheet{position:absolute;bottom:0;left:0;right:0;background:var(--bg1);border-radius:20px 20px 0 0;border-top:0.5px solid var(--border);padding:20px 18px 32px;z-index:81;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1)}
.inv-cfg-sheet.open{transform:translateY(0)}
.inv-cfg-sheet-handle{width:36px;height:4px;background:var(--border2);border-radius:2px;margin:0 auto 18px}
.inv-cfg-sheet-title{font-family:var(--font-h);font-size:16px;font-weight:700;color:var(--text0);margin-bottom:16px;text-align:center}
.inv-cfg-field-grp{margin-bottom:12px}
.inv-cfg-field-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px}
.inv-cfg-field{height:46px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:9px;padding:0 13px;font-size:16px;font-family:var(--font-h);font-weight:600;color:var(--text0);outline:none;width:100%;transition:border-color .2s}
.inv-cfg-field:focus{border-color:var(--green)}
.inv-cfg-formula{background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:10px 13px;font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.5;margin-bottom:12px}
.inv-cfg-formula strong{color:var(--green)}
.inv-cfg-save-btn{width:100%;height:48px;background:var(--green);border:none;border-radius:11px;font-size:14px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h)}
.inv-cfg-save-btn:disabled{opacity:.45}
.inv-cfg-err{font-size:12px;color:var(--red);font-family:var(--font-b);text-align:center;margin-bottom:8px}

/* Alert */
.inv-alert{margin:0 14px 8px;border-radius:12px;padding:10px 13px;font-size:12px;font-family:var(--font-b);line-height:1.5;background:var(--amber-bg);border:0.5px solid var(--amber-border);color:var(--amber)}

/* Spinner */
.spin{width:28px;height:28px;border:2.5px solid var(--border2);border-top-color:var(--green);border-radius:50%;animation:spin .7s linear infinite;margin:auto}
.spin-sm{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;

/* ════════════════════════ HELPERS ════════════════════════ */

function computeL(pid, full, partial) {
  const cfg = _configs[pid];
  if (!cfg || cfg.mode !== 'kg_to_l') return 0;
  const { emptyTareKg: e, fullTareKg: f, bottleVolL: v } = cfg;
  const diff    = (f - e) || 1;
  const fullL   = (full || 0) * v;
  const partialL = Math.max(0, ((parseFloat(partial) || 0) - e) / diff * v);
  return Math.max(0, fullL + partialL);
}

function modeOf(pid) { return _configs[pid]?.mode || 'sht'; }

function isCounted(pid) {
  const c = _counts[pid] || {};
  const m = modeOf(pid);
  if (m === 'kg_to_l') return (c.full || 0) > 0 || (c.partial || '') !== '';
  if (m === 'kg')      return (c.kg || '') !== '';
  return (c.sht || 0) > 0;
}

function getResult(pid) {
  const c = _counts[pid] || {};
  const m = modeOf(pid);
  if (m === 'kg_to_l') return computeL(pid, c.full || 0, c.partial || '');
  if (m === 'kg')      return parseFloat(c.kg) || 0;
  return (c.sht || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
}

function openSession() {
  return _sessions.find(s => s.status === 'open') || null;
}

function nextScheduled() {
  const now = Date.now();
  return _sessions
    .filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
}

function re() {
  const el = document.getElementById('inv-root');
  if (el) el.innerHTML = buildPage();
  bindLiveInputs();
}

/* ════════════════════════ LIVE INPUT BINDING ════════════════════════ */
// After each re() we rebind input events without full re-render
function bindLiveInputs() {
  document.querySelectorAll('[data-live-inp]').forEach(inp => {
    inp.oninput = e => {
      const pid  = e.target.dataset.pid;
      const kind = e.target.dataset.liveInp;
      if (!_counts[pid]) _counts[pid] = {};
      _counts[pid][kind] = e.target.value;
      updateConvDisplay(pid);
    };
  });
}

function updateConvDisplay(pid) {
  const c   = _counts[pid] || {};
  const res = computeL(pid, c.full || 0, c.partial || '');
  const el  = document.getElementById(`inv-conv-res-${pid}`);
  if (el) el.textContent = res.toFixed(3);
}

/* ════════════════════════ API ════════════════════════ */

async function loadAll() {
  _loading = true; _error = ''; re();
  try {
    const h = { Authorization: `Bearer ${_token}` };
    const [sessRes, balRes, cfgRes] = await Promise.all([
      fetch(`${API}/api/inventory/sessions?venueId=${_venueId}`, { headers: h }),
      fetch(`${API}/api/pos/balance/${_venueId}`, { headers: h }),
      fetch(`${API}/api/inventory/config?venueId=${_venueId}`, { headers: h }),
    ]);

    if (sessRes.ok) {
      const d = await sessRes.json();
      _sessions = d.sessions || [];
    }

    if (balRes.ok) {
      const d = await balRes.json();
      _balance = [];
      for (const store of (d.stores || [])) {
        for (const item of (store.items || [])) {
          if (item.name && !item.name.match(/^[0-9a-f-]{36}$/i)) {
            if (!_balance.find(x => x.id === item.id)) _balance.push(item);
          }
        }
      }
    }

    if (cfgRes.ok) {
      const d = await cfgRes.json();
      _configs = {};
      for (const cfg of (d.configs || [])) _configs[cfg.productId] = cfg;
    }

    // Якщо є відкрита сесія — завантажуємо збережені позиції
    const os = openSession();
    if (os) {
      const itemsRes = await fetch(`${API}/api/inventory/sessions/${os.id}/items`, { headers: h });
      if (itemsRes.ok) {
        const d = await itemsRes.json();
        for (const item of (d.items || [])) {
          const m = item.method;
          if (!_counts[item.productId]) {
            if (m === 'kg_to_l') _counts[item.productId] = { full: 0, partial: '' };
            else if (m === 'kg') _counts[item.productId] = { kg: item.countedQty ? String(item.countedQty) : '' };
            else                 _counts[item.productId] = { sht: item.countedQty || 0 };
          }
        }
      }
    }
  } catch (err) {
    _error = err.message;
  }
  _loading = false; re();
}

async function scheduleSession() {
  if (!_schedDate) return;
  _saving = true; re();
  try {
    const res = await fetch(`${API}/api/inventory/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ venueId: _venueId, scheduledAt: _schedDate }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);
    _sessions.unshift(d.session);
    _showSchedForm = false; _schedDate = '';
  } catch (err) {
    _error = err.message;
  }
  _saving = false; re();
}

async function changeStatus(sessionId, status) {
  try {
    const res = await fetch(`${API}/api/inventory/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);
    const idx = _sessions.findIndex(s => s.id === sessionId);
    if (idx >= 0) _sessions[idx] = { ..._sessions[idx], ...d.session };
  } catch (err) {
    _error = err.message;
  }
  re();
}

async function deleteSession(sessionId) {
  try {
    await fetch(`${API}/api/inventory/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${_token}` },
    });
    _sessions = _sessions.filter(s => s.id !== sessionId);
  } catch (err) {
    _error = err.message;
  }
  re();
}

async function submitInventory() {
  const os = openSession();
  if (!os) return;
  _saving = true; re();
  try {
    const items = _balance.map(p => {
      const m          = modeOf(p.id);
      const countedQty = getResult(p.id);
      const sysQty     = p.amount || 0;
      return {
        productId:   p.id,
        productName: p.name,
        countedQty,
        systemQty:   sysQty,
        fillPct:     sysQty > 0 ? Math.round(countedQty / sysQty * 100) : 0,
        method:      m,
      };
    });

    const saveRes = await fetch(`${API}/api/inventory/sessions/${os.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ items }),
    });
    if (!saveRes.ok) throw new Error('Помилка збереження позицій');

    await changeStatus(os.id, 'done');
    _submitted = true; _counts = {};
  } catch (err) {
    _error = err.message;
  }
  _saving = false; re();
}

async function saveConfig() {
  if (!_configPid) return;
  _cfgSaving = true; _cfgError = ''; re();
  try {
    const res = await fetch(`${API}/api/inventory/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ venueId: _venueId, productId: _configPid, ..._configDraft }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);
    _configs[_configPid] = d.config;
    _configPid = null;
  } catch (err) {
    _cfgError = err.message;
  }
  _cfgSaving = false; re();
}

async function quickMode(pid, mode) {
  _configs[pid] = { ...(_configs[pid] || {}), mode, productId: pid, venueId: _venueId };
  re();
  try {
    await fetch(`${API}/api/inventory/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ venueId: _venueId, productId: pid, mode,
        emptyTareKg: _configs[pid]?.emptyTareKg || 0,
        fullTareKg:  _configs[pid]?.fullTareKg  || 0,
        bottleVolL:  _configs[pid]?.bottleVolL  || 0,
      }),
    });
  } catch {}
}

/* ════════════════════════ BUILD PAGE ════════════════════════ */

function buildPage() {
  if (_loading) {
    return `<div class="inv-wrap">${CSS}<div style="flex:1;display:flex;align-items:center;justify-content:center;padding-top:80px"><div class="spin"></div></div></div>`;
  }
  return `
    ${CSS}
    <div class="inv-wrap">
      ${_role === 'manager' ? roleTabs() : ''}
      <div class="inv-scroll" id="inv-scroll">
        ${_view === 'mgr' ? buildMgr() : buildBar()}
      </div>
      ${configSheetHTML()}
    </div>
  `;
}

function roleTabs() {
  return `
    <div class="inv-role-tabs">
      <button class="inv-rtab${_view === 'bar' ? ' act' : ''}" data-a="tab-bar">Рахунок</button>
      <button class="inv-rtab${_view === 'mgr' ? ' act' : ''}" data-a="tab-mgr">Менеджер</button>
    </div>
  `;
}

/* ── BAR VIEW ── */

function buildBar() {
  const os = openSession();

  if (_submitted) {
    return `
      <div class="inv-locked-center">
        <div class="inv-lock-icon" style="background:var(--green-bg);border-color:var(--green-border)">
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="inv-locked-title">Інвентаризацію завершено</div>
        <div class="inv-locked-sub">Результати збережено. Дякуємо!</div>
      </div>
    `;
  }

  if (!os) {
    const next = nextScheduled();
    return `
      <div class="inv-locked-center">
        <div class="inv-lock-icon">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--text2)" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--text2)" stroke-width="1.5" stroke-linecap="round"/></svg>
          <div class="inv-lock-badge">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="var(--bg1)" stroke-width="2"/><path d="M12 8v4l3 3" stroke="var(--bg1)" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
        </div>
        <div class="inv-locked-title">Немає активної сесії</div>
        <div class="inv-locked-sub">Менеджер відкриє інвентаризацію, коли прийде час</div>
        ${next ? `
          <div class="inv-next-card">
            <div class="inv-next-lbl">Наступна інвентаризація</div>
            <div class="inv-next-date">${fmtDateShort(next.scheduledAt)}</div>
            <div class="inv-next-day">${new Date(next.scheduledAt).toLocaleDateString('uk-UA', { weekday: 'long' })}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Активна сесія
  const counted = _balance.filter(p => isCounted(p.id)).length;
  const total   = _balance.length;
  const pct     = total > 0 ? Math.round(counted / total * 100) : 0;

  return `
    <div class="inv-session-hdr">
      <div class="inv-sh-row">
        <div class="inv-sh-title">Інвентаризація · ${fmtDateShort(os.scheduledAt)}</div>
        <div class="inv-sh-badge"><span class="inv-sh-bdot"></span>Активна</div>
      </div>
      <div class="inv-prog"><div class="inv-prog-fill" style="width:${pct}%"></div></div>
      <div class="inv-sh-nums"><span>${counted} з ${total} підраховано</span><span>${pct}%</span></div>
    </div>

    ${_error ? `<div class="inv-alert">${_error}</div>` : ''}
    ${total === 0 ? `<div style="padding:20px 18px;font-size:13px;color:var(--text2);font-family:var(--font-b);text-align:center">Залишки Syrve не завантажено. Перевірте підключення.</div>` : ''}

    <div class="inv-prod-list">
      ${_balance.map(p => productRowHTML(p)).join('')}
    </div>

    <div class="inv-actions">
      <button class="inv-btn-green" data-a="submit" ${_saving ? 'disabled' : ''}>
        ${_saving
          ? '<div class="spin-sm"></div> Зберігаємо…'
          : '<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Завершити інвентаризацію'
        }
      </button>
    </div>
  `;
}

function productRowHTML(p) {
  const m       = modeOf(p.id);
  const c       = _counts[p.id] || {};
  const counted = isCounted(p.id);
  const isOpen  = _openPid === p.id;
  const result  = getResult(p.id);
  const barColor = counted ? 'var(--green)' : 'var(--bg3)';

  let resultLabel = counted
    ? (m === 'kg_to_l' ? `${result.toFixed(2)} л`
       : m === 'kg'    ? `${result.toFixed(3)} кг`
                       : `${result} шт`)
    : null;

  return `
    <div class="inv-prod${counted ? ' entered' : ''}">
      <div class="inv-prod-row" data-a="toggle-prod" data-pid="${p.id}">
        <div class="inv-pbar" style="background:${barColor}"></div>
        <div class="inv-pcat">${(p.category || '').slice(0, 2) || '📦'}</div>
        <div style="flex:1;min-width:0">
          <div class="inv-pname">${p.name}</div>
          <div class="inv-pmeta">${p.unit || ''} · ${p.category || ''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${counted
            ? `<div class="inv-pqty" style="color:var(--green)">${resultLabel}</div><div class="inv-punit">рахунок</div>`
            : `<div class="inv-pqty" style="color:var(--text2)">${p.amount != null ? p.amount.toFixed(2) : '—'}</div><div class="inv-punit">залишок</div>`
          }
        </div>
        <div class="inv-penter${counted ? ' done' : ''}">
          ${counted
            ? `<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="var(--green)" stroke-width="2" stroke-linecap="round"/></svg>`
            : `<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="var(--text1)" stroke-width="2" stroke-linecap="round"/></svg>`
          }
        </div>
      </div>
      ${isOpen ? inputPanelHTML(p, c, m) : ''}
    </div>
  `;
}

function inputPanelHTML(p, c, m) {
  if (m === 'kg_to_l') {
    const cfg = _configs[p.id] || {};
    const result = computeL(p.id, c.full || 0, c.partial || '');
    const hasCfg = cfg.bottleVolL > 0;
    return `
      <div class="inv-ipanel">
        <div class="inv-inp-lbl">Ціл. пляшки</div>
        <div class="inv-stepper">
          <button class="inv-stbtn" data-a="full-dec" data-pid="${p.id}">−</button>
          <div class="inv-stdisp" id="inv-full-${p.id}">${c.full || 0}</div>
          <button class="inv-stbtn" data-a="full-inc" data-pid="${p.id}">+</button>
        </div>
        <div class="inv-inp-lbl">Залишок на вазі (кг)</div>
        <input class="inv-field" type="number" inputmode="decimal" step="0.001"
          placeholder="${cfg.emptyTareKg ? `мін. ${Number(cfg.emptyTareKg).toFixed(3)} кг (порожня)` : '0.000 кг'}"
          value="${c.partial || ''}"
          data-live-inp="partial" data-pid="${p.id}">
        <div class="inv-conv">
          <div class="inv-conv-formula">
            ${hasCfg
              ? `(${c.full||0} × ${cfg.bottleVolL} л) + формула`
              : `<span style="color:var(--amber)">⚠ Налаштуйте тару в Менеджері</span>`
            }
          </div>
          <div style="text-align:right">
            <div class="inv-conv-result" id="inv-conv-res-${p.id}">${result.toFixed(3)}</div>
            <div class="inv-conv-unit">літрів</div>
          </div>
        </div>
      </div>
    `;
  }

  if (m === 'kg') {
    return `
      <div class="inv-ipanel">
        <div class="inv-inp-lbl">Вага (кг)</div>
        <input class="inv-field" type="number" inputmode="decimal" step="0.001"
          placeholder="0.000 кг" value="${c.kg || ''}"
          data-live-inp="kg" data-pid="${p.id}">
      </div>
    `;
  }

  // sht
  return `
    <div class="inv-ipanel">
      <div class="inv-inp-lbl">Кількість (шт)</div>
      <div class="inv-stepper">
        <button class="inv-stbtn" data-a="sht-dec" data-pid="${p.id}">−</button>
        <div class="inv-stdisp" id="inv-sht-${p.id}">${c.sht || 0}</div>
        <button class="inv-stbtn" data-a="sht-inc" data-pid="${p.id}">+</button>
      </div>
    </div>
  `;
}

/* ── MANAGER VIEW ── */

function buildMgr() {
  return `
    ${_error ? `<div class="inv-alert" style="margin-top:10px">${_error}</div>` : ''}

    <div class="inv-sec">
      Сесії
      <button class="inv-sec-link" data-a="sched-toggle">
        ${_showSchedForm ? '✕ Скасувати' : '+ Запланувати'}
      </button>
    </div>

    ${_showSchedForm ? schedFormHTML() : ''}
    ${sessionsHTML()}

    <div class="inv-sec" style="margin-top:8px">
      Одиниці вимірювання
    </div>
    ${_balance.length === 0
      ? `<div style="padding:8px 18px 16px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Залишки Syrve не завантажено. Підключіть Syrve у Налаштуваннях закладу.</div>`
      : productConfigHTML()
    }
    <div style="height:28px"></div>
  `;
}

function schedFormHTML() {
  return `
    <div class="inv-sched-form">
      <div class="inv-sf-lbl">Дата інвентаризації</div>
      <input class="inv-sf-inp" type="date" id="inv-sched-date"
        value="${_schedDate}" min="${new Date().toISOString().slice(0,10)}">
      <div class="inv-sf-row">
        <button class="inv-sf-cancel" data-a="sched-toggle">Скасувати</button>
        <button class="inv-sf-save" data-a="sched-save" ${_saving ? 'disabled' : ''}>
          ${_saving ? '…' : 'Запланувати'}
        </button>
      </div>
    </div>
  `;
}

function sessionsHTML() {
  if (_sessions.length === 0) {
    return `<div style="padding:0 18px 12px;font-size:13px;color:var(--text2);font-family:var(--font-b)">Сесій ще немає. Заплануйте першу.</div>`;
  }
  return `
    <div class="inv-sess-list">
      ${_sessions.slice(0, 10).map(s => sessionCardHTML(s)).join('')}
    </div>
  `;
}

function sessionCardHTML(s) {
  const badge = {
    scheduled: `<span class="inv-badge inv-badge-sched">Заплановано</span>`,
    open:      `<span class="inv-badge inv-badge-open">● Активна</span>`,
    done:      `<span class="inv-badge inv-badge-done">✓ Завершена</span>`,
    cancelled: `<span class="inv-badge inv-badge-done">Скасована</span>`,
  }[s.status] || '';

  let btn = '';
  if (s.status === 'scheduled') {
    btn = `
      <button class="inv-sess-btn" data-a="sess-open" data-sid="${s.id}">Відкрити</button>
      <button class="inv-sess-btn danger" data-a="sess-delete" data-sid="${s.id}">✕</button>
    `;
  } else if (s.status === 'open') {
    btn = `<button class="inv-sess-btn" data-a="tab-bar">→ Рахунок</button>`;
  }

  return `
    <div class="inv-sess-item">
      <div style="flex:1;min-width:0">
        <div class="inv-sess-date">${fmtDate(s.scheduledAt)}</div>
        <div class="inv-sess-who">${s.user?.name || ''}</div>
      </div>
      ${badge}
      ${btn}
    </div>
  `;
}

function productConfigHTML() {
  return `
    <div class="inv-cfg-list">
      ${_balance.map(p => {
        const m   = modeOf(p.id);
        const cfg = _configs[p.id];
        const hasGear = m === 'kg_to_l';
        return `
          <div class="inv-cfg-row">
            <div style="flex:1;min-width:0">
              <div class="inv-cfg-name">${p.name}</div>
              <div class="inv-cfg-sub">${p.unit || ''} · ${p.category || ''}</div>
            </div>
            <div class="inv-mode-group">
              <button class="inv-mode-btn${m === 'kg_to_l' ? ' act' : ''}"
                data-a="mode-set" data-pid="${p.id}" data-mode="kg_to_l">кг→л</button>
              <button class="inv-mode-btn${m === 'kg' ? ' act' : ''}"
                data-a="mode-set" data-pid="${p.id}" data-mode="kg">кг</button>
              <button class="inv-mode-btn${m === 'sht' ? ' act' : ''}"
                data-a="mode-set" data-pid="${p.id}" data-mode="sht">шт</button>
            </div>
            ${hasGear ? `
              <button class="inv-gear-btn" data-a="cfg-open" data-pid="${p.id}" title="Налаштувати тару">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="var(--text2)" stroke-width="1.5"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="var(--text2)" stroke-width="1.5"/>
                </svg>
              </button>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ── CONFIG SHEET ── */

function configSheetHTML() {
  const isOpen = _configPid !== null;
  const p      = _balance.find(x => x.id === _configPid);
  const cfg    = _configs[_configPid] || {};

  const eKg  = _configDraft.emptyTareKg !== undefined ? _configDraft.emptyTareKg : (cfg.emptyTareKg || '');
  const fKg  = _configDraft.fullTareKg  !== undefined ? _configDraft.fullTareKg  : (cfg.fullTareKg  || '');
  const vL   = _configDraft.bottleVolL  !== undefined ? _configDraft.bottleVolL  : (cfg.bottleVolL  || '');

  const eNum = parseFloat(eKg) || 0;
  const fNum = parseFloat(fKg) || 0;
  const vNum = parseFloat(vL)  || 0;
  const diff = (fNum - eNum) || 1;
  const exKg = eNum + diff * 0.5;
  const exL  = vNum > 0 ? ((exKg - eNum) / diff * vNum) : 0;

  return `
    <div class="inv-cfg-overlay${isOpen ? ' open' : ''}" data-a="cfg-close"></div>
    <div class="inv-cfg-sheet${isOpen ? ' open' : ''}">
      <div class="inv-cfg-sheet-handle"></div>
      <div class="inv-cfg-sheet-title">${p ? p.name : ''}</div>

      <div class="inv-cfg-field-grp">
        <div class="inv-cfg-field-lbl">Порожня тара (кг)</div>
        <input class="inv-cfg-field" type="number" inputmode="decimal" step="0.001"
          id="inv-cfg-empty" placeholder="напр. 0.420" value="${eKg}">
      </div>
      <div class="inv-cfg-field-grp">
        <div class="inv-cfg-field-lbl">Повна тара (кг)</div>
        <input class="inv-cfg-field" type="number" inputmode="decimal" step="0.001"
          id="inv-cfg-full" placeholder="напр. 1.150" value="${fKg}">
      </div>
      <div class="inv-cfg-field-grp">
        <div class="inv-cfg-field-lbl">Об'єм повної пляшки (л)</div>
        <input class="inv-cfg-field" type="number" inputmode="decimal" step="0.001"
          id="inv-cfg-vol" placeholder="напр. 0.700" value="${vL}">
      </div>

      ${vNum > 0 ? `
        <div class="inv-cfg-formula">
          Формула: <code>(факт − ${eNum.toFixed(3)}) ÷ (${fNum.toFixed(3)} − ${eNum.toFixed(3)}) × ${vNum.toFixed(3)}</code><br>
          Приклад: ${exKg.toFixed(3)} кг → <strong>${exL.toFixed(3)} л</strong>
        </div>
      ` : ''}

      ${_cfgError ? `<div class="inv-cfg-err">${_cfgError}</div>` : ''}

      <button class="inv-cfg-save-btn" data-a="cfg-save" ${_cfgSaving ? 'disabled' : ''}>
        ${_cfgSaving ? 'Зберігаємо…' : 'Зберегти'}
      </button>
    </div>
  `;
}

/* ════════════════════════ EVENTS ════════════════════════ */

function on(e) {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a   = t.dataset.a;
  const pid = t.dataset.pid;
  const sid = t.dataset.sid;

  if (a === 'tab-bar') { _view = 'bar'; re(); return; }
  if (a === 'tab-mgr') { _view = 'mgr'; re(); return; }

  /* ── BAR: accordion ── */
  if (a === 'toggle-prod') {
    _openPid = _openPid === pid ? null : pid;
    if (_openPid && !_counts[pid]) {
      const m = modeOf(pid);
      if (m === 'kg_to_l') _counts[pid] = { full: 0, partial: '' };
      else if (m === 'kg') _counts[pid] = { kg: '' };
      else                 _counts[pid] = { sht: 0 };
    }
    re(); return;
  }

  /* ── BAR: steppers ── */
  if (a === 'full-inc') {
    if (!_counts[pid]) _counts[pid] = { full: 0, partial: '' };
    _counts[pid].full = (_counts[pid].full || 0) + 1;
    const el = document.getElementById(`inv-full-${pid}`);
    if (el) el.textContent = _counts[pid].full;
    updateConvDisplay(pid);
    return;
  }
  if (a === 'full-dec') {
    if (!_counts[pid]) _counts[pid] = { full: 0, partial: '' };
    _counts[pid].full = Math.max(0, (_counts[pid].full || 0) - 1);
    const el = document.getElementById(`inv-full-${pid}`);
    if (el) el.textContent = _counts[pid].full;
    updateConvDisplay(pid);
    return;
  }
  if (a === 'sht-inc') {
    if (!_counts[pid]) _counts[pid] = { sht: 0 };
    _counts[pid].sht = (_counts[pid].sht || 0) + 1;
    const el = document.getElementById(`inv-sht-${pid}`);
    if (el) el.textContent = _counts[pid].sht;
    return;
  }
  if (a === 'sht-dec') {
    if (!_counts[pid]) _counts[pid] = { sht: 0 };
    _counts[pid].sht = Math.max(0, (_counts[pid].sht || 0) - 1);
    const el = document.getElementById(`inv-sht-${pid}`);
    if (el) el.textContent = _counts[pid].sht;
    return;
  }

  /* ── BAR: submit ── */
  if (a === 'submit') { submitInventory(); return; }

  /* ── MGR: schedule ── */
  if (a === 'sched-toggle') { _showSchedForm = !_showSchedForm; re(); return; }
  if (a === 'sched-save') {
    const inp = document.getElementById('inv-sched-date');
    _schedDate = inp?.value || '';
    if (!_schedDate) return;
    scheduleSession();
    return;
  }

  /* ── MGR: session actions ── */
  if (a === 'sess-open')   { if (confirm('Відкрити сесію для рахунку?')) changeStatus(sid, 'open'); return; }
  if (a === 'sess-delete') { if (confirm('Видалити заплановану сесію?')) deleteSession(sid); return; }

  /* ── MGR: mode toggle ── */
  if (a === 'mode-set') { quickMode(pid, t.dataset.mode); return; }

  /* ── MGR: config sheet ── */
  if (a === 'cfg-open') {
    _configPid   = pid;
    const cfg    = _configs[pid] || {};
    _configDraft = {
      mode:        cfg.mode        || 'kg_to_l',
      emptyTareKg: cfg.emptyTareKg != null ? cfg.emptyTareKg : '',
      fullTareKg:  cfg.fullTareKg  != null ? cfg.fullTareKg  : '',
      bottleVolL:  cfg.bottleVolL  != null ? cfg.bottleVolL  : '',
    };
    _cfgError = '';
    re(); return;
  }
  if (a === 'cfg-close') { _configPid = null; re(); return; }
  if (a === 'cfg-save') {
    _configDraft.emptyTareKg = parseFloat(document.getElementById('inv-cfg-empty')?.value) || 0;
    _configDraft.fullTareKg  = parseFloat(document.getElementById('inv-cfg-full')?.value)  || 0;
    _configDraft.bottleVolL  = parseFloat(document.getElementById('inv-cfg-vol')?.value)   || 0;
    saveConfig();
    return;
  }
}

/* ════════════════════════ EXPORTS ════════════════════════ */

export const render = () => {
  _submitted    = false;
  _openPid      = null;
  _showSchedForm = false;
  _error        = '';
  return `<div id="inv-root" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>`;
};

export const init = async (container) => {
  _venueId = state.venueId || localStorage.getItem('barops_venueId');
  _token   = state.token   || localStorage.getItem('barops_token');
  _role    = state.role    || localStorage.getItem('barops_role');
  _view    = _role === 'manager' ? 'mgr' : 'bar';

  container.addEventListener('click',   on);
  container.addEventListener('change',  on);

  await loadAll();
};

export const cleanup = (container) => {
  container.removeEventListener('click',   on);
  container.removeEventListener('change',  on);
};
