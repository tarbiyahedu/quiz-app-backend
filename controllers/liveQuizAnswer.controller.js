const LiveQuizAnswer = require("../models/liveQuizAnswer.model");
const LiveQuiz = require("../models/liveQuiz.model");
const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveLeaderboard = require("../models/liveLeaderboard.model");

// SUBMIT LIVE QUIZ ANSWER
const submitLiveQuizAnswer = async (req, res) => {
  try {
    const { quizId, questionId, answerText, timeTaken } = req.body;

    // Check if quiz exists and is active
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    if (quiz.status !== 'live' && !quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not live"
      });
    }

    // Check if question exists
    const question = await LiveQuizQuestion.findById(questionId);
    if (!question || question.liveQuizId.toString() !== quizId) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has already answered this question
    const existingAnswer = await LiveQuizAnswer.findOne({
      userId: req.user._id,
      questionId: questionId
    });

    if (existingAnswer) {
      return res.status(409).json({
        success: false,
        message: "Answer already submitted for this question"
      });
    }

    // Validate answer based on question type
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
        // For text answers, mark as correct initially, will be reviewed later
        isCorrect = false;
        break;
      case 'Match':
        isCorrect = JSON.stringify(question.correctAnswer) === JSON.stringify(answerText);
        break;
      default:
        isCorrect = false;
    }

    // Calculate score
    if (isCorrect) {
      score = question.marks;
    }

    // Create answer
    const newAnswer = new LiveQuizAnswer({
      userId: req.user._id,
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
    await updateLiveLeaderboard(quizId, req.user._id);

    res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        answerId: newAnswer._id,
        isCorrect,
        score,
        timeTaken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET LIVE QUIZ ANSWERS
const getLiveQuizAnswers = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId, questionId, page = 1, limit = 10 } = req.query;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Check if user has permission (admin or quiz creator)
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build filter
    const filter = { liveQuizId: quizId };
    if (userId) filter.userId = userId;
    if (questionId) filter.questionId = questionId;

    const skip = (page - 1) * limit;

    const answers = await LiveQuizAnswer.find(filter)
      .populate('userId', 'name email')
      .populate('questionId', 'questionText type marks')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ submittedAt: -1 });

    const total = await LiveQuizAnswer.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: answers,
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

