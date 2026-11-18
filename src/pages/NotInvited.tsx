import { repo } from '@/lib/repo';
import { useData } from '@/data/DataProvider';

/** Shown to signed-in people who aren't (or aren't yet) in the crew. Updates live when the admin decides. */
export default function NotInvited({ denied }: { denied?: boolean }) {
  const { user } = useData();
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="card max-w-sm p-6 text-center">
        <div className="text-5xl">{denied ? '🙅' : '🚪'}</div>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{denied ? 'Nope.' : 'Knock knock…'}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {denied
            ? 'The bouncer said no. Think it\'s a mistake? Ping Hamza.'
            : 'Waiting for Hamza to let you in. Stretch meanwhile.'}
        </p>
        <p className="mt-3 break-all text-xs text-ink-muted">{user?.email}</p>
        <button className="btn-outline mt-5 w-full" onClick={() => repo.signOut()}>Sign out</button>
      </div>
    </div>
  );
}
