/**
 * AgentMesh Discovery Module
 * Peer discovery and mesh networking
 */

import { IPFSClient } from './ipfs.js';

export interface PeerInfo {
  /** IPFS Peer ID */
  peerId: string;
  /** Agent name/identifier */
  agentName?: string;
  /** Multiaddresses for direct connection */
  multiaddrs?: string[];
  /** Capabilities offered */
  capabilities?: ('storage' | 'query' | 'relay')[];
  /** When this peer was last seen */
  lastSeen?: number;
}

export interface DiscoveryConfig {
  /** IPFS client instance */
  ipfs: IPFSClient;
  /** Bootstrap peers to connect to on start */
  bootstrapPeers?: PeerInfo[];
  /** Our agent name for announcements */
  agentName?: string;
}

/** 
 * Official AgentMesh bootstrap peers
 * These are trusted nodes that seed the network
 */
export const BOOTSTRAP_PEERS: PeerInfo[] = [
  {
    peerId: '12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg',
    agentName: 'draxdevAI',
    multiaddrs: [
      '/ip4/46.62.238.158/tcp/4001/p2p/12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg',
      '/ip6/2a01:4f9:c011:b46b::1/tcp/4001/p2p/12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg',
    ],
    capabilities: ['storage', 'query'],
  },
];

export class MeshDiscovery {
  private ipfs: IPFSClient;
  private agentName?: string;
  private connectedPeers: Map<string, PeerInfo> = new Map();
  private bootstrapPeers: PeerInfo[];

  constructor(config: DiscoveryConfig) {
    this.ipfs = config.ipfs;
    this.agentName = config.agentName;
    this.bootstrapPeers = config.bootstrapPeers || BOOTSTRAP_PEERS;
  }

  /**
   * Connect to a specific peer by ID or multiaddr
   */
  async connect(peerIdOrAddr: string): Promise<boolean> {
    try {
      const response = await fetch(`${(this.ipfs as any).apiUrl}/api/v0/swarm/connect?arg=${encodeURIComponent(peerIdOrAddr)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to connect to ${peerIdOrAddr}:`, error);
        return false;
      }

      const result = await response.json() as { Strings?: string[] };
      console.log(`Connected to peer:`, result.Strings?.[0] || peerIdOrAddr);
      return true;
    } catch (error) {
      console.error(`Connection error:`, error);
      return false;
    }
  }

  /**
   * Connect to all bootstrap peers
   */
  async bootstrap(): Promise<{ connected: number; failed: number; skipped: number }> {
    let connected = 0;
    let failed = 0;
    let skipped = 0;

    // Get our own peer ID to skip self-connection
    const selfInfo = await this.ipfs.id();
    const selfPeerId = selfInfo.id;

    for (const peer of this.bootstrapPeers) {
      // Skip ourselves
      if (peer.peerId === selfPeerId) {
        skipped++;
        continue;
      }

      // Try multiaddrs first, then peer ID
      const addresses = peer.multiaddrs || [`/p2p/${peer.peerId}`];
      let success = false;

      for (const addr of addresses) {
        if (await this.connect(addr)) {
          this.connectedPeers.set(peer.peerId, { ...peer, lastSeen: Date.now() });
          success = true;
          break;
        }
      }

      if (success) {
        connected++;
      } else {
        failed++;
      }
    }

    return { connected, failed, skipped };
  }

  /**
   * Get list of currently connected IPFS peers
   */
  async peers(): Promise<PeerInfo[]> {
    try {
      const response = await fetch(`${(this.ipfs as any).apiUrl}/api/v0/swarm/peers`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get peers: ${response.status}`);
      }

      const result = await response.json() as { Peers?: { Peer: string; Addr: string }[] };
      const peers: PeerInfo[] = (result.Peers || []).map(p => ({
        peerId: p.Peer,
        multiaddrs: [p.Addr],
        lastSeen: Date.now(),
      }));

      // Enrich with known peer info
      return peers.map(p => {
        const known = this.connectedPeers.get(p.peerId) || 
                      this.bootstrapPeers.find(bp => bp.peerId === p.peerId);
        return known ? { ...p, ...known, lastSeen: Date.now() } : p;
      });
    } catch (error) {
      console.error('Failed to get peers:', error);
      return [];
    }
  }

  /**
   * Check if a specific peer is connected
   */
  async isConnected(peerId: string): Promise<boolean> {
    const peers = await this.peers();
    return peers.some(p => p.peerId === peerId);
  }

  /**
   * Get our own peer info for announcing
   */
  async getSelfInfo(): Promise<PeerInfo> {
    const info = await this.ipfs.id();
    
    // Get our addresses
    const response = await fetch(`${(this.ipfs as any).apiUrl}/api/v0/id`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    const fullInfo = await response.json() as { ID: string; Addresses?: string[] };

    return {
      peerId: info.id,
      agentName: this.agentName,
      multiaddrs: fullInfo.Addresses || [],
      capabilities: ['storage', 'query'],
      lastSeen: Date.now(),
    };
  }

  /**
   * Announce our presence to the network
   * For v0.1, this just logs - future versions will publish to DHT/registry
   */
  async announce(): Promise<PeerInfo> {
    const selfInfo = await this.getSelfInfo();
    console.log('📡 AgentMesh node announcing:');
    console.log(`   PeerID: ${selfInfo.peerId}`);
    console.log(`   Agent: ${selfInfo.agentName || 'anonymous'}`);
    console.log(`   Addresses: ${selfInfo.multiaddrs?.length || 0} available`);
    return selfInfo;
  }

  /**
   * Find AgentMesh peers (checks connected peers against known bootstrap list)
   */
  async findMeshPeers(): Promise<PeerInfo[]> {
    const connected = await this.peers();
    const meshPeers = connected.filter(p => 
      this.bootstrapPeers.some(bp => bp.peerId === p.peerId)
    );
    return meshPeers;
  }

  /**
   * Get bootstrap peer list
   */
  getBootstrapPeers(): PeerInfo[] {
    return [...this.bootstrapPeers];
  }

  /**
   * Add a peer to bootstrap list (runtime only)
   */
  addBootstrapPeer(peer: PeerInfo): void {
    if (!this.bootstrapPeers.some(p => p.peerId === peer.peerId)) {
      this.bootstrapPeers.push(peer);
    }
  }
}
