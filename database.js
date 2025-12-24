const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, process.env.DB_NAME || 'social_media.sqlite'));
        this.init();
    }

    init() {
        // Enable foreign keys
        this.db.run("PRAGMA foreign_keys = ON");
        
        // Create tables synchronously
        this.createTablesSync();
    }

    createTablesSync() {
        // Users table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                bio TEXT,
                profile_picture VARCHAR(255),
                cover_photo VARCHAR(255),
                location VARCHAR(100),
                website VARCHAR(255),
                verified BOOLEAN DEFAULT FALSE,
                private_account BOOLEAN DEFAULT FALSE,
                followers_count INTEGER DEFAULT 0,
                following_count INTEGER DEFAULT 0,
                posts_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT,
                media_url VARCHAR(255),
                media_type VARCHAR(50),
                tags TEXT,
                location VARCHAR(100),
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                shares_count INTEGER DEFAULT 0,
                is_pinned BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                UNIQUE(user_id, post_id)
            );

            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                post_id INTEGER NOT NULL,
                parent_comment_id INTEGER,
                content TEXT NOT NULL,
                likes_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                FOREIGN KEY (parent_comment_id) REFERENCES comments (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS follows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(follower_id, following_id)
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                related_user_id INTEGER,
                related_post_id INTEGER,
                is_read BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (related_user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (related_post_id) REFERENCES posts (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS hashtags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tag VARCHAR(100) UNIQUE NOT NULL,
                usage_count INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS post_hashtags (
                post_id INTEGER NOT NULL,
                hashtag_id INTEGER NOT NULL,
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                FOREIGN KEY (hashtag_id) REFERENCES hashtags (id) ON DELETE CASCADE,
                PRIMARY KEY (post_id, hashtag_id)
            );

            CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
            CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
            CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
            CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
        `);
    }

    // Helper method to run queries with promises
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    // Helper method to get single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Helper method to get all rows
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();