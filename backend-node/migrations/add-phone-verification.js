const { query } = require('../config/database');

async function addPhoneVerificationColumns() {
  try {
    console.log('🔄 Adding phone verification columns to vendors table...');

    // Add phone_verified column
    await query(`
      ALTER TABLE vendors 
      ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE
    `);

    // Add verified_phone column
    await query(`
      ALTER TABLE vendors 
      ADD COLUMN verified_phone VARCHAR(20) DEFAULT NULL
    `);

    console.log('✅ Phone verification columns added successfully');
    
    // Update existing vendors to have phone_verified = false
    const result = await query(`
      UPDATE vendors 
      SET phone_verified = FALSE 
      WHERE phone_verified IS NULL
    `);
    
    console.log(`✅ Updated ${result.changes} existing vendor records`);

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️  Phone verification columns already exist');
    } else {
      console.error('❌ Failed to add phone verification columns:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  addPhoneVerificationColumns()
    .then(() => {
      console.log('🎉 Phone verification migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPhoneVerificationColumns };