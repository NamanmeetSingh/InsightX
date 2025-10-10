import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Mic, Square, Settings, Zap, X, FileText } from 'lucide-react'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'
import MessageBubble from '../components/MessageBubble'
import MultiLLMBubble from '../components/MultiLLMBubble'
import ProviderSelector from '../components/ProviderSelector'
import ConnectionStatus from '../components/ConnectionStatus'
import { messageAPI } from '../services/api'
import './Chat.css'

const Chat = () => {
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [multiLLMMode, setMultiLLMMode] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState(['gemini', 'openai'])
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  const [isLocalSending, setIsLocalSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const { 
    currentChat, 
    messages, 
    sendMessage, 
    sendingMessage,
    loadMessages
  } = useChat()

  const { isAuthenticated } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedFile) || !currentChat || !isAuthenticated) return

    const content = inputValue.trim()
    setInputValue('')

    try {
      let result;
      
      // Handle file upload
      if (selectedFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('content', content || 'Please analyze the attached PDF document.')
        formData.append('chatId', currentChat._id)
        
        result = await messageAPI.sendMessageWithFile(formData)
        setSelectedFile(null) // Clear file after sending
        
        // Refresh messages to show the uploaded file and AI response
        if (result.success) {
          await loadMessages(currentChat._id)
        }
      } else if (multiLLMMode && selectedProviders.length > 0) {
        // Send multi-LLM message
        setIsLocalSending(true);
        result = await messageAPI.sendMultiLLMMessage({
          content,
          chatId: currentChat._id,
          providers: selectedProviders
        });
      } else {
        // Send regular single-LLM message (this will use ChatContext's sendingMessage state)
        result = await sendMessage(content, currentChat._id);
      }
      
      if (!result.success) {
        console.error('Failed to send message:', result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsUploading(false)
      if (multiLLMMode) {
        setIsLocalSending(false);
      }
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
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed')
        return
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderMessage = (message) => {
    // Check if this is a multi-LLM message
    if (message.multiResponses && message.multiResponses.length > 0) {
      return (
        <MultiLLMBubble
          key={message._id}
          message={message}
          onRetry={(provider) => {
            console.log(`Retry ${provider}:`, message._id);
          }}
        />
      );
    }
    
    // Regular single-LLM message
    return (
      <MessageBubble
        key={message._id}
        message={message}
      />
    );
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
      {/* Provider Settings Panel */}
      {showProviderSettings && (
        <div className="provider-settings-panel">
          <div className="settings-header">
            <h3>AI Provider Settings</h3>
            <button 
              className="close-settings"
              onClick={() => setShowProviderSettings(false)}
            >
              ×
            </button>
          </div>
          <ConnectionStatus />
          <ProviderSelector
            selectedProviders={selectedProviders}
            onSelectionChange={setSelectedProviders}
          />
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="welcome-content">
              <h3>Start a conversation</h3>
              <p>Send a message to begin chatting with AI assistants.</p>
              <ConnectionStatus compact={true} showTestButton={false} />
            </div>
          </div>
        ) : (
          messages.map((message) => renderMessage(message))
        )}
        
        {(sendingMessage || isLocalSending) && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">
              {multiLLMMode ? 'AI assistants are thinking...' : 'InsightX is typing...'}
            </span>
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
          <div className="input-controls">
            <div className="mode-selector">
              <button
                className={`mode-button ${!multiLLMMode ? 'active' : ''}`}
                onClick={() => setMultiLLMMode(false)}
                title="Single AI Mode"
              >
                Single AI
              </button>
              <button
                className={`mode-button ${multiLLMMode ? 'active' : ''}`}
                onClick={() => setMultiLLMMode(true)}
                title="Multi AI Mode"
              >
                <Zap size={16} />
                Multi AI ({selectedProviders.length})
              </button>
              <button
                className="settings-button"
                onClick={() => setShowProviderSettings(!showProviderSettings)}
                title="Provider Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
          
          {/* File Preview */}
          {selectedFile && (
            <div className="file-preview">
              <div className="file-info">
                <FileText size={16} />
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button 
                  className="remove-file"
                  onClick={removeSelectedFile}
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
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
              placeholder={
                isAuthenticated 
                  ? (multiLLMMode 
                      ? `Message ${selectedProviders.length} AI assistants...` 
                      : "Message InsightX...")
                  : "Sign in to start messaging"
              }
              className="message-input"
              rows="1"
              disabled={!isAuthenticated}
            />
          </div>
          
          <div className="input-actions">
            {(inputValue.trim() || selectedFile) && isAuthenticated ? (
              <button 
                className="send-button"
                onClick={handleSendMessage}
                aria-label="Send message"
                disabled={isUploading}
              >
                {isUploading ? '...' : <Send size={20} />}
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
