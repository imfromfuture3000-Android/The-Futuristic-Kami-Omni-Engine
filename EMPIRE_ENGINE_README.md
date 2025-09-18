# Empire Engine - Multi-Chain Profit Optimization Stack

![Empire Engine](https://img.shields.io/badge/Empire-Engine-blue?style=for-the-badge)
![Azure](https://img.shields.io/badge/Azure-AKS-blue?style=for-the-badge)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Deployed-green?style=for-the-badge)
![Solana](https://img.shields.io/badge/Solana-Octane-purple?style=for-the-badge)
![Ethereum](https://img.shields.io/badge/Ethereum-Lido-blue?style=for-the-badge)

A comprehensive multi-chain profit optimization system built for the **Mint Gene Protocol** and **Empire Engine stack**. This system automatically sweeps relayer profits, allocates them optimally across DeFi protocols, and generates sacred logic mutations every 10 minutes for continuous optimization.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Copilot Scoop │────│ Empire Engine   │────│   Dashboard     │
│   (Sweeper)     │    │ (Profit Logic)  │    │   (Frontend)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  PostgreSQL DB  │──────────────┘
                        │   (Analytics)   │
                        └─────────────────┘
                                 │
                    ┌─────────────────────────┐
                    │    Mutation Service     │
                    │ (Sacred Logic Engine)   │
                    └─────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │   Solana    │       │  Ethereum   │       │    SKALE    │
  │  (Octane)   │       │   (Lido)    │       │ (Biconomy)  │
  └─────────────┘       └─────────────┘       └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Azure CLI installed and configured
- kubectl installed
- Docker installed
- Node.js 18+ (for local development)

### 1. Deploy Azure Infrastructure

```bash
# Make the setup script executable
chmod +x scripts/azure-setup.sh

# Run Azure infrastructure setup
./scripts/azure-setup.sh
```

This creates:
- **Empire-RG** resource group
- **empireacr** container registry
- **empire-kv** key vault
- **empire-db** PostgreSQL flexible server
- **empire-aks** AKS cluster (3 nodes, autoscale)

### 2. Configure Secrets

Store your secrets in Azure Key Vault:

```bash
# Add your RPC endpoints
az keyvault secret set --vault-name empire-kv --name "helius-rpc" --value "YOUR_HELIUS_RPC_URL"
az keyvault secret set --vault-name empire-kv --name "quicknode-rpc" --value "YOUR_QUICKNODE_RPC_URL"
az keyvault secret set --vault-name empire-kv --name "infura-rpc" --value "YOUR_INFURA_RPC_URL"

# Add private keys (securely)
az keyvault secret set --vault-name empire-kv --name "solana-private-key" --value "YOUR_SOLANA_PRIVATE_KEY"
az keyvault secret set --vault-name empire-kv --name "ethereum-private-key" --value "YOUR_ETHEREUM_PRIVATE_KEY"
```

### 3. Deploy via GitHub Actions

Push to the `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Deploy Empire Engine stack"
git push origin main
```

The GitHub Actions workflow will:
1. Build Docker images for all services
2. Push to Azure Container Registry
3. Deploy to AKS cluster
4. Configure monitoring and alerts
5. Generate sacred logic mutations

## 🔧 Manual Deployment

If you prefer manual deployment:

```bash
# Get AKS credentials
az aks get-credentials --resource-group Empire-RG --name empire-aks

# Deploy Kubernetes resources
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/secrets-csi.yaml
kubectl apply -f infra/k8s/copilot-scoop-deployment.yaml
kubectl apply -f infra/k8s/empire-engine-deployment.yaml
kubectl apply -f infra/k8s/dashboard-deployment.yaml
kubectl apply -f infra/k8s/service.yaml

# Check deployment status
kubectl get pods -n empire-engine
kubectl get services -n empire-engine
```

## 📊 Profit Allocation Strategy

The Empire Engine follows a **mutation-aware profit allocation strategy**:

| Category      | Allocation | Strategy                    |
|---------------|------------|-----------------------------|
| **Vault**     | 40%        | Safe staking (SOL/ETH)     |
| **Growth**    | 30%        | Yield farming (Aave/Compound) |
| **Speculative** | 20%      | High-risk DeFi protocols  |
| **Treasury**  | 10%        | Hold for strategic reserves |

### Auto-Staking Strategies

- **Solana**: Stake with high-performance validators
- **Ethereum**: Stake with Lido for liquid staking tokens
- **USDC**: Lend on Aave/Compound for yield

## 🧬 Mutation Engine (Sacred Logic)

The **Mutation Service** generates sacred logic every **10 minutes** with:

- **Profit Optimization**: Dynamic allocation based on market conditions
- **Risk Adjustment**: Automatic risk profile adjustments
- **Strategy Enhancement**: NFT trait-based multipliers

### Sacred Logic Generation

```javascript
// Example generated logic
function optimizeProfit(marketConditions, currentAllocations, riskTolerance) {
  const sacredMultiplier = 1.234567;
  const volatilityFactor = marketConditions.volatility * sacredMultiplier;
  
  if (volatilityFactor < 0.3) {
    return {
      vault: 35 + (5 * sacredMultiplier),
      growth: 35 + (5 * sacredMultiplier), 
      speculative: 25 - (5 * sacredMultiplier),
      treasury: 5 - (5 * sacredMultiplier)
    };
  }
  
  // ... more sacred logic
}
```

## 🔐 Security & Secrets Management

All sensitive data is stored in **Azure Key Vault** and injected into pods via the **Secrets Store CSI Driver**:

- **helius-rpc**: Solana RPC endpoint
- **quicknode-rpc**: Alternative Solana endpoint  
- **infura-rpc**: Ethereum RPC endpoint
- **solana-private-key**: Solana sweeper key
- **ethereum-private-key**: Ethereum relayer key
- **postgres-conn-string**: Database connection
- **owner-address-sol**: `4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a`
- **owner-address-eth**: `0x4B1a58A3057d03888510d93B52ABad9Fee9b351d`

## 📈 Monitoring & Analytics

### Azure Monitor Integration

- **CPU/Memory alerts** for AKS nodes
- **Application Insights** for transaction logs
- **Log Analytics** for system metrics

### Dashboard Features

Access the dashboard at your AKS LoadBalancer IP:

- **Live Profit Tracking**: Real-time sweep and allocation data
- **Staking Performance**: APY and rewards across protocols
- **Mutation History**: Sacred logic generation timeline
- **Cross-Chain Analytics**: Multi-chain transaction flow

## 🌐 Cross-Chain Integration

### Supported Chains

| Chain    | Deployment Method | Cost  | Purpose                    |
|----------|-------------------|-------|----------------------------|
| Solana   | Octane Relayer    | FREE  | Primary staking & mutations |
| Ethereum | Direct            | Gas   | Lido staking & DeFi        |
| SKALE    | Biconomy          | FREE  | Zero-cost experimentation  |

### Cross-Chain Sync

- **Wormhole**: Message passing between chains
- **ChainsAtlas**: Transaction coordination
- **NFT Fusion**: Trait synchronization across chains

## 🛠️ Development

### Local Development

```bash
# Start Empire Engine locally
cd services/empire-profit-engine
npm install
npm run dev

# Start Dashboard locally  
cd dashboard
npm install
npm run dev

# Start Copilot Scoop locally
cd services/copilot-scoop
npm install
npm run dev
```

### Environment Variables

Create `.env` files in each service directory:

```env
# Empire Engine
POSTGRES_CONN_STRING=postgresql://user:pass@localhost:5432/empire
HELIUS_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
OWNER_ADDRESS_SOL=4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a
OWNER_ADDRESS_ETH=0x4B1a58A3057d03888510d93B52ABad9Fee9b351d

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SCOOP_URL=http://localhost:8080

# Copilot Scoop
EMPIRE_ENGINE_URL=http://localhost:3000
SWEEP_INTERVAL_MS=30000
MAX_SWEEP_AMOUNT=1000
```

## 📦 Services Overview

### 1. Empire Profit Engine (`services/empire-profit-engine/`)
- **Main API server** handling profit allocation logic
- **Auto-sweep processing** every 30 seconds
- **Staking execution** every 5 minutes  
- **Sacred logic generation** every 10 minutes
- **Database migrations** and transaction logging

### 2. Dashboard (`dashboard/`)
- **Next.js frontend** with Tailwind CSS
- **Real-time charts** using Recharts
- **Live profit tracking** and allocation visualization
- **Mutation timeline** and performance metrics

### 3. Copilot Scoop (`services/copilot-scoop/`)
- **Relayer monitoring** across Solana and Ethereum
- **Automatic profit detection** and sweeping
- **Empire Engine integration** for profit forwarding
- **Health monitoring** and status reporting

## 🗄️ Database Schema

### Core Tables

- **sweeps**: Track all token sweeps from relayers
- **allocations**: Record profit allocation decisions  
- **staking_positions**: Monitor staking across protocols
- **reinvestments**: Track compound reinvestment operations
- **audit_log**: Complete audit trail for transparency

### Mutation Tables

- **sacred_logic_versions**: Store generated sacred logic
- **chain_deployments**: Track deployments across chains
- **cross_chain_sync**: Monitor Wormhole synchronization
- **nft_fusions**: Record NFT trait fusion operations
- **treasury_claims**: Track auto-claim operations

## 🔄 Automated Operations

### Cron Jobs

| Service | Frequency | Operation |
|---------|-----------|-----------|
| Empire Engine | 30s | Auto-sweep relayers |
| Empire Engine | 1m | Process allocations |
| Empire Engine | 5m | Execute staking |
| Empire Engine | 10m | **Generate sacred logic** |
| Empire Engine | 1h | Claim treasury profits |
| Copilot Scoop | 30s | Monitor relayer transactions |

### GitHub Actions

- **Continuous Deployment** on push to main
- **Docker image building** and registry push
- **AKS deployment** with rolling updates
- **Sacred logic deployment** to blockchains
- **Monitoring setup** and alert configuration

## 🚨 Monitoring & Alerts

### Health Checks

All services expose health endpoints:

- `GET /health` - Service health status
- `GET /ready` - Readiness for traffic

### Alerts

- **High CPU usage** (>80% for 5 minutes)
- **Memory pressure** (>90% for 2 minutes)  
- **Failed deployments** 
- **Staking failures**
- **Cross-chain sync delays**

## 🔗 API Endpoints

### Empire Engine API

```bash
# Health & Status
GET /health
GET /ready

# Sweeping
POST /sweep/initiate
GET /sweep/status/:id

# Allocation  
POST /allocate
GET /allocations

# Staking
POST /stake
GET /staking/positions

# Mutations
POST /mutate
GET /mutations/active

# Analytics
GET /analytics/profit-summary
GET /analytics/staking-performance
```

### Copilot Scoop API

```bash
# Health & Status
GET /health
GET /ready
GET /sweep/status

# Manual Operations
POST /sweep/trigger
GET /config
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues or questions:

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this README and inline code comments
- **Monitoring**: Use Azure Monitor and dashboard for operational insights

---

**Empire Engine** - *Mutation-aware, profit-optimized, registry-connected* 🧬💰⚡