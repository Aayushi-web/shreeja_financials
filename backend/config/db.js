const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Create connection pool supporting Aiven SSL and custom port
const poolConfig = process.env.DATABASE_URL ? {
    uri: process.env.DATABASE_URL.replace(/\??(&?ssl-mode=[^&]*)/i, ''),
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
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
    connectionLimit: 10,    // Max 10 connections at once
    queueLimit: 0
};

const pool = mysql.createPool(poolConfig);

// Convert pool to use promises (so we can use async/await)
const db = pool.promise();

// Test the connection
db.getConnection()
    .then(() => console.log('✅ MySQL Connected!'))
    .catch(err => console.log('❌ DB Connection Failed:', err.message));

module.exports = db;