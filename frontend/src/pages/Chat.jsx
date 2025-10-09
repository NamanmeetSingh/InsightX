import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Mic, Square } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import MessageBubble from '../components/MessageBubble'
import './Chat.css'

const Chat = () => {
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { 
    currentChat, 
    messages, 
    sendMessage, 
    loading: chatLoading,
    error: chatError 
  } = useChat()

  const { isAuthenticated } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentChat || !isAuthenticated) return

    const content = inputValue.trim()
    setInputValue('')

    const result = await sendMessage(content, currentChat._id)
    if (!result.success) {
      console.error('Failed to send message:', result.error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceRecording = () => {
    setIsRecording(!isRecording)
    // Voice recording logic would go here
  }

  const handleFileUpload = () => {
    // File upload logic would go here
    console.log('File upload clicked')
  }

  // Show welcome message if no chat is selected
  if (!currentChat) {
    return (
      <div className="chat-container">
        <div className="welcome-screen">
          <div className="welcome-content">
            <h2>Welcome to InsightX</h2>
            <p>Select a chat from the sidebar or create a new one to start chatting with your AI assistant.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h3>Start a conversation</h3>
            <p>Send a message to begin chatting with InsightX.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message._id} message={message} />
          ))
        )}
        
        {chatLoading && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">InsightX is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        {!isAuthenticated && (
          <div className="auth-banner">
            <p>Please sign in to send messages. Use the profile menu to log in or sign up.</p>
          </div>
        )}
        <div className="input-wrapper">
          <div className="input-actions">
            <button 
              className="action-button"
              onClick={handleFileUpload}
              aria-label="Attach file"
              disabled={!isAuthenticated}
            >
              <Paperclip size={20} />
            </button>
          </div>
          
          <div className="input-field">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAuthenticated ? "Message InsightX..." : "Sign in to start messaging"}
              className="message-input"
              rows="1"
              disabled={!isAuthenticated}
            />
          </div>
          
          <div className="input-actions">
            {inputValue.trim() && isAuthenticated ? (
              <button 
                className="send-button"
                onClick={handleSendMessage}
                aria-label="Send message"
              >
                <Send size={20} />
              </button>
            ) : (
              <button 
                className={`voice-button ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceRecording}
                aria-label="Voice recording"
                disabled={!isAuthenticated}
              >
                {isRecording ? <Square size={20} /> : <Mic size={20} />}
              </button>
            )}
          </div>
        </div>
        
        <div className="input-footer">
          <p className="disclaimer">
            InsightX can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Chat
