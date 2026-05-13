/* ============================================================
   BarOps — pages/profile.js
   Профіль: реальні дані з /api/auth/me + /api/stats
   ============================================================ */

import { navigate, state } from '../shared/app.js';

const POS_SYSTEMS = {
  manual:     { name: 'Вручну',     icon: '✋', color: 'var(--text2)' },
  poster:     { name: 'Poster',     icon: '📋', color: '#e85d04' },
  syrve:      { name: 'Syrve',      icon: '🔗', color: 'var(--green)' },
  skyservice: { name: 'Skyservice', icon: '☁️', color: '#3b82f6' },
  palmabox:   { name: 'PalmaBox',   icon: '🌴', color: '#10b981' },
  profit:     { name: 'Profit',     icon: '💰', color: '#f59e0b' },
};

const API = 'https://barops-backend-production.up.railway.app';

let _profile = null;
let _stats   = null;
let _team    = null;
let _plan    = null;
let _loading = true;
let _posSettings = null;

function token() { return localStorage.getItem('barops_token') || ''; }

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="prof-css">
.prof-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.prof-scroll{overflow-y:auto;flex:1}.prof-scroll::-webkit-scrollbar{width:0}
.prof-hero{padding:20px 20px 18px;background:linear-gradient(160deg,var(--green-bg) 0%,transparent 60%);border-bottom:0.5px solid var(--border2)}
.prof-avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.prof-avatar{width:68px;height:68px;border-radius:50%;background:var(--bg2);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:28px;position:relative;flex-shrink:0}
.prof-live-ring{position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--green);opacity:.7;animation:profPulse 2s ease-in-out infinite}
@keyframes profPulse{0%,100%{opacity:.7}50%{opacity:.2}}
.prof-name{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;line-height:1}
.prof-role{font-size:12px;color:var(--green);font-family:var(--font-b);margin-top:4px}
.prof-venue{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.prof-stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.prof-stat{background:rgba(0,0,0,.3);border-radius:9px;padding:10px 8px;text-align:center;border:0.5px solid var(--border)}
.prof-stat-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.prof-stat-lbl{font-size:9px;color:var(--text2);margin-top:3px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}
.prof-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 18px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.prof-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px}
.prof-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden}
.prof-kpi-val{font-family:var(--font-h);font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.prof-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.04em;line-height:1.3}
.prof-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.prof-kpi-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.prof-kpi-fill{height:100%;border-radius:2px}
.prof-info-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-info-row{display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border-bottom:0.5px solid var(--border)}
.prof-info-row:last-child{border-bottom:none}
.prof-info-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.prof-info-val{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.prof-shifts{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-shift-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:0.5px solid var(--border)}
.prof-shift-row:last-child{border-bottom:none}
.prof-settings{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-setting-row{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.prof-setting-row:last-child{border-bottom:none}
.prof-setting-row:active{background:var(--bg3)}
.prof-setting-lbl{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.prof-toggle{width:36px;height:20px;border-radius:10px;background:var(--bg4);border:0.5px solid var(--border2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.prof-toggle.on{background:var(--green);border-color:var(--green)}
.prof-toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.prof-toggle.on .prof-toggle-knob{left:18px}
.prof-logout{margin:0 14px 14px;width:calc(100% - 28px);height:50px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:12px;font-size:14px;color:var(--red);cursor:pointer;font-family:var(--font-b);font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.prof-logout:active{background:rgba(226,75,74,.15)}
/* plan badge */
.prof-plan{margin:0 14px 8px;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
.prof-plan--trial{background:var(--amber-bg);border:0.5px solid var(--amber-border)}
.prof-plan--active{background:var(--green-bg);border:0.5px solid var(--green-border)}
.prof-plan--expired{background:var(--red-bg);border:0.5px solid var(--red-border)}
/* skel */
.prof-skel{background:var(--bg2);border-radius:12px;animation:pSkel 1.2s ease-in-out infinite}
@keyframes pSkel{0%,100%{opacity:.5}50%{opacity:1}}
</style>`;

/* ════════════════════════
   DATA LOADING
════════════════════════ */
async function loadData() {
  _loading = true;
  updateView();

  try {
    const venueId = localStorage.getItem('barops_venueId') || '';
    const [meRes, statsRes, planRes, posRes] = await Promise.all([
      fetch(`${API}/api/auth/me`,        { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/api/stats?venueId=${venueId}`,
                                          { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/api/register/plan`,   { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/api/pos/settings/${venueId}`, { headers: { Authorization: `Bearer ${token()}` } }),
    ]);

    if (meRes.ok)    { const d = await meRes.json();    _profile = d.user; }
    if (statsRes.ok) { const d = await statsRes.json(); _stats   = d.today; }
    if (planRes.ok)  { const d = await planRes.json();  _plan    = d; }
    if (posRes.ok)   { const d = await posRes.json();   _posSettings = d.settings; }

    // Якщо менеджер — завантажуємо команду
    if (state.role === 'manager') {
      const venueId = localStorage.getItem('barops_venueId') || '';
      const teamRes = await fetch(`${API}/api/auth/team?venueId=${venueId}`,
        { headers: { Authorization: `Bearer ${token()}` } });
      if (teamRes.ok) { const d = await teamRes.json(); _team = d.team; }
    }
  } catch (e) {
    console.error('[Profile] loadData:', e);
  }

  _loading = false;
  updateView();
}

function updateView() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   PLAN BADGE
════════════════════════ */
function planBadge() {
  if (!_plan) return '';
  const { plan, expired, daysLeft } = _plan;

  if (expired) {
    return `
    <div class="prof-plan prof-plan--expired">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="var(--red)" stroke-width="1.4"/>
        <path d="M10 6v4M10 13v.5" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--font-b)">Підписка закінчилась</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Оновіть план для продовження</div>
      </div>
      <div style="font-size:12px;color:var(--red);font-family:var(--font-b);cursor:pointer">Оновити →</div>
    </div>`;
  }

  if (plan === 'trial') {
    return `
    <div class="prof-plan prof-plan--trial">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="var(--amber)" stroke-width="1.4"/>
        <path d="M10 6v4l2.5 2.5" stroke="var(--amber)" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--amber);font-family:var(--font-b)">Trial · залишилось ${daysLeft} дн.</div>
        <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Повний функціонал активний</div>
      </div>
    </div>`;
  }

  return `
  <div class="prof-plan prof-plan--active">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="var(--green)" stroke-width="1.4"/>
      <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--green);font-family:var(--font-b)">${plan === 'basic' ? 'Basic' : 'Pro'} · активний</div>
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px">Діє ще ${daysLeft} дн.</div>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const isMgr  = state.role === 'manager';
  const name   = _profile?.name  || state.user  || '—';
  const email  = _profile?.email || '—';
  const phone  = _profile?.phone || '—';
  const venue  = state.venue || '—';

  if (_loading) {
    return `${CSS}
    <div class="prof-wrap">
      <div class="prof-scroll">
        <div style="padding:20px 14px;display:flex;flex-direction:column;gap:10px">
          <div class="prof-skel" style="height:120px"></div>
          <div class="prof-skel" style="height:60px"></div>
          <div class="prof-skel" style="height:180px"></div>
        </div>
      </div>
    </div>`;
  }

  const s = _stats;

  // KPI картки з реальних даних
  const mgrKpi = [
    { label:'Накладних сьогодні',  val: String(s?.invoices?.count ?? '—'),   sub: s ? `${Math.round(s.invoices?.total||0).toLocaleString('uk-UA')} ₴` : '—',      color:'var(--green)', pct: Math.min(100, (s?.invoices?.count||0)*10) },
    { label:'Команда закладу',     val: String(s?.teamCount ?? '—'),          sub: 'активних барменів',                                                              color:'var(--teal)',  pct: Math.min(100, (s?.teamCount||0)*20) },
    { label:'Списань сьогодні',    val: String(s?.writeoffs?.count ?? '—'),   sub: Object.entries(s?.writeoffs?.byCategory||{}).map(([k,v])=>`${k}: ${v}`).join(' · ') || 'немає', color:'var(--amber)', pct: Math.min(100, (s?.writeoffs?.count||0)*10) },
    { label:'Вартість запасів',    val: s ? `${Math.round((s.stockValue||0)/1000)}k ₴` : '—', sub: 'поточний залишок',                                              color:'var(--purple)',pct: 70 },
    { label:'Критичних залишків',  val: String(s?.critical?.length ?? '—'),   sub: s?.critical?.[0]?.name || 'все норм',                                            color: (s?.critical?.length > 0) ? 'var(--red)' : 'var(--green)', pct: Math.min(100, (s?.critical?.length||0)*20) },
    { label:'Активна зміна',       val: s?.shift ? '✓' : '—',                sub: s?.shift ? `${s.shift.user}` : 'немає',                                           color: s?.shift ? 'var(--green)' : 'var(--text2)', pct: s?.shift ? 100 : 0 },
  ];

  const barKpi = [
    { label:'Списань сьогодні',   val: String(s?.writeoffs?.count ?? '—'), sub: 'в поточну зміну',    color:'var(--amber)', pct: Math.min(100, (s?.writeoffs?.count||0)*20) },
    { label:'Накладних',          val: String(s?.invoices?.count ?? '—'),  sub: 'сьогодні',            color:'var(--green)', pct: Math.min(100, (s?.invoices?.count||0)*10) },
    { label:'Критичних залишків', val: String(s?.critical?.length ?? '—'), sub: s?.critical?.[0]?.name || 'все норм', color:(s?.critical?.length > 0)?'var(--red)':'var(--green)', pct:50 },
    { label:'Активна зміна',      val: s?.shift ? '✓' : '—',              sub: s?.shift ? 'відкрита' : 'не відкрита', color: s?.shift ? 'var(--green)' : 'var(--text2)', pct: s?.shift ? 100 : 0 },
  ];

  const kpi = isMgr ? mgrKpi : barKpi;

  return `
${CSS}
<div class="prof-wrap">
  <div class="prof-scroll">

    <!-- Hero -->
    <div class="prof-hero">
      <div class="prof-avatar-row">
        <div class="prof-avatar">
          ${isMgr ? '' : '<div class="prof-live-ring"></div>'}
          ${isMgr ? '👨‍💼' : '🧑'}
        </div>
        <div>
          <div class="prof-name">${name}</div>
          <div class="prof-role" style="color:${isMgr?'var(--amber)':'var(--green)'}">
            ${isMgr ? '👨‍💼 Менеджер' : '🍸 Бармен'}
          </div>
          <div class="prof-venue">${venue}</div>
          ${email !== '—' ? `<div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${email}</div>` : ''}
        </div>
      </div>
      <div class="prof-stats-row">
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:var(--green)">${s?.invoices?.count ?? '—'}</div>
          <div class="prof-stat-lbl">Накладних<br/>сьогодні</div>
        </div>
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:${(s?.writeoffs?.count > 0)?'var(--amber)':'var(--green)'}">${s?.writeoffs?.count ?? '—'}</div>
          <div class="prof-stat-lbl">Списань<br/>сьогодні</div>
        </div>
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:${(s?.critical?.length > 0)?'var(--red)':'var(--green)'}">${s?.critical?.length ?? '—'}</div>
          <div class="prof-stat-lbl">Алертів<br/>залишки</div>
        </div>
      </div>
    </div>

    <!-- План -->
    ${planBadge()}

    <!-- KPI -->
    <div class="prof-sec">Статистика сьогодні</div>
    <div class="prof-kpi-grid">
      ${kpi.map(k => `
      <div class="prof-kpi">
        <div class="prof-kpi-val" style="color:${k.color}">${k.val}</div>
        <div class="prof-kpi-lbl">${k.label}</div>
        <div class="prof-kpi-sub">${k.sub}</div>
        <div class="prof-kpi-bar">
          <div class="prof-kpi-fill" style="width:${k.pct}%;background:${k.color}"></div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Команда (тільки менеджер) -->
    ${isMgr && _team?.length ? `
    <div class="prof-sec">Команда закладу</div>
    <div class="prof-shifts">
      ${_team.slice(0, 5).map(m => {
        const isActive = m.status === 'active';
        const roleLbl  = m.role === 'MANAGER' ? 'Менеджер' : 'Бармен';
        const lastLogin = m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('uk-UA') : 'не входив';
        return `
        <div class="prof-shift-row">
          <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
            background:${isActive?'var(--green)':'var(--bg4)'};
            border:1.5px solid ${isActive?'var(--green)':'var(--border3)'}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:var(--text1);font-family:var(--font-b)">${m.name}</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px">${roleLbl} · ${m.phone || '—'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:${isActive?'var(--green)':'var(--text2)'};font-family:var(--font-b)">${isActive?'Активний':'Неактивний'}</div>
            <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${lastLogin}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Контакти -->
    <div class="prof-sec">Контактна інформація</div>
    <div class="prof-info-card">
      ${phone !== '—' ? `<div class="prof-info-row"><div class="prof-info-lbl">📞 Телефон</div><div class="prof-info-val">${phone}</div></div>` : ''}
      ${email !== '—' ? `<div class="prof-info-row"><div class="prof-info-lbl">✉️ Email</div><div class="prof-info-val" style="font-size:12px">${email}</div></div>` : ''}
      <div class="prof-info-row"><div class="prof-info-lbl">🏢 Заклад</div><div class="prof-info-val">${venue}</div></div>
      <div class="prof-info-row"><div class="prof-info-lbl">👤 Роль</div><div class="prof-info-val">${isMgr ? 'Менеджер' : 'Бармен'}</div></div>
    </div>

    <!-- POS-інтеграція -->
    ${isMgr ? posIntegrationBlock() : ''}

    <!-- Сповіщення -->
    <div class="prof-sec">Сповіщення</div>
    <div class="prof-settings">
      ${[
        ['Push-сповіщення', true],
        ['Цінові алерти', true],
        ['Списання барменів', isMgr],
        ['Закриття зміни', false],
      ].map(([lbl, on]) => `
      <div class="prof-setting-row">
        <div class="prof-setting-lbl">${lbl}</div>
        <div class="prof-toggle ${on?'on':''}"
          onclick="this.classList.toggle('on');this.querySelector('.prof-toggle-knob').style.left=this.classList.contains('on')?'18px':'2px'">
          <div class="prof-toggle-knob" style="left:${on?18:2}px"></div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Вихід -->
    <button class="prof-logout" onclick="window.__barops.logout()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 11l3-3-3-3M13 8H6" stroke="var(--red)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Вийти з акаунту
    </button>
    <div style="height:14px"></div>
  </div>
</div>`;
}

function posIntegrationBlock() {
  const pos = _posSettings;
  const currentType = pos?.posType || 'manual';
  const sys = POS_SYSTEMS[currentType] || POS_SYSTEMS.manual;
  const isConnected = pos?.posConnected;

  return `
  <div class="prof-sec">POS-інтеграція</div>
  <div class="prof-info-card" style="margin:0 14px 8px">
    <div class="prof-info-row">
      <div class="prof-info-lbl">Система</div>
      <div class="prof-info-val" style="display:flex;align-items:center;gap:6px">
        <span style="font-size:16px">${sys.icon}</span>
        <span style="color:${sys.color}">${sys.name}</span>
        ${isConnected ? '<span style="color:var(--green);font-size:11px">● підключено</span>' : '<span style="color:var(--text2);font-size:11px">○ не підключено</span>'}
      </div>
    </div>
    ${pos?.posUrl ? `<div class="prof-info-row"><div class="prof-info-lbl">URL</div><div class="prof-info-val" style="font-size:11px">${pos.posUrl}</div></div>` : ''}
    ${pos?.posLogin ? `<div class="prof-info-row"><div class="prof-info-lbl">Логін</div><div class="prof-info-val">${pos.posLogin}</div></div>` : ''}
  </div>
  <div style="margin:0 14px 14px">
    <button onclick="window.__barops.navigate('venue-edit')" 
      style="width:100%;height:48px;background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text0);cursor:pointer;font-family:var(--font-b)">
      ${isConnected ? '⚙️ Налаштування POS' : '🔗 Підключити POS-систему'}
    </button>
  </div>`;
}

export default {
  render() {
    _loading = true;
    _profile = null;
    _stats   = null;
    _plan    = null;
    _team    = null;
    _posSettings = null;
    loadData();
    return buildHTML();
  },
};
