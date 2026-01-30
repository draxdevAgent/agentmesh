# AgentMesh Protocol Specification

**Version:** 0.1.0-draft  
**Status:** Draft  
**Last Updated:** 2026-01-30

## Overview

AgentMesh is a decentralized memory storage protocol for AI agents. It enables agents to store, search, and share memories across a federated network of nodes.

### Design Goals

1. **Agent-first** — Optimized for AI agent workflows (store context, retrieve by semantic similarity)
2. **Decentralized** — No single point of failure, agents can run their own nodes
3. **Privacy-preserving** — Encrypted by default, agents control their own keys
4. **Interoperable** — Any implementation following this spec can join the mesh

---

## 1. Identifiers

### 1.1 Agent ID

Unique identifier for an agent on the mesh.

```
Format: [a-zA-Z0-9_-]{3,64}
Examples: "claude-assistant", "gpt4-research-bot", "my_agent_v2"
```

Agent IDs are self-selected during registration. First-come, first-served per node. Cross-node uniqueness is NOT guaranteed (see Section 6: Federation).

### 1.2 Content ID (CID)

Content-addressed identifier for stored data. Uses IPFS CIDv0 or CIDv1.

```
CIDv0: Qm[a-zA-Z0-9]{44}
CIDv1: bafy[a-zA-Z0-9]{50+}

Example: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
```

CIDs are deterministic — same content always produces same CID.

### 1.3 Node ID

Identifier for a mesh node. Uses libp2p peer ID format.

```
Format: 12D3KooW[a-zA-Z0-9]{44}
Example: 12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg
```

---

## 2. Data Structures

### 2.1 Memory Object

The fundamental unit of storage.

```typescript
interface Memory {
  // Required
  cid: string;           // Content ID (computed from data)
  data: string;          // Base64-encoded payload (should be encrypted)
  
  // Metadata (stored in index, searchable)
  agentId: string;       // Owner agent
  createdAt: number;     // Unix timestamp (seconds)
  
  // Optional metadata
  type?: string;         // Memory type (preference, fact, conversation, etc.)
  tags?: string[];       // Searchable tags
  description?: string;  // Human/agent-readable description (NOT encrypted)
  metadata?: object;     // Arbitrary JSON metadata
}
```

### 2.2 Index Entry

Stored locally by each node for search.

```typescript
interface IndexEntry {
  cid: string;
  agentId: string;
  type?: string;
  tags?: string;         // Space-separated for FTS
  description?: string;
  size: number;          // Bytes
  createdAt: number;
  metadata?: string;     // JSON string
}
```

### 2.3 Agent Registration

```typescript
interface AgentRegistration {
  agentId: string;
  keyHash: string;       // SHA-256 of API key
  keyPrefix: string;     // First 13 chars for display
  createdAt: number;
  rateLimit: number;     // Requests per minute
  isActive: boolean;
}
```

---

## 3. API Specification

All endpoints use JSON over HTTPS. Nodes MUST implement these endpoints to be protocol-compliant.

### 3.1 Public Endpoints (No Auth)

#### GET /mesh/status

Returns node status and capabilities.

**Response:**
```json
{
  "success": true,
  "status": "online",
  "protocol": "agentmesh/0.1.0",
  "node": {
    "peerId": "12D3KooW...",
    "version": "kubo/0.34.0",
    "peers": 236
  },
  "capabilities": ["store", "search", "replicate"],
  "endpoints": {
    "register": "POST /mesh/register",
    "store": "POST /mesh/store",
    "search": "POST /mesh/search",
    "retrieve": "GET /mesh/:cid"
  }
}
```

#### POST /mesh/register

Register a new agent and receive API key.

**Request:**
```json
{
  "agentId": "my-agent"
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "my-agent",
  "apiKey": "mesh_abc123...",
  "warning": "Save this API key! It will not be shown again."
}
```

**Errors:**
- `400` — Invalid agentId format
- `400` — Agent already registered
- `429` — Registration rate limit exceeded

#### GET /mesh/:cid

Retrieve raw data by CID.

**Response:**
```json
{
  "success": true,
  "cid": "Qm...",
  "data": "base64-encoded-data",
  "size": 1234
}
```

**Errors:**
- `400` — Invalid CID format
- `404` — CID not found
- `429` — Rate limit exceeded

---

### 3.2 Authenticated Endpoints

Require header: `X-Api-Key: mesh_xxx` or `Authorization: Bearer mesh_xxx`

#### POST /mesh/store

Store data and index for search.

**Request:**
```json
{
  "data": "base64-encoded-encrypted-data",
  "type": "preference",
  "tags": ["user", "settings"],
  "description": "User display preferences"
}
```

**Response:**
```json
{
  "success": true,
  "cid": "Qm...",
  "size": 1234,
  "indexed": true,
  "gateway": "https://ipfs.io/ipfs/Qm..."
}
```

**Errors:**
- `400` — Missing or invalid data
- `400` — Data too small (< 16 bytes)
- `401` — Missing or invalid API key
- `429` — Rate limit exceeded

#### POST /mesh/search

Search agent's memories.

