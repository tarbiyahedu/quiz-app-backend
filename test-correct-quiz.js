const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const User = require('./models/user.model');
require('dotenv').config();

async function testCorrectQuiz() {
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

    console.log(`Testing quiz results for user: ${user.name} (${user.email})`);

    // Find the most recent quiz with answers
    const answers = await LiveQuizAnswer.find({ userId: user._id })
      .populate('liveQuizId', 'title status isLive timeLimit')
      .populate('questionId', 'questionText type marks correctAnswer options')
      .sort({ submittedAt: -1 });

    if (answers.length === 0) {
      console.log('No answers found for this user');
      return;
    }

    // Group by quiz and find the most recent
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

    // Find the quiz with the most recent answers
    const mostRecentQuiz = Object.keys(answersByQuiz).reduce((latest, quizId) => {
      const quizData = answersByQuiz[quizId];
      const latestAnswer = quizData.answers.reduce((latest, answer) => 
        answer.submittedAt > latest ? answer.submittedAt : latest, new Date(0)
      );
      
      if (!latest || latestAnswer > latest.latestAnswer) {
        return { quizId, latestAnswer, quizData };
      }
      return latest;
    }, null);

    if (!mostRecentQuiz) {
      console.log('No recent quiz found');
      return;
    }

    const { quizId, quizData } = mostRecentQuiz;
    console.log(`\n🎯 Most Recent Quiz:`);
    console.log(`Quiz ID: ${quizId}`);
    console.log(`Title: ${quizData.quiz.title}`);
    console.log(`Status: ${quizData.quiz.status}`);
    console.log(`Is Live: ${quizData.quiz.isLive}`);
    console.log(`Total Answers: ${quizData.answers.length}`);

    // Calculate results
    const totalScore = quizData.answers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = quizData.answers.reduce((sum, a) => sum + a.timeTaken, 0);
    const correctAnswers = quizData.answers.filter(a => a.isCorrect).length;
    const totalQuestions = quizData.answers.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    console.log(`\n📊 Quiz Results:`);
    console.log(`Score: ${totalScore} points`);
    console.log(`Correct: ${correctAnswers}/${totalQuestions}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`Time: ${totalTime} seconds`);

    // Show answer details
    console.log(`\n📝 Answer Details:`);
    quizData.answers.forEach((answer, i) => {
      console.log(`${i + 1}. ${answer.questionId.questionText}`);
      console.log(`   Answer: ${answer.answerText}`);
      console.log(`   Correct: ${answer.isCorrect}`);
      console.log(`   Score: ${answer.score}/${answer.questionId.marks}`);
    });

    // Provide correct URLs
    console.log(`\n🔗 Correct URLs to use:`);
    console.log(`Results page: https://tarbiyah-live-quiz-app.vercel.app/result`);
    console.log(`Complete quiz details: https://tarbiyah-live-quiz-app.vercel.app/complete-quiz/live/${quizId}`);
    console.log(`Admin results overview: https://tarbiyah-live-quiz-app.vercel.app/admin/results-overview/${quizId}`);

    // Test the API endpoint
    console.log(`\n🧪 Testing API endpoint...`);
    try {
      const response = await fetch(`https://quiz-app-backend-main.vercel.app/api/live-quiz-answers/completed/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API endpoint working - Found ${data.data?.answers?.length || 0} answers`);
      } else {
        console.log(`❌ API endpoint error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('Error testing quiz:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testCorrectQuiz();
}

module.exports = testCorrectQuiz; 