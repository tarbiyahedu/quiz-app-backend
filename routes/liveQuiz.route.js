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
  scheduleLiveQuiz,
  cancelScheduledQuiz,
  publishLiveQuizResults,
  getAvailableLiveQuizzesForStudent,
  getQuizStatistics,
  getLiveQuizByCode,
  getAllPublicLiveQuizzes,
  getPublicLiveQuiz,
  guestJoinLiveQuiz,
  guestSubmitAnswer,
  guestGetResults
} = require("../controllers/liveQuiz.controller");

// Main route: Get all live quizzes (admin or student)
router.get("/", verifyJWT, getAllLiveQuizzes);

// Admin: Create a new live quiz
router.post("/", verifyJWT, requireAdmin, createLiveQuiz);

// Guest: Join public live quiz
router.post("/guest/join", guestJoinLiveQuiz);

// Student: Get available live quizzes for their department (not completed)
router.get("/available",
  (req, res, next) => { console.log('Route: /api/live-quizzes/available hit'); next(); },
  verifyJWT,
  (req, res, next) => { console.log('verifyJWT passed'); next(); },
  requireStudent,
  (req, res, next) => { console.log('requireStudent passed'); next(); },
  getAvailableLiveQuizzesForStudent
);

// Admin: Get quiz statistics with participant counts and scores
router.get("/statistics", verifyJWT, requireAdmin, getQuizStatistics);

router.get("/code/:code", getLiveQuizByCode);

router.get("/public", getAllPublicLiveQuizzes);

// Public route for accessing quiz details (for guest users)
router.get("/public/:id", getPublicLiveQuiz);

router.get("/:id", verifyJWT, getOneLiveQuiz);

router.put("/:id", verifyJWT, requireAdmin, updateLiveQuiz);

router.delete("/:id", verifyJWT, requireAdmin, deleteLiveQuiz);

/**
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
router.post("/:id/schedule", verifyJWT, requireAdmin, scheduleLiveQuiz);
router.post("/:id/cancel-schedule", verifyJWT, requireAdmin, cancelScheduledQuiz);

module.exports = router;
