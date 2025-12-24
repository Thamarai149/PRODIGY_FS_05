const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
    body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').optional().isLength({ max: 100 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, full_name } = req.body;

        // Check if user already exists
        const existingUser = await db.get(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
            [username, email, password_hash, full_name || username]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.id, username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Get user data (without password)
        const user = await db.get(
            'SELECT id, username, email, full_name, profile_picture, verified, created_at FROM users WHERE id = ?',
            [result.id]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// Login
router.post('/login', [
    body('login').notEmpty(), // Can be username or email
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { login, password } = req.body;

        // Find user by username or email
        const user = await db.get(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [login, login]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(`
            SELECT id, username, email, full_name, bio, profile_picture, cover_photo,
                   location, website, verified, private_account, followers_count,
                   following_count, posts_count, created_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data'
        });
    }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const token = jwt.sign(
            { userId: req.user.id, username: req.user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
});

module.exports = router;