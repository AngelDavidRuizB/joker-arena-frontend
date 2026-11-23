'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, login, register } from '../api/client';
import { Logo } from '../components/Logo';
import { NeonButton } from '../components/NeonButton';
import { JOKERS } from '../lib/cards';
import { ALIAS_MAX, PASSWORD_MIN, validatePassword, validatePasswordRepeat, validateUser } from '../lib/validation';
import { useSession } from '../store/session';

const JOKER_ACCENT = {
  cyan: 'border-neon-cyan/40 text-neon-cyan',
  magenta: 'border-neon-magenta/40 text-neon-magenta',
  violet: 'border-neon-violet/40 text-neon-violet',
} as const;

type AuthMode = 'login' | 'register';

const MODE_COPY: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
  login: { title: 'Entra a la arena', subtitle: 'Usa tu usuario y contraseña.', action: 'Entrar y jugar' },
  register: {
    title: 'Crea tu cuenta',
    subtitle: `Elige un usuario y una contraseña (mínimo ${PASSWORD_MIN} caracteres).`,
    action: 'Crear cuenta y jugar',
  },
};

/** F1: inicio de sesión y registro con usuario + contraseña (+ repetición al registrarse). */
export function Welcome() {
  const router = useRouter();
  const navigate = (to: string) => router.push(to);
  const player = useSession((s) => s.player);
  const setPlayer = useSession((s) => s.setPlayer);
  const clear = useSession((s) => s.clear);

  const [mode, setMode] = useState<AuthMode>('login');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [touched, setTouched] = useState<{ user?: boolean; password?: boolean; repeat?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const copy = MODE_COPY[mode];
  const userError = validateUser(user);
  const passwordError = validatePassword(password);
  const repeatError = mode === 'register' ? validatePasswordRepeat(password, repeat) : null;
  const firstError = userError ?? passwordError ?? repeatError;
  const show = (field: 'user' | 'password' | 'repeat', error: string | null) =>
    submitted || touched[field] ? error : null;
  const shownUserError = show('user', userError);
  const shownPasswordError = show('password', passwordError);
  const shownRepeatError = show('repeat', repeatError);
  const isAdminUser = user.trim().toLowerCase() === 'admin';

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setRepeat('');
    setSubmitted(false);
    setTouched({});
    setServerError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (firstError) return;
    setLoading(true);
    try {
      const account = user.trim();
      const res =
        mode === 'register'
          ? await register({ user: account, password, repeatPassword: repeat })
          : await login({ user: account, password });
      setPlayer({ id: res.player.player_id, alias: res.player.alias, role: res.player.role, token: res.token });
      toast.success(
        mode === 'register' ? `¡Cuenta creada, ${res.player.alias}!` : `¡Bienvenido de nuevo, ${res.player.alias}!`,
        { description: 'Sesión iniciada con token JWT.' },
      );
      navigate(res.player.role === 'admin' ? '/admin' : '/lobby');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo completar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 py-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Logo size="lg" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="max-w-xl text-center text-lg text-slate-300"
      >
        Póker con <span className="text-neon-amber text-glow-amber">Jokers</span> en tiempo real. Combina manos,
        activa multiplicadores y supera la meta antes de quedarte sin jugadas.
      </motion.p>

      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="glass-neon-cyan w-full max-w-md p-6 sm:p-8"
        aria-labelledby="welcome-title"
      >
        {player ? (
          <div className="space-y-5 text-center">
            <h1 id="welcome-title" className="font-display text-xl font-bold tracking-wider text-white">
              Hola de nuevo
            </h1>
            <p className="text-slate-300">
              Sesión activa como <span className="font-mono text-neon-cyan">{player.alias}</span>
            </p>
            <NeonButton block variant="cyan" onClick={() => navigate('/lobby')}>
              Ir al lobby
            </NeonButton>
            <button
              type="button"
              onClick={clear}
              className="text-sm text-slate-400 underline decoration-dotted underline-offset-4 hover:text-neon-magenta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
            >
              Usar otra cuenta
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div
              role="tablist"
              aria-label="Acceso"
              className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1"
            >
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg px-3 py-2 font-display text-[0.65rem] uppercase tracking-widest transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan ${
                    mode === m ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            <div>
              <h1 id="welcome-title" className="font-display text-xl font-bold tracking-wider text-white">
                {copy.title}
              </h1>
              <p className="mt-1 text-sm text-slate-400">{copy.subtitle}</p>
            </div>

            <div>
              <label htmlFor="user" className="label-caps mb-2 block">
                Usuario
              </label>
              <input
                id="user"
                name="user"
                type="text"
                autoComplete="username"
                autoFocus
                autoCapitalize="none"
                spellCheck={false}
                maxLength={ALIAS_MAX + 10}
                value={user}
                placeholder="JokerPro99"
                onChange={(e) => {
                  setUser(e.target.value);
                  setServerError(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, user: true }))}
                aria-invalid={shownUserError ? true : undefined}
                aria-describedby="user-feedback"
                className="field"
              />
              <p
                id="user-feedback"
                role={shownUserError ? 'alert' : undefined}
                className={`mt-2 min-h-[1.25rem] text-sm ${shownUserError ? 'text-neon-red' : 'text-slate-500'}`}
              >
                {shownUserError ?? `${user.trim().length}/${ALIAS_MAX} · letras, números, - y _`}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="label-caps mb-2 block">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setServerError(null);
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={shownPasswordError ? true : undefined}
                aria-describedby="password-feedback"
                className="field"
              />
              <p
                id="password-feedback"
                role={shownPasswordError ? 'alert' : undefined}
                className={`mt-2 min-h-[1.25rem] text-sm ${shownPasswordError ? 'text-neon-red' : 'text-slate-500'}`}
              >
                {shownPasswordError ??
                  (isAdminUser
                    ? 'El usuario admin usa la contraseña de administración (ADMIN_PASSWORD).'
                    : `Mínimo ${PASSWORD_MIN} caracteres.`)}
              </p>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="repeat" className="label-caps mb-2 block">
                  Repetir contraseña
                </label>
                <input
                  id="repeat"
                  name="repeat"
                  type="password"
                  autoComplete="new-password"
                  value={repeat}
                  onChange={(e) => {
                    setRepeat(e.target.value);
                    setServerError(null);
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, repeat: true }))}
                  aria-invalid={shownRepeatError ? true : undefined}
                  aria-describedby="repeat-feedback"
                  className="field"
                />
                <p
                  id="repeat-feedback"
                  role={shownRepeatError ? 'alert' : undefined}
                  className={`mt-2 min-h-[1.25rem] text-sm ${shownRepeatError ? 'text-neon-red' : 'text-slate-500'}`}
                >
                  {shownRepeatError ?? 'Debe coincidir con la contraseña.'}
                </p>
              </div>
            )}

            {serverError && (
              <p role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-3 py-2 text-sm text-neon-red">
                {serverError}
              </p>
            )}

            <NeonButton type="submit" block loading={loading} variant="cyan">
              {copy.action}
            </NeonButton>

            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="w-full text-sm text-slate-400 underline decoration-dotted underline-offset-4 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
            >
              {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
            </button>
          </form>
        )}
      </motion.section>

      <ul className="grid w-full gap-4 sm:grid-cols-3" aria-label="Jokers del prototipo">
        {JOKERS.map((j, i) => (
          <motion.li
            key={j.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className={`glass flex items-start gap-3 border p-4 ${JOKER_ACCENT[j.color]}`}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {j.glyph}
            </span>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-widest">{j.name}</h2>
              <p className="mt-1 text-sm text-slate-300">{j.description}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
