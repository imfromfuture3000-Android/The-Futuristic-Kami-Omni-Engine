#!/usr/bin/env node

/**
 * SKALE Zero-Cost Deployment using Octane-style Relayer Logic
 * Uses SKALE's gasless transaction features with master controller
 * Treasury deployer is NOT used as payer in contracts
 */

const Web3 = require('web3');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

class SKALEZeroCostDeployer {
  constructor() {
    this.web3 = new Web3(process.env.SKALE_RPC_URL || 'https://mainnet.skalenodes.com/v1/honorable-steel-rasalhague');
    this.masterController = process.env.MASTER_CONTROLLER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';
    this.treasuryDeployer = process.env.TREASURY_DEPLOYER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';
    this.rebateAddress = process.env.SKALE_REBATE_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';

    // SKALE Gasless Configuration (Octane-style)
    this.gaslessConfig = {
      enabled: process.env.SKALE_GASLESS_ENABLED === 'true',
      relayerUrl: process.env.SKALE_RELAYER_URL || 'https://relayer.skale.network',
      feeToken: process.env.SKALE_FEE_TOKEN || '0xD2Aaa00700000000000000000000000000000000', // SKL token
      maxGasLimit: parseInt(process.env.SKALE_MAX_GAS_LIMIT || '2000000'),
      gasPrice: process.env.SKALE_GAS_PRICE || '0'
    };

    console.log('🚀 SKALE Zero-Cost Deployer');
    console.log(`👑 Master Controller: ${this.masterController}`);
    console.log(`🏦 Treasury Deployer: ${this.treasuryDeployer}`);
    console.log(`🎁 Rebate Address: ${this.rebateAddress}`);
    console.log(`⚡ Gasless Enabled: ${this.gaslessConfig.enabled}`);
  }

  async deployContract(contractPath, network = 'mainnet') {
    try {
      console.log(`📦 Deploying SKALE contract: ${path.basename(contractPath)}`);
      console.log(`🌐 Network: ${network}`);
      console.log(`⚠️  IMPORTANT: Treasury Deployer is NOT used as payer in contracts`);
      console.log(`🔄 Using SKALE gasless deployment`);

      // Load contract artifact
      const artifact = await this.loadContractArtifact(contractPath);

      // Deploy using gasless method
      const deployment = await this.deployGaslessContract(artifact);

      console.log(`✅ Contract deployed successfully!`);
      console.log(`📋 Contract Address: ${deployment.address}`);
      console.log(`🔗 Explorer: https://honorable-steel-rasalhague.explorer.mainnet.skalenodes.com/address/${deployment.address}`);

      return deployment;

    } catch (error) {
      console.error('❌ Contract deployment failed:', error.message);
      throw error;
    }
  }

  async loadContractArtifact(contractPath) {
    console.log('📄 Loading contract artifact...');

    const artifactPath = contractPath.replace('.sol', '.json');
    const artifactContent = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);

    console.log(`✅ Contract loaded: ${artifact.contractName}`);
    console.log(`📊 Bytecode size: ${artifact.bytecode.length / 2} bytes`);

    return artifact;
  }

  async deployGaslessContract(artifact) {
    console.log('🚀 Deploying contract gaslessly...');

    // Create contract instance
    const contract = new this.web3.eth.Contract(artifact.abi);

    // Encode deployment data
    const deploymentData = contract.deploy({
      data: artifact.bytecode,
      arguments: [] // Add constructor arguments if needed
    }).encodeABI();

    // Create gasless transaction
    const gaslessTx = {
      to: null, // Contract creation
      data: deploymentData,
      gas: this.gaslessConfig.maxGasLimit,
      gasPrice: this.gaslessConfig.gasPrice,
      value: '0',
      from: this.masterController // Use master controller, NOT treasury deployer
    };

    // Submit via SKALE relayer
    const result = await this.submitToSKALERelayer(gaslessTx);

    return {
      address: result.contractAddress,
      transactionHash: result.transactionHash,
      gasUsed: result.gasUsed
    };
  }

  async submitToSKALERelayer(transaction) {
    console.log('📡 Submitting to SKALE relayer...');

    try {
      // Sign transaction with master controller
      const signedTx = await this.signTransaction(transaction);

      // Submit to relayer
      const response = await fetch(this.gaslessConfig.relayerUrl + '/relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signedTransaction: signedTx,
          feeToken: this.gaslessConfig.feeToken,
          sponsor: this.rebateAddress
        })
      });

      if (!response.ok) {
        throw new Error(`Relayer error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Transaction relayed: ${result.transactionHash}`);
        return result;
      } else {
        throw new Error(`Relay failed: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ SKALE relay failed:', error.message);
      throw error;
    }
  }

  async signTransaction(transaction) {
    console.log('✍️  Signing transaction with master controller...');

    // In production, this would use the actual master controller private key
    // For now, we'll use a placeholder signature
    console.log('⚠️  Using placeholder signature (production would use real key)');

    // This is where you'd integrate with Azure Key Vault or secure key storage
    const signature = '0x' + '00'.repeat(65); // Placeholder 65-byte signature

    return {
      ...transaction,
      signature: signature
    };
  }

  async deployGeneMintProtocol() {
    console.log('🧬 Deploying Gene Mint Protocol on SKALE...');

    try {
      // Deploy main contract
      const mainContractPath = 'contracts/GeneMint.sol';
      const mainDeployment = await this.deployContract(mainContractPath);

      // Deploy trait fusion contract
      const traitContractPath = 'contracts/TraitFusion.sol';
      const traitDeployment = await this.deployContract(traitContractPath);

      // Initialize protocol
      await this.initializeProtocol(mainDeployment.address, traitDeployment.address);

      console.log('🎉 Gene Mint Protocol deployed on SKALE!');
      console.log(`🏠 Main Contract: ${mainDeployment.address}`);
      console.log(`🎨 Trait Fusion: ${traitDeployment.address}`);

      return {
        mainContract: mainDeployment,
        traitFusion: traitDeployment
      };

    } catch (error) {
      console.error('❌ Gene Mint Protocol deployment failed:', error.message);
      throw error;
    }
  }

  async initializeProtocol(mainAddress, traitAddress) {
    console.log('🔧 Initializing SKALE protocol...');

    // Create initialization transaction
    const initTx = {
      to: mainAddress,
      data: '0x' + 'initialize', // Replace with actual initialization method
      gas: '500000',
      gasPrice: this.gaslessConfig.gasPrice,
      value: '0',
      from: this.masterController
    };

    const result = await this.submitToSKALERelayer(initTx);
    console.log(`✅ Protocol initialized: ${result.transactionHash}`);
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new SKALEZeroCostDeployer();

  const command = process.argv[2];

  switch (command) {
    case 'deploy':
      deployer.deployGeneMintProtocol().catch(console.error);
      break;
    case 'contract':
      const contractPath = process.argv[3];
      const network = process.argv[4] || 'mainnet';
      deployer.deployContract(contractPath, network).catch(console.error);
      break;
    default:
      console.log('Usage: node skale_zero_cost_deploy.js <command>');
      console.log('Commands:');
      console.log('  deploy              - Deploy full Gene Mint Protocol');
      console.log('  contract <path> [network] - Deploy single contract');
      break;
  }
}

module.exports = SKALEZeroCostDeployer;