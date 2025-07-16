const mongoose = require("mongoose");

const assignmentLeaderboardSchema = mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignmentQuiz",
    required: [true, "Assignment ID is required"]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
  },
  score: {
    type: Number,
    default: 0,
    min: [0, "Score cannot be negative"]
  },
  rank: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0,
    min: [0, "Accuracy cannot be negative"],
    max: [100, "Accuracy cannot exceed 100"]
  },
  timeTaken: {
    type: Number, // total time in seconds
    default: 0,
    min: [0, "Time taken cannot be negative"]
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: null
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  isLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenaltyApplied: {
    type: Number,
    default: 0
  },
  finalScore: {
    type: Number,
    default: 0
  },
  isDisqualified: {
    type: Boolean,
    default: false
  },
  disqualificationReason: {
    type: String,
    trim: true,
    default: ""
  }
}, {
  timestamps: true
});

// Compound index to ensure unique entry per user per assignment per attempt
assignmentLeaderboardSchema.index({ assignmentId: 1, userId: 1, attemptNumber: 1 }, { unique: true });

// Index for better query performance
assignmentLeaderboardSchema.index({ assignmentId: 1, finalScore: -1 }); // For ranking
assignmentLeaderboardSchema.index({ assignmentId: 1, rank: 1 });
assignmentLeaderboardSchema.index({ userId: 1 });
assignmentLeaderboardSchema.index({ submittedAt: 1 });
assignmentLeaderboardSchema.index({ assignmentId: 1, userId: 1, attemptNumber: 1, finalScore: -1, submittedAt: 1 });

module.exports = mongoose.model("AssignmentLeaderboard", assignmentLeaderboardSchema); 