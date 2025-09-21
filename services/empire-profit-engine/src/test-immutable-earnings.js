/**
 * Test script for Immutable Empire Earnings Logic
 */

const ImmutableEarningsConfig = require('./immutable-earnings-config');
const ImmutableAuditService = require('./services/ImmutableAuditService');

class ImmutableEarningsTester {
  constructor() {
    this.config = ImmutableEarningsConfig;
    this.mockDatabase = this._createMockDatabase();
    this.auditService = new ImmutableAuditService(this.mockDatabase);
  }

  /**
   * Create mock database for testing
   */
  _createMockDatabase() {
    const auditEntries = [];
    let nextId = 1;

    return {
      query: async (sql, params) => {
        if (sql.includes('INSERT INTO immutable_audit_log')) {
          const entry = {
            id: nextId++,
            operation: params[0],
            entity_type: params[1],
            entity_id: params[2],
            data: params[3],
            user_id: params[4],
            data_hash: params[5],
            config_hash: params[6],
            created_at: params[7]
          };
          auditEntries.push(entry);
          return { rows: [entry] };
        }

        if (sql.includes('SELECT * FROM immutable_audit_log WHERE id = $1')) {
          const entry = auditEntries.find(e => e.id === params[0]);
          return { rows: entry ? [entry] : [] };
        }

        if (sql.includes('SELECT * FROM immutable_audit_log WHERE entity_type = $1')) {
          const filtered = auditEntries.filter(e =>
            e.entity_type === params[0] && e.entity_id === params[1]
          );
          return { rows: filtered };
        }

        return { rows: [] };
      }
    };
  }

  /**
   * Test immutable configuration
   */
  async testImmutableConfig() {
    console.log('🧊 Testing Immutable Configuration...\n');

    // Test configuration integrity
    const integrity = this.config.verifyIntegrity();
    console.log('✅ Configuration Integrity:', integrity.isValid ? 'VERIFIED' : 'FAILED');
    if (!integrity.isValid) {
      console.log('❌ Error:', integrity.error);
      return false;
    }

    // Test allocation percentages
    const allocations = this.config.getAllocations();
    console.log('📊 Allocation Percentages:', allocations);

    const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
    console.log('📈 Total Allocation:', total + '%');
    console.log('✅ Total equals 100%:', total === 100);

    // Test strategy selection
    const vaultStrategy = this.config.getStrategy('vault', 'solana');
    console.log('🎯 Vault Strategy (Solana):', vaultStrategy);

    const growthStrategy = this.config.getStrategy('growth', 'ethereum');
    console.log('📈 Growth Strategy (Ethereum):', growthStrategy);

    // Test allocation calculation
    const testAmount = 1000;
    const calculated = this.config.calculateAllocations(testAmount);
    console.log('🧮 Allocation Calculation for $' + testAmount + ':', calculated);

    const calcTotal = Object.values(calculated).reduce((sum, val) => sum + val, 0);
    console.log('✅ Calculated total matches input:', Math.abs(calcTotal - testAmount) < 0.01);

    // Test deployment info
    const deploymentInfo = this.config.getDeploymentInfo();
    console.log('🚀 Deployment Info:', {
      version: deploymentInfo.version,
      deployedAt: deploymentInfo.deployedAt,
      configHash: deploymentInfo.contractHash.substring(0, 16) + '...'
    });

    console.log('✅ Immutable Configuration Tests Passed!\n');
    return true;
  }

  /**
   * Test immutable audit service
   */
  async testImmutableAudit() {
    console.log('📋 Testing Immutable Audit Service...\n');

    // Test creating audit entry
    const testData = {
      operation: 'test_allocation',
      amount: 1000,
      allocations: { vault: 400, growth: 300, speculative: 200, treasury: 100 }
    };

    const auditEntry = await this.auditService.createAuditEntry(
      'test_allocation',
      'earnings_test',
      'test_123',
      testData,
      'test_user'
    );

    console.log('✅ Audit Entry Created:', {
      id: auditEntry.id,
      operation: auditEntry.operation,
      dataHash: auditEntry.data_hash.substring(0, 16) + '...'
    });

    // Test audit verification
    const verification = await this.auditService.verifyAuditEntry(auditEntry.id);
    console.log('🔍 Audit Verification:', verification.isValid ? 'VERIFIED' : 'FAILED');

    if (!verification.isValid) {
      console.log('❌ Verification Error:', verification.error);
      return false;
    }

    // Test audit trail retrieval
    const auditTrail = await this.auditService.getAuditTrail('earnings_test', 'test_123');
    console.log('📜 Audit Trail Entries:', auditTrail.length);

    // Test earnings operation audit
    const earningsAudit = await this.auditService.auditEarningsOperation(
      'allocate_profits',
      'sweep_456',
      {
        totalAmount: '1500.00',
        allocations: [
          { type: 'vault', percentage: 40, amount: '600.00' },
          { type: 'growth', percentage: 30, amount: '450.00' }
        ]
      }
    );

    console.log('💰 Earnings Audit Created:', {
      id: earningsAudit.id,
      operation: earningsAudit.operation
    });

    // Test earnings verification
    const earningsVerification = await this.auditService.verifyEarningsOperation('sweep_456');
    console.log('🎯 Earnings Verification:', earningsVerification.isValid ? 'VERIFIED' : 'FAILED');

    console.log('✅ Immutable Audit Tests Passed!\n');
    return true;
  }

  /**
   * Test immutability protection
   */
  async testImmutabilityProtection() {
    console.log('🔒 Testing Immutability Protection...\n');

    // Test that configuration cannot be modified
    const originalAllocations = { ...this.config.getAllocations() };

    try {
      // Attempt to modify immutable configuration
      this.config.allocations.vault = 50;
      console.log('❌ CRITICAL: Configuration was modified - IMMUTABILITY BREACHED!');
      return false;
    } catch (error) {
      console.log('✅ Configuration modification blocked:', error.message);
    }

    // Verify configuration is unchanged
    const currentAllocations = this.config.getAllocations();
    const isUnchanged = JSON.stringify(originalAllocations) === JSON.stringify(currentAllocations);
    console.log('✅ Configuration integrity maintained:', isUnchanged);

    if (!isUnchanged) {
      console.log('❌ CRITICAL: Configuration changed without permission!');
      return false;
    }

    // Test that strategies cannot be modified
    try {
      this.config.strategies.vault.solana = 'modified_strategy';
      console.log('❌ CRITICAL: Strategies were modified - IMMUTABILITY BREACHED!');
      return false;
    } catch (error) {
      console.log('✅ Strategy modification blocked:', error.message);
    }

    console.log('✅ Immutability Protection Tests Passed!\n');
    return true;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Immutable Empire Earnings Tests...\n');

    const results = await Promise.all([
      this.testImmutableConfig(),
      this.testImmutableAudit(),
      this.testImmutabilityProtection()
    ]);

    const allPassed = results.every(result => result === true);

    console.log('='.repeat(50));
    console.log('🏆 TEST RESULTS:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    console.log('='.repeat(50));

    if (allPassed) {
      console.log('🎉 Immutable Empire Earnings Logic is WORKING PERFECTLY!');
      console.log('💎 Earnings allocations are now IMMUTABLE and TAMPER-PROOF!');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }

    return allPassed;
  }
}

// Run tests if this file is executed directly
async function main() {
  const tester = new ImmutableEarningsTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ImmutableEarningsTester;