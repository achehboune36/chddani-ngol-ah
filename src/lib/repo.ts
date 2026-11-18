/**
 * Data access. Two implementations of the same interface:
 *  - firestoreRepo: the real thing (Google sign-in + Firestore)
 *  - demoRepo: localStorage with seeded fake crew, used when no Firebase config is set
 */
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseEnabled } from './firebase';
import { addDays, todayIso } from './format';
import type { Account, Hangout, HangoutInput, Member, MemberStatus, Race, RaceInput, RaceStatus, Rsvp, Run, RunInput, SiteMode } from './types';
import { SEED_RACE, SEED_RACE_ID } from './race';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
}

type Unsub = () => void;
type OnErr = (e: { code?: string; message: string }) => void;

export interface Repo {
  mode: 'firebase' | 'demo';
  onAuth(cb: (u: AuthUser | null) => void): Unsub;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  watchMembers(cb: (m: Member[]) => void, err: OnErr): Unsub;
  watchRuns(cb: (r: Run[]) => void, err: OnErr): Unsub;
  saveMember(m: Member): Promise<void>;
  addRun(uid: string, r: RunInput): Promise<void>;
  updateRun(id: string, r: RunInput): Promise<void>;
  deleteRun(id: string): Promise<void>;
  react(runId: string, uid: string, emoji: string | null): Promise<void>;
  /** cb gets the races and whether the snapshot is confirmed by the server (not just cache). */
  watchRaces(cb: (r: Race[], fromServer: boolean) => void, err: OnErr): Unsub;
  addRace(uid: string, r: RaceInput): Promise<string>;
  updateRace(id: string, r: RaceInput): Promise<void>;
  deleteRace(id: string): Promise<void>;
  setRaceStatus(raceId: string, uid: string, status: RaceStatus | null): Promise<void>;
  /** Creates the first race (Marrakech) with a fixed id. Safe to call more than once. */
  seedRace(uid: string): Promise<void>;

  // --- access
  /** My own member doc (null = doesn't exist yet). fromServer = not just a cache guess. */
  watchMember(uid: string, cb: (m: Member | null, fromServer: boolean) => void, err: OnErr): Unsub;
  /** Create my member doc. Rejected with permission-denied if `status` isn't allowed. */
  createMember(m: Member): Promise<void>;
  /** Upsert my private account info (email) — keeps createdAt from the first time. */
  touchAccount(u: AuthUser): Promise<void>;
  isAdmin(): Promise<boolean>;
  watchAccounts(cb: (a: Account[]) => void, err: OnErr): Unsub;
  setMemberStatus(uid: string, status: MemberStatus): Promise<void>;
  watchMode(cb: (m: SiteMode) => void, err: OnErr): Unsub;
  setMode(m: SiteMode): Promise<void>;

  // --- hangouts
  watchHangouts(cb: (h: Hangout[]) => void, err: OnErr): Unsub;
  addHangout(uid: string, h: HangoutInput): Promise<string>;
  updateHangout(id: string, h: HangoutInput): Promise<void>;
  deleteHangout(id: string): Promise<void>;
  setRsvp(id: string, uid: string, r: Rsvp | null): Promise<void>;
  setAvail(id: string, uid: string, slots: string[]): Promise<void>;
}

