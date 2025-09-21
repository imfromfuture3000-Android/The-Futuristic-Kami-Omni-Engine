/**
 * Immutable Audit Service for Empire Earnings
 * Provides tamper-proof audit trails for all earnings operations
 */

const crypto = require('crypto');
// Simple console logger for testing (fallback if winston not available)
let logger;
try {
  const { logger: winstonLogger } = require('../utils/logger');
  logger = winstonLogger;
} catch (error) {
  logger = {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : ''),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : ''),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '')
  };
}
const immutableConfig = require('../immutable-earnings-config');

class ImmutableAuditService {
  constructor(database) {
    this.db = database;
    this.auditConfig = immutableConfig.getAuditConfig();

    // Verify audit configuration is immutable
    this._verifyAuditConfig();

    logger.info('Immutable Audit Service initialized', {
      auditEnabled: this.auditConfig.enableAuditTrail,
      immutableOperations: this.auditConfig.immutableOperations.length
    });
  }

  /**
   * Verify audit configuration integrity
   */
  _verifyAuditConfig() {
    if (!this.auditConfig.enableAuditTrail) {
      throw new Error('Audit trail must be enabled for immutable earnings system');
    }

    if (!this.auditConfig.immutableOperations || this.auditConfig.immutableOperations.length === 0) {
      throw new Error('Immutable operations list cannot be empty');
    }

    logger.info('Audit configuration verified');
  }

  /**
   * Create immutable audit entry
   */
  async createAuditEntry(operation, entityType, entityId, data, userId = 'system') {
    try {
      // Verify operation is recognized as immutable
      if (!immutableConfig.isImmutableOperation(operation)) {
        logger.warn('Operation not in immutable operations list', { operation });
      }

      // Create audit data hash for immutability
      const auditData = {
        operation,
        entityType,
        entityId,
        data,
        userId,
        timestamp: new Date().toISOString(),
        configHash: immutableConfig.getDeploymentInfo().contractHash
      };

      const dataHash = this._calculateDataHash(auditData);

      // Store audit entry with hash
      const result = await this.db.query(`
        INSERT INTO immutable_audit_log (
          operation, entity_type, entity_id, data, user_id,
          data_hash, config_hash, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        operation,
        entityType,
        entityId,
        JSON.stringify(data),
        userId,
        dataHash,
        auditData.configHash,
        auditData.timestamp
      ]);

      logger.info('Immutable audit entry created', {
        operation,
        entityId,
        auditId: result.rows[0].id,
        dataHash
      });

      return result.rows[0];

    } catch (error) {
      logger.error('Failed to create immutable audit entry', error);
      throw error;
    }
  }

  /**
   * Verify audit entry integrity
   */
  async verifyAuditEntry(auditId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM immutable_audit_log WHERE id = $1',
        [auditId]
      );

      if (result.rows.length === 0) {
        return { isValid: false, error: 'Audit entry not found' };
      }

      const entry = result.rows[0];
      const storedData = JSON.parse(entry.data);

      const auditData = {
        operation: entry.operation,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        data: storedData,
        userId: entry.user_id,
        timestamp: entry.created_at,
        configHash: entry.config_hash
      };

      const calculatedHash = this._calculateDataHash(auditData);

      if (calculatedHash !== entry.data_hash) {
        return {
          isValid: false,
          error: 'Audit entry data hash mismatch - possible tampering',
          storedHash: entry.data_hash,
          calculatedHash
        };
      }

      // Verify config hash matches current immutable config
      const currentConfigHash = immutableConfig.getDeploymentInfo().contractHash;
      if (entry.config_hash !== currentConfigHash) {
        return {
          isValid: false,
          error: 'Configuration hash mismatch - immutable config may have changed',
          storedConfigHash: entry.config_hash,
          currentConfigHash
        };
      }

      return {
        isValid: true,
        auditId,
        operation: entry.operation,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to verify audit entry', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(entityType, entityId, limit = 50) {
    try {
      const result = await this.db.query(`
        SELECT * FROM immutable_audit_log
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `, [entityType, entityId, limit]);

      // Verify integrity of each entry
      const verifiedEntries = [];
      for (const entry of result.rows) {
        const verification = await this.verifyAuditEntry(entry.id);
        verifiedEntries.push({
          ...entry,
          integrityVerified: verification.isValid,
          verificationError: verification.error
        });
      }

      return verifiedEntries;

    } catch (error) {
      logger.error('Failed to get audit trail', error);
      throw error;
    }
  }

  /**
   * Calculate data hash for immutability
   */
  _calculateDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash(this.auditConfig.hashAlgorithm).update(dataString).digest('hex');
  }

  /**
   * Get audit statistics
   */
  async getAuditStats() {
    try {
      const result = await this.db.query(`
        SELECT
          COUNT(*) as total_entries,
          COUNT(DISTINCT entity_type) as entity_types,
          COUNT(DISTINCT operation) as operations,
          MIN(created_at) as first_entry,
          MAX(created_at) as last_entry
        FROM immutable_audit_log
      `);

      const integrityResult = await this.db.query(`
        SELECT COUNT(*) as verified_entries
        FROM immutable_audit_log
        WHERE data_hash IS NOT NULL
      `);

      return {
        ...result.rows[0],
        verifiedEntries: parseInt(integrityResult.rows[0].verified_entries),
        configHash: immutableConfig.getDeploymentInfo().contractHash,
        auditEnabled: this.auditConfig.enableAuditTrail
      };

    } catch (error) {
      logger.error('Failed to get audit stats', error);
      throw error;
    }
  }

  /**
   * Create earnings operation audit
   */
  async auditEarningsOperation(operation, sweepId, allocationData) {
    return this.createAuditEntry(
      operation,
      'earnings_allocation',
      sweepId,
      {
        ...allocationData,
        immutableConfigHash: immutableConfig.getDeploymentInfo().contractHash,
        allocationPercentages: immutableConfig.getAllocations()
      },
      'immutable-earnings-system'
    );
  }

  /**
   * Verify earnings operation integrity
   */
  async verifyEarningsOperation(sweepId) {
    const auditTrail = await this.getAuditTrail('earnings_allocation', sweepId);

    if (auditTrail.length === 0) {
      return { isValid: false, error: 'No audit trail found for earnings operation' };
    }

    // Check if all entries are verified
    const invalidEntries = auditTrail.filter(entry => !entry.integrityVerified);

    if (invalidEntries.length > 0) {
      return {
        isValid: false,
        error: `${invalidEntries.length} audit entries failed integrity verification`,
        invalidEntries: invalidEntries.map(e => ({ id: e.id, error: e.verificationError }))
      };
    }

    return {
      isValid: true,
      auditEntries: auditTrail.length,
      verifiedAt: new Date().toISOString()
    };
  }
}

module.exports = ImmutableAuditService;