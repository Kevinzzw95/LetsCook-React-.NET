import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const V2_MARKER = 0x00;
const V3_MARKER = 0x01;
const PRF_HMAC_SHA512 = 2;
const V3_ITERATIONS = 100_000;

function readNetworkUInt32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32BE(offset);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const subkey = pbkdf2Sync(password, salt, V3_ITERATIONS, 32, 'sha512');
  const output = Buffer.alloc(13 + salt.length + subkey.length);
  output[0] = V3_MARKER;
  output.writeUInt32BE(PRF_HMAC_SHA512, 1);
  output.writeUInt32BE(V3_ITERATIONS, 5);
  output.writeUInt32BE(salt.length, 9);
  salt.copy(output, 13);
  subkey.copy(output, 13 + salt.length);
  return output.toString('base64');
}

export function verifyPassword(password: string, encodedHash: string | null): boolean {
  if (!encodedHash) return false;

  let decoded: Buffer;
  try {
    decoded = Buffer.from(encodedHash, 'base64');
  } catch {
    return false;
  }

  if (decoded.length === 0) return false;
  if (decoded[0] === V2_MARKER) {
    if (decoded.length !== 49) return false;
    const salt = decoded.subarray(1, 17);
    const expected = decoded.subarray(17);
    const actual = pbkdf2Sync(password, salt, 1_000, 32, 'sha1');
    return timingSafeEqual(actual, expected);
  }

  if (decoded[0] !== V3_MARKER || decoded.length < 14) return false;
  const prf = readNetworkUInt32(decoded, 1);
  const iterations = readNetworkUInt32(decoded, 5);
  const saltLength = readNetworkUInt32(decoded, 9);
  if (iterations < 1 || saltLength < 16 || 13 + saltLength >= decoded.length) return false;

  const algorithms: Record<number, string> = { 0: 'sha1', 1: 'sha256', 2: 'sha512' };
  const algorithm = algorithms[prf];
  if (!algorithm) return false;
  const salt = decoded.subarray(13, 13 + saltLength);
  const expected = decoded.subarray(13 + saltLength);
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, algorithm);
  return timingSafeEqual(actual, expected);
}
