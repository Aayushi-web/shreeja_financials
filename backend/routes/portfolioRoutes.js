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
    sellShare
} = require('../controllers/portfolioController');

// Investor route - sees own portfolio
router.get('/my', protect, getMyPortfolio);
router.post('/buy', protect, buyShare);
router.post('/sell', protect, sellShare);

// Admin only routes
router.get('/', protect, adminOnly, getAllPortfolios);
router.post('/', protect, adminOnly, addShare);
router.put('/:id', protect, adminOnly, updateShare);
router.delete('/:id', protect, adminOnly, deleteShare);
router.get('/stats', protect, adminOnly, getDashboardStats);

module.exports = router;