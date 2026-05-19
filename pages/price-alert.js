/* ============================================================
   BarOps — pages/price-alert.js
   Алерт ціни:
   • Бармен  — push-preview → hero-алерт → графік → вплив на FC → рішення
   • Менеджер — огляд → вкладки Аналіз / Динаміка / Фудкост → кнопки рішення
   ============================================================ */

import { navigate, state } from '../shared/app.js';

/* ════════════════════════
   DATA  — поточний алерт (JW Black +18%)
════════════════════════ */
const ALERT = {
  product:    'Johnnie Walker Black 0.7л',
  emoji:      '🥃',
  supplier:   'Баядера Логістик',
  invoice:    '№2841',
  date:       '08.05.2026',
  oldPrice:   681,
  newPrice:   816,
  delta:      '+18%',
  qty:        6,
  affectedRecipes: [
    { emoji:'🥃', name:'Old Fashioned',  vol:'60 мл', oldFc:18.2, newFc:21.5, sell:295, status:'warn' },
    { emoji:'🌿', name:'Whiskey Sour',   vol:'45 мл', oldFc:15.8, newFc:18.6, sell:265, status:'ok'   },
    { emoji:'🍹', name:'Highball',       vol:'30 мл', oldFc:10.1, newFc:11.9, sell:195, status:'ok'   },
  ],
};

const HISTORY_PREV = [
  { emoji:'🍊', name:'Aperol 1л',            date:'01.05.2026', supplier:'Клас І К',    delta:'+18%', prices:'295 → 348 ₴', color:'var(--amber)' },
  { emoji:'🌿', name:"Hendrick's Gin",        date:'15.03.2026', supplier:'Баядера',      delta:'−5%',  prices:'860 → 817 ₴', color:'var(--green)' },
  { emoji:'🥃', name:'Johnnie Walker Black',  date:'10.02.2026', supplier:'Баядера',      delta:'+9%',  prices:'624 → 681 ₴', color:'var(--amber)' },
];

const PRICE_HISTORY_MGR = [
  { date:'08.05.2026', note:'Поточна накладна', delta:'+18%', prices:'681 → 816 ₴', color:'var(--amber)', icon:'📈', bg:'var(--amber-bg)' },
  { date:'20.04.2026', note:'Баядера Логістик', delta:'= 0%',  prices:'681 ₴',       color:'var(--text2)', icon:'📋', bg:'var(--bg4)'      },
  { date:'05.04.2026', note:'Баядера Логістик', delta:'= 0%',  prices:'681 ₴',       color:'var(--text2)', icon:'📋', bg:'var(--bg4)'      },
  { date:'10.02.2026', note:'Баядера Логістик', delta:'+9%',   prices:'624 → 681 ₴', color:'var(--amber)', icon:'📈', bg:'var(--amber-bg)' },
  { date:'18.01.2026', note:'Баядера Логістик', delta:'= 0%',  prices:'624 ₴',       color:'var(--text2)', icon:'📋', bg:'var(--bg4)'      },
  { date:'03.11.2025', note:'Баядера Логістик', delta:'−5%',   prices:'657 → 624 ₴', color:'var(--green)', icon:'📉', bg:'var(--green-bg)' },
];

/* ════════════════════════
   MODULE STATE
════════════════════════ */
let _selectedDecision = null;  // 1 | 2 | 3
let _confirmed        = false;
let _mgrTab           = 'analysis'; // 'analysis' | 'history' | 'impact'

