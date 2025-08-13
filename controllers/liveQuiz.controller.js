const LiveQuiz = require("../models/liveQuiz.model");
const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveQuizAnswer = require("../models/liveQuizAnswer.model");
const Department = require("../models/department.model");
const User = require("../models/user.model");
const quizScheduler = require("../utils/scheduler");
const mongoose = require('mongoose');

// CREATE LIVE QUIZ
const createLiveQuiz = async (req, res) => {
  try {

    const { title, departments, maxParticipants, description, totalQuestions, mode, isPublic } = req.body;

    // Validation for required fields
    if (!title || !departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ success: false, message: 'Quiz title and at least one department are required.' });
    }

    const newLiveQuiz = new LiveQuiz({
      title,
      departments,
      maxParticipants,
      description,
      totalQuestions,
      mode,
      createdBy: req.user._id,
      status: 'draft', // Create quiz in draft status
      isLive: false,
      isPublic: typeof isPublic === 'boolean' ? isPublic : false
    });

    await newLiveQuiz.save();

    const populatedQuiz = await LiveQuiz.findById(newLiveQuiz._id)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Live quiz created successfully",
      data: populatedQuiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL LIVE QUIZZES
const getAllLiveQuizzes = async (req, res) => {
  try {
    console.log('getAllLiveQuizzes called');
    console.log('Request user:', req.user);
    console.log('Request query:', req.query);
    const { department, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (department) filter.departments = department;
    if (status) filter.status = status;

    // If user is student, show quizzes from all their departments
    if (req.user && req.user.role === 'student') {
      if (req.user.departments && Array.isArray(req.user.departments) && req.user.departments.length > 0) {
        filter.departments = { $in: req.user.departments };
      }
    }

    const skip = (page - 1) * limit;

    const quizzes = await LiveQuiz.find(filter)
      .populate('departments', 'name')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await LiveQuiz.countDocuments(filter);

    console.log('Quizzes found:', quizzes.length);
    res.status(200).json({
      success: true,
      data: quizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.log('Error in getAllLiveQuizzes:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ONE LIVE QUIZ
const getOneLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // For students, only allow access to live quizzes
    if (req.user && req.user.role === 'student') {
      if (quiz.status !== 'live' && !quiz.isLive) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only live quizzes can be accessed by students."
        });
      }
      // Remove the department restriction - allow students to join any live quiz
      // if (quiz.department.toString() !== req.user.department.toString()) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "Access denied. Quiz not available for your department."
      //   });
      // }
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET PUBLIC LIVE QUIZ (for guest users)
const getPublicLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // For public access, allow access to live quizzes or quizzes marked as public
    // Temporarily allow access to all quizzes for testing
    if (!quiz.isPublic && !quiz.isLive && quiz.status !== 'live') {
      return res.status(403).json({
        success: false,
        message: "Access denied. This quiz is not available for public access."
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET LIVE QUIZ BY CODE
// GUEST JOIN PUBLIC LIVE QUIZ
const guestJoinLiveQuiz = async (req, res) => {
  try {
    const { quizId, name, contact } = req.body;
    if (!quizId || !name || !contact) {
      return res.status(400).json({ success: false, message: 'Quiz ID, guest name, and contact are required.' });
    }
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz || !quiz.isPublic || !quiz.isLive) {
      return res.status(403).json({ success: false, message: 'Quiz is not available for guest participation.' });
    }
    // Create guest user (no password)
    const guestUser = new User({
      name,
      number: contact,
      email: contact.includes('@') ? contact : undefined,
      isGuest: true,
      role: 'guest',
      approved: true
    });
    await guestUser.save();
    // Emit socket event for live participant update
    if (req.app && req.app.get('io')) {
      req.app.get('io').to(quizId).emit('participant-joined', { user: guestUser, role: 'guest' });
    }
    return res.status(201).json({ success: true, message: 'Guest joined quiz.', guestId: guestUser._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GUEST SUBMIT ANSWER
const guestSubmitAnswer = async (req, res) => {
  try {
    const { quizId, guestId, questionId, answer } = req.body;
    if (!quizId || !guestId || !questionId || !answer) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    // Validate quiz and guest
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz || !quiz.isPublic || !quiz.isLive) {
      return res.status(403).json({ success: false, message: 'Quiz is not available.' });
    }
    const guestUser = await User.findById(guestId);
    if (!guestUser || !guestUser.isGuest) {
      return res.status(403).json({ success: false, message: 'Invalid guest.' });
    }
    // Save answer
    const liveAnswer = new LiveQuizAnswer({
      liveQuizId: quizId,
      userId: guestId,
      questionId,
      answer
    });
    await liveAnswer.save();
    return res.status(201).json({ success: true, message: 'Answer submitted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GUEST GET RESULTS
const guestGetResults = async (req, res) => {
  try {
    const { quizId, guestId } = req.query;
    if (!quizId || !guestId) {
      return res.status(400).json({ success: false, message: 'Quiz ID and guest ID required.' });
    }
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz || !quiz.isPublic) {
      return res.status(403).json({ success: false, message: 'Quiz is not public.' });
    }
    const guestUser = await User.findById(guestId);
    if (!guestUser || !guestUser.isGuest) {
      return res.status(403).json({ success: false, message: 'Invalid guest.' });
    }
    // Fetch answers and results
    const answers = await LiveQuizAnswer.find({ liveQuizId: quizId, userId: guestId });
    // Optionally, calculate score, etc.
    return res.status(200).json({ success: true, answers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const getLiveQuizByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const quiz = await LiveQuiz.findOne({ code: code.toUpperCase() })
      .populate('departments', 'name')
      .populate('createdBy', 'name email');
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Live quiz not found with this code'
      });
    }
    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE LIVE QUIZ
const updateLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, department, maxParticipants, status, isPublic, description, totalQuestions, mode } = req.body;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can update
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update this quiz."
      });
    }

    // Update fields
    if (title) quiz.title = title;
    if (department) quiz.department = department;
    if (maxParticipants !== undefined) quiz.maxParticipants = maxParticipants;
    if (status) quiz.status = status;
    if (isPublic !== undefined) quiz.isPublic = isPublic;
    if (description !== undefined) quiz.description = description;
    if (totalQuestions !== undefined) quiz.totalQuestions = totalQuestions;
    if (mode) quiz.mode = mode;

    await quiz.save();

    const updatedQuiz = await LiveQuiz.findById(id)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: "Live quiz updated successfully",
      data: updatedQuiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE LIVE QUIZ
const deleteLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can delete
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can delete this quiz."
      });
    }

    // Check if quiz is active
    if (quiz.status === 'active') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete active quiz. Please end it first."
      });
    }

    // Delete related data
    await LiveQuizQuestion.deleteMany({ liveQuizId: id });
    await LiveQuizAnswer.deleteMany({ liveQuizId: id });
    await LiveQuiz.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Live quiz deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// START LIVE QUIZ
const startLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can start
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can start this quiz."
      });
    }

    if (quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Quiz is already live"
      });
    }

    if (quiz.status !== 'draft' && quiz.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: "Quiz can only be started from draft or completed status"
      });
    }

    // Check if quiz has questions
    const questionCount = await LiveQuizQuestion.countDocuments({ liveQuizId: id });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot start quiz without questions"
      });
    }

    const now = new Date();
    quiz.status = 'live';
    quiz.isLive = true;
    quiz.startTime = now;
    quiz.endTime = null;
    
    // Add to live history
    quiz.liveHistory.push({
      startedAt: now,
      endedAt: null,
      duration: 0
    });

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Live quiz started successfully",
      data: {
        id: quiz._id,
        status: quiz.status,
        isLive: quiz.isLive,
        startTime: quiz.startTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// END LIVE QUIZ
const endLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can end
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can end this quiz."
      });
    }

    if (!quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not currently live"
      });
    }

    const now = new Date();
    quiz.status = 'completed';
    quiz.isLive = false;
    quiz.endTime = now;
    
    // Update the last live history entry
    if (quiz.liveHistory.length > 0) {
      const lastSession = quiz.liveHistory[quiz.liveHistory.length - 1];
      lastSession.endedAt = now;
      lastSession.duration = Math.round((now - lastSession.startedAt) / (1000 * 60)); // Duration in minutes
    }

    await quiz.save();

    res.status(200).json({
      success: true,
      message: "Live quiz ended successfully",
      data: {
        id: quiz._id,
        status: quiz.status,
        isLive: quiz.isLive,
        endTime: quiz.endTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// SCHEDULE LIVE QUIZ
const scheduleLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { liveStartAt, liveEndAt } = req.body;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can schedule
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can schedule this quiz."
      });
    }

    if (quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule a quiz that is currently live"
      });
    }

    // Validate dates
    const startDate = new Date(liveStartAt);
    const endDate = new Date(liveEndAt);
    const now = new Date();

    if (startDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Start time must be in the future"
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time"
      });
    }

    // Check if quiz has questions
    const questionCount = await LiveQuizQuestion.countDocuments({ liveQuizId: id });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot schedule quiz without questions"
      });
    }

    quiz.status = 'scheduled';
    quiz.liveStartAt = startDate;
    quiz.liveEndAt = endDate;
    quiz.mode = 'scheduled';

    await quiz.save();

    // Schedule the quiz using the scheduler service
    quizScheduler.scheduleQuiz(quiz);

    res.status(200).json({
      success: true,
      message: "Live quiz scheduled successfully",
      data: {
        id: quiz._id,
        status: quiz.status,
        liveStartAt: quiz.liveStartAt,
        liveEndAt: quiz.liveEndAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// CANCEL SCHEDULED QUIZ
const cancelScheduledQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can cancel
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can cancel this quiz."
      });
    }

    if (quiz.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: "Quiz is not scheduled"
      });
    }

    quiz.status = 'draft';
    quiz.liveStartAt = null;
    quiz.liveEndAt = null;
    quiz.mode = 'live';

    await quiz.save();

    // Cancel scheduled jobs
    quizScheduler.cancelQuizJobs(id);

    res.status(200).json({
      success: true,
      message: "Scheduled quiz cancelled successfully",
      data: {
        id: quiz._id,
        status: quiz.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUBLISH LIVE QUIZ RESULTS
const publishLiveQuizResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can publish results
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can publish results."
      });
    }

    quiz.isPublic = isPublic;
    await quiz.save();

    res.status(200).json({
      success: true,
      message: `Results ${isPublic ? 'published' : 'unpublished'} successfully`,
      data: {
        id: quiz._id,
        isPublic: quiz.isPublic
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available live quizzes for a student (not completed, by department)
const getAvailableLiveQuizzesForStudent = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await require('../models/user.model').findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, message: "Only students can access this endpoint." });
    }

    // Get user's departments
    let userDepartments = [];
    if (user.departments && user.departments.length > 0) {
      userDepartments = user.departments;
    } else if (user.department) {
      // Fallback to old department field for backward compatibility
      userDepartments = [user.department];
    }

    if (userDepartments.length === 0) {
      return res.status(400).json({ success: false, message: "No department assigned to user. Please contact admin or update your profile." });
    }

    // Find all live quizzes for user's departments
    const quizzes = await require('../models/liveQuiz.model').find({
      $and: [
        { $or: [{ status: 'live' }, { isLive: true }] },
        { department: { $in: userDepartments } }
      ]
    });

    // Find quizzes already completed by the student
    const LiveQuizAnswer = require('../models/liveQuizAnswer.model');
    const completed = await LiveQuizAnswer.find({ userId: userId }).distinct('liveQuizId');
    
    // Filter out completed quizzes
    const available = quizzes.filter(q => !completed.map(id => id.toString()).includes(q._id.toString()));
    
    res.status(200).json({ success: true, data: available });
  } catch (err) {
    console.error('Error in getAvailableLiveQuizzesForStudent:', err, err && err.stack ? err.stack : '');
    res.status(500).json({ success: false, message: err && err.message ? err.message : String(err) });
  }
};

