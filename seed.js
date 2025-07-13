require("dotenv").config();
const mongoose = require("mongoose");
const Department = require("./models/department.model");
const User = require("./models/user.model");
const bcrypt = require("bcryptjs");

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
    
    console.log("🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding default data:", error.message);
    process.exit(1);
  }
};

async function updateDraftQuizzesToActive() {
  const LiveQuiz = require('./models/liveQuiz.model');
  await LiveQuiz.updateMany({ status: 'draft' }, { $set: { status: 'active' } });
  console.log('All draft quizzes updated to active.');
}

// Uncomment to run the update
// updateDraftQuizzesToActive();

// Connect to database and run seed
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("📦 Connected to MongoDB");
    await seedDefaultData();
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }); 