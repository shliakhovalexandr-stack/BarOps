/* ============================================================
   BarOps — pages/profile.js
   Профіль бармена: особиста інформація + KPI + налаштування
   ============================================================ */

import { navigate, state, setRole } from '../shared/app.js';

/* ════════════════════════
   DATA
════════════════════════ */
const PROFILE = {
  name:    'Олексій Коваленко',
  role:    'Бармен',
  venue:   'Sky Lounge',
  phone:   '+380 67 234 11 22',
  email:   'oleksiy@skylounge.ua',
  since:   '12.01.2025',
  avatar:  '🧑',
};

const KPI_MONTH = [
  { label:'Змін відпрацьовано', val:'18',   sub:'з 20 запланованих',      color:'var(--green)',  pct:90 },
  { label:'Задачі чеклисту',    val:'94%',  sub:'середнє за місяць',       color:'var(--green)',  pct:94 },
  { label:'Накладних OCR',      val:'12',   sub:'точність 96.8%',          color:'var(--teal)',   pct:80 },
  { label:'Списань',            val:'8',    sub:'3 бої · 4 псув · 1 дег',  color:'var(--amber)',  pct:60 },
  { label:'Алертів ціни',       val:'3',    sub:'всі підтверджено',        color:'var(--purple)', pct:40 },
  { label:'Рейтинг',            val:'4.8',  sub:'з 5.0 від менеджера',     color:'var(--gold)',   pct:96 },
];

const RECENT_SHIFTS = [
  { date:'08.05.2026', type:'Вечірня', tasks:'7/9',  status:'Активна',  color:'var(--green)'  },
  { date:'07.05.2026', type:'Денна',   tasks:'9/9',  status:'✓ Закрита',color:'var(--text2)'  },
  { date:'06.05.2026', type:'Вечірня', tasks:'8/9',  status:'✓ Закрита',color:'var(--text2)'  },
  { date:'05.05.2026', type:'Нічна',   tasks:'6/9',  status:'⚠ Проблеми',color:'var(--amber)' },
];

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="prof-css">
.prof-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden}
.prof-scroll{overflow-y:auto;flex:1}.prof-scroll::-webkit-scrollbar{width:0}

/* hero */
.prof-hero{padding:20px 20px 18px;background:linear-gradient(160deg,var(--green-bg) 0%,transparent 60%);border-bottom:0.5px solid var(--border2)}
.prof-avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.prof-avatar{width:68px;height:68px;border-radius:50%;background:var(--bg2);border:2px solid var(--green-border);display:flex;align-items:center;justify-content:center;font-size:28px;position:relative;flex-shrink:0}
.prof-live-ring{position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--green);opacity:.7;animation:profPulse 2s ease-in-out infinite}
@keyframes profPulse{0%,100%{opacity:.7}50%{opacity:.2}}
.prof-name{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;line-height:1}
.prof-role{font-size:12px;color:var(--green);font-family:var(--font-b);margin-top:4px}
.prof-venue{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px}
.prof-since{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.prof-stats-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.prof-stat{background:rgba(0,0,0,.3);border-radius:9px;padding:10px 8px;text-align:center;border:0.5px solid var(--border)}
.prof-stat-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.prof-stat-lbl{font-size:9px;color:var(--text2);margin-top:3px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* sec */
.prof-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:14px 18px 8px;font-family:var(--font-b)}

/* kpi grid */
.prof-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px}
.prof-kpi{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:14px;position:relative;overflow:hidden}
.prof-kpi-val{font-family:var(--font-h);font-size:24px;font-weight:800;line-height:1;letter-spacing:-.02em}
.prof-kpi-lbl{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:4px;text-transform:uppercase;letter-spacing:.04em;line-height:1.3}
.prof-kpi-sub{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:3px}
.prof-kpi-bar{height:3px;background:var(--bg3);border-radius:2px;margin-top:8px;overflow:hidden}
.prof-kpi-fill{height:100%;border-radius:2px}

