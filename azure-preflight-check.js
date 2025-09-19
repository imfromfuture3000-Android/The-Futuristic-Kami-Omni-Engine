#!/usr/bin/env node

/**
 * Azure Deployment Pre-flight Checker
 * Validates readiness for Azure Container Apps deployment
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class PreflightChecker {
  constructor() {
    this.checks = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${prefix[type]} ${message}`);
  }

  async checkAzureCLI() {
    this.log('Checking Azure CLI installation...');
    
    try {
      const version = execSync('az version', { encoding: 'utf8' });
      const versionInfo = JSON.parse(version);
      this.log(`Azure CLI version: ${versionInfo['azure-cli']}`, 'success');
      return true;
    } catch (error) {
      this.log('Azure CLI not installed or not accessible', 'error');
      return false;
    }
  }

  async checkContainerAppsExtension() {
    this.log('Checking Container Apps extension...');
    
    try {
      const extensions = execSync('az extension list --query "[?name==\'containerapp\'].name" -o tsv', { encoding: 'utf8' });
      
      if (extensions.trim()) {
        this.log('Container Apps extension is installed', 'success');
        return true;
      } else {
        this.log('Container Apps extension not installed (will be installed during deployment)', 'warning');
        return true; // Not a blocker, will be installed
      }
    } catch (error) {
      this.log('Could not check Container Apps extension', 'warning');
      return true; // Not a blocker
    }
  }

  async checkAuthentication() {
    this.log('Checking Azure authentication...');
    
    try {
      const accountInfo = execSync('az account show', { encoding: 'utf8' });
      const account = JSON.parse(accountInfo);
      this.log(`Authenticated as: ${account.user.name}`, 'success');
      this.log(`Subscription: ${account.name}`, 'success');
      return true;
    } catch (error) {
      this.log('Not authenticated to Azure', 'warning');
      this.log('Authentication required before deployment', 'info');
      return false;
    }
  }

  async checkDashboardFiles() {
    this.log('Checking dashboard application files...');
    
    try {
      const dashboardPath = path.join(__dirname, 'dashboard');
      
      // Check if dashboard directory exists
      await fs.access(dashboardPath);
      this.log('Dashboard directory found', 'success');
      
      // Check for essential files
      const essentialFiles = ['package.json', 'Dockerfile', 'pages'];
      for (const file of essentialFiles) {
        await fs.access(path.join(dashboardPath, file));
        this.log(`Found: ${file}`, 'success');
      }
      
      return true;
    } catch (error) {
      this.log(`Dashboard files check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkDashboardBuild() {
    this.log('Checking dashboard build capability...');
    
    try {
      const dashboardPath = path.join(__dirname, 'dashboard');
      
      // Check if node_modules exists
      try {
        await fs.access(path.join(dashboardPath, 'node_modules'));
        this.log('Dependencies installed', 'success');
      } catch {
        this.log('Dependencies not installed - run "cd dashboard && npm ci"', 'warning');
      }
      
      // Check if build directory exists (from previous build)
      try {
        await fs.access(path.join(dashboardPath, '.next'));
        this.log('Previous build found', 'success');
      } catch {
        this.log('No previous build found - will build during deployment', 'info');
      }
      
      return true;
    } catch (error) {
      this.log(`Dashboard build check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkDockerAvailability() {
    this.log('Checking Docker availability...');
    
    try {
      execSync('docker --version', { stdio: 'pipe' });
      this.log('Docker is available (for local testing)', 'success');
      return true;
    } catch (error) {
      this.log('Docker not available (not required for Azure deployment)', 'info');
      return true; // Not required for Azure Container Registry build
    }
  }

  async runAllChecks() {
    this.log('🚀 Running Azure Container Apps deployment pre-flight checks...\n');

    const results = {
      azureCLI: await this.checkAzureCLI(),
      containerAppsExtension: await this.checkContainerAppsExtension(),
      authentication: await this.checkAuthentication(),
      dashboardFiles: await this.checkDashboardFiles(),
      dashboardBuild: await this.checkDashboardBuild(),
      docker: await this.checkDockerAvailability()
    };

    // Summary
    console.log('\n📊 Pre-flight Check Results:');
    console.log('============================');
    
    const criticalChecks = ['azureCLI', 'dashboardFiles'];
    const warningChecks = ['authentication'];
    
    let criticalFailures = 0;
    let warnings = 0;
    
    for (const [check, passed] of Object.entries(results)) {
      const status = passed ? '✅' : '❌';
      const checkName = check.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      console.log(`${status} ${checkName}`);
      
      if (!passed && criticalChecks.includes(check)) {
        criticalFailures++;
      } else if (!passed && warningChecks.includes(check)) {
        warnings++;
      }
    }

    console.log('\n🎯 Deployment Readiness:');
    if (criticalFailures === 0) {
      if (warnings === 0) {
        console.log('✅ Ready for deployment!');
        console.log('   Run: npm run azure:deploy:dashboard');
      } else {
        console.log('⚠️  Ready with warnings');
        console.log('   Authentication required before deployment');
        console.log('   Run: npm run azure:login');
        console.log('   Then: npm run azure:deploy:dashboard');
      }
    } else {
      console.log('❌ Not ready for deployment');
      console.log('   Please fix critical issues before proceeding');
    }

    return {
      ready: criticalFailures === 0,
      warnings: warnings > 0,
      results
    };
  }
}

// Run if called directly
async function main() {
  const checker = new PreflightChecker();
  
  try {
    const result = await checker.runAllChecks();
    process.exit(result.ready ? 0 : 1);
  } catch (error) {
    console.error(`❌ Pre-flight check failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PreflightChecker;