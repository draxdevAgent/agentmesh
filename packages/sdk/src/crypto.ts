/**
 * AgentMesh Crypto Utilities
 * Simple encryption for memory storage
 * 
 * Uses AES-256-GCM for encryption
 * Works in Node.js and modern browsers
 */

// Type for both Node.js Buffer and browser Uint8Array
type ByteArray = Uint8Array | Buffer;

/**
 * Generate a random encryption key
 * @returns Base64-encoded 32-byte key
 */
export function generateKey(): string {
  const key = new Uint8Array(32);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Browser or Node.js with webcrypto
    crypto.getRandomValues(key);
  } else {
    // Node.js fallback
    const nodeCrypto = require('crypto');
    const buffer = nodeCrypto.randomBytes(32);
    key.set(buffer);
  }
  
  return toBase64(key);
}

/**
 * Derive a key from a passphrase using PBKDF2
 * @param passphrase - User-provided passphrase
 * @param salt - Optional salt (default: fixed salt for simplicity)
 * @returns Base64-encoded 32-byte key
 */
export async function deriveKey(
  passphrase: string,
  salt: string = 'agentmesh-default-salt'
): Promise<string> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  const saltBytes = encoder.encode(salt);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Web Crypto API
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passphraseBytes,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    return toBase64(new Uint8Array(derivedBits));
  } else {
    // Node.js crypto
    const nodeCrypto = require('crypto');
    const derived = nodeCrypto.pbkdf2Sync(
      passphraseBytes,
      saltBytes,
      100000,
      32,
      'sha256'
    );
    return derived.toString('base64');
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - String to encrypt
 * @param key - Base64-encoded 32-byte key
 * @returns Base64-encoded encrypted data (iv + ciphertext + tag)
 */
export async function encrypt(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const keyBytes = fromBase64(key);

  // Generate random IV (12 bytes for GCM)
  const iv = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(iv);
  } else {
    const nodeCrypto = require('crypto');
    const buffer = nodeCrypto.randomBytes(12);
    iv.set(buffer);
  }

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      plaintextBytes
    );

    // Combine: iv (12) + ciphertext (includes 16-byte tag)
    const combined = new Uint8Array(12 + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), 12);

    return toBase64(combined);
  } else {
    // Node.js crypto
    const nodeCrypto = require('crypto');
    const cipher = nodeCrypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(keyBytes),
      Buffer.from(iv)
    );

    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintextBytes)),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine: iv (12) + ciphertext + tag (16)
    const combined = Buffer.concat([
      Buffer.from(iv),
      encrypted,
      tag,
    ]);

    return combined.toString('base64');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param ciphertext - Base64-encoded encrypted data
 * @param key - Base64-encoded 32-byte key
 * @returns Decrypted string
 */
export async function decrypt(ciphertext: string, key: string): Promise<string> {
  const combined = fromBase64(ciphertext);
  const keyBytes = fromBase64(key);

  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } else {
    // Node.js crypto
    const nodeCrypto = require('crypto');

    // Last 16 bytes are the auth tag
    const tag = encrypted.slice(-16);
    const ciphertextOnly = encrypted.slice(0, -16);

    const decipher = nodeCrypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(keyBytes),
      Buffer.from(iv)
    );

    decipher.setAuthTag(Buffer.from(tag));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextOnly)),
      decipher.final(),
    ]);

    return decrypted.toString('utf-8');
  }
}

/**
 * Encrypt and encode for storage
 * Returns data ready to send to store()
 */
export async function encryptForStorage(
  content: string,
  key: string
): Promise<string> {
  const encrypted = await encrypt(content, key);
  // Already base64, just return it
  return encrypted;
}

/**
 * Decrypt data retrieved from storage
 */
export async function decryptFromStorage(
  data: string,
  key: string
): Promise<string> {
  return decrypt(data, key);
}

// Base64 helpers that work in both environments
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  // Browser
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'base64'));
  }
  // Browser
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
