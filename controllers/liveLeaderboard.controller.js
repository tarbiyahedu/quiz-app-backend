// Excel export for quiz results
const exportResultsExcel = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    // Get leaderboard data
    let leaderboard = [];
    try {
      const mockReq = { params: { quizId }, query: {} };
      let leaderboardData;
      await getPublicQuizLeaderboard(mockReq, {
        status: () => ({
          json: (d) => {
            leaderboardData = d;
            return d;
          }
        })
      });
      leaderboard = leaderboardData?.data?.leaderboard || [];
    } catch (err) {
      leaderboard = [];
    }
    // Generate Excel file
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Quiz Results');
    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Correct', key: 'correctAnswers', width: 10 },
      { header: 'Total', key: 'totalQuestions', width: 10 },
      { header: 'Time (s)', key: 'timeTaken', width: 10 }
    ];
    leaderboard.forEach(p => {
      sheet.addRow({
        rank: p.rank,
        name: p.name,
        type: p.type,
        score: p.score,
        correctAnswers: p.correctAnswers,
        totalQuestions: p.totalQuestions,
        timeTaken: p.timeTaken
      });
    });
    // Style header
    sheet.getRow(1).font = { bold: true };
    // Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="quiz_${quizId}_results.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// GET COMPLETED PUBLIC QUIZZES FOR LEADERBOARD
const getCompletedPublicQuizzes = async (req, res) => {
  try {
    console.log('[Backend] GET /api/live-leaderboard/public-completed called');
    console.log('[Backend] Request query:', req.query);
    const quizzes = await LiveQuiz.find({
      isPublic: true,
      status: 'completed'
    }).select('_id title description endTime');
    console.log(`[Backend] Completed public quizzes count: ${quizzes.length}`);
    if (quizzes.length > 0) {
      quizzes.forEach((quiz, idx) => {
        console.log(`[Backend] Quiz ${idx + 1}:`, quiz);
      });
    } else {
      console.log('[Backend] No completed public quizzes found.');
    }
    res.status(200).json({ success: true, data: quizzes });
  } catch (err) {
    console.error('[Backend] Error fetching completed public quizzes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch public completed quizzes' });
  }
};
// Puppeteer-based PDF export for quiz results
let puppeteer, chromium;
try {
  chromium = require('chrome-aws-lambda');
  puppeteer = require('puppeteer-core');
} catch (e) {
  puppeteer = require('puppeteer');
}
const exportResultsPDF = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    // Get leaderboard data
    let leaderboard = [];
    try {
      // Call getPublicQuizLeaderboard and extract leaderboard array
      const mockReq = { params: { quizId }, query: {} };
      let leaderboardData;
      await getPublicQuizLeaderboard(mockReq, {
        status: () => ({
          json: (d) => {
            leaderboardData = d;
            return d;
          }
        })
      });
      leaderboard = leaderboardData?.data?.leaderboard || [];
    } catch (err) {
      leaderboard = [];
    }

    // Build HTML template for results
    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Quiz Results PDF</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f8f9fa; color: #222; }
          h1 { color: #0E2647; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background: #0E2647; color: #fff; }
          tr:nth-child(even) { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Quiz Results: ${quiz.title}</h1>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Type</th>
              <th>Score</th>
              <th>Correct</th>
              <th>Total</th>
              <th>Time (s)</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboard.map(p => `
              <tr>
                <td>${p.rank}</td>
                <td>${p.name}</td>
                <td>${p.type}</td>
                <td>${p.score}</td>
                <td>${p.correctAnswers}</td>
                <td>${p.totalQuestions}</td>
                <td>${p.timeTaken}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Use Playwright for PDF generation (Vercel/serverless compatible)
    const { chromium } = require('playwright');
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      // Inject Google fonts for Bangla and Arabic
      await page.setContent(`
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Quiz Results PDF</title>
          <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            body { font-family: 'Hind Siliguri', 'Amiri', Arial, Helvetica, sans-serif; background: #f8f9fa; color: #222; }
            h1 { color: #0E2647; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background: #0E2647; color: #fff; }
            tr:nth-child(even) { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Quiz Results: ${quiz.title}</h1>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Type</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Total</th>
                <th>Time (s)</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboard.map(p => `
                <tr>
                  <td>${p.rank}</td>
                  <td>${p.name}</td>
                  <td>${p.type}</td>
                  <td>${p.score}</td>
                  <td>${p.correctAnswers}</td>
                  <td>${p.totalQuestions}</td>
                  <td>${p.timeTaken}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quiz_${quizId}_results.pdf"`);
      res.end(pdfBuffer);
    } catch (err) {
      console.error('PDF Export Error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  } catch (err) {
    console.error('PDF Export Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
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
  getCompletedPublicQuizzes,
  getLiveLeaderboard,
  adjustLiveScore,
  disqualifyParticipant,
  getPublicQuizLeaderboard,
  exportResultsPDF
};