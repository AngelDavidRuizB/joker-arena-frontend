import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Background } from './Background';
import { Logo } from './Logo';
import { useSession } from '../store/session';
import { useGame } from '../store/game';

export function Layout() {
  const player = useSession((s) => s.player);
  const clearSession = useSession((s) => s.clear);
  const resetGame = useGame((s) => s.reset);
  const navigate = useNavigate();

  const signOut = () => {
    resetGame();
    clearSession();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <Background />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-neon-cyan"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={player ? '/lobby' : '/'} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan">
            <Logo />
          </Link>
          {player && (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-neon-violet/40 bg-ink-800/70 px-3 py-1.5 sm:flex">
                <span className="h-2 w-2 rounded-full bg-neon-violet shadow-neon-violet" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-200">{player.alias}</span>
                <span className="font-mono text-[0.65rem] text-slate-500">#{player.id}</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg border border-white/15 px-3 py-1.5 font-display text-[0.65rem] uppercase tracking-widest text-slate-300 transition hover:border-neon-magenta/60 hover:text-neon-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="px-4 pb-6 pt-2 text-center">
        <p className="label-caps !text-[0.6rem] !text-slate-600">
          Arquitectura de Software 2026-II · Universidad Nacional de Colombia · Prototipo 1
        </p>
      </footer>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(10,7,32,.92)',
            border: '1px solid rgba(0,240,255,.35)',
            color: '#e2e8f0',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '1rem',
          },
        }}
      />
    </div>
  );
}
