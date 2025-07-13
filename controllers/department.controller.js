const Department = require("../models/department.model");
const User = require("../models/user.model");

// CREATE DEPARTMENT
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if department already exists
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: "Department with this name already exists"
      });
    }

    const newDepartment = new Department({
      name,
      description,
      createdBy: req.user._id
    });

    await newDepartment.save();

    const populatedDepartment = await Department.findById(newDepartment._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: populatedDepartment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL DEPARTMENTS
const getAllDepartments = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;
    
    const departments = await Department.find(filter)
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Department.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: departments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ONE DEPARTMENT
const getOneDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id)
      .populate('createdBy', 'name email');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE DEPARTMENT
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== department.name) {
      const existingDepartment = await Department.findOne({ name });
      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: "Department with this name already exists"
        });
      }
    }

    // Update fields
    if (name) department.name = name;
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    const updatedDepartment = await Department.findById(id)
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE DEPARTMENT
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Check if there are users in this department
    const usersInDepartment = await User.countDocuments({ department: id });
    if (usersInDepartment > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. ${usersInDepartment} user(s) are assigned to this department.`
      });
    }

    await Department.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      message: "Department deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET DEPARTMENT STATISTICS
const getDepartmentStats = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    // Get user counts by role
    const totalUsers = await User.countDocuments({ department: id });
    const studentCount = await User.countDocuments({ department: id, role: 'student' });
    const adminCount = await User.countDocuments({ department: id, role: 'admin' });
    const approvedUsers = await User.countDocuments({ department: id, approved: true });
    const pendingUsers = await User.countDocuments({ department: id, approved: false });

    res.status(200).json({
      success: true,
      data: {
        department: {
          id: department._id,
          name: department.name,
          description: department.description,
          isActive: department.isActive
        },
        statistics: {
          totalUsers,
          studentCount,
          adminCount,
          approvedUsers,
          pendingUsers
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createDepartment,
  getAllDepartments,
  getOneDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
}; 