const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getAllInvestors,
    getInvestor,
    createInvestor,
    updateInvestor,
    deleteInvestor
} = require('../controllers/investorController');

// All routes protected + admin only
router.use(protect, adminOnly);

router.get('/', getAllInvestors);
router.get('/:id', getInvestor);
router.post('/', createInvestor);
router.put('/:id', updateInvestor);
router.delete('/:id', deleteInvestor);

module.exports = router;