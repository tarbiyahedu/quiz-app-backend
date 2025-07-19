const mongoose = require('mongoose');
const LiveQuiz = require('./models/liveQuiz.model');
const LiveQuizQuestion = require('./models/liveQuizQuestion.model');
const LiveQuizAnswer = require('./models/liveQuizAnswer.model');
const LiveLeaderboard = require('./models/liveLeaderboard.model');
const Department = require('./models/department.model');
const User = require('./models/user.model');
require('dotenv').config();

async function debugQuizResults() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const quizId = '687b46d8c8deb3f20840efc9';
    
    // Get quiz details
    const quiz = await LiveQuiz.findById(quizId)
      .populate('department', 'name')
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      console.log('Quiz not found with ID:', quizId);
      
      // List all quizzes to find the correct one
      const allQuizzes = await LiveQuiz.find({})
        .populate('department', 'name')
        .populate('createdBy', 'name email')
        .limit(10);
      
      console.log('\n=== Available Quizzes ===');
      allQuizzes.forEach((q, i) => {
        console.log(`${i + 1}. ID: ${q._id}`);
        console.log(`   Title: ${q.title}`);
        console.log(`   Status: ${q.status}`);
        console.log(`   Is Live: ${q.isLive}`);
        console.log('   ---');
      });
      return;
    }
    
    console.log('\n=== Quiz Details ===');
    console.log('Title:', quiz.title);
    console.log('Status:', quiz.status);
    console.log('Is Live:', quiz.isLive);
    console.log('Started At:', quiz.startedAt);
    console.log('Ended At:', quiz.endedAt);
    console.log('Time Limit:', quiz.timeLimit);

    // Get all questions for this quiz
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId });
    console.log('\n=== Questions ===');
    console.log('Total Questions:', questions.length);
    questions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.questionText} (${q.type}) - ${q.marks} marks`);
    });

    // Get all answers for this quiz
    const answers = await LiveQuizAnswer.find({ liveQuizId: quizId })
      .populate('userId', 'name email')
      .populate('questionId', 'questionText type marks correctAnswer');
    
    console.log('\n=== All Answers ===');
    console.log('Total Answers:', answers.length);
    
    // Group answers by user
    const answersByUser = {};
    answers.forEach(answer => {
      const userId = answer.userId._id.toString();
      if (!answersByUser[userId]) {
        answersByUser[userId] = [];
      }
      answersByUser[userId].push(answer);
    });

    Object.keys(answersByUser).forEach(userId => {
      const userAnswers = answersByUser[userId];
      const user = userAnswers[0].userId;
      console.log(`\n--- User: ${user.name} (${user.email}) ---`);
      console.log('Total Answers:', userAnswers.length);
      
      userAnswers.forEach((answer, i) => {
        console.log(`${i + 1}. Question: ${answer.questionId.questionText}`);
        console.log(`   Answer: ${answer.answerText}`);
        console.log(`   Correct: ${answer.isCorrect}`);
        console.log(`   Score: ${answer.score}/${answer.questionId.marks}`);
        console.log(`   Time Taken: ${answer.timeTaken} seconds`);
        console.log(`   Submitted: ${answer.submittedAt}`);
      });
    });

    // Get leaderboard entries
    const leaderboard = await LiveLeaderboard.find({ liveQuizId: quizId })
      .populate('userId', 'name email');
    
    console.log('\n=== Leaderboard ===');
    console.log('Total Entries:', leaderboard.length);
    leaderboard.forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.userId.name}: ${entry.score} points, ${entry.correctAnswers}/${entry.totalQuestions} correct`);
    });

    // Check for any data inconsistencies
    console.log('\n=== Data Consistency Check ===');
    
    // Check if all questions have answers
    questions.forEach(question => {
      const questionAnswers = answers.filter(a => a.questionId._id.toString() === question._id.toString());
      console.log(`Question "${question.questionText}": ${questionAnswers.length} answers`);
    });

    // Check user completion status
    Object.keys(answersByUser).forEach(userId => {
      const userAnswers = answersByUser[userId];
      const user = userAnswers[0].userId;
      const completedQuestions = userAnswers.length;
      const totalQuestions = questions.length;
      
      console.log(`${user.name}: ${completedQuestions}/${totalQuestions} questions answered`);
      
      if (completedQuestions !== totalQuestions) {
        console.log(`  ⚠️  Missing answers for ${totalQuestions - completedQuestions} questions`);
        
        // Find which questions are missing
        const answeredQuestionIds = userAnswers.map(a => a.questionId._id.toString());
        const missingQuestions = questions.filter(q => !answeredQuestionIds.includes(q._id.toString()));
        
        missingQuestions.forEach(q => {
          console.log(`    - Missing: ${q.questionText}`);
        });
      }
    });

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run debug if this file is executed directly
if (require.main === module) {
  debugQuizResults();
}

module.exports = debugQuizResults; 