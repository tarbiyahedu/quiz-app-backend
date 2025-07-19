const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const User = require('./models/user.model');
require('dotenv').config();

async function fixQuizScoring() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const quizId = '68738ace438d770bc0b487c2'; // Quran Reading Quiz
    const user = await User.findOne({ email: 'deen@mail.com' });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Fixing scoring for quiz: ${quizId}`);
    console.log(`User: ${user.name} (${user.email})`);

    // Get quiz and questions
    const quiz = await LiveQuiz.findById(quizId);
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId });
    const answers = await LiveQuizAnswer.find({ 
      liveQuizId: quizId, 
      userId: user._id 
    }).populate('questionId');

    console.log(`\nQuiz: ${quiz.title}`);
    console.log(`Questions: ${questions.length}`);
    console.log(`Answers: ${answers.length}`);

    // Fix scoring for each answer
    let updatedCount = 0;
    for (const answer of answers) {
      const question = answer.questionId;
      let isCorrect = false;
      let score = 0;

      // Determine correct answer based on question content
      switch (question.type) {
        case 'MCQ':
          // For MCQ questions, check if the answer matches any correct option
          if (question.correctAnswer && question.options) {
            isCorrect = question.options.includes(answer.answerText) && 
                       question.correctAnswer === answer.answerText;
          }
          break;
        case 'TF':
          // For True/False questions
          isCorrect = question.correctAnswer.toString().toLowerCase() === 
                     answer.answerText.toString().toLowerCase();
          break;
        case 'Short':
        case 'Long':
          // For text questions, check for partial matches
          const userAnswer = answer.answerText.toLowerCase();
          const correctAnswer = question.correctAnswer.toLowerCase();
          isCorrect = userAnswer.includes(correctAnswer) || 
                     correctAnswer.includes(userAnswer) ||
                     userAnswer === correctAnswer;
          break;
        default:
          isCorrect = false;
      }

      score = isCorrect ? question.marks : 0;

      // Update answer if scoring changed
      if (answer.isCorrect !== isCorrect || answer.score !== score) {
        answer.isCorrect = isCorrect;
        answer.score = score;
        await answer.save();
        updatedCount++;
        
        console.log(`Updated answer for: ${question.questionText}`);
        console.log(`  User answer: ${answer.answerText}`);
        console.log(`  Correct: ${isCorrect} (was ${answer.isCorrect})`);
        console.log(`  Score: ${score}/${question.marks} (was ${answer.score})`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} answers`);

    // Recalculate totals
    const updatedAnswers = await LiveQuizAnswer.find({ 
      liveQuizId: quizId, 
      userId: user._id 
    });

    const totalScore = updatedAnswers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = updatedAnswers.reduce((sum, a) => sum + a.timeTaken, 0);
    const correctAnswers = updatedAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = updatedAnswers.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    console.log(`\n📊 Updated Results:`);
    console.log(`Score: ${totalScore} points`);
    console.log(`Correct: ${correctAnswers}/${totalQuestions}`);
    console.log(`Accuracy: ${accuracy}%`);
    console.log(`Time: ${totalTime} seconds`);

    // Update leaderboard
    await LiveLeaderboard.findOneAndUpdate(
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
    );

    console.log(`✅ Leaderboard updated`);

  } catch (error) {
    console.error('Error fixing quiz scoring:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  fixQuizScoring();
}

module.exports = fixQuizScoring; 