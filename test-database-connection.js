#!/usr/bin/env node

/**
 * Empire Engine Database Connection Test
 * This script demonstrates how to connect to the server database
 * and perform basic operations.
 */

const { Pool } = require('pg');
require('dotenv').config();

class DatabaseTest {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_CONN_STRING,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async testConnection() {
    console.log('🔍 Testing Empire Engine Database Connection...\n');

    try {
      // Test basic connectivity
      console.log('1. Testing basic connectivity...');
      const client = await this.pool.connect();
      console.log('✅ Successfully connected to database');
      
      // Test database version
      const versionResult = await client.query('SELECT version()');
      console.log(`📊 Database version: ${versionResult.rows[0].version.split(' ')[1]}`);
      
      // Test current time
      const timeResult = await client.query('SELECT NOW() as current_time');
      console.log(`⏰ Database time: ${timeResult.rows[0].current_time}`);
      
      client.release();
      
      // Test schema existence
      console.log('\n2. Testing schema...');
      await this.testSchema();
      
      // Test views
      console.log('\n3. Testing views...');
      await this.testViews();
      
      // Test sample queries
      console.log('\n4. Testing sample queries...');
      await this.testQueries();
      
      console.log('\n✅ All database tests passed successfully!');
      console.log('\nDatabase is ready for Empire Engine operations.');
      
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.log('\n💡 Suggestions:');
        console.log('   - Check your POSTGRES_CONN_STRING environment variable');
        console.log('   - Verify the database server hostname is correct');
        console.log('   - Ensure network connectivity to the database server');
      } else if (error.code === '28P01') {
        console.log('\n💡 Suggestions:');
        console.log('   - Check your database username and password');
        console.log('   - Verify credentials in Azure Key Vault');
      } else if (error.code === '28000') {
        console.log('\n💡 Suggestions:');
        console.log('   - Check SSL configuration');
        console.log('   - Verify firewall rules allow your IP address');
      }
    }
  }

  async testSchema() {
    try {
      // Check if migrations table exists
      const migrationsResult = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        )
      `);
      
      if (migrationsResult.rows[0].exists) {
        console.log('✅ Migrations table exists');
        
        // Check executed migrations
        const executedMigrations = await this.pool.query('SELECT filename FROM migrations ORDER BY executed_at');
        console.log(`📄 Executed migrations: ${executedMigrations.rows.length}`);
        executedMigrations.rows.forEach(row => {
          console.log(`   - ${row.filename}`);
        });
      } else {
        console.log('⚠️  Migrations table not found - run migrations first');
      }

      // Check core tables
      const coreTableResult = await this.pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sweeps', 'allocations', 'staking_positions', 'sacred_logic_versions')
        ORDER BY table_name
      `);
      
      console.log(`📊 Core tables found: ${coreTableResult.rows.length}/4`);
      coreTableResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });

    } catch (error) {
      console.error('❌ Schema test failed:', error.message);
    }
  }

  async testViews() {
    try {
      // Check if views exist
      const viewsResult = await this.pool.query(`
        SELECT table_name FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name IN ('profit_summary', 'staking_performance', 'active_deployments')
        ORDER BY table_name
      `);
      
      console.log(`📊 Views found: ${viewsResult.rows.length}/3`);
      viewsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });

      if (viewsResult.rows.length === 0) {
        console.log('⚠️  No views found - ensure migrations have been run');
      }

    } catch (error) {
      console.error('❌ Views test failed:', error.message);
    }
  }

  async testQueries() {
    try {
      // Test sweep count
      const sweepCount = await this.pool.query('SELECT COUNT(*) as count FROM sweeps');
      console.log(`💰 Total sweeps recorded: ${sweepCount.rows[0].count}`);

      // Test allocation count
      const allocationCount = await this.pool.query('SELECT COUNT(*) as count FROM allocations');
      console.log(`📊 Total allocations: ${allocationCount.rows[0].count}`);

      // Test staking positions
      const stakingCount = await this.pool.query('SELECT COUNT(*) as count FROM staking_positions');
      console.log(`🏦 Total staking positions: ${stakingCount.rows[0].count}`);

      // Test sacred logic versions
      const logicCount = await this.pool.query('SELECT COUNT(*) as count FROM sacred_logic_versions');
      console.log(`🔮 Sacred logic versions: ${logicCount.rows[0].count}`);

      // Test recent activity
      const recentActivity = await this.pool.query(`
        SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as operations
        FROM audit_log
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 5
      `);

      if (recentActivity.rows.length > 0) {
        console.log('📈 Recent activity (last 7 days):');
        recentActivity.rows.forEach(row => {
          const date = new Date(row.date).toISOString().split('T')[0];
          console.log(`   ${date}: ${row.operations} operations`);
        });
      } else {
        console.log('📭 No recent activity recorded');
      }

    } catch (error) {
      console.error('❌ Query test failed:', error.message);
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Environment variable check
function checkEnvironment() {
  console.log('🔧 Checking environment configuration...\n');
  
  if (!process.env.POSTGRES_CONN_STRING) {
    console.error('❌ POSTGRES_CONN_STRING environment variable not set');
    console.log('\n💡 Set it using:');
    console.log('export POSTGRES_CONN_STRING="postgresql://user:pass@server:5432/postgres?sslmode=require"');
    console.log('\nOr create a .env file with:');
    console.log('POSTGRES_CONN_STRING=postgresql://user:pass@server:5432/postgres?sslmode=require');
    process.exit(1);
  }

  console.log('✅ POSTGRES_CONN_STRING is set');
  
  // Mask the connection string for security
  const connStr = process.env.POSTGRES_CONN_STRING;
  const masked = connStr.replace(/(:\/\/)([^:]+):([^@]+)(@)/, '$1***:***$4');
  console.log(`📝 Connection: ${masked}`);
  
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}

// Main execution
async function main() {
  checkEnvironment();
  
  const dbTest = new DatabaseTest();
  
  try {
    await dbTest.testConnection();
  } finally {
    await dbTest.close();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down database test...');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = DatabaseTest;