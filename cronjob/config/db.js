const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool supporting Aiven SSL and custom port
const poolConfig = process.env.DATABASE_URL ? {
    uri: process.env.DATABASE_URL.replace(/\??(&?ssl-mode=[^&]*)/i, ''),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
} : {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: (process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('aivencloud.com')) ? {
        rejectUnauthorized: false
    } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

const pool = mysql.createPool(poolConfig);

// Convert pool to use promises
const db = pool.promise();

// Test initial connection
db.getConnection()
    .then((conn) => {
        console.log('✅ MySQL Pool Connected successfully!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ DB Pool Connection Error:', err.message);
    });

module.exports = db;
