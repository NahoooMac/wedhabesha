const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the wedding platform database.');
});

// Add venue coordinates columns to weddings table
db.serialize(() => {
  console.log('Adding venue_latitude and venue_longitude columns to weddings table...');
  
  db.run(`
    ALTER TABLE weddings 
    ADD COLUMN venue_latitude REAL
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('venue_latitude column already exists');
      } else {
        console.error('Error adding venue_latitude column:', err.message);
      }
    } else {
      console.log('✓ Added venue_latitude column');
    }
  });

  db.run(`
    ALTER TABLE weddings 
    ADD COLUMN venue_longitude REAL
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('venue_longitude column already exists');
      } else {
        console.error('Error adding venue_longitude column:', err.message);
      }
    } else {
      console.log('✓ Added venue_longitude column');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
    process.exit(1);
  }
  console.log('✓ Migration completed successfully');
  console.log('Database connection closed.');
});
