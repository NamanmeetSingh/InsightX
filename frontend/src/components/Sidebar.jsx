import React, { useState } from 'react'
import { Plus, MessageSquare, Trash2, Edit3, MoreVertical } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import AuthForm from './AuthForm'
import './Sidebar.css'

const Sidebar = ({ isOpen, onToggle }) => {
  const [editingChat, setEditingChat] = useState(null)
  const [chatTitle, setChatTitle] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  
  const { chats, currentChat, createChat, updateChat, deleteChat, setCurrentChat } = useChat()
  const { user, isAuthenticated } = useAuth()

  const handleNewChat = async () => {
    const result = await createChat('New Chat')
    if (result.success) {
      setCurrentChat(result.chat)
    }
  }

  const handleDeleteChat = async (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId)
    }
  }

  const handleEditChat = (chatId, currentTitle) => {
    setEditingChat(chatId)
    setChatTitle(currentTitle)
  }

  const handleSaveEdit = async (chatId) => {
    if (chatTitle.trim()) {
      await updateChat(chatId, { title: chatTitle.trim() })
    }
    setEditingChat(null)
    setChatTitle('')
  }

  const handleCancelEdit = () => {
    setEditingChat(null)
    setChatTitle('')
  }

  const handleChatClick = (chat) => {
    setCurrentChat(chat)
  }

  const formatLastMessage = (lastMessageAt) => {
    if (!lastMessageAt) return 'No messages'
    
    const now = new Date()
    const messageTime = new Date(lastMessageAt)
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (!isOpen) {
    return (
      <div className="sidebar sidebar-closed">
        <button className="new-chat-button-mini" onClick={handleNewChat}>
          <Plus size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-button" onClick={handleNewChat}>
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="chat-history">
        <h3 className="section-title">Recent Chats</h3>
        <div className="chat-list">
          {chats.map((chat) => (
            <div 
              key={chat._id} 
              className={`chat-item ${currentChat?._id === chat._id ? 'active' : ''}`}
              onClick={() => handleChatClick(chat)}
            >
              <div className="chat-content">
                {editingChat === chat._id ? (
                  <input
                    type="text"
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(chat._id)
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    onBlur={() => handleSaveEdit(chat._id)}
                    className="edit-input"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="chat-info">
                      <MessageSquare size={16} className="chat-icon" />
                      <span className="chat-title">{chat.title}</span>
                    </div>
                    <span className="chat-time">{formatLastMessage(chat.lastMessageAt)}</span>
                  </>
                )}
              </div>
              
              {editingChat !== chat._id && (
                <div className="chat-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-button"
                    onClick={() => handleEditChat(chat._id, chat.title)}
                    aria-label="Edit chat"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="action-button"
                    onClick={() => handleDeleteChat(chat._id)}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-avatar">
            <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          <div className="profile-info">
            <span className="username">{user?.name || 'Guest'}</span>
            <span className="user-email">{user?.email || 'Not signed in'}</span>
          </div>
        </div>
        {!isAuthenticated && (
          <div style={{ marginTop: 12 }}>
            <button className="new-chat-button" onClick={() => setShowAuth(true)}>
              Sign In / Sign Up
            </button>
          </div>
        )}
      </div>

      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <AuthForm />
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
