const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Get user profile
router.get('/:username', optionalAuth, async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await db.get(`
            SELECT id, username, email, full_name, bio, profile_picture, cover_photo,
                   location, website, verified, private_account, followers_count,
                   following_count, posts_count, created_at
            FROM users WHERE username = ?
        `, [username]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if current user follows this user
        let isFollowing = false;
        if (req.user) {
            const follow = await db.get(
                'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
                [req.user.id, user.id]
            );
            isFollowing = !!follow;
        }

        res.json({
            success: true,
            user: {
                ...user,
                isFollowing,
                isOwnProfile: req.user?.id === user.id
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, upload.single('profilePicture'), handleUploadError, [
    body('full_name').optional().isLength({ max: 100 }),
    body('bio').optional().isLength({ max: 500 }),
    body('location').optional().isLength({ max: 100 }),
    body('website').optional().isURL()
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

        const { full_name, bio, location, website } = req.body;
        const profile_picture = req.file ? `/uploads/${req.file.filename}` : undefined;

        let updateFields = [];
        let updateValues = [];

        if (full_name !== undefined) {
            updateFields.push('full_name = ?');
            updateValues.push(full_name);
        }
        if (bio !== undefined) {
            updateFields.push('bio = ?');
            updateValues.push(bio);
        }
        if (location !== undefined) {
            updateFields.push('location = ?');
            updateValues.push(location);
        }
        if (website !== undefined) {
            updateFields.push('website = ?');
            updateValues.push(website);
        }
        if (profile_picture) {
            updateFields.push('profile_picture = ?');
            updateValues.push(profile_picture);
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(req.user.id);

        await db.run(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        const updatedUser = await db.get(`
            SELECT id, username, email, full_name, bio, profile_picture, cover_photo,
                   location, website, verified, private_account, followers_count,
                   following_count, posts_count, created_at, updated_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Follow/Unfollow user
router.post('/:username/follow', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        
        const targetUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (targetUser.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot follow yourself'
            });
        }

        const existingFollow = await db.get(
            'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
            [req.user.id, targetUser.id]
        );

        if (existingFollow) {
            // Unfollow
            await db.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', 
                [req.user.id, targetUser.id]);
            
            // Update counts
            await db.run('UPDATE users SET following_count = following_count - 1 WHERE id = ?', [req.user.id]);
            await db.run('UPDATE users SET followers_count = followers_count - 1 WHERE id = ?', [targetUser.id]);

            res.json({
                success: true,
                message: 'Unfollowed successfully',
                isFollowing: false
            });
        } else {
            // Follow
            await db.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', 
                [req.user.id, targetUser.id]);
            
            // Update counts
            await db.run('UPDATE users SET following_count = following_count + 1 WHERE id = ?', [req.user.id]);
            await db.run('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [targetUser.id]);

            // Create notification
            await db.run(`
                INSERT INTO notifications (user_id, type, message, related_user_id)
                VALUES (?, 'follow', ? || ' started following you', ?)
            `, [targetUser.id, req.user.username, req.user.id]);

            // Emit real-time notification
            const io = req.app.get('io');
            io.to(`user_${targetUser.id}`).emit('notification', {
                type: 'follow',
                message: `${req.user.username} started following you`,
                user: req.user
            });

            res.json({
                success: true,
                message: 'Followed successfully',
                isFollowing: true
            });
        }
    } catch (error) {
        console.error('Follow/unfollow error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to follow/unfollow user'
        });
    }
});

// Get user followers
router.get('/:username/followers', optionalAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const followers = await db.all(`
            SELECT u.id, u.username, u.full_name, u.profile_picture, u.verified,
                   f.created_at as followed_at
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `, [user.id, limit, offset]);

        res.json({
            success: true,
            followers,
            pagination: {
                page,
                limit,
                hasMore: followers.length === limit
            }
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get followers'
        });
    }
});

// Get user following
router.get('/:username/following', optionalAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const following = await db.all(`
            SELECT u.id, u.username, u.full_name, u.profile_picture, u.verified,
                   f.created_at as followed_at
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = ?
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `, [user.id, limit, offset]);

        res.json({
            success: true,
            following,
            pagination: {
                page,
                limit,
                hasMore: following.length === limit
            }
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get following'
        });
    }
});

// Search users
router.get('/search/:query', optionalAuth, async (req, res) => {
    try {
        const { query } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const users = await db.all(`
            SELECT id, username, full_name, profile_picture, verified, followers_count
            FROM users
            WHERE username LIKE ? OR full_name LIKE ?
            ORDER BY followers_count DESC, username ASC
            LIMIT ? OFFSET ?
        `, [`%${query}%`, `%${query}%`, limit, offset]);

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                hasMore: users.length === limit
            }
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
});

module.exports = router;