# Quiz App - Express.js Backend

A comprehensive quiz application backend built with Express.js, featuring live quizzes, assignment quizzes, user management, and real-time features powered by Socket.IO.

## 🚀 Features

### Authentication & Authorization
- **Google OAuth Integration** - Secure login with Google accounts
- **JWT-based Authentication** - Stateless token-based authentication
- **Role-based Access Control** - Admin and Student roles with different permissions
- **User Approval System** - Admins can approve student accounts

### Live Quiz System
- **Real-time Quizzes** - Live interactive quizzes with Socket.IO
- **Multiple Question Types** - MCQ, True/False, Short Answer, Long Answer, Matching
- **Live Leaderboard** - Real-time score tracking and ranking
- **Question Broadcasting** - Admins can broadcast questions to all participants
- **Answer Submission** - Real-time answer submission with scoring
- **Participant Management** - Join/leave rooms, disqualification, score adjustment

### Assignment Quiz System
- **Flexible Assignments** - Create assignments with deadlines and multiple attempts
- **Question Management** - Add, edit, delete questions with various types
- **Answer Review** - Manual review and scoring for text-based answers
- **Late Submission** - Configurable late submission with penalties
- **Attempt Tracking** - Multiple attempts with individual scoring
- **Assignment Leaderboard** - Comprehensive leaderboard with attempt history

### User & Department Management
- **User Profiles** - Complete user profiles with avatars and department association
- **Department Management** - Create and manage departments
- **User Statistics** - Track user performance and activity
- **Department-specific Quizzes** - Quizzes can be restricted to specific departments

### Item Management
- **CRUD Operations** - Full item management system
- **Category Management** - Organize items by categories
- **Statistics** - Item analytics and reporting

