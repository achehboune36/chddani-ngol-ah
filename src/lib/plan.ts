/**
 * Training plans, generated (never stored) from a target race + level + goal time.
 *
 * Two templates: half marathon (12 weeks) and 10K (8 weeks). The plan is anchored
 * so its last week contains race day; earlier weeks run Monday → Sunday.
 * Shape per week: Tue quality, Thu tempo/steady, Sat easy (not for beginners),
 * Sun long. Recovery weeks are lighter; the last two weeks taper.
 */
import { addDays, mondayOf, todayIso } from './format';
import type { Level, Member, Race, Run, RunType } from './types';

export type PlanKind = 'half' | '10k';
export type Phase = 'Base' | 'Recovery' | 'Build' | 'Peak' | 'Taper' | 'Race';

export interface Session {
  date: string;
  type: RunType;
  km: number;
  title: string;
  detail: string;
}
export interface Week {
  n: number; // 1-based
  start: string;
  end: string;
  phase: Phase;
  sessions: Session[];
  km: number;
}
export interface Paces {
  goalSec: number;
  race: number; // sec/km
  easy: number;
  long: number;
  tempo: number;
  interval: number;
}
export interface Plan {
  race: Race;
  kind: PlanKind;
  level: Level;
  goalSec: number;
  paces: Paces;
  weeks: Week[];
  start: string;
  /** Sessions before this date never count as missed (when the member picked the race). */
  since: string;
}

type Table = { tue: number[]; thu: number[]; sat: number[]; long: number[]; tempoMin: number[] };
interface Template {
  label: string;
  phases: Phase[];
  quality: number[]; // weeks whose Tuesday is a proper interval session (mid/fast)
  intervals: string[];
  racePaceLongKm: (n: number) => number;
  paceOffsets: { easy: number; long: number; tempo: number; interval: number };
  levels: Record<Level, { label: string; blurb: string; goal: number }>;
  tables: Record<Level, Table>;
}

const HALF: Template = {
  label: 'Half marathon',
  phases: ['Base', 'Base', 'Base', 'Recovery', 'Build', 'Build', 'Build', 'Recovery', 'Peak', 'Peak', 'Taper', 'Race'],
  quality: [5, 6, 7, 9, 10, 11],
  intervals: [
    'Easy + 6 × 20 s strides', 'Easy + 6 × 20 s strides', 'Easy + 8 × 20 s strides', 'Easy, relaxed — recovery week',
    '6 × 400 m, 90 s jog between', '5 × 800 m, 2 min jog between', '6 × 800 m, 2 min jog between', 'Fartlek: 6 × 1 min pick-ups',
    '5 × 1 km, 2 min jog between', '6 × 1 km, 2 min jog between', '4 × 800 m, 2 min jog — stay sharp', 'Easy + 4 strides, legs fresh',
  ],
  racePaceLongKm: (n) => (n >= 9 ? 3 : n >= 6 ? 2 : 0),
  paceOffsets: { easy: 75, long: 55, tempo: -12, interval: -30 },
  levels: {
    finish: { label: 'Just finish', blurb: '3 runs/week. Survive.', goal: 2.5 * 3600 },
    sub2: { label: 'Sub 2:00', blurb: '4 runs/week. Some suffering.', goal: 3600 + 58 * 60 },
    sub145: { label: 'Sub 1:45', blurb: '4 runs/week. Pain is the point.', goal: 3600 + 43 * 60 },
  },
  tables: {
    finish: {
      tue: [4, 4, 5, 4, 5, 5, 6, 5, 6, 6, 5, 3], thu: [4, 5, 5, 4, 6, 6, 7, 5, 7, 8, 5, 3],
      sat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], long: [6, 7, 8, 6, 9, 10, 12, 9, 14, 16, 10, 0],
      tempoMin: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    sub2: {
      tue: [6, 6, 7, 5, 7, 8, 8, 6, 9, 9, 7, 4], thu: [6, 6, 7, 5, 8, 8, 8, 6, 9, 9, 7, 4],
      sat: [5, 5, 6, 5, 6, 7, 7, 6, 8, 8, 6, 3], long: [8, 10, 11, 8, 12, 14, 15, 11, 16, 18, 12, 0],
      tempoMin: [10, 12, 15, 10, 18, 20, 20, 15, 25, 25, 15, 0],
    },
    sub145: {
      tue: [7, 8, 8, 6, 8, 9, 10, 7, 10, 11, 8, 5], thu: [7, 8, 8, 6, 9, 9, 10, 7, 10, 11, 8, 5],
      sat: [6, 7, 8, 6, 8, 8, 9, 7, 10, 10, 7, 3], long: [10, 12, 14, 10, 15, 16, 18, 13, 18, 20, 13, 0],
      tempoMin: [12, 15, 18, 12, 20, 22, 25, 15, 25, 30, 15, 0],
    },
  },
};

