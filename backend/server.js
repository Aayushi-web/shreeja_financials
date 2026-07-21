const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const dotenv = require('dotenv');
const db = require('./config/db');
const initCronJobs = require('./cron/dbKeepAlive');

// Load .env file
dotenv.config();

const app = express();

// Middleware - these run on every request
app.use(helmet());                          // Adds security headers
app.use(cors({ origin: '*', credentials: false })); // Allow frontend
app.use(express.json());                    // Read JSON from requests
app.use(express.urlencoded({ extended: true })); // Read form data
app.use(cookieParser());                    // Read cookies
// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
const investorRoutes = require('./routes/investorRoutes');
app.use('/api/investors', investorRoutes);
const portfolioRoutes = require('./routes/portfolioRoutes');
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/portfolio', portfolioRoutes);
// Test route - just to check server is working
app.get('/', (req, res) => {
    res.json({ message: 'Portfolio API is running!' });
});

// Initialize background cron jobs
initCronJobs();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});