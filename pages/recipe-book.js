/* ============================================================
   BarOps — pages/recipe-book.js
   ============================================================ */
import { state } from '../shared/app.js';

const API = 'https://barops-backend-production.up.railway.app';

let _groups   = [];
let _loading  = true;
let _error    = '';
let _venueId  = null;
let _token    = null;
let _role     = 'bartender';

let _screen      = 'groups';
let _selGroup    = null;
let _selRecipe   = null;

let _editGroupId   = null;
let _editGroupName = '';
let _editRecipeId  = null;
let _editName      = '';
let _editIngredients = [];
let _editSteps       = '';

let _saving     = false;
let _delConfirm = null;

/* ── CSS ─────────────────────────────────────────── */
const CSS = `
.rb-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--bg0)}
.rb-scroll{overflow-y:auto;flex:1}.rb-scroll::-webkit-scrollbar{width:0}
.rb-topbar{display:flex;align-items:center;padding:10px 16px 6px;gap:10px;flex-shrink:0}
.rb-back{background:none;border:none;color:var(--text1);cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px;font-size:14px;font-family:var(--font-b)}
.rb-title{font-family:var(--font-h);font-size:22px;font-weight:600;color:var(--text0);letter-spacing:-.02em;flex:1}
.rb-add-btn{display:flex;align-items:center;gap:4px;padding:6px 12px;background:var(--green);color:#000;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0}
.rb-list{padding:0 16px}
.rb-card{background:var(--bg1);border:0.5px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:opacity .15s;user-select:none}
.rb-card:active{opacity:.7}
.rb-card-title{font-size:15px;font-weight:600;color:var(--text0);margin-bottom:3px}
.rb-card-sub{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.rb-card-arr{color:var(--text2);flex-shrink:0}
.rb-card-actions{display:flex;gap:8px;flex-shrink:0}
.rb-icon-btn{background:var(--bg2);border:0.5px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text1)}
.rb-icon-btn.danger{color:#ff5c5c}
.rb-empty{text-align:center;padding:48px 24px;color:var(--text2);font-size:14px;font-family:var(--font-b);line-height:1.6}
.rb-empty-icon{font-size:36px;margin-bottom:12px}
.rb-recipe-detail{padding:0 16px 24px}
.rb-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text2);font-family:var(--font-mono);margin:20px 0 8px}
.rb-ingr-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid var(--border);font-size:14px}
.rb-ingr-row:last-child{border-bottom:none}
.rb-ingr-name{color:var(--text0)}
.rb-ingr-qty{color:var(--green);font-family:var(--font-mono);font-size:13px}
.rb-steps-text{font-size:14px;color:var(--text1);font-family:var(--font-b);line-height:1.7;white-space:pre-wrap;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:14px}
.rb-edit-form{padding:0 16px 32px}
.rb-field-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);font-family:var(--font-mono);margin-bottom:6px}
.rb-field-wrap{margin-bottom:18px}
.rb-input{width:100%;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:15px;color:var(--text0);font-family:var(--font-b);box-sizing:border-box;outline:none}
.rb-input:focus{border-color:var(--green)}
.rb-textarea{width:100%;background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);box-sizing:border-box;outline:none;resize:vertical;min-height:120px;line-height:1.6}
.rb-textarea:focus{border-color:var(--green)}
.rb-ingr-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.rb-ingr-edit-row{display:flex;gap:6px;align-items:center}
.rb-ingr-edit-row .rb-input{margin:0}
.rb-ingr-inp-name{flex:3;min-width:0}
.rb-ingr-inp-qty{flex:1.4;min-width:0}
.rb-ingr-inp-unit{flex:1.4;min-width:0}
.rb-ingr-del{background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer;padding:4px;line-height:1;flex-shrink:0}
.rb-add-ingr-btn{background:none;border:0.5px dashed var(--border);border-radius:10px;padding:9px;width:100%;font-size:13px;color:var(--text1);font-family:var(--font-b);cursor:pointer;text-align:center;box-sizing:border-box}
.rb-save-btn{width:100%;padding:14px;background:var(--green);color:#000;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-b)}
.rb-save-btn:disabled{opacity:.5;cursor:default}
.rb-err{margin:0 0 14px;background:rgba(255,80,80,.08);border:0.5px solid rgba(255,80,80,.3);border-radius:10px;padding:10px 12px;font-size:12px;color:#ff5c5c;font-family:var(--font-b)}
.rb-del-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6)}
.rb-del-sheet{background:var(--bg1);border-radius:20px 20px 0 0;padding:20px 16px 32px;width:100%;max-width:430px}
.rb-del-title{font-size:16px;font-weight:600;color:var(--text0);margin-bottom:8px}
.rb-del-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);margin-bottom:20px;line-height:1.5}
.rb-del-btns{display:flex;flex-direction:column;gap:8px}
.rb-del-btn{padding:13px;border-radius:12px;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-b)}
.rb-del-btn.danger{background:#ff3333;color:#fff}
.rb-del-btn.cancel{background:var(--bg2);color:var(--text1)}
.rb-loading-wrap{display:flex;align-items:center;justify-content:center;flex:1;color:var(--text2);font-size:14px;font-family:var(--font-b);padding:60px}
`;

/* ── Utils ───────────────────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function plural(n, one, few, many) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} ${one}`;
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return `${n} ${few}`;
  return `${n} ${many}`;
}
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` };
}
function isEditable() {
  const r = (_role || '').toUpperCase();
  return r === 'ADMIN' || r === 'MANAGER';
}

/* ── SVG icons ───────────────────────────────────── */
const ICON_BACK = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 16l-6-6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CHEVRON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13h2.5l6-6L9 4.5l-6 6V13z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10.5 3l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const ICON_TRASH = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l1 9h4l1-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ── HTML builders ───────────────────────────────── */
function buildGroupsScreen() {
  let html = `<div class="rb-topbar">
    <span class="rb-title">Рецепти</span>
    ${isEditable() ? `<button class="rb-add-btn" onclick="window.__rb.addGroup()">+ Група</button>` : ''}
  </div><div class="rb-list">`;
  if (_error) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">⚠️</div>${esc(_error)}</div>`;
  } else if (!_groups.length) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">📖</div>${isEditable() ? 'Немає груп. Додайте першу групу рецептів.' : 'Рецепти ще не додано.'}</div>`;
  } else {
    _groups.forEach(g => {
      const count = g.recipes?.length || 0;
      html += `<div class="rb-card" onclick="window.__rb.openGroup('${g.id}')">
        <div style="flex:1;min-width:0">
          <div class="rb-card-title">${esc(g.name)}</div>
          <div class="rb-card-sub">${plural(count,'рецепт','рецепти','рецептів')}</div>
        </div>
        ${isEditable() ? `<div class="rb-card-actions" onclick="event.stopPropagation()">
          <button class="rb-icon-btn" onclick="window.__rb.editGroup('${g.id}')">${ICON_EDIT}</button>
          <button class="rb-icon-btn danger" onclick="window.__rb.deleteGroup('${g.id}')">${ICON_TRASH}</button>
        </div>` : `<span class="rb-card-arr">${ICON_CHEVRON}</span>`}
      </div>`;
    });
  }
  return html + '</div>';
}

function buildRecipesScreen() {
  if (!_selGroup) return '';
  const recipes = _selGroup.recipes || [];
  let html = `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} Рецепти</button>
    ${isEditable() ? `<button class="rb-add-btn" onclick="window.__rb.addRecipe()">+ Рецепт</button>` : ''}
  </div>
  <div style="padding:0 16px 8px"><span class="rb-title">${esc(_selGroup.name)}</span></div>
  <div class="rb-list">`;
  if (!recipes.length) {
    html += `<div class="rb-empty"><div class="rb-empty-icon">🍹</div>${isEditable() ? 'Немає рецептів. Додайте перший.' : 'Рецепти ще не додано.'}</div>`;
  } else {
    recipes.forEach(r => {
      const ingCount = (r.ingredients || []).length;
      html += `<div class="rb-card" onclick="window.__rb.openRecipe('${r.id}')">
        <div style="flex:1;min-width:0">
          <div class="rb-card-title">${esc(r.name)}</div>
          <div class="rb-card-sub">${ingCount ? `${ingCount} інгр.` : 'Без інгредієнтів'}</div>
        </div>
        ${isEditable() ? `<div class="rb-card-actions" onclick="event.stopPropagation()">
          <button class="rb-icon-btn" onclick="window.__rb.editRecipe('${r.id}')">${ICON_EDIT}</button>
          <button class="rb-icon-btn danger" onclick="window.__rb.deleteRecipe('${r.id}')">${ICON_TRASH}</button>
        </div>` : `<span class="rb-card-arr">${ICON_CHEVRON}</span>`}
      </div>`;
    });
  }
  return html + '</div>';
}

