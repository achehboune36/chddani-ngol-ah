import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { repo } from '@/lib/repo';
import { todayIso } from '@/lib/format';
import { planKind } from '@/lib/plan';
import { PageTitle } from '@/components/ui';

const PRESETS = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: 'Half (21.1)', km: 21.0975 },
  { label: 'Marathon (42.2)', km: 42.195 },
];

export default function RaceForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { me, races } = useData();
  const existing = id ? races.find((r) => r.id === id) : undefined;

  const [name, setName] = useState('');
  const [km, setKm] = useState<number | null>(10);
  const [customKm, setCustomKm] = useState('');
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [place, setPlace] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    const preset = PRESETS.find((p) => Math.abs(p.km - existing.distanceKm) < 0.01);
    if (preset) { setKm(preset.km); setCustom(false); } else { setCustom(true); setCustomKm(String(existing.distanceKm)); }
    setDate(existing.date);
    setStartTime(existing.startTime);
    setPlace(existing.place);
    setLink(existing.link);
    setNotes(existing.notes);
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id && !existing) return <p className="text-ink-muted">That race doesn't exist any more.</p>;
  if (existing && existing.createdBy !== me?.uid) return <p className="text-ink-muted">Not your race to edit. 🙅</p>;

  const distance = custom ? parseFloat(customKm.replace(',', '.')) : km ?? NaN;
  const valid = name.trim().length > 0 && distance >= 1 && distance <= 250 && /^\d{4}-\d{2}-\d{2}$/.test(date) && place.trim().length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!me || !valid) return;
    setBusy(true);
    setErr(null);
    const input = {
      name: name.trim().slice(0, 80), distanceKm: Math.round(distance * 10000) / 10000, date, startTime,
      place: place.trim().slice(0, 120), link: link.trim().slice(0, 300), notes: notes.trim().slice(0, 1000),
    };
    try {
      if (existing) await repo.updateRace(existing.id, input);
      else await repo.addRace(me.uid, input);
      nav('/runs/races');
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm(`Delete "${existing.name}" for everyone? No undo.`)) return;
    await repo.deleteRace(existing.id);
    nav('/runs/races');
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <PageTitle right={existing && <button type="button" onClick={remove} className="btn-ghost text-bad"><Trash2 size={16} /> Delete</button>}>
        {existing ? 'Edit race' : 'Add a race'}
      </PageTitle>

      <div>
        <label className="label" htmlFor="name">Race name</label>
        <input id="name" className="input" placeholder="e.g. Casablanca 10K" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required autoFocus={!existing} />
      </div>

      <div>
        <label className="label">Distance</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button type="button" key={p.label} onClick={() => { setKm(p.km); setCustom(false); }} className={`chip ${!custom && km === p.km ? 'chip-on' : ''}`}>{p.label}</button>
          ))}
          <button type="button" onClick={() => setCustom(true)} className={`chip ${custom ? 'chip-on' : ''}`}>Other</button>
        </div>
        {custom && (
          <input inputMode="decimal" className="input mt-2 w-40" placeholder="km, e.g. 15" value={customKm} onChange={(e) => setCustomKm(e.target.value)} aria-label="Distance in km" />
        )}
        {distance > 0 && !planKind(distance) && (
          <p className="mt-1.5 text-xs text-ink-muted">No plan for this distance. Still counts.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" className="input" value={date} min={existing ? undefined : todayIso()} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="time">Start time (optional)</label>
          <input id="time" type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="place">Place</label>
        <input id="place" className="input" placeholder="City, country" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="link">Website / registration link</label>
        <input id="link" type="url" className="input" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" rows={3} className="input" placeholder="Price, registration deadline, bib pickup, cutoff…" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {err && <p className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{err}</p>}
      <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={!valid || busy}>
        {busy ? 'Saving…' : existing ? 'Save changes' : 'Add race'}
      </button>
      {!existing && <p className="text-center text-xs text-ink-muted">You're in as interested. Only you can edit it.</p>}
    </form>
  );
}
