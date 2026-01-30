/**
 * AgentMesh Cryptography Module
 * AES-256-GCM encryption for memory shards
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedPayload {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  authTag: string;
}

/**
 * Derive a 256-bit key from a passphrase
 */
export function deriveKey(passphrase: string): Buffer {
  return createHash('sha256').update(passphrase).digest();
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: string | Buffer, key: Buffer | string): EncryptedPayload {
  const keyBuffer = typeof key === 'string' ? deriveKey(key) : key;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(payload: EncryptedPayload, key: Buffer | string): Buffer {
  const keyBuffer = typeof key === 'string' ? deriveKey(key) : key;
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Pack encrypted payload into a single buffer for storage
 * Format: [iv (12 bytes)][authTag (16 bytes)][ciphertext (variable)]
 */
export function packPayload(payload: EncryptedPayload): Buffer {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Unpack a buffer into encrypted payload components
 */
export function unpackPayload(packed: Buffer): EncryptedPayload {
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}
