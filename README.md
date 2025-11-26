# Habit Tracker Backend

Node.js/Express API for the Habit Tracker application with MongoDB as the
database.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the backend folder with:

```
MONGODB_URI=mongodb+srv://deepaksysoft:2msdRRbp1o6Vx3L2@deepakcluster.u8653ge.mongodb.net/habit-tracker
JWT_SECRET=your_jwt_secret_key_change_in_production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

3. Start the server:

```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/forgot-password` - Initiate password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user (requires auth)

### Habits

- `GET /api/habits` - Get all habits (requires auth)
- `POST /api/habits` - Create new habit (requires auth)
- `GET /api/habits/:habitId` - Get habit by ID (requires auth)
- `PUT /api/habits/:habitId` - Update habit (requires auth)
- `DELETE /api/habits/:habitId` - Delete habit (requires auth)
- `POST /api/habits/:habitId/complete` - Mark habit complete (requires auth)
- `POST /api/habits/:habitId/incomplete` - Mark habit incomplete (requires auth)

### Analytics

- `GET /api/analytics/summary` - Get summary stats (requires auth)
- `GET /api/analytics/weekly` - Get weekly analytics (requires auth)
- `GET /api/analytics/monthly` - Get monthly analytics (requires auth)
- `GET /api/analytics/habit/:habitId` - Get habit-specific analytics (requires
  auth)

### Profile

- `GET /api/profile` - Get user profile (requires auth)
- `PUT /api/profile` - Update user profile (requires auth)
- `PUT /api/profile/preferences` - Update preferences (requires auth)
- `POST /api/profile/change-password` - Change password (requires auth)

### Notifications

- `GET /api/notifications` - Get all notifications (requires auth)
- `GET /api/notifications/unread` - Get unread count (requires auth)
- `POST /api/notifications` - Create notification (requires auth)
- `PUT /api/notifications/:notificationId/read` - Mark as read (requires auth)
- `PUT /api/notifications/read-all` - Mark all as read (requires auth)
- `DELETE /api/notifications/:notificationId` - Delete notification (requires
  auth)

### Admin (requires admin role)

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId` - Get user by ID
- `PUT /api/admin/users/:userId/role` - Update user role
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/stats` - Get platform statistics

## Database Models

### User

- email (unique)
- password (hashed)
- firstName
- lastName
- profilePicture
- bio
- role (user/admin)
- preferences (theme, notifications, emailReminders)
- timestamps

### Habit

- userId (reference)
- name
- description
- category
- frequency (daily/weekly/monthly)
- targetDays
- color
- icon
- completions (array)
- streak
- longestStreak
- active
- timestamps

### Notification

- userId (reference)
- type (habit_reminder/streak_milestone/achievement/system)
- title
- message
- read
- relatedHabitId
- actionUrl
- timestamps

## Technologies

- Express.js - Web framework
- MongoDB - Database
- Mongoose - MongoDB ODM
- JWT - Authentication
- bcryptjs - Password hashing
