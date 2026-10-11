import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SessionPlayer {
  id: string;
  alias: string;
}

interface SessionState {
  player: SessionPlayer | null;
  setPlayer: (player: SessionPlayer) => void;
  clear: () => void;
}

/**
 * The registered player (id issued by the Game Engine) survives page reloads through
 * localStorage so the user does not have to register again. It is always validated by the
 * server on use; nothing here is trusted.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      player: null,
      setPlayer: (player) => set({ player }),
      clear: () => set({ player: null }),
    }),
    { name: 'jokerarena.session' },
  ),
);
