const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin, requireStudent } = require("../middleware/auth");
const {
  createLiveQuiz,
  getAllLiveQuizzes,
  getOneLiveQuiz,
  updateLiveQuiz,
  deleteLiveQuiz,
  startLiveQuiz,
  endLiveQuiz,
  publishLiveQuizResults,
  getAvailableLiveQuizzesForStudent,
  scheduleLiveQuiz,
  cancelScheduledQuiz
} = require("../controllers/liveQuiz.controller");

/**
 * @swagger
 * /api/live-quizzes:
 *   post:
 *     summary: Create a new live quiz
 *     tags: [LiveQuizzes]
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
 *             properties:
 *               title:
 *                 type: string
 *                 description: Quiz title
 *               department:
 *                 type: string
 *                 description: Department ID
 *               timeLimit:
 *                 type: number
 *                 description: Time limit in minutes
 *                 default: 30
 *               maxParticipants:
 *                 type: number
 *                 description: Maximum number of participants
 *                 default: 100
 *     responses:
 *       201:
 *         description: Live quiz created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 *   get:
 *     summary: Get all live quizzes
 *     tags: [LiveQuizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, ended]
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
 *         description: List of live quizzes
 */
router.post("/", verifyJWT, requireAdmin, createLiveQuiz);

router.get("/", verifyJWT, getAllLiveQuizzes);

/**
 * @swagger
 * /api/live-quizzes/{id}:
 *   get:
 *     summary: Get a specific live quiz
 *     tags: [LiveQuizzes]
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
 *         description: Live quiz details
 *       404:
 *         description: Live quiz not found
 *   put:
 *     summary: Update a live quiz
 *     tags: [LiveQuizzes]
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
 *               status:
 *                 type: string
 *                 enum: [draft, active, ended]
 *               timeLimit:
 *                 type: number
 *               maxParticipants:
 *                 type: number
 *     responses:
 *       200:
 *         description: Live quiz updated successfully
 *       404:
 *         description: Live quiz not found
 *   delete:
 *     summary: Delete a live quiz
 *     tags: [LiveQuizzes]
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
 *         description: Live quiz deleted successfully
 *       404:
 *         description: Live quiz not found
 */
// Student: Get available live quizzes for their department (not completed)
router.get("/available",
  (req, res, next) => { console.log('Route: /api/live-quizzes/available hit'); next(); },
  verifyJWT,
  (req, res, next) => { console.log('verifyJWT passed'); next(); },
  requireStudent,
  (req, res, next) => { console.log('requireStudent passed'); next(); },
  getAvailableLiveQuizzesForStudent
);
router.get("/:id", verifyJWT, getOneLiveQuiz);

router.put("/:id", verifyJWT, requireAdmin, updateLiveQuiz);

router.delete("/:id", verifyJWT, requireAdmin, deleteLiveQuiz);

/**
 * @swagger
 * /api/live-quizzes/{id}/publish:
 *   post:
 *     summary: Toggle public result for live quiz
 *     tags: [LiveQuizzes]
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
 *         description: Live quiz not found
 */
router.post("/:id/publish", verifyJWT, requireAdmin, publishLiveQuizResults);

/**
 * @swagger
 * /api/live-quizzes/{id}/start:
 *   post:
 *     summary: Start a live quiz
 *     tags: [LiveQuizzes]
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
 *         description: Live quiz started successfully
 *       404:
 *         description: Live quiz not found
 *       400:
 *         description: Cannot start quiz
 */
router.post("/:id/start", verifyJWT, requireAdmin, startLiveQuiz);

/**
 * @swagger
 * /api/live-quizzes/{id}/end:
 *   post:
 *     summary: End a live quiz
 *     tags: [LiveQuizzes]
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
 *         description: Live quiz ended successfully
 *       404:
 *         description: Live quiz not found
 *       400:
 *         description: Cannot end quiz
 */
router.post("/:id/end", verifyJWT, requireAdmin, endLiveQuiz);

/**
 * @swagger
 * /api/live-quizzes/{id}/schedule:
 *   post:
 *     summary: Schedule a live quiz to start and end automatically
 *     tags: [Live Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - liveStartAt
 *               - liveEndAt
 *             properties:
 *               liveStartAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the quiz should start
 *               liveEndAt:
 *                 type: string
 *                 format: date-time
 *                 description: When the quiz should end
 *     responses:
 *       200:
 *         description: Quiz scheduled successfully
 *       400:
 *         description: Invalid schedule or quiz already live
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.post("/:id/schedule", requireAdmin, scheduleLiveQuiz);

/**
 * @swagger
 * /api/live-quizzes/{id}/cancel-schedule:
 *   post:
 *     summary: Cancel a scheduled live quiz
 *     tags: [Live Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Schedule cancelled successfully
 *       400:
 *         description: Quiz is not scheduled
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.post("/:id/cancel-schedule", requireAdmin, cancelScheduledQuiz);

module.exports = router; 