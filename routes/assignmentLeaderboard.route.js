const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin } = require("../middleware/auth");
const { getAssignmentLeaderboard, adjustAssignmentScore, disqualifyAssignmentParticipant, getUserAssignmentAttempts } = require("../controllers/assignmentLeaderboard.controller");

router.use(verifyJWT);

/**
 * @swagger
 * /api/assignment-leaderboard/{assignmentId}:
 *   get:
 *     summary: Get assignment leaderboard
 *     tags: [Assignment Leaderboard]
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
 *         name: attemptNumber
 *         schema:
 *           type: number
 *         description: Filter by attempt number
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
 *         description: Assignment not found
 */
router.get("/:assignmentId", getAssignmentLeaderboard);

/**
 * @swagger
 * /api/assignment-leaderboard/adjust-score:
 *   post:
 *     summary: Adjust participant score
 *     tags: [Assignment Leaderboard]
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
 *               - userId
 *               - attemptNumber
 *               - score
 *             properties:
 *               assignmentId:
 *                 type: string
 *                 description: ID of the assignment
 *               userId:
 *                 type: string
 *                 description: ID of the user
 *               attemptNumber:
 *                 type: number
 *                 description: Attempt number
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
 *         description: Assignment or user not found
 */
router.post("/adjust-score", requireAdmin, adjustAssignmentScore);

/**
 * @swagger
 * /api/assignment-leaderboard/disqualify:
 *   post:
 *     summary: Disqualify a participant
 *     tags: [Assignment Leaderboard]
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
 *               - userId
 *               - attemptNumber
 *               - reason
 *             properties:
 *               assignmentId:
 *                 type: string
 *                 description: ID of the assignment
 *               userId:
 *                 type: string
 *                 description: ID of the user to disqualify
 *               attemptNumber:
 *                 type: number
 *                 description: Attempt number
 *               reason:
 *                 type: string
 *                 description: Reason for disqualification
 *     responses:
 *       200:
 *         description: Participant disqualified successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Assignment or user not found
 */
router.post("/disqualify", requireAdmin, disqualifyAssignmentParticipant);

/**
 * @swagger
 * /api/assignment-leaderboard/{assignmentId}/user/{userId}/attempts:
 *   get:
 *     summary: Get user's attempts for an assignment
 *     tags: [Assignment Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the assignment
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: User attempts retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Assignment or user not found
 */
router.get("/:assignmentId/user/:userId/attempts", getUserAssignmentAttempts);

module.exports = router; 