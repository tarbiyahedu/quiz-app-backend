const AssignmentLeaderboard = require("../models/assignmentLeaderboard.model");
const AssignmentQuiz = require("../models/assignmentQuiz.model");
const User = require("../models/user.model");

// GET ASSIGNMENT LEADERBOARD
const getAssignmentLeaderboard = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { attemptNumber, limit = 10 } = req.query;

    // Check if assignment exists
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user has access to this assignment
    if (req.user.role === 'student' && assignment.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Assignment not available for your department."
      });
    }

    // Build filter
    const filter = { 
      assignmentId,
      isDisqualified: false 
    };
    if (attemptNumber) filter.attemptNumber = parseInt(attemptNumber);

    // Get leaderboard
    const leaderboard = await AssignmentLeaderboard.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ finalScore: -1, submittedAt: 1 })
      .limit(parseInt(limit));

    // Format response
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId._id,
      userName: entry.userId.name,
      userEmail: entry.userId.email,
      userAvatar: entry.userId.avatar,
      score: entry.score,
      finalScore: entry.finalScore,
      accuracy: entry.accuracy,
      totalQuestions: entry.totalQuestions,
      correctAnswers: entry.correctAnswers,
      isLateSubmission: entry.isLateSubmission,
      latePenaltyApplied: entry.latePenaltyApplied,
      attemptNumber: entry.attemptNumber,
      submittedAt: entry.submittedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          id: assignment._id,
          title: assignment.title,
          isActive: assignment.isActive,
          deadline: assignment.deadline,
          allowLateSubmission: assignment.allowLateSubmission,
          lateSubmissionPenalty: assignment.lateSubmissionPenalty
        },
        leaderboard: formattedLeaderboard
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADJUST ASSIGNMENT SCORE
const adjustAssignmentScore = async (req, res) => {
  try {
    const { assignmentId, userId, attemptNumber, score, reason } = req.body;

    // Check if assignment exists
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has permission
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find leaderboard entry
    let leaderboardEntry = await AssignmentLeaderboard.findOne({
      assignmentId: assignmentId,
      userId: userId,
      attemptNumber: parseInt(attemptNumber)
    });

    if (!leaderboardEntry) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this user and attempt"
      });
    }

    // Update score
    const oldScore = leaderboardEntry.score;
    const oldFinalScore = leaderboardEntry.finalScore;
    
    leaderboardEntry.score = score;
    leaderboardEntry.finalScore = score; // Override any late penalties
    await leaderboardEntry.save();

    // Update ranks
    await updateAssignmentRanks(assignmentId);

    res.status(200).json({
      success: true,
      message: "Score adjusted successfully",
      data: {
        userId: userId,
        userName: user.name,
        attemptNumber: attemptNumber,
        oldScore: oldScore,
        oldFinalScore: oldFinalScore,
        newScore: score,
        reason: reason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DISQUALIFY ASSIGNMENT PARTICIPANT
const disqualifyAssignmentParticipant = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { userId, attemptNumber, reason } = req.body;

    // Check if assignment exists
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if user has permission
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find leaderboard entry
    let leaderboardEntry = await AssignmentLeaderboard.findOne({
      assignmentId: assignmentId,
      userId: userId,
      attemptNumber: parseInt(attemptNumber)
    });

    if (!leaderboardEntry) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this user and attempt"
      });
    }

    // Disqualify
    leaderboardEntry.isDisqualified = true;
    leaderboardEntry.disqualificationReason = reason;
    await leaderboardEntry.save();

    // Update ranks
    await updateAssignmentRanks(assignmentId);

    res.status(200).json({
      success: true,
      message: "Participant disqualified successfully",
      data: {
        userId: userId,
        userName: user.name,
        attemptNumber: attemptNumber,
        reason: reason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET USER'S ASSIGNMENT ATTEMPTS
const getUserAssignmentAttempts = async (req, res) => {
  try {
    const { assignmentId, userId } = req.params;

    // Check if assignment exists
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user has permission
    if (req.user.role === 'student' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get all attempts for this user
    const attempts = await AssignmentLeaderboard.find({
      assignmentId: assignmentId,
      userId: userId
    })
      .sort({ attemptNumber: 1 });

    res.status(200).json({
      success: true,
      data: attempts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update assignment ranks
const updateAssignmentRanks = async (assignmentId) => {
  try {
    const leaderboard = await AssignmentLeaderboard.find({ 
      assignmentId: assignmentId,
      isDisqualified: false 
    })
      .sort({ finalScore: -1, submittedAt: 1 });

    for (let i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1;
      await leaderboard[i].save();
    }
  } catch (error) {
    console.error('Error updating assignment ranks:', error);
  }
};

module.exports = {
  getAssignmentLeaderboard,
  adjustAssignmentScore,
  disqualifyAssignmentParticipant,
  getUserAssignmentAttempts
}; 