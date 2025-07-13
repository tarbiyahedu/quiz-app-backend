const express = require("express");
const router = express.Router();
const { verifyJWT, requireStudent, requireAdmin } = require("../middleware/auth");
const { 
  submitAssignmentAnswer, 
  getAssignmentAnswers, 
  updateAssignmentAnswer, 
  deleteAssignmentAnswer,
  getCompletedAssignmentQuizzesForUser,
  getCompletedAssignmentQuizDetails
} = require("../controllers/assignmentAnswer.controller");

router.use(verifyJWT);

/**
 * @swagger
 * /api/assignment-answers/submit:
 *   post:
 *     summary: Submit answer for an assignment question
 *     tags: [Assignment Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *               - questionId
 *               - answerText
 *             properties:
 *               assignmentId:
 *                 type: string
 *                 description: ID of the assignment
 *               questionId:
 *                 type: string
 *                 description: ID of the question
 *               answerText:
 *                 type: string
 *                 description: User's answer
 *               attemptNumber:
 *                 type: number
 *                 default: 1
 *                 description: Attempt number
 *     responses:
 *       201:
 *         description: Answer submitted successfully
 *       400:
 *         description: Invalid request or assignment not active
 *       404:
 *         description: Assignment or question not found
 *       409:
 *         description: Answer already submitted for this attempt
 */
router.post("/submit", requireStudent, submitAssignmentAnswer);

/**
 * @swagger
 * /api/assignment-answers/completed:
 *   get:
 *     summary: Get all completed assignment quizzes for the current user
 *     tags: [Assignment Answers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completed assignments retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/completed", requireStudent, getCompletedAssignmentQuizzesForUser);

/**
 * @swagger
 * /api/assignment-answers/completed/{assignmentId}:
 *   get:
 *     summary: Get detailed results for a completed assignment quiz
 *     tags: [Assignment Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the completed assignment
 *     responses:
 *       200:
 *         description: Assignment details retrieved successfully
 *       404:
 *         description: No completed assignment found
 *       500:
 *         description: Server error
 */
router.get("/completed/:assignmentId", requireStudent, getCompletedAssignmentQuizDetails);

/**
 * @swagger
 * /api/assignment-answers/{assignmentId}:
 *   get:
 *     summary: Get answers for an assignment
 *     tags: [Assignment Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
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
 *         name: attemptNumber
 *         schema:
 *           type: number
 *         description: Filter by attempt number
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
 *         description: Assignment not found
 */
router.get("/:assignmentId", requireAdmin, getAssignmentAnswers);

/**
 * @swagger
 * /api/assignment-answers/{answerId}:
 *   put:
 *     summary: Update an assignment answer
 *     tags: [Assignment Answers]
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
router.put("/:answerId", requireAdmin, updateAssignmentAnswer);

/**
 * @swagger
 * /api/assignment-answers/{answerId}:
 *   delete:
 *     summary: Delete an assignment answer
 *     tags: [Assignment Answers]
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
router.delete("/:answerId", requireAdmin, deleteAssignmentAnswer);

module.exports = router; 