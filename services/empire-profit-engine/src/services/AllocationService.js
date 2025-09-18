const Decimal = require('decimal.js');
const { logger } = require('../utils/logger');

class AllocationService {
  constructor(database) {
    this.db = database;
    
    // Allocation percentages as specified in requirements
    this.allocations = {
      vault: 40,      // 40% to Vault
      growth: 30,     // 30% to Growth
      speculative: 20, // 20% to Speculative
      treasury: 10    // 10% to Treasury
    };
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

        const allocations = [];

        // Create allocations based on percentages
        for (const [type, percentage] of Object.entries(this.allocations)) {
          const allocationAmount = totalAmount.mul(percentage).div(100);
          
          const allocation = await client.query(`
            INSERT INTO allocations (
              sweep_id, allocation_type, percentage, amount, usd_value, 
              target_strategy, executed
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [
            sweep.id,
            type,
            percentage,
            allocationAmount.toString(),
            allocationAmount.toString(),
            this.getTargetStrategy(type, sweep.chain),
            false
          ]);

          allocations.push(allocation.rows[0]);
        }

        // Log allocation in audit trail
        await client.query(`
          INSERT INTO audit_log (
            operation, entity_type, entity_id, new_values, user_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          'allocate_profits',
          'allocation',
          sweep.id,
          JSON.stringify({ allocations }),
          'system'
        ]);

        logger.info('Profit allocation completed', { 
          sweepId: sweep.id, 
          totalAmount: totalAmount.toString(),
          allocationsCount: allocations.length 
        });

        return {
          sweepId: sweep.id,
          totalAmount: totalAmount.toString(),
          allocations: allocations
        };
      });
    } catch (error) {
      logger.error('Profit allocation failed', error);
      throw error;
    }
  }

  getTargetStrategy(allocationType, chain) {
    const strategies = {
      vault: 'staking',           // Safe staking for vault
      growth: 'lending',          // Yield through lending for growth
      speculative: 'yield_farming', // Higher risk yield farming
      treasury: 'hold'            // Hold for treasury
    };

    // Chain-specific strategy adjustments
    if (chain === 'solana' && allocationType === 'vault') {
      return 'solana_validator_staking';
    } else if (chain === 'ethereum' && allocationType === 'vault') {
      return 'lido_staking';
    } else if (allocationType === 'growth') {
      return chain === 'ethereum' ? 'aave_lending' : 'compound_lending';
    }

    return strategies[allocationType] || 'hold';
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