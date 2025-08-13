// Script to mark a specific quiz as public and completed in MongoDB
// Usage: node scripts/mark-specific-quiz-public-completed.js <quizId>

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LiveQuiz = require('../models/liveQuiz.model');

async function markSpecificQuiz(quizId) {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const result = await LiveQuiz.updateOne(
    { _id: quizId },
    { $set: { isPublic: true, status: 'completed' } }
  );

  if (result.modifiedCount === 1) {
    console.log(`Quiz ${quizId} marked as public and completed.`);
  } else {
    console.log(`Quiz ${quizId} not found or not updated.`);
  }
  await mongoose.disconnect();
}

const quizId = process.argv[2] || '689c20719d7de5a9ff803842';
markSpecificQuiz(quizId).catch(err => {
  console.error('Error updating quiz:', err);
  process.exit(1);
});
