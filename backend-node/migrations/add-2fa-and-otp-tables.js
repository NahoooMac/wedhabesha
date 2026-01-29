const { query } = require('../config/database');

async function add2FAAndOTPTables() {
  try {
    console.log('🔄 Adding 2FA and OTP tables...');

    // Add 2FA fields to users table
    try {
      await query(`
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0
      `);
      console.log('✅ Added two_factor_enabled column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️ two_factor_enabled column already exists');
      }
    }

    try {
      await query(`
        ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255)
      `);
      console.log('✅ Added two_factor_secret column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️ two_factor_secret column already exists');
      }
    }

    try {
      await query(`
        ALTER TABLE users ADD COLUMN backup_codes TEXT
      `);
      console.log('✅ Added backup_codes column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️ backup_codes column already exists');
      }
    }

    try {
      await query(`
        ALTER TABLE users ADD COLUMN last_login_at DATETIME
      `);
      console.log('✅ Added last_login_at column to users table');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️ last_login_at column already exists');
      }
    }

    // Create OTP codes table
    await query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        otp_type VARCHAR(50) NOT NULL CHECK (otp_type IN ('PASSWORD_RESET', '2FA_SETUP', '2FA_LOGIN', 'EMAIL_VERIFICATION')),
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME
      )
    `);
    console.log('✅ Created otp_codes table');

    // Create password reset tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME
      )
    `);
    console.log('✅ Created password_reset_tokens table');

    // Create 2FA backup codes table
    await query(`
      CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(20) NOT NULL,
        is_used BOOLEAN DEFAULT 0,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created two_factor_backup_codes table');

    // Create security events table for audit logging
    await query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT 1,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created security_events table');

    // Create indexes for performance
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
      console.log('✅ Created database indexes');
    } catch (error) {
      console.log('ℹ️ Some indexes may already exist');
    }

    console.log('🎉 2FA and OTP database migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  add2FAAndOTPTables()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { add2FAAndOTPTables };