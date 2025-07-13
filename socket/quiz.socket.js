const LiveQuiz = require("../models/liveQuiz.model");
const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveQuizAnswer = require("../models/liveQuizAnswer.model");
const LiveLeaderboard = require("../models/liveLeaderboard.model");
const User = require("../models/user.model");

let io;
const participantsByQuiz = {};

const initializeSocket = (server) => {
  io = require('socket.io')(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

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

        // Broadcast quiz started
        io.to(`quiz-${quizId}`).emit('quiz-started', {
          quizId: quizId,
          startedAt: quiz.startedAt
        });

        // Update live status for admin
        io.to(`quiz-${quizId}`).emit('live_status', { 
          live: true,
          quizId: quizId 
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    };

    // Helper function to handle quiz end
    const handleEndQuiz = async (data) => {
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
        quiz.status = 'completed';
        quiz.isLive = false;
        quiz.endedAt = new Date();
        await quiz.save();

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
          endedAt: quiz.endedAt,
          leaderboard: leaderboard
        });

        // Update live status for admin
        io.to(`quiz-${quizId}`).emit('live_status', { 
          live: false,
          quizId: quizId 
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    };

    // Join live quiz room
    socket.on('join-quiz', async (data) => {
      try {
        const { quizId, userId } = data;
        
        // Verify quiz exists and is active
        const quiz = await LiveQuiz.findById(quizId);
        if (!quiz || (quiz.status !== 'live' && !quiz.isLive)) {
          socket.emit('error', { message: 'Quiz not found or not live' });
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
        socket.emit('quiz-joined', {
          quizId: quizId,
          quizTitle: quiz.title,
          status: quiz.status,
          currentQuestion: quiz.currentQuestion,
          totalQuestions: quiz.totalQuestions,
          timeLimit: quiz.timeLimit
        });

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

// Function to get socket instance
const getIO = () => {
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
