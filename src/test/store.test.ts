import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_SELECTION, isHost, useGame } from '../store/game';
import type { Card, HandScored, MatchFinished, RoomState } from '../lib/types';
import { room as makeRoom, hand as makeHand } from './fixtures';

const cards = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ rank: String((i % 9) + 2), suit: 'SPADES', chips: (i % 9) + 2 }));

describe('game store', () => {
  beforeEach(() => useGame.getState().reset());

  it('applies ROOM_STATE_UPDATE and clears the selection', () => {
    const s = useGame.getState();
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8) }) });
    s.toggleCard(0);
    s.toggleCard(3);
    expect(useGame.getState().selected).toEqual([0, 3]);
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8), hands_left: 19 }) });
    expect(useGame.getState().selected).toEqual([]);
    expect(useGame.getState().room?.hands_left).toBe(19);
  });

  it('toggles cards and enforces the maximum of five', () => {
    const s = useGame.getState();
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8) }) });
    for (let i = 0; i < 8; i++) s.toggleCard(i);
    expect(useGame.getState().selected).toHaveLength(MAX_SELECTION);
    expect(useGame.getState().selected).toEqual([0, 1, 2, 3, 4]);
    s.toggleCard(2); // deselect
    expect(useGame.getState().selected).toEqual([0, 1, 3, 4]);
    s.toggleCard(7); // room again
    expect(useGame.getState().selected).toEqual([0, 1, 3, 4, 7]);
  });

  it('ignores out-of-range indices and toggles while busy or without a room', () => {
    const s = useGame.getState();
    s.toggleCard(0); // no room yet
    expect(useGame.getState().selected).toEqual([]);
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8) }) });
    s.toggleCard(-1);
    s.toggleCard(8);
    expect(useGame.getState().selected).toEqual([]);
    s.setBusy(true);
    s.toggleCard(1);
    expect(useGame.getState().selected).toEqual([]);
  });

  it('does not allow selecting after the match finished', () => {
    const s = useGame.getState();
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8), status: 'FINISHED' }) });
    s.toggleCard(0);
    expect(useGame.getState().selected).toEqual([]);
  });

  it('queues state and result messages while the scoring cascade is playing', () => {
    const s = useGame.getState();
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8), hands_left: 20 }) });
    s.setBusy(true);
    const scored: HandScored = makeHand();
    const finished: MatchFinished = {
      room_code: 'JKR-TEST', match_id: '1', winner_id: '1', result: 'WIN', final_score: 1248,
      target_score: 22000, target_reached: true, reason: 'TARGET_SCORE_REACHED', hands_played: 1,
    };

    s.applyMessage({ type: 'HAND_SCORED', payload: scored });
    s.applyMessage({ type: 'ROOM_STATE_UPDATE', payload: makeRoom({ cards_in_hand: cards(8), hands_left: 19, current_score: 1248 }) });
    s.applyMessage({ type: 'MATCH_FINISHED', payload: finished });

    let st = useGame.getState();
    expect(st.cascade).toEqual(scored);
    expect(st.history).toHaveLength(1);
    expect(st.room?.hands_left).toBe(20); // old state still shown during the animation
    expect(st.finished).toBeNull();
    expect(st.queued).toHaveLength(2);

    s.endCascade();
    st = useGame.getState();
    expect(st.cascade).toBeNull();
    expect(st.queued).toHaveLength(0);
    expect(st.room?.hands_left).toBe(19);
    expect(st.room?.current_score).toBe(1248);
    expect(st.finished?.result).toBe('WIN');
    expect(st.busy).toBe(false);
  });

  it('stores server errors and releases the busy flag', () => {
    const s = useGame.getState();
    s.setBusy(true);
    s.applyMessage({ type: 'ERROR', payload: { code: 'INVALID_SELECTION', message: 'card index 99 is out of range' } });
    const st = useGame.getState();
    expect(st.error?.code).toBe('INVALID_SELECTION');
    expect(st.busy).toBe(false);
    s.dismissError();
    expect(useGame.getState().error).toBeNull();
  });

  it('identifies the host of the room', () => {
    const r: RoomState = makeRoom({ host_id: '7' });
    expect(isHost(r, '7')).toBe(true);
    expect(isHost(r, '8')).toBe(false);
    expect(isHost(null, '7')).toBe(false);
    expect(isHost(r, undefined)).toBe(false);
  });
});
