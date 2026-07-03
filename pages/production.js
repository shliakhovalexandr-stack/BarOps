/* ============================================================
   BarOps — pages/production.js
   «Акт приготування» (виробництво) для кухаря/шефа/адміна.
   Кухар обирає що приготував + к-сть (кілька позицій) → BarOps створює
   непроведений productionDocument у Syrve (інгредієнти списуються за ТТК),
   бухгалтер проводить. Ендпоінти: GET /api/pos/producible, POST /api/pos/production-act.
   ============================================================ */

import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function unitLbl(u) { const t = (u || '').toLowerCase(); if (/порц/.test(t)) return 'порц'; if (/шт|pc/.test(t)) return 'шт'; if (/кг|kg/.test(t)) return 'кг'; if (/л|l/.test(t)) return 'л'; return u || 'шт'; }
function isCountUnit(u) { const t = (u || '').toLowerCase(); return /порц|шт|pc/.test(t); }   // штучні → крок 1, інакше 0.001

let _venueId = '', _token = '';
let _items   = [];      // усі вироби (страви+ПФ) {id,name,unit,type}
let _loading = true, _err = '';
let _search  = '';
let _sel     = [];      // обрані {id,name,unit,qty}
let _sending = false;
let _result  = null;    // { ok, msg } | { error }

const CSS = `<style>
.prd-wrap{display:flex;flex-direction:column;height:100%;background:var(--bg);color:var(--text0)}
.prd-hdr{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.prd-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.prd-title{font-family:var(--font-h);font-size:22px;font-weight:700;letter-spacing:-.02em}
.prd-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.prd-scroll{flex:1;overflow-y:auto;padding:0 14px 24px}
.prd-scroll::-webkit-scrollbar{width:0}
.prd-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 4px 8px;font-family:var(--font-b)}
.prd-search{width:100%;box-sizing:border-box;height:46px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:0 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);outline:none}
.prd-search:focus{border-color:var(--green);box-shadow:0 0 0 3px var(--green-bg)}
.prd-list{display:flex;flex-direction:column;gap:5px;margin-top:8px;max-height:44vh;overflow-y:auto}
.prd-list::-webkit-scrollbar{width:0}
.prd-row{display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--bg1);border:0.5px solid var(--border);border-radius:11px;cursor:pointer;transition:background .12s}
.prd-row:active{background:var(--bg3)}
.prd-row.sel{border-color:var(--green-border);background:var(--green-bg)}
.prd-rname{flex:1;min-width:0;font-size:14px;font-family:var(--font-b);color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prd-badge{font-size:9px;color:var(--text2);border:0.5px solid var(--border2);border-radius:5px;padding:1px 5px;flex-shrink:0}
.prd-plus{width:26px;height:26px;border-radius:8px;background:var(--green-bg);border:0.5px solid var(--green-border);color:var(--green);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.prd-selcard{background:var(--bg1);border:0.5px solid var(--green-border);border-radius:14px;padding:6px;margin-top:8px}
.prd-selrow{display:flex;align-items:center;gap:8px;padding:8px 6px;border-bottom:0.5px solid var(--border)}
.prd-selrow:last-child{border-bottom:none}
.prd-selname{flex:1;min-width:0;font-size:14px;font-family:var(--font-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prd-qty{width:78px;height:38px;background:var(--bg2);border:0.5px solid var(--border);border-radius:9px;text-align:center;font-size:15px;font-family:var(--font-h);font-weight:600;color:var(--text0);outline:none}
.prd-qty:focus{border-color:var(--green)}
.prd-unit{font-size:11px;color:var(--text2);font-family:var(--font-b);width:30px}
.prd-del{width:30px;height:30px;border-radius:8px;background:var(--red-bg);border:0.5px solid var(--red-border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.prd-cta{width:100%;height:54px;margin-top:16px;background:var(--green);border:none;border-radius:14px;font-size:16px;font-weight:700;color:var(--fab-ink,#000);font-family:var(--font-h);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
.prd-cta:disabled{background:var(--bg2);color:var(--text3);cursor:default}
.prd-empty{text-align:center;padding:22px 8px;color:var(--text2);font-family:var(--font-b);font-size:13px}
.prd-ov{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:24px}
.prd-ovcard{background:var(--bg1);border:0.5px solid var(--border);border-radius:20px;padding:26px 22px;width:100%;max-width:340px;text-align:center}
.prd-ovicon{width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center}
.prd-ovtitle{font-family:var(--font-h);font-size:19px;font-weight:700;margin-bottom:6px}
.prd-ovmsg{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.5;margin-bottom:18px}
.prd-ovbtn{width:100%;height:48px;border:none;border-radius:12px;font-size:15px;font-weight:600;font-family:var(--font-h);cursor:pointer}
</style>`;

