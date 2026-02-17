const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding 2FA_DISABLE to OTP types...\n');

db.serialize(() => {
  // Check current schema
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='otp_codes'", (err, row) => {
    if (err) {
      console.error('❌ Error checking schema:', err);
      db.close();
      return;
    }

    console.log('Current otp_codes table schema:');
    console.log(row.sql);
    console.log('');

    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    // We need to recreate the table with the new constraint
    
    console.log('Step 1: Creating backup of otp_codes table...');
    db.run(`CREATE TABLE otp_codes_backup AS SELECT * FROM otp_codes`, (err) => {
      if (err) {
        console.error('❌ Error creating backup:', err);
        db.close();
        return;
      }
      console.log('✅ Backup created\n');

      console.log('Step 2: Dropping old otp_codes table...');
      db.run(`DROP TABLE otp_codes`, (err) => {
        if (err) {
          console.error('❌ Error dropping table:', err);
          db.close();
          return;
        }
        console.log('✅ Old table dropped\n');

        console.log('Step 3: Creating new otp_codes table with updated constraint...');
        db.run(`
          CREATE TABLE otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT,
            phone TEXT,
            otp_code TEXT NOT NULL,
            otp_type TEXT NOT NULL CHECK(otp_type IN ('PASSWORD_RESET', '2FA_SETUP', '2FA_LOGIN', '2FA_DISABLE', 'EMAIL_VERIFICATION')),
            expires_at TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 3,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            used_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating new table:', err);
            // Restore from backup
            db.run(`ALTER TABLE otp_codes_backup RENAME TO otp_codes`, () => {
              console.log('⚠️  Restored from backup');
              db.close();
            });
            return;
          }
          console.log('✅ New table created with 2FA_DISABLE type\n');

          console.log('Step 4: Restoring data from backup...');
          db.run(`
            INSERT INTO otp_codes (id, user_id, email, phone, otp_code, otp_type, expires_at, created_at, used_at, ip_address, user_agent)
            SELECT id, user_id, email, phone, otp_code, otp_type, expires_at, created_at, used_at, ip_address, user_agent
            FROM otp_codes_backup
          `, (err) => {
            if (err) {
              console.error('❌ Error restoring data:', err);
              db.close();
              return;
            }
            console.log('✅ Data restored\n');

            console.log('Step 5: Dropping backup table...');
            db.run(`DROP TABLE otp_codes_backup`, (err) => {
              if (err) {
                console.error('❌ Error dropping backup:', err);
              } else {
                console.log('✅ Backup table dropped\n');
              }

              // Verify the new schema
              db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='otp_codes'", (err, row) => {
                if (err) {
                  console.error('❌ Error verifying schema:', err);
                } else {
                  console.log('✅ Migration complete!\n');
                  console.log('New otp_codes table schema:');
                  console.log(row.sql);
                  console.log('\n✅ 2FA_DISABLE OTP type is now supported');
                }
                db.close();
              });
            });
          });
        });
      });
    });
  });
});
