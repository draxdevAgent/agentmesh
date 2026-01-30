/**
 * AgentMesh POC - Basic Store/Retrieve Example
 * 
 * Prerequisites:
 * - IPFS daemon running: ipfs daemon
 * - SDK built: cd packages/sdk && npm install && npm run build
 * 
 * Run: npx tsx examples/basic-store-retrieve.ts
 */

import { AgentMesh } from '../packages/sdk/src/index.js';

async function main() {
  console.log('🔗 AgentMesh POC - Basic Store/Retrieve\n');

  // Initialize mesh with encryption key
  const mesh = new AgentMesh({
    encryptionKey: 'demo-secret-key-change-in-production',
    ipfs: {
      apiUrl: 'http://127.0.0.1:5001',
    },
  });

  // Check connection
  console.log('📡 Checking IPFS connection...');
  const available = await mesh.isAvailable();
  if (!available) {
    console.error('❌ IPFS node not available. Run: ipfs daemon');
    process.exit(1);
  }

  const nodeInfo = await mesh.nodeInfo();
  console.log(`✅ Connected to IPFS node: ${nodeInfo.peerId.slice(0, 16)}...`);
  console.log(`   Version: ${nodeInfo.version}\n`);

  // Create a test memory
  const memory = {
    type: 'preference',
    content: 'User prefers dark mode and concise responses',
    timestamp: Date.now(),
    metadata: {
      source: 'conversation',
      confidence: 0.95,
    },
  };

  console.log('💾 Storing encrypted memory...');
  console.log(`   Type: ${memory.type}`);
  console.log(`   Content: "${memory.content}"`);

  const { cid, size } = await mesh.store(memory);
  console.log(`\n✅ Stored successfully!`);
  console.log(`   CID: ${cid}`);
  console.log(`   Encrypted size: ${size} bytes\n`);

  // Retrieve and decrypt
  console.log('📥 Retrieving and decrypting...');
  const retrieved = await mesh.retrieve(cid);

  console.log(`\n✅ Retrieved successfully!`);
  console.log(`   Type: ${retrieved.type}`);
  console.log(`   Content: "${retrieved.content}"`);
  console.log(`   Timestamp: ${new Date(retrieved.timestamp).toISOString()}`);
  if (retrieved.metadata) {
    console.log(`   Metadata: ${JSON.stringify(retrieved.metadata)}`);
  }

  // Verify integrity
  const match = JSON.stringify(memory) === JSON.stringify(retrieved);
  console.log(`\n${match ? '✅' : '❌'} Integrity check: ${match ? 'PASSED' : 'FAILED'}`);

  // Demo batch operations
  console.log('\n📦 Testing batch operations...');
  const memories = [
    { type: 'fact', content: 'User lives in Paris', timestamp: Date.now() },
    { type: 'task', content: 'Follow up on project proposal', timestamp: Date.now() },
    { type: 'context', content: 'Currently working on AgentMesh POC', timestamp: Date.now() },
  ];

  const results = await mesh.storeBatch(memories);
  console.log(`   Stored ${results.length} memories:`);
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${memories[i].type}: ${r.cid.slice(0, 20)}... (${r.size} bytes)`);
  });

  // Retrieve all
  const retrievedBatch = await mesh.retrieveBatch(results.map(r => r.cid));
  console.log(`\n✅ Retrieved ${retrievedBatch.length} memories successfully!`);

  console.log('\n🎉 POC Complete! The mesh is working.\n');
  console.log('Next steps:');
  console.log('  - Add peer discovery');
  console.log('  - Implement payment channels');
  console.log('  - Build reputation system');
}

main().catch(console.error);
