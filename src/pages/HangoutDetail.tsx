import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, ExternalLink, Lock, MapPin, Pencil, RotateCcw } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import { Avatar } from '@/components/ui';
import { repo } from '@/lib/repo';
import { fmtDate } from '@/lib/format';
import { bestWindows, hhmm, isLocked, kindOf, responders, slotKey, SLOT_MIN } from '@/lib/hangouts';
import { isSafeImage } from '@/lib/image';
import type { Hangout, HangoutInput, Member, Rsvp } from '@/lib/types';

const RSVPS: { id: Rsvp; label: string; on: string }[] = [
  { id: 'going', label: "I'm in 🙌", on: 'border-good bg-good text-white' },
  { id: 'maybe', label: 'Maybe 🤔', on: 'border-ochre bg-ochre text-white' },
  { id: 'no', label: "Can't 🤏", on: 'border-bad bg-bad text-white' },
];

export default function HangoutDetail() {
  const { id } = useParams();
  const { hangouts, me, members, memberById } = useData();
  const h = hangouts.find((x) => x.id === id);
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const [hover, setHover] = useState<number | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<number>();

  const windows = useMemo(() => (h ? bestWindows(h, members.map((m) => m.uid)) : []), [h, members]);
  const highlight = useHighlight(hover !== null ? windows[hover] : undefined);
  if (!h || !me) return <p className="text-ink-muted">That hangout is gone. 👻</p>;

  const k = kindOf(h.kind);
  const organiser = memberById[h.createdBy];
  const isOrganiser = h.createdBy === me.uid;
  const locked = isLocked(h);
  const myRsvp = h.rsvp[me.uid];
  const out = myRsvp === 'no';

  const rsvp = (r: Rsvp) => repo.setRsvp(h.id, me.uid, myRsvp === r ? null : r).catch((e) => alert(e.message));
  const input = (x: Hangout): HangoutInput => ({
    title: x.title, kind: x.kind, place: x.place, notes: x.notes, link: x.link, poll: x.poll, date: x.date, startTime: x.startTime, endTime: x.endTime,
    image: x.image ?? null,
  });
  const lock = (date: string, start: number, end: number) =>
    confirm(`Lock ${fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${hhmm(start)}–${hhmm(end % 1440)}? Everyone then says in or out.`) &&
    repo.updateHangout(h.id, { ...input(h), date, startTime: hhmm(start), endTime: hhmm(Math.min(end, 24 * 60 - 1)) }).catch((e) => alert(e.message));
  const saveSlots = (slots: string[]) => {
    setSaved('saving');
    repo.setAvail(h.id, me.uid, slots)
      .then(() => {
        setSaved('saved');
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setSaved('idle'), 2000);
      })
      .catch((e) => { setSaved('idle'); alert(e.message); });
  };
  const painted = (h.avail[me.uid] ?? []).length > 0;
  const reopen = () =>
    confirm('Reopen the poll? The locked time goes away.') &&
    repo.updateHangout(h.id, { ...input(h), date: null, startTime: '', endTime: '' }).catch((e) => alert(e.message));

  const silent = members.filter((m) => !responders(h).includes(m.uid) && h.rsvp[m.uid] !== 'no');
  const totalPeople = members.length;

  return (
    <div className="space-y-5">
      {/* header */}
      <section className="card overflow-hidden">
        {isSafeImage(h.image) && <img src={h.image} alt="" className="aspect-[16/9] max-h-72 w-full object-cover" />}
        <div className="p-4">
        <div className="flex items-start gap-3">
          {!isSafeImage(h.image) && <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sunken text-3xl">{k.emoji}</div>}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold leading-tight">{isSafeImage(h.image) && `${k.emoji} `}{h.title}</h1>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-soft">
              {h.place && <span className="flex items-center gap-1"><MapPin size={14} />{h.place}</span>}
              <span className="text-ink-muted">by {organiser?.name.split(' ')[0] ?? 'someone'}</span>
            </div>
          </div>
          {isOrganiser && <Link to={`/hangouts/${h.id}/edit`} className="btn-ghost -mr-2 -mt-1 px-2 py-1 text-xs"><Pencil size={14} /> Edit</Link>}
        </div>
        {h.notes && <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{h.notes}</p>}
        {h.link && <a href={h.link} target="_blank" rel="noreferrer" className="btn-outline mt-3 px-3 py-1.5"><ExternalLink size={15} /> Link</a>}
        </div>
      </section>

      {h.poll && <Steps step={locked ? 3 : painted || out ? 2 : 1} picker={isOrganiser ? 'You pick' : `${organiser?.name.split(' ')[0] ?? 'Organiser'} picks`} />}

      {locked ? (
        /* ------------------------------------------------------------ fixed / locked */
        <section className="card p-4">
          <div className="flex items-center gap-3">
            <CalendarCheck className="shrink-0 text-good" size={28} />
            <div className="flex-1">
              <div className="font-display text-xl font-bold">{fmtDate(h.date!, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="text-sm text-ink-soft">{h.startTime || 'time TBD'}{h.endTime && ` – ${h.endTime}`}</div>
              <div className="text-xs text-ink-muted">{myRsvp ? 'Change your answer anytime.' : 'Are you in?'}</div>
            </div>
            {isOrganiser && h.poll && <button className="btn-ghost px-2 py-1 text-xs" onClick={reopen}><RotateCcw size={14} /> Reopen poll</button>}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {RSVPS.map((r) => (
              <button key={r.id} onClick={() => rsvp(r.id)} aria-pressed={myRsvp === r.id}
                className={`rounded-xl border py-2.5 text-sm font-semibold transition ${myRsvp === r.id ? r.on : 'border-line hover:bg-sunken'}`}>{r.label}</button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {RSVPS.map((r) => <People key={r.id} label={r.label} list={members.filter((m) => h.rsvp[m.uid] === r.id)} />)}
            <People label="No answer 🫥" list={members.filter((m) => !h.rsvp[m.uid])} />
          </div>
        </section>
      ) : (
        /* ------------------------------------------------------------ poll */
        <>
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="h-section">{view === 'mine' ? 'When are you free?' : `Everyone's times (${responders(h).length}/${totalPeople} answered)`}</h2>
              <div className="flex shrink-0 rounded-xl bg-sunken p-0.5 text-xs font-semibold sm:text-sm">
                {(['mine', 'all'] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`whitespace-nowrap rounded-lg px-2.5 py-1 ${view === v ? 'bg-card shadow-sm' : 'text-ink-muted'}`}>{v === 'mine' ? 'My times' : 'Everyone'}</button>
                ))}
              </div>
            </div>
            {out ? (
              <div className="rounded-xl bg-sunken p-4 text-center text-sm">
                You're out on this one. 🤏 <button className="font-semibold text-brand" onClick={() => rsvp('no')}>Actually, I'm in</button>
              </div>
            ) : (
              <>
                {view === 'mine' && !painted && (
                  <div className="mb-3 rounded-xl bg-brand-soft p-3 text-sm">
                    👆 <b>Tap or drag</b> over the times you're free. They turn <span className="font-semibold text-good">green</span>.
                    Tap a <b>day name</b> to grab the whole day.
                  </div>
                )}
                <AvailabilityGrid poll={h.poll!} view={view} mine={h.avail[me.uid] ?? []} avail={h.avail} people={members}
                  highlight={highlight} onCommit={saveSlots} />
              </>
            )}
            {!out && view === 'mine' && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <button className="text-xs font-semibold text-ink-muted underline" onClick={() => rsvp('no')}>I can't make any of these 🤏</button>
                <span className={`text-xs font-semibold transition ${saved === 'idle' ? 'opacity-0' : 'text-good'}`} aria-live="polite">
                  {saved === 'saving' ? 'Saving…' : 'Saved ✓'}
                </span>
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="h-section mb-1">Best times so far</h2>
            <p className="mb-3 text-xs text-ink-muted">{fmtLen(h.poll!.durationMin)} slots where the most people are free start to finish. Updates live.</p>
            {windows.length ? (
              <ol className="space-y-2">
                {windows.slice(0, 4).map((w, i) => (
                  <li key={`${w.date}-${w.start}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${i === 0 ? 'border-good bg-good/10' : 'border-line'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {i === 0 && '🏆 '}{fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {hhmm(w.start)}–{hhmm(w.end % 1440)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                        <span className="flex -space-x-1.5">{w.free.map((u) => <span key={u} className="rounded-full ring-2 ring-card"><Avatar m={memberById[u]} size={20} /></span>)}</span>
                        {w.free.length}/{totalPeople} free{w.free.length === totalPeople && ' — everyone! 🎉'}
                      </div>
                    </div>
                    {isOrganiser && (
                      <button className="btn-primary shrink-0 px-3 py-2" onClick={() => lock(w.date, w.start, w.end)}><Lock size={14} /> Pick this</button>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">Nobody's free for {fmtLen(h.poll!.durationMin)} straight yet. 🦗</p>
            )}
            {silent.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                Still ghosting:
                <span className="flex -space-x-1.5">{silent.map((m) => <span key={m.uid} title={m.name} className="rounded-full ring-2 ring-card"><Avatar m={m} size={20} /></span>)}</span>
              </div>
            )}
            {!isOrganiser && <p className="mt-3 text-xs text-ink-muted">{organiser?.name.split(' ')[0] ?? 'The organiser'} picks the final time from these.</p>}
            {isOrganiser && windows.length > 0 && <p className="mt-3 text-xs text-ink-muted">Happy with one? <b>Pick this</b> locks it, then everyone says in or out.</p>}
          </section>
        </>
      )}
    </div>
  );
}

/** 1 mark your times → 2 organiser picks → 3 say in or out. */
function Steps({ step, picker }: { step: 1 | 2 | 3; picker: string }) {
  const items = ['Mark when you’re free', `${picker} the time`, 'Say if you’re in'];
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label="How this works">
      {items.map((t, i) => {
        const n = i + 1;
        const done = n < step;
        const now = n === step;
        return (
          <li key={t} className={`rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-tight ${now ? 'bg-brand text-white' : done ? 'bg-good/15 text-good' : 'bg-sunken text-ink-muted'}`}>
            <div className="text-sm">{done ? '✓' : n}</div>
            {t}
          </li>
        );
      })}
    </ol>
  );
}

function useHighlight(w?: { date: string; start: number; end: number }) {
  return useMemo(() => {
    if (!w) return undefined;
    const s = new Set<string>();
    for (let m = w.start; m < w.end; m += SLOT_MIN) s.add(slotKey(w.date, m));
    return s;
  }, [w?.date, w?.start, w?.end]); // eslint-disable-line react-hooks/exhaustive-deps
}

function fmtLen(m: number) {
  return m < 60 ? `${m}-min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`;
}

function People({ label, list }: { label: string; list: Member[] }) {
  if (!list.length) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-ink-muted">{label}</span>
      <span className="flex flex-wrap gap-1.5">
        {list.map((m) => <span key={m.uid} className="flex items-center gap-1 rounded-full bg-sunken py-0.5 pl-0.5 pr-2"><Avatar m={m} size={20} />{m.name.split(' ')[0]}</span>)}
      </span>
    </div>
  );
}
