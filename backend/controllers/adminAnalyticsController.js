const db = require('../config/db');

/**
 * @desc    Get all unique stock symbols traded or held across the platform
 * @route   GET /api/admin/symbols
 * @access  Private/Admin
 */
exports.getTradedSymbols = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT stock_symbol AS symbol FROM transactions
            UNION
            SELECT DISTINCT share_name AS symbol FROM portfolios
            ORDER BY symbol ASC
        `);

        const symbols = rows.map(r => r.symbol).filter(Boolean);

        return res.json({
            success: true,
            count: symbols.length,
            symbols
        });
    } catch (err) {
        console.error('Error fetching traded symbols:', err);
        return res.status(500).json({ message: 'Server error fetching stock symbols' });
    }
};

/**
 * @desc    Get all transactions (BUY/SELL) across all users for a specific stock ticker
 * @route   GET /api/admin/transactions/:symbol
 * @access  Private/Admin
 */
exports.getPerShareTransactions = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ message: 'Stock symbol parameter is required' });
        }

        const [transactions] = await db.query(`
            SELECT 
                t.*, 
                u.name as user_name, 
                u.email as user_email, 
                u.user_id as user_login_id 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            WHERE LOWER(t.stock_symbol) = LOWER(?) OR LOWER(t.stock_symbol) LIKE LOWER(?)
            ORDER BY t.timestamp DESC
        `, [symbol, `%${symbol}%`]);

        return res.json({
            success: true,
            symbol,
            count: transactions.length,
            transactions
        });
    } catch (err) {
        console.error('Error fetching per-share transactions:', err);
        return res.status(500).json({ message: 'Server error fetching per-share transactions' });
    }
};

/**
 * @desc    Get aggregated platform-wide analytics for a specific stock
 * @route   GET /api/admin/analytics/:symbol
 * @access  Private/Admin
 */
exports.getPerShareAnalytics = async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({ message: 'Stock symbol parameter is required' });
        }

        const symbolParam = symbol;
        const symbolLikeParam = `%${symbol}%`;

        // 1. Query volume and transaction values by BUY/SELL
        const [txRows] = await db.query(`
            SELECT 
                transaction_type,
                SUM(quantity) as volume,
                SUM(quantity * price_at_transaction) as total_value
            FROM transactions
            WHERE LOWER(stock_symbol) = LOWER(?) OR LOWER(stock_symbol) LIKE LOWER(?)
            GROUP BY transaction_type
        `, [symbolParam, symbolLikeParam]);

        // Query total distinct historical traders
        const [traderCountRows] = await db.query(`
            SELECT COUNT(DISTINCT user_id) as total_traders
            FROM transactions
            WHERE LOWER(stock_symbol) = LOWER(?) OR LOWER(stock_symbol) LIKE LOWER(?)
        `, [symbolParam, symbolLikeParam]);

        const totalTraders = Number(traderCountRows[0]?.total_traders || 0);

        let totalBoughtVolume = 0;
        let totalSoldVolume = 0;
        let totalBuyValue = 0;
        let totalSellValue = 0;

        txRows.forEach(row => {
            const vol = Number(row.volume || 0);
            const val = Number(row.total_value || 0);
            if (row.transaction_type === 'BUY') {
                totalBoughtVolume = vol;
                totalBuyValue = val;
            } else if (row.transaction_type === 'SELL') {
                totalSoldVolume = vol;
                totalSellValue = val;
            }
        });

        const totalVolumeTraded = totalBoughtVolume + totalSoldVolume;
        const avgBuyPrice = totalBoughtVolume > 0 ? (totalBuyValue / totalBoughtVolume) : 0;
        const avgSellPrice = totalSoldVolume > 0 ? (totalSellValue / totalSoldVolume) : 0;

        // 2. Query current portfolio holdings
        const [holdingRows] = await db.query(`
            SELECT 
                COUNT(DISTINCT user_id) as unique_investors,
                SUM(quantity) as total_held_quantity,
                SUM(amount_invested) as total_amount_invested,
                SUM(current_value) as total_current_value
            FROM portfolios
            WHERE (LOWER(share_name) = LOWER(?) OR LOWER(share_name) LIKE LOWER(?)) AND quantity > 0
        `, [symbolParam, symbolLikeParam]);

        const holdingInfo = holdingRows[0] || {};
        const uniqueInvestors = Number(holdingInfo.unique_investors || 0);
        const totalHeldQuantity = Number(holdingInfo.total_held_quantity || 0);
        const totalAmountInvested = Number(holdingInfo.total_amount_invested || 0);
        const totalCurrentValue = Number(holdingInfo.total_current_value || 0);

        return res.json({
            success: true,
            symbol,
            analytics: {
                totalVolumeTraded,
                totalBoughtVolume,
                totalSoldVolume,
                avgBuyPrice: Number(avgBuyPrice.toFixed(2)),
                avgSellPrice: Number(avgSellPrice.toFixed(2)),
                uniqueInvestors,
                totalTraders,
                totalHeldQuantity,
                totalAmountInvested: Number(totalAmountInvested.toFixed(2)),
                totalCurrentValue: Number(totalCurrentValue.toFixed(2))
            }
        });
    } catch (err) {
        console.error('Error fetching per-share analytics:', err);
        return res.status(500).json({ message: 'Server error fetching per-share analytics' });
    }
};
