const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const notifications = await db.all(`
            SELECT n.*, 
                   u.username as related_username, 
                   u.full_name as related_full_name,
                   u.profile_picture as related_profile_picture
            FROM notifications n
            LEFT JOIN users u ON n.related_user_id = u.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json({
            success: true,
            notifications,
            pagination: {
                page,
                limit,
                hasMore: notifications.length === limit
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications'
        });
    }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await db.get('SELECT user_id FROM notifications WHERE id = ?', [id]);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        if (notification.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await db.run('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await db.run('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// Get unread notifications count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.user.id]
        );

        res.json({
            success: true,
            count: result.count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
});

module.exports = router;