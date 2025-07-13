const mongoose = require("mongoose");

const assignmentQuestionSchema = mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssignmentQuiz",
    required: [true, "Assignment ID is required"]
  },
  type: {
    type: String,
    enum: ["MCQ", "TF", "Short", "Long", "Match", "Image"],
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
    required: [true, "Correct answer is required"]
  },
  marks: {
    type: Number,
    required: [true, "Marks are required"],
    min: [1, "Marks must be at least 1"]
  },
  imageUrl: {
    type: String,
    default: null
  },
  explanation: {
    type: String,
    trim: true,
    default: ""
  },
  order: {
    type: Number,
    required: [true, "Question order is required"]
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  wordLimit: {
    type: Number,
    default: null, // for text-based questions
    min: [1, "Word limit must be at least 1"]
  }
}, {
  timestamps: true
});

// Index for better query performance
assignmentQuestionSchema.index({ assignmentId: 1 });
assignmentQuestionSchema.index({ assignmentId: 1, order: 1 });
assignmentQuestionSchema.index({ type: 1 });

module.exports = mongoose.model("AssignmentQuestion", assignmentQuestionSchema); 