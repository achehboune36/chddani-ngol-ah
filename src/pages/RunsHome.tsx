import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, MapPin, Plus } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import Countdown from '@/components/Countdown';
import RunCard from '@/components/RunCard';
import RaceCard from '@/components/RaceCard';
import SessionRow from '@/components/SessionRow';
import { Avatar, Empty, memberColor } from '@/components/ui';
import { MILESTONES, distanceLabel, raceStartMs } from '@/lib/race';
import { addDays, fmtDate, fmtKm, mondayOf, todayIso } from '@/lib/format';
import { sessionStatus, weekIndexOf } from '@/lib/plan';
import { runsInWeek, sumKm } from '@/lib/stats';

export default function RunsHome() {
  const { members, runs, myRuns, myPlan, myTarget, upcomingRaces } = useData();
  const today = todayIso();
  const wk = myPlan ? weekIndexOf(myPlan, today) : 0;
  const week = myPlan && wk >= 1 && wk <= myPlan.weeks.length ? myPlan.weeks[wk - 1] : null;
  const todaySession = week?.sessions.find((s) => s.date === today);
  const loggedToday = myRuns.some((r) => r.date === today);
  const monday = mondayOf(today);
  const myWeekRuns = runsInWeek(myRuns, monday);
  const otherRaces = upcomingRaces.filter((r) => r.id !== myTarget?.id).slice(0, 2);

  const crewKm = sumKm(runs);
  const goal = MILESTONES.find((m) => m > crewKm) ?? Math.ceil((crewKm + 1) / 5000) * 5000;
  const perMember = members
    .map((m) => ({ m, km: sumKm(runs.filter((r) => r.uid === m.uid)) }))
    .filter((x) => x.km > 0)
    .sort((a, b) => b.km - a.km);

  return (
    <div className="space-y-5">
      {/* Hero: my next race */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#8f2f17] via-brand to-[#d9822b] p-5 text-white shadow-card sm:p-7">
        {myTarget ? (
          <>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-widest opacity-85">
              <span>Next up · {distanceLabel(myTarget.distanceKm)}</span>
              {week && <span className="rounded-full bg-white/20 px-2 py-0.5">Week {wk}/{myPlan!.weeks.length}</span>}
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">{myTarget.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
              <MapPin size={14} /> {myTarget.place} · {fmtDate(myTarget.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{myTarget.startTime && ` · ${myTarget.startTime}`}
            </p>
            <div className="mt-4"><Countdown targetMs={raceStartMs(myTarget)} label={myTarget.name} /></div>
            {todaySession && !loggedToday && (
              <Link to="/runs/log" className="mt-5 flex items-center gap-3 rounded-2xl bg-white/15 p-3 hover:bg-white/20">
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Today's session</div>
                  <div className="font-semibold">{todaySession.title} · {todaySession.km} km</div>
                </div>
                <span className="btn bg-white px-3 py-2 text-[#3a1a10]"><Plus size={16} /> Log it</span>
              </Link>
            )}
            {!todaySession && !loggedToday && (
              <Link to="/runs/log" className="btn mt-5 bg-white text-[#3a1a10]"><Plus size={16} /> Log a run</Link>
            )}
            {loggedToday && <p className="mt-5 rounded-2xl bg-white/15 p-3 text-sm font-semibold">✅ Done for today. Legend.</p>}
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-extrabold">No race on the calendar</h1>
            <p className="mt-1 text-sm opacity-90">Running for no reason? Bold.</p>
            <Link to="/runs/races/new" className="btn mt-4 bg-white text-[#3a1a10]"><CalendarPlus size={16} /> Add a race</Link>
          </>
        )}
      </section>

      {/* This week */}
      {myPlan && (
        <section className="card p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="h-section">{week ? `Your week ${wk} · ${week.phase}` : wk === 0 ? `Plan starts ${fmtDate(myPlan.start, { day: 'numeric', month: 'short' })}` : 'Plan complete'}</h2>
            <Link to="/runs/plan" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">Full plan <ArrowRight size={14} /></Link>
          </div>
          {week ? (
            <div className="-mx-1 space-y-0.5">
              {week.sessions.map((s) => <SessionRow key={s.date} s={s} status={sessionStatus(s, myRuns, myPlan, today)} compact />)}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{wk === 0 ? 'Not yet. Go run something easy.' : 'Done. Go eat.'}</p>
          )}
        </section>
      )}

      {/* No plan (or not started yet): just this week's running, no sessions to tick */}
      {!week && (
        <section className="card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="h-section">Your week</h2>
            <span className="tnum text-sm text-ink-muted"><b className="text-ink">{fmtKm(sumKm(myWeekRuns))} km</b> · {myWeekRuns.length} run{myWeekRuns.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(monday, i);
              const km = sumKm(myWeekRuns.filter((r) => r.date === d));
              return (
                <div key={d} className={`rounded-xl py-2 text-center ${km ? 'bg-brand text-white' : d === today ? 'bg-brand-soft' : 'bg-sunken'}`}>
                  <div className={`text-[10px] font-semibold uppercase ${km ? 'opacity-85' : 'text-ink-muted'}`}>{fmtDate(d, { weekday: 'narrow' })}</div>
                  <div className="tnum text-sm font-bold">{km ? fmtKm(km, 1) : '·'}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {myPlan
              ? "Plan hasn't kicked in yet. Everything counts."
              : <>Feeling serious? <Link to="/runs/plan" className="font-semibold text-brand">Get a plan</Link>.</>}
          </p>
        </section>
      )}

      {/* Other races */}
      {otherRaces.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="h-section">Also coming up</h2>
            <Link to="/runs/races" className="flex items-center gap-1 text-sm font-semibold text-brand">All races <ArrowRight size={14} /></Link>
          </div>
          <div className="space-y-3">{otherRaces.map((r) => <RaceCard key={r.id} race={r} compact />)}</div>
        </section>
      )}

      {/* Crew km */}
      <section className="card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="h-section">Crew kilometres</h2>
          <span className="tnum text-sm text-ink-muted"><b className="text-ink">{fmtKm(crewKm, 0)}</b> / next milestone {fmtKm(goal, 0)} km</span>
        </div>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`${Math.round(crewKm)} of ${goal} km`}>
          {perMember.map(({ m, km }) => (
            <div key={m.uid} title={`${m.name}: ${fmtKm(km)} km`} style={{ width: `${Math.min(100, (km / goal) * 100)}%`, background: memberColor(m.uid) }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {perMember.map(({ m, km }) => (
            <span key={m.uid} className="flex items-center gap-1.5 text-sm">
              <Avatar m={m} size={20} /> <span className="text-ink-soft">{m.name.split(' ')[0]}</span>
              <b className="tnum">{fmtKm(km, 0)}</b>
            </span>
          ))}
          {!perMember.length && <span className="text-sm text-ink-muted">Bar's empty. Somebody run.</span>}
        </div>
      </section>

      {/* Feed preview */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="h-section">Latest from the crew</h2>
          <Link to="/runs/crew" className="flex items-center gap-1 text-sm font-semibold text-brand">All <ArrowRight size={14} /></Link>
        </div>
        <div className="space-y-3">
          {runs.length ? runs.slice(0, 3).map((r) => <RunCard key={r.id} run={r} />) : <Empty>Crickets. 🦗</Empty>}
        </div>
      </section>
    </div>
  );
}
