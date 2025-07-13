require("dotenv").config();

const mongoose = require("mongoose");
const Department = require("../models/department.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

// Debug: Check if environment variables are loaded
console.log("🔍 Environment check:");
console.log("MONGO_URL:", process.env.MONGO_URL ? "Set" : "NOT SET");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "NOT SET");

// Seed function to create default department and admin
const seedDefaultData = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Check if default admin already exists
    let defaultAdmin = await User.findOne({ email: "admin@quizapp.com" });
    
    if (!defaultAdmin) {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash("admin123456", saltRounds);
      
      // Create default admin user
      defaultAdmin = new User({
        name: "System Administrator",
        email: "admin@quizapp.com",
        role: "admin",
        password: hashedPassword,
        approved: true
      });
      
      await defaultAdmin.save();
      console.log("✅ Default admin user created successfully");
    } else {
      console.log("ℹ️  Default admin user already exists");
    }
    
    // Check if "Quran Studies" department already exists
    const existingDepartment = await Department.findOne({ name: "Quran Studies" });
    
    if (!existingDepartment) {
      const defaultDepartment = new Department({
        name: "Quran Studies",
        description: "Department for Quranic studies and Islamic education",
        createdBy: defaultAdmin._id,
        isActive: true
      });
      
      await defaultDepartment.save();
      console.log("✅ Default department 'Quran Studies' created successfully");
    } else {
      console.log("ℹ️  Default department 'Quran Studies' already exists");
    }
  } catch (error) {
    console.error("❌ Error seeding default data:", error.message);
  }
};

// Check if MONGO_URL is defined
if (!process.env.MONGO_URL) {
  console.error("❌ MONGO_URL environment variable is not set!");
  console.error("Please check your .env file contains: MONGO_URL=your_connection_string");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("✅ MongoDB Database is connected");
    // Seed default data after successful connection
    await seedDefaultData();
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  });


  