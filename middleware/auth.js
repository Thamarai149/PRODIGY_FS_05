const jwt = require('jsonwebtoken');
const db = require('../database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db.get(
            'SELECT id, username, email, full_name, profile_picture, verified FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await db.get(
                'SELECT id, username, email, full_name, profile_picture, verified FROM users WHERE id = ?',
                [decoded.userId]
            );
            req.user = user;
        } catch (error) {
            // Token invalid, but continue without user
            req.user = null;
        }
    }
    
    next();
};

module.exports = {
    authenticateToken,
    optionalAuth
};