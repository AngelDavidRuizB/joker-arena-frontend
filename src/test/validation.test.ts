import { describe, expect, it } from 'vitest';
import {
  normalizeRoomCode,
  validateAlias,
  validatePassword,
  validatePasswordRepeat,
  validateRoomCode,
  validateUser,
} from '../lib/validation';

describe('validateAlias', () => {
  it('accepts valid aliases', () => {
    for (const a of ['JokerPro99', 'ab', 'a_b-c', 'x'.repeat(30), '  padded  ']) {
      expect(validateAlias(a), a).toBeNull();
    }
  });

  it('rejects empty, short, long and invalid characters', () => {
    expect(validateAlias('')).toMatch(/alias/i);
    expect(validateAlias('   ')).toMatch(/alias/i);
    expect(validateAlias('a')).toMatch(/al menos 2/);
    expect(validateAlias('x'.repeat(31))).toMatch(/máximo 30/);
    for (const a of ['bad alias', '<script>', 'ñandú', 'a@b', 'x;drop']) {
      expect(validateAlias(a), a).not.toBeNull();
    }
  });

  it('reserves the bot alias', () => {
    expect(validateAlias('Bot-JokerBot')).toMatch(/reservado/);
    expect(validateAlias('bot-jokerbot')).toMatch(/reservado/);
  });
});

describe('cuenta: usuario, contraseña y repetición', () => {
  it('valida el usuario con las reglas del servicio de identidad', () => {
    for (const u of ['JokerPro99', 'ab', 'a_b-c', '  padded  ']) {
      expect(validateUser(u), u).toBeNull();
    }
    expect(validateUser('')).toMatch(/usuario/i);
    expect(validateUser('a')).toMatch(/al menos 2/);
    expect(validateUser('x'.repeat(31))).toMatch(/máximo 30/);
    for (const u of ['con espacio', '<script>', 'a@b']) {
      expect(validateUser(u), u).not.toBeNull();
    }
    expect(validateUser('Bot-JokerBot')).toMatch(/reservado/);
  });

  it('exige una contraseña de 8 a 72 caracteres', () => {
    expect(validatePassword('secreta123')).toBeNull();
    expect(validatePassword('')).toMatch(/escribe una contraseña/i);
    expect(validatePassword('      ')).toMatch(/espacios/i);
    expect(validatePassword('corta12')).toMatch(/al menos 8/);
    expect(validatePassword('x'.repeat(72))).toBeNull();
    expect(validatePassword('x'.repeat(73))).toMatch(/máximo 72/);
  });

  it('comprueba que la contraseña repetida coincide', () => {
    expect(validatePasswordRepeat('secreta123', 'secreta123')).toBeNull();
    expect(validatePasswordRepeat('secreta123', '')).toMatch(/repite/i);
    expect(validatePasswordRepeat('secreta123', 'secreta124')).toMatch(/no coinciden/i);
  });
});

describe('room codes', () => {
  it('normalizes to upper case without spaces', () => {
    expect(normalizeRoomCode('  jkr-a7k2 ')).toBe('JKR-A7K2');
  });

  it('accepts the JKR-XXXX format and the legacy JKR-402', () => {
    expect(validateRoomCode('jkr-a7k2')).toBeNull();
    expect(validateRoomCode('JKR-402')).toBeNull();
  });

  it('rejects empty and malformed codes', () => {
    expect(validateRoomCode('')).not.toBeNull();
    for (const c of ['x', 'JK', '-ABC', 'JKR_A7K2', 'JKR A7K2', 'JKR-ABCDEFGHIJKL']) {
      expect(validateRoomCode(c), c).not.toBeNull();
    }
  });
});
