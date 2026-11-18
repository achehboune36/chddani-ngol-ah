import { useMemo, useState } from 'react';
import { useData } from '@/data/DataProvider';
import RunCard from '@/components/RunCard';
import { Avatar, Empty, PageTitle } from '@/components/ui';
import { fmtKm, mondayOf, todayIso } from '@/lib/format';
import { planCompletion } from '@/lib/plan';
import { longest, runsInWeek, sumKm, weekStreak } from '@/lib/stats';

type Board = 'week' | 'total' | 'longest' | 'plan' | 'streak';
const BOARDS: { id: Board; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'total', label: 'All-time km' },
  { id: 'longest', label: 'Longest run' },
  { id: 'plan', label: 'Plan %' },
  { id: 'streak', label: 'Streak' },
];

export default function Leaderboard() {
  const { members, runs, me, planOf } = useData();
  const [board, setBoard] = useState<Board>('week');
  const [shown, setShown] = useState(15);

  const rows = useMemo(() => {
    const monday = mondayOf(todayIso());
    return members.map((m) => {
      const rs = runs.filter((r) => r.uid === m.uid);
      const plan = planCompletion(planOf(m), rs);
      return {
        m,
        week: sumKm(runsInWeek(rs, monday)),
        total: sumKm(rs),
        longest: longest(rs)?.distanceKm ?? 0,
        plan: plan ?? -1,
        streak: weekStreak(rs),
        count: rs.length,
      };
    });
  }, [members, runs, planOf]);

  const anyPlan = members.some((m) => m.planOn);
  const boards = BOARDS.filter((b) => b.id !== 'plan' || anyPlan);
  const sorted = [...rows].sort((a, b) => b[board] - a[board] || b.total - a.total);
  const fmt = (r: (typeof rows)[number]) => {
    switch (board) {
      case 'week': return `${fmtKm(r.week)} km`;
      case 'total': return `${fmtKm(r.total, 0)} km`;
      case 'longest': return r.longest ? `${fmtKm(r.longest)} km` : '–';
      case 'plan': return r.plan < 0 ? '–' : `${Math.round(r.plan * 100)}%`;
      case 'streak': return `${r.streak} wk${r.streak === 1 ? '' : 's'}`;
    }
  };
  const top = sorted[0]?.[board] ?? 0;

  return (
    <div className="space-y-6">
      <PageTitle>The crew</PageTitle>

      <section className="card p-4">
        <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {boards.map((b) => (
            <button key={b.id} onClick={() => setBoard(b.id)} className={`chip shrink-0 ${board === b.id ? 'chip-on' : ''}`}>{b.label}</button>
          ))}
        </div>
        <ol className="space-y-1">
          {sorted.map((r, i) => (
            <li key={r.m.uid} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${r.m.uid === me?.uid ? 'bg-sunken' : ''}`}>
              <span className="w-6 text-center font-display text-lg font-bold text-ink-muted">
                {top > 0 && r[board] === top ? '👑' : i + 1}
              </span>
              <Avatar m={r.m} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.m.name}</div>
                <div className="text-xs text-ink-muted">{r.count} runs · {fmtKm(r.total, 0)} km total</div>
              </div>
              <span className="tnum font-display text-lg font-bold">{fmt(r)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink-muted">
          {board === 'plan' && 'Plan people only. Sessions done vs due.'}
          {board === 'streak' && 'Weeks in a row with 2+ runs.'}
          {board === 'week' && 'Monday to Sunday.'}
        </p>
      </section>

      <section>
        <h2 className="h-section mb-2">Feed</h2>
        <div className="space-y-3">
          {runs.length ? runs.slice(0, shown).map((r) => <RunCard key={r.id} run={r} />) : <Empty>Nobody's run yet. Shame.</Empty>}
        </div>
        {runs.length > shown && (
          <button className="btn-outline mt-4 w-full" onClick={() => setShown((n) => n + 20)}>Show more</button>
        )}
      </section>
    </div>
  );
}
