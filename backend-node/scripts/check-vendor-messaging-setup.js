const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

console.log('🔍 Checking Vendor Messaging Setup...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database\n');
});

// Check vendor_leads table structure
db.all("PRAGMA table_info(vendor_leads)", [], (err, columns) => {
    if (err) {
        console.error('❌ Error getting vendor_leads table info:', err.message);
        db.close();
        return;
    }
    
    console.log('📋 vendor_leads table structure:');
    columns.forEach(col => {
        console.log(`   ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check if there are any vendor leads
    db.get('SELECT COUNT(*) as count FROM vendor_leads', [], (err, row) => {
        if (err) {
            console.error('❌ Error counting vendor_leads:', err.message);
        } else {
            console.log(`\n📊 vendor_leads table has ${row.count} records`);
        }
        
        // Check vendors
        db.all('SELECT id, user_id, business_name, category FROM vendors LIMIT 5', [], (err, vendors) => {
            if (err) {
                console.error('❌ Error getting vendors:', err.message);
            } else {
                console.log(`\n👥 Found ${vendors.length} vendors:`);
                vendors.forEach(vendor => {
                    console.log(`   ID: ${vendor.id}, User: ${vendor.user_id}, Business: ${vendor.business_name}, Category: ${vendor.category}`);
                });
            }
            
            // Check message_threads
            db.get('SELECT COUNT(*) as count FROM message_threads', [], (err, row) => {
                if (err) {
                    console.error('❌ Error counting message_threads:', err.message);
                } else {
                    console.log(`\n💬 message_threads table has ${row.count} records`);
                }
                
                // Check users with vendor type
                db.all('SELECT id, email, user_type FROM users WHERE user_type = "VENDOR" LIMIT 5', [], (err, users) => {
                    if (err) {
                        console.error('❌ Error getting vendor users:', err.message);
                    } else {
                        console.log(`\n🔐 Found ${users.length} vendor users:`);
                        users.forEach(user => {
                            console.log(`   ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}`);
                        });
                    }
                    
                    console.log('\n✅ Database check complete!');
                    db.close();
                });
            });
        });
    });
});