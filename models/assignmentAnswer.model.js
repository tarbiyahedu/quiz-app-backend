const mongoose = require("mongoose");

const assignmentAnswerSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignmentQuiz",
    required: [true, "Assignment ID is required"]
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignmentQuestion",
    required: [true, "Question ID is required"]
  },
  answerText: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, "Answer text is required"]
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: [1, "Attempt number must be at least 1"]
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  reviewNotes: {
    type: String,
    trim: true,
    default: ""
  },
  isLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenaltyApplied: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure unique answer per user per question per attempt
assignmentAnswerSchema.index({ userId: 1, questionId: 1, attemptNumber: 1 }, { unique: true });

// Index for better query performance
assignmentAnswerSchema.index({ assignmentId: 1 });
assignmentAnswerSchema.index({ userId: 1 });
assignmentAnswerSchema.index({ submittedAt: 1 });
assignmentAnswerSchema.index({ isCorrect: 1 });
assignmentAnswerSchema.index({ reviewed: 1 });

module.exports = mongoose.model("AssignmentAnswer", assignmentAnswerSchema); 