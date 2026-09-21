/* ============================================================
   BarOps — shared/kyiv.js
   Київський час на фронті. Дзеркало barops-backend/src/lib/kyiv.js —
   тримайте однаковими, інакше телефон і сервер розійдуться в даті.

   Навіщо: по сторінках стояло жорстке «+3 години». Влітку це збігається з
   Києвом, а в ніч на 25.10.2026 Київ стає UTC+02:00 — і межа доби з'їжджає
   на 23:00, тобто в пік зміни. Зсув треба ПИТАТИ, а не знати.
   ============================================================ */

const TZ = 'Europe/Kiev';

// Київська дата 'YYYY-MM-DD' для моменту (за замовчуванням — зараз)
export function kyivYmd(at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at);
}

// Київський час 'HH:MM'
export function kyivHhmm(at = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(at);
}

// Київська година 0-23.
// hour12:false у частині старих ICU дає «24» замість «00» — звідси % 24.
export function kyivHour(at = new Date()) {
  const h = parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', hour12: false,
  }).format(at), 10);
  return (Number.isFinite(h) ? h : 0) % 24;
}

// Зсув Києва на цей момент у мілісекундах (+2 год узимку, +3 влітку)
export function kyivOffsetMs(at = new Date()) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(at).find(p => p.type === 'timeZoneName').value;      // напр. 'GMT+03:00'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 3 * 3600 * 1000;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * ((+m[2]) * 3600 + (+m[3]) * 60) * 1000;
}

// Київська дата, зсунута на N КАЛЕНДАРНИХ діб ('YYYY-MM-DD').
//
// Не те саме, що kyivYmd(now − N×24год): між «зараз» і ціллю може лежати перехід
// зони, і тоді 13 діб ≠ 13×24 години. Відніманням годин виходить не та дата —
// напр. 05.11 о 23:30 з days=−14 дало б 24.10 замість 23.10.
export function kyivYmdShift(days, at = new Date()) {
  const d = new Date(`${kyivYmd(at)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Київський настінний рядок ('YYYY-MM-DD' або 'YYYY-MM-DDTHH:mm:ss') → момент часу.
//
// Два кроки, бо зсув залежить від самого результату: перша спроба дає момент,
// друга уточнює його зсувом, порахованим уже для цього моменту.
export function kyivInstant(wall) {
  const s = String(wall).length === 10 ? `${wall}T00:00:00` : String(wall).slice(0, 19);
  const asUTC = new Date(`${s}Z`).getTime();
  if (!Number.isFinite(asUTC)) throw new Error(`kyivInstant: не зрозумів дату «${wall}»`);
  const t1 = asUTC - kyivOffsetMs(new Date(asUTC));
  return new Date(asUTC - kyivOffsetMs(new Date(t1)));
}

// Початок київської доби (00:00) як момент часу.
export function kyivDayStart(at = new Date()) { return kyivInstant(kyivYmd(at)); }

// Бізнес-доба: зміна триває за північ, тож доба «перевертається» о 06:00, а не
// опівночі. Підрахунок, закінчений о 03:00, належить попередньому дню.
// Дзеркало businessDayStartUTC на бекенді.
export const BUSINESS_DAY_START_HOUR = 6;
export function kyivBusinessYmd(at = new Date(), hour = BUSINESS_DAY_START_HOUR) {
  try {
    const ymd = kyivYmd(at);
    if (kyivHour(at) >= hour) return ymd;
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  } catch {
    // дуже старий рушій без зон в Intl — лишаємось на попередній поведінці
    return new Date(at.getTime() - hour * 3600 * 1000).toISOString().slice(0, 10);
  }
}
