const LiveQuiz = require("../models/liveQuiz.model");
const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveQuizAnswer = require("../models/liveQuizAnswer.model");
const LiveLeaderboard = require("../models/liveLeaderboard.model");
const User = require("../models/user.model");

let io;
const participantsByQuiz = {};
const quizTimers = {}; // Store timers for each quiz
const quizStatus = {}; // Store real-time status for each quiz

// Helper function to update ranks
const updateLiveRanks = async (quizId) => {
  try {
    const leaderboard = await LiveLeaderboard.find({ 
      liveQuizId: quizId,
      isDisqualified: false 
    })
      .sort({ score: -1, timeTaken: 1 });

    for (let i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1;
      await leaderboard[i].save();
    }
  } catch (error) {
    console.error('Error updating ranks:', error);
  }
};

// Timer update interval for all active quizzes
const startTimerUpdates = () => {
  return setInterval(() => {
    Object.keys(quizStatus).forEach(quizId => {
      const status = quizStatus[quizId];
      if (status && status.isLive && status.startedAt && status.timeLimit) {
        const elapsed = Math.floor((new Date().getTime() - new Date(status.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, (status.timeLimit * 60) - elapsed);
        
        // Broadcast timer update to all participants
        if (io) {
          io.to(`quiz-${quizId}`).emit('timer-update', {
            quizId: quizId,
            remaining: remaining,
            total: status.timeLimit * 60,
            startedAt: status.startedAt
          });
        }
        
        // Auto-end quiz when time runs out
        if (remaining <= 0 && quizTimers[quizId]) {
          clearTimeout(quizTimers[quizId]);
          delete quizTimers[quizId];
          handleEndQuiz({ quizId });
        }
      }
    });
  }, 1000); // Update every second
};

// Start timer updates when socket is initialized
let timerInterval;

const initializeSocket = (server) => {
  io = require('socket.io')(server, {
    cors: {
      // origin: "https://tarbiyah-live-quiz-app.vercel.app",
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Start timer updates
  if (!timerInterval) {
    timerInterval = startTimerUpdates();
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Helper function to handle quiz start
    const handleStartQuiz = async (data) => {
      try {
        const { quizId } = data;
        const userId = socket.userId;

        // Verify user is quiz creator or admin
        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz || (quiz.createdBy.toString() !== userId && socket.userRole !== 'admin')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Update quiz status
        quiz.status = 'live';
        quiz.isLive = true;
        quiz.startedAt = new Date();
        await quiz.save();

        // Set quiz status in memory
        quizStatus[quizId] = {
          isLive: true,
          startedAt: quiz.startedAt,
          timeLimit: quiz.timeLimit,
          currentQuestion: null,
          participants: participantsByQuiz[quizId] || []
        };

        // Start quiz timer if timeLimit is set
        if (quiz.timeLimit && !quizTimers[quizId]) {
          quizTimers[quizId] = setTimeout(() => {
            handleEndQuiz({ quizId });
          }, quiz.timeLimit * 60 * 1000); // Convert minutes to milliseconds
        }

        // Broadcast quiz started
        io.to(`quiz-${quizId}`).emit('quiz-started', {
          quizId: quizId,
          startedAt: quiz.startedAt,
          timeLimit: quiz.timeLimit
        });

        // Update live status for all participants
        io.to(`quiz-${quizId}`).emit('live_status', { 
          live: true,
          quizId: quizId,
          startedAt: quiz.startedAt,
          timeLimit: quiz.timeLimit
        });

        // Broadcast timer start
        if (quiz.timeLimit) {
          io.to(`quiz-${quizId}`).emit('timer-started', {
            quizId: quizId,
            timeLimit: quiz.timeLimit,
            startedAt: quiz.startedAt
          });
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    };

    // Helper function to handle quiz end
    const handleEndQuiz = async (data) => {
      try {
        const { quizId } = data;
        const userId = socket.userId;

        // Verify user is quiz creator or admin (unless it's a timer-based end)
        if (userId) {
          const quiz = await LiveQuiz.findById(quizId);
          if (!quiz || (quiz.createdBy.toString() !== userId && socket.userRole !== 'admin')) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }
        }

        // Clear timer if exists
        if (quizTimers[quizId]) {
          clearTimeout(quizTimers[quizId]);
          delete quizTimers[quizId];
        }

        // Update quiz status
        const quiz = await LiveQuiz.findById(quizId);
        if (quiz) {
          quiz.status = 'completed';
          quiz.isLive = false;
          quiz.endedAt = new Date();
          await quiz.save();
        }

        // Update quiz status in memory
        quizStatus[quizId] = {
          isLive: false,
          endedAt: new Date(),
          participants: participantsByQuiz[quizId] || []
        };

        // Get final leaderboard
        const leaderboard = await LiveLeaderboard.find({ 
          liveQuizId: quizId,
          isDisqualified: false 
        })
          .populate('userId', 'name email avatar')
          .sort({ score: -1, timeTaken: 1 })
          .limit(10);

        // Broadcast quiz ended with results
        io.to(`quiz-${quizId}`).emit('quiz-ended', {
          quizId: quizId,
          endedAt: new Date(),
          leaderboard: leaderboard,
          reason: userId ? 'admin_ended' : 'time_expired'
        });

        // Update live status for all participants
        io.to(`quiz-${quizId}`).emit('live_status', { 
          live: false,
          quizId: quizId,
          endedAt: new Date(),
          reason: userId ? 'admin_ended' : 'time_expired'
        });

        // Broadcast timer end
        io.to(`quiz-${quizId}`).emit('timer-ended', {
          quizId: quizId,
          endedAt: new Date(),
          reason: userId ? 'admin_ended' : 'time_expired'
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    };

    // Handle timer status requests
    socket.on("request-timer-status", async (data) => {
      try {
        const { quizId } = data;
        console.log(`Timer status requested for quiz: ${quizId}`);

        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz) {
          socket.emit("error", { message: "Quiz not found" });
          return;
        }

        if (!quiz.isLive || !quiz.startedAt) {
          socket.emit("timer-status", { 
            remaining: 0, 
            total: quiz.timeLimit * 60,
            isLive: false 
          });
          return;
        }

        const now = new Date();
        const startTime = new Date(quiz.startedAt);
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, (quiz.timeLimit * 60) - elapsed);

        console.log(`Timer status for quiz ${quizId}: ${remaining}s remaining`);

        socket.emit("timer-status", {
          remaining: remaining,
          total: quiz.timeLimit * 60,
          isLive: quiz.isLive,
          startedAt: quiz.startedAt
        });

      } catch (error) {
        console.error("Error handling timer status request:", error);
        socket.emit("error", { message: "Failed to get timer status" });
      }
    });

    // Handle quiz join
    socket.on('join-quiz', async (data) => {
      try {
        const { quizId, userId } = data;
        
        // Verify quiz exists and is active
        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz) {
          socket.emit('error', { message: 'Quiz not found' });
          return;
        }

        // Check if quiz is live or can be joined
        if (quiz.status !== 'live' && !quiz.isLive) {
          socket.emit('quiz-not-live', { 
            message: 'Quiz is not currently live',
            status: quiz.status,
            isLive: quiz.isLive
          });
          return;
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Join the quiz room
        socket.join(`quiz-${quizId}`);
        socket.quizId = quizId;
        socket.userId = userId;
        socket.userRole = user.role;

        // Track participant in memory (only for students)
        if (user.role === 'student') {
          if (!participantsByQuiz[quizId]) participantsByQuiz[quizId] = [];
          if (!participantsByQuiz[quizId].some(p => p.userId === userId)) {
            participantsByQuiz[quizId].push({ userId, name: user.name, avatar: user.avatar });
          }
          // Emit updated participant list to room
          io.to(`quiz-${quizId}`).emit('participant_list', participantsByQuiz[quizId]);

          // Emit user joined event
          socket.to(`quiz-${quizId}`).emit('user-joined', {
            userId: userId,
            userName: user.name,
            timestamp: new Date()
          });
        }

        // Send current quiz state
        const currentStatus = quizStatus[quizId] || {
          isLive: quiz.isLive,
          startedAt: quiz.startedAt,
          timeLimit: quiz.timeLimit,
          currentQuestion: quiz.currentQuestion
        };

        socket.emit('quiz-joined', {
          quizId: quizId,
          quizTitle: quiz.title,
          status: quiz.status,
          currentQuestion: quiz.currentQuestion,
          totalQuestions: quiz.totalQuestions,
          timeLimit: quiz.timeLimit,
          isLive: currentStatus.isLive,
          startedAt: currentStatus.startedAt,
          participants: participantsByQuiz[quizId] || []
        });

        // Send timer status if quiz is live
        if (currentStatus.isLive && currentStatus.startedAt && currentStatus.timeLimit) {
          const elapsed = Math.floor((new Date().getTime() - new Date(currentStatus.startedAt).getTime()) / 1000);
          const remaining = Math.max(0, (currentStatus.timeLimit * 60) - elapsed);
          
          socket.emit('timer-status', {
            quizId: quizId,
            remaining: remaining,
            total: currentStatus.timeLimit * 60,
            startedAt: currentStatus.startedAt
          });
        }

        console.log(`User ${user.name} (${user.role}) joined quiz ${quizId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Admin join live quiz (for admin dashboard)
    socket.on('join_live_quiz', async (data) => {
      try {
        const { quizId, user } = data;
        
        // Verify quiz exists
        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz) {
          socket.emit('error', { message: 'Quiz not found' });
          return;
        }

        // Verify user is admin
        const dbUser = await User.findById(user.id);
        if (!dbUser || dbUser.role !== 'admin') {
          socket.emit('error', { message: 'Access denied. Admin only.' });
          return;
        }

        // Join the quiz room
        socket.join(`quiz-${quizId}`);
        socket.quizId = quizId;
        socket.userId = user.id;
        socket.userRole = 'admin';

        // Send current participant list to admin
        const currentParticipants = participantsByQuiz[quizId] || [];
        socket.emit('participant_list', currentParticipants);

        // Send quiz status
        socket.emit('live_status', { 
          live: quiz.status === 'live' || quiz.isLive,
          quizId: quizId 
        });

        console.log(`Admin ${user.name} joined quiz ${quizId} dashboard`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Leave quiz room
    socket.on('leave-quiz', (data) => {
      const { quizId, userId } = data;
      socket.leave(`quiz-${quizId}`);
      
      // Remove participant from memory (only for students)
      if (socket.userRole === 'student' && participantsByQuiz[quizId]) {
        participantsByQuiz[quizId] = participantsByQuiz[quizId].filter(p => p.userId !== userId);
        io.to(`quiz-${quizId}`).emit('participant_list', participantsByQuiz[quizId]);
      }

      socket.to(`quiz-${quizId}`).emit('user-left', {
        userId: userId,
        timestamp: new Date()
      });

      delete socket.quizId;
      delete socket.userId;
      delete socket.userRole;
    });

    // Submit answer
    socket.on('submit-answer', async (data) => {
      try {
        const { quizId, questionId, answerText, timeTaken } = data;
        const userId = socket.userId;

        if (!userId || !quizId || !questionId) {
          socket.emit('error', { message: 'Missing required data' });
          return;
        }

        // Check if quiz is still live
        const currentStatus = quizStatus[quizId];
        if (!currentStatus || !currentStatus.isLive) {
          socket.emit('quiz-ended', { 
            message: 'Quiz has ended. Cannot submit answers.',
            reason: 'time_expired'
          });
          return;
        }

        // Check if answer already submitted
        const existingAnswer = await LiveQuizAnswer.findOne({
          userId: userId,
          questionId: questionId
        });

        if (existingAnswer) {
          socket.emit('error', { message: 'Answer already submitted' });
          return;
        }

        // Get question details
        const question = await LiveQuizQuestion.findById(questionId);
        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        // Validate answer and calculate score
        let isCorrect = false;
        let score = 0;

        switch (question.type) {
          case 'MCQ':
            isCorrect = question.correctAnswer === answerText;
            break;
          case 'TF':
            isCorrect = question.correctAnswer.toString().toLowerCase() === answerText.toString().toLowerCase();
            break;
          case 'Short':
          case 'Long':
            isCorrect = false; // Will be reviewed later
            break;
          case 'Match':
            isCorrect = JSON.stringify(question.correctAnswer) === JSON.stringify(answerText);
            break;
        }

        if (isCorrect) {
          score = question.marks;
        }

        // Create answer
        const newAnswer = new LiveQuizAnswer({
          userId: userId,
          liveQuizId: quizId,
          questionId: questionId,
          answerText,
          submittedAt: new Date(),
          timeTaken,
          isCorrect,
          score
        });

        await newAnswer.save();

        // Update leaderboard
        await updateLiveLeaderboard(quizId, userId);

        // Emit answer submitted
        socket.emit('answer-submitted', {
          answerId: newAnswer._id,
          isCorrect,
          score,
          timeTaken
        });

        // Broadcast to quiz creator/admin
        socket.to(`quiz-${quizId}`).emit('answer-received', {
          userId: userId,
          questionId: questionId,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Request quiz status
    socket.on('request-quiz-status', async (data) => {
      try {
        const { quizId } = data;
        const currentStatus = quizStatus[quizId];
        
        if (currentStatus) {
          socket.emit('quiz-status', {
            quizId: quizId,
            isLive: currentStatus.isLive,
            startedAt: currentStatus.startedAt,
            endedAt: currentStatus.endedAt,
            timeLimit: currentStatus.timeLimit,
            participants: currentStatus.participants || []
          });
        } else {
          // Fallback to database
          const quiz = await LiveQuiz.findById(quizId);
          if (quiz) {
            socket.emit('quiz-status', {
              quizId: quizId,
              isLive: quiz.isLive,
              startedAt: quiz.startedAt,
              endedAt: quiz.endedAt,
              timeLimit: quiz.timeLimit,
              status: quiz.status
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Start quiz (admin/creator only) - handle both event names
    socket.on('start-quiz', async (data) => {
      await handleStartQuiz(data);
    });

    socket.on('start_live_quiz', async (data) => {
      await handleStartQuiz(data);
    });

    // End quiz (admin/creator only) - handle both event names
    socket.on('end-quiz', async (data) => {
      await handleEndQuiz(data);
    });

    socket.on('end_live_quiz', async (data) => {
      await handleEndQuiz(data);
    });

    // Broadcast question (admin/creator only)
    socket.on('broadcast-question', async (data) => {
      try {
        const { quizId, questionId } = data;
        const userId = socket.userId;

        // Verify user is quiz creator or admin
        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz || (quiz.createdBy.toString() !== userId && socket.userRole !== 'admin')) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Get question details
        const question = await LiveQuizQuestion.findById(questionId);
        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        // Update quiz current question
        quiz.currentQuestion = questionId;
        await quiz.save();

        // Prepare question data (without correct answer for students)
        const questionData = {
          id: question._id,
          type: question.type,
          questionText: question.questionText,
          options: question.options,
          marks: question.marks,
          imageUrl: question.imageUrl,
          timeLimit: question.timeLimit || quiz.timeLimit
        };

        // Broadcast question to all participants
        io.to(`quiz-${quizId}`).emit('new-question', {
          quizId: quizId,
          question: questionData,
          timestamp: new Date()
        });

        // Start timer if specified
        if (question.timeLimit) {
          setTimeout(() => {
            io.to(`quiz-${quizId}`).emit('question-timeout', {
              questionId: questionId,
              timestamp: new Date()
            });
          }, question.timeLimit * 1000);
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Request leaderboard update
    socket.on('request-leaderboard', async (data) => {
      try {
        const { quizId } = data;

        const leaderboard = await LiveLeaderboard.find({ 
          liveQuizId: quizId,
          isDisqualified: false 
        })
          .populate('userId', 'name email avatar')
          .sort({ score: -1, timeTaken: 1 })
          .limit(10);

        socket.emit('leaderboard-update', {
          quizId: quizId,
          leaderboard: leaderboard,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.quizId && socket.userId) {
        // Remove participant from memory (only for students)
        if (socket.userRole === 'student' && participantsByQuiz[socket.quizId]) {
          participantsByQuiz[socket.quizId] = participantsByQuiz[socket.quizId].filter(p => p.userId !== socket.userId);
          io.to(`quiz-${socket.quizId}`).emit('participant_list', participantsByQuiz[socket.quizId]);
        }
        socket.to(`quiz-${socket.quizId}`).emit('user-disconnected', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

// Helper function to update live leaderboard
const updateLiveLeaderboard = async (quizId, userId) => {
  try {
    // Get all answers for this user in this quiz
    const answers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: userId
    });

    // Calculate totals
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const totalTime = answers.reduce((sum, answer) => sum + answer.timeTaken, 0);
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Update or create leaderboard entry
    await LiveLeaderboard.findOneAndUpdate(
      { liveQuizId: quizId, userId: userId },
      {
        score: totalScore,
        accuracy: accuracy,
        timeTaken: totalTime,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update ranks for all participants
    await updateLiveRanks(quizId);

    // Broadcast updated leaderboard
    if (io) {
      const leaderboard = await LiveLeaderboard.find({ 
        liveQuizId: quizId,
        isDisqualified: false 
      })
        .populate('userId', 'name email avatar')
        .sort({ score: -1, timeTaken: 1 })
        .limit(10);

      io.to(`quiz-${quizId}`).emit('leaderboard-update', {
        quizId: quizId,
        leaderboard: leaderboard,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

// Function to get socket instance
const getIO = () => {
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
