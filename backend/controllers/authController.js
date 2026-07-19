const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// LOGIN
exports.login = async (req, res) => {
    try {
        const { user_id, password } = req.body;

        // 1. Check if user exists
        const [rows] = await db.query(
            "SELECT * FROM users WHERE user_id = ? AND status = 'active'",
            [user_id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. Create JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 4. Send response
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// CURRENT USER PROFILE
exports.getMe = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, email, role FROM users WHERE id = ? AND status = 'active'",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
