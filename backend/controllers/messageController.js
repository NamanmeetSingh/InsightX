const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { generateAIResponse } = require('../services/geminiService');

// @desc    Get messages for a chat
// @route   GET /api/messages/chat/:chatId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { chatId } = req.params;

    // Verify chat belongs to user
    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Message.countDocuments({
      chat: chatId,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: {
        messages,
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

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content, chatId, type = 'user' } = req.body;

    // Verify chat belongs to user
    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Create user message
    const userMessage = await Message.create({
      content,
      chat: chatId,
      user: req.user._id,
      type: 'user'
    });

    // Add message to chat
    await chat.addMessage(userMessage._id);
    await chat.updateLastMessage(userMessage._id);

    // Emit message to socket
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('new_message', {
      message: userMessage,
      chatId
    });

    // Generate AI response
    try {
      const aiResponse = await generateAIResponse(content, chat.settings);
      
      const assistantMessage = await Message.create({
        content: aiResponse.content,
        chat: chatId,
        user: req.user._id,
        type: 'assistant',
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          processingTime: aiResponse.processingTime,
          temperature: chat.settings.temperature
        }
      });

      // Add AI message to chat
      await chat.addMessage(assistantMessage._id);
      await chat.updateLastMessage(assistantMessage._id);

      // Emit AI response to socket
      io.to(`chat_${chatId}`).emit('new_message', {
        message: assistantMessage,
        chatId
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage,
          assistantMessage
        }
      });
    } catch (aiError) {
      console.error('AI Response Error:', aiError);
      
      // Still return user message even if AI fails
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage,
          assistantMessage: null,
          aiError: 'Failed to generate AI response'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Edit message
// @route   PUT /api/messages/:id
// @access  Private
const editMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findOne({
      _id: req.params.id,
      user: req.user._id,
      type: 'user'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or cannot be edited'
      });
    }

    await message.edit(content);

    // Emit update to socket
    const io = req.app.get('io');
    io.to(`chat_${message.chat}`).emit('message_updated', {
      messageId: message._id,
      content: content,
      chatId: message.chat
    });

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.softDelete();

    // Emit deletion to socket
    const io = req.app.get('io');
    io.to(`chat_${message.chat}`).emit('message_deleted', {
      messageId: message._id,
      chatId: message.chat
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/:id/reaction
// @access  Private
const addReaction = async (req, res) => {
  try {
    const { reaction } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.addReaction(req.user._id, reaction);

    // Emit reaction to socket
    const io = req.app.get('io');
    io.to(`chat_${message.chat}`).emit('message_reaction', {
      messageId: message._id,
      reaction: reaction,
      userId: req.user._id,
      chatId: message.chat
    });

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove reaction from message
// @route   DELETE /api/messages/:id/reaction
// @access  Private
const removeReaction = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.removeReaction(req.user._id);

    // Emit reaction removal to socket
    const io = req.app.get('io');
    io.to(`chat_${message.chat}`).emit('message_reaction_removed', {
      messageId: message._id,
      userId: req.user._id,
      chatId: message.chat
    });

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      data: { message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get message reactions
// @route   GET /api/messages/:id/reactions
// @access  Private
const getMessageReactions = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('reactions.user', 'name email avatar');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reactions: message.reactions,
        reactionCounts: message.reactionCounts
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

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getMessageReactions
};
