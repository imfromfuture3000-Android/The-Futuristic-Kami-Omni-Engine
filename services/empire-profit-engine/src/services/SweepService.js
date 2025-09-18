const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { ethers } = require('ethers');
const axios = require('axios');
const { logger } = require('../utils/logger');

class SweepService {
  constructor(database) {
    this.db = database;
    
    // Initialize blockchain connections
    this.initializeConnections();
  }

  initializeConnections() {
    try {
      // Solana connection
      this.solanaConnection = new Connection(
        process.env.HELIUS_RPC || process.env.SOLANA_RPC_URL,
        'confirmed'
      );

      // Ethereum connection
      this.ethProvider = new ethers.JsonRpcProvider(
        process.env.INFURA_RPC || process.env.ETHEREUM_RPC_URL
      );

      logger.info('Blockchain connections initialized');
    } catch (error) {
      logger.error('Failed to initialize blockchain connections', error);
    }
  }

  async initiateSweep(sweepData) {
    logger.info('Initiating sweep', { chain: sweepData.chain, amount: sweepData.amount });

    try {
      return await this.db.transaction(async (client) => {
        // Insert sweep record
        const sweepResult = await client.query(`
          INSERT INTO sweeps (
            transaction_hash, chain, token_address, token_symbol, amount, 
            usd_value, from_address, to_address, block_number, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          sweepData.transactionHash,
          sweepData.chain,
          sweepData.tokenAddress || null,
          sweepData.tokenSymbol,
          sweepData.amount,
          sweepData.usdValue,
          sweepData.fromAddress,
          sweepData.toAddress,
          sweepData.blockNumber || null,
          'pending'
        ]);

        const sweep = sweepResult.rows[0];

        // Log in audit trail
        await client.query(`
          INSERT INTO audit_log (
            operation, entity_type, entity_id, new_values, user_id
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          'initiate_sweep',
          'sweep',
          sweep.id,
          JSON.stringify(sweepData),
          'system'
        ]);

        // Start monitoring the transaction
        this.monitorTransaction(sweep);

        logger.info('Sweep initiated', { sweepId: sweep.id, txHash: sweepData.transactionHash });
        return sweep;
      });
    } catch (error) {
      logger.error('Failed to initiate sweep', error);
      throw error;
    }
  }

  async monitorTransaction(sweep) {
    try {
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      const checkInterval = setInterval(async () => {
        attempts++;
        
        try {
          if (sweep.chain === 'solana') {
            confirmed = await this.checkSolanaTransaction(sweep.transaction_hash);
          } else if (sweep.chain === 'ethereum') {
            confirmed = await this.checkEthereumTransaction(sweep.transaction_hash);
          }

          if (confirmed || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            await this.updateSweepStatus(sweep.id, confirmed ? 'confirmed' : 'failed');
          }
        } catch (error) {
          logger.error('Transaction monitoring error', { 
            sweepId: sweep.id, 
            txHash: sweep.transaction_hash,
            error: error.message 
          });
        }
      }, 5000);

    } catch (error) {
      logger.error('Failed to start transaction monitoring', error);
    }
  }

  async checkSolanaTransaction(txHash) {
    try {
      const transaction = await this.solanaConnection.getTransaction(txHash);
      return transaction && transaction.meta && !transaction.meta.err;
    } catch (error) {
      logger.debug('Solana transaction not found yet', { txHash });
      return false;
    }
  }

  async checkEthereumTransaction(txHash) {
    try {
      const receipt = await this.ethProvider.getTransactionReceipt(txHash);
      return receipt && receipt.status === 1;
    } catch (error) {
      logger.debug('Ethereum transaction not found yet', { txHash });
      return false;
    }
  }