function buildRecipeScreen() {
  if (!_selRecipe) return '';
  const ingr  = _selRecipe.ingredients || [];
  const steps = _selRecipe.steps || '';
  let html = `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${esc(_selGroup?.name || 'Назад')}</button>
    ${isEditable() ? `<div style="display:flex;gap:8px">
      <button class="rb-icon-btn" onclick="window.__rb.editRecipe('${_selRecipe.id}')">${ICON_EDIT}</button>
      <button class="rb-icon-btn danger" onclick="window.__rb.deleteRecipe('${_selRecipe.id}')">${ICON_TRASH}</button>
    </div>` : ''}
  </div>
  <div class="rb-recipe-detail">
    <div class="rb-title">${esc(_selRecipe.name)}</div>`;
  if (ingr.length) {
    html += `<div class="rb-section-title">Інгредієнти</div>
    <div style="background:var(--bg1);border:0.5px solid var(--border);border-radius:12px;padding:0 14px">`;
    ingr.forEach(i => {
      html += `<div class="rb-ingr-row"><span class="rb-ingr-name">${esc(i.name)}</span><span class="rb-ingr-qty">${i.qty} ${esc(i.unit)}</span></div>`;
    });
    html += `</div>`;
  }
  if (steps) {
    html += `<div class="rb-section-title">Приготування</div><div class="rb-steps-text">${esc(steps)}</div>`;
  }
  if (!ingr.length && !steps) {
    html += `<div class="rb-empty" style="padding:32px 0">Опис рецепту ще не додано.</div>`;
  }
  return html + '</div>';
}

function buildEditGroupScreen() {
  const isNew = !_editGroupId;
  return `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${isNew ? 'Нова група' : 'Редагування'}</button>
  </div>
  <div class="rb-edit-form">
    <div class="rb-title" style="margin-bottom:20px">${isNew ? 'Нова група' : 'Редагувати групу'}</div>
    ${_error ? `<div class="rb-err">${esc(_error)}</div>` : ''}
    <div class="rb-field-wrap">
      <div class="rb-field-label">Назва групи</div>
      <input class="rb-input" id="rb-g-name" type="text" placeholder="Коктейлі, Лимонади…" value="${esc(_editGroupName)}" oninput="window.__rb.onGroupName(this.value)">
    </div>
    <button class="rb-save-btn" onclick="window.__rb.saveGroup()" ${_saving?'disabled':''}>
      ${_saving ? 'Збереження…' : 'Зберегти'}
    </button>
  </div>`;
}

function buildEditRecipeScreen() {
  const isNew = !_editRecipeId;
  let ingrHtml = _editIngredients.map((ing, idx) => `
    <div class="rb-ingr-edit-row">
      <input class="rb-input rb-ingr-inp-name" type="text" placeholder="Назва" value="${esc(ing.name)}" oninput="window.__rb.onIngr(${idx},'name',this.value)">
      <input class="rb-input rb-ingr-inp-qty" type="number" placeholder="К-сть" value="${ing.qty||''}" oninput="window.__rb.onIngr(${idx},'qty',this.value)" min="0" step="0.1">
      <input class="rb-input rb-ingr-inp-unit" type="text" placeholder="мл/шт" value="${esc(ing.unit)}" oninput="window.__rb.onIngr(${idx},'unit',this.value)">
      <button class="rb-ingr-del" onclick="window.__rb.removeIngr(${idx})">×</button>
    </div>`).join('');
  return `<div class="rb-topbar">
    <button class="rb-back" onclick="window.__rb.goBack()">${ICON_BACK} ${esc(_selGroup?.name || 'Назад')}</button>
  </div>
  <div class="rb-edit-form">
    <div class="rb-title" style="margin-bottom:20px">${isNew ? 'Новий рецепт' : 'Редагувати рецепт'}</div>
    ${_error ? `<div class="rb-err">${esc(_error)}</div>` : ''}
    <div class="rb-field-wrap">
      <div class="rb-field-label">Назва рецепту</div>
      <input class="rb-input" id="rb-r-name" type="text" placeholder="Mojito, Lemonade…" value="${esc(_editName)}" oninput="window.__rb.onRecipeName(this.value)">
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Інгредієнти</div>
      <div class="rb-ingr-list" id="rb-ingr-list">${ingrHtml}</div>
      <button class="rb-add-ingr-btn" onclick="window.__rb.addIngr()">+ Інгредієнт</button>
    </div>
    <div class="rb-field-wrap">
      <div class="rb-field-label">Приготування</div>
      <textarea class="rb-textarea" placeholder="Кроки приготування…" oninput="window.__rb.onSteps(this.value)">${esc(_editSteps)}</textarea>
    </div>
    <button class="rb-save-btn" onclick="window.__rb.saveRecipe()" ${_saving?'disabled':''}>
      ${_saving ? 'Збереження…' : 'Зберегти'}
    </button>
  </div>`;
}

