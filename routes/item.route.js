const express = require("express");
const router = express.Router();
const { createItem, getAllItems, getItemById, updateItem, deleteItem, getItemStatistics } = require("../controllers/item.controller");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Item name
 *               description:
 *                 type: string
 *                 description: Item description
 *               category:
 *                 type: string
 *                 description: Item category
 *               price:
 *                 type: number
 *                 description: Item price
 *               imageUrl:
 *                 type: string
 *                 description: URL of item image
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether item is active
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 */
router.post("/", requireAdmin, createItem);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
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
 *         description: Items retrieved successfully
 */
router.get("/", authenticateToken, getAllItems);

/**
 * @swagger
 * /api/items/{itemId}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the item
 *     responses:
 *       200:
 *         description: Item retrieved successfully
 *       404:
 *         description: Item not found
 */
router.get("/:itemId", authenticateToken, getItemById);

/**
 * @swagger
 * /api/items/{itemId}:
 *   put:
 *     summary: Update an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Item name
 *               description:
 *                 type: string
 *                 description: Item description
 *               category:
 *                 type: string
 *                 description: Item category
 *               price:
 *                 type: number
 *                 description: Item price
 *               imageUrl:
 *                 type: string
 *                 description: URL of item image
 *               isActive:
 *                 type: boolean
 *                 description: Whether item is active
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Item not found
 */
router.put("/:itemId", requireAdmin, updateItem);

/**
 * @swagger
 * /api/items/{itemId}:
 *   delete:
 *     summary: Delete an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the item
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Item not found
 */
router.delete("/:itemId", requireAdmin, deleteItem);

/**
 * @swagger
 * /api/items/statistics:
 *   get:
 *     summary: Get item statistics
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get("/statistics", requireAdmin, getItemStatistics);

module.exports = router;

