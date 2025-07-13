const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin } = require("../middleware/auth");
const { addLiveQuizQuestion, getLiveQuizQuestions } = require("../controllers/liveQuizQuestion.controller");

router.use(verifyJWT);

/**
 * @swagger
 * /api/live-quiz-questions/{quizId}:
 *   post:
 *     summary: Add question to live quiz
 *     tags: [LiveQuizQuestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - questionText
 *               - correctAnswer
 *               - marks
 *               - order
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MCQ, TF, Short, Long, Match, Image]
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *               marks:
 *                 type: number
 *                 minimum: 1
 *               imageUrl:
 *                 type: string
 *               explanation:
 *                 type: string
 *               timeLimit:
 *                 type: number
 *                 default: 60
 *               order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Question added successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 *   get:
 *     summary: Get all questions for live quiz
 *     tags: [LiveQuizQuestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MCQ, TF, Short, Long, Match, Image]
 *     responses:
 *       200:
 *         description: List of questions
 *       403:
 *         description: Access denied
 */
router.post('/:quizId', requireAdmin, addLiveQuizQuestion);

router.get('/:quizId', getLiveQuizQuestions);

/**
 * @swagger
 * /api/live-quiz-questions/{questionId}:
 *   put:
 *     summary: Update live quiz question
 *     tags: [LiveQuizQuestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MCQ, TF, Short, Long, Match, Image]
 *               questionText:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *               marks:
 *                 type: number
 *                 minimum: 1
 *               imageUrl:
 *                 type: string
 *               explanation:
 *                 type: string
 *               timeLimit:
 *                 type: number
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
 *   delete:
 *     summary: Delete live quiz question
 *     tags: [LiveQuizQuestions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 */
router.put('/:questionId', requireAdmin, (req, res) => {
  // TODO: Implement updateLiveQuizQuestion controller
  res.status(501).json({ message: "Not implemented yet" });
});

router.delete('/:questionId', requireAdmin, (req, res) => {
  // TODO: Implement deleteLiveQuizQuestion controller
  res.status(501).json({ message: "Not implemented yet" });
});

module.exports = router; 