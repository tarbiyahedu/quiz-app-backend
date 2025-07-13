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
    const { title, department, timeLimit, maxParticipants, description, totalQuestions, mode } = req.body;

    // Validation for required fields
    if (!title || !department) {
      return res.status(400).json({ success: false, message: 'Quiz title and department are required.' });
    }

    const newLiveQuiz = new LiveQuiz({
      title,
      department,
      timeLimit,
      maxParticipants,
      description,
      totalQuestions,
      mode,
      createdBy: req.user._id,
      status: 'draft', // Create quiz in draft status
      isLive: false
    });

    await newLiveQuiz.save();

    const populatedQuiz = await LiveQuiz.findById(newLiveQuiz._id)
      .populate('department', 'name')
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
    const { department, status, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;

    // If user is student, only show quizzes from their department
    if (req.user.role === 'student') {
      filter.department = req.user.department;
    }

    const skip = (page - 1) * limit;
    
    const quizzes = await LiveQuiz.find(filter)
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await LiveQuiz.countDocuments(filter);

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
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // For students, only allow access to live quizzes
    if (req.user.role === 'student') {
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

// UPDATE LIVE QUIZ
const updateLiveQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, department, timeLimit, maxParticipants, status, isPublic, description, totalQuestions, mode } = req.body;

    const quiz = await LiveQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Only creator or admin can update
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update this quiz."
      });
    }

    // Update fields
    if (title) quiz.title = title;
    if (department) quiz.department = department;
    if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
    if (maxParticipants !== undefined) quiz.maxParticipants = maxParticipants;
    if (status) quiz.status = status;
    if (isPublic !== undefined) quiz.isPublic = isPublic;
    if (description !== undefined) quiz.description = description;
    if (totalQuestions !== undefined) quiz.totalQuestions = totalQuestions;
    if (mode) quiz.mode = mode;

    await quiz.save();

    const updatedQuiz = await LiveQuiz.findById(id)
      .populate('department', 'name')
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
    if (!user.department) {
      return res.status(400).json({ success: false, message: "No department assigned to user. Please contact admin or update your profile." });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ success: false, message: "Only students can access this endpoint." });
    }
    const departmentId = req.query.department || user.department;
    let deptId;
    if (typeof departmentId === 'string') {
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        deptId = new mongoose.Types.ObjectId(departmentId);
      } else {
        console.error('Invalid departmentId string for ObjectId conversion:', departmentId);
        return res.status(400).json({ success: false, message: 'Invalid department ID.' });
      }
    } else if (departmentId && departmentId._bsontype === 'ObjectID') {
      deptId = departmentId;
    } else {
      console.error('departmentId is not a string or ObjectId:', departmentId);
      return res.status(400).json({ success: false, message: 'Invalid department ID.' });
    }
    // Find all live quizzes for department (robust match)
    const quizzes = await require('../models/liveQuiz.model').find({
      $and: [
        { $or: [{ status: 'live' }, { isLive: true }] },
        { department: deptId }
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
  getAvailableLiveQuizzesForStudent
}; 