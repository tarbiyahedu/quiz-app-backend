const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function testQuizStatistics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get all quizzes
    const quizzes = await LiveQuiz.find({})
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    console.log(`Found ${quizzes.length} quizzes`);

    // Test statistics for each quiz
    for (const quiz of quizzes) {
      console.log(`\n=== Quiz: ${quiz.title} ===`);
      
      // Get questions
      const questions = await LiveQuizQuestion.find({ liveQuizId: quiz._id });
      console.log(`Questions: ${questions.length}`);
      
      // Get participants
      const participants = await LiveQuizAnswer.distinct('userId', { liveQuizId: quiz._id });
      console.log(`Participants: ${participants.length}`);
      
      // Get answers
      const answers = await LiveQuizAnswer.find({ liveQuizId: quiz._id })
        .populate('userId', 'name email')
        .populate('questionId', 'marks');
      
      console.log(`Total answers: ${answers.length}`);
      
      // Calculate scores
      const userScores = {};
      answers.forEach(answer => {
        const userId = answer.userId._id.toString();
        if (!userScores[userId]) {
          userScores[userId] = {
            totalScore: 0,
            totalPossibleScore: 0,
            answers: 0
          };
        }
        userScores[userId].totalScore += answer.score;
        userScores[userId].totalPossibleScore += answer.questionId.marks;
        userScores[userId].answers += 1;
      });
      
      // Calculate average score
      const userAverageScores = Object.values(userScores).map(userScore => 
        userScore.totalPossibleScore > 0 ? (userScore.totalScore / userScore.totalPossibleScore) * 100 : 0
      );
      
      const averageScore = userAverageScores.length > 0 
        ? Math.round(userAverageScores.reduce((sum, score) => sum + score, 0) / userAverageScores.length)
        : 0;
      
      console.log(`Average score: ${averageScore}%`);
      console.log(`User scores:`, userScores);
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
  testQuizStatistics();
}

module.exports = testQuizStatistics; 