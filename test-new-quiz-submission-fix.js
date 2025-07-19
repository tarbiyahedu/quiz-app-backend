const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function testNewQuizSubmissionFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    console.log('🧪 TESTING NEW QUIZ SUBMISSION FIX');
    console.log('This will verify that new quizzes work correctly from the start');

    // Find the most recent quiz
    const latestQuiz = await LiveQuiz.findOne({})
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    if (!latestQuiz) {
      console.log('No quizzes found');
      return;
    }

    const quizId = latestQuiz._id.toString();
    console.log(`\n📋 LATEST QUIZ: ${quizId}`);
    console.log(`Title: ${latestQuiz.title}`);
    console.log(`Status: ${latestQuiz.status}`);
    console.log(`Is Live: ${latestQuiz.isLive}`);
    console.log(`Created: ${latestQuiz.createdAt}`);

    // Get questions for this quiz
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
      console.log('\n🔍 POSSIBLE ISSUES:');
      console.log('1. Quiz hasn\'t been taken by any students yet');
      console.log('2. Frontend submission is failing');
      console.log('3. Backend is rejecting submissions');
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
        console.log(`     Answer: ${answer.answerText || 'EMPTY'}`);
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

    // Check if this is a very recent quiz (last hour)
    const quizAge = new Date() - new Date(latestQuiz.createdAt);
    const isVeryRecent = quizAge < 60 * 60 * 1000; // Less than 1 hour old

    if (isVeryRecent) {
      console.log(`\n🆕 This is a very recent quiz (created ${Math.round(quizAge / (60 * 1000))} minutes ago)`);
      console.log(`This should work correctly with the new fixes.`);
    }

    // Provide correct URLs
    console.log(`\n🔗 CORRECT URLs TO USE:`);
    console.log(`Results page: https://tarbiyah-live-quiz-app.vercel.app/result`);
    console.log(`Complete quiz details: https://tarbiyah-live-quiz-app.vercel.app/complete-quiz/live/${quizId}`);
    console.log(`Admin results overview: https://tarbiyah-live-quiz-app.vercel.app/admin/results-overview/${quizId}`);

    // Check for potential issues
    console.log(`\n🔍 POTENTIAL ISSUES IDENTIFIED:`);
    
    if (allAnswers.length > 0 && allAnswers.length < questions.length) {
      console.log(`❌ SYSTEMATIC ISSUE: Only ${allAnswers.length}/${questions.length} answers saved`);
      console.log(`   This indicates the bulk submission is still not working properly`);
    } else if (allAnswers.length === questions.length) {
      console.log(`✅ BULK SUBMISSION WORKING: All ${questions.length} answers saved correctly`);
    }
    
    if (latestQuiz.status === 'live' && !latestQuiz.isLive) {
      console.log(`⚠️  QUIZ STATUS MISMATCH: Status is 'live' but isLive is false`);
    }

    // Check if there are any recent submissions that might be failing
    const recentSubmissions = await LiveQuizAnswer.find({
      submittedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    }).populate('liveQuizId', 'title');

    if (recentSubmissions.length > 0) {
      console.log(`\n📝 Recent submissions (last 10 minutes):`);
      recentSubmissions.forEach(sub => {
        console.log(`- ${sub.liveQuizId.title}: ${sub.answerText} (${sub.submittedAt})`);
      });
    }

    console.log('\n🎯 TEST SUMMARY:');
    if (allAnswers.length === questions.length) {
      console.log('✅ NEW QUIZ SUBMISSION IS WORKING CORRECTLY!');
      console.log('✅ All answers are being saved properly');
      console.log('✅ No more "Not answered" issues for new quizzes');
    } else {
      console.log('❌ NEW QUIZ SUBMISSION STILL HAS ISSUES');
      console.log('❌ Only partial answers are being saved');
      console.log('❌ Need to investigate further');
    }

  } catch (error) {
    console.error('Error testing new quiz submission:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testNewQuizSubmissionFix();
}

module.exports = testNewQuizSubmissionFix; 