const mongoose = require("mongoose");

const assignmentQuizSchema = mongoose.Schema({
  title: {
    type: String,
    required: [true, "Assignment title is required"],
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: [true, "Department is required"]
  },
  releaseDate: {
    type: Date,
    required: [true, "Release date is required"]
  },
  deadline: {
    type: Date,
    required: [true, "Deadline is required"]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Creator is required"]
  },
  totalMarks: {
    type: Number,
    required: [true, "Total marks is required"],
    min: [1, "Total marks must be at least 1"]
  },
  timeLimit: {
    type: Number, // in minutes, optional
    default: null
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  instructions: {
    type: String,
    trim: true,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  lateSubmissionPenalty: {
    type: Number, // percentage penalty
    default: 0,
    min: [0, "Penalty cannot be negative"],
    max: [100, "Penalty cannot exceed 100%"]
  },
  maxAttempts: {
    type: Number,
    default: 1,
    min: [1, "Max attempts must be at least 1"]
  }
}, {
  timestamps: true
});

// Index for better query performance
assignmentQuizSchema.index({ department: 1 });
assignmentQuizSchema.index({ createdBy: 1 });
assignmentQuizSchema.index({ releaseDate: 1 });
assignmentQuizSchema.index({ deadline: 1 });
assignmentQuizSchema.index({ isActive: 1 });

module.exports = mongoose.model("AssignmentQuiz", assignmentQuizSchema); 