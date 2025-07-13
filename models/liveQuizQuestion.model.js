const mongoose = require("mongoose");

const liveQuizQuestionSchema = mongoose.Schema({
  liveQuizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LiveQuiz",
    required: [true, "Live quiz ID is required"]
  },
  type: {
    type: String,
    enum: ["MCQ", "TF", "Short", "Long", "Match", "Image", "Fill", "Ordering", "Media"],
    required: [true, "Question type is required"]
  },
  questionText: {
    type: String,
    required: [true, "Question text is required"],
    trim: true
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      // Only required for MCQ, TF, and Short types
      return ["MCQ", "TF", "Short"].includes(this.type);
    }
  },
  // For fill in the blanks - multiple correct answers
  correctAnswers: [{
    type: String,
    trim: true
  }],
  // For matching questions - pairs of items
  matchingPairs: [{
    itemA: { type: String, trim: true },
    itemB: { type: String, trim: true }
  }],
  // For ordering questions - correct sequence
  correctSequence: [{
    type: String,
    trim: true
  }],
  marks: {
    type: Number,
    required: [true, "Marks are required"],
    min: [1, "Marks must be at least 1"]
  },
  imageUrl: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  explanation: {
    type: String,
    trim: true,
    default: ""
  },
  timeLimit: {
    type: Number, // in seconds, for individual question
    default: 60
  },
  order: {
    type: Number,
    required: [true, "Question order is required"]
  },
  // For media questions - additional question type
  mediaQuestionType: {
    type: String,
    enum: ["MCQ", "TF", "Short", "Long"],
    default: "MCQ"
  }
}, {
  timestamps: true
});

// Index for better query performance
liveQuizQuestionSchema.index({ liveQuizId: 1 });
liveQuizQuestionSchema.index({ liveQuizId: 1, order: 1 });
liveQuizQuestionSchema.index({ type: 1 });

module.exports = mongoose.model("LiveQuizQuestion", liveQuizQuestionSchema); 