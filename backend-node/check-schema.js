const { query } = require('./config/database');

async function checkSchema() {
  try {
    // Check users table schema
    const usersSchema = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    console.log('Users table schema:');
    console.log(usersSchema.rows[0]?.sql || 'Table not found');
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Check weddings table schema
    const weddingsSchema = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='weddings'");
    console.log('Weddings table schema:');
    console.log(weddingsSchema.rows[0]?.sql || 'Table not found');
    
    // Check if template columns exist
    const weddingsColumns = await query("PRAGMA table_info(weddings)");
    console.log('\nWeddings table columns:');
    weddingsColumns.rows.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
