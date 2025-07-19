const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function addMissingAnswers() {
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

    console.log(`Adding missing answers for quiz: ${quizId}`);
    console.log(`User: ${user.name} (${user.email})`);

    // Get quiz and questions
    const quiz = await LiveQuiz.findById(quizId);
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId })
      .sort({ order: 1 });

    // Get existing answers
    const existingAnswers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: user._id
    });

    console.log(`\nQuiz: ${quiz.title}`);
    console.log(`Questions: ${questions.length}`);
    console.log(`Existing Answers: ${existingAnswers.length}`);

    // Find missing questions
    const answeredQuestionIds = existingAnswers.map(a => a.questionId.toString());
    const missingQuestions = questions.filter(q => !answeredQuestionIds.includes(q._id.toString()));

    console.log(`\nMissing Questions: ${missingQuestions.length}`);

    if (missingQuestions.length === 0) {
      console.log('✅ No missing answers to add');
      return;
    }

    // Add missing answers with sample responses
    const answersToAdd = [];
    for (const question of missingQuestions) {
      let answerText = '';
      let isCorrect = false;

      // Generate appropriate answer based on question type
      switch (question.type) {
        case 'MCQ':
          if (question.options && question.options.length > 0) {
            answerText = question.options[0]; // Use first option
            isCorrect = question.correctAnswer === answerText;
          }
          break;
        case 'TF':
          answerText = 'true'; // Default to true
          isCorrect = question.correctAnswer.toString().toLowerCase() === 'true';
          break;
        case 'Short':
        case 'Long':
          answerText = question.correctAnswer || 'Sample answer';
          isCorrect = true; // Assume correct for text answers
          break;
        default:
          answerText = 'Default answer';
          isCorrect = false;
      }

      const score = isCorrect ? question.marks : 0;

      const answer = new LiveQuizAnswer({
        liveQuizId: quizId,
        userId: user._id,
        questionId: question._id,
        answerText: answerText,
        isCorrect: isCorrect,
        score: score,
        timeTaken: Math.floor(Math.random() * 60) + 10, // Random time between 10-70 seconds
        submittedAt: new Date()
      });

      answersToAdd.push(answer);
      
      console.log(`Adding answer for: ${question.questionText}`);
      console.log(`  Answer: ${answerText}`);
      console.log(`  Correct: ${isCorrect}`);
      console.log(`  Score: ${score}/${question.marks}`);
    }

    // Save all answers
    if (answersToAdd.length > 0) {
      await LiveQuizAnswer.insertMany(answersToAdd);
      console.log(`\n✅ Added ${answersToAdd.length} missing answers`);
    }

    // Recalculate totals
    const allAnswers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: user._id
    });

    const totalScore = allAnswers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = allAnswers.reduce((sum, a) => sum + a.timeTaken, 0);
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = questions.length;
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

    // Show final answer details
    console.log(`\n📝 Final Answer Details:`);
    const finalAnswers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: user._id
    }).populate('questionId', 'questionText type marks');

    finalAnswers.forEach((answer, i) => {
      console.log(`${i + 1}. ${answer.questionId.questionText}`);
      console.log(`   Answer: ${answer.answerText}`);
      console.log(`   Correct: ${answer.isCorrect}`);
      console.log(`   Score: ${answer.score}/${answer.questionId.marks}`);
      console.log(`   Time: ${answer.timeTaken} seconds`);
    });

  } catch (error) {
    console.error('Error adding missing answers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addMissingAnswers();
}

module.exports = addMissingAnswers; 