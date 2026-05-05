/* ============================================================
   BarOps — pages/team.js
   Команда: список барменів, запрошення, профіль, права доступу
   Доступно тільки менеджеру
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const TEAM = [
  {
    id:'t1', name:'Олексій Коваленко', emoji:'🧑', role:'Бармен',
    phone:'+380 67 234 11 22', email:'oleksiy@skylounge.ua',
    since:'12.01.2025', shifts:94, tasksAvg:87, writeoffs:8,
    live:true, status:'active',
    skills:['Класика','Сигнатури','Інвентаризація','OCR накладних'],
    lastShift:'08.05.2026 · Вечірня · В процесі',
    stats:{ tasks:87, writeoffs:8, alerts:5, shifts:94 },
  },
  {
    id:'t2', name:'Марія Петренко', emoji:'👩', role:'Бармен',
    phone:'+380 50 345 22 33', email:'mariia@skylounge.ua',
    since:'03.06.2024', shifts:148, tasksAvg:99, writeoffs:2,
    live:false, status:'active',
    skills:['Класика','Мокейлі','Дегустації','Навчання'],
    lastShift:'07.05.2026 · Денна · Закрита ✓',
    stats:{ tasks:99, writeoffs:2, alerts:1, shifts:148 },
  },
  {
    id:'t3', name:'Дмитро Іванець', emoji:'🧔', role:'Бармен',
    phone:'+380 98 456 33 44', email:'dmytro@skylounge.ua',
    since:'18.11.2025', shifts:41, tasksAvg:68, writeoffs:14,
    live:false, status:'attention',
    skills:['Класика'],
    lastShift:'05.05.2026 · Нічна · Незавершено ⚠',
    stats:{ tasks:68, writeoffs:14, alerts:9, shifts:41 },
  },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _openId      = null;   // profile open
let _inviteOpen  = false;

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="tm-css">
.tm-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.tm-scroll{overflow-y:auto;flex:1}.tm-scroll::-webkit-scrollbar{width:0}

/* topbar */
.tm-topbar{display:flex;align-items:center;gap:12px;padding:8px 18px 12px;flex-shrink:0}
.tm-back{width:36px;height:36px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.tm-back:active{background:var(--bg3)}
.tm-title{font-family:var(--font-h);font-size:17px;font-weight:700;color:var(--text0);letter-spacing:-.02em}
.tm-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}

/* sec label */
.tm-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 18px 8px;font-family:var(--font-b)}

/* summary strip */
.tm-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:0 14px 10px}
.tm-stat{background:var(--bg2);border:0.5px solid var(--border);border-radius:12px;padding:12px;text-align:center}
.tm-stat-val{font-family:var(--font-h);font-size:22px;font-weight:700;line-height:1}
.tm-stat-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* team cards */
.tm-list{padding:0 14px;display:flex;flex-direction:column;gap:8px}
.tm-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .15s}
.tm-card:active{background:var(--bg3)}
.tm-card.attention{border-color:var(--amber-border)}
.tm-card-main{display:flex;align-items:center;gap:12px;padding:14px}
.tm-avatar{width:46px;height:46px;border-radius:50%;background:var(--bg3);border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;position:relative}
.tm-live-ring{position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--green);animation:tmRing 2s ease-in-out infinite}
@keyframes tmRing{0%,100%{opacity:1}50%{opacity:.4}}
.tm-name{font-family:var(--font-h);font-size:15px;font-weight:700;color:var(--text0);letter-spacing:-.01em}
.tm-role-line{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.tm-right{text-align:right;flex-shrink:0}
.tm-tasks-val{font-family:var(--font-h);font-size:18px;font-weight:700}
.tm-tasks-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.tm-card-footer{display:flex;gap:0;border-top:0.5px solid var(--border)}
.tm-fstat{flex:1;padding:9px 8px;text-align:center;border-right:0.5px solid var(--border)}
.tm-fstat:last-child{border-right:none}
.tm-fstat-val{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0)}
.tm-fstat-lbl{font-size:9px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-transform:uppercase;letter-spacing:.04em}

