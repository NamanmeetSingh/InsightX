import Message from '../models/Message.js';

// Summarize last N messages for a chat
export async function summarizeChatHistory(chatId, maxMessages = 15) {
  // Get last N user/assistant messages (ignore system)
  const messages = await Message.find({
    chat: chatId,
    isDeleted: false,
    type: { $in: ['user', 'assistant'] }
  })
    .sort({ createdAt: -1 })
    .limit(maxMessages)
    .lean();

  if (!messages || messages.length === 0) return '';

  // Format as: User: ...\nAssistant: ...
  const history = messages
    .reverse()
    .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  // Optionally, add a system prompt for the LLM
  return `Chat history:\n${history}\n---\n`;
}
