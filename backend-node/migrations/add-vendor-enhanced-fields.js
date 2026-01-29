const { query } = require('../config/database');

async function addVendorEnhancedFields() {
  try {
    console.log('🔄 Adding enhanced vendor fields...');

    // Add new fields to vendors table
    const newFields = [
      'working_hours TEXT', // JSON array of working hours
      'additional_info TEXT', // Extra notes (appointment only, parking info, etc.)
      'verification_status TEXT DEFAULT "pending" CHECK (verification_status IN ("pending", "verified", "rejected"))',
      'verification_date DATETIME',
      'verification_history TEXT', // JSON array of verification history
      'latitude REAL', // For map integration
      'longitude REAL', // For map integration
      'map_address TEXT', // Formatted address for map display
      'notification_preferences TEXT DEFAULT "{}" ' // JSON object for notification settings
    ];

    for (const field of newFields) {
      try {
        await query(`ALTER TABLE vendors ADD COLUMN ${field}`);
        console.log(`✅ Added field: ${field.split(' ')[0]}`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`ℹ️  Field already exists: ${field.split(' ')[0]}`);
        } else {
          console.error(`❌ Error adding field ${field.split(' ')[0]}:`, error.message);
        }
      }
    }

    // Update existing vendors to have proper verification status
    await query(`
      UPDATE vendors 
      SET verification_status = CASE 
        WHEN is_verified = 1 THEN 'verified'
        ELSE 'pending'
      END
      WHERE verification_status IS NULL
    `);

    console.log('✅ Enhanced vendor fields migration completed');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addVendorEnhancedFields()
    .then(() => {
      console.log('\n✨ Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addVendorEnhancedFields };