// Global variables
let currentUser = null;
let socket = null;
let currentPage = 'home';

// Initialize app with error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Hide loading screen after a short delay
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 1000);
    
    try {
        initializeApp();
    } catch (error) {
        console.error('App initialization error:', error);
        showErrorMessage('Failed to initialize app. Please refresh the page.');
    }
});

function initializeApp() {
    console.log('Initializing app...');
    
    // Setup event listeners first
    setupEventListeners();
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    
    if (token) {
        console.log('Token exists, validating...');
        validateToken(token);
    } else {
        console.log('No token, showing auth modal...');
        showAuthModal();
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 4px;
        border: 1px solid #f5c6cb;
        z-index: 10001;
        max-width: 300px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function setupEventListeners() {
    try {
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    navigateToPage(page);
                }
            });
        });
        
        // Auth modal tabs
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchAuthTab(tabName);
            });
        });
        
        // Auth forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
        
        // Create post button
        const createPostBtn = document.getElementById('createPostBtn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                const modal = document.getElementById('createPostModal');
                if (modal) {
                    modal.style.display = 'block';
                }
            });
        }
        
        // Create post form
        const createPostForm = document.getElementById('createPostForm');
        if (createPostForm) {
            createPostForm.addEventListener('submit', handleCreatePost);
        }
        
        // Media preview
        const postMedia = document.getElementById('postMedia');
        if (postMedia) {
            postMedia.addEventListener('change', handleMediaPreview);
        }
        
        // User menu
        const userAvatar = document.getElementById('userAvatar');
        const logoutBtn = document.getElementById('logoutBtn');
        const debugLogoutBtn = document.getElementById('debugLogoutBtn');
        
        if (userAvatar) {
            userAvatar.addEventListener('click', toggleUserMenu);
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        if (debugLogoutBtn) {
            debugLogoutBtn.addEventListener('click', handleLogout);
        }
        
        // Notifications
        const notificationsBtn = document.getElementById('notificationsBtn');
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToPage('notifications');
            });
        }
        
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsRead);
        }
        
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        console.log('Event listeners setup complete');
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Authentication functions
async function validateToken(token) {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            initializeAuthenticatedApp();
        } else {
            localStorage.removeItem('token');
            showAuthModal();
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        showAuthModal();
    }
}

function initializeAuthenticatedApp() {
    console.log('Initializing authenticated app...');
    
    // Hide auth modal
    document.getElementById('authModal').style.display = 'none';
    
    // Update UI with user info
    updateUserUI();
    
    // Initialize socket connection
    initializeSocket();
    
    // Load initial content
    loadFeed();
    loadNotificationCount();
    
    // Show main content
    document.querySelector('.navbar').style.display = 'block';
    document.querySelector('.main-content').style.display = 'block';
    
    // Show debug logout button
    document.getElementById('debugLogoutBtn').style.display = 'block';
    
    console.log('Authenticated app initialized');
}

function updateUserUI() {
    const userAvatar = document.getElementById('userAvatar');
    if (currentUser.profile_picture) {
        userAvatar.src = currentUser.profile_picture;
    }
    userAvatar.alt = currentUser.username;
}

function initializeSocket() {
    try {
        if (typeof io === 'undefined') {
            console.log('Socket.IO not available, skipping real-time features');
            return;
        }
        
        socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to server');
            socket.emit('join', currentUser.id);
        });
        
        socket.on('notification', (data) => {
            showToast(data.message, 'success');
            loadNotificationCount();
            
            // Update notifications page if currently viewing
            if (currentPage === 'notifications') {
                loadNotifications();
            }
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
        
    } catch (error) {
        console.error('Socket.IO initialization error:', error);
        console.log('Continuing without real-time features');
    }
}

