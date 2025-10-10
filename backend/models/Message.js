const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  type: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: [true, 'Message type is required']
  },
  // Multi-LLM support: Store responses from multiple providers
  multiResponses: [{
    provider: {
      type: String,
      enum: ['gemini', 'openai', 'claude', 'perplexity'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    processingTime: {
      type: Number,
      default: 0
    },
    success: {
      type: Boolean,
      default: true
    },
    error: {
      type: String
    },
    errorType: {
      type: String,
      enum: ['auth_error', 'rate_limit', 'bad_request', 'service_error', 'api_error', 'timeout', 'promise_error']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Legacy single response support (for backward compatibility)
  metadata: {
    model: {
      type: String,
      default: 'gemini-pro'
    },
    provider: {
      type: String,
      default: 'gemini'
    },
    tokens: {
      prompt: {
        type: Number,
        default: 0
      },
      completion: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0
      }
    },
    processingTime: {
      type: Number, // in milliseconds
      default: 0
    },
    temperature: {
      type: Number,
      default: 0.7
    }
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'dislike', 'love', 'laugh', 'angry', 'sad'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  thread: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ type: 1, createdAt: -1 });

// Virtual for reaction counts
messageSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

// Add reaction to message
messageSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    type: reactionType
  });
  
  return this.save();
};

// Remove reaction from message
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );
  return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Edit message
messageSchema.methods.edit = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// Get user's reaction
messageSchema.methods.getUserReaction = function(userId) {
  const reaction = this.reactions.find(
    reaction => reaction.user.equals(userId)
  );
  return reaction ? reaction.type : null;
};

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
