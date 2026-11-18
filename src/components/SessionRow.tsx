import { Check, Circle, X } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import type { Session, SessionStatus } from '@/lib/plan';

export default function SessionRow({ s, status, compact }: { s: Session; status: SessionStatus; compact?: boolean }) {
  const icon = {
    done: <span className="grid h-7 w-7 place-items-center rounded-full bg-good text-white"><Check size={16} strokeWidth={3} /></span>,
    missed: <span className="grid h-7 w-7 place-items-center rounded-full bg-bad/15 text-bad"><X size={16} strokeWidth={3} /></span>,
    today: <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white"><Circle size={10} fill="currentColor" /></span>,
    upcoming: <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-line" />,
    skipped: <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-dashed border-line" />,
  }[status];
  return (
    <div className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${status === 'today' ? 'bg-brand-soft' : ''} ${s.type === 'race' ? 'ring-2 ring-brand' : ''}`}>
      <div className="pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="w-14 shrink-0 text-xs font-semibold uppercase text-ink-muted">{fmtDate(s.date, { weekday: 'short', day: 'numeric' })}</span>
          <span className={`min-w-0 font-semibold ${status === 'missed' ? 'text-ink-muted line-through decoration-1' : status === 'skipped' ? 'text-ink-muted' : ''}`}>{s.title}</span>
          <span className="tnum ml-auto shrink-0 text-sm font-semibold text-ink-soft">{s.km} km</span>
        </div>
        {!compact && <p className="mt-0.5 text-sm text-ink-muted sm:pl-16">{s.detail}</p>}
      </div>
    </div>
  );
}