function showAuthModal() {
    console.log('Showing auth modal...');
    
    try {
        const authModal = document.getElementById('authModal');
        const navbar = document.querySelector('.navbar');
        const mainContent = document.querySelector('.main-content');
        
        if (authModal) {
            authModal.style.display = 'block';
            authModal.style.zIndex = '9999';
            authModal.style.position = 'fixed';
            authModal.style.top = '0';
            authModal.style.left = '0';
            authModal.style.width = '100%';
            authModal.style.height = '100%';
            console.log('Auth modal displayed');
        } else {
            console.error('Auth modal not found!');
            return;
        }
        
        if (navbar) {
            navbar.style.display = 'none';
            console.log('Navbar hidden');
        }
        
        if (mainContent) {
            mainContent.style.display = 'none';
            console.log('Main content hidden');
        }
        
        // Reset auth forms
        resetAuthForms();
        
    } catch (error) {
        console.error('Error showing auth modal:', error);
        showErrorMessage('Error displaying login form');
    }
}

function resetAuthForms() {
    try {
        // Clear form inputs (but keep sample data for login)
        const loginUsername = document.getElementById('loginUsername');
        const loginPassword = document.getElementById('loginPassword');
        const registerUsername = document.getElementById('registerUsername');
        const registerEmail = document.getElementById('registerEmail');
        const registerFullName = document.getElementById('registerFullName');
        const registerPassword = document.getElementById('registerPassword');
        
        if (registerUsername) registerUsername.value = '';
        if (registerEmail) registerEmail.value = '';
        if (registerFullName) registerFullName.value = '';
        if (registerPassword) registerPassword.value = '';
        
        // Keep sample login data for easier testing
        if (loginUsername && !loginUsername.value) loginUsername.value = 'john_doe';
        if (loginPassword && !loginPassword.value) loginPassword.value = 'password123';
        
        // Switch to login tab
        switchAuthTab('login');
        
    } catch (error) {
        console.error('Error resetting auth forms:', error);
    }
}

function switchAuthTab(tabName) {
    try {
        // Update tab buttons
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update forms
        const authForms = document.querySelectorAll('.auth-form');
        authForms.forEach(form => {
            form.classList.remove('active');
        });
        
        const activeForm = document.getElementById(`${tabName}Form`);
        if (activeForm) {
            activeForm.classList.add('active');
        }
        
        console.log(`Switched to ${tabName} tab`);
        
    } catch (error) {
        console.error('Error switching auth tab:', error);
    }
}

function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        if (type === 'success') {
            messageEl.style.background = '#d4edda';
            messageEl.style.color = '#155724';
            messageEl.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            messageEl.style.background = '#f8d7da';
            messageEl.style.color = '#721c24';
            messageEl.style.border = '1px solid #f5c6cb';
        } else {
            messageEl.style.background = '#d1ecf1';
            messageEl.style.color = '#0c5460';
            messageEl.style.border = '1px solid #bee5eb';
        }
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

function switchAuthTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}Form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    try {
        const loginUsername = document.getElementById('loginUsername');
        const loginPassword = document.getElementById('loginPassword');
        
        if (!loginUsername || !loginPassword) {
            showMessage('Login form elements not found', 'error');
            return;
        }
        
        const login = loginUsername.value;
        const password = loginPassword.value;
        
        if (!login || !password) {
            showMessage('Please enter both username and password', 'error');
            return;
        }
        
        showMessage('Logging in...', 'info');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ login, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showMessage('Login successful!', 'success');
            
            setTimeout(() => {
                initializeAuthenticatedApp();
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    try {
        const registerUsername = document.getElementById('registerUsername');
        const registerEmail = document.getElementById('registerEmail');
        const registerFullName = document.getElementById('registerFullName');
        const registerPassword = document.getElementById('registerPassword');
        
        if (!registerUsername || !registerEmail || !registerPassword) {
            showMessage('Registration form elements not found', 'error');
            return;
        }
        
        const username = registerUsername.value;
        const email = registerEmail.value;
        const full_name = registerFullName ? registerFullName.value : '';
        const password = registerPassword.value;
        
        if (!username || !email || !password) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        showMessage('Creating account...', 'info');
        
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, full_name, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showMessage('Registration successful!', 'success');
            
            setTimeout(() => {
                initializeAuthenticatedApp();
            }, 1000);
        } else {
            showMessage(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Registration failed. Please try again.', 'error');
    }
}

function handleLogout() {
    console.log('Logging out...');
    
    // Clear user data
    localStorage.removeItem('token');
    currentUser = null;
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    // Hide main content and navbar
    document.querySelector('.navbar').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
    
    // Show auth modal
    showAuthModal();
    
    // Reset the page state
    currentPage = 'home';
    
    // Clear any existing content
    document.getElementById('feedPosts').innerHTML = '';
    document.getElementById('notificationsList').innerHTML = '';
    
    console.log('Logout complete, auth modal should be visible');
}

// Navigation functions
function navigateToPage(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Show page
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}Page`).classList.add('active');
    
    currentPage = page;
    
    // Load page content
    switch(page) {
        case 'home':
            loadFeed();
            break;
        case 'trending':
            loadTrendingContent();
            break;
        case 'profile':
            loadProfile(currentUser.username);
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// Post functions
async function loadFeed() {
    const container = document.getElementById('feedPosts');
    const loading = document.getElementById('feedLoading');
    
    loading.style.display = 'block';
    
    try {
        const response = await fetch('/api/posts/feed', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            container.innerHTML = '';
            data.posts.forEach(post => {
                container.appendChild(createPostElement(post));
            });
        }
    } catch (error) {
        console.error('Load feed error:', error);
        showToast('Failed to load feed', 'error');
    } finally {
        loading.style.display = 'none';
    }
}

async function loadTrendingContent() {
    // Load trending hashtags
    try {
        const response = await fetch('/api/hashtags/trending');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('trendingHashtags');
            container.innerHTML = '';
            
            data.hashtags.forEach(hashtag => {
                const item = document.createElement('div');
                item.className = 'hashtag-item';
                item.innerHTML = `
                    <span class="hashtag-tag">#${hashtag.tag}</span>
                    <span class="hashtag-count">${hashtag.usage_count} posts</span>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Load trending hashtags error:', error);
    }
    
    // Load trending posts
    try {
        const response = await fetch('/api/posts/trending', {
            headers: currentUser ? {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {}
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('trendingPosts');
            container.innerHTML = '';
            
            data.posts.forEach(post => {
                container.appendChild(createPostElement(post));
            });
        }
    } catch (error) {
        console.error('Load trending posts error:', error);
    }
}

function createPostElement(post) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.dataset.postId = post.id;
    
    const timeAgo = getTimeAgo(post.created_at);
    const isLiked = post.user_liked > 0;
    
    postEl.innerHTML = `
        <div class="post-header">
            <img src="${post.profile_picture || '/api/placeholder/48/48'}" alt="${post.username}" class="post-avatar">
            <div class="post-user-info">
                <div class="post-user-name">
                    ${post.full_name || post.username}
                    ${post.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    <span class="post-username">@${post.username}</span>
                </div>
                <div class="post-time">${timeAgo}</div>
            </div>
        </div>
        
        ${post.content ? `<div class="post-content">${formatPostContent(post.content)}</div>` : ''}
        
        ${post.media_url ? `
            <div class="post-media">
                ${post.media_type.startsWith('image/') ? 
                    `<img src="${post.media_url}" alt="Post media">` :
                    `<video controls><source src="${post.media_url}" type="${post.media_type}"></video>`
                }
            </div>
        ` : ''}
        
        <div class="post-actions">
            <div class="post-action comment-action" onclick="showComments(${post.id})">
                <i class="far fa-comment"></i>
                <span>${post.comments_count}</span>
            </div>
            <div class="post-action like-action ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span>${post.likes_count}</span>
            </div>
            <div class="post-action share-action">
                <i class="far fa-share-square"></i>
                <span>${post.shares_count || 0}</span>
            </div>
        </div>
    `;
    
    return postEl;
}

function formatPostContent(content) {
    // Convert hashtags to links
    return content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
}

async function handleCreatePost(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value;
    const mediaFile = document.getElementById('postMedia').files[0];
    const location = document.getElementById('postLocation').value;
    
    if (!content && !mediaFile) {
        showToast('Please add some content or media', 'error');
        return;
    }
    
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (mediaFile) formData.append('media', mediaFile);
    if (location) formData.append('location', location);
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('createPostModal').style.display = 'none';
            document.getElementById('createPostForm').reset();
            document.getElementById('mediaPreview').innerHTML = '';
            showToast('Post created successfully!', 'success');
            
            // Reload feed if on home page
            if (currentPage === 'home') {
                loadFeed();
            }
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Create post error:', error);
        showToast('Failed to create post', 'error');
    }
}

function handleMediaPreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('mediaPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            } else if (file.type.startsWith('video/')) {
                preview.innerHTML = `<video controls><source src="${e.target.result}" type="${file.type}"></video>`;
            }
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

async function toggleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update UI
            const postEl = document.querySelector(`[data-post-id="${postId}"]`);
            const likeAction = postEl.querySelector('.like-action');
            const likeIcon = likeAction.querySelector('i');
            const likeCount = likeAction.querySelector('span');
            
            if (data.liked) {
                likeAction.classList.add('liked');
                likeIcon.className = 'fas fa-heart';
                likeCount.textContent = parseInt(likeCount.textContent) + 1;
            } else {
                likeAction.classList.remove('liked');
                likeIcon.className = 'far fa-heart';
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
            }
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        showToast('Failed to update like', 'error');
    }
}