// ---------------------------------------------------------------- Firestore
const firestoreRepo = (): Repo => {
  const a = auth!;
  const d = db!;
  return {
    mode: 'firebase',
    onAuth: (cb) =>
      onAuthStateChanged(a, (u) =>
        cb(u ? { uid: u.uid, name: u.displayName ?? u.email ?? 'Runner', email: u.email ?? '', photoURL: u.photoURL } : null),
      ),
    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(a, provider);
      } catch (e: any) {
        if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(a, provider);
        } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
          throw e;
        }
      }
    },
    signOut: () => fbSignOut(a),
    watchMembers: (cb, err) =>
      onSnapshot(collection(d, 'members'), (s) => cb(s.docs.map((x) => ({ uid: x.id, ...(x.data() as Omit<Member, 'uid'>) }))), err),
    watchRuns: (cb, err) =>
      onSnapshot(query(collection(d, 'runs'), orderBy('date', 'desc')),
        (s) => cb(s.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Run, 'id'>) }))), err),
    async saveMember({ uid, ...m }) {
      await setDoc(doc(d, 'members', uid), m);
    },
    async addRun(uid, r) {
      await addDoc(collection(d, 'runs'), { ...r, uid, createdAt: Date.now(), reactions: {} });
    },
    async updateRun(id, r) {
      await updateDoc(doc(d, 'runs', id), { ...r });
    },
    async deleteRun(id) {
      await deleteDoc(doc(d, 'runs', id));
    },
    async react(runId, uid, emoji) {
      await updateDoc(doc(d, 'runs', runId), { [`reactions.${uid}`]: emoji ?? deleteField() });
    },
    watchRaces: (cb, err) =>
      onSnapshot(collection(d, 'races'), { includeMetadataChanges: true },
        (s) => cb(s.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Race, 'id'>) })), !s.metadata.fromCache), err),
    async addRace(uid, r) {
      const ref = await addDoc(collection(d, 'races'), { ...r, createdBy: uid, createdAt: Date.now(), crew: { [uid]: 'interested' } });
      return ref.id;
    },
    async updateRace(id, r) {
      await updateDoc(doc(d, 'races', id), { ...r });
    },
    async deleteRace(id) {
      await deleteDoc(doc(d, 'races', id));
    },
    async setRaceStatus(raceId, uid, status) {
      await updateDoc(doc(d, 'races', raceId), { [`crew.${uid}`]: status ?? deleteField() });
    },
    async seedRace(uid) {
      // If it already exists this becomes an update by a non-creator and is rejected — harmless.
      await setDoc(doc(d, 'races', SEED_RACE_ID), { ...SEED_RACE, createdBy: uid, createdAt: Date.now(), crew: {} }).catch(() => {});
    },
    watchMember: (uid, cb, err) =>
      onSnapshot(doc(d, 'members', uid), { includeMetadataChanges: true }, (s) => {
        // Ignore our own not-yet-saved write: the local cache says "approved" before the server
        // agrees, and acting on that makes the crew queries fail with permission-denied.
        if (s.metadata.hasPendingWrites) return;
        cb(s.exists() ? ({ uid, ...(s.data() as Omit<Member, 'uid'>) }) : null, !s.metadata.fromCache);
      }, err),
    async createMember({ uid, ...m }) {
      await setDoc(doc(d, 'members', uid), m);
    },
    async touchAccount(u) {
      const ref = doc(d, 'accounts', u.uid);
      const prev = await getDoc(ref).catch(() => null);
      const createdAt = (prev?.exists() && (prev.data().createdAt as number)) || Date.now();
      await setDoc(ref, { email: u.email, name: u.name.slice(0, 100), photoURL: u.photoURL, createdAt, lastSeenAt: Date.now() });
    },
    async isAdmin() {
      try {
        await getDoc(doc(d, 'config', 'admin'));
        return true;
      } catch {
        return false;
      }
    },
    watchAccounts: (cb, err) =>
      onSnapshot(collection(d, 'accounts'), (s) => cb(s.docs.map((x) => ({ uid: x.id, ...(x.data() as Omit<Account, 'uid'>) }))), err),
    async setMemberStatus(uid, status) {
      await updateDoc(doc(d, 'members', uid), { status });
    },
    watchMode: (cb, err) =>
      onSnapshot(doc(d, 'config', 'settings'), (s) => cb(((s.exists() && s.data().mode) as SiteMode) || 'open'), err),
    async setMode(mode) {
      await setDoc(doc(d, 'config', 'settings'), { mode });
    },
    watchHangouts: (cb, err) =>
      onSnapshot(collection(d, 'hangouts'), (s) => cb(s.docs.map((x) => ({ id: x.id, ...(x.data() as Omit<Hangout, 'id'>) }))), err),
    async addHangout(uid, h) {
      const ref = await addDoc(collection(d, 'hangouts'), {
        ...h, createdBy: uid, createdAt: Date.now(), rsvp: h.date ? { [uid]: 'going' } : {}, avail: {},
      });
      return ref.id;
    },
    async updateHangout(id, h) {
      await updateDoc(doc(d, 'hangouts', id), { ...h });
    },
    async deleteHangout(id) {
      await deleteDoc(doc(d, 'hangouts', id));
    },
    async setRsvp(id, uid, r) {
      await updateDoc(doc(d, 'hangouts', id), { [`rsvp.${uid}`]: r ?? deleteField() });
    },
    async setAvail(id, uid, slots) {
      await updateDoc(doc(d, 'hangouts', id), { [`avail.${uid}`]: slots });
    },
  };
};

