/**
 * AgentMesh SDK
 * Decentralized memory storage for AI agents
 * 
 * @example
 * ```typescript
 * import { createClient, generateKey, encrypt, decrypt } from '@agentmesh/sdk';
 * 
 * // Create client
 * const mesh = createClient();
 * 
 * // Register (one time)
 * const { apiKey } = await mesh.register('my-agent');
 * // SAVE THIS KEY!
 * 
 * // Generate encryption key (one time)
 * const encryptionKey = generateKey();
 * // SAVE THIS KEY TOO!
 * 
 * // Store encrypted memory
 * const encrypted = await encrypt('sensitive data', encryptionKey);
 * const { cid } = await mesh.store(encrypted, {
 *   description: 'user preferences'
 * });
 * 
 * // Search
 * const results = await mesh.search('preferences');
 * 
 * // Retrieve and decrypt
 * const { data } = await mesh.retrieve(cid);
 * const decrypted = await decrypt(data, encryptionKey);
 * ```
 * 
 * @packageDocumentation
 */

// Client
export {
  AgentMeshClient,
  AgentMeshError,
  createClient,
  type AgentMeshConfig,
  type RegisterResult,
  type StoreOptions,
  type StoreResult,
  type SearchResult,
  type SearchResponse,
  type RetrieveResult,
  type StatsResult,
  type MeshStatus,
} from './client.js';

// Crypto utilities
export {
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  encryptForStorage,
  decryptFromStorage,
} from './crypto.js';

// Convenience: pre-configured client for memforge.xyz
export const DEFAULT_GATEWAY = 'https://memforge.xyz';

/**
 * Quick start helper - creates client with stored API key
 */
export function quickStart(apiKey: string) {
  const { createClient } = require('./client.js');
  return createClient({ apiKey });
}
