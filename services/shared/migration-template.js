/**
 * Migration Template with Rollback Support
 * Workstream F1: Migration Maturity
 * 
 * This template provides a standard structure for database migrations
 * with built-in rollback support and data safety checks.
 * 
 * Usage:
 *   Copy this template and fill in the up/down functions.
 *   Add data safety checks before destructive operations.
 *   Test rollback in staging before production deployment.
 */

const logger = require('./logger');

/**
 * Migration: [MIGRATION_NAME]
 * Description: [BRIEF_DESCRIPTION]
 * Service: [SERVICE_NAME]
 * Date: [YYYY-MM-DD]
 * Author: [AUTHOR_NAME]
 * 
 * Safety Level: LOW | MEDIUM | HIGH | CRITICAL
 *   LOW: Safe operations (add column with default, create index)
 *   MEDIUM: Schema changes affecting queries (rename column, add constraint)
 *   HIGH: Data transformations (update values, backfill data)
 *   CRITICAL: Data deletion or destructive operations
 * 
 * Rollback Strategy: AUTOMATIC | MANUAL | DATA_DEPENDENT
 *   AUTOMATIC: Safe to rollback with down() function
 *   MANUAL: Requires manual intervention (document steps below)
 *   DATA_DEPENDENT: Rollback depends on data state (may require backup restore)
 */

module.exports = {
  name: '[MIGRATION_NAME]',
  
  /**
   * Up migration: Apply schema or data changes
   * @param {QueryInterface} queryInterface - Sequelize query interface
   * @param {Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Pre-migration safety checks
      await this._preMigrationChecks(queryInterface);
      
      // ============================================
      // MIGRATION STEPS (fill in your changes here)
      // ============================================
      
      // Example: Add new column with default value
      await queryInterface.addColumn(
        'TableName',
        'new_column',
        {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: null
        },
        { transaction }
      );
      
      // Example: Create index for performance
      await queryInterface.addIndex(
        'TableName',
        ['indexed_column'],
        {
          name: 'idx_table_column',
          transaction
        }
      );
      
      // Example: Data backfill (for HIGH safety migrations)
      // await queryInterface.sequelize.query(
      //   'UPDATE "TableName" SET new_column = old_column WHERE new_column IS NULL',
      //   { transaction }
      // );
      
      await transaction.commit();
      logger.info('Migration up successful', { migration: this.name });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Migration up failed', { 
        migration: this.name, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  },
  
  /**
   * Down migration: Rollback changes safely
   * @param {QueryInterface} queryInterface - Sequelize query interface
   * @param {Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Pre-rollback safety checks
      await this._preRollbackChecks(queryInterface);
      
      // =============================================
      // ROLLBACK STEPS (reverse of up() operations)
      // =============================================
      
      // Example: Remove index
      await queryInterface.removeIndex(
        'TableName',
        'idx_table_column',
        { transaction }
      );
      
      // Example: Remove column (WARNING: Data loss!)
      // Only if AUTOMATIC rollback is safe
      await queryInterface.removeColumn(
        'TableName',
        'new_column',
        { transaction }
      );
      
      await transaction.commit();
      logger.info('Migration down successful', { migration: this.name });
      
    } catch (error) {
      await transaction.rollback();
      logger.error('Migration down failed', { 
        migration: this.name, 
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  },
  
  /**
   * Pre-migration safety checks
   * Verify preconditions before applying migration
   */
  async _preMigrationChecks(queryInterface) {
    // Example: Check if table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('TableName')) {
      throw new Error('Required table "TableName" does not exist');
    }
    
    // Example: Check for existing data (CRITICAL migrations)
    // const [results] = await queryInterface.sequelize.query(
    //   'SELECT COUNT(*) as count FROM "TableName" WHERE condition'
    // );
    // if (results[0].count > 0) {
    //   logger.warn('Migration will affect existing data', { 
    //     migration: this.name,
    //     affectedRows: results[0].count
    //   });
    // }
    
    // Example: Verify required columns exist
    // const tableDescription = await queryInterface.describeTable('TableName');
    // if (!tableDescription.required_column) {
    //   throw new Error('Required column "required_column" missing');
    // }
  },
  
  /**
   * Pre-rollback safety checks
   * Verify it's safe to rollback before proceeding
   */
  async _preRollbackChecks(queryInterface) {
    // Example: Check if column is unused before removal
    // const [results] = await queryInterface.sequelize.query(
    //   'SELECT COUNT(*) as count FROM "TableName" WHERE new_column IS NOT NULL'
    // );
    // if (results[0].count > 0) {
    //   throw new Error(
    //     `Cannot rollback: ${results[0].count} rows have data in new_column. ` +
    //     'Manual data migration required before rollback.'
    //   );
    // }
    
    logger.info('Pre-rollback checks passed', { migration: this.name });
  }
};

/**
 * Data Safety Checklist
 * 
 * Before deploying this migration to production:
 * 
 * □ Migration tested in local development environment
 * □ Migration tested in staging with production-like data
 * □ Rollback tested in staging environment
 * □ Performance impact assessed (estimated duration, resource usage)
 * □ Backup verification completed (can restore if needed)
 * □ Monitoring alerts configured for migration errors
 * □ Rollback plan documented and communicated to team
 * □ Database capacity checked (enough space for migration)
 * □ Concurrent query impact assessed (will it block operations?)
 * □ Data validation queries prepared for post-migration verification
 * 
 * For CRITICAL migrations (data deletion):
 * □ Manual backup created and verified
 * □ Data export completed for affected records
 * □ Approval obtained from tech lead and stakeholders
 * □ Rollback window scheduled (off-peak hours)
 * □ Communication plan prepared for users if downtime required
 */

/**
 * Manual Rollback Steps (if MANUAL rollback strategy)
 * 
 * If automatic rollback via down() is not safe or possible:
 * 
 * 1. [Step-by-step instructions for manual rollback]
 * 2. [SQL queries to execute]
 * 3. [Data restoration procedures]
 * 4. [Verification steps to confirm rollback success]
 * 
 * Example:
 * 1. Stop application servers to prevent writes
 * 2. Run: UPDATE "TableName" SET old_column = new_column;
 * 3. Run: ALTER TABLE "TableName" DROP COLUMN new_column;
 * 4. Restart application servers
 * 5. Verify: SELECT COUNT(*) FROM "TableName" WHERE old_column IS NULL;
 */

/**
 * Post-Migration Verification Queries
 * 
 * Run these queries after migration to verify success:
 */
const verificationQueries = [
  // Example: Verify column exists
  // `SELECT column_name FROM information_schema.columns 
  //  WHERE table_name = 'TableName' AND column_name = 'new_column'`,
  
  // Example: Verify data integrity
  // `SELECT COUNT(*) FROM "TableName" WHERE new_column IS NULL`,
  
  // Example: Verify index created
  // `SELECT indexname FROM pg_indexes 
  //  WHERE tablename = 'TableName' AND indexname = 'idx_table_column'`
];

module.exports.verificationQueries = verificationQueries;
