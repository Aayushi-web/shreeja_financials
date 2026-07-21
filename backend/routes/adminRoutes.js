const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getTradedSymbols,
    getPerShareTransactions,
    getPerShareAnalytics
} = require('../controllers/adminAnalyticsController');

// All routes protected + admin only
router.use(protect, adminOnly);

router.get('/symbols', getTradedSymbols);
router.get('/transactions/:symbol', getPerShareTransactions);
router.get('/analytics/:symbol', getPerShareAnalytics);

module.exports = router;
