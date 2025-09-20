const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_CONN_STRING,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      logger.info('Database connection established');
      client.release();
    } catch (error) {
      logger.error('Database connection failed', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query failed', { text, params, error: error.message });
      throw error;
    }
  }

  async migrate() {
    logger.info('Starting database migrations...');
    
    try {
      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Get list of executed migrations
      const executedMigrations = await this.query('SELECT filename FROM migrations');
      const executedFiles = executedMigrations.rows.map(row => row.filename);

      // Find migration files
      const migrationsDir = path.join(__dirname, '../../migrations');
      const migrationFiles = await fs.readdir(migrationsDir);
      const sqlFiles = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Execute pending migrations
      for (const file of sqlFiles) {
        if (!executedFiles.includes(file)) {
          logger.info(`Executing migration: ${file}`);
          
          const filePath = path.join(migrationsDir, file);
          const sql = await fs.readFile(filePath, 'utf8');
          
          // Execute migration in a transaction
          const client = await this.pool.connect();
          try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
            await client.query('COMMIT');
            logger.info(`Migration completed: ${file}`);
          } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Migration failed: ${file}`, error);
            throw error;
          } finally {
            client.release();
          }
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}

module.exports = Database;