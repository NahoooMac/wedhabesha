const { query } = require('../config/database');

/**
 * Migration: Add invitation and RSVP fields to guests and weddings tables
 * 
 * Guests table additions:
 * - unique_code: Unique identifier for invitation links
 * - rsvp_status: Guest's RSVP response (pending/accepted/declined)
 * - rsvp_message: Optional message from guest
 * - rsvp_responded_at: Timestamp of RSVP submission
 * - invitation_sent_at: Timestamp when invitation was sent
 * 
 * Weddings table additions:
 * - invitation_template_id: Selected template identifier
 * - invitation_customization: JSON with template customization settings
 */

async function up() {
  console.log('Running migration: add-invitation-fields');
  
  try {
    // Helper function to check if column exists
    const columnExists = async (table, column) => {
      const result = await query(`PRAGMA table_info(${table})`);
      return result.rows.some(row => row.name === column);
    };

    // Add columns to guests table
    if (!(await columnExists('guests', 'unique_code'))) {
      await query('ALTER TABLE guests ADD COLUMN unique_code VARCHAR(12)');
      console.log('✓ Added unique_code column to guests table');
    } else {
      console.log('⊙ unique_code column already exists in guests table');
    }
    
    if (!(await columnExists('guests', 'rsvp_status'))) {
      await query("ALTER TABLE guests ADD COLUMN rsvp_status VARCHAR(20) DEFAULT 'pending'");
      console.log('✓ Added rsvp_status column to guests table');
    } else {
      console.log('⊙ rsvp_status column already exists in guests table');
    }
    
    if (!(await columnExists('guests', 'rsvp_message'))) {
      await query('ALTER TABLE guests ADD COLUMN rsvp_message TEXT');
      console.log('✓ Added rsvp_message column to guests table');
    } else {
      console.log('⊙ rsvp_message column already exists in guests table');
    }
    
    if (!(await columnExists('guests', 'rsvp_responded_at'))) {
      await query('ALTER TABLE guests ADD COLUMN rsvp_responded_at TIMESTAMP');
      console.log('✓ Added rsvp_responded_at column to guests table');
    } else {
      console.log('⊙ rsvp_responded_at column already exists in guests table');
    }
    
    if (!(await columnExists('guests', 'invitation_sent_at'))) {
      await query('ALTER TABLE guests ADD COLUMN invitation_sent_at TIMESTAMP');
      console.log('✓ Added invitation_sent_at column to guests table');
    } else {
      console.log('⊙ invitation_sent_at column already exists in guests table');
    }
    
    // Add columns to weddings table
    if (!(await columnExists('weddings', 'invitation_template_id'))) {
      await query('ALTER TABLE weddings ADD COLUMN invitation_template_id VARCHAR(50)');
      console.log('✓ Added invitation_template_id column to weddings table');
    } else {
      console.log('⊙ invitation_template_id column already exists in weddings table');
    }
    
    if (!(await columnExists('weddings', 'invitation_customization'))) {
      await query('ALTER TABLE weddings ADD COLUMN invitation_customization TEXT');
      console.log('✓ Added invitation_customization column to weddings table');
    } else {
      console.log('⊙ invitation_customization column already exists in weddings table');
    }
    
    // Create indexes for performance
    try {
      await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unique_code ON guests(unique_code)');
      console.log('✓ Created unique index on guests.unique_code');
    } catch (e) {
      console.log('⊙ Index idx_guests_unique_code already exists');
    }
    
    try {
      await query('CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status)');
      console.log('✓ Created index on guests.rsvp_status');
    } catch (e) {
      console.log('⊙ Index idx_guests_rsvp_status already exists');
    }
    
    try {
      await query('CREATE INDEX IF NOT EXISTS idx_weddings_template ON weddings(invitation_template_id)');
      console.log('✓ Created index on weddings.invitation_template_id');
    } catch (e) {
      console.log('⊙ Index idx_weddings_template already exists');
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Rolling back migration: add-invitation-fields');
  
  try {
    // Remove indexes
    await query('DROP INDEX IF EXISTS idx_guests_unique_code');
    await query('DROP INDEX IF EXISTS idx_guests_rsvp_status');
    await query('DROP INDEX IF EXISTS idx_weddings_template');
    
    // Remove columns from guests table
    await query('ALTER TABLE guests DROP COLUMN IF EXISTS unique_code');
    await query('ALTER TABLE guests DROP COLUMN IF EXISTS rsvp_status');
    await query('ALTER TABLE guests DROP COLUMN IF EXISTS rsvp_message');
    await query('ALTER TABLE guests DROP COLUMN IF EXISTS rsvp_responded_at');
    await query('ALTER TABLE guests DROP COLUMN IF EXISTS invitation_sent_at');
    
    // Remove columns from weddings table
    await query('ALTER TABLE weddings DROP COLUMN IF EXISTS invitation_template_id');
    await query('ALTER TABLE weddings DROP COLUMN IF EXISTS invitation_customization');
    
    console.log('✅ Rollback completed successfully');
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
