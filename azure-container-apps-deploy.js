#!/usr/bin/env node

/**
 * Azure Container Apps Deployment Script for Dashboard
 * Handles Azure authentication and deploys the dashboard to Azure Container Apps
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AzureContainerAppsDeployer {
  constructor() {
    this.resourceGroup = 'empire-dashboard-rg';
    this.location = 'eastus';
    this.containerAppName = 'empire-dashboard-app';
    this.containerEnvironmentName = 'empire-dashboard-env';
    this.acrName = 'empiredashboardacr' + Math.random().toString(36).substring(2, 8);
    this.imageName = 'empire-dashboard';
    this.imageTag = 'latest';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${prefix[type]} [${timestamp}] ${message}`);
  }

  async checkAzureLogin() {
    this.log('Checking Azure authentication status...');
    
    try {
      execSync('az account show', { stdio: 'pipe' });
      this.log('Already authenticated to Azure', 'success');
      return true;
    } catch (error) {
      this.log('Not authenticated to Azure', 'warning');
      return false;
    }
  }

  async ensureContainerAppsExtension() {
    this.log('Checking Azure Container Apps extension...');
    
    try {
      // Check if extension is installed
      const extensions = execSync('az extension list --query "[?name==\'containerapp\'].name" -o tsv', { encoding: 'utf8' });
      
      if (!extensions.trim()) {
        this.log('Installing Azure Container Apps extension...');
        execSync('az extension add --name containerapp --upgrade', { stdio: 'inherit' });
        this.log('Container Apps extension installed successfully', 'success');
      } else {
        this.log('Container Apps extension already installed', 'success');
      }
    } catch (error) {
      this.log(`Extension check/install failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async loginToAzure() {
    this.log('Starting Azure authentication process...');
    
    try {
      // Use device code login for better automation support
      this.log('Please follow the device code authentication flow...');
      execSync('az login --use-device-code', { stdio: 'inherit' });
      
      this.log('Azure authentication successful!', 'success');
      
      // Display account information
      const accountInfo = execSync('az account show', { encoding: 'utf8' });
      const account = JSON.parse(accountInfo);
      this.log(`Logged in as: ${account.user.name}`);
      this.log(`Subscription: ${account.name} (${account.id})`);
      
      return true;
    } catch (error) {
      this.log(`Azure authentication failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createResourceGroup() {
    this.log(`Creating resource group: ${this.resourceGroup}`);
    
    try {
      execSync(`az group create --name ${this.resourceGroup} --location ${this.location}`, 
        { stdio: 'inherit' });
      this.log('Resource group created successfully', 'success');
    } catch (error) {
      this.log(`Resource group creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createContainerRegistry() {
    this.log(`Creating Azure Container Registry: ${this.acrName}`);
    
    try {
      execSync(`az acr create --resource-group ${this.resourceGroup} --name ${this.acrName} --sku Basic`, 
        { stdio: 'inherit' });
      
      // Enable admin user for simplicity
      execSync(`az acr update -n ${this.acrName} --admin-enabled true`, 
        { stdio: 'inherit' });
      
      this.log('Container Registry created successfully', 'success');
    } catch (error) {
      this.log(`Container Registry creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async buildAndPushImage() {
    this.log('Building and pushing Docker image...');
    
    try {
      // Navigate to dashboard directory
      const dashboardPath = path.join(__dirname, 'dashboard');
      
      // Build image using ACR build (builds in Azure)
      execSync(`az acr build --registry ${this.acrName} --image ${this.imageName}:${this.imageTag} ${dashboardPath}`, 
        { stdio: 'inherit' });
      
      this.log('Docker image built and pushed successfully', 'success');
    } catch (error) {
      this.log(`Image build/push failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createContainerEnvironment() {
    this.log(`Creating Container Apps environment: ${this.containerEnvironmentName}`);
    
    try {
      execSync(`az containerapp env create --name ${this.containerEnvironmentName} --resource-group ${this.resourceGroup} --location ${this.location}`, 
        { stdio: 'inherit' });
      
      this.log('Container Apps environment created successfully', 'success');
    } catch (error) {
      this.log(`Container Apps environment creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployContainerApp() {
    this.log(`Deploying container app: ${this.containerAppName}`);
    
    try {
      const imageUrl = `${this.acrName}.azurecr.io/${this.imageName}:${this.imageTag}`;
      
      // Get ACR credentials
      const acrCredentials = execSync(`az acr credential show --name ${this.acrName}`, 
        { encoding: 'utf8' });
      const credentials = JSON.parse(acrCredentials);
      
      // Create container app
      execSync(`az containerapp create \\
        --name ${this.containerAppName} \\
        --resource-group ${this.resourceGroup} \\
        --environment ${this.containerEnvironmentName} \\
        --image ${imageUrl} \\
        --target-port 3000 \\
        --ingress external \\
        --registry-server ${this.acrName}.azurecr.io \\
        --registry-username ${credentials.username} \\
        --registry-password ${credentials.passwords[0].value} \\
        --cpu 0.25 \\
        --memory 0.5Gi \\
        --min-replicas 1 \\
        --max-replicas 3`, 
        { stdio: 'inherit', shell: true });
      
      this.log('Container app deployed successfully', 'success');
      
      // Get the app URL
      const appInfo = execSync(`az containerapp show --name ${this.containerAppName} --resource-group ${this.resourceGroup} --query properties.configuration.ingress.fqdn -o tsv`, 
        { encoding: 'utf8' });
      
      const appUrl = `https://${appInfo.trim()}`;
      this.log(`🌐 Dashboard deployed at: ${appUrl}`, 'success');
      
      return appUrl;
    } catch (error) {
      this.log(`Container app deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateDeploymentReport(appUrl) {
    this.log('Generating deployment report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      status: 'success',
      resourceGroup: this.resourceGroup,
      location: this.location,
      containerAppName: this.containerAppName,
      containerRegistry: this.acrName,
      applicationUrl: appUrl,
      deploymentDetails: {
        image: `${this.acrName}.azurecr.io/${this.imageName}:${this.imageTag}`,
        cpu: '0.25',
        memory: '0.5Gi',
        replicas: '1-3'
      }
    };
    
    await fs.writeFile('azure-containerapp-deployment-report.json', JSON.stringify(report, null, 2));
    this.log('Deployment report saved to azure-containerapp-deployment-report.json', 'success');
    
    return report;
  }

  async deploy() {
    try {
      this.log('🚀 Starting Azure Container Apps deployment for Dashboard...');
      
      // Check authentication status
      const isLoggedIn = await this.checkAzureLogin();
      if (!isLoggedIn) {
        await this.loginToAzure();
      }
      
      // Ensure Container Apps extension is installed
      await this.ensureContainerAppsExtension();
      
      // Deploy infrastructure and application
      await this.createResourceGroup();
      await this.createContainerRegistry();
      await this.buildAndPushImage();
      await this.createContainerEnvironment();
      const appUrl = await this.deployContainerApp();
      
      // Generate report
      const report = await this.generateDeploymentReport(appUrl);
      
      this.log('🎉 Azure Container Apps deployment completed successfully!', 'success');
      this.log('📊 Deployment Summary:', 'success');
      this.log(`   - Resource Group: ${this.resourceGroup}`);
      this.log(`   - Container Registry: ${this.acrName}.azurecr.io`);
      this.log(`   - Application URL: ${appUrl}`);
      this.log(`   - Container App: ${this.containerAppName}`);
      
      return report;
      
    } catch (error) {
      this.log(`💥 Deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up temporary files...');
    // Add cleanup logic if needed
  }
}

// Command-line interface
async function main() {
  const deployer = new AzureContainerAppsDeployer();
  
  try {
    const report = await deployer.deploy();
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  } finally {
    await deployer.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AzureContainerAppsDeployer;