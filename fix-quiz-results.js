const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const User = require('./models/user.model');
require('dotenv').config();

async function fixQuizResults() {
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

    console.log(`Fixing results for user: ${user.name} (${user.email})`);

    // Find all quizzes with answers from this user
    const answers = await LiveQuizAnswer.find({ userId: user._id })
      .populate('liveQuizId', 'title status isLive timeLimit')
      .populate('questionId', 'questionText type marks correctAnswer options');

    console.log(`\n=== All User Answers ===`);
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

    // Process each quiz
    Object.keys(answersByQuiz).forEach(quizId => {
      const quizData = answersByQuiz[quizId];
      console.log(`\n--- Processing Quiz: ${quizData.quiz.title} (${quizId}) ---`);
      console.log(`Status: ${quizData.quiz.status}`);
      console.log(`Is Live: ${quizData.quiz.isLive}`);
      console.log(`Answers: ${quizData.answers.length}`);
      
      // Calculate totals
      const totalScore = quizData.answers.reduce((sum, a) => sum + a.score, 0);
      const totalTime = quizData.answers.reduce((sum, a) => sum + a.timeTaken, 0);
      const correctAnswers = quizData.answers.filter(a => a.isCorrect).length;
      const totalQuestions = quizData.answers.length;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      console.log(`Current Score: ${totalScore}`);
      console.log(`Current Time: ${totalTime} seconds`);
      console.log(`Correct Answers: ${correctAnswers}/${totalQuestions}`);
      console.log(`Accuracy: ${accuracy}%`);

      // Update leaderboard
      LiveLeaderboard.findOneAndUpdate(
        { liveQuizId: quizId, userId: user._id },
        {
          score: totalScore,
          accuracy: accuracy,
          timeTaken: totalTime,
          totalQuestions: totalQuestions,
          correctAnswers: correctAnswers,
          wrongAnswers: totalQuestions - correctAnswers,
          completedAt: new Date()
        },
        { upsert: true, new: true }
      ).then(() => {
        console.log(`✅ Leaderboard updated for quiz: ${quizData.quiz.title}`);
      }).catch(err => {
        console.error(`❌ Error updating leaderboard: ${err.message}`);
      });

      // Show answer details
      quizData.answers.forEach((answer, i) => {
        console.log(`  ${i + 1}. ${answer.questionId.questionText}`);
        console.log(`     Answer: ${answer.answerText}`);
        console.log(`     Correct: ${answer.isCorrect}`);
        console.log(`     Score: ${answer.score}/${answer.questionId.marks}`);
        console.log(`     Time: ${answer.timeTaken} seconds`);
      });
    });

    // Find the quiz with the most recent answers (likely the one you just took)
    const mostRecentQuiz = Object.keys(answersByQuiz).reduce((latest, quizId) => {
      const quizData = answersByQuiz[quizId];
      const latestAnswer = quizData.answers.reduce((latest, answer) => 
        answer.submittedAt > latest ? answer.submittedAt : latest, new Date(0)
      );
      
      if (!latest || latestAnswer > latest.latestAnswer) {
        return { quizId, latestAnswer };
      }
      return latest;
    }, null);

    if (mostRecentQuiz) {
      console.log(`\n🎯 Most Recent Quiz: ${mostRecentQuiz.quizId}`);
      console.log(`Use this ID in your URLs: ${mostRecentQuiz.quizId}`);
      
      const quizData = answersByQuiz[mostRecentQuiz.quizId];
      console.log(`Quiz Title: ${quizData.quiz.title}`);
      console.log(`Total Answers: ${quizData.answers.length}`);
      
      // Calculate final results
      const totalScore = quizData.answers.reduce((sum, a) => sum + a.score, 0);
      const totalTime = quizData.answers.reduce((sum, a) => sum + a.timeTaken, 0);
      const correctAnswers = quizData.answers.filter(a => a.isCorrect).length;
      const totalQuestions = quizData.answers.length;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      console.log(`\n📊 Final Results:`);
      console.log(`Score: ${totalScore} points`);
      console.log(`Correct: ${correctAnswers}/${totalQuestions}`);
      console.log(`Accuracy: ${accuracy}%`);
      console.log(`Time: ${totalTime} seconds`);
    }

  } catch (error) {
    console.error('Error fixing quiz results:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  fixQuizResults();
}

module.exports = fixQuizResults; 