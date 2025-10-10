import express from 'express';
const router = express.Router();

import {
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
} from '../controllers/chatController.js';

import { protect } from '../middlewares/auth.js';
import {
  validateChatCreation,
  validateChatUpdate,
  validateObjectId,
  validatePagination
} from '../middlewares/validation.js';

// @route   GET /api/chats
// @desc    Get all chats for user
// @access  Private
router.get('/', protect, validatePagination, getChats);

// @route   GET /api/chats/search
// @desc    Search chats
// @access  Private
router.get('/search', protect, validatePagination, searchChats);

// @route   GET /api/chats/:id
// @desc    Get single chat
// @access  Private
router.get('/:id', protect, validateObjectId('id'), getChat);

// @route   POST /api/chats
// @desc    Create new chat
// @access  Private
router.post('/', protect, validateChatCreation, createChat);

// @route   PUT /api/chats/:id
// @desc    Update chat
// @access  Private
router.put('/:id', protect, validateObjectId('id'), validateChatUpdate, updateChat);

// @route   DELETE /api/chats/:id
// @desc    Delete chat
// @access  Private
router.delete('/:id', protect, validateObjectId('id'), deleteChat);

// @route   PUT /api/chats/:id/archive
// @desc    Archive chat
// @access  Private
router.put('/:id/archive', protect, validateObjectId('id'), archiveChat);

// @route   PUT /api/chats/:id/unarchive
// @desc    Unarchive chat
// @access  Private
router.put('/:id/unarchive', protect, validateObjectId('id'), unarchiveChat);

// @route   PUT /api/chats/:id/pin
// @desc    Pin chat
// @access  Private
router.put('/:id/pin', protect, validateObjectId('id'), pinChat);

// @route   PUT /api/chats/:id/unpin
// @desc    Unpin chat
// @access  Private
router.put('/:id/unpin', protect, validateObjectId('id'), unpinChat);

export default router;
