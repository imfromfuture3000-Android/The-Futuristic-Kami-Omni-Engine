# Empire Engine Server Database Documentation

## Overview

The Empire Engine uses a **PostgreSQL database** as its primary data store for tracking multi-chain profit optimization operations. The database is hosted on **Azure PostgreSQL Flexible Server** and integrates with the Azure ecosystem for secrets management and monitoring.

## Database Architecture

### Connection Configuration

**Primary Connection String Format:**
```
postgresql://user:password@server.postgres.database.azure.com:5432/postgres?sslmode=require
```

**Environment Variable:**
- `POSTGRES_CONN_STRING` - Complete PostgreSQL connection string

**Connection Pool Settings:**
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds
- SSL: Required in production, optional in development

### Azure Infrastructure

**Resource Details:**
- **Server Name**: `empire-db` (Azure PostgreSQL Flexible Server)
- **Resource Group**: `Empire-RG`
- **Location**: East US
- **Tier**: Burstable (Standard_B2s)
- **Storage**: 32GB
- **Version**: PostgreSQL 14

**Key Vault Integration:**
- Secret name: `postgres-conn-string`
- Key Vault: `empire-kv`
- Access via AKS managed identity

## Database Schema

### Core Tables

#### 1. Sweeps Table
Tracks all token sweeps from relayers across chains.

```sql
CREATE TABLE sweeps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(128) NOT NULL UNIQUE,
    chain VARCHAR(20) NOT NULL, -- 'solana' | 'ethereum' | 'skale'
    token_address VARCHAR(64),
    token_symbol VARCHAR(10),
    amount DECIMAL(36, 18) NOT NULL,
    usd_value DECIMAL(20, 8),
    from_address VARCHAR(64) NOT NULL,
    to_address VARCHAR(64) NOT NULL,
    block_number BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'confirmed' | 'failed'
    gas_fee DECIMAL(20, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Allocations Table
Tracks profit allocation decisions and execution.

```sql
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sweep_id UUID REFERENCES sweeps(id),
    allocation_type VARCHAR(20) NOT NULL, -- 'vault' | 'growth' | 'speculative' | 'treasury'
    percentage DECIMAL(5, 2) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    usd_value DECIMAL(20, 8),
    target_strategy VARCHAR(50), -- 'staking' | 'lending' | 'yield_farming' | 'hold'
    executed BOOLEAN DEFAULT FALSE,
    execution_tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);
```

#### 3. Staking Positions Table
Tracks all staking operations across protocols.

```sql
CREATE TABLE staking_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id UUID REFERENCES allocations(id),
    chain VARCHAR(20) NOT NULL,
    protocol VARCHAR(50) NOT NULL, -- 'solana_validator' | 'lido' | 'rocketpool'
    validator_address VARCHAR(64),
    stake_amount DECIMAL(36, 18) NOT NULL,
    rewards_earned DECIMAL(36, 18) DEFAULT 0,
    apy DECIMAL(5, 4), -- Annual percentage yield
    stake_tx_hash VARCHAR(128),
    unstake_tx_hash VARCHAR(128),
    status VARCHAR(20) DEFAULT 'active', -- 'active' | 'unstaking' | 'unstaked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Mutation Engine Tables

#### 4. Sacred Logic Versions Table
Tracks mutation engine iterations and deployments.

```sql
CREATE TABLE sacred_logic_versions (
    id SERIAL PRIMARY KEY,
    version_hash VARCHAR(64) NOT NULL UNIQUE,
    mutation_type VARCHAR(30) NOT NULL, -- 'profit_optimization' | 'risk_adjustment' | 'strategy_enhancement'
    logic_code TEXT NOT NULL, -- The actual sacred logic
    performance_score DECIMAL(5, 4), -- 0.0000 to 1.0000
    deployment_chains TEXT[], -- Array of chains where deployed
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 5. Chain Deployments Table
Tracks contract deployments across chains.

```sql
CREATE TABLE chain_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sacred_logic_id INTEGER REFERENCES sacred_logic_versions(id),
    chain VARCHAR(20) NOT NULL,
    contract_address VARCHAR(64) NOT NULL,
    deployment_tx_hash VARCHAR(128),
    deployment_cost DECIMAL(20, 8),
    gas_used BIGINT,
    deployer_address VARCHAR(64),
    status VARCHAR(20) DEFAULT 'deploying', -- 'deploying' | 'active' | 'failed' | 'deprecated'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);
