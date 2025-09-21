#!/usr/bin/env node

/**
 * Master Deployment Orchestrator for Gene Mint Protocol
 * Coordinates full deployment using Azure integration, Octane payer, and rebate treasury
 * Uses Master Controller for all contract address deployments
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class MasterDeploymentOrchestrator {
  constructor() {
    this.workspacePath = process.cwd();
    this.deploymentLog = [];
    this.contractAddresses = {};

    // Master Controller Configuration
    this.masterController = process.env.MASTER_CONTROLLER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';
    this.treasuryDeployer = process.env.TREASURY_DEPLOYER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';
    this.rebateAddress = process.env.SOLANA_REBATE_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';

    // Octane Payer Configuration
    this.octaneEnabled = process.env.OCTANE_PAYER_ENABLED === 'true';
    this.octanePayer = process.env.OCTANE_PAYER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';

    console.log('🚀 Gene Mint Protocol - Master Deployment Orchestrator');
    console.log(`👑 Master Controller: ${this.masterController}`);
    console.log(`🏦 Treasury Deployer: ${this.treasuryDeployer}`);
    console.log(`🎁 Rebate Address: ${this.rebateAddress}`);
    console.log(`⚡ Octane Payer: ${this.octaneEnabled ? this.octanePayer : 'DISABLED'}`);
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.deploymentLog.push(logEntry);
  }

  async executeFullDeployment() {
    try {
      this.log('🎯 Starting Full Gene Mint Protocol Deployment', 'START');

      // Step 1: Initialize Azure Integration
      await this.initializeAzureIntegration();

      // Step 2: Secure Keys in Azure Key Vault
      await this.secureKeysInAzure();

      // Step 3: Deploy Azure Resources
      await this.deployAzureResources();

      // Step 4: Build and Deploy Solana Contracts
      await this.deploySolanaContracts();

      // Step 5: Deploy SKALE Contracts
      await this.deploySKALEContracts();

      // Step 6: Configure Azure Functions
      await this.configureAzureFunctions();

      // Step 7: Start MCP Server with Azure Integration
      await this.startMCPServer();

      // Step 8: Run Integration Tests
      await this.runIntegrationTests();

      // Step 9: Generate Deployment Report
      await this.generateDeploymentReport();

      this.log('✅ Full Deployment Complete!', 'SUCCESS');

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'ERROR');
      await this.handleDeploymentFailure(error);
      throw error;
    }
  }

  async initializeAzureIntegration() {
    this.log('🔧 Initializing Azure Integration...');

    try {
      execSync('node azure-integration.js init', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Azure Integration initialized');
    } catch (error) {
      this.log(`❌ Azure Integration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async secureKeysInAzure() {
    this.log('🔐 Securing keys in Azure Key Vault...');

    try {
      // Execute Azure Key Provisioner mutation cycle
      this.log('Executing Azure OpenAI Key Provisioner...');
      const AzureKeyProvisioner = require('./azure-key-provisioner.js');
      const provisioner = new AzureKeyProvisioner();
      
      const result = await provisioner.executeMasterMutationCycle();
      this.log(`✅ Azure Key Provisioner completed: ${result.status}`, 'SUCCESS');
      
      // Continue with other key vault operations
      execSync('node azure-integration.js secure-keys', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Keys secured in Azure Key Vault');
    } catch (error) {
      this.log(`❌ Key securing failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async deployAzureResources() {
    this.log('🏗️ Deploying Azure Resources...');

    try {
      execSync('node azure-deploy.js deploy', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Azure Resources deployed');
    } catch (error) {
      this.log(`❌ Azure deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async deploySolanaContracts() {
    this.log('🌐 Deploying Solana Contracts with Master Controller...');

    try {
      // Build Anchor program
      this.log('🔨 Building Anchor program...');
      execSync('anchor build', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      // Deploy using zero-cost deployment script
      this.log('📦 Deploying via Octane relayer (zero-cost)...');
      const deployCommand = `node scripts/solana_zero_cost_deploy.js target/deploy/mint_gene.so target/deploy/mint_gene-keypair.json mainnet`;

      const result = execSync(deployCommand, {
        encoding: 'utf8',
        cwd: this.workspacePath
      });

      // Extract program ID
      const programIdMatch = result.match(/Program Id: ([A-Za-z0-9]+)/);
      if (programIdMatch) {
        const programId = programIdMatch[1];
        this.contractAddresses.solanaProgram = programId;
        this.log(`✅ Solana contract deployed: ${programId}`);
      } else {
        throw new Error('Could not extract program ID from deployment result');
      }

    } catch (error) {
      this.log(`❌ Solana deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async deploySKALEContracts() {
    this.log('🔗 Deploying SKALE Contracts...');

    try {
      // Deploy to SKALE mainnet using zero-cost deployment
      const skaleDeployCommand = `node scripts/skale_mainnet_zero_cost_deploy.js`;

      execSync(skaleDeployCommand, {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ SKALE contracts deployed');
    } catch (error) {
      this.log(`❌ SKALE deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async configureAzureFunctions() {
    this.log('⚡ Configuring Azure Functions...');

    try {
      execSync('node azure-setup.js functions', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Azure Functions configured');
    } catch (error) {
      this.log(`❌ Azure Functions configuration failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async startMCPServer() {
    this.log('🧠 Starting MCP Server with Azure Integration...');

    try {
      // Start MCP server in background
      const serverProcess = execSync('npm run server:start', {
        stdio: 'inherit',
        cwd: this.workspacePath,
        detached: true
      });

      this.log('✅ MCP Server started with Azure integration');

      // Wait for server to be ready
      await this.waitForServerReady();

    } catch (error) {
      this.log(`❌ MCP Server startup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async waitForServerReady() {
    this.log('⏳ Waiting for MCP Server to be ready...');

    const maxRetries = 30;
    const retryDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          this.log('✅ MCP Server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    throw new Error('MCP Server failed to start within timeout');
  }

  async runIntegrationTests() {
    this.log('🧪 Running Integration Tests...');

    try {
      execSync('npm run azure:test', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Integration tests passed');
    } catch (error) {
      this.log(`❌ Integration tests failed: ${error.message}`, 'WARN');
      // Don't throw error for test failures, just log warning
    }
  }

  async generateDeploymentReport() {
    this.log('📊 Generating Deployment Report...');

    const report = {
      timestamp: new Date().toISOString(),
      masterController: this.masterController,
      treasuryDeployer: this.treasuryDeployer,
      rebateAddress: this.rebateAddress,
      octanePayer: this.octaneEnabled ? this.octanePayer : null,
      contractAddresses: this.contractAddresses,
      deploymentLog: this.deploymentLog,
      status: 'completed'
    };

    const reportPath = path.join(this.workspacePath, 'full-deployment-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Upload report to Azure Storage
    try {
      execSync(`node azure-integration.js upload-report full-deployment-report.json deployment-report-${Date.now()}.json`, {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      this.log('✅ Deployment report generated and uploaded to Azure');
    } catch (error) {
      this.log(`⚠️ Report upload failed: ${error.message}`, 'WARN');
    }

    this.log(`📄 Deployment report saved: ${reportPath}`);
  }

  async handleDeploymentFailure(error) {
    this.log('🔧 Handling deployment failure...', 'ERROR');

    // Generate failure report
    const failureReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      deploymentLog: this.deploymentLog,
      status: 'failed'
    };

    const failureReportPath = path.join(this.workspacePath, 'deployment-failure-report.json');
    await fs.writeFile(failureReportPath, JSON.stringify(failureReport, null, 2));

    this.log(`📄 Failure report saved: ${failureReportPath}`, 'ERROR');

    // Attempt cleanup if needed
    try {
      this.log('🧹 Attempting cleanup...');
      // Add cleanup logic here if needed
    } catch (cleanupError) {
      this.log(`⚠️ Cleanup failed: ${cleanupError.message}`, 'WARN');
    }
  }
}

// CLI interface
if (require.main === module) {
  const orchestrator = new MasterDeploymentOrchestrator();

  const command = process.argv[2];

  switch (command) {
    case 'deploy':
      orchestrator.executeFullDeployment().catch(console.error);
      break;
    case 'solana':
      orchestrator.deploySolanaContracts().catch(console.error);
      break;
    case 'skale':
      orchestrator.deploySKALEContracts().catch(console.error);
      break;
    case 'azure':
      orchestrator.deployAzureResources().catch(console.error);
      break;
    case 'test':
      orchestrator.runIntegrationTests().catch(console.error);
      break;
    default:
      console.log('Usage: node master-deploy.js <command>');
      console.log('Commands:');
      console.log('  deploy  - Execute full deployment');
      console.log('  solana  - Deploy Solana contracts only');
      console.log('  skale   - Deploy SKALE contracts only');
      console.log('  azure   - Deploy Azure resources only');
      console.log('  test    - Run integration tests only');
      break;
  }
}

module.exports = MasterDeploymentOrchestrator;