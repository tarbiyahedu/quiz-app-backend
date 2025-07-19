const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function addMissingAnswers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const quizId = '687b46d8c8deb3f20840efc9';
    
    // Get quiz and questions
    const quiz = await LiveQuiz.findById(quizId);
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId });
    const user = await User.findOne({ email: 'deen@mail.com' });

    if (!quiz || !user) {
      console.log('Quiz or user not found');
      return;
    }

    console.log(`Adding missing answers for quiz: ${quiz.title}`);
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Total questions: ${questions.length}`);

    // Get existing answers
    const existingAnswers = await LiveQuizAnswer.find({ 
      liveQuizId: quizId, 
      userId: user._id 
    });

    console.log(`Existing answers: ${existingAnswers.length}`);

    // Find missing questions
    const answeredQuestionIds = existingAnswers.map(a => a.questionId.toString());
    const missingQuestions = questions.filter(q => !answeredQuestionIds.includes(q._id.toString()));

    console.log(`Missing questions: ${missingQuestions.length}`);

    // Add missing answers
    for (const question of missingQuestions) {
      console.log(`\nAdding answer for: ${question.questionText}`);
      
      // Determine correct answer based on question type
      let answerText = '';
      let isCorrect = false;
      
      switch (question.type) {
        case 'Short':
          answerText = '114'; // Correct answer for number of surahs
          isCorrect = true;
          break;
        case 'TF':
          answerText = 'true'; // Correct answer for "Is Al-Baqarah the longest surah?"
          isCorrect = true;
          break;
        case 'MCQ':
          // This one was already answered incorrectly
          continue;
        default:
          answerText = 'Default answer';
          isCorrect = false;
      }

      const score = isCorrect ? question.marks : 0;

      const newAnswer = new LiveQuizAnswer({
        userId: user._id,
        liveQuizId: quizId,
        questionId: question._id,
        answerText,
        submittedAt: new Date(),
        timeTaken: 30, // 30 seconds per question
        isCorrect,
        score
      });

      await newAnswer.save();
      console.log(`Added answer: ${answerText} (Correct: ${isCorrect}, Score: ${score})`);
    }

    // Update leaderboard
    const allAnswers = await LiveQuizAnswer.find({ 
      liveQuizId: quizId, 
      userId: user._id 
    });

    const totalScore = allAnswers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = allAnswers.reduce((sum, a) => sum + a.timeTaken, 0);
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = allAnswers.length;

    console.log(`\n=== Updated Results ===`);
    console.log(`Total Score: ${totalScore}`);
    console.log(`Total Time: ${totalTime} seconds`);
    console.log(`Correct Answers: ${correctAnswers}/${totalQuestions}`);
    console.log(`Accuracy: ${Math.round((correctAnswers / totalQuestions) * 100)}%`);

    // Update leaderboard entry
    const LiveLeaderboard = require('./models/liveLeaderboard.model');
    await LiveLeaderboard.findOneAndUpdate(
      { liveQuizId: quizId, userId: user._id },
      {
        score: totalScore,
        accuracy: Math.round((correctAnswers / totalQuestions) * 100),
        timeTaken: totalTime,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('Leaderboard updated successfully');

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