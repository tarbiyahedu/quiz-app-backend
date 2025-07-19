const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function fixMCQScoring() {
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

    console.log(`Fixing MCQ scoring for quiz: ${quizId}`);
    console.log(`User: ${user.name} (${user.email})`);

    // Get MCQ answers
    const answers = await LiveQuizAnswer.find({ 
      liveQuizId: quizId, 
      userId: user._id 
    }).populate('questionId');

    console.log(`\nTotal Answers: ${answers.length}`);

    // Fix MCQ scoring
    let updatedCount = 0;
    for (const answer of answers) {
      const question = answer.questionId;
      
      if (question.type === 'MCQ') {
        console.log(`\nProcessing MCQ: ${question.questionText}`);
        console.log(`User Answer: ${answer.answerText}`);
        console.log(`Correct Answer: ${question.correctAnswer}`);
        console.log(`Options: ${question.options.join(', ')}`);

        let isCorrect = false;
        let score = 0;

        // Map option letters to option values
        const optionMap = {
          'A': question.options[0],
          'B': question.options[1], 
          'C': question.options[2],
          'D': question.options[3]
        };

        const correctOptionValue = optionMap[question.correctAnswer];
        console.log(`Correct Option Value: ${correctOptionValue}`);

        // Check if user answer matches the correct option value
        isCorrect = answer.answerText === correctOptionValue;
        score = isCorrect ? question.marks : 0;

        // Update answer if scoring changed
        if (answer.isCorrect !== isCorrect || answer.score !== score) {
          answer.isCorrect = isCorrect;
          answer.score = score;
          await answer.save();
          updatedCount++;
          
          console.log(`✅ Updated MCQ answer:`);
          console.log(`  Correct: ${isCorrect} (was ${answer.isCorrect})`);
          console.log(`  Score: ${score}/${question.marks} (was ${answer.score})`);
        } else {
          console.log(`No change needed for MCQ answer`);
        }
      }
    }

    console.log(`\n✅ Updated ${updatedCount} MCQ answers`);

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

    console.log(`\n📊 Final Results:`);
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
    console.error('Error fixing MCQ scoring:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  fixMCQScoring();
}

module.exports = fixMCQScoring; 