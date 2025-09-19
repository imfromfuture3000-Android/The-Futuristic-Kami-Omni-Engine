#!/usr/bin/env node

/**
 * Simple test script to verify MCP server functionality
 * Tests basic server startup and endpoint responses
 */

const axios = require('axios');

class MCPServerTester {
  constructor() {
    this.mcpServerUrl = 'http://localhost:3001';
    this.azureMcpUrl = 'http://localhost:3002';
    this.testResults = [];
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async testEndpoint(url, name, expectedStatus = 200) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      if (response.status === expectedStatus) {
        this.log(`✅ ${name} - SUCCESS (${response.status})`);
        this.testResults.push({ name, status: 'PASS', url });
        return true;
      } else {
        this.log(`⚠️  ${name} - UNEXPECTED STATUS (${response.status})`, 'WARN');
        this.testResults.push({ name, status: 'WARN', url });
        return false;
      }
    } catch (error) {
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'ERROR');
      this.testResults.push({ name, status: 'FAIL', url, error: error.message });
      return false;
    }
  }

  async testPostEndpoint(url, data, name) {
    try {
      const response = await axios.post(url, data, { 
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status >= 200 && response.status < 300) {
        this.log(`✅ ${name} - SUCCESS (${response.status})`);
        this.testResults.push({ name, status: 'PASS', url });
        return response.data;
      } else {
        this.log(`⚠️  ${name} - UNEXPECTED STATUS (${response.status})`, 'WARN');
        this.testResults.push({ name, status: 'WARN', url });
        return null;
      }
    } catch (error) {
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'ERROR');
      this.testResults.push({ name, status: 'FAIL', url, error: error.message });
      return null;
    }
  }

  async runBasicTests() {
    this.log('🧪 Running MCP Server Basic Tests...');

    // Test basic health endpoints (these should work even without Azure)
    await this.testEndpoint(`${this.mcpServerUrl}/health`, 'MCP Server Health');
    await this.testEndpoint(`${this.azureMcpUrl}/health`, 'Azure MCP Server Health');

    // Test dashboard deployment endpoints
    const deployResult = await this.testPostEndpoint(
      `${this.mcpServerUrl}/deploy/dashboard`,
      { environment: 'test', config: { port: 3000 } },
      'Dashboard Deployment'
    );

    if (deployResult) {
      this.log(`📦 Deployment ID: ${deployResult.deploymentId}`);
    }

    // Test dashboard status endpoint
    await this.testEndpoint(
      `${this.mcpServerUrl}/deploy/dashboard/status?environment=test`,
      'Dashboard Status'
    );

    // Test dashboard health endpoint
    await this.testEndpoint(
      `${this.mcpServerUrl}/deploy/dashboard/health?environment=test`,
      'Dashboard Health Check'
    );

    // Test Azure MCP endpoints (may fail without Azure credentials, but should respond)
    await this.testPostEndpoint(
      `${this.azureMcpUrl}/deploy/dashboard/azure`,
      { environment: 'test', config: { resourceGroup: 'test-rg' } },
      'Azure Dashboard Deployment'
    );
  }

  async printResults() {
    this.log('\n📊 Test Results Summary:');
    this.log('═══════════════════════════════════════');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const warned = this.testResults.filter(r => r.status === 'WARN').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      this.log(`${icon} ${result.name}: ${result.status}`);
    });

    this.log('═══════════════════════════════════════');
    this.log(`📈 Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);
    
    if (failed === 0) {
      this.log('🎉 All critical tests passed! MCP servers are functional.');
    } else if (failed <= 2) {
      this.log('⚠️  Some tests failed, but core functionality appears to work.');
    } else {
      this.log('❌ Multiple test failures. Check server configuration.');
    }
  }

  async waitForServer(url, name, maxAttempts = 30) {
    this.log(`⏳ Waiting for ${name} to start...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        if (response.status === 200) {
          this.log(`✅ ${name} is ready!`);
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.log(`❌ ${name} failed to start within ${maxAttempts} seconds`);
    return false;
  }

  async runTests() {
    try {
      this.log('🚀 Starting MCP Server Tests');
      
      // Wait for servers to be ready
      const mcpReady = await this.waitForServer(this.mcpServerUrl, 'MCP Server');
      const azureReady = await this.waitForServer(this.azureMcpUrl, 'Azure MCP Server');
      
      if (!mcpReady && !azureReady) {
        this.log('❌ No servers are available for testing');
        return;
      }
      
      // Run the basic tests
      await this.runBasicTests();
      
      // Print results
      await this.printResults();
      
    } catch (error) {
      this.log(`❌ Test execution failed: ${error.message}`, 'ERROR');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MCPServerTester();
  tester.runTests().catch(console.error);
}

module.exports = MCPServerTester;