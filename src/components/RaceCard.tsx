import { Link } from 'react-router-dom';
import { CalendarDays, ExternalLink, MapPin, Pencil, Target, Ticket, Star } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { repo } from '@/lib/repo';
import { fmtDate, todayIso } from '@/lib/format';
import { daysUntil, distanceLabel, distanceShort } from '@/lib/race';
import type { Member, Race, RaceStatus } from '@/lib/types';
import type { ReactNode } from 'react';
import { Avatar } from './ui';

export default function RaceCard({ race, compact }: { race: Race; compact?: boolean }) {
  const { me, memberById, myTarget, members } = useData();
  const mine = me ? race.crew[me.uid] : undefined;
  const days = daysUntil(race);
  const past = race.date < todayIso();
  const paid = members.filter((m) => race.crew[m.uid] === 'paid');
  const interested = members.filter((m) => race.crew[m.uid] === 'interested');
  const isTarget = myTarget?.id === race.id;

  const setStatus = (s: RaceStatus) => {
    if (!me) return;
    repo.setRaceStatus(race.id, me.uid, mine === s ? null : s).catch((e) => alert(e.message));
  };
  const trainForThis = () => {
    if (!me) return;
    repo.saveMember({ ...me, targetRaceId: race.id, targetSince: todayIso(), goalSec: null }).catch((e) => alert(e.message));
  };

  return (
    <article className={`card overflow-hidden ${past ? 'opacity-70' : ''}`}>
      <div className="flex gap-4 p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8f2f17] via-brand to-[#d9822b] text-center text-white">
          <div>
            <div className="font-display text-lg font-extrabold leading-none">{distanceShort(race.distanceKm)}</div>
            {!past && <div className="mt-1 text-[10px] font-semibold uppercase opacity-85">{days === 0 ? 'today' : `${days} d`}</div>}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-lg font-bold leading-tight">{race.name}</h3>
            {me?.uid === race.createdBy && !compact && (
              <Link to={`/runs/races/${race.id}/edit`} className="btn-ghost -mr-2 -mt-1 px-2 py-1 text-xs"><Pencil size={14} /> Edit</Link>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><CalendarDays size={14} />{fmtDate(race.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{race.startTime && ` · ${race.startTime}`}</span>
            <span className="flex items-center gap-1"><MapPin size={14} />{race.place}</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">{distanceLabel(race.distanceKm)} · added by {memberById[race.createdBy]?.name.split(' ')[0] ?? 'someone'}</div>
        </div>
      </div>

      {!compact && race.notes && <p className="-mt-1 whitespace-pre-line px-4 pb-3 text-sm text-ink-soft">{race.notes}</p>}

      <div className="border-t border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Who label="Paid" icon={<Ticket size={14} />} list={paid} />
          <Who label="Interested" icon={<Star size={14} />} list={interested} />
          {!paid.length && !interested.length && <span className="text-ink-muted">Nobody's in yet.</span>}
        </div>
        {!past && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => setStatus('interested')} aria-pressed={mine === 'interested'} className={`chip ${mine === 'interested' ? 'chip-on' : ''}`}>
              <Star size={14} /> Interested
            </button>
            <button onClick={() => setStatus('paid')} aria-pressed={mine === 'paid'} className={`chip ${mine === 'paid' ? 'chip-on' : ''}`}>
              <Ticket size={14} /> Paid my ticket
            </button>
            {!compact && (
              isTarget
                ? <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-good"><Target size={15} /> My next race</span>
                : <button onClick={trainForThis} className="btn-outline ml-auto px-3 py-1.5"><Target size={15} /> Make it my race</button>
            )}
            {race.link && !compact && (
              <a href={race.link} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1.5"><ExternalLink size={15} /> Website</a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Who({ label, icon, list }: { label: string; icon: ReactNode; list: Member[] }) {
  if (!list.length) return null;
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1 font-semibold text-ink-soft">{icon}{label} {list.length}</span>
      <span className="flex -space-x-2">
        {list.slice(0, 6).map((m) => (
          <span key={m.uid} title={m.name} className="rounded-full ring-2 ring-card"><Avatar m={m} size={24} /></span>
        ))}
      </span>
    </span>
  );
}
