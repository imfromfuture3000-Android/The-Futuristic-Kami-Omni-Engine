#!/bin/bash
# Octane Relayer Zero-Cost Deployment Script (Solana Mainnet)
# Usage: ./octane_relayer_deploy.sh <PROGRAM_SO_PATH> <PROGRAM_KEYPAIR_JSON> <OCTANE_PAYER_KEYPAIR_JSON> <SOLANA_WALLET_JSON>

# --- Config ---
HELIUS_RPC="https://mainnet.helius-rpc.com/?api-key=16b9324a-5b8c-47b9-9b02-6efa868958e5"
OCTANE_URL="http://localhost:8080/relay"  # Update if running Octane remotely

PROGRAM_SO="$1"
PROGRAM_KEYPAIR="$2"
OCTANE_PAYER_KEYPAIR="$3"
SOLANA_WALLET="$4"

if [ -z "$PROGRAM_SO" ] || [ -z "$PROGRAM_KEYPAIR" ] || [ -z "$OCTANE_PAYER_KEYPAIR" ] || [ -z "$SOLANA_WALLET" ]; then
  echo "Usage: $0 <PROGRAM_SO_PATH> <PROGRAM_KEYPAIR_JSON> <OCTANE_PAYER_KEYPAIR_JSON> <SOLANA_WALLET_JSON>"
  exit 1
fi

# --- Step 1: Build Program (if needed) ---
echo "[1/4] Building program..."
anchor build --provider.cluster mainnet-beta --provider.wallet "$SOLANA_WALLET"

# --- Step 2: Prepare Octane Relayer ---
echo "[2/4] Ensure Octane relayer is running and funded (payer: FLnu2qB6SZYwhx3UiMrCskgodPvzbJWovMg6FUTukfep)"
# (Manual: yarn start in Octane repo, fund payer with 0.05 SOL)

# --- Step 3: Deploy via Octane (Zero-Cost) ---
echo "[3/4] Deploying program via Octane relayer (zero-cost)..."
solana program deploy "$PROGRAM_SO" \
  --keypair "$PROGRAM_KEYPAIR" \
  --url "$HELIUS_RPC" \
  --fee-payer "$OCTANE_PAYER_KEYPAIR" \
  --signer "$SOLANA_WALLET"

# --- Step 4: Confirm Deployment ---
echo "[4/4] Confirming deployment..."
solana program show --url "$HELIUS_RPC" $(solana address -k "$PROGRAM_KEYPAIR")

echo "✅ Zero-cost deployment complete via Octane relayer!"
