const LiveLeaderboard = require("../models/liveLeaderboard.model");
const LiveQuiz = require("../models/liveQuiz.model");
const User = require("../models/user.model");

// GET LIVE LEADERBOARD
const getLiveLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { limit = 10 } = req.query;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Check if user has access
    if (req.user && req.user.role === 'student' && req.user.department && quiz.department && quiz.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Quiz not available for your department."
      });
    }

    // Get leaderboard
    const leaderboard = await LiveLeaderboard.find({ 
      liveQuizId: quizId,
      isDisqualified: false 
    })
      .populate('userId', 'name email avatar')
      .sort({ score: -1, timeTaken: 1 })
      .limit(parseInt(limit));

    // Format response
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId._id,
      userName: entry.userId.name,
      userEmail: entry.userId.email,
      userAvatar: entry.userId.avatar,
      score: entry.score,
      accuracy: entry.accuracy,
      timeTaken: entry.timeTaken,
      totalQuestions: entry.totalQuestions,
      correctAnswers: entry.correctAnswers,
      completedAt: entry.completedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          status: quiz.status,
          isPublic: quiz.isPublic
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

// ADJUST LIVE SCORE
const adjustLiveScore = async (req, res) => {
  try {
    const { quizId, userId, score, reason } = req.body;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find or create leaderboard entry
    let leaderboardEntry = await LiveLeaderboard.findOne({
      liveQuizId: quizId,
      userId: userId
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new LiveLeaderboard({
        liveQuizId: quizId,
        userId: userId,
        score: 0,
        accuracy: 0,
        timeTaken: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0
      });
    }

    // Update score
    const oldScore = leaderboardEntry.score;
    leaderboardEntry.score = score;
    await leaderboardEntry.save();

    // Update ranks
    await updateLiveRanks(quizId);

    res.status(200).json({
      success: true,
      message: "Score adjusted successfully",
      data: {
        userId: userId,
        userName: user.name,
        oldScore: oldScore,
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

// DISQUALIFY PARTICIPANT
const disqualifyParticipant = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId, reason } = req.body;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
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
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find leaderboard entry
    let leaderboardEntry = await LiveLeaderboard.findOne({
      liveQuizId: quizId,
      userId: userId
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new LiveLeaderboard({
        liveQuizId: quizId,
        userId: userId,
        score: 0,
        accuracy: 0,
        timeTaken: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0
      });
    }

    // Disqualify
    leaderboardEntry.isDisqualified = true;
    leaderboardEntry.disqualificationReason = reason;
    await leaderboardEntry.save();

    // Update ranks
    await updateLiveRanks(quizId);

    res.status(200).json({
      success: true,
      message: "Participant disqualified successfully",
      data: {
        userId: userId,
        userName: user.name,
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

// GET PUBLIC MIXED LEADERBOARD FOR A QUIZ
const getPublicQuizLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { filter = 'all' } = req.query; // all, registered, guest

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Get all answers for this quiz
    const LiveQuizAnswer = require('../models/liveQuizAnswer.model');
    const answers = await LiveQuizAnswer.find({ liveQuizId: quizId });

    // Group by participant (userId for registered, guestName+guestEmail+guestMobile for guest)
    const participantMap = new Map();
    for (const answer of answers) {
      let key, name, type, email, mobile;
      if (answer.isGuest) {
        key = `guest:${answer.guestName || ''}:${answer.guestEmail || ''}:${answer.guestMobile || ''}`;
        name = answer.guestName || 'Guest';
        type = 'guest';
        email = answer.guestEmail;
        mobile = answer.guestMobile;
      } else {
        key = `user:${answer.userId}`;
        name = answer.userId?.name || 'User';
        type = 'registered';
        email = answer.userId?.email;
        mobile = null;
      }
      if (!participantMap.has(key)) {
        participantMap.set(key, {
          name,
          type,
          email,
          mobile,
          totalScore: 0,
          totalTime: 0,
          correctAnswers: 0,
          totalQuestions: 0
        });
      }
      const p = participantMap.get(key);
      p.totalScore += answer.score;
      p.totalTime += answer.timeTaken;
      p.totalQuestions += 1;
      if (answer.isCorrect) p.correctAnswers += 1;
    }

    // Convert to array and filter
    let participants = Array.from(participantMap.values());
    if (filter === 'registered') participants = participants.filter(p => p.type === 'registered');
    if (filter === 'guest') participants = participants.filter(p => p.type === 'guest');

    // Sort by score desc, time asc
    participants.sort((a, b) => b.totalScore - a.totalScore || a.totalTime - b.totalTime);
    // Assign rank
    participants.forEach((p, i) => { p.rank = i + 1; });

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          status: quiz.status,
          isPublic: quiz.isPublic
        },
        leaderboard: participants.map(p => ({
          name: p.name,
          type: p.type,
          email: p.email,
          mobile: p.mobile,
          score: p.totalScore,
          correctAnswers: p.correctAnswers,
          totalQuestions: p.totalQuestions,
          timeTaken: p.totalTime,
          rank: p.rank
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

module.exports = {
  getLiveLeaderboard,
  adjustLiveScore,
  disqualifyParticipant,
  getPublicQuizLeaderboard
}; 