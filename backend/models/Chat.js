const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Chat title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    model: {
      type: String,
      default: 'gemini-pro',
      enum: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra']
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 1,
      max: 4000
    },
    systemPrompt: {
      type: String,
      default: 'You are InsightX, a helpful AI assistant. Provide clear, accurate, and helpful responses.'
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ user: 1, createdAt: -1 });
chatSchema.index({ user: 1, lastMessageAt: -1 });
chatSchema.index({ user: 1, isActive: 1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Update last message timestamp
chatSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  return this.save();
};

// Add message to chat
chatSchema.methods.addMessage = function(messageId) {
  this.messages.push(messageId);
  return this.save();
};

// Archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  this.isActive = false;
  return this.save();
};

// Unarchive chat
chatSchema.methods.unarchive = function() {
  this.isArchived = false;
  this.isActive = true;
  return this.save();
};

// Pin chat
chatSchema.methods.pin = function() {
  this.isPinned = true;
  return this.save();
};

// Unpin chat
chatSchema.methods.unpin = function() {
  this.isPinned = false;
  return this.save();
};

// Ensure virtual fields are serialized
chatSchema.set('toJSON', { virtuals: true });
chatSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Chat', chatSchema);
