const Decimal = require('decimal.js');
const { logger } = require('../utils/logger');
const immutableConfig = require('../immutable-earnings-config');
const ImmutableAuditService = require('./ImmutableAuditService');

class AllocationService {
  constructor(database) {
    this.db = database;

    // Use immutable configuration instead of hardcoded values
    this.allocations = immutableConfig.getAllocations();

    // Initialize immutable audit service
    this.auditService = new ImmutableAuditService(database);

    // Verify configuration integrity on initialization
    this._verifyImmutableConfig();

    logger.info('AllocationService initialized with immutable configuration', {
      allocations: this.allocations,
      configHash: immutableConfig.getDeploymentInfo().contractHash
    });
  }  /**
   * Verify immutable configuration integrity
   */
  _verifyImmutableConfig() {
    const integrityCheck = immutableConfig.verifyIntegrity();
    if (!integrityCheck.isValid) {
      throw new Error(`Immutable configuration integrity check failed: ${integrityCheck.error}`);
    }

    // Validate total allocation
    const total = Object.values(this.allocations).reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      throw new Error(`Invalid total allocation: ${total}%. Immutable configuration requires 100%`);
    }

    logger.info('Immutable configuration verified', {
      totalAllocation: total,
      configHash: integrityCheck.configHash
    });
  }

  async allocateProfits(sweepData) {
    logger.info('Starting profit allocation', { sweepId: sweepData.sweepId });

    try {
      return await this.db.transaction(async (client) => {
        // Get sweep details
        const sweepResult = await client.query(
          'SELECT * FROM sweeps WHERE id = $1 AND status = $2',
          [sweepData.sweepId, 'confirmed']
        );

        if (sweepResult.rows.length === 0) {
          throw new Error('Sweep not found or not confirmed');
        }

        const sweep = sweepResult.rows[0];
        const totalAmount = new Decimal(sweep.usd_value);

        // Verify immutable configuration before allocation
        const integrityCheck = immutableConfig.verifyIntegrity();
        if (!integrityCheck.isValid) {
          throw new Error(`Cannot allocate profits: Immutable configuration compromised - ${integrityCheck.error}`);
        }

        // Use immutable calculation method
        const calculatedAllocations = immutableConfig.calculateAllocations(parseFloat(totalAmount.toString()));

        const allocations = [];

        // Create allocations based on immutable percentages
        for (const [type, percentage] of Object.entries(this.allocations)) {
          const allocationAmount = new Decimal(calculatedAllocations[type]);

          const allocation = await client.query(`
            INSERT INTO allocations (
              sweep_id, allocation_type, percentage, amount, usd_value,
              target_strategy, executed, immutable_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `, [
            sweep.id,
            type,
            percentage,
            allocationAmount.toString(),
            allocationAmount.toString(),
            this.getTargetStrategy(type, sweep.chain),
            false,
            integrityCheck.configHash // Store immutable config hash for audit
          ]);

          allocations.push(allocation.rows[0]);
        }

        // Create immutable audit entry for the entire allocation operation
        await this.auditService.auditEarningsOperation(
          'allocate_profits',
          sweep.id,
          {
            totalAmount: totalAmount.toString(),
            allocations: allocations.map(a => ({
              type: a.allocation_type,
              percentage: a.percentage,
              amount: a.amount,
              strategy: a.target_strategy
            })),
            sweepChain: sweep.chain,
            sweepTxHash: sweep.transaction_hash
          }
        );

        // Keep legacy audit log for backward compatibility
        await client.query(`
          INSERT INTO audit_log (
            operation, entity_type, entity_id, new_values, user_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          'allocate_profits',
          'allocation',
          sweep.id,
          JSON.stringify({ allocations, immutableAudit: true }),
          'immutable-earnings-system'
        ]);

        logger.info('Profit allocation completed with immutable audit', {
          sweepId: sweep.id,
          totalAmount: totalAmount.toString(),
          allocationsCount: allocations.length,
          configHash: integrityCheck.configHash
        });

        return {
          sweepId: sweep.id,
          totalAmount: totalAmount.toString(),
          allocations: allocations,
          immutableAudit: {
            configHash: integrityCheck.configHash,
            verified: integrityCheck.isValid
          }
        };
      });
    } catch (error) {
      logger.error('Profit allocation failed', error);
      throw error;
    }
  }

  getTargetStrategy(allocationType, chain) {
    try {
      // Use immutable configuration for strategy selection
      return immutableConfig.getStrategy(allocationType, chain);
    } catch (error) {
      logger.warn('Failed to get strategy from immutable config, using fallback', {
        allocationType,
        chain,
        error: error.message
      });

      // Fallback strategies (these should never be used in production)
      const fallbackStrategies = {
        vault: 'staking',
        growth: 'lending',
        speculative: 'yield_farming',
        treasury: 'hold'
      };

      return fallbackStrategies[allocationType] || 'hold';
    }
  }

  async processUnallocatedSweeps() {
    logger.info('Processing unallocated sweeps');

    try {
      // Find confirmed sweeps without allocations
      const unallocatedSweeps = await this.db.query(`
        SELECT s.* 
        FROM sweeps s
        LEFT JOIN allocations a ON s.id = a.sweep_id
        WHERE s.status = 'confirmed' 
          AND a.id IS NULL
          AND s.timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY s.timestamp DESC
      `);

      for (const sweep of unallocatedSweeps.rows) {
        try {
          await this.allocateProfits({ sweepId: sweep.id });
        } catch (error) {
          logger.error('Failed to allocate profits for sweep', { 
            sweepId: sweep.id, 
            error: error.message 
          });
        }
      }

      logger.info(`Processed ${unallocatedSweeps.rows.length} unallocated sweeps`);
    } catch (error) {
      logger.error('Failed to process unallocated sweeps', error);
    }
  }

  async getAllocations(filters = {}) {
    let query = `
      SELECT 
        a.*,
        s.chain,
        s.token_symbol,
        s.transaction_hash as sweep_tx_hash
      FROM allocations a
      JOIN sweeps s ON a.sweep_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.allocationType) {
      query += ` AND a.allocation_type = $${params.length + 1}`;
      params.push(filters.allocationType);
    }

    if (filters.executed !== undefined) {
      query += ` AND a.executed = $${params.length + 1}`;
      params.push(filters.executed);
    }

    if (filters.chain) {
      query += ` AND s.chain = $${params.length + 1}`;
      params.push(filters.chain);
    }

    if (filters.since) {
      query += ` AND a.created_at >= $${params.length + 1}`;
      params.push(filters.since);
    }

    query += ` ORDER BY a.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(filters.limit));
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async executeAllocation(allocationId) {
    logger.info('Executing allocation', { allocationId });

    try {
      return await this.db.transaction(async (client) => {
        // Get allocation details
        const allocationResult = await client.query(
          'SELECT * FROM allocations WHERE id = $1 AND executed = false',
          [allocationId]
        );

        if (allocationResult.rows.length === 0) {
          throw new Error('Allocation not found or already executed');
        }

        const allocation = allocationResult.rows[0];

        // Execute the allocation based on target strategy
        let executionTxHash = null;
        
        try {
          executionTxHash = await this.executeStrategy(allocation);
        } catch (strategyError) {
          logger.error('Strategy execution failed', {
            allocationId,
            strategy: allocation.target_strategy,
            error: strategyError.message
          });
          throw strategyError;
        }

        // Mark allocation as executed
        await client.query(`
          UPDATE allocations 
          SET executed = true, execution_tx_hash = $1, executed_at = NOW()
          WHERE id = $2
        `, [executionTxHash, allocationId]);

        // Log execution in audit trail
        await client.query(`
          INSERT INTO audit_log (
            operation, entity_type, entity_id, new_values, user_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          'execute_allocation',
          'allocation',
          allocationId,
          JSON.stringify({ executionTxHash, strategy: allocation.target_strategy }),
          'system'
        ]);

        logger.info('Allocation executed successfully', { 
          allocationId, 
          executionTxHash,
          strategy: allocation.target_strategy
        });

        return {
          allocationId,
          executionTxHash,
          strategy: allocation.target_strategy,
          amount: allocation.amount
        };
      });
    } catch (error) {
      logger.error('Allocation execution failed', error);
      throw error;
    }
  }

  async executeStrategy(allocation) {
    // This would integrate with actual DeFi protocols
    // For now, return a mock transaction hash
    const strategies = {
      'staking': () => this.executeStaking(allocation),
      'lending': () => this.executeLending(allocation),
      'yield_farming': () => this.executeYieldFarming(allocation),
      'hold': () => this.executeHold(allocation)
    };

    const strategy = strategies[allocation.target_strategy.split('_')[0]] || strategies['hold'];
    return await strategy();
  }

  async executeStaking(allocation) {
    // Mock staking execution - would integrate with actual staking protocols
    logger.info('Executing staking strategy', { allocation: allocation.id });
    return `staking_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeLending(allocation) {
    // Mock lending execution - would integrate with Aave/Compound
    logger.info('Executing lending strategy', { allocation: allocation.id });
    return `lending_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeYieldFarming(allocation) {
    // Mock yield farming execution
    logger.info('Executing yield farming strategy', { allocation: allocation.id });
    return `yield_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeHold(allocation) {
    // Mock hold strategy - just transfer to treasury
    logger.info('Executing hold strategy', { allocation: allocation.id });
    return `hold_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = AllocationService;