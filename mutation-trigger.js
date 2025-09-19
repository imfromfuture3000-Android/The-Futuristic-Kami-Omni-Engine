#!/usr/bin/env node

/**
 * MCP Server Mutation Trigger
 * Activates advanced fixing and upgrade logic mutations
 */

const fs = require('fs').promises;
const path = require('path');

class MCPMutationTrigger {
  constructor() {
    this.config = null;
    this.serverUrl = 'http://localhost:3001';
  }

  async initialize() {
    try {
      // Load mutation config
      const configPath = path.join(__dirname, '.copilot-mutation-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);

      console.log('🔧 MCP Mutation Trigger Initialized');
      console.log(`📊 Enhancement Rate: ${this.config.enhancementRate}`);
      console.log(`⏰ Mutation Cycle: ${this.config.mutationCycle}`);
      console.log(`🧬 MCP Server: ${this.config.mcpServer.enabled ? 'ENABLED' : 'DISABLED'}`);

    } catch (error) {
      console.error('❌ Failed to initialize mutation trigger:', error);
      process.exit(1);
    }
  }

  async activateMutations() {
    console.log('\n🚀 Activating MCP Server Mutations...');

    try {
      // Check if MCP server is running
      const serverHealth = await this.checkServerHealth();
      if (!serverHealth) {
        console.log('⚠️  MCP Server not running. Starting server...');
        await this.startMCPServer();
        await this.waitForServer(5000);
      }

      // Trigger mutation analysis
      console.log('🔍 Triggering code analysis mutations...');
      await this.triggerAnalysisMutations();

      // Trigger fixing mutations
      console.log('🔧 Triggering advanced fixing mutations...');
      await this.triggerFixingMutations();

      // Trigger upgrade mutations
      console.log('⬆️  Triggering upgrade logic mutations...');
      await this.triggerUpgradeMutations();

      // Trigger performance mutations
      console.log('⚡ Triggering performance enhancement mutations...');
      await this.triggerPerformanceMutations();

      console.log('\n✅ All MCP Server mutations activated successfully!');
      console.log('📈 Mutation stats will be tracked and reported');

    } catch (error) {
      console.error('❌ Failed to activate mutations:', error);
    }
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async startMCPServer() {
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const server = spawn('node', ['mcp-server.js'], {
        cwd: __dirname,
        detached: true,
        stdio: 'ignore'
      });

      server.on('error', reject);
      server.unref();

      // Give server time to start
      setTimeout(resolve, 2000);
    });
  }

  async waitForServer(timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.checkServerHealth()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('MCP Server failed to start within timeout');
  }

  async triggerAnalysisMutations() {
    const targets = this.config.targets || [];

    for (const target of targets) {
      try {
        // Read target file
        const filePath = path.join(__dirname, target);
        const fileContent = await fs.readFile(filePath, 'utf8');

        // Determine language
        const language = this.getLanguageFromPath(target);

        // Trigger analysis
        const response = await fetch(`${this.serverUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: fileContent,
            language,
            context: { file: target, mutation: 'analysis' }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Analyzed ${target}: ${result.analysis ? 'Issues found' : 'Clean'}`);
        }

      } catch (error) {
        console.log(`⚠️  Could not analyze ${target}: ${error.message}`);
      }
    }
  }

  async triggerFixingMutations() {
    // Trigger auto-fix for common issues
    const fixRequest = {
      issues: [
        { description: 'Potential null pointer', category: 'error', severity: 'high' },
        { description: 'Inefficient algorithm', category: 'performance', severity: 'medium' },
        { description: 'Security vulnerability', category: 'security', severity: 'high' }
      ],
      code: 'function example() { return data.process(); }',
      aggressive: false
    };

    const response = await fetch(`${this.serverUrl}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixRequest)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`🔧 Applied ${result.applied} fixes`);
    }
  }

  async triggerUpgradeMutations() {
    const upgradeRequest = {
      targetVersion: 'latest',
      dependencies: ['express', 'openai'],
      breakingChanges: false
    };

    const response = await fetch(`${this.serverUrl}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upgradeRequest)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`⬆️  Upgrade path calculated: ${result.upgrade.upgradePath}`);
    }
  }

  async triggerPerformanceMutations() {
    const performanceRequest = {
      code: 'for(let i = 0; i < array.length; i++) { process(array[i]); }',
      target: 'performance',
      constraints: { maxTime: 100, maxMemory: 50 }
    };

    const response = await fetch(`${this.serverUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(performanceRequest)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`⚡ Performance optimization: ${result.optimization.improvementPercentage}`);
    }
  }

  getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      case '.py': return 'python';
      case '.rs': return 'rust';
      case '.sol': return 'solidity';
      case '.json': return 'json';
      default: return 'text';
    }
  }

  async getMutationStats() {
    try {
      const response = await fetch(`${this.serverUrl}/stats`);
      if (response.ok) {
        const stats = await response.json();
        console.log('\n📊 MCP Server Mutation Stats:');
        console.log(`Total Mutations: ${stats.totalMutations}`);
        console.log(`Successful: ${stats.successfulMutations}`);
        console.log(`Failed: ${stats.failedMutations}`);
        console.log(`Performance Improvements: ${stats.performanceImprovements}`);
        console.log(`Security Fixes: ${stats.securityFixes}`);
      }
    } catch (error) {
      console.log('⚠️  Could not retrieve mutation stats');
    }
  }
}

// CLI interface
async function main() {
  const trigger = new MCPMutationTrigger();

  await trigger.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'activate':
      await trigger.activateMutations();
      break;
    case 'stats':
      await trigger.getMutationStats();
      break;
    case 'health':
      const healthy = await trigger.checkServerHealth();
      console.log(`MCP Server Health: ${healthy ? '🟢 Healthy' : '🔴 Unhealthy'}`);
      break;
    default:
      console.log('Usage: node mutation-trigger.js <command>');
      console.log('Commands:');
      console.log('  activate - Activate all MCP server mutations');
      console.log('  stats    - Show mutation statistics');
      console.log('  health   - Check MCP server health');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MCPMutationTrigger;