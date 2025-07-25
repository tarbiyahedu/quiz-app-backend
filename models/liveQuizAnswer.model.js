const mongoose = require("mongoose");

const liveQuizAnswerSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false // Not required for guests
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  guestName: {
    type: String,
    trim: true,
    default: null
  },
  guestEmail: {
    type: String,
    trim: true,
    default: null
  },
  guestMobile: {
    type: String,
    trim: true,
    default: null
  },
  liveQuizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LiveQuiz",
    required: [true, "Live quiz ID is required"]
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LiveQuizQuestion",
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
  timeTaken: {
    type: Number, // in seconds
    required: [true, "Time taken is required"],
    min: [0, "Time taken cannot be negative"]
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
  auditLogs: [
    {
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date, default: Date.now },
      fieldsChanged: [String],
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }
  ]
}, {
  timestamps: true
});

// Compound index to ensure unique answer per user per question
liveQuizAnswerSchema.index({ userId: 1, questionId: 1 }, { unique: true });

// Index for better query performance
liveQuizAnswerSchema.index({ liveQuizId: 1, userId: 1, questionId: 1, submittedAt: -1 });
liveQuizAnswerSchema.index({ isCorrect: 1 });

module.exports = mongoose.model("LiveQuizAnswer", liveQuizAnswerSchema); 