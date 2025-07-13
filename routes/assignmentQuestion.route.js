const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin } = require("../middleware/auth");
const { addAssignmentQuestion, getAssignmentQuestions, updateAssignmentQuestion, deleteAssignmentQuestion } = require("../controllers/assignmentQuestion.controller");

router.use(verifyJWT);

/**
 * @swagger
 * /api/assignment-questions/{assignmentId}:
 *   post:
 *     summary: Add a question to an assignment
 *     tags: [Assignment Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - questionText
 *               - marks
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MCQ, TF, Short, Long, Match]
 *                 description: Type of question
 *               questionText:
 *                 type: string
 *                 description: The question text
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Answer options (for MCQ)
 *               correctAnswer:
 *                 type: string
 *                 description: Correct answer
 *               marks:
 *                 type: number
 *                 description: Points for this question
 *               imageUrl:
 *                 type: string
 *                 description: URL of question image
 *               explanation:
 *                 type: string
 *                 description: Explanation of the answer
 *               order:
 *                 type: number
 *                 description: Question order
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *                 description: Whether question is required
 *               wordLimit:
 *                 type: number
 *                 description: Word limit for text answers
 *     responses:
 *       201:
 *         description: Question added successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 *       404:
 *         description: Assignment not found
 */
router.post("/:assignmentId", requireAdmin, addAssignmentQuestion);

/**
 * @swagger
 * /api/assignment-questions/{assignmentId}:
 *   get:
 *     summary: Get questions for an assignment
 *     tags: [Assignment Questions]
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
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by question type
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Assignment not found
 */
router.get("/:assignmentId", getAssignmentQuestions);

/**
 * @swagger
 * /api/assignment-questions/{questionId}:
 *   put:
 *     summary: Update an assignment question
 *     tags: [Assignment Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the question
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [MCQ, TF, Short, Long, Match]
 *                 description: Type of question
 *               questionText:
 *                 type: string
 *                 description: The question text
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Answer options (for MCQ)
 *               correctAnswer:
 *                 type: string
 *                 description: Correct answer
 *               marks:
 *                 type: number
 *                 description: Points for this question
 *               imageUrl:
 *                 type: string
 *                 description: URL of question image
 *               explanation:
 *                 type: string
 *                 description: Explanation of the answer
 *               order:
 *                 type: number
 *                 description: Question order
 *               isRequired:
 *                 type: boolean
 *                 description: Whether question is required
 *               wordLimit:
 *                 type: number
 *                 description: Word limit for text answers
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Question not found
 */
router.put("/:questionId", requireAdmin, updateAssignmentQuestion);

/**
 * @swagger
 * /api/assignment-questions/{questionId}:
 *   delete:
 *     summary: Delete an assignment question
 *     tags: [Assignment Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the question
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Question not found
 */
router.delete("/:questionId", requireAdmin, deleteAssignmentQuestion);

module.exports = router; 