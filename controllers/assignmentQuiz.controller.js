const AssignmentQuiz = require("../models/assignmentQuiz.model");
const AssignmentQuestion = require("../models/assignmentQuestion.model");
const AssignmentAnswer = require("../models/assignmentAnswer.model");
const AssignmentLeaderboard = require("../models/assignmentLeaderboard.model");

// CREATE ASSIGNMENT QUIZ
const createAssignmentQuiz = async (req, res) => {
  try {
    const { 
      title, 
      department, 
      releaseDate, 
      deadline, 
      totalMarks, 
      timeLimit, 
      description, 
      instructions,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxAttempts 
    } = req.body;

    const newAssignment = new AssignmentQuiz({
      title,
      department,
      releaseDate,
      deadline,
      totalMarks,
      timeLimit,
      description,
      instructions,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxAttempts,
      createdBy: req.user._id
    });

    await newAssignment.save();

    const populatedAssignment = await AssignmentQuiz.findById(newAssignment._id)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Assignment quiz created successfully",
      data: populatedAssignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL ASSIGNMENT QUIZZES
const getAllAssignmentQuizzes = async (req, res) => {
  try {
    const { department, isActive, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive;

    // If user is student, only show assignments from their department
    if (req.user.role === 'student') {
      filter.department = req.user.department;
    }

    const skip = (page - 1) * limit;
    
    const assignments = await AssignmentQuiz.find(filter)
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AssignmentQuiz.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: assignments,
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

// GET ONE ASSIGNMENT QUIZ
const getOneAssignmentQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await AssignmentQuiz.findById(id)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment quiz not found"
      });
    }

    // Check if student can access this assignment
    if (req.user.role === 'student' && assignment.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Assignment not available for your department."
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE ASSIGNMENT QUIZ
const updateAssignmentQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      department, 
      releaseDate, 
      deadline, 
      totalMarks, 
      timeLimit, 
      description, 
      instructions,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxAttempts,
      isActive 
    } = req.body;

    const assignment = await AssignmentQuiz.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment quiz not found"
      });
    }

    // Only creator or admin can update
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update this assignment."
      });
    }

    // Update fields
    if (title) assignment.title = title;
    if (department) assignment.department = department;
    if (releaseDate) assignment.releaseDate = releaseDate;
    if (deadline) assignment.deadline = deadline;
    if (totalMarks !== undefined) assignment.totalMarks = totalMarks;
    if (timeLimit !== undefined) assignment.timeLimit = timeLimit;
    if (description !== undefined) assignment.description = description;
    if (instructions !== undefined) assignment.instructions = instructions;
    if (allowLateSubmission !== undefined) assignment.allowLateSubmission = allowLateSubmission;
    if (lateSubmissionPenalty !== undefined) assignment.lateSubmissionPenalty = lateSubmissionPenalty;
    if (maxAttempts !== undefined) assignment.maxAttempts = maxAttempts;
    if (isActive !== undefined) assignment.isActive = isActive;

    await assignment.save();

    const updatedAssignment = await AssignmentQuiz.findById(id)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: "Assignment quiz updated successfully",
      data: updatedAssignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE ASSIGNMENT QUIZ
const deleteAssignmentQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await AssignmentQuiz.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment quiz not found"
      });
    }

    // Only creator or admin can delete
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can delete this assignment."
      });
    }

    // Check if assignment has submissions
    const submissionCount = await AssignmentAnswer.countDocuments({ assignmentId: id });
    if (submissionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete assignment. ${submissionCount} submission(s) exist.`
      });
    }

    // Delete related data
    await AssignmentQuestion.deleteMany({ assignmentId: id });
    await AssignmentLeaderboard.deleteMany({ assignmentId: id });
    await AssignmentQuiz.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Assignment quiz deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUBLISH ASSIGNMENT QUIZ RESULTS
const publishAssignmentResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const assignment = await AssignmentQuiz.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment quiz not found"
      });
    }

    // Only creator or admin can publish results
    if (assignment.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can publish results."
      });
    }

    assignment.isPublic = isPublic;
    await assignment.save();

    res.status(200).json({
      success: true,
      message: `Results ${isPublic ? 'published' : 'unpublished'} successfully`,
      data: {
        id: assignment._id,
        isPublic: assignment.isPublic
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createAssignmentQuiz,
  getAllAssignmentQuizzes,
  getOneAssignmentQuiz,
  updateAssignmentQuiz,
  deleteAssignmentQuiz,
  publishAssignmentResults
}; 