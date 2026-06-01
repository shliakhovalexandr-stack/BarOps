/* ============================================================
   BarOps — pages/excise.js
   Акцизні марки: OCR + Checkbox ПРРО перевірка (in-app)
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

// ── state ────────────────────────────────────────────────────
let _venueId, _token, _role, _userName;
let _tab       = 'scan';         // 'scan' | 'list'
let _scanStep  = 'idle';         // 'idle'|'preview'|'scanning'|'done'|'failed'|'manual'
let _photoFile = null;
let _photoUrl  = null;
let _result    = null;           // { code, id } | null
let _failMsg   = '';
let _manualCode = '';

let _productName = '';

let _marks      = [];
let _marksDate  = '';
let _loadingMarks = false;
let _verifying  = false;
let _verifyResult = null;        // { passed, failed, total, receiptsChecked } | null
let _deletingIds  = new Set();

let _pickerOpen  = false;
let _pickerYear  = 0;
let _pickerMonth = 0;            // 1-12

let _cbShow    = false;          // settings panel visible
let _cbLogin   = '';
let _cbPassword = '';
let _cbPin     = '';
let _cbLicKey  = '';
let _cbSaving  = false;
let _cbSaved   = false;

// Вибір закладу (підприємця) для налаштування каси — лише для системного менеджера
let _cbVenues   = [];            // [{id, name}]
let _cbVenueId  = '';            // обраний у меню заклад
let _cbVenueName = '';
let _cbVenuesLoaded = false;
let _cbVenueDdOpen  = false;     // дропдаун вибору закладу

function isSysMgr() { return _role === 'admin'; }
// Заклад, до якого застосовуються операції каси (для адміна — обраний у меню, інакше поточний)
function cbVenueId() { return (isSysMgr() && _cbVenueId) ? _cbVenueId : _venueId; }

// ── helpers ───────────────────────────────────────────────────
function hdrs() {
  return { Authorization: `Bearer ${_token}` };
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayKyiv() {
  const kyiv = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return kyiv.toISOString().slice(0, 10);
}

function isMgr() {
  return ['admin', 'manager', 'director'].includes(_role);
}

// ── data ──────────────────────────────────────────────────────
async function loadMarks(date) {
  _loadingMarks = true; re();
  try {
    const d = date || _marksDate || todayKyiv();
    const res = await fetch(`${API}/api/excise/marks?venueId=${_venueId}&date=${d}`, { headers: hdrs() });
    if (res.ok) {
      const data = await res.json();
      _marks     = data.marks || [];
      _marksDate = data.date  || d;
    }
  } catch {}
  _loadingMarks = false; re();
}

async function loadCbSettings() {
  try {
    const res = await fetch(`${API}/api/excise/venue/${cbVenueId()}/checkbox`, { headers: hdrs() });
    if (res.ok) {
      const d = await res.json();
      _cbLogin    = d.login      || '';
      _cbPassword = d.password   || '';
      _cbPin      = d.pin        || '';
      _cbLicKey   = d.licenseKey || '';
    }
  } catch {}
}

// Список закладів мережі для дропдауна (тільки системний менеджер)
async function loadCbVenues() {
  if (_cbVenuesLoaded) return;
  try {
    const res = await fetch(`${API}/api/auth/venues`, { headers: hdrs() });
    const d = await res.json();
    _cbVenues = (d.venues || []).map(v => ({ id: v.id, name: v.name }));
    _cbVenuesLoaded = true;
    if (!_cbVenueId) {
      const cur = _cbVenues.find(v => v.id === _venueId) || _cbVenues[0];
      if (cur) { _cbVenueId = cur.id; _cbVenueName = cur.name; }
    }
  } catch {}
}

async function doVerify() {
  _verifying = true; _verifyResult = null; re();
  try {
    const res = await fetch(`${API}/api/excise/verify/${_venueId}?date=${_marksDate}`, {
      method: 'POST', headers: hdrs(),
    });
    const d = await res.json();
    if (res.ok) {
      _verifyResult = d;
      await loadMarks(_marksDate);
    } else {
      _verifyResult = { error: d.error || 'Помилка перевірки' };
    }
  } catch (e) {
    _verifyResult = { error: 'Не вдалося підключитися до сервера' };
  }
  _verifying = false; re();
}

async function doDeleteMark(id) {
  _deletingIds.add(id); re();
  try {
    const res = await fetch(`${API}/api/excise/mark/${id}`, { method: 'DELETE', headers: hdrs() });
    if (res.ok) {
      _marks = _marks.filter(m => m.id !== id);
      _verifyResult = null;
    }
  } catch {}
  _deletingIds.delete(id); re();
}

async function doSaveCb() {
  _cbSaving = true; re();
  try {
    // Якщо пароль не введено — для тестових акаунтів дублюємо логін
    const password = (_cbPassword || '').trim() || _cbLogin;
    const res = await fetch(`${API}/api/excise/venue/${cbVenueId()}/checkbox`, {
      method: 'PATCH',
      headers: { ...hdrs(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: _cbLogin, password, pin: _cbPin, licenseKey: _cbLicKey }),
    });
    _cbSaved = res.ok;
  } catch {}
  _cbSaving = false; re();
}

// ── scan flow ─────────────────────────────────────────────────
function openCamera() {
  document.getElementById('exc-cam-inp')?.click();
}
function openGallery() {
  document.getElementById('exc-gal-inp')?.click();
}

function handleFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoFile = file;
  _photoUrl  = URL.createObjectURL(file);
  _scanStep  = 'preview';
  _result    = null; _failMsg = '';
  setTimeout(() => { input.value = ''; }, 100);
  re();
}

async function doScan() {
  if (!_photoFile) return;
  _scanStep = 'scanning'; re();

  try {
    const pnInp = document.getElementById('exc-product-name');
    if (pnInp) _productName = pnInp.value.trim();
    const form = new FormData();
    form.append('photo', _photoFile);
    form.append('productName', _productName);
    const res  = await fetch(`${API}/api/excise/scan`, { method: 'POST', headers: hdrs(), body: form });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Помилка сервера');

    if (data.recognized) {
      _result   = { code: data.code, id: data.id };
      _scanStep = 'done';
    } else {
      _failMsg  = data.message || 'Марку не розпізнано';
      _scanStep = 'failed';
    }
  } catch (e) {
    _failMsg  = e.message || 'Помилка. Спробуйте ще раз.';
    _scanStep = 'failed';
  }
  re();
}

async function doManualSave() {
  const inp  = document.getElementById('exc-manual');
  const code = (inp?.value || _manualCode).trim().toUpperCase().replace(/\s/g, '');
  _manualCode = code;
  if (!code || code.length < 6) {
    _failMsg  = 'Введіть код акцизної марки (мінімум 6 символів)';
    _scanStep = 'failed';
    re(); return;
  }
  _scanStep = 'scanning'; re();
  try {
    const pnInp = document.getElementById('exc-product-name');
    if (pnInp) _productName = pnInp.value.trim();
    const res  = await fetch(`${API}/api/excise/manual`, {
      method: 'POST',
      headers: { ...hdrs(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, productName: _productName }),
    });
    const data = await res.json();
    if (res.ok) {
      _result   = { code: data.code, id: data.id };
      _scanStep = 'done';
    } else {
      _failMsg  = data.error || 'Помилка';
      _scanStep = 'failed';
    }
  } catch (e) {
    _failMsg  = 'Помилка. Спробуйте ще раз.';
    _scanStep = 'failed';
  }
  re();
}

function resetScan() {
  if (_photoUrl) URL.revokeObjectURL(_photoUrl);
  _photoFile = null; _photoUrl = null;
  _scanStep  = 'idle'; _result = null; _failMsg = '';
  _manualCode = ''; _productName = '';
  re();
}

function prevDay() {
  if (_loadingMarks) return;
  _verifyResult = null;
  loadMarks(shiftDate(_marksDate || todayKyiv(), -1));
}

function nextDay() {
  if (_loadingMarks) return;
  const today = todayKyiv();
  if (_marksDate >= today) return;
  _verifyResult = null;
  loadMarks(shiftDate(_marksDate, 1));
}

function openDatePicker() {
  const d = _marksDate || todayKyiv();
  const [y, m] = d.split('-').map(Number);
  _pickerYear  = y;
  _pickerMonth = m;
  _pickerOpen  = true;
  re();
}

function closePicker() {
  _pickerOpen = false;
  re();
}

function pickerPrevMonth() {
  if (_pickerMonth === 1) { _pickerMonth = 12; _pickerYear--; }
  else _pickerMonth--;
  re();
}

function pickerNextMonth() {
  const [ty, tm] = todayKyiv().split('-').map(Number);
  if (_pickerYear === ty && _pickerMonth === tm) return;
  if (_pickerMonth === 12) { _pickerMonth = 1; _pickerYear++; }
  else _pickerMonth++;
  re();
}

function pickerSelectDay(dateStr) {
  _pickerOpen   = false;
  _verifyResult = null;
  loadMarks(dateStr);
}

function buildDatePicker() {
  const today  = todayKyiv();
  const [ty, tm, td] = today.split('-').map(Number);
  const y = _pickerYear, m = _pickerMonth;

  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow    = new Date(y, m - 1, 1).getDay(); // 0=Sun
  const offset      = (firstDow + 6) % 7;             // Mon-first

  const monthNames = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                      'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];

  const selected = _marksDate || today;
  const isCurrentMonth = y === ty && m === tm;

  let cells = '';
  for (let i = 0; i < offset; i++) cells += `<div class="exc-cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isFuture   = ds > today;
    const isSelected = ds === selected;
    const isToday    = ds === today;
    const cls = 'exc-cal-cell' +
      (isFuture ? ' future' : isSelected ? ' selected' : isToday ? ' today' : '');
    cells += `<div class="${cls}" ${isFuture ? '' : `onclick="window.__exc.pickerSelectDay('${ds}')"`}>${d}</div>`;
  }

  return `<div class="exc-picker-overlay" onclick="window.__exc.closePicker()">
    <div class="exc-picker-sheet" onclick="event.stopPropagation()">
      <div class="exc-picker-handle"></div>
      <div class="exc-picker-header">
        <button class="exc-nav-btn" onclick="window.__exc.pickerPrevMonth()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="exc-picker-month">${monthNames[m - 1]} ${y}</div>
        <button class="exc-nav-btn" onclick="window.__exc.pickerNextMonth()" ${isCurrentMonth ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div class="exc-cal-week">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div>
        <div style="color:var(--amber,#c98a00)">Сб</div>
        <div style="color:var(--red,#e85555)">Нд</div>
      </div>
      <div class="exc-cal-grid">${cells}</div>
      <button class="exc-cta-sec" onclick="window.__exc.closePicker()" style="margin-top:16px">Закрити</button>
    </div>
  </div>`;
}

// ── render ────────────────────────────────────────────────────
function re() {
  if (state.route !== 'excise') return;
  const el = document.getElementById('exc-root');
  if (el) el.innerHTML = buildPage();
}

const CSS = `<style id="exc-css">
.exc-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.exc-topbar{display:flex;align-items:center;gap:12px;padding:8px 16px 0;flex-shrink:0}
.exc-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.exc-back:active{background:var(--bg3)}
.exc-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);flex:1}
.exc-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}

/* Tab bar */
.exc-tabs{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin:10px 16px 0;border-radius:12px;overflow:hidden;flex-shrink:0}
.exc-tab{background:var(--bg1);padding:9px;text-align:center;font-size:12px;font-family:var(--font-b);font-weight:500;color:var(--text2);cursor:pointer;transition:all .15s}
.exc-tab.act{background:var(--bg2);color:var(--text0);font-weight:600}

