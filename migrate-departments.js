const mongoose = require('mongoose');
const User = require('./models/user.model');
require('dotenv').config();

async function migrateDepartments() {
  try {
    // Connect to MongoDB using the MONGO_URL from .env
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find all users with department field but no departments array
    const usersToUpdate = await User.find({
      department: { $exists: true, $ne: null },
      $or: [
        { departments: { $exists: false } },
        { departments: { $size: 0 } }
      ]
    });

    console.log(`Found ${usersToUpdate.length} users to migrate`);

    // Update each user
    for (const user of usersToUpdate) {
      if (user.department) {
        user.departments = [user.department];
        await user.save();
        console.log(`Migrated user: ${user.name} (${user.email}) - Department: ${user.department}`);
      }
    }

    console.log('Migration completed successfully');
    
    // Verify migration
    const usersWithDepartments = await User.find({
      departments: { $exists: true, $ne: [] }
    });
    console.log(`Total users with departments array: ${usersWithDepartments.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDepartments();
}

module.exports = migrateDepartments; 