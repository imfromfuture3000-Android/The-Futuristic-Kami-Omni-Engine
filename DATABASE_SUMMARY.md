# Empire Engine Server Database - Summary & Location Guide

## 🎯 Quick Answer: Where is the Server Database?

The **Empire Engine server database** is a **PostgreSQL 14** instance hosted on **Azure PostgreSQL Flexible Server**.

### Database Location & Access:
- **Host**: `empire-db.postgres.database.azure.com`
- **Port**: `5432`
- **Database**: `postgres`
- **Connection**: Via `POSTGRES_CONN_STRING` environment variable
- **Security**: Azure Key Vault integration with SSL/TLS encryption

## 📍 Database Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| **Database Connection Class** | Core database operations | `services/empire-profit-engine/src/database/connection.js` |
| **Initial Schema** | Core tables (sweeps, allocations, staking) | `migrations/001_initial_schema.sql` |
| **Mutation Schema** | Sacred logic and cross-chain tables | `migrations/002_mutations_and_sacred_logic.sql` |
| **Azure Setup Script** | Database provisioning | `scripts/azure-setup.sh` |
| **Connection Test** | Database connectivity test | `test-database-connection.js` |

## 🏗️ Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Empire Engine Database                   │
│                    (PostgreSQL 14)                         │
├─────────────────────────────────────────────────────────────┤
│  Core Tables:                                              │
│  • sweeps (relayer profit tracking)                       │
│  • allocations (profit distribution)                      │
│  • staking_positions (multi-chain staking)                │
│  • sacred_logic_versions (mutation engine)                │
│  • chain_deployments (contract tracking)                  │
│  • cross_chain_sync (bridge operations)                   │
│  • treasury_claims (auto-claim tracking)                  │
│  • audit_log (operation transparency)                     │
├─────────────────────────────────────────────────────────────┤
│  Views:                                                    │
│  • profit_summary (daily profit analytics)                │
│  • staking_performance (protocol performance)             │
│  • active_deployments (mutation deployments)              │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Quick Setup Instructions

### 1. Test Database Connection
```bash
# Install dependencies
cd services/empire-profit-engine
npm install

# Set environment variable
export POSTGRES_CONN_STRING="postgresql://user:pass@empire-db.postgres.database.azure.com:5432/postgres?sslmode=require"

# Test connection
node ../../test-database-connection.js
```

### 2. Deploy Database Infrastructure
```bash
# Run Azure setup script
chmod +x scripts/azure-setup.sh
./scripts/azure-setup.sh
```

### 3. Start Empire Engine Service
```bash
cd services/empire-profit-engine
npm start

# Verify database connection
curl http://localhost:3000/ready
```

## 🌐 MCP Server Integration

The database integrates with MCP servers through the Empire Engine API:

### MCP Server Endpoints:
- **Azure MCP Server**: `azure-mcp-server.js` (Port 8080)
- **Dashboard MCP**: `scripts/azure-mcp-dashboard.js` (Port 3001)
- **Empire Engine API**: `services/empire-profit-engine/` (Port 3000)

### API Integration Flow:
```
MCP Servers → Empire Engine API → PostgreSQL Database
     ↓              ↓                    ↓
  Port 8080     Port 3000           Azure Cloud
```

## 📊 Key Database Operations

### Profit Tracking:
- **Sweeps**: Track relayer profits from Solana, Ethereum, SKALE
- **Allocations**: Distribute profits across vault/growth/speculative/treasury
- **Staking**: Multi-protocol staking (Solana validators, Lido, RocketPool)

### Mutation Engine:
- **Sacred Logic**: AI-generated profit optimization logic
- **Deployments**: Track contract deployments across chains
- **Performance**: Monitor mutation effectiveness

### Cross-Chain Operations:
- **Sync Tracking**: Wormhole/bridge message tracking
- **NFT Fusions**: Sacred multiplier applications
- **Treasury Claims**: Automated profit claiming

## 🔍 Database Monitoring

### Health Check Endpoints:
```bash
# Database connectivity
curl http://localhost:3000/ready

# Profit analytics
curl http://localhost:3000/analytics/profit-summary

# Active mutations
curl http://localhost:3000/mutations/active

# Staking performance
curl http://localhost:3000/analytics/staking-performance
```

### Manual Database Inspection:
```sql
-- Connect to database
psql $POSTGRES_CONN_STRING

-- Check recent sweeps
SELECT chain, COUNT(*), SUM(usd_value) FROM sweeps 
WHERE timestamp > NOW() - INTERVAL '24 hours' 
GROUP BY chain;

-- Check active staking
SELECT protocol, COUNT(*), SUM(stake_amount) FROM staking_positions 
WHERE status = 'active' 
GROUP BY protocol;

-- Check recent mutations
SELECT mutation_type, COUNT(*) FROM sacred_logic_versions 
WHERE generated_at > NOW() - INTERVAL '7 days' 
GROUP BY mutation_type;
```

## 📚 Documentation References

- **[Complete Database Documentation](DATABASE_DOCUMENTATION.md)** - Full architectural details
- **[Database Quick Reference](DATABASE_QUICK_REFERENCE.md)** - Configuration and connection guide
- **[MCP Server Integration](MCP_SERVER_DATABASE_GUIDE.md)** - MCP server database operations
- **[Empire Engine README](EMPIRE_ENGINE_README.md)** - System overview and deployment

## 🚨 Troubleshooting

### Connection Issues:
1. **Check environment variable**: `echo $POSTGRES_CONN_STRING`
2. **Verify Azure connectivity**: `az account show`
3. **Test SSL connection**: `openssl s_client -connect empire-db.postgres.database.azure.com:5432`

### Permission Issues:
1. **Check Key Vault access**: `az keyvault secret show --name postgres-conn-string --vault-name empire-kv`
2. **Verify AKS identity**: Azure Portal → AKS → Identity
3. **Check firewall rules**: Azure Portal → PostgreSQL → Networking

### Performance Issues:
1. **Monitor connections**: `SELECT count(*) FROM pg_stat_activity;`
2. **Check slow queries**: Review `pg_stat_statements`
3. **Analyze indexes**: `EXPLAIN ANALYZE` on slow queries

## 🎯 Summary

The **Empire Engine server database** is a comprehensive PostgreSQL system that powers the multi-chain profit optimization stack. It's hosted on Azure with enterprise-grade security, automated migrations, and real-time analytics capabilities. The database integrates seamlessly with MCP servers through REST APIs and provides complete transparency for all profit optimization operations across Solana, Ethereum, and SKALE networks.

**Location**: Azure PostgreSQL Flexible Server  
**Access**: Via Empire Engine API (Port 3000)  
**Integration**: MCP servers via HTTP APIs  
**Security**: Azure Key Vault + SSL/TLS encryption  
**Schema**: 11+ tables with automated migrations  
**Monitoring**: Real-time health checks and analytics