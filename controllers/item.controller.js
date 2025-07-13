const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const Item = require("../models/item.model");

// CREATE ITEM
const createItem = async (req, res) => {
  try {
    const { name, description, category, price, imageUrl, isActive } = req.body;

    // Check if user has permission (admin only)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can create items."
      });
    }

    const newItem = new Item({
      name,
      description,
      category,
      price,
      imageUrl,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    await newItem.save();

    res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ALL ITEMS
const getAllItems = async (req, res) => {
  try {
    const { 
      category, 
      isActive, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;

    // Build filter
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const items = await Item.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Item.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: items,
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

// GET ITEM BY ID
const getItemById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId)
      .populate('createdBy', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// UPDATE ITEM
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, category, price, imageUrl, isActive } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    // Check if user has permission (admin or creator)
    if (item.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can update items."
      });
    }

    // Update fields
    if (name) item.name = name;
    if (description !== undefined) item.description = description;
    if (category) item.category = category;
    if (price !== undefined) item.price = price;
    if (imageUrl !== undefined) item.imageUrl = imageUrl;
    if (isActive !== undefined) item.isActive = isActive;

    await item.save();

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE ITEM
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }

    // Check if user has permission (admin or creator)
    if (item.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only creator or admin can delete items."
      });
    }

    await Item.deleteOne({ _id: itemId });

    res.status(200).json({
      success: true,
      message: "Item deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET ITEM STATISTICS
const getItemStatistics = async (req, res) => {
  try {
    // Check if user has permission (admin only)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view statistics."
      });
    }

    const totalItems = await Item.countDocuments();
    const activeItems = await Item.countDocuments({ isActive: true });
    const inactiveItems = await Item.countDocuments({ isActive: false });

    // Get category distribution
    const categoryStats = await Item.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get price range statistics
    const priceStats = await Item.aggregate([
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        activeItems,
        inactiveItems,
        categoryDistribution: categoryStats,
        priceStatistics: priceStats[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Legacy function names for compatibility
const getAllItem = getAllItems;
const getOneItem = getItemById;

module.exports = { 
  getAllItem, 
  getOneItem, 
  createItem, 
  updateItem, 
  deleteItem, 
  getItemStatistics,
  getAllItems,
  getItemById
};
