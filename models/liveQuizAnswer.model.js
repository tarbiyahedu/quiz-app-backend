const mongoose = require("mongoose");

const liveQuizAnswerSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"]
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
  }
}, {
  timestamps: true
});

// Compound index to ensure unique answer per user per question
liveQuizAnswerSchema.index({ userId: 1, questionId: 1 }, { unique: true });

// Index for better query performance
liveQuizAnswerSchema.index({ liveQuizId: 1 });
liveQuizAnswerSchema.index({ userId: 1 });
liveQuizAnswerSchema.index({ submittedAt: 1 });
liveQuizAnswerSchema.index({ isCorrect: 1 });

module.exports = mongoose.model("LiveQuizAnswer", liveQuizAnswerSchema); 