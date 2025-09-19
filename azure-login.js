#!/usr/bin/env node

/**
 * Azure CLI Login Helper
 * Simplified Azure authentication with multiple login methods
 */

const { execSync } = require('child_process');

class AzureLoginManager {
  constructor() {
    this.loginMethods = {
      'device-code': 'az login --use-device-code',
      'interactive': 'az login',
      'service-principal': 'az login --service-principal'
    };
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

  async checkLoginStatus() {
    this.log('Checking Azure authentication status...');
    
    try {
      const accountInfo = execSync('az account show', { encoding: 'utf8' });
      const account = JSON.parse(accountInfo);
      
      this.log('✅ Already authenticated to Azure', 'success');
      this.log(`👤 User: ${account.user.name}`);
      this.log(`📧 Type: ${account.user.type}`);
      this.log(`🏢 Subscription: ${account.name}`);
      this.log(`🆔 ID: ${account.id}`);
      this.log(`🌍 Tenant: ${account.tenantId}`);
      
      return {
        isLoggedIn: true,
        account: account
      };
    } catch (error) {
      this.log('❌ Not authenticated to Azure', 'warning');
      return {
        isLoggedIn: false,
        account: null
      };
    }
  }

  async loginWithDeviceCode() {
    this.log('🔐 Starting Azure login with device code...');
    
    try {
      this.log('📱 Please follow the device code authentication flow in your browser');
      execSync('az login --use-device-code', { stdio: 'inherit' });
      
      return await this.checkLoginStatus();
    } catch (error) {
      this.log(`❌ Device code login failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async loginInteractive() {
    this.log('🔐 Starting Azure interactive login...');
    
    try {
      this.log('🌐 Opening browser for interactive authentication...');
      execSync('az login', { stdio: 'inherit' });
      
      return await this.checkLoginStatus();
    } catch (error) {
      this.log(`❌ Interactive login failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async listSubscriptions() {
    this.log('📋 Fetching available subscriptions...');
    
    try {
      const subscriptions = execSync('az account list --output table', { encoding: 'utf8' });
      console.log('\\n📊 Available Subscriptions:');
      console.log(subscriptions);
      
      return subscriptions;
    } catch (error) {
      this.log(`❌ Failed to list subscriptions: ${error.message}`, 'error');
      throw error;
    }
  }

  async setSubscription(subscriptionId) {
    this.log(`🎯 Setting active subscription to: ${subscriptionId}`);
    
    try {
      execSync(`az account set --subscription ${subscriptionId}`, { stdio: 'inherit' });
      this.log('✅ Subscription set successfully', 'success');
      
      return await this.checkLoginStatus();
    } catch (error) {
      this.log(`❌ Failed to set subscription: ${error.message}`, 'error');
      throw error;
    }
  }

  async logout() {
    this.log('👋 Logging out from Azure...');
    
    try {
      execSync('az logout', { stdio: 'inherit' });
      this.log('✅ Successfully logged out from Azure', 'success');
    } catch (error) {
      this.log(`❌ Logout failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async ensureAuthentication(method = 'device-code') {
    const status = await this.checkLoginStatus();
    
    if (status.isLoggedIn) {
      this.log('✅ Azure authentication verified', 'success');
      return status;
    }
    
    this.log(`🔐 Authentication required. Using method: ${method}`);
    
    switch (method) {
      case 'device-code':
        return await this.loginWithDeviceCode();
      case 'interactive':
        return await this.loginInteractive();
      default:
        throw new Error(`Unsupported login method: ${method}`);
    }
  }
}

// Command-line interface
async function main() {
  const loginManager = new AzureLoginManager();
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  try {
    switch (command) {
      case 'status':
        await loginManager.checkLoginStatus();
        break;
        
      case 'login':
        const method = args[1] || 'device-code';
        await loginManager.ensureAuthentication(method);
        break;
        
      case 'device-code':
        await loginManager.loginWithDeviceCode();
        break;
        
      case 'interactive':
        await loginManager.loginInteractive();
        break;
        
      case 'subscriptions':
        await loginManager.listSubscriptions();
        break;
        
      case 'set-subscription':
        const subscriptionId = args[1];
        if (!subscriptionId) {
          console.error('❌ Please provide subscription ID');
          process.exit(1);
        }
        await loginManager.setSubscription(subscriptionId);
        break;
        
      case 'logout':
        await loginManager.logout();
        break;
        
      default:
        console.log('Azure Login Manager Usage:');
        console.log('  node azure-login.js status              - Check login status');
        console.log('  node azure-login.js login [method]      - Login with specified method');
        console.log('  node azure-login.js device-code         - Login with device code');
        console.log('  node azure-login.js interactive         - Login interactively');
        console.log('  node azure-login.js subscriptions       - List subscriptions');
        console.log('  node azure-login.js set-subscription ID - Set active subscription');
        console.log('  node azure-login.js logout              - Logout');
        break;
    }
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AzureLoginManager;