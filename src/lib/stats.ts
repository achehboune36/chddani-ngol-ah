import { addDays, mondayOf, todayIso } from './format';
import type { Run } from './types';

export const sumKm = (runs: Run[]) => runs.reduce((a, r) => a + r.distanceKm, 0);

export function runsInWeek(runs: Run[], monday: string) {
  const end = addDays(monday, 6);
  return runs.filter((r) => r.date >= monday && r.date <= end);
}

/** Consecutive weeks (ending this week, or last week if this one isn't there yet) with >= 2 runs. */
export function weekStreak(runs: Run[], today = todayIso()): number {
  let monday = mondayOf(today);
  if (runsInWeek(runs, monday).length < 2) monday = addDays(monday, -7);
  let n = 0;
  while (runsInWeek(runs, monday).length >= 2) {
    n++;
    monday = addDays(monday, -7);
  }
  return n;
}

export function avgPace(runs: Run[]): number {
  const km = sumKm(runs);
  return km ? runs.reduce((a, r) => a + r.durationSec, 0) / km : NaN;
}

export function longest(runs: Run[]): Run | undefined {
  return runs.reduce<Run | undefined>((best, r) => (!best || r.distanceKm > best.distanceKm ? r : best), undefined);
}

/** Weekly km for the `count` weeks ending with the current one, oldest first. */
export function weeklyKm(runs: Run[], count: number, today = todayIso()) {
  const thisMonday = mondayOf(today);
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (count - 1 - i));
    return { monday, km: sumKm(runsInWeek(runs, monday)) };
  });
}
