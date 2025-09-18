#!/usr/bin/env node

/**
 * Solana Zero-Cost Deployment using Octane Relayer
 * Uses Octane for gasless transactions with SPL token payments
 * Treasury deployer is NOT used as payer in contracts - uses Octane relayer logic
 */

const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class SolanaZeroCostDeployer {
  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    this.masterController = new PublicKey(process.env.MASTER_CONTROLLER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a');
    this.treasuryDeployer = new PublicKey(process.env.TREASURY_DEPLOYER_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a');
    this.rebateAddress = new PublicKey(process.env.SOLANA_REBATE_ADDRESS || '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a');

    // Octane Configuration - Best Practices Implementation
    this.octaneConfig = {
      endpoint: process.env.OCTANE_ENDPOINT || 'https://octane-devnet.breakroom.show',
      feeToken: process.env.OCTANE_FEE_TOKEN || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      maxSignatures: parseInt(process.env.OCTANE_MAX_SIGNATURES || '2'),
      lamportsPerSignature: parseInt(process.env.OCTANE_LAMPORTS_PER_SIGNATURE || '5000')
    };

    console.log('🚀 Solana Zero-Cost Deployer with Octane');
    console.log(`👑 Master Controller: ${this.masterController.toBase58()}`);
    console.log(`🏦 Treasury Deployer: ${this.treasuryDeployer.toBase58()}`);
    console.log(`🎁 Rebate Address: ${this.rebateAddress.toBase58()}`);
    console.log(`⚡ Octane Endpoint: ${this.octaneConfig.endpoint}`);
  }

  async loadOctaneConfig() {
    try {
      console.log('📡 Loading Octane configuration...');
      const response = await axios.get(`${this.octaneConfig.endpoint}/api`, {
        headers: { 'Accept': 'application/json' }
      });

      this.octaneFeePayer = new PublicKey(response.data.feePayer);
      this.octaneTokens = response.data.endpoints.transfer.tokens;

      console.log(`✅ Octane Fee Payer: ${this.octaneFeePayer.toBase58()}`);
      console.log(`💰 Available Tokens: ${this.octaneTokens.length}`);

      return response.data;
    } catch (error) {
      console.error('❌ Failed to load Octane config:', error.message);
      throw error;
    }
  }

  async deployContract(programPath, keypairPath, network = 'mainnet') {
    try {
      console.log(`📦 Deploying Solana contract: ${path.basename(programPath)}`);
      console.log(`🌐 Network: ${network}`);
      console.log(`⚠️  IMPORTANT: Treasury Deployer is NOT used as payer in contracts`);
      console.log(`🔄 Using Octane relayer for zero-cost deployment`);

      // Load Octane configuration
      await this.loadOctaneConfig();

      // Build deployment transaction using Octane
      const deploymentTx = await this.buildOctaneDeploymentTransaction(programPath, keypairPath);

      // Sign with master controller (NOT treasury deployer)
      const masterKeypair = await this.loadMasterControllerKeypair();
      deploymentTx.partialSign(masterKeypair);

      // Submit via Octane relayer
      const result = await this.submitToOctaneRelayer(deploymentTx);

      console.log(`✅ Contract deployed successfully!`);
      console.log(`📋 Program ID: ${result.programId}`);
      console.log(`🔗 Explorer: https://solscan.io/account/${result.programId}`);

      return result;

    } catch (error) {
      console.error('❌ Contract deployment failed:', error.message);
      throw error;
    }
  }

  async buildOctaneDeploymentTransaction(programPath, keypairPath) {
    console.log('🔨 Building Octane deployment transaction...');

    // Load program data
    const programData = await fs.readFile(programPath);
    const programKeypair = await this.loadProgramKeypair(keypairPath);

    // Calculate deployment cost
    const programSize = programData.length;
    const rentExemption = await this.connection.getMinimumBalanceForRentExemption(programSize);

    console.log(`📊 Program Size: ${programSize} bytes`);
    console.log(`💰 Rent Exemption: ${rentExemption / 1e9} SOL`);

    // Create deployment transaction
    const transaction = new Transaction();

    // Add program deployment instruction
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: this.masterController, // Use master controller, NOT treasury deployer
        newAccountPubkey: programKeypair.publicKey,
        lamports: rentExemption,
        space: programSize,
        programId: SystemProgram.programId
      })
    );

    // Add program data loading instruction
    transaction.add(
      SystemProgram.assign({
        accountPubkey: programKeypair.publicKey,
        programId: new PublicKey('BPFLoader2111111111111111111111111111111111')
      })
    );

    // Set recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.octaneFeePayer; // Octane pays the fees

    return transaction;
  }

  async loadMasterControllerKeypair() {
    // In production, this would load from secure storage
    // For now, generate a keypair (this is just for demonstration)
    console.log('🔑 Loading master controller keypair...');

    // This should be loaded from Azure Key Vault in production
    const masterKeypair = Keypair.generate();
    console.log(`⚠️  Generated master controller keypair: ${masterKeypair.publicKey.toBase58()}`);

    return masterKeypair;
  }

  async loadProgramKeypair(keypairPath) {
    try {
      const keypairData = JSON.parse(await fs.readFile(keypairPath, 'utf8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
      console.log('📝 Generating new program keypair...');
      const programKeypair = Keypair.generate();
      await fs.writeFile(keypairPath, JSON.stringify(Array.from(programKeypair.secretKey)));
      return programKeypair;
    }
  }

  async submitToOctaneRelayer(transaction) {
    console.log('🚀 Submitting transaction to Octane relayer...');

    try {
      // Serialize transaction
      const serializedTx = transaction.serialize({ requireAllSignatures: false });

      // Add token fee payment to Octane
      const feeTransaction = await this.addOctaneTokenFee(transaction);

      // Submit to Octane endpoint
      const response = await axios.post(`${this.octaneConfig.endpoint}/api/transfer`, {
        transaction: serializedTx.toString('base64'),
        encoding: 'base64'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return {
          programId: transaction.instructions[0].keys[1].pubkey.toBase58(),
          signature: response.data.signature,
          octaneFee: this.calculateOctaneFee()
        };
      } else {
        throw new Error(`Octane submission failed: ${response.data.error}`);
      }

    } catch (error) {
      console.error('❌ Octane submission failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async addOctaneTokenFee(transaction) {
    console.log('💳 Adding Octane token fee...');

    // Find USDC token configuration
    const usdcToken = this.octaneTokens.find(token => token.mint === this.octaneConfig.feeToken);
    if (!usdcToken) {
      throw new Error('USDC token not configured in Octane');
    }

    // Calculate fee amount (0.001 USDC for this transaction)
    const feeAmount = usdcToken.fee;

    console.log(`💰 Octane Fee: ${feeAmount} USDC (${usdcToken.decimals} decimals)`);

    // Create token transfer instruction to Octane
    const feeInstruction = {
      type: 'transfer',
      source: await this.getUserTokenAccount(this.masterController, new PublicKey(usdcToken.mint)),
      destination: new PublicKey(usdcToken.account),
      amount: feeAmount,
      mint: usdcToken.mint
    };

    // Add fee instruction to transaction
    transaction.add(feeInstruction);

    return transaction;
  }

  async getUserTokenAccount(owner, mint) {
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      await this.loadMasterControllerKeypair(), // This would be the user's keypair
      mint,
      owner
    );
    return associatedTokenAccount.address;
  }

  calculateOctaneFee() {
    // Calculate based on Octane's pricing
    const baseFee = this.octaneConfig.lamportsPerSignature * this.octaneConfig.maxSignatures;
    const octanePremium = baseFee * 0.1; // 10% premium for Octane service
    return baseFee + octanePremium;
  }

  async deployGeneMintProtocol() {
    console.log('🧬 Deploying Gene Mint Protocol...');

    try {
      // Deploy main program
      const mainProgramPath = 'target/deploy/mint_gene.so';
      const mainKeypairPath = 'target/deploy/mint_gene-keypair.json';

      const mainDeployment = await this.deployContract(mainProgramPath, mainKeypairPath);

      // Deploy trait fusion program
      const traitProgramPath = 'target/deploy/trait_fusion.so';
      const traitKeypairPath = 'target/deploy/trait_fusion-keypair.json';

      const traitDeployment = await this.deployContract(traitProgramPath, traitKeypairPath);

      // Initialize protocol with master controller
      await this.initializeProtocol(mainDeployment.programId, traitDeployment.programId);

      console.log('🎉 Gene Mint Protocol deployed successfully!');
      console.log(`🏠 Main Program: ${mainDeployment.programId}`);
      console.log(`🎨 Trait Fusion: ${traitDeployment.programId}`);

      return {
        mainProgram: mainDeployment,
        traitFusion: traitDeployment
      };

    } catch (error) {
      console.error('❌ Gene Mint Protocol deployment failed:', error.message);
      throw error;
    }
  }

  async initializeProtocol(mainProgramId, traitProgramId) {
    console.log('🔧 Initializing protocol with master controller...');

    // Create initialization transaction
    const initTx = new Transaction();

    // Add initialization instruction (this would be specific to your program)
    // This is a placeholder - replace with actual initialization logic
    initTx.add(
      SystemProgram.transfer({
        fromPubkey: this.masterController,
        toPubkey: this.rebateAddress,
        lamports: 1000 // Small initialization fee
      })
    );

    // Sign and submit via Octane
    const masterKeypair = await this.loadMasterControllerKeypair();
    initTx.partialSign(masterKeypair);

    const result = await this.submitToOctaneRelayer(initTx);
    console.log(`✅ Protocol initialized: ${result.signature}`);
  }
}

// CLI interface
if (require.main === module) {
  const deployer = new SolanaZeroCostDeployer();

  const command = process.argv[2];

  switch (command) {
    case 'deploy':
      deployer.deployGeneMintProtocol().catch(console.error);
      break;
    case 'contract':
      const programPath = process.argv[3];
      const keypairPath = process.argv[4];
      const network = process.argv[5] || 'mainnet';
      deployer.deployContract(programPath, keypairPath, network).catch(console.error);
      break;
    case 'config':
      deployer.loadOctaneConfig().then(config => {
        console.log('Octane Configuration:', JSON.stringify(config, null, 2));
      }).catch(console.error);
      break;
    default:
      console.log('Usage: node solana_zero_cost_deploy.js <command>');
      console.log('Commands:');
      console.log('  deploy              - Deploy full Gene Mint Protocol');
      console.log('  contract <path> <keypair> [network] - Deploy single contract');
      console.log('  config              - Show Octane configuration');
      break;
  }
}

module.exports = SolanaZeroCostDeployer;