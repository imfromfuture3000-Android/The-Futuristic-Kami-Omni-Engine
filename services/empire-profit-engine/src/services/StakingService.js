const axios = require('axios');
const { logger } = require('../utils/logger');

class StakingService {
  constructor(database) {
    this.db = database;
  }

  async executeStaking(stakingData) {
    logger.info('Executing staking operation', { 
      chain: stakingData.chain, 
      protocol: stakingData.protocol,
      amount: stakingData.amount 
    });

    try {
      return await this.db.transaction(async (client) => {
        // Get allocation details
        const allocationResult = await client.query(
          'SELECT * FROM allocations WHERE id = $1',
          [stakingData.allocationId]
        );

        if (allocationResult.rows.length === 0) {
          throw new Error('Allocation not found');
        }

        const allocation = allocationResult.rows[0];
        
        // Execute staking based on chain and protocol
        let stakeTxHash = null;
        let validatorAddress = null;

        if (stakingData.chain === 'solana') {
          const result = await this.executeSolanaStaking(stakingData);
          stakeTxHash = result.txHash;
          validatorAddress = result.validatorAddress;
        } else if (stakingData.chain === 'ethereum') {
          const result = await this.executeEthereumStaking(stakingData);
          stakeTxHash = result.txHash;
          validatorAddress = result.validatorAddress;
        } else {
          throw new Error(`Unsupported chain for staking: ${stakingData.chain}`);
        }

        // Record staking position
        const positionResult = await client.query(`
          INSERT INTO staking_positions (
            allocation_id, chain, protocol, validator_address, stake_amount,
            apy, stake_tx_hash, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          stakingData.allocationId,
          stakingData.chain,
          stakingData.protocol,
          validatorAddress,
          stakingData.amount,
          stakingData.expectedApy || null,
          stakeTxHash,
          'active'
        ]);

        const position = positionResult.rows[0];

        // Update allocation as executed
        await client.query(
          'UPDATE allocations SET executed = true, execution_tx_hash = $1, executed_at = NOW() WHERE id = $2',
          [stakeTxHash, stakingData.allocationId]
        );

        // Log in audit trail
        await client.query(`
          INSERT INTO audit_log (
            operation, entity_type, entity_id, new_values, user_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          'execute_staking',
          'staking_position',
          position.id,
          JSON.stringify({ stakingData, stakeTxHash }),
          'system'
        ]);

        logger.info('Staking executed successfully', { 
          positionId: position.id,
          stakeTxHash,
          validatorAddress
        });

        return {
          positionId: position.id,
          stakeTxHash,
          validatorAddress,
          amount: stakingData.amount,
          chain: stakingData.chain,
          protocol: stakingData.protocol
        };
      });
    } catch (error) {
      logger.error('Staking execution failed', error);
      throw error;
    }
  }

