import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

// @desc    Get all chats for user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
  try {
    const { page = 1, limit = 20, archived = false } = req.query;
    
    const query = {
      user: req.user._id,
      isActive: true,
      isArchived: archived === 'true'
    };

    const chats = await Chat.find(query)
      .populate('lastMessage')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Chat.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        chats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single chat
// @route   GET /api/chats/:id
// @access  Private
const getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('lastMessage');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new chat
// @route   POST /api/chats
// @access  Private
const createChat = async (req, res) => {
  try {
    const { title, settings } = req.body;

    const chat = await Chat.create({
      title: title || 'New Chat',
      user: req.user._id,
      settings: settings || {}
    });

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update chat
// @route   PUT /api/chats/:id
// @access  Private
const updateChat = async (req, res) => {
  try {
    const { title, settings, tags } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (settings) updateData.settings = { ...req.chat.settings, ...settings };
    if (tags) updateData.tags = tags;

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat updated successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Also soft delete all messages in this chat
    await Message.updateMany(
      { chat: req.params.id },
      { isDeleted: true, deletedAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Archive chat
// @route   PUT /api/chats/:id/archive
// @access  Private
const archiveChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isArchived: true, isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat archived successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Unarchive chat
// @route   PUT /api/chats/:id/unarchive
// @access  Private
const unarchiveChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isArchived: false, isActive: true },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat unarchived successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Pin chat
// @route   PUT /api/chats/:id/pin
// @access  Private
const pinChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isPinned: true },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat pinned successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Unpin chat
// @route   PUT /api/chats/:id/unpin
// @access  Private
const unpinChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isPinned: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Chat unpinned successfully',
      data: { chat }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search chats
// @route   GET /api/chats/search
// @access  Private
const searchChats = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const query = {
      user: req.user._id,
      isActive: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    const chats = await Chat.find(query)
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Chat.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        chats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export {
  getChats,
  getChat,
  createChat,
  updateChat,
  deleteChat,
  archiveChat,
  unarchiveChat,
  pinChat,
  unpinChat,
  searchChats
};
