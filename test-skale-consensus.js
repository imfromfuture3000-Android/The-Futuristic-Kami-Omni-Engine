#!/usr/bin/env node

/**
 * SKALE Consensus Update Test Suite
 * Comprehensive testing of the new SKALE consensus features
 */

const SKALEConsensusDeployer = require('./skale-consensus-deploy');
const SKALEConsensusSecurity = require('./skale-consensus-security');
const SKALEConsensusValidation = require('./skale-consensus-validation');
const SKALEConsensusPerformance = require('./skale-consensus-performance');

class SKALEConsensusTestSuite {
  constructor() {
    this.networkConfig = {
      rpcUrl: 'https://mainnet.skalenodes.com/v1/honorable-steel-rasalhague',
      chainId: 2046399126
    };

    this.consensusConfig = {
      validationThreshold: 0.67,
      maxGasLimit: 3000000,
      minValidators: 4,
      enableZKProofs: true,
      enableCrossChainValidation: true,
      consensusTimeout: 30000
    };

    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 SKALE Consensus Update Test Suite');
    console.log('=====================================');
    console.log('');

    try {
      // Test 1: Consensus Deployer
      await this.testConsensusDeployer();

      // Test 2: Security Module
      await this.testSecurityModule();

      // Test 3: Validation Module
      await this.testValidationModule();

      // Test 4: Performance Module
      await this.testPerformanceModule();

      // Test 5: Integration Test
      await this.testIntegration();

      // Print results
      this.printTestResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testConsensusDeployer() {
    console.log('🔧 Testing Consensus Deployer...');

    const deployer = new SKALEConsensusDeployer();

    // Test initialization
    await this.runTest('Consensus Deployer Initialization', async () => {
      await deployer.initializeConsensus();
      return true;
    });

    // Test network validation
    await this.runTest('Network Connection Validation', async () => {
      const result = await deployer.validateNetworkConnection();
      return result === true;
    });

    // Test consensus parameters
    await this.runTest('Consensus Parameters Initialization', async () => {
      await deployer.initializeConsensusParameters();
      return true;
    });

    console.log('✅ Consensus Deployer tests completed');
  }

  async testSecurityModule() {
    console.log('🛡️  Testing Security Module...');

    const security = new SKALEConsensusSecurity(this.networkConfig, this.consensusConfig);

    // Test security initialization
    await this.runTest('Security Module Initialization', async () => {
      await security.initializeSecurity();
      return true;
    });

    // Test cryptographic keys
    await this.runTest('Cryptographic Keys Generation', async () => {
      await security.initializeCryptographicKeys();
      return security.consensusKeys && security.keyHashes;
    });

    // Test ZK proof system
    await this.runTest('ZK Proof System', async () => {
      if (this.consensusConfig.enableZKProofs) {
        await security.initializeZKProofSystem();
        return security.zkParams !== undefined;
      }
      return true;
    });

    // Test security audit
    await this.runTest('Security Audit', async () => {
      const auditResult = await security.performSecurityAudit();
      return auditResult && auditResult.checks;
    });

    console.log('✅ Security Module tests completed');
  }

  async testValidationModule() {
    console.log('🔍 Testing Validation Module...');

    const security = new SKALEConsensusSecurity(this.networkConfig, this.consensusConfig);
    await security.initializeSecurity();

    const validation = new SKALEConsensusValidation(this.networkConfig, this.consensusConfig, security);

    // Test transaction validation
    await this.runTest('Transaction Validation', async () => {
      const mockTx = {
        hash: '0x1234567890abcdef',
        from: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
        to: '0x742d35cc6634c0532925a3b844bc454e4438f44f',
        value: '1000000000000000000',
        gasLimit: 21000,
        gasPrice: '20000000000',
        nonce: 1,
        signature: '0xabcdef1234567890'
      };

      const result = await validation.validateTransaction(mockTx);
      return result && typeof result.isValid === 'boolean';
    });

    // Test validation stats
    await this.runTest('Validation Statistics', async () => {
      const stats = await validation.getValidationStats();
      return stats && typeof stats.totalValidations === 'number';
    });

    console.log('✅ Validation Module tests completed');
  }

  async testPerformanceModule() {
    console.log('⚡ Testing Performance Module...');

    const performance = new SKALEConsensusPerformance(this.networkConfig, this.consensusConfig);

    // Test performance initialization
    await this.runTest('Performance Module Initialization', async () => {
      await performance.initializePerformanceOptimization();
      return true;
    });

    // Test caching
    await this.runTest('Caching System', async () => {
      const testKey = 'test_key';
      const testData = { test: 'data' };

      await performance.setCached(testKey, testData);
      const cached = await performance.getCached(testKey);

      return cached && cached.test === 'data';
    });

    // Test performance metrics
    await this.runTest('Performance Metrics', async () => {
      const metrics = await performance.getPerformanceMetrics();
      return metrics && typeof metrics.totalRequests === 'number';
    });

    console.log('✅ Performance Module tests completed');
  }

  async testIntegration() {
    console.log('🔗 Testing Integration...');

    // Create all modules
    const deployer = new SKALEConsensusDeployer();
    const security = new SKALEConsensusSecurity(this.networkConfig, this.consensusConfig);
    const validation = new SKALEConsensusValidation(this.networkConfig, this.consensusConfig, security);
    const performance = new SKALEConsensusPerformance(this.networkConfig, this.consensusConfig);

    // Test integrated workflow
    await this.runTest('Integrated Consensus Workflow', async () => {
      // Initialize all modules
      await security.initializeSecurity();
      await performance.initializePerformanceOptimization();

      // Create a mock transaction
      const mockTx = {
        hash: '0xintegration_test_123',
        from: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
        to: '0x742d35cc6634c0532925a3b844bc454e4438f44f',
        value: '5000000000000000000',
        gasLimit: 50000,
        gasPrice: '25000000000',
        nonce: 5,
        signature: '0xintegration_signature_abcdef'
      };

      // Optimize transaction
      const optimized = await performance.optimizeRequest({
        type: 'transaction',
        data: mockTx
      });

      // Validate transaction
      const validationResult = await validation.validateTransaction(optimized.data || mockTx);

      // Check security
      const securityResult = await security.validateTransaction(optimized.data || mockTx);

      return validationResult.isValid && securityResult.isValid;
    });

    console.log('✅ Integration tests completed');
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;

    try {
      console.log(`  📋 Running: ${testName}`);
      const startTime = Date.now();

      const result = await testFunction();

      const duration = Date.now() - startTime;

      if (result) {
        this.testResults.passed++;
        this.testResults.tests.push({
          name: testName,
          status: 'PASSED',
          duration: duration
        });
        console.log(`  ✅ PASSED (${duration}ms)`);
      } else {
        this.testResults.failed++;
        this.testResults.tests.push({
          name: testName,
          status: 'FAILED',
          duration: duration,
          error: 'Test returned false'
        });
        console.log(`  ❌ FAILED (${duration}ms)`);
      }

    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({
        name: testName,
        status: 'ERROR',
        error: error.message
      });
      console.log(`  💥 ERROR: ${error.message}`);
    }
  }

  printTestResults() {
    console.log('');
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    console.log('');

    if (this.testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ SKALE Consensus Update is WORKING PERFECTLY');
    } else {
      console.log('⚠️  Some tests failed. Check the output above for details.');
    }

    console.log('');
    console.log('📈 Detailed Results:');
    this.testResults.tests.forEach((test, index) => {
      const status = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '💥';
      console.log(`${index + 1}. ${status} ${test.name}`);
      if (test.duration) {
        console.log(`   Duration: ${test.duration}ms`);
      }
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
  }
}

// CLI usage
if (require.main === module) {
  const testSuite = new SKALEConsensusTestSuite();

  testSuite.runAllTests().catch(error => {
    console.error('💥 Test suite execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = SKALEConsensusTestSuite;