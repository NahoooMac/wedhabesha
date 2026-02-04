const { query } = require('../config/database');

async function add2FAMethodField() {
  try {
    console.log('🔄 Adding 2FA method field to users table...');

    // Add 2FA method field to users table
    try {
      await query(`
        ALTER TABLE users ADD COLUMN two_factor_method VARCHAR(20) DEFAULT 'authenticator' CHECK (two_factor_method IN ('sms', 'authenticator'))
      `);
      console.log('✅ Added two_factor_method column to users table');
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️ two_factor_method column already exists');
      } else {
        throw error;
      }
    }

    console.log('🎉 2FA method field migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  add2FAMethodField()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { add2FAMethodField };