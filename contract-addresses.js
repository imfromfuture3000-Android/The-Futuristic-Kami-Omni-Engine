#!/usr/bin/env node

/**
 * Contract Address Registry - AI Empire 2089
 * Programmatic access to all deployed contract addresses
 */

const fs = require('fs').promises;
const path = require('path');

class ContractAddressRegistry {
  constructor() {
    this.addresses = {};
    this.loaded = false;
  }

  async loadAddresses() {
    try {
      const data = await fs.readFile('./contract-addresses.json', 'utf8');
      this.addresses = JSON.parse(data);
      this.loaded = true;
      console.log('✅ Contract addresses loaded successfully');
      return this.addresses;
    } catch (error) {
      console.error('❌ Failed to load contract addresses:', error.message);
      return null;
    }
  }

  // Get all addresses for a specific network
  getNetworkAddresses(network) {
    if (!this.loaded) {
      throw new Error('Addresses not loaded. Call loadAddresses() first.');
    }
    return this.addresses.networks[network] || {};
  }

  // Get Solana program ID
  getSolanaProgramId() {
    const solana = this.getNetworkAddresses('solana');
    return solana['mainnet-beta']?.contracts?.['primary-program']?.programId;
  }

  // Get Azure service URLs
  getAzureServices() {
    const azure = this.getNetworkAddresses('azure');
    return azure.demo?.services || {};
  }

  // Get Ethereum/Skale contracts
  getEthereumContracts() {
    const ethereum = this.getNetworkAddresses('ethereum');
    return ethereum.skale?.contracts || {};
  }

  // Get all active contract addresses
  getAllActiveAddresses() {
    if (!this.loaded) {
      throw new Error('Addresses not loaded. Call loadAddresses() first.');
    }

    const active = {};

    // Solana addresses
    const solanaProgram = this.getSolanaProgramId();
    if (solanaProgram) {
      active.solana = { programId: solanaProgram };
    }

    // Azure services
    const azureServices = this.getAzureServices();
    if (Object.keys(azureServices).length > 0) {
      active.azure = azureServices;
    }

    return active;
  }

  // Get deployment metrics
  getEmpireMetrics() {
    if (!this.loaded) {
      throw new Error('Addresses not loaded. Call loadAddresses() first.');
    }
    return this.addresses['empire-metrics'] || {};
  }

  // Get deployment commands
  getDeploymentCommands() {
    if (!this.loaded) {
      throw new Error('Addresses not loaded. Call loadAddresses() first.');
    }
    return this.addresses['deployment-commands'] || {};
  }

  // Print formatted address summary
  async printSummary() {
    if (!this.loaded) {
      await this.loadAddresses();
    }

    console.log('\n🤖 AI Empire Contract Addresses - 2089');
    console.log('=' .repeat(50));

    // Solana
    const solanaProgram = this.getSolanaProgramId();
    if (solanaProgram) {
      console.log('\n🌐 Solana Mainnet-Beta:');
      console.log(`   Program ID: ${solanaProgram}`);
      console.log(`   Explorer: https://solscan.io/account/${solanaProgram}`);
    }

    // Azure
    const azureServices = this.getAzureServices();
    if (Object.keys(azureServices).length > 0) {
      console.log('\n☁️ Azure Cloud (Demo):');
      Object.entries(azureServices).forEach(([key, service]) => {
        console.log(`   ${service.name}: ${service.url || service.account || service.name}`);
      });
    }

    // Ethereum/Skale
    const ethContracts = this.getEthereumContracts();
    if (Object.keys(ethContracts).length > 0) {
      console.log('\n⚡ Ethereum/Skale:');
      Object.entries(ethContracts).forEach(([key, contract]) => {
        console.log(`   ${contract.name}: ${contract.historicalAddress || 'Not deployed'}`);
      });
    }

    // Metrics
    const metrics = this.getEmpireMetrics();
    console.log('\n📊 Empire Metrics:');
    console.log(`   Total Value: $${metrics.totalValue?.toLocaleString() || 0}`);
    console.log(`   Active Services: ${metrics.activeServices || 0}`);
    console.log(`   Contracts Deployed: ${metrics.contractsDeployed || 0}`);

    console.log('\n🔗 Deployment Commands:');
    const commands = this.getDeploymentCommands();
    Object.entries(commands).forEach(([network, command]) => {
      console.log(`   ${network}: ${command}`);
    });

    console.log('\n✨ AI Empire Registry Complete\n');
  }

  // Export addresses for external use
  exportAddresses() {
    if (!this.loaded) {
      throw new Error('Addresses not loaded. Call loadAddresses() first.');
    }
    return this.addresses;
  }

  // Validate address format
  static validateAddress(network, address) {
    const validators = {
      solana: (addr) => addr.length === 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr),
      ethereum: (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr),
      azure: (addr) => typeof addr === 'string' && addr.length > 0
    };

    const validator = validators[network.toLowerCase()];
    return validator ? validator(address) : false;
  }
}

// CLI interface
if (require.main === module) {
  const registry = new ContractAddressRegistry();

  const command = process.argv[2];

  switch (command) {
    case 'summary':
    case 'list':
      registry.printSummary().catch(console.error);
      break;
    case 'solana':
      registry.loadAddresses().then(() => {
        console.log('Solana Program ID:', registry.getSolanaProgramId());
      }).catch(console.error);
      break;
    case 'azure':
      registry.loadAddresses().then(() => {
        console.log('Azure Services:', JSON.stringify(registry.getAzureServices(), null, 2));
      }).catch(console.error);
      break;
    case 'metrics':
      registry.loadAddresses().then(() => {
        console.log('Empire Metrics:', JSON.stringify(registry.getEmpireMetrics(), null, 2));
      }).catch(console.error);
      break;
    case 'export':
      registry.loadAddresses().then(() => {
        console.log(JSON.stringify(registry.exportAddresses(), null, 2));
      }).catch(console.error);
      break;
    default:
      console.log('Contract Address Registry - AI Empire 2089');
      console.log('Usage: node contract-addresses.js <command>');
      console.log('Commands:');
      console.log('  summary  - Show formatted address summary');
      console.log('  list     - Alias for summary');
      console.log('  solana   - Show Solana program ID');
      console.log('  azure    - Show Azure services');
      console.log('  metrics  - Show empire metrics');
      console.log('  export   - Export all addresses as JSON');
      break;
  }
}

module.exports = ContractAddressRegistry;