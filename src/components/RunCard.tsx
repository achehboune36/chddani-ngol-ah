import { Link } from 'react-router-dom';
import { ExternalLink, Pencil } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { repo } from '@/lib/repo';
import { fmtDuration, fmtKm, fmtPace, fmtRelDay } from '@/lib/format';
import { FEELS, REACTIONS, RUN_TYPES, type Run } from '@/lib/types';
import { Avatar } from './ui';

const TYPE_STYLE: Record<Run['type'], string> = {
  easy: 'bg-good/15 text-good',
  long: 'bg-brand-soft text-brand',
  tempo: 'bg-ochre/20 text-ochre',
  intervals: 'bg-[#5b5fc7]/15 text-[#6b6fe0]',
  race: 'bg-ink text-bg',
  other: 'bg-sunken text-ink-soft',
};

export default function RunCard({ run, showWho = true }: { run: Run; showWho?: boolean }) {
  const { memberById, me } = useData();
  const who = memberById[run.uid];
  const mine = me?.uid === run.uid;
  const feel = FEELS.find((f) => f.id === run.feel);
  const myReaction = me ? run.reactions[me.uid] : undefined;
  const counts: Record<string, number> = {};
  for (const e of Object.values(run.reactions)) counts[e] = (counts[e] ?? 0) + 1;

  const toggle = (e: string) => {
    if (!me) return;
    repo.react(run.id, me.uid, myReaction === e ? null : e).catch((err) => alert(err.message));
  };

  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        {showWho && <Avatar m={who} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            {showWho && <span className="truncate font-semibold">{who?.name ?? 'Someone'}</span>}
            <span className="shrink-0 text-ink-muted">{fmtRelDay(run.date)}</span>
            <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[run.type]}`}>
              {RUN_TYPES.find((t) => t.id === run.type)?.label}
            </span>
          </div>
          <div className="tnum mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div><span className="font-display text-3xl font-extrabold">{fmtKm(run.distanceKm, 2)}</span><span className="ml-1 text-sm text-ink-muted">km</span></div>
            <Metric v={fmtDuration(run.durationSec)} l="time" />
            <Metric v={fmtPace(run.durationSec / run.distanceKm)} l="/km" />
            <Metric v={`${feel?.emoji ?? ''} ${run.effort}`} l="effort" />
          </div>
          {run.notes && <p className="mt-2 whitespace-pre-line break-words text-sm text-ink-soft">{run.notes}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {REACTIONS.map((e) => (
              <button key={e} onClick={() => toggle(e)} aria-pressed={myReaction === e} aria-label={`React ${e}`}
                className={`rounded-full border px-2 py-0.5 text-sm transition ${myReaction === e ? 'border-brand bg-brand-soft' : counts[e] ? 'border-line' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                {e}{counts[e] ? <span className="ml-1 text-xs font-semibold text-ink-soft">{counts[e]}</span> : null}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              {run.link && (
                <a href={run.link} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-xs"><ExternalLink size={14} /> Link</a>
              )}
              {mine && <Link to={`/runs/log/${run.id}`} className="btn-ghost px-2 py-1 text-xs"><Pencil size={14} /> Edit</Link>}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ v, l }: { v: string; l: string }) {
  return (
    <div className="text-sm">
      <div className="font-semibold">{v}</div>
      <div className="text-xs text-ink-muted">{l}</div>
    </div>
  );
}