// ---------------------------------------------------------------- Demo
const KEY = 'cna-demo-v1';
const ME: AuthUser = { uid: 'demo-me', name: 'You (demo)', email: 'demo@example.com', photoURL: null };

interface DemoState { signedIn: boolean; members: Member[]; runs: Run[]; races: Race[]; mode?: SiteMode; accounts?: Account[]; hangouts?: Hangout[] }

function seed(): DemoState {
  const t = todayIso();
  const members: Member[] = [
    { uid: ME.uid, name: 'You (demo)', photoURL: null, level: 'sub2', goalSec: null, joinedAt: Date.now() },
    { uid: 'demo-alex', name: 'Alex', photoURL: null, level: 'sub145', goalSec: 6000, joinedAt: Date.now() },
    { uid: 'demo-sam', name: 'Sam', photoURL: null, level: 'sub2', goalSec: 7020, joinedAt: Date.now() },
    { uid: 'demo-jordan', name: 'Jordan', photoURL: null, level: 'finish', goalSec: null, joinedAt: Date.now() },
  ];
  // [uid, daysAgo, km, pace sec/km, type, feel, notes]
  const raw: [string, number, number, number, Run['type'], Run['feel'], string][] = [
    ['demo-alex', 0, 7.2, 300, 'easy', 'good', 'Morning loop around the park'],
    ['demo-sam', 1, 6, 352, 'tempo', 'great', 'Tempo felt smooth today'],
    ['demo-me', 2, 12.4, 365, 'long', 'ok', 'Last 2 km were tough'],
    ['demo-jordan', 2, 5.1, 445, 'easy', 'rough', 'Shins a bit sore, took it slow'],
    ['demo-alex', 2, 15.3, 318, 'long', 'great', ''],
    ['demo-sam', 3, 10.5, 370, 'long', 'good', 'Ran with the club'],
    ['demo-me', 4, 6, 340, 'intervals', 'good', '5 × 800 m'],
    ['demo-alex', 5, 8, 285, 'intervals', 'good', '6 × 1 km'],
    ['demo-jordan', 6, 4, 450, 'easy', 'good', ''],
    ['demo-me', 7, 5.5, 375, 'easy', 'great', ''],
    ['demo-sam', 8, 5, 360, 'easy', 'ok', ''],
    ['demo-me', 9, 10, 362, 'long', 'good', ''],
    ['demo-alex', 9, 14, 320, 'long', 'good', ''],
    ['demo-jordan', 10, 6, 455, 'long', 'ok', 'Longest run ever!'],
    ['demo-me', 11, 6.2, 335, 'tempo', 'ok', ''],
    ['demo-sam', 12, 7, 349, 'tempo', 'good', ''],
    ['demo-me', 14, 5, 380, 'easy', 'good', ''],
    ['demo-alex', 15, 7, 300, 'easy', 'good', ''],
    ['demo-me', 16, 8.5, 368, 'long', 'ok', ''],
    ['demo-sam', 17, 8, 372, 'long', 'good', ''],
    ['demo-me', 20, 5, 372, 'easy', 'good', ''],
    ['demo-me', 23, 7, 370, 'long', 'rough', 'Too hot'],
    ['demo-alex', 24, 12, 322, 'long', 'good', ''],
  ];
  const runs: Run[] = raw.map(([uid, ago, km, pace, type, feel, notes], i) => ({
    id: `seed-${i}`, uid, date: addDays(t, -ago), distanceKm: km, durationSec: Math.round(km * pace), type,
    effort: type === 'easy' ? 4 : type === 'long' ? 6 : 8, feel, notes, link: '', createdAt: Date.now() - ago * 86400000 - i,
    reactions: (i === 0 ? { 'demo-sam': '🔥' } : i === 2 ? { 'demo-alex': '💪', 'demo-sam': '👏' } : {}) as Record<string, string>,
  }));
  return { signedIn: false, runs, races: seedRaces(), hangouts: seedHangouts(), ...seedAccess(members) };
}

