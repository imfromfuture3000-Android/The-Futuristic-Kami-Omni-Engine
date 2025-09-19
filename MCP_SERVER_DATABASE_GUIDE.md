# Empire Engine MCP Server Database Integration Guide

## Overview

The Empire Engine includes multiple MCP (Model Context Protocol) servers that integrate with the PostgreSQL database for advanced mutation operations and Azure cloud services. This document outlines how MCP servers access and utilize the server database.

## MCP Server Components

### 1. Azure MCP Server (`azure-mcp-server.js`)

The primary MCP server that handles Azure integrations and database operations:

**Key Features:**
- Direct Azure Cosmos DB integration for supplementary storage
- Azure Key Vault integration for secure database credential management
- PostgreSQL connection via Empire Profit Engine service
- Sacred logic mutation capabilities with database persistence

**Database Integration Points:**
```javascript
// Azure MCP Server connects to database via Empire Engine API
const empireEngineUrl = process.env.EMPIRE_ENGINE_URL || 'http://localhost:3000';

// Database operations through API endpoints:
// - GET /analytics/profit-summary
// - GET /mutations/active
// - POST /mutations/generate
// - GET /analytics/staking-performance
```

### 2. MCP Dashboard Server (`scripts/azure-mcp-dashboard.js`)

Real-time dashboard MCP server with database monitoring:

**Database Health Monitoring:**
```javascript
async checkPostgresHealth() {
  try {
    const response = await fetch(`${this.empireEngineUrl}/ready`);
    const data = await response.json();
    return data.status === 'ready';
  } catch (error) {
    return false;
  }
}
```

## Database Connection Architecture

### Direct Database Access (Empire Engine Service)
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Servers   │────│ Empire Engine    │────│   PostgreSQL    │
│                 │    │   (Port 3000)    │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  Azure Services │──────────────┘
                        │ (Cosmos, Vault) │
                        └─────────────────┘
```

### API Endpoints Used by MCP Servers

#### Health and Status
- `GET /health` - Basic service health
- `GET /ready` - Database connectivity check

#### Analytics Data
- `GET /analytics/profit-summary?since=2024-01-01` - Profit summary data
- `GET /analytics/staking-performance` - Staking performance metrics

#### Mutation Operations
- `GET /mutations/active` - Active mutation deployments
- `POST /mutations/generate` - Generate new sacred logic
- `GET /mutations/history` - Mutation generation history

#### Sweep and Allocation Data
- `GET /sweeps/recent` - Recent sweep operations
- `GET /allocations/pending` - Pending allocations
- `POST /allocations/execute` - Execute allocation

## MCP Server Database Configuration

### Environment Variables Required

```env
# Empire Engine API Connection
EMPIRE_ENGINE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000

# Azure Integration (for MCP servers)
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=Empire-RG
AZURE_KEY_VAULT_NAME=empire-kv

# Database Monitoring
DB_HEALTH_CHECK_INTERVAL=30000
DB_CONNECTION_TIMEOUT=5000
```

### Azure Key Vault Integration

MCP servers access database credentials through Azure Key Vault:

```javascript
// Azure MCP Server credential retrieval
async getDatabaseConnectionString() {
  try {
    const secret = await this.secretClient.getSecret('postgres-conn-string');
    return secret.value;
  } catch (error) {
    console.error('Failed to get database connection string:', error);
    throw error;
  }
}
```

## MCP Server Database Operations

### 1. Sacred Logic Mutation Storage

When MCP servers generate sacred logic, it's stored in the database:

```javascript
// MCP server mutation generation
async generateSacredLogic(params) {
  const mutation = {
    mutation_type: params.type || 'profit_optimization',
    logic_code: generatedLogic,
    performance_score: predictedScore,
    deployment_chains: ['solana', 'ethereum', 'skale']
  };

  // Store via Empire Engine API
  const response = await fetch(`${this.empireEngineUrl}/mutations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation)
  });

  return response.json();
}
```

### 2. Real-time Data Fetching

MCP servers fetch real-time data for dashboard display:

```javascript
// Fetch profit summary for dashboard
async getProfitSummary(timeframe = '7d') {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(`${this.empireEngineUrl}/analytics/profit-summary?since=${since}`);
  return response.json();
}

// Fetch active deployments
async getActiveDeployments() {
  const response = await fetch(`${this.empireEngineUrl}/mutations/active`);
  return response.json();
}
```

### 3. Cross-Chain Synchronization

MCP servers coordinate cross-chain operations with database tracking:

```javascript
// Track cross-chain operations
async trackCrossChainOperation(operation) {
  const crossChainData = {
    source_chain: operation.sourceChain,
    target_chain: operation.targetChain,
    message_type: operation.type,
    source_tx_hash: operation.txHash,
    payload: operation.payload
  };

  // Log to database via Empire Engine
  await fetch(`${this.empireEngineUrl}/cross-chain/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crossChainData)
  });
}
```

## Database Views Used by MCP Servers

### Active Deployments View
```sql
-- Used by MCP servers to show current deployment status
SELECT 
    slv.version_hash,
    slv.mutation_type,
    slv.performance_score,
    cd.chain,
    cd.contract_address,
    cd.status as deployment_status
