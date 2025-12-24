const express = require('express');
const db = require('../database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get trending hashtags
router.get('/trending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const hashtags = await db.all(`
            SELECT h.tag, h.usage_count,
                   COUNT(ph.post_id) as recent_posts
            FROM hashtags h
            LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
            LEFT JOIN posts p ON ph.post_id = p.id AND p.created_at > datetime('now', '-7 days')
            GROUP BY h.id, h.tag, h.usage_count
            ORDER BY recent_posts DESC, h.usage_count DESC
            LIMIT ?
        `, [limit]);

        res.json({
            success: true,
            hashtags
        });
    } catch (error) {
        console.error('Get trending hashtags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending hashtags'
        });
    }
});

// Get posts by hashtag
router.get('/:tag/posts', optionalAuth, async (req, res) => {
    try {
        const { tag } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = await db.all(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as user_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            JOIN post_hashtags ph ON p.id = ph.post_id
            JOIN hashtags h ON ph.hashtag_id = h.id
            WHERE h.tag = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user?.id || 0, tag.toLowerCase(), limit, offset]);

        res.json({
            success: true,
            posts,
            pagination: {
                page,
                limit,
                hasMore: posts.length === limit
            }
        });
    } catch (error) {
        console.error('Get hashtag posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get hashtag posts'
        });
    }
});

// Search hashtags
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const hashtags = await db.all(`
            SELECT tag, usage_count
            FROM hashtags
            WHERE tag LIKE ?
            ORDER BY usage_count DESC
            LIMIT ?
        `, [`%${query.toLowerCase()}%`, limit]);

        res.json({
            success: true,
            hashtags
        });
    } catch (error) {
        console.error('Search hashtags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search hashtags'
        });
    }
});

module.exports = router;