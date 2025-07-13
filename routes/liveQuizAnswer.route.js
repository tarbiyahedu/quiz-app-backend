const express = require("express");
const router = express.Router();
const { verifyJWT, requireStudent, requireAdmin } = require("../middleware/auth");
const { 
  submitLiveQuizAnswer, 
  getLiveQuizAnswers, 
  updateLiveQuizAnswer, 
  deleteLiveQuizAnswer,
  getCompletedQuizzesForUser,
  getCompletedQuizDetails,
  getAllCompletedQuizzesForUser,
  getCompletedQuizDetailsForAdmin
} = require("../controllers/liveQuizAnswer.controller");

router.use(verifyJWT);

/**
 * @swagger
 * /api/live-quiz-answers/submit:
 *   post:
 *     summary: Submit answer for a live quiz question
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quizId
 *               - questionId
 *               - answerText
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: ID of the live quiz
 *               questionId:
 *                 type: string
 *                 description: ID of the question
 *               answerText:
 *                 type: string
 *                 description: User's answer
 *               timeTaken:
 *                 type: number
 *                 description: Time taken to answer in seconds
 *     responses:
 *       201:
 *         description: Answer submitted successfully
 *       400:
 *         description: Invalid request or quiz not active
 *       404:
 *         description: Quiz or question not found
 *       409:
 *         description: Answer already submitted
 */
router.post("/submit", requireStudent, submitLiveQuizAnswer);

/**
 * @swagger
 * /api/live-quiz-answers/all-completed:
 *   get:
 *     summary: Get all completed quizzes (live + assignment) for the current user
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All completed quizzes retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/all-completed", requireStudent, getAllCompletedQuizzesForUser);

/**
 * @swagger
 * /api/live-quiz-answers/completed:
 *   get:
 *     summary: Get all completed live quizzes for the current user
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completed quizzes retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/completed", requireStudent, getCompletedQuizzesForUser);

/**
 * @swagger
 * /api/live-quiz-answers/completed/{quizId}:
 *   get:
 *     summary: Get detailed results for a completed live quiz
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the completed quiz
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully
 *       404:
 *         description: No completed quiz found
 *       500:
 *         description: Server error
 */
router.get("/completed/:quizId", requireStudent, getCompletedQuizDetails);

/**
 * @swagger
 * /api/live-quiz-answers/admin/completed/{quizId}:
 *   get:
 *     summary: Get detailed results for a completed live quiz (Admin only)
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the completed quiz
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 *       500:
 *         description: Server error
 */
router.get("/admin/completed/:quizId", requireAdmin, getCompletedQuizDetailsForAdmin);

/**
 * @swagger
 * /api/live-quiz-answers/{quizId}:
 *   get:
 *     summary: Get answers for a live quiz
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the live quiz
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: questionId
 *         schema:
 *           type: string
 *         description: Filter by question ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Answers retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.get("/:quizId", requireAdmin, getLiveQuizAnswers);

/**
 * @swagger
 * /api/live-quiz-answers/{answerId}:
 *   put:
 *     summary: Update a live quiz answer
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the answer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answerText:
 *                 type: string
 *                 description: Updated answer text
 *               isCorrect:
 *                 type: boolean
 *                 description: Whether the answer is correct
 *               score:
 *                 type: number
 *                 description: Score for the answer
 *               reviewNotes:
 *                 type: string
 *                 description: Review notes
 *     responses:
 *       200:
 *         description: Answer updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Answer not found
 */
router.put("/:answerId", requireAdmin, updateLiveQuizAnswer);

/**
 * @swagger
 * /api/live-quiz-answers/{answerId}:
 *   delete:
 *     summary: Delete a live quiz answer
 *     tags: [Live Quiz Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: answerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the answer
 *     responses:
 *       200:
 *         description: Answer deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Answer not found
 */
router.delete("/:answerId", requireAdmin, deleteLiveQuizAnswer);

module.exports = router; 