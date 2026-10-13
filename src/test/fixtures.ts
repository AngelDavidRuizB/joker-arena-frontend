import { DEFAULT_TARGET_SCORE, DEFAULT_TOTAL_DISCARDS, DEFAULT_TOTAL_HANDS } from '../lib/constants';
import type { HandScored, RoomState } from '../lib/types';

export const room = (over: Partial<RoomState> = {}): RoomState => ({
  room_code: 'JKR-TEST',
  match_id: '1',
  status: 'WAITING',
  target_score: DEFAULT_TARGET_SCORE,
  hands_left: DEFAULT_TOTAL_HANDS,
  hands_total: DEFAULT_TOTAL_HANDS,
  discards_total: DEFAULT_TOTAL_DISCARDS,
  discards_left: 3,
  current_score: 0,
  deck_count: 44,
  active_jokers: ['banner', 'joker', 'the_duo'],
  cards_in_hand: [],
  hand_number: 0,
  with_bot: true,
  host_id: '1',
  players: [
    { id: '1', alias: 'Host', is_bot: false },
    { id: 'bot', alias: 'Bot-JokerBot', is_bot: true },
  ],
  ...over,
});

/** The Full House example of the specification: K♠ K♥ K♣ 4♦ 4♠ with 0 discards = 78 x 16 = 1248. */
export const hand = (over: Partial<HandScored> = {}): HandScored => ({
  room_code: 'JKR-TEST',
  match_id: '1',
  player_id: '1',
  hand_number: 1,
  accumulated_score: 1248,
  timestamp: '2026-10-12T19:40:00Z',
  poker_hand: 'FULL_HOUSE',
  base_chips: 40,
  base_mult: 4,
  card_chips: 38,
  cards_played: [
    { rank: 'K', suit: 'SPADES', chips: 10, scored: true },
    { rank: 'K', suit: 'HEARTS', chips: 10, scored: true },
    { rank: 'K', suit: 'CLUBS', chips: 10, scored: true },
    { rank: '4', suit: 'DIAMONDS', chips: 4, scored: true },
    { rank: '4', suit: 'SPADES', chips: 4, scored: true },
  ],
  jokers: [
    { id: 'banner', name: 'Banner', effect: '', triggered: false, chips_added: 0, mult_added: 0, mult_factor: 1 },
    { id: 'joker', name: 'Joker Clásico', effect: '', triggered: true, chips_added: 0, mult_added: 4, mult_factor: 1 },
    { id: 'the_duo', name: 'The Duo', effect: '', triggered: true, chips_added: 0, mult_added: 0, mult_factor: 2 },
  ],
  discards_left: 0,
  final_chips: 78,
  final_mult: 16,
  score: 1248,
  ...over,
});
