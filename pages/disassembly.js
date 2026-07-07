/* ============================================================
   BarOps — pages/disassembly.js
   «Розбір» (акт розбору, кухня): 1 вхідний товар → N частин.
   Нативного документа в API Syrve нема — бекенд створює ДВІ чернетки NEW:
   списання входу + прихід частин (тех. контрагент «Внутрішній розбір»),
   бухгалтер проводить пару. Вартість входу (остання закупівля) розподіляється
   по частках ваги кнопкою; суми редаговані.
   Ендпоінти: GET /pos/balance?withCatalog=1, GET /pos/last-price,
              POST /pos/disassembly-act, GET /pos/disassembly-history.
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(n) { return (Math.round((+n || 0) * 100) / 100).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

let _venueId = '', _token = '', _role = '';
let _prods = [];            // {id,name,unit,stock,zone}
let _input = null;          // {id,name,unit}
let _inAmount = '';         // кг входу
let _inPrice = null;        // остання закупівельна ціна за кг (може бути null)
let _outs = [];             // {id,name,amount,sum}
let _comment = '';
let _searchIn = '', _searchOut = '';
let _sending = false, _result = null, _err = '';
let _history = [], _expHist = new Set();

const CSS = `<style>
.dis-wrap{display:flex;flex-direction:column;height:100%;background:var(--bg);color:var(--text0)}
.dis-hdr{display:flex;align-items:center;gap:12px;padding:8px 18px;flex-shrink:0}
.dis-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.dis-title{font-family:var(--font-h);font-size:22px;font-weight:700;letter-spacing:-.02em}
.dis-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.dis-scroll{flex:1;overflow-y:auto;padding:0 14px 24px}
.dis-scroll::-webkit-scrollbar{width:0}
.dis-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 4px 8px;font-family:var(--font-b)}
.dis-search{width:100%;box-sizing:border-box;height:44px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none}
.dis-search:focus{border-color:var(--green)}
.dis-list{display:flex;flex-direction:column;gap:5px;margin-top:8px;max-height:34vh;overflow-y:auto}
.dis-list::-webkit-scrollbar{width:0}
.dis-row{display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--bg1);border:0.5px solid var(--border);border-radius:11px;cursor:pointer}
.dis-row:active{background:var(--bg3)}
.dis-rname{flex:1;min-width:0;font-size:14px;font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dis-badge{font-size:9px;color:var(--text2);border:0.5px solid var(--border2);border-radius:5px;padding:1px 5px;flex-shrink:0}
.dis-card{background:var(--bg1);border:0.5px solid var(--green-border);border-radius:14px;padding:10px 12px;margin-top:8px}
.dis-crow{display:flex;align-items:center;gap:8px}
.dis-cname{flex:1;min-width:0;font-size:14px;font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dis-qty{width:84px;height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;text-align:center;font-size:15px;font-family:var(--font-h);font-weight:600;color:var(--text0);outline:none}
.dis-qty:focus{border-color:var(--green)}
.dis-sum{width:96px;height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;text-align:center;font-size:14px;font-family:var(--font-h);color:var(--text0);outline:none}
.dis-unit{font-size:11px;color:var(--text2);font-family:var(--font-b);width:22px;flex-shrink:0}
.dis-hint{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:6px;line-height:1.4}
.dis-del{width:30px;height:30px;border-radius:8px;background:var(--red-bg);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:var(--red,#ff6b6b)}
.dis-outrow{display:flex;align-items:center;gap:6px;padding:8px 6px;border-bottom:0.5px solid var(--border)}
.dis-outrow:last-child{border-bottom:none}
.dis-split{width:100%;height:40px;margin-top:8px;border-radius:11px;border:0.5px solid var(--purple,#a855f7);background:var(--purple-bg,#241b3a);color:#A88BFF;font-size:13px;font-family:var(--font-b);cursor:pointer}
.dis-split:disabled{opacity:.4}
.dis-comment{width:100%;box-sizing:border-box;margin-top:8px;min-height:52px;background:var(--bg2);border:0.5px solid var(--border);border-radius:11px;padding:9px 12px;font-size:13px;color:var(--text0);font-family:var(--font-b);outline:none;resize:vertical}
.dis-cta{width:100%;height:54px;margin-top:14px;background:var(--green);border:none;border-radius:14px;font-size:16px;font-weight:700;color:var(--fab-ink,#000);font-family:var(--font-h);cursor:pointer}
.dis-cta:disabled{background:var(--bg2);color:var(--text3);cursor:default}
.dis-note{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:10px;line-height:1.5;text-align:center}
.dis-hcard{background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;margin-bottom:6px;overflow:hidden}
.dis-hhdr{display:flex;align-items:center;gap:10px;padding:12px 13px;cursor:pointer}
.dis-hmain{flex:1;min-width:0}
.dis-hdate{font-size:14px;font-family:var(--font-h);font-weight:600}
.dis-hmeta{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.dis-hbody{padding:2px 13px 12px;display:flex;flex-direction:column;gap:4px}
.dis-hrow{display:flex;justify-content:space-between;gap:10px;padding:7px 11px;background:var(--bg2);border-radius:9px;font-size:13px;font-family:var(--font-b)}
.dis-ov{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:24px}
.dis-ovcard{background:var(--bg1);border:0.5px solid var(--border);border-radius:20px;padding:26px 22px;width:100%;max-width:340px;text-align:center}
.dis-ovtitle{font-family:var(--font-h);font-size:19px;font-weight:700;margin-bottom:6px}
.dis-ovmsg{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5;margin-bottom:18px;word-break:break-word}
.dis-ovbtn{width:100%;height:48px;border:none;border-radius:12px;font-size:15px;font-weight:600;font-family:var(--font-h);cursor:pointer;background:var(--green);color:#000}
</style>`;

/* ── дані ── */
async function loadProds() {
  try {
    const res = await fetch(`${API}/api/pos/balance/${_venueId}?allStores=1&withCatalog=1`, { headers: { Authorization: `Bearer ${_token}` } });
    if (!res.ok) return;
    const data = await res.json();
    const byId = {};
    for (const store of (data.stores || [])) {
      const zone = /бар|bar/i.test(store.storeName || '') ? 'bar' : /кухн|kitchen/i.test(store.storeName || '') ? 'kitchen' : '';
      for (const it of (store.items || [])) {
        if (!it.name || /^[0-9a-f-]{36}$/i.test(it.name)) continue;
        let e = byId[it.id];
        if (!e) e = byId[it.id] = { id: it.id, name: it.name, unit: it.unit || '', stock: 0, zones: new Set() };
        e.stock += (parseFloat(it.amount) || 0);
        if (zone) e.zones.add(zone);
      }
    }
    _prods = Object.values(byId).map(e => ({ id: e.id, name: e.name, unit: e.unit, stock: Math.round(e.stock * 1000) / 1000, zone: e.zones.size === 0 ? '' : (e.zones.has('bar') && e.zones.has('kitchen')) ? 'both' : [...e.zones][0] }));
    rerender();
  } catch {}
}
async function loadHistory() {
  try {
    const r = await fetch(`${API}/api/pos/disassembly-history/${_venueId}`, { headers: { Authorization: `Bearer ${_token}` } });
    const d = await r.json();
    if (r.ok && d.acts) { _history = d.acts; rerender(); }
  } catch {}
}
async function loadPrice() {
  _inPrice = null;
  if (!_input) return;
  try {
    const r = await fetch(`${API}/api/pos/last-price/${_venueId}?productId=${encodeURIComponent(_input.id)}`, { headers: { Authorization: `Bearer ${_token}` } });
    const d = await r.json();
    if (r.ok) { _inPrice = d.price; rerender(); }
  } catch {}
}

