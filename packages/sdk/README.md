# AgentMesh SDK

Decentralized memory storage for AI agents.

```bash
npm install agentmesh
```

## Quick Start

```typescript
import { createClient, generateKey, encrypt, decrypt } from 'agentmesh';

// 1. Create client
const mesh = createClient();

// 2. Register your agent (one time - SAVE THE API KEY!)
const { apiKey } = await mesh.register('my-agent-id');
console.log('API Key:', apiKey); // Save this!

// 3. Generate encryption key (one time - SAVE THIS TOO!)
const encryptionKey = generateKey();
console.log('Encryption Key:', encryptionKey); // Save this!

// 4. Store encrypted memory
const encrypted = await encrypt('User prefers dark mode', encryptionKey);
const { cid } = await mesh.store(encrypted, {
  description: 'user display preferences'
});
console.log('Stored at:', cid);

// 5. Search memories
const results = await mesh.search('preferences');
console.log('Found:', results.count, 'memories');

// 6. Retrieve and decrypt
const { data } = await mesh.retrieve(cid);
const decrypted = await decrypt(data, encryptionKey);
console.log('Content:', decrypted);
```

## With Existing API Key

```typescript
import { createClient } from 'agentmesh';

const mesh = createClient({ 
  apiKey: 'mesh_xxx' 
});

// Ready to use
const results = await mesh.search('preferences');
```

## API Reference

### Client Methods

```typescript
// Registration (returns API key once)
await mesh.register('agent-id');

// Store (data should be base64-encoded, preferably encrypted)
await mesh.store(base64Data, { 
  description: 'searchable text',
  type: 'preference',
  tags: ['user', 'settings']
});

// Store string (auto base64 - WARNING: plaintext!)
await mesh.storeString('plain text', { description: '...' });

// Search
await mesh.search('query');
await mesh.search('query', { type: 'preference', limit: 10 });

// List all (no query)
await mesh.list({ limit: 50 });

// Retrieve by CID
await mesh.retrieve('Qm...');
await mesh.retrieveString('Qm...'); // Auto decode base64

// Delete from index
await mesh.delete('Qm...');

// Stats
await mesh.stats();

// Status
await mesh.status();
await mesh.isOnline();
```

### Encryption

```typescript
import { generateKey, deriveKey, encrypt, decrypt } from 'agentmesh';

// Generate random key
const key = generateKey();

// Or derive from passphrase
const key = await deriveKey('my-secret-passphrase');

// Encrypt/decrypt
const encrypted = await encrypt('sensitive data', key);
const decrypted = await decrypt(encrypted, key);
```

## Error Handling

```typescript
import { AgentMeshError } from 'agentmesh';

try {
  await mesh.store(data);
} catch (error) {
  if (error instanceof AgentMeshError) {
    console.log('Status:', error.statusCode);
    console.log('Message:', error.message);
  }
}
```

## Configuration

```typescript
const mesh = createClient({
  apiKey: 'mesh_xxx',           // Your API key
  gateway: 'https://memforge.xyz', // Gateway URL (default)
  timeout: 30000,               // Request timeout ms (default)
});
```

## Security Notes

- **Always encrypt** sensitive data before storing
- **Save your keys** - we can't recover them
- **CIDs are public** - anyone with the CID can retrieve (encrypted) data
- **Descriptions are searchable** - don't put secrets there

## Links

- **Docs**: https://memforge.xyz/agentmesh-skill.md
- **Protocol**: https://memforge.xyz/protocol.md
- **GitHub**: https://github.com/draxdevAgent/agentmesh

## License

MIT
