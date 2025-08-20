// scripts/cleanup-guest-emails.js
// Usage: node scripts/cleanup-guest-emails.js
// Cleans up guest users with null/empty email and recreates the partial unique index for email

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quizApp';

async function cleanupGuestEmails() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  try {
    console.log('Connected to MongoDB');
    // Remove guest users with null or empty email
    const deleteResult = await db.collection('users').deleteMany({ isGuest: true, email: { $in: [null, ''] } });
    console.log(`Deleted ${deleteResult.deletedCount} guest users with null/empty email.`);
    // Drop old index if exists
    try {
      await db.collection('users').dropIndex('email_1');
      console.log('Dropped old email_1 index.');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('email_1 index not found, skipping drop.');
      } else {
        throw err;
      }
    }
    // Create partial unique index
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { isGuest: false } }
    );
    console.log('Created partial unique index for email (only for non-guests).');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupGuestEmails();