/* ── допоміжні ── */
function pickerList(q, excludeIds) {
  const hideZone = (_role === 'chef' || _role === 'cook') ? 'bar' : null;   // кухня не бачить явний бар
  const qq = (q || '').trim().toLowerCase();
  return _prods
    .filter(p => !excludeIds.has(p.id) && (!hideZone || p.zone !== hideZone) && (!qq || p.name.toLowerCase().includes(qq)))
    .slice(0, qq ? 30 : 12);
}
function totalOutSum() { return _outs.reduce((s, o) => s + (parseFloat(o.sum) || 0), 0); }
function listInHTML() {
  return pickerList(_searchIn, new Set()).map(p => `
    <div class="dis-row" onclick="window.__dis.pickInput('${p.id}')">
      <div class="dis-rname">${esc(p.name)}</div>
      <div class="dis-badge">${p.stock} ${esc(p.unit || '')}</div>
    </div>`).join('') || '<div class="dis-note">Завантаження товарів…</div>';
}
function listOutHTML() {
  return pickerList(_searchOut, new Set(_outs.map(o => o.id).concat(_input ? [_input.id] : []))).map(p => `
    <div class="dis-row" onclick="window.__dis.addOut('${p.id}')">
      <div class="dis-rname">${esc(p.name)}</div>
      <div class="dis-badge">＋</div>
    </div>`).join('');
}
function inputCost() { return (_inPrice != null && parseFloat(_inAmount) > 0) ? _inPrice * parseFloat(_inAmount) : null; }
function ready() { return _input && parseFloat(_inAmount) > 0 && _outs.length && _outs.every(o => parseFloat(o.amount) > 0) && !_sending; }

