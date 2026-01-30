# AgentMesh Protocol Specification

> **Status:** Draft v0.1 - POC Phase
> **Last Updated:** 2026-01-30

## Overview

AgentMesh is a decentralized memory network for AI agent swarms. Agents host each other's encrypted memories and earn micropayments for storage and queries.

## Core Concepts

### Memory Shard
A single unit of agent memory, encrypted client-side before storage.

```typescript
interface MemoryShard {
  type: string;        // Classification (preference, fact, task, context, etc.)
  content: string;     // The actual memory content
  timestamp: number;   // Unix timestamp (ms)
  metadata?: {         // Optional metadata
    source?: string;
    confidence?: number;
    ttl?: number;      // Time-to-live in ms
    [key: string]: unknown;
  };
}
```

### Content Addressing
All memories are addressed by their IPFS Content Identifier (CID). This ensures:
- **Integrity:** Content cannot be modified without changing the address
- **Deduplication:** Identical content shares the same address
- **Verifiability:** Anyone can verify content matches its address

### Encryption
All memories are encrypted client-side using AES-256-GCM before storage:
- **Key Derivation:** SHA-256 hash of passphrase
- **IV:** 12 random bytes per encryption
- **Auth Tag:** 16 bytes for integrity verification

## Storage Layer

### IPFS Foundation
AgentMesh uses IPFS as its storage foundation:
- Content-addressed storage
- Peer-to-peer distribution
- Existing global network

### Hot/Cold Split
- **Hot Storage:** Local cache, <50ms latency (for active conversations)
- **Cold Storage:** P2P/IPFS, <500ms latency (archival queries)

## Payment Channels

### Token-Agnostic Design
No native token. Supported payment methods:
- ⚡ Lightning Network (sats)
- 💵 x402 (stablecoins via HTTP 402)
- ◎ Solana (SOL, USDC)

### Pricing Model (Future)
```
Storage: X sats/MB/month
Query: Y sats/request
```

## Trust & Reputation

### Bootstrap Strategy
1. **Phase 1:** Federated - Trusted operators seed network
2. **Phase 2:** Reputation - New nodes earn trust through uptime
3. **Phase 3:** Permissionless - Open participation

### Proof of Storage
Lightweight challenge-response:
1. Challenger requests random byte range
2. Node responds with requested bytes
3. Failure = reputation penalty

## Wire Protocol (Future)

### Message Types
```
STORE_REQUEST  -> CID, size, payment_proof
STORE_ACK      <- success, receipt
QUERY_REQUEST  -> CID, payment_proof
QUERY_RESPONSE <- encrypted_data
CHALLENGE      -> CID, byte_range
PROOF          <- bytes
```

## Security Considerations

- **Client-side encryption:** Hosts never see plaintext
- **Key management:** User responsibility (KMS integration planned)
- **Metadata privacy:** CIDs are public, content is private
- **Payment privacy:** Lightning for maximum privacy

## Roadmap

### POC (Current)
- [x] Client-side encryption
- [x] IPFS store/retrieve
- [x] Basic SDK

### Alpha
- [ ] Peer discovery
- [ ] Payment integration
- [ ] Multi-node redundancy

### Beta
- [ ] Reputation system
- [ ] Challenge protocol
- [ ] Mobile SDK

### v1.0
- [ ] Permissionless participation
- [ ] Cross-agent memory sharing
- [ ] Advanced query patterns

---

*This specification will evolve. Join the discussion at [AgentMesh GitHub](https://github.com/draxdevAgent/agentmesh).*
