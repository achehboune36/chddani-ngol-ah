import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { repo } from '@/lib/repo';
import { addDays, fmtDate, parseIso, todayIso } from '@/lib/format';
import { KINDS, kindOf } from '@/lib/hangouts';
import { isSafeImage, shrinkImage } from '@/lib/image';
import { PageTitle } from '@/components/ui';
import type { HangoutInput, HangoutKind } from '@/lib/types';

const DURATIONS: { min: number; label: string }[] = [
  { min: 60, label: '1h' }, { min: 90, label: '1h30' }, { min: 120, label: '2h' }, { min: 150, label: '2h30' },
  { min: 180, label: '3h' }, { min: 240, label: '4h' }, { min: 360, label: 'Half day' }, { min: 480, label: 'All day' },
];
const DAYPARTS: { id: string; label: string; from: number; to: number }[] = [
  { id: 'morning', label: '🌅 Morning', from: 9, to: 12 },
  { id: 'afternoon', label: '☀️ Afternoon', from: 12, to: 18 },
  { id: 'evening', label: '🌙 Evening', from: 18, to: 24 },
  { id: 'allday', label: '🕘 All day', from: 9, to: 24 },
];
const hourLabel = (h: number) => (h === 24 ? 'midnight' : `${String(h).padStart(2, '0')}:00`);
const durLabel = (m: number) => DURATIONS.find((d) => d.min === m)?.label ?? (m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

export default function HangoutForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { me, hangouts } = useData();
  const existing = id ? hangouts.find((h) => h.id === id) : undefined;
  const today = todayIso();

  const [kind, setKind] = useState<HangoutKind>('cinema');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [mode, setMode] = useState<'poll' | 'fixed'>('poll');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [fromHour, setFromHour] = useState(18);
  const [toHour, setToHour] = useState(24);
  const [customHours, setCustomHours] = useState(false);
  const [duration, setDuration] = useState(150);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind); setTitle(existing.title); setPlace(existing.place); setLink(existing.link); setNotes(existing.notes);
    setImage(existing.image ?? null);
    setMode(existing.poll ? 'poll' : 'fixed');
    setDate(existing.date ?? ''); setStartTime(existing.startTime); setEndTime(existing.endTime);
    if (existing.poll) {
      setDays(existing.poll.days); setFromHour(existing.poll.fromHour); setToHour(existing.poll.toHour); setDuration(existing.poll.durationMin);
      setCustomHours(!DAYPARTS.some((p) => p.from === existing.poll!.fromHour && p.to === existing.poll!.toHour));
    }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id && !existing) return <p className="text-ink-muted">That hangout is gone. 👻</p>;
  if (existing && existing.createdBy !== me?.uid) return <p className="text-ink-muted">Not your hangout to edit. 🙅</p>;

  // ---- day helpers
  const calendar = Array.from({ length: 21 }, (_, i) => addDays(today, i));
  const dow = (d: string) => parseIso(d).getDay(); // 0 = Sun
  const nextWeekend = (offsetWeeks: number) => {
    const sat = calendar.find((d) => dow(d) === 6) ?? today;
    const s = addDays(sat, 7 * offsetWeeks);
    return [addDays(s, -1), s, addDays(s, 1)].filter((d) => d >= today); // Fri–Sun
  };
  const QUICK_DAYS: { label: string; days: () => string[] }[] = [
    { label: 'This weekend', days: () => nextWeekend(0) },
    { label: 'Next weekend', days: () => nextWeekend(1) },
    { label: 'Next 7 days', days: () => calendar.slice(0, 7) },
  ];
  const toggleDay = (d: string) =>
    setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : ds.length >= 14 ? ds : [...ds, d].sort()));

  const pickKind = (k: HangoutKind) => {
    setKind(k);
    if (!existing) setDuration(kindOf(k).minutes);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setImgBusy(true);
    setErr(null);
    try { setImage(await shrinkImage(f)); } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setImgBusy(false); }
  };

  const daypart = DAYPARTS.find((p) => p.from === fromHour && p.to === toHour && !customHours);
  const valid = title.trim().length > 0 && (mode === 'fixed' ? /^\d{4}-\d{2}-\d{2}$/.test(date) : days.length > 0 && fromHour < toHour);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!me || !valid) return;
    setBusy(true);
    setErr(null);
    const poll = mode === 'poll' ? { days, fromHour, toHour, durationMin: duration } : null;
    const input: HangoutInput = {
      title: title.trim().slice(0, 80), kind, place: place.trim().slice(0, 120), link: link.trim().slice(0, 300), notes: notes.trim().slice(0, 1000),
      image: isSafeImage(image) ? image : null,
      poll,
      // A poll that was already locked keeps its locked time; a fresh poll has none.
      date: mode === 'fixed' ? date : existing?.poll ? existing.date : null,
      startTime: mode === 'fixed' ? startTime : existing?.poll ? existing.startTime : '',
      endTime: mode === 'fixed' ? endTime : existing?.poll ? existing.endTime : '',
    };
    try {
      if (existing) { await repo.updateHangout(existing.id, input); nav(`/hangouts/${existing.id}`); }
      else nav(`/hangouts/${await repo.addHangout(me.uid, input)}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm(`Cancel "${existing.title}" for everyone?`)) return;
    await repo.deleteHangout(existing.id);
    nav('/hangouts');
  };

  const dayList = (ds: string[]) => {
    const names = ds.map((d) => fmtDate(d, { weekday: 'short', day: 'numeric' }));
    return names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' & $1') : `${names.length} days (${names[0]} → ${names[names.length - 1]})`;
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-7">
      <PageTitle right={existing && <button type="button" onClick={remove} className="btn-ghost text-bad"><Trash2 size={16} /> Cancel it</button>}>
        {existing ? 'Edit hangout' : 'New hangout'}
      </PageTitle>

      {/* 1 — what */}
      <Step n={1} title="What's the plan?">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button type="button" key={k.id} onClick={() => pickKind(k.id)} className={`chip ${kind === k.id ? 'chip-on' : ''}`}>{k.emoji} {k.label}</button>
          ))}
        </div>
        <input aria-label="Title" className="input mt-3" placeholder={kind === 'cinema' ? 'e.g. Dune 3, finally' : kind === 'food' ? 'e.g. Tajine at Omar’s' : 'Give it a name'}
          value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required />

        {/* cover photo */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        {isSafeImage(image) ? (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-line">
            <img src={image} alt="Cover" className="aspect-[16/9] w-full object-cover" />
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button type="button" onClick={() => fileRef.current?.click()} className="btn bg-black/55 px-2.5 py-1.5 text-xs text-white backdrop-blur hover:bg-black/70">Change</button>
              <button type="button" onClick={() => setImage(null)} aria-label="Remove photo" className="btn bg-black/55 px-2 py-1.5 text-white backdrop-blur hover:bg-black/70"><X size={14} /></button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={imgBusy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-5 text-sm font-semibold text-ink-muted hover:border-brand/50 hover:text-brand">
            <ImagePlus size={18} /> {imgBusy ? 'Squeezing…' : 'Add a cover photo (optional)'}
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <input aria-label="Where" className="input" placeholder="📍 Where" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} />
          <input aria-label="Link" type="url" className="input" placeholder="🔗 Link (tickets…)" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
      </Step>

      {/* 2 — when */}
      <Step n={2} title="When?">
        <div className="grid grid-cols-2 gap-2">
          <ModeCard on={mode === 'poll'} onClick={() => setMode('poll')} title="🗳️ Let's vote" sub="Not sure when. Friends mark when they're free, the app finds the best time." />
          <ModeCard on={mode === 'fixed'} onClick={() => setMode('fixed')} title="📌 It's decided" sub="Date and time are set. Friends just say in or out." />
        </div>

        {mode === 'poll' ? (
          <div className="mt-5 space-y-5">
            <Field label="Which days could work?" hint={days.length ? `${days.length} picked` : 'tap days, up to 14'}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_DAYS.map((q) => (
                  <button type="button" key={q.label} onClick={() => setDays(q.days())} className="chip py-1 text-xs">{q.label}</button>
                ))}
                {days.length > 0 && <button type="button" onClick={() => setDays([])} className="chip py-1 text-xs text-ink-muted">Clear</button>}
              </div>
              <DayGrid days={calendar} isOn={(d) => days.includes(d)} onTap={toggleDay} />
            </Field>

            <Field label="What time of day?" hint="friends can only mark times in this range">
              <div className="flex flex-wrap gap-1.5">
                {DAYPARTS.map((p) => (
                  <button type="button" key={p.id} onClick={() => { setFromHour(p.from); setToHour(p.to); setCustomHours(false); }}
                    className={`chip ${daypart?.id === p.id ? 'chip-on' : ''}`}>{p.label}</button>
                ))}
                <button type="button" onClick={() => setCustomHours(true)} className={`chip ${customHours || !daypart ? 'chip-on' : ''}`}>✏️ Custom</button>
              </div>
              {(customHours || !daypart) && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  between
                  <select aria-label="From" className="input w-auto py-1.5" value={fromHour} onChange={(e) => setFromHour(+e.target.value)}>
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                  and
                  <select aria-label="Until" className="input w-auto py-1.5" value={toHour} onChange={(e) => setToHour(+e.target.value)}>
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h} disabled={h <= fromHour}>{hourLabel(h)}</option>)}
                  </select>
                </div>
              )}
            </Field>

            <Field label="How long does it take?" hint="we look for a slot this long">
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button type="button" key={d.min} onClick={() => setDuration(d.min)} className={`chip ${duration === d.min ? 'chip-on' : ''}`}>{d.label}</button>
                ))}
              </div>
            </Field>

            <Summary>
              {days.length
                ? <>Friends mark when they're free on <b>{dayList(days)}</b>, between <b>{hourLabel(fromHour)}</b> and <b>{hourLabel(toHour)}</b>. The app then shows the <b>{durLabel(duration)}</b> slot that suits the most people, and you lock it in.</>
                : <>Pick at least one day above. 👆</>}
            </Summary>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <Field label="Which day?" hint={date ? fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}>
              <DayGrid days={calendar} isOn={(d) => d === date} onTap={(d) => setDate(d === date ? '' : d)} />
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                Further away?
                <input type="date" className="input w-auto py-1 text-sm" value={calendar.includes(date) ? '' : date} min={today} onChange={(e) => setDate(e.target.value)} />
              </label>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts at"><input aria-label="Starts at" type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
              <Field label="Ends at" hint="optional"><input aria-label="Ends at" type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
            </div>
            <Summary>
              {date
                ? <><b>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}</b>{startTime && <> at <b>{startTime}</b></>}{endTime && <> till <b>{endTime}</b></>}. Friends answer <b>I'm in</b>, <b>Maybe</b> or <b>Can't</b>.</>
                : <>Pick the day above. 👆</>}
            </Summary>
          </div>
        )}
      </Step>

      {/* 3 — notes */}
      <Step n={3} title="Anything else?" optional>
        <textarea aria-label="Notes" rows={2} className="input" placeholder="Bring snacks. Or don't. (Do.)" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      </Step>

      {err && <p className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={!valid || busy || imgBusy}>
        {busy ? 'Saving…' : existing ? 'Save' : mode === 'poll' ? 'Start the vote 🗳️' : 'Make it happen 📌'}
      </button>
    </form>
  );
}

function Step({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs text-white">{n}</span>
        {title}
        {optional && <span className="text-xs font-normal text-ink-muted">optional</span>}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ModeCard({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-xl border-2 p-3 text-left transition ${on ? 'border-brand bg-brand-soft' : 'border-line hover:bg-sunken'}`}>
      <div className={`font-semibold ${on ? 'text-brand' : ''}`}>{title}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>
    </button>
  );
}

function Summary({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-sunken p-3 text-sm text-ink-soft">👀 {children}</div>;
}

/** Three weeks of tappable days, starting today, with the month shown when it changes. */
function DayGrid({ days, isOn, onTap }: { days: string[]; isOn: (d: string) => boolean; onTap: (d: string) => void }) {
  const today = days[0];
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const on = isOn(d);
        const newMonth = i === 0 || d.slice(8) === '01';
        return (
          <button type="button" key={d} onClick={() => onTap(d)} aria-pressed={on}
            className={`relative rounded-lg border py-1.5 text-center leading-tight transition ${on ? 'border-brand bg-brand text-white' : 'border-line hover:bg-sunken'}`}>
            <div className={`text-[10px] font-semibold uppercase ${on ? 'opacity-85' : 'text-ink-muted'}`}>
              {d === today ? 'today' : fmtDate(d, { weekday: 'short' })}
            </div>
            <div className="text-sm font-bold">{fmtDate(d, { day: 'numeric' })}</div>
            {newMonth && <div className={`text-[9px] font-semibold uppercase ${on ? 'opacity-85' : 'text-brand'}`}>{fmtDate(d, { month: 'short' })}</div>}
          </button>
        );
      })}
    </div>
  );
}