function buildDelConfirm() {
  if (!_delConfirm) return '';
  const isGroup = _delConfirm === 'group';
  const name = isGroup ? _selGroup?.name : _selRecipe?.name;
  return `<div class="rb-del-overlay" onclick="event.target===this&&window.__rb.cancelDel()">
    <div class="rb-del-sheet">
      <div class="rb-del-title">Видалити ${isGroup ? 'групу' : 'рецепт'}?</div>
      <div class="rb-del-sub">${isGroup ? `«${esc(name)}» та всі рецепти в ній буде видалено назавжди.` : `«${esc(name)}» буде видалено назавжди.`}</div>
      <div class="rb-del-btns">
        <button class="rb-del-btn danger" onclick="window.__rb.confirmDel()">Видалити</button>
        <button class="rb-del-btn cancel" onclick="window.__rb.cancelDel()">Скасувати</button>
      </div>
    </div>
  </div>`;
}

function buildScreen() {
  if (_loading) return `<div class="rb-loading-wrap">Завантаження…</div>`;
  switch (_screen) {
    case 'recipes':     return buildRecipesScreen();
    case 'recipe':      return buildRecipeScreen();
    case 'edit-group':  return buildEditGroupScreen();
    case 'edit-recipe': return buildEditRecipeScreen();
    default:            return buildGroupsScreen();
  }
}

function fullRender() {
  const root = document.getElementById('rb-root');
  if (!root) return;
  root.innerHTML = `<div class="rb-wrap"><div class="rb-scroll">${buildScreen()}</div></div>${buildDelConfirm()}`;
}

/* ── Data ────────────────────────────────────────── */
async function loadGroups() {
  _loading = true; _error = ''; fullRender();
  try {
    const res  = await fetch(`${API}/api/recipe-book/groups?venueId=${_venueId}`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) { _groups = data.groups; }
    else { _error = data.error || 'Помилка завантаження'; }
  } catch { _error = 'Немає зʼєднання'; }
  _loading = false; fullRender();
}

