const { query } = require('../config/database');

async function debugGuestAPI() {
  try {
    console.log('🔍 Debugging guest API step by step...');
    
    const userId = 2;
    const weddingId = 1;
    
    // Step 1: Check if user exists
    console.log('\n1. Checking if user exists...');
    const userResult = await query('SELECT id, email, user_type FROM users WHERE id = ?', [userId]);
    console.log('User result:', JSON.stringify(userResult.rows, null, 2));
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    // Step 2: Check if couple exists for this user
    console.log('\n2. Checking if couple exists for user...');
    const coupleResult = await query('SELECT id FROM couples WHERE user_id = ?', [userId]);
    console.log('Couple result:', JSON.stringify(coupleResult.rows, null, 2));
    
    if (coupleResult.rows.length === 0) {
      console.log('❌ No couple found for user!');
      return;
    }
    
    const coupleId = coupleResult.rows[0].id;
    console.log('✅ Found couple ID:', coupleId);
    
    // Step 3: Check if wedding belongs to this couple
    console.log('\n3. Checking if wedding belongs to couple...');
    const weddingCheck = await query('SELECT id FROM weddings WHERE id = ? AND couple_id = ?', [weddingId, coupleId]);
    console.log('Wedding check result:', JSON.stringify(weddingCheck.rows, null, 2));
    
    if (weddingCheck.rows.length === 0) {
      console.log('❌ Wedding not found or access denied!');
      return;
    }
    
    console.log('✅ Wedding access confirmed');
    
    // Step 4: Try to get guests
    console.log('\n4. Getting guests for wedding...');
    const guestsResult = await query(`
      SELECT id, name, email, phone, qr_code, table_number, dietary_restrictions,
             is_checked_in, checked_in_at, created_at
      FROM guests 
      WHERE wedding_id = ?
      ORDER BY name ASC
    `, [weddingId]);
    
    console.log('✅ Guests query successful!');
    console.log('📊 Number of guests found:', guestsResult.rows.length);
    console.log('📋 Guests:', JSON.stringify(guestsResult.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
  }
}

debugGuestAPI()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });