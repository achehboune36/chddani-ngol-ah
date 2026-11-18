import { daysBetween, parseIso, todayIso } from './format';
import type { Race, RaceInput } from './types';

/**
 * The first race on the calendar. It's created in Firestore automatically the first
 * time a crew member opens the app and the races collection is empty.
 * Source: marathonmarrakech.ma — 37th edition, half marathon start 09:15.
 */
export const SEED_RACE_ID = 'marrakech-half-2027';
export const SEED_RACE: RaceInput = {
  name: 'Marrakech International Half Marathon',
  distanceKm: 21.0975,
  date: '2027-01-31',
  startTime: '09:15',
  place: 'Marrakech, Morocco',
  link: 'https://marathonmarrakech.ma/?lang=en',
  notes: '37th edition. Bib pickup from 24 Jan. 3-hour cutoff. "Race for All" 5K on Saturday 30 Jan.',
};

/** Start of the race in the viewer's clock. Times are entered as local race time;
 *  the crew is in Morocco, so local = race time. Without a start time, 08:00. */
export function raceStartMs(r: Pick<Race, 'date' | 'startTime'>): number {
  const d = parseIso(r.date);
  const [h, m] = (r.startTime || '08:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

export function distanceLabel(km: number): string {
  if (Math.abs(km - 21.0975) < 0.3) return 'Half marathon';
  if (Math.abs(km - 42.195) < 0.5) return 'Marathon';
  if (Math.abs(km - 10) < 0.2) return '10K';
  if (Math.abs(km - 5) < 0.2) return '5K';
  return `${+km.toFixed(2)} km`;
}
export function distanceShort(km: number): string {
  if (Math.abs(km - 21.0975) < 0.3) return '21.1K';
  if (Math.abs(km - 42.195) < 0.5) return '42.2K';
  return `${+km.toFixed(1)}K`;
}

export function daysUntil(r: Pick<Race, 'date'>, today = todayIso()) {
  return daysBetween(today, r.date);
}

export function sortRaces(rs: Race[]) {
  return [...rs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
}

/** Crew km milestones for the home page bar. */
export const MILESTONES = [100, 250, 500, 1000, 1500, 2000, 3000, 5000, 7500, 10000];
