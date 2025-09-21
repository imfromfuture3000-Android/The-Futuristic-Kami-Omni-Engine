// MUTATED: Implemented design patterns for maintainability
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const GeneSystem = require('./gene-system');

class CopilotScoop {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 8080;
    this.empireEngineUrl = process.env.EMPIRE_ENGINE_URL || 'http://empire-engine-service';
    this.sweepInterval = parseInt(process.env.SWEEP_INTERVAL_MS) || 30000;
    this.maxSweepAmount = parseFloat(process.env.MAX_SWEEP_AMOUNT) || 1000;
    
    // Initialize Gene System
    this.geneSystem = new GeneSystem();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'scoop.log' })
      ]
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupCronJobs();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    // Health check endpoints
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'copilot-scoop',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/ready', (req, res) => {
      res.json({ 
        status: 'ready',
        service: 'copilot-scoop',
        sweepInterval: this.sweepInterval,
        maxSweepAmount: this.maxSweepAmount
      });
    });

    // Manual sweep trigger
    this.app.post('/sweep/trigger', async (req, res) => {
      try {
        const result = await this.performSweep();
        res.json({ success: true, result });
      } catch (error) {
        this.logger.error('Manual sweep failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Sweep status
    this.app.get('/sweep/status', (req, res) => {
      res.json({
        service: 'copilot-scoop',
        status: 'active',
        lastSweep: this.lastSweep || null,
        sweepCount: this.sweepCount || 0,
        interval: this.sweepInterval
      });
    });

    // Configuration endpoint
    this.app.get('/config', (req, res) => {
      res.json({
        sweepInterval: this.sweepInterval,
        maxSweepAmount: this.maxSweepAmount,
        empireEngineUrl: this.empireEngineUrl,
        chains: ['solana', 'ethereum', 'skale']
      });
    });

    // Gene System endpoints
    this.app.get('/gene/current', (req, res) => {
      res.json(this.geneSystem.getCurrentGene());
    });

    this.app.post('/gene/switch/:geneName', (req, res) => {
      try {
        const result = this.geneSystem.switchGene(req.params.geneName);
        this.logger.info('Gene switched', result);
        res.json({
          success: true,
          ...result,
          response: this.geneSystem.getContextualResponse('gene_switch')
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/gene/awareness', (req, res) => {
      res.json(this.geneSystem.getSelfAwareness());
    });

    this.app.get('/gene/suggestions', (req, res) => {
      res.json({
        suggestions: this.geneSystem.suggestNextActions(),
        gene: this.geneSystem.getCurrentGene().name
      });
    });

    this.app.get('/gene/capabilities', (req, res) => {
      res.json({
        activeGene: this.geneSystem.activeGene,
        capabilities: this.geneSystem.genes[this.geneSystem.activeGene].capabilities
      });
    });
  }

  setupCronJobs() {
    // Auto-sweep based on configured interval
    const cronExpression = this.sweepInterval < 60000 
      ? `*/${Math.floor(this.sweepInterval / 1000)} * * * * *`  // Seconds
      : `*/${Math.floor(this.sweepInterval / 60000)} * * * *`;   // Minutes

    cron.schedule(cronExpression, async () => {
      try {
        await this.performSweep();
      } catch (error) {
        this.logger.error('Scheduled sweep failed', error);
      }
    });

    this.logger.info(`Scheduled sweeps every ${this.sweepInterval}ms`);
  }

  async performSweep() {
    // Check for redundancy
    const redundancyCheck = this.geneSystem.detectRedundancy('sweep_operation', { chains: ['solana', 'ethereum'] });
    if (redundancyCheck.redundant) {
      this.logger.warn(redundancyCheck.message);
    }

    this.logger.info(`${this.geneSystem.getContextualResponse('sweep')} Performing relayer sweep...`);
    
    try {
      const sweepResults = [];
      const chains = ['solana', 'ethereum'];

      for (const chain of chains) {
        try {
          const result = await this.sweepChain(chain);
          if (result) {
            sweepResults.push(result);
          }
        } catch (error) {
          this.logger.error(`Failed to sweep ${chain}`, error);
        }
      }

      // Send profits to Empire Engine for allocation
      for (const sweep of sweepResults) {
        try {
          await this.sendProfitToEngine(sweep);
        } catch (error) {
          this.logger.error('Failed to send profit to engine', error);
        }
      }

      this.lastSweep = new Date();
      this.sweepCount = (this.sweepCount || 0) + sweepResults.length;

      // Log action in gene system
      this.geneSystem.logAction('sweep_operation', {
        chains: chains,
        resultsFound: sweepResults.length,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Sweep completed: ${sweepResults.length} transactions found - ${this.geneSystem.getContextualResponse('sweep_complete')}`);
      return { sweepsFound: sweepResults.length, sweeps: sweepResults };

    } catch (error) {
      this.logger.error('Sweep operation failed', error);
      throw error;
    }
  }

  async sweepChain(chain) {
    this.logger.debug(`Sweeping ${chain} chain...`);

    // Mock sweep operation - would integrate with actual blockchain monitoring
    const mockSweep = this.generateMockSweep(chain);
    
    if (mockSweep && parseFloat(mockSweep.amount) > 0) {
      this.logger.info(`Found ${chain} transaction: ${mockSweep.amount} ${mockSweep.tokenSymbol}`, {
        txHash: mockSweep.transactionHash,
        amount: mockSweep.amount,
        usdValue: mockSweep.usdValue
      });
      
      return mockSweep;
    }

    return null;
  }

  generateMockSweep(chain) {
    // Generate mock sweep data for demonstration
    const shouldGenerate = Math.random() < 0.3; // 30% chance of finding a transaction
    
    if (!shouldGenerate) return null;

    const amounts = {
      solana: { min: 0.1, max: 10, symbol: 'SOL', price: 100 },
      ethereum: { min: 0.01, max: 1, symbol: 'ETH', price: 2500 }
    };

    const chainConfig = amounts[chain];
    const amount = (Math.random() * (chainConfig.max - chainConfig.min) + chainConfig.min).toFixed(6);
    const usdValue = (parseFloat(amount) * chainConfig.price).toFixed(2);

    return {
      transactionHash: `${chain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chain: chain,
      tokenAddress: chain === 'solana' ? null : '0x0000000000000000000000000000000000000000',
      tokenSymbol: chainConfig.symbol,
      amount: amount,
      usdValue: usdValue,
      fromAddress: `${chain}_relayer_address`,
      toAddress: chain === 'solana' 
        ? process.env.OWNER_ADDRESS_SOL 
        : process.env.OWNER_ADDRESS_ETH,
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000
    };
  }

  async sendProfitToEngine(sweep) {
    try {
      const response = await axios.post(`${this.empireEngineUrl}/sweep/initiate`, sweep, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CopilotScoop/1.0.0'
        }
      });

      this.logger.info('Profit sent to Empire Engine', {
        sweepId: response.data.id,
        amount: sweep.amount,
        usdValue: sweep.usdValue
      });

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('Empire Engine not available, queuing for retry');
        // In production, would implement a retry queue
      } else {
        this.logger.error('Failed to send profit to Empire Engine', error);
      }
      throw error;
    }
  }

  start() {
    this.app.listen(this.port, () => {
      this.logger.info(`Copilot Scoop running on port ${this.port}`);
      this.logger.info('Configuration:', {
        sweepInterval: this.sweepInterval,
        maxSweepAmount: this.maxSweepAmount,
        empireEngineUrl: this.empireEngineUrl
      });
      this.logger.info('Auto-sweep activated for chains: solana, ethereum');
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down Copilot Scoop...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down Copilot Scoop...');
  process.exit(0);
});

// Start the service
if (require.main === module) {
  const scoop = new CopilotScoop();
  scoop.start();
}

module.exports = CopilotScoop;