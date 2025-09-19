# Dashboard Mainnet Deployment using MCP Servers

## Overview

This repository provides a comprehensive solution for deploying the dashboard application to mainnet using MCP (Model Context Protocol) servers. The deployment infrastructure leverages Azure services for scalability, monitoring, and security.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   MCP Server    │    │ Azure MCP Server│
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│   (Port 3002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Azure Services  │
                    │ • Key Vault     │
                    │ • Storage       │
                    │ • Cosmos DB     │
                    │ • Functions     │
                    │ • Monitor       │
                    └─────────────────┘
```

## Components

### 1. MCP Server (`mcp-server.js`)
- Main deployment orchestrator
- Handles dashboard deployment requests
- Integrates with Azure services
- Provides health monitoring

### 2. Azure MCP Server (`azure-mcp-server.js`)
- Azure-specific deployment operations
- Manages Azure infrastructure
- Handles scaling and monitoring
- Sacred Matrix mutations

### 3. Dashboard (`dashboard/`)
- Next.js application
- Production-ready with Docker
- Auto-scaling capabilities
- Health checks integrated

## Quick Start

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Azure credentials
```

### 2. Configure Azure Services

```bash
# Create Azure resources
az group create --name OmegaPrime-RG --location eastus

# Set up Key Vault
az keyvault create --name omegaprime-kv --resource-group OmegaPrime-RG

# Set up Storage Account
az storage account create --name omegaprimestore --resource-group OmegaPrime-RG

# Set up Cosmos DB
az cosmosdb create --name omegaprime-cosmos --resource-group OmegaPrime-RG
```

### 3. Deploy to Mainnet

```bash
# Option 1: Full automated deployment
npm run deploy:mainnet

# Option 2: Step-by-step deployment
npm run build:dashboard
npm run mcp:start-all
node dashboard-mainnet-deploy.js deploy

# Option 3: Using Docker Compose
docker-compose up -d
```

## Deployment Commands

### Available Scripts

```bash
# Start MCP servers
npm run server:start          # Start main MCP server
npm run azure-server:start    # Start Azure MCP server
npm run mcp:start-all         # Start both servers

# Dashboard operations
npm run build:dashboard       # Build dashboard
npm run start:dashboard       # Start dashboard locally
npm run deploy:dashboard      # Deploy dashboard
npm run deploy:mainnet        # Deploy to mainnet

# Health and monitoring
npm run health:check          # Check deployment health
```

### Dashboard Mainnet Deployer

```bash
# Full deployment
node dashboard-mainnet-deploy.js deploy

# Individual operations
node dashboard-mainnet-deploy.js build         # Build only
node dashboard-mainnet-deploy.js start-servers # Start MCP servers
node dashboard-mainnet-deploy.js health        # Health check
```

## API Endpoints

### MCP Server (Port 3001)

#### Dashboard Deployment
```bash
# Deploy dashboard
POST /deploy/dashboard
{
  "environment": "staging|production",
  "config": {
    "port": 3000,
    "buildCommand": "npm run build",
    "startCommand": "npm start"
  }
}

# Deploy to mainnet
POST /deploy/dashboard/mainnet
{
  "config": {
    "minInstances": 3,
    "maxInstances": 15
  }
}

# Get deployment status
GET /deploy/dashboard/status?deploymentId=xxx&environment=mainnet

# Health check
GET /deploy/dashboard/health?environment=mainnet
```

### Azure MCP Server (Port 3002)

#### Azure-Specific Deployment
```bash
# Deploy to Azure
POST /deploy/dashboard/azure
{
  "environment": "production",
  "config": {
    "resourceGroup": "Dashboard-Mainnet-RG",
    "location": "eastus",
    "tier": "Premium"
  }
}

# Deploy to Azure mainnet
POST /deploy/dashboard/mainnet
{
  "config": {
    "minInstances": 3,
    "maxInstances": 20,
    "autoScale": true
  }
}

# Get deployment status
GET /deploy/dashboard/status/{deploymentId}

# Scale deployment
POST /deploy/dashboard/scale
{
  "deploymentId": "xxx",
  "instances": 5,
  "environment": "mainnet"
}
```

## Environment Variables

### Required Variables

```bash
# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_STORAGE_ACCOUNT=your-storage-account
AZURE_KEYVAULT_NAME=your-keyvault-name
AZURE_COSMOS_ACCOUNT=your-cosmos-account
AZURE_OPENAI_ENDPOINT=your-openai-endpoint
AZURE_OPENAI_KEY=your-openai-key

# MCP Server URLs
MCP_SERVER_URL=http://localhost:3001
AZURE_MCP_URL=http://localhost:3002
```

### Optional Variables

```bash
# Mainnet Configuration
MAINNET_RESOURCE_GROUP=Dashboard-Mainnet-RG
MAINNET_APP_SERVICE_PLAN=dashboard-mainnet-premium
MAINNET_WEB_APP=dashboard-mainnet

# Security
HTTPS_ONLY=true
MIN_TLS_VERSION=1.2
```

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale dashboard
docker-compose up -d --scale dashboard=3

# Stop services
docker-compose down
```

### Individual Docker Builds

```bash
# Build MCP server
docker build -f Dockerfile.mcp -t mcp-server .

# Build Azure MCP server
docker build -f Dockerfile.azure-mcp -t azure-mcp-server .

# Build dashboard
docker build -t dashboard ./dashboard
```

## Monitoring and Health Checks

### Health Check Endpoints

```bash
# MCP Server health
curl http://localhost:3001/health

# Azure MCP Server health
curl http://localhost:3002/health

# Dashboard health
curl http://localhost:3000/health
```

### Deployment Monitoring

```bash
# Monitor deployment progress
curl "http://localhost:3001/deploy/dashboard/status?environment=mainnet"

# Check dashboard health
curl "http://localhost:3001/deploy/dashboard/health?environment=mainnet"

# Get deployment metrics
curl "http://localhost:3002/monitor/metrics"
```

## Mainnet Configuration

### Auto-Scaling Configuration

```json
{
  "scalingConfig": {
    "minInstances": 3,
    "maxInstances": 20,
    "autoScale": true,
    "rules": [
      { "metric": "CpuPercentage", "threshold": 70, "scaleOut": 2 },
      { "metric": "MemoryPercentage", "threshold": 80, "scaleOut": 1 },
      { "metric": "HttpQueueLength", "threshold": 100, "scaleOut": 3 }
    ]
  }
}
```

### Security Configuration

```json
{
  "security": {
    "httpsOnly": true,
    "minTlsVersion": "1.2",
    "clientCertificateMode": "Optional",
    "headers": {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **MCP Servers not starting**
   ```bash
   # Check if ports are available
   netstat -tulpn | grep :3001
   netstat -tulpn | grep :3002
   
   # Check logs
   npm run server:start
   npm run azure-server:start
   ```

2. **Azure authentication issues**
   ```bash
   # Login to Azure CLI
   az login
   
   # Set subscription
   az account set --subscription "your-subscription-id"
   ```

3. **Dashboard build failures**
   ```bash
   # Clear cache and rebuild
   cd dashboard
   rm -rf .next node_modules
   npm install
   npm run build
   ```

### Debug Mode

```bash
# Start with debug logging
DEBUG=* npm run server:start
DEBUG=* npm run azure-server:start

# Enable verbose deployment
node dashboard-mainnet-deploy.js deploy --verbose
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Azure Credentials**: Use Azure Key Vault for secrets
3. **HTTPS**: Always use HTTPS in production
4. **Network Security**: Configure proper firewall rules
5. **Access Control**: Implement proper RBAC

## Support

For issues and questions:
1. Check the deployment logs
2. Verify Azure service status
3. Test MCP server endpoints
4. Review the deployment report

## License

MIT License - see LICENSE file for details.