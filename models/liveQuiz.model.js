const mongoose = require("mongoose");

const liveQuizSchema = mongoose.Schema({
  title: {
    type: String,
    required: [true, "Quiz title is required"],
    trim: true
  },
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  }],
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
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Add pre-save middleware to auto-generate code if not set
liveQuizSchema.pre('save', function(next) {
  if (!this.code) {
    // Generate a 6-character alphanumeric code
    this.code = Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});


// Index for better query performance
liveQuizSchema.index({ departments: 1 });
liveQuizSchema.index({ status: 1 });
liveQuizSchema.index({ isLive: 1 });
liveQuizSchema.index({ createdBy: 1 });
liveQuizSchema.index({ liveStartAt: 1 });
liveQuizSchema.index({ liveEndAt: 1 });
liveQuizSchema.index({ departments: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("LiveQuiz", liveQuizSchema); 