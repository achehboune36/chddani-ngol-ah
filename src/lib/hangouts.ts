/**
 * Hangouts: the "find a time" maths.
 *
 * Availability is painted on 30-minute slots, keyed "YYYY-MM-DDTHH:MM". A hangout
 * that lasts D minutes needs D/30 consecutive slots, so "best times" = every
 * window of that length inside the poll, ranked by how many people are free for
 * the *whole* window. That's the part a heatmap makes you do by eye.
 */
import { todayIso } from './format';
import type { Hangout, HangoutKind, HangoutPoll } from './types';

export const SLOT_MIN = 30;

export const KINDS: { id: HangoutKind; emoji: string; label: string; minutes: number }[] = [
  { id: 'cinema', emoji: '🎬', label: 'Cinema', minutes: 150 },
  { id: 'food', emoji: '🍽️', label: 'Food', minutes: 120 },
  { id: 'coffee', emoji: '☕', label: 'Coffee', minutes: 90 },
  { id: 'sport', emoji: '⚽', label: 'Sport', minutes: 90 },
  { id: 'games', emoji: '🎮', label: 'Games', minutes: 180 },
  { id: 'trip', emoji: '🏖️', label: 'Trip', minutes: 480 },
  { id: 'other', emoji: '🎉', label: 'Other', minutes: 120 },
];
export const kindOf = (k: HangoutKind) => KINDS.find((x) => x.id === k) ?? KINDS[KINDS.length - 1];

export const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const slotKey = (date: string, min: number) => `${date}T${hhmm(min)}`;

/** Minutes-of-day for each slot row of the poll. */
export function slotRows(p: HangoutPoll): number[] {
  const rows: number[] = [];
  for (let m = p.fromHour * 60; m < p.toHour * 60; m += SLOT_MIN) rows.push(m);
  return rows;
}

export interface Window {
  date: string;
  start: number; // minutes of day
  end: number;
  free: string[]; // uids free for the whole window
}

/** Every window of the poll's duration, best first (most people, then earliest). */
export function bestWindows(h: Hangout, eligible: string[]): Window[] {
  const p = h.poll;
  if (!p) return [];
  const need = Math.max(1, Math.round(p.durationMin / SLOT_MIN));
  const rows = slotRows(p);
  const sets = Object.fromEntries(eligible.map((uid) => [uid, new Set(h.avail[uid] ?? [])]));
  const out: Window[] = [];
  for (const date of [...p.days].sort()) {
    for (let i = 0; i + need <= rows.length; i++) {
      const keys = rows.slice(i, i + need).map((m) => slotKey(date, m));
      const free = eligible.filter((uid) => keys.every((k) => sets[uid].has(k)));
      if (free.length) out.push({ date, start: rows[i], end: rows[i] + need * SLOT_MIN, free });
    }
  }
  out.sort((a, b) => b.free.length - a.free.length || (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start));
  // Don't list five overlapping windows that are really the same evening: keep the best per day+people.
  const seen = new Set<string>();
  return out.filter((w) => {
    const k = `${w.date}|${w.free.slice().sort().join(',')}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const isLocked = (h: Hangout) => !!h.date;
export const isPast = (h: Hangout, today = todayIso()) =>
  h.date ? h.date < today : !!h.poll && [...h.poll.days].sort().at(-1)! < today;

/** People who responded to the poll at all (painted something). */
export const responders = (h: Hangout) => Object.keys(h.avail).filter((u) => (h.avail[u] ?? []).length > 0);

/** Does this hangout want something from me? */
export function needsMe(h: Hangout, uid: string, today = todayIso()): boolean {
  if (isPast(h, today) || h.rsvp[uid] === 'no') return false;
  if (isLocked(h)) return !h.rsvp[uid];
  return !(h.avail[uid] ?? []).length;
}

export function sortKey(h: Hangout): string {
  return h.date ? `${h.date}T${h.startTime || '00:00'}` : `${[...(h.poll?.days ?? [])].sort()[0] ?? '9999'}T99`;
}
