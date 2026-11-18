import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/runs', label: 'Overview', end: true },
  { to: '/runs/plan', label: 'Plan' },
  { to: '/runs/races', label: 'Races' },
  { to: '/runs/crew', label: 'Leaderboard' },
];

/** The running section: a tab strip over its own pages. */
export default function RunsLayout() {
  return (
    <div>
      <nav className="no-scrollbar -mx-1 mb-5 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Runs">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${isActive ? 'bg-ink text-bg' : 'bg-sunken text-ink-soft hover:text-ink'}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
