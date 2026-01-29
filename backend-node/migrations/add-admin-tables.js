const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wedding_platform.db');

function runMigration() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        console.log('🔄 Adding admin-related tables...');

        // Create audit_logs table
        const createAuditLogsTable = `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_user_id INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                target_type TEXT,
                target_id INTEGER,
                description TEXT,
                action_metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_user_id) REFERENCES users(id)
            )
        `;

        // Create vendor_subscriptions table
        const createVendorSubscriptionsTable = `
            CREATE TABLE IF NOT EXISTS vendor_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                subscription_type TEXT NOT NULL DEFAULT 'basic',
                status TEXT NOT NULL DEFAULT 'active',
                start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_date DATETIME,
                features TEXT,
                price DECIMAL(10,2),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `;

        // Create reviews table
        const createReviewsTable = `
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                is_flagged BOOLEAN DEFAULT FALSE,
                is_hidden BOOLEAN DEFAULT FALSE,
                flagged_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;

        db.serialize(() => {
            db.run(createAuditLogsTable, (err) => {
                if (err) {
                    console.error('❌ Error creating audit_logs table:', err.message);
                } else {
                    console.log('✅ Created audit_logs table');
                }
            });

            db.run(createVendorSubscriptionsTable, (err) => {
                if (err) {
                    console.error('❌ Error creating vendor_subscriptions table:', err.message);
                } else {
                    console.log('✅ Created vendor_subscriptions table');
                }
            });

            db.run(createReviewsTable, (err) => {
                if (err) {
                    console.error('❌ Error creating reviews table:', err.message);
                } else {
                    console.log('✅ Created reviews table');
                }
            });

            // Add some sample data
            console.log('🔄 Adding sample data...');

            // Add sample vendor subscriptions for existing vendors
            const insertSampleSubscriptions = `
                INSERT OR IGNORE INTO vendor_subscriptions (vendor_id, subscription_type, status, features, price)
                SELECT 
                    id,
                    'premium' as subscription_type,
                    'active' as status,
                    '{"messaging": true, "analytics": true, "priority_listing": true}' as features,
                    29.99 as price
                FROM vendors
                LIMIT 3
            `;

            db.run(insertSampleSubscriptions, (err) => {
                if (err) {
                    console.error('❌ Error adding sample subscriptions:', err.message);
                } else {
                    console.log('✅ Added sample vendor subscriptions');
                }
            });

            // Add sample reviews
            const insertSampleReviews = `
                INSERT OR IGNORE INTO reviews (vendor_id, user_id, rating, review_text, is_flagged)
                SELECT 
                    v.id as vendor_id,
                    u.id as user_id,
                    4 as rating,
                    'Great service and professional work!' as review_text,
                    CASE WHEN v.id % 3 = 0 THEN TRUE ELSE FALSE END as is_flagged
                FROM vendors v
                CROSS JOIN users u
                WHERE u.user_type = 'COUPLE'
                LIMIT 5
            `;

            db.run(insertSampleReviews, (err) => {
                if (err) {
                    console.error('❌ Error adding sample reviews:', err.message);
                } else {
                    console.log('✅ Added sample reviews');
                }
            });

            // Add sample audit log entry
            const insertSampleAuditLog = `
                INSERT OR IGNORE INTO audit_logs (admin_user_id, action_type, target_type, target_id, description, action_metadata)
                SELECT 
                    id,
                    'system_initialization' as action_type,
                    'database' as target_type,
                    1 as target_id,
                    'Admin tables created and initialized' as description,
                    '{"migration": "add-admin-tables", "timestamp": "' || datetime('now') || '"}' as action_metadata
                FROM users 
                WHERE user_type = 'ADMIN'
                LIMIT 1
            `;

            db.run(insertSampleAuditLog, (err) => {
                if (err) {
                    console.error('❌ Error adding sample audit log:', err.message);
                } else {
                    console.log('✅ Added sample audit log entry');
                }

                db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ Migration completed successfully');
                        resolve();
                    }
                });
            });
        });
    });
}

if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('🎉 Admin tables migration completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = runMigration;