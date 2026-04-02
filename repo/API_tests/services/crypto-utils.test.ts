import { describe, it, expect } from 'vitest';
import { generateSalt, hashPassword, verifyPassword } from '@services/crypto-utils';

describe('Crypto Utils', () => {
  it('generateSalt returns 32 hex chars', () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique salts', () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toBe(b);
  });

  it('hashPassword returns hex string', async () => {
    const hash = await hashPassword('test', 'salt');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same password+salt produces same hash', async () => {
    const a = await hashPassword('pass', 'salt1');
    const b = await hashPassword('pass', 'salt1');
    expect(a).toBe(b);
  });

  it('different salt produces different hash', async () => {
    const a = await hashPassword('pass', 'salt1');
    const b = await hashPassword('pass', 'salt2');
    expect(a).not.toBe(b);
  });

  it('verifyPassword returns true for correct', async () => {
    const salt = generateSalt();
    const hash = await hashPassword('mypassword', salt);
    expect(await verifyPassword('mypassword', salt, hash)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const salt = generateSalt();
    const hash = await hashPassword('correct', salt);
    expect(await verifyPassword('wrong', salt, hash)).toBe(false);
  });

  it('verifyPassword returns false for different length hash', async () => {
    expect(await verifyPassword('pass', 'salt', 'short')).toBe(false);
  });
});
