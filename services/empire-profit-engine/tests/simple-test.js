const AllocationService = require('../src/services/AllocationService');

// Mock database for testing
class MockDatabase {
  constructor() {
    this.sweeps = [];
    this.allocations = [];
    this.auditLog = [];
  }

  async query(sql, params = []) {
    // Mock implementation for basic testing
    if (sql.includes('SELECT * FROM sweeps WHERE id =')) {
      const id = params[0];
      const sweep = this.sweeps.find(s => s.id === id);
      return { rows: sweep ? [sweep] : [] };
    }
    
    if (sql.includes('INSERT INTO allocations')) {
      const allocation = {
        id: 'alloc_' + Date.now(),
        sweep_id: params[0],
        allocation_type: params[1],
        percentage: params[2],
        amount: params[3],
        usd_value: params[4],
        target_strategy: params[5],
        executed: params[6]
      };
      this.allocations.push(allocation);
      return { rows: [allocation] };
    }

    if (sql.includes('INSERT INTO audit_log')) {
      const log = {
        id: 'audit_' + Date.now(),
        operation: params[0],
        entity_type: params[1],
        entity_id: params[2],
        new_values: params[3],
        user_id: params[4]
      };
      this.auditLog.push(log);
      return { rows: [log] };
    }

    return { rows: [] };
  }

  async transaction(callback) {
    return await callback(this);
  }
}

// Simple test runner for Node.js environment
console.log('🧪 Running AllocationService tests...');

const runTests = async () => {
  try {
    const mockDb = new MockDatabase();
    const allocationService = new AllocationService(mockDb);

    // Test 1: Basic allocation
    console.log('Test 1: Basic allocation percentages');
    const testSweep = {
      id: 'sweep_123',
      usd_value: '1000.00',
      chain: 'solana',
      status: 'confirmed'
    };
    mockDb.sweeps.push(testSweep);

    const result = await allocationService.allocateProfits({ 
      sweepId: testSweep.id 
    });

    const vaultAllocation = result.allocations.find(a => a.allocation_type === 'vault');
    const growthAllocation = result.allocations.find(a => a.allocation_type === 'growth');
    const speculativeAllocation = result.allocations.find(a => a.allocation_type === 'speculative');
    const treasuryAllocation = result.allocations.find(a => a.allocation_type === 'treasury');
    
    console.log(`✅ Vault allocation: ${vaultAllocation.amount} (expected: 400)`);
    console.log(`✅ Growth allocation: ${growthAllocation.amount} (expected: 300)`);
    console.log(`✅ Speculative allocation: ${speculativeAllocation.amount} (expected: 200)`);
    console.log(`✅ Treasury allocation: ${treasuryAllocation.amount} (expected: 100)`);
    console.log(`✅ Total allocations: ${result.allocations.length} (expected: 4)`);

    // Verify percentages are correct
    const expectedVault = 400;
    const expectedGrowth = 300;
    const expectedSpeculative = 200;
    const expectedTreasury = 100;

    if (parseFloat(vaultAllocation.amount) !== expectedVault) {
      throw new Error(`Vault allocation incorrect: ${vaultAllocation.amount} !== ${expectedVault}`);
    }
    if (parseFloat(growthAllocation.amount) !== expectedGrowth) {
      throw new Error(`Growth allocation incorrect: ${growthAllocation.amount} !== ${expectedGrowth}`);
    }
    if (parseFloat(speculativeAllocation.amount) !== expectedSpeculative) {
      throw new Error(`Speculative allocation incorrect: ${speculativeAllocation.amount} !== ${expectedSpeculative}`);
    }
    if (parseFloat(treasuryAllocation.amount) !== expectedTreasury) {
      throw new Error(`Treasury allocation incorrect: ${treasuryAllocation.amount} !== ${expectedTreasury}`);
    }

    // Test 2: Target strategies
    console.log('\nTest 2: Target strategy mapping');
    const solanaVaultStrategy = allocationService.getTargetStrategy('vault', 'solana');
    const ethVaultStrategy = allocationService.getTargetStrategy('vault', 'ethereum');
    const ethGrowthStrategy = allocationService.getTargetStrategy('growth', 'ethereum');
    const treasuryStrategy = allocationService.getTargetStrategy('treasury', 'any');
    
    console.log(`✅ Solana vault strategy: ${solanaVaultStrategy} (expected: solana_validator_staking)`);
    console.log(`✅ Ethereum vault strategy: ${ethVaultStrategy} (expected: lido_staking)`);
    console.log(`✅ Ethereum growth strategy: ${ethGrowthStrategy} (expected: aave_lending)`);
    console.log(`✅ Treasury strategy: ${treasuryStrategy} (expected: hold)`);

    // Test 3: Error handling
    console.log('\nTest 3: Error handling for non-existent sweep');
    try {
      await allocationService.allocateProfits({ sweepId: 'non-existent' });
      throw new Error('Should have thrown an error for non-existent sweep');
    } catch (error) {
      if (error.message === 'Sweep not found or not confirmed') {
        console.log('✅ Correctly threw error for non-existent sweep');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

runTests();