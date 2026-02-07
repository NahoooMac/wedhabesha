const { query } = require('./config/database');

async function activateUser() {
  console.log('Activating user account...\n');

  try {
    // Update user to be active
    const result = await query(
      'UPDATE users SET is_active = 1 WHERE id = ?',
      [1]
    );

    console.log('✅ User activated successfully');
    console.log('Result:', result);

    // Verify the update
    const checkResult = await query(
      'SELECT id, email, user_type, is_active FROM users WHERE id = ?',
      [1]
    );

    console.log('\nVerification:');
    console.log(JSON.stringify(checkResult.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

activateUser();
