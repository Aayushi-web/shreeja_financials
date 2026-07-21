const db = require('../config/db');
const bcrypt = require('bcrypt');

async function createDatabase() {
    try {
        console.log('🔄 Connecting to database and initializing schema...');

        // Drop tables if they exist to ensure clean creation
        console.log('🗑️  Dropping existing tables (if any)...');
        await db.query('DROP TABLE IF EXISTS transactions');
        await db.query('DROP TABLE IF EXISTS portfolios');
        await db.query('DROP TABLE IF EXISTS users');

        // Create users table
        console.log('📦 Creating users table...');
        await db.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                user_id VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'investor') DEFAULT 'investor',
                phone VARCHAR(50) NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Create portfolios table
        console.log('📦 Creating portfolios table...');
        await db.query(`
            CREATE TABLE portfolios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                share_name VARCHAR(255) NOT NULL,
                quantity DECIMAL(15, 2) NOT NULL,
                buy_price DECIMAL(15, 2) NOT NULL,
                average_buy_price DECIMAL(15, 2) NOT NULL,
                amount_invested DECIMAL(15, 2) NOT NULL,
                current_value DECIMAL(15, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Create transactions table
        console.log('📦 Creating transactions table...');
        await db.query(`
            CREATE TABLE transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                stock_symbol VARCHAR(255) NOT NULL,
                transaction_type ENUM('BUY', 'SELL') NOT NULL,
                quantity DECIMAL(15, 2) NOT NULL,
                price_at_transaction DECIMAL(15, 2) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('🌱 Populating initial data...');

        // Hash passwords
        const adminPassword = await bcrypt.hash('Admin@123', 10);
        const investorPassword = await bcrypt.hash('Investor@123', 10);

        // Insert Admin
        const [adminResult] = await db.query(
            `INSERT INTO users (name, email, user_id, password, role, phone, status) 
             VALUES (?, ?, ?, ?, 'admin', ?, 'active')`,
            ['Admin User', 'admin@shreejafinancials.com', 'admin', adminPassword, '+91 9876543210']
        );
        console.log('👤 Admin user created: (user_id: admin, password: admin123)');

        // Insert Investors
        const [investor1Result] = await db.query(
            `INSERT INTO users (name, email, user_id, password, role, phone, status) 
             VALUES (?, ?, ?, ?, 'investor', ?, 'active')`,
            ['Rahul Sharma', 'rahul.sharma@example.com', 'rahul', investorPassword, '+91 9123456789']
        );
        const [investor2Result] = await db.query(
            `INSERT INTO users (name, email, user_id, password, role, phone, status) 
             VALUES (?, ?, ?, ?, 'investor', ?, 'active')`,
            ['Priya Patel', 'priya.patel@example.com', 'priya', investorPassword, '+91 9988776655']
        );
        console.log('👥 Sample investors created: (user_id: rahul / priya, password: investor123)');

        // Insert Portfolios for Rahul
        await db.query(
            `INSERT INTO portfolios (user_id, share_name, quantity, buy_price, average_buy_price, amount_invested, current_value) 
             VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
            [
                investor1Result.insertId, 'Reliance Industries Ltd', 50, 2450.00, 2450.00, 122500.00, 145000.00,
                investor1Result.insertId, 'Tata Consultancy Services', 30, 3800.00, 3800.00, 114000.00, 121500.00
            ]
        );

        // Insert Portfolios for Priya
        await db.query(
            `INSERT INTO portfolios (user_id, share_name, quantity, buy_price, average_buy_price, amount_invested, current_value) 
             VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
            [
                investor2Result.insertId, 'HDFC Bank Ltd', 100, 1520.00, 1520.00, 152000.00, 165000.00,
                investor2Result.insertId, 'Infosys Ltd', 75, 1480.00, 1480.00, 111000.00, 118500.00
            ]
        );

        // Insert sample Transactions for Rahul and Priya with realistic historical timestamps
        await db.query(`
            INSERT INTO transactions (user_id, stock_symbol, transaction_type, quantity, price_at_transaction, timestamp) VALUES
            (?, 'Reliance Industries Ltd', 'BUY', 30, 2380.00, DATE_SUB(NOW(), INTERVAL 45 DAY)),
            (?, 'Reliance Industries Ltd', 'BUY', 30, 2420.00, DATE_SUB(NOW(), INTERVAL 30 DAY)),
            (?, 'Reliance Industries Ltd', 'SELL', 10, 2510.00, DATE_SUB(NOW(), INTERVAL 15 DAY)),
            (?, 'Tata Consultancy Services', 'BUY', 20, 3750.00, DATE_SUB(NOW(), INTERVAL 40 DAY)),
            (?, 'Tata Consultancy Services', 'BUY', 15, 3850.00, DATE_SUB(NOW(), INTERVAL 25 DAY)),
            (?, 'Tata Consultancy Services', 'SELL', 5, 3920.00, DATE_SUB(NOW(), INTERVAL 10 DAY)),
            (?, 'HDFC Bank Ltd', 'BUY', 60, 1490.00, DATE_SUB(NOW(), INTERVAL 50 DAY)),
            (?, 'HDFC Bank Ltd', 'BUY', 50, 1540.00, DATE_SUB(NOW(), INTERVAL 28 DAY)),
            (?, 'HDFC Bank Ltd', 'SELL', 10, 1580.00, DATE_SUB(NOW(), INTERVAL 12 DAY)),
            (?, 'Infosys Ltd', 'BUY', 50, 1450.00, DATE_SUB(NOW(), INTERVAL 35 DAY)),
            (?, 'Infosys Ltd', 'BUY', 25, 1510.00, DATE_SUB(NOW(), INTERVAL 20 DAY))
        `, [
            investor1Result.insertId, investor1Result.insertId, investor1Result.insertId,
            investor1Result.insertId, investor1Result.insertId, investor1Result.insertId,
            investor2Result.insertId, investor2Result.insertId, investor2Result.insertId,
            investor2Result.insertId, investor2Result.insertId
        ]);

        console.log('📈 Sample portfolio data populated.');
        console.log('✅ Database setup and initialization complete!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating database tables/data:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createDatabase();
