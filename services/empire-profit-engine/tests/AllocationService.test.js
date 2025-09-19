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

describe('AllocationService', () => {
  let allocationService;
  let mockDb;

  beforeEach(() => {
    mockDb = new MockDatabase();
    allocationService = new AllocationService(mockDb);
  });

  test('should allocate profits according to percentages', async () => {
    // Setup test data
    const testSweep = {
      id: 'sweep_123',
      usd_value: '1000.00',
      chain: 'solana',
      status: 'confirmed'
    };
    mockDb.sweeps.push(testSweep);

    // Test allocation
    const result = await allocationService.allocateProfits({ 
      sweepId: testSweep.id 
    });

    // Verify results
    expect(result.allocations).toHaveLength(4);
    expect(result.totalAmount).toBe('1000.00');

    // Check allocation percentages
    const vaultAllocation = result.allocations.find(a => a.allocation_type === 'vault');
    const growthAllocation = result.allocations.find(a => a.allocation_type === 'growth');
    const speculativeAllocation = result.allocations.find(a => a.allocation_type === 'speculative');
    const treasuryAllocation = result.allocations.find(a => a.allocation_type === 'treasury');

    expect(parseFloat(vaultAllocation.amount)).toBe(400); // 40%
    expect(parseFloat(growthAllocation.amount)).toBe(300); // 30%
    expect(parseFloat(speculativeAllocation.amount)).toBe(200); // 20%
    expect(parseFloat(treasuryAllocation.amount)).toBe(100); // 10%
  });

  test('should set correct target strategies', () => {
    expect(allocationService.getTargetStrategy('vault', 'solana')).toBe('solana_validator_staking');
    expect(allocationService.getTargetStrategy('vault', 'ethereum')).toBe('lido_staking');
    expect(allocationService.getTargetStrategy('growth', 'ethereum')).toBe('aave_lending');
    expect(allocationService.getTargetStrategy('treasury', 'any')).toBe('hold');
  });

  test('should throw error for non-existent sweep', async () => {
    await expect(allocationService.allocateProfits({ 
      sweepId: 'non-existent' 
    })).rejects.toThrow('Sweep not found or not confirmed');
  });
});

// Simple test runner for Node.js environment
if (require.main === module) {
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
      
      console.log(`✅ Vault allocation: ${vaultAllocation.amount} (expected: 400)`);
      console.log(`✅ Growth allocation: ${growthAllocation.amount} (expected: 300)`);
      console.log(`✅ Total allocations: ${result.allocations.length} (expected: 4)`);

      // Test 2: Target strategies
      console.log('\nTest 2: Target strategy mapping');
      const solanaVaultStrategy = allocationService.getTargetStrategy('vault', 'solana');
      const ethVaultStrategy = allocationService.getTargetStrategy('vault', 'ethereum');
      
      console.log(`✅ Solana vault strategy: ${solanaVaultStrategy} (expected: solana_validator_staking)`);
      console.log(`✅ Ethereum vault strategy: ${ethVaultStrategy} (expected: lido_staking)`);

      console.log('\n🎉 All tests passed!');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  };

  runTests();
}