const TENK: Template = {
  label: '10K',
  phases: ['Base', 'Base', 'Build', 'Recovery', 'Build', 'Peak', 'Taper', 'Race'],
  quality: [3, 5, 6, 7],
  intervals: [
    'Easy + 6 × 20 s strides', 'Easy + 8 × 20 s strides', '8 × 400 m, 90 s jog between', 'Fartlek: 6 × 1 min pick-ups',
    '5 × 800 m, 2 min jog between', '5 × 1 km, 2 min jog between', '4 × 600 m, 2 min jog — stay sharp', 'Easy + 4 strides, legs fresh',
  ],
  racePaceLongKm: (n) => (n >= 5 ? 2 : 0),
  paceOffsets: { easy: 90, long: 70, tempo: 10, interval: -15 },
  levels: {
    finish: { label: 'Just finish', blurb: '3 runs/week. Survive.', goal: 70 * 60 },
    sub2: { label: 'Sub 55', blurb: '4 runs/week. Some suffering.', goal: 54 * 60 },
    sub145: { label: 'Sub 48', blurb: '4 runs/week. Pain is the point.', goal: 47 * 60 },
  },
  tables: {
    finish: {
      tue: [3, 4, 4, 3, 5, 5, 4, 3], thu: [3, 4, 4, 3, 5, 5, 4, 3],
      sat: [0, 0, 0, 0, 0, 0, 0, 2], long: [5, 6, 7, 5, 8, 9, 6, 0], tempoMin: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    sub2: {
      tue: [5, 5, 6, 5, 6, 7, 5, 4], thu: [5, 6, 6, 5, 7, 7, 5, 3],
      sat: [4, 4, 5, 4, 5, 5, 4, 2], long: [7, 8, 9, 7, 10, 11, 8, 0], tempoMin: [10, 12, 15, 10, 18, 20, 12, 0],
    },
    sub145: {
      tue: [6, 6, 7, 6, 7, 8, 6, 4], thu: [6, 7, 7, 6, 8, 8, 6, 4],
      sat: [5, 5, 6, 5, 6, 6, 5, 3], long: [8, 10, 11, 8, 12, 13, 9, 0], tempoMin: [12, 15, 18, 12, 20, 22, 15, 0],
    },
  },
};

const TEMPLATES: Record<PlanKind, Template> = { half: HALF, '10k': TENK };

export function planKind(km: number): PlanKind | null {
  if (km >= 19 && km <= 23) return 'half';
  if (km >= 8.5 && km <= 12) return '10k';
  return null;
}

export function levelsFor(kind: PlanKind) {
  return TEMPLATES[kind].levels;
}
export function templateLabel(kind: PlanKind) {
  return TEMPLATES[kind].label;
}

export function goalFor(m: Pick<Member, 'level' | 'goalSec'>, kind: PlanKind): number {
  return m.goalSec ?? TEMPLATES[kind].levels[m.level].goal;
}

export function pacesFor(goalSec: number, distanceKm: number, kind: PlanKind): Paces {
  const race = goalSec / distanceKm;
  const o = TEMPLATES[kind].paceOffsets;
  return { goalSec, race, easy: race + o.easy, long: race + o.long, tempo: race + o.tempo, interval: race + o.interval };
}

const p = (s: number) => {
  const r = Math.round(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}/km`;
};

export function fmtGoal(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`;
}

export function buildPlan(race: Race, m: Pick<Member, 'level' | 'goalSec' | 'targetRaceId' | 'targetSince'>): Plan | null {
  const kind = planKind(race.distanceKm);
  if (!kind) return null;
  const tpl = TEMPLATES[kind];
  const t = tpl.tables[m.level];
  const goalSec = goalFor(m, kind);
  const pc = pacesFor(goalSec, race.distanceKm, kind);
  const W = tpl.phases.length;
  const lastMonday = mondayOf(race.date);
  const start = addDays(lastMonday, -7 * (W - 1));
  const beginner = m.level === 'finish';
  const weeks: Week[] = [];

  for (let i = 0; i < W; i++) {
    const n = i + 1;
    const wStart = addDays(start, i * 7);
    const raceWeek = n === W;
    let s: Session[] = [];

    // Tuesday
    if (beginner) {
      s.push({ date: addDays(wStart, 1), type: 'easy', km: t.tue[i], title: 'Easy run',
        detail: `Conversational, ~${p(pc.easy)}. Walk breaks are fine.${n >= 3 && !raceWeek ? ' Finish with 4 × 20 s strides.' : ''}` });
    } else {
      const quality = tpl.quality.includes(n);
      s.push({ date: addDays(wStart, 1), type: quality ? 'intervals' : 'easy', km: t.tue[i],
        title: quality ? 'Intervals' : 'Easy + strides',
        detail: quality ? `${tpl.intervals[i]} at ~${p(pc.interval)}. 2 km warm-up and cool-down.` : `${tpl.intervals[i]}. Easy at ~${p(pc.easy)}.` });
    }

    // Thursday
    if (raceWeek) {
      s.push({ date: addDays(wStart, 3), type: 'easy', km: t.thu[i], title: 'Easy + race pace',
        detail: `Easy, with 2 × 1 km at race pace (~${p(pc.race)}) to remember how it feels.` });
    } else if (beginner) {
      s.push({ date: addDays(wStart, 3), type: 'tempo', km: t.thu[i], title: 'Steady run',
        detail: `Comfortably hard in the middle third, ~${p(pc.race)}. Easy either side.` });
    } else {
      s.push({ date: addDays(wStart, 3), type: 'tempo', km: t.thu[i], title: `Tempo ${t.tempoMin[i]} min`,
        detail: `${t.tempoMin[i]} min continuous at ~${p(pc.tempo)}, inside an easy run.` });
    }

    // Saturday
    if (t.sat[i] > 0) {
      s.push({ date: addDays(wStart, 5), type: 'easy', km: t.sat[i], title: raceWeek ? 'Shake-out' : 'Easy run',
        detail: raceWeek ? 'Very easy jog. Lay out your kit, pick up your bib.' : `Recovery pace, ~${p(pc.easy)}.` });
    }

    if (raceWeek) {
      // Nothing on or after race day except the race itself.
      s = s.filter((x) => x.date < race.date);
      s.push({ date: race.date, type: 'race', km: Math.round(race.distanceKm * 10) / 10, title: `RACE — ${race.name}`,
        detail: `${race.startTime ? `Start ${race.startTime}. ` : ''}Goal ${fmtGoal(goalSec)} = ${p(pc.race)}. First km a touch slower than goal.` });
    } else {
      const rp = beginner ? 0 : tpl.racePaceLongKm(n);
      s.push({ date: addDays(wStart, 6), type: 'long', km: t.long[i], title: `Long run ${t.long[i]} km`,
        detail: `Slow and steady, ~${p(pc.long)}.${rp ? ` Last ${rp} km at race pace (~${p(pc.race)}).` : ''}` });
    }

    weeks.push({
      n, start: wStart, end: addDays(wStart, 6), phase: tpl.phases[i], sessions: s,
      km: Math.round(s.reduce((a, x) => a + x.km, 0) * 10) / 10,
    });
  }

  const picked = m.targetRaceId === race.id && m.targetSince ? m.targetSince : start;
  return { race, kind, level: m.level, goalSec, paces: pc, weeks, start, since: picked > start ? picked : start };
}

/** Week number (1..N) for a date; 0 before the plan, N+1 after. */
export function weekIndexOf(plan: Plan, date: string): number {
  if (date < plan.start) return 0;
  const i = plan.weeks.findIndex((w) => date >= w.start && date <= w.end);
  return i === -1 ? plan.weeks.length + 1 : i + 1;
}

export type SessionStatus = 'done' | 'missed' | 'skipped' | 'today' | 'upcoming';

export function sessionStatus(session: Session, myRuns: Run[], plan: Plan, today = todayIso()): SessionStatus {
  if (myRuns.some((r) => r.date === session.date)) return 'done';
  if (session.date < plan.since) return 'skipped';
  if (session.date < today) return 'missed';
  if (session.date === today) return 'today';
  return 'upcoming';
}

/** Share of sessions due (since the member picked the race) that have a run that day. null if nothing is due. */
export function planCompletion(plan: Plan | null, myRuns: Run[], today = todayIso()): number | null {
  if (!plan) return null;
  const ran = new Set(myRuns.map((r) => r.date));
  const due = plan.weeks.flatMap((w) => w.sessions)
    .filter((s) => s.date >= plan.since && (s.date < today || (s.date === today && ran.has(today))));
  if (!due.length) return null;
  return due.filter((s) => ran.has(s.date)).length / due.length;
}

export function sessionOn(plan: Plan | null, date: string): Session | undefined {
  return plan?.weeks.flatMap((w) => w.sessions).find((s) => s.date === date);
}
