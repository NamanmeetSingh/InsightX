import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Check, AlertCircle, Loader } from 'lucide-react';
import { messageAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ProviderSelector.css';

const PROVIDER_INFO = {
  gemini: {
    name: 'Gemini',
    color: '#4285F4',
    icon: '🧠',
    description: 'Google\'s advanced language model'
  },
  openai: {
    name: 'ChatGPT',
    color: '#10A37F',
    icon: '🤖',
    description: 'OpenAI\'s GPT models'
  },
  claude: {
    name: 'Claude',
    color: '#FF6B35',
    icon: '🎭',
    description: 'Anthropic\'s helpful AI assistant'
  },
  perplexity: {
    name: 'Perplexity',
    color: '#6366F1',
    icon: '🔍',
    description: 'Real-time search-powered AI'
  }
};

const ProviderSelector = ({ selectedProviders, onSelectionChange, className }) => {
  const [availableProviders, setAvailableProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProviders();
    } else {
      // Set fallback providers when not authenticated
      const fallbackProviders = Object.entries(PROVIDER_INFO).map(([id, info]) => ({
        id,
        name: info.name,
        models: [],
        defaultModel: 'default',
        available: false
      }));
      setAvailableProviders(fallbackProviders);
      setLoading(false);
      setError('Please log in to check provider availability');
    }
  }, [isAuthenticated, fetchProviders]);

  const fetchProviders = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await messageAPI.getProviderStatus();
      
      // Check if response data exists and has expected structure
      if (!response || !response.data || !response.data.providers) {
        throw new Error('Invalid response structure');
      }
      
      // Transform the status data to match the expected format
      const providers = Object.entries(response.data.providers).map(([id, provider]) => ({
        id,
        name: provider.name,
        models: provider.models || [],
        defaultModel: provider.defaultModel || 'default',
        available: provider.configured || false
      }));
      
      setAvailableProviders(providers);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      setError('Failed to load AI providers');
      
      // Set fallback providers
      const fallbackProviders = Object.entries(PROVIDER_INFO).map(([id, info]) => ({
        id,
        name: info.name,
        models: ['default'],
        defaultModel: 'default',
        available: false
      }));
      setAvailableProviders(fallbackProviders);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const toggleProvider = (providerId) => {
    const isSelected = selectedProviders.includes(providerId);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedProviders.filter(id => id !== providerId);
    } else {
      newSelection = [...selectedProviders, providerId];
    }
    
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    const allProviderIds = availableProviders.map(p => p.id);
    onSelectionChange(allProviderIds);
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <div className={`provider-selector loading ${className}`}>
        <Loader className="loading-spinner" size={16} />
        <span>Loading AI providers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`provider-selector error ${className}`}>
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`provider-selector ${className}`}>
      <div className="selector-header">
        <div className="header-info">
          <Settings size={16} />
          <span>AI Providers</span>
          <span className="selection-count">
            ({selectedProviders.length}/{availableProviders.length})
          </span>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn"
            onClick={selectAll}
            disabled={selectedProviders.length === availableProviders.length}
          >
            All
          </button>
          <button 
            className="action-btn"
            onClick={selectNone}
            disabled={selectedProviders.length === 0}
          >
            None
          </button>
        </div>
      </div>

      <div className="providers-grid">
        {availableProviders.map((provider) => {
          const info = PROVIDER_INFO[provider.id] || {
            name: provider.name,
            color: '#6B7280',
            icon: '🤖',
            description: 'AI Assistant'
          };
          
          const isSelected = selectedProviders.includes(provider.id);

          return (
            <div
              key={provider.id}
              className={`provider-card ${isSelected ? 'selected' : ''} ${!provider.available ? 'disabled' : ''}`}
              onClick={() => provider.available && toggleProvider(provider.id)}
              style={{ '--provider-color': info.color }}
            >
              <div className="provider-header">
                <span className="provider-icon">{info.icon}</span>
                <div className="provider-info">
                  <div className="provider-name">{info.name}</div>
                  <div className="provider-model">{provider.defaultModel}</div>
                </div>
                {isSelected && provider.available && (
                  <Check className="selected-icon" size={16} />
                )}
              </div>
              
              <div className="provider-description">
                {info.description}
              </div>
              
              {!provider.available && (
                <div className="unavailable-notice">
                  <AlertCircle size={12} />
                  <span>API key required</span>
                </div>
              )}
              
              <div className="provider-status">
                <div className={`status-dot ${provider.available ? 'available' : 'unavailable'}`}></div>
                <span>{provider.available ? 'Ready' : 'Not configured'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {availableProviders.length === 0 && (
        <div className="no-providers">
          <AlertCircle size={24} />
          <p>No AI providers available</p>
          <p>Please configure API keys in the backend</p>
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;