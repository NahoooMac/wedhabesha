const { query } = require('../config/database');

async function up() {
  console.log('Adding invitation_image_url and image_settings columns to weddings table...');
  
  try {
    // Add invitation_image_url column
    await query(`
      ALTER TABLE weddings 
      ADD COLUMN invitation_image_url TEXT
    `);
    console.log('✓ Added invitation_image_url column');
    
    // Add image_settings column for storing zoom/pan transformations
    await query(`
      ALTER TABLE weddings 
      ADD COLUMN image_settings TEXT
    `);
    console.log('✓ Added image_settings column');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Removing invitation_image_url and image_settings columns from weddings table...');
  
  try {
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    // For now, we'll just log a warning
    console.warn('⚠ SQLite does not support DROP COLUMN. Manual rollback required.');
    console.log('To rollback, you need to:');
    console.log('1. Create a new table without these columns');
    console.log('2. Copy data from old table');
    console.log('3. Drop old table and rename new table');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
