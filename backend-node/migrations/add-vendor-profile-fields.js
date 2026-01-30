const { query } = require('../config/database');

async function addVendorProfileFields() {
  try {
    console.log('🔄 Adding vendor profile fields...');

    // Add new fields to vendors table
    const newFields = [
      'starting_price TEXT', // Starting price for services
      'why_choose_us TEXT', // JSON array of 4 reasons
      'website TEXT', // Website or social media URL
      'street_address TEXT', // Business street address
      'city TEXT', // Business city
      'state TEXT', // Business state/region
      'postal_code TEXT', // Business postal code
      'country TEXT DEFAULT "Ethiopia"', // Business country
      'years_in_business INTEGER DEFAULT 0', // Years in business
      'team_size INTEGER DEFAULT 1', // Team size
      'service_area TEXT', // Service area description
      'business_photos TEXT', // JSON array of business photo URLs
      'portfolio_photos TEXT', // JSON array of portfolio photo URLs
      'service_packages TEXT', // JSON array of service packages
      'business_hours TEXT', // JSON array of business hours
      'phone_verified INTEGER DEFAULT 0', // Phone verification status
      'verified_phone TEXT' // Verified phone number
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

    // Initialize JSON fields with empty arrays/objects for existing vendors
    await query(`
      UPDATE vendors 
      SET 
        why_choose_us = COALESCE(why_choose_us, '["", "", "", ""]'),
        business_photos = COALESCE(business_photos, '[]'),
        portfolio_photos = COALESCE(portfolio_photos, '[]'),
        service_packages = COALESCE(service_packages, '[]'),
        business_hours = COALESCE(business_hours, '[]')
      WHERE id IS NOT NULL
    `);

    console.log('✅ Vendor profile fields migration completed');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addVendorProfileFields()
    .then(() => {
      console.log('\n✨ Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addVendorProfileFields };