const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const User = require('./models/user.model');
require('dotenv').config();

async function findQuizWithAnswers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: 'deen@mail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Looking for answers from user: ${user.name} (${user.email})`);

    // Find all answers by this user
    const answers = await LiveQuizAnswer.find({ userId: user._id })
      .populate('liveQuizId', 'title status isLive')
      .populate('questionId', 'questionText type marks');

    console.log(`\n=== All Answers by User ===`);
    console.log('Total Answers:', answers.length);

    // Group answers by quiz
    const answersByQuiz = {};
    answers.forEach(answer => {
      const quizId = answer.liveQuizId._id.toString();
      if (!answersByQuiz[quizId]) {
        answersByQuiz[quizId] = {
          quiz: answer.liveQuizId,
          answers: []
        };
      }
      answersByQuiz[quizId].answers.push(answer);
    });

    Object.keys(answersByQuiz).forEach(quizId => {
      const quizData = answersByQuiz[quizId];
      console.log(`\n--- Quiz: ${quizData.quiz.title} (${quizId}) ---`);
      console.log(`Status: ${quizData.quiz.status}`);
      console.log(`Is Live: ${quizData.quiz.isLive}`);
      console.log(`Answers: ${quizData.answers.length}`);
      
      quizData.answers.forEach((answer, i) => {
        console.log(`  ${i + 1}. ${answer.questionId.questionText}`);
        console.log(`     Answer: ${answer.answerText}`);
        console.log(`     Correct: ${answer.isCorrect}`);
        console.log(`     Score: ${answer.score}/${answer.questionId.marks}`);
      });
    });

    // Find the quiz with 3 answers (the one we fixed)
    const quizWithThreeAnswers = Object.keys(answersByQuiz).find(quizId => 
      answersByQuiz[quizId].answers.length === 3
    );

    if (quizWithThreeAnswers) {
      console.log(`\n✅ Found quiz with 3 answers: ${quizWithThreeAnswers}`);
      console.log(`Quiz title: ${answersByQuiz[quizWithThreeAnswers].quiz.title}`);
    } else {
      console.log('\n❌ No quiz found with exactly 3 answers');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  findQuizWithAnswers();
}

module.exports = findQuizWithAnswers; 