const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function checkLatestQuiz() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get the most recent quiz
    const latestQuiz = await LiveQuiz.findOne({})
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    if (!latestQuiz) {
      console.log('No quizzes found');
      return;
    }

    const quizId = latestQuiz._id.toString();
    console.log(`🔍 CHECKING LATEST QUIZ: ${quizId}`);
    console.log(`Title: ${latestQuiz.title}`);

    // Get questions
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId })
      .sort({ order: 1 });

    console.log(`\n📝 Questions (${questions.length}):`);
    questions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.questionText}`);
      console.log(`   Type: ${q.type}, Marks: ${q.marks}`);
      console.log(`   Correct Answer: ${q.correctAnswer}`);
      if (q.options && q.options.length > 0) {
        console.log(`   Options: ${q.options.join(', ')}`);
      }
    });

    // Get all answers for this quiz
    const allAnswers = await LiveQuizAnswer.find({ liveQuizId: quizId })
      .populate('userId', 'name email')
      .populate('questionId', 'questionText type marks correctAnswer options');

    console.log(`\n📊 All Answers for Quiz (${allAnswers.length}):`);
    
    if (allAnswers.length === 0) {
      console.log('❌ No answers found for this quiz');
      return;
    }

    // Group answers by user
    const answersByUser = {};
    allAnswers.forEach(answer => {
      const userId = answer.userId._id.toString();
      if (!answersByUser[userId]) {
        answersByUser[userId] = {
          user: answer.userId,
          answers: []
        };
      }
      answersByUser[userId].answers.push(answer);
    });

    console.log(`Users who answered: ${Object.keys(answersByUser).length}`);

    // Check each user's answers
    for (const [userId, userData] of Object.entries(answersByUser)) {
      const user = userData.user;
      const userAnswers = userData.answers;

      console.log(`\n👤 User: ${user.name} (${user.email})`);
      console.log(`Answers submitted: ${userAnswers.length}/${questions.length}`);

      if (userAnswers.length === questions.length) {
        console.log(`✅ COMPLETE: All questions answered`);
      } else {
        console.log(`❌ INCOMPLETE: Missing ${questions.length - userAnswers.length} answers`);
        
        // Find missing questions
        const answeredQuestionIds = userAnswers.map(a => a.questionId._id.toString());
        const missingQuestions = questions.filter(q => !answeredQuestionIds.includes(q._id.toString()));
        
        console.log(`Missing questions:`);
        missingQuestions.forEach((q, i) => {
          console.log(`  ${i + 1}. ${q.questionText} (${q.type})`);
        });
      }

      // Show answer details
      console.log(`Answer details:`);
      userAnswers.forEach((answer, i) => {
        console.log(`  ${i + 1}. ${answer.questionId.questionText}`);
        console.log(`     Answer: ${answer.answerText}`);
        console.log(`     Correct: ${answer.isCorrect}`);
        console.log(`     Score: ${answer.score}/${answer.questionId.marks}`);
        console.log(`     Time: ${answer.timeTaken} seconds`);
        console.log(`     Submitted: ${answer.submittedAt}`);
      });

      // Calculate totals
      const totalScore = userAnswers.reduce((sum, a) => sum + a.score, 0);
      const totalTime = userAnswers.reduce((sum, a) => sum + a.timeTaken, 0);
      const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
      const accuracy = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;

      console.log(`\n📈 Summary for ${user.name}:`);
      console.log(`Score: ${totalScore} points`);
      console.log(`Correct: ${correctAnswers}/${questions.length}`);
      console.log(`Accuracy: ${accuracy}%`);
      console.log(`Time: ${totalTime} seconds`);

      // Check leaderboard
      const leaderboard = await LiveLeaderboard.findOne({
        liveQuizId: quizId,
        userId: user._id
      });

      if (leaderboard) {
        console.log(`🏆 Leaderboard: ${leaderboard.score} points, ${leaderboard.accuracy}% accuracy`);
      } else {
        console.log(`⚠️  No leaderboard entry found`);
      }
    }

    // Provide correct URLs
    console.log(`\n🔗 CORRECT URLs TO USE:`);
    console.log(`Results page: http://localhost:3000/result`);
    console.log(`Complete quiz details: http://localhost:3000/complete-quiz/live/${quizId}`);
    console.log(`Admin results overview: http://localhost:3000/admin/results-overview/${quizId}`);

  } catch (error) {
    console.error('Error checking latest quiz:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkLatestQuiz();
}

module.exports = checkLatestQuiz; 