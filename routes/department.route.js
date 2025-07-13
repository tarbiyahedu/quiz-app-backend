const express = require("express");
const router = express.Router();
const { verifyJWT, requireAdmin } = require("../middleware/auth");
const {
  createDepartment,
  getAllDepartments,
  getOneDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
} = require("../controllers/department.controller");

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Department name
 *               description:
 *                 type: string
 *                 description: Department description
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Access denied
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: List of departments
 */
router.post("/", verifyJWT, requireAdmin, createDepartment);
router.get("/", getAllDepartments);

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     summary: Get a specific department
 *     tags: [Departments]
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
 *         description: Department details
 *       404:
 *         description: Department not found
 *   put:
 *     summary: Update a department
 *     tags: [Departments]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       404:
 *         description: Department not found
 *   delete:
 *     summary: Delete a department
 *     tags: [Departments]
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
 *         description: Department deleted successfully
 *       400:
 *         description: Cannot delete department with users
 *       404:
 *         description: Department not found
 */
router.get("/:id", verifyJWT, getOneDepartment);
router.put("/:id", verifyJWT, requireAdmin, updateDepartment);
router.delete("/:id", verifyJWT, requireAdmin, deleteDepartment);

/**
 * @swagger
 * /api/departments/{id}/stats:
 *   get:
 *     summary: Get department statistics
 *     tags: [Departments]
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
 *         description: Department statistics
 *       404:
 *         description: Department not found
 */
router.get("/:id/stats", verifyJWT, requireAdmin, getDepartmentStats);

module.exports = router; 