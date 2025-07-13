const express = require("express");
const router = express.Router();
const { getLiveLeaderboard, adjustLiveScore, disqualifyParticipant } = require("../controllers/liveLeaderboard.controller");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

/**
 * @swagger
 * /api/live-leaderboard/{quizId}:
 *   get:
 *     summary: Get live quiz leaderboard
 *     tags: [Live Leaderboard]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top participants to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz not found
 */
router.get("/:quizId", authenticateToken, getLiveLeaderboard);

/**
 * @swagger
 * /api/live-leaderboard/adjust-score:
 *   post:
 *     summary: Adjust participant score
 *     tags: [Live Leaderboard]
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
 *               - userId
 *               - score
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: ID of the live quiz
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               score:
 *                 type: number
 *                 description: New score to assign
 *               reason:
 *                 type: string
 *                 description: Reason for score adjustment
 *     responses:
 *       200:
 *         description: Score adjusted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz or user not found
 */
router.post("/adjust-score", requireAdmin, adjustLiveScore);

/**
 * @swagger
 * /api/live-leaderboard/disqualify:
 *   post:
 *     summary: Disqualify a participant
 *     tags: [Live Leaderboard]
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
 *               - userId
 *               - reason
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: ID of the live quiz
 *               userId:
 *                 type: string
 *                 description: ID of the user to disqualify
 *               reason:
 *                 type: string
 *                 description: Reason for disqualification
 *     responses:
 *       200:
 *         description: Participant disqualified successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quiz or user not found
 */
router.post("/disqualify", requireAdmin, disqualifyParticipant);

module.exports = router; 