# CodeBattle Backend

A comprehensive backend API for the CodeBattle real-time coding competition platform. Built with Node.js, Express, Socket.IO, and MongoDB.

## 🚀 Features

- **Real-time Battles**: WebSocket-based real-time coding competitions
- **User Authentication**: JWT-based authentication with secure password hashing
- **Room Management**: Create, join, and manage battle rooms
- **Problem System**: Comprehensive coding problem management with multiple difficulties
- **Code Execution**: Mock code execution system (extensible to real sandboxed execution)
- **Leaderboards**: Global and category-based ranking systems
- **Match History**: Complete battle history and statistics
- **Friend System**: Add friends and invite to battles
- **Chat System**: Real-time chat in battle rooms
- **Spectator Mode**: Watch ongoing battles
- **Statistics Tracking**: Detailed user performance metrics

## 🛠 Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator
- **Development**: nodemon, Docker

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB 7.0 or higher
- Redis 7.0 or higher (optional, for caching)
- Docker & Docker Compose (optional, for containerized setup)

## 🔧 Installation & Setup

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Option 2: Docker Compose (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - Backend API (port 5000)
   - MongoDB (port 27017)
   - Redis (port 6379)
   - Mongo Express Admin UI (port 8081)

2. **View logs**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── socket/            # Socket.IO handlers
│   └── utils/             # Utility functions
├── config/                # Configuration files
├── scripts/               # Database scripts
├── .env                   # Environment variables
├── .env.example          # Environment template
├── docker-compose.yml    # Docker services
├── Dockerfile            # Container definition
├── package.json          # Dependencies
└── server.js             # Entry point
```

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /verify` - Verify JWT token

### Users (`/api/users`)
- `GET /:userId/stats` - Get user statistics
- `GET /:userId/matches` - Get user match history
- `GET /:userId/achievements` - Get user achievements
- `GET /me/friends` - Get friends list
- `POST /me/friends/request` - Send friend request
- `POST /me/friends/accept` - Accept friend request
- `POST /me/friends/reject` - Reject friend request
- `DELETE /me/friends/:friendId` - Remove friend

### Rooms (`/api/rooms`)
- `GET /` - Get public rooms
- `GET /:roomId` - Get room details
- `POST /` - Create room
- `PUT /:roomId/settings` - Update room settings
- `POST /:roomId/join` - Join room
- `POST /:roomId/leave` - Leave room
- `GET /:roomId/chat` - Get room chat
- `DELETE /:roomId` - Delete room

### Problems (`/api/problems`)
- `GET /` - Get all problems
- `GET /:slug` - Get problem by slug
- `GET /category/:category` - Get problems by category
- `GET /random/:difficulty` - Get random problem
- `GET /search/:query` - Search problems
- `POST /:problemId/rate` - Rate problem
- `GET /meta/categories` - Get problem categories
- `GET /meta/tags` - Get popular tags

### Battles (`/api/battles`)
- `GET /` - Get all matches
- `GET /:matchId` - Get match details
- `GET /user/:userId` - Get user's match history
- `GET /me/history` - Get current user's matches
- `POST /test-code` - Test code submission
- `GET /active/list` - Get active battles
- `GET /stats/overview` - Get battle statistics

### Leaderboard (`/api/leaderboard`)
- `GET /` - Get global leaderboard
- `GET /rank/:rank` - Get user by rank
- `GET /category/:category` - Get category leaderboard
- `GET /rookies` - Get rookie leaderboard
- `GET /stats/overview` - Get leaderboard stats
- `GET /position/:userId` - Get user's position

## 🔌 Socket.IO Events

### Room Events
- `room:create` - Create a new room
- `room:join` - Join existing room
- `room:leave` - Leave room
- `room:toggle-ready` - Toggle ready status
- `room:list` - Get room list
- `room:get` - Get room details

### Battle Events
- `battle:submit` - Submit code during battle
- `battle:status` - Get battle status
- `battle:spectate` - Join as spectator
- `battle:get-live-code` - Get participant's live code

### Chat Events
- `chat:message` - Send chat message
- `chat:history` - Get chat history
- `chat:typing` - Send typing indicator

### User Events
- `user:update-status` - Update user status
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `code:update` - Update live code

## 🗄 Database Models

### User Model
- Authentication (email, password, JWT)
- Profile information (username, avatar, bio)
- Statistics (rating, wins, losses, rank)
- Friends and friend requests
- Achievements and progress

### Room Model
- Room configuration and settings
- Participants and their status
- Chat messages
- Battle state and results
- Spectators

### Problem Model
- Problem details and description
- Test cases and examples
- Starter code for multiple languages
- Statistics and ratings
- Solutions and hints

### Match Model
- Battle results and analytics
- Participant performance
- Code submissions
- Time tracking
- Rankings

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request rate limiting
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable CORS policies
- **Helmet Security**: Security headers middleware
- **Environment Variables**: Sensitive data protection

## 🚀 Deployment

### Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/codebattle

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# Optional services
REDIS_URL=redis://localhost:6379
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-judge0-api-key
```

### Production Deployment

1. **Build and run with Docker**
   ```bash
   docker build -t codebattle-backend .
   docker run -p 5000:5000 --env-file .env codebattle-backend
   ```

2. **Or deploy to cloud platforms**
   - Heroku, Railway, Render
   - AWS ECS, Google Cloud Run
   - DigitalOcean App Platform

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 📝 API Documentation

The API follows RESTful conventions with JSON responses. All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "pagination": { ... }  // For paginated endpoints
}
```

### Error Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ]  // Validation errors
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**CodeBattle Backend** - Powering real-time coding competitions! 🚀