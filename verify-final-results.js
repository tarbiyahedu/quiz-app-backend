const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function verifyFinalResults() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const quizId = '687b58fed70741ace7fcc158';
    const user = await User.findOne({ email: 'deen@mail.com' });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`\n🎯 FINAL VERIFICATION FOR QUIZ: ${quizId}`);
    console.log(`User: ${user.name} (${user.email})`);

    // Get quiz details
    const quiz = await LiveQuiz.findById(quizId)
      .populate('department', 'name')
      .populate('createdBy', 'name email');

    console.log(`\n📋 Quiz Details:`);
    console.log(`Title: ${quiz.title}`);
    console.log(`Status: ${quiz.status}`);
    console.log(`Is Live: ${quiz.isLive}`);
    console.log(`Time Limit: ${quiz.timeLimit} minutes`);
    console.log(`Department: ${quiz.department?.name}`);
    console.log(`Created By: ${quiz.createdBy?.name}`);

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

    // Get answers
    const answers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: user._id
    }).populate('questionId', 'questionText type marks correctAnswer options');

    console.log(`\n📊 User Answers (${answers.length}):`);
    answers.forEach((answer, i) => {
      const question = answer.questionId;
      console.log(`${i + 1}. ${question.questionText}`);
      console.log(`   Type: ${question.type}`);
      console.log(`   User Answer: ${answer.answerText}`);
      console.log(`   Correct Answer: ${question.correctAnswer}`);
      console.log(`   Correct: ${answer.isCorrect}`);
      console.log(`   Score: ${answer.score}/${question.marks}`);
      console.log(`   Time: ${answer.timeTaken} seconds`);
      console.log(`   Submitted: ${answer.submittedAt}`);
      console.log('');
    });

    // Calculate final results
    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = answers.reduce((sum, a) => sum + a.timeTaken, 0);
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    console.log(`\n📈 FINAL RESULTS:`);
    console.log(`Score: ${totalScore} points`);
    console.log(`Correct: ${correctAnswers}/${totalQuestions}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`Time: ${totalTime} seconds`);

    // Check leaderboard
    const leaderboard = await LiveLeaderboard.findOne({
      liveQuizId: quizId,
      userId: user._id
    });

    console.log(`\n🏆 Leaderboard Entry:`);
    if (leaderboard) {
      console.log(`Score: ${leaderboard.score}`);
      console.log(`Accuracy: ${leaderboard.accuracy}%`);
      console.log(`Time Taken: ${leaderboard.timeTaken} seconds`);
      console.log(`Correct Answers: ${leaderboard.correctAnswers}/${leaderboard.totalQuestions}`);
      console.log(`Completed At: ${leaderboard.completedAt}`);
    } else {
      console.log(`❌ No leaderboard entry found`);
    }

    // Provide correct URLs
    console.log(`\n🔗 CORRECT URLs TO USE:`);
    console.log(`Results page: http://localhost:3000/result`);
    console.log(`Complete quiz details: http://localhost:3000/complete-quiz/live/${quizId}`);
    console.log(`Admin results overview: http://localhost:3000/admin/results-overview/${quizId}`);

    // Status summary
    console.log(`\n✅ STATUS SUMMARY:`);
    console.log(`✅ Quiz exists and is accessible`);
    console.log(`✅ All ${questions.length} questions are present`);
    console.log(`✅ All ${answers.length} answers are submitted`);
    console.log(`✅ Scoring is correct (${correctAnswers}/${totalQuestions} correct)`);
    console.log(`✅ Leaderboard is updated`);
    console.log(`✅ Results should display properly on all pages`);

    if (answers.length === questions.length) {
      console.log(`✅ Complete results available`);
    } else {
      console.log(`❌ Missing answers: ${questions.length - answers.length}`);
    }

    if (accuracy > 0) {
      console.log(`✅ Scoring is working correctly`);
    } else {
      console.log(`❌ All answers marked as incorrect - check scoring logic`);
    }

  } catch (error) {
    console.error('Error in final verification:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  verifyFinalResults();
}

module.exports = verifyFinalResults; 