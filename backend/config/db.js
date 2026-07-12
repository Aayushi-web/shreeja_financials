const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool (better than single connection)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,    // Max 10 connections at once
    queueLimit: 0
});

// Convert pool to use promises (so we can use async/await)
const db = pool.promise();

// Test the connection
db.getConnection()
    .then(() => console.log('✅ MySQL Connected!'))
    .catch(err => console.log('❌ DB Connection Failed:', err.message));

module.exports = db;