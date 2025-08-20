const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: function() { return !this.isGuest; },
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    required: function() { return !this.isGuest; },
    set: v => (v === "" ? undefined : v), // খালি string হলে বাদ দেবে
    validate: {
      validator: function (v) {
        if (this.isGuest || !v) return true; // guest হলে বা খালি হলে validate করবে না
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: '{VALUE} is not a valid email!'
    }
  },
  number: {
    type: String,
    required: function() { return !this.isGuest; },
    trim: true,
    set: v => (v === "" ? undefined : v), // খালি string হলে বাদ দেবে
    validate: {
      validator: function (v) {
        if (this.isGuest || !v) return true; // guest হলে বা খালি হলে validate করবে না
        return /^\d{8,15}$/.test(v); // 8 to 15 digits
      },
      message: '{VALUE} is not a valid phone number!'
    }
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ["student", "admin", "guest"],
    default: "student",
    required: [true, "Please specify user role"]
  },
  departments: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Department",
    required: function() {
      return this.role === "student" && !this.isGuest;
    },
    default: []
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: false
  },
  avatar: {
    type: String,
    default: null
  },
  approved: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    sparse: true
  },
  password: {
    type: String,
    required: function() {
      // Password required only if not guest and not using Google OAuth
      return !this.isGuest && !this.googleId;
    },
    minlength: [6, "Password must be at least 6 characters"]
  }
}, {
  timestamps: true
});

// ------------------ Indexes ------------------

// Query optimization
userSchema.index({ departments: 1, role: 1, approved: 1, createdAt: -1 });
userSchema.index({ department: 1, role: 1, approved: 1, createdAt: -1 }); // Old dept field

// Unique email only for registered users
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isGuest: false } }
);

// Unique phone number only for registered users
userSchema.index(
  { number: 1 },
  { unique: true, partialFilterExpression: { isGuest: false } }
);

module.exports = mongoose.model("User", userSchema);
