/**
 * AgentMesh Client
 * Simple HTTP client for the AgentMesh gateway
 */

export interface AgentMeshConfig {
  /** API key (mesh_xxx format) */
  apiKey?: string;
  /** Gateway URL (default: https://memforge.xyz) */
  gateway?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

export interface RegisterResult {
  success: boolean;
  agentId: string;
  apiKey: string;
}

export interface StoreOptions {
  /** Memory type (e.g., 'preference', 'fact', 'conversation') */
  type?: string;
  /** Searchable tags */
  tags?: string[];
  /** Searchable description (NOT encrypted) */
  description?: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

export interface StoreResult {
  success: boolean;
  cid: string;
  size: number;
  gateway: string;
  warning?: string;
}

export interface SearchResult {
  cid: string;
  type?: string;
  tags?: string;
  description?: string;
  createdAt: number;
  score: number;
}

export interface SearchResponse {
  success: boolean;
  query?: string;
  results: SearchResult[];
  count: number;
}

export interface RetrieveResult {
  success: boolean;
  cid: string;
  data: string;
  size: number;
}

export interface StatsResult {
  success: boolean;
  agentId: string;
  stats: {
    count: number;
    totalSize: number;
  };
  account?: {
    createdAt: number;
    requestCount: number;
    rateLimit: number;
  };
}

export interface MeshStatus {
  success: boolean;
  status: 'online' | 'offline';
  node?: {
    peerId: string;
    version: string;
    peers: number;
  };
}

export class AgentMeshError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'AgentMeshError';
  }
}

export class AgentMeshClient {
  private apiKey?: string;
  private gateway: string;
  private timeout: number;

  constructor(config: AgentMeshConfig = {}) {
    this.apiKey = config.apiKey;
    this.gateway = config.gateway?.replace(/\/$/, '') || 'https://memforge.xyz';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Set or update API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Register a new agent and get API key
   * @param agentId - Unique agent identifier (3-64 chars, alphanumeric + _ -)
   * @returns Registration result with API key (save this!)
   */
  async register(agentId: string): Promise<RegisterResult> {
    const response = await this.request<RegisterResult>('/mesh/register', {
      method: 'POST',
      body: { agentId },
      auth: false,
    });

    // Auto-set the API key for subsequent requests
    if (response.apiKey) {
      this.apiKey = response.apiKey;
    }

    return response;
  }

  /**
   * Store data to the mesh
   * @param data - Base64-encoded data (should be encrypted!)
   * @param options - Storage options (type, tags, description)
   */
  async store(data: string, options: StoreOptions = {}): Promise<StoreResult> {
    return this.request<StoreResult>('/mesh/store', {
      method: 'POST',
      body: {
        data,
        ...options,
      },
    });
  }

  /**
   * Store a string (auto base64 encode)
   * WARNING: This stores plaintext. Use storeEncrypted() for sensitive data.
   */
  async storeString(content: string, options: StoreOptions = {}): Promise<StoreResult> {
    const data = Buffer.from(content, 'utf-8').toString('base64');
    return this.store(data, options);
  }

  /**
   * Search memories
   * @param query - Search query (empty = list all)
   * @param options - Search options
   */
  async search(
    query?: string,
    options: { type?: string; limit?: number } = {}
  ): Promise<SearchResponse> {
    return this.request<SearchResponse>('/mesh/search', {
      method: 'POST',
      body: {
        query: query || '',
        ...options,
      },
    });
  }

  /**
   * List all memories (no search query)
   */
  async list(options: { type?: string; limit?: number } = {}): Promise<SearchResponse> {
    return this.search(undefined, options);
  }

  /**
   * Retrieve data by CID
   * @param cid - IPFS Content Identifier
   */
  async retrieve(cid: string): Promise<RetrieveResult> {
    return this.request<RetrieveResult>(`/mesh/${cid}`, {
      method: 'GET',
      auth: false, // Retrieval doesn't require auth
    });
  }

  /**
   * Retrieve and decode as string
   */
  async retrieveString(cid: string): Promise<string> {
    const result = await this.retrieve(cid);
    return Buffer.from(result.data, 'base64').toString('utf-8');
  }

  /**
   * Delete memory from index
   * @param cid - CID to delete
   */
  async delete(cid: string): Promise<{ success: boolean; deleted: boolean }> {
    return this.request(`/mesh/${cid}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get agent stats
   */
  async stats(): Promise<StatsResult> {
    return this.request<StatsResult>('/mesh/stats', {
      method: 'GET',
    });
  }

  /**
   * Check mesh status (no auth required)
   */
  async status(): Promise<MeshStatus> {
    return this.request<MeshStatus>('/mesh/status', {
      method: 'GET',
      auth: false,
    });
  }

  /**
   * Check if connected to mesh
   */
  async isOnline(): Promise<boolean> {
    try {
      const status = await this.status();
      return status.status === 'online';
    } catch {
      return false;
    }
  }

  /**
   * Internal request helper
   */
  private async request<T>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
      auth?: boolean;
    }
  ): Promise<T> {
    const { method, body, auth = true } = options;
    const url = `${this.gateway}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      if (!this.apiKey) {
        throw new AgentMeshError(
          'API key required. Call register() first or provide apiKey in config.'
        );
      }
      headers['X-Api-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as T & { error?: string };

      if (!response.ok) {
        throw new AgentMeshError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AgentMeshError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AgentMeshError('Request timeout');
        }
        throw new AgentMeshError(error.message);
      }

      throw new AgentMeshError('Unknown error');
    }
  }
}

/**
 * Create a new AgentMesh client
 */
export function createClient(config?: AgentMeshConfig): AgentMeshClient {
  return new AgentMeshClient(config);
}
