const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { handleGoogleLogin, generateJWTToken } = require("../utils/googleAuth");

// GET ALL USERS API
const getAllUsers = async (req, res) => {
  try {
    const { role, department, approved, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (approved !== undefined) filter.approved = approved === 'true';

    const skip = (page - 1) * limit;
    
    const users = await User.find(filter)
      .populate('department', 'name')
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: users,
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

// GET ONE USER API
const getOneUser = async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await User.findOne(query)
      .populate('department', 'name description')
      .select('-password');
    
    if (result) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User Not Found"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET CURRENT USER API
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department', 'name description')
      .select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// REGISTER USER API
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'student', department, number } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department: role === 'student' ? department : undefined,
      number,
      approved: true // All users are auto-approved
    });

    await newUser.save();

    // Generate JWT token
    const token = generateJWTToken(newUser._id);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          approved: newUser.approved,
          department: newUser.department,
          number: newUser.number
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GOOGLE OAUTH LOGIN API
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required"
      });
    }

    const result = await handleGoogleLogin(idToken);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: "Google login successful",
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// LOGIN USER API
const loginUser = async (req, res) => {
  try {
    const { email, password, number, login } = req.body;

    // Accept either 'login' (email or number), or fallback to 'email' or 'number'
    let user;
    if (login) {
      user = await User.findOne({ $or: [ { email: login }, { number: login } ] });
    } else if (email) {
      user = await User.findOne({ email });
    } else if (number) {
      user = await User.findOne({ number });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check if user has password (not Google OAuth only)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Please use Google OAuth to login"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate JWT token
    const token = generateJWTToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          approved: user.approved,
          department: user.department
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// VERIFY TOKEN API
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required"
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      res.status(200).json({
        success: true,
        message: "Token is valid",
        data: { userId: decoded.userId }
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during token verification"
    });
  }
};

// UPDATE USER API
const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, department, role, number, password, avatar } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // Only admin can update role or department
    if (req.user.role !== 'admin' && (role || department)) {
      return res.status(403).json({ message: 'Only admin can update role or department.' });
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (number) user.number = number;
    if (avatar) user.avatar = avatar;
    if (role) user.role = role;
    if (department) user.department = department;
    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }
    await user.save();
    const updatedUser = await User.findById(id)
      .populate('department', 'name description')
      .select('-password');
    res.status(200).json({ success: true, message: "User updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// APPROVE USER API
const approveUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { approved } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.approved = approved;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${approved ? 'approved' : 'disapproved'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        approved: user.approved
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE USER API
const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    await User.deleteOne({ _id: new ObjectId(id) });
    
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET USERS BY DEPARTMENT
const getUsersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { role, approved } = req.query;

    const filter = { department: departmentId };
    if (role) filter.role = role;
    if (approved !== undefined) filter.approved = approved === 'true';

    const users = await User.find(filter)
      .populate('department', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE OWN PROFILE API
const updateOwnProfile = async (req, res) => {
  try {
    const id = req.user._id;
    const { name, email, department, role, number, password, avatar } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // Only admin can update role or department
    if (user.role !== 'admin' && (role || department)) {
      return res.status(403).json({ message: 'Only admin can update role or department.' });
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (number) user.number = number;
    if (avatar) user.avatar = avatar;
    if (user.role === 'admin') {
      if (role) user.role = role;
      if (department) user.department = department;
    }
    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }
    await user.save();
    const updatedUser = await User.findById(id)
      .populate('department', 'name description')
      .select('-password');
    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getOneUser,
  getCurrentUser,
  createUser,
  googleLogin,
  loginUser,
  updateUser,
  approveUser,
  deleteUser,
  getUsersByDepartment,
  verifyToken,
  updateOwnProfile
};


