#!/usr/bin/env node

/**
 * Azure Login Demo Script
 * Demonstrates the Azure authentication flow for deployment
 */

const AzureLoginManager = require('./azure-login.js');

async function runDemo() {
  console.log('🚀 Azure Login Demo for Dashboard Deployment');
  console.log('==============================================\n');

  const loginManager = new AzureLoginManager();

  try {
    // Step 1: Check current status
    console.log('Step 1: Checking current Azure authentication status...');
    const status = await loginManager.checkLoginStatus();
    
    if (status.isLoggedIn) {
      console.log('\n✅ Great! You are already authenticated to Azure.');
      console.log('📋 Ready to proceed with deployment!\n');
      
      // Show available subscriptions
      console.log('Step 2: Available subscriptions...');
      await loginManager.listSubscriptions();
      
      console.log('\n🎯 Next Steps:');
      console.log('   1. Run "npm run azure:deploy:dashboard" to deploy the dashboard');
      console.log('   2. Or run "node azure-container-apps-deploy.js" directly');
      console.log('   3. The deployment will create Azure Container Apps resources');
      console.log('   4. Your dashboard will be available at a public HTTPS URL\n');
      
    } else {
      console.log('\n🔐 Authentication required for Azure deployment.');
      console.log('   Choose one of the following login methods:\n');
      
      console.log('   Option 1 - Device Code Login (Recommended):');
      console.log('   → npm run azure:login:device');
      console.log('   → Follow the device code prompts\n');
      
      console.log('   Option 2 - Interactive Login:');
      console.log('   → npm run azure:login:interactive');
      console.log('   → Browser will open for authentication\n');
      
      console.log('   Option 3 - Manual Login:');
      console.log('   → az login --use-device-code');
      console.log('   → Follow the prompts\n');
      
      console.log('💡 After authentication, run this demo again to see your options.');
    }

  } catch (error) {
    console.error(`❌ Demo failed: ${error.message}`);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Azure Login Demo');
  console.log('================');
  console.log('');
  console.log('Usage: node azure-login-demo.js');
  console.log('');
  console.log('This script demonstrates the Azure authentication flow');
  console.log('and shows next steps for deploying the dashboard.');
  console.log('');
  console.log('Available deployment commands:');
  console.log('  npm run azure:login          - Login with device code');
  console.log('  npm run azure:status          - Check login status');
  console.log('  npm run azure:deploy:dashboard - Deploy to Container Apps');
  process.exit(0);
}

// Run the demo
runDemo();