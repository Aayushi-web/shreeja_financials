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
            "SELECT id, name, email, user_id, phone, role FROM users WHERE id = ? AND status = 'active'",
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

// UPDATE PROFILE & USERNAME
exports.updateProfile = async (req, res) => {
    try {
        const { name, user_id, email, phone } = req.body;
        const userId = req.user.id;

        if (!name || !user_id || !email) {
            return res.status(400).json({ message: 'Name, Username (user_id), and Email are required' });
        }

        // Check uniqueness for user_id and email against other accounts
        const [existing] = await db.query(
            "SELECT id, user_id, email FROM users WHERE (user_id = ? OR email = ?) AND id != ?",
            [user_id, email, userId]
        );

        if (existing.length > 0) {
            if (existing[0].user_id === user_id) {
                return res.status(400).json({ message: 'Username is already taken by another user' });
            }
            if (existing[0].email === email) {
                return res.status(400).json({ message: 'Email is already taken by another user' });
            }
        }

        // Update database
        await db.query(
            "UPDATE users SET name = ?, user_id = ?, email = ?, phone = ? WHERE id = ?",
            [name, user_id, email, phone || null, userId]
        );

        // Fetch updated row
        const [updatedRows] = await db.query(
            "SELECT id, name, email, user_id, phone, role FROM users WHERE id = ?",
            [userId]
        );
        const updatedUser = updatedRows[0];

        // Generate fresh JWT with updated info
        const token = jwt.sign(
            { id: updatedUser.id, role: updatedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Profile updated successfully',
            token,
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Please provide current and new password' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(current_password, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

        res.json({ message: 'Password changed successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