/* ════════════════════════
   CSS
════════════════════════ */
const CSS = `<style id="pa-css">
.pa-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative}
.pa-scroll{overflow-y:auto;flex:1}.pa-scroll::-webkit-scrollbar{width:0}

/* topbar */
.pa-topbar{display:flex;align-items:center;gap:12px;padding:8px 20px 12px;flex-shrink:0}
.pa-back{width:36px;height:36px;border-radius:12px;background:var(--bg2);border:0.5px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.pa-back:active{background:rgba(255,255,255,.08)}
.pa-title{font-family:var(--font-h);font-size:16px;font-weight:600;color:var(--text0);letter-spacing:-.02em}
.pa-sub{font-size:11px;color:var(--text2);margin-top:1px;font-family:var(--font-b)}
.pa-notif-btn{position:relative;width:36px;height:36px;background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:50%;display:flex;align-items:center;justify-content:center}
.pa-notif-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:var(--amber);border-radius:50%;border:2px solid var(--bg1);display:flex;align-items:center;justify-content:center;font-size:9px;font-family:var(--font-h);font-weight:700;color:#fff}

/* sec label */
.pa-sec{font-size:10px;color:var(--text2);letter-spacing:.10em;text-transform:uppercase;padding:12px 20px 8px;font-family:var(--font-b);display:flex;justify-content:space-between;align-items:center}
.pa-sec-link{font-size:11px;color:var(--amber);letter-spacing:0;text-transform:none;cursor:pointer;background:none;border:none;font-family:var(--font-b)}

/* ── PUSH PREVIEW ── */
.pa-push{margin:0 20px 12px;background:var(--bg1);border:0.5px solid var(--amber-border);border-radius:16px;padding:14px 15px;display:flex;align-items:flex-start;gap:12px;animation:paPop .5s cubic-bezier(.22,1,.36,1) both}
@keyframes paPop{from{opacity:0;transform:scale(.95) translateY(-8px)}to{opacity:1;transform:none}}
.pa-push-icon{width:40px;height:40px;border-radius:12px;background:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;overflow:hidden}
.pa-push-icon::before{display:none}
.pa-push-icon svg{position:relative;z-index:1}
.pa-push-app{font-size:11px;color:var(--text2);font-family:var(--font-b);letter-spacing:.04em;text-transform:uppercase}
.pa-push-time{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.pa-push-title{font-family:var(--font-h);font-size:14px;font-weight:700;color:var(--amber);margin:4px 0 3px;letter-spacing:-.01em}
.pa-push-text{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.45}
.pa-push-btns{display:flex;gap:6px;margin-top:10px}
.pa-push-btn{flex:1;height:32px;border-radius:8px;font-size:12px;font-family:var(--font-b);cursor:pointer;border:none;transition:all .14s;display:flex;align-items:center;justify-content:center}
.pa-push-open{background:var(--amber);color:#fff}.pa-push-open:active{background:#d48c20}
.pa-push-dismiss{background:rgba(255,255,255,.06);border:0.5px solid var(--border);color:var(--text2)}.pa-push-dismiss:active{background:var(--bg4)}

/* ── HERO ALERT ── */
.pa-hero{margin:0 20px 18px;background:var(--amber-bg);border:0.5px solid rgba(251,191,36,.28);border-radius:16px;padding:18px}
.pa-eyebrow{font-size:11px;color:var(--amber);letter-spacing:.10em;text-transform:uppercase;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.pa-product{font-size:19px;font-weight:600;letter-spacing:-.015em;margin-bottom:4px}
.pa-supplier{font-size:12px;color:var(--text2);margin-bottom:0}
.pa-price-row{display:flex;align-items:baseline;justify-content:space-between;margin-top:16px;padding:14px 0;border-top:0.5px solid rgba(251,191,36,.20);border-bottom:0.5px solid rgba(251,191,36,.20)}
.pa-price-blk{display:flex;flex-direction:column}
.pa-price-lbl{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.pa-price-old{font-size:24px;font-weight:500;letter-spacing:-.02em;color:var(--text2);text-decoration:line-through}
.pa-price-new{font-size:30px;font-weight:600;letter-spacing:-.02em;color:var(--amber)}
.pa-price-new-lbl{font-size:10px;color:var(--amber);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.pa-delta{padding:5px 10px;background:var(--amber);color:#000;font-size:14px;font-weight:700;border-radius:6px;align-self:center}
.pa-impact{margin-top:14px;font-size:12px;color:var(--text1);line-height:1.5}

/* ── CHART ── */
.pa-chart-card{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:16px}
.pa-cc-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.pa-cc-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0)}
.pa-cc-period{font-size:11px;color:var(--text2);font-family:var(--font-b)}
.pa-chart-area{height:100px;margin-bottom:8px}
.pa-chart-x{display:flex;justify-content:space-between;font-size:9px;color:var(--text2);font-family:var(--font-b);padding:0 4px}

/* ── FC IMPACT ── */
.pa-fc-card{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.pa-fc-title{font-family:var(--font-h);font-size:13px;font-weight:600;color:var(--text0);margin-bottom:12px}
.pa-recipe-row{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg3);border-radius:9px;margin-bottom:6px;border-left:2.5px solid transparent}
.pa-recipe-row:last-child{margin-bottom:0}
.pa-recipe-row.warn{border-left-color:var(--amber)}
.pa-rr-emoji{font-size:16px;flex-shrink:0}
.pa-rr-name{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.pa-rr-fc{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.pa-rr-val{font-family:var(--font-h);font-size:13px;font-weight:700;text-align:right}
.pa-rr-delta{font-size:10px;font-family:var(--font-b);margin-top:2px;text-align:right}

/* ── DECISION CARD ── */
.pa-decision-card{margin:0 20px 8px;border-radius:16px;overflow:hidden;border:0.5px solid var(--border)}
.pa-dc-header{background:var(--amber-bg);padding:12px 15px;display:flex;align-items:center;gap:8px}
.pa-dc-header-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--amber)}
.pa-dc-option{display:flex;align-items:flex-start;gap:12px;padding:13px 15px;background:var(--bg2);border-bottom:1px solid var(--border);cursor:pointer;transition:background .14s}
.pa-dc-option:last-child{border-bottom:none}
.pa-dc-option:active{background:rgba(255,255,255,.08)}
.pa-dc-option.sel{background:rgba(168,139,255,.08);border-left:3px solid var(--green)}
.pa-dc-num{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--border3);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:11px;font-weight:700;color:var(--text2);flex-shrink:0;margin-top:1px;transition:all .15s}
.pa-dc-option.sel .pa-dc-num{background:var(--green);border-color:var(--green);color:#000}
.pa-dc-opt-title{font-size:13px;color:var(--text0);font-family:var(--font-b);font-weight:500}
.pa-dc-opt-sub{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:2px;line-height:1.4}

/* ── HISTORY LIST ── */
.pa-hist-card{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;overflow:hidden}
.pa-hist-row{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border)}
.pa-hist-row:last-child{border-bottom:none}
.pa-hist-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px}
.pa-hist-prod{font-size:13px;color:var(--text1);font-family:var(--font-b)}
.pa-hist-date{font-size:11px;color:var(--text2);font-family:var(--font-b);margin-top:1px}
.pa-hist-delta{font-family:var(--font-h);font-size:14px;font-weight:700;text-align:right}
.pa-hist-prices{font-size:10px;color:var(--text2);font-family:var(--font-b);margin-top:2px;text-align:right}

/* ── SUCCESS OVERLAY ── */
.pa-success{position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.82);display:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;text-align:center}
.pa-success.open{display:flex;animation:paFade .3s ease}
@keyframes paFade{from{opacity:0}to{opacity:1}}
.pa-succ-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:18px;animation:paPop .4s cubic-bezier(.22,1,.36,1)}
.pa-succ-title{font-family:var(--font-h);font-size:20px;font-weight:700;color:var(--text0);margin-bottom:8px;letter-spacing:-.02em}
.pa-succ-sub{font-size:13px;color:var(--text2);font-family:var(--font-b);line-height:1.6;max-width:280px;margin-bottom:24px}
.pa-succ-btn{width:100%;max-width:280px;height:50px;border:none;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;transition:all .18s}

/* ── ACTIONS BAR ── */
.pa-actions{padding:8px 20px 20px;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.pa-btn{width:100%;height:52px;border:none;border-radius:13px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-h);display:flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;letter-spacing:.02em}
.pa-btn-amber{background:var(--amber);color:#fff;box-shadow:0 4px 20px rgba(251,191,36,.22)}
.pa-btn-amber:active{background:#d48c20}
.pa-btn-ghost{background:var(--bg2);border:0.5px solid var(--border);color:var(--text1)}
.pa-btn-ghost:active{background:rgba(255,255,255,.08)}

/* ── MANAGER HEADER ── */
.pa-mgr-header{margin:0 20px 10px;background:var(--amber-bg);border:0.5px solid rgba(251,191,36,.28);border-radius:16px;padding:18px}
.pa-mgr-badge{display:inline-flex;align-items:center;gap:6px;background:var(--amber);border-radius:20px;padding:4px 12px;font-size:11px;color:#fff;font-family:var(--font-b);font-weight:500;margin-bottom:10px}
.pa-mgr-badge-dot{width:6px;height:6px;border-radius:50%;background:#fff;animation:paBlink .8s ease-in-out infinite}
@keyframes paBlink{0%,100%{opacity:1}50%{opacity:.35}}
.pa-mgr-prod{font-family:var(--font-h);font-size:20px;font-weight:800;color:var(--text0);letter-spacing:-.02em;margin-bottom:2px}
.pa-mgr-supp{font-size:12px;color:var(--text2);font-family:var(--font-b);margin-bottom:14px}
.pa-mgr-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.pa-mgr-blk{background:var(--bg2);border-radius:9px;padding:10px;text-align:center;border:0.5px solid var(--border)}
.pa-mgr-val{font-family:var(--font-h);font-size:18px;font-weight:700;line-height:1}
.pa-mgr-lbl{font-size:9px;color:var(--text2);margin-top:4px;font-family:var(--font-b);text-transform:uppercase;letter-spacing:.05em;line-height:1.3}

/* manager tabs */
.pa-mgr-tabs{display:flex;gap:2px;margin:0 20px 10px;background:var(--bg1);border:0.5px solid var(--border);border-radius:9px;padding:3px}
.pa-mt{flex:1;height:28px;border-radius:7px;border:none;background:transparent;font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font-b);transition:all .15s}
.pa-mt.act{background:var(--bg3);color:var(--text0)}

/* analysis card */
.pa-analysis-card{margin:0 20px 8px;background:var(--bg1);border:0.5px solid var(--border);border-radius:16px;padding:14px 16px}
.pa-anal-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}
.pa-anal-row:last-child{border-bottom:none}
.pa-anal-lbl{font-size:12px;color:var(--text2);font-family:var(--font-b)}
.pa-anal-val{font-size:13px;color:var(--text0);font-family:var(--font-b);text-align:right}
.pa-anal-val.up{color:var(--amber);font-family:var(--font-h);font-weight:600}
.pa-anal-val.ok{color:var(--green)}
.pa-anal-val.bad{color:var(--red)}

/* AI recommendation */
.pa-ai-rec{margin:0 20px 8px;background:var(--purple-bg);border:0.5px solid var(--purple-border);border-radius:16px;padding:14px 15px;display:flex;gap:11px}
.pa-ai-icon{width:34px;height:34px;border-radius:10px;background:rgba(127,119,221,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pa-ai-title{font-family:var(--font-h);font-size:13px;font-weight:700;color:var(--text0);margin-bottom:6px}
.pa-ai-text{font-size:12px;color:var(--text1);font-family:var(--font-b);line-height:1.55}
.pa-ai-opts{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.pa-ai-opt{font-size:11px;padding:5px 12px;border-radius:20px;cursor:pointer;font-family:var(--font-b);border:none;transition:all .15s}
.pa-ai-opt-primary{background:var(--purple);color:#fff}.pa-ai-opt-primary:active{background:#6560cc}
.pa-ai-opt-secondary{background:rgba(255,255,255,.06);border:0.5px solid var(--border);color:var(--text1)}.pa-ai-opt-secondary:active{background:var(--bg4)}

/* manager decision buttons */
.pa-mgr-btns{display:flex;gap:8px;padding:8px 20px 20px;flex-shrink:0}
.pa-db{flex:1;height:50px;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-family:var(--font-b);font-weight:500;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:6px}
.pa-db:active{transform:scale(.97)}
.pa-db-accept{background:var(--green);color:#000}.pa-db-accept:active{opacity:.85}
.pa-db-recalc{background:var(--amber-bg);border:1px solid var(--amber-border);color:var(--amber)}
.pa-db-reject{background:var(--bg2);border:0.5px solid var(--border);color:var(--text2)}
</style>`;

