const { query } = require('../config/database');

/**
 * Migration: Add notifications table
 * This table stores in-app notifications for users
 */

async function up() {
  try {
    console.log('🔄 Creating notifications table...');

    // Create notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        link VARCHAR(500),
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
      ON notifications(user_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
      ON notifications(is_read)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
      ON notifications(created_at DESC)
    `);

    console.log('✅ Notifications table created successfully');

    // Insert welcome notifications for existing users
    const usersResult = await query('SELECT id, user_type FROM users WHERE is_active = 1');
    
    for (const user of usersResult.rows) {
      await query(`
        INSERT INTO notifications (user_id, type, title, message, is_read)
        VALUES (?, ?, ?, ?, 0)
      `, [
        user.id,
        'announcement',
        'Welcome to WedHabesha!',
        user.user_type === 'COUPLE' 
          ? 'Thank you for joining our platform. Start planning your perfect wedding today!'
          : 'Welcome to the Vendor Portal. Complete your profile to start receiving inquiries from couples.'
      ]);
    }

    console.log(`✅ Welcome notifications created for ${usersResult.rows.length} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Rolling back notifications table...');

    await query('DROP INDEX IF EXISTS idx_notifications_created_at');
    await query('DROP INDEX IF EXISTS idx_notifications_is_read');
    await query('DROP INDEX IF EXISTS idx_notifications_user_id');
    await query('DROP TABLE IF EXISTS notifications');

    console.log('✅ Notifications table rolled back successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
