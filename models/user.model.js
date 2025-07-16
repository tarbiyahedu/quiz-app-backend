const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  email: {
    type: String,
    unique: [true, "Email already exists!"],
    lowercase: true,
    required: [true, "Email is required"],
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: '{VALUE} is not a valid email!'
    }
  },
  number: {
    type: String,
    required: [true, "Number is required"],
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{8,15}$/.test(v); // 8 to 15 digits
      },
      message: '{VALUE} is not a valid phone number!'
    }
  },
  role: {
    type: String,
    enum: ["student", "admin"],
    default: "student",
    required: [true, "Please specify user role"]
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: function() {
      return this.role === "student";
    }
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
      return !this.googleId; // Password only required if not using Google OAuth
    },
    minlength: [6, "Password must be at least 6 characters"]
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ department: 1, role: 1, approved: 1, createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