/* ════════════════════════
   CHART SVG
════════════════════════ */
const CHART_SVG = (gradId) => `
<svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(251,191,36,.25)"/>
      <stop offset="100%" stop-color="rgba(251,191,36,.0)"/>
    </linearGradient>
  </defs>
  <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <text x="2" y="18" font-size="7" fill="rgba(160,156,149,.5)" font-family="DM Sans">850</text>
  <text x="2" y="48" font-size="7" fill="rgba(160,156,149,.5)" font-family="DM Sans">720</text>
  <text x="2" y="78" font-size="7" fill="rgba(160,156,149,.5)" font-family="DM Sans">600</text>
  <path d="M22,78 L62,72 L102,68 L142,70 L182,67 L222,65 L262,65 L302,22 L302,100 L22,100 Z" fill="url(#${gradId})"/>
  <path d="M22,78 L62,72 L102,68 L142,70 L182,67 L222,65 L262,65 L302,22" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${[22,62,102,142,182,222,262].map(x=>`<circle cx="${x}" cy="${[78,72,68,70,67,65,65][[22,62,102,142,182,222,262].indexOf(x)]}" r="3" fill="var(--amber)" opacity=".7"/>`).join('')}
  <circle cx="302" cy="22" r="5" fill="var(--amber)" stroke="var(--bg2)" stroke-width="2"/>
  <rect x="258" y="6" width="48" height="14" rx="4" fill="rgba(251,191,36,.15)" stroke="rgba(251,191,36,.30)" stroke-width=".5"/>
  <text x="282" y="16" font-size="8" fill="var(--amber)" font-family="Syne" font-weight="700" text-anchor="middle">816 ₴</text>
  <line x1="302" y1="22" x2="302" y2="100" stroke="rgba(251,191,36,.20)" stroke-width="1" stroke-dasharray="3,3"/>
</svg>`;

