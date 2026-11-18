import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Footprints, Home, PartyPopper, Plus, ShieldCheck, User } from 'lucide-react';
import { repo, resetDemo } from '@/lib/repo';
import { useData } from '@/data/DataProvider';
import { needsMe } from '@/lib/hangouts';
import { Avatar } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/runs', label: 'Runs', icon: Footprints },
  { to: '/hangouts', label: 'Hangouts', icon: PartyPopper },
  { to: '/me', label: 'Me', icon: User },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { me, isAdmin, allMembers, hangouts } = useData();
  const waiting = allMembers.filter((m) => m.status === 'pending').length;
  const todo = me ? hangouts.filter((h) => needsMe(h, me.uid)).length : 0;
  const badges: Record<string, number> = { '/hangouts': todo };

  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      {repo.mode === 'demo' && (
        <div className="bg-ochre/20 px-4 py-1.5 text-center text-xs text-ink-soft">
          Demo mode: fake crew, stored in this browser only.{' '}
          <button className="font-semibold underline" onClick={resetDemo}>Reset demo</button>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold tracking-tight">Chddani Ngol Ah</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `relative rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-sunken'}`}>
                {n.label}
                {badges[n.to] > 0 && <Dot n={badges[n.to]} />}
              </NavLink>
            ))}
            {isAdmin && <AdminLink waiting={waiting} />}
            <div className="relative ml-2"><PlusMenu variant="desktop" /></div>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:hidden">
            {isAdmin && <AdminLink waiting={waiting} />}
            <Link to="/me" aria-label="My profile"><Avatar m={me ?? undefined} size={32} /></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-center">
          {NAV.slice(0, 2).map((n) => <Tab key={n.to} {...n} badge={badges[n.to]} />)}
          <PlusMenu variant="mobile" />
          {NAV.slice(2, 4).map((n) => <Tab key={n.to} {...n} badge={badges[n.to]} />)}
        </div>
      </nav>
    </div>
  );
}

/** The + button: log a run or start a hangout. */
function PlusMenu({ variant }: { variant: 'mobile' | 'desktop' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const menu = (
    <div className={`absolute z-30 w-52 overflow-hidden rounded-2xl border border-line bg-card shadow-card ${variant === 'mobile' ? 'bottom-16 left-1/2 -translate-x-1/2' : 'right-0 top-11'}`}>
      <Link to="/runs/log" className="flex items-center gap-3 px-4 py-3 font-semibold hover:bg-sunken"><span className="text-xl">🏃</span> Log a run</Link>
      <Link to="/hangouts/new" className="flex items-center gap-3 border-t border-line px-4 py-3 font-semibold hover:bg-sunken"><span className="text-xl">🎉</span> New hangout</Link>
    </div>
  );

  return (
    <div ref={ref} className={variant === 'mobile' ? 'relative flex justify-center' : 'relative'}>
      {variant === 'mobile' ? (
        <button onClick={() => setOpen((o) => !o)} aria-label="Add" aria-expanded={open}
          className={`-mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-ink shadow-card ring-4 ring-bg transition ${open ? 'rotate-45' : ''}`}>
          <Plus size={26} strokeWidth={2.5} />
        </button>
      ) : (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-primary py-1.5"><Plus size={16} /> New</button>
      )}
      {open && menu}
    </div>
  );
}

function Dot({ n }: { n: number }) {
  return <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{n}</span>;
}

function AdminLink({ waiting }: { waiting: number }) {
  return (
    <NavLink to="/admin" aria-label={`Admin${waiting ? `, ${waiting} waiting` : ''}`}
      className={({ isActive }) => `relative grid h-9 w-9 place-items-center rounded-lg ${isActive ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-sunken'}`}>
      <ShieldCheck size={20} />
      {waiting > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">{waiting}</span>
      )}
    </NavLink>
  );
}

function Tab({ to, label, icon: Icon, end, badge }: (typeof NAV)[number] & { badge?: number }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-ink-muted'}`}>
      <span className="relative"><Icon size={21} />{badge ? <Dot n={badge} /> : null}</span>
      {label}
    </NavLink>
  );
}