/* ── Actions ─────────────────────────────────────── */
window.__rb = {
  goBack() {
    _error = '';
    if (_screen === 'recipe')      { _screen = 'recipes'; fullRender(); return; }
    if (_screen === 'recipes')     { _screen = 'groups'; _selGroup = null; fullRender(); return; }
    if (_screen === 'edit-group')  { _screen = 'groups'; fullRender(); return; }
    if (_screen === 'edit-recipe') { _screen = 'recipes'; fullRender(); return; }
    _screen = 'groups'; fullRender();
  },

  openGroup(id) {
    _selGroup = _groups.find(g => g.id === id) || null;
    if (!_selGroup) return;
    _screen = 'recipes'; fullRender();
  },

  openRecipe(id) {
    _selRecipe = (_selGroup?.recipes || []).find(r => r.id === id) || null;
    if (!_selRecipe) return;
    _screen = 'recipe'; fullRender();
  },

  addGroup() {
    _editGroupId = null; _editGroupName = ''; _error = '';
    _screen = 'edit-group'; fullRender();
    setTimeout(() => document.getElementById('rb-g-name')?.focus(), 100);
  },

  editGroup(id) {
    const g = _groups.find(x => x.id === id);
    if (!g) return;
    _editGroupId = g.id; _editGroupName = g.name; _error = '';
    _screen = 'edit-group'; fullRender();
    setTimeout(() => document.getElementById('rb-g-name')?.focus(), 100);
  },

  deleteGroup(id) {
    _selGroup = _groups.find(g => g.id === id) || null;
    _delConfirm = 'group'; fullRender();
  },

  addRecipe() {
    _editRecipeId = null; _editName = ''; _editIngredients = []; _editSteps = ''; _error = '';
    _screen = 'edit-recipe'; fullRender();
    setTimeout(() => document.getElementById('rb-r-name')?.focus(), 100);
  },

  editRecipe(id) {
    const r = (_selGroup?.recipes || []).find(x => x.id === id);
    if (!r) return;
    _editRecipeId = r.id; _editName = r.name;
    _editIngredients = (r.ingredients || []).map(i => ({ ...i }));
    _editSteps = r.steps || ''; _error = '';
    _screen = 'edit-recipe'; fullRender();
    setTimeout(() => document.getElementById('rb-r-name')?.focus(), 100);
  },

  deleteRecipe(id) {
    _selRecipe = (_selGroup?.recipes || []).find(r => r.id === id) || null;
    _delConfirm = 'recipe'; fullRender();
  },

  cancelDel() { _delConfirm = null; fullRender(); },

  async confirmDel() {
    if (_delConfirm === 'group' && _selGroup) {
      const gid = _selGroup.id;
      _delConfirm = null;
      try {
        await fetch(`${API}/api/recipe-book/groups/${gid}`, { method: 'DELETE', headers: authHeaders() });
        _selGroup = null; _screen = 'groups';
        await loadGroups();
      } catch { _error = 'Помилка видалення'; fullRender(); }
    } else if (_delConfirm === 'recipe' && _selRecipe && _selGroup) {
      const rid = _selRecipe.id;
      const gid = _selGroup.id;
      _delConfirm = null;
      try {
        await fetch(`${API}/api/recipe-book/recipes/${rid}`, { method: 'DELETE', headers: authHeaders() });
        _selRecipe = null; _screen = 'recipes';
        await loadGroups();
        _selGroup = _groups.find(g => g.id === gid) || null;
        fullRender();
      } catch { _error = 'Помилка видалення'; fullRender(); }
    }
  },

  onGroupName(v)  { _editGroupName = v; },
  onRecipeName(v) { _editName = v; },
  onSteps(v)      { _editSteps = v; },

  onIngr(idx, field, v) {
    if (!_editIngredients[idx]) return;
    _editIngredients[idx][field] = field === 'qty' ? parseFloat(v) || 0 : v;
  },

  addIngr() {
    _editIngredients.push({ name: '', qty: '', unit: 'мл' });
    fullRender();
    setTimeout(() => {
      const rows = document.querySelectorAll('.rb-ingr-edit-row');
      rows[rows.length - 1]?.querySelector('input')?.focus();
    }, 50);
  },

  removeIngr(idx) {
    _editIngredients.splice(idx, 1);
    fullRender();
  },

  async saveGroup() {
    const name = _editGroupName.trim();
    if (!name) { _error = 'Введіть назву групи'; fullRender(); return; }
    _saving = true; _error = ''; fullRender();
    try {
      const isNew = !_editGroupId;
      const url = isNew ? `${API}/api/recipe-book/groups` : `${API}/api/recipe-book/groups/${_editGroupId}`;
      const res  = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify({ venueId: _venueId, name }) });
      const data = await res.json();
      if (data.success) { _screen = 'groups'; await loadGroups(); }
      else { _error = data.error || 'Помилка збереження'; }
    } catch { _error = 'Немає зʼєднання'; }
    _saving = false; fullRender();
  },

  async saveRecipe() {
    const name = _editName.trim();
    if (!name) { _error = 'Введіть назву рецепту'; fullRender(); return; }
    if (!_selGroup) return;
    const gid = _selGroup.id;
    _saving = true; _error = ''; fullRender();
    try {
      const isNew = !_editRecipeId;
      const url = isNew ? `${API}/api/recipe-book/recipes` : `${API}/api/recipe-book/recipes/${_editRecipeId}`;
      const body = { groupId: gid, venueId: _venueId, name, ingredients: _editIngredients.filter(i => String(i.name).trim()), steps: _editSteps };
      const res  = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        _screen = 'recipes';
        await loadGroups();
        _selGroup = _groups.find(g => g.id === gid) || null;
        fullRender();
      } else { _error = data.error || 'Помилка збереження'; }
    } catch { _error = 'Немає зʼєднання'; }
    _saving = false; fullRender();
  },
};

/* ── Page API ────────────────────────────────────── */
export function render() {
  _venueId = state.venueId;
  _token   = state.token;
  _role    = state.role || 'bartender';
  _screen  = 'groups';
  _groups  = [];
  _loading = true;
  _error   = '';
  _selGroup  = null;
  _selRecipe = null;
  _delConfirm = null;

  if (!document.getElementById('rb-css')) {
    const s = document.createElement('style');
    s.id = 'rb-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  return `<div id="rb-root" style="display:flex;flex-direction:column;flex:1;height:100%">
    <div class="rb-loading-wrap">Завантаження…</div>
  </div>`;
}

export function init() {
  loadGroups();
}

export default { render, init };