## 🛠️ Technology Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Google OAuth
- **Real-time Communication**: Socket.IO
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Built-in Express validation
- **CORS**: Cross-origin resource sharing enabled

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Google OAuth credentials
- npm or pnpm package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quiz-app-express-js
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/quiz-app
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # API Configuration
   API_URL=http://localhost:5000
   CLIENT_ORIGIN=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   npm start
   # or
   pnpm start
   ```

## 🌱 Database Seeding

The application automatically seeds the database with default data when it starts up. This includes:

- **Default Admin User**: `admin@quizapp.com` with password `admin123456`
- **Default Department**: "Quran Studies" department

### Manual Seeding

If you need to run the seed script manually:

```bash
npm run seed
# or
pnpm seed
```

### Default Data

The following default data is created:

#### Admin User
- **Email**: admin@quizapp.com
- **Password**: admin123456
- **Role**: admin
- **Status**: approved

#### Department
- **Name**: Quran Studies
- **Description**: Department for Quranic studies and Islamic education
- **Status**: active

> **Important**: Change the default admin password in production environments!

## 📄 API Documentation

The API documentation is available at `/api/docs` when the server is running.

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### Authentication
- `POST /users/google-login` - Google OAuth login
- `POST /users/approve/:userId` - Approve user account (Admin only)

#### Users
- `GET /users` - Get all users
- `GET /users/:userId` - Get user by ID
- `PUT /users/:userId` - Update user
- `DELETE /users/:userId` - Delete user (Admin only)

#### Departments
- `POST /departments` - Create department (Admin only)
- `GET /departments` - Get all departments
- `GET /departments/:departmentId` - Get department by ID
- `PUT /departments/:departmentId` - Update department (Admin only)
- `DELETE /departments/:departmentId` - Delete department (Admin only)

#### Live Quizzes
- `POST /live-quizzes` - Create live quiz (Admin only)
- `GET /live-quizzes` - Get all live quizzes
- `GET /live-quizzes/:quizId` - Get live quiz by ID
- `PUT /live-quizzes/:quizId` - Update live quiz (Admin only)
- `DELETE /live-quizzes/:quizId` - Delete live quiz (Admin only)

#### Live Quiz Questions
- `POST /live-quiz-questions/:quizId` - Add question to live quiz (Admin only)
- `GET /live-quiz-questions/:quizId` - Get questions for live quiz
- `PUT /live-quiz-questions/:questionId` - Update question (Admin only)
- `DELETE /live-quiz-questions/:questionId` - Delete question (Admin only)

#### Live Quiz Answers
- `POST /live-quiz-answers/submit` - Submit answer for live quiz
- `GET /live-quiz-answers/:quizId` - Get answers for live quiz (Admin only)
- `PUT /live-quiz-answers/:answerId` - Update answer (Admin only)
- `DELETE /live-quiz-answers/:answerId` - Delete answer (Admin only)

#### Live Leaderboard
- `GET /live-leaderboard/:quizId` - Get live quiz leaderboard
- `POST /live-leaderboard/adjust-score` - Adjust participant score (Admin only)
- `POST /live-leaderboard/disqualify` - Disqualify participant (Admin only)

#### Assignments
- `POST /assignments` - Create assignment (Admin only)
- `GET /assignments` - Get all assignments
- `GET /assignments/:assignmentId` - Get assignment by ID
- `PUT /assignments/:assignmentId` - Update assignment (Admin only)
- `DELETE /assignments/:assignmentId` - Delete assignment (Admin only)

#### Assignment Questions
- `POST /assignment-questions/:assignmentId` - Add question to assignment (Admin only)
- `GET /assignment-questions/:assignmentId` - Get questions for assignment
- `PUT /assignment-questions/:questionId` - Update question (Admin only)
- `DELETE /assignment-questions/:questionId` - Delete question (Admin only)

#### Assignment Answers
- `POST /assignment-answers/submit` - Submit answer for assignment
- `GET /assignment-answers/:assignmentId` - Get answers for assignment (Admin only)
- `PUT /assignment-answers/:answerId` - Update answer (Admin only)
- `DELETE /assignment-answers/:answerId` - Delete answer (Admin only)

#### Assignment Leaderboard
- `GET /assignment-leaderboard/:assignmentId` - Get assignment leaderboard
- `POST /assignment-leaderboard/adjust-score` - Adjust participant score (Admin only)
- `POST /assignment-leaderboard/disqualify` - Disqualify participant (Admin only)
- `GET /assignment-leaderboard/:assignmentId/user/:userId/attempts` - Get user attempts

#### Items
- `POST /items` - Create item (Admin only)
- `GET /items` - Get all items
- `GET /items/:itemId` - Get item by ID
- `PUT /items/:itemId` - Update item (Admin only)
- `DELETE /items/:itemId` - Delete item (Admin only)
- `GET /items/statistics` - Get item statistics (Admin only)

## 🔌 Socket.IO Events

### Client to Server
- `join-quiz` - Join a live quiz room
- `leave-quiz` - Leave a live quiz room
- `submit-answer` - Submit answer for live quiz
- `start-quiz` - Start a live quiz (Admin only)
- `end-quiz` - End a live quiz (Admin only)
- `broadcast-question` - Broadcast question to participants (Admin only)
- `request-leaderboard` - Request leaderboard update

### Server to Client
- `quiz-joined` - Confirmation of joining quiz
- `user-joined` - New user joined the quiz
- `user-left` - User left the quiz
- `new-question` - New question broadcasted
- `answer-submitted` - Confirmation of answer submission
- `answer-received` - Answer received from participant
- `quiz-started` - Quiz started
- `quiz-ended` - Quiz ended with results
- `leaderboard-update` - Updated leaderboard
- `question-timeout` - Question time limit reached
- `error` - Error message

## 🗄️ Database Schema

### User Model
- Basic info (name, email, avatar)
- Role (admin/student)
- Department reference
- Approval status
- Google OAuth fields

### Department Model
- Name and description
- Statistics and metadata

### Live Quiz Models
- LiveQuiz: Quiz configuration and status
- LiveQuizQuestion: Questions with various types
- LiveQuizAnswer: User answers and scoring
- LiveLeaderboard: Real-time rankings

### Assignment Models
- AssignmentQuiz: Assignment configuration
- AssignmentQuestion: Questions for assignments
- AssignmentAnswer: User answers with attempts
- AssignmentLeaderboard: Assignment rankings

### Item Model
- Basic item information
- Category and pricing
- Active status

## 🔒 Security Features

- **JWT Token Validation** - Secure token-based authentication
- **Role-based Access Control** - Different permissions for different roles
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Cross-origin request protection
- **Error Handling** - Secure error responses
- **User Approval System** - Controlled user access

## 🧪 Testing

To run tests (when implemented):
```bash
npm test
```

## 📦 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
```

### Deployment Platforms
- **Vercel**: Configured with `vercel.json`
- **Heroku**: Add buildpacks and environment variables
- **AWS**: Use Elastic Beanstalk or EC2
- **Docker**: Create Dockerfile for containerization

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
- Contact the development team
- Check the API documentation at `/api/docs`

## 🔄 Version History

- **v1.0.0** - Initial release with complete quiz system
- Live quiz functionality with Socket.IO
- Assignment quiz system
- User and department management
- Comprehensive API documentation

---

## 🚀 Environment Variables Setup

Create a `.env` file in your project root (not committed to git). Here are the required variables:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
API_URL=http://localhost:5000
CLIENT_ORIGIN=http://localhost:3000
PORT=5000
NODE_ENV=development
```

> **On Vercel:**
> - Go to your project → Settings → Environment Variables.
> - Add each variable above with your actual values.
> - Redeploy after saving.

---

## 🛠️ Troubleshooting

- **Missing config.js**: This project does not require a `config.js` file. All configuration is handled via environment variables.
- **Cannot read properties of undefined (reading 'MONGODB_URI')**: Ensure you have set `MONGO_URL` in your environment variables (locally in `.env`, and in Vercel dashboard for deployment).
- **.env not uploaded to Vercel**: Vercel does not upload your local `.env` file. You must manually add variables in the dashboard.

---
 
