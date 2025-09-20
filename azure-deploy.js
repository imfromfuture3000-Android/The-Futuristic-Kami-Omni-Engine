#!/usr/bin/env node

/**
 * Azure Resource Deployment Script for Gene Mint Protocol
 * Creates and configures Azure resources for MCP server integration
 */

const { DefaultAzureCredential } = require('@azure/identity');
const { ResourceManagementClient } = require('@azure/arm-resources');
const { KeyVaultManagementClient } = require('@azure/arm-keyvault');
const { StorageManagementClient } = require('@azure/arm-storage');
const { CosmosDBManagementClient } = require('@azure/arm-cosmosdb');
const { WebSiteManagementClient } = require('@azure/arm-appservice');
const fs = require('fs').promises;

class AzureDeployer {
  constructor() {
    this.credential = new DefaultAzureCredential();
    this.subscriptionId = '0c2af5d0-9660-47b1-8009-b44b89aa5962';
    this.resourceGroupName = 'Gene_Mint';
    this.location = 'eastus';

    this.clients = {
      resources: new ResourceManagementClient(this.credential, this.subscriptionId),
      keyVault: new KeyVaultManagementClient(this.credential, this.subscriptionId),
      storage: new StorageManagementClient(this.credential, this.subscriptionId),
      cosmos: new CosmosDBManagementClient(this.credential, this.subscriptionId),
      functions: new WebSiteManagementClient(this.credential, this.subscriptionId)
    };
  }

  async deploy() {
    try {
      console.log('🚀 Starting Azure Resource Deployment for Gene Mint Protocol...');

      // Check if Azure credentials are available
      const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      const clientId = process.env.AZURE_CLIENT_ID;
      const clientSecret = process.env.AZURE_CLIENT_SECRET;
      const tenantId = process.env.AZURE_TENANT_ID;

      if (!subscriptionId || !clientId || !clientSecret || !tenantId) {
        console.log('⚠️  Azure credentials not configured - running in demo mode');
        await this.runDemoDeployment();
        return;
      }

      this.subscriptionId = subscriptionId;
      this.resourceGroupName = process.env.AZURE_RESOURCE_GROUP || 'Gene_Mint';

      // Initialize clients with proper credentials
      this.credential = new DefaultAzureCredential();
      this.clients = {
        resources: new ResourceManagementClient(this.credential, this.subscriptionId),
        keyVault: new KeyVaultManagementClient(this.credential, this.subscriptionId),
        storage: new StorageManagementClient(this.credential, this.subscriptionId),
        cosmos: new CosmosDBManagementClient(this.credential, this.subscriptionId),
        functions: new WebSiteManagementClient(this.credential, this.subscriptionId)
      };

      // Create Resource Group
      await this.createResourceGroup();

      // Deploy Azure Services
      const keyVault = await this.createKeyVault();
      const storage = await this.createStorageAccount();
      const cosmos = await this.createCosmosDB();
      const functions = await this.createFunctionApp();

      // Generate deployment report
      const report = {
        timestamp: new Date().toISOString(),
        subscriptionId: this.subscriptionId,
        resourceGroup: this.resourceGroupName,
        location: this.location,
        resources: {
          keyVault,
          storage,
          cosmos,
          functions
        },
        status: 'completed'
      };

      // Save deployment report
      await fs.writeFile('./azure-deployment-report.json', JSON.stringify(report, null, 2));
      console.log('✅ Deployment completed successfully!');
      console.log('📄 Deployment report saved to azure-deployment-report.json');

      return report;

    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  async runDemoDeployment() {
    console.log('🎭 Running Azure Deployment in Demo Mode...');

    // Simulate Azure resource creation
    console.log('📁 [DEMO] Creating Resource Group: Gene_Mint');
    await this.delay(1000);

    console.log('🔐 [DEMO] Creating Key Vault: omegaprime-kv');
    await this.delay(1000);

    console.log('📦 [DEMO] Creating Storage Account: omegaprimestore');
    await this.delay(1000);

    console.log('🌌 [DEMO] Creating Cosmos DB: OmegaPrimeDB');
    await this.delay(1000);

    console.log('⚡ [DEMO] Creating Function App: omegaprime-functions');
    await this.delay(1000);

    // Generate demo deployment report
    const report = {
      timestamp: new Date().toISOString(),
      mode: 'demo',
      subscriptionId: 'demo-subscription-id',
      resourceGroup: 'Gene_Mint',
      location: 'eastus',
      resources: {
        keyVault: {
          name: 'omegaprime-kv',
          url: 'https://omegaprime-kv.vault.azure.net/',
          status: 'simulated'
        },
        storage: {
          account: 'omegaprimestore',
          container: 'deployments',
          status: 'simulated'
        },
        cosmosDb: {
          account: 'omegaprime-cosmos',
          database: 'OmegaPrimeDB',
          container: 'Deployments',
          status: 'simulated'
        },
        functions: {
          name: 'omegaprime-functions',
          status: 'simulated'
        }
      },
      status: 'demo_completed'
    };

    // Save deployment report
    await fs.writeFile('./azure-deployment-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Demo Deployment completed successfully!');
    console.log('📄 Demo deployment report saved to azure-deployment-report.json');

    return report;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createResourceGroup() {
    console.log('📁 Creating Resource Group...');

    const resourceGroupParams = {
      location: this.location,
      tags: {
        project: 'GeneMint',
        environment: 'production',
        createdBy: 'MCP-Server'
      }
    };

    const result = await this.clients.resources.resourceGroups.createOrUpdate(
      this.resourceGroupName,
      resourceGroupParams
    );

    console.log(`✅ Resource Group '${this.resourceGroupName}' created`);
    return result;
  }

  async createKeyVault() {
    console.log('🔐 Creating Key Vault...');

    const vaultName = 'genemint-kv-' + Math.random().toString(36).substring(2, 8);
    const vaultParams = {
      location: this.location,
      properties: {
        sku: {
          family: 'A',
          name: 'standard'
        },
        tenantId: process.env.AZURE_TENANT_ID,
        accessPolicies: [],
        enabledForDeployment: true,
        enabledForTemplateDeployment: true,
        enabledForDiskEncryption: true,
        enableSoftDelete: true,
        softDeleteRetentionInDays: 90,
        enableRbacAuthorization: false
      }
    };

    const result = await this.clients.keyVault.vaults.createOrUpdate(
      this.resourceGroupName,
      vaultName,
      vaultParams
    );

    console.log(`✅ Key Vault '${vaultName}' created`);
    return {
      name: vaultName,
      uri: result.properties.vaultUri,
      resourceId: result.id
    };
  }

  async createStorageAccount() {
    console.log('📦 Creating Storage Account...');

    const accountName = 'genemintstorage' + Math.random().toString(36).substring(2, 8);
    const storageParams = {
      sku: {
        name: 'Standard_LRS'
      },
      kind: 'StorageV2',
      location: this.location,
      allowBlobPublicAccess: false,
      minimumTlsVersion: 'TLS1_2',
      supportsHttpsTrafficOnly: true,
      encryption: {
        services: {
          blob: {
            enabled: true
          },
          file: {
            enabled: true
          }
        },
        keySource: 'Microsoft.Storage'
      }
    };

    const result = await this.clients.storage.storageAccounts.create(
      this.resourceGroupName,
      accountName,
      storageParams
    );

    console.log(`✅ Storage Account '${accountName}' created`);
    return {
      name: accountName,
      resourceId: result.id
    };
  }

  async createCosmosDB() {
    console.log('🌌 Creating Cosmos DB Account...');

    const accountName = 'genemint-cosmos-' + Math.random().toString(36).substring(2, 8);
    const cosmosParams = {
      location: this.location,
      locations: [{
        locationName: this.location,
        failoverPriority: 0
      }],
      databaseAccountOfferType: 'Standard',
      consistencyPolicy: {
        defaultConsistencyLevel: 'Session'
      },
      enableAutomaticFailover: false,
      enableMultipleWriteLocations: false,
      enableAnalyticalStorage: false,
      capabilities: [{
        name: 'EnableServerless'
      }]
    };

    const result = await this.clients.cosmos.databaseAccounts.createOrUpdate(
      this.resourceGroupName,
      accountName,
      cosmosParams
    );

    console.log(`✅ Cosmos DB '${accountName}' created`);
    return {
      name: accountName,
      endpoint: result.documentEndpoint,
      resourceId: result.id
    };
  }

  async createFunctionApp() {
    console.log('⚡ Creating Azure Functions App...');

    const functionName = 'genemint-functions-' + Math.random().toString(36).substring(2, 8);
    const functionParams = {
      location: this.location,
      kind: 'functionapp',
      properties: {
        siteConfig: {
          linuxFxVersion: 'NODE|18',
          appSettings: [
            {
              name: 'FUNCTIONS_WORKER_RUNTIME',
              value: 'node'
            },
            {
              name: 'WEBSITE_NODE_DEFAULT_VERSION',
              value: '~18'
            }
          ]
        },
        serverFarmId: '/subscriptions/' + this.subscriptionId + '/resourceGroups/' + this.resourceGroupName + '/providers/Microsoft.Web/serverfarms/Default1',
        httpsOnly: true
      }
    };

    const result = await this.clients.functions.webApps.createOrUpdate(
      this.resourceGroupName,
      functionName,
      functionParams
    );

    console.log(`✅ Function App '${functionName}' created`);
    return {
      name: functionName,
      defaultHostname: result.defaultHostname,
      resourceId: result.id
    };
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new AzureDeployer();

  const command = process.argv[2];

  switch (command) {
    case 'deploy':
      deployer.deploy().catch(console.error);
      break;
    case 'resource-group':
      deployer.createResourceGroup().catch(console.error);
      break;
    case 'keyvault':
      deployer.createKeyVault().catch(console.error);
      break;
    case 'storage':
      deployer.createStorageAccount().catch(console.error);
      break;
    case 'cosmos':
      deployer.createCosmosDB().catch(console.error);
      break;
    case 'functions':
      deployer.createFunctionApp().catch(console.error);
      break;
    default:
      console.log('Usage: node azure-deploy.js <command>');
      console.log('Commands:');
      console.log('  deploy         - Deploy all Azure resources');
      console.log('  resource-group - Create resource group only');
      console.log('  keyvault       - Create Key Vault only');
      console.log('  storage        - Create Storage Account only');
      console.log('  cosmos         - Create Cosmos DB only');
      console.log('  functions      - Create Function App only');
      break;
  }
}

module.exports = AzureDeployer;