const { query, isPostgreSQL } = require('../config/database');

async function addDataDeletionTable() {
  try {
    console.log('🔄 Adding data deletion requests table...');

    // Create data_deletion_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        user_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL,
        user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('couple', 'vendor')),
        requested_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        scheduled_deletion_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'} NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed', 'failed')),
        cancelled_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
        completed_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME'},
        error_message TEXT
      )
    `);
    console.log('✅ Created data_deletion_requests table');

    // Create indexes for performance optimization
    console.log('🔄 Creating database indexes...');

    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_deletion_user ON data_deletion_requests(user_id, user_type)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_deletion_scheduled ON data_deletion_requests(scheduled_deletion_at)`);
      console.log('✅ Created data_deletion_requests indexes');
    } catch (error) {
      console.log('ℹ️ Some data_deletion_requests indexes may already exist');
    }

    console.log('🎉 Data deletion table migration completed successfully!');

  } catch (error) {
    console.error('❌ Data deletion migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addDataDeletionTable()
    .then(() => {
      console.log('✅ Data deletion migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data deletion migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addDataDeletionTable };
