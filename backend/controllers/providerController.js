import { 
  PROVIDERS, 
  validateApiKey, 
  generateResponseFromProvider 
} from '../services/multiLlmService.js';

/**
 * Test API connections for all providers
 * @route   GET /api/messages/providers/test
 * @access  Private
 */
const testProviderConnections = async (req, res) => {
  try {
    const results = {};
    const testMessage = "Hello, please respond with just 'OK' to test the connection.";
    
    // Test each provider with a simple message
    for (const [providerId, config] of Object.entries(PROVIDERS)) {
      try {
        // Check if API key exists first
        if (!validateApiKey(providerId)) {
          results[providerId] = {
            status: 'not_configured',
            error: 'API key not provided',
            name: config.name,
            available: false
          };
          continue;
        }

        // Test actual API connection with timeout
        const testResult = await Promise.race([
          generateResponseFromProvider(providerId, testMessage, { 
            maxTokens: 10,
            temperature: 0 
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]);

        if (testResult.success) {
          results[providerId] = {
            status: 'connected',
            name: config.name,
            model: testResult.model,
            processingTime: testResult.processingTime,
            available: true
          };
        } else {
          results[providerId] = {
            status: 'error',
            error: testResult.error,
            errorType: testResult.errorType,
            name: config.name,
            available: false
          };
        }

      } catch (error) {
        // Handle connection errors gracefully
        let errorType = 'connection_error';
        let errorMessage = error.message;

        if (error.response) {
          const status = error.response.status;
          switch (status) {
            case 401:
              errorType = 'invalid_api_key';
              errorMessage = 'Invalid or expired API key';
              break;
            case 429:
              errorType = 'rate_limited';
              errorMessage = 'Rate limit exceeded';
              break;
            case 403:
              errorType = 'permission_denied';
              errorMessage = 'Permission denied';
              break;
            default:
              errorType = 'api_error';
              errorMessage = `API error (${status})`;
          }
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorType = 'timeout';
          errorMessage = 'Connection timeout';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          errorType = 'network_error';
          errorMessage = 'Network connection failed';
        }

        results[providerId] = {
          status: 'error',
          error: errorMessage,
          errorType,
          name: config.name,
          available: false
        };
      }
    }

    // Calculate summary statistics
    const total = Object.keys(results).length;
    const connected = Object.values(results).filter(r => r.status === 'connected').length;
    const configured = Object.values(results).filter(r => r.status !== 'not_configured').length;

    res.status(200).json({
      success: true,
      data: {
        results,
        summary: {
          total,
          connected,
          configured,
          available: connected
        }
      }
    });

  } catch (error) {
    console.error('Provider connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test provider connections',
      error: error.message
    });
  }
};

/**
 * Get quick provider status without full connection test
 * @route   GET /api/messages/providers/status
 * @access  Private
 */
const getProviderStatus = async (req, res) => {
  try {
    const status = {};
    
    for (const [providerId, config] of Object.entries(PROVIDERS)) {
      const hasApiKey = validateApiKey(providerId);
      status[providerId] = {
        name: config.name,
        configured: hasApiKey,
        models: config.models,
        defaultModel: config.defaultModel
      };
    }

    const configured = Object.values(status).filter(s => s.configured).length;
    const total = Object.keys(status).length;

    res.status(200).json({
      success: true,
      data: {
        providers: status,
        summary: {
          total,
          configured,
          configuredPercentage: Math.round((configured / total) * 100)
        }
      }
    });

  } catch (error) {
    console.error('Provider status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider status',
      error: error.message
    });
  }
};

export {
  testProviderConnections,
  getProviderStatus
};