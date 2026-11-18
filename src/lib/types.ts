/** Level ids are historical: finish = beginner, sub2 = intermediate, sub145 = advanced.
 *  The labels shown depend on the race distance (see plan.ts). */
export type Level = 'finish' | 'sub2' | 'sub145';
export const LEVEL_IDS: Level[] = ['finish', 'sub2', 'sub145'];

export type RunType = 'easy' | 'long' | 'tempo' | 'intervals' | 'race' | 'other';
export type Feel = 'great' | 'good' | 'ok' | 'rough';
export type RaceStatus = 'interested' | 'paid';

export interface Member {
  uid: string;
  name: string;
  photoURL: string | null;
  level: Level;
  /** Personal goal for the target race, in seconds; null = the level's default. */
  goalSec: number | null;
  joinedAt: number;
  /** Race this member trains for; missing/null = auto (next race they're in, else next race). */
  targetRaceId?: string | null;
  /** YYYY-MM-DD the target/plan was picked; plan sessions before it don't count as missed. */
  targetSince?: string | null;
  /** Opted in to a training plan. Off by default: just log runs, no sessions to tick off. */
  planOn?: boolean;
  /** Access: approved = in the crew; pending = waiting for the admin; denied = no. */
  status?: MemberStatus;
}

export type MemberStatus = 'approved' | 'pending' | 'denied';
export type SiteMode = 'open' | 'approval';

/** Private sign-up info, visible to its owner and the admin only. */
export interface Account {
  uid: string;
  email: string;
  name: string;
  photoURL: string | null;
  createdAt: number;
  lastSeenAt: number;
}

export interface RunInput {
  date: string; // YYYY-MM-DD, local
  distanceKm: number;
  durationSec: number;
  type: RunType;
  effort: number; // 1..10
  feel: Feel;
  notes: string;
  link: string;
}

export interface Run extends RunInput {
  id: string;
  uid: string;
  createdAt: number;
  /** uid -> emoji */
  reactions: Record<string, string>;
}

export interface RaceInput {
  name: string;
  distanceKm: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM local to the race, or ''
  place: string;
  link: string;
  notes: string;
}

export interface Race extends RaceInput {
  id: string;
  createdBy: string;
  createdAt: number;
  /** uid -> interested | paid */
  crew: Record<string, RaceStatus>;
}

export const RUN_TYPES: { id: RunType; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'long', label: 'Long' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'intervals', label: 'Intervals' },
  { id: 'race', label: 'Race' },
  { id: 'other', label: 'Other' },
];

export const FEELS: { id: Feel; emoji: string; label: string }[] = [
  { id: 'great', emoji: '🤩', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'ok', emoji: '😐', label: 'Meh' },
  { id: 'rough', emoji: '🥵', label: 'Rough' },
];

export const REACTIONS = ['🔥', '💪', '👏', '🫡', '😮‍💨'];

// ---------------------------------------------------------------- Hangouts
export type HangoutKind = 'cinema' | 'food' | 'coffee' | 'sport' | 'games' | 'trip' | 'other';
export type Rsvp = 'going' | 'maybe' | 'no';

/** "Find a time" setup: which days, which hours each day, and how long the thing lasts. */
export interface HangoutPoll {
  days: string[]; // YYYY-MM-DD, 1..14
  fromHour: number; // 0..23
  toHour: number; // 1..24, > fromHour
  durationMin: number; // 30..720
}

export interface HangoutInput {
  title: string;
  kind: HangoutKind;
  place: string;
  notes: string;
  link: string;
  /** Set when the time is fixed (from the start, or after the poll is locked). */
  date: string | null;
  startTime: string; // HH:MM or ''
  endTime: string; // HH:MM or ''
  /** Set while (or after) finding a time; null for a fixed-from-the-start hangout. */
  poll: HangoutPoll | null;
  /** Cover photo as a small JPEG data URL (see lib/image.ts), or null. */
  image?: string | null;
}

export interface Hangout extends HangoutInput {
  id: string;
  createdBy: string;
  createdAt: number;
  rsvp: Record<string, Rsvp>;
  /** uid -> slot keys "YYYY-MM-DDTHH:MM" (30-min slots) the person is free */
  avail: Record<string, string[]>;
}
