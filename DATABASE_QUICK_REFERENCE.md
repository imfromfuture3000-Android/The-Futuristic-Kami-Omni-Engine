# Empire Engine Database Quick Reference

## Server Database Configuration

### Database Type
**PostgreSQL 14** (Azure Flexible Server)

### Connection Details
- **Host**: `empire-db.postgres.database.azure.com`
- **Port**: `5432`
- **Database**: `postgres`
- **SSL Mode**: `require`

### Connection String Format
```
postgresql://username:password@empire-db.postgres.database.azure.com:5432/postgres?sslmode=require
```

### Environment Variables
```env
POSTGRES_CONN_STRING=postgresql://user:pass@empire-db.postgres.database.azure.com:5432/postgres?sslmode=require
NODE_ENV=production
```

### Azure Resources
- **Resource Group**: `Empire-RG`
- **Server Name**: `empire-db`
- **Key Vault**: `empire-kv`
- **Secret Name**: `postgres-conn-string`

## Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sweeps` | Track relayer token sweeps | `chain`, `amount`, `usd_value`, `status` |
| `allocations` | Profit allocation decisions | `allocation_type`, `percentage`, `target_strategy` |
| `staking_positions` | Multi-chain staking operations | `protocol`, `stake_amount`, `rewards_earned`, `apy` |
| `sacred_logic_versions` | Mutation engine iterations | `version_hash`, `mutation_type`, `performance_score` |
| `chain_deployments` | Contract deployments | `chain`, `contract_address`, `status` |
| `cross_chain_sync` | Cross-chain messaging | `source_chain`, `target_chain`, `status` |
| `nft_fusions` | NFT trait combinations | `sacred_multiplier`, `trait_hash` |
| `treasury_claims` | Auto-claim operations | `claim_type`, `amount`, `net_profit` |
| `audit_log` | System operation tracking | `operation`, `entity_type`, `mutation_logic_id` |

## Key Views
- `profit_summary` - Daily profit tracking by chain
- `staking_performance` - Performance metrics by protocol
- `active_deployments` - Current mutation deployments
- `cross_chain_summary` - Cross-chain message statistics

## Connection Code Example

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONN_STRING,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    client.release();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

## Health Check Endpoints

- `GET /health` - Basic service health
- `GET /ready` - Database connectivity check
- `GET /analytics/profit-summary` - Profit data
- `GET /mutations/active` - Active mutations

## Quick Deployment

1. **Setup Azure Infrastructure**:
   ```bash
   chmod +x scripts/azure-setup.sh
   ./scripts/azure-setup.sh
   ```

2. **Install Dependencies**:
   ```bash
   cd services/empire-profit-engine
   npm install
   ```

3. **Run Migrations**:
   ```bash
   npm run migrate
   ```

4. **Start Service**:
   ```bash
   npm start
   ```

5. **Verify Database**:
   ```bash
   curl http://localhost:3000/ready
   ```

## Configuration Files

- Database class: `services/empire-profit-engine/src/database/connection.js`
- Migration files: `migrations/001_initial_schema.sql`, `migrations/002_mutations_and_sacred_logic.sql`
- Azure setup: `scripts/azure-setup.sh`
- Package config: `services/empire-profit-engine/package.json`

## Troubleshooting

**Connection Issues:**
- Check `POSTGRES_CONN_STRING` environment variable
- Verify Azure Key Vault access
- Confirm SSL settings match environment

**Migration Issues:**
- Review logs for specific SQL errors
- Check database permissions
- Ensure migrations directory is accessible

**Performance Issues:**
- Monitor connection pool usage
- Check query execution times
- Review index usage patterns