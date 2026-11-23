// Client-side validation mirroring the Game Engine rules (the server remains authoritative).

const ALIAS_RE = /^[a-zA-Z0-9_-]+$/;
const ROOM_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,11}$/;

export const ALIAS_MIN = 2;
export const ALIAS_MAX = 30;
/** Política de contraseñas de auth-identity-ms (app/passwords.py). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** Returns an error message in Spanish, or null when the alias is valid. */
export function validateAlias(raw: string): string | null {
  const alias = raw.trim();
  if (alias.length === 0) return 'Escribe un alias para continuar.';
  if (alias.length < ALIAS_MIN) return `El alias necesita al menos ${ALIAS_MIN} caracteres.`;
  if (alias.length > ALIAS_MAX) return `El alias admite máximo ${ALIAS_MAX} caracteres.`;
  if (!ALIAS_RE.test(alias)) return 'Solo letras, números, guion y guion bajo (sin espacios).';
  if (alias.toLowerCase() === 'bot-jokerbot') return 'Ese alias está reservado.';
  return null;
}

/** Usuario de la cuenta: mismas reglas que el alias, con mensajes en términos de "usuario". */
export function validateUser(raw: string): string | null {
  const user = raw.trim();
  if (user.length === 0) return 'Escribe un usuario para continuar.';
  if (user.length < ALIAS_MIN) return `El usuario necesita al menos ${ALIAS_MIN} caracteres.`;
  if (user.length > ALIAS_MAX) return `El usuario admite máximo ${ALIAS_MAX} caracteres.`;
  if (!ALIAS_RE.test(user)) return 'Solo letras, números, guion y guion bajo (sin espacios).';
  if (user.toLowerCase() === 'bot-jokerbot') return 'Ese usuario está reservado.';
  return null;
}

/** Contraseña: mínimo 8 y máximo 72 caracteres (igual que el servicio de identidad). */
export function validatePassword(raw: string): string | null {
  if (raw.length === 0) return 'Escribe una contraseña.';
  if (raw.trim().length === 0) return 'La contraseña no puede ser solo espacios.';
  if (raw.length < PASSWORD_MIN) return `La contraseña necesita al menos ${PASSWORD_MIN} caracteres.`;
  if (raw.length > PASSWORD_MAX) return `La contraseña admite máximo ${PASSWORD_MAX} caracteres.`;
  return null;
}

/** Repetición de la contraseña (solo en el registro). */
export function validatePasswordRepeat(password: string, repeat: string): string | null {
  if (repeat.length === 0) return 'Repite la contraseña.';
  if (password !== repeat) return 'Las contraseñas no coinciden.';
  return null;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Returns an error message in Spanish, or null when the room code looks valid. */
export function validateRoomCode(raw: string): string | null {
  const code = normalizeRoomCode(raw);
  if (code.length === 0) return 'Escribe el código de la sala (ej. JKR-A7K2).';
  if (!ROOM_CODE_RE.test(code)) return 'Código inválido. Formato esperado: JKR-XXXX.';
  return null;
}

