import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import HangoutCard from '@/components/HangoutCard';
import { Empty, PageTitle } from '@/components/ui';
import { isLocked, isPast, needsMe, sortKey } from '@/lib/hangouts';

export default function Hangouts() {
  const { hangouts, me } = useData();
  const [showPast, setShowPast] = useState(false);
  const sorted = [...hangouts].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
  const live = sorted.filter((h) => !isPast(h));
  const todo = live.filter((h) => me && needsMe(h, me.uid));
  const rest = live.filter((h) => !todo.includes(h));
  const upcoming = rest.filter(isLocked);
  const polls = rest.filter((h) => !isLocked(h));
  const past = sorted.filter((h) => isPast(h)).reverse();

  return (
    <div className="space-y-6">
      <PageTitle right={<Link to="/hangouts/new" className="btn-primary"><Plus size={16} /> New</Link>}>Hangouts</PageTitle>

      {todo.length > 0 && <Section title="Waiting on you 👀">{todo.map((h) => <HangoutCard key={h.id} h={h} />)}</Section>}
      {upcoming.length > 0 && <Section title="Coming up">{upcoming.map((h) => <HangoutCard key={h.id} h={h} />)}</Section>}
      {polls.length > 0 && <Section title="Finding a time">{polls.map((h) => <HangoutCard key={h.id} h={h} />)}</Section>}
      {!live.length && <Empty>Zero plans. Very adult of you. <Link to="/hangouts/new" className="font-semibold text-brand">Fix that</Link>.</Empty>}

      {past.length > 0 && (
        <section>
          <button className="btn-ghost -ml-3" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Hide' : 'Show'} past ({past.length})</button>
          {showPast && <div className="mt-2 space-y-2 opacity-70">{past.map((h) => <HangoutCard key={h.id} h={h} />)}</div>}
        </section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h-section mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
