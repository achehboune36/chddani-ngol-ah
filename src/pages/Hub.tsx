import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import HangoutCard from '@/components/HangoutCard';
import RunCard from '@/components/RunCard';
import { Empty } from '@/components/ui';
import { fmtDate, fmtKm, mondayOf, todayIso } from '@/lib/format';
import { isLocked, isPast, kindOf, needsMe, sortKey } from '@/lib/hangouts';
import { daysUntil, distanceShort } from '@/lib/race';
import { runsInWeek, sumKm } from '@/lib/stats';

const QUIPS = [
  'Why did you say yes? 😅',
  'Too late to back out now.',
  'Your couch misses you. Ignore it.',
  'Plans made. Excuses pending.',
  'Peer pressure, but healthy.',
];

interface Item { key: string; date: string; time: string; emoji: string; title: string; sub: string; to: string }

export default function Hub() {
  const { me, hangouts, upcomingRaces, myRuns, runs, myTarget } = useData();
  const today = todayIso();
  const quip = QUIPS[new Date().getDate() % QUIPS.length];

  const todo = hangouts.filter((h) => me && needsMe(h, me.uid)).sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

  // One timeline: locked hangouts I haven't bailed on + races I'm in (or training for).
  const items: Item[] = [
    ...hangouts
      .filter((h) => isLocked(h) && !isPast(h) && me && h.rsvp[me.uid] !== 'no' && !todo.includes(h))
      .map((h) => ({
        key: h.id, date: h.date!, time: h.startTime, emoji: kindOf(h.kind).emoji, title: h.title,
        sub: `${Object.values(h.rsvp).filter((r) => r === 'going').length} going${h.place ? ` · ${h.place}` : ''}`, to: `/hangouts/${h.id}`,
      })),
    ...upcomingRaces
      .filter((r) => me && (r.crew[me.uid] || r.id === myTarget?.id))
      .map((r) => ({
        key: r.id, date: r.date, time: r.startTime, emoji: '🏃', title: r.name,
        sub: `${distanceShort(r.distanceKm)} · ${r.crew[me!.uid] === 'paid' ? 'ticket paid 🎟️' : 'interested'}`, to: '/runs/races',
      })),
  ].sort((a, b) => (`${a.date}${a.time}` < `${b.date}${b.time}` ? -1 : 1)).slice(0, 6);

  const weekKm = sumKm(runsInWeek(myRuns, mondayOf(today)));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Salam {me?.name.split(' ')[0]} 👋</h1>
        <p className="text-ink-muted">{quip}</p>
      </section>

      {todo.length > 0 && (
        <section>
          <h2 className="h-section mb-2">Waiting on you 👀</h2>
          <div className="space-y-2">{todo.map((h) => <HangoutCard key={h.id} h={h} />)}</div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="h-section">Coming up</h2>
          <Link to="/hangouts/new" className="flex items-center gap-1 text-sm font-semibold text-brand"><Plus size={14} /> Hangout</Link>
        </div>
        {items.length ? (
          <ol className="card divide-y divide-line overflow-hidden">
            {items.map((it) => {
              const d = daysUntil({ date: it.date });
              return (
                <li key={it.key}>
                  <Link to={it.to} className="flex items-center gap-3 p-3 hover:bg-sunken">
                    <div className="w-12 shrink-0 text-center leading-tight">
                      <div className="text-[10px] font-semibold uppercase text-brand">{fmtDate(it.date, { month: 'short' })}</div>
                      <div className="font-display text-xl font-extrabold">{fmtDate(it.date, { day: 'numeric' })}</div>
                    </div>
                    <div className="text-2xl">{it.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{it.title}</div>
                      <div className="truncate text-xs text-ink-muted">{fmtDate(it.date, { weekday: 'short' })}{it.time && ` ${it.time}`} · {it.sub}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-ink-muted">{d === 0 ? 'today' : d === 1 ? 'tmrw' : `${d}d`}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <Empty>Calendar's empty. Suspicious. <Link to="/hangouts/new" className="font-semibold text-brand">Plan something</Link>.</Empty>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#8f2f17] via-brand to-[#d9822b] p-4 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest opacity-85">Runs</div>
            <div className="mt-1 font-display text-2xl font-extrabold">{fmtKm(weekKm)} km <span className="text-base font-semibold opacity-85">this week</span></div>
            {myTarget && <div className="mt-0.5 text-sm opacity-90">{daysUntil(myTarget)} days to {myTarget.name.split(' ')[0]} {distanceShort(myTarget.distanceKm)}</div>}
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/runs/log" className="btn bg-white px-3 py-2 text-[#3a1a10]"><Plus size={16} /> Log run</Link>
            <Link to="/runs" className="btn bg-white/15 px-3 py-2 text-white hover:bg-white/25">Open <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      {runs.length > 0 && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="h-section">Latest sweat</h2>
            <Link to="/runs/crew" className="flex items-center gap-1 text-sm font-semibold text-brand">All <ArrowRight size={14} /></Link>
          </div>
          <div className="space-y-3">{runs.slice(0, 2).map((r) => <RunCard key={r.id} run={r} />)}</div>
        </section>
      )}
    </div>
  );
}
