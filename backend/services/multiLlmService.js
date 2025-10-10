import axios from 'axios';

/**
 * Multi-LLM Service
 * Supports multiple AI providers: Gemini, OpenAI, Claude, Perplexity
 */

// Provider configurations
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-pro', 'gemini-pro-vision'],
    apiKey: process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-pro'
  },
  openai: {
    name: 'OpenAI GPT',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-3.5-turbo'
  },
  claude: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    apiKey: process.env.CLAUDE_API_KEY,
    defaultModel: 'claude-3-sonnet-20240229'
  },
  perplexity: {
    name: 'Perplexity AI',
    baseUrl: 'https://api.perplexity.ai',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    apiKey: process.env.PERPLEXITY_API_KEY,
    defaultModel: 'llama-3.1-sonar-large-128k-online'
  }
};

// Default settings
const DEFAULT_SETTINGS = {
  temperature: 0.7,
  maxTokens: 1000,
  systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
  timeout: 30000
};

/**
 * Validate API key for a provider
 * @param {string} provider - Provider name
 * @returns {boolean} - Whether API key is valid
 */
const validateApiKey = (provider) => {
  const config = PROVIDERS[provider];
  return config && config.apiKey && config.apiKey !== 'your-api-key-here';
};

/**
 * Get available providers (those with valid API keys)
 * @returns {Array} - Array of available provider names
 */
const getAvailableProviders = () => {
  return Object.keys(PROVIDERS).filter(provider => validateApiKey(provider));
};

/**
 * Generate response from Gemini
 */
const generateGeminiResponse = async (userMessage, settings = {}) => {
  const config = PROVIDERS.gemini;
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  if (!validateApiKey('gemini')) {
    throw new Error('Gemini API key not configured or invalid');
  }

  const payload = {
    contents: [
      {
        parts: [{ text: `${mergedSettings.systemPrompt}\n\nUser: ${userMessage}` }]
      }
    ],
    generationConfig: {
      temperature: mergedSettings.temperature,
      maxOutputTokens: mergedSettings.maxTokens,
      topP: 0.8,
      topK: 10
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  const modelName = mergedSettings.model || config.defaultModel;
  const response = await axios.post(
    `${config.baseUrl}/models/${modelName}:generateContent?key=${config.apiKey}`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: mergedSettings.timeout
    }
  );

  const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!aiResponse) {
    throw new Error('No response generated from Gemini API');
  }

  const usageInfo = response.data.usageMetadata || {};
  return {
    content: aiResponse.trim(),
    tokens: {
      prompt: usageInfo.promptTokenCount || 0,
      completion: usageInfo.candidatesTokenCount || 0,
      total: usageInfo.totalTokenCount || 0
    }
  };
};

/**
 * Generate response from OpenAI
 */
const generateOpenAIResponse = async (userMessage, settings = {}) => {
  const config = PROVIDERS.openai;
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  if (!validateApiKey('openai')) {
    throw new Error('OpenAI API key not configured or invalid');
  }

  const payload = {
    model: mergedSettings.model || config.defaultModel,
    messages: [
      { role: 'system', content: mergedSettings.systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: mergedSettings.temperature,
    max_tokens: mergedSettings.maxTokens
  };

  const response = await axios.post(
    `${config.baseUrl}/chat/completions`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: mergedSettings.timeout
    }
  );

  const aiResponse = response.data.choices?.[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response generated from OpenAI API');
  }

  const usage = response.data.usage || {};
  return {
    content: aiResponse.trim(),
    tokens: {
      prompt: usage.prompt_tokens || 0,
      completion: usage.completion_tokens || 0,
      total: usage.total_tokens || 0
    }
  };
};

/**
 * Generate response from Claude
 */
const generateClaudeResponse = async (userMessage, settings = {}) => {
  const config = PROVIDERS.claude;
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  if (!validateApiKey('claude')) {
    throw new Error('Claude API key not configured or invalid');
  }

  const payload = {
    model: mergedSettings.model || config.defaultModel,
    max_tokens: mergedSettings.maxTokens,
    temperature: mergedSettings.temperature,
    system: mergedSettings.systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  };

  const response = await axios.post(
    `${config.baseUrl}/messages`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: mergedSettings.timeout
    }
  );

  const aiResponse = response.data.content?.[0]?.text;
  if (!aiResponse) {
    throw new Error('No response generated from Claude API');
  }

  const usage = response.data.usage || {};
  return {
    content: aiResponse.trim(),
    tokens: {
      prompt: usage.input_tokens || 0,
      completion: usage.output_tokens || 0,
      total: (usage.input_tokens || 0) + (usage.output_tokens || 0)
    }
  };
};