FROM sacred_logic_versions slv
JOIN chain_deployments cd ON slv.id = cd.sacred_logic_id
WHERE slv.is_active = TRUE AND cd.status = 'active';
```

### Profit Summary View
```sql
-- Used for dashboard analytics
SELECT 
    date,
    chain,
    total_swept_usd,
    vault_allocated,
    growth_allocated
FROM profit_summary
WHERE date >= NOW() - INTERVAL '30 days'
ORDER BY date DESC;
```

## MCP Server Deployment with Database

### 1. Start Azure MCP Server

```bash
# Navigate to project root
cd /home/runner/work/The-Futuristic-Kami-Omni-Engine/The-Futuristic-Kami-Omni-Engine

# Set environment variables
export EMPIRE_ENGINE_URL=http://localhost:3000
export AZURE_SUBSCRIPTION_ID=your-subscription-id
export AZURE_RESOURCE_GROUP=Empire-RG

# Start Azure MCP Server
node azure-mcp-server.js
```

### 2. Start MCP Dashboard

```bash
# Start dashboard MCP server
node scripts/azure-mcp-dashboard.js
```

### 3. Verify Database Integration

```bash
# Test Empire Engine API connection
curl http://localhost:3000/ready

# Test MCP server health
curl http://localhost:8080/health

# Test dashboard API
curl http://localhost:3001/api/health
```

## MCP Server Database Monitoring

### Health Checks Performed by MCP Servers

1. **Database Connectivity**: Regular checks to Empire Engine `/ready` endpoint
2. **Query Performance**: Monitor response times for analytics queries
3. **Mutation Status**: Track success/failure rates of sacred logic generation
4. **Cross-Chain Sync**: Monitor cross-chain message completion rates

### Monitoring Dashboard

The MCP dashboard server provides real-time monitoring:

```javascript
// Real-time database metrics
async getRealtimeMetrics() {
  return {
    database: {
      status: await this.checkDatabaseHealth(),
      activeConnections: await this.getActiveConnections(),
      queryPerformance: await this.getQueryMetrics()
    },
    mutations: {
      activeCount: await this.getActiveMutations(),
      successRate: await this.getMutationSuccessRate(),
      lastGenerated: await this.getLastMutationTime()
    },
    profits: {
      totalSwept: await this.getTotalSweptToday(),
      allocationRate: await this.getAllocationSuccessRate(),
      stakingRewards: await this.getTotalStakingRewards()
    }
  };
}
```

## Troubleshooting MCP Server Database Issues

### Common Issues and Solutions

#### 1. MCP Server Cannot Connect to Empire Engine
```bash
# Check if Empire Engine is running
curl http://localhost:3000/health

# Verify EMPIRE_ENGINE_URL environment variable
echo $EMPIRE_ENGINE_URL

# Check network connectivity
ping localhost
```

#### 2. Database Connection Timeouts
```bash
# Check Azure Key Vault access
az keyvault secret show --name postgres-conn-string --vault-name empire-kv

# Verify SSL configuration
openssl s_client -connect empire-db.postgres.database.azure.com:5432 -starttls postgres
```

#### 3. Mutation Generation Failures
```bash
# Check mutation logs
curl http://localhost:3000/mutations/logs

# Verify sacred logic generation
curl -X POST http://localhost:3000/mutations/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "profit_optimization"}'
```

## Security Considerations

### Database Access Security
- MCP servers do not have direct database access
- All database operations go through Empire Engine API
- Azure Key Vault manages database credentials
- SSL/TLS encryption for all connections

### API Security
- Rate limiting on Empire Engine endpoints
- Authentication tokens for sensitive operations
- Audit logging for all database modifications
- Network security groups restrict access

## Performance Optimization

### Caching Strategies
- MCP servers cache frequently accessed data
- Redis integration for session management
- Database connection pooling in Empire Engine
- Query result caching for analytics

### Scaling Considerations
- Horizontal scaling of MCP servers
- Database read replicas for analytics queries
- Load balancing across multiple Empire Engine instances
- Azure auto-scaling for peak loads

## Best Practices

1. **Always use Empire Engine API** for database operations
2. **Implement proper error handling** for network failures
3. **Cache data appropriately** to reduce database load
4. **Monitor performance metrics** regularly
5. **Use transactions** for multi-table operations
6. **Validate data** before database insertion
7. **Log operations** for debugging and audit trails