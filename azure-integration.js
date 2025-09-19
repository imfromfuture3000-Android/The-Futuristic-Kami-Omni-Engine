#!/usr/bin/env node

/**
 * Azure Integration Module for Gene Mint Protocol
 * Handles Azure services integration with MCP server
 */

const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');
const { WebSiteManagementClient } = require('@azure/arm-appservice');

class AzureIntegration {
  constructor() {
    this.config = null;
    this.credential = new DefaultAzureCredential();
    this.subscriptionId = '0c2af5d0-9660-47b1-8009-b44b89aa5962';
    this.resourceGroup = 'Gene_Mint';

    this.clients = {
      keyVault: null,
      storage: null,
      cosmos: null,
      functions: null
    };
  }

  async initialize() {
    try {
      // Load configuration
      const fs = require('fs').promises;
      const configPath = './mcp-server-config.json';
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);

      console.log('🔧 Initializing Azure Integration...');

      // Initialize Azure clients
      await this.initializeKeyVault();
      await this.initializeStorage();
      await this.initializeCosmosDB();
      await this.initializeFunctions();

      console.log('✅ Azure Integration initialized successfully');
      console.log(`📍 Subscription: ${this.subscriptionId}`);
      console.log(`📁 Resource Group: ${this.resourceGroup}`);

    } catch (error) {
      console.error('❌ Failed to initialize Azure Integration:', error);
      throw error;
    }
  }

  async initializeKeyVault() {
    const keyVaultConfig = this.config.azureIntegration.services.keyVault;
    this.clients.keyVault = new SecretClient(keyVaultConfig.uri, this.credential);
    console.log(`🔐 Key Vault initialized: ${keyVaultConfig.name}`);
  }

  async initializeStorage() {
    const storageConfig = this.config.azureIntegration.services.storage;
    const accountName = storageConfig.account;
    const accountKey = await this.getSecret('storage-key');

    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
    this.clients.storage = BlobServiceClient.fromConnectionString(connectionString);
    console.log(`📦 Storage initialized: ${accountName}`);
  }

  async initializeCosmosDB() {
    const cosmosConfig = this.config.azureIntegration.services.cosmosDb;
    const key = await this.getSecret('cosmos-key');

    this.clients.cosmos = new CosmosClient({
      endpoint: cosmosConfig.endpoint,
      key: key
    });
    console.log(`🌌 Cosmos DB initialized: ${cosmosConfig.database}`);
  }

  async initializeFunctions() {
    this.clients.functions = new WebSiteManagementClient(this.credential, this.subscriptionId);
    console.log(`⚡ Azure Functions initialized`);
  }

  // Key Vault Operations
  async getSecret(secretName) {
    try {
      const secret = await this.clients.keyVault.getSecret(secretName);
      return secret.value;
    } catch (error) {
      console.error(`❌ Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async setSecret(secretName, value) {
    try {
      await this.clients.keyVault.setSecret(secretName, value);
      console.log(`✅ Secret ${secretName} stored in Key Vault`);
    } catch (error) {
      console.error(`❌ Failed to set secret ${secretName}:`, error);
      throw error;
    }
  }

  // Storage Operations
  async uploadDeploymentReport(reportData, fileName) {
    try {
      const containerName = this.config.azureIntegration.services.storage.container;
      const containerClient = this.clients.storage.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(fileName);

      const data = JSON.stringify(reportData, null, 2);
      await blobClient.upload(data, data.length);

      console.log(`📤 Deployment report uploaded: ${fileName}`);
      return blobClient.url;
    } catch (error) {
      console.error('❌ Failed to upload deployment report:', error);
      throw error;
    }
  }

  // Cosmos DB Operations
  async storeMintEvent(eventData) {
    try {
      const database = this.clients.cosmos.database(this.config.azureIntegration.services.cosmosDb.database);
      const container = database.container(this.config.azureIntegration.services.cosmosDb.container);

      const { resource } = await container.items.create(eventData);
      console.log(`📊 Mint event stored: ${resource.id}`);
      return resource;
    } catch (error) {
      console.error('❌ Failed to store mint event:', error);
      throw error;
    }
  }

  async queryMintEvents(query) {
    try {
      const database = this.clients.cosmos.database(this.config.azureIntegration.services.cosmosDb.database);
      const container = database.container(this.config.azureIntegration.services.cosmosDb.container);

      const { resources } = await container.items.query(query).fetchAll();
      console.log(`📊 Query returned ${resources.length} mint events`);
      return resources;
    } catch (error) {
      console.error('❌ Failed to query mint events:', error);
      throw error;
    }
  }

  // Azure Functions Operations
  async triggerTraitFusion(traitA, traitB) {
    try {
      const functionUrl = `${this.config.azureIntegration.services.functions.endpoint}TraitFusion`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traitA, traitB })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`🧬 Trait fusion triggered: ${result.fusionId}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to trigger trait fusion:', error);
      throw error;
    }
  }

  async generateSacredLogic(logicId) {
    try {
      const functionUrl = `${this.config.azureIntegration.services.functions.endpoint}GenerateSacredLogic`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logicId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`🔮 Sacred logic generated: ${result.logic}`);
      return result;
    } catch (error) {
      console.error('❌ Failed to generate sacred logic:', error);
      throw error;
    }
  }

  // Utility Methods
  async secureRelayerKeys() {
    console.log('🔐 Securing relayer keys in Azure Key Vault...');

    const secrets = [
      { name: 'octane-key', value: process.env.OCTANE_KEYPAIR_JSON },
      { name: 'biconomy-api', value: process.env.BICONOMY_API_KEY },
      { name: 'helius-api', value: process.env.HELIUS_API_KEY },
      { name: 'solana-private-key', value: process.env.PRIVATE_KEY }
    ];

    for (const secret of secrets) {
      if (secret.value) {
        await this.setSecret(secret.name, secret.value);
      }
    }

    console.log('✅ All relayer keys secured in Key Vault');
  }

  async getAnalyticsDashboard() {
    try {
      // Query recent mint events
      const recentEvents = await this.queryMintEvents(
        'SELECT * FROM c WHERE c.timestamp > @cutoff',
        [{ name: '@cutoff', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }]
      );

      // Calculate analytics
      const analytics = {
        totalMints: recentEvents.length,
        logicDistribution: {},
        performanceMetrics: {},
        timestamp: new Date().toISOString()
      };

      // Group by logic ID
      recentEvents.forEach(event => {
        const logicId = event.logicId || 'unknown';
        analytics.logicDistribution[logicId] = (analytics.logicDistribution[logicId] || 0) + 1;
      });

      console.log('📊 Analytics dashboard generated');
      return analytics;
    } catch (error) {
      console.error('❌ Failed to generate analytics dashboard:', error);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = AzureIntegration;

// CLI interface
if (require.main === module) {
  const azure = new AzureIntegration();

  const command = process.argv[2];

  switch (command) {
    case 'init':
      azure.initialize().catch(console.error);
      break;
    case 'secure-keys':
      azure.initialize()
        .then(() => azure.secureRelayerKeys())
        .catch(console.error);
      break;
    case 'analytics':
      azure.initialize()
        .then(() => azure.getAnalyticsDashboard())
        .then(analytics => console.log(JSON.stringify(analytics, null, 2)))
        .catch(console.error);
      break;
    case 'fusion':
      const [traitA, traitB] = process.argv.slice(3);
      azure.initialize()
        .then(() => azure.triggerTraitFusion(traitA, traitB))
        .then(result => console.log(JSON.stringify(result, null, 2)))
        .catch(console.error);
      break;
    default:
      console.log('Usage: node azure-integration.js <command>');
      console.log('Commands:');
      console.log('  init         - Initialize Azure integration');
      console.log('  secure-keys  - Secure relayer keys in Key Vault');
      console.log('  analytics    - Generate analytics dashboard');
      console.log('  fusion <A> <B> - Trigger trait fusion');
      break;
  }
}