/* ── HTML ── */
function buildHTML() {
  const cost = inputCost();
  const outWeight = _outs.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
  const loss = (parseFloat(_inAmount) > 0 && outWeight > 0) ? Math.round((parseFloat(_inAmount) - outWeight) * 1000) / 1000 : null;
  return `${CSS}<div class="dis-wrap">
    <div class="dis-hdr">
      <div class="dis-back" onclick="window.__dis.back()"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><div class="dis-title">Розбір</div><div class="dis-sub">1 товар → частини · чернетки списання + приходу в Syrve</div></div>
    </div>
    <div class="dis-scroll">
      <div class="dis-sec">Вхідний товар</div>
      ${_input ? `
        <div class="dis-card">
          <div class="dis-crow">
            <div class="dis-cname" onclick="window.__dis.clearInput()">${esc(_input.name)}</div>
            <input class="dis-qty" type="number" inputmode="decimal" placeholder="кг" value="${_inAmount}" onfocus="this.select()" onchange="window.__dis.inAmount(this.value)">
            <div class="dis-unit">кг</div>
          </div>
          <div class="dis-hint">${_inPrice != null
            ? `Остання закупівля: <b>${money(_inPrice)} ₴/кг</b>${cost != null ? ` · вартість входу ≈ <b>${money(cost)} ₴</b>` : ''}`
            : 'Ціни закупівлі не знайдено (за 120 днів) — суми частин впиши руками.'}
            <span style="color:var(--text3)"> · Змінити товар — тап по назві.</span></div>
        </div>` : `
        <input class="dis-search" placeholder="Пошук вхідного товару…" value="${esc(_searchIn)}" oninput="window.__dis.searchIn(this.value)">
        <div class="dis-list" id="dis-list-in">${listInHTML()}</div>`}

      <div class="dis-sec">Вихідні частини</div>
      ${_outs.length ? `<div class="dis-card" style="border-color:var(--border)">
        ${_outs.map((o, i) => `
          <div class="dis-outrow">
            <div class="dis-cname" style="font-size:13px">${esc(o.name)}</div>
            <input class="dis-qty" style="width:70px" type="number" inputmode="decimal" placeholder="кг" value="${o.amount}" onfocus="this.select()" onchange="window.__dis.outAmount(${i},this.value)">
            <div class="dis-unit">кг</div>
            <input class="dis-sum" type="number" inputmode="decimal" placeholder="₴" value="${o.sum}" onfocus="this.select()" onchange="window.__dis.outSum(${i},this.value)">
            <button class="dis-del" onclick="window.__dis.delOut(${i})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round"/></svg></button>
          </div>`).join('')}
        <div class="dis-hint">Разом: ${money(totalOutSum())} ₴ · вага виходів ${Math.round(outWeight * 1000) / 1000} кг${loss != null && loss > 0 ? ` · втрати ${loss} кг` : ''}${loss != null && loss < 0 ? ` · <span style="color:var(--amber,#e8b84a)">виходи важчі за вхід на ${Math.abs(loss)} кг!</span>` : ''}</div>
        <button class="dis-split" ${cost != null && outWeight > 0 ? '' : 'disabled'} onclick="window.__dis.split()">⚖️ Розподілити вартість входу по вазі${cost != null ? ` (${money(cost)} ₴)` : ''}</button>
      </div>` : ''}
      <input class="dis-search" style="margin-top:8px" placeholder="Пошук частини (додати вихід)…" value="${esc(_searchOut)}" oninput="window.__dis.searchOut(this.value)">
      <div class="dis-list" id="dis-list-out">${listOutHTML()}</div>

      <textarea class="dis-comment" placeholder="Коментар (необовʼязково)" oninput="window.__dis.comment(this.value)">${esc(_comment)}</textarea>
      <button class="dis-cta" ${ready() ? '' : 'disabled'} onclick="window.__dis.submit()">${_sending ? 'Надсилаю…' : 'Надіслати в Syrve →'}</button>
      <div class="dis-note">Створяться дві чернетки: списання входу + прихід частин (контрагент «Внутрішній розбір»). Бухгалтер перевірить і проведе.</div>

      ${_history.length ? `<div class="dis-sec">Історія розборів</div>${_history.map(h => {
        const open = _expHist.has(h.id);
        const d = new Date(h.createdAt);
        return `<div class="dis-hcard">
          <div class="dis-hhdr" onclick="window.__dis.toggleHist('${h.id}')">
            <div class="dis-hmain">
              <div class="dis-hdate">${esc(h.input?.name || '')} ${h.input?.amount || ''} кг</div>
              <div class="dis-hmeta">${d.toLocaleDateString('uk-UA')} ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} · ${esc(h.userName || '')} · спис. №${esc(h.writeoffDocNum)} · прихід №${esc(h.invoiceDocNum)}</div>
            </div>
            <div class="dis-badge">${(h.outputs || []).length} част.</div>
          </div>
          ${open ? `<div class="dis-hbody">${(h.outputs || []).map(o => `<div class="dis-hrow"><span>${esc(o.name)}</span><span>${o.amount} кг · ${money(o.sum)} ₴</span></div>`).join('')}${h.comment ? `<div class="dis-hint">${esc(h.comment)}</div>` : ''}</div>` : ''}
        </div>`;
      }).join('')}` : ''}
    </div>
    ${_result ? resultOv() : ''}
  </div>`;
}