/* add/invite */
.tm-invite-btn{display:flex;align-items:center;gap:12px;padding:14px;margin:0 14px;background:var(--green-bg);border:0.5px dashed var(--green-border);border-radius:14px;cursor:pointer;transition:all .15s}
.tm-invite-btn:hover{background:rgba(29,158,117,.12)}
.tm-invite-icon{width:38px;height:38px;border-radius:11px;background:rgba(29,158,117,.12);border:0.5px solid var(--green-border);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tm-invite-text{font-size:14px;color:var(--green);font-family:var(--font-b);font-weight:500}
.tm-invite-sub{font-size:11px;color:rgba(29,158,117,.5);font-family:var(--font-b);margin-top:1px}

/* ── PROFILE OVERLAY ── */
.tm-profile{position:absolute;inset:0;z-index:50;background:var(--bg1);display:none;flex-direction:column;animation:tmSlide .3s cubic-bezier(.22,1,.36,1)}
.tm-profile.open{display:flex}
@keyframes tmSlide{from{transform:translateX(100%);opacity:.5}to{transform:none;opacity:1}}

/* profile hero */
.tm-ph-hero{padding:16px 18px;background:linear-gradient(160deg,var(--green-bg) 0%,transparent 60%);border-bottom:0.5px solid var(--border2);flex-shrink:0}
.tm-ph-back{display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer}
.tm-ph-back-arrow{width:32px;height:32px;border-radius:50%;background:var(--bg2);border:0.5px solid var(--border2);display:flex;align-items:center;justify-content:center}
.tm-ph-back-lbl{font-size:13px;color:var(--text2);font-family:var(--font-b)}
.tm-ph-top{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.tm-ph-avatar{width:60px;height:60px;border-radius:50%;background:var(--bg2);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;position:relative}
.tm-ph-name{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;line-height:1}
.tm-ph-role{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-top:4px}
.tm-ph-since{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.tm-ph-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.tm-ph-stat{background:rgba(0,0,0,.3);border-radius:9px;padding:9px 6px;text-align:center;border:0.5px solid var(--border)}
.tm-ph-val{font-family:var(--font-h);font-size:16px;font-weight:700;line-height:1}
.tm-ph-lbl{font-size:8px;color:var(--text2);margin-top:3px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.04em;line-height:1.3}

/* profile sections */
.tm-ph-scroll{overflow-y:auto;flex:1}.tm-ph-scroll::-webkit-scrollbar{width:0}
.tm-ph-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:13px 18px 8px;font-family:var(--font-b)}
.tm-ph-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;overflow:hidden}
.tm-ph-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:0.5px solid var(--border)}
.tm-ph-row:last-child{border-bottom:none}
.tm-ph-row-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.tm-ph-row-val{font-size:13px;color:var(--text0);font-family:var(--font-b)}

/* skills */
.tm-skills{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px}
.tm-skill{background:var(--bg3);border:0.5px solid var(--border2);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--text1);font-family:var(--font-b)}

