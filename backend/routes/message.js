const express = require('express');
const router = express.Router();

const {
  getMessages,
  sendMessage,
  sendMessageWithFile,
  sendMultiLLMMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  getMessageReactions,
  getProviders
} = require('../controllers/messageController');

const {
  testProviderConnections,
  getProviderStatus
} = require('../controllers/providerController');

const { protect } = require('../middlewares/auth');
const { uploadSingle, handleMulterError } = require('../middlewares/fileUpload');
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

// @route   POST /api/messages/with-file
// @desc    Send message with file attachment (PDF only)
// @access  Private
router.post('/with-file', protect, uploadSingle, handleMulterError, sendMessageWithFile);

// @route   POST /api/messages/multi
// @desc    Send message with multi-LLM responses
// @access  Private
router.post('/multi', protect, sendMultiLLMMessage);

// @route   GET /api/messages/providers
// @desc    Get available LLM providers
// @access  Private
router.get('/providers', protect, getProviders);

// @route   GET /api/messages/providers/status
// @desc    Get provider configuration status
// @access  Private
router.get('/providers/status', protect, getProviderStatus);

// @route   GET /api/messages/providers/test
// @desc    Test provider API connections
// @access  Private
router.get('/providers/test', protect, testProviderConnections);

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
