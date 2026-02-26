/**
 * Professional Migration Manager for Let's Connect Platform
 * Phase 10: Database & Bucket Professionalization (v3.0)
 * 
 * Replaces basic sequelize.sync() with a robust, trackable migration system.
 */

// QueryTypes will be accessed from the provided sequelize instance so that
// we don't force a global dependency on the library; this keeps shared code
// agnostic of where the package is installed.

class MigrationManager {
    constructor(sequelize, serviceName) {
        this.sequelize = sequelize;
        this.serviceName = serviceName;
        this.queryInterface = sequelize.getQueryInterface();
    }

    /**
     * Initialize the migration tracking table
     */
    async _initMigrationTable() {
        await this.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "__migrations" (
        "id" SERIAL PRIMARY KEY,
        "service" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "executed_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("service", "name")
      );
    `);
    }

    /**
     * Get already executed migrations
     */
    async getExecutedMigrations() {
        const rows = await this.sequelize.query(
            'SELECT name FROM "__migrations" WHERE service = :service ORDER BY id ASC',
            {
                replacements: { service: this.serviceName },
                type: this.sequelize.constructor.QueryTypes.SELECT
            }
        );
        return rows.map(r => r.name);
    }

    /**
     * Run a set of migrations
     * @param {Array} migrations Array of objects { name: string, up: function }
     */
    async runMigrations(migrations) {
        await this._initMigrationTable();
        const executed = await this.getExecutedMigrations();

        console.log(`[Migration] Starting migrations for ${this.serviceName}...`);

        for (const migration of migrations) {
            if (executed.includes(migration.name)) {
                continue;
            }

            console.log(`[Migration] Executing: ${migration.name}`);
            const transaction = await this.sequelize.transaction();

            try {
                await migration.up(this.queryInterface, this.sequelize.constructor);

                await this.sequelize.query(
                    'INSERT INTO "__migrations" (service, name) VALUES (:service, :name)',
                    {
                        replacements: { service: this.serviceName, name: migration.name },
                        type: this.sequelize.constructor.QueryTypes.INSERT,
                        transaction
                    }
                );

                await transaction.commit();
                console.log(`[Migration] Success: ${migration.name}`);
            } catch (error) {
                await transaction.rollback();
                console.error(`[Migration] Failed: ${migration.name}`, error);
                throw error;
            }
        }

        console.log(`[Migration] All migrations completed for ${this.serviceName}.`);
    }

    /**
     * Professional table creator (idempotent)
     */
    async ensureTable(tableName, attributes) {
        return this.queryInterface.createTable(tableName, attributes);
    }

    /**
     * Professional index creator (idempotent)
     */
    async ensureIndex(tableName, fields, options = {}) {
        try {
            await this.queryInterface.addIndex(tableName, fields, options);
        } catch (error) {
            if (error.name !== 'SequelizeUniqueConstraintError' && !error.message.includes('already exists')) {
                throw error;
            }
        }
    }
}

module.exports = { MigrationManager };
