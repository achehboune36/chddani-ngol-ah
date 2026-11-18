import type { ReactNode } from 'react';
import type { Member } from '@/lib/types';

export function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-brand" aria-label="Loading" />;
}

const HUES = ['#b9472a', '#2f7d6d', '#d69630', '#5b5fc7', '#c2447a', '#3b82c4', '#7a8b2e', '#8a5a44'];
export function memberColor(uid: string) {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({ m, size = 36 }: { m?: Member; size?: number }) {
  const name = m?.name ?? '?';
  const initials = name.replace(/\(.*\)/, '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (m?.photoURL)
    return <img src={m.photoURL} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: memberColor(m?.uid ?? '?'), fontSize: size * 0.38 }}>
      {initials || '?'}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-sunken px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="tnum mt-0.5 font-display text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">{children}</div>;
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">{children}</h1>
      {right}
    </div>
  );
}
