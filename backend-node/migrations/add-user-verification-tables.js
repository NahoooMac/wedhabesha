const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'wedding_platform.db');

function createUserVerificationTables() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('🔧 Creating user verification tables...');
  
  // Create user_verifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'sms')),
      verification_code TEXT NOT NULL,
      verification_token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      attempts INTEGER DEFAULT 0,
      is_used INTEGER DEFAULT 0,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating user_verifications table:', err);
      return;
    }
    console.log('✅ user_verifications table created');
  });

  // Add verification columns to users table if they don't exist
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking users table info:', err);
      return;
    }
    
    const hasIsVerified = columns.some(col => col.name === 'is_verified');
    const hasVerifiedAt = columns.some(col => col.name === 'verified_at');
    
    if (!hasIsVerified) {
      db.run("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0", (err) => {
        if (err) {
          console.error('❌ Error adding is_verified column:', err);
        } else {
          console.log('✅ is_verified column added to users table');
        }
      });
    }
    
    if (!hasVerifiedAt) {
      db.run("ALTER TABLE users ADD COLUMN verified_at DATETIME", (err) => {
        if (err) {
          console.error('❌ Error adding verified_at column:', err);
        } else {
          console.log('✅ verified_at column added to users table');
        }
      });
    }
  });

  // Create indexes for performance
  db.run("CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id)", (err) => {
    if (err) {
      console.error('❌ Error creating user_verifications user_id index:', err);
    } else {
      console.log('✅ user_verifications user_id index created');
    }
  });

  db.run("CREATE INDEX IF NOT EXISTS idx_user_verifications_token ON user_verifications(verification_token)", (err) => {
    if (err) {
      console.error('❌ Error creating user_verifications token index:', err);
    } else {
      console.log('✅ user_verifications token index created');
    }
  });

  db.run("CREATE INDEX IF NOT EXISTS idx_user_verifications_expires ON user_verifications(expires_at)", (err) => {
    if (err) {
      console.error('❌ Error creating user_verifications expires index:', err);
    } else {
      console.log('✅ user_verifications expires index created');
    }
  });

  // Update existing users to be verified (for backward compatibility)
  db.run(`
    UPDATE users 
    SET is_verified = 1, verified_at = created_at 
    WHERE is_verified IS NULL OR is_verified = 0
  `, (err) => {
    if (err) {
      console.error('❌ Error updating existing users:', err);
    } else {
      console.log('✅ Updated existing users to verified status');
    }
  });

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('🎉 User verification tables migration completed');
    }
  });
}

// Run migration if called directly
if (require.main === module) {
  createUserVerificationTables();
}

module.exports = createUserVerificationTables;