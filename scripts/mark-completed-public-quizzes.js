// Script to mark quizzes as public and completed in MongoDB
// Usage: node scripts/mark-completed-public-quizzes.js

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LiveQuiz = require('../models/liveQuiz.model');

async function markCompletedPublicQuizzes() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Update all quizzes to isPublic: true and status: 'completed'
  const result = await LiveQuiz.updateMany(
    {},
    { $set: { isPublic: true, status: 'completed' } }
  );

  console.log(`Updated ${result.modifiedCount} quizzes to public and completed.`);
  await mongoose.disconnect();
}

markCompletedPublicQuizzes().catch(err => {
  console.error('Error updating quizzes:', err);
  process.exit(1);
});
