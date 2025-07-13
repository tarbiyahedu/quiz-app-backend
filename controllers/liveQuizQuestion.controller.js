const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveQuiz = require("../models/liveQuiz.model");

// ADD LIVE QUIZ QUESTION
const addLiveQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { 
      type, 
      questionText, 
      options, 
      correctAnswer, 
      correctAnswers,
      matchingPairs,
      correctSequence,
      marks, 
      imageUrl, 
      videoUrl,
      explanation, 
      timeLimit, 
      order,
      mediaQuestionType
    } = req.body;

    // Check if quiz exists and user has permission
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can add questions."
      });
    }

    // Check if quiz is active (cannot add questions to active quiz)
    if (quiz.status === 'active') {
      return res.status(400).json({
        success: false,
        message: "Cannot add questions to active quiz"
      });
    }

    // Get the next order number if not provided
    let questionOrder = order;
    if (!questionOrder) {
      const lastQuestion = await LiveQuizQuestion.findOne({ liveQuizId: quizId })
        .sort({ order: -1 });
      questionOrder = lastQuestion ? lastQuestion.order + 1 : 1;
    }

    // Validate question data based on type
    let validationError = null;
    switch (type) {
      case 'MCQ':
        if (!options || options.length < 2) {
          validationError = "MCQ questions must have at least 2 options";
        }
        if (!correctAnswer) {
          validationError = "MCQ questions must have a correct answer";
        }
        break;
      case 'TF':
        if (!correctAnswer || !['true', 'false', 'True', 'False'].includes(correctAnswer)) {
          validationError = "True/False questions must have 'true' or 'false' as correct answer";
        }
        break;
      case 'Fill':
        if (!correctAnswers || correctAnswers.length === 0) {
          validationError = "Fill in the blanks questions must have at least one correct answer";
        }
        break;
      case 'Match':
        if (!matchingPairs || matchingPairs.length === 0) {
          validationError = "Matching questions must have at least one matching pair";
        }
        break;
      case 'Ordering':
        if (!correctSequence || correctSequence.length < 2) {
          validationError = "Ordering questions must have at least 2 items in sequence";
        }
        break;
      case 'Media':
        if (!mediaQuestionType) {
          validationError = "Media questions must specify the question type";
        }
        break;
    }

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const newQuestion = new LiveQuizQuestion({
      liveQuizId: quizId,
      type,
      questionText,
      options,
      correctAnswer,
      correctAnswers,
      matchingPairs,
      correctSequence,
      marks,
      imageUrl,
      videoUrl,
      explanation,
      timeLimit: timeLimit || 60,
      order: questionOrder,
      mediaQuestionType
    });

    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: newQuestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET LIVE QUIZ QUESTIONS
const getLiveQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { type } = req.query;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Check if user has access to this quiz
    if (req.user.role === 'student' && quiz.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Quiz not available for your department."
      });
    }

    // Build filter
    const filter = { liveQuizId: quizId };
    if (type) filter.type = type;

    // Get questions
    const questions = await LiveQuizQuestion.find(filter)
      .sort({ order: 1 });

    // If student, don't send correct answers for active quizzes
    if (req.user.role === 'student' && quiz.status === 'active') {
      questions.forEach(question => {
        delete question.correctAnswer;
      });
    }

    res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE LIVE QUIZ QUESTION
const updateLiveQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { 
      type, 
      questionText, 
      options, 
      correctAnswer, 
      correctAnswers,
      matchingPairs,
      correctSequence,
      marks, 
      imageUrl, 
      videoUrl,
      explanation, 
      timeLimit, 
      order,
      mediaQuestionType
    } = req.body;

    const question = await LiveQuizQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(question.liveQuizId);
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update questions."
      });
    }

    // Check if quiz is active
    if (quiz.status === 'active') {
      return res.status(400).json({
        success: false,
        message: "Cannot update questions in active quiz"
      });
    }

    // Update fields
    if (type) question.type = type;
    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (correctAnswers !== undefined) question.correctAnswers = correctAnswers;
    if (matchingPairs !== undefined) question.matchingPairs = matchingPairs;
    if (correctSequence !== undefined) question.correctSequence = correctSequence;
    if (marks) question.marks = marks;
    if (imageUrl !== undefined) question.imageUrl = imageUrl;
    if (videoUrl !== undefined) question.videoUrl = videoUrl;
    if (explanation !== undefined) question.explanation = explanation;
    if (timeLimit) question.timeLimit = timeLimit;
    if (order) question.order = order;
    if (mediaQuestionType) question.mediaQuestionType = mediaQuestionType;

    await question.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE LIVE QUIZ QUESTION
const deleteLiveQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await LiveQuizQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(question.liveQuizId);
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can delete questions."
      });
    }

    // Check if quiz is active
    if (quiz.status === 'active') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete questions in active quiz"
      });
    }

    await LiveQuizQuestion.deleteOne({ _id: questionId });

    res.status(200).json({
      success: true,
      message: "Question deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  addLiveQuizQuestion,
  getLiveQuizQuestions,
  updateLiveQuizQuestion,
  deleteLiveQuizQuestion
}; 