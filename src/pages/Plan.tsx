import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronDown } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import SessionRow from '@/components/SessionRow';
import { Empty, PageTitle } from '@/components/ui';
import { repo } from '@/lib/repo';
import { fmtDate, fmtPace, todayIso } from '@/lib/format';
import { fmtGoal, levelsFor, planCompletion, planKind, sessionStatus, templateLabel, weekIndexOf } from '@/lib/plan';
import { LEVEL_IDS, type Level, type Member } from '@/lib/types';

export default function Plan() {
  const { me, myPlan, myRuns, myTarget, upcomingRaces } = useData();
  const today = todayIso();
  const current = myPlan ? weekIndexOf(myPlan, today) : 0;
  const [open, setOpen] = useState<number>(-1);
  useEffect(() => {
    if (myPlan) setOpen(Math.max(1, Math.min(myPlan.weeks.length, current)));
  }, [myPlan?.race.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = myPlan?.goalSec ?? 0;
  const [gh, setGh] = useState('');
  const [gm, setGm] = useState('');
  useEffect(() => {
    setGh(String(Math.floor(goal / 3600)));
    setGm(String(Math.round((goal % 3600) / 60)).padStart(2, '0'));
  }, [goal]);

  if (!me) return null;
  const save = (patch: Partial<Member>) => repo.saveMember({ ...me, ...patch }).catch((e) => alert(e.message));
  const saveGoal = () => {
    const sec = (parseInt(gh) || 0) * 3600 + (parseInt(gm) || 0) * 60;
    if (sec >= 600 && sec <= 36000 && sec !== goal) save({ goalSec: sec });
  };
  const trainable = upcomingRaces.filter((r) => planKind(r.distanceKm));
  const completion = planCompletion(myPlan, myRuns, today);

  return (
    <div className="space-y-5">
      <PageTitle right={completion != null && <span className="text-sm text-ink-muted"><b className="text-ink">{Math.round(completion * 100)}%</b> done so far</span>}>
        Training
      </PageTitle>

      <section className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="target">My next race</label>
          {upcomingRaces.length ? (
            <select id="target" className="input" value={myTarget?.id ?? ''}
              onChange={(e) => save({ targetRaceId: e.target.value, targetSince: today, goalSec: null })}>
              {upcomingRaces.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}{planKind(r.distanceKm) ? '' : ' (no plan template)'}
                </option>
              ))}
            </select>
          ) : (
            <Empty>No races. <Link to="/runs/races/new" className="font-semibold text-brand">Add one</Link>.</Empty>
          )}

        </div>

        {myPlan && (
          <>
            <div>
              <div className="label">Your level · {templateLabel(myPlan.kind)}</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {LEVEL_IDS.map((id: Level) => {
                  const l = levelsFor(myPlan.kind)[id];
                  const on = me.level === id;
                  return (
                    <button key={id} onClick={() => save({ level: id, goalSec: null })}
                      className={`rounded-xl border p-3 text-left transition ${on ? 'border-brand bg-brand-soft' : 'border-line hover:bg-sunken'}`}>
                      <div className={`font-semibold ${on ? 'text-brand' : ''}`}>{l.label}</div>
                      <div className="text-xs text-ink-muted">{l.blurb}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Goal time (h:mm)</label>
                <div className="flex items-center gap-1">
                  <input aria-label="Hours" inputMode="numeric" className="input tnum w-14 text-center" value={gh}
                    onChange={(e) => setGh(e.target.value.replace(/\D/g, '').slice(0, 1))} onBlur={saveGoal} />
                  <span className="font-bold">:</span>
                  <input aria-label="Minutes" inputMode="numeric" className="input tnum w-16 text-center" value={gm}
                    onChange={(e) => setGm(e.target.value.replace(/\D/g, '').slice(0, 2))} onBlur={saveGoal} />
                </div>
              </div>
              <div className="grid w-full grid-cols-4 gap-2 text-center sm:w-auto sm:flex-1">
                {([['Race', myPlan.paces.race], ['Easy', myPlan.paces.easy], ['Tempo', myPlan.paces.tempo], ['Reps', myPlan.paces.interval]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-sunken px-1 py-2">
                    <div className="tnum font-display text-base font-bold sm:text-lg">{fmtPace(v)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-[11px]">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-ink-muted">Goal {fmtGoal(goal)}. Paces in min/km. Run on the day, get the tick.</p>
          </>
        )}
        {me.planOn && myTarget && !myPlan && (
          <p className="text-sm text-ink-muted">No plan for this distance. Freestyle it.</p>
        )}
      </section>

      {!me.planOn && (
        <section className="card p-5 text-center">
          <CalendarCheck className="mx-auto text-brand" size={32} />
          <h2 className="mt-2 font-display text-xl font-bold">No plan, no stress</h2>
          <p className="mt-1 text-sm text-ink-soft">Run whatever, whenever. It all counts.</p>
          <button className="btn-primary mt-4" disabled={!trainable.length}
            onClick={() => save({ planOn: true, targetSince: today, ...(myTarget && !planKind(myTarget.distanceKm) && trainable[0] ? { targetRaceId: trainable[0].id } : {}) })}>
            Follow a plan
          </button>
          <p className="mt-2 text-xs text-ink-muted">
            {trainable.length ? 'Halves and 10Ks only. Quit anytime.' : 'Needs a half or 10K on the calendar.'}
          </p>
        </section>
      )}

      {myPlan && (
        <div className="space-y-2">
          {myPlan.weeks.map((w) => {
            const statuses = w.sessions.map((s) => sessionStatus(s, myRuns, myPlan, today));
            const done = statuses.filter((s) => s === 'done').length;
            const isOpen = open === w.n;
            const isNow = current === w.n;
            return (
              <section key={w.n} className={`card overflow-hidden ${isNow ? 'ring-2 ring-brand/50' : ''}`}>
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? 0 : w.n)} aria-expanded={isOpen}>
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${isNow ? 'bg-brand text-white' : 'bg-sunken'}`}>{w.n}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {w.phase}{isNow && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">this week</span>}
                    </div>
                    <div className="text-xs text-ink-muted">{fmtDate(w.start, { day: 'numeric', month: 'short' })} – {fmtDate(w.end, { day: 'numeric', month: 'short' })} · {w.km} km</div>
                  </div>
                  <div className="flex gap-1">
                    {statuses.map((s, i) => (
                      <span key={i} className={`h-2 w-2 rounded-full ${s === 'done' ? 'bg-good' : s === 'missed' ? 'bg-bad/50' : s === 'today' ? 'bg-brand' : 'bg-line'}`} />
                    ))}
                  </div>
                  <span className="tnum w-8 text-right text-sm text-ink-muted">{done}/{w.sessions.length}</span>
                  <ChevronDown size={18} className={`text-ink-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 border-t border-line px-1 py-2">
                    {w.sessions.map((s, i) => <SessionRow key={s.date} s={s} status={statuses[i]} />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {me.planOn && (
        <div className="text-center">
          <button className="btn-ghost text-ink-muted" onClick={() => confirm("Quit the plan? Your runs stay.") && save({ planOn: false })}>
            Quit the plan
          </button>
        </div>
      )}
    </div>
  );
}
