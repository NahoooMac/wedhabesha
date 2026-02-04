const { query, isPostgreSQL } = require('../config/database');

/**
 * Rollback Script: Remove RSVP template selection columns from weddings table
 * 
 * This script provides a safe rollback mechanism for the add-rsvp-template-columns migration.
 * 
 * IMPORTANT: This is a destructive operation that will remove the template_id and 
 * template_customization columns along with all data stored in them.
 * 
 * For SQLite: Due to limited ALTER TABLE support, this requires recreating the table
 * For PostgreSQL: Uses standard DROP COLUMN commands
 * 
 * Usage: node migrations/rollback-rsvp-template-columns.js
 */

async function rollbackSQLite() {
  console.log('Rolling back for SQLite database...\n');
  
  try {
    // Step 1: Get current table schema
    const schemaResult = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='weddings'");
    if (schemaResult.rows.length === 0) {
      throw new Error('Weddings table not found');
    }
    
    console.log('Current weddings table schema:');
    console.log(schemaResult.rows[0].sql);
    console.log('');
    
    // Step 2: Create backup table with all current data
    console.log('Creating backup table...');
    await query('CREATE TABLE weddings_backup AS SELECT * FROM weddings');
    console.log('✓ Backup table created');
    
    // Step 3: Drop the original table
    console.log('Dropping original weddings table...');
    await query('DROP TABLE weddings');
    console.log('✓ Original table dropped');
    
    // Step 4: Recreate weddings table without template columns
    console.log('Recreating weddings table without template columns...');
    await query(`
      CREATE TABLE weddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        wedding_code VARCHAR(10) UNIQUE NOT NULL,
        staff_pin VARCHAR(255) NOT NULL,
        wedding_date DATE NOT NULL,
        venue_name VARCHAR(255) NOT NULL,
        venue_address TEXT NOT NULL,
        expected_guests INTEGER DEFAULT 0,
        ceremony_date DATE,
        ceremony_time VARCHAR(10),
        invitation_template_id VARCHAR(50),
        invitation_customization TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Weddings table recreated');
    
    // Step 5: Copy data back (excluding template_id and template_customization)
    console.log('Restoring data from backup...');
    await query(`
      INSERT INTO weddings (
        id, couple_id, wedding_code, staff_pin, wedding_date, 
        venue_name, venue_address, expected_guests, ceremony_date, 
        ceremony_time, invitation_template_id, invitation_customization, created_at
      )
      SELECT 
        id, couple_id, wedding_code, staff_pin, wedding_date,
        venue_name, venue_address, expected_guests, ceremony_date,
        ceremony_time, invitation_template_id, invitation_customization, created_at
      FROM weddings_backup
    `);
    console.log('✓ Data restored');
    
    // Step 6: Drop backup table
    console.log('Cleaning up backup table...');
    await query('DROP TABLE weddings_backup');
    console.log('✓ Backup table removed');
    
    // Step 7: Drop the index
    console.log('Dropping index...');
    await query('DROP INDEX IF EXISTS idx_weddings_template_id');
    console.log('✓ Index dropped');
    
    // Step 8: Recreate other indexes if they existed
    console.log('Recreating standard indexes...');
    await query('CREATE INDEX IF NOT EXISTS idx_weddings_template ON weddings(invitation_template_id)');
    console.log('✓ Standard indexes recreated');
    
    console.log('\n✅ SQLite rollback completed successfully');
    console.log('⚠️  Note: template_id and template_customization columns have been removed');
    console.log('⚠️  All data in these columns has been permanently deleted');
    
  } catch (error) {
    console.error('❌ SQLite rollback failed:', error);
    console.error('\n⚠️  IMPORTANT: If the weddings table was dropped, restore from weddings_backup:');
    console.error('   ALTER TABLE weddings_backup RENAME TO weddings;');
    throw error;
  }
}

async function rollbackPostgreSQL() {
  console.log('Rolling back for PostgreSQL database...\n');
  
  try {
    // Drop index
    console.log('Dropping index...');
    await query('DROP INDEX IF EXISTS idx_weddings_template_id');
    console.log('✓ Index dropped');
    
    // Drop columns
    console.log('Dropping template_id column...');
    await query('ALTER TABLE weddings DROP COLUMN IF EXISTS template_id');
    console.log('✓ template_id column dropped');
    
    console.log('Dropping template_customization column...');
    await query('ALTER TABLE weddings DROP COLUMN IF EXISTS template_customization');
    console.log('✓ template_customization column dropped');
    
    console.log('\n✅ PostgreSQL rollback completed successfully');
    console.log('⚠️  Note: template_id and template_customization columns have been removed');
    console.log('⚠️  All data in these columns has been permanently deleted');
    
  } catch (error) {
    console.error('❌ PostgreSQL rollback failed:', error);
    throw error;
  }
}

async function rollback() {
  console.log('='.repeat(60));
  console.log('ROLLBACK: add-rsvp-template-columns migration');
  console.log('='.repeat(60));
  console.log('');
  console.log('⚠️  WARNING: This is a DESTRUCTIVE operation!');
  console.log('⚠️  This will permanently delete:');
  console.log('   - template_id column and all its data');
  console.log('   - template_customization column and all its data');
  console.log('   - idx_weddings_template_id index');
  console.log('');
  console.log('Press Ctrl+C within 5 seconds to cancel...');
  console.log('');
  
  // Wait 5 seconds before proceeding
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('Proceeding with rollback...\n');
  
  if (isPostgreSQL) {
    await rollbackPostgreSQL();
  } else {
    await rollbackSQLite();
  }
}

// Run rollback if called directly
if (require.main === module) {
  rollback()
    .then(() => {
      console.log('\n✅ Rollback script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Rollback script failed');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { rollback, rollbackSQLite, rollbackPostgreSQL };
