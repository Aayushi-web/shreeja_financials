const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getAllPortfolios,
    getMyPortfolio,
    addShare,
    updateShare,
    deleteShare,
    getDashboardStats,
    buyShare,
    sellShare,
    getTransactionHistory,
    getPortfolioAnalytics
} = require('../controllers/portfolioController');

// Investor routes - sees own portfolio, analytics, and transaction history
router.get('/my', protect, getMyPortfolio);
router.get('/history', protect, getTransactionHistory);
router.get('/analytics', protect, getPortfolioAnalytics);

// Admin only routes (including buy and sell trading)
router.post('/buy', protect, adminOnly, buyShare);
router.post('/sell', protect, adminOnly, sellShare);
router.get('/', protect, adminOnly, getAllPortfolios);
router.post('/', protect, adminOnly, addShare);
router.put('/:id', protect, adminOnly, updateShare);
router.delete('/:id', protect, adminOnly, deleteShare);
router.get('/stats', protect, adminOnly, getDashboardStats);

module.exports = router;