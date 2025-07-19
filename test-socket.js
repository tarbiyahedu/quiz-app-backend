const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function testSocketFunctionality() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get all live quizzes
    const quizzes = await LiveQuiz.find({ status: 'live' })
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    console.log(`Found ${quizzes.length} live quizzes`);

    // Test each live quiz
    for (const quiz of quizzes) {
      console.log(`\n=== Testing Quiz: ${quiz.title} ===`);
      console.log(`Status: ${quiz.status}`);
      console.log(`Is Live: ${quiz.isLive}`);
      console.log(`Time Limit: ${quiz.timeLimit} minutes`);
      console.log(`Started At: ${quiz.startedAt}`);
      console.log(`Ended At: ${quiz.endedAt}`);
      
      // Get questions
      const questions = await LiveQuizQuestion.find({ liveQuizId: quiz._id });
      console.log(`Questions: ${questions.length}`);
      
      // Get participants
      const participants = await LiveQuizAnswer.distinct('userId', { liveQuizId: quiz._id });
      console.log(`Participants: ${participants.length}`);
      
      // Calculate time remaining if quiz is live
      if (quiz.isLive && quiz.startedAt && quiz.timeLimit) {
        const elapsed = Math.floor((new Date().getTime() - new Date(quiz.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, (quiz.timeLimit * 60) - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        console.log(`Time Remaining: ${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }

    // Test quiz status simulation
    console.log('\n=== Testing Quiz Status Simulation ===');
    const testQuiz = quizzes[0];
    if (testQuiz) {
      console.log(`Simulating timer for quiz: ${testQuiz.title}`);
      
      // Simulate quiz status
      const quizStatus = {
        isLive: testQuiz.isLive,
        startedAt: testQuiz.startedAt,
        timeLimit: testQuiz.timeLimit,
        currentQuestion: null,
        participants: []
      };
      
      console.log('Quiz Status:', quizStatus);
      
      if (quizStatus.isLive && quizStatus.startedAt && quizStatus.timeLimit) {
        const elapsed = Math.floor((new Date().getTime() - new Date(quizStatus.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, (quizStatus.timeLimit * 60) - elapsed);
        
        console.log(`Elapsed: ${elapsed} seconds`);
        console.log(`Remaining: ${remaining} seconds`);
        console.log(`Total: ${quizStatus.timeLimit * 60} seconds`);
        
        if (remaining <= 0) {
          console.log('⚠️  Quiz time has expired!');
        } else {
          console.log('✅ Quiz is still active');
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSocketFunctionality();
}

module.exports = testSocketFunctionality; 