/* Scroll */
.exc-scroll{overflow-y:auto;flex:1;padding:16px 16px 32px}.exc-scroll::-webkit-scrollbar{width:0}

/* Hero card */
.exc-hero{background:var(--bg1);border:0.5px solid var(--border);border-radius:18px;padding:24px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;margin-bottom:16px}
.exc-hero-icon{width:64px;height:64px;border-radius:18px;background:var(--green-bg,#1a3320);border:0.5px solid var(--green-border,#2d5c3a);display:flex;align-items:center;justify-content:center}
.exc-hero-title{font-family:var(--font-h);font-size:17px;font-weight:600;color:var(--text0);margin-bottom:2px}
.exc-hero-desc{font-size:12px;color:var(--text2);line-height:1.5}

/* Buttons */
.exc-btn-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.exc-btn{padding:16px;border-radius:14px;border:0.5px solid var(--border);background:var(--bg2);display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:500;color:var(--text0);transition:all .15s}
.exc-btn:active{transform:scale(.97);background:var(--bg3)}
.exc-cta{height:54px;border-radius:14px;border:none;background:var(--green);color:#000;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:10px}
.exc-cta:active{opacity:.85}
.exc-cta:disabled{opacity:.45;cursor:not-allowed}
.exc-cta-sec{height:44px;border-radius:12px;border:0.5px solid var(--border);background:var(--bg2);color:var(--text0);font-size:13px;font-weight:500;cursor:pointer;width:100%;margin-bottom:8px}
.exc-cta-sec:active{background:var(--bg3)}

/* Photo preview */
.exc-preview{margin-bottom:14px;border-radius:16px;overflow:hidden;border:0.5px solid var(--border);position:relative;background:var(--bg2)}
.exc-preview img{width:100%;display:block;max-height:260px;object-fit:cover}
.exc-preview-btn{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.6);border:0.5px solid rgba(255,255,255,.15);border-radius:14px;padding:5px 12px;font-size:11px;color:#fff;cursor:pointer;font-family:var(--font-b)}

/* Result cards */
.exc-result-card{border-radius:16px;padding:20px;text-align:center;margin-bottom:14px}
.exc-result-card.ok{background:var(--green-bg,#1a3320);border:0.5px solid var(--green-border,#2d5c3a)}
.exc-result-card.fail{background:var(--red-bg,#2a1212);border:0.5px solid var(--red-border,#5c2d2d)}
.exc-result-icon{font-size:36px;margin-bottom:8px}
.exc-result-code{font-family:var(--font-h);font-size:28px;font-weight:700;color:var(--green);letter-spacing:.04em;margin-bottom:4px}
.exc-result-label{font-size:11px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em}
.exc-result-photo{width:100%;margin-top:14px;border-radius:12px;display:block;max-height:300px;object-fit:contain;background:#000}
.exc-result-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:8px}
.exc-result-fail-title{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--red);margin-bottom:6px}
.exc-result-fail-msg{font-size:12px;color:var(--text2);font-family:var(--font-b);line-height:1.5}

/* Spinner */
.exc-spin-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:14px;padding:60px 20px}
.exc-spinner{width:40px;height:40px;border-radius:50%;border:3px solid var(--bg3);border-top-color:var(--amber,#c98a00);animation:excSpin .7s linear infinite}
@keyframes excSpin{to{transform:rotate(360deg)}}
.exc-spin-title{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0)}
.exc-spin-sub{font-size:12px;color:var(--text2);font-family:var(--font-b)}

/* Manual entry */
.exc-manual-inp{width:100%;box-sizing:border-box;height:52px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;color:var(--text0);font-size:20px;font-family:var(--font-h);font-weight:600;text-align:center;letter-spacing:.08em;outline:none;margin-bottom:10px}
.exc-manual-inp:focus{border-color:var(--green)}

/* KPI grid */
.exc-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:14px;overflow:hidden;margin-bottom:14px;border:0.5px solid var(--border)}
.exc-kpi{background:var(--bg1);padding:12px 8px;text-align:center}
.exc-kpi-val{font-family:var(--font-h);font-size:18px;font-weight:600;line-height:1}
.exc-kpi-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}

/* Marks list */
.exc-mark-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--border)}
.exc-mark-row:last-child{border-bottom:none}
.exc-mark-code{font-family:var(--font-h);font-size:15px;font-weight:600;color:var(--text0);letter-spacing:.04em}
.exc-mark-meta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.exc-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:600;font-family:var(--font-b);flex-shrink:0}
.exc-badge.found{background:var(--green-bg,#1a3320);color:var(--green);border:0.5px solid var(--green-border,#2d5c3a)}
.exc-badge.not_found{background:var(--red-bg,#2a1212);color:var(--red,#e85555);border:0.5px solid var(--red-border,#5c2d2d)}
.exc-badge.pending{background:var(--bg3);color:var(--text2);border:0.5px solid var(--border)}
.exc-del-btn{width:32px;height:32px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--text2);transition:all .12s}
.exc-del-btn:active{background:var(--red-bg);border-color:var(--red);color:var(--red)}

/* Verify result */
.exc-verify-card{border-radius:14px;padding:14px;margin-bottom:14px}
.exc-verify-card.ok{background:var(--green-bg,#1a3320);border:0.5px solid var(--green-border,#2d5c3a)}
.exc-verify-card.warn{background:var(--red-bg,#2a1212);border:0.5px solid var(--red-border,#5c2d2d)}
.exc-verify-card.err{background:var(--bg2);border:0.5px solid var(--border)}

/* Checkbox settings */
.exc-cb-panel{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;overflow:hidden;margin-top:14px}
.exc-cb-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer}
.exc-cb-head-lbl{font-size:12px;font-weight:600;color:var(--text0);font-family:var(--font-b)}
.exc-cb-head-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.exc-cb-body{padding:12px 14px;border-top:0.5px solid var(--border);display:flex;flex-direction:column;gap:10px}
.exc-cb-field{display:flex;flex-direction:column;gap:4px}
.exc-cb-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);text-transform:uppercase;letter-spacing:.06em}
.exc-cb-inp{height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:0 12px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;width:100%;box-sizing:border-box}
.exc-cb-inp:focus{border-color:var(--green)}
.exc-cb-hint{font-size:10px;color:var(--text2);font-family:var(--font-b);line-height:1.4}
.exc-cb-save{height:36px;border-radius:10px;border:none;background:var(--green);color:#000;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-b);padding:0 16px}
.exc-cb-save:disabled{opacity:.5;cursor:not-allowed}
.exc-cb-save.saved{background:var(--bg3);color:var(--green);border:0.5px solid var(--green)}
.exc-cb-dd{position:relative}
.exc-cb-dd-btn{height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;padding:0 12px;font-size:13px;color:var(--text0);font-family:var(--font-b);cursor:pointer;display:flex;align-items:center;justify-content:space-between}
.exc-cb-dd-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:20;background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 10px 28px rgba(0,0,0,.5);max-height:240px;overflow-y:auto}
.exc-cb-dd-opt{padding:11px 12px;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;border-bottom:0.5px solid var(--border)}
.exc-cb-dd-opt:last-child{border-bottom:none}
.exc-cb-dd-opt:active{background:rgba(255,255,255,.05)}
.exc-cb-dd-opt.sel{background:var(--green-bg,#1a3320);color:var(--green)}

.exc-file{position:fixed;top:-200px;left:-200px;opacity:0;width:1px;height:1px}

/* Custom date picker */
.exc-picker-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:900;display:flex;align-items:flex-end;justify-content:center}
.exc-picker-sheet{background:var(--bg1);border-radius:22px 22px 0 0;padding:0 16px 32px;width:100%;max-width:480px;border:0.5px solid var(--border);border-bottom:none;max-height:85vh;overflow-y:auto}
.exc-picker-handle{width:36px;height:4px;border-radius:2px;background:var(--border);margin:12px auto 16px}
.exc-picker-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.exc-picker-month{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0)}
.exc-cal-week{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:10px;color:var(--text2);font-family:var(--font-b);font-weight:600;text-transform:uppercase;margin-bottom:6px;gap:2px}
.exc-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.exc-cal-cell{height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-family:var(--font-b);color:var(--text0);cursor:pointer;transition:background .1s}
.exc-cal-cell:not(.empty):not(.future):active{background:var(--bg3)}
.exc-cal-cell.empty{cursor:default}
.exc-cal-cell.future{color:var(--border);cursor:not-allowed}
.exc-cal-cell.today{background:var(--bg3);font-weight:600}
.exc-cal-cell.selected{background:var(--green)!important;color:#000!important;font-weight:700}
.exc-date-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.exc-date-lbl{font-size:13px;font-weight:600;color:var(--text0);font-family:var(--font-h)}
.exc-refresh-btn{width:32px;height:32px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2)}
.exc-refresh-btn:active{background:var(--bg3)}
.exc-nav-btn{width:32px;height:32px;border-radius:10px;border:0.5px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text1);font-size:14px;font-weight:600;flex-shrink:0}
.exc-nav-btn:active{background:var(--bg3)}
.exc-nav-btn:disabled{opacity:.35;cursor:not-allowed}
.exc-empty{padding:40px 20px;text-align:center;font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.7}
</style>`;

function buildPage() {
  if (_scanStep === 'scanning') return `${CSS}${buildScanWrap(buildSpinner())}`;

  return `${CSS}
<div class="exc-wrap" id="exc-root-inner">
  <div class="exc-topbar">
    <div class="exc-back" onclick="window.__exc.back()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
    </div>
    <div style="flex:1">
      <div class="exc-title">Акцизні марки</div>
    </div>
  </div>

  <div class="exc-tabs">
    <div class="exc-tab ${_tab === 'scan' ? 'act' : ''}" onclick="window.__exc.setTab('scan')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:4px"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Скан
    </div>
    <div class="exc-tab ${_tab === 'list' ? 'act' : ''}" onclick="window.__exc.setTab('list')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-2px;margin-right:4px"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
      Сьогодні ${_marks.length > 0 ? `<span style="background:var(--green);color:#000;border-radius:6px;padding:1px 5px;font-size:9px;margin-left:4px;font-weight:700">${_marks.length}</span>` : ''}
    </div>
  </div>

  ${_tab === 'scan' ? buildScanTab() : buildListTab()}

  <input class="exc-file" id="exc-cam-inp" type="file" accept="image/*" capture="environment" onchange="window.__exc.handleFile(this)"/>
  <input class="exc-file" id="exc-gal-inp" type="file" accept="image/*" onchange="window.__exc.handleFile(this)"/>
  ${_pickerOpen ? buildDatePicker() : ''}
</div>`;
}

function buildScanWrap(inner) {
  return `${CSS}<div class="exc-wrap"><div class="exc-topbar">
    <div class="exc-back" onclick="window.__exc.back()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>
    <div class="exc-title">Акцизні марки</div>
  </div>${inner}</div>
  <input class="exc-file" id="exc-cam-inp" type="file" accept="image/*" capture="environment" onchange="window.__exc.handleFile(this)"/>
  <input class="exc-file" id="exc-gal-inp" type="file" accept="image/*" onchange="window.__exc.handleFile(this)"/>`;
}

function buildSpinner() {
  return `<div class="exc-spin-wrap">
    <div class="exc-spinner"></div>
    <div class="exc-spin-title">Розпізнаємо марку...</div>
    <div class="exc-spin-sub">Claude Vision аналізує фото</div>
  </div>`;
}

function buildScanTab() {
  if (_scanStep === 'done' && _result) {
    return `<div class="exc-scroll">
      <div class="exc-result-card ok">
        <div class="exc-result-icon">✅</div>
        <div class="exc-result-code">${_result.code}</div>
        <div class="exc-result-label">Серія та номер збережено</div>
        ${_photoUrl ? `<img class="exc-result-photo" src="${_photoUrl}" alt="Фото марки"><div class="exc-result-hint">Звірте код із фото</div>` : ''}
      </div>
      <button class="exc-cta" onclick="window.__exc.resetScan()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Наступна марка
      </button>
      <button class="exc-cta-sec" onclick="window.__exc.setTab('list')">Перейти до списку →</button>
    </div>`;
  }

  if (_scanStep === 'failed') {
    return `<div class="exc-scroll">
      <div class="exc-result-card fail">
        <div class="exc-result-icon">❌</div>
        <div class="exc-result-fail-title">Марку не розпізнано</div>
        <div class="exc-result-fail-msg">${_failMsg}</div>
      </div>
      <button class="exc-cta" onclick="window.__exc.resetScan()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Спробувати ще раз
      </button>
      <button class="exc-cta-sec" onclick="window.__exc.showManual()">Ввести вручну</button>
    </div>`;
  }

  if (_scanStep === 'manual') {
    return `<div class="exc-scroll">
      <div style="margin-bottom:12px">
        <div style="font-family:var(--font-h);font-size:14px;font-weight:600;color:var(--text0);margin-bottom:6px">Введіть код вручну</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.5">Серія та номер з акцизної марки (наприклад: AIZT016199)</div>
      </div>
      <input class="exc-manual-inp" id="exc-manual" type="text" maxlength="12" autocapitalize="characters"
        placeholder="AIZT016199" value="${_manualCode}"
        oninput="window.__exc.manualInput(this.value)"/>
      <input class="exc-manual-inp" id="exc-product-name" type="text" maxlength="80"
        placeholder="Назва товару (необов'язково)" value="${_productName}"
        oninput="window.__exc._pnChange(this.value)" style="margin-top:-4px;margin-bottom:10px"/>
      <button class="exc-cta" onclick="window.__exc.doManualSave()">
        Зберегти
      </button>
      <button class="exc-cta-sec" onclick="window.__exc.resetScan()">Скасувати</button>
    </div>`;
  }

  if (_scanStep === 'preview' && _photoUrl) {
    return `<div class="exc-scroll">
      <div class="exc-preview">
        <img src="${_photoUrl}" alt="Фото марки"/>
        <div class="exc-preview-btn" onclick="window.__exc.openGallery()">Змінити</div>
      </div>
      <input class="exc-manual-inp" id="exc-product-name" type="text" maxlength="80"
        placeholder="Назва товару (необов'язково)" value="${_productName}"
        oninput="window.__exc._pnChange(this.value)" style="margin-bottom:10px"/>
      <button class="exc-cta" onclick="window.__exc.doScan()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        Розпізнати та зберегти
      </button>
      <button class="exc-cta-sec" onclick="window.__exc.resetScan()">Скасувати</button>
    </div>`;
  }

  // idle
  return `<div class="exc-scroll">
    <div class="exc-hero">
      <div class="exc-hero-icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.6">
          <rect x="2" y="6" width="20" height="14" rx="2"/>
          <path d="M16 4l-4 2-4-2"/>
          <path d="M5 10h14M5 14h4"/>
        </svg>
      </div>
      <div>
        <div class="exc-hero-title">Сфоткайте акцизну марку</div>
        <div class="exc-hero-desc">Claude Vision розпізнає код і збереже в базі.<br>О 9:00 менеджер перевіряє в Checkbox ПРРО.</div>
      </div>
    </div>
    <div class="exc-btn-grid">
      <button class="exc-btn" onclick="window.__exc.openCamera()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Камера
      </button>
      <button class="exc-btn" onclick="window.__exc.openGallery()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        Галерея
      </button>
    </div>
    <button class="exc-cta-sec" onclick="window.__exc.showManual()" style="margin-top:4px">
      Ввести код вручну
    </button>
  </div>`;
}

function buildListTab() {
  const today = todayKyiv();
  const isToday = _marksDate === today || !_marksDate;
  const dateLabel = isToday ? 'Сьогодні' : fmtDate(_marksDate);

  const total   = _marks.length;
  const found   = _marks.filter(m => m.checkStatus === 'found').length;
  const notFound = _marks.filter(m => m.checkStatus === 'not_found').length;
  const pending = _marks.filter(m => m.checkStatus === 'pending').length;

  let verifyBlock = '';
  if (_verifyResult) {
    if (_verifyResult.error) {
      verifyBlock = `<div class="exc-verify-card err">
        <div style="font-size:12px;color:var(--text2);font-family:var(--font-b)">❌ ${_verifyResult.error}</div>
      </div>`;
    } else {
      const allOk = _verifyResult.failed.length === 0;
      verifyBlock = `<div class="exc-verify-card ${allOk ? 'ok' : 'warn'}">
        <div style="font-size:13px;font-weight:600;color:${allOk ? 'var(--green)' : 'var(--red)'};font-family:var(--font-h);margin-bottom:4px">
          ${allOk ? '✅ Всі марки в Checkbox!' : `❌ ${_verifyResult.failed.length} марок немає в Checkbox`}
        </div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b)">
          Перевірено ${_verifyResult.total} марок · знайдено ${_verifyResult.passed.length} · чеків: ${_verifyResult.receiptsChecked}
        </div>
      </div>`;
    }
  }

  const marksList = _marks.length === 0
    ? `<div class="exc-empty">Марок ще не скановано${isToday ? ' сьогодні' : ''}<br><span style="font-size:11px">Перейдіть на вкладку Скан і відскануйте першу марку</span></div>`
    : `<div style="border:0.5px solid var(--border);border-radius:14px;overflow:hidden;background:var(--bg1);padding:0 14px">
      ${_marks.map(m => {
        const deleting = _deletingIds.has(m.id);
        const statusMap = {
          found:     { label: '✅ в Checkbox', cls: 'found' },
          not_found: { label: '❌ не знайдено', cls: 'not_found' },
          pending:   { label: '⏳ очікує',     cls: 'pending' },
        };
        const { label, cls } = statusMap[m.checkStatus] || statusMap.pending;
        return `<div class="exc-mark-row">
          <div style="flex:1;min-width:0">
            <div class="exc-mark-code">${m.code}</div>
            ${m.productName ? `<div class="exc-mark-meta" style="color:var(--text1);font-weight:500">${m.productName}</div>` : ''}
            <div class="exc-mark-meta">${m.scannedBy} · ${fmtTime(m.scannedAt)}</div>
          </div>
          <div class="exc-badge ${cls}">${label}</div>
          <button class="exc-del-btn" onclick="window.__exc.deleteMark('${m.id}')" ${deleting ? 'disabled' : ''}>
            ${deleting
              ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
              : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'}
          </button>
        </div>`;
      }).join('')}
    </div>`;

  const cbSettings = isMgr() ? buildCbPanel() : '';

  return `<div class="exc-scroll">
    <div class="exc-date-row">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="exc-nav-btn" onclick="window.__exc.prevDay()" ${_loadingMarks ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="exc-date-lbl" onclick="window.__exc.openDatePicker()" style="cursor:pointer;display:flex;align-items:center;gap:5px">
          ${isToday ? 'Сьогодні' : fmtDate(_marksDate)}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <button class="exc-nav-btn" onclick="window.__exc.nextDay()" ${(isToday || _loadingMarks) ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <button class="exc-refresh-btn" onclick="window.__exc.refreshMarks()" ${_loadingMarks ? 'disabled' : ''}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${_loadingMarks ? 'animation:excSpin .7s linear infinite' : ''}"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
      </button>
    </div>

    ${total > 0 ? `<div class="exc-kpi-row">
      <div class="exc-kpi"><div class="exc-kpi-val">${total}</div><div class="exc-kpi-lbl">Всього</div></div>
      <div class="exc-kpi"><div class="exc-kpi-val" style="color:var(--green)">${found}</div><div class="exc-kpi-lbl">✅ OK</div></div>
      <div class="exc-kpi"><div class="exc-kpi-val" style="color:var(--red,#e85555)">${notFound}</div><div class="exc-kpi-lbl">❌ Немає</div></div>
      <div class="exc-kpi"><div class="exc-kpi-val" style="color:var(--text2)">${pending}</div><div class="exc-kpi-lbl">⏳ Чекає</div></div>
    </div>` : ''}

    ${isMgr() ? `<button class="exc-cta" onclick="window.__exc.verify()" ${_verifying ? 'disabled' : ''} style="margin-bottom:12px">
      ${_verifying
        ? '<span class="exc-spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px"></span> Перевіряємо...'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right:8px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>Перевірити в Checkbox ПРРО'}
    </button>` : ''}

    ${verifyBlock}
    ${marksList}
    ${cbSettings}
  </div>`;
}

function buildCbPanel() {
  const configured = !!_cbLogin || !!_cbPin;
  const sysMgr = isSysMgr();
  const headSub = sysMgr && _cbVenueName
    ? `Заклад: ${_cbVenueName} · ${configured ? '✅ налаштовано' : 'не налаштовано'}`
    : (configured ? '✅ Налаштовано' : 'Не налаштовано — введіть облікові дані');
  return `<div class="exc-cb-panel">
    <div class="exc-cb-head" onclick="window.__exc.toggleCb()">
      <div>
        <div class="exc-cb-head-lbl">⚙️ Checkbox ПРРО</div>
        <div class="exc-cb-head-sub">${headSub}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2" style="transform:rotate(${_cbShow ? 180 : 0}deg);transition:transform .2s"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    ${_cbShow ? `<div class="exc-cb-body">
      ${sysMgr ? `
      <div class="exc-cb-field">
        <div class="exc-cb-lbl">Підприємець / Заклад</div>
        <div class="exc-cb-dd">
          <div class="exc-cb-dd-btn" onclick="window.__exc.toggleCbVenueDd()">
            <span>${_cbVenueName || 'Оберіть заклад'}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="transform:rotate(${_cbVenueDdOpen?180:0}deg);transition:transform .2s"><path d="M3 5l4 4 4-4" stroke="var(--text2)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          ${_cbVenueDdOpen ? `<div class="exc-cb-dd-menu">
            ${_cbVenues.map(v => `<div class="exc-cb-dd-opt ${v.id===_cbVenueId?'sel':''}" onclick="window.__exc.selectCbVenue('${v.id}','${(v.name||'').replace(/'/g,"\\'")}')">${v.name}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>` : ''}
      <div class="exc-cb-field">
        <div class="exc-cb-lbl">Логін касира</div>
        <input class="exc-cb-inp" type="text" placeholder="test_aiw7faxgg" value="${_cbLogin}" id="cb-login" oninput="window.__exc.cbInput()"/>
      </div>
      <div class="exc-cb-field">
        <div class="exc-cb-lbl">Пароль</div>
        <input class="exc-cb-inp" type="text" placeholder="залиште порожнім = логін (тест)" value="${_cbPassword}" id="cb-pass" oninput="window.__exc.cbInput()"/>
        <div class="exc-cb-hint">Для бойової каси — справжній пароль касира. Для тестових акаунтів залиште порожнім.</div>
      </div>
      <div class="exc-cb-field">
        <div class="exc-cb-lbl">PIN-код</div>
        <input class="exc-cb-inp" type="text" placeholder="3162387401" value="${_cbPin}" id="cb-pin" oninput="window.__exc.cbInput()"/>
      </div>
      <div class="exc-cb-field">
        <div class="exc-cb-lbl">License Key (якщо є)</div>
        <input class="exc-cb-inp" type="text" placeholder="5861fee76347f40e23ce09c0" value="${_cbLicKey}" id="cb-lickey" oninput="window.__exc.cbInput()"/>
        <div class="exc-cb-hint">Рекомендований метод для бойових кас: PIN + License Key.</div>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button class="exc-cb-save ${_cbSaved ? 'saved' : ''}" ${_cbSaving ? 'disabled' : ''} onclick="window.__exc.saveCb()">
          ${_cbSaving ? '...' : _cbSaved ? '✓ Збережено' : 'Зберегти'}
        </button>
      </div>
    </div>` : ''}
  </div>`;
}

// ── events ────────────────────────────────────────────────────
export default {
  render() {
    _venueId  = state.venueId || localStorage.getItem('barops_venueId');
    _token    = state.token   || localStorage.getItem('barops_token');
    _role     = (state.role   || localStorage.getItem('barops_role') || '').toLowerCase();
    _userName = state.name    || localStorage.getItem('barops_user') || 'Бармен';

    _tab = 'scan'; _scanStep = 'idle';
    _photoFile = null;
    if (_photoUrl) URL.revokeObjectURL(_photoUrl);
    _photoUrl = null;
    _result = null; _failMsg = ''; _manualCode = '';
    _marks = []; _marksDate = todayKyiv();
    _verifying = false; _verifyResult = null;
    _deletingIds = new Set();
    _pickerOpen = false;
    _cbShow = false; _cbSaved = false; _cbVenueDdOpen = false;
    _cbVenuesLoaded = false; _cbVenues = []; _cbVenueId = ''; _cbVenueName = '';
    _cbLogin = ''; _cbPassword = ''; _cbPin = ''; _cbLicKey = '';

    return `${CSS}<div id="exc-root" style="flex:1;display:flex;flex-direction:column;overflow:hidden">${buildPage()}</div>`;
  },

  init() {
    const root = document.getElementById('exc-root');
    if (!root) return;

    window.__exc = {
      back:        () => navigate('dashboard'),
      setTab:      (t) => { _tab = t; if (t === 'list') loadMarks(_marksDate); re(); },
      openCamera:  openCamera,
      openGallery: openGallery,
      handleFile:  handleFile,
      doScan:      doScan,
      resetScan:   resetScan,
      showManual:  () => { _scanStep = 'manual'; re(); },
      manualInput: (v) => { _manualCode = v; },
      _pnChange:   (v) => { _productName = v; },
      doManualSave: doManualSave,
      refreshMarks:     () => loadMarks(_marksDate),
      prevDay:          prevDay,
      nextDay:          nextDay,
      openDatePicker:   openDatePicker,
      closePicker:      closePicker,
      pickerPrevMonth:  pickerPrevMonth,
      pickerNextMonth:  pickerNextMonth,
      pickerSelectDay:  pickerSelectDay,
      verify:           doVerify,
      deleteMark:   doDeleteMark,
      toggleCb:     async () => {
        _cbShow = !_cbShow;
        _cbVenueDdOpen = false;
        if (_cbShow) {
          if (isSysMgr()) await loadCbVenues();
          await loadCbSettings();
        }
        re();
      },
      toggleCbVenueDd: () => { _cbVenueDdOpen = !_cbVenueDdOpen; re(); },
      selectCbVenue: async (id, name) => {
        _cbVenueId = id; _cbVenueName = name; _cbVenueDdOpen = false; _cbSaved = false;
        await loadCbSettings();   // підвантажити дані каси обраного закладу
        re();
      },
      cbInput:      () => {
        _cbLogin    = document.getElementById('cb-login')?.value  || '';
        _cbPassword = document.getElementById('cb-pass')?.value   || '';
        _cbPin      = document.getElementById('cb-pin')?.value    || '';
        _cbLicKey   = document.getElementById('cb-lickey')?.value || '';
        _cbSaved    = false;
      },
      saveCb: doSaveCb,
    };
  },

  cleanup() {
    if (_photoUrl) { URL.revokeObjectURL(_photoUrl); _photoUrl = null; }
    window.__exc = null;
  },
};