function filtered() {
  const q = _search.trim().toLowerCase();
  const selIds = new Set(_sel.map(s => s.id));
  let list = _items;
  if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q));
  return list.slice(0, 60).map(p => ({ ...p, picked: selIds.has(p.id) }));
}

function listHTML() {
  if (_loading) return `<div class="prd-empty">Завантаження виробів…</div>`;
  if (_err)     return `<div class="prd-empty">${esc(_err)}</div>`;
  const list = filtered();
  if (!list.length) return `<div class="prd-empty">${_items.length ? 'Нічого не знайдено' : 'Список порожній'}</div>`;
  return list.map(p => `
    <div class="prd-row ${p.picked ? 'sel' : ''}" onclick="window.__prod.add('${p.id}')">
      <div class="prd-rname">${esc(p.name)}</div>
      <div class="prd-badge">${p.type === 'PREPARED' ? 'ПФ' : 'страва'}</div>
      <div class="prd-plus">${p.picked ? '✓' : '+'}</div>
    </div>`).join('');
}

function selHTML() {
  if (!_sel.length) return `<div class="prd-empty">Оберіть, що приготували, зі списку вище</div>`;
  return `<div class="prd-selcard">${_sel.map(s => `
    <div class="prd-selrow">
      <div class="prd-selname">${esc(s.name)}</div>
      <input class="prd-qty" type="number" inputmode="decimal" min="0" step="${isCountUnit(s.unit) ? '1' : '0.001'}"
        value="${s.qty}" oninput="window.__prod.setQty('${s.id}', this.value)">
      <div class="prd-unit">${unitLbl(s.unit)}</div>
      <div class="prd-del" onclick="window.__prod.remove('${s.id}')" aria-label="Прибрати">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M5.5 4.5V3h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 4.5l.7 7h5.6l.7-7" stroke="var(--red)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>`).join('')}</div>`;
}

function bodyHTML() {
  const total = _sel.filter(s => (parseFloat(s.qty) || 0) > 0).length;
  return `
    <div class="prd-sec">Що приготували</div>
    <input class="prd-search" placeholder="Пошук страви або заготовки…" value="${esc(_search)}"
      oninput="window.__prod.search(this.value)">
    <div class="prd-list" id="prd-list">${listHTML()}</div>

    <div class="prd-sec">До виробництва${total ? ` · ${total}` : ''}</div>
    <div id="prd-sel">${selHTML()}</div>

    <button class="prd-cta" id="prd-cta" ${total && !_sending ? '' : 'disabled'} onclick="window.__prod.submit()">
      ${_sending ? 'Надсилаю…' : 'Надіслати в Syrve'}
    </button>
    <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:10px;line-height:1.5;text-align:center">
      Створиться <b style="color:var(--text1)">непроведений акт приготування</b> · склад Кухня · інгредієнти спишуться за ТТК. Бухгалтер проведе.
    </div>
    ${_result ? resultHTML() : ''}`;
}

function resultHTML() {
  const ok = !!_result.ok;
  return `<div class="prd-ov" onclick="if(event.target===this)window.__prod.closeResult()">
    <div class="prd-ovcard">
      <div class="prd-ovicon" style="background:${ok ? 'var(--green-bg)' : 'var(--red-bg)'}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">${ok
          ? `<path d="M4 12l5 5L20 6" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="M6 6l12 12M18 6L6 18" stroke="var(--red)" stroke-width="2.4" stroke-linecap="round"/>`}</svg>
      </div>
      <div class="prd-ovtitle">${ok ? 'Акт створено' : 'Не вдалося'}</div>
      <div class="prd-ovmsg">${esc(_result.msg || _result.error || '')}</div>
      <button class="prd-ovbtn" style="background:${ok ? 'var(--green)' : 'var(--bg2)'};color:${ok ? 'var(--fab-ink,#000)' : 'var(--text0)'}"
        onclick="window.__prod.closeResult()">Готово</button>
    </div>
  </div>`;
}

