import { create } from 'zustand';
import type { ConnectionStatus, HandScored, MatchFinished, RoomState, ServerMessage } from '../lib/types';

export const MAX_SELECTION = 5;

export interface GameState {
  connection: ConnectionStatus;
  room: RoomState | null;
  /** Indices (into room.cards_in_hand) of the cards the user picked. */
  selected: number[];
  /** The hand being animated right now; server follow-ups are queued until it ends. */
  cascade: HandScored | null;
  history: HandScored[];
  finished: MatchFinished | null;
  /** True while an action was sent and the server has not answered yet. */
  busy: boolean;
  /** Last server/transport error shown to the user. */
  error: { code: string; message: string } | null;
  queued: ServerMessage[];

  reset: () => void;
  setConnection: (status: ConnectionStatus) => void;
  applyMessage: (msg: ServerMessage) => void;
  toggleCard: (index: number) => void;
  clearSelection: () => void;
  setBusy: (busy: boolean) => void;
  endCascade: () => void;
  dismissError: () => void;
}

const initial = {
  connection: 'idle' as ConnectionStatus,
  room: null,
  selected: [],
  cascade: null,
  history: [],
  finished: null,
  busy: false,
  error: null,
  queued: [],
};

export const useGame = create<GameState>((set, get) => ({
  ...initial,

  reset: () => set({ ...initial }),

  setConnection: (connection) => set({ connection }),

  applyMessage: (msg) => {
    const state = get();
    // While a scoring cascade is animating, hold back every follow-up (state, finish and
    // the bot's own HAND_SCORED) so the player sees the active cascade to the end before the
    // old cards change or the next cascade plays. endCascade drains the queue one by one.
    if (state.cascade && (msg.type === 'ROOM_STATE_UPDATE' || msg.type === 'MATCH_FINISHED' || msg.type === 'HAND_SCORED')) {
      set({ queued: [...state.queued, msg] });
      return;
    }
    switch (msg.type) {
      case 'ROOM_STATE_UPDATE':
        set({ room: msg.payload, selected: [], busy: false, error: null });
        break;
      case 'HAND_SCORED':
        set({
          cascade: msg.payload,
          history: [...state.history, msg.payload],
          selected: [],
        });
        break;
      case 'MATCH_FINISHED':
        set({ finished: msg.payload, busy: false });
        break;
      case 'ERROR':
        set({ error: msg.payload, busy: false });
        break;
    }
  },

  toggleCard: (index) => {
    const { selected, room, busy, cascade, finished } = get();
    if (busy || cascade || finished || !room || room.status === 'FINISHED') return;
    if (index < 0 || index >= room.cards_in_hand.length) return;
    if (selected.includes(index)) {
      set({ selected: selected.filter((i) => i !== index) });
    } else if (selected.length < MAX_SELECTION) {
      set({ selected: [...selected, index] });
    }
  },

  clearSelection: () => set({ selected: [] }),

  setBusy: (busy) => set({ busy }),

  endCascade: () => {
    // Clear only the cascade; drain the queue one message at a time. A queued bot HAND_SCORED
    // re-enters applyMessage and sets the next cascade, which must re-queue every message still
    // pending behind it — so we take the head and keep the tail in the store before replaying.
    const { queued } = get();
    set({ cascade: null });
    for (let i = 0; i < queued.length; i++) {
      set({ queued: queued.slice(i + 1) });
      get().applyMessage(queued[i]);
      if (get().cascade) break; // a new cascade started; the rest was re-queued behind it
    }
  },

  dismissError: () => set({ error: null }),
}));

/** True when the signed-in player owns the match (only the host can play). */
export const isHost = (room: RoomState | null, playerId: string | undefined): boolean =>
  !!room && !!playerId && room.host_id === playerId;
