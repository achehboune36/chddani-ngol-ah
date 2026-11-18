import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { repo } from '@/lib/repo';
import { fmtPace, todayIso } from '@/lib/format';
import { sessionOn } from '@/lib/plan';
import { FEELS, RUN_TYPES, type Feel, type RunType } from '@/lib/types';
import { PageTitle } from '@/components/ui';

export default function LogRun() {
  const { id } = useParams();
  const nav = useNavigate();
  const { me, runs, myPlan } = useData();
  const existing = id ? runs.find((r) => r.id === id && r.uid === me?.uid) : undefined;

  const [date, setDate] = useState(todayIso());
  const [km, setKm] = useState('');
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');
  const [type, setType] = useState<RunType>('easy');
  const [effort, setEffort] = useState(5);
  const [feel, setFeel] = useState<Feel>('good');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prefill: edit mode from the run, new mode from today's planned session.
  useEffect(() => {
    if (existing) {
      setDate(existing.date);
      setKm(String(existing.distanceKm));
      const t = existing.durationSec;
      setH(t >= 3600 ? String(Math.floor(t / 3600)) : '');
      setM(String(Math.floor((t % 3600) / 60)));
      setS(String(t % 60));
      setType(existing.type);
      setEffort(existing.effort);
      setFeel(existing.feel);
      setNotes(existing.notes);
      setLink(existing.link);
    }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const planned = sessionOn(myPlan, date);
  useEffect(() => {
    if (!existing && planned) setType(planned.type);
  }, [planned?.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const distance = parseFloat(km.replace(',', '.'));
  const duration = (parseInt(h || '0') || 0) * 3600 + (parseInt(m || '0') || 0) * 60 + (parseInt(s || '0') || 0);
  const pace = useMemo(() => (distance > 0 && duration > 0 ? duration / distance : NaN), [distance, duration]);
  const valid = distance > 0 && distance <= 100 && duration > 0 && duration < 86400 && date <= todayIso();

  if (id && !existing) return <p className="text-ink-muted">Not your run. 🙅</p>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!me || !valid) return;
    setBusy(true);
    setErr(null);
    const input = {
      date, distanceKm: Math.round(distance * 100) / 100, durationSec: duration, type, effort, feel,
      notes: notes.trim().slice(0, 1000), link: link.trim().slice(0, 300),
    };
    try {
      if (existing) await repo.updateRun(existing.id, input);
      else await repo.addRun(me.uid, input);
      nav(existing ? '/me' : '/runs');
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm('Delete this run? No undo.')) return;
    await repo.deleteRun(existing.id);
    nav('/me');
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <PageTitle right={existing && <button type="button" onClick={remove} className="btn-ghost text-bad"><Trash2 size={16} /> Delete</button>}>
        {existing ? 'Edit run' : 'Log a run'}
      </PageTitle>

      {planned && !existing && (
        <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm">
          <span className="font-semibold text-brand">Planned:</span> {planned.title} · {planned.km} km
          <div className="text-ink-soft">{planned.detail}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" className="input" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="km">Distance (km)</label>
          <input id="km" inputMode="decimal" className="input tnum" placeholder="8.5" value={km} onChange={(e) => setKm(e.target.value)} required autoFocus={!existing} />
        </div>
      </div>

      <div>
        <label className="label">Time</label>
        <div className="flex items-center gap-2">
          <TimeBox v={h} set={setH} unit="h" max={23} />
          <TimeBox v={m} set={setM} unit="min" max={59} />
          <TimeBox v={s} set={setS} unit="sec" max={59} />
          <div className="ml-auto text-right">
            <div className="tnum font-display text-2xl font-bold">{fmtPace(pace)}</div>
            <div className="text-xs text-ink-muted">min/km</div>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Type</label>
        <div className="flex flex-wrap gap-2">
          {RUN_TYPES.map((t) => (
            <button type="button" key={t.id} onClick={() => setType(t.id)} className={`chip ${type === t.id ? 'chip-on' : ''}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="effort">Effort: <span className="text-ink">{effort}/10</span></label>
        <input id="effort" type="range" min={1} max={10} value={effort} onChange={(e) => setEffort(+e.target.value)} className="w-full accent-[rgb(var(--brand))]" />
        <div className="flex justify-between text-[11px] text-ink-muted"><span>Chill</span><span>Hard</span><span>All out</span></div>
      </div>

      <div>
        <label className="label">How did it feel?</label>
        <div className="grid grid-cols-4 gap-2">
          {FEELS.map((f) => (
            <button type="button" key={f.id} onClick={() => setFeel(f.id)}
              className={`flex flex-col items-center rounded-xl border py-2 text-sm ${feel === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-soft'}`}>
              <span className="text-2xl">{f.emoji}</span>{f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} className="input" placeholder="Route, weather, how the legs felt…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </div>
      <div>
        <label className="label" htmlFor="link">Strava / Garmin link (optional)</label>
        <input id="link" type="url" className="input" placeholder="https://www.strava.com/activities/…" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>

      {err && <p className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={!valid || busy}>
        {busy ? 'Saving…' : existing ? 'Save changes' : 'Save run'}
      </button>
    </form>
  );
}

function TimeBox({ v, set, unit, max }: { v: string; set: (s: string) => void; unit: string; max: number }) {
  return (
    <label className="relative w-20">
      <input inputMode="numeric" className="input tnum pr-9 text-center" placeholder="0" value={v}
        onChange={(e) => {
          const n = e.target.value.replace(/\D/g, '').slice(0, 2);
          set(n === '' ? '' : String(Math.min(max, parseInt(n))));
        }} aria-label={unit} />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">{unit}</span>
    </label>
  );
}
