import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Mic, Square, ThumbsUp, ThumbsDown, Copy, MoreVertical } from 'lucide-react'
import MessageBubble from '../components/MessageBubble'
import './Chat.css'

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m InsightX, your AI assistant. How can I help you today?',
      timestamp: new Date(),
      isTyping: false
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      isTyping: false
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: generateAIResponse(inputValue),
        timestamp: new Date(),
        isTyping: false
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const generateAIResponse = (userInput) => {
    const responses = [
      "That's an interesting question! Let me help you with that.",
      "I understand what you're asking. Here's what I think...",
      "Great question! Based on my knowledge, here's the answer:",
      "I'd be happy to help you with that. Let me provide some insights.",
      "That's a complex topic. Let me break it down for you:",
      "I can definitely assist you with that. Here's my response:",
      "Thanks for asking! Here's what I can tell you about that:",
      "I'll do my best to help you understand this topic better."
    ]
    return responses[Math.floor(Math.random() * responses.length)] + " " + userInput
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

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isTyping && (
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
        <div className="input-wrapper">
          <div className="input-actions">
            <button 
              className="action-button"
              onClick={handleFileUpload}
              aria-label="Attach file"
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
              placeholder="Message InsightX..."
              className="message-input"
              rows="1"
            />
          </div>
          
          <div className="input-actions">
            {inputValue.trim() ? (
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
