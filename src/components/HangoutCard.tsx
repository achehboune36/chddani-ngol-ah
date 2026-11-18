import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { fmtDate } from '@/lib/format';
import { isLocked, kindOf, needsMe, responders } from '@/lib/hangouts';
import type { Hangout } from '@/lib/types';
import { Avatar } from './ui';
import { isSafeImage } from '@/lib/image';

export default function HangoutCard({ h }: { h: Hangout }) {
  const { me, members } = useData();
  const k = kindOf(h.kind);
  const locked = isLocked(h);
  const going = members.filter((m) => h.rsvp[m.uid] === 'going');
  const answered = members.filter((m) => responders(h).includes(m.uid));
  const shown = locked ? going : answered;
  const todo = me ? needsMe(h, me.uid) : false;
  const mine = me ? h.rsvp[me.uid] : undefined;

  return (
    <Link to={`/hangouts/${h.id}`} className="card flex items-center gap-3 p-3.5 transition hover:border-brand/40">
      {isSafeImage(h.image)
        ? <img src={h.image} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
        : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sunken text-2xl">{k.emoji}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{h.title}</span>
          {todo && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">your turn</span>}
          {!todo && mine && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${mine === 'going' ? 'bg-good/15 text-good' : mine === 'maybe' ? 'bg-ochre/20 text-ochre' : 'bg-sunken text-ink-muted'}`}>
              {mine === 'no' ? 'out' : mine}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-sm text-ink-soft">
          {locked
            ? <>{fmtDate(h.date!, { weekday: 'short', day: 'numeric', month: 'short' })}{h.startTime && ` · ${h.startTime}`}</>
            : <>🗳️ Finding a time · {h.poll!.days.length} day{h.poll!.days.length === 1 ? '' : 's'}</>}
          {h.place && <span className="text-ink-muted"> · <MapPin size={12} className="inline -mt-0.5" /> {h.place}</span>}
        </div>
      </div>
      {shown.length > 0 && (
        <div className="flex shrink-0 -space-x-2">
          {shown.slice(0, 4).map((m) => <span key={m.uid} className="rounded-full ring-2 ring-card"><Avatar m={m} size={24} /></span>)}
        </div>
      )}
    </Link>
  );
}