/**
 * Generate response from Perplexity
 */
const generatePerplexityResponse = async (userMessage, settings = {}) => {
  const config = PROVIDERS.perplexity;
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  if (!validateApiKey('perplexity')) {
    throw new Error('Perplexity API key not configured or invalid');
  }

  const payload = {
    model: mergedSettings.model || config.defaultModel,
    messages: [
      { role: 'system', content: mergedSettings.systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: mergedSettings.temperature,
    max_tokens: mergedSettings.maxTokens
  };

  const response = await axios.post(
    `${config.baseUrl}/chat/completions`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: mergedSettings.timeout
    }
  );

  const aiResponse = response.data.choices?.[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response generated from Perplexity API');
  }

  const usage = response.data.usage || {};
  return {
    content: aiResponse.trim(),
    tokens: {
      prompt: usage.prompt_tokens || 0,
      completion: usage.completion_tokens || 0,
      total: usage.total_tokens || 0
    }
  };
};

/**
 * Provider-specific generators
 */
const generators = {
  gemini: generateGeminiResponse,
  openai: generateOpenAIResponse,
  claude: generateClaudeResponse,
  perplexity: generatePerplexityResponse
};

/**
 * Generate response from a specific provider
 * @param {string} provider - Provider name
 * @param {string} userMessage - User's message
 * @param {object} settings - Generation settings
 * @returns {Promise<object>} AI response with metadata
 */
const generateResponseFromProvider = async (provider, userMessage, settings = {}) => {
  const startTime = Date.now();
  
  try {
    if (!generators[provider]) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!validateApiKey(provider)) {
      throw new Error(`${PROVIDERS[provider]?.name || provider} API key not configured`);
    }

    const response = await generators[provider](userMessage, settings);
    const processingTime = Date.now() - startTime;

    return {
      ...response,
      provider,
      model: settings.model || PROVIDERS[provider].defaultModel,
      processingTime,
      success: true,
      timestamp: new Date()
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Enhanced error handling with specific messages
    let errorMessage = error.message;
    let errorType = 'unknown';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          errorMessage = `Invalid API key for ${PROVIDERS[provider]?.name}`;
          errorType = 'auth_error';
          break;
        case 429:
          errorMessage = `Rate limit exceeded for ${PROVIDERS[provider]?.name}`;
          errorType = 'rate_limit';
          break;
        case 400:
          errorMessage = data?.error?.message || `Bad request to ${PROVIDERS[provider]?.name}`;
          errorType = 'bad_request';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = `${PROVIDERS[provider]?.name} service temporarily unavailable`;
          errorType = 'service_error';
          break;
        default:
          errorMessage = `${PROVIDERS[provider]?.name} API error: ${data?.error?.message || error.message}`;
          errorType = 'api_error';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = `Timeout: ${PROVIDERS[provider]?.name} took too long to respond`;
      errorType = 'timeout';
    }

    return {
      provider,
      success: false,
      error: errorMessage,
      errorType,
      processingTime,
      timestamp: new Date()
    };
  }
};

/**
 * Generate responses from multiple providers in parallel
 * @param {Array} providers - Array of provider names
 * @param {string} userMessage - User's message
 * @param {object} settings - Generation settings
 * @returns {Promise<Array>} Array of responses from each provider
 */
const generateMultiProviderResponses = async (providers, userMessage, settings = {}) => {
  const availableProviders = providers.filter(provider => validateApiKey(provider));
  
  if (availableProviders.length === 0) {
    throw new Error('No valid API keys configured for any providers');
  }

  const promises = availableProviders.map(provider => 
    generateResponseFromProvider(provider, userMessage, settings)
  );

  return await Promise.allSettled(promises).then(results => 
    results.map((result, index) => ({
      provider: availableProviders[index],
      ...(result.status === 'fulfilled' ? result.value : {
        success: false,
        error: result.reason.message,
        errorType: 'promise_error',
        processingTime: 0,
        timestamp: new Date()
      })
    }))
  );
};

export {
  PROVIDERS,
  validateApiKey,
  getAvailableProviders,
  generateResponseFromProvider,
  generateMultiProviderResponses
};

// Backward compatibility with existing geminiService
export const generateAIResponse = (userMessage, settings) => generateResponseFromProvider('gemini', userMessage, settings);