  async executeSolanaStaking(stakingData) {
    logger.info('Executing Solana validator staking', stakingData);

    try {
      // Get optimal validator based on performance and commission
      const validator = await this.getOptimalSolanaValidator();
      
      // Mock staking transaction - would integrate with actual Solana staking
      const stakeTxHash = `sol_stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real implementation, would:
      // 1. Create stake account
      // 2. Delegate to validator
      // 3. Wait for confirmation
      
      return {
        txHash: stakeTxHash,
        validatorAddress: validator.votePubkey
      };
    } catch (error) {
      logger.error('Solana staking failed', error);
      throw error;
    }
  }

  async executeEthereumStaking(stakingData) {
    logger.info('Executing Ethereum staking', stakingData);

    try {
      if (stakingData.protocol === 'lido') {
        return await this.executeLidoStaking(stakingData);
      } else if (stakingData.protocol === 'rocketpool') {
        return await this.executeRocketPoolStaking(stakingData);
      } else {
        throw new Error(`Unsupported Ethereum staking protocol: ${stakingData.protocol}`);
      }
    } catch (error) {
      logger.error('Ethereum staking failed', error);
      throw error;
    }
  }

  async executeLidoStaking(stakingData) {
    logger.info('Executing Lido staking', stakingData);

    // Mock Lido staking - would integrate with actual Lido contract
    const stakeTxHash = `lido_stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In real implementation, would:
    // 1. Call Lido submit() function
    // 2. Get stETH in return
    // 3. Track stETH balance
    
    return {
      txHash: stakeTxHash,
      validatorAddress: '0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F' // Lido contract
    };
  }

  async executeRocketPoolStaking(stakingData) {
    logger.info('Executing Rocket Pool staking', stakingData);

    // Mock Rocket Pool staking
    const stakeTxHash = `reth_stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      txHash: stakeTxHash,
      validatorAddress: '0xDD3f50F8A6CafbE9b31a427582963f465E745AF8' // Rocket Pool deposit contract
    };
  }

  async getOptimalSolanaValidator() {
    try {
      // Mock validator selection - would integrate with Solana validator API
      const mockValidators = [
        {
          votePubkey: 'CRAXrE1qyxJqV7FDNhcXqKSo7MN6j7gXZSYq7W1VFsT9',
          commission: 5,
          apy: 6.8,
          name: 'High Performance Validator'
        },
        {
          votePubkey: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
          commission: 7,
          apy: 6.5,
          name: 'Reliable Validator'
        }
      ];

      // Select validator with best performance/commission ratio
      return mockValidators.reduce((best, current) => 
        (current.apy - current.commission) > (best.apy - best.commission) ? current : best
      );
    } catch (error) {
      logger.error('Failed to get optimal Solana validator', error);
      throw error;
    }
  }

  async executeScheduledStaking() {
    logger.info('Executing scheduled staking operations');

    try {
      // Find unexecuted allocations ready for staking
      const unexecutedAllocations = await this.db.query(`
        SELECT a.*, s.chain 
        FROM allocations a
        JOIN sweeps s ON a.sweep_id = s.id
        WHERE a.executed = false 
          AND a.target_strategy LIKE '%staking%'
          AND a.created_at < NOW() - INTERVAL '5 minutes'
        ORDER BY a.created_at ASC
        LIMIT 10
      `);

      for (const allocation of unexecutedAllocations.rows) {
        try {
          const stakingData = {
            allocationId: allocation.id,
            chain: allocation.chain,
            protocol: this.getStakingProtocol(allocation.chain, allocation.target_strategy),
            amount: allocation.amount,
            expectedApy: this.getExpectedAPY(allocation.chain, allocation.target_strategy)
          };

          await this.executeStaking(stakingData);
        } catch (error) {
          logger.error('Failed to execute scheduled staking', { 
            allocationId: allocation.id, 
            error: error.message 
          });
        }
      }

      logger.info(`Processed ${unexecutedAllocations.rows.length} scheduled staking operations`);
    } catch (error) {
      logger.error('Scheduled staking execution failed', error);
    }
  }

  getStakingProtocol(chain, targetStrategy) {
    if (chain === 'solana') {
      return 'solana_validator';
    } else if (chain === 'ethereum') {
      if (targetStrategy.includes('lido')) {
        return 'lido';
      } else if (targetStrategy.includes('rocket')) {
        return 'rocketpool';
      }
      return 'lido'; // Default to Lido for Ethereum
    }
    return 'unknown';
  }

  getExpectedAPY(chain, targetStrategy) {
    const apyMap = {
      'solana_validator': 6.5,
      'lido': 4.8,
      'rocketpool': 4.6
    };
    
    const protocol = this.getStakingProtocol(chain, targetStrategy);
    return apyMap[protocol] || 5.0;
  }

  async getStakingPositions(filters = {}) {
    let query = `
      SELECT 
        sp.*,
        a.allocation_type,
        a.usd_value as allocation_usd_value,
        s.token_symbol,
        s.chain as sweep_chain
      FROM staking_positions sp
      JOIN allocations a ON sp.allocation_id = a.id
      JOIN sweeps s ON a.sweep_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.chain) {
      query += ` AND sp.chain = $${params.length + 1}`;
      params.push(filters.chain);
    }

    if (filters.protocol) {
      query += ` AND sp.protocol = $${params.length + 1}`;
      params.push(filters.protocol);
    }

    if (filters.status) {
      query += ` AND sp.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.since) {
      query += ` AND sp.created_at >= $${params.length + 1}`;
      params.push(filters.since);
    }

    query += ` ORDER BY sp.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(filters.limit));
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateRewards() {
    logger.info('Updating staking rewards');

    try {
      const activePositions = await this.db.query(`
        SELECT * FROM staking_positions 
        WHERE status = 'active' 
          AND created_at < NOW() - INTERVAL '1 hour'
      `);

      for (const position of activePositions.rows) {
        try {
          const rewards = await this.calculateRewards(position);
          
          await this.db.query(`
            UPDATE staking_positions 
            SET rewards_earned = $1, updated_at = NOW()
            WHERE id = $2
          `, [rewards, position.id]);

          // Log rewards update
          await this.db.query(`
            INSERT INTO audit_log (
              operation, entity_type, entity_id, new_values, user_id
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            'update_staking_rewards',
            'staking_position',
            position.id,
            JSON.stringify({ oldRewards: position.rewards_earned, newRewards: rewards }),
            'system'
          ]);

        } catch (error) {
          logger.error('Failed to update rewards for position', { 
            positionId: position.id, 
            error: error.message 
          });
        }
      }

      logger.info(`Updated rewards for ${activePositions.rows.length} positions`);
    } catch (error) {
      logger.error('Rewards update failed', error);
    }
  }

  async calculateRewards(position) {
    // Calculate rewards based on time elapsed and APY
    const now = new Date();
    const createdAt = new Date(position.created_at);
    const hoursElapsed = (now - createdAt) / (1000 * 60 * 60);
    
    const yearlyRate = position.apy / 100;
    const hourlyRate = yearlyRate / (365 * 24);
    
    const newRewards = parseFloat(position.stake_amount) * hourlyRate * hoursElapsed;
    const totalRewards = parseFloat(position.rewards_earned || 0) + newRewards;
    
    return totalRewards.toFixed(8);
  }
}

module.exports = StakingService;