  async updateSweepStatus(sweepId, status) {
    try {
      await this.db.query(
        'UPDATE sweeps SET status = $1, timestamp = NOW() WHERE id = $2',
        [status, sweepId]
      );

      // Log status update
      await this.db.query(`
        INSERT INTO audit_log (
          operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        'update_sweep_status',
        'sweep',
        sweepId,
        JSON.stringify({ status }),
        'system'
      ]);

      logger.info('Sweep status updated', { sweepId, status });
    } catch (error) {
      logger.error('Failed to update sweep status', error);
    }
  }

  async getSweepStatus(sweepId) {
    const result = await this.db.query(
      'SELECT * FROM sweeps WHERE id = $1',
      [sweepId]
    );

    if (result.rows.length === 0) {
      throw new Error('Sweep not found');
    }

    return result.rows[0];
  }

  async autoSweep() {
    logger.debug('Running auto-sweep check');

    try {
      // Check Solana relayers
      await this.sweepSolanaRelayers();
      
      // Check Ethereum relayers
      await this.sweepEthereumRelayers();
      
    } catch (error) {
      logger.error('Auto-sweep failed', error);
    }
  }

  async sweepSolanaRelayers() {
    try {
      const ownerAddress = process.env.OWNER_ADDRESS_SOL;
      if (!ownerAddress) return;

      // Get recent transactions for owner address
      const signatures = await this.solanaConnection.getSignaturesForAddress(
        new PublicKey(ownerAddress),
        { limit: 10 }
      );

      for (const sig of signatures) {
        // Check if we've already processed this transaction
        const existingSweep = await this.db.query(
          'SELECT id FROM sweeps WHERE transaction_hash = $1',
          [sig.signature]
        );

        if (existingSweep.rows.length === 0) {
          // Get transaction details
          const tx = await this.solanaConnection.getTransaction(sig.signature);
          if (tx && tx.meta && !tx.meta.err) {
            await this.processSolanaTransaction(tx, sig.signature);
          }
        }
      }
    } catch (error) {
      logger.error('Solana relayer sweep failed', error);
    }
  }

  async sweepEthereumRelayers() {
    try {
      const ownerAddress = process.env.OWNER_ADDRESS_ETH;
      if (!ownerAddress) return;

      // Use Infura or other provider to get recent transactions
      // This is a simplified version - would need proper indexing
      const latestBlock = await this.ethProvider.getBlockNumber();
      const block = await this.ethProvider.getBlock(latestBlock, true);

      for (const tx of block.transactions.slice(0, 10)) {
        if (tx.to && tx.to.toLowerCase() === ownerAddress.toLowerCase()) {
          // Check if we've already processed this transaction
          const existingSweep = await this.db.query(
            'SELECT id FROM sweeps WHERE transaction_hash = $1',
            [tx.hash]
          );

          if (existingSweep.rows.length === 0) {
            await this.processEthereumTransaction(tx);
          }
        }
      }
    } catch (error) {
      logger.error('Ethereum relayer sweep failed', error);
    }
  }

  async processSolanaTransaction(tx, signature) {
    try {
      // Extract relevant information from Solana transaction
      const amount = this.extractSolanaAmount(tx);
      const tokenInfo = this.extractSolanaTokenInfo(tx);
      
      if (amount > 0) {
        const sweepData = {
          transactionHash: signature,
          chain: 'solana',
          tokenAddress: tokenInfo.address,
          tokenSymbol: tokenInfo.symbol,
          amount: amount.toString(),
          usdValue: await this.getUSDValue(tokenInfo.symbol, amount),
          fromAddress: this.extractFromAddress(tx),
          toAddress: process.env.OWNER_ADDRESS_SOL,
          blockNumber: tx.slot
        };

        await this.initiateSweep(sweepData);
      }
    } catch (error) {
      logger.error('Failed to process Solana transaction', { signature, error: error.message });
    }
  }

  async processEthereumTransaction(tx) {
    try {
      const receipt = await this.ethProvider.getTransactionReceipt(tx.hash);
      if (!receipt || receipt.status !== 1) return;

      const amount = parseFloat(ethers.formatEther(tx.value));
      
      if (amount > 0) {
        const sweepData = {
          transactionHash: tx.hash,
          chain: 'ethereum',
          tokenAddress: null, // ETH
          tokenSymbol: 'ETH',
          amount: amount.toString(),
          usdValue: await this.getUSDValue('ETH', amount),
          fromAddress: tx.from,
          toAddress: tx.to,
          blockNumber: tx.blockNumber
        };

        await this.initiateSweep(sweepData);
      }
    } catch (error) {
      logger.error('Failed to process Ethereum transaction', { txHash: tx.hash, error: error.message });
    }
  }

  extractSolanaAmount(tx) {
    // Simplified amount extraction - would need proper SPL token parsing
    if (tx.meta && tx.meta.postBalances && tx.meta.preBalances) {
      const diff = tx.meta.postBalances[0] - tx.meta.preBalances[0];
      return Math.abs(diff) / 1e9; // Convert lamports to SOL
    }
    return 0;
  }

  extractSolanaTokenInfo(tx) {
    // Simplified token info extraction
    return {
      address: null,
      symbol: 'SOL'
    };
  }

  extractFromAddress(tx) {
    // Extract from address from Solana transaction
    if (tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) {
      return tx.transaction.message.accountKeys[0];
    }
    return 'unknown';
  }

  async getUSDValue(symbol, amount) {
    try {
      // Use a price API to get USD value
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: this.getCoingeckoId(symbol),
          vs_currencies: 'usd'
        }
      });

      const coinId = this.getCoingeckoId(symbol);
      const price = response.data[coinId]?.usd || 0;
      return (amount * price).toFixed(8);
    } catch (error) {
      logger.error('Failed to get USD value', { symbol, amount, error: error.message });
      return '0';
    }
  }

  getCoingeckoId(symbol) {
    const mapping = {
      'SOL': 'solana',
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether'
    };
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }
}

module.exports = SweepService;