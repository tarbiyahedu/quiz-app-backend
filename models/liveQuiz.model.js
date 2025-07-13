const mongoose = require("mongoose");

const liveQuizSchema = mongoose.Schema({
  title: {
    type: String,
    required: [true, "Quiz title is required"],
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: [true, "Department is required"]
  },
  status: {
    type: String,
    enum: ["draft", "live", "completed", "scheduled"],
    default: "draft"
  },
  isLive: {
    type: Boolean,
    default: false
  },
  liveStartAt: {
    type: Date,
    default: null
  },
  liveEndAt: {
    type: Date,
    default: null
  },
  liveHistory: [{
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // in minutes
      default: 0
    }
  }],
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Creator is required"]
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ""
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  mode: {
    type: String,
    enum: ["live", "scheduled"],
    default: "live"
  }
}, {
  timestamps: true
});

// Index for better query performance
liveQuizSchema.index({ department: 1 });
liveQuizSchema.index({ status: 1 });
liveQuizSchema.index({ isLive: 1 });
liveQuizSchema.index({ createdBy: 1 });
liveQuizSchema.index({ liveStartAt: 1 });
liveQuizSchema.index({ liveEndAt: 1 });

module.exports = mongoose.model("LiveQuiz", liveQuizSchema); 