const AssignmentAnswer = require("../models/assignmentAnswer.model");
const AssignmentQuiz = require("../models/assignmentQuiz.model");
const AssignmentQuestion = require("../models/assignmentQuestion.model");
const AssignmentLeaderboard = require("../models/assignmentLeaderboard.model");

// SUBMIT ASSIGNMENT ANSWER
const submitAssignmentAnswer = async (req, res) => {
  try {
    const { assignmentId, questionId, answerText, attemptNumber = 1 } = req.body;

    // Check if assignment exists and is active
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    if (!assignment.isActive) {
      return res.status(400).json({
        success: false,
        message: "Assignment is not active"
      });
    }

    // Check if assignment is within deadline
    const now = new Date();
    if (now < assignment.releaseDate) {
      return res.status(400).json({
        success: false,
        message: "Assignment has not been released yet"
      });
    }

    if (now > assignment.deadline && !assignment.allowLateSubmission) {
      return res.status(400).json({
        success: false,
        message: "Assignment deadline has passed"
      });
    }

    // Check if question exists
    const question = await AssignmentQuestion.findById(questionId);
    if (!question || question.assignmentId.toString() !== assignmentId) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has already answered this question in this attempt
    const existingAnswer = await AssignmentAnswer.findOne({
      userId: req.user._id,
      questionId: questionId,
      attemptNumber: attemptNumber
    });

    if (existingAnswer) {
      return res.status(409).json({
        success: false,
        message: "Answer already submitted for this question in this attempt"
      });
    }

    // Check if user has exceeded max attempts
    const attemptCount = await AssignmentAnswer.distinct('attemptNumber', {
      userId: req.user._id,
      assignmentId: assignmentId
    });

    if (attemptCount.length >= assignment.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: "Maximum attempts exceeded"
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

    // Check if submission is late
    const isLateSubmission = now > assignment.deadline;
    let latePenaltyApplied = 0;

    if (isLateSubmission && assignment.allowLateSubmission) {
      latePenaltyApplied = (score * assignment.lateSubmissionPenalty) / 100;
      score = Math.max(0, score - latePenaltyApplied);
    }

    // Create answer
    const newAnswer = new AssignmentAnswer({
      userId: req.user._id,
      assignmentId: assignmentId,
      questionId: questionId,
      answerText,
      submittedAt: now,
      attemptNumber,
      isCorrect,
      score,
      isLateSubmission,
      latePenaltyApplied
    });

    await newAnswer.save();

    // Update leaderboard
    await updateAssignmentLeaderboard(assignmentId, req.user._id, attemptNumber);

    res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        answerId: newAnswer._id,
        isCorrect,
        score,
        isLateSubmission,
        latePenaltyApplied
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ASSIGNMENT ANSWERS
const getAssignmentAnswers = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { userId, questionId, attemptNumber, page = 1, limit = 10 } = req.query;

    // Check if assignment exists
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user has permission (admin or assignment creator)
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build filter
    const filter = { assignmentId };
    if (userId) filter.userId = userId;
    if (questionId) filter.questionId = questionId;
    if (attemptNumber) filter.attemptNumber = parseInt(attemptNumber);

    const skip = (page - 1) * limit;

    const answers = await AssignmentAnswer.find(filter)
      .populate('userId', 'name email')
      .populate('questionId', 'questionText type marks')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ submittedAt: -1 });

    const total = await AssignmentAnswer.countDocuments(filter);

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

// UPDATE ASSIGNMENT ANSWER
const updateAssignmentAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { answerText, isCorrect, score, reviewNotes } = req.body;

    const answer = await AssignmentAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const assignment = await AssignmentQuiz.findById(answer.assignmentId);
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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
      await updateAssignmentLeaderboard(answer.assignmentId, answer.userId, answer.attemptNumber);
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

// DELETE ASSIGNMENT ANSWER
const deleteAssignmentAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await AssignmentAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const assignment = await AssignmentQuiz.findById(answer.assignmentId);
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await AssignmentAnswer.deleteOne({ _id: answerId });

    // Update leaderboard
    await updateAssignmentLeaderboard(answer.assignmentId, answer.userId, answer.attemptNumber);

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

// GET COMPLETED ASSIGNMENT QUIZZES FOR USER
const getCompletedAssignmentQuizzesForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all assignment answers for the user
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

    // Group answers by assignment
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
      // Note: Assignment answers might not have timeTaken, so we'll use 0
    });

    // Convert to array and calculate percentages
    const completedAssignments = Object.values(assignmentGroups).map(group => ({
      assignmentId: group.assignment._id,
      title: group.assignment.title,
      description: group.assignment.description,
      type: 'Assignment Quiz',
      score: group.totalQuestions > 0 ? Math.round((group.totalScore / group.totalQuestions) * 100) : 0,
      totalQuestions: group.totalQuestions,
      correctAnswers: group.correctAnswers,
      timeTaken: group.timeTaken || 0,
      completionDate: group.answers[0]?.submittedAt,
      department: group.assignment.department?.name || 'Unknown',
      answers: group.answers.sort((a, b) => a.questionId.order - b.questionId.order)
    }));

    res.status(200).json({
      success: true,
      data: completedAssignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED ASSIGNMENT QUIZ DETAILS FOR USER
const getCompletedAssignmentQuizDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user._id;

    // Get all answers for this specific assignment and user
    const answers = await AssignmentAnswer.find({ 
      userId, 
      assignmentId: assignmentId 
    })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer marks order imageUrl videoUrl'
      })
      .populate({
        path: 'assignmentId',
        select: 'title description timeLimit department',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ 'questionId.order': 1 });

    if (answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No completed assignment found"
      });
    }

    const assignment = answers[0].assignmentId;
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;

    const assignmentDetails = {
      assignmentId: assignment._id,
      title: assignment.title,
      description: assignment.description,
      type: 'Assignment Quiz',
      score: answers.length > 0 ? Math.round((totalScore / answers.length) * 100) : 0,
      totalQuestions: answers.length,
      correctAnswers,
      timeTaken: 0, // Assignment answers don't track time
      completionDate: answers[0]?.submittedAt,
      department: assignment.department?.name || 'Unknown',
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
        timeTaken: 0
      }))
    };

    res.status(200).json({
      success: true,
      data: assignmentDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update assignment leaderboard
const updateAssignmentLeaderboard = async (assignmentId, userId, attemptNumber) => {
  try {
    // Get all answers for this user in this assignment for this attempt
    const answers = await AssignmentAnswer.find({
      assignmentId: assignmentId,
      userId: userId,
      attemptNumber: attemptNumber
    });

    // Calculate totals
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Get assignment details for late penalty calculation
    const assignment = await AssignmentQuiz.findById(assignmentId);
    const isLateSubmission = answers.some(answer => answer.isLateSubmission);
    let finalScore = totalScore;

    if (isLateSubmission && assignment.allowLateSubmission) {
      const latePenalty = (totalScore * assignment.lateSubmissionPenalty) / 100;
      finalScore = Math.max(0, totalScore - latePenalty);
    }

    // Update or create leaderboard entry
    await AssignmentLeaderboard.findOneAndUpdate(
      { 
        assignmentId: assignmentId, 
        userId: userId,
        attemptNumber: attemptNumber
      },
      {
        score: totalScore,
        finalScore: finalScore,
        accuracy: accuracy,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        isLateSubmission: isLateSubmission,
        latePenaltyApplied: totalScore - finalScore,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update ranks for all participants
    await updateAssignmentRanks(assignmentId);
  } catch (error) {
    console.error('Error updating assignment leaderboard:', error);
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
  submitAssignmentAnswer,
  getAssignmentAnswers,
  updateAssignmentAnswer,
  deleteAssignmentAnswer,
  getCompletedAssignmentQuizzesForUser,
  getCompletedAssignmentQuizDetails
}; 