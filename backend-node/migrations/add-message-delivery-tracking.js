/**
 * Migration: Add Message Delivery Tracking
 * 
 * Adds columns to track message delivery and read status with timestamps
 * for implementing delivery and read receipts in the messaging system.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-29
 */

const { query } = require('../config/database');

/**
 * Run migration - Add delivery tracking columns
 */
async function up() {
  console.log('🔄 Running migration: add-message-delivery-tracking');

  try {
    // Check if columns already exist
    const tableInfo = await query(`PRAGMA table_info(messages)`);
    const columns = tableInfo.rows.map(row => row.name);

    // Add delivered_at column if it doesn't exist
    if (!columns.includes('delivered_at')) {
      await query(`
        ALTER TABLE messages 
        ADD COLUMN delivered_at DATETIME
      `);
      console.log('✅ Added delivered_at column to messages table');
    } else {
      console.log('⏭️  delivered_at column already exists');
    }

    // Add read_at column if it doesn't exist
    if (!columns.includes('read_at')) {
      await query(`
        ALTER TABLE messages 
        ADD COLUMN read_at DATETIME
      `);
      console.log('✅ Added read_at column to messages table');
    } else {
      console.log('⏭️  read_at column already exists');
    }

    // Add delivery_status column if it doesn't exist
    if (!columns.includes('delivery_status')) {
      await query(`
        ALTER TABLE messages 
        ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'sending'
      `);
      console.log('✅ Added delivery_status column to messages table');
    } else {
      console.log('⏭️  delivery_status column already exists');
    }

    // Update existing messages to have 'sent' status
    await query(`
      UPDATE messages 
      SET delivery_status = 'sent' 
      WHERE delivery_status IS NULL OR delivery_status = 'sending'
    `);
    console.log('✅ Updated existing messages with sent status');

    console.log('✅ Migration completed successfully: add-message-delivery-tracking');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed: add-message-delivery-tracking', error);
    throw error;
  }
}

/**
 * Rollback migration - Remove delivery tracking columns
 */
async function down() {
  console.log('🔄 Rolling back migration: add-message-delivery-tracking');

  try {
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    // For now, we'll just log a warning
    console.warn('⚠️  SQLite does not support DROP COLUMN. Manual intervention required to rollback.');
    console.warn('⚠️  To rollback, you would need to:');
    console.warn('   1. Create a new messages table without the new columns');
    console.warn('   2. Copy data from old table to new table');
    console.warn('   3. Drop old table and rename new table');

    return { success: false, message: 'Manual rollback required for SQLite' };

  } catch (error) {
    console.error('❌ Rollback failed: add-message-delivery-tracking', error);
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
