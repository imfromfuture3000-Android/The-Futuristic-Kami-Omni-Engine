/**
 * Immutable Empire Earnings Configuration
 * Ensures allocation percentages and earnings logic cannot be modified after initialization
 */

// Simple console logger for testing (fallback if winston not available)
let logger;
try {
  const { logger: winstonLogger } = require('./utils/logger');
  logger = winstonLogger;
} catch (error) {
  logger = {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : ''),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : ''),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '')
  };
}

class ImmutableEarningsConfig {
  constructor() {
    // ========== IMMUTABLE ALLOCATION PERCENTAGES ==========
    // These values are frozen and cannot be changed after initialization
    Object.defineProperty(this, 'allocations', {
      value: Object.freeze({
        vault: 40,      // 40% to Vault
        growth: 30,     // 30% to Growth
        speculative: 20, // 20% to Speculative
        treasury: 10    // 10% to Treasury
      }),
      writable: false,
      configurable: false,
      enumerable: true
    });

    // ========== IMMUTABLE STRATEGY MAPPINGS ==========
    Object.defineProperty(this, 'strategies', {
      value: Object.freeze({
        vault: Object.freeze({
          solana: 'solana_validator_staking',
          ethereum: 'lido_staking',
          default: 'staking'
        }),
        growth: Object.freeze({
          ethereum: 'aave_lending',
          solana: 'compound_lending',
          default: 'lending'
        }),
        speculative: Object.freeze({
          default: 'yield_farming'
        }),
        treasury: Object.freeze({
          default: 'hold'
        })
      }),
      writable: false,
      configurable: false,
      enumerable: true
    });

    // ========== IMMUTABLE VALIDATION RULES ==========
    Object.defineProperty(this, 'validationRules', {
      value: Object.freeze({
        totalAllocation: 100,
        minAllocation: 0,
        maxAllocation: 100,
        requiredAllocations: ['vault', 'growth', 'speculative', 'treasury']
      }),
      writable: false,
      configurable: false,
      enumerable: true
    });

    // ========== IMMUTABLE AUDIT CONFIG ==========
    Object.defineProperty(this, 'auditConfig', {
      value: Object.freeze({
        enableAuditTrail: true,
        immutableOperations: [
          'allocation_calculation',
          'strategy_selection',
          'earnings_distribution'
        ],
        hashAlgorithm: 'sha256'
      }),
      writable: false,
      configurable: false,
      enumerable: true
    });

    // ========== DEPLOYMENT TIMESTAMP (IMMUTABLE) ==========
    Object.defineProperty(this, 'deploymentInfo', {
      value: Object.freeze({
        deployedAt: new Date().toISOString(),
        version: '1.0.0-immutable',
        contractHash: this._calculateConfigHash()
      }),
      writable: false,
      configurable: false,
      enumerable: true
    });

    // Validate configuration integrity
    this._validateConfiguration();

    logger.info('Immutable Earnings Configuration initialized', {
      version: this.deploymentInfo.version,
      deployedAt: this.deploymentInfo.deployedAt,
      configHash: this.deploymentInfo.contractHash
    });
  }

  /**
   * Calculate configuration hash for integrity verification
   */
  _calculateConfigHash() {
    const crypto = require('crypto');
    const configString = JSON.stringify({
      allocations: this.allocations,
      strategies: this.strategies,
      validationRules: this.validationRules,
      auditConfig: this.auditConfig
    });
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Validate configuration integrity
   */
  _validateConfiguration() {
    // Validate total allocation equals 100%
    const total = Object.values(this.allocations).reduce((sum, val) => sum + val, 0);
    if (total !== this.validationRules.totalAllocation) {
      throw new Error(`Invalid total allocation: ${total}%. Must equal ${this.validationRules.totalAllocation}%`);
    }

    // Validate all required allocations exist
    for (const required of this.validationRules.requiredAllocations) {
      if (!(required in this.allocations)) {
        throw new Error(`Missing required allocation: ${required}`);
      }
    }

    // Validate allocation ranges
    for (const [type, percentage] of Object.entries(this.allocations)) {
      if (percentage < this.validationRules.minAllocation || percentage > this.validationRules.maxAllocation) {
        throw new Error(`Invalid allocation percentage for ${type}: ${percentage}%`);
      }
    }

    logger.info('Configuration validation passed');
  }

  /**
   * Get allocation percentages (immutable)
   */
  getAllocations() {
    return { ...this.allocations };
  }

  /**
   * Get strategy for allocation type and chain (immutable)
   */
  getStrategy(allocationType, chain = 'default') {
    const typeStrategies = this.strategies[allocationType];
    if (!typeStrategies) {
      throw new Error(`Unknown allocation type: ${allocationType}`);
    }

    // Try chain-specific strategy first, then default
    return typeStrategies[chain] || typeStrategies.default;
  }

  /**
   * Calculate allocation amounts (immutable logic)
   */
  calculateAllocations(totalAmount) {
    if (typeof totalAmount !== 'number' || totalAmount < 0) {
      throw new Error('Invalid total amount for allocation calculation');
    }

    const allocations = {};
    let totalCalculated = 0;

    for (const [type, percentage] of Object.entries(this.allocations)) {
      const amount = (totalAmount * percentage) / this.validationRules.totalAllocation;
      allocations[type] = Math.floor(amount * 100) / 100; // Round to 2 decimal places
      totalCalculated += allocations[type];
    }

    // Handle precision loss by adding remainder to treasury
    const remainder = totalAmount - totalCalculated;
    if (remainder > 0) {
      allocations.treasury += remainder;
    }

    return allocations;
  }

  /**
   * Verify configuration integrity
   */
  verifyIntegrity() {
    try {
      this._validateConfiguration();
      const currentHash = this._calculateConfigHash();
      const storedHash = this.deploymentInfo.contractHash;

      if (currentHash !== storedHash) {
        throw new Error('Configuration integrity compromised');
      }

      return {
        isValid: true,
        configHash: currentHash,
        deployedAt: this.deploymentInfo.deployedAt,
        version: this.deploymentInfo.version
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Get deployment information (immutable)
   */
  getDeploymentInfo() {
    return { ...this.deploymentInfo };
  }

  /**
   * Get audit configuration (immutable)
   */
  getAuditConfig() {
    return { ...this.auditConfig };
  }

  /**
   * Check if operation is immutable
   */
  isImmutableOperation(operation) {
    return this.auditConfig.immutableOperations.includes(operation);
  }

  /**
   * Prevent any attempts to modify the configuration
   */
  _preventModification() {
    throw new Error('Immutable configuration cannot be modified');
  }

  // Override any potential modification methods
  set = this._preventModification;
  defineProperty = this._preventModification;
  deleteProperty = this._preventModification;
}

// Create singleton instance
const immutableConfig = new ImmutableEarningsConfig();

// Prevent any further modifications to the instance
Object.freeze(immutableConfig);
Object.seal(immutableConfig);

// Export the immutable configuration
module.exports = immutableConfig;