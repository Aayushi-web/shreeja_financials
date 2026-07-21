const cron = require('node-cron');
const dotenv = require('dotenv');
const db = require('./config/db');

dotenv.config();

/**
 * Function to ping the database and keep the connection alive
 */
async function pingDatabase() {
    const timestamp = new Date().toISOString();
    try {
        console.log(`\n[${timestamp}] 📡 Executing scheduled database keep-alive ping...`);
        
        // Execute a simple query to verify connection and keep pool warm
        const [rows] = await db.query('SELECT 1 AS keep_alive, NOW() AS db_time');
        
        console.log(`[${timestamp}] ✅ Database Ping Successful! Response:`, rows[0]);
        return true;
    } catch (error) {
        console.error(`[${timestamp}] ❌ Database Ping Failed:`, error.message);
        return false;
    }
}

console.log('====================================================');
console.log('🚀 Starting Standalone Database Keep-Alive Service');
console.log('⏰ Cron Schedule: 0 * * * * (Every 1 Hour)');
console.log('====================================================');

// Schedule cron job to run at minute 0 past every hour (1-hour interval)
// You can also use '0 * * * *' for every hour exactly at minute 0, or '0 0 * * * *'
const task = cron.schedule('0 * * * *', async () => {
    await pingDatabase();
});

// Run an initial ping immediately on startup so status is visible right away
(async () => {
    console.log('⚡ Performing initial immediate check on startup...');
    await pingDatabase();
})();

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping cron service gracefully...');
    task.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping cron service gracefully...');
    task.stop();
    process.exit(0);
});
