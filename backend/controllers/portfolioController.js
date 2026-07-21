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
        const { user_id, share_name, quantity, buy_price, average_buy_price, amount_invested, current_value } = req.body;
        const avgPrice = average_buy_price !== undefined ? average_buy_price : buy_price;

        const [result] = await db.query(
            'INSERT INTO portfolios (user_id, share_name, quantity, buy_price, average_buy_price, amount_invested, current_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, share_name, quantity, buy_price, avgPrice, amount_invested, current_value]
        );

        res.status(201).json({ message: 'Share added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// UPDATE SHARE (Admin)
exports.updateShare = async (req, res) => {
    try {
        const { share_name, quantity, buy_price, average_buy_price, amount_invested, current_value } = req.body;
        const avgPrice = average_buy_price !== undefined ? average_buy_price : buy_price;

        await db.query(
            'UPDATE portfolios SET share_name=?, quantity=?, buy_price=?, average_buy_price=?, amount_invested=?, current_value=? WHERE id=?',
            [share_name, quantity, buy_price, avgPrice, amount_invested, current_value, req.params.id]
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
            "SELECT COUNT(*) as total FROM users WHERE role = 'investor'"
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

// BUY SHARE (Transactional)
exports.buyShare = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const user_id = req.body.user_id || req.user.id;
        const stock_symbol = req.body.stock_symbol || req.body.share_name;
        const quantity = Number(req.body.quantity);
        const current_price = Number(req.body.current_price || req.body.price || req.body.buy_price);

        if (!stock_symbol || !quantity || quantity <= 0 || !current_price || current_price <= 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: 'Valid stock symbol, positive quantity, and current price are required' });
        }

        // Insert transaction record
        await connection.query(
            "INSERT INTO transactions (user_id, stock_symbol, transaction_type, quantity, price_at_transaction) VALUES (?, ?, 'BUY', ?, ?)",
            [user_id, stock_symbol, quantity, current_price]
        );

        // Check if user already owns this share
        const [existing] = await connection.query(
            'SELECT * FROM portfolios WHERE user_id = ? AND share_name = ? FOR UPDATE',
            [user_id, stock_symbol]
        );

        if (existing.length > 0) {
            const holding = existing[0];
            const oldQty = Number(holding.quantity);
            const oldInvested = Number(holding.amount_invested);
            const newQty = oldQty + quantity;
            const newInvested = oldInvested + (quantity * current_price);
            const newAvgPrice = newInvested / newQty;
            const newCurrentValue = newQty * current_price;

            await connection.query(
                'UPDATE portfolios SET quantity = ?, buy_price = ?, average_buy_price = ?, amount_invested = ?, current_value = ? WHERE id = ?',
                [newQty, newAvgPrice, newAvgPrice, newInvested, newCurrentValue, holding.id]
            );
        } else {
            const amountInvested = quantity * current_price;
            const currentValue = amountInvested;

            await connection.query(
                'INSERT INTO portfolios (user_id, share_name, quantity, buy_price, average_buy_price, amount_invested, current_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user_id, stock_symbol, quantity, current_price, current_price, amountInvested, currentValue]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ message: `Successfully bought ${quantity} shares of ${stock_symbol}` });
    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Buy transaction error:', err);
        res.status(500).json({ message: 'Server error processing buy transaction', error: err.message });
    }
};

// SELL SHARE (Transactional)
exports.sellShare = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const user_id = req.body.user_id || req.user.id;
        const stock_symbol = req.body.stock_symbol || req.body.share_name;
        const quantity = Number(req.body.quantity);
        const current_price = Number(req.body.current_price || req.body.price);

        if (!stock_symbol || !quantity || quantity <= 0 || !current_price || current_price <= 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: 'Valid stock symbol, positive quantity, and current price are required' });
        }

        // Check if user owns the share and lock the row
        const [existing] = await connection.query(
            'SELECT * FROM portfolios WHERE user_id = ? AND share_name = ? FOR UPDATE',
            [user_id, stock_symbol]
        );

        if (existing.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ message: `You do not own any shares of ${stock_symbol} to sell` });
        }

        const holding = existing[0];
        const oldQty = Number(holding.quantity);

        if (oldQty < quantity) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ 
                message: `Insufficient shares to sell. You currently own ${oldQty} shares of ${stock_symbol}` 
            });
        }

        // Insert transaction record
        await connection.query(
            "INSERT INTO transactions (user_id, stock_symbol, transaction_type, quantity, price_at_transaction) VALUES (?, ?, 'SELL', ?, ?)",
            [user_id, stock_symbol, quantity, current_price]
        );

        const newQty = oldQty - quantity;

        if (newQty <= 0.0001) {
            // Remove holding if all shares sold
            await connection.query('DELETE FROM portfolios WHERE id = ?', [holding.id]);
        } else {
            // Reduce holding. Average buy price remains the same when selling.
            const newInvested = newQty * Number(holding.average_buy_price || holding.buy_price);
            const newCurrentValue = newQty * current_price;

            await connection.query(
                'UPDATE portfolios SET quantity = ?, amount_invested = ?, current_value = ? WHERE id = ?',
                [newQty, newInvested, newCurrentValue, holding.id]
            );
        }

        await connection.commit();
        connection.release();

        res.status(200).json({ message: `Successfully sold ${quantity} shares of ${stock_symbol}` });
    } catch (err) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Sell transaction error:', err);
        res.status(500).json({ message: 'Server error processing sell transaction', error: err.message });
    }
};
