import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { generateAIResponse } from '../services/geminiService.js';
import { 
  generateMultiProviderResponses, 
  getAvailableProviders
} from '../services/multiLlmService.js';
import { parsePDF } from '../services/pdfParserService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      const aiResponse = await generateAIResponse(content, 'gemini-2.5-flash');
      
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

// @desc    Send message with file attachment
// @route   POST /api/messages/with-file
// @access  Private
const sendMessageWithFile = async (req, res) => {
  try {
    const { content, chatId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify chat belongs to user
    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user._id
    });

    if (!chat) {
      // Clean up uploaded file if chat not found
      cleanupFile(file.path);
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Parse PDF file and store parsed data for later use
    let pdfParsed = null;
    try {
      pdfParsed = await parsePDF(file.path);
    } catch (err) {
      // Clean up file on parsing failure
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse PDF file',
        error: err.message
      });
    }

    // Store attachment and parsed PDF data in message metadata
  // Fix __dirname for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
    const attachment = {
      type: 'document',
      url: path.relative(path.join(__dirname, '../'), file.path),
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      pdfParsed // Store parsed PDF data for later use
    };

    // Create user message with attachment
    const messageContent = content || 'Please analyze the attached PDF document.';
    const userMessage = await Message.create({
      content: messageContent,
      chat: chatId,
      user: req.user._id,
      type: 'user',
      attachments: [attachment]
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

    // Generate AI response using user's prompt and parsed PDF text
    let assistantMessage = null;
    let aiError = null;
    try {
      // Combine user prompt and PDF text for LLM
      const aiPrompt = `${messageContent}\n\n[PDF Content]:\n${pdfParsed.text || ''}`;
      const aiResponse = await generateAIResponse(aiPrompt, 'gemini-2.5-flash');
      assistantMessage = await Message.create({
        content: aiResponse.content,
        chat: chatId,
        user: req.user._id,
        type: 'assistant',
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          processingTime: aiResponse.processingTime,
          temperature: chat.settings.temperature,
          attachmentProcessed: true,
          pdfMetadata: pdfParsed.info || null
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
    } catch (err) {
      aiError = err.message || 'Failed to generate AI response';
      console.error('AI Response Error (PDF):', err);
    }
    // Respond with both user and assistant message (if available)
    res.status(201).json({
      success: true,
      message: 'Message with file uploaded and parsed successfully',
      data: {
        userMessage,
        assistantMessage,
        aiError,
        pdfParsed
      }
    });
  } catch (error) {
    // Clean up file on any error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error in sendMessageWithFile:', error);
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

// @desc    Send message with multi-LLM responses
// @route   POST /api/messages/multi
// @access  Private
const sendMultiLLMMessage = async (req, res) => {
  try {
    const { content, chatId, providers = [] } = req.body;
    const io = req.app.get('io');

    // Validate chat
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

    await chat.addMessage(userMessage._id);

    // Emit user message immediately
    io.to(`chat_${chatId}`).emit('new_message', {
      message: userMessage,
      chatId
    });

    // Determine which providers to use
    // Use requested providers if provided, otherwise fall back to available (simulated) providers
    const targetProviders = providers.length > 0 ? providers : getAvailableProviders();

    // Emit loading state for each provider
    targetProviders.forEach(provider => {
      io.to(`chat_${chatId}`).emit('llm_thinking', {
        provider,
        chatId,
        status: 'generating'
      });
    });

    try {
      // Generate responses from all providers in parallel
      const multiResponses = await generateMultiProviderResponses(
        targetProviders, 
        content, 
        chat.settings
      );

      // Create assistant message with all provider responses
      const assistantMessage = await Message.create({
        content: 'Multi-LLM Response', // Placeholder content
        chat: chatId,
        user: req.user._id,
        type: 'assistant',
        multiResponses: multiResponses
      });

      await chat.addMessage(assistantMessage._id);
      await chat.updateLastMessage(assistantMessage._id);

      // Emit each provider response as it's processed
      multiResponses.forEach((response, index) => {
        io.to(`chat_${chatId}`).emit('llm_response', {
          provider: response.provider,
          response,
          chatId,
          messageId: assistantMessage._id,
          index
        });
      });

      // Emit final message
      io.to(`chat_${chatId}`).emit('new_message', {
        message: assistantMessage,
        chatId,
        type: 'multi-llm'
      });

      res.status(201).json({
        success: true,
        message: 'Multi-LLM message sent successfully',
        data: {
          userMessage,
          assistantMessage,
          responses: multiResponses,
          providersUsed: targetProviders
        }
      });

    } catch (aiError) {
      console.error('Multi-LLM Response Error:', aiError);
      
      // Emit error for all providers
      targetProviders.forEach(provider => {
        io.to(`chat_${chatId}`).emit('llm_error', {
          provider,
          chatId,
          error: 'Failed to generate response'
        });
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage,
          assistantMessage: null,
          error: 'Failed to generate AI responses'
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

// @desc    Get available LLM providers
// @route   GET /api/messages/providers
// @access  Private
const getProviders = async (req, res) => {
  try {
    const availableProviders = getAvailableProviders();
    
    const providerDetails = availableProviders.map(provider => {
      return {
        id: provider,
        name: PROVIDERS[provider].name,
        models: PROVIDERS[provider].models,
        defaultModel: PROVIDERS[provider].defaultModel,
        available: validateApiKey(provider)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        providers: providerDetails,
        count: availableProviders.length
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
};
