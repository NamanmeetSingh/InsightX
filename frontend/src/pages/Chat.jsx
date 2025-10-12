import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Mic, Square, Settings, X, FileText } from 'lucide-react'
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
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  // Default to all providers; ProviderSelector/ConnectionStatus will treat them as available when configured
  const [selectedProviders, setSelectedProviders] = useState(['gemini', 'openai', 'claude', 'perplexity'])
  const [showProviderSettings, setShowProviderSettings] = useState(false)
  const [isLocalSending, setIsLocalSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const recognitionRef = useRef(null)

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

  // Initialize speech recognition
  useEffect(() => {
    // Check if we're online first
    const isOnline = navigator.onLine;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && isOnline) {
      try {
        setSpeechSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        // Add a timeout to prevent hanging
        let recognitionTimeout;

        recognition.onstart = () => {
          setIsListening(true);
          console.log('Speech recognition started');
          
          // Set a timeout to prevent hanging
          recognitionTimeout = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
                console.log('Speech recognition timed out');
              } catch (e) {
                console.warn('Error stopping recognition on timeout:', e);
              }
            }
          }, 10000); // 10 second timeout
        };      recognition.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        // Update input value with final transcript
        if (finalTranscript) {
          setInputValue(prev => {
            const currentValue = prev.trim();
            const newTranscript = finalTranscript.trim();
            
            // Add space between existing text and new transcript if needed
            if (currentValue && newTranscript) {
              return currentValue + ' ' + newTranscript;
            }
            return currentValue + newTranscript;
          });
        }
      };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          setIsListening(false);
          
          // Clear timeout
          if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
          }
          
          // Handle different types of errors
          switch(event.error) {
            case 'network':
              console.warn('Speech recognition network error - disabling feature');
              setSpeechSupported(false);
              break;
            case 'service-not-allowed':
            case 'bad-grammar':
              console.warn('Speech recognition service error - disabling feature');
              setSpeechSupported(false);
              break;
            case 'not-allowed':
              alert('Microphone access denied. Please enable microphone permissions.');
              break;
            case 'audio-capture':
              alert('Microphone not available. Please check your microphone.');
              break;
            default:
              console.warn('Speech recognition error:', event.error);
              setSpeechSupported(false);
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
          console.log('Speech recognition ended');
          
          // Clear timeout
          if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
          }
        };

        recognitionRef.current = recognition;
      } catch (error) {
        console.warn('Error initializing speech recognition:', error);
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
      console.log('Speech recognition not supported or offline');
    }
    
    // Listen for online/offline events
    const handleOnline = () => {
      if (SpeechRecognition && !speechSupported) {
        console.log('Back online - re-enabling speech recognition');
        setSpeechSupported(true);
      }
    };
    
    const handleOffline = () => {
      console.log('Gone offline - disabling speech recognition');
      setSpeechSupported(false);
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition on offline:', e);
        }
        setIsRecording(false);
        setIsListening(false);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Clean up recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error cleaning up speech recognition:', error);
        }
      }
      
      // Clean up event listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [])

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedFile) || !currentChat || !isAuthenticated) return

    const content = inputValue.trim()
    setInputValue('')

    try {
      let result;
      const isMulti = selectedProviders && selectedProviders.length > 1;
      
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
        if (result?.data?.success) {
          await loadMessages(currentChat._id)
        }
      } else if (isMulti) {
        // Send multi-LLM message
        setIsLocalSending(true);
        result = await messageAPI.sendMultiLLMMessage({
          content,
          chatId: currentChat._id,
          providers: selectedProviders
        });
        // Refresh messages so the new multi-response message appears
        if (result?.data?.success) {
          await loadMessages(currentChat._id)
        }
      } else {
        // Send regular single-LLM message (this will use ChatContext's sendingMessage state)
        result = await sendMessage(content, currentChat._id);
      }
      
      // For axios responses, result.success won't exist; rely on catch for errors
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsUploading(false)
      if (selectedProviders && selectedProviders.length > 1) {
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

  const handleVoiceRecording = async () => {
    if (!speechSupported) {
      console.warn('Speech recognition not available');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    // Check if we're online
    if (!navigator.onLine) {
      console.warn('Speech recognition requires internet connection');
      return;
    }

    if (isRecording) {
      // Stop recording
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (error) {
        console.warn('Error stopping speech recognition:', error);
      }
      setIsRecording(false);
      setIsListening(false);
    } else {
      // Start recording
      try {
        // Check if microphone is available
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        if (recognitionRef.current && speechSupported) {
          try {
            recognitionRef.current.start();
            setIsRecording(true);
          } catch (speechError) {
            console.warn('Speech recognition start error:', speechError);
            
            // If it's an InvalidStateError, the recognition might already be running
            if (speechError.name === 'InvalidStateError') {
              console.log('Speech recognition already running, stopping first');
              try {
                recognitionRef.current.stop();
                setTimeout(() => {
                  try {
                    recognitionRef.current.start();
                    setIsRecording(true);
                  } catch (retryError) {
                    console.warn('Retry failed:', retryError);
                    setSpeechSupported(false);
                  }
                }, 100);
              } catch (stopError) {
                console.warn('Error stopping existing recognition:', stopError);
                setSpeechSupported(false);
              }
            } else {
              setSpeechSupported(false);
            }
          }
        }
      } catch (error) {
        console.warn('Microphone access error:', error);
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please enable microphone permissions to use voice recording.');
        }
        setIsRecording(false);
        setIsListening(false);
      }
    }
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
              {selectedProviders && selectedProviders.length > 1 ? 'AI assistants are thinking...' : 'InsightX is typing...'}
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
        <div className={`input-wrapper ${isListening ? 'listening' : ''}`}>
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

          {/* Controls and input row */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {/* Settings button */}
            <button
              className="settings-button"
              onClick={() => setShowProviderSettings(!showProviderSettings)}
              title="Provider Settings"
              style={{ marginRight: 8 }}
            >
              <Settings size={18} />
            </button>

            {/* Attach button */}
            <button 
              className="action-button"
              onClick={handleFileUpload}
              aria-label="Attach file"
              disabled={!isAuthenticated}
              style={{ marginRight: 8 }}
            >
              <Paperclip size={20} />
            </button>

            {/* Input field */}
            <div className="input-field" style={{ flex: 1, marginRight: 8, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isAuthenticated 
                    ? (isListening 
                        ? "Listening... Speak now"
                        : (selectedProviders && selectedProviders.length > 1)
                          ? `Message ${selectedProviders.length} AI assistants...` 
                          : "Message InsightX...")
                    : "Sign in to start messaging"
                }
                className="message-input"
                rows="1"
                disabled={!isAuthenticated ? true : false}
                style={{ background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 16, minHeight: 24 }}
              />
              {isListening && (
                <div className="listening-indicator" style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#ef4444',
                  animation: 'pulse 1s infinite'
                }}>
                  <div className="recording-dot" style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    animation: 'pulse 1s infinite'
                  }}></div>
                  Listening
                </div>
              )}
              {isRecording && !isListening && inputValue.trim() && (
                <button
                  onClick={() => setInputValue('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}
                  title="Clear transcribed text"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Send or voice button */}
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
                className={`voice-button ${isRecording ? 'recording' : ''} ${!speechSupported ? 'disabled' : ''}`}
                onClick={handleVoiceRecording}
                aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                disabled={!isAuthenticated || !speechSupported}
                title={
                  !speechSupported 
                    ? (!navigator.onLine 
                        ? "Speech recognition requires internet connection"
                        : "Speech recognition not available")
                    : isRecording 
                      ? "Click to stop recording and insert text"
                      : "Click to start voice recording"
                }
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
