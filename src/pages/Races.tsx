import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import RaceCard from '@/components/RaceCard';
import { Empty, PageTitle } from '@/components/ui';
import { todayIso } from '@/lib/format';

export default function Races() {
  const { races, upcomingRaces } = useData();
  const past = races.filter((r) => r.date < todayIso()).reverse();
  const [showPast, setShowPast] = useState(false);

  return (
    <div className="space-y-5">
      <PageTitle right={<Link to="/runs/races/new" className="btn-primary"><Plus size={16} /> Add race</Link>}>Races</PageTitle>
      <p className="-mt-2 text-sm text-ink-muted">Paying for a ticket is the real commitment. 💸</p>

      <div className="space-y-3">
        {upcomingRaces.length ? upcomingRaces.map((r) => <RaceCard key={r.id} race={r} />) : <Empty>Calendar's empty. Suspicious.</Empty>}
      </div>

      {past.length > 0 && (
        <section>
          <button className="btn-ghost -ml-3" onClick={() => setShowPast((v) => !v)}>
            {showPast ? 'Hide' : 'Show'} past races ({past.length})
          </button>
          {showPast && <div className="mt-2 space-y-3">{past.map((r) => <RaceCard key={r.id} race={r} />)}</div>}
        </section>
      )}
    </div>
  );
}
