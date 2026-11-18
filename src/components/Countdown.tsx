import { useEffect, useState } from 'react';

/** Big days/hrs/min/sec countdown to `targetMs`. `durationMs` = how long "it's on" lasts after the start. */
export default function Countdown({ targetMs, durationMs = 3 * 3600 * 1000, label = 'the start' }: {
  targetMs: number;
  durationMs?: number;
  label?: string;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = targetMs - now;

  if (left <= 0) {
    const finished = -left > durationMs;
    return <div className="font-display text-4xl font-extrabold">{finished ? 'We did it. 🏅' : 'Race is ON! 🏃💨'}</div>;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const cells: [number, string][] = [[d, 'days'], [h, 'hrs'], [m, 'min'], [s, 'sec']];
  return (
    <div className="flex gap-2 sm:gap-3" role="timer" aria-label={`${d} days ${h} hours ${m} minutes until ${label}`}>
      {cells.map(([v, l]) => (
        <div key={l} className="min-w-[64px] flex-1 rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm sm:min-w-[84px]">
          <div className="tnum font-display text-3xl font-extrabold leading-none sm:text-5xl">{l === 'days' ? v : String(v).padStart(2, '0')}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest opacity-80">{l}</div>
        </div>
      ))}
    </div>
  );
}