// GET QUIZ STATISTICS FOR ADMIN
const getQuizStatistics = async (req, res) => {
  try {
    const { status, department, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const skip = (page - 1) * limit;
    
    const quizzes = await LiveQuiz.find(filter)
      .populate('departments', 'name')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get statistics for each quiz
    const quizzesWithStats = await Promise.all(quizzes.map(async (quiz) => {
      // Get all questions for this quiz
      const questions = await LiveQuizQuestion.find({ liveQuizId: quiz._id });
      const questionCount = questions.length;
      const totalPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);

      // Get all participants (unique users who answered at least one question)
      const participants = await LiveQuizAnswer.distinct('userId', { liveQuizId: quiz._id });
      const participantCount = participants.length;

      // Get all answers for this quiz
      const answers = await LiveQuizAnswer.find({ liveQuizId: quiz._id })
        .populate('userId', 'name email')
        .populate('questionId', 'marks');

      // Calculate average score
      let totalScore = 0;
      let totalAnswers = 0;
      const userScores = {};

      answers.forEach(answer => {
        let userKey;
        if (answer.userId && answer.userId._id) {
          userKey = answer.userId._id.toString();
        } else if (answer.isGuest) {
          // Use guestName + guestEmail + answer._id as a unique key
          userKey = `guest:${answer.guestName || 'Unknown'}:${answer.guestEmail || ''}:${answer._id}`;
        } else {
          // Fallback for any other case
          userKey = `unknown:${answer._id}`;
        }
        if (!userScores[userKey]) {
          userScores[userKey] = {
            totalScore: 0,
            totalPossibleScore: 0,
            answers: 0
          };
        }
        userScores[userKey].totalScore += answer.score;
        userScores[userKey].totalPossibleScore += answer.questionId.marks;
        userScores[userKey].answers += 1;
        totalAnswers++;
      });

      // Calculate average score across all participants
      const userAverageScores = Object.values(userScores).map(userScore => 
        userScore.totalPossibleScore > 0 ? (userScore.totalScore / userScore.totalPossibleScore) * 100 : 0
      );
      
      const averageScore = userAverageScores.length > 0 
        ? Math.round(userAverageScores.reduce((sum, score) => sum + score, 0) / userAverageScores.length)
        : 0;

      return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        departments: quiz.departments,
        createdBy: quiz.createdBy,
        status: quiz.status,
        timeLimit: quiz.timeLimit,
        maxParticipants: quiz.maxParticipants,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
        // Statistics
        participantCount,
        questionCount,
        totalPossibleScore,
        averageScore,
        totalAnswers
      };
    }));

    const total = await LiveQuiz.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: quizzesWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add a new public endpoint to get all public quizzes
const getAllPublicLiveQuizzes = async (req, res) => {
  try {
    const quizzes = await LiveQuiz.find({ isPublic: true, status: { $in: ['live', 'scheduled'] } })
      .populate('departments', 'name')
      .populate('createdBy', 'name email');
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLiveQuiz,
  getAllLiveQuizzes,
  getOneLiveQuiz,
  updateLiveQuiz,
  deleteLiveQuiz,
  startLiveQuiz,
  endLiveQuiz,
  scheduleLiveQuiz,
  cancelScheduledQuiz,
  publishLiveQuizResults,
  getAvailableLiveQuizzesForStudent,
  getQuizStatistics,
  getLiveQuizByCode,
  getAllPublicLiveQuizzes,
  getPublicLiveQuiz,
  guestJoinLiveQuiz,
  guestSubmitAnswer,
  guestGetResults
}; 