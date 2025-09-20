#!/usr/bin/env node

/**
 * Azure MCP Full Deployment Script
 * Handles complete Azure infrastructure setup and MCP server deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AzureMCPDeployer {
  constructor() {
    this.resourceGroup = 'OmegaPrime-RG';
    this.location = 'eastus';
    this.projectName = 'OmegaPrime';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async setupAzureResources() {
    this.log('🔧 Setting up Azure resources...');

    try {
      // Create Resource Group
      this.log('Creating resource group...');
      execSync(`az group create --name ${this.resourceGroup} --location ${this.location} --tags project=${this.projectName}`, { stdio: 'inherit' });

      // Create Storage Account
      this.log('Creating storage account...');
      execSync(`az storage account create --name ${process.env.AZURE_STORAGE_ACCOUNT} --resource-group ${this.resourceGroup} --location ${this.location} --sku Standard_LRS --kind StorageV2`, { stdio: 'inherit' });

      // Create Key Vault
      this.log('Creating key vault...');
      execSync(`az keyvault create --name ${process.env.AZURE_KEYVAULT_NAME} --resource-group ${this.resourceGroup} --location ${this.location}`, { stdio: 'inherit' });

      // Create Cosmos DB
      this.log('Creating Cosmos DB...');
      execSync(`az cosmosdb create --name ${process.env.AZURE_COSMOS_ACCOUNT} --resource-group ${this.resourceGroup} --locations regionName=${this.location} failoverPriority=0`, { stdio: 'inherit' });

      // Create Function App
      this.log('Creating function app...');
      execSync(`az functionapp create --resource-group ${this.resourceGroup} --consumption-plan-location ${this.location} --runtime node --runtime-version 18 --functions-version 4 --name ${process.env.AZURE_FUNCTION_APP} --storage-account ${process.env.AZURE_STORAGE_ACCOUNT}`, { stdio: 'inherit' });

      this.log('✅ Azure resources setup complete!', 'success');
    } catch (error) {
      this.log(`❌ Azure resources setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async configureSecrets() {
    this.log('🔐 Configuring secrets in Key Vault...');

    try {
      // Store relayer keys
      if (process.env.OCTANE_KEYPAIR_JSON) {
        execSync(`az keyvault secret set --vault-name ${process.env.AZURE_KEYVAULT_NAME} --name "octane-relayer-key" --value "${process.env.OCTANE_KEYPAIR_JSON}"`, { stdio: 'inherit' });
      }

      if (process.env.BICONOMY_API_KEY) {
        execSync(`az keyvault secret set --vault-name ${process.env.AZURE_KEYVAULT_NAME} --name "biconomy-api-key" --value "${process.env.BICONOMY_API_KEY}"`, { stdio: 'inherit' });
      }

      // Store OpenAI key
      if (process.env.AZURE_OPENAI_KEY) {
        execSync(`az keyvault secret set --vault-name ${process.env.AZURE_KEYVAULT_NAME} --name "openai-api-key" --value "${process.env.AZURE_OPENAI_KEY}"`, { stdio: 'inherit' });
      }

      this.log('✅ Secrets configured!', 'success');
    } catch (error) {
      this.log(`❌ Secret configuration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployMCP() {
    this.log('🚀 Deploying Azure MCP Server...');

    try {
      // Install dependencies
      this.log('Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });

      // Start MCP server
      this.log('Starting Azure MCP Server...');
      const serverProcess = execSync('npm run azure:start', { stdio: 'inherit', detached: true });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Health check
      this.log('Performing health check...');
      execSync('curl -f http://localhost:3002/health', { stdio: 'inherit' });

      this.log('✅ Azure MCP Server deployed!', 'success');
      return serverProcess;
    } catch (error) {
      this.log(`❌ MCP deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async triggerMutations() {
    this.log('🧬 Triggering Sacred Matrix mutations...');

    try {
      execSync('npm run azure:mutate', { stdio: 'inherit' });
      this.log('✅ Mutations triggered!', 'success');
    } catch (error) {
      this.log(`❌ Mutation trigger failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployToBlockchains() {
    this.log('🌐 Deploying to blockchains...');

    try {
      // Deploy to Solana
      this.log('Deploying to Solana via Octane...');
      execSync('node scripts/solana_zero_cost_deploy.js target/deploy/mint_gene.so target/deploy/mint_gene-keypair.json mainnet', { stdio: 'inherit' });

      // Deploy to SKALE
      this.log('Deploying to SKALE via Biconomy...');
      execSync('node scripts/skale_mainnet_zero_cost_deploy.js MintGene', { stdio: 'inherit' });

      this.log('✅ Blockchain deployments complete!', 'success');
    } catch (error) {
      this.log(`❌ Blockchain deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async uploadReports() {
    this.log('📤 Uploading deployment reports...');

    try {
      const report = {
        status: 'success',
        timestamp: new Date().toISOString(),
        mutations: 'applied',
        azureResources: {
          resourceGroup: this.resourceGroup,
          location: this.location,
          storageAccount: process.env.AZURE_STORAGE_ACCOUNT,
          keyVault: process.env.AZURE_KEYVAULT_NAME,
          cosmosDb: process.env.AZURE_COSMOS_ACCOUNT,
          functionApp: process.env.AZURE_FUNCTION_APP
        }
      };

      fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));

      // Upload via MCP server
      execSync(`curl -X POST http://localhost:3002/storage/upload -H "Content-Type: application/json" -d '{"containerName": "deployments", "fileName": "deployment-report-${Date.now()}.json", "content": "${JSON.stringify(report).replace(/"/g, '\\"')}"}'`, { stdio: 'inherit' });

      this.log('✅ Reports uploaded!', 'success');
    } catch (error) {
      this.log(`❌ Report upload failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runAnalytics() {
    this.log('📊 Running analytics...');

    try {
      // Query Cosmos DB
      execSync(`curl -X POST http://localhost:3002/cosmos/query -H "Content-Type: application/json" -d '{"databaseId": "OmegaPrimeDB", "containerId": "MintEvents", "query": "SELECT * FROM c WHERE c.logicId = 7"}'`, { stdio: 'inherit' });

      // Get monitor metrics
      execSync('curl "http://localhost:3002/monitor/metrics?metricNames=Requests,Http5xx"', { stdio: 'inherit' });

      this.log('✅ Analytics complete!', 'success');
    } catch (error) {
      this.log(`❌ Analytics failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up...');

    try {
      // Kill MCP server
      execSync('pkill -f "azure-mcp-server.js"', { stdio: 'inherit' });

      this.log('✅ Cleanup complete!', 'success');
    } catch (error) {
      this.log(`⚠️ Cleanup warning: ${error.message}`, 'warning');
    }
  }

  async fullDeploy() {
    this.log('🚀 Starting Azure MCP Full Deployment...');

    try {
      await this.setupAzureResources();
      await this.configureSecrets();
      await this.deployMCP();
      await this.triggerMutations();
      await this.deployToBlockchains();
      await this.uploadReports();
      await this.runAnalytics();

      this.log('🎉 Azure MCP Full Deployment Complete!', 'success');
      this.log('📊 Deployment Summary:');
      this.log(`   - Resource Group: ${this.resourceGroup}`);
      this.log(`   - Location: ${this.location}`);
      this.log(`   - Storage Account: ${process.env.AZURE_STORAGE_ACCOUNT}`);
      this.log(`   - Key Vault: ${process.env.AZURE_KEYVAULT_NAME}`);
      this.log(`   - Cosmos DB: ${process.env.AZURE_COSMOS_ACCOUNT}`);
      this.log(`   - Function App: ${process.env.AZURE_FUNCTION_APP}`);

    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      await this.cleanup();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployer = new AzureMCPDeployer();
  deployer.fullDeploy().catch(console.error);
}

module.exports = AzureMCPDeployer;