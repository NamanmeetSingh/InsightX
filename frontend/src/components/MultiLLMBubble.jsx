import React, { useState } from 'react';
import { Bot, AlertCircle, Clock, CheckCircle, Copy, RotateCcw, TrendingUp } from 'lucide-react';
import './MultiLLMBubble.css';

const PROVIDER_INFO = {
  gemini: {
    name: 'Gemini',
    color: '#4285F4',
    icon: '🧠'
  },
  openai: {
    name: 'ChatGPT',
    color: '#10A37F', 
    icon: '🤖'
  },
  claude: {
    name: 'Claude',
    color: '#FF6B35',
    icon: '🎭'
  },
  perplexity: {
    name: 'Perplexity',
    color: '#6366F1',
    icon: '🔍'
  }
};

const MultiLLMBubble = ({ message, isLoading = false, onRetry }) => {
  const [copiedProvider, setCopiedProvider] = useState(null);
  const { multiResponses = [] } = message;
  const columnCount = Math.max(1, multiResponses.length);
  
  const successfulResponses = multiResponses.filter(r => r.success);
  const failedResponses = multiResponses.filter(r => !r.success);

  const copyToClipboard = async (content, provider) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedProvider(provider);
      setTimeout(() => setCopiedProvider(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const formatProcessingTime = (time) => {
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const renderResponseCard = (response, index) => {
    const providerInfo = PROVIDER_INFO[response.provider] || {
      name: response.provider,
      color: '#6B7280',
      icon: '🤖'
    };

    return (
      <div 
        key={`${response.provider}-${index}`}
        className={`llm-response-card ${!response.success ? 'error' : ''}`}
        style={{ '--provider-color': providerInfo.color }}
      >
        <div className="response-header">
          <div className="provider-info">
            <span className="provider-icon">{providerInfo.icon}</span>
            <div className="provider-details">
              <span className="provider-name">{providerInfo.name}</span>
              <span className="provider-model">{response.model}</span>
            </div>
          </div>
          
          <div className="response-status">
            {response.success ? (
              <div className="status-success">
                <CheckCircle size={16} />
                <span>{formatProcessingTime(response.processingTime)}</span>
              </div>
            ) : (
              <div className="status-error">
                <AlertCircle size={16} />
                <span>{response.errorType || 'Error'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="response-content">
          {response.success ? (
            <>
              <div className="content-text">{response.content}</div>
              <div className="response-actions">
                <button 
                  className="action-button"
                  onClick={() => copyToClipboard(response.content, response.provider)}
                  title="Copy response"
                >
                  <Copy size={14} />
                  {copiedProvider === response.provider ? 'Copied!' : 'Copy'}
                </button>
                
                {response.tokens && (
                  <div className="token-info">
                    <TrendingUp size={14} />
                    <span>{response.tokens.total} tokens</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="error-content">
              <AlertCircle className="error-icon" />
              <div className="error-details">
                <p className="error-message">{response.error}</p>
                <button 
                  className="retry-button"
                  onClick={() => onRetry && onRetry(response.provider)}
                >
                  <RotateCcw size={14} />
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Note: loading state handled by parent via isLoading if needed

  return (
    <div className="multi-llm-bubble">
      <div className="bubble-header">
        <Bot className="bubble-icon" />
        <div className="bubble-title">
          <span>AI Response</span>
          <div className="response-summary">
            {isLoading ? (
              <span>Generating responses...</span>
            ) : (
              <span>
                {successfulResponses.length} successful, {failedResponses.length} failed
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="responses-grid" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
        {multiResponses.map((response, index) => renderResponseCard(response, index))}
      </div>
    </div>
  );
};

export default MultiLLMBubble;