const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Create comment
router.post('/', authenticateToken, [
    body('post_id').isInt({ min: 1 }),
    body('content').isLength({ min: 1, max: 500 }),
    body('parent_comment_id').optional().isInt({ min: 1 })
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

        const { post_id, content, parent_comment_id } = req.body;

        // Check if post exists
        const post = await db.get('SELECT id, user_id FROM posts WHERE id = ?', [post_id]);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Create comment
        const result = await db.run(`
            INSERT INTO comments (user_id, post_id, parent_comment_id, content)
            VALUES (?, ?, ?, ?)
        `, [req.user.id, post_id, parent_comment_id || null, content]);

        // Update post comments count
        await db.run('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [post_id]);

        // Create notification if not own post
        if (post.user_id !== req.user.id) {
            await db.run(`
                INSERT INTO notifications (user_id, type, message, related_user_id, related_post_id)
                VALUES (?, 'comment', ? || ' commented on your post', ?, ?)
            `, [post.user_id, req.user.username, req.user.id, post_id]);

            // Emit real-time notification
            const io = req.app.get('io');
            io.to(`user_${post.user_id}`).emit('notification', {
                type: 'comment',
                message: `${req.user.username} commented on your post`,
                user: req.user,
                post_id: post_id
            });
        }

        // Get the created comment with user info
        const comment = await db.get(`
            SELECT c.*, u.username, u.full_name, u.profile_picture, u.verified
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.id]);

        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            comment
        });
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create comment'
        });
    }
});

// Get post comments
router.get('/post/:postId', optionalAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const comments = await db.all(`
            SELECT c.*, u.username, u.full_name, u.profile_picture, u.verified
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ? AND c.parent_comment_id IS NULL
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `, [postId, limit, offset]);

        // Get replies for each comment
        for (let comment of comments) {
            const replies = await db.all(`
                SELECT c.*, u.username, u.full_name, u.profile_picture, u.verified
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.parent_comment_id = ?
                ORDER BY c.created_at ASC
                LIMIT 3
            `, [comment.id]);
            
            comment.replies = replies;
            comment.replies_count = replies.length;
        }

        res.json({
            success: true,
            comments,
            pagination: {
                page,
                limit,
                hasMore: comments.length === limit
            }
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get comments'
        });
    }
});

// Get comment replies
router.get('/:commentId/replies', optionalAuth, async (req, res) => {
    try {
        const { commentId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const replies = await db.all(`
            SELECT c.*, u.username, u.full_name, u.profile_picture, u.verified
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_comment_id = ?
            ORDER BY c.created_at ASC
            LIMIT ? OFFSET ?
        `, [commentId, limit, offset]);

        res.json({
            success: true,
            replies,
            pagination: {
                page,
                limit,
                hasMore: replies.length === limit
            }
        });
    } catch (error) {
        console.error('Get replies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get replies'
        });
    }
});

// Delete comment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const comment = await db.get('SELECT user_id, post_id FROM comments WHERE id = ?', [id]);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (comment.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this comment'
            });
        }

        await db.run('DELETE FROM comments WHERE id = ?', [id]);
        await db.run('UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?', [comment.post_id]);

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
        });
    }
});

module.exports = router;