import React, { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Copy, MoreVertical, Check, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import './MessageBubble.css'

const MessageBubble = ({ message }) => {
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    // Check if speech synthesis is supported
    setSpeechSupported('speechSynthesis' in window)
    
    return () => {
      // Cleanup: stop any ongoing speech when component unmounts
      window.speechSynthesis.cancel()
    }
  }, [])

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

  const handleTextToSpeech = () => {
    if (!speechSupported) {
      alert('Text-to-speech is not supported in your browser')
      return
    }

    if (isSpeaking) {
      // Stop current speech
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(message.content)
    
    // Configure speech settings
    utterance.rate = 0.9 // Slightly slower for better comprehension
    utterance.pitch = 1
    utterance.volume = 1
    
    // Set up event listeners
    utterance.onstart = () => {
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      setIsSpeaking(false)
    }
    
    utterance.onerror = () => {
      setIsSpeaking(false)
      console.error('Speech synthesis error')
    }
    
    // Start speech
    window.speechSynthesis.speak(utterance)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
              <span>{message.user?.name ? message.user.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
          ) : (
            <div className="assistant-avatar">
              <span>AI</span>
            </div>
          )}
        </div>
        
        <div className="message-body">
          <div className="message-text">
            {message.type === 'assistant' ? (
              <ReactMarkdown
                components={{
                  // Style code blocks
                  code: ({inline, children, ...props}) => {
                    if (inline) {
                      return <code className="inline-code" {...props}>{children}</code>
                    }
                    return <pre className="code-block"><code {...props}>{children}</code></pre>
                  },
                  // Style paragraphs
                  p: ({children}) => <p className="markdown-paragraph">{children}</p>,
                  // Style lists
                  ul: ({children}) => <ul className="markdown-list">{children}</ul>,
                  ol: ({children}) => <ol className="markdown-list ordered">{children}</ol>,
                  // Style headings
                  h1: ({children}) => <h1 className="markdown-heading h1">{children}</h1>,
                  h2: ({children}) => <h2 className="markdown-heading h2">{children}</h2>,
                  h3: ({children}) => <h3 className="markdown-heading h3">{children}</h3>,
                  // Style links
                  a: ({children, href}) => <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">{children}</a>,
                  // Style blockquotes
                  blockquote: ({children}) => <blockquote className="markdown-blockquote">{children}</blockquote>
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}
          </div>
          
          {/* Display attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="message-attachments">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="attachment-item">
                  <div className="attachment-info">
                    <span className="attachment-icon">📄</span>
                    <span className="attachment-name">{attachment.filename}</span>
                    <span className="attachment-size">
                      ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="message-meta">
            <span className="message-time">{formatTime(message.createdAt)}</span>
            
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
                {speechSupported && (
                  <button 
                    className={`action-button ${isSpeaking ? 'active' : ''}`}
                    onClick={handleTextToSpeech}
                    aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                )}
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
