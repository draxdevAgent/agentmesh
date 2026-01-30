/**
 * @agentmesh/sdk
 * Client SDK for AgentMesh - decentralized memory network for AI agents
 * 
 * @example
 * ```typescript
 * import { AgentMesh } from '@agentmesh/sdk';
 * 
 * const mesh = new AgentMesh({
 *   encryptionKey: 'your-secret-key',
 * });
 * 
 * // Store a memory
 * const { cid } = await mesh.store({
 *   type: 'preference',
 *   content: 'User prefers dark mode',
 *   timestamp: Date.now(),
 * });
 * 
 * // Retrieve it later
 * const memory = await mesh.retrieve(cid);
 * ```
 */

export { AgentMesh, type MeshConfig, type Memory, type StoredMemory, type StoreResult } from './mesh.js';
export { IPFSClient, type IPFSConfig, type AddResult } from './ipfs.js';
export { encrypt, decrypt, packPayload, unpackPayload, deriveKey, type EncryptedPayload } from './crypto.js';
