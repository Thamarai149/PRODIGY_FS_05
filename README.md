# Social Media Platform

A comprehensive social media platform built with Node.js, Express, SQLite, and Socket.IO featuring user profiles, posts, likes, comments, following, real-time notifications, and trending content.

## 🚀 Features

### Core Features
- **User Authentication**: Secure registration and login with JWT tokens
- **User Profiles**: Customizable profiles with bio, profile picture, and cover photo
- **Posts**: Create posts with text, images, and videos
- **Interactions**: Like and comment on posts
- **Following System**: Follow/unfollow other users
- **Real-time Notifications**: Instant notifications for likes, comments, and follows
- **Trending Content**: Discover popular posts and hashtags

### Advanced Features
- **Hashtag System**: Tag posts and discover trending hashtags
- **Media Uploads**: Support for image and video uploads
- **Responsive Design**: Mobile-friendly interface
- **Search Functionality**: Search users, posts, and hashtags
- **Real-time Updates**: Live notifications using Socket.IO
- **Feed Algorithm**: Personalized feed based on following

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite with custom database wrapper
- **Authentication**: JWT (JSON Web Tokens)
- **File Uploads**: Multer
- **Real-time**: Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Security**: Helmet, bcryptjs, express-rate-limit

## 📦 Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd FS/PLATFORM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # The .env file is already created with default values
   # Modify FS/PLATFORM/.env if needed
   ```

4. **Initialize the database**
   ```bash
   npm run setup
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   ```
   http://localhost:3000
   ```

## 🧪 Testing

Run the API tests to verify everything is working:

```bash
npm test
```

## 📱 Usage

### Sample Accounts
The setup script creates sample accounts you can use:

- **Username**: `john_doe` | **Password**: `password123`
- **Username**: `jane_smith` | **Password**: `password123`
- **Username**: `mike_wilson` | **Password**: `password123`

### Creating Your Own Account
1. Visit `http://localhost:3000`
2. Click "Register" tab in the login modal
3. Fill in your details and create an account

### Key Features Usage

#### Creating Posts
1. Click the "Post" button in the navigation
2. Add your content (text, images, or videos)
3. Use hashtags (#example) to categorize your posts
4. Add location if desired
5. Click "Post" to share

#### Interacting with Posts
- **Like**: Click the heart icon
- **Comment**: Click the comment icon and add your thoughts
- **Share**: Use the share button (coming soon)

#### Following Users
1. Visit a user's profile
2. Click the "Follow" button
3. Their posts will appear in your feed

#### Notifications
- Real-time notifications appear in the top-right
- Click the bell icon to view all notifications
- Notifications include likes, comments, and new followers

## 🏗️ Project Structure

```
FS/PLATFORM/
├── database.js          # Database configuration and schema
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
├── .env               # Environment variables
├── setup.js           # Database initialization
├── test-api.js        # API testing suite
├── middleware/        # Custom middleware
│   ├── auth.js        # Authentication middleware
│   └── upload.js      # File upload middleware
├── routes/            # API routes
│   ├── auth.js        # Authentication routes
│   ├── users.js       # User management routes
│   ├── posts.js       # Post management routes
│   ├── comments.js    # Comment routes
│   ├── notifications.js # Notification routes
│   └── hashtags.js    # Hashtag routes
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styles
│   └── app.js         # Frontend JavaScript
└── uploads/           # User uploaded files
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users/:username` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/:username/follow` - Follow/unfollow user
- `GET /api/users/:username/followers` - Get followers
- `GET /api/users/:username/following` - Get following
- `GET /api/users/search/:query` - Search users

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/feed` - Get user feed
- `GET /api/posts/trending` - Get trending posts
- `GET /api/posts/user/:username` - Get user posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts/:id/like` - Like/unlike post
- `DELETE /api/posts/:id` - Delete post

### Comments
- `POST /api/comments` - Create comment
- `GET /api/comments/post/:postId` - Get post comments
- `GET /api/comments/:commentId/replies` - Get comment replies
- `DELETE /api/comments/:id` - Delete comment

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

### Hashtags
- `GET /api/hashtags/trending` - Get trending hashtags
- `GET /api/hashtags/:tag/posts` - Get posts by hashtag
- `GET /api/hashtags/search/:query` - Search hashtags

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: File type and size restrictions
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers for Express

## 🎨 Frontend Features

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live notifications and updates
- **Infinite Scroll**: Smooth content loading
- **Media Preview**: Image and video preview before posting
- **Toast Notifications**: User-friendly feedback messages
- **Modal System**: Clean popup interfaces
- **Search Functionality**: Real-time search with debouncing

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key
DB_NAME=social_media.sqlite
PORT=3000
```

### Production Considerations
1. Use a production database (PostgreSQL/MySQL)
2. Set up proper file storage (AWS S3, Cloudinary)
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates
5. Use process manager (PM2)
6. Configure logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify the server is running on the correct port
3. Ensure the database is properly initialized
4. Check file permissions for uploads directory

For additional help, please check the API test results or create an issue.

---

**Happy Social Networking! 🎉**