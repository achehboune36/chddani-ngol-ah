import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, DoorOpen, ShieldAlert, X } from 'lucide-react';
import { useData } from '@/data/DataProvider';
import { Avatar, Empty, PageTitle } from '@/components/ui';
import { repo } from '@/lib/repo';
import { fmtDate, fmtKm, iso } from '@/lib/format';
import { sumKm } from '@/lib/stats';
import type { Account, Member, MemberStatus, SiteMode } from '@/lib/types';

const TABS: { id: MemberStatus; label: string }[] = [
  { id: 'pending', label: 'At the door' },
  { id: 'approved', label: 'Crew' },
  { id: 'denied', label: 'Bounced' },
];

export default function Admin() {
  const { isAdmin, allMembers, mode, me } = useData();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [runsByUid, setRunsByUid] = useState<Record<string, number>>({});
  const { runs } = useData();
  const [tab, setTab] = useState<MemberStatus>('pending');

  useEffect(() => (isAdmin ? repo.watchAccounts(setAccounts, () => {}) : undefined), [isAdmin]);
  useEffect(() => {
    const m: Record<string, number> = {};
    for (const uid of new Set(runs.map((r) => r.uid))) m[uid] = sumKm(runs.filter((r) => r.uid === uid));
    setRunsByUid(m);
  }, [runs]);

  const byStatus = useMemo(() => {
    const g: Record<MemberStatus, Member[]> = { pending: [], approved: [], denied: [] };
    for (const m of allMembers) g[m.status ?? 'pending'].push(m);
    for (const k of Object.keys(g) as MemberStatus[]) g[k].sort((a, b) => b.joinedAt - a.joinedAt);
    return g;
  }, [allMembers]);

  if (!isAdmin) return <Navigate to="/" replace />;
  const acc = (uid: string) => accounts.find((a) => a.uid === uid);
  const set = (uid: string, s: MemberStatus) => repo.setMemberStatus(uid, s).catch((e) => alert(e.message));
  const switchMode = (m: SiteMode) => repo.setMode(m).catch((e) => alert(e.message));
  const list = byStatus[tab];

  return (
    <div className="space-y-5">
      <PageTitle>Bouncer HQ 🕶️</PageTitle>

      <section className="card p-4">
        <div className="label">Front door</div>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton on={mode === 'open'} onClick={() => switchMode('open')} icon={<DoorOpen size={20} />}
            title="Open" sub="Sign up, walk in." />
          <ModeButton on={mode === 'approval'} onClick={() => switchMode('approval')} icon={<ShieldAlert size={20} />}
            title="Bouncer mode" sub="Got leaked? Newbies wait." danger />
        </div>
      </section>

      <section className="card p-4">
        <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`chip shrink-0 ${tab === t.id ? 'chip-on' : ''}`}>
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${t.id === 'pending' && byStatus.pending.length ? 'bg-brand text-white' : 'bg-sunken'}`}>{byStatus[t.id].length}</span>
            </button>
          ))}
        </div>

        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((m) => {
              const a = acc(m.uid);
              const self = m.uid === me?.uid;
              return (
                <li key={m.uid} className="flex items-center gap-3 py-3">
                  <Avatar m={m} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{m.name}{self && <span className="ml-1.5 text-xs text-ink-muted">(you, the boss)</span>}</div>
                    <div className="truncate text-xs text-ink-muted">{a?.email ?? 'no email on file'}</div>
                    <div className="text-xs text-ink-muted">
                      joined {fmtDate(iso(new Date(a?.createdAt ?? m.joinedAt)), { day: 'numeric', month: 'short' })}
                      {runsByUid[m.uid] ? ` · ${fmtKm(runsByUid[m.uid], 0)} km` : ''}
                    </div>
                  </div>
                  {!self && (
                    <div className="flex shrink-0 gap-1.5">
                      {m.status !== 'approved' && (
                        <button className="btn bg-good px-3 py-2 text-white" onClick={() => set(m.uid, 'approved')} aria-label={`Approve ${m.name}`}>
                          <Check size={16} /> <span className="hidden sm:inline">Let in</span>
                        </button>
                      )}
                      {m.status !== 'denied' && (
                        <button className="btn border border-bad/40 px-3 py-2 text-bad hover:bg-bad/10"
                          onClick={() => (m.status !== 'approved' || confirm(`Kick ${m.name} out?`)) && set(m.uid, 'denied')} aria-label={`Deny ${m.name}`}>
                          <X size={16} /> <span className="hidden sm:inline">{m.status === 'approved' ? 'Kick' : 'Nope'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>{tab === 'pending' ? 'Nobody at the door. 🦗' : tab === 'denied' ? 'Nobody bounced. Yet.' : 'Just you. Lonely.'}</Empty>
        )}
      </section>
    </div>
  );
}

function ModeButton({ on, onClick, icon, title, sub, danger }: {
  on: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; danger?: boolean;
}) {
  const onCls = danger ? 'border-bad bg-bad/10 text-bad' : 'border-good bg-good/10 text-good';
  return (
    <button onClick={onClick} aria-pressed={on} className={`rounded-xl border p-3 text-left transition ${on ? onCls : 'border-line hover:bg-sunken'}`}>
      <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
      <div className={`mt-0.5 text-xs ${on ? '' : 'text-ink-muted'}`}>{sub}</div>
    </button>
  );
}