function resultOv() {
  const ok = !!_result.success;
  return `<div class="dis-ov" onclick="window.__dis.closeResult()">
    <div class="dis-ovcard" onclick="event.stopPropagation()">
      <div style="font-size:40px;margin-bottom:10px">${ok ? '✅' : '❌'}</div>
      <div class="dis-ovtitle">${ok ? 'Розбір надіслано' : 'Помилка'}</div>
      <div class="dis-ovmsg">${ok
        ? `Чернетки у Syrve Office: списання №${esc(_result.writeoffDocNum || '?')} + прихід №${esc(_result.invoiceDocNum || '?')}. Бухгалтер перевірить і проведе.`
        : esc(_err || 'Не вдалося')}</div>
      <button class="dis-ovbtn" onclick="window.__dis.closeResult()">Ок</button>
    </div>
  </div>`;
}

function rerender() {
  if (state.route !== 'disassembly') return;
  const v = document.getElementById('app-view');
  if (!v) return;
  const prev = v.querySelector('.dis-scroll');
  const top = prev ? prev.scrollTop : 0;
  v.innerHTML = buildHTML();
  if (top) { const next = v.querySelector('.dis-scroll'); if (next) next.scrollTop = top; }
}

async function submit() {
  if (!ready()) return;
  _sending = true; rerender();
  try {
    const res = await fetch(`${API}/api/pos/disassembly-act/${_venueId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({
        input: { productId: _input.id, name: _input.name, amount: parseFloat(_inAmount) },
        outputs: _outs.map(o => ({ productId: o.id, name: o.name, amount: parseFloat(o.amount) || 0, sum: parseFloat(o.sum) || 0 })),
        comment: _comment,
      }),
    });
    let d = {}; try { d = await res.json(); } catch { d = { error: `HTTP ${res.status}` }; }
    if (!res.ok || !d.success) {
      _err = (d.error || 'Не вдалося') + (typeof d.details === 'string' ? ' — ' + d.details.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 250) : '');
      _result = { success: false };
    } else {
      _result = d;
      _input = null; _inAmount = ''; _inPrice = null; _outs = []; _comment = ''; _searchIn = ''; _searchOut = '';
      loadHistory();
    }
  } catch (e) { _err = e.message; _result = { success: false }; }
  _sending = false; rerender();
}

export default {
  render() {
    _venueId = state.venueId || localStorage.getItem('barops_venueId');
    _token   = state.token || localStorage.getItem('barops_token');
    _role    = (state.role || localStorage.getItem('barops_role') || '').toLowerCase();
    _input = null; _inAmount = ''; _inPrice = null; _outs = []; _comment = '';
    _searchIn = ''; _searchOut = ''; _sending = false; _result = null; _err = '';
    loadProds(); loadHistory();
    return buildHTML();
  },
  init() {
    window.__dis = {
      back: () => navigate('dashboard'),
      searchIn:  (v) => { _searchIn = v; const el = document.getElementById('dis-list-in');  if (el) el.innerHTML = listInHTML(); },
      searchOut: (v) => { _searchOut = v; const el = document.getElementById('dis-list-out'); if (el) el.innerHTML = listOutHTML(); },
      pickInput: (id) => { const p = _prods.find(x => x.id === id); if (p) { _input = { id: p.id, name: p.name, unit: p.unit }; _searchIn = ''; loadPrice(); rerender(); } },
      clearInput: () => { _input = null; _inPrice = null; rerender(); },
      inAmount: (v) => { _inAmount = v; rerender(); },
      addOut: (id) => { const p = _prods.find(x => x.id === id); if (p && !_outs.some(o => o.id === id)) { _outs.push({ id: p.id, name: p.name, amount: '', sum: '' }); _searchOut = ''; rerender(); } },
      delOut: (i) => { _outs.splice(i, 1); rerender(); },
      outAmount: (i, v) => { if (_outs[i]) { _outs[i].amount = v; rerender(); } },
      outSum: (i, v) => { if (_outs[i]) { _outs[i].sum = v; rerender(); } },
      split: () => {
        const cost = inputCost();
        const w = _outs.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
        if (cost == null || !(w > 0)) return;
        for (const o of _outs) o.sum = String(Math.round(cost * ((parseFloat(o.amount) || 0) / w) * 100) / 100);
        rerender();
      },
      comment: (v) => { _comment = v; },
      toggleHist: (id) => { _expHist.has(id) ? _expHist.delete(id) : _expHist.add(id); rerender(); },
      submit,
      closeResult: () => { _result = null; rerender(); },
    };
  },
  cleanup() { window.__dis = null; },
};