/* access toggles */
.tm-access-row{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:0.5px solid var(--border)}
.tm-access-row:last-child{border-bottom:none}
.tm-access-lbl{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.tm-access-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.tm-toggle{width:36px;height:20px;border-radius:10px;background:var(--bg4);border:0.5px solid var(--border2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.tm-toggle.on{background:var(--green);border-color:var(--green)}
.tm-toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.tm-toggle.on .tm-toggle-knob{left:18px}

/* profile actions */
.tm-ph-actions{padding:8px 14px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.tm-btn{width:100%;height:50px;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s}
.tm-btn-green{background:var(--green);color:#fff;box-shadow:0 4px 16px rgba(29,158,117,.2)}.tm-btn-green:active{background:var(--green-d)}
.tm-btn-ghost{background:var(--bg2);border:0.5px solid var(--border2);color:var(--text1)}.tm-btn-ghost:active{background:var(--bg3)}
.tm-btn-red{background:var(--red-bg);border:0.5px solid var(--red-border);color:var(--red)}.tm-btn-red:active{background:rgba(226,75,74,.15)}

/* ── INVITE SHEET ── */
.tm-invite-overlay{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);display:none;flex-direction:column;justify-content:flex-end}
.tm-invite-overlay.open{display:flex;animation:tmOvFade .2s ease}
@keyframes tmOvFade{from{opacity:0}to{opacity:1}}
.tm-invite-sheet{background:var(--bg2);border-radius:22px 22px 0 0;border-top:0.5px solid var(--border2);padding:0 18px 32px;animation:tmSheetUp .3s cubic-bezier(.22,1,.36,1)}
@keyframes tmSheetUp{from{transform:translateY(100%)}to{transform:none}}
.tm-inv-handle{width:36px;height:3px;background:var(--bg4);border-radius:2px;margin:14px auto 18px}
.tm-inv-title{font-family:var(--font-h);font-size:18px;font-weight:700;color:var(--text0);margin-bottom:6px;letter-spacing:-.02em}
.tm-inv-sub{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:18px;line-height:1.5}
.tm-inv-lbl{font-size:10px;color:var(--text2);letter-spacing:.07em;text-transform:uppercase;font-family:var(--font-b);margin-bottom:5px}
.tm-inv-inp{width:100%;height:48px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:12px;padding:0 14px;font-size:14px;color:var(--text0);font-family:var(--font-b);outline:none;transition:border-color .2s;margin-bottom:10px}
.tm-inv-inp:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(29,158,117,.1)}
.tm-inv-inp::placeholder{color:var(--text2)}
.tm-inv-roles{display:flex;gap:6px;margin-bottom:18px}
.tm-inv-role{flex:1;height:40px;background:var(--bg3);border:0.5px solid var(--border2);border-radius:9px;font-size:12px;color:var(--text1);cursor:pointer;font-family:var(--font-b);transition:all .15s;display:flex;align-items:center;justify-content:center}
.tm-inv-role.sel{background:var(--green-bg);border-color:var(--green-border);color:var(--green)}
.tm-inv-send{width:100%;height:52px;background:var(--green);border:none;border-radius:12px;font-size:15px;font-weight:500;color:#fff;cursor:pointer;font-family:var(--font-h);transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}
.tm-inv-send:active{background:var(--green-d)}
.tm-inv-cancel{width:100%;height:40px;background:transparent;border:none;font-size:13px;color:var(--text2);cursor:pointer;font-family:var(--font-b)}
</style>`;

/* ════════════════════════
   LIST VIEW
════════════════════════ */
function taskColor(pct) {
  return pct >= 90 ? 'var(--green)' : pct >= 75 ? 'var(--text0)' : 'var(--amber)';
}

function teamListHTML() {
  const active = TEAM.filter(t => t.status === 'active').length;
  return `
  <!-- Summary -->
  <div class="tm-summary">
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:var(--green)">${TEAM.length}</div>
      <div class="tm-stat-lbl">Барменів<br/>у команді</div>
    </div>
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:var(--green)">${active}</div>
      <div class="tm-stat-lbl">Активних<br/>профілів</div>
    </div>
    <div class="tm-stat">
      <div class="tm-stat-val" style="color:var(--amber)">1</div>
      <div class="tm-stat-lbl">Потребує<br/>уваги</div>
    </div>
  </div>

  <!-- Team cards -->
  <div class="tm-list">
    ${TEAM.map(t => `
    <div class="tm-card ${t.status==='attention'?'attention':''}"
         onclick="window.__tm.openProfile('${t.id}')">
      <div class="tm-card-main">
        <div class="tm-avatar">
          ${t.live ? '<div class="tm-live-ring"></div>' : ''}
          ${t.emoji}
        </div>
        <div style="flex:1;min-width:0">
          <div class="tm-name">${t.name}</div>
          <div class="tm-role-line">
            ${t.live
              ? `<span style="color:var(--green);display:inline-flex;align-items:center;gap:4px">
                   <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);animation:tmRing 2s ease-in-out infinite"></span>
                   Активна зміна
                 </span>`
              : `${t.role} · з ${t.since}`}
          </div>
          <div style="font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px">${t.lastShift}</div>
        </div>
        <div class="tm-right">
          <div class="tm-tasks-val" style="color:${taskColor(t.tasksAvg)}">${t.tasksAvg}%</div>
          <div class="tm-tasks-lbl">задач</div>
        </div>
      </div>
      <div class="tm-card-footer">
        <div class="tm-fstat">
          <div class="tm-fstat-val" style="color:var(--text0)">${t.stats.shifts}</div>
          <div class="tm-fstat-lbl">Змін</div>
        </div>
        <div class="tm-fstat">
          <div class="tm-fstat-val" style="color:${taskColor(t.tasksAvg)}">${t.stats.tasks}%</div>
          <div class="tm-fstat-lbl">Задачі</div>
        </div>
        <div class="tm-fstat">
          <div class="tm-fstat-val" style="color:${t.stats.writeoffs>10?'var(--red)':t.stats.writeoffs>5?'var(--amber)':'var(--text0)'}">${t.stats.writeoffs}</div>
          <div class="tm-fstat-lbl">Списань</div>
        </div>
        <div class="tm-fstat">
          <div class="tm-fstat-val" style="color:${t.stats.alerts>5?'var(--amber)':'var(--text0)'}">${t.stats.alerts}</div>
          <div class="tm-fstat-lbl">Алертів</div>
        </div>
      </div>
    </div>`).join('')}

    <!-- Invite -->
    <div class="tm-invite-btn" onclick="window.__tm.openInvite()">
      <div class="tm-invite-icon">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="tm-invite-text">Запросити бармена</div>
        <div class="tm-invite-sub">Надіслати посилання або email-запрошення</div>
      </div>
    </div>
  </div>
  <div style="height:16px"></div>`;
}

/* ════════════════════════
   PROFILE VIEW
════════════════════════ */
function profileHTML(t) {
  if (!t) return '';
  const col = taskColor(t.tasksAvg);

  const ACCESS = [
    { lbl:'Інвентаризація',    sub:'Проведення та перегляд', on:true  },
    { lbl:'Замовлення',        sub:'Подача заявок менеджеру', on:true  },
    { lbl:'Списання',          sub:'Фіксація і перегляд',     on:true  },
    { lbl:'OCR накладних',     sub:'Сканування та підтвердження', on:true },
    { lbl:'Рецепти та FC',     sub:'Тільки перегляд',         on:true  },
    { lbl:'Звіти',             sub:'Недоступно для барменів',  on:false },
    { lbl:'Налаштування',      sub:'Недоступно',               on:false },
  ];

  return `
  <div class="tm-ph-scroll">
    <!-- Hero -->
    <div class="tm-ph-hero">
      <div class="tm-ph-back" onclick="window.__tm.closeProfile()">
        <div class="tm-ph-back-arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 12L4 7l5-5" stroke="var(--text1)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="tm-ph-back-lbl">Назад до команди</div>
      </div>
      <div class="tm-ph-top">
        <div class="tm-ph-avatar">
          ${t.live ? '<div style="position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--green);opacity:.7"></div>' : ''}
          ${t.emoji}
        </div>
        <div>
          <div class="tm-ph-name">${t.name}</div>
          <div class="tm-ph-role">${t.role} · ${t.live ? '🟢 Активна зміна' : '⚪ Не в зміні'}</div>
          <div class="tm-ph-since">У команді з ${t.since}</div>
        </div>
      </div>
      <div class="tm-ph-stats">
        <div class="tm-ph-stat">
          <div class="tm-ph-val" style="color:var(--text0)">${t.stats.shifts}</div>
          <div class="tm-ph-lbl">Змін</div>
        </div>
        <div class="tm-ph-stat">
          <div class="tm-ph-val" style="color:${col}">${t.stats.tasks}%</div>
          <div class="tm-ph-lbl">Задачі</div>
        </div>
        <div class="tm-ph-stat">
          <div class="tm-ph-val" style="color:${t.stats.writeoffs>10?'var(--red)':t.stats.writeoffs>5?'var(--amber)':'var(--text0)'}">${t.stats.writeoffs}</div>
          <div class="tm-ph-lbl">Списань</div>
        </div>
        <div class="tm-ph-stat">
          <div class="tm-ph-val" style="color:${t.stats.alerts>5?'var(--amber)':'var(--text0)'}">${t.stats.alerts}</div>
          <div class="tm-ph-lbl">Алертів</div>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <div class="tm-ph-sec">Контакти</div>
    <div class="tm-ph-card">
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">📞 Телефон</div>
        <div class="tm-ph-row-val">${t.phone}</div>
      </div>
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">✉️ Email</div>
        <div class="tm-ph-row-val" style="font-size:12px">${t.email}</div>
      </div>
      <div class="tm-ph-row">
        <div class="tm-ph-row-lbl">📅 Остання зміна</div>
        <div class="tm-ph-row-val" style="font-size:11px;text-align:right">${t.lastShift}</div>
      </div>
    </div>

    <!-- Skills -->
    <div class="tm-ph-sec">Навички</div>
    <div class="tm-ph-card">
      <div class="tm-skills">
        ${t.skills.map(s => `<div class="tm-skill">${s}</div>`).join('')}
      </div>
    </div>

    <!-- Performance mini-chart -->
    <div class="tm-ph-sec">Ефективність (останні 4 тижні)</div>
    <div class="tm-ph-card" style="padding:14px">
      <div style="display:flex;align-items:flex-end;gap:8px;height:50px;margin-bottom:6px">
        ${[82,78,91,t.tasksAvg].map((v,i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:100%;height:${v/100*100}%;border-radius:4px 4px 0 0;background:${i===3?'var(--green)':'var(--green)'};opacity:${i===3?1:.5}"></div>
          <div style="font-size:9px;color:var(--text2);font-family:var(--font-b)">${['Тж1','Тж2','Тж3','Зараз'][i]}</div>
        </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text2);font-family:var(--font-b);text-align:center">
        Середнє виконання задач: <strong style="color:${col}">${t.tasksAvg}%</strong>
      </div>
    </div>

    <!-- Access -->
    <div class="tm-ph-sec">Права доступу</div>
    <div class="tm-ph-card">
      ${ACCESS.map(a => `
      <div class="tm-access-row">
        <div>
          <div class="tm-access-lbl">${a.lbl}</div>
          <div class="tm-access-sub">${a.sub}</div>
        </div>
        <div class="tm-toggle ${a.on?'on':''}" onclick="this.classList.toggle('on');this.querySelector('.tm-toggle-knob').style.left=this.classList.contains('on')?'18px':'2px'">
          <div class="tm-toggle-knob" style="left:${a.on?18:2}px"></div>
        </div>
      </div>`).join('')}
    </div>

    <div style="height:8px"></div>
  </div>

  <div class="tm-ph-actions">
    <button class="tm-btn tm-btn-green" onclick="alert('Повідомлення відправлено ${t.name}')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1.5l12-1-4 11L7 8 1 1.5zM7 8l5-8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Надіслати повідомлення
    </button>
    <button class="tm-btn tm-btn-ghost" onclick="alert('Права доступу збережено')">Зберегти права доступу</button>
    <button class="tm-btn tm-btn-red" onclick="window.__tm.confirmRemove('${t.id}')">Видалити з команди</button>
  </div>`;
}

/* ════════════════════════
   INVITE SHEET
════════════════════════ */
function inviteSheetHTML() {
  return `
  <div class="tm-invite-overlay ${_inviteOpen?'open':''}" id="tm-invite-overlay"
       onclick="window.__tm.closeInviteOverlay(event)">
    <div class="tm-invite-sheet" onclick="event.stopPropagation()">
      <div class="tm-inv-handle"></div>
      <div class="tm-inv-title">Запросити бармена</div>
      <div class="tm-inv-sub">Новий бармен отримає посилання для реєстрації та автоматично приєднається до вашого закладу</div>

      <div class="tm-inv-lbl">Ім'я та прізвище</div>
      <input class="tm-inv-inp" type="text" placeholder="Ім'я Прізвище"/>

      <div class="tm-inv-lbl">Email або телефон</div>
      <input class="tm-inv-inp" type="text" placeholder="email@example.com або +380..."/>

      <div class="tm-inv-lbl" style="margin-bottom:6px">Роль</div>
      <div class="tm-inv-roles">
        <div class="tm-inv-role sel" onclick="window.__tm.selectRole(this)">🍸 Бармен</div>
        <div class="tm-inv-role" onclick="window.__tm.selectRole(this)">📋 Стажер</div>
        <div class="tm-inv-role" onclick="window.__tm.selectRole(this)">👨‍💼 Менеджер</div>
      </div>

      <button class="tm-inv-send" onclick="window.__tm.sendInvite()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1.5l12-1-4 11L7 8 1 1.5zM7 8l5-8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Надіслати запрошення
      </button>
      <button class="tm-inv-cancel" onclick="window.__tm.closeInvite()">Скасувати</button>
    </div>
  </div>`;
}

/* ════════════════════════
   BUILD HTML
════════════════════════ */
function buildHTML() {
  const openMember = _openId ? TEAM.find(t => t.id === _openId) : null;
  return `
${CSS}
<div class="tm-wrap">
  <!-- Topbar -->
  <div class="tm-topbar">
    <div class="tm-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="tm-title">Команда</div>
      <div class="tm-sub">${state.venue} · ${TEAM.length} барменів</div>
    </div>
    <button onclick="window.__tm.openInvite()"
      style="height:34px;padding:0 14px;background:var(--green);border:none;border-radius:20px;font-size:12px;font-family:var(--font-b);color:#fff;cursor:pointer;font-weight:500;display:flex;align-items:center;gap:5px">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
      Запросити
    </button>
  </div>

  <!-- List -->
  <div class="tm-scroll">
    ${teamListHTML()}
  </div>

  <!-- Profile overlay -->
  <div class="tm-profile ${_openId?'open':''}" id="tm-profile">
    ${openMember ? profileHTML(openMember) : ''}
  </div>

  <!-- Invite sheet -->
  ${inviteSheetHTML()}
</div>`;
}

function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function openProfile(id)  { _openId = id; fullRender(); }
function closeProfile()   { _openId = null; fullRender(); }

function openInvite()  { _inviteOpen = true;  fullRender(); }
function closeInvite() { _inviteOpen = false; fullRender(); }
function closeInviteOverlay(e) {
  if (e.target === document.getElementById('tm-invite-overlay')) closeInvite();
}
function selectRole(el) {
  document.querySelectorAll('.tm-inv-role').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
}
function sendInvite() {
  alert('✓ Запрошення надіслано! Бармен отримає посилання для реєстрації.');
  closeInvite();
}

function confirmRemove(id) {
  const member = TEAM.find(t => t.id === id);
  if (confirm(`Видалити ${member?.name} з команди?\nЦю дію не можна скасувати.`)) {
    closeProfile();
    alert(`${member?.name} видалено з команди`);
  }
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _openId     = null;
    _inviteOpen = false;
    return buildHTML();
  },
  init() {
    window.__tm = {
      openProfile, closeProfile,
      openInvite, closeInvite, closeInviteOverlay,
      selectRole, sendInvite, confirmRemove,
    };
  },
};
