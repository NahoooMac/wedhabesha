const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function addTestGuest() {
  try {
    console.log('🔍 Adding test guest...');
    
    const weddingId = 1;
    const qrCode = uuidv4();
    
    // Add a test guest
    const guestResult = await query(`
      INSERT INTO guests (wedding_id, name, email, phone, qr_code, table_number, dietary_restrictions)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, phone, qr_code, table_number, dietary_restrictions, 
                is_checked_in, checked_in_at, created_at
    `, [weddingId, 'Test Guest', 'test@example.com', '+1234567890', qrCode, 1, 'No allergies']);

    console.log('✅ Guest added successfully');
    console.log('📋 New guest:', JSON.stringify(guestResult.rows[0], null, 2));
    
    // Now test retrieving guests
    const guestsResult = await query(`
      SELECT id, name, email, phone, qr_code, table_number, dietary_restrictions,
             is_checked_in, checked_in_at, created_at
      FROM guests 
      WHERE wedding_id = $1
      ORDER BY name ASC
    `, [weddingId]);

    console.log('✅ Guests retrieved successfully');
    console.log('📊 Number of guests found:', guestsResult.rows.length);
    console.log('📋 All guests:', JSON.stringify(guestsResult.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
  }
}

addTestGuest()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });