const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

console.log('🔧 Adding vendor_leads table...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

// Create vendor_leads table
const createVendorLeadsTable = `
CREATE TABLE IF NOT EXISTS vendor_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    couple_id INTEGER NOT NULL,
    message TEXT,
    budget_range TEXT,
    budget TEXT,
    event_date DATE,
    status TEXT DEFAULT 'new',
    couple_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
)`;

db.run(createVendorLeadsTable, (err) => {
    if (err) {
        console.error('❌ Error creating vendor_leads table:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('✅ vendor_leads table created successfully');
    
    // Create indexes for better performance
    const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_vendor_leads_vendor_id ON vendor_leads(vendor_id)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_leads_couple_id ON vendor_leads(couple_id)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_leads_status ON vendor_leads(status)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_leads_created_at ON vendor_leads(created_at)'
    ];
    
    let indexesCreated = 0;
    const totalIndexes = createIndexes.length;
    
    createIndexes.forEach((indexSQL, i) => {
        db.run(indexSQL, (err) => {
            if (err) {
                console.error(`❌ Error creating index ${i + 1}:`, err.message);
            } else {
                console.log(`✅ Index ${i + 1}/${totalIndexes} created`);
            }
            
            indexesCreated++;
            if (indexesCreated === totalIndexes) {
                console.log('🎉 vendor_leads table and indexes created successfully!');
                db.close();
            }
        });
    });
});