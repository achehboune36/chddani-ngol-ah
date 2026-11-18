/** Local-date helpers. Dates are stored as YYYY-MM-DD in the runner's local time. */
export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export function todayIso(): string {
  return iso(new Date());
}
/** Monday of the week containing `s`. */
export function mondayOf(s: string): string {
  const d = parseIso(s);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return iso(d);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000);
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return parseIso(s).toLocaleDateString('en-GB', opts);
}
export function fmtRelDay(s: string): string {
  const diff = daysBetween(s, todayIso());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return parseIso(s).toLocaleDateString('en-GB', { weekday: 'long' });
  return fmtDate(s);
}

export function fmtDuration(sec: number): string {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
/** seconds per km -> "5:42" */
export function fmtPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '–';
  const r = Math.round(secPerKm);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
}
export function fmtKm(km: number, digits = 1): string {
  return km.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
