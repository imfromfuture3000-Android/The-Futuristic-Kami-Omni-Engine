const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

const Database = require('./database/connection');
const SweepService = require('./services/SweepService');
const AllocationService = require('./services/AllocationService');
const StakingService = require('./services/StakingService');
const MutationService = require('./services/MutationService');
const { logger } = require('./utils/logger');

class EmpireProfitEngine {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.db = new Database();
    
    // Initialize services
    this.sweepService = new SweepService(this.db);
    this.allocationService = new AllocationService(this.db);
    this.stakingService = new StakingService(this.db);
    this.mutationService = new MutationService(this.db);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupCronJobs();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/ready', async (req, res) => {
      try {
        await this.db.query('SELECT 1');
        res.json({ status: 'ready' });
      } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
      }
    });

    // Sweep endpoints
    this.app.post('/sweep/initiate', async (req, res) => {
      try {
        const result = await this.sweepService.initiateSweep(req.body);
        res.json(result);
      } catch (error) {
        logger.error('Sweep initiation failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/sweep/status/:id', async (req, res) => {
      try {
        const status = await this.sweepService.getSweepStatus(req.params.id);
        res.json(status);
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });

    // Allocation endpoints
    this.app.post('/allocate', async (req, res) => {
      try {
        const allocation = await this.allocationService.allocateProfits(req.body);
        res.json(allocation);
      } catch (error) {
        logger.error('Allocation failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/allocations', async (req, res) => {
      try {
        const allocations = await this.allocationService.getAllocations(req.query);
        res.json(allocations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Staking endpoints
    this.app.post('/stake', async (req, res) => {
      try {
        const result = await this.stakingService.executeStaking(req.body);
        res.json(result);
      } catch (error) {
        logger.error('Staking failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/staking/positions', async (req, res) => {
      try {
        const positions = await this.stakingService.getStakingPositions(req.query);
        res.json(positions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Mutation endpoints
    this.app.post('/mutate', async (req, res) => {
      try {
        const mutation = await this.mutationService.generateSacredLogic(req.body);
        res.json(mutation);
      } catch (error) {
        logger.error('Mutation failed', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/mutations/active', async (req, res) => {
      try {
        const mutations = await this.mutationService.getActiveMutations();
        res.json(mutations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Analytics endpoints
    this.app.get('/analytics/profit-summary', async (req, res) => {
      try {
        const summary = await this.db.query(`
          SELECT * FROM profit_summary 
          WHERE date >= $1 
          ORDER BY date DESC
        `, [req.query.since || '2024-01-01']);
        res.json(summary.rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/analytics/staking-performance', async (req, res) => {
      try {
        const performance = await this.db.query('SELECT * FROM staking_performance ORDER BY total_rewards DESC');
        res.json(performance.rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupCronJobs() {
    // Auto-sweep every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.sweepService.autoSweep();
      } catch (error) {
        logger.error('Auto-sweep failed', error);
      }
    });

    // Profit allocation every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.allocationService.processUnallocatedSweeps();
      } catch (error) {
        logger.error('Auto-allocation failed', error);
      }
    });

    // Execute staking every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.stakingService.executeScheduledStaking();
      } catch (error) {
        logger.error('Auto-staking failed', error);
      }
    });

    // Generate sacred logic every 10 minutes (as specified)
    cron.schedule('*/10 * * * *', async () => {
      try {
        await this.mutationService.scheduledMutation();
      } catch (error) {
        logger.error('Scheduled mutation failed', error);
      }
    });

    // Claim treasury profits every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.mutationService.autoClaimProfits();
      } catch (error) {
        logger.error('Auto-claim failed', error);
      }
    });
  }

  async start() {
    try {
      // Initialize database connection
      await this.db.connect();
      logger.info('Database connected successfully');

      // Run migrations
      await this.db.migrate();
      logger.info('Database migrations completed');

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`Empire Profit Engine running on port ${this.port}`);
        logger.info('Services initialized:');
        logger.info('- Sweep Service: Active');
        logger.info('- Allocation Service: Active');
        logger.info('- Staking Service: Active');
        logger.info('- Mutation Service: Active');
        logger.info('Cron jobs scheduled:');
        logger.info('- Auto-sweep: Every 30 seconds');
        logger.info('- Profit allocation: Every minute');
        logger.info('- Staking execution: Every 5 minutes');
        logger.info('- Sacred logic generation: Every 10 minutes');
        logger.info('- Treasury claims: Every hour');
      });
    } catch (error) {
      logger.error('Failed to start Empire Profit Engine', error);
      process.exit(1);
    }
  }

  async stop() {
    logger.info('Shutting down Empire Profit Engine...');
    await this.db.close();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  const engine = new EmpireProfitEngine();
  await engine.stop();
});

process.on('SIGINT', async () => {
  const engine = new EmpireProfitEngine();
  await engine.stop();
});

// Start the engine
if (require.main === module) {
  const engine = new EmpireProfitEngine();
  engine.start();
}

module.exports = EmpireProfitEngine;