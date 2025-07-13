const express = require("express");
const router = express.Router();
const { upload, uploadFile, serveFile, deleteFile } = require("../controllers/upload.controller");
const { authenticateToken } = require("../middleware/auth");

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file (image or video)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 originalName:
 *                   type: string
 *                 size:
 *                   type: number
 *                 mimetype:
 *                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", authenticateToken, upload.single("file"), uploadFile);

/**
 * @swagger
 * /api/upload/{filename}:
 *   get:
 *     summary: Serve uploaded file
 *     tags: [Upload]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the file to serve
 *     responses:
 *       200:
 *         description: File served successfully
 *       404:
 *         description: File not found
 */
router.get("/:filename", serveFile);

/**
 * @swagger
 * /api/upload/{filename}:
 *   delete:
 *     summary: Delete uploaded file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */
router.delete("/:filename", authenticateToken, deleteFile);

module.exports = router; 