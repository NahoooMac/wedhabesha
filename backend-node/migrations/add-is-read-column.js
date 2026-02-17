const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

console.log('🔄 Adding is_read column to messages table...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
});

// Add is_read column
db.run(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('ℹ️  Column is_read already exists, skipping...');
    } else {
      console.error('❌ Error adding is_read column:', err.message);
      db.close();
      process.exit(1);
    }
  } else {
    console.log('✅ Successfully added is_read column to messages table');
  }

  // Update existing messages to set is_read based on read_at
  db.run(`UPDATE messages SET is_read = CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END`, (err) => {
    if (err) {
      console.error('❌ Error updating existing messages:', err.message);
    } else {
      console.log('✅ Updated existing messages with is_read values based on read_at');
    }

    // Verify the column was added
    db.all("PRAGMA table_info(messages)", [], (err, columns) => {
      if (err) {
        console.error('❌ Error verifying column:', err.message);
      } else {
        const hasIsRead = columns.some(col => col.name === 'is_read');
        if (hasIsRead) {
          console.log('✅ Verified: is_read column exists in messages table');
          console.log('\n📊 Column details:');
          const isReadCol = columns.find(col => col.name === 'is_read');
          console.log(`   Name: ${isReadCol.name}`);
          console.log(`   Type: ${isReadCol.type}`);
          console.log(`   Default: ${isReadCol.dflt_value}`);
        } else {
          console.log('❌ Verification failed: is_read column not found');
        }
      }

      db.close();
      console.log('\n✅ Migration complete!');
    });
  });
});
