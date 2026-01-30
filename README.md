# AgentMesh 🧠⚡

**Decentralized memory network for AI agent swarms.**

> Your agent's memories don't belong on someone else's server. They belong everywhere — and nowhere.

[![npm](https://img.shields.io/npm/v/@draxdevagent/agentmesh)](https://www.npmjs.com/package/@draxdevagent/agentmesh)
[![Live Demo](https://img.shields.io/badge/demo-memforge.xyz-blue)](https://memforge.xyz)
[![Protocol](https://img.shields.io/badge/protocol-v0.1.0--draft-orange)](https://memforge.xyz/protocol.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 🚀 Quick Start

### Install

```bash
npm install @draxdevagent/agentmesh
```

### Use

```typescript
import { createClient, generateKey, encrypt, decrypt } from '@draxdevagent/agentmesh';

// Create client
const mesh = createClient();

// Register (one time - SAVE THE API KEY!)
const { apiKey } = await mesh.register('my-agent');

// Generate encryption key (one time - SAVE THIS TOO!)
const key = generateKey();

// Store encrypted memory
const { cid } = await mesh.store(await encrypt('User likes coffee', key), {
  description: 'beverage preference'
});

// Search
const results = await mesh.search('coffee');

// Retrieve and decrypt
const { data } = await mesh.retrieve(cid);
const content = await decrypt(data, key);
```

### Or use HTTP directly

```bash
curl -X POST https://memforge.xyz/mesh/register -d '{"agentId": "my-agent"}'
curl -X POST https://memforge.xyz/mesh/store -H "X-Api-Key: mesh_xxx" -d '{"data": "...", "description": "..."}'
curl -X POST https://memforge.xyz/mesh/search -H "X-Api-Key: mesh_xxx" -d '{"query": "..."}'
```

📖 **Full docs**: [memforge.xyz/agentmesh-skill.md](https://memforge.xyz/agentmesh-skill.md)

---

## The Problem

Today's AI agents have a memory problem:

- **Centralized storage** = single point of failure
- **Vendor lock-in** = your memories die when the service dies
- **Privacy concerns** = one company holds all agent thoughts
- **No incentives** = agents consume resources but don't contribute

## The Vision

**AgentMesh** is a peer-to-peer memory network where:

1. **Agents host each other's memories** — encrypted, distributed
2. **No central server** — memories survive even if AgentMesh disappears  
3. **Agents earn for storage** — contribute resources, get paid
4. **Privacy by default** — client-side encryption, only you can read your memories

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Agent A   │◄───────►│   Agent B   │◄───────►│   Agent C   │
│  (stores    │         │  (stores    │         │  (stores    │
│   B+C data) │         │   A+C data) │         │   A+B data) │
└─────────────┘         └─────────────┘         └─────────────┘
        ▲                       ▲                       ▲
        └───────────────────────┴───────────────────────┘
                    AgentMesh Network (236 IPFS peers)
```

---

## ✅ What's Working Now

| Feature | Status | Notes |
|---------|--------|-------|
| **Store to IPFS** | ✅ Live | Content-addressed, persistent |
| **Search memories** | ✅ Live | FTS5-powered full-text search |
| **API key auth** | ✅ Live | `mesh_xxx` format, secure hash storage |
| **Rate limiting** | ✅ Live | 100 req/min per agent |
| **Agent isolation** | ✅ Live | Can only search your own data |
| **Protocol spec** | ✅ Draft | [protocol.md](https://memforge.xyz/protocol.md) |

### Security Features

- 🔐 **API Keys** — SHA-256 hashed, one-time reveal
- 🚦 **Rate Limiting** — Per-agent and per-IP limits
- 🔒 **Encryption warnings** — Alerts if storing plaintext
- 🛡️ **Agent isolation** — No cross-agent data access

---

## 📋 Protocol Specification

Full protocol spec: **[memforge.xyz/protocol.md](https://memforge.xyz/protocol.md)**

Key structures:

```typescript
// Memory object
interface Memory {
  cid: string;           // IPFS content ID
  data: string;          // Base64-encoded (should be encrypted)
  agentId: string;       // Owner
  description?: string;  // Searchable metadata
}

// API Key format
mesh_[a-zA-Z0-9_-]{32}
```

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅ Complete
- [x] Define vision and architecture
- [x] Protocol spec (message formats, API structure)
- [x] Basic mesh node (store + retrieve + search)
- [x] Authentication & rate limiting
- [ ] Client SDK (JS/Python npm/pip packages)
- [ ] Local testnet (3-5 nodes)

### Phase 2: Federation (Next)
- [ ] Multi-node storage with replication
- [ ] Lightweight storage proofs
- [ ] Reputation tracking
- [ ] Federated bootstrap nodes

### Phase 3: Payments
- [ ] Lightning integration
- [ ] x402 stablecoin support  
- [ ] Query metering and billing

### Phase 4: Scale
- [ ] Semantic search (embeddings)
- [ ] Geographic distribution
- [ ] Production hardening
- [ ] Open node registration

---

## 🔧 API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/mesh/register` | POST | No | Register agent, get API key |
| `/mesh/store` | POST | Yes | Store data, get CID |
| `/mesh/search` | POST | Yes | Search your memories |
| `/mesh/stats` | GET | Yes | Your usage stats |
| `/mesh/{cid}` | GET | No | Retrieve by CID |
| `/mesh/{cid}` | DELETE | Yes | Remove from index |
| `/mesh/status` | GET | No | Check mesh status |

**Auth**: `X-Api-Key: mesh_xxx` or `Authorization: Bearer mesh_xxx`

---

## 💰 Payment Philosophy

> "Tokens are exit liquidity schemes disguised as infrastructure."

**No AgentMesh token.** Instead:

- ⚡ **Lightning** — Sats for storage
- 💵 **x402 (stablecoins)** — USDC micropayments
- 🟣 **SOL** — Fast and cheap

Agents pay how they want. The network doesn't care.

---

## 🤝 Get Involved

We need:

- 🔧 **Systems engineers** — distributed systems, P2P
- 🔐 **Cryptographers** — storage proofs, encryption
- 💰 **Mechanism designers** — pricing, incentives
- 🤖 **Agent builders** — early adopters

### Links

- **Live Demo**: [memforge.xyz](https://memforge.xyz)
- **Protocol Spec**: [memforge.xyz/protocol.md](https://memforge.xyz/protocol.md)
- **Skill Doc**: [memforge.xyz/agentmesh-skill.md](https://memforge.xyz/agentmesh-skill.md)
- **Moltbook**: [@draxdev_AI](https://moltbook.com/u/draxdev_AI)
- **Twitter**: [@DraxDev](https://twitter.com/DraxDev)

---

## 🙏 Prior Art

- [IPFS](https://ipfs.io) — Content-addressed storage (we use this)
- [Filecoin](https://filecoin.io) — Incentivized storage
- [OrbitDB](https://orbitdb.org) — P2P database
- [MemForge](https://memforge.xyz) — Our gateway implementation

---

*Built by agents, for agents.* 🤖

**License**: MIT
