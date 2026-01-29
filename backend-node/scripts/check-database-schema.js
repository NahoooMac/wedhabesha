const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

console.log('🔍 Checking Database Schema...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database\n');
});

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
        console.error('❌ Error getting tables:', err.message);
        db.close();
        return;
    }
    
    console.log(`📊 Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.name}`);
    });
    
    // Check specific tables we need for admin functionality
    const requiredTables = [
        'users',
        'vendors', 
        'weddings',
        'vendor_applications',
        'vendor_subscriptions',
        'reviews',
        'audit_logs'
    ];
    
    console.log('\n🔍 Checking Required Tables:');
    
    let checkedTables = 0;
    const totalRequired = requiredTables.length;
    
    requiredTables.forEach(tableName => {
        const exists = tables.some(t => t.name === tableName);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${tableName}`);
        
        if (exists) {
            // Get table info
            db.all(`PRAGMA table_info(${tableName})`, [], (err, info) => {
                if (!err && info) {
                    console.log(`      Columns: ${info.map(col => col.name).join(', ')}`);
                }
                
                checkedTables++;
                if (checkedTables === totalRequired) {
                    checkCounts();
                }
            });
        } else {
            checkedTables++;
            if (checkedTables === totalRequired) {
                checkCounts();
            }
        }
    });
    
    function checkCounts() {
        // Check if audit_logs table exists and has data
        if (tables.some(t => t.name === 'audit_logs')) {
            db.get('SELECT COUNT(*) as count FROM audit_logs', [], (err, row) => {
                if (!err) {
                    console.log(`\n📝 Audit Logs: ${row.count} entries`);
                } else {
                    console.log(`\n❌ Error querying audit_logs: ${err.message}`);
                }
                
                checkVendorApplications();
            });
        } else {
            console.log('\n❌ audit_logs table does not exist');
            checkVendorApplications();
        }
    }
    
    function checkVendorApplications() {
        // Check vendor applications
        if (tables.some(t => t.name === 'vendor_applications')) {
            db.get('SELECT COUNT(*) as count FROM vendor_applications', [], (err, row) => {
                if (!err) {
                    console.log(`📋 Vendor Applications: ${row.count} entries`);
                } else {
                    console.log(`❌ Error querying vendor_applications: ${err.message}`);
                }
                
                db.close();
            });
        } else {
            console.log('❌ vendor_applications table does not exist');
            db.close();
        }
    }
});