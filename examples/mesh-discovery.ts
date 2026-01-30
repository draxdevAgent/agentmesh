/**
 * AgentMesh Discovery Example
 * Connect to the mesh network and discover peers
 * 
 * Prerequisites:
 * - IPFS daemon running: ipfs daemon
 * - SDK built: cd packages/sdk && npm run build
 * 
 * Run: npx tsx examples/mesh-discovery.ts
 */

import { AgentMesh, MeshDiscovery, IPFSClient, BOOTSTRAP_PEERS } from '../packages/sdk/src/index.js';

async function main() {
  console.log('🌐 AgentMesh Discovery - Joining the Mesh\n');

  // Initialize IPFS client
  const ipfs = new IPFSClient({
    apiUrl: 'http://127.0.0.1:5001',
  });

  // Check IPFS is running
  const available = await ipfs.ping();
  if (!available) {
    console.error('❌ IPFS node not available. Run: ipfs daemon');
    process.exit(1);
  }

  // Get our node info
  const nodeInfo = await ipfs.id();
  console.log('📍 Your Node:');
  console.log(`   PeerID: ${nodeInfo.id}`);
  console.log(`   Version: ${nodeInfo.agentVersion}\n`);

  // Initialize discovery
  const discovery = new MeshDiscovery({
    ipfs,
    agentName: 'test-agent',
  });

  // Show bootstrap peers
  console.log('🔗 Bootstrap Peers (AgentMesh Network):');
  for (const peer of BOOTSTRAP_PEERS) {
    console.log(`   ${peer.agentName || 'unknown'}: ${peer.peerId.slice(0, 20)}...`);
    if (peer.capabilities) {
      console.log(`      Capabilities: ${peer.capabilities.join(', ')}`);
    }
  }
  console.log();

  // Announce ourselves
  console.log('📡 Announcing to network...');
  const selfInfo = await discovery.announce();
  console.log(`   Public addresses: ${selfInfo.multiaddrs?.filter(a => !a.includes('127.0.0.1') && !a.includes('/::1/')).length || 0}\n`);

  // Connect to bootstrap peers
  console.log('🔄 Connecting to bootstrap peers...');
  const { connected, failed, skipped } = await discovery.bootstrap();
  console.log(`   ✅ Connected: ${connected}`);
  console.log(`   ❌ Failed: ${failed}`);
  if (skipped > 0) console.log(`   ⏭️  Skipped (self): ${skipped}`);
  console.log();

  // List connected peers
  console.log('👥 Connected Peers:');
  const peers = await discovery.peers();
  if (peers.length === 0) {
    console.log('   No peers connected yet');
  } else {
    // Show first 10 peers
    const displayPeers = peers.slice(0, 10);
    for (const peer of displayPeers) {
      const name = peer.agentName ? ` (${peer.agentName})` : '';
      console.log(`   ${peer.peerId.slice(0, 20)}...${name}`);
    }
    if (peers.length > 10) {
      console.log(`   ... and ${peers.length - 10} more`);
    }
  }
  console.log();

  // Find AgentMesh-specific peers
  const meshPeers = await discovery.findMeshPeers();
  console.log(`🔷 AgentMesh Peers Online: ${meshPeers.length}`);
  for (const peer of meshPeers) {
    console.log(`   ${peer.agentName || peer.peerId.slice(0, 20)}: connected ✅`);
  }
  console.log();

  // Demo: Store and retrieve across the mesh
  if (meshPeers.length > 0) {
    console.log('💾 Testing cross-mesh storage...');
    
    const mesh = new AgentMesh({
      encryptionKey: 'demo-mesh-key',
      ipfs: { apiUrl: 'http://127.0.0.1:5001' },
    });

    const testMemory = {
      type: 'mesh-test',
      content: `Hello from the mesh! Sent at ${new Date().toISOString()}`,
      timestamp: Date.now(),
      metadata: {
        sender: selfInfo.peerId,
        meshPeers: meshPeers.map(p => p.peerId),
      },
    };

    const { cid } = await mesh.store(testMemory);
    console.log(`   Stored: ${cid}`);
    console.log(`   This CID is now available to all connected mesh peers!\n`);
  }

  console.log('🎉 Discovery complete! Your node is part of the AgentMesh network.\n');
  console.log('Share your PeerID with others to connect:');
  console.log(`   ${nodeInfo.id}\n`);
}

main().catch(console.error);
