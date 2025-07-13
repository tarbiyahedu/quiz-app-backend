const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin, requireStudent } = require("../middleware/auth");
const {
  createAssignmentQuiz,
  getAllAssignmentQuizzes,
  getOneAssignmentQuiz,
  updateAssignmentQuiz,
  deleteAssignmentQuiz,
  publishAssignmentResults
} = require("../controllers/assignmentQuiz.controller");

// All assignment quiz routes require authentication
router.use(verifyJWT);

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create a new assignment quiz
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - department
 *               - releaseDate
 *               - deadline
 *               - totalMarks
 *             properties:
 *               title:
 *                 type: string
 *                 description: Assignment title
 *               department:
 *                 type: string
 *                 description: Department ID
 *               releaseDate:
 *                 type: string
 *                 format: date-time
 *                 description: When assignment becomes available
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Assignment deadline
 *               totalMarks:
 *                 type: number
 *                 description: Total marks for assignment
 *                 minimum: 1
 *               timeLimit:
 *                 type: number
 *                 description: Time limit in minutes (optional)
 *               description:
 *                 type: string
 *                 description: Assignment description
 *               instructions:
 *                 type: string
 *                 description: Assignment instructions
 *               allowLateSubmission:
 *                 type: boolean
 *                 default: false
 *               lateSubmissionPenalty:
 *                 type: number
 *                 description: Percentage penalty for late submission
 *                 minimum: 0
 *                 maximum: 100
 *               maxAttempts:
 *                 type: number
 *                 description: Maximum number of attempts allowed
 *                 minimum: 1
 *                 default: 1
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: List of assignments
 */
router.post("/", requireAdmin, createAssignmentQuiz);

router.get("/", getAllAssignmentQuizzes);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get a specific assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment details
 *       404:
 *         description: Assignment not found
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               department:
 *                 type: string
 *               releaseDate:
 *                 type: string
 *                 format: date-time
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               totalMarks:
 *                 type: number
 *               timeLimit:
 *                 type: number
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               allowLateSubmission:
 *                 type: boolean
 *               lateSubmissionPenalty:
 *                 type: number
 *               maxAttempts:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       404:
 *         description: Assignment not found
 *   delete:
 *     summary: Delete an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 */
router.get("/:id", getOneAssignmentQuiz);

router.put("/:id", requireAdmin, updateAssignmentQuiz);

router.delete("/:id", requireAdmin, deleteAssignmentQuiz);

/**
 * @swagger
 * /api/assignments/{id}/publish:
 *   post:
 *     summary: Toggle public result for assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - isPublic
 *             properties:
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Public result toggled successfully
 *       404:
 *         description: Assignment not found
 */
router.post("/:id/publish", requireAdmin, publishAssignmentResults);

module.exports = router; 