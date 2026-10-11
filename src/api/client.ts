import type { CreateRoomResponse, PlayerDto, RoomDetails } from '../lib/types';

/** Error raised by the REST client. status 0 means the server could not be reached. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor de juego. ¿Está encendido?');
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page)
  }

  if (!res.ok) {
    const serverMsg =
      body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : '';
    const message =
      res.status === 503
        ? 'La base de datos no está disponible. Inténtalo de nuevo en unos segundos.'
        : serverMsg || `Error inesperado del servidor (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/** F1: register (or retrieve) a player by alias. */
export const registerPlayer = (alias: string) =>
  request<PlayerDto>('/api/players', { method: 'POST', body: JSON.stringify({ alias }) });

/** F2: create a room (and its persisted match). */
export const createRoom = (playerId: string, withBot: boolean, targetScore = 300) =>
  request<CreateRoomResponse>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, target_score: targetScore, with_bot: withBot }),
  });

/** Look up a room to validate a code before joining it. */
export const getRoom = (code: string) => request<RoomDetails>(`/api/rooms/${encodeURIComponent(code)}`);
