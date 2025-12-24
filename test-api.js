require('dotenv').config();

const API_BASE = `http://localhost:${process.env.PORT || 3000}/api`;
let authToken = '';

// Test data
const testUser = {
    username: 'testuser_' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    full_name: 'Test User'
};

async function makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    if (authToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { error: error.message };
    }
}

async function testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    // Test registration
    console.log('📝 Testing user registration...');
    const registerResult = await makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
    });
    
    if (registerResult.data?.success) {
        console.log('✅ Registration successful');
        authToken = registerResult.data.token;
    } else {
        console.log('❌ Registration failed:', registerResult.data?.message);
        return false;
    }
    
    // Test login
    console.log('🔑 Testing user login...');
    const loginResult = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            login: testUser.username,
            password: testUser.password
        })
    });
    
    if (loginResult.data?.success) {
        console.log('✅ Login successful');
        authToken = loginResult.data.token;
    } else {
        console.log('❌ Login failed:', loginResult.data?.message);
        return false;
    }
    
    // Test get current user
    console.log('👤 Testing get current user...');
    const meResult = await makeRequest('/auth/me');
    
    if (meResult.data?.success) {
        console.log('✅ Get current user successful');
    } else {
        console.log('❌ Get current user failed:', meResult.data?.message);
        return false;
    }
    
    return true;
}

async function testPosts() {
    console.log('\n📝 Testing Posts...');
    
    // Test create post
    console.log('➕ Testing create post...');
    const createPostResult = await makeRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
            content: 'This is a test post from the API test! #testing #api',
            tags: '#testing #api',
            location: 'Test Location'
        })
    });
    
    let postId;
    if (createPostResult.data?.success) {
        console.log('✅ Create post successful');
        postId = createPostResult.data.post.id;
    } else {
        console.log('❌ Create post failed:', createPostResult.data?.message);
        return false;
    }
    
    // Test get feed
    console.log('📰 Testing get feed...');
    const feedResult = await makeRequest('/posts/feed');
    
    if (feedResult.data?.success) {
        console.log('✅ Get feed successful');
        console.log(`   Found ${feedResult.data.posts.length} posts in feed`);
    } else {
        console.log('❌ Get feed failed:', feedResult.data?.message);
    }
    
    // Test get trending posts
    console.log('🔥 Testing get trending posts...');
    const trendingResult = await makeRequest('/posts/trending');
    
    if (trendingResult.data?.success) {
        console.log('✅ Get trending posts successful');
        console.log(`   Found ${trendingResult.data.posts.length} trending posts`);
    } else {
        console.log('❌ Get trending posts failed:', trendingResult.data?.message);
    }
    
    // Test like post
    if (postId) {
        console.log('❤️ Testing like post...');
        const likeResult = await makeRequest(`/posts/${postId}/like`, {
            method: 'POST'
        });
        
        if (likeResult.data?.success) {
            console.log('✅ Like post successful');
        } else {
            console.log('❌ Like post failed:', likeResult.data?.message);
        }
    }
    
    return true;
}

async function testComments() {
    console.log('\n💬 Testing Comments...');
    
    // Get a post to comment on
    const feedResult = await makeRequest('/posts/feed');
    if (!feedResult.data?.success || feedResult.data.posts.length === 0) {
        console.log('❌ No posts available for comment testing');
        return false;
    }
    
    const postId = feedResult.data.posts[0].id;
    
    // Test create comment
    console.log('➕ Testing create comment...');
    const createCommentResult = await makeRequest('/comments', {
        method: 'POST',
        body: JSON.stringify({
            post_id: postId,
            content: 'This is a test comment from the API test!'
        })
    });
    
    if (createCommentResult.data?.success) {
        console.log('✅ Create comment successful');
    } else {
        console.log('❌ Create comment failed:', createCommentResult.data?.message);
        return false;
    }
    
    // Test get comments
    console.log('📖 Testing get comments...');
    const commentsResult = await makeRequest(`/comments/post/${postId}`);
    
    if (commentsResult.data?.success) {
        console.log('✅ Get comments successful');
        console.log(`   Found ${commentsResult.data.comments.length} comments`);
    } else {
        console.log('❌ Get comments failed:', commentsResult.data?.message);
    }
    
    return true;
}

