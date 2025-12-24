const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Create post
router.post('/', authenticateToken, upload.single('media'), handleUploadError, [
    body('content').optional().isLength({ max: 2000 }),
    body('tags').optional().isString(),
    body('location').optional().isLength({ max: 100 })
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

        const { content, tags, location } = req.body;
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;
        const media_type = req.file ? req.file.mimetype : null;

        if (!content && !media_url) {
            return res.status(400).json({
                success: false,
                message: 'Post must have content or media'
            });
        }

        // Create post
        const result = await db.run(`
            INSERT INTO posts (user_id, content, media_url, media_type, tags, location)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.user.id, content, media_url, media_type, tags, location]);

        // Update user posts count
        await db.run('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?', [req.user.id]);

        // Get the created post with user info
        const post = await db.get(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [result.id]);

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post'
        });
    }
});

// Get feed posts
router.get('/feed', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = await db.all(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as user_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id IN (
                SELECT following_id FROM follows WHERE follower_id = ?
                UNION SELECT ?
            )
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, req.user.id, req.user.id, limit, offset]);

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
        console.error('Get feed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get feed'
        });
    }
});

// Get trending posts
router.get('/trending', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const posts = await db.all(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as user_liked,
                   (p.likes_count * 2 + p.comments_count + p.shares_count) as engagement_score
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.created_at > datetime('now', '-7 days')
            ORDER BY engagement_score DESC, p.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user?.id || 0, limit, offset]);

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
        console.error('Get trending posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending posts'
        });
    }
});

// Get user posts
router.get('/user/:username', optionalAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const posts = await db.all(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as user_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user?.id || 0, user.id, limit, offset]);

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
        console.error('Get user posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user posts'
        });
    }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const post = await db.get(`
            SELECT p.*, u.username, u.full_name, u.profile_picture, u.verified,
                   (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as user_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [req.user?.id || 0, id]);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get post'
        });
    }
});

// Like/Unlike post
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const post = await db.get('SELECT id, user_id FROM posts WHERE id = ?', [id]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const existingLike = await db.get(
            'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
            [req.user.id, id]
        );

        if (existingLike) {
            // Unlike
            await db.run('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, id]);
            await db.run('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Post unliked',
                liked: false
            });
        } else {
            // Like
            await db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, id]);
            await db.run('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [id]);

            // Create notification if not own post
            if (post.user_id !== req.user.id) {
                await db.run(`
                    INSERT INTO notifications (user_id, type, message, related_user_id, related_post_id)
                    VALUES (?, 'like', ? || ' liked your post', ?, ?)
                `, [post.user_id, req.user.username, req.user.id, id]);

                // Emit real-time notification
                const io = req.app.get('io');
                io.to(`user_${post.user_id}`).emit('notification', {
                    type: 'like',
                    message: `${req.user.username} liked your post`,
                    user: req.user,
                    post_id: id
                });
            }

            res.json({
                success: true,
                message: 'Post liked',
                liked: true
            });
        }
    } catch (error) {
        console.error('Like/unlike post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to like/unlike post'
        });
    }
});

// Delete post
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const post = await db.get('SELECT user_id FROM posts WHERE id = ?', [id]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        if (post.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }

        await db.run('DELETE FROM posts WHERE id = ?', [id]);
        await db.run('UPDATE users SET posts_count = posts_count - 1 WHERE id = ?', [req.user.id]);

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete post'
        });
    }
});

module.exports = router;