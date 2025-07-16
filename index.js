require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const quizScheduler = require("./utils/scheduler");
require("./config/database");

const http = require("http");
const server = http.createServer(app);




// Import all route modules
const userRouter = require("./routes/user.route");
const itemRouter = require("./routes/item.route");
const departmentRouter = require("./routes/department.route");
const liveQuizRouter = require("./routes/liveQuiz.route");
const assignmentRouter = require("./routes/assignment.route");
const liveQuizQuestionRouter = require("./routes/liveQuizQuestion.route");
const liveQuizAnswerRouter = require("./routes/liveQuizAnswer.route");
const liveLeaderboardRouter = require("./routes/liveLeaderboard.route");
const assignmentQuestionRouter = require("./routes/assignmentQuestion.route");
const assignmentAnswerRouter = require("./routes/assignmentAnswer.route");
const assignmentLeaderboardRouter = require("./routes/assignmentLeaderboard.route");
const uploadRouter = require("./routes/upload.route");

// Swagger documentation setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quiz App API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for Quiz App with Live & Assignment Quiz Systems'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('client/build'));

// Socket.IO setup
const { initializeSocket } = require("./socket/quiz.socket");
const path = require("path");
initializeSocket(server);

// Basic route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API Routes with proper prefixes
app.use("/api/users", userRouter);
app.use("/api/items", itemRouter);
app.use("/api/departments", departmentRouter);

// Live Quiz System Routes
app.use("/api/live-quizzes", liveQuizRouter);
app.use("/api/live-quiz-questions", liveQuizQuestionRouter);
app.use("/api/live-quiz-answers", liveQuizAnswerRouter);
app.use("/api/live-leaderboard", liveLeaderboardRouter);

// Assignment Quiz System Routes
app.use("/api/assignments", assignmentRouter);
app.use("/api/assignment-questions", assignmentQuestionRouter);
app.use("/api/assignment-answers", assignmentAnswerRouter);
app.use("/api/assignment-leaderboard", assignmentLeaderboardRouter);

// Upload Routes
app.use("/api/upload", uploadRouter);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found!",
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Add at the top, after other requires
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Start server
// Remove or comment out the following block:
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📚 API Documentation available at: http://localhost:${PORT}/api/docs`);
  console.log(`🌐 Frontend available at: ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}`);
});

// Initialize scheduler after database connection
mongoose.connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
  // Initialize the quiz scheduler
  quizScheduler.initializeScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  quizScheduler.cleanup();
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  quizScheduler.cleanup();
  server.close(() => {
    console.log('Process terminated');
  });
});

// At the end of the file, export the app for Vercel:
module.exports = app;


