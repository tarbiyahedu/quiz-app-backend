const mongoose = require("mongoose");

const departmentSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Department name is required"],
    trim: true,
    unique: [true, "Department name already exists!"]
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Creator is required"]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
departmentSchema.index({ createdBy: 1 });
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model("Department", departmentSchema); 