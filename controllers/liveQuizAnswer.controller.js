// ADMIN: GET COMPLETED QUIZ DETAILS FOR ALL PARTICIPANTS (departments only)
const getCompletedQuizDetailsForAdmin = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Get quiz details, populate only departments
    const quiz = await LiveQuiz.findById(quizId)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }


    // Get all questions for this quiz
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId }).sort({ order: 1 });
    console.log(`[ADMIN RESULTS] QuizId: ${quizId}`);
    console.log(`[ADMIN RESULTS] Found ${questions.length} questions`);

    // Get all answers for this quiz (all users), populate only departments for user
    const answers = await LiveQuizAnswer.find({ liveQuizId: quizId })
      .populate('userId', 'name email departments')
      .populate('questionId', 'questionText type marks correctAnswer correctAnswers options imageUrl videoUrl order');
    console.log(`[ADMIN RESULTS] Found ${answers.length} answers`);

    // Group answers by user
    const userMap = new Map();
    answers.forEach(ans => {
      const uid = ans.userId?._id?.toString();
      if (!uid) return;
      if (!userMap.has(uid)) userMap.set(uid, []);
      userMap.get(uid).push(ans);
    });
    console.log(`[ADMIN RESULTS] Found ${userMap.size} participants`);

    // Build participant summary
    const participants = Array.from(userMap.entries()).map(([userId, userAnswers]) => {
      const user = userAnswers[0].userId;
      let totalScore = 0;
      let correctAnswers = 0;
      let totalTime = 0;
      let totalQuestions = questions.length;
      let answeredQuestions = userAnswers.length;
      const answersDetail = questions.map((question, idx) => {
        const answer = userAnswers.find(a => a.questionId && a.questionId._id.toString() === question._id.toString());
        let userAnswer = answer ? answer.answerText : '';
        let isCorrect = answer ? answer.isCorrect : false;
        let score = answer ? answer.score : 0;
        let timeTaken = answer ? answer.timeTaken : 0;
        totalScore += score;
        if (isCorrect) correctAnswers++;
        totalTime += timeTaken;
        return {
          _id: answer ? answer._id : undefined,
          questionId: question._id,
          questionText: question.questionText,
          questionType: question.type,
          userAnswer,
          isCorrect,
          score,
          marks: question.marks,
          timeTaken,
          answered: !!answer
        };
      });
      // Only use departments array for user
      let departments = user?.departments && Array.isArray(user.departments) && user.departments.length > 0
        ? user.departments.map(d => d.name).filter(Boolean)
        : [];
      return {
        userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        departments,
        totalScore,
        correctAnswers,
        totalQuestions,
        answeredQuestions,
        totalTime: Math.round(totalTime / 60),
        answers: answersDetail
      };
    });

    // Leaderboard (sorted by totalScore desc, then by earliest quizSubmitTime asc)
    // Find quizSubmitTime for each participant (earliest answer submittedAt)
    const leaderboard = [...participants]
      .map((p) => {
        // Find the earliest submittedAt from their answers
        let quizSubmitTime = null;
        if (Array.isArray(p.answers) && p.answers.length > 0) {
          quizSubmitTime = p.answers.reduce((earliest, ans) => {
            if (ans.answered && ans.timeTaken !== undefined && ans.timeTaken !== null && ans.timeTaken >= 0 && ans.submittedAt) {
              // Use submittedAt if available
              return (!earliest || new Date(ans.submittedAt) < new Date(earliest)) ? ans.submittedAt : earliest;
            }
            return earliest;
          }, null);
        }
        return { ...p, quizSubmitTime };
      })
      .sort((a, b) => {
        // Primary: score descending
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        // Tie-breaker: quizSubmitTime ascending (earlier wins)
        if (a.quizSubmitTime && b.quizSubmitTime) {
          return new Date(a.quizSubmitTime) - new Date(b.quizSubmitTime);
        }
        return 0;
      })
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    // Quiz-level stats
    const totalParticipants = participants.length;
    const totalQuestions = questions.length;
    const totalPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);
    const averageScore = totalParticipants > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.totalScore, 0) / totalParticipants) : 0;
    const averageAccuracy = totalParticipants > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + (p.correctAnswers / (p.totalQuestions || 1)), 0) / totalParticipants * 100) : 0;

    // Question summary
    const questionsSummary = questions.map((q, idx) => {
      const answersForQ = answers.filter(a => a.questionId && a.questionId._id.toString() === q._id.toString());
      const accuracy = answersForQ.length > 0 ? Math.round((answersForQ.filter(a => a.isCorrect).length / answersForQ.length) * 100) : 0;
      return {
        questionId: q._id,
        questionText: q.questionText,
        type: q.type,
        marks: q.marks,
        accuracy,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        options: q.options,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl
      };
    });

    // Department display for quiz: only use departments array
    let departmentDisplay = Array.isArray(quiz.departments) && quiz.departments.length > 0
      ? quiz.departments.map(d => d.name).join(', ')
      : 'Unknown';

    res.status(200).json({
      success: true,
      data: {
        quizId: quiz._id,
        title: quiz.title,
        description: quiz.description,
        status: quiz.status,
        createdBy: quiz.createdBy?.name || '',
        department: departmentDisplay,
        totalQuestions,
        totalParticipants,
        totalPossibleScore,
        averageScore,
        averageAccuracy,
        participants,
        leaderboard,
        questions: questionsSummary
      }
    });
  } catch (error) {
    console.error('Error in getCompletedQuizDetailsForAdmin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const LiveQuizAnswer = require("../models/liveQuizAnswer.model");
const LiveQuiz = require("../models/liveQuiz.model");
const LiveQuizQuestion = require("../models/liveQuizQuestion.model");
const LiveLeaderboard = require("../models/liveLeaderboard.model");

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

// SUBMIT LIVE QUIZ ANSWER
const submitLiveQuizAnswer = async (req, res) => {
  try {
    const { quizId, questionId, answerText, timeTaken } = req.body;

    // Check if quiz exists and is active
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    if (quiz.status !== 'live' && !quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not live"
      });
    }

    // Check if question exists
    const question = await LiveQuizQuestion.findById(questionId);
    if (!question || question.liveQuizId.toString() !== quizId) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    // Check if user has already answered this question
    const existingAnswer = await LiveQuizAnswer.findOne({
      userId: req.user._id,
      questionId: questionId
    });

    if (existingAnswer) {
      return res.status(409).json({
        success: false,
        message: "Answer already submitted for this question"
      });
    }

    // Validate answer based on question type
    let isCorrect = false;
    let score = 0;

    switch (question.type) {
      case 'MCQ': {
        // Normalize correct answers - prioritize correctAnswers array for MCQ
        let correctAnswers = [];
        if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0) {
          correctAnswers = question.correctAnswers;
        } else if (question.correctAnswer) {
          correctAnswers = [question.correctAnswer];
        }
        
        // Normalize user answers
        let userAnswers = [];
        if (Array.isArray(answerText)) {
          userAnswers = answerText.filter(ans => ans && ans.trim() !== '');
        } else if (answerText && typeof answerText === 'string' && answerText.trim() !== '') {
          userAnswers = [answerText.trim()];
        }
        
        // Check if it's multiple choice (more than one correct answer)
        const isMultiple = correctAnswers.length > 1;
        
        if (isMultiple) {
          // For multiple correct answers, use array comparison
          isCorrect = arraysEqual(userAnswers, correctAnswers);
        } else {
          // For single correct answer, use string comparison
          isCorrect = userAnswers.length === 1 && 
                     correctAnswers.length === 1 && 
                     userAnswers[0] === correctAnswers[0];
        }
        break;
      }
      case 'TF':
        isCorrect = question.correctAnswer && answerText && question.correctAnswer.toString().toLowerCase() === answerText.toString().toLowerCase();
        break;
      case 'Short':
      case 'Long':
        // For text answers, mark as correct initially, will be reviewed later
        isCorrect = false;
        break;
      case 'Match':
        isCorrect = JSON.stringify(question.correctAnswer) === JSON.stringify(answerText);
        break;
      default:
        isCorrect = false;
    }

    // Calculate score
    if (isCorrect) {
      score = question.marks;
    }

    // Create answer
    const newAnswer = new LiveQuizAnswer({
      userId: req.user._id,
      liveQuizId: quizId,
      questionId: questionId,
      answerText,
      submittedAt: new Date(),
      timeTaken,
      isCorrect,
      score
    });

    await newAnswer.save();

    // Update leaderboard
    await updateLiveLeaderboard(quizId, req.user._id);

    res.status(201).json({
      success: true,
      message: "Answer submitted successfully",
      data: {
        answerId: newAnswer._id,
        isCorrect,
        score,
        timeTaken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// SUBMIT MULTIPLE LIVE QUIZ ANSWERS (BULK)
const submitMultipleLiveQuizAnswers = async (req, res) => {
  try {
    const { quizId, answers, isGuest, guestName, guestEmail, guestMobile } = req.body;

    console.log('Bulk submission request:', { quizId, answersCount: answers?.length });

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required"
      });
    }

    // Check if quiz exists and is active
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    if (quiz.status !== 'live' && !quiz.isLive) {
      return res.status(400).json({
        success: false,
        message: "Quiz is not live"
      });
    }

    // Get all questions for this quiz
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    console.log(`Quiz has ${questions.length} questions, submitting ${answers.length} answers`);

    let userId = req.user?._id;
    if (isGuest) {
      // Create/find guest user in User collection
      const User = require('../models/user.model');
      let guestUser = null;
      // Try to find by email or mobile
      if (guestEmail) {
        guestUser = await User.findOne({ email: guestEmail });
      } else if (guestMobile) {
        guestUser = await User.findOne({ mobile: guestMobile });
      }
      // If not found, create new guest user
      if (!guestUser) {
        guestUser = new User({
          name: guestName,
          email: guestEmail || undefined,
          mobile: guestMobile || undefined,
          role: 'Guest',
          isGuest: true
        });
        await guestUser.save();
      }
      userId = guestUser._id;
    } else {
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      // Check if user has already answered any of these questions for THIS specific quiz
      const existingAnswers = await LiveQuizAnswer.find({
        userId: userId,
        liveQuizId: quizId
      });
      if (existingAnswers.length > 0) {
        console.log(`User has already answered ${existingAnswers.length} questions for this quiz`);
        // Instead of deleting, check if we should allow resubmission
        // Only allow resubmission if the quiz is still live
        if (quiz.status === 'live' || quiz.isLive) {
          console.log('Quiz is still live, allowing resubmission by deleting existing answers');
          await LiveQuizAnswer.deleteMany({
            userId: userId,
            liveQuizId: quizId
          });
          console.log('Deleted existing answers to allow resubmission');
        } else {
          return res.status(409).json({
            success: false,
            message: "Quiz has ended. Cannot resubmit answers."
          });
        }
      }
    }

    const submittedAnswers = [];
    let totalScore = 0;
    let totalTimeTaken = 0;

    // Process each answer
    for (const answerData of answers) {
      const { questionId, answerText, timeTaken = 0 } = answerData;

      const question = questionMap.get(questionId);
      if (!question) {
        console.log(`Question not found: ${questionId}`);
        continue; // Skip invalid questions
      }

      console.log(`Processing answer for question: ${question.questionText}`);
      console.log(`User answer: ${answerText}, Correct answer: ${question.correctAnswer}`);

      // Defensive: handle both string and array answerText
      let processedAnswerText = answerText;
      if (Array.isArray(answerText)) {
        // For multiple-answer MCQ, use as is (or join if you want a string)
        // processedAnswerText = answerText.join(','); // Uncomment if you want to store as string
      } else if (typeof answerText === 'string') {
        processedAnswerText = answerText.trim();
      } else {
        processedAnswerText = '';
      }

      // Validate answer based on question type
      let isCorrect = false;
      let score = 0;

      // Only check correctness if answer is not empty
      if ((Array.isArray(processedAnswerText) && processedAnswerText.length > 0) || (typeof processedAnswerText === 'string' && processedAnswerText !== '')) {
        switch (question.type) {
          case 'MCQ': {
            // Normalize correct answers - prioritize correctAnswers array for MCQ
            let correctAnswers = [];
            if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0) {
              correctAnswers = question.correctAnswers;
            } else if (question.correctAnswer) {
              correctAnswers = [question.correctAnswer];
            }
            
            // Normalize user answers
            let userAnswers = [];
            if (Array.isArray(processedAnswerText)) {
              userAnswers = processedAnswerText.filter(ans => ans && ans.trim() !== '');
            } else if (processedAnswerText && typeof processedAnswerText === 'string' && processedAnswerText.trim() !== '') {
              userAnswers = [processedAnswerText.trim()];
            }
            
            // Check if it's multiple choice (more than one correct answer)
            const isMultiple = correctAnswers.length > 1;
            
            if (isMultiple) {
              // For multiple correct answers, use array comparison
              isCorrect = arraysEqual(userAnswers, correctAnswers);
            } else {
              // For single correct answer, use string comparison
              isCorrect = userAnswers.length === 1 && 
                         correctAnswers.length === 1 && 
                         userAnswers[0] === correctAnswers[0];
            }
            break;
          }
          case 'TF':
            isCorrect = question.correctAnswer && processedAnswerText && question.correctAnswer.toString().toLowerCase() === processedAnswerText.toString().toLowerCase();
            break;
          case 'Short':
          case 'Long':
            if (processedAnswerText && question.correctAnswer) {
              const userAnswer = processedAnswerText.toLowerCase().trim();
              const correctAnswer = question.correctAnswer.toLowerCase().trim();
              isCorrect = userAnswer === correctAnswer || 
                         userAnswer.includes(correctAnswer) || 
                         correctAnswer.includes(userAnswer);
            }
            break;
          case 'Match':
            isCorrect = JSON.stringify(question.correctAnswer) === JSON.stringify(processedAnswerText);
            break;
          default:
            isCorrect = false;
        }
      }

      // Calculate score
      if (isCorrect) {
        score = question.marks;
        totalScore += score;
      }

      totalTimeTaken += timeTaken;

      console.log(`Answer result: Correct=${isCorrect}, Score=${score}/${question.marks}`);

      // Create answer
      const newAnswer = new LiveQuizAnswer({
        liveQuizId: quizId,
        questionId: questionId,
        answerText: processedAnswerText || '', // Store as string or array
        submittedAt: new Date(),
        timeTaken,
        isCorrect,
        score,
        isGuest: !!isGuest,
        guestName: isGuest ? guestName : undefined,
        guestEmail: isGuest ? guestEmail : undefined,
        guestMobile: isGuest ? guestMobile : undefined,
        userId: userId
      });

      await newAnswer.save();
      submittedAnswers.push(newAnswer);
    }

    console.log(`Successfully submitted ${submittedAnswers.length} answers`);

    // Only update leaderboard for registered users
    if (!isGuest && userId) {
      await updateLiveLeaderboard(quizId, userId);
    }

    res.status(201).json({
      success: true,
      message: "Answers submitted successfully",
      data: {
        submittedCount: submittedAnswers.length,
        totalScore,
        totalTimeTaken,
        answers: submittedAnswers.map(a => ({
          answerId: a._id,
          questionId: a.questionId,
          isCorrect: a.isCorrect,
          score: a.score,
          timeTaken: a.timeTaken
        }))
      }
    });
  } catch (error) {
    console.error('Error in bulk submission:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET LIVE QUIZ ANSWERS
const getLiveQuizAnswers = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { userId, questionId, page = 1, limit = 10 } = req.query;

    // Check if quiz exists
    const quiz = await LiveQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Live quiz not found"
      });
    }

    // Check if user has permission (admin or quiz creator)
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build filter
    const filter = { liveQuizId: quizId };
    if (userId) filter.userId = userId;
    if (questionId) filter.questionId = questionId;

    const skip = (page - 1) * limit;

    const answers = await LiveQuizAnswer.find(filter)
      .populate('userId', 'name email')
      .populate('questionId', 'questionText type marks')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ submittedAt: -1 });

    const total = await LiveQuizAnswer.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: answers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE LIVE QUIZ ANSWER
const updateLiveQuizAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { answerText, isCorrect, score, reviewNotes } = req.body;

    const answer = await LiveQuizAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(answer.liveQuizId);
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Update fields
    if (answerText !== undefined) answer.answerText = answerText;
    if (isCorrect !== undefined) answer.isCorrect = isCorrect;
    if (score !== undefined) answer.score = score;
    if (reviewNotes !== undefined) answer.reviewNotes = reviewNotes;
    answer.reviewed = true;
    answer.reviewedBy = req.user._id;

    await answer.save();

    // Update leaderboard if score changed
    if (score !== undefined) {
      await updateLiveLeaderboard(answer.liveQuizId, answer.userId);
    }

    res.status(200).json({
      success: true,
      message: "Answer updated successfully",
      data: answer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE LIVE QUIZ ANSWER
const deleteLiveQuizAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;

    const answer = await LiveQuizAnswer.findById(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found"
      });
    }

    // Check if user has permission
    const quiz = await LiveQuiz.findById(answer.liveQuizId);
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await LiveQuizAnswer.deleteOne({ _id: answerId });

    // Update leaderboard
    await updateLiveLeaderboard(answer.liveQuizId, answer.userId);

    res.status(200).json({
      success: true,
      message: "Answer deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED QUIZZES FOR USER
const getCompletedQuizzesForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all live quiz answers for the user
    const liveQuizAnswers = await LiveQuizAnswer.find({ userId })
      .populate({
        path: 'liveQuizId',
        select: 'title description timeLimit departments status startTime endTime',
        populate: {
          path: 'departments',
          select: 'name'
        }
      })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer correctAnswers marks order'
      })
      .sort({ submittedAt: -1 });

    // Group answers by quiz
    const quizGroups = {};
    liveQuizAnswers.forEach(answer => {
      const quizId = answer.liveQuizId._id.toString();
      if (!quizGroups[quizId]) {
        quizGroups[quizId] = {
          quiz: answer.liveQuizId,
          answers: [],
          totalScore: 0,
          totalPossibleScore: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          timeTaken: 0
        };
      }
      quizGroups[quizId].answers.push(answer);
      quizGroups[quizId].totalScore += answer.score;
      quizGroups[quizId].totalPossibleScore += answer.questionId.marks;
      quizGroups[quizId].totalQuestions += 1;
      if (answer.isCorrect) {
        quizGroups[quizId].correctAnswers += 1;
      }
      quizGroups[quizId].timeTaken += answer.timeTaken;
    });

    // Convert to array and calculate percentages
    const completedQuizzes = Object.values(quizGroups).map(group => ({
      quizId: group.quiz._id,
      title: group.quiz.title,
      description: group.quiz.description,
      type: 'Live Quiz',
      score: group.totalPossibleScore > 0 ? Math.round((group.totalScore / group.totalPossibleScore) * 100) : 0,
      totalQuestions: group.totalQuestions,
      correctAnswers: group.correctAnswers,
      timeTaken: Math.round(group.timeTaken / 60), // Convert to minutes
      completionDate: group.answers[0]?.submittedAt,
      departments: Array.isArray(group.quiz.departments) ? group.quiz.departments.map(dep => dep?.name).filter(Boolean) : [],
      answers: group.answers.sort((a, b) => a.questionId.order - b.questionId.order)
    }));

    res.status(200).json({
      success: true,
      data: completedQuizzes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET COMPLETED QUIZ DETAILS FOR USER
const getCompletedQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    console.log(`Fetching quiz details for user ${userId} and quiz ${quizId}`);

    // Get quiz details
    const quiz = await LiveQuiz.findById(quizId)
      .populate('departments', 'name')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    // Get all questions for this quiz
    const questions = await LiveQuizQuestion.find({ liveQuizId: quizId })
      .sort({ order: 1 });

    console.log(`Found ${questions.length} questions for quiz ${quizId}`);

    // Get all answers for this user in this quiz
    const answers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: userId
    }).populate('questionId', 'questionText type marks correctAnswer correctAnswers options imageUrl videoUrl order');

    console.log(`Found ${answers.length} answers for user ${userId} in quiz ${quizId}`);

    if (answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No answers found for this quiz"
      });
    }

    // Create a map of questions for easy lookup
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
    const answerMap = new Map(answers.map(a => [a.questionId._id.toString(), a]));

    // Calculate totals - will be recalculated after MCQ validation
    let totalScore = 0;
    let correctAnswersCount = 0;
    const totalPossibleScore = questions.reduce((sum, question) => sum + question.marks, 0);
    const totalTime = answers.reduce((sum, answer) => sum + answer.timeTaken, 0);
    const totalQuestions = questions.length;

    // Prepare answer details with question information
    // Include ALL questions, even if not answered
    const answerDetails = questions.map((question, index) => {
      // Debug: Log MCQ question data
      if (question.type === 'MCQ') {
        console.log(`MCQ Question ${index + 1}:`, {
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          correctAnswers: question.correctAnswers,
          options: question.options
        });
      }
      const answer = answerMap.get(question._id.toString());
      let userAnswer = answer ? answer.answerText : '';
      let correctAnswer = question.correctAnswer;
      let correctAnswers = [];
      
      // For MCQ, prioritize correctAnswers array
      if (question.type === 'MCQ') {
        if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0) {
          correctAnswers = question.correctAnswers;
        } else if (question.correctAnswer) {
          correctAnswers = [question.correctAnswer];
        }
      } else {
        // For other question types
        correctAnswers = Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
          ? question.correctAnswers
          : (question.correctAnswer ? [question.correctAnswer] : []);
      }
      let isCorrect = answer ? answer.isCorrect : false;
      let score = answer ? answer.score : 0;
      
      // Enhanced MCQ validation logic
      if (question.type === 'MCQ' && answer) {
        // Normalize user answer to array format
        let userAnsArr = [];
        if (Array.isArray(userAnswer)) {
          userAnsArr = userAnswer.filter(ans => ans && ans.trim() !== '');
        } else if (userAnswer && typeof userAnswer === 'string' && userAnswer.trim() !== '') {
          userAnsArr = [userAnswer.trim()];
        }
        
        // For MCQ, use correctAnswers array (not correctAnswer)
        let normalizedCorrectAnswers = [];
        if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0) {
          normalizedCorrectAnswers = question.correctAnswers.filter(ans => ans && ans.trim() !== '');
        } else if (question.correctAnswer) {
          // Fallback to correctAnswer if correctAnswers is not available
          normalizedCorrectAnswers = [question.correctAnswer.toString().trim()];
        }
        
        // Check if it's multiple choice (more than one correct answer)
        const isMultiple = normalizedCorrectAnswers.length > 1;
        
        if (isMultiple) {
          // For multiple correct answers, use array comparison
          isCorrect = arraysEqual(userAnsArr, normalizedCorrectAnswers);
        } else {
          // For single correct answer, use string comparison
          isCorrect = userAnsArr.length === 1 && 
                     normalizedCorrectAnswers.length === 1 && 
                     userAnsArr[0] === normalizedCorrectAnswers[0];
        }
        
        // Update score based on correctness
        score = isCorrect ? question.marks : 0;
        
        // Update the answer in database if correctness changed
        if (answer.isCorrect !== isCorrect) {
          answer.isCorrect = isCorrect;
          answer.score = score;
          answer.save().catch(err => console.error('Error updating answer:', err));
        }
      }
      
      return {
        questionId: question._id,
        questionText: question.questionText,
        questionType: question.type,
        questionOptions: question.options || [],
        correctAnswer: correctAnswer, // for legacy
        correctAnswers: correctAnswers, // always array for mapping
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        score: score,
        marks: question.marks,
        order: question.order || index + 1,
        imageUrl: question.imageUrl,
        videoUrl: question.videoUrl,
        timeTaken: answer ? answer.timeTaken : 0,
        answered: !!answer
      };
    });

    // Calculate totals after MCQ validation
    totalScore = answerDetails.reduce((sum, answer) => sum + answer.score, 0);
    correctAnswersCount = answerDetails.filter(answer => answer.isCorrect).length;
    
    // Calculate percentage score based on total possible score
    const percentageScore = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0;

    // Get completion date from the latest answer
    const completionDate = answers.reduce((latest, answer) => 
      answer.submittedAt > latest ? answer.submittedAt : latest, new Date(0)
    );

    const result = {
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      type: 'live',
      score: percentageScore,
      totalQuestions: totalQuestions,
      correctAnswers: correctAnswersCount,
      answeredQuestions: answers.length,
      timeTaken: Math.round(totalTime / 60), // Convert to minutes
      completionDate: completionDate,
      department: quiz.department?.name || 'Unknown',
      answers: answerDetails
    };

    console.log(`Returning quiz details with ${answerDetails.length} questions, ${answers.length} answered`);
    
    // Debug: Log MCQ answers in the result
    const mcqAnswers = answerDetails.filter(a => a.questionType === 'MCQ');
    mcqAnswers.forEach((answer, index) => {
      console.log(`MCQ Answer ${index + 1} in result:`, {
        questionText: answer.questionText,
        correctAnswer: answer.correctAnswer,
        correctAnswers: answer.correctAnswers,
        userAnswer: answer.userAnswer,
        isCorrect: answer.isCorrect,
        score: answer.score
      });
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in getCompletedQuizDetails:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL COMPLETED QUIZZES FOR USER (LIVE + ASSIGNMENT)
const getAllCompletedQuizzesForUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all live quiz answers for the user
    const liveQuizAnswers = await LiveQuizAnswer.find({ userId })
      .populate({
        path: 'liveQuizId',
        select: 'title description timeLimit departments status startTime endTime',
        populate: {
          path: 'departments',
          select: 'name'
        }
      })
      .populate({
        path: 'questionId',
        select: 'questionText type options correctAnswer correctAnswers marks order'
      })
      .sort({ submittedAt: -1 });

    // Group live quiz answers by quiz
    const liveQuizGroups = {};
    liveQuizAnswers.forEach(answer => {
      const quizId = answer.liveQuizId._id.toString();
      if (!liveQuizGroups[quizId]) {
        liveQuizGroups[quizId] = {
          quiz: answer.liveQuizId,
          answers: [],
          totalScore: 0,
          totalPossibleScore: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          timeTaken: 0
        };
      }
      liveQuizGroups[quizId].answers.push(answer);
      liveQuizGroups[quizId].totalScore += answer.score;
      liveQuizGroups[quizId].totalPossibleScore += answer.questionId.marks;
      liveQuizGroups[quizId].totalQuestions += 1;
      if (answer.isCorrect) {
        liveQuizGroups[quizId].correctAnswers += 1;
      }
      liveQuizGroups[quizId].timeTaken += answer.timeTaken;
    });

    // Convert live quizzes to array
    const completedLiveQuizzes = Object.values(liveQuizGroups)
      .filter(group => group.quiz && group.quiz._id) // Defensive check
      .map(group => ({
        id: group.quiz._id,
        title: group.quiz.title,
        description: group.quiz.description,
        type: 'Live Quiz',
        score: group.totalPossibleScore > 0 ? Math.round((group.totalScore / group.totalPossibleScore) * 100) : 0,
        totalQuestions: group.totalQuestions,
        correctAnswers: group.correctAnswers,
        timeTaken: Math.round(group.timeTaken / 60), // Convert to minutes
        completionDate: group.answers[0]?.submittedAt,
        departments: Array.isArray(group.quiz.departments) ? group.quiz.departments.map(dep => dep?.name).filter(Boolean) : [],
        category: Array.isArray(group.quiz.departments) ? group.quiz.departments.map(dep => dep?.name).filter(Boolean).join(', ') : 'Unknown'
      }));

    // Only return completed live quizzes (no assignments)
    const allCompletedQuizzes = completedLiveQuizzes.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));

    res.status(200).json({
      success: true,
      data: allCompletedQuizzes
    });
  } catch (error) {
    console.error('Error in getAllCompletedQuizzesForUser:', error, error && error.stack ? error.stack : '');
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to update leaderboard
const updateLiveLeaderboard = async (quizId, userId) => {
  try {
    // Get all answers for this user in this quiz
    const answers = await LiveQuizAnswer.find({
      liveQuizId: quizId,
      userId: userId
    });

    // Calculate totals
    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const totalTime = answers.reduce((sum, answer) => sum + answer.timeTaken, 0);
    const correctAnswers = answers.filter(answer => answer.isCorrect).length;
    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Update or create leaderboard entry
    await LiveLeaderboard.findOneAndUpdate(
      { liveQuizId: quizId, userId: userId },
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

    // Update ranks for all participants
    await updateLiveRanks(quizId);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

// Helper function to update ranks
const updateLiveRanks = async (quizId) => {
  try {
    const leaderboard = await LiveLeaderboard.find({ liveQuizId: quizId })
      .sort({ score: -1, timeTaken: 1 });

    for (let i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1;
      await leaderboard[i].save();
    }
  } catch (error) {
    console.error('Error updating ranks:', error);
  }
};

module.exports = {
  submitLiveQuizAnswer,
  getLiveQuizAnswers,
  updateLiveQuizAnswer,
  deleteLiveQuizAnswer,
  getCompletedQuizzesForUser,
  getCompletedQuizDetails,
  getAllCompletedQuizzesForUser,
  submitMultipleLiveQuizAnswers,
  getCompletedQuizDetailsForAdmin
};