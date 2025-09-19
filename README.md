# The-Futuristic-Kami-Omni-Engine

## Empire Engine - Multi-Chain Profit Optimization Stack

A comprehensive multi-chain profit optimization system with advanced database architecture and MCP server integration.

## Documentation

### Database Documentation
- **[Complete Database Documentation](DATABASE_DOCUMENTATION.md)** - Comprehensive guide to the PostgreSQL database architecture, schema, and operations
- **[Database Quick Reference](DATABASE_QUICK_REFERENCE.md)** - Quick reference for database configuration and connection details
- **[MCP Server Database Integration](MCP_SERVER_DATABASE_GUIDE.md)** - Guide for MCP servers accessing the database

### Core Documentation
- **[Empire Engine README](EMPIRE_ENGINE_README.md)** - Main system documentation and deployment guide
- **[Azure Integration](AZURE-INTEGRATION-README.md)** - Azure cloud integration details
- **[Deployment Guide](DEPLOYMENT_README.md)** - Complete deployment instructions

## Quick Start

### Database Setup
1. **Azure Infrastructure**: Run `./scripts/azure-setup.sh` to provision PostgreSQL database
2. **Local Development**: Install dependencies with `npm install` in `services/empire-profit-engine/`
3. **Database Migration**: Run `npm run migrate` to set up schema
4. **Health Check**: Verify with `curl http://localhost:3000/ready`

### MCP Server Setup
1. **Start Empire Engine**: `cd services/empire-profit-engine && npm start`
2. **Start Azure MCP Server**: `node azure-mcp-server.js`
3. **Start Dashboard**: `node scripts/azure-mcp-dashboard.js`

## Database Architecture

The system uses **PostgreSQL 14** with the following key components:

- **Sweeps & Allocations**: Track profit optimization across chains
- **Staking Positions**: Multi-protocol staking management
- **Sacred Logic Engine**: Mutation tracking and deployment
- **Cross-Chain Sync**: Wormhole/bridge operation tracking
- **Treasury Management**: Automated claim and reinvestment tracking

## Server Database Access

**Connection String Format:**
```
postgresql://user:pass@empire-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Environment Variable:**
```env
POSTGRES_CONN_STRING=postgresql://user:pass@server:5432/postgres?sslmode=require
```

**Key Tables:**
- `sweeps` - Relayer profit tracking
- `allocations` - Allocation decisions
- `staking_positions` - Multi-chain staking
- `sacred_logic_versions` - Mutation engine
- `chain_deployments` - Contract deployments

For complete database documentation, see [DATABASE_DOCUMENTATION.md](DATABASE_DOCUMENTATION.md).