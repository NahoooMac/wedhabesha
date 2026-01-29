const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
let db;
let isPostgreSQL = false;

// Initialize database connection
try {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
    // PostgreSQL configuration
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    db = pool;
    isPostgreSQL = true;
    console.log('📊 Connected to PostgreSQL database');
  } else {
    // SQLite configuration (development fallback)
    const dbPath = path.join(__dirname, '../wedding_platform.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ SQLite connection failed:', err.message);
        process.exit(1);
      } else {
        console.log('📊 Connected to SQLite database');
      }
    });
    isPostgreSQL = false;
  }
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

// Database query helper
const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    if (isPostgreSQL) {
      const res = await db.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'test') {
        console.log('📝 Query executed', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
      }
      return res;
    } else {
      // SQLite - convert PostgreSQL-style parameters ($1, $2) to SQLite-style (?, ?)
      let sqliteQuery = text;
      if (params.length > 0) {
        // Replace $1, $2, etc. with ?
        for (let i = params.length; i >= 1; i--) {
          sqliteQuery = sqliteQuery.replace(new RegExp(`\\$${i}\\b`, 'g'), '?');
        }
      }
      
      return new Promise((resolve, reject) => {
        if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
          db.all(sqliteQuery, params, (err, rows) => {
            if (err) {
              console.error('❌ SQLite SELECT error:', err, '\nQuery:', sqliteQuery, '\nParams:', params);
              reject(err);
            } else {
              const duration = Date.now() - start;
              if (process.env.NODE_ENV !== 'test') {
                console.log('📝 Query executed', { text: text.substring(0, 50) + '...', duration, rows: rows.length });
              }
              resolve({ rows, rowCount: rows.length });
            }
          });
        } else {
          db.run(sqliteQuery, params, function(err) {
            if (err) {
              console.error('❌ SQLite RUN error:', err, '\nQuery:', sqliteQuery, '\nParams:', params);
              reject(err);
            } else {
              const duration = Date.now() - start;
              if (process.env.NODE_ENV !== 'test') {
                console.log('📝 Query executed', { text: text.substring(0, 50) + '...', duration, rows: this.changes });
              }
              resolve({ 
                rows: [{ id: this.lastID }], 
                rowCount: this.changes,
                lastID: this.lastID 
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

// Get a client from the pool (PostgreSQL only)
const getClient = async () => {
  if (isPostgreSQL) {
    return await db.connect();
  } else {
    return db; // SQLite doesn't need client pooling
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('🔄 Creating database tables...');
    
    // Create tables with SQLite-compatible syntax
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        firebase_uid VARCHAR(255) UNIQUE,
        user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('COUPLE', 'VENDOR', 'ADMIN', 'STAFF')),
        auth_provider VARCHAR(50) NOT NULL CHECK (auth_provider IN ('GOOGLE', 'EMAIL')),
        is_active BOOLEAN DEFAULT 1,
        two_factor_enabled BOOLEAN DEFAULT 0,
        two_factor_secret VARCHAR(255),
        backup_codes TEXT,
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS couples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        partner1_name VARCHAR(255) NOT NULL,
        partner2_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS weddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
        wedding_code VARCHAR(10) UNIQUE NOT NULL,
        staff_pin VARCHAR(255) NOT NULL,
        wedding_date DATE NOT NULL,
        venue_name VARCHAR(255) NOT NULL,
        venue_address TEXT NOT NULL,
        expected_guests INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wedding_id INTEGER REFERENCES weddings(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        qr_code VARCHAR(255) UNIQUE NOT NULL,
        table_number INTEGER,
        dietary_restrictions TEXT,
        is_checked_in BOOLEAN DEFAULT 0,
        checked_in_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wedding_id INTEGER REFERENCES weddings(id) ON DELETE CASCADE,
        total_budget DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'ETB',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS budget_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        allocated_amount DECIMAL(12,2) NOT NULL,
        spent_amount DECIMAL(12,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_category_id INTEGER REFERENCES budget_categories(id) ON DELETE CASCADE,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        date DATE NOT NULL,
        receipt_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT,
        phone VARCHAR(20),
        is_verified BOOLEAN DEFAULT 0,
        rating DECIMAL(3,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        method VARCHAR(20) DEFAULT 'sms',
        message_id VARCHAR(255),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        wedding_id INTEGER REFERENCES weddings(id) ON DELETE CASCADE,
        staff_name VARCHAR(255) NOT NULL,
        staff_role VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS staff_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wedding_id INTEGER REFERENCES weddings(id) ON DELETE CASCADE,
        session_token VARCHAR(500) NOT NULL UNIQUE,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        logout_time DATETIME,
        ip_address VARCHAR(45),
        device_info TEXT,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    console.log('✅ Database tables initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Close database connection
const closeDatabase = async () => {
  try {
    if (isPostgreSQL && db) {
      await db.end();
      console.log('📊 PostgreSQL connection pool closed');
    } else if (db) {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing SQLite database:', err);
            reject(err);
          } else {
            console.log('📊 SQLite database closed');
            resolve();
          }
        });
      });
    }
  } catch (error) {
    console.error('❌ Error closing database:', error);
    throw error;
  }
};

module.exports = {
  query,
  getClient,
  db,
  initializeDatabase,
  isPostgreSQL,
  closeDatabase
};