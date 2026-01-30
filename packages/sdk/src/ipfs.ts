/**
 * AgentMesh IPFS Module
 * Handles communication with IPFS node via HTTP API
 */

export interface IPFSConfig {
  /** IPFS API endpoint (default: http://127.0.0.1:5001) */
  apiUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

export interface AddResult {
  /** Content Identifier (CID) */
  cid: string;
  /** Size in bytes */
  size: number;
}

export class IPFSClient {
  private apiUrl: string;
  private timeout: number;

  constructor(config: IPFSConfig = {}) {
    this.apiUrl = config.apiUrl || 'http://127.0.0.1:5001';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Add content to IPFS
   */
  async add(data: Buffer | string): Promise<AddResult> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    
    // Create multipart form data manually (no external deps)
    const boundary = '----AgentMeshBoundary' + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="memory"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const body = Buffer.concat([
      Buffer.from(header),
      buffer,
      Buffer.from(footer)
    ]);

    const response = await fetch(`${this.apiUrl}/api/v0/add?pin=true`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS add failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { Hash: string; Size: string };
    return {
      cid: result.Hash,
      size: parseInt(result.Size, 10),
    };
  }

  /**
   * Retrieve content from IPFS by CID
   */
  async cat(cid: string): Promise<Buffer> {
    const response = await fetch(`${this.apiUrl}/api/v0/cat?arg=${cid}`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS cat failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Pin content to ensure it's not garbage collected
   */
  async pin(cid: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/v0/pin/add?arg=${cid}`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS pin failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Unpin content
   */
  async unpin(cid: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/v0/pin/rm?arg=${cid}`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS unpin failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Check if IPFS node is reachable
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v0/id`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get node identity info
   */
  async id(): Promise<{ id: string; agentVersion: string }> {
    const response = await fetch(`${this.apiUrl}/api/v0/id`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`IPFS id failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { ID: string; AgentVersion: string };
    return {
      id: result.ID,
      agentVersion: result.AgentVersion,
    };
  }
}