```

### Cross-Chain & NFT Tables

#### 6. Cross-Chain Sync Table
Tracks Wormhole/ChainsAtlas synchronization.

```sql
CREATE TABLE cross_chain_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chain VARCHAR(20) NOT NULL,
    target_chain VARCHAR(20) NOT NULL,
    message_type VARCHAR(30) NOT NULL, -- 'profit_claim' | 'strategy_update' | 'nft_fusion'
    source_tx_hash VARCHAR(128) NOT NULL,
    target_tx_hash VARCHAR(128),
    wormhole_sequence BIGINT,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'relayed' | 'completed' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### 7. NFT Fusions Table
Tracks sacred multiplier applications.

```sql
CREATE TABLE nft_fusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_nft_address VARCHAR(64) NOT NULL,
    base_nft_id VARCHAR(32) NOT NULL,
    fusion_nft_address VARCHAR(64),
    fusion_nft_id VARCHAR(32),
    chain VARCHAR(20) NOT NULL,
    sacred_multiplier DECIMAL(8, 6) DEFAULT 1.000000, -- Sacred enhancement factor
    trait_hash VARCHAR(64), -- Hash of combined traits
    fusion_tx_hash VARCHAR(128),
    profit_boost_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    boosted_at TIMESTAMP WITH TIME ZONE
);
```

### Treasury & Audit Tables

#### 8. Treasury Claims Table
Tracks auto-claim operations.

```sql
CREATE TABLE treasury_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain VARCHAR(20) NOT NULL,
    contract_address VARCHAR(64) NOT NULL,
    claim_type VARCHAR(30) NOT NULL, -- 'staking_rewards' | 'trading_profits' | 'nft_royalties'
    amount DECIMAL(36, 18) NOT NULL,
    token_address VARCHAR(64),
    token_symbol VARCHAR(10),
    treasury_address VARCHAR(64) NOT NULL,
    claim_tx_hash VARCHAR(128),
    gas_cost DECIMAL(20, 8),
    net_profit DECIMAL(36, 18), -- Amount minus gas costs
    auto_claimed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 9. Audit Log Table
Tracks all system operations for transparency.

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30), -- 'sweep' | 'allocation' | 'staking' | 'reinvestment'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(64), -- System user or external trigger
    ip_address INET,
    user_agent TEXT,
    mutation_logic_id INTEGER, -- Reference to sacred logic version
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Additional Tables

#### 10. Reinvestments Table
Tracks compound reinvestment decisions.

#### 11. Mutation Logs Table
Tracks all sacred logic generation events.

#### 12. Migrations Table
System table for tracking database migrations.

## Database Views

### Profit Summary View
Real-time profit tracking across all chains:

```sql
CREATE VIEW profit_summary AS
SELECT 
    DATE_TRUNC('day', s.timestamp) as date,
    s.chain,
    COUNT(*) as sweep_count,
    SUM(s.usd_value) as total_swept_usd,
    SUM(CASE WHEN a.allocation_type = 'vault' THEN a.usd_value ELSE 0 END) as vault_allocated,
    SUM(CASE WHEN a.allocation_type = 'growth' THEN a.usd_value ELSE 0 END) as growth_allocated,
    SUM(CASE WHEN a.allocation_type = 'speculative' THEN a.usd_value ELSE 0 END) as speculative_allocated,
    SUM(CASE WHEN a.allocation_type = 'treasury' THEN a.usd_value ELSE 0 END) as treasury_allocated
FROM sweeps s
LEFT JOIN allocations a ON s.id = a.sweep_id
WHERE s.status = 'confirmed'
GROUP BY DATE_TRUNC('day', s.timestamp), s.chain
ORDER BY date DESC;
```

### Staking Performance View
Performance analytics for all staking positions:

```sql
CREATE VIEW staking_performance AS
SELECT 
    sp.chain,
    sp.protocol,
    COUNT(*) as position_count,
    SUM(sp.stake_amount) as total_staked,
    SUM(sp.rewards_earned) as total_rewards,
    AVG(sp.apy) as avg_apy,
    SUM(sp.rewards_earned) / SUM(sp.stake_amount) * 100 as realized_return_pct
FROM staking_positions sp
WHERE sp.status IN ('active', 'unstaked')
GROUP BY sp.chain, sp.protocol
ORDER BY total_rewards DESC;
```

### Active Deployments View
Current mutation engine deployments:

```sql
CREATE VIEW active_deployments AS
SELECT 
    slv.id as logic_id,
    slv.version_hash,
    slv.mutation_type,
    slv.performance_score,
    cd.chain,
    cd.contract_address,
    cd.status as deployment_status,
    cd.created_at as deployed_at
