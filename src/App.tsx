import { Navigate, Route, Routes } from 'react-router-dom';
import { useData } from './data/DataProvider';
import Shell from './components/Shell';
import RunsLayout from './components/RunsLayout';
import { Spinner } from './components/ui';
import SignIn from './pages/SignIn';
import NotInvited from './pages/NotInvited';
import Hub from './pages/Hub';
import RunsHome from './pages/RunsHome';
import LogRun from './pages/LogRun';
import Leaderboard from './pages/Leaderboard';
import Plan from './pages/Plan';
import Me from './pages/Me';
import Races from './pages/Races';
import RaceForm from './pages/RaceForm';
import Hangouts from './pages/Hangouts';
import HangoutForm from './pages/HangoutForm';
import HangoutDetail from './pages/HangoutDetail';
import Admin from './pages/Admin';

export default function App() {
  const { status, error } = useData();
  if (status === 'loading') return <div className="grid min-h-dvh place-items-center"><Spinner /></div>;
  if (status === 'signedOut') return <SignIn />;
  if (status === 'pending') return <NotInvited />;
  if (status === 'denied') return <NotInvited denied />;
  if (status === 'error')
    return <div className="grid min-h-dvh place-items-center p-6 text-center text-bad">Something went wrong: {error}</div>;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Hub />} />

        <Route path="/runs" element={<RunsLayout />}>
          <Route index element={<RunsHome />} />
          <Route path="plan" element={<Plan />} />
          <Route path="races" element={<Races />} />
          <Route path="crew" element={<Leaderboard />} />
        </Route>
        <Route path="/runs/log" element={<LogRun />} />
        <Route path="/runs/log/:id" element={<LogRun />} />
        <Route path="/runs/races/new" element={<RaceForm />} />
        <Route path="/runs/races/:id/edit" element={<RaceForm />} />

        <Route path="/hangouts" element={<Hangouts />} />
        <Route path="/hangouts/new" element={<HangoutForm />} />
        <Route path="/hangouts/:id" element={<HangoutDetail />} />
        <Route path="/hangouts/:id/edit" element={<HangoutForm />} />

        <Route path="/me" element={<Me />} />
        <Route path="/admin" element={<Admin />} />

        {/* old links, in case someone saved them */}
        <Route path="/log" element={<Navigate to="/runs/log" replace />} />
        <Route path="/plan" element={<Navigate to="/runs/plan" replace />} />
        <Route path="/races" element={<Navigate to="/runs/races" replace />} />
        <Route path="/crew" element={<Navigate to="/runs/crew" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
