import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, login, register } from '../api/client';
import { useSession } from '../store/session';
import { Welcome } from '../views/Welcome';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return { ...actual, login: vi.fn(), register: vi.fn() };
});

const mockedLogin = vi.mocked(login);
const mockedRegister = vi.mocked(register);

function session(alias = 'JokerPro99', role: 'player' | 'admin' = 'player') {
  return { token: 'token-jwt', token_type: 'Bearer', expires_in: 3600, player: { player_id: 'p1', alias, role } };
}

const userField = () => screen.getByLabelText(/^usuario$/i);
const passwordField = () => screen.getByLabelText(/^contraseña$/i);
const repeatField = () => screen.getByLabelText(/^repetir contraseña$/i);

beforeEach(() => {
  vi.clearAllMocks();
  useSession.persist.clearStorage();
  useSession.setState({ player: null });
});

describe('Welcome · registro e inicio de sesión', () => {
  it('muestra usuario y contraseña, y pide repetir solo al crear cuenta', async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    expect(userField()).toBeInTheDocument();
    expect(passwordField()).toBeInTheDocument();
    expect(screen.queryByLabelText(/^repetir contraseña$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));
    expect(repeatField()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta y jugar/i })).toBeInTheDocument();
  });

  it('no envía el registro si las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    render(<Welcome />);
    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));
    await user.type(userField(), 'JokerPro99');
    await user.type(passwordField(), 'secreta123');
    await user.type(repeatField(), 'otra-clave');
    await user.click(screen.getByRole('button', { name: /crear cuenta y jugar/i }));
    expect(await screen.findByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('crea la cuenta con usuario, contraseña y repetición', async () => {
    mockedRegister.mockResolvedValue(session());
    const user = userEvent.setup();
    render(<Welcome />);
    await user.click(screen.getByRole('tab', { name: /crear cuenta/i }));
    await user.type(userField(), '  JokerPro99 ');
    await user.type(passwordField(), 'secreta123');
    await user.type(repeatField(), 'secreta123');
    await user.click(screen.getByRole('button', { name: /crear cuenta y jugar/i }));
    expect(mockedRegister).toHaveBeenCalledWith({
      user: 'JokerPro99',
      password: 'secreta123',
      repeatPassword: 'secreta123',
    });
    expect(await screen.findByText(/hola de nuevo/i)).toBeInTheDocument();
    expect(router.push).toHaveBeenCalledWith('/lobby');
    expect(useSession.getState().player?.alias).toBe('JokerPro99');
  });

  it('inicia sesión con usuario y contraseña', async () => {
    mockedLogin.mockResolvedValue(session('Ana'));
    const user = userEvent.setup();
    render(<Welcome />);
    await user.type(userField(), 'Ana');
    await user.type(passwordField(), 'secreta123');
    await user.click(screen.getByRole('button', { name: /entrar y jugar/i }));
    expect(mockedLogin).toHaveBeenCalledWith({ user: 'Ana', password: 'secreta123' });
    expect(router.push).toHaveBeenCalledWith('/lobby');
    expect(useSession.getState().player?.alias).toBe('Ana');
  });

  it('muestra el error del servidor si la contraseña es incorrecta', async () => {
    mockedLogin.mockRejectedValue(new ApiError(401, 'Usuario o contraseña incorrectos.'));
    const user = userEvent.setup();
    render(<Welcome />);
    await user.type(userField(), 'Ana');
    await user.type(passwordField(), 'incorrecta1');
    await user.click(screen.getByRole('button', { name: /entrar y jugar/i }));
    expect(await screen.findByText(/usuario o contraseña incorrectos/i)).toBeInTheDocument();
    expect(useSession.getState().player).toBeNull();
  });

  it('lleva al admin a la consola de administración', async () => {
    mockedLogin.mockResolvedValue(session('admin', 'admin'));
    const user = userEvent.setup();
    render(<Welcome />);
    await user.type(userField(), 'admin');
    await user.type(passwordField(), 'secreto-admin');
    await user.click(screen.getByRole('button', { name: /entrar y jugar/i }));
    expect(router.push).toHaveBeenCalledWith('/admin');
  });
});
