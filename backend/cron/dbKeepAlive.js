const cron = require('node-cron');
const db = require('../config/db');

const initCronJobs = () => {
    // Schedule a job to run every 1 hour (at minute 0 of every hour)
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('⏳ Running hourly database keep-alive ping...');
            await db.query('SELECT 1');
            console.log('✅ Database keep-alive ping successful!');
        } catch (error) {
            console.error('❌ Database keep-alive ping failed:', error.message);
        }
    });

    console.log('⏰ Hourly database keep-alive cron job initialized (runs every 1 hour)');
};

module.exports = initCronJobs;
