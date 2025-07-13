const mongoose = require("mongoose");

const liveLeaderboardSchema = mongoose.Schema({
  liveQuizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LiveQuiz",
    required: [true, "Live quiz ID is required"]
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
  completedAt: {
    type: Date,
    default: null
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

// Compound index to ensure unique entry per user per quiz
liveLeaderboardSchema.index({ liveQuizId: 1, userId: 1 }, { unique: true });

// Index for better query performance
liveLeaderboardSchema.index({ liveQuizId: 1, score: -1 }); // For ranking
liveLeaderboardSchema.index({ liveQuizId: 1, rank: 1 });
liveLeaderboardSchema.index({ userId: 1 });
liveLeaderboardSchema.index({ completedAt: 1 });

module.exports = mongoose.model("LiveLeaderboard", liveLeaderboardSchema); 