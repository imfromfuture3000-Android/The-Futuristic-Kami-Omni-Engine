#!/usr/bin/env node

/**
 * Complete Azure Integration Setup for Gene Mint Protocol
 * This script sets up all Azure resources and configures the MCP server
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class AzureSetupManager {
  constructor() {
    this.workspacePath = process.cwd();
    this.config = null;
  }

  async setup() {
    try {
      console.log('🚀 Starting Complete Azure Integration Setup...');

      // Load configuration
      await this.loadConfiguration();

      // Step 1: Deploy Azure Resources
      console.log('\n📦 Step 1: Deploying Azure Resources...');
      await this.deployAzureResources();

      // Step 2: Configure Environment Variables
      console.log('\n🔧 Step 2: Configuring Environment Variables...');
      await this.configureEnvironment();

      // Step 3: Setup Azure Functions
      console.log('\n⚡ Step 3: Setting up Azure Functions...');
      await this.setupAzureFunctions();

      // Step 4: Initialize Azure Integration
      console.log('\n🔗 Step 4: Initializing Azure Integration...');
      await this.initializeAzureIntegration();

      // Step 5: Test Integration
      console.log('\n🧪 Step 5: Testing Integration...');
      await this.testIntegration();

      console.log('\n✅ Azure Integration Setup Complete!');
      console.log('🎉 Your Gene Mint Protocol is now enhanced with Azure AI capabilities!');

    } catch (error) {
      console.error('❌ Setup failed:', error);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Ensure you have Azure CLI installed and authenticated');
      console.log('2. Check your Azure subscription permissions');
      console.log('3. Verify the .env file has correct Azure credentials');
      console.log('4. Run: az login --use-device-code');
      throw error;
    }
  }

  async loadConfiguration() {
    console.log('📋 Loading configuration...');

    const configPath = path.join(this.workspacePath, 'mcp-server-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configData);

    console.log('✅ Configuration loaded');
  }

  async deployAzureResources() {
    console.log('🏗️  Deploying Azure resources...');

    try {
      // Run the Azure deployment script
      execSync('node azure-deploy.js deploy', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      // Load deployment report
      const reportPath = path.join(this.workspacePath, 'azure-deployment-report.json');
      const reportData = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportData);

      console.log('✅ Azure resources deployed successfully');
      console.log(`🔐 Key Vault: ${report.resources.keyVault.name}`);
      console.log(`📦 Storage: ${report.resources.storage.name}`);
      console.log(`🌌 Cosmos DB: ${report.resources.cosmos.name}`);
      console.log(`⚡ Functions: ${report.resources.functions.name}`);

      return report;

    } catch (error) {
      console.error('❌ Azure resource deployment failed');
      throw error;
    }
  }

  async configureEnvironment() {
    console.log('🔧 Configuring environment variables...');

    const envPath = path.join(this.workspacePath, '.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // .env doesn't exist, create it
      console.log('📝 Creating .env file...');
    }

    // Load deployment report to get resource details
    const reportPath = path.join(this.workspacePath, 'azure-deployment-report.json');
    const reportData = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportData);

    // Add Azure resource configurations
    const azureConfig = `
# Azure Integration Configuration
AZURE_SUBSCRIPTION_ID=${this.config.azureIntegration.subscriptionId}
AZURE_RESOURCE_GROUP=${this.config.azureIntegration.resourceGroup}
AZURE_LOCATION=eastus

# Azure Key Vault
AZURE_KEYVAULT_NAME=${report.resources.keyVault.name}
AZURE_KEYVAULT_URI=${report.resources.keyVault.uri}

# Azure Storage
AZURE_STORAGE_ACCOUNT=${report.resources.storage.name}
AZURE_STORAGE_CONTAINER=genemint-reports

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=${report.resources.cosmos.endpoint}
AZURE_COSMOS_DATABASE=genemint-db
AZURE_COSMOS_CONTAINER=mint-events

# Azure Functions
AZURE_FUNCTIONS_NAME=${report.resources.functions.name}
AZURE_FUNCTIONS_ENDPOINT=https://${report.resources.functions.defaultHostname}

# Azure OpenAI (from existing config)
AZURE_OPENAI_ENDPOINT=${process.env.AZURE_OPENAI_ENDPOINT || 'https://CreatorFutureDuo.openai.azure.com/'}
AZURE_OPENAI_KEY=${process.env.AZURE_OPENAI_KEY || 'your-azure-openai-key'}
AZURE_OPENAI_MODEL=gpt-4

# Azure Authentication
AZURE_TENANT_ID=${process.env.AZURE_TENANT_ID || 'your-tenant-id'}
AZURE_CLIENT_ID=${process.env.AZURE_CLIENT_ID || 'your-client-id'}
AZURE_CLIENT_SECRET=${process.env.AZURE_CLIENT_SECRET || 'your-client-secret'}
`;

    // Append to existing .env content
    const updatedEnv = envContent + '\n' + azureConfig;

    await fs.writeFile(envPath, updatedEnv);
    console.log('✅ Environment variables configured');
  }

  async setupAzureFunctions() {
    console.log('⚡ Setting up Azure Functions...');

    // Create function.json for each function
    const functionsDir = path.join(this.workspacePath, 'azure-functions');
    await fs.mkdir(functionsDir, { recursive: true });

    // Trait Fusion Function
    const traitFusionDir = path.join(functionsDir, 'TraitFusion');
    await fs.mkdir(traitFusionDir, { recursive: true });

    const traitFusionFunction = {
      "bindings": [
        {
          "authLevel": "function",
          "type": "httpTrigger",
          "direction": "in",
          "name": "req",
          "methods": ["post"]
        },
        {
          "type": "http",
          "direction": "out",
          "name": "res"
        }
      ]
    };

    await fs.writeFile(
      path.join(traitFusionDir, 'function.json'),
      JSON.stringify(traitFusionFunction, null, 2)
    );

    // Sacred Logic Function
    const sacredLogicDir = path.join(functionsDir, 'GenerateSacredLogic');
    await fs.mkdir(sacredLogicDir, { recursive: true });

    const sacredLogicFunction = {
      "bindings": [
        {
          "authLevel": "function",
          "type": "httpTrigger",
          "direction": "in",
          "name": "req",
          "methods": ["post"]
        },
        {
          "type": "http",
          "direction": "out",
          "name": "res"
        }
      ]
    };

    await fs.writeFile(
      path.join(sacredLogicDir, 'function.json'),
      JSON.stringify(sacredLogicFunction, null, 2)
    );

    // Copy function code
    const functionsCode = await fs.readFile(path.join(this.workspacePath, 'azure-functions.js'), 'utf8');

    await fs.writeFile(path.join(traitFusionDir, 'index.js'), functionsCode);
    await fs.writeFile(path.join(sacredLogicDir, 'index.js'), functionsCode);

    console.log('✅ Azure Functions configured');
  }

  async initializeAzureIntegration() {
    console.log('🔗 Initializing Azure Integration...');

    try {
      // Run Azure integration initialization
      execSync('node azure-integration.js init', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      console.log('✅ Azure Integration initialized');
    } catch (error) {
      console.error('❌ Azure Integration initialization failed');
      throw error;
    }
  }

  async testIntegration() {
    console.log('🧪 Testing Azure Integration...');

    try {
      // Test MCP server health
      execSync('npm run azure:health', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      // Test Azure integration
      execSync('node azure-integration.js analytics', {
        stdio: 'inherit',
        cwd: this.workspacePath
      });

      console.log('✅ Integration tests passed');
    } catch (error) {
      console.warn('⚠️  Some tests failed, but setup is complete');
      console.log('You can run individual tests manually:');
      console.log('- npm run azure:health');
      console.log('- node azure-integration.js analytics');
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up temporary files...');

    const filesToClean = [
      'package-new.json'
    ];

    for (const file of filesToClean) {
      try {
        await fs.unlink(path.join(this.workspacePath, file));
        console.log(`🗑️  Removed ${file}`);
      } catch (error) {
        // File doesn't exist, continue
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const setup = new AzureSetupManager();

  const command = process.argv[2];

  switch (command) {
    case 'setup':
      setup.setup()
        .then(() => setup.cleanup())
        .catch(console.error);
      break;
    case 'deploy':
      setup.deployAzureResources().catch(console.error);
      break;
    case 'configure':
      setup.configureEnvironment().catch(console.error);
      break;
    case 'functions':
      setup.setupAzureFunctions().catch(console.error);
      break;
    case 'init':
      setup.initializeAzureIntegration().catch(console.error);
      break;
    case 'test':
      setup.testIntegration().catch(console.error);
      break;
    case 'cleanup':
      setup.cleanup().catch(console.error);
      break;
    default:
      console.log('Usage: node azure-setup.js <command>');
      console.log('Commands:');
      console.log('  setup     - Complete Azure integration setup');
      console.log('  deploy    - Deploy Azure resources only');
      console.log('  configure - Configure environment only');
      console.log('  functions - Setup Azure Functions only');
      console.log('  init      - Initialize Azure integration only');
      console.log('  test      - Test integration only');
      console.log('  cleanup   - Clean up temporary files');
      break;
  }
}

module.exports = AzureSetupManager;