const express = require('express');
const router = express.Router();

const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getMessageReactions
} = require('../controllers/messageController');

const { protect } = require('../middlewares/auth');
const {
  validateMessageCreation,
  validateMessageUpdate,
  validateObjectId,
  validatePagination
} = require('../middlewares/validation');

// @route   GET /api/messages/chat/:chatId
// @desc    Get messages for a chat
// @access  Private
router.get('/chat/:chatId', protect, validateObjectId('chatId'), validatePagination, getMessages);

// @route   POST /api/messages
// @desc    Send message
// @access  Private
router.post('/', protect, validateMessageCreation, sendMessage);

// @route   PUT /api/messages/:id
// @desc    Edit message
// @access  Private
router.put('/:id', protect, validateObjectId('id'), validateMessageUpdate, editMessage);

// @route   DELETE /api/messages/:id
// @desc    Delete message
// @access  Private
router.delete('/:id', protect, validateObjectId('id'), deleteMessage);

// @route   POST /api/messages/:id/reaction
// @desc    Add reaction to message
// @access  Private
router.post('/:id/reaction', protect, validateObjectId('id'), addReaction);

// @route   DELETE /api/messages/:id/reaction
// @desc    Remove reaction from message
// @access  Private
router.delete('/:id/reaction', protect, validateObjectId('id'), removeReaction);

// @route   GET /api/messages/:id/reactions
// @desc    Get message reactions
// @access  Private
router.get('/:id/reactions', protect, validateObjectId('id'), getMessageReactions);

module.exports = router;
