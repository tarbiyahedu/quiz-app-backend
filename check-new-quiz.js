const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function checkNewQuiz() {
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

    console.log(`Checking quiz: ${quizId}`);
    console.log(`User: ${user.name} (${user.email})`);

    // Get quiz details
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

    // Get answers for this user
    const answers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: user._id
    }).populate('questionId', 'questionText type marks correctAnswer options');

    console.log(`\n📊 User Answers (${answers.length}):`);
    if (answers.length === 0) {
      console.log('❌ No answers found for this user in this quiz');
    } else {
      answers.forEach((answer, i) => {
        console.log(`${i + 1}. Question: ${answer.questionId.questionText}`);
        console.log(`   Answer: ${answer.answerText}`);
        console.log(`   Correct: ${answer.isCorrect}`);
        console.log(`   Score: ${answer.score}/${answer.questionId.marks}`);
        console.log(`   Time: ${answer.timeTaken} seconds`);
        console.log(`   Submitted: ${answer.submittedAt}`);
      });

      // Calculate totals
      const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
      const totalTime = answers.reduce((sum, a) => sum + a.timeTaken, 0);
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalQuestions = questions.length;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      console.log(`\n📈 Summary:`);
      console.log(`Total Score: ${totalScore} points`);
      console.log(`Correct Answers: ${correctAnswers}/${totalQuestions}`);
      console.log(`Accuracy: ${accuracy}%`);
      console.log(`Total Time: ${totalTime} seconds`);

      // Check for missing answers
      if (answers.length < questions.length) {
        console.log(`\n⚠️  Missing Answers:`);
        const answeredQuestionIds = answers.map(a => a.questionId._id.toString());
        const missingQuestions = questions.filter(q => !answeredQuestionIds.includes(q._id.toString()));
        
        missingQuestions.forEach((q, i) => {
          console.log(`${i + 1}. Missing: ${q.questionText}`);
        });
      }
    }

    // Check if this is the most recent quiz with answers
    const allUserAnswers = await LiveQuizAnswer.find({ userId: user._id })
      .populate('liveQuizId', 'title')
      .sort({ submittedAt: -1 });

    if (allUserAnswers.length > 0) {
      const mostRecent = allUserAnswers[0];
      console.log(`\n🕐 Most Recent Quiz: ${mostRecent.liveQuizId.title} (${mostRecent.liveQuizId._id})`);
      console.log(`Submitted: ${mostRecent.submittedAt}`);
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
  checkNewQuiz();
}

module.exports = checkNewQuiz; 