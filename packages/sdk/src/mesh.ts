/**
 * AgentMesh - High-level API
 * Encrypted memory storage on IPFS
 */

import { encrypt, decrypt, packPayload, unpackPayload, deriveKey } from './crypto.js';
import { IPFSClient, type IPFSConfig } from './ipfs.js';

export interface MeshConfig {
  /** Encryption key (passphrase or 32-byte buffer) */
  encryptionKey: string | Buffer;
  /** IPFS configuration */
  ipfs?: IPFSConfig;
}

export interface Memory {
  /** Memory type identifier */
  type: string;
  /** Memory content */
  content: string;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface StoredMemory extends Memory {
  /** IPFS Content Identifier */
  cid: string;
}

export interface StoreResult {
  /** IPFS Content Identifier */
  cid: string;
  /** Encrypted size in bytes */
  size: number;
}

export class AgentMesh {
  private key: Buffer;
  private ipfs: IPFSClient;

  constructor(config: MeshConfig) {
    this.key = typeof config.encryptionKey === 'string' 
      ? deriveKey(config.encryptionKey) 
      : config.encryptionKey;
    this.ipfs = new IPFSClient(config.ipfs);
  }

  /**
   * Store an encrypted memory to the mesh
   */
  async store(memory: Memory): Promise<StoreResult> {
    // Serialize memory
    const json = JSON.stringify(memory);
    
    // Encrypt
    const encrypted = encrypt(json, this.key);
    
    // Pack into single buffer
    const packed = packPayload(encrypted);
    
    // Store to IPFS
    const result = await this.ipfs.add(packed);
    
    return {
      cid: result.cid,
      size: result.size,
    };
  }

  /**
   * Retrieve and decrypt a memory from the mesh
   */
  async retrieve(cid: string): Promise<Memory> {
    // Fetch from IPFS
    const packed = await this.ipfs.cat(cid);
    
    // Unpack
    const encrypted = unpackPayload(packed);
    
    // Decrypt
    const decrypted = decrypt(encrypted, this.key);
    
    // Parse
    return JSON.parse(decrypted.toString('utf-8')) as Memory;
  }

  /**
   * Store multiple memories in batch
   */
  async storeBatch(memories: Memory[]): Promise<StoreResult[]> {
    return Promise.all(memories.map(m => this.store(m)));
  }

  /**
   * Retrieve multiple memories in batch
   */
  async retrieveBatch(cids: string[]): Promise<Memory[]> {
    return Promise.all(cids.map(cid => this.retrieve(cid)));
  }

  /**
   * Check if the mesh (IPFS node) is available
   */
  async isAvailable(): Promise<boolean> {
    return this.ipfs.ping();
  }

  /**
   * Get mesh node info
   */
  async nodeInfo(): Promise<{ peerId: string; version: string }> {
    const info = await this.ipfs.id();
    return {
      peerId: info.id,
      version: info.agentVersion,
    };
  }

  /**
   * Pin a memory to ensure persistence
   */
  async pin(cid: string): Promise<void> {
    await this.ipfs.pin(cid);
  }

  /**
   * Unpin a memory (allows garbage collection)
   */
  async unpin(cid: string): Promise<void> {
    await this.ipfs.unpin(cid);
  }
}
