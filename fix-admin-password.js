require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user.model");
const bcrypt = require("bcryptjs");

// Script to fix admin password if it was created without hashing
const fixAdminPassword = async () => {
  try {
    console.log("🔧 Starting admin password fix...");
    
    // Find the admin user
    const adminUser = await User.findOne({ email: "admin@quizapp.com" });
    
    if (!adminUser) {
      console.log("❌ Admin user not found. Please run the seed script first.");
      process.exit(1);
    }
    
    // Check if password is already hashed (bcrypt hashes start with $2b$)
    if (adminUser.password && adminUser.password.startsWith('$2b$')) {
      console.log("ℹ️  Admin password is already properly hashed.");
      process.exit(0);
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash("admin123456", saltRounds);
    
    // Update the admin user's password
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log("✅ Admin password has been fixed successfully!");
    console.log("📧 Email: admin@quizapp.com");
    console.log("🔑 Password: admin123456");
    
  } catch (error) {
    console.error("❌ Error fixing admin password:", error.message);
    process.exit(1);
  }
};

// Connect to database and run fix
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("📦 Connected to MongoDB");
    await fixAdminPassword();
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }); 