const { query } = require('../config/database');

/**
 * Migration: Add RSVP template selection columns to weddings table
 * 
 * This migration adds support for the RSVP template selection feature,
 * allowing couples to choose and customize invitation templates for their
 * wedding RSVP system.
 * 
 * Weddings table additions:
 * - template_id: Selected template identifier (VARCHAR 50) with default 'elegant-gold'
 * - template_customization: JSONB/TEXT column storing template customization settings
 * 
 * Index:
 * - idx_weddings_template_id: Index on template_id for faster template lookups
 * 
 * Requirements: 7.1, 7.2 from rsvp-template-selection spec
 */

async function up() {
  console.log('Running migration: add-rsvp-template-columns');
  
  try {
    // Helper function to check if column exists
    const columnExists = async (table, column) => {
      const result = await query(`PRAGMA table_info(${table})`);
      return result.rows.some(row => row.name === column);
    };

    // Add template_id column to weddings table
    if (!(await columnExists('weddings', 'template_id'))) {
      await query("ALTER TABLE weddings ADD COLUMN template_id VARCHAR(50) DEFAULT 'elegant-gold'");
      console.log('✓ Added template_id column to weddings table with default "elegant-gold"');
    } else {
      console.log('⊙ template_id column already exists in weddings table');
    }
    
    // Add template_customization column to weddings table
    // Note: SQLite doesn't support JSONB, so we use TEXT and handle JSON serialization in the application
    if (!(await columnExists('weddings', 'template_customization'))) {
      await query('ALTER TABLE weddings ADD COLUMN template_customization TEXT');
      console.log('✓ Added template_customization column to weddings table');
    } else {
      console.log('⊙ template_customization column already exists in weddings table');
    }
    
    // Create index on template_id for performance
    try {
      await query('CREATE INDEX IF NOT EXISTS idx_weddings_template_id ON weddings(template_id)');
      console.log('✓ Created index idx_weddings_template_id on weddings.template_id');
    } catch (e) {
      console.log('⊙ Index idx_weddings_template_id already exists');
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Rolling back migration: add-rsvp-template-columns');
  
  try {
    // Remove index
    await query('DROP INDEX IF EXISTS idx_weddings_template_id');
    console.log('✓ Dropped index idx_weddings_template_id');
    
    // Note: SQLite has limited ALTER TABLE support
    // Dropping columns requires recreating the table, which is risky
    // For safety, we'll document the rollback but not execute it automatically
    console.log('⚠️  WARNING: SQLite does not support DROP COLUMN directly');
    console.log('⚠️  To fully rollback, you would need to:');
    console.log('⚠️  1. Create a new weddings table without template_id and template_customization');
    console.log('⚠️  2. Copy all data from the old table to the new table');
    console.log('⚠️  3. Drop the old table and rename the new table');
    console.log('⚠️  This is a destructive operation and should be done manually if needed');
    
    // For PostgreSQL, we would use:
    // await query('ALTER TABLE weddings DROP COLUMN IF EXISTS template_id');
    // await query('ALTER TABLE weddings DROP COLUMN IF EXISTS template_customization');
    
    console.log('✅ Rollback completed (index removed, columns remain for safety)');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { up, down };
