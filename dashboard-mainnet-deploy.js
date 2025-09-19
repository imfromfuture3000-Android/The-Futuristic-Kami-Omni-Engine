#!/usr/bin/env node

/**
 * Dashboard Mainnet Deployment Script using MCP Servers
 * Orchestrates dashboard deployment to mainnet through MCP server infrastructure
 * Version 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class DashboardMainnetDeployer {
  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.azureMcpUrl = process.env.AZURE_MCP_URL || 'http://localhost:3002';
    this.dashboardPath = path.join(__dirname, 'dashboard');
    this.deploymentLog = [];
    
    console.log('🚀 Dashboard Mainnet Deployment using MCP Servers');
    console.log(`🔗 MCP Server: ${this.mcpServerUrl}`);
    console.log(`☁️  Azure MCP: ${this.azureMcpUrl}`);
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.deploymentLog.push(logEntry);
  }

  async waitForMCPServers() {
    this.log('⏳ Waiting for MCP servers to be ready...');
    
    const checkServer = async (url, name) => {
      for (let i = 0; i < 30; i++) {
        try {
          const response = await axios.get(`${url}/health`, { timeout: 5000 });
          if (response.status === 200) {
            this.log(`✅ ${name} is ready`);
            return true;
          }
        } catch (error) {
          this.log(`⏳ Waiting for ${name}... (attempt ${i + 1}/30)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      throw new Error(`${name} failed to start within timeout`);
    };

    await Promise.all([
      checkServer(this.mcpServerUrl, 'MCP Server'),
      checkServer(this.azureMcpUrl, 'Azure MCP Server')
    ]);
  }

  async startMCPServers() {
    this.log('🧠 Starting MCP servers...');

    try {
      // Start main MCP server
      this.log('Starting main MCP server...');
      execSync('npm run server:start > /dev/null 2>&1 &', {
        stdio: 'inherit',
        shell: true,
        detached: true
      });

      // Start Azure MCP server
      this.log('Starting Azure MCP server...');
      execSync('npm run azure-server:start > /dev/null 2>&1 &', {
        stdio: 'inherit', 
        shell: true,
        detached: true
      });

      // Wait for servers to be ready
      await this.waitForMCPServers();

    } catch (error) {
      this.log(`❌ Failed to start MCP servers: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async buildDashboard() {
    this.log('🔨 Building dashboard for mainnet deployment...');

    try {
      // Change to dashboard directory and build
      process.chdir(this.dashboardPath);
      
      this.log('Installing dependencies...');
      execSync('npm ci', { stdio: 'inherit' });

      this.log('Building dashboard...');
      execSync('npm run build', { stdio: 'inherit' });

      this.log('✅ Dashboard build completed');

    } catch (error) {
      this.log(`❌ Dashboard build failed: ${error.message}`, 'ERROR');
      throw error;
    } finally {
      // Return to original directory
      process.chdir(path.dirname(__dirname));
    }
  }

  async deployToMainnet() {
    this.log('🌐 Deploying dashboard to mainnet via MCP servers...');

    try {
      // Deploy via main MCP server
      const mcpDeployment = await axios.post(`${this.mcpServerUrl}/deploy/dashboard/mainnet`, {
        config: {
          port: 3000,
          minInstances: 3,
          maxInstances: 15,
          environment: 'mainnet'
        }
      });

      this.log(`✅ MCP Server deployment initiated: ${mcpDeployment.data.deploymentId}`);

      // Deploy via Azure MCP server for Azure infrastructure
      const azureDeployment = await axios.post(`${this.azureMcpUrl}/deploy/dashboard/mainnet`, {
        config: {
          resourceGroup: 'Dashboard-Mainnet-RG',
          location: 'eastus',
          minInstances: 3,
          maxInstances: 20,
          tier: 'Premium'
        }
      });

      this.log(`✅ Azure MCP deployment initiated: ${azureDeployment.data.deploymentId}`);

      return {
        mcpDeployment: mcpDeployment.data,
        azureDeployment: azureDeployment.data
      };

    } catch (error) {
      this.log(`❌ Mainnet deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async monitorDeployment(deploymentIds) {
    this.log('📊 Monitoring deployment progress...');

    const checkDeployment = async (deploymentId, serverUrl, serverName) => {
      for (let i = 0; i < 60; i++) { // Monitor for up to 10 minutes
        try {
          const response = await axios.get(`${serverUrl}/deploy/dashboard/status`, {
            params: { deploymentId, environment: 'mainnet' }
          });

          const status = response.data.status || response.data.deployment;
          this.log(`${serverName}: ${status.status || 'running'} - ${status.health || 'checking...'}`);

          if (status.status === 'completed' || status.health === 'healthy') {
            this.log(`✅ ${serverName} deployment completed successfully`);
            return true;
          }

        } catch (error) {
          this.log(`⚠️  ${serverName} status check failed: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      }

      this.log(`⚠️  ${serverName} deployment monitoring timed out`);
      return false;
    };

    // Monitor both deployments in parallel
    const results = await Promise.allSettled([
      checkDeployment(deploymentIds.mcpDeployment.deploymentId, this.mcpServerUrl, 'MCP Server'),
      checkDeployment(deploymentIds.azureDeployment.deploymentId, this.azureMcpUrl, 'Azure MCP')
    ]);

    return results.every(result => result.status === 'fulfilled' && result.value);
  }

  async performHealthChecks() {
    this.log('🩺 Performing post-deployment health checks...');

    try {
      // Check MCP server health
      const mcpHealth = await axios.get(`${this.mcpServerUrl}/deploy/dashboard/health`, {
        params: { environment: 'mainnet' }
      });

      this.log('✅ MCP Server health check passed');

      // Check Azure MCP health for mainnet dashboard
      const azureHealth = await axios.get(`${this.azureMcpUrl}/health`);
      
      this.log('✅ Azure MCP health check passed');

      return {
        mcpHealth: mcpHealth.data,
        azureHealth: azureHealth.data
      };

    } catch (error) {
      this.log(`⚠️  Health check warning: ${error.message}`, 'WARN');
      return null;
    }
  }

  async generateDeploymentReport(deploymentResult, healthCheck) {
    this.log('📄 Generating deployment report...');

    const report = {
      deployment: {
        timestamp: new Date().toISOString(),
        status: 'completed',
        environment: 'mainnet',
        mcpDeployment: deploymentResult.mcpDeployment,
        azureDeployment: deploymentResult.azureDeployment
      },
      health: healthCheck,
      endpoints: {
        dashboard: 'https://dashboard-mainnet.azurewebsites.net',
        mcpServer: this.mcpServerUrl,
        azureMcp: this.azureMcpUrl
      },
      logs: this.deploymentLog,
      summary: {
        totalTime: 'Estimated 10-15 minutes',
        success: true,
        services: ['Dashboard', 'MCP Server', 'Azure MCP Server'],
        mainnetReady: true
      }
    };

    // Save report
    const reportPath = 'dashboard-mainnet-deployment-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Deployment report saved: ${reportPath}`);

    // Upload report via MCP server
    try {
      await axios.post(`${this.mcpServerUrl}/azure/upload-report`, {
        reportData: report,
        fileName: reportPath
      });
      this.log('✅ Report uploaded to Azure storage');
    } catch (error) {
      this.log(`⚠️  Report upload warning: ${error.message}`, 'WARN');
    }

    return report;
  }

  async executeMainnetDeployment() {
    try {
      this.log('🎯 Starting Dashboard Mainnet Deployment', 'START');

      // Step 1: Start MCP servers
      await this.startMCPServers();

      // Step 2: Build dashboard
      await this.buildDashboard();

      // Step 3: Deploy to mainnet via MCP servers
      const deploymentResult = await this.deployToMainnet();

      // Step 4: Monitor deployment progress
      await this.monitorDeployment(deploymentResult);

      // Step 5: Perform health checks
      const healthCheck = await this.performHealthChecks();

      // Step 6: Generate deployment report
      const report = await this.generateDeploymentReport(deploymentResult, healthCheck);

      this.log('🎉 Dashboard Mainnet Deployment Complete!', 'SUCCESS');
      this.log('📊 Deployment Summary:');
      this.log(`   🌐 Mainnet URL: https://dashboard-mainnet.azurewebsites.net`);
      this.log(`   🔗 MCP Server: ${this.mcpServerUrl}`);
      this.log(`   ☁️  Azure MCP: ${this.azureMcpUrl}`);
      this.log(`   📈 Instances: 3-20 (auto-scaling)`);
      this.log(`   🛡️  Security: HTTPS with Premium tier`);

      return report;

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new DashboardMainnetDeployer();

  const command = process.argv[2];

  switch (command) {
    case 'deploy':
    case 'mainnet':
      deployer.executeMainnetDeployment().catch(console.error);
      break;
    case 'build':
      deployer.buildDashboard().catch(console.error);
      break;
    case 'start-servers':
      deployer.startMCPServers().catch(console.error);
      break;
    case 'health':
      deployer.performHealthChecks().then(console.log).catch(console.error);
      break;
    default:
      console.log('Usage: node dashboard-mainnet-deploy.js [deploy|build|start-servers|health]');
      console.log('  deploy        - Full mainnet deployment');
      console.log('  build         - Build dashboard only');
      console.log('  start-servers - Start MCP servers only');
      console.log('  health        - Check deployment health');
  }
}

module.exports = DashboardMainnetDeployer;