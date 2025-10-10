import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const initializeSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`👤 User ${socket.user.email} connected with socket ${socket.id}`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining chat rooms
    socket.on('join_chat', (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`👤 User ${socket.user.email} joined chat ${chatId}`);
    });

    // Handle leaving chat rooms
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`👤 User ${socket.user.email} left chat ${chatId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        chatId: data.chatId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`chat_${data.chatId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        chatId: data.chatId
      });
    });

    // Handle message reactions
    socket.on('message_reaction', (data) => {
      socket.to(`chat_${data.chatId}`).emit('message_reaction_update', {
        messageId: data.messageId,
        reaction: data.reaction,
        userId: socket.userId,
        chatId: data.chatId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`👤 User ${socket.user.email} disconnected`);
    });
  });

  return io;
};

export { initializeSocket };
