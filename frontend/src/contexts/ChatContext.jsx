import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { chatAPI, messageAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

// Chat reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_CHATS':
      return {
        ...state,
        chats: action.payload,
        loading: false,
      };
    case 'ADD_CHAT':
      return {
        ...state,
        chats: [action.payload, ...state.chats],
      };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload._id ? action.payload : chat
        ),
      };
    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(chat => chat._id !== action.payload),
      };
    case 'SET_CURRENT_CHAT':
      return {
        ...state,
        currentChat: action.payload,
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
        messagesLoading: false,
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(message =>
          message._id === action.payload._id ? action.payload : message
        ),
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(message => message._id !== action.payload),
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  chats: [],
  currentChat: null,
  messages: [],
  loading: false,
  messagesLoading: false,
  error: null,
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated } = useAuth();

  // Load chats when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadChats();
    }
  }, [isAuthenticated]);

  // Load chats
  const loadChats = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await chatAPI.getChats();
      dispatch({ type: 'SET_CHATS', payload: response.data.data.chats });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.response?.data?.message || 'Failed to load chats',
      });
    }
  };

  // Create new chat
  const createChat = async (title = 'New Chat') => {
    try {
      const response = await chatAPI.createChat({ title });
      const newChat = response.data.data.chat;
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      return { success: true, chat: newChat };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Update chat
  const updateChat = async (chatId, updates) => {
    try {
      const response = await chatAPI.updateChat(chatId, updates);
      const updatedChat = response.data.data.chat;
      dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
      return { success: true, chat: updatedChat };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Delete chat
  const deleteChat = async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
      if (state.currentChat?._id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Set current chat and load messages
  const setCurrentChat = async (chat) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    if (chat) {
      await loadMessages(chat._id);
    } else {
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }
  };

  // Load messages for a chat
  const loadMessages = async (chatId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await messageAPI.getMessages(chatId);
      dispatch({ type: 'SET_MESSAGES', payload: response.data.data.messages });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.response?.data?.message || 'Failed to load messages',
      });
    }
  };

  // Send message
  const sendMessage = async (content, chatId) => {
    try {
      const response = await messageAPI.sendMessage({
        content,
        chatId,
        type: 'user',
      });

      const { userMessage, assistantMessage } = response.data.data;

      // Add user message immediately
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Add assistant message if available
      if (assistantMessage) {
        dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
      }

      // Update chat in the list
      const updatedChat = state.chats.find(chat => chat._id === chatId);
      if (updatedChat) {
        updatedChat.lastMessage = assistantMessage || userMessage;
        updatedChat.lastMessageAt = new Date();
        dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
      }

      return { success: true, userMessage, assistantMessage };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Edit message
  const editMessage = async (messageId, content) => {
    try {
      const response = await messageAPI.editMessage(messageId, content);
      const updatedMessage = response.data.data.message;
      dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
      return { success: true, message: updatedMessage };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to edit message';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete message';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Add reaction to message
  const addReaction = async (messageId, reaction) => {
    try {
      const response = await messageAPI.addReaction(messageId, reaction);
      const updatedMessage = response.data.data.message;
      dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
      return { success: true, message: updatedMessage };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add reaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    loadChats,
    createChat,
    updateChat,
    deleteChat,
    setCurrentChat,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    clearError,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
