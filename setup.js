require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🔧 Setting up Social Media Platform database...');
    
    try {
        // Create uploads directory
        const uploadsDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('📁 Created uploads directory');
        }
        
        // Create sample users
        console.log('👥 Creating sample users...');
        
        const sampleUsers = [
            {
                username: 'john_doe',
                email: 'john@example.com',
                password: 'password123',
                full_name: 'John Doe',
                bio: 'Tech enthusiast and coffee lover ☕',
                verified: true,
                profile_picture: '/images/users/user1.svg'
            },
            {
                username: 'jane_smith',
                email: 'jane@example.com',
                password: 'password123',
                full_name: 'Jane Smith',
                bio: 'Digital artist and photographer 📸',
                verified: false,
                profile_picture: '/images/users/user2.svg'
            },
            {
                username: 'mike_wilson',
                email: 'mike@example.com',
                password: 'password123',
                full_name: 'Mike Wilson',
                bio: 'Travel blogger exploring the world 🌍',
                verified: true,
                profile_picture: '/images/users/user3.svg'
            },
            {
                username: 'alex_dev',
                email: 'alex@example.com',
                password: 'password123',
                full_name: 'Alex Rodriguez',
                bio: 'AI Developer & Machine Learning Engineer 🤖',
                verified: true,
                profile_picture: '/images/users/user4.svg'
            },
            {
                username: 'chef_marco',
                email: 'marco@example.com',
                password: 'password123',
                full_name: 'Chef Marco',
                bio: 'Culinary artist creating extraordinary experiences 👨‍🍳',
                verified: true,
                profile_picture: '/images/users/user5.svg'
            }
        ];
        
        const userIds = [];
        
        for (const userData of sampleUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            
            const result = await db.run(`
                INSERT INTO users (username, email, password_hash, full_name, bio, verified, profile_picture)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.username,
                userData.email,
                hashedPassword,
                userData.full_name,
                userData.bio,
                userData.verified,
                userData.profile_picture
            ]);
            
            userIds.push(result.id);
            console.log(`✅ Created user: ${userData.username}`);
        }
        
        // Create sample follows
        console.log('🔗 Creating sample follows...');
        
        const follows = [
            [userIds[0], userIds[1]], // John follows Jane
            [userIds[0], userIds[2]], // John follows Mike
            [userIds[1], userIds[0]], // Jane follows John
            [userIds[2], userIds[0]], // Mike follows John
        ];
        
        for (const [followerId, followingId] of follows) {
            await db.run(
                'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
                [followerId, followingId]
            );
            
            // Update counts
            await db.run('UPDATE users SET following_count = following_count + 1 WHERE id = ?', [followerId]);
            await db.run('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [followingId]);
        }
        
        console.log('✅ Created sample follows');
        
        // Create sample posts
        console.log('📝 Creating sample posts...');
        
        const samplePosts = [
            {
                user_id: userIds[3], // alex_dev
                content: 'Just launched my new AI-powered web app! It uses machine learning to predict user behavior and optimize UX in real-time. The future is here! #AI #MachineLearning #WebDev #Innovation',
                tags: '#AI #MachineLearning #WebDev #Innovation',
                media_url: '/images/posts/ai-dashboard.svg',
                media_type: 'image/svg+xml'
            },
            {
                user_id: userIds[1], // jane_smith
                content: '✨ New brand identity design for a sustainable tech startup! Love how the organic shapes represent growth and innovation. What do you think? #Design #Branding #Sustainability',
                tags: '#Design #Branding #Sustainability',
                media_url: '/images/posts/design-work.svg',
                media_type: 'image/svg+xml'
            },
            {
                user_id: userIds[2], // mike_wilson
                content: '🌅 Sunrise over the Swiss Alps never gets old! Currently at 3,000m altitude and the view is absolutely breathtaking. Nature is the best artist! #Travel #Switzerland #Mountains #Sunrise',
                tags: '#Travel #Switzerland #Mountains #Sunrise',
                media_url: '/images/posts/mountain-view.svg',
                media_type: 'image/svg+xml',
                location: 'Swiss Alps, Switzerland'
            },
            {
                user_id: userIds[0], // john_doe
                content: '🔥 Mind-blowing setup for my new home office! Triple monitor setup with RGB everything. Productivity level: MAXIMUM! Who else is obsessed with their workspace? #Setup #HomeOffice #Productivity #Gaming',
                tags: '#Setup #HomeOffice #Productivity #Gaming',
                media_url: '/images/posts/tech-setup.svg',
                media_type: 'image/svg+xml'
            },
            {
                user_id: userIds[4], // chef_marco
                content: '👨‍🍳 Tonight\'s special: Wagyu beef with truffle risotto and seasonal vegetables. 5 years of perfecting this recipe and it\'s finally ready! #Culinary #Wagyu #Truffle #Gourmet',
                tags: '#Culinary #Wagyu #Truffle #Gourmet',
                media_url: '/images/posts/gourmet-food.svg',
                media_type: 'image/svg+xml'
            },
            {
                user_id: userIds[0], // john_doe
                content: 'Coffee and code - the perfect combination for a productive morning ☕💻 Working on some exciting new features today!',
                tags: '#coffee #coding #productivity'
            },
            {
                user_id: userIds[1], // jane_smith
                content: 'Working on a new digital art piece. Can\'t wait to show you all the final result! The creative process is so rewarding 🎨',
                tags: '#digitalart #creative #workinprogress'
            }
        ];
        
        const postIds = [];
        
        for (const postData of samplePosts) {
            const result = await db.run(`
                INSERT INTO posts (user_id, content, tags, location, media_url, media_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                postData.user_id,
                postData.content,
                postData.tags,
                postData.location || null,
                postData.media_url || null,
                postData.media_type || null
            ]);
            
            postIds.push(result.id);
            
            // Update user posts count
            await db.run('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?', [postData.user_id]);
            
            // Process hashtags
            if (postData.tags) {
                const hashtags = postData.tags.match(/#[\w]+/g);
                if (hashtags) {
                    for (const tag of hashtags) {
                        const cleanTag = tag.substring(1).toLowerCase();
                        
                        // Insert or update hashtag
                        try {
                            await db.run('INSERT INTO hashtags (tag, usage_count) VALUES (?, 1)', [cleanTag]);
                        } catch (error) {
                            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                                await db.run('UPDATE hashtags SET usage_count = usage_count + 1 WHERE tag = ?', [cleanTag]);
                            }
                        }
                        
                        // Link post to hashtag
                        const hashtag = await db.get('SELECT id FROM hashtags WHERE tag = ?', [cleanTag]);
                        if (hashtag) {
                            await db.run('INSERT INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)', 
                                [result.id, hashtag.id]);
                        }
                    }
                }
            }
        }
        
        console.log('✅ Created sample posts');
        
        // Create sample likes
        console.log('❤️ Creating sample likes...');
        
        const likes = [
            [userIds[1], postIds[0]], // Jane likes John's first post
            [userIds[2], postIds[0]], // Mike likes John's first post
            [userIds[0], postIds[1]], // John likes Jane's post
            [userIds[2], postIds[1]], // Mike likes Jane's post
            [userIds[0], postIds[2]], // John likes Mike's post
            [userIds[1], postIds[2]], // Jane likes Mike's post
        ];
        
        for (const [userId, postId] of likes) {
            await db.run('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            await db.run('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', [postId]);
        }
        
        console.log('✅ Created sample likes');
        
        // Create sample comments
        console.log('💬 Creating sample comments...');
        
        const comments = [
            {
                user_id: userIds[1],
                post_id: postIds[0],
                content: 'Congratulations! Can\'t wait to try it out!'
            },
            {
                user_id: userIds[2],
                post_id: postIds[0],
                content: 'Awesome work! The UI looks fantastic.'
            },
            {
                user_id: userIds[0],
                post_id: postIds[1],
                content: 'Beautiful shot! The lighting is perfect.'
            },
            {
                user_id: userIds[1],
                post_id: postIds[2],
                content: 'Colorado is amazing! I need to visit soon.'
            }
        ];
        
        for (const commentData of comments) {
            await db.run(`
                INSERT INTO comments (user_id, post_id, content)
                VALUES (?, ?, ?)
            `, [commentData.user_id, commentData.post_id, commentData.content]);
            
            await db.run('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [commentData.post_id]);
        }
        
        console.log('✅ Created sample comments');
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Sample accounts created:');
        console.log('   Username: john_doe | Password: password123');
        console.log('   Username: jane_smith | Password: password123');
        console.log('   Username: mike_wilson | Password: password123');
        console.log('\n🚀 You can now start the server with: npm start');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup
setupDatabase();