const { query } = require('../config/database');

/**
 * Migration: Add message_attachments table
 * 
 * Creates the message_attachments table to store file attachments for messages
 */

async function up() {
  console.log('📁 Creating message_attachments table...');

  try {
    // Create message_attachments table
    await query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
      ON message_attachments(message_id)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_at 
      ON message_attachments(uploaded_at)
    `);

    console.log('✅ message_attachments table created successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to create message_attachments table:', error);
    return { success: false, error: error.message };
  }
}

async function down() {
  console.log('🗑️ Dropping message_attachments table...');

  try {
    // Drop indexes first
    await query('DROP INDEX IF EXISTS idx_message_attachments_message_id');
    await query('DROP INDEX IF EXISTS idx_message_attachments_uploaded_at');
    
    // Drop table
    await query('DROP TABLE IF EXISTS message_attachments');

    console.log('✅ message_attachments table dropped successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Failed to drop message_attachments table:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { up, down };