function refresh() { const el = document.getElementById('prd-body'); if (el) el.innerHTML = bodyHTML(); }
function refreshList() { const el = document.getElementById('prd-list'); if (el) el.innerHTML = listHTML(); }
function refreshSel() {
  const s = document.getElementById('prd-sel'); if (s) s.innerHTML = selHTML();
  const l = document.getElementById('prd-list'); if (l) l.innerHTML = listHTML();
  const total = _sel.filter(x => (parseFloat(x.qty) || 0) > 0).length;
  const cta = document.getElementById('prd-cta'); if (cta) cta.disabled = !(total && !_sending);
}

async function loadProducible() {
  _loading = true; _err = ''; refreshList();
  try {
    const r = await fetch(`${API}/api/pos/producible/${_venueId}`, { headers: _token ? { Authorization: `Bearer ${_token}` } : {} });
    const d = await r.json();
    if (!r.ok || !d.success) throw new Error(d.error || 'Не вдалося завантажити вироби');
    _items = d.items || [];
  } catch (e) { _err = e.message; _items = []; }
  _loading = false; refreshList();
}

async function submit() {
  const items = _sel.map(s => ({ productId: s.id, amount: parseFloat(String(s.qty).replace(',', '.')) || 0 })).filter(i => i.amount > 0);
  if (!items.length || _sending) return;
  _sending = true; refresh();
  try {
    const r = await fetch(`${API}/api/pos/production-act/${_venueId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(_token ? { Authorization: `Bearer ${_token}` } : {}) },
      body: JSON.stringify({ items }),
    });
    const d = await r.json();
    if (!r.ok || !d.success) {
      const det = d.details ? (typeof d.details === 'string' ? d.details.slice(0, 160) : '') : '';
      throw new Error(det || d.error || 'Помилка Syrve');
    }
    _result = { ok: true, msg: `${d.itemCount} поз.${d.syrveDocNumber ? ` · №${d.syrveDocNumber}` : ''} — непроведений. Бухгалтер проведе.` };
    _sel = [];
  } catch (e) {
    _result = { ok: false, error: e.message };
  }
  _sending = false; refresh();
}

export default {
  render() {
    _venueId = state.venueId || localStorage.getItem('barops_venueId') || '';
    _token   = localStorage.getItem('barops_token') || '';
    _items = []; _loading = true; _err = ''; _search = ''; _sel = []; _sending = false; _result = null;
    return `${CSS}
    <div class="prd-wrap">
      <div class="prd-hdr">
        <div class="prd-back" onclick="window.__barops.navigate('dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div>
          <div class="prd-title">Виробництво</div>
          <div class="prd-sub">${esc(state.venue || '')} · що приготували за зміну</div>
        </div>
      </div>
      <div class="prd-scroll"><div id="prd-body">${bodyHTML()}</div></div>
    </div>`;
  },
  init() {
    window.__prod = {
      search(v) { _search = v; refreshList(); },
      add(id) {
        const ex = _sel.find(s => s.id === id);
        if (ex) { _sel = _sel.filter(s => s.id !== id); }          // повторний тап — прибрати
        else {
          const p = _items.find(x => x.id === id);
          if (p) _sel.push({ id: p.id, name: p.name, unit: p.unit, qty: isCountUnit(p.unit) ? 1 : 1 });
        }
        refreshSel();
      },
      remove(id) { _sel = _sel.filter(s => s.id !== id); refreshSel(); },
      setQty(id, v) { const s = _sel.find(x => x.id === id); if (s) { s.qty = v; const t = _sel.filter(x => (parseFloat(x.qty) || 0) > 0).length; const cta = document.getElementById('prd-cta'); if (cta) cta.disabled = !(t && !_sending); } },
      submit,
      closeResult() { _result = null; refresh(); },
    };
    loadProducible();
  },
};
