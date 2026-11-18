import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { repo, type AuthUser } from '@/lib/repo';
import { buildPlan, type Plan } from '@/lib/plan';
import { sortRaces } from '@/lib/race';
import { todayIso } from '@/lib/format';
import type { Hangout, Member, Race, Run, SiteMode } from '@/lib/types';

type Status = 'loading' | 'signedOut' | 'pending' | 'denied' | 'ready' | 'error';

interface Data {
  status: Status;
  error: string | null;
  user: AuthUser | null;
  isAdmin: boolean;
  mode: SiteMode;
  me: Member | null;
  /** Approved members only — the crew everyone sees. */
  members: Member[];
  /** Everyone with a member doc, any status (the admin page uses this). */
  allMembers: Member[];
  memberById: Record<string, Member>;
  runs: Run[];
  myRuns: Run[];
  races: Race[]; // sorted by date
  upcomingRaces: Race[];
  hangouts: Hangout[];
  targetOf(m: Member): Race | null;
  planOf(m: Member): Plan | null;
  myTarget: Race | null;
  myPlan: Plan | null;
}

const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [me, setMe] = useState<Member | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [races, setRaces] = useState<Race[] | null>(null);
  const [hangouts, setHangouts] = useState<Hangout[] | null>(null);
  const [mode, setMode] = useState<SiteMode>('open');
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);
  const seeded = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => repo.onAuth(setUser), []);

  const fail = (e: { message?: string } | unknown) => setError(String((e as any)?.message ?? e));

  // Step 1: who am I? (admin check + my own member doc, which I can always read)
  useEffect(() => {
    setRetry(0);
    setMe(undefined);
    setIsAdmin(null);
    setMembers(null);
    setRuns(null);
    setRaces(null);
    setHangouts(null);
    if (!user) return;
    let alive = true;
    repo.isAdmin().then((a) => alive && setIsAdmin(a));
    repo.touchAccount(user).catch(() => {}); // email for the admin page; best effort
    const unsub = repo.watchMember(user.uid, (m, fromServer) => {
      if (m) return setMe(m);
      if (!fromServer || creating.current) return;
      // First visit: join. Approved straight away in open mode; the rules say no otherwise, so fall back to pending.
      creating.current = true;
      const base: Member = { uid: user.uid, name: user.name.slice(0, 40), photoURL: user.photoURL, level: 'sub2', goalSec: null, joinedAt: Date.now() };
      repo.createMember({ ...base, status: 'approved' })
        .catch(() => repo.createMember({ ...base, status: 'pending' }))
        .catch(fail)
        .finally(() => { creating.current = false; });
    }, fail);
    return () => { alive = false; unsub(); };
  }, [user]);

  const inCrew = !!me && (isAdmin === true || me.status === 'approved');

  // The admin is always approved (their doc predates statuses).
  useEffect(() => {
    if (user && isAdmin && me && me.status !== 'approved') repo.setMemberStatus(user.uid, 'approved').catch(fail);
  }, [user, isAdmin, me]);

  // Step 2: in the crew → load everything.
  useEffect(() => {
    if (!user || !inCrew) return;
    // Right after sign-up/approval the server can briefly lag behind what we know;
    // a permission-denied then is a race, not a verdict, so resubscribe a few times before giving up.
    let retried = false;
    const onErr = (e: { code?: string; message: string }) => {
      if (e.code === 'permission-denied' && retry < 4) {
        if (!retried) { retried = true; setTimeout(() => setRetry((r) => r + 1), 800 * (retry + 1)); }
      } else fail(e);
    };
    const u1 = repo.watchMembers(setMembers, onErr);
    const u2 = repo.watchRuns(setRuns, onErr);
    const u3 = repo.watchRaces((rs, fromServer) => {
      setRaces(rs);
      if (fromServer && rs.length === 0 && !seeded.current) {
        seeded.current = true;
        repo.seedRace(user.uid);
      }
    }, onErr);
    const u4 = repo.watchMode(setMode, () => {});
    const u5 = repo.watchHangouts(setHangouts, onErr);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [user, inCrew, retry]);

  let status: Status;
  if (user === null) status = 'signedOut';
  else if (error) status = 'error';
  else if (user === undefined || me === undefined || me === null || isAdmin === null) status = 'loading';
  else if (!inCrew) status = me.status === 'denied' ? 'denied' : 'pending';
  else if (!members || !runs || !races || !hangouts) status = 'loading';
  else status = 'ready';

  const value = useMemo<Data>(() => {
    const all = members ?? [];
    const approved = all.filter((m) => m.status === 'approved');
    const ok = new Set(approved.map((m) => m.uid));
    const rs = (runs ?? []).filter((r) => ok.has(r.uid));
    const sorted = sortRaces(races ?? []);
    const today = todayIso();
    const upcoming = sorted.filter((r) => r.date >= today);
    const meNow = (me && all.find((m) => m.uid === me.uid)) || me || null;

    const targetOf = (m: Member): Race | null =>
      upcoming.find((r) => r.id === m.targetRaceId) ??
      upcoming.find((r) => r.crew[m.uid]) ??
      upcoming[0] ??
      null;
    const planOf = (m: Member): Plan | null => {
      if (!m.planOn) return null;
      const t = targetOf(m);
      return t ? buildPlan(t, m) : null;
    };

    return {
      status, error, user: user ?? null, isAdmin: isAdmin === true, mode,
      me: meNow,
      members: approved,
      allMembers: all,
      memberById: Object.fromEntries(all.map((m) => [m.uid, m])),
      runs: rs,
      myRuns: meNow ? rs.filter((r) => r.uid === meNow.uid) : [],
      races: sorted,
      upcomingRaces: upcoming,
      hangouts: hangouts ?? [],
      targetOf,
      planOf,
      myTarget: meNow ? targetOf(meNow) : null,
      myPlan: meNow ? planOf(meNow) : null,
    };
  }, [status, error, user, isAdmin, mode, me, members, runs, races, hangouts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside DataProvider');
  return v;
}
