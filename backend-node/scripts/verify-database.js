const { query } = require('../config/database');

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database structure...');
    
    // Check if users table exists and get its structure
    const result = await query(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Users table exists');
      console.log('📋 Table structure:');
      console.log(result.rows[0].sql);
    } else {
      console.log('❌ Users table does not exist');
    }
    
    // Test a simple query to make sure the table works
    const testQuery = await query(`
      SELECT COUNT(*) as count FROM users
    `);
    
    console.log(`📊 Current users count: ${testQuery.rows[0].count}`);
    
    // List all tables
    const tables = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('📋 All tables in database:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
}

verifyDatabase()
  .then(() => {
    console.log('✅ Database verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });