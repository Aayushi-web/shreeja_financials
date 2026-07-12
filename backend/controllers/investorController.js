const db = require('../config/db');
const bcrypt = require('bcrypt');

// GET ALL INVESTORS
exports.getAllInvestors = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, user_id, phone, status, created_at FROM users WHERE role = "investor"'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET SINGLE INVESTOR
exports.getInvestor = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, name, email, user_id, phone, status FROM users WHERE id = ? AND role = "investor"',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Investor not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// CREATE INVESTOR
exports.createInvestor = async (req, res) => {
    try {
        const { name, email, user_id, password, phone, status } = req.body;

        // Check if user_id or email already exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR user_id = ?',
            [email, user_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email or User ID already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert investor
        const [result] = await db.query(
            'INSERT INTO users (name, email, user_id, password, role, phone, status) VALUES (?, ?, ?, ?, "investor", ?, ?)',
            [name, email, user_id, hashedPassword, phone, status || 'active']
        );

        res.status(201).json({ message: 'Investor created successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// UPDATE INVESTOR
exports.updateInvestor = async (req, res) => {
    try {
        const { name, email, phone, status } = req.body;

        await db.query(
            'UPDATE users SET name=?, email=?, phone=?, status=? WHERE id=? AND role="investor"',
            [name, email, phone, status, req.params.id]
        );

        res.json({ message: 'Investor updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE INVESTOR
exports.deleteInvestor = async (req, res) => {
    try {
        await db.query(
            'DELETE FROM users WHERE id = ? AND role = "investor"',
            [req.params.id]
        );
        res.json({ message: 'Investor deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};