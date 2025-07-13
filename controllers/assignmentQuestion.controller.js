const AssignmentQuestion = require("../models/assignmentQuestion.model");
const AssignmentQuiz = require("../models/assignmentQuiz.model");

// ADD ASSIGNMENT QUESTION
const addAssignmentQuestion = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { 
      type, 
      questionText, 
      options, 
      correctAnswer, 
      marks, 
      imageUrl, 
      explanation, 
      order,
      isRequired,
      wordLimit 
    } = req.body;

    // Check if assignment exists and user has permission
    const assignment = await AssignmentQuiz.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can add questions."
      });
    }

    // Get the next order number if not provided
    let questionOrder = order;
    if (!questionOrder) {
      const lastQuestion = await AssignmentQuestion.findOne({ assignmentId })
        .sort({ order: -1 });
      questionOrder = lastQuestion ? lastQuestion.order + 1 : 1;
    }

    const newQuestion = new AssignmentQuestion({
      assignmentId,
      type,
      questionText,
      options,
      correctAnswer,
      marks,
      imageUrl,
      explanation,
      order: questionOrder,
      isRequired: isRequired !== undefined ? isRequired : true,
      wordLimit
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

// GET ASSIGNMENT QUESTIONS
const getAssignmentQuestions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { type } = req.query;

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
    const filter = { assignmentId };
    if (type) filter.type = type;

    // Get questions
    const questions = await AssignmentQuestion.find(filter)
      .sort({ order: 1 });

    // If student, don't send correct answers
    if (req.user.role === 'student') {
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

// UPDATE ASSIGNMENT QUESTION
const updateAssignmentQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { 
      type, 
      questionText, 
      options, 
      correctAnswer, 
      marks, 
      imageUrl, 
      explanation, 
      order,
      isRequired,
      wordLimit 
    } = req.body;

    const question = await AssignmentQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has permission
    const assignment = await AssignmentQuiz.findById(question.assignmentId);
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update questions."
      });
    }

    // Update fields
    if (type) question.type = type;
    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (marks) question.marks = marks;
    if (imageUrl !== undefined) question.imageUrl = imageUrl;
    if (explanation !== undefined) question.explanation = explanation;
    if (order) question.order = order;
    if (isRequired !== undefined) question.isRequired = isRequired;
    if (wordLimit !== undefined) question.wordLimit = wordLimit;

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

// DELETE ASSIGNMENT QUESTION
const deleteAssignmentQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await AssignmentQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has permission
    const assignment = await AssignmentQuiz.findById(question.assignmentId);
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can delete questions."
      });
    }

    await AssignmentQuestion.deleteOne({ _id: questionId });

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
  addAssignmentQuestion,
  getAssignmentQuestions,
  updateAssignmentQuestion,
  deleteAssignmentQuestion
}; 