// UPDATE LIVE QUIZ ANSWER
const updateLiveQuizAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { answerText, isCorrect, score, reviewNotes } = req.body;

    const answer = await LiveQuizAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(answer.liveQuizId);
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Update fields
    if (answerText !== undefined) answer.answerText = answerText;
    if (isCorrect !== undefined) answer.isCorrect = isCorrect;
    if (score !== undefined) answer.score = score;
    if (reviewNotes !== undefined) answer.reviewNotes = reviewNotes;
    answer.reviewed = true;
    answer.reviewedBy = req.user._id;

    await answer.save();

    // Update leaderboard if score changed
    if (score !== undefined) {
      await updateLiveLeaderboard(answer.liveQuizId, answer.userId);
    }

    res.status(200).json({
      success: true,
      message: "Answer updated successfully",
      data: answer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE LIVE QUIZ ANSWER
const deleteLiveQuizAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await LiveQuizAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(answer.liveQuizId);
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await LiveQuizAnswer.deleteOne({ _id: answerId });

    // Update leaderboard
    await updateLiveLeaderboard(answer.liveQuizId, answer.userId);

    res.status(200).json({
      success: true,
      message: "Answer deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED QUIZZES FOR USER
const getCompletedQuizzesForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all live quiz answers for the user
    const liveQuizAnswers = await LiveQuizAnswer.find({ userId })
      .populate({
        path: 'liveQuizId',
        select: 'title description timeLimit department status startTime endTime',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer marks order'
      })
      .sort({ submittedAt: -1 });

    // Group answers by quiz
    const quizGroups = {};
    liveQuizAnswers.forEach(answer => {
      const quizId = answer.liveQuizId._id.toString();
      if (!quizGroups[quizId]) {
        quizGroups[quizId] = {
          quiz: answer.liveQuizId,
          answers: [],
          totalScore: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          timeTaken: 0
        };
      }
      quizGroups[quizId].answers.push(answer);
      quizGroups[quizId].totalScore += answer.score;
      quizGroups[quizId].totalQuestions += 1;
      if (answer.isCorrect) {
        quizGroups[quizId].correctAnswers += 1;
      }
      quizGroups[quizId].timeTaken += answer.timeTaken;
    });

    // Convert to array and calculate percentages
    const completedQuizzes = Object.values(quizGroups).map(group => ({
      quizId: group.quiz._id,
      title: group.quiz.title,
      description: group.quiz.description,
      type: 'Live Quiz',
      score: group.totalQuestions > 0 ? Math.round((group.totalScore / group.totalQuestions) * 100) : 0,
      totalQuestions: group.totalQuestions,
      correctAnswers: group.correctAnswers,
      timeTaken: Math.round(group.timeTaken / 60), // Convert to minutes
      completionDate: group.answers[0]?.submittedAt,
      department: group.quiz.department?.name || 'Unknown',
      answers: group.answers.sort((a, b) => a.questionId.order - b.questionId.order)
    }));

    res.status(200).json({
      success: true,
      data: completedQuizzes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED QUIZ DETAILS FOR USER
const getCompletedQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    // Get all answers for this specific quiz and user
    const answers = await LiveQuizAnswer.find({ 
      userId, 
      liveQuizId: quizId 
    })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer marks order imageUrl videoUrl'
      })
      .populate({
        path: 'liveQuizId',
        select: 'title description timeLimit department startTime endTime',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ 'questionId.order': 1 });

    if (answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No completed quiz found"
      });
    }

    const quiz = answers[0].liveQuizId;
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    const totalTimeTaken = answers.reduce((sum, answer) => sum + answer.timeTaken, 0);

    const quizDetails = {
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      type: 'Live Quiz',
      score: answers.length > 0 ? Math.round((totalScore / answers.length) * 100) : 0,
      totalQuestions: answers.length,
      correctAnswers,
      timeTaken: Math.round(totalTimeTaken / 60), // Convert to minutes
      completionDate: answers[0]?.submittedAt,
      department: quiz.department?.name || 'Unknown',
      answers: answers.map(answer => ({
        questionId: answer.questionId._id,
        questionText: answer.questionId.questionText,
        questionType: answer.questionId.type,
        questionOptions: answer.questionId.options,
        correctAnswer: answer.questionId.correctAnswer,
        userAnswer: answer.answerText,
        isCorrect: answer.isCorrect,
        score: answer.score,
        marks: answer.questionId.marks,
        order: answer.questionId.order,
        imageUrl: answer.questionId.imageUrl,
        videoUrl: answer.questionId.videoUrl,
        timeTaken: answer.timeTaken
      }))
    };

    res.status(200).json({
      success: true,
      data: quizDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED QUIZ DETAILS FOR ADMIN
const getCompletedQuizDetailsForAdmin = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Check if user has permission (admin or quiz creator)
    if (quiz.createdBy._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get all questions for this quiz
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId })
      .sort({ order: 1 });

    // Get all answers for this quiz
    const answers = await LiveQuizAnswer.find({ liveQuizId: quizId })
      .populate('userId', 'name email department')
      .populate('questionId', 'questionText type options correctAnswer marks order imageUrl videoUrl')
      .sort({ 'questionId.order': 1, 'userId.name': 1 });

    // Get leaderboard data
    const leaderboard = await LiveLeaderboard.find({ liveQuizId: quizId })
      .populate('userId', 'name email department')
      .sort({ totalScore: -1, totalTime: 1 });

    // Group answers by user
    const userAnswers = {};
    answers.forEach(answer => {
      const userId = answer.userId._id.toString();
      if (!userAnswers[userId]) {
        userAnswers[userId] = {
          user: answer.userId,
          answers: [],
          totalScore: 0,
          correctAnswers: 0,
          totalTime: 0
        };
      }
      userAnswers[userId].answers.push(answer);
      userAnswers[userId].totalScore += answer.score;
      if (answer.isCorrect) {
        userAnswers[userId].correctAnswers += 1;
      }
      userAnswers[userId].totalTime += answer.timeTaken || 0;
    });

    // Calculate quiz statistics
    const totalParticipants = Object.keys(userAnswers).length;
    const totalQuestions = questions.length;
    const totalPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);
    
    // Calculate average scores and accuracy
    let totalQuizScore = 0;
    let totalCorrectAnswers = 0;
    Object.values(userAnswers).forEach(userData => {
      totalQuizScore += userData.totalScore;
      totalCorrectAnswers += userData.correctAnswers;
    });

    const averageScore = totalParticipants > 0 ? totalQuizScore / totalParticipants : 0;
    const averageAccuracy = totalParticipants > 0 ? (totalCorrectAnswers / (totalParticipants * totalQuestions)) * 100 : 0;

    // Prepare question-wise statistics
    const questionStats = questions.map(question => {
      const questionAnswers = answers.filter(a => a.questionId._id.toString() === question._id.toString());
      const correctCount = questionAnswers.filter(a => a.isCorrect).length;
      const accuracy = questionAnswers.length > 0 ? (correctCount / questionAnswers.length) * 100 : 0;
      
      return {
        questionId: question._id,
        questionText: question.questionText,
        type: question.type,
        marks: question.marks,
        order: question.order,
        imageUrl: question.imageUrl,
        videoUrl: question.videoUrl,
        correctAnswer: question.correctAnswer,
        options: question.options,
        totalAnswers: questionAnswers.length,
        correctAnswers: correctCount,
        accuracy: Math.round(accuracy * 100) / 100
      };
    });

    const quizDetails = {
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      department: quiz.department?.name || 'Unknown',
      createdBy: quiz.createdBy?.name || 'Unknown',
      status: quiz.status,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      timeLimit: quiz.timeLimit,
      
      // Statistics
      totalParticipants,
      totalQuestions,
      totalPossibleScore,
      averageScore: Math.round(averageScore * 100) / 100,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      
      // Data
      questions: questionStats,
      participants: Object.values(userAnswers).map(userData => ({
        userId: userData.user._id,
        name: userData.user.name,
        email: userData.user.email,
        department: userData.user.department?.name || 'Unknown',
        totalScore: userData.totalScore,
        correctAnswers: userData.correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((userData.correctAnswers / totalQuestions) * 100 * 100) / 100 : 0,
        totalTime: Math.round(userData.totalTime / 60), // Convert to minutes
        answers: userData.answers.map(answer => ({
          questionId: answer.questionId._id,
          questionText: answer.questionId.questionText,
          questionType: answer.questionId.type,
          userAnswer: answer.answerText,
          isCorrect: answer.isCorrect,
          score: answer.score,
          marks: answer.questionId.marks,
          timeTaken: answer.timeTaken,
          submittedAt: answer.submittedAt
        }))
      })),
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId._id,
        name: entry.userId.name,
        email: entry.userId.email,
        department: entry.userId.department?.name || 'Unknown',
        totalScore: entry.totalScore,
        totalTime: Math.round(entry.totalTime / 60), // Convert to minutes
        correctAnswers: entry.correctAnswers,
        totalQuestions: entry.totalQuestions
      }))
    };

    res.status(200).json({
      success: true,
      data: quizDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL COMPLETED QUIZZES FOR USER (LIVE + ASSIGNMENT)
const getAllCompletedQuizzesForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all live quiz answers for the user
    const liveQuizAnswers = await LiveQuizAnswer.find({ userId })
      .populate({
        path: 'liveQuizId',
        select: 'title description timeLimit department status startTime endTime',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer marks order'
      })
      .sort({ submittedAt: -1 });

    // Get all assignment answers for the user
    const AssignmentAnswer = require('../models/assignmentAnswer.model');
    const assignmentAnswers = await AssignmentAnswer.find({ userId })
      .populate({
        path: 'assignmentId',
        select: 'title description timeLimit department status',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer marks order'
      })
      .sort({ submittedAt: -1 });

    // Group live quiz answers by quiz
    const liveQuizGroups = {};
    liveQuizAnswers.forEach(answer => {
      const quizId = answer.liveQuizId._id.toString();
      if (!liveQuizGroups[quizId]) {
        liveQuizGroups[quizId] = {
          quiz: answer.liveQuizId,
          answers: [],
          totalScore: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          timeTaken: 0
        };
      }
      liveQuizGroups[quizId].answers.push(answer);
      liveQuizGroups[quizId].totalScore += answer.score;
      liveQuizGroups[quizId].totalQuestions += 1;
      if (answer.isCorrect) {
        liveQuizGroups[quizId].correctAnswers += 1;
      }
      liveQuizGroups[quizId].timeTaken += answer.timeTaken;
    });

    // Group assignment answers by assignment
    const assignmentGroups = {};
    assignmentAnswers.forEach(answer => {
      const assignmentId = answer.assignmentId._id.toString();
      if (!assignmentGroups[assignmentId]) {
        assignmentGroups[assignmentId] = {
          assignment: answer.assignmentId,
          answers: [],
          totalScore: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          timeTaken: 0
        };
      }
      assignmentGroups[assignmentId].answers.push(answer);
      assignmentGroups[assignmentId].totalScore += answer.score;
      assignmentGroups[assignmentId].totalQuestions += 1;
      if (answer.isCorrect) {
        assignmentGroups[assignmentId].correctAnswers += 1;
      }
    });

    // Convert live quizzes to array
    const completedLiveQuizzes = Object.values(liveQuizGroups).map(group => ({
      id: group.quiz._id,
      title: group.quiz.title,
      description: group.quiz.description,
      type: 'Live Quiz',
      score: group.totalQuestions > 0 ? Math.round((group.totalScore / group.totalQuestions) * 100) : 0,
      totalQuestions: group.totalQuestions,
      correctAnswers: group.correctAnswers,
      timeTaken: Math.round(group.timeTaken / 60), // Convert to minutes
      completionDate: group.answers[0]?.submittedAt,
      department: group.quiz.department?.name || 'Unknown',
      category: group.quiz.department?.name || 'Unknown'
    }));

    // Convert assignments to array
    const completedAssignments = Object.values(assignmentGroups).map(group => ({
      id: group.assignment._id,
      title: group.assignment.title,
      description: group.assignment.description,
      type: 'Assignment Quiz',
      score: group.totalQuestions > 0 ? Math.round((group.totalScore / group.totalQuestions) * 100) : 0,
      totalQuestions: group.totalQuestions,
      correctAnswers: group.correctAnswers,
      timeTaken: 0, // Assignment answers don't track time
      completionDate: group.answers[0]?.submittedAt,
      department: group.assignment.department?.name || 'Unknown',
      category: group.assignment.department?.name || 'Unknown'
    }));

    // Combine and sort by completion date
    const allCompletedQuizzes = [...completedLiveQuizzes, ...completedAssignments]
      .sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));

    res.status(200).json({
      success: true,
      data: allCompletedQuizzes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update leaderboard
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
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

// Helper function to update ranks
const updateLiveRanks = async (quizId) => {
  try {
    const leaderboard = await LiveLeaderboard.find({ liveQuizId: quizId })
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
  submitLiveQuizAnswer,
  getLiveQuizAnswers,
  updateLiveQuizAnswer,
  deleteLiveQuizAnswer,
  getCompletedQuizzesForUser,
  getCompletedQuizDetails,
  getAllCompletedQuizzesForUser,
  getCompletedQuizDetailsForAdmin
}; 