import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Lobby } from '../views/Lobby';
import { Welcome } from '../views/Welcome';
import { useSession } from '../store/session';

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/room/:code" element={<div>MESA {location.pathname}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Welcome (F1: registro por alias)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useSession.setState({ player: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows a validation error and does not call the server for an invalid alias', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.type(screen.getByLabelText(/alias del jugador/i), 'a b');
    await user.click(screen.getByRole('button', { name: /registrarme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/solo letras/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registers the alias, stores the player and goes to the lobby', async () => {
    fetchMock.mockImplementation(() => json(201, { id: '12', alias: 'JokerPro99', created_at: '2026-10-12T19:00:00Z' }));
    const user = userEvent.setup();
    renderAt('/');
    await user.type(screen.getByLabelText(/alias del jugador/i), 'JokerPro99');
    await user.click(screen.getByRole('button', { name: /registrarme/i }));

    await waitFor(() => expect(useSession.getState().player).toEqual({ id: '12', alias: 'JokerPro99' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/players', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ alias: 'JokerPro99' });
    expect(await screen.findByText(/listo,/i)).toBeInTheDocument(); // lobby heading
  });

  it('shows the server message when registration fails and creates no fake player', async () => {
    fetchMock.mockImplementation(() => json(400, { error: 'alias is reserved' }));
    const user = userEvent.setup();
    renderAt('/');
    await user.type(screen.getByLabelText(/alias del jugador/i), 'Hacker');
    await user.click(screen.getByRole('button', { name: /registrarme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('alias is reserved');
    expect(useSession.getState().player).toBeNull();
  });

  it('reports an unreachable backend instead of faking a local player', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderAt('/');
    await user.type(screen.getByLabelText(/alias del jugador/i), 'Offline');
    await user.click(screen.getByRole('button', { name: /registrarme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo conectar/i);
    expect(useSession.getState().player).toBeNull();
  });

  it('reports a database outage (503)', async () => {
    fetchMock.mockImplementation(() => json(503, { error: 'Database unavailable' }));
    const user = userEvent.setup();
    renderAt('/');
    await user.type(screen.getByLabelText(/alias del jugador/i), 'Caido');
    await user.click(screen.getByRole('button', { name: /registrarme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/base de datos no está disponible/i);
  });
});

describe('Lobby (F2: salas)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useSession.setState({ player: { id: '7', alias: 'Demo' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates a room with the bot enabled by default', async () => {
    fetchMock.mockImplementation(() =>
      json(201, { room_code: 'JKR-A7K2', match_id: '3', target_score: 22000, status: 'WAITING', with_bot: true, players: ['7', 'bot'] }),
    );
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.click(screen.getByRole('button', { name: /crear sala \(con bot\)/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ player_id: '7', target_score: 22000, with_bot: true });
    expect(await screen.findByText(/MESA/)).toBeInTheDocument();
  });

  it('offers the three goals with 22.000 preselected', () => {
    renderAt('/lobby');
    expect(screen.getByRole('radio', { name: /22\.000|22000/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /26\.000|26000/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /33\.000|33000/ })).not.toBeChecked();
  });

  it('lets the user disable the bot before creating the room', async () => {
    fetchMock.mockImplementation(() =>
      json(201, { room_code: 'JKR-B8M3', match_id: '4', target_score: 26000, status: 'WAITING', with_bot: false, players: ['7'] }),
    );
    const user = userEvent.setup();
    renderAt('/lobby');
    const toggle = screen.getByRole('switch', { name: /jugar contra bot/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('radio', { name: /26\.000|26000/ }));
    await user.click(screen.getByRole('button', { name: /^crear sala$/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ player_id: '7', target_score: 26000, with_bot: false });
  });

  it('shows a server error when the room cannot be created', async () => {
    fetchMock.mockImplementation(() => json(503, { error: 'Database unavailable' }));
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.click(screen.getByRole('button', { name: /crear sala/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/base de datos no está disponible/i);
  });

  it('validates the code format locally', async () => {
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.type(screen.getByLabelText(/código de sala/i), 'x');
    await user.click(screen.getByRole('button', { name: /unirme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/código inválido/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a room that does not exist (404)', async () => {
    fetchMock.mockImplementation(() => json(404, { error: 'Room not found' }));
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.type(screen.getByLabelText(/código de sala/i), 'jkr-zzzz');
    await user.click(screen.getByRole('button', { name: /unirme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no existe ninguna sala con el código JKR-ZZZZ/i);
    expect(fetchMock).toHaveBeenCalledWith('/api/rooms/JKR-ZZZZ', expect.anything());
  });

  it('rejects joining a finished match', async () => {
    fetchMock.mockImplementation(() =>
      json(200, { room_code: 'JKR-DONE', match_id: '9', target_score: 22000, status: 'FINISHED', with_bot: true, player_count: 2 }),
    );
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.type(screen.getByLabelText(/código de sala/i), 'JKR-DONE');
    await user.click(screen.getByRole('button', { name: /unirme/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya terminó/i);
  });

  it('navigates to an existing room', async () => {
    fetchMock.mockImplementation(() =>
      json(200, { room_code: 'JKR-LIVE', match_id: '9', target_score: 22000, status: 'IN_PROGRESS', with_bot: true, player_count: 2 }),
    );
    const user = userEvent.setup();
    renderAt('/lobby');
    await user.type(screen.getByLabelText(/código de sala/i), 'JKR-LIVE');
    await user.click(screen.getByRole('button', { name: /unirme/i }));
    expect(await screen.findByText(/MESA/)).toBeInTheDocument();
  });
});
