const db = require('../config/db');

// GET ALL PORTFOLIOS (Admin)
exports.getAllPortfolios = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, u.name as investor_name 
            FROM portfolios p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET PORTFOLIO BY INVESTOR (Investor sees own data)
exports.getMyPortfolio = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM portfolios WHERE user_id = ?',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ADD SHARE (Admin)
exports.addShare = async (req, res) => {
    try {
       const { user_id, share_name, quantity, buy_price, amount_invested, current_value } = req.body;

        const [result] = await db.query(
    'INSERT INTO portfolios (user_id, share_name, quantity, buy_price, amount_invested, current_value) VALUES (?, ?, ?, ?, ?, ?)',
    [user_id, share_name, quantity, buy_price, amount_invested, current_value]
);

        res.status(201).json({ message: 'Share added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// UPDATE SHARE (Admin)
exports.updateShare = async (req, res) => {
    try {
        const { share_name, quantity, buy_price, amount_invested, current_value } = req.body;

        await db.query(
    'UPDATE portfolios SET share_name=?, quantity=?, buy_price=?, amount_invested=?, current_value=? WHERE id=?',
    [share_name, quantity, buy_price, amount_invested, current_value, req.params.id]
);

        res.json({ message: 'Share updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE SHARE (Admin)
exports.deleteShare = async (req, res) => {
    try {
        await db.query('DELETE FROM portfolios WHERE id = ?', [req.params.id]);
        res.json({ message: 'Share deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DASHBOARD STATS (Admin)
exports.getDashboardStats = async (req, res) => {
    try {
        const [[investorCount]] = await db.query(
            'SELECT COUNT(*) as total FROM users WHERE role = "investor"'
        );
        const [[portfolioCount]] = await db.query(
            'SELECT COUNT(*) as total FROM portfolios'
        );
        const [[financials]] = await db.query(
            'SELECT SUM(amount_invested) as total_invested, SUM(current_value) as total_current FROM portfolios'
        );

        res.json({
            total_investors: investorCount.total,
            total_portfolios: portfolioCount.total,
            total_invested: financials.total_invested || 0,
            total_current_value: financials.total_current || 0,
            total_profit_loss: (financials.total_current || 0) - (financials.total_invested || 0)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
