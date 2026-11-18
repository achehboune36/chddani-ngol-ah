import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import RunCard from '@/components/RunCard';
import WeekChart from '@/components/WeekChart';
import { Avatar, Empty, PageTitle, Stat } from '@/components/ui';
import { repo } from '@/lib/repo';
import { fmtKm, fmtPace } from '@/lib/format';
import { planCompletion } from '@/lib/plan';
import { avgPace, longest, sumKm, weekStreak, weeklyKm } from '@/lib/stats';
import { levelsFor } from '@/lib/plan';
import { daysUntil } from '@/lib/race';

export default function Me() {
  const { me, myRuns, myPlan, myTarget, user } = useData();
  const [name, setName] = useState(me?.name ?? '');
  useEffect(() => setName(me?.name ?? ''), [me?.name]);
  const [shown, setShown] = useState(10);
  if (!me) return null;

  const weeks = weeklyKm(myRuns, 8).map((w) => ({ ...w, planned: myPlan?.weeks.find((p) => p.start === w.monday)?.km }));
  const best = longest(myRuns);
  const completion = planCompletion(myPlan, myRuns);
  const saveName = () => {
    const n = name.trim().slice(0, 40);
    if (n && n !== me.name) repo.saveMember({ ...me, name: n }).catch((e) => alert(e.message));
  };

  return (
    <div className="space-y-5">
      <PageTitle right={<button className="btn-ghost" onClick={() => repo.signOut()}><LogOut size={16} /> Sign out</button>}>
        <span className="flex items-center gap-3"><Avatar m={me} size={40} /> Me</span>
      </PageTitle>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Total" value={`${fmtKm(sumKm(myRuns), 0)} km`} sub={`${myRuns.length} runs`} />
        <Stat label="Avg pace" value={fmtPace(avgPace(myRuns))} sub="min/km" />
        <Stat label="Longest" value={best ? `${fmtKm(best.distanceKm)} km` : '–'} sub={best ? 'personal max' : 'log a run'} />
        <Stat label="Streak" value={`${weekStreak(myRuns)} wk`} sub="≥ 2 runs/week" />
        {me.planOn
          ? <Stat label="Plan" value={completion == null ? '–' : `${Math.round(completion * 100)}%`} sub={myPlan ? `${levelsFor(myPlan.kind)[me.level].label} · sessions hit` : 'sessions hit'} />
          : <Stat label="Plan" value="Off" sub="just logging runs" />}
        <Stat label="Next race" value={myTarget ? `${daysUntil(myTarget)} d` : '–'} sub={myTarget ? myTarget.name : 'none picked'} />
      </section>

      <section className="card p-4">
        <h2 className="h-section mb-3">Weekly km</h2>
        <WeekChart data={weeks} />
      </section>

      <section>
        <h2 className="h-section mb-2">My runs</h2>
        <div className="space-y-3">
          {myRuns.length ? myRuns.slice(0, shown).map((r) => <RunCard key={r.id} run={r} showWho={false} />) : <Empty>Zero runs. The couch wins.</Empty>}
        </div>
        {myRuns.length > shown && <button className="btn-outline mt-4 w-full" onClick={() => setShown((n) => n + 20)}>Show more</button>}
      </section>

      <section className="card p-4">
        <h2 className="h-section mb-3">Profile</h2>
        <label className="label" htmlFor="name">Display name</label>
        <input id="name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
        <p className="mt-2 text-xs text-ink-muted">Signed in as {user?.email}</p>
      </section>
    </div>
  );
}
