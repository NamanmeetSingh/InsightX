import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Settings,
  Info
} from 'lucide-react';
import { messageAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ConnectionStatus.css';

const PROVIDER_INFO = {
  gemini: {
    name: 'Gemini',
    color: '#4285F4',
    icon: '🧠',
    description: 'Google AI'
  },
  openai: {
    name: 'ChatGPT',
    color: '#10A37F',
    icon: '🤖',
    description: 'OpenAI'
  },
  claude: {
    name: 'Claude',
    color: '#FF6B35',
    icon: '🎭',
    description: 'Anthropic'
  },
  perplexity: {
    name: 'Perplexity',
    color: '#6366F1',
    icon: '🔍',
    description: 'Perplexity AI'
  }
};

const STATUS_CONFIG = {
  connected: {
    icon: CheckCircle,
    color: '#10B981',
    label: 'Connected',
    description: 'API is working properly'
  },
  not_configured: {
    icon: Settings,
    color: '#6B7280',
    label: 'Not Configured',
    description: 'API key not provided'
  },
  error: {
    icon: AlertCircle,
    color: '#EF4444',
    label: 'Error',
    description: 'Connection failed'
  },
  testing: {
    icon: Clock,
    color: '#F59E0B',
    label: 'Testing',
    description: 'Checking connection...'
  }
};

const ConnectionStatus = ({ compact = false, showTestButton = true }) => {
  const [connectionStatus, setConnectionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const checkProviderStatus = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await messageAPI.getProviderStatus();
      
      // Check if response data exists and has expected structure
      if (!response || !response.data || !response.data.data || !response.data.data.providers) {
        console.error('Invalid response structure. Response:', response);
        throw new Error('Invalid response structure');
      }
      
      const statusData = {};
      Object.entries(response.data.data.providers).forEach(([providerId, provider]) => {
        statusData[providerId] = {
          ...provider,
          status: provider.configured ? 'configured' : 'not_configured'
        };
      });
      
      setConnectionStatus(statusData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to check provider status:', error);
      setError('Failed to load provider status');
      
      // Set fallback status for all known providers
      const fallbackStatus = {};
      Object.keys(PROVIDER_INFO).forEach(providerId => {
        fallbackStatus[providerId] = {
          name: PROVIDER_INFO[providerId].name,
          status: 'error',
          error: 'Connection failed',
          configured: false,
          available: false
        };
      });
      setConnectionStatus(fallbackStatus);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      checkProviderStatus();
    } else {
      // Set default status when not authenticated
      setConnectionStatus({});
      setLoading(false);
      setError('Please log in to check provider status');
    }
  }, [isAuthenticated, checkProviderStatus]);

  const testConnections = async () => {
    try {
      setTesting(true);
      setError(null);
      
      // Set testing status for all configured providers
      const testingStatus = { ...connectionStatus };
      Object.keys(testingStatus).forEach(providerId => {
        if (testingStatus[providerId].configured) {
          testingStatus[providerId].status = 'testing';
        }
      });
      setConnectionStatus(testingStatus);

      const response = await messageAPI.testProviderConnections();
      
      // Check if response has the expected structure
      if (!response || !response.data || !response.data.data || !response.data.data.results) {
        throw new Error('Invalid test response structure');
      }
      
      const updatedStatus = { ...connectionStatus };
      Object.entries(response.data.data.results).forEach(([providerId, result]) => {
        updatedStatus[providerId] = {
          ...updatedStatus[providerId],
          status: result.status,
          error: result.error,
          errorType: result.errorType,
          processingTime: result.processingTime,
          model: result.model,
          available: result.available
        };
      });
      
      setConnectionStatus(updatedStatus);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to test connections:', error);
      setError('Failed to test connections');
      
      // Reset testing status on error
      const resetStatus = { ...connectionStatus };
      Object.keys(resetStatus).forEach(providerId => {
        if (resetStatus[providerId].status === 'testing') {
          resetStatus[providerId].status = 'error';
          resetStatus[providerId].error = 'Test failed';
        }
      });
      setConnectionStatus(resetStatus);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.error;
    const Icon = config.icon;
    return <Icon size={16} style={{ color: config.color }} />;
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className={`connection-status ${compact ? 'compact' : ''}`}>
        <div className="status-loading">
          <RefreshCw className="spinning" size={16} />
          <span>Checking connections...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    const connectedCount = Object.values(connectionStatus).filter(p => p.status === 'connected').length;
    const totalCount = Object.keys(connectionStatus).length;
    
    return (
      <div className="connection-status compact">
        <div className="compact-indicator">
          {connectedCount === totalCount ? (
            <Wifi className="status-icon connected" />
          ) : connectedCount > 0 ? (
            <Wifi className="status-icon partial" />
          ) : (
            <WifiOff className="status-icon disconnected" />
          )}
          <span className="status-text">
            {connectedCount}/{totalCount} Connected
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="connection-status">
      <div className="status-header">
        <div className="header-info">
          <Wifi size={18} />
          <h3>AI Provider Status</h3>
        </div>
        
        <div className="header-actions">
          {showTestButton && (
            <button 
              className="test-button"
              onClick={testConnections}
              disabled={testing}
            >
              <RefreshCw className={testing ? 'spinning' : ''} size={14} />
              {testing ? 'Testing...' : 'Test All'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="status-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="providers-status">
        {Object.entries(connectionStatus).map(([providerId, provider]) => {
          const providerInfo = PROVIDER_INFO[providerId] || {
            name: provider.name,
            color: '#6B7280',
            icon: '🤖'
          };

          const statusConfig = STATUS_CONFIG[provider.status] || STATUS_CONFIG.error;

          return (
            <div key={providerId} className="provider-status-card">
              <div className="provider-header">
                <div className="provider-info">
                  <span 
                    className="provider-icon"
                    style={{ backgroundColor: `${providerInfo.color}20` }}
                  >
                    {providerInfo.icon}
                  </span>
                  <div className="provider-details">
                    <span className="provider-name">{providerInfo.name}</span>
                    <span className="provider-description">{providerInfo.description}</span>
                  </div>
                </div>
                
                <div className="status-indicator">
                  {getStatusIcon(provider.status)}
                  <span 
                    className="status-label"
                    style={{ color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {provider.error && (
                <div className="error-details">
                  <Info size={12} />
                  <span>{provider.error}</span>
                </div>
              )}

              {provider.processingTime && (
                <div className="performance-info">
                  <Clock size={12} />
                  <span>Response time: {provider.processingTime}ms</span>
                </div>
              )}

              {provider.model && (
                <div className="model-info">
                  <span className="model-label">Model: {provider.model}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="status-footer">
        <span className="last-updated">
          Last updated: {formatLastUpdated()}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;