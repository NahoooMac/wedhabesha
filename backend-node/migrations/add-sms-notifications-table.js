/**
 * Migration: Add SMS Notifications Table
 * 
 * Creates a table to track SMS notifications sent for unread messages
 * after 24 hours. Prevents duplicate SMS notifications.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

const { query } = require('../config/database');

/**
 * Run migration - Create sms_notifications table
 */
async function up() {
  console.log('🔄 Running migration: add-sms-notifications-table');

  try {
    // Check if table already exists
    const tableCheck = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='sms_notifications'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('⏭️  sms_notifications table already exists');
      return { success: true, message: 'Table already exists' };
    }

    // Create sms_notifications table
    await query(`
      CREATE TABLE sms_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        thread_id INTEGER NOT NULL,
        recipient_phone VARCHAR(20) NOT NULL,
        sms_content TEXT NOT NULL,
        sent_at DATETIME,
        delivery_status VARCHAR(20) DEFAULT 'pending',
        afrosms_message_id VARCHAR(100),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created sms_notifications table');

    // Create index on message_id for faster lookups
    await query(`
      CREATE INDEX idx_sms_notifications_message_id 
      ON sms_notifications(message_id)
    `);
    console.log('✅ Created index on message_id');

    // Create index on thread_id for faster lookups
    await query(`
      CREATE INDEX idx_sms_notifications_thread_id 
      ON sms_notifications(thread_id)
    `);
    console.log('✅ Created index on thread_id');

    // Create index on delivery_status for filtering
    await query(`
      CREATE INDEX idx_sms_notifications_delivery_status 
      ON sms_notifications(delivery_status)
    `);
    console.log('✅ Created index on delivery_status');

    // Create index on created_at for time-based queries
    await query(`
      CREATE INDEX idx_sms_notifications_created_at 
      ON sms_notifications(created_at)
    `);
    console.log('✅ Created index on created_at');

    console.log('✅ Migration completed successfully: add-sms-notifications-table');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed: add-sms-notifications-table', error);
    throw error;
  }
}

/**
 * Rollback migration - Drop sms_notifications table
 */
async function down() {
  console.log('🔄 Rolling back migration: add-sms-notifications-table');

  try {
    // Drop indexes first
    await query(`DROP INDEX IF EXISTS idx_sms_notifications_message_id`);
    await query(`DROP INDEX IF EXISTS idx_sms_notifications_thread_id`);
    await query(`DROP INDEX IF EXISTS idx_sms_notifications_delivery_status`);
    await query(`DROP INDEX IF EXISTS idx_sms_notifications_created_at`);
    console.log('✅ Dropped indexes');

    // Drop table
    await query(`DROP TABLE IF EXISTS sms_notifications`);
    console.log('✅ Dropped sms_notifications table');

    console.log('✅ Rollback completed successfully: add-sms-notifications-table');
    return { success: true };

  } catch (error) {
    console.error('❌ Rollback failed: add-sms-notifications-table', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