/* ════════════════════════
   BARTENDER RENDER
════════════════════════ */
function renderBartender() {
  const decisionLabels = {
    1:'Підтвердити нову ціну',
    2:'Зберегти та сповістити менеджера',
    3:'Позначити як помилку',
  };
  const btnLabel = _confirmed
    ? '✓ Рішення прийнято'
    : _selectedDecision ? decisionLabels[_selectedDecision] : 'Підтвердити рішення';

  return `
  <div class="pa-topbar" style="flex-shrink:0">
    <div class="pa-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="pa-title">Алерт ціни</div>
      <div class="pa-sub">Зміна закупівельної ціни</div>
    </div>
    <div class="pa-notif-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a5 5 0 00-5 5c0 5.5-2 7-2 7h14s-2-1.5-2-7a5 5 0 00-5-5z" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M9.7 13a2 2 0 01-3.4 0" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div class="pa-notif-badge">1</div>
    </div>
  </div>

  <div class="pa-scroll">

    <!-- Push preview -->
    <div class="pa-push">
      <div class="pa-push-icon">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <path d="M7 4h14l-4 10H11L7 4z" stroke="white" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
          <path d="M11 14v8M17 14v8M9 22h10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span class="pa-push-app">BarOps</span>
          <span class="pa-push-time">щойно</span>
        </div>
        <div class="pa-push-title">⚠ Ціна зросла на 18%</div>
        <div class="pa-push-text">${ALERT.product} — ${ALERT.newPrice} ₴ замість ${ALERT.oldPrice} ₴. Перевірте накладну ${ALERT.invoice}</div>
        <div class="pa-push-btns">
          <button class="pa-push-btn pa-push-open">Переглянути</button>
          <button class="pa-push-btn pa-push-dismiss" onclick="window.__barops.navigate('dashboard')">Закрити</button>
        </div>
      </div>
    </div>

    <!-- Hero alert -->
    <div class="pa-hero">
      <div class="pa-eyebrow">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--amber);flex-shrink:0"></span>
        Підвищення ціни
      </div>
      <div class="pa-product">${ALERT.product}</div>
      <div class="pa-supplier">${ALERT.supplier} · ${ALERT.invoice}</div>
      <div class="pa-price-row">
        <div class="pa-price-blk">
          <div class="pa-price-lbl">Було</div>
          <div class="pa-price-old">${ALERT.oldPrice} ₴</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="flex-shrink:0;align-self:center">
          <path d="M4 10h12M12 5l5 5-5 5" stroke="var(--amber)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="pa-price-blk">
          <div class="pa-price-new-lbl">Стало</div>
          <div class="pa-price-new">${ALERT.newPrice} ₴</div>
        </div>
        <div class="pa-delta">${ALERT.delta}</div>
      </div>
      <div class="pa-impact">
        Вплине на <span style="color:var(--text0);font-weight:500">${ALERT.affectedRecipes.length} коктейлі</span>.
        Old Fashioned: FC ${ALERT.affectedRecipes[0].oldFc}% → ${ALERT.affectedRecipes[0].newFc}%
      </div>
    </div>

    <!-- Chart -->
    <div class="pa-sec">Динаміка ціни — 6 місяців</div>
    <div class="pa-chart-card">
      <div class="pa-cc-hdr">
        <div class="pa-cc-title">${ALERT.product}</div>
        <div class="pa-cc-period">Жовт — Травень</div>
      </div>
      <div class="pa-chart-area">${CHART_SVG('paGrad1')}</div>
      <div class="pa-chart-x"><span>Жов</span><span>Лис</span><span>Гру</span><span>Січ</span><span>Лют</span><span>Бер</span><span>Кві</span><span>Тра</span></div>
    </div>

    <!-- FC Impact -->
    <div class="pa-sec">Вплив на собівартість коктейлів</div>
    <div class="pa-fc-card">
      <div class="pa-fc-title">Рецепти з ${ALERT.emoji} ${ALERT.product.split(' ').slice(0,2).join(' ')}</div>
      ${ALERT.affectedRecipes.map(r => {
        const col   = r.newFc > 22 ? 'var(--red)' : r.newFc > 18 ? 'var(--amber)' : 'var(--text0)';
        const delta = (r.newFc - r.oldFc).toFixed(1);
        return `
        <div class="pa-recipe-row ${r.status==='warn'?'warn':''}">
          <div class="pa-rr-emoji">${r.emoji}</div>
          <div style="flex:1;min-width:0">
            <div class="pa-rr-name">${r.name}</div>
            <div class="pa-rr-fc">${r.vol} · FC було ${r.oldFc}% → тепер</div>
          </div>
          <div>
            <div class="pa-rr-val" style="color:${col}">${r.newFc}%</div>
            <div class="pa-rr-delta" style="color:${col}">↑ +${delta}%</div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Decision -->
    <div class="pa-sec">Що робити?</div>
    <div class="pa-decision-card">
      <div class="pa-dc-header">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 12H1L7 1z" stroke="var(--amber)" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 5v3M7 10v.4" stroke="var(--amber)" stroke-width="1.2" stroke-linecap="round"/></svg>
        <div class="pa-dc-header-title">Підтвердіть або оскаржте ціну</div>
      </div>
      ${[
        [1, 'Підтвердити нову ціну',             'Накладна збережена, ціна оновиться в базі. Менеджер отримає сповіщення для перегляду фудкосту.'],
        [2, 'Зберегти та сповістити менеджера',   'Накладна збережена, але рішення щодо ціни залишається за менеджером.'],
        [3, 'Позначити як помилку',              'Якщо ціна в накладній — помилка постачальника. Менеджер зверниться до постачальника.'],
      ].map(([n,title,sub]) => `
      <div class="pa-dc-option ${_selectedDecision===n?'sel':''}" onclick="window.__pa.selectDecision(${n})">
        <div class="pa-dc-num">${_selectedDecision===n?'✓':n}</div>
        <div>
          <div class="pa-dc-opt-title">${title}</div>
          <div class="pa-dc-opt-sub">${sub}</div>
        </div>
      </div>`).join('')}
    </div>

    <!-- History -->
    <div class="pa-sec">
      Попередні алерти
      <button class="pa-sec-link">Всі →</button>
    </div>
    <div class="pa-hist-card">
      ${HISTORY_PREV.map(h => `
      <div class="pa-hist-row">
        <div class="pa-hist-icon" style="background:${h.color==='var(--green)'?'var(--green-bg)':h.color==='var(--amber)'?'var(--amber-bg)':'var(--red-bg)'}">${h.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="pa-hist-prod">${h.name}</div>
          <div class="pa-hist-date">${h.date} · ${h.supplier}</div>
        </div>
        <div>
          <div class="pa-hist-delta" style="color:${h.color}">${h.delta.startsWith('-')?'↓ ':'↑ '}${h.delta}</div>
          <div class="pa-hist-prices">${h.prices}</div>
        </div>
      </div>`).join('')}
    </div>

    <div style="height:14px"></div>
  </div>

  <div class="pa-actions">
    <button class="pa-btn ${_selectedDecision?'pa-btn-amber':'pa-btn-ghost'}" id="pa-confirm-btn"
            onclick="window.__pa.confirmDecision()">
      ${btnLabel}
    </button>
    <button class="pa-btn pa-btn-ghost" onclick="alert('Запит надіслано менеджеру...')">Запитати менеджера</button>
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="pa-success ${_confirmed?'open':''}" id="pa-success">
    <div class="pa-succ-icon" style="background:var(--green-bg);border:1px solid var(--green-border)">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M6 16l7 7 13-13" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="pa-succ-title">Рішення прийнято</div>
    <div class="pa-succ-sub" id="pa-succ-text">Ваш вибір збережено і надіслано менеджеру</div>
    <button class="pa-succ-btn" style="background:var(--amber);color:#fff"
            onclick="window.__barops.navigate('dashboard')">
      На головний екран
    </button>
    <button class="pa-succ-btn" style="background:var(--bg2);border:0.5px solid var(--border);color:var(--text1)"
            onclick="window.__pa.resetSuccess()">
      Переглянути ще раз
    </button>
  </div>`;
}

/* ════════════════════════
   MANAGER RENDER
════════════════════════ */
function mgrTabContent() {
  if (_mgrTab === 'analysis') return `
  <div class="pa-analysis-card">
    ${[
      ['Різниця на 6 пляшок у накладній',       `+${(ALERT.newPrice-ALERT.oldPrice)*ALERT.qty} ₴`, 'up'],
      ['Поточний місячний обіг товару',          '~24 пляшки/міс',    ''],
      ['Збільшення місячних витрат',             `+${(ALERT.newPrice-ALERT.oldPrice)*24} ₴/міс`, 'up'],
      ['Old Fashioned — новий FC',               '21.5% (ліміт 22%)', 'bad'],
      ['Whiskey Sour — новий FC',                '18.6%',             'up'],
      ['Альтернативні постачальники',            '2 знайдено',        'ok'],
      ['Остання зміна ціни',                     '10.02.2026 (+9%)',  ''],
    ].map(([lbl,val,cls]) => `
    <div class="pa-anal-row">
      <div class="pa-anal-lbl">${lbl}</div>
      <div class="pa-anal-val ${cls}">${val}</div>
    </div>`).join('')}
  </div>
  <div class="pa-ai-rec">
    <div class="pa-ai-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="var(--purple)" stroke-width="1.2"/>
        <path d="M8 5a2 2 0 011.7 3c-.3.5-.7.8-.7 1.5v.5" stroke="var(--purple)" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="8" cy="12" r=".6" fill="var(--purple)"/>
      </svg>
    </div>
    <div style="flex:1">
      <div class="pa-ai-title">Рекомендація AI</div>
      <div class="pa-ai-text">
        Зростання на 18% — вище за середнє по ринку (8–12%). <strong style="color:var(--text0)">Рекомендую підняти ціну на Old Fashioned на 20–25 ₴</strong> (до 315–320 ₴) та перевірити пропозицію альтернативного постачальника RMAX (+3% від поточної ціни Баядери).
      </div>
      <div class="pa-ai-opts">
        <button class="pa-ai-opt pa-ai-opt-primary" onclick="alert('Порівняння постачальників...')">Порівняти постачальників</button>
        <button class="pa-ai-opt pa-ai-opt-secondary" onclick="alert('Калькулятор меню...')">Перерахувати меню</button>
      </div>
    </div>
  </div>
  <div class="pa-sec">Динаміка ціни</div>
  <div class="pa-chart-card">
    <div class="pa-cc-hdr"><div class="pa-cc-title">${ALERT.product}</div><div class="pa-cc-period">6 місяців</div></div>
    <div class="pa-chart-area">${CHART_SVG('paGrad2')}</div>
    <div class="pa-chart-x"><span>Жов</span><span>Лис</span><span>Гру</span><span>Січ</span><span>Лют</span><span>Бер</span><span>Кві</span><span>Тра</span></div>
  </div>
  <div style="height:14px"></div>`;

  if (_mgrTab === 'history') return `
  <div class="pa-sec">Вся історія цін — ${ALERT.product}</div>
  <div class="pa-hist-card">
    ${PRICE_HISTORY_MGR.map(h => `
    <div class="pa-hist-row">
      <div class="pa-hist-icon" style="background:${h.bg};font-size:14px">${h.icon}</div>
      <div style="flex:1;min-width:0">
        <div class="pa-hist-prod">${h.date} · ${h.note}</div>
      </div>
      <div>
        <div class="pa-hist-delta" style="color:${h.color}">${h.delta}</div>
        <div class="pa-hist-prices">${h.prices}</div>
      </div>
    </div>`).join('')}
  </div>
  <div style="height:14px"></div>`;

  // impact tab
  return `
  <div class="pa-sec">Вплив на фудкост рецептів</div>
  <div class="pa-fc-card">
    <div class="pa-fc-title">Необхідно переглянути ціни меню</div>
    ${ALERT.affectedRecipes.map(r => {
      const col   = r.newFc > 22 ? 'var(--red)' : r.newFc > 18 ? 'var(--amber)' : 'var(--text0)';
      const note  = r.newFc > 22 ? 'Ліміт: 22%' : r.newFc > 18 ? 'Норма: ≤20%' : 'В нормі';
      return `
      <div class="pa-recipe-row ${r.status==='warn'?'warn':''}">
        <div class="pa-rr-emoji">${r.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="pa-rr-name">${r.name}</div>
          <div class="pa-rr-fc">${r.vol} · Продажна ціна: ${r.sell} ₴</div>
        </div>
        <div>
          <div class="pa-rr-val" style="color:${col}">${r.newFc}%</div>
          <div class="pa-rr-delta" style="color:${col}">${note}</div>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div style="padding:0 20px;margin-bottom:8px">
    <button style="width:100%;height:46px;font-size:14px;background:var(--green);color:#000;border:none;border-radius:14px;cursor:pointer;font-family:var(--font-h);font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px" onclick="alert('Перерахунок цін меню...')">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Перерахувати ціни меню
    </button>
  </div>
  <div style="height:14px"></div>`;
}

function renderManager() {
  return `
  <div class="pa-topbar" style="flex-shrink:0">
    <div class="pa-back" onclick="window.__barops.navigate('dashboard')">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13L5 8l5-5" stroke="var(--text1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="flex:1">
      <div class="pa-title">Алерт ціни</div>
      <div class="pa-sub">Менеджер · Перегляд</div>
    </div>
    <div style="background:var(--amber-bg);border:1px solid var(--amber-border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--amber);font-family:var(--font-b)">Нове</div>
  </div>

  <div class="pa-scroll">
    <!-- Manager alert header -->
    <div class="pa-mgr-header">
      <div class="pa-mgr-badge"><div class="pa-mgr-badge-dot"></div>Потребує рішення</div>
      <div class="pa-mgr-prod">${ALERT.emoji} ${ALERT.product.split(' ').slice(0,3).join(' ')}</div>
      <div class="pa-mgr-supp">${ALERT.supplier} · Накл. ${ALERT.invoice} · Олексій К. підтвердив накладну</div>
      <div class="pa-mgr-grid">
        <div class="pa-mgr-blk">
          <div class="pa-mgr-val" style="color:var(--text2)">${ALERT.oldPrice} ₴</div>
          <div class="pa-mgr-lbl">Стара<br/>ціна</div>
        </div>
        <div class="pa-mgr-blk" style="border-color:var(--amber-border)">
          <div class="pa-mgr-val" style="color:var(--amber)">${ALERT.newPrice} ₴</div>
          <div class="pa-mgr-lbl">Нова<br/>ціна</div>
        </div>
        <div class="pa-mgr-blk" style="border-color:var(--red-border)">
          <div class="pa-mgr-val" style="color:var(--red)">${ALERT.delta}</div>
          <div class="pa-mgr-lbl">Зміна<br/>ціни</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="pa-mgr-tabs">
      <button class="pa-mt ${_mgrTab==='analysis'?'act':''}" onclick="window.__pa.setMgrTab('analysis')">Аналіз</button>
      <button class="pa-mt ${_mgrTab==='history'?'act':''}"  onclick="window.__pa.setMgrTab('history')">Динаміка</button>
      <button class="pa-mt ${_mgrTab==='impact'?'act':''}"   onclick="window.__pa.setMgrTab('impact')">Фудкост</button>
    </div>

    ${mgrTabContent()}
  </div>

  <div class="pa-mgr-btns">
    <button class="pa-db pa-db-accept" onclick="window.__pa.mgrDecision('accept')">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Підтвердити
    </button>
    <button class="pa-db pa-db-recalc" onclick="window.__pa.mgrDecision('recalc')">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M7 2l4 4.5-4 4.5" stroke="var(--amber)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Меню ↑
    </button>
    <button class="pa-db pa-db-reject" onclick="window.__pa.mgrDecision('reject')">Помилка</button>
  </div>`;
}

/* ════════════════════════
   MAIN BUILD
════════════════════════ */
function buildHTML() {
  const body = state.role === 'manager' ? renderManager() : renderBartender();
  return `${CSS}<div class="pa-wrap">${body}</div>`;
}
function fullRender() {
  const v = document.getElementById('app-view');
  if (v) v.innerHTML = buildHTML();
}

/* ════════════════════════
   ACTIONS
════════════════════════ */
function selectDecision(n) {
  _selectedDecision = n;
  // Fast partial update — re-render decision options only
  fullRender();
}

function confirmDecision() {
  if (!_selectedDecision) {
    // Flash the card
    const card = document.querySelector('.pa-decision-card');
    if (card) {
      card.style.borderColor = 'var(--red)';
      setTimeout(() => card.style.borderColor = '', 900);
    }
    return;
  }
  const msgs = {
    1: 'Нова ціна підтверджена. Фудкост перераховано. Менеджер отримає сповіщення.',
    2: 'Накладна збережена. Менеджер перегляне і прийме рішення щодо ціни.',
    3: 'Відмічено як помилку постачальника. Менеджер зверниться до Баядера Логістик.',
  };
  _confirmed = true;
  fullRender();
  const el = document.getElementById('pa-succ-text');
  if (el) el.textContent = msgs[_selectedDecision];
}

function resetSuccess() {
  _confirmed = false;
  fullRender();
}

function setMgrTab(tab) {
  _mgrTab = tab;
  fullRender();
}

function mgrDecision(type) {
  const msgs = {
    accept: '✓ Ціну підтверджено. Фудкост перераховано автоматично.',
    recalc: '↑ Запущено перерахунок цін меню для підтримки фудкосту.',
    reject: '⚠ Ціну позначено як помилку. Бармен та постачальник отримають сповіщення.',
  };
  alert(msgs[type]);
}

/* ════════════════════════
   PAGE MODULE EXPORT
════════════════════════ */
export default {
  render() {
    _selectedDecision = null;
    _confirmed        = false;
    _mgrTab           = 'analysis';
    return buildHTML();
  },
  init() {
    window.__pa = {
      selectDecision, confirmDecision, resetSuccess,
      setMgrTab, mgrDecision,
    };
  },
};
