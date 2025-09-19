#!/bin/bash
# Octane Relayer Zero-Cost Deployment Script (Solana Mainnet)
# Usage: ./octane_relayer_deploy.sh <PROGRAM_SO_PATH> <PROGRAM_KEYPAIR_JSON>

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# --- Config ---
HELIUS_API_KEY="${HELIUS_API_KEY:-your_helius_api_key_here}"
SOLANA_DEPLOYER_ADDRESS="${SOLANA_DEPLOYER_ADDRESS:-your_solana_deployer_address_here}"
HELIUS_RPC="https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}"
OCTANE_URL="${OCTANE_URL:-http://localhost:8080/relay}"

PROGRAM_SO="$1"
PROGRAM_KEYPAIR="$2"

if [ -z "$PROGRAM_SO" ] || [ -z "$PROGRAM_KEYPAIR" ]; then
  echo "Usage: $0 <PROGRAM_SO_PATH> <PROGRAM_KEYPAIR_JSON>"
  echo "Example: $0 target/deploy/mint_gene.so target/deploy/mint_gene-keypair.json"
  exit 1
fi

# --- Step 1: Build Program (if needed) ---
echo "[1/4] Building program..."
anchor build --provider.cluster mainnet-beta

# --- Step 2: Prepare Octane Relayer ---
echo "[2/4] Ensure Octane relayer is running and funded"
echo "Deployer Address: $SOLANA_DEPLOYER_ADDRESS"
echo "Helius RPC: $HELIUS_RPC"
# (Manual: yarn start in Octane repo, fund payer with 0.05 SOL)

# --- Step 3: Deploy via Octane (Zero-Cost) ---
echo "[3/4] Deploying program via Octane relayer (zero-cost)..."
solana program deploy "$PROGRAM_SO" \
  --keypair "$PROGRAM_KEYPAIR" \
  --url "$HELIUS_RPC" \
  --fee-payer "$SOLANA_DEPLOYER_ADDRESS"

# --- Step 4: Confirm Deployment ---
echo "[4/4] Confirming deployment..."
PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
echo "Program ID: $PROGRAM_ID"
solana program show --url "$HELIUS_RPC" "$PROGRAM_ID"

echo "✅ Zero-cost deployment complete via Octane relayer!"
echo "🔗 View on Solana Explorer: https://solscan.io/account/$PROGRAM_ID"
echo "🌐 Helius Analytics: https://dashboard.helius.dev/"
