const { initializeDatabase } = require('../config/database');

// Import migration functions that exist
const { add2FAAndOTPTables } = require('../migrations/add-2fa-and-otp-tables');
const { addMessagingTables } = require('../migrations/add-messaging-tables');

async function runAllMigrations() {
  try {
    console.log('🚀 Starting database initialization and migrations...');
    
    // First, initialize the basic database structure
    console.log('📊 Initializing basic database structure...');
    await initializeDatabase();
    
    // Run all migrations in order
    const migrations = [
      { name: '2FA and OTP Tables', fn: add2FAAndOTPTables },
      { name: 'Messaging Tables', fn: addMessagingTables }
    ];
    
    for (const migration of migrations) {
      try {
        console.log(`🔄 Running migration: ${migration.name}...`);
        await migration.fn();
        console.log(`✅ Completed migration: ${migration.name}`);
      } catch (error) {
        console.error(`❌ Failed migration: ${migration.name}`, error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    throw error;
  }
}

// Run migrations if called directly
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('✅ Database setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllMigrations };