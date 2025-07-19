const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function checkCurrentQuizIssue() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const quizId = '687b46d8c8deb3f20840efc9';
    console.log(`🔍 CHECKING QUIZ: ${quizId}`);

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      console.log('❌ Quiz not found with ID:', quizId);
      
      // List recent quizzes
      const recentQuizzes = await LiveQuiz.find({})
        .populate('department', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);
      
      console.log('\n=== Recent Quizzes ===');
      recentQuizzes.forEach((q, i) => {
        console.log(`${i + 1}. ID: ${q._id}`);
        console.log(`   Title: ${q.title || 'Untitled'}`);
        console.log(`   Status: ${q.status}`);
        console.log(`   Is Live: ${q.isLive}`);
        console.log(`   Created: ${q.createdAt}`);
        console.log('   ---');
      });
      return;
    }

    console.log(`\n✅ Quiz Found:`);
    console.log(`Title: ${quiz.title}`);
    console.log(`Status: ${quiz.status}`);
    console.log(`Is Live: ${quiz.isLive}`);
    console.log(`Time Limit: ${quiz.timeLimit} minutes`);
    console.log(`Created By: ${quiz.createdBy?.name}`);
    console.log(`Department: ${quiz.department?.name}`);

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

    // Check if this is a new quiz that might have the systematic issue
    const quizAge = new Date() - new Date(quiz.createdAt);
    const isNewQuiz = quizAge < 24 * 60 * 60 * 1000; // Less than 24 hours old

    if (isNewQuiz) {
      console.log(`\n🆕 This is a new quiz (created ${Math.round(quizAge / (60 * 60 * 1000))} hours ago)`);
      console.log(`This might be affected by the systematic bulk submission issue.`);
    }

  } catch (error) {
    console.error('Error checking quiz:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkCurrentQuizIssue();
}

module.exports = checkCurrentQuizIssue; 