import { fmtDate, fmtKm } from '@/lib/format';

/** Bars of actual km per week, with the plan's target as a dashed ghost bar behind. */
export default function WeekChart({ data }: { data: { monday: string; km: number; planned?: number }[] }) {
  const max = Math.max(10, ...data.map((d) => Math.max(d.km, d.planned ?? 0)));
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const planned = d.planned ?? 0;
          return (
            <div key={d.monday} className="relative flex h-full flex-1 flex-col justify-end"
              title={`Week of ${fmtDate(d.monday)}: ${fmtKm(d.km)} km${planned ? ` / ${planned} km planned` : ''}`}>
              <div className={`tnum mb-1 text-center text-[11px] font-semibold ${last ? 'text-brand' : 'text-ink-muted'}`}>
                {d.km ? fmtKm(d.km, 0) : ''}
              </div>
              <div className="relative w-full" style={{ height: `${(Math.max(d.km, planned) / max) * 100}%` }}>
                {planned > 0 && (
                  <div className="absolute inset-x-0 bottom-0 rounded-md border-2 border-dashed border-ink-muted/40"
                    style={{ height: `${(planned / Math.max(d.km, planned)) * 100}%` }} />
                )}
                {d.km > 0 && (
                  <div className={`absolute inset-x-0 bottom-0 rounded-md ${last ? 'bg-brand' : 'bg-brand/50'}`}
                    style={{ height: `${(d.km / Math.max(d.km, planned)) * 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2.5">
        {data.map((d) => (
          <div key={d.monday} className="flex-1 text-center text-[10px] text-ink-muted">{d.monday.slice(8).replace(/^0/, '')}/{d.monday.slice(5, 7).replace(/^0/, '')}</div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Ran</span>
        {data.some((d) => d.planned) && (
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-ink-muted/40" /> Plan target</span>
        )}
      </div>
    </div>
  );
}
