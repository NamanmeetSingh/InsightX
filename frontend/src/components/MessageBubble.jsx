import React, { useState } from 'react'
import { ThumbsUp, ThumbsDown, Copy, MoreVertical, Check } from 'lucide-react'
import './MessageBubble.css'

const MessageBubble = ({ message }) => {
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleLike = () => {
    setIsLiked(!isLiked)
    if (isDisliked) setIsDisliked(false)
  }

  const handleDislike = () => {
    setIsDisliked(!isDisliked)
    if (isLiked) setIsLiked(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div 
      className={`message-bubble ${message.type}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-content">
        <div className="message-avatar">
          {message.type === 'user' ? (
            <div className="user-avatar">
              <span>U</span>
            </div>
          ) : (
            <div className="assistant-avatar">
              <span>AI</span>
            </div>
          )}
        </div>
        
        <div className="message-body">
          <div className="message-text">
            {message.content}
          </div>
          
          <div className="message-meta">
            <span className="message-time">{formatTime(message.timestamp)}</span>
            
            {message.type === 'assistant' && (
              <div className={`message-actions ${showActions ? 'visible' : ''}`}>
                <button 
                  className={`action-button ${isLiked ? 'active' : ''}`}
                  onClick={handleLike}
                  aria-label="Like message"
                >
                  <ThumbsUp size={16} />
                </button>
                <button 
                  className={`action-button ${isDisliked ? 'active' : ''}`}
                  onClick={handleDislike}
                  aria-label="Dislike message"
                >
                  <ThumbsDown size={16} />
                </button>
                <button 
                  className="action-button"
                  onClick={handleCopy}
                  aria-label="Copy message"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button 
                  className="action-button"
                  aria-label="More options"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