/* contact card */
.prof-info-card{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-info-row{display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border-bottom:0.5px solid var(--border)}
.prof-info-row:last-child{border-bottom:none}
.prof-info-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.prof-info-val{font-size:13px;color:var(--text0);font-family:var(--font-b)}

/* shifts */
.prof-shifts{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-shift-row{display:flex;align-items:center;gap:10px;padding:10px 15px;border-bottom:0.5px solid var(--border)}
.prof-shift-row:last-child{border-bottom:none}
.prof-shift-date{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.prof-shift-type{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.prof-shift-tasks{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);min-width:32px;text-align:right}
.prof-shift-status{font-size:11px;font-family:var(--font-b);margin-top:2px;text-align:right}

/* settings */
.prof-settings{margin:0 14px 8px;background:var(--bg2);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.prof-setting-row{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .12s}
.prof-setting-row:last-child{border-bottom:none}
.prof-setting-row:active{background:var(--bg3)}
.prof-setting-lbl{font-size:13px;color:var(--text0);font-family:var(--font-b)}
.prof-setting-val{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.prof-toggle{width:36px;height:20px;border-radius:10px;background:var(--bg4);border:0.5px solid var(--border2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0}
.prof-toggle.on{background:var(--green);border-color:var(--green)}
.prof-toggle-knob{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.prof-toggle.on .prof-toggle-knob{left:18px}

/* logout */
.prof-logout{margin:0 14px 14px;width:calc(100% - 28px);height:50px;background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:12px;font-size:14px;color:var(--red);cursor:pointer;font-family:var(--font-b);font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.prof-logout:active{background:rgba(226,75,74,.15)}

/* role switch demo */
.prof-role-switch{margin:0 14px 8px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px}
.prof-rs-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0)}
.prof-rs-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);line-height:1.5}
.prof-rs-btns{display:flex;gap:8px}
.prof-rs-btn{flex:1;height:38px;border:none;border-radius:9px;font-size:12px;font-family:var(--font-b);cursor:pointer;transition:all .15s}
.prof-rs-btn.active{background:var(--green);color:#fff}
.prof-rs-btn.inactive{background:var(--bg3);border:0.5px solid var(--border2);color:var(--text1)}
.prof-rs-btn:active{transform:scale(.97)}
</style>`;

/* ════════════════════════
   RENDER
════════════════════════ */
function buildHTML() {
  const isBartender = state.role === 'bartender';

  return `
${CSS}
<div class="prof-wrap">
  <div class="prof-scroll">

    <!-- Hero -->
    <div class="prof-hero">
      <div class="prof-avatar-row">
        <div class="prof-avatar">
          <div class="prof-live-ring"></div>
          ${PROFILE.avatar}
        </div>
        <div>
          <div class="prof-name">${state.user || PROFILE.name}</div>
          <div class="prof-role">${isBartender ? '🍸 Бармен' : '👨‍💼 Менеджер'}</div>
          <div class="prof-venue">${state.venue}</div>
          <div class="prof-since">У команді з ${PROFILE.since}</div>
        </div>
      </div>
      <div class="prof-stats-row">
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:var(--green)">18</div>
          <div class="prof-stat-lbl">Змін<br/>цього міс.</div>
        </div>
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:var(--green)">94%</div>
          <div class="prof-stat-lbl">Задачі<br/>чеклист</div>
        </div>
        <div class="prof-stat">
          <div class="prof-stat-val" style="color:var(--gold)">4.8</div>
          <div class="prof-stat-lbl">Рейтинг<br/>менеджера</div>
        </div>
      </div>
    </div>

    <!-- KPI місяця -->
    <div class="prof-sec">KPI за травень 2026</div>
    <div class="prof-kpi-grid">
      ${KPI_MONTH.map(k => `
      <div class="prof-kpi">
        <div class="prof-kpi-val" style="color:${k.color}">${k.val}</div>
        <div class="prof-kpi-lbl">${k.label}</div>
        <div class="prof-kpi-sub">${k.sub}</div>
        <div class="prof-kpi-bar">
          <div class="prof-kpi-fill" style="width:${k.pct}%;background:${k.color}"></div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Останні зміни -->
    <div class="prof-sec">Останні зміни</div>
    <div class="prof-shifts">
      ${RECENT_SHIFTS.map(s => `
      <div class="prof-shift-row">
        <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div class="prof-shift-date">${s.date}</div>
          <div class="prof-shift-type">${s.type} зміна</div>
        </div>
        <div>
          <div class="prof-shift-tasks">${s.tasks}</div>
          <div class="prof-shift-status" style="color:${s.color}">${s.status}</div>
        </div>
      </div>`).join('')}
    </div>

    <!-- Контакти -->
    <div class="prof-sec">Контактна інформація</div>
    <div class="prof-info-card">
      <div class="prof-info-row">
        <div class="prof-info-lbl">📞 Телефон</div>
        <div class="prof-info-val">${PROFILE.phone}</div>
      </div>
      <div class="prof-info-row">
        <div class="prof-info-lbl">✉️ Email</div>
        <div class="prof-info-val" style="font-size:12px">${PROFILE.email}</div>
      </div>
      <div class="prof-info-row">
        <div class="prof-info-lbl">🏢 Заклад</div>
        <div class="prof-info-val">${state.venue}</div>
      </div>
    </div>

    <!-- Сповіщення -->
    <div class="prof-sec">Сповіщення</div>
    <div class="prof-settings">
      ${[
        ['Push-сповіщення', true],
        ['Алерти ціни', true],
        ['Нагадування про інвентаризацію', true],
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

    <!-- Зміна ролі (демо) -->
    <div class="prof-sec">Демо — зміна ролі</div>
    <div class="prof-role-switch">
      <div class="prof-rs-title">Переключити роль</div>
      <div class="prof-rs-sub">Для демонстрації функцій різних ролей в одному додатку</div>
      <div class="prof-rs-btns">
        <button class="prof-rs-btn ${isBartender?'active':'inactive'}"
                onclick="window.__barops.setRole('bartender')">🍸 Бармен</button>
        <button class="prof-rs-btn ${!isBartender?'active':'inactive'}"
                onclick="window.__barops.setRole('manager')">👨‍💼 Менеджер</button>
      </div>
    </div>

    <!-- Вихід -->
    <button class="prof-logout" onclick="window.__barops.navigate('auth')">
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

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() { return buildHTML(); },
  init()   {},
};