/** Demo: everyone approved, plus two strangers knocking. */
function seedAccess(members: Member[]) {
  const strangers: Member[] = [
    { uid: 'demo-riley', name: 'Riley (cousin of Jordan)', photoURL: null, level: 'finish', goalSec: null, joinedAt: Date.now(), status: 'pending' },
    { uid: 'demo-bot', name: 'Crypto King 3000', photoURL: null, level: 'sub145', goalSec: null, joinedAt: Date.now(), status: 'pending' },
  ];
  const all = [...members.map((m) => ({ ...m, status: 'approved' as const })), ...strangers];
  const accounts: Account[] = all.map((m, i) => ({
    uid: m.uid, email: `${m.uid.replace('demo-', '')}@example.com`, name: m.name, photoURL: null,
    createdAt: Date.now() - (all.length - i) * 86400000, lastSeenAt: Date.now() - i * 3600000,
  }));
  return { members: all, accounts, mode: 'open' as SiteMode };
}

function seedHangouts(): Hangout[] {
  const t = todayIso();
  const days = [1, 2, 3, 4, 5].map((n) => addDays(t, n));
  // Paint some evenings so the "best time" has something to find.
  const paint = (dayIdx: number[], from: string, to: string) =>
    dayIdx.flatMap((i) => {
      const out: string[] = [];
      const [fh, fm] = from.split(':').map(Number);
      const [th, tm] = to.split(':').map(Number);
      for (let m = fh * 60 + fm; m < th * 60 + tm; m += 30) out.push(`${days[i]}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
      return out;
    });
  return [
    {
      id: 'demo-cinema', title: 'Cinema: whatever is good', kind: 'cinema', place: 'Megarama', notes: 'Vote with your free time.', link: '',
      date: null, startTime: '', endTime: '', poll: { days, fromHour: 17, toHour: 24, durationMin: 150 },
      createdBy: 'demo-sam', createdAt: Date.now(), rsvp: {},
      avail: {
        'demo-sam': [...paint([1, 3], '19:00', '24:00'), ...paint([4], '17:00', '22:00')],
        'demo-alex': [...paint([1], '20:00', '24:00'), ...paint([3], '18:00', '23:00')],
        'demo-jordan': [...paint([3], '19:30', '24:00'), ...paint([0], '17:00', '20:00')],
      },
    },
    {
      id: 'demo-tajine', title: 'Post-long-run tajine', kind: 'food', place: "Jordan's place", notes: 'Bring bread. Not optional.', link: '',
      date: addDays(t, 6), startTime: '13:00', endTime: '15:00', poll: null,
      createdBy: 'demo-jordan', createdAt: Date.now(), rsvp: { 'demo-jordan': 'going', 'demo-alex': 'going', 'demo-sam': 'maybe' }, avail: {},
    },
  ];
}

function seedRaces(): Race[] {
  return [
    { ...SEED_RACE, id: SEED_RACE_ID, createdBy: 'demo-alex', createdAt: Date.now(),
      crew: { 'demo-me': 'paid', 'demo-alex': 'paid', 'demo-sam': 'paid', 'demo-jordan': 'interested' } },
    { name: 'Demo City 10K (fake)', distanceKm: 10, date: addDays(todayIso(), 120), startTime: '08:30', place: 'Somewhere nice',
      link: '', notes: 'A made-up race so the demo has more than one.', id: 'demo-10k', createdBy: 'demo-me', createdAt: Date.now(),
      crew: { 'demo-me': 'interested', 'demo-sam': 'interested' } },
  ];
}

const demoRepo = (): Repo => {
  let state: DemoState;
  try {
    state = JSON.parse(localStorage.getItem(KEY) || 'null') ?? seed();
    if (!state.races) state.races = seedRaces(); // demo data saved before races existed
    if (!state.accounts) Object.assign(state, seedAccess(state.members)); // ...or before sign-up approval existed
    if (!state.hangouts) state.hangouts = seedHangouts(); // ...or before hangouts existed
  } catch {
    state = seed();
  }
  const subs = { auth: new Set<(u: AuthUser | null) => void>(), members: new Set<(m: Member[]) => void>(), runs: new Set<(r: Run[]) => void>(), races: new Set<(r: Race[], fromServer: boolean) => void>() };
  const sortedRuns = () => [...state.runs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  const emit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
    subs.auth.forEach((f) => f(state.signedIn ? ME : null));
    subs.members.forEach((f) => f([...state.members]));
    subs.runs.forEach((f) => f(sortedRuns()));
    subs.races.forEach((f) => f([...state.races], true));
  };
  const sub = <T,>(set: Set<T>, f: T, initial: () => void) => { set.add(f); setTimeout(initial, 50); return () => { set.delete(f); }; };

  return {
    mode: 'demo',
    onAuth: (cb) => sub(subs.auth, cb, () => cb(state.signedIn ? ME : null)),
    async signIn() { state.signedIn = true; emit(); },
    async signOut() { state.signedIn = false; emit(); },
    watchMembers: (cb) => sub(subs.members, cb, () => cb([...state.members])),
    watchRuns: (cb) => sub(subs.runs, cb, () => cb(sortedRuns())),
    async saveMember(m) {
      state.members = [...state.members.filter((x) => x.uid !== m.uid), m];
      emit();
    },
    async addRun(uid, r) {
      state.runs = [...state.runs, { ...r, uid, id: `r-${Date.now()}`, createdAt: Date.now(), reactions: {} }];
      emit();
    },
    async updateRun(id, r) {
      state.runs = state.runs.map((x) => (x.id === id ? { ...x, ...r } : x));
      emit();
    },
    async deleteRun(id) {
      state.runs = state.runs.filter((x) => x.id !== id);
      emit();
    },
    async react(runId, uid, emoji) {
      state.runs = state.runs.map((x) => {
        if (x.id !== runId) return x;
        const reactions = { ...x.reactions };
        if (emoji) reactions[uid] = emoji; else delete reactions[uid];
        return { ...x, reactions };
      });
      emit();
    },
    watchRaces: (cb) => sub(subs.races, cb, () => cb([...state.races], true)),
    async addRace(uid, r) {
      const id = `race-${Date.now()}`;
      state.races = [...state.races, { ...r, id, createdBy: uid, createdAt: Date.now(), crew: { [uid]: 'interested' } }];
      emit();
      return id;
    },
    async updateRace(id, r) {
      state.races = state.races.map((x) => (x.id === id ? { ...x, ...r } : x));
      emit();
    },
    async deleteRace(id) {
      state.races = state.races.filter((x) => x.id !== id);
      emit();
    },
    async setRaceStatus(raceId, uid, status) {
      state.races = state.races.map((x) => {
        if (x.id !== raceId) return x;
        const crew = { ...x.crew };
        if (status) crew[uid] = status; else delete crew[uid];
        return { ...x, crew };
      });
      emit();
    },
    async seedRace() {},
    watchMember: (uid, cb) => {
      const f = (ms: Member[]) => cb(ms.find((m) => m.uid === uid) ?? null, true);
      return sub(subs.members, f, () => f(state.members));
    },
    async createMember(m) {
      state.members = [...state.members.filter((x) => x.uid !== m.uid), m];
      emit();
    },
    async touchAccount() {},
    async isAdmin() { return true; },
    watchAccounts: (cb) => {
      const f = () => cb([...(state.accounts ?? [])]);
      return sub(subs.members, f, f);
    },
    async setMemberStatus(uid, status) {
      state.members = state.members.map((m) => (m.uid === uid ? { ...m, status } : m));
      emit();
    },
    watchMode: (cb) => {
      const f = () => cb(state.mode ?? 'open');
      return sub(subs.members, f, f);
    },
    async setMode(mode) {
      state.mode = mode;
      emit();
    },
    watchHangouts: (cb) => {
      const f = () => cb([...(state.hangouts ?? [])]);
      return sub(subs.members, f, f);
    },
    async addHangout(uid, h) {
      const id = `h-${Date.now()}`;
      state.hangouts = [...(state.hangouts ?? []), { ...h, id, createdBy: uid, createdAt: Date.now(), rsvp: h.date ? { [uid]: 'going' } : {}, avail: {} }];
      emit();
      return id;
    },
    async updateHangout(id, h) {
      state.hangouts = (state.hangouts ?? []).map((x) => (x.id === id ? { ...x, ...h } : x));
      emit();
    },
    async deleteHangout(id) {
      state.hangouts = (state.hangouts ?? []).filter((x) => x.id !== id);
      emit();
    },
    async setRsvp(id, uid, r) {
      state.hangouts = (state.hangouts ?? []).map((x) => {
        if (x.id !== id) return x;
        const rsvp = { ...x.rsvp };
        if (r) rsvp[uid] = r; else delete rsvp[uid];
        return { ...x, rsvp };
      });
      emit();
    },
    async setAvail(id, uid, slots) {
      state.hangouts = (state.hangouts ?? []).map((x) => (x.id === id ? { ...x, avail: { ...x.avail, [uid]: slots } } : x));
      emit();
    },
  };
};

export const repo: Repo = firebaseEnabled ? firestoreRepo() : demoRepo();

export function resetDemo() {
  localStorage.removeItem(KEY);
  location.reload();
}