**Request:**
```json
{
  "query": "display preferences",
  "type": "preference",
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "query": "display preferences",
  "results": [
    {
      "cid": "Qm...",
      "type": "preference",
      "tags": "user settings",
      "description": "User display preferences",
      "createdAt": 1706648400,
      "score": -1.23
    }
  ],
  "count": 1
}
```

If `query` is empty, returns all memories for the agent.

#### GET /mesh/stats

Get agent's usage statistics.

**Response:**
```json
{
  "success": true,
  "agentId": "my-agent",
  "stats": {
    "count": 42,
    "totalSize": 102400
  },
  "account": {
    "createdAt": 1706648400,
    "requestCount": 156,
    "rateLimit": 100
  }
}
```

#### DELETE /mesh/:cid

Remove memory from index (does not delete from IPFS).

**Response:**
```json
{
  "success": true,
  "deleted": true,
  "note": "Removed from index. Data may still exist on IPFS."
}
```

---

## 4. Authentication

### 4.1 API Keys

Format: `mesh_[a-zA-Z0-9_-]{32}`

Keys are generated server-side using cryptographically secure random bytes. Only the SHA-256 hash is stored.

### 4.2 Key Verification

```
1. Extract key from X-Api-Key header or Authorization: Bearer
2. Compute SHA-256 hash
3. Lookup hash in agent_keys table
4. Verify is_active = true
5. Update last_used_at and request_count
```

### 4.3 Rate Limiting

Default limits:
- **100 requests/minute** per agent (authenticated)
- **200 requests/minute** per IP (unauthenticated reads)
- **3 registrations/day** per IP

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 45
```

---

## 5. Storage Layer

### 5.1 Content Storage

Nodes use IPFS for content-addressed storage:

```
Store: POST /api/v0/add?pin=true
Retrieve: POST /api/v0/cat?arg={cid}
```

Alternative backends MAY be supported if they provide:
- Content addressing (same data = same ID)
- Immutability
- Retrievability by ID

### 5.2 Index Storage

Nodes maintain a local SQLite database for search:

```sql
-- Memory index
CREATE TABLE mesh_memories (
  id INTEGER PRIMARY KEY,
  cid TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  type TEXT,
  tags TEXT,
  description TEXT,
  size INTEGER,
  created_at INTEGER,
  metadata TEXT
);

-- FTS5 for search
CREATE VIRTUAL TABLE mesh_memories_fts USING fts5(
  type, tags, description, metadata,
  content='mesh_memories', content_rowid='id'
);

-- Agent keys
CREATE TABLE agent_keys (
  id INTEGER PRIMARY KEY,
  agent_id TEXT UNIQUE NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at INTEGER,
  last_used_at INTEGER,
  request_count INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1
);
```

---

## 6. Federation (Draft)

*This section is incomplete and subject to change.*

### 6.1 Node Discovery

Nodes discover each other via:
1. **Bootstrap nodes** — Hardcoded list of known-good nodes
2. **DHT** — libp2p Kademlia DHT for peer discovery
3. **Manual peering** — Direct `ipfs swarm connect`

### 6.2 Agent ID Resolution

Agent IDs are locally scoped. For cross-node queries:

```
Global Agent ID: agentId@nodeId
Example: my-agent@12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg
```

### 6.3 Replication

Memories can be replicated across nodes via:
1. **Pin requests** — Agent pays credits for redundancy
2. **Automatic replication** — Popular content cached by nodes
3. **Agent-initiated** — Store to multiple nodes directly

### 6.4 Consistency Model

- **Eventual consistency** — No global ordering guarantees
- **CID immutability** — Same CID always returns same data
- **Index divergence** — Different nodes may have different index states

---

## 7. Security Considerations

### 7.1 Encryption

Clients SHOULD encrypt data before storing. Recommended:
- **AES-256-GCM** for symmetric encryption
- **Fernet** (Python) or **Web Crypto API** (JS) for implementation

Nodes MAY warn if data appears unencrypted (high ASCII ratio).

### 7.2 Privacy

- **CIDs are public** — Anyone with CID can retrieve data
- **Descriptions are searchable** — Don't include secrets
- **Agent isolation** — Agents can only search their own index

### 7.3 Threats

| Threat | Mitigation |
|--------|------------|
| Spam/DoS | Rate limiting, registration limits |
| Data exfiltration | Encryption at rest |
| Key theft | Hash-only storage, no key recovery |
| Sybil attacks | IP-based registration limits |
| Index poisoning | Agent-scoped indexes |

---

## 8. Versioning

Protocol versions follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR** — Breaking changes to API or data structures
- **MINOR** — New features, backwards compatible
- **PATCH** — Bug fixes

Nodes MUST include protocol version in `/mesh/status` response.

---

## Appendix A: Reference Implementation

- **Gateway**: https://github.com/draxdevAgent/agentmesh
- **Live node**: https://memforge.xyz
- **Skill doc**: https://memforge.xyz/agentmesh-skill.md

## Appendix B: Bootstrap Nodes

```
/ip4/46.62.238.158/tcp/4001/p2p/12D3KooWN5cHkFHzmorLYxdxtmLdxJYS9umh6wYrpiSptkWTk5Hg
```

---

## Changelog

- **0.1.0-draft** (2026-01-30): Initial draft with auth, rate limiting, basic federation outline
