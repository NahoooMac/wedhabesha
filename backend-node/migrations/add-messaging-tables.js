const { query, isPostgreSQL } = require('../config/database');

async function addMessagingTables() {
  try {
    console.log('🔄 Adding messaging system tables...');

    // Create message_threads table
    await query(`
      CREATE TABLE IF NOT EXISTS message_threads (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        couple_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL,
        vendor_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL,
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        last_message_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        is_active BOOLEAN DEFAULT ${isPostgreSQL ? 'TRUE' : '1'},
        lead_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} ${isPostgreSQL ? 'REFERENCES leads(id)' : ''},
        service_type VARCHAR(50),
        ${isPostgreSQL ? 'UNIQUE(couple_id, vendor_id)' : 'UNIQUE(couple_id, vendor_id)'}
      )
    `);
    console.log('✅ Created message_threads table');

    // Create messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        thread_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
        sender_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL,
        sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('couple', 'vendor')),
        content TEXT NOT NULL,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),
        created_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        updated_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
        is_deleted BOOLEAN DEFAULT ${isPostgreSQL ? 'FALSE' : '0'}
      )
    `);
    console.log('✅ Created messages table');

    // Create message_attachments table
    await query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        message_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        uploaded_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
      )
    `);
    console.log('✅ Created message_attachments table');

    // Create message_read_status table
    await query(`
      CREATE TABLE IF NOT EXISTS message_read_status (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        message_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id ${isPostgreSQL ? 'UUID' : 'INTEGER'} NOT NULL,
        read_at ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        ${isPostgreSQL ? 'UNIQUE(message_id, user_id)' : 'UNIQUE(message_id, user_id)'}
      )
    `);
    console.log('✅ Created message_read_status table');

    // Create user_connection_status table
    await query(`
      CREATE TABLE IF NOT EXISTS user_connection_status (
        user_id ${isPostgreSQL ? 'UUID PRIMARY KEY' : 'INTEGER PRIMARY KEY'},
        user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('couple', 'vendor')),
        is_online BOOLEAN DEFAULT ${isPostgreSQL ? 'FALSE' : '0'},
        last_seen ${isPostgreSQL ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
        socket_id VARCHAR(255)
      )
    `);
    console.log('✅ Created user_connection_status table');

    // Create indexes for performance optimization
    console.log('🔄 Creating database indexes...');

    // Indexes for message_threads table
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_threads_couple ON message_threads(couple_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_threads_vendor ON message_threads(vendor_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_threads_last_message ON message_threads(last_message_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_threads_active ON message_threads(is_active)`);
      console.log('✅ Created message_threads indexes');
    } catch (error) {
      console.log('ℹ️ Some message_threads indexes may already exist');
    }

    // Indexes for messages table
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(is_deleted)`);
      console.log('✅ Created messages indexes');
    } catch (error) {
      console.log('ℹ️ Some messages indexes may already exist');
    }

    // Indexes for message_attachments table
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_attachments_type ON message_attachments(file_type)`);
      console.log('✅ Created message_attachments indexes');
    } catch (error) {
      console.log('ℹ️ Some message_attachments indexes may already exist');
    }

    // Indexes for message_read_status table
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_read_status_user ON message_read_status(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_read_status_message ON message_read_status(message_id)`);
      console.log('✅ Created message_read_status indexes');
    } catch (error) {
      console.log('ℹ️ Some message_read_status indexes may already exist');
    }

    // Indexes for user_connection_status table
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_connection_status_online ON user_connection_status(is_online)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_connection_status_last_seen ON user_connection_status(last_seen)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_connection_status_type ON user_connection_status(user_type)`);
      console.log('✅ Created user_connection_status indexes');
    } catch (error) {
      console.log('ℹ️ Some user_connection_status indexes may already exist');
    }

    // Add foreign key constraints for SQLite (PostgreSQL handles them in CREATE TABLE)
    if (!isPostgreSQL) {
      console.log('ℹ️ SQLite foreign key constraints are handled via REFERENCES in CREATE TABLE statements');
    }

    console.log('🎉 Messaging system database migration completed successfully!');
    console.log('📊 Created tables: message_threads, messages, message_attachments, message_read_status, user_connection_status');
    console.log('🔍 Created indexes for optimal query performance');

  } catch (error) {
    console.error('❌ Messaging migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addMessagingTables()
    .then(() => {
      console.log('✅ Messaging migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Messaging migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addMessagingTables };