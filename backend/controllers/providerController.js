import { 
  getAvailableProviders,
  generateResponseFromProvider 
} from '../services/multiLlmService.js';

/**
 * Test API connections for all providers (simulated via Gemini)
 * @route   GET /api/messages/providers/test
 * @access  Private
 */
const testProviderConnections = async (req, res) => {
  try {
    const results = {};
    const testMessage = "Hello, please respond with just 'OK' to test the connection.";

    for (const providerId of getAvailableProviders()) {
      try {
        const testResult = await Promise.race([
          generateResponseFromProvider(providerId, testMessage, {
            maxTokens: 10,
            temperature: 0
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]);

        const ok = typeof testResult?.content === 'string' && testResult.content.trim().length > 0;
        results[providerId] = {
          status: ok ? 'connected' : 'unexpected_response',
          name: providerId,
          available: ok,
          error: ok ? null : 'Empty response'
        };
      } catch (error) {
        let errorType = 'connection_error';
        let errorMessage = error.message;
        if (error.response) {
          const status = error.response.status;
          if (status === 401) { errorType = 'invalid_api_key'; errorMessage = 'Invalid or expired API key'; }
          else if (status === 429) { errorType = 'rate_limited'; errorMessage = 'Rate limit exceeded'; }
          else if (status === 403) { errorType = 'permission_denied'; errorMessage = 'Permission denied'; }
          else { errorType = 'api_error'; errorMessage = `API error (${status})`; }
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorType = 'timeout';
          errorMessage = 'Connection timeout';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          errorType = 'network_error';
          errorMessage = 'Network connection failed';
        }
        results[providerId] = {
          status: 'error',
          name: providerId,
          available: false,
          error: errorMessage,
          errorType
        };
      }
    }

    const total = Object.keys(results).length;
    const connected = Object.values(results).filter(r => r.status === 'connected').length;
    const configured = total; // all simulated via Gemini

    res.status(200).json({
      success: true,
      data: {
        results,
        summary: { total, connected, configured, available: connected }
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
 * Test API connections for all providers
 * @route   GET /api/messages/providers/test
 * @access  Private
 */
const getProviderStatus = async (req, res) => {
  try {
    const status = {};
    const providerConfigs = {
      gemini: {
        name: 'Google Gemini',
        models: ['gemini-2.5-flash'],
        defaultModel: 'gemini-2.5-flash'
      },
      openai: {
        name: 'OpenAI GPT',
        models: ['gpt-3.5-turbo'],
        defaultModel: 'gpt-3.5-turbo'
      },
      claude: {
        name: 'Anthropic Claude',
        models: ['claude-3-sonnet-20240229'],
        defaultModel: 'claude-3-sonnet-20240229'
      },
      perplexity: {
        name: 'Perplexity AI',
        models: ['llama-3.1-sonar-large-128k-online'],
        defaultModel: 'llama-3.1-sonar-large-128k-online'
      }
    };
    for (const providerId of getAvailableProviders()) {
      const config = providerConfigs[providerId];
      status[providerId] = {
        name: config.name,
        configured: true, // Always true since Gemini handles all
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
        total,
        configured
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