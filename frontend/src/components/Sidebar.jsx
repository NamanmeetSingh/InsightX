import React, { useState } from 'react'
import { Plus, MessageSquare, Trash2, Edit3, MoreVertical } from 'lucide-react'
import './Sidebar.css'

const Sidebar = ({ isOpen, onToggle }) => {
  const [editingChat, setEditingChat] = useState(null)
  const [chatTitle, setChatTitle] = useState('')

  // Sample chat history data
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: "How to build a React app", lastMessage: "2 hours ago", isActive: true },
    { id: 2, title: "JavaScript best practices", lastMessage: "1 day ago", isActive: false },
    { id: 3, title: "CSS Grid vs Flexbox", lastMessage: "2 days ago", isActive: false },
    { id: 4, title: "Node.js backend setup", lastMessage: "3 days ago", isActive: false },
    { id: 5, title: "Database design patterns", lastMessage: "1 week ago", isActive: false },
  ])

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      lastMessage: "Just now",
      isActive: true
    }
    setChatHistory(prev => [newChat, ...prev.map(chat => ({ ...chat, isActive: false }))])
  }

  const handleDeleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
  }

  const handleEditChat = (chatId, currentTitle) => {
    setEditingChat(chatId)
    setChatTitle(currentTitle)
  }

  const handleSaveEdit = (chatId) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, title: chatTitle } : chat
      )
    )
    setEditingChat(null)
    setChatTitle('')
  }

  const handleCancelEdit = () => {
    setEditingChat(null)
    setChatTitle('')
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
          {chatHistory.map((chat) => (
            <div 
              key={chat.id} 
              className={`chat-item ${chat.isActive ? 'active' : ''}`}
            >
              <div className="chat-content">
                {editingChat === chat.id ? (
                  <input
                    type="text"
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(chat.id)
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    onBlur={() => handleSaveEdit(chat.id)}
                    className="edit-input"
                    autoFocus
                  />
                ) : (
                  <>
                    <div className="chat-info">
                      <MessageSquare size={16} className="chat-icon" />
                      <span className="chat-title">{chat.title}</span>
                    </div>
                    <span className="chat-time">{chat.lastMessage}</span>
                  </>
                )}
              </div>
              
              {editingChat !== chat.id && (
                <div className="chat-actions">
                  <button 
                    className="action-button"
                    onClick={() => handleEditChat(chat.id, chat.title)}
                    aria-label="Edit chat"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="action-button"
                    onClick={() => handleDeleteChat(chat.id)}
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
            <span>U</span>
          </div>
          <div className="profile-info">
            <span className="username">User</span>
            <span className="user-email">user@example.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