FROM sacred_logic_versions slv
JOIN chain_deployments cd ON slv.id = cd.sacred_logic_id
WHERE slv.is_active = TRUE 
  AND cd.status = 'active'
ORDER BY slv.generated_at DESC;
```

## Database Connection Class

The database connection is managed by the `Database` class in `services/empire-profit-engine/src/database/connection.js`:

### Key Features:
- **Connection pooling** with configurable limits
- **Automatic migrations** on startup
- **Transaction support** with rollback capabilities
- **Query logging** with performance metrics
- **SSL support** for production environments

### Usage Example:

```javascript
const Database = require('./database/connection');

class EmpireProfitEngine {
  constructor() {
    this.db = new Database();
  }

  async start() {
    await this.db.connect();
    await this.db.migrate();
    // Server ready
  }
}
```

## Migration System

### Automatic Migration Process:
1. **Migrations table** tracks executed migrations
2. **SQL files** in `/migrations/` directory are processed in order
3. **Transactional execution** ensures atomicity
4. **Rollback support** on migration failures

### Current Migrations:
- `001_initial_schema.sql` - Core profit tracking tables
- `002_mutations_and_sacred_logic.sql` - Mutation engine tables

## Performance Optimization

### Indexes:
- **Chain and timestamp** indexes for sweep queries
- **Status indexes** for filtering operations
- **Entity indexes** for audit log searches
- **Performance indexes** for analytics queries

### Query Optimization:
- **Prepared statements** for common queries
- **Connection pooling** to reduce overhead
- **View materialization** for complex analytics
- **Partition strategies** for large datasets

## Security & Access Control

### Connection Security:
- **SSL/TLS encryption** required in production
- **Azure Key Vault** integration for credential management
- **Managed identity** authentication for AKS
- **Firewall rules** restricting access to Azure services

### Data Protection:
- **Audit logging** for all operations
- **Transaction integrity** via ACID compliance
- **Backup strategies** via Azure automated backups
- **Point-in-time recovery** capabilities

## Monitoring & Maintenance

### Health Checks:
- **Database connectivity** monitoring
- **Query performance** tracking
- **Migration status** verification
- **Connection pool** health

### Maintenance Tasks:
- **Index optimization** for performance
- **Vacuum operations** for storage efficiency
- **Statistics updates** for query planning
- **Backup verification** for disaster recovery

## Environment Configuration

### Required Environment Variables:

```env
# Database Configuration
POSTGRES_CONN_STRING=postgresql://user:pass@server.postgres.database.azure.com:5432/postgres?sslmode=require
NODE_ENV=production  # Enables SSL and production optimizations
```

### Azure Key Vault Secrets:
- `postgres-conn-string` - Complete database connection string
- `postgres-admin-user` - Database administrator username
- `postgres-admin-password` - Database administrator password

## API Endpoints

The Empire Profit Engine exposes several database-related endpoints:

### Health Endpoints:
- `GET /health` - Basic service health
- `GET /ready` - Database connectivity check

### Analytics Endpoints:
- `GET /analytics/profit-summary` - Profit summary data
- `GET /analytics/staking-performance` - Staking performance metrics

### Mutation Endpoints:
- `GET /mutations/active` - Active mutation deployments
- `POST /mutations/generate` - Generate new sacred logic

## Deployment Instructions

### 1. Azure Infrastructure Setup:
```bash
chmod +x scripts/azure-setup.sh
./scripts/azure-setup.sh
```

### 2. Database Initialization:
```bash
cd services/empire-profit-engine
npm install
npm run migrate
```

### 3. Service Startup:
```bash
npm start
```

### 4. Health Verification:
```bash
curl http://localhost:3000/ready
```

## Troubleshooting

### Common Issues:

#### Connection Timeouts:
- Check Azure firewall rules
- Verify Key Vault access permissions
- Confirm SSL certificate validity

#### Migration Failures:
- Review migration logs in application output
- Check database permissions
- Verify schema compatibility

#### Performance Issues:
- Monitor connection pool utilization
- Analyze slow query logs
- Consider index optimization

### Diagnostic Queries:

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Review recent migrations
SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 5;

-- Monitor query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;
```

## Contact & Support

For database-related issues or questions:
- Review the application logs for detailed error messages
- Check Azure Portal for infrastructure health
- Consult the Empire Engine team for schema modifications