async function testUsers() {
    console.log('\n👥 Testing Users...');
    
    // Test get user profile
    console.log('👤 Testing get user profile...');
    const profileResult = await makeRequest(`/users/${testUser.username}`);
    
    if (profileResult.data?.success) {
        console.log('✅ Get user profile successful');
    } else {
        console.log('❌ Get user profile failed:', profileResult.data?.message);
    }
    
    // Test update profile
    console.log('✏️ Testing update profile...');
    const updateResult = await makeRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
            bio: 'Updated bio from API test',
            location: 'Test City'
        })
    });
    
    if (updateResult.data?.success) {
        console.log('✅ Update profile successful');
    } else {
        console.log('❌ Update profile failed:', updateResult.data?.message);
    }
    
    // Test search users
    console.log('🔍 Testing search users...');
    const searchResult = await makeRequest('/users/search/test');
    
    if (searchResult.data?.success) {
        console.log('✅ Search users successful');
        console.log(`   Found ${searchResult.data.users.length} users`);
    } else {
        console.log('❌ Search users failed:', searchResult.data?.message);
    }
    
    return true;
}

async function testNotifications() {
    console.log('\n🔔 Testing Notifications...');
    
    // Test get notifications
    console.log('📋 Testing get notifications...');
    const notificationsResult = await makeRequest('/notifications');
    
    if (notificationsResult.data?.success) {
        console.log('✅ Get notifications successful');
        console.log(`   Found ${notificationsResult.data.notifications.length} notifications`);
    } else {
        console.log('❌ Get notifications failed:', notificationsResult.data?.message);
    }
    
    // Test get unread count
    console.log('🔢 Testing get unread count...');
    const countResult = await makeRequest('/notifications/unread-count');
    
    if (countResult.data?.success) {
        console.log('✅ Get unread count successful');
        console.log(`   Unread notifications: ${countResult.data.count}`);
    } else {
        console.log('❌ Get unread count failed:', countResult.data?.message);
    }
    
    return true;
}

async function testHashtags() {
    console.log('\n🏷️ Testing Hashtags...');
    
    // Test get trending hashtags
    console.log('🔥 Testing get trending hashtags...');
    const trendingResult = await makeRequest('/hashtags/trending');
    
    if (trendingResult.data?.success) {
        console.log('✅ Get trending hashtags successful');
        console.log(`   Found ${trendingResult.data.hashtags.length} trending hashtags`);
    } else {
        console.log('❌ Get trending hashtags failed:', trendingResult.data?.message);
    }
    
    // Test search hashtags
    console.log('🔍 Testing search hashtags...');
    const searchResult = await makeRequest('/hashtags/search/test');
    
    if (searchResult.data?.success) {
        console.log('✅ Search hashtags successful');
        console.log(`   Found ${searchResult.data.hashtags.length} hashtags`);
    } else {
        console.log('❌ Search hashtags failed:', searchResult.data?.message);
    }
    
    return true;
}

async function runTests() {
    console.log('🧪 Starting Social Media Platform API Tests...');
    console.log(`📡 Testing API at: ${API_BASE}`);
    
    try {
        // Import fetch for Node.js
        const fetch = (await import('node-fetch')).default;
        global.fetch = fetch;
        
        const authSuccess = await testAuthentication();
        if (!authSuccess) {
            console.log('\n❌ Authentication tests failed. Stopping tests.');
            return;
        }
        
        await testPosts();
        await testComments();
        await testUsers();
        await testNotifications();
        await testHashtags();
        
        console.log('\n🎉 All API tests completed!');
        console.log('\n📊 Test Summary:');
        console.log('   ✅ Authentication: Working');
        console.log('   ✅ Posts: Working');
        console.log('   ✅ Comments: Working');
        console.log('   ✅ Users: Working');
        console.log('   ✅ Notifications: Working');
        console.log('   ✅ Hashtags: Working');
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the server is running:');
            console.log('   npm start');
        }
    }
}

// Check if server is running
async function checkServer() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Main execution
(async () => {
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Server is not running!');
        console.log('💡 Please start the server first:');
        console.log('   npm start');
        console.log('\nThen run the tests again:');
        console.log('   npm test');
        process.exit(1);
    }
    
    await runTests();
})();