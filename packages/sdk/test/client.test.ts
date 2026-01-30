import { describe, it, expect } from 'vitest';
import { createClient, generateKey, encrypt, decrypt } from '../src/index';

describe('AgentMesh Client', () => {
  const mesh = createClient();

  it('should check mesh status', async () => {
    const status = await mesh.status();
    expect(status.success).toBe(true);
    expect(status.status).toBe('online');
    expect(status.node).toBeDefined();
    expect(status.node?.peers).toBeGreaterThan(0);
  });

  it('should be online', async () => {
    const online = await mesh.isOnline();
    expect(online).toBe(true);
  });
});

describe('Crypto', () => {
  it('should generate a key', () => {
    const key = generateKey();
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(30); // base64 of 32 bytes
  });

  it('should encrypt and decrypt', async () => {
    const key = generateKey();
    const plaintext = 'Hello, AgentMesh!';
    
    const encrypted = await encrypt(plaintext, key);
    expect(encrypted).not.toBe(plaintext);
    
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle unicode', async () => {
    const key = generateKey();
    const plaintext = '你好世界 🦞 émojis';
    
    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });
});
