import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CardFan } from '../components/CardFan';
import { AuditPanel } from '../components/AuditPanel';
import { Hud } from '../components/Hud';
import { JokerBar } from '../components/JokerBar';
import { useGame } from '../store/game';
import type { Card } from '../lib/types';
import { hand, room } from './fixtures';

const HAND: Card[] = [
  { rank: 'A', suit: 'SPADES', chips: 11 },
  { rank: 'K', suit: 'HEARTS', chips: 10 },
  { rank: '10', suit: 'CLUBS', chips: 10 },
  { rank: '7', suit: 'DIAMONDS', chips: 7 },
  { rank: '5', suit: 'SPADES', chips: 5 },
  { rank: '4', suit: 'HEARTS', chips: 4 },
  { rank: '3', suit: 'CLUBS', chips: 3 },
  { rank: '2', suit: 'DIAMONDS', chips: 2 },
];

function Harness({ disabled = false }: { disabled?: boolean }) {
  const selected = useGame((s) => s.selected);
  const toggle = useGame((s) => s.toggleCard);
  return <CardFan cards={HAND} selected={selected} disabled={disabled} onToggle={toggle} />;
}

describe('card hand (F3: selección interactiva)', () => {
  beforeEach(() => {
    useGame.getState().reset();
    useGame.getState().applyMessage({ type: 'ROOM_STATE_UPDATE', payload: room({ cards_in_hand: HAND }) });
  });

  it('renders the eight cards with accessible names', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'As de picas, 11 fichas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rey de corazones, 10 fichas' })).toBeInTheDocument();
  });

  it('marks cards as selected with aria-pressed and deselects on a second click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const ace = screen.getByRole('button', { name: /^As de picas/ });
    expect(ace).toHaveAttribute('aria-pressed', 'false');
    await user.click(ace);
    expect(ace).toHaveAttribute('aria-pressed', 'true');
    await user.click(ace);
    expect(ace).toHaveAttribute('aria-pressed', 'false');
  });

  it('allows at most five selected cards', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const b of screen.getAllByRole('button')) await user.click(b);
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(5);
  });

  it('supports keyboard selection (Space/Enter on a focused card)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard(' ');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
  });

  it('does not select when disabled (spectator or waiting for the server)', async () => {
    const user = userEvent.setup();
    render(<Harness disabled />);
    await user.click(screen.getByRole('button', { name: /^As de picas/ }));
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });
});

describe('HUD', () => {
  it('shows score progress, hands and discards', () => {
    render(<Hud room={room({ current_score: 150, target_score: 300, hands_left: 3, discards_left: 2, deck_count: 39 })} />);
    const bar = screen.getByRole('progressbar', { name: /progreso hacia la meta/i });
    expect(bar).toHaveAttribute('aria-valuenow', '150');
    expect(bar).toHaveAttribute('aria-valuemax', '300');
    expect(screen.getByText('50% de la meta')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Manos restantes: 3 de 4' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Descartes restantes: 2 de 3' })).toBeInTheDocument();
    expect(screen.getByText('39 en mazo')).toBeInTheDocument();
  });

  it('caps the progress at 100% when the target is exceeded', () => {
    render(<Hud room={room({ current_score: 1248, target_score: 300 })} />);
    expect(screen.getByText('100% de la meta')).toBeInTheDocument();
  });
});

describe('Jokers and audit', () => {
  it('lists the three jokers in evaluation order', () => {
    render(<JokerBar owned={['banner', 'joker', 'the_duo']} />);
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Banner', 'Joker Clásico', 'The Duo']);
  });

  it('prints the exact formula for the specification example (1248)', () => {
    render(<AuditPanel history={[hand()]} />);
    expect(screen.getByText('(40 + 38 + 0) × ((4 + 4) × 2) = 78 × 16 = 1248')).toBeInTheDocument();
    expect(screen.getByText('#1 · Full House')).toBeInTheDocument();
  });

  it('shows an empty state before any hand is played', () => {
    render(<AuditPanel history={[]} />);
    expect(screen.getByText(/juega una mano/i)).toBeInTheDocument();
  });
});
