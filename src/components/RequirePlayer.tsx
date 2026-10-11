import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../store/session';

/** Route guard: only registered players can reach the lobby and the tables. */
export function RequirePlayer() {
  const player = useSession((s) => s.player);
  if (!player) return <Navigate to="/" replace />;
  return <Outlet />;
}
