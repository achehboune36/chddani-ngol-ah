import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { fmtDate } from '@/lib/format';
import { hhmm, slotKey, slotRows } from '@/lib/hangouts';
import type { HangoutPoll, Member } from '@/lib/types';

interface Props {
  poll: HangoutPoll;
  /** 'mine' = paint my own slots; 'all' = heatmap of everyone */
  view: 'mine' | 'all';
  mine: string[];
  avail: Record<string, string[]>;
  people: Member[];
  highlight?: Set<string>;
  onCommit?: (slots: string[]) => void;
}

/**
 * When2meet-style grid. Columns = days, rows = 30-min slots.
 * Painting: press on a cell and drag; the rectangle from there to the pointer is painted.
 * The first cell decides add vs remove.
 * One write per stroke (on release), not per cell.
 */
export default function AvailabilityGrid({ poll, view, mine, avail, people, highlight, onCommit }: Props) {
  const days = useMemo(() => [...poll.days].sort(), [poll.days]);
  const rows = useMemo(() => slotRows(poll), [poll]);
  const [sel, setSel] = useState<Set<string>>(() => new Set(mine));
  const [picked, setPicked] = useState<string | null>(null);
  const stroke = useRef<{ add: boolean; anchor: string; base: Set<string> } | null>(null);
  const dirty = useRef(false);
  const selRef = useRef(sel);
  if (!stroke.current) selRef.current = sel;

  // Follow server updates unless I'm mid-stroke.
  useEffect(() => {
    if (!stroke.current) setSel(new Set(mine));
  }, [mine.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<string, string[]> = {};
    for (const p of people) for (const k of avail[p.uid] ?? []) (c[k] ??= []).push(p.uid);
    return c;
  }, [avail, people]);
  const max = Math.max(1, people.filter((p) => (avail[p.uid] ?? []).length).length);

  const commit = (next: Set<string>) => {
    const valid = new Set(days.flatMap((d) => rows.map((m) => slotKey(d, m))));
    onCommit?.([...next].filter((k) => valid.has(k)).sort());
  };

  // A stroke paints the rectangle between where it started and where the pointer is now
  // (like When2meet). Recomputed from the pre-stroke selection each move, so a fast swipe
  // that skips cells — or dragging back — still gives exactly the rectangle you see.
  const paint = (k: string) => {
    const st = stroke.current;
    if (!st) return;
    const [d1, r1] = pos(st.anchor);
    const [d2, r2] = pos(k);
    if (d1 < 0 || d2 < 0) return;
    const n = new Set(st.base);
    for (let d = Math.min(d1, d2); d <= Math.max(d1, d2); d++)
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        const key = slotKey(days[d], rows[r]);
        if (st.add) n.add(key); else n.delete(key);
      }
    dirty.current = true;
    selRef.current = n; // the ref is the source of truth mid-stroke; state is for rendering
    setSel(n);
  };
  const pos = (k: string): [number, number] => [days.indexOf(k.slice(0, 10)), rows.findIndex((m) => slotKey(k.slice(0, 10), m) === k)];
  const keyAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-k]')?.dataset.k;

  const down = (e: RPointerEvent) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>('[data-k]')?.dataset.k;
    if (!k) return;
    if (view === 'all') return setPicked(k === picked ? null : k);
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    stroke.current = { add: !selRef.current.has(k), anchor: k, base: new Set(selRef.current) };
    paint(k);
  };
  const move = (e: RPointerEvent) => {
    if (!stroke.current) return;
    const k = keyAt(e.clientX, e.clientY);
    if (k) paint(k);
  };
  const up = () => {
    if (!stroke.current) return;
    stroke.current = null;
    if (dirty.current) {
      dirty.current = false;
      commit(selRef.current);
    }
  };

  const toggleDay = (d: string) => {
    if (view !== 'mine') return;
    const keys = rows.map((m) => slotKey(d, m));
    const allOn = keys.every((k) => sel.has(k));
    const n = new Set(sel);
    for (const k of keys) if (allOn) n.delete(k); else n.add(k);
    setSel(n);
    commit(n);
  };

  const cols = `44px repeat(${days.length}, minmax(44px, 1fr))`;
  const pickedPeople = picked ? (counts[picked] ?? []).map((u) => people.find((p) => p.uid === u)?.name.split(' ')[0]).filter(Boolean) : [];

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div style={{ minWidth: 44 + days.length * 44 }}>
          {/* day headers */}
          <div className="grid gap-px" style={{ gridTemplateColumns: cols }}>
            <div />
            {days.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`rounded-t-lg px-0.5 py-1 text-center leading-tight ${view === 'mine' ? 'hover:bg-sunken' : 'cursor-default'}`}>
                <div className="text-[10px] font-semibold uppercase text-ink-muted">{fmtDate(d, { weekday: 'short' })}</div>
                <div className="text-sm font-bold">{fmtDate(d, { day: 'numeric' })}</div>
              </button>
            ))}
          </div>
          {/* cells */}
          <div className="grid select-none gap-px" style={{ gridTemplateColumns: cols }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {rows.map((m) => (
              <Row key={m} m={m} days={days} view={view} sel={sel} counts={counts} max={max} highlight={highlight} picked={picked} />
            ))}
          </div>
        </div>
      </div>

      {view === 'mine' ? (
        <p className="mt-2 text-xs text-ink-muted"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-good align-middle" /> = you're free. Tap green again to undo.</p>
      ) : picked ? (
        <p className="mt-2 text-sm">
          <b>{fmtDate(picked.slice(0, 10))} {picked.slice(11)}</b>: {pickedPeople.length ? pickedPeople.join(', ') : 'nobody 🦗'}
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Number = how many are free. Tap a slot to see who.</p>
      )}
    </div>
  );
}

function Row({ m, days, view, sel, counts, max, highlight, picked }: {
  m: number; days: string[]; view: 'mine' | 'all'; sel: Set<string>; counts: Record<string, string[]>; max: number;
  highlight?: Set<string>; picked: string | null;
}) {
  const fullHour = m % 60 === 0;
  return (
    <>
      <div className={`-mt-2 pr-1 text-right text-[10px] text-ink-muted ${fullHour ? '' : 'invisible'}`}>{hhmm(m % 1440)}</div>
      {days.map((d) => {
        const k = slotKey(d, m);
        const n = counts[k]?.length ?? 0;
        const on = view === 'mine' ? sel.has(k) : n > 0;
        const alpha = view === 'mine' ? 1 : 0.18 + 0.82 * (n / max);
        return (
          <div key={k} data-k={k}
            className={`relative h-6 cursor-pointer ${fullHour ? 'border-t border-line' : ''} ${on ? '' : 'bg-sunken'} ${highlight?.has(k) ? 'ring-2 ring-inset ring-brand' : ''} ${picked === k ? 'outline outline-2 outline-ink' : ''}`}
            // Cells swallow touch-drags (to paint); the time column stays scrollable.
            style={{ ...(on ? { background: `rgb(var(--good) / ${alpha})` } : {}), touchAction: view === 'mine' ? 'none' : 'auto' }}>
            {view === 'all' && n > 0 && <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white">{n}</span>}
          </div>
        );
      })}
    </>
  );
}
