const { query } = require('../config/database');

async function addMissingVendorFields() {
  try {
    console.log('🔄 Adding missing vendor fields...');

    // Add missing fields that the vendor routes expect
    const missingFields = [
      'working_hours TEXT', // JSON array of working hours
      'additional_info TEXT', // Additional business information
      'verification_date TEXT', // Date when vendor was verified
      'verification_history TEXT', // JSON array of verification history
      'latitude REAL', // Business location latitude
      'longitude REAL', // Business location longitude
      'map_address TEXT' // Full address for map display
    ];

    for (const field of missingFields) {
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

    // Initialize JSON fields with empty arrays for existing vendors
    await query(`
      UPDATE vendors 
      SET 
        working_hours = COALESCE(working_hours, '[]'),
        verification_history = COALESCE(verification_history, '[]')
      WHERE id IS NOT NULL
    `);

    console.log('✅ Missing vendor fields migration completed');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addMissingVendorFields()
    .then(() => {
      console.log('\n✨ Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addMissingVendorFields };