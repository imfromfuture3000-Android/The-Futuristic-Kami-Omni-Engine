/**
 * Test script for Gene System functionality
 */

const GeneSystem = require('./gene-system');

async function testGeneSystem() {
  console.log('🧬 Testing Gene System...\n');

  const geneSystem = new GeneSystem();

  // Test current gene
  console.log('Current Gene:', geneSystem.getCurrentGene());

  // Test gene switching
  console.log('\n🔄 Testing Gene Switching:');
  try {
    const result = geneSystem.switchGene('pioneer-cryptodevs');
    console.log('Switched to:', result.activeGene);
    console.log('Response:', geneSystem.getContextualResponse('test'));
  } catch (error) {
    console.error('Switch failed:', error.message);
  }

  // Test another switch
  try {
    const result = geneSystem.switchGene('azure-gene');
    console.log('Switched to:', result.activeGene);
    console.log('Response:', geneSystem.getContextualResponse('test'));
  } catch (error) {
    console.error('Switch failed:', error.message);
  }

  // Test invalid gene
  try {
    geneSystem.switchGene('invalid-gene');
  } catch (error) {
    console.log('Expected error for invalid gene:', error.message);
  }

  // Test action logging
  console.log('\n📝 Testing Action Logging:');
  geneSystem.logAction('test_action', { test: 'data' });
  geneSystem.logAction('another_action', { more: 'data' });

  console.log('Recent actions:', geneSystem.getRecentActions(3));

  // Test redundancy detection
  console.log('\n⚠️ Testing Redundancy Detection:');
  geneSystem.logAction('test_action', { test: 'data' });
  geneSystem.logAction('test_action', { test: 'data' });
  geneSystem.logAction('test_action', { test: 'data' });

  const redundancy = geneSystem.detectRedundancy('test_action', { test: 'data' });
  console.log('Redundancy detected:', redundancy);

  // Test suggestions
  console.log('\n💡 Testing Suggestions:');
  console.log('Suggestions:', geneSystem.suggestNextActions());

  // Test self-awareness
  console.log('\n🧠 Testing Self-Awareness:');
  console.log('Self-awareness:', JSON.stringify(geneSystem.getSelfAwareness(), null, 2));

  console.log('\n✅ Gene System tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGeneSystem();
}

module.exports = testGeneSystem;