// Notification functions
async function loadNotificationCount() {
    try {
        const response = await fetch('/api/notifications/unread-count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const badge = document.getElementById('notificationBadge');
            if (data.count > 0) {
                badge.textContent = data.count > 99 ? '99+' : data.count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Load notification count error:', error);
    }
}

async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('notificationsList');
            container.innerHTML = '';
            
            data.notifications.forEach(notification => {
                const item = document.createElement('div');
                item.className = `notification-item ${!notification.is_read ? 'unread' : ''}`;
                item.innerHTML = `
                    <img src="${notification.related_profile_picture || '/api/placeholder/40/40'}" 
                         alt="${notification.related_username}" class="notification-avatar">
                    <div class="notification-content">
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${getTimeAgo(notification.created_at)}</div>
                    </div>
                `;
                
                if (!notification.is_read) {
                    item.addEventListener('click', () => markNotificationRead(notification.id));
                }
                
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

async function markNotificationRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        loadNotifications();
        loadNotificationCount();
    } catch (error) {
        console.error('Mark notification read error:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadNotifications();
            loadNotificationCount();
            showToast('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Mark all notifications read error:', error);
    }
}

// Utility functions
function toggleUserMenu() {
    const dropdown = document.querySelector('.dropdown-menu');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length < 2) return;
    
    // Implement search functionality
    console.log('Searching for:', query);
}

// Profile functions
async function loadProfile(username) {
    try {
        const response = await fetch(`/api/users/${username}`, {
            headers: currentUser ? {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {}
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderProfile(data.user);
            loadUserPosts(username);
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

function renderProfile(user) {
    const container = document.querySelector('.profile-container');
    container.innerHTML = `
        <div class="profile-header">
            ${user.cover_photo ? `<div class="profile-cover" style="background-image: url(${user.cover_photo})"></div>` : ''}
            <div class="profile-info">
                <img src="${user.profile_picture || '/api/placeholder/120/120'}" alt="${user.username}" class="profile-avatar">
                <div class="profile-name">
                    ${user.full_name || user.username}
                    ${user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div class="profile-username">@${user.username}</div>
                ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="profile-stat-number">${user.posts_count}</span>
                        <span class="profile-stat-label">Posts</span>
                    </div>
                    <div class="profile-stat">
                        <span class="profile-stat-number">${user.followers_count}</span>
                        <span class="profile-stat-label">Followers</span>
                    </div>
                    <div class="profile-stat">
                        <span class="profile-stat-number">${user.following_count}</span>
                        <span class="profile-stat-label">Following</span>
                    </div>
                </div>
            </div>
        </div>
        <div id="userPosts" class="posts-container"></div>
    `;
}

async function loadUserPosts(username) {
    try {
        const response = await fetch(`/api/posts/user/${username}`, {
            headers: currentUser ? {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            } : {}
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('userPosts');
            container.innerHTML = '';
            
            data.posts.forEach(post => {
                container.appendChild(createPostElement(post));
            });
        }
    } catch (error) {
        console.error('Load user posts error:', error);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.querySelector('.dropdown-menu').style.display = 'none';
    }
});