#!/usr/bin/env node

/**
 * OmegaPrime MCP Server with Azure Integration
 * Advanced AI-powered code fixing and upgrade logic
 * Version 2.1.0 - Azure Enhanced
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const AzureIntegration = require('./azure-integration');

class OmegaPrimeMCPServer {
  constructor() {
    this.app = express();
    this.config = null;
    this.openai = null;
    this.azure = null;
    this.mutationStats = {
      totalMutations: 0,
      successfulMutations: 0,
      failedMutations: 0,
      performanceImprovements: 0,
      securityFixes: 0,
      azureOperations: 0
    };

    this.initializeServer();
  }

  async initializeServer() {
    try {
      // Load configuration
      const configPath = path.join(__dirname, 'mcp-server-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);

      // Initialize Azure OpenAI client
      this.openai = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_KEY,
        baseURL: process.env.AZURE_OPENAI_ENDPOINT,
        defaultHeaders: {
          'api-key': process.env.AZURE_OPENAI_KEY
        }
      });

      // Initialize Azure Integration
      this.azure = new AzureIntegration();
      await this.azure.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Start server
      const port = this.config.serverConfig.port || 3001;
      this.app.listen(port, () => {
        console.log(`🚀 OmegaPrime MCP Server with Azure Integration running on port ${port}`);
        console.log(`🔧 Advanced fixing: ${this.config.mcpServer.advancedFixing.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`⬆️  Upgrade logic: ${this.config.mcpServer.upgradeLogic.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`🧬 Mutation engine: ${this.config.mcpServer.mutationEngine.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`☁️  Azure Integration: ENABLED`);
        console.log(`🔐 Key Vault: ${this.config.azureIntegration.services.keyVault.name}`);
        console.log(`📦 Storage: ${this.config.azureIntegration.services.storage.account}`);
        console.log(`🌌 Cosmos DB: ${this.config.azureIntegration.services.cosmosDb.database}`);
        console.log(`⚡ Functions: ${this.config.azureIntegration.services.functions.name}`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize MCP Server:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors(this.config.serverConfig.cors));
    this.app.use(morgan('combined'));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: this.config.mcpServer.version,
        timestamp: new Date().toISOString(),
        stats: this.mutationStats,
        azure: {
          keyVault: this.config.azureIntegration.services.keyVault.name,
          storage: this.config.azureIntegration.services.storage.account,
          cosmosDb: this.config.azureIntegration.services.cosmosDb.database,
          functions: this.config.azureIntegration.services.functions.name
        }
      });
    });

    // Code analysis endpoint
    this.app.post('/analyze', this.analyzeCode.bind(this));

    // Auto-fix endpoint
    this.app.post('/fix', this.autoFix.bind(this));

    // Upgrade endpoint
    this.app.post('/upgrade', this.upgradeCode.bind(this));

    // Mutation endpoint
    this.app.post('/mutate', this.applyMutation.bind(this));

    // Optimization endpoint
    this.app.post('/optimize', this.optimizeCode.bind(this));

    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      res.json(this.mutationStats);
    });

    // Azure Integration Endpoints
    this.app.post('/azure/secure-keys', this.secureKeys.bind(this));
    this.app.post('/azure/store-event', this.storeMintEvent.bind(this));
    this.app.get('/azure/analytics', this.getAnalytics.bind(this));
    this.app.post('/azure/trait-fusion', this.triggerTraitFusion.bind(this));
    this.app.post('/azure/generate-logic', this.generateSacredLogic.bind(this));
    this.app.post('/azure/upload-report', this.uploadDeploymentReport.bind(this));
  }

  async analyzeCode(req, res) {
    try {
      const { code, language, context } = req.body;

      if (!code || !language) {
        return res.status(400).json({ error: 'Code and language are required' });
      }

      const analysis = await this.performAnalysis(code, language, context);

      res.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Analysis failed', details: error.message });
    }
  }

  async autoFix(req, res) {
    try {
      const { issues, code, aggressive = false } = req.body;

      if (!issues || !code) {
        return res.status(400).json({ error: 'Issues and code are required' });
      }

      const fixes = await this.generateFixes(issues, code, aggressive);

      res.json({
        success: true,
        fixes,
        applied: fixes.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Auto-fix error:', error);
      res.status(500).json({ error: 'Auto-fix failed', details: error.message });
    }
  }

  async upgradeCode(req, res) {
    try {
      const { targetVersion, dependencies, breakingChanges = false } = req.body;

      const upgrade = await this.performUpgrade(targetVersion, dependencies, breakingChanges);

      res.json({
        success: true,
        upgrade,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(500).json({ error: 'Upgrade failed', details: error.message });
    }
  }

  async applyMutation(req, res) {
    try {
      const { code, mutationType, intensity = 1 } = req.body;

      if (!code || !mutationType) {
        return res.status(400).json({ error: 'Code and mutation type are required' });
      }

      const mutation = await this.performMutation(code, mutationType, intensity);

      // Update stats
      this.mutationStats.totalMutations++;
      if (mutation.success) {
        this.mutationStats.successfulMutations++;
      } else {
        this.mutationStats.failedMutations++;
      }

      res.json({
        success: true,
        mutation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Mutation error:', error);
      res.status(500).json({ error: 'Mutation failed', details: error.message });
    }
  }

  async optimizeCode(req, res) {
    try {
      const { code, target, constraints } = req.body;

      if (!code || !target) {
        return res.status(400).json({ error: 'Code and target are required' });
      }

      const optimization = await this.performOptimization(code, target, constraints);

      res.json({
        success: true,
        optimization,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Optimization error:', error);
      res.status(500).json({ error: 'Optimization failed', details: error.message });
    }
  }

  async performAnalysis(code, language, context = {}) {
    const prompt = `Analyze the following ${language} code for issues, improvements, and optimization opportunities:

\`\`\`${language}
${code}
\`\`\`

Context: ${JSON.stringify(context)}

Please provide:
1. Syntax errors
2. Logic errors
3. Performance issues
4. Security vulnerabilities
5. Code quality issues
6. Optimization opportunities
7. Best practices violations

Format your response as JSON with categories and specific recommendations.`;

    const response = await this.openai.chat.completions.create({
      model: this.config.mcpServer.aiIntegration.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.mcpServer.aiIntegration.temperature,
      max_tokens: this.config.mcpServer.aiIntegration.maxTokens
    });

    return JSON.parse(response.choices[0].message.content);
  }

  async generateFixes(issues, code, aggressive) {
    const fixes = [];

    for (const issue of issues) {
      const prompt = `Fix the following issue in the code:

Issue: ${issue.description}
Category: ${issue.category}
Severity: ${issue.severity}

Original Code:
${code}

${aggressive ? 'Apply aggressive fixes including major refactoring if needed.' : 'Apply conservative fixes maintaining existing structure.'}

Provide the fixed code and explanation of changes.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.mcpServer.aiIntegration.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
      });

      fixes.push({
        issue: issue.description,
        fix: response.choices[0].message.content,
        applied: true
      });
    }

    return fixes;
  }

  async performUpgrade(targetVersion, dependencies, breakingChanges) {
    // Implementation for upgrade logic
    return {
      targetVersion,
      dependencies: dependencies || [],
      breakingChanges,
      upgradePath: 'calculated_upgrade_path',
      riskAssessment: 'low',
      estimatedTime: '30 minutes'
    };
  }

  async performMutation(code, mutationType, intensity) {
    const prompt = `Apply ${mutationType} mutation to the following code with intensity level ${intensity}:

${code}

Mutation types:
- code_enhancement: Improve code quality and readability
- performance_boost: Optimize for better performance
- security_hardening: Add security measures
- logic_optimization: Improve logical flow
- error_correction: Fix potential errors

Provide the mutated code and explain the improvements made.`;

    const response = await this.openai.chat.completions.create({
      model: this.config.mcpServer.aiIntegration.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 3000
    });

    return {
      success: true,
      mutationType,
      intensity,
      originalCode: code,
      mutatedCode: response.choices[0].message.content,
      improvements: 'AI-generated enhancements applied'
    };
  }

  async performOptimization(code, target, constraints = {}) {
    const prompt = `Optimize the following code for ${target}:

${code}

Constraints: ${JSON.stringify(constraints)}

Focus on:
- Performance improvements
- Memory efficiency
- Code size reduction
- Execution speed
- Resource utilization

Provide optimized code and performance metrics.`;

    const response = await this.openai.chat.completions.create({
      model: this.config.mcpServer.aiIntegration.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2500
    });

    return {
      target,
      constraints,
      optimizedCode: response.choices[0].message.content,
      performanceMetrics: 'calculated_metrics',
      improvementPercentage: 'estimated_improvement'
    };
  }

  // Azure Integration Methods
  async secureKeys(req, res) {
    try {
      await this.azure.secureRelayerKeys();
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        message: 'Relayer keys secured in Azure Key Vault',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Secure keys error:', error);
      res.status(500).json({ error: 'Failed to secure keys', details: error.message });
    }
  }

  async storeMintEvent(req, res) {
    try {
      const { eventData } = req.body;

      if (!eventData) {
        return res.status(400).json({ error: 'Event data is required' });
      }

      const storedEvent = await this.azure.storeMintEvent(eventData);
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        eventId: storedEvent.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Store mint event error:', error);
      res.status(500).json({ error: 'Failed to store mint event', details: error.message });
    }
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await this.azure.getAnalyticsDashboard();
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics', details: error.message });
    }
  }

  async triggerTraitFusion(req, res) {
    try {
      const { traitA, traitB } = req.body;

      if (!traitA || !traitB) {
        return res.status(400).json({ error: 'Both traitA and traitB are required' });
      }

      const fusionResult = await this.azure.triggerTraitFusion(traitA, traitB);
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        fusion: fusionResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Trait fusion error:', error);
      res.status(500).json({ error: 'Failed to trigger trait fusion', details: error.message });
    }
  }

  async generateSacredLogic(req, res) {
    try {
      const { logicId } = req.body;

      if (!logicId) {
        return res.status(400).json({ error: 'Logic ID is required' });
      }

      const logicResult = await this.azure.generateSacredLogic(logicId);
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        logic: logicResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Generate sacred logic error:', error);
      res.status(500).json({ error: 'Failed to generate sacred logic', details: error.message });
    }
  }

  async uploadDeploymentReport(req, res) {
    try {
      const { reportData, fileName } = req.body;

      if (!reportData || !fileName) {
        return res.status(400).json({ error: 'Report data and file name are required' });
      }

      const reportUrl = await this.azure.uploadDeploymentReport(reportData, fileName);
      this.mutationStats.azureOperations++;

      res.json({
        success: true,
        reportUrl,
        fileName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Upload deployment report error:', error);
      res.status(500).json({ error: 'Failed to upload deployment report', details: error.message });
    }
  }
}

// Start the server
if (require.main === module) {
  new OmegaPrimeMCPServer();
}

module.exports = OmegaPrimeMCPServer;