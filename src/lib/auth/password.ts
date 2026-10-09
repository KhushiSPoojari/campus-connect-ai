import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export interface HashResult {
  hash: string;
  salt: string;
}

/**
 * Hashes a plain-text password using PBKDF2 with SHA-512 and a cryptographically secure random salt.
 */
export function hashPassword(password: string): HashResult {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  return { hash, salt };
}

/**
 * Verifies a plain-text password against a stored hash and salt using constant-time comparison.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  try {
    const computedHash = crypto
      .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST)
      .toString('hex');

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (storedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, computedBuffer);
  } catch {
    return false;
  }
}
