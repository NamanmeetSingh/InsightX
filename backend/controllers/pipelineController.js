import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { generateAIResponse } from '../services/geminiService.js';
import { summarizeChatHistory } from '../services/chatHistoryService.js';

// Helper: parse two-line numbered instructions
const parsePipelineInstructions = (content = '') => {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let step1 = '';
  let step2 = '';
  for (const line of lines) {
    const m1 = line.match(/^1\.|^1\)/);
    const m2 = line.match(/^2\.|^2\)/);
    if (m1) {
      step1 = line.replace(/^1[\.)]\s*/, '');
      continue;
    }
    if (m2) {
      step2 = line.replace(/^2[\.)]\s*/, '');
      continue;
    }
  }
  // Fallback: try to find labeled lines like "1. Gemini:" and "2. Perplexity:"
  if (!step1) {
    const m = content.match(/1\s*\.\s*Gemini\s*:\s*([\s\S]*?)(?:\n|$)/i);
    if (m) step1 = m[1].trim();
  }
  if (!step2) {
    const m = content.match(/2\s*\.\s*Perplexity\s*:\s*([\s\S]*?)(?:\n|$)/i);
    if (m) step2 = m[1].trim();
  }
  return { step1, step2 };
};

// @desc    Run two-step Gemini pipeline and post a single assistant message
// @route   POST /api/pipeline
// @access  Private
export const runPipeline = async (req, res) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      return res.status(400).json({ success: false, message: 'content and chatId are required' });
    }

    // Verify chat belongs to user
    const chat = await Chat.findOne({ _id: chatId, user: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Create user message (what the user typed)
    const userMessage = await Message.create({
      content,
      chat: chatId,
      user: req.user._id,
      type: 'user'
    });

    await chat.addMessage(userMessage._id);
    await chat.updateLastMessage(userMessage._id);

    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('new_message', { message: userMessage, chatId });

    // Parse steps
    const { step1, step2 } = parsePipelineInstructions(content);
    if (!step1 || !step2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pipeline format. Expected two numbered lines: 1. Gemini: ..., 2. Perplexity: ...'
      });
    }

  // Summarize chat history for context
  const historyContext = await summarizeChatHistory(chatId);

  // Step 1: run with Gemini 2.5 Flash, prepend history
  const step1Result = await generateAIResponse(`${historyContext}${step1}`, 'gemini-2.5-flash');

  // Step 2: feed step 1 result back into Gemini 2.5 Flash with step2 instruction, prepend history
  const step2Prompt = `${historyContext}${step2}\n\n[Previous result]:\n${step1Result.content}`;
  const finalResult = await generateAIResponse(step2Prompt, 'gemini-2.5-flash');

    const assistantMessage = await Message.create({
      content: finalResult.content,
      chat: chatId,
      user: req.user._id,
      type: 'assistant',
      metadata: {
        model: finalResult.model,
        tokens: finalResult.tokens,
        processingTime: finalResult.processingTime,
        pipeline: {
          step1Model: step1Result.model,
          step2Model: finalResult.model
        },
        temperature: chat.settings?.temperature
      }
    });

    await chat.addMessage(assistantMessage._id);
    await chat.updateLastMessage(assistantMessage._id);

    io.to(`chat_${chatId}`).emit('new_message', { message: assistantMessage, chatId });

    return res.status(201).json({
      success: true,
      message: 'Pipeline executed successfully',
      data: {
        userMessage,
        assistantMessage
      }
    });
  } catch (error) {
    console.error('Pipeline Error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export default { runPipeline };