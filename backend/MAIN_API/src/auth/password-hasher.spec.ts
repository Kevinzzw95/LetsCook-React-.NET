import { pbkdf2Sync, randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from './password-hasher';

describe('PBKDF2 password hashing', () => {
  it('creates and verifies Identity v3 password hashes', () => {
    const hash = hashPassword('P4$$w0rd');
    expect(verifyPassword('P4$$w0rd', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('verifies legacy Identity v2 password hashes', () => {
    const salt = randomBytes(16);
    const subkey = pbkdf2Sync('Legacy1!', salt, 1_000, 32, 'sha1');
    const encoded = Buffer.concat([Buffer.from([0]), salt, subkey]).toString('base64');
    expect(verifyPassword('Legacy1!', encoded)).toBe(true);
  });

  it('rejects malformed hashes', () => {
    expect(verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('anything', null)).toBe